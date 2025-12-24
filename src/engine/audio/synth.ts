import * as Tone from 'tone';
import { InstrumentDefinition } from './models';
import { Note } from 'tonal';
import { PolySampler } from './polySampler'; 
import { AudioGraph } from './graph'; 
import { createInsertEffects, createFilter, createEQ } from './effects'; 

export type AnySoundSource = (Tone.PolySynth | PolySampler | Tone.MonoSynth) & { 
    _panner?: Tone.Panner; 
    _outputNode?: Tone.ToneAudioNode;
    _filterNode?: Tone.Filter; 
    _embellishments?: { player: Tone.Player, probability: number, volumeOffset: number }[];
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
    
    const oldEntry = Object.entries(instrumentCache).find(([key]) => JSON.parse(key).id === def.id);
    if (oldEntry) {
        const [key, graph] = oldEntry;
        if (key === cacheKey) return graph.source;
        
        graph.lfos.forEach(l => l.dispose());
        graph.effects.forEach(e => e.dispose());
        graph.embellishments.forEach(e => e.dispose());
        graph.sends.forEach(s => s.dispose());
        graph.panner.dispose();
        graph.source.dispose();
        delete instrumentCache[key];
    }

    const config = def.config;
    let sourceInst: AnySoundSource;
    const targetPolyphony = (config.noteCut || (config.portamento && config.portamento > 0)) ? 1 : (config.polyphony || 32);

    // --- 1. Create Source ---
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

        // FIX: Wait for samples to load before returning!
        await Tone.loaded();

    } else {
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

    // --- 2. Build Effects Chain ---
    const activeEffects: Tone.ToneAudioNode[] = [];
    const chain: Tone.ToneAudioNode[] = [];
    const sends: Tone.Gain[] = [];
    const c = config as any; 

    // A. Inserts
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
        (sourceInst as any)._filterNode = filter; 
    }

    const eq = createEQ(config.eq);
    if (eq) {
        activeEffects.push(eq);
        chain.push(eq);
    }

    // C. Global Sends
    if (c.delay && c.delay > 0) {
        const sendAmt = c.delay / 100;
        const sendGain = new Tone.Gain(sendAmt);
        sends.push(sendGain);
        if (AudioGraph.busses.delay) sendGain.connect(AudioGraph.busses.delay);
    }

    if (c.reverb && c.reverb > 0) {
        const sendAmt = c.reverb / 100;
        const sendGain = new Tone.Gain(sendAmt);
        sends.push(sendGain);
        if (AudioGraph.busses.reverb) sendGain.connect(AudioGraph.busses.reverb);
    }

    // D. Output Panner
    const trackPanner = new Tone.Panner(0);
    sourceInst._panner = trackPanner;
    activeEffects.push(trackPanner);
    chain.push(trackPanner);

    // Wiring
    if (chain.length > 1) {
        sourceInst.chain(...chain);
    } else {
        sourceInst.connect(trackPanner);
    }

    // Connect Sends (Pre-Pan, Post-EQ)
    const sendSourceNode = chain.length > 1 ? chain[chain.length - 2] : sourceInst;
    sends.forEach(s => sendSourceNode.connect(s));
    (sourceInst as any)._sends = sends;

    // E. Auto-Panner
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

    // --- 3. LFOs ---
    const activeLFOs: Tone.LFO[] = [];
    const lfosToApply = config.lfos || [];
    
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
        } else if (def.target === 'filter' && filter) { 
            lfo.connect(filter.frequency);
        }
        activeLFOs.push(lfo);
    });

    // --- 4. Embellishments ---
    const embellishmentPlayers: Tone.Player[] = [];
    const embellishmentConfigs: { player: Tone.Player, probability: number, volumeOffset: number }[] = [];

    if (config.embellishments) {
        await Promise.all(config.embellishments.map(async (emb) => {
            const player = new Tone.Player({
                url: (config.baseUrl || "") + emb.url,
                autostart: false,
                volume: emb.volume || 0 
            });
            const chainStart = chain.length > 0 ? chain[0] : trackPanner;
            player.disconnect(); 
            player.connect(chainStart);

            await player.loaded;
            embellishmentPlayers.push(player);
            embellishmentConfigs.push({ 
                player, 
                probability: emb.probability, 
                volumeOffset: emb.volume || 0 
            });
        }));
    }
    sourceInst._embellishments = embellishmentConfigs;

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
        graph.sends.forEach(s => s.dispose());
        graph.panner.dispose();
        graph.source.dispose();
    });
    for (const key in instrumentCache) delete instrumentCache[key];
}