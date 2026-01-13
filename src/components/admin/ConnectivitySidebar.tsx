'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ConnectionItem {
    id: string;
    name: string;
    type: 'storylet' | 'opportunity' | 'quality';
    reason: string;
}

interface Props {
    storyId: string;
    currentItemId: string | null;
}

export default function ConnectivitySidebar({ storyId, currentItemId }: Props) {
    const [inbound, setInbound] = useState<ConnectionItem[]>([]);
    const [outbound, setOutbound] = useState<ConnectionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!currentItemId) {
            setInbound([]);
            setOutbound([]);
            return;
        }

        // Small debounce to allow DB updates to settle if this triggers on save
        const timer = setTimeout(() => {
            setLoading(true);
            fetch(`/api/admin/world/connections?storyId=${storyId}&id=${currentItemId}`)
                .then(res => res.json())
                .then(data => {
                    setInbound(data.inbound || []);
                    setOutbound(data.outbound || []);
                })
                .catch(err => console.error("Failed to load connections", err))
                .finally(() => setLoading(false));
        }, 150);

        return () => clearTimeout(timer);
    }, [storyId, currentItemId]);

    const handleNavigate = (item: ConnectionItem) => {
        let path = '';
        switch(item.type) {
            case 'storylet': path = 'storylets'; break;
            case 'opportunity': path = 'opportunities'; break;
            case 'quality': path = 'qualities'; break;
        }
        router.push(`/create/${storyId}/${path}?id=${item.id}`);
    };

    if (!currentItemId) return null;

    return (
        <aside style={{ 
            width: '260px', 
            minWidth: '260px',
            borderLeft: '1px solid var(--tool-border)', 
            background: 'var(--tool-bg-sidebar)', 
            display: 'flex', 
            flexDirection: 'column',
            fontSize: '0.85rem',
            color: 'var(--tool-text-main)'
        }}>
            {/* Header */}
            <div style={{ 
                padding: '0.75rem', 
                borderBottom: '1px solid var(--tool-border)', 
                background: 'var(--tool-bg-header)',
                fontWeight: 'bold', 
                color: 'var(--tool-text-header)',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
            }}>
                Nexus Connections
            </div>

            {/* Content Scroller */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {loading ? (
                    <div style={{ color: 'var(--tool-text-dim)', fontStyle: 'italic', textAlign: 'center', marginTop: '1rem' }}>
                        Scanning...
                    </div>
                ) : (
                    <>
                        {/* OUTBOUND (Uses) */}
                        <Section 
                            title="Uses / Requires" 
                            items={outbound} 
                            onNavigate={handleNavigate} 
                            emptyLabel="Depends on nothing." 
                        />
                        
                        <div style={{ height: '1px', background: 'var(--tool-border)', margin: '1rem 0' }} />
                        
                        {/* INBOUND (Used By) */}
                        <Section 
                            title="Used By / Linked From" 
                            items={inbound} 
                            onNavigate={handleNavigate} 
                            emptyLabel="Orphaned entity." 
                        />
                    </>
                )}
            </div>
            
            <style jsx>{`
                .nexus-card {
                    background: var(--bg-item);
                    border: 1px solid var(--border-color);
                    transition: all 0.2s ease;
                }
                .nexus-card:hover {
                    background: var(--bg-item-hover);
                    border-color: var(--tool-accent);
                    transform: translateX(2px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                /* Badge Colors Mapped to Theme Variables */
                .type-badge.S { background-color: var(--docs-accent-blue); color: #fff; }
                .type-badge.O { background-color: var(--warning-color); color: #000; }
                .type-badge.Q { background-color: var(--success-color); color: #000; }
            `}</style>
        </aside>
    );
}

function Section({ title, items, onNavigate, emptyLabel }: any) {
    return (
        <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ 
                margin: '0 0 0.75rem 0', 
                fontSize: '0.7rem', 
                fontWeight: 'bold',
                textTransform: 'uppercase', 
                color: 'var(--tool-text-dim)', 
                letterSpacing: '0.5px' 
            }}>
                {title} ({items.length})
            </h4>
            
            {items.length === 0 ? (
                <div style={{ 
                    color: 'var(--tool-text-dim)', 
                    fontSize: '0.8rem', 
                    padding: '0.5rem', 
                    border: '1px dashed var(--tool-border)',
                    borderRadius: 'var(--border-radius)',
                    textAlign: 'center'
                }}>
                    {emptyLabel}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {items.map((item: ConnectionItem, i: number) => (
                        <div 
                            key={i}
                            onClick={() => onNavigate(item)}
                            className="nexus-card"
                            style={{ 
                                padding: '8px', 
                                borderRadius: 'var(--border-radius)',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TypeIcon type={item.type} />
                                <span style={{ 
                                    fontWeight: 500, 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap',
                                    color: 'var(--tool-text-main)',
                                    flex: 1
                                }}>
                                    {item.name || item.id}
                                </span>
                            </div>
                            <div style={{ 
                                fontSize: '0.7rem', 
                                color: 'var(--tool-accent)', 
                                marginTop: '4px',
                                paddingLeft: '28px',
                                fontFamily: 'monospace'
                            }}>
                                ↳ {item.reason}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TypeIcon({ type }: { type: string }) {
    let char = '?';
    let className = 'U'; // Unknown
    
    if (type === 'storylet') { char = 'S'; className = 'S'; }
    else if (type === 'opportunity') { char = 'O'; className = 'O'; }
    else if (type === 'quality') { char = 'Q'; className = 'Q'; }
    else if (type === 'market') { char = 'M'; className = 'M'; }
    else if (type === 'system') { char = '⚙'; className = 'Sys'; }

    // Inline styles for new types if not in CSS
    const getBg = () => {
        if (className === 'S') return 'var(--docs-accent-blue, #61afef)';
        if (className === 'O') return 'var(--warning-color, #e5c07b)';
        if (className === 'Q') return 'var(--success-color, #98c379)';
        if (className === 'M') return '#c678dd'; // Purple for markets
        if (className === 'Sys') return '#5c6370'; // Grey for system
        return '#333';
    };

    const getColor = () => {
        if (className === 'O') return '#000'; // Dark text on yellow
        if (className === 'Q') return '#000'; // Dark text on green
        return '#fff';
    };

    return (
        <span style={{ 
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '20px', height: '20px', borderRadius: '4px',
            fontSize: '10px', fontWeight: 'bold', flexShrink: 0,
            backgroundColor: getBg(),
            color: getColor()
        }}>
            {char}
        </span>
    );
}