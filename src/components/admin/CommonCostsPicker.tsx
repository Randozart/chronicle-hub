// src/components/admin/CommonCostsPicker.tsx

'use client';

import { useEffect, useState } from 'react';
import { WorldSettings } from '@/engine/models';

interface Props {
    storyId: string;
    value?: string[];
    onChange: (keys: string[]) => void;
}

/**
 * Checkbox row per world-defined common cost (settings.commonCosts).
 * Checked = this option pays that cost at resolve. Renders nothing when the
 * world defines no common costs. See docs/plans/2026-10-08-common-costs-design.md
 */
export default function CommonCostsPicker({ storyId, value, onChange }: Props) {
    const [costs, setCosts] = useState<WorldSettings['commonCosts']>(undefined);

    useEffect(() => {
        fetch(`/api/admin/settings?storyId=${storyId}`)
            .then(res => res.json())
            .then((settings: WorldSettings) => setCosts(settings.commonCosts || []))
            .catch(() => setCosts([]));
    }, [storyId]);

    if (!costs || costs.length === 0) return null;

    const selected = new Set(value || []);
    const toggle = (key: string) => {
        const next = new Set(selected);
        if (next.has(key)) { next.delete(key); } else { next.add(key); }
        onChange(Array.from(next));
    };

    return (
        <div className="form-group">
            <label className="form-label">Common Costs</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {costs.map(cc => (
                    <label key={cc.key} className="toggle-label" title={cc.effects}>
                        <input
                            type="checkbox"
                            checked={selected.has(cc.key)}
                            onChange={() => toggle(cc.key)}
                        />
                        {cc.label}
                    </label>
                ))}
            </div>
        </div>
    );
}
