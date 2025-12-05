'use client';

import React from 'react';

export default function LogicMathPage() {
    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">Logic & Math</h1>
                <p className="docs-lead">
                    How to control the flow of the story and update the world state.
                </p>
            </header>

            {/* SECTION 1: LOGIC */}
            <section id="logic">
                <h2 className="docs-h2">1. Logic (Requirements)</h2>
                <p className="docs-p">
                    Logic determines <strong>availability</strong>. You use logic expressions in the <code>Visible If</code> and <code>Unlock If</code> fields of Storylets and Options,
                    or inside of evaluation blocks.
                </p>

                <h3 className="docs-h3">Comparison Operators</h3>
                <table className="docs-table">
                    <thead>
                        <tr>
                            <th>Operator</th>
                            <th>Meaning</th>
                            <th>Example</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>&gt;</code></td>
                            <td>Greater Than</td>
                            <td><code>$gold &gt; 100</code> (Requires 101+)</td>
                        </tr>
                        <tr>
                            <td><code>&gt;=</code></td>
                            <td>Greater or Equal</td>
                            <td><code>$gold &gt;= 100</code> (Requires 100+)</td>
                        </tr>
                        <tr>
                            <td><code>&lt;</code></td>
                            <td>Less Than</td>
                            <td><code>$wounds &lt; 5</code></td>
                        </tr>
                        <tr>
                            <td><code>&lt;=</code></td>
                            <td>Less or Equal</td>
                            <td><code>$wounds &lt;= 5</code></td>
                        </tr>
                        <tr>
                            <td><code>==</code></td>
                            <td>Exactly Equal</td>
                            <td><code>$faction == 'Rebels'</code></td>
                        </tr>
                        <tr>
                            <td><code>!=</code></td>
                            <td>Not Equal</td>
                            <td><code>$faction != 'Empire'</code></td>
                        </tr>
                    </tbody>
                </table>

                <h3 className="docs-h3">Challenge Operators (unique to skill checks)</h3>
                <table className="docs-table">
                    <thead>
                        <tr>
                            <th>Operator</th>
                            <th>Meaning</th>
                            <th>Example</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>&gt;&gt;</code></td>
                            <td><strong>Progressive</strong></td>
                            <td><code>$stat &gt;&gt; 50</code> (Higher is better)</td>
                        </tr>
                        <tr>
                            <td><code>&lt;&lt;</code></td>
                            <td><strong>Regressive</strong></td>
                            <td><code>$suspicion &lt;&lt; 20</code> (Lower is better)</td>
                        </tr>
                        <tr>
                            <td><code>==</code></td>
                            <td><strong>Precision</strong></td>
                            <td><code>$tuning == 50</code> (Target is 100% chance)</td>
                        </tr>
                        <tr>
                            <td><code>!=</code></td>
                            <td><strong>Avoidance</strong></td>
                            <td><code>$noise != 50</code> (Target is 0% chance)</td>
                        </tr>
                    </tbody>
                </table>

                <h3 className="docs-h3">Combining Conditions</h3>
                <p className="docs-p">
                    You can create complex requirements using <strong>AND</strong> and <strong>OR</strong>.
                </p>
                <div className="docs-grid">
                    <div className="docs-card">
                        <h4 className="docs-h4">&& (AND)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>Both conditions must be true.</p>
                        <code className="docs-code">$gold &gt;= 10 && $reputation &gt; 5</code>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">|| (OR)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>At least one must be true.</p>
                        <code className="docs-code">$has_key == 1 || $lockpicking &gt; 5</code>
                    </div>
                </div>
                <div className="docs-callout">
                    <strong style={{color: '#fff'}}>Grouping:</strong> Use parentheses <code>( )</code> to group logic.
                    <br/>
                    <code className="docs-code">($gold &gt; 10 || $charisma &gt; 5) && $stamina &gt; 3</code>
                </div>
            </section>

            {/* SECTION 2: EFFECTS */}
            <section id="math">
                <h2 className="docs-h2">2. Effects (State Changes)</h2>
                <p className="docs-p">
                    Effects determine <strong>consequences</strong>. You use these in the <code>Quality Changes</code> field of an Option.
                </p>

                <h3 className="docs-h3">Math Operators</h3>
                <table className="docs-table">
                    <thead>
                        <tr>
                            <th>Operator</th>
                            <th>Meaning</th>
                            <th>Example</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>=</code></td>
                            <td>Set Value</td>
                            <td><code>$faction = 'Empire'</code> (Overwrites current value)</td>
                        </tr>
                        <tr>
                            <td><code>+=</code></td>
                            <td>Add</td>
                            <td><code>$gold += 50</code></td>
                        </tr>
                        <tr>
                            <td><code>-=</code></td>
                            <td>Subtract</td>
                            <td><code>$gold -= 10</code></td>
                        </tr>
                        <tr>
                            <td><code>*=</code></td>
                            <td>Multiply</td>
                            <td><code>$xp *= 1.5</code></td>
                        </tr>
                    </tbody>
                </table>

                <h3 className="docs-h3">Dynamic Math</h3>
                <p className="docs-p">
                    You can use logic blocks inside your effects to calculate values dynamically.
                </p>
                <div className="docs-pre">
                    <code className="docs-code">
                        $gold += {`{ $reputation * 10 }`}
                    </code>
                </div>
                <p className="docs-p">
                    This grants gold equal to 10 times the player&apos;s reputation.
                </p>
                <div className="docs-pre">
                    <code className="docs-code">
                        {`{ $reputation >= 10 : $diamond++ }, $gold += 10`}
                    </code>
                </div>
                <p className="docs-p">
                    Grants a Diamond ONLY if Reputation is 10 or higher, but always grants 10 Gold.
                </p>
            </section>

            <section id="syntax-rules">
                <h2 className="docs-h2">3. Braces vs. Parentheses</h2>
                <p className="docs-p">
                    ScribeScript uses two types of brackets. Confusing them is the most common cause of errors, so here is the rule of thumb:
                </p>

                {/* DEFINITIONS */}
                <div className="docs-grid">
                    <div className="docs-card" style={{borderColor: '#f1c40f'}}>
                        <h4 className="docs-h4" style={{color: '#f1c40f'}}>{`{ }`} The Engine Switch</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>"Stop reading text, start calculating."</strong>
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Used to inject variables or math into normal sentences.
                        </p>
                        <div className="docs-code" style={{marginTop:'10px'}}>
                            "Cost: <span style={{color: '#f1c40f'}}>{`{ ($lvl + 1) * 10 }`}</span>"
                        </div>
                    </div>

                    <div className="docs-card" style={{borderColor: '#61afef'}}>
                        <h4 className="docs-h4" style={{color: '#61afef'}}>{`( )`} The Grouper</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>"Do this part first."</strong>
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Used <em>inside</em> code to organize logic order (Order of Operations).
                        </p>
                        <div className="docs-code" style={{marginTop:'10px'}}>
                            <span style={{color: '#61afef'}}>(</span>$A || $B<span style={{color: '#61afef'}}>)</span> && $C
                        </div>
                    </div>
                </div>

                <h3 className="docs-h3">Context: When to use which?</h3>
                <p className="docs-p">
                    The Editor has two types of input fields. The rules change depending on where you are typing.
                </p>

                {/* CONTEXT EXAMPLES */}
                <div className="docs-grid">
                    {/* TEXT FIELDS */}
                    <div className="docs-card">
                        <h4 className="docs-h4">1. Text Fields</h4>
                        <small style={{display:'block', marginBottom:'1rem', color:'#888'}}>Main Text, Title, Button Labels</small>
                        
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            These are <strong>Literal Text</strong> by default.
                        </p>
                        <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                            <li>You <strong>MUST</strong> use <code>{`{ }`}</code> to insert variables.</li>
                            <li>Without braces, <code>$gold</code> is just the word "$gold".</li>
                        </ul>
                        <div className="docs-code">
                            "Hello <span style={{color: '#f1c40f'}}>{`{$name}`}</span>!"
                        </div>
                    </div>

                    {/* LOGIC FIELDS */}
                    <div className="docs-card">
                        <h4 className="docs-h4">2. Logic Fields</h4>
                        <small style={{display:'block', marginBottom:'1rem', color:'#888'}}>Visible If, Unlock If, Quality Changes</small>
                        
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            These are <strong>Code</strong> by default.
                        </p>
                        <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                            <li>You <strong>do NOT</strong> need <code>{`{ }`}</code> for basic checks.</li>
                            <li>You <strong>CAN</strong> use <code>{`{ }`}</code> to calculate dynamic targets.</li>
                            <li>You <strong>MUST</strong> use <code>( )</code> to group AND/OR logic.</li>
                        </ul>
                        
                        <div style={{marginTop:'10px'}}>
                            <small style={{color:'#888'}}>Grouping Logic:</small><br/>
                            <div className="docs-code" style={{marginBottom:'5px'}}>
                                <span style={{color: '#61afef'}}>(</span>$str &gt; 5 || $dex &gt; 5<span style={{color: '#61afef'}}>)</span> && $key
                            </div>
                            
                            <small style={{color:'#888'}}>Dynamic Math:</small><br/>
                            <div className="docs-code">
                                $gold &gt; <span style={{color: '#f1c40f'}}>{`{ $level * 50 }`}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="docs-callout" style={{borderColor: '#2ecc71'}}>
                    <strong style={{color: '#2ecc71'}}>Redundancy Check:</strong>
                    <br/>
                    Writing <code>{`{ $gold > 5 }`}</code> inside a logic field works, but the braces are redundant. 
                    <br/>Writing <code>$gold &gt; 5</code> is cleaner.
                    <br/>However, writing <code>$gold &gt; {`{ 1 ~ 6 }`}</code> is powerful—it makes the requirement random every time!
                </div>
            </section>

            {/* SECTION 3: PYRAMIDAL VS LINEAR */}
            <section id="pyramidal">
                <h2 className="docs-h2">4. The Pyramidal Curve</h2>
                <p className="docs-p">
                    Chronicle Hub supports two types of numeric progression. It is vital to understand the difference.
                </p>

                <div className="docs-grid">
                    <div className="docs-card" style={{borderColor: '#e5c07b'}}>
                        <h4 className="docs-h4">Linear (Counter)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>1 Point = 1 Level.</strong><br/>
                            Used for Currency, Items, and simple Trackers.
                        </p>
                        <div className="docs-code">$gold += 1</div>
                        <p className="docs-p" style={{fontSize: '0.8rem', marginTop: '0.5rem'}}>
                            Result: You gain exactly 1 Gold.
                        </p>
                    </div>
                    <div className="docs-card" style={{borderColor: '#61afef'}}>
                        <h4 className="docs-h4">Pyramidal (Exponential)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>1 Point = 1 Change Point (CP).</strong><br/>
                            Used for Skills, Main Stats and more complex progress tracking.
                        </p>
                        <div className="docs-code">$strength += 1</div>
                        <p className="docs-p" style={{fontSize: '0.8rem', marginTop: '0.5rem'}}>
                            Result: You gain 1 CP. You might gain a level yet, but you have made progress towards a quality level.
                        </p>
                    </div>
                </div>

                <h3 className="docs-h3">The Formula</h3>
                <p className="docs-p">
                    To reach the <em>next</em> level, you need CP equal to <code>Current Level + 1</code>.
                </p>
                <table className="docs-table">
                    <thead>
                        <tr><th>Level</th><th>CP to Next</th><th>Total CP</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>1</td><td>2</td><td>1</td></tr>
                        <tr><td>2</td><td>3</td><td>3</td></tr>
                        <tr><td>3</td><td>4</td><td>6</td></tr>
                        <tr><td>4</td><td>5</td><td>10</td></tr>
                        <tr><td>5</td><td>6</td><td>15</td></tr>
                    </tbody>
                </table>
                <div className="docs-callout">
                    <strong style={{color: '#fff'}}>Pro Tip:</strong> To force a level up regardless of CP, use the <code>=</code> operator.
                    <br/>
                    <code className="docs-code">$strength = 5</code> sets the level to 5 immediately and resets CP to 0.
                </div>
            </section>
        </div>
    );
}