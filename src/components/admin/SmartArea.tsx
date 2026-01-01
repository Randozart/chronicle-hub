// src/components/admin/SmartArea.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import SparkleIcon from '@/components/icons/SparkleIcon';
import ScribeAssistant from '@/components/admin/ScribeAssistant';
import dynamic from 'next/dynamic';
import { LintError, lintScribeScript } from '@/engine/audio/linter';
import { QualityDefinition, PlayerQualities, QualityType, WorldConfig } from '@/engine/models';
import { evaluateText } from '@/engine/textProcessor';
import { GameEngine } from '@/engine/gameEngine';

const ScribeEditor = dynamic(() => import('@/components/admin/ScribeEditor'), { 
    ssr: false,
    loading: () => <div style={{ minHeight: '38px', background: '#111', borderRadius: '4px', border: '1px solid #333' }} />
});

interface Props {
    label?: string;
    value: string;
    onChange: (val: string) => void;
    storyId: string;
    placeholder?: string;
    minHeight?: string;
    mode?: 'text' | 'condition' | 'effect';
    subLabel?: string;
    initialTab?: 'variable' | 'conditional' | 'challenge' | 'random' | 'effect' | 'timer';
    contextQualityId?: string; 
    qualityDefs?: QualityDefinition[];
}

export default function SmartArea({ 
    label, value, onChange, storyId, placeholder, 
    minHeight = "38px", mode = 'text', subLabel, initialTab, 
    contextQualityId, qualityDefs = [] 
}: Props) {
    const [showAssistant, setShowAssistant] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [errors, setErrors] = useState<LintError[]>([]);
    const [previewResult, setPreviewResult] = useState<string>("");

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowAssistant(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Linting Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!value) {
                setErrors([]);
                return;
            }
            let lintContext: 'text' | 'effect' | 'condition' = 'text';
            if (mode === 'effect') lintContext = 'effect';
            else if (mode === 'condition') lintContext = 'condition';

            const newErrors = lintScribeScript(value, lintContext, qualityDefs);
            setErrors(newErrors);
        }, 500);

        return () => clearTimeout(timer);
    }, [value, mode, qualityDefs]);

    // Quick Eval Logic
    useEffect(() => {
        if (!showPreview) return;
        
        const timer = setTimeout(() => {
            try {
                const mockQualities: PlayerQualities = {};
                const defMap: Record<string, QualityDefinition> = {};
                
                qualityDefs.forEach(q => {
                    defMap[q.id] = q;
                    mockQualities[q.id] = {
                        qualityId: q.id,
                        type: q.type,
                        level: 1, 
                        stringValue: "Test Value",
                        changePoints: 0
                    } as any;
                });

                const selfContext = contextQualityId ? { qid: contextQualityId, state: mockQualities[contextQualityId] || null } : null;

                if (mode === 'effect') {
                    const mockConfig: WorldConfig = {
                        qualities: defMap,
                        locations: {}, decks: {}, settings: {} as any, char_create: {}, images: {},
                        categories: {}, regions: {}, markets: {}, instruments: {}, music: {}
                    };
                    
                    const engine = new GameEngine(mockQualities, mockConfig);
                    engine.applyEffects(value);
                    
                    if (engine.executedEffectsLog.length > 0) {
                        setPreviewResult(engine.executedEffectsLog.join('\n'));
                    } else {
                        setPreviewResult("No effects executed.");
                    }

                } else {
                    const result = evaluateText(value, mockQualities, defMap, selfContext, 50, {});
                    setPreviewResult(result);
                }

            } catch (e: any) {
                setPreviewResult(`[Error: ${e.message}]`);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [value, showPreview, qualityDefs, contextQualityId, mode]);

    const handleInsert = (text: string) => {
        const prefix = (value && value.length > 0 && !/\s$/.test(value)) ? " " : "";
        onChange(value + prefix + text);
    };

    return (
        <div className="form-group" ref={containerRef} style={{ position: 'relative', zIndex: showAssistant ? 50 : 1 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.25rem', minHeight: '20px' }}>
                {(label || subLabel) ? (
                    <div>
                        {label && <label className="form-label" style={{ margin: 0 }}>{label}</label>}
                        {subLabel && <p style={{ fontSize: '0.7rem', color: '#666', margin: 0 }}>{subLabel}</p>}
                    </div>
                ) : <div />}
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                    {errors.length > 0 && (
                        <span style={{ color: '#e06c75', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            {errors.length} Issue{errors.length > 1 ? 's' : ''}
                        </span>
                    )}
                    
                    <button 
                        onClick={() => setShowPreview(!showPreview)}
                        style={{ 
                            background: showPreview ? '#98c379' : 'transparent', 
                            color: showPreview ? '#000' : '#98c379',
                            border: '1px solid #98c379', borderRadius: '4px', 
                            cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold',
                            padding: '2px 6px', transition: 'all 0.1s'
                        }}
                        type="button"
                        title="Toggle Live Preview"
                    >
                        ▶
                    </button>

                    <button 
                        onClick={() => setShowAssistant(!showAssistant)}
                        style={{ 
                            background: showAssistant ? 'rgba(97, 175, 239, 0.2)' : 'transparent', 
                            border: '1px solid #61afef', borderRadius: '4px', color: '#61afef', 
                            cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 8px',
                            transition: 'all 0.1s'
                        }}
                        type="button"
                        title="Open Scribe Assistant"
                    >
                        <SparkleIcon className="w-3 h-3" /> Logic
                    </button>
                </div>
            </div>

            {showAssistant && (
                <ScribeAssistant 
                    storyId={storyId} 
                    mode={mode} 
                    onInsert={handleInsert} 
                    onClose={() => setShowAssistant(false)}
                    initialTab={initialTab}
                    contextQualityId={contextQualityId}
                />
            )}

            <div style={{ border: '1px solid #333', borderRadius: '4px', overflow: 'hidden' }}>
                <ScribeEditor 
                    value={value} 
                    onChange={onChange} 
                    minHeight={minHeight}
                    placeholder={placeholder}
                    language="scribescript"
                    errors={errors}
                    mode={mode} 
                />
            </div>
            
            {showPreview && (
                <div style={{ 
                    marginTop: '5px', padding: '8px', 
                    background: '#21252b', borderLeft: '3px solid #98c379', borderRadius: '0 4px 4px 0',
                    color: '#abb2bf', fontSize: '0.85rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap'
                }}>
                    <strong style={{ color: '#98c379', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                        {mode === 'effect' ? "Trace Log:" : "Preview:"}
                    </strong><br/>
                    {previewResult || <span style={{ color: '#555' }}>(Empty)</span>}
                </div>
            )}

            {/* ERROR DISPLAY FIX: Show count if more than 1 */}
            {errors.length > 0 && !showPreview && (
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#e06c75', fontFamily: 'monospace' }}>
                    <div>Line {errors[0].line}: {errors[0].message}</div>
                    {errors.length > 1 && (
                        <div style={{ opacity: 0.7, fontStyle: 'italic', marginTop: '2px' }}>
                            ...and {errors.length - 1} more issues.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}