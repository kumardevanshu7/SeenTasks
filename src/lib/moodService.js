import { todayKey } from "./date";

/**
 * 16 Curated Mood Expressions with deep meanings.
 * Users reflect and mark their daily mood strictly between 11:00 PM and 11:59 PM.
 */
export const MOOD_EXPRESSIONS = [
  {
    id: "electrified",
    emoji: "⚡",
    label: "Electrified",
    meaning: "Surged with unstoppable energy, breakthroughs, and intense creative passion.",
    whenToChoose: "Jab din bhar high adrenaline aur inspiration raha ho, bina thake kaam tezi se hua ho.",
    exampleScene: "Subah se shaam tak ek naya feature ya project bina break ke execute kar diya aur outcome dekh kar goosebumps aa gaye.",
    tone: "high",
    vibeTag: "High Energy",
    color: "#fde68a",
  },
  {
    id: "on-fire",
    emoji: "🔥",
    label: "On Fire",
    meaning: "Crushed goals one after another with ruthless momentum and zero hesitation.",
    whenToChoose: "Jab backlog ke saare tasks ek-ek karke tick ho gaye aur momentum unstoppable tha.",
    exampleScene: "Jo 5 mushkil tasks hafte bhar se pending the, aaj ek hi din mein 1-hour focus sprints laga kar khatam kar diye.",
    tone: "high",
    vibeTag: "Peak Output",
    color: "#fecaca",
  },
  {
    id: "zen-flow",
    emoji: "🧘",
    label: "Zen Flow",
    meaning: "Calm, peaceful, distraction-free steady work with deep inner clarity.",
    whenToChoose: "Jab koi stress ya shor nahi tha, bilkul shanti ke saath continuous deep work hua.",
    exampleScene: "Headphones lagaye, phone silent kiya aur bina kisi distraction ke 3-4 ghante deep flow state mein execute kiya.",
    tone: "good",
    vibeTag: "Deep Focus",
    color: "#bbf7d0",
  },
  {
    id: "laser-focused",
    emoji: "🎯",
    label: "Laser Focused",
    meaning: "Locked in on the highest priority tasks, shutting out all surrounding noise.",
    whenToChoose: "Jab din bhar sirf single highest-priority goal par aankh tiki rahi.",
    exampleScene: "Duniya bhar ke emails aur notifications ko ignore karke sirf main critical deliverable complete kiya.",
    tone: "good",
    vibeTag: "Targeted",
    color: "#bae6fd",
  },
  {
    id: "victorious",
    emoji: "💎",
    label: "Victorious",
    meaning: "Fought through difficult resistance or complex obstacles and triumphed.",
    whenToChoose: "Jab koi bada hurdle, nasty bug ya tough blocker conquer ho gaya ho.",
    exampleScene: "3 din se atka hua critical bug ya deployment issue finally crack ho gaya aur sab smoothly live ho gaya.",
    tone: "high",
    vibeTag: "Triumph",
    color: "#c7d2fe",
  },
  {
    id: "unstoppable",
    emoji: "🚀",
    label: "Unstoppable",
    meaning: "Pushed through barriers with relentless pace, turning big ambitions into concrete reality.",
    whenToChoose: "Jab har challenge ko cross karte hue aage badhte rahe aur koi rukawat rok nahi saki.",
    exampleScene: "Plans cancel hue, delays aaye, phir bhi backup plan activate karke poora milestone achieve kiya.",
    tone: "high",
    vibeTag: "Relentless",
    color: "#fed7aa",
  },
  {
    id: "growing",
    emoji: "🌱",
    label: "Growing",
    meaning: "Learned vital lessons, improved step by step, and planted seeds for tomorrow.",
    whenToChoose: "Jab naye skills seekhe, mistakes se seekh mili aur self-improvement mehsoos hua.",
    exampleScene: "Ek nayi technology ya framework par time spend kiya, initial errors solve kiye aur foundation strong ki.",
    tone: "good",
    vibeTag: "Progress",
    color: "#bbf451",
  },
  {
    id: "deep-thinker",
    emoji: "🧠",
    label: "Deep Thinker",
    meaning: "Engaged in high-level architectural decisions, strategy planning, and visionary clarity.",
    whenToChoose: "Jab physical task se zyada dimag strategic roadmap aur deep decisions pe laga.",
    exampleScene: "Agli quarter ka pura roadmap plan kiya, architecture diagram banaya aur core clarity draw ki.",
    tone: "good",
    vibeTag: "Strategy",
    color: "#e0e7ff",
  },
  {
    id: "comfortable",
    emoji: "☕",
    label: "Comfortable",
    meaning: "A balanced, steady, gentle day where everything flowed without pressure.",
    whenToChoose: "Jab din relax aur smooth raha, na koi panic tha na burnout ka darr.",
    exampleScene: "Cup of coffee ke saath normal pace pe daily routine follow kiya, time pe wrap up kiya.",
    tone: "good",
    vibeTag: "Balanced",
    color: "#fed7aa",
  },
  {
    id: "steady-pace",
    emoji: "🚶",
    label: "Steady Pace",
    meaning: "Neither hurried nor slow — building reliable consistency one brick at a time.",
    whenToChoose: "Jab regular everyday habits aur routine tasks bina kisi drop ke complete hue.",
    exampleScene: "Bina kisi unnecessary hurry ke apna daily checklist 100% execute kiya aur habit streak maintain rakhi.",
    tone: "good",
    vibeTag: "Consistent",
    color: "#e2e8f0",
  },
  {
    id: "resilient",
    emoji: "🛡️",
    label: "Resilient",
    meaning: "Faced friction, setbacks, or fatigue but held the line and never gave up.",
    whenToChoose: "Jab haalat tough the ya tabiyat down thi, tab bhi drop nahi kiya aur line hold ki.",
    exampleScene: "Headache ya low mood hone ke bawjood important commits aur daily promises deliver kiye.",
    tone: "good",
    vibeTag: "Grit",
    color: "#e8d5c4",
  },
  {
    id: "calm-confidence",
    emoji: "🌊",
    label: "Calm Confidence",
    meaning: "Quiet self-assurance knowing you are fully in control of your journey and craft.",
    whenToChoose: "Jab andar se pura trust ho ki direction sahi hai aur results zaroor aayenge.",
    exampleScene: "Short-term noise ya market fluctuations ko dekh kar panic nahi hua, apne craft par focused rahe.",
    tone: "good",
    vibeTag: "Poised",
    color: "#cffafe",
  },
  {
    id: "creative-spark",
    emoji: "🎨",
    label: "Creative Spark",
    meaning: "Inventive ideas, imaginative solutions, and artistic expression flourished.",
    whenToChoose: "Jab fresh designs, naye copy ideas ya unique concepts create kiye.",
    exampleScene: "App ke UI ke liye ek dum fresh animation aur color system design kiya jo sabko pasand aaya.",
    tone: "high",
    vibeTag: "Artistic",
    color: "#e9d5ff",
  },
  {
    id: "problem-solver",
    emoji: "🧩",
    label: "Problem Solver",
    meaning: "Untangled confusing blockers and solved tricky problems with logic.",
    whenToChoose: "Jab din bhar puzzles aur logical mysteries solve karne ka santosh mila.",
    exampleScene: "Complex sync race condition ya state mismatch ko root cause pakad kar permanently fix kiya.",
    tone: "good",
    vibeTag: "Analytical",
    color: "#a5f3fc",
  },
  {
    id: "playful",
    emoji: "✨",
    label: "Playful",
    meaning: "Lighthearted, joyful, and had fun while getting things done.",
    whenToChoose: "Jab kaam kaam jaisa heavy nahi laga, balki khelte-kudte enjoy karte hue complete hua.",
    exampleScene: "Team ya doston ke saath hansi-mazaak karte hue brainstorming aur execution kiya.",
    tone: "high",
    vibeTag: "Joyful",
    color: "#fbcfe8",
  },
  {
    id: "mindful",
    emoji: "🍃",
    label: "Mindful",
    meaning: "Present in every moment, appreciative, and deeply conscious of priorities.",
    whenToChoose: "Jab jaldbazi nahi thi, har moment aur choti choti progress ko cherish kiya.",
    exampleScene: "Kaam ke beech deep breaths liye, health aur family ko time diya aur present rahe.",
    tone: "good",
    vibeTag: "Present",
    color: "#d5ddfd",
  },
  {
    id: "proud-exhaustion",
    emoji: "🏆",
    label: "Proud Exhaustion",
    meaning: "Poured 100% of soul and energy into today; totally drained but exceptionally proud.",
    whenToChoose: "Jab poori energy laga di aur raat ko bed par jate hue self-respect high hai.",
    exampleScene: "Product launch ya major release ke baad sharir thak chuka hai par smile face par hai.",
    tone: "mid",
    vibeTag: "Heavy Win",
    color: "#fef08a",
  },
  {
    id: "tired-satisfied",
    emoji: "🛌",
    label: "Satisfied Tired",
    meaning: "Body and mind are tired, but heart is full from honest hard work.",
    whenToChoose: "Jab din bhar imandari se mehnat ki aur ab achi neend ke haqdaar hain.",
    exampleScene: "Kaam pura finish karke laptop band kiya, dimag shant hai aur achi neend aane wali hai.",
    tone: "mid",
    vibeTag: "Well Earned",
    color: "#fed7aa",
  },
  {
    id: "overthinking",
    emoji: "🌀",
    label: "Overthinking",
    meaning: "Spent too much mental energy in loops, second-guessing choices instead of pure action.",
    whenToChoose: "Jab dimag mein bohot sawaal chalte rahe aur execution se zyada sochne mein waqt gaya.",
    exampleScene: "Ek chote decision ya design ko lekar 5 ghante compare karte rahe bina final call liye.",
    tone: "mid",
    vibeTag: "Mental Loop",
    color: "#f1f5f9",
  },
  {
    id: "restless",
    emoji: "⚡",
    label: "Restless",
    meaning: "High inner energy but lacked directional anchor, feeling itchy to do more.",
    whenToChoose: "Jab energy toh thi par focus ek jagah lock nahi ho pa raha tha.",
    exampleScene: "Ek task se dusre task par jump karte rahe, din khatam hua par incomplete feelings bachi rahi.",
    tone: "mid",
    vibeTag: "Unsettled",
    color: "#fef3c7",
  },
  {
    id: "distracted",
    emoji: "📴",
    label: "Distracted",
    meaning: "Attention got hijacked by random rabbit holes, context switches, or phone pings.",
    whenToChoose: "Jab social media, irrelevant tabs ya random chizo ne main kaam se bhatka diya.",
    exampleScene: "Important task khola tha par 2 ghante Twitter/YouTube ya chats mein nikal gaye.",
    tone: "low",
    vibeTag: "Scattered",
    color: "#fee2e2",
  },
  {
    id: "drained",
    emoji: "😴",
    label: "Drained",
    meaning: "Low battery, pushed limits to exhaustion, ready for deep restoration.",
    whenToChoose: "Jab sharir aur dimag mein bilkul fuel na bacha ho aur recovery zaroori ho.",
    exampleScene: "Lambi meetings ya non-stop sprint ke baad bas rest karne aur battery recharge karne ki ichha hai.",
    tone: "low",
    vibeTag: "Low Battery",
    color: "#f3e8ff",
  },
  {
    id: "overwhelmed",
    emoji: "🌪️",
    label: "Overwhelmed",
    meaning: "Turbulent chaos and too many demands, but made it through to the other side.",
    whenToChoose: "Jab chaaron taraf se responsibilities aur pressure aayi, par din survive kar liya.",
    exampleScene: "Multiple deadlines aur unexpected emergencies ek sath toot padi, par tackle karke raat hui.",
    tone: "low",
    vibeTag: "Surviving",
    color: "#fee2e2",
  },
  {
    id: "reconnecting",
    emoji: "🌿",
    label: "Reconnecting",
    meaning: "Stepping back to re-align goals, reconnect with purpose, and regain rhythm.",
    whenToChoose: "Jab thode bhatakne ke baad wapas track par aane ki shuruat ki.",
    exampleScene: "Messy desk ko clean kiya, priorities phir se note kiye aur execution rhythm wapas paayi.",
    tone: "good",
    vibeTag: "Re-align",
    color: "#dcfce7",
  },
  {
    id: "spark-of-hope",
    emoji: "💫",
    label: "Spark of Hope",
    meaning: "Found a glimmer of light, a new angle, or renewed excitement for what’s ahead.",
    whenToChoose: "Jab ek lambe dull period ke baad ek positive opportunity ya idea ne excite kiya.",
    exampleScene: "Client ka positive feedback aaya ya ek naya solution strike hua jisse nayi umeed jag gayi.",
    tone: "good",
    vibeTag: "Optimistic",
    color: "#fef9c3",
  },
  {
    id: "reset-ready",
    emoji: "🌅",
    label: "Reset Ready",
    meaning: "Leaving today's friction in the past, completely ready for a fresh clean slate.",
    whenToChoose: "Jab aaj ka din expectations jaisa nahi gaya par kal subah fresh start karna hai.",
    exampleScene: "Jo bhi galtiyan ya delays hue unhe accept kiya, raat ko fresh plan bana kar kal ke liye tayyar hue.",
    tone: "mid",
    vibeTag: "Fresh Slate",
    color: "#fff085",
  },
];

