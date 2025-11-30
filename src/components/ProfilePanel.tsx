'use client';

import { PlayerQualities, QualityDefinition, QualityType, ImageDefinition, CategoryDefinition } from "@/engine/models";
import { useState, useMemo } from "react";
import { useGroupedList } from "@/hooks/useGroupedList";
import GameImage from "./GameImage";
import { evaluateText } from "@/engine/textProcessor";

interface ProfilePanelProps {
    qualities: PlayerQualities;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
    categories: Record<string, CategoryDefinition>;
}

export default function ProfilePanel({ qualities, qualityDefs, imageLibrary, categories }: ProfilePanelProps) {
    const [search, setSearch] = useState("");
    const [groupBy, setGroupBy] = useState("category"); 

    // Prepare Data
    const flatList = useMemo(() => {
        return Object.keys(qualities)
            .map(qid => {
                const def = qualityDefs[qid];
                const state = qualities[qid];
                if (!def || !state) return null;
                if (def.properties?.includes('hidden')) return null;
                if (def.type === QualityType.Item || def.type === QualityType.Equipable) return null;
                if (state.type !== 'S' && state.level === 0) return null;
                
                return { ...def, ...state };
            })
            .filter(Boolean as any);
    }, [qualities, qualityDefs]);

    const grouped = useGroupedList(flatList, groupBy, search);
    const groups = Object.keys(grouped).sort();
    
    const nameState = qualities['player_name'];
    const portraitState = qualities['player_portrait'];

    const playerName = (nameState?.type === 'S') ? nameState.stringValue : "Unknown Drifter";
    const portraitCode = (portraitState?.type === 'S') ? portraitState.stringValue : "default_avatar";

    return (
        <div className="profile-container">
            
            {/* NEW: PASSPORT HEADER */}
            <div style={{ 
                display: 'flex', gap: '2rem', alignItems: 'center', 
                padding: '2rem', marginBottom: '2rem', 
                background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px' 
            }}>
                <div style={{ 
                    width: '100px', height: '100px', borderRadius: '50%', 
                    overflow: 'hidden', border: '3px solid var(--accent-primary)',
                    boxShadow: '0 0 15px rgba(0,0,0,0.5)'
                }}>
                    <GameImage 
                        code={portraitCode} 
                        imageLibrary={imageLibrary} 
                        type="portrait" 
                        alt="Player Portrait"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-primary)' }}>{playerName}</h1>
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        {/* Optional: Add a 'title' quality if you want, e.g. "The Exiled Prince" */}
                         A resident of this world.
                    </p>
                </div>
            </div>

            {/* HEADER CONTROLS */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <input 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search qualities..."
                    className="form-input"
                    style={{ flex: 1 }}
                />
                <select 
                    value={groupBy}
                    onChange={e => setGroupBy(e.target.value)}
                    className="form-select"
                    style={{ width: '150px' }}
                >
                    <option value="category">Category</option>
                    <option value="type">Type</option>
                </select>
            </div>

            <div className="profile-grid">
                {groups.map(cat => {
                    // Lookup Color
                    // Note: 'cat' might be "npc.trader" or just "npc" depending on your grouping logic.
                    // We try to find exact match, or fallback to default.
                    const catDef = categories[cat];
                    const headerColor = catDef?.color || 'var(--accent-highlight)'; 

                    return (
                        <div key={cat} className="quality-category-card">
                            <h3 style={{ 
                                textTransform: 'uppercase', 
                                fontSize: '0.9rem', 
                                marginBottom: '1rem', 
                                paddingBottom: '0.5rem',
                                color: headerColor, 
                                borderBottom: `1px solid ${headerColor}40` // 25% opacity border
                            }}>
                                {cat}
                            </h3>
                            
                            <div className="quality-list">
                                {grouped[cat].map((q: any) => (
                                    <div key={q.id} className="profile-quality-item">
                                    
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        
                                        {q.image && (
                                            <div style={{ width: '30px', flexShrink: 0 }}>
                                                <GameImage 
                                                    code={q.image} 
                                                    imageLibrary={imageLibrary} 
                                                    type="icon" 
                                                    alt={q.name}
                                                    className="option-image"
                                                />
                                            </div>
                                        )}
                                        <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <span className="q-name">
                                                {evaluateText(q.name, qualities, qualityDefs)}
                                            </span>
                                            <span className="q-val">
                                                {q.type === 'S' ? q.stringValue : q.level}
                                            </span>
                                        </div>
                                        <p className="q-desc">
                                            {evaluateText(q.description, qualities, qualityDefs)}
                                        </p>
                                            
                                            {/* Progress Bar */}
                                            {q.type === 'P' && (
                                                <div className="mini-progress-bar">
                                                    <div 
                                                        className="fill" 
                                                        style={{ width: `${(q.changePoints / (q.level + 1)) * 100}%` }} 
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                 </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                
                {groups.length === 0 && <p style={{ color: '#777' }}>No qualities found.</p>}
            </div>
        </div>
    );
}