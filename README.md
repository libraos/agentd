# agentd

agentd is a local server for several coding agents on one host: a run ledger, sessions, claims, messages and handoffs, so Claude Code and Codex can pass work to each other and verify it. It runs on your machine and sends nothing out.

This repository holds releases only: static binaries, the installer, the Setup Skill and their checksums. It is a closed beta; access is by invitation.

## Install

You need read access to this repository and `gh auth login`. Linux with systemd user services is tested; the macOS binaries are built and untested.

```sh
export AGENTD_VERSION=v0.1.0-rc2   # a prerelease; the installer takes the latest full release otherwise
d="$(mktemp -d)" && gh release download "$AGENTD_VERSION" --repo libraos/agentd --pattern install.sh --dir "$d" && sh "$d/install.sh"
```

Then start a new Claude Code or Codex session in your repository and paste:

> Set up AgentD for this repository. Connect my coding agents, initialize shared project knowledge, and help me run my first verified development task.

The Setup Skill runs `agentd init`, `connect` and `doctor`, and asks before `agentd run` starts a paid worker.

## Report a problem

Open an issue here with what you ran, what you expected and the output of `agentd doctor`. Never paste keys or tokens.
