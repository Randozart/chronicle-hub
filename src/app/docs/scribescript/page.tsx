'use client';

import ProbabilityChart from '@/components/admin/ProbabilityChart';
import React, { useState } from 'react';

export default function ScribeScriptSyntaxPage() {
    // State for the interactive playground
    const [op, setOp] = useState('>>');
    const [target, setTarget] = useState(50);
    const [margin, setMargin] = useState(10);
    const [pivot, setPivot] = useState(60);
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(100);

    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">ScribeScript Syntax</h1>
                <p className="docs-lead">
                    The engine's native language for dynamic text and logic. 
                    Learn how to make the world react to your player.
                </p>
            </header>

            {/* 1. THE PIPELINE */}
            <section id="pipeline">
                <h2 className="docs-h2">1. The Resolution Pipeline</h2>
                <p className="docs-p">
                    To master ScribeScript, you must understand the "Contract" between the Language and the Engine. 
                    The Engine does not natively understand "Health", "Probability", or "Inventory". It interprets <strong>Strings</strong>.
                </p>
                <p className="docs-p">
                    Every field in the editor follows a strict two-step process:
                </p>
                
                    <div className="docs-card" style={{borderLeft: '4px solid #61afef'}}>
                        <h4 className="docs-h4">Step 1: ScribeScript Resolution</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            First, the ScribeScript parser scans the text for Curly Braces <code>{`{ ... }`}</code>. 
                            It executes the logic inside them and replaces the braces with the result (text or number).
                        </p>
                        <div className="docs-code" style={{marginBottom: '0.5rem', fontSize:'0.85rem'}}>
                            <strong>Input:</strong> "Reward: {`{ $level * 100 }`} Gold"
                        </div>
                        <div className="docs-code" style={{color: '#98c379', fontSize:'0.85rem'}}>
                            <strong>Output:</strong> "Reward: 500 Gold"
                        </div>
                    </div>

                    <div className="docs-card" style={{borderLeft: '4px solid #e5c07b'}}>
                        <h4 className="docs-h4">Step 2: Field Parsing</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Once ScribeScript has resolved all <code>{`{...}`}</code> blocks, the Field receives a final, plain string. 
                            How it interprets that string depends entirely on the field's purpose.
                        </p>
                        <table className="docs-table">
                            <thead>
                                <tr><th>Field Type</th><th>Expects a String that is...</th></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Text Fields</strong><br/><small>(Title, Description, etc.)</small></td>
                                    <td>Any text. The string is displayed to the player as-is.</td>
                                </tr>
                                <tr>
                                    <td><strong>Logic Fields</strong><br/><small>(Visible If, Unlock If)</small></td>
                                    <td>A logical statement. The field evaluates it to get a <strong>True/False</strong> result.</td>
                                </tr>
                                <tr>
                                    <td><strong>Challenge Field</strong><br/><small>(In an Option)</small></td>
                                    <td>A number between 0 and 100. The engine uses this number as the player's success chance.</td>
                                </tr>
                                <tr>
                                    <td><strong>Effects Field</strong><br/><small>(Quality Changes)</small></td>
                                    <td>A comma-separated list of commands. The engine splits the string by commas and executes each command in order.</td>
                                </tr>
                                <tr>
                                    <td><strong>Asset Fields</strong><br/><small>(Image Code)</small></td>
                                    <td>The unique ID of an asset in your library. The engine uses this ID to look up and display the correct image.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                <h3 className="docs-h3">Examples by Field Type</h3>

                <div className="docs-card">
                    <h4 className="docs-h4">A. Text Fields (Title, Body, Description)</h4>
                    <p className="docs-p">
                        These fields are literal. ScribeScript is used here for <strong>Adaptive Text</strong>.
                    </p>
                    <div className="docs-pre">
                        <span style={{color:'#777'}}>// Adaptive Title</span>
                        <br/>
                        <code className="docs-code">
                            {`{ $reputation > 50 : The Captain | The Stranger }`} Arrives
                        </code>
                    </div>
                    <p className="docs-p">
                        <strong>Pipeline:</strong>
                        <br/>1. ScribeScript checks <code>$reputation</code>.
                        <br/>2. If high, it returns <code>"The Captain"</code>.
                        <br/>3. The Storylet Title becomes: <strong>"The Captain Arrives"</strong>.
                    </p>
                </div>

                <div className="docs-card" style={{marginTop: '1rem'}}>
                    <h4 className="docs-h4">B. Logic Fields (visible_if, unlock_if)</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        These fields expect the full passed statement to resolve to true. 
                        It can use comma-separated values, or traditional logic operations like && and ||.
                    </p>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><code>&&</code> <strong>(AND)</strong>: Both sides must be true.</li>
                        <li><code>,</code> <strong>(Comma as AND)</strong>: A convenient shorthand for `&&`. Both sides must be true.</li>
                        <li><code>||</code> <strong>(OR)</strong>: At least one side must be true.</li>
                        <li><code>( )</code> <strong>(Grouping)</strong>: Use parentheses to control the order of checks.</li>
                    </ul>
                    <div className="docs-pre">
                        <span style={{color:'#777'}}>// Using comma as AND</span>
                        <br/>
                        <code className="docs-code">
                            $has_key == 1, $stamina &gt; 0
                        </code>
                        <br/><br/>
                        <span style={{color:'#777'}}>// Complex Logic with grouping</span>
                        <br/>
                        <code className="docs-code">
                            ($has_key == 1 || $lockpicking &gt; 5) && $stamina &gt; 0
                        </code>
                    </div>
                </div>

                <div className="docs-card" style={{marginTop: '1rem'}}>
                    <h4 className="docs-h4">C. Challenge Fields</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        The <code>Challenge</code> field on an option determines the chance of success. The ScribeScript inside this field must resolve to a single number between 0 and 100.
                    </p>
                    <div className="docs-pre">
                        <span style={{color:'#777'}}>// A simple, static chance</span>
                        <br/>
                        <code className="docs-code">
                            50
                        </code>
                        <br/><br/>
                        <span style={{color:'#777'}}>// A dynamic chance based on a skill check</span>
                        <br/>
                        <code className="docs-code">
                            {`{ $strength >> { $enemy_level * 10 } }`}
                        </code>
                    </div>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        In the second example, ScribeScript first calculates the enemy's target level. Then, it evaluates the player's <code>$strength</code> against that target and resolves the entire block into a single number like <code>"65"</code>. The engine then uses that number for the skill check.
                    </p>
                </div>

                <div className="docs-card">
                    <h4 className="docs-h4">D. Effect Fields (Quality Changes)</h4>
                    <p className="docs-p">
                        These fields expect a list of <strong>Instructions</strong> separated by commas.
                    </p>
                    <div className="docs-pre">
                        <span style={{color:'#777'}}>// Comma-Separated Commands</span>
                        <br/>
                        <code className="docs-code">
                            $gold -= 5, $xp += {`{ $intelligence * 2 }`}
                        </code>
                    </div>
                    <p className="docs-p">
                        <strong>Pipeline:</strong>
                        <br/>1. <strong>ScribeScript</strong> runs first. It calculates <code>$intelligence * 2</code> (e.g., 6).
                        <br/>&nbsp;&nbsp;&nbsp;<em>Intermediate String:</em> <code>"$gold -= 5, $xp += 12"</code>
                        <br/>2. <strong>The Engine</strong> splits the string by commas.
                        <br/>3. <strong>Execution</strong> happens Left-to-Right:
                        <br/>&nbsp;&nbsp;&nbsp;a. Subtract 5 Gold.
                        <br/>&nbsp;&nbsp;&nbsp;b. Add 12 XP.
                    </p>
                    <div className="docs-callout" style={{marginTop:'1rem', borderColor: '#e06c75'}}>
                        <strong style={{color: '#e06c75'}}>Warning:</strong> Because the Engine splits by comma <em>after</em> ScribeScript runs, 
                        be careful not to generate commas inside your ScribeScript blocks unless they are inside quotes!
                    </div>
                </div>
                <div className="docs-card">
                    <h4 className="docs-h4">E: Image Fields</h4>
                    <p className="docs-p">
                    Instead of making two separate Storylets for Day and Night, you can use one Storylet with an adaptive image by using ScribeScript in the image field.
                    </p>
                    <div className="docs-pre">
                    <span style={{color:'#777'}}>// Image Code Field</span>
                    <br/>
                    <code className="docs-code">
                    {`{ #is_night : town_square_night | town_square_day }`}
                    </code>
                    </div>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                    If the world quality <code>#is_night</code> is true (or &gt; 0), the ScribeScript block resolves to the string <code>"town_square_night"</code>. The engine then loads that asset. Otherwise, it resolves to <code>"town_square_day"</code>.
                    </p>
                    </div>
            </section>

            {/* 2. RECURSION */}
            <section id="recursion">
    <h2 className="docs-h2">2. The "Russian Doll" Model</h2>
    <p className="docs-p">
        ScribeScript is <strong>Recursive</strong>. It doesn't read left-to-right like a book; it evaluates from the <strong>Inside Out</strong>, like opening a set of Russian nesting dolls. This allows you to build complex logic from simple parts.
    </p>
    <div className="docs-callout">
        <strong style={{color: '#fff'}}>How the Parser Thinks:</strong>
        <br/>
        1. Find the most deeply nested <code>{`{...}`}</code> block (one that contains no other braces).
        <br/>
        2. Evaluate just that tiny piece to a simple value (a number or text).
        <br/>
        3. Replace the block with its result, simplifying the larger expression.
        <br/>
        4. Repeat until no braces remain.
    </div>
    
    <h3 className="docs-h3">Visualizing Recursion: A Step-by-Step Example</h3>
    <p className="docs-p">
        Let's analyze an effect where you gain Gold based on your Level plus a random dice roll.
    </p>
    
    <div className="docs-pre">
        <span style={{color:'#777'}}>// Initial Input in the Editor</span>
        <br/>
        <code className="docs-code" style={{display:'block'}}>
            $gold += {`{ { $level * 10 } + { 1 ~ 6 } }`}
        </code>
    </div>

    <p className="docs-p">
        Here's how the engine breaks it down:
    </p>
    <ol className="docs-list">
        <li>
            <strong>Step 1: Find Innermost Blocks.</strong> The engine sees two blocks at the same depth: <code>{`{ $level * 10 }`}</code> and <code>{`{ 1 ~ 6 }`}</code>. It resolves them.
            <ul style={{marginTop:'0.5rem'}}>
                <li><code>{`{ $level * 10 }`}</code> becomes <code>50</code> (assuming Level is 5).</li>
                <li><code>{`{ 1 ~ 6 }`}</code> becomes a random number, let's say <code>4</code>.</li>
            </ul>
        </li>
        <li>
            <strong>Step 2: Substitute and Simplify.</strong> The engine replaces those blocks with their results. The expression is now simpler:
            <div className="docs-pre" style={{margin:'0.5rem 0'}}>
                <code className="docs-code">$gold += {`{ 50 + 4 }`}</code>
            </div>
        </li>
        <li>
            <strong>Step 3: Repeat.</strong> The engine finds the next innermost block: <code>{`{ 50 + 4 }`}</code>.
            <ul style={{marginTop:'0.5rem'}}>
                <li><code>{`{ 50 + 4 }`}</code> becomes <code>54</code>.</li>
            </ul>
        </li>
        <li>
            <strong>Step 4: Final Substitution.</strong> The expression is now fully resolved and ready for the Effects Field to parse:
            <div className="docs-pre" style={{margin:'0.5rem 0'}}>
                <code className="docs-code">$gold += 54</code>
            </div>
        </li>
    </ol>

    <h3 className="docs-h3">The Context Switch: Braces, Whitespace, and Bugs</h3>
    <p className="docs-p">
        Understanding this model is key to avoiding common bugs. The parser treats text inside and outside braces very differently, especially regarding whitespace.
    </p>
    <div className="docs-grid">
        <div className="docs-card" style={{borderColor: '#61afef'}}>
            <h4 className="docs-h4" style={{color: '#61afef'}}>Text Context</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                Outside of braces, the parser is in <strong>Text Mode</strong>.
                <br/>Whitespace is preserved and qualities aren't evaluated.
            </p>
            <div className="docs-pre">
                <code className="docs-code">
                    Hello,&nbsp;&nbsp;&nbsp;World! I have 5 $dollars.
                </code>
            </div>
             <p className="docs-p" style={{fontSize: '0.9rem'}}>
                Result: "Hello,   World! I have 5 $dollars" (Spaces are kept, $ is treated as a normal symbol).
            </p>
        </div>
        <div className="docs-card" style={{borderColor: '#c678dd'}}>
            <h4 className="docs-h4" style={{color: '#c678dd'}}>Logic Context</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                Inside of braces, the parser is in <strong>Logic Mode</strong>.
                <br/><strong>Whitespace is ignored.</strong>
            </p>
            <div className="docs-pre">
                <code className="docs-code">
                    {`{ 5 +
                       5 }`}
                </code>
            </div>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                Result: "10" (Newlines and spaces are discarded for calculation).
            </p>
        </div>
    </div>
    

    <div className="docs-callout" style={{borderColor: '#e06c75', marginTop: '2rem'}}>
        <strong style={{color: '#e06c75'}}>Common Bug: Missing Braces</strong>
        <br/>
        If you forget braces, the engine stays in Text Mode and won't evaluate your variables.
        <div className="docs-pre" style={{marginTop:'0.5rem'}}>
            <code className="docs-code">
                "You have $gold coins."
            </code>
        </div>
        <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0}}>
            <strong>Result:</strong> "You have $gold coins."
            <br/>
            <strong>Why it fails:</strong> The engine sees <code>$gold</code> as literal text, not a variable to look up. It needs <code>{`{$gold}`}</code> to switch into Logic Mode.
        </p>
    </div>
    <div className="docs-callout" style={{padding:'1rem', marginTop:'1rem', borderColor: '#98c379'}}>
    <strong style={{color:'#98c379'}}>Deep Dive: How Whitespace is Handled</strong>
    <p className="docs-p" style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0'}}>
        The ScribeScript parser is intentionally flexible with how you format your code. It actively discards whitespace (spaces, tabs, and newlines) around your logic to keep the final output clean. Let's trace a complex example:
    </p>
    <div className="docs-pre" style={{marginTop:'1rem'}}>
        <code className="docs-code" style={{whiteSpace:'pre'}}>
{`The sky is {
    #weather == rainy : 

        dark and stormy. 
        
    | overcast.
}`}
        </code>
    </div>
    <p className="docs-p" style={{fontSize: '0.9rem', marginTop:'1rem'}}>
        Here is exactly how the engine processes this:
    </p>
    <ol className="docs-list" style={{fontSize:'0.9rem', margin: '0.5rem 0 0 0'}}>
        <li><strong>Isolate Logic:</strong> The engine identifies the entire <code>{`{...}`}</code> block.</li>
        <li><strong>Find Branch:</strong> Assuming <code>#weather</code> is "rainy", it isolates the result text for that branch. Because of the formatting, the raw text it captures includes all the surrounding newlines and indentation:
            <br/>
            <code>"\n    \n        dark and stormy. \n        \n    "</code>
        </li>
        <li><strong>Trim Whitespace:</strong> The parser applies a <code>.trim()</code> function to this raw text. This function removes all leading and trailing spaces, tabs, and newlines.</li>
        <li><strong>Get Clean Result:</strong> The result of the trim is the clean string: <code>"dark and stormy."</code></li>
        <li><strong>Substitute:</strong> Finally, this clean string is substituted back into the original sentence.</li>
    </ol>
    <p className="docs-p" style={{fontSize: '0.9rem', marginTop:'1rem'}}>
        <strong>Final Output:</strong> "The sky is dark and stormy."
    </p>
