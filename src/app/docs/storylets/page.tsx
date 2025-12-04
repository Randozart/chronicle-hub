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
                <h2 className="docs-h2">1. The Atomic Unit</h2>
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
                    <div className="docs-card" style={{borderColor: '#61afef'}}>
                        <h4 className="docs-h4" style={{color:'#61afef'}}>Storylet (Fixed)</h4>
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
                    <div className="docs-card" style={{borderColor: '#f1c40f'}}>
                        <h4 className="docs-h4" style={{color:'#f1c40f'}}>Opportunity (Card)</h4>
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

            {/* SECTION 3: DECK MECHANICS */}
            <section id="deck">
                <h2 className="docs-h2">3. Opportunity Mechanics</h2>
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
                            <td><strong style={{color: '#e06c75'}}>Always</strong></td>
                            <td>∞</td>
                            <td>
                                <strong>Infinite Weight.</strong> If an "Always" card meets its requirements, 
                                it is drawn immediately, bypassing the lottery. 
                                Use for urgent plot developments in a deck.
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
                <h2 className="docs-h2">4. Behavior Tags</h2>
                <p className="docs-p">
                    Special checkboxes that alter the flow of the game.
                </p>

                <div className="docs-grid">
                    <div className="docs-card">
                        <h4 className="docs-h4">Instant Redirect</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Option Tag.</strong> Skips the "Result" screen.
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            When clicked, the player is immediately moved to the target Storylet. Essential for "Visual Novel" style flows where you don't want a "Continue" button after every sentence.
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">No Return</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Option Tag.</strong> Hides the "Go Back" button on the result.
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Forces the player to move forward. Use this when entering a new area or a trap, or if you want to link several Storylets together in a continuous narrative flow.
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">Dangerous</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Option Tag.</strong> Adds a red border.
                        </p>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            Purely visual warning to the player that this option has negative consequences.
                        </p>
                    </div>
                </div>
            </section>

            {/* SECTION 5: AUTOFIRE */}
            <section id="autofire">
                <h2 className="docs-h2">5. Autofire (Must-Event)</h2>
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
            </section>
        </div>
    );
}