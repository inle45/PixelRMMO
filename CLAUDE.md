# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

PixelRMMO is a brand-new repository — it currently contains only this file and `README.md` (title only, no further content). There is no source code, build system, package manifest, or test suite yet. There are no commands to build, lint, or test because nothing has been set up.

When the first real code is added to this repo, update this file with:
- The actual build/lint/test commands (and how to run a single test)
- The high-level architecture once there's more than one file to explain

## Intent

The repo name and the `claude/pixellab-mcp-integration-vajrla` branch indicate this project is meant to become a pixel-art-based MMO ("PixelRMMO") that integrates with the [PixelLab](https://www.pixellab.ai) API (AI-generated pixel art / sprites) via MCP. A PixelLab MCP server has been registered locally (`claude mcp add pixellab https://api.pixellab.ai/mcp -t http`) for use during development, but this is session/environment configuration — it is not part of the repo itself.
