import { addDaysToKey, todayKey } from "./date";
import { flowCategories, flowProgress, flowProgressInCategory, snapshotForDay } from "./flowService";

/** 250 Everyday achievements — earned from step ticks, tab wins, streaks, consistency, grades, and setup. */
export const FLOW_ACHIEVEMENTS = [
  // --- Category 1: Step Milestones (Ticks) [40 items] ---
  { id: "any-step", title: "First spark", hint: "Mark your first Everyday step done" },
  { id: "steps-2", title: "Double tick", hint: "Mark 2 steps done across days" },
  { id: "steps-3", title: "Trio tick", hint: "Mark 3 steps done across days" },
  { id: "steps-5", title: "High five", hint: "Mark 5 steps done across days" },
  { id: "steps-8", title: "Octo tick", hint: "Mark 8 steps done across days" },
  { id: "steps-10", title: "Ten down", hint: "Mark 10 steps done across days" },
  { id: "steps-12", title: "Dozen done", hint: "Mark 12 steps done across days" },
  { id: "steps-15", title: "Sweet fifteen", hint: "Mark 15 steps done across days" },
  { id: "steps-20", title: "Score twenty", hint: "Mark 20 steps done across days" },
  { id: "steps-25", title: "Quarter century", hint: "Mark 25 steps done across days" },
  { id: "steps-30", title: "Thirty strong", hint: "Mark 30 steps done across days" },
  { id: "steps-35", title: "Thirty-five", hint: "Mark 35 steps done across days" },
  { id: "steps-40", title: "Forty steps", hint: "Mark 40 steps done across days" },
  { id: "steps-45", title: "Forty-five", hint: "Mark 45 steps done across days" },
  { id: "steps-50", title: "Half hundred", hint: "Mark 50 steps done across days" },
  { id: "steps-60", title: "Sixty ticks", hint: "Mark 60 steps done across days" },
  { id: "steps-70", title: "Seventy ticks", hint: "Mark 70 steps done across days" },
  { id: "steps-75", title: "Seventy-five", hint: "Mark 75 steps done across days" },
  { id: "steps-80", title: "Eighty ticks", hint: "Mark 80 steps done across days" },
  { id: "steps-90", title: "Ninety ticks", hint: "Mark 90 steps done across days" },
  { id: "steps-100", title: "100 ticks", hint: "One hundred done steps across days" },
  { id: "steps-120", title: "120 ticks", hint: "Mark 120 steps done across days" },
  { id: "steps-140", title: "140 ticks", hint: "Mark 140 steps done across days" },
  { id: "steps-160", title: "160 ticks", hint: "Mark 160 steps done across days" },
  { id: "steps-180", title: "180 ticks", hint: "Mark 180 steps done across days" },
  { id: "steps-200", title: "Double century", hint: "Mark 200 steps done across days" },
  { id: "steps-225", title: "225 ticks", hint: "Mark 225 steps done across days" },
  { id: "steps-250", title: "250 ticks", hint: "Two hundred fifty done steps" },
  { id: "steps-300", title: "Triple century", hint: "Mark 300 steps done across days" },
  { id: "steps-350", title: "350 ticks", hint: "Mark 350 steps done across days" },
  { id: "steps-400", title: "Four hundred", hint: "Mark 400 steps done across days" },
  { id: "steps-450", title: "450 ticks", hint: "Mark 450 steps done across days" },
  { id: "steps-500", title: "Grand five hundred", hint: "Mark 500 steps done across days" },
  { id: "steps-600", title: "Six hundred", hint: "Mark 600 steps done across days" },
  { id: "steps-700", title: "Seven hundred", hint: "Mark 700 steps done across days" },
  { id: "steps-800", title: "Eight hundred", hint: "Mark 800 steps done across days" },
  { id: "steps-900", title: "Nine hundred", hint: "Mark 900 steps done across days" },
  { id: "steps-1000", title: "Thousand master", hint: "Mark 1,000 steps done across days" },
  { id: "steps-1500", title: "Tick legend", hint: "Mark 1,500 steps done across days" },
  { id: "steps-2000", title: "Tick deity", hint: "Mark 2,000 steps done across days" },

  // --- Category 2: Total Tab Wins [35 items] ---
  { id: "first-win", title: "First win", hint: "Finish every step in one tab today" },
  { id: "wins-2", title: "Second wind", hint: "Complete two tabs total across days" },
  { id: "wins-3", title: "Triple triumph", hint: "Complete three tabs total across days" },
  { id: "wins-4", title: "Quad quest", hint: "Complete four tabs total across days" },
  { id: "wins-5", title: "Five star", hint: "Complete five tabs total across days" },
  { id: "wins-6", title: "Six pack", hint: "Complete six tabs total across days" },
  { id: "wins-7", title: "Seven wins", hint: "Seven tab completions total" },
  { id: "wins-8", title: "Eight ace", hint: "Complete eight tabs total across days" },
  { id: "wins-9", title: "Cloud nine", hint: "Complete nine tabs total across days" },
  { id: "wins-10", title: "Deca winner", hint: "Complete ten tabs total across days" },
  { id: "wins-12", title: "Dozen tabs", hint: "Complete twelve tabs total across days" },
  { id: "wins-15", title: "Fifteen victories", hint: "Complete 15 tabs total across days" },
  { id: "wins-18", title: "Eighteen wins", hint: "Complete 18 tabs total across days" },
  { id: "wins-20", title: "Twenty wins", hint: "Twenty tab completions total" },
  { id: "wins-25", title: "Silver twenty-five", hint: "Complete 25 tabs total across days" },
  { id: "wins-30", title: "Thirty triumphs", hint: "Complete 30 tabs total across days" },
  { id: "wins-35", title: "Thirty-five tabs", hint: "Complete 35 tabs total across days" },
  { id: "wins-40", title: "Forty victories", hint: "Complete 40 tabs total across days" },
  { id: "wins-45", title: "Forty-five wins", hint: "Complete 45 tabs total across days" },
  { id: "wins-50", title: "Fifty wins", hint: "Fifty tab completions total" },
  { id: "wins-60", title: "Sixty tabs", hint: "Complete 60 tabs total across days" },
  { id: "wins-70", title: "Seventy tabs", hint: "Complete 70 tabs total across days" },
  { id: "wins-75", title: "Diamond seventy-five", hint: "Complete 75 tabs total across days" },
  { id: "wins-80", title: "Eighty tabs", hint: "Complete 80 tabs total across days" },
  { id: "wins-90", title: "Ninety tabs", hint: "Complete 90 tabs total across days" },
  { id: "wins-100", title: "Century club", hint: "One hundred tab completions" },
  { id: "wins-120", title: "120 tabs", hint: "Complete 120 tabs total across days" },
  { id: "wins-140", title: "140 tabs", hint: "Complete 140 tabs total across days" },
  { id: "wins-160", title: "160 tabs", hint: "Complete 160 tabs total across days" },
  { id: "wins-180", title: "180 tabs", hint: "Complete 180 tabs total across days" },
  { id: "wins-200", title: "Double centurion", hint: "Complete 200 tabs total across days" },
  { id: "wins-250", title: "250 tabs", hint: "Complete 250 tabs total across days" },
  { id: "wins-300", title: "Triple centurion", hint: "Complete 300 tabs total across days" },
  { id: "wins-400", title: "Tab titan", hint: "Complete 400 tabs total across days" },
  { id: "wins-500", title: "Tab sovereign", hint: "Complete 500 tabs total across days" },

  // --- Category 3: Same-Day Sweeps & Daily Performance [25 items] ---
  { id: "same-day-1", title: "Single sweep", hint: "Win at least 1 tab in a single day" },
  { id: "double-win", title: "Double winner", hint: "Complete two tabs in the same day" },
  { id: "triple-win", title: "Hat trick", hint: "Complete three tabs in the same day" },
  { id: "quad-win", title: "Quad sweep", hint: "Complete four tabs in the same day" },
  { id: "penta-win", title: "High five", hint: "Complete five tabs in the same day" },
  { id: "same-day-6", title: "Six shooter", hint: "Complete 6 tabs in the same day" },
  { id: "same-day-7", title: "Grand slam", hint: "Complete 7 tabs in the same day" },
  { id: "same-day-8", title: "Octa sweep", hint: "Complete 8 tabs in the same day" },
  { id: "full-board", title: "Full board", hint: "Clear every tab in a flow in one day" },
  { id: "closer", title: "Closer", hint: "Finish the last open tab of the day" },
  { id: "half-day", title: "Halfway hero", hint: "Hit 50% of a day’s steps" },
  { id: "pct-60", title: "Sixty percent", hint: "Hit 60% of a day’s steps" },
  { id: "pct-70", title: "Seventy percent", hint: "Hit 70% of a day’s steps" },
  { id: "pct-80", title: "Eighty percent", hint: "Hit 80% of a day’s steps" },
  { id: "pct-90", title: "Ninety percent", hint: "Hit 90% of a day’s steps" },
  { id: "perfect-day", title: "Perfect day", hint: "Finish 100% of a day’s steps" },
  { id: "perfect-2", title: "Two perfects", hint: "Two full-clear days" },
  { id: "perfect-3", title: "Three perfects", hint: "Three full-clear days" },
  { id: "perfect-4", title: "Four perfects", hint: "Four full-clear days" },
  { id: "perfect-5", title: "Five perfects", hint: "Five full-clear days" },
  { id: "perfect-7", title: "Perfect week", hint: "Seven full-clear days" },
  { id: "perfect-10", title: "Ten perfects", hint: "Ten full-clear days" },
  { id: "perfect-15", title: "Fifteen perfects", hint: "15 full-clear days" },
  { id: "perfect-20", title: "Twenty perfects", hint: "20 full-clear days" },
  { id: "perfect-30", title: "Thirty perfects", hint: "30 full-clear days" },

  // --- Category 4: Consecutive Day Streaks [30 items] ---
  { id: "streak-2", title: "Two in a row", hint: "Win a tab 2 days in a row" },
  { id: "win-streak-3", title: "Three-day fire", hint: "Win a tab three days in a row" },
  { id: "streak-4", title: "Four flame", hint: "Win a tab 4 days in a row" },
  { id: "streak-5", title: "Five-day roll", hint: "Win a tab 5 days in a row" },
  { id: "streak-6", title: "Six-day spark", hint: "Win a tab 6 days in a row" },
  { id: "win-streak-7", title: "Week warrior", hint: "Win a tab seven days in a row" },
  { id: "streak-8", title: "Eight-day surge", hint: "Win a tab 8 days in a row" },
  { id: "streak-9", title: "Nine-day push", hint: "Win a tab 9 days in a row" },
  { id: "streak-10", title: "Ten-day champion", hint: "Win a tab 10 days in a row" },
  { id: "streak-12", title: "Twelve-day drive", hint: "Win a tab 12 days in a row" },
  { id: "win-streak-14", title: "Fortnight flame", hint: "Win a tab 14 days in a row" },
  { id: "streak-16", title: "Sweet sixteen streak", hint: "Win a tab 16 days in a row" },
  { id: "streak-18", title: "Eighteen-day rhythm", hint: "Win a tab 18 days in a row" },
  { id: "streak-20", title: "Twenty-day flow", hint: "Win a tab 20 days in a row" },
  { id: "streak-21", title: "Three weeks unstopped", hint: "Win a tab 21 days in a row" },
  { id: "streak-24", title: "Twenty-four streak", hint: "Win a tab 24 days in a row" },
  { id: "streak-28", title: "Four-week master", hint: "Win a tab 28 days in a row" },
  { id: "win-streak-30", title: "Monthly machine", hint: "Win a tab 30 days in a row" },
  { id: "streak-35", title: "Thirty-five streak", hint: "Win a tab 35 days in a row" },
  { id: "streak-40", title: "Forty-day fortress", hint: "Win a tab 40 days in a row" },
  { id: "streak-45", title: "Forty-five flow", hint: "Win a tab 45 days in a row" },
  { id: "streak-50", title: "Fifty-day monument", hint: "Win a tab 50 days in a row" },
  { id: "streak-60", title: "Two-month titan", hint: "Win a tab 60 days in a row" },
  { id: "streak-70", title: "Seventy-day legend", hint: "Win a tab 70 days in a row" },
  { id: "streak-75", title: "Seventy-five unbreakable", hint: "Win a tab 75 days in a row" },
  { id: "streak-80", title: "Eighty-day force", hint: "Win a tab 80 days in a row" },
  { id: "streak-90", title: "Quarter-year quest", hint: "Win a tab 90 days in a row" },
  { id: "streak-100", title: "Century streak", hint: "Win a tab 100 days in a row" },
  { id: "streak-120", title: "Four-month phenom", hint: "Win a tab 120 days in a row" },
  { id: "streak-150", title: "Half-year immortal", hint: "Win a tab 150 days in a row" },

  // --- Category 5: Tab Loyalty (Same Tab Consecutive Days) [25 items] ---
  { id: "loyal-2", title: "Two-step dance", hint: "Same tab complete 2 days straight" },
  { id: "loyal-3", title: "Trio devotion", hint: "Same tab complete 3 days straight" },
  { id: "loyal-4", title: "Four-day bond", hint: "Same tab complete 4 days straight" },
  { id: "loyal-5", title: "Five-day focus", hint: "Same tab complete 5 days straight" },
  { id: "loyal-6", title: "Six-day habit", hint: "Same tab complete 6 days straight" },
  { id: "loyal-7", title: "Loyal tab", hint: "Same tab complete 7 days straight" },
  { id: "loyal-8", title: "Eight-day commitment", hint: "Same tab complete 8 days straight" },
  { id: "loyal-9", title: "Nine-day devotion", hint: "Same tab complete 9 days straight" },
  { id: "loyal-10", title: "Ten-day pact", hint: "Same tab complete 10 days straight" },
  { id: "loyal-12", title: "Twelve-day routine", hint: "Same tab complete 12 days straight" },
  { id: "loyal-14", title: "Ride or die", hint: "Same tab complete 14 days straight" },
  { id: "loyal-16", title: "Sixteen-day groove", hint: "Same tab complete 16 days straight" },
  { id: "loyal-18", title: "Eighteen-day lock", hint: "Same tab complete 18 days straight" },
  { id: "loyal-20", title: "Twenty-day bond", hint: "Same tab complete 20 days straight" },
  { id: "loyal-21", title: "Habit unlocked", hint: "Same tab complete 21 days straight" },
  { id: "loyal-25", title: "Silver loyalty", hint: "Same tab complete 25 days straight" },
  { id: "loyal-30", title: "Tab marriage", hint: "Same tab complete 30 days straight" },
  { id: "loyal-35", title: "Thirty-five lock", hint: "Same tab complete 35 days straight" },
  { id: "loyal-40", title: "Forty-day pact", hint: "Same tab complete 40 days straight" },
  { id: "loyal-45", title: "Forty-five loyalty", hint: "Same tab complete 45 days straight" },
  { id: "loyal-50", title: "Golden devotion", hint: "Same tab complete 50 days straight" },
  { id: "loyal-60", title: "Diamond fidelity", hint: "Same tab complete 60 days straight" },
  { id: "loyal-75", title: "Platinum habit", hint: "Same tab complete 75 days straight" },
  { id: "loyal-90", title: "Quarter-year bond", hint: "Same tab complete 90 days straight" },
  { id: "loyal-100", title: "Century fidelity", hint: "Same tab complete 100 days straight" },

  // --- Category 6: Iron Tab (Total Days Any Single Tab Won) [25 items] ---
  { id: "iron-1", title: "Iron seed", hint: "One tab fully done on 1 day" },
  { id: "iron-2", title: "Iron sprout", hint: "One tab fully done on 2 days" },
  { id: "iron-3", title: "Iron bronze", hint: "One tab fully done on 3 days" },
  { id: "iron-4", title: "Iron core", hint: "One tab fully done on 4 days" },
  { id: "iron-5", title: "Iron five", hint: "One tab fully done on 5 days" },
  { id: "iron-6", title: "Iron shield", hint: "One tab fully done on 6 days" },
  { id: "iron-7", title: "Iron week", hint: "One tab fully done on 7 days" },
  { id: "iron-8", title: "Iron eight", hint: "One tab fully done on 8 days" },
  { id: "iron-9", title: "Iron forge", hint: "One tab fully done on 9 days" },
  { id: "iron-10", title: "Iron tab", hint: "One tab fully done on 10 days" },
  { id: "iron-12", title: "Iron dozen", hint: "One tab fully done on 12 days" },
  { id: "iron-15", title: "Iron fifteen", hint: "One tab fully done on 15 days" },
  { id: "iron-18", title: "Iron eighteen", hint: "One tab fully done on 18 days" },
  { id: "iron-20", title: "Steel tab", hint: "One tab fully done on 20 days" },
  { id: "iron-25", title: "Titanium tab", hint: "One tab fully done on 25 days" },
  { id: "iron-30", title: "Cobalt tab", hint: "One tab fully done on 30 days" },
  { id: "iron-35", title: "Bronze bedrock", hint: "One tab fully done on 35 days" },
  { id: "iron-40", title: "Silver bedrock", hint: "One tab fully done on 40 days" },
  { id: "iron-45", title: "Gold bedrock", hint: "One tab fully done on 45 days" },
  { id: "iron-50", title: "Obsidian tab", hint: "One tab fully done on 50 days" },
  { id: "iron-60", title: "Mithril tab", hint: "One tab fully done on 60 days" },
  { id: "iron-70", title: "Adamant tab", hint: "One tab fully done on 70 days" },
  { id: "iron-80", title: "Vibranium tab", hint: "One tab fully done on 80 days" },
  { id: "iron-90", title: "Diamond bedrock", hint: "One tab fully done on 90 days" },
  { id: "iron-100", title: "Eternal tab", hint: "One tab fully done on 100 days" },

  // --- Category 7: Grades & Performance Excellence [25 items] ---
  { id: "grade-c", title: "Passing grade", hint: "Earn a C or better on a daily report" },
  { id: "grade-b", title: "Good standing", hint: "Earn a B or better on a daily report" },
  { id: "a-grade", title: "Honor roll", hint: "Earn an A on a daily card" },
  { id: "a-plus", title: "A+ student", hint: "Earn an A+ on a daily card" },
  { id: "b-count-3", title: "Three B's", hint: "3 days at B or better" },
  { id: "b-count-5", title: "Five B's", hint: "5 days at B or better" },
  { id: "b-club", title: "B club", hint: "Ten days at B or better" },
  { id: "b-count-15", title: "Fifteen B's", hint: "15 days at B or better" },
  { id: "b-count-20", title: "Twenty B's", hint: "20 days at B or better" },
  { id: "b-count-30", title: "Thirty B's", hint: "30 days at B or better" },
  { id: "a-count-2", title: "Two A's", hint: "2 days at A or A+" },
  { id: "a-count-3", title: "Triple honor", hint: "3 days at A or A+" },
  { id: "a-count-5", title: "Five A's", hint: "5 days at A or A+" },
  { id: "a-count-7", title: "A-Grade week", hint: "7 days at A or A+" },
  { id: "a-count-10", title: "Ten A's", hint: "10 days at A or A+" },
  { id: "a-count-15", title: "Fifteen A's", hint: "15 days at A or A+" },
  { id: "a-count-20", title: "Dean's list", hint: "20 days at A or A+" },
  { id: "a-count-30", title: "Valedictorian", hint: "30 days at A or A+" },
  { id: "ap-count-2", title: "Double A+", hint: "2 days with an A+" },
  { id: "ap-count-3", title: "Triple A+", hint: "3 days with an A+" },
  { id: "ap-count-5", title: "Five A+", hint: "5 days with an A+" },
  { id: "ap-count-7", title: "Perfect A+ week", hint: "7 days with an A+" },
  { id: "ap-count-10", title: "Ten A+", hint: "10 days with an A+" },
  { id: "no-f-week", title: "No F week", hint: "Seven logged days without an F" },
  { id: "gold-week", title: "Gold week", hint: "Three A+ days in seven days" },

  // --- Category 8: Reports Logged (Consistency Over Time) [25 items] ---
  { id: "first-report", title: "First report", hint: "Lock a daily report after midnight" },
  { id: "reports-2", title: "Second card", hint: "Two daily reports saved" },
  { id: "reports-3", title: "Three reports", hint: "Three daily reports saved" },
  { id: "reports-4", title: "Four reports", hint: "Four daily reports saved" },
  { id: "reports-5", title: "Five reports", hint: "Five daily reports saved" },
  { id: "reports-6", title: "Six reports", hint: "Six daily reports saved" },
  { id: "reports-7", title: "Week of cards", hint: "Seven daily reports saved" },
  { id: "reports-8", title: "Eight reports", hint: "Eight daily reports saved" },
  { id: "reports-9", title: "Nine reports", hint: "Nine daily reports saved" },
  { id: "reports-10", title: "Ten reports", hint: "Ten daily reports saved" },
  { id: "reports-12", title: "Dozen reports", hint: "Twelve daily reports saved" },
  { id: "reports-14", title: "Two-week log", hint: "Fourteen daily reports saved" },
  { id: "reports-16", title: "Sixteen reports", hint: "16 daily reports saved" },
  { id: "reports-18", title: "Eighteen reports", hint: "18 daily reports saved" },
  { id: "reports-20", title: "Twenty reports", hint: "20 daily reports saved" },
  { id: "reports-21", title: "Three-week log", hint: "21 daily reports saved" },
  { id: "reports-25", title: "Quarter hundred logs", hint: "25 daily reports saved" },
  { id: "reports-28", title: "Four-week log", hint: "28 daily reports saved" },
  { id: "reports-30", title: "Month of cards", hint: "Thirty daily reports saved" },
  { id: "reports-45", title: "Forty-five logs", hint: "45 daily reports saved" },
  { id: "reports-60", title: "Two months of cards", hint: "60 daily reports saved" },
  { id: "reports-75", title: "Seventy-five logs", hint: "75 daily reports saved" },
  { id: "reports-90", title: "Quarter-year cards", hint: "90 daily reports saved" },
  { id: "reports-100", title: "Century archive", hint: "100 daily reports saved" },
  { id: "reports-180", title: "Half-year archive", hint: "180 daily reports saved" },

  // --- Category 9: Flow Setup, Structure & Mastery [20 items] ---
  { id: "everyday-on", title: "Everyday on", hint: "Have an Everyday flow" },
  { id: "two-flows", title: "Double life", hint: "Run two Everyday flows" },
  { id: "three-flows", title: "Triple track", hint: "Run three Everyday flows" },
  { id: "four-flows", title: "Quad engine", hint: "Run four Everyday flows" },
  { id: "five-flows", title: "Pentagon system", hint: "Run five Everyday flows" },
  { id: "one-tab", title: "Single focus", hint: "Have a tab on an Everyday flow" },
  { id: "two-tabs", title: "Split focus", hint: "Keep two tabs on an Everyday flow" },
  { id: "three-tabs", title: "Triple tab", hint: "Keep 3 tabs on an Everyday flow" },
  { id: "four-tabs", title: "Quad tab", hint: "Keep 4 tabs on an Everyday flow" },
  { id: "five-tabs", title: "Tab garden", hint: "Keep five tabs on one flow" },
  { id: "rainbow", title: "Rainbow board", hint: "Six or more tabs on one flow" },
  { id: "any-order-win", title: "Free range", hint: "Win a tab on an any-order flow" },
  { id: "sequence-win", title: "In order", hint: "Win a tab on a sequential flow" },
  { id: "sweep-week", title: "Weekly sweep", hint: "Every tab wins at least once in 7 days" },
  { id: "balanced-week", title: "Balanced week", hint: "Three different tabs win in 7 days" },
  { id: "multi-flow-win", title: "Everywhere", hint: "Win a tab in two flows the same day" },
  { id: "always-finisher", title: "Always finisher", hint: "One tab complete on 80%+ of logged days (min 3)" },
  { id: "comeback", title: "Comeback", hint: "Win a tab after a day under 50%" },
  { id: "flow-steps-5", title: "Five-step flow", hint: "Run an Everyday flow with at least 5 steps" },
  { id: "flow-steps-10", title: "Ten-step power", hint: "Run an Everyday flow with at least 10 steps" },
];

