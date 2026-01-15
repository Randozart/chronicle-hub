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
        brace1: 'var(--docs-accent-gold)',   // Gold
        brace2: '#df8749',   // Copper
        varLocal: 'var(--docs-accent-blue)', // Electric Blue
        varAlias: 'var(--docs-accent-green)', // Green
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
            {/* 1. CONTEXT MODES */}
            <section id="modes">
                <h2 className="docs-h2">1. Context Modes</h2>
                <p className="docs-p">
                    The ScribeEditor is "Context Aware." It changes its behavior and default colors depending on whether you are writing a story (Prose) or configuring mechanics (Logic).
                </p>

                <div className="docs-grid">
                    <div className="docs-card">
                        <h4 className="docs-h4" style={{color: C.text}}>Prose Context</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Used in:</strong> Title, Main Text, Description, Options.
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            The default color is <strong style={{color: C.text}}>Light Grey</strong>. Everything is treated as literal text shown to the player.
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            To use logic, you must open a <strong>Logic Portal</strong> using curly braces <code>{`{ }`}</code>. Inside the braces, the text color shifts to <strong>Dark Grey</strong> to indicate code.
                        </p>
                        <div style={{marginTop:'1rem'}}>
                            <CodeBlock>
                                <span style={{color: C.text}}>You have </span>
                                <span style={{color: C.brace1, fontWeight:'bold'}}>{'{'}</span>
                                <span style={{color: C.varLocal, fontWeight:'bold'}}>$gold</span>
                                <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                                <span style={{color: C.text}}> coins.</span>
                            </CodeBlock>
                        </div>
                    </div>
                    
                    <div className="docs-card">
                        <h4 className="docs-h4" style={{color: C.varLocal}}>Logic Context</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Used in:</strong> Quality Changes (Effects), Conditions, Logic Fields.
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            The entire field is treated as code from the start. The default text color is <strong style={{color: C.operator}}>Dark Grey</strong> (Operator Color).
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            You do <strong>not</strong> need outer braces for simple math or assignments here, but you can still use nested braces for complex lookups (like <code>{`{$.name}`}</code>).
                        </p>
                        <div style={{marginTop:'1rem'}}>
                            <CodeBlock>
                                <span style={{color: C.varLocal, fontWeight:'bold'}}>$gold</span>
                                <span style={{color: C.math, fontWeight:'bold'}}> += </span>
                                <span style={{color: C.num}}>10</span>
                                <span style={{color: C.operator}}>, </span>
                                <span style={{color: C.varLocal, fontWeight:'bold'}}>$xp</span>
                                <span style={{color: C.math, fontWeight:'bold'}}> += </span>
                                <span style={{color: C.num}}>50</span>
                            </CodeBlock>
                        </div>
                    </div>
                </div>

                <h3 className="docs-h3" style={{marginTop:'2rem'}}>Visualizing Context Shifts</h3>
                <p className="docs-p">
                    The most immediate way to tell if your text is being treated as <strong>Prose</strong> or <strong>Code</strong> is by looking at the color of plain words.
                </p>

                <div className="docs-card">
                    <h4 className="docs-h4">1. The "Same String" Test</h4>
                    <p className="docs-p" style={{fontSize:'0.9rem'}}>
                        If you type the exact same characters into a Description (Text Mode) and an Effect (Logic Mode), they highlight differently.
                    </p>
                    
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                        <div>
                            <div style={{fontSize:'0.75rem', textTransform:'uppercase', color:C.text, marginBottom:'5px', fontWeight:'bold'}}>Text Field</div>
                            <CodeBlock>
                                <span style={{color: C.text}}>$sword.name</span>
                            </CodeBlock>
                            <p style={{fontSize:'0.8rem', color:'#777', marginTop:'5px'}}>
                                <strong>Light Grey.</strong> The engine sees this as the literal characters "$", "s", "w"... It will print exactly that.
                            </p>
                        </div>
                        <div>
                            <div style={{fontSize:'0.75rem', textTransform:'uppercase', color:C.varLocal, marginBottom:'5px', fontWeight:'bold'}}>Effect Field</div>
                            <CodeBlock>
                                <span style={{color: C.varLocal, fontWeight:'bold'}}>$sword.name</span>
                            </CodeBlock>
                            <p style={{fontSize:'0.8rem', color:'#777', marginTop:'5px'}}>
                                <strong>Colored.</strong> The engine identifies <code>$sword</code> as a variable and <code>.name</code> as a property access. It will look up the value.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="docs-card">
                    <h4 className="docs-h4">2. The Logic Text Shift</h4>
                    <p className="docs-p" style={{fontSize:'0.9rem'}}>
                        When you write text <strong>inside</strong> a conditional block, it actually becomes "Logic Text" (Darker Grey). This is a subtle visual cue that you are inside the braces.
                    </p>
                    <CodeBlock>
                        <span style={{color: C.text}}>You see </span>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'{'}</span>
                        <span style={{color: C.varLocal, fontWeight:'bold'}}>$is_night</span>
                        <span style={{color: C.flow, fontWeight:'bold'}}> : </span>
                        <span style={{color: C.operator}}> darkness </span>
                        <span style={{color: C.flow, fontWeight:'bold'}}> | </span>
                        <span style={{color: C.operator}}> sunlight </span>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                        <span style={{color: C.text}}>.</span>
                    </CodeBlock>
                    <div style={{marginTop:'1rem', display:'flex', gap:'2rem', fontSize:'0.9rem'}}>
                        <div>
                            <span style={{color: C.text, fontSize:'1.2rem'}}>■</span> Light Grey (Prose)
                        </div>
                        <div>
                            <span style={{color: C.operator, fontSize:'1.2rem'}}>■</span> Dark Grey (Logic Text)
                        </div>
                    </div>
                </div>

                <div className="docs-callout" style={{borderColor: C.macro, marginTop:'2rem'}}>
                    <strong style={{color: C.macro}}>Deep Dive: Context Injection</strong>
                    <p className="docs-p" style={{fontSize:'0.9rem', margin:'0.5rem 0 1rem 0'}}>
                        A property defined as "Text" in the editor (like a Name or Description) doesn't have to stay text. 
                        If you inject it into a Logic Field, the engine treats that text as <strong>Code</strong>.
                    </p>

                    <div style={{background: 'rgba(0,0,0,0.2)', padding:'1rem', borderRadius:'6px', marginBottom:'1rem'}}>
                        <p className="docs-p" style={{fontSize:'0.9rem', margin:0}}>
                            <strong>Scenario:</strong> You have a quality <code>$sword</code>.
                            <br/>
                            Its <strong>Name</strong> field contains the text: <code>10 + 5</code>
                        </p>
                    </div>

                    <div className="docs-grid" style={{gap:'1rem', margin:0}}>
                        <div>
                            <h5 className="docs-h4" style={{fontSize:'0.85rem', color:C.text, margin:'0 0 0.5rem 0'}}>1. Used in Prose</h5>
                            <CodeBlock>
                                <span style={{color: C.text}}>Damage: </span>
                                <span style={{color: C.brace1, fontWeight:'bold'}}>{'{'}</span>
                                <span style={{color: C.varLocal, fontWeight:'bold'}}>$sword.name</span>
                                <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                            </CodeBlock>
                            <p className="docs-p" style={{fontSize:'0.85rem', marginTop:'0.5rem'}}>
                                <strong>Result:</strong> "Damage: 10 + 5"
                                <br/><em style={{color:C.comment}}>It inserts the raw text string.</em>
                            </p>
                        </div>
                        
                        <div>
                            <h5 className="docs-h4" style={{fontSize:'0.85rem', color:C.varLocal, margin:'0 0 0.5rem 0'}}>2. Used in Effect (Logic)</h5>
                            <CodeBlock>
                                <span style={{color: C.varLocal, fontWeight:'bold'}}>$hp</span>
                                <span style={{color: C.math, fontWeight:'bold'}}> -= </span>
                                <span style={{color: C.brace1, fontWeight:'bold'}}>{'{'}</span>
                                <span style={{color: C.varLocal, fontWeight:'bold'}}>$sword.name</span>
                                <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                            </CodeBlock>
                            <p className="docs-p" style={{fontSize:'0.85rem', marginTop:'0.5rem'}}>
                                <strong>Result:</strong> Subtracts <strong>15</strong> HP.
                                <br/><em style={{color:C.comment}}>Because the container is Logic, the text "10 + 5" is calculated as Math.</em>
                            </p>
                        </div>
                    </div>
                    
                    <div style={{marginTop:'1.5rem', borderTop:'1px dashed #444', paddingTop:'1rem'}}>
                        <h5 className="docs-h4" style={{fontSize:'0.85rem', color:C.macro, margin:'0 0 0.5rem 0'}}>3. The "Double Brace" Trick (Forcing Logic in Prose)</h5>
                        <p className="docs-p" style={{fontSize:'0.9rem'}}>
                            If you want to calculate that math inside a Text field, you wrap it in a second pair of braces. 
                            The inner braces fetch the text "10 + 5". The outer braces execute it.
                        </p>
                        <CodeBlock>
                            <span style={{color: C.text}}>Total Damage: </span>
                            <span style={{color: C.brace1, fontWeight:'bold'}}>{'{'}</span>
                            <span style={{color: C.brace2, fontWeight:'bold'}}>{'{'}</span>
                            <span style={{color: C.varLocal, fontWeight:'bold'}}>$sword.name</span>
                            <span style={{color: C.brace2, fontWeight:'bold'}}>{'}'}</span>
                            <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                        </CodeBlock>
                         <p className="docs-p" style={{fontSize:'0.85rem', marginTop:'0.5rem'}}>
                            <strong>Result:</strong> "Total Damage: 15"
                        </p>
                    </div>
                </div>
            </section>

            {/* 2. COLOR LEGEND */}
            <section id="legend">
                <h2 className="docs-h2">2. The Color Legend</h2>
                <p className="docs-p">
                    The editor uses a specific palette to distinguish between Data, Actions, and Structure.
                </p>

                <table className="docs-table">
                    <thead><tr><th>Element</th><th>Color</th><th>Meaning</th></tr></thead>
                    <tbody>
                        <tr>
                            <td><strong>Structure</strong></td>
                            <td><span style={{color: C.brace1, fontWeight:'bold'}}>Gold</span> and <span style={{color: C.brace2, fontWeight:'bold'}}>Copper</span></td>
                            <td>
                                The <code>{`{ }`}</code> braces. They act as the "Frame" for your logic. 
                                The color alternates (Gold &rarr; Copper) as you nest deeper.
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Variables</strong></td>
                            <td><span style={{color: C.varLocal, fontWeight:'bold'}}>Sky Blue</span>, <span style={{color: C.varAlias, fontWeight:'bold'}}>Green</span> and <span style={{color: C.varWorld, fontWeight:'bold'}}>Pink</span></td>
                            <td>
                                <span style={{color: C.varLocal, fontWeight:'bold'}}>Sky Blue</span> for qualities (<code>$gold</code>). <span style={{color: C.varAlias, fontWeight:'bold'}}>Green</span> for Aliases (<code>@val</code>), <span style={{color: C.varWorld, fontWeight:'bold'}}>Pink</span> for World (<code>#season</code>).
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Macros</strong></td>
                            <td style={{color: C.macro, fontWeight:'bold'}}>Royal Blue</td>
                            <td>
                                Engine commands (e.g., <code>%pick</code>, <code>%chance</code>). 
                                The <strong style={{color:C.bracket}}>Deep Blue</strong> brackets<code>[ ]</code> hold the arguments.
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Math / Logic</strong></td>
                            <td style={{color: C.math, fontWeight:'bold'}}>Bold White</td>
                            <td>
                                Operators that calculate or compare values (<code>+</code>, <code>-</code>, <code>==</code>, <code>&gt;</code>).
                            </td>
                        </tr>
                         <tr>
                            <td><strong>Operators</strong></td>
                            <td style={{color: C.operator}}>Grey</td>
                            <td>
                                Assignment (<code>=</code>), separators (<code>,</code>) and text within braces.
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Flow Control</strong></td>
                            <td style={{color: C.flow, fontWeight:'bold'}}>Soft Red</td>
                            <td>
                                Symbols that split the logic block based on some operation (<code>:</code> for If/Then, <code>|</code> for Else/Random). 
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Values</strong></td>
                            <td style={{color: C.num}}>Lime Green</td>
                            <td>
                                Hardcoded numbers (<code>10</code>, <code>50</code>).
                            </td>
                        </tr>
                    </tbody>
                </table>
            </section>

            {/* 1. STRUCTURE */}
            <section id="structure">
                <h2>3. Structure (Braces)</h2>
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
                        <span style={{color: C.operator}}> Outer </span>
                        <span style={{color: C.brace2, fontWeight:'bold'}}>{'{'}</span>
                        <span style={{color: C.operator}}> Inner </span>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'{'}</span>
                        <span style={{color: C.operator}}> Deep </span>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                        <span style={{color: C.brace2, fontWeight:'bold'}}>{'}'}</span>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                    </CodeBlock>
                </div>
            </section>

            {/* 2. DATA */}
            <section id="data">
                <h2 className="docs-h2" >4. Data (Variables)</h2>
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
                <h2 className="docs-h2">5. Actions (Macros)</h2>
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
                        <span style={{color: C.operator}}>Weapons</span>
                        <span style={{color: C.bracket}}>; </span>
                        <span style={{color: C.num}}>1</span>
                        <span style={{color: C.bracket}}>]</span>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                    </CodeBlock>
                </div>
            </section>

            {/* 4. LOGIC & MATH */}
            <section id="math">
                <h2 className="docs-h2">6. Logic & Math</h2>
                <p className="docs-p">
                    The nuts and bolts of your conditions. Distinguishing between "Flow" and "Math" helps reading complex formulas.
                </p>
                
                <h3 className="docs-h3" style={{marginTop:'1.5rem', color: C.num}}>Values & Math</h3>
                <p className="docs-p">
                    <strong>Values</strong> (Numbers) are <span style={{color: C.num}}>Lime Green</span>.
                    <br/>
                    <strong>Math Operators</strong> (<code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>) are <span style={{color: C.math, fontWeight:'bold'}}>Bold White</span>.
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
                    Operators that control the <strong>Flow</strong> of logic (If/Else) are <span style={{color: C.flow, fontWeight:'bold'}}>Soft Red</span>.
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
                        <span style={{color: C.operator}}>Rich</span>
                        <span style={{color: C.flow, fontWeight:'bold'}}> | </span>
                        <span style={{color: C.operator}}>Poor</span>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                    </CodeBlock>
                </div>
            </section>

            {/* 5. SPECIAL ELEMENTS */}
            <section id="special">
                <h2 className="docs-h2">7. Special Elements</h2>
                
                <h3 className="docs-h3" style={{marginTop:'1.5rem', color: C.comment}}>Comments</h3>
                <p className="docs-p">
                    Comments start with <code>//</code> and are colored <strong style={{color: C.comment}}>Olive Green</strong>. The parser strips them out before running your code.
                </p>

                <div className="docs-card">
                    <h4 className="docs-h4">Inline Comments</h4>
                    <p className="docs-p" style={{fontSize:'0.9rem'}}>
                        Use these to annotate complex logic. The logic runs, the comment is ignored.
                    </p>
                    <CodeBlock>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'{'}</span>
                        <span style={{color: C.varLocal, fontWeight:'bold'}}> $hp </span>
                        <span style={{color: C.math, fontWeight:'bold'}}>&gt;</span>
                        <span style={{color: C.num}}> 0 </span>
                        <span style={{color: C.comment, fontStyle:'italic'}}> // Check if alive </span>
                        <span style={{color: C.brace1, fontWeight:'bold'}}>{'}'}</span>
                    </CodeBlock>
                </div>

                <div className="docs-card">
                    <h4 className="docs-h4">Ghost Blocks</h4>
                    <p className="docs-p" style={{fontSize:'0.9rem'}}>
                        If a logic block contains <strong>only</strong> a comment (starts immediately with <code>//</code>), the braces themselves turn green. This indicates the entire block is inert and will disappear from the game.
                    </p>
                    <CodeBlock>
                        <span style={{color: C.comment, fontWeight:'bold'}}>{'{'}</span>
                        <span style={{color: C.comment, fontStyle:'italic'}}>// TODO: Add combat logic here later </span>
                        <span style={{color: C.comment, fontWeight:'bold'}}>{'}'}</span>
                    </CodeBlock>
                </div>
            </section>
        </div>
    );
}