export const EXPRESSIONS_MAP = Object.fromEntries(MOOD_EXPRESSIONS.map((m) => [m.id, m]));

/** Check if the strict 11:00 PM - 11:59 PM (23:00-23:59) reflection window is currently open */
export function isMoodWindowOpen(date = new Date()) {
  const hours = date.getHours();
  return hours === 23;
}

/** Get structured countdown info for the mood window */
export function getMoodWindowCountdown(date = new Date()) {
  const now = date.getTime();
  const hours = date.getHours();
  const isOpen = hours === 23;

  if (isOpen) {
    // Window ends at 23:59:59 (midnight)
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    const msLeft = Math.max(0, end.getTime() - now);
    const mins = Math.floor(msLeft / 60000);
    const secs = Math.floor((msLeft % 60000) / 1000);
    return {
      isOpen: true,
      label: `Open now · Closes in ${mins}m ${secs}s`,
      closesInMinutes: mins,
    };
  }

  // Calculate time until next 23:00
  const target = new Date(date);
  if (hours < 23) {
    target.setHours(23, 0, 0, 0);
  } else {
    // Past midnight, target is tonight at 23:00
    target.setDate(target.getDate() + 1);
    target.setHours(23, 0, 0, 0);
  }

  const msLeft = Math.max(0, target.getTime() - now);
  const hrs = Math.floor(msLeft / 3600000);
  const mins = Math.floor((msLeft % 3600000) / 60000);
  return {
    isOpen: false,
    label: `Opens at 11:00 PM · In ${hrs}h ${mins}m`,
    hoursLeft: hrs,
    minutesLeft: mins,
  };
}
