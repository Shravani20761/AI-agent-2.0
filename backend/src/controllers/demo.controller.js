import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';
import { getActiveMode, setActiveMode } from '../lib/demoMode.js';
import { COST_BASIS, PRICING_VERIFIED_AT, PRICING_VERSION, RATES, computeCallCost, pickUsage } from '../lib/demoPricing.js';
import { applyUsage, finalizeCall, liveDurationSecs, summarizeCalls } from '../lib/demoUsage.js';
import { sanitizePayload } from '../lib/demoSanitize.js';
import { livekitConfigured, makeRoomName, openDemoRoom, providerFlags } from '../services/demoLivekit.js';

const STALE_MS = 3 * 60 * 1000;

function blankToNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function maskPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 4) return '[redacted]';
  return `***${digits.slice(-2)}`;
}

function presentCall(call, now = new Date()) {
  const durationSecs = call.endedAt ? call.durationSecs : liveDurationSecs(call, now);
  const cost = computeCallCost(call.mode, call, durationSecs || 0);
  return {
    ...call,
    contactPhone: maskPhone(call.contactPhone),
    durationSecs,
    totalCostInr: call.endedAt ? call.totalCostInr : cost.totalCostInr,
    costPerMinInr: call.endedAt ? call.costPerMinInr : cost.costPerMinInr,
    usageCompleteness: cost.usageCompleteness,
    costParts: cost.parts,
    pricingVersion: call.pricingVersion || PRICING_VERSION,
    pricingVerifiedAt: PRICING_VERIFIED_AT,
    costBasis: call.costBasis || COST_BASIS,
    costIsEstimate: true,
  };
}

async function closeStaleDemoCalls() {
  const cutoff = new Date(Date.now() - STALE_MS);
  const stale = await prisma.demoCall.findMany({
    where: { status: 'ACTIVE', lastActivityAt: { lt: cutoff } },
  });
  for (const call of stale) {
    const finalized = finalizeCall(call, call.lastActivityAt, null, 'stale_timeout');
    if (finalized.alreadyEnded) continue;
    const next = finalized.call;
    await prisma.demoCall.update({
      where: { id: call.id },
      data: {
        status: next.status,
        endReason: next.endReason,
        endedAt: next.endedAt,
        durationSecs: next.durationSecs,
        totalCostInr: next.totalCostInr,
        costPerMinInr: next.costPerMinInr,
        pricingVersion: next.pricingVersion,
        costBasis: next.costBasis,
      },
    });
  }
  return stale.length;
}

let maintenanceStarted = false;
export function startDemoMaintenance() {
  if (maintenanceStarted) return;
  maintenanceStarted = true;
  const timer = setInterval(() => {
    closeStaleDemoCalls().catch((error) => {
      console.error('[demo] stale close failed:', error.message);
    });
  }, 60_000);
  timer.unref?.();
}

async function requireCall(id, res) {
  const call = await prisma.demoCall.findUnique({ where: { id } });
  if (!call) {
    err(res, 'Demo call not found', 404);
    return null;
  }
  return call;
}

export const getConfig = async (_req, res) => {
  ok(res, {
    modes: ['GEMINI_LIVE', 'SARVAM_PIPELINE'],
    activeMode: getActiveMode(),
    rates: RATES,
    pricingVersion: PRICING_VERSION,
    pricingVerifiedAt: PRICING_VERIFIED_AT,
    costBasis: COST_BASIS,
    pricingNote: 'Rates are provisional configuration pending verification against current provider pricing. They are not an invoice. Gemini tokens are never estimated from call duration. TTS characters are recorded and not billed; TTS cost uses audio seconds.',
    integrations: providerFlags(),
    demoModeScope: 'demo-calls-only',
  });
};

export const setMode = async (req, res) => {
  const mode = setActiveMode(req.body.mode);
  ok(res, { mode, scope: 'demo-calls-only' });
};

export const startCall = async (req, res) => {
  if (!livekitConfigured()) {
    return err(res, 'LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.', 503);
  }

  const contactName = blankToNull(req.body.contactName);
  const contactPhone = blankToNull(req.body.contactPhone);
  const contactCourse = blankToNull(req.body.contactCourse);
  const mode = getActiveMode();
  const roomName = makeRoomName();

  const created = await prisma.demoCall.create({
    data: {
      mode,
      roomName,
      contactName,
      contactPhone,
      contactCourse,
      pricingVersion: PRICING_VERSION,
      costBasis: COST_BASIS,
    },
  });

  try {
    const room = await openDemoRoom({
      roomName,
      displayName: contactName,
      metadata: { mode, demoCallId: created.id },
    });
    ok(res, {
      demoCallId: created.id,
      token: room.token,
      url: room.url,
      roomName,
      mode,
      contactName,
      contactCourse,
      pricingVersion: PRICING_VERSION,
      costBasis: COST_BASIS,
    }, 201);
  } catch (error) {
    const finalized = finalizeCall(created, new Date(), null, 'room_setup_failed');
    await prisma.demoCall.update({
      where: { id: created.id },
      data: {
        status: 'FAILED',
        endReason: 'room_setup_failed',
        endedAt: finalized.call.endedAt,
        durationSecs: 0,
      },
    });
    const status = error.status || 502;
    err(res, error.message || 'LiveKit room setup failed', status);
  }
};

