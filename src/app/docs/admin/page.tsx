'use client';

import React from 'react';

export default function AdminDocs() {
    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">Configuration & Administration</h1>
                <p className="docs-lead">
                    The Control Panel of your world. Defining game rules, character creation, and team access.
                </p>
            </header>

            {/* Global settings - Action economy, regeneration, and UI layout configuration */}
            <section id="settings">
                <h2 className="docs-h2">1. Global Settings</h2>
                <p className="docs-p">
                    The <strong>Settings</strong> tab controls the physics and presentation of your world.
                </p>

                <h3 className="docs-h3">Action Economy</h3>
                <p className="docs-p">
                    Chronicle includes a built-in Energy system. You can toggle this on or off.
                </p>
                <div className="docs-grid">
                    <div className="docs-card">
                        <h4 className="docs-h4">Regeneration</h4>
                        <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                            <li><strong>Max Actions:</strong> The cap. Can be a number (<code>20</code>) or logic (<code>{`{ $endurance * 2 }`}</code>).</li>
                            <li><strong>Regen Time:</strong> Minutes per tick (e.g. 10).</li>
                            <li><strong>Regen Amount:</strong> How many actions are gained per tick. Can be logic (<code>{`{ $recovery_rate }`}</code>).</li>
                        </ul>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">Costs</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Default Draw Cost:</strong> The cost to draw a card if the deck doesn't specify one.
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Default Action Cost:</strong> The cost to play a storylet option if not specified.
                        </p>
                    </div>
                </div>

                <h3 className="docs-h3">Visuals & Layouts</h3>
                <p className="docs-p">
                    You can switch the entire UI framework of your game with one dropdown.
                </p>
                <table className="docs-table">
                    <thead><tr><th>Layout</th><th>Best For</th></tr></thead>
                    <tbody>
                        <tr><td><strong>Nexus</strong></td><td>Classic, dense text games. Sidebar heavy.</td></tr>
                        <tr><td><strong>London</strong></td><td>Cinematic games. Large header banner, tabular content.</td></tr>
                        <tr><td><strong>Elysium</strong></td><td>Immersive, modern. Glass panels over a full-screen background.</td></tr>
                        <tr><td><strong>Tabletop</strong></td><td>RPG Simulation. Three-column layout with persistent stats and dice logs.</td></tr>
                    </tbody>
                </table>
            </section>

            {/* System bindings - Mapping engine concepts to your specific quality IDs */}
            <section id="bindings">
                <h2 className="docs-h2">2. System Bindings</h2>
                <p className="docs-p">
                    The Engine is agnostic—it doesn't know what "Health" or "Name" is until you tell it.
                </p>
                <div className="docs-callout">
                    <strong style={{color: 'var(--docs-accent-gold)'}}>The Mapping Layer:</strong><br/>
                    In the Settings page, you must map Engine Concepts to your specific Quality IDs.
                </div>
                <ul className="docs-list">
                    <li><strong>Action Counter ID:</strong> Which quality stores the player's energy? (Default: <code>$actions</code>)</li>
                    <li><strong>Player Name ID:</strong> Which string quality holds the username? (Default: <code>$player_name</code>)</li>
                    <li><strong>Portrait ID:</strong> Which string quality holds the avatar image ID? (Default: <code>$player_portrait</code>)</li>
                </ul>
            </section>

            {/* Character initialization - Setup wizard for new player creation flow */}
            <section id="init">
                <h2 className="docs-h2">3. Character Initialization</h2>
                <p className="docs-p">
                    The <code>char_create</code> block defines what happens when a player clicks "New Game". 
                    It creates the initial state of the world.
                </p>

                <h3 className="docs-h3">Input Types</h3>
                <p className="docs-p">
                    Depending on what you type as the <strong>Value</strong>, the engine renders different UI elements to the player during creation.
                </p>
                
                <div className="docs-grid">
                    <div className="docs-card">
                        <h4 className="docs-h4">Static Value</h4>
                        <code className="docs-code">10</code>
                        <p className="docs-p" style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>
                            The player starts with this value. Hidden from the creation UI.
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">Text Input</h4>
                        <code className="docs-code">string</code>
                        <p className="docs-p" style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>
                            Renders a text box. The player types their value.
                            <br/><em>Used for: Names, Titles.</em>
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">Multiple Choice</h4>
                        <code className="docs-code">A | B | C</code>
                        <p className="docs-p" style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>
                            Renders clickable cards.
                            <br/>If A/B/C match <strong>Image IDs</strong>, it renders a visual grid.
                        </p>
                    </div>
                </div>

                <h3 className="docs-h3">Derived Values (Auto-Calc)</h3>
                <p className="docs-p">
                    You can set qualities based on previous inputs using ScribeScript logic.
                </p>
                <div className="docs-pre">
                    <code className="docs-code">
                        $player_name = $first_name + ' ' + $last_name
                    </code>
                </div>
                <p className="docs-p">
                    The engine resolves inputs first, then calculates derived values.
                </p>
            </section>

            {/* Team & publishing - Collaboration roles and visibility settings */}
            <section id="access">
                <h2 className="docs-h2">4. Team & Access</h2>

                <h3 className="docs-h3">Collaborators</h3>
                <p className="docs-p">
                    You can invite other users to help build your world.
                </p>
                <table className="docs-table">
                    <thead><tr><th>Role</th><th>Permissions</th></tr></thead>
                    <tbody>
                        <tr>
                            <td><strong>Owner</strong></td>
                            <td>Can delete the world, manage the team, and edit everything.</td>
                        </tr>
                        <tr>
                            <td><strong>Writer</strong></td>
                            <td>Can create/edit Storylets, Qualities, and Assets. Cannot delete the world or ban users.</td>
                        </tr>
                    </tbody>
                </table>
                <div className="docs-callout" style={{borderColor: 'var(--danger-color)'}}>
                    <strong style={{color: 'var(--danger-color)'}}>Note on Locking:</strong><br/>
                    Chronicle does not currently support real-time locking. If two writers edit the exact same Storylet at the same time, the last save wins. Communicate with your team!
                </div>

                <h3 className="docs-h3">Publishing</h3>
                <ul className="docs-list">
                    <li><strong>Private:</strong> Only you and your Collaborators can play.</li>
                    <li><strong>Live (Published):</strong> Anyone with the link can play. If "Public Arcade" is enabled, it appears on the homepage.</li>
                </ul>
            </section>

            <section id="gm-console">
    <h2 className="docs-h2">5. The GM Console (Live World Management)</h2>
    <p className="docs-p">
        Found under "Tools & Live", the <strong>GM Console</strong> gives you direct, real-time control over the game world as your players are experiencing it. It has two main functions: Live Announcements and managing World State.
    </p>

    <h3 className="docs-h3">Live Announcements</h3>
    <p className="docs-p">
        This tool allows you to broadcast a message to all active players in your world. It's perfect for announcing patches, story updates, or scheduled downtime.
    </p>
    <ul className="docs-list">
        <li><strong>Active Toggle:</strong> Controls whether the message is currently being shown to players.</li>
        <li><strong>Severity:</strong> Changes the color of the banner (Info, Warning, Critical) to convey urgency.</li>
        <li><strong>Message ID:</strong> This is a crucial field. Each player's account remembers which message IDs they have dismissed. If you need to show the same message again, or a new version of it, you <strong>must change this ID</strong> (e.g., from <code>patch-v1.1</code> to <code>patch-v1.2</code>).</li>
    </ul>

    <h3 className="docs-h3">Global State (<code>#world</code> Qualities)</h3>
    <p className="docs-p">
        This part of the console is a direct interface to your world's global variables. Any quality created or modified here will be visible to <strong>all players</strong> who reference it with the <code>#</code> sigil (e.g., <code>{`{#season}`}</code>).
    </p>
    <div className="docs-callout">
        <strong style={{color: 'var(--docs-text-main)'}}>The Source of Truth:</strong>
        <p className="docs-p" style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0'}}>
            While you can change world qualities from a storylet (using <code>#quality = value</code>), the GM Console is the primary tool for setting their initial state or making manual adjustments during a live event. It is the source of truth for your game's global state to avoid needing to set the value elsewhere.
        </p>
    </div>
    <div className="docs-pre">
        <span style={{color:'var(--text-muted)'}}>// Use the console to create these variables:</span>
        <br/>
        <code className="docs-code">
            #season = Summer
            <br/>
            #war_progress = 25
        </code>
        <br/><br/>
        <span style={{color:'var(--text-muted)'}}>// Then, any player can see them in-game:</span>
        <br/>
        <code className="docs-code">
            "It is currently {`{#season}`}. The war effort is at {`{#war_progress}`}%."
            <br/> =&gt; "It is currently Summer. The war effort is at 25%."
        </code>
    </div>
</section>
        </div>
    );
}