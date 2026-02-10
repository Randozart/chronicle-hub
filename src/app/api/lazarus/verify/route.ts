import { NextResponse } from 'next/server';
import { verifyLazarusAccess } from '@/engine/lazarusAccess';

export async function GET() {
    const { access } = await verifyLazarusAccess();
    if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    return NextResponse.json({ success: true });
}