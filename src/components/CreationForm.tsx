// src/components/CreationForm.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ImageDefinition, CharCreateRule, QualityType, PlayerQualities } from '@/engine/models';
import GameImage from '@/components/GameImage';
import { evaluateText, evaluateCondition } from '@/engine/textProcessor';

interface CreationFormProps { 
    storyId: string; 
    rules: Record<string, CharCreateRule>;
    imageLibrary: Record<string, ImageDefinition>;
    allowScribeScript: boolean; // From settings
}

export default function CreationForm({ storyId, rules, imageLibrary, allowScribeScript }: CreationFormProps) {
    const router = useRouter();
    const [choices, setChoices] = useState<Record<string, string>>({});
    const [derivedValues, setDerivedValues] = useState<Record<string, string>>({});
    const [error, setError] = useState('');
    const [inputErrors, setInputErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. Dependency Analysis (Sort by dependencies so math works in order)
    const sortedKeys = useMemo(() => {
        const keys = Object.keys(rules);
        // Simple sort: Put derived values (containing $ or @) last
        // A real topological sort is better, but this suffices for 99% of cases
        return keys.sort((a, b) => {
            const ruleA = rules[a].rule;
            const ruleB = rules[b].rule;
            const aIsDynamic = ruleA.includes('$') || ruleA.includes('@') || ruleA.includes('{');
            const bIsDynamic = ruleB.includes('$') || ruleB.includes('@') || ruleB.includes('{');
            if (aIsDynamic && !bIsDynamic) return 1;
            if (!aIsDynamic && bIsDynamic) return -1;
            return 0;
        });
    }, [rules]);

    // 2. Real-time Evaluation Engine
    useEffect(() => {
        // Construct a mock PlayerQualities object from current choices
        // This allows evaluateText to resolve $variables
        const mockQualities: PlayerQualities = {};
        
        // Populate with current user choices
        Object.entries(choices).forEach(([key, val]) => {
            const isNum = !isNaN(Number(val)) && val !== '';
            mockQualities[key] = {
                qualityId: key,
                type: isNum ? QualityType.Pyramidal : QualityType.String,
                level: isNum ? Number(val) : 0,
                stringValue: String(val)
            } as any;
        });

        const newDerived: Record<string, string> = {};

        // Evaluate all rules in order
        sortedKeys.forEach(key => {
            const ruleObj = rules[key];
            const qid = key.replace('$', '');
            
            // Skip user inputs (already in choices), unless we want to validate/transform them
            if (ruleObj.type !== 'static' && choices[qid] !== undefined) return;

            // Evaluate ScribeScript
            if (ruleObj.rule.includes('{') || ruleObj.rule.includes('$')) {
                try {
                    // We pass null for qualityDefs as we don't need deep property access for creation math usually
                    // If needed, we'd need to pass definitions prop to this component
                    const result = evaluateText(`{${ruleObj.rule}}`, mockQualities, {}, null, 0);
                    newDerived[qid] = result;
                    
                    // Add to mock context for subsequent rules to use
                    const isNum = !isNaN(Number(result)) && result.trim() !== "";
                     mockQualities[qid] = {
                        qualityId: qid,
                        type: isNum ? QualityType.Pyramidal : QualityType.String,
                        level: isNum ? Number(result) : 0,
                        stringValue: String(result)
                    } as any;
                } catch (e) {
                    console.warn("Eval error", e);
                }
            } else {
                // Static value
                newDerived[qid] = ruleObj.rule;
                 // Add to mock context
                 const isNum = !isNaN(Number(ruleObj.rule));
                 mockQualities[qid] = {
                    qualityId: qid,
                    type: isNum ? QualityType.Pyramidal : QualityType.String,
                    level: isNum ? Number(ruleObj.rule) : 0,
                    stringValue: String(ruleObj.rule)
                } as any;
            }
        });

        setDerivedValues(newDerived);

    }, [choices, rules, sortedKeys]);


    // 3. Validation Helper
    const validateInput = (qid: string, value: string) => {
        if (!allowScribeScript) {
            const scribeScriptPattern = /\{[@%].*\}|\[desc:.*\]|[\+\-\*\/]=/;
            if (scribeScriptPattern.test(value)) {
                setInputErrors(prev => ({ ...prev, [qid]: "Special characters like { } are not allowed." }));
                return false;
            }
        }
        if (inputErrors[qid]) {
            const next = { ...inputErrors };
            delete next[qid];
            setInputErrors(next);
        }
        return true;
    };

    const handleChoice = (qid: string, value: string) => {
        if (validateInput(qid, value)) {
            setChoices(prev => ({ ...prev, [qid]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (Object.keys(inputErrors).length > 0) return;
        
        setIsSubmitting(true);
        // Merge derived values so server has full context (though server will re-calc to be safe)
        const finalPayload = { ...choices, ...derivedValues };
        
        const res = await fetch('/api/character/create', { 
            method: 'POST', 
            body: JSON.stringify({ storyId, choices: finalPayload }) 
        });
        
        if (res.ok) router.push(`/play/${storyId}`);
        else { 
            setError('Creation failed. Please try again.'); 
            setIsSubmitting(false); 
        }
    };

    // Helper to evaluate visibility
    const isVisible = (rule: CharCreateRule) => {
        if (!rule.visible) return false;
        if (!rule.visible_if) return true;
        
        // Mock context for visibility check
        const mockQualities: PlayerQualities = {};
        Object.entries({ ...choices, ...derivedValues }).forEach(([key, val]) => {
            const isNum = !isNaN(Number(val)) && val !== '';
            mockQualities[key] = {
                qualityId: key,
                type: isNum ? QualityType.Pyramidal : QualityType.String,
                level: isNum ? Number(val) : 0,
                stringValue: String(val)
            } as any;
        });
        
        return evaluateCondition(rule.visible_if, mockQualities);
    };

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-panel)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            
            {sortedKeys.map(key => {
                const ruleObj = rules[key];
                const qid = key.replace('$', '');
                
                if (!isVisible(ruleObj)) return null;

                const label = qid.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                
                // --- RENDER: READ ONLY / STATIC ---
                if (ruleObj.readOnly || ruleObj.type === 'static') {
                    return (
                        <div key={key} style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase' }}>{label}</label>
                            <div style={{ padding: '0.8rem', background: 'var(--bg-item)', borderRadius: '4px', border: '1px solid var(--border-light)', color: 'var(--accent-highlight)', fontWeight: 'bold' }}>
                                {derivedValues[qid] || ruleObj.rule}
                            </div>
                        </div>
                    );
                }

                // --- RENDER: SELECTORS (Label, Image, Labeled Image) ---
                if (['label_select', 'image_select', 'labeled_image_select'].includes(ruleObj.type)) {
                    // Parse options: "val1:Label1 | val2:Label2"
                    const options = ruleObj.rule.split('|').map(opt => {
                        const [val, ...lblParts] = opt.split(':');
                        return { val: val.trim(), label: lblParts.join(':').trim() }; // Join back in case label has :
                    });

                    return (
                        <div key={key} style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                                {label}
                            </label>
                            
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: ruleObj.type === 'label_select' ? 'repeat(auto-fill, minmax(120px, 1fr))' : 'repeat(auto-fill, minmax(150px, 1fr))', 
                                gap: '1rem' 
                            }}>
                                {options.map(opt => {
                                    const isSelected = choices[qid] === opt.val;
                                    const hasImage = ruleObj.type !== 'label_select' && imageLibrary[opt.val]; // Use value as image key
                                    
                                    return (
                                        <div 
                                            key={opt.val} 
                                            onClick={() => handleChoice(qid, opt.val)}
                                            style={{ 
                                                border: isSelected ? '2px solid var(--accent-highlight)' : '1px solid var(--border-color)',
                                                background: isSelected ? 'rgba(97, 175, 239, 0.1)' : 'var(--bg-item)',
                                                borderRadius: '8px', 
                                                cursor: 'pointer', 
                                                textAlign: 'center',
                                                overflow: 'hidden',
                                                transition: 'transform 0.2s',
                                                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                                position: 'relative'
                                            }}
                                        >
                                            {hasImage ? (
                                                <div style={{ padding: '0.5rem' }}>
                                                    <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                                                        <GameImage 
                                                            code={opt.val} 
                                                            imageLibrary={imageLibrary} 
                                                            type="icon"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    {ruleObj.type === 'labeled_image_select' && (
                                                        <div style={{ fontSize: '0.85rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                                                            {opt.label || opt.val}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ padding: '1rem', fontWeight: 'bold', color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                    {opt.label || opt.val}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }

                // --- RENDER: TEXT INPUT (Default) ---
                return (
                    <div key={key} style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{label}</label>
                        <input 
                            type="text" 
                            className="form-input" 
                            value={choices[qid] || ''}
                            onChange={(e) => handleChoice(qid, e.target.value)}
                            style={{ 
                                width: '100%', padding: '0.8rem', 
                                borderColor: inputErrors[qid] ? 'var(--danger-color)' : 'var(--border-color)' 
                            }} 
                        />
                        {inputErrors[qid] && <p style={{color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '0.3rem'}}>{inputErrors[qid]}</p>}
                    </div>
                );
            })}
            
            {error && <p style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</p>}
            
            <button type="submit" disabled={isSubmitting || Object.keys(inputErrors).length > 0} className="save-btn" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}>
                {isSubmitting ? 'Building World...' : 'Begin Your Journey'}
            </button>
        </form>
    );
}