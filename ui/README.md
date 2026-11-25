# LibraOS Engine dash

The LibraOS Engine dashboard front end: `dash.html`, one HTML document with no build step
and no dependencies. The one third-party file is the terminal widget, xterm.js 6.0.0
(MIT), vendored unmodified in `vendor/` (`xterm.js`, `xterm.css`) and served by the
binary at `/vendor/` only while `[dash] terminal` is on; its licence is in the
repository's THIRD_PARTY_NOTICES. Nothing is loaded from a CDN. The LibraOS Engine binary embeds a pinned copy of this directory
and serves it on the dash port; every number on the page comes from the binary's
`/api` routes, so the page does nothing on its own.

## Changing it

Edit `dash.html`, then run the page tests:

```sh
npm install        # jsdom only
npm test
```

Every time the page shows goes through one formatter (`region:time`: `fmtTime`, `timeEl`,
`utcTitle`): the viewer's own zone, a short zone label where a time stands alone, and the UTC
value only in the tooltip. Every day or week request carries the viewer's zone (`withTz`), and a
figure names the zone the server answered with (`answerZone`, UTC from a server that sends none).
`testdata/dash_timezone.cjs` checks this under `TZ=Asia/Shanghai` and `TZ=America/New_York`.

The product's name and the CLI program's name each come from one constant at the top of
the page script (`region:brand`: `PRODUCT`, `CLI`); every page text and shown command is built
from them, so renaming either is a one-line change. `testdata/dash_brand.cjs` checks this.

In the personal app a terminal command is not the main text (`region:cli-same`): it sits behind
a "Same in a terminal" disclosure (`cliSame`) or a copy icon whose tooltip names it (`cliCopy`,
`cliAt`). Settings > Terminal commands shows them inline again, kept per viewer in this
browser's localStorage. `testdata/dash_appcli.cjs` checks this.

Each test also runs alone, on `dash.html` beside `testdata/`: `node testdata/dash_home.cjs`.

`testdata/` holds the tests: `dash_ui`, `dash_openpr` and `dash_chat` read the
document, `dash_dom`, `dash_voice`, `dash_changes`, `dash_checks`, `dash_terminal` and the rest run it in jsdom on desktop and phone,
light and dark. A change to the page lands in a release when LibraOS Engine moves its pin
to the new commit.

## License

Elastic License 2.0, in [LICENSE](LICENSE). You may use and change this front end
inside your own organization. You may not redistribute it, offer it to others as a
managed service, or circumvent LibraOS Core activation. The LibraOS Core binaries themselves
are licensed under the End User Agreement in the repository root.
