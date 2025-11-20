// src/app/api/storylet/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { loadGameData } from '@/engine/dataLoader';
import { repositories } from '@/engine/repositories';

export async function GET(request: NextRequest) {
    try {
        const gameData = loadGameData();
        repositories.initialize(gameData);

        const context = { params: { id: request.nextUrl.pathname.split('/').pop() } };
        const storyletId = context.params.id;
        
        if (!storyletId) {
            return NextResponse.json({ error: 'Could not determine storylet ID from URL' }, { status: 400 });
        }

        const storylet = repositories.getEvent(storyletId);

        if (!storylet) {
            return NextResponse.json({ error: `Storylet with ID '${storyletId}' not found` }, { status: 404 });
        }

        return NextResponse.json(storylet);

    } catch (error) {
        console.error(`[API /api/storylet]`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}