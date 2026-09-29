/**
 * flowGrading.js
 * 
 * Logic and calculation engine for Flow Task grading and Everyday Report cards.
 * Handles Star-marked (Mandatory) tasks, Optional (Extra credit) tasks, and automated Fail grading.
 * 
 * -----------------------------------------------------------------------------------------
 * GRADING SPECIFICATION & RULES:
 * -----------------------------------------------------------------------------------------
 * 1. MANDATORY (STARRED ⭐) TASKS:
 *    - Any task/step can be marked as mandatory (starred).
 *    - Mandatory tasks MUST be completed on their scheduled active day.
 *    - If even ONE mandatory task is missed (incomplete), the report card automatically gets:
 *      -> Grade: "F" (Fail)
 *      -> Score capped under 50% (Fail range).
 *      -> Status flag: mandatoryFailed = true.
 *      -> Clear feedback identifying how many mandatory tasks were missed.
 * 
 * 2. ALL MANDATORY COMPLETED (Without Optional):
 *    - When the user finishes 100% of their mandatory tasks, they are guaranteed a SOLID PASSING REPORT
 *      (Base Grade: B+ / 87%), even if 0 optional tasks were done.
 *    - Rationale: Mandatory items represent non-negotiable core commitments. Completing all of them
 *      means the fundamental mission for the day succeeded.
 * 
 * 3. MANDATORY + OPTIONAL (BONUS / EXTRA MARKS):
 *    - When all mandatory tasks are done, optional tasks act as "Bonus / Extra Marks"!
 *    - Bonus Pool: 13 marks (scaling the base 87% up to 100%).
 *    - If 100% of optional tasks are also completed -> Score = 100% (Grade A+ / Outstanding / Winner!).
 *    - If partial optional tasks are completed -> Score climbs through 88% - 99% (Grade A or A+).
 * 
 * 4. PURE OPTIONAL / NO MANDATORY TASKS DEFINED:
 *    - If no tasks are starred, the system seamlessly uses standard completion percentage (done / total * 100)
 *      with standard grade tiers (A+ through F).
 * 
 * 5. ONLY MANDATORY TASKS DEFINED:
 *    - If all tasks are starred: 100% done = 100% (A+), any missed = automatic F.
 * -----------------------------------------------------------------------------------------
 */

import { todayKey } from "./date.js";

/** Base score granted when 100% of mandatory tasks are achieved (Corresponds to solid B+). */
export const BASE_MANDATORY_SCORE = 87;

/** Extra bonus points available from completing optional tasks on top of mandatory. */
export const BONUS_EXTRA_MARKS_POOL = 13;

/** Hard ceiling score when a mandatory requirement is violated (Automatic Fail). */
export const FAIL_SCORE_CEILING = 45;

/**
 * Checks whether a flow step is marked as mandatory (starred).
 * Supports `isMandatory`, `mandatory`, and `starred` flags for safety.
 *
 * @param {object} step 
 * @returns {boolean}
 */
export function isStepMandatory(step) {
  if (!step || typeof step !== "object") return false;
  return Boolean(step.isMandatory || step.mandatory || step.starred);
}

/**
 * Maps a numeric score (0 - 100) to a standard letter grade.
 *
 * @param {number} score 
 * @returns {"A+" | "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "E" | "F"}
 */
export function gradeFromScore(score) {
  const n = Math.max(0, Math.min(100, Number(score) || 0));
  if (n >= 97) return "A+";
  if (n >= 90) return "A";
  if (n >= 87) return "B+";
  if (n >= 80) return "B";
  if (n >= 77) return "C+";
  if (n >= 70) return "C";
  if (n >= 67) return "D+";
  if (n >= 60) return "D";
  if (n >= 50) return "E";
  return "F";
}

/**
 * Generates descriptive feedback based on the detailed grading result.
 *
 * @param {object} grading
 * @returns {string}
 */
export function generateFeedback(grading) {
  if (!grading || grading.total === 0) {
    return "No active steps scheduled for today.";
  }

  // Case 1: Failed mandatory tasks
  if (grading.mandatoryFailed) {
    const missed = grading.mandatoryMissed;
    return `Failed mandatory requirements: ${missed} starred task${missed > 1 ? "s were" : " was"} missed today. Starred tasks must be completed on their scheduled day.`;
  }

  // Case 2: Has mandatory tasks and all were completed
  if (grading.hasMandatory) {
    if (grading.optionalTotal === 0) {
      return "Outstanding day — all mandatory priorities completed perfectly!";
    }
    if (grading.optionalDone === grading.optionalTotal) {
      return `Exceptional day! Completed all mandatory priorities + all optional tasks (+${grading.extraMarksEarned} bonus marks earned — Grade ${grading.grade})!`;
    }
    if (grading.optionalDone > 0) {
      return `Great performance! All mandatory tasks finished + ${grading.optionalDone} optional task${grading.optionalDone > 1 ? "s" : ""} done (+${grading.extraMarksEarned} extra marks earned — Grade ${grading.grade}).`;
    }
    return `Solid day! All mandatory starred tasks completed (Solid Grade ${grading.grade}). Complete optional tasks for extra bonus marks!`;
  }

  // Case 3: No mandatory tasks (standard completion tiers)
  switch (grading.grade) {
    case "A+":
      return "Outstanding day — you finished every step.";
    case "A":
      return "Excellent work — almost a perfect day.";
    case "B+":
      return "Strong day — this rhythm is solid.";
    case "B":
      return "Good progress — a little more and you're golden.";
    case "C+":
      return "Decent effort — keep pushing the sequence.";
    case "C":
      return "Halfway there — tomorrow can climb.";
    case "D+":
      return "A start — lock in a few more steps next time.";
    case "D":
      return "Light day — show up again tomorrow.";
    case "E":
      return "Barely scratched it — reset and try again.";
    default:
      return "Missed day — fresh slate starts tomorrow.";
  }
}

