'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useToast } from '@/providers/ToastProvider';

interface QualityData {
    _id: number;
    name: string;
    images: string[];
    nature: number;
    category: number;
    variations: { level: number, desc: string }[];
}

interface GeoData {
    _id: { id: number, type: 'Area' | 'Setting' };
    name: string;
    description: string;
    image: string;
}

export default function ReconstructPage({ params }: { params: Promise<{ worldId: string }> }) {
    const { worldId } = use(params);
    const { showToast } = useToast();
    
    const [activeTab, setActiveTab] = useState<'qualities' | 'geography' | 'export'>('qualities');
    const [qualities, setQualities] = useState<QualityData[]>([]);
    const [geography, setGeography] = useState<GeoData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/lazarus/world/${worldId}/reconstruct`)
            .then(r => r.json())
            .then(data => {
                setQualities(data.qualities || []);
                setGeography(data.geography || []);
            })
            .finally(() => setLoading(false));
    }, [worldId]);

    const downloadJSON = (filename: string, data: any) => {
        const json = JSON.stringify(data, null, 4);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Generated ${filename}`, 'success');
    };

    const handleExport = (type: 'Qualities' | 'Areas') => {
        if (type === 'Qualities') {
            // Map internal structure to standard StoryNexus JSON format
            const exportData = qualities.map(q => ({
                Id: q._id,
                Name: q.name,
                Image: q.images,
                Description: q.variations[0]?.desc || "", // Pick most recent desc
                Nature: q.nature,
                Category: q.category,
                // Attempt to reconstruct LevelDescriptionText
                LevelDescriptionText: JSON.stringify(
                    q.variations.reduce((acc: any, v) => {
                        if (v.level > 0 && v.desc) acc[v.level] = v.desc;
                        return acc;
                    }, {})
                )
            }));
            downloadJSON(`${worldId}_Qualities.json`, [exportData]); // Wrapped in array to match SN format
        } else if (type === 'Areas') {
            const areas = geography
                .filter(g => g._id.type === 'Area')
                .map(g => ({
                    Id: g._id.id,
                    Name: g.name,
                    Description: g.description,
                    ImageName: g.image
                }));
            downloadJSON(`${worldId}_Areas.json`, [areas]);
        }
    };

    if (loading) return <div style={{ padding: '2rem', color: '#888' }}>Reconstructing World State...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: '#e5c07b' }}>
                    Reconstruction: <span style={{color:'#fff'}}>{worldId}</span>
                </h2>
                <Link href={`/lazarus/${worldId}`} style={{ color: '#61afef', fontSize: '0.9rem', textDecoration:'none' }}>
                    &larr; Back to Events
                </Link>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <TabButton label="Qualities" id="qualities" active={activeTab} set={setActiveTab} count={qualities.length} />
                <TabButton label="Geography" id="geography" active={activeTab} set={setActiveTab} count={geography.length} />
                <TabButton label="Export" id="export" active={activeTab} set={setActiveTab} />
            </div>

            <div style={{ background: '#21252b', borderRadius: '8px', border: '1px solid #333', overflow: 'hidden', minHeight: '400px' }}>
                {activeTab === 'qualities' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: '#ccc' }}>
                        <thead style={{ background: '#181a1f', color: '#777', textAlign: 'left' }}>
                            <tr>
                                <th style={{ padding: '1rem' }}>ID</th>
                                <th style={{ padding: '1rem' }}>Name</th>
                                <th style={{ padding: '1rem' }}>Type</th>
                                <th style={{ padding: '1rem' }}>Cat.</th>
                                <th style={{ padding: '1rem' }}>Variations</th>
                            </tr>
                        </thead>
                        <tbody>
                              {qualities.map(q => (
                                <tr key={q._id} style={{ borderTop: '1px solid #333' }}>
                                    <td style={{ padding: '0.8rem 1rem', fontFamily: 'monospace', color: '#61afef' }}>{q._id}</td>
                                    
                                    <td style={{ padding: '0.5rem 1rem' }}>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            {q.images && q.images.length > 0 ? (
                                                q.images.filter(Boolean).map((img, i) => (
                                                    <div key={i} title={img} style={{ width: '32px', height: '32px', border: '1px solid #444', borderRadius: '4px', overflow: 'hidden', background: '#000' }}>
                                                        <img 
                                                            src={`https://images.storynexus.failbettergames.com.s3.amazonaws.com/icons/${img}.png`} 
                                                            style={{ width: '100%', height: '100%' }} 
                                                            alt=""
                                                            onError={(e) => e.currentTarget.style.display = 'none'}
                                                        />
                                                    </div>
                                                ))
                                            ) : (
                                                <span style={{ opacity: 0.3 }}>-</span>
                                            )}
                                        </div>
                                    </td>

                                    <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold' }}>{q.name || <span style={{fontStyle:'italic', opacity:0.5}}>Unknown</span>}</td>
                                    <td style={{ padding: '0.8rem 1rem' }}>{q.nature === 1 ? 'Stat' : q.nature === 2 ? 'Item' : '?'}</td>
                                    <td style={{ padding: '0.8rem 1rem' }}>{q.category}</td>
                                    <td style={{ padding: '0.8rem 1rem' }}>{q.variations.length}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {activeTab === 'geography' && (
                    <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                        {geography.map(g => (
                            <div key={`${g._id.type}_${g._id.id}`} style={{ background: '#181a1f', padding: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
                                <div style={{ fontSize: '0.7rem', color: '#e5c07b', textTransform: 'uppercase', marginBottom: '4px' }}>{g._id.type} #{g._id.id}</div>
                                <div style={{ fontWeight: 'bold', color: '#fff' }}>{g.name}</div>
                                <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '5px' }}>{g.image}</div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'export' && (
                    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
                        <h3 style={{ marginTop: 0, color: '#fff' }}>Generate Data Files</h3>
                        <p style={{ color: '#888', maxWidth: '600px' }}>
                            These files attempt to reconstruct the original StoryNexus data structure. They can be used for archival purposes or as a reference for manual recreation.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => handleExport('Qualities')} className="save-btn" style={{ padding: '0.8rem 1.5rem' }}>
                                Download Qualities.json
                            </button>
                            <button onClick={() => handleExport('Areas')} className="save-btn" style={{ padding: '0.8rem 1.5rem' }}>
                                Download Areas.json
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TabButton({ label, id, active, set, count }: any) {
    const isActive = active === id;
    return (
        <button 
            onClick={() => set(id)}
            style={{
                background: isActive ? '#61afef' : 'transparent',
                color: isActive ? '#111' : '#888',
                border: isActive ? '1px solid #61afef' : '1px solid #444',
                padding: '8px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
            }}
        >
            {label} {count !== undefined && <span style={{ opacity: 0.6, fontSize: '0.8em', marginLeft: '5px' }}>{count}</span>}
        </button>
    );
}