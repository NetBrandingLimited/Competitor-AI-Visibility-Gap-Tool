import { pipelineIngestionProvenanceLabel } from '@/lib/ingestion/sourceDisplayLabel';

import {
  visibilityUsesLlmMentionSignal,
  type computeAndPersistVisibilityScoreV1,
  type getLatestVisibilityScore
} from './scoreV1';

type LatestVisibility = NonNullable<Awaited<ReturnType<typeof getLatestVisibilityScore>>>;
type VisibilityResult = Awaited<ReturnType<typeof computeAndPersistVisibilityScoreV1>>;

export function serializeVisibilityScore(latest: LatestVisibility) {
  const inputs = latest.inputs;
  const mentionShareSource = visibilityUsesLlmMentionSignal(inputs) ? 'llm_answers' : 'trend_snapshot';
  return {
    score: latest.score,
    createdAt: latest.createdAt,
    reasons: latest.reasons,
    inputs,
    pipelineIngestionSource: inputs.pipelineIngestionSource,
    pipelineIngestionSourceLabel: pipelineIngestionProvenanceLabel(inputs.pipelineIngestionSource),
    pipelineGscDiagnosticsSummary: inputs.pipelineGscDiagnosticsSummary,
    pipelineBrandShareOfVoice: inputs.pipelineBrandShareOfVoice,
    mentionShareSource,
    llmAvgBrandShareOfMentions: inputs.llmAvgBrandShareOfMentions,
    llmShareSampleCount: inputs.llmShareSampleCount,
    llmBrandTopOrTiedRate: inputs.llmBrandTopOrTiedRate,
    llmAnswerSamplesScanned: inputs.llmAnswerSamplesScanned,
    signalSource: inputs.connectorSignalSource,
    signalCount: inputs.connectorSignalCount,
    signalsAsOf: inputs.connectorSignalsAsOf
  };
}

export function serializeVisibilityResult(result: VisibilityResult) {
  const inputs = result.inputs;
  const mentionShareSource = visibilityUsesLlmMentionSignal(inputs) ? 'llm_answers' : 'trend_snapshot';
  return {
    score: result.score,
    reasons: result.reasons,
    inputs,
    pipelineIngestionSource: inputs.pipelineIngestionSource,
    pipelineIngestionSourceLabel: pipelineIngestionProvenanceLabel(inputs.pipelineIngestionSource),
    pipelineGscDiagnosticsSummary: inputs.pipelineGscDiagnosticsSummary,
    pipelineBrandShareOfVoice: inputs.pipelineBrandShareOfVoice,
    mentionShareSource,
    llmAvgBrandShareOfMentions: inputs.llmAvgBrandShareOfMentions,
    llmShareSampleCount: inputs.llmShareSampleCount,
    llmBrandTopOrTiedRate: inputs.llmBrandTopOrTiedRate,
    llmAnswerSamplesScanned: inputs.llmAnswerSamplesScanned,
    signalSource: inputs.connectorSignalSource,
    signalCount: inputs.connectorSignalCount,
    signalsAsOf: inputs.connectorSignalsAsOf
  };
}
