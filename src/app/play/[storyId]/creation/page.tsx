// src/app/creation/page.tsx

import { getWorldContent } from '@/engine/worldService'; // Use getContent if you set up the cache
import CreationForm from '@/components/CreationForm';

// Update the interface to reflect that searchParams is a Promise
interface CreationPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CreationPage({props, params}: {props: CreationPageProps, params: { storyId: string }}) {
    const storyId = await params.storyId;

    if (!storyId || typeof storyId !== 'string') {
        return <div>Error: No story specified or storyId is invalid.</div>;
    }

    // 2. Fetch data
    const gameData = await getWorldContent(storyId);
    const creationRules = gameData.char_create;
    
    return (
        <div className="container" style={{ padding: '2rem' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                Create Your Character
            </h1>
            <CreationForm storyId={storyId} rules={creationRules} />
        </div>
    );
}