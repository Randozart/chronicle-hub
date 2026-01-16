'use client';
import { PlayerQualities, QualityDefinition, QualityType, ImageDefinition, CategoryDefinition, WorldSettings } from "@/engine/models";
import { useState, useMemo } from "react";
import { useGroupedList } from "@/hooks/useGroupedList";
import { evaluateText } from "@/engine/textProcessor";
import GameImage from "./GameImage";
import { GameEngine } from '@/engine/gameEngine';
import FormattedText from "./FormattedText"; 

interface ProfilePanelProps {
    qualities: PlayerQualities;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
    categories: Record<string, CategoryDefinition>;
    settings: WorldSettings; 
    showHidden?: boolean; 
}

export default function ProfilePanel({ qualities, qualityDefs, imageLibrary, categories, settings, showHidden }: ProfilePanelProps) {
    const [search, setSearch] = useState("");
    const [groupBy, setGroupBy] = useState("category"); 

    const engine = useMemo(() => new GameEngine(
        qualities, 
        { qualities: qualityDefs, settings } as any, 
        {}
    ), [qualities, qualityDefs, settings]);
    const hideIdentity = settings.hideProfileIdentity === true;
    const nameState = qualities['player_name'];
    const portraitState = qualities['player_portrait'];
    const playerName = !hideIdentity && (nameState?.type === 'S') ? nameState.stringValue : "Unknown Drifter";
    const portraitCode = !hideIdentity && (portraitState?.type === 'S') ? portraitState.stringValue : "default_avatar";
    let playerTitle = "";
    if (!hideIdentity && settings.enableTitle && settings.titleQualityId) {
        const qid = settings.titleQualityId.replace('$', '');
        const titleState = qualities[qid];
        const titleDef = qualityDefs[qid];
        
        if (titleState) {
            if (titleState.type === QualityType.String) {
                playerTitle = titleState.stringValue;
            } 
            else if (titleDef) {
                playerTitle = evaluateText(titleDef.name, qualities, qualityDefs, null, 0);
            }
        }
    }

    const showPortrait = !hideIdentity && settings.enablePortrait !== false;
    const shape = settings.portraitStyle || 'circle';
    const sizeSetting = settings.portraitSize || 'medium';
    const sizeMap: Record<string, string> = {
        small: '80px',
        medium: '150px',
        large: '250px'
    };
    
    const portraitWidth = sizeMap[sizeSetting] || '150px';
    
    const flatList = useMemo(() => {
        return Object.keys(qualities)
            .map(qid => {
                const def = qualityDefs[qid];
                const state = qualities[qid];
                if (!def || !state) return null;

                const merged = { ...def, ...state };
                const rendered = engine.render(merged);
                
                const tags = Array.isArray(rendered.tags) ? rendered.tags : [];
                
                const shouldHide = tags.includes('hidden') || 
                                   tags.includes('no_ui') || 
                                   tags.includes('fx_only');

                if (shouldHide && !showHidden) return null;

                if (qid === settings.titleQualityId?.replace('$', '')) return null; 
                if (def.type === QualityType.Item || def.type === QualityType.Equipable) return null;
                
                const hasEquippedBonus = Object.values(engine.equipment).some(id => id && qualityDefs[id]?.bonus?.includes(`$${qid}`));
                
                if (state.type !== 'S' && state.level === 0 && !hasEquippedBonus) return null;
                
                return rendered;
            })
            .filter(Boolean as any);
    }, [qualities, qualityDefs, settings.titleQualityId, engine, showHidden]);

    const grouped = useGroupedList(flatList, groupBy, search);
    const groups = Object.keys(grouped).sort();

    return (
        <div className="profile-container">
           {!hideIdentity ? (
                <div className="profile-header">
                    {showPortrait && (
                        <div 
                            className="profile-portrait" 
                            data-shape={shape}
                            style={{ 
                                width: portraitWidth,
                                aspectRatio: shape === 'rect' ? '3/4' : '1/1',
                                flexShrink: 0
                            }} 
                        >
                            <GameImage 
                                code={portraitCode} 
                                imageLibrary={imageLibrary} 
                                type="portrait" 
                                settings={settings}
                                shapeOverride={shape}
                                alt="Portrait" 
                                className="w-full h-full object-cover" 
                            />
                        </div>
                    )}
                    <div className="profile-identity">
                        <h1 className="profile-name"><FormattedText text={playerName} /></h1>
                        {playerTitle && (
                            <h3 className="profile-title"><FormattedText text={playerTitle} /></h3>
                        )}
                        <p className="profile-subtitle">A resident of this world.</p>
                    </div>
                </div>
            ) : (
                 <h1 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem', fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                     Qualities
                 </h1>
            )}

            <div className="profile-controls">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search qualities..." className="form-input profile-search" />
                <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="form-select profile-sort">
                    <option value="category">Category</option>
                    <option value="type">Type</option>
                </select>
            </div>

            <div className="profile-grid">
                {groups.map(cat => {
                    const catDef = categories[cat];
                    const displayName = catDef?.name || cat; 
                    const headerColor = catDef?.color || 'var(--accent-highlight)'; 
                    
                    return (
                        <div key={cat} className="quality-category-card">
                            <h3 className="profile-category-header" style={{ '--category-color': headerColor } as React.CSSProperties}>
                                <FormattedText text={displayName} />
                            </h3>
                            <div className="quality-list">
                                {grouped[cat].map((q: any) => {
                                    const hideLevel = q.tags?.includes('hide_level');
                                    return (
                                        <div key={q.id} className="profile-quality-item">
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                {q.image && (
                                                    <div style={{ width: '30px', flexShrink: 0 }}>
                                                        <GameImage code={q.image} imageLibrary={imageLibrary} type="icon" alt={q.name} className="option-image" />
                                                    </div>
                                                )}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                        <span className="q-name"><FormattedText text={q.name} /></span> 
                                                        {!hideLevel && (
                                                            <span className="q-val">{q.type === 'S' ? q.stringValue : q.level}</span>
                                                        )}
                                                    </div>
                                                    <div className="q-desc">
                                                        <FormattedText text={q.description} />
                                                    </div>
                                                    {q.type === 'P' && (
                                                        <div className="mini-progress-bar">
                                                            <div className="fill" style={{ width: `${(q.changePoints / (q.level + 1)) * 100}%` }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                {groups.length === 0 && <p className="no-qualities-text">No qualities found.</p>}
            </div>
        </div>
    );
}