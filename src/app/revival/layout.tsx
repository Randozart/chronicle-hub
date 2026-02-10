import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'The StoryNexus Revival Project | ChronicleHub',
    description: 'Reconstructing lost worlds of interactive fiction. An initiative to restore and host games inspired by the StoryNexus engine.',
};

export default function RevivalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ minHeight: '100vh', background: '#0e0e11' }}>
            {children}
        </div>
    );
}