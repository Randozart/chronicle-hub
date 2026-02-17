'use client';

import React from 'react';

export default function StoryletsDocs() {
    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">Storylets & Opportunities</h1>
                <p className="docs-lead">
                    The atoms of your world. Every conversation, shop, battle, or random event is a Storylet.
                </p>
            </header>

            {/* SECTION 1: THE CONCEPT */}
            <section id="concept">
                <h2 className="docs-h2">1. The Narrative Unit</h2>
                <p className="docs-p">
                    In Chronicle, there is no difference between a "Room", a "Conversation", or a "Shop". They are all <strong>Storylets</strong>.
                </p>
                <p className="docs-p">
                    A Storylet is a container that holds:
                </p>
                <ul className="docs-list">
                    <li><strong>Content:</strong> Title, Description, Image.</li>
                    <li><strong>Logic:</strong> Requirements to see it (<code>Visible If</code>) or access it (<code>Unlock If</code>), or in the case of Opportunities,
                    the condition to draw it from the deck (<code>Draw Condition</code>).</li>
                    <li><strong>Choices:</strong> A list of Options the player can click.</li>
                </ul>

                <h3 className="docs-h3">Storylets vs. Opportunities</h3>
                <p className="docs-p">
                    While they share the same structure, they behave differently based on where they live.
                </p>
                <div className="docs-grid">
                    <div className="docs-card" style={{borderColor: 'var(--docs-accent-blue)'}}>
                        <h4 className="docs-h4" style={{color:'var(--docs-accent-blue)'}}>Storylet (Fixed)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Lives in:</strong> A Location.
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Always appears if requirements are met. Like a building you can walk into at any time.
                        </p>
                        <div className="docs-code" style={{marginTop:'10px', fontSize:'0.8rem'}}>
                            Use for: Hubs, Travel, Main Quests.
                        </div>
                    </div>
                    <div className="docs-card" style={{borderColor: 'var(--docs-accent-gold)'}}>
                        <h4 className="docs-h4" style={{color:'var(--docs-accent-gold)'}}>Opportunity (Card)</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Lives in:</strong> A Deck.
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Must be <strong>Drawn</strong> into a Hand. Transient; once played, it is discarded.
                        </p>
                        <div className="docs-code" style={{marginTop:'10px', fontSize:'0.8rem'}}>
                            Use for: Random Encounters, Loot.
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 2: ANATOMY */}
            <section id="anatomy">
                <h2 className="docs-h2">2. Anatomy of an Event</h2>
                <p className="docs-p">
                    When creating content, you will see several text fields. Here is how they map to the player experience.
                </p>

                <div className="docs-card">
                    <h4 className="docs-h4">1. Title</h4>
                    <p className="docs-p">The name of the event. Can be dynamic: <code>{`{ $met_king ? 'The King' : 'A Stranger' }`}</code>.</p>

                    <h4 className="docs-h4">2. Teaser (Short Description)</h4>
                    <p className="docs-p">
                        Displayed on the button <strong>before</strong> the player enters. Use this to hook the player.
                        <br/><em>"A dark alleyway beckons..."</em>
                    </p>

                    <h4 className="docs-h4">3. Main Text (Body)</h4>
                    <p className="docs-p">
                        The full narrative text shown <strong>after</strong> clicking. This is where your writing goes.
                    </p>

                    <h4 className="docs-h4">4. Meta Text (Instructions)</h4>
                    <p className="docs-p">
                        Italicized text at the bottom. Use this for mechanical instructions.
                        <br/><em>"Playing this will consume your streak."</em>
                    </p>
                </div>
            </section>

            <section id="outcomes">
    <h2 className="docs-h2">3. Anatomy of an Option</h2>
    <p className="docs-p">
        While the Storylet is the container, the <strong>Option</strong> is where the action happens. Each option has a set of "Outcome" fields that tell the engine what to do when the player clicks it. If a Challenge is present, there are separate fields for Success (<code>pass_</code>) and Failure (<code>fail_</code>).
    </p>
    <div className="docs-grid">
        <div className="docs-card">
            <h4 className="docs-h4">Quality Changes</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>Fields:</strong> <code>pass_quality_change</code>, <code>fail_quality_change</code>
                <br/>
                This is where you put your ScribeScript effects to modify the player's state.
            </p>
            <div className="docs-code" style={{fontSize:'0.8rem'}}>
                $gold -= 5, $clues++
            </div>
        </div>
        <div className="docs-card">
            <h4 className="docs-h4">Redirect</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>Fields:</strong> <code>pass_redirect</code>, <code>fail_redirect</code>
                <br/>
                Instantly sends the player to another Storylet or Opportunity by its ID. This is the primary way to chain events together in a linear sequence.
            </p>
        </div>
        <div className="docs-card">
            <h4 className="docs-h4">Move To</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>Fields:</strong> <code>pass_move_to</code>, <code>fail_move_to</code>
                <br/>
                Physically moves the player's character to a new <strong>Location ID</strong>. This is how you handle narrative travel, like falling into a trap or arriving at a new city.
            </p>
        </div>
        
    </div>
