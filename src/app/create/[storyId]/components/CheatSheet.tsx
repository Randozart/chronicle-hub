'use client';

import Link from 'next/link';
import { useState } from 'react';
import SparkleIcon from '@/components/icons/SparkleIcon';

export default function CheatSheet() {
    const [isOpen, setIsOpen] = useState(true); 

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)} 
                className="cheat-toggle-btn"
                style={{ 
                    width: '40px', 
                    borderLeft: '1px solid #333',
                    background: '#181a1f',
                    color: '#aaa',
                    cursor: 'pointer',
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    padding: '1rem 0',
                    fontWeight: 'bold',
                    letterSpacing: '2px',
                    transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#21252b'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#181a1f'}
            >
                REFERENCE
            </button>
        );
    }

    return (
        <div className="cheat-sheet-container" style={{ width: '320px', display: 'flex', flexDirection: 'column', height: '100%', background: '#181a1f', borderLeft: '1px solid #333' }}>
            
            {/* FIXED HEADER - Clickable to Close */}
            <div 
                className="cheat-sheet-header" 
                onClick={() => setIsOpen(false)}
                style={{ 
                    flexShrink: 0, 
                    padding: '1.5rem', 
                    borderBottom: '1px solid #333', 
                    background: '#21252b',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
                title="Click to close reference"
            >
                {/* TEXT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#fff' }}>
                        ScribeScript
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: '#777', margin: 0 }}>
                        Syntax Reference Guide
                    </p>
                </div>

                {/* BUTTON COLUMN */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent double-fire
                        setIsOpen(false);
                    }} 
                    style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid #444', 
                        color: '#aaa', 
                        borderRadius: '6px',
                        width: '32px', height: '32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    className="hover:bg-white hover:text-black hover:border-white"
                >
                    <CloseIcon />
                </button>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 2rem 1.5rem' }}>
                
                {/* 0. TOOLS */}
                <div style={{ background: 'rgba(97, 175, 239, 0.1)', border: '1px solid #61afef', borderRadius: '4px', padding: '0.75rem', margin: '1rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#61afef', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '5px' }}>
                        <SparkleIcon /> The Scribe Assistant
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#ccc', margin: 0, lineHeight: '1.4' }}>
                        Don't type manually! Look for the <strong>Logic</strong> or <strong>Sparkle</strong> buttons in the editor to auto-generate these codes.
                    </p>
                </div>

                {/* 1. BASICS */}
                <Accordion title="1. The Basics">
                    <div className="cheat-item">
                        <code className="cheat-code">{"{ ... }"}</code>
                        <p className="cheat-desc"><strong>Logic Block.</strong> Inject code into text.</p>
                    </div>
                    <div className="cheat-item">
                        <code className="cheat-code">{"( ... )"}</code>
                        <p className="cheat-desc"><strong>Grouper.</strong> Group logic conditions.</p>
                    </div>
                    <div className="cheat-item">
                        <span className="cheat-sub-title">Variables</span>
                        <code className="cheat-code">$quality_id</code>
                    </div>
                    <div className="cheat-item">
                        <span className="cheat-sub-title">Properties</span>
                        <code className="cheat-code">$id.name</code>
                        <code className="cheat-code">$id.description</code>
                        <code className="cheat-code">$item.source</code>
                    </div>
                </Accordion>
                
                {/* NEW: FORMATTING */}
                <Accordion title="2. Formatting">
                    <div className="cheat-item">
                        <code className="cheat-code">**Bold**</code>
                    </div>
                    <div className="cheat-item">
                        <code className="cheat-code">*Italic*</code>
                        <p className="cheat-desc">Or use <code>_text_</code></p>
                    </div>
                </Accordion>

                {/* 2. LOGIC GATES */}
                <Accordion title="3. Logic & Gates">
                    <p className="cheat-desc" style={{marginBottom:'0.5rem'}}>Used in <em>Visible If</em>, <em>Unlock If</em> and other logic fields.</p>
                    <div className="cheat-item">
                        <code className="cheat-code">{">, <, >=, <=, ==, !="}</code>
                    </div>
                    <div className="cheat-item">
                        <code className="cheat-code">{"&&"} (AND)</code>
                        <code className="cheat-code">{"||"} (OR)</code>
                    </div>
                    <div className="cheat-item">
                        <span className="cheat-sub-title">Example</span>
                        <code className="cheat-code" style={{fontSize: '0.7rem'}}>
                            ($gold {">"} 5 || $thief) && $alive
                        </code>
                    </div>
                </Accordion>

                {/* 3. CONDITIONAL TEXT */}
                <Accordion title="4. Conditional Text">
                    <div className="cheat-item">
                        <span className="cheat-sub-title">If / Else</span>
                        <code className="cheat-code">{"{ $q > 5 : High | Low }"}</code>
                    </div>
                    <div className="cheat-item">
                        <span className="cheat-sub-title">Chaining</span>
                        <code className="cheat-code" style={{fontSize: '0.7rem'}}>
                            {"{ $q > 10 : Great | $q > 5 : Okay | Bad }"}
                        </code>
                    </div>
                    <div className="cheat-item">
                        <span className="cheat-sub-title">Random Range</span>
                        <code className="cheat-code">{"You find { 1 ~ 10 } coins."}</code>
                    </div>
                </Accordion>

                {/* 4. EFFECTS & MATH */}
                <Accordion title="5. Quality Changes">
                    <div className="cheat-item">
                        <code className="cheat-code">$gold += 10</code>
                        <p className="cheat-desc">Add/Subtract/Set.</p>
                    </div>
                    <div className="cheat-item">
                        <code className="cheat-code">$strength++</code>
                        <p className="cheat-desc">Increment (Adds 1 CP for Pyramidal stats).</p>
                    </div>
                    <div className="cheat-item">
                        <span className="cheat-sub-title">Dynamic Math</span>
                        <code className="cheat-code">$gold += {"{ $level * 10 }"}</code>
                    </div>
                    <div className="cheat-item">
                        <span className="cheat-sub-title">Batch Modification</span>
                        <code className="cheat-code">$all[category_name] = 0</code>
                    </div>
                </Accordion>
                {/* 6. SKILL CHECKS (New Section) */}
                <Accordion title="6. Skill Checks">
                    <div className="cheat-item">
                        <span className="cheat-sub-title">Standard Check</span>
                        <code className="cheat-code">$stat {">="} 50 [10]</code>
                        <p className="cheat-desc">
                            Target 50. Margin 10.<br/>
                            <small>(40=0%, 50=60%, 60=100%)</small>
                        </p>
                    </div>

                    <div className="cheat-item">
                        <span className="cheat-sub-title">Full Syntax</span>
                        <code className="cheat-code" style={{fontSize:'0.7rem'}}>$stat {">="} T [Mar, Min, Max, Piv]</code>
                        <p className="cheat-desc">
                            <strong>Mar:</strong> Range (+/-)<br/>
                            <strong>Min/Max:</strong> Clamp % (e.g. 10, 90)<br/>
                            <strong>Piv:</strong> Chance at Target (default 60)
                        </p>
                    </div>

                    <div className="cheat-item">
                        <span className="cheat-sub-title">Hard Pivot Example</span>
                        <code className="cheat-code" style={{fontSize:'0.7rem'}}>$stat {">="} 50 [10, 0, 100, 30]</code>
                        <p className="cheat-desc">
                            Reaching target only gives 30% chance.
                        </p>
                    </div>

                    <div className="cheat-item">
                        <span className="cheat-sub-title">Luck (RNG)</span>
                        <code className="cheat-code">$luck {"<="} 40</code>
                        <p className="cheat-desc">Raw 40% chance. Ignores stats.</p>
                    </div>
                </Accordion>
                {/* 5. ADVANCED MECHANICS */}
                <Accordion title="7. Advanced Mechanics">
                    <div className="cheat-item">
                        <span className="cheat-sub-title">Item Sources</span>
                        <code className="cheat-code">$item[source:cave] += 1</code>
                        <p className="cheat-desc">Tags the item history. Can be inserted back into the text as {`{$item.source}`}, 
                            which will select the most recent source first to insert back into the text, and delete the source after.</p>
                    </div>

                    <div className="cheat-item">
                        <span className="cheat-sub-title">Living Stories</span>
                        <code className="cheat-code">$schedule[$q += 1 : 4h]</code>
                        <p className="cheat-desc">Updates a quality after real-world time passes.</p>
                        <code className="cheat-code">$cancel[$q]</code>
                        <p className="cheat-desc">Cancels an update to the specified quality.</p>
                    </div>
                </Accordion>
                
                <div style={{ marginTop: '2rem', paddingTop: '1rem', textAlign: 'center' }}>
                    <Link href="/docs" target="_blank" style={{ color: '#61afef', textDecoration: 'none', fontSize: '0.85rem' }}>
                        Open Full Documentation ↗
                    </Link>
                </div>
            </div>
        </div>
    );
}

function Accordion({ title, children }: { title: string, children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ borderBottom: '1px solid #333' }}>
            <button 
                onClick={() => setOpen(!open)}
                style={{ 
                    width: '100%', textAlign: 'left', padding: '0.75rem 0', 
                    background: 'none', border: 'none', color: '#98c379', 
                    fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
            >
                {title}
                <span style={{ color: '#777', fontSize: '1.2rem', lineHeight: 0 }}>{open ? '−' : '+'}</span>
            </button>
            {open && <div style={{ paddingBottom: '1rem' }}>{children}</div>}
        </div>
    );
}

function CloseIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
        </svg>
    );
}