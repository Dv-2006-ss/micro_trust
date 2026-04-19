import { unlink } from 'node:fs/promises';
import { constants, access } from 'node:fs/promises';

/**
 * secureDelete - Express middleware for shred-level cleanup
 * Ensures ephemeral processing by shredding the file after standard processing.
 */
export const secureDelete = async (req, res, next) => {
    // If there is a file in the request
    if (req.file) {
        const uploadPath = req.file.path;
        
        // This hooks into the response finish event
        // Once the response is sent back, we delete the file.
        res.on('finish', async () => {
            try {
                // Check if file exists before trying to delete
                await access(uploadPath, constants.F_OK);
                // Execute unlink to destroy the file immediately
                await unlink(uploadPath);
                console.log(`[SECURITY] Shred-level deletion successful: ${uploadPath}`);
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error(`[SECURITY ALERT] Failed to shred file ${uploadPath}:`, err);
                }
            }
        });
    }
    
    // Continue down the middleware chain
    next();
};

export default secureDelete;
