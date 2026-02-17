'use client';

import ProbabilityChart from '@/components/admin/ProbabilityChart';
import React, { useState } from 'react';

export default function ChallengesPage() {
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
                <h1 className="docs-h1">Challenges & Probability</h1>
                <p className="docs-lead">
                    Master the art of skill checks, difficulty curves, and randomness. Learn how to create compelling risk-reward scenarios that respond to player skill.
                </p>
            </header>

            {/* CORE CONCEPTS */}
            <section id="overview">
                <h2 className="docs-h2">1. The Probability System</h2>
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
            </section>

            {/* CHALLENGE EXPRESSIONS */}
            <section id="expressions">
                <h2 className="docs-h2">2. Challenge Expressions</h2>
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
                    <strong style={{color: 'var(--docs-text-main)'}}>Anonymous vs. Explicit Macros:</strong>
                    <br/>
                    The syntax <code>{`{ $strength >> 50 }`}</code> is an "anonymous" shorthand. There is also an explicit macro, <code>{`{%chance[...]}`}</code>, which offers more control. Both perform the same core function of calculating a probability number. The explicit macro is covered in detail in the Macros & Functions chapter.
                </div>
            </section>

            {/* PROBABILITY SHORTHANDS */}
            <section id="shorthands">
                <h2 className="docs-h2">3. Probability Shorthands and The Single Roll</h2>
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
                    <strong style={{color: 'var(--docs-text-main)'}}>The Single Roll Rule (Unified Randomness):</strong>
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

                <h3 className="docs-h3">How it Works</h3>
                <ol className="docs-list">
                    <li>The inner block <code>{`{...}`}</code> resolves to a number. For example, <code>{`{ $strength >> 50 }`}</code> becomes <code>"60"</code>.</li>
                    <li>The text becomes <code>60%</code>.</li>
                    <li>The engine recognizes <code>NUMBER%</code> and checks if the single Resolution Roll is <strong>less than or equal to</strong> 60. If so, it returns <code>true</code>, otherwise <code>false</code>.</li>
                </ol>

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Example 1: Inverting the Roll with `!`</h3>
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

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Advanced Pattern: "Roll Between" for Tiered Results</h3>
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

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Advanced Pattern: The Proportional "Critical Success"</h3>
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
                    <strong style={{color: 'var(--docs-text-main)'}}>This pattern allows for scalable, tiered random outcomes.</strong> It ensures that a "critical" result always feels rarer than a "normal" success, because its probability is directly proportional to the player's overall chance to succeed.
                </div>
            </section>

            {/* DIFFICULTY CURVES */}
            <section id="curves">
                <h2 className="docs-h2">4. Dynamic Difficulty Curves and Modifiers</h2>
                <p className="docs-p">
                    While a simple challenge like <code>{`{ $strength >> 50 }`}</code> works, the true power of the system comes from using **Modifiers** to shape the probability curve. This allows you to fine-tune how difficult a check feels to the player.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">{`{ $stat OP Target ; margin:X, min:Y, max:Z, pivot:P }`}</code>
                </div>
                <p className="docs-p">
                    Modifiers are optional arguments passed after a semicolon <code>;</code>.
                </p>

                <h3 className="docs-h3">Anatomy of a Modifier</h3>
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

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>The <code>target</code> keyword</h3>
                <p className="docs-p">
                    In <strong>World Settings &gt; Challenge Physics</strong>, you can define global defaults for challenge margins.
                    Since the difficulty of a check changes constantly, you can use the special keyword <code>target</code>.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">Default Margin: {`{ target / 2 }`}</code>
                </div>
                <p className="docs-p">
                    <strong>How it works:</strong> If a player attempts a difficulty <strong>50</strong> check, the engine replaces <code>target</code> with <code>50</code>.
                    The margin becomes 25.
                    <br/>
                    If they attempt a difficulty <strong>10</strong> check, the margin becomes 5.
                    <br/>
                    This allows the "randomness window" to scale automatically with the difficulty of the task.
                </p>

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Positional vs. Named Arguments</h3>
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
            </section>

            {/* INTERACTIVE PLAYGROUND */}
            <section id="playground">
                <h2 className="docs-h2">5. Interactive Probability Playground</h2>
                <p className="docs-p">
                    Adjust the values below to visualize how the difficulty curve changes. Notice how `pivot` creates a "kink" in the curve at the `Target` level.
                </p>

                <div className="docs-card" style={{ marginTop: '1.5rem', border: '1px solid var(--docs-accent-blue)' }}>
                    <h4 style={{ marginTop: 0, color: 'var(--docs-accent-blue)' }}>Probability Curve Visualizer</h4>
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
                                style={{ width: '100%', background: '#111', border: '1px solid #444', color: 'var(--docs-text-main)', padding: '4px', borderRadius: '4px' }}
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

                    <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#111', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--docs-accent-green)', textAlign: 'center' }}>
                        {`{ $stat ${op} ${target} ; margin:${margin}, min:${min}, max:${max}, pivot:${pivot} }`}
                    </div>
                </div>
            </section>

            {/* PRACTICAL EXAMPLES */}
            <section id="examples">
                <h2 className="docs-h2">6. Practical Examples</h2>
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
