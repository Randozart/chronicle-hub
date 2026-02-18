'use client';

import React from 'react';
import Image from 'next/image'; 

export default function QuickStartPage() {
    return (
        <div className="docs-content">
            <header>
                <h1 className="docs-h1">Quick Start: Your First Game</h1>
                <p className="docs-lead">
                    A hands-on tutorial to build your first QBN game in 30 minutes. You'll create a simple mystery investigation with clues, skill checks, and branching outcomes.
                </p>
            </header>

            <div className="docs-callout" style={{borderColor: 'var(--docs-accent-gold)'}}>
                <strong style={{color: 'var(--docs-accent-gold)'}}>What You'll Build:</strong>
                <p className="docs-p" style={{marginBottom: 0, marginTop: '0.5rem'}}>
                    A detective game where the player investigates a crime scene, gathers clues, interrogates suspects, and solves the mystery.
                    This tutorial covers the essential concepts: creating qualities, writing storylets, using skill checks, and implementing win conditions.
                </p>
            </div>

            <div className="docs-callout" style={{borderColor: 'var(--docs-accent-blue)'}}>
                <strong style={{color: 'var(--docs-accent-blue)'}}>Tip: Follow Along Side-by-Side</strong>
                <p className="docs-p" style={{marginBottom: 0, marginTop: '0.5rem'}}>
                    Open the Chronicle Hub in a separate tab or window so you can follow these instructions while building. On most browsers: right-click the Chronicle logo or dashboard link → <strong>Open in New Tab</strong>.
                </p>
            </div>

            {/* Step 1 - Creating your first project and initial setup */}
            <section id="setup">
                <h2 className="docs-h2">Step 1: Create Your Project</h2>
                <p className="docs-p">
                    From the main dashboard, click <strong>"New Project"</strong> and give it a name (e.g., "Mystery at the Manor").
                </p>

                <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                    <Image 
                        src="/images/docs/create_world.jpeg" 
                        alt="The New Project dialog box"
                        width={800} 
                        height={500}
                        style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '8px',
                            border: '1px solid var(--docs-border-color, #e0e0e0)'
                        }}
                    />
                </div>

                <p className="docs-p" style={{marginTop: '1.5rem'}}>
                    Once created, you'll be taken to the Project Editor. This is your workspace. On the left sidebar, you'll see tabs for:
                </p>
                <ul className="docs-list">
                    <li><strong>Qualities:</strong> Your game's variables (stats, items, counters)</li>
                    <li><strong>Storylets:</strong> The scenes and events in your game</li>
                    <li><strong>Locations:</strong> The places your player can visit</li>
                    <li><strong>Admin:</strong> Global settings and configuration</li>
                </ul>
            </section>

            {/* STEP 2: CREATE QUALITIES */}
            <section id="qualities">
                <h2 className="docs-h2">Step 2: Define Your Qualities</h2>
                <p className="docs-p">
                    Qualities are the foundation of your game's state. Let's create the qualities we'll need for our mystery game.
                </p>

                <h3 className="docs-h3">Create the Investigation Skill</h3>
                <ol className="docs-list">
                    <li>Click the <strong>"Qualities"</strong> tab in the left sidebar</li>
                    <li>Click <strong>"+ New Quality"</strong></li>
                    <li>Fill in the following fields:
                        <ul style={{marginTop: '0.5rem'}}>
                            <li><strong>ID:</strong> <code>investigation</code></li>
                            <li><strong>Name:</strong> Investigation</li>
                            <li><strong>Type:</strong> Pyramidal (P)</li>
                            <li><strong>Description:</strong> "Your skill at finding and analyzing clues."</li>
                            <li><strong>Category:</strong> Create a new category called "Skills"</li>
                        </ul>
                    </li>
                    <li>Click <strong>"Save"</strong></li>
                </ol>

                <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                    <Image 
                        src="/images/docs/add_skill.jpeg" 
                        alt="The Investigation Skill Quality"
                        width={800} 
                        height={500}
                        style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '8px',
                            border: '1px solid var(--docs-border-color, #e0e0e0)'
                        }}
                    />
                </div>

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Create the Clues Counter</h3>
                <p className="docs-p">
                    Repeat the process above to create a counter for tracking clues:
                </p>
                <ul className="docs-list">
                    <li><strong>ID:</strong> <code>clues</code></li>
                    <li><strong>Name:</strong> Clues Discovered</li>
                    <li><strong>Type:</strong> Counter (C)</li>
                    <li><strong>Description:</strong> "Evidence you've gathered about the crime."</li>
                    <li><strong>Category:</strong> Create a new category called "Progress"</li>
                </ul>

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Create the Suspect Quality</h3>
                <p className="docs-p">
                    Finally, create a quality to track which suspect the player accuses:
                </p>
                <ul className="docs-list">
                    <li><strong>ID:</strong> <code>accused_suspect</code></li>
                    <li><strong>Name:</strong> Accused</li>
                    <li><strong>Type:</strong> String (S)</li>
                    <li><strong>Description:</strong> "The person you believe committed the crime."</li>
                    <li><strong>Category:</strong> Progress</li>
                </ul>

                <div className="docs-callout">
                    <strong>Why These Types?</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        <strong>Pyramidal:</strong> Investigation is a skill that should get harder to level up over time, creating meaningful progression.
                        <br/>
                        <strong>Counter:</strong> Clues are a simple accumulating number.
                        <br/>
                        <strong>String:</strong> We'll store the suspect's name as text, not a number.
                    </p>
                </div>
            </section>

            {/* STEP 3: CREATE YOUR FIRST LOCATION */}
            <section id="location">
                <h2 className="docs-h2">Step 3: Create Your First Location</h2>
                <p className="docs-p">
                    Locations are where storylets live. Let's create the crime scene.
                </p>

                <ol className="docs-list">
                    <li>Click the <strong>"Locations"</strong> tab</li>
                    <li>Click <strong>"+ New Location"</strong></li>
                    <li>Fill in:
                        <ul style={{marginTop: '0.5rem'}}>
                            <li><strong>ID:</strong> <code>crime_scene</code></li>
                            <li><strong>Name:</strong> The Crime Scene</li>
                            <li><strong>Description:</strong> "A lavish study where the victim was found. Bookshelves line the walls, and a desk sits in the center."</li>
                        </ul>
                    </li>
                    <li>Click <strong>"Save"</strong></li>
                </ol>

                <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                    <Image 
                        src="/images/docs/create_location.jpeg" 
                        alt="The Intro Location"
                        width={800} 
                        height={500}
                        style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '8px',
                            border: '1px solid var(--docs-border-color, #e0e0e0)'
                        }}
                    />
                </div>
            </section>

            {/* STEP 4: CREATE STORYLETS */}
            <section id="storylets">
                <h2 className="docs-h2">Step 4: Write Your First Storylet</h2>
                <p className="docs-p">
                    Storylets are the narrative building blocks of your game. Let's create the opening scene.
                </p>

                <h3 className="docs-h3">The Introduction</h3>
                <ol className="docs-list">
                    <li>Click the <strong>"Storylets"</strong> tab</li>
                    <li>Click <strong>"+ New Storylet"</strong></li>
                    <li>Fill in the <strong>Basic Info</strong>:
                        <ul style={{marginTop: '0.5rem'}}>
                            <li><strong>ID:</strong> <code>intro</code></li>
                            <li><strong>Title:</strong> "A Call in the Night"</li>
                            <li><strong>Location ID:</strong> Type <code>crime_scene</code> (or click the "🔗 Locations" button to browse and select from available locations)</li>
                        </ul>
                    </li>
                    <li>In the <strong>Teaser</strong> field (the short description shown on the button):
                        <div className="docs-pre" style={{marginTop: '0.5rem'}}>
                            <code className="docs-code">Begin your investigation</code>
                        </div>
                    </li>
                    <li>In the <strong>Body</strong> field (the main narrative text):
                        <div className="docs-pre" style={{marginTop: '0.5rem'}}>
                            <code className="docs-code" style={{whiteSpace: 'pre-wrap'}}>
