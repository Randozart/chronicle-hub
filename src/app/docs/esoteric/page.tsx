'use client';

export default function EsotericPatternsPage() {
    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">System Hacking</h1>
                <p className="docs-lead">
                    Bending the rules. How to use the Settings to create Survival Games, Idle Sims, and Daily Loops.
                </p>
            </header>

            <section>
                <h2 className="docs-h2">1. The "Survival" Config</h2>
                <p className="docs-p">
                    In standard games, Actions are abstract points. In a Survival game, <strong>Actions are Health</strong>. 
                    If you run out of energy, you pass out.
                </p>
                
                <div className="docs-grid">
                    <div className="docs-card">
                        <h4>Configuration</h4>
                        <ul className="docs-props-list">
                            <li><strong>Action ID:</strong> <code>$stamina</code></li>
                            <li><strong>Max Actions:</strong> <code>{`{ 10 + $endurance }`}</code> <br/><small>(Cap grows with stats)</small></li>
                            <li><strong>Regen Amount:</strong> <code>0</code> <br/><small>(Stamina does not regen automatically)</small></li>
                        </ul>
                    </div>
                    <div className="docs-card">
                        <h4>The Mechanic</h4>
                        <p className="docs-p">
                            Since Regen is 0, the player never recovers stamina by waiting. They must <strong>Eat</strong> or <strong>Sleep</strong>.
                        </p>
                        <p className="docs-p">
                            <strong>Storylet: "Eat Rations"</strong><br/>
                            Effect: <code>$stamina += 5, $rations -= 1</code>
                        </p>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="docs-h2">2. The "Daily Loop" (CyberpunkDreams Style)</h2>
                <p className="docs-p">
                    Instead of waiting 10 minutes for 1 point, the player gets a massive pool of actions that only refreshes once every real-time day. 
                    This encourages short, intense play sessions.
                </p>

                <div className="docs-syntax-box" style={{textAlign: 'left'}}>
                    <strong>Settings &gt; Game Rules</strong><br/>
                    • Regen Time: <code>1440</code> <small>(24 Hours in minutes)</small><br/>
                    • Regen Amount: <code>100</code> <small>(Full refill)</small><br/>
                    • Max Actions: <code>100</code>
                </div>
                <p className="docs-p">
                    <strong>Variant: The Coffee Break</strong><br/>
                    Create a consumable item "Thermos" that gives <code>$actions += 10</code> allowing players to "break" the daily limit if they prepared in advance.
                </p>
            </section>

            <section>
                <h2 className="docs-h2">3. The "Idle Game" (Time Tycoon)</h2>
                <p className="docs-p">
                    Remove the concept of "Actions" entirely. The game is played by setting tasks and waiting for them to finish.
                </p>

                <div className="docs-card" style={{borderColor: '#f1c40f'}}>
    <h3>Setup</h3>
    <ul className="docs-props-list">
        <li><strong>Settings:</strong> Disable Action Economy.</li>
        <li><strong>Mechanic:</strong> Every major action uses <strong>Living Stories (Timers)</strong>.</li>
    </ul>
    <hr style={{borderColor: '#444', margin: '1rem 0'}}/>
    <h3>Example Loop</h3>
    <ol className="docs-list">
        <li>
            <strong>Option:</strong> "Send Scavengers"<br/>
            Effect: <code>{`{%schedule[$scavengers_return = 1 : 4h]}`}</code>
        </li>
        <li>
            The player leaves the site. 4 hours later, the server updates the state.
        </li>
        <li>
            <strong>Storylet:</strong> "Scavengers Return"<br/>
            Requirement: <code>visible_if: $scavengers_return == 1</code><br/>
            Effect: <code>$scavengers_return = 0, $scrap += 50</code>
        </li>
    </ol>
</div>
            </section>

            <section>
                <h2 className="docs-h2">4. Dynamic Deck Limits (Sanity Mechanics)</h2>
                <p className="docs-p">
                    You can use logic in the <strong>Deck Settings</strong> to simulate mental states or encumbrance.
                </p>

                <div className="docs-grid">
                    <div className="docs-card">
                        <h4>The "Panic" Hand</h4>
                        <p>
                            As the player goes insane, they can think of fewer options.
                        </p>
                        <code className="docs-code">Hand Size: {`{ 5 - $insanity }`}</code>
                        <p className="docs-p" style={{marginTop: '1rem'}}>
                            At 0 Insanity, you hold 5 cards.<br/>
                            At 5 Insanity, you hold 0 cards (Soft Lock / Panic State).
                        </p>
                    </div>
                    <div className="docs-card">
                        <h4>The "Adrenaline" Deck</h4>
                        <p>
                            Normally, cards draw every 10 minutes. But in a <strong>Combat Deck</strong>, you want them fast.
                        </p>
                        <code className="docs-code">Deck Timer: 1</code>
                        <p className="docs-p" style={{marginTop: '1rem'}}>
                            This overrides the global settings. In this specific location, new options appear every minute.
                        </p>
                    </div>
                </div>
            </section>

             <section>
    <h2 className="docs-h2">5. The "Premium" Draw</h2>
    <p className="docs-p">
        Instead of Actions limiting play, you can make <strong>Resources</strong> the primary constraint. 
        Walking around is free, but drawing Opportunity Cards costs a specific quality.
    </p>
    <div className="docs-callout">
        <strong style={{color: '#fff'}}>How to set it up:</strong>
        <p className="docs-p" style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0'}}>
            In the <strong>Settings</strong> page, find the <strong>Default Draw Cost</strong> field. Instead of a number like <code>1</code>, enter a full ScribeScript effect string.
        </p>
        <div className="docs-pre" style={{marginTop:'0.5rem'}}>
            <code className="docs-code">$gold -= 5</code>
        </div>
        <p className="docs-p" style={{fontSize: '0.9rem', margin: '0.5rem 0 0 0'}}>
            <strong>Result:</strong> The "Draw" button now deducts 5 Gold instead of 1 Action. This turns the deck into a "Gacha" mechanic or a "Paid Information Broker," where the player must grind basic storylets for currency to access rare card rewards.
        </p>
    </div>
</section>

            <section>
                <h2 className="docs-h2">6. Esoteric Markets (Metaphysical Trade)</h2>
                <p className="docs-p">
                    If you enable <strong>"Allow Esoteric Trades"</strong> in the Market Editor, you can trade things other than Items. 
                    This turns the Shop Interface into a powerful engine for character progression and choices.
                </p>

                <div className="docs-grid">
                    <div className="docs-card" style={{borderColor: '#2ecc71'}}>
                        <h4>The Gym (Buying Stats)</h4>
                        <p>
                            Instead of leveling up automatically, the player must visit a trainer and spend XP to increase a Pyramidal Stat.
                        </p>
                        <ul className="docs-props-list">
                            <li><strong>Mode:</strong> Player Buys</li>
                            <li><strong>Item:</strong> <code>$strength</code> (Pyramidal)</li>
                            <li><strong>Currency:</strong> <code>$experience_points</code></li>
                            <li><strong>Price Logic:</strong> <code>{`{ ($strength + 1) * 100 }`}</code></li>
                        </ul>
                        <p className="docs-p" style={{fontSize: '0.9rem', marginTop: '1rem'}}>
                            <strong>Result:</strong> The price scales dynamically. Buying Strength level 5 costs 500 XP. Level 6 costs 600 XP. 
                            The "Buy 1" button effectively becomes a "Level Up" button.
                        </p>
                    </div>

                    <div className="docs-card" style={{borderColor: '#e74c3c'}}>
                        <h4>The Soul Trader (Selling Yourself)</h4>
                        <p>
                            A dark market where you sell parts of your humanity for gold.
                        </p>
                        <ul className="docs-props-list">
                            <li><strong>Mode:</strong> Player Sells</li>
                            <li><strong>Item:</strong> <code>$humanity</code> (Pyramidal)</li>
                            <li><strong>Currency:</strong> <code>$gold</code></li>
                            <li><strong>Price:</strong> <code>500</code></li>
                        </ul>
                        <p className="docs-p" style={{fontSize: '0.9rem', marginTop: '1rem'}}>
                            <strong>Result:</strong> The player lowers their Humanity stat by 1 and gains 500 Gold. 
                            (Note: Ensure the stat doesn't drop below 0 by using `unlock_if: $humanity &gt; 0` on the listing).
                        </p>
                    </div>

                    <div className="docs-card" style={{borderColor: '#9b59b6'}}>
                        <h4>The Diplomat (Faction Exchange)</h4>
                        <p>
                            Convert influence from one group to another.
                        </p>
                        <ul className="docs-props-list">
                            <li><strong>Mode:</strong> Player Sells</li>
                            <li><strong>Item:</strong> <code>$favours_hell</code></li>
                            <li><strong>Currency Override:</strong> <code>$favours_church</code></li>
                            <li><strong>Price:</strong> <code>1</code></li>
                        </ul>
                        <p className="docs-p" style={{fontSize: '0.9rem', marginTop: '1rem'}}>
                            <strong>Result:</strong> You lose 1 Hell Favour and gain 1 Church Favour. 
                            This creates a zero-sum reputation system.
                        </p>
                    </div>

                    <div className="docs-card" style={{borderColor: '#f1c40f'}}>
                        <h4>The Heist Planner (Buying Intel)</h4>
                        <p>
                            "Buy" knowledge or unlock routes using money.
                        </p>
                        <ul className="docs-props-list">
                            <li><strong>Mode:</strong> Player Buys</li>
                            <li><strong>Item:</strong> <code>$route_to_vault</code> (Tracker/String)</li>
                            <li><strong>Currency:</strong> <code>$secrets</code></li>
                            <li><strong>Price:</strong> <code>50</code></li>
                            <li><strong>Unlock Condition:</strong> <code>$route_to_vault == 0</code></li>
                        </ul>
                        <p className="docs-p" style={{fontSize: '0.9rem', marginTop: '1rem'}}>
                            <strong>Result:</strong> The player spends 50 Secrets to set the Route quality to 1 (unlocking a new location). 
                            The condition ensures they can only buy it once.
                        </p>
                    </div>
                </div>
            </section>

            <style jsx>{`
                .docs-content { max-width: 900px; margin: 0 auto; color: #ccc; line-height: 1.7; }
                .docs-h1 { font-size: 3rem; color: #fff; margin-bottom: 0.5rem; line-height: 1.1; margin-top: 0; }
                .lead { font-size: 1.3rem; color: #777; margin-bottom: 2rem; font-weight: 300; }
                .docs-divider { border: 0; border-bottom: 1px solid #333; margin: 4rem 0; }
                .docs-h2 { color: #61afef; font-size: 2.2rem; margin-top: 4rem; margin-bottom: 1.5rem; border-bottom: 1px solid #2c313a; padding-bottom: 0.5rem; scroll-margin-top: 2rem; }
                .docs-p { margin-bottom: 1rem; color: #c8ccd4; }
                .docs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
                .docs-card { background: #21252b; padding: 1.5rem; border-radius: 8px; border: 1px solid #333; }
                .docs-card h4 { color: #e5c07b; margin-top: 0; text-transform: uppercase; font-size: 0.9rem; letter-spacing: 1px; }
                .docs-props-list { list-style: none; padding: 0; }
                .docs-props-list li { margin-bottom: 1rem; background: #181a1f; padding: 0.5rem 1rem; border-radius: 4px; border-left: 3px solid #61afef; }
                .docs-code { font-family: 'Consolas', monospace; color: #98c379; background: rgba(0,0,0,0.3); padding: 2px 6px; borderRadius: 4px; }
                .docs-syntax-box { background: #1e2127; border: 1px dashed #5c6370; padding: 1.5rem; margin: 2rem 0; border-radius: 8px; font-family: monospace; color: #abb2bf; }
            `}</style>
        </div>
    );
}