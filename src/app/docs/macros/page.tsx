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
        While most of ScribeScript is about reading or changing simple values, Macros are special commands that ask the game engine to perform complex operations, like calculating probability, scheduling future events, or modifying entire groups of qualities.
    </p>
    <div className="docs-syntax-box">
        <code className="docs-code">{`{%command[ arguments ]}`}</code>
    </div>
    <p className="docs-p">
        All macros are wrapped in <code>{`{%...}`}</code> and their arguments are contained in square brackets <code>[...]</code>.
    </p>
    <div className="docs-callout" style={{borderColor: '#f1c40f'}}>
        <strong style={{color: '#f1c40f'}}>The Percent Shorthand:</strong>
        <p className="docs-p" style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0'}}>
            As explained in the <Link href="/docs/scribescript#challenges" className="docs-link">main syntax guide</Link>, the engine recognizes a special shorthand: <code>{`{...}%`}</code>. When the parser sees a number followed by a percent sign, it treats it as a shorthand for the <code>%random</code> macro.
        </p>
        <div className="docs-pre" style={{marginTop:'0.5rem'}}>
            <code className="docs-code">{`{60%}`} is identical to {`{%random[60]}`}</code>
        </div>
    </div>
</section>

            <section id="random">
                <h2 className="docs-h2">2. The<code>%random</code> Macro</h2>
                <p className="docs-p">
                    This is the simplest probability macro. It takes a number (0-100) and returns <code>true</code> or <code>false</code> based on the single Resolution Roll for the current action.
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
            </section>

            <section id="chance">
                <h2 className="docs-h2">3. The<code>%chance</code> Macro</h2>
                <p className="docs-p">
                    This macro is the explicit, long-form version of the <Link href="/docs/scribescript#challenges" className="docs-link">Anonymous Challenge</Link>. It calculates a probability number based on a skill check, but gives you full control over every parameter.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">{`{%chance[ $stat OP Target ; MODIFIERS ]}`}</code>
                </div>
                <p className="docs-p">
                    The result of this macro is a <strong>Number (0-100)</strong>, which you can then use in a Challenge field or with the <code>%</code> shorthand.
                </p>
                <div className="docs-pre">
                    <span style={{color:'#777'}}>// In a 'Challenge' field, this...</span>
                    <br/>
                    <code className="docs-code">{`{%chance[ $strength >> 50 ; pivot:30 ]}`}</code>
                    <br/><br/>
                    <span style={{color:'#777'}}>// ...is identical to this anonymous shorthand:</span>
                    <br/>
                    <code className="docs-code">{`{ $strength >> 50 ; pivot:30 }`}</code>
                </div>
            </section>

            <section id="batch">
    <h2 className="docs-h2">4. The<code>%all</code> Macro (Batch Operations)</h2>
    <p className="docs-p">
        This macro is a powerful tool for targeting a group of qualities at once, identified by their <strong>Category</strong>. It is used in Effect fields.
    </p>
    <div className="docs-syntax-box">
        <code className="docs-code">{`{%all[category_name]} OPERATOR VALUE`}</code>
    </div>

    <div className="docs-card">
        <h4 className="docs-h4">Example 1: Confiscating Contraband</h4>
        <p className="docs-p">
            When a player enters the city, you can clear all items in the "Contraband" category with one command.
        </p>
        <div className="docs-pre">
            <span style={{color:'#777'}}>// In an 'Effect' field:</span>
            <br/>
            <code className="docs-code">
                {`{%all[Contraband]} = 0`}
            </code>
        </div>
    </div>
    
    <div className="docs-card">
        <h4 className="docs-h4">Example 2: A Spreading Poison</h4>
        <p className="docs-p">
            You can combine <code>%all</code> with <code>%schedule</code> to create powerful, game-wide effects. For example, a poison that slowly damages all of the player's "Body" stats.
        </p>
        <div className="docs-pre">
            <span style={{color:'#777'}}>// In an 'Effect' field:</span>
            <br/>
            <code className="docs-code">
               {`{%schedule[{%all[Body]} -= 1 : 1h ; recur]}`}
            </code>
        </div>
        <p className="docs-p" style={{fontSize: '0.9rem'}}>
            This schedules a recurring timer that, every hour, will reduce the value of every quality the player has with the "Body" category by 1.
        </p>
        <div className="docs-callout" style={{borderColor: '#e06c75', marginTop: '1rem'}}>
             <strong style={{color: '#e06c75'}}>Note:</strong> The use of <code>%all</code> inside a timer macro is a planned feature and may not be fully implemented in the current version.
        </div>
    </div>
</section>

            <section id="timers">
    <h2 className="docs-h2">5. Living Stories (Timers)</h2>
    <p className="docs-p">
        These macros allow you to schedule an effect to happen in the future, even if the player logs off. This is the foundation of idle mechanics, cooldowns, and time-based events.
    </p>

    <div className="docs-callout">
        <strong style={{color: '#fff'}}>Understanding the Schedule Stack:</strong>
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

    <h3 className="docs-h3">`%schedule`</h3>
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

    <h3 className="docs-h3">`%cancel`</h3>
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