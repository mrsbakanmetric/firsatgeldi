# design/

Approved screen designs, one folder per screen. Each folder holds the **exported HTML of the screen's claude.ai design canvas** (`NN-<slug>/<canvas>.html`) [DECIDED 2026-11-13]. PNG images (`NN-<slug>/png/<board>-light.png`, `<board>-dark.png`) are optional.

**How designs reach this folder:** the canvases are edited only in claude.ai. When the user says a design changed ("tasarım güncellendi, GitHub'a gönder"), the design side (claude.ai) exports the current canvas HTML and opens a `design-change` pull request with it and a new design version + change note in `docs/screen_status.md`. The user merges; Claude Code reads the diff and implements only the difference. There is no automatic sync between claude.ai and GitHub.

**How to use the HTML:** it is a design reference, not production code. Build screens from `docs/design-tokens.json` and the canonical components (`docs/pagedesign.md` §5); never copy its markup, styles or values into `apps/` or `packages/`. Where the HTML and the docs disagree, ask (the docs and the user decide).

Folders: 00-iskelet · 01-ara-ve-ekle · 02-urun-detayi · 03-ana-sayfa · 04-takip-ettiklerim · 05-bildirimler · 06-kazancim · 07-paketim · 08-giris · 09-ayarlar · 10-tanitim · 11-yasal-yardim · 12a … 12e-yonetim · 13-kesfet-profil
