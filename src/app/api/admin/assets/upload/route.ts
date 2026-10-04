import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { uploadAsset } from '@/engine/storageService';
import { updateWorldConfigItem } from '@/engine/worldService';
import { ImageDefinition } from '@/engine/models';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';
import DOMPurify from 'isomorphic-dompurify';
import { isSvgFile, sniffSvg } from '@/utils/svgFile';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const FREE_LIMIT_BYTES = 20 * 1024 * 1024;

const VALID_RASTER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Strict SVG sanitisation: strip scriptable/remote content, keep vector art.
 * Removes <script>/<foreignObject>/on* handlers and blocks every URI scheme
 * (javascript:, http(s):) — only fragment refs (#..), relative paths and
 * inline data:image URIs survive. Inline <style>, gradients, filters,
 * animations and url(#..) references are preserved.
 */
function sanitizeSvg(svg: string): string | null {
    const clean = DOMPurify.sanitize(svg, {
        USE_PROFILES: { svg: true, svgFilters: true },
        FORBID_TAGS: ['foreignObject', 'script', 'iframe', 'object', 'embed', 'link', 'meta'],
        ALLOWED_URI_REGEXP: /^[^:]*$|^#|^data:image\//,
    });
    return clean.includes('<svg') ? clean : null;
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = (session.user as any).id;
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const storyId = formData.get('storyId') as string;

        let targetFolder = formData.get('folder') as string || 'misc';
        // Basic sanitization to prevent directory traversal attacks or messy paths
        targetFolder = targetFolder.replace(/\.\./g, '').replace(/^\/+|\/+$/g, '').trim();
        if (!targetFolder) targetFolder = 'misc';

        const category = formData.get('category') as string || 'uncategorized';
        const altText = formData.get('alt') as string || '';
        const qualityRaw = formData.get('quality');

        console.log(`[API: POST /admin/assets/upload] User ${userId} uploading file '${file.name}' to story '${storyId}' in category '${category}'.`);
        if (!file || !storyId) {
            return NextResponse.json({ error: 'Missing file or storyId' }, { status: 400 });
        }

        // SVGs are recognised by MIME, extension, or content — never by the
        // browser-reported type alone — and sanitised before storage.
        const bytes = Buffer.from(await file.arrayBuffer());
        const svgCandidate = isSvgFile({ name: file.name, type: file.type }) || sniffSvg(bytes.subarray(0, 1024));
        let uploadFile: File = file;
        if (svgCandidate) {
            const cleaned = sanitizeSvg(new TextDecoder('utf-8').decode(bytes));
            if (!cleaned) {
                return NextResponse.json({ error: 'Invalid or unsafe SVG file.' }, { status: 400 });
            }
            const baseName = file.name.replace(/\.svg$/i, '') || 'upload';
            uploadFile = new File([cleaned], `${baseName}.svg`, { type: 'image/svg+xml' });
        } else if (!VALID_RASTER_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only images allowed.' }, { status: 400 });
        }
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const isPremium = (user.roles || []).includes('admin') || (user.roles || []).includes('premium');
        const currentUsage = user.storageUsage || 0;
        const storageLimit = user.storageLimit || (isPremium ? 1024 * 1024 * 1024 : FREE_LIMIT_BYTES);

        if (currentUsage + file.size > storageLimit) {
            return NextResponse.json({ error: 'Storage limit exceeded.' }, { status: 402 });
        }
        let preset: 'high' | 'balanced' | 'icon' = 'balanced';
        if (['map', 'background', 'banner', 'cover'].includes(category)) {
            preset = 'high';
        } else if (['icon'].includes(category)) {
            preset = 'icon';
        }
        const qualityOverride = qualityRaw ? parseInt(qualityRaw as string) : undefined;
        
        const { url, size } = await uploadAsset(uploadFile, targetFolder, { 
            optimize: true, 
            preset,
            qualityOverride
        });

        const assetEntry = {
            id: uuidId(file.name),
            url,
            category,
            folder: targetFolder, 
            uploadedAt: new Date(),
            size
        };

        await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { 
                $inc: { storageUsage: size },
                $push: { assets: assetEntry } as any
            }
        );
        const imageId = assetEntry.id;
        const imageData: ImageDefinition = {
            id: imageId,
            url: url,
            alt: altText || file.name,
            category: category as any,
            size: size
        };

        await updateWorldConfigItem(storyId, 'images', imageId, imageData);

        return NextResponse.json({ success: true, image: imageData, usage: currentUsage + size });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}

function uuidId(filename: string) {
    const raw = filename.split('.')[0];
    return raw.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
}