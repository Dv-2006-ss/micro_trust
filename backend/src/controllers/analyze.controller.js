import fs from 'node:fs';
import { Merchant } from '../models/Merchant.js';

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

        // ── Build the multipart form for the Python Intelligence Engine ──────
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

        // ── EXPLICIT LOGGING: Surface the target URL in Render logs ──────────
        const targetUrl = `${baseUrl}/analyze`;
        console.log('[Node.js] ──────────────────────────────────────────────');
        console.log(`[Node.js] Target Python URL: ${targetUrl}`);
        console.log(`[Node.js] PYTHON_API_URL env: ${pythonApiUrl}`);
        console.log(`[Node.js] Streaming file for merchant "${merchant_id}" ...`);
        console.log('[Node.js] ──────────────────────────────────────────────');

        // ── TIMEOUT HANDLING: 60s timeout for Render cold-start wake-ups ─────
        const response = await fetch(targetUrl, {
            method: 'POST',
            body: form,
            // DO NOT manually set Content-Type header! Native fetch handles the boundary dynamically.
            signal: AbortSignal.timeout(60000) // 60 second timeout for Render free-tier cold starts
        });

        // ── Handle non-OK responses from Python without crashing ─────────────
        if (!response.ok) {
            let errorBody = '';
            try {
                errorBody = await response.text();
            } catch (_) {
                errorBody = '(could not read response body)';
            }
            console.error(`[Python API Error] Status: ${response.status}, Body: ${errorBody}`);
            return res.status(502).json({
                success: false,
                message: 'AI Engine Handshake Failed',
                error: `Python API responded with status ${response.status}: ${errorBody}`
            });
        }

        const data = await response.json();
        console.log(`[Node.js] ✅ Analysis complete for merchant "${merchant_id}" — Score: ${data.credit_score}`);

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
                error: 'The Python Intelligence Engine did not respond within 60 seconds. It may be waking up on Render free tier — please retry in 30 seconds.'
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
