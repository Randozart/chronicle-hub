'use client';

import { useState, useRef, useEffect } from 'react';
import { ImageCategory } from '@/engine/models';

interface Props {
    storyId: string;
    onUploadComplete: (newImage: any) => void;
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
        // e.g. "My Cool_Photo.png" -> "my_cool_photo"
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
            ctx.strokeRect(maskX, maskY, maskW, maskH);
        }
        ctx.stroke();

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

    // 4. Upload Logic
    const handleUpload = async () => {
        if (!originalImage) return;
        
        // Validate Key
        if (!imageKey.trim()) {
            setError("Please enter a valid Asset ID.");
            return;
        }

        setIsUploading(true);
        setError('');

        const outputCanvas = document.createElement('canvas');
        const ratio = ASPECT_RATIOS[category] || 1;
        const outputWidth = OUTPUT_WIDTHS[category] || 1024; 
        const outputHeight = outputWidth / ratio;

        outputCanvas.width = outputWidth;
        outputCanvas.height = outputHeight;

        const ctx = outputCanvas.getContext('2d');
        if (!ctx) return;

        // Mapping logic
        const previewCanvasSize = 400;
        let maskW = previewCanvasSize - 40;
        let maskH = maskW / ratio;
        if (maskH > previewCanvasSize - 40) {
            maskH = previewCanvasSize - 40;
            maskW = maskH * ratio;
        }

        const outputScale = outputWidth / maskW;

        ctx.translate(outputWidth / 2, outputHeight / 2);
        ctx.translate(pan.x * outputScale, pan.y * outputScale);
        ctx.scale(scale * outputScale, scale * outputScale);
        ctx.imageSmoothingEnabled = scale > 2;
        ctx.drawImage(originalImage, -originalImage.width / 2, -originalImage.height / 2);

        outputCanvas.toBlob(async (blob) => {
            if (!blob) return;

            const formData = new FormData();
            
            // Use the USER DEFINED key as the filename. 
            // The server uses this filename to generate the ID.
            const finalFileName = `${imageKey}.png`;
            
            formData.append('file', blob, finalFileName);
            formData.append('storyId', storyId);
            formData.append('category', category);
            formData.append('alt', imageKey); // Default alt text to key

            try {
                const res = await fetch('/api/admin/assets/upload', {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                if (res.ok) {
                    onUploadComplete(data.image);
                    setPreviewUrl(null);
                    setOriginalImage(null);
                } else {
                    setError(data.error);
                }
            } catch (e) {
                setError("Network Error");
            } finally {
                setIsUploading(false);
            }
        }, 'image/png');
    };

    return (
        <div style={{ padding: '1rem', background: '#21252b', border: '1px dashed #444', borderRadius: '8px', marginBottom: '1rem' }}>
            <h4 style={{ marginTop: 0, marginBottom: '1rem', color: '#ccc' }}>Asset Composer</h4>
            
            {!previewUrl && (
                <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed #333', borderRadius: '8px', cursor: 'pointer', background: '#181a1f' }} onClick={() => fileInputRef.current?.click()}>
                    <span style={{color: '#61afef', fontWeight: 'bold'}}>+ Select Image</span>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{display: 'none'}} />
                </div>
            )}

            {previewUrl && (
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    
                    {/* LEFT: CANVAS */}
                    <div 
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        style={{ 
                            width: '400px', height: '400px', 
                            border: '2px solid #444', 
                            cursor: isDragging ? 'grabbing' : 'grab',
                            overflow: 'hidden',
                            position: 'relative',
                            background: '#000'
                        }}
                    >
                        <canvas ref={canvasRef} />
                        <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.7)', color: '#aaa', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', pointerEvents: 'none' }}>
                            Drag to Pan
                        </div>
                    </div>

                    {/* RIGHT: CONTROLS */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* NEW: ID INPUT */}
                        <div>
                            <label className="form-label" style={{color: '#98c379'}}>Asset ID (Unique Key)</label>
                            <input 
                                value={imageKey} 
                                onChange={(e) => setImageKey(e.target.value.replace(/[^a-z0-9_-]/gi, '_').toLowerCase())}
                                className="form-input"
                                placeholder="e.g. iron_sword"
                                style={{ fontFamily: 'monospace', letterSpacing: '1px' }}
                            />
                        </div>

                        <div>
                            <label className="form-label">Asset Type</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value as ImageCategory)} className="form-select">
                                <option value="uncategorized">Generic</option>
                                <option value="icon">Icon (Square)</option>
                                <option value="location">Location (Circle)</option>
                                <option value="storylet">Storylet (Portrait)</option>
                                <option value="banner">Banner (Wide)</option>
                                <option value="background">Background (16:9)</option>
                                <option value="map">Map (4:3)</option>
                            </select>
                        </div>

                        <div>
                            <label className="form-label">Zoom</label>
                            <input 
                                type="range" 
                                min="0.05" 
                                max={maxZoom} 
                                step="0.05" 
                                value={scale} 
                                onChange={(e) => setScale(Number(e.target.value))} 
                                style={{ width: '100%' }} 
                            />
                        </div>

                        <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                             <button onClick={() => setPreviewUrl(null)} className="unequip-btn" style={{ width: 'auto', padding: '0.6rem 1rem' }}>
                                Cancel
                            </button>
                            <button onClick={handleUpload} disabled={isUploading} className="save-btn" style={{ flex: 1, padding: '0.6rem' }}>
                                {isUploading ? 'Processing...' : 'Crop & Save'}
                            </button>
                        </div>
                        {error && <p style={{ color: '#e06c75', fontSize: '0.8rem' }}>{error}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}