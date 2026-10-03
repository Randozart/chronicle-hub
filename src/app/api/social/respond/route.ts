import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';
import { getCharacter, saveCharacterState } from '@/engine/characterService';
import { getContent } from '@/engine/contentCache';
import { getWorldState } from '@/engine/worldService';
import { GameEngine } from '@/engine/gameEngine';
import { CharacterDocument, SocialEvent } from '@/engine/models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

/**
 * Target-side response to a social act.
 * - accept: applies the outcome's effect string in the target's context with
 *   the actor snapshot as $target.*, records the change list, marks accepted.
 * - decline: silently removes the event. No effects, no actor notification.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { storyId, characterId, instanceId, action, guestState } = body;

        if (!storyId || !instanceId || !action || !['accept', 'decline'].includes(action)) {
            return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
        }

        const session = await getServerSession(authOptions);
        let character: CharacterDocument | null = null;
        let isGuest = false;

        if (!session?.user) {
            if (!guestState) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            character = guestState as CharacterDocument;
            isGuest = true;
        } else {
            const userId = (session.user as any).id;
            if (!characterId) {
                return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
            }
            character = await getCharacter(userId, storyId, characterId);
        }

        if (!character) {
            return NextResponse.json({ error: 'Character not found.' }, { status: 404 });
        }

        const event = character.pendingEvents?.find(
            (e): e is SocialEvent => e.type === 'social' && e.instanceId === instanceId && !e.completedTime
        );
        if (!event) {
            return NextResponse.json({ error: 'Social event not found.' }, { status: 404 });
        }

        // Decline: silent consume — remove the event, done.
        if (action === 'decline') {
            character.pendingEvents = (character.pendingEvents || []).filter(e => e.instanceId !== instanceId);
            if (!isGuest) await saveCharacterState(character);
            return NextResponse.json({ success: true, character });
        }

        // Accept: apply the outcome's effects in the target's context.
        const gameData = await getContent(storyId);
        const worldState = await getWorldState(storyId);
        const mergedQualities = { ...gameData.qualities, ...(character.dynamicQualities || {}) };
        const mergedConfig = { ...gameData, qualities: mergedQualities };

        const engine = new GameEngine(character.qualities, mergedConfig, character.equipment, worldState);
        if (event.actorSnapshot) {
            engine.setTargetContext(event.actorSnapshot);
        }

        const effectString = event.outcome === 'fail' ? event.effects?.fail : event.effects?.pass;
        const changesBefore = engine.changes.length;
        if (effectString) engine.applyEffects(effectString);

        // Narration: $target here is the ACTOR (actorSnapshot), plain quality
        // reads are the accepting player's own state.
        if (event.description) {
            event.description = engine.evaluateText(event.description);
        }

        character.qualities = engine.getQualities();
        const newDefinitions = engine.getDynamicQualities();
        if (Object.keys(newDefinitions).length > 0) {
            character.dynamicQualities = { ...(character.dynamicQualities || {}), ...newDefinitions };
        }

        event.accepted = true;
        event.changes = engine.changes.slice(changesBefore);

        // Target-side effects may write $world.* — persist changed keys.
        const updatedWorldQualities = engine.getWorldQualities();
        const changedWorldKeys = Object.keys(updatedWorldQualities).filter(qid =>
            JSON.stringify(worldState[qid]) !== JSON.stringify(updatedWorldQualities[qid])
        );
        if (changedWorldKeys.length > 0) {
            const updates: Record<string, unknown> = {};
            for (const qid of changedWorldKeys) {
                updates[`worldState.${qid}`] = updatedWorldQualities[qid];
            }
            const client = await clientPromise;
            await client.db(DB_NAME).collection('worlds').updateOne({ worldId: storyId }, { $set: updates });
        }

        if (!isGuest) await saveCharacterState(character);

        return NextResponse.json({ success: true, character });
    } catch (error: any) {
        console.error('Social respond error:', error);
        return NextResponse.json({ error: 'An unexpected error occurred.', details: error.message }, { status: 500 });
    }
}
