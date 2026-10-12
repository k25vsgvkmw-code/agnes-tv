const METHODS = {
  flights: 'searchFlights',
  cruises: 'searchCruises',
  rail: 'searchRail',
  stays: 'searchStays',
  activities: 'searchActivities',
  availability: 'getAvailability',
};

function fallback(error = null) {
  return {
    status: 'fallback',
    live: false,
    provider: null,
    fetchedAt: null,
    results: [],
    error: error ? String(error.message ?? error) : null,
  };
}

export function createProviderGateway(adapters = {}) {
  async function searchLiveOptions(kind, input = {}) {
    const method = METHODS[kind];
    if (!method) return fallback(`Unsupported provider capability: ${kind}`);

    const candidates = Object.entries(adapters).filter(([, adapter]) => typeof adapter?.[method] === 'function');
    if (!candidates.length) return fallback();

    let lastError = null;
    for (const [provider, adapter] of candidates) {
      try {
        const results = await adapter[method](input);
        return {
          status: 'ok',
          live: true,
          provider,
          fetchedAt: new Date().toISOString(),
          results: Array.isArray(results) ? results : [],
          error: null,
        };
      } catch (error) {
        lastError = error;
      }
    }

    return fallback(lastError);
  }

  return {
    searchLiveOptions,
    supports(kind) {
      const method = METHODS[kind];
      return Boolean(method && Object.values(adapters).some((adapter) => typeof adapter?.[method] === 'function'));
    },
  };
}

export async function searchLiveOptions(kind, input = {}, adapters = {}) {
  return createProviderGateway(adapters).searchLiveOptions(kind, input);
}
