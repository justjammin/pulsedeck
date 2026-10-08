#!/bin/sh
# Build-only recipe. Plugin installation never invokes this script.
set -eu
task_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
task_build=$(mktemp -d /tmp/pulsedeck-build.XXXXXXXX)
trap 'rm -rf "$task_build"' EXIT HUP INT TERM
task_prefix="$task_build/prefix"
mkdir -p "$task_build/cava" "$task_build/fftw" "$task_build/iniparser" "$task_prefix"
cd "$task_root/vendor/cava/sources"
shasum -a 256 -c SHA256SUMS
tar -xzf cava-15f89867908fa66baaaec8d4b9a2d684a329a0fb.tar.gz --strip-components=1 -C "$task_build/cava"
tar -xzf fftw-3.3.11.tar.gz --strip-components=1 -C "$task_build/fftw"
tar -xjf iniparser-4.3.2.tar.bz2 --strip-components=1 -C "$task_build/iniparser"
cd "$task_build/fftw"
CFLAGS='-O2 -mmacosx-version-min=14.2' ./configure --prefix="$task_prefix" --disable-shared --enable-static --disable-fortran
make -j4
make install
cd "$task_build/iniparser"
cmake -S . -B build -DCMAKE_OSX_DEPLOYMENT_TARGET=14.2 -DCMAKE_INSTALL_PREFIX="$task_prefix" -DBUILD_SHARED_LIBS=OFF
cmake --build build -j4
cmake --install build
cd "$task_build/cava"
if ! command -v libtoolize >/dev/null 2>&1; then
  # Homebrew prefixes GNU libtool to avoid Apple's unrelated libtool.
  sed -i '' 's/libtoolize/glibtoolize/' autogen.sh
fi
./autogen.sh
PKG_CONFIG_PATH="$task_prefix/lib/pkgconfig" CPPFLAGS="-I$task_prefix/include -I$task_prefix/include/iniparser" LDFLAGS="-L$task_prefix/lib -mmacosx-version-min=14.2" CFLAGS='-O2 -mmacosx-version-min=14.2' OBJCFLAGS='-O2 -mmacosx-version-min=14.2' ./configure --disable-output-sdl --disable-output-ncurses --disable-cava-font --disable-input-alsa --disable-input-portaudio --disable-input-jack --disable-input-sndio --disable-input-oss
make -j4
otool -L cava
if otool -L cava | tail -n +2 | awk '{print $1}' | grep -vE '^(/usr/lib/|/System/Library/)' ; then
  echo 'Unexpected non-system dynamic dependency' >&2
  exit 1
fi
cp -f cava "$task_root/vendor/cava/darwin-arm64/cava"
chmod 755 "$task_root/vendor/cava/darwin-arm64/cava"
codesign --force --sign - "$task_root/vendor/cava/darwin-arm64/cava"
codesign --verify --strict "$task_root/vendor/cava/darwin-arm64/cava"
shasum -a 256 "$task_root/vendor/cava/darwin-arm64/cava"
echo 'Update the manifest checksum and rerun native acceptance after rebuilding.'
