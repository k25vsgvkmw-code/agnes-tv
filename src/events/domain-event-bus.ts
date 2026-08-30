import type { AgnesEvent } from './agnes-event.js';

export type DomainEventHandler = (event: AgnesEvent) => void | Promise<void>;

export interface DomainEventBus {
  publish(event: AgnesEvent): Promise<void>;
  subscribe(type: string, handler: DomainEventHandler): () => void;
}

export class InMemoryDomainEventBus implements DomainEventBus {
  private readonly handlers = new Map<string, Set<DomainEventHandler>>();

  subscribe(type: string, handler: DomainEventHandler): () => void {
    const existing = this.handlers.get(type) ?? new Set<DomainEventHandler>();
    existing.add(handler);
    this.handlers.set(type, existing);

    return () => {
      existing.delete(handler);
      if (existing.size === 0) {
        this.handlers.delete(type);
      }
    };
  }

  async publish(event: AgnesEvent): Promise<void> {
    const matching = this.handlers.get(event.type);
    if (matching === undefined || matching.size === 0) {
      return;
    }

    await Promise.all([...matching].map(async (handler) => handler(event)));
  }
}
