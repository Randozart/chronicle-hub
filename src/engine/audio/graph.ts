import * as Tone from 'tone';

// Global references to audio nodes to ensure we don't recreate them unnecessarily
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

    // 1. Create Master Chain
    AudioGraph.limiter = new Tone.Limiter(-1).toDestination();
    AudioGraph.masterGain = new Tone.Gain(0).connect(AudioGraph.limiter);

    // 2. Create Global Send Busses
    // Reverb (Heavy, so we only want one)
    AudioGraph.busses.reverb = new Tone.Reverb({
        decay: 3.5,
        preDelay: 0.05,
        wet: 1.0 // Sends are always 100% wet, we control amount via Send Gain
    });
    await AudioGraph.busses.reverb.generate();
    // Connect Reverb to Master
    AudioGraph.busses.reverb.connect(AudioGraph.masterGain);

    // Delay (PingPong)
    AudioGraph.busses.delay = new Tone.PingPongDelay({
        delayTime: "8n",
        feedback: 0.3,
        wet: 1.0
    });
    AudioGraph.busses.delay.connect(AudioGraph.masterGain);

    AudioGraph.isInitialized = true;
    console.log("Audio Graph Initialized: Master + Sends Ready");
}

export function setMasterVolume(db: number) {
    if (AudioGraph.masterGain) {
        AudioGraph.masterGain.gain.rampTo(Tone.dbToGain(db), 0.1);
    }
}

export function stopAllSound() {
    // Immediate mute to prevent tails
    if (AudioGraph.masterGain) {
        AudioGraph.masterGain.gain.cancelScheduledValues(0);
        AudioGraph.masterGain.gain.value = 0;
    }
    
    // Clear Transport
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
}

export function restoreMasterVolume(targetDb: number) {
    if (AudioGraph.masterGain) {
        // Short fade in to prevent clicks
        setTimeout(() => {
            AudioGraph.masterGain?.gain.rampTo(Tone.dbToGain(targetDb), 0.1);
        }, 50);
    }
}