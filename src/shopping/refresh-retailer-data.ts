import type { Connector } from '../integrations/connector.js';
import type { ShoppingAction, ShoppingRecord } from '../integrations/shopping/shopping-records.js';
import type { ImportShoppingRecords, ShoppingImportSummary } from './import-shopping-records.js';
import type { RetailerSlug } from './shopping-types.js';

export interface RetailerRefreshResult {
  readonly retailerSlug: RetailerSlug;
  readonly connectorId: string;
  readonly status: 'ok' | 'degraded';
  readonly summary?: ShoppingImportSummary;
  readonly message?: string;
}

export class RefreshRetailerData {
  constructor(
    private readonly connectors: ReadonlyMap<RetailerSlug, Connector<ShoppingRecord, ShoppingAction>>,
    private readonly importer: ImportShoppingRecords,
  ) {}

  async refreshAll(): Promise<readonly RetailerRefreshResult[]> {
    const results: RetailerRefreshResult[] = [];
    for (const [retailerSlug, connector] of this.connectors) {
      try {
        const sync = await connector.sync();
        const summary = await this.importer.execute(connector.id, sync.records);
        const health = await connector.health();
        results.push({
          retailerSlug,
          connectorId: connector.id,
          status: health.state === 'connected' ? 'ok' : 'degraded',
          summary,
          ...(health.message ? { message: health.message } : {}),
        });
      } catch (error) {
        results.push({
          retailerSlug,
          connectorId: connector.id,
          status: 'degraded',
          message: error instanceof Error ? error.message : 'retailer refresh failed',
        });
      }
    }
    return results;
  }
}
