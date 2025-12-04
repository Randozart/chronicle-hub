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

            <hr className="docs-divider" />

            <section id="patterns">
                
                {/* PATTERN 1: THE CAROUSEL */}
                <div className="docs-card" style={{borderColor: '#98c379', marginTop: '2rem'}}>
                    <h3 style={{marginTop: 0, color: '#98c379'}}>1. The Carousel (The Grind)</h3>
                    <p className="docs-p">
                        A repeatable activity loop used to gather resources. 
                        The player enters, performs actions to build a tracker, claims a reward, and resets.
                    </p>
                    <h4 style={{fontSize: '0.8rem', textTransform: 'uppercase', color: '#777', marginTop: '1rem'}}>Recipe</h4>
                    <ol className="docs-list">
                        <li><strong>The Tracker:</strong> Create a quality <code>$progress</code> (Counter).</li>
                        <li>
                            <strong>The Activity:</strong> Create 3 Storylets (e.g., "Search Desk", "Interrogate").
                            <br/><em>Visible If:</em> <code>$progress &lt; 5</code>
                            <br/><em>Effect:</em> <code>$progress += 1</code>
                        </li>
                        <li>
                            <strong>The Reward:</strong> Create a "Conclusion" Storylet.
                            <br/><em>Visible If:</em> <code>$progress &gt;= 5</code>
                            <br/><em>Effect:</em> <code>$progress = 0, $clues += 10</code> (Resets the loop).
                        </li>
                    </ol>
                </div>

                {/* PATTERN 2: THE MENACE */}
                <div className="docs-card" style={{borderColor: '#e74c3c', marginTop: '2rem'}}>
                    <h3 style={{marginTop: 0, color: '#e74c3c'}}>2. The Menace (The Trap)</h3>
                    <p className="docs-p">
                        A negative stat (Wounds, Suspicion) that punishes the player if it gets too high.
                    </p>
                    <h4 style={{fontSize: '0.8rem', textTransform: 'uppercase', color: '#777', marginTop: '1rem'}}>Recipe</h4>
                    <ol className="docs-list">
                        <li><strong>The Stat:</strong> Create a Pyramidal quality <code>$suspicion</code>.</li>
                        <li>
                            <strong>The Risk:</strong> Add failure outcomes to normal actions: <code>$suspicion += 2</code> (adds CP).
                        </li>
                        <li>
                            <strong>The Trap (Autofire):</strong> Create a Storylet called "Arrested!".
                            <br/><em>Autofire If:</em> <code>$suspicion &gt;= 5</code> (Level 5).
                            <br/><em>Effect:</em> <code>pass_move_to: "prison_cell"</code>.
                        </li>
                        <li>
                            <strong>The Lockdown:</strong> In the "Prison Cell" location settings, check the <strong>Lock Equipment</strong> tag.
                        </li>
                    </ol>
                </div>

                {/* PATTERN 3: VISUAL NOVEL */}
                <div className="docs-card" style={{borderColor: '#61afef', marginTop: '2rem'}}>
                    <h3 style={{marginTop: 0, color: '#61afef'}}>3. The Simple Chain (Visual Novel)</h3>
                    <p className="docs-p">
                        A traditional, linear story. The player moves from Scene A to B to C.
                    </p>
                    <h4 style={{fontSize: '0.8rem', textTransform: 'uppercase', color: '#777', marginTop: '1rem'}}>Recipe</h4>
                    <ol className="docs-list">
                        <li><strong>Tracker:</strong> Create a quality <code>$chapter</code>.</li>
                        <li>
                            <strong>Storylet A:</strong>
                            <br/><em>Visible If:</em> <code>$chapter == 1</code>
                            <br/><em>Option Effect:</em> <code>$chapter = 2</code>
                        </li>
                        <li>
                            <strong>Storylet B:</strong>
                            <br/><em>Visible If:</em> <code>$chapter == 2</code>
                            <br/><em>Option Effect:</em> <code>$chapter = 3</code>
                        </li>
                        <li>
                            <strong>Direct Links:</strong> Check the <strong>No Return</strong> behavior tag to prevent backtracking.
                        </li>
                    </ol>
                </div>

                {/* PATTERN 4: THE HUB */}
                <div className="docs-card" style={{borderColor: '#f1c40f', marginTop: '2rem'}}>
                    <h3 style={{marginTop: 0, color: '#f1c40f'}}>4. The Hub (Exploration)</h3>
                    <p className="docs-p">
                        A map that grows as the player explores.
                    </p>
                    <h4 style={{fontSize: '0.8rem', textTransform: 'uppercase', color: '#777', marginTop: '1rem'}}>Recipe</h4>
                    <ol className="docs-list">
                        <li><strong>The Route:</strong> Create a quality <code>$route_to_forest</code>.</li>
                        <li>
                            <strong>The Purchase:</strong> In the Town Hub, add an option "Buy Map".
                            <br/><em>Cost:</em> <code>$gold -= 50</code>
                            <br/><em>Effect:</em> <code>$route_to_forest = 1</code>
                        </li>
                        <li>
                            <strong>The Config:</strong> In the Location Editor for "Forest", set:
                            <br/><em>Unlock Condition:</em> <code>$route_to_forest &gt;= 1</code>
                        </li>
                    </ol>
                </div>

                {/* PATTERN 5: TIME */}
                <div className="docs-card" style={{borderColor: '#c678dd', marginTop: '2rem'}}>
                    <h3 style={{marginTop: 0, color: '#c678dd'}}>5. The Appointment (Time Delay)</h3>
                    <p className="docs-p">
                        Mechanics that require waiting for real-time to pass.
                    </p>
                    <h4 style={{fontSize: '0.8rem', textTransform: 'uppercase', color: '#777', marginTop: '1rem'}}>Recipe</h4>
                    <ol className="docs-list">
                        <li>
                            <strong>The Trigger:</strong> An option "Plant Seeds".
                            <br/><em>Effect:</em> <code>$schedule[$harvest_ready = 1 : 4h]</code>
                        </li>
                        <li>
                            <strong>The Result:</strong> A Storylet "Harvest Crops".
                            <br/><em>Visible If:</em> <code>$harvest_ready == 1</code>
                        </li>
                        <li>
                            <strong>The Outcome:</strong> Clicking "Harvest" gives items and resets:
                            <br/><em>Effect:</em> <code>$potatoes += 10, $harvest_ready = 0</code>
                        </li>
                    </ol>
                </div>

                {/* PATTERN 6: THE EXPEDITION */}
                <div className="docs-card" style={{borderColor: '#e06c75', marginTop: '2rem'}}>
                    <h3 style={{marginTop: 0, color: '#e74c3c'}}>6. The Expedition (Deck-Driven)</h3>
                    <p className="docs-p">
                        A high-stakes mode where the player must survive a random deck to reach a destination.
                    </p>
                    <h4 style={{fontSize: '0.8rem', textTransform: 'uppercase', color: '#777', marginTop: '1rem'}}>Recipe</h4>
                    <ol className="docs-list">
                        <li>
                            Create a specialized <strong>Deck</strong> (e.g., "Desert Deck").
                            <br/>Set <code>deck_size: 20</code> (Finite duration).
                        </li>
                        <li>
                            Create "Hazard" and "Progress" Cards.
                            <br/><em>Hazard:</em> Test `$survival`. Pass: `$progress++`. Fail: `$supplies--`.
                        </li>
                        <li>
                            <strong>Win State:</strong> Autofire Storylet.
                            <br/><em>Condition:</em> <code>autofire_if: $progress &gt;= 10</code>
                            <br/><em>Effect:</em> <code>move_to: desert_city</code>
                        </li>
                        <li>
                            <strong>Fail State:</strong> Autofire Storylet.
                            <br/><em>Condition:</em> <code>autofire_if: $supplies {`<=`} 0</code>
                            <br/><em>Effect:</em> <code>move_to: base_camp, $wounds++</code>
                        </li>
                    </ol>
                </div>

                {/* PATTERN 7: PERSONALIZATION */}
                <div className="docs-card" style={{borderColor: '#9b59b6', marginTop: '2rem'}}>
                    <h3 style={{marginTop: 0, color: '#9b59b6'}}>7. The Road with Many Faces</h3>
                    <p className="docs-p">
                        Linear story, personalized text.
                    </p>
                    <div className="docs-pre">
                        <code className="docs-code">
                            "You approach the gate. {`{ $class == 'Noble' : 'The guards bow to you.' | 'The guards block your path.' }`}"
                        </code>
                    </div>
                    <p className="docs-p">
                        Use <strong>Visible If</strong> to show class-specific options:
                        <br/><em>Option:</em> "Command them to stand aside"
                        <br/><em>Requirement:</em> <code>visible_if: $class == 'Noble'</code>
                    </p>
                </div>

                {/* PATTERN 8: PYTHON */}
                <div className="docs-card" style={{borderColor: '#f39c12', marginTop: '2rem'}}>
                    <h3 style={{marginTop: 0, color: '#f39c12'}}>8. The Python (Non-Linear Mystery)</h3>
                    <p className="docs-p">
                        Gather clues in any order, leading to one conclusion.
                    </p>
                    <ul className="docs-list">
                        <li><strong>Tail:</strong> Intro sets <code>$case_active = 1</code>.</li>
                        <li>
                            <strong>Bulge:</strong> A Hub of Storylets (Witnesses, Crime Scene).
                            <br/>Playing them gives <code>$clues += 2</code>.
                        </li>
                        <li>
                            <strong>Head:</strong> Conclusion Storylet.
                            <br/><em>Requirement:</em> <code>visible_if: $clues &gt;= 20</code>
                        </li>
                    </ul>
                </div>

                {/* PATTERN 9: MIDNIGHT STAIRCASE */}
                <div className="docs-card" style={{borderColor: '#34495e', marginTop: '2rem'}}>
                    <h3 style={{marginTop: 0, color: '#95a5a6'}}>9. The Midnight Staircase</h3>
                    <p className="docs-p">
                        Push-Your-Luck mechanism. How high do you dare to go?
                    </p>
                    <ol className="docs-list">
                        <li>
                            <strong>The Climb:</strong> Infinite options that increase <code>$casing</code> but require increasingly hard Skill Checks.
                        </li>
                        <li>
                            <strong>Landing 1 (Safe):</strong> "Rob the Shed".
                            <br/><em>Requirement:</em> <code>$casing &gt;= 5</code>
                        </li>
                        <li>
                            <strong>Landing 2 (Risky):</strong> "Rob the Mansion".
                            <br/><em>Requirement:</em> <code>$casing &gt;= 15</code> (Better loot).
                        </li>
                    </ol>
                </div>

                {/* PATTERN 10: GRANDFATHER CLOCK */}
                <div className="docs-card" style={{borderColor: '#2c3e50', marginTop: '2rem'}}>
                    <h3 style={{marginTop: 0, color: '#34495e'}}>10. The Grandfather Clock</h3>
                    <p className="docs-p">
                        Meta-Progression. Small loops feed large loops.
                    </p>
                    <ul className="docs-list">
                        <li>
                            <strong>Minute Hand:</strong> Complete a "Carousel" (Patrol) to earn <code>$favours</code>.
                        </li>
                        <li>
                            <strong>Hour Hand:</strong> A Linear Story ("Promotion") that requires <code>$favours &gt;= 5</code> to unlock the next chapter and resets <code>$favours</code> back to 0.
                        </li>
                    </ul>
                </div>

            </section>

            <style jsx>{`
                .docs-content { max-width: 900px; margin: 0 auto; color: #ccc; line-height: 1.7; }
                .docs-h1 { font-size: 3rem; color: #fff; margin-bottom: 0.5rem; line-height: 1.1; margin-top: 0; }
                .docs-h2 { color: #61afef; font-size: 2.2rem; margin-top: 4rem; margin-bottom: 1.5rem; border-bottom: 1px solid #2c313a; padding-bottom: 0.5rem; }
                .docs-h3 { margin-top: 0; font-size: 1.4rem; color: #fff; display: flex; align-items: center; gap: 10px; }
                .docs-p { margin-bottom: 1rem; color: #c8ccd4; }
                .docs-card { background: #21252b; padding: 2rem; border-radius: 8px; border-left: 4px solid #555; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
                .docs-list { padding-left: 1.5rem; }
                .docs-li { margin-bottom: 0.75rem; }
                .docs-code { font-family: 'Consolas', monospace; color: #98c379; background: rgba(0,0,0,0.3); padding: 2px 6px; borderRadius: 4px; }
                .docs-pre { background: #1e2127; padding: 1rem; border-radius: 6px; border: 1px solid #333; margin: 1rem 0; font-family: monospace; color: #abb2bf; }
            `}</style>
        </div>
    );
}