'use client';

import React, { useMemo } from 'react';

interface Props {
    operator: string;
    target: number;
    margin: number;
    minCap: number;
    maxCap: number;
    pivot: number;
}

export default function ProbabilityChart({ operator, target, margin, minCap, maxCap, pivot }: Props) {
    
    // 1. GENERATE DATA POINTS
    const points = useMemo(() => {
        const data: { x: number, y: number }[] = [];
        
        // Determine X-Axis Range (Show a bit context around the action)
        // We go from (Target - Margin * 1.5) to (Target + Margin * 1.5)
        const startX = Math.max(0, Math.floor(target - (margin * 1.5)));
        const endX = Math.ceil(target + (margin * 1.5));
        const step = Math.max(1, Math.floor((endX - startX) / 50)); // 50 points resolution

        for (let x = startX; x <= endX; x += step) {
            data.push({ x, y: calculateChance(x, operator, target, margin, minCap, maxCap, pivot) });
        }
        return data;
    }, [operator, target, margin, minCap, maxCap, pivot]);

    // 2. SCALING HELPERS
    const width = 300;
    const height = 100;
    const padding = 10;

    const minX = points[0]?.x || 0;
    const maxX = points[points.length - 1]?.x || 100;
    const rangeX = maxX - minX || 1;

    const scaleX = (val: number) => ((val - minX) / rangeX) * (width - (padding * 2)) + padding;
    const scaleY = (val: number) => height - padding - ((val / 100) * (height - (padding * 2)));

    // 3. BUILD SVG PATH
    const pathD = points.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`
    ).join(' ');

    // 4. AREA FILL PATH (Close the loop to the bottom)
    const areaD = `${pathD} L ${scaleX(maxX)} ${height} L ${scaleX(minX)} ${height} Z`;

    return (
        <div style={{ 
            background: '#111', 
            border: '1px solid #333', 
            borderRadius: '4px', 
            marginBottom: '1rem',
            position: 'relative',
            height: height
        }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
                {/* Grid Lines */}
                <line x1={0} y1={scaleY(0)} x2={width} y2={scaleY(0)} stroke="#333" strokeWidth="1" />
                <line x1={0} y1={scaleY(50)} x2={width} y2={scaleY(50)} stroke="#333" strokeDasharray="4" />
                <line x1={0} y1={scaleY(100)} x2={width} y2={scaleY(100)} stroke="#333" strokeWidth="1" />

                {/* Target Marker */}
                <line x1={scaleX(target)} y1={0} x2={scaleX(target)} y2={height} stroke="#f1c40f" strokeDasharray="2" opacity="0.5" />
                <text x={scaleX(target)} y={10} fill="#f1c40f" fontSize="8" textAnchor="middle">Target ({target})</text>

                {/* The Curve */}
                <path d={areaD} fill="rgba(97, 175, 239, 0.2)" stroke="none" />
                <path d={pathD} fill="none" stroke="#61afef" strokeWidth="2" />
            </svg>
            
            {/* Axis Labels */}
            <div style={{ position: 'absolute', bottom: 2, left: 4, fontSize: '8px', color: '#666' }}>{minX}</div>
            <div style={{ position: 'absolute', bottom: 2, right: 4, fontSize: '8px', color: '#666' }}>{maxX}</div>
        </div>
    );
}

// --- MATH LOGIC (Mirrors GameEngine) ---
function calculateChance(skill: number, op: string, target: number, margin: number, min: number, max: number, pivot: number) {
    const lowerBound = target - margin;
    const upperBound = target + margin;
    const pivotDecimal = pivot / 100;
    let chance = 0;

    if (op === '>>' || op === '>=') {
        if (skill <= lowerBound) chance = 0;
        else if (skill >= upperBound) chance = 1;
        else if (skill < target) {
            const range = target - lowerBound;
            chance = range <= 0 ? 0.5 : ((skill - lowerBound) / range) * pivotDecimal;
        } else {
            const range = upperBound - target;
            chance = range <= 0 ? 0.5 : pivotDecimal + ((skill - target) / range) * (1 - pivotDecimal);
        }
    } 
    else if (op === '<<' || op === '<=') {
        // Calc as progressive then invert
        let inv = 0;
        if (skill <= lowerBound) inv = 0;
        else if (skill >= upperBound) inv = 1;
        else if (skill < target) {
            const range = target - lowerBound;
            inv = range <= 0 ? 0.5 : ((skill - lowerBound) / range) * pivotDecimal;
        } else {
            const range = upperBound - target;
            inv = range <= 0 ? 0.5 : pivotDecimal + ((skill - target) / range) * (1 - pivotDecimal);
        }
        chance = 1.0 - inv;
    }
    else if (op === '==') {
        const dist = Math.abs(skill - target);
        chance = dist >= margin ? 0 : 1.0 - (dist / margin);
    }
    else if (op === '!=') {
        const dist = Math.abs(skill - target);
        chance = dist >= margin ? 1.0 : (dist / margin);
    }

    let percent = chance * 100;
    return Math.max(min, Math.min(max, percent));
}