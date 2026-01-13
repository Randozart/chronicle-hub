// import { NextRequest, NextResponse } from 'next/server';
// import clientPromise from '@/engine/database';
// import { Storylet, QualityDefinition, Opportunity, MarketDefinition, CharCreateRule } from '@/engine/models';
// import { verifyWorldAccess } from '@/engine/accessControl';

// const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

// type ConnectionRole = 'provider' | 'dependent' | 'direct' | 'mutual';
// type ConnectionType = 'storylet' | 'opportunity' | 'quality' | 'market' | 'system';

// interface ConnectedItem {
//     id: string;
//     name: string;
//     type: ConnectionType;
//     role: ConnectionRole;
//     details: string; // "Modifies (+1)", "Required (>5)", "Redirects here"
// }

// interface ConnectionGroup {
//     id: string;
//     label: string;
//     items: ConnectedItem[];
// }

// // === REGEX HELPERS ===
// function escapeRegExp(string: string) {
//     return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// }

// /**
//  * Analyzes how an entity interacts with a specific Quality ID.
//  * Returns the role (provider/dependent) and a description.
//  */
// function analyzeQualityInteraction(entity: any, qualityId: string): { role: ConnectionRole | null, details: string } {
//     const json = JSON.stringify(entity);
//     const lowerJson = json.toLowerCase();
//     const cleanQ = qualityId.toLowerCase();

//     if (!lowerJson.includes(cleanQ)) return { role: null, details: '' };

//     // Regex compilation
//     // 1. Assignment/Change: $quality += 1, $quality = 5
//     const assignRegex = new RegExp(`\\$${escapeRegExp(qualityId)}\\s*(=|\\+=|-=)`, 'i');
//     // 2. Increment/Decrement: $quality++, $quality--
//     const incRegex = new RegExp(`\\$${escapeRegExp(qualityId)}\\s*(\\+\\+|--)`, 'i');
    
//     // Check for Modification
//     const assignMatch = json.match(assignRegex);
//     const incMatch = json.match(incRegex);

//     if (assignMatch || incMatch) {
//         let op = assignMatch ? assignMatch[1] : (incMatch ? incMatch[1] : 'modifies');
//         return { role: 'provider', details: `Modifies (${op})` };
//     }

//     // Check for Requirement/Gate
//     // Scan standard logic fields
//     const logicFields = [entity.visible_if, entity.unlock_if, entity.draw_condition].filter(Boolean).join(' ');
//     // Scan options
//     const optionLogic = entity.options?.map((o: any) => 
//         (o.visible_if || '') + (o.unlock_if || '') + (o.challenge || '')
//     ).join(' ') || '';

//     const fullLogic = (logicFields + optionLogic).toLowerCase();

//     if (fullLogic.includes(cleanQ)) {
//         return { role: 'dependent', details: 'Logic Requirement' };
//     }

//     // Text Reference
//     return { role: 'dependent', details: 'Referenced in Text' };
// }

// export async function GET(request: NextRequest) {
//     const { searchParams } = new URL(request.url);
//     const storyId = searchParams.get('storyId');
//     const targetId = searchParams.get('id');

//     if (!storyId || !targetId) {
//         return NextResponse.json({ error: 'Missing params' }, { status: 400 });
//     }

//     // 1. Auth
//     const canView = await verifyWorldAccess(storyId, 'writer');
//     if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

//     const client = await clientPromise;
//     const db = client.db(DB_NAME);

//     // 2. Fetch Data
//     const [storylets, opportunities, qualities, markets, worldDoc] = await Promise.all([
//         db.collection<Storylet>('storylets').find({ worldId: storyId }).toArray(),
//         db.collection<Opportunity>('opportunities').find({ worldId: storyId }).toArray(),
//         db.collection<QualityDefinition>('qualities').find({ worldId: storyId }).toArray(),
//         db.collection<MarketDefinition>('markets').find({ worldId: storyId }).toArray(),
//         db.collection('worlds').findOne({ worldId: storyId })
//     ]);

//     const charCreate = (worldDoc?.content?.char_create || {}) as Record<string, CharCreateRule>;
//     const allEntities = [...storylets, ...opportunities, ...markets]; // Qualities treated separately for bridging
//     const targetEntity = 
//         storylets.find(s => s.id === targetId) || 
//         opportunities.find(o => o.id === targetId) || 
//         qualities.find(q => q.id === targetId) ||
//         markets.find(m => m.id === targetId);

//     if (!targetEntity) return NextResponse.json({ groups: [] });

//     const groups: ConnectionGroup[] = [];
    
//     // Helper to add items to groups
//     const addToGroup = (groupId: string, label: string, item: ConnectedItem) => {
//         let group = groups.find(g => g.id === groupId);
//         if (!group) {
//             group = { id: groupId, label, items: [] };
//             groups.push(group);
//         }
//         if (!group.items.some(i => i.id === item.id)) {
//             group.items.push(item);
//         }
//     };

//     // ==========================================================
//     // PHASE 1: DIRECT CONNECTIONS (Links, Redirects)
//     // ==========================================================
    
//     const targetJson = JSON.stringify(targetEntity).toLowerCase();
//     const cleanTargetId = targetId.toLowerCase();

//     // 1.1 Inbound Direct (Who points to Target?)
//     allEntities.forEach(entity => {
//         if (entity.id === targetId) return;
//         const eJson = JSON.stringify(entity).toLowerCase();
        
