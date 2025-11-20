// src/engine/repositories.ts
// This file is now client-safe. It only holds and provides data.

import { QualityDefinition, Storylet, Opportunity, LocationDefinition } from '@/engine/models';

class Repositories {
    public qualities: Record<string, QualityDefinition> = {};
    public storylets: Record<string, Storylet> = {};
    public opportunities: Record<string, Opportunity> = {};
    public locations: Record<string, LocationDefinition> = {};


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

    public getEvent(id: string): Storylet | Opportunity | undefined {
        // First, check if it's a regular storylet.
        const storylet = this.storylets[id];
        if (storylet) {
            return storylet;
        }
        // If not, check if it's an opportunity card.
        const opportunity = this.opportunities[id];
        if (opportunity) {
            return opportunity;
        }
        // If it's in neither, return undefined.
        return undefined;
    }

    public getLocation(id: string): LocationDefinition | undefined {
        return this.locations[id];
    }
}

// Create a single instance that can be imported anywhere.
export const repositories = new Repositories();