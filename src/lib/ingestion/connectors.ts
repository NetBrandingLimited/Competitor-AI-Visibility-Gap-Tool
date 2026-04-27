import type { ConnectorName, SourceDocument } from './types';

export type SourceConnector = {
  name: ConnectorName;
  fetchDocuments(input: {
    query: string;
    limit: number;
    /** Changes mock body wording so heuristic triggers differ between runs. */
    contentVariant: number;
  }): Promise<SourceDocument[]>;
};

const MOCK_BODY_TEMPLATES: ((args: { query: string; seed: number }) => string)[] = [
  ({ query, seed }) =>
    `Mock source text for "${query}" sample ${seed}. Compare alternatives, pricing, and best features vs competitors.`,
  ({ query, seed }) =>
    `Mock source text for "${query}" sample ${seed}. Users discuss top vendors, cost tradeoffs, and feature fit.`,
  ({ query, seed }) =>
    `Mock source text for "${query}" sample ${seed}. Threads on vs comparisons, alternative stacks, and pricing.`,
  ({ query, seed }) =>
    `Mock source text for "${query}" sample ${seed}. Short narrative about brand sentiment and awareness only.`
];

function pickBody(query: string, seed: number, contentVariant: number): string {
  const idx = (contentVariant + seed * 7) % MOCK_BODY_TEMPLATES.length;
  return MOCK_BODY_TEMPLATES[idx]({ query, seed });
}

function toDoc(
  source: ConnectorName,
  seed: number,
  query: string,
  titlePrefix: string,
  urlBase: string,
  contentVariant: number
): SourceDocument {
  const slug = query.toLowerCase().replace(/\s+/g, '-');
  return {
    id: `${source}-${slug}-${seed}`,
    source,
    url: `${urlBase}/${slug}-${seed}`,
    title: `${titlePrefix}: ${query} #${seed}`,
    content: pickBody(query, seed, contentVariant),
    publishedAt: new Date(Date.now() - seed * 60_000).toISOString()
  };
}

const redditMockConnector: SourceConnector = {
  name: 'reddit-mock',
  async fetchDocuments({ query, limit, contentVariant }) {
    return Array.from({ length: limit }).map((_, i) =>
      toDoc('reddit-mock', i + 1, query, 'Reddit thread', 'https://reddit.com/r/mock', contentVariant)
    );
  }
};

const hnMockConnector: SourceConnector = {
  name: 'hn-mock',
  async fetchDocuments({ query, limit, contentVariant }) {
    const docs = Array.from({ length: limit }).map((_, i) =>
      toDoc('hn-mock', i + 1, query, 'HN post', 'https://news.ycombinator.com/item', contentVariant)
    );
    if (docs.length > 0) {
      docs[0] = {
        ...docs[0],
        // Intentional duplicate URL shape to exercise dedupe logic.
        url: `https://news.ycombinator.com/item/${query.toLowerCase().replace(/\s+/g, '-')}-dupe`
      };
    }
    return docs;
  }
};

export const MOCK_CONNECTORS: SourceConnector[] = [redditMockConnector, hnMockConnector];
