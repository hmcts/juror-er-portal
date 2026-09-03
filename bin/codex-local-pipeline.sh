#!/usr/bin/env bash

set -euo pipefail

mode="${1:-fast}"
if [[ $# -gt 0 ]]; then
  shift
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      [[ $# -ge 2 ]] || { echo "--base requires a value" >&2; exit 2; }
      shift 2
      ;;
    --no-fetch)
      shift
      ;;
    *)
      echo "Unsupported argument: $1" >&2
      exit 2
      ;;
  esac
done

case "${mode}" in
  checks-only|fast|full) ;;
  *)
    echo "Unsupported verification mode: ${mode}" >&2
    exit 2
    ;;
esac

browser_diagnostics_dir="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/codex-browser-diagnostics"
export PUPPETEER_CACHE_DIR="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/puppeteer-cache"
mkdir -p "${browser_diagnostics_dir}" "${PUPPETEER_CACHE_DIR}"

git diff --check
yarn install --immutable
./node_modules/.bin/puppeteer browsers install chrome
./node_modules/.bin/puppeteer browsers install chrome-headless-shell
yarn build
yarn lint
yarn test:unit --runInBand
yarn test:routes --runInBand

browser_path="$({
  node <<'NODE'
const puppeteer = require('puppeteer');
const version = require('puppeteer/package.json').version;

console.error(`Puppeteer version: ${version}`);
console.log(puppeteer.executablePath());
NODE
} 2> >(tee "${browser_diagnostics_dir}/puppeteer-version.log" >&2))"

echo "Chrome executable: ${browser_path}"
"${browser_path}" --version 2>&1 | tee "${browser_diagnostics_dir}/chrome-version.log"
if command -v ldd >/dev/null 2>&1; then
  ldd "${browser_path}" >"${browser_diagnostics_dir}/chrome-libraries.log" 2>&1 || true
  cat "${browser_diagnostics_dir}/chrome-libraries.log"
  if grep -Fq 'not found' "${browser_diagnostics_dir}/chrome-libraries.log"; then
    echo "Chrome has missing shared-library dependencies." >&2
    exit 1
  fi
fi

set +e
"${browser_path}" \
  --headless=new \
  --no-sandbox \
  --disable-setuid-sandbox \
  --disable-dev-shm-usage \
  --dump-dom about:blank \
  >"${browser_diagnostics_dir}/chrome-preflight.stdout.log" \
  2>"${browser_diagnostics_dir}/chrome-preflight.stderr.log"
browser_status=$?
set -e
cat "${browser_diagnostics_dir}/chrome-preflight.stdout.log"
cat "${browser_diagnostics_dir}/chrome-preflight.stderr.log" >&2
if [[ "${browser_status}" -ne 0 ]]; then
  echo "Chrome preflight failed with exit code ${browser_status}." >&2
  exit "${browser_status}"
fi

yarn test:a11y
