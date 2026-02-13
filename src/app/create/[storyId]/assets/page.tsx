'use client';
import { use } from 'react';
import { useState, useEffect } from 'react';
import AssetExplorer from '@/components/admin/assets/AssetExplorer';
import RefactorTool from '@/components/admin/assets/RefactorTool';
import { GlobalAsset } from '@/engine/models';

export default function AssetManagementPage({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [assets, setAssets] = useState<GlobalAsset[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--tool-border)', background: 'var(--tool-bg-header)' }}>
                <h2 style={{ margin: 0 }}>Asset Management</h2>
                <p style={{ margin: '5px 0 0 0', color: 'var(--tool-text-dim)', fontSize: '0.9rem' }}>
                    Manage uploads, organize folders, and clean up unused files.
                </p>
            </div>
            
            {/* Main Content: Split View */}
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
                        {/* Placeholder for Storage Meter - can use data from fetchAssets if API returns it */}
                        <div style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)' }}>
                            {assets.length} assets
                        </div>
                    </div>

                    <div style={{ background: 'var(--tool-bg-header)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--tool-border)' }}>
                         <RefactorTool storyId={storyId} />
                    </div>
                </div>
            </div>
        </div>
    );
}