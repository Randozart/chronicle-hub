'use client';

import React from 'react';

interface ScreenshotItem {
    src: string;
    alt: string;
}

const zoomPopupStyle = `
@keyframes fadeInRight {
    from { opacity: 0; transform: translateX(-6px); }
    to   { opacity: 1; transform: translateX(0); }
}
` as string;

const ZoomableImage = ({ src, alt, fillContainer }: { src: string; alt: string; fillContainer?: boolean }) => {
    const [hovered, setHovered] = React.useState(false);

    return (
        <div
            style={{
                borderRadius: '8px',
                border: '1px solid #333',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                background: '#1c1c21',
                position: 'relative',
                // No overflow:hidden here — the popup needs to escape to the right
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Inner clip wrapper so the original image respects border-radius */}
            <div style={{ borderRadius: '7px', overflow: 'hidden', cursor: 'zoom-in' }}>
                <img
                    src={src}
                    alt={alt}
                    style={{
                        width: '100%',
                        height: fillContainer ? '100%' : 'auto',
                        objectFit: fillContainer ? 'cover' : undefined,
                        display: 'block',
                    }}
                    onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                        const wrapper = img.parentElement as HTMLElement;
                        wrapper.innerHTML = `<div style="padding:2rem;text-align:center;color:#444;font-style:italic;">${alt}</div>`;
                    }}
                />
            </div>

            {/* Popup: appears to the right in the empty doc margin */}
            {hovered && (
                <div
                    style={{
                        position: 'absolute',
                        left: 'calc(100% + 14px)',
                        top: 0,
                        width: '1280px',
                        zIndex: 1000,
                        borderRadius: '8px',
                        border: '1px solid #555',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.85)',
                        background: '#1c1c21',
                        overflow: 'hidden',
                        pointerEvents: 'none',
                        animation: 'fadeInRight 0.15s ease',
                    }}
                >
                    <img
                        src={src}
                        alt=""
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                </div>
            )}
        </div>
    );
};

/**
 * Reusable screenshot display component.
 * Single screenshot: full-width. Multiple: responsive grid with 16:10 aspect ratio per cell.
 * All images support hover-to-zoom (2x, anchored to top centre).
 */
const ScreenshotDisplay = ({ screenshots }: { screenshots: ScreenshotItem[] }) => {
    if (screenshots.length === 1) {
        return (
            <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                <ZoomableImage src={screenshots[0].src} alt={screenshots[0].alt} />
            </div>
        );
    }

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: '1.5rem',
            marginTop: '2rem',
            marginBottom: '1.5rem',
            position: 'relative',
        }}>
            {screenshots.map((img, idx) => (
                <div key={idx} style={{ aspectRatio: '16/10', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0 }}>
                        <ZoomableImage src={img.src} alt={img.alt} fillContainer />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default function QuickStartPage() {
    return (
        <div className="docs-content">
            <style dangerouslySetInnerHTML={{ __html: zoomPopupStyle }} />
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
                    The tutorial covers qualities, storylets, skill checks, autofire scenes, and win conditions.
                </p>
            </div>

            <div className="docs-callout" style={{borderColor: 'var(--docs-accent-blue)'}}>
                <strong style={{color: 'var(--docs-accent-blue)'}}>Tip: Follow Along Side-by-Side</strong>
                <p className="docs-p" style={{marginBottom: 0, marginTop: '0.5rem'}}>
                    Open ChronicleHub in a separate tab or window while reading this guide. On most browsers: right-click the Chronicle logo or dashboard link → <strong>Open in New Tab</strong>.
                </p>
            </div>

            {/* STEP 1 */}
            <section id="setup">
                <h2 className="docs-h2">Step 1: Create Your Project</h2>
                <p className="docs-p">
                    From the main dashboard, click <strong>"New Project"</strong> and give it a name (e.g., "Mystery at the Manor").
                </p>

                <ScreenshotDisplay screenshots={[
                    { src: '/images/docs/create_world.jpeg', alt: 'The New Project dialog box' },
                ]} />

                <p className="docs-p" style={{marginTop: '1.5rem'}}>
                    Once created, you'll be taken to the Project Editor. The left sidebar contains:
                </p>
                <ul className="docs-list">
                    <li><strong>Qualities:</strong> Your game's variables — stats, items, counters</li>
                    <li><strong>Storylets:</strong> The scenes and events players encounter</li>
                    <li><strong>Locations:</strong> The places players can visit</li>
                    <li><strong>Settings:</strong> Global configuration, starting location, and world bindings</li>
                    <li><strong>Character Setup:</strong> Character creation flow and initialization rules</li>
                </ul>
            </section>

            {/* STEP 2 */}
            <section id="qualities">
                <h2 className="docs-h2">Step 2: Define Your Qualities</h2>
                <p className="docs-p">
                    Qualities are variables that store everything about a player's state. See the <a href="/docs/qualities">Qualities reference</a> for a full breakdown of types and options.
                </p>

                <h3 className="docs-h3">Create the Investigation Skill</h3>
                <ol className="docs-list">
                    <li>Click the <strong>"Qualities"</strong> tab in the left sidebar</li>
                    <li>Click <strong>"+ New Quality"</strong></li>
                    <li>Fill in:
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

                <ScreenshotDisplay screenshots={[
                    { src: '/images/docs/add_skill.jpeg', alt: 'The Investigation Skill Quality' },
                ]} />

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Create the Clues Tracker</h3>
                <p className="docs-p">
                    Repeat the process to create a tracker for clues:
                </p>
                <ul className="docs-list">
                    <li><strong>ID:</strong> <code>clues</code></li>
                    <li><strong>Name:</strong> Clues Discovered</li>
                    <li><strong>Type:</strong> Tracker (T)</li>
                    <li><strong>Progression Limits {'>'} Hard Cap:</strong> 5 — the total clues needed to solve the case</li>
                    <li><strong>Description:</strong> "Evidence you've gathered about the crime."</li>
                    <li><strong>Category:</strong> Create a new category called "Progress"</li>
                </ul>

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Create the Suspect Quality</h3>
                <ul className="docs-list">
                    <li><strong>ID:</strong> <code>accused_suspect</code></li>
                    <li><strong>Name:</strong> Accused</li>
                    <li><strong>Type:</strong> String (S)</li>
                    <li><strong>Description:</strong> "The person you believe committed the crime."</li>
                    <li><strong>Category:</strong> Progress</li>
                </ul>

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Create the Intro Scene Tracker</h3>
                <p className="docs-p">
                    A hidden flag quality that tracks whether the player has seen the opening scene, preventing it from repeating on every visit.
                </p>
                <ul className="docs-list">
                    <li><strong>ID:</strong> <code>intro_seen</code></li>
                    <li><strong>Name:</strong> Intro Seen</li>
                    <li><strong>Type:</strong> Counter (C)</li>
                    <li><strong>Category:</strong> Progress</li>
                    <li>Check the <strong>Hidden</strong> checkbox — this keeps it out of the player's quality list</li>
                </ul>

                <ScreenshotDisplay screenshots={[
                    { src: '/images/docs/intro_seen.jpg', alt: 'The Intro Seen Quality' },
                ]} />

                <div className="docs-callout">
                    <strong>Quality Types at a Glance</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        <strong>Pyramidal:</strong> Gets progressively harder to level up — ideal for skills with meaningful long-term progression.
                        <br/>
                        <strong>Tracker:</strong> An integer with a defined maximum — displays as a progress bar. Used here for <code>clues</code>, capped at 5 so players can see exactly how close they are to solving the case.
                        <br/>
                        <strong>Counter:</strong> A plain unbounded integer. Used here for <code>intro_seen</code> as a simple boolean flag (0 = not seen, 1 = seen).
                        <br/>
                        <strong>String:</strong> Stores text rather than a number — used to record a suspect's name.
                        <br/><br/>
                        <a href="/docs/qualities">Full quality type reference →</a>
                    </p>
                </div>
            </section>

            {/* STEP 3 */}
            <section id="location">
                <h2 className="docs-h2">Step 3: Create Your First Location</h2>
                <p className="docs-p">
                    Locations are containers for storylets. Players visit locations to discover and interact with the content inside them.
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

                <ScreenshotDisplay screenshots={[
                    { src: '/images/docs/create_location.jpeg', alt: 'The Crime Scene location' },
                ]} />
            </section>

            {/* STEP 4 */}
            <section id="storylets">
                <h2 className="docs-h2">Step 4: Write Your First Storylet</h2>
                <p className="docs-p">
                    Storylets are the narrative building blocks of your game — each one is a self-contained scene with body text and player options. See the <a href="/docs/storylets">Storylets reference</a> for the full set of options.
                </p>

                <h3 className="docs-h3">The Introduction</h3>
                <ol className="docs-list">
                    <li>Click the <strong>"Storylets"</strong> tab</li>
                    <li>Click <strong>"+ New Storylet"</strong></li>
                    <li>Fill in the <strong>Basic Info</strong>:
                        <ul style={{marginTop: '0.5rem'}}>
                            <li><strong>ID:</strong> <code>intro</code></li>
                            <li><strong>Title:</strong> "A Call in the Night"</li>
                            <li><strong>Location ID:</strong> Type <code>crime_scene</code>, or use the "🔗 Locations" button to browse and select</li>
                        </ul>
                    </li>
                    <li>In the <strong>Teaser Text</strong> field (the short description shown on the card):
                        <div className="docs-pre" style={{marginTop: '0.5rem'}}>
                            <code className="docs-code">Begin your investigation</code>
                        </div>
                    </li>
                    <li>In the <strong>Main Text</strong> field:
                        <div className="docs-pre" style={{marginTop: '0.5rem'}}>
                            <code className="docs-code" style={{whiteSpace: 'pre-wrap'}}>
The phone rings at 3 AM. A body has been discovered at Thornfield Manor.
Lord Ashworth, the estate's owner, was found slumped over his desk, a wine glass shattered on the floor.

You arrive at the scene. The study is eerily quiet. Where do you begin?
                            </code>
                        </div>
                    </li>
                    <li>Scroll to the <strong>Must-Event (Autofire)</strong> section and click <strong>Enable</strong> — the storylet will trigger automatically when the player enters the location. Change the condition from <code>true</code> to <code>$intro_seen == 0</code> so it only fires before the player has seen the intro.</li>
                    <li>Set <strong>Requirement for Visibility</strong> to: <code>$intro_seen == 0</code>
                        <br/><span style={{fontSize: '0.85rem', opacity: 0.75}}>This also hides the card once seen — so the storylet neither appears on the board nor autofires after the player's first visit.</span>
                    </li>
                </ol>

                <ScreenshotDisplay screenshots={[
                    { src: '/images/docs/intro_storylet.JPG', alt: 'The intro storylet with Autofire enabled and Visible If set' },
                ]} />

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Add Your First Option</h3>
                <p className="docs-p">
                    Scroll down to the <strong>"Options"</strong> section and click <strong>"+ Add Option"</strong>.
                </p>

                <div className="docs-pre">
                    <strong>Option 1: "Search the Desk"</strong>
                </div>

                <ul className="docs-list">
                    <li><strong>Label:</strong> Search the desk</li>
                    <li><strong>Teaser (Option Card):</strong> Look for clues among the papers and drawers.</li>
                    <li><strong>Resolution Body</strong> (Success column): You find a letter hidden beneath a false bottom in the drawer. It's a threatening note demanding payment. A valuable clue!</li>
                    <li><strong>Changes</strong> (Success column): <code>$clues += 2, $investigation++, $intro_seen = 1</code></li>
                </ul>

                <div className="docs-callout" style={{marginTop: '1.5rem'}}>
                    <strong>Quality Change Syntax</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        <code>$clues += 2</code> — adds 2 to the Clues counter directly.
                        <br/>
                        <code>$investigation++</code> — adds 1 Change Point to the Investigation skill (pyramidal leveling — the level increases once enough points accumulate).
                        <br/>
                        <code>$intro_seen = 1</code> — sets the flag so the autofire intro doesn't repeat.
                        <br/><br/>
                        <a href="/docs/effects">Full effects & quality change reference →</a>
                    </p>
                </div>

                <ScreenshotDisplay screenshots={[
                    { src: '/images/docs/add_intro.jpeg', alt: 'The intro storylet with options configured' },
                ]} />

                <p className="docs-p" style={{marginTop: '2rem'}}>
                    Add a second option:
                </p>

                <div className="docs-pre">
                    <strong>Option 2: "Examine the Wine Glass"</strong>
                </div>

                <ul className="docs-list">
                    <li><strong>Label:</strong> Examine the wine glass</li>
                    <li><strong>Teaser (Option Card):</strong> Analyze the shattered glass for traces of poison.</li>
                    <li><strong>Resolution Body</strong> (Success column): You detect a faint almond scent—cyanide. The wine was poisoned. This narrows down the suspects considerably.</li>
                    <li><strong>Changes</strong> (Success column): <code>$clues += 3, $investigation++, $intro_seen = 1</code></li>
                </ul>

                <div className="docs-callout" style={{borderColor: 'var(--docs-accent-blue)', marginTop: '1.5rem'}}>
                    <strong style={{color: 'var(--docs-accent-blue)'}}>Storylet Status</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        New storylets default to <strong>Playtest</strong> status — visible only when using the Playtest World button, not in a published game. That's exactly what you want while building.
                        Once ready to go live, change the status to <strong>Published</strong> from the dropdown at the top of the storylet editor.
                    </p>
                </div>

                <p className="docs-p">
                    Click <strong>"Save"</strong>.
                </p>
            </section>

            {/* STEP 5 */}
            <section id="challenge">
                <h2 className="docs-h2">Step 5: Add a Skill Check (Challenge)</h2>
                <p className="docs-p">
                    Not every action should be guaranteed to succeed. Skill checks introduce risk and reward, and make player stats matter.
                </p>

                <h3 className="docs-h3">Create the "Interrogate Butler" Storylet</h3>
                <ol className="docs-list">
                    <li>Create a new storylet with ID: <code>interrogate_butler</code></li>
                    <li><strong>Title:</strong> "The Butler's Story"</li>
                    <li><strong>Location ID:</strong> <code>crime_scene</code></li>
                    <li><strong>Teaser Text:</strong> "Question the manor's butler"</li>
                    <li><strong>Main Text:</strong>
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
                    <li><strong>Teaser (Option Card):</strong> Use your investigative skills to break through his lies.</li>
                    <li>In the <strong>Skill Check (Difficulty)</strong> section, check <strong>"Enable Failure State"</strong>. Scroll down slightly — the skill check fields will appear below once the checkbox is ticked.</li>
                    <li>In the revealed <strong>Skill Check (Difficulty)</strong> section, click the <strong>Manual Code</strong> tab, then enter:
                        <div className="docs-pre" style={{marginTop: '0.5rem'}}>
                            <code className="docs-code">{`{ $investigation >> 1 }`}</code>
                        </div>
                    </li>
                    <li>Fill in the <strong>Success/Default</strong> outcome column:
                        <ul style={{marginTop: '0.5rem'}}>
                            <li><strong>Resolution Body:</strong> "I... I heard arguing," he stammers. "Lord Ashworth and his nephew were shouting about the will. I didn't want to get involved!"</li>
                            <li><strong>Changes:</strong> <code>$clues += 4</code></li>
                        </ul>
                    </li>
                    <li>Fill in the <strong>Failure</strong> outcome column:
                        <ul style={{marginTop: '0.5rem'}}>
                            <li><strong>Resolution Body:</strong> He clams up completely, crossing his arms. "I've told you everything I know." You'll get nothing more from him.</li>
                            <li><strong>Changes:</strong> <code>$investigation++</code></li>
                        </ul>
                    </li>
                </ol>

                <ScreenshotDisplay screenshots={[
                    { src: '/images/docs/skill_check1.JPG', alt: 'Manual Code tab with the skill check expression entered' },
                    { src: '/images/docs/skill_check2.JPG', alt: 'The Logic Builder showing the probability curve for the skill check' },
                ]} />

                <div className="docs-callout" style={{marginTop: '1.5rem'}}>
                    <strong>Understanding the Challenge</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        <code>{`{ $investigation >> 1 }`}</code> compares the player's Investigation level against a difficulty of 1.
                        At the starting level of 1, this gives roughly a 50–60% chance of success.
                        Higher Investigation increases the odds; lower decreases them. The engine rolls a d100 to determine the result.
                        <br/><br/>
                        Keep early-game difficulty values low — a difficulty of 30 would be nearly unreachable at starting stats.
                        <br/><br/>
                        <a href="/docs/challenges">Challenges & Probability — full reference →</a>
                    </p>
                </div>

                <div className="docs-callout" style={{borderColor: 'var(--docs-accent-blue)', marginTop: '1rem'}}>
                    <strong style={{color: 'var(--docs-accent-blue)'}}>Logic Builder</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        The <strong>Logic Builder</strong> tab (next to Manual Code) lets you construct skill checks visually — pick a stat, set a target and function, and watch the probability curve update in real time.
                        It's a good way to sanity-check whether your difficulty values produce the success rates you intend before committing to a number.
                        <br/><br/>
                        <a href="/docs/challenges">Learn more about skill check math and the Logic Builder →</a>
                    </p>
                </div>
            </section>

            {/* STEP 6 */}
            <section id="conditions">
                <h2 className="docs-h2">Step 6: Gate Content with Requirements</h2>
                <p className="docs-p">
                    The final storylet should only appear once the player has gathered enough clues. The <code>visible_if</code> field controls when a storylet is shown.
                    See <a href="/docs/storylets">Storylets</a> for the full set of visibility and requirement options.
                </p>

                <h3 className="docs-h3">Create the "Solve the Mystery" Storylet</h3>
                <ol className="docs-list">
                    <li>Create a new storylet with ID: <code>solve_mystery</code></li>
                    <li><strong>Title:</strong> "The Solution"</li>
                    <li><strong>Location ID:</strong> <code>crime_scene</code></li>
                    <li><strong>Teaser Text:</strong> "You have enough evidence to solve this case"</li>
                    <li><strong>Requirement for Visibility:</strong> <code>$clues &gt;= 5</code></li>
                    <li><strong>Main Text:</strong>
                        <div className="docs-pre" style={{marginTop: '0.5rem'}}>
                            <code className="docs-code" style={{whiteSpace: 'pre-wrap'}}>
You review your evidence. The threatening letter. The poison in the wine. The butler's testimony about the argument over the will.

Everything points to one person. Who do you accuse?
                            </code>
                        </div>
                    </li>
                </ol>

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Add Accusation Options</h3>

                <div className="docs-pre">
                    <strong>Option 1: "Accuse the Nephew"</strong>
                </div>
                <ul className="docs-list">
                    <li><strong>Label:</strong> Accuse the nephew</li>
                    <li><strong>Teaser (Option Card):</strong> He had motive and opportunity.</li>
                    <li><strong>Resolution Body</strong> (Success column): The nephew's face goes white. He confesses—he poisoned the wine to inherit the estate. Justice is served.</li>
                    <li><strong>Changes</strong> (Success column): <code>$accused_suspect = nephew</code></li>
                </ul>

                <div className="docs-pre" style={{marginTop: '1.5rem'}}>
                    <strong>Option 2: "Accuse the Butler"</strong>
                </div>
                <ul className="docs-list">
                    <li><strong>Label:</strong> Accuse the butler</li>
                    <li><strong>Teaser (Option Card):</strong> His nervous behavior is suspicious.</li>
                    <li><strong>Resolution Body</strong> (Success column): The butler protests his innocence. Later, you learn the nephew fled the country. You accused the wrong person.</li>
                    <li><strong>Changes</strong> (Success column): <code>$accused_suspect = butler</code></li>
                </ul>

                <div className="docs-callout" style={{marginTop: '1.5rem'}}>
                    <strong>How <code>visible_if</code> Works</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        This storylet stays completely hidden until the player has at least 5 clues.
                        Once the threshold is reached, it appears automatically in the location — giving players a clear goal before the ending unlocks.
                    </p>
                </div>

                <ScreenshotDisplay screenshots={[
                    { src: '/images/docs/add_conclusion.jpg', alt: 'The conclusion storylet with a visible_if condition' },
                ]} />
            </section>

            {/* STEP 7 */}
            <section id="chargen">
                <h2 className="docs-h2">Step 7: Configure Character Setup</h2>
                <p className="docs-p">
                    Before players start the game, set their starting quality values and spawn location.
                </p>

                <h3 className="docs-h3">Character Creation Options</h3>
                <ol className="docs-list">
                    <li>Click <strong>Character Setup</strong> in the left sidebar (under <strong>Game System</strong>)</li>
                    <li>At the top of the page, check <strong>Skip Character Creation Screen</strong></li>
                    <li>Also check <strong>Anonymous Protagonist</strong></li>
                </ol>

                <div className="docs-callout" style={{borderColor: 'var(--docs-accent-blue)'}}>
                    <strong style={{color: 'var(--docs-accent-blue)'}}>Why these two options?</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        This tutorial has a fixed detective protagonist — there's no character customization for the player to do, and the character doesn't have a meaningful name.
                        <br/><br/>
                        <strong>Skip Character Creation Screen</strong> — Players bypass the creation form entirely and go straight to the game. Initialization rules (set below) still run as normal; interactive fields just default to empty.
                        <br/><br/>
                        <strong>Anonymous Protagonist</strong> — Hides the player's name and portrait throughout the game. Use this for predetermined or nameless protagonists where showing a blank name field would look broken.
                    </p>
                </div>

                <h3 className="docs-h3" style={{marginTop: '1.5rem'}}>Set an Initialization Rule</h3>
                <p className="docs-p">
                    Initialization rules run once when a new character is created, setting their starting quality values.
                </p>
                <ol className="docs-list">
                    <li>Scroll to the <strong>Initialization Rules</strong> section</li>
                    <li>In the quality field at the bottom of the section, type <code>investigation</code> and click <strong>Add Rule</strong></li>
                    <li>In the rule card that appears, click the <strong>Calc</strong> tab</li>
                    <li>Enter <code>1</code> in the value field</li>
                </ol>

                <p className="docs-p">
                    That's all. Qualities default to <code>0</code>, so <code>$clues</code> and <code>$intro_seen</code> don't need explicit rules — they'll start at zero automatically.
                </p>

                <ScreenshotDisplay screenshots={[
                    { src: '/images/docs/character_setup.jpg', alt: 'Character Setup showing the Initialization Rules section with the investigation rule set to 1' },
                ]} />

                <h3 className="docs-h3" style={{marginTop: '2rem'}}>Set the Starting Location</h3>
                <p className="docs-p">
                    The starting location is a world setting, not a character rule.
                </p>
                <ol className="docs-list">
                    <li>Click <strong>Settings</strong> in the left sidebar</li>
                    <li>Scroll to the <strong>Interface &amp; Categories</strong> section</li>
                    <li>In the <strong>Starting Location ID</strong> field, enter: <code>crime_scene</code></li>
                    <li>Save</li>
                </ol>

                <ScreenshotDisplay screenshots={[
                    { src: '/images/docs/location_settings.jpg', alt: 'Settings showing the Starting Location ID field set to crime_scene' },
                ]} />

                <p className="docs-p">
                    All new players will spawn at the crime scene when they begin a new game.
</p>

                <div className="docs-callout">
                    <strong>Advanced: Dynamic Starting Location</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        To track location as a readable quality (so ScribeScript can inspect or change it), configure a <strong>Current Location ID</strong> binding in Settings under <strong>System Bindings</strong>, then initialize that quality in Character Setup.
                        This is optional for most games.
                    </p>
                </div>
            </section>

            {/* STEP 8 */}
            <section id="playtest">
                <h2 className="docs-h2">Step 8: Playtest Your Game</h2>

                <ol className="docs-list">
                    <li>Click the <strong>"Playtest World"</strong> button in the <strong>top-left corner</strong></li>
                    <li>Create a new character — the game should place you at the crime scene with the intro scene firing automatically</li>
                    <li>Work through the game:
                        <ul style={{marginTop: '0.5rem'}}>
                            <li>The opening scene fires on arrival — pick an option to collect your first clues</li>
                            <li>Try the butler interrogation — failure is possible at low Investigation, but earns you XP toward the next level</li>
                            <li>Once you have 5+ clues, the Solution storylet appears</li>
                            <li>Accuse someone and see the outcome</li>
                        </ul>
                    </li>
                </ol>

                <div className="docs-callout" style={{marginTop: '1.5rem', borderColor: 'var(--docs-accent-green)'}}>
                    <strong style={{color: 'var(--docs-accent-green)'}}>Done!</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        You've built a working Quality-Based Narrative game. Along the way you covered:
                    </p>
                    <ul className="docs-list" style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>
                        <li>Creating <a href="/docs/qualities">Qualities</a> as game variables</li>
                        <li>Writing <a href="/docs/storylets">Storylets</a> with options and outcomes</li>
                        <li>Using Autofire for automatic scene triggering</li>
                        <li>Adding <a href="/docs/challenges">skill checks</a> for uncertain outcomes</li>
                        <li>Gating content with <code>visible_if</code> conditions</li>
                    </ul>
                </div>

                <ScreenshotDisplay screenshots={[
                    { src: '/images/docs/review_options.jpeg', alt: 'In-Game Option' },
                    { src: '/images/docs/name_skillcheck.jpeg', alt: 'In-Game SkillCheck' },
                    { src: '/images/docs/game_skills.jpg', alt: 'In-Game Qualities' },
                    { src: '/images/docs/resolve.jpg', alt: 'In-Game Option Resolution' },
                ]} />
            </section>

            {/* NEXT STEPS */}
            <section id="next">
                <h2 className="docs-h2">Next Steps</h2>

                <div className="docs-grid">
                    <div className="docs-card">
                        <h4 className="docs-h4">Add More Depth</h4>
                        <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                            <li>Create multiple locations (the victim's bedroom, the garden, etc.)</li>
                            <li>Add more suspects with unique interrogation storylets</li>
                            <li>Use <code>unlock_if</code> to lock options behind specific items or stats</li>
                        </ul>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">Learn Advanced Mechanics</h4>
                        <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                            <li>Read the <a href="/docs/scribescript">ScribeScript</a> reference for conditional text and dynamic values</li>
                            <li>Use <a href="/docs/macros">Macros</a> like <code>%pick</code> to randomize loot or encounters</li>
                            <li>Build <a href="/docs/patterns">common patterns</a> like timers, inventories, and reputation systems</li>
                        </ul>
                    </div>
                    <div className="docs-card">
                        <h4 className="docs-h4">Polish Your Game</h4>
                        <ul className="docs-list" style={{fontSize: '0.9rem'}}>
                            <li>Add images to storylets for atmosphere</li>
                            <li>Use the <a href="/docs/graph">Narrative Graph</a> to visualize your story structure</li>
                            <li>Customize layout and colors in Settings</li>
                        </ul>
                    </div>
                </div>

                <div className="docs-callout" style={{marginTop: '2rem'}}>
                    <strong>Recommended Reading Order</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        1. <a href="/docs/interface"><strong>Understanding the Interface</strong></a> — get familiar with all the editors
                        <br/>2. <a href="/docs/qualities"><strong>Qualities, Variables &amp; Resources</strong></a> — deep dive into quality types
                        <br/>3. <a href="/docs/storylets"><strong>Storylets &amp; Opportunities</strong></a> — master the narrative system
                        <br/>4. <a href="/docs/scribescript"><strong>ScribeScript Basics</strong></a> — learn the language for dynamic content
                        <br/>5. <a href="/docs/challenges"><strong>Challenges &amp; Probability</strong></a> — fine-tune your skill check curves
                    </p>
                </div>
            </section>

            {/* EXAMPLE GAMES */}
            <section id="examples">
                <h2 className="docs-h2">Example Games to Study</h2>
                <p className="docs-p">
                    These open-source examples showcase different complexity levels and techniques:
                </p>

                <div className="docs-grid">
                    <div className="docs-card" style={{borderColor: 'var(--docs-accent-green)'}}>
                        <h4 className="docs-h4" style={{color: 'var(--docs-accent-green)'}}>Mystery at the Manor</h4>
                        <p className="docs-p" style={{fontSize: '0.9rem'}}>
                            <strong>Complexity:</strong> Beginner
                            <br/>
                            <strong>What it demonstrates:</strong> The tutorial game from this guide, fully implemented.
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
                            <strong>What it demonstrates:</strong> A classic IF puzzle adapted to QBN, with atmospheric exploration and location-based gating.
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
                            <strong>What it demonstrates:</strong> Deep ScribeScript usage across complex game mechanics:
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
                            Best approached after you're comfortable with the basics.
                        </p>
                    </div>
                </div>

                <div className="docs-callout" style={{marginTop: '2rem', borderColor: '#f1c40f'}}>
                    <strong style={{color: '#f1c40f'}}>How to Study Example Games</strong>
                    <p className="docs-p" style={{fontSize: '0.9rem', marginBottom: 0, marginTop: '0.5rem'}}>
                        Example games give you <strong>read-only access</strong> to all editors:
                        <br/>• Examine storylet structures and logic
                        <br/>• Review quality definitions and their usage
                        <br/>• See ScribeScript used in context
                        <br/>• Use the <a href="/docs/graph">Narrative Graph</a> to visualize story flow
                        <br/>• Play the game to see mechanics in practice
                        <br/><br/>
                        To experiment, create your own project and recreate the patterns you find.
                    </p>
                </div>
            </section>
        </div>
    );
}
