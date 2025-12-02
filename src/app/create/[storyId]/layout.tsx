import Link from 'next/link';
import '@/app/globals.css';
import CheatSheet from './components/CheatSheet';
import { verifyWorldAccess } from '@/engine/accessControl';
import { redirect } from 'next/navigation';
import VisualFilters from '@/components/VisualFilters';
import AdminSidebarFooter from './components/AdminSidebarFooter';


export default async function AdminLayout({ children, params }: { children: React.ReactNode, params: Promise<{ storyId: string }> }) {
    const { storyId } = await params;
    
    const hasAccess = await verifyWorldAccess(storyId, 'writer'); // 'writer' allows collaborators too
    
    if (!hasAccess) {
        // Option A: Redirect to Dashboard
        redirect('/?error=forbidden');
        
        // Option B: 404 (Pretend it doesn't exist)
        // notFound();
    }
  
    const base = `/create/${storyId}`;
    
    return (
        <div className="admin-layout">
            {/* LEFT SIDEBAR (Fixed) */}
            <aside className="admin-sidebar">
                <div className="admin-header">Creator Studio</div>
                <nav className="admin-nav">
                    <ul>
                       {/* ... Links ... */}
                       <AdminLink href={`${base}/qualities`} label="Qualities" />
                       <AdminLink href={`${base}/categories`} label="Categories" />
                       <AdminLink href={`${base}/storylets`} label="Storylets" />
                       <AdminLink href={`${base}/opportunities`} label="Opportunities" />
                       <AdminLink href={`${base}/decks`} label="Decks" />
                       <AdminLink href={`${base}/locations`} label="Locations" />
                       <AdminLink href={`${base}/regions`} label="Map Regions" />
                       <AdminLink href={`${base}/markets`} label="Markets" />
                       <AdminLink href={`${base}/images`} label="Image Library" />
                       <AdminLink href={`${base}/players`} label="Player Monitor" />
                       <AdminLink href={`${base}/settings`} label="Settings" />
                    </ul>
                </nav>
                <AdminSidebarFooter />
            </aside>

            {/* MAIN AREA */}
            <main className="admin-main">
                
                {/* MIDDLE CONTENT (Scrolls with Page) */}
                <div className="admin-content-wrapper">
                    {children}
                </div>

                {/* RIGHT SIDEBAR (Fixed) */}
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