/**
 * Computes comprehensive grading for a given array of flow steps.
 *
 * @param {Array<object>} steps Array of steps active for the evaluation period.
 * @returns {object} Grading result with scores, letter grade, and mandatory breakdown.
 */
export function calculateStepGrading(steps = []) {
  const safeSteps = Array.isArray(steps) ? steps : [];
  const total = safeSteps.length;
  const done = safeSteps.filter((s) => s?.done).length;

  if (total === 0) {
    return {
      score: 0,
      pct: 0,
      grade: "—",
      feedback: "No active steps scheduled for today.",
      total: 0,
      done: 0,
      hasMandatory: false,
      mandatoryTotal: 0,
      mandatoryDone: 0,
      mandatoryMissed: 0,
      mandatoryFailed: false,
      optionalTotal: 0,
      optionalDone: 0,
      extraMarksEarned: 0,
      baseMarksEarned: 0,
      complete: false,
    };
  }

  const mandatorySteps = safeSteps.filter(isStepMandatory);
  const optionalSteps = safeSteps.filter((s) => !isStepMandatory(s));

  const mandatoryTotal = mandatorySteps.length;
  const mandatoryDone = mandatorySteps.filter((s) => s?.done).length;
  const mandatoryMissed = mandatoryTotal - mandatoryDone;
  const hasMandatory = mandatoryTotal > 0;

  const optionalTotal = optionalSteps.length;
  const optionalDone = optionalSteps.filter((s) => s?.done).length;

  let score = 0;
  let grade = "F";
  let mandatoryFailed = false;
  let baseMarksEarned = 0;
  let extraMarksEarned = 0;

  if (hasMandatory) {
    if (mandatoryMissed > 0) {
      // RULE: Incomplete mandatory task = AUTOMATIC FAIL (F)
      mandatoryFailed = true;
      grade = "F";
      // Proportional score capped strictly under failing ceiling
      score = Math.min(FAIL_SCORE_CEILING, Math.round((done / total) * FAIL_SCORE_CEILING));
    } else {
      // RULE: All mandatory tasks completed!
      mandatoryFailed = false;
      baseMarksEarned = BASE_MANDATORY_SCORE;

      if (optionalTotal === 0) {
        // Only mandatory tasks existed, and all are done -> 100% A+
        score = 100;
        grade = "A+";
      } else {
        // Mandatory done + optional tasks act as extra bonus marks pool (up to 15%)
        extraMarksEarned = Math.round((optionalDone / optionalTotal) * BONUS_EXTRA_MARKS_POOL);
        score = Math.min(100, BASE_MANDATORY_SCORE + extraMarksEarned);
        grade = gradeFromScore(score);
      }
    }
  } else {
    // Standard grading (No mandatory tasks defined)
    score = Math.round((done / total) * 100);
    grade = gradeFromScore(score);
  }

  const gradingResult = {
    score,
    pct: score,
    grade,
    feedback: "",
    total,
    done,
    hasMandatory,
    mandatoryTotal,
    mandatoryDone,
    mandatoryMissed,
    mandatoryFailed,
    optionalTotal,
    optionalDone,
    extraMarksEarned,
    baseMarksEarned,
    complete: total > 0 && done === total,
  };

  gradingResult.feedback = generateFeedback(gradingResult);
  return gradingResult;
}

/**
 * Calculates grading for an entire Everyday Flow on a specific calendar day.
 *
 * @param {object} flow 
 * @param {string|null} dayKey 
 * @returns {object}
 */
export function calculateFlowGrading(flow, dayKey = null) {
  if (!flow) return calculateStepGrading([]);
  const d = dayKey || (flow.repeat === "daily" ? flow.dayKey || todayKey() : todayKey());
  const steps = (flow.steps || []).filter((s) => {
    // Check if step is active on this day
    if (flow.repeat !== "daily") return true;
    if (s.startDate && s.startDate > d) return false;
    if (s.endDate && s.endDate < d) return false;
    return true;
  });
  return calculateStepGrading(steps);
}

function resolveStepCategoryId(step, flow) {
  const cats = Array.isArray(flow?.categories) ? flow.categories : [];
  const id = step?.categoryId || null;
  if (id && cats.some((c) => c.id === id)) return id;
  return cats[0]?.id || null;
}

/**
 * Calculates grading for a specific category within an Everyday Flow.
 *
 * @param {object} flow 
 * @param {string} categoryId 
 * @param {string|null} dayKey 
 * @returns {object}
 */
export function calculateCategoryGrading(flow, categoryId, dayKey = null) {
  if (!flow || !categoryId) return calculateStepGrading([]);
  const d = dayKey || (flow.repeat === "daily" ? flow.dayKey || todayKey() : todayKey());
  const steps = (flow.steps || [])
    .filter((s) => resolveStepCategoryId(s, flow) === categoryId)
    .filter((s) => {
      if (flow.repeat !== "daily") return true;
      if (s.startDate && s.startDate > d) return false;
      if (s.endDate && s.endDate < d) return false;
      return true;
    });
  return calculateStepGrading(steps);
}
