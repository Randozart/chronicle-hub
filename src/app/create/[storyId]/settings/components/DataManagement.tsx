'use client';
import { useState, useEffect } from "react";
import { useToast } from "@/providers/ToastProvider";

export default function DataManagement({ storyId }: { storyId: string }) {
    const [isImporting, setIsImporting] = useState(false);
    const [deletionDate, setDeletionDate] = useState<string | null>(null);
    const { showToast } = useToast();

    // Check if scheduled
    useEffect(() => {
        fetch(`/api/admin/settings?storyId=${storyId}`)
            .then(res => res.json())
            .then(data => {
                if (data.deletionScheduledAt) setDeletionDate(data.deletionScheduledAt);
            });
    }, [storyId]);

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

    const handleToggleDeletion = async () => {
        const action = deletionDate ? 'cancel' : 'schedule';
        
        if (action === 'schedule') {
             const confirmMsg = "DANGER: You are about to schedule this world for deletion.\n\nIt will remain available for 30 days before being permanently removed.\n\nType 'DELETE' to confirm.";
             const input = prompt(confirmMsg);
             if (input !== 'DELETE') return;
        }

        try {
            const res = await fetch('/api/admin/world/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, action })
            });
            const data = await res.json();

            if (res.ok) {
                setDeletionDate(data.deletionScheduledAt);
                // [FIX] Changed 'warning' to 'info' to satisfy ToastType definition
                showToast(
                    action === 'schedule' ? "Deletion scheduled." : "Deletion cancelled.", 
                    action === 'schedule' ? "info" : "success"
                );
                // Refresh to update header banner if needed
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showToast(data.error || "Action failed", "error");
            }
        } catch (e) {
            showToast("Network error", "error");
        }
    };

    return (
        <div className="special-field-group" style={{ borderColor: '#555'}}>
            <label className="special-label" style={{ color: 'var(--tool-text-main)' }}>Data Management</label>
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

            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--tool-border)', paddingTop: '1.5rem' }}>
                <h4 style={{ color: 'var(--danger-color)', margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontSize: '0.8rem' }}>Danger Zone</h4>
                
                {deletionDate ? (
                     <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--danger-color)', padding: '1rem', borderRadius: '4px' }}>
                        <p style={{ color: 'var(--danger-color)', fontWeight: 'bold', margin: '0 0 1rem 0' }}>
                            Deletion Scheduled for: {new Date(deletionDate).toLocaleDateString()}
                        </p>
                        <button onClick={handleToggleDeletion} className="save-btn" style={{ background: '#333', color: 'white', border: '1px solid #555' }}>
                            Cancel Deletion
                        </button>
                     </div>
                ) : (
                    <div>
                         <p className="special-desc" style={{ marginBottom: '1rem' }}>
                            Flag this world for permanent deletion. You will have 30 days to cancel before data is wiped.
                        </p>
                        <button onClick={handleToggleDeletion} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                            Schedule Deletion (30 Days)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}