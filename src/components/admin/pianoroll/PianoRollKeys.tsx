import { Note } from 'tonal';

interface Props {
    noteRange: number[];
    rowHeight: number;
    height: number;
    scrollRef: React.RefObject<HTMLDivElement | null>;
}

export default function PianoRollKeys({ noteRange, rowHeight, height, scrollRef }: Props) {
    return (
        <div ref={scrollRef} className="pianoroll-keys">
            <div style={{ height: height }}>
                {noteRange.slice().reverse().map(midi => (
                    <div key={midi} className={`pianoroll-key ${Note.fromMidi(midi).includes('#') ? 'black' : ''}`} style={{ height: rowHeight }}>
                        {Note.fromMidi(midi)}
                    </div>
                ))}
            </div>
        </div>
    );
}