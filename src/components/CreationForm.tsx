'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CreationFormProps {
    storyId: string;
    rules: Record<string, string>;
}

export default function CreationForm({ storyId, rules }: CreationFormProps) {
    const router = useRouter();
    const [choices, setChoices] = useState<Record<string, string>>({});
    const [error, setError] = useState('');

    const handleChange = (qid: string, value: string) => {
        setChoices(prev => ({ ...prev, [qid]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/character/create', {
            method: 'POST',
            body: JSON.stringify({ storyId, choices }),
        });
        if (res.ok) router.push('/');
        else setError('Creation failed');
    };

    // Filter rules to only show inputs for 'string' or choices '|'
    // We skip calculations (things with '$') and static numbers
    const inputFields = Object.entries(rules).filter(([_, val]) => 
        val === 'string' || val.includes('|')
    );

    return (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 space-y-4">
            {inputFields.map(([key, rule]) => {
                const qid = key.replace('$', '');
                const label = qid.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                if (rule.includes('|')) {
                    const options = rule.split('|').map(s => s.trim());
                    return (
                        <div key={qid}>
                            <label className="block mb-2 font-bold">{label}</label>
                            <div className="flex gap-4">
                                {options.map(opt => (
                                    <div 
                                        key={opt}
                                        onClick={() => handleChange(qid, opt)}
                                        className={`cursor-pointer border-2 p-1 rounded ${choices[qid] === opt ? 'border-green-500' : 'border-gray-600'}`}
                                    >
                                        {/* Assuming images exist in public/images/creation/ */}
                                        <img src={`/images/creation/${opt}.png`} alt={opt} className="w-24 h-24 object-cover"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={qid}>
                        <label className="block mb-1 font-bold text-gray-300">{label}</label>
                        <input
                            type="text"
                            className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white"
                            onChange={(e) => handleChange(qid, e.target.value)}
                            required
                        />
                    </div>
                );
            })}
            <button type="submit" className="w-full bg-green-700 py-2 rounded text-white font-bold hover:bg-green-600">
                Begin Your Journey
            </button>
            {error && <p className="text-red-500">{error}</p>}
        </form>
    );
}