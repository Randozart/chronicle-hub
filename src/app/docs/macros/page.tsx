'use client';

import React from 'react';
import Link from 'next/link';

export default function MacrosPage() {
    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">Macros & Functions</h1>
                <p className="docs-lead">
                    A reference guide to ScribeScript's powerful built-in engine commands, identified by the <code>%</code> sigil.
                </p>
            </header>

            <section id="basics">
                <h2 className="docs-h2">1. What is a Macro?</h2>
                <p className="docs-p">
                    While most of ScribeScript is about reading or changing simple values, Macros are special commands 
                    that ask the game engine to perform complex operations, like calculating probability, scheduling future 
                    events, or modifying entire groups of qualities.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">{`%command[ arguments ]`}</code>
                </div>
                <p className="docs-p">
                    All macros start with <code>{`%`}</code> and their arguments are contained in square brackets <code>[...]</code>.
                </p>

                <div className="docs-callout" style={{borderColor: '#f1c40f'}}>
                    <strong style={{color: '#f1c40f'}}>The Percent Shorthand:</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0'}}>
                        As explained in the <Link href="/docs/scribescript#challenges" className="docs-link">main syntax guide</Link>, the 
                        engine recognizes a special shorthand: <code>{`{...}%`}</code>. When the parser sees a number followed by a percent sign, 
                        it treats it as a shorthand for the <code>%random</code> macro.
                    </p>
                    <div className="docs-pre" style={{marginTop:'0.5rem'}}>
                        <code className="docs-code">{`{60%}`} is identical to {`{%random[60]}`}</code>
                    </div>
                </div>
            </section>

            <section id="contexts">
                <h2 className="docs-h2">2. Execution Contexts</h2>
                <p className="docs-p">
                    Macros behave differently depending on where they are used. The primary distinction is whether they are placed inside a 
                    Logic Block <code>{`{...}`}</code> or directly in an Effect Field. Each macro's documentation will specify which contexts it supports.
                </p>

                <div className="docs-grid">
                    <div className="docs-card">
                        <h4 className="docs-h4">Bracketed Execution (Value Resolution)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            When a macro is placed alone inside a Logic Block, it is always treated as a function that must 
                            <strong>return a value</strong>. The macro runs, and the entire <code>{`{%...[...]}`}</code> block is replaced by its result.
                        </p>
                        <div className="docs-pre" style={{marginTop:'1rem'}}>
                            <code className="docs-code">{`$gold += {%pick[Treasures]}`}.level</code>
                        </div>
                        <p className="docs-p" style={{fontSize: '0.9rem', marginTop:'1rem'}}>
                            <strong>How it works:</strong> The <code>%pick</code> macro runs first and returns a Quality ID (e.g., "diamond"). The line then becomes <code>$gold += $diamond.level</code>, which is a standard effect.
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">Bracketless Execution (Operand)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                           When a macro is used <strong>outside</strong> of braces in an Effect Field, it can act as a dynamic <strong>L-Value</strong>—the "target" of an operation. This is a special syntax that only a few macros support.
                        </p>
                        <div className="docs-pre" style={{marginTop:'1rem'}}>
                            <code className="docs-code">%pick[Treasures] += 1</code>
                        </div>
                        <p className="docs-p" style={{fontSize: '0.9rem', marginTop:'1rem'}}>
                           <strong>How it works:</strong> The engine identifies <code>%pick</code> as the target. It runs the macro to get a Quality ID ("diamond"), and then applies the <code>+= 1</code> operation to that result, effectively running <code>$diamond += 1</code>.
                        </p>
                    </div>
                </div>
            </section>

            <section id="new">
                <h2 className="docs-h2">3. The <code>%new</code> Macro (Dynamic Registration)</h2>
                 <div className="docs-context-box">
                    <ul>
                        <li><strong>Bracketed:</strong> Yes (Returns the ID of the new quality as a string).</li>
                        <li><strong>Bracketless:</strong> No. This macro only registers definitions.</li>
                    </ul>
                </div>
                <p className="docs-p">
                    The <code>%new</code> macro dynamically defines a Quality for the current character, making it exist for logic checks and state changes within the current context. 
                    While you could manually define these qualities, this macro is convenient for creating procedurally generated or player-defined qualities (e.g., a quality for each NPC you've met).
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">%new[ NEW_ID ; BASE_ID , {`{OVERRIDES}`} ]</code>
                </div>
                 <ul className="docs-props-list">
                    <li><code>NEW_ID</code><span><strong>(Required)</strong> The unique ID for the new quality. Can be dynamic, e.g., <code>contract_{`{@person_id}`}</code>.</span></li>
                    <li><code>BASE_ID</code><span><strong>(Optional)</strong> The ID of an existing quality to use as a template. The new quality will inherit all its properties (name, description, etc.).</span></li>
                    <li><code>{`{OVERRIDES}`}</code><span><strong>(Optional)</strong> A ScribeScript object literal to override properties from the base.</span></li>
                </ul>
                <div className="docs-card" style={{marginTop:'1rem'}}>
                    <h4 className="docs-h4">Example 1: Simple Registration</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        Register a new, simple tracker quality before using it. If a quality with this ID already exists, the macro does nothing.
                    </p>
                    <div className="docs-pre">
                        <code className="docs-code">
                            %new[suspicion_of_the_butler], $suspicion_of_the_butler[desc: You gain a new suspicion...] = 1
                        </code>
                    </div>
                </div>
                <div className="docs-card" style={{marginTop:'1rem'}}>
                    <h4 className="docs-h4">Example 2: Templating and Overriding</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        Create a unique quest item based on a generic "Quest Item" template, but give it a unique name and description for this specific instance.
                    </p>
                    <div className="docs-pre">
                        <code className="docs-code" style={{whiteSpace:'pre'}}>
{`{@item_id = quest_item_{%random[1~100]}}
{%new[@item_id; quest_item_base, { 
    name: "A Clue from the Docks", 
    description: "A waterlogged note you found." 
}]}`}
                        </code>
                    </div>
                </div>
            </section>

            <section id="probability">
                <h2 className="docs-h2">4. Probability Macros</h2>
                <p className="docs-p">
                    These macros are the foundation of any system involving randomness or skill checks.
                </p>

                <h3 className="docs-h3" style={{marginTop:'2rem'}}><code>%random</code></h3>
                <div className="docs-context-box">
                    <ul>
                        <li><strong>Bracketed:</strong> Yes (Returns <code>true</code> or <code>false</code>).</li>
                        <li><strong>Bracketless:</strong> No.</li>
                    </ul>
                </div>
                <p className="docs-p">
                    The simplest probability macro. It takes a number (0-100) and returns <code>true</code> or <code>false</code> based on the single Resolution Roll for the current action.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">{`{%random[ CHANCE ; invert ]}`}</code>
                </div>
                <ul className="docs-props-list">
                    <li>
                        <code>CHANCE</code>
                        <span><strong>(Required)</strong> A number from 0 to 100 representing the success chance. Can be a ScribeScript expression.</span>
                    </li>
                    <li>
                        <code>invert</code>
                        <span><strong>(Optional)</strong> If this keyword is present, the result is inverted (a 30% chance becomes a 70% chance).</span>
                    </li>
                </ul>
                <div className="docs-pre">
                    <span style={{color:'#777'}}>// Used in a conditional</span>
                    <br/>
                    <code className="docs-code">{`{ {%random[40]} : You find a loose coin! | You find nothing. }`}</code>
                </div>
                <div className="docs-card" style={{marginTop:'1.5rem'}}>
                    <h4 className="docs-h4">Use Case: Conditional Text with the '%' Shorthand</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        While you can write the full macro, it's far more common to use the <code>{`{...}%`}</code> shorthand. The engine recognizes a number inside braces followed by a percent sign and treats it as a <code>true/false</code> check against the Resolution Roll.
                    </p>
                    <div className="docs-pre">
                        <span style={{color:'#777'}}>// This shorthand...</span>
                        <br/>
                        <code className="docs-code">{`{40%}`}</code>
                        <br/><br/>
                        <span style={{color:'#777'}}>// ...is identical to writing this full macro:</span>
                        <br/>
                        <code className="docs-code">{`{%random[40]}`}</code>
                    </div>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginTop:'1rem', borderTop:'1px dashed var(--tool-border)', paddingTop:'1rem'}}>
                        This makes it very easy to create random outcomes inside a conditional block:
                    </p>
                    <div className="docs-pre">
                        <code className="docs-code">{`You search the room. { {40%} : You find a loose coin! | You find nothing. }`}</code>
                    </div>
                     <p className="docs-p" style={{fontSize: '0.9rem', marginTop:'1rem'}}>
                        <strong>How it works:</strong> The inner <code>{`{40%}`}</code> resolves to <code>true</code> if the action's roll is 40 or less. The outer conditional block then uses this result to decide which text to display.
                    </p>
                </div>

                <h3 className="docs-h3" style={{marginTop:'2rem'}}><code>%chance</code></h3>
                 <div className="docs-context-box">
                    <ul>
                        <li><strong>Bracketed:</strong> Yes (Returns a number from 0-100 representing the success chance).</li>
                        <li><strong>Bracketless:</strong> No.</li>
                    </ul>
                </div>
                <p className="docs-p">
                    The explicit, long-form version of the <Link href="/docs/scribescript#challenges" className="docs-link">Anonymous Challenge</Link>. It calculates a probability number based on a skill check.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">{`{%chance[ $stat OP Target ; MODIFIERS ]}`}</code>
                </div>
                <p className="docs-p">
                    The result of this macro is a <strong>Number (0-100)</strong>, which you can then use in a Challenge field or with the <code>%</code> shorthand. See the <Link href="/docs/scribescript#challenges" className="docs-link">main syntax guide</Link> for a full breakdown of modifiers.
                </p>

                <div className="docs-callout" style={{borderColor: '#f1c40f', marginTop: '1.5rem'}}>
                    <strong style={{color: '#f1c40f'}}>The Anonymous Challenge Shorthand</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0'}}>
                        While <code>%chance</code> is explicit, ScribeScript provides a powerful shorthand. If you place a challenge expression directly inside a logic block, the engine will automatically calculate the success chance as a number. This allows you to use probability calculations within other logic.
                    </p>
                    <div className="docs-pre" style={{marginTop:'1rem'}}>
                        <span style={{color:'#777'}}>// In a Text Field, check if your odds are good before acting:</span>
                        <br/>
                        <code className="docs-code">
                            {`"You assess the jump. { { $agility >> 50 } > 75 : You feel confident. | You feel a tremor of doubt. }"`}
                        </code>
                    </div>
                     <p className="docs-p" style={{fontSize: '0.9rem', marginTop:'1rem'}}>
                        <strong>How it works:</strong>
                        <br/>1. The inner block <code>{`{ $agility >> 50 }`}</code> is evaluated first, resolving to the player's success chance (e.g., the number <code>80</code>).
                        <br/>2. The expression becomes <code>{`{ 80 > 75 : "Confident." | "Worried." }`}</code>.
                        <br/>3. Since 80 is greater than 75, the block resolves to the string <code>"Confident."</code>.
                    </p>
                </div>
            </section>

            <section id="collections">
                <h2 className="docs-h2">5. Collection & Batch Macros</h2>
                <p className="docs-p">
                    These macros allow you to treat your Quality Categories as databases. You can randomly select items for loot tables, get a count of items, or perform an operation on an entire category at once.
                </p>

                <h3 className="docs-h3" style={{marginTop:'2rem'}}><code>%pick</code> (Random Selection)</h3>
                <div className="docs-context-box">
                    <ul>
                        <li><strong>Bracketed:</strong> Yes (Returns a comma-separated string of Quality IDs).</li>
                        <li><strong>Bracketless:</strong> Yes (Acts as a dynamic L-Value to be modified).</li>
                    </ul>
                </div>
                <p className="docs-p">
                    Selects one or more random Quality IDs from a specific category.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">{`{%pick[ CATEGORY ; COUNT , FILTER ]}`}</code>
                </div>
                <div className="docs-card" style={{marginTop:'1rem'}}>
                    <h4 className="docs-h4">Use Case: Random Loot</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        Grant 3 random items from the "Gemstones" category.
                    </p>
                    <div className="docs-pre">
                        <code className="docs-code">
                            %pick[Gemstones; 3] += 1
                        </code>
                    </div>
                </div>

                <h3 className="docs-h3" style={{marginTop:'2rem'}}><code>%roll</code> (Weighted Selection)</h3>
                <div className="docs-context-box">
                    <ul>
                        <li><strong>Bracketed:</strong> Yes (Returns a single Quality ID).</li>
                        <li><strong>Bracketless:</strong> No.</li>
                    </ul>
                </div>
                <p className="docs-p">
                    Performs a <strong>Weighted Random Selection</strong> based on the player's level in each quality. A quality with Level 10 is ten times more likely to be picked than a quality with Level 1. Implicitly filters for qualities the player owns (Level &gt; 0).
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">{`{%roll[ CATEGORY ; FILTER ]}`}</code>
                </div>
                <div className="docs-pre">
                    <code className="docs-code">
                        You call for help! {`{%roll[Companions].name}`} answers the call.
                    </code>
                </div>

                <h3 className="docs-h3" style={{marginTop:'2rem'}}><code>%list</code> (Text Generation)</h3>
                <div className="docs-context-box">
                    <ul>
                        <li><strong>Bracketed:</strong> Yes (Returns a formatted string of Quality Names).</li>
                        <li><strong>Bracketless:</strong> No.</li>
                    </ul>
                </div>
                <p className="docs-p">
                    Returns a formatted string of <strong>Quality Names</strong> for display purposes.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">{`{%list[ CATEGORY ; SEPARATOR , FILTER ]}`}</code>
                </div>
                <ul className="docs-props-list">
                    <li>
                        <code>SEPARATOR</code>
                        <span><strong>(Optional)</strong> How to join the names. Options: <code>comma</code> (default), <code>pipe</code>, <code>newline</code>, <code>and</code>, or a custom string like <code>" + "</code>.</span>
                    </li>
                </ul>
                <div className="docs-pre">
                    <code className="docs-code">
                        You are carrying: {`{%list[Inventory; and]}`}.
                    </code>
                </div>

                <h3 className="docs-h3" style={{marginTop:'2rem'}}><code>%count</code> (Count Matches)</h3>
                <div className="docs-context-box">
                    <ul>
                        <li><strong>Bracketed:</strong> Yes (Returns the number of matching qualities).</li>
                        <li><strong>Bracketless:</strong> No.</li>
                    </ul>
                </div>
                <p className="docs-p">
                    Returns the <strong>number</strong> of qualities in a category that match a filter.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">{`{%count[ CATEGORY ; FILTER ]}`}</code>
                </div>
                 <div className="docs-pre">
                    <code className="docs-code">
                        {`{@clues_found = {%count[Clues; owned]}}`}
                    </code>
                </div>

                <h3 className="docs-h3" style={{marginTop:'2rem'}}><code>%all</code> (Batch Operations)</h3>
                <div className="docs-context-box">
                    <ul>
                        <li><strong>Bracketed:</strong> Yes (Returns a comma-separated string of ALL matching Quality IDs in the category).</li>
                        <li><strong>Bracketless:</strong> Yes (Acts as a dynamic L-Value targeting all qualities in the category).</li>
                    </ul>
                </div>
                <p className="docs-p">
                    This macro targets all qualities in a category that match an optional filter.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">{`%all[ CATEGORY ; FILTER ] OPERATOR VALUE`}</code>
                </div>
                <div className="docs-card" style={{marginTop:'1rem'}}>
                    <h4 className="docs-h4">Use Case: Batch Effect</h4>
                     <p className="docs-p" style={{fontSize:'0.9rem'}}>Clear all items in the "Contraband" category.</p>
                    <div className="docs-pre">
                        <code className="docs-code">
                            {`%all[Contraband] = 0`}
                        </code>
                    </div>
                </div>
                 <div className="docs-card" style={{marginTop:'1rem'}}>
                    <h4 className="docs-h4">Use Case: Getting a Full List</h4>
                    <p className="docs-p" style={{fontSize:'0.9rem'}}>Get the IDs of all learnable spells the player does not yet own to use in other logic.</p>
                    <div className="docs-pre">
                        <code className="docs-code">
                            {`{@unlearned_spells = {%all[Spells; $.level == 0]}}`}
                        </code>
                    </div>
                </div>

                <div className="docs-card" style={{marginTop: '1.5rem', borderColor: 'var(--docs-accent-green)'}}>
                    <h4 className="docs-h4" style={{color:'var(--docs-accent-green)'}}>Advanced Filtering with `$.` and `$(...)`</h4>
                    <p className="docs-p" style={{fontSize:'0.9rem'}}>
                        The <code>FILTER</code> argument allows you to run a ScribeScript condition against every candidate quality. 
                        Inside the filter, the special sigil <code>$.</code> refers to the <strong>candidate quality being checked</strong>.
                    </p>
                    <table className="docs-table" style={{fontSize: '0.85rem'}}>
                        <thead><tr><th>Filter Syntax</th><th>Meaning</th></tr></thead>
                        <tbody>
                            <tr>
                                <td><code>owned</code> (or <code>&gt;0</code>, <code>has</code>)</td>
                                <td>Only include qualities the player currently possesses (Level &gt; 0).</td>
                            </tr>
                            <tr>
                                <td><code>$.level &gt; 5</code></td>
                                <td>Only include qualities where the player's level is greater than 5.</td>
                            </tr>
                             <tr>
                                <td><code>$.cost &lt; 50</code></td>
                                <td>Only include qualities where a custom property 'cost' is less than 50.</td>
                            </tr>
                            <tr>
                                <td><code>$.secret.implicated == 1</code></td>
                                <td>Only include qualities where a *different* quality, whose name is based on the candidate's secret property, has a property <code>.implicated</code> which resolves to 1.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section id="timers">
    <h2 className="docs-h2">6. Living Stories (Timers)</h2>
    <p className="docs-p">
        These macros allow you to schedule an effect to happen in the future, even if the player logs off. This is the foundation of idle mechanics, cooldowns, and time-based events.
    </p>

    <div className="docs-callout">
        <strong style={{color: 'var(--docs-text-main)'}}>Understanding the Schedule Stack:</strong>
        <p className="docs-p" style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0'}}>
            Think of each character having a list of "appointments" for each quality. When you use <code>%schedule</code>, you add a new appointment to the bottom of the list for that quality.
        </p>
        <div className="docs-pre" style={{marginTop: '0.5rem'}}>
            <span style={{color:'#777'}}>// Player has two research projects queued</span>
            <br/>
            <code className="docs-code" style={{color: '#c8ccd4'}}>
                <strong>$research Stack:</strong>
                <br/>1.<code>+= 1</code> (Triggers in 2 hours)
                <br/>2.<code>+= 1</code> (Triggers in 4 hours)
            </code>
        </div>
        <p className="docs-p" style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0'}}>
            The <code>%cancel</code>, <code>%reset</code>, and <code>%update</code> macros are tools for managing these stacks.
        </p>
    </div>

    <h3 className="docs-h3"><code>%schedule</code></h3>
    <p className="docs-p"><strong>Adds a new event</strong> to the character's pending event queue. By default, this stacks, allowing multiple timers for the same quality.</p>
    <div className="docs-syntax-box">
        <code className="docs-code">{`{%schedule[ EFFECT : TIME ; MODIFIERS ]}`}</code>
    </div>
    <div className="docs-pre">
        <span style={{color:'#777'}}>// After 4 hours, your 'Research' will increase by 1.</span>
        <br/>
        <code className="docs-code">
            {`{%schedule[$research += 1 : 4h]}`}
        </code>
    </div>

    <h3 className="docs-h3"><code>%cancel</code></h3>
    <p className="docs-p"><strong>Removes pending events</strong> for a specific quality. You can target which events to remove using modifiers.</p>
    <div className="docs-syntax-box">
        <code className="docs-code">{`{%cancel[ $QUALITY_ID ; MODIFIERS ]}`}</code>
    </div>
    <div className="docs-pre">
        <span style={{color:'#777'}}>// Cancel all pending 'Research' timers.</span>
        <br/>
        <code className="docs-code">
            {`{%cancel[$research ; all]}`}
        </code>
        <br/><br/>
        <span style={{color:'#777'}}>// Cancel only the single oldest 'Rations' timer from the stack.</span>
        <br/>
        <code className="docs-code">
            {`{%cancel[$rations ; first]}`}
        </code>
    </div>

    <h3 className="docs-h3"><code>%reset</code> and <code>%update</code></h3>
    <p className="docs-p">
        These are advanced forms of<code>%schedule</code> for managing timers without letting them stack infinitely.
    </p>
    <ul className="docs-list">
        <li><strong>`%reset`</strong>: First, it cancels <strong>all</strong> existing timers for that quality, then it adds the new one. This is perfect for "refreshing" a cooldown.</li>
        <li><strong>`%update`</strong>: Functions like <code>%reset</code>, but will only add the new timer if there was an old one to replace. It does nothing if no timer already exists.</li>
    </ul>

    <h3 className="docs-h3">Timer Modifiers</h3>
