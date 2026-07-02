# gurjas.org — website v3

This folder IS the complete website. Every file needed is here: 13 pages, styles, scripts, images, favicon, sitemap, robots.txt, manifest and CNAME. Nothing else is required.

## How to publish (no technical steps, ~5 minutes)

1. Open your website repository on **github.com** in your browser and sign in.
2. Click **Add file → Upload files**.
3. On your computer, open the `gurjas_website_v3` folder, select **everything inside it** (Cmd+A), and drag it all into the GitHub upload box. Folders like `about/` and `assets/` come along automatically.
4. In the commit message box type: `Rebuild as multi-page institute site (v3)` and click **Commit changes**.
5. Wait 2–3 minutes, then open https://gurjas.org — the new site is live. Old files with the same names are replaced automatically; nothing needs deleting first.
6. Then follow `SEARCH_CONSOLE_ACTIONS.md` (in the folder above this one) to get the new pages into Google.

## Checking it worked
Visit https://gurjas.org/about/ and https://gurjas.org/publications/ — both should show the navy-and-gold design.

## Previewing on your computer
Double-click any `index.html` — the design and styling now display correctly offline. (Page-to-page links only work fully on the live site.)

## Editing later
Page text lives in `../website_src/content/`; titles and descriptions in `../website_src/build.py`. Ask Claude (or run `python3 build.py`) to regenerate after any edit — don't edit the page files here directly, they get overwritten by the generator.
