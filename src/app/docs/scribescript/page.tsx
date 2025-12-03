'use client';

import React from 'react';

export default function ScribeScriptSyntaxPage() {
    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">ScribeScript Syntax</h1>
                <p className="docs-lead">
                    How to write dynamic text that changes based on the state of the world.
                </p>
            </header>

            <section id="basics">
                <h2 className="docs-h2">1. The Basics</h2>
                <p className="docs-p">
                    ScribeScript is the template language used inside Storylets, Options, and Qualities.
                </p>
                <div className="docs-callout">
                    <h4 className="docs-h4">The Curly Brace Rule</h4>
                    <p className="docs-p">
                        The Engine reads everything as plain text <strong>unless</strong> it is wrapped in curly braces <code>{`{ ... }`}</code>.
                    </p>
                    <p className="docs-p">
                        Braces tell the Engine: <em>"Stop reading. Start calculating."</em>
                    </p>
                </div>
            </section>

            <section id="variables">
                <h2 className="docs-h2">2. Variables</h2>
                <p className="docs-p">
                    To display the value of a Quality, use the <code>$</code> prefix inside a logic block.
                </p>
                
                <div className="docs-grid">
                    <div className="docs-card">
                        <h4 className="docs-h4">Numbers</h4>
                        <p className="docs-p">
                            Most qualities resolve according to their quality <strong>level</strong>
                        </p>
                        <div className="docs-pre">
                            <code className="docs-code">"You have {`{$gold}`} coins."</code>
                        </div>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Output: <em>"You have 50 coins."</em>
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">Text (Strings)</h4>
                        <p className="docs-p">
                            <strong>String</strong> qualities resolve according to their <strong>string value</strong>
                        </p>
                        <div className="docs-pre">
                            <code className="docs-code">"Greetings, {`{$player_name}`}."</code>
                        </div>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Output: <em>"Greetings, John."</em>
                        </p>
                    </div>
                </div>

                <h3 className="docs-h3">Accessing Properties</h3>
                <p className="docs-p">
                    You can access specific data fields of a Quality using dot notation.
                </p>
                <ul className="docs-props-list">
                    <li><code>$item.name</code>: The display name of the quality.</li>
                    <li><code>$item.description</code>: The description text defined in the editor.</li>
                </ul>
                <div className="docs-pre">
                    <code className="docs-code">"You look at the sword. {`{$iron_sword.description}`}"</code>
                </div>
            </section>

            <section id="conditional">
                <h2 className="docs-h2">3. Conditional Text</h2>
                <p className="docs-p">
                    You can make text appear or change based on the world state using the <strong>Colon-Pipe</strong> syntax.
                </p>
                <div className="docs-syntax-box">
                    <code>{`{ Condition : Text If True | Text If False }`}</code>
                </div>
                
                <h4 className="docs-h4">Simple Branch</h4>
                <div className="docs-pre">
                    <code className="docs-code">
                        "The guard looks at you. {`{ $reputation > 10 : He salutes. | He ignores you. }`}"
                    </code>
                </div>

                <h4 className="docs-h4">Multi-Branch (Chaining)</h4>
                <p className="docs-p">
                    You can chain multiple conditions. The engine uses the first one that matches.
                </p>
                <div className="docs-pre">
                    <code className="docs-code">
                        {`{ $health < 2 : You are dying. | $health < 5 : You are hurt. | You are fine. }`}
                    </code>
                </div>

                <h4 className="docs-h4">Easy formatting</h4>
                <p className="docs-p">
                    You can even format the condtional statements vertically, and it will resolve as if it were written on a single line.
                </p>
                <div className="docs-pre">
                    <code className="docs-code">
                        {`{ $health < 2 : You are dying.`}<br />
                        {`| $health < 5 : You are hurt.`}<br />
                        {`| You are fine. }`}
                    </code>
                </div>
                
                <div className="docs-callout" style={{ borderColor: '#f1c40f' }}>
                    <strong style={{color: '#f1c40f'}}>Important Note on Quotes:</strong>
                    <br/>
                    Inside a logic block, if you are writing text, you don't need to wrap it in quotes. Quotes can be used as if they are normal text.
                </div>
            </section>

            <section id="random">
                <h2 className="docs-h2">4. Randomness</h2>
                <p className="docs-p">
                    You can generate random numbers for flavor text using the Tilde <code>~</code> operator.
                </p>
                <div className="docs-syntax-box">
                    <code>{`{ Min ~ Max }`}</code>
                </div>
                <div className="docs-pre">
                    <code className="docs-code">
                        "The merchant asks for {`{ 5 ~ 10 }`} gold coins."
                    </code>
                </div>
                <p className="docs-p">
                    This is often combined with Math to create variable rewards:
                    <br/>
                    <code>$gold += {`{ 10 + { 1 ~ 6 } }`}</code> (Gain 10 gold plus a d6 roll).
                </p>
            </section>

            <section id="markdown">
                <h2 className="docs-h2">5. Formatting</h2>
                <p className="docs-p">
                    Chronicle supports basic Markdown styling for emphasis.
                </p>
                <table className="docs-table">
                    <thead>
                        <tr><th>Style</th><th>Syntax</th><th>Result</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Bold</td>
                            <td><code>**text**</code></td>
                            <td><strong>text</strong></td>
                        </tr>
                        <tr>
                            <td>Italic</td>
                            <td><code>*text*</code> or <code>_text_</code></td>
                            <td><em>text</em></td>
                        </tr>
                    </tbody>
                </table>
            </section>
        </div>
    );
}