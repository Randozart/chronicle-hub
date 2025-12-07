// src/components/CreationForm.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ImageDefinition, CharCreateRule, QualityType, PlayerQualities, QualityDefinition } from '@/engine/models';
import GameImage from '@/components/GameImage';
import { evaluateText, evaluateCondition } from '@/engine/textProcessor';

interface CreationFormProps { 
    storyId: string; 
    rules: Record<string, CharCreateRule>;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
    allowScribeScript: boolean;
}

export default function CreationForm({ storyId, rules, qualityDefs, imageLibrary, allowScribeScript }: CreationFormProps) {
    const router = useRouter();
    const [choices, setChoices] = useState<Record<string, string>>({});
    const [derivedValues, setDerivedValues] = useState<Record<string, string>>({});
    const [error, setError] = useState('');
    const [inputErrors, setInputErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. CREATE SYNTHETIC DEFINITIONS
    // This is the FIX. We create definitions for every rule so the parser knows they exist.
    const allDefinitions = useMemo(() => {
        const syntheticDefs: Record<string, QualityDefinition> = { ...qualityDefs };
        
        Object.keys(rules).forEach(key => {
            const qid = key.replace('$', '');
            if (!syntheticDefs[qid]) {
                // Infer type based on rule type
                const rule = rules[key];
                let type = QualityType.String; // Default
                if (rule.type === 'static' && !isNaN(Number(rule.rule))) type = QualityType.Pyramidal;
                
                syntheticDefs[qid] = {
                    id: qid,
                    name: qid, // Fallback name
                    type: type,
                    description: "Character Creation Field"
                };
            }
        });
        return syntheticDefs;
    }, [rules, qualityDefs]);

    // 2. Dependency Analysis
    const sortedKeys = useMemo(() => {
        const keys = Object.keys(rules);
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

    // 3. Real-time Evaluation Engine
    useEffect(() => {
        const mockQualities: PlayerQualities = {};
        
        const addToMock = (key: string, val: string) => {
            const qid = key.replace('$', '');
            const isNum = !isNaN(Number(val)) && val.trim() !== '';
            
            // Use our synthetic definitions to get the type!
            const def = allDefinitions[qid];
            const type = def?.type || (isNum ? QualityType.Pyramidal : QualityType.String);

            mockQualities[qid] = {
                qualityId: qid,
                type: type,
                level: isNum ? Number(val) : 0,
                stringValue: String(val),
                changePoints: 0,
                sources: [],
                spentTowardsPrune: 0
            } as any;
        };

        // Initialize from current choices
        sortedKeys.forEach(key => {
            const qid = key.replace('$', '');
            if (choices[qid] !== undefined) addToMock(key, choices[qid]);
            else if (derivedValues[qid] !== undefined) addToMock(key, derivedValues[qid]);
            else addToMock(key, "0");
        });

        const newDerived: Record<string, string> = {};

        sortedKeys.forEach(key => {
            const ruleObj = rules[key];
            const qid = key.replace('$', '');
            
            if (ruleObj.type !== 'static' && choices[qid] !== undefined) return;

            let result = ruleObj.rule;

            if (ruleObj.rule.includes('{') || ruleObj.rule.includes('$') || ruleObj.rule.includes('@')) {
                try {
                    // FIX: Pass allDefinitions (synthetic + real)
                    result = evaluateText(`{${ruleObj.rule}}`, mockQualities, allDefinitions, null, 0);
                } catch (e) {
                    console.warn("Eval error", e);
                }
            }
            
            newDerived[qid] = result;
            addToMock(key, result);
        });

        if (JSON.stringify(newDerived) !== JSON.stringify(derivedValues)) {
            setDerivedValues(newDerived);
        }

    }, [choices, rules, sortedKeys, allDefinitions]); // Dependency on allDefinitions

    // 4. Validation
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

    const isVisible = (rule: CharCreateRule) => {
        if (!rule.visible) return false;
        if (!rule.visible_if) return true;
        
        const mockQualities: PlayerQualities = {};
        Object.entries({ ...choices, ...derivedValues }).forEach(([key, val]) => {
            const qid = key.replace('$', '');
            const isNum = !isNaN(Number(val)) && val !== '';
            mockQualities[qid] = {
                qualityId: qid,
                type: isNum ? QualityType.Pyramidal : QualityType.String,
                level: isNum ? Number(val) : 0,
                stringValue: String(val)
            } as any;
        });
        
        // FIX: Pass allDefinitions here too
        return evaluateCondition(rule.visible_if, mockQualities, allDefinitions);
    };

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-panel)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            
            {sortedKeys.map(key => {
                const ruleObj = rules[key];
                const qid = key.replace('$', '');
                
                if (!isVisible(ruleObj)) return null;

                const label = qid.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                
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

                if (['label_select', 'image_select', 'labeled_image_select'].includes(ruleObj.type)) {
                    const options = ruleObj.rule.split('|').map(opt => {
                        const parts = opt.split(':');
                        const val = parts[0].trim();
                        const lbl = parts.length > 1 ? parts.slice(1).join(':').trim() : val;
                        return { val, label: lbl };
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
                                    const hasImage = ruleObj.type !== 'label_select' && imageLibrary[opt.val]; 
                                    
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
                                                            {opt.label}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ padding: '1rem', fontWeight: 'bold', color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                    {opt.label}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }

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