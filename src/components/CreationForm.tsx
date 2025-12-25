//CreationForm.tsx

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
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    
    const router = useRouter();
    const [choices, setChoices] = useState<Record<string, string>>({});
    const [error, setError] = useState('');
    const [inputErrors, setInputErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Track which modal is currently open (by Header Key)
    const [openModalSection, setOpenModalSection] = useState<string | null>(null);
    const [activeSelectModal, setActiveSelectModal] = useState<string | null>(null); // For label_select modals

    // 1. CREATE SYNTHETIC DEFINITIONS
    const allDefinitions = useMemo(() => {
        const syntheticDefs: Record<string, QualityDefinition> = { ...qualityDefs };
        const systemVars = ['actions', 'player_name', 'player_portrait'];
        systemVars.forEach(sysId => {
            if (!syntheticDefs[sysId]) {
                syntheticDefs[sysId] = { id: sysId, name: sysId, type: QualityType.String, description: "System Variable" };
            }
        });
        Object.keys(rules).forEach(key => {
            const qid = key.replace('$', '');
            if (!syntheticDefs[qid]) {
                const rule = rules[key];
                let type = QualityType.String; 
                if (rule.type === 'static' && !isNaN(Number(rule.rule))) type = QualityType.Pyramidal;
                syntheticDefs[qid] = { id: qid, name: qid, type: type, description: "Char Create Field" };
            }
        });
        return syntheticDefs;
    }, [rules, qualityDefs]);

    // 2. Sort Keys
    const sortedKeys = useMemo(() => {
        const keys = Object.keys(rules);
        return keys.sort((a, b) => (rules[a].ordering || 0) - (rules[b].ordering || 0));
    }, [rules]);

    // 3. GROUPING LOGIC (Headers & Sections)
    const sections = useMemo(() => {
        const result: { headerKey: string | null, keys: string[] }[] = [];
        let currentSection: { headerKey: string | null, keys: string[] } = { headerKey: null, keys: [] };

        sortedKeys.forEach(key => {
            const rule = rules[key];
            if (rule.type === 'header') {
                if (currentSection.keys.length > 0 || currentSection.headerKey) {
                    result.push(currentSection);
                }
                currentSection = { headerKey: key, keys: [] };
            } else {
                currentSection.keys.push(key);
            }
        });
        if (currentSection.keys.length > 0 || currentSection.headerKey) {
            result.push(currentSection);
        }
        return result;
    }, [sortedKeys, rules]);

    const calculatedState = useMemo(() => {
        const mockQualities: PlayerQualities = {};
        const derived: Record<string, string> = {};

        // 1. Initialize Mock State from Choices (User Input)
        // We do this first so inputs are available for logic
        sortedKeys.forEach(key => {
            const qid = key.replace('$', '');
            // Default to choice, or 0
            const val = choices[qid] ?? "0";
            
            const isNum = !isNaN(Number(val)) && val.trim() !== '';
            const def = allDefinitions[qid];
            const type = def?.type || (isNum ? QualityType.Pyramidal : QualityType.String);
            
            mockQualities[qid] = {
                qualityId: qid, type: type, level: isNum ? Number(val) : 0, stringValue: String(val),
                changePoints: 0, sources: [], spentTowardsPrune: 0, customProperties: {}
            } as any;
        });

        // 2. Evaluate Rules (Static/Calc)
        // We iterate sorted keys. If a rule depends on a later key, that later key must have been in 'choices' (input)
        // or it will use the default "0" from step 1.
        // Since you ordered your rules carefully (inputs first, calcs later), this works.
        
        sortedKeys.forEach(key => {
            const ruleObj = rules[key];
            const qid = key.replace('$', '');
            
            if (ruleObj.type === 'header') return;

            // If it's a static/calc field, we ALWAYS evaluate it, overriding any user input/default
            if (ruleObj.type === 'static' || ruleObj.readOnly) {
                let result = ruleObj.rule;
                
                if (ruleObj.rule.includes('{') || ruleObj.rule.includes('$') || ruleObj.rule.includes('@')) {
                    try {
                        const trimmed = ruleObj.rule.trim();
                        const expr = (trimmed.startsWith('{') && trimmed.endsWith('}')) ? trimmed : `{${trimmed}}`;
                        // Using current mockQualities state which accumulates changes
                        result = evaluateText(expr, mockQualities, allDefinitions, null, 0);
                    } catch (e) { }
                }
                
                derived[qid] = result;
                
                // UPDATE MOCK STATE with this calculated value so subsequent rules can see it!
                const isNum = !isNaN(Number(result)) && result.trim() !== '';
                if (mockQualities[qid]) {
                     if (mockQualities[qid].type === QualityType.String) {
                         mockQualities[qid].stringValue = String(result);
                     } else {
                         (mockQualities[qid] as any).level = isNum ? Number(result) : 0;
                     }
                }
            }
        });
        
        return { derived, mockQualities };
    }, [choices, rules, sortedKeys, allDefinitions]);

    const derivedValues = calculatedState.derived;

    // 5. Helpers
    const applyTransform = (val: string, transform?: string) => {
        if (!transform || transform === 'none') return val;
        if (transform === 'lowercase') return val.toLowerCase();
        if (transform === 'uppercase') return val.toUpperCase();
        if (transform === 'capitalize') return val.replace(/\b\w/g, c => c.toUpperCase()); 
        return val;
    };

    const handleChoice = (qid: string, value: string, transform?: string) => {
        if (!allowScribeScript) {
            const scribeScriptPattern = /\{[@%].*\}|\[desc:.*\]|[\+\-\*\/]=/;
            if (scribeScriptPattern.test(value)) {
                setInputErrors(prev => ({ ...prev, [qid]: "Special characters like { } are not allowed." }));
                return;
            }
        }
        if (inputErrors[qid]) {
            const next = { ...inputErrors };
            delete next[qid];
            setInputErrors(next);
        }
        const finalValue = applyTransform(value, transform);
        setChoices(prev => ({ ...prev, [qid]: finalValue }));
        setActiveSelectModal(null);
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
        else { setError('Creation failed. Please try again.'); setIsSubmitting(false); }
    };

    const isVisible = (rule: CharCreateRule) => {
        if (!rule.visible) return false;
        if (!rule.visible_if) return true;
        
        // FIX: Pass null instead of {} for selfContext
        return evaluateCondition(rule.visible_if, calculatedState.mockQualities, allDefinitions, null, 0);
    };

    // --- RENDERERS ---

    const renderChoiceGrid = (ruleObj: CharCreateRule, qid: string) => {
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
                                borderRadius: '8px', cursor: 'pointer', textAlign: 'center', overflow: 'hidden',
                                transition: 'transform 0.2s', transform: isSelected ? 'scale(1.05)' : 'scale(1)',
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
                                <div style={{ padding: '1rem', fontWeight: 'bold', color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)' }}>{opt.label}</div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderField = (key: string, ruleObj: CharCreateRule) => {
        const qid = key.replace('$', '');
        const label = qid.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        if (!isVisible(ruleObj)) return null;

        // Static / ReadOnly
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

        // Selectors
        if (['label_select', 'image_select', 'labeled_image_select'].includes(ruleObj.type)) {
            if (ruleObj.displayMode === 'modal') {
                const currentSelection = choices[qid] ? (ruleObj.rule.split('|').find(o => o.startsWith(choices[qid]))?.split(':')[1] || choices[qid]) : "Select...";
                return (
                    <div key={key} style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{label}</label>
                        <button type="button" onClick={() => setActiveSelectModal(qid)} style={{ width: '100%', padding: '1rem', textAlign: 'left', background: 'var(--bg-item)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{currentSelection}</span><span>▼</span>
                        </button>
                        {activeSelectModal === qid && (
                            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                                <div style={{ background: 'var(--bg-panel)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                        <h3 style={{ margin: 0 }}>Select {label}</h3>
                                        <button type="button" onClick={() => setActiveSelectModal(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
                                    </div>
                                    {renderChoiceGrid(ruleObj, qid)}
                                </div>
                            </div>
                        )}
                    </div>
                );
            }
            return (
                <div key={key} style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{label}</label>
                    {renderChoiceGrid(ruleObj, qid)}
                </div>
            );
        }

        // String Input
        return (
            <div key={key} style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{label}</label>
                <input type="text" className="form-input" value={choices[qid] || ''} onChange={(e) => handleChoice(qid, e.target.value, ruleObj.input_transform)} style={{ width: '100%', padding: '0.8rem', borderColor: inputErrors[qid] ? 'var(--danger-color)' : 'var(--border-color)' }} />
                {inputErrors[qid] && <p style={{color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '0.3rem'}}>{inputErrors[qid]}</p>}
            </div>
        );
    };

    if (!isMounted) {
        return <div style={{ color: '#777', padding: '2rem', textAlign: 'center' }}>Loading Character Creator...</div>;
    }

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-panel)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            
            {sections.map((section, idx) => {
                const headerRule = section.headerKey ? rules[section.headerKey] : null;
                const headerLabel = headerRule ? headerRule.rule : "";
                
                // If section is conditional, check header visibility
                if (headerRule && !isVisible(headerRule)) return null;

                // --- MODAL SECTION ---
                if (headerRule && headerRule.displayMode === 'modal') {
                    const isOpen = openModalSection === section.headerKey;
                    
                    // Filter fields that should be shown on the card
                    const cardFields = section.keys.filter(k => rules[k].showOnCard && isVisible(rules[k]));

                    return (
                        <div key={idx} style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: 'var(--accent-highlight)', textTransform: 'uppercase', fontSize: '1rem', letterSpacing: '1px' }}>{headerLabel}</h3>
                                </div>
                                <button type="button" onClick={() => setOpenModalSection(section.headerKey)} className="option-button" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                                    Edit
                                </button>
                            </div>
                            
                            {/* Render "Show On Card" fields here */}
                            {cardFields.length > 0 && (
                                <div style={{ marginTop: '1rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)' }}>
                                    {cardFields.map(k => renderField(k, rules[k]))}
                                </div>
                            )}

                            {/* MODAL POPUP */}
                            {isOpen && (
                                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                                    <div style={{ background: 'var(--bg-panel)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                                            <h2 style={{ margin: 0 }}>{headerLabel}</h2>
                                            <button type="button" onClick={() => setOpenModalSection(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {/* Render ALL visible fields inside modal */}
                                            {section.keys.filter(k => isVisible(rules[k])).map(k => renderField(k, rules[k]))}
                                        </div>
                                        <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                                            <button type="button" onClick={() => setOpenModalSection(null)} className="save-btn" style={{ width: 'auto' }}>Done</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                }
                
                // --- NORMAL SECTION ---
                return (
                    <div key={idx} className="form-section" style={{ marginBottom: '2rem' }}>
                        {headerRule && (
                            <h3 style={{ marginTop: '0', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--accent-highlight)', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px' }}>
                                {headerLabel}
                            </h3>
                        )}
                        {section.keys.map(k => renderField(k, rules[k]))}
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