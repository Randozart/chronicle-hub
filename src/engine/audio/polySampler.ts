import * as Tone from 'tone';
import { Note } from 'tonal';
import { Instrument, InstrumentOptions } from 'tone/build/esm/instrument/Instrument';

export interface PolySamplerOptions extends InstrumentOptions {
    urls?: Record<string, string>;
    baseUrl?: string;
    loop?: boolean;
    loopStart?: number;
    loopEnd?: number;
    polyphony?: number;
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
    private _activeVoices: Map<number, { source: Tone.ToneBufferSource, env: Tone.AmplitudeEnvelope }> = new Map();
    
    public loop: boolean;
    public loopStart: number;
    public loopEnd: number;
    public attack: number;
    public decay: number;
    public sustain: number;
    public release: number;
    public polyphony: number;

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

        // 1. Handle Re-triggering Same Note (Self-Stealing)
        const previousVoice = this._activeVoices.get(midi);
        if (previousVoice) {
            // Hard cut: Fast fade (50ms) then stop
            previousVoice.env.triggerRelease(now);
            previousVoice.source.stop(now + 0.05);
            this._activeVoices.delete(midi);
        }

        // 2. Handle Polyphony Limit (Voice Stealing)
        if (this._activeVoices.size >= this.polyphony) {
            const oldestMidi = this._activeVoices.keys().next().value;
            if (oldestMidi !== undefined) {
                const voiceToSteal = this._activeVoices.get(oldestMidi);
                if (voiceToSteal) {
                    // Hard cut: Fast fade (50ms) then stop
                    voiceToSteal.env.triggerRelease(now);
                    voiceToSteal.source.stop(now + 0.05);
                    this._activeVoices.delete(oldestMidi);
                }
            }
        }

        const baseMidi = this.getClosestMidi(midi);
        if (baseMidi === -1) return;
        const buffer = this._buffers.get(baseMidi);
        if (!buffer) return;

        const source = new Tone.ToneBufferSource(buffer, () => {
            // onended callback
            const voice = this._activeVoices.get(midi);
            if (voice && voice.source === source) {
                this._activeVoices.delete(midi);
                voice.env.dispose();
            }
        }).set({ context: this.context });
        
        const interval = midi - baseMidi;
        source.playbackRate.value = Math.pow(2, interval / 12);
        
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
        source.start(now);
        env.triggerAttack(now, velocity);

        this._activeVoices.set(midi, { source, env });
    }

    protected _triggerRelease(note: Tone.Unit.Frequency, time: Tone.Unit.Time): void {
        const now = this.toSeconds(time);
        const midi = Tone.Frequency(note).toMidi();
        const voice = this._activeVoices.get(midi);

        if (voice) {
            // Soft release: use full ADSR release time
            voice.env.triggerRelease(now);
            const releaseTime = this.toSeconds(this.release);
            voice.source.stop(now + releaseTime + 0.1); 
            // Do NOT delete from map yet; allow onended or stealing to handle it.
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
}