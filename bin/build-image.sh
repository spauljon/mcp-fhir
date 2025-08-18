#!/usr/bin/env bash

set -x

base_dir=$( cd "$(dirname "$0")/.." >/dev/null 2>&1 || exit ; pwd -P )

docker build --progress plain -t local/mcp-fhir:0.1 -f ${base_dir}/Dockerfile .
