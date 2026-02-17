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

            {/* Logic fundamentals - How ScribeScript evaluates conditions and expressions */}
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

                <h3 className="docs-h3">Challenge Operators</h3>
<p className="docs-p">
    When writing an anonymous challenge or a <code>%chance</code> macro, you use special operators to define the type of skill check.
</p>
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
            <td><code>$strength &gt;&gt; 50</code> (Higher is better)</td>
        </tr>
        <tr>
            <td><code>&lt;&lt;</code></td>
            <td><strong>Regressive</strong></td>
            <td><code>$suspicion &lt;&lt; 20</code> (Lower is better)</td>
        </tr>
        <tr>
            <td><code>&gt;&lt;</code></td>
            <td><strong>Precision</strong></td>
            <td><code>$tuning &gt;&lt; 50</code> (Must be close to the target)</td>
        </tr>
        <tr>
            <td><code>&lt;&gt;</code></td>
            <td><strong>Avoidance</strong></td>
            <td><code>$noise &lt;&gt; 50</code> (Must be far from the target)</td>
        </tr>
    </tbody>
</table>

                <h3 className="docs-h3">Combining Conditions</h3>
<p className="docs-p">
    You can create complex requirements by combining multiple checks.
</p>
<div className="docs-grid">
    <div className="docs-card">
        <h4 className="docs-h4">&& (AND)</h4>
        <p className="docs-p" style={{fontSize: '0.9rem'}}>Both conditions must be true.</p>
        <code className="docs-code">$gold &gt;= 10 && $reputation &gt; 5</code>
    </div>
    <div className="docs-card">
        <h4 className="docs-h4">, (Comma as AND)</h4>
        <p className="docs-p" style={{fontSize: '0.9rem'}}>For readability, a comma can also be used to mean AND.</p>
        <code className="docs-code">$gold &gt;= 10, $reputation &gt; 5</code>
    </div>
    <div className="docs-card">
        <h4 className="docs-h4">|| (OR)</h4>
        <p className="docs-p" style={{fontSize: '0.9rem'}}>At least one condition must be true.</p>
        <code className="docs-code">$has_key == 1 || $lockpicking &gt; 5</code>
    </div>
</div>
<div className="docs-callout">
    <strong style={{color: 'var(--docs-text-main)'}}>Grouping with Parentheses:</strong> Use <code>( )</code> to control the order of operations for complex checks.
    <br/>
    <code className="docs-code">($has_key == 1 || $lockpicking &gt; 5) && $stamina &gt; 0</code>
