import Link from 'next/link';
import '../globals.css'; 
import CheatSheet from './components/CheatSheet';


export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-header">Creator Studio</div>
                <nav className="admin-nav">
                    <ul>
                        <AdminLink href="/admin/qualities" label="Qualities" />
                        <AdminLink href="/admin/categories" label="Categories" /> {/* NEW */}
                        <AdminLink href="/admin/storylets" label="Storylets" />
                        <AdminLink href="/admin/opportunities" label="Opportunities" />
                        <AdminLink href="/admin/locations" label="Locations" />
                        <AdminLink href="/admin/regions" label="Map Regions" />
                        <AdminLink href="/admin/decks" label="Decks" />
                        <AdminLink href="/admin/images" label="Image Library" />
                        <AdminLink href="/admin/settings" label="Settings" />
                    </ul>
                </nav>
                <div style={{ padding: '1rem', borderTop: '1px solid #333' }}>
                    <Link href="/" className="admin-link">Back to Game</Link>
                </div>
            </aside>
            {/* Main Content Area */}
            <main className="admin-main" style={{ display: 'flex', padding: 0 }}>
                
                {/* The Page Content (List + Editor) */}
                <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                    {children}
                </div>

                {/* Right Sidebar (Reference) */}
                <aside className="admin-help-sidebar">
                    <CheatSheet />
                </aside>

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