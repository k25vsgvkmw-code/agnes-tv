import { PublicShoppingConnector } from './public-shopping-connector.js';
import type { SourceFetcher } from './source-fetcher.js';

export class AlphaMegaConnector extends PublicShoppingConnector {
  constructor(fetcher: SourceFetcher) {
    super(
      {
        id: 'shopping-alphamega-cy',
        retailerSlug: 'alphamega-cy',
        sourceUrl: 'https://www.alphamega.com.cy/el',
        sourceName: 'alphamega-public-web',
        supportsHandoff: true,
        handoffUrl: 'https://www.alphamega.com.cy/el',
      },
      fetcher,
    );
  }
}
