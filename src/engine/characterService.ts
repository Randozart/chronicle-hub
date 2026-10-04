// src/engine/characterService.ts
import { processAutoEquip } from './resolutionService'; 
import clientPromise from '@/engine/database';
import { PlayerQualities, CharacterDocument, WorldConfig, QualityType, PendingEvent, LivingEvent, SocialEvent, QualityChangeInfo } from '@/engine/models';
import { getWorldConfig, getSettings, getWorldState } from '@/engine/worldService';
import { GameEngine } from './gameEngine';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const COLLECTION_NAME = 'characters';

export const checkLivingStories = async (character: CharacterDocument): Promise<CharacterDocument> => {
    if (!character.pendingEvents || character.pendingEvents.length === 0) return character;

    const now = new Date();
    const dueEvents = character.pendingEvents.filter(e => now >= new Date(e.triggerTime) && !e.completedTime);
    // Unaccepted social invitations must NOT auto-complete here — they wait for
    // the target's Accept/Decline. Auto-accepted social acts DO apply on this tick.
    const eventsToFire = dueEvents.filter((e): e is LivingEvent => e.type !== 'social');
    const autoAcceptSocial = dueEvents.filter((e): e is SocialEvent => e.type === 'social' && !!e.autoAccept && !e.accepted);

    if (eventsToFire.length === 0 && autoAcceptSocial.length === 0) return character;

    const gameData = await getWorldConfig(character.storyId);
    const worldState = await getWorldState(character.storyId);

    // Merge runtime-created quality definitions so timers may target
    // %new dynamic qualities exactly like the resolve pipeline does.
    const mergedConfig: WorldConfig = {
        ...gameData,
        qualities: { ...gameData.qualities, ...(character.dynamicQualities || {}) }
    };

    const engine = new GameEngine(character.qualities, mergedConfig, character.equipment, worldState);

    let firedAny = false;

    for (const event of eventsToFire) {
        firedAny = true;
        if (event.scope === 'category') {
            const categoryName = event.targetId;
            const affectedQids = Object.values(mergedConfig.qualities)
                .filter(q => q.category?.split(',').map(c => c.trim().toLowerCase()).includes(categoryName.trim().toLowerCase()))
                .map(q => q.id);

            for (const qid of affectedQids) {
                const effectString = `$${qid} ${event.op} ${event.value}`;
                engine.applyEffects(effectString);
            }
        } else {
            const effectString = `$${event.targetId} ${event.op} ${event.value}`;
            engine.applyEffects(effectString);
        }
        const originalEvent = character.pendingEvents.find((e): e is LivingEvent => e.instanceId === event.instanceId);
        if (!originalEvent) continue;
        originalEvent.completedTime = now;

        if (originalEvent.recurring && originalEvent.intervalMs && originalEvent.intervalMs > 0) {
            const oldTriggerTime = new Date(originalEvent.triggerTime).getTime();
            const nextTriggerTime = new Date(oldTriggerTime + originalEvent.intervalMs);
            character.pendingEvents.push({
                ...originalEvent,
                instanceId: uuidv4(),
                startTime: originalEvent.triggerTime,
                triggerTime: nextTriggerTime,
                completedTime: undefined,
            });
        }
    }

    for (const social of autoAcceptSocial) {
        firedAny = true;
        const effectString = social.outcome === 'fail'
            ? social.effects?.fail
            : social.effects?.pass;
        if (social.actorSnapshot) engine.setTargetContext(social.actorSnapshot);
        const changesBefore = engine.changes.length;
        if (effectString) engine.applyEffects(effectString);
        // Narration: $target here is the ACTOR (actorSnapshot).
        if (social.description) {
            social.description = engine.evaluateText(social.description);
        }
        const originalEvent = character.pendingEvents.find((e): e is SocialEvent => e.instanceId === social.instanceId);
        if (!originalEvent) continue;
        // Stay pending (acknowledge-style) so the target sees what was done to
        // them; only the Acknowledge click (acknowledge-event) removes the card.
        originalEvent.accepted = true;
        originalEvent.changes = engine.changes.slice(changesBefore);
    }

    character.qualities = engine.getQualities();
    const newDefinitions = engine.getDynamicQualities();
    if (Object.keys(newDefinitions).length > 0) {
        character.dynamicQualities = { ...(character.dynamicQualities || {}), ...newDefinitions };
    }

    // Persist $world.* writes: compare the engine's world snapshot against
    // the state we loaded and write back only the changed keys.
    const updatedWorldQualities = engine.getWorldQualities();
    const changedWorldKeys = Object.keys(updatedWorldQualities).filter(qid =>
        JSON.stringify(worldState[qid]) !== JSON.stringify(updatedWorldQualities[qid])
    );
    if (changedWorldKeys.length > 0) {
        try {
            const client = await clientPromise;
            const db = client.db(DB_NAME);
            const updates: Record<string, unknown> = {};
            for (const qid of changedWorldKeys) {
                updates[`worldState.${qid}`] = updatedWorldQualities[qid];
            }
            await db.collection('worlds').updateOne({ worldId: character.storyId }, { $set: updates });
        } catch (worldWriteError) {
            console.error(`[checkLivingStories] Failed to persist world-state writes for ${character.storyId}:`, worldWriteError);
        }
    }

    // Guests have no DB document; the mutated character is returned to the
    // caller (the resolve API echoes pendingEvents back to the client).
    if (firedAny && character.userId !== 'guest') {
        await saveCharacterState(character);
    }

    return character;
};