</div>
</section>

            {/* 3. SIGILS */}
           <section id="sigils">
    <h2 className="docs-h2">3. Quality Variables & Scope</h2>
    <p className="docs-p">
        Quality Variables (or qualities) are the heart of ScribeScript. Every piece of data is accessed via a <strong>Sigil</strong>, a prefix that tells the engine <em>where</em> to look for the information.
    </p>

    <div className="docs-callout">
        <strong style={{color: '#fff'}}>The Zero-State Fallback:</strong>
        <br/>
        What happens if you check a quality the player doesn't have, like <code>$wounds</code>?
        <br/>
        The engine does <strong>not</strong> crash. Instead, it creates a temporary "ghost" version of that quality with a value of <strong>0</strong> or an <strong>empty string</strong>. This allows you to write logic for qualities before the player has acquired them.
    </div>

    <h3 className="docs-h3">Scope Precedence</h3>
    <p className="docs-p">
        If a variable name exists in multiple scopes (e.g., a local quality and a world quality are both named "season"), the engine checks for it in this strict order of priority:
    </p>

    <table className="docs-table">
        <thead><tr><th>Order</th><th>Sigil</th><th>Name</th><th>Scope</th></tr></thead>
        <tbody>
            <tr><td>1</td><td><code>$.</code></td><td><strong>Self</strong></td><td>The quality currently being processed.</td></tr>
            <tr><td>2</td><td><code>@</code></td><td><strong>Alias</strong></td><td>A temporary shorthand defined within the current text field.</td></tr>
            <tr><td>3</td><td><code>$</code></td><td><strong>Local</strong></td><td>A Quality belonging to the current Character.</td></tr>
            <tr><td>4</td><td><code>#</code></td><td><strong>World</strong></td><td>A Global Quality shared by all players.</td></tr>
        </tbody>
    </table>
    <div className="docs-callout" style={{borderColor: '#f1c40f'}}>
        <strong style={{color: '#f1c40f'}}>Note on Macros:</strong> The <code>%</code> symbol is used for Macros (Engine Commands), not variables. It is handled separately from scope lookups.
    </div>

    <h3 className="docs-h3">Sigil Examples</h3>
    
    <div className="docs-card" style={{marginTop: '1.5rem'}}>
        <h4 className="docs-h4">$ (Local)</h4>
        <p className="docs-p" style={{fontSize:'0.9rem'}}>The most common sigil. It accesses a quality on the player's character sheet, whether hidden from the player or not.</p>
        <div className="docs-pre">
            <code className="docs-code">
                "You have {`{$gold}`} gold and your suspicion is at {`{$suspicion}`}."
            </code>
        </div>
    </div>
    
    <div className="docs-card" style={{marginTop: '1.5rem'}}>
        <h4 className="docs-h4"># (World)</h4>
        <p className="docs-p" style={{fontSize:'0.9rem'}}>Accesses a global variable that is the same for all players. Useful for game-wide states like seasons, war progress, or the outcome of a major event.</p>
        <div className="docs-pre">
            <code className="docs-code">
                "It is {`{#season}`} in the city. {`{#war_effort > 50 : The city is heavily fortified. | The city seems peaceful.}`} "
            </code>
        </div>
    </div>
