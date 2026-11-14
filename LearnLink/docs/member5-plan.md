# Member 5 Plan: Chat, Notifications, Gamification

Owner: Member 5 (imChamikara) · Branch: `feature/member5-chat-notifications-gamification`

## 1. Current state (as of main @ ff3a2ce)

### Project setup
| Item | Status |
|---|---|
| App location | `LearnLink/` subfolder (repo root also has legacy `src/` and `UI designs/`) |
| Expo SDK | 54 (`expo ~54.0.36`), React Native 0.81, React 19.1, New Architecture on |
| Navigation | **Expo Router 6** (file-based, `typedRoutes` on). Not hand-built React Navigation |
| TypeScript | Yes, `strict: true`, path alias `@/*` → `LearnLink/*` |
| Lint | ESLint 9 + `eslint-config-expo` (`npm run lint`). No Prettier |
| Firebase client | `config/firebase.ts` exports `app, auth, db, functions (asia-south1), storage`; reads `EXPO_PUBLIC_FIREBASE_*` from `LearnLink/.env` |
| Auth state | `providers/AuthProvider.tsx` → `useAuth()` gives `user`, `studentProfile` |
| Cloud Functions | `functions/` exists, TypeScript, Node 22, firebase-functions v7 (v2 API), region `asia-south1`. Exports: `healthCheck`, `generateAttendanceQr`, `verifyAttendanceQr` (index.ts), `submitReport`, `moderateReport` (reports.ts) |
| Firestore rules | `firestore.rules` exists (Member 6). **No rules for any Member 5 collection** |
| Indexes | **No `firestore.indexes.json`**, and `firebase.json` has no `indexes` entry |
| Emulators | Not configured |
| Firebase project | `learnlink-8a889` |

### Navigation shell
- `app/(tabs)/_layout.tsx` is still the Expo template: **2 tabs (Home, Explore)**. The 5-tab shell is not built yet (Member 6).
- `app/(tabs)/index.tsx` is still the template "Welcome!" screen.
- Feature areas are stacks registered in `app/_layout.tsx`: `member4`, `admin`, `chat` (mine), `reports`.
- My screens can plug in as stack routes now and be linked into tabs later with a one-line change.

### What other members have pushed (reuse)
- `useAuth()` (Member 1). Use it instead of `getCurrentUserId()` because it is reactive.
- `services/member4/sessionService.ts` + `types/member4/member4.ts`: `Session` (`teacherId`, `learnerId`, `status`, `completedBy`), `SessionStatus` includes `COMPLETED`.
- `constants/theme.ts` (template `Colors`/`Fonts` only), `components/themed-*`, `components/ui/icon-symbol`.
- No shared design-system components (cards, chips, buttons). I will keep mine in `components/member5/`.

### My existing work (already in main)
- `app/chat/{_layout,index,[conversationId]}.tsx`, `services/chatService.ts`, `types/chat.types.ts`, `constants/chatColors.ts`.
- Missing pieces: unread indicator, mark-all-read, pagination, filter chips, create-conversation-on-accept, and Firestore rules. **Without rules, chat is denied by default once the rules file is deployed.**

## 2. My 9 screens (from PDFs)

