'use client';

import { useState, useMemo } from 'react';
import { CharCreateRule, ImageDefinition, QualityDefinition, QualityType, PlayerQualities } from '@/engine/models';
import { evaluateText, evaluateCondition } from '@/engine/textProcessor';

interface CharSetupPreviewProps {
    rules: Record<string, CharCreateRule>;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
    hideProfileIdentity?: boolean;
}

export default function CharSetupPreview({ rules, qualityDefs, imageLibrary, hideProfileIdentity }: CharSetupPreviewProps) {
    const [choices, setChoices] = useState<Record<string, string>>({});
    const [openModal, setOpenModal] = useState<string | null>(null);

    const sortedKeys = useMemo(
        () => Object.keys(rules).sort((a, b) => (rules[a].ordering || 0) - (rules[b].ordering || 0)),
        [rules]
    );

    // Merge quality defs with synthetic defs for rules without a backing quality
    const allDefs = useMemo(() => {
        const defs: Record<string, QualityDefinition> = { ...qualityDefs };
        sortedKeys.forEach(key => {
            const qid = key.replace(/^\$/, '');
            if (!defs[qid]) {
                const rule = rules[key];
                const isNumeric = rule.type === 'static' && !isNaN(Number(rule.rule));
                defs[qid] = { id: qid, name: qid, type: isNumeric ? QualityType.Pyramidal : QualityType.String, description: '' };
            }
        });
        return defs;
    }, [rules, qualityDefs, sortedKeys]);

    // Build mock qualities from choices + static evaluations (two-pass, same as CreationForm)
    const mockQ = useMemo((): PlayerQualities => {
        const q: PlayerQualities = {};

        // Pass 1: seed from choices
        sortedKeys.forEach(key => {
            const qid = key.replace(/^\$/, '');
            const val = choices[qid] ?? '0';
            const isNum = val.trim() !== '' && !isNaN(Number(val));
            q[qid] = {
                qualityId: qid,
                type: allDefs[qid]?.type ?? QualityType.String,
                level: isNum ? Number(val) : 0,
                stringValue: val,
                changePoints: 0,
                sources: [],
                spentTowardsPrune: 0,
                text_variants: {},
            } as any;
        });

        // Pass 2: evaluate statics
        sortedKeys.forEach(key => {
            const rule = rules[key];
            const qid = key.replace(/^\$/, '');
            if (rule.type !== 'static' && !rule.readOnly) return;
            if (rule.type === 'header') return;
            try {
                const trimmed = rule.rule.trim();
                const expr = trimmed.startsWith('{') && trimmed.endsWith('}') ? trimmed : `{${trimmed}}`;
                const result = evaluateText(expr, q, allDefs, null, 0, {});
                const isNum = result.trim() !== '' && !isNaN(Number(result));
                q[qid] = { ...q[qid], stringValue: result, level: isNum ? Number(result) : 0 };
            } catch (_) {}
        });

        return q;
    }, [choices, rules, sortedKeys, allDefs]);

    const isVisible = (rule: CharCreateRule): boolean => {
        if (!rule.visible) return false;
        if (!rule.visible_if) return true;
        try { return evaluateCondition(rule.visible_if, mockQ, allDefs, null, 0); }
        catch (_) { return true; }
    };

    // Group rules into sections
    const sections = useMemo(() => {
        const result: { headerKey: string | null; keys: string[] }[] = [];
        let current: { headerKey: string | null; keys: string[] } = { headerKey: null, keys: [] };
        sortedKeys.forEach(key => {
            if (rules[key]?.type === 'header') {
                if (current.keys.length > 0 || current.headerKey) result.push(current);
                current = { headerKey: key, keys: [] };
            } else {
                current.keys.push(key);
            }
        });
        if (current.keys.length > 0 || current.headerKey) result.push(current);
        return result;
    }, [sortedKeys, rules]);

    const toLabel = (key: string) =>
        key.replace(/^\$|^__section_\d+$/, '')
           .split('_')
           .map(w => w.charAt(0).toUpperCase() + w.slice(1))
           .join(' ');

    const handleChoice = (qid: string, val: string) => {
        setChoices(p => ({ ...p, [qid]: val }));
        setOpenModal(null);
    };

    // ── Field rendering ───────────────────────────────────────────────────────

    const renderOptions = (rule: CharCreateRule, qid: string) => {
        const opts = rule.rule.split('|').map(o => {
            const ci = o.indexOf(':');
            return ci === -1 ? { val: o.trim(), label: o.trim() } : { val: o.slice(0, ci).trim(), label: o.slice(ci + 1).trim() };
        });
        const current = choices[qid];
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.6rem' }}>
                {opts.map(o => {
                    const img = imageLibrary[o.val];
                    const selected = current === o.val;
                    return (
                        <div
                            key={o.val}
                            onClick={() => handleChoice(qid, o.val)}
                            style={{
                                border: `2px solid ${selected ? 'var(--accent-highlight)' : 'var(--border-color)'}`,
                                background: selected ? 'rgba(97,175,239,0.12)' : 'var(--bg-item)',
                                borderRadius: '6px', cursor: 'pointer', textAlign: 'center',
                                overflow: 'hidden', transition: 'transform 0.15s',
                                transform: selected ? 'scale(1.04)' : 'scale(1)',
                            }}
                        >
                            {img ? (
                                <div style={{ padding: '0.4rem' }}>
                                    <div style={{ width: '100%', aspectRatio: '1/1', overflow: 'hidden', borderRadius: '3px', marginBottom: '4px' }}>
                                        <img src={img.url} alt={o.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    {rule.type === 'labeled_image_select' && (
                                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: selected ? 'var(--text-primary)' : 'var(--text-muted)' }}>{o.label}</div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', fontSize: '0.85rem', color: selected ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                    {o.label}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderField = (key: string) => {
        const rule = rules[key];
        if (!rule || rule.type === 'header') return null;
        if (!isVisible(rule)) return null;

        const qid = key.replace(/^\$/, '');
        const label = toLabel(key);
        const isRequired = rule.required && !rule.readOnly;

        // Static / read-only
        if (rule.type === 'static' || rule.readOnly) {
            const val = mockQ[qid]?.stringValue ?? rule.rule;
            if (rule.hideIfZero && (val === '0' || (val !== '' && !isNaN(Number(val)) && Number(val) === 0))) return null;
            const img = imageLibrary[val];
            return (
                <div key={key} style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '0.3rem', letterSpacing: '0.5px' }}>
                        {label}
                    </div>
                    <div style={{ padding: '0.55rem 0.8rem', background: 'var(--bg-item)', borderRadius: '4px', border: '1px solid var(--border-light)', color: 'var(--accent-highlight)', fontWeight: 'bold' }}>
                        {img ? (
                            <div style={{ width: '80px', aspectRatio: '1/1', overflow: 'hidden', borderRadius: '3px' }}>
                                <img src={img.url} alt={val} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        ) : val}
                    </div>
                </div>
            );
        }

        // Select types
        if (['label_select', 'image_select', 'labeled_image_select'].includes(rule.type)) {
            const opts = rule.rule.split('|').map(o => {
                const ci = o.indexOf(':');
                return ci === -1 ? { val: o.trim(), label: o.trim() } : { val: o.slice(0, ci).trim(), label: o.slice(ci + 1).trim() };
            });
            const current = choices[qid];

            if (rule.displayMode === 'modal') {
                const selected = opts.find(o => o.val === current);
                const selImg = selected && imageLibrary[selected.val];
                return (
                    <div key={key} style={{ marginBottom: '1.25rem' }}>
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '0.3rem', letterSpacing: '0.5px' }}>
                            {label}{isRequired && <span style={{ color: 'var(--danger-color)', marginLeft: '4px' }}>*</span>}
                        </div>
                        <div
                            onClick={() => setOpenModal(qid)}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.6rem 0.8rem', background: 'var(--bg-item)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            {selImg && <div style={{ width: '36px', aspectRatio: '1/1', overflow: 'hidden', borderRadius: '3px', flexShrink: 0 }}><img src={selImg.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                            <div style={{ flex: 1, color: current ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: selImg ? 'bold' : 'normal' }}>
                                {selected ? selected.label : `Choose ${label}...`}
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>▼</span>
                        </div>
                        {openModal === qid && (
                            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                                <div style={{ background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                                        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Select {label}</h3>
                                        <button type="button" onClick={() => setOpenModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1 }}>✕</button>
                                    </div>
                                    {renderOptions(rule, qid)}
                                </div>
                            </div>
                        )}
                    </div>
                );
            }

            return (
                <div key={key} style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                        {label}{isRequired && <span style={{ color: 'var(--danger-color)', marginLeft: '4px' }}>*</span>}
                    </div>
                    {renderOptions(rule, qid)}
                </div>
            );
        }

        // String input
        return (
            <div key={key} style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '0.3rem', letterSpacing: '0.5px' }}>
                    {label}{isRequired && <span style={{ color: 'var(--danger-color)', marginLeft: '4px' }}>*</span>}
                </div>
                <input
                    type="text"
                    value={choices[qid] ?? ''}
                    onChange={e => setChoices(p => ({ ...p, [qid]: e.target.value }))}
                    placeholder={`Enter ${label}...`}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--bg-item)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontFamily: 'var(--font-main)', boxSizing: 'border-box' }}
                />
            </div>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div style={{ position: 'sticky', top: '1rem' }}>
            {/* Preview toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--tool-text-dim)', fontWeight: 'bold', letterSpacing: '1px' }}>
                        Live Preview
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--tool-text-dim)', background: 'var(--tool-bg-input)', border: '1px solid var(--tool-border)', padding: '1px 6px', borderRadius: '3px' }}>
                        interactive
                    </span>
                </div>
                <button
                    onClick={() => setChoices({})}
                    style={{ fontSize: '0.68rem', padding: '2px 8px', background: 'none', border: '1px solid var(--tool-border)', color: 'var(--tool-text-dim)', borderRadius: '3px', cursor: 'pointer' }}
                >
                    Reset
                </button>
            </div>

            {/* Player-theme preview shell */}
            <div
                className="theme-wrapper"
                data-theme="default"
                style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    maxHeight: 'calc(100vh - 140px)',
                    overflowY: 'auto',
                }}
            >
                <h2 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', textAlign: 'center', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                    Create Your Character
                </h2>

                {hideProfileIdentity && (
                    <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(128,128,128,0.1)', border: '1px dashed var(--border-color)', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        Anonymous Protagonist: name &amp; portrait hidden in-game
                    </div>
                )}

                {Object.keys(rules).length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.9rem' }}>
                        Add rules on the left to see a preview.
                    </div>
                )}

                {sections.map((section, idx) => {
                    const headerRule = section.headerKey ? rules[section.headerKey] : null;
                    const headerLabel = headerRule?.rule ?? '';
                    if (headerRule && !isVisible(headerRule)) return null;

                    if (headerRule?.displayMode === 'modal') {
                        const cardFields = section.keys.filter(k => rules[k]?.showOnCard && isVisible(rules[k]));
                        return (
                            <div key={idx} style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, color: 'var(--accent-highlight)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>
                                        {headerLabel}
                                    </h3>
                                    <button
                                        type="button"
                                        style={{ padding: '0.3rem 0.85rem', fontSize: '0.8rem', background: 'var(--bg-item)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        Edit
                                    </button>
                                </div>
                                {cardFields.length > 0 && (
                                    <div style={{ marginTop: '0.75rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)' }}>
                                        {cardFields.map(k => renderField(k))}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div key={idx} style={{ marginBottom: '1.5rem' }}>
                            {headerRule && (
                                <h3 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', color: 'var(--accent-highlight)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>
                                    {headerLabel}
                                </h3>
                            )}
                            {section.keys.map(k => renderField(k))}
                        </div>
                    );
                })}

                <button
                    disabled
                    style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', marginTop: '0.5rem', background: 'var(--accent-primary)', color: 'var(--accent-text, #fff)', border: 'none', borderRadius: '4px', opacity: 0.55, fontFamily: 'var(--font-main)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', cursor: 'not-allowed' }}
                >
                    Begin Your Journey
                </button>
            </div>
        </div>
    );
}
