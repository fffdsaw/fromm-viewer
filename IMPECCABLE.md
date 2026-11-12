# Impeccable for Codex (project scope)

This is tooling for design reviews, not a change to Fromm Viewer. No audit, critique,
init, automatic fix, application edit, or deployment was performed during installation.

## Official source and installation

- Upstream: https://github.com/pbakaus/impeccable (Apache-2.0).
- Official instructions: https://github.com/pbakaus/impeccable#installation
- CLI/skill version installed: **4.8.0**; engine: **0.1.18**.
- Reviewed upstream main: `02523aec3e4c4580102d996d1b6a71fbe062e03f`.
- Verified on Linux x86_64, Node.js 24.19.0, npm 11.9.0, Codex CLI 0.163.0.
  npm package requires Node.js >=18.19.0. The installed engine itself does not need Node.

From the repository root, the official installer was run with an explicit version:

```sh
npx --yes impeccable@4.8.0 install --providers=codex --scope=project --no-hooks
```

`--yes` here belongs to npx (package execution confirmation), not Impeccable's
installer. The initial install used `--no-hooks`; hooks were subsequently enabled on the
user's explicit request using the official `hooks on` command below. The
installer's non-interactive default otherwise installs hooks; do not treat that
as the user's approval to run a hook.

The installer writes `.agents/skills/impeccable/`: skill instructions, reference
playbooks, Codex agent definitions, POSIX/Windows launchers, engine version and
checksums, and supporting scripts/data. These files are kept as installed; the
upstream LICENSE is included for redistribution. Project binaries under
`scripts/bin/` are ignored. A fresh checkout uses the official launcher to fetch
its platform's engine into the user cache, normally `~/.impeccable/bin/0.1.18/`.
The launcher checks the bundled SHA-256 manifest before using downloaded bytes.
This cache is not a global skill installation. First use needs network access,
cache write access and platform-supported prerequisites. Windows/macOS were not
executed in this installation check.

`.gitignore` also includes upstream's recommended temporary-output exclusions.
Shared future `.impeccable/config.json`, design/context files, surface briefs and
critique reports can still be committed. No project design preferences have been
invented or initialized.

## Using the skill

After checking out this branch (or after this PR is merged), restart/reload Codex
with this repository open. Use `/skills` to confirm **impeccable** is discovered.
In the Codex conversation, not the shell:

```text
$impeccable audit Replay·Channel 플레이어. 접근성·반응형·테마를 점검하고 보고서만 작성해 줘. 코드와 디자인은 수정하지 마.
$impeccable critique 현재 UI. 기존 디자인을 기준으로 문제와 우선순위만 보고하고 자동 수정하지 마.
```

Optional later setup: `$impeccable init` creates design context. Run it only when
ready to make those project decisions; it is not necessary to confirm installation.
Audit and critique use actual project/rendered evidence and can generate reports;
installation alone does not mean the UI was reviewed. This existing Codex session
may need restarting before newly installed skills appear in its skill catalog.

Smoke check from a POSIX shell:

```sh
.agents/skills/impeccable/scripts/impeccable engine-probe
```

Windows without `sh` uses `scripts/impeccable.cmd` instead. Native/browser checks
on the user's Windows Codex installation remain unverified.

## Hooks: enabled; Codex runtime approval remains separate

Official documentation: https://impeccable.style/docs/hooks

After the user explicitly requested automatic checks, the installed official engine ran:

```sh
.agents/skills/impeccable/scripts/impeccable hooks on
```

This generated `.codex/hooks.json` and `.impeccable/config.json` (`hook.enabled: true`).
The hook checks edited UI files on `PostToolUse` and runs a completion review on
`Stop`. The official commands include POSIX and Windows launchers. Default limits
remain 5 findings / 8000 characters, with 5-second edit and 30-second Stop timeouts.
No application file was edited to trigger a hook.

The command also recorded this user's installation consent in the gitignored
`.impeccable/config.local.json`. That private consent file is not shared or committed.
Installation consent does not approve the hook inside Codex.

Reload Codex with this branch checked out, open `/hooks`, review the project hook,
and approve it once. Official docs require reapproval after updates that change
the hook. No runtime approval/trust files were edited, and no hook was manually
invoked to bypass this requirement. If the current Codex client does not expose
`/hooks` or refuses project hooks, automatic execution is not confirmed; use a
supported client and its approval flow. End-to-end approved execution remains
unverified in this managed session.

Hooks run the engine with the agent's environment and network access; do not
assume they run in a separate sandbox. To disable later, use `$impeccable hooks off`.

## Installation verification

- Installed engine probe and official SHA-256 match: passed.
- Fresh-checkout fixture without the platform binary: official launcher fetched
  engine 0.1.18 into an empty isolated cache; probe and checksum passed.
- Installed JSON/TOML, JavaScript and POSIX launcher syntax checks: passed.
- Initial no-hooks install scope check: passed. Subsequent user-authorized hook
  enablement: official status reports enabled; generated manifests/config parse,
  launcher paths resolve, local consent stays ignored; runtime approval untouched.
- Project-authored documentation/ignore-file whitespace check: passed. Upstream
  reference whitespace and Windows launcher CRLF are preserved verbatim rather
  than rewriting third-party files to satisfy a whole-diff whitespace check.
- Existing app/Native/extension/workflow files are unchanged; application
  regression tests were not rerun for this tooling-only installation.
