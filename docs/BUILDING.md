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

## If the app shows a blank white screen

This can happen on machines that have an older version installed. macOS Spotlight
caches the last known good binary, so launching from Spotlight may use a stale
build.

1. Close the app completely (**Cmd+Q**).
2. Launch from the terminal instead:

   ```bash
   /Applications/OpenWebUI.app/Contents/MacOS/OpenWebUI
   ```

   If this works, the app is fine — Spotlight is serving a cached version.

3. To fix Spotlight, clear its index cache for the Applications folder:

   ```bash
   sudo mdutil -i off /Applications
   sudo mdutil -i on /Applications
   ```

4. If the issue persists, clear the LaunchServices cache. macOS caches the "last
   known good" binary for an app — if you've reinstalled from a newer dmg,
   Spotlight may still launch a stale copy. Delete the plist and restart Finder:

   ```bash
   rm ~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist
   killall Finder
   ```

5. Or rebuild the app on the machine where it will run:

   ```bash
   cd ~/Documents/Projects/openwebui-electron
   rm -rf src/dist
   ./scripts/build.sh --mac
   rm -rf /Applications/OpenWebUI.app
   ./scripts/install.sh
   ```
