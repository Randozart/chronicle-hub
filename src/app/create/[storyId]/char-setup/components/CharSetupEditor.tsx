'use client';

import { CharCreateRule, ImageDefinition, QualityDefinition, QualityType } from '@/engine/models';
import { useState, useMemo } from 'react';
import SmartArea from '@/components/admin/SmartArea';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CharSetupEditorProps {
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
    hideProfileIdentity: boolean;
    onToggleAnon: (val: boolean) => void;
}

interface OptionRow { value: string; label: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const SELECT_TYPES = ['label_select', 'image_select', 'labeled_image_select'];
const IMAGE_TYPES  = ['image_select', 'labeled_image_select'];

const TYPE_BUTTONS: { value: CharCreateRule['type']; icon: string; label: string }[] = [
    { value: 'header',               icon: '──',   label: 'Section'   },
    { value: 'string',               icon: 'Aa',   label: 'Text'      },
    { value: 'static',               icon: 'ƒ',    label: 'Calc'      },
    { value: 'label_select',         icon: '≡',    label: 'Choices'   },
    { value: 'image_select',         icon: '⊞',    label: 'Images'    },
    { value: 'labeled_image_select', icon: '⊞Aa',  label: 'Img+Label' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePipeString(raw: string): OptionRow[] {
    if (!raw.trim()) return [];
    return raw.split('|').map(part => {
        const idx = part.indexOf(':');
        if (idx === -1) return { value: part.trim(), label: part.trim() };
        return { value: part.slice(0, idx).trim(), label: part.slice(idx + 1).trim() };
    });
}

function serializePipeRows(rows: OptionRow[]): string {
    return rows.map(r => `${r.value}:${r.label}`).join(' | ');
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CharSetupEditor({
    rules,
    onChange,
    storyId,
    onCreateQuality,
    onAddCategory,
    imageLibrary,
    qualityDefs,
    skipCreation,
    onToggleSkip,
    hideProfileIdentity,
    onToggleAnon,
}: CharSetupEditorProps) {
    const [newKey, setNewKey] = useState('');
    const [draggedKey, setDraggedKey] = useState<string | null>(null);
    const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());

    const toggleCollapse = (key: string) =>
        setCollapsedKeys(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
    const collapseAll = () => setCollapsedKeys(new Set(sortedKeys));
    const expandAll   = () => setCollapsedKeys(new Set());

    const qualityDefsArray = useMemo(() => Object.values(qualityDefs), [qualityDefs]);

    const sortedKeys = useMemo(
        () => Object.keys(rules).sort((a, b) => (rules[a].ordering || 0) - (rules[b].ordering || 0)),
        [rules]
    );

    const handleUpdate = (key: string, field: keyof CharCreateRule, val: any) => {
        onChange({ ...rules, [key]: { ...rules[key], [field]: val } });
    };

    const handleDelete = (key: string) => {
        const next = { ...rules };
        delete next[key];
        onChange(next);
    };

    const handleAdd = () => {
        if (!newKey.trim()) return;
        const qid = newKey.startsWith('$') ? newKey : `$${newKey}`;
        const maxOrder = sortedKeys.length > 0 ? (rules[sortedKeys[sortedKeys.length - 1]].ordering || 0) + 1 : 0;
        onChange({ ...rules, [qid]: { type: 'static', rule: '0', visible: false, readOnly: false, visible_if: '', ordering: maxOrder } });
        setNewKey('');
    };

    const addSection = () => {
        const key = `__section_${Date.now()}`;
        const maxOrder = sortedKeys.length > 0 ? (rules[sortedKeys[sortedKeys.length - 1]].ordering || 0) + 1 : 0;
        onChange({ ...rules, [key]: { type: 'header', rule: 'New Section', visible: true, readOnly: true, visible_if: '', ordering: maxOrder } });
    };

    // Drag-to-reorder
    const onDragStart = (e: React.DragEvent, key: string) => { setDraggedKey(key); e.dataTransfer.effectAllowed = 'move'; };
    const onDragOver  = (e: React.DragEvent) => e.preventDefault();
    const onDrop = (e: React.DragEvent, targetKey: string) => {
        e.preventDefault();
        if (!draggedKey || draggedKey === targetKey) return;
        const from = sortedKeys.indexOf(draggedKey);
        const to   = sortedKeys.indexOf(targetKey);
        const newOrder = [...sortedKeys];
        newOrder.splice(from, 1);
        newOrder.splice(to, 0, draggedKey);
        const next = { ...rules };
        newOrder.forEach((k, idx) => { next[k] = { ...next[k], ordering: idx }; });
        onChange(next);
        setDraggedKey(null);
    };

    // ── Presets ───────────────────────────────────────────────────────────────

    const hasRule = (k: string) => !!rules[k];

    const addSimpleIdentity = () => {
        const base = sortedKeys.length;
        onChange({
            ...rules,
            '$identity_header': { type: 'header', rule: 'Identity',    visible: true,  readOnly: true,  visible_if: '', ordering: base     },
            '$player_name':      { type: 'string', rule: '',            visible: true,  readOnly: false, visible_if: '', ordering: base + 1 },
        });
    };
    const removeSimpleIdentity = () => {
        const next = { ...rules };
        delete next['$identity_header'];
        delete next['$player_name'];
        onChange(next);
    };

    const addComplexIdentity = () => {
        const base = sortedKeys.length;
        onCreateQuality('first_name',  QualityType.String, { tags: ['hidden'] });
        onCreateQuality('last_name',   QualityType.String, { tags: ['hidden'] });
        onCreateQuality('player_name', QualityType.String, { tags: ['hidden'] });
        onChange({
            ...rules,
            '$identity_header': { type: 'header', rule: 'Identity',                   visible: true, readOnly: true,  visible_if: '', ordering: base,     displayMode: 'modal' } as any,
            '$first_name':      { type: 'string', rule: '',                            visible: true, readOnly: false, visible_if: '', ordering: base + 1  },
            '$last_name':       { type: 'string', rule: '',                            visible: true, readOnly: false, visible_if: '', ordering: base + 2  },
            '$player_name':     { type: 'static', rule: '{$first_name} {$last_name}',  visible: true, readOnly: true,  visible_if: '', ordering: base + 3, showOnCard: true },
        });
    };
    const removeComplexIdentity = () => {
        const next = { ...rules };
        ['$identity_header', '$first_name', '$last_name', '$player_name'].forEach(k => delete next[k]);
        onChange(next);
    };

    const addSimpleStats = () => {
        const base = sortedKeys.length;
        onCreateQuality('body',   QualityType.Pyramidal);
        onCreateQuality('mind',   QualityType.Pyramidal);
        onCreateQuality('spirit', QualityType.Pyramidal);
        onChange({
            ...rules,
            '$stats_header': { type: 'header', rule: 'Stats', visible: true, readOnly: true,  visible_if: '', ordering: base     },
            '$body':         { type: 'static', rule: '10',    visible: true, readOnly: true,  visible_if: '', ordering: base + 1 },
            '$mind':         { type: 'static', rule: '10',    visible: true, readOnly: true,  visible_if: '', ordering: base + 2 },
            '$spirit':       { type: 'static', rule: '10',    visible: true, readOnly: true,  visible_if: '', ordering: base + 3 },
        });
    };
    const removeSimpleStats = () => {
        const next = { ...rules };
        ['$stats_header', '$body', '$mind', '$spirit'].forEach(k => delete next[k]);
        onChange(next);
    };

    const addClassSystem = () => {
        const base = sortedKeys.length;
        onCreateQuality('class',           QualityType.String,    { name: 'Character Class',      category: 'Identity'   });
        onCreateQuality('strength',        QualityType.Pyramidal, { name: 'Strength',             category: 'Attributes' });
        onCreateQuality('intellect',       QualityType.Pyramidal, { name: 'Intellect',            category: 'Attributes' });
        onCreateQuality('dexterity',       QualityType.Pyramidal, { name: 'Dexterity',            category: 'Attributes' });
        onCreateQuality('armor_skill',     QualityType.Counter,   { name: 'Armor Proficiency',    category: 'Skills', description: '{ $. == 3: Heavy Armor | $. == 2: Medium Armor | $. == 1: Light Armor | Unarmored }' });
        onCreateQuality('magical_studies', QualityType.Pyramidal, { name: 'Magical Studies',      category: 'Skills', description: '{ $. >= 10: Archmage | $. >= 5: Adept | $. >= 1: Novice | Uninitiated }'         });
        onCreateQuality('thievery',        QualityType.Pyramidal, { name: 'Thievery',             category: 'Skills', description: '{ $. >= 10: Master Thief | $. >= 5: Burglar | $. >= 1: Pickpocket | Honest }'   });
        onCreateQuality('starting_plate',  QualityType.Equipable, { name: 'Old Plate Armor',      category: 'Body',  bonus: '{ $armor_skill >= 3 : $protection + 5 | $protection + 5, $dexterity - 5 }', description: 'A heavy suit of iron.', tags: ['auto_equip'] });
        onCreateQuality('thieves_tools',   QualityType.Equipable, { name: "Thieves' Tools",       category: 'Hand',  bonus: '$thievery + 1', tags: ['auto_equip'] });
        onCreateQuality('student_wand',    QualityType.Equipable, { name: 'Student Wand',         category: 'Hand',  bonus: '$intellect + 1', tags: ['auto_equip'] });
        onAddCategory('Body',       'equip');
        onAddCategory('Hand',       'equip');
        onAddCategory('Attributes', 'sheet');
        onAddCategory('Skills',     'sheet');
        onChange({
            ...rules,
            '$class_header':          { type: 'header',       rule: 'Class Selection',                                                 visible: true,  readOnly: true,  visible_if: '',                        ordering: base,      displayMode: 'modal' } as any,
            '$class_name':            { type: 'static',       rule: '{ $class == 0 : Pick a Class | {$class} }',                       visible: true,  readOnly: true,  visible_if: '',                        ordering: base + 1,  showOnCard: true },
            '$class':                 { type: 'label_select', rule: 'Warrior:Warrior | Mage:Mage | Rogue:Rogue',                       visible: true,  readOnly: false, visible_if: '',                        ordering: base + 2  },
            '$strength':              { type: 'static',       rule: '{ $class == Warrior : 10 | $class == Rogue : 4 | 2 }',            visible: true,  readOnly: true,  visible_if: '',                        ordering: base + 3,  showOnCard: true },
            '$dexterity':             { type: 'static',       rule: '{ $class == Rogue : 10 | $class == Warrior : 4 | 2 }',            visible: true,  readOnly: true,  visible_if: '',                        ordering: base + 4,  showOnCard: true },
            '$intellect':             { type: 'static',       rule: '{ $class == Mage : 10 | 2 }',                                    visible: true,  readOnly: true,  visible_if: '',                        ordering: base + 5,  showOnCard: true },
            '$armor_skill':           { type: 'static',       rule: '{ $class == Warrior : 3 | $class == Rogue : 1 | 0 }',            visible: false, readOnly: true,  visible_if: '',                        ordering: base + 6  },
            '$thievery':              { type: 'static',       rule: '{ $class == Rogue : 5 | 0 }',                                    visible: false, readOnly: true,  visible_if: '',                        ordering: base + 7  },
            '$magical_studies':       { type: 'static',       rule: '{ $class == Mage : 5 | 0 }',                                     visible: false, readOnly: true,  visible_if: '',                        ordering: base + 8  },
            '$armor_skill_level':     { type: 'static',       rule: '{$armor_skill[{$armor_skill}].description}',                      visible: true,  readOnly: true,  visible_if: '$class == Warrior || $class == Rogue', ordering: base + 9,  showOnCard: true },
            '$thievery_level':        { type: 'static',       rule: '{$thievery[{$thievery}].description}',                           visible: true,  readOnly: true,  visible_if: '$class == Rogue',         ordering: base + 10, showOnCard: true },
            '$magical_studies_level': { type: 'static',       rule: '{$magical_studies[{$magical_studies}].description}',              visible: true,  readOnly: true,  visible_if: '$class == Mage',          ordering: base + 11, showOnCard: true },
            '$starting_plate':        { type: 'static',       rule: '{ $class == Warrior : 1 | 0 }',                                  visible: false, readOnly: true,  visible_if: '$class == Warrior',       ordering: base + 12 },
            '$thieves_tools':         { type: 'static',       rule: '{ $class == Rogue : 1 | 0 }',                                    visible: false, readOnly: true,  visible_if: '$class == Rogue',         ordering: base + 13 },
            '$student_wand':          { type: 'static',       rule: '{ $class == Mage : 1 | 0 }',                                     visible: false, readOnly: true,  visible_if: '$class == Mage',          ordering: base + 14 },
        });
    };
    const removeClassSystem = () => {
        const next = { ...rules };
        ['$class_header','$class','$class_name','$strength','$dexterity','$intellect','$armor_skill',
         '$thievery','$magical_studies','$armor_skill_level','$thievery_level','$magical_studies_level',
         '$starting_plate','$thieves_tools','$student_wand'].forEach(k => delete next[k]);
        onChange(next);
    };

    const addPronounSystem = () => {
        const base = sortedKeys.length;
        onCreateQuality('pronouns',          QualityType.String, { name: 'Pronouns', tags: ['hidden'], text_variants: {
            subject:    '{ $.stringValue == he/him : he | $.stringValue == she/her : she | $.stringValue == they/them : they | {$pronoun_subject} }',
            object:     '{ $.stringValue == he/him : him | $.stringValue == she/her : her | $.stringValue == they/them : them | {$pronoun_object} }',
            possessive: '{ $.stringValue == he/him : his | $.stringValue == she/her : her | $.stringValue == they/them : their | {$pronoun_possessive} }',
        }});
        onCreateQuality('pronoun_subject',    QualityType.String, { name: 'Subject Pronoun (He/She/They)',    tags: ['hidden'] });
        onCreateQuality('pronoun_object',     QualityType.String, { name: 'Object Pronoun (Him/Her/Them)',     tags: ['hidden'] });
        onCreateQuality('pronoun_possessive', QualityType.String, { name: 'Possessive Pronoun (His/Her/Their)', tags: ['hidden'] });
        onChange({
            ...rules,
            '$pronouns_header':    { type: 'header',       rule: 'Pronouns',                                                              visible: true, readOnly: true,  visible_if: '',                  ordering: base     },
            '$pronouns':           { type: 'label_select', rule: 'he/him:He/Him | she/her:She/Her | they/them:They/Them | Custom:Custom', visible: true, readOnly: false, visible_if: '',                  ordering: base + 1 },
            '$pronoun_subject':    { type: 'string',       rule: '',                                                                      visible: true, readOnly: false, visible_if: '$pronouns == Custom', ordering: base + 2 },
            '$pronoun_object':     { type: 'string',       rule: '',                                                                      visible: true, readOnly: false, visible_if: '$pronouns == Custom', ordering: base + 3 },
            '$pronoun_possessive': { type: 'string',       rule: '',                                                                      visible: true, readOnly: false, visible_if: '$pronouns == Custom', ordering: base + 4 },
        });
    };
    const removePronounSystem = () => {
        const next = { ...rules };
        ['$pronouns_header','$pronouns','$pronoun_subject','$pronoun_object','$pronoun_possessive'].forEach(k => delete next[k]);
        onChange(next);
    };

    const addVariableLocation = () => {
        const base = sortedKeys.length;
        onChange({
            ...rules,
            '$location': { type: 'label_select', rule: 'village:The Village | city:The City', visible: true, readOnly: false, visible_if: '', ordering: base },
        });
    };
    const removeVariableLocation = () => {
        const next = { ...rules };
        delete next['$location'];
        onChange(next);
    };

    const presetDefs = [
        {
            label: 'Simple Name', has: hasRule('$player_name') && !hasRule('$first_name'),
            description: "Single text field for the player's character name.",
            creates: [],
            onAdd: addSimpleIdentity, onRemove: removeSimpleIdentity,
        },
        {
            label: 'Complex Name', has: hasRule('$first_name'),
            description: 'First + last name fields combined into $player_name via a modal.',
            creates: ['first_name', 'last_name', 'player_name'],
            onAdd: addComplexIdentity, onRemove: removeComplexIdentity,
        },
        {
            label: 'Simple Stats', has: hasRule('$body'),
            description: 'Body / Mind / Spirit qualities each set to 10 at start.',
            creates: ['body', 'mind', 'spirit'],
            onAdd: addSimpleStats, onRemove: removeSimpleStats,
        },
        {
            label: 'Class System', has: hasRule('$class'),
            description: 'Warrior / Mage / Rogue picker with derived attributes & starter gear.',
            creates: ['class', 'strength', 'intellect', 'dexterity', 'armor_skill', 'magical_studies', 'thievery', 'starting_plate', 'thieves_tools', 'student_wand'],
            onAdd: addClassSystem, onRemove: removeClassSystem,
        },
        {
            label: 'Pronoun System', has: hasRule('$pronouns'),
            description: 'He / She / They selector with custom pronoun fallback fields.',
            creates: ['pronouns', 'pronoun_subject', 'pronoun_object', 'pronoun_possessive'],
            onAdd: addPronounSystem, onRemove: removePronounSystem,
        },
        {
            label: 'Starting Location', has: hasRule('$location'),
            description: 'Lets players pick their starting location from a defined list.',
            creates: [],
            onAdd: addVariableLocation, onRemove: removeVariableLocation,
        },
    ];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div>
            {/* Global toggles */}
            <div style={{ background: 'var(--tool-bg-header)', border: '1px solid var(--tool-border)', borderRadius: '6px', padding: '1rem', marginBottom: '1.5rem' }}>
                <label className="toggle-label" style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--tool-text-header)' }}>
                    <input type="checkbox" checked={skipCreation} onChange={e => onToggleSkip(e.target.checked)} />
                    Skip Character Creation Screen
                </label>
                <p className="special-desc" style={{ marginTop: '0.35rem', marginBottom: 0, marginLeft: '1.5rem' }}>
                    Players skip the form entirely. <strong>Calc</strong> rules still run; interactive fields default to empty.
                </p>

                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--tool-border)' }}>
                    <label className="toggle-label" style={{ fontWeight: 'bold', color: 'var(--tool-text-header)' }}>
                        <input type="checkbox" checked={hideProfileIdentity} onChange={e => onToggleAnon(e.target.checked)} />
                        Anonymous Protagonist
                    </label>
                    <p className="special-desc" style={{ marginTop: '0.35rem', marginBottom: 0, marginLeft: '1.5rem' }}>
                        Hides the player&apos;s name and portrait everywhere in-game. Useful when the protagonist is predetermined or unnamed.
                    </p>
                </div>
            </div>

            {/* Presets */}
            <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--tool-text-dim)', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '0.65rem' }}>
                    Presets
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.5rem' }}>
                    {presetDefs.map(p => <PresetCard key={p.label} {...p} />)}
                </div>
            </div>

            {/* Rules header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--tool-text-dim)', fontWeight: 'bold', letterSpacing: '1px' }}>
                    Initialization Rules
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--tool-text-dim)' }}>
                        {sortedKeys.length} field{sortedKeys.length !== 1 ? 's' : ''}
                    </span>
                    {sortedKeys.length > 0 && (<>
                        <button onClick={collapseAll} style={{ fontSize: '0.68rem', padding: '2px 8px', background: 'var(--tool-bg-input)', border: '1px solid var(--tool-border)', color: 'var(--tool-text-dim)', borderRadius: '3px', cursor: 'pointer' }}>
                            Collapse All
                        </button>
                        <button onClick={expandAll} style={{ fontSize: '0.68rem', padding: '2px 8px', background: 'var(--tool-bg-input)', border: '1px solid var(--tool-border)', color: 'var(--tool-text-dim)', borderRadius: '3px', cursor: 'pointer' }}>
                            Expand All
                        </button>
                    </>)}
                </div>
            </div>

            {/* Rule rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sortedKeys.map(key => {
                    const rule = rules[key];
                    if (!rule || typeof rule.rule === 'undefined') return null;
                    const isInteractive = ['string', 'label_select', 'image_select', 'labeled_image_select'].includes(rule.type);
                    return (
                        <RuleRow
                            key={key}
                            ruleKey={key}
                            rule={rule}
                            isDragged={draggedKey === key}
                            showSkippedWarning={skipCreation && isInteractive}
                            imageLibrary={imageLibrary}
                            storyId={storyId}
                            qualityDefs={qualityDefsArray}
                            isCollapsed={collapsedKeys.has(key)}
                            onToggleCollapse={() => toggleCollapse(key)}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            onDragStart={onDragStart}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                        />
                    );
                })}
            </div>

            {/* Add controls */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--tool-border)' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        value={newKey}
                        onChange={e => setNewKey(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                        placeholder="$quality_id"
                        className="form-input"
                        style={{ flex: 1 }}
                    />
                    <button onClick={handleAdd} className="save-btn" style={{ width: 'auto', padding: '0.5rem 1.25rem', flexShrink: 0 }}>
                        Add Rule
                    </button>
                    <button
                        onClick={addSection}
                        style={{ padding: '0.5rem 1.25rem', background: 'var(--tool-bg-input)', border: '1px solid var(--tool-accent-mauve)', color: 'var(--tool-accent-mauve)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', flexShrink: 0 }}
                    >
                        + Section
                    </button>
                </div>
                <p className="property-hint" style={{ marginLeft: 0, marginTop: '4px' }}>
                    <strong>Add Rule</strong> maps to a quality ($id). <strong>+ Section</strong> adds a visual header with no quality.
                </p>
            </div>
        </div>
    );
}

// ─── RuleRow ──────────────────────────────────────────────────────────────────

interface RuleRowProps {
    ruleKey: string;
    rule: CharCreateRule;
    isDragged: boolean;
    showSkippedWarning: boolean;
    imageLibrary: Record<string, ImageDefinition>;
    storyId: string;
    qualityDefs: QualityDefinition[];
    onUpdate: (key: string, field: keyof CharCreateRule, val: any) => void;
    onDelete: (key: string) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onDragStart: (e: React.DragEvent, key: string) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, key: string) => void;
}

function RuleRow({ ruleKey, rule, isDragged, showSkippedWarning, imageLibrary, storyId, qualityDefs, isCollapsed, onToggleCollapse, onUpdate, onDelete, onDragStart, onDragOver, onDrop }: RuleRowProps) {

    const isSelectType = SELECT_TYPES.includes(rule.type);
    const isSection    = rule.type === 'header';
    const accent       = isSection ? 'var(--tool-accent-mauve)' : 'var(--success-color)';

    // Whether this key is an auto-generated section (not a quality ID)
    const isAutoSection = ruleKey.startsWith('__section_');

    // Type icon for collapsed state
    const typeMeta = TYPE_BUTTONS.find(t => t.value === rule.type);

    const badges: { label: string; title: string; color: string }[] = [];
    if (rule.visible_if)          badges.push({ label: 'COND',   title: `Visible if: ${rule.visible_if}`, color: 'var(--tool-accent)'       });
    if (rule.required)            badges.push({ label: 'REQ',    title: 'Required field',                 color: 'var(--warning-color)'     });
    if (rule.showOnCard)          badges.push({ label: 'CARD',   title: 'Shows on card',                  color: 'var(--success-color)'     });
    if (rule.displayMode === 'modal') badges.push({ label: 'MODAL', title: 'Displayed as modal',          color: 'var(--tool-accent-mauve)' });
    if (!rule.visible)            badges.push({ label: 'HIDDEN', title: 'Not visible to player',          color: 'var(--tool-text-dim)'     });

    return (
        <div
            draggable
            onDragStart={e => onDragStart(e, ruleKey)}
            onDragOver={onDragOver}
            onDrop={e => onDrop(e, ruleKey)}
            style={{
                background:    'var(--tool-bg-header)',
                border:        '1px solid var(--tool-border)',
                borderLeft:    `4px solid ${accent}`,
                borderRadius:  '4px',
                padding:       '0.75rem',
                opacity:       isDragged ? 0.45 : 1,
                cursor:        'move',
            }}
        >
            {/* Row header — always visible */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: isCollapsed ? 0 : '0.65rem' }}>
                <span style={{ opacity: 0.35, fontSize: '0.9rem', cursor: 'grab', flexShrink: 0 }}>☰</span>

                {isSection ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span style={{ color: accent, fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rule.rule || 'Untitled Section'}
                        </span>
                        {!isAutoSection && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--tool-text-dim)', fontFamily: 'monospace', flexShrink: 0 }}>
                                {ruleKey}
                            </span>
                        )}
                    </div>
                ) : (
                    <span style={{ fontFamily: 'monospace', color: accent, flex: 1, fontSize: '0.875rem', userSelect: 'none', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ruleKey}
                    </span>
                )}

