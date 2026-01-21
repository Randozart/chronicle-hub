'use client';

import { useState, useEffect } from 'react';
import { Storylet } from '@/engine/models';
import Link from 'next/link';

interface Props {
    storyId: string;
    locationId: string;
    onCreateHere: () => void;
}

export default function LocationContentTab({ storyId, locationId, onCreateHere }: Props) {
    const [storylets, setStorylets] = useState<Storylet[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        fetch(`/api/admin/storylets?storyId=${storyId}&full=true`)
            .then(res => res.json())
            .then((data: Storylet[]) => {
                const linked = data.filter(s => s.location === locationId);
                setStorylets(linked);
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [storyId, locationId]);

    if (isLoading) return <div className="loading-container">Loading linked content...</div>;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: 'var(--tool-text-header)', fontSize: '1rem' }}>
                    Storylets in {locationId} ({storylets.length})
                </h3>
                <button 
                    onClick={onCreateHere}
                    className="save-btn"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                    + Create Storylet Here
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--tool-border)', borderRadius: '4px', background: 'var(--tool-bg-dark)' }}>
                {storylets.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--tool-text-dim)', fontStyle: 'italic' }}>
                        No storylets are linked to this location yet.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {storylets.map(s => (
                            <Link 
                                key={s.id} 
                                href={`/create/${storyId}/storylets?id=${s.id}`}
                                className="list-item"
                                style={{ 
                                    textDecoration: 'none', 
                                    padding: '0.75rem 1rem',
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span 
                                        style={{
                                            width: '8px', height: '8px', borderRadius: '50%',
                                            backgroundColor: 
                                                s.status === 'published' ? 'var(--success-color)' :
                                                s.status === 'maintenance' ? 'var(--danger-color)' :
                                                '#555'
                                        }}
                                    />
                                    <span className="item-title">{s.name}</span>
                                </div>
                                <span className="item-subtitle" style={{ fontSize: '0.7rem' }}>{s.id}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}