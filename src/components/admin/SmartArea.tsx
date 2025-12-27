'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import SparkleIcon from '@/components/icons/SparkleIcon';
import ScribeAssistant from '@/components/admin/ScribeAssistant';
import dynamic from 'next/dynamic';
import { LintError, lintScribeScript } from '@/engine/audio/linter';


// --- DYNAMICALLY IMPORT SCRIBEEDITOR WITH SSR DISABLED ---
const ScribeEditor = dynamic(() => import('@/components/admin/ScribeEditor'), { 
    ssr: false,
    loading: () => <div style={{ minHeight: '38px', background: '#111', borderRadius: '4px', border: '1px solid #333' }} />
});

interface Props {
    label: string;
    value: string;
    onChange: (val: string) => void;
    storyId: string;
    placeholder?: string;
    minHeight?: string;
    mode?: 'text' | 'condition' | 'effect';
    subLabel?: string;
    initialTab?: 'variable' | 'conditional' | 'challenge' | 'random' | 'effect' | 'timer';
}

export default function SmartArea({ 
    label, value, onChange, storyId, placeholder, minHeight = "38px", mode = 'text', subLabel, initialTab 
}: Props) {
    const [showAssistant, setShowAssistant] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [errors, setErrors] = useState<LintError[]>([]);

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
        const prefix = (value && value.length > 0 && !value.endsWith(' ')) ? " " : "";
        onChange(value + prefix + text);
    };

    return (
        <div className="form-group" ref={containerRef} style={{ position: 'relative', zIndex: showAssistant ? 50 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <div>
                    <label className="form-label" style={{ margin: 0 }}>{label}</label>
                    {subLabel && <p style={{ fontSize: '0.7rem', color: '#666', margin: 0 }}>{subLabel}</p>}
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {errors.length > 0 && (
                        <span style={{ color: '#e06c75', fontSize: '0.7rem', display: 'flex', alignItems: 'center' }}>
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
                />
            )}

            <ScribeEditor 
                value={value} 
                onChange={onChange} 
                minHeight={minHeight}
                placeholder={placeholder}
                language="scribescript"
                errors={errors}
            />
            
            {/* Error Message Display (Optional: Show first error below field) */}
            {errors.length > 0 && (
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#e06c75' }}>
                    {errors[0].line}: {errors[0].message}
                </div>
            )}
        </div>
    );
}