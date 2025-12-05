'use client';

import ProbabilityChart from '@/components/admin/ProbabilityChart';
import React, { useState } from 'react';
import SparkleIcon from '@/components/icons/SparkleIcon';

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

                <h4 className="docs-h4">Vertical Formatting</h4>
                <p className="docs-p">
                    You can format complex logic vertically for readability. The engine ignores and removes the newlines.
                </p>
                <div className="docs-pre">
                    <code className="docs-code" style={{ whiteSpace: 'pre' }}>
{`{ 
$health < 2 : You are dying. | 
$health < 5 : You are hurt. | 
You are fine. 
}`}
                    </code>
                </div>
                
                <div className="docs-callout" style={{ borderColor: '#2ecc71' }}>
                    <strong style={{color: '#2ecc71'}}>Note:</strong> Unlike some text parsers, quotes are not required for text inside logic blocks. You are free to reserve these for actual quotes or spoken text.
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

            {/* SECTION 6: ADVANCED */}
            <section id="advanced">
                <h2 className="docs-h2">6. Advanced Operations</h2>

                <h3 className="docs-h3">Batch Operations</h3>
                <p className="docs-p">
                    Sometimes you need to clear or modify many qualities at once. For example, when a player goes to Jail, you might want to remove all "Contraband".
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

                <h3 className="docs-h3">Living Stories (Time Delays)</h3>
                <p className="docs-p">
                    You can schedule a quality change to happen in the future, even if the player is offline.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">$schedule[$ship_arrived = 1 : 4h]</code>
                </div>
                <ul className="docs-props-list">
                    <li><strong>Syntax:</strong> <code>$schedule[ Effect : Time ]</code></li>
                    <li><strong>Time Units:</strong> <code>m</code> (minutes), <code>h</code> (hours).</li>
                    <li><strong>Cancel:</strong> <code>$cancel[$ship_arrived]</code> stops the timer.</li>
                </ul>

                <h3 className="docs-h3">World Qualities (Global State)</h3>
                <p className="docs-p">
                    Variables shared by <strong>all players</strong> in the game (e.g., "The Season", "War Progress").
                </p>
                
                <h4 className="docs-h4">Reading</h4>
                <p className="docs-p">World qualities create a local copy for the player to access. As such, you can access them using both 
                    the <code>local</code> scope, or the <code>world</code> scope.</p>
                <div className="docs-syntax-box">
                    <code className="docs-code">"The season is currently {`{$season}`}."</code>
                    <br/><small>or</small><br/>
                    <code className="docs-code">"The season is currently {`{$world.season}`}."</code>
                    <br/><small>or</small><br/>
                    <code className="docs-code">"The season is currently {`{$season[scope:world]}`}."</code>
                </div>

                <h4 className="docs-h4">Writing</h4>
                <p className="docs-p">
                    You must explicitly target the world scope to modify them.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">$world.season = 'Winter'</code>
                    <br/><small>or</small><br/>
                    <code className="docs-code">$war_progress[scope:world] += 5</code>
                </div>
                <div className="docs-callout" style={{borderColor: '#e06c75'}}>
                    <strong style={{color: '#e06c75'}}>Warning: </strong> 
                    If you write <code>$season = 'Winter'</code> without the prefix, you create a <strong>local copy</strong> for that player only, desyncing them from the world.
                    Also, it's better not to use the equals (<code>=</code>) operator in this fashion, unless you want multiple players to affect the value directly.
                    The creator studio has a GM console suited for initialising and setting world qualities in this way.
                </div>
            </section>
            <section id="sources">
                <h2 className="docs-h2">6.1 Advanced: Item Sources</h2>
                <p className="docs-p">
                    Items in Chronicle Hub memorize where they came from. This allows for callbacks to the <em>origin</em> of an item in the text.
                </p>

                <h3 className="docs-h3">Setting the Source</h3>
                <p className="docs-p">
                    In the <strong>Quality Changes</strong> field (or the Market Editor), use the source tag:
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">$ancient_coin[source:found in the ruins] += 1</code>
                </div>
                <h3 className="docs-h3">Displaying the Source</h3>
                <p className="docs-p">
                    You can recall this string later in your narrative text.
                </p>
                <div className="docs-pre">
                    <code className="docs-code">
                        "You take out the coin you {`{$ancient_coin.source}`}."
                    </code>
                </div>
                <p className="docs-p">
                    <strong>Result:</strong> <em>"You take out the coin you found in the ruins."</em>
                </p>
                <div className="docs-callout" style={{borderColor: '#e06c75'}}>
                    <strong style={{color: '#e06c75'}}>Warning:</strong> The engine inserts the <strong>exact string</strong> you saved. 
                    <br/>If you saved <code>[source:Found In The Ruins]</code>, the sentence will look odd: <br/><em>"...coin you Found In The Ruins."</em>
                    <br/>Always check your capitalization!
                </div>

                <h3 className="docs-h3">The Pruning Logic</h3>
                <p className="docs-p">
                    What happens if you have 5 coins "found in ruins" and 5 coins "won at poker"? 
                    The engine maintains a history list. When you spend items, the engine must decide which "Source" was spent.
                </p>
                <ul className="docs-list">
                    <li>The engine uses a <strong>Weighted FIFO</strong> (First-In, First-Out) system.</li>
                    <li>It prioritizes removing duplicates first. And if many items are spent at once, it will remove as many duplicates as it reasonably.</li>
                    <li>If you spent half your coins, it will also try to prune half the sources for that coin, but <em>only</em> if these are duplicate sources.</li>
                    <li>If you have mixed sources, it will try to preserve unique history tags as long as possible.</li>
                </ul>
            </section>
            <section id="challenges">
                <h2 className="docs-h2">6.2 Advanced: Skill Checks</h2>
                <p className="docs-p">
                    The <code>Challenge</code> field supports a powerful <strong>Probability Curve</strong> syntax.
                </p>
                
                <h3 className="docs-h3">The Syntax</h3>
                <div className="docs-syntax-box">
                    <code className="docs-code">$stat &gt;&gt; Target [Margin, Min, Max, Pivot]</code>
                </div>

                <h3 className="docs-h3">Operators</h3>
                <ul className="docs-props-list">
                    <li><code>&gt;&gt;</code> <strong>Progressive:</strong> Higher stats increase chance (Standard RPG check).</li>
                    <li><code>&lt;&lt;</code> <strong>Regressive:</strong> Lower stats increase chance (Stealth, Suspicion).</li>
                    <li><code>==</code> <strong>Precision:</strong> You must be exactly at the Target. Chance drops as you move away.</li>
                    <li><code>!=</code> <strong>Avoidance:</strong> You must be far from the Target. Chance drops as you get closer.</li>
                </ul>

                <h3 className="docs-h3">Parameters</h3>
                <table className="docs-table">
                    <thead><tr><th>Param</th><th>Description</th><th>Default</th></tr></thead>
                    <tbody>
                        <tr>
                            <td><strong>Target</strong></td>
                            <td>The difficulty level to beat.</td>
                            <td>Required</td>
                        </tr>
                        <tr>
                            <td><strong>Margin</strong></td>
                            <td>The "Width" of the difficulty curve. <br/><small>Target +/- Margin = 0% or 100%.</small>
                            <br/>This determines at what <em>stat</em> or <em>operator</em> level the min and max values are applied. 
                            The default calculates this as <code>target - target</code>, and <code>target + target</code>.
                            For example:
                            <br/>With <code>$stat &gt;&gt; 50</code>, you have a 0% success chance at 0, and a 100% success chance at 100.
                            <br/>With<code>$stat &gt;&gt; 50 [20]</code>, you have a 0% success chance at 30, and a 100% success chance at 80.
                            </td>
                            <td>Target</td>
                        </tr>
                        <tr>
                            <td><strong>Min/Max</strong></td>
                            <td>Hard caps on success chance (e.g., always 1% fail chance if you set max to 99, or always a 10% success chance if you set min to 10).</td>
                            <td>0, 100</td>
                        </tr>
                        <tr>
                            <td><strong>Pivot</strong></td>
                            <td>
                                The Success Chance (%) when your Skill equals the Target.
                                <br/><em>Setting this to <strong>30</strong> makes the check "Hard" (you need to exceed the target to get good odds).</em>
                                <br/><em>Setting this to <strong>80</strong> makes the check "Easy" (meeting the target is mostly sufficient).</em>
                            </td>
                            <td>60</td>
                        </tr>
                    </tbody>
                </table>

                <h3 className="docs-h3">Visualizing the Math</h3>
                <p className="docs-p">
                    Balancing probability curves in your head can be challenging. Use the interactive tool below to test your settings.
                </p>
                
                <ProbabilityPlayground />

                <div className="docs-callout" style={{borderColor: '#61afef'}}>
                    <strong style={{color: '#61afef'}}>Pro Tip: Use the Assistant</strong>
                    <br/>
                    When you click the <strong>Logic Button</strong> (Sparkle Icon <SparkleIcon className="w-3 h-3"/>) and select "Challenge", the editor displays 
                    a <strong>Live Graph</strong> like the one above.
                    <br/><br/>
                    This visualizes <em>Skill Level (X)</em> vs <em>Success Chance (Y)</em>. You can drag the "Pivot" slider 
                    to see exactly how the curve "kinks" at the target level, ensuring the game feels fair.
                </div>

                <h3 className="docs-h3">The Luck Quality</h3>
                <p className="docs-p">
                    ScribeScript has a special reserved quality called <code>$luck</code>. 
                    Unlike other qualities, which are fixed numbers, <code>$luck</code> generates a new random number (1-100) every time it is checked.
                    This means you can still define <code>$luck</code> as a seperate quality in your quality definitions, but it will always use this unique logic
                    if the parser encounters this keyword.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">$luck &lt;= 40</code>
                </div>
                <p className="docs-p">
                    This represents a <strong>Raw Percentage Check</strong>.
                    <br/><code>{`<<`} 40</code> means a <strong>40% Chance</strong> of success (Rolling 1-40).
                    <br/><code>{`>>`} 90</code> means an <strong>11% Chance</strong> of success (Rolling 90-100).
                </p>
                <div className="docs-callout" style={{borderColor: '#f1c40f'}}>
                    <strong style={{color: '#f1c40f'}}>Note on Modifiers:</strong>
                    <br/>
                    Because <code>$luck</code> is a raw probability check, it <strong>ignores</strong> the bracket modifiers <code>[Margin, Min, Max]</code>. 
                    <br/>If you want a 40% chance, simply write <code>$luck &lt;= 40</code>. You do not need a margin to calculate the curve.
                </div>

                <h3 className="docs-h3">Dynamic Logic Examples</h3>
                <p className="docs-p">
                    You can nest logic blocks <code>{`{ }`}</code> inside the challenge field to create highly dynamic difficulty.
                </p>

                <h4 className="docs-h4">Conditional Bonus & Difficulty</h4>
                <p className="docs-p">Add a bonus to the roll <strong>only if</strong> the player has a specific item.</p>
                <div className="docs-pre">
                    <code className="docs-code">
                        {`{ $strength + { $crowbar >= 1 : 10 | 0 } }`} {`>>`} 50
                    </code>
                </div>
                <p className="docs-p">
                    If the player has one or more of the <code>$crowbar</code> item, the check uses <code>$strength + 10</code>. Otherwise, raw Strength.
                    <br/><br/>This can be useful if a challenge would require a specific item or training which you don't want to simply count as equipment.
                    It might also be useful in case you only want to display a particular skill being added <em>if</em> you actually have that skill, or change
                    the skill clamp based on whether you are an expert in the field or not.
                </p>
                <div className="docs-pre">
                    <code className="docs-code">
                        {`{ $persuasion > 0 : $persuasion + $charisma | $persuasion }`} {`>>`} 50 [10]
                    </code>
                </div>
                <p className="docs-p">In the above example, if the player has the <code>$persuasion</code> quality, it will be explicitly added to the calculation, otherwise, it is ignored.
                This is good if you want to hide qualities from the player in the challenge field.</p>
                <div className="docs-pre">
                    <code className="docs-code">
                        $dexterity {`>>`} 50 [10, 0, {`{ $surgery > 20 : 100 | $surgery > 0 : {80 + $surgery} | 80 }`}]
                    </code>
                </div>
                <p className="docs-p">
                    In this example, the player will attempt to perform surgery using their dexterity. Because they aren't trained, they are not allowed
                    a higher success chance than 80%. However, if they have the <code>$surgery</code> quality, the clamp is removed based on their skill at surgery.
                </p>
                <div className="docs-pre">
                    <code className="docs-code">
                        $strength {`>>`} {`{ $enemy_level * 10 }`} [20]
                    </code>
                </div>
                <p className="docs-p">Make the difficulty scale with the enemy's level. Useful for encounters where the enemy or their skills are randomised somehow</p>
                <div className="docs-pre">
                    <code className="docs-code">
                        {`{ $strength - $wounds }`} {`>>`} {`{ $enemy_level * 10 }`}
                    </code>
                </div>
                <p className="docs-p">This makes it so the check becomes more difficult over time as you are wounded.</p>
                <div className="docs-pre">
                    <code className="docs-code">
                        $luck {`<< $driving`}
                    </code>
                </div>
                <p className="docs-p">This specific syntax would make skill checks function like a more traditional d100 system, where a simple 1 - 100 check
                    is performed against your <code>$driving</code> quality.
                </p>
            </section>
        </div>
    );
}

