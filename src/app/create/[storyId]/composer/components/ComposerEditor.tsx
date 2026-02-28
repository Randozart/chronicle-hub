'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ImageComposition, CompositionLayer, GlobalAsset } from '@/engine/models';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import CommandCenter from '@/components/admin/CommandCenter';
import { v4 as uuidv4 } from 'uuid';
import ColorPickerInput from './ColorPickerInput';
import ComposerOutput from './ComposerOutput';
import { resolveCssVariable } from '@/utils/themeUtils';
import AssetExplorer from '@/components/admin/assets/AssetExplorer';


const CANVAS_PRESETS = {
    'Icon': { w: 512, h: 512 },
    'Storylet (Portrait)': { w: 300, h: 400 },
    'Card (Landscape)': { w: 400, h: 300 },
    'Banner': { w: 1024, h: 300 },
    'HD': { w: 1920, h: 1080 }
};

const EyeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOffIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

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
    setAssets: React.Dispatch<React.SetStateAction<GlobalAsset[]>>; 
    onSave: (data: ImageComposition) => void;
    onDelete: () => void;
    onDuplicate?: () => void;
    guardRef: { current: FormGuard | null };
    allThemes: Record<string, Record<string, string>>;
    defaultTheme: string; 
    canImportPsd?: boolean; 
    refreshAssets: () => void; 
}
const imageElementCache = new Map<string, HTMLImageElement>();

