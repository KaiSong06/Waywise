# Waywise iOS Demo

Native SwiftUI proof app for the Waywise demo. The app is intentionally iOS-only and sends a
backend-compatible impact event from a real device or simulator instead of relying only on seeded
dashboard data.

## Requirements

- Xcode 26.3 or newer
- XcodeGen (`brew install xcodegen`)
- A running Waywise backend, usually the deployed Cloud Run URL

## Generate The Project

```bash
xcodegen generate --spec project.yml --project .
open Waywise.xcodeproj
```

## Run The Demo

1. Select the `WaywiseDemo` scheme in Xcode.
2. Run on an iPhone or iOS simulator.
3. Enter the backend base URL. Both `https://example.run.app` and
   `https://example.run.app/api` are accepted.
4. Tap `Start`, grant location and motion permissions, then tap `Send demo impact`.

The app uploads to `POST /api/impact-events` with `sourceType` set to `ios_demo`. It stores a
stable anonymous vehicle ID locally and does not upload continuous trip history.

## Verify

```bash
xcodegen generate --spec project.yml --project .
xcodebuild test \
  -project Waywise.xcodeproj \
  -scheme WaywiseDemo \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  CODE_SIGNING_ALLOWED=NO
```
