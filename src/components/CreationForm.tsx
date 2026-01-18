
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ImageDefinition, CharCreateRule, QualityType, PlayerQualities, QualityDefinition, WorldSettings } from '@/engine/models';
import GameImage from '@/components/GameImage';
import { evaluateText, evaluateCondition } from '@/engine/textProcessor';

interface CreationFormProps { 
    storyId: string; 
    rules: Record<string, CharCreateRule>;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
    allowScribeScript: boolean;
    settings: WorldSettings;
}

export default function CreationForm({ storyId, rules, qualityDefs, imageLibrary, allowScribeScript, settings }: CreationFormProps) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    const router = useRouter();
    const [choices, setChoices] = useState<Record<string, string>>({});
    const [error, setError] = useState('');
    const [inputErrors, setInputErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openModalSection, setOpenModalSection] = useState<string | null>(null);
    const [activeSelectModal, setActiveSelectModal] = useState<string | null>(null);
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
    const sortedKeys = useMemo(() => {
        const keys = Object.keys(rules);
        return keys.sort((a, b) => (rules[a].ordering || 0) - (rules[b].ordering || 0));
    }, [rules]);
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
        sortedKeys.forEach(key => {
            const qid = key.replace('$', '');
            const val = choices[qid] ?? "0";
            
            const isNum = !isNaN(Number(val)) && val.trim() !== '';
            const def = allDefinitions[qid];
            const type = def?.type || (isNum ? QualityType.Pyramidal : QualityType.String);
            
            mockQualities[qid] = {
                qualityId: qid, type: type, level: isNum ? Number(val) : 0, stringValue: String(val),
                changePoints: 0, sources: [], spentTowardsPrune: 0, text_variants: {}
            } as any;
        });
        sortedKeys.forEach(key => {
            const ruleObj = rules[key];
            const qid = key.replace('$', '');
            
            if (ruleObj.type === 'header') return;
            if (ruleObj.type === 'static' || ruleObj.readOnly) {
                let result = ruleObj.rule;
                
                if (ruleObj.rule.includes('{') || ruleObj.rule.includes('$') || ruleObj.rule.includes('@')) {
                    try {
                        const trimmed = ruleObj.rule.trim();
                        const expr = (trimmed.startsWith('{') && trimmed.endsWith('}')) ? trimmed : `{${trimmed}}`;
                        result = evaluateText(expr, mockQualities, allDefinitions, null, 0, {});
                    } catch (e) { }
                }
                
                derived[qid] = result;
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

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        let hasError = false;

        sortedKeys.forEach(key => {
            const rule = rules[key];
            if (rule.required && !rule.readOnly && rule.type !== 'header' && isVisible(rule)) {
                const qid = key.replace('$', '');
                const val = choices[qid];
                if (!val || val.trim() === '') {
                    errors[qid] = "This field is required.";
                    hasError = true;
                }
            }
        });

        if (hasError) {
            setInputErrors(prev => ({ ...prev, ...errors }));
            setError("Please fill in all required fields marked with *.");
            return;
        }
        setIsSubmitting(true);
        const finalPayload = { ...choices, ...derivedValues }; 
        const res = await fetch('/api/character/create', { 
            method: 'POST', 
            body: JSON.stringify({ storyId, choices: finalPayload }) 
        });
        
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                if (data.character && data.character.characterId.startsWith('guest_')) {
                    localStorage.setItem(`chronicle_guest_${storyId}`, JSON.stringify(data.character));
                }
                router.push(`/play/${storyId}`);
            } else {
                setError('Creation failed. Please try again.');
                setIsSubmitting(false);
            }
        } else { 
            setError('Creation failed. Please try again.'); 
            setIsSubmitting(false); 
        }
    }, [choices, derivedValues, rules, sortedKeys, storyId, router, calculatedState, allDefinitions]); // Add dependencies
    
    useEffect(() => {
        if (isMounted && settings.skipCharacterCreation && !isSubmitting) {
            const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
            handleSubmit(syntheticEvent);
        }
    }, [isMounted, settings.skipCharacterCreation, handleSubmit]);

    const isVisible = (rule: CharCreateRule) => {
        if (!rule.visible) return false;
        if (!rule.visible_if) return true;
        return evaluateCondition(rule.visible_if, calculatedState.mockQualities, allDefinitions, null, 0);
    };
    const renderChoiceGrid = (ruleObj: CharCreateRule, qid: string) => {
        const options = ruleObj.rule.split('|').map(opt => {
            const parts = opt.split(':');
            const val = parts[0].trim();
            const lbl = parts.length > 1 ? parts.slice(1).join(':').trim() : val;
            return { val, label: lbl };
        });
        const isPortrait = settings?.portraitStyle === 'rect';
        const aspectRatio = isPortrait ? '3/4' : '1/1';
        const sizeSetting = settings?.modalImageSize || 'small';
        const sizeMap: Record<string, string> = {
            small: '100px',
            medium: '150px',
            large: '220px'
        };
        const minColWidth = sizeMap[sizeSetting] || '100px';

        return (
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(auto-fill, minmax(${minColWidth}, 1fr))`, 
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
                                    <div style={{ width: '100%', aspectRatio: aspectRatio, borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
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

        const isRequired = ruleObj.required && !ruleObj.readOnly;
        const requiredMark = isRequired ? <span style={{color:'var(--danger-color)', marginLeft:'4px'}}>*</span> : null;
        if (ruleObj.readOnly || ruleObj.type === 'static') {
            const val = derivedValues[qid] || ruleObj.rule;
            if (ruleObj.hideIfZero) {
                const num = parseFloat(val);
                if (val === '0' || val === '0.0' || (!isNaN(num) && num === 0)) return null;
            }
            const looksLikeImage = imageLibrary[val];
            const aspectRatio = settings.portraitStyle === 'rect' ? '3/4' : '1/1';

            return (
                <div key={key} style={{ marginBottom: '1.5rem', opacity: 0.9 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase' }}>{label}</label>
                    <div style={{ padding: '0.8rem', background: 'var(--bg-item)', borderRadius: '4px', border: '1px solid var(--border-light)', color: 'var(--accent-highlight)', fontWeight: 'bold' }}>
                        {looksLikeImage ? (
                            <div style={{ width: '100px', aspectRatio: aspectRatio, overflow: 'hidden', borderRadius:'4px' }}>
                                <GameImage code={val} imageLibrary={imageLibrary} type="icon" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            val
                        )}
                    </div>
                </div>
            );
        }
        if (['label_select', 'image_select', 'labeled_image_select'].includes(ruleObj.type)) {
            if (ruleObj.displayMode === 'modal') {
                const currentVal = choices[qid];
                let displayLabel = "Select...";
                let displayImage = null;

                if (currentVal) {
                    const options = ruleObj.rule.split('|').map(o => {
                        const [v, l] = o.split(':');
                        return { val: v.trim(), label: l ? l.trim() : v.trim() };
                    });
                    const selectedOpt = options.find(o => o.val === currentVal);
                    
                    displayLabel = selectedOpt ? selectedOpt.label : currentVal;
                    if (imageLibrary[currentVal]) displayImage = currentVal;
                }

                return (
                    <div key={key} style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                            {label} {requiredMark}
                        </label>
                        <div 
                            onClick={() => setActiveSelectModal(qid)}
                            style={{ 
                                background: 'var(--bg-item)', 
                                border: `1px solid ${inputErrors[qid] ? 'var(--danger-color)' : 'var(--border-color)'}`,
                                borderRadius: '8px', 
                                padding: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                transition: 'all 0.2s'
                            }}
                            className="hover:border-highlight"
                        >
                            {displayImage && (
                                <div style={{ width: '60px', aspectRatio: settings.portraitStyle === 'rect' ? '3/4' : '1/1', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, background: '#000' }}>
                                    <GameImage code={displayImage} imageLibrary={imageLibrary} type="icon" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div style={{ flex: 1, fontWeight: displayImage ? 'bold' : 'normal', color: currentVal ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {currentVal ? displayLabel : `Choose ${label}...`}
                            </div>

                            <span style={{ color: 'var(--text-muted)' }}>▼</span>
                        </div>

                        {inputErrors[qid] && <p style={{color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '0.3rem'}}>{inputErrors[qid]}</p>}
                        {activeSelectModal === qid && (
                            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                                <div style={{ background: 'var(--bg-panel)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                                        <h3 style={{ margin: 0 }}>Select {label}</h3>
                                        <button type="button" onClick={() => setActiveSelectModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
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
                    <label style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                         {label} {requiredMark}
                    </label>
                    {renderChoiceGrid(ruleObj, qid)}
                    {inputErrors[qid] && <p style={{color: 'var(--danger-color)', fontSize: '0.8rem', marginTop: '0.3rem'}}>{inputErrors[qid]}</p>}
                </div>
            );
        }
        return (
            <div key={key} style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                     {label} {requiredMark}
                </label>
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
                if (headerRule && !isVisible(headerRule)) return null;
                if (headerRule && headerRule.displayMode === 'modal') {
                    const isOpen = openModalSection === section.headerKey;
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
                            {cardFields.length > 0 && (
                                <div style={{ marginTop: '1rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)' }}>
                                    {cardFields.map(k => renderField(k, rules[k]))}
                                </div>
                            )}
                            {isOpen && (
                                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                                    <div style={{ background: 'var(--bg-panel)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                                            <h2 style={{ margin: 0 }}>{headerLabel}</h2>
                                            <button type="button" onClick={() => setOpenModalSection(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            
                        <button 
                type="submit" 
                disabled={isSubmitting} 
                style={{ 
                    width: '100%', 
                    padding: '1.2rem', 
                    fontSize: '1.2rem', 
                    marginTop: '2rem',
                    background: 'var(--accent-primary)',
                    color: 'var(--accent-text, #fff)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isSubmitting ? 'default' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                    fontFamily: 'var(--font-main)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                }}
            >
                {isSubmitting ? 'Building World...' : 'Begin Your Journey'}
            </button>
        </form>
    );
}