| # | Screen | Key UI | MVP scope |
|---|---|---|---|
| 25 | Chat List | Header (bell, avatar), "Chats" + "N active peer exchanges", filter button, **New**, search, chips (All / Study Partners / Skill Swap / Unread n), Active Now strip, Recent Messages card with **Mark all read**, rows (avatar + online dot, name, skill-swap chip, time, preview, XP/status line, unread badge or read ticks), "Propose a Peer Swap" banner | List, search (client filter), All/Unread chips, unread badge, mark all read, swap chip. **Skip:** online presence, attachments |
| 26 | Conversation | Back, title, menu, partner card (avatar, swap chip, status, call/video buttons), "Upcoming Exchange" + **Agenda**, date separators, bubbles with time + read ticks, file attachment card, quick-reply chips, attach / emoji / send | Real-time messages, send, mark read, auto-scroll, load older, date separators, read ticks, quick replies, upcoming-session card (from sessions). **Skip:** calls, files |
| 27 | Notifications | "Notifications" + "3 New", **Mark all read**, chips (All / Unread / Sessions / Achievements), type-specific cards with actions (Reply/View Thread, Join Study Room, XP progress, View Trophy Cabinet, Give Review/Dismiss, Accept Swap/View Profile), unread dot | Full list, chips, mark read/all, tap → route by `type` + `referenceId`, primary action button per type |
| 28 | Give Review | Peer card (name, verified, swap chip, duration/date, topic), "How was your learning experience?" 5 stars + label, **What went well?** multi-select tags, review text (n/500), XP reward banner, **Submit Review**, Skip for now | All of it. Tags need a schema addition (see §7) |
| 29 | View Reviews | Trust banner, profile card (exchanges count, rank chip), Reputation Metrics (avg, count, 5→1 distribution bars), Top Peer Endorsements chips, Community Feedback list (sort, skill chips), review cards (reviewer, date, verified, swap chip, stars, text, Helpful (n)), **Request Skill Exchange** | Avg + distribution, list sorted by recent, endorsements from tags. **Skip:** Helpful votes, per-skill chips |
| 30 | Progress / XP | Profile card + level chip, XP `x / next` + % bar, "+N XP to Level L", streak card with weekday circles, Weekly Gain bar chart + Top Day, Recent Activity (xpTransactions), Start New Swap | All of it (weekly chart computed from last 7 days of xpTransactions) |
| 31 | Badges | "Showcase Collection: x of y Badges", % ring, next-rank bar, chips (All / Earned / Locked / Special), 2-column grid: earned (date, +XP) vs locked (progress bar) | Earned vs locked grid, chips, progress for XP/session-count badges |
| 32 | Challenges | Header "+40 XP Reward", Question x of 5, timer, progress segments, category chip, question + A–D options, correct/incorrect feedback with explanation, XP earned card, **Next Question** | Challenge list + play screen. Answers are graded **server-side on submit** (see §7: per-question feedback vs. anti-cheat) |
| 33 | Leaderboard | "Resets in 3d", Weekly/Monthly/All Time tabs, podium top 3, "You (#7)" card with gap to next rank, ranked list 4–10, CTA banner | All Time from `users.xp` (orderBy, limit). Weekly/Monthly **deferred** (needs per-period XP) |

## 3. Task checklist (priority order)

- [x] 0. Branch `feature/member5-chat-notifications-gamification` from latest main
- [x] 0a. Blockers: root `.gitignore`, `.env` moved to `LearnLink/`, `firebase.json` comma, users rule protects server-managed fields
- [x] 1. **Foundation**: `types/member5.ts`, `functions/src/member5/xpRules.ts`, `constants/member5Theme.ts`, `components/member5/ui.tsx`, `services/member5/{format,userService}.ts`
- [x] 2. **Chat** upgrade: unread badge, mark-all-read, chips, search, pagination, date separators, read ticks, quick replies, upcoming-session card, `getOrCreateConversation(exchangeRequestId, participantIds)`, New Chat screen (`app/chat/new.tsx`). Not built: online presence, file attachments, calls
- [x] 3. **Notifications** screen + routing by type (chips, mark read / all, dismiss, type actions). Notifications are created by Cloud Functions (section 9)
- [x] 4. **Reviews**: Give Review (COMPLETED sessions only, one per reviewer per session via deterministic doc id `${sessionId}_${reviewerId}`), View Reviews
- [x] 5. **Progress / XP** screen (also the Gamification Hub: links to Badges, Challenges, Leaderboard, My Reviews)
- [x] 6. **Badges** screen (earned vs locked, progress per requirement, filter chips)
- [x] 7. **Leaderboard** (All Time; Weekly/Monthly shown disabled)
- [x] 8. **Challenges** list + play screen with per-question review after submit (grading is the `submitChallengeAttempt` callable, section 9). No countdown timer
- [x] 9. **Cloud Functions** in `functions/src/member5/`: onMessageCreated, onExchangeRequestWritten, onReviewCreated, onSessionCompleted, sendSessionReminders, submitChallengeAttempt, checkBadges, awardXp. (Mark-read is a client batch allowed by rules, not a callable. Push trigger comes last.)
- [ ] 10. Rules + indexes proposal: `docs/member5-firestore-rules.md` + `firestore.indexes.json`
- [ ] 11. Seed script: badges + challenges (`functions/scripts/seedMember5.ts`, Admin SDK)
- [ ] 12. Final report + PR description