//         // Check for specific redirect keys first for accuracy
//         if (eJson.includes(`"${cleanTargetId}"`) || eJson.includes(`'${cleanTargetId}'`)) {
//             let details = "Referenced";
            
//             // Refine Details
//             if ((entity as any).options?.some((o: any) => o.pass_redirect === targetId || o.fail_redirect === targetId)) {
//                 details = "Redirects Here";
//             } else if ((entity as any).return === targetId) {
//                 details = "Returns Here";
//             } else if ((entity as any).deck === targetId) {
//                 details = "In Deck";
//             }

//             addToGroup('direct_in', 'Referenced By (Inbound)', {
//                 id: entity.id,
//                 name: entity.name || entity.id,
//                 type: (entity as any).deck ? 'opportunity' : (entity as any).stalls ? 'market' : 'storylet',
//                 role: 'direct',
//                 details
//             });
//         }
//     });

//     // 1.2 Outbound Direct (Who does Target point to?)
//     // Scan Target for other IDs
//     allEntities.forEach(entity => {
//         if (entity.id === targetId) return;
//         if (targetJson.includes(entity.id.toLowerCase())) {
//             let details = "Referenced";
            
//             if ((targetEntity as any).options?.some((o: any) => o.pass_redirect === entity.id || o.fail_redirect === entity.id)) {
//                 details = "Redirects To";
//             } else if ((targetEntity as any).deck === entity.id) {
//                 details = "Belongs to Deck";
//             }

//             addToGroup('direct_out', 'Direct Links (Outbound)', {
//                 id: entity.id,
//                 name: entity.name || entity.id,
//                 type: (entity as any).deck ? 'opportunity' : (entity as any).stalls ? 'market' : 'storylet',
//                 role: 'direct',
//                 details
//             });
//         }
//     });

//     // ==========================================================
//     // PHASE 2: STATE DEPENDENCY (Qualities)
//     // ==========================================================

//     // If Target is a QUALITY, show Providers and Dependents
//     if ('type' in targetEntity && !('options' in targetEntity)) {
//         // Target is Quality
//         allEntities.forEach(entity => {
//             const analysis = analyzeQualityInteraction(entity, targetId);
//             if (analysis.role) {
//                 const groupKey = analysis.role === 'provider' ? 'q_providers' : 'q_dependents';
//                 const groupLabel = analysis.role === 'provider' ? 'Modified By (Providers)' : 'Used By (Dependents)';
                
//                 addToGroup(groupKey, groupLabel, {
//                     id: entity.id,
//                     name: entity.name || entity.id,
//                     type: (entity as any).deck ? 'opportunity' : (entity as any).stalls ? 'market' : 'storylet',
//                     role: analysis.role,
//                     details: analysis.details
//                 });
//             }
//         });
//     } 
//     // If Target is STORYLET/OPPORTUNITY, find "Bridge" Qualities
//     else {
//         // 1. Extract Qualities involved in this Target
//         const involvedQualities: { id: string, name: string, myRole: ConnectionRole }[] = [];
        
//         qualities.forEach(q => {
//             const analysis = analyzeQualityInteraction(targetEntity, q.id);
//             if (analysis.role) {
//                 involvedQualities.push({ id: q.id, name: q.name || q.id, myRole: analysis.role });
                
//                 // Also add the quality itself to a list
//                 addToGroup('touched_qualities', 'Qualities Used', {
//                     id: q.id,
//                     name: q.name || q.id,
//                     type: 'quality',
//                     role: analysis.role === 'provider' ? 'provider' : 'dependent', // relative to storylet
//                     details: analysis.details
//                 });
//             }
//         });

//         // 2. Find 2nd Degree Connections (Other entities sharing these qualities)
//         // We limit this to prevent massive spam. We only show complementary relationships.
//         // If Target Modifies Q -> Show who Requires Q.
//         // If Target Requires Q -> Show who Modifies Q.
        
//         for (const q of involvedQualities) {
//             // Find complement
//             const neededRole = q.myRole === 'provider' ? 'dependent' : 'provider';
            
//             allEntities.forEach(entity => {
//                 if (entity.id === targetId) return;
                
//                 const otherAnalysis = analyzeQualityInteraction(entity, q.id);
                
//                 if (otherAnalysis.role === neededRole) {
//                     // We found a meaningful connection!
//                     const direction = q.myRole === 'provider' ? 'Enables / Triggers' : 'Enabled By / Requires';
//                     const groupLabel = `${direction} (via ${q.name})`;
                    
//                     addToGroup(`bridge_${q.id}`, groupLabel, {
//                         id: entity.id,
//                         name: entity.name || entity.id,
//                         type: (entity as any).deck ? 'opportunity' : 'storylet',
//                         role: neededRole,
//                         details: otherAnalysis.details
//                     });
//                 }
//             });
//         }
//     }

//     // Sort groups for better UX
//     // Priority: Direct In, Direct Out, Qualities, Bridges
//     const sortOrder = ['direct_in', 'direct_out', 'touched_qualities', 'q_providers', 'q_dependents'];
//     groups.sort((a, b) => {
//         const ia = sortOrder.indexOf(a.id);
//         const ib = sortOrder.indexOf(b.id);
//         if (ia > -1 && ib > -1) return ia - ib;
//         if (ia > -1) return -1;
//         if (ib > -1) return 1;
//         return a.label.localeCompare(b.label);
//     });

//     return NextResponse.json({ groups });
// }