</div>
            </section>

            {/* Effects - How to modify quality values and trigger state changes */}
                
            

    <section id="syntax-rules">
    <h2 className="docs-h2">2. Brackets: The Four Meanings</h2>
    <p className="docs-p">
        ScribeScript uses four specific bracket patterns. Understanding the difference is key to mastering complex logic.
    </p>

    {/* Property definitions for .level and .cp access on qualities */}
    <div className="docs-grid">
        <div className="docs-card" style={{borderColor: 'var(--docs-accent-gold)'}}>
            <h4 className="docs-h4" style={{color: 'var(--docs-accent-gold)'}}>{`{ }`} Logic Blocks</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>The Engine Switch.</strong> Tells the parser to "stop reading text and start calculating." This is how you inject dynamic values into a string.
            </p>
        </div>
        <div className="docs-card" style={{borderColor: 'var(--docs-accent-blue)'}}>
            <h4 className="docs-h4" style={{color: 'var(--docs-accent-blue)'}}>{`( )`} Parentheses</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>The Grouper.</strong> Used inside code to control the order of operations (e.g. <code>(A || B) && C</code>).
            </p>
        </div>
        <div className="docs-card" style={{borderColor: 'var(--docs-accent-green)'}}>
            <h4 className="docs-h4" style={{color: 'var(--docs-accent-green)'}}>{`[ ]`} Square Brackets</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>The Parameter Block.</strong> Used to provide arguments to a macro (`%chance[...]`) or metadata to an effect (`$gold[desc:...]`).
            </p>
        </div>
        {/* The following card is deprecated - .get() syntax replaced by property chaining */}
        {/* <div className="docs-card" style={{borderColor: '#9b59b6'}}>
            <h4 className="docs-h4" style={{color: '#9b59b6'}}>{`$( )`} Deferred Identifier</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>The Context Protector.</strong> It tells the main parser to <strong>delay</strong> evaluating the logic inside the parentheses. The raw code is passed to the part of the engine that needs it (like a macro's filter), which then evaluates it in the correct context.
                Note that this differs crucially from regular parentheses, in that the result of the evaluation inside of the parentheses is used as a dynamic variable call. 
            </p>
        </div> */}
    </div>

    <h3 className="docs-h3">Edge Cases: When Braces Are Essential</h3>
    <p className="docs-p">
        Braces are required whenever you need to resolve a complex expression into a single value <em>before</em> the surrounding logic is processed.
    </p>
    
    <div className="docs-card">
        <h4 className="docs-h4">Edge Case 1: Dynamic Targets in Logic Fields</h4>
        <p className="docs-p">
            A logic field like <code>visible_if</code> can parse a simple comparison. But if the target of the comparison is itself a calculation, you <strong>must</strong> wrap that calculation in braces.
        </p>
        <div className="docs-pre">
            <span style={{color:'var(--text-muted)'}}>// INCORRECT: The parser will break trying to read this.</span>
            <br/>
            <code className="docs-code" style={{color: 'var(--danger-color)'}}>$gold &gt; $level * 50</code>
            <br/><br/>
            <span style={{color:'var(--text-muted)'}}>// CORRECT: The "Russian Doll" model solves the inner block first.</span>
            <br/>
            <code className="docs-code" style={{color: 'var(--docs-accent-green)'}}>
                $gold &gt; {`{ $level * 50 }`}
            </code>
        </div>
        <p className="docs-p" style={{fontSize:'0.9rem'}}>
            <strong>Why it works:</strong> The engine first solves <code>{`{ $level * 50 }`}</code> into a single number (e.g., <code>500</code>). The final expression becomes <code>$gold &gt; 500</code>, which the logic field can easily parse.
        </p>
    </div>

    <div className="docs-card" style={{marginTop:'1.5rem'}}>
        <h4 className="docs-h4">Edge Case 2: Conditional Values in Effect Fields</h4>
        <p className="docs-p">
            The same rule applies to effects. If the <em>value</em> you are assigning is conditional, that condition must be resolved to a single value first.
        </p>
        <div className="docs-pre">
            <code className="docs-code" style={{color: 'var(--docs-accent-green)'}}>
                $supplies += {`{ #season == 'Winter' : 2 | 1 }`}
            </code>
        </div>
    </div>

    <div className="docs-card" style={{marginTop:'1.5rem', borderColor:'#9b59b6'}}>
        <h4 className="docs-h4">Edge Case 3: Variable-from-Variable (The <code>$.</code> Problem)</h4>

        <div className="docs-callout" style={{borderColor:'var(--danger-color)', background:'rgba(231, 76, 60, 0.1)', marginBottom:'1rem'}}>
            <strong style={{color:'var(--danger-color)'}}>⚠️ DEPRECATED SYNTAX</strong>
            <p className="docs-p" style={{fontSize:'0.9rem', margin:'0.5rem 0 0 0'}}>
                The <code>$(...)</code> syntax shown in this section is <strong>deprecated</strong> and maintained only for backward compatibility with legacy projects.
                <br/><br/>
                <strong>Modern Alternative:</strong> Use property chaining with direct evaluation: <code>{`$.id.ledger`}</code> instead of <code>{`$($.id).ledger`}</code>
                <br/><br/>
                While this syntax still works, it may be removed in future versions. New projects should use property chaining wherever possible.
            </p>
        </div>

        <p className="docs-p">
            In advanced macros like <code>%pick</code>, you often iterate over a list of items. Sometimes, you need to use the properties of the <em>current</em> item (<code>$.</code>) to look up a <em>different</em> variable.
        </p>
        <div className="docs-pre">
            <span style={{color:'var(--text-muted)'}}>// Scenario: You want to check the 'ledger' property of a variable named 's1', 's2', etc.</span>
            <br/>
            <span style={{color:'var(--text-muted)'}}>// The current item <code>$.</code>has the ID 's1'.</span>
            <br/><br/>
            <code className="docs-code" style={{color: 'var(--docs-accent-green)'}}>
                {`%pick[Suspects; 1, $($.id).ledger < 3]`}
            </code>
        </div>
        <p className="docs-p" style={{fontSize:'0.9rem'}}>
            <strong>How it works:</strong>
            <br/>1. The inner <code>($.id)</code> resolves to the string <code>"s1"</code>.
            <br/>2. The engine then uses that string to look up the variable <code>$s1</code>.
            <br/>3. Finally, it checks <code>$s1.ledger</code>.
        </p>
        <div className="docs-callout" style={{marginTop:'1rem', borderColor:'var(--danger-color)'}}>
            <strong style={{color:'var(--danger-color)'}}>Why Braces <code>{`{}`}</code> Fail Inside a Macro Filter</strong>
            <p className="docs-p" style={{fontSize:'0.9rem', margin:'0.5rem 0 0 0'}}>
                The engine's "Russian Doll" model resolves the innermost <code>{`{}`}</code> blocks <strong>before the macro runs</strong>.
            </p>
            <div className="docs-pre" style={{marginTop:'0.5rem', fontSize:'0.85rem'}}>
                <span style={{color:'var(--text-muted)'}}>// Incorrect Syntax</span><br/>
                <code className="docs-code" style={{color:'var(--danger-color)'}}>{`{%pick[suspects; 1, $.id.ledger < 3]}`}</code>
                <br/><br/>
                <strong>How it Fails:</strong>
                <br/>1. The outer parser sees <code>{`{$.id}`}</code> and resolves it immediately.
                <br/>2. At this point, there is no "current item," so <code>$.</code> is unknown. It resolves to an error or empty string.
                <br/>3. The macro receives a broken filter: <code>%pick[Suspects; 1, .ledger {`<`} 3]</code>, which fails.
            </div>

            <p className="docs-p" style={{fontSize:'0.9rem', margin:'1rem 0 0 0'}}>
                The <code>$(...)</code> syntax works because it "hides" the logic from the outer parser. The macro receives the raw string <code>$($.id)</code> and only evaluates it later, when it has set the correct <code>$.</code> context for each suspect it is checking.
            </p>
        </div>
    </div>
