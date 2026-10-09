'use client';

/**
 * EndingScreen — rendered instead of the hub when a character's story has
 * ended (an `endsCharacter` option resolved). The memorial: what they were,
 * how it finished, and the option to save the playthrough as a Chronicle.
 * Guests get a sign-in prompt; saving needs an account.
 */
import { useState } from 'react';
import Link from 'next/link';
import { CharacterDocument } from '@/engine/models';

const STAT_LABELS: Record<string, string> = {
    day: 'Days',
    cases_closed: 'Cases Closed',
    cases_open: 'Cases Left Open',
    reputation: 'Reputation',
    cash: 'Cash',
    heat: 'Heat',
    static_debt: 'Static',
    watch_debt: 'Known to the Round',
    gigs_done: 'Gigs Worked',
    liminal_rumors: 'Whispers Heard',
};

interface EndingScreenProps {
    character: CharacterDocument;
    storyId: string;
    isGuestMode?: boolean;
}

export default function EndingScreen({ character, storyId, isGuestMode }: EndingScreenProps) {
    const [epitaph, setEpitaph] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ended = character.ended;
    const qualityLevels = character.qualities as Record<string, { level?: number }> | undefined;
    const stats = Object.entries(STAT_LABELS)
        .map(([qid, label]) => ({ label, value: qualityLevels?.[qid]?.level ?? 0 }))
        .filter(s => s.value !== 0);

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/chronicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, characterId: character.characterId, epitaph }),
            });
            if (res.status === 401) {
                setError('Sign in to save this Chronicle.');
                return;
            }
            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.error || 'The Chronicle would not take.');
                return;
            }
            setSaved(true);
        } catch {
            setError('The ink ran dry. Try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem', backgroundColor: 'var(--bg-main)',
        }}>
            <div style={{ maxWidth: 640, width: '100%', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    The story is over
                </p>
                <h1 style={{ fontSize: '2.2rem', color: 'var(--text-highlight)', marginBottom: '0.25rem' }}>
                    {character.name}
                </h1>
                {ended?.optionName && (
                    <p style={{ color: 'var(--accent-primary)', fontSize: '1.1rem', marginBottom: '2rem' }}>
                        {ended.optionName}
                    </p>
                )}

                <div style={{
                    border: '1px solid var(--border-color)', borderRadius: 8,
                    padding: '1.5rem', margin: '0 auto 2rem', textAlign: 'left',
                    backgroundColor: 'var(--bg-secondary, rgba(0,0,0,0.2))',
                }}>
                    {stats.length === 0 && (
                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            A quiet life, mostly unrecorded.
                        </p>
                    )}
                    {stats.map(s => (
                        <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', color: 'var(--text-main)' }}>
                            <span>{s.label}</span>
                            <span style={{ color: 'var(--text-highlight)' }}>{s.value}</span>
                        </div>
                    ))}
                </div>

                {saved ? (
                    <div>
                        <p style={{ color: 'var(--text-highlight)', marginBottom: '1rem' }}>
                            The Chronicle is kept. Whatever happened here, it happened on the record now.
                        </p>
                        <Link href="/" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                            Back to the dashboard
                        </Link>
                    </div>
                ) : isGuestMode ? (
                    <div>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Playing as guest —{' '}
                            <Link href={`/register?callbackUrl=/play/${storyId}`} style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                                create an account
                            </Link>
                            {' '}to keep this playthrough as a Chronicle.
                        </p>
                        <Link href={`/login?callbackUrl=/play/${storyId}`} style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                            Already have an account? Sign in
                        </Link>
                    </div>
                ) : (
                    <div>
                        {!isGuestMode && (
                            <>
                                <input
                                    type="text"
                                    maxLength={200}
                                    placeholder="An epitaph, if you have the words for it (optional)"
                                    value={epitaph}
                                    onChange={e => setEpitaph(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.6rem', marginBottom: '1rem',
                                        background: 'var(--bg-secondary, rgba(0,0,0,0.2))',
                                        border: '1px solid var(--border-color)', borderRadius: 6,
                                        color: 'var(--text-main)',
                                    }}
                                />
                                <button
                                    onClick={save}
                                    disabled={saving}
                                    className="btn-primary"
                                    style={{ padding: '0.7rem 2rem', cursor: saving ? 'wait' : 'pointer' }}
                                >
                                    {saving ? 'Setting it down…' : 'Save this playthrough as a Chronicle'}
                                </button>
                            </>
                        )}
                        {error && (
                            <p style={{ color: '#c76a6a', marginTop: '0.75rem' }}>
                                {error}{' '}
                                {error.includes('Sign in') && (
                                    <Link href={`/login?callbackUrl=/play/${storyId}`} style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                                        Sign in
                                    </Link>
                                )}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
