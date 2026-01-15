'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { findConnections, GraphConnection } from '@/engine/graphAnalysis';
import { Storylet, QualityDefinition, MarketDefinition } from '@/engine/models';

interface Props {
    storyId: string;
    currentItemId: string | null;
}

export default function ConnectivitySidebar({ storyId, currentItemId }: Props) {
    const router = useRouter();
    const [storylets, setStorylets] = useState<Record<string, Storylet>>({});
    const [qualities, setQualities] = useState<Record<string, QualityDefinition>>({});
    const [markets, setMarkets] = useState<Record<string, MarketDefinition>>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [connections, setConnections] = useState<GraphConnection[]>([]);
    const [expanded, setExpanded] = useState<Set<string>>(new Set(['inbound', 'outbound', 'requirements']));
    const [targetType, setTargetType] = useState<'storylet' | 'quality' | 'market' | null>(null);
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                const [sRes, qRes, mRes] = await Promise.all([
                    fetch(`/api/admin/storylets?storyId=${storyId}&full=true`),
                    fetch(`/api/admin/qualities?storyId=${storyId}`),
                    fetch(`/api/admin/markets?storyId=${storyId}`)
                ]);

                const sData = sRes.ok ? await sRes.json() : [];
                const qData = qRes.ok ? await qRes.json() : [];
                const mData = mRes.ok ? await mRes.json() : [];

                if (!isMounted) return;

                const sMap: Record<string, Storylet> = {};
                if (Array.isArray(sData)) sData.forEach((s: any) => sMap[s.id] = s);

                const qMap: Record<string, QualityDefinition> = {};
                if (Array.isArray(qData)) qData.forEach((q: any) => qMap[q.id] = q);
                else if (typeof qData === 'object') Object.values(qData).forEach((q: any) => qMap[q.id] = q);

                const mMap: Record<string, MarketDefinition> = {};
                if (Array.isArray(mData)) mData.forEach((m: any) => mMap[m.id] = m);

                setStorylets(sMap);
                setQualities(qMap);
                setMarkets(mMap);
                setIsLoaded(true);
            } catch (e) {
                console.error("Connectivity Sidebar Fetch Error:", e);
            }
        };

        if (storyId) fetchData();

        return () => { isMounted = false; };
    }, [storyId]);
    useEffect(() => {
        if (!currentItemId || !isLoaded) {
            setConnections([]);
            setTargetType(null);
            return;
        }

        if (qualities[currentItemId]) setTargetType('quality');
        else if (markets[currentItemId]) setTargetType('market');
        else setTargetType('storylet');

        const results = findConnections(currentItemId, storylets, qualities, markets);
        setConnections(results);

    }, [currentItemId, isLoaded, storylets, qualities, markets]);
    const grouped = useMemo(() => {
        const groups = {
            inbound: [] as GraphConnection[],     
            outboundMod: [] as GraphConnection[], 
            outboundReq: [] as GraphConnection[]  
        };
        
        connections.forEach(c => {
            if (c.direction === 'inbound') {
                groups.inbound.push(c);
            } else {
                const r = c.reason.toLowerCase();
                if (r.includes('modifies') || r.includes('redirect') || r.includes('sets')) {
                    groups.outboundMod.push(c);
                } 
                else {
                    groups.outboundReq.push(c);
                }
            }
        });

        const sorter = (a: GraphConnection, b: GraphConnection) => 
            a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
            
        groups.inbound.sort(sorter);
        groups.outboundMod.sort(sorter);
        groups.outboundReq.sort(sorter);

        return groups;
    }, [connections]);
    const lookup = useMemo(() => ({ ...storylets, ...qualities, ...markets }), [storylets, qualities, markets]);
    const getHeaders = () => {
        if (targetType === 'quality') {
            return {
                inbound: "Modified By (Providers)",
                inboundSub: "Connections that change this quality",
                outboundMod: "Refers To",
                outboundModSub: "Dependencies",
                outboundReq: "Used By (Logic)",
                outboundReqSub: "Connections checking this quality"
            };
        }
        return {
            inbound: "Linked From",
            inboundSub: "Incoming redirects, item uses & sources",
            outboundMod: "Leads To & Modifies",
            outboundModSub: "Outgoing links & quality changes",
            outboundReq: "Requires & Checks",
            outboundReqSub: "Logic gates & text references"
        };
    };

    const headers = getHeaders();

    const handleNavigate = (item: GraphConnection) => {
        let path = '';
        switch(item.type) {
            case 'storylet': path = 'storylets'; break;
            case 'opportunity': path = 'opportunities'; break;
            case 'quality': path = 'qualities'; break;
            case 'market': path = 'markets'; break;
        }
        if (path) router.push(`/create/${storyId}/${path}?id=${item.id}`);
    };

    const toggleGroup = (key: string) => {
        const next = new Set(expanded);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        setExpanded(next);
    };

    if (!currentItemId) return null;
    const isQuality = targetType === 'quality';

    return (
        <aside style={{ 
            width: '280px', 
            minWidth: '280px',
            borderLeft: '1px solid var(--tool-border)', 
            background: 'var(--tool-bg-sidebar)', 
            display: 'flex', 
            flexDirection: 'column',
            color: 'var(--tool-text-main)',
            height: '100%'
        }}>
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
                Connections
            </div>
            <div style={{ 
                padding: '0.75rem', 
                borderBottom: '1px solid var(--tool-border)',
                background: 'var(--bg-panel)',
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                fontSize: '0.7rem',
                color: 'var(--text-secondary)'
            }}>
                <LegendItem type="storylet" label="Storylet" />
                <LegendItem type="opportunity" label="Card" />
                <LegendItem type="quality" label="Quality" />
                <LegendItem type="market" label="Market" />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                {!isLoaded ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--tool-text-dim)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                        Scanning World...
                    </div>
                ) : (
                    <>
                        {isQuality ? (
                            <>
                                <Group 
                                    title={headers.inbound}
                                    subtitle={headers.inboundSub}
                                    items={grouped.inbound} 
                                    isOpen={expanded.has('inbound')}
                                    onToggle={() => toggleGroup('inbound')}
                                    onNav={handleNavigate}
                                    lookup={lookup}
                                />
                                <div style={{ height: 1, background: 'var(--tool-border)', margin: '10px 0', opacity: 0.5 }} />
                                <Group 
                                    title={headers.outboundReq}
                                    subtitle={headers.outboundReqSub}
                                    items={grouped.outboundReq} 
                                    isOpen={expanded.has('requirements')}
                                    onToggle={() => toggleGroup('requirements')}
                                    onNav={handleNavigate}
                                    lookup={lookup}
                                />
                            </>
                        ) : (
                            <>
                                <Group 
                                    title={headers.inbound}
                                    subtitle={headers.inboundSub}
                                    items={grouped.inbound} 
                                    isOpen={expanded.has('inbound')}
                                    onToggle={() => toggleGroup('inbound')}
                                    onNav={handleNavigate}
                                    lookup={lookup}
                                />
                                
                                <div style={{ height: 1, background: 'var(--tool-border)', margin: '10px 0', opacity: 0.5 }} />
                                
                                <Group 
                                    title={headers.outboundReq}
                                    subtitle={headers.outboundReqSub}
                                    items={grouped.outboundReq} 
                                    isOpen={expanded.has('requirements')}
                                    onToggle={() => toggleGroup('requirements')}
                                    onNav={handleNavigate}
                                    lookup={lookup}
                                />
                                
                                <div style={{ height: 1, background: 'var(--tool-border)', margin: '10px 0', opacity: 0.5 }} />

                                <Group 
                                    title={headers.outboundMod}
                                    subtitle={headers.outboundModSub}
                                    items={grouped.outboundMod} 
                                    isOpen={expanded.has('outbound')}
                                    onToggle={() => toggleGroup('outbound')}
                                    onNav={handleNavigate}
                                    lookup={lookup}
                                />
                            </>
                        )}
                    </>
                )}
            </div>
        </aside>
    );
}

