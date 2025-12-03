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
                    And this example grants a diamond on top of your 10 gold reward, if your reputation quality is equal to or greater than 10.
                </p>
            </section>

            {/* SECTION 3: PYRAMIDAL VS LINEAR */}
            <section id="pyramidal">
                <h2 className="docs-h2">3. The Pyramidal Curve</h2>
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
                            Result: You gain 1 CP. You might not level up yet.
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

            {/* SECTION 4: ADVANCED */}
            <section id="advanced">
                <h2 className="docs-h2">4. Advanced Operations</h2>

                <h3 className="docs-h3">Batch Operations</h3>
                <p className="docs-p">
                    Sometimes you need to clear many qualities at once. For example, when a player goes to Jail, you might want to remove all "Contraband".
                </p>
                <p className="docs-p">
                    Instead of writing <code>$stolen_goods = 0, $smuggled_wine = 0...</code>, you can target a <strong>Category</strong>.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">$all[category_name] = 0</code>
                </div>
                <p className="docs-p">
                    This finds every quality tagged with that category and sets it to 0.
                </p>
            </section>
        </div>
    );
}