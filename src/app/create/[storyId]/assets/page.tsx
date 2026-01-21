'use client';
import { use } from 'react';
import RefactorTool from '@/components/admin/assets/RefactorTool';

export default function AssetManagementPage({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);

    return (
        <div style={{ padding: '2rem', height: '100%', overflowY: 'auto', background: 'var(--tool-bg-sidebar)' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ marginBottom: '3rem', borderBottom: '1px solid var(--tool-border)', paddingBottom: '1rem' }}>
                    <h1 style={{ color: 'var(--tool-text-header)', margin: 0 }}>Asset Management</h1>
                    <p style={{ color: 'var(--tool-text-dim)', marginTop: '0.5rem' }}>
                        Tools for refactoring, cleaning, and auditing your world's data.
                    </p>
                </div>
                
                <div style={{ background: 'var(--tool-bg-header)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--tool-border)', marginBottom: '3rem' }}>
                    <RefactorTool storyId={storyId} />
                </div>
            </div>
        </div>
    );
}