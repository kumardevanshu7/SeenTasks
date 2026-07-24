// The persona / bio. The user picks traits about who they are and what they
// want for themselves. Each trait carries an `aiRule` line that is fed to the
// priority guide so tasks are judged against the person's own goals — including
// flagging tasks that work AGAINST a goal as the DANGER category.
// `icon` is a lucide-react icon name resolved in the UI.

export const PERSONA_TRAITS = [
  { id: "male", label: "Male", icon: "UserRound", info: true, aiRule: "The person is male." },
  { id: "female", label: "Female", icon: "UserCircle", info: true, aiRule: "The person is female." },
  {
    id: "avoid_junk_food",
    label: "No junk food",
    icon: "Apple",
    aiRule: "Wants to avoid junk food (maida, deep-fried, momos, chips, sugary drinks). A task about eating or ordering junk food must be category DANGER with a kind, simple health reminder.",
  },
  {
    id: "job_hunting",
    label: "No job (job hunting)",
    icon: "Briefcase",
    aiRule: "Has no job right now and is searching. Job applications, skills, resume, and income tasks are top priority. Pure fun or timepass during daytime work hours should be low priority or DANGER.",
  },
  {
    id: "fitness_focus",
    label: "Stay fit & healthy",
    icon: "Dumbbell",
    aiRule: "Wants to stay fit and healthy. Exercise, sleep, water, and healthy meals get a boost. Anything that clearly harms health leans toward DANGER.",
  },
  {
    id: "limit_timepass",
    label: "Little timepass",
    icon: "Gamepad2",
    aiRule: "Wants to limit time-wasting. Long entertainment, doomscrolling, or random timepass tasks should be low priority, and DANGER if they clearly hurt today's important work.",
  },
  {
    id: "creativity",
    label: "Creativity",
    icon: "Palette",
    aiRule: "Values creativity. Creative work like writing, art, music, or building is meaningful and should not be pushed to tomorrow without a good reason.",
  },
  {
    id: "student",
    label: "Student",
    icon: "GraduationCap",
    aiRule: "Is a student. Study, homework, and exam tasks matter a lot and usually come before leisure.",
  },
  {
    id: "money_saver",
    label: "Save money",
    icon: "Wallet",
    aiRule: "Wants to save money. Unnecessary shopping or spending tasks should be low priority or DANGER.",
  },
  {
    id: "family_first",
    label: "Family first",
    icon: "Heart",
    aiRule: "Family and close relationships come first. Tasks that care for family or loved ones get priority.",
  },
  {
    id: "early_riser",
    label: "Early & disciplined",
    icon: "Sunrise",
    aiRule: "Wants an early, disciplined routine. Late-night non-essential tasks lean toward low priority.",
  },
  {
    id: "deep_work",
    label: "Deep focus",
    icon: "Target",
    aiRule: "Values deep focused work. Protect focus time; shallow busywork is lower priority.",
  },
];

export function personaGuidance(selectedIds = []) {
  return PERSONA_TRAITS.filter((t) => selectedIds.includes(t.id)).map((t) => t.aiRule);
}
