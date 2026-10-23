// ─── Role derivation (Phase 0.5) ────────────────────────────────────────────
// Single source of truth for "what kind of contact is this number?".
// DERIVED, never stored as authority — computed from the unified Person row so it
// can never drift out of sync with lifecycleStage / Student existence.
//
// A marketing lead and a student are the SAME Person row at different stages.
// The role lets a single inbound number route to the right Dograh sub-flow.

const HOT_LEAD_STAGES = new Set([
  'INTERESTED',
  'DEMO_SCHEDULED',
  'DEMO_ATTENDED',
  'VISIT_SCHEDULED',
  'VISIT_COMPLETED',
  'ADMISSION_PENDING',
]);

/**
 * @param {object|null} person - Person row. To detect STUDENT, include `student`.
 * @returns {'STUDENT'|'HOT_LEAD'|'LEAD'|'UNKNOWN'}
 */
export function computeRole(person) {
  if (!person) return 'UNKNOWN';
  if (person.student) return 'STUDENT';
  if (person.lifecycleStage === 'STUDENT') return 'STUDENT'; // stage says student even if no Student row yet
  if (HOT_LEAD_STAGES.has(person.lifecycleStage)) return 'HOT_LEAD';
  if (person.lifecycleStage === 'LEAD') return 'LEAD';
  // ALUMNI / LOST / anything else → treat as a known but non-active contact
  return person.lifecycleStage === 'ALUMNI' ? 'STUDENT' : 'LEAD';
}

/**
 * Maps a role to the Dograh sub-flow the Start Call node should branch into.
 * @param {string} role
 * @returns {'student_support'|'sales_nurture'|'enquiry_capture'}
 */
export function routeForRole(role) {
  switch (role) {
    case 'STUDENT':  return 'student_support';
    case 'HOT_LEAD': return 'sales_nurture';
    case 'LEAD':     return 'enquiry_capture';
    default:         return 'enquiry_capture'; // UNKNOWN → new enquiry capture
  }
}