export const processScheduledUpdates = (character: CharacterDocument, instructions: any[]) => {
    if (!instructions || instructions.length === 0) return;

    if (!character.pendingEvents) character.pendingEvents = [];

    const removals = instructions.filter(i => ['cancel', 'reset', 'update'].includes(i.type));
    const additions = instructions.filter(i => ['schedule', 'reset', 'update'].includes(i.type));
    for (const instr of removals) {
        const { scope = null, targetId, target = { type: 'all' } } = instr;
        const normScope = scope ?? null;

        let matches: LivingEvent[] = character.pendingEvents.filter((e): e is LivingEvent =>
            e.type !== 'social' && (e.scope ?? null) === normScope && e.targetId === targetId
        );

        if (matches.length === 0) continue;
        if (target.type === 'first') {
            matches.sort((a: LivingEvent, b: LivingEvent) => new Date(a.triggerTime).getTime() - new Date(b.triggerTime).getTime());
        } else if (target.type === 'last') {
            matches.sort((a: LivingEvent, b: LivingEvent) => new Date(b.triggerTime).getTime() - new Date(a.triggerTime).getTime());
        }

        const count = target.count || (target.type === 'all' ? Infinity : 1);
        const toRemove: LivingEvent[] = matches.slice(0, count);
        const toRemoveIds = new Set(toRemove.map((e: PendingEvent) => e.instanceId));
        character.pendingEvents = character.pendingEvents.filter((e: PendingEvent) => !toRemoveIds.has(e.instanceId));
    }
    for (const instr of additions) {
        if (instr.op && instr.intervalMs) {

            if (instr.unique) {
                const exists = character.pendingEvents.some((e): e is LivingEvent =>
                    e.type !== 'social' &&
                    (e.scope ?? null) === (instr.scope ?? null) &&
                    e.targetId === instr.targetId &&
                    e.op === instr.op &&
                    e.value === instr.value
                );
                if (exists) continue;
            }

            const newEvent: LivingEvent = {
                instanceId: uuidv4(),
                scope: instr.scope ?? null,
                targetId: instr.targetId,
                op: instr.op,
                value: instr.value,
                startTime: new Date(),
                triggerTime: new Date(Date.now() + instr.intervalMs),
                recurring: !!instr.recurring,
                intervalMs: instr.intervalMs,
                description: instr.description
            };

            character.pendingEvents.push(newEvent);
        } else {
            console.warn(
                `[LivingStories] Dropping malformed timer instruction ` +
                `(op=${JSON.stringify(instr.op)}, intervalMs=${JSON.stringify(instr.intervalMs)}, ` +
                `target=${instr.targetId}, rawOptions=${JSON.stringify(instr.rawOptions)}). ` +
                `Check the %schedule duration (use m/h/d units) and the $quality effect syntax.`
            );
        }
    }
};

export const getCharacter = async (userId: string, storyId: string, characterId?: string): Promise<CharacterDocument | null> => {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const query: any = { userId, storyId };
        if (characterId) query.characterId = characterId;

        const chars = await db.collection<CharacterDocument>(COLLECTION_NAME)
            .find(query)
            .sort({ lastActionTimestamp: -1 })
            .limit(1)
            .toArray();

        return chars.length > 0 ? chars[0] : null;
    } catch (e) {
        console.error('DB Error:', e);
        return null;
    }
};

export const getCharactersList = async (userId: string, storyId: string) => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const chars = await db.collection<CharacterDocument>(COLLECTION_NAME)
        .find({ userId, storyId })
        .project({ 
            _id: 1, 
            characterId: 1, 
            name: 1, 
            currentLocationId: 1, 
            lastActionTimestamp: 1,
            "qualities.player_portrait": 1 
        })
        .sort({ lastActionTimestamp: -1 })
        .toArray();

    return chars.map(c => {
        const portraitQ = c.qualities?.['player_portrait'];
        const portraitCode = (portraitQ && portraitQ.type === 'S') ? (portraitQ as any).stringValue : null;

        return {
            characterId: c.characterId || c._id.toString(),
            name: c.name || "Unknown Drifter",
            currentLocationId: c.currentLocationId || "start",
            lastActionTimestamp: c.lastActionTimestamp?.toString(),
            portrait: portraitCode
        };
    });
};

