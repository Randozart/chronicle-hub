import * as Tone from 'tone';
import { ParsedTrack, InstrumentDefinition, NoteDef, SequenceEvent, PatternModifier, ChainItem } from './models';
import { AnySoundSource } from './synth';
import { resolveNote } from './scales';
import { PolySampler } from './polySampler';

type ActiveNoteMap = Map<Tone.Part, string[]>;

export function scheduleSequence(
    track: ParsedTrack,
    trackSynthMap: Map<string, AnySoundSource>,
    instrumentDefs: InstrumentDefinition[],
    activeNotesPerPart: ActiveNoteMap,
    scheduledParts: Tone.Part[],
    scheduledEvents: number[],
    noteCache: Map<string, string> 
) {
    const transport = Tone.getTransport();
    let totalBars = 0;
    let runningConfig = { ...track.config };

    for (const item of track.playlist) {
        if (item.type === 'command') {
            const eventId = transport.scheduleOnce((time: number) => {
                if (item.command === 'BPM') transport.bpm.rampTo(parseFloat(item.value), 0.1, time);
                if (item.command === 'Scale') {
                    const [root, mode] = item.value.split(' ');
                    runningConfig.scaleRoot = root;
                    runningConfig.scaleMode = mode || 'Major';
                }
            }, `${totalBars}:0:0`);
            scheduledEvents.push(eventId);
            continue;
        }

        const { grid, timeSig } = runningConfig;
        const slotsPerBar = grid * (4 / timeSig[1]) * timeSig[0];
        let maxChainBars = 0;

        item.layers.forEach(layer => {
            let chainSlots = 0;
            layer.items.forEach(chainItem => {
                const pattern = track.patterns[chainItem.id];
                if (pattern) chainSlots += pattern.duration;
            });
            maxChainBars = Math.max(maxChainBars, Math.ceil(chainSlots / (slotsPerBar || 16)));
        });

        if (maxChainBars === 0) continue;

        item.layers.forEach(layer => {
            let currentBarOffset = 0;
            let loopGuard = 0;
            while (currentBarOffset < maxChainBars && loopGuard++ < 1000) {
                const startOffset = currentBarOffset;
                for (const chainItem of layer.items) {
                    if (currentBarOffset >= maxChainBars) break;
                    const pattern = track.patterns[chainItem.id];
                    if (!pattern) continue;

                    const patternBars = Math.ceil(pattern.duration / slotsPerBar);
                    if (patternBars === 0) continue; 

                    for (const [trackName, events] of Object.entries(pattern.tracks)) {
                        const baseName = trackName.split('_#')[0];
                        const synth = trackSynthMap.get(baseName);
                        const instConfig = track.instruments[baseName];
                        if (!instConfig || !synth) continue;

                        const baseDef = instrumentDefs.find(d => d.id === instConfig.id);
                        const mapping = baseDef?.mapping || 'diatonic';
                        const instEffects = instConfig.overrides.effects || [];
                        const trackMod = pattern.trackModifiers[trackName];
                        const trackEffects = trackMod?.effects || [];
                        const instOctaveOffset = instConfig.overrides.octaveOffset ?? baseDef?.config.octaveOffset ?? 0;

                        const humanizeGlobal = runningConfig.humanize || 0;
                        const humanizeInst = baseDef?.config.humanize?.enabled ? (baseDef.config.humanize.velocity || 0.1) : 0;
                        const totalHumanize = Math.max(humanizeGlobal, humanizeInst);

                        const toneEvents = events.map(event => {
                            if (event.isCut) {
                                const timeInSlots = event.time;
                                const bar = Math.floor(timeInSlots / slotsPerBar);
                                const beatDivisor = (grid * (4 / timeSig[1]));
                                const beat = Math.floor((timeInSlots % slotsPerBar) / beatDivisor);
                                const sixteenthDivisor = grid / 4;
                                const sixteenth = (timeInSlots % beatDivisor) / sixteenthDivisor;
                                return {
                                    time: `${totalBars + currentBarOffset + bar}:${beat}:${sixteenth}`,
                                    isCut: true,
                                    duration: 0.1,
                                    notes: [],
                                    velocity: 0,
                                    noteDefs: [],
                                    pan: 0
                                };
                            }

                            const totalVolDb = (chainItem.volume || 0) + (trackMod?.volume || 0);
                            let velocity = Math.pow(10, totalVolDb / 20);
                            const noteVol = event.notes[0]?.volume || 0;
                            if (noteVol !== 0) velocity = Math.pow(10, (totalVolDb + noteVol) / 20);
                            
                            if (totalHumanize > 0) {
                                const jitter = (Math.random() - 0.5) * 0.4 * totalHumanize;
                                velocity = Math.max(0, Math.min(1, velocity + jitter));
                            }

                            const timeInSlots = event.time;
                            const bar = Math.floor(timeInSlots / slotsPerBar);
                            const beatDivisor = (grid * (4 / timeSig[1]));
                            const beat = Math.floor((timeInSlots % slotsPerBar) / beatDivisor);
                            const sixteenthDivisor = grid / 4;
                            const sixteenth = (timeInSlots % beatDivisor) / sixteenthDivisor;
                            const durationSeconds = event.duration * (60 / runningConfig.bpm / sixteenthDivisor);

                            const noteNames = event.notes.map(n => {
                                const transpose = (chainItem.transposition || 0) + (trackMod?.transpose || 0);
                                const key = `${n.degree + transpose}-${runningConfig.scaleRoot}-${runningConfig.scaleMode}-${n.octaveShift + instOctaveOffset}-${n.accidental}-${n.isNatural}-${mapping}`;
                                
                                if (noteCache.has(key)) return noteCache.get(key)!;
                                
                                const resolved = resolveNote(
                                    n.degree + transpose, 
                                    runningConfig.scaleRoot, 
                                    runningConfig.scaleMode, 
                                    n.octaveShift + instOctaveOffset, 
                                    n.accidental, 
                                    n.isNatural || mapping === 'chromatic'
                                );
                                noteCache.set(key, resolved);
                                return resolved;
                            });

                            return {
                                time: `${totalBars + currentBarOffset + bar}:${beat}:${sixteenth}`,
                                duration: durationSeconds,
                                notes: noteNames,
                                velocity,
                                noteDefs: event.notes,
                                pan: (trackMod?.pan || 0) / 100,
                                isGlide: event.isGlide // <--- PASS GLIDE PROP
                            };
                        });

                        if (synth) {
                            const part = new Tone.Part((time, value) => {
                                // Handle Cut
                                if (value.isCut) {
                                    const previousNotes = activeNotesPerPart.get(part);
                                    if (previousNotes) {
                                        if (synth instanceof Tone.PolySynth || synth instanceof Tone.Sampler || synth instanceof PolySampler) {
                                            synth.triggerRelease(previousNotes, time);
                                        } else if ('triggerRelease' in synth) {
                                            (synth as any).triggerRelease(time);
                                        }
                                        activeNotesPerPart.delete(part);
                                    }
                                    return;
                                }

                                let playTime = time;
                                if (totalHumanize > 0) {
                                    playTime += (Math.random() - 0.5) * 0.06 * totalHumanize; 
                                }

                                const baseVolume = instConfig.overrides.volume ?? baseDef?.config.volume ?? -10;
                                
                                if (synth._panner) {
                                    let panVal = value.pan;
                                    const noteEffects = value.noteDefs[0]?.effects || [];
                                    const panFx = noteEffects.find(fx => fx.code === 'P');
                                    if (panFx) panVal = panFx.value / 100;
                                    synth._panner.pan.setValueAtTime(panVal, playTime);
                                }

                                // Filter Modulation
                                const filterSens = baseDef?.config.filter?.velocitySens ?? 0;
                                if (synth._filterNode && filterSens > 0) {
                                    const baseFreq = baseDef?.config.filter?.frequency ?? 2000;
                                    const mod = 1 - (filterSens * (1 - value.velocity)); 
                                    const targetFreq = Math.max(20, baseFreq * mod);
                                    synth._filterNode.frequency.cancelScheduledValues(playTime);
                                    synth._filterNode.frequency.setValueAtTime(targetFreq, playTime);
                                }

                                // Dynamic Volume
                                const noteEffects = value.noteDefs[0]?.effects || [];
                                const hasDynamicVol = [...instEffects, ...trackEffects, ...noteEffects].some(fx => fx.code === 'F' || fx.code === 'S');

                                if (hasDynamicVol) {
                                    const s = synth as any;
                                    if(s.volume) {
                                        s.volume.cancelScheduledValues(playTime);
                                        s.volume.setValueAtTime(baseVolume, playTime);
                                        
                                        [...instEffects, ...trackEffects, ...noteEffects].forEach(fx => {
                                            if (fx.code === 'F') {
                                                const range = (fx.value === 0) ? 100 : Math.abs(fx.value);
                                                s.volume.rampTo(baseVolume - range, value.duration - 0.1, playTime);
                                            } else if (fx.code === 'S') {
                                                const range = (fx.value === 0) ? 100 : Math.abs(fx.value);
                                                s.volume.setValueAtTime(baseVolume - range, playTime);
                                                s.volume.rampTo(baseVolume, value.duration - 0.1, playTime);
                                            }
                                        });
                                    }
                                }

                                if (synth._embellishments) {
                                    synth._embellishments.forEach(emb => {
                                        if (Math.random() < emb.probability) {
                                            emb.player.start(playTime);
                                        }
                                    });
                                }

                                // --- HANDLE NOTE TRIGGERING ---
                                if (value.isGlide && 'triggerGlide' in synth) {
                                    // 1. Legato Glide (PolySampler)
                                    // Trigger glide on the first note of the chord
                                    if (value.notes.length > 0) {
                                        (synth as any).triggerGlide(value.notes[0], playTime, value.velocity);
                                    }
                                    
                                    // Schedule release normally
                                    transport.scheduleOnce((releaseTime) => {
                                        if (synth instanceof PolySampler) {
                                            synth.triggerRelease(value.notes, releaseTime);
                                        }
                                        activeNotesPerPart.delete(part);
                                    }, playTime + value.duration);
                                    
                                    activeNotesPerPart.set(part, value.notes);

                                } else {
                                    // 2. Standard Attack (Existing Logic)
                                    if (baseDef?.config.noteCut) {
                                        const previousNotes = activeNotesPerPart.get(part);
                                        if (previousNotes) {
                                            if ('releaseAll' in synth) (synth as any).releaseAll(playTime);
                                            else synth.triggerRelease(playTime);
                                        }
                                        
                                        if (synth instanceof Tone.PolySynth || synth instanceof Tone.Sampler) {
                                            synth.triggerAttack(value.notes, playTime, value.velocity);
                                        } else if ('triggerAttack' in synth) {
                                            if(value.notes.length > 0) (synth as any).triggerAttack(value.notes[0], playTime, value.velocity);
                                        }
                                        
                                        transport.scheduleOnce((releaseTime) => {
                                            if (synth instanceof Tone.PolySynth || synth instanceof Tone.Sampler) {
                                                synth.triggerRelease(value.notes, releaseTime);
                                            } else if ('triggerRelease' in synth) {
                                                (synth as any).triggerRelease(releaseTime);
                                            }
                                            activeNotesPerPart.delete(part);
                                        }, playTime + value.duration);
                                        
                                        activeNotesPerPart.set(part, value.notes);
                                    } else {
                                        if (synth instanceof Tone.PolySynth || synth instanceof Tone.Sampler) {
                                            synth.triggerAttackRelease(value.notes, value.duration, playTime, value.velocity);
                                        } else if ('triggerAttackRelease' in synth) {
                                            if(value.notes.length > 0) (synth as any).triggerAttackRelease(value.notes[0], value.duration, playTime, value.velocity);
                                        }
                                    }
                                }
                            }, toneEvents).start(0);
                            scheduledParts.push(part);
                        }
                    }
                    currentBarOffset += patternBars;
                }
                if (currentBarOffset === startOffset) break; 
            }
        });
        totalBars += maxChainBars;
    }
    
    transport.loop = true;
    transport.loopEnd = `${totalBars}:0:0`;
}