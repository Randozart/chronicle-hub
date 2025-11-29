import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// We will import S3 client here later when you are ready for Hetzner
// import { S3Client... } from "@aws-sdk/client-s3";

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export const uploadAsset = async (
    file: File,
    folder: string = 'misc'
): Promise<string> => {
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${uuidv4()}-${file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;

    // STRATEGY: Check Environment
    const provider = process.env.STORAGE_PROVIDER || 'local';

    if (provider === 'local') {
        return await uploadLocal(buffer, filename, folder);
    } 
    
    // Future Hetzner Logic:
    // else if (provider === 's3') { return await uploadS3(buffer, filename); }
    
    throw new Error("Unknown Storage Provider");
};

// --- Local Implementation ---
async function uploadLocal(buffer: Buffer, filename: string, folder: string): Promise<string> {
    // 1. Ensure directory exists (public/uploads/folder)
    const targetDir = path.join(UPLOAD_DIR, folder);
    try {
        await fs.access(targetDir);
    } catch {
        await fs.mkdir(targetDir, { recursive: true });
    }

    // 2. Write file
    const filePath = path.join(targetDir, filename);
    await fs.writeFile(filePath, buffer);

    // 3. Return public URL
    return `/uploads/${folder}/${filename}`;
}

export const deleteAsset = async (url: string): Promise<boolean> => {
    const provider = process.env.STORAGE_PROVIDER || 'local';

    if (provider === 'local') {
        try {
            // Convert URL back to file path
            // URL: /uploads/misc/file.png -> Path: public/uploads/misc/file.png
            const relativePath = url.startsWith('/') ? url.slice(1) : url;
            const fullPath = path.join(process.cwd(), 'public', relativePath);
            await fs.unlink(fullPath);
            return true;
        } catch (e) {
            console.error("Failed to delete local file:", e);
            return false;
        }
    }
    return false;
};