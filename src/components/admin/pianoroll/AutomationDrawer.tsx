import { ParsedPattern, NoteDef } from '@/engine/audio/models';

type AutoMode = 'volume' | 'pan' | 'fade' | 'swell';

interface Props {
    height: number;
    width: number;
    mode: AutoMode;
    onSetMode: (m: AutoMode) => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    pattern: ParsedPattern | undefined;
    lane: string;
    slotW: number;
    
    // Viewport for virtualization
    scrollLeft: number;
    viewWidth: number;

    // Interaction
    onMouseDown: (e: React.MouseEvent, trackName: string, idx: number, val: number) => void;
    dragState?: any;
    dragDeltaRows: number;
}

export default function AutomationDrawer({ 
    height, width, mode, onSetMode, scrollRef, 
    pattern, lane, slotW, 
    scrollLeft, viewWidth,
    onMouseDown, dragState, dragDeltaRows
}: Props) {
    
    // Helper to extract tracks in the active group (base + suffix)
    const getTracks = () => {
        if (!pattern) return [];
        return Object.keys(pattern.tracks).filter(k => k === lane || k.startsWith(`${lane}_#`));
    };

    return (
        <div className="automation-drawer" style={{ height: `${height}px` }}>
            <div className="automation-header">
                {['volume', 'pan', 'fade', 'swell'].map(m => (
                    <button 
                        key={m} 
                        onClick={() => onSetMode(m as AutoMode)} 
                        className={`automation-tab ${mode === m ? 'active' : ''}`}
                    >
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                ))}
            </div>
            <div className="automation-lane" ref={scrollRef}>
                <div style={{ width: width, height: '100%', position: 'relative', marginLeft: '40px' }}>
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: '#333' }} />
                    
                    {getTracks().map(trackName => (
                        pattern?.tracks[trackName]?.map((event, i) => {
                            const leftPos = event.time * slotW;
                            if (leftPos < scrollLeft - 100 || leftPos > scrollLeft + viewWidth + 100) return null;

                            let val = 0;
                            const note = event.notes[0];
                            if (mode === 'volume') val = note.volume || 0;
                            else if (mode === 'pan') { const fx = note.effects?.find(e => e.code === 'P'); val = fx ? fx.value : 0; }
                            else if (mode === 'fade') { const fx = note.effects?.find(e => e.code === 'F'); val = fx ? fx.value : 0; }
                            else if (mode === 'swell') { const fx = note.effects?.find(e => e.code === 'S'); val = fx ? fx.value : 0; }

                            // Live Drag Preview
                            if (dragState?.type === 'automation' && dragState.eventIndex === i && dragState.trackName === trackName && dragState.originalVal !== undefined) {
                                val = dragState.originalVal + dragDeltaRows; 
                            }

                            let hPercent = 0;
                            let color = '#61afef';
                            if (mode === 'volume') hPercent = Math.max(0, Math.min(100, 50 + (val * 2))); 
                            else if (mode === 'pan') { hPercent = 50 + (val / 2); color = '#d19a66'; } 
                            else { hPercent = Math.min(100, Math.max(0, val)); color = mode === 'fade' ? '#e06c75' : '#c678dd'; }

                            return (
                                <div key={`${trackName}-${i}`} onMouseDown={(e) => onMouseDown(e, trackName, i, val)}
                                    className="automation-point"
                                    style={{ left: leftPos, width: Math.max(4, slotW - 4), height: `${hPercent}%`, background: color }}>
                                    {dragState?.type === 'automation' && dragState.eventIndex === i && dragState.trackName === trackName && (
                                        <span style={{ fontSize: '9px', color: '#fff', position: 'absolute', top: '-15px', background: '#000', padding: '2px 4px', borderRadius:'2px', pointerEvents:'none', zIndex: 100, whiteSpace:'nowrap' }}>
                                            {mode}: {Math.round(val)}
                                        </span>
                                    )}
                                </div>
                            )
                        })
                    ))}
                </div>
            </div>
        </div>
    );
}