function everydayFlows(flows) {
  return (flows || []).filter((f) => f.repeat === "daily");
}

function catsWonOnDay(flow, dateKey) {
  const snap = snapshotForDay(flow, dateKey);
  if (!snap) return [];
  return (snap.categories || []).filter((c) => c.total > 0 && c.done >= c.total);
}

function anyWinOnDay(flow, dateKey) {
  return catsWonOnDay(flow, dateKey).length > 0;
}

function maxWinsSameDay(list) {
  const today = todayKey();
  const keys = new Set([today]);
  list.forEach((f) => (f.reports || []).forEach((r) => r.dateKey && keys.add(r.dateKey)));
  let max = 0;
  keys.forEach((k) => {
    list.forEach((f) => {
      max = Math.max(max, catsWonOnDay(f, k).length);
    });
  });
  return max;
}

function streakDays(list, pred, shieldDates = []) {
  let n = 0;
  let key = todayKey();
  for (let i = 0; i < 200; i += 1) {
    const isWon = list.some((f) => pred(f, key));
    const hasShield = Array.isArray(shieldDates) && shieldDates.includes(key);
    if (!isWon && !hasShield) break;
    n += 1;
    key = addDaysToKey(key, -1);
  }
  return n;
}

export function calculateFlowStreak(flows, shieldDates = []) {
  const list = everydayFlows(flows);
  return streakDays(list, anyWinOnDay, shieldDates);
}

