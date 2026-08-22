# Pendeza Connect Production Deployment Runbook

This runbook covers the production path for the Pendeza Connect Django API and
Android app, from validation through a staged Google Play rollout. Commands are
PowerShell unless noted otherwise.

## Deployment summary

1. Validate and deploy Django, PostgreSQL, Redis, and Celery on Railway.
2. Smoke-test the production HTTPS API.
3. Validate the mobile dependency lockfile, types, lint, and resolved Expo config.
4. Verify EAS variables, Firebase configuration, Android identity, and signing.
5. Build and test a preview APK on a physical device.
6. Build an AAB and release it through Google Play Internal Testing.
7. Register the Google Play signing fingerprints in Firebase and retest the
   Play-installed app.
8. Complete Play declarations, promote the tested bundle with a staged rollout,
   and monitor the full stack.

Do not combine these gates for the first release. In particular, do not use
`--auto-submit` until the release process is proven.

## Production inventory

| Item | Value |
| --- | --- |
| Mobile project | `D:\PERPETUAL PROJECTS\PendezaConnect\pendezaconnect-mobile` |
| Backend project | `D:\PERPETUAL PROJECTS\PendezaConnect\pendezaconnect-web` |
| Mobile stack | Expo SDK 54 / React Native 0.81 |
| Backend stack | Django, PostgreSQL, Celery, Redis |
| Backend hosting | Railway |
| Build/distribution | Expo EAS / Google Play |
| Android application ID | `org.pendeza.connect` |
| Expo owner/project | `perpetual-labs/pendeza-connect` |
| Expo project ID | `b1a425fd-57f0-46f7-9b0e-7b3754d8b21c` |
| Firebase project ID | `pendezaconnect` |
| App scheme | `pendezaconnect` |
| Current app version | `1.0.0` |
| Current native version code | `3` |

The repository contains a native `android/` project. Its `applicationId`,
`versionCode`, manifest, and Gradle configuration are authoritative; Expo may
warn that equivalent `app.json` values are not synchronized automatically.

## 1. Prepare and validate the backend

Open the backend repository:

```powershell
cd "D:\PERPETUAL PROJECTS\PendezaConnect\pendezaconnect-web"
```

If the existing virtual environment references a missing interpreter, replace
it with a fresh Python 3.12 environment rather than attempting to repair it:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py --version
```

Run the release gates:

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py test api.v1.tests.test_mobile_api_security
python manage.py test
```

`migrate` above applies to the selected local or staging database. Apply
production migrations through a Railway deploy/release command or a controlled
one-off job. Back up the production database before a risky or irreversible
schema migration. Do not deploy while critical checks or tests fail.

### Railway environment

Set actual values in Railway, never in Git:

```dotenv
DJANGO_ENV=production
SECRET_KEY=<strong-random-production-secret>
DATABASE_URL=<railway-postgresql-url>
ALLOWED_HOSTS=<api-hostname>
CSRF_TRUSTED_ORIGINS=https://<api-hostname>
CORS_ALLOWED_ORIGINS=https://<allowed-web-origin>

FIREBASE_PROJECT_ID=pendezaconnect
FIREBASE_SERVICE_ACCOUNT_B64=<base64-service-account-json>

REDIS_URL=<railway-redis-url>
CELERY_BROKER_URL=<railway-redis-url>
CELERY_RESULT_BACKEND=<railway-redis-url>
CELERY_TASK_DEFAULT_QUEUE=pendeza_connect
```

Use the precise variable names supported by the backend settings. Remove CORS
origins that the production application does not need. A value such as
`GOOGLE_APPLICATION_CREDENTIALS=D:/...` is invalid on Railway; use the backend's
secret-backed Firebase service-account input instead.

### Railway services

Configure distinct services/processes as applicable:

```text
Web:    gunicorn core.wsgi:application
Worker: celery -A core worker --loglevel=INFO --queues=pendeza_connect
Beat:   celery -A core beat --loglevel=INFO
```

Run Beat only if scheduled tasks are used, and run a single scheduler unless the
application has explicit duplicate-execution protection. Add health checks,
restart policies, and alerts to the web and worker services. Confirm both point
to the same production database/Redis resources and expected Celery queue.

## 2. Verify the production API

Production mobile builds must use an HTTPS endpoint such as:

```text
https://sponsorwithpendeza.org/api/v1
```

Confirm that this is still the canonical endpoint before release. Never ship a
production build using `localhost`, `127.0.0.1`, `10.0.2.2`, or a LAN address.

Test login, token refresh, logout, current user, permissions and role boundaries,
clients/children, sponsors, staff, loans, savings, payments, Mobile Money,
notifications, device registration, and file/photo upload. Exercise invalid and
expired credentials as well as unauthorized cross-role access. Check Railway web
and worker logs while testing.

**Gate:** continue only when the production API, background jobs, database, Redis,
Firebase integration, and TLS are healthy.

