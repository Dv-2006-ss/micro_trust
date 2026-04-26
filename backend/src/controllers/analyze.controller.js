import fs from 'node:fs';
import { Merchant } from '../models/Merchant.js';

// ══════════════════════════════════════════════════════════════════════════════
//  PRE-WARM UTILITY — Wakes the Python Intelligence Engine from Render sleep
//
//  Render free-tier spins down Docker services after 15 min of inactivity.
//  Cold-starting a Python Docker container with XGBoost + scikit-learn +
//  Tesseract takes 60-120 seconds.
//
//  Strategy: Long-poll the health endpoint with a generous 90-second total
//  budget. A 429 (Render rate-limit) means the process IS alive.
// ══════════════════════════════════════════════════════════════════════════════
async function warmUpPythonService(baseUrl) {
    console.log('[Node.js] 🔥 Pre-warming Python Intelligence Engine...');
    const healthUrl = `${baseUrl}/`;
    const MAX_WARM_RETRIES = 6;         // 6 attempts
    const WARM_RETRY_DELAY = 15000;     // 15s between pings (total budget: ~90s)
    const PING_TIMEOUT = 20000;         // 20s per individual ping

    for (let attempt = 1; attempt <= MAX_WARM_RETRIES; attempt++) {
        try {
            const resp = await fetch(healthUrl, {
                method: 'GET',
                signal: AbortSignal.timeout(PING_TIMEOUT)
            });

            if (resp.ok) {
                const body = await resp.json();
                console.log(`[Node.js] ✅ Python Engine is WARM (attempt ${attempt}/${MAX_WARM_RETRIES}):`, body);
                return true;
            }

            // 429 = Render rate limiter responded → process IS alive
            if (resp.status === 429) {
                console.log(`[Node.js] ✅ Python Engine is ALIVE (429 = Render rate-limit). Proceeding.`);
                return true;
            }

            // 503 during startup = Render is still spinning up the container
            if (resp.status === 503) {
                console.log(`[Node.js] ⏳ Python Engine returning 503 — container still starting (attempt ${attempt}/${MAX_WARM_RETRIES})`);
            } else {
                console.warn(`[Node.js] ⚠️ Warm-up got status ${resp.status} (attempt ${attempt}/${MAX_WARM_RETRIES})`);
            }
        } catch (err) {
            // Timeouts and connection-refused are expected during cold start
            console.log(`[Node.js] ⏳ Warm-up attempt ${attempt}/${MAX_WARM_RETRIES}: ${err.message} — engine likely still booting`);
        }

        if (attempt < MAX_WARM_RETRIES) {
            console.log(`[Node.js] Waiting ${WARM_RETRY_DELAY / 1000}s before next warm-up ping...`);
            await new Promise(resolve => setTimeout(resolve, WARM_RETRY_DELAY));
        }
    }

    // Even if warm-up is inconclusive, NEVER block the pipeline.
    // The /analyze call below has its own retry logic for transient errors.
    console.warn('[Node.js] ⚠️ Python Engine warm-up inconclusive after 90s — proceeding with analysis anyway.');
    return true;
}

