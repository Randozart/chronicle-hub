// ... existing imports
// Add this new component to the bottom of the file or import it:

import { useState } from "react";

export function DataManagement({ storyId }: { storyId: string }) {
    const [isImporting, setIsImporting] = useState(false);

    const handleExport = () => {
        // Trigger browser download
        window.open(`/api/admin/export?storyId=${storyId}`, '_blank');
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        
        if (!confirm("WARNING: This will overwrite existing settings and update storylets with matching IDs. This action cannot be undone. Are you sure?")) {
            e.target.value = ''; // Reset input
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
                alert(`Success! ${data.message}`);
                window.location.reload(); // Refresh to show new settings
            } else {
                alert(`Import Failed: ${data.error}`);
            }
        } catch (err) {
            console.error(err);
            alert("Network error during import.");
        } finally {
            setIsImporting(false);
            e.target.value = ''; // Reset input
        }
    };

    return (
        <div className="special-field-group" style={{ borderColor: '#61afef', marginBottom: '2rem' }}>
            <label className="special-label" style={{ color: '#61afef' }}>Data Management</label>
            <p className="special-desc">Backup your world or import data from another source.</p>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                <button onClick={handleExport} className="save-btn" style={{ background: '#2a3e5c' }}>
                    ⬇ Export Backup
                </button>
                
                <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                    <button className="save-btn" style={{ background: isImporting ? '#444' : '#2e7d32', cursor: isImporting ? 'wait' : 'pointer' }}>
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
