# Verified CAVA build inputs

Primary source checked: https://github.com/karlstav/cava/blob/1.0.0/configure.ac (blob0db4da122bc1a107b96e844cd29fb9e0585b8408). This is source research, not a completed build or commit pin.

CAVA1.0.0 requires FFTW3 and iniparser libraries. pthread and math are required. Audio backend detection can silently omit a backend when headers/libs are unavailable, so a successful compiler exit alone is insufficient. Assert the intended backend is actually compiled and tested.

For a lean raw-output build, verified configure switches include --disable-output-sdl, --disable-output-ncurses, --disable-cava-font, --disable-input-alsa, --disable-input-portaudio, --disable-input-jack, --disable-input-sndio and --disable-input-oss. Linux needs the chosen PipeWire/Pulse backend and their runtime closure; macOS needs CoreAudio and CoreAudio tap headers/Objective-C support (macOS14.2+). Tap detection can also silently disable itself.

Release builders must capture dependency versions, upstream immutable commit/archive checksum, backend test evidence, actual ldd/otool dependency closure, private loader paths, executable permissions, SHA256, notices and required source materials. This checkout has no actual audited CAVA payload; do not turn a tag, fixture or planned CI job into a verified release result.
