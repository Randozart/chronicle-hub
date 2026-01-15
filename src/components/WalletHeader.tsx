'use client';

import { PlayerQualities, QualityDefinition, WorldSettings, ImageDefinition } from "@/engine/models";
import GameImage from "./GameImage";

interface Props {
    qualities: PlayerQualities;
    qualityDefs: Record<string, QualityDefinition>;
    settings: WorldSettings;
    imageLibrary: Record<string, ImageDefinition>;
}

export default function WalletHeader({ qualities, qualityDefs, settings, imageLibrary }: Props) {
    const currencyIds = settings.currencyQualities || [];

    if (currencyIds.length === 0) return null;

    return (
        <div className="wallet-container" style={{ 
            display: 'flex', 
            gap: '1.5rem', 
            padding: '0.75rem 1.5rem', 
            background: 'var(--bg-panel)', 
            borderBottom: '1px solid var(--border-color)',
            alignItems: 'center',
            flexWrap: 'wrap'
        }}>
            {currencyIds.map(rawId => {
                const qid = rawId.replace('$', '').trim();
                const def = qualityDefs[qid];
                const state = qualities[qid];
                if (!def) return null;

                const val = state ? (state.type === 'S' ? state.stringValue : state.level) : 0;

                return (
                    <div key={qid} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} title={def.description}>
                        <div style={{ width: '24px', height: '24px', flexShrink: 0 }}>
                            <GameImage 
                                code={def.image || def.id} 
                                imageLibrary={imageLibrary} 
                                type="icon" 
                                className="option-image"
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--accent-highlight)' }}>
                                {val}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                {def.name}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}