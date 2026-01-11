import clientPromise from '@/engine/database';
import { CharacterDocument, WorldConfig, PlayerQualities, QualityChangeInfo } from './models';
import { saveCharacterState } from './characterService';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function applyWorldUpdates(
    worldId: string, 
    changes: QualityChangeInfo[]
): Promise<void> {
    const worldChanges = changes.filter(c => c.scope === 'world');
    if (worldChanges.length === 0) return;

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const updates: Record<string, any> = {};
    
    for (const change of worldChanges) {
        const key = `worldState.${change.qid}`;
        
        // We use the level calculated by the engine
        // NOTE: For high-concurrency (MMO style), we should ideally use $inc.
        // But since ScribeScript logic can be complex (e.g. $q = $q * 2), 
        // we trust the engine's result for V1.
        
        const val = change.stringValue !== undefined ? change.stringValue : change.levelAfter;
        
        updates[key] = { 
            qualityId: change.qid, 
            type: change.type, 
            level: typeof val === 'number' ? val : 0,
            stringValue: typeof val === 'string' ? val : undefined
        };
    }

    await db.collection('worlds').updateOne(
        { worldId },
        { $set: updates }
    );
}

export function processAutoEquip(
    character: CharacterDocument, 
    changes: QualityChangeInfo[], 
    gameData: WorldConfig
) {
    for (const change of changes) {
        if (change.levelAfter > 0 && change.type === 'E') {
            const itemDef = gameData.qualities[change.qid];
            if (!itemDef) continue;
            
            const slot = itemDef.category?.split(',')[0].trim(); 
            if (!slot) continue;

            const isForce = itemDef.tags?.includes('force_equip');
            const isAuto = itemDef.tags?.includes('auto_equip');

            // Logic: Force equip always overwrites. Auto equip only fills empty.
            if (isForce || (isAuto && !character.equipment[slot])) {
                character.equipment[slot] = change.qid;
            }
        }
        
        if (change.levelAfter <= 0) {
            for (const slot in character.equipment) {
                if (character.equipment[slot] === change.qid) {
                    character.equipment[slot] = null;
                }
            }
        }
    }
}