## 3. Validate the mobile repository

```powershell
cd "D:\PERPETUAL PROJECTS\PendezaConnect\pendezaconnect-mobile"
git status --short
npm ci
npm run typecheck
npm run lint
npx expo-doctor
npx expo config --type public
```

Review the working tree and release only intended, committed changes. Do not use
`git add .` blindly. `npm ci` must succeed: `package.json` and
`package-lock.json` must be synchronized and committed. If intentionally changing
dependencies, run `npm install`, validate the result, and then prove a clean
install with `npm ci`.

An Expo Doctor native-configuration warning may be expected because both
`android/` and Expo config exist. Do not delete native folders to suppress it;
inspect the resolved config and native files. Do not run `npm audit fix --force`
immediately before release: major Expo/React Native upgrades require their own
tested change set.

Verify all of the following:

- `android/app/build.gradle` has `applicationId 'org.pendeza.connect'` and the
  intended `versionName`/`versionCode`.
- `app.json` agrees with the native identity and version.
- `android/app/src/main/AndroidManifest.xml` contains only justified permissions.
- The public Expo config contains no secret or unexpected local endpoint.
- The release build has no debug-signing fallback.

## 4. Configure EAS and Firebase

Authenticate and verify the linked project:

```powershell
eas login
eas whoami
eas project:info
```

The checked-in `eas.json` currently produces an APK for `preview` and an AAB for
`production`; production uses Node `20.19.4`, the EAS `production` environment,
and automatic version-code increments. Recheck these facts before every release.

### EAS production variables

Configure these in the Expo project's **Production** environment:

```dotenv
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_API_BASE_URL=https://sponsorwithpendeza.org/api/v1
EXPO_PUBLIC_API_TIMEOUT_MS=15000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<google-web-client-id>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<google-android-client-id>
```

Only use that API URL if it remains the verified production endpoint. Variables
prefixed `EXPO_PUBLIC_` are embedded in the app and are publicly readable. Never
store Django, database, Redis, SMTP, signing, private API, or Firebase Admin
credentials in them.

### Firebase Android configuration

These credentials have different trust boundaries:

- `google-services.json` configures the Android client and is not a Firebase
  Admin service account.
- The Firebase Admin service-account JSON is a privileged backend secret and
  must exist only in Railway's secret storage.

`google-services.json` is ignored by Git. Before an EAS build, provide the real
file through the supported EAS secret-file workflow or another secured build-time
mechanism, and confirm it describes `org.pendeza.connect`. The current
`app.config.js` removes `android.googleServicesFile` when the root file is absent,
so a missing file can silently remove that Expo setting; because this project is
native, also verify the resulting Gradle/Firebase integration in the build.

### Android signing

```powershell
eas credentials --platform android
```

Confirm the production credential is **Pendeza Connect Production**. Never use
`android/app/debug.keystore` for production or commit upload keys/passwords.

Google Sign-In may require three different certificate identities: local debug,
the EAS upload key, and Google Play App Signing. Register the relevant SHA-1 and
SHA-256 fingerprints in the Firebase Android app. The Play fingerprints become
available after the first Play upload.

## 5. Build and test a preview APK

```powershell
eas build --platform android --profile preview
```

# Local build
```
eas build --platform android --profile production --local
```

Install the APK on a physical device and test:

- Username/password and Google login; invalid/expired credentials; refresh,
  persistence, logout, and server-side invalidation.
- Profile/account, role restrictions, clients, children, sponsors, staff, loans,
  savings, payments, Mobile Money, and services.
- Camera, photo selection/upload, contact selection, and both permission outcomes.
- Device registration and foreground, background, and terminated-app notifications.
- Slow/offline networks, timeout, server error, retry behavior, and recovery.
- Absence of tokens, personal data, financial data, and secrets in client logs.

**Gate:** do not create the release AAB until core flows pass on the preview build.

## 6. Prepare Google Play

Create the app with the permanent package `org.pendeza.connect`. Prepare a 512 ×
512 icon, 1024 × 500 feature graphic, representative phone screenshots, app name,
short/full descriptions, category, support email/site, and public HTTPS privacy
policy. Use identifiable client or child imagery only with documented consent.

Complete every applicable App Content declaration, including:

- Privacy policy, ads, app access, target audience, and content rating.
- Data Safety based on actual app behavior and included SDKs—not guesses.
- Financial features, account deletion, government-app status, and any other
  declarations Play presents.
- A least-privilege reviewer account with safe test data if authentication is
  required. Do not provide unnecessary administrator access.

The privacy policy and Data Safety form should accurately cover applicable
account/profile identifiers, photos, selected contacts, child records, financial
and transaction records, device/installation identifiers, push tokens, third
parties, retention, deletion, and security. If users can create accounts, provide
an in-app deletion request path, a public deletion-information page, and a reviewed
backend fulfillment process.

