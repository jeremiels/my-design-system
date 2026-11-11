#!/usr/bin/env bash
# Downloads a stock Firefox ESR (Linux x86_64) for `npm run test:legacy` and
# prints the path of its binary on the last line of stdout.
#
# Playwright only drives its own patched Firefox, so testing the oldest
# supported Firefox (see package.json "browserslist" and
# src/docs/architecture/browser-support.mdx) needs a real Mozilla build. It is
# checksum-verified against Mozilla's SHA256SUMS and installed outside the
# repo, in ~/.cache/firefox-esr/<version>. Re-running is a no-op.
#
#   FIREFOX_ESR_VERSION=115.45.0esr scripts/install-firefox-esr.sh
set -euo pipefail

version="${FIREFOX_ESR_VERSION:-115.45.0esr}"
base="https://archive.mozilla.org/pub/firefox/releases/${version}"
file="linux-x86_64/en-US/firefox-${version}.tar.bz2"
dest="${XDG_CACHE_HOME:-$HOME/.cache}/firefox-esr/${version}"
binary="${dest}/firefox/firefox"

if [[ -x "$binary" ]]; then
  echo "$binary"
  exit 0
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Downloading Firefox ${version}…" >&2
curl -fsSL "${base}/${file}" -o "${tmp}/firefox.tar.bz2"

expected="$(curl -fsSL "${base}/SHA256SUMS" | awk -v f="$file" '$2 == f { print $1 }')"
actual="$(sha256sum "${tmp}/firefox.tar.bz2" | awk '{ print $1 }')"
if [[ -z "$expected" || "$expected" != "$actual" ]]; then
  echo "Checksum mismatch for ${file} (expected '${expected}', got '${actual}')" >&2
  exit 1
fi

mkdir -p "$dest"
tar -xjf "${tmp}/firefox.tar.bz2" -C "$dest"
echo "$binary"
