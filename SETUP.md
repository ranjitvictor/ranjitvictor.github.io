# Setup — contact form + secured inbox (simple, free)

The website is static (GitHub Pages). The questionnaire saves submissions to
**Firebase Firestore**, and you read them at **`/admin.html`** after signing in with
Google as `ranjitvictor@gmail.com`. Runs entirely on Firebase's **free Spark plan** —
no billing, no Cloud Functions, no App Engine.

Status: ✅ Firebase config is wired in. ✅ Google sign-in enabled with authorized domains.

> The Firebase `apiKey` in `assets/firebase-config.js` is **not a secret** (it's a public
> project id). Security is the Firestore rules. Safe to commit.

## The one remaining step: Firestore database + rules
1. Firebase console → **Build → Firestore Database → Create database** → location
   **asia-south1 (Mumbai)** → **Production mode**.
2. Open the **Rules** tab → replace everything with the contents of **`firestore.rules`** →
   **Publish**. (Anyone can submit the form; **only your verified account can read**.)

That's it — the form and the admin inbox will work.

## How it works
- Every "Book a Call" button opens the questionnaire (mailto still works if JS is off).
- Submitting writes to Firestore.
- `/admin.html` is unlisted, `noindex`, and **never cached**: login is kept in memory only
  (closing the tab logs you out), no submission data is stored on the device, and returning
  via the Back button forces a fresh sign-in.

## Notifications (optional, added later)
There is **no email alert** in this simple version — you check the inbox at `/admin.html`.
If you later want an email on each submission without any billing, I can add a small
**Google Apps Script** (your own Gmail, free) — ask when you want it.

## Anti-spam (optional)
Turn on **App Check** (reCAPTCHA v3) in the Firebase console and send me the site key; I'll
paste it into `assets/firebase-config.js`.

## Billing note
Nothing here uses paid features, so the Blaze plan you enabled will stay at **$0**. If you'd
rather remove the card entirely, you can downgrade to **Spark** (Firebase console → Usage and
billing → Modify plan → Spark) — everything keeps working.
