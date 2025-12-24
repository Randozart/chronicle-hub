import * as Tone from 'tone';
import { InstrumentDefinition } from './models';
import { Note } from 'tonal';
import { PolySampler } from './polySampler'; 

export type AnySoundSource = (Tone.PolySynth | PolySampler | Tone.MonoSynth) & { 
    _panner?: Tone.Panner; 
    _outputNode?: Tone.ToneAudioNode;
    _filterNode?: Tone.Filter; 
    _embellishments?: { player: Tone.Player, probability: number, volumeOffset: number }[];
};

const instrumentCache: Record<string, {
    source: AnySoundSource;
    panner: Tone.Panner;
    effects: Tone.ToneAudioNode[];
    lfos: Tone.LFO[];
    embellishments: Tone.Player[];
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
            // --- NEW OPTIONS ---
            portamento: config.portamento,
            noteCutBleed: config.noteCutBleed,
            vibrato: config.vibrato
        });
        
    } else { // Synth
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

    if (chain.length > 0) {
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
    
    (sourceInst as any)._filterNode = filterNode;

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
        graph.embellishments.forEach(p => p.dispose()); 
        graph.panner.dispose();
        graph.source.dispose();
    });
    for (const key in instrumentCache) delete instrumentCache[key];
}