</section>
<section id="advanced-math">
    <h2 className="docs-h2">3. Advanced Math & Functions</h2>
    <p className="docs-p">
        While ScribeScript has its own operators for simple logic, its logic blocks <code>{`{...}`}</code> are processed by a sandboxed JavaScript engine. This gives you access to powerful built-in functions for complex game mechanics without compromising security.
    </p>

    <div className="docs-callout">
        <strong style={{color: 'var(--docs-text-main)'}}>How to tell the difference:</strong>
        <p className="docs-p" style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0'}}>
            If it starts with <code>Math.</code>, it's a JavaScript function. If it doesn't, it's a standard ScribeScript operation.
        </p>
        <div className="docs-grid" style={{margin:'1rem 0 0 0'}}>
            <div className="docs-card" style={{padding:'1rem'}}>
                <h4 className="docs-h4" style={{color:'var(--docs-accent-blue)'}}>ScribeScript</h4>
                <code className="docs-code">{`{ 1 ~ 10 }`}</code>
                <code className="docs-code" style={{marginLeft:'1rem'}}>{`{ A | B }`}</code>
            </div>
            <div className="docs-card" style={{padding:'1rem'}}>
                <h4 className="docs-h4" style={{color:'var(--docs-accent-green)'}}>JavaScript <code>{`Math()`}</code></h4>
                <code className="docs-code">{`{ Math.floor(...) }`}</code>
                <code className="docs-code" style={{marginLeft:'1rem'}}>{`{ Math.pow(...) }`}</code>
            </div>
        </div>
    </div>

    <h3 className="docs-h3">Useful <code>{`Math()`}</code> Functions</h3>
    <p className="docs-p">
        You can call standard JavaScript <code>{`Math()`}</code> functions directly inside a logic block. Here are some of the most useful ones for game development.
    </p>
    <table className="docs-table">
        <thead><tr><th>Function</th><th>Description</th><th>Example</th></tr></thead>
        <tbody>
            <tr>
                <td><code>Math.floor(n)</code></td>
                <td><strong>Rounds Down.</strong> Chops off the decimal of any number. Essential for getting a clean integer from division.</td>
                <td><code>{`{ Math.floor($xp / 10) }`}</code></td>
            </tr>
            <tr>
                <td><code>Math.ceil(n)</code></td>
                <td><strong>Rounds Up.</strong> Always rounds to the next highest integer. Useful for calculating costs (e.g., "you need at least 2 boats for 3 people").</td>
                <td><code>{`{ Math.ceil($party_size / 2) }`}</code></td>
            </tr>
            <tr>
                <td><code>Math.round(n)</code></td>
                <td><strong>Standard Rounding.</strong> Rounds to the nearest integer (0.5 and up goes up).</td>
                <td><code>{`{ Math.round($value * 1.15) }`}</code></td>
            </tr>
            <tr>
                <td><code>Math.pow(base, exp)</code></td>
                <td><strong>Power Of.</strong> Calculates <code>base</code> to the power of <code>exp</code>. The foundation of exponential growth or decay.</td>
                <td><code>{`{ Math.pow(10, $level - 1) }`}</code></td>
            </tr>
             <tr>
                <td><code>Math.min(a, b, ...)</code></td>
                <td><strong>Minimum.</strong> Returns the smallest of two or more numbers. Perfect for finding the weakest stat.</td>
                <td><code>{`{ Math.min($stat1, $stat2) }`}</code></td>
            </tr>
             <tr>
                <td><code>Math.max(a, b, ...)</code></td>
                <td><strong>Maximum.</strong> Returns the largest of two or more numbers. Perfect for finding the strongest stat or applying a cap.</td>
                <td><code>$hp = {`{ Math.max(0, $hp - @damage) }`}</code></td>
            </tr>
        </tbody>
    </table>
        <div className="docs-card">
            <h4 className="docs-h4">Example: Using math to store multiple character states as one number</h4>
            <p className="docs-p" style={{fontSize:'0.9rem'}}>
                To track the status of multiple different quality levels between 0 and 9, you can use math operations to encode this in a single number or quality level. Each decimal place acts as a "slot" for one of these levels, and the digit in that slot is their status code (e.g., 0=Available, 2=Wounded, 4=Dead).
            </p>
            <div className="docs-pre">
                <span style={{color:'var(--text-muted)'}}>// Check the history of Suspect #3 for the Coroner role.</span>
                <br/>
                <code className="docs-code">
                    {`{@suspect_id = 3}`}
                </code>
                <br/><br/>
                <span style={{color:'var(--text-muted)'}}>// 1. Isolate the digit for Suspect #3 from the ledger number.</span>
                <br/>
                <code className="docs-code" style={{ whiteSpace: 'pre-wrap' }}>
                    {`{@power_of_10 = { Math.pow(10, @suspect_id - 1) }}
            {@status = { Math.floor( ($ledger_coroner / @power_of_10) ) % 10 }}`}
                </code>
                <br/><br/>
                <span style={{color:'var(--text-muted)'}}>// 2. Use the status to change the narrative.</span>
                <br/>
                <code className="docs-code" style={{ whiteSpace: 'pre-wrap' }}>
            {`{ @status == 2 : 
                "You recognize this one. You booked them last summer... turned out they were innocent. Seeing them again sends a chill down your spine." 
            | 
                "A new face. You've never seen this coroner before." 
            }`}
                </code>
                <br/><br/>
                <span style={{color:'var(--text-muted)'}}>// 3. (In another effect) Update the ledger after a case.</span>
                <br/>
                <span style={{color:'var(--text-muted)'}}>// Mark Suspect #3 as 'Booked (Innocent)' (Code 2)</span>
                <br/>
                <code className="docs-code">
                    {`$ledger_coroner += { 2 * @power_of_10 }`}
                </code>
            </div>
        <h5 className="docs-h4" style={{marginTop:'1.5rem', fontSize:'1rem', color:'var(--docs-accent-gold)'}}>How The Math Works</h5>
        <p className="docs-p" style={{fontSize:'0.9rem'}}>
            Let's say <code>$ledger_coroner</code> is <strong>43210</strong> and we want the status for Suspect #3.
        </p>
        <ol className="docs-list" style={{fontSize:'0.9rem'}}>
            <li>
                <strong><code>Math.pow(10, @suspect_id - 1)</code></strong>
                <br/>This creates our "shifter." It calculates 10 to the power of (3-1), which is 100. This number targets the 100s place, the slot for Suspect #3.
            </li>
            <li>
                <strong><code>$ledger_coroner / @power_of_10</code></strong>
                <br/>Dividing by the shifter moves the decimal point. <code>43210 / 100</code> becomes <code>432.10</code>. The digit we want (2) is now in the ones place, just before the decimal.
            </li>
            <li>
                <strong><code>Math.floor(...)</code></strong>
                <br/>This function rounds down, chopping off the decimal part. <code>Math.floor(432.10)</code> becomes <code>432</code>.
            </li>
            <li>
                <strong><code>... % 10</code> (Modulo)</strong>
                <br/>The modulo operator gives you the <strong>remainder</strong> of a division. Any integer divided by 10 has its last digit as the remainder. <code>432 % 10</code> gives a remainder of <strong>2</strong>.
            </li>
        </ol>
        <p className="docs-p" style={{fontSize:'0.9rem'}}>
            We have successfully extracted the status code <strong>2</strong> for Suspect #3, all with a single line of ScribeScript math.
        </p>
    </div>
    <h3 className="docs-h3">Bitwise Operators (Flag Management)</h3>
    <p className="docs-p">
        Bitwise operators are powerful tools for managing multiple true/false states (flags) within a single number. This is perfect for systems like RMO (Relation=4, Motive=2, Opportunity=1).
    </p>
    <table className="docs-table">
        <thead><tr><th>Operator</th><th>Name</th><th>Use Case</th></tr></thead>
        <tbody>
            <tr>
                <td><code>&</code></td>
                <td>AND</td>
                <td><strong>Check a Flag:</strong> Is a specific bit "on"?</td>
            </tr>
            <tr>
                <td><code>|</code></td>
                <td>OR</td>
                <td><strong>Set a Flag:</strong> Turn a specific bit "on" without affecting others.</td>
            </tr>
            <tr>
                <td><code>^</code></td>
                <td>XOR</td>
                <td><strong>Compare Flags:</strong> Get a number representing the difference between two flag sets.</td>
            </tr>
        </tbody>
    </table>

    <div className="docs-callout" style={{padding:'1rem', margin:'1rem 0', borderColor:'#56b6c2'}}>
    <strong style={{color:'var(--docs-text-main)'}}>Explaining flag setting with RMO from <em>Concrete Requiem</em></strong>
    <p className="docs-p" style={{fontSize:'0.9rem', margin:'0.5rem 0 0 0'}}>
        In <em>Concrete Requiem</em> Every character profile is defined by three factors, stored as "flags" in a single number:
    </p>
    <ul className="docs-list" style={{fontSize:'0.9rem', margin:'0.5rem 0 0 0'}}>
        <li><strong>Relation (Value 4):</strong> Did they have a personal connection to the victim?</li>
        <li><strong>Motive (Value 2):</strong> Did they have a reason (greed, revenge, passion)?</li>
        <li><strong>Opportunity (Value 1):</strong> Were they physically able to commit the crime?</li>
    </ul>
    <p className="docs-p" style={{fontSize:'0.9rem', margin:'0.5rem 0 0 0'}}>
        By adding these values, you get a number from 0 to 7 that represents their entire profile. For example, a suspect with Motive (2) and Opportunity (1) has an RMO of 3. Bitwise operators let you query these flags.
    </p>
