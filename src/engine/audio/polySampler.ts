import * as Tone from 'tone';
import { Note } from 'tonal';
import { Instrument, InstrumentOptions } from 'tone/build/esm/instrument/Instrument';
import { VibratoDef } from './models';

export interface PolySamplerOptions extends InstrumentOptions {
    urls?: Record<string, string>;
    baseUrl?: string;
    loop?: boolean;
    loopStart?: number;
    loopEnd?: number;
    polyphony?: number;
    portamento?: number;
    noteCutBleed?: number;
    vibrato?: VibratoDef;
    envelope?: {
        attack?: number;
        decay?: number;
        sustain?: number;
        release?: number;
    };
}

export class PolySampler extends Instrument<PolySamplerOptions> {
    readonly name = "PolySampler";

    private _buffers: Map<number, Tone.ToneAudioBuffer> = new Map();
    private _activeVoices: Map<number, { source: Tone.ToneBufferSource, env: Tone.AmplitudeEnvelope, lfo?: Tone.LFO }> = new Map();
    
    public loop: boolean;
    public loopStart: number;
    public loopEnd: number;
    public attack: number;
    public decay: number;
    public sustain: number;
    public release: number;
    public polyphony: number;
    public portamento: number;
    public noteCutBleed: number;
    public vibrato: VibratoDef | undefined;
    
    private _lastMidi: number | null = null; 

    constructor(options?: Partial<PolySamplerOptions>) {
        super(options);
        
        const env = options?.envelope || {};
        this.attack = env.attack ?? 0.01;
        this.decay = env.decay ?? 0.1;
        this.sustain = env.sustain ?? 1.0;
        this.release = env.release ?? 1.0;

        this.loop = options?.loop || false;
        this.loopStart = options?.loopStart || 0;
        this.loopEnd = options?.loopEnd || 0;
        
        this.polyphony = options?.polyphony || 32;
        this.portamento = options?.portamento || 0;
        this.noteCutBleed = options?.noteCutBleed || 0.05;
        this.vibrato = options?.vibrato;

        if (options?.urls) {
            this.load(options.urls, options.baseUrl || "");
        }
    }

    public async load(urls: Record<string, string>, baseUrl: string = ""): Promise<void> {
        const promises = Object.entries(urls).map(([note, url]) => {
            return new Promise<void>((resolve, reject) => {
                const midi = Note.midi(note);
                if (midi === null) return resolve();
                new Tone.ToneAudioBuffer(baseUrl + url, (loadedBuffer) => {
                    this._buffers.set(midi, loadedBuffer);
                    resolve();
                }, (err) => reject(err));
            });
        });
        await Promise.all(promises);
    }

    private getClosestMidi(midi: number): number {
        const keys = Array.from(this._buffers.keys()).sort((a, b) => a - b);
        if (keys.length === 0) return -1;
        return keys.reduce((prev, curr) => Math.abs(curr - midi) < Math.abs(prev - midi) ? curr : prev);
    }

    protected _triggerAttack(note: Tone.Unit.Frequency, time: Tone.Unit.Time, velocity: number): void {
        const now = this.toSeconds(time);
        const midi = Tone.Frequency(note).toMidi();
        let startRateRatio = 1.0;

        if (this._activeVoices.size >= this.polyphony) {
            const oldestMidi = this._activeVoices.keys().next().value;
            if (oldestMidi !== undefined) {
                const voiceToSteal = this._activeVoices.get(oldestMidi);
                if (voiceToSteal) {
                    voiceToSteal.env.triggerRelease(now);
                    voiceToSteal.source.stop(now + this.noteCutBleed);
                    if (voiceToSteal.lfo) voiceToSteal.lfo.dispose();
                    this._activeVoices.delete(oldestMidi);
                }
            }
        }

        const previousVoice = this._activeVoices.get(midi);
        if (previousVoice) {
            previousVoice.env.triggerRelease(now);
            previousVoice.source.stop(now + this.noteCutBleed);
            if (previousVoice.lfo) previousVoice.lfo.dispose();
        }

        if (this.portamento > 0 && this._lastMidi !== null && this._lastMidi !== midi) {
            const semitones = this._lastMidi - midi;
            startRateRatio = Math.pow(2, semitones / 12);
        }
        this._lastMidi = midi;

        const baseMidi = this.getClosestMidi(midi);
        if (baseMidi === -1) return;
        const buffer = this._buffers.get(baseMidi);
        if (!buffer) return;

        const source = new Tone.ToneBufferSource(buffer, () => {
            const voice = this._activeVoices.get(midi);
            if (voice && voice.source === source) {
                this._activeVoices.delete(midi);
                voice.env.dispose();
                if (voice.lfo) voice.lfo.dispose();
            }
        }).set({ context: this.context });
        
        const interval = midi - baseMidi;
        const basePlaybackRate = Math.pow(2, interval / 12);
        
        if (this.portamento > 0 && startRateRatio !== 1.0) {
            source.playbackRate.value = basePlaybackRate * startRateRatio;
            source.playbackRate.exponentialRampToValueAtTime(basePlaybackRate, now + this.portamento);
        } else {
            source.playbackRate.value = basePlaybackRate;
        }
        
        if (this.loop) {
            source.loop = true;
            source.loopStart = this.loopStart;
            source.loopEnd = this.loopEnd > 0 ? this.loopEnd : buffer.duration;
        }

        const env = new Tone.AmplitudeEnvelope({
            attack: this.attack,
            decay: this.decay,
            sustain: this.sustain,
            release: this.release,
            context: this.context
        }).connect(this.output);

        source.connect(env);
        
        let lfo: Tone.LFO | undefined;
        if (this.vibrato && this.vibrato.depth > 0) {
            lfo = new Tone.LFO({
                frequency: this.vibrato.rate,
                min: -this.vibrato.depth,
                max: this.vibrato.depth,
                type: this.vibrato.shape || 'sine',
                context: this.context
            });
            
            if ((source as any).detune) {
                lfo.connect((source as any).detune);
                const vibStart = now + (this.vibrato.delay || 0);
                lfo.start(vibStart);
                
                if (this.vibrato.rise > 0) {
                    lfo.amplitude.value = 0;
                    lfo.amplitude.linearRampTo(1, this.vibrato.rise, vibStart);
                }
            }
        }

        source.start(now);
        env.triggerAttack(now, velocity);

        this._activeVoices.set(midi, { source, env, lfo });
    }