/// Provisioning inputs for a brand-new character, shared by the registered
/// and guest creation flows so both produce identical starting state.
export interface InitialCharacterState {
    initialQualities: PlayerQualities;
    initialDeckCharges: Record<string, number>;
    initialLastDeckUpdate: Record<string, Date>;
}

/// Build starting qualities from char_create rules (explicit choices first,
/// then static/numeric/string defaults, then expression evaluation), seed
/// deck charges from each deck's deck_size, and seed the action economy
/// quality from settings.maxActions.
export const buildInitialCharacterState = (
    worldContent: WorldConfig,
    choices?: Record<string, string>
): InitialCharacterState => {
    const initialQualities: PlayerQualities = {};
    const rules = worldContent.char_create || {};

    // Pass 1: direct values - player choices win over rule defaults.
    for (const key in rules) {
        const qid = key.replace('$', '');
        const ruleObj = rules[key];
        if (!ruleObj || typeof ruleObj.rule === 'undefined' || ruleObj.rule === null) {
            console.warn(`[CharCreate] Corrupt rule for key "${key}". Skipping.`);
            continue;
        }

        let rule = ruleObj.rule;
        const def = worldContent.qualities[qid];
        let type = def?.type || inferType(rule);
        let value: string | number | null = null;

        if (choices && choices[qid] !== undefined) {
             value = choices[qid];
        } else if (rule.includes('|')) {
        } else if (!isNaN(Number(rule))) {
             value = Number(rule);
        } else if (rule === 'string') {
             value = "";
        }

        if (value !== null) {
            const numVal = Number(value);
            if (type === QualityType.String) {
                initialQualities[qid] = { qualityId: qid, type, stringValue: String(value) };
            } else {
                initialQualities[qid] = { qualityId: qid, type, level: isNaN(numVal) ? 0 : numVal, changePoints: 0 } as any;
            }
        }
    }

    // Pass 2: expression rules evaluated against everything pass 1 produced.
    const tempEngine = new GameEngine(initialQualities, worldContent);
    for (const key in rules) {
        const qid = key.replace('$', '');
        if (initialQualities[qid]) continue;

        const ruleObj = rules[key];
        if (!ruleObj || typeof ruleObj.rule === 'undefined' || ruleObj.rule === null) continue;

        const rule = ruleObj.rule;

        if (rule.includes('$') || rule.includes('+') || rule.includes('*') || rule.includes('{')) {
            try {
                const result = tempEngine.evaluateText(`{${rule}}`);
                const def = worldContent.qualities[qid];
                const isNumber = !isNaN(Number(result)) && result.trim() !== "";
                let type = def?.type || (isNumber ? QualityType.Pyramidal : QualityType.String);

                if (type === QualityType.String) {
                     initialQualities[qid] = { qualityId: qid, type, stringValue: result };
                } else {
                     initialQualities[qid] = { qualityId: qid, type, level: Number(result) || 0 } as any;
                }
            } catch (e) { console.error(e); }
        }
    }

    // Deck charges.
    const initialDeckCharges: Record<string, number> = {};
    const initialLastDeckUpdate: Record<string, Date> = {};
    if (worldContent.decks) {
        for (const deckId in worldContent.decks) {
            const deckDef = worldContent.decks[deckId];
            const sizeStr = tempEngine.evaluateText(`{${deckDef.deck_size || '0'}}`);
            initialDeckCharges[deckId] = parseInt(sizeStr) || 0;
            initialLastDeckUpdate[deckId] = new Date();
        }
    }

    // Action economy seed honours the world's configured maximum.
    if (worldContent.settings.useActionEconomy) {
        const actionQid = worldContent.settings.actionId.replace('$', '');
        if (!initialQualities[actionQid]) {
            const maxStr = tempEngine.evaluateText(`{${worldContent.settings.maxActions || 20}}`);
            const maxActions = parseInt(maxStr, 10);
            initialQualities[actionQid] = { qualityId: actionQid, type: QualityType.Counter, level: isNaN(maxActions) ? 20 : maxActions };
        }
    }

    return { initialQualities, initialDeckCharges, initialLastDeckUpdate };
};

/// Resolve a new character's display name: explicit choice first (checked
/// against the configured player-name id, the default id, and 'name'),
/// then the seeded quality value, then a generic fallback.
export const resolveCharacterName = (
    worldContent: WorldConfig,
    choices: Record<string, string> | undefined,
    initialQualities: PlayerQualities
): string => {
    const nameSetting = worldContent.settings.playerName || '$player_name';
    const nameQid = nameSetting.replace('$', '').trim();

    const fromChoice = choices?.[nameQid] ?? choices?.['player_name'] ?? choices?.['name'];
    if (fromChoice) return fromChoice;

    const nameState = initialQualities[nameQid] as any;
    if (nameState?.stringValue) return nameState.stringValue;
    if (nameState && typeof nameState.level === 'number') return String(nameState.level);

    return "Unknown";
};

