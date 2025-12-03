import { Handle, Position, NodeProps } from '@xyflow/react';

export default function GraphNode({ data, isConnectable }: NodeProps) {
  const { label, role } = data as any;

  let borderColor = '#555';
  let badge = null;

  if (role === 'producer') {
    borderColor = '#2ecc71';
    badge = <span style={{color: '#2ecc71', fontSize: '9px', display:'block', marginTop:'2px'}}>PRODUCER</span>;
  } else if (role === 'consumer') {
    borderColor = '#e74c3c';
    badge = <span style={{color: '#e74c3c', fontSize: '9px', display:'block', marginTop:'2px'}}>CONSUMER</span>;
  } else if (role === 'hub') {
    borderColor = '#f1c40f';
    badge = <span style={{color: '#f1c40f', fontSize: '9px', display:'block', marginTop:'2px'}}>HUB</span>;
  }

  return (
    <div 
      className="graph-node" 
      style={{ 
        background: '#1e2127', 
        border: `2px solid ${borderColor}`, 
        borderRadius: '4px',
        padding: '8px',
        width: '180px', // Fixed width for consistent layout
        color: '#fff',
        fontSize: '12px',
        textAlign: 'center',
        position: 'relative',
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
      }}
    >
      {/* Input: Left */}
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} style={{width:'8px', height:'8px', background:'#777'}} />
      
      <div style={{ fontWeight: 'bold', lineHeight: '1.2' }}>{label}</div>
      {badge}

      {/* Output: Right (Standard Flow) */}
      <Handle type="source" position={Position.Right} id="right" isConnectable={isConnectable} style={{width:'8px', height:'8px', background:'#777'}} />
      
      {/* Output: Top (For Self Loops) */}
      <Handle type="source" position={Position.Top} id="top" style={{ left: '85%', background: 'transparent', border: 'none' }} />
    </div>
  );
}