## 4. Files

### Create (my area)
```
app/notifications/_layout.tsx, index.tsx
app/reviews/_layout.tsx, give/[sessionId].tsx, [userId].tsx
app/gamification/_layout.tsx, index.tsx (Progress/XP hub), badges.tsx, leaderboard.tsx,
                 challenges/index.tsx, challenges/[challengeId].tsx
components/member5/*            (Avatar, Chip, StarRating, ProgressBar, EmptyState, ErrorState, LoadingState, cards)
constants/member5Theme.ts       (replaces chatColors.ts; colours from the PDFs)
constants/gamification.ts       (client copy of XP display constants: level formula only)
hooks/member5/*.ts
services/member5/{chatService,notificationService,reviewService,gamificationService,challengeService}.ts
services/member5/mocks/*.ts     (typed fixtures behind the same interface)
types/member5.ts
functions/src/member5/{index,xpRules,chat,reviews,sessions,challenges,badges,push}.ts
functions/scripts/seedMember5.ts
docs/member5-plan.md, docs/member5-firestore-rules.md
```
`services/chatService.ts`, `types/chat.types.ts` and `constants/chatColors.ts` move into the member5 folders (they are mine; nothing else imports them).

### Modify (outside my area, minimal, listed for Member 6)
- `app/_layout.tsx`: register `notifications`, `reviews`, `gamification` stacks (3 `Stack.Screen` lines)
- `functions/src/index.ts`: one line `export * from "./member5";`
- `firestore.rules`: add a clearly marked `// ===== Member 5 =====` block (or keep it in the proposal doc only if Member 6 prefers)
- `firebase.json`: add `"indexes": "firestore.indexes.json"` (**also fixes an existing JSON syntax error**, see §8)
- Later (Member 6): tab entries for Chats / Ranks / Profile hub, bell icon on Home → `/notifications`

## 5. Cloud Functions (all `asia-south1`, TypeScript, `functions/src/member5/`)

| Function | Trigger | Does |
|---|---|---|
| `onMessageCreated` | `conversations/{cid}/messages/{mid}` create | Set `lastMessage`, `lastMessageAt`, increment `unreadCounts.{recipient}`; create `NEW_MESSAGE` notification |
| `onReviewCreated` | `reviews/{id}` create | Transaction: recompute reviewee `ratingAverage`/`ratingCount`; `NEW_REVIEW` notification; award reviewer XP |
| `onSessionCompleted` | `sessions/{id}` update where status → `COMPLETED` | Idempotent (`xpTransactions` id = `${sessionId}_${uid}`): XP to teacher + learner, update `xp`/`level`/`streak`/`lastActiveDate`, `SESSION_COMPLETED` + `LEVEL_UP` notifications, `checkBadges` |
| `submitChallengeAttempt` | callable | Load challenge (answers server-only), grade, write `challengeAttempts` + `xpTransactions`, update xp/level, `checkBadges`; return score, xpEarned, per-question correctness + explanations |
| `markConversationRead` | callable (or client rule) | Batch-mark messages read + reset `unreadCounts.{uid}` |
| `checkBadges(uid)` | helper | Evaluate badge `requirement`s, write `userBadges` (id `${uid}_${badgeId}`), `BADGE_EARNED` notification |
| `onNotificationCreated` | `notifications/{id}` create | Send push to the user's Expo push token; skip if none |

