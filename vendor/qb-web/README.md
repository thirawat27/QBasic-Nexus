# qb-web (vendored from QBNex)

These files come from the QBNex project (`crates/web`) and run QBNex programs
inside the **Retro CRT** panel and the interactive tutorial:

| File | What it is |
|---|---|
| `qb_web.wasm` | The QBNex VM (`qb-exec`) built for `wasm32-unknown-unknown` (`cargo build -p qb-web --release --target wasm32-unknown-unknown`). |
| `qbnex.js` | The JavaScript loader for `qb_web.wasm` (`crates/web/www/qbnex.js`), unchanged. |
| `LICENSE` | The GNU General Public License, version 3, that covers both files. |

Built from QBNex 2.0.0-preview, commit `dd7829e`.

Unlike the rest of QBasic Nexus (MIT), the files in this folder are licensed
under the GPL-3.0-or-later. The source is at <https://github.com/thirawat27/QBNex>.

Refresh them from a QBNex checkout with:

```
node scripts/sync-qb-web.js <path-to-QBNex-checkout> [path-to-qb_web.wasm]
```
