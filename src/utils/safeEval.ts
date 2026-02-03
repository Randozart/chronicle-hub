export function safeEval(expression: string): any {
    try {
        return new Function('Math', `return (${expression})`)(Math);
    } catch (e) {
        return expression;
    }
}