function LegendItem({ type, label }: { type: string, label: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TypeIcon type={type} />
            <span>{label}</span>
        </div>
    );
}

function Group({ title, subtitle, items, isOpen, onToggle, onNav, lookup }: any) {
    if (items.length === 0) {
        return (
             <div style={{ padding: '0.5rem', opacity: 0.6 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px', color: 'var(--tool-text-dim)' }}>
                    {title}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>None</div>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '1rem' }}>
            <div 
                onClick={onToggle}
                style={{ 
                    padding: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-item)',
                    borderRadius: 'var(--border-radius)',
                    marginBottom: '6px'
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--tool-text-dim)' }}>
                        {title} ({items.length})
                    </span>
                    {isOpen && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</span>}
                </div>
                <span style={{ fontSize: '10px', color: 'var(--tool-text-dim)' }}>{isOpen ? '▼' : '▶'}</span>
            </div>

            {isOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '4px' }}>
                    {items.map((item: GraphConnection) => {
                        const entity = lookup[item.id] || {};
                        let primary = item.id;
                        let secondary = null;

                        if (item.type === 'storylet' || item.type === 'opportunity') {
                            if (entity.name) {
                                primary = entity.name;
                                secondary = item.id;
                            }
                        } else if (item.type === 'quality') {
                            if (entity.editor_name) {
                                primary = entity.editor_name;
                                secondary = item.id;
                            } else {
                                primary = item.id;
                                if (entity.name && entity.name !== item.id) {
                                    secondary = `"${entity.name}"`;
                                }
                            }
                        } else {
                             if (entity.name && entity.name !== item.id) {
                                 primary = entity.name;
                                 secondary = item.id;
                             }
                        }
                        if (primary === secondary) secondary = null;

                        return (
                            <div 
                                key={item.id}
                                onClick={() => onNav(item)}
                                className="nexus-item"
                                style={{ 
                                    padding: '8px', 
                                    borderRadius: 'var(--border-radius)',
                                    cursor: 'pointer',
                                    border: '1px solid transparent',
                                    background: 'var(--bg-panel)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                                    <TypeIcon type={item.type} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ 
                                            fontWeight: 600, 
                                            fontSize: '0.85rem', 
                                            color: 'var(--tool-text-main)',
                                            lineHeight: '1.2'
                                        }}>
                                            {primary}
                                        </div>
                                        {secondary && (
                                            <div style={{ 
                                                fontSize: '0.7rem', 
                                                color: 'var(--tool-text-dim)', 
                                                fontFamily: 'monospace',
                                                marginTop: '2px',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {secondary}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div style={{ 
                                    fontSize: '0.75rem', 
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    paddingLeft: '28px' 
                                }}>
                                    <span style={{ color: 'var(--accent-highlight)' }}>{item.reason}</span>
                                    {item.context && <span style={{ fontSize: '0.7rem', opacity: 0.7, fontStyle: 'italic' }}>{item.context}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <style jsx>{`
                .nexus-item {
                    transition: all 0.2s ease;
                    border: 1px solid var(--border-color);
                }
                .nexus-item:hover {
                    background: var(--bg-item-hover) !important;
                    border-color: var(--tool-accent);
                    transform: translateX(2px);
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
            `}</style>
        </div>
    );
}

function TypeIcon({ type }: { type: string }) {
    let char = '?';
    let bgVar = '--tool-text-dim';
    if (type === 'storylet') { char = 'S'; bgVar = '--docs-accent-blue'; }
    else if (type === 'opportunity') { char = 'O'; bgVar = '--warning-color'; }
    else if (type === 'quality') { char = 'Q'; bgVar = '--success-color'; }
    else if (type === 'market') { char = 'M'; bgVar = '--tool-accent-mauve'; }

    return (
        <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            background: `var(${bgVar})`,
            color: '#111', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: '900',
            flexShrink: 0,
            marginTop: '2px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
        }}>
            {char}
        </div>
    );
}