// src/components/admin/ProbabilityChart.tsx

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
    const points = useMemo(() => {
        const data: { x: number, y: number }[] = [];
        const effectiveMargin = Math.max(10, margin);
        const startX = Math.max(0, Math.floor(target - (effectiveMargin * 1.5)));
        const endX = Math.ceil(target + (effectiveMargin * 1.5));
        const step = Math.max(0.5, (endX - startX) / 100); 

        for (let x = startX; x <= endX; x += step) {
            data.push({ x, y: calculateChance(x, operator, target, margin, minCap, maxCap, pivot) });
        }
        return data;
    }, [operator, target, margin, minCap, maxCap, pivot]);
    const width = 100;
    const height = 50;
    const padding = 2;

    const minX = points[0]?.x || 0;
    const maxX = points[points.length - 1]?.x || 100;
    const rangeX = maxX - minX || 1;

    const scaleX = (val: number) => ((val - minX) / rangeX) * (width - (padding * 2)) + padding;
    const scaleY = (val: number) => height - padding - ((val / 100) * (height - (padding * 2)));
    const pathD = points.map((p, i) => 
        `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`
    ).join(' ');

    const areaD = `${pathD} L ${scaleX(maxX)} ${height} L ${scaleX(minX)} ${height} Z`;

    return (
        <div style={{ 
            background: '#111', 
            border: '1px solid #333', 
            borderRadius: '4px', 
            position: 'relative',
            width: '100%',
            aspectRatio: '2/1'
        }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <line x1={0} y1={scaleY(0)} x2={width} y2={scaleY(0)} stroke="#333" strokeWidth="0.2" />
                <line x1={0} y1={scaleY(50)} x2={width} y2={scaleY(50)} stroke="#333" strokeWidth="0.2" strokeDasharray="2" />
                <line x1={0} y1={scaleY(100)} x2={width} y2={scaleY(100)} stroke="#333" strokeWidth="0.2" />
                {minCap > 0 && (
                    <line x1={0} y1={scaleY(minCap)} x2={width} y2={scaleY(minCap)} stroke="#e74c3c" strokeWidth="0.3" strokeDasharray="1" opacity="0.7" />
                )}
                {maxCap < 100 && (
                    <line x1={0} y1={scaleY(maxCap)} x2={width} y2={scaleY(maxCap)} stroke="#e74c3c" strokeWidth="0.3" strokeDasharray="1" opacity="0.7" />
                )}
                <line x1={scaleX(target)} y1={0} x2={scaleX(target)} y2={height} stroke="#f1c40f" strokeWidth="0.3" strokeDasharray="2" opacity="0.5" />
                <path d={areaD} fill="rgba(97, 175, 239, 0.2)" stroke="none" />
                <path d={pathD} fill="none" stroke="#61afef" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
            </svg>
            
            <div style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', fontSize: '10px', color: '#f1c40f' }}>Target {target}</div>
            <div style={{ position: 'absolute', bottom: 2, left: 4, fontSize: '10px', color: '#666' }}>{minX}</div>
            <div style={{ position: 'absolute', bottom: 2, right: 4, fontSize: '10px', color: '#666' }}>{maxX}</div>
        </div>
    );
}
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
    else if (op === '==' || op === '><') {
        const dist = Math.abs(skill - target);
        if (dist >= margin) {
            chance = 0;
        } else {
            chance = 1.0 - (dist / margin);
        }
    }
    else if (op === '!=' || op === '<>') {
        const dist = Math.abs(skill - target);
        if (dist >= margin) {
            chance = 1.0;
        } else {
            chance = (dist / margin);
        }
    }

    let percent = chance * 100;
    return Math.max(min, Math.min(max, percent));
}