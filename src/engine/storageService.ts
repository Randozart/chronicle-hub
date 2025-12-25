import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp'; 
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";


const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// --- MinIO / S3 Configuration ---
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'chronicle-assets';
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || S3_ENDPOINT;

// Initialize Client only if keys are present
const s3Client = (S3_ENDPOINT && S3_ACCESS_KEY && S3_SECRET_KEY) 
    ? new S3Client({
        region: S3_REGION,
        endpoint: S3_ENDPOINT,
        credentials: {
            accessKeyId: S3_ACCESS_KEY,
            secretAccessKey: S3_SECRET_KEY,
        },
        forcePathStyle: true // Required for MinIO (uses /bucket/key instead of bucket.domain)
    }) 
    : null;

export const uploadAsset = async (
    file: File,
    folder: string = 'misc',
    options: { optimize?: boolean; maxWidth?: number } = {}
): Promise<{ url: string; size: number }> => {
    
    // FIX: Cast the ArrayBuffer to a Buffer explicitly to satisfy strict TS types
    let buffer = Buffer.from(await file.arrayBuffer()) as Buffer;
    
    // 1. Optimize Image (Sharp)
    if (options.optimize !== false && file.type.startsWith('image/')) {
        try {
            let pipeline = sharp(buffer);
            
            const meta = await pipeline.metadata();
            if (options.maxWidth && meta.width && meta.width > options.maxWidth) {
                pipeline = pipeline.resize(options.maxWidth);
            }

            // Conversion / Compression logic
            if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
            } else if (file.type === 'image/png') {
                pipeline = pipeline.png({ compressionLevel: 8, palette: true });
            } else if (file.type === 'image/webp') {
                pipeline = pipeline.webp({ quality: 80 });
            }

            // Cast result back to Buffer
            buffer = await pipeline.toBuffer() as Buffer;
        } catch (e) {
            console.error("Image optimization failed, using original:", e);
        }
    }

    const size = buffer.byteLength;
    const ext = file.name.split('.').pop() || 'bin';
    const filename = `${uuidv4()}.${ext}`; 
    const provider = process.env.STORAGE_PROVIDER || 'local';

    // 2. Upload to MinIO
    if (provider === 's3' && s3Client) {
        const key = `${folder}/${filename}`;
        
        await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: file.type,
            ACL: 'public-read' 
        }));
        
        // Construct Public URL
        const url = `${S3_PUBLIC_URL}/${S3_BUCKET}/${key}`;
        return { url, size };
    } 
    
    // 3. Fallback: Local Storage
    const targetDir = path.join(UPLOAD_DIR, folder);
    try { await fs.access(targetDir); } catch { await fs.mkdir(targetDir, { recursive: true }); }
    
    const filePath = path.join(targetDir, filename);
    await fs.writeFile(filePath, buffer);
    
    return { url: `/uploads/${folder}/${filename}`, size };
};

export const deleteAsset = async (url: string): Promise<boolean> => {
    const provider = process.env.STORAGE_PROVIDER || 'local';

    try {
        if (provider === 's3' && s3Client) {
            // Extract Key from URL
            let key = url;
            const baseUrlWithBucket = `${S3_PUBLIC_URL}/${S3_BUCKET}/`;
            
            if (url.startsWith(baseUrlWithBucket)) {
                key = url.replace(baseUrlWithBucket, '');
            } else if (url.startsWith(`${S3_ENDPOINT}/${S3_BUCKET}/`)) {
                key = url.replace(`${S3_ENDPOINT}/${S3_BUCKET}/`, '');
            }

            await s3Client.send(new DeleteObjectCommand({ 
                Bucket: S3_BUCKET, 
                Key: key 
            }));
            return true;
        } else {
            // Local Delete
            const relativePath = url.startsWith('/') ? url.slice(1) : url;
            const fullPath = path.join(process.cwd(), 'public', relativePath);
            await fs.unlink(fullPath);
            return true;
        }
    } catch (e) {
        console.error("Delete asset failed:", e);
        return false;
    }
};