<div className="docs-card" style={{marginTop: '1.5rem'}}>
    <h4 className="docs-h4">$. (Self)</h4>
    <p className="docs-p" style={{fontSize:'0.9rem'}}>
        Used exclusively inside a Quality's own Definition fields (like its Description). 
        It's a shorthand for "this quality's own value", and it <strong>fully supports property access</strong>.
    </p>

    <div className="docs-callout" style={{padding:'1rem'}}>
        <strong style={{color:'#fff'}}>How it Works:</strong>
        <br/>
        The engine recognizes the special <code>$.</code> prefix as a single unit meaning "this quality". 
        You can then immediately add a dot to access its properties, just like with a normal <code>$</code> variable.
        <br/>
        <code className="docs-code" style={{marginTop:'0.5rem'}}>
            [SIGIL][PROPERTY] -&gt; $.name
        </code>
        <p className="docs-p" style={{fontSize:'0.8rem', marginBottom:0, marginTop:'0.5rem'}}>
            Think of <code>$.</code> as a complete replacement for <code>$this_quality_id</code>.
        </p>
    </div>

    <h5 className="docs-h4" style={{marginTop:'1.5rem', fontSize:'1rem', color:'#e5c07b'}}>Example 1: Simple Value Access</h5>
    <p className="docs-p" style={{fontSize:'0.9rem'}}>
        In its simplest form, <code>$.</code> accesses the quality's current level.
    </p>
    <div className="docs-pre">
        <span style={{color:'#777'}}>// In the Description field for a 'Wounds' quality:</span>
        <br/>
        <code className="docs-code">
            {`{ $. > 5 : You are gravely injured. | You have a few scratches. }`}
        </code>
    </div>
    <p className="docs-p" style={{fontSize:'0.9rem'}}>This makes the description text change as the value of <code>$wounds</code> itself changes.</p>

    <h5 className="docs-h4" style={{marginTop:'1.5rem', fontSize:'1rem', color:'#e5c07b'}}>Example 2: Property Access</h5>
    <p className="docs-p" style={{fontSize:'0.9rem'}}>
        You can use <code>$.</code> to make a quality describe itself dynamically.
    </p>
    <div className="docs-pre">
        <span style={{color:'#777'}}>// In the Description for a 'Renown' quality:</span>
        <br/>
        <code className="docs-code">
            Your {`{$.name}`} is currently {`{$.level}`}.
        </code>
    </div>
    <p className="docs-p" style={{fontSize:'0.9rem'}}>
        <strong>Result:</strong> "Your Renown is currently 15."
    </p>

    <h5 className="docs-h4" style={{marginTop:'1.5rem', fontSize:'1rem', color:'#e5c07b'}}>Advanced Example: Dynamic Naming</h5>
    <p className="docs-p" style={{fontSize:'0.9rem'}}>
        You can even change a quality's public-facing name based on its own level.
    </p>
    <div className="docs-pre">
        <span style={{color:'#777'}}>// In the Name field for a 'Suspicion' quality:</span>
        <br/>
        <code className="docs-code">
            {`{ $. > 50 : Notoriety | $. > 10 : Infamy | Suspicion }`}
        </code>
    </div>
    <p className="docs-p" style={{fontSize:'0.9rem'}}>
        This single quality will appear as "Suspicion" at low levels, but automatically rename itself to "Infamy" and then "Notoriety" as its value increases, all without needing extra logic in your storylets.
    </p>
