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

                <h3 className="docs-h3">Living Stories (Time Delays)</h3>
                <p className="docs-p">
                    You can schedule a quality change to happen in the future.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">$schedule[$ship_arrived = 1 : 4h]</code>
                </div>
                <p className="docs-p">
                    This sets <code>$ship_arrived</code> to 1 exactly 4 hours from now, even if the player is offline.
                </p>
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
                    The <code>Challenge</code> field supports a powerful <strong>Difficulty</strong> syntax. You can define complex probability curves that adapt to the player's stats.
                </p>
                
                <h3 className="docs-h3">The Syntax</h3>
                <div className="docs-syntax-box">
                    <code className="docs-code">$stat &gt;= Target [Margin, Min, Max, Pivot]</code>
                </div>
                <p className="docs-p">
                    The parser is <strong>Progressive</strong>. You only need to define as much as you need. Defaults are applied automatically.
                </p>

                <table className="docs-table">
                    <thead><tr><th>Input</th><th>Resulting Logic</th></tr></thead>
                    <tbody>
                        <tr>
                            <td><code>$stat &gt;= 50</code></td>
                            <td><strong>Target.</strong> All defaults apply here. At <code>$stat 0</code>, the player will have 0% chance of success. At <code>$stat 0</code>
                            they will have a 60% chance of success (Pefault Pivot), and at <code>$stat 100</code> they will have a 100% chance of success. All <code>$stat</code>
                            scores in-between will be calculated along this graph, so a score between 0 and 50 will give a probability between 0% and 60%.</td>
                        </tr>
                        <tr>
                            <td><code>$stat &gt;= 50 [10]</code></td>
                            <td>
                            <strong>Margin.</strong> 
                            The way the minimum required score for 0% and the maximum required score for 100% is calculated. The margin is calculated based on the difficulty
                            by subtracting the margin from the target for the minimum, and adding the margin to the target for the maximum. The margin defaults to the Target score
                            unless explicitly set, so a Target of 50 will have 0% at 0 and 100% at 100, whereas a target of 70 will have 0% at 0, and 100% at 140.
                            <br/><br/>40: 0% (Target-Margin)<br/>50: 60% (Default Pivot)<br/>60: 100% (Target+Margin)
                            </td>
                        </tr>
                        <tr>
                            <td><code>$stat &gt;= 50 [10, 10, 90]</code></td>
                            <td><strong>Clamp.</strong> Same as above, but chance never drops below 10% or rises above 90%. The first number defines the minimum,
                            the second the maximum.</td>
                        </tr>
                        <tr>
                            <td><code>$stat &gt;= 50 [10, 0, 100, 30]</code></td>
                            <td>
                                <strong>Pivot.</strong> Reaching the target (50) only grants a 30% chance. 
                                <br/>This means going from <code>$stat 40</code> to <code>$stat 50</code> will only give you a 3% probability increase per level, 
                                but once you reach <code>$stat 50</code>, each step towards <code>$stat 60</code> grants a 7% success probability.
                                The pivot serves as a hard kink in the probability curve, and defaults to 60 so players can feel their skills
                                affecting checks slightly more quickly, but makes them work a little harder to reach the 100% success probability.
                            </td>
                        </tr>
                    </tbody>
                </table>

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
                    <br/><code>&lt;= 40</code> means a <strong>40% Chance</strong> of success (Rolling 1-40).
                    <br/><code>&gt;= 90</code> means an <strong>11% Chance</strong> of success (Rolling 90-100).
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
                        {`{ $strength + { $crowbar >= 1 : 10 | 0 } }`} &gt;= 50
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
                        {`{ $persuasion > 0 : $persuasion + $charisma | $persuasion }`} &gt;= 50 [10]
                    </code>
                </div>
                <p className="docs-p">In the above example, if the player has the <code>$persuasion</code> quality, it will be explicitly added to the calculation, otherwise, it is ignored.
                This is good if you want to hide qualities from the player in the challenge field.</p>
                <div className="docs-pre">
                    <code className="docs-code">
                        $dexterity &gt;= 50 [10, 0, {`{ $surgery > 20 : 100 | $surgery > 0 : {80 + $surgery} | 80 }`}]
                    </code>
                </div>
                <p className="docs-p">
                    In this example, the player will attempt to perform surgery using their dexterity. Because they aren't trained, they are not allowed
                    a higher success chance than 80%. However, if they have the <code>$surgery</code> quality, the clamp is removed based on their skill at surgery.
                </p>
                <div className="docs-pre">
                    <code className="docs-code">
                        $strength &gt;= {`{ $enemy_level * 10 }`} [20]
                    </code>
                </div>
                <p className="docs-p">Make the difficulty scale with the enemy's level. Useful for encounters where the enemy or their skills are randomised somehow</p>
                <div className="docs-pre">
                    <code className="docs-code">
                        {`{ $strength - $wounds }`} &gt;= {`{ $enemy_level * 10 }`}
                    </code>
                </div>
                <p className="docs-p">This makes it so the check becomes more difficult over time as you are wounded.</p>
                <div className="docs-pre">
                    <code className="docs-code">
                        $luck {`<= $driving`}
                    </code>
                </div>
                <p className="docs-p">This specific syntax would make skill checks function like a more traditional d100 system, where a simple 1 - 100 check
                    is performed against your <code>$driving</code> quality.
                </p>
            </section>
        </div>
    );
}