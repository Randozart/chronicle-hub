'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ImageComposition, CompositionLayer, GlobalAsset } from '@/engine/models';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import CommandCenter from '@/components/admin/CommandCenter';
import { v4 as uuidv4 } from 'uuid';
import ColorPickerInput from './ColorPickerInput';
import ComposerOutput from './ComposerOutput';
import { resolveCssVariable } from '@/utils/themeUtils';

const CANVAS_PRESETS = {
    'Icon': { w: 512, h: 512 },
    'Storylet (Portrait)': { w: 300, h: 400 },
    'Card (Landscape)': { w: 400, h: 300 },
    'Banner': { w: 1024, h: 300 },
    'HD': { w: 1920, h: 1080 }
};

interface PresetFile {
    path: string;
    name: string;
}

interface PresetCategory {
    name: string;
    files: PresetFile[];
}

interface Props {
    initialData: ImageComposition;
    storyId: string;
    assets: GlobalAsset[];
    onSave: (data: ImageComposition) => void;
    onDelete: () => void;
    guardRef: { current: FormGuard | null };
    allThemes: Record<string, Record<string, string>>;
}
const imageElementCache = new Map<string, HTMLImageElement>();

export default function ComposerEditor({ initialData, storyId, assets, onSave, onDelete, guardRef, allThemes}: Props) {
    const { data, handleChange, handleSave, isDirty, isSaving, lastSaved, revertChanges } = useCreatorForm<ImageComposition>(
        initialData,
        '/api/admin/compositions',
        { storyId },
        guardRef,
        undefined,
        onSave
    );

    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [browserTab, setBrowserTab] = useState<'project' | 'presets'>('project');
    const [presets, setPresets] = useState<PresetCategory[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoadingPresets, setIsLoadingPresets] = useState(false);
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [imagesLoaded, setImagesLoaded] = useState(0);

    if (!data) return <div className="loading-container">Loading editor...</div>;

    useEffect(() => {
        if (browserTab === 'presets' && presets.length === 0 && !isLoadingPresets) {
            setIsLoadingPresets(true);
            fetch('/api/admin/assets/presets')
                .then(r => r.json())
                .then((d: { categories?: PresetCategory[] }) => {                   
                    const categories = d.categories || [];
                    setPresets(categories);
                    const allButFirst = new Set(categories.map((c: PresetCategory) => c.name));
                    if (categories.length > 0) {
                        allButFirst.delete(categories[0].name);
                    }
                    setCollapsedCategories(allButFirst);
                })
                .finally(() => setIsLoadingPresets(false));
        }
    }, [browserTab]);

    const addLayer = (assetId: string, name: string, isPreset: boolean) => {
        const newLayer: CompositionLayer = {
            id: uuidv4(),
            assetId: assetId,
            name: name,
            zIndex: data.layers.length,
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            opacity: 1,
            enableThemeColor: isPreset 
        };
        handleChange('layers', [...data.layers, newLayer]);
        setSelectedLayerId(newLayer.id);
    };

    const updateLayer = (id: string, updates: Partial<CompositionLayer>) => {
        const newLayers = data.layers.map(l => l.id === id ? { ...l, ...updates } : l);
        handleChange('layers', newLayers);
    };

    const removeLayer = (id: string) => {
        handleChange('layers', data.layers.filter(l => l.id !== id));
        if (selectedLayerId === id) setSelectedLayerId(null);
    };

    const toggleCategory = (catName: string) => {
        const next = new Set(collapsedCategories);
        if (next.has(catName)) next.delete(catName);
        else next.add(catName);
        setCollapsedCategories(next);
    };

    const filteredAssets = useMemo(() => {
        return assets.filter(a => a.id.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [assets, searchTerm]);

    const filteredPresets = useMemo(() => {
        if (!searchTerm) return presets;
        return presets.map(cat => ({
            ...cat,
            files: cat.files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
        })).filter(cat => cat.files.length > 0);
    }, [presets, searchTerm]);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const s = 20;
        for(let i=0; i<canvas.width/s; i++) {
            for(let j=0; j<canvas.height/s; j++) {
                ctx.fillStyle = (i+j)%2 === 0 ? '#1a1a1a' : '#222';
                ctx.fillRect(i*s, j*s, s, s);
            }
        }
        const sortedLayers = [...data.layers].sort((a, b) => a.zIndex - b.zIndex);
        sortedLayers.forEach(layer => {
            let url = "";
            if (layer.assetId.startsWith('presets/')) {
                url = `/${layer.assetId}`;
            } else {
                const asset = assets.find(a => a.id === layer.assetId);
                url = asset ? asset.url || "" : `/images/uploads/${layer.assetId}.png`;
            }
            if (!url) return;

            let imgToDraw: HTMLImageElement | HTMLCanvasElement | null = null;
            if (imageElementCache.has(url)) {
                const img = imageElementCache.get(url)!;
                if (img.complete) {
                    const isSvg = layer.assetId.toLowerCase().endsWith('.svg');
                    if (isSvg && layer.tintColor) {
                        const worldTheme = 'default'; 
                        const resolvedTint = resolveCssVariable(layer.tintColor, worldTheme, allThemes);
                        const offscreenCanvas = document.createElement('canvas');
                        offscreenCanvas.width = img.width;
                        offscreenCanvas.height = img.height;
                        const offCtx = offscreenCanvas.getContext('2d');
                        
                        if (offCtx) {
                            offCtx.drawImage(img, 0, 0);
                            offCtx.globalCompositeOperation = 'source-in';
                            offCtx.fillStyle = resolvedTint;
                            offCtx.fillRect(0, 0, img.width, img.height);
                            imgToDraw = offscreenCanvas;
                        } else {
                            imgToDraw = img;
                        }
                    } else {
                        imgToDraw = img;
                    }
                }
            } else {
                const img = new Image();
                img.onload = () => setImagesLoaded(c => c + 1);
                img.src = url;
                imageElementCache.set(url, img);
                return;
            }

            if (!imgToDraw) return;
            ctx.save();
            ctx.globalAlpha = layer.opacity;
            ctx.translate(layer.x, layer.y);
            ctx.rotate((layer.rotation * Math.PI) / 180);
            ctx.scale(layer.scale, layer.scale);
            ctx.drawImage(imgToDraw, 0, 0); 
            ctx.restore();
            if (layer.id === selectedLayerId) {
                const w = imgToDraw.width;
                const h = imgToDraw.height;
                ctx.strokeStyle = '#61afef';
                ctx.lineWidth = 2;
                ctx.strokeRect(layer.x, layer.y, w * layer.scale, h * layer.scale);
            }
        });
    }, [data.layers, selectedLayerId, assets, data.width, data.height, imagesLoaded]);
        
    const selectedLayer = data.layers.find(l => l.id === selectedLayerId);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            
            <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--tool-border)', background: 'var(--tool-bg-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                    <h3 style={{margin:0}}>{data.name}</h3>
                    <span style={{fontSize:'0.8rem', color:'var(--tool-text-dim)'}}>{data.id}</span>
                </div>
                <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                    <select 
                        className="form-select" 
                        style={{width:'auto', padding:'2px 8px'}}
                        onChange={(e) => {
                            const dims = CANVAS_PRESETS[e.target.value as keyof typeof CANVAS_PRESETS];
                            if(dims) {
                                handleChange('width', dims.w);
                                handleChange('height', dims.h);
                            }
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled>Resize Canvas...</option>
                        {Object.keys(CANVAS_PRESETS).map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                    <label className="form-label" style={{marginBottom:0}}>W:</label>
                    <input type="number" value={data.width} onChange={e => handleChange('width', parseInt(e.target.value))} className="form-input" style={{width: 60}} />
                    <label className="form-label" style={{marginBottom:0}}>H:</label>
                    <input type="number" value={data.height} onChange={e => handleChange('height', parseInt(e.target.value))} className="form-input" style={{width: 60}} />
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                
                <div style={{ width: '300px', minWidth: '300px', borderRight: '1px solid var(--tool-border)', display: 'flex', flexDirection: 'column', background: 'var(--tool-bg-sidebar)' }}>
                    {/* Tabs */}
                    <div style={{ display:'flex', borderBottom:'1px solid var(--tool-border)', flexShrink: 0 }}>
                        <button 
                            onClick={() => setBrowserTab('project')}
                            style={{ flex:1, padding:'0.8rem', background: browserTab === 'project' ? 'var(--tool-bg-input)' : 'transparent', border:'none', color: browserTab === 'project' ? 'var(--tool-text-main)' : 'var(--tool-text-dim)', cursor:'pointer', fontWeight:'bold' }}
                        >
                            Project
                        </button>
                        <button 
                            onClick={() => setBrowserTab('presets')}
                            style={{ flex:1, padding:'0.8rem', background: browserTab === 'presets' ? 'var(--tool-bg-input)' : 'transparent', border:'none', color: browserTab === 'presets' ? 'var(--tool-text-main)' : 'var(--tool-text-dim)', cursor:'pointer', fontWeight:'bold' }}
                        >
                            Presets
                        </button>
                    </div>
                    
                    {/* Search & Actions */}
                    <div style={{ padding: '0.5rem', borderBottom:'1px solid var(--tool-border)', flexShrink: 0 }}>
                        <input 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="form-input" 
                            placeholder="Search..." 
                            style={{ width: '100%', marginBottom: '5px' }} 
                        />
                        {browserTab === 'presets' && (
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button style={miniButtonStyle} onClick={() => setCollapsedCategories(new Set())}>Expand All</button>
                                <button style={miniButtonStyle} onClick={() => setCollapsedCategories(new Set(presets.map(c => c.name)))}>Collapse All</button>
                            </div>
                        )}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', minHeight: 0 }}>
                        {browserTab === 'project' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                                {filteredAssets.map(asset => (
                                    <div 
                                        key={asset.id} 
                                        onClick={() => addLayer(asset.id, asset.id, false)}
                                        style={{ aspectRatio: '1/1', border: '1px solid var(--tool-border)', borderRadius: '4px', cursor: 'pointer', overflow:'hidden', position: 'relative' }}
                                        className="hover:border-blue-500"
                                    >
                                        {asset.url && <img src={asset.url} style={{ width:'100%', height:'100%', objectFit:'contain', background:'#000' }} alt={asset.id} />}
                                        <div style={{position:'absolute', bottom:0, background:'rgba(0,0,0,0.7)', width:'100%', fontSize:'0.6rem', padding:'2px', whiteSpace:'nowrap', overflow:'hidden'}}>{asset.id}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {filteredPresets.map(cat => (
                                    <div key={cat.name} style={{border: '1px solid var(--tool-border)', borderRadius: '4px', overflow:'hidden'}}>
                                        <div 
                                            onClick={() => toggleCategory(cat.name)}
                                            style={{ 
                                                padding: '6px 8px', 
                                                background: 'var(--tool-bg-header)', 
                                                fontSize:'0.75rem', 
                                                textTransform:'uppercase', 
                                                color:'var(--tool-text-main)', 
                                                fontWeight:'bold',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between'
                                            }}
                                        >
                                            <span>{cat.name}</span>
                                            <span>{collapsedCategories.has(cat.name) ? '+' : '-'}</span>
                                        </div>
                                        
                                        {!collapsedCategories.has(cat.name) && (
                                            <div style={{ padding: '5px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(45px, 1fr))', gap: '5px', background: 'var(--tool-bg-input)' }}>
                                                {cat.files.map(file => (
                                                    <div 
                                                        key={file.path}
                                                        onClick={() => addLayer(file.path, file.name, true)}
                                                        title={file.name}
                                                        style={{ aspectRatio: '1/1', background: '#222', borderRadius: '4px', cursor: 'pointer', padding: '4px', border: '1px solid var(--tool-border)', display:'flex', alignItems:'center', justifyContent:'center' }}
                                                        className="hover:border-blue-500"
                                                    >
                                                        <img src={`/${file.path}`} style={{ width:'100%', height:'100%', objectFit:'contain' }} alt={file.name} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div style={{ fontSize: '0.7rem', color: '#666', textAlign: 'center', marginTop: '10px', fontStyle: 'italic', paddingBottom: '20px' }}>
                                    Icons via game-icons.net (CC BY 3.0)
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ flex: 1, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '2rem', minWidth: 0 }}>
                    <div style={{ 
                        width: data.width, 
                        height: data.height, 
                        boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                        background: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iIzIyMiIgZD0iTTAgMGgxMHYxMEgwem0xMCAxMGgxMHYxMEgxMHoiLz48L3N2Zz4=") repeat',
                        flexShrink: 0 
                    }}>
                        <canvas 
                            ref={canvasRef}
                            width={data.width}
                            height={data.height}
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>
                </div>

                <div style={{ width: '320px', minWidth: '320px', borderLeft: '1px solid var(--tool-border)', display: 'flex', flexDirection: 'column', background: 'var(--tool-bg-sidebar)' }}>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--tool-border)', minHeight: '200px' }}>
                        <div style={{ padding: '0.5rem', fontWeight:'bold', borderBottom:'1px solid var(--tool-border)', background:'var(--tool-bg-header)', flexShrink: 0 }}>Layers</div>
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            {[...data.layers].sort((a,b) => b.zIndex - a.zIndex).map((layer) => (
                                <div 
                                    key={layer.id}
                                    onClick={() => setSelectedLayerId(layer.id)}
                                    style={{ 
                                        padding: '0.5rem', 
                                        borderBottom: '1px solid var(--tool-border)',
                                        background: selectedLayerId === layer.id ? 'var(--tool-accent)' : 'transparent',
                                        color: selectedLayerId === layer.id ? '#000' : 'var(--tool-text-main)',
                                        cursor: 'pointer',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}
                                >
                                    <div style={{display:'flex', gap:'5px', alignItems:'center', overflow:'hidden'}}>
                                        {layer.enableThemeColor && <span style={{fontSize:'0.6rem', background:'#000', color:'#fff', padding:'1px 3px', borderRadius:'2px', flexShrink:0}} title="Theme Bound">T</span>}
                                        <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{layer.name}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', flexShrink: 0 }}>
                                        {layer.groupId ? `[${layer.groupId}]` : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ height: '60%', overflowY: 'auto', background: 'var(--tool-bg-input)', padding: '1rem', flexShrink: 0 }}>
                        {selectedLayer ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display:'flex', justifyContent:'space-between'}}>
                                    <h4 style={{ margin: 0 }}>Properties</h4>
                                    <button onClick={() => removeLayer(selectedLayer.id)} style={{ color: 'var(--danger-color)', border:'none', background:'none', cursor:'pointer' }}>Delete</button>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Name</label>
                                    <input className="form-input" value={selectedLayer.name} onChange={e => updateLayer(selectedLayer.id, { name: e.target.value })} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div><label className="form-label">X</label><input type="number" className="form-input" value={selectedLayer.x} onChange={e => updateLayer(selectedLayer.id, { x: parseInt(e.target.value) })} /></div>
                                    <div><label className="form-label">Y</label><input type="number" className="form-input" value={selectedLayer.y} onChange={e => updateLayer(selectedLayer.id, { y: parseInt(e.target.value) })} /></div>
                                    <div><label className="form-label">Scale</label><input type="number" step="0.1" className="form-input" value={selectedLayer.scale} onChange={e => updateLayer(selectedLayer.id, { scale: parseFloat(e.target.value) })} /></div>
                                    <div><label className="form-label">Rotate</label><input type="number" className="form-input" value={selectedLayer.rotation} onChange={e => updateLayer(selectedLayer.id, { rotation: parseInt(e.target.value) })} /></div>
                                </div>

                                <hr style={{ borderColor: 'var(--tool-border)' }} />

                                <div style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                                    <h5 style={{ marginTop: 0, marginBottom: '10px', color: 'var(--tool-text-header)' }}>Dynamic Layer Logic</h5>
                                    <div className="form-group">
                                        <label className="form-label">Logic Group ID</label>
                                        <input className="form-input" placeholder="e.g. hair_style" value={selectedLayer.groupId || ''} onChange={e => updateLayer(selectedLayer.id, { groupId: e.target.value })} />
                                        <p className="special-desc">If set, only one layer from this group will be shown at a time.</p>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Variant Value</label>
                                        <input className="form-input" placeholder="e.g. long_braid" value={selectedLayer.variantValue || ''} onChange={e => updateLayer(selectedLayer.id, { variantValue: e.target.value })} />
                                        <p className="special-desc">This layer is shown if the URL parameter for its group matches this value.</p>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="toggle-label">
                                        <input type="checkbox" checked={selectedLayer.enableThemeColor || false} onChange={e => updateLayer(selectedLayer.id, { enableThemeColor: e.target.checked })} />
                                        Bind SVG to Theme Colors
                                    </label>
                                    <p className="special-desc" style={{ color: 'var(--tool-accent-mauve)'}}>
                                        Replaces all <code>var(--color)</code> properties in an SVG with theme colors on final render. Preview may not be accurate.
                                    </p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Manual Tint (Overrides Theme)</label>
                                    <ColorPickerInput 
                                        value={selectedLayer.tintColor || ''}
                                        onChange={color => updateLayer(selectedLayer.id, { tintColor: color })}
                                        allThemes={allThemes} 
                                    />
                                </div>

                            </div>
                        ) : (
                            <div style={{ color: 'var(--tool-text-dim)', textAlign: 'center', marginTop: '2rem' }}>Select a layer</div>
                        )}
                    </div>
                </div>
            </div>

            <ComposerOutput 
                composition={data}
                onExport={() => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                        const link = document.createElement('a');
                        link.download = `${data.id}-preview.png`;
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                    }
                }}
            />

            <CommandCenter 
                isDirty={isDirty}
                isSaving={isSaving}
                lastSaved={lastSaved}
                onSave={handleSave}
                onDelete={onDelete}
                onRevert={revertChanges}
                itemType="Composition"
            />
        </div>
    );
}

const miniButtonStyle: React.CSSProperties = {
    flex: 1,
    fontSize: '0.7rem',
    background: 'var(--tool-bg-input)',
    border: '1px solid var(--tool-border)',
    color: 'var(--tool-text-dim)',
    borderRadius: '4px',
    cursor: 'pointer',
    padding: '2px 4px'
};