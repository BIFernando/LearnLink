# LearnLink
INTE 22283 : Mobile Applications Development

# Getting started
## 🚀 Project Setup

### Expo Configuration

SkillLoop is built using **React Native with Expo** and **TypeScript**.

For development and testing, the project uses:

* **Expo SDK:** 54
* **Expo Go:** Used for development and device testing
* **React Native:** Managed through the selected Expo SDK
* **TypeScript:** Used for application development

### Why Expo SDK 54?

We selected **Expo SDK 54** because it is compatible with the version of **Expo Go available through the App Store and Google Play Store**, making it easier for all team members to run and test the application on their physical devices during development.

> **Important:** All team members should use the same Expo SDK and dependency versions. Do not independently upgrade the Expo SDK without discussing it with the team.

### Installing the Project

After cloning the repository:

```bash
git clone <repository-url>
cd SkillLoop
npm install
```

Start the development server:

```bash
npx expo start
```

The application can then be opened using **Expo Go** by scanning the QR code.

### Dependencies

The project dependencies are defined in `package.json`. Team members should **not install packages individually unless required**.

If a new dependency is needed:

```bash
npx expo install <package-name>
```

For regular npm packages:

```bash
npm install <package-name>
```

After adding a dependency, commit the updated:

```text
package.json
package-lock.json
```

so that all team members can install the same dependencies.

### Team Development Rule

The project follows this workflow:

```text
Clone Repository
       ↓
npm install
       ↓
npx expo start
       ↓
Open with Expo Go
       ↓
Develop Feature
       ↓
Commit & Push
       ↓
Other Members Pull Changes
```

**Do not commit `node_modules/` to GitHub.**

## Admin authentication

Open `/admin/login` to access the admin sign-in screen. Admin access requires
Firebase Email/Password Authentication and a Firebase custom claim with the
boolean value `admin: true`. Claims must be assigned or removed only by a
trusted server using the Firebase Admin SDK; the mobile app cannot grant or
edit administrator privileges.

The admin route refreshes and verifies the signed-in user's ID token before
showing protected screens. Firestore authorization uses the same
`request.auth.token.admin` claim. Deploy the checked-in rules to the intended
Firebase project with:

```bash
firebase deploy --only firestore:rules
```

Before deploying, validate the rules against the project's existing data and
exercise the admin and member flows in the Firebase Emulator Suite. In
particular, verify that a normal account is redirected from `/admin`, an
admin account can reach the protected route, sign-out returns to the login
screen, and direct Firestore requests without the admin claim are denied.

The existing Member 4 credit-completion flow updates both participants'
`skillCredits` from one client transaction. These rules restrict profile
updates to the profile owner or an admin, so that cross-user credit transfer
will be denied. Move that operation to a trusted backend before deploying
these rules if credit exchanges must remain enabled; do not weaken the profile
rules to let clients edit another user's balance.

The admin dashboard reads document counts from `users`, `skills`, and
`exchangeRequests`, and reads the latest exchange requests using their
`createdAt`, `senderId`, `receiverId`, and `status` fields. Active users are
counted by `users.isActive == true`. Admin-managed `skills` and `categories`
use the catalog schema documented below. `userSkills` contains user-to-skill
records and is not treated as a count of unique catalog skills.
Suspended-user counts are unavailable because no suspension field is
established. The report flow now uses the app schema documented below;
existing Firestore report documents have not been migrated or assumed to
match that schema. There is no general activity log; the dashboard labels
its recent exchange requests accordingly.

The admin user-management screens page through `users` by document ID and
search the records currently loaded in the list. User details read matching
profile fields only when present and query up to 100 `userSkills` documents
whose `userId` matches the selected user. Email is shown only if stored in the
user document; the app does not fetch every user's Firebase Authentication
record. Suspension and reactivation remain unavailable because neither
suspension fields nor moderation history are defined, and suspended-account
checks are not enforced by the current rules.

The current `users` and `userSkills` read rules allow any signed-in user to
read those documents. The admin screen and service verify the admin custom
claim, but preventing direct reads by non-admin clients requires a coordinated
Firestore rules/backend decision; this user-management change does not alter
the rules or break existing member reads.

