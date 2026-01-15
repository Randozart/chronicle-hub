'use client';

import { DeckDefinition, WorldSettings } from "@/engine/models";
import FormattedText from "./FormattedText";
import DeckTimer from "./DeckTimer";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    deck: DeckDefinition;
    settings: WorldSettings;
    currentCharges: number;
    maxCharges: number;
    lastUpdate: string | Date;
    onRegen: () => void;
    actionTimestamp?: string | Date;
}

export default function DeckEmptyModal({ 
    isOpen, 
    onClose, 
    deck, 
    settings, 
    currentCharges, 
    maxCharges, 
    lastUpdate, 
    onRegen,
    actionTimestamp
}: Props) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(2px)'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                padding: '2rem',
                maxWidth: '400px',
                width: '90%',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>
                
                <h3 style={{ 
                    margin: '0 0 1rem 0', 
                    color: 'var(--text-primary)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '1px' 
                }}>
                    <FormattedText text={deck.name || "Deck"} /> Depleted
                </h3>

                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    You have drawn all available cards from this deck. You must wait for them to replenish.
                </p>

                <div style={{ 
                    background: 'var(--bg-item)', 
                    padding: '1.5rem', 
                    borderRadius: 'var(--border-radius)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '2rem',
                    border: '1px dashed var(--border-color)'
                }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger-color)' }}>
                        0 <span style={{ fontSize: '1rem', verticalAlign: 'middle', opacity: 0.7, color: 'var(--text-muted)' }}>/ {maxCharges}</span>
                    </div>
                    
                    <DeckTimer 
                        deck={deck} 
                        settings={settings} 
                        lastUpdate={lastUpdate} 
                        currentCharges={currentCharges} 
                        maxCharges={maxCharges} 
                        onRegen={onRegen}
                        actionTimestamp={actionTimestamp}
                    />
                </div>

                <button className="option-button" onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
}