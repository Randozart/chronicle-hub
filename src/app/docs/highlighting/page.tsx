'use client';

import React from 'react';

export default function SyntaxHighlightingPage() {
    
    // Helper to simulate the Editor look
    const CodeBlock = ({ children }: { children: React.ReactNode }) => (
        <div className="docs-pre" style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
            <code style={{ fontFamily: 'Consolas, "Courier New", monospace', background: 'transparent' }}>
                {children}
            </code>
        </div>
    );

    // Color Constants (Matched to your CSS)
    const C = {
        text: '#bec0c5',     // Base Text
        brace1: '#e5c07b',   // Gold
        brace2: '#df8749',   // Copper
        varLocal: '#61afef', // Electric Blue
        varAlias: '#98c379', // Green
        varWorld: '#ff3b90', // Pink
        macro: '#6361ff',    // Royal Blue
        bracket: '#5646ff',  // Deep Blue
        num: '#7cee7a',      // Lime
        math: '#bec0c5',     // Text Grey (Math)
        operator: '#9ba1ad', // Grey (Operator)
        flow: '#f77e6e',     // Soft Pink
        comment: '#6A9955',  // Olive Green
        js: '#ff79c6'        // Magenta
    };

    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">Editor Highlighting</h1>
                <p className="docs-lead">
                    A visual guide to the ScribeScript editor. Understand what the colors mean and how they help you write cleaner code.
                </p>
            </header>

            {/* 1. STRUCTURE */}
            <section id="structure">
                <h2 className="docs-h2" style={{color: C.brace1}}>1. Structure (Braces)</h2>
                <p className="docs-p">
                    Curly braces <code>{`{ }`}</code> act as the "Frame" for your logic. They switch the editor from <strong>Text Mode</strong> to <strong>Logic Mode</strong>.
                </p>
                <ul className="docs-list">
                    <li><strong style={{color: C.brace1}}>Gold:</strong> Outer Logic (Depth 1, 3, 5...)</li>
                    <li><strong style={{color: C.brace2}}>Copper:</strong> Inner Logic (Depth 2, 4, 6...)</li>
                </ul>
                <div className="docs-card">
                    <h4 className="docs-h4">Example: Nested Logic</h4>
                    <CodeBlock>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'{'}</span>
                        <span style={{color: C.text}}> Outer </span>
                        <span style={{color: C.brace2, fontWeight:'bold'}}>{'{'}</span>
                        <span style={{color: C.text}}> Inner </span>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'{'}</span>
                        <span style={{color: C.text}}> Deep </span>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                        <span style={{color: C.brace2, fontWeight:'bold'}}>{'}'}</span>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                    </CodeBlock>
                </div>
            </section>

            {/* 2. DATA */}
            <section id="data">
                <h2 className="docs-h2" style={{color: C.varLocal}}>2. Data (Variables)</h2>
                <p className="docs-p">
                    Variables represent the changing state of your world. The color tells you the <strong>Scope</strong> of the variable.
                </p>
                <table className="docs-table">
                    <thead><tr><th>Type</th><th>Sigil</th><th>Color</th><th>Meaning</th></tr></thead>
                    <tbody>
                        <tr>
                            <td><strong>Local</strong></td>
                            <td><code>$</code></td>
                            <td style={{color: C.varLocal, fontWeight:'bold'}}>Electric Blue</td>
                            <td>Standard character qualities (Gold, Health).</td>
                        </tr>
                        <tr>
                            <td><strong>Alias</strong></td>
                            <td><code>@</code></td>
                            <td style={{color: C.varAlias, fontWeight:'bold'}}>Green</td>
                            <td>Temporary variables defined within the script.</td>
                        </tr>
                        <tr>
                            <td><strong>World</strong></td>
                            <td><code>#</code></td>
                            <td style={{color: C.varWorld, fontWeight:'bold'}}>Hot Pink</td>
                            <td>Global state shared by all players (Season, War Status).</td>
                        </tr>
                    </tbody>
                </table>
                <div className="docs-card">
                    <h4 className="docs-h4">Example: Variable Scopes</h4>
                    <CodeBlock>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'{'}</span>
                        <span style={{color: C.varLocal, fontWeight:'bold'}}>$gold</span>
                        <span style={{color: C.operator}}> + </span>
                        <span style={{color: C.varAlias, fontWeight:'bold'}}>@bonus</span>
                        <span style={{color: C.operator}}> + </span>
                        <span style={{color: C.varWorld, fontWeight:'bold'}}>#tax_rate</span>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                    </CodeBlock>
                </div>
            </section>

            {/* 3. ACTIONS */}
            <section id="actions">
                <h2 className="docs-h2" style={{color: C.macro}}>3. Actions (Macros)</h2>
                <p className="docs-p">
                    Macros are engine commands that perform complex tasks like picking random items or rolling dice.
                </p>
                <ul className="docs-list">
                    <li><strong style={{color: C.macro}}>Royal Blue:</strong> The Command Name (e.g., <code>%pick</code>).</li>
                    <li><strong style={{color: C.bracket}}>Deep Blue:</strong> The Brackets <code>[ ]</code> containing arguments.</li>
                </ul>
                <div className="docs-card">
                    <h4 className="docs-h4">Example: Picking an Item</h4>
                    <CodeBlock>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'{'}</span>
                        <span style={{color: C.macro, fontWeight:'bold'}}>%pick</span>
                        <span style={{color: C.bracket}}>[</span>
                        <span style={{color: C.text}}>Weapons</span>
                        <span style={{color: C.operator}}>; </span>
                        <span style={{color: C.num}}>1</span>
                        <span style={{color: C.bracket}}>]</span>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                    </CodeBlock>
                </div>
            </section>

            {/* 4. LOGIC & MATH */}
            <section id="math">
                <h2 className="docs-h2" style={{color: C.num}}>4. Logic & Math</h2>
                <p className="docs-p">
                    The nuts and bolts of your conditions. Distinguishing between "Flow" and "Math" helps reading complex formulas.
                </p>
                
                <h3 className="docs-h3" style={{marginTop:'1.5rem', color: C.num}}>Values & Math</h3>
                <p className="docs-p">
                    <strong>Values</strong> (Numbers) are <span style={{color: C.num}}>Lime Green</span>.
                    <br/>
                    <strong>Math Operators</strong> (`+`, `-`, `*`, `/`) are <span style={{color: C.math, fontWeight:'bold'}}>Light Grey</span>.
                </p>
                <div className="docs-card">
                    <CodeBlock>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'{'}</span>
                        <span style={{color: C.math, fontWeight:'bold'}}>(</span>
                        <span style={{color: C.varLocal, fontWeight:'bold'}}>$xp</span>
                        <span style={{color: C.math, fontWeight:'bold'}}> * </span>
                        <span style={{color: C.num}}>2</span>
                        <span style={{color: C.math, fontWeight:'bold'}}>)</span>
                        <span style={{color: C.math, fontWeight:'bold'}}> / </span>
                        <span style={{color: C.num}}>10</span>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                    </CodeBlock>
                </div>

                <h3 className="docs-h3" style={{marginTop:'1.5rem', color: C.flow}}>Flow Control</h3>
                <p className="docs-p">
                    Operators that control the <strong>Flow</strong> of logic (If/Else) are <span style={{color: C.flow, fontWeight:'bold'}}>Soft Pink</span>.
                </p>
                <ul className="docs-list">
                    <li><code>:</code> (Then / If True)</li>
                    <li><code>|</code> (Else / Random Option)</li>
                    <li><code>~</code> (Range)</li>
                </ul>
                <div className="docs-card">
                    <h4 className="docs-h4">Example: Conditional Text</h4>
                    <CodeBlock>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'{'}</span>
                        <span style={{color: C.varLocal, fontWeight:'bold'}}>$gold</span>
                        <span style={{color: C.operator}}> &gt; </span>
                        <span style={{color: C.num}}>50</span>
                        <span style={{color: C.flow, fontWeight:'bold'}}> : </span>
                        <span style={{color: C.text}}>Rich</span>
                        <span style={{color: C.flow, fontWeight:'bold'}}> | </span>
                        <span style={{color: C.text}}>Poor</span>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                    </CodeBlock>
                </div>
            </section>

            {/* 5. SPECIAL ELEMENTS */}
            <section id="special">
                <h2 className="docs-h2" style={{color: C.js}}>5. Special Elements</h2>
                
                <h3 className="docs-h3" style={{marginTop:'1rem', color: C.js}}>JavaScript Keywords</h3>
                <p className="docs-p">
                    If you use raw JavaScript (like <code>Math.floor</code> or <code>true/false</code>), it highlights in <strong style={{color: C.js}}>Magenta Italics</strong>. This confirms the engine sees it as code, not text.
                </p>
                <CodeBlock>
                    <span style={{color: C.brace1, fontWeight:'bold'}}>{'{'}</span>
                    <span style={{color: C.js, fontStyle:'italic', fontWeight:'bold'}}>Math.max</span>
                    <span style={{color: C.math, fontWeight:'bold'}}>(</span>
                    <span style={{color: C.num}}>0</span>
                    <span style={{color: C.operator}}>, </span>
                    <span style={{color: C.varLocal, fontWeight:'bold'}}>$hp</span>
                    <span style={{color: C.math, fontWeight:'bold'}}>)</span>
                    <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                </CodeBlock>

                <h3 className="docs-h3" style={{marginTop:'1.5rem', color: C.comment}}>Comments</h3>
                <p className="docs-p">
                    Comments start with <code>//</code> and are colored <strong style={{color: C.comment}}>Olive Green</strong>.
                </p>
                <CodeBlock>
                    <span style={{color: C.brace1, fontWeight:'bold'}}>{'{'}</span>
                    <span style={{color: C.comment, fontStyle:'italic'}}> // Check if player is alive </span>
                    <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                </CodeBlock>
            </section>
        </div>
    );
}