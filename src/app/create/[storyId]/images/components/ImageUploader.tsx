'use client';

import { useState, useRef, useEffect } from 'react';
import { ImageCategory, ImageDefinition } from '@/engine/models';

interface Props {
    storyId: string;
    onUploadComplete: (data: { image: ImageDefinition, usage: number }) => void;
    onStorageUpdate?: (newUsage: number) => void;
}

const OUTPUT_WIDTHS: Record<string, number> = {
    'icon': 512,
    'location': 1024,
    'banner': 1920,
    'cover': 1920,
    'background': 1920,
    'map': 2048,
    'storylet': 800,
    'uncategorized': 1024
};

const ASPECT_RATIOS: Record<string, number> = {
    'uncategorized': 1,
    'icon': 1,
    'location': 1,
    'storylet': 3/4,
    'banner': 3/1,
    'cover': 16/9,
    'background': 16/9,
    'map': 4/3
};

export default function ImageUploader({ storyId, onUploadComplete, onStorageUpdate }: Props) {
    const [activeTab, setActiveTab] = useState<'upload' | 'library'>('upload');
    const [isUploading, setIsUploading] = useState(false);
    const [category, setCategory] = useState<ImageCategory>('uncategorized');
    const [error, setError] = useState('');
    
    // Upload State
    const [imageKey, setImageKey] = useState("");
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
    const [originalFileType, setOriginalFileType] = useState("image/jpeg");
    const [quality, setQuality] = useState(90); 
    const [estimatedSize, setEstimatedSize] = useState<number | null>(null);

    // Library State
    const [userAssets, setUserAssets] = useState<any[]>([]);
    const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

    // Crop State
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [maxZoom, setMaxZoom] = useState(5);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- LIBRARY FETCH ---
    useEffect(() => {
        if (activeTab === 'library') {
            refreshLibrary();
        }
    }, [activeTab]);

    const refreshLibrary = () => {
        setIsLoadingLibrary(true);
        fetch('/api/admin/assets/mine')
            .then(res => res.json())
            .then(data => {
                if (data.assets) setUserAssets(data.assets);
            })
            .finally(() => setIsLoadingLibrary(false));
    };

    const handleSelectFromLibrary = (asset: any) => {
        if (!confirm(`Import "${asset.id}" into this world?`)) return;
        
        const imageData: ImageDefinition = {
            id: asset.id, 
            url: asset.url,
            alt: asset.id,
            category: asset.category as ImageCategory,
            size: asset.size
        };

        fetch('/api/admin/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                storyId, 
                category: 'images', 
                itemId: asset.id, 
                data: imageData 
            })
        }).then(res => {
            if(res.ok) {
                onUploadComplete({ image: imageData, usage: 0 }); 
                alert("Asset linked from library!");
            }
        });
    };

    const handleDeleteFromLibrary = async (asset: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Permanently delete "${asset.id}" from your storage?\n\nThis will break images in any world using this file.`)) return;

        try {
            const res = await fetch('/api/admin/assets/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: asset.url })
            });

            if (res.ok) {
                const data = await res.json();
                setUserAssets(prev => prev.filter(a => a.url !== asset.url));
                if (onStorageUpdate && data.usage !== undefined) {
                    onStorageUpdate(data.usage);
                }
            } else {
                alert("Failed to delete asset.");
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting asset.");
        }
    };

    // --- UPLOAD LOGIC ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const cleanName = file.name.split('.')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        setImageKey(cleanName);
        setOriginalFileType(file.type); // Save type for estimation

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            setOriginalImage(img);
            calculateAutoFit(img, category);
        };
        img.src = url;
    };

    const calculateAutoFit = (img: HTMLImageElement, cat: string) => {
        const CANVAS_SIZE = 400;
        const ratio = ASPECT_RATIOS[cat] || 1;
        
        let maskW = CANVAS_SIZE - 40; 
        let maskH = maskW / ratio;
        if (maskH > CANVAS_SIZE - 40) {
            maskH = CANVAS_SIZE - 40;
            maskW = maskH * ratio;
        }

        const scaleX = maskW / img.width;
        const scaleY = maskH / img.height;
        const idealScale = Math.max(scaleX, scaleY);
        
        setScale(idealScale);
        setPan({ x: 0, y: 0 });
        setMaxZoom(Math.max(5, idealScale * 5)); 
    };

    useEffect(() => {
        if (originalImage) calculateAutoFit(originalImage, category);
    }, [category]);

    // SIZE ESTIMATOR
    useEffect(() => {
        if (!originalImage) return;

        // Debounce the heavy canvas operation
        const timer = setTimeout(() => {
            const targetW = OUTPUT_WIDTHS[category] || 1024;
            const ratio = ASPECT_RATIOS[category] || 1;
            const targetH = targetW / ratio;

            // Offscreen canvas for calculation
            const osc = document.createElement('canvas');
            osc.width = targetW;
            osc.height = targetH;
            const ctx = osc.getContext('2d');
            if(!ctx) return;

            // Replicate the cropping math
            const CANVAS_SIZE = 400;
            let maskW = CANVAS_SIZE - 40;
            let maskH = maskW / ratio;
            if (maskH > CANVAS_SIZE - 40) { maskH = CANVAS_SIZE - 40; maskW = maskH * ratio; }

            const renderRatio = targetW / maskW;
            const centerX = targetW / 2;
            const centerY = targetH / 2;

            ctx.translate(centerX + (pan.x * renderRatio), centerY + (pan.y * renderRatio));
            const finalScale = scale * renderRatio;
            ctx.scale(finalScale, finalScale);
            ctx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);

            // Estimate Size
            // Note: Browser PNG encoder ignores 'quality' argument, so PNG estimates are always 100%.
            // JPEG/WebP estimates respect the slider.
            osc.toBlob((blob) => {
                if (blob) setEstimatedSize(blob.size);
            }, originalFileType, quality / 100);

        }, 300); // 300ms delay

        return () => clearTimeout(timer);
    }, [originalImage, quality, category, scale, pan]); // Re-run when any of these change


    // PREVIEW RENDERER
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !originalImage) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const CANVAS_SIZE = 400;
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
        ctx.scale(scale, scale);
        ctx.imageSmoothingEnabled = scale > 2; 
        ctx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);
        ctx.restore();

        const ratio = ASPECT_RATIOS[category] || 1;
        let maskW = CANVAS_SIZE - 40;
        let maskH = maskW / ratio;
        if (maskH > CANVAS_SIZE - 40) {
            maskH = CANVAS_SIZE - 40;
            maskW = maskH * ratio;
        }

        const maskX = (CANVAS_SIZE - maskW) / 2;
        const maskY = (CANVAS_SIZE - maskH) / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        
        ctx.rect(maskX, maskY, maskW, maskH); 
        ctx.fill('evenodd');

        ctx.strokeStyle = '#61afef';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(maskX, maskY, maskW, maskH);
        ctx.stroke();

        ctx.fillStyle = '#61afef';
        ctx.font = '10px monospace';
        ctx.fillText(`${OUTPUT_WIDTHS[category]}px width`, maskX, maskY - 8);

    }, [originalImage, scale, pan, category]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setIsDragging(false);
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        setScale(prev => Math.min(Math.max(0.1, prev + delta), maxZoom));
    };

    const handleUpload = async () => {
        if (!originalImage || !canvasRef.current) return;
        setIsUploading(true);
        setError('');

        try {
            const targetW = OUTPUT_WIDTHS[category] || 1024;
            const ratio = ASPECT_RATIOS[category] || 1;
            const targetH = targetW / ratio;

            const CANVAS_SIZE = 400;
            let maskW = CANVAS_SIZE - 40;
            let maskH = maskW / ratio;
            if (maskH > CANVAS_SIZE - 40) {
                maskH = CANVAS_SIZE - 40;
                maskW = maskH * ratio;
            }

            const renderRatio = targetW / maskW;
            const outputCanvas = document.createElement('canvas');
            outputCanvas.width = targetW;
            outputCanvas.height = targetH;
            const ctx = outputCanvas.getContext('2d');
            if (!ctx) throw new Error("Could not create context");

            const centerX = targetW / 2;
            const centerY = targetH / 2;

            ctx.translate(centerX + (pan.x * renderRatio), centerY + (pan.y * renderRatio));
            const finalScale = scale * renderRatio;
            ctx.scale(finalScale, finalScale);
            
            ctx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);

            outputCanvas.toBlob(async (blob) => {
                if (!blob) throw new Error("Canvas empty");
                
                const formData = new FormData();
                formData.append('file', blob, `${imageKey}.${originalFileType.split('/')[1]}`); // Keep extension match
                formData.append('storyId', storyId);
                formData.append('category', category);
                formData.append('alt', imageKey);
                formData.append('quality', quality.toString());

                const res = await fetch('/api/admin/assets/upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await res.json();
                if (res.ok) {
                    onUploadComplete(data);
                    setOriginalImage(null);
                    setImageKey("");
                    setEstimatedSize(null);
                } else {
                    setError(data.error || 'Upload failed');
                }
                setIsUploading(false);
            }, originalFileType, quality / 100); 

        } catch (e) {
            console.error(e);
            setError('Failed to process image');
            setIsUploading(false);
        }
    };

    return (
        <div style={{ padding: '1rem', background: '#21252b', borderRadius: '4px', border: '1px solid #333' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                <button 
                    onClick={() => setActiveTab('upload')}
                    style={{ background: 'none', border: 'none', color: activeTab === 'upload' ? '#61afef' : '#777', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    Upload New
                </button>
                <button 
                    onClick={() => setActiveTab('library')}
                    style={{ background: 'none', border: 'none', color: activeTab === 'library' ? '#61afef' : '#777', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    My Library
                </button>
            </div>

            {activeTab === 'upload' && (
                <>
                    {!originalImage ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            style={{ 
                                border: '2px dashed #444', borderRadius: '8px', padding: '2rem',
                                textAlign: 'center', cursor: 'pointer', color: '#888',
                                transition: 'all 0.2s'
                            }}
                            className="hover:border-[#61afef] hover:text-[#61afef]"
                        >
                            <p style={{ margin: 0 }}>Click to Select Image</p>
                            <input 
                                ref={fileInputRef} 
                                type="file" 
                                accept="image/*" 
                                onChange={handleFileSelect} 
                                style={{ display: 'none' }} 
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                 <div className="form-group">
                                    <label className="form-label">Asset Key (ID)</label>
                                    <input value={imageKey} onChange={e => setImageKey(e.target.value)} className="form-input" placeholder="my_image_name" />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select 
                                        value={category} 
                                        onChange={e => setCategory(e.target.value as ImageCategory)} 
                                        className="form-select"
                                    >
                                        {Object.keys(OUTPUT_WIDTHS).map(c => (
                                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                        ))}
                                    </select>
                                    <p style={{ fontSize: '0.75rem', color: '#777', marginTop: '4px' }}>
                                        Preset: {OUTPUT_WIDTHS[category]}px width
                                    </p>
                                </div>

                                {/* QUALITY SLIDER */}
                                <div className="form-group">
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <label className="form-label">Quality</label>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '0.8rem', color: quality < 60 ? '#e74c3c' : '#98c379', marginRight: '8px' }}>
                                                {quality}%
                                            </span>
                                            {estimatedSize && (
                                                <span style={{ fontSize: '0.8rem', color: '#ccc', background: '#333', padding: '2px 6px', borderRadius: '4px' }}>
                                                    ~{(estimatedSize / 1024).toFixed(0)} KB
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="40" max="100" step="5" 
                                        value={quality} 
                                        onChange={(e) => setQuality(parseInt(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                    {originalFileType === 'image/png' && quality < 90 && (
                                        <p style={{ fontSize: '0.7rem', color: '#e5c07b', marginTop: '2px' }}>
                                            Note: PNGs compress on server. Browser estimate may be inaccurate.
                                        </p>
                                    )}
                                </div>
                                
                                <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                                    <button onClick={() => setOriginalImage(null)} className="unequip-btn" style={{ flex: 1 }}>Cancel</button>
                                    <button onClick={handleUpload} disabled={isUploading || !imageKey} className="save-btn" style={{ flex: 1 }}>
                                        {isUploading ? 'Uploading...' : 'Save Asset'}
                                    </button>
                                </div>
                                {error && <p style={{ color: 'var(--danger-color)', fontSize: '0.85rem' }}>{error}</p>}
                            </div>

                            <div style={{ flex: 1, minWidth: '300px' }}>
                                 <canvas 
                                    ref={canvasRef}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                    onWheel={handleWheel}
                                    style={{ 
                                        cursor: isDragging ? 'grabbing' : 'grab', 
                                        border: '1px solid #444',
                                        borderRadius: '4px',
                                        width: '100%',
                                        boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'library' && (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {isLoadingLibrary ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Loading your library...</div>
                    ) : userAssets.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No uploads found.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                            {userAssets.map(asset => (
                                <div 
                                    key={asset.id} 
                                    onClick={() => handleSelectFromLibrary(asset)}
                                    style={{ 
                                        border: '1px solid #333', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer',
                                        background: '#111', transition: 'border-color 0.2s', position: 'relative'
                                    }}
                                    className="hover:border-[#61afef]"
                                >
                                    <div style={{ width: '100%', aspectRatio: '1/1' }}>
                                        <img 
                                            src={asset.url} 
                                            alt={asset.id} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: -1, background: '#222' }}>
                                            <span style={{ fontSize: '2rem', color: '#444' }}>?</span>
                                        </div>
                                    </div>
                                    <div style={{ padding: '4px', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#ccc' }}>
                                        {asset.id}
                                    </div>
                                    
                                    <button
                                        onClick={(e) => handleDeleteFromLibrary(asset, e)}
                                        style={{
                                            position: 'absolute', top: 2, right: 2,
                                            background: 'rgba(0,0,0,0.7)', border: 'none', color: '#e74c3c',
                                            width: '20px', height: '20px', borderRadius: '3px',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '12px'
                                        }}
                                        title="Delete Permanently"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}