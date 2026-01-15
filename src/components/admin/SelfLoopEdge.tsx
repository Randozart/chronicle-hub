import React from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps } from '@xyflow/react';

export default function SelfLoopEdge({
  sourceX,
  sourceY,
  style = {},
  markerEnd,
  label,
  data,
}: EdgeProps) {
  
    const index = (data?.offsetIndex as number) || 0;
    sourceX -= 70;
    sourceY += 50;
    const archHeight = 90 + (index * 35); 
    const archWidth = 50 + (index * 10);
    const startX = sourceX + 50  + (index * 5); 
    const startY = sourceY - 20; 
    const endX = sourceX -50 - (index * 5);
    const endY = sourceY -20;
    const cp1X = startX + 20;
    const cp1Y = startY - archHeight;
    
    const cp2X = endX - 20;
    const cp2Y = endY - archHeight;
    
    const edgePath = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
    const labelX = startX - (archWidth / 2) - 30;
    const labelY = startY - archHeight + 20;

    return (
        <>
        <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
        <EdgeLabelRenderer>
            <div
            style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                background: '#1e2127',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--tool-text-main)',
                border: '1px solid #555',
                pointerEvents: 'all',
                zIndex: 100 + index,
                whiteSpace: 'pre-wrap',
                textAlign: 'center',
                minWidth: '100px',
                maxWidth: '200px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
            }}
            className="nodrag nopan"
            >
            {label}
            </div>
        </EdgeLabelRenderer>
        </>
    );
}