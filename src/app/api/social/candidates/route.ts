import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';
import { getCharacter } from '@/engine/characterService';
import { getEvent, getWorldState } from '@/engine/worldService';
import { GameEngine } from '@/engine/gameEngine';
import { CharacterDocument } from '@/engine/models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

/**
 * Lists valid targets for a social option: registered characters in the same
 * world, filtered by the option's scope (`here` = same location) and its
 * `social_if` condition evaluated per candidate. Locked candidates are hidden.
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = (session.user as any).id;

        const { searchParams } = new URL(request.url);
        const storyId = searchParams.get('storyId');
        const characterId = searchParams.get('characterId');
        const storyletId = searchParams.get('storyletId');
        const optionId = searchParams.get('optionId');

        if (!storyId || !characterId || !storyletId || !optionId) {
            return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
        }

        const actor = await getCharacter(userId, storyId, characterId);
        if (!actor) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

        const gameData = await getContentLite(storyId);
        if (!gameData) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

        const storyletDef = await getEvent(storyId, storyletId);
        const option = storyletDef?.options?.find(o => o.id === optionId);
        if (!option || !option.social) {
            return NextResponse.json({ error: 'Option is not a social action.' }, { status: 400 });
        }

        const scope = option.social_scope || 'here';
        const worldState = await getWorldState(storyId);

        const client = await clientPromise;
        const query: Record<string, unknown> = {
            storyId,
            characterId: { $ne: actor.characterId },
            userId: { $ne: 'guest' },
        };
        if (scope === 'here') query.currentLocationId = actor.currentLocationId;

        const candidates = await client.db(DB_NAME)
            .collection<CharacterDocument>('characters')
            .find(query, { projection: { characterId: 1, name: 1 } })
            .limit(100)
            .toArray();

        const results: { characterId: string; name: string }[] = [];
        for (const cand of candidates) {
            if (option.social_if) {
                const candEngine = new GameEngine(cand.qualities || {}, gameData, cand.equipment || {}, worldState);
                if (cand.dynamicQualities) {
                    Object.assign(candEngine.worldContent.qualities, cand.dynamicQualities);
                }
                if (!candEngine.evaluateCondition(option.social_if)) continue;
            }
            results.push({ characterId: cand.characterId, name: cand.name });
        }

        return NextResponse.json({ success: true, candidates: results });
    } catch (error: any) {
        console.error('Social candidates error:', error);
        return NextResponse.json({ error: 'An unexpected error occurred.', details: error.message }, { status: 500 });
    }
}

/** getContent includes the full quality registry, needed for condition evaluation. */
async function getContentLite(storyId: string) {
    const { getContent } = await import('@/engine/contentCache');
    return getContent(storyId);
}
