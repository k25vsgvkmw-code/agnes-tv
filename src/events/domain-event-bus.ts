import type { AgnesEvent } from './agnes-event.js';

export type DomainEventHandler = (event: AgnesEvent) => void | Promise<void>;

export interface DomainEventBus {
  publish(event: AgnesEvent): Promise<void>;
  subscribe(type: string, handler: DomainEventHandler): () => void;
}

export class InMemoryDomainEventBus implements DomainEventBus {
  private readonly handlers = new Map<string, Set<DomainEventHandler>>();

  subscribe(type: string, handler: DomainEventHandler): () => void {
    const handlers = this.handlers.get(type) ?? new Set<DomainEventHandler>();
    handlers.add(handler);
    this.handlers.set(type, handlers);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) this.handlers.delete(type);
    };
  }

  async publish(event: AgnesEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;

    for (const handler of handlers) {
      await handler(event);
    }
  }
}