export const analyzePassbook = async (req, res, next) => {
    // ── ENVIRONMENT CHECK: Validate PYTHON_API_URL before doing anything ─────
    const pythonApiUrl = process.env.PYTHON_API_URL;
    if (!pythonApiUrl) {
        console.error('[FATAL] PYTHON_API_URL is not set in environment variables.');
        return res.status(500).json({
            success: false,
            message: 'AI Engine Handshake Failed',
            error: 'PYTHON_API_URL environment variable is missing. Configure it in the Render dashboard.'
        });
    }

    // Sanitize: strip trailing slashes, ensure it starts with a protocol
    const baseUrl = pythonApiUrl.replace(/\/+$/, '');
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        console.error(`[FATAL] PYTHON_API_URL is malformed: "${pythonApiUrl}" — must start with http:// or https://`);
        return res.status(500).json({
            success: false,
            message: 'AI Engine Handshake Failed',
            error: 'PYTHON_API_URL is missing the protocol (http:// or https://). Check Render env vars.'
        });
    }

    try {
        const { merchant_id, pdf_password } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, error: 'Missing passbook file.' });
        }

        // ── STEP 1: Pre-warm the Python service (critical for Render free tier) ──
        await warmUpPythonService(baseUrl);

        // ── STEP 2: Build the multipart form for the Python Intelligence Engine ─
        const form = new FormData();
        form.append('merchant_id', merchant_id);

        // Pass the authenticated username down to the ephemeral Intelligence Engine
        if (req.user) {
            form.append('username', req.user.username);
        }

        if (pdf_password) {
            form.append('pdf_password', pdf_password);
        }

        const primary_bank = req.body.primary_bank;
        if (primary_bank) {
            form.append('primary_bank', primary_bank);
        }

        // Creating a Native Blob directly from the multer dump
        // to pass over the network reliably with Node native fetch
        const fileBuffer = fs.readFileSync(file.path);
        const fileBlob = new Blob([fileBuffer], { type: file.mimetype || 'application/octet-stream' });
        form.append('passbook_file', fileBlob, file.originalname);

        // ── STEP 3: Send analysis request with aggressive retry logic ────────────
        //    The Python engine may still be warming up even after pre-warm.
        //    Budget: 3 attempts × 180s timeout = up to 9 minutes max.
        const targetUrl = `${baseUrl}/analyze`;
        const MAX_ANALYZE_RETRIES = 3;
        const ANALYZE_RETRY_DELAY = 10000;  // 10s between retries
        const ANALYZE_TIMEOUT = 180000;     // 3 minutes per attempt (ML models are heavy)
        let lastError = null;
        let data = null;

        for (let attempt = 1; attempt <= MAX_ANALYZE_RETRIES; attempt++) {
            console.log('[Node.js] ──────────────────────────────────────────────');
            console.log(`[Node.js] Target Python URL: ${targetUrl}`);
            console.log(`[Node.js] PYTHON_API_URL env: ${pythonApiUrl}`);
            console.log(`[Node.js] Streaming file for merchant "${merchant_id}" (attempt ${attempt}/${MAX_ANALYZE_RETRIES})...`);
            console.log('[Node.js] ──────────────────────────────────────────────');

            try {
                // ── TIMEOUT: 180s per attempt for Render cold-start + ML processing ──
                const response = await fetch(targetUrl, {
                    method: 'POST',
                    body: form,
                    // DO NOT manually set Content-Type header! Native fetch handles the boundary dynamically.
                    signal: AbortSignal.timeout(ANALYZE_TIMEOUT)
                });

                // ── Handle non-OK responses from Python ─────────────────────────
                if (!response.ok) {
                    let errorBody = '';
                    try {
                        errorBody = await response.text();
                    } catch (_) {
                        errorBody = '(could not read response body)';
                    }
                    console.error(`[Python API Error] Status: ${response.status}, Body: ${errorBody} (attempt ${attempt}/${MAX_ANALYZE_RETRIES})`);

                    // Retry on transient errors (429, 502, 503, 504)
                    if ([429, 502, 503, 504].includes(response.status) && attempt < MAX_ANALYZE_RETRIES) {
                        const delay = response.status === 429 ? 20000 : ANALYZE_RETRY_DELAY;
                        console.log(`[Node.js] Retrying in ${delay / 1000}s...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }

                    return res.status(502).json({
                        success: false,
                        message: 'AI Engine Handshake Failed',
                        error: `Python API responded with status ${response.status}: ${errorBody}`
                    });
                }

                data = await response.json();
                console.log(`[Node.js] ✅ Analysis complete for merchant "${merchant_id}" — Score: ${data.credit_score}`);
                break; // Success — exit retry loop

            } catch (err) {
                lastError = err;
                console.error(`[Node.js] Attempt ${attempt}/${MAX_ANALYZE_RETRIES} failed: ${err.message}`);
                if (attempt < MAX_ANALYZE_RETRIES) {
                    console.log(`[Node.js] Retrying in ${ANALYZE_RETRY_DELAY / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, ANALYZE_RETRY_DELAY));
                }
            }
        }

        // If all retries exhausted, throw the last error
        if (!data) {
            throw lastError || new Error('All analysis attempts failed');
        }

        // ── Persist to MongoDB (if connected) ────────────────────────────────
        if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'mock_bypass') {
            try {
                await Merchant.create({
                    merchantId: data.merchant_id,
                    username: req.user.username,
                    businessName: `Analyzed Business - ${data.merchant_id}`,
                    accountNumber: 'XXXXXXXXXXXX',
                    riskProfile: data.risk_level,
                    creditScore: data.credit_score
                });
                console.log(`[MongoDB] Securely saved encrypted record for ${req.user.username}`);
            } catch (dbError) {
                // DB errors should never crash the response — log and move on
                console.error('[MongoDB Save Error] Is merchant_id unique?', dbError.message);
            }
        }

        // Return the final ML JSON mapping back to the client
        res.json(data);

        // Signal the secureDelete middleware to shred the uploaded file
        next();

    } catch (error) {
        // ── ERROR SHIELDING: Never let the server crash ──────────────────────
        console.error('[Node.js Orchestrator] ❌ Unhandled error in analyzePassbook:');
        console.error(`  Name:    ${error.name}`);
        console.error(`  Message: ${error.message}`);
        if (error.cause) console.error(`  Cause:   ${error.cause}`);
        console.error(`  Stack:   ${error.stack}`);

        // Guard against double-response if headers were already sent
        if (res.headersSent) {
            console.warn('[Node.js Orchestrator] Headers already sent — skipping error response.');
            return next(error);
        }

        // Distinguish timeout errors for clearer Render debugging
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            return res.status(504).json({
                success: false,
                message: 'AI Engine Handshake Failed',
                error: 'The Python Intelligence Engine did not respond within 180 seconds. It may be waking up on Render free tier — please retry in 60 seconds.'
            });
        }

        // Network-level failures (DNS, connection refused, etc.)
        if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ENOTFOUND') {
            return res.status(503).json({
                success: false,
                message: 'AI Engine Handshake Failed',
                error: `Cannot reach the Python service at ${process.env.PYTHON_API_URL}. It may be offline or the URL is incorrect.`
            });
        }

        // Generic fallback
        return res.status(500).json({
            success: false,
            message: 'AI Engine Handshake Failed',
            error: error.message
        });
    }
};
