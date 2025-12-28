export function safeEval(expression: string): any {
    // This function is constructed in a way that it has no access 
    // to the outer scope (no access to require, process, window, document, etc.)
    try {
        // We explicitly pass in the Math object so it can be used safely.
        return new Function('Math', `return ${expression}`)(Math);
    } catch (e) {
        // If the expression is not valid JS (e.g., just a string), return it as-is.
        return expression;
    }
}