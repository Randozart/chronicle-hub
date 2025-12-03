import React from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps } from '@xyflow/react';

export default function SelfLoopEdge({
  sourceX,
  sourceY,
  style = {},
  markerEnd,
  label,
  data, // <--- Receive data
}: EdgeProps) {
  
  // Default to 0 if missing
  const index = (data?.offsetIndex as number) || 0;

  // Base Geometry
  // Each subsequent loop gets wider and higher
  const radiusX = 60 + (index * 20); 
  const radiusY = 60 + (index * 25); 
  
  const startX = sourceX + 10; // Shift right slightly to avoid overlapping left-side inputs
  const startY = sourceY - 10; 

  const endX = sourceX + 150 + (index * 10); 
  const endY = sourceY + 20 + (index * 20); // Stack endpoints vertically slightly

  // Bezier Control Points
  // Pull higher based on index to separate the lines
  const cp1X = startX + (index * 10);
  const cp1Y = startY - radiusY; 
  
  const cp2X = endX + radiusX;
  const cp2Y = endY - radiusY;
  
  const edgePath = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

  // Calculate Label Position
  // Push the label up higher for outer loops so they don't overlap inner loops
  const labelX = startX + 60 + (index * 15);
  const labelY = startY - 60 - (index * 30); // <--- Moves UP significantly per index

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
            color: '#ccc',
            border: '1px solid #555',
            pointerEvents: 'all',
            zIndex: 100 + index, // Ensure outer labels sit on top
            whiteSpace: 'pre-wrap',
            textAlign: 'center',
            minWidth: '120px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.5)' // Add shadow to separate from lines behind it
          }}
          className="nodrag nopan"
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}