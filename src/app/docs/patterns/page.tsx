'use client';

import React from 'react';

export default function PatternsDocs() {
    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">Design Patterns</h1>
                <p className="docs-lead">
                    Architectural recipes for common gameplay loops.
                </p>
            </header>

            {/* PATTERN 1: THE CAROUSEL */}
            <section id="carousel">
                <h2 className="docs-h2">1. The Carousel (The Grind)</h2>
                <p className="docs-p">
                    A <strong>Carousel</strong> is a repeatable activity loop used to gather resources. 
                    The player enters, performs actions to build a tracker, claims a reward, and resets.
                </p>

                <div className="docs-card" style={{borderColor: '#98c379'}}>
                    <h4 className="docs-h4" style={{color: '#98c379'}}>Recipe</h4>
                    <ol className="docs-list">
                        <li className="docs-li">
                            <strong>The Tracker:</strong> Create a quality <code>$investigation_progress</code> (Counter).
                        </li>
                        <li className="docs-li">
                            <strong>The Activity:</strong> Create 3 Storylets (e.g., "Search Desk", "Interrogate").
                            <br/><em>Visible If:</em> <code>$investigation_progress &lt; 5</code>
                            <br/><em>Effect:</em> <code>$investigation_progress += 1</code>
                        </li>
                        <li className="docs-li">
                            <strong>The Reward:</strong> Create a "Conclusion" Storylet.
                            <br/><em>Visible If:</em> <code>$investigation_progress &gt;= 5</code>
                            <br/><em>Effect:</em> <code>$investigation_progress = 0, $clues += 10</code> (Resets the loop).
                        </li>
                    </ol>
                </div>
            </section>

            {/* PATTERN 2: THE MENACE */}
            <section id="menace">
                <h2 className="docs-h2">2. The Menace (The Trap)</h2>
                <p className="docs-p">
                    A <strong>Menace</strong> is a negative stat (Wounds, Suspicion) that punishes the player if it gets too high.
                </p>

                <div className="docs-card" style={{borderColor: '#e74c3c'}}>
                    <h4 className="docs-h4" style={{color: '#e74c3c'}}>Recipe</h4>
                    <ol className="docs-list">
                        <li className="docs-li">
                            <strong>The Stat:</strong> Create a Pyramidal quality <code>$suspicion</code>.
                        </li>
                        <li className="docs-li">
                            <strong>The Risk:</strong> Add failure outcomes to normal actions: <code>$suspicion += 2</code> (adds CP).
                        </li>
                        <li className="docs-li">
                            <strong>The Trap (Autofire):</strong> Create a Storylet called "Arrested!".
                            <br/><em>Autofire If:</em> <code>$suspicion &gt;= 5</code> (Level 5).
                            <br/><em>Effect:</em> <code>pass_move_to: "prison_cell"</code>.
                        </li>
                        <li className="docs-li">
                            <strong>The Lockdown:</strong> In the "Prison Cell" location settings, check the <strong>Lock Equipment</strong> tag so they can't change disguises.
                        </li>
                    </ol>
                </div>
            </section>

            {/* PATTERN 3: VISUAL NOVEL */}
            <section id="visual-novel">
                <h2 className="docs-h2">3. The Tunnel (Visual Novel)</h2>
                <p className="docs-p">
                    Sometimes you don't want a "Bag of Marbles." You want a straight line. 
                    You can force the engine to behave like a linear story.
                </p>

                <div className="docs-card" style={{borderColor: '#61afef'}}>
                    <h4 className="docs-h4" style={{color: '#61afef'}}>Recipe</h4>
                    <ol className="docs-list">
                        <li className="docs-li">
                            <strong>Disable Return:</strong> On every Storylet in the chain, check the <strong>No Return</strong> behavior tag. 
                            This hides the "Go Back" button.
                        </li>
                        <li className="docs-li">
                            <strong>Direct Links:</strong> Use the <strong>Redirect</strong> field in your options to link directly to the ID of the next Storylet.
                        </li>
                        <li className="docs-li">
                            <strong>Instant Transitions:</strong> Check the <strong>Instant Redirect</strong> tag on options. 
                            This skips the "Result" screen and moves the player immediately to the next text block.
                        </li>
                    </ol>
                    <div className="docs-pre">
                        <strong>Scene A:</strong> "You enter the cave."
                        <br/><em>Option:</em> "Go Deeper" -&gt; Redirects to Scene B (Instant, No Return)
                        <br/><br/>
                        <strong>Scene B:</strong> "It is dark."
                    </div>
                </div>
            </section>

            {/* PATTERN 4: THE HUB */}
            <section id="hub">
                <h2 className="docs-h2">4. The Hub (Exploration)</h2>
                <p className="docs-p">
                    How to manage a map that grows as the player explores.
                </p>

                <div className="docs-card" style={{borderColor: '#f1c40f'}}>
                    <h4 className="docs-h4" style={{color: '#f1c40f'}}>Recipe</h4>
                    <ol className="docs-list">
                        <li className="docs-li">
                            <strong>The Route:</strong> Create a quality <code>$route_to_forest</code>.
                        </li>
                        <li className="docs-li">
                            <strong>The Purchase:</strong> In the Town Hub, add an option "Buy Map".
                            <br/><em>Cost:</em> <code>$gold -= 50</code>
                            <br/><em>Effect:</em> <code>$route_to_forest = 1</code>
                        </li>
                        <li className="docs-li">
                            <strong>The Config:</strong> In the Location Editor for "Forest", set:
                            <br/><em>Unlock Condition:</em> <code>$route_to_forest &gt;= 1</code>
                        </li>
                        <li className="docs-li">
                            <strong>Discovery (Optional):</strong> If you want the pin to be invisible (not just greyed out) until bought, set:
                            <br/><em>Visible Condition:</em> <code>$route_to_forest &gt;= 1</code>
                        </li>
                    </ol>
                </div>
            </section>

            {/* PATTERN 5: TIME */}
            <section id="time">
                <h2 className="docs-h2">5. The Appointment (Time Delay)</h2>
                <p className="docs-p">
                    How to create mechanics that require waiting.
                </p>
                <div className="docs-card">
                    <h4 className="docs-h4">Recipe</h4>
                    <ol className="docs-list">
                        <li className="docs-li">
                            <strong>The Trigger:</strong> An option "Plant Seeds".
                            <br/><em>Effect:</em> <code>$schedule[$harvest_ready = 1 : 4h]</code>
                        </li>
                        <li className="docs-li">
                            <strong>The Result:</strong> A Storylet "Harvest Crops".
                            <br/><em>Visible If:</em> <code>$harvest_ready == 1</code>
                        </li>
                        <li className="docs-li">
                            <strong>The Outcome:</strong> Clicking "Harvest" gives items and resets:
                            <br/><em>Effect:</em> <code>$potatoes += 10, $harvest_ready = 0</code>
                        </li>
                    </ol>
                </div>
            </section>
        </div>
    );
}