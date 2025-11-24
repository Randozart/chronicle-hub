// src/engine/repositories.ts
import { QualityDefinition, Storylet, Opportunity, LocationDefinition, WorldContent, DeckDefinition } from '@/engine/models';

class Repositories {
    public qualities: Record<string, QualityDefinition> = {};
    public storylets: Record<string, Storylet> = {};
    public opportunities: Record<string, Opportunity> = {};
    public locations: Record<string, LocationDefinition> = {};
    public starting: Record<string, string> = {};
    public decks: Record<string, DeckDefinition> = {};

    public initialize(data: Partial<WorldContent>) {
        if (data.qualities) this.qualities = data.qualities;
        if (data.storylets) this.storylets = data.storylets;
        if (data.opportunities) this.opportunities = data.opportunities;
        if (data.locations) this.locations = data.locations;
        if (data.decks) this.decks = data.decks;
    }

    public getEvent(id: string): Storylet | Opportunity | undefined {
        return this.storylets[id] || this.opportunities[id];
    }
    public getQuality(id: string): QualityDefinition | undefined {
        return this.qualities[id];
    }
    public getLocation(id: string): LocationDefinition | undefined {
        return this.locations[id];
    }
}
export const repositories = new Repositories();