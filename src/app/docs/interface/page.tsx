'use client';

import React from 'react';

export default function InterfacePage() {
    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">Understanding the Interface</h1>
                <p className="docs-lead">
                    A visual guide to Chronicle's editors and workspace. Learn where everything is and how to navigate efficiently.
                </p>
            </header>

            <div className="docs-callout">
                <strong>This is a Reference Guide:</strong>
                <p className="docs-p" style={{marginBottom: 0, marginTop: '0.5rem'}}>
                    If you haven't completed the Quick Start tutorial yet, we recommend doing that first. This page is designed to be a reference you can return to when you need to find a specific feature.
                </p>
            </div>

            {/* Dashboard - Main project selection screen */}
            <section id="dashboard">
                <h2 className="docs-h2">The Dashboard</h2>
                <p className="docs-p">
                    This is your home screen. From here, you can create new projects, access existing ones, and manage your account.
                </p>

                <div className="docs-card" style={{background: 'rgba(97, 175, 239, 0.1)', borderLeft: '4px solid var(--docs-accent-blue)'}}>
                    <strong style={{color: 'var(--docs-accent-blue)'}}>📸 SCREENSHOT NEEDED:</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0}}>
                        Full dashboard view showing:
                        - Project cards (if any exist)
                        - "New Project" button location
                        - Navigation menu (account settings, theme controls)
                        - Project search/filter options
                    </p>
                </div>

                <h3 className="docs-h3">Key Elements</h3>
                <ul className="docs-list">
                    <li><strong>Project Cards:</strong> Click on any project to open it in the editor</li>
                    <li><strong>New Project Button:</strong> Creates a fresh game from scratch</li>
                    <li><strong>Settings:</strong> Access your account preferences and theme options</li>
                </ul>
            </section>

            {/* Project workspace - Main editing environment with sidebar navigation */}
            <section id="workspace">
                <h2 className="docs-h2">The Project Workspace</h2>
                <p className="docs-p">
                    Once you open a project, you'll see the main workspace. This is where you'll spend most of your time building your game.
                </p>

                <div className="docs-card" style={{background: 'rgba(97, 175, 239, 0.1)', borderLeft: '4px solid var(--docs-accent-blue)'}}>
                    <strong style={{color: 'var(--docs-accent-blue)'}}>📸 SCREENSHOT NEEDED:</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0}}>
                        Full workspace view with annotations pointing to:
                        - Left sidebar (navigation tabs)
                        - Main content area
                        - Top bar (project name, Play button, settings)
                        - Filter/search bar (if visible)
                    </p>
                </div>

                <h3 className="docs-h3">The Sidebar Navigation</h3>
                <p className="docs-p">
                    The left sidebar contains tabs for each major section of your project:
                </p>
                <table className="docs-table">
                    <thead>
                        <tr>
                            <th>Tab</th>
                            <th>Purpose</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Qualities</strong></td>
                            <td>Create and manage all variables, stats, items, and counters</td>
                        </tr>
                        <tr>
                            <td><strong>Storylets</strong></td>
                            <td>Write narrative content, dialogue, and events</td>
                        </tr>
                        <tr>
                            <td><strong>Opportunities</strong></td>
                            <td>Create random encounter cards that players draw from decks</td>
                        </tr>
                        <tr>
                            <td><strong>Locations</strong></td>
                            <td>Define the places in your world where storylets can appear</td>
                        </tr>
                        <tr>
                            <td><strong>Decks</strong></td>
                            <td>Configure opportunity card pools for random events</td>
                        </tr>
                        <tr>
                            <td><strong>Categories</strong></td>
                            <td>Organize qualities into groups for batch operations</td>
                        </tr>
                        <tr>
                            <td><strong>Regions</strong></td>
                            <td>Group locations into larger geographic areas</td>
                        </tr>
                        <tr>
                            <td><strong>Markets</strong></td>
                            <td>Create shops and trading interfaces</td>
                        </tr>
                        <tr>
                            <td><strong>Assets</strong></td>
                            <td>Upload and manage images for your game</td>
                        </tr>
                        <tr>
                            <td><strong>Graph</strong></td>
                            <td>Visualize your narrative structure and connections</td>
                        </tr>
                        <tr>
                            <td><strong>Admin</strong></td>
                            <td>Configure global settings, character creation, and game rules</td>
                        </tr>
                    </tbody>
                </table>

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>The Top Bar</h3>
                <ul className="docs-list">
                    <li><strong>Project Name:</strong> Displays your current project</li>
                    <li><strong>Play Button:</strong> Opens your game in play mode for testing</li>
                    <li><strong>Settings:</strong> Access project-specific configuration</li>
                    <li><strong>Publish:</strong> Deploy your game for players</li>
                </ul>
            </section>

            {/* Quality editor - Define variables, stats, items, and resources */}
            <section id="quality-editor">
                <h2 className="docs-h2">The Quality Editor</h2>
                <p className="docs-p">
                    This is where you define all the variables that power your game's state and mechanics.
                </p>

                <div className="docs-card" style={{background: 'rgba(97, 175, 239, 0.1)', borderLeft: '4px solid var(--docs-accent-blue)'}}>
                    <strong style={{color: 'var(--docs-accent-blue)'}}>📸 SCREENSHOT NEEDED:</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0}}>
                        Quality editor interface with annotations for:
                        - Quality list (left panel)
                        - "+ New Quality" button
                        - Selected quality details (right panel)
                        - All major field sections (Basic Info, Display, Progression, Behavior)
                        - Save/Cancel buttons
                    </p>
                </div>

                <h3 className="docs-h3">Field Sections</h3>

                <div className="docs-card">
                    <h4 className="docs-h4">Basic Info</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>ID:</strong> The internal code name (e.g., <code>investigation</code>). Used in ScribeScript.</li>
                        <li><strong>Name:</strong> The display name shown to players. Can include ScribeScript for dynamic names.</li>
                        <li><strong>Type:</strong> Determines how this quality behaves (Pyramidal, Counter, Item, etc.).</li>
                        <li><strong>Category:</strong> Groups qualities for organization and batch operations.</li>
                    </ul>
                </div>

                <div className="docs-card" style={{marginTop: '1rem'}}>
                    <h4 className="docs-h4">Display & Flavor</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Description:</strong> Tooltip text shown when hovering over the quality.</li>
                        <li><strong>Singular/Plural Name:</strong> For grammatically correct messages.</li>
                        <li><strong>Increase/Decrease Description:</strong> Custom log messages for changes.</li>
                        <li><strong>Image Code:</strong> Link to an asset for visual representation.</li>
                    </ul>
                </div>

                <div className="docs-card" style={{marginTop: '1rem'}}>
                    <h4 className="docs-h4">Progression & Limits</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Max Cap:</strong> Absolute maximum level.</li>
                        <li><strong>Grind Cap:</strong> Maximum level achievable through repeatable actions.</li>
                        <li><strong>CP Cap:</strong> (Pyramidal only) Flattens the difficulty curve at high levels.</li>
                    </ul>
                </div>

                <div className="docs-card" style={{marginTop: '1rem'}}>
                    <h4 className="docs-h4">Item/Equipable Behavior</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        Only visible for Item (I) and Equipable (E) types:
                    </p>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Use Event:</strong> Storylet ID that opens when player clicks "Use".</li>
                        <li><strong>Equipment Slot:</strong> (Equipable only) Which slot this item occupies.</li>
                        <li><strong>Bonus:</strong> (Equipable only) Effects applied while equipped.</li>
                        <li><strong>Tags:</strong> Special behaviors like <code>auto_equip</code>, <code>force_equip</code>, <code>bound</code>.</li>
                    </ul>
                </div>

                <div className="docs-card" style={{background: 'rgba(97, 175, 239, 0.1)', borderLeft: '4px solid var(--docs-accent-blue)', marginTop: '1rem'}}>
                    <strong style={{color: 'var(--docs-accent-blue)'}}>📸 SCREENSHOT NEEDED (Detail View):</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0}}>
                        Close-up of the Quality editor showing:
                        - Type dropdown expanded with all options visible (P, C, I, E, T, S)
                        - Example of ScribeScript in the Name field
                        - Text Variants section (if visible)
                    </p>
                </div>
            </section>

            {/* Storylet editor - Write narrative content, dialogue, and branching choices */}
            <section id="storylet-editor">
                <h2 className="docs-h2">The Storylet Editor</h2>
                <p className="docs-p">
                    This is your narrative workspace where you write the scenes, dialogue, and events that make up your story.
                </p>

                <div className="docs-card" style={{background: 'rgba(97, 175, 239, 0.1)', borderLeft: '4px solid var(--docs-accent-blue)'}}>
                    <strong style={{color: 'var(--docs-accent-blue)'}}>📸 SCREENSHOT NEEDED:</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0}}>
                        Full storylet editor with annotations for:
                        - Storylet list (left panel) with filter/search
                        - Main editing area with all field sections visible
                        - Options section with at least one option expanded
                        - Logic fields (Visible If, Unlock If, Autofire If)
                        - Save button
                    </p>
                </div>

                <h3 className="docs-h3">Top Section: Storylet Properties</h3>

                <div className="docs-card">
                    <h4 className="docs-h4">Identity & Location</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>ID:</strong> Internal identifier for redirects and references.</li>
                        <li><strong>Title:</strong> The heading shown to players. Supports ScribeScript.</li>
                        <li><strong>Location:</strong> Where this storylet appears in the world.</li>
                    </ul>
                </div>

                <div className="docs-card" style={{marginTop: '1rem'}}>
                    <h4 className="docs-h4">Narrative Content</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Teaser:</strong> Short description on the button (before opening).</li>
                        <li><strong>Body:</strong> Main narrative text (after opening).</li>
                        <li><strong>Meta Text:</strong> Italicized instructions or mechanical notes.</li>
                        <li><strong>Image Code:</strong> Asset to display with this storylet.</li>
                    </ul>
                </div>

                <div className="docs-card" style={{marginTop: '1rem'}}>
                    <h4 className="docs-h4">Availability Logic</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Visible If:</strong> Requirements to see this storylet at all.</li>
                        <li><strong>Unlock If:</strong> Requirements to open it (if visible but locked, shows a padlock).</li>
                        <li><strong>Autofire If:</strong> Condition that triggers this storylet automatically, interrupting player actions.</li>
                    </ul>
                </div>

                <div className="docs-card" style={{marginTop: '1rem'}}>
                    <h4 className="docs-h4">Flow Control</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Return Target:</strong> Custom "Go Back" button destination.</li>
                        <li><strong>Tags:</strong> Special behaviors (covered in Storylets & Opportunities docs).</li>
                    </ul>
                </div>

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Options Section</h3>
                <p className="docs-p">
                    Each storylet can have multiple options (choices) for the player. Click "+ Add Option" to create one.
                </p>

                <div className="docs-card">
                    <h4 className="docs-h4">Option Identity</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Title:</strong> The button text for this choice.</li>
                        <li><strong>Description:</strong> Flavor text explaining what this choice does.</li>
                        <li><strong>Visible If / Unlock If:</strong> Requirements to see or access this specific option.</li>
                    </ul>
                </div>

                <div className="docs-card" style={{marginTop: '1rem'}}>
                    <h4 className="docs-h4">Challenge Configuration</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        Check the <strong>"Difficulty"</strong> checkbox to enable skill checks:
                    </p>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Challenge:</strong> The success chance expression (e.g., <code>{`{ $strength >> 50 }`}</code>).</li>
                    </ul>
                </div>

                <div className="docs-card" style={{marginTop: '1rem'}}>
                    <h4 className="docs-h4">Outcomes</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        When Difficulty is unchecked, you have one set of outcome fields. When checked, you have separate Success and Failure outcomes:
                    </p>
                    <table className="docs-table" style={{fontSize: '0.85rem'}}>
                        <thead>
                            <tr>
                                <th>Field</th>
                                <th>Purpose</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code>pass_text</code> / <code>fail_text</code></td>
                                <td>Narrative result shown after the choice</td>
                            </tr>
                            <tr>
                                <td><code>pass_quality_change</code> / <code>fail_quality_change</code></td>
                                <td>Effects to apply (e.g., <code>$gold += 10</code>)</td>
                            </tr>
                            <tr>
                                <td><code>pass_redirect</code> / <code>fail_redirect</code></td>
                                <td>Storylet ID to jump to immediately</td>
                            </tr>
                            <tr>
                                <td><code>pass_move_to</code> / <code>fail_move_to</code></td>
                                <td>Location ID to transport the player to</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="docs-card" style={{marginTop: '1rem'}}>
                    <h4 className="docs-h4">Option Tags</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>instant_redirect:</strong> Skip the result screen, jump immediately</li>
                        <li><strong>no_return:</strong> Hide the "Go Back" button</li>
                        <li><strong>dangerous:</strong> Red warning styling</li>
                        <li><strong>clear_hand:</strong> Discard all cards from player's hand</li>
                    </ul>
                </div>

                <div className="docs-card" style={{background: 'rgba(97, 175, 239, 0.1)', borderLeft: '4px solid var(--docs-accent-blue)', marginTop: '1.5rem'}}>
                    <strong style={{color: 'var(--docs-accent-blue)'}}>📸 SCREENSHOT NEEDED (Detail View):</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0}}>
                        Close-up showing:
                        - An option with the "Difficulty" checkbox enabled
                        - Separate Success and Failure outcome fields visible
                        - The Challenge field with an example expression
                        - Option tags section
                    </p>
                </div>
            </section>

            {/* Location editor - Create and configure physical/conceptual spaces */}
            <section id="location-editor">
                <h2 className="docs-h2">The Location Editor</h2>
                <p className="docs-p">
                    Locations are the "containers" where your storylets live. They represent physical or conceptual spaces in your game.
                </p>

                <div className="docs-card" style={{background: 'rgba(97, 175, 239, 0.1)', borderLeft: '4px solid var(--docs-accent-blue)'}}>
                    <strong style={{color: 'var(--docs-accent-blue)'}}>📸 SCREENSHOT NEEDED:</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0}}>
                        Location editor showing:
                        - Location list (left panel)
                        - Location details form (right panel)
                        - All major fields visible (Name, Description, Image, Settings)
                        - Travel/Map configuration section
                    </p>
                </div>

                <h3 className="docs-h3">Key Fields</h3>
                <ul className="docs-list">
                    <li><strong>ID & Name:</strong> Identifier and display name</li>
                    <li><strong>Description:</strong> Flavor text for this place</li>
                    <li><strong>Image Code:</strong> Background image for the location</li>
                    <li><strong>Region:</strong> Parent region (for grouping and maps)</li>
                    <li><strong>Deck:</strong> Opportunity deck assigned to this location</li>
                    <li><strong>Market:</strong> Shop interface assigned to this location</li>
                    <li><strong>Visible If / Unlock If:</strong> Requirements to discover/access this place</li>
                </ul>

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Location Tags</h3>
                <ul className="docs-list">
                    <li><strong>Lock Equipment:</strong> Players cannot change their gear while here (prison, combat)</li>
                    <li><strong>Safe Zone:</strong> Custom tag for your game logic (no meaning to the engine)</li>
                </ul>
            </section>

            {/* Admin panel - Global settings, character creation, and game rules */}
            <section id="admin">
                <h2 className="docs-h2">The Admin Panel</h2>
                <p className="docs-p">
                    This is your control center for game-wide settings and rules.
                </p>

                <div className="docs-card" style={{background: 'rgba(97, 175, 239, 0.1)', borderLeft: '4px solid var(--docs-accent-blue)'}}>
                    <strong style={{color: 'var(--docs-accent-blue)'}}>📸 SCREENSHOT NEEDED:</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0}}>
                        Admin panel overview showing major sections:
                        - Action Economy settings
                        - Character Initialization entries
                        - System Bindings
                        - Visual/Layout selector
                        - Publishing options
                    </p>
                </div>

                <h3 className="docs-h3">Important Sections</h3>

                <div className="docs-card">
                    <h4 className="docs-h4">Action Economy</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        Controls the resource players spend to perform actions:
                    </p>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Max Actions:</strong> Action pool cap</li>
                        <li><strong>Regen Time:</strong> How often actions replenish (in minutes)</li>
                        <li><strong>Regen Amount:</strong> How many actions restore per tick</li>
                    </ul>
                </div>

                <div className="docs-card" style={{marginTop: '1rem'}}>
                    <h4 className="docs-h4">Character Initialization</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        Defines what happens when a player creates a new character:
                    </p>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Type: Static:</strong> Effect runs automatically (e.g., <code>$health = 10</code>)</li>
                        <li><strong>Type: Text:</strong> Player enters a value (for names, custom text)</li>
                        <li><strong>Type: Multiple Choice:</strong> Player picks from options</li>
                        <li><strong>Starting Location:</strong> Where new players spawn</li>
                    </ul>
                </div>

                <div className="docs-card" style={{marginTop: '1rem'}}>
                    <h4 className="docs-h4">System Bindings</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        Links engine concepts to specific quality IDs:
                    </p>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Health Quality:</strong> Shown as a health bar in UI</li>
                        <li><strong>Name Quality:</strong> Player's character name</li>
                        <li><strong>Portrait Quality:</strong> Profile image</li>
                    </ul>
                </div>

                <div className="docs-card" style={{marginTop: '1rem'}}>
                    <h4 className="docs-h4">Challenge Physics (Global Defaults)</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        Set default parameters for all skill checks:
                    </p>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Default Margin:</strong> Can use ScribeScript like <code>{`{ target / 2 }`}</code></li>
                        <li><strong>Default Min/Max:</strong> Global floor/ceiling for success chances</li>
                        <li><strong>Default Pivot:</strong> Success chance when skill equals difficulty</li>
                    </ul>
                </div>
            </section>

            {/* Graph viewer - Visual debugging tool for storylet connections and quality flow */}
            <section id="graph">
                <h2 className="docs-h2">The Narrative Graph</h2>
                <p className="docs-p">
                    The Graph is a visual debugging tool that shows how your storylets connect and what qualities they modify.
                </p>

                <div className="docs-card" style={{background: 'rgba(97, 175, 239, 0.1)', borderLeft: '4px solid var(--docs-accent-blue)'}}>
                    <strong style={{color: 'var(--docs-accent-blue)'}}>📸 SCREENSHOT NEEDED:</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0}}>
                        Graph view showing:
                        - Node network with color-coded nodes (Green=producers, Red=consumers, Yellow=hubs)
                        - Mode selector (Redirect Mode vs Quality Logic Mode)
                        - Zoom controls and mini-map
                        - Inspector panel (right side) showing a selected node's details
                        - Right-click context menu visible
                    </p>
                </div>

                <h3 className="docs-h3">Navigation Controls</h3>
                <ul className="docs-list">
                    <li><strong>Mouse Wheel:</strong> Zoom in/out</li>
                    <li><strong>Click + Drag:</strong> Pan around the graph</li>
                    <li><strong>Click Node:</strong> Select and view details in inspector</li>
                    <li><strong>Right-Click Node:</strong> Open rapid prototyping menu</li>
                </ul>

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Visualization Modes</h3>
                <ul className="docs-list">
                    <li><strong>Redirect Mode:</strong> Shows storylet-to-storylet connections (visual novel view)</li>
                    <li><strong>Quality Logic Mode:</strong> Shows which storylets produce/consume each quality (simulation view)</li>
                </ul>
            </section>

            {/* Asset manager - Upload and organize images for your game */}
            <section id="assets">
                <h2 className="docs-h2">The Asset Manager</h2>
                <p className="docs-p">
                    Upload and organize images for your game here.
                </p>

                <div className="docs-card" style={{background: 'rgba(97, 175, 239, 0.1)', borderLeft: '4px solid var(--docs-accent-blue)'}}>
                    <strong style={{color: 'var(--docs-accent-blue)'}}>📸 SCREENSHOT NEEDED:</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0}}>
                        Asset manager interface showing:
                        - Upload button/area
                        - Grid of uploaded images with IDs
                        - Search/filter options
                        - Image preview on selection
                    </p>
                </div>

                <h3 className="docs-h3">How to Use</h3>
                <ol className="docs-list">
                    <li>Click "Upload Asset" and select an image file</li>
                    <li>The system generates a unique ID for the image</li>
                    <li>Use that ID in any Image Code field (storylets, qualities, locations)</li>
                    <li>The image will display automatically in-game</li>
                </ol>
            </section>

            {/* Play mode - Test your game as players experience it */}
            <section id="playmode">
                <h2 className="docs-h2">Play Mode (Testing Your Game)</h2>
                <p className="docs-p">
                    Click the "Play" button in the top bar to test your game as a player would experience it.
                </p>

                <div className="docs-card" style={{background: 'rgba(97, 175, 239, 0.1)', borderLeft: '4px solid var(--docs-accent-blue)'}}>
                    <strong style={{color: 'var(--docs-accent-blue)'}}>📸 SCREENSHOT NEEDED:</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0}}>
                        Play mode interface showing:
                        - Main content area with a storylet open
                        - Character sheet sidebar (qualities displayed)
                        - Action counter (if using action economy)
                        - Navigation (location selector, opportunity deck)
                        - Messages log
                    </p>
                </div>

                <h3 className="docs-h3">Play Mode Features</h3>
                <ul className="docs-list">
                    <li><strong>Character Sheet:</strong> View all your qualities in real-time</li>
                    <li><strong>Location Hub:</strong> See all available storylets in your current location</li>
                    <li><strong>Opportunity Deck:</strong> Draw and play random encounter cards</li>
                    <li><strong>Messages Log:</strong> Track quality changes and story events</li>
                    <li><strong>GM Console:</strong> (Test mode only) Cheat menu to modify your character</li>
                </ul>

                <div className="docs-callout" style={{marginTop: '1.5rem', borderColor: 'var(--docs-accent-green)'}}>
                    <strong style={{color: 'var(--docs-accent-green)'}}>Pro Tip: Use Multiple Test Characters</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        Create different test characters to try various paths through your game. Each character saves their state independently, allowing you to test different builds and choices.
                    </p>
                </div>
            </section>

            {/* Keyboard shortcuts and workflow tips for efficient editing */}
            <section id="shortcuts">
                <h2 className="docs-h2">Keyboard Shortcuts & Tips</h2>

                <h3 className="docs-h3">Editor Shortcuts</h3>
                <table className="docs-table">
                    <thead>
                        <tr>
                            <th>Shortcut</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>Ctrl/Cmd + S</code></td>
                            <td>Save current item</td>
                        </tr>
                        <tr>
                            <td><code>Ctrl/Cmd + F</code></td>
                            <td>Search/Filter in current view</td>
                        </tr>
                        <tr>
                            <td><code>Ctrl/Cmd + N</code></td>
                            <td>Create new item in current section</td>
                        </tr>
                    </tbody>
                </table>

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Workflow Tips</h3>
                <ul className="docs-list">
                    <li><strong>Use the Graph:</strong> Regularly check the graph view to spot orphaned storylets or missing connections</li>
                    <li><strong>Name Consistently:</strong> Use clear, descriptive IDs (e.g., <code>tutorial_step_1</code> not <code>ts1</code>)</li>
                    <li><strong>Test Early:</strong> Playtest after every few storylets to catch logic errors</li>
                    <li><strong>Organize with Categories:</strong> Group related qualities for easier batch operations</li>
                    <li><strong>Duplicate for Variants:</strong> Most editors have a "Duplicate" button—use it for similar content</li>
                </ul>
            </section>
        </div>
    );
}
