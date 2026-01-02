'use client';

interface Props {
    checked: boolean;
    onChange: () => void;
    label: string;
    desc?: string;
}

export default function BehaviorCard({ checked, onChange, label, desc }: Props) {
    return (
        <div 
            onClick={onChange}
            style={{ 
                padding: '0.5rem', borderRadius: '4px', cursor: 'pointer',
                border: checked ? '1px solid #61afef' : '1px solid #333',
                background: checked ? 'rgba(97, 175, 239, 0.1)' : '#21252b',
                transition: 'all 0.2s'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: checked ? '#61afef' : '#ccc' }}>
                <input type="checkbox" checked={checked} readOnly />
                {label}
            </div>
            {desc && <p style={{ margin: '4px 0 0 24px', fontSize: '0.7rem', color: 'var(--tool-text-dim)' }}>{desc}</p>}
        </div>
    );
}