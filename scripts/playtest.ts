/**
 * playtest.ts — generic step-driven playtest harness.
 *
 * Drives a world through the real HTTP API as a guest character, mirroring
 * GameHub's client flow (client-side autofire selection, visible_if hub
 * filtering, option filtering, guestState round-trip) while the server does
 * all mutation via /api/resolve + /api/travel. No save in the database is
 * touched — guest state lives only in this process.
 *
 * The step chain is WORLD CONTENT and lives in the world's repo — this
 * runner is mechanism only, with no world ids or defaults baked in.
 *
 * Run (dev server must be up):
 *   npx tsx scripts/playtest.ts --steps <world>/tools/<chain>.ts --story <storyId>
 * Options:
 *   --steps <file>    path to the step-chain module (exports STEPS)  [required]
 *   --story <id>      story id to playtest                           [required]
 *   --base <url>      API base URL (default http://localhost:3000)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const argOf = (name: string, dflt?: string) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const argReq = (name: string) => {
    const v = argOf(name);
    if (!v) throw new Error(`missing ${name}`);
    return v;
};


type Step =
    | { do: 'af'; expect: string | null; note?: string }
    | { do: 'current'; expect: string | null; note?: string }
    | { do: 'resolve'; storylet: string; option: string; redirect?: string; loc?: string; note?: string }
    | { do: 'visible'; include?: string[]; exclude?: string[]; note?: string }
    | { do: 'options'; storylet: string; include?: string[]; exclude?: string[] }
    | { do: 'travel'; to: string; status: number; note?: string }
    | { do: 'q'; exact?: Record<string, number>; gte?: Record<string, number>; str?: Record<string, string>; absent?: string[] }
    | {
        do: 'kit';
        source?: { qid: string; level: number; source: string };
        equipped?: { slot: string; itemId: string | null };
        render?: { storylet: string; option: string; contains: string };
        gate?: { card: string; open: boolean };
        hasOption?: { card: string; optionId: string };
        note?: string;
    }
    | { do: 'log'; msg: string | (() => string) };


// The step chain is imported at runtime so each world repo owns its own chain.
const STEPS_PATH = argReq('--steps');
const STORY = argReq('--story');

async function main() {
    // Engine imports need env; load .env.local before any engine module.
    const envPath = resolve(__dirname, '../.env.local');
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }

    // contentCache/getStorylets wrap unstable_cache, which needs a Next request
    // context — load content through the raw loaders + Mongo instead.
    const { loadGameData } = await import('../src/engine/dataLoader');
    const { getWorldState } = await import('../src/engine/worldService');
    const { GameEngine } = await import('../src/engine/gameEngine');
    const { findEligibleAutofire } = await import('../src/utils/autofire');
    const clientPromise = (await import('../src/engine/database')).default;

    const stepsMod = await import(pathToFileURL(resolve(STEPS_PATH)).href);
    const STEPS: Step[] = stepsMod.STEPS;

    const BASE = argOf('--base', 'http://localhost:3000');

    const gameData: any = await loadGameData(STORY);
    if (!gameData) throw new Error(`story not found: ${STORY}`);
    const db = (await clientPromise).db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');
    const allContent: any[] = [
        ...(await db.collection('storylets').find({ worldId: STORY }).toArray()),
        ...(await db.collection('opportunities').find({ worldId: STORY }).toArray()),
    ];
    const worldState: any = await getWorldState(STORY);
    const storyletDefs: Record<string, any> = {};
    for (const s of allContent) storyletDefs[s.id] = s;

    let char: any = null;
    let failures = 0;
    const fail = (msg: string) => { failures++; console.log(`  FAIL  ${msg}`); };
    const ok = (msg: string) => console.log(`  ok    ${msg}`);

    const clientEngine = () => new GameEngine(
        char.qualities,
        { ...gameData, qualities: { ...gameData.qualities, ...(char.dynamicQualities || {}) } },
        char.equipment || {},
        worldState
    );

    const eligibleAutofire = () => {
        const eng = clientEngine();
        const hit = findEligibleAutofire(eng, storyletDefs, char.currentLocationId);
        return hit ? hit.id : null;
    };

    const visibleHubIds = () => {
        const eng = clientEngine();
        return Object.values(storyletDefs)
            .filter((s: any) => !('deck' in s))
            .filter((s: any) => {
                const locs = s.location?.split(',').map((l: string) => l.trim()).filter(Boolean) || [];
                if (locs.length > 0 && !locs.includes(char.currentLocationId)) return false;
                return eng.evaluateCondition(s.visible_if);
            })
            .map((s: any) => s.id);
    };

    const visibleOptionIds = (storyletId: string) => {
        const eng = clientEngine();
        const def = storyletDefs[storyletId];
        if (!def) return [];
        return def.options
            .filter((o: any) => eng.evaluateCondition(o.visible_if))
            .map((o: any) => o.id);
    };

    const post = async (url: string, body: any) => {
        const res = await fetch(`${BASE}${url}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return { status: res.status, data: await res.json().catch(() => ({})) };
    };

    const qLevel = (qid: string) => {
        const v = char.qualities?.[qid];
        if (v === undefined || v === null) return undefined;
        return typeof v === 'number' ? v : v.level;
    };
    const qString = (qid: string) => {
        const v = char.qualities?.[qid];
        if (v === undefined || v === null) return undefined;
        return typeof v === 'string' ? v : v.stringValue;
    };

    // ---- bootstrap: fresh guest character (never persisted) ----
    const created = await post('/api/character/create', {
        storyId: STORY,
        choices: {
            player_name: 'Codetest',
            starting_tool: 'recorder',
            player_portrait: 'portrait_medium_desk',
            mirror_sound: 'rain',
            mirror_fire: 'people',
            mirror_ritual: 'coffee',
            mirror_type: 'either',
        },
    });
    if (created.status !== 200 || !created.data?.success) {
        console.error('character create failed:', created.status, JSON.stringify(created.data).slice(0, 400));
        process.exit(1);
    }
    char = created.data.character;
    console.log(`guest ${char.characterId} @ ${char.currentLocationId}`);

    // Starting-state sanity: economy seeded, evening gate (mirror_done) unseeded.
    {
        const seeds: Array<[string, any, any]> = [
            ['actions', 20, qLevel('actions')],
            ['cash', 20, qLevel('cash')],
            ['meals', 2, qLevel('meals')],
            ['nerve', 5, qLevel('nerve')],
            ['acuity', 3, qLevel('acuity')],
        ];
        for (const [name, want, got] of seeds) {
            want === got ? ok(`seed ${name}=${got}`) : fail(`seed ${name}: want ${want} got ${got}`);
        }
        const md = qLevel('mirror_done') ?? 0;
        md === 0 ? ok('mirror_done unseeded (evening gate alive)') : fail(`mirror_done seeded to ${md} — evening_reflection would be dead`);
        if (char.currentStoryletId) fail(`fresh char has currentStoryletId=${char.currentStoryletId}`);
    }

    // ---- scenario ----
    let n = 0;
    for (const step of STEPS) {
        n++;
        const tag = `[${String(n).padStart(2, '0')}] ${step.do}${'note' in step && step.note ? ` — ${step.note}` : ''}`;

        if (step.do === 'log') {
            console.log(`${tag}\n      loc=${char.currentLocationId} cash=${qLevel('cash')} actions=${qLevel('actions')}${'msg' in step && step.msg ? `\n      ${typeof step.msg === 'function' ? step.msg() : step.msg}` : ''}`);
            continue;
        }

        if (step.do === 'af') {
            const got = eligibleAutofire();
            got === step.expect ? ok(`${tag} = ${got}`) : fail(`${tag}: want ${step.expect} got ${got}`);
            continue;
        }

        if (step.do === 'current') {
            const got = char.currentStoryletId || null;
            got === step.expect ? ok(`${tag} = ${got}`) : fail(`${tag}: want ${step.expect} got ${got}`);
            continue;
        }

        if (step.do === 'visible') {
            const ids = visibleHubIds();
            const missing = (step.include || []).filter(id => !ids.includes(id));
            const leaked = (step.exclude || []).filter(id => ids.includes(id));
            if (missing.length || leaked.length) {
                fail(`${tag}: missing=[${missing}] leaked=[${leaked}]`);
            } else {
                ok(`${tag} (${ids.length} visible)`);
            }
            continue;
        }

        if (step.do === 'options') {
            const ids = visibleOptionIds(step.storylet);
            const missing = (step.include || []).filter(id => !ids.includes(id));
            const leaked = (step.exclude || []).filter(id => ids.includes(id));
            if (missing.length || leaked.length) fail(`${tag}: missing=[${missing}] leaked=[${leaked}]`);
            else ok(`${tag} = [${ids.join(', ')}]`);
            continue;
        }

        if (step.do === 'travel') {
            const { status, data } = await post('/api/travel', {
                storyId: STORY, targetLocationId: step.to, characterId: char.characterId, guestState: char,
            });
            if (status !== step.status) {
                fail(`${tag}: want HTTP ${step.status} got ${status} (${data.error || 'no error'})`);
            } else {
                if (status === 200) char.currentLocationId = data.currentLocationId;
                ok(`${tag} -> ${status}${status === 200 ? '' : ` (${data.error})`}`);
            }
            continue;
        }

        if (step.do === 'q') {
            for (const [qid, want] of Object.entries(step.exact || {})) {
                const got = qLevel(qid);
                got === want ? ok(`q ${qid}=${got}`) : fail(`q ${qid}: want ${want} got ${got}`);
            }
            for (const [qid, want] of Object.entries(step.gte || {})) {
                const got = qLevel(qid) ?? -1;
                got >= want ? ok(`q ${qid}=${got} >= ${want}`) : fail(`q ${qid}: want >= ${want} got ${got}`);
            }
            for (const [qid, want] of Object.entries(step.str || {})) {
                const got = qString(qid);
                got === want ? ok(`q ${qid}="${got}"`) : fail(`q ${qid}: want "${want}" got "${got}"`);
            }
            for (const qid of step.absent || []) {
                const got = qLevel(qid);
                (got === undefined || got === 0) ? ok(`q ${qid} absent`) : fail(`q ${qid}: want absent got ${got}`);
            }
            continue;
        }

        if (step.do === 'kit') {
            let bad = false;
            if (step.source) {
                const { qid, level, source } = step.source;
                const st: any = char.qualities?.[qid];
                const gotLevel = st?.level;
                const gotSrc = st?.sources?.[0];
                if (gotLevel !== level) { fail(`${tag}: ${qid} level want ${level} got ${gotLevel}`); bad = true; }
                if (gotSrc !== source) { fail(`${tag}: ${qid} source want "${source}" got "${gotSrc}"`); bad = true; }
            }
            if (step.equipped !== undefined) {
                const { slot, itemId } = step.equipped!;
                const got = (char.equipment || {})[slot] ?? null;
                if (got !== itemId) { fail(`${tag}: equipment[${slot}] want ${itemId} got ${got}`); bad = true; }
            }
            if (step.render) {
                const def: any = storyletDefs[step.render.storylet];
                const opt = def?.options?.find((o: any) => o.id === step.render!.option);
                if (!opt) { fail(`${tag}: render def missing ${step.render.storylet}/${step.render.option}`); bad = true; }
                else {
                    const rendered = clientEngine().evaluateText(opt.pass_long);
                    if (!rendered.includes(step.render.contains)) {
                        fail(`${tag}: rendered use event lacks "${step.render.contains}" — got: ${rendered.slice(-120)}`);
                        bad = true;
                    }
                }
            }
            if (step.gate) {
                const card: any = storyletDefs[step.gate.card];
                if (!card) { fail(`${tag}: card def missing ${step.gate.card}`); bad = true; }
                else {
                    const open = clientEngine().evaluateCondition(card.draw_condition);
                    if (open !== step.gate.open) { fail(`${tag}: ${step.gate.card} draw gate want ${step.gate.open} got ${open}`); bad = true; }
                }
            }
            if (step.hasOption) {
                const card: any = storyletDefs[step.hasOption.card];
                const ids: string[] = (card?.options || []).map((o: any) => o.id);
                if (!ids.includes(step.hasOption.optionId)) {
                    fail(`${tag}: ${step.hasOption.card} lacks option ${step.hasOption.optionId}`); bad = true;
                }
            }
            if (!bad) ok(`${tag}`);
            continue;
        }

        if (step.do === 'resolve') {
            // The server locks the player into a higher-urgency autofire (409);
            // surface it as a scenario failure with the culprit id.
            const af = eligibleAutofire();
            if (af && af !== step.storylet) {
                fail(`${tag}: unexpected autofire ${af} would lock this resolve`);
                continue;
            }
            const { status, data } = await post('/api/resolve', {
                storyId: STORY, storyletId: step.storylet, optionId: step.option,
                characterId: char.characterId, guestState: char,
            });
            if (status === 409) {
                fail(`${tag}: 409 locked by ${data.redirectId}`);
                continue;
            }
            if (status !== 200 || data.error) {
                fail(`${tag}: HTTP ${status} ${data.error || JSON.stringify(data).slice(0, 200)}`);
                continue;
            }
            // Merge exactly as GameHub's handleEventFinish does.
            char.qualities = data.newQualities;
            if (data.newDefinitions) char.dynamicQualities = { ...(char.dynamicQualities || {}), ...data.newDefinitions };
            if (data.equipment) char.equipment = data.equipment;
            if (data.updatedHand) char.opportunityHands = data.updatedHand;
            if (data.currentLocationId) char.currentLocationId = data.currentLocationId;
            const redirect = data.result?.redirectId || '';
            char.currentStoryletId = redirect;

            let bad = false;
            if (step.redirect !== undefined && redirect !== step.redirect) {
                fail(`${tag}: redirect want "${step.redirect}" got "${redirect}"`); bad = true;
            }
            if (step.loc && char.currentLocationId !== step.loc) {
                fail(`${tag}: loc want ${step.loc} got ${char.currentLocationId}`); bad = true;
            }
            if (typeof data.result?.body !== 'string' || !data.result.body.trim()) {
                fail(`${tag}: empty resolution body`); bad = true;
            }
            if (!bad) ok(`${tag} -> redirect=${redirect || 'none'} loc=${char.currentLocationId}`);
            continue;
        }
    }

    console.log(failures ? `\nPLAYTEST FAILED — ${failures} failure(s)` : '\nPLAYTEST PASSED — opening chain clean end-to-end');
    process.exit(failures ? 1 : 0);
}

main().catch(err => { console.error('DRIVER ERROR:', err); process.exit(2); });
