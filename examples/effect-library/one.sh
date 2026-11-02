#!/usr/bin/env bash
# One-command render of a single effect (2.5s clip): examples/effect-library/one.sh k_slam  -> out/test/test.mp4
set -e;cd "$(dirname "$0")";python3 gen.py "$@";../../engine/make.sh . --test 2.5
