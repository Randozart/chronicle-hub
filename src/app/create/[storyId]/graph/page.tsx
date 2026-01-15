// src/app/create/[storyId]/graph/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, Node, Edge, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { generateGraph } from '@/engine/graphAnalysis';
import { QualityDefinition, Storylet, ResolveOption } from '@/engine/models';
import SelfLoopEdge from '@/components/admin/SelfLoopEdge';
import GraphNode from '@/components/admin/GraphNode';
import GraphContextMenu from '@/components/admin/GraphContextMenu';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/providers/ToastProvider';

interface NodeData {
    label: string;
    description: string;
    originalId: string;
}

export default function GraphPage({ params }: { params: Promise<{ storyId: string }> }) {
    return (
        <ReactFlowProvider>
            <GraphContent params={params} />
        </ReactFlowProvider>
    );
}

function GraphContent({ params }: { params: Promise<{ storyId: string }> }) {
    const { screenToFlowPosition } = useReactFlow();
    const { showToast } = useToast();
    const [storyId, setStoryId] = useState<string>("");
    
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    
    const [storylets, setStorylets] = useState<Record<string, Storylet>>({});
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    
    const [mode, setMode] = useState<'redirect' | 'quality'>('redirect');
    const [selectedQuality, setSelectedQuality] = useState<string>("");
    const [showSelfLoops, setShowSelfLoops] = useState(true);

    const [hoveredData, setHoveredData] = useState<NodeData | null>(null);
    const [lockedData, setLockedData] = useState<NodeData | null>(null);
    const activeData = lockedData || hoveredData;
    const isLocked = !!lockedData;

    const [menu, setMenu] = useState<{ x: number, y: number, type: 'pane' | 'node', nodeId?: string } | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const nodeTypes = useMemo(() => ({ custom: GraphNode }), []);
    const edgeTypes = useMemo(() => ({ selfloop: SelfLoopEdge }), []);

    const fetchData = useCallback(async (sId: string) => {
        try {
            const [sRes, qRes] = await Promise.all([
                fetch(`/api/admin/storylets?storyId=${sId}&full=true`),
                fetch(`/api/admin/qualities?storyId=${sId}`)
            ]);

            const sData = await sRes.json();
            const qData = await qRes.json();

            if (Array.isArray(sData)) {
                const sRecord: any = {};
                sData.forEach((s: any) => sRecord[s.id] = s);
                setStorylets(sRecord);
            }

            let qList: QualityDefinition[] = [];
            if (Array.isArray(qData)) {
                qList = qData;
            } else if (qData && typeof qData === 'object') {
                qList = Object.values(qData);
            }
            setQualities(qList);

            if (qList.length > 0) {
                const firstStat = qList.find((q: any) => q.type === 'P');
                setSelectedQuality((prev) => {
                    if (prev && qList.find(q => q.id === prev)) return prev;
                    return firstStat ? firstStat.id : qList[0].id;
                });
            }
        } catch (e) {
            console.error("Graph Fetch Error:", e);
        }
    }, []);

    useEffect(() => {
        params.then(p => { 
            setStoryId(p.storyId); 
            fetchData(p.storyId); 
        });
    }, []);

    useEffect(() => {
        if (qualities.length > 0 && !selectedQuality) {
            const firstStat = qualities.find((q: any) => q.type === 'P');
            if (firstStat) setSelectedQuality(firstStat.id);
            else setSelectedQuality(qualities[0].id);
        }
    }, [qualities]);

    useEffect(() => {
        if (!storylets || Object.keys(storylets).length === 0) return;
        const { nodes: gNodes, edges: gEdges } = generateGraph(storylets, mode, selectedQuality, showSelfLoops);
        setNodes(gNodes);
        setEdges(gEdges);
    }, [storylets, mode, selectedQuality, showSelfLoops, setNodes, setEdges]);

    const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
        if (!lockedData && node.data) setHoveredData(node.data as unknown as NodeData);
    }, [lockedData]);

    const onNodeMouseLeave = useCallback(() => {
        if (!lockedData) setHoveredData(null);
    }, [lockedData]);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        const newData = node.data as unknown as NodeData;
        setLockedData(newData);
        setHoveredData(null); 
    }, []);

    const onPaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
        event.preventDefault();
        setMenu({ x: (event as React.MouseEvent).clientX, y: (event as React.MouseEvent).clientY, type: 'pane' });
    }, []);

    const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        setLockedData(node.data as unknown as NodeData);
        setMenu({ x: event.clientX, y: event.clientY, type: 'node', nodeId: node.id });
    }, []);

    const onPaneClick = useCallback(() => {
        setMenu(null);
        setLockedData(null);
        setHoveredData(null);
    }, []);

    const handleMenuAction = async (action: string) => {
        if (!menu) return;
        const { x, y, nodeId } = menu;
        setMenu(null); 

        const saveStorylet = async (s: Storylet) => {
            await fetch('/api/admin/storylets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, data: s })
            });
            fetchData(storyId);
        };

        if (action === 'create_node') {
            const name = prompt("New Storylet Name:");
            if (!name) return;
            const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            await saveStorylet({ id, name, text: "Write something...", options: [], tags: [], status: 'draft' });
            showToast("Node created", "success");
        }

        if (action === 'link_new_redirect' && nodeId) {
            const source = storylets[nodeId];
            if (!source) return;
            const name = prompt("Name of Next Step:");
            if (!name) return;
            const targetId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            await saveStorylet({ id: targetId, name, text: "...", options: [], tags: [], status: 'draft' });
            
            const newOption: ResolveOption = {
                id: `opt_${uuidv4().slice(0,8)}`,
                name: `Go to ${name}`,
                pass_long: "You move onward.",
                pass_redirect: targetId,
                action_cost: "1"
            };
            await saveStorylet({ ...source, options: [...source.options, newOption] });
            showToast("Linked new storylet", "success");
        }

        if (action === 'link_new_quality' && nodeId) {
            const source = storylets[nodeId];
            if (!source || !selectedQuality) return alert("Select a quality first");
            const levelStr = prompt("Level Requirement for Next Step:", "20");
            if (!levelStr) return;
            const nextLevel = parseInt(levelStr);
            const targetId = `${nodeId}_${nextLevel}`;

            await saveStorylet({
                id: targetId, name: `${source.name} (II)`, 
                text: "...", 
                visible_if: `$${selectedQuality} >= ${nextLevel}`,
                options: [], tags: [], status: 'draft'
            });

            const newOption: ResolveOption = {
                id: `opt_${uuidv4().slice(0,8)}`,
                name: `Advance ${selectedQuality}`,
                pass_long: "Progress.",
                pass_quality_change: `$${selectedQuality} = ${nextLevel}`,
                action_cost: "1"
            };
            await saveStorylet({ ...source, options: [...source.options, newOption] });
            showToast("Logic branch created", "success");
        }

        if (action === 'edit_node' && nodeId) {
            const originalId = lockedData?.originalId || nodeId; 
            window.open(`/create/${storyId}/storylets?id=${originalId}`, '_blank');
        }
    };

    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }} ref={ref}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #444', background: 'var(--tool-bg-input)', display: 'flex', gap: '2rem', alignItems: 'center', zIndex: 20 }}>
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--tool-text-main)', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showSelfLoops} onChange={e => setShowSelfLoops(e.target.checked)} /> Show Loops
                </label>
            </div>
            
            <div style={{ flex: 1, background: '#111', position: 'relative' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    onNodeMouseEnter={onNodeMouseEnter}
                    onNodeMouseLeave={onNodeMouseLeave}
                    onPaneContextMenu={onPaneContextMenu}
                    onNodeContextMenu={onNodeContextMenu}
                    onPaneClick={onPaneClick}
                    fitView
                    colorMode="dark"
                >
                    <Background />
                    <Controls />
                    <MiniMap style={{ background: '#222' }} nodeColor={() => '#61afef'} />
                </ReactFlow>
                {activeData && (
                    <div style={{ 
                        position: 'absolute', top: '1rem', right: '1rem', width: '320px', 
                        background: 'rgba(30, 33, 39, 0.95)', backdropFilter: 'blur(10px)',
                        border: isLocked ? '1px solid #61afef' : '1px solid #555', 
                        borderRadius: '8px', padding: '0', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.6)', 
                        zIndex: 50, maxHeight: '80vh', overflowY: 'auto',
                        pointerEvents: isLocked ? 'auto' : 'none', 
                        transition: 'opacity 0.2s',
                        display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', padding: '1rem', borderBottom: '1px solid #444', background: 'rgba(0,0,0,0.2)' }}>
                            <div>
                                <span style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Selected Node</span>
                                <h3 style={{ margin: '0.25rem 0 0 0', color: 'var(--tool-text-header)', fontSize: '1.1rem' }}>{activeData.label}</h3>
                            </div>
                            {isLocked && <button onClick={() => setLockedData(null)} style={{ background: 'none', border: 'none', color: 'var(--tool-text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>}
                        </div>
                        
                        <div style={{ padding: '1rem' }}>
                            {activeData.description ? (
                                <div style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                                    {activeData.description.split('\n').map((line, i) => {
                                        if (line.startsWith('---')) {
                                            return <div key={i} style={{ color: '#61afef', fontWeight: 'bold', fontSize: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem', borderBottom: '1px solid #444', paddingBottom: '4px', letterSpacing: '1px' }}>{line.replace(/-/g, '').trim()}</div>;
                                        }
                                        if (!line.trim()) return null;
                                        return (
                                            <div key={i} style={{ marginBottom: '6px', color: line.includes('↳') ? '#aaa' : '#ddd', paddingLeft: line.includes('↳') ? '12px' : '0', fontFamily: 'monospace' }}>
                                                {line}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#666', fontStyle: 'italic', fontSize: '0.9rem' }}>
                                    No logic dependencies found for {selectedQuality}.
                                </div>
                            )}
                        </div>
                        <div style={{ borderTop: '1px solid #444', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
                            {isLocked ? (
                                <a 
                                    href={`/create/${storyId}/storylets?id=${activeData.originalId}`} 
                                    target="_blank"
                                    className="save-btn" 
                                    style={{ display: 'block', textDecoration: 'none', fontSize: '0.8rem', textAlign: 'center', width: '100%' }}
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
                {menu && (
                    <GraphContextMenu 
                        x={menu.x} 
                        y={menu.y} 
                        type={menu.type} 
                        graphMode={mode}
                        onClose={() => setMenu(null)} 
                        onAction={handleMenuAction}
                    />
                )}
                <div style={{ position: 'absolute', bottom: 20, left: 20, background: 'rgba(0,0,0,0.8)', padding: '1rem', borderRadius: '8px', border: '1px solid #444', zIndex: 10, fontSize: '0.8rem', color: 'var(--tool-text-main)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--tool-text-header)' }}>Legend</h4>
                    {mode === 'redirect' ? (
                        <div style={{ display: 'grid', gap: '5px' }}>
                            <div style={{display:'flex', gap:'5px', alignItems:'center'}}><div style={{width:10, height:10, background:'#2ecc71', borderRadius:'50%'}}/> Pass</div>
                            <div style={{display:'flex', gap:'5px', alignItems:'center'}}><div style={{width:10, height:10, background:'#e74c3c', borderRadius:'50%'}}/> Fail</div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '5px' }}>
                            <div style={{display:'flex', gap:'5px', alignItems:'center'}}><div style={{width:10, height:10, border:'2px solid #2ecc71'}}/> Producer</div>
                            <div style={{display:'flex', gap:'5px', alignItems:'center'}}><div style={{width:10, height:10, border:'2px solid #e74c3c'}}/> Consumer</div>
                            <div style={{display:'flex', gap:'5px', alignItems:'center'}}><div style={{width:10, height:10, border:'2px solid #f1c40f'}}/> Hub</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}