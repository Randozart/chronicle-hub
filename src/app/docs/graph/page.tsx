'use client';

import React from 'react';

export default function GraphDocs() {
    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">The Narrative Graph</h1>
                <p className="docs-lead">
                    A visual tool for mapping connections, debugging state logic, and rapidly prototyping content.
                </p>
            </header>

            {/* Visualization modes - Redirect view vs Quality Logic view */}
            <section id="modes">
                <h2 className="docs-h2">1. Visualization Modes</h2>
                <p className="docs-p">
                    Because Chronicle is a State Machine, there are two ways to look at your story structure. You can switch modes using the buttons in the top-left of the Graph.
                </p>

                <div className="docs-grid">
                    <div className="docs-card">
                        <h4 className="docs-h4" style={{color: 'var(--docs-accent-blue)'}}>Redirect Mode</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>The Visual Novel View.</strong>
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Shows explicit links where an Option sets a <code>Redirect ID</code>.
                        </p>
                        <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                            <li><span style={{color: '#2ecc71'}}>Green Line:</span> Pass Redirect</li>
                            <li><span style={{color: '#e74c3c'}}>Red Line:</span> Fail Redirect</li>
                        </ul>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4" style={{color: '#f1c40f'}}>Quality Logic Mode</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>The Simulation View.</strong>
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Shows implicit links based on a selected Quality (e.g., <code>$main_quest</code>).
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            If Node A <em>sets</em> the quality to 10, and Node B <em>requires</em> it to be 10, a line is drawn between them.
                        </p>
                    </div>
                </div>
            </section>

            <section id="navigation">
                <h2 className="docs-h2">2. Navigation</h2>
                <ul className="docs-list">
                    <li><strong>Scroll / Pinch:</strong> Zoom in and out.</li>
                    <li><strong>Drag Canvas:</strong> Pan around the map.</li>
                    <li><strong>Drag Nodes:</strong> Rearrange nodes manually (Note: Auto-layout calculates positions based on logic depth).</li>
                    <li><strong>Mini-Map:</strong> Use the box in the bottom right to jump to different areas.</li>
                </ul>
            </section>

            {/* Reading the graph - Understanding node colors and the inspector panel */}
            <section id="reading">
                <h2 className="docs-h2">3. Reading the Graph</h2>
                <p className="docs-p">
                    In <strong>Quality Logic Mode</strong>, nodes are color-coded based on how they interact with the selected quality.
                </p>

                <table className="docs-table">
                    <thead><tr><th>Role</th><th>Color</th><th>Meaning</th></tr></thead>
                    <tbody>
                        <tr>
                            <td><strong>Producer</strong></td>
                            <td><span style={{color: '#2ecc71'}}>Green</span></td>
                            <td>This storylet <strong>changes</strong> the quality (e.g. gives Reputation).</td>
                        </tr>
                        <tr>
                            <td><strong>Consumer</strong></td>
                            <td><span style={{color: '#e74c3c'}}>Red</span></td>
                            <td>This storylet <strong>requires</strong> the quality (e.g. requires you to have or spend Reputation).</td>
                        </tr>
                        <tr>
                            <td><strong>Hub</strong></td>
                            <td><span style={{color: '#f1c40f'}}>Yellow</span></td>
                            <td>This storylet both requires AND changes the quality (e.g. a grind loop, or a node which requires a quality to access and also changes it).</td>
                        </tr>
                    </tbody>
                </table>

                <h3 className="docs-h3">The Inspector</h3>
                <p className="docs-p">
                    Click on any node to open the <strong>Inspector Panel</strong> on the right.
                </p>
                <div className="docs-card" style={{background: '#1e2127'}}>
                    <h4 className="docs-h4">What it shows:</h4>
                    <ul className="docs-list">
                        <li><strong>Requirements:</strong> Exactly what logic gate is checking the quality.</li>
                        <li><strong>Effects:</strong> Exactly which option modifies the quality and by how much.</li>
                        <li><strong>Edit Button:</strong> A direct link to open that Storylet in the full Editor.</li>
                    </ul>
                </div>
            </section>

            {/* The builder - Rapid prototyping with right-click context menu */}
            <section id="builder">
                <h2 className="docs-h2">4. Rapid Prototyping (The Builder)</h2>
                <p className="docs-p">
                    You can build the skeleton of your story directly inside the graph without opening the full editor. 
                    Right-click on the canvas or nodes to access the <strong>Context Menu</strong>.
                </p>

                <h3 className="docs-h3">Common Actions</h3>
                
                <div className="docs-grid">
                    <div className="docs-card">
                        <h4 className="docs-h4">Create New</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Right-Click Canvas</strong>
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Creates a blank, disconnected Storylet at that position.
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">Link (Direct)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Right-Click Node (Redirect Mode)</strong>
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Creates a new Storylet and automatically adds an option to the source node that redirects to it.
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">Next Step (Logic)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Right-Click Node (Quality Mode)</strong>
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            The "Power of 10" tool. 
                            <br/>1. Creates a new Storylet.
                            <br/>2. Sets its requirement to <code>Level + 10</code>.
                            <br/>3. Adds an option to the source that sets <code>Level += 10</code>.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}