function sameTabStreak(flow) {
  const cats = flowCategories(flow);
  let best = 0;
  cats.forEach((cat) => {
    let n = 0;
    let key = todayKey();
    for (let i = 0; i < 200; i += 1) {
      const won = catsWonOnDay(flow, key).some((c) => c.id === cat.id);
      if (!won) break;
      n += 1;
      key = addDaysToKey(key, -1);
    }
    best = Math.max(best, n);
  });
  return best;
}

function totalTabWins(list) {
  let n = 0;
  const today = todayKey();
  const keys = new Set([today]);
  list.forEach((f) => (f.reports || []).forEach((r) => r.dateKey && keys.add(r.dateKey)));
  keys.forEach((k) => {
    list.forEach((f) => {
      n += catsWonOnDay(f, k).length;
    });
  });
  return n;
}

function totalDoneSteps(list) {
  let n = 0;
  list.forEach((f) => {
    n += flowProgress(f, todayKey()).done;
    (f.reports || []).forEach((r) => {
      n += Number(r.done) || 0;
    });
  });
  return n;
}

function ironDays(flow) {
  const cats = flowCategories(flow);
  let best = 0;
  cats.forEach((cat) => {
    let d = 0;
    const keys = new Set([todayKey(), ...(flow.reports || []).map((r) => r.dateKey)]);
    keys.forEach((k) => {
      if (catsWonOnDay(flow, k).some((c) => c.id === cat.id)) d += 1;
    });
    best = Math.max(best, d);
  });
  return best;
}

