'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/providers/ToastProvider';
import { ImageCategory } from '@/engine/models';

interface Props {
    onSelect: (url: string) => void;
    onClose: () => void;
    storyId?: string; // Optional: Defaults to 'global' if not provided
}

// --- CONFIG FROM IMAGE UPLOADER ---
const INTERNAL_CANVAS_SIZE = 800;

const OUTPUT_WIDTHS: Record<string, number> = {
    'icon': 512,
    'location': 1024,
    'banner': 1920,
    'cover': 1920,
    'portrait': 800, // Added portrait for profiles
    'uncategorized': 1024
};

const ASPECT_RATIOS: Record<string, number> = {
    'uncategorized': 1,
    'icon': 1,
    'location': 1,
    'portrait': 3/4,
    'banner': 3/1,
    'cover': 16/9,
};

export default function ImagePickerModal({ onSelect, onClose, storyId = 'global' }: Props) {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
    
    // --- LIBRARY STATE ---
    const [images, setImages] = useState<any[]>([]);
    const [isLoadingLib, setIsLoadingLib] = useState(false);

    // --- UPLOAD STATE ---
    const [isUploading, setIsUploading] = useState(false);
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
    const [fileType, setFileType] = useState("image/jpeg");
    const [imageKey, setImageKey] = useState("");
    const [category, setCategory] = useState<string>('icon'); // Default to icon/square
    
    // --- CROP STATE ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [maxZoom, setMaxZoom] = useState(5);

    // 1. FETCH LIBRARY
    const fetchImages = () => {
        setIsLoadingLib(true);
        fetch('/api/admin/assets/mine')
            .then(res => res.json())
            .then(data => {
                const imgs = (data.assets || []).filter((a: any) => 
                    a.url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)
                );
                setImages(imgs);
            })
            .finally(() => setIsLoadingLib(false));
    };

    useEffect(() => {
        if (activeTab === 'library') fetchImages();
    }, [activeTab]);

    // 2. DELETE IMAGE
    const handleDelete = async (e: React.MouseEvent, url: string) => {
        e.stopPropagation();
        if (!confirm("Delete this image? This cannot be undone.")) return;
        
        try {
            const res = await fetch('/api/admin/assets/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            if (res.ok) {
                setImages(prev => prev.filter(img => img.url !== url));
                showToast("Image deleted.", "info");
            }
        } catch (e) {
            showToast("Failed to delete.", "error");
        }
    };

    // 3. FILE SELECTION
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const cleanName = file.name.split('.')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        setImageKey(cleanName);
        setFileType(file.type);

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            setOriginalImage(img);
            setActiveTab('upload'); // Switch tab just in case
            calculateAutoFit(img, category);
        };
        img.src = url;
    };

    // 4. AUTO FIT LOGIC
    const calculateAutoFit = (img: HTMLImageElement, cat: string) => {
        const ratio = ASPECT_RATIOS[cat] || 1;
        let maskW = INTERNAL_CANVAS_SIZE - 40;
        let maskH = maskW / ratio;
        
        if (maskH > INTERNAL_CANVAS_SIZE - 40) {
            maskH = INTERNAL_CANVAS_SIZE - 40;
            maskW = maskH * ratio;
        }

        const scaleX = maskW / img.width;
        const scaleY = maskH / img.height;
        const idealScale = Math.max(scaleX, scaleY);
        
        setScale(idealScale);
        setPan({ x: 0, y: 0 });
        setMaxZoom(Math.max(5, idealScale * 5));
    };

    // 5. CANVAS RENDERER (The Crop Preview)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !originalImage) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Force high resolution internal size
        canvas.width = INTERNAL_CANVAS_SIZE;
        canvas.height = INTERNAL_CANVAS_SIZE;

        // Background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Image Transformed
        ctx.save();
        ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
        ctx.scale(scale, scale);
        ctx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);
        ctx.restore();

        // Calculate Mask
        const ratio = ASPECT_RATIOS[category] || 1;
        let maskW = INTERNAL_CANVAS_SIZE - 40;
        let maskH = maskW / ratio;
        if (maskH > INTERNAL_CANVAS_SIZE - 40) {
            maskH = INTERNAL_CANVAS_SIZE - 40;
            maskW = maskH * ratio;
        }
        
        const maskX = (INTERNAL_CANVAS_SIZE - maskW) / 2;
        const maskY = (INTERNAL_CANVAS_SIZE - maskH) / 2;

        // Overlay (The Darkening)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.rect(0, 0, INTERNAL_CANVAS_SIZE, INTERNAL_CANVAS_SIZE);
        ctx.rect(maskX, maskY, maskW, maskH); 
        ctx.fill('evenodd'); // Holes out the center

        // Selection Border
        ctx.strokeStyle = '#61afef';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.rect(maskX, maskY, maskW, maskH);
        ctx.stroke();

    }, [originalImage, scale, pan, category]);

    // 6. POINTER EVENTS (Pan)
    const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        setDragStart({ x: clientX, y: clientY });
        setPanStart(pan);
    };

    const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !canvasRef.current) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const rect = canvasRef.current.getBoundingClientRect();
        const ratio = INTERNAL_CANVAS_SIZE / rect.width; // Map CSS pixels to Canvas pixels

        const deltaX = (clientX - dragStart.x) * ratio;
        const deltaY = (clientY - dragStart.y) * ratio;

        setPan({ x: panStart.x + deltaX, y: panStart.y + deltaY });
    };

    // 7. UPLOAD EXECUTION
    const performUpload = async () => {
        if (!originalImage) return;
        setIsUploading(true);

        try {
            let blob: Blob | null = null;

            // SVG: Upload raw
            if (fileType === 'image/svg+xml') {
                // Fetch the blob from the object URL we created
                const response = await fetch(originalImage.src);
                blob = await response.blob();
            } 
            // RASTER: Crop and Resize
            else {
                const targetW = OUTPUT_WIDTHS[category] || 1024;
                const ratio = ASPECT_RATIOS[category] || 1;
                const targetH = targetW / ratio;

                // Re-calculate mask dimensions to get the render ratio
                let maskW = INTERNAL_CANVAS_SIZE - 40;
                let maskH = maskW / ratio;
                if (maskH > INTERNAL_CANVAS_SIZE - 40) {
                    maskW = (INTERNAL_CANVAS_SIZE - 40) * ratio;
                }

                const renderRatio = targetW / maskW;

                const osc = document.createElement('canvas');
                osc.width = targetW;
                osc.height = targetH;
                const ctx = osc.getContext('2d');
                if (!ctx) throw new Error("Context lost");

                // Apply Transforms
                const centerX = targetW / 2;
                const centerY = targetH / 2;
                
                ctx.translate(centerX + (pan.x * renderRatio), centerY + (pan.y * renderRatio));
                ctx.scale(scale * renderRatio, scale * renderRatio);
                ctx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);

                blob = await new Promise<Blob | null>(resolve => osc.toBlob(resolve, 'image/jpeg', 0.9));
            }

            if (!blob) throw new Error("Failed to generate image");

            const formData = new FormData();
            // Append extension based on type
            const ext = fileType === 'image/svg+xml' ? 'svg' : 'jpg';
            formData.append('file', blob, `${imageKey}.${ext}`);
            formData.append('storyId', storyId);
            formData.append('category', category);
            formData.append('alt', imageKey);

            const res = await fetch('/api/admin/assets/upload', { method: 'POST', body: formData });
            const data = await res.json();

            if (res.ok) {
                showToast("Upload complete!", "success");
                onSelect(data.image.url); // Select immediately
                onClose();
            } else {
                showToast(data.error || "Upload failed", "error");
            }

        } catch (e) {
            console.error(e);
            showToast("Upload failed", "error");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'var(--bg-overlay)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={onClose}>
            
            <div style={{
                width: '90%', maxWidth: '900px', height: '85vh',
                background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)', display: 'flex', flexDirection: 'column',
                overflow: 'hidden', boxShadow: 'var(--shadow-modal)'
            }} onClick={e => e.stopPropagation()}>
                
                {/* HEADER */}
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-item)' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            onClick={() => { setActiveTab('library'); setOriginalImage(null); }}
                            className={`tab-btn ${activeTab === 'library' ? 'active' : ''}`}
                            style={{ padding: '0.5rem 1rem', border: 'none', background: 'transparent' }}
                        >
                            Library
                        </button>
                        <button 
                            onClick={() => setActiveTab('upload')}
                            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                            style={{ padding: '0.5rem 1rem', border: 'none', background: 'transparent' }}
                        >
                            Upload New
                        </button>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                {/* CONTENT AREA */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'var(--bg-main)' }}>
                    
                    {/* --- LIBRARY VIEW --- */}
                    {activeTab === 'library' && (
                        <>
                            {isLoadingLib ? (
                                <div className="loading-container">Loading assets...</div>
                            ) : images.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    <p>Your library is empty.</p>
                                    <button onClick={() => setActiveTab('upload')} className="deck-button compact" style={{ marginTop: '1rem' }}>
                                        Upload First Image
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                                    {images.map((img) => (
                                        <div 
                                            key={img.url} 
                                            onClick={() => { onSelect(img.url); onClose(); }}
                                            className="inventory-item style-icon-grid"
                                            style={{ cursor: 'pointer', position: 'relative' }}
                                        >
                                            <div className="item-image-container">
                                                <img src={img.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div className="item-overlay-title">{img.id}</div>
                                            <button 
                                                onClick={(e) => handleDelete(e, img.url)}
                                                style={{
                                                    position: 'absolute', top: 5, right: 5, zIndex: 10,
                                                    background: 'rgba(0,0,0,0.6)', border: 'none', color: '#ff6b6b',
                                                    width: '24px', height: '24px', borderRadius: '4px', cursor: 'pointer'
                                                }}
                                                title="Delete"
                                            >✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* --- UPLOAD VIEW --- */}
                    {activeTab === 'upload' && (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {!originalImage ? (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ 
                                        border: '2px dashed var(--border-color)', borderRadius: '8px', 
                                        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s'
                                    }}
                                    className="hover-highlight"
                                >
                                    <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</span>
                                    <p>Click to select an image</p>
                                    <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleFileSelect} />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
                                    {/* EDITOR LAYOUT: Canvas + Controls */}
                                    <div style={{ flex: 1, display: 'flex', gap: '2rem', minHeight: 0, flexDirection: 'column', md: { flexDirection: 'row' } } as any}>
                                        
                                        {/* LEFT: Canvas */}
                                        <div style={{ flex: 2, minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <canvas 
                                                ref={canvasRef}
                                                onMouseDown={handlePointerDown}
                                                onMouseMove={handlePointerMove}
                                                onMouseUp={() => setIsDragging(false)}
                                                onMouseLeave={() => setIsDragging(false)}
                                                onTouchStart={handlePointerDown}
                                                onTouchMove={handlePointerMove}
                                                onTouchEnd={() => setIsDragging(false)}
                                                style={{ 
                                                    width: '100%', height: '100%', objectFit: 'contain',
                                                    borderRadius: '4px', border: '1px solid var(--border-color)',
                                                    cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none'
                                                }}
                                            />
                                        </div>

                                        {/* RIGHT: Controls */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
                                            
                                            <div className="form-group">
                                                <label className="form-label">Asset ID (Name)</label>
                                                <input 
                                                    className="form-input" 
                                                    value={imageKey} 
                                                    onChange={e => setImageKey(e.target.value)} 
                                                    placeholder="my_cool_image"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Crop Preset</label>
                                                <select 
                                                    className="form-select"
                                                    value={category}
                                                    onChange={e => { 
                                                        setCategory(e.target.value); 
                                                        // Recalculate fit when category changes
                                                        if(originalImage) calculateAutoFit(originalImage, e.target.value);
                                                    }}
                                                >
                                                    {Object.keys(ASPECT_RATIOS).map(k => (
                                                        <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>
                                                    ))}
                                                </select>
                                                <p className="special-desc">
                                                    Target: {OUTPUT_WIDTHS[category]}px width
                                                </p>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Zoom</label>
                                                <input 
                                                    type="range" min="0.1" max={maxZoom} step="0.01"
                                                    value={scale} 
                                                    onChange={e => setScale(parseFloat(e.target.value))}
                                                    style={{ width: '100%' }}
                                                />
                                            </div>

                                            <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                                                <button 
                                                    className="return-button" 
                                                    style={{ background: 'var(--bg-item)' }}
                                                    onClick={() => setOriginalImage(null)}
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    className="deck-button" 
                                                    style={{ flex: 1 }}
                                                    disabled={isUploading || !imageKey}
                                                    onClick={performUpload}
                                                >
                                                    {isUploading ? "Uploading..." : "Save Asset"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}