</section>

            {/* SECTION 3: DECK MECHANICS */}
            <section id="deck">
                <h2 className="docs-h2">4. Opportunity Mechanics</h2>
                <p className="docs-p">
                    Cards have special rules that govern how often they appear.
                </p>

                <h3 className="docs-h3">Frequency (Weight)</h3>
                <p className="docs-p">
                    When the player clicks "Draw", the engine puts all eligible cards in a lottery.
                </p>
                <table className="docs-table">
                    <thead><tr><th>Frequency</th><th>Weight</th><th>Description</th></tr></thead>
                    <tbody>
                        <tr><td><strong>Frequent</strong></td><td>20</td><td>Very common (Common loot, filler).</td></tr>
                        <tr><td><strong>Standard</strong></td><td>10</td><td>The default.</td></tr>
                        <tr><td><strong>Infrequent</strong></td><td>5</td><td>Uncommon events.</td></tr>
                        <tr><td><strong>Rare</strong></td><td>2</td><td>Special rewards.</td></tr>
                        <tr>
                            <td><strong style={{color: 'var(--danger-color)'}}>Always</strong></td>
                            <td>1000</td>
                            <td>
                                <strong>Near-Guaranteed Draw.</strong> If an "Always" card meets its requirements,
                                it receives a weight of 1000, giving it overwhelming advantage in the lottery.
                                In practice, this means it will almost always be drawn immediately. If multiple "Always"
                                cards meet requirements simultaneously, one is randomly selected from among them.
                                Use for urgent plot developments.
                            </td>
                        </tr>
                    </tbody>
                </table>

                <h3 className="docs-h3">Card Lifecycle</h3>
                <ul className="docs-list">
                    <li className="docs-li">
                        <strong>Can Discard:</strong> If unchecked, the card is "Sticky". The player cannot discard it from their hand without playing it. Good for negative status effects.
                    </li>
                    <li className="docs-li">
                        <strong>Transient (Keep if Invalid):</strong> By default (`false`), if a card in your hand no longer meets its requirements (e.g., you spent the required Gold), it vanishes from your hand instantly. If `true`, it stays.
                    </li>
                </ul>
            </section>

            {/* SECTION 4: BEHAVIOR TAGS */}
            <section id="behavior">
    <h2 className="docs-h2">5. Behavior Tags</h2>
    <p className="docs-p">
        Tags are special keywords you can attach to an Option to change its behavior or appearance. You can set these via checkboxes or the "Raw Tags" field in the Option Editor.
    </p>

    <div className="docs-grid">
        <div className="docs-card">
            <h4 className="docs-h4">Instant Redirect</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>Tag:</strong> <code>instant_redirect</code>
                <br/>
                <strong>Effect:</strong> Skips the "Result" screen entirely.
            </p>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                When the player clicks this option, they are immediately taken to the new storylet or location. This is essential for creating smooth, "Visual Novel" style flows where you don't want a "Continue" button interrupting every line of dialogue.
            </p>
        </div>
        <div className="docs-card">
            <h4 className="docs-h4">No Return</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>Tag:</strong> <code>no_return</code>
                <br/>
                <strong>Effect:</strong> Hides the "Go Back" button on the result screen.
            </p>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                This forces the player to move forward by clicking "Continue". Use this when an action has irreversible consequences, like entering a new area or triggering a trap.
            </p>
        </div>
        <div className="docs-card">
            <h4 className="docs-h4">Dangerous</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>Tag:</strong> <code>dangerous</code>
                <br/>
                <strong>Effect:</strong> Adds a red, warning-colored border to the option.
            </p>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                This is a purely visual cue to the player that the option is risky or may have negative consequences, allowing them to make more informed choices.
            </p>
        </div>
        <div className="docs-card">
            <h4 className="docs-h4">Clear Hand</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>Tag:</strong> <code>clear_hand</code>
                <br/>
                <strong>Effect:</strong> Discards all cards from the player's hand in the current deck.
            </p>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                Unlike a standard card play which only discards itself, this tag wipes the entire hand. This is useful for "milestone" events that should reset the player's available opportunities.
            </p>
        </div>
        <div className="docs-card">
            <h4 className="docs-h4">Difficulty (Checkbox)</h4>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                <strong>Effect:</strong> Enables the <code>Challenge</code> field for this option.
            </p>
            <p className="docs-p" style={{fontSize: '0.9rem'}}>
                Checking this box reveals the "Failure" outcome fields in the editor. The engine will then use the logic in your <code>Challenge</code> field to determine whether the player receives the "Success" or "Failure" outcome.
            </p>
        </div>
        <div className="docs-card">
    <h4 className="docs-h4">Dynamic Tags</h4>
    <p className="docs-p" style={{fontSize: '0.9rem'}}>
        <strong>Field:</strong> <code>dynamic_tags</code>
        <br/>
        <strong>Effect:</strong> Attaches tags to an outcome based on ScribeScript logic.
    </p>
    <p className="docs-p" style={{fontSize: '0.9rem'}}>
        This is an advanced feature for creating emergent behavior. For example, an option's outcome could gain the <code>clear_hand</code> tag, but only if the player's suspicion is high.
    </p>
    <div className="docs-pre" style={{marginTop:'0.5rem'}}>
        <code className="docs-code">{`{ $suspicion > 5 : clear_hand }`}</code>
    </div>
