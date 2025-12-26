import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from 'sharp'; 

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// --- MinIO / S3 Configuration ---
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'chronicle-assets';
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || S3_ENDPOINT;

const s3Client = (S3_ENDPOINT && S3_ACCESS_KEY && S3_SECRET_KEY) 
    ? new S3Client({
        region: S3_REGION,
        endpoint: S3_ENDPOINT,
        credentials: {
            accessKeyId: S3_ACCESS_KEY,
            secretAccessKey: S3_SECRET_KEY,
        },
        forcePathStyle: true 
    }) 
    : null;

// NEW: Quality Presets
type QualityPreset = 'high' | 'balanced' | 'icon';

export const uploadAsset = async (
    file: File,
    folder: string = 'misc',
    options: { optimize?: boolean; preset?: QualityPreset } = {}
): Promise<{ url: string; size: number }> => {
    
    let buffer = Buffer.from(await file.arrayBuffer()) as Buffer;
    
    // 1. Context-Aware Optimization
    if (options.optimize !== false && file.type.startsWith('image/')) {
        try {
            let pipeline = sharp(buffer);
            const meta = await pipeline.metadata();
            
            // Determine settings based on preset
            const preset = options.preset || 'balanced';
            
            let maxWidth = 1920;
            let quality = 80;
            let lossless = false;

            if (preset === 'high') { // Maps, Backgrounds
                maxWidth = 4096; // Allow 4k
                quality = 90;
                lossless = true; // For PNGs
            } else if (preset === 'icon') { // Icons
                maxWidth = 512;
                quality = 80;
            }

            // Resize if too massive
            if (meta.width && meta.width > maxWidth) {
                pipeline = pipeline.resize(maxWidth);
            }

            // Format-specific Logic
            if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                pipeline = pipeline.jpeg({ quality, mozjpeg: true });
            } else if (file.type === 'image/png') {
                // REMOVED: palette: true (This caused the dithering/banding)
                // compressionLevel 9 is max compression but lossless (slower upload, better looking)
                pipeline = pipeline.png({ compressionLevel: 9, quality: lossless ? 100 : quality });
            } else if (file.type === 'image/webp') {
                pipeline = pipeline.webp({ quality, lossless });
            }

            buffer = await pipeline.toBuffer() as Buffer;
        } catch (e) {
            console.error("Image optimization failed, using original:", e);
        }
    }

    const size = buffer.byteLength;
    const ext = file.name.split('.').pop() || 'bin';
    const filename = `${uuidv4()}.${ext}`; 
    const provider = process.env.STORAGE_PROVIDER || 'local';

    if (provider === 's3' && s3Client) {
        const key = `${folder}/${filename}`;
        
        await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: file.type,
            ACL: 'public-read' 
        }));
        
        const url = `${S3_PUBLIC_URL}/${S3_BUCKET}/${key}`;
        return { url, size };
    } 
    
    const targetDir = path.join(UPLOAD_DIR, folder);
    try { await fs.access(targetDir); } catch { await fs.mkdir(targetDir, { recursive: true }); }
    
    const filePath = path.join(targetDir, filename);
    await fs.writeFile(filePath, buffer);
    
    return { url: `/uploads/${folder}/${filename}`, size };
};

export const deleteAsset = async (url: string): Promise<boolean> => {
    // ... (Keep existing delete logic unchanged)
    const provider = process.env.STORAGE_PROVIDER || 'local';
    try {
        if (provider === 's3' && s3Client) {
            let key = url;
            const baseUrlWithBucket = `${S3_PUBLIC_URL}/${S3_BUCKET}/`;
            if (url.startsWith(baseUrlWithBucket)) key = url.replace(baseUrlWithBucket, '');
            else if (url.startsWith(`${S3_ENDPOINT}/${S3_BUCKET}/`)) key = url.replace(`${S3_ENDPOINT}/${S3_BUCKET}/`, '');
            await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
            return true;
        } else {
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