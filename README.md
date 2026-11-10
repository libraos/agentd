# agentd

<div align="center">

[Docs](https://libraos.com/docs/agentd/) · [Get an activation code](https://console.libraos.com/agentd) · [Releases](https://github.com/libraos/agentd/releases/latest) · [Report a problem](https://github.com/libraos/agentd/issues)

<br />

[![Latest release](https://img.shields.io/github/v/release/libraos/agentd?labelColor=333333&color=666666)](https://github.com/libraos/agentd/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/libraos/agentd/total?labelColor=333333&color=666666)](https://github.com/libraos/agentd/releases)
[![Last commit](https://img.shields.io/github/last-commit/libraos/agentd?labelColor=333333&color=666666)](https://github.com/libraos/agentd/commits/main)

</div>

agentd runs Claude Code and Codex as a team on your development machine. Describe the work, and workers build it in parallel, each in its own git worktree with a budget and a test command. You review every change before it reaches GitHub.

It works with the coding agents you already use and the logins you already have. Everything runs on your machine.

[![Measured on 2026-11-03: 8 screens in 3.8 min with agentd (4 Claude + 4 Codex workers) vs 9.5 min in one Claude session, 2.5x faster, 8 of 8 checked](docs/before-after.png)](https://libraos.com/docs/agentd/)

## What You Can Do

- Run several Claude Code and Codex workers at once from one terminal, without juggling sessions.
- Give each task a budget and a check. agentd runs the check itself and records the result.
- Read a result card for every task: check, changed files, minutes and dollars.
- Open a draft pull request only when you say so. Workers never push, and agentd never merges.
- Plan work in the dashboard's Chat, watch each worker live, and answer approvals from the Inbox.
- Let every agent session on the machine share one task ledger: who is working on what, handoffs and results.

## Installation

| Platform | Install |
| --- | --- |
| Linux, macOS | `curl -fsSL https://console.libraos.com/agentd/install.sh \| sh` |
| Windows | `irm https://console.libraos.com/agentd/install.ps1 \| iex` (PowerShell) |

The installer needs no login. It checks every file against the release's `SHA256SUMS`, then installs `agentd` and two Skills, `agentd` and `agentd-setup`. It changes no client configuration. To pin a version, set `AGENTD_VERSION` to its tag first. You can also download the binaries and both installers from the [latest release](https://github.com/libraos/agentd/releases/latest) and read the script before running it.

**Requirements:**

- Linux with systemd user services is the tested platform. On macOS, services are LaunchAgents, and the macOS build has not yet been tested on a Mac. Windows is new in v0.1.7: services are Task Scheduler tasks, and agentd needs [Git for Windows](https://git-scm.com/download/win) for its shell.
- git 2.25 or newer, with `user.name` and `user.email` set, because workers commit.
- Claude Code or Codex, installed and signed in. One is enough. On Linux, Codex workers also need `bwrap` (bubblewrap).
- Optional: `gh`, to sync pull requests and issues.

## Get Started

1. **Get an activation code.** Redeem your invite at [console.libraos.com/agentd](https://console.libraos.com/agentd) and copy the code.
2. **Set up your repository.** Start a Claude Code or Codex session in it and paste:

   > Set up AgentD for this repository. Connect my coding agents, initialize shared project knowledge, and help me run my first verified development task.

   The setup Skill runs the steps below and asks before it starts a paid worker. By hand:

   ```sh
   cd /path/to/your/repo
   agentd init      # asks for the activation code and EULA once, then sets up the ledger, services and your agents
   agentd doctor    # each failure prints the command that fixes it
   ```

   `init` connects every installed client, trusts the repository for Claude Code and adds you as its owner. It is safe to run again, and `--dry-run` shows what it would change. `agentd connect --repo-rule` optionally adds an untracked rule telling your sessions to send implementation work through agentd.

3. **Run a task:**

   ```sh
   agentd run "Add a test for the parser" --budget 30m --check "go test ./..."
   ```

   The worker commits on its own `agentd/…` branch and prints a result card. When you are happy with it, `agentd handoff pr ID` pushes the branch and opens a draft pull request. You can also ask for work in any connected Claude Code or Codex session.

## Dashboard

```sh
agentd dash --serve 127.0.0.1:21480
agentd dash link --user YOUR_NAME        # open the printed link to sign in
```

The dashboard has Inbox, Issues, Team, Chat and Insights. Chat needs a model on an OpenAI-compatible gateway, set under `[gateway]` in `config.toml`. To let Chat start workers, set `dispatch = true` under `[dash]`. Nothing starts until a person presses **Start** on the proposed task.

## Agents

- **Claude Code and Codex** connect as sessions and run as workers.
- **opencode** connects as a session, and runs as a worker once `[dispatch] opencode_model` names its model.

`agentd init` and `agentd connect` add the agentd MCP server, hooks and Skills to each installed client. They back up every file they change, and `agentd uninstall` and the steps below undo them.

## Models and Billing

agentd brings no model access of its own. Each worker uses its client's own Claude or ChatGPT login or API key, billed by that provider.

Or use one [LibraOS](https://console.libraos.com) model API key for both clients and the dashboard's Chat, billed in LibraOS credits or a Token Plan. Save the key alone in a file only you can read, then let `init` write the settings:

```sh
agentd init --model-key ~/.config/agentd/libraos.key
```

`agentd doctor` reports the gateway each worker uses. See [Models and billing](https://libraos.com/docs/agentd-models/) for details.

## Privacy

agentd is local-first. Your ledger, transcripts and worker output stay on your machine. Code and prompts go only to the model provider you choose: your coding agents' own, or LibraOS if you use a LibraOS model key. `agentd feedback` sends only the text you give it.

With reporting on, the default in the beta, agentd registers the machine once and sends a daily report: install id, version, platform, and counts of tasks, workers, sessions and users. It never sends code, prompts, paths, repository names or emails. To turn it off:

```sh
DO_NOT_TRACK=1    # or: agentd config set telemetry.enabled false
```

## For Advanced Users

### Search and Memory with a LibraOS Runtime

Everything above works with the agentd binary alone. A LibraOS Runtime on your machine turns the ledger into knowledge your agents can query:

- **Search past work.** `agentd search` finds earlier handoffs, runs and results, with citations, so a new session looks up what happened instead of rereading logs.
- **Ask in plain language.** `agentd ask "which tasks failed and why?"` answers from the ledger and cites the records it used.
- **Daily reports.** A model writes a short status of the day's work.
- **Copilots for workers.** A dispatched worker can consult reviewer, tester or security agents that run on the Runtime.

It needs Docker and a model key. `agentd runtime up` runs it in Docker on `127.0.0.1:8900` only:

```sh
agentd runtime up --model anthropic/claude-sonnet-5
agentd search "parser"
agentd ask "which tasks failed and why?"
```

`agentd runtime down` stops it and keeps the data. See [Add a Runtime](https://libraos.com/docs/agentd-runtime/).

### Cloud Workers (beta)

A Cloud Worker runs one task on LibraOS infrastructure instead of your machine. Use one when your machine is busy or off. Keep a local worker when the task must reach services, files or hardware on your machine.

- Each job runs in its own isolated virtual machine, with repository and model access for that job only, revoked when it ends.
- The worker pushes an `agentd/…` branch to your repository. Nothing is merged; you review it as usual.
- A job holds its dollar budget from your Console credits and is charged for what it uses: US$0.04 per active minute plus model use at list price.

```sh
agentd handoff offer --cloud --budget '$10' --goal 'Fix the failing checkout test' --project OWNER/REPO
```

It needs beta access, a cloud key from the Console and the LibraOS GitHub App on the repository. See [Cloud Workers](https://libraos.com/docs/cloud-workers/).

## Upgrade and Uninstall

**Upgrade:** run the installer again, then restart the notifier (`systemctl --user restart agentd-notify.service` on Linux). Replacing the binary does not restart what runs the old one.

**Uninstall:** on macOS and Windows, `agentd uninstall` removes the services. On Linux, disable and delete the `agentd-*` units in `~/.config/systemd/user`. Then remove the `agentd` MCP server and hooks from `~/.claude.json`, `~/.claude/settings.json` and `~/.codex/config.toml`, and delete the binary, the two Skills and the data directory, which holds your ledger (`~/.local/share/agentd` on Linux and macOS). If you started a Runtime, `agentd runtime down` stops it; see [Uninstall](https://libraos.com/docs/agentd/#uninstall) to remove its containers and data.

## Report a Problem

[Open an issue](https://github.com/libraos/agentd/issues) with what you ran, what you expected and the output of `agentd doctor`. Never paste keys or tokens.

## License

agentd is licensed under the LibraOS End User Agreement ([EULA.md](EULA.md)), which you accept when you activate it with `agentd init`. See [LICENSE](LICENSE). The dashboard front end in [ui/](ui/) is source-available under the Elastic License 2.0. The agentd source is private.
