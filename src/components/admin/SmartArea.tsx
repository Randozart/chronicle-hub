'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import SparkleIcon from '@/components/icons/SparkleIcon';
import ScribeAssistant from '@/components/admin/ScribeAssistant';
import dynamic from 'next/dynamic';
import { LintError, lintScribeScript } from '@/engine/audio/linter';
import { QualityDefinition, PlayerQualities, WorldConfig } from '@/engine/models';
import { evaluateText } from '@/engine/textProcessor';
import { GameEngine } from '@/engine/gameEngine';
import { useDynamicQualities } from '@/hooks/useDynamicQualities';
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
    entityType?: 'location' | 'deck' | 'storylet' | 'quality';
}

export default function SmartArea({
    label, value, onChange, storyId, placeholder,
    minHeight = "38px", mode = 'text', subLabel, initialTab,
    contextQualityId, qualityDefs = [], entityType
}: Props) {
    const [showAssistant, setShowAssistant] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showEntityPicker, setShowEntityPicker] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [errors, setErrors] = useState<LintError[]>([]);
    const [previewResult, setPreviewResult] = useState<string>("");
    const dynamicIds = useDynamicQualities(storyId);
    const [entities, setEntities] = useState<Array<{id: string, name: string}>>([]);
    const [entityFilter, setEntityFilter] = useState("");
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowAssistant(false);
                setShowEntityPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!entityType || !storyId) return;

        let endpoint = '';
        if (entityType === 'location') endpoint = `/api/admin/config?storyId=${storyId}&category=locations`;
        else if (entityType === 'deck') endpoint = `/api/admin/decks?storyId=${storyId}`;
        else if (entityType === 'storylet') endpoint = `/api/admin/storylets?storyId=${storyId}`;
        else if (entityType === 'quality') endpoint = `/api/admin/qualities?storyId=${storyId}`;

        if (!endpoint) return;

        fetch(endpoint)
            .then(res => res.json())
            .then(data => {
                let items: Array<{id: string, name: string}> = [];
                if (entityType === 'location') {
                    items = Object.values(data.locations || {}).map((loc: any) => ({
                        id: loc.id,
                        name: loc.name || loc.id
                    }));
                } else if (Array.isArray(data)) {
                    items = data.map((item: any) => ({
                        id: item.id,
                        name: item.name || item.id
                    }));
                } else {
                    items = Object.values(data).map((item: any) => ({
                        id: item.id,
                        name: item.name || item.id
                    }));
                }
                setEntities(items);
            })
            .catch(err => console.error(`Failed to load ${entityType}s`, err));
    }, [entityType, storyId]);
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!value) {
                setErrors([]);
                return;
            }
            let lintContext: 'text' | 'effect' | 'condition' = 'text';
            if (mode === 'effect') lintContext = 'effect';
            else if (mode === 'condition') lintContext = 'condition';
            const newErrors = lintScribeScript(value, lintContext, qualityDefs, dynamicIds);
            setErrors(newErrors);
        }, 500);

        return () => clearTimeout(timer);
    }, [value, mode, qualityDefs, dynamicIds]);
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
                if (dynamicIds) {
                    dynamicIds.forEach(id => {
                        if (!mockQualities[id]) {
                            mockQualities[id] = { qualityId: id, type: 'P', level: 1 } as any;
                        }
                    });
                }

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
    }, [value, showPreview, qualityDefs, contextQualityId, mode, dynamicIds]);

    const handleInsert = (text: string) => {
        const prefix = (value && value.length > 0 && !/\s$/.test(value)) ? " " : "";
        onChange(value + prefix + text);
    };
    const visualErrors = useMemo(() => errors.filter(e => e.severity !== 'info'), [errors]);
    const hasVisualErrors = visualErrors.length > 0;
    const infoCount = errors.length - visualErrors.length;

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
                    {errors.length > 0 && (
                        <span style={{
                            color: hasVisualErrors ? 'var(--danger-color)' : 'var(--info-color)',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                        }}>
                            {hasVisualErrors ? `${visualErrors.length} Issue${visualErrors.length > 1 ? 's' : ''}` : 'Valid'}
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

                    {entityType && entities.length > 0 && (
                        <button
                            onClick={() => setShowEntityPicker(!showEntityPicker)}
                            style={{
                                background: showEntityPicker ? 'var(--warning-color)' : 'transparent',
                                color: showEntityPicker ? '#000' : 'var(--warning-color)',
                                border: '1px solid var(--warning-color)', borderRadius: '4px',
                                cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold',
                                padding: '2px 8px', transition: 'all 0.1s'
                            }}
                            type="button"
                            title={`Browse ${entityType}s`}
                        >
                            🔗 {entityType.charAt(0).toUpperCase() + entityType.slice(1)}s
                        </button>
                    )}

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

            {showEntityPicker && entityType && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '5px',
                    background: 'var(--tool-bg-sidebar)',
                    border: '1px solid var(--warning-color)',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    minWidth: '300px',
                    maxWidth: '400px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 100,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder={`Search ${entityType}s...`}
                            value={entityFilter}
                            onChange={e => setEntityFilter(e.target.value)}
                            className="form-input"
                            style={{ fontSize: '0.85rem', padding: '4px 8px' }}
                            autoFocus
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {entities
                            .filter(e =>
                                !entityFilter ||
                                e.id.toLowerCase().includes(entityFilter.toLowerCase()) ||
                                e.name.toLowerCase().includes(entityFilter.toLowerCase())
                            )
                            .map(entity => (
                                <button
                                    key={entity.id}
                                    type="button"
                                    onClick={() => {
                                        const newValue = value ? value + ' ' + entity.id : entity.id;
                                        onChange(newValue);
                                        setShowEntityPicker(false);
                                        setEntityFilter('');
                                    }}
                                    style={{
                                        background: 'var(--tool-bg-input)',
                                        border: '1px solid var(--tool-border)',
                                        borderRadius: '4px',
                                        padding: '0.5rem',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.1s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--tool-accent-fade)';
                                        e.currentTarget.style.borderColor = 'var(--tool-accent)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'var(--tool-bg-input)';
                                        e.currentTarget.style.borderColor = 'var(--tool-border)';
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', color: 'var(--tool-text-header)', fontSize: '0.85rem' }}>
                                        {entity.name}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--tool-text-dim)', fontFamily: 'monospace' }}>
                                        {entity.id}
                                    </div>
                                </button>
                            ))}
                        {entities.filter(e =>
                            !entityFilter ||
                            e.id.toLowerCase().includes(entityFilter.toLowerCase()) ||
                            e.name.toLowerCase().includes(entityFilter.toLowerCase())
                        ).length === 0 && (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--tool-text-dim)', fontSize: '0.85rem' }}>
                                No {entityType}s found
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div 
                className={hasVisualErrors ? 'editor-has-errors' : ''}
                style={{ 
                    border: hasVisualErrors ? '1px solid var(--danger-color)' : '1px solid var(--tool-border)', 
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
                    showLineNumbers={hasVisualErrors} 
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
            {hasVisualErrors && !showPreview && (
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--danger-color)', fontFamily: 'monospace' }}>
                    <div>Line {visualErrors[0].line}: {visualErrors[0].message}</div>
                    {visualErrors.length > 1 && (
                        <div style={{ opacity: 0.7, fontStyle: 'italic', marginTop: '2px' }}>
                            ...and {visualErrors.length - 1} more issues.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}