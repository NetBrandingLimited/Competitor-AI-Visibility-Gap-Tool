import { pipelineIngestionProvenanceLabel } from '@/lib/ingestion/sourceDisplayLabel';

import type { computeAndPersistVisibilityScoreV1, getLatestVisibilityScore } from './scoreV1';

type LatestVisibility = NonNullable<Awaited<ReturnType<typeof getLatestVisibilityScore>>>;
type VisibilityResult = Awaited<ReturnType<typeof computeAndPersistVisibilityScoreV1>>;

export function serializeVisibilityScore(latest: LatestVisibility) {
  return {
    score: latest.score,
    createdAt: latest.createdAt,
    reasons: latest.reasons,
    inputs: latest.inputs,
    pipelineIngestionSource: latest.inputs.pipelineIngestionSource,
    pipelineIngestionSourceLabel: pipelineIngestionProvenanceLabel(latest.inputs.pipelineIngestionSource),
    pipelineGscDiagnosticsSummary: latest.inputs.pipelineGscDiagnosticsSummary,
    signalSource: latest.inputs.connectorSignalSource,
    signalCount: latest.inputs.connectorSignalCount,
    signalsAsOf: latest.inputs.connectorSignalsAsOf
  };
}

export function serializeVisibilityResult(result: VisibilityResult) {
  return {
    score: result.score,
    reasons: result.reasons,
    inputs: result.inputs,
    pipelineIngestionSource: result.inputs.pipelineIngestionSource,
    pipelineIngestionSourceLabel: pipelineIngestionProvenanceLabel(result.inputs.pipelineIngestionSource),
    pipelineGscDiagnosticsSummary: result.inputs.pipelineGscDiagnosticsSummary,
    signalSource: result.inputs.connectorSignalSource,
    signalCount: result.inputs.connectorSignalCount,
    signalsAsOf: result.inputs.connectorSignalsAsOf
  };
}
