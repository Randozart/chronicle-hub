// src/app/play/[storyId]/creation/page.tsx
import { getWorldContent } from '@/engine/worldService';
import CreationForm from '@/components/CreationForm';

interface Props {
    params: Promise<{ storyId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CreationPage({ params }: Props) {
    const { storyId } = await params;
    if (!storyId) return <div>Error: No story specified.</div>;

    const gameData = await getWorldContent(storyId);
    
    // Normalize rules (Handle old string format migration)
    const rawRules = gameData.char_create || {};
    const rules: any = {};
    for (const key in rawRules) {
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
    const qualityDefs = gameData.qualities || {}; // <--- GET DEFINITIONS
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
                    qualityDefs={qualityDefs} // <--- PASS DOWN
                    imageLibrary={imageLibrary} 
                    allowScribeScript={allowScribeScript}
                />
            </div>
        </div>
    );
}