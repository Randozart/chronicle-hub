'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CreationFormProps { storyId: string; rules: Record<string, string>; }

export default function CreationForm({ storyId, rules }: CreationFormProps) {
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

    const inputFields = Object.entries(rules).filter(([_, val]) => val === 'string' || val.includes('|'));

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto', background: 'var(--bg-panel)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {inputFields.map(([key, rule]) => {
                const qid = key.replace('$', '');
                const label = qid.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                if (rule.includes('|')) {
                    const options = rule.split('|').map(s => s.trim());
                    return (
                        <div key={qid} style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{label}</label>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {options.map(opt => (
                                    <div 
                                        key={opt} onClick={() => handleChange(qid, opt)}
                                        style={{ 
                                            border: choices[qid] === opt ? '2px solid var(--accent-highlight)' : '1px solid var(--border-color)',
                                            background: choices[qid] === opt ? 'rgba(97, 175, 239, 0.1)' : 'var(--bg-item)',
                                            padding: '1rem', borderRadius: '8px', cursor: 'pointer', flex: 1, textAlign: 'center', minWidth: '100px'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold', color: choices[qid] === opt ? 'var(--text-primary)' : 'var(--text-muted)' }}>{opt}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                }
                return (
                    <div key={qid} style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{label}</label>
                        <input type="text" className="form-input" onChange={(e) => handleChange(qid, e.target.value)} required style={{ width: '100%' }} />
                    </div>
                );
            })}
            
            {error && <p style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</p>}
            
            <button type="submit" disabled={isSubmitting} className="save-btn" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                {isSubmitting ? 'Building World...' : 'Begin Your Journey'}
            </button>
        </form>
    );
}