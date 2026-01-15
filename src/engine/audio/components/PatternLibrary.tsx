'use client';

import { LIGATURE_LIBRARY } from "@/engine/audio/library";

interface Props {
    onInsert: (text: string) => void;
}

export default function PatternLibrary({ onInsert }: Props) {
    
    return (
        <div style={{ 
            background: '#111', border: '1px solid #333', borderRadius: '4px', 
            height: '100%', display: 'flex', flexDirection: 'column' 
        }}>
            <h3 style={{ 
                marginTop: 0, fontSize: '0.9rem', color: '#61afef', 
                textTransform: 'uppercase', padding: '1rem', 
                borderBottom: '1px solid #333', margin: 0
            }}>
                Pattern Library
            </h3>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {Object.values(LIGATURE_LIBRARY).map(category => (
                    <div key={category.name} style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ 
                            fontSize: '0.8rem', color: '#e5c07b', textTransform: 'uppercase',
                            margin: '0 0 0.75rem 0', paddingBottom: '0.25rem',
                            borderBottom: '1px solid #444'
                        }}>
                            {category.name}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {category.snippets.map(snippet => (
                                <button
                                    key={snippet.name}
                                    onClick={() => onInsert(`\n${snippet.code}\n`)}
                                    title={snippet.description}
                                    style={{
                                        background: '#21252b', border: '1px solid #333',
                                        borderRadius: '4px', padding: '0.5rem',
                                        textAlign: 'left', color: '#ccc', cursor: 'pointer',
                                        transition: 'background 0.2s, border-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#2c313a'; e.currentTarget.style.borderColor = '#61afef'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#21252b'; e.currentTarget.style.borderColor = '#333'; }}
                                >
                                    <div style={{ fontWeight: 'bold' }}>{snippet.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#777' }}>{snippet.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}