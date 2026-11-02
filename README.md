# agentd

agentd is a local server for several coding agents on one host: a run ledger, sessions, claims, messages and handoffs, so Claude Code and Codex can pass work to each other and verify it. It runs on your machine. Your agents talk to their model providers under your own account.

This repository holds releases only: static binaries, the installer, the Setup Skill and their checksums. The source is private.

## Install

You need curl and no GitHub login. Linux with systemd user services is tested; the macOS binaries are built and untested.

```sh
d="$(mktemp -d)" && curl -fsSL -o "$d/install.sh" https://github.com/libraos/agentd/releases/latest/download/install.sh && sh "$d/install.sh"
```

Then start a new Claude Code or Codex session in your repository and paste:

> Set up AgentD for this repository. Connect my coding agents, initialize shared project knowledge, and help me run my first verified development task.

The Setup Skill runs `agentd init`, `connect` and `doctor`, and asks before `agentd run` starts a paid worker.

## Bring your own credentials

agentd brings no model access. Each person uses their own Claude or Codex login or API key, billed to them, and one of the two is enough. `agentd doctor` reports what is missing.

## Report a problem

Open an issue here with what you ran, what you expected and the output of `agentd doctor`. Never paste keys or tokens.

## License

Free to use, not for resale. See [LICENSE](LICENSE).
