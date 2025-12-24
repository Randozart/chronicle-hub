// Matches:
// 1. Tuplet/Group: ( ... ) -> Handles one level of nested parens inside, e.g. (1(v:1) 2)
// 2. Chord Alias: @Name(...)
// 3. Note: 1'#(v:1)^[...]
// 4. Symbols: - . | !
export const LIGATURE_TOKEN_REGEX = /(\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)|@\w+(?:\(\s*[+-]?\d+\s*\))?|(\d+['#b%,]*(?:\([^)]*\))?(?:\^\[.*?\])?)|[-.|!])/g;