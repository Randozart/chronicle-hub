import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { uploadAsset, deleteAsset } from '@/engine/storageService';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const FREE_LIMIT_BYTES = 20 * 1024 * 1024;

const ALLOWED_AUDIO_TYPES = [
    'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/mpeg', 'audio/mp3',
    'audio/ogg', 'audio/vorbis',
    'audio/flac',
    'audio/aiff', 'audio/x-aiff',
    'audio/webm',
];
const ALLOWED_EXTENSIONS = ['wav', 'mp3', 'ogg', 'flac', 'aiff', 'webm'];

function sanitizeId(filename: string): string {
    const base = filename.split('.').slice(0, -1).join('_') || filename;
    return base.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
}

/** GET /api/admin/samples — list all samples for the authenticated user */
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const user = await db.collection('users').findOne(
        { _id: new ObjectId(userId) },
        { projection: { assets: 1 } }
    );

    const samples = ((user?.assets as any[]) || []).filter((a: any) => a.type === 'sample');
    return NextResponse.json({ samples });
}

/** POST /api/admin/samples — upload a new audio sample */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = (session.user as any).id;

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const nameOverride = (formData.get('name') as string | null)?.trim();

        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const isValidType = ALLOWED_AUDIO_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);
        if (!isValidType) {
            return NextResponse.json({ error: 'Invalid file type. Allowed: wav, mp3, ogg, flac, aiff, webm.' }, { status: 400 });
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

        const sampleId = nameOverride
            ? nameOverride.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
            : sanitizeId(file.name);

        const { url, size } = await uploadAsset(file, `samples/${userId}`, {
            optimize: false,
            filename: sampleId,
        });

        const sampleEntry = {
            id: sampleId,
            type: 'sample',
            url,
            size,
            uploadedAt: new Date(),
        };

        // Remove any existing sample with the same id, then push the new one
        await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            {
                $pull: { assets: { id: sampleId } } as any,
            }
        );
        await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            {
                $inc: { storageUsage: size },
                $push: { assets: sampleEntry } as any,
            }
        );

        return NextResponse.json({ success: true, sample: sampleEntry });
    } catch (error) {
        console.error('[samples POST] error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}

/** DELETE /api/admin/samples — delete a sample by id */
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = (session.user as any).id;

        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const user = await db.collection('users').findOne(
            { _id: new ObjectId(userId) },
            { projection: { assets: 1 } }
        );

        const sample = ((user?.assets as any[]) || []).find(
            (a: any) => a.type === 'sample' && a.id === id
        );
        if (!sample) return NextResponse.json({ error: 'Sample not found' }, { status: 404 });

        // Delete the file from storage
        await deleteAsset(sample.url);

        // Remove from user assets and decrement storage usage
        await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            {
                $pull: { assets: { id } } as any,
                $inc: { storageUsage: -(sample.size || 0) },
            }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[samples DELETE] error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
