'use client';
import { useState } from "react";
import { useToast } from "@/providers/ToastProvider";

export function DataManagement({ storyId }: { storyId: string }) {
    const [isImporting, setIsImporting] = useState(false);
    const { showToast } = useToast();

    const handleExport = () => {
        window.open(`/api/admin/export?storyId=${storyId}`, '_blank');
        showToast("Export started...", "info");
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        
        if (!confirm("WARNING: This will overwrite existing settings. This action cannot be undone. Are you sure?")) {
            e.target.value = ''; 
            return;
        }
        
        setIsImporting(true);
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('storyId', storyId);

        try {
            const res = await fetch('/api/admin/import', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (res.ok) {
                showToast("Import Successful!", "success");
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showToast(`Import Failed: ${data.error}`, "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Network error.", "error");
        } finally {
            setIsImporting(false);
            e.target.value = ''; 
        }
    };

    return (
        <div className="special-field-group" style={{ borderColor: 'var(--tool-accent)'}}>
            <label className="special-label" style={{ color: 'var(--tool-accent)' }}>Data Management</label>
            <p className="special-desc">Backup your world or import data from another source.</p>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                <button onClick={handleExport} className="save-btn" >
                    ⬇ Export Backup
                </button>
                
                <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                    <button className="save-btn" style={{ background: isImporting ? 'var(--tool-border)' : 'var(--success-color)', cursor: isImporting ? 'wait' : 'pointer', color: 'var(--tool-key-black)' }}>
                        {isImporting ? 'Importing...' : '⬆ Import JSON'}
                    </button>
                    <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleImport}
                        disabled={isImporting}
                        style={{ 
                            position: 'absolute', left: 0, top: 0, opacity: 0, 
                            width: '100%', height: '100%', cursor: 'pointer' 
                        }} 
                    />
                </div>
            </div>
        </div>
    );
}