export const updateUsage = async (req, res) => {
  const call = await requireCall(req.params.id, res);
  if (!call) return;
  if (call.status !== 'ACTIVE') return err(res, 'Demo call is already closed', 409);

  const applied = applyUsage(call, req.body, { kind: req.body.kind, usageSeq: req.body.usageSeq ?? null });
  const durationSecs = liveDurationSecs(call);
  const cost = computeCallCost(call.mode, applied.usage, durationSecs);
  const updated = await prisma.demoCall.update({
    where: { id: call.id },
    data: {
      ...applied.usage,
      lastUsageSeq: applied.lastUsageSeq,
      lastActivityAt: new Date(),
      totalCostInr: cost.totalCostInr,
      costPerMinInr: cost.costPerMinInr,
      pricingVersion: PRICING_VERSION,
      costBasis: COST_BASIS,
    },
  });

  ok(res, {
    applied: applied.applied,
    reason: applied.reason,
    usage: pickUsage(updated),
    totalCostInr: cost.totalCostInr,
    costPerMinInr: cost.costPerMinInr,
    durationSecs,
    usageCompleteness: cost.usageCompleteness,
    costBasis: COST_BASIS,
    pricingVersion: PRICING_VERSION,
    pricingVerifiedAt: PRICING_VERIFIED_AT,
    costIsEstimate: true,
  });
};

export const endCall = async (req, res) => {
  const call = await requireCall(req.params.id, res);
  if (!call) return;

  if (call.status !== 'ACTIVE') {
    return ok(res, {
      alreadyEnded: true,
      demoCallId: call.id,
      mode: call.mode,
      status: call.status,
      totalCostInr: call.totalCostInr,
      costPerMinInr: call.costPerMinInr,
      durationSecs: call.durationSecs,
      costBasis: call.costBasis,
      pricingVersion: call.pricingVersion,
      costIsEstimate: true,
    });
  }

  const finalized = finalizeCall(call, new Date(), req.body.finalUsage || null, 'client_end');
  const next = finalized.call;
  const updated = await prisma.demoCall.update({
    where: { id: call.id },
    data: {
      ...pickUsage(next),
      lastUsageSeq: next.lastUsageSeq,
      status: next.status,
      endReason: next.endReason,
      endedAt: next.endedAt,
      durationSecs: next.durationSecs,
      totalCostInr: next.totalCostInr,
      costPerMinInr: next.costPerMinInr,
      pricingVersion: next.pricingVersion,
      costBasis: next.costBasis,
      lastActivityAt: new Date(),
    },
  });

  ok(res, {
    alreadyEnded: false,
    demoCallId: updated.id,
    mode: updated.mode,
    status: updated.status,
    totalCostInr: updated.totalCostInr,
    costPerMinInr: updated.costPerMinInr,
    durationSecs: updated.durationSecs,
    usageCompleteness: finalized.cost.usageCompleteness,
    costBasis: updated.costBasis,
    pricingVersion: updated.pricingVersion,
    pricingVerifiedAt: PRICING_VERIFIED_AT,
    costIsEstimate: true,
  });
};

export const listCalls = async (req, res) => {
  await closeStaleDemoCalls().catch(() => {});
  const page = req.query.page;
  const limit = req.query.limit;
  const where = req.query.mode ? { mode: req.query.mode } : {};
  const [total, calls] = await Promise.all([
    prisma.demoCall.count({ where }),
    prisma.demoCall.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { toolCalls: true } } },
    }),
  ]);

  ok(res, {
    calls: calls.map((call) => ({
      ...presentCall(call),
      toolCallCount: call._count.toolCalls,
      _count: undefined,
    })),
    page,
    limit,
    total,
  });
};

export const getCall = async (req, res) => {
  const call = await prisma.demoCall.findUnique({
    where: { id: req.params.id },
    include: { toolCalls: { orderBy: { calledAt: 'asc' } } },
  });
  if (!call) return err(res, 'Demo call not found', 404);
  if (call.status === 'ACTIVE') {
    await prisma.demoCall.update({
      where: { id: call.id },
      data: { lastActivityAt: new Date() },
    });
    call.lastActivityAt = new Date();
  }
  ok(res, { call: presentCall(call) });
};

export const getSummary = async (_req, res) => {
  await closeStaleDemoCalls().catch(() => {});
  const calls = await prisma.demoCall.findMany({
    select: {
      mode: true,
      status: true,
      endedAt: true,
      totalCostInr: true,
      costPerMinInr: true,
      durationSecs: true,
    },
  });
  ok(res, {
    ...summarizeCalls(calls),
    pricingVersion: PRICING_VERSION,
    pricingVerifiedAt: PRICING_VERIFIED_AT,
    costBasis: COST_BASIS,
    costIsEstimate: true,
  });
};

export const logToolCall = async (req, res) => {
  const call = await requireCall(req.body.demoCallId, res);
  if (!call) return;

  const argumentsPayload = sanitizePayload(req.body.arguments ?? {});
  if (argumentsPayload.error) return err(res, argumentsPayload.error.message, argumentsPayload.error.status);
  const resultPayload = sanitizePayload(req.body.result ?? null);
  if (resultPayload.error) return err(res, resultPayload.error.message, resultPayload.error.status);

  const result = resultPayload.value;
  const success = req.body.success ?? !(result && typeof result === 'object' && result.success === false);
  const row = await prisma.demoToolCall.create({
    data: {
      demoCallId: call.id,
      toolName: req.body.toolName,
      arguments: argumentsPayload.value,
      result,
      success,
      durationMs: req.body.durationMs ?? null,
    },
  });
  if (call.status === 'ACTIVE') {
    await prisma.demoCall.update({
      where: { id: call.id },
      data: { lastActivityAt: new Date() },
    });
  }
  ok(res, { id: row.id, success }, 201);
};

export const clearHistory = async (req, res) => {
  const where = req.body.mode ? { mode: req.body.mode } : {};
  const deleted = await prisma.demoCall.deleteMany({ where });
  ok(res, { deleted: deleted.count, scope: 'demo-calls-only' });
};
