'use client'

import React from 'react';

export default function DocsPage() {
    return (
        <div className="docs-content">
            <header>
                <h1>The Chronicle Engine</h1>
                <p className="lead">
                    The Architect's Guide to building living, breathing text-based worlds.
                </p>
            </header>

            <hr className="docs-divider" />
                    
        {/* SECTION 1: PHILOSOPHY */}
            <section id="philosophy">
                <h2 className="docs-h2">1. The Philosophy of QBN</h2>
                <p className="docs-p">
                    Most interactive fiction (Twine, Choose Your Own Adventure) relies on a <strong>Branching Tree</strong> structure. 
                    You write Node A, which links to Node B and Node C. As the story grows, the tree becomes a tangled mess of wires that is hard to change.
                </p>
                <p className="docs-p">
                    Chronicle uses a <strong>State Machine</strong> approach (popularized by <em>Fallen London</em>). The story is not a map; it is a simulation.
                </p>
                
                <div className="docs-callout">
                    <h4 className="docs-h4">The "Bag of Marbles" Metaphor</h4>
                    <p>
                        Don't write a road map. <strong>Write a bag of marbles.</strong>
                    </p>
                    <p>
                        Every scene you write (a <strong>Storylet</strong>) is a marble. You throw it into the bag (the <strong>Location</strong>). 
                        When the player arrives at that location, the Engine looks at their character sheet and reaches into the bag.
                    </p>
                    <p>
                        It pulls out <em>only</em> the marbles that match the player's current <strong>Qualities</strong>.
                    </p>
                    <ul className="docs-list" style={{marginTop: '1rem'}}>
                        <li>If <code className="docs-code">Wounds &gt; 5</code>, the "Collapse" marble is pulled out.</li>
                        <li>If <code className="docs-code">Has_Key == 0</code>, the "Open Door" marble stays hidden in the bag.</li>
                    </ul>
                </div>

                <h3 className="docs-h3">The Game Loop</h3>
                <p className="docs-p">Every action in Chronicle follows this exact cycle:</p>
                <div className="docs-card">
                    <ol className="docs-list">
                        <li><strong>State Check:</strong> The engine loads the player's Qualities (Variables).</li>
                        <li><strong>Filtering:</strong> The engine scans every Storylet in the current Location and checks their <code className="docs-code">visible_if</code> conditions against the State.</li>
                        <li><strong>Rendering:</strong> Valid Storylets are displayed.</li>
                        <li><strong>Interaction:</strong> The player clicks an Option.</li>
                        <li><strong>Resolution:</strong> The engine calculates the math in the Option's <code className="docs-code">quality_change</code> field.</li>
                        <li><strong>Mutation:</strong> The player's State is updated (e.g., Gold goes down, XP goes up).</li>
                        <li><strong>Refresh:</strong> The page reloads. Because the State has changed, the Filter (Step 2) will now show a different set of Storylets.</li>
                    </ol>
                </div>
            </section>
            
            {/* SECTION 2: QUALITIES */}
            <section id="qualities">
                <h2 className="docs-h2">2. Qualities</h2>
                <p className="docs-p">
                    If it isn't a Quality, it doesn't exist. The game does not remember "Choices". It remembers "Qualities". 
                    If you want the game to remember that the player insulted the King, you give them the Quality <code>insulted_king = 1</code>.
                </p>

                <h3 className="docs-h3">Quality Types</h3>
                <table className="docs-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Name</th>
                            <th>Behavior & Math</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span className="docs-code">P</span></td>
                            <td><strong>Pyramidal</strong></td>
                            <td>
                                Used for <strong>Main Stats</strong> (Strength, Charisma) or Skills.<br/>
                                Leveling up gets exponentially harder. <br/>
                                <em>Level 1 requires 1 CP. Level 5 requires 15 CP total.</em><br/>
                                <small>Use <code>+</code> to add Change Points (CP). Use <code>=</code> to set Level directly.</small>
                            </td>
                        </tr>
                        <tr>
                            <td><span className="docs-code">C</span></td>
                            <td><strong>Counter</strong></td>
                            <td>
                                Used for <strong>Currency</strong> (Gold, Secrets) or simple Trackers.<br/>
                                Linear progression. 1 Point is exactly 1 Level.<br/>
                                <em>Good for: Money, XP, Ammo.</em>
                            </td>
                        </tr>
                        <tr>
                            <td><span className="docs-code">I</span></td>
                            <td><strong>Item</strong></td>
                            <td>
                                Inventory objects. Functionally identical to Counters, but they appear in the "Possessions" tab.<br/>
                                <small>Can track history via <code>[source:found in cave]</code> tags.</small>
                            </td>
                        </tr>
                        <tr>
                            <td><span className="docs-code">E</span></td>
                            <td><strong>Equipable</strong></td>
                            <td>
                                Items that can be worn in a slot (Head, Body, Weapon).<br/>
                                Defined with a <code>bonus</code> field (e.g., <code>$strength + 2</code>).<br/>
                                <em>When equipped, they passively boost other qualities.</em>
                            </td>
                        </tr>
                        <tr>
                            <td><span className="docs-code">S</span></td>
                            <td><strong>String</strong></td>
                            <td>
                                Stores text instead of numbers. <br/>
                                <em>Good for: Player Name, Current Title, Adjectives.</em>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </section>
            {/* SECTION 2: SCRIBESCRIPT */}
            
            <section id="scribescript">
                <h2 className="docs-h2">3. ScribeScript Syntax</h2>
                <p className="docs-p">
                    ScribeScript is the logic language used throughout the editor. You use it to define <strong>Requirements</strong>, 
                    <strong>Effects</strong>, and <strong>Dynamic Text</strong>.
                </p>

                <h3 className="docs-h3">Variables</h3>
                <p className="docs-p">Every Quality is a variable. You access them using the <code>$</code> prefix.</p>
                <table className="docs-table">
                    <tbody>
                        <tr>
                            <td><code className="docs-code">$strength</code></td>
                            <td>Returns the numeric <strong>Level</strong> of the quality.</td>
                        </tr>
                        <tr>
                            <td><code className="docs-code">$player_name</code></td>
                            <td>Returns the <strong>Text String</strong> if the quality is type String (S).</td>
                        </tr>
                        <tr>
                            <td><code className="docs-code">$item_id.description</code></td>
                            <td>Returns the static description text defined in the editor.</td>
                        </tr>
                    </tbody>
                </table>

                <h3 className="docs-h3">Logic Operators</h3>
                <p className="docs-p">Used in <code>Visible If</code>, <code>Unlock If</code>, and <code>Autofire If</code>.</p>
                <div className="docs-grid">
                    <div className="docs-card">
                        <h4>Comparison</h4>
                        <ul className="docs-props-list">
                            <li><code className="docs-code">==</code> : Equal to</li>
                            <li><code className="docs-code">!=</code> : Not Equal to</li>
                            <li><code className="docs-code">&gt;</code> : Greater than</li>
                            <li><code className="docs-code">&lt;</code> : Less than</li>
                            <li><code className="docs-code">&gt;=</code> : Greater/Equal</li>
                            <li><code className="docs-code">&lt;=</code> : Less/Equal</li>
                        </ul>
                    </div>
                    <div className="docs-card">
                        <h4>Combinators</h4>
                        <ul className="docs-props-list">
                            <li><code className="docs-code">&&</code> : <strong>AND</strong>. Both must be true.<br/><small>($a &gt; 1 && $b &gt; 1)</small></li>
                            <li><code className="docs-code">||</code> : <strong>OR</strong>. At least one must be true.<br/><small>($a &gt; 1 || $b &gt; 1)</small></li>
                            <li><code className="docs-code">( )</code> : <strong>Parentheses</strong>. Group logic.<br/><small>($a &gt; 1 && ($b &gt; 1 || $c &gt; 1))</small></li>
                        </ul>
                    </div>
                </div>

                <h3 className="docs-h3">The Math Engine</h3>
                <p className="docs-p">
                    Used in <code>Quality Changes</code>. The engine supports standard math operators.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">$gold += 10, $xp -= 5, $reputation = 0</code>
                </div>
                <table className="docs-table">
                    <thead>
                        <tr>
                            <th>Operator</th>
                            <th>Description</th>
                            <th>Behavior on Pyramidal Stats</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code className="docs-code">+=</code></td>
                            <td>Add value</td>
                            <td>Adds <strong>Change Points (CP)</strong>. Level may increase.</td>
                        </tr>
                        <tr>
                            <td><code className="docs-code">-=</code></td>
                            <td>Subtract value</td>
                            <td>Removes <strong>Change Points (CP)</strong>. Level may decrease.</td>
                        </tr>
                        <tr>
                            <td><code className="docs-code">=</code></td>
                            <td>Set value</td>
                            <td><strong>Hard Set.</strong> Sets the <strong>Level</strong> directly. Resets CP to 0.</td>
                        </tr>
                        <tr>
                            <td><code className="docs-code">++</code></td>
                            <td>Increment</td>
                            <td>Adds 1 CP.</td>
                        </tr>
                         <tr>
                            <td><code className="docs-code">*=</code></td>
                            <td>Multiply</td>
                            <td>Multiplies current Level. (Resets CP).</td>
                        </tr>
                    </tbody>
                </table>

                <h3 className="docs-h3">Text Interpolation</h3>
                <p className="docs-p">
                    You can inject logic into any text field (Title, Body, Button Label) by wrapping it in curly braces <code>{`{ }`}</code>.
                </p>

                <h4 className="docs-h4">1. Basic Injection</h4>
                <p className="docs-p">Inject a variable's value directly into the sentence.</p>
                <div className="docs-pre">
                    <code className="docs-code">"Welcome, {`{$player_name}`}. You have {`{$gold}`} coins."</code>
                </div>

                <h4 className="docs-h4">2. Conditional Text</h4>
                <p className="docs-p">
                    Change the text based on the state of the world. 
                    Syntax: <code>{`{ Condition : True Text | Else Text }`}</code>
                </p>
                <div className="docs-pre">
                    <code className="docs-code">
                        "The guard looks at you. {`{ $reputation > 10 : 'He salutes respectfully.' | 'He spits on the ground.' }`}"
                    </code>
                </div>

                <h4 className="docs-h4">3. Random Numbers</h4>
                <p className="docs-p">Generate a number between X and Y.</p>
                <div className="docs-pre">
                    <code className="docs-code">
                        "You find {`{ 1 ~ 50 }`} gold pieces."
                    </code>
                </div>
                
                <h4 className="docs-h4">4. Advanced Nesting</h4>
                <p className="docs-p">You can chain conditions (Else If) by adding more pipes <code>|</code>.</p>
                <div className="docs-pre">
                    <code className="docs-code">
                        {`{ $health < 2 : "You are dying." | $health < 5 : "You are hurt." | "You are fine." }`}
                    </code>
                </div>
            </section>

            {/* SECTION 4: STORYLETS */}
            <section id="storylets">
                <h2 className="docs-h2">4. Structure: Storylets & Events</h2>
                <p className="docs-p">
                    A <strong>Storylet</strong> is a single "screen" of content. It acts as the container for a narrative beat.
                </p>

                <h3 className="docs-h3">The Gates (Requirements)</h3>
                <p className="docs-p">
                    How does the engine decide if a Storylet should appear? You configure <strong>Visible If</strong> and <strong>Unlock If</strong> conditions.
                </p>
                <div className="docs-grid">
                    <div className="docs-card">
                        <h4>Visible If</h4>
                        <p>If this condition is false, the Storylet is <strong>invisible</strong>.</p>
                        <small>Example: <code>$quest_started == 1</code></small>
                    </div>
                    <div className="docs-card">
                        <h4>Unlock If</h4>
                        <p>If this condition is false, the Storylet is <strong>visible but greyed out</strong> (Locked).</p>
                        <small>Example: <code>$key_count {`>=`} 3</code></small>
                    </div>
                </div>

                <h3 className="docs-h3">Options (The Choices)</h3>
                <p className="docs-p">
                    Every Storylet has 1 or more Options. An Option is a button the player clicks.
                    Options have their own <code>Visible If</code> / <code>Unlock If</code> gates.
                </p>

                <h3 className="docs-h3">The Ledger (Effects)</h3>
                <p className="docs-p">
                    When an Option is chosen, it modifies the world. This is defined in the <strong>Quality Changes</strong> field.
                </p>
                <div className="docs-syntax-box">
                    <code>$gold -= 5, $reputation++, $sword = 1</code>
                </div>
                <ul className="docs-props-list">
                    <li><code>+=</code> / <code>-=</code> : Adds/Subtracts. For <em>Pyramidal</em> qualities, this adds <strong>Change Points (CP)</strong>.</li>
                    <li><code>++</code> / <code>--</code> : Shortcuts for adding/subtracting 1.</li>
                    <li><code>=</code> : <strong>Hard Set.</strong> Sets the level directly. (e.g., setting a Quest Stage to 2).</li>
                </ul>
            </section>

            {/* SECTION 3: WORLD OBJECTS */}
            <section id="objects">
                <h2 className="docs-h2">5. World Objects</h2>

                <h3 className="docs-h3">The Deck System (Cards)</h3>
                <p className="docs-p">
                    While Storylets are fixed locations, <strong>Opportunities</strong> are cards drawn from a deck. 
                    This adds randomness to your world.
                </p>
                <div className="docs-grid">
                    <div className="docs-card">
                        <h4>Hand Size</h4>
                        <p>
                            Defined in the <strong>Location</strong> settings (usually links to <code>$hand_size</code>). 
                            Determines how many cards the player can hold at once.
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4>Frequency</h4>
                        <p>
                            Determines how likely a card is to be drawn compared to others in the deck.
                            <br/><strong>Standard:</strong> Weight 10
                            <br/><strong>Frequent:</strong> Weight 20
                            <br/><strong>Rare:</strong> Weight 1
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4>The "Always" Frequency</h4>
                        <p>
                            If a card is set to <strong>Always</strong>, it ignores probability. 
                            If its requirements are met, it will be drawn <em>immediately</em> next time the player draws, skipping the shuffle.
                        </p>
                    </div>
                </div>

                <h3 className="docs-h3">Broad Difficulty (Skill Checks)</h3>
                <p className="docs-p">
                    Instead of a flat percentage (e.g. "50% chance"), QBN games often use <strong>Broad Difficulty</strong>. 
                    This scales the chance based on your stats.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">$stat &gt;= Target [Margin]</code>
                </div>
                <p className="docs-p">
                    <strong>The Formula:</strong>
                    <br/>At <code className="docs-code">Level == Target</code>, you have a <strong>60%</strong> chance.
                    <br/>At <code className="docs-code">Level == Target + Margin</code>, you have a <strong>100%</strong> chance.
                    <br/>At <code className="docs-code">Level == Target - Margin</code>, you have a <strong>0%</strong> chance.
                </p>
                <p className="docs-p">
                    <em>Example:</em> <code>$watchful &gt;= 50 [10]</code>. 
                    <br/>Level 40: 0%. Level 50: 60%. Level 60: 100%.
                </p>

                <h3 className="docs-h3">Item Sources</h3>
                <p className="docs-p">
                    Items can track where they were found. This is useful for detective games or complex economies.
                </p>
                <ul className="docs-list">
                    <li>
                        <strong>Giving an Item with Source:</strong><br/>
                        <code className="docs-code">$clue[source:found in the library] += 1</code>
                    </li>
                    <li>
                        <strong>Displaying Source:</strong><br/>
                        <code className="docs-code">"You look at the clue ({`{$clue.source}`})."</code>
                        <br/>Output: <em>"You look at the clue (found in the library)."</em>
                    </li>
                </ul>
            </section>

            {/* SECTION 5: PATTERNS */}
            <section id="patterns">
                <h2 className="docs-h2" style={{color: '#e5c07b'}}>5. QBN Design Patterns</h2>
                <p className="docs-p">
                    How do you actually make a game with this? Here are the standard architectural patterns used in Fallen London-likes.
                </p>

                <div className="docs-card" style={{borderColor: '#98c379', marginTop: '2rem'}}>
                    <h3 style={{marginTop: 0}}>Pattern A: The Carousel</h3>
                    <p>
                        <strong>Goal:</strong> Create a repeatable activity loop (e.g., Exploring a Forest).
                    </p>
                    <ol className="docs-list">
                        <li>Create a Tracker Quality: <code>$exploring_forest</code> (Pyramidal).</li>
                        <li>
                            Create 3 Storylets ("Walk Path", "Climb Tree", "Look Under Rock").
                            <br/>Requirements: <code>$exploring_forest &lt; 5</code>
                            <br/>Effect: <code>$exploring_forest += 1</code> (Progress the track).
                        </li>
                        <li>
                            Create a "Reward" Storylet ("Find the Treasure").
                            <br/>Requirement: <code>$exploring_forest &gt;= 5</code>
                            <br/>Effect: <code>$gold += 50, $exploring_forest = 0</code> (Reset the loop).
                        </li>
                    </ol>
                </div>

                <div className="docs-card" style={{borderColor: '#e06c75', marginTop: '2rem'}}>
                    <h3 style={{marginTop: 0}}>Pattern B: The Menace</h3>
                    <p>
                        <strong>Goal:</strong> Add risk to failure.
                    </p>
                    <ol className="docs-list">
                        <li>Create a Quality: <code>$suspicion</code>.</li>
                        <li>
                            In your normal storylets, add <strong>Broad Difficulty</strong> checks.
                            <br/><em>Fail Effect:</em> <code>$suspicion += 2</code>
                        </li>
                        <li>
                            Create a <strong>Must-Event</strong> (Autofire).
                            <br/>Condition: <code>autofire_if: $suspicion &gt;= 7</code>
                            <br/>Text: "The Constables arrest you!"
                            <br/>Effect: <code>move_to: prison_cell, $suspicion = 0</code>
                        </li>
                    </ol>
                </div>

                <div className="docs-card" style={{borderColor: '#61afef', marginTop: '2rem'}}>
                    <h3 style={{marginTop: 0}}>Pattern C: The Hub & Spokes</h3>
                    <p>
                        <strong>Goal:</strong> Unlock new areas.
                    </p>
                    <ol className="docs-list">
                        <li>Create a Quality: <code>$route_to_docks</code>.</li>
                        <li>
                            In the "Town Square" location, add an Option: "Hire a Carriage to the Docks".
                            <br/>Cost: <code>$gold -= 10</code>
                            <br/>Effect: <code>$route_to_docks = 1</code>
                        </li>
                        <li>
                            Create the "Docks" Location.
                            <br/><strong>Unlock Condition:</strong> <code>$route_to_docks &gt;= 1</code>
                            <br/>(Now the Docks appear on the Map).
                        </li>
                    </ol>
                </div>
            </section>

            {/* SECTION 6: ADVANCED */}
            <section id="advanced">
                <h2 className="docs-h2">6. Advanced Systems</h2>
                
                <h3 className="docs-h3">Broad Difficulty (Skill Checks)</h3>
                <p className="docs-p">
                    Instead of a flat % chance, use your stats.
                </p>
                <div className="docs-syntax-box">
                    <code>$watchful &gt;= 50 [10]</code>
                </div>
                <p className="docs-p">
                    <strong>Target:</strong> 50. <strong>Margin:</strong> 10.<br/>
                    If Watchful is 40 (Target-Margin), chance is 0%.<br/>
                    If Watchful is 50 (Target), chance is 60%.<br/>
                    If Watchful is 60 (Target+Margin), chance is 100%.
                </p>

                <h3 className="docs-h3">Item Sources</h3>
                <p className="docs-p">
                    You can track <em>where</em> a player got an item. This is useful for "Deduction" mechanics.
                </p>
                <div className="docs-code">$clue[source:Found in the library] += 1</div>
                <p className="docs-p" style={{marginTop: '1rem'}}>
                    Later, you can check this using the ScribeScript syntax (coming soon) or display it: 
                    <br/><em>"You consult the clue {`{$clue.source}`}."</em>
                </p>
            </section>

            <style jsx>{`
                .docs-content { max-width: 900px; margin: 0 auto; color: #ccc; line-height: 1.7; }
                
                .docs-h1 { font-size: 3rem; color: #fff; margin-bottom: 0.5rem; line-height: 1.1; margin-top: 0; }
                .lead { font-size: 1.3rem; color: #777; margin-bottom: 2rem; font-weight: 300; }
                .docs-divider { border: 0; border-bottom: 1px solid #333; margin: 4rem 0; }

                .docs-h2 { color: #61afef; font-size: 2.2rem; margin-top: 4rem; margin-bottom: 1.5rem; border-bottom: 1px solid #2c313a; padding-bottom: 0.5rem; scroll-margin-top: 2rem; }
                .docs-h3 { color: #98c379; font-size: 1.5rem; margin-top: 3rem; margin-bottom: 1rem; }
                .docs-h4 { color: #e5c07b; font-size: 1.1rem; margin-top: 0; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; }

                .docs-p, .docs-li { margin-bottom: 1rem; color: #c8ccd4; }
                strong { color: #fff; font-weight: 600; }
                
                .docs-callout { background: rgba(97, 175, 239, 0.1); border-left: 4px solid #61afef; padding: 1.5rem; border-radius: 4px; margin: 2rem 0; color: #d7dae0; }
                
                .docs-table { width: 100%; border-collapse: collapse; margin: 2rem 0; background: #21252b; border-radius: 8px; overflow: hidden; }
                .docs-table th, .docs-table td { border-bottom: 1px solid #333; padding: 1rem; text-align: left; vertical-align: top; }
                .docs-table th { background: #2c313a; color: #fff; font-weight: bold; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px; }
                .docs-table tr:last-child td { border-bottom: none; }
                
                .docs-pre { background: #282c34; padding: 1rem; border-radius: 6px; border: 1px solid #333; overflow-x: auto; margin: 1rem 0; }
                .docs-code { font-family: 'Consolas', 'Monaco', monospace; color: #e06c75; background: rgba(0,0,0,0.3); padding: 2px 6px; borderRadius: 4px; font-size: 0.9rem; }
                .docs-pre .docs-code { background: transparent; padding: 0; color: #98c379; }

                .docs-syntax-box { background: #1e2127; border: 1px dashed #5c6370; padding: 1.5rem; text-align: center; margin: 2rem 0; border-radius: 8px; }
                .docs-syntax-box code { font-size: 1.4rem; color: #61afef; background: none; }
                
                .docs-props-list { list-style: none; padding: 0; }
                .docs-props-list li { margin-bottom: 1.5rem; background: #21252b; padding: 1rem; border-radius: 6px; border: 1px solid #333; }
                .docs-props-list code { display: inline-block; margin-bottom: 0.5rem; color: #e5c07b; font-size: 1rem; }
                
                .docs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
                .docs-card { background: #21252b; padding: 1.5rem; border-radius: 8px; border: 1px solid #333; }
                .docs-card h4 { color: #61afef; margin-top: 0; }
                .docs-card small { display: block; margin-top: 1rem; color: #777; font-family: monospace; }
            `}</style>
        </div>
    );
}