</div>

    <div className="docs-card" style={{marginTop: '1.5rem'}}>
        <h4 className="docs-h4">@ (Alias)</h4>
        <p className="docs-p" style={{fontSize:'0.9rem'}}>Creates a temporary shorthand for a longer variable name. The alias is valid throughout the <strong>entire text field</strong> in which it is defined, making complex logic much cleaner.</p>
        <div className="docs-pre">
            <span style={{color:'#777'}}>// This is long and repetitive:</span>
            <br/>
            <code className="docs-code">
                {`{ $reputation_with_the_court > 10 && $reputation_with_the_court < 50 }`}
            </code>
            <br/><br/>
            <span style={{color:'#777'}}>// This is cleaner with an alias:</span>
            <br/>
            <code className="docs-code">
                {`{ @rep = $reputation_with_the_court } { @rep > 10 && @rep < 50 }`}
            </code>
        </div>
         <p className="docs-p" style={{fontSize:'0.9rem'}}>
            The engine finds all <code>{`{@alias = ...}`}</code> definitions first. The definition block itself resolves to an empty string, so it doesn't appear in the final text, but the alias <code>@rep</code> becomes available everywhere else in that field.
         </p>
    </div>
</section>
            <section id="structures">
    <h2 className="docs-h2">4. Logic Structures</h2>
    <p className="docs-p">
        A <code>{`{...}`}</code> block is a miniature program. The symbols you use inside it tell the engine what kind of program to run. The engine is very specific about this; the presence or absence of a single symbol can completely change the meaning.
    </p>

    <h3 className="docs-h3">A. Conditionals (The Colon `:`)</h3>
    <p className="docs-p">
        If a <strong>Colon</strong> is present anywhere in the block, the engine treats it as an "If/Then/Else" structure. This is the most powerful tool for creating reactive text.
    </p>
    <div className="docs-syntax-box">
        <code className="docs-code">{`{ Condition : Result If True | Result If False }`}</code>
    </div>

    <div className="docs-card" style={{marginTop:'1.5rem'}}>
        <h4 className="docs-h4">Example 1: Simple If/Else</h4>
        <p className="docs-p" style={{fontSize: '0.9rem'}}>
            The guard's reaction depends on your reputation.
        </p>
        <div className="docs-pre">
            <code className="docs-code">
                The guard {`{ $reputation > 50 : nods respectfully. | ignores you. }`}
            </code>
        </div>
        <p className="docs-p" style={{fontSize: '0.9rem'}}>
            <strong>Result if Reputation is 60:</strong> "The guard nods respectfully."
            <br/>
            <strong>Result if Reputation is 10:</strong> "The guard ignores you."
        </p>
    </div>

    <div className="docs-card" style={{marginTop:'1.5rem'}}>
    <h4 className="docs-h4">Example 2: Chaining and Whitespace</h4>
    <p className="docs-p" style={{fontSize: '0.9rem'}}>
        You can chain multiple conditions with pipes. The engine uses the <strong>first one that is true</strong> from left to right. The final branch with no condition is the "Else" fallback.
    </p>
    <div className="docs-pre">
        <code className="docs-code" style={{whiteSpace:'pre'}}>
{`The sky is {
    #weather == rainy : dark and stormy. |
    #weather == sunny : bright and clear. |
    overcast.
}`}
        </code>
    </div>
    <p className="docs-p" style={{fontSize: '0.9rem'}}>
        Here, if `#weather` is neither "rainy" nor "sunny", it defaults to "overcast."
    </p>
</div>
    
    <div className="docs-card" style={{marginTop:'1.5rem'}}>
    <h4 className="docs-h4">Example 3: Empty Fallback for Optional Text</h4>
    <p className="docs-p" style={{fontSize: '0.9rem'}}>
        If you want text to appear *only* if a condition is met, and show nothing otherwise, you can create a conditional with only one branch. If the condition is false, the block will resolve to an empty string.
    </p>
    <div className="docs-pre">
        <code className="docs-code">
            You draw your sword{`{ $sword_is_flaming : , which bursts into arcane fire! }`}.
        </code>
    </div>
    <p className="docs-p" style={{fontSize: '0.9rem'}}>
        <strong>Result if true:</strong> "You draw your sword, which bursts into arcane fire!." 
        <br/>
        <strong>Result if false:</strong> "You draw your sword." (The block becomes an empty string, effectively disappearing).
    </p>
</div>

    <h3 className="docs-h3">B. Random Choice (The Pipe `|` without a Colon)</h3>
    <p className="docs-p">
        If your logic block contains <strong>Pipes</strong> but <strong>NO Colons</strong>, the engine treats it as a Random Choice. It will pick one of the provided options at random and return it.
    </p>

    <div className="docs-card" style={{marginTop:'1.5rem'}}>
        <h4 className="docs-h4">Example 1: Simple Flavor Text</h4>
        <p className="docs-p" style={{fontSize: '0.9rem'}}>
            Add variety to repeatable actions.
        </p>
        <div className="docs-pre">
            <code className="docs-code">
                You search the room. {`{ You find nothing. | The dust makes you sneeze. | A rat scurries past. }`}
            </code>
        </div>
        <p className="docs-p" style={{fontSize: '0.9rem'}}>
            Each time this is displayed, the player will see one of the three random outcomes.
        </p>
    </div>
    
    <div className="docs-card" style={{marginTop:'1.5rem'}}>
        <h4 className="docs-h4">Example 2: Randomizing Variables</h4>
        <p className="docs-p" style={{fontSize: '0.9rem'}}>
            Because of the "Russian Doll" model, you can use this to randomize variables before a calculation.
        </p>
        <div className="docs-pre">
            <code className="docs-code">
                $enemy_type = {`{ goblin | orc | hobgoblin }`}
            </code>
        </div>
        <p className="docs-p" style={{fontSize: '0.9rem'}}>
            In this effect, the <code>$enemy_type</code> quality will be set to one of the three strings at random.
        </p>
    </div>

    <h3 className="docs-h3">C. Random Range (The Tilde `~`)</h3>
    <p className="docs-p">
        If the block contains a <strong>Tilde</strong> between two numbers, it will resolve to a single random integer between those two values (inclusive).
    </p>

    <div className="docs-card" style={{marginTop:'1.5rem'}}>
        <h4 className="docs-h4">Example: Variable Gold Gain</h4>
        <p className="docs-p" style={{fontSize: '0.9rem'}}>
            Use this in an Effect field to make rewards less predictable.
        </p>
        <div className="docs-pre">
            <code className="docs-code">
                $gold += {`{ 10 ~ 50 }`}
            </code>
        </div>
        <p className="docs-p" style={{fontSize: '0.9rem'}}>
            The player will gain a random amount of gold between 10 and 50.
        </p>
    </div>
