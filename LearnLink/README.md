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
counted by `users.isActive == true`. The `skills` collection path is declared
in the existing Firestore rules, but it does not yet have an app-level schema.
`userSkills` contains user-to-skill records and is not treated as a count of
unique catalog skills. Suspended-user counts are unavailable because no
suspension field is established. The rules declare `reports`, but there is no
application report schema or defined pending status, so pending-report counts
are unavailable. There is no general activity log; the dashboard labels its
recent exchange requests accordingly.

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
