'use client';

import React from 'react';
import Link from 'next/link';

// A small dummy component to render progress bars for examples
const ProgressBar = ({ percent, color = 'var(--accent-highlight)' }: { percent: number, color?: string }) => (
    <div style={{ height: '12px', background: 'var(--bg-item)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: '6px' }} />
    </div>
);

export default function QualitiesDocs() {
    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">Qualities & State</h1>
                <p className="docs-lead">
                    Defining the variables, items, stats, and resources that make up your world's memory.
                </p>
            </header>
            
            <section id="definition">
                <h2 className="docs-h2">1. What is a Quality?</h2>
                <p className="docs-p">
                    In most games, you have "Stats" (Strength), "Inventory" (Gold), and "Flags" (Quest Completed). 
                    In Chronicle Hub, <strong>these are all the same thing.</strong>
                </p>
                <p className="docs-p">
                    A <strong>Quality</strong> is a named variable attached to a character that stores a value. 
                    The Engine uses Qualities to remember everything about the player's history and current state.
                </p>
                <div className="docs-callout">
                    <strong>Why?</strong> By treating everything as a Quality, you can use the same ScribeScript logic everywhere. 
                    You can check your <em>Strength</em> just like you check your <em>Gold</em>. You can even have an event that "spends" a level of a skill.
                </div>
            </section>

            <section id="types">
                <h2 className="docs-h2">2. Quality Types</h2>
                <p className="docs-p">
                    When creating a new Quality, you must assign it a type. This determines how the engine calculates its value and how it's displayed.
                </p>

                <div className="docs-grid">
                    <div className="docs-card" style={{borderColor: '#61afef'}}>
                        <h4 className="docs-h4" style={{color: '#61afef'}}>Pyramidal (P)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            An exponential stat that gets harder to level up over time. Uses <strong>Change Points (CP)</strong>. Perfect for core character attributes and skills.
                        </p>
                        <ProgressBar percent={33} color="#61afef" />
                    </div>
                    <div className="docs-card" style={{borderColor: '#e5c07b'}}>
                        <h4 className="docs-h4" style={{color: '#e5c07b'}}>Counter (C)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            A simple, linear number. <code>+1</code> always adds exactly 1 level. Used for currency, quest progress, and simple counters.
                        </p>
                    </div>
                     <div className="docs-card" style={{borderColor: '#f1c40f'}}>
                        <h4 className="docs-h4" style={{color: '#f1c40f'}}>Tracker (T)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                           Functionally identical to a Counter, but designed for UI elements that show progress towards a goal (e.g., a progress bar that fills up).
                        </p>
                        <ProgressBar percent={75} color="#f1c40f" />
                    </div>
                    <div className="docs-card" style={{borderColor: '#98c379'}}>
                        <h4 className="docs-h4" style={{color: '#98c379'}}>Item (I)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            A linear counter that is displayed in the player's "Possessions" tab. Supports <strong>Source Tracking</strong>.
                        </p>
                    </div>
                    <div className="docs-card" style={{borderColor: '#c678dd'}}>
                        <h4 className="docs-h4" style={{color: '#c678dd'}}>Equipable (E)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            An Item that can be worn in a specific equipment slot. Can grant passive bonuses to other qualities.
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">String (S)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Stores text instead of a number. Used for player names, titles, or storing specific narrative states.
                        </p>
                    </div>
                </div>
            </section>
            
            <section id="progression">
                <h2 className="docs-h2">3. Progression Logic (Caps)</h2>
                <p className="docs-p">
                    For numeric qualities, you can define limits on their progression in the Quality Editor. These fields all support ScribeScript, allowing for dynamic caps based on other stats.
                </p>
                <div className="docs-grid">
                    <div className="docs-card">
                        <h4 className="docs-h4">Max Cap</h4>
                        <p className="docs-p" style={{fontSize:'0.9rem'}}>The absolute maximum level a quality can reach. Any gains beyond this point are ignored.</p>
                        <code className="docs-code" style={{fontSize:'0.8rem'}}>max: 200</code>
                    </div>
                     <div className="docs-card">
                        <h4 className="docs-h4">Grind Cap</h4>
                        <p className="docs-p" style={{fontSize:'0.9rem'}}>The maximum level a quality can reach through <strong>repeatable</strong> actions (`++` or `+=`). A hard `Set` (`=`) can still bypass this.</p>
                        <code className="docs-code" style={{fontSize:'0.8rem'}}>grind_cap: 70</code>
                    </div>
                     <div className="docs-card">
                        <h4 className="docs-h4">CP Cap</h4>
                        <p className="docs-p" style={{fontSize:'0.9rem'}}><strong>(Pyramidal Only)</strong> The maximum number of Change Points required for a level up. This "flattens" the difficulty curve in the late game.</p>
                        <code className="docs-code" style={{fontSize:'0.8rem'}}>cp_cap: 20</code>
                    </div>
                </div>
            </section>

            <section id="dynamic-text">
                <h2 className="docs-h2">4. Advanced Display & Text</h2>
                <p className="docs-p">
                    Qualities have several fields that allow their text to change dynamically based on their own value or other game states. Remember to use the <code>$.</code> sigil to refer to the quality's own value within these fields.
                </p>

                <h3 className="docs-h3">Dynamic Naming & Descriptions</h3>
                <p className="docs-p">You can use ScribeScript in the <strong>Name</strong> and <strong>Description</strong> fields to make them reactive.</p>
                <div className="docs-pre">
                    <span style={{color:'#777'}}>// In the 'Name' field of a 'Suspicion' quality:</span>
                    <br/>
                    <code className="docs-code">
                        {`{ $. > 50 : Notoriety | $. > 10 : Infamy | Suspicion }`}
                    </code>
                </div>
                <p className="docs-p">This quality will automatically rename itself in the UI as its level increases.</p>

                <h3 className="docs-h3">Automated Grammar & Messaging</h3>
                <p className="docs-p">These fields help you write cleaner, more natural-sounding log messages.</p>
                <ul className="docs-props-list">
                    <li>
                        <code>Singular Name</code> / <code>Plural Name</code>
                        <span>These fields power the <code>.singular</code> and <code>.plural</code> properties, allowing ScribeScript to choose the correct grammar.</span>
                        <div className="docs-code" style={{marginTop:'5px', fontSize:'0.8rem'}}>
                            <strong>Editor:</strong> Singular="Coin", Plural="Coins"<br/>
                            <strong>ScribeScript:</strong> You find {`{$coin_pouch}`} {`{$coin_pouch.plural}`}.
                        </div>
                    </li>
                    <li>
                        <code>Increase/Decrease Description</code>
                        <span>Overrides the default "Quality has changed" message in the log. You can use ScribeScript here to provide context.</span>
                         <div className="docs-code" style={{marginTop:'5px', fontSize:'0.8rem'}}>
                            <strong>Editor:</strong> Increase Desc="Your Wounds worsen."<br/>
                            <strong>Effect:</strong> $wounds++<br/>
                            <strong>Log Output:</strong> "Your Wounds worsen."
                        </div>
                    </li>
                </ul>

                <h3 className="docs-h3">Text Variants</h3>
                <p className="docs-p">This is a powerful feature for creating qualities that act as dictionaries for related pieces of text. In the Quality Editor, you can add key-value pairs.</p>
                 <div className="docs-pre">
                    <span style={{color:'#777'}}>// In a 'pronouns' quality with Text Variants:</span>
                    <br/>
                    <span style={{color:'#777'}}>key: "subject", value: "{`{ $.stringValue == 'he/him' : 'he' | 'they' }`}"</span>
                    <br/>
                    <span style={{color:'#777'}}>key: "object", value: "{`{ $.stringValue == 'he/him' : 'him' | 'them' }`}"</span>
                    <br/><br/>
                    <span style={{color:'#777'}}>// Then, in your story text:</span>
                    <br/>
                    <code className="docs-code">
                        You see {`{$pronouns.object}`}. {`{$pronouns.subject.capital}`} is wearing a hat.
                    </code>
                </div>
            </section>

            <section id="behavior">
                <h2 className="docs-h2">5. Item & Equipable Behaviors</h2>
                <p className="docs-p">
                    Items (I) and Equipables (E) have special fields and tags that control how they function in the player's inventory and on their character.
                </p>

                <h3 className="docs-h3">Use Event (Storylet)</h3>
                <p className="docs-p">
                    Linking an item to a Storylet ID in this field adds a "Use" button. Clicking it immediately redirects the player to that Storylet, consuming an action. This is perfect for consumables, books, or opening loot boxes.
                </p>

                <h3 className="docs-h3">Bonus (Equipable)</h3>
                <p className="docs-p">
                    The <code>Bonus</code> field on an Equipable quality grants a passive buff while worn. You can use ScribeScript to make the bonus conditional.
                </p>
                <div className="docs-pre">
                    <span style={{color:'#777'}}>// A simple bonus:</span>
                    <br/>
                    <code className="docs-code">$strength + 5</code>
                    <br/><br/>
                    <span style={{color:'#777'}}>// A bonus with a drawback, conditional on another skill:</span>
                    <br/>
                    <code className="docs-code">{`{ $heavy_armor_training >= 1 : $defense + 10 | $defense + 10, $agility - 5 }`}</code>
                </div>

                <h3 className="docs-h3">Behavior Tags</h3>
                <table className="docs-table">
                    <thead><tr><th>Tag</th><th>Behavior</th></tr></thead>
                    <tbody>
                        <tr>
                            <td><strong>auto_equip</strong></td>
                            <td>(Polite) Automatically equips the item upon acquisition, but <strong>only</strong> if the relevant slot is currently empty. It will not replace an existing item.</td>
                        </tr>
                        <tr>
                            <td><strong>force_equip</strong></td>
                            <td>(Rude) Automatically equips the item, <strong>replacing</strong> whatever the player was wearing. Useful for cursed items or mandatory quest gear.</td>
                        </tr>
                        <tr>
                            <td><strong>cursed</strong></td>
                            <td>Prevents the player from unequipping the item via the UI. It must be removed through a story event (e.g., an effect that sets <code>$cursed_sword = 0</code>).</td>
                        </tr>
                    </tbody>
                </table>
            </section>
        </div>
    );
}