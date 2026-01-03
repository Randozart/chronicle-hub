'use client';

import React from 'react';
import Link from 'next/link';

export default function EffectsPage() {
    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">Effects & State Changes</h1>
                <p className="docs-lead">
                    The definitive guide to making things happen. Learn how to change qualities, grant items, and create consequences for player actions.
                </p>
            </header>

            <section id="anatomy">
                <h2 className="docs-h2">1. The Anatomy of an Effect</h2>
                <p className="docs-p">
                    Effects are the "verbs" of your story. They are instructions that modify the state of the game world and are primarily used in the <strong>Quality Changes</strong> field of an option.
                </p>
                
                <div className="docs-callout" style={{borderColor: '#e06c75'}}>
                    <strong style={{color: '#e06c75'}}>The Core Rule: L-Value vs. R-Value</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', margin:'0.5rem 0 0 0'}}>
                        An effect is an <strong>Instruction</strong>, not an equation. It must always have a variable on the left (the "L-Value" or address) and the data on the right (the "R-Value" or value).
                    </p>
                    <div className="docs-pre" style={{marginTop:'1rem'}}>
                        <code className="docs-code" style={{color:'var(--docs-accent-green)'}}>
                            $gold += 10  // Correct!
                        </code>
                        <br/><br/>
                        <code className="docs-code" style={{color:'#e06c75'}}>
                            {`{ $gold }`} += 10 // Incorrect! This becomes "50 += 10", which is nonsense.
                        </code>
                    </div>
                </div>

                <h3 className="docs-h3">Assignment Operators</h3>
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
                            <td><strong>Set Value:</strong> Overwrites the current value completely.</td>
                            <td><code>$faction = 'Empire'</code></td>
                        </tr>
                        <tr>
                            <td><code>+=</code></td>
                            <td><strong>Add:</strong> Adds the value. For Pyramidal stats, adds Change Points (CP).</td>
                            <td><code>$gold += 50</code></td>
                        </tr>
                        <tr>
                            <td><code>-=</code></td>
                            <td><strong>Subtract:</strong> Subtracts the value. For Pyramidal stats, removes CP.</td>
                            <td><code>$gold -= 10</code></td>
                        </tr>
                        <tr>
                            <td><code>++</code></td>
                            <td><strong>Increment:</strong> A shorthand for <code>+= 1</code>.</td>
                            <td><code>$quest_progress++</code></td>
                        </tr>
                         <tr>
                            <td><code>--</code></td>
                            <td><strong>Decrement:</strong> A shorthand for <code>-= 1</code>.</td>
                            <td><code>$rations--</code></td>
                        </tr>
                    </tbody>
                </table>

                <h3 className="docs-h3">Chaining Effects with Commas</h3>
                <p className="docs-p">
                    You can execute multiple effects in a single field by separating them with a comma. The engine will execute them in order, from left to right.
                </p>
                <div className="docs-pre">
                    <code className="docs-code">
                        $gold -= 100, $reputation += 5, $sword_of_kings = 1
                    </code>
                </div>
            </section>

            <section id="dynamic-values">
                <h2 className="docs-h2">2. Dynamic Values (R-Values)</h2>
                <p className="docs-p">
                    While the left side of an effect must be a static variable name, the right side can be a full ScribeScript expression. The engine will resolve it to a single value before performing the assignment.
                </p>

                <div className="docs-card">
                    <h4 className="docs-h4">Example 1: Math with Variables</h4>
                    <p className="docs-p">The reward for a task scales with the player's Intelligence.</p>
                    <div className="docs-pre">
                        <code className="docs-code">$gold += {`{ $intelligence * 10 }`}</code>
                    </div>
                </div>

                <div className="docs-card">
                    <h4 className="docs-h4">Example 2: Conditional Gain</h4>
                    <p className="docs-p">You gain more supplies in winter than in summer.</p>
                    <div className="docs-pre">
                        <code className="docs-code">$supplies += {`{ #season == Winter : 2 | 1 }`}</code>
                    </div>
                </div>

                <div className="docs-card">
                    <h4 className="docs-h4">Example 3: Random Gain</h4>
                    <p className="docs-p">The amount of scrap metal you find is unpredictable.</p>
                    <div className="docs-pre">
                        <code className="docs-code">$scrap_metal += {`{ 10 ~ 50 }`}</code>
                    </div>
                </div>
            </section>

            <section id="pyramidal">
                <h2 className="docs-h2">3. Pyramidal vs. Linear Math</h2>
                <p className="docs-p">
                    How an effect is applied depends on the Quality's **Type**. This is a crucial distinction for game balance.
                </p>

                <div className="docs-grid">
                    <div className="docs-card" style={{borderColor: 'var(--docs-accent-gold)'}}>
                        <h4 className="docs-h4">Linear (Types: C, I, E, T)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>1 Point = 1 Level.</strong> Used for Currency, Items, and simple Trackers. Math is direct.
                        </p>
                        <div className="docs-code">$gold++</div>
                        <p className="docs-p" style={{fontSize: '0.8rem', marginTop: '0.5rem'}}>
                            Result: You gain exactly 1 Gold.
                        </p>
                    </div>
                    <div className="docs-card" style={{borderColor: 'var(--docs-accent-blue)'}}>
                        <h4 className="docs-h4">Pyramidal (Type: P)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>1 Point = 1 Change Point (CP).</strong> Used for Skills and Attributes that get harder to level up.
                        </p>
                        <div className="docs-code">$strength++</div>
                        <p className="docs-p" style={{fontSize: '0.8rem', marginTop: '0.5rem'}}>
                            Result: You gain 1 CP towards your next Strength level. You might not level up yet.
                        </p>
                    </div>
                </div>

                <h3 className="docs-h3">The Pyramidal Formula</h3>
<p className="docs-p">
    For a Pyramidal quality, the CP required to reach the <em>next</em> level is typically equal to <code>Current Level + 1</code>. This creates a curve that gets progressively harder.
</p>
<table className="docs-table">
    <thead>
        <tr><th>To Reach Level...</th><th>Requires This Many CP...</th></tr>
    </thead>
    <tbody>
        <tr><td>1</td><td>1 CP</td></tr>
        <tr><td>2</td><td>2 CP</td></tr>
        <tr><td>3</td><td>3 CP</td></tr>
        <tr><td>...</td><td>...</td></tr>
        <tr><td>50</td><td>50 CP</td></tr>
    </tbody>
</table>

<div className="docs-callout" style={{borderColor: '#f1c40f'}}>
    <strong style={{color: '#f1c40f'}}>Advanced: Capping the Curve</strong>
    <p className="docs-p" style={{fontSize: '0.9rem', margin:'0.5rem 0 0 0'}}>
        In the Quality Editor, you can set a <strong>CP Requirement Cap</strong> (<code>cp_cap</code>). For example, if you set a cap of 20, leveling up will never cost more than 20 CP, even at very high levels. This flattens the difficulty curve in the late game.
    </p>
</div>
                <div className="docs-callout">
    <strong style={{color: 'var(--docs-text-main)'}}>Pro Tip: The "=" Override and Level-Based Math</strong>
    <p className="docs-p" style={{fontSize: '0.9rem', margin:'0.5rem 0 0 0'}}>
        The <code>=</code> operator is a powerful tool for Pyramidal qualities. It bypasses the Change Point system and sets the <strong>level</strong> directly, resetting the CP to 0.
    </p>

    <h5 className="docs-h4" style={{fontSize:'1rem', marginTop:'1rem'}}>Use Case 1: Setting a Milestone</h5>
    <p className="docs-p" style={{fontSize: '0.9rem'}}>Grant a specific level as a major quest reward.</p>
    <div className="docs-pre" style={{marginTop:'0.5rem'}}>
        <code className="docs-code">$strength = 5</code>
        <br/><small style={{color:'#777'}}>The player's Strength is now exactly 5, with 0 CP towards level 6.</small>
    </div>

    <h5 className="docs-h4" style={{fontSize:'1rem', marginTop:'1rem'}}>Use Case 2: Precise Level Decrement</h5>
    <p className="docs-p" style={{fontSize: '0.9rem'}}>
        If you want to reduce a Pyramidal quality by exactly one <strong>level</strong> (not just some CP), you can combine <code>=</code> with ScribeScript's ability to read the current level.
    </p>
    <div className="docs-pre" style={{marginTop:'0.5rem'}}>
        <code className="docs-code">$strength = {`{ $strength - 1 }`}</code>
    </div>
    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom:0}}>
        <strong>How it works:</strong>
        <br/>1. The inner block <code>{`{ $strength - 1 }`}</code> resolves first. If Strength was 5, it becomes `4`.
        <br/>2. The engine then executes the final instruction: <code>$strength = 4</code>.
        <br/>
        This is the standard pattern for applying a "level drain" or paying a cost in whole skill levels.
    </p>
