// src/app/api/image_composer/utils/svgDimensions.ts
/**
 * Extracts width and height from SVG buffer by parsing viewBox attribute
 * Defaults to 512x512 for game icons if viewBox not found or invalid
 */
export function extractSvgDimensions(svgBuffer: Buffer): { width: number; height: number } {
    const svgString = svgBuffer.toString('utf-8');

    // Try to extract viewBox
    const viewBoxMatch = svgString.match(/viewBox=["']([^"']+)["']/i);
    if (viewBoxMatch) {
        const [, viewBox] = viewBoxMatch;
        const parts = viewBox.split(/\s+/).map(Number);
        if (parts.length >= 4 && !parts.some(isNaN)) {
            return { width: parts[2], height: parts[3] };
        }
    }

    // Try to extract width/height attributes
    const widthMatch = svgString.match(/width=["']([^"']+)["']/i);
    const heightMatch = svgString.match(/height=["']([^"']+)["']/i);

    if (widthMatch && heightMatch) {
        const width = parseFloat(widthMatch[1]);
        const height = parseFloat(heightMatch[1]);
        if (!isNaN(width) && !isNaN(height)) {
            return { width, height };
        }
    }

    // Default for game icons (most are 512x512)
    return { width: 512, height: 512 };
}

/**
 * Calculates target dimensions for SVG based on canvas size and layer scale
 */
export function calculateSvgTargetDimensions(
    svgDimensions: { width: number; height: number },
    canvasWidth: number,
    canvasHeight: number,
    layerScale: number = 1
): { targetWidth: number; targetHeight: number } {
    // Apply layer scale directly (consistent with non-SVG image scaling and browser preview)
    // The oversized layers logic will handle fitting within canvas bounds
    return {
        targetWidth: Math.round(svgDimensions.width * layerScale),
        targetHeight: Math.round(svgDimensions.height * layerScale)
    };
}