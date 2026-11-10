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

