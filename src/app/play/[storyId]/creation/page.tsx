import { getWorldContent } from '@/engine/worldService';
import CreationForm from '@/components/CreationForm';

interface Props {
    params: Promise<{ storyId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CreationPage({ params }: Props) {
    const { storyId } = await params;

    if (!storyId) return <div>Error: No story specified.</div>;

    // 1. Fetch ALL game data (including images)
    const gameData = await getWorldContent(storyId);
    const creationRules = gameData.char_create || {};
    const imageLibrary = gameData.images || {}; // <--- Get the library
    
    return (
        <div className="theme-wrapper" data-theme={gameData.settings.visualTheme || 'default'} style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: '2rem' }}>
            <div className="container">
                <h1 style={{ fontSize: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', textAlign: 'center', color: 'var(--text-primary)' }}>
                    Create Your Character
                </h1>
                <CreationForm 
                    storyId={storyId} 
                    rules={creationRules} 
                    imageLibrary={imageLibrary} /* <--- Pass it down */
                />
            </div>
        </div>
    );
}