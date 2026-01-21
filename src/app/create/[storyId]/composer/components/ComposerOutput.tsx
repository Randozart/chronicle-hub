'use client';
import { ImageComposition } from '@/engine/models';
import { useMemo } from 'react';

interface Props {
    composition: ImageComposition;
    onExport: () => void;
}

export default function ComposerOutput({ composition, onExport }: Props) {

    const dynamicUrl = useMemo(() => {
        const params = Object.keys(composition.parameters || {}).map(key => {
            return `${key}={$${key}}`;
        }).join('&');
        return `/api/image-composer/render?id=${composition.id}${params ? '&' + params : ''}`;
    }, [composition]);
    
    return (
        <div style={{ padding: '1rem', background: 'var(--tool-bg-header)', borderTop: '1px solid var(--tool-border)' }}>
            <h4 style={{marginTop: 0}}>Output</h4>
            <div className="form-group">
                <label className="form-label">Dynamic ScribeScript URL</label>
                <input readOnly value={dynamicUrl} className="form-input" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
                <p className="special-desc">Use this string as an `image_code` in a storylet or quality.</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="save-btn" onClick={onExport}>Export Current Preview as PNG</button>
            </div>
        </div>
    );
}