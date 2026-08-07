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

git diff --check
yarn install --immutable
yarn build
yarn lint
yarn test:unit --runInBand
yarn test:routes --runInBand
yarn test:a11y
