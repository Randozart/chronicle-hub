'use client';
import { useState } from 'react';

export default function ContentSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (query.length < 3) return;
        setIsSearching(true);
        const res = await fetch(`/api/sysadmin/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
        setIsSearching(false);
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#fff' }}>Global Content Search</h3>
                <p style={{ color: '#777', fontSize: '0.9rem' }}>Find specific text across all published Storylets and Opportunities (e.g. for moderation).</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                    <input 
                        className="form-input" 
                        value={query} 
                        onChange={e => setQuery(e.target.value)} 
                        placeholder="Search phrase..." 
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="deck-button" onClick={handleSearch} disabled={isSearching}>
                        {isSearching ? 'Scanning...' : 'Search'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {results.map((r: any) => (
                    <div key={r.id} style={{ background: '#21252b', padding: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
                        <div style={{ color: '#61afef', fontWeight: 'bold' }}>{r.name} <span style={{color: '#555', fontWeight:'normal'}}>({r.id})</span></div>
                        <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px' }}>Found in World: <span style={{color: '#e5c07b'}}>{r.worldId}</span></div>
                    </div>
                ))}
                {results.length === 0 && !isSearching && query && <div style={{ color: '#555' }}>No matches found.</div>}
            </div>
        </div>
    );
}