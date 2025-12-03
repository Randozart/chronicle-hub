'use client'

import React from 'react';

export default function DocsPage() {
    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">The Chronicle Engine</h1>
                <p className="docs-lead">
                    The Architect&apos;s Guide to sculpting narrative possibility space.
                </p>
            </header>
                    
            {/* SECTION 1: THE PHILOSOPHY */}
            <section id="philosophy">
                <h2 className="docs-h2">1. Beyond Branching</h2>
                <p className="docs-p">
                    Most interactive fiction tools rely on a <strong>Branching Tree</strong> structure. You start at Node A, which explicitly links to Node B and Node C. 
                    To build a story, you must manually lay every inch of track.
                </p>
                <p className="docs-p">
                    This creates a fundamental problem: <strong>Combinatorial Explosion</strong>. If you want the player to find three clues in any order, 
                    a branching system requires you to write separate paths for every possible permutation (A-B-C, A-C-B, B-A-C...).
                </p>
                
                <div className="docs-callout">
                    <h4 className="docs-h4">The "Pool of Content" Solution</h4>
                    <p className="docs-p">
                        Chronicle Hub uses <strong>Quality-Based Narrative (QBN)</strong>, a term popularized by Failbetter Games.
                    </p>
                    <p className="docs-p">
                        In QBN, the story is not a tree; it is a <strong>State Machine</strong>. 
                        Instead of asking <em>&quot;What node comes next?&quot;</em>, the engine asks:
                    </p>
                    <p className="docs-p" style={{ fontWeight: 'bold', color: '#fff', textAlign: 'center', margin: '1.5rem 0' }}>
                        &quot;Given who the player is right now, what content is available to them?&quot;
                    </p>
                    <p className="docs-p">
                        You do not link Storylet A to Storylet B. Instead, you give Storylet B a <strong>Requirement</strong>. 
                        When the player meets that requirement, Storylet B appears—regardless of where they came from.
                    </p>
                </div>
            </section>

            {/* SECTION 2: THE METAPHOR */}
            <section id="metaphor">
                <h2 className="docs-h2">2. The "Bag of Marbles"</h2>
                <p className="docs-p">
                    If traditional Interactive Fiction is a "Roadmap," Chronicle is a "Bag of Marbles."
                </p>
                
                <div className="docs-grid">
                    <div className="docs-card">
                        <h4 className="docs-h4">1. The Marbles (Content)</h4>
                        <p className="docs-p" style={{ fontSize: '0.9rem' }}>
                            Every scene you write—a conversation, a shop, a battle—is a <strong>Storylet</strong> (a marble). 
                            You define the logic inside the marble itself: <em>&quot;I can only be seen if the player has 5 Gold.&quot;</em>
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">2. The Bag (Location)</h4>
                        <p className="docs-p" style={{ fontSize: '0.9rem' }}>
                            You throw these marbles into a container, called a <strong>Location</strong> (or a Deck). 
                            The structure is loose; storylets sit side-by-side without explicit links.
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">3. The Hand (Selection)</h4>
                        <p className="docs-p" style={{ fontSize: '0.9rem' }}>
                            When the player enters the Location, the Engine reaches into the bag. 
                            It pulls out <strong>only</strong> the marbles that match the player&apos;s current Qualities (stats/items).
                        </p>
                    </div>
                </div>
            </section>

            {/* SECTION 3: THE CORE LOOP */}
            <section id="loop">
                <h2 className="docs-h2">3. The Engine Loop</h2>
                <p className="docs-p">
                    To make this work, the Chronicle Engine performs a specific cycle every time the player interacts with the world.
                </p>

                <div className="docs-card" style={{ borderLeft: '4px solid #f1c40f' }}>
                    <ol className="docs-list" style={{ margin: 0 }}>
                        <li className="docs-li">
                            <strong>Arrival:</strong> The Player enters a Location (e.g., &quot;The Village&quot;).
                        </li>
                        <li className="docs-li">
                            <strong>Evaluation:</strong> The Engine scans <em>every</em> Storylet assigned to &quot;The Village&quot;.
                        </li>
                        <li className="docs-li">
                            <strong>Filtering:</strong> It checks the <code className="docs-code">visible_if</code> condition of each storylet against the player&apos;s current Qualities. 
                            If the condition is false, the storylet is hidden.
                        </li>
                        <li className="docs-li">
                            <strong>Presentation:</strong> The Player is shown the list of valid Storylets. 
                            (Some may be &quot;Locked&quot; if they fail the secondary <code className="docs-code">unlock_if</code> check).
                        </li>
                        <li className="docs-li">
                            <strong>Mutation:</strong> The Player makes a choice. The Engine runs the math in the Option&apos;s <code className="docs-code">quality_change</code> field 
                            (e.g., <code className="docs-code">$gold -= 5</code>, <code className="docs-code">$wounds += 1</code>).
                        </li>
                        <li className="docs-li">
                            <strong>Refresh:</strong> The page reloads. Because the State has changed (e.g. Wounds increased), the Filter (Step 3) might now show a new storylet (e.g., &quot;Collapse from Exhaustion&quot;).
                        </li>
                    </ol>
                </div>
                
                <p className="docs-p" style={{ marginTop: '2rem' }}>
                    This loop allows for <strong>emergent complexity</strong>. You can add a new Storylet to the "Village" bag 
                    months after the game launches, and it will automatically appear for eligible players without breaking existing paths.
                </p>
            </section>
        </div>
    );
}