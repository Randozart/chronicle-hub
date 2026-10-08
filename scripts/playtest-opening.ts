/**
 * playtest-opening.ts — automated end-to-end playtest of the neon_medium
 * opening chain, driven through the real HTTP API as a guest character.
 *
 * Mirrors GameHub's client flow exactly (client-side autofire selection,
 * visible_if hub filtering, option filtering, guestState round-trip) while
 * the server does all mutation via /api/resolve + /api/travel. No save in
 * the database is touched — guest state lives only in this process.
 *
 * Run (dev server must be up):
 *   npx tsx scripts/playtest-opening.ts
 * Options:
 *   --base http://localhost:3000   API base URL
 *   --story neon_medium            story id
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const argOf = (name: string, dflt: string) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};

type Step =
    | { do: 'af'; expect: string | null; note?: string }
    | { do: 'current'; expect: string | null; note?: string }
    | { do: 'resolve'; storylet: string; option: string; redirect?: string; loc?: string; note?: string }
    | { do: 'visible'; include?: string[]; exclude?: string[]; note?: string }
    | { do: 'options'; storylet: string; include?: string[]; exclude?: string[] }
    | { do: 'travel'; to: string; status: number; note?: string }
    | { do: 'q'; exact?: Record<string, number>; gte?: Record<string, number>; str?: Record<string, string>; absent?: string[] }
    | { do: 'log'; msg: string };

const STEPS: Step[] = [
    // --- Prologue: forced autofire chain (epitaph -> mirror form -> wake) ---
    { do: 'af', expect: 'the_epitaph', note: 'fresh char: epitaph is the only eligible autofire' },
    { do: 'resolve', storylet: 'the_epitaph', option: 'epitaph_arrive', redirect: 'mirror_q1_sound' },
    { do: 'af', expect: null, note: 'epitaph retired after intro_epitaph=1' },
    { do: 'current', expect: 'mirror_q1_sound' },
    { do: 'options', storylet: 'mirror_q1_sound', include: ['q1_rain', 'q1_voice', 'q1_trains'] },
    { do: 'resolve', storylet: 'mirror_q1_sound', option: 'q1_rain', redirect: 'mirror_q2_fire' },
    { do: 'resolve', storylet: 'mirror_q2_fire', option: 'q2_papers', redirect: 'mirror_q3_ritual' },
    { do: 'resolve', storylet: 'mirror_q3_ritual', option: 'q3_coffee', redirect: 'mirror_q4_type' },
    { do: 'resolve', storylet: 'mirror_q4_type', option: 'q4_either', redirect: 'mirror_close' },
    { do: 'resolve', storylet: 'mirror_close', option: 'mirror_close_done', redirect: 'intro_wake' },
    { do: 'current', expect: 'intro_wake' },
    {
        do: 'options', storylet: 'intro_wake',
        include: ['intro_take_recorder'], exclude: ['intro_take_emf', 'intro_take_salt'],
    },
    // A1 cleared the take_* redirects: wake resolves into the hub, no forced march.
    { do: 'resolve', storylet: 'intro_wake', option: 'intro_take_recorder' },
    { do: 'current', expect: null, note: 'no redirect: player lands in the hub' },
    { do: 'af', expect: null, note: 'no autofire grabs the fresh hub' },

    // --- Hub: what shows (and what must not) ---
    {
        do: 'visible',
        include: ['office_main', 'the_reading_1'],
        exclude: ['case_marlow_open', 'case_marlow_file', 'life_admin', 'evening_reflection', 'the_reading_2', 'the_reading_3'],
        note: 'hub after wake: ledger chain + office only',
    },
    // Location locks (A4): none of the map opens before the case does.
    { do: 'travel', to: 'docks', status: 403 },
    { do: 'travel', to: 'old_station', status: 403 },
    { do: 'travel', to: 'highrise', status: 403 },
    { do: 'travel', to: 'rainline', status: 403 },
    { do: 'travel', to: 'ossuary', status: 403 },
    { do: 'travel', to: 'inner_world', status: 403 },
    {
        do: 'options', storylet: 'office_main',
        include: ['office_window', 'office_kettle', 'office_reflect_low', 'office_board'],
        exclude: ['office_reflect_mid', 'office_reflect_deep'],
    },
    // Mundanity ladder still closed (kettle x3 -> 6 < 10).
    { do: 'resolve', storylet: 'office_main', option: 'office_kettle' },
    { do: 'resolve', storylet: 'office_main', option: 'office_kettle' },
    { do: 'resolve', storylet: 'office_main', option: 'office_kettle' },
    { do: 'visible', exclude: ['the_reading_2'], note: 'mundanity 6 < 10: reading_2 stays shut' },

    // --- Ledger -> Marlow appears (A2 chain) ---
    { do: 'resolve', storylet: 'the_reading_1', option: 'reading_1_read' },
    {
        do: 'visible',
        include: ['case_marlow_open', 'life_admin'],
        exclude: ['case_marlow_file', 'case_marlow_close', 'evening_reflection'],
        note: 'reading done: Marlow + rent chains appear, case itself does not',
    },
    { do: 'resolve', storylet: 'case_marlow_open', option: 'marlow_accept', redirect: 'office_main' },
    { do: 'visible', include: ['case_marlow_file'], exclude: ['case_marlow_open'], note: 'accepted: file chain swaps in' },

    // --- Docks leg (unlock: case_marlow >= 1) ---
    { do: 'resolve', storylet: 'case_marlow_file', option: 'marlow_go_docks', loc: 'docks' },
    { do: 'af', expect: null, note: 'no autofire at the docks' },
    {
        do: 'visible',
        include: ['docks_hub', 'case_marlow_docks_1'],
        exclude: ['case_marlow_docks_2'],
        note: 'manifest step first, witness second',
    },
    { do: 'travel', to: 'rainline', status: 403, },
    { do: 'travel', to: 'old_station', status: 403 },
    { do: 'resolve', storylet: 'case_marlow_docks_1', option: 'marlow_take_manifest' },
    { do: 'visible', include: ['case_marlow_docks_2'] },
    { do: 'resolve', storylet: 'case_marlow_docks_2', option: 'marlow_press_orrin' },

    // --- Old station (unlock: manifest >= 1) ---
    { do: 'travel', to: 'old_station', status: 200 },
    { do: 'visible', include: ['case_marlow_station'] },
    { do: 'resolve', storylet: 'case_marlow_station', option: 'marlow_trace_signature' },

    // --- Highrise (unlock: watchman + signature) ---
    { do: 'travel', to: 'highrise', status: 200 },
    { do: 'visible', include: ['case_marlow_confront'] },
    { do: 'resolve', storylet: 'case_marlow_confront', option: 'marlow_confront_salt', note: 'guaranteed-pass branch (no challenge)' },

    // --- Close at the office: city + evening still sealed until cases_closed ---
    { do: 'travel', to: 'office', status: 200 },
    { do: 'visible', include: ['case_marlow_close'], exclude: ['evening_reflection'], note: 'case not closed yet: evening stays deferred' },
    { do: 'resolve', storylet: 'case_marlow_close', option: 'marlow_close_plain' },
    {
        do: 'visible',
        include: ['evening_reflection'],
        note: 'cases_closed=1: the morning-mirror payoff finally opens',
    },

    // --- Deferred payoff, then the year signs before the city opens ---
    { do: 'resolve', storylet: 'evening_reflection', option: 'ref_sound' },
    { do: 'visible', exclude: ['evening_reflection'], note: 'mirror_done=1: one shot, no loop' },
    { do: 'visible', include: ['life_admin'], note: 'the year\'s paperwork arrives (intro + reading_1 done)' },
    { do: 'travel', to: 'rainline', status: 403, note: 'city sealed until the lease is signed' },
    { do: 'resolve', storylet: 'life_admin', option: 'life_admin_sign' },
    { do: 'visible', include: ['the_rounds'], note: 'gig board opens once the year bills (board lives at the office)' },
    { do: 'travel', to: 'rainline', status: 200 },
    { do: 'visible', include: ['rainline_hub'], note: 'city hubs open once the year bills' },
    { do: 'travel', to: 'ossuary', status: 200 },
    { do: 'travel', to: 'inner_world', status: 403, note: 'inner_world still needs mundanity 30' },

    // --- Final ledger ---
    {
        do: 'q',
        exact: { intro_done: 1, intro_epitaph: 1, reading_1_done: 1, case_marlow: 3, cases_closed: 1, mirror_done: 1, cases_open: 0, rent_set: 1 },
        gte: { cash: 70, actions: 1, nerve: 5 },
        str: { starting_tool: 'recorder' },
        absent: ['flubbed_cases'],
    },
    { do: 'log', msg: 'opening chain complete' },
];

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

    const BASE = argOf('--base', 'http://localhost:3000');
    const STORY = argOf('--story', 'neon_medium');

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
            console.log(`${tag}\n      loc=${char.currentLocationId} cash=${qLevel('cash')} actions=${qLevel('actions')}`);
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
