'use client';

import { useState, useRef, useEffect } from 'react';
import SparkleIcon from '@/components/icons/SparkleIcon';
import ScribeAssistant from '@/components/admin/ScribeAssistant';
import dynamic from 'next/dynamic';
import { LintError, lintScribeScript } from '@/engine/audio/linter';

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
    
    // Pass the ID of the object being edited (for $. support in debugger)
    contextQualityId?: string; 
}

export default function SmartArea({ 
    label, value, onChange, storyId, placeholder, 
    minHeight = "38px", mode = 'text', subLabel, initialTab, 
    contextQualityId 
}: Props) {
    const [showAssistant, setShowAssistant] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [errors, setErrors] = useState<LintError[]>([]);

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

    // Linting Effect (Debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!value) {
                setErrors([]);
                return;
            }
            // Map the generic 'mode' to the specific Linter Context
            let lintContext: 'text' | 'effect' | 'condition' = 'text';
            if (mode === 'effect') lintContext = 'effect';
            else if (mode === 'condition') lintContext = 'condition';

            const newErrors = lintScribeScript(value, lintContext);
            setErrors(newErrors);
        }, 500);

        return () => clearTimeout(timer);
    }, [value, mode]);

    const handleInsert = (text: string) => {
        // Smart spacing: Add space only if previous char wasn't a space/newline
        const prefix = (value && value.length > 0 && !/\s$/.test(value)) ? " " : "";
        onChange(value + prefix + text);
    };

    return (
        <div className="form-group" ref={containerRef} style={{ position: 'relative', zIndex: showAssistant ? 50 : 1 }}>
            
            {/* HEADER ROW */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.25rem', minHeight: '20px' }}>
                
                {/* LEFT: Label & Sublabel (Only render if they exist) */}
                {(label || subLabel) ? (
                    <div>
                        {label && <label className="form-label" style={{ margin: 0 }}>{label}</label>}
                        {subLabel && <p style={{ fontSize: '0.7rem', color: '#666', margin: 0 }}>{subLabel}</p>}
                    </div>
                ) : <div />} {/* Empty div to maintain flex spacing if no label */}
                
                {/* RIGHT: Errors & Button (Always right-aligned) */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                    {errors.length > 0 && (
                        <span style={{ color: '#e06c75', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            {errors.length} Issue{errors.length > 1 ? 's' : ''}
                        </span>
                    )}
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

            {/* ASSISTANT POPUP */}
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

            {/* EDITOR */}
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
            
            {/* INLINE ERROR DISPLAY (First Error Only) */}
            {errors.length > 0 && (
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#e06c75', fontFamily: 'monospace' }}>
                    Line {errors[0].line}: {errors[0].message}
                </div>
            )}
        </div>
    );
}