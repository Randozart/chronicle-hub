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
    // --- GEOMETRY TWEAKS ---
    
    // 1. The Arch Height (Grows significantly with index)
    // This pushes outer loops higher up so they don't overlap inner ones
    const archHeight = 90 + (index * 35); 
    
    // 2. The Width (Grows slightly)
    const archWidth = 50 + (index * 10);

    // 3. Start/End Points (Anchored to Top-Right of node)
    // We assume sourceX/Y is roughly Top-Center.
    
    const startX = sourceX + 50  + (index * 5); 
    const startY = sourceY - 20; 

    // END POINT: 
    // Previously this drifted down (+Y). Now we keep it relatively level 
    // with the start, just shifted right, to create a "Top-Right Ear".
    const endX = sourceX -50 - (index * 5); // Shift right slightly per index to prevent arrowhead collision
    const endY = sourceY -20; // Keep it near the top edge

    // 4. Bezier Control Points
    // Pull the curve UP (Negative Y)
    const cp1X = startX + 20;
    const cp1Y = startY - archHeight; // Go UP
    
    const cp2X = endX - 20;
    const cp2Y = endY - archHeight;   // Go UP
    
    const edgePath = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

    // 5. Label Position
    // Positioned at the apex of the arch
    // We push it up slightly more than the arch height to float above the line
    const labelX = startX - (archWidth / 2) - 30;
    const labelY = startY - archHeight + 20;

    return (
        <>
        <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
        <EdgeLabelRenderer>
            <div
            style={{
                position: 'absolute',
                // Center the label on the calculated point
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                
                // Visuals
                background: '#1e2127',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--tool-text-main)',
                border: '1px solid #555',
                
                // Interaction
                pointerEvents: 'all',
                zIndex: 100 + index, // Outer labels on top
                whiteSpace: 'pre-wrap',
                textAlign: 'center',
                minWidth: '100px',
                maxWidth: '200px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)' // Stronger shadow for readability
            }}
            className="nodrag nopan"
            >
            {label}
            </div>
        </EdgeLabelRenderer>
        </>
    );
}