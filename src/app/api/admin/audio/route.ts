import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { getWorldConfig } from '@/engine/worldService';
import { getUserAssets } from '@/engine/assetService';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    
    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    const configPromise = getWorldConfig(storyId);
    
    let userAssetsPromise = Promise.resolve([]);
    if (session && session.user) {
        const userId = (session.user as any).id;
        userAssetsPromise = getUserAssets(userId) as any;
    }

    const [config, globalAssets] = await Promise.all([configPromise, userAssetsPromise]);
    
    return NextResponse.json({
        instruments: config.instruments || {},
        music: config.music || {},
        global: globalAssets || [] 
    });
}