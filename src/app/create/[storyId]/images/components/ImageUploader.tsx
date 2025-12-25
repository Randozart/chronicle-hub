'use client';

import { useState, useRef, useEffect } from 'react';
import { ImageCategory } from '@/engine/models';

interface Props {
    storyId: string;
    onUploadComplete: (data: { image: any, usage: number }) => void; // <--- UPDATE TYPE
}


const OUTPUT_WIDTHS: Record<string, number> = {
    'icon': 512,
    'location': 1024,
    'banner': 1920,
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
    'background': 16/9,
    'map': 4/3
};

export default function ImageUploader({ storyId, onUploadComplete }: Props) {
    const [isUploading, setIsUploading] = useState(false);
    const [category, setCategory] = useState<ImageCategory>('uncategorized');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState('');
    
    // NEW: Image Key State
    const [imageKey, setImageKey] = useState("");

    // Crop State
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [maxZoom, setMaxZoom] = useState(5);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

    // 1. Handle File Selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Generate default key from filename
        const cleanName = file.name.split('.')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        setImageKey(cleanName);

        const url = URL.createObjectURL(file);
        const img = new Image();
        
        img.onload = () => {
            setOriginalImage(img);
            setPreviewUrl(url);
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

    // 2. Drawing Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !originalImage) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const CANVAS_SIZE = 400;
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;

        // Background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Image
        ctx.save();
        ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
        ctx.scale(scale, scale);
        ctx.imageSmoothingEnabled = scale > 2; 
        ctx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);
        ctx.restore();

        // Draw Mask
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
        if (category === 'location') {
            ctx.arc(CANVAS_SIZE/2, CANVAS_SIZE/2, maskW/2, 0, Math.PI * 2, true);
        } else {
            ctx.rect(maskX, maskY, maskW, maskH); 
        }
        ctx.fill('evenodd');

        ctx.strokeStyle = '#61afef';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (category === 'location') {
            ctx.arc(CANVAS_SIZE/2, CANVAS_SIZE/2, maskW/2, 0, Math.PI * 2);
        } else {
            ctx.rect(maskX, maskY, maskW, maskH);
        }
        ctx.stroke();

    }, [originalImage, scale, pan, category]);

    // 3. Pan/Zoom Handlers
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

    // 4. Upload Logic
        const handleUpload = async () => {
        if (!originalImage || !canvasRef.current) return;
        setIsUploading(true);
        setError('');

        try {
            canvasRef.current.toBlob(async (blob) => {
                if (!blob) throw new Error("Canvas empty");
                
                const formData = new FormData();
                formData.append('file', blob, `${imageKey}.png`);
                formData.append('storyId', storyId);
                formData.append('category', category);
                formData.append('alt', imageKey);

                const res = await fetch('/api/admin/assets/upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await res.json();
                if (res.ok) {
                    // Pass the whole data object (contains image AND usage)
                    onUploadComplete(data); 
                    setPreviewUrl(null);
                    setOriginalImage(null);
                    setImageKey("");
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
        <div style={{ padding: '1rem', background: '#21252b', borderRadius: '4px', border: '1px solid #333' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#fff' }}>Upload New Asset</h3>
            
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
                <div style={{ display: 'flex', gap: '2rem' }}>
                    
                    {/* LEFT: CONTROLS */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                         <div className="form-group">
                            <label className="form-label">Asset Key (ID)</label>
                            <input 
                                value={imageKey} 
                                onChange={e => setImageKey(e.target.value)} 
                                className="form-input"
                                placeholder="my_image_name"
                            />
                            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                                Used in code: <code>image: "{imageKey}"</code>
                            </p>
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
                        </div>
                        
                        <div style={{ padding: '1rem', background: '#111', borderRadius: '4px' }}>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#aaa' }}>Controls</p>
                            <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', color: '#666' }}>
                                <span>Scroll to Zoom</span>
                                <span>•</span>
                                <span>Drag to Pan</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                            <button onClick={() => setOriginalImage(null)} className="unequip-btn" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={handleUpload} disabled={isUploading || !imageKey} className="save-btn" style={{ flex: 1 }}>
                                {isUploading ? 'Uploading...' : 'Save Asset'}
                            </button>
                        </div>
                        {error && <p style={{ color: 'var(--danger-color)', fontSize: '0.85rem' }}>{error}</p>}
                    </div>

                    {/* RIGHT: CANVAS */}
                    <div>
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
                                boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}