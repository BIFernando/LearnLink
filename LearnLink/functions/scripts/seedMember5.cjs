/**
 * Member 5 seed: sample badges, challenges and challenge answer keys.
 *
 * Usage (from LearnLink/functions):
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json node scripts/seedMember5.cjs
 *
 * Never commit the service account file (service-account*.json is gitignored).
 * Safe to re-run: documents are written with fixed ids.
 */
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const PROJECT_ID = process.env.GCLOUD_PROJECT || "learnlink-8a889";

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

const badges = [
  { id: "first-swap", name: "First Swap", description: "Complete your first peer learning session.", icon: "swap-horizontal", category: "SESSIONS", requirement: { type: "SESSIONS_COMPLETED", threshold: 1 }, xpReward: 20 },
  { id: "knowledge-donor", name: "Knowledge Donor", description: "Complete 10 verified peer sessions.", icon: "hand-left-outline", category: "SESSIONS", requirement: { type: "SESSIONS_COMPLETED", threshold: 10 }, xpReward: 200 },
  { id: "century-club", name: "Century Club", description: "Complete 100 verified peer learning sessions.", icon: "medal-outline", category: "SESSIONS", requirement: { type: "SESSIONS_COMPLETED", threshold: 100 }, xpReward: 500 },
  { id: "rising-scholar", name: "Rising Scholar", description: "Earn 500 total XP.", icon: "trending-up", category: "XP", requirement: { type: "XP_TOTAL", threshold: 500 }, xpReward: 50 },
  { id: "campus-legend", name: "Campus Legend", description: "Reach 5,000 total XP across all activities.", icon: "trophy-outline", category: "XP", requirement: { type: "XP_TOTAL", threshold: 5000 }, xpReward: 300 },
  { id: "helpful-peer", name: "Helpful Peer", description: "Give 5 thoughtful peer reviews.", icon: "chatbubbles-outline", category: "REVIEWS", requirement: { type: "REVIEWS_GIVEN", threshold: 5 }, xpReward: 80 },
  { id: "code-craftsman", name: "Code Craftsman", description: "Give 20 peer reviews.", icon: "code-slash", category: "REVIEWS", requirement: { type: "REVIEWS_GIVEN", threshold: 20 }, xpReward: 150 },
  { id: "trivia-starter", name: "Trivia Starter", description: "Complete your first skill challenge.", icon: "flash-outline", category: "CHALLENGES", requirement: { type: "CHALLENGES_COMPLETED", threshold: 1 }, xpReward: 20 },
  { id: "trivia-grandmaster", name: "Trivia Grandmaster", description: "Complete 30 skill challenges.", icon: "ribbon-outline", category: "CHALLENGES", requirement: { type: "CHALLENGES_COMPLETED", threshold: 30 }, xpReward: 250 },
  { id: "lightning-learner", name: "Lightning Learner", description: "Keep a 7-day learning streak.", icon: "flame-outline", category: "STREAK", requirement: { type: "STREAK_DAYS", threshold: 7 }, xpReward: 120 },
  { id: "unstoppable", name: "Unstoppable", description: "Keep a 30-day learning streak.", icon: "rocket-outline", category: "SPECIAL", requirement: { type: "STREAK_DAYS", threshold: 30 }, xpReward: 400 },
];

/** Each question: [question, options, correctIndex, explanation]. */
const challenges = [
  {
    id: "python-basics",
    title: "Python Data Structures",
    description: "Lists, dicts, sets and tuples: how well do you know them?",
    category: "Computer Science • Python",
    difficulty: "EASY",
    xpReward: 40,
    questions: [
      ["Which Python data structure stores key-value pairs and keeps insertion order (3.7+)?", ["set", "tuple", "dict", "list"], 2, "Since Python 3.7, dict preserves insertion order as part of the language specification."],
      ["Which of these is immutable?", ["list", "tuple", "dict", "set"], 1, "Tuples cannot be changed after creation."],
      ["What does len({1, 1, 2}) return?", ["1", "2", "3", "Error"], 1, "Sets drop duplicates, so the set is {1, 2}."],
      ["Which method adds an item to the end of a list?", ["add()", "push()", "append()", "insert_end()"], 2, "list.append(x) adds x to the end."],
      ["What is the result of [1, 2, 3][-1]?", ["1", "3", "IndexError", "-1"], 1, "Negative indexes count from the end; -1 is the last item."],
    ],
  },
  {
    id: "ui-design-fundamentals",
    title: "UI Design Fundamentals",
    description: "Spacing, contrast and hierarchy for mobile screens.",
    category: "Design • UI/UX",
    difficulty: "MEDIUM",
    xpReward: 50,
    questions: [
      ["What is the WCAG AA minimum contrast ratio for normal body text?", ["3:1", "4.5:1", "7:1", "2:1"], 1, "AA requires 4.5:1 for normal text and 3:1 for large text."],
      ["A common base unit for spacing grids in mobile UI is…", ["5px", "7px", "8px", "10px"], 2, "An 8px grid keeps spacing consistent across screen densities."],
      ["What is the minimum recommended touch target on Android?", ["24dp", "32dp", "48dp", "64dp"], 2, "Material guidelines recommend at least 48×48dp."],
      ["Which principle groups related items by placing them close together?", ["Contrast", "Proximity", "Alignment", "Repetition"], 1, "Proximity: things that are near each other are seen as related."],
      ["Which helps users scan a long list fastest?", ["Centered text", "Clear visual hierarchy", "More colours", "Smaller fonts"], 1, "A clear hierarchy (size, weight, spacing) guides the eye."],
    ],
  },
  {
    id: "calculus-warmup",
    title: "Calculus Warm-up",
    description: "Quick derivatives and limits for Calculus I & II.",
    category: "Mathematics • Calculus",
    difficulty: "HARD",
    xpReward: 60,
    questions: [
      ["d/dx (x³) = ?", ["x²", "3x²", "3x³", "x⁴/4"], 1, "Power rule: d/dx xⁿ = n·xⁿ⁻¹."],
      ["d/dx (sin x) = ?", ["cos x", "-cos x", "-sin x", "tan x"], 0, "The derivative of sin x is cos x."],
      ["lim (x→0) sin(x)/x = ?", ["0", "1", "∞", "Undefined"], 1, "A standard limit, provable with the squeeze theorem."],
      ["∫ 2x dx = ?", ["x² + C", "2x² + C", "x + C", "2 + C"], 0, "The antiderivative of 2x is x², plus a constant."],
      ["d/dx (eˣ) = ?", ["x·eˣ⁻¹", "eˣ", "ln x", "1/x"], 1, "eˣ is its own derivative."],
    ],
  },
];

async function main() {
  const batch = db.batch();

  for (const { id, ...badge } of badges) {
    batch.set(db.collection("badges").doc(id), badge);
  }

  for (const challenge of challenges) {
    const { id, questions, ...rest } = challenge;
    batch.set(db.collection("challenges").doc(id), {
      ...rest,
      questions: questions.map(([question, options, , explanation]) => ({ question, options, explanation })),
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.collection("challengeAnswers").doc(id), {
      correctOptionIndexes: questions.map(([, , correctIndex]) => correctIndex),
    });
  }

  await batch.commit();
  console.log(`Seeded ${badges.length} badges and ${challenges.length} challenges into ${PROJECT_ID}.`);
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