The phone rings at 3 AM. A body has been discovered at Thornfield Manor.
Lord Ashworth, the estate's owner, was found slumped over his desk, a wine glass shattered on the floor.

You arrive at the scene. The study is eerily quiet. Where do you begin?
                            </code>
                        </div>
                    </li>
                </ol>

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Add Your First Option</h3>
                <p className="docs-p">
                    Now we need to give the player something to do. Scroll down to the <strong>"Options"</strong> section and click <strong>"+ Add Option"</strong>.
                </p>

                <div className="docs-pre">
                    <strong>Option 1: "Search the Desk"</strong>
                </div>

                <p className="docs-p">Fill in the option fields:</p>
                <ul className="docs-list">
                    <li><strong>Title:</strong> Search the desk</li>
                    <li><strong>Description:</strong> Look for clues among the papers and drawers.</li>
                    <li><strong>Success Text:</strong> You find a letter hidden beneath a false bottom in the drawer. It's a threatening note demanding payment. A valuable clue!</li>
                    <li><strong>Pass Quality Change:</strong> <code>$clues += 2, $investigation++</code></li>
                </ul>

                <div className="docs-callout" style={{marginTop: '1.5rem'}}>
                    <strong>Understanding the Effect:</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        <code>$clues += 2</code> adds 2 to your Clues counter (linear, direct addition).
                        <br/>
                        <code>$investigation++</code> adds 1 Change Point to your Investigation skill (pyramidal, gradual leveling).
                    </p>
                </div>

                <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                    <Image 
                        src="/images/docs/add_intro.jpeg" 
                        alt="The New Project dialog box"
                        width={800} 
                        height={500}
                        style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '8px',
                            border: '1px solid var(--docs-border-color, #e0e0e0)'
                        }}
                    />
                </div>

                <p className="docs-p" style={{marginTop: '2rem'}}>
                    Add a second option to give the player a choice:
                </p>

                <div className="docs-pre">
                    <strong>Option 2: "Examine the Wine Glass"</strong>
                </div>

                <ul className="docs-list">
                    <li><strong>Title:</strong> Examine the wine glass</li>
                    <li><strong>Description:</strong> Analyze the shattered glass for traces of poison.</li>
                    <li><strong>Success Text:</strong> You detect a faint almond scent—cyanide. The wine was poisoned. This narrows down the suspects considerably.</li>
                    <li><strong>Pass Quality Change:</strong> <code>$clues += 3, $investigation++</code></li>
                </ul>

                <p className="docs-p">
                    Click <strong>"Save"</strong> to save your storylet.
                </p>
            </section>

            {/* STEP 5: ADD A SKILL CHECK */}
            <section id="challenge">
                <h2 className="docs-h2">Step 5: Add a Skill Check (Challenge)</h2>
                <p className="docs-p">
                    Not all actions should be guaranteed to succeed. Let's create a storylet with a skill check that can fail.
                </p>

                <h3 className="docs-h3">Create the "Interrogate Butler" Storylet</h3>
                <ol className="docs-list">
                    <li>Create a new storylet with ID: <code>interrogate_butler</code></li>
                    <li><strong>Title:</strong> "The Butler's Story"</li>
                    <li><strong>Location:</strong> The Crime Scene</li>
                    <li><strong>Teaser:</strong> "Question the manor's butler"</li>
                    <li><strong>Body:</strong>
                        <div className="docs-pre" style={{marginTop: '0.5rem'}}>
                            <code className="docs-code" style={{whiteSpace: 'pre-wrap'}}>
