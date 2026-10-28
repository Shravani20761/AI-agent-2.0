import { computeCallCost, pickUsage, USAGE_FIELDS } from './demoPricing.js';

export function applyUsage(current, patch, { kind = 'snapshot', usageSeq = null } = {}) {
  if (usageSeq != null && current.lastUsageSeq != null && usageSeq <= current.lastUsageSeq) {
    return { usage: pickUsage(current), lastUsageSeq: current.lastUsageSeq, applied: false, reason: 'duplicate_seq' };
  }

  const usage = pickUsage(current);
  for (const field of USAGE_FIELDS) {
    if (patch[field] == null) continue;
    usage[field] = kind === 'delta' ? (usage[field] ?? 0) + patch[field] : patch[field];
  }

  return {
    usage,
    lastUsageSeq: usageSeq ?? current.lastUsageSeq ?? null,
    applied: true,
    reason: kind,
  };
}

export function liveDurationSecs(call, now = new Date()) {
  const end = call.endedAt ? new Date(call.endedAt) : now;
  return Math.max(0, Math.round((end.getTime() - new Date(call.startedAt).getTime()) / 1000));
}

export function hasMeasuredUsage(call) {
  return USAGE_FIELDS.some((field) => call[field] != null && call[field] > 0);
}

export function finalizeCall(call, now = new Date(), finalUsage = null, endReason = 'client_end') {
  if (call.endedAt || call.status === 'COMPLETED' || call.status === 'FAILED') {
    return { call, alreadyEnded: true };
  }

  const applied = finalUsage
    ? applyUsage(call, finalUsage, { kind: finalUsage.kind || 'snapshot', usageSeq: finalUsage.usageSeq ?? null })
    : { usage: pickUsage(call), lastUsageSeq: call.lastUsageSeq ?? null, applied: false };

  const next = { ...call, ...applied.usage, lastUsageSeq: applied.lastUsageSeq };
  const endedAt = now;
  const durationSecs = liveDurationSecs({ ...next, endedAt }, now);
  const cost = computeCallCost(next.mode, next, durationSecs);
  const failed = endReason !== 'client_end' && durationSecs === 0 && !hasMeasuredUsage(next);

  return {
    alreadyEnded: false,
    call: {
      ...next,
      status: failed ? 'FAILED' : 'COMPLETED',
      endReason,
      endedAt,
      durationSecs,
      totalCostInr: cost.totalCostInr,
      costPerMinInr: cost.costPerMinInr,
      pricingVersion: cost.pricingVersion,
      costBasis: cost.costBasis,
    },
    cost,
  };
}

function average(values) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10000) / 10000;
}

export function summarizeCalls(calls) {
  const summary = {};
  for (const mode of ['GEMINI_LIVE', 'SARVAM_PIPELINE']) {
    const rows = calls.filter((call) => call.mode === mode);
    const completed = rows.filter((call) => call.status === 'COMPLETED' && call.endedAt);
    const priced = completed.filter((call) => call.totalCostInr != null);
    const perMinute = priced.filter((call) => call.costPerMinInr != null);
    const timed = completed.filter((call) => call.durationSecs != null);
    summary[mode] = {
      completedCallCount: completed.length,
      failedCallCount: rows.filter((call) => call.status === 'FAILED').length,
      activeCallCount: rows.filter((call) => call.status === 'ACTIVE').length,
      avgCostPerMin: average(perMinute.map((call) => call.costPerMinInr)),
      avgTotalCost: average(priced.map((call) => call.totalCostInr)),
      avgDurationSecs: average(timed.map((call) => call.durationSecs)),
      totalCostInr: priced.length
        ? Math.round(priced.reduce((sum, call) => sum + call.totalCostInr, 0) * 10000) / 10000
        : null,
      totalDurationSecs: timed.reduce((sum, call) => sum + call.durationSecs, 0),
    };
  }
  return summary;
}