`xpRules.ts` (single source): `XP_PER_SESSION = 50`, `XP_PER_REVIEW = 25`, streak bonus, `levelFromXp()`, `xpForLevel()`.

## 6. Firestore indexes needed
| Collection | Fields |
|---|---|
| conversations | `participantIds` ARRAY_CONTAINS, `lastMessageAt` DESC |
| notifications | `userId` ASC, `createdAt` DESC |
| notifications | `userId` ASC, `isRead` ASC, `createdAt` DESC |
| reviews | `revieweeId` ASC, `createdAt` DESC |
| xpTransactions | `userId` ASC, `createdAt` DESC |
| userBadges | `userId` ASC, `awardedAt` DESC |
| challengeAttempts | `userId` ASC, `completedAt` DESC |
| challenges | `isActive` ASC, `createdAt` DESC |
| users (leaderboard) | `xp` DESC: single-field, automatic |

## 7. Decisions (agreed)
1. Schema additions approved (see §7a). Push token goes in `pushTokens/{userId}`, **not** on `users`.
2. Level formula `xpForLevel(L) = 100·(L−1)²`. All XP numbers are in **one** file: `functions/src/member5/xpRules.ts` (the app imports it from there).
3. XP: **+50** per completed session (each participant), **+25** for giving a review (once per session per reviewer, server-side). The PDF's "+10 bonus" text is ignored. PDF numbers are placeholders; the app shows real values.
4. Challenges: grade everything on submit, then show a per-question review. No per-question calls.
5. Leaderboard: All Time only. Weekly/Monthly tabs are shown disabled.
6. Push: last. In-app notifications first.
7. Tabs: not built by me (Member 6). My screens are stack routes with entry links.

### Real XP values (replace PDF placeholders)
| Rule | Value |
|---|---|
| Completed session | +50 XP each participant |
| Review given | +25 XP (once per session per reviewer) |
| Streak bonus | +5 XP per consecutive day after day 1, max +50, added to session and challenge XP |
| Challenge | `round(xpReward × score / 100)`, first attempt only |
| Badge | `badge.xpReward` once, when earned |
| Level | Level L starts at `100·(L−1)²` XP → L2 = 100, L3 = 400, L5 = 1,600, L7 = 3,600, L10 = 8,100 |
| Streak day | Calendar day in UTC+05:30; any XP-earning activity counts |

## 7a. Schema additions (tell the team)
| Collection | Field / doc | Type | Why |
|---|---|---|---|
| `conversations` | `unreadCounts` | `map<uid, number>` | Unread badge per chat. Written only by Cloud Functions, except a user resetting their own entry to 0 |
| `reviews` | `tags` | `string[]` (enum `REVIEW_TAGS`) | "What went well?" + endorsements |
| `reviews` | doc id | `${sessionId}_${reviewerId}` | One review per reviewer per session, enforced by rules |
| `badges` | `xpReward` | `number` | XP awarded with the badge |
| `badges` | `category` | `SESSIONS \| XP \| REVIEWS \| CHALLENGES \| STREAK \| SPECIAL` | Filter chips |
| `badges` | `requirement` | `{ type, threshold }` | The doc names the field but not its shape |
| `challenges` | `questions[].explanation` | `string?` | Per-question review |
| `challengeAnswers/{challengeId}` | `correctOptionIndexes` | `number[]` | Answer key. **No client access** |
| `xpTransactions` | `reason` | `SESSION_COMPLETED \| REVIEW_GIVEN \| CHALLENGE_COMPLETED \| BADGE_EARNED \| STREAK_BONUS` | Recent Activity labels |
| `pushTokens/{userId}` | `userId, token, platform, updatedAt` | new collection | Push. Owner write only |

Not added: no new fields on `users`. The streak date comes from the user's latest `xpTransactions` entry.

