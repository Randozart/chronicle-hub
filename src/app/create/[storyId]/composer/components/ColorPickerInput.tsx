'use client';

import { useState, useEffect } from 'react';

interface Props {
    value: string;
    onChange: (newValue: string) => void;
}
let themeVarCache: string[] | null = null;

export default function ColorPickerInput({ value, onChange }: Props) {
    const [themeVars, setThemeVars] = useState<string[]>(themeVarCache || []);
    const isThemeVar = value?.startsWith('var(');

    useEffect(() => {
        if (!themeVarCache) {
            fetch('/api/admin/themes')
                .then(res => res.json())
                .then(data => {
                    if (data.variables) {
                        themeVarCache = data.variables;
                        setThemeVars(data.variables);
                    }
                })
                .catch(err => console.error("Failed to fetch theme variables:", err));
        }
    }, []);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input 
                type="color" 
                value={isThemeVar ? '#ffffff' : (value || '#ffffff')}
                onChange={e => onChange(e.target.value)}
                style={{ background: 'var(--tool-bg-input)', border: '1px solid var(--tool-border)', borderRadius: '4px', minWidth: '30px', height: '30px', padding: '2px' }}
                disabled={isThemeVar}
            />
            <select 
                value={isThemeVar ? value : 'custom'}
                onChange={e => onChange(e.target.value === 'custom' ? '#FFFFFF' : e.target.value)}
                className="form-select"
                style={{ flex: 1 }}
            >
                <option value="custom">Custom Color</option>
                {themeVars.length > 0 && (
                    <optgroup label="Theme Variables">
                        {themeVars.map(v => <option key={v} value={`var(${v})`}>{v}</option>)}
                    </optgroup>
                )}
            </select>
        </div>
    );
}