#!/usr/bin/env bash
# HealOS Agent Skills CLI Bootstrap
# Discover and interact with HealOS healthcare agent endpoints

set -euo pipefail

BASE_URL="https://healos-theta.vercel.app"

echo "=== HealOS Agent Skills CLI ==="
echo "Manifest: ${BASE_URL}/.well-known/ard.json"
echo "OpenAPI:  ${BASE_URL}/openapi.json"
echo "MCP:      ${BASE_URL}/.well-known/mcp"
echo "Agents:   ${BASE_URL}/agents.md"
echo "==============================="
