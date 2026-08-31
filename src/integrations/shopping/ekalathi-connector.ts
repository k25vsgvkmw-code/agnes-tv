import { PublicShoppingConnector } from './public-shopping-connector.js';
import type { SourceFetcher } from './source-fetcher.js';

export class EKalathiConnector extends PublicShoppingConnector {
  constructor(fetcher: SourceFetcher) {
    super(
      {
        id: 'shopping-e-kalathi-cy',
        retailerSlug: 'e-kalathi-cy',
        sourceUrl: 'https://www.e-kalathi.gov.cy/product',
        sourceName: 'e-kalathi-public-web',
        supportsHandoff: false,
      },
      fetcher,
    );
  }
}
