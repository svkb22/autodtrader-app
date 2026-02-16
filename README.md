# AutoDTrader iOS Client (Expo)

iOS-first React Native client for the Auto Day-Trader MVP.

## Features implemented

- OTP auth flow (`/auth/magic_link`, `/auth/verify`) with secure token persistence
- Expo push token registration to backend (`/devices/register`)
- Push-tap routing to proposal screen
- Home with pending proposal, server-time countdown, refresh, recent orders preview
- Proposal approval/rejection flow with expiry-aware action disabling
- Risk settings update screen (`GET/PUT /risk`)
- Broker connect screen (`/broker/alpaca/connect`)
- History screen (`/orders/recent`)
- EAS production iOS profile for TestFlight pipeline

## Environment

Create `.env` from `.env.example` and set:

- `EXPO_PUBLIC_API_URL=https://<your-backend>`

## Run locally

```bash
cd /Users/sathvik/autodtrader-app
npm install
npm run start
```

## iOS build and submit

```bash
eas build -p ios --profile production
eas submit -p ios
```

## Important files

- App config: `/Users/sathvik/autodtrader-app/app.json`
- EAS config: `/Users/sathvik/autodtrader-app/eas.json`
- Navigation: `/Users/sathvik/autodtrader-app/src/navigation/RootNavigator.tsx`
- Notifications: `/Users/sathvik/autodtrader-app/src/notifications/notifications.ts`
- API client: `/Users/sathvik/autodtrader-app/src/api/client.ts`
