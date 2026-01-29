'use client';
import { useState, useRef } from 'react';
import { useToast } from '@/providers/ToastProvider';

export default function IngestPage() {
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [status, setStatus] = useState<'idle' | 'reading' | 'uploading' | 'complete' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState({ totalLines: 0, inserted: 0, duplicates: 0 });
    const [worldName, setWorldName] = useState("");
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 50));

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Auto-detect world name from filename (e.g. "sunless_sea_dump.jsonl")
        const nameMatch = file.name.match(/^([a-zA-Z0-9]+)/);
        if (nameMatch && !worldName) {
            setWorldName(nameMatch[1].toLowerCase());
        }
    };

    const startIngest = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file || !worldName) {
            showToast("Please select a file and enter a World Name", "error");
            return;
        }

        setStatus('reading');
        setStats({ totalLines: 0, inserted: 0, duplicates: 0 });
        setLogs([]);
        
        const CHUNK_SIZE = 1024 * 1024 * 2; // Read 2MB chunks from disk
        const BATCH_SIZE = 250; // Send 200 JSON lines per API call

        const reader = new FileReader();
        let offset = 0;
        let leftover = "";
        let lineBuffer: string[] = [];
        
        let totalInserted = 0;
        let totalMatched = 0;

        // Helper to send a batch
         const sendBatch = async (lines: string[]) => {
            try {
                const res = await fetch('/api/lazarus/ingest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        world: worldName, 
                        batch: lines,
                        filename: file.name 
                    })
                });
                
                if (!res.ok) throw new Error(`API Error ${res.status}`);
                
                const data = await res.json();
                totalInserted += data.inserted || 0;
                totalMatched += data.matched || 0;
                
                setStats({ 
                    totalLines: offset, // approximate bytes read
                    inserted: totalInserted, 
                    duplicates: totalMatched 
                });
            } catch (err: any) {
                addLog(`Batch Error: ${err.message}`);
            }
        };

        const readNextChunk = () => {
            const slice = file.slice(offset, offset + CHUNK_SIZE);
            reader.readAsText(slice);
        };

        reader.onload = async (e) => {
            if (!e.target?.result) return;
            const text = e.target.result as string;
            
            // Combine leftover from previous chunk with new text
            const allText = leftover + text;
            const lines = allText.split('\n');

            // The last line is likely incomplete, save it for next chunk
            // UNLESS this is the very last chunk
            if (offset + CHUNK_SIZE < file.size) {
                leftover = lines.pop() || "";
            } else {
                leftover = "";
            }

            // Add lines to buffer
            for (const line of lines) {
                if (line.trim()) lineBuffer.push(line);
            }

            // Process full batches
            while (lineBuffer.length >= BATCH_SIZE) {
                const batch = lineBuffer.splice(0, BATCH_SIZE);
                setStatus('uploading');
                await sendBatch(batch);
            }

            offset += CHUNK_SIZE;
            
            // Update Progress UI
            const percent = Math.min(100, Math.round((offset / file.size) * 100));
            setProgress(percent);

            if (offset < file.size) {
                readNextChunk();
            } else {
                // Send remaining buffer
                if (lineBuffer.length > 0) {
                    await sendBatch(lineBuffer);
                }
                setStatus('complete');
                addLog("Ingestion Complete.");
            }
        };

        reader.onerror = () => {
            setStatus('error');
            showToast("Error reading file", "error");
        };

        readNextChunk();
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', color: '#ccc' }}>
            <div style={{ background: '#21252b', padding: '2rem', borderRadius: '8px', border: '1px solid #333' }}>
                <h2 style={{ marginTop: 0, color: '#e5c07b', borderBottom: '1px solid #444', paddingBottom: '1rem' }}>
                    JSONL Ingestion
                </h2>
                <p style={{ fontSize: '0.9rem', marginBottom: '2rem' }}>
                    Upload raw <code>.jsonl</code> dumps from StoryNexus archives. 
                    The system will automatically deduplicate entries based on content hashing.
                </p>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                        <label className="form-label">World ID</label>
                        <input 
                            className="form-input" 
                            value={worldName} 
                            onChange={e => setWorldName(e.target.value)} 
                            placeholder="e.g. fallen_london"
                        />
                    </div>
                    <div style={{ flex: 2 }}>
                        <label className="form-label">Source File</label>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept=".jsonl,.txt" 
                            onChange={handleFileChange}
                            className="form-input"
                            style={{ paddingTop: '6px' }}
                        />
                    </div>
                </div>

                {status !== 'reading' && status !== 'uploading' && (
                    <button 
                        onClick={startIngest}
                        className="save-btn" 
                        style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
                    >
                        Start Ingestion
                    </button>
                )}

                {(status === 'reading' || status === 'uploading' || status === 'complete') && (
                    <div style={{ marginTop: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.8rem' }}>
                            <span>Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <div style={{ width: '100%', height: '10px', background: '#111', borderRadius: '5px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: '#61afef', transition: 'width 0.2s' }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                            <div style={{ background: 'rgba(46, 204, 113, 0.1)', border: '1px solid #2ecc71', padding: '1rem', borderRadius: '4px', textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2ecc71' }}>{stats.inserted}</div>
                                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>New Instances</div>
                            </div>
                            <div style={{ background: 'rgba(243, 156, 18, 0.1)', border: '1px solid #f39c12', padding: '1rem', borderRadius: '4px', textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f39c12' }}>{stats.duplicates}</div>
                                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Duplicates Skipped</div>
                            </div>
                        </div>

                        <div style={{ marginTop: '1rem', maxHeight: '150px', overflowY: 'auto', background: '#111', padding: '1rem', fontSize: '0.75rem', fontFamily: 'monospace', color: '#888' }}>
                            {logs.map((l, i) => <div key={i}>{l}</div>)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}