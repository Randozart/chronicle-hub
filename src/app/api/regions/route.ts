import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getWorldConfig } from '@/engine/worldService';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    try {
        const config = await getWorldConfig(storyId);
        return NextResponse.json(config.regions || {});
    } catch (e) {
        console.error("Error fetching regions:", e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}