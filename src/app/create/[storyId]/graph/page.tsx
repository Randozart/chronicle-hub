'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { generateGraph } from '@/engine/graphAnalysis';
import { QualityDefinition } from '@/engine/models';
import SelfLoopEdge from '@/components/admin/SelfLoopEdge';
import GraphNode from '@/components/admin/GraphNode';

// Define Data Interface
interface NodeData {
    label: string;
    description: string;
    originalId: string;
}

export default function GraphPage({ params }: { params: Promise<{ storyId: string }> }) {
    const [storyId, setStoryId] = useState<string>("");
    
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    
    const [storylets, setStorylets] = useState<Record<string, any>>({});
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    
    const [mode, setMode] = useState<'redirect' | 'quality'>('redirect');
    const [selectedQuality, setSelectedQuality] = useState<string>("");
    const [showSelfLoops, setShowSelfLoops] = useState(true);

    // Interaction State
    const [hoveredData, setHoveredData] = useState<NodeData | null>(null);
    const [lockedData, setLockedData] = useState<NodeData | null>(null);

    // Priority: Locked data overrides Hover data
    const activeData = lockedData || hoveredData;
    const isLocked = !!lockedData;

    const nodeTypes = useMemo(() => ({ custom: GraphNode }), []);
    const edgeTypes = useMemo(() => ({ selfloop: SelfLoopEdge }), []);

    useEffect(() => {
        params.then(p => {
            setStoryId(p.storyId);
            Promise.all([
                fetch(`/api/admin/storylets?storyId=${p.storyId}&full=true`).then(r => r.json()),
                fetch(`/api/admin/qualities?storyId=${p.storyId}`).then(r => r.json())
            ]).then(([sData, qData]) => {
                if (Array.isArray(sData)) {
                    const sRecord: any = {};
                    sData.forEach((s: any) => sRecord[s.id] = s);
                    setStorylets(sRecord);
                }
                if (Array.isArray(qData) || typeof qData === 'object') {
                    const qList = Object.values(qData);
                    setQualities(qList as QualityDefinition[]);
                    const firstStat = qList.find((q: any) => q.type === 'P');
                    if (firstStat) setSelectedQuality((firstStat as any).id);
                }
            });
        });
    }, []);

    useEffect(() => {
        if (!storylets || Object.keys(storylets).length === 0) return;
        const { nodes: gNodes, edges: gEdges } = generateGraph(storylets, mode, selectedQuality, showSelfLoops);
        setNodes(gNodes);
        setEdges(gEdges);
        setLockedData(null); // Reset selection on graph change
    }, [storylets, mode, selectedQuality, showSelfLoops, setNodes, setEdges]);

    // --- HANDLERS (Wrapped in useCallback for React Flow stability) ---
    
    const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
        // Only update if we aren't already locked (optimization)
        if (!lockedData && node.data) {
            setHoveredData(node.data as unknown as NodeData);
        }
    }, [lockedData]);

    const onNodeMouseLeave = useCallback(() => {
        // Only clear if not locked
        if (!lockedData) {
            setHoveredData(null);
        }
    }, [lockedData]);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        // Click locks the selection
        const newData = node.data as unknown as NodeData;
        setLockedData(newData);
        setHoveredData(null); 
    }, []);

    const onPaneClick = useCallback(() => {
        // Click background to unlock
        setLockedData(null);
        setHoveredData(null);
    }, []);

    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            
            {/* HEADER */}
            <div style={{ padding: '1rem', borderBottom: '1px solid #444', background: '#181a1f', display: 'flex', gap: '2rem', alignItems: 'center', zIndex: 20 }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Narrative Graph</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setMode('redirect')} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer', background: mode === 'redirect' ? '#61afef' : '#333', color: 'white' }}>Redirects</button>
                    <button onClick={() => setMode('quality')} style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer', background: mode === 'quality' ? '#61afef' : '#333', color: 'white' }}>Quality Logic</button>
                </div>
                {mode === 'quality' && (
                    <select className="form-select" value={selectedQuality} onChange={e => setSelectedQuality(e.target.value)} style={{ width: '200px', padding: '0.4rem' }}>
                        {qualities.map(q => <option key={q.id} value={q.id}>{q.name} ({q.id})</option>)}
                    </select>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ccc', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showSelfLoops} onChange={e => setShowSelfLoops(e.target.checked)} /> Show Loops
                </label>
            </div>

            {/* CANVAS AREA */}
            <div style={{ flex: 1, background: '#111', position: 'relative' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    
                    // Wire up handlers
                    onNodeClick={onNodeClick}
                    onNodeMouseEnter={onNodeMouseEnter}
                    onNodeMouseLeave={onNodeMouseLeave}
                    onPaneClick={onPaneClick}
                    
                    fitView
                    colorMode="dark"
                    minZoom={0.1}
                >
                    <Background />
                    <Controls />
                    <MiniMap style={{ background: '#222' }} nodeColor={() => '#61afef'} />
                </ReactFlow>

                {/* INSPECTOR PANEL */}
                {activeData && (
                    <div style={{ 
                        position: 'absolute', top: '1rem', right: '1rem', width: '370px', 
                        background: 'rgba(30, 33, 39, 0.95)', backdropFilter: 'blur(10px)',
                        border: isLocked ? '1px solid #61afef' : '1px solid #555', 
                        borderRadius: '8px', padding: '0', // Padding handled inside
                        boxShadow: '0 10px 30px rgba(0,0,0,0.6)', 
                        zIndex: 50, maxHeight: '80vh', overflowY: 'auto',
                        pointerEvents: isLocked ? 'auto' : 'none',
                        transition: 'opacity 0.2s',
                        display: 'flex', flexDirection: 'column'
                    }}>
                        {/* Panel Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', padding: '1rem', borderBottom: '1px solid #444', background: 'rgba(0,0,0,0.2)' }}>
                            <div>
                                <span style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Selected Node</span>
                                <h3 style={{ margin: '0.25rem 0 0 0', color: '#fff', fontSize: '1.1rem' }}>{activeData.label}</h3>
                            </div>
                            {isLocked && <button onClick={() => setLockedData(null)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>}
                        </div>
                        
                        {/* Panel Content */}
                        <div style={{ padding: '1rem' }}>
                            {activeData.description ? (
                                <div style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                                    {activeData.description.split('\n').map((line, i) => {
                                        
                                        // Case 1: Section Headers (--- TEXT ---)
                                        if (line.startsWith('---')) {
                                            return (
                                                <div key={i} style={{ 
                                                    color: '#61afef', 
                                                    fontWeight: 'bold', 
                                                    fontSize: '0.75rem',
                                                    marginTop: '1.5rem', 
                                                    marginBottom: '0.5rem',
                                                    borderBottom: '1px solid #444',
                                                    paddingBottom: '4px',
                                                    letterSpacing: '1px'
                                                }}>
                                                    {line.replace(/-/g, '').trim()}
                                                </div>
                                            );
                                        }
                                        
                                        // Case 2: Empty lines
                                        if (!line.trim()) return null;

                                        // Case 3: Detail Items
                                        // We check if it's a sub-item (starts with space from analyzer) or main item
                                        return (
                                            <div key={i} style={{ 
                                                marginBottom: '6px', 
                                                color: line.includes('↳') ? '#aaa' : '#ddd', // Dim arrow lines
                                                paddingLeft: line.includes('↳') ? '12px' : '0',
                                                fontFamily: 'monospace'
                                            }}>
                                                {line}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#666', fontStyle: 'italic', fontSize: '0.9rem' }}>
                                    No logic dependencies found for the selected quality in this node.
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div style={{ borderTop: '1px solid #444', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                            {isLocked ? (
                                <a 
                                    href={`/create/${storyId}/storylets?id=${activeData.originalId}`} 
                                    target="_blank"
                                    className="save-btn" 
                                    style={{ display: 'block', textDecoration: 'none', fontSize: '0.8rem', textAlign: 'center', width: '100%', boxSizing: 'border-box'}}
                                >
                                    Edit Storylet ↗
                                </a>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#666', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                    Click node to lock & edit
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}