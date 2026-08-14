# Pendeza Connect

Expo/React Native MVP for the Sponsorship MIS mobile companion app.

## Features

- JWT login against `/api/v1/auth/login/`
- Role-aware dashboard
- Role-aware Home, Services, and Account tabs
- Reduced mobile navigation with a polished Home hub, Services, and Account tabs
- Focused Sponsorship, Loans, and Savings mobile workflows
- Secure token storage and automatic token refresh
- API base URL configured with `EXPO_PUBLIC_API_BASE_URL`
- Google sign-in with Expo Auth Session
- Staff-only child photo capture and upload

## Setup

```powershell
cd "D:\PERPETUAL PROJECTS\PYTHON\PendezaConnect"
copy .env.example .env
npm install
# For Expo
npm run start

#For Android to support google-signin
npm run mobile
```

For Android emulator against local Django, use:

```text
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api/v1
```

For a physical phone on the same network, use your computer LAN IP:

```text
EXPO_PUBLIC_API_BASE_URL=http://YOUR_PC_IP:8000/api/v1
```

For Google sign-in, set the matching Expo public client IDs in `.env`:

```text
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

The Django backend also needs `MOBILE_GOOGLE_CLIENT_IDS` set to the comma-separated client IDs that should be accepted for mobile Google ID tokens.

For Android builds, download the Firebase Android config from the Firebase console and save it as `google-services.json` in this directory. This file contains project credentials, so it is intentionally ignored by Git. Use `google-services.example.json` only as a shape/reference for local setup.

Start Django separately from `D:\PERPETUAL PROJECTS\PYTHON\sponsorship_mis`:

```powershell
.\.smsvenv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```
