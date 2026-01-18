'use client';
import { useEffect, useState } from 'react';
import { WorldSettings, QualityDefinition } from '@/engine/models';
import ThemePreview from './ThemePreview';
import GlobalStylePreview from '@/components/admin/GlobalStylePreview';
import StoryletStylePreview from '@/components/admin/StoryletStylePreview';
import SmartArea from '@/components/admin/SmartArea';


type ThemeOverride = { condition: string; theme: string; };

interface Props {
    settings: WorldSettings;
    onChange: (field: string, val: any) => void;
    storyId: string; 
}

export default function SettingsVisuals({ settings, onChange, storyId }: Props) {
    const [previewOpen, setPreviewOpen] = useState(false);

    const handleChange = (field: keyof WorldSettings, val: any) => {
        onChange(field, val);
    };

    const handleDeepChange = (parent: 'imageConfig' | 'componentConfig' | 'livingStoriesConfig', key: string, val: any) => {
        const current = settings[parent] || {};
        onChange(parent, { ...current, [key]: val });
    };

    const showPolaroidNote = 
        settings.componentConfig?.storyletListStyle === 'polaroid' || 
        settings.componentConfig?.handStyle === 'polaroid';
    const layoutDescriptions: Record<string, string> = {
        nexus: "Classic two-column layout. Sidebar on the left, text content on the right. Defaults to a broad layout, but can alternatively be set to a narrow layout style.",
        london: "Two-column layout like Classic, but with a large location banner at the top of the page.",
        elysium: "An immersive layout with a full-screen background image. Parallax can be enabled on the image to make it reactive to mouse position.",
        tabletop: "A multi-column layout where the middle section is reserved for the location image. Parallax can be enabled on the image to make it reactive to mouse position."
    };

    const [overrides, setOverrides] = useState<ThemeOverride[]>(settings.themeOverrides || []);
    const [qualityDefs, setQualityDefs] = useState<QualityDefinition[]>([]);

    useEffect(() => {
        setOverrides(settings.themeOverrides || []);
    }, [settings.themeOverrides]);

    useEffect(() => {
        fetch(`/api/admin/qualities?storyId=${storyId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setQualityDefs(data);
            })
            .catch(err => console.error("Failed to load qualities", err));
    }, [storyId]);

    const onUpdate = (updates: Partial<WorldSettings>) => {
        Object.entries(updates).forEach(([key, val]) => {
            onChange(key, val);
        });
    };

    const handleAddOverride = () => {
        let defaultTarget = '';
        let defaultCond = '';

        if (settings.visualTheme === 'masquerade') {
            defaultTarget = 'masquerade|darkness-state:on';
            defaultCond = '{$darkness > 50}';
        } else if (settings.visualTheme === 'delver') {
            defaultTarget = 'delver|location-type:dungeon';
            defaultCond = '{$in_dungeon}';
        }

        const updated = [...overrides, { condition: defaultCond, theme: defaultTarget }];
        setOverrides(updated);
        onUpdate({ themeOverrides: updated });
    };

    const updateOverride = (index: number, field: keyof ThemeOverride, value: string) => {
        const updated = [...overrides];
        updated[index] = { ...updated[index], [field]: value };
        setOverrides(updated);
        onUpdate({ themeOverrides: updated });
    };

    const removeOverride = (index: number) => {
        const updated = overrides.filter((_, i) => i !== index);
        setOverrides(updated);
        onUpdate({ themeOverrides: updated });
    };

    const isDynamicTheme = ['masquerade', 'delver'].includes(settings.visualTheme || '');

    useEffect(() => {
        fetch(`/api/admin/qualities?storyId=${storyId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setQualityDefs(data);
            })
            .catch(err => console.error("Failed to load qualities for linter", err));
    }, [storyId]);

    return (
        <div>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                <div style={{ flex: 1, minWidth: '350px' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--tool-text-header)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>
                        Global Theme
                    </h4>
                    
                    <div className="form-group">
                        <label className="form-label">Layout Style</label>
                        <p className="special-desc">Defines structural layout</p>
                        <select value={settings.layoutStyle} onChange={e => handleChange('layoutStyle', e.target.value as any)} className="form-select">
                            <option value="nexus">Classic</option>
                            <option value="london">Cinematic</option>
                            <option value="elysium">Immersive</option>
                            <option value="tabletop">Tabletop</option>
                        </select>
                        <p className="form-label">
                            {layoutDescriptions[settings.layoutStyle]}
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Visual Theme</label>
                        <select value={settings.visualTheme || 'default'} onChange={e => handleChange('visualTheme', e.target.value)} className="form-select">
                            <option value="default">Default</option>
                            <option value="victorian">Victorian</option>
                            <option value="terminal">Terminal</option>
                            <option value="parchment">Parchment</option>
                            <option value="noir">Noir</option>
                            <option value="detective-noir">Detective Noir</option>
                            <option value="cyberpunk">Cyberpunk</option>
                            <option value="dark-fantasy">Dark Fantasy</option>
                            <option value="pirate">Pirate</option>
                            <option value="solarpunk">Solarpunk</option>
                            <option value="lab">Laboratory</option>
                            <option value="druidic">Druidic</option>
                            <option value="neo-tokyo">Synthwave</option>
                            <option value="gothic">Gothic Horror</option>
                            <option value="western">Western / Frontier</option>
                            <option value="grimdark-sci-fi">Grimdark Sci-Fi</option>
                            <option value="jrpg-bright">Bright JRPG</option>
                            <option value="abyssal">Abyssal (Deep Ocean)</option>
                            <option value="arcanotech">Magitech</option>
                            <option value="terminal-amber">VT220 (Amber Terminal)</option>
                            <option value="arabesque">Arabesque</option>
                            <option value="art-deco">Art Deco</option>
                            <option value="steampunk">Steampunk</option>
                            <option value="candy">Bubblegum Pop</option>
                            <option value="stone-dwarven">Mountain Dwarf</option>
                            <option value="classic-scifi">Classic Sci-Fi (70s)</option>
                            <option value="revolutionary">Revolutionary</option>
                            <option value="solar">Utopia</option>
                            <option value="occult-academic">Occult Academia</option>
                            <option value="renaissance">Renaissance</option>
                            <option value="ink-brass">Dieselpunk</option>
                            <option value="ukiyoe">Ukiyo-e</option>
                            <option value="imperial-rome">Imperial Rome</option>
                            <option value="corpocracy">Corpocracy</option>
                            <option value="witch-folk">Witch Folk</option>
                            <option value="vaporwave">Vaporwave</option>
                            <option value="nordic">Nordic / Viking</option>
                            <option value="frontier">Frontier</option>
                            <option value="bayou">Bayou / Swamp</option>
                            <option value="starship">Starship Interior</option>
                            <option value="dark-parchment">Dark Parchment</option>
                            <option value="black-crown">Paranoid Archive</option>
                            <option value="grimoire">Grimoire</option>
                            <option value="vanguard">Deep Space</option>
                            <option value="cassette">Found Footage</option>
                            <option value="inferno">Infernum</option>
                            <option value="masquerade">Masquerade</option>
                            <option value="delver">Dungeon Delver</option>
                        </select>
                    </div>

                    {isDynamicTheme && (
                        <div style={{ marginTop: '1.5rem', padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '4px', background: 'var(--bg-item)' }}>
                            <h4 style={{ marginTop: 0, fontSize: '0.95rem', color: 'var(--accent-primary)' }}>Dynamic Theme Swapping</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Configure conditions that trigger a visual state change. The <strong>first</strong> true condition determines the active state.
                            </p>

                            {overrides.map((ov, idx) => {
                                const isPreset = (settings.visualTheme === 'masquerade') ||
                                                (settings.visualTheme === 'delver');

                                return (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: isPreset ? '1fr 40px' : '1fr 1fr 40px', gap: '10px', alignItems: 'start' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Condition (ScribeScript)</label>
                                            <SmartArea 
                                                value={ov.condition} 
                                                onChange={(val) => updateOverride(idx, 'condition', val)} 
                                                minHeight="40px"
                                                storyId={storyId}
                                                qualityDefs={qualityDefs}
                                            />
                                        </div>

                                        <button 
                                            onClick={() => removeOverride(idx)}
                                            style={{ marginTop: '47px', background: 'var(--danger-bg)', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', borderRadius: '4px', height: '38px', cursor: 'pointer' }}
                                            title="Remove Override"
                                        >
                                            ×
                                        </button>
                                    </div>
                                );
                            })}

                            <button 
                                onClick={handleAddOverride}
                                style={{ marginTop: '1rem', background: 'transparent', border: '1px dashed var(--accent-primary)', color: 'var(--accent-primary)', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}
                            >
                                + Add Dynamic Condition
                            </button>
                        </div>
                    )}

                    {settings.layoutStyle === 'nexus' && (
                        <label className="toggle-label" style={{ marginTop: '1rem' }}>
                            <input type="checkbox" checked={settings.nexusCenteredLayout || false} onChange={e => handleChange('nexusCenteredLayout', e.target.checked)} />
                            Center Layout (Narrower)
                        </label>
                    )}

                    {(settings.layoutStyle === 'elysium' || settings.layoutStyle === 'tabletop') && (
                        <label className="toggle-label" style={{ marginTop: '1rem' }}>
                            <input type="checkbox" checked={settings.enableParallax !== false} onChange={e => handleChange('enableParallax', e.target.checked)} />
                            Enable Parallax Effect
                        </label>
                    )}
            <h4 style={{ margin: '2rem 0 1rem 0', color: 'var(--tool-text-header)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>
                Identity & Headers
            </h4>

            <div style={{ background: 'var(--tool-bg-input)', padding: '1.5rem', borderRadius: '4px', border: '1px solid var(--tool-border)', marginBottom: '2rem' }}>
                
                <label className="toggle-label" style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    <input type="checkbox" checked={settings.hideProfileIdentity || false} onChange={e => handleChange('hideProfileIdentity', e.target.checked)} /> 
                    Anonymous Protagonist
                </label>
                <p className="special-desc" style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
                    Hides the name and portrait. Useful for games where the protagonist is anonymous or predetermined.
                </p>

                <div style={{ 
                    marginLeft: '1.5rem', 
                    opacity: settings.hideProfileIdentity ? 0.5 : 1, 
                    pointerEvents: settings.hideProfileIdentity ? 'none' : 'auto',
                    borderLeft: '2px solid var(--tool-border)',
                    paddingLeft: '1.5rem'
                }}>
                    <label className="toggle-label" style={{ marginBottom: '0.5rem' }}>
                        <input type="checkbox" checked={settings.enablePortrait !== false} onChange={e => handleChange('enablePortrait', e.target.checked)} /> 
                        Show Portrait (Profile Tab)
                    </label>

                    <label className="toggle-label" style={{ marginBottom: '1rem' }}>
                        <input type="checkbox" checked={settings.showPortraitInSidebar || false} onChange={e => handleChange('showPortraitInSidebar', e.target.checked)} /> 
                        Show Portrait in Sidebar
                    </label>
                    
                    {settings.enablePortrait !== false && (
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'var(--tool-bg-dark)', padding: '1rem', borderRadius: '4px' }}>
                            <div className="form-group" style={{ margin: 0, flex: 1 }}>
                                <label style={{fontSize: '0.7rem', color: 'var(--tool-text-dim)', display:'block'}}>Shape</label>
                                <select value={settings.portraitStyle || 'rect'} onChange={e => handleChange('portraitStyle', e.target.value as any)} className="form-select" style={{ fontSize: '0.8rem', padding: '2px 8px' }}>
                                    <option value="rect">Portrait (3:4)</option>
                                    <option value="circle">Circle</option>
                                    <option value="square">Square</option>
                                </select> 
                            </div>
                            <div className="form-group" style={{ margin: 0, flex: 1 }}>
                                <label style={{fontSize: '0.7rem', color: 'var(--tool-text-dim)', display:'block'}}>Size</label>
                                <select value={settings.portraitSize || 'medium'} onChange={e => handleChange('portraitSize', e.target.value as any)} className="form-select" style={{ fontSize: '0.8rem', padding: '2px 8px' }}>
                                    <option value="medium">Medium</option>
                                    <option value="small">Small</option>
                                    <option value="large">Large</option>
                                </select> 
                            </div>
                            <div className="form-group" style={{ margin: 0, flex: 1 }}>
                                <label style={{fontSize: '0.7rem', color: 'var(--tool-text-dim)', display:'block'}}>Selection Grid Size</label>
                                <select value={settings.modalImageSize || 'small'} onChange={e => handleChange('modalImageSize', e.target.value as any)} className="form-select" style={{ fontSize: '0.8rem', padding: '2px 8px' }}>
                                    <option value="small">Small (Compact)</option>
                                    <option value="medium">Medium</option>
                                    <option value="large">Large (Showcase)</option>
                                </select> 
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '1rem' }}>
                        <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 2}}>
                            <input type="checkbox" checked={settings.enableTitle || false} onChange={e => handleChange('enableTitle', e.target.checked)} /> 
                            Show a title on Character Card
                        </label>
                        {settings.enableTitle && (
                            <div style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                                <input value={settings.titleQualityId || ''} onChange={e => handleChange('titleQualityId', e.target.value)} className="form-input" placeholder="$current_title" style={{ fontSize: '0.8rem', padding: '4px', maxWidth: '200px' }} />
                                <p className="special-desc" style={{ fontSize: '0.7rem', margin: '2px 0 0 0' }}>Quality ID that stores the title text.</p>
                            </div>
                        )}
                    </div>
                </div>

                <hr style={{ borderColor: 'var(--tool-border)', margin: '1.5rem 0', borderTop: '1px dashed' }} />
                <div className="form-group">
                    <label className="form-label">Location Header Style</label>
                    <select 
                        value={settings.locationHeaderStyle || 'standard'} 
                        onChange={e => handleChange('locationHeaderStyle', e.target.value as any)} 
                        className="form-select"
                    >
                        <option value="standard">Standard (Default)</option>
                        <option value="banner">Banner (Wide Image)</option>
                        <option value="square">Square Icon</option>
                        <option value="circle">Circle Icon</option>
                        <option value="title-card">Title Card (Text Only)</option>
                        <option value="hidden">Hidden</option>
                    </select>
                    <p className="special-desc">Controls how the current location name and image are displayed.</p>
                </div>

                <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 2}}>
                    <input 
                        type="checkbox" 
                        checked={settings.showHeaderInStorylet || false} 
                        onChange={e => handleChange('showHeaderInStorylet', e.target.checked)} 
                    /> 
                    Show Location Header in Storylets
                </label>
                 <p className="special-desc" style={{ marginLeft: '1.5rem' }}>
                    When enabled, the location header/banner will appear above the storylet text.
                </p>
                <label 
                    className="toggle-label" 
                    style={{ 
                        marginTop: '1rem', 
                        opacity: settings.visualTheme === 'black-crown' ? 0.6 : 1,
                        cursor: settings.visualTheme === 'black-crown' ? 'not-allowed' : 'pointer'
                    }}
                    title={settings.visualTheme === 'black-crown' ? "This setting is required by the Black Crown theme." : ""}
                >
                    <input 
                        type="checkbox" 
                        checked={settings.tabLocation === 'sidebar'} 
                        onChange={e => handleChange('tabLocation', e.target.checked ? 'sidebar' : 'main')} 
                        disabled={settings.visualTheme === 'black-crown'}
                    /> 
                    Move Tabs to Sidebar
                </label>
                <p className="special-desc" style={{ marginLeft: '1.5rem' }}>
                    When enabled, the "Story, Possessions, Myself" tabs will be moved to the top of the sidebar.
                </p>
            </div>
            </div>
                <div style={{ width: '350px', flexShrink: 0 }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--tool-text-header)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>
                        Live Preview
                    </h4>
                    <div style={{ position: 'sticky', top: '20px' }}>
                        <ThemePreview theme={settings.visualTheme || 'default'} />
                    </div>
                    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--tool-border)', paddingTop: '1rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--tool-text-header)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', paddingBottom: '0.5rem' }}>
                    Living Stories (Timers)
                </h4>
                
                <div style={{ background: 'var(--tool-bg-input)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                    <label className="toggle-label" style={{ fontWeight: 'bold', marginBottom: '1rem' }}>
                        <input 
                            type="checkbox" 
                            checked={settings.livingStoriesConfig?.enabled !== false} 
                            onChange={e => handleDeepChange('livingStoriesConfig', 'enabled', e.target.checked)} 
                        />
                        Show Active Timers
                    </label>

                    {settings.livingStoriesConfig?.enabled !== false && (
                        <>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Position</label>
                                    <select 
                                        value={settings.livingStoriesConfig?.position || 'sidebar'} 
                                        onChange={e => handleDeepChange('livingStoriesConfig', 'position', e.target.value)} 
                                        className="form-select"
                                    >
                                        <option value="sidebar">Sidebar (Below Character)</option>
                                        <option value="column">Right Column (Desktop Only)</option>
                                        <option value="tab">Separate Tab</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Section Title</label>
                                    <input 
                                        value={settings.livingStoriesConfig?.title || ''} 
                                        onChange={e => handleDeepChange('livingStoriesConfig', 'title', e.target.value)} 
                                        className="form-input" 
                                        placeholder="Living Stories"
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <label className="toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={settings.livingStoriesConfig?.hideWhenEmpty || false}
                                        onChange={e => handleDeepChange('livingStoriesConfig', 'hideWhenEmpty', e.target.checked)}
                                    />
                                    Hide component when no timers are active
                                </label>
                                <p className="special-desc" style={{ marginLeft: '1.5rem' }}>If checked, the entire component (e.g., the Right Column or Tab) will not be displayed if the player has no active timers.</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
                </div>
                
            </div>
            
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--tool-text-header)', fontSize: '0.8rem', textTransform: 'uppercase', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>Component Styles</h4>
                    <div className="form-row">

                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Action List</label>
                            <select value={settings.componentConfig?.storyletListStyle || 'rows'} onChange={e => handleDeepChange('componentConfig', 'storyletListStyle', e.target.value)} className="form-select">
                                <option value="rows">Detailed Rows</option>
                                <option value="compact">Simple Rows</option>
                                <option value="cards">Cards</option>
                                <option value="polaroid">Cards (Alt)</option>
                                <option value="images-only">Images Only</option>
                                <option value="tarot">Tarot</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Opportunity Cards</label>
                            <select value={settings.componentConfig?.handStyle || 'cards'} onChange={e => handleDeepChange('componentConfig', 'handStyle', e.target.value)} className="form-select">
                                <option value="rows">Detailed Rows</option>
                                <option value="compact">Simple Rows</option>
                                <option value="cards">Cards</option>
                                <option value="polaroid">Cards (Alt)</option>
                                <option value="images-only">Images Only</option>
                                <option value="tarot">Tarot</option>
                            </select>
                        </div>
                    </div>
                    { showPolaroidNote && (
                        <p className="special-desc" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
                            Cards (Alt) may look similar or different to Cards depending on the <em>Visual Theme</em> chosen
                        </p>
                    )}
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label className="form-label">Inventory</label>
                        <select value={settings.componentConfig?.inventoryStyle || 'standard'} onChange={e => handleDeepChange('componentConfig', 'inventoryStyle', e.target.value)} className="form-select">
                            <option value="standard">Standard (List with side image)</option>
                            <option value="portrait">Portrait (Top image card)</option>
                            <option value="icon-grid">Icon Grid (Minimal)</option>
                            <option value="list">List (Text only)</option>
                        </select>
                    </div>

                    {settings.componentConfig?.inventoryStyle === 'portrait' && (
                        <div className="form-group" style={{ marginLeft: '1rem', borderLeft: '2px solid var(--tool-border)', paddingLeft: '1rem' }}>
                            <label className="form-label">Portrait Mode Variant</label>
                            <select 
                                value={settings.componentConfig?.inventoryPortraitMode || 'cover'} 
                                onChange={e => handleDeepChange('componentConfig', 'inventoryPortraitMode', e.target.value)} 
                                className="form-select"
                            >
                                <option value="cover">Cover (Full Width)</option>
                                <option value="icon">Icon (Centered)</option>
                            </select>
                        </div>
                    )}
                    {settings.componentConfig?.inventoryStyle !== 'list' && (
                        <div className="form-group" style={{ marginLeft: '1rem', borderLeft: '2px solid var(--tool-border)', paddingLeft: '1rem' }}>
                            <label className="form-label">Card Size</label>
                            <select 
                                value={settings.componentConfig?.inventoryCardSize || 'medium'} 
                                onChange={e => handleDeepChange('componentConfig', 'inventoryCardSize', e.target.value)} 
                                className="form-select"
                            >
                                <option value="small">Small</option>
                                <option value="medium">Medium</option>
                                <option value="large">Large</option>
                            </select>
                        </div>
                    )}
                </div>

                <div style={{ flex: 1, minWidth: '300px' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--tool-text-header)', fontSize: '0.8rem', textTransform: 'uppercase', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>Image Shapes</h4>
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Storylet</label>
                            <select value={settings.imageConfig?.storylet || 'default'} onChange={e => handleDeepChange('imageConfig', 'storylet', e.target.value)} className="form-select">
                                <option value="default">Default</option>
                                <option value="landscape">Landscape</option>
                                <option value="portrait">Portrait</option>
                                <option value="square">Square</option>
                                <option value="circle">Circle</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Icon</label>
                            <select value={settings.imageConfig?.icon || 'default'} onChange={e => handleDeepChange('imageConfig', 'icon', e.target.value)} className="form-select">
                                <option value="default">Default</option>
                                <option value="rounded">Rounded</option>
                                <option value="circle">Circle</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label className="toggle-label">
                            <input 
                                type="checkbox" 
                                checked={settings.showQualityIconsInSheet || false} 
                                onChange={e => handleChange('showQualityIconsInSheet', e.target.checked)} 
                            />
                            Show Quality Icons in Sidebar
                        </label>
                        <p className="special-desc">
                            If enabled, qualities with an image assigned will display a small icon next to their name in the sidebar.
                        </p>
                    </div>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label className="form-label">Inventory Icon</label>
                        <select value={settings.imageConfig?.inventory || 'default'} onChange={e => handleDeepChange('imageConfig', 'inventory', e.target.value)} className="form-select">
                            <option value="default">Default</option>
                            <option value="square">Square</option>
                            <option value="rounded">Rounded</option>
                            <option value="circle">Circle</option>
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style={{ border: '1px solid var(--tool-border)', borderRadius: 'var(--border-radius)', overflow: 'hidden', background: 'var(--tool-bg-dark)' }}>
                <div 
                    onClick={() => setPreviewOpen(!previewOpen)}
                    style={{ 
                        width: '100%', padding: '1rem', background: 'var(--tool-bg-header)', 
                        color: 'var(--tool-accent)', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        transition: 'background 0.2s'
                    }}
                    className="hover:bg-[var(--tool-bg-input)]"
                >
                    {previewOpen ? 'Hide Preview' : 'Show Preview of Component Styles'}
                    
                    {!previewOpen && (
                        <div style={{ 
                            height: '60px', width: '100%', marginTop: '10px', 
                            overflow: 'hidden', opacity: 0.4, pointerEvents: 'none',
                            maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)'
                        }}>
                            <div style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }}>
                                <StoryletStylePreview settings={settings} theme={settings.visualTheme || 'default'} />
                            </div>
                        </div>
                    )}
                </div>

                {previewOpen && (
                    <div style={{ padding: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', animation: 'fadeIn 0.2s ease-out' }}>
                        <div style={{ flex: 1, minWidth: '350px' }}>
                            <GlobalStylePreview settings={settings} theme={settings.visualTheme || 'default'} />
                        </div>
                        <div style={{ flexBasis: '100%', marginTop: '2rem', borderTop: '1px solid var(--tool-border)', paddingTop: '2rem' }}>
                            <StoryletStylePreview settings={settings} theme={settings.visualTheme || 'default'} />
                        </div>
                    </div>
                )}
            </div>
            <style jsx>{`@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }`}</style>
        </div>
    );
}