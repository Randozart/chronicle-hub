'use client';

import { useState } from 'react';

export default function CheatSheet() {
    const [isOpen, setIsOpen] = useState(true); 

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)} className="cheat-toggle-btn">
                SCRIBESCRIPT REFERENCE
            </button>
        );
    }

    return (
        <div className="cheat-sheet-container">
            <div className="cheat-sheet-header">
                <h3>ScribeScript</h3>
                <button onClick={() => setIsOpen(false)} className="cheat-sheet-close">✕</button>
            </div>

            {/* 1. VARIABLES */}
            <Accordion title="1. Variables & Values">
                <div className="cheat-item">
                    <code className="cheat-code">$quality_id</code>
                    <p className="cheat-desc">
                        <strong>Dynamic Resolution:</strong><br/>
                        If the quality is a Number (Pyramidal/Currency), this returns the <em>Level</em>.<br/>
                        If the quality is a String, this returns the <em>Text Value</em>.
                    </p>
                </div>
                <div className="cheat-item">
                    <code className="cheat-code">$id.description</code>
                    <p className="cheat-desc">Inserts the quality's description text.</p>
                </div>
            </Accordion>

            {/* 2. TEXT LOGIC */}
            <Accordion title="2. Text Logic {}">
                <p className="cheat-desc" style={{ marginBottom: '0.5rem', fontStyle: 'italic' }}>
                    Use <code>{`{ }`}</code> to calculate logic before text is displayed.
                </p>
                
                <div className="cheat-item">
                    <span className="cheat-sub-title">Basic Replacement</span>
                    <code className="cheat-code">{"Hello, {$player_name}!"}</code>
                </div>

                <div className="cheat-item">
                    <span className="cheat-sub-title">If / Else</span>
                    <code className="cheat-code">{"{ $mettle >= 10 : Brave | Coward }"}</code>
                    <p className="cheat-desc">If Mettle is 10+, display "Brave". Otherwise, "Coward".</p>
                </div>

                <div className="cheat-item">
                    <span className="cheat-sub-title">Branching (Else If Chain)</span>
                    <code className="cheat-code" style={{ fontSize: '0.7rem', lineHeight: '1.4' }}>
                        {"{ $rep > 50 : Hero |\n  $rep > 10 : Friend |\n  Stranger }"}
                    </code>
                    <p className="cheat-desc">
                        Checks conditions in order. First match wins. <br/>
                        Format: <code>{"{ If : Then | ElseIf : Then | Else }"}</code>
                    </p>
                </div>

                <div className="cheat-item">
                    <span className="cheat-sub-title">Random Numbers</span>
                    <code className="cheat-code">{"You find { 1 ~ 10 } coins."}</code>
                </div>
            </Accordion>

            {/* 3. REQUIREMENTS */}
            <Accordion title="3. Requirements & Skills">
                <div className="cheat-item">
                    <span className="cheat-sub-title">Logic Operators</span>
                    <code className="cheat-code">{">="}  {"<="}  {">"}  {"<"}  {"=="}  {"!="}</code>
                    <code className="cheat-code">&& (AND)   || (OR)</code>
                </div>

                <div className="cheat-item">
                    <span className="cheat-sub-title">Examples</span>
                    <code className="cheat-code">$gold {">="} 10</code>
                    <code className="cheat-code">$name == "John" && $rep {">"} 5</code>
                </div>
                
                <div className="cheat-subsection">
                    <span className="cheat-sub-title">Broad Difficulty (Skill Checks)</span>
                    <p className="cheat-desc">
                        Calculates chance based on Level vs Target.
                    </p>
                    
                    <code className="cheat-code">$stat {">="} 50</code>
                    <p className="cheat-desc">
                        <strong>Standard (No Margin):</strong><br/>
                        If Level {">="} 50, Chance is 100%.<br/>
                        If Level {"<"} 50, Chance is 0%.
                    </p>

                    <code className="cheat-code">$stat {">="} 50 [10]</code>
                    <p className="cheat-desc">
                        <strong>Broad (With Margin):</strong><br/>
                        Target: 50. Margin: 10.<br/>
                        • 40 (Target-Margin): <strong>0%</strong><br/>
                        • 50 (Target): <strong>50%</strong><br/>
                        • 60 (Target+Margin): <strong>100%</strong>
                    </p>

                    <code className="cheat-code">$stat {">="} 50 [10, 5, 95]</code>
                    <p className="cheat-desc">
                        <strong>Clamped:</strong> Adds Min (5%) and Max (95%) caps.
                    </p>
                </div>
            </Accordion>

            {/* 4. EFFECTS */}
            <Accordion title="4. Effects (The Ledger)">
                <div className="cheat-item">
                    <code className="cheat-code">$gold += 10</code>
                    <code className="cheat-code">$gold *= 2</code>
                    <p className="cheat-desc">
                        <strong>Math:</strong> Supports +, -, *, /, %.<br/>
                        For <em>Pyramidal</em> qualities, these target <strong>Change Points (CP)</strong>.
                    </p>
                </div>
                
                <div className="cheat-item">
                    <code className="cheat-code">$xp++</code>
                    <code className="cheat-code">$xp--</code>
                    <p className="cheat-desc">Increment / Decrement.</p>
                </div>

                <div className="cheat-item">
                    <code className="cheat-code">$level = 5</code>
                    <p className="cheat-desc">
                        <strong>Assignment:</strong> Using <code>=</code> sets the <strong>Level</strong> directly (reseting CP to 0).
                    </p>
                </div>

                <div className="cheat-item">
                    <span className="cheat-sub-title">Dynamic Text Assignment</span>
                    <code className="cheat-code">{"$status = \"Friend of {$faction}\""}</code>
                </div>

                <div className="cheat-item">
                    <code className="cheat-code">$all[menace] = 0</code>
                    <p className="cheat-desc">Reset entire category.</p>
                </div>
            </Accordion>

            {/* 5. ITEMS */}
            <Accordion title="5. Item Sources">
                <p className="cheat-desc" style={{ marginBottom: '0.5rem' }}>
                    Items track history via sources.
                </p>
                <div className="cheat-item">
                    <code className="cheat-code">$rumor[source:overheard at the pub] += 1</code>
                </div>
                <div className="cheat-item">
                    <code className="cheat-code">{"You share a rumor {$rumor.source}."}</code>
                    <p className="cheat-desc">Output: "You share a rumor overheard at the pub."</p>
                </div>
            </Accordion>

            {/* 6. PROPERTIES */}
            <Accordion title="6. Properties">
                <div className="cheat-item">
                    <code className="cheat-code">instant_redirect</code>
                    <p className="cheat-desc">Skip result screen.</p>
                </div>
                <div className="cheat-item">
                    <code className="cheat-code">pass_move_to: "loc_id"</code>
                    <p className="cheat-desc">Travel on success.</p>
                </div>
            </Accordion>

            {/* 7. ADVANCED */}
            <Accordion title="7. Advanced Patterns">
                
                <div className="cheat-subsection">
                    <span className="cheat-sub-title">Dynamic Difficulty</span>
                    <code className="cheat-code">$mettle {">="} {"{ 10 + $danger_level }"} [5]</code>
                    <p className="cheat-desc">
                        Target calculation happens before the Skill Check rolls.
                    </p>
                </div>

                <div className="cheat-subsection">
                    <span className="cheat-sub-title">Dynamic Rewards</span>
                    <code className="cheat-code">
                        $gold += {"{ 10 + $luck }"}, $xp++
                    </code>
                    <p className="cheat-desc">
                        Calculate reward amount using stats.
                    </p>
                </div>

                <div className="cheat-subsection">
                    <span className="cheat-sub-title">The "Impossible Theorem"</span>
                    <code className="cheat-code">
                        $energy = 0, $knowledge += $energy
                    </code>
                    <p className="cheat-desc">
                        Drain one stat to fuel another in a single click.
                    </p>
                </div>
            </Accordion>
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