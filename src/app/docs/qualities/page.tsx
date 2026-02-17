'use client';

import React from 'react';
import Link from 'next/link';

// Visual component for displaying progress bars in the quality type examples
// Helps illustrate how Pyramidal and Tracker qualities appear in-game
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
                    <div className="docs-card" style={{borderColor: 'var(--docs-accent-blue)'}}>
                        <h4 className="docs-h4" style={{color: 'var(--docs-accent-blue)'}}>Pyramidal (P)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            An exponential stat that gets harder to level up over time. Uses <strong>Change Points (CP)</strong>. Perfect for core character attributes and skills.
                        </p>
                        <ProgressBar percent={33} color="var(--docs-accent-blue)" />
                    </div>
                    <div className="docs-card" style={{borderColor: 'var(--docs-accent-gold)'}}>
                        <h4 className="docs-h4" style={{color: 'var(--docs-accent-gold)'}}>Counter (C)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            A simple, linear number. <code>+1</code> always adds exactly 1 level. Used for currency, quest progress, and simple counters.
                        </p>
                    </div>
                     <div className="docs-card" style={{borderColor: 'var(--docs-accent-gold)'}}>
                        <h4 className="docs-h4" style={{color: 'var(--docs-accent-gold)'}}>Tracker (T)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                           Functionally identical to a Counter, but designed for UI elements that show progress towards a goal (e.g., a progress bar that fills up).
                        </p>
                        <ProgressBar percent={75} color="var(--docs-accent-gold)" />
                    </div>
                    <div className="docs-card" style={{borderColor: 'var(--docs-accent-green)'}}>
                        <h4 className="docs-h4" style={{color: 'var(--docs-accent-green)'}}>Item (I)</h4>
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
                    <span style={{color:'var(--text-muted)'}}>// In the 'Name' field of a 'Suspicion' quality:</span>
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
                        <span>These fields power the <code>.singular</code> and <code>.plural</code> properties, allowing ScribeScript to choose the correct grammar. You can also chain the <code>.capital</code> modifier to capitalize the first letter.</span>
                        <div className="docs-code" style={{marginTop:'5px', fontSize:'0.8rem'}}>
                            <strong>Editor:</strong> Singular="Coin", Plural="Coins"<br/>
                            <strong>ScribeScript:</strong> You find {`{$coin_pouch}`} {`{$coin_pouch.plural}`}.<br/>
                            <strong>With Capitalization:</strong> {`{$coin_pouch.plural.capital}`} are valuable. → "Coins are valuable."
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
                    <span style={{color:'var(--text-muted)'}}>// In a 'pronouns' quality with Text Variants:</span>
                    <br/>
                    <span style={{color:'var(--text-muted)'}}>key: "subject", value: "{`{ $.stringValue == 'he/him' : 'he' | 'they' }`}"</span>
                    <br/>
                    <span style={{color:'var(--text-muted)'}}>key: "object", value: "{`{ $.stringValue == 'he/him' : 'him' | 'them' }`}"</span>
                    <br/><br/>
                    <span style={{color:'var(--text-muted)'}}>// Then, in your story text:</span>
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
                    The <code>Bonus</code> field on an Equipable quality grants a passive buff while worn. It supports full ScribeScript syntax for complex, conditional bonuses.
                </p>
                <div className="docs-pre">
                    <span style={{color:'var(--text-muted)'}}>// Simple bonuses:</span>
                    <br/>
                    <code className="docs-code">$strength + 5</code>
                    <br/><br/>
                    <span style={{color:'var(--text-muted)'}}>// Multiple bonuses:</span>
                    <br/>
                    <code className="docs-code">$strength + 3, $defense + 2</code>
                    <br/><br/>
                    <span style={{color:'var(--text-muted)'}}>// Complex ScribeScript expressions:</span>
                    <br/>
                    <code className="docs-code">{`$strength + { $level * 2 }`}</code>
                    <br/><br/>
                    <span style={{color:'var(--text-muted)'}}>// Conditional bonuses:</span>
                    <br/>
                    <code className="docs-code">{`{ $has_training : $defense + 10 | $defense + 5 }, $agility - 2`}</code>
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
                            <td><strong>bound</strong></td>
                            <td>Prevents the player from unequipping the item via the UI. It must be removed through a story event (e.g., an effect that sets <code>$cursed_sword = 0</code>).</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            {/* SECTION 6: PRACTICAL EXAMPLES */}
            <section id="examples">
                <h2 className="docs-h2">6. Practical Examples</h2>
                <p className="docs-p">
                    Complete examples showing how to use each quality type for common game mechanics.
                </p>

                <div className="docs-card" style={{borderColor: 'var(--docs-accent-green)', marginTop: '2rem'}}>
                    <h3 className="docs-h3" style={{marginTop: 0, color: 'var(--docs-accent-green)'}}>Example 1: Currency (Counter)</h3>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        <strong>Goal:</strong> Create a basic currency system with gold coins.
                    </p>

                    <h4 className="docs-h4">Quality Setup</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>ID:</strong> <code>gold</code></li>
                        <li><strong>Name:</strong> Gold</li>
                        <li><strong>Type:</strong> Counter (C)</li>
                        <li><strong>Description:</strong> "Shining coins that make the world go round"</li>
                        <li><strong>Singular Name:</strong> "Gold Coin"</li>
                        <li><strong>Plural Name:</strong> "Gold Coins"</li>
                        <li><strong>Category:</strong> Currency</li>
                    </ul>

                    <h4 className="docs-h4">Usage in ScribeScript</h4>
                    <div className="docs-pre">
                        <span style={{color:'var(--text-muted)'}}>// Award gold for completing a quest:</span>
                        <br/>
                        <code className="docs-code">$gold += 50</code>
                        <br/><br/>
                        <span style={{color:'var(--text-muted)'}}>// Purchase check:</span>
                        <br/>
                        <code className="docs-code">unlock_if: $gold &gt;= 100</code>
                        <br/><br/>
                        <span style={{color:'var(--text-muted)'}}>// Display with proper grammar:</span>
                        <br/>
                        <code className="docs-code">{`You have {$gold} {$gold.plural}.`}</code>
                        <br/>
                        <small style={{color: 'var(--text-muted)'}}>→ "You have 1 Gold Coin" or "You have 50 Gold Coins"</small>
                    </div>

                    <div className="docs-callout" style={{marginTop: '1rem'}}>
                        <strong>Why Counter:</strong> Counters provide direct 1:1 math. Adding 10 gives you exactly 10. Perfect for resources where "1 level = 1 item."
                    </div>
                </div>

                <div className="docs-card" style={{borderColor: 'var(--docs-accent-blue)', marginTop: '2rem'}}>
                    <h3 className="docs-h3" style={{marginTop: 0, color: 'var(--docs-accent-blue)'}}>Example 2: A Skill (Pyramidal)</h3>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        <strong>Goal:</strong> Create a Swordfighting skill that gets progressively harder to level.
                    </p>

                    <h4 className="docs-h4">Quality Setup</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>ID:</strong> <code>swordfighting</code></li>
                        <li><strong>Name:</strong> Swordfighting</li>
                        <li><strong>Type:</strong> Pyramidal (P)</li>
                        <li><strong>Description:</strong> "Your prowess with a blade"</li>
                        <li><strong>Category:</strong> Combat Skills</li>
                        <li><strong>Max:</strong> 20 (optional cap)</li>
                        <li><strong>CP Cap:</strong> 10 (flattens curve at high levels)</li>
                    </ul>

                    <h4 className="docs-h4">Progression Example</h4>
                    <table className="docs-table" style={{fontSize: '0.85rem', marginTop: '1rem'}}>
                        <thead><tr><th>Starting Level</th><th>CP Gained</th><th>Result</th></tr></thead>
                        <tbody>
                            <tr>
                                <td>Level 0 (0 CP)</td>
                                <td>+1 CP</td>
                                <td>→ Level 1 (Requires 1 CP)</td>
                            </tr>
                            <tr>
                                <td>Level 2 (0 CP)</td>
                                <td>+2 CP</td>
                                <td>→ Level 3 (Requires 3 CP)</td>
                            </tr>
                            <tr>
                                <td>Level 5 (3 CP)</td>
                                <td>+2 CP</td>
                                <td>→ Level 5 (5 CP) - Not enough!</td>
                            </tr>
                            <tr>
                                <td>Level 5 (5 CP)</td>
                                <td>+1 CP</td>
                                <td>→ Level 6 (Requires 6 CP)</td>
                            </tr>
                        </tbody>
                    </table>

                    <h4 className="docs-h4">Usage in Game</h4>
                    <div className="docs-pre">
                        <span style={{color:'var(--text-muted)'}}>// Award CP for training:</span>
                        <br/>
                        <code className="docs-code">$swordfighting += 2</code>
                        <br/><br/>
                        <span style={{color:'var(--text-muted)'}}>// Use in skill check:</span>
                        <br/>
                        <code className="docs-code">{`challenge: { $swordfighting >> 50 }`}</code>
                        <br/><br/>
                        <span style={{color:'var(--text-muted)'}}>// Force a specific level (quest reward):</span>
                        <br/>
                        <code className="docs-code">$swordfighting = 10</code>
                    </div>

                    <div className="docs-callout" style={{marginTop: '1rem'}}>
                        <strong>Why Pyramidal:</strong> Skills should feel meaningful to level up. The pyramid formula prevents players from grinding from 0 to max in an afternoon, while the CP Cap keeps high-level progression from becoming glacial.
                    </div>
                </div>

                <div className="docs-card" style={{borderColor: 'var(--docs-accent-gold)', marginTop: '2rem'}}>
                    <h3 className="docs-h3" style={{marginTop: 0, color: 'var(--docs-accent-gold)'}}>Example 3: Unique Items with Memory (Item)</h3>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        <strong>Goal:</strong> Create a sword that remembers where the player found it.
                    </p>

                    <h4 className="docs-h4">Quality Setup</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>ID:</strong> <code>ancestral_blade</code></li>
                        <li><strong>Name:</strong> Ancestral Blade</li>
                        <li><strong>Type:</strong> Item (I)</li>
                        <li><strong>Description:</strong> "A sword with a storied past"</li>
                        <li><strong>Category:</strong> Weapons</li>
                        <li><strong>Singular/Plural:</strong> "Ancestral Blade" / "Ancestral Blades"</li>
                    </ul>

                    <h4 className="docs-h4">Granting with Source Metadata</h4>
                    <div className="docs-pre">
                        <span style={{color:'var(--text-muted)'}}>// In a dungeon:</span>
                        <br/>
                        <code className="docs-code">
                            $ancestral_blade[source: pulled it from a stone in the ancient tomb] = 1
                        </code>
                        <br/><br/>
                        <span style={{color:'var(--text-muted)'}}>// In a shop:</span>
                        <br/>
                        <code className="docs-code">
                            $ancestral_blade[source: purchased it from a mysterious merchant] = 1
                        </code>
                    </div>

                    <h4 className="docs-h4">Recalling the Memory Later</h4>
                    <div className="docs-pre">
                        <span style={{color:'var(--text-muted)'}}>// In story text:</span>
                        <br/>
                        <code className="docs-code">
                            {`You examine the blade. You remember that you {$ancestral_blade.source}.`}
                        </code>
                        <br/><br/>
                        <small style={{color: 'var(--text-muted)'}}>
                            → If from dungeon: "You remember that you pulled it from a stone in the ancient tomb."
                            <br/>
                            → If from shop: "You remember that you purchased it from a mysterious merchant."
                        </small>
                    </div>

                    <div className="docs-callout" style={{marginTop: '1rem'}}>
                        <strong>Why Items Track Source:</strong> This creates emergent storytelling. The same item can have different significance based on how the player acquired it, making their journey feel unique.
                    </div>
                </div>

                <div className="docs-card" style={{borderColor: '#c678dd', marginTop: '2rem'}}>
                    <h3 className="docs-h3" style={{marginTop: 0, color: '#c678dd'}}>Example 4: Character Attributes (String + Text Variants)</h3>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        <strong>Goal:</strong> Let players choose pronouns and have them used correctly throughout the game.
                    </p>

                    <h4 className="docs-h4">Quality Setup</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>ID:</strong> <code>pronouns</code></li>
                        <li><strong>Name:</strong> Pronouns</li>
                        <li><strong>Type:</strong> String (S)</li>
                        <li><strong>Description:</strong> "How others refer to you"</li>
                        <li><strong>Category:</strong> Character</li>
                    </ul>

                    <h4 className="docs-h4">Text Variants Configuration</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        Add these key-value pairs in the Text Variants section:
                    </p>
                    <table className="docs-table" style={{fontSize: '0.85rem', marginTop: '0.5rem'}}>
                        <thead><tr><th>Key</th><th>Value (ScribeScript)</th></tr></thead>
                        <tbody>
                            <tr>
                                <td><code>subject</code></td>
                                <td><code>{`{ $.stringValue == 'he/him' : 'he' | $.stringValue == 'she/her' : 'she' | 'they' }`}</code></td>
                            </tr>
                            <tr>
                                <td><code>object</code></td>
                                <td><code>{`{ $.stringValue == 'he/him' : 'him' | $.stringValue == 'she/her' : 'her' | 'them' }`}</code></td>
                            </tr>
                            <tr>
                                <td><code>possessive</code></td>
                                <td><code>{`{ $.stringValue == 'he/him' : 'his' | $.stringValue == 'she/her' : 'her' | 'their' }`}</code></td>
                            </tr>
                        </tbody>
                    </table>

                    <h4 className="docs-h4">Character Creation</h4>
                    <div className="docs-pre">
                        <span style={{color:'var(--text-muted)'}}>// In Admin → Character Initialization:</span>
                        <br/>
                        <code className="docs-code">
                            Type: label_select
                            <br/>
                            Rule: $pronouns = @input
                            <br/>
                            Options: "he/him", "she/her", "they/them"
                        </code>
                    </div>

                    <h4 className="docs-h4">Usage in Story</h4>
                    <div className="docs-pre">
                        <span style={{color:'var(--text-muted)'}}>// Adaptive text:</span>
                        <br/>
                        <code className="docs-code">
                            {`You see the guard. {$pronouns.subject.capital} draws {$pronouns.possessive} sword.`}
                        </code>
                        <br/><br/>
                        <small style={{color: 'var(--text-muted)'}}>
                            → he/him: "He draws his sword."
                            <br/>
                            → she/her: "She draws her sword."
                            <br/>
                            → they/them: "They draw their sword."
                        </small>
                    </div>

                    <div className="docs-callout" style={{marginTop: '1rem'}}>
                        <strong>Why Text Variants:</strong> Instead of writing conditional text everywhere, you define the logic once. Then you can use <code>{`{$pronouns.subject}`}</code> hundreds of times and it always adapts correctly.
                    </div>
                </div>

                <div className="docs-card" style={{borderColor: 'var(--danger-color)', marginTop: '2rem'}}>
                    <h3 className="docs-h3" style={{marginTop: 0, color: 'var(--danger-color)'}}>Example 5: Quest-Critical Equipable with Advanced Bonus</h3>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        <strong>Goal:</strong> Create magic armor that grants different bonuses based on whether you're trained to use it.
                    </p>

                    <h4 className="docs-h4">Quality Setup</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>ID:</strong> <code>dragon_plate</code></li>
                        <li><strong>Name:</strong> Dragon Plate Armor</li>
                        <li><strong>Type:</strong> Equipable (E)</li>
                        <li><strong>Description:</strong> "Forged from dragon scales, it requires great strength to wear properly"</li>
                        <li><strong>Category:</strong> Armor</li>
                        <li><strong>Equipment Slot:</strong> body</li>
                        <li><strong>Bonus:</strong> <code>{`{ $heavy_armor_training >= 1 : $defense + 15, $is_wearing_dragon_armor + 1 | $defense + 8, $agility - 3, $is_wearing_dragon_armor + 1 }`}</code></li>
                        <li><strong>Tags:</strong> <code>bound</code> (can only be removed via story event)</li>
                    </ul>

                    <h4 className="docs-h4">How the Bonus Works</h4>
                    <div className="docs-pre" style={{fontSize: '0.85rem'}}>
                        <strong>If trained ($heavy_armor_training &gt;= 1):</strong>
                        <br/>
                        • +15 Defense
                        <br/>
                        • +1 to hidden state ($is_wearing_dragon_armor)
                        <br/><br/>
                        <strong>If untrained:</strong>
                        <br/>
                        • +8 Defense (still useful)
                        <br/>
                        • -3 Agility (penalty for wearing it wrong)
                        <br/>
                        • +1 to hidden state ($is_wearing_dragon_armor)
                    </div>

                    <h4 className="docs-h4">Setup: Hidden State Quality</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        Create a quality <code>$is_wearing_dragon_armor</code> (Counter, Category: Hidden States).
                        <br/>
                        Set <code>hideAsBonus: true</code> in the quality's properties.
                    </p>

                    <h4 className="docs-h4">Using the Hidden State</h4>
                    <div className="docs-pre">
                        <span style={{color:'var(--text-muted)'}}>// Special storylet only appears while wearing the armor:</span>
                        <br/>
                        <code className="docs-code">
                            visible_if: $is_wearing_dragon_armor &gt;= 1
                        </code>
                        <br/><br/>
                        <span style={{color:'var(--text-muted)'}}>// NPC reacts to your armor:</span>
                        <br/>
                        <code className="docs-code">
                            {`{ $is_wearing_dragon_armor >= 1 : "The wizard's eyes widen. 'Dragon armor! Where did you get that?'" | }`}
                        </code>
                    </div>

                    <div className="docs-callout" style={{marginTop: '1rem'}}>
                        <strong>Why This Pattern:</strong>
                        <br/>• Full ScribeScript support allows conditional bonuses based on player skills
                        <br/>• Hidden bonus qualities (<code>hideAsBonus: true</code>) let you track "wearing X" without cluttering the character sheet
                        <br/>• The <code>bound</code> tag prevents removing quest-critical items accidentally
                    </div>
                </div>

                <div className="docs-callout" style={{marginTop: '3rem', borderColor: 'var(--docs-accent-green)'}}>
                    <strong style={{color: 'var(--docs-accent-green)'}}>Want More Examples?</strong>
                    <p className="docs-p" style={{marginBottom: 0, marginTop: '0.5rem'}}>
                        Study real implementations in the open-source example games:
                        <br/>• <a href="/create/mystery_at_the_manor/settings" className="docs-link" target="_blank">Mystery at the Manor</a> - Basic quality usage
                        <br/>• <a href="/create/cloak_of_darkness/settings" className="docs-link" target="_blank">Cloak of Darkness</a> - Tracker-based progression
                        <br/>• <a href="/create/concrete_requiem/settings" className="docs-link" target="_blank">Concrete Requiem</a> - Advanced patterns with bitwise flags and dynamic quality creation
                    </p>
                </div>
            </section>
        </div>
    );
}