'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { findConnections, GraphConnection } from '@/engine/graphAnalysis';
import { Storylet, QualityDefinition } from '@/engine/models';

interface Props {
    storyId: string;
    currentItemId: string | null;
}

export default function ConnectivitySidebar({ storyId, currentItemId }: Props) {
    const router = useRouter();
    
    // --- Data State ---
    const [storylets, setStorylets] = useState<Record<string, Storylet>>({});
    const [qualities, setQualities] = useState<Record<string, QualityDefinition>>({});
    const [isLoaded, setIsLoaded] = useState(false);
    
    // --- UI State ---
    const [connections, setConnections] = useState<GraphConnection[]>([]);
    const [expanded, setExpanded] = useState<Set<string>>(new Set(['inbound', 'outbound']));

    // 1. Fetch World Data (Once on Mount)
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                // Determine if we need to fetch. 
                // In a real app, this should probably come from a Context/Store to avoid refetching.
                const [sRes, qRes] = await Promise.all([
                    fetch(`/api/admin/storylets?storyId=${storyId}&full=true`),
                    fetch(`/api/admin/qualities?storyId=${storyId}`)
                ]);

                const sData = await sRes.json();
                const qData = await qRes.json();

                if (!isMounted) return;

                const sMap: Record<string, Storylet> = {};
                if (Array.isArray(sData)) sData.forEach((s: any) => sMap[s.id] = s);

                const qMap: Record<string, QualityDefinition> = {};
                if (Array.isArray(qData)) qData.forEach((q: any) => qMap[q.id] = q);
                else if (typeof qData === 'object') Object.values(qData).forEach((q: any) => qMap[q.id] = q);

                setStorylets(sMap);
                setQualities(qMap);
                setIsLoaded(true);
            } catch (e) {
                console.error("Connectivity Sidebar Fetch Error:", e);
            }
        };

        if (storyId) fetchData();

        return () => { isMounted = false; };
    }, [storyId]);

    // 2. Calculate Connections (Local "Graph" Logic)
    useEffect(() => {
        if (!currentItemId || !isLoaded) {
            setConnections([]);
            return;
        }

        // Run the imported logic from graphAnalysis
        const results = findConnections(currentItemId, storylets, qualities);
        setConnections(results);

    }, [currentItemId, isLoaded, storylets, qualities]);

    // 3. Grouping Logic
    const grouped = useMemo(() => {
        const groups = {
            inbound: [] as GraphConnection[],
            outbound: [] as GraphConnection[]
        };
        
        connections.forEach(c => {
            if (c.direction === 'inbound') groups.inbound.push(c);
            else groups.outbound.push(c);
        });

        // Sort by Type then Name
        const sorter = (a: GraphConnection, b: GraphConnection) => 
            a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
            
        groups.inbound.sort(sorter);
        groups.outbound.sort(sorter);

        return groups;
    }, [connections]);

    const handleNavigate = (item: GraphConnection) => {
        let path = '';
        switch(item.type) {
            case 'storylet': path = 'storylets'; break;
            case 'opportunity': path = 'opportunities'; break;
            case 'quality': path = 'qualities'; break;
        }
        router.push(`/create/${storyId}/${path}?id=${item.id}`);
    };

    const toggleGroup = (key: string) => {
        const next = new Set(expanded);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        setExpanded(next);
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
            color: 'var(--tool-text-main)'
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
                Nexus Connections
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                {!isLoaded ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--tool-text-dim)', fontStyle: 'italic' }}>
                        Loading World Data...
                    </div>
                ) : (
                    <>
                        <Group 
                            title="Providers (modify the quality)" 
                            items={grouped.outbound} 
                            isOpen={expanded.has('outbound')}
                            onToggle={() => toggleGroup('outbound')}
                            onNav={handleNavigate}
                        />
                        <div style={{ height: 1, background: 'var(--tool-border)', margin: '10px 0' }} />
                        <Group 
                            title="Consumers (use the quality)" 
                            items={grouped.inbound} 
                            isOpen={expanded.has('inbound')}
                            onToggle={() => toggleGroup('inbound')}
                            onNav={handleNavigate}
                        />
                    </>
                )}
            </div>
        </aside>
    );
}

function Group({ title, items, isOpen, onToggle, onNav }: any) {
    if (items.length === 0) {
        return (
             <div style={{ padding: '0.5rem', opacity: 0.5 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>{title}</div>
                <div style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>None</div>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '1rem' }}>
            <div 
                onClick={onToggle}
                style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 'bold', 
                    textTransform: 'uppercase', 
                    color: 'var(--tool-text-dim)', 
                    padding: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '4px'
                }}
            >
                <span>{title} ({items.length})</span>
                <span>{isOpen ? '▼' : '▶'}</span>
            </div>

            {isOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    {items.map((item: GraphConnection) => (
                        <div 
                            key={item.id}
                            onClick={() => onNav(item)}
                            className="nexus-card"
                            style={{ 
                                padding: '6px 8px', 
                                borderRadius: '4px',
                                cursor: 'pointer',
                                borderLeft: `3px solid ${getTypeColor(item.type)}`
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ 
                                    fontWeight: 500, 
                                    fontSize: '0.85rem', 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap' 
                                }}>
                                    {item.name}
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: '2px', color: 'var(--tool-text-dim)' }}>
                                <span>{item.reason}</span>
                                <span style={{ opacity: 0.7 }}>{item.context}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <style jsx>{`
                .nexus-card {
                    background: var(--bg-item);
                    border: 1px solid transparent;
                    transition: all 0.2s ease;
                }
                .nexus-card:hover {
                    background: var(--bg-item-hover);
                    transform: translateX(2px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
            `}</style>
        </div>
    );
}

function getTypeColor(type: string) {
    switch (type) {
        case 'storylet': return 'var(--docs-accent-blue, #61afef)';
        case 'opportunity': return 'var(--warning-color, #e5c07b)';
        case 'quality': return 'var(--success-color, #98c379)';
        default: return '#5c6370';
    }
}