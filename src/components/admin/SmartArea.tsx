'use client';

import { useState, useRef, useEffect } from 'react';
import SparkleIcon from '@/components/icons/SparkleIcon';
import ScribeAssistant from '@/components/admin/ScribeAssistant';
import dynamic from 'next/dynamic';
import { LintError, lintScribeScript } from '@/engine/audio/linter';
import { QualityDefinition, PlayerQualities, WorldConfig } from '@/engine/models';
import { evaluateText } from '@/engine/textProcessor';
import { GameEngine } from '@/engine/gameEngine';
const ScribeEditor = dynamic(() => import('@/components/admin/ScribeEditor'), { 
    ssr: false,
    loading: () => (
        <div style={{ 
            height: '100%', minHeight: '38px', 
            background: 'var(--tool-bg-input)', 
            borderRadius: 'var(--border-radius)', 
            border: '1px solid var(--tool-border)' 
        }} />
    )
});

interface Props {
    label?: React.ReactNode;
    value: string;
    onChange: (val: string) => void;
    storyId: string;
    placeholder?: string;
    minHeight?: string;
    mode?: 'text' | 'condition' | 'effect';
    subLabel?: React.ReactNode; 
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
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowAssistant(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
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

    const hasErrors = errors.length > 0;

    return (
        <div className="form-group" ref={containerRef} style={{ position: 'relative', zIndex: showAssistant ? 50 : 1 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.25rem', minHeight: '20px' }}>
                {(label || subLabel) ? (
                    <div>
                        {label && <label className="form-label" style={{ margin: 0, color: 'var(--tool-text-main)'}}>{label}</label>}
                        {subLabel && <p style={{ fontSize: '0.7rem', color: 'var(--tool-text-dim)', margin: 0 }}>{subLabel}</p>}
                    </div>
                ) : <div />}
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                    {hasErrors && (
                        <span style={{ color: 'var(--danger-color)', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            {errors.length} Issue{errors.length > 1 ? 's' : ''}
                        </span>
                    )}
                    <button 
                        onClick={() => setShowPreview(!showPreview)}
                        style={{ 
                            background: showPreview ? 'var(--success-color)' : 'transparent', 
                            color: showPreview ? '#000' : 'var(--success-color)',
                            border: '1px solid var(--success-color)', borderRadius: '4px', 
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
                            background: showAssistant ? 'var(--tool-accent-fade)' : 'transparent', 
                            border: '1px solid var(--tool-accent)', borderRadius: '4px', 
                            color: 'var(--tool-accent)', 
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
            <div 
                className={hasErrors ? 'editor-has-errors' : ''}
                style={{ 
                    border: hasErrors ? '1px solid var(--danger-color)' : '1px solid var(--tool-border)', 
                    borderRadius: 'var(--border-radius)', 
                    overflow: 'hidden',
                    background: 'var(--tool-bg-input)'
                }}
            >
                <ScribeEditor 
                    value={value} 
                    onChange={onChange} 
                    minHeight={minHeight}
                    placeholder={placeholder}
                    language="scribescript"
                    errors={errors}
                    mode={mode} 
                    showLineNumbers={hasErrors} 
                />
            </div>
            
            {showPreview && (
                <div style={{ 
                    marginTop: '5px', padding: '8px', 
                    background: 'var(--tool-bg-sidebar)', 
                    borderLeft: '3px solid var(--success-color)', borderRadius: '0 4px 4px 0',
                    color: 'var(--tool-text-main)', 
                    fontSize: '0.85rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap'
                }}>
                    <strong style={{ color: 'var(--success-color)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                        {mode === 'effect' ? "Trace Log:" : "Preview:"}
                    </strong><br/>
                    {previewResult || <span style={{ color: 'var(--tool-text-dim)' }}>(Empty)</span>}
                </div>
            )}

            {hasErrors && !showPreview && (
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--danger-color)', fontFamily: 'monospace' }}>
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