export const getOrCreateCharacter = async (
    userId: string,
    storyId: string,
    choices?: Record<string, string>
): Promise<CharacterDocument> => {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<CharacterDocument>(COLLECTION_NAME);
    const worldContent = await getWorldConfig(storyId);

    const { initialQualities, initialDeckCharges, initialLastDeckUpdate } = buildInitialCharacterState(worldContent, choices);

    let startingLocation = choices?.['location'] || worldContent.settings.startLocation;

    if (!startingLocation) {
        const allLocations = Object.keys(worldContent.locations || {});
        if (allLocations.length > 0) {
            startingLocation = allLocations[0];
        } else {
            startingLocation = 'start';
        }
    }

    const charName = resolveCharacterName(worldContent, choices, initialQualities);

    const newCharacter: CharacterDocument = {
        characterId: uuidv4(),
        name: charName,
        userId,
        storyId,
        qualities: initialQualities,
        currentLocationId: startingLocation,
        currentStoryletId: "",
        opportunityHands: {},
        deckCharges: initialDeckCharges,
        lastDeckUpdate: initialLastDeckUpdate,
        equipment: {},
        lastActionTimestamp: new Date(),
        pendingEvents: [],
        acknowledgedMessages: []
    };

    const initialChanges: QualityChangeInfo[] = [];
    for (const qid in newCharacter.qualities) {
        const qualityState = newCharacter.qualities[qid];
        const qualityDef = worldContent.qualities[qid];

        if (qualityDef?.type === QualityType.Equipable && 'level' in qualityState && qualityState.level > 0) {
            initialChanges.push({
                qid: qid,
                qualityName: qualityDef?.name || qid,
                type: QualityType.Equipable,
                levelBefore: 0,
                cpBefore: 0,
                levelAfter: qualityState.level,
                cpAfter: 0,
                changeText: "Character started with this item."
            });
        }
    }

    if (initialChanges.length > 0) {
        processAutoEquip(newCharacter, initialChanges, worldContent);
    }

    await collection.insertOne(newCharacter);
    
    return newCharacter;
};

export const saveCharacterState = async (character: CharacterDocument): Promise<boolean> => {
    const { userId, storyId, characterId, ...data } = character;
    if (!characterId) return false;
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection(COLLECTION_NAME).updateOne(
        { characterId, userId }, 
        { $set: data }
    );
    return true;
};

export const regenerateActions = async (character: CharacterDocument): Promise<CharacterDocument> => {
    const settings = await getSettings(character.storyId);
    if (!settings.useActionEconomy) return character;
    
    const lastTimestamp = character.lastActionTimestamp ? new Date(character.lastActionTimestamp) : new Date();
    const now = new Date();
    
    const msPassed = now.getTime() - lastTimestamp.getTime();
    const regenInterval = settings.regenIntervalInMinutes || 10;
    const intervalMs = regenInterval * 60 * 1000;
    
    const ticks = Math.floor(msPassed / intervalMs);
    
    if (ticks <= 0) return character;
    
    const worldConfig = await getWorldConfig(character.storyId);
    const engine = new GameEngine(character.qualities, worldConfig, character.equipment);
    const regenRaw = settings.regenAmount || 1;
    const actionQid = settings.actionId.replace('$', '');

    if (!character.qualities[actionQid]) {
        character.qualities[actionQid] = {
            qualityId: actionQid,
            type: QualityType.Counter,
            level: engine.getEffectiveLevel(actionQid),
            changePoints: 0
        } as any;
    }

    if (!isNaN(Number(regenRaw))) {
        const amount = Number(regenRaw) * ticks;
        const maxStr = settings.maxActions || 20;
        const maxVal = parseInt(engine.evaluateText(`{${maxStr}}`), 10) || 20;
        const current = engine.getEffectiveLevel(actionQid);
        
        if (character.qualities[actionQid]) {
            (character.qualities[actionQid] as any).level = Math.min(maxVal, current + amount);
        }
    } else {
        const effectString = String(regenRaw);
        const safeTicks = Math.min(ticks, 100);
        for (let i = 0; i < safeTicks; i++) { engine.applyEffects(effectString); }
        character.qualities = engine.getQualities();
    }
    
    character.lastActionTimestamp = new Date(lastTimestamp.getTime() + ticks * intervalMs);

    return character;
};

const inferType = (value: any): QualityType => {
    if (typeof value === 'string' && isNaN(Number(value))) return QualityType.String;
    return QualityType.Pyramidal;
};