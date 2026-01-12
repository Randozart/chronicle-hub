'use client';

import Link from "next/link";

interface Props {
    id: string;
    type: 'category' | 'deck' | 'quality' | 'location';
    storyId: string;
    onCreate?: () => void;
    isRequired?: boolean; 
}

export default function MissingEntityAlert({ id, type, storyId, onCreate, isRequired = false }: Props) {
    if (!id || id.trim() === "") return null;

    const cleanId = id.trim();
    
    const config = {
        category: {
            label: "Category",
            url: `/create/${storyId}/categories`,
            msg: `Category "${cleanId}" is not defined.`
        },
        deck: {
            label: "Deck",
            url: `/create/${storyId}/decks`,
            msg: `Deck "${cleanId}" is not defined.`
        },
        quality: {
            label: "Quality",
            url: `/create/${storyId}/qualities`, 
            msg: `System Quality "${cleanId}" does not exist.`
        },
        location: {
            label: "Location",
            url: `/create/${storyId}/locations`,
            msg: `Location "${cleanId}" does not exist.`
        }
    };

    const c = config[type];

    const containerStyle: React.CSSProperties = isRequired ? {
        marginTop: '0.5rem',
        padding: '0.75rem',
        background: 'var(--warning-bg)', 
        border: '1px solid var(--warning-color)',
        borderRadius: 'var(--border-radius)',
        color: 'var(--warning-color)', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        fontSize: '0.85rem',
        animation: 'fadeIn 0.3s ease-in-out'
    } : {
        marginTop: '0.5rem',
        padding: '0.75rem',
        background: 'rgba(52, 152, 219, 0.1)',
        border: '1px solid rgba(52, 152, 219, 0.3)',
        borderRadius: 'var(--border-radius)',
        color: 'var(--tool-text-main)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        fontSize: '0.85rem',
        animation: 'fadeIn 0.3s ease-in-out'
    };

    const buttonStyle: React.CSSProperties = isRequired ? {
        background: 'var(--warning-color)',
        color: 'var(--bg-panel)', 
        fontWeight: 'bold'
    } : {
        background: 'var(--tool-accent)',
        color: 'white'
    };

    return (
        <div style={containerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2em' }}>{isRequired ? '⚠️' : ''}</span>
                <div>
                    <strong>{isRequired ? 'Missing Definition' : `New ${c.label}?`}</strong> {c.msg}
                    {!isRequired && (
                        <div className="special-desc" style={{ marginTop: '2px', opacity: 0.8 }}>
                            Definitions are optional, but allow for customization.
                        </div>
                    )}
                </div>
            </div>

            {onCreate ? (
                <button 
                    onClick={onCreate}
                    className="save-btn"
                    style={{ 
                        padding: '4px 12px', 
                        fontSize: '0.8rem', 
                        width: 'auto',
                        whiteSpace: 'nowrap',
                        ...buttonStyle
                    }}
                >
                    Create Now
                </button>
            ) : (
                <Link 
                    href={c.url} 
                    target="_blank"
                    style={{ 
                        textDecoration: 'none',
                        background: 'var(--tool-bg-header)',
                        border: `1px solid ${isRequired ? 'var(--warning-color)' : 'var(--tool-accent)'}`,
                        color: isRequired ? 'var(--warning-color)' : 'var(--tool-accent)',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                    }}
                >
                    Define {c.label} ↗
                </Link>
            )}
            
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}