function uniqueWinsInWindow(flow, days) {
  const end = todayKey();
  const ids = new Set();
  for (let i = 0; i < days; i += 1) {
    catsWonOnDay(flow, addDaysToKey(end, -i)).forEach((c) => ids.add(c.id));
  }
  return ids.size;
}

function allTabsWonInWindow(flow, days) {
  const cats = flowCategories(flow).filter((c) => {
    const p = flowProgressInCategory(flow, c.id);
    return p.total > 0 || (flow.reports || []).some((r) =>
      (r.categories || []).some((x) => x.id === c.id && x.total > 0)
    );
  });
  if (cats.length === 0) return false;
  const won = uniqueWinsInWindow(flow, days);
  return won >= cats.length;
}

function gradesInWindow(flow, days) {
  const end = todayKey();
  const out = [];
  for (let i = 0; i < days; i += 1) {
    const snap = snapshotForDay(flow, addDaysToKey(end, -i));
    if (snap && snap.total > 0) out.push(snap.grade);
  }
  return out;
}

export function mostReliableCategory(flow) {
  if (!flow || flow.repeat !== "daily") return null;
  const cats = flowCategories(flow);
  const keys = [...new Set([todayKey(), ...(flow.reports || []).map((r) => r.dateKey).filter(Boolean)])];
  let best = null;
  cats.forEach((cat) => {
    let completeDays = 0;
    let logged = 0;
    keys.forEach((k) => {
      const snap = snapshotForDay(flow, k);
      const row = (snap?.categories || []).find((c) => c.id === cat.id);
      if (!row || row.total <= 0) return;
      logged += 1;
      if (row.done >= row.total) completeDays += 1;
    });
    if (!logged) return;
    const rate = completeDays / logged;
    const cand = { ...cat, completeDays, logged, rate };
    if (
      !best ||
      rate > best.rate ||
      (rate === best.rate && completeDays > best.completeDays)
    ) {
      best = cand;
    }
  });
  return best;
}

