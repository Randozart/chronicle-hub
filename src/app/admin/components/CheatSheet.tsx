'use client';

import { useState } from 'react';

export default function CheatSheet() {
    const [isOpen, setIsOpen] = useState(true); 

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="cheat-toggle-btn"
            >
                HELP & REFERENCE
            </button>
        );
    }

    return (
        <div className="cheat-sheet-container">
            <div className="cheat-sheet-header">
                <h3>Reference</h3>
                <button onClick={() => setIsOpen(false)} className="cheat-sheet-close">✕</button>
            </div>

            {/* 1. VARIABLES */}
            <div className="cheat-section">
                <h4>Variables</h4>
                
                <div className="cheat-item">
                    <code className="cheat-code">$quality_id</code>
                    <p className="cheat-desc">Numeric level of quality.</p>
                </div>
                
                <div className="cheat-item">
                    <code className="cheat-code">$quality.stringValue</code>
                    <p className="cheat-desc">Text value (for String qualities).</p>
                </div>

                <div className="cheat-item">
                    <code className="cheat-code">$quality.description</code>
                    <p className="cheat-desc">Insert quality's description text.</p>
                </div>
            </div>

            {/* 2. TEXT LOGIC */}
            <div className="cheat-section">
                <h4>Text Logic</h4>
                
                <div className="cheat-item">
                    <code className="cheat-code">{"{ $val }"}</code>
                    <p className="cheat-desc">Insert value into text.</p>
                </div>

                <div className="cheat-item">
                    <code className="cheat-code">{"{ $q >= 5 : Won | Lost }"}</code>
                    <p className="cheat-desc">Conditional text (If / Else).</p>
                </div>
                
                <div className="cheat-item">
                    <code className="cheat-code">{"{ 1 ~ 10 }"}</code>
                    <p className="cheat-desc">Random number between 1 and 10.</p>
                </div>
            </div>

            {/* 3. REQUIREMENTS */}
            <div className="cheat-section">
                <h4>Requirements</h4>
                
                <div className="cheat-item">
                    <code className="cheat-code">$strength {">="} 10</code>
                    <code className="cheat-code">$gold {"<"} 50</code>
                    <code className="cheat-code">$name == "John"</code>
                </div>

                <div className="cheat-subsection">
                    <span className="cheat-sub-title">Skill Checks (Random)</span>
                    <code className="cheat-code">$stat {">="} 50 [10]</code>
                    <p className="cheat-desc">Broad difficulty. 50 is target, 10 is "Broad" margin.</p>
                </div>
            </div>

            {/* 4. EFFECTS */}
            <div className="cheat-section">
                <h4>Effects & Changes</h4>
                
                <div className="cheat-item">
                    <code className="cheat-code">$gold += 10</code>
                    <code className="cheat-code">$wounds -= 1</code>
                    <code className="cheat-code">$strength = 5</code>
                </div>

                <div className="cheat-item">
                    <code className="cheat-code">$xp *= 2</code>
                    <p className="cheat-desc">Multiply value.</p>
                </div>

                <div className="cheat-item">
                    <code className="cheat-code">$all[menace] = 0</code>
                    <p className="cheat-desc">Reset all qualities in category.</p>
                </div>
                
                <div className="cheat-subsection">
                    <span className="cheat-sub-title">With Source Tag</span>
                    <code className="cheat-code">$gold[source:Sold Item] += 5</code>
                    <p className="cheat-desc">Adds to history log.</p>
                </div>
            </div>

            {/* 5. PROPERTIES */}
            <div className="cheat-section">
                <h4>Special Properties</h4>
                
                <div className="cheat-item">
                    <code className="cheat-code">instant_redirect</code>
                    <p className="cheat-desc">Option redirects immediately without showing result text.</p>
                </div>
                
                <div className="cheat-item">
                    <code className="cheat-code">pass_move_to: "loc_id"</code>
                    <p className="cheat-desc">Moves player to location on success.</p>
                </div>
            </div>
        </div>
    );
}