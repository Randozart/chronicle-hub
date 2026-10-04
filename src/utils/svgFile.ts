/**
 * Shared SVG file detection (client + server).
 *
 * Upload flows must recognise SVGs by extension and content, not just the
 * browser-reported MIME type — empty or off-spec MIME values (`''`,
 * `text/xml`) previously pushed SVGs into the canvas rasterisation path.
 */

/** True when a file should be treated as a vector SVG (MIME or extension). */
export function isSvgFile(file: { name?: string | null; type?: string | null }): boolean {
    if ((file.type || '').toLowerCase() === 'image/svg+xml') return true;
    return isSvgFilename(file.name || '');
}

/** True when the filename carries an `.svg` extension (query/hash stripped). */
export function isSvgFilename(name: string): boolean {
    const clean = name.split(/[?#]/)[0].toLowerCase();
    return clean.endsWith('.svg');
}

/**
 * Server-side content sniff: does the head of the buffer look like SVG/XML?
 * Skips BOM and leading whitespace, then checks for `<?xml` or `<svg`.
 * Only the first bytes are examined — pass a slice, not the whole file.
 * (No Node APIs — module must stay importable from client components.)
 */
export function sniffSvg(head: Uint8Array | ArrayBuffer): boolean {
    const bytes = head instanceof Uint8Array ? head : new Uint8Array(head);
    let start = 0;
    // UTF-8 BOM
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) start = 3;
    // ASCII whitespace: space, tab, CR, LF
    while (start < bytes.length && [0x20, 0x09, 0x0d, 0x0a].includes(bytes[start])) start++;

    const rest = bytes.subarray(start, start + 512);
    if (rest.length < 4) return false;

    let text = '';
    for (let i = 0; i < rest.length; i++) text += String.fromCharCode(rest[i]);
    text = text.toLowerCase();

    if (text.startsWith('<svg')) return true;
    if (text.startsWith('<?xml')) return text.includes('<svg');
    return false;
}
