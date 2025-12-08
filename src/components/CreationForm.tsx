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
    
    // Track which modal is currently open (by quality key)
    const [activeModal, setActiveModal] = useState<string | null>(null);

    // 1. CREATE SYNTHETIC DEFINITIONS (Fixes "Unknown Var" errors)
    const allDefinitions = useMemo(() => {
        const syntheticDefs: Record<string, QualityDefinition> = { ...qualityDefs };
        
        // Ensure System Bindings exist so parser doesn't choke
        const systemVars = ['actions', 'player_name', 'player_portrait'];
        systemVars.forEach(sysId => {
            if (!syntheticDefs[sysId]) {
                syntheticDefs[sysId] = { id: sysId, name: sysId, type: QualityType.String, description: "System Variable" };
            }
        });

        // Ensure Rule-defined qualities exist
        Object.keys(rules).forEach(key => {
            const qid = key.replace('$', '');
            if (!syntheticDefs[qid]) {
                const rule = rules[key];
                // Infer type: If rule looks like a number, it's Pyramidal/Counter. Else String.
                let type = QualityType.String; 
                if (rule.type === 'static' && !isNaN(Number(rule.rule))) type = QualityType.Pyramidal;
                
                syntheticDefs[qid] = {
                    id: qid,
                    name: qid.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                    type: type,
                    description: "Character Creation Field"
                };
            }
        });
        return syntheticDefs;
    }, [rules, qualityDefs]);

    // 2. Dependency Analysis (Sort by dependencies)
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
            
            const def = allDefinitions[qid];
            const type = def?.type || (isNum ? QualityType.Pyramidal : QualityType.String);

            mockQualities[qid] = {
                qualityId: qid,
                type: type,
                level: isNum ? Number(val) : 0,
                stringValue: String(val),
                changePoints: 0, 
                sources: [], 
                spentTowardsPrune: 0,
                customProperties: {}
            } as any;
        };

        // Populate initial state
        sortedKeys.forEach(key => {
            const qid = key.replace('$', '');
            if (choices[qid] !== undefined) addToMock(key, choices[qid]);
            else if (derivedValues[qid] !== undefined) addToMock(key, derivedValues[qid]);
            else addToMock(key, "0");
        });

        const newDerived: Record<string, string> = {};

        // Evaluate Rules
        sortedKeys.forEach(key => {
            const ruleObj = rules[key];
            const qid = key.replace('$', '');
            
            // Skip headers
            if (ruleObj.type === 'header') return;

            // Skip user inputs if already set (unless we need to re-validate, but simple for now)
            if (ruleObj.type !== 'static' && choices[qid] !== undefined) return;

            let result = ruleObj.rule;

            if (ruleObj.rule.includes('{') || ruleObj.rule.includes('$') || ruleObj.rule.includes('@')) {
                try {
                    // Evaluate in Logic Context
                    result = evaluateText(`{${ruleObj.rule}}`, mockQualities, allDefinitions, null, 0);
                } catch (e) {
                    // Silent fail for half-typed logic
                }
            }
            
            newDerived[qid] = result;
            addToMock(key, result);
        });

        if (JSON.stringify(newDerived) !== JSON.stringify(derivedValues)) {
            setDerivedValues(newDerived);
        }

    }, [choices, rules, sortedKeys, allDefinitions]);

    // 4. Input Handling
    const applyTransform = (val: string, transform?: string) => {
        if (!transform || transform === 'none') return val;
        if (transform === 'lowercase') return val.toLowerCase();
        if (transform === 'uppercase') return val.toUpperCase();
        if (transform === 'capitalize') return val.replace(/\b\w/g, c => c.toUpperCase()); // Simple Title Case
        return val;
    };

    const handleChoice = (qid: string, value: string, transform?: string) => {
        // Security Check
        if (!allowScribeScript) {
            const scribeScriptPattern = /\{[@%].*\}|\[desc:.*\]|[\+\-\*\/]=/;
            if (scribeScriptPattern.test(value)) {
                setInputErrors(prev => ({ ...prev, [qid]: "Special characters like { } are not allowed." }));
                return;
            }
        }
        
        // Clear Error
        if (inputErrors[qid]) {
            const next = { ...inputErrors };
            delete next[qid];
            setInputErrors(next);
        }

        const finalValue = applyTransform(value, transform);
        setChoices(prev => ({ ...prev, [qid]: finalValue }));
        
        // If this was a modal choice, close the modal
        setActiveModal(null);
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

    // Helper: Check Visibility
    const isVisible = (rule: CharCreateRule) => {
        if (!rule.visible) return false;
        if (!rule.visible_if) return true;
        
        const mockQualities: PlayerQualities = {};
        Object.entries({ ...choices, ...derivedValues }).forEach(([key, val]) => {
            const qid = key.replace('$', '');
            const isNum = !isNaN(Number(val)) && val !== '';
            
            const def = allDefinitions[qid];
            const type = def?.type || (isNum ? QualityType.Pyramidal : QualityType.String);

            mockQualities[qid] = {
                qualityId: qid, type: type, level: isNum ? Number(val) : 0, stringValue: String(val)
            } as any;
        });
        
        return evaluateCondition(rule.visible_if, mockQualities, allDefinitions);
    };

    // --- SUB-COMPONENT: Choice Grid ---
    const ChoiceGrid = ({ ruleObj, qid }: { ruleObj: CharCreateRule, qid: string }) => {
        const options = ruleObj.rule.split('|').map(opt => {
            const parts = opt.split(':');
            const val = parts[0].trim();
            const lbl = parts.length > 1 ? parts.slice(1).join(':').trim() : val;
            return { val, label: lbl };
        });

        return (
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: ruleObj.type === 'label_select' ? 'repeat(auto-fill, minmax(120px, 1fr))' : 'repeat(auto-fill, minmax(100px, 1fr))', 
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
                                        <GameImage code={opt.val} imageLibrary={imageLibrary} type="icon" className="w-full h-full object-cover" />
                                    </div>
                                    {ruleObj.type === 'labeled_image_select' && (
                                        <div style={{ fontSize: '0.85rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 'bold' }}>{opt.label}</div>
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
        );
    };

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-panel)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            
            {sortedKeys.map(key => {
                const ruleObj = rules[key];
                const qid = key.replace('$', '');
                
                if (!isVisible(ruleObj)) return null;

                const label = qid.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                const isHeader = ruleObj.type === 'header';

                if (isHeader) {
                    return (
                        <h3 key={key} style={{ 
                            marginTop: '2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', 
                            paddingBottom: '0.5rem', color: 'var(--accent-highlight)', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px' 
                        }}>
                            {ruleObj.rule}
                        </h3>
                    );
                }

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

                // --- RENDER: SELECTORS (Inline or Modal) ---
                if (['label_select', 'image_select', 'labeled_image_select'].includes(ruleObj.type)) {
                    
                    // Modal Mode
                    if (ruleObj.displayMode === 'modal') {
                        const currentSelection = choices[qid] ? (
                            ruleObj.rule.split('|').find(o => o.startsWith(choices[qid]))?.split(':')[1] || choices[qid]
                        ) : "Select...";

                        return (
                            <div key={key} style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{label}</label>
                                <button 
                                    type="button"
                                    onClick={() => setActiveModal(qid)}
                                    style={{ 
                                        width: '100%', padding: '1rem', textAlign: 'left', 
                                        background: 'var(--bg-item)', border: '1px solid var(--border-color)', 
                                        borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}
                                >
                                    <span>{currentSelection}</span>
                                    <span>▼</span>
                                </button>

                                {activeModal === qid && (
                                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                                        <div style={{ background: 'var(--bg-panel)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                                <h3 style={{ margin: 0 }}>Select {label}</h3>
                                                <button type="button" onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
                                            </div>
                                            <ChoiceGrid ruleObj={ruleObj} qid={qid} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }

                    // Inline Mode
                    return (
                        <div key={key} style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{label}</label>
                            <ChoiceGrid ruleObj={ruleObj} qid={qid} />
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
                            onChange={(e) => handleChoice(qid, e.target.value, ruleObj.input_transform)}
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