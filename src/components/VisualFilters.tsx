'use client';

export default function VisualFilters() {
    return (
        <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
            <defs>
                {/* FILTER: NOIR (High Contrast Grayscale + Grain) */}
                <filter id="filter-noir">
                    <feColorMatrix type="saturate" values="0" result="gray"/>
                    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" result="noise"/>
                    <feBlend in="noise" in2="gray" mode="overlay" result="grainy"/>
                    <feComponentTransfer in="grainy">
                         {/* Crush the blacks slightly */}
                        <feFuncR type="linear" slope="1.2" intercept="-0.1"/>
                        <feFuncG type="linear" slope="1.2" intercept="-0.1"/>
                        <feFuncB type="linear" slope="1.2" intercept="-0.1"/>
                    </feComponentTransfer>
                </filter>

                {/* FILTER: WATERCOLOR (Formerly Oil) - Smoother, painterly look */}
                <filter id="filter-oil">
                    {/* 1. Median Blur Simulation (Dilate then Erode removes fine noise) */}
                    <feMorphology operator="dilate" radius="2" result="dilated"/>
                    <feMorphology operator="erode" radius="2" in="dilated" result="smoothed"/>
                    {/* 2. Light Gaussian to blend the blocks */}
                    <feGaussianBlur stdDeviation="1" in="smoothed" result="blur"/>
                    {/* 3. Boost saturation to look like paint */}
                    <feColorMatrix type="saturate" values="1.5" in="blur"/>
                </filter>

                {/* FILTER: BLUEPRINT - Clean white lines on blue */}
                <filter id="filter-blueprint">
                    {/* 1. Detect Edges */}
                    <feConvolveMatrix order="3" kernelMatrix="1 -1 1 -1 -1 -1 1 -1 1" edgeMode="duplicate" result="edges"/>
                    {/* 2. Make lines white, background transparent */}
                    <feColorMatrix in="edges" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0" result="white-lines"/>
                    {/* 3. Blue Background Flood */}
                    <feFlood floodColor="#0055aa" result="blue-bg"/>
                    {/* 4. Composite Lines over Blue */}
                    <feComposite in="white-lines" in2="blue-bg" operator="over" />
                </filter>

                {/* FILTER: VHS - True Chromatic Aberration */}
                <filter id="filter-vhs">
                    {/* Shift Red Left */}
                    <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
                    <feOffset in="r" dx="-4" dy="0" result="r_shifted"/>
                    
                    {/* Shift Blue Right */}
                    <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/>
                    <feOffset in="b" dx="4" dy="0" result="b_shifted"/>
                    
                    {/* Green Center */}
                    <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g"/>

                    {/* Merge */}
                    <feBlend in="r_shifted" in2="g" mode="screen" result="rg"/>
                    <feBlend in="rg" in2="b_shifted" mode="screen" result="rgb"/>
                    
                    {/* Scanlines */}
                    <feTurbulence type="fractalNoise" baseFrequency="0 2" numOctaves="1" result="lines"/>
                    <feComposite operator="in" in="lines" in2="SourceGraphic" result="lines_masked"/>
                    <feBlend in="rgb" in2="lines_masked" mode="multiply" />
                </filter>

                {/* FILTER: GAMEBOY - Exact Palette Mapping */}
                <filter id="filter-gameboy">
                    <feColorMatrix type="saturate" values="0" result="gray"/>
                    {/* Map Luminance to the 4 specific GB Colors */}
                    <feComponentTransfer in="gray">
                        <feFuncR type="discrete" tableValues="0.05 0.18 0.54 0.60"/> {/* R channels of #0f380f, #306230, #8bac0f, #9bbc0f */}
                        <feFuncG type="discrete" tableValues="0.21 0.38 0.67 0.73"/> {/* G channels */}
                        <feFuncB type="discrete" tableValues="0.05 0.18 0.05 0.05"/> {/* B channels */}
                    </feComponentTransfer>
                </filter>

                {/* FILTER: 1-BIT - Absolute Threshold */}
                <filter id="filter-1bit">
                    <feColorMatrix type="saturate" values="0" result="gray"/>
                    <feComponentTransfer in="gray">
                        {/* Discrete 0 1 forces binary. No grays allowed. */}
                        <feFuncR type="discrete" tableValues="0 1"/>
                        <feFuncG type="discrete" tableValues="0 1"/>
                        <feFuncB type="discrete" tableValues="0 1"/>
                    </feComponentTransfer>
                </filter>

                 {/* FILTER: ELDRITCH - Ghostly/Spectral */}
                 <filter id="filter-eldritch">
                    {/* Desaturate and boost contrast */}
                    <feColorMatrix type="saturate" values="0" result="gray"/>
                    <feComponentTransfer in="gray" result="contrast">
                         <feFuncR type="linear" slope="2" intercept="-0.5"/>
                         <feFuncG type="linear" slope="2" intercept="-0.5"/>
                         <feFuncB type="linear" slope="2" intercept="-0.5"/>
                    </feComponentTransfer>
                    {/* Create a blurred copy */}
                    <feGaussianBlur in="contrast" stdDeviation="5" result="blur"/>
                    {/* Invert the blur and tint it cyan (Spectral look) */}
                    <feColorMatrix in="blur" type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 0.6 0" result="glow"/>
                    {/* Blend them */}
                    <feBlend in="contrast" in2="glow" mode="screen"/>
                </filter>
            </defs>
        </svg>
    );
}