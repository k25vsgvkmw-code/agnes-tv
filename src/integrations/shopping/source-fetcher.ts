export interface SourceFetchResult {
  readonly url: string;
  readonly status: number;
  readonly body: string;
  readonly fetchedAt: Date;
}

export interface SourceFetcher {
  fetchText(url: string): Promise<SourceFetchResult>;
}

export interface NodeSourceFetcherOptions {
  readonly timeoutMs?: number;
  readonly userAgent?: string;
}

export class NodeSourceFetcher implements SourceFetcher {
  private readonly timeoutMs: number;
  private readonly userAgent: string;

  constructor(options: NodeSourceFetcherOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.userAgent = options.userAgent ?? 'AGNES-Family-OS/0.1 (+public shopping data; Cyprus)';
  }

  async fetchText(url: string): Promise<SourceFetchResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5',
          'user-agent': this.userAgent,
        },
        redirect: 'follow',
      });
      const body = await response.text();
      if (!response.ok) throw new Error(`shopping source returned HTTP ${response.status}`);
      return { url: response.url || url, status: response.status, body, fetchedAt: new Date() };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class StaticSourceFetcher implements SourceFetcher {
  constructor(private readonly documents: Readonly<Record<string, string>>) {}

  fetchText(url: string): Promise<SourceFetchResult> {
    const body = this.documents[url];
    if (body === undefined) return Promise.reject(new Error(`no fixture for ${url}`));
    return Promise.resolve({ url, status: 200, body, fetchedAt: new Date('2026-08-31T13:00:00Z') });
  }
}
