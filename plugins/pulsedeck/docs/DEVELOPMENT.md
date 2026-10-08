# Developing PulseDeck

Node.js 22+ runs the source tests and packaging tools. Claude Code 2.1.293 supplies the native mod loader and test runner.

```sh
npm test
npm run test:native
npm run check
npm run build
claude --plugin-dir ./dist/pulsedeck
```

`/pulsedeck demo` exercises synthetic animation. `/pulsedeck start` uses the plugin-contained CAVA binary with CoreAudio system-output `tap`. Controls work without starting a model turn. Start never selects microphone input. Stop, reset, session end, and module unload own cleanup; failed cleanup must be retried before replacement capture.

The native entry defines `register` directly and imports only pure helpers. Host API calls remain literal `$.namespace.method` calls in that entry. `src/host/claude.js` is the source of the entry; `scripts/build.mjs` adjusts import paths for `hooks/register.js`. The build copies source helpers instead of hiding registration inside a generated module wrapper. Native validation is part of the packaging test.

Claude writes build-specific declarations into `.claude-plugin/types/` when loading a development mod with `--plugin-dir`. The installed declarations take precedence over online documentation; `/plugin-types` is no longer the generation command in 2.1.293.

## Packaging

```sh
npm run package
claude plugin validate plugins/pulsedeck
```

This refreshes the marketplace payload under `plugins/pulsedeck`. The catalog at the repository root is named `pulsedeck`. Release mode additionally requires audited native acceptance:

```sh
node scripts/vendor-cava.mjs --release
node scripts/build.mjs --release --package
```

The candidate can exercise live audio while the release gate remains closed. Never equate a successful candidate build, Demo rendering, or synthetic test with real capture acceptance. Current evidence is in `docs/VALIDATION.md`.

## Rebuild the audio helper

`scripts/build-cava.sh` uses the checked-in source archives, verifies their checksums, and builds static FFTW and iniparser for macOS 14.2+. Build prerequisites are Apple command-line tools, GNU autoconf/automake/libtool, pkg-config, and CMake. These are maintainer tools, not install-time dependencies.

The recipe changes the binary. Update its manifest checksum, capture toolchain/build evidence, then repeat native and clean-machine tests before declaring it audited. Static linking removes Homebrew loader paths; `otool -L`, minimum-OS inspection, and code-signature verification still need to pass.

## Developer-only Node capture

The standalone Node adapter is never imported by native hooks. To test the actual bundled output tap from Node:

```sh
node scripts/demo.mjs --audio --backend coreaudio --source tap --frames 20 --max-duration 3
```

Explicit developer overrides require an absolute executable and backend/output attestations. Plugin installation performs no downloads, package-manager calls, or PATH fallback.
