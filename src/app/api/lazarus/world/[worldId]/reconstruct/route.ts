import { NextRequest, NextResponse } from 'next/server';
import { verifyLazarusAccess } from '@/engine/lazarusAccess';
import { reconstructWorldData } from '@/engine/lazarus/reconstruction';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ worldId: string }> }
) {
    const { worldId } = await params;
    const { access } = await verifyLazarusAccess(worldId);
    
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        // This is a heavy operation, effectively compiling the game logic
        const data = await reconstructWorldData(worldId);
        
        return NextResponse.json(data);

    } catch (e: any) {
        console.error("Reconstruction API Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}