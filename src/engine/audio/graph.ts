import * as Tone from 'tone';
export const AudioGraph = {
    isInitialized: false,
    masterGain: null as Tone.Gain | null,
    limiter: null as Tone.Limiter | null,
    busses: {
        reverb: null as Tone.Reverb | null,
        delay: null as Tone.PingPongDelay | null,
    }
};

export async function initializeAudioGraph() {
    if (AudioGraph.isInitialized) return;

    await Tone.start();
    AudioGraph.limiter = new Tone.Limiter(-1).toDestination();
    AudioGraph.masterGain = new Tone.Gain(0).connect(AudioGraph.limiter);
    AudioGraph.busses.reverb = new Tone.Reverb({
        decay: 3.5,
        preDelay: 0.05,
        wet: 1.0
    });
    await AudioGraph.busses.reverb.generate();
    AudioGraph.busses.reverb.connect(AudioGraph.masterGain);
    AudioGraph.busses.delay = new Tone.PingPongDelay({
        delayTime: "8n",
        feedback: 0.3,
        wet: 1.0
    });
    AudioGraph.busses.delay.connect(AudioGraph.masterGain);

    AudioGraph.isInitialized = true;
}

export function setMasterVolume(db: number) {
    if (AudioGraph.masterGain) {
        AudioGraph.masterGain.gain.rampTo(Tone.dbToGain(db), 0.1);
    }
}

export function stopAllSound() {
    if (AudioGraph.masterGain) {
        AudioGraph.masterGain.gain.cancelScheduledValues(0);
        AudioGraph.masterGain.gain.value = 0;
    }
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
}

export function restoreMasterVolume(targetDb: number) {
    if (AudioGraph.masterGain) {
        setTimeout(() => {
            AudioGraph.masterGain?.gain.rampTo(Tone.dbToGain(targetDb), 0.1);
        }, 50);
    }
}