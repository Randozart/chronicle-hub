'use client';
import { PlayerQualities, QualityDefinition, QualityType, ImageDefinition, CategoryDefinition, WorldSettings } from "@/engine/models";
import { useState, useMemo } from "react";
import { useGroupedList } from "@/hooks/useGroupedList";
import { evaluateText } from "@/engine/textProcessor";
import GameImage from "./GameImage";

interface ProfilePanelProps {
    qualities: PlayerQualities;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
    categories: Record<string, CategoryDefinition>;
    // NEW: We need settings to know style preferences
    settings: WorldSettings; 
}

export default function ProfilePanel({ qualities, qualityDefs, imageLibrary, categories, settings }: ProfilePanelProps) {
    const [search, setSearch] = useState("");
    const [groupBy, setGroupBy] = useState("category"); 

    // 1. Extract Identity
    const nameState = qualities['player_name'];
    const portraitState = qualities['player_portrait'];
    const playerName = (nameState?.type === 'S') ? nameState.stringValue : "Unknown Drifter";
    const portraitCode = (portraitState?.type === 'S') ? portraitState.stringValue : "default_avatar";

    // 2. Extract Title (If enabled)
    let playerTitle = "";
    if (settings.enableTitle && settings.titleQualityId) {
        const qid = settings.titleQualityId.replace('$', '');
        const titleState = qualities[qid];
        const titleDef = qualityDefs[qid];
        
        if (titleState) {
            // If it's a String quality, show the value ("The Exiled Prince")
            if (titleState.type === QualityType.String) {
                playerTitle = titleState.stringValue;
            } 
            // If it's a Stat (Renown), show the *Name* of the quality which might be dynamic
            // e.g. Name: "{ $l > 50 : The Legend | The Novice }"
            else if (titleDef) {
                playerTitle = evaluateText(titleDef.name, qualities, qualityDefs);
            }
        }
    }

    // 3. Calculate Portrait Styles
    const showPortrait = settings.enablePortrait !== false;
    const shape = settings.portraitStyle || 'circle';
    
    const portraitStyles: React.CSSProperties = {
        width: shape === 'rect' ? '100px' : '100px',
        height: shape === 'rect' ? '133px' : '100px', // 3:4 ratio for rect
        borderRadius: shape === 'circle' ? '50%' : '8px',
        overflow: 'hidden',
        border: '3px solid var(--accent-primary)',
        boxShadow: '0 0 15px rgba(0,0,0,0.5)',
        flexShrink: 0,
        background: '#000' // Fallback
    };

    // 4. Prepare List
    const flatList = useMemo(() => {
        return Object.keys(qualities)
            .map(qid => {
                const def = qualityDefs[qid];
                const state = qualities[qid];
                if (!def || !state) return null;
                if (def.tags?.includes('hidden')) return null;
                // Hide the title quality itself from the list to avoid duplication? Optional.
                if (qid === settings.titleQualityId?.replace('$', '')) return null; 
                if (def.type === QualityType.Item || def.type === QualityType.Equipable) return null;
                if (state.type !== 'S' && state.level === 0) return null;
                return { ...def, ...state };
            })
            .filter(Boolean as any);
    }, [qualities, qualityDefs, settings.titleQualityId]);

    const grouped = useGroupedList(flatList, groupBy, search);
    const groups = Object.keys(grouped).sort();

    return (
        <div className="profile-container">
            
            {/* PASSPORT HEADER */}
            <div style={{ 
                display: 'flex', gap: '2rem', alignItems: 'center', 
                padding: '2rem', marginBottom: '2rem', 
                background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px' 
            }}>
                {showPortrait && (
                    <div style={portraitStyles}>
                        <GameImage 
                            code={portraitCode} 
                            imageLibrary={imageLibrary} 
                            type="portrait" 
                            alt="Portrait" 
                            className="w-full h-full object-cover" 
                        />
                    </div>
                )}
                
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-primary)' }}>{playerName}</h1>
                    
                    {/* TITLE DISPLAY */}
                    {playerTitle && (
                        <h3 style={{ 
                            margin: '0.25rem 0 0.5rem 0', 
                            color: 'var(--accent-highlight)', 
                            fontSize: '1.1rem', 
                            fontWeight: 'normal',
                            fontFamily: 'var(--font-main)'
                        }}>
                            {playerTitle}
                        </h3>
                    )}
                    
                    <p style={{ margin: '0', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                        A resident of this world.
                    </p>
                </div>
            </div>

            {/* CONTROLS */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search qualities..." className="form-input" style={{ flex: 1 }} />
                <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="form-select" style={{ width: '150px' }}>
                    <option value="category">Category</option>
                    <option value="type">Type</option>
                </select>
            </div>

            <div className="profile-grid">
                {groups.map(cat => {
                    const catDef = categories[cat];
                    const headerColor = catDef?.color || 'var(--accent-highlight)'; 
                    return (
                        <div key={cat} className="quality-category-card">
                            <h3 style={{ textTransform: 'uppercase', fontSize: '0.9rem', marginBottom: '1rem', paddingBottom: '0.5rem', color: headerColor, borderBottom: `1px solid ${headerColor}40` }}>{cat}</h3>
                            <div className="quality-list">
                                {grouped[cat].map((q: any) => (
                                    <div key={q.id} className="profile-quality-item">
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        {q.image && (
                                            <div style={{ width: '30px', flexShrink: 0 }}>
                                                <GameImage code={q.image} imageLibrary={imageLibrary} type="icon" alt={q.name} className="option-image" />
                                            </div>
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                <span className="q-name">{evaluateText(q.name, qualities, qualityDefs)}</span>
                                                <span className="q-val">{q.type === 'S' ? q.stringValue : q.level}</span>
                                            </div>
                                            <p className="q-desc">{evaluateText(q.description, qualities, qualityDefs)}</p>
                                            {q.type === 'P' && (
                                                <div className="mini-progress-bar">
                                                    <div className="fill" style={{ width: `${(q.changePoints / (q.level + 1)) * 100}%` }} />
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