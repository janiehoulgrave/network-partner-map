# Network Partner Map

network.janienation.com · Compass agents map their own referral partner network.

## Setup (one time, about 20 minutes)

### 1. Add your Firebase settings
Uses the same Firebase project as SignatureStudio (`signaturestudio-f49f4`), in its own `networkMap` collection.

1. Firebase console (your personal Google account) → **signaturestudio-f49f4** → gear icon → **Project settings** → **General**.
2. Under **Your apps**, click the web app and find **SDK setup and configuration → Config**.
3. Open `src/config.js` and replace `PASTE_API_KEY`, `PASTE_SENDER_ID` and `PASTE_APP_ID` with the values from that config. Leave the quotes in place.
   (Or send Claude the config and it will fill this in for you.)

### 2. Add the Firestore security rule
Firebase console → **Firestore Database** → **Rules**.
**Add** this block inside the existing `match /databases/{database}/documents { ... }` section, next to the SignatureStudio rules. Do not replace the existing rules.

```
    // Network Partner Map: each agent can only read and write their own partners
    match /networkMap/{uid}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.uid == uid
        && request.auth.token.email.matches('.*@compass[.]com$');
    }
```
Click **Publish**.

### 3. Allow sign-in on the new address
Firebase console → **Authentication** → **Settings** → **Authorized domains** → **Add domain** → `network.janienation.com`.
(Google sign-in is already turned on for SignatureStudio, so nothing else to change.)

### 4. Put the code on GitHub
1. GitHub → **New repository** → name it `network-partner-map` → Create.
2. **uploading an existing file** → drag in everything from this folder (all files and folders) → Commit.

### 5. Deploy on Vercel
1. Vercel → **Add New → Project** → import `network-partner-map`.
2. Framework should show **Vite**. Leave everything else as is → **Deploy**.

### 6. Connect network.janienation.com
1. Vercel project → **Settings → Domains** → add `network.janienation.com`.
2. GoDaddy → janienation.com → **DNS** → **Add record**: Type `CNAME`, Name `network`, Value `cname.vercel-dns.com`, TTL default → Save.
3. Wait a few minutes until Vercel shows the domain as valid.

### 7. Check it works
- Visit `https://network.janienation.com/api/offices`. You should see a `count` of several hundred Compass offices.
- Visit `https://network.janienation.com`, sign in with your Compass account, click **Add partner** and paste `https://www.compass.com/agents/maryam-redjaee/`.

If a step shows an error, send Claude a screenshot.

## How it works

| Piece | What it does |
|---|---|
| `index.html`, `src/` | The app: map, search, pin cards, add/edit, CRM export |
| `src/config.js` | Firebase settings, allowed email domain, CRM export tag |
| `api/agent.js` | Reads a Compass agent page (photo, title, phones, email, city/state, specialties, languages) |
| `api/offices.js` | Reads compass.com/about/offices (name, address, main phone), cached for a week |
| `api/geocode.js` | Turns an office address or city into map coordinates (U.S. Census geocoder, OpenStreetMap) |
| `tests/run.mjs` | Checks the page readers (`npm test`) |

Data: `networkMap/{agent's user id}/partners/{partner id}` in Firestore. Only the signed-in agent can read or write their own partners.
No AI is used anywhere in the app.
