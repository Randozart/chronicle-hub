import { getWorldContent } from '@/engine/worldService';
import CreationForm from '@/components/CreationForm';

// Define the props interface correctly for Next.js 15
interface Props {
    params: Promise<{ storyId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CreationPage({ params }: Props) {
    // 1. Await the params Promise first to get the actual object
    const { storyId } = await params;

    if (!storyId) {
        return <div>Error: No story specified.</div>;
    }

    // 2. Fetch data
    const gameData = await getWorldContent(storyId);
    const creationRules = gameData.char_create || {};
    
    return (
        <div className="container" style={{ padding: '2rem' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                Create Your Character
            </h1>
            <CreationForm storyId={storyId} rules={creationRules} />
        </div>
    );
}