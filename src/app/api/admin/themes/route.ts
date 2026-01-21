import { NextResponse } from 'next/server';
import { getThemeColors } from '@/engine/themeParser';

export async function GET() {
    try {
        const defaultTheme = getThemeColors('default'); 
        const themeVariableNames = Object.keys(defaultTheme);
        
        return NextResponse.json({ variables: themeVariableNames });
    } catch (error) {
        console.error("Error fetching theme variables:", error);
        return NextResponse.json({ error: 'Failed to fetch theme variables' }, { status: 500 });
    }
}