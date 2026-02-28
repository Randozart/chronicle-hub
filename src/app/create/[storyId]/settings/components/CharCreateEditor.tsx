'use client';

import { CharCreateRule, ImageDefinition, QualityDefinition, QualityType } from "@/engine/models";
import { useState, useMemo } from "react";
import { WarningIcon } from '@/components/icons/Icons';

interface CharCreateProps {
    rules: Record<string, CharCreateRule>;
    onChange: (r: Record<string, CharCreateRule>) => void;
    storyId: string; 
    existingQIDs: string[];
    onCreateQuality: (id: string, type: QualityType, extra?: any) => void;
    onAddCategory: (cat: string, type: 'equip' | 'sheet') => void;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>; 
    skipCreation: boolean;
    onToggleSkip: (val: boolean) => void;

}

export default function CharCreateEditor({ 
    rules, 
    onChange, 
    storyId, 
    onCreateQuality, 
    onAddCategory, 
    imageLibrary,
    skipCreation, 
    onToggleSkip 
}: CharCreateProps) {
    const [newKey, setNewKey] = useState("");
    const [draggedKey, setDraggedKey] = useState<string | null>(null);
    const [pickingFor, setPickingFor] = useState<string | null>(null); 

    const sortedKeys = useMemo(() => {
        return Object.keys(rules).sort((a, b) => (rules[a].ordering || 0) - (rules[b].ordering || 0));
    }, [rules]);

    
    const handleUpdate = (key: string, field: keyof CharCreateRule, val: any) => {
        onChange({ ...rules, [key]: { ...rules[key], [field]: val } });
    };

    const handleDelete = (key: string) => { const next = { ...rules }; delete next[key]; onChange(next); };

    const handleAdd = () => { 
        const qid = newKey.startsWith('$') ? newKey : `$${newKey}`;
        const maxOrder = sortedKeys.length > 0 ? (rules[sortedKeys[sortedKeys.length - 1]].ordering || 0) + 1 : 0;
        onChange({ ...rules, [qid]: { type: 'static', rule: "0", visible: false, readOnly: false, visible_if: '', ordering: maxOrder } }); 
        setNewKey(""); 
    };

    const onDragStart = (e: React.DragEvent, key: string) => { setDraggedKey(key); e.dataTransfer.effectAllowed = "move"; };
    const onDragOver = (e: React.DragEvent, targetKey: string) => { e.preventDefault(); };
    const onDrop = (e: React.DragEvent, targetKey: string) => {
        e.preventDefault();
        if (!draggedKey || draggedKey === targetKey) return;
        const fromIndex = sortedKeys.indexOf(draggedKey);
        const toIndex = sortedKeys.indexOf(targetKey);
        const newOrder = [...sortedKeys];
        newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, draggedKey);
        const nextRules = { ...rules };
        newOrder.forEach((k, idx) => { nextRules[k] = { ...nextRules[k], ordering: idx }; });
        onChange(nextRules);
        setDraggedKey(null);
    };
    
    const addSimpleIdentity = () => {
        const baseOrder = sortedKeys.length;
        const newRules = { ...rules };
        newRules['$identity_header'] = { type: 'header', rule: "Identity", visible: true, readOnly: true, visible_if: '', ordering: baseOrder };
        newRules['$player_name'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: '', ordering: baseOrder + 1 };
        onChange(newRules);
    };

    const removeSimpleIdentity = () => {
        const next = { ...rules };
        delete next['$identity_header'];
        delete next['$player_name'];
        onChange(next);
    };

    const addComplexIdentity = () => {
        const baseOrder = sortedKeys.length;
        onCreateQuality('first_name', QualityType.String, {tags: ['hidden']});
        onCreateQuality('last_name', QualityType.String, {tags: ['hidden']});
        onCreateQuality('player_name', QualityType.String, {tags: ['hidden']});

        const newRules = { ...rules };
        newRules['$identity_header'] = { type: 'header', rule: "Identity", visible: true, readOnly: true, visible_if: '', ordering: baseOrder, displayMode: 'modal' } as any;
        newRules['$first_name'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: '', ordering: baseOrder + 1 };
        newRules['$last_name'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: '', ordering: baseOrder + 2 };
        newRules['$player_name'] = { type: 'static', rule: "{$first_name} {$last_name}", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 3, showOnCard: true };
        
        onChange(newRules);
    };
    
    const removeComplexIdentity = () => {
        const next = { ...rules };
        delete next['$identity_header'];
        delete next['$first_name'];
        delete next['$last_name'];
        delete next['$player_name'];
        onChange(next);
    };

     const addClassSystem = () => {
        const baseOrder = sortedKeys.length;
        onCreateQuality('class', QualityType.String, { name: "Character Class", category: "Identity" });
        onCreateQuality('strength', QualityType.Pyramidal, { name: "Strength", category: "Attributes" });
        onCreateQuality('intellect', QualityType.Pyramidal, { name: "Intellect", category: "Attributes" });
        onCreateQuality('dexterity', QualityType.Pyramidal, { name: "Dexterity", category: "Attributes" });
        onCreateQuality('armor_skill', QualityType.Counter, { name: "Armor Proficiency", category: "Skills", description: "{ $. == 3: Heavy Armor | $. == 2: Medium Armor | $. == 1: Light Armor | Unarmored }" });
        onCreateQuality('magical_studies', QualityType.Pyramidal, { name: "Magical Studies", category: "Skills", description: "{ $. >= 10: Archmage | $. >= 5: Adept | $. >= 1: Novice | Uninitiated }" });
        onCreateQuality('thievery', QualityType.Pyramidal, { name: "Thievery", category: "Skills", description: "{ $. >= 10: Master Thief | $. >= 5: Burglar | $. >= 1: Pickpocket | Honest }" });
        onCreateQuality('starting_plate', QualityType.Equipable, { name: "Old Plate Armor", category: "Body", bonus: "{ $armor_skill >= 3 : $protection + 5 | $protection + 5, $dexterity - 5 }", description: "A heavy suit of iron.", tags: ['auto_equip'] });
        onCreateQuality('thieves_tools', QualityType.Equipable, { name: "Thieves' Tools", category: "Hand", bonus: "$thievery + 1", tags: ['auto_equip'] });
        onCreateQuality('student_wand', QualityType.Equipable, { name: "Student Wand", category: "Hand", bonus: "$intellect + 1", tags: ['auto_equip'] });

        onAddCategory("Body", 'equip');
        onAddCategory("Hand", 'equip');
        onAddCategory("Attributes", 'sheet');
        onAddCategory("Skills", 'sheet');

        const newRules = { ...rules };
        newRules['$class_header'] = { type: 'header', rule: "Class Selection", visible: true, readOnly: true, visible_if: '', displayMode: 'modal', ordering: baseOrder };
        newRules['$class_name'] = { type: 'static', rule: "{ $class == 0 : Pick a Class | {$class} }", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 1, showOnCard: true };
        newRules['$class'] = { type: 'label_select', rule: "Warrior:Warrior | Mage:Mage | Rogue:Rogue", visible: true, readOnly: false, visible_if: '', ordering: baseOrder + 2 };
        newRules['$strength'] = { type: 'static', rule: "{ $class == Warrior : 10 | $class == Rogue : 4 | 2 }", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 3, showOnCard: true };
        newRules['$dexterity'] = { type: 'static', rule: "{ $class == Rogue : 10 | $class == Warrior : 4 | 2 }", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 4, showOnCard: true };
        newRules['$intellect'] = { type: 'static', rule: "{ $class == Mage : 10 | 2 }", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 5, showOnCard: true };
        newRules['$armor_skill'] = { type: 'static', rule: "{ $class == Warrior : 3 | $class == Rogue : 1 | 0 }", visible: false, readOnly: true, visible_if: "", ordering: baseOrder + 6 };
        newRules['$thievery'] = { type: 'static', rule: "{ $class == Rogue : 5 | 0 }", visible: false, readOnly: true, visible_if: "", ordering: baseOrder + 7 };
        newRules['$magical_studies'] = { type: 'static', rule: "{ $class == Mage : 5 | 0 }", visible: false, readOnly: true, visible_if: "", ordering: baseOrder + 8 };
        newRules['$armor_skill_level'] = { type: 'static', rule: "{$armor_skill[{$armor_skill}].description}", visible: true, readOnly: true, visible_if: "$class == Warrior || $class == Rogue", ordering: baseOrder + 9, showOnCard: true };
        newRules['$thievery_level'] = { type: 'static', rule: "{$thievery[{$thievery}].description}", visible: true, readOnly: true, visible_if: "$class == Rogue", ordering: baseOrder + 10, showOnCard: true };
        newRules['$magical_studies_level'] = { type: 'static', rule: "{$magical_studies[{$magical_studies}].description}", visible: true, readOnly: true, visible_if: "$class == Mage", ordering: baseOrder + 11, showOnCard: true };
        newRules['$starting_plate'] = { type: 'static', rule: "{ $class == Warrior : 1 | 0 }", visible: false, readOnly: true, visible_if: '$class == Warrior', ordering: baseOrder + 12 };
        newRules['$thieves_tools'] = { type: 'static', rule: "{ $class == Rogue : 1 | 0 }", visible: false, readOnly: true, visible_if: '$class == Rogue', ordering: baseOrder + 13 };
        newRules['$student_wand'] = { type: 'static', rule: "{ $class == Mage : 1 | 0 }", visible: false, readOnly: true, visible_if: '$class == Mage', ordering: baseOrder + 14 };

        onChange(newRules);
    };
    
    const removeClassSystem = () => {
        const next = { ...rules };
        ['$class_header','$class','$strength','$dexterity','$intellect','$armor_skill','$starting_plate',
            '$thieves_tools','$student_wand', '$magical_studies', '$thievery','$magical_studies_level','$thievery_level', '$armor_skill_level', '$class_name'].forEach(k => delete next[k]);
        onChange(next);
    };

    const addPronounSystem = () => {
        const baseOrder = sortedKeys.length;
        onCreateQuality('pronouns', QualityType.String, { 
            name: 'Pronouns',
            tags: ['hidden'] ,
            text_variants: {
                "subject": "{ $.stringValue == he/him : he | $.stringValue == she/her : she | $.stringValue == they/them : they | {$pronoun_subject} }",
                "object": "{ $.stringValue == he/him : him | $.stringValue == she/her : her | $.stringValue == they/them : them | {$pronoun_object} }",
                "possessive": "{ $.stringValue == he/him : his | $.stringValue == she/her : her | $.stringValue == they/them : their | {$pronoun_possessive} }"
            }
        });
        onCreateQuality('pronoun_subject', QualityType.String, { name: "Subject Pronoun (He/She/They)",tags: ['hidden']});
        onCreateQuality('pronoun_object', QualityType.String, { name: "Object Pronoun (Him/Her/Them)",tags: ['hidden']});
        onCreateQuality('pronoun_possessive', QualityType.String, { name: "Possessive Pronoun (His/Her/Their)",tags: ['hidden']});

        const newRules = { ...rules };
        newRules['$pronouns_header'] = { type: 'header', rule: "Pronouns", visible: true, readOnly: true, visible_if: '', ordering: baseOrder };
        newRules['$pronouns'] = { type: 'label_select', rule: "he/him:He/Him | she/her:She/Her | they/them:They/Them | Custom:Custom", visible: true, readOnly: false, visible_if: '', ordering: baseOrder + 1 };
        newRules['$pronoun_subject'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: "$pronouns == Custom", ordering: baseOrder + 2 };
        newRules['$pronoun_object'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: "$pronouns == Custom", ordering: baseOrder + 3 };
        newRules['$pronoun_possessive'] = { type: 'string', rule: '', visible: true, readOnly: false, visible_if: "$pronouns == Custom", ordering: baseOrder + 4 };
        onChange(newRules);
    };
    
    const removePronounSystem = () => {
        const next = { ...rules };
        ['$pronouns_header','$pronouns','$pronoun_subject','$pronoun_object','$pronoun_possessive'].forEach(k => delete next[k]);
        onChange(next);
    };

    const addSimpleStats = () => {
        const baseOrder = sortedKeys.length;
        onCreateQuality('body', QualityType.Pyramidal);
        onCreateQuality('mind', QualityType.Pyramidal);
        onCreateQuality('spirit', QualityType.Pyramidal);
        const newRules = { ...rules };
        newRules['$stats_header'] = { type: 'header', rule: "Stats", visible: true, readOnly: true, visible_if: '', ordering: baseOrder };
        newRules['$body'] = { type: 'static', rule: "10", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 1 };
        newRules['$mind'] = { type: 'static', rule: "10", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 2 };
        newRules['$spirit'] = { type: 'static', rule: "10", visible: true, readOnly: true, visible_if: '', ordering: baseOrder + 3 };
        onChange(newRules);
    };
    
    const removeSimpleStats = () => {
        const next = { ...rules };
        ['$stats_header','$body','$mind','$spirit'].forEach(k => delete next[k]);
        onChange(next);
    };

    const addVariableLocation = () => {
         const baseOrder = sortedKeys.length;
         const newRules = { ...rules };
         newRules['$location'] = { type: 'label_select', rule: "village:The Village | city:The City", visible: true, readOnly: false, visible_if: '', ordering: baseOrder };
         onChange(newRules);
    };
    
    const removeVariableLocation = () => {
        const next = { ...rules };
        delete next['$location'];
        onChange(next);
    };

    const hasRule = (k: string) => !!rules[k];

    return (
        <div className="special-field-group" style={{ borderColor: 'var(--warning-color)' }}>
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--tool-border)' }}>
                <label className="toggle-label" style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--tool-text-header)' }}>
                    <input 
                        type="checkbox" 
                        checked={skipCreation} 
                        onChange={e => onToggleSkip(e.target.checked)} 
                    />
                    Skip Character Creation Screen
                </label>
                <p className="special-desc" style={{ marginTop: '0.5rem' }}>
                    If enabled, players click &quot;Start New Game&quot; and skip the form. 
                    <br/>
                    <strong>Static/Calculated</strong> rules will still run to set up the character. 
                    <strong>Interactive</strong> fields (Inputs, Selects) will simply default to empty/zero since the player cannot interact with them.
                </p>
            </div>

            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <label className="special-label" style={{ color: 'var(--warning-color)', margin: 0 }}>Character Initialization Rules</label>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <PresetToggle label="Simple Name" has={hasRule('$player_name') && !hasRule('$first_name')} onAdd={addSimpleIdentity} onRemove={removeSimpleIdentity} />
                        <PresetToggle label="Complex Name" has={hasRule('$first_name')} onAdd={addComplexIdentity} onRemove={removeComplexIdentity} />
                        <PresetToggle label="Stats" has={hasRule('$body')} onAdd={addSimpleStats} onRemove={removeSimpleStats} />
                        <PresetToggle label="Class System" has={hasRule('$class')} onAdd={addClassSystem} onRemove={removeClassSystem} />
                        <PresetToggle label="Pronouns" has={hasRule('$pronouns')} onAdd={addPronounSystem} onRemove={removePronounSystem} />
                        <PresetToggle label="Location" has={hasRule('$location')} onAdd={addVariableLocation} onRemove={removeVariableLocation} />
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {pickingFor && (
                        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 9999, padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ background: 'var(--bg-panel)', padding: '1rem', borderRadius: '8px', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', border: '1px solid var(--tool-border)' }}>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}>
                                    <h3 style={{color: 'var(--tool-text-header)'}}>Pick Image for {pickingFor}</h3>
                                    <button onClick={() => setPickingFor(null)} className="unequip-btn">Close</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px' }}>
                                    {Object.values(imageLibrary).map(img => (
                                        <div key={img.id} onClick={() => {
                                            const oldRule = rules[pickingFor!].rule || "";
                                            const append = `${img.id}:${img.id}`;
                                            const newRule = oldRule ? `${oldRule} | ${append}` : append;
                                            handleUpdate(pickingFor!, 'rule', newRule);
                                            setPickingFor(null);
                                        }} style={{ cursor: 'pointer', border: '1px solid var(--tool-border)', padding: '4px', borderRadius: '4px' }}>
                                            <div style={{width:'100%', aspectRatio:'1/1', overflow:'hidden', borderRadius:'4px'}}>
                                                <img src={img.url} style={{width:'100%', height:'100%', objectFit:'cover'}} alt={img.alt} />
                                            </div>
                                            <div style={{fontSize:'0.7rem', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', color: 'var(--tool-text-main)'}}>{img.id}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {sortedKeys.map(key => {
                        const rule = rules[key];
                        if (!rule || typeof rule.rule === 'undefined') return null;
                        const isDerived = rule.rule.includes('$') || rule.rule.includes('@');
                        const isConditional = !!rule.visible_if;
                        const isInteractive = ['string', 'label_select', 'image_select', 'labeled_image_select'].includes(rule.type);
                        const showSkippedWarning = skipCreation && isInteractive;

                        let rulePlaceholder = "Value";
                        if (rule.type === 'label_select') rulePlaceholder = "1:Sir | 2:Dame";
                        if (rule.type === 'image_select') rulePlaceholder = "img_1:Label | img_2:Label";
                        if (rule.type === 'static') rulePlaceholder = "10 or { $other * 2 }";

                        return (
                            <div 
                                key={key} 
                                draggable
                                onDragStart={(e) => onDragStart(e, key)}
                                onDragOver={(e) => onDragOver(e, key)}
                                onDrop={(e) => onDrop(e, key)}
                                style={{ 
                                    background: 'var(--tool-bg-header)', padding: '0.75rem', borderRadius: '4px', 
                                    borderLeft: `4px solid ${rule.type === 'header' ? 'var(--tool-accent-mauve)' : 'var(--success-color)'}`,
                                    border: '1px solid var(--tool-border)',
                                    borderLeftWidth: '4px',
                                    cursor: 'move',
                                    opacity: draggedKey === key ? 0.5 : 1
                                }}
                            >
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div style={{ fontFamily: 'monospace', color: rule.type === 'header' ? 'var(--tool-accent-mauve)' : 'var(--success-color)', flex: 1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span style={{ cursor: 'grab', marginRight: '5px', opacity: 0.5 }}>☰</span>
                                        {isConditional && <span title={`Visible If: ${rule.visible_if}`}>👁️</span>}
                                        {key}
                                        {isDerived && <span title="Derived/Calculated Value" style={{ color: 'var(--tool-accent-mauve)' }}>ƒ</span>}
                                        {rule.type === 'header' && rule.displayMode === 'modal' && <span style={{fontSize:'0.7rem', border:'1px solid var(--tool-accent-mauve)', color: 'var(--tool-accent-mauve)', padding:'0 4px', borderRadius:'4px'}}>MODAL</span>}
                                    </div>
                                    <select 
                                        value={rule.type} 
                                        onChange={e => handleUpdate(key, 'type', e.target.value as any)} 
                                        className="form-select" 
                                        style={{ width: '120px', padding: '2px' }}
                                    >
                                        <option value="header">-- Header --</option>
                                        <option value="string">Text Input</option>
                                        <option value="static">Static/Calc</option>
                                        <option value="label_select">Buttons</option>
                                        <option value="image_select">Images</option>
                                        <option value="labeled_image_select">Img+Label</option>
                                    </select>
                                    <button onClick={() => handleDelete(key)} style={{color: 'var(--danger-color)', background: 'none', border: 'none', cursor: 'pointer'}}>✕</button>
                                </div>
                                {showSkippedWarning && (
                                    <div style={{ 
                                        background: 'rgba(255, 200, 0, 0.1)', 
                                        border: '1px solid #eebb00', 
                                        color: '#eebb00', 
                                        padding: '0.5rem', 
                                        fontSize: '0.8rem', 
                                        borderRadius: '4px', 
                                        marginBottom: '0.75rem', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '0.5rem' 
                                    }}>
                                        <WarningIcon width={14} height={14} />
                                        <span>Player cannot interact with this. Value will remain empty. Change to <strong>Static</strong> to force a starting value.</span>
                                    </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div style={{position:'relative'}}>
                                        <input 
                                            value={rule.rule} 
                                            onChange={e => handleUpdate(key, 'rule', e.target.value)} 
                                            className="form-input" 
                                            placeholder={rulePlaceholder}
                                            style={rule.type === 'header' ? { fontWeight: 'bold', color: 'var(--tool-text-header)' } : {}}
                                        />
                                        {(rule.type === 'image_select' || rule.type === 'labeled_image_select') && (
                                            <button onClick={() => setPickingFor(key)} style={{position:'absolute', right:5, top:5, padding:'2px 5px', fontSize:'0.7rem', background:'var(--tool-bg-dark)', border:'1px solid var(--tool-border)', color:'var(--tool-text-main)', borderRadius:'3px', cursor:'pointer'}}>+ Pick</button>
                                        )}
                                        <span className="property-hint" style={{marginLeft: 0}}>
                                            {rule.type === 'header' ? 'Section Title' : 'Rule / Data'}
                                        </span>
                                    </div>
                                    <div>
                                        <input 
                                            value={rule.visible_if || ''} 
                                            onChange={e => handleUpdate(key, 'visible_if', e.target.value)} 
                                            className="form-input" 
                                            placeholder="Visible If (e.g. $q == 1)"
                                        />
                                        <span className="property-hint" style={{marginLeft: 0}}>Condition</span>
                                    </div>
                                </div>
                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.8rem', borderTop: '1px dashed var(--tool-border)', paddingTop: '0.5rem', flexWrap: 'wrap' }}>
                                    <label className="toggle-label">
                                        <input type="checkbox" checked={rule.visible} onChange={e => handleUpdate(key, 'visible', e.target.checked)} /> Visible
                                    </label>
                                    
                                    {rule.type !== 'header' && !rule.readOnly && (
                                        <label className="toggle-label" style={{ color: rule.required ? 'var(--warning-color)' : 'inherit' }}>
                                            <input type="checkbox" checked={!!rule.required} onChange={e => handleUpdate(key, 'required', e.target.checked)} /> 
                                            Required
                                        </label>
                                    )}
                                    
                                    <label className="toggle-label">
                                        <input type="checkbox" checked={rule.readOnly} onChange={e => handleUpdate(key, 'readOnly', e.target.checked)} /> Read-Only
                                    </label>
                                    
                                    {(rule.type === 'static' || rule.readOnly) && (
                                        <label className="toggle-label" title="Hide this field if the value is 0">
                                            <input type="checkbox" checked={!!rule.hideIfZero} onChange={e => handleUpdate(key, 'hideIfZero', e.target.checked)} /> 
                                            Hide if 0
                                        </label>
                                    )}
                                    
                                    {rule.type !== 'header' && (
                                        <label className="toggle-label" title="If inside a Modal Section, check this to ALSO show it on the main card.">
                                            <input type="checkbox" checked={!!rule.showOnCard} onChange={e => handleUpdate(key, 'showOnCard', e.target.checked)} /> 
                                            Show on Card
                                        </label>
                                    )}
                                    
                                    {rule.type === 'header' && (
                                        <div style={{ marginLeft: 'auto' }}>
                                            <label className="toggle-label" title="If checked, this header becomes a button that opens a popup for the settings below it.">
                                            <input 
                                                type="checkbox" 
                                                checked={rule.displayMode === 'modal'} 
                                                onChange={e => handleUpdate(key, 'displayMode', e.target.checked ? 'modal' : 'inline')} 
                                            /> 
                                            As Modal Button
                                            </label>
                                        </div>
                                    )}
                                    
                                    {['label_select', 'image_select', 'labeled_image_select'].includes(rule.type) && (
                                        <div style={{ marginLeft: 'auto' }}>
                                            <label className="toggle-label">
                                                <input 
                                                    type="checkbox" 
                                                    checked={rule.displayMode === 'modal'} 
                                                    onChange={e => handleUpdate(key, 'displayMode', e.target.checked ? 'modal' : 'inline')} 
                                                /> 
                                                Use Modal
                                            </label>
                                        </div>
                                    )}
                                </div>  
                            </div>
                        );
                    })}
                </div>
                
                 <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--tool-border)' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="$quality_id" className="form-input" style={{ flex: 1 }} />
                        <button onClick={handleAdd} className="save-btn" style={{ width: 'auto', padding: '0.5rem 1.5rem', height: 'fit-content' }}>Add Rule</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PresetToggle({ has, onAdd, onRemove, label }: { has: boolean, onAdd: () => void, onRemove: () => void, label: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', background: has ? 'var(--success-bg)' : 'var(--tool-bg-input)', borderRadius: '4px', overflow: 'hidden', border: has ? '1px solid var(--success-color)' : '1px solid var(--tool-border)' }}>
            <button 
                onClick={has ? undefined : onAdd}
                disabled={has}
                style={{ 
                    fontSize: '0.7rem', padding: '4px 8px', 
                    background: 'transparent', color: has ? 'var(--success-color)' : 'var(--tool-text-main)', border: 'none', 
                    cursor: has ? 'default' : 'pointer' 
                }}
            >
                {has ? `✓ ${label}` : `+ ${label}`}
            </button>
            {has && (
                <button 
                    onClick={onRemove}
                    style={{ 
                        fontSize: '0.7rem', padding: '4px 6px', 
                        background: 'var(--tool-bg-dark)', color: 'var(--danger-color)', border: 'none', borderLeft: '1px solid var(--success-color)',
                        cursor: 'pointer' 
                    }}
                    title="Remove Preset"
                >
                    ✕
                </button>
            )}
        </div>
    );
}