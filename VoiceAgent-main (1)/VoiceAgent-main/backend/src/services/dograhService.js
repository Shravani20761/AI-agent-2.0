import 'dotenv/config';

const BASE = process.env.DOGRAH_BASE_URL || process.env.DOGRAH_API_URL || 'https://api.qdeploy.online';
const KEY  = process.env.DOGRAH_API_KEY;

const headers = () => ({ 'Content-Type': 'application/json', 'X-API-Key': KEY });

export async function triggerCall(workflowUuid, phone, initialContext) {
  const res = await fetch(`${BASE}/api/v1/public/agent/workflow/${workflowUuid}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ phone_number: phone, initial_context: initialContext }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dograh trigger failed (${res.status}): ${text}`);
  }
  return res.json(); // { workflow_run_id, status, workflow_run_name }
}

export async function getRunResult(workflowId, runId) {
  const res = await fetch(`${BASE}/api/v1/workflow/${workflowId}/runs/${runId}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Dograh poll failed (${res.status})`);
  const data = await res.json();
  return {
    isCompleted:    data.is_completed,
    callDisposition: data.gathered_context?.call_disposition || null,
    gatheredContext: data.gathered_context || {},
    durationSecs:    data.cost_info?.call_duration_seconds || 0,
    transcriptUrl:   data.transcript_url || null,
    recordingUrl:    data.recording_url || null,
  };
}

export async function listWorkflows() {
  const res = await fetch(`${BASE}/api/v1/workflow/fetch`, { headers: headers() });
  if (!res.ok) throw new Error(`Dograh list failed (${res.status})`);
  return res.json(); // [{ id, name, workflow_uuid, status }]
}
