'use client';

import { PlayerQualities, QualityDefinition, QualityType } from "@/engine/models";
import { useState, useMemo } from "react";
import { useGroupedList } from "@/hooks/useGroupedList"; // Create this file

interface ProfilePanelProps {
    qualities: PlayerQualities;
    qualityDefs: Record<string, QualityDefinition>;
}

export default function ProfilePanel({ qualities, qualityDefs }: ProfilePanelProps) {
    const [search, setSearch] = useState("");
    const [groupBy, setGroupBy] = useState("category"); // Default

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

    return (
        <div className="profile-container">
            {/* HEADER CONTROLS */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #444', paddingBottom: '1rem' }}>
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
                {groups.map(cat => (
                    <div key={cat} className="quality-category-card">
                        <h3 style={{ textTransform: 'uppercase', color: '#98c379', fontSize: '0.9rem', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                            {cat}
                        </h3>
                        <div className="quality-list">
                            {grouped[cat].map((q: any) => (
                                <div key={q.id} className="profile-quality-item">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <span className="q-name">{q.name}</span>
                                        <span className="q-val">
                                            {q.type === 'S' ? q.stringValue : q.level}
                                        </span>
                                    </div>
                                    <p className="q-desc">{q.description}</p>
                                    {/* Progress Bar */}
                                    {q.type === 'P' && (
                                        <div className="mini-progress-bar">
                                            <div className="fill" style={{ width: `${(q.changePoints / (q.level + 1)) * 100}%` }} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {groups.length === 0 && <p style={{ color: '#777' }}>No qualities found.</p>}
            </div>
        </div>
    );
}