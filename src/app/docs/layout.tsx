'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import ThemeControls from '@/components/ui/ThemeControls';

interface TocItem { id: string; label: string; level: number; }

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [toc, setToc] = useState<TocItem[]>([]);
    
    // MOBILE STATE
    const [showNav, setShowNav] = useState(false);

    // Auto-close nav on link click
    useEffect(() => {
        setShowNav(false);
    }, [pathname]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const headers = Array.from(document.querySelectorAll('.docs-content h2, .docs-content h3'));
            const usedIds = new Set<string>();
            const items = headers.map((header, index) => {
                let id = header.id || `header-${index}`;
                // ... (ID generation logic remains same) ...
                if (!header.id) header.id = id;
                return { id, label: header.textContent || 'Section', level: parseInt(header.tagName[1]) };
            });
            setToc(items);
        }, 100);
        return () => clearTimeout(timer);
    }, [pathname]);
    
    const NavItem = ({ href, label }: { href: string, label: string }) => {
        const isActive = pathname === href;
        return (
            <li>
                <Link href={href} style={{ 
                    display: 'block', padding: '0.4rem 0', 
                    color: isActive ? 'var(--docs-accent-blue)' : 'var(--text-muted)', 
                    textDecoration: 'none', fontWeight: isActive ? 'bold' : 'normal',
                    borderLeft: isActive ? '2px solid var(--docs-accent-blue)' : '2px solid transparent',
                    paddingLeft: '10px', transition: 'color 0.2s'
                }}>
                    {label}
                </Link>
                {isActive && toc.length > 0 && (
                    <ul style={{ listStyle: 'none', padding: '0.5rem 0 0.5rem 0', margin: 0 }}>
                        {toc.map(item => (
                            <li key={item.id} style={{ marginBottom: '4px' }}>
                                <a href={`#${item.id}`} className="toc-link" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none', paddingLeft: item.level === 3 ? '25px' : '15px', borderLeft: '2px solid transparent' }}>
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </li>
        );
    };

    const Section = ({ title }: { title: string }) => (
        <li style={{ margin: '1.5rem 0 0.5rem 0', textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--docs-text-header)', fontWeight: 'bold', letterSpacing: '1px', opacity: 0.7 }}>
            {title}
        </li>
    );

    return (
        <div className="docs-wrapper">
            
            {/* MOBILE TOP BAR */}
            <div className="docs-mobile-header">
                <button onClick={() => setShowNav(true)} className="docs-mobile-btn">☰ Menu</button>
                <span className="docs-mobile-title">Documentation</span>
                <div style={{width: '24px'}}></div> {/* Spacer for alignment */}
            </div>

            {/* BACKDROP */}
            {showNav && <div className="docs-mobile-backdrop" onClick={() => setShowNav(false)} />}

            {/* SIDEBAR DRAWER */}
            <aside className={`docs-nav ${showNav ? 'mobile-open' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0, color: 'var(--docs-text-header)', fontSize: '1.2rem' }}>
                        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Chronicle Engine</Link>
                    </h2>
                    <button className="mobile-close-btn" onClick={() => setShowNav(false)}>✕</button>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {/* ... (Keep existing nav items) ... */}
                        <NavItem href="/docs" label="Introduction" />
                        <Section title="The Language" />
                        <NavItem href="/docs/scribescript" label="ScribeScript Syntax" />
                        <NavItem href="/docs/logic" label="Logic & Conditions" />
                        <NavItem href="/docs/effects" label="Effects & State Changes" />
                        <NavItem href="/docs/macros" label="Macros & Functions" />
                        <NavItem href="/docs/highlighting" label="Editor Highlighting" />
                        <Section title="The World" />
                        <NavItem href="/docs/storylets" label="Storylets & Opportunities" />
                        <NavItem href="/docs/qualities" label="Qualities, Variables & Resources" />
                        <NavItem href="/docs/geography" label="Locations, Regions, Markets & Maps" />
                        <Section title="Tools" />
                        <NavItem href="/docs/graph" label="Narrative Graph" />
                        <NavItem href="/docs/admin" label="Configuration & Administration" />
                        <Section title="Cookbook" />
                        <NavItem href="/docs/patterns" label="Design Patterns" />
                        <NavItem href="/docs/esoteric" label="System Hacking" />
                    </ul>
                </div>

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--docs-border)' }}>
                     <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <ThemeControls />
                     </div>
                </div>
            </aside>
            
            <main className="docs-main">
                <div className="docs-content">
                    {children}
                </div>
            </main>
        </div>
    );
}