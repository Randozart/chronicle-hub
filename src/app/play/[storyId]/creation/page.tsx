import { getContent } from '@/engine/contentCache';
import CreationForm from '@/components/CreationForm';

interface Props {
    params: Promise<{ storyId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CreationPage({ params, searchParams }: Props) {
    const { storyId } = await params;
    const resolvedSearchParams = await searchParams;
    const isPlaytest = resolvedSearchParams.playtest === 'true';

    if (!storyId) return <div>Error: No story specified.</div>;
    const gameData = await getContent(storyId, isPlaytest);
    
    const rawRules = gameData.char_create || {};
    const rules: any = {};
    
    for (const key in rawRules) {
        if (['version', 'lastModified', 'lastModifiedBy', 'itemId', '_id', 'lastModifiedAt'].includes(key)) {
            continue;
        }

        const val = rawRules[key] as any;
        
        if (typeof val === 'string') {
             rules[key] = {
                type: val.includes('|') ? 'label_select' : (val === 'string' ? 'string' : 'static'),
                rule: val === 'string' ? '' : val,
                visible: val !== 'static' && !(!isNaN(Number(val))), 
                readOnly: false,
                visible_if: ''
            };
        } else {
            rules[key] = val;
        }
    }

    const imageLibrary = gameData.images || {};
    const qualityDefs = gameData.qualities || {}; 
    const allowScribeScript = gameData.settings.allowScribeScriptInInputs || false;
    
    return (
        <div className="theme-wrapper" data-theme={gameData.settings.visualTheme || 'default'} style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: '2rem' }}>
            <div className="container">
                <h1 style={{ fontSize: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', textAlign: 'center', color: 'var(--text-primary)' }}>
                    Create Your Character
                </h1>
                <CreationForm 
                    storyId={storyId} 
                    rules={rules} 
                    qualityDefs={qualityDefs} 
                    imageLibrary={imageLibrary} 
                    allowScribeScript={allowScribeScript}
                    settings={gameData.settings}
                />
            </div>
        </div>
    );
}