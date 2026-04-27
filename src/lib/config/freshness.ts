export type FreshnessThresholds = {
  freshHours: number;
  agingHours: number;
  misconfigured: boolean;
};

function envHours(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return fallback;
  }
  return n;
}

export function getFreshnessThresholds(): FreshnessThresholds {
  const freshHours = envHours('FRESH_HOURS', 24);
  const agingHours = envHours('AGING_HOURS', 72);
  return {
    freshHours,
    agingHours,
    misconfigured: agingHours < freshHours
  };
}
