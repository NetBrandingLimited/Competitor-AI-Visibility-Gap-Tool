export type ConnectorName = 'reddit-mock' | 'hn-mock';

/** Mirrors org brand fields; kept here to avoid circular imports with org-visibility-mock. */
export type IngestionBrandContext = {
  brandName?: string | null;
  category?: string | null;
  competitorA?: string | null;
  competitorB?: string | null;
  competitorC?: string | null;
};

export type SourceDocument = {
  id: string;
  source: ConnectorName;
  url: string;
  title: string;
  content: string;
  publishedAt: string;
};

export type IngestionRunInput = {
  query: string;
  limitPerConnector?: number;
  /** When set, mock document text is extended with this org's brand and competitors. */
  brandContext?: IngestionBrandContext;
  /** Rotates mock body templates so trigger/cluster counts can differ between runs with the same query. */
  contentVariant?: number;
};

export type IngestionEvent =
  | { ts: string; level: 'info'; type: 'run_started'; query: string }
  | { ts: string; level: 'info'; type: 'connector_started'; connector: ConnectorName }
  | { ts: string; level: 'info'; type: 'connector_completed'; connector: ConnectorName; count: number }
  | { ts: string; level: 'info'; type: 'documents_deduped'; inputCount: number; outputCount: number }
  | { ts: string; level: 'info'; type: 'run_completed'; totalDocuments: number };

export type NormalizedIngestionInput = {
  query: string;
  limitPerConnector: number;
  brandContext?: IngestionBrandContext;
  contentVariant: number;
};

export type IngestionRunResult = {
  input: NormalizedIngestionInput;
  events: IngestionEvent[];
  documents: SourceDocument[];
};
