'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface TocItem {
    id: string;
    label: string;
    level: number; 
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [toc, setToc] = useState<TocItem[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const headers = Array.from(document.querySelectorAll('.docs-content h2, .docs-content h3'));
            const usedIds = new Set<string>();

            const items = headers.map((header, index) => {
                let id = header.id;

                // 1. If no ID, generate one from text
                if (!id) {
                    const text = header.textContent || `header-${index}`;
                    id = text
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-') // Replace chars with -
                        .replace(/(^-|-$)/g, '');   // Trim -
                }

                // 2. Ensure Uniqueness (Fixes the duplicate key error)
                if (usedIds.has(id)) {
                    let counter = 1;
                    while (usedIds.has(`${id}-${counter}`)) {
                        counter++;
                    }
                    id = `${id}-${counter}`;
                }

                usedIds.add(id);
                header.id = id; // Apply back to DOM so the anchor link works
                
                return {
                    id: id,
                    label: header.textContent || 'Section',
                    level: parseInt(header.tagName[1]) // 2 or 3
                };
            });
            setToc(items);
        }, 100);

        return () => clearTimeout(timer);
    }, [pathname]);
    
    const NavItem = ({ href, label }: { href: string, label: string }) => {
        const isActive = pathname === href;
        return (
            <li>
                <Link 
                    href={href} 
                    style={{ 
                        display: 'block', 
                        padding: '0.4rem 0', 
                        color: isActive ? '#61afef' : '#aaa', 
                        textDecoration: 'none',
                        fontWeight: isActive ? 'bold' : 'normal',
                        borderLeft: isActive ? '2px solid #61afef' : '2px solid transparent',
                        paddingLeft: '10px',
                        transition: 'color 0.2s'
                    }}
                >
                    {label}
                </Link>
                
                {isActive && toc.length > 0 && (
                    <ul style={{ listStyle: 'none', padding: '0.5rem 0 0.5rem 0', margin: 0 }}>
                        {toc.map(item => (
                            <li key={item.id} style={{ marginBottom: '4px' }}>
                                <a 
                                    href={`#${item.id}`}
                                    style={{
                                        display: 'block',
                                        fontSize: '0.75rem',
                                        color: '#777',
                                        textDecoration: 'none',
                                        paddingLeft: item.level === 3 ? '25px' : '15px',
                                        borderLeft: '2px solid transparent'
                                    }}
                                    className="toc-link"
                                >
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
        <li style={{ margin: '1.5rem 0 0.5rem 0', textTransform: 'uppercase', fontSize: '0.7rem', color: '#fff', fontWeight: 'bold', letterSpacing: '1px', opacity: 0.7 }}>
            {title}
        </li>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#181a1f', color: '#ccc', fontFamily: 'var(--font-main)' }}>
            <aside style={{ width: '280px', borderRight: '1px solid #333', padding: '2rem 1rem 2rem 2rem', flexShrink: 0, height: '100vh', position: 'sticky', top: 0, overflowY: 'auto' }}>
                <h2 style={{ margin: '0 0 2rem 0', color: '#fff', fontSize: '1.2rem' }}>
                    <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>Chronicle Engine</Link>
                </h2>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
    <NavItem href="/docs" label="Introduction" />
    
    <Section title="The Language" />
    <NavItem href="/docs/scribescript" label="ScribeScript Syntax" />
    <NavItem href="/docs/logic" label="Logic & Conditions" />
    <NavItem href="/docs/effects" label="Effects & State Changes" />
    <NavItem href="/docs/macros" label="Macros & Functions" />

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
            </aside>
            <main style={{ flex: 1, padding: '4rem 6rem', scrollBehavior: 'smooth' }}>
                {children}
            </main>
        </div>
    );
}

