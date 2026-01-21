import { NextRequest, NextResponse } from 'next/server';
import { verifyWorldAccess } from '@/engine/accessControl';
import clientPromise from '@/engine/database';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { storyId, type, scope, oldId, newId, mode } = body; 

        if (!storyId || !oldId || !newId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        if (!await verifyWorldAccess(storyId, 'writer')) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const safeOld = escapeRegExp(oldId);
        
        let regex: RegExp;
        if (type === 'quality') {
            regex = new RegExp(`(\\$|\\{|\\b)(${safeOld})\\b`, 'g');
        } else {
            regex = new RegExp(`\\b(${safeOld})\\b`, 'g');
        }

        const results: any[] = [];
        let totalOccurrences = 0;

        const getSnippet = (text: string, matchIndex: number, matchLength: number) => {
            const start = Math.max(0, matchIndex - 20);
            const end = Math.min(text.length, matchIndex + matchLength + 30);
            return (start > 0 ? "..." : "") + text.substring(start, end) + (end < text.length ? "..." : "");
        };
        const scanAndReplace = (obj: any, path: string = ""): { modified: boolean, count: number, newObj: any, details: any[] } => {
            let localCount = 0;
            let modified = false;
            let details: any[] = [];

            if (typeof obj === 'string') {
                const matches = Array.from(obj.matchAll(regex));
                if (matches.length > 0) {
                    localCount = matches.length;
                    modified = true;
                    
                    matches.forEach(m => {
                        if (m.index !== undefined) {
                            details.push({
                                path: path || "root",
                                snippet: getSnippet(obj, m.index, m[0].length)
                            });
                        }
                    });

                    const newStr = obj.replace(regex, (match, prefix) => {
                         return match.replace(oldId, newId);
                    });

                    return { modified, count: localCount, newObj: newStr, details };
                }
                return { modified: false, count: 0, newObj: obj, details: [] };
            } 
            else if (Array.isArray(obj)) {
                const newArr = obj.map((item, idx) => {
                    const res = scanAndReplace(item, `${path}[${idx}]`);
                    if (res.modified) {
                        modified = true;
                        localCount += res.count;
                        details = details.concat(res.details);
                        return res.newObj;
                    }
                    return item;
                });
                return { modified, count: localCount, newObj: newArr, details };
            } 
            else if (obj !== null && typeof obj === 'object') {
                const newObj: any = {};
                for (const key in obj) {
                    let newKey = key;
                    if (key === oldId) {
                         newKey = newId;
                         modified = true;
                         localCount++;
                         details.push({ path: `${path}.${key}`, snippet: `(Key Rename) ${key} -> ${newId}` });
                    }

                    const res = scanAndReplace(obj[key], path ? `${path}.${key}` : key);
                    if (res.modified) {
                        modified = true;
                        localCount += res.count;
                        details = details.concat(res.details);
                    }
                    newObj[newKey] = res.newObj;
                }
                return { modified, count: localCount, newObj: newObj, details };
            }

            return { modified: false, count: 0, newObj: obj, details: [] };
        };
        if (scope === 'all' || scope === 'content') {
            const collections = ['storylets', 'opportunities'];
            for (const colName of collections) {
                const cursor = db.collection(colName).find({ worldId: storyId });
                
                while(await cursor.hasNext()) {
                    const doc = await cursor.next();
                    if (!doc) continue;

                    const { _id, id, worldId, ...scannable } = doc;
                    const scanRes = scanAndReplace(scannable);
                    const isIdRename = doc.id === oldId;
                    
                    if (scanRes.modified || isIdRename) {
                        if (isIdRename) {
                            totalOccurrences++;
                            scanRes.details.unshift({ path: "ID", snippet: `${oldId} -> ${newId}` });
                        }
                        totalOccurrences += scanRes.count;

                        results.push({
                            collection: colName,
                            id: doc.id,
                            name: doc.name,
                            matches: scanRes.count + (isIdRename ? 1 : 0),
                            newDoc: { ...scanRes.newObj, id: (isIdRename ? newId : doc.id) },
                            isIdRename,
                            oldDocId: doc.id,
                            matchDetails: scanRes.details
                        });
                    }
                }
            }
        }
        if (scope === 'all' || scope === 'settings') {
            const worldDoc = await db.collection('worlds').findOne({ worldId: storyId });
            if (worldDoc) {
                const content = worldDoc.content || {};
                const scanRes = scanAndReplace(content);

                if (scanRes.modified) {
                    totalOccurrences += scanRes.count;
                    results.push({
                        collection: 'worlds',
                        id: 'World Config',
                        name: 'Global Settings & Definitions',
                        matches: scanRes.count,
                        newContent: scanRes.newObj,
                        matchDetails: scanRes.details
                    });
                }
            }
        }
        if (mode === 'preview') {
            return NextResponse.json({ 
                success: true, 
                found: totalOccurrences, 
                affectedFiles: results.map(r => ({ 
                    collection: r.collection, 
                    id: r.id, 
                    name: r.name, 
                    matches: r.matches,
                    details: r.matchDetails 
                }))
            });
        }

        if (mode === 'execute') {
            for (const item of results) {
                if (item.collection === 'worlds') {
                    await db.collection('worlds').updateOne(
                        { worldId: storyId },
                        { $set: { content: item.newContent } }
                    );
                } else {
                    if (item.isIdRename) {
                        await db.collection(item.collection).deleteOne({ worldId: storyId, id: item.oldDocId });
                        const { _id, ...cleanDoc } = item.newDoc;
                        cleanDoc.worldId = storyId;
                        await db.collection(item.collection).insertOne(cleanDoc);
                    } else {
                        await db.collection(item.collection).updateOne(
                            { worldId: storyId, id: item.id },
                            { $set: item.newDoc }
                        );
                    }
                }
            }
            return NextResponse.json({ success: true, replaced: totalOccurrences });
        }

        return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

    } catch (e: any) {
        console.error("Refactor Error:", e);
        return NextResponse.json({ error: e.message || "Server Error" }, { status: 500 });
    }
}