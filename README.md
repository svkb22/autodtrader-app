# AutoDTrader iOS Client (Expo)

iOS-first React Native client for the Auto Day-Trader MVP.

## Auth in this build

- Google Sign-In (Expo AuthSession + Firebase Auth)
- Email/password Sign Up + Sign In (Firebase Auth)
- Email verification hard gate for email/password users
- Forgot password flow via Firebase reset email
- Backend exchange via `POST /auth/firebase` to get app JWT
- Secure app JWT storage with `expo-secure-store`
- Legacy OTP + Quick Login still available via **Use Default Login**

## Auth routing gate

- `signedOut` -> Auth stack (`AuthLanding`, `EmailAuth`, `ForgotPassword`, `LegacyLogin`)
- `signedIn_unverified` -> `VerifyEmailScreen` (hard gate)
- `signedIn_verified` -> app flow (Onboarding or Main tabs)

Google users are treated as verified. Email/password users must verify before proceeding.

## Onboarding flow (post-login)

Authenticated users are routed through a dedicated 7-step onboarding flow once:

1. Welcome
2. How it works
3. Connect broker (paper/live)
4. Risk guardrails (mandatory save)
5. Notifications permission
6. Expectations
7. Review & Activate

Completion is persisted in AsyncStorage with:

- `onboarding.version`
- `onboarding.completed`
- `onboarding.completed_at`
- `onboarding.activation_mode`

## Environment

Set these in `/Users/sathvik/autodtrader-app/.env`:

- `EXPO_PUBLIC_ENABLE_LIVE_BROKER=false` (default; only Paper shown)

- `EXPO_PUBLIC_API_URL=https://<your-backend>`
- `EXPO_PUBLIC_FIREBASE_API_KEY=...`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID=...`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...`
- `EXPO_PUBLIC_FIREBASE_APP_ID=...`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...` (optional for iOS-first)
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...`

Optional dev fallback:

- `EXPO_PUBLIC_DEFAULT_EMAIL=...`
- `EXPO_PUBLIC_DEFAULT_OTP=123456`
- `EXPO_PUBLIC_ALPACA_USERNAME=...`
- `EXPO_PUBLIC_ALPACA_PASSWORD=...`

## Firebase Console setup

1. Create a Firebase project.
2. Enable **Authentication -> Sign-in method -> Google**.
3. Enable **Authentication -> Sign-in method -> Email/Password**.
4. Configure OAuth consent screen and Google client IDs used by Expo.
5. In Firebase project settings, copy config values and set `EXPO_PUBLIC_FIREBASE_*` vars.
6. Set `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` values from Google/Firebase OAuth credentials.
7. Optional: customize Auth email templates and configure email action links/continue URL.

## Broker OAuth endpoints used

- `GET /broker/status`
- `POST /broker/alpaca/oauth/start`
- `POST /broker/alpaca/oauth/callback`
- `POST /agreements/stocks`

## Backend endpoint used by auth exchange

- `POST /auth/firebase` with Firebase ID token
- response `{ accessToken, user }` stored as app session

## Run locally

```bash
cd /Users/sathvik/autodtrader-app
npm install
npm run start -- --clear
```

## Important files

- Root routing: `/Users/sathvik/autodtrader-app/src/navigation/RootNavigator.tsx`
- Auth context: `/Users/sathvik/autodtrader-app/src/auth/AuthContext.tsx`
- Firebase init: `/Users/sathvik/autodtrader-app/src/auth/firebase.ts`
- Auth landing: `/Users/sathvik/autodtrader-app/src/screens/AuthLandingScreen.tsx`
- Email auth: `/Users/sathvik/autodtrader-app/src/screens/EmailAuthScreen.tsx`
- Verify gate: `/Users/sathvik/autodtrader-app/src/screens/VerifyEmailScreen.tsx`
- Forgot password: `/Users/sathvik/autodtrader-app/src/screens/ForgotPasswordScreen.tsx`
