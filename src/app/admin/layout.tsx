import Link from 'next/link';
import '../globals.css'; // Ensure CSS is loaded

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-header">Creator Studio</div>
                <nav className="admin-nav">
                    <ul>
                        <AdminLink href="/admin/qualities" label="Qualities" />
                        <AdminLink href="/admin/storylets" label="Storylets" />
                        <AdminLink href="/admin/opportunities" label="Opportunities" />
                        <AdminLink href="/admin/locations" label="Locations" />
                        <AdminLink href="/admin/decks" label="Decks" />
                        <AdminLink href="/admin/images" label="Image Library" />
                        <AdminLink href="/admin/settings" label="Settings" />
                    </ul>
                </nav>
                <div style={{ padding: '1rem', borderTop: '1px solid #333' }}>
                    <Link href="/" className="admin-link">Back to Game</Link>
                </div>
            </aside>
            <main className="admin-main">
                {children}
            </main>
        </div>
    );
}

function AdminLink({ href, label }: { href: string, label: string }) {
    return (
        <li>
            <Link href={href} className="admin-link">{label}</Link>
        </li>
    );
}