## 7. Build and distribute the production AAB

Repeat the mobile validation commands immediately before building, then run:

```powershell
eas build --platform android --profile production
```

For the first release, do not add `--auto-submit`. Record:

- EAS build URL and artifact checksum if available
- Git commit and clean/dirty status
- app version and final version code (EAS may auto-increment it)
- build date, API domain, Expo project, and Android package

Upload the AAB to **Google Play Console → Testing → Internal testing**, review
bundle/signing/permission warnings and release notes, add testers, and start the
internal rollout.

Install from Google Play—not from the preview URL—and repeat the complete device
test. This validates the production bundle, delivery, and Play signing identity.

After the first upload, copy SHA-1 and SHA-256 from **Setup → App integrity → App
signing** into the Firebase Android application. If Firebase configuration changes,
download/provide the updated Android client config, rebuild, upload a higher
version code, and retest Google Sign-In and notifications.

If Play Console requires closed testing for this developer account, follow the
exact tester count and duration shown there; policy requirements can change and
vary by account.

## 8. Production rollout and rollback

Promote the already-tested release rather than rebuilding it. Review the
pre-launch report, Android vitals, Data Safety, app access, privacy policy,
permissions, and release notes before submitting for production review.

Use a staged rollout appropriate to the user base, for example 5% → 20% → 50% →
100%, with an observation period and explicit go/no-go check at every stage.

If a serious issue appears:

1. Halt the Play rollout.
2. Disable or contain the affected server feature when safe to do so.
3. Roll Railway back to a known-compatible deployment if the database schema
   remains compatible; do not blindly reverse destructive migrations.
4. Prepare and test a corrected mobile build with a higher version code.
5. Document the incident, affected release, mitigation, and verification.

Mobile binaries already installed cannot be instantly recalled. Favor backward-
compatible API changes and server-side feature flags so old and new clients can
coexist during rollout and rollback.

## 9. Post-release monitoring

Monitor throughout rollout and after 100%:

- Railway: HTTP errors, latency, CPU/memory, database connections/storage, Redis,
  Celery queue depth/retries/failures, and worker restarts. Celery memory usage is
  a known cost/usage concern for this project.
- Firebase: authentication failures, Google Sign-In, FCM delivery, invalid device
  tokens, and Android configuration.
- Google Play: crashes, ANRs, Android vitals, reviews, ratings, and user feedback.
- Business flows: login, API authorization, uploads, Mobile Money/payment failures,
  and notification delivery.

Define owners and alert thresholds before rollout. Keep enough structured logs to
correlate mobile failures with API and task executions without logging credentials
or sensitive records.

## Repeatable release checklist

- [ ] Release scope and Git commit are identified; unintended changes excluded.
- [ ] Backend checks, migration check, security tests, and full tests pass.
- [ ] Production migrations and Railway deployment plan are reviewed.
- [ ] Web, PostgreSQL, Redis, Celery, Firebase, TLS, and API smoke tests pass.
- [ ] `npm ci`, typecheck, lint, Expo Doctor, and public-config review pass.
- [ ] Native package/version/permissions and Expo config agree.
- [ ] Production EAS variables contain the HTTPS endpoint and no secrets.
- [ ] Firebase Android file, OAuth client IDs, SHA fingerprints, and EAS keystore
  are correct.
- [ ] Preview APK passes physical-device testing.
- [ ] Store listing, privacy policy, app access, deletion, and Data Safety are ready.
- [ ] Production AAB is recorded and passes Play Internal Testing.
- [ ] The Play-installed build passes auth, API, upload, permission, and notification
  tests.
- [ ] Closed testing requirements, if shown, are complete.
- [ ] Staged rollout, rollback decision-makers, dashboards, and alerts are ready.

## Security rules

Never commit `.env`, Firebase Admin credentials, Django secrets, database/Redis
URLs, SMTP credentials, private API keys, production keystores, signing properties,
or passwords. This repository's `.gitignore` excludes the principal local secret
and signing files; still inspect every commit before pushing.

Treat every `EXPO_PUBLIC_*` value and `google-services.json` client identifier as
extractable from the shipped app. Authorization must always be enforced by Django;
the mobile UI and role-aware navigation are not security boundaries.

## Architecture

```text
Google Play → Pendeza Connect Android app → HTTPS → Django API on Railway
                                                   ├─ PostgreSQL
                                                   ├─ Redis → Celery worker/Beat
                                                   └─ Firebase Admin / FCM
```

The release is complete only after the Play-installed build is verified and the
production services are stable under monitoring.


Play Store App testing
https://support.google.com/googleplay/android-developer/answer/9844679?hl=en-419#zippy=%2Cupload-and-share-apps-for-testing%2Cadd-authorized-uploaders

https://play.google.com/console/signup
https://play.google.com/console/internal-app-sharing