'use client';

import { useState, useEffect, useMemo } from 'react';
import { QualityDefinition, WorldSettings, CharacterDocument, QualityType, PendingEvent } from '@/engine/models';
import { useToast } from '@/providers/ToastProvider';

interface Props {
    characterId: string;
    storyId: string;
    worldQualities: Record<string, QualityDefinition>;
    settings: WorldSettings | null;
    onClose: () => void;
}

export default function CharacterInspector({ characterId, storyId, worldQualities, settings, onClose }: Props) {
    const [char, setChar] = useState<CharacterDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [searchTerm, setSearchTerm] = useState("");
    useEffect(() => {
        setLoading(true);
        fetch(`/api/admin/character/${characterId}?storyId=${storyId}`)
            .then(async r => {
                if (!r.ok) throw new Error("API Error");
                return r.json();
            })
            .then(setChar)
            .catch(err => {
                console.error(err);
                showToast("Failed to fetch character details.", "error");
            })
            .finally(() => setLoading(false));
    }, [characterId, storyId, showToast]);

    const handleUpdateQuality = async (qid: string, newVal: number | string) => {
        try {
            const res = await fetch(`/api/admin/character/update`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ storyId, characterId, qualityId: qid, value: newVal })
            });
            if(res.ok) {
                setChar(prev => {
                    if(!prev) return null;
                    const next = { ...prev, qualities: { ...prev.qualities } };
                    if(next.qualities[qid]) {
                        if(typeof newVal === 'string') (next.qualities[qid] as any).stringValue = newVal;
                        else (next.qualities[qid] as any).level = Number(newVal);
                    }
                    return next;
                });
                showToast(`Updated ${qid}`, "success");
            } else {
                showToast("Failed to update.", "error");
            }
        } catch(e) { console.error(e); }
    };

    if (!char && !loading) return null;

    const getActionCount = () => {
        const q = Object.values(char?.qualities || {}).find(q => q.qualityId === '$actions' || q.qualityId.endsWith('actions'));
        if (q && 'level' in q) return q.level;
        return 0;
    };

    const resolveInspectorName = () => {
        if (char?.name && char.name !== "Unknown") return char.name;
        if (settings?.playerName) {
            const rawId = settings.playerName;
            const cleanId = rawId.replace('$', '');
            const qState = char?.qualities[cleanId] || char?.qualities[rawId];
            if (qState) {
                if ((qState.type as string) === 'S' || qState.type === QualityType.String) {
                    return (qState as any).stringValue;
                }
            }
        }
        return "Unknown Character";
    };

    const categories = useMemo(() => {
        if (!char) return [];
        const cats = new Set<string>();
        cats.add("All");
        cats.add("Living Stories");
        Object.values(char.qualities).forEach(state => {
            const def = char.dynamicQualities?.[state.qualityId] || worldQualities[state.qualityId] || {};
            const catStr = def.category || "Uncategorized";
            const primary = catStr.split(',')[0].trim();
            cats.add(primary);
        });
        return Array.from(cats).sort();
    }, [char, worldQualities]);

    const filteredQualities = useMemo(() => {
        if (!char || selectedCategory === "Living Stories") return [];
        
        return Object.entries(char.qualities)
            .filter(([qid, state]) => {
                const def = char.dynamicQualities?.[qid] || worldQualities[qid] || {};
                
                if (searchTerm && !qid.toLowerCase().includes(searchTerm.toLowerCase()) && !def.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                
                if (selectedCategory !== "All") {
                    const catStr = def.category || "Uncategorized";
                    const cats = catStr.split(',').map(c => c.trim());
                    if (!cats.includes(selectedCategory)) return false;
                }
                return true;
            })
            .sort((a, b) => a[0].localeCompare(b[0]));
    }, [char, selectedCategory, searchTerm, worldQualities]);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div style={{ 
                width: '90vw', maxWidth: '1400px', height: '90vh', background: 'var(--bg-panel)', 
                borderRadius: 'var(--border-radius)', border: '1px solid var(--tool-border)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                boxShadow: 'var(--shadow-modal)'
            }}>
                {loading ? (
                    <div style={{ padding: '2rem', color: 'var(--tool-text-main)', textAlign: 'center' }}>Loading character data...</div>
                ) : char && (
                    <>
                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--tool-border)', background: 'var(--tool-bg-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div><h2 style={{ margin: 0, color: 'var(--tool-text-header)', fontSize: '1.4rem' }}>{resolveInspectorName()}</h2></div>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
                                    <div style={{ background: 'var(--tool-bg-input)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--tool-border)' }}>
                                        <span style={{color:'var(--tool-accent)'}}>{worldQualities[char.currentLocationId]?.name || char.currentLocationId}</span>
                                    </div>
                                    <div style={{ background: 'var(--tool-bg-input)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--tool-border)' }}>
                                        <span style={{color:'var(--warning-color)'}}>{getActionCount()} Actions</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tool-text-header)', fontSize: '1.5rem', cursor: 'pointer', opacity: 0.7 }} className="hover:opacity-100">✕</button>
                        </div>
                        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                            <div style={{ width: '250px', background: 'var(--tool-bg-sidebar)', borderRight: '1px solid var(--tool-border)', overflowY: 'auto' }}>
                                <div style={{ padding: '1rem', borderBottom: '1px solid var(--tool-border)' }}>
                                    <input 
                                        type="text" 
                                        placeholder="Search qualities..." 
                                        value={searchTerm} 
                                        onChange={e => setSearchTerm(e.target.value)} 
                                        className="form-input"
                                        style={{ width: '100%', padding: '6px 10px', fontSize: '0.85rem' }}
                                    />
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {categories.map(cat => (
                                        <li 
                                            key={cat} 
                                            onClick={() => setSelectedCategory(cat)} 
                                            style={{ 
                                                padding: '10px 1.5rem', cursor: 'pointer', 
                                                background: selectedCategory === cat ? 'var(--tool-bg-input)' : 'transparent', 
                                                borderLeft: selectedCategory === cat ? '3px solid var(--tool-accent)' : '3px solid transparent', 
                                                color: selectedCategory === cat ? 'var(--tool-text-header)' : 'var(--tool-text-dim)', 
                                                fontSize: '0.9rem', 
                                                fontWeight: selectedCategory === cat ? 'bold' : 'normal' 
                                            }}
                                        >
                                            {cat}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--tool-bg-dark)' }}>
                                {selectedCategory === "Living Stories" ? (
                                    <div style={{ padding: '2rem' }}>
                                        <h3 style={{ marginTop: 0, color: 'var(--warning-color)', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>Living Stories Queue</h3>
                                        {!char.pendingEvents || char.pendingEvents.length === 0 ? (
                                            <p style={{ fontStyle: 'italic', color: 'var(--tool-text-dim)' }}>No events queued.</p>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '1rem' }}>
                                                {char.pendingEvents.map((evt: PendingEvent, idx: number) => (
                                                    <div key={idx} style={{ background: 'var(--tool-bg-input)', padding: '1rem', borderRadius: '4px', borderLeft: '4px solid var(--warning-color)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                            <strong style={{ color: 'var(--warning-color)', fontSize: '1.1rem' }}>{evt.targetId}</strong>
                                                            <span style={{ fontSize: '0.9rem', color: 'var(--tool-text-dim)' }}>Due: {new Date(evt.triggerTime).toLocaleString()}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--tool-text-main)' }}>
                                                            <span>Op: <code>{evt.op} {evt.value}</code></span>
                                                            <span>Scope: <code>{evt.scope}</code></span>
                                                            {evt.recurring && <span style={{ color: 'var(--success-color)' }}>↻ Recurring ({evt.intervalMs}ms)</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ padding: '1rem 2rem', background: 'var(--tool-bg-header)', borderBottom: '1px solid var(--tool-border)', position: 'sticky', top: 0, zIndex: 10 }}>
                                            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--tool-text-header)' }}>
                                                {selectedCategory === "All" ? "All Qualities" : selectedCategory} 
                                                <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: 'var(--tool-text-dim)', fontWeight: 'normal' }}>({filteredQualities.length})</span>
                                            </h3>
                                            <p className = 'special-desc' style={{ color: 'var(--tool-text-dim)', marginTop: 0, marginBottom: 0}}>Qualities marked as <span style={{ fontSize: '0.6rem', background: 'var(--tool-accent-mauve)', color: '#000', padding: '2px 4px', borderRadius: '2px', height: 'fit-content', fontWeight: 'bold' }}>DYN</span> are created during runtime, and do not fall back on a Quality Definition</p>
                                        </div>
                                        <div style={{ padding: '1rem 2rem' }}>
                                            {filteredQualities.length === 0 ? (
                                                <p style={{ color: 'var(--tool-text-dim)', fontStyle: 'italic' }}>No qualities found in this category.</p>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                                    {filteredQualities.map(([qid, state]) => {
                                                        const isDynamic = !!char.dynamicQualities?.[qid] || !worldQualities[qid];
                                                        const def = char.dynamicQualities?.[qid] || worldQualities[qid] || {};
                                                        
                                                        const isString = (state.type as string) === 'S' || state.type === QualityType.String; 
                                                        const hasLevel = 'level' in state;
                                                        const hasCP = 'changePoints' in state;
                                                        
                                                        return (
                                                            <div key={qid} style={{ background: 'var(--tool-bg-input)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--tool-border)' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                                    <div style={{ overflow: 'hidden' }}>
                                                                        <div style={{ fontWeight: 'bold', color: 'var(--tool-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={def.name || qid}>
                                                                            {def.name || qid}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.75rem', color: 'var(--tool-text-dim)', fontFamily: 'monospace', display: 'flex', gap: '5px' }}>
                                                                            <span style={{ color: 'var(--tool-accent)' }}>${qid}</span>
                                                                        </div>
                                                                    </div>
                                                                    {isDynamic && <span style={{ fontSize: '0.6rem', background: 'var(--tool-accent-mauve)', color: '#000', padding: '2px 4px', borderRadius: '2px', height: 'fit-content', fontWeight: 'bold' }}>DYN</span>}
                                                                </div>

                                                                <div style={{ marginTop: '0.5rem' }}>
                                                                    {isString ? (
                                                                         <input 
                                                                            className="form-input"
                                                                            defaultValue={(state as any).stringValue} 
                                                                            onBlur={(e) => { if (e.target.value !== (state as any).stringValue) handleUpdateQuality(qid, e.target.value); }} 
                                                                            style={{ width: '100%', color: 'var(--warning-color)' }}
                                                                        />
                                                                    ) : (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <input 
                                                                                type="number" 
                                                                                className="form-input"
                                                                                defaultValue={hasLevel ? state.level : 0} 
                                                                                onBlur={(e) => { const val = parseFloat(e.target.value); if (!isNaN(val) && val !== (state as any).level) handleUpdateQuality(qid, val); }} 
                                                                                style={{ width: '100px', color: 'var(--success-color)', textAlign: 'right', fontWeight: 'bold' }}
                                                                            />
                                                                            {(state as any).type === 'P' && hasCP && <span style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)' }}>CP: {(state as any).changePoints}</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}