</div>
            </section>

 <section id="metadata">
    <h2 className="docs-h2">4. Advanced Effects with Metadata <code>[...]</code></h2>
    <p className="docs-p">
        You can attach extra, contextual information to an effect using square brackets <code>[]</code> directly after the quality name. The engine uses a specific set of pre-coded metadata keys to control how an effect is logged and remembered.
    </p>
    <div className="docs-syntax-box">
        <code className="docs-code">$quality[source: value, desc: value] += 1</code>
    </div>

    <div className="docs-card">
        <h4 className="docs-h4"><code>[source: TEXT]</code> (Item History)</h4>
        <p className="docs-p">
            This metadata tag tells the engine *where* an item came from. This "memory" is stored with the item and can be recalled later in your story using the <code>.source</code> property.
        </p>
        <div className="docs-callout" style={{borderColor:'#f1c40f', padding:'1rem'}}>
            <strong style={{color:'#f1c40f'}}>Write for Recall:</strong>
            <p className="docs-p" style={{fontSize:'0.85rem', margin:'0.5rem 0 0 0'}}>
                The text you provide for the source will be inserted verbatim when you call <code>.source</code>. You should write it in the grammatical context you intend to use it.
            </p>
        </div>
        <div className="docs-pre" style={{marginTop:'1rem'}}>
            <span style={{color:'#777'}}>// In an Effect Field, write the source as a past-tense phrase:</span>
            <br/>
            <code className="docs-code">$ancient_coin[source:found it in a dusty chest] += 1</code>
            <br/><br/>
            <span style={{color:'#777'}}>// Later, in a Text Field, seamlessly integrate it:</span>
            <br/>
            <code className="docs-code">You examine the coin. You remember that you {`{$ancient_coin.source}`}.</code>
        </div>
    </div>

    <div className="docs-card">
        <h4 className="docs-h4"><code>[desc: TEXT]</code> (Immediate Message Override)</h4>
        <p className="docs-p">
            When used on a normal effect, the <code>desc</code> tag overrides the default "Quality has changed" message in the UI log for that **one specific resolution**.
        </p>
        <div className="docs-pre">
            <span style={{color:'#777'}}>// Default Behavior:</span>
            <br/>
            <code className="docs-code">$wounds += 1</code>
            <br/>
            <em>Log Output: "Wounds has increased."</em>
            <br/><br/>
            <span style={{color:'#777'}}>// With a Description Override:</span>
            <br/>
            <code className="docs-code">$wounds[desc:You scrape your knee on a jagged rock.] += 1</code>
            <br/>
            <em>Log Output: "You scrape your knee on a jagged rock."</em>
        </div>
    </div>
    
    <div className="docs-card">
        <h4 className="docs-h4">Two Kinds of <code>desc:</code> in Scheduled Events</h4>
        <p className="docs-p">
            The <code>%schedule</code> macro can use two different <code>desc</code> modifiers, one for immediate feedback and one for the delayed outcome.
        </p>
        <div className="docs-pre">
            <code className="docs-code" style={{whiteSpace:'pre'}}>
{`{%schedule[
    $rations[desc:An hour passes. You consume one of your rations.] -= 1 : 8h ;
    recur, desc:You begin your journey and will consume rations as you travel.
]}`}
            </code>
        </div>
        <ul className="docs-list" style={{fontSize:'0.9rem', margin:'1rem 0 0 0'}}>
            <li>
                <strong>Immediate Feedback (Macro Modifier):</strong> The <code>desc:</code> after the semicolon (<code>;</code>) is a modifier for the <code>%schedule</code> macro itself. The text "You begin your journey..." is displayed in the log **immediately** when the timer is set.
            </li>
            <li>
                <strong>Delayed Outcome (Inline Metadata):</strong> The <code>[desc:...]</code> inside the effect is attached to the scheduled event. 8 hours later, when <code>$rations</code> decreases, the text "An hour passes..." is intended to appear in the player's log.
            </li>
        </ul>
        <div className="docs-callout" style={{borderColor: '#e06c75', marginTop: '1rem'}}>
             <strong style={{color: '#e06c75'}}>Note:</strong> The display of the delayed <code>desc</code> text (the one inside the brackets) is a planned feature and may not be fully implemented in the current version.
        </div>
    </div>
</section>
        </div>
    );
}