                {/* Type mini-badge (shown when collapsed) */}
                {isCollapsed && typeMeta && (
                    <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', padding: '1px 6px', borderRadius: '3px', border: `1px solid ${accent}`, color: accent, flexShrink: 0 }}>
                        {typeMeta.icon} {typeMeta.label}
                    </span>
                )}

                {badges.map(b => (
                    <span key={b.label} title={b.title} style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.5px', padding: '1px 5px', borderRadius: '3px', border: `1px solid ${b.color}`, color: b.color, lineHeight: '1.5', flexShrink: 0 }}>
                        {b.label}
                    </span>
                ))}

                {/* Collapse toggle */}
                <button
                    onClick={onToggleCollapse}
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                    style={{ color: 'var(--tool-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', lineHeight: 1, flexShrink: 0, fontSize: '0.75rem' }}
                >
                    {isCollapsed ? '▶' : '▼'}
                </button>
                <button
                    onClick={() => onDelete(ruleKey)}
                    title="Delete rule"
                    style={{ color: 'var(--danger-color)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}
                >
                    ✕
                </button>
            </div>

            {/* Collapsible body */}
            {!isCollapsed && <>

            {/* Type picker buttons */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
                {TYPE_BUTTONS.map(t => {
                    const active = rule.type === t.value;
                    return (
                        <button
                            key={t.value}
                            onClick={() => onUpdate(ruleKey, 'type', t.value)}
                            title={t.label}
                            style={{
                                padding: '3px 9px', fontSize: '0.72rem', fontFamily: 'monospace',
                                borderRadius: '3px',
                                border:     `1px solid ${active ? accent : 'var(--tool-border)'}`,
                                background: active ? `color-mix(in srgb, ${accent} 15%, transparent)` : 'var(--tool-bg-input)',
                                color:      active ? accent : 'var(--tool-text-main)',
                                cursor:     'pointer', transition: 'all 0.1s',
                            }}
                        >
                            {t.icon} {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Skip warning */}
            {showSkippedWarning && (
                <div style={{ background: 'rgba(255,200,0,0.08)', border: '1px solid #eebb00', color: '#eebb00', padding: '0.35rem 0.6rem', fontSize: '0.78rem', borderRadius: '4px', marginBottom: '0.65rem' }}>
                    ⚠️ Skip mode is on — player can&apos;t interact. Switch to <strong>Calc</strong> to force a starting value.
                </div>
            )}

            {/* Value editor */}
            {isSection ? (
                <div>
                    <input
                        value={rule.rule}
                        onChange={e => onUpdate(ruleKey, 'rule', e.target.value)}
                        className="form-input"
                        placeholder="Section Title"
                        style={{ fontWeight: 'bold', color: 'var(--tool-text-header)' }}
                    />
                    <span className="property-hint" style={{ marginLeft: 0 }}>Section title shown to the player</span>
                </div>
            ) : isSelectType ? (
                <OptionBuilder
                    type={rule.type}
                    rawValue={rule.rule}
                    onChange={v => onUpdate(ruleKey, 'rule', v)}
                    imageLibrary={imageLibrary}
                    storyId={storyId}
                    qualityDefs={qualityDefs}
                />
            ) : (
                // string and static types: SmartArea
                <SmartArea
                    value={rule.rule}
                    onChange={v => onUpdate(ruleKey, 'rule', v)}
                    storyId={storyId}
                    qualityDefs={qualityDefs}
                    mode="text"
                    placeholder={rule.type === 'static' ? '10 or { $other_quality * 2 }' : 'Default text value'}
                    minHeight="38px"
                    subLabel={rule.type === 'static' ? 'Value / ScribeScript expression' : 'Default text (player can edit)'}
                />
            )}

            {/* Advanced collapsible — open by default */}
            <details open style={{ marginTop: '0.35rem' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.72rem', color: 'var(--tool-text-dim)', userSelect: 'none', paddingTop: '0.25rem' }}>
                    Advanced
                </summary>
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--tool-border)' }}>

                    {/* visible_if — SmartArea condition mode */}
                    <SmartArea
                        value={rule.visible_if || ''}
                        onChange={v => onUpdate(ruleKey, 'visible_if', v)}
                        storyId={storyId}
                        qualityDefs={qualityDefs}
                        mode="condition"
                        placeholder="e.g. $class == Rogue"
                        minHeight="38px"
                        subLabel="Visible If (ScribeScript condition)"
                    />

                    {/* input_transform for string type */}
                    {rule.type === 'string' && (
                        <div style={{ marginBottom: '0.5rem' }}>
                            <select
                                value={rule.input_transform || 'none'}
                                onChange={e => onUpdate(ruleKey, 'input_transform', e.target.value as any)}
                                className="form-select"
                                style={{ width: '100%' }}
                            >
                                <option value="none">No transform</option>
                                <option value="capitalize">Capitalize words</option>
                                <option value="uppercase">UPPERCASE</option>
                                <option value="lowercase">lowercase</option>
                            </select>
                            <span className="property-hint" style={{ marginLeft: 0 }}>Input Transform</span>
                        </div>
                    )}

                    {/* Flag checkboxes */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', paddingTop: '0.25rem' }}>
                        <label className="toggle-label">
                            <input type="checkbox" checked={rule.visible} onChange={e => onUpdate(ruleKey, 'visible', e.target.checked)} />
                            Visible
                        </label>
                        <label className="toggle-label">
                            <input type="checkbox" checked={rule.readOnly} onChange={e => onUpdate(ruleKey, 'readOnly', e.target.checked)} />
                            Read-Only
                        </label>
                        {!isSection && !rule.readOnly && (
                            <label className="toggle-label" style={{ color: rule.required ? 'var(--warning-color)' : 'inherit' }}>
                                <input type="checkbox" checked={!!rule.required} onChange={e => onUpdate(ruleKey, 'required', e.target.checked)} />
                                Required
                            </label>
                        )}
                        {(rule.type === 'static' || rule.readOnly) && (
                            <label className="toggle-label" title="Hide this field when its value is 0">
                                <input type="checkbox" checked={!!rule.hideIfZero} onChange={e => onUpdate(ruleKey, 'hideIfZero', e.target.checked)} />
                                Hide if 0
                            </label>
                        )}
                        {!isSection && (
                            <label className="toggle-label" title="If inside a Modal section, also show this field on the main card">
                                <input type="checkbox" checked={!!rule.showOnCard} onChange={e => onUpdate(ruleKey, 'showOnCard', e.target.checked)} />
                                Show on Card
                            </label>
                        )}
                        {isSection && (
                            <label className="toggle-label" title="Turn this section header into a button that opens a popup">
                                <input type="checkbox" checked={rule.displayMode === 'modal'} onChange={e => onUpdate(ruleKey, 'displayMode', e.target.checked ? 'modal' : 'inline')} />
                                As Modal Button
                            </label>
                        )}
                        {isSelectType && (
                            <label className="toggle-label" title="Show the options inside a popup modal instead of inline">
                                <input type="checkbox" checked={rule.displayMode === 'modal'} onChange={e => onUpdate(ruleKey, 'displayMode', e.target.checked ? 'modal' : 'inline')} />
                                Use Modal
                            </label>
                        )}
                    </div>
                </div>
            </details>

            </>}
        </div>
    );
}

// ─── OptionBuilder ────────────────────────────────────────────────────────────

interface OptionBuilderProps {
    type: string;
    rawValue: string;
    onChange: (v: string) => void;
    imageLibrary: Record<string, ImageDefinition>;
    storyId: string;
    qualityDefs: QualityDefinition[];
}

function OptionBuilder({ type, rawValue, onChange, imageLibrary, storyId, qualityDefs }: OptionBuilderProps) {
    const [pickingForIdx, setPickingForIdx] = useState<number | null>(null);

    const rows = useMemo(() => parsePipeString(rawValue), [rawValue]);
    const isImageType = IMAGE_TYPES.includes(type);

    const updateRow = (idx: number, field: 'value' | 'label', val: string) => {
        const next = rows.map((r, i) => i === idx ? { ...r, [field]: val } : r);
        onChange(serializePipeRows(next));
    };
    const addRow    = () => onChange(serializePipeRows([...rows, { value: '', label: '' }]));
    const removeRow = (idx: number) => onChange(serializePipeRows(rows.filter((_, i) => i !== idx)));

    return (
        <div>
            {/* Image picker modal */}
            {pickingForIdx !== null && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 9999, padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'var(--bg-panel)', padding: '1rem', borderRadius: '8px', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', border: '1px solid var(--tool-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ color: 'var(--tool-text-header)', margin: 0 }}>Pick Image for row {pickingForIdx + 1}</h3>
                            <button onClick={() => setPickingForIdx(null)} className="unequip-btn">Close</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px' }}>
                            {Object.values(imageLibrary).map(img => (
                                <div
                                    key={img.id}
                                    onClick={() => {
                                        const next = rows.map((r, i) => {
                                            if (i !== pickingForIdx) return r;
                                            return type === 'image_select' ? { value: img.id, label: img.id } : { ...r, value: img.id };
                                        });
                                        onChange(serializePipeRows(next));
                                        setPickingForIdx(null);
                                    }}
                                    style={{ cursor: 'pointer', border: '1px solid var(--tool-border)', padding: '4px', borderRadius: '4px' }}
                                >
                                    <div style={{ width: '100%', aspectRatio: '1/1', overflow: 'hidden', borderRadius: '4px' }}>
                                        <img src={img.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={img.alt} />
                                    </div>
                                    <div style={{ fontSize: '0.65rem', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--tool-text-main)' }}>{img.id}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Column headers */}
            {rows.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '3px', paddingRight: '20px' }}>
                    <div style={{ flex: 1, fontSize: '0.62rem', color: 'var(--tool-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                        {isImageType ? 'Image ID' : 'Choice (stored value)'}
                    </div>
                    <div style={{ width: '16px' }} />
                    <div style={{ flex: 1, fontSize: '0.62rem', color: 'var(--tool-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                        Display name (player sees)
                    </div>
                </div>
            )}

            {/* Option rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '5px' }}>
                {rows.map((row, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <input
                                value={row.value}
                                onChange={e => updateRow(idx, 'value', e.target.value)}
                                className="form-input"
                                placeholder={isImageType ? 'image_id' : 'e.g. warrior'}
                                style={{ fontSize: '0.8rem', paddingRight: isImageType ? '52px' : undefined }}
                            />
                            {isImageType && imageLibrary[row.value] && (
                                <img src={imageLibrary[row.value].url} alt="" style={{ position: 'absolute', right: 34, top: '50%', transform: 'translateY(-50%)', height: '18px', width: '18px', objectFit: 'cover', borderRadius: '2px', pointerEvents: 'none' }} />
                            )}
                            {isImageType && (
                                <button onClick={() => setPickingForIdx(idx)} style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: '1px 5px', fontSize: '0.65rem', background: 'var(--tool-bg-dark)', border: '1px solid var(--tool-border)', color: 'var(--tool-text-main)', borderRadius: '3px', cursor: 'pointer' }}>
                                    Pick
                                </button>
                            )}
                        </div>
                        <span style={{ color: 'var(--tool-text-dim)', fontSize: '0.8rem', flexShrink: 0 }}>→</span>
                        <input
                            value={row.label}
                            onChange={e => updateRow(idx, 'label', e.target.value)}
                            className="form-input"
                            placeholder="e.g. Warrior"
                            style={{ flex: 1, fontSize: '0.8rem' }}
                        />
                        <button onClick={() => removeRow(idx)} style={{ color: 'var(--danger-color)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '0 4px', flexShrink: 0 }}>✕</button>
                    </div>
                ))}
            </div>

            <button
                onClick={addRow}
                style={{ fontSize: '0.72rem', padding: '3px 10px', background: 'var(--tool-bg-input)', border: '1px solid var(--tool-border)', color: 'var(--tool-text-main)', borderRadius: '3px', cursor: 'pointer' }}
            >
                + Add Option
            </button>

            {/* Raw string escape hatch — SmartArea */}
            <details style={{ marginTop: '6px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.68rem', color: 'var(--tool-text-dim)', userSelect: 'none' }}>
                    Raw string
                </summary>
                <div style={{ marginTop: '4px' }}>
                    <SmartArea
                        value={rawValue}
                        onChange={onChange}
                        storyId={storyId}
                        qualityDefs={qualityDefs}
                        mode="text"
                        placeholder="val:Label | val2:Label2"
                        minHeight="38px"
                    />
                </div>
            </details>
        </div>
    );
}

// ─── PresetCard ───────────────────────────────────────────────────────────────

function PresetCard({
    label, description, creates, has, onAdd, onRemove,
}: {
    label: string; description: string; creates: string[]; has: boolean; onAdd: () => void; onRemove: () => void;
}) {
    return (
        <div style={{
            border:       `1px solid ${has ? 'var(--success-color)' : 'var(--tool-border)'}`,
            borderRadius: '5px',
            padding:      '0.7rem 0.75rem',
            background:   has ? 'var(--success-bg)' : 'var(--tool-bg-input)',
            display:      'flex', flexDirection: 'column', gap: '4px',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.83rem', color: has ? 'var(--success-color)' : 'var(--tool-text-main)' }}>
                    {has ? '✓ ' : ''}{label}
                </span>
                {has ? (
                    <button onClick={onRemove} style={{ fontSize: '0.68rem', padding: '2px 8px', background: 'transparent', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', borderRadius: '3px', cursor: 'pointer', flexShrink: 0 }}>Remove</button>
                ) : (
                    <button onClick={onAdd}    style={{ fontSize: '0.68rem', padding: '2px 8px', background: 'transparent', color: 'var(--tool-accent)',  border: '1px solid var(--tool-accent)',  borderRadius: '3px', cursor: 'pointer', flexShrink: 0 }}>Add</button>
                )}
            </div>
            <p style={{ fontSize: '0.73rem', color: 'var(--tool-text-dim)', margin: 0, lineHeight: 1.45 }}>{description}</p>
            {!has && creates.length > 0 && (
                <p style={{ fontSize: '0.68rem', color: 'var(--tool-accent)', margin: 0, lineHeight: 1.4 }}>
                    Also creates: {creates.join(', ')}
                </p>
            )}
        </div>
    );
}
