import fs from 'node:fs';
import { Merchant } from '../models/Merchant.js';

export const analyzePassbook = async (req, res, next) => {
    try {
        const { merchant_id, pdf_password } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "Missing passbook file." });
        }

        // Prepare the stream for the FastAPI backend using Node 18 Native FormData
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

        console.log(`[Node.js] Streaming file for ${merchant_id} to Python Intelligence Engine...`);

        // Perform the fetch request to the Python microservice
        const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';
        
        const response = await fetch(`${pythonApiUrl}/api/v1/analyze-data`, {
            method: 'POST',
            body: form,
            // DO NOT manually set Content-Type header! Native fetch handles the boundary dynamically.
            signal: AbortSignal.timeout(60000) // Increase execution timeout to 60 seconds
        }).catch(err => {
            console.error(`[Fetch Error] Cannot connect to pythonApiUrl: ${pythonApiUrl}`);
            throw err;
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Python API Error Detailed] Status: ${response.status}, Output: ${errorText}`);
            throw new Error(`Python API responded with Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        // Save to MongoDB mapped to the authenticated User (If MongoDB is connected and not bypassing)
        if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'mock_bypass') {
             try {
                 await Merchant.create({
                     merchantId: data.merchant_id,
                     username: req.user.username,
                     businessName: `Analyzed Business - ${data.merchant_id}`, // In real app, prompt user
                     accountNumber: "XXXXXXXXXXXX", // Mocked for now, real app extracts from passbook
                     riskProfile: data.risk_level,
                     creditScore: data.credit_score
                 });
                 console.log(`[MongoDB] Securely saved encrypted record for ${req.user.username}`);
             } catch (dbError) {
                 console.error("[MongoDB Save Error] Is merchant_id unique?", dbError.message);
             }
        }
        
        // Return the final ML JSON mapping back to the client
        res.json(data);
        
        // Signal the secureDelete middleware to shred the uploaded file
        next();

    } catch (error) {
        console.error("[Node.js Orchestrator Error Detailed]", error);
        res.status(500).json({ 
            error: 'Intelligence Engine integration failure.', 
            details: error.message 
        });
    }
};