The butler, Mr. Graves, stands nervously by the door. He claims he was in the kitchen all evening.
But his hands are shaking, and he won't meet your eyes.

Will you press him for the truth?
                            </code>
                        </div>
                    </li>
                </ol>

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Create a Challenge Option</h3>
                <ol className="docs-list">
                    <li>Add a new option: <strong>"Press him for answers"</strong></li>
                    <li><strong>Description:</strong> Use your investigative skills to break through his lies.</li>
                    <li>Check the <strong>"Difficulty"</strong> checkbox. This reveals the challenge fields.</li>
                    <li>In the <strong>Challenge</strong> field, enter: <code>{`{ $investigation >> 30 }`}</code></li>
                    <li>Fill in the <strong>Success</strong> outcome:
                        <ul style={{marginTop: '0.5rem'}}>
                            <li><strong>Success Text:</strong> "I... I heard arguing," he stammers. "Lord Ashworth and his nephew were shouting about the will. I didn't want to get involved!"</li>
                            <li><strong>Pass Quality Change:</strong> <code>$clues += 4</code></li>
                        </ul>
                    </li>
                    <li>Fill in the <strong>Failure</strong> outcome:
                        <ul style={{marginTop: '0.5rem'}}>
                            <li><strong>Failure Text:</strong> He clams up completely, crossing his arms. "I've told you everything I know." You'll get nothing more from him.</li>
                            <li><strong>Fail Quality Change:</strong> <code>$investigation++</code></li>
                        </ul>
                    </li>
                </ol>

                <div className="docs-callout" style={{marginTop: '1.5rem'}}>
                    <strong>Understanding the Challenge:</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        <code>{`{ $investigation >> 30 }`}</code> means: "Calculate the player's success chance based on their Investigation skill compared to a difficulty of 30."
                        <br/><br/>
                        If the player's Investigation is 30, they have a default ~60% chance. Higher skill increases the chance, lower skill decreases it. The engine rolls a d100 to determine success.
                    </p>
                </div>

                <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                    <Image 
                        src="/images/docs/add_skillcheck.jpg" 
                        alt="The New Project dialog box"
                        width={800} 
                        height={500}
                        style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '8px',
                            border: '1px solid var(--docs-border-color, #e0e0e0)'
                        }}
                    />
                </div>
            </section>

            {/* STEP 6: CONDITIONAL VISIBILITY */}
            <section id="conditions">
                <h2 className="docs-h2">Step 6: Gate Content with Requirements</h2>
                <p className="docs-p">
                    The final storylet should only appear once the player has gathered enough clues. This is where <code>visible_if</code> comes in.
                </p>

                <h3 className="docs-h3">Create the "Solve the Mystery" Storylet</h3>
                <ol className="docs-list">
                    <li>Create a new storylet with ID: <code>solve_mystery</code></li>
                    <li><strong>Title:</strong> "The Solution"</li>
                    <li><strong>Location:</strong> The Crime Scene</li>
                    <li><strong>Teaser:</strong> "You have enough evidence to solve this case"</li>
                    <li><strong>Visible If:</strong> <code>$clues &gt;= 5</code></li>
                    <li><strong>Body:</strong>
                        <div className="docs-pre" style={{marginTop: '0.5rem'}}>
                            <code className="docs-code" style={{whiteSpace: 'pre-wrap'}}>
