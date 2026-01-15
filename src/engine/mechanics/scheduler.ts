// src/engine/mechanics/scheduler.ts
import { EngineContext } from './types';

export function parseAndQueueTimerInstruction(
    ctx: EngineContext,
    command: string, 
    argsStr: string
) {
    const [mainArgs, optArgs] = argsStr.split(';').map(s => s.trim());
    const instruction: any = { type: command, rawOptions: optArgs ? optArgs.split(',') : [] };

    if (command === 'cancel') {
        instruction.targetId = mainArgs;
    } else {
        const lastColon = mainArgs.lastIndexOf(':');
        if (lastColon === -1) return;

        const effectStr = mainArgs.substring(0, lastColon).trim();
        const timeStr = mainArgs.substring(lastColon + 1).trim();

        const tMatch = timeStr.match(/((?:\{.*\}|\d+))\s*([mhd])/);
        if (tMatch) {
            const amountRaw = tMatch[1];
            const unit = tMatch[2];
            const amountVal = parseInt(ctx.evaluateText(amountRaw.startsWith('{') ? amountRaw : `{${amountRaw}}`));
            
            if (!isNaN(amountVal)) {
                instruction.intervalMs = amountVal * (unit === 'h' ? 3600000 : unit === 'd' ? 86400000 : 60000);
            }
        }

        const effMatch = effectStr.match(/\$([a-zA-Z0-9_]+)\s*(=|\+=|-=)\s*(.*)/);
        if (effMatch) {
            instruction.targetId = effMatch[1];
            instruction.op = effMatch[2];
            const valStr = effMatch[3];
            const resolvedVal = ctx.evaluateText(`{${valStr}}`);
            instruction.value = isNaN(Number(resolvedVal)) ? resolvedVal : Number(resolvedVal);
        }
    }

    if (optArgs) {
        if (optArgs.includes('recur')) instruction.recurring = true;
        if (optArgs.includes('unique')) instruction.unique = true;
        const descMatch = optArgs.match(/desc:(.*)/);
        if (descMatch) instruction.description = descMatch[1].trim();
    }

    ctx.scheduledUpdates.push(instruction);
}