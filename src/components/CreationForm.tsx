'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageDefinition } from '@/engine/models';
import GameImage from '@/components/GameImage'; // <--- Import your image component

interface CreationFormProps { 
    storyId: string; 
    rules: Record<string, string>;
    imageLibrary: Record<string, ImageDefinition>; // <--- New Prop
}

export default function CreationForm({ storyId, rules, imageLibrary }: CreationFormProps) {
    const router = useRouter();
    const [choices, setChoices] = useState<Record<string, string>>({});
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (qid: string, value: string) => setChoices(prev => ({ ...prev, [qid]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const res = await fetch('/api/character/create', { method: 'POST', body: JSON.stringify({ storyId, choices }) });
        if (res.ok) router.push(`/play/${storyId}`);
        else { setError('Creation failed'); setIsSubmitting(false); }
    };

    // Filter out the system keys if you want, or keep them.
    const inputFields = Object.entries(rules).filter(([_, val]) => val === 'string' || val.includes('|'));

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-panel)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            
            {inputFields.map(([key, rule]) => {
                const qid = key.replace('$', '');
                const label = qid.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                // CASE A: MULTIPLE CHOICE (A | B | C)
                if (rule.includes('|')) {
                    const options = rule.split('|').map(s => s.trim());
                    
                    // Check if these options are images (by checking if the first option exists in library)
                    // This heuristic assumes if one is an image, they all are.
                    const isImageSelector = options.some(opt => imageLibrary[opt]);

                    return (
                        <div key={qid} style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '1.1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                                {label}
                            </label>
                            
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: isImageSelector ? 'repeat(auto-fill, minmax(120px, 1fr))' : 'repeat(auto-fill, minmax(150px, 1fr))', 
                                gap: '1rem' 
                            }}>
                                {options.map(opt => {
                                    const isSelected = choices[qid] === opt;
                                    const hasImage = !!imageLibrary[opt];

                                    return (
                                        <div 
                                            key={opt} 
                                            onClick={() => handleChange(qid, opt)}
                                            style={{ 
                                                border: isSelected ? '2px solid var(--accent-highlight)' : '1px solid var(--border-color)',
                                                background: isSelected ? 'rgba(97, 175, 239, 0.1)' : 'var(--bg-item)',
                                                borderRadius: '8px', 
                                                cursor: 'pointer', 
                                                textAlign: 'center',
                                                overflow: 'hidden',
                                                transition: 'transform 0.2s',
                                                transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                                            }}
                                        >
                                            {hasImage ? (
                                                // IMAGE OPTION
                                                <div style={{ padding: '0.5rem' }}>
                                                    <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                                                        <GameImage 
                                                            code={opt} 
                                                            imageLibrary={imageLibrary} 
                                                            type="icon" // or 'portrait' if you want 
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                                                        {/* Optional: Hide text if it's just an ID? For now show it. */}
                                                        {opt.replace(/_/g, ' ')}
                                                    </div>
                                                </div>
                                            ) : (
                                                // TEXT OPTION
                                                <div style={{ padding: '1rem', fontWeight: 'bold', color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                    {opt}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }

                // CASE B: TEXT INPUT
                return (
                    <div key={qid} style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{label}</label>
                        <input 
                            type="text" 
                            className="form-input" 
                            onChange={(e) => handleChange(qid, e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '0.8rem' }} 
                        />
                    </div>
                );
            })}
            
            {error && <p style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</p>}
            
            <button type="submit" disabled={isSubmitting} className="save-btn" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}>
                {isSubmitting ? 'Building World...' : 'Begin Your Journey'}
            </button>
        </form>
    );
}