</section>

            <section id="introspection">
    <h2 className="docs-h2">5. Properties</h2>
    <p className="docs-p">
        Qualities are more than just numbers or text; they are objects containing a rich set of data. ScribeScript allows you to "introspect" or look inside these objects to access specific pieces of information using Dot Notation.
    </p>

    <h3 className="docs-h3">Default Value vs. Specific Properties</h3>
    <p className="docs-p">
        When you access a quality, you must be clear about what piece of information you need.
    </p>
    <div className="docs-grid">
        <div className="docs-card">
            <h4 className="docs-h4">Default Value</h4>
            <div className="docs-pre">
                <code className="docs-code">{`{$my_quality}`}</code>
            </div>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                Without a dot, you get the quality's primary value: its <strong>Level</strong> for numeric types, or its <strong>String Value</strong> for text types.
            </p>
        </div>
        <div className="docs-card">
            <h4 className="docs-h4">Property Access</h4>
            <div className="docs-pre">
                <code className="docs-code">{`{$my_quality.name}`}</code>
            </div>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                By adding a dot and a property name, you can retrieve specific metadata about the quality, like its display name.
            </p>
        </div>
    </div>

    <h3 className="docs-h3">Standard Properties</h3>
    <p className="docs-p">
        Every quality has a set of built-in properties you can access.
    </p>
    <ul className="docs-props-list">
        <li>
            <code>.name</code>
            <span>Returns the quality's <strong>Name</strong> field from the editor. This is useful for creating generic messages that can apply to many different qualities.</span>
            <div className="docs-code" style={{marginTop:'5px', fontSize:'0.8rem'}}>Your {`{$wounds.name}`} has increased!</div>
        </li>
        <li>
            <code>.description</code>
            <span>Returns the quality's <strong>Description</strong> field. This is powerful for creating in-game tooltips or lore entries.</span>
            <div className="docs-code" style={{marginTop:'5px', fontSize:'0.8rem'}}>Lore: {`{$ancient_tome.description}`}</div>
        </li>
        <li>
            <code>.level</code>
            <span>Explicitly returns the quality's numeric level. This is useful if you need to be sure you are getting a number, even if the default value might be text in some edge cases.</span>
        </li>
        
    </ul>

    <h3 className="docs-h3">Computed & Variant Properties</h3>
    <p className="docs-p">
        These special properties perform logic to return dynamic text, giving your writing more nuance.
    </p>

    <div className="docs-card" style={{marginTop:'1.5rem'}}>
        <h4 className="docs-h4">.plural & .singular (Smart Grammar)</h4>
        <p className="docs-p" style={{fontSize:'0.9rem'}}>
            These properties read from the <strong>Singular Name</strong> and <strong>Plural Name</strong> fields in the Quality Editor to automate grammar.
        </p>
        <ul className="docs-list" style={{fontSize: '0.9rem'}}>
            <li><code>.singular</code> always returns the Singular Name.</li>
            <li><code>.plural</code> is smarter: if the quality's level is exactly 1, it returns the singular name; otherwise, it returns the plural name.</li>
        </ul>
        <div className="docs-pre">
            <span style={{color:'#777'}}>// In Quality Editor: Singular="Coin", Plural="Coins"</span>
            <br/>
            <code className="docs-code">
                You gain {`{$gold_coins}`} {`{$gold_coins.plural}`}.
            </code>
        </div>
        <p className="docs-p" style={{fontSize: '0.9rem'}}>
            <strong>If $gold_coins is 1:</strong> "You gain 1 Coin."
            <br/>
            <strong>If $gold_coins is 5:</strong> "You gain 5 Coins."
        </p>
    </div>

    <div className="docs-card" style={{marginTop:'1.5rem'}}>
        <h4 className="docs-h4">.variant_key (Text Variants)</h4>
        <p className="docs-p" style={{fontSize:'0.9rem'}}>
            In the Quality Editor, you can define a dictionary of <strong>Text Variants</strong>. This is an advanced feature for creating qualities that act as containers for related pieces of text, like a set of pronouns.
        </p>
        <div className="docs-pre">
            <span style={{color:'#777'}}>// In a 'pronouns' quality with Text Variants:</span>
            <br/>
            <span style={{color:'#777'}}>// key: "subject", value: "{`{ $.stringValue == 'he/him' : 'he' | 'they' }`}"</span>
            <br/>
            <code className="docs-code">
                {`{$pronouns.subject.capital}`} goes to the market.
            </code>
        </div>
        <p className="docs-p" style={{fontSize: '0.9rem'}}>
            Here, <code>.subject</code> is the variant key. The engine looks up this key, evaluates the ScribeScript stored there, and returns the result ("He", "She", etc.), which is then formatted by <code>.capital</code>.
        </p>
    </div>
    <div className="docs-card" style={{marginTop:'1.5rem'}}>
    <h4 className="docs-h4">.source (Item History)</h4>
    <p className="docs-p" style={{fontSize:'0.9rem'}}>
        For Items and Equipables, this property accesses the item's "memory". When you gain an item, you can attach a <code>source</code> string. The engine maintains a stack of these sources.
        When accessed in text, it will share the oldest stored source on that item.
    </p>
    <div className="docs-pre">
        <span style={{color:'#777'}}>// Setting a source when gaining an item:</span>
        <br/>
        <code className="docs-code">
            $strange_coin[source:found it in a dusty chest] += 1
        </code>
        <br/><br/>
        <span style={{color:'#777'}}>// Recalling the source later in the story:</span>
        <br/>
        <code className="docs-code">
            You inspect the strange coin. You remember that you {`{$strange_coin.source}`}.
        </code>
    </div>
    <p className="docs-p" style={{fontSize: '0.9rem'}}>
        <strong>Result:</strong> "You inspect the strange coin. You remember that you found it in a dusty chest."
    </p>
    <div className="docs-callout" style={{padding:'1rem', marginTop:'1rem'}}>
        <strong style={{color:'#fff'}}>The Pruning Logic: Smart History</strong>
        <p className="docs-p" style={{fontSize: '0.85rem', margin: '0.5rem 0 0 0'}}>
            When you spend an item in the effects field, rather than just accessing it in the text, the engine doesn't just remove a random source. 
            It uses a <strong>Proportional, Credit-Based System</strong> to decide what to forget. 
        </p>
        <ul className="docs-list" style={{fontSize: '0.85rem', margin: '0.5rem 0 0 0'}}>
            <li><strong>FIFO (First-In, First-Out):</strong> The <code>.source</code> property always returns the <strong>oldest</strong> source in the stack. When sources are removed, they are also removed from the oldest first. This means it always matches the text printed by accessing the property.</li>
            <li><strong>Credit System:</strong> Spending items builds "pruning credit." You might need to spend several items before a source is removed, especially if your stack is large.</li>
            <li><strong>Unique Protection:</strong> The engine is designed to protect narratively important, unique sources. It will always prefer to prune one of ten identical "bought from the market" sources before it removes your single "received from a dying queen" source.</li>
        </ul>
    </div>
