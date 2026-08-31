import { PublicShoppingConnector } from './public-shopping-connector.js';
import type { SourceFetcher } from './source-fetcher.js';

export class LidlConnector extends PublicShoppingConnector {
  constructor(fetcher: SourceFetcher) {
    super(
      {
        id: 'shopping-lidl-cy',
        retailerSlug: 'lidl-cy',
        sourceUrl: 'https://www.lidl.com.cy/el-CY/',
        sourceName: 'lidl-public-web',
        supportsHandoff: false,
      },
      fetcher,
    );
  }
}
