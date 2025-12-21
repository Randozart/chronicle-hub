import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { getUserAssets, saveUserAsset, deleteUserAsset } from '@/engine/assetService';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const assets = await getUserAssets(userId);
    
    return NextResponse.json({ assets });
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id;
    const body = await request.json();
    const { id, type, folder, data } = body;
    
    if (!id || !type || !data) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const success = await saveUserAsset(userId, id, type, folder, data);
    return NextResponse.json({ success });
}

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const success = await deleteUserAsset(userId, id);
    return NextResponse.json({ success });
}