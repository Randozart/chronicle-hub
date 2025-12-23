// src/engine/audio/synth.ts
import * as Tone from 'tone';
import { InstrumentDefinition } from './models';
import { Note } from 'tonal';

// Extend the type to hold accessory players
export type AnySoundSource = (Tone.PolySynth | Tone.Sampler) & { 
    _panner?: Tone.Panner; 
    _outputNode?: Tone.ToneAudioNode;
    _embellishments?: { player: Tone.Player, probability: number, volumeOffset: number }[];
};

const instrumentCache: Record<string, {
    source: AnySoundSource;
    panner: Tone.Panner;
    effects: Tone.ToneAudioNode[];
    lfos: Tone.LFO[];
    embellishments: Tone.Player[]; // Track to dispose
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
        if (key === cacheKey) {
            return graph.source;
        }
        graph.lfos.forEach(l => l.dispose());
        graph.effects.forEach(e => e.dispose());
        graph.embellishments.forEach(e => e.dispose());
        graph.panner.dispose();
        graph.source.dispose();
        delete instrumentCache[key];
    }

    const config = def.config;
    let sourceInst: AnySoundSource;

    // --- 1. Create Source ---
    if (def.type === 'sampler' && config.urls) {
        let finalUrls = config.urls;
        const samplerPromise = new Promise<Tone.Sampler>((resolve) => {
            const sampler = new Tone.Sampler({
                urls: finalUrls,
                baseUrl: config.baseUrl || "",
                attack: config.envelope?.attack || 0,
                release: config.envelope?.release || 1,
                onload: () => resolve(sampler),
                onerror: (err) => {
                    console.warn(`Failed to load sample for ${def.id}`, err);
                    resolve(sampler); 
                }
            });
        });

        sourceInst = (await samplerPromise) as AnySoundSource;

        if (config.loop && config.loop.enabled) {
            const sampler = sourceInst as any;
            sampler.loop = true;
            if (config.loop.start !== undefined) sampler.loopStart = config.loop.start;
            if (config.loop.end !== undefined) sampler.loopEnd = config.loop.end;
            if (config.loop.crossfade !== undefined && config.loop.crossfade > 0) {
                sampler.fadeIn = config.loop.crossfade;
                sampler.fadeOut = config.loop.crossfade;
            }
        }
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

        sourceInst = new Tone.PolySynth(SynthClass, {
            oscillator: { type: oscType as any, ...config.oscillator },
            envelope: envelope,
        } as any) as AnySoundSource;
        
        (sourceInst as Tone.PolySynth).maxPolyphony = Math.min(config.polyphony || 32, 12);
    }

    sourceInst.volume.value = config.volume || -10;
    sourceInst.disconnect(); 

    // --- 2. Build Effects Chain ---
    const effects: Tone.ToneAudioNode[] = [];
    const chain: Tone.ToneAudioNode[] = [];
    const c = config as any; 

    // A. Distortion / BitCrush
    if (c.bitcrush && c.bitcrush > 0) {
        const crusher = new Tone.BitCrusher(4);
        crusher.wet.value = c.bitcrush / 100;
        effects.push(crusher);
        chain.push(crusher);
    }
    if (c.distortion && c.distortion > 0) {
        const dist = new Tone.Distortion({
            distortion: c.distortion / 100,
            wet: 0.5 
        });
        effects.push(dist);
        chain.push(dist);
    }

    // B. Filter
    let filterNode: Tone.Filter | null = null;
    if (config.filter) {
        filterNode = new Tone.Filter({
            type: config.filter.type,
            frequency: config.filter.frequency,
            rolloff: config.filter.rolloff || -12,
            Q: config.filter.Q || 1,
            gain: config.filter.gain || 0
        });
        effects.push(filterNode);
        chain.push(filterNode);
    }

    // C. EQ
    if (config.eq) {
        const eq = new Tone.EQ3({
            low: config.eq.low,
            mid: config.eq.mid,
            high: config.eq.high,
            lowFrequency: config.eq.lowFrequency || 400,
            highFrequency: config.eq.highFrequency || 2500
        });
        effects.push(eq);
        chain.push(eq);
    }

    // D. Delay & Reverb
    if (c.delay && c.delay > 0) {
        const delay = new Tone.PingPongDelay({
            delayTime: "8n",
            feedback: 0.2,
            wet: c.delay / 100
        });
        effects.push(delay);
        chain.push(delay);
    }

    if (c.reverb && c.reverb > 0) {
        const reverb = new Tone.Reverb({
            decay: 2.5,
            preDelay: 0.01,
            wet: c.reverb / 100
        });
        await reverb.generate();
        effects.push(reverb);
        chain.push(reverb);
    }

    // E. Output
    const trackPanner = new Tone.Panner(0);
    sourceInst._panner = trackPanner;
    effects.push(trackPanner);
    chain.push(trackPanner);

    if (chain.length > 1) {
        sourceInst.chain(...chain);
    } else {
        sourceInst.connect(trackPanner);
    }

    // F. Auto-Panner
    if (config.panning && config.panning.enabled) {
        const autoPanner = new Tone.AutoPanner({
            frequency: config.panning.frequency || 2,
            type: config.panning.type || 'sine',
            depth: config.panning.depth || 1,
        }).start();
        trackPanner.connect(autoPanner);
        (sourceInst as any)._outputNode = autoPanner;
        effects.push(autoPanner);
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
        } else if (def.target === 'filter' && filterNode) {
            lfo.connect(filterNode.frequency);
        }
        
        activeLFOs.push(lfo);
    });

    // --- 4. Embellishments (Noise/Fret/Breath) ---
    // We create separate Player instances for these. They route to the SAME output chain.
    const embellishmentPlayers: Tone.Player[] = [];
    const embellishmentConfigs: { player: Tone.Player, probability: number, volumeOffset: number }[] = [];

    if (config.embellishments) {
        await Promise.all(config.embellishments.map(async (emb) => {
            const player = new Tone.Player({
                url: (config.baseUrl || "") + emb.url,
                autostart: false
            }).toDestination(); // Connects to Master eventually via chain?
            
            // Route Embellishment -> Same FX Chain as Main Instrument?
            // Yes, so they sit in the same space.
            // Connect to first node in chain, OR trackPanner if no chain.
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
    
    // Attach to source so AudioProvider can use them
    sourceInst._embellishments = embellishmentConfigs;

    instrumentCache[cacheKey] = { 
        source: sourceInst, 
        panner: trackPanner, 
        effects, 
        lfos: activeLFOs,
        embellishments: embellishmentPlayers 
    };
    return sourceInst;
}

export function disposeInstruments() {
    Object.values(instrumentCache).forEach(graph => {
        graph.lfos.forEach(l => l.dispose());
        graph.effects.forEach(effect => effect.dispose());
        graph.embellishments.forEach(p => p.dispose()); // Dispose players
        graph.panner.dispose();
        graph.source.dispose();
    });
    for (const key in instrumentCache) delete instrumentCache[key];
}