</div>
    </div>
</section>

            {/* SECTION 5: AUTOFIRE */}
            <section id="autofire">
                <h2 className="docs-h2">6. Flow Control</h2>
                <p className="docs-p">
                    You can designate a Storylet as a <strong>Must-Event</strong> by adding an <code>Autofire If</code> condition.
                </p>
                <div className="docs-syntax-box">
                    <code className="docs-code">autofire_if: $suspicion &gt;= 8</code>
                </div>
                <p className="docs-p">
                    <strong>How it works:</strong>
                    <br/>The engine checks Autofire conditions <em>before</em> resolving any player action. 
                    If an Autofire condition is met, the player's action is cancelled, and they are forcibly redirected to this Storylet.
                </p>
                <p className="docs-p">
                    <strong>Use Case:</strong> The player reaches 8 Suspicion. They try to click "Go to Shop", but the engine interrupts them: 
                    <em>"The Constables arrest you!"</em> and moves them to Jail.
                </p>
                <h3 className="docs-h3">The <code>return</code> Field (Custom "Go Back")</h3>
<p className="docs-p">
    By default, the "Go Back" button on a result screen takes the player to their location's main hub. You can override this by specifying a Storylet ID in the <strong>Return Target</strong> field of a Storylet.
</p>
<div className="docs-syntax-box" style={{textAlign:'left'}}>
    <code className="docs-code">return: previous_conversation_hub</code>