</div>

    <h3 className="docs-h3">Formatters (Chaining)</h3>
    <p className="docs-p">
        Formatters are special properties that must be the <strong>last</strong> item in a chain. They take the final text result and modify its case.
    </p>
    <ul className="docs-list">
        <li><code>.capital</code>: Capitalizes the first letter. ("the sword" -&gt; "The sword")</li>
        <li><code>.upper</code>: Converts to ALL CAPS. ("The Sword" -&gt; "THE SWORD")</li>
        <li><code>.lower</code>: Converts to all lowercase. ("The Sword" -&gt; "the sword")</li>
    </ul>

    <h3 className="docs-h3">Level Spoofing (The "Ghost" State)</h3>
    <p className="docs-p">
        Level Spoofing is a powerful tool for previews and dynamic text. It lets you ask, "What <strong>would</strong> this quality's property look like if its level were X?"
    </p>
    <div className="docs-syntax-box">
        <code className="docs-code">$quality[LEVEL].property</code>
    </div>
    <p className="docs-p">
        The engine creates a temporary "ghost" version of the quality at the specified `LEVEL` and then accesses the `property`. The original quality remains unchanged.
    </p>
    <div className="docs-card" style={{marginTop:'1.5rem'}}>
        <h4 className="docs-h4">Use Case: Previewing the Next Level</h4>
        <p className="docs-p" style={{fontSize:'0.9rem'}}>
            Imagine a 'Renown' quality whose Name field has dynamic text: <code>{`{ $. > 50 : 'Legend' | 'Well-Known' }`}</code>. You can show the player what the next title will be.
        </p>
        <div className="docs-pre">
            <code className="docs-code">
                Your current title is {`{$renown.name}`}.
                <br/>
                Next title: {`{$renown[51].name}`}.
            </code>
        </div>
        <p className="docs-p" style={{fontSize: '0.9rem'}}>
            Even if your current Renown is 20, the second line will correctly display "Next title: Legend." because it's evaluating the name *as if* the level were 51.
        </p>
    </div>
    
</section>

            {/* 6. CHALLENGES - THE BIG ONE */}
<section id="challenges">
    <h2 className="docs-h2">6. Challenges & Probability</h2>
    <p className="docs-p">
        Chronicle Hub features a powerful system for handling outcomes that aren't guaranteed. This allows you to create "Soft" checks where player stats influence their odds of success, rather than just simple Pass/Fail gates.
    </p>
    <p className="docs-p">
        At its core, every challenge resolves to a single number: the <strong>Success Chance (0-100)</strong>. The engine then rolls a d100; if the roll is <strong>equal to or less than</strong> the success chance, the outcome is a success.
    </p>

    <h3 className="docs-h3">The Challenge Field</h3>
    <p className="docs-p">
        On any given option, the <code>Challenge</code> field is where you define this success chance. How you do it determines the complexity of the check.
    </p>
    <div className="docs-grid">
        <div className="docs-card">
            <h4 className="docs-h4">Static Chance</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                The simplest challenge is a fixed percentage. You can just type a number directly into the field.
            </p>
            <div className="docs-pre">
                <span style={{color:'#777'}}>// In the Challenge field:</span>
                <br/>
                <code className="docs-code">50</code>
            </div>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>Result:</strong> A flat 50% chance of success, regardless of player stats.
            </p>
        </div>
        <div className="docs-card">
            <h4 className="docs-h4">Dynamic Chance (Skill Check)</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                To make the chance depend on a player's quality, you use a ScribeScript logic block. This is where the real power lies.
            </p>
            <div className="docs-pre">
                <span style={{color:'#777'}}>// In the Challenge field:</span>
                <br/>
                <code className="docs-code">{`{ $strength >> 50 }`}</code>
            </div>
             <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>Result:</strong> A variable chance that increases as the player's <code>$strength</code> gets higher.
            </p>
        </div>
    </div>
    
    <h3 className="docs-h3">Challenge Expressions</h3>
    <p className="docs-p">
        When you write a challenge expression inside braces, like <code>{`{ $strength >> 50 }`}</code>, ScribeScript evaluates it and resolves it into a single number (0-100). This number is then passed to the Challenge field.
    </p>
    <div className="docs-pre">
        <code className="docs-code">{`{ $strength >> 50 }`}</code>
    </div>
    <p className="docs-p">
        <strong>Resolution Example:</strong> If a player's <code>$strength</code> is 65, the engine might calculate their odds against the target of 50 as being quite high, resolving the entire block to the number <code>70</code>. If their strength was only 30, it might resolve to <code>20</code>. The Challenge field then sees "70" or "20" and performs the roll.
    </p>
    <p className="docs-p">
        Because this resolves to a number, you can even use it in mathematical effects:
    </p>
    <div className="docs-pre">
        <code className="docs-code">
            $gold_reward += {`{ 10 * { $negotiation >> 40 } }`}
        </code>
        <br/><small style={{color:'#777'}}>The reward scales based on your success chance. A 70% chance would yield 700 gold.</small>
    </div>
     <div className="docs-callout">
        <strong style={{color: '#fff'}}>Anonymous vs. Explicit Macros:</strong>
        <br/>
        The syntax <code>{`{ $strength >> 50 }`}</code> is an "anonymous" shorthand. There is also an explicit macro, <code>{`{%chance[...]}`}</code>, which offers more control. Both perform the same core function of calculating a probability number. The explicit macro is covered in detail in the Macros & Functions chapter.
    </div>

<h3 className="docs-h3">Probability Shorthands and The Single Roll</h3>
<p className="docs-p">
    While a Challenge Expression resolves to a number, you often need a direct <strong>True/False</strong> result for logic gates (like <code>visible_if</code>) or for embedding conditional text. ScribeScript provides a powerful shorthand for this.
</p>
<p className="docs-p">
    Normally, the <code>%</code> symbol is reserved for explicit macros like <code>{`{%random[50]}`}</code> (covered in the Macros chapter). However, to make writing probabilities easier, the parser recognizes a special shorthand:
</p>
<div className="docs-syntax-box">
    <code className="docs-code">{`{ Expression }%`}</code>
</div>
<p className="docs-p">
    When the parser sees a number immediately followed by a <code>%</code>, it treats it as a shorthand for the <code>%random</code> macro.
</p>

