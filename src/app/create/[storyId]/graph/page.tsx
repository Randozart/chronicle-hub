'use client';

import { useState, useEffect, useMemo } from 'react';
// IMPORT Node and Edge types
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { generateGraph } from '@/engine/graphAnalysis';
import { QualityDefinition } from '@/engine/models';
import SelfLoopEdge from '@/components/admin/SelfLoopEdge';

export default function GraphPage({ params }: { params: Promise<{ storyId: string }> }) {
    const [storyId, setStoryId] = useState<string>("");
    
    // FIX: Add explicit generics <Node> and <Edge>
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    
    // Data
    const [storylets, setStorylets] = useState<Record<string, any>>({});
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    
    // Filters
    const [mode, setMode] = useState<'redirect' | 'quality'>('redirect');
    const [selectedQuality, setSelectedQuality] = useState<string>("");

    const edgeTypes = useMemo(() => ({
        selfloop: SelfLoopEdge,
    }), []);
    
    // 1. Unwrap Params & Fetch Data
    useEffect(() => {
        params.then(p => {
        setStoryId(p.storyId);
        
        console.log("Fetching graph data for:", p.storyId); // <--- DEBUG 1

        Promise.all([
            fetch(`/api/admin/storylets?storyId=${p.storyId}&full=true`).then(r => r.json()),
            fetch(`/api/admin/qualities?storyId=${p.storyId}`).then(r => r.json())
        ]).then(([sData, qData]) => {
            
            console.log("Raw API Response:", sData); // <--- DEBUG 2

            const sRecord: any = {};
            if(Array.isArray(sData)) {
                sData.forEach((s: any) => sRecord[s.id] = s);
                setStorylets(sRecord); // This triggers the next useEffect
                } else {
                    console.error("API Error - Expected Array:", sData);
                }
                setStorylets(sRecord);
                
                if(Array.isArray(qData) || typeof qData === 'object') {
                    const qList = Object.values(qData);
                    setQualities(qList as QualityDefinition[]);
                    
                    const firstStat = qList.find((q: any) => q.type === 'P');
                    if (firstStat) setSelectedQuality((firstStat as any).id);
                }
            }).catch(err => console.error("Fetch Failed:", err));
        });
    }, []);

    // 2. Generate Graph
    useEffect(() => {
        if (Object.keys(storylets).length === 0) return;

        const { nodes: gNodes, edges: gEdges } = generateGraph(storylets, mode, selectedQuality);
        
        // DEBUG LOG
        console.log("Graph Generated:", { 
            storyletCount: Object.keys(storylets).length,
            nodes: gNodes.length, 
            edges: gEdges.length 
        });

        // Simple Grid Layout
        const layoutNodes = gNodes.map((node, index) => ({
            ...node,
            position: { x: (index % 5) * 250, y: Math.floor(index / 5) * 150 }
        }));

        setNodes(layoutNodes);
        setEdges(gEdges);

    }, [storylets, mode, selectedQuality, setNodes, setEdges]); // Added setters to dependency array

    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            
            {/* HEADER */}
            <div style={{ padding: '1rem', borderBottom: '1px solid #444', background: '#181a1f', display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Narrative Graph</h2>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                        onClick={() => setMode('redirect')}
                        style={{ 
                            padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                            background: mode === 'redirect' ? '#61afef' : '#333', color: 'white'
                        }}
                    >
                        Redirects
                    </button>
                    <button 
                        onClick={() => setMode('quality')}
                        style={{ 
                            padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                            background: mode === 'quality' ? '#61afef' : '#333', color: 'white'
                        }}
                    >
                        Quality Logic
                    </button>
                </div>

                {mode === 'quality' && (
                    <select 
                        className="form-select" 
                        value={selectedQuality} 
                        onChange={e => setSelectedQuality(e.target.value)}
                        style={{ width: '200px', padding: '0.4rem' }}
                    >
                        {qualities.map(q => (
                            <option key={q.id} value={q.id}>{q.name} ({q.id})</option>
                        ))}
                    </select>
                )}
            </div>

            {/* CANVAS */}
            <div style={{ flex: 1, background: '#111' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    edgeTypes={edgeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    colorMode="dark"
                >
                    <Background />
                    <Controls />
                    <MiniMap style={{ background: '#222' }} nodeColor={() => '#61afef'} />
                </ReactFlow>
            </div>
        </div>
    );
}