'use client';
import { ImageComposition } from '@/engine/models';
import { useMemo } from 'react';

interface Props {
    composition: ImageComposition;
    storyId: string; 
    onExport: () => void;
}

export default function ComposerOutput({ composition, storyId, onExport }: Props) {

    const dynamicUrl = useMemo(() => {
        // Auto-detect groups
        const groups = new Set<string>();
        composition.layers.forEach(l => {
            if (l.groupId) groups.add(l.groupId);
        });

        const params = Array.from(groups).map(key => `${key}={$${key}}`).join('&');
        return `image_composer/render?storyId=${storyId}&id=${composition.id}${params ? '&' + params : ''}`;
    }, [composition]);
    
    return (
        <div style={{ padding: '1rem', background: 'var(--tool-bg-header)', borderTop: '1px solid var(--tool-border)' }}>
            <h4 style={{marginTop: 0, fontSize: '0.9rem'}}>Output</h4>
            <div className="form-group">
                <label className="form-label">ScribeScript URL</label>
                <div style={{display:'flex', gap:'5px'}}>
                    <input readOnly value={dynamicUrl} className="form-input" style={{ fontFamily: 'monospace', fontSize: '0.8rem', flex: 1 }} />
                    <button 
                        className="save-btn" 
                        style={{padding:'4px 8px', width:'auto', fontSize:'0.8rem'}}
                        onClick={() => navigator.clipboard.writeText(dynamicUrl)}
                    >
                        Copy
                    </button>
                </div>
                <p className="special-desc">Auto-generated based on Logic Groups used in layers.</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="option-button" onClick={onExport} style={{width:'100%'}}>📸 Export PNG Snapshot</button>
            </div>
        </div>
    );
}