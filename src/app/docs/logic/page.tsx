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
    <strong style={{color: '#fff'}}>Grouping with Parentheses:</strong> Use <code>( )</code> to control the order of operations for complex checks.
    <br/>
    <code className="docs-code">($has_key == 1 || $lockpicking &gt; 5) && $stamina &gt; 0</code>
</div>
            </section>

            {/* SECTION 2: EFFECTS */}
                
            

            <section id="syntax-rules">
    <h2 className="docs-h2">3. Brackets: The Three Meanings</h2>
    <p className="docs-p">
        ScribeScript uses three types of brackets, each with a very specific job. Understanding the difference is the key to writing powerful and bug-free logic.
    </p>

    {/* DEFINITIONS */}
    <div className="docs-grid">
        <div className="docs-card" style={{borderColor: '#f1c40f'}}>
            <h4 className="docs-h4" style={{color: '#f1c40f'}}>{`{ }`} Logic Blocks</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>The Engine Switch.</strong> Tells the parser to "stop reading text and start calculating." This is how you inject dynamic values into a string.
            </p>
        </div>
        <div className="docs-card" style={{borderColor: '#61afef'}}>
            <h4 className="docs-h4" style={{color: '#61afef'}}>{`( )`} Parentheses</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>The Grouper.</strong> Used inside code to control the order of operations, especially for combining AND/OR logic. It tells the engine "do this part first."
            </p>
        </div>
        <div className="docs-card" style={{borderColor: '#98c379'}}>
            <h4 className="docs-h4" style={{color: '#98c379'}}>{`[ ]`} Square Brackets</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>The Parameter Block.</strong> Used to provide arguments to a macro (`%chance[...]`) or metadata to an effect (`$gold[desc:...]`).
            </p>
        </div>
    </div>

    <h3 className="docs-h3">Edge Cases: When Braces <code>{`{}`}</code> Are Essential</h3>
    <p className="docs-p">
        Braces are required whenever you need to resolve a complex expression into a single value <em>before</em> the surrounding logic is processed.
    </p>
    
    <div className="docs-card">
        <h4 className="docs-h4">Edge Case 1: Dynamic Targets in Logic Fields</h4>
        <p className="docs-p">
            A logic field like <code>visible_if</code> can parse a simple comparison. But if the target of the comparison is itself a calculation, you <strong>must</strong> wrap that calculation in braces.
        </p>
        <div className="docs-pre">
            <span style={{color:'#777'}}>// INCORRECT: The parser will break trying to read this.</span>
            <br/>
            <code className="docs-code" style={{color: '#e06c75'}}>$gold &gt; $level * 50</code>
            <br/><br/>
            <span style={{color:'#777'}}>// CORRECT: The "Russian Doll" model solves the inner block first.</span>
            <br/>
            <code className="docs-code" style={{color: '#98c379'}}>
                $gold &gt; {`{ $level * 50 }`}
            </code>
        </div>
        <p className="docs-p" style={{fontSize:'0.9rem'}}>
            <strong>Why it works:</strong> The engine first solves <code>{`{ $level * 50 }`}</code> into a single number (e.g., <code>500</code>). The final expression becomes <code>$gold &gt; 500</code>, which the logic field can easily parse.
        </p>
    </div>

    <div className="docs-card">
        <h4 className="docs-h4">Edge Case 2: Conditional Values in Effect Fields</h4>
        <p className="docs-p">
            The same rule applies to effects. If the <em>value</em> you are assigning is conditional, that condition must be resolved to a single value first.
        </p>
        <div className="docs-pre">
            <span style={{color:'#777'}}>// INCORRECT: This is syntactically invalid.</span>
            <br/>
            <code className="docs-code" style={{color: '#e06c75'}}>$supplies += #season == 'Winter' : 2 | 1</code>
            <br/><br/>
            <span style={{color:'#777'}}>// CORRECT: The conditional is resolved to a number before the `+=` is executed.</span>
            <br/>
            <code className="docs-code" style={{color: '#98c379'}}>
                $supplies += {`{ #season == 'Winter' : 2 | 1 }`}
            </code>
        </div>
    </div>

    <h3 className="docs-h3">Edge Case: When Parentheses <code>()</code> Are Essential</h3>
    <p className="docs-p">
        The parser has a default order for <code>&&</code> and <code>||</code>, but relying on it can lead to bugs. You <strong>should try to</strong> use parentheses to make your intent clear when combining these operators.
    </p>
    <div className="docs-card">
        <h4 className="docs-h4">The Ambiguity of AND/OR</h4>
        <p className="docs-p">
            Imagine you want to open a door if you have a key OR are a good lockpick, but ONLY if the door isn't barred.
        </p>
        <div className="docs-pre">
            <span style={{color:'#777'}}>// AMBIGUOUS: Could be read two ways. Is the bar irrelevant if you have the key?</span>
            <br/>
            <code className="docs-code" style={{color: '#e06c75'}}>$has_key == 1 || $lockpicking &gt; 5 && !$is_barred</code>
            <br/><br/>
            <span style={{color:'#777'}}>// CORRECT: The parentheses create an unambiguous group.</span>
            <br/>
            <code className="docs-code" style={{color: '#98c379'}}>
                ($has_key == 1 || $lockpicking &gt; 5) && !$is_barred
            </code>
        </div>
        <p className="docs-p" style={{fontSize:'0.9rem'}}>
            The second version makes it clear: the "barred door" check applies to both the key and the lockpicking skill. Using parentheses prevents subtle logic bugs that are very hard to track down.
        </p>
    </div>
</section>
        </div>
    );
}