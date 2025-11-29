import Link from 'next/link';
import '@/app/globals.css';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="docs-wrapper">
            <aside className="docs-nav">
                <div className="docs-nav-header">
                    <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Chronicle Hub</Link>
                </div>
                <ul>
                    <li><a href="#philosophy">1. Core Philosophy</a></li>
                    <li><a href="#qualities">2. Qualities</a></li>
                    <li><a href="#scribescript">3. ScribeScript</a></li>
                    <li><a href="#storylets">4. Storylets</a></li>
                    <li><a href="#challenges">5. Difficulty</a></li>
                    <li><a href="#ledger">6. The Ledger</a></li>
                    <li><a href="#world">7. World Structure</a></li>
                    <li><a href="#advanced">8. Advanced</a></li>
                </ul>
            </aside>
            <main className="docs-main">
                {children}
            </main>
        </div>
    );
}