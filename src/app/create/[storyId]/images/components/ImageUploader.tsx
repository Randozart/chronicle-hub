'use client';

import { useState, useRef, useEffect } from 'react';
import { ImageCategory, ImageDefinition } from '@/engine/models';

interface Props {
    storyId: string;
    onUploadComplete: (data: { image: ImageDefinition, usage: number }) => void;
    onStorageUpdate?: (newUsage: number) => void;
}

// --- CONFIGURATION ---
const INTERNAL_CANVAS_SIZE = 800; // High internal res for cropping precision

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
    // We store the pointer start position and the pan value at the start of the drag
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
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
        setOriginalFileType(file.type); 

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            setOriginalImage(img);
            calculateAutoFit(img, category);
        };
        img.src = url;
    };

    const calculateAutoFit = (img: HTMLImageElement, cat: string) => {
        const CANVAS_SIZE = INTERNAL_CANVAS_SIZE;
        const ratio = ASPECT_RATIOS[cat] || 1;
        
        // Calculate the safe area (mask) within the canvas
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
        if (!originalImage || originalFileType === 'image/svg+xml') {
            setEstimatedSize(null);
            return;
        }

        const timer = setTimeout(() => {
            const targetW = OUTPUT_WIDTHS[category] || 1024;
            const ratio = ASPECT_RATIOS[category] || 1;
            const targetH = targetW / ratio;

            const osc = document.createElement('canvas');
            osc.width = targetW;
            osc.height = targetH;
            const ctx = osc.getContext('2d');
            if(!ctx) return;

            osc.toBlob((blob) => {
                if (blob) setEstimatedSize(blob.size);
            }, originalFileType, quality / 100);

        }, 300);

        return () => clearTimeout(timer);
    }, [originalImage, quality, category, originalFileType]);


    // PREVIEW RENDERER
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !originalImage) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Ensure canvas internal resolution is high regardless of CSS display size
        const CANVAS_SIZE = INTERNAL_CANVAS_SIZE;
        if (canvas.width !== CANVAS_SIZE) {
            canvas.width = CANVAS_SIZE;
            canvas.height = CANVAS_SIZE;
        }

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
        ctx.scale(scale, scale);
        ctx.imageSmoothingEnabled = true; 
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

        // Dark overlay outside crop area
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.rect(maskX, maskY, maskW, maskH); 
        ctx.fill('evenodd');

        // Border
        ctx.strokeStyle = '#61afef';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.rect(maskX, maskY, maskW, maskH);
        ctx.stroke();

        // Text
        ctx.fillStyle = '#61afef';
        ctx.font = '24px monospace';
        ctx.fillText(`${OUTPUT_WIDTHS[category]}px width`, maskX, maskY - 12);

    }, [originalImage, scale, pan, category]);

    // --- INPUT HANDLERS (Mobile Friendly) ---
    // We must map Visual Coordinates (CSS pixels) to Internal Coordinates (Canvas pixels)
    
    const getPointerPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        // Handle both mouse and touch events
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        return { x: clientX, y: clientY };
    };

    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const pos = getPointerPos(e);
        setDragStart(pos);
        setPanStart(pan);
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !canvasRef.current) return;
        
        // Prevent scrolling on mobile while dragging
        if(e.type === 'touchmove') {
             // We can't preventDefault on React synthetic events easily for passive listeners,
             // but CSS touch-action: none handles this mostly.
        }

        const pos = getPointerPos(e);
        const rect = canvasRef.current.getBoundingClientRect();
        
        // Calculate scaling factor between visual size and internal canvas size
        const visualToInternalRatio = INTERNAL_CANVAS_SIZE / rect.width;

        const deltaX = (pos.x - dragStart.x) * visualToInternalRatio;
        const deltaY = (pos.y - dragStart.y) * visualToInternalRatio;

        setPan({ 
            x: panStart.x + deltaX, 
            y: panStart.y + deltaY 
        });
    };

    const handlePointerUp = () => setIsDragging(false);
    
    // Allow zoom via wheel (Desktop)
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = -e.deltaY * 0.0005; 
        setScale(prev => Math.min(Math.max(0.1, prev + delta), maxZoom));
    };

    // --- MAIN UPLOAD HANDLER ---
    const handleUpload = async () => {
        if (originalFileType === 'image/svg+xml') {
            await uploadRawFile();
        } else {
            await uploadCanvasBlob();
        }
    };

    const uploadRawFile = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('storyId', storyId);
            formData.append('category', category);
            formData.append('alt', imageKey);

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
        } catch (e) {
            console.error(e);
            setError('Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const uploadCanvasBlob = async () => {
        if (!originalImage || !canvasRef.current) return;
        setIsUploading(true);
        setError('');

        try {
            const targetW = OUTPUT_WIDTHS[category] || 1024;
            const ratio = ASPECT_RATIOS[category] || 1;
            const targetH = targetW / ratio;

            const CANVAS_SIZE = INTERNAL_CANVAS_SIZE;
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
                formData.append('file', blob, `${imageKey}.png`);
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
            }, 'image/png');

        } catch (e) {
            console.error(e);
            setError('Failed to process image');
            setIsUploading(false);
        }
    };

    return (
        <div style={{ padding: '1rem', background: 'var(--tool-bg-header)', borderRadius: '4px', border: '1px solid #333', maxWidth: '100%' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>
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
                                transition: 'all 0.2s', minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
                            }}
                            className="hover:border-[#61afef] hover:text-[#61afef]"
                        >
                            <p style={{ margin: 0, fontWeight: 'bold' }}>Click to Select Image</p>
                            <input 
                                ref={fileInputRef} 
                                type="file" 
                                accept="image/*" 
                                onChange={handleFileSelect} 
                                style={{ display: 'none' }} 
                            />
                        </div>
                    ) : (
                        <div style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', // Allows wrapping on mobile
                            gap: '20px', 
                            alignItems: 'flex-start' 
                        }}>
                            
                            {/* CANVAS AREA (Shows first on mobile usually due to DOM order if we don't reverse, but Side-by-Side is fine if they wrap naturally) */}
                            {/* We put Canvas FIRST so it's top on mobile, and LEFT on desktop if we use flex-row. 
                                Actually, standard is usually Image Top on mobile. */}
                            
                            <div style={{ 
                                flex: '1 1 300px', // Grow, Shrink, Basis 300px
                                minWidth: 'min(100%, 300px)',
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '15px' 
                            }}>
                                <canvas 
                                    ref={canvasRef}
                                    onMouseDown={handlePointerDown}
                                    onMouseMove={handlePointerMove}
                                    onMouseUp={handlePointerUp}
                                    onMouseLeave={handlePointerUp}
                                    onTouchStart={handlePointerDown}
                                    onTouchMove={handlePointerMove}
                                    onTouchEnd={handlePointerUp}
                                    onWheel={handleWheel}
                                    style={{ 
                                        cursor: isDragging ? 'grabbing' : 'grab', 
                                        border: '1px solid #444',
                                        borderRadius: '4px',
                                        width: '100%',            // Responsive width
                                        aspectRatio: '1/1',       // Keep square aspect ratio visually
                                        maxWidth: '600px',        // Cap max size
                                        boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                                        touchAction: 'none',      // Prevents page scrolling on mobile
                                        margin: '0 auto',
                                        display: 'block'
                                    }}
                                />

                                {/* Horizontal Slider (Better for mobile) */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>-</span>
                                    <input 
                                        type="range"
                                        min="0.1"
                                        max={maxZoom}
                                        step="0.01"
                                        value={scale}
                                        onChange={(e) => setScale(parseFloat(e.target.value))}
                                        style={{ flex: 1, accentColor: '#61afef', height: '30px' }}
                                    />
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>+</span>
                                </div>
                                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#666' }}>
                                    Drag to pan • Pinch/Scroll to zoom
                                </div>
                            </div>

                            {/* CONTROLS AREA */}
                            <div style={{ 
                                flex: '1 1 250px', // Grow, Shrink, Basis 250px
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '1rem',
                                minWidth: '250px' 
                            }}>
                                 <div className="form-group">
                                    <label className="form-label" style={{ display: 'block', marginBottom: '5px', color: '#ddd' }}>Asset Key (ID)</label>
                                    <input 
                                        value={imageKey} 
                                        onChange={e => setImageKey(e.target.value)} 
                                        className="form-input" 
                                        placeholder="my_image_name"
                                        style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px' }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'block', marginBottom: '5px', color: '#ddd' }}>Category</label>
                                    <select 
                                        value={category} 
                                        onChange={e => setCategory(e.target.value as ImageCategory)} 
                                        className="form-select"
                                        style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px' }}
                                    >
                                        {Object.keys(OUTPUT_WIDTHS).map(c => (
                                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                        ))}
                                    </select>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--tool-text-dim)', marginTop: '4px' }}>
                                        Preset: {OUTPUT_WIDTHS[category]}px width
                                    </p>
                                </div>

                                {originalFileType !== 'image/svg+xml' ? (
                                    <div className="form-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <label className="form-label" style={{ color: '#ddd' }}>Quality</label>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '0.8rem', color: quality < 60 ? '#e74c3c' : '#98c379', marginRight: '8px' }}>
                                                    {quality}%
                                                </span>
                                                {estimatedSize && (
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--tool-text-main)', background: '#333', padding: '2px 6px', borderRadius: '4px' }}>
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
                                            style={{ width: '100%', accentColor: '#98c379' }}
                                        />
                                    </div>
                                ) : (
                                    <div className="form-group">
                                        <div style={{ padding: '0.5rem', background: '#2c313a', borderRadius: '4px', color: '#61afef', fontSize: '0.8rem' }}>
                                            <strong>Vector File (SVG)</strong>
                                            <br/>
                                            Uploaded raw. Cropping disabled.
                                        </div>
                                    </div>
                                )}
                                
                                <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                                    <button 
                                        onClick={() => setOriginalImage(null)} 
                                        className="unequip-btn" 
                                        style={{ flex: 1, padding: '10px', background: '#333', border: 'none', color: '#ccc', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleUpload} 
                                        disabled={isUploading || !imageKey} 
                                        className="save-btn" 
                                        style={{ flex: 1, padding: '10px', background: isUploading ? '#444' : '#61afef', border: 'none', color: isUploading ? '#888' : '#fff', borderRadius: '4px', cursor: isUploading ? 'default' : 'pointer' }}
                                    >
                                        {isUploading ? 'Uploading...' : 'Save Asset'}
                                    </button>
                                </div>
                                {error && <p style={{ color: 'var(--danger-color)', fontSize: '0.85rem' }}>{error}</p>}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Library Tab */}
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
                                    </div>
                                    <div style={{ padding: '4px', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--tool-text-main)' }}>
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