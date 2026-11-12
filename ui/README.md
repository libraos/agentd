# agentd dash

The agentd dashboard front end: `dash.html`, one HTML document with no build step
and no dependencies. The one third-party file is the terminal widget, xterm.js 6.0.0
(MIT), vendored unmodified in `vendor/` (`xterm.js`, `xterm.css`) and served by the
binary at `/vendor/` only while `[dash] terminal` is on; its licence is in the
repository's THIRD_PARTY_NOTICES. Nothing is loaded from a CDN. The agentd binary embeds a pinned copy of this directory
and serves it on the dash port; every number on the page comes from the binary's
`/api` routes, so the page does nothing on its own.

## Changing it

Edit `dash.html`, then run the page tests:

```sh
npm install        # jsdom only
npm test
```

`testdata/` holds the tests: `dash_ui`, `dash_openpr` and `dash_chat` read the
document, `dash_dom`, `dash_voice`, `dash_changes`, `dash_checks`, `dash_terminal` and the rest run it in jsdom on desktop and phone,
light and dark. A change to the page lands in a release when agentd moves its pin
to the new commit.

## License

Elastic License 2.0, in [LICENSE](LICENSE). You may use and change this front end
inside your own organization. You may not redistribute it, offer it to others as a
managed service, or circumvent agentd activation. The agentd binaries themselves
are licensed under the End User Agreement in the repository root.
