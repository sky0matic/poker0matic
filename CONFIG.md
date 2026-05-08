# Firebase Setup Guide

Poker0matic uses Firebase Realtime Database as its backend. Each team that self-hosts needs to create their own Firebase project and paste the config into the app's `/config` page.

---

## Step 1 — Create a Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com/) and sign in with a Google account.
2. Click **Add project**.
3. Enter a project name (e.g. `my-team-poker`), then click **Continue**.
4. Disable Google Analytics if you don't need it, then click **Create project**.
5. Wait for the project to be provisioned, then click **Continue**.

---

## Step 2 — Enable Realtime Database

1. In the left sidebar, click **Build → Realtime Database**.
2. Click **Create Database**.
3. Choose a database location close to your team (e.g. `us-central1`).
4. On the security rules step, select **Start in test mode** (allows reads/writes for 30 days — you can tighten this later).
5. Click **Enable**.

> After creation, note the **Database URL** shown at the top of the Realtime Database page. It looks like:
> `https://my-team-poker-default-rtdb.firebaseio.com`
> You will need this in Step 4.

---

## Step 3 — Register a web app

1. In the left sidebar, click the **gear icon** next to "Project Overview" → **Project settings**.
2. Scroll down to the **Your apps** section and click the **`</>`** (web) icon.
3. Enter a nickname (e.g. `poker0matic`) and click **Register app**. You do **not** need Firebase Hosting.
4. Firebase will show you a config snippet that looks like this:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "my-team-poker.firebaseapp.com",
  databaseURL: "https://my-team-poker-default-rtdb.firebaseio.com",
  projectId: "my-team-poker",
  storageBucket: "my-team-poker.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

Keep this page open — you'll copy these values in the next step.

---

## Step 4 — Enter the config in Poker0matic

1. Open Poker0matic. If no config is saved yet you'll be redirected to `/config` automatically; otherwise navigate there manually.
2. Fill in each field using the values from the Firebase snippet above:

| Field in the app | Firebase config key |
|---|---|
| `apiKey` | `apiKey` |
| `authDomain` | `authDomain` |
| `databaseUrl` | `databaseURL` |
| `projectId` | `projectId` |
| `storageBucket` | `storageBucket` |
| `messagingSenderId` | `messagingSenderId` |
| `appId` | `appId` |

3. Click **Save**. You'll be redirected to the room page.

---

## Step 5 — Share the config with your team (optional)

You don't need to repeat the above steps for every teammate. Once saved:

1. Go back to `/config`.
2. Click **Share config** — a URL is copied to your clipboard.
3. Send that link to your teammates. Opening it will automatically load the Firebase config into their browser.

---

## Security rules

The default test-mode rules expire after 30 days and then block all access. Replace them in **Firebase Console → Realtime Database → Rules** with the following:

```json
{
  "rules": {
    "rooms": {
      ".read": false,
      ".write": false,

      "$room_id": {
        ".read": "true",
        ".write": "true",

        "users": {
          "$user_id": {
            ".validate": "newData.hasChildren(['name', 'joinedAt'])",
            "name": { ".validate": "newData.isString() && newData.val().length <= 20" }
          }
        },
        "settings": {
          "showVotes": { ".validate": "newData.isBoolean()" },
          "v": { ".validate": "newData.isNumber()" }
        },
        "lastActivity": { ".validate": "newData.isNumber()" }
      }
    }
  }
}
```

These rules lock down the database at the top level (no global read/write) while allowing any client to read and write within individual rooms. User entries are validated to require a `name` (max 20 characters) and a `joinedAt` timestamp.