<div className="docs-callout">
    <strong style={{color: '#fff'}}>The Single Roll Rule (Unified Randomness):</strong>
    <p className="docs-p" style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0'}}>
        When a player clicks an option, the engine generates <strong>one single random number</strong> for that entire action (the "Resolution Roll," from 0-100). This one number is used for everything.
    </p>
    <ol className="docs-list" style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0'}}>
        <li>First, it's used to evaluate the <code>Challenge</code> field to determine Success or Failure.</li>
        <li>Then, that <strong>same roll</strong> is used to evaluate any <code>%</code> shorthands or <code>%random</code> macros within the resulting text.</li>
    </ol>
    <p className="docs-p" style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0'}}>
        This allows you to create consistent, dependent random outcomes. If a player succeeds on a 30% check, you know their roll was low, and you can add extra flavor text that also triggers on low rolls.
        If you want the random function to evaluate independently of the challenge roll, you can use clever math to still give a character a flat percentage chance on success.
    </p>
</div>

<h4 className="docs-h4">How it Works</h4>
<ol className="docs-list">
    <li>The inner block <code>{`{...}`}</code> resolves to a number. For example, <code>{`{ $strength >> 50 }`}</code> becomes <code>"60"</code>.</li>
    <li>The text becomes <code>60%</code>.</li>
    <li>The engine recognizes <code>NUMBER%</code> and checks if the single Resolution Roll is <strong>less than or equal to</strong> 60. If so, it returns <code>true</code>, otherwise <code>false</code>.</li>
</ol>

<h4 className="docs-h4">Example 1: Inverting the Roll with `!`</h4>
<p className="docs-p">
    The <code>!</code> operator inverts the result of a boolean check. For a probability check, this effectively turns "roll under" into "roll over".
</p>
<div className="docs-pre">
    <span style={{color:'#777'}}>// In a Storylet's 'Text' field:</span>
    <br/>
    <code className="docs-code">
        You attempt to pick the lock. {`{ !{ 70% } : Your hands tremble; this lock is beyond your skill. | }`}
    </code>
</div>
<p className="docs-p" style={{fontSize: '0.9rem'}}>
    Here, <code>{`!{ 70% }`}</code> means "True if the Resolution Roll is <strong>greater than</strong> 70." This flavor text will only appear on a high roll, indicating a definite failure.
</p>

<h4 className="docs-h4">Advanced Pattern: "Roll Between" for Tiered Results</h4>
<p className="docs-p">
    By combining logical operators like <code>&&</code> (AND) and <code>!</code> (NOT), you can create specific outcome brackets. For clarity and to guarantee correct evaluation order, it's best practice to wrap each probability check in its own <code>{`{...}%`}</code> block.
</p>
<div className="docs-pre">
    <code className="docs-code" style={{whiteSpace:'pre'}}>
{`You swing your sword! {
    { 10% } : A CRITICAL HIT! Double damage! |
    ( !{10%} && {60%} ) : A solid hit. Normal damage. |
    You miss.
}`}
    </code>
</div>
<div className="docs-p" style={{fontSize: '0.9rem'}}>
    <strong>How this evaluates (if the Resolution Roll is 45):</strong>
    <br/>
    1. <strong>First Branch:</strong> The engine checks <code>{`{ 10% }`}</code>. Is 45 {`<=`} 10? No. It moves to the next branch.
    <br/>
    2. <strong>Second Branch:</strong> The engine evaluates the full condition <code>{`( !{10%} && {60%} )`}</code>.
        <ul style={{margin:'0.5rem 0 0.5rem 1rem'}}>
            <li>It resolves the first part: <code>{`{10%}`}</code> becomes <code>false</code> (since 45 is not {`<=`} 10). The <code>!</code> inverts this to <code>true</code>.</li>
            <li>It resolves the second part: <code>{`{60%}`}</code> becomes <code>true</code> (since 45 is {`<=`} 60).</li>
            <li>The final check is <code>( true && true )</code>, which is <code>true</code>. The condition passes, and the result is "A solid hit..."</li>
        </ul>
    This creates a "roll between 11 and 60" bracket for a normal success, distinct from a critical success (1-10) and a failure ({'>'}60).
</div>
<h4 className="docs-h4">Advanced Pattern: The Proportional "Critical Success"</h4>
<p className="docs-p">
    A common challenge is creating a "rare success" that doesn't become common when the player's base skill is low. If your main success chance is only 10%, you don't want every success to be a critical one. The solution is to make the critical chance a <strong>fraction</strong> of the main success chance.
</p>
<p className="docs-p">
    To do this, we first calculate the main success chance and store it in an <strong>alias</strong>. Then, we use that alias to create tiered probability checks.
</p>
<div className="docs-pre">
    <span style={{color:'#777'}}>
        // Define a "critical" as the best 20% of all possible successful outcomes.
    </span>
    <br/>
    <span style={{color:'#777'}}>
        // Technically the failure state is not even required here, as that only shows up if you did not use the challenge field.
    </span>
    <br/>
    <code className="docs-code" style={{whiteSpace:'pre'}}>
{`{@chance = { $fishing >> 40 }}

You cast your line... {
    { @chance * 0.2 }% : A huge fish bites! It's a legendary carp! |

    { @chance }% : You reel in a decent-sized trout. |

    You get a nibble, but it gets away.
}`}
    </code>
