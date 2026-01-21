import { NextResponse } from 'next/server';
import { getAllThemes } from '@/engine/themeParser';

export async function GET() {
    try {
        const allThemes = getAllThemes();
        
        return NextResponse.json({ themes: allThemes });
    } catch (error) {
        console.error("Error fetching theme variables:", error);
        return NextResponse.json({ error: 'Failed to fetch theme variables' }, { status: 500 });
    }
}