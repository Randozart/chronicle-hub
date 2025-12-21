interface Props {
    patterns: string[];
    selectedPatternId: string;
    onSelectPattern: (id: string) => void;
    activeLane: string;
    lanes: string[];
    onSelectLane: (lane: string) => void;
    playbackMode: 'global' | 'local' | 'stopped';
    onTogglePlay: () => void;
    showAutomation: boolean;
    onToggleAutomation: (v: boolean) => void;
}

export default function PianoRollToolbar({
    patterns, selectedPatternId, onSelectPattern,
    activeLane, lanes, onSelectLane,
    playbackMode, onTogglePlay,
    showAutomation, onToggleAutomation
}: Props) {
    return (
        <div className="pianoroll-toolbar">
            <select value={selectedPatternId} onChange={e => onSelectPattern(e.target.value)} className="pianoroll-select">
                {patterns.map(pid => <option key={pid} value={pid}>{pid}</option>)}
            </select>
            <div className="pianoroll-toolbar-section">
                <span className="pianoroll-label">Editing Lane:</span>
                <select value={activeLane || ''} onChange={e => onSelectLane(e.target.value)} className="pianoroll-select">
                    {lanes.map(k => <option key={k} value={k}>{k}</option>)}
                    <option value="__NEW__">+ New Lane</option>
                </select>
            </div>
            <div className="pianoroll-toolbar-section" style={{ borderLeft:'1px solid #444', paddingLeft:'1rem' }}>
                <button onClick={onTogglePlay} className="pianoroll-select" style={{ color: playbackMode === 'local' ? '#98c379' : '#fff', cursor:'pointer' }}>
                    {playbackMode === 'local' ? '■ Stop' : '▶ Ptn'}
                </button>                    
                <label style={{ display:'flex', alignItems:'center', gap:'4px', color: showAutomation ? '#61afef' : '#ccc', fontSize:'11px', cursor:'pointer' }}>
                    <input type="checkbox" checked={showAutomation} onChange={e => onToggleAutomation(e.target.checked)} />
                    Mods/FX
                </label>
            </div>
        </div>
    );
}