<p className="docs-p">
    Modifiers are optional keywords, separated by commas, that you add after the semicolon <code>;</code> in a timer macro. They allow you to control the behavior of the scheduler.
</p>
<table className="docs-table">
    <thead>
        <tr>
            <th>Modifier</th>
            <th>Applies To</th>
            <th>Description & Example</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>
                <code>recur</code>
            </td>
            <td>
                <code>%schedule</code><br/>
                <code>%reset</code><br/>
                <code>%update</code>
            </td>
            <td>
                <strong>Makes the timer repeat.</strong> After the event triggers, the engine will automatically re-queue the exact same event for the same duration.
                <div className="docs-pre" style={{marginTop:'0.5rem'}}>
                    <code className="docs-code">
                        {`{%schedule[$rations -= 1 : 8h ; recur]}`}
                    </code>
                </div>
            </td>
        </tr>
        <tr>
            <td>
                <code>unique</code>
            </td>
            <td>
                <code>%schedule</code>
            </td>
            <td>
                <strong>Prevents duplicates.</strong> The timer will only be added if no other identical timer (same quality, effect, and time) is already in the queue. This is useful for preventing players from stacking the same long-term project multiple times.
            </td>
        </tr>
        <tr>
            <td>
                <code>first</code><br/>
                <code>first N</code>
            </td>
            <td>
                <code>%cancel</code>
            </td>
            <td>
                <strong>Targets the oldest event(s).</strong> Without a number, it cancels the single oldest timer for that quality. With a number (e.g., <code>first 3</code>), it cancels the three oldest.
                <div className="docs-pre" style={{marginTop:'0.5rem'}}>
                    <code className="docs-code">
                        {`{%cancel[$research ; first]}`}
                    </code>
                </div>
            </td>
        </tr>
        <tr>
            <td>
                <code>last</code><br/>
                <code>last N</code>
            </td>
            <td>
                <code>%cancel</code>
            </td>
            <td>
                <strong>Targets the newest event(s).</strong> This is useful if you want to let a player "undo" the last timer they set without affecting older ones.
                <div className="docs-pre" style={{marginTop:'0.5rem'}}>
                    <code className="docs-code">
                        {`{%cancel[$ship_construction ; last]}`}
                    </code>
                </div>
            </td>
        </tr>
        <tr>
            <td>
                <code>all</code>
            </td>
            <td>
                <code>%cancel</code>
            </td>
            <td>
                <strong>Targets all events.</strong> Immediately removes every pending timer associated with that quality, regardless of when it was set to trigger.
                <div className="docs-pre" style={{marginTop:'0.5rem'}}>
                    <code className="docs-code">
                        {`{%cancel[$all_research_projects ; all]}`}
                    </code>
                </div>
            </td>
        </tr>
        <tr>
            <td>
                <code>desc: TEXT</code>
            </td>
            <td>
                <code>%schedule</code><br/>
                <code>%reset</code><br/>
                <code>%update</code>
            </td>
            <td>
                <strong>Provides immediate feedback text.</strong> This message is shown in the log the moment the timer is set, confirming the player's action.
                <div className="docs-pre" style={{marginTop:'0.5rem'}}>
                    <code className="docs-code">
                        {`{%schedule[$ship_arrives : 24h ; desc:You send a message and await a reply.]%}`}
                    </code>
                </div>
            </td>
        </tr>
    </tbody>
</table>
</section>
        </div>
    );
}