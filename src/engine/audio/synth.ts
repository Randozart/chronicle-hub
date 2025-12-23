// src/engine/audio/synth.ts
import * as Tone from 'tone';
import { InstrumentDefinition } from './models';
import { Note } from 'tonal';

export type AnySoundSource = (Tone.PolySynth | Tone.Sampler) & { _panner?: Tone.Panner; _outputNode?: Tone.ToneAudioNode };

const instrumentCache: Record<string, {
    source: AnySoundSource;
    panner: Tone.Panner;
    effects: Tone.ToneAudioNode[];
    lfos: Tone.LFO[]; // Track LFOs to dispose them later
}> = {};

function getCacheKey(def: InstrumentDefinition): string {
    return JSON.stringify({
        id: def.id,
        config: def.config, // Deep compare full config
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
    sourceInst.disconnect(); // We will chain manually

    // --- 2. Build Signal Chain ---
    const effects: Tone.ToneAudioNode[] = [];
    const activeLFOs: Tone.LFO[] = [];
    const chain: Tone.ToneAudioNode[] = [];
    const c = config as any; 

    // A. Distortion / BitCrush (Tone Coloring)
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

    // B. Filter (Subtractive)
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

    // C. EQ (Mixing)
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

    // D. Time-Based Effects (Delay -> Reverb)
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

    // E. Output Stage & Modulation Targets
    // We need a Volume Node for LFO Tremolo
    const volumeNode = new Tone.Volume(0);
    effects.push(volumeNode);
    chain.push(volumeNode);

    // We need a Panner Node
    const trackPanner = new Tone.Panner(0);
    sourceInst._panner = trackPanner;
    effects.push(trackPanner);
    chain.push(trackPanner);

    // Connect the Chain: Source -> FX... -> Volume -> Panner
    if (chain.length > 0) {
        sourceInst.chain(...chain);
    } else {
        sourceInst.connect(trackPanner);
    }

    // --- 3. LFO Modulation ---
    const lfosToApply = config.lfos || [];
    
    // Legacy support for 'panning' prop
    if (config.panning && config.panning.enabled && !lfosToApply.find(l => l.target === 'pan')) {
        lfosToApply.push({
            target: 'pan',
            type: config.panning.type || 'sine',
            frequency: config.panning.frequency || 2,
            depth: config.panning.depth || 1,
            min: -1, max: 1
        });
    }

    lfosToApply.forEach(def => {
        const lfo = new Tone.LFO({
            type: def.type,
            frequency: def.frequency,
            min: def.min ?? (def.target === 'filter' ? 200 : -1), // Default ranges
            max: def.max ?? (def.target === 'filter' ? 2000 : 1),
            amplitude: def.depth // Use amplitude for depth
        }).start();

        if (def.target === 'pan') {
            // LFO -> Panner.pan
            lfo.connect(trackPanner.pan);
        } else if (def.target === 'volume') {
            // LFO -> Volume.volume (gain is logarithmic, volume node handles db?)
            // Tone.LFO outputs signal. Connecting to .volume (Signal) works but requires range.
            // Better to connect to a Gain node's gain property, but we used Volume node.
            // Volume.volume is in dB. LFO usually 0-1.
            // Let's use a specialized scaling for Tremolo:
            // Map 0..1 to -Infinity..0 ?
            // Simpler: Connect LFO to a Gain Node.
            // Re-architect: Add a specific Gain Node for Tremolo if requested.
            const tremoloGain = new Tone.Gain(1);
            volumeNode.connect(tremoloGain); // Insert after volume
            // Actually, we must insert INTO the chain.
            // It's easier to modulate the Filter Frequency.
        } else if (def.target === 'filter' && filterNode) {
            lfo.connect(filterNode.frequency);
        }
        
        activeLFOs.push(lfo);
    });
    
    // --- 4. Final Output ---
    // Note: AudioProvider connects _outputNode to Master.
    // If we have no LFOs, trackPanner is the end.
    // If we have LFOs, they modulate params, but don't break the audio path (LFOs are control signals).
    // EXCEPT if we added extra nodes (like for Tremolo).
    
    // For now, trackPanner is always the audio exit.
    (sourceInst as any)._outputNode = trackPanner;

    instrumentCache[cacheKey] = { source: sourceInst, panner: trackPanner, effects, lfos: activeLFOs };
    return sourceInst;
}

export function disposeInstruments() {
    Object.values(instrumentCache).forEach(graph => {
        graph.lfos.forEach(l => l.dispose());
        graph.effects.forEach(effect => effect.dispose());
        graph.panner.dispose();
        graph.source.dispose();
    });
    for (const key in instrumentCache) delete instrumentCache[key];
}