You review your evidence. The threatening letter. The poison in the wine. The butler's testimony about the argument over the will.

Everything points to one person. Who do you accuse?
                            </code>
                        </div>
                    </li>
                </ol>

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Add Accusation Options</h3>
                <p className="docs-p">
                    Create two options, each accusing a different suspect:
                </p>

                <div className="docs-pre">
                    <strong>Option 1: "Accuse the Nephew"</strong>
                </div>

                <ul className="docs-list">
                    <li><strong>Title:</strong> Accuse the nephew</li>
                    <li><strong>Description:</strong> He had motive and opportunity.</li>
                    <li><strong>Success Text:</strong> The nephew's face goes white. He confesses—he poisoned the wine to inherit the estate. Justice is served.</li>
                    <li><strong>Pass Quality Change:</strong> <code>$accused_suspect = nephew</code></li>
                </ul>

                <div className="docs-pre" style={{marginTop: '1.5rem'}}>
                    <strong>Option 2: "Accuse the Butler"</strong>
                </div>

                <ul className="docs-list">
                    <li><strong>Title:</strong> Accuse the butler</li>
                    <li><strong>Description:</strong> His nervous behavior is suspicious.</li>
                    <li><strong>Success Text:</strong> The butler protests his innocence. Later, you learn the nephew fled the country. You accused the wrong person.</li>
                    <li><strong>Pass Quality Change:</strong> <code>$accused_suspect = butler</code></li>
                </ul>

                <div className="docs-callout" style={{marginTop: '1.5rem'}}>
                    <strong>How visible_if Works:</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        This storylet will be completely hidden until the player has at least 5 clues. Once they reach that threshold, it will automatically appear in the location. This creates a natural progression: gather clues → solve mystery.
                    </p>
                </div>

                <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                    <Image 
                        src="/images/docs/add_conclusion.jpg" 
                        alt="The New Project dialog box"
                        width={800} 
                        height={500}
                        style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '8px',
                            border: '1px solid var(--docs-border-color, #e0e0e0)'
                        }}
                    />
                </div>
            </section>

            {/* STEP 7: SETUP CHARACTER CREATION */}
            <section id="chargen">
                <h2 className="docs-h2">Step 7: Configure Character Creation</h2>
                <p className="docs-p">
                    Before players can start your game, they need to create a character. Let's set up a simple character creation flow.
                </p>

                <ol className="docs-list">
                    <li>Go to the <strong>Admin</strong> tab</li>
                    <li>Scroll to <strong>"Character Initialization"</strong></li>
                    <li>Click <strong>"+ Add Entry"</strong></li>
                    <li>Fill in the fields:
                        <ul style={{marginTop: '0.5rem'}}>
                            <li><strong>Type:</strong> Static</li>
                            <li><strong>Effect:</strong> <code>$investigation = 1</code></li>
                        </ul>
                    </li>
                    <li>Add another entry:
                        <ul style={{marginTop: '0.5rem'}}>
                            <li><strong>Type:</strong> Static</li>
                            <li><strong>Effect:</strong> <code>$clues = 0</code></li>
                        </ul>
                    </li>
                    <li>Scroll to <strong>"Starting Location"</strong> and select <code>crime_scene</code></li>
                </ol>

                <p className="docs-p">
                    This ensures all new players start with Investigation level 1, 0 clues, and spawn at the crime scene.
                </p>

                <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                    <Image 
                        src="/images/docs/setup_character.jpg" 
                        alt="The Character Creation Form"
                        width={800} 
                        height={500}
                        style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '8px',
                            border: '1px solid var(--docs-border-color, #e0e0e0)'
                        }}
                    />
                </div>
            </section>

            {/* STEP 8: PLAYTEST */}
            <section id="playtest">
                <h2 className="docs-h2">Step 8: Playtest Your Game</h2>
                <p className="docs-p">
                    You've built a complete (if small) game! Let's test it.
                </p>

                <ol className="docs-list">
                    <li>Click the <strong>"Play"</strong> button in the top-right corner</li>
                    <li>Create a new character (it should start you at the crime scene)</li>
                    <li>Try playing through different paths:
                        <ul style={{marginTop: '0.5rem'}}>
                            <li>Search the desk and examine the wine glass to gather clues</li>
                            <li>Try interrogating the butler—you might fail if your Investigation is still low</li>
                            <li>Once you have 5+ clues, the "Solution" storylet should appear</li>
                            <li>Accuse someone and see the outcome</li>
                        </ul>
                    </li>
                </ol>

                <div className="docs-callout" style={{marginTop: '1.5rem', borderColor: 'var(--docs-accent-green)'}}>
                    <strong style={{color: 'var(--docs-accent-green)'}}>🎉 Congratulations!</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        You've just created your first Quality-Based Narrative game! You now understand:
                    </p>
                    <ul className="docs-list" style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>
                        <li>How to create Qualities (variables)</li>
                        <li>How to write Storylets (narrative content)</li>
                        <li>How to use skill checks for uncertain outcomes</li>
                        <li>How to gate content based on player state</li>
                    </ul>
                </div>

                <ScreenshotGrid />

            </section>

            {/* NEXT STEPS */}
            <section id="next">
                <h2 className="docs-h2">Next Steps</h2>
                <p className="docs-p">
                    Now that you've built your first game, here are some ways to expand your skills:
                </p>

                <div className="docs-grid">
                    <div className="docs-card">
                        <h4 className="docs-h4">Add More Depth</h4>
                        <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                            <li>Create multiple locations (the victim's bedroom, the garden, etc.)</li>
                            <li>Add more suspects with unique interrogation storylets</li>
                            <li>Use <code>unlock_if</code> to create locked options that require specific items or stats</li>
                        </ul>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">Learn Advanced Mechanics</h4>
                        <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                            <li>Explore the ScribeScript syntax for conditional text and dynamic values</li>
                            <li>Use Macros like <code>%pick</code> to randomize loot or encounters</li>
                            <li>Implement timers with <code>%schedule</code> for time-based events</li>
                        </ul>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">Polish Your Game</h4>
                        <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                            <li>Add images to your storylets for atmosphere</li>
                            <li>Use the Graph tool to visualize your narrative structure</li>
                            <li>Customize your game's layout and colors in Admin settings</li>
                        </ul>
                    </div>
                </div>

                <div className="docs-callout" style={{marginTop: '2rem'}}>
                    <strong>Recommended Reading Order:</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        1. <strong>Understanding the Interface</strong> - Get familiar with all the editors
                        <br/>2. <strong>Qualities, Variables & Resources</strong> - Deep dive into quality types
                        <br/>3. <strong>Storylets & Opportunities</strong> - Master the narrative system
                        <br/>4. <strong>ScribeScript Basics</strong> - Learn the language for dynamic content
                        <br/>5. <strong>Challenges & Probability</strong> - Perfect your skill check curves
                    </p>
                </div>
            </section>

            {/* EXAMPLE GAMES */}
            <section id="examples">
                <h2 className="docs-h2">Example Games to Study</h2>
                <p className="docs-p">
                    Learn by examining real games built with Chronicle. These open-source examples showcase different complexity levels and techniques:
                </p>

                <div className="docs-grid">
                    <div className="docs-card" style={{borderColor: 'var(--docs-accent-green)'}}>
                        <h4 className="docs-h4" style={{color: 'var(--docs-accent-green)'}}>Mystery at the Manor</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Complexity:</strong> Beginner
                            <br/>
                            <strong>What it demonstrates:</strong> The tutorial game from this Quick Start guide, fully implemented.
                        </p>
                        <a
                            href="/create/mystery_at_the_manor/settings"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-block',
                                marginTop: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: 'var(--docs-accent-green)',
                                color: 'black',
                                textDecoration: 'none',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontSize: '0.85rem'
                            }}
                        >
                            View Source →
                        </a>
                    </div>

                    <div className="docs-card" style={{borderColor: 'var(--docs-accent-blue)'}}>
                        <h4 className="docs-h4" style={{color: 'var(--docs-accent-blue)'}}>Cloak of Darkness</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Complexity:</strong> Simple
                            <br/>
                            <strong>Author:</strong> Hanon Ondricek
                            <br/>
                            <strong>What it demonstrates:</strong> A classic IF puzzle adapted to QBN, showing how to create atmospheric exploration with location-based gating.
                        </p>
                        <a
                            href="/create/cloak_of_darkness/settings"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-block',
                                marginTop: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: 'var(--docs-accent-blue)',
                                color: 'black',
                                textDecoration: 'none',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontSize: '0.85rem'
                            }}
                        >
                            View Source →
                        </a>
                    </div>

                    <div className="docs-card" style={{borderColor: '#c678dd'}}>
                        <h4 className="docs-h4" style={{color: '#c678dd'}}>Concrete Requiem</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Complexity:</strong> Advanced
                            <br/>
                            <strong>What it demonstrates:</strong> Extremely advanced ScribeScript usage, using the language to program complex game mechanics including:
                        </p>
                        <ul className="docs-list" style={{fontSize: '0.85rem', marginTop: '0.5rem'}}>
                            <li>Procedural suspect generation with RMO (Relation/Motive/Opportunity) flags</li>
                            <li>Bitwise operations for state management</li>
                            <li>Advanced probability math for evidence evaluation</li>
                            <li>Dynamic quality creation and manipulation</li>
                        </ul>
                        <a
                            href="/create/concrete_requiem/settings"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-block',
                                marginTop: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: '#c678dd',
                                color: 'black',
                                textDecoration: 'none',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontSize: '0.85rem'
                            }}
                        >
                            View Source →
                        </a>
                        <p className="docs-p" style={{fontSize: '0.8rem', marginTop: '1rem', fontStyle: 'italic', opacity: 0.8}}>
                            Note: This is a highly complex implementation. We recommend studying it only after you're comfortable with the basics.
                        </p>
                    </div>
                </div>

                <div className="docs-callout" style={{marginTop: '2rem', borderColor: '#f1c40f'}}>
                    <strong style={{color: '#f1c40f'}}>How to Study Example Games:</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        When viewing source for these games, you'll have <strong>read-only access</strong> to all editors. You can:
                        <br/>• Examine storylet structures and logic
                        <br/>• Review quality definitions and their usage
                        <br/>• See how ScribeScript is used in context
                        <br/>• Use the Graph tool to visualize narrative flow
                        <br/>• Play the game to see how mechanics work in practice
                        <br/><br/>
                        To experiment with modifications, create your own project and recreate the patterns you see!
                    </p>
                </div>
            </section>
        </div>
    );
}

const ScreenshotGrid = () => {
    const screenshots = [
        { src: "/images/docs/review_options.jpeg", alt: "In-Game Option" },
        { src: "/images/docs/name_skillcheck.jpeg", alt: "In-Game SkillCheck" },
        { src: "/images/docs/game_skills.jpg", alt: "In-Game Qualities" },
        { src: "/images/docs/resolve.jpg", alt: "In-Game Option Resolution" },
    ];

    return (
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
            gap: '1.5rem', 
            marginTop: '2rem' 
        }}>
            {screenshots.map((img, idx) => (
                <div key={idx} style={{ 
                    aspectRatio: '16/10', 
                    background: '#1c1c21', 
                    borderRadius: '8px', 
                    border: '1px solid #333',
                    overflow: 'hidden',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                    {/* Fallback to a styled div if image is missing, otherwise show img */}
                    <img 
                        src={img.src} 
                        alt={img.alt} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as any).parentElement.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#444;font-style:italic;">Screenshot ${idx + 1}</div>`;
                        }}
                    />
                </div>
            ))}
        </div>
    );
};