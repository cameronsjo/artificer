# Artificer · Stylus UserCSS

`.user.css` files for sites Artificer doesn't own — restyled client-side via
the [Stylus](https://github.com/openstyles/stylus) browser extension, rather
than a config file this repo can place. Background and format research:
`docs/research/theming/stylus-usercss.md`.

| File | Target | Modes |
| --- | --- | --- |
| `vikunja.user.css` | `vikunja.example.com` (Vikunja) | Both — follows Vikunja's own `.dark` user setting |

## Install (paste — no auto-update yet)

1. Install the [Stylus extension](https://add0n.com/stylus.html) (Chrome, Edge, Brave, Vivaldi, Opera, Firefox).
2. Open the extension's dashboard → **Write new style** → **Import**.
3. Paste the contents of `vikunja.user.css`, save.
4. Reload the target site (`vikunja.example.com`).

This is Category-3 (paste) distribution: it works immediately but does **not**
auto-update. A palette change means re-pasting the regenerated file.

## Safari

Stylus itself has no Safari build. [Cascadea](https://apps.apple.com/us/app/cascadea/id1432182561)
consumes the UserCSS format directly (including `@var` and `@-moz-document`),
so the same file imports there unmodified — it is a note, not a supported
install path this repo tests.

## Auto-update — deferred

`@updateURL` is intentionally omitted. Stylus polls that URL for a newer
`@version` and only trusts a response served as `text/css` — GitHub's raw
file host serves `text/plain` and Firefox in particular refuses to treat that
as an update source (see the Gotchas in `docs/research/theming/stylus-usercss.md`).
Wiring up auto-update means self-hosting the generated file behind a server
that sets the right `Content-Type`, which doesn't exist yet for this repo.
Until then: paste-install, and re-paste after a palette change.

## Regenerating

```bash
node themes/build.mjs          # regenerates themes/stylus/vikunja.user.css
node scripts/validate-usercss.mjs   # parses every themes/stylus/*.user.css header
```

Both source from `themes/_palette.json` — never hand-edit the generated
`.user.css` file.