// --- INTERACTIVE PLAYGROUND COMPONENT ---
function ProbabilityPlayground() {
    const [op, setOp] = useState('>>');
    const [target, setTarget] = useState(50);
    const [margin, setMargin] = useState(10);
    const [pivot, setPivot] = useState(60);
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(100);

    return (
        <div className="docs-card" style={{ marginTop: '1rem', border: '1px solid #61afef' }}>
            <h4 style={{ marginTop: 0, color: '#61afef' }}>Interactive Probability Chart</h4>
            <p className="docs-p" style={{ fontSize: '0.85rem' }}>
                Adjust the values to see how the difficulty curve reacts.
            </p>
            
            <div style={{ margin: '1rem 0' }}>
                <ProbabilityChart 
                    operator={op} 
                    target={target} 
                    margin={margin} 
                    minCap={min} 
                    maxCap={max} 
                    pivot={pivot} 
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                <div>
                    <label style={{ display: 'block', color: '#aaa', marginBottom: '4px' }}>Operator</label>
                    <select 
                        value={op} 
                        onChange={(e) => setOp(e.target.value)}
                        style={{ width: '100%', background: '#111', border: '1px solid #444', color: '#fff', padding: '4px', borderRadius: '4px' }}
                    >
                        <option value=">>">{">>"}</option>
                        <option value="<<">{"<<"}</option>
                        <option value="==">{"=="}</option>
                        <option value="!=">{"!="}</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', color: '#aaa', marginBottom: '4px' }}>Target Level ({target})</label>
                    <input type="range" min="0" max="100" value={target} onChange={(e) => setTarget(parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>
                
                <div>
                    <label style={{ display: 'block', color: '#aaa', marginBottom: '4px' }}>Pivot Chance ({pivot}%)</label>
                    <input type="range" min="1" max="99" value={pivot} onChange={(e) => setPivot(parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div>
                    <label style={{ display: 'block', color: '#aaa', marginBottom: '4px' }}>Margin (+/- {margin})</label>
                    <input type="range" min="0" max="50" value={margin} onChange={(e) => setMargin(parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>

                {/* --- NEW SLIDERS --- */}
                <div>
                    <label style={{ display: 'block', color: '#e74c3c', marginBottom: '4px' }}>Min Cap ({min}%)</label>
                    <input type="range" min="0" max="50" value={min} onChange={(e) => setMin(parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div>
                    <label style={{ display: 'block', color: '#e74c3c', marginBottom: '4px' }}>Max Cap ({max}%)</label>
                    <input type="range" min="50" max="100" value={max} onChange={(e) => setMax(parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#111', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#98c379', textAlign: 'center' }}>
                $stat {op} {target} [{margin}, {min}, {max}, {pivot}]
            </div>
        </div>
    );
}