    public triggerGlide(note: Tone.Unit.Frequency, time: Tone.Unit.Time, velocity: number): void {
        const now = this.toSeconds(time);
        const midi = Tone.Frequency(note).toMidi();
        
        let activeMidi: number | undefined;
        if (this._lastMidi !== null && this._activeVoices.has(this._lastMidi)) {
            activeMidi = this._lastMidi;
        } else if (this._activeVoices.size > 0) {
            activeMidi = Array.from(this._activeVoices.keys()).pop();
        }

        if (activeMidi === undefined) {
            this._triggerAttack(note, time, velocity);
            return;
        }

        const voice = this._activeVoices.get(activeMidi);
        if (!voice) return;

        this._activeVoices.delete(activeMidi);
        this._activeVoices.set(midi, voice);
        this._lastMidi = midi;

        const previousRate = voice.source.playbackRate.value;
        const semitoneDiff = midi - activeMidi;
        const targetRate = previousRate * Math.pow(2, semitoneDiff / 12);
        voice.env.cancel(now);
        const glideTime = this.portamento > 0 ? this.portamento : 0.1;
        
        voice.source.playbackRate.setValueAtTime(previousRate, now);
        voice.source.playbackRate.exponentialRampToValueAtTime(targetRate, now + glideTime);
    }

    protected _triggerRelease(note: Tone.Unit.Frequency, time: Tone.Unit.Time): void {
        const now = this.toSeconds(time);
        const midi = Tone.Frequency(note).toMidi();
        const voice = this._activeVoices.get(midi);

        if (voice) {
            voice.env.triggerRelease(now);
            const releaseTime = this.toSeconds(this.release);
            voice.source.stop(now + releaseTime + 0.1); 
        }
    }

    public triggerAttack(notes: Tone.Unit.Frequency | Tone.Unit.Frequency[], time?: Tone.Unit.Time, velocity?: number): this {
        const now = this.now();
        const t = time ?? now;
        if (Array.isArray(notes)) {
            notes.forEach(note => this._triggerAttack(note, t, velocity || 1));
        } else {
            this._triggerAttack(notes, t, velocity || 1);
        }
        return this;
    }

    public triggerRelease(notes: Tone.Unit.Frequency | Tone.Unit.Frequency[], time?: Tone.Unit.Time): this {
        const now = this.now();
        const t = time ?? now;
        if (Array.isArray(notes)) {
            notes.forEach(note => this._triggerRelease(note, t));
        } else {
            this._triggerRelease(notes, t);
        }
        return this;
    }
    
    public releaseAll(time?: Tone.Unit.Time): this {
        const now = this.toSeconds(time || this.now());
        this._activeVoices.forEach((_, midi) => this._triggerRelease(midi, now));
        return this;
    }
    
    public stopAll(time?: Tone.Unit.Time): this {
        const now = this.toSeconds(time || this.now());
        this._activeVoices.forEach((voice) => {
            voice.env.cancel(now);
            voice.source.stop(now);
            if (voice.lfo) voice.lfo.dispose();
            voice.env.dispose();
        });
        this._activeVoices.clear();
        return this;
    }

    dispose() {
        super.dispose();
        this.stopAll();
        this._buffers.forEach(b => b.dispose());
        this._buffers.clear();
        return this;
    }
}