'use client';

import React from 'react';

export default function QualitiesDocs() {
    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">Qualities, Variables & Resources</h1>
                <p className="docs-lead">
                    Defining the variables, items, stats, and currencies that make up your world.
                </p>
            </header>
            
            <section id="definition">
                <h2 className="docs-h2">1. What is a Quality?</h2>
                <p className="docs-p">
                    In most games, you have "Stats" (Strength), "Inventory" (Gold), and "Flags" (Quest Completed). 
                    In Chronicle, <strong>these are all the same thing.</strong>
                </p>
                <p className="docs-p">
                    A <strong>Quality</strong> is a named variable attached to a character that stores a value. 
                    The Engine uses Qualities to remember everything about the player's history.
                </p>
                <div className="docs-callout">
                    <strong>Why?</strong> By treating everything as a Quality, you can use the same math and logic everywhere. 
                    You can "spend" your <em>Strength</em> just like you spend <em>Gold</em>. You can "equip" a <em>Reputation</em> just like a <em>Sword</em>.
                </div>
            </section>

            {/* SECTION 1: TYPES */}
            <section id="types">
                <h2 className="docs-h2">2. Quality Types</h2>
                <p className="docs-p">
                    When creating a new Quality, you must assign it a type. This determines how the engine calculates math and where it appears in the UI.
                </p>

                <div className="docs-grid">
                    <div className="docs-card" style={{borderColor: '#61afef'}}>
                        <h4 className="docs-h4" style={{color: '#61afef'}}>Pyramidal (Exponential)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Type: P</strong><br/>
                            Used for qualities that should gradually progress and become more difficult to progress as time goes on. Good candidates are Skills and Attributes.
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Uses <strong>Change Points (CP)</strong>. Leveling up requires <code>Current Level + 1</code> CP.
                        </p>
                    </div>
                    <div className="docs-card" style={{borderColor: '#e5c07b'}}>
                        <h4 className="docs-h4" style={{color: '#e5c07b'}}>Counter (Linear)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Type: C</strong><br/>
                            Used for Gold, Story Progress, and hidden logic counters. Items and Equipables follow the same linear progression logic.
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Linear progression. <code>+1</code> adds exactly 1 Level.
                        </p>
                    </div>
                    <div className="docs-card" style={{borderColor: '#98c379'}}>
                        <h4 className="docs-h4" style={{color: '#98c379'}}>Item (Inventory)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Type: I</strong><br/>
                            Functionally identical to a Counter, but appears in the <strong>Possessions Tab</strong>.
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Supports <strong>Source Tracking</strong> to remember where it was found.
                        </p>
                    </div>
                    <div className="docs-card" style={{borderColor: '#c678dd'}}>
                        <h4 className="docs-h4" style={{color: '#c678dd'}}>Equipable (Gear)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Type: E</strong><br/>
                            An Item that can be worn in a specific slot (Head, Body, Weapon).
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Grants passive bonuses to other qualities while equipped.
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">String (Text)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Type: S</strong><br/>
                            Stores text instead of numbers. Used for names, titles, or descriptions.
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Accessing this quality using the normal operation (<code>$quality</code>) returns the stored text rather than the level.
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Also used in the system bindings to store codes for images or locations as hidden qualities.
                        </p>
                    </div>
                </div>
            </section>

            <section id="categories">
                <h2 className="docs-h2">3. Categories & Organization</h2>
                <p className="docs-p">
                    Every Quality has a <strong>Category</strong> field (e.g., <code>Nature, Main Quest</code>). 
                    This is used to group items in the UI. However, some categories have special powers defined in <strong>Global Settings</strong>.
                </p>

                <div className="docs-grid">
                    <div className="docs-card">
                        <h4 className="docs-h4">Sidebar Categories</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Qualities are <strong>hidden</strong> from the main sidebar by default. 
                            To show them, you must add their category to the <strong>Sidebar Categories</strong> list in Settings.
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">Equipment Slots</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            If you add a category here (e.g., <code>Head</code>, <code>Hand</code>), the Engine creates a wearable slot for it. 
                            Any <strong>Equipable (E)</strong> quality with that category can then be worn.
                        </p>
                    </div>

                    <div className="docs-card">
                        <h4 className="docs-h4">The Wallet</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            To treat a quality as <strong>Currency</strong>, you must configure it. These items are removed from the standard inventory list 
                            and displayed prominently in the <strong>Wallet Header</strong> at the top of the screen.
                        </p>
                    </div>
                </div>
            </section>

            {/* SECTION 2: ITEM BEHAVIOR */}
            <section id="behavior">
                <h2 className="docs-h2">4. Item Behaviors</h2>
                <p className="docs-p">
                    Equipable items and Inventory items have special properties you can toggle in the Editor.
                </p>

                <h3 className="docs-h3">Use Event (Redirect)</h3>
                <p className="docs-p">
                    You can link an item to a specific <strong>Storylet ID</strong> in the "Use Event" field.
                </p>
                <p className="docs-p">
                    <strong>Effect:</strong> A "Use" button appears on the item card. Clicking it immediately redirects the player to that Storylet.
                    <br/><em>Useful for: Consumables (Potions), Loot Boxes, or Books.</em>
                </p>

                <h3 className="docs-h3">Auto-Equip Logic</h3>
                <table className="docs-table">
                    <thead><tr><th>Property</th><th>Behavior</th></tr></thead>
                    <tbody>
                        <tr>
                            <td><strong>Auto-Equip</strong></td>
                            <td>Polite. Automatically equips the item upon acquisition, but <strong>only</strong> if the slot is currently empty.</td>
                        </tr>
                        <tr>
                            <td><strong>Force Equip</strong></td>
                            <td>Rude. Automatically equips the item, <strong>replacing</strong> whatever the player was wearing. Useful for "Cursed Armor", mandatory disguises or bonds and burdens the character takes upon them.</td>
                        </tr>
                    </tbody>
                </table>

                <h3 className="docs-h3">Cursed Items</h3>
                <p className="docs-p">
                    If checked, the item <strong>cannot be unequipped</strong> by the player via the UI. 
                    It must be removed via story logic (e.g., paying a priest to set <code>$cursed_ring = 0</code>).
                    Note that this does not place the item back into possessions (but can be emulated with a subsequent <code>$cursed_ring = 1</code> command).
                </p>
                <p className="docs-p">
                    The name can be a deceptive misnomer. This is also a property you want to enable on making a permanent commitment which should only be removable through
                    story logic, and not all cursed items need to be non-unequippable.
                </p>
            </section>

            {/* SECTION 3: DYNAMIC DISPLAY */}
            <section id="dynamic">
                <h2 className="docs-h2">5. Dynamic Display</h2>
                <p className="docs-p">
                    You can use logic inside a Quality's <strong>Name</strong> or <strong>Description</strong> fields to make them change based on their level.
                </p>

                <h4 className="docs-h4">Example: Evolving Status</h4>
                <p className="docs-p">
                    Imagine a "Wounds" quality that changes its name as it gets worse.
                </p>
                <div className="docs-pre">
                    <code className="docs-code">
                        {`{ $wounds < 4 : Scratches | $wounds < 7 : Injuries | Massive Trauma }`}
                    </code>
                </div>
                <p className="docs-p">
                    At level 1-3, the sidebar says "Scratches". At 7+, it says "Massive Trauma".
                </p>
            </section>

            {/* SECTION 5: SYSTEM BINDINGS */}
            <section id="bindings">
                <h2 className="docs-h2">6. System Bindings</h2>
                <p className="docs-p">
                    The Engine relies on specific qualities to handle core features like Actions and Identity. You map these in <strong>Settings -&gt; System Bindings</strong>.
                </p>

                <table className="docs-table">
                    <thead><tr><th>System Concept</th><th>Default ID</th><th>Description</th></tr></thead>
                    <tbody>
                        <tr>
                            <td><strong>Actions</strong></td>
                            <td><code>$actions</code></td>
                            <td>Controls the Energy/Action economy. Refills over time.</td>
                        </tr>
                        <tr>
                            <td><strong>Player Name</strong></td>
                            <td><code>$player_name</code></td>
                            <td>Display name shown in the Profile and Lobby. Can be dynamically set (<code>$player_first_name + ' ' + $player_last_name</code>)</td>
                        </tr>
                        <tr>
                            <td><strong>Portrait</strong></td>
                            <td><code>$player_portrait</code></td>
                            <td>Image ID used for the avatar. Will always try to resolve to the <code>image_code</code> defined in character creation. 
                            The default recommendation for this is to use a choice block (<code>image1 | image2 | image3</code>)</td>
                        </tr>
                    </tbody>
                </table>
            </section>
        </div>
    );
}