'use client';

export default function VisualFilters() {
    return (
        <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
            <defs>
                <filter id="filter-noir">
                    <feColorMatrix type="saturate" values="0" result="gray"/>
                    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" result="noise"/>
                    <feBlend in="noise" in2="gray" mode="overlay" result="grainy"/>
                    <feComponentTransfer in="grainy">
                        <feFuncR type="linear" slope="1.2" intercept="-0.1"/>
                        <feFuncG type="linear" slope="1.2" intercept="-0.1"/>
                        <feFuncB type="linear" slope="1.2" intercept="-0.1"/>
                    </feComponentTransfer>
                </filter>
                <filter id="filter-oil">
                    <feMorphology operator="dilate" radius="2" result="dilated"/>
                    <feMorphology operator="erode" radius="2" in="dilated" result="smoothed"/>
                    <feGaussianBlur stdDeviation="1" in="smoothed" result="blur"/>
                    <feColorMatrix type="saturate" values="1.5" in="blur"/>
                </filter>
                <filter id="filter-blueprint">
                    <feConvolveMatrix order="3" kernelMatrix="1 -1 1 -1 -1 -1 1 -1 1" edgeMode="duplicate" result="edges"/>
                    <feColorMatrix in="edges" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0" result="white-lines"/>
                    <feFlood floodColor="#0055aa" result="blue-bg"/>
                    <feComposite in="white-lines" in2="blue-bg" operator="over" />
                </filter>
                <filter id="filter-vhs">
                    <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
                    <feOffset in="r" dx="-4" dy="0" result="r_shifted"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/>
                    <feOffset in="b" dx="4" dy="0" result="b_shifted"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g"/>
                    <feBlend in="r_shifted" in2="g" mode="screen" result="rg"/>
                    <feBlend in="rg" in2="b_shifted" mode="screen" result="rgb"/>
                    <feTurbulence type="fractalNoise" baseFrequency="0 2" numOctaves="1" result="lines"/>
                    <feComposite operator="in" in="lines" in2="SourceGraphic" result="lines_masked"/>
                    <feBlend in="rgb" in2="lines_masked" mode="multiply" />
                </filter>
                <filter id="filter-gameboy">
                    <feColorMatrix type="saturate" values="0" result="gray"/>
                    <feComponentTransfer in="gray">
                        <feFuncR type="discrete" tableValues="0.05 0.18 0.54 0.60"/> {/* R channels of #0f380f, #306230, #8bac0f, #9bbc0f */}
                        <feFuncG type="discrete" tableValues="0.21 0.38 0.67 0.73"/> {/* G channels */}
                        <feFuncB type="discrete" tableValues="0.05 0.18 0.05 0.05"/> {/* B channels */}
                    </feComponentTransfer>
                </filter>
                <filter id="filter-1bit">
                    <feColorMatrix type="saturate" values="0" result="gray"/>
                    <feComponentTransfer in="gray">
                        <feFuncR type="discrete" tableValues="0 1"/>
                        <feFuncG type="discrete" tableValues="0 1"/>
                        <feFuncB type="discrete" tableValues="0 1"/>
                    </feComponentTransfer>
                </filter>
                 <filter id="filter-eldritch">
                    <feColorMatrix type="saturate" values="0" result="gray"/>
                    <feComponentTransfer in="gray" result="contrast">
                         <feFuncR type="linear" slope="2" intercept="-0.5"/>
                         <feFuncG type="linear" slope="2" intercept="-0.5"/>
                         <feFuncB type="linear" slope="2" intercept="-0.5"/>
                    </feComponentTransfer>
                    <feGaussianBlur in="contrast" stdDeviation="5" result="blur"/>
                    <feColorMatrix in="blur" type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 0.6 0" result="glow"/>
                    <feBlend in="contrast" in2="glow" mode="screen"/>
                </filter>
            </defs>
        </svg>
    );
}