</div>

    <div className="docs-card" style={{marginTop:'1rem'}}>
        <h4 className="docs-h4">Example 1: Checking a Flag with AND <code>&</code></h4>
        <p className="docs-p" style={{fontSize:'0.9rem'}}>
            The <code>&</code> operator checks which bits are active in *both* numbers. We use it to see if a specific flag is part of a character's RMO.
        </p>
        <div className="docs-pre">
            <span style={{color:'var(--text-muted)'}}>// Check if $rmo has the "Relation" (4) flag turned on</span>
            <br/>
            <code className="docs-code">
                ($rmo & 4) == 4
            </code>
            <br/><br/>
            <span style={{color:'var(--text-muted)'}}>// Logic: If $rmo is 5 (101), then (101 & 100) results in 100 (which is 4).</span>
        </div>
    </div>
    
    <div className="docs-card">
        <h4 className="docs-h4">Example 2: Setting a Flag with OR <code>|</code></h4>
        <p className="docs-p" style={{fontSize:'0.9rem'}}>
            The <code>|</code> operator combines the active bits from both numbers. Use this to grant a character a new flag without erasing their existing ones.
        </p>
        <div className="docs-pre">
            <span style={{color:'var(--text-muted)'}}>// The character gains Opportunity (1) at the crime scene.</span>
            <br/>
            <code className="docs-code">
                $rmo = {`{ $rmo | 1 }`}
            </code>
            <br/><br/>
            <span style={{color:'var(--text-muted)'}}>// Logic: If $rmo was 4 (100), it becomes (100 | 001), resulting in 101 (which is 5).</span>
        </div>
    </div>
    
    <div className="docs-card">
        <h4 className="docs-h4">Example 3: Comparing Flags with XOR <code>^</code></h4>
        <p className="docs-p" style={{fontSize:'0.9rem'}}>
            The <code>^</code> operator returns a number representing only the bits that are different. This is perfect for checking "Degrees of Separation."
        </p>
        <div className="docs-pre">
            <span style={{color:'var(--text-muted)'}}>// Check if two RMOs are identical (result 0) OR have only 1 difference (result 1, 2, or 4).</span>
            <br/>
            <code className="docs-code">
                ($rmo_A ^ $rmo_B) {'<'} 5 && ($rmo_A ^ $rmo_B) != 3
            </code>
            <br/><br/>
            <span style={{color:'var(--text-muted)'}}>// Logic: If A is 7 (111) and B is 5 (101), (A ^ B) results in 010 (which is 2).</span>
        </div>
    </div>
</section>
        </div>
    );
}