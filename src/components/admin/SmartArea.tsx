'use client';

import { useState, useRef, useEffect } from 'react';
import ScribeEditor from './ScribeEditor';
import SparkleIcon from '@/components/icons/SparkleIcon';
import ScribeAssistant from '@/components/admin/ScribeAssistant';

interface Props {
    label: string;
    value: string;
    onChange: (val: string) => void;
    storyId: string;
    placeholder?: string;
    minHeight?: string;
    mode?: 'text' | 'condition' | 'effect';
    subLabel?: string;
    // NEW PROP
    initialTab?: 'conditional_text' | 'standard' | 'skill_check' | 'source' | 'group_clear' |  'luck';
}

export default function SmartArea({ 
    label, value, onChange, storyId, placeholder, minHeight = "38px", mode = 'text', subLabel, initialTab 
}: Props) {
    const [showAssistant, setShowAssistant] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowAssistant(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

            {showAssistant && (
                <div style={{ position: 'absolute', top: '30px', right: 0, zIndex: 100 }}>
                    <ScribeAssistant 
                        storyId={storyId} 
                        mode={mode} 
                        onInsert={handleInsert} 
                        onClose={() => setShowAssistant(false)}
                        initialTab='conditional_text' // <--- Pass it down
                    />
                </div>
            )}

            <ScribeEditor 
                value={value} 
                onChange={onChange} 
                minHeight={minHeight}
                placeholder={placeholder}
            />
        </div>
    );
}