</div>
<div className="docs-p" style={{fontSize: '0.9rem'}}>
    <strong>How this evaluates (if player's skill gives them a 70% chance):</strong>
    <br/>
    The alias <code>@chance</code> becomes `70`. The critical threshold becomes `70 * 0.2 = 14`.
    <ul style={{margin:'0.5rem 0 0.5rem 1rem'}}>
        <li>A roll of <strong>1-14</strong> is {`<=`} 14, so it triggers the Critical Success.</li>
        <li>A roll of <strong>15-70</strong> fails the first check, but is {`<=`} 70, triggering the Normal Success.</li>
        <li>A roll <strong>above 70</strong> fails both checks, resulting in a Failure.</li>
    </ul>
</div>
<div className="docs-p" style={{fontSize: '0.9rem'}}>
    <strong>How this evaluates (if player's skill gives them a low 20% chance):</strong>
    <br/>
    The alias <code>@chance</code> becomes `20`. The critical threshold becomes `20 * 0.2 = 4`.
    <ul style={{margin:'0.5rem 0 0.5rem 1rem'}}>
        <li>A roll of <strong>1-4</strong> triggers the Critical Success.</li>
        <li>A roll of <strong>5-20</strong> triggers the Normal Success.</li>
        <li>A roll <strong>above 20</strong> results in a Failure.</li>
    </ul>
</div>
<div className="docs-callout">
    <strong style={{color: '#fff'}}>This pattern allows for scalable, tiered random outcomes.</strong> It ensures that a "critical" result always feels rarer than a "normal" success, because its probability is directly proportional to the player's overall chance to succeed.
</div>

 <h3 className="docs-h3">Dynamic Difficulty Curves and Modifiers</h3>
<p className="docs-p">
    While a simple challenge like <code>{`{ $strength >> 50 }`}</code> works, the true power of the system comes from using **Modifiers** to shape the probability curve. This allows you to fine-tune how difficult a check feels to the player.
</p>
<div className="docs-syntax-box">
    <code className="docs-code">{`{ $stat OP Target ; margin:X, min:Y, max:Z, pivot:P }`}</code>
</div>
<p className="docs-p">
    Modifiers are optional arguments passed after a semicolon <code>;</code>.
</p>

<h4 className="docs-h4">Anatomy of a Modifier</h4>
<table className="docs-table">
    <thead><tr><th>Param</th><th>Description</th></tr></thead>
    <tbody>
        <tr>
            <td><strong>Target</strong></td>
            <td>The difficulty level you are checking against. This is the only required part of the expression.</td>
        </tr>
        <tr>
            <td><strong>margin: X</strong></td>
            <td>
                Controls the "width" of the difficulty curve. Your chance scales from its minimum at <code>Target - Margin</code> to its maximum at <code>Target + Margin</code>.
                <br/>
                <em>A smaller margin (e.g., <code>margin:10</code>) creates a "steep" curve where a few skill points make a huge difference. A larger margin (e.g., <code>margin:50</code>) creates a "gradual" curve where small skill changes have less impact.</em>
            </td>
        </tr>
        <tr>
            <td><strong>min: Y</strong></td>
            <td>
                The "floor" of your success chance. No matter how low your skill, your chance will never drop below this percentage.
                <br/>
                <em>Set to <code>min:5</code> to ensure the player always has a slim chance.</em>
            </td>
        </tr>
        <tr>
            <td><strong>max: Z</strong></td>
            <td>
                The "ceiling" of your success chance. No matter how high your skill, your chance will never exceed this percentage.
                <br/>
                <em>Set to <code>max:95</code> to ensure there's always a chance of fumbling.</em>
            </td>
        </tr>
        <tr>
            <td><strong>pivot: P</strong></td>
            <td>
                The exact success chance (%) you have when your skill is <strong>equal</strong> to the Target. The default is 60. This parameter controls the "kink" in the curve.
                <br/>
                <em>A low pivot (e.g., <code>pivot:30</code>) creates a "Hard" check where the climb to the target is slow, but every point <strong>above</strong> the target gives a huge boost in success chance.</em>
                <br/>
                <em>A high pivot (e.g., <code>pivot:80</code>) creates an "Easy" check where the climb to the target is fast, but gains diminish significantly after meeting the target.</em>
            </td>
        </tr>
    </tbody>
</table>

<h4 className="docs-h4">Positional vs. Named Arguments</h4>
<p className="docs-p">
    You can provide arguments by name or by position. Positional arguments are faster to type but must be in the correct order: `margin`, `min`, `max`, `pivot`.
</p>
<div className="docs-pre">
    <span style={{color:'#777'}}>// Positional: Sets margin=20, min=10, max=90</span>
    <br/>
    <code className="docs-code">{`{ $stat >> 50 ; 20, 10, 90 }`}</code>
    <br/><br/>
    <span style={{color:'#777'}}>// Named: Sets only the pivot, leaving others at default</span>
    <br/>
    <code className="docs-code">{`{ $stat >> 50 ; pivot:30 }`}</code>
</div>

<div className="docs-card" style={{ marginTop: '1.5rem', border: '1px solid #61afef' }}>
    <h4 style={{ marginTop: 0, color: '#61afef' }}>Interactive Probability Playground</h4>
    <p className="docs-p" style={{ fontSize: '0.85rem' }}>
        Adjust the values below to visualize how the difficulty curve changes. Notice how `pivot` creates a "kink" in the curve at the `Target` level.
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
                <option value="><">{"><"} (Precision)</option>
                <option value="<>">{"<>"} (Avoidance)</option>
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
        {`{ $stat ${op} ${target} ; margin:${margin}, min:${min}, max:${max}, pivot:${pivot} }`}
    </div>
</div>

<h3 className="docs-h3">Practical Examples</h3>
<p className="docs-p">
    Combining these tools allows for a huge range of mechanical expression. Here are some common patterns.
</p>

<div className="docs-card" style={{marginTop:'1.5rem'}}>
    <h4 className="docs-h4">The "Hard Check"</h4>
    <p className="docs-p" style={{fontSize:'0.9rem'}}>A difficult task where simply meeting the requirement isn't good enough. You need to be an expert. The climb to the target is slow, but exceeding it pays off massively.</p>
    <div className="docs-pre">
        <code className="docs-code">{`{ $academics >> 70 ; 20, pivot:25 }`}</code>
    </div>
    <p className="docs-p" style={{fontSize:'0.9rem'}}><strong>Result:</strong> Even if your Academics is exactly 70, you only have a 25% chance. However, the chance skyrockets for every point you have above 70, making it a true test of expertise.</p>
</div>

<div className="docs-card" style={{marginTop:'1.5rem'}}>
    <h4 className="docs-h4">The "Always a Chance" Check</h4>
    <p className="docs-p" style={{fontSize:'0.9rem'}}>A check that is never impossible and never guaranteed, often used for social situations or gambles.</p>
    <div className="docs-pre">
        <code className="docs-code">{`{ $cunning >> 50 ; min:1, max:99 }`}</code>
    </div>
    <p className="docs-p" style={{fontSize:'0.9rem'}}><strong>Result:</strong> No matter how low or high your Cunning is, your chance will always be clamped between 1% and 99%. There is always a slim chance for a "critical failure" or "critical success".</p>
</div>

<div className="docs-card" style={{marginTop:'1.5rem'}}>
    <h4 className="docs-h4">The "Stealth" Check</h4>
    <p className="docs-p" style={{fontSize:'0.9rem'}}>A check where a lower stat is better, common for stealth or reducing suspicion.</p>
    <div className="docs-pre">
        <code className="docs-code">{`{ $suspicion << 20 }`}</code>
    </div>
    <p className="docs-p" style={{fontSize:'0.9rem'}}><strong>Result:</strong> The lower your <code>$suspicion</code>, the higher your chance of success. This is a common pattern for "Menace" qualities.</p>
</div>

<div className="docs-card" style={{marginTop:'1.5rem'}}>
    <h4 className="docs-h4">Dynamic Target Difficulty</h4>
    <p className="docs-p" style={{fontSize:'0.9rem'}}>The Target itself can be a ScribeScript expression, allowing you to scale difficulty based on other factors.</p>
    <div className="docs-pre">
        <code className="docs-code">{`{ $strength >> { #enemy_level * 10 } }`}</code>
    </div>
    <p className="docs-p" style={{fontSize:'0.9rem'}}><strong>Result:</strong> The difficulty of the check scales with the <code>#enemy_level</code> world quality. An easy fight at the start of the game becomes much harder later on.</p>
</div>

<div className="docs-card" style={{marginTop:'1.5rem'}}>
    <h4 className="docs-h4">Dynamic Skill Bonus</h4>
    <p className="docs-p" style={{fontSize:'0.9rem'}}>You can add temporary bonuses to the player's skill for the check.</p>
    <div className="docs-pre">
        <code className="docs-code">{`{ ($strength + { $has_crowbar : 10 | 0 }) >> 80 }`}</code>
    </div>
    <p className="docs-p" style={{fontSize:'0.9rem'}}><strong>Result:</strong> The player's strength is temporarily boosted by 10 for this check *only* if they have the <code>$has_crowbar</code> quality.</p>
</div>

</section>
        </div>
    );
}