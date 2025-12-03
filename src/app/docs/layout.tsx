'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

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
                        paddingLeft: '10px'
                    }}
                >
                    {label}
                </Link>
            </li>
        );
    };

    const Section = ({ title }: { title: string }) => (
        <li style={{ margin: '1.5rem 0 0.5rem 0', textTransform: 'uppercase', fontSize: '0.75rem', color: '#fff', fontWeight: 'bold', letterSpacing: '1px' }}>
            {title}
        </li>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#181a1f', color: '#ccc', fontFamily: 'var(--font-main)' }}>
            <aside style={{ width: '260px', borderRight: '1px solid #333', padding: '2rem', flexShrink: 0, height: '100vh', position: 'sticky', top: 0, overflowY: 'auto' }}>
                <h2 style={{ margin: '0 0 2rem 0', color: '#fff', fontSize: '1.2rem' }}>Documentation</h2>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <NavItem href="/docs" label="Introduction" />
                    
                    <Section title="The Language" />
                    <NavItem href="/docs/scribescript" label="ScribeScript Syntax" />
                    <NavItem href="/docs/logic" label="Logic & Math" />

                    <Section title="The World" />
                    <NavItem href="/docs/storylets" label="Storylets & Cards" />
                    <NavItem href="/docs/qualities" label="Qualities & Economy" />
                    <NavItem href="/docs/geography" label="Geography & Maps" />

                    <Section title="Tools" />
                    <NavItem href="/docs/graph" label="Visual Graph Builder" />
                    <NavItem href="/docs/admin" label="Admin & Security" />

                    <Section title="Cookbook" />
                    <NavItem href="/docs/patterns" label="Design Patterns" />
                </ul>
            </aside>
            <main style={{ flex: 1, maxWidth: '900px', padding: '4rem 6rem' }}>
                {children}
            </main>
        </div>
    );
}