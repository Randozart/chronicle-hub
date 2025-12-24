import * as Tone from 'tone';
import { InstrumentDefinition } from './models';
import { Note } from 'tonal';
import { PolySampler } from './polySampler';
import { AudioGraph } from './graph'; // Import the graph
import { createInsertEffects, createFilter, createEQ } from './effects'; // Import helpers

export type AnySoundSource = (Tone.PolySynth | PolySampler | Tone.MonoSynth) & { 
    _panner?: Tone.Panner; 
    _outputNode?: Tone.ToneAudioNode;
    _filterNode?: Tone.Filter; 
    _embellishments?: { player: Tone.Player, probability: number, volumeOffset: number }[];
    // Track Sends so we can dispose them
    _sends?: Tone.Gain[]; 
};

const instrumentCache: Record<string, {
    source: AnySoundSource;
    panner: Tone.Panner;
    effects: Tone.ToneAudioNode[];
    lfos: Tone.LFO[];
    embellishments: Tone.Player[];
    sends: Tone.Gain[];
}> = {};

function getCacheKey(def: InstrumentDefinition): string {
    return JSON.stringify({
        id: def.id,
        config: def.config, 
        overrides: def.config.overrides,
    });
}

export async function getOrMakeInstrument(def: InstrumentDefinition): Promise<AnySoundSource> {
    const cacheKey = getCacheKey(def);
    
    // ... (Cache check logic remains same, but dispose of sends too) ...
    const oldEntry = Object.entries(instrumentCache).find(([key]) => JSON.parse(key).id === def.id);
    if (oldEntry) {
        const [key, graph] = oldEntry;
        if (key === cacheKey) return graph.source;
        
        graph.lfos.forEach(l => l.dispose());
        graph.effects.forEach(e => e.dispose());
        graph.embellishments.forEach(e => e.dispose());
        graph.sends.forEach(s => s.dispose()); // Dispose sends
        graph.panner.dispose();
        graph.source.dispose();
        delete instrumentCache[key];
    }

    const config = def.config;
    let sourceInst: AnySoundSource;
    const targetPolyphony = (config.noteCut || (config.portamento && config.portamento > 0)) ? 1 : (config.polyphony || 32);

    // --- 1. Create Source (Same as before) ---
    if (def.type === 'sampler' && config.urls) {
        sourceInst = new PolySampler({
            urls: config.urls,
            baseUrl: config.baseUrl || "",
            envelope: config.envelope,
            volume: config.volume,
            polyphony: targetPolyphony,
            loop: config.loop?.enabled,
            loopStart: config.loop?.start,
            loopEnd: config.loop?.end,
            portamento: config.portamento,
            noteCutBleed: config.noteCutBleed,
            vibrato: config.vibrato
        });
    } else {
        // ... (Synth creation logic same as before, omitted for brevity) ...
        // (Just ensure to copy the Synth creation block from previous version)
        const envelope = {
            attack: config.envelope?.attack ?? 0.01,
            decay: config.envelope?.decay ?? 0.1,
            sustain: config.envelope?.sustain ?? 0.5,
            release: config.envelope?.release ?? 1
        };
        const oscType = config.oscillator?.type || 'triangle';
        let SynthClass: any = Tone.Synth;
        if (oscType.startsWith('fm')) SynthClass = Tone.FMSynth;
        if (oscType.startsWith('am')) SynthClass = Tone.AMSynth;

        if (config.portamento && config.portamento > 0) {
            const monoSynth = new SynthClass({
                oscillator: { type: oscType as any, ...config.oscillator },
                envelope: envelope,
                portamento: config.portamento
            }) as Tone.MonoSynth;
            sourceInst = monoSynth;
        } else {
            const polySynth = new Tone.PolySynth(SynthClass, {
                oscillator: { type: oscType as any, ...config.oscillator },
                envelope: envelope,
            } as any) as Tone.PolySynth;
            polySynth.maxPolyphony = Math.min(targetPolyphony, 24);
            sourceInst = polySynth;
        }
    }

    sourceInst.disconnect(); 
    sourceInst.volume.value = config.volume || -10;

    // --- 2. Build Effects Chain (Refactored) ---
    const activeEffects: Tone.ToneAudioNode[] = [];
    const chain: Tone.ToneAudioNode[] = [];
    const sends: Tone.Gain[] = [];
    const c = config as any; 

    // A. Inserts (Distortion, Bitcrush)
    const inserts = createInsertEffects(config);
    inserts.forEach(eff => {
        activeEffects.push(eff);
        chain.push(eff);
    });

    // B. Tone Shaping
    const filter = createFilter(config.filter);
    if (filter) {
        activeEffects.push(filter);
        chain.push(filter);
        (sourceInst as any)._filterNode = filter; // Expose for modulation
    }

    const eq = createEQ(config.eq);
    if (eq) {
        activeEffects.push(eq);
        chain.push(eq);
    }

    // C. Global Sends (Reverb / Delay)
    // Instead of creating Reverb, we create a Gain Node and connect to AudioGraph
    
    // Send 1: Delay
    if (c.delay && c.delay > 0) {
        const sendAmt = c.delay / 100; // 0-1
        const sendGain = new Tone.Gain(sendAmt);
        sends.push(sendGain);
        
        // Signal flows from END of chain (so far) into this Send
        // But we handle connection logic below.
        // Actually, we usually tap off the signal before the Panner.
        
        if (AudioGraph.busses.delay) {
            sendGain.connect(AudioGraph.busses.delay);
        }
    }

    // Send 2: Reverb
    if (c.reverb && c.reverb > 0) {
        const sendAmt = c.reverb / 100;
        const sendGain = new Tone.Gain(sendAmt);
        sends.push(sendGain);
        
        if (AudioGraph.busses.reverb) {
            sendGain.connect(AudioGraph.busses.reverb);
        }
    }

    // D. Output Panner
    const trackPanner = new Tone.Panner(0);
    sourceInst._panner = trackPanner;
    activeEffects.push(trackPanner);
    chain.push(trackPanner);

    // --- Wiring ---
    if (chain.length > 1) {
        sourceInst.chain(...chain);
    } else {
        sourceInst.connect(trackPanner);
    }

    // Connect Sends
    // We want the sends to receive the signal *after* inserts/EQ, but *before* Pan?
    // Usually sends are Post-Fader (after Vol/Pan) or Pre-Fader.
    // Let's do Pre-Pan for spatial clarity, but Post-EQ.
    // The node *before* trackPanner is the last element of 'chain' before 'trackPanner'.
    // If chain has [Filter, EQ, Panner], we tap EQ.
    // If chain has [Panner], we tap Source.
    
    const sendSourceNode = chain.length > 1 ? chain[chain.length - 2] : sourceInst;
    sends.forEach(s => sendSourceNode.connect(s));

    // Store sends on instrument for disposal
    (sourceInst as any)._sends = sends;

    // E. Auto-Panner (LFO)
    if (config.panning && config.panning.enabled) {
        const autoPanner = new Tone.AutoPanner({
            frequency: config.panning.frequency || 2,
            type: config.panning.type || 'sine',
            depth: config.panning.depth || 1,
        }).start();
        trackPanner.connect(autoPanner);
        (sourceInst as any)._outputNode = autoPanner;
        activeEffects.push(autoPanner);
    } else {
        (sourceInst as any)._outputNode = trackPanner;
    }

    // --- 3. LFOs (Same as before) ---
    const activeLFOs: Tone.LFO[] = [];
    const lfosToApply = config.lfos || [];
    
    // ... (LFO Logic unchanged) ...
    lfosToApply.forEach(def => {
        const lfo = new Tone.LFO({
            type: def.type,
            frequency: def.frequency,
            min: def.min ?? (def.target === 'filter' ? 200 : -1),
            max: def.max ?? (def.target === 'filter' ? 2000 : 1),
            amplitude: def.depth
        }).start();

        if (def.target === 'pan') {
            lfo.connect(trackPanner.pan);
        } else if (def.target === 'filter' && filter) { // check filter var
            lfo.connect(filter.frequency);
        }
        activeLFOs.push(lfo);
    });

    // --- 4. Embellishments ---
    const embellishmentPlayers: Tone.Player[] = [];
    // ... (Embellishment logic unchanged) ...
    // Connect embellishments to the START of the chain
    if (config.embellishments) {
        // ... (copy existing logic) ...
        // player.connect(chain.length > 0 ? chain[0] : trackPanner);
    }

    instrumentCache[cacheKey] = { 
        source: sourceInst, 
        panner: trackPanner, 
        effects: activeEffects, 
        lfos: activeLFOs,
        embellishments: embellishmentPlayers,
        sends: sends 
    };
    return sourceInst;
}

export function disposeInstruments() {
    Object.values(instrumentCache).forEach(graph => {
        graph.lfos.forEach(l => l.dispose());
        graph.effects.forEach(e => e.dispose());
        graph.embellishments.forEach(p => p.dispose()); 
        graph.sends.forEach(s => s.dispose()); // NEW
        graph.panner.dispose();
        graph.source.dispose();
    });
    for (const key in instrumentCache) delete instrumentCache[key];
}