import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';
import sharp from 'sharp';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
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

export type QualityPreset = 'high' | 'balanced' | 'icon';

export const uploadAsset = async (
    file: File | Buffer, 
    folder: string = 'misc', 
    options: { 
        optimize?: boolean; 
        preset?: QualityPreset;
        maxWidth?: number;
        qualityOverride?: number;
        filename?: string; 
    } = {}
): Promise<{ url: string; size: number }> => {
    
    let buffer: Buffer;
    let originalName = "upload.bin";
    let contentType = "application/octet-stream";

    // Unpack input with explicit Type Checks
    if (Buffer.isBuffer(file)) {
        buffer = file;
        originalName = options.filename ? `${options.filename}.png` : "upload.png";
        contentType = "image/png"; 
    } else {
        const f = file as File; 
        buffer = Buffer.from(await f.arrayBuffer());
        originalName = f.name;
        contentType = f.type;
    }

    let ext = originalName.split('.').pop() || 'bin';
    
    // Optimization & WebP Conversion
    const isSvg = contentType === 'image/svg+xml' || ext === 'svg';
    // Optimize if it's an image, not an SVG, and optimization isn't disabled
    const shouldOptimize = options.optimize !== false && (contentType.startsWith('image/') || ['.png', '.jpg', '.jpeg'].includes(`.${ext}`));

    if (!isSvg && shouldOptimize) {
        try {
            let pipeline = sharp(buffer);
            const meta = await pipeline.metadata();
            
            const preset = options.preset || 'balanced';
            let maxWidth = options.maxWidth || 1920;
            let quality = 80;

            if (preset === 'high') { 
                maxWidth = 4096;
                quality = 90;
            } else if (preset === 'icon') {
                maxWidth = 512;
                quality = 80;
            }
            if (options.qualityOverride) {
                quality = options.qualityOverride;
            }

            if (meta.width && meta.width > maxWidth) {
                pipeline = pipeline.resize(maxWidth, null, { withoutEnlargement: true });
            }

            // Force WebP Conversion
            pipeline = pipeline.webp({ 
                quality: quality,
                effort: 4, 
                smartSubsample: true
            });

            buffer = await pipeline.toBuffer();
            ext = 'webp';
            contentType = 'image/webp';

        } catch (e) {
            console.error("Image optimization failed, using original:", e);
        }
    }

    // Save Logic
    const size = buffer.byteLength;
    
    // Use provided filename (sanitized) or generate UUID
    const cleanName = options.filename 
        ? options.filename.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() 
        : uuidv4();
        
    const filename = `${cleanName}.${ext}`; 
    const provider = process.env.STORAGE_PROVIDER || 'local';

    if (provider === 's3' && s3Client) {
        const key = `${folder}/${filename}`;
        
        await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            ACL: 'public-read'
        }));
        
        const url = `${S3_PUBLIC_URL}/${S3_BUCKET}/${key}`;
        return { url, size };
    } 

    // Local Provider
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

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
};

export const getAssetBuffer = async (url: string): Promise<Buffer | null> => {
    const provider = process.env.STORAGE_PROVIDER || 'local';

    try {
        if (provider === 's3' && s3Client) {
            let key = url;
            const baseUrlWithBucket = `${S3_PUBLIC_URL}/${S3_BUCKET}/`;
            
            if (url.startsWith(baseUrlWithBucket)) {
                key = url.replace(baseUrlWithBucket, '');
            } else if (url.startsWith(`${S3_ENDPOINT}/${S3_BUCKET}/`)) {
                key = url.replace(`${S3_ENDPOINT}/${S3_BUCKET}/`, '');
            }

            const command = new GetObjectCommand({
                Bucket: S3_BUCKET,
                Key: key
            });
            
            const response = await s3Client.send(command);
            if (!response.Body) return null;
            
            return streamToBuffer(response.Body as Readable);

        } else {
            const relativePath = url.startsWith('http') 
                ? new URL(url).pathname 
                : (url.startsWith('/') ? url.slice(1) : url);
                
            const fullPath = path.join(process.cwd(), 'public', relativePath);
            return await fs.readFile(fullPath);
        }
    } catch (e) {
        console.error(`Failed to retrieve asset: ${url}`, e);
        return null;
    }
};