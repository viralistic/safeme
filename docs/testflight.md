# The iPhone app on TestFlight

The app lives in `mobile/` (React Native, Expo). GitHub Actions builds it on a
Mac and uploads it to TestFlight. You do the Apple side once; after that every
run puts a new build in TestFlight.

## 1. Apple, once

1. An Apple Developer account (99 euro a year): https://developer.apple.com/programs/
2. In App Store Connect, create the app: **Apps, +, New App**. Bundle ID
   `nl.safetymap.app` (change it in `mobile/app.json` first if you want another),
   name Safety Map, primary language Dutch.
3. Fill in **App Privacy** and the privacy policy URL: `https://<your domain>/privacy`.
4. Create an API key: **Users and Access, Integrations, App Store Connect API, +**,
   role **App Manager**. Download the `.p8` file (only once possible) and note the
   Key ID and the Issuer ID.
5. Your Team ID is under **Membership** on developer.apple.com.

## 2. GitHub, once

In the repository: **Settings, Secrets and variables, Actions**.

Secrets:

| Name | Value |
| --- | --- |
| `APPLE_TEAM_ID` | your Team ID |
| `ASC_KEY_ID` | the API Key ID |
| `ASC_ISSUER_ID` | the Issuer ID |
| `ASC_KEY_P8_BASE64` | the `.p8` file as base64: `base64 -i AuthKey_XXXX.p8` |

Variables:

| Name | Value |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | `https://<your domain>/api` (empty = demo data on the phone) |
| `EXPO_PUBLIC_WEB_URL` | `https://<your domain>` |

## 3. Build

**Actions, TestFlight, Run workflow.** Or push a tag: `git tag app-v0.1.0 && git push --tags`.
A run takes about 20 to 40 minutes. Apple then processes the build for a few
minutes before it shows up in TestFlight.

## 4. Testers

- **Internal testers** (up to 100 people on your App Store Connect team) can install
  right away.
- **External testers** (up to 10,000, by email or a public link) need a short
  Beta App Review first. Apple looks at apps with user reports for: a way to
  report misuse (yes, "Rapporteer misbruik"), moderation (yes) and a privacy
  policy (yes, /privacy).

## Without GitHub

On your own Mac with Xcode:

```bash
cd mobile && npm install && npx expo prebuild --platform ios && open ios/SafetyMap.xcworkspace
```

Then **Product, Archive** and **Distribute App, TestFlight & App Store**.

## Run it on your phone while developing

```bash
cd mobile && npx expo run:ios --device
```

The app uses native modules (map, audio), so Expo Go is not enough; this builds
a development version.