</div>
<p className="docs-p">
    <strong>Use Case:</strong> Imagine a complex conversation hub with many sub-options. After exploring a sub-option, you want the "Go Back" button to return the player to the <em>conversation hub</em>, not the main location hub. Setting the <code>return</code> field on the sub-option storylets achieves this, creating a more intuitive nested flow for the player.
</p>
            </section>

            {/* SECTION 6: PRACTICAL EXAMPLES */}
            <section id="examples">
                <h2 className="docs-h2">7. Practical Examples</h2>
                <p className="docs-p">
                    Here are complete, step-by-step examples of common storylet patterns you'll use in your games.
                </p>

                <div className="docs-card" style={{borderColor: 'var(--docs-accent-green)', marginTop: '2rem'}}>
                    <h3 className="docs-h3" style={{marginTop: 0, color: 'var(--docs-accent-green)'}}>Example 1: A Simple Shop</h3>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        <strong>Goal:</strong> Create a merchant who sells healing potions for 10 gold.
                    </p>

                    <h4 className="docs-h4">Step 1: Create the Storylet</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>ID:</strong> <code>merchant_shop</code></li>
                        <li><strong>Title:</strong> The Merchant's Stall</li>
                        <li><strong>Location:</strong> marketplace</li>
                        <li><strong>Teaser:</strong> "A weathered merchant sells remedies and supplies"</li>
                        <li><strong>Body:</strong> "The merchant gestures to their wares. 'Healing potions, 10 gold each. Fresh this morning!'"</li>
                    </ul>

                    <h4 className="docs-h4">Step 2: Add the Purchase Option</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Title:</strong> Buy a healing potion</li>
                        <li><strong>Description:</strong> Costs 10 gold</li>
                        <li><strong>Unlock If:</strong> <code>$gold &gt;= 10</code> (grays out if player can't afford it)</li>
                        <li><strong>Lock Message:</strong> "You don't have enough gold"</li>
                        <li><strong>Success Text:</strong> "You hand over the coins and receive a small vial of red liquid"</li>
                        <li><strong>Pass Quality Change:</strong> <code>$gold -= 10, $healing_potion++</code></li>
                    </ul>

                    <div className="docs-callout" style={{marginTop: '1rem'}}>
                        <strong>Key Concept:</strong> Using <code>unlock_if</code> creates a "soft gate" - the option is visible but locked. This is better UX than hiding it with <code>visible_if</code>, because the player can see what they need.
                    </div>
                </div>

                <div className="docs-card" style={{borderColor: 'var(--docs-accent-blue)', marginTop: '2rem'}}>
                    <h3 className="docs-h3" style={{marginTop: 0, color: 'var(--docs-accent-blue)'}}>Example 2: A Branching Conversation</h3>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        <strong>Goal:</strong> Create a guard who lets you pass if you have a bribe or a high persuasion skill.
                    </p>

                    <h4 className="docs-h4">Step 1: Create the Main Storylet</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>ID:</strong> <code>guard_checkpoint</code></li>
                        <li><strong>Title:</strong> The City Gate</li>
                        <li><strong>Location:</strong> city_entrance</li>
                        <li><strong>Body:</strong> "A stern guard blocks the gate. 'No one enters without proper authorization.'"</li>
                    </ul>

                    <h4 className="docs-h4">Step 2: Add Multiple Approaches</h4>

                    <div className="docs-pre" style={{marginTop: '1rem'}}>
                        <strong style={{color: 'var(--docs-accent-green)'}}>Option 1: Bribe</strong>
                    </div>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Title:</strong> Offer 50 gold</li>
                        <li><strong>Unlock If:</strong> <code>$gold &gt;= 50</code></li>
                        <li><strong>Success Text:</strong> "The guard's eyes light up. They pocket the coins and step aside"</li>
                        <li><strong>Pass Quality Change:</strong> <code>$gold -= 50, $inside_city = 1</code></li>
                        <li><strong>Pass Move To:</strong> <code>city_interior</code></li>
                    </ul>

                    <div className="docs-pre" style={{marginTop: '1rem'}}>
                        <strong style={{color: 'var(--docs-accent-blue)'}}>Option 2: Persuasion Check</strong>
                    </div>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Title:</strong> Talk your way in</li>
                        <li><strong>Challenge:</strong> <code>{`{ $persuasion >> 40 }`}</code></li>
                        <li><strong>Success Text:</strong> "Your smooth words and confident manner convince them you're legitimate. They wave you through"</li>
                        <li><strong>Pass Quality Change:</strong> <code>$inside_city = 1</code></li>
                        <li><strong>Pass Move To:</strong> <code>city_interior</code></li>
                        <li><strong>Failure Text:</strong> "They see through your act. 'Nice try. Now leave.'"</li>
                    </ul>

                    <div className="docs-callout" style={{marginTop: '1rem'}}>
                        <strong>Why This Works:</strong> Offering multiple paths to the same goal (entering the city) creates meaningful player choice. Rich players use gold, charismatic players use persuasion.
                    </div>
                </div>

                <div className="docs-card" style={{borderColor: 'var(--docs-accent-gold)', marginTop: '2rem'}}>
                    <h3 className="docs-h3" style={{marginTop: 0, color: 'var(--docs-accent-gold)'}}>Example 3: A Progressive Quest Chain</h3>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        <strong>Goal:</strong> Create a 3-step quest where each step reveals the next.
                    </p>

                    <h4 className="docs-h4">Setup: Create the Quest Tracker</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        First, create a quality <code>$missing_child_quest</code> (Counter type) to track progress.
                    </p>

                    <h4 className="docs-h4">Step 1: The Request (Quest Start)</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>ID:</strong> <code>quest_start</code></li>
                        <li><strong>Location:</strong> village_square</li>
                        <li><strong>Visible If:</strong> <code>$missing_child_quest == 0</code></li>
                        <li><strong>Body:</strong> "A distraught mother approaches you. 'Please, my child wandered into the forest and hasn't returned!'"</li>
                        <li><strong>Option:</strong> "I'll help you find them"</li>
                        <li><strong>Pass Quality Change:</strong> <code>$missing_child_quest = 1</code></li>
                    </ul>

                    <h4 className="docs-h4">Step 2: The Search</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>ID:</strong> <code>quest_investigate</code></li>
                        <li><strong>Location:</strong> dark_forest</li>
                        <li><strong>Visible If:</strong> <code>$missing_child_quest == 1</code></li>
                        <li><strong>Body:</strong> "You find small footprints leading deeper into the woods"</li>
                        <li><strong>Option:</strong> "Follow the tracks"</li>
                        <li><strong>Pass Quality Change:</strong> <code>$missing_child_quest = 2</code></li>
                        <li><strong>Pass Redirect:</strong> <code>quest_resolution</code></li>
                        <li><strong>Tags:</strong> <code>instant_redirect</code> (for smooth flow)</li>
                    </ul>

                    <h4 className="docs-h4">Step 3: The Resolution</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>ID:</strong> <code>quest_resolution</code></li>
                        <li><strong>Location:</strong> dark_forest</li>
                        <li><strong>Visible If:</strong> <code>$missing_child_quest == 2</code></li>
                        <li><strong>Body:</strong> "You find the child safe in a hollow tree, frightened but unharmed"</li>
                        <li><strong>Option:</strong> "Return them to their mother"</li>
                        <li><strong>Pass Quality Change:</strong> <code>$missing_child_quest = 3, $gold += 20, $reputation++</code></li>
                        <li><strong>Pass Move To:</strong> <code>village_square</code></li>
                    </ul>

                    <div className="docs-callout" style={{marginTop: '1rem'}}>
                        <strong>Pattern:</strong> Each storylet only appears when the tracker equals a specific value. As you increment the tracker, one storylet hides and the next appears. This creates a linear progression without manual linking.
                    </div>
                </div>

                <div className="docs-card" style={{borderColor: 'var(--danger-color)', marginTop: '2rem'}}>
                    <h3 className="docs-h3" style={{marginTop: 0, color: 'var(--danger-color)'}}>Example 4: A Random Encounter (Opportunity Card)</h3>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        <strong>Goal:</strong> Create a random ambush encounter that can appear while traveling.
                    </p>

                    <h4 className="docs-h4">Step 1: Create the Deck</h4>
                    <p className="docs-p" style={{fontSize: '0.9rem'}}>
                        In the Decks tab, create a deck called <code>travel_events</code> with hand size 3.
                    </p>

                    <h4 className="docs-h4">Step 2: Create the Opportunity</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>ID:</strong> <code>bandit_ambush</code></li>
                        <li><strong>Type:</strong> Opportunity (not Storylet)</li>
                        <li><strong>Deck:</strong> travel_events</li>
                        <li><strong>Title:</strong> Ambush!</li>
                        <li><strong>Frequency:</strong> Infrequent (weight 5)</li>
                        <li><strong>Draw Condition:</strong> <code>$in_wilderness == 1</code></li>
                        <li><strong>Can Discard:</strong> Unchecked (sticky - must be dealt with)</li>
                        <li><strong>Body:</strong> "Bandits leap from the bushes! 'Your coin or your life!'"</li>
                    </ul>

                    <h4 className="docs-h4">Step 3: Add Response Options</h4>
                    <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                        <li><strong>Option 1:</strong> "Fight them" (Challenge: <code>{`{ $combat >> 50 }`}</code>)
                            <ul style={{marginTop: '0.5rem'}}>
                                <li>Success: "You drive them off!" → <code>$combat++</code></li>
                                <li>Failure: "They overpower you!" → <code>$gold -= 20, $wounds++</code></li>
                            </ul>
                        </li>
                        <li style={{marginTop: '0.5rem'}}><strong>Option 2:</strong> "Surrender your gold"
                            <ul style={{marginTop: '0.5rem'}}>
                                <li>Unlock If: <code>$gold &gt;= 15</code></li>
                                <li>Effect: <code>$gold -= 15</code></li>
                                <li>Text: "They take your money and disappear into the forest"</li>
                            </ul>
                        </li>
                    </ul>

                    <div className="docs-callout" style={{marginTop: '1rem'}}>
                        <strong>Why Use Opportunities:</strong> Random events create unpredictability. Players draw cards into their hand, and must deal with what fate gives them. The <code>draw_condition</code> ensures this only appears in the wilderness, not in safe cities.
                    </div>
                </div>

                <div className="docs-callout" style={{marginTop: '3rem', borderColor: 'var(--docs-accent-green)'}}>
                    <strong style={{color: 'var(--docs-accent-green)'}}>Learn by Example:</strong>
                    <p className="docs-p" style={{marginBottom: 0, marginTop: '0.5rem'}}>
                        Want to see these patterns in action? Check out the open-source example games:
                        <br/>• <a href="/create/mystery_at_the_manor/settings" className="docs-link" target="_blank">Mystery at the Manor</a> - Simple quest chains and skill checks
                        <br/>• <a href="/create/cloak_of_darkness/settings" className="docs-link" target="_blank">Cloak of Darkness</a> - Location-based progression
                        <br/>• <a href="/create/concrete_requiem/settings" className="docs-link" target="_blank">Concrete Requiem</a> - Complex conditional flows
                    </p>
                </div>
            </section>


        </div>
    );
}