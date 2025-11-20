// src/engine/repositories.ts
// This file is now client-safe. It only holds and provides data.

import { QualityDefinition, Storylet } from '@/engine/models';

class Repositories {
    public qualities: Record<string, QualityDefinition> = {};
    public storylets: Record<string, Storylet> = {};

    // Method to initialize the repositories with data loaded from the server
    public initialize(data: { qualities: Record<string, QualityDefinition>, storylets: Record<string, Storylet> }) {
        this.qualities = data.qualities;
        this.storylets = data.storylets;
        console.log(`[Repositories] Initialized with data.`);
    }

    public getQuality(id: string): QualityDefinition | undefined {
        return this.qualities[id];
    }

    public getStorylet(id: string): Storylet | undefined {
        return this.storylets[id];
    }
}

// Create a single instance that can be imported anywhere.
export const repositories = new Repositories();