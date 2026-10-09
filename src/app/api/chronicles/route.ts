import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';
import { getCharacter } from '@/engine/characterService';
import { ChronicleDocument } from '@/engine/models';
import { v4 as uuidv4 } from 'uuid';

/** Curated playthrough stats — the memorial sheet's numbers. */
const STAT_QUALITIES = [
    'day', 'cases_closed', 'cases_open', 'reputation', 'cash',
    'heat', 'static_debt', 'watch_debt', 'gigs_done', 'liminal_rumors',
] as const;

const userIdOf = (session: unknown): string | null => {
    const user = (session as { user?: { id?: string } } | null)?.user;
    return user?.id ?? null;
};

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export async function GET() {
    const session = await getServerSession(authOptions);
    const userId = userIdOf(session);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const client = await clientPromise;
        const chronicles = await client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db')
            .collection<ChronicleDocument>('chronicles')
            .find({ userId })
            .sort({ at: -1 })
            .limit(50)
            .toArray();
        return NextResponse.json({ success: true, chronicles });
    } catch (e) {
        console.error('Chronicle List Error:', e);
        return NextResponse.json({ error: errText(e) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const userId = userIdOf(session);
    if (!userId) return NextResponse.json({ error: 'Unauthorized — sign in to save this Chronicle.' }, { status: 401 });

    const body = await request.json() as { storyId?: string; characterId?: string; epitaph?: string };

    try {
        const character = await getCharacter(userId, body.storyId || '', body.characterId);
        if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });
        if (!character.ended) return NextResponse.json({ error: 'This story has not ended yet.' }, { status: 400 });

        // Idempotent: one Chronicle per finished character.
        const client = await clientPromise;
        const existing = await client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db')
            .collection<ChronicleDocument>('chronicles')
            .findOne({ userId, characterId: character.characterId, storyId: character.storyId });
        if (existing) {
            return NextResponse.json({ success: true, chronicle: existing, alreadySaved: true });
        }

        const stats: Record<string, number> = {};
        for (const qid of STAT_QUALITIES) {
            stats[qid] = (character.qualities as Record<string, { level?: number }> | undefined)?.[qid]?.level ?? 0;
        }

        const chronicle: ChronicleDocument = {
            chronicleId: uuidv4(),
            storyId: character.storyId,
            userId,
            characterId: character.characterId,
            characterName: character.name,
            endingId: character.ended.endingId,
            endingName: character.ended.optionName,
            epitaph: typeof body.epitaph === 'string' ? body.epitaph.slice(0, 200) : undefined,
            stats,
            // Full final snapshot — enough to render a memorial sheet later.
            qualities: JSON.parse(JSON.stringify(character.qualities)),
            at: new Date(),
        };

        await client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db')
            .collection<ChronicleDocument>('chronicles').insertOne(chronicle);

        return NextResponse.json({ success: true, chronicle });
    } catch (e) {
        console.error('Chronicle Save Error:', e);
        return NextResponse.json({ error: errText(e) }, { status: 500 });
    }
}