export function evaluateUnlockedIds(flows, shieldDates = []) {
  const list = everydayFlows(flows);
  const unlocked = new Set();
  if (!list.length) return unlocked;

  // --- Category 9: Flow Setup & Structure ---
  unlocked.add("everyday-on");
  if (list.length >= 2) unlocked.add("two-flows");
  if (list.length >= 3) unlocked.add("three-flows");
  if (list.length >= 4) unlocked.add("four-flows");
  if (list.length >= 5) unlocked.add("five-flows");

  const maxTabs = Math.max(0, ...list.map((f) => flowCategories(f).length));
  if (maxTabs >= 1) unlocked.add("one-tab");
  if (maxTabs >= 2) unlocked.add("two-tabs");
  if (maxTabs >= 3) unlocked.add("three-tabs");
  if (maxTabs >= 4) unlocked.add("four-tabs");
  if (maxTabs >= 5) unlocked.add("five-tabs");
  if (maxTabs >= 6) unlocked.add("rainbow");

  const maxStepsInAFlow = Math.max(0, ...list.map((f) => (f.steps || []).length));
  if (maxStepsInAFlow >= 5) unlocked.add("flow-steps-5");
  if (maxStepsInAFlow >= 10) unlocked.add("flow-steps-10");

  const today = todayKey();

  // --- Category 1: Step Milestones (Ticks) ---
  const steps = totalDoneSteps(list);
  const stepThresholds = [
    [1, "any-step"], [2, "steps-2"], [3, "steps-3"], [5, "steps-5"], [8, "steps-8"],
    [10, "steps-10"], [12, "steps-12"], [15, "steps-15"], [20, "steps-20"], [25, "steps-25"],
    [30, "steps-30"], [35, "steps-35"], [40, "steps-40"], [45, "steps-45"], [50, "steps-50"],
    [60, "steps-60"], [70, "steps-70"], [75, "steps-75"], [80, "steps-80"], [90, "steps-90"],
    [100, "steps-100"], [120, "steps-120"], [140, "steps-140"], [160, "steps-160"], [180, "steps-180"],
    [200, "steps-200"], [225, "steps-225"], [250, "steps-250"], [300, "steps-300"], [350, "steps-350"],
    [400, "steps-400"], [450, "steps-450"], [500, "steps-500"], [600, "steps-600"], [700, "steps-700"],
    [800, "steps-800"], [900, "steps-900"], [1000, "steps-1000"], [1500, "steps-1500"], [2000, "steps-2000"]
  ];
  stepThresholds.forEach(([th, id]) => {
    if (steps >= th) unlocked.add(id);
  });

  // --- Category 2: Total Tab Wins ---
  const wins = totalTabWins(list);
  const winThresholds = [
    [1, "first-win"], [2, "wins-2"], [3, "wins-3"], [4, "wins-4"], [5, "wins-5"],
    [6, "wins-6"], [7, "wins-7"], [8, "wins-8"], [9, "wins-9"], [10, "wins-10"],
    [12, "wins-12"], [15, "wins-15"], [18, "wins-18"], [20, "wins-20"], [25, "wins-25"],
    [30, "wins-30"], [35, "wins-35"], [40, "wins-40"], [45, "wins-45"], [50, "wins-50"],
    [60, "wins-60"], [70, "wins-70"], [75, "wins-75"], [80, "wins-80"], [90, "wins-90"],
    [100, "wins-100"], [120, "wins-120"], [140, "wins-140"], [160, "wins-160"], [180, "wins-180"],
    [200, "wins-200"], [250, "wins-250"], [300, "wins-300"], [400, "wins-400"], [500, "wins-500"]
  ];
  winThresholds.forEach(([th, id]) => {
    if (wins >= th) unlocked.add(id);
  });

  // --- Category 3: Same-Day Sweeps & Daily Performance ---
  const maxSame = maxWinsSameDay(list);
  if (maxSame >= 1) unlocked.add("same-day-1");
  if (maxSame >= 2) unlocked.add("double-win");
  if (maxSame >= 3) unlocked.add("triple-win");
  if (maxSame >= 4) unlocked.add("quad-win");
  if (maxSame >= 5) unlocked.add("penta-win");
  if (maxSame >= 6) unlocked.add("same-day-6");
  if (maxSame >= 7) unlocked.add("same-day-7");
  if (maxSame >= 8) unlocked.add("same-day-8");

  let maxPctEver = 0;
  let totalPerfectDays = 0;
  list.forEach((f) => {
    const prog = flowProgress(f, today);
    if (prog.total > 0) maxPctEver = Math.max(maxPctEver, prog.pct);
    if (prog.complete && prog.total > 0) totalPerfectDays += 1;

    (f.reports || []).forEach((r) => {
      if (r.total > 0) maxPctEver = Math.max(maxPctEver, r.pct || 0);
      if ((r.pct || 0) >= 97 && (r.total || 0) > 0) totalPerfectDays += 1;
    });
  });

  if (maxPctEver >= 50) unlocked.add("half-day");
  if (maxPctEver >= 60) unlocked.add("pct-60");
  if (maxPctEver >= 70) unlocked.add("pct-70");
  if (maxPctEver >= 80) unlocked.add("pct-80");
  if (maxPctEver >= 90) unlocked.add("pct-90");

  const perfectThresholds = [
    [1, "perfect-day"], [2, "perfect-2"], [3, "perfect-3"], [4, "perfect-4"], [5, "perfect-5"],
    [7, "perfect-7"], [10, "perfect-10"], [15, "perfect-15"], [20, "perfect-20"], [30, "perfect-30"]
  ];
  perfectThresholds.forEach(([th, id]) => {
    if (totalPerfectDays >= th) unlocked.add(id);
  });

  // --- Category 4: Consecutive Day Streaks ---
  const anyStreak = streakDays(list, anyWinOnDay, shieldDates);
  const streakThresholds = [
    [2, "streak-2"], [3, "win-streak-3"], [4, "streak-4"], [5, "streak-5"], [6, "streak-6"],
    [7, "win-streak-7"], [8, "streak-8"], [9, "streak-9"], [10, "streak-10"], [12, "streak-12"],
    [14, "win-streak-14"], [16, "streak-16"], [18, "streak-18"], [20, "streak-20"], [21, "streak-21"],
    [24, "streak-24"], [28, "streak-28"], [30, "win-streak-30"], [35, "streak-35"], [40, "streak-40"],
    [45, "streak-45"], [50, "streak-50"], [60, "streak-60"], [70, "streak-70"], [75, "streak-75"],
    [80, "streak-80"], [90, "streak-90"], [100, "streak-100"], [120, "streak-120"], [150, "streak-150"]
  ];
  streakThresholds.forEach(([th, id]) => {
    if (anyStreak >= th) unlocked.add(id);
  });

  // --- Category 5: Tab Loyalty ---
  const maxLoyal = Math.max(0, ...list.map(sameTabStreak));
  const loyalThresholds = [
    [2, "loyal-2"], [3, "loyal-3"], [4, "loyal-4"], [5, "loyal-5"], [6, "loyal-6"],
    [7, "loyal-7"], [8, "loyal-8"], [9, "loyal-9"], [10, "loyal-10"], [12, "loyal-12"],
    [14, "loyal-14"], [16, "loyal-16"], [18, "loyal-18"], [20, "loyal-20"], [21, "loyal-21"],
    [25, "loyal-25"], [30, "loyal-30"], [35, "loyal-35"], [40, "loyal-40"], [45, "loyal-45"],
    [50, "loyal-50"], [60, "loyal-60"], [75, "loyal-75"], [90, "loyal-90"], [100, "loyal-100"]
  ];
  loyalThresholds.forEach(([th, id]) => {
    if (maxLoyal >= th) unlocked.add(id);
  });

  // --- Category 6: Iron Tab ---
  const maxIron = Math.max(0, ...list.map(ironDays));
  const ironThresholds = [
    [1, "iron-1"], [2, "iron-2"], [3, "iron-3"], [4, "iron-4"], [5, "iron-5"],
    [6, "iron-6"], [7, "iron-7"], [8, "iron-8"], [9, "iron-9"], [10, "iron-10"],
    [12, "iron-12"], [15, "iron-15"], [18, "iron-18"], [20, "iron-20"], [25, "iron-25"],
    [30, "iron-30"], [35, "iron-35"], [40, "iron-40"], [45, "iron-45"], [50, "iron-50"],
    [60, "iron-60"], [70, "iron-70"], [80, "iron-80"], [90, "iron-90"], [100, "iron-100"]
  ];
  ironThresholds.forEach(([th, id]) => {
    if (maxIron >= th) unlocked.add(id);
  });

  // --- Category 7: Grades & Performance Excellence ---
  let bOrBetterCount = 0;
  let aOrBetterCount = 0;
  let aPlusCount = 0;
  let hasC = false;
  let hasB = false;

  list.forEach((f) => {
    const prog = flowProgress(f, today);
    const todayGrade = prog.total > 0 ? (prog.pct >= 97 ? "A+" : prog.pct >= 85 ? "A" : prog.pct >= 70 ? "B" : prog.pct >= 50 ? "C" : "F") : null;
    const allGrades = [
      todayGrade,
      ...(f.reports || []).map((r) => r.grade)
    ].filter(Boolean);

    allGrades.forEach((g) => {
      if (["A+", "A", "B+", "B", "C+", "C"].includes(g)) hasC = true;
      if (["A+", "A", "B+", "B"].includes(g)) {
        hasB = true;
        bOrBetterCount += 1;
      }
      if (["A+", "A"].includes(g)) {
        aOrBetterCount += 1;
      }
      if (g === "A+") {
        aPlusCount += 1;
      }
    });
  });

  if (hasC) unlocked.add("grade-c");
  if (hasB) unlocked.add("grade-b");
  if (aOrBetterCount > 0) unlocked.add("a-grade");
  if (aPlusCount > 0) unlocked.add("a-plus");

  const bThresholds = [[3, "b-count-3"], [5, "b-count-5"], [10, "b-club"], [15, "b-count-15"], [20, "b-count-20"], [30, "b-count-30"]];
  bThresholds.forEach(([th, id]) => { if (bOrBetterCount >= th) unlocked.add(id); });

  const aThresholds = [[2, "a-count-2"], [3, "a-count-3"], [5, "a-count-5"], [7, "a-count-7"], [10, "a-count-10"], [15, "a-count-15"], [20, "a-count-20"], [30, "a-count-30"]];
  aThresholds.forEach(([th, id]) => { if (aOrBetterCount >= th) unlocked.add(id); });

  const apThresholds = [[2, "ap-count-2"], [3, "ap-count-3"], [5, "ap-count-5"], [7, "ap-count-7"], [10, "ap-count-10"]];
  apThresholds.forEach(([th, id]) => { if (aPlusCount >= th) unlocked.add(id); });

  list.forEach((f) => {
    const cats = flowCategories(f);
    const todayWins = catsWonOnDay(f, today);
    const activeCats = cats.filter((c) => flowProgressInCategory(f, c.id, today).total > 0);
    if (activeCats.length > 0 && todayWins.length === activeCats.length) {
      unlocked.add("full-board");
      if (activeCats.length > 1) unlocked.add("closer");
    }
    if (todayWins.length > 0 && todayWins.length === activeCats.length && activeCats.length > 1) {
      unlocked.add("closer");
    }

    const weekGrades = gradesInWindow(f, 7);
    if (weekGrades.length >= 7 && weekGrades.every((g) => g !== "F")) unlocked.add("no-f-week");
    if (weekGrades.filter((g) => g === "A+").length >= 3) unlocked.add("gold-week");

    if (allTabsWonInWindow(f, 7)) unlocked.add("sweep-week");
    if (uniqueWinsInWindow(f, 7) >= 3) unlocked.add("balanced-week");

    if (todayWins.length && f.anyOrder) unlocked.add("any-order-win");
    if (todayWins.length && !f.anyOrder) unlocked.add("sequence-win");
    (f.reports || []).forEach((r) => {
      const w = (r.categories || []).filter((c) => c.total > 0 && c.done >= c.total);
      if (w.length && f.anyOrder) unlocked.add("any-order-win");
      if (w.length && !f.anyOrder) unlocked.add("sequence-win");
    });

    const reliable = mostReliableCategory(f);
    if (reliable && reliable.logged >= 3 && reliable.rate >= 0.8) {
      unlocked.add("always-finisher");
    }

    const reportsSorted = [...(f.reports || [])].sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
    if (reportsSorted[0] && (reportsSorted[0].pct || 0) < 50 && todayWins.length > 0) {
      unlocked.add("comeback");
    }
  });

  // --- Category 8: Reports Logged ---
  const totalReports = list.reduce((acc, f) => acc + (f.reports || []).length, 0);
  const reportThresholds = [
    [1, "first-report"], [2, "reports-2"], [3, "reports-3"], [4, "reports-4"], [5, "reports-5"],
    [6, "reports-6"], [7, "reports-7"], [8, "reports-8"], [9, "reports-9"], [10, "reports-10"],
    [12, "reports-12"], [14, "reports-14"], [16, "reports-16"], [18, "reports-18"], [20, "reports-20"],
    [21, "reports-21"], [25, "reports-25"], [28, "reports-28"], [30, "reports-30"], [45, "reports-45"],
    [60, "reports-60"], [75, "reports-75"], [90, "reports-90"], [100, "reports-100"], [180, "reports-180"]
  ];
  reportThresholds.forEach(([th, id]) => {
    if (totalReports >= th) unlocked.add(id);
  });

  let twoFlowSameDay = false;
  const keys = new Set([today]);
  list.forEach((f) => (f.reports || []).forEach((r) => r.dateKey && keys.add(r.dateKey)));
  keys.forEach((k) => {
    const n = list.filter((f) => anyWinOnDay(f, k)).length;
    if (n >= 2) twoFlowSameDay = true;
  });
  if (twoFlowSameDay) unlocked.add("multi-flow-win");

  return unlocked;
}

export function mergeAchievementRecords(existing, unlockedIds) {
  const map = {};
  (existing || []).forEach((a) => {
    if (a?.id) map[a.id] = { id: a.id, unlockedAt: a.unlockedAt || new Date().toISOString() };
  });
  const now = new Date().toISOString();
  unlockedIds.forEach((id) => {
    if (!map[id]) map[id] = { id, unlockedAt: now };
  });
  return FLOW_ACHIEVEMENTS.map((def) => map[def.id]).filter(Boolean);
}

export function applyAchievementsToFlows(flows) {
  const ids = evaluateUnlockedIds(flows);
  return (flows || []).map((f) => {
    if (f.repeat !== "daily") return f;
    const achievements = mergeAchievementRecords(f.achievements, ids);
    if (achievements.length === (f.achievements || []).length) return f;
    return { ...f, achievements };
  });
}
