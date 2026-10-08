# Bundled CAVA runtime

The first release target is `darwin-arm64`, macOS 14.2+. The candidate contains CAVA 1.0.0 from commit `15f89867908fa66baaaec8d4b9a2d684a329a0fb`, statically linked FFTW 3.3.11 and iniparser 4.3.2. CoreAudio process-tap support is compiled in. Unused PortAudio, ncurses, SDL, and Linux input backends are disabled.

The executable has an ad-hoc code signature and links only `/usr/lib` and `/System/Library` runtime dependencies. Its Mach-O minimum OS is 14.2. Private runtime libraries are therefore an empty list, supported by actual `otool -L` inspection. This does not replace real capture or clean-machine acceptance.

`vendor/cava/manifest.json` pins the executable checksum, upstream commit, supported backend, source materials, and notices. `vendor/cava/sources` includes the complete corresponding source archives, checksum inventory, and build recipe. `vendor/cava/provenance` retains actual build logs. FFTW's GPL-2.0-or-later terms are compatible with PulseDeck's GPL-3.0-or-later distribution; dependency license texts accompany the binary.

Normal installation copies a complete runtime. It never builds, downloads, or installs system packages. Runtime verification checks the bundled checksums before launching capture. Unsupported targets receive a clear error and can explicitly choose Demo.

The manifest remains unaudited until real system-output capture, lifecycle/resource measurements, and clean-install checks pass. The release builder also rejects pending native acceptance. Intel Mac and Linux targets are not release requirements for v0.1.0.
