'use client';

import React from 'react';

export default function GeographyDocs() {
    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">Locations, Regions, Markets & Maps</h1>
                <p className="docs-lead">
                    Structuring the physical space of your world.
                </p>
            </header>
            <section id="hierarchy">
                <h2 className="docs-h2">1. The Hierarchy</h2>
                <p className="docs-p">
                    The world is organized into two levels of container, and two seperate system definitions which can be attached to them.
                </p>
                
                <div className="docs-grid">
                    <div className="docs-card">
                        <h4 className="docs-h4">1. Region</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            A broad area (e.g., "London", "The Underdark"). 
                        </p>
                        <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                            <li>Contains the <strong>Map Image</strong>.</li>
                            <li>Acts as a grouping folder for Locations.</li>
                            <li>Can hold a default <strong>Market ID</strong>.</li>
                            <li>If no map is defined, it will simply display a list of the locations in this region.</li>
                        </ul>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">2. Location</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            A specific point of interest (e.g., "The Bazaar", "Your Lodgings").
                        </p>
                        <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                            <li>This is where the player actually stands.</li>
                            <li>Contains the <strong>Storylets</strong> and the <strong>Deck</strong>, and can also have a unique <strong>Market ID</strong>.</li>
                            <li>Has X/Y coordinates to place a pin on the Region map.</li>
                        </ul>
                    </div>
                    <div className="docs-card" style={{borderColor: '#f1c40f'}}>
                        <h4 className="docs-h4" style={{color:'#f1c40f'}}>3. Systems</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Attached to Locations via IDs.
                        </p>
                        <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                            <li><strong>Deck:</strong> The pool of random cards drawn here.</li>
                            <li><strong>Market:</strong> The shop interface available here.</li>
                        </ul>
                    </div>
                
                </div>
            </section>
            <section id="travel">
                <h2 className="docs-h2">2. Travel Logic</h2>
                <p className="docs-p">
                    Players travel by clicking the "Map" button in the header. You control what they see using ScribeScript conditions.
                </p>

                <h3 className="docs-h3">Visibility vs. Access</h3>
                <table className="docs-table">
                    <thead><tr><th>Field</th><th>Effect</th></tr></thead>
                    <tbody>
                        <tr>
                            <td><strong>Visible Condition</strong></td>
                            <td>
                                <strong>Discovery.</strong> If this check fails, the location pin is completely invisible.
                                <br/><em>Use for: Secret areas that must be discovered first.</em>
                            </td>
                        </tr>
                        <tr>
                            <td><strong>Unlock Condition</strong></td>
                            <td>
                                <strong>Access.</strong> If this check fails, the pin is visible but greyed out (Locked).
                                <br/><em>Use for: Areas visible from a distance but currently unreachable (e.g. "The Palace Gates").</em>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div className="docs-syntax-box">
                    <code className="docs-code">$route_to_palace &gt;= 1</code>
                </div>
            </section>

            <section id="relocation">
                <h2 className="docs-h2">2.1 Narrative Travel</h2>
                <p className="docs-p">
                    The Map is not the only way to move. You often want to force the player to a new location as part of the story (e.g., "You fall down the well").
                </p>

                <h3 className="docs-h3">The "Move To" Field</h3>
                <p className="docs-p">
                    Every Option in a Storylet has a <strong>Move To</strong> field (internally <code>pass_move_to</code>).
                </p>
                <div className="docs-syntax-box">
                    Move To: <code>cave_bottom</code>
                </div>
                <p className="docs-p">
                    When the player clicks this option, they are instantly transported to the Location ID specified. 
                    The background, deck, and available storylets will update immediately.
                </p>

                <h3 className="docs-h3">Common Pattern: The Trap</h3>
                <p className="docs-p">
                    To trap a player in a location (like a Prison):
                </p>
                <ol className="docs-list">
                    <li>Use <strong>Move To</strong> to send them to the Prison location.</li>
                    <li>In the Prison location settings, add the <strong>Lock Equipment</strong> behavior tag.</li>
                    <li>Ensure the Prison location has no <strong>Region ID</strong> assigned, so they cannot map-travel out.</li>
                    <li>Create a Storylet in the Prison that moves them back to the Hub only when they have served their time.</li>
                </ol>
            </section>
            <section id="markets">
                <h2 className="docs-h2">3. Markets</h2>
                <p className="docs-p">
                    A Location can be linked to a <strong>Market</strong>. This adds a "Market" button to the header, allowing players to access a bulk-exchange interface.
                </p>

                <h3 className="docs-h3">Structure</h3>
                <div className="docs-card">
                    <ul className="docs-list">
                        <li><strong>Market:</strong> The container (e.g., "The Grand Exchange").</li>
                        <li><strong>Stall:</strong> A tab within the market (e.g., "Weapons", "Spices"). Defined as <em>Buy</em> or <em>Sell</em> mode.</li>
                        <li><strong>Listing:</strong> A specific item. Contains the Price Logic (e.g. <code>$reputation * 10</code>).</li>
                    </ul>
                </div>

                <h3 className="docs-h3">Linking a Market</h3>
                <p className="docs-p">
                    Markets are defined separately in the <strong>Markets</strong> tab of the Creator Studio. To use one:
                </p>
                <ol className="docs-list">
                    <li>Create a Market and copy its <strong>ID</strong> (e.g., <code>grand_exchange</code>).</li>
                    <li>Go to the <strong>Location Editor</strong>.</li>
                    <li>Paste the ID into the <strong>Market ID</strong> field.</li>
                </ol>
                <div className="docs-callout">
                    <strong>Region Fallback:</strong> You can also assign a Market ID to a <strong>Region</strong>. 
                    If a Location inside that region does not have its own market, it will use the Region's market.
                </div>
            </section>
            <section id="behavior">
                <h2 className="docs-h2">4. Location Properties</h2>
                <p className="docs-p">
                    Locations define the rules of engagement for the player while they are there.
                </p>

                <h3 className="docs-h3">Deck Assignment</h3>
                <p className="docs-p">
                    Every location can have one <strong>Opportunity Deck</strong>. 
                    When the player is here, drawing cards pulls from this specific deck definition.
                </p>

                <h3 className="docs-h3">Market Assignment</h3>
                <p className="docs-p">
                    You can link a <strong>Market ID</strong> to a location. 
                    This adds a "Market" button to the header, allowing access to the bulk exchange interface.
                </p>

                <h3 className="docs-h3">Behavior Tags</h3>
                <div className="docs-grid">
                    <div className="docs-card" style={{borderColor: '#e74c3c'}}>
                        <h4 className="docs-h4" style={{color: '#e74c3c'}}>Lock Equipment</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Tag:</strong> <code>lock_equipment</code>
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Prevents the player from changing their gear while in this location.
                            <br/><em>Useful for: Prisons, Undercover Missions, or Dream States.</em>
                        </p>
                    </div>
                    <div className="docs-card" style={{borderColor: '#2ecc71'}}>
                        <h4 className="docs-h4" style={{color: '#2ecc71'}}>Safe Zone</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Tag:</strong> <code>safe_zone</code>
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            (Planned Feature) Prevents Menace Autofires from triggering while here.
                            <br/><em>Useful for: Player Housing or Sanctuaries.</em>
                        </p>
                    </div>
                </div>
            </section>
            <section id="editor">
                <h2 className="docs-h2">5. Using the Map Editor</h2>
                <p className="docs-p">
                    Setting coordinates manually is tedious. The Studio provides a visual tool.
                </p>
                <ol className="docs-list">
                    <li>Go to the <strong>Assets</strong> tab and upload your Map Image. Categorize it as <code>Map</code>.</li>
                    <li>In the Asset Preview, <strong>click anywhere on the image</strong>.</li>
                    <li>The tool will display the <code>X, Y</code> coordinates of that point relative to the image size.</li>
                    <li>Copy these numbers into the <strong>Coordinates</strong> field of your Location.</li>
                </ol>
            </section>
        </div>
    );
}