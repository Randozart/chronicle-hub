import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { ImageComposition } from '@/engine/models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const id = searchParams.get('id');

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    if (id) {
        const item = await db.collection<ImageComposition>('compositions').findOne({ storyId, id });
        return NextResponse.json(item || null);
    }

    const items = await db.collection<ImageComposition>('compositions').find({ storyId }).toArray();
    return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { storyId, data } = body;

        if (!storyId || !data || !data.id) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        await db.collection('compositions').updateOne(
            { storyId, id: data.id },
            { $set: { ...data, lastModified: new Date() } },
            { upsert: true }
        );

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Save failed' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const id = searchParams.get('id');

    if (!storyId || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    await db.collection('compositions').deleteOne({ storyId, id });
    return NextResponse.json({ success: true });
}