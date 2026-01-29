'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface EventSummary {
    _id: number; // The EventId
    title: string;
    variationCount: number;
    lastSeen: string;
    isRoot: number; // 1 or 0
}

export default function WorldDataPage({ params }: { params: Promise<{ worldId: string }> }) {
    const { worldId } = use(params);
    const [events, setEvents] = useState<EventSummary[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<'all' | 'root' | 'result'>('all');
    const [pagination, setPagination] = useState({ total: 0, pages: 0 });

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timer);
    }, [page, search, typeFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/lazarus/world/${worldId}?page=${page}&search=${search}&type=${typeFilter}`);
            const data = await res.json();
            if (data.events) {
                setEvents(data.events);
                setPagination(data.pagination);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ color: '#ccc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: '#e5c07b' }}>
                    <span style={{opacity:0.5}}>Archive:</span> {worldId}
                </h2>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link 
                        href={`/lazarus/${worldId}/reconstruct`}
                        style={{ 
                            background: '#98c379', color: '#111', fontWeight: 'bold', 
                            padding: '10px 16px', borderRadius: '4px', textDecoration: 'none',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <span>🛠️</span> Reconstruct Data
                    </Link>

                    <input 
                        className="form-input" 
                        placeholder="Search ID or Title..." 
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        style={{ minWidth: '250px' }}
                    />
                    <select 
                        className="form-select"
                        value={typeFilter}
                        onChange={e => { setTypeFilter(e.target.value as any); setPage(1); }}
                        style={{ width: 'auto' }}
                    >
                        <option value="all">All Events</option>
                        <option value="root">Storylets (Roots)</option>
                        <option value="result">Outcomes (Results)</option>
                    </select>
                </div>
            </div>

            <div style={{ background: '#21252b', borderRadius: '8px', border: '1px solid #333', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ background: '#181a1f', textAlign: 'left', color: '#777' }}>
                            <th style={{ padding: '1rem', width: '100px' }}>ID</th>
                            <th style={{ padding: '1rem' }}>Title</th>
                            <th style={{ padding: '1rem' }}>Type</th>
                            <th style={{ padding: '1rem' }}>Evidence</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>Scanning Archive...</td></tr>
                        ) : events.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>No events found matching criteria.</td></tr>
                        ) : (
                            events.map(evt => (
                                <tr key={evt._id} style={{ borderTop: '1px solid #333' }} className="hover:bg-white/5">
                                    <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#abb2bf' }}>{evt._id}</td>
                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#e5c07b' }}>
                                        {evt.title || <span style={{fontStyle:'italic', opacity:0.5}}>Untitled</span>}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {evt.isRoot ? (
                                            <span style={{ background: 'rgba(97, 175, 239, 0.1)', color: '#61afef', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid rgba(97, 175, 239, 0.3)' }}>STORYLET</span>
                                        ) : (
                                            <span style={{ background: 'rgba(152, 195, 121, 0.1)', color: '#98c379', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid rgba(152, 195, 121, 0.3)' }}>RESULT</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: 'bold' }}>{evt.variationCount}</span>
                                            <span style={{ fontSize: '0.8rem', color: '#555' }}>versions</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <Link 
                                            href={`/lazarus/${worldId}/${evt._id}`}
                                            style={{ 
                                                background: '#333', color: '#ccc', padding: '6px 12px', 
                                                borderRadius: '4px', textDecoration: 'none', fontSize: '0.8rem',
                                                border: '1px solid #444' 
                                            }}
                                        >
                                            Inspect
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
                <button 
                    disabled={page <= 1} 
                    onClick={() => setPage(p => p - 1)}
                    className="save-btn" 
                    style={{ width: 'auto', padding: '0.5rem 1rem', opacity: page <= 1 ? 0.5 : 1 }}
                >
                    Prev
                </button>
                <span style={{ fontSize: '0.9rem', color: '#777' }}>
                    Page {page} of {pagination.pages || 1}
                </span>
                <button 
                    disabled={page >= pagination.pages} 
                    onClick={() => setPage(p => p + 1)}
                    className="save-btn" 
                    style={{ width: 'auto', padding: '0.5rem 1rem', opacity: page >= pagination.pages ? 0.5 : 1 }}
                >
                    Next
                </button>
            </div>
        </div>
    );
}