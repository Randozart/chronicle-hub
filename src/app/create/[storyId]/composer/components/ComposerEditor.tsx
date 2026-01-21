'use client';

import { useState, useRef, useEffect } from 'react';
import { ImageComposition, CompositionLayer, GlobalAsset } from '@/engine/models';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import CommandCenter from '@/components/admin/CommandCenter';
import { v4 as uuidv4 } from 'uuid';

interface Props {
    initialData: ImageComposition;
    storyId: string;
    assets: GlobalAsset[];
    onSave: (data: ImageComposition) => void;
    onDelete: () => void;
    guardRef: { current: FormGuard | null };
}

export default function ComposerEditor({ initialData, storyId, assets, onSave, onDelete, guardRef }: Props) {
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
    if (!data) return <div className="loading-container">Loading editor...</div>;

    const addLayer = (asset: GlobalAsset) => {
        const newLayer: CompositionLayer = {
            id: uuidv4(),
            assetId: asset.id,
            name: asset.id,
            zIndex: data.layers.length,
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            opacity: 1
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

    const selectedLayer = data.layers.find(l => l.id === selectedLayerId);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const sortedLayers = [...data.layers].sort((a, b) => a.zIndex - b.zIndex);

        sortedLayers.forEach(layer => {
            const asset = assets.find(a => a.id === layer.assetId);
            const url = asset ? asset.url : `/images/uploads/${layer.assetId}.png`; 

            if (!url) return;

            const img = new Image();
            img.src = url;
            ctx.save();
            ctx.globalAlpha = layer.opacity;
            ctx.translate(layer.x, layer.y);
            ctx.rotate((layer.rotation * Math.PI) / 180);
            ctx.scale(layer.scale, layer.scale);
            ctx.drawImage(img, 0, 0); 
            ctx.restore();
            if (layer.id === selectedLayerId) {
                ctx.strokeStyle = '#61afef';
                ctx.lineWidth = 2;
                ctx.strokeRect(layer.x, layer.y, 100 * layer.scale, 100 * layer.scale); 
            }
        });

    }, [data.layers, selectedLayerId, assets, data.width, data.height]);


    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--tool-border)', background: 'var(--tool-bg-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                    <h3 style={{margin:0}}>{data.name}</h3>
                    <span style={{fontSize:'0.8rem', color:'var(--tool-text-dim)'}}>{data.id}</span>
                </div>
                <div style={{display:'flex', gap:'1rem'}}>
                    <label className="form-label" style={{marginBottom:0}}>W:</label>
                    <input type="number" value={data.width} onChange={e => handleChange('width', parseInt(e.target.value))} className="form-input" style={{width: 60}} />
                    <label className="form-label" style={{marginBottom:0}}>H:</label>
                    <input type="number" value={data.height} onChange={e => handleChange('height', parseInt(e.target.value))} className="form-input" style={{width: 60}} />
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                
                <div style={{ width: '250px', borderRight: '1px solid var(--tool-border)', display: 'flex', flexDirection: 'column', background: 'var(--tool-bg-sidebar)' }}>
                    <div style={{ padding: '0.5rem', fontWeight:'bold', borderBottom:'1px solid var(--tool-border)' }}>Assets</div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', alignContent: 'start' }}>
                        {assets.map(asset => (
                            <div 
                                key={asset.id} 
                                onClick={() => addLayer(asset)}
                                style={{ aspectRatio: '1/1', border: '1px solid var(--tool-border)', borderRadius: '4px', cursor: 'pointer', overflow:'hidden', position: 'relative' }}
                                className="hover:border-blue-500"
                            >
                                {asset.url && <img src={asset.url} style={{ width:'100%', height:'100%', objectFit:'contain', background:'#000' }} alt={asset.id} />}
                                <div style={{position:'absolute', bottom:0, background:'rgba(0,0,0,0.7)', width:'100%', fontSize:'0.6rem', padding:'2px', whiteSpace:'nowrap', overflow:'hidden'}}>{asset.id}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ flex: 1, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '2rem' }}>
                    <div style={{ 
                        width: data.width, 
                        height: data.height, 
                        boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                        background: '#1a1a1a' 
                    }}>
                        <canvas 
                            ref={canvasRef}
                            width={data.width}
                            height={data.height}
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>
                </div>

                <div style={{ width: '300px', borderLeft: '1px solid var(--tool-border)', display: 'flex', flexDirection: 'column', background: 'var(--tool-bg-sidebar)' }}>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--tool-border)', minHeight: '200px' }}>
                        <div style={{ padding: '0.5rem', fontWeight:'bold', borderBottom:'1px solid var(--tool-border)', background:'var(--tool-bg-header)' }}>Layers</div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
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
                                        display: 'flex', justifyContent: 'space-between'
                                    }}
                                >
                                    <span>{layer.name}</span>
                                    <div style={{ fontSize: '0.8rem' }}>
                                        {layer.groupId ? `[${layer.groupId}]` : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ height: '350px', overflowY: 'auto', background: 'var(--tool-bg-input)', padding: '1rem' }}>
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
                                
                                <div className="form-group">
                                    <label className="form-label">Logic Group (Variable)</label>
                                    <input className="form-input" placeholder="e.g. hair_color" value={selectedLayer.groupId || ''} onChange={e => updateLayer(selectedLayer.id, { groupId: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Variant Value</label>
                                    <input className="form-input" placeholder="e.g. blonde" value={selectedLayer.variantValue || ''} onChange={e => updateLayer(selectedLayer.id, { variantValue: e.target.value })} />
                                </div>

                                <div className="form-group">
                                    <label className="toggle-label">
                                        <input type="checkbox" checked={selectedLayer.enableThemeColor || false} onChange={e => updateLayer(selectedLayer.id, { enableThemeColor: e.target.checked })} />
                                        Bind to Theme Colors (SVG)
                                    </label>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Manual Tint</label>
                                    <input className="form-input" placeholder="#FFFFFF or var(--accent)" value={selectedLayer.tintColor || ''} onChange={e => updateLayer(selectedLayer.id, { tintColor: e.target.value })} />
                                </div>

                            </div>
                        ) : (
                            <div style={{ color: 'var(--tool-text-dim)', textAlign: 'center', marginTop: '2rem' }}>Select a layer</div>
                        )}
                    </div>
                </div>
            </div>

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