## Admin skills and categories

The approved admin catalog schema is:

- `skills/{skillId}`: `name`, nullable `description`, nullable `categoryId`,
  `createdAt`, `updatedAt`, `createdBy`, and `updatedBy`.
- `categories/{categoryId}`: `name`, nullable `description`, `createdAt`,
  `updatedAt`, `createdBy`, and `updatedBy`.

The admin catalog screens are separate from `userSkills`. Member 3's typed
matching schema uses `userSkills.skillName` and an optional free-form
`category`; Member 4 exchange and session records carry `offeredSkillId`,
`requestedSkillId`, and `skillId` strings. Catalog creation does not migrate
or rewrite those fields, so existing matching/exchange behavior remains
unchanged. Catalog deletions and renames are blocked when matching, user-skill,
exchange, session, or legacy category-name references are found. These
client-side checks are best-effort and can race with concurrent writes; they
prevent ordinary accidental deletion but do not replace backend/rules
enforcement.

The currently checked-in Firestore rules already allow admins to write
`skills` and `categories`; no rules were changed for this module. Those rules
do not enforce catalog-reference existence on member writes, and member
clients may still create string references independently of the catalog.
Before catalog IDs become authoritative in matching/exchange flows, coordinate
with Members 3 and 4 on migration and add reviewed rules or trusted backend
validation for reference integrity. Existing catalog documents that do not
match the approved timestamp/actor schema are displayed read-only.

## Reports

The app's report schema is newly introduced and must not be assumed to describe
pre-existing Firestore documents:

- `reports/{reportId}`: `reporterId`, `targetType`, `targetId`, `reason`,
  nullable `description`, `status`, `createdAt`, nullable `reviewedBy`, and
  nullable `reviewedAt`.
- `targetType` supports `USER`, `EXCHANGE_REQUEST`, and `SESSION`. User targets
  identify a UID; exchange-request and session targets identify existing
  document IDs. The callable verifies that content reporters participate in
  the target exchange or session.
- `reason` is one of `HARASSMENT`, `SPAM`, `INAPPROPRIATE_CONTENT`,
  `SAFETY_CONCERN`, or `OTHER`. New reports start at `OPEN`; moderation can
  transition an open report to `RESOLVED` or `REJECTED`.
- `reports/{reportId}/moderationHistory/{eventId}` stores admin UID, action,
  previous/new status, internal moderation note, and server timestamp. Notes
  are not stored on reporter-readable report documents.

Report submission and moderation are performed by Firebase callable functions
using server-side Admin SDK credentials. No Admin SDK credentials belong in
the mobile app. The client can read reports belonging to the signed-in
reporter, admins can read all reports, and client-side report writes and
history writes are denied by Firestore rules. Moderation verifies the admin
custom claim and records the status update and history event in one
transaction.

The dashboard's Open Reports count counts documents whose status is exactly
`OPEN`; it does not infer a status for legacy or unrecognized documents.
Unrecognized report documents are displayed read-only in admin reports. No
automatic migration or deployment of Functions or Firestore rules is performed
by the app.

## Admin analytics

The analytics screen uses Firestore aggregate counts for user profiles,
`users.isActive == true`, exchange requests with status `COMPLETED`, sessions
with status `COMPLETED`, and reports with status `OPEN` or `RESOLVED`. The
Member 4 completion workflow updates sessions, not exchange-request status, so
completed sessions are also shown as the directly recorded completion metric.
The completed-exchange-request count is based on the `COMPLETED` request status;
the current client flow does not transition requests to that status.

Skill and category popularity is derived from `userSkills` records, grouping
their skill-name fields and optional free-form `category`. Catalog categories
are separate from Member 3's user-skill categories. The analytics service also
recognizes `categoryId` on legacy or untyped records and resolves it against
the catalog when no free-form category is present; `categoryId` is not part of
Member 3's current typed user-skill schema. Missing or unrecognized fields are
omitted from the charts.
The current app has no reliable user-profile creation timestamp, so user
growth is not charted. `isActive` is not a suspension field, so no suspended
user count is reported. The popularity charts read the `userSkills` collection
to calculate distributions; no charting dependency or Firestore rule change is
required.
