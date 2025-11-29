'use client'

import React from 'react';

export default function DocsPage() {
    return (
        <div className="docs-content">
            <header>
                <h1>The Chronicle Engine</h1>
                <p className="lead">
                    A complete guide to building narrative RPGs, living worlds, and complex state machines using the Chronicle Hub platform.
                </p>
            </header>

            <hr className="divider" />
                    
                    {/* SECTION 1: PHILOSOPHY */}
                    <section id="philosophy">
                        <h2>1. What is Quality-Based Narrative?</h2>
                        <p>
                            Most interactive fiction uses a <strong>Branching Tree</strong> structure. You start at Chapter 1. You choose path A or B. 
                            Path A leads to Chapter 2. The author must manually link every scene to the next.
                        </p>
                        <p>
                            Chronicle Hub uses a <strong>State Machine</strong> approach (similar to <em>Fallen London</em> or <em>Sunless Sea</em>).
                        </p>
                        
                        <div className="callout">
                            <strong>The Soup Metaphor:</strong> Imagine your story isn't a road, but a bag of marbles. 
                            Every scene you write (a <em>Storylet</em>) is a marble thrown into the bag.
                            <br/><br/>
                            When the player plays, the Engine looks at their character's stats (<em>Qualities</em>) and reaches into the bag. 
                            It pulls out only the marbles that match the player's current state.
                        </div>

                        <h3>The Core Loop</h3>
                        <ol>
                            <li><strong>State:</strong> The Player has qualities (e.g., <code>Wounds: 0</code>, <code>Gold: 10</code>).</li>
                            <li><strong>Filter:</strong> The Engine finds Storylets where <code>Visible If: $gold {`>=`} 5</code>.</li>
                            <li><strong>Choice:</strong> The Player chooses an Option.</li>
                            <li><strong>Effect:</strong> The Option changes the State (e.g., <code>$gold -= 5</code>, <code>$sword += 1</code>).</li>
                            <li><strong>Repeat:</strong> The Engine looks at the <em>new</em> state and finds new Storylets.</li>
                        </ol>
                    </section>

                    {/* SECTION 2: QUALITIES */}
                    <section id="qualities">
                        <h2>2. Qualities: The Atoms of the World</h2>
                        <p>
                            If it isn't a Quality, it doesn't exist. The game does not remember "Choices". It remembers "Qualities".
                        </p>

                        <h3>Quality Types</h3>
                        <table className="docs-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Description</th>
                                    <th>Math Behavior</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Pyramidal (P)</strong></td>
                                    <td>Used for <strong>Main Stats</strong>. Leveling up gets harder the higher you go.</td>
                                    <td>
                                        <code>+</code> adds <strong>Change Points (CP)</strong>.<br/>
                                        <code>=</code> sets <strong>Level</strong> directly.
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Counter (C)</strong></td>
                                    <td>Used for <strong>Currency and Trackers</strong>. Linear progression.</td>
                                    <td>1 Point is exactly 1 Level.</td>
                                </tr>
                                <tr>
                                    <td><strong>Item (I)</strong></td>
                                    <td>Inventory objects. Can track <strong>Sources</strong> (history).</td>
                                    <td>Linear. Appears in "Possessions".</td>
                                </tr>
                                <tr>
                                    <td><strong>Equipable (E)</strong></td>
                                    <td>Items that can be worn to boost stats.</td>
                                    <td>Has a <code>bonus</code> field (e.g. <code>$strength + 1</code>).</td>
                                </tr>
                                <tr>
                                    <td><strong>String (S)</strong></td>
                                    <td>Text storage (Names, Titles).</td>
                                    <td>Stores text instead of numbers.</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    {/* SECTION 3: SCRIBESCRIPT */}
                    <section id="scribescript">
                        <h2>3. ScribeScript Logic</h2>
                        <p>
                            ScribeScript is the logic language used throughout the editor. You can use it in 
                            <strong>Requirements</strong>, <strong>Quality Changes</strong>, and even inside <strong>Narrative Text</strong>.
                        </p>

                        <h3>Variable Injection</h3>
                        <p>Use <code>$quality_id</code> to inject values.</p>
                        <div className="code-block">
                            <code>"You have $gold gold coins and your rank is $rank."</code>
                        </div>
                        <ul>
                            <li>If numeric, it outputs the level.</li>
                            <li>If string, it outputs the text.</li>
                            <li>Use <code>$id.description</code> to inject the quality's static description.</li>
                        </ul>

                        <h3>The Logic Block <code>{`{ ... }`}</code></h3>
                        <p>Any text wrapped in curly braces is evaluated by the Scribe before display.</p>

                        <h4>1. Conditional Text (Branching)</h4>
                        <p>Display text based on game state. Use pipes <code>|</code> to separate branches.</p>
                        <div className="code-block">
                            <pre>{`{ 
  $mettle >= 10 : "You stand tall." | 
  $mettle >= 5 : "You tremble slightly." | 
  "You cower in fear." 
}`}</pre>
                        </div>
                        <p>The engine checks from left to right. The first match wins.</p>

                        <h4>2. Random Numbers</h4>
                        <div className="code-block">
                            <code>You find {`{ 1 ~ 6 }`} ancient coins.</code>
                        </div>

                        <h4>3. Inline Math</h4>
                        <p>Perform calculations inside text.</p>
                        <div className="code-block">
                            <code>Next level requires {`{ ($level + 1) * 10 }`} CP.</code>
                        </div>
                    </section>

                    {/* SECTION 4: STORYLETS */}
                    <section id="storylets">
                        <h2>4. Storylets & Events</h2>
                        <p>A Storylet is a container for narrative content.</p>

                        <h3>Requirements (Gates)</h3>
                        <ul>
                            <li><strong>Visible If:</strong> Defines if the player can <em>see</em> the option.</li>
                            <li><strong>Unlock If:</strong> Defines if the player can <em>interact</em> with it. If false, it appears "Locked".</li>
                        </ul>
                        <pre><code>$strength {`>=`} 10 && $gold {`>`} 50</code></pre>

                        <h3>Special Properties</h3>
                        <ul className="props-list">
                            <li>
                                <code>instant_redirect</code>
                                <span>(Option) Skips the result screen. Cost defaults to 0 Actions.</span>
                            </li>
                            <li>
                                <code>pass_move_to: "loc_id"</code>
                                <span>(Option) Moves the player to a new location ID upon success.</span>
                            </li>
                            <li>
                                <code>autofire_if: "$wounds {`>=`} 8"</code>
                                <span>
                                    (Storylet) <strong>Must-Event.</strong> If this condition is met, the player is forcibly pulled into this storylet immediately. 
                                </span>
                            </li>
                        </ul>
                    </section>

                    {/* SECTION 5: CHALLENGES */}
                    <section id="challenges">
                        <h2>5. Difficulty & Luck</h2>
                        <p>
                            Instead of a hard "Pass/Fail", you can use <strong>Broad Difficulty</strong> checks.
                        </p>

                        <h3>Syntax</h3>
                        <div className="syntax-box">
                            <code>$stat_name {`>=`} Target [Margin]</code>
                        </div>

                        <h3>How it works</h3>
                        <ul>
                            <li><strong>Target:</strong> The level at which you have a <strong>60%</strong> chance of success.</li>
                            <li><strong>Margin:</strong> The range of difficulty.</li>
                        </ul>
                        
                        <h4>Example: <code>$watchful {`>=`} 50 [10]</code></h4>
                        <ul>
                            <li>Level 40 (Target - Margin): <strong>0%</strong></li>
                            <li>Level 50 (Target): <strong>60%</strong> (Risky)</li>
                            <li>Level 60 (Target + Margin): <strong>100%</strong> (Safe)</li>
                        </ul>

                        <h3>Clamping (Luck)</h3>
                        <p>To force a minimum risk, use the extended syntax:</p>
                        <div className="code-block">
                            <code>$stat {`>=`} 50 [10, 5, 95]</code>
                        </div>
                        <p>Format: <code>[Margin, Min_Chance, Max_Chance]</code>. This ensures the chance never drops below 5% and never exceeds 95%.</p>
                    </section>

                    {/* SECTION 6: THE LEDGER */}
                    <section id="ledger">
                        <h2>6. The Ledger (Effects)</h2>
                        <p>Define how an option changes the world.</p>

                        <h3>Operators</h3>
                        <ul>
                            <li><code>$gold += 10</code> (Add)</li>
                            <li><code>$gold -= 5</code> (Subtract)</li>
                            <li><code>$xp *= 1.5</code> (Multiply)</li>
                            <li><code>$rank = 5</code> (Set Level directly - Resets CP!)</li>
                        </ul>

                        <h3>The "Impossible Theorem" (Category Wipe)</h3>
                        <p>Reset an entire category of qualities at once.</p>
                        <pre><code>$all[menace] = 0</code></pre>

                        <h3>Item Sources (History)</h3>
                        <p>
                            Items can track where they came from using the <code>[source:...]</code> tag.
                        </p>
                        <pre><code>$gossip[source:Overheard at the bar] += 1</code></pre>
                    </section>

                    {/* SECTION 7: WORLD */}
                    <section id="world">
                        <h2>7. World Structure</h2>
                        
                        <h3>Locations & Regions</h3>
                        <p>
                            <strong>Locations</strong> are individual screens where storylets live.<br/>
                            <strong>Regions</strong> are groups of locations (e.g. "London").
                        </p>
                        <p>
                            You can assign a Map Image to a Region in the <strong>Regions Editor</strong>. 
                            Using the <strong>Image Library</strong>, you can click on the map to determine coordinates for each Location.
                        </p>

                        <h3>Opportunity Decks</h3>
                        <p>
                            Locations are assigned a <strong>Deck</strong>. 
                            If a Deck is marked <code>Saved: True</code>, your hand is preserved when you leave. 
                            If <code>Saved: False</code>, the hand is wiped on exit.
                        </p>
                    </section>

                    {/* SECTION 8: ADVANCED */}
                    <section id="advanced">
                        <h2>8. Advanced Patterns</h2>

                        <h3>Dynamic Difficulty</h3>
                        <p>You can calculate the target difficulty using math inside the requirement block.</p>
                        <pre><code>$strength {`>=`} {`{ 10 + $enemy_level }`} [5]</code></pre>
                        
                        <h3>Dynamic Rewards</h3>
                        <p>Reward amount based on logic.</p>
                        <pre><code>$gold += {`{ 10 + $luck }`}, $xp++</code></pre>
                    </section>

                        {/* Simplified Styles (Only for content, layout handles the rest) */}
            <style jsx>{`
                .docs-content { max-width: 900px; margin: 0 auto; color: #ccc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.7; }
                
                h1 { font-size: 3rem; color: #fff; margin-bottom: 0.5rem; line-height: 1.1; }
                .lead { font-size: 1.3rem; color: #777; margin-bottom: 2rem; font-weight: 300; }
                .divider { border: 0; border-bottom: 1px solid #333; margin: 4rem 0; }

                h2 { color: #61afef; font-size: 2.2rem; margin-top: 4rem; margin-bottom: 1.5rem; border-bottom: 1px solid #2c313a; padding-bottom: 0.5rem; scroll-margin-top: 2rem; }
                h3 { color: #98c379; font-size: 1.5rem; margin-top: 3rem; margin-bottom: 1rem; }
                h4 { color: #e5c07b; font-size: 1.1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; }

                p, li { margin-bottom: 1rem; color: #c8ccd4; }
                strong { color: #fff; font-weight: 600; }
                
                /* Components */
                .callout { background: rgba(97, 175, 239, 0.1); border-left: 4px solid #61afef; padding: 1.5rem; border-radius: 4px; margin: 2rem 0; color: #d7dae0; }
                
                .docs-table { width: 100%; border-collapse: collapse; margin: 2rem 0; background: #21252b; border-radius: 8px; overflow: hidden; }
                .docs-table th, .docs-table td { border-bottom: 1px solid #333; padding: 1rem; text-align: left; vertical-align: top; }
                .docs-table th { background: #2c313a; color: #fff; font-weight: bold; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px; }
                .docs-table tr:last-child td { border-bottom: none; }
                
                pre { background: #282c34; padding: 1rem; border-radius: 6px; border: 1px solid #333; overflow-x: auto; margin: 1rem 0; }
                code { font-family: 'Consolas', 'Monaco', monospace; color: #e06c75; background: rgba(0,0,0,0.3); padding: 2px 6px; borderRadius: 4px; font-size: 0.9rem; }
                pre code { background: transparent; padding: 0; color: #98c379; }

                .syntax-box { background: #1e2127; border: 1px dashed #5c6370; padding: 1.5rem; text-align: center; margin: 2rem 0; border-radius: 8px; }
                .syntax-box code { font-size: 1.4rem; color: #61afef; background: none; }
                
                .props-list { list-style: none; padding: 0; }
                .props-list li { margin-bottom: 1.5rem; background: #21252b; padding: 1rem; border-radius: 6px; border: 1px solid #333; }
                .props-list code { display: inline-block; margin-bottom: 0.5rem; color: #e5c07b; font-size: 1rem; }
                .props-list span { display: block; color: #abb2bf; }

                /* Helper for side-by-side */
                .compare-table { display: flex; gap: 2rem; margin: 2rem 0; flex-wrap: wrap; }
                .col { flex: 1; background: #21252b; padding: 1.5rem; border-radius: 8px; border: 1px solid #333; min-width: 250px; }
            `}</style>
        </div>
    );
}