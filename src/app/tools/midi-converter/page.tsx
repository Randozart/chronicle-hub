'use client';

import { useState } from 'react';
import { Midi } from '@tonejs/midi';
import dynamic from 'next/dynamic';
import { convertMidiToLigature } from '@/engine/audio/midiConverter'; 

const ScribeEditor = dynamic(() => import('@/components/admin/ScribeEditor'), { ssr: false });

export default function MidiConverterPage() {
    const [ligatureSource, setLigatureSource] = useState<string>('');
    const [status, setStatus] = useState<string>('Upload a .mid file to begin.');
    const [optTolerance, setOptTolerance] = useState<0 | 1 | 2 | 3>(2);

    // --- NEW STATE FOR USER OVERRIDES ---
    const [options, setOptions] = useState({
        grid: 4,
        bpm: 0, // 0 means 'auto'
        scaleRoot: 'auto',
        scaleMode: 'major'
    });

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setStatus(`Parsing "${file.name}"...`);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const midi = new Midi(arrayBuffer);
            
            // Pass the user options to the converter
            const { source, warnings, detected } = convertMidiToLigature(midi, options);

            setLigatureSource(source);
            
            // Update UI with detected values if they were on auto
            if (options.bpm === 0) setOptions(prev => ({ ...prev, bpm: detected.bpm }));
            if (options.scaleRoot === 'auto') {
                const [root, mode] = detected.key.split(' ');
                setOptions(prev => ({ ...prev, scaleRoot: root, scaleMode: mode }));
            }
            
            let finalStatus = "Conversion successful!";
            if (warnings.length > 0) {
                finalStatus += `\nDetected: ${detected.key} @ ${detected.bpm} BPM.\nWarnings:\n- ${warnings.join('\n- ')}`;
            }
            setStatus(finalStatus);

        } catch (e: any) {
            setStatus(`Error: ${e.message}`);
        }
    };

    return (
        <div style={{ padding: '2rem', background: '#181a1f', minHeight: '100vh', color: '#ccc' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <h1 style={{ color: '#61afef' }}>MIDI to Ligature Converter</h1>
                <p style={{ color: '#888', marginBottom: '2rem' }}>
                    Upload a .mid file. Adjust the settings to fine-tune the conversion.
                </p>

                <div style={{ background: '#21252b', padding: '2rem', borderRadius: '8px', border: '1px solid #333' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">MIDI File</label>
                            <input type="file" accept=".mid,.midi" onChange={handleFileChange} className="form-input"/>
                        </div>
                        <div className="form-group">
                            <label className="form-label">BPM (0=auto)</label>
                            <input type="number" value={options.bpm} onChange={e => setOptions({...options, bpm: parseInt(e.target.value)})} className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Key Root</label>
                            <select value={options.scaleRoot} onChange={e => setOptions({...options, scaleRoot: e.target.value})} className="form-select">
                                <option value="auto">Auto-Detect</option>
                                <option>C</option><option>C#</option><option>D</option><option>D#</option><option>E</option><option>F</option><option>F#</option><option>G</option><option>G#</option><option>A</option><option>A#</option><option>B</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Key Mode</label>
                            <select value={options.scaleMode} onChange={e => setOptions({...options, scaleMode: e.target.value})} className="form-select">
                                <option value="major">Major</option>
                                <option value="minor">Minor</option>
                                <option value="dorian">Dorian</option>
                                {/* Add more modes later */}
                            </select>
                        </div>
                    </div>
                    <pre style={{ margin: '1rem 0', padding: '1rem', background: '#111', borderRadius: '4px', fontSize: '0.8rem', color: '#777', whiteSpace: 'pre-wrap' }}>
                        {status}
                    </pre>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#aaa' }}>
                            Optimization Aggression
                        </label>

                        <input
                            type="range"
                            min={0}
                            max={3}
                            step={1}
                            value={optTolerance}
                            onChange={e => setOptTolerance(Number(e.target.value) as any)}
                        />

                        <span style={{ fontSize: '0.8rem', color: '#61afef' }}>
                            {['Strict', 'Conservative', 'Balanced', 'Aggressive'][optTolerance]}
                        </span>

                        <button
                            disabled={!ligatureSource}
                            onClick={() => {
                            try {
                                const { optimizeLigatureSource } = require('@/engine/audio/optimizeSource');
                                const optimized = optimizeLigatureSource(ligatureSource, optTolerance);
                                setLigatureSource(optimized);
                                setStatus('Optimization applied.');
                            } catch (e: any) {
                                setStatus('Optimization error: ' + e.message);
                            }
                            }}
                            style={{
                            marginLeft: 'auto',
                            background: '#56B6C2',
                            color: '#000',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                            }}
                        >
                            Optimize Ligature
                        </button>
                        </div>
                </div>
                
                {ligatureSource && (
                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ color: '#98c379' }}>Generated Ligature Code</h3>
                        <ScribeEditor
                            value={ligatureSource}
                            onChange={setLigatureSource}
                            language="ligature"
                            minHeight="400px"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}