# Building

## Build from source

```bash
./scripts/build.sh              # Build for current platform
./scripts/build.sh --mac        # macOS (ARM64)
./scripts/build.sh --linux      # Linux (x64)
```

Output goes to `src/dist/`.

## Install on macOS

```bash
./scripts/install.sh            # From src/dist/
./scripts/install.sh /path      # From a specific dist directory
```

## Code signing

There is no Apple Developer ID, so electron-builder cannot sign the app. Left alone, the
packaged bundle keeps Electron's stock signature, whose identifier is `Electron` rather than
`com.openwebui.desktop` and which no longer matches the modified bundle. macOS Local Network
privacy (macOS 15 and later) keys its allow/deny decision on that identifier, so an app in
this state can never be granted local network access, however the toggle in System Settings
is set.

`src/after-pack.mjs` therefore does two things after packing:

1. Rewrites the launcher's Mach-O `LC_UUID`. Every app built on the same Electron release
   ships the same prebuilt launcher and so the same UUID, and macOS uses that UUID to identify
   the app for Local Network privacy. A shared UUID lets one app silently inherit another's
   decision. The new UUID is derived from the app ID, so it is stable across rebuilds.
2. Ad-hoc signs the whole bundle, giving every executable a signature whose identifier is its
   own bundle ID.

Verify a build with:

```bash
dwarfdump --uuid src/dist/mac-arm64/OpenWebUI.app/Contents/MacOS/OpenWebUI
codesign -dv src/dist/mac-arm64/OpenWebUI.app 2>&1 | grep Identifier
codesign --verify --deep --strict src/dist/mac-arm64/OpenWebUI.app
```

The UUID must not be Electron's stock value (it starts `4C4C44` for Electron builds), and the
identifier must be `com.openwebui.desktop`. The hook's own tests run with `npm test` in `src/`. Never modify the `.app`
after the build (for example with `plutil`); that breaks the signature. Info.plist additions
belong in `extendInfo` in `src/package.json`.

Ad-hoc signing does not satisfy Gatekeeper, so the right-click → Open workaround on first
launch still applies.

## If the app shows a blank window or "Could not connect"

When OpenWebUI runs on another machine (a LAN address such as `http://192.168.1.63:8080`)
and the window is blank or shows the "Could not connect" page, but the same app works
when started from a terminal:

```bash
/Applications/OpenWebUI.app/Contents/MacOS/OpenWebUI
```

then macOS Local Network privacy is blocking the app. Processes started from a terminal
inherit the terminal's local network access, which is why that launch works. Spotlight,
Finder and the Dock launch the app as its own responsible process, and its own permission
applies.

1. Check that the installed app is signed with its own identifier:

   ```bash
   codesign -dv /Applications/OpenWebUI.app 2>&1 | grep Identifier
   ```

   If this prints `Identifier=Electron`, the build predates the signing fix. Rebuild and
   reinstall:

   ```bash
   ./scripts/build.sh --mac
   ./scripts/install.sh
   ```

2. Launch the app from Spotlight and allow it when macOS asks for local network access, or
   turn it on under **System Settings → Privacy & Security → Local Network**.

3. To confirm what macOS is doing, watch for dropped connections while launching:

   ```bash
   log stream --predicate 'eventMessage CONTAINS "tcp drop" AND eventMessage CONTAINS "OpenWebUI"'
   ```

   A line ending in `reason: NECP` means the Local Network policy blocked the connection.

This only affects LAN addresses. `localhost` is never subject to Local Network privacy,
which is why a machine running OpenWebUI locally never shows the problem.
