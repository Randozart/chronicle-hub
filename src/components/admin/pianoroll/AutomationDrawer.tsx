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
    scrollLeft: number;
    viewWidth: number;
    onMouseDown: (e: React.MouseEvent, trackName: string, idx: number, val: number) => void;
    dragState?: any;
    dragDeltaRows: number;
}

const DESCRIPTIONS: Record<AutoMode, string> = {
    volume: "Note Velocity (-60 to +6 dB)",
    pan: "Stereo Panning (-100 L to +100 R)",
    fade: "Fade Out: Reduces volume by X dB over duration",
    swell: "Swell In: Starts X dB quieter, ramps up to full"
};

export default function AutomationDrawer({ 
    height, width, mode, onSetMode, scrollRef, 
    pattern, lane, slotW, 
    scrollLeft, viewWidth,
    onMouseDown, dragState, dragDeltaRows
}: Props) {
    const getTracks = () => {
        if (!pattern) return [];
        return Object.keys(pattern.tracks).filter(k => k === lane || k.startsWith(`${lane}_#`));
    };

    return (
        <div className="automation-drawer" style={{ height: `${height}px` }}>
            <div className="automation-header">
                <div style={{ display: 'flex' }}>
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
                <div className="automation-help-text">
                    {DESCRIPTIONS[mode]}
                </div>
            </div>
            <div className="automation-lane" ref={scrollRef}>
                <div style={{ width: width, height: '100%', position: 'relative', marginLeft: '40px' }}>
                    {['volume', 'pan'].includes(mode) ? (
                        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: '#333' }} />
                    ) : (
                        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, background: '#444' }} />
                    )}
                    
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
                            if (dragState?.type === 'automation' && dragState.eventIndex === i && dragState.trackName === trackName && dragState.originalVal !== undefined) {
                                val = dragState.originalVal + dragDeltaRows; 
                            }

                            let hPercent = 0;
                            let color = '#61afef';
                            let displayVal = Math.round(val);
                            let anchorStyle: React.CSSProperties = { bottom: 0 }; 

                            if (mode === 'volume') {
                                hPercent = Math.max(0, Math.min(100, 50 + (val * 1.5))); 
                            } 
                            else if (mode === 'pan') {
                                hPercent = 50 + (val / 2); 
                                color = '#d19a66'; 
                            } 
                            else {
                                hPercent = Math.min(100, Math.max(0, val)); 
                                color = mode === 'fade' ? '#e06c75' : '#c678dd';
                                anchorStyle = { top: 0 }; 
                            }
                            const labelMarginTop = (mode === 'fade' || mode === 'swell') ? '0' : '-12px';
                            const labelMarginBottom = (mode === 'fade' || mode === 'swell') ? '-12px' : '0';

                            return (
                                <div 
                                    key={`${trackName}-${i}`} 
                                    onMouseDown={(e) => onMouseDown(e, trackName, i, val)}
                                    className="automation-point"
                                    style={{ 
                                        left: leftPos, 
                                        width: Math.max(4, slotW - 4), 
                                        height: `${hPercent}%`, 
                                        background: color,
                                        flexDirection: 'column', 
                                        justifyContent: mode === 'volume' || mode === 'pan' ? 'flex-start' : 'flex-end',
                                        overflow: 'visible',
                                        ...anchorStyle 
                                    }}
                                >
                                    <span className="automation-value-label" style={{ 
                                        marginTop: labelMarginTop,
                                        marginBottom: labelMarginBottom
                                    }}>
                                        {displayVal}
                                    </span>
                                </div>
                            )
                        })
                    ))}
                </div>
            </div>
        </div>
    );
}