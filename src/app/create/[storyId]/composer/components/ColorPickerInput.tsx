'use client';

import { useMemo } from 'react';

interface Props {
    value: string;
    onChange: (newValue: string) => void;
    allThemes: Record<string, Record<string, string>>;
}

export default function ColorPickerInput({ value, onChange, allThemes }: Props) {
    const isThemeVar = value?.startsWith('var(');

    const themeVars = useMemo(() => Object.keys(allThemes[':root'] || {}), [allThemes]);

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

