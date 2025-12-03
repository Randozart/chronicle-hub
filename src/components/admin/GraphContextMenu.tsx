'use client';

import React from 'react';

interface Props {
    x: number;
    y: number;
    type: 'pane' | 'node';
    graphMode: 'redirect' | 'quality';
    onClose: () => void;
    onAction: (action: string) => void;
}

export default function GraphContextMenu({ x, y, type, graphMode, onClose, onAction }: Props) {
    return (
        <div 
            style={{ 
                position: 'fixed', top: y, left: x, zIndex: 1000, 
                background: '#1e2127', border: '1px solid #444', 
                borderRadius: '6px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                minWidth: '180px', overflow: 'hidden'
            }}
            onClick={onClose} // Close when an option is clicked
            onMouseLeave={onClose}
        >
            {type === 'pane' && (
                <MenuButton label="➕ New Storylet Here" onClick={() => onAction('create_node')} />
            )}

            {type === 'node' && graphMode === 'redirect' && (
                <>
                    <MenuButton label="Link to New Storylet" onClick={() => onAction('link_new_redirect')} />
                    <MenuButton label="Edit Storylet" onClick={() => onAction('edit_node')} />
                </>
            )}

            {type === 'node' && graphMode === 'quality' && (
                <>
                    <MenuButton label="Create Next Step (+10)" onClick={() => onAction('link_new_quality')} />
                    <MenuButton label="Edit Storylet" onClick={() => onAction('edit_node')} />
                </>
            )}
        </div>
    );
}

function MenuButton({ label, onClick }: { label: string, onClick: () => void }) {
    return (
        <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            style={{ 
                display: 'block', width: '100%', textAlign: 'left', 
                padding: '10px 15px', background: 'transparent', border: 'none', 
                color: '#ccc', cursor: 'pointer', borderBottom: '1px solid #2c313a',
                fontSize: '0.85rem'
            }}
            className="hover:bg-[#2c313a] hover:text-white"
            onMouseEnter={(e) => e.currentTarget.style.background = '#2c313a'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
            {label}
        </button>
    );
}