export default function ComposerEditor({
    initialData, storyId, assets, setAssets,
    onSave, onDelete, onDuplicate, guardRef, allThemes, defaultTheme, canImportPsd, refreshAssets
}: Props) {
    const { data, handleChange, handleSave, isDirty, isSaving, lastSaved, revertChanges } = useCreatorForm<ImageComposition>(
        initialData,
        '/api/admin/compositions',
        { storyId },
        guardRef,
        undefined,
        onSave
    );
    const [isImporting, setIsImporting] = useState(false);
    const [interactionMode, setInteractionMode] = useState<'edit' | 'focus'>('edit');
    const [previewTheme, setPreviewTheme] = useState(defaultTheme);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const thumbCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [browserTab, setBrowserTab] = useState<'project' | 'presets'>('project');
    const [presets, setPresets] = useState<PresetCategory[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoadingPresets, setIsLoadingPresets] = useState(false);
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [imagesLoaded, setImagesLoaded] = useState(0);
    const [importProgress, setImportProgress] = useState<number | null>(null);
    const [importStatus, setImportStatus] = useState<string>("");
    const [dragState, setDragState] = useState<{
        mode: 'move' | 'resize' | 'rotate';
        startX: number;
        startY: number;
        startLayer: CompositionLayer;
        handle?: string; // 'tl', 'tr', etc.
    } | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileTab, setMobileTab] = useState<'assets' | 'canvas' | 'layers'>('canvas');


    if (!data) return <div className="loading-container">Loading editor...</div>;
    const [viewZoom, setViewZoom] = useState(1);


    const handlePsdImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        
        if (!confirm(`Import "${file.name}"?`)) return;
        setIsImporting(true);
        
        try {
            const uploadId = `${storyId}_${uuidv4()}`;
            const CHUNK_THRESHOLD = 8 * 1024 * 1024; // 8MB

            if (file.size < CHUNK_THRESHOLD) {
                const queryParams = new URLSearchParams({
                    storyId: storyId,
                    compositionId: data.id,
                    uploadId
                });
                const res = await fetch(`/api/admin/compositions/import-psd?${queryParams.toString()}`, {
                    method: 'POST',
                    body: file,
                    headers: { 'Content-Type': 'application/octet-stream' }
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Upload failed");
                handleImportSuccess(result);
            } else {
                const chunkSize = 4 * 1024 * 1024;
                const totalChunks = Math.ceil(file.size / chunkSize);

                for (let i = 0; i < totalChunks; i++) {
                    const start = i * chunkSize;
                    const end = Math.min(file.size, start + chunkSize);
                    const chunk = file.slice(start, end);
                    
                    // Update Progress
                    const percent = Math.round((i / totalChunks) * 100);
                    setImportProgress(percent);
                    setImportStatus(`Uploading ${percent}%`);

                    const res = await fetch(`/api/admin/compositions/import-psd?step=upload&uploadId=${uploadId}&chunkIndex=${i}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/octet-stream' },
                        body: chunk
                    });
                    if (!res.ok) throw new Error(`Chunk ${i} failed`);
                }
                
                setImportProgress(100);
                setImportStatus("Processing layers...");

                // Proceed to finish
                const res = await fetch(`/api/admin/compositions/import-psd?step=finish&uploadId=${uploadId}&storyId=${storyId}&compositionId=${data.id}`, {
                    method: 'POST'
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Processing failed");
                handleImportSuccess(result);
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsImporting(false);
            e.target.value = '';
        }
    };

    const handleImportSuccess = (result: any) => {
        // Update Layers
        const currentMaxZ = data.layers.length > 0 ? Math.max(...data.layers.map(l => l.zIndex)) : -1;
        const adjustedNewLayers = result.layers.map((l: CompositionLayer, idx: number) => ({
            ...l,
            zIndex: currentMaxZ + 1 + idx
        }));
        handleChange('layers', [...data.layers, ...adjustedNewLayers]);

        if (result.newAssets) {
            setAssets((prev: GlobalAsset[]) => {
                const existingIds = new Set(prev.map(a => a.id));
                const uniqueNew = result.newAssets.filter((a: GlobalAsset) => !existingIds.has(a.id));
                return [...prev, ...uniqueNew];
            });
        }

        if (result.width > data.width || result.height > data.height) {
            if(confirm("Resize canvas to match PSD?")) {
                handleChange('width', result.width);
                handleChange('height', result.height);
            }
        }
    };


    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault(); 
                e.stopPropagation();
                
                const delta = -e.deltaY * 0.001;
                setViewZoom(z => Math.min(Math.max(0.1, z + delta), 5));
            }
        };

        container.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', onWheel);
        };
    }, []);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const moveLayer = (index: number, direction: -1 | 1) => {
        // Sort Descending (High Z to Low Z) to match UI list
        const sorted = [...data.layers].sort((a, b) => b.zIndex - a.zIndex);
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= sorted.length) return;
        
        const currentLayer = sorted[index];
        const swapLayer = sorted[targetIndex];
        
        // Swap Z-Indices
        const tempZ = currentLayer.zIndex;
        currentLayer.zIndex = swapLayer.zIndex;
        swapLayer.zIndex = tempZ;
        
        // Update state
        handleChange('layers', [...data.layers]);
    };

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
    
    // Shared renderer for both Main and Thumbnail canvases
    const renderScene = (
        ctx: CanvasRenderingContext2D, 
        w: number, 
        h: number, 
        drawBg: boolean,
        transformFn?: (ctx: CanvasRenderingContext2D) => void
    ) => {
        ctx.clearRect(0, 0, w, h);

        // Background
        if (drawBg) {
            if (data.backgroundColor) {
                // Use previewTheme
                const resolvedBg = resolveCssVariable(data.backgroundColor, previewTheme, allThemes);
                ctx.fillStyle = resolvedBg;
                ctx.fillRect(0, 0, w, h);
            } else {
                const s = 20;
                for(let i=0; i<w/s; i++) {
                    for(let j=0; j<h/s; j++) {
                        ctx.fillStyle = (i+j)%2 === 0 ? '#1a1a1a' : '#222';
                        ctx.fillRect(i*s, j*s, s, s);
                    }
                }
            }
        }

        ctx.save();
        if (transformFn) transformFn(ctx);

        const sortedLayers = [...data.layers].sort((a, b) => a.zIndex - b.zIndex);

        sortedLayers.forEach(layer => {
            if (layer.editorHidden) return; 
            let url = "";
            if (layer.assetId.startsWith('presets/')) url = `/${layer.assetId}`;
            else {
                const asset = assets.find(a => a.id === layer.assetId);
                url = asset ? asset.url || "" : `/images/uploads/${layer.assetId}.png`;
            }
            if (!url) return;

            // Get Image
            let finalImageToDraw: HTMLImageElement | HTMLCanvasElement | null = null;
            if (imageElementCache.has(url)) {
                const img = imageElementCache.get(url)!;
                if (img.complete) {
                    const offscreenCanvas = document.createElement('canvas');
                    offscreenCanvas.width = img.width;
                    offscreenCanvas.height = img.height;
                    const offCtx = offscreenCanvas.getContext('2d');
                    if (offCtx) {
                        offCtx.drawImage(img, 0, 0);
                        const isSvg = layer.assetId.toLowerCase().endsWith('.svg');
                        if (isSvg && layer.tintColor) {
                            const resolvedTint = resolveCssVariable(layer.tintColor, previewTheme, allThemes);
                            offCtx.globalCompositeOperation = 'source-in';
                            offCtx.fillStyle = resolvedTint;
                            offCtx.fillRect(0, 0, img.width, img.height);
                        }
                        finalImageToDraw = offscreenCanvas;
                    } else {
                        finalImageToDraw = img; 
                    }
                }
            } else {
                const img = new Image();
                img.onload = () => setImagesLoaded(c => c + 1);
                img.src = url;
                imageElementCache.set(url, img);
                return; 
            }

            if (!finalImageToDraw) return;
            
            const effects = [];
            
            let strokeStyle = null;
            if (layer.effects?.stroke?.enabled) {
                const st = layer.effects.stroke;
                const sColor = resolveCssVariable(st.color, previewTheme, allThemes);
                strokeStyle = `drop-shadow(${st.width}px 0px 0px ${sColor}) 
                               drop-shadow(-${st.width}px 0px 0px ${sColor}) 
                               drop-shadow(0px ${st.width}px 0px ${sColor}) 
                               drop-shadow(0px -${st.width}px 0px ${sColor})`;
            }

            // Glow
            if (layer.effects?.glow?.enabled) {
                const g = layer.effects.glow;
                const color = resolveCssVariable(g.color, previewTheme, allThemes);
                // Simulate glow using 0-offset drop-shadow
                effects.push(`drop-shadow(0px 0px ${g.blur}px ${color})`);
            }

            // Shadow
            if (layer.effects?.shadow?.enabled) {
                const s = layer.effects.shadow;
                const color = resolveCssVariable(s.color, previewTheme, allThemes);
                effects.push(`drop-shadow(${s.x}px ${s.y}px ${s.blur}px ${color})`);
            }
            // Draw Layer
            ctx.save();
            ctx.globalAlpha = layer.opacity;

            if (layer.blendMode && layer.blendMode !== 'over') {
                 // Map Sharp modes to Canvas modes where possible
                 // Canvas: source-over, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion
                 ctx.globalCompositeOperation = layer.blendMode;
            }
            
            ctx.translate(layer.x + (finalImageToDraw.width * layer.scale)/2, layer.y + (finalImageToDraw.height * layer.scale)/2);
            ctx.rotate((layer.rotation * Math.PI) / 180);
            
            if (strokeStyle) {
                ctx.save();
                ctx.filter = strokeStyle;
                ctx.globalCompositeOperation = 'source-over';
                if (finalImageToDraw.width > 0 && finalImageToDraw.height > 0) {
                    ctx.drawImage(
                        finalImageToDraw, 
                        -(finalImageToDraw.width * layer.scale)/2, 
                        -(finalImageToDraw.height * layer.scale)/2, 
                        finalImageToDraw.width * layer.scale, 
                        finalImageToDraw.height * layer.scale
                    );
                }
                ctx.restore();
            }
            
            // Draw Effects (Shadow/Glow)
            if (effects.length > 0) {
                ctx.filter = effects.join(' ');
            }

            // Draw Main Image
            ctx.drawImage(
                finalImageToDraw, 
                -(finalImageToDraw.width * layer.scale)/2, 
                -(finalImageToDraw.height * layer.scale)/2, 
                finalImageToDraw.width * layer.scale, 
                finalImageToDraw.height * layer.scale
            );
            ctx.restore();
        });
        
        ctx.restore(); // Restore transformFn
    };

    const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
        return new Promise((resolve, reject) => {
            if (imageElementCache.has(url)) {
                const cachedImg = imageElementCache.get(url)!;
                if (cachedImg.complete) {
                    resolve({ width: cachedImg.width, height: cachedImg.height });
                    return;
                }
            }
            
            const img = new Image();
            img.onload = () => {
                imageElementCache.set(url, img);
                resolve({ width: img.width, height: img.height });
            };
            img.onerror = () => reject(new Error(`Could not load image: ${url}`));
            img.src = url;
        });
    };

    const addLayer = async (assetId: string, name: string, isPreset: boolean) => {
        const url = isPreset ? `/${assetId}` : (assets.find(a => a.id === assetId)?.url || '');
        if (!url) {
            console.error("Asset URL not found for", assetId);
            return; 
        }

        try {
            const { width, height } = await getImageDimensions(url);
            
            const newLayer: CompositionLayer = {
                id: uuidv4(),
                assetId: assetId,
                name: name,
                zIndex: data.layers.length,
                x: (data.width / 2) - (width / 2),
                y: (data.height / 2) - (height / 2),
                scale: 1,
                rotation: 0,
                opacity: 1,
                enableThemeColor: isPreset 
            };

            handleChange('layers', [...data.layers, newLayer]);
            setSelectedLayerId(newLayer.id);
        } catch (error) {
            console.error(error);
        }
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

    const BlendModeSelect = ({ value, onChange, label }: { value: string, onChange: (v: string) => void, label?: string }) => (
        <div style={{flex:1}}>
            {label && <label className="form-label" style={{margin:0}}>{label}</label>}
            <select value={value || 'over'} onChange={e => onChange(e.target.value)} className="form-select" style={{padding:'2px', fontSize:'0.8rem'}}>
                <option value="over">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="darken">Darken</option>
                <option value="lighten">Lighten</option>
                <option value="color-dodge">Color Dodge</option>
                <option value="hard-light">Hard Light</option>
                <option value="difference">Difference</option>
            </select>
        </div>
    );

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
    
    // Main Canvas Render
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !canvas.getContext('2d')) return;
        const ctx = canvas.getContext('2d')!;

        // Render Scene
        renderScene(ctx, canvas.width, canvas.height, true);

        // Render Selection Overlay
        if (selectedLayer) {
            const layer = selectedLayer;
            // Re-resolve image for selection box dimensions
            let w = 100, h = 100;
            const url = layer.assetId.startsWith('presets/') 
                ? `/${layer.assetId}` 
                : (assets.find(a => a.id === layer.assetId)?.url || `/images/uploads/${layer.assetId}.png`);
            
            const img = imageElementCache.get(url);
            if (img && img.complete) { w = img.width; h = img.height; }

            // Draw Box
            ctx.save();
            ctx.translate(layer.x + (w*layer.scale)/2, layer.y + (h*layer.scale)/2);
            ctx.rotate((layer.rotation * Math.PI) / 180);
            
            const hw = (w * layer.scale) / 2;
            const hh = (h * layer.scale) / 2;
            
            ctx.strokeStyle = '#61afef';
            ctx.lineWidth = 2 / viewZoom;
            ctx.strokeRect(-hw, -hh, w*layer.scale, h*layer.scale);

            // Draw Handles
            const handleSize = 8 / viewZoom;
            ctx.fillStyle = '#fff';
            const corners = [{x: -hw, y: -hh}, {x: hw, y: -hh}, {x: -hw, y: hh}, {x: hw, y: hh}];
            corners.forEach(c => {
                ctx.fillRect(c.x - handleSize/2, c.y - handleSize/2, handleSize, handleSize);
                ctx.strokeRect(c.x - handleSize/2, c.y - handleSize/2, handleSize, handleSize);
            });
            // Rotate Handle
            ctx.beginPath();
            ctx.moveTo(0, -hh);
            ctx.lineTo(0, -hh - (20/viewZoom));
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, -hh - (20/viewZoom), 5/viewZoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }

        // Focal Point Overlay
        if (data.focus && interactionMode === 'focus') {
            const fx = (data.focus.x / 100) * data.width;
            const fy = (data.focus.y / 100) * data.height;
            ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 50, 50, 0.8)'; ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(fx-10, fy); ctx.lineTo(fx+10, fy); ctx.moveTo(fx, fy-10); ctx.lineTo(fx, fy+10); ctx.stroke();
        }

    }, [data, selectedLayerId, assets, imagesLoaded, allThemes, viewZoom, previewTheme]);
    
    // Thumbnail Canvas Render
    useEffect(() => {
        const canvas = thumbCanvasRef.current;
        if (!canvas || !canvas.getContext('2d')) return;
        const ctx = canvas.getContext('2d')!;

        const zoom = data.thumbZoom || 1;
        const focusX = (data.focus?.x || 50) / 100 * data.width;
        const focusY = (data.focus?.y || 50) / 100 * data.height;

        renderScene(ctx, data.width, data.height, true, (context) => {
            // Apply Thumbnail Crop Logic
            // 1. Move focus point to center of canvas
            context.translate(data.width / 2, data.height / 2);
            // 2. Scale
            context.scale(zoom, zoom);
            // 3. Move back relative to focus point
            context.translate(-focusX, -focusY);
        });
        
    }, [data, assets, imagesLoaded, allThemes, previewTheme]);

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();

        const rect = canvasRef.current!.getBoundingClientRect();
        
        // Handle 0 dimensions to avoid division by zero
        if (rect.width === 0 || rect.height === 0) return;

        const scaleX = data.width / rect.width;
        const scaleY = data.height / rect.height;

        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;
        
        if (interactionMode === 'focus') {
            const xPct = Math.round((mx / data.width) * 100);
            const yPct = Math.round((my / data.height) * 100);
            handleChange('focus', { x: xPct, y: yPct });
            
            // Visual feedback handled by canvas render loop below
            setInteractionMode('edit'); // Switch back to edit mode automatically
            return;
        }

        // 1. Check handles on selected layer first
        if (selectedLayerId) {
            const layer = data.layers.find(l => l.id === selectedLayerId);
            if (layer) {
                const img = getCachedImage(layer); 
                if (img) {
                    const local = toLocalSpace(mx, my, layer, img.width, img.height);
                    const handle = hitTestHandles(local.x, local.y, img.width, img.height, layer.scale);
                    
                    if (handle) {
                        setDragState({
                            mode: handle === 'rot' ? 'rotate' : 'resize',
                            startX: mx,
                            startY: my,
                            startLayer: { ...layer },
                            handle
                        });
                        return;
                    }
                }
            }
        }

        // 2. Check for body hits (Reverse order: Top layers catch clicks first)
        const sortedReverse = [...data.layers].sort((a, b) => b.zIndex - a.zIndex);
        for (const layer of sortedReverse) {
            if (layer.editorHidden) continue;
            const img = getCachedImage(layer);
            if (!img) continue;

            const local = toLocalSpace(mx, my, layer, img.width, img.height);
            // Hit test body
            if (hitTestBody(local.x, local.y, img.width, img.height, layer.scale)) {
                setSelectedLayerId(layer.id);
                setDragState({
                    mode: 'move',
                    startX: mx,
                    startY: my,
                    startLayer: { ...layer }
                });
                return;
            }
        }

        // 3. Clicked empty space
        setSelectedLayerId(null);
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (!dragState || !selectedLayerId) return;
        const rect = canvasRef.current!.getBoundingClientRect();
                
        const scaleX = data.width / rect.width;
        const scaleY = data.height / rect.height;

        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        const { startX, startY, startLayer, mode, handle } = dragState;
        const dx = mx - startX;
        const dy = my - startY;

        if (mode === 'move') {
            updateLayer(selectedLayerId, {
                x: Math.round(startLayer.x + dx),
                y: Math.round(startLayer.y + dy)
            });
        } 
        else if (mode === 'resize') {
            // Sensitivity factor for scaling
            const sensitivity = 0.005;
            // If dragging bottom/right, growing is positive delta. 
            // If dragging top/left, growing is negative delta.
            const direction = (handle === 'br' || handle === 'tr') ? 1 : -1;
            const delta = dx * direction; 
            
            const newScale = Math.max(0.1, startLayer.scale + (delta * sensitivity));
            updateLayer(selectedLayerId, { scale: parseFloat(newScale.toFixed(3)) });
        }
        else if (mode === 'rotate') {
            const img = getCachedImage(startLayer)!;
            // Pivot point
            const cx = startLayer.x + (img.width * startLayer.scale)/2;
            const cy = startLayer.y + (img.height * startLayer.scale)/2;
            
            const startAngle = Math.atan2(startY - cy, startX - cx);
            const currentAngle = Math.atan2(my - cy, mx - cx);
            
            const degDelta = (currentAngle - startAngle) * (180 / Math.PI);
            updateLayer(selectedLayerId, { rotation: Math.round(startLayer.rotation + degDelta) });
        }
    };

    const handleCanvasMouseUp = () => {
        setDragState(null);
    };

    // Helper to get image safely from cache
    const getCachedImage = (layer: CompositionLayer) => {
        let url = "";
        if (layer.assetId.startsWith('presets/')) {
            url = `/${layer.assetId}`;
        } else {
            const asset = assets.find(a => a.id === layer.assetId);
            // Use path from /images/uploads/ to /uploads/ 
            url = asset ? asset.url || "" : `/uploads/misc/${layer.assetId}.webp`;
        }
        
        if (!url) return null;
        const img = imageElementCache.get(url);
        return (img && img.complete) ? img : null;
    };

    const selectedLayer = data.layers.find(l => l.id === selectedLayerId);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            
            {/* Import Progress Overlay */}
            {importProgress !== null && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '300px', background: '#333', borderRadius: '4px', overflow: 'hidden', height: '10px', marginBottom: '10px' }}>
                        <div style={{ width: `${importProgress}%`, background: 'var(--success-color)', height: '100%', transition: 'width 0.2s' }}/>
                    </div>
                    <span style={{ color: '#fff' }}>{importStatus}</span>
                </div>
            )}

            {isMobile ? (
                /* ── Mobile header: name + zoom only ── */
                <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--tool-border)', background: 'var(--tool-bg-header)', display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                    <input
                        value={data.name}
                        onChange={e => handleChange('name', e.target.value)}
                        className="form-input"
                        style={{ fontWeight: 'bold', flex: 1, background: 'transparent', border: 'none', borderBottom: '1px dashed #555', minWidth: 0 }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--tool-text-dim)', whiteSpace: 'nowrap' }}>
                        {(viewZoom * 100).toFixed(0)}%
                    </span>
                    <button onClick={() => setViewZoom(1)} style={{ fontSize: '0.7rem', cursor: 'pointer', background: 'var(--tool-bg-input)', border: '1px solid var(--tool-border)', padding: '3px 8px', borderRadius: '4px', color: 'var(--tool-text-main)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        Reset Zoom
                    </button>
                </div>
            ) : (
                /* ── Desktop header: full controls ── */
                <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--tool-border)', background: 'var(--tool-bg-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                        <input
                            value={data.name}
                            onChange={e => handleChange('name', e.target.value)}
                            className="form-input"
                            style={{ fontWeight:'bold', fontSize:'1rem', background:'transparent', border:'none', borderBottom:'1px dashed #555', width:'200px' }}
                        />
                        <span style={{fontSize:'0.8rem', color:'var(--tool-text-dim)'}}>{data.id}</span>
                    </div>
                    {canImportPsd && (
                        <div style={{ display: 'flex', alignItems: 'center', marginRight: '20px' }}>
                            <label
                                className="save-btn"
                                style={{ cursor: isImporting ? 'wait' : 'pointer', background: isImporting ? '#444' : 'var(--success-color)', color: '#fff', padding: '4px 10px', fontSize: '0.8rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                {isImporting ? 'Parsing PSD...' : '⬆ Import PSD'}
                                <input type="file" accept=".psd,.psb" onChange={handlePsdImport} disabled={isImporting} style={{ display: 'none' }} />
                            </label>
                        </div>
                    )}
                    <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                        <select className="form-select" style={{width:'auto', padding:'2px 8px'}} onChange={(e) => { const dims = CANVAS_PRESETS[e.target.value as keyof typeof CANVAS_PRESETS]; if(dims) { handleChange('width', dims.w); handleChange('height', dims.h); } }} defaultValue="">
                            <option value="" disabled>Resize Canvas...</option>
                            {Object.keys(CANVAS_PRESETS).map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                        <label className="form-label" style={{marginBottom:0}}>W:</label>
                        <input type="number" value={data.width} onChange={e => handleChange('width', parseInt(e.target.value))} className="form-input" style={{width: 60}} />
                        <label className="form-label" style={{marginBottom:0}}>H:</label>
                        <input type="number" value={data.height} onChange={e => handleChange('height', parseInt(e.target.value))} className="form-input" style={{width: 60}} />
                        <div style={{width: '1px', height: '20px', background: 'var(--tool-border)', margin: '0 5px'}}></div>
                        <button
                            onClick={() => setInteractionMode(interactionMode === 'edit' ? 'focus' : 'edit')}
                            style={{ fontSize:'0.75rem', padding:'4px 8px', borderRadius:'4px', cursor:'pointer', background: interactionMode === 'focus' ? 'var(--tool-accent)' : 'var(--tool-bg-input)', color: interactionMode === 'focus' ? '#000' : 'var(--tool-text-main)', border: '1px solid var(--tool-border)', fontWeight: 'bold' }}
                            title="Click to set the focal point (center) of the composition"
                        >
                            {interactionMode === 'focus' ? '◎ Set Focus' : '◎ Focus'}
                        </button>
                        <div style={{width: '1px', height: '20px', background: 'var(--tool-border)', margin: '0 5px'}}></div>
                        <select value={previewTheme} onChange={(e) => setPreviewTheme(e.target.value)} className="form-select" style={{ width: 'auto', padding: '2px 8px', fontSize: '0.8rem', maxWidth: '120px' }} title="Preview Theme Context">
                            {Object.keys(allThemes).map(key => {
                                let label = key;
                                if (key === ':root') label = 'Default';
                                if (key.includes('data-theme=')) label = key.match(/'([^']+)'/)?.[1] || key;
                                if (key.includes('data-global-theme=')) label = key.match(/'([^']+)'/)?.[1] || key;
                                return <option key={key} value={label.toLowerCase() === 'default' ? 'default' : label}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>
                            })}
                        </select>
                        <label className="form-label" style={{marginBottom:0}}>Bg:</label>
                        <div style={{flex: 1, minWidth:'120px'}}>
                            <ColorPickerInput value={data.backgroundColor || ''} onChange={c => handleChange('backgroundColor', c)} allThemes={allThemes} />
                        </div>
                        <div style={{width: '1px', height: '20px', background: 'var(--tool-border)', margin: '0 5px'}}></div>
                        <div className="form-label" style={{ marginBottom:0, minWidth: '80px', textAlign:'right', cursor:'help' }} title="Hold Ctrl + Scroll on the CANVAS to Zoom">
                            Zoom: {(viewZoom * 100).toFixed(0)}%
                        </div>
                        <button onClick={() => setViewZoom(1)} style={{fontSize:'0.7rem', cursor:'pointer', background:'var(--tool-bg-input)', border:'1px solid var(--tool-border)', padding:'2px 5px', borderRadius:'4px', color:'var(--tool-text-main)'}}>Reset</button>
                    </div>
                </div>
            )}

            {/* Mobile tab bar */}
            {isMobile && (
                <div style={{ display: 'flex', borderBottom: '1px solid var(--tool-border)', background: 'var(--tool-bg-header)', flexShrink: 0 }}>
                    {(['assets', 'canvas', 'layers'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setMobileTab(tab)}
                            style={{
                                flex: 1, padding: '0.65rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem',
                                background: mobileTab === tab ? 'var(--tool-bg-input)' : 'transparent',
                                color: mobileTab === tab ? 'var(--tool-text-main)' : 'var(--tool-text-dim)',
                                border: 'none',
                                borderBottom: mobileTab === tab ? '2px solid var(--tool-accent)' : '2px solid transparent',
                                textTransform: 'capitalize'
                            }}
                        >
                            {tab === 'assets' ? 'Assets' : tab === 'canvas' ? 'Canvas' : 'Layers'}
                        </button>
                    ))}
                </div>
            )}

            <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden', minHeight: 0 }}>

                {/* Left: Asset Browser */}
                <div style={isMobile ? { display: mobileTab === 'assets' ? 'flex' : 'none', flex: 1, minHeight: 0, flexDirection: 'column', background: 'var(--tool-bg-sidebar)', overflow: 'hidden' } : { width: '500px', minWidth: '300px', borderRight: '1px solid var(--tool-border)', display: 'flex', flexDirection: 'column', background: 'var(--tool-bg-sidebar)' }}>
                    
                    {/* Browser Tabs */}
                    <div style={{ display:'flex', borderBottom:'1px solid var(--tool-border)', flexShrink: 0 }}>
                        <button 
                            onClick={() => setBrowserTab('project')}
                            style={{ flex:1, padding:'0.6rem', background: browserTab === 'project' ? 'var(--tool-bg-input)' : 'transparent', borderBottom: browserTab === 'project' ? '2px solid var(--tool-accent)' : 'none', color: browserTab === 'project' ? 'var(--tool-text-main)' : 'var(--tool-text-dim)', cursor:'pointer', fontWeight:'bold', fontSize:'0.8rem' }}
                        >
                            Project Files
                        </button>
                        <button 
                            onClick={() => setBrowserTab('presets')}
                            style={{ flex:1, padding:'0.6rem', background: browserTab === 'presets' ? 'var(--tool-bg-input)' : 'transparent', borderBottom: browserTab === 'presets' ? '2px solid var(--tool-accent)' : 'none', color: browserTab === 'presets' ? 'var(--tool-text-main)' : 'var(--tool-text-dim)', cursor:'pointer', fontWeight:'bold', fontSize:'0.8rem' }}
                        >
                            Presets
                        </button>
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {browserTab === 'project' ? (
                            <AssetExplorer 
                                assets={assets} 
                                onSelect={(asset) => addLayer(asset.id, asset.id, false)}
                                onRefresh={refreshAssets}
                                storyId={storyId}
                                mode="picker"
                                className="border-0 rounded-none h-full"
                                style={{ border: 'none', background: 'transparent' }}
                            />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
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

                    <div
                        ref={containerRef}
                        onMouseDown={() => setSelectedLayerId(null)}
                        style={isMobile ? { display: mobileTab === 'canvas' ? 'flex' : 'none', flex: 1, minHeight: 0, background: '#0a0a0a', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '1rem' } : { flex: 1, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '2rem', minWidth: 0 }}
                    >                    
                    <div style={{ 
                        width: data.width * viewZoom, 
                        height: data.height * viewZoom,
                        boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                        background: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iIzIyMiIgZD0iTTAgMGgxMHYxMEgwem0xMCAxMGgxMHYxMEgxMHoiLz48L3N2Zz4=") repeat',
                        flexShrink: 0,
                        transition: 'width 0.1s, height 0.1s'
                    }}>
                        <canvas 
                            ref={canvasRef}
                            width={data.width}
                            height={data.height}
                            style={{ width: '100%', height: '100%', cursor: dragState ? 'grabbing' : 'auto', imageRendering: 'pixelated' }}
                            onMouseDown={handleCanvasMouseDown}
                            onMouseMove={handleCanvasMouseMove}
                            onMouseUp={handleCanvasMouseUp}
                            onMouseLeave={handleCanvasMouseUp}
                        />
                    </div>
                </div>

                <div style={isMobile ? { display: mobileTab === 'layers' ? 'flex' : 'none', flex: 1, minHeight: 0, flexDirection: 'column', background: 'var(--tool-bg-sidebar)', overflow: 'hidden' } : { width: '320px', minWidth: '320px', borderLeft: '1px solid var(--tool-border)', display: 'flex', flexDirection: 'column', background: 'var(--tool-bg-sidebar)' }}>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--tool-border)', minHeight: '200px' }}>
                        <div style={{ padding: '0.5rem', fontWeight:'bold', borderBottom:'1px solid var(--tool-border)', background:'var(--tool-bg-header)', flexShrink: 0 }}>Layers</div>
                        {/* In the render block for Layer List */}
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            {/* Group logic: We render flat list but check if header needs to be drawn */}
                            {[...data.layers].sort((a,b) => b.zIndex - a.zIndex).reduce((acc, layer, idx, arr) => {
                                // Simple logic: If it has a group, render it. 
                                return acc.concat(
                                    <div 
                                        key={layer.id}
                                        onClick={() => setSelectedLayerId(layer.id)}
                                        style={{ 
                                            padding: '0.5rem', 
                                            borderBottom: '1px solid var(--tool-border)',
                                            background: selectedLayerId === layer.id ? 'var(--tool-accent)' : 'transparent',
                                            color: selectedLayerId === layer.id ? '#000' : 'var(--tool-text-main)',
                                            cursor: 'pointer',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            opacity: layer.editorHidden ? 0.5 : 1
                                        }}
                                    >
                                        <div style={{display:'flex', gap:'5px', alignItems:'center', overflow:'hidden'}}>
                                            <div style={{ display:'flex', flexDirection:'column', gap:'1px', marginRight:'2px' }}>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); moveLayer(idx, -1); }} 
                                                    disabled={idx === 0}
                                                    style={{ fontSize:'0.5rem', lineHeight:1, cursor:'pointer', border:'none', background:'none', color:'inherit', opacity: idx === 0 ? 0.2 : 1 }}
                                                >▲</button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); moveLayer(idx, 1); }} 
                                                    disabled={idx === data.layers.length - 1}
                                                    style={{ fontSize:'0.5rem', lineHeight:1, cursor:'pointer', border:'none', background:'none', color:'inherit', opacity: idx === data.layers.length - 1 ? 0.2 : 1 }}
                                                >▼</button>
                                            </div>                                            
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { editorHidden: !layer.editorHidden }); }}
                                                style={{ border:'none', background:'none', cursor:'pointer', color: 'inherit', padding: '0 4px', display:'flex', alignItems:'center' }}
                                                title={layer.editorHidden ? "Show Layer" : "Hide Layer"}
                                            >
                                                {layer.editorHidden ? <EyeOffIcon /> : <EyeIcon />}
                                            </button>
                                            {layer.groupId && <span style={{fontSize:'0.6rem', border:'1px solid currentColor', padding:'0 2px', borderRadius:'2px'}}>{layer.groupId}</span>}
                                            <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{layer.name}</span>
                                        </div>
                                    </div>
                                );
                            }, [] as React.ReactNode[])}
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
                                        <input 
                                            className="form-input" 
                                            placeholder="e.g. hair_style" 
                                            value={selectedLayer.groupId || ''} 
                                            onChange={e => updateLayer(selectedLayer.id, { groupId: e.target.value })} 
                                        />
                                        <p className="special-desc">
                                            Assigns this layer to a variable. Layers sharing this ID are toggled together.
                                        </p>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Variant Value</label>
                                        <input 
                                            className="form-input" 
                                            placeholder="e.g. long_braid" 
                                            value={selectedLayer.variantValue || ''} 
                                            onChange={e => updateLayer(selectedLayer.id, { variantValue: e.target.value })} 
                                        />
                                        <p className="special-desc">
                                            This layer appears when the Group Variable matches this value. 
                                            (Multiple layers can share the same value to create complex composite states).
                                        </p>
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
                                <div className="form-group">
                                    <BlendModeSelect 
                                        label="Layer Blend Mode" 
                                        value={selectedLayer.blendMode as any} 
                                        onChange={v => updateLayer(selectedLayer.id, { blendMode: v as any })} 
                                    />
                                </div>
                                <hr style={{ borderColor: 'var(--tool-border)' }} />
                                
                                {/* Drop Shadow Controls */}
                                <div style={{ marginBottom: '10px' }}>
                                    <label className="toggle-label" style={{ fontWeight:'bold', marginBottom:'5px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedLayer.effects?.shadow?.enabled || false} 
                                            onChange={e => {
                                                const current = selectedLayer.effects || {};
                                                const shadow = { 
                                                    color: '#000000', blur: 10, x: 5, y: 5, ...current.shadow, 
                                                    enabled: e.target.checked 
                                                };
                                                updateLayer(selectedLayer.id, { effects: { ...current, shadow } });
                                            }} 
                                        />
                                        Drop Shadow
                                    </label>
                                    
                                    {selectedLayer.effects?.shadow?.enabled && (
                                        <div style={{ paddingLeft: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                                                <label className="form-label" style={{width:'30px', margin:0}}>Col:</label>
                                                <div style={{flex:1}}>
                                                    <ColorPickerInput 
                                                        value={selectedLayer.effects.shadow.color} 
                                                        onChange={c => updateLayer(selectedLayer.id, { effects: { ...selectedLayer.effects, shadow: { ...selectedLayer.effects!.shadow!, color: c } } })} 
                                                        allThemes={allThemes}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{display:'flex', gap:'5px'}}>
                                                <div style={{flex:1}}><label className="form-label" style={{margin:0}}>Blur</label><input type="number" className="form-input" value={selectedLayer.effects.shadow.blur} onChange={e => updateLayer(selectedLayer.id, { effects: { ...selectedLayer.effects, shadow: { ...selectedLayer.effects!.shadow!, blur: parseInt(e.target.value) } } })} /></div>
                                                <div style={{flex:1}}><label className="form-label" style={{margin:0}}>X</label><input type="number" className="form-input" value={selectedLayer.effects.shadow.x} onChange={e => updateLayer(selectedLayer.id, { effects: { ...selectedLayer.effects, shadow: { ...selectedLayer.effects!.shadow!, x: parseInt(e.target.value) } } })} /></div>
                                                <div style={{flex:1}}><label className="form-label" style={{margin:0}}>Y</label><input type="number" className="form-input" value={selectedLayer.effects.shadow.y} onChange={e => updateLayer(selectedLayer.id, { effects: { ...selectedLayer.effects, shadow: { ...selectedLayer.effects!.shadow!, y: parseInt(e.target.value) } } })} /></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Glow Controls */}
                                <div>
                                    <label className="toggle-label" style={{ fontWeight:'bold', marginBottom:'5px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedLayer.effects?.glow?.enabled || false} 
                                            onChange={e => {
                                                const current = selectedLayer.effects || {};
                                                const glow = { 
                                                    color: 'var(--accent-highlight)', blur: 10, ...current.glow, 
                                                    enabled: e.target.checked 
                                                };
                                                updateLayer(selectedLayer.id, { effects: { ...current, glow } });
                                            }} 
                                        />
                                        Glow
                                    </label>
                                    
                                    {selectedLayer.effects?.glow?.enabled && (
                                        <div style={{ paddingLeft: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                                                <label className="form-label" style={{width:'30px', margin:0}}>Col:</label>
                                                <div style={{flex:1}}>
                                                    <ColorPickerInput 
                                                        value={selectedLayer.effects.glow.color} 
                                                        onChange={c => updateLayer(selectedLayer.id, { effects: { ...selectedLayer.effects, glow: { ...selectedLayer.effects!.glow!, color: c } } })} 
                                                        allThemes={allThemes}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="form-label" style={{margin:0}}>Blur Radius</label>
                                                <input type="range" min="1" max="50" style={{width:'100%', accentColor:'var(--tool-accent)'}} value={selectedLayer.effects.glow.blur} onChange={e => updateLayer(selectedLayer.id, { effects: { ...selectedLayer.effects, glow: { ...selectedLayer.effects!.glow!, blur: parseInt(e.target.value) } } })} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Stroke Controls */}
                                <div>
                                    <label className="toggle-label" style={{ fontWeight:'bold', marginBottom:'5px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedLayer.effects?.stroke?.enabled || false} 
                                            onChange={e => {
                                                const current = selectedLayer.effects || {};
                                                const stroke = { 
                                                    color: '#ffffff', width: 2, opacity: 1, ...current.stroke, 
                                                    enabled: e.target.checked 
                                                };
                                                updateLayer(selectedLayer.id, { effects: { ...current, stroke } });
                                            }} 
                                        />
                                        Outline / Stroke
                                    </label>
                                    
                                    {selectedLayer.effects?.stroke?.enabled && (
                                        <div style={{ paddingLeft: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                                                <label className="form-label" style={{width:'30px', margin:0}}>Col:</label>
                                                <div style={{flex:1}}>
                                                    <ColorPickerInput 
                                                        value={selectedLayer.effects.stroke.color} 
                                                        onChange={c => updateLayer(selectedLayer.id, { effects: { ...selectedLayer.effects, stroke: { ...selectedLayer.effects!.stroke!, color: c } } })} 
                                                        allThemes={allThemes}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="form-label" style={{margin:0}}>Width</label>
                                                <input type="range" min="1" max="20" style={{width:'100%', accentColor:'var(--tool-accent)'}} value={selectedLayer.effects.stroke.width} onChange={e => updateLayer(selectedLayer.id, { effects: { ...selectedLayer.effects, stroke: { ...selectedLayer.effects!.stroke!, width: parseInt(e.target.value) } } })} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>
                            
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ margin: 0, color: 'var(--tool-accent)' }}>Composition Settings</h4>
                            
                            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', textAlign: 'center' }}>
                                <label className="form-label" style={{marginBottom:'0.5rem'}}>Icon Preview</label>
                                <div style={{ 
                                    width: '120px', height: '120px', margin: '0 auto', 
                                    borderRadius: '50%', border: '2px solid var(--tool-accent)', 
                                    overflow: 'hidden', background: '#000', position: 'relative' 
                                }}>
                                    <canvas 
                                        ref={thumbCanvasRef} 
                                        width={data.width} 
                                        height={data.height}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <p className="special-desc" style={{marginTop:'0.5rem'}}>
                                    Preview of how this looks when used as a circle icon.
                                </p>
                            </div>

                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                <label className="form-label" style={{display:'flex', justifyContent:'space-between'}}>
                                    <span>Thumbnail Zoom</span>
                                    <span>{(data.thumbZoom || 1).toFixed(1)}x</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="1" max="5" step="0.1"
                                    value={data.thumbZoom || 1} 
                                    onChange={e => handleChange('thumbZoom', parseFloat(e.target.value))}
                                    style={{ width: '100%', accentColor: 'var(--tool-accent)', margin: '5px 0' }}
                                />
                                <p className="special-desc">
                                    Zooms in on the Focal Point for small icons.
                                </p>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Focal Point</label>
                                <div style={{display:'flex', gap:'10px'}}>
                                    <input className="form-input" disabled value={data.focus ? `${data.focus.x}%` : '50%'} title="X" />
                                    <input className="form-input" disabled value={data.focus ? `${data.focus.y}%` : '50%'} title="Y" />
                                </div>
                                <button 
                                    onClick={() => handleChange('focus', {x:50, y:50})}
                                    style={{marginTop:'5px', fontSize:'0.7rem', cursor:'pointer', border:'none', background:'none', color:'var(--danger-color)'}}
                                >
                                    Reset to Center
                                </button>
                            </div>
                        </div>
                        )}
                    </div>
                </div>
            </div>

            <ComposerOutput 
                composition={data}
                storyId={storyId} 
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
                onDuplicate={onDuplicate}
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

// Transform a point from Canvas Space to Layer Local Space
function toLocalSpace(px: number, py: number, layer: CompositionLayer, imgW: number, imgH: number) {
    // Translate to center relative
    const dx = px - (layer.x + (imgW * layer.scale) / 2);
    const dy = py - (layer.y + (imgH * layer.scale) / 2);
    
    // Rotate inverse
    const rad = -layer.rotation * (Math.PI / 180);
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

    return { x: lx, y: ly };
}

// Check if a point in Local Space hits the layer body
function hitTestBody(lx: number, ly: number, imgW: number, imgH: number, scale: number) {
    const halfW = (imgW * scale) / 2;
    const halfH = (imgH * scale) / 2;
    return lx >= -halfW && lx <= halfW && ly >= -halfH && ly <= halfH;
}

// Check handles (returns 'tl', 'tr', 'bl', 'br', 'rot' or null)
function hitTestHandles(lx: number, ly: number, imgW: number, imgH: number, scale: number) {
    const halfW = (imgW * scale) / 2;
    const halfH = (imgH * scale) / 2;
    const handleSize = 10 / scale; // Constant visual size logic

    // Rotate Handle (placed above top center)
    const rotY = -halfH - (20 / scale);
    if (Math.abs(lx) <= handleSize && Math.abs(ly - rotY) <= handleSize) return 'rot';

    // Corners
    if (Math.abs(lx - -halfW) <= handleSize && Math.abs(ly - -halfH) <= handleSize) return 'tl';
    if (Math.abs(lx - halfW) <= handleSize && Math.abs(ly - -halfH) <= handleSize) return 'tr';
    if (Math.abs(lx - -halfW) <= handleSize && Math.abs(ly - halfH) <= handleSize) return 'bl';
    if (Math.abs(lx - halfW) <= handleSize && Math.abs(ly - halfH) <= handleSize) return 'br';

    return null;
}