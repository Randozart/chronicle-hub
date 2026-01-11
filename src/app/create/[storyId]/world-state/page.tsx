'use client';

import { useState, useEffect, use, useRef } from 'react';
import { QualityDefinition, QualityState, SystemMessage } from '@/engine/models';
import GMConsoleMainForm from './components/GMConsoleMainForm';
import UnsavedChangesModal from '@/components/admin/UnsavedChangesModal';
import { useToast } from '@/providers/ToastProvider';
import { FormGuard } from '@/hooks/useCreatorForm';

// Matches component interface
interface ConsoleData {
    id: string;
    version: number;
    worldState: Record<string, QualityState>;
    systemMessage: SystemMessage;
}

export default function WorldStateAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    
    const [consoleData, setConsoleData] = useState<ConsoleData | null>(null);
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const guardRef = useRef<FormGuard | null>(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    
    // We don't have list navigation here, but we might want the guard for browser navigation
    // The hook in the child form handles beforeUnload automatically.
    // If we added tabs here later, we'd use showUnsavedModal.

    useEffect(() => {
        const load = async () => {
            try {
                // Fetch the aggregated console data
                const [conRes, qRes] = await Promise.all([
                    fetch(`/api/admin/console?storyId=${storyId}`),
                    fetch(`/api/admin/qualities?storyId=${storyId}`)
                ]);
                
                if (conRes.ok) setConsoleData(await conRes.json());
                if (qRes.ok) {
                    const qData = await qRes.json();
                    setQualities(Object.values(qData));
                }
            } catch (e) {
                console.error(e);
                showToast("Failed to load console.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [storyId, showToast]);

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-layout" style={{ display: 'block', padding: '0' }}>
            <div className="admin-editor-col" style={{ maxWidth: '900px', margin: '0 auto' }}>
                {consoleData ? (
                    <GMConsoleMainForm 
                        initialData={consoleData} 
                        onSave={(d) => setConsoleData(d)}
                        storyId={storyId}
                        qualityDefs={qualities}
                        guardRef={guardRef}
                    />
                ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--tool-text-dim)' }}>
                        Console unavailable.
                    </div>
                )}
            </div>
        </div>
    );
}