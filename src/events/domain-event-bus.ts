import type { AgnesEvent } from './agnes-event.js';

export type DomainEventHandler = (event: AgnesEvent<unknown>) => void | Promise<void>;

export interface DomainEventBus {
  publish(event: AgnesEvent<unknown>): Promise<void>;
  subscribe(type: string, handler: DomainEventHandler): () => void;
}

export class InMemoryDomainEventBus implements DomainEventBus {
  private readonly handlers = new Map<string, Set<DomainEventHandler>>();

  subscribe(type: string, handler: DomainEventHandler): () => void {
    const handlersForType = this.handlers.get(type) ?? new Set<DomainEventHandler>();
    handlersForType.add(handler);
    this.handlers.set(type, handlersForType);

    return () => {
      handlersForType.delete(handler);
      if (handlersForType.size === 0) {
        this.handlers.delete(type);
      }
    };
  }

  async publish(event: AgnesEvent<unknown>): Promise<void> {
    const handlersForType = [...(this.handlers.get(event.type) ?? [])];
    for (const handler of handlersForType) {
      await handler(event);
    }
  }
}