### Mock data
Members 1 (users) and 4 (sessions, exchange requests) already have real data and services in `main`, so no mock layer was needed. The seed script provides sample badges and challenges instead.

## 8. Gaps, blockers, inconsistencies (for you / other members)
1. **`firebase.json` is invalid JSON**: a comma is missing after the `"functions": [...]` array. `firebase deploy` will fail for everyone. (Member 6)
2. **`.env` is at the repo root, not `LearnLink/.env`.** `config/firebase.ts` throws "Missing EXPO_PUBLIC_FIREBASE_…" unless it is moved. Also, **the repo root has no `.gitignore`**, so `.env` and `node_modules/` at root show as untracked and would be committed by `git add .` from root.
3. **Security hole**: the `users` update rule lets the owner change any field except admin ones, so a client can set its own `xp`, `level`, `ratingAverage`, `ratingCount`, `streak`. These must be added to the protected-keys list. (Member 1 / 6)
4. No rules for `conversations`, `messages`, `notifications`, `reviews`, `challenges`, `challengeAttempts`, `badges`, `userBadges`, `xpTransactions`. Chat is currently blocked by default-deny once rules are deployed.
5. **No central shared types file.** Types are per member (`types/auth.ts`, `types/member4/member4.ts`, `types/reports.ts`). I'll use `types/member5.ts` and import `Session`/`SessionStatus` from Member 4. `StudentProfile` lacks `xp` and `streak`. I'll define a read-only `GamifiedUser` in my file rather than edit `types/auth.ts`.
6. **Tab bar mismatch.** The brief says Home / Discover / Matches / Chat / Profile, but every PDF shows **Explore / Matches / Chats / Ranks / Profile**, with Challenges and Leaderboard under **Ranks**. The brief puts them in a Profile hub. The current code has only template tabs.
7. `reports.ts` callables use the default region (us-central1), while everything else and the client `functions` instance use `asia-south1`. (Member 6)
8. Member 4's `Session`/`ExchangeRequest` use `any` for timestamps.
9. `functions/lib/*` is gitignored but is committed anyway.
10. **Push notifications** need `expo-notifications` (new dependency) and a **development build**. Remote push does not work in Expo Go on Android since SDK 53. Sending through Expo's push service from the function avoids handling raw FCM tokens.
11. Cloud Functions + Firestore triggers require the **Blaze plan** on `learnlink-8a889`.
12. Legacy `src/` at the repo root is unused by the Expo app.

## 9. Dependencies on other members
| From | Need | Until ready |
|---|---|---|
| Member 1 | `users` doc with `displayName`, `profilePhotoUrl`; protect `xp/level/rating*/streak` in rules; `expoPushToken` field | Mock users fixture |
| Member 4 | Sessions reaching `COMPLETED` (exists); call `getOrCreateConversation` on exchange ACCEPTED | Mock completed sessions |
| Member 6 | Tabs (Chats, Ranks, Profile hub), Home bell → `/notifications`, rules merge, `firebase.json` fix, indexes deploy | Stack routes + direct links |

## 10. Commit plan (push after each)
1. `chore(member5): add plan, types, xp rules and mock fixtures`
2. `feat(member5): shared ui components and theme`
3. `feat(chat): unread counts, mark all read, pagination and conversation helper`
4. `feat(notifications): real-time notifications screen with type routing`
5. `feat(reviews): give review and view reviews screens`
6. `feat(gamification): progress and xp screen`
7. `feat(gamification): badges screen`
8. `feat(gamification): leaderboard`
9. `feat(challenges): challenge list and play screen`
10. `feat(functions): member5 triggers and callables`
11. `chore(member5): firestore rules proposal and indexes`
12. `chore(member5): seed script for badges and challenges`

Before each commit: `npx tsc --noEmit` and `npm run lint` in `LearnLink/` (needs `npm install` there first), plus `npm --prefix functions run build` for function commits.
