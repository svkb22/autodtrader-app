# AutoDTrader iOS Client (Expo)

iOS-first React Native client for the Auto Day-Trader MVP.

## Auth in this build

- Google Sign-In with Expo AuthSession
- Firebase Authentication session creation
- Backend exchange via `POST /auth/firebase` to get app JWT
- Secure app JWT storage with `expo-secure-store`
- Legacy OTP + Quick Login still available for interim testing

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

On next launch, completed users go directly to Home tabs.

## Analytics events emitted

- `onboarding_started`
- `onboarding_step_viewed`
- `onboarding_step_completed`
- `broker_connect_started`
- `broker_connect_success`
- `broker_connect_failed`
- `risk_saved`
- `notifications_permission_prompted`
- `notifications_permission_result`
- `onboarding_activated`
- `onboarding_completed`

## Backend endpoints used by onboarding

- `GET /risk`
- `PUT /risk`
- `GET /broker/status` (new client usage)
- `POST /system/activate` (client falls back safely if endpoint unavailable)

## Environment

Set these in `/Users/sathvik/autodtrader-app/.env`:

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

## Firebase setup

1. Create a Firebase project.
2. Enable **Authentication -> Sign-in method -> Google**.
3. Register app/web OAuth clients and collect client IDs.
4. In Firebase project settings, copy the web config values and set the `EXPO_PUBLIC_FIREBASE_*` vars above.
5. Set `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` values from Google/Firebase OAuth client credentials.

## Run locally

```bash
cd /Users/sathvik/autodtrader-app
npm install
npm run start -- --clear
```

Then open in iOS simulator or Expo Go.

## iOS build and submit

```bash
eas build -p ios --profile production
eas submit -p ios
```

## Important files

- App config: `/Users/sathvik/autodtrader-app/app.config.ts`
- Root routing: `/Users/sathvik/autodtrader-app/src/navigation/RootNavigator.tsx`
- Onboarding stack: `/Users/sathvik/autodtrader-app/src/navigation/OnboardingNavigator.tsx`
- Onboarding state: `/Users/sathvik/autodtrader-app/src/onboarding/OnboardingContext.tsx`
- Login screen: `/Users/sathvik/autodtrader-app/src/screens/LoginScreen.tsx`
- API client: `/Users/sathvik/autodtrader-app/src/api/client.ts`
