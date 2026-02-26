'use client';
import { use } from 'react';
import { useState, useEffect } from 'react';
import AssetExplorer from '@/components/admin/assets/AssetExplorer';
import RefactorTool from '@/components/admin/assets/RefactorTool';
import SamplesManager from '@/components/admin/SamplesManager';
import { GlobalAsset } from '@/engine/models';

type Tab = 'images' | 'samples';

export default function AssetManagementPage({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [assets, setAssets] = useState<GlobalAsset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('images');

    const fetchAssets = () => {
        fetch('/api/admin/assets/mine')
            .then(r => r.json())
            .then(data => setAssets(data.assets || []))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        setIsLoading(true);
        fetchAssets();
    }, []);

    const tabStyle = (tab: Tab): React.CSSProperties => ({
        background: activeTab === tab ? 'rgba(97,175,239,0.1)' : 'transparent',
        border: 'none',
        borderBottom: activeTab === tab ? '2px solid var(--tool-accent)' : '2px solid transparent',
        color: activeTab === tab ? 'var(--tool-accent)' : 'var(--tool-text-dim)',
        padding: '0.5rem 1.1rem',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontFamily: 'inherit',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--tool-border)', background: 'var(--tool-bg-header)' }}>
                <h2 style={{ margin: 0 }}>Asset Management</h2>
                <p style={{ margin: '5px 0 0 0', color: 'var(--tool-text-dim)', fontSize: '0.9rem' }}>
                    Manage uploads, organize folders, and clean up unused files.
                </p>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--tool-border)', background: 'var(--tool-bg)', flexShrink: 0 }}>
                <button onClick={() => setActiveTab('images')} style={tabStyle('images')}>Images &amp; Files</button>
                <button onClick={() => setActiveTab('samples')} style={tabStyle('samples')}>Audio Samples</button>
            </div>

            {/* Main Content */}
            {activeTab === 'images' && (
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                    {/* Left: Asset Explorer (70% width) */}
                    <div style={{ flex: 7, borderRight: '1px solid var(--tool-border)' }}>
                        <AssetExplorer
                            assets={assets}
                            onRefresh={fetchAssets}
                            storyId={storyId}
                            mode="manager"
                            className="h-full border-0 rounded-none"
                            style={{ border: 'none' }}
                        />
                    </div>

                    {/* Right: Tools & Refactor (30% width) */}
                    <div style={{ flex: 3, padding: '1rem', overflowY: 'auto', background: 'var(--tool-bg-sidebar)' }}>
                        <div style={{ marginBottom: '2rem' }}>
                            <h4 style={{marginTop:0, color:'var(--tool-text-header)'}}>Storage</h4>
                            <div style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)' }}>
                                {assets.length} assets
                            </div>
                        </div>

                        <div style={{ background: 'var(--tool-bg-header)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--tool-border)' }}>
                            <RefactorTool storyId={storyId} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'samples' && (
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <SamplesManager />
                </div>
            )}
        </div>
    );
}