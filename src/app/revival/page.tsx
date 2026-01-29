'use client';
import { useState } from 'react';
import Link from 'next/link';
import ContactModal from '@/components/ContactModal';

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <section style={{ marginBottom: '4rem' }}>
        <h2 style={{ 
            fontSize: '2rem', 
            color: '#e5c07b', 
            marginBottom: '1.5rem', 
            fontFamily: 'var(--font-main), serif',
            textTransform: 'uppercase',
            letterSpacing: '1px'
        }}>
            {title}
        </h2>
        <div style={{ color: '#abb2bf', fontSize: '1.15rem', lineHeight: '1.8' }}>
            {children}
        </div>
    </section>
);

const ScreenshotGrid = () => {
    // These should be placed in your public folder, e.g., public/images/revival/
    const screenshots = [
        { src: "/images/revival/tbc_1.jpg", alt: "First Question" },
        { src: "/images/revival/tbc_2.jpg", alt: "Storylet Branches" },
        { src: "/images/revival/tbc_3.jpg", alt: "Resolution Screen" },
        { src: "/images/revival/tbc_4.jpg", alt: "Items" },
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

export default function RevivalProjectPage() {
    const [isContactOpen, setIsContactOpen] = useState(false);

    return (
        <div data-theme="dark-parchment" className="theme-wrapper" style={{ minHeight: '100vh', padding: '4rem 2rem' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                
                <header style={{ marginBottom: '5rem', textAlign: 'center' }}>
                    <div style={{ 
                        display: 'inline-block', 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        background: 'rgba(229, 192, 123, 0.1)', 
                        color: '#e5c07b', 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold',
                        marginBottom: '1rem',
                        border: '1px solid #e5c07b'
                    }}>
                        ARCHIVAL INITIATIVE
                    </div>
                    <h1 style={{ 
                        fontSize: '4rem', 
                        color: '#fff', 
                        margin: 0, 
                        fontFamily: 'var(--font-main), serif',
                        letterSpacing: '-1px'
                    }}>
                        StoryNexus Revival Project
                    </h1>
                    <p style={{ fontSize: '1.4rem', color: '#777', marginTop: '1rem', fontStyle: 'italic' }}>
                        Restoring a lost era of interactive fiction.
                    </p>
                </header>

                <main>
                    <Section title="The Inspiration">
                        <p>
                            ChronicleHub was built on the shoulders of giants. Our architectural philosophy—Quality-Based Narrative (QBN)—was directly inspired by the pioneering <strong>StoryNexus</strong> platform by Failbetter Games. 
                        </p>
                        <p>
                            StoryNexus hosted hundreds of unique, experimental, and immersive worlds. When the sun set on that era, many of those stories became inaccessible. We believe those worlds deserve to be seen, played, and preserved.
                        </p>
                    </Section>

                    <Section title="For Former Authors">
                        <p>
                            If you were an author on the StoryNexus platform, we would love to hear from you. The Revival Project offers specialized tools and support to ensure your work lives on:
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '8px', border: '1px solid #222' }}>
                                <h4 style={{ color: '#fff', marginTop: 0 }}>Restoration</h4>
                                <p style={{ fontSize: '1rem', color: '#888' }}>
                                    If you have fragments or full exports of your original XML/JSON data, we can help parse and clean it into a modern, human-readable format for your personal archives.
                                </p>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '8px', border: '1px solid #222' }}>
                                <h4 style={{ color: '#fff', marginTop: 0 }}>Conversion</h4>
                                <p style={{ fontSize: '1rem', color: '#888' }}>
                                    We can convert your legacy data into the ChronicleHub format, allowing your world to be hosted, edited, and played exactly as you intended within our modern engine.
                                </p>
                            </div>
                        </div>
                        <p style={{ marginTop: '2rem' }}>
                            All projects are collaborative. You retain full ownership and creative control over your work; we simply provide the new format and the home for it.
                        </p>
                        <button 
                            onClick={() => setIsContactOpen(true)}
                            className="continue-button"
                            style={{ padding: '1rem 2rem', width: 'auto', fontSize: '1.1rem', marginTop: '1rem' }}
                        >
                            Inquire about Reconstruction
                        </button>
                    </Section>

                    <Section title="Active Effort: The Black Crown Project">
                        <p>
                            Our current revival effort is <strong>The Black Crown Project</strong>. Originally a collaboration between Rob Sherman and Failbetter Games, this strange and wonderful world is being reconstructed within ChronicleHub.
                        </p>
                        <p style={{ fontSize: '1rem', color: '#777' }}>
                            Working from Rob Sherman's publically available repository, we are rebuilding the intricate mechanics and haunting atmosphere that made the original so unique.
                        </p>
                        <ScreenshotGrid />
                    </Section>
                </main>

                <footer style={{ marginTop: '8rem', textAlign: 'center', borderTop: '1px solid #222', paddingTop: '3rem' }}>
                    <Link href="/" style={{ color: '#555', textDecoration: 'none' }} className="hover:text-white">
                        ← Return to ChronicleHub Dashboard
                    </Link>
                </footer>
            </div>

            <ContactModal 
                isOpen={isContactOpen} 
                onClose={() => setIsContactOpen(false)} 
                initialSubject="StoryNexus Revival Project"
            />
        </div>
    );
}