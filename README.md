# glassscope-immercom

Static project page for **GlassScope: An Open-Source Measurement Layer for AI-Glass Live Streaming**
(ImmerCom ’26). Research code and evaluation logs live in
[raoafariak-sys/GlassScope](https://github.com/raoafariak-sys/GlassScope); this repository holds only the website,
intended for <https://glassscope-immercom.github.io>.

The page is plain HTML, CSS, and a small script. There is no build step. Node is used only for the
optional browser tests.

## Preview locally

```bash
cd Glassscope_ImmerCom
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Use a local server rather than opening `index.html` from disk:
browsers block the self-hosted fonts over `file://`, so the page would fall back to system fonts and log
CORS errors.

To preview the page under a GitHub Pages project subpath (`/Glassscope_ImmerCom/`), which catches any
asset path that would only work at the site root:

```bash
node tests/serve.js
# http://127.0.0.1:4173/Glassscope_ImmerCom/
```

## Run the checks

```bash
npm install
npx playwright install chromium
npm test
```

The tests serve the site under `/Glassscope_ImmerCom/` and check that:

- the page loads with no console errors, warnings, or failed requests, and every local asset resolves;
- the title, authors, affiliations, and resource links match the paper;
- the results tables match Table 3 and no first-frame numbers appear;
- the pipeline works with mouse, keyboard (arrow keys, Home, End), and touch, and stays readable without JavaScript;
- the diagram's lane markers line up with the stage buttons;
- the BibTeX copy button fills the clipboard and announces it;
- there is no horizontal overflow at 375, 768, and 1440 px (screenshots land in `test-results/screens/`).

## Publish on GitHub Pages

The page uses only relative asset paths, so it works both at a site root and under a project subpath.
`.nojekyll` turns off Jekyll processing.

**Current home.** The source lives in
[raoafariak-sys/Glassscope_ImmerCom](https://github.com/raoafariak-sys/Glassscope_ImmerCom), published from
`main` / root at <https://raoafariak-sys.github.io/Glassscope_ImmerCom/>.

**Intended home: <https://glassscope-immercom.github.io>.** GitHub serves an organization site from a
repository named `<organization>.github.io`. To move there:

1. Create the organization `glassscope-immercom` (free plan) at <https://github.com/account/organizations/new>.
2. In this repository, open **Settings → General → Danger Zone → Transfer ownership** and transfer it to
   `glassscope-immercom`.
3. Rename the transferred repository to `glassscope-immercom.github.io` (**Settings → General**).
4. Open **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save.

The site then appears at <https://glassscope-immercom.github.io>. GitHub redirects the old repository URL
after a transfer. The canonical link and social-preview tags in `index.html` already point to the
organization URL.

The research code stays in its own repository,
[raoafariak-sys/GlassScope](https://github.com/raoafariak-sys/GlassScope), linked from the Code button.

## Editing content

| What | Where |
|---|---|
| Text, numbers, links, BibTeX | `index.html` |
| Styles | `static/css/index.css` (layered on `static/css/bulma.min.css`) |
| Pipeline selector and copy button | `static/js/index.js` |
| Figure 2 | `static/images/glassscope-architecture*.{webp,png}` |

**Results.** Every number comes from Table 3 of the paper. The charts are static SVG. If a value changes,
update the bar and error-bar coordinates too: the plot spans `x = 56` to `x = 292`, so a value maps to
`x = 56 + 236 × value / axis_max`, where `axis_max` is 6000 ms for latency and 30 sessions for freezes.

**Figure 2** was rendered from page 5 of the paper:

```bash
pdftoppm -r 288 -f 5 -l 5 -x 211 -y 330 -W 2028 -H 786 -png immercom26-final59.pdf fig2
```

then resized to 1920 px and 960 px wide and saved as WebP and PNG.

## Before you publish

- The DOI (`10.1145/3842656.3843829`) returned 404 on 2026-10-08, so the page has no Paper button yet and
  shows the DOI as plain text with a note. Once <https://doi.org/10.1145/3842656.3843829> resolves:
  - uncomment the Paper button at the top of `index.html` (it already links to the DOI), and
  - replace the `gs-doi` paragraph with
    `<p class="gs-doi">DOI: <a href="https://doi.org/10.1145/3842656.3843829">10.1145/3842656.3843829</a></p>`.
  Then update the header-links check in `tests/site.spec.js` to expect the Paper button.
- The page names the player-side loggers `bypass_viewer.py` and `bypass_viewer_hls.py` (from the paper).
  They were not in the research repository as of 2026-10-08.
- Resource links point to the `main` branch of `raoafariak-sys/GlassScope`.

## Credits and licenses

- **Website source:** [CC BY-SA 4.0](LICENSE). Adapted from the
  [Nerfies project page](https://nerfies.github.io) ([source](https://github.com/nerfies/nerfies.github.io)),
  whose license requires derivatives to keep the same license and link back in the footer.
- **Paper abstract and figures:** Karim et al., ImmerCom ’26, © 2026 the authors, licensed under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The overview diagram is redrawn from Figure 1;
  Figure 2 is cropped and resized. Both changes are noted in the figure captions.
- **Bulma 0.9.1:** MIT License, see `static/css/LICENSE-bulma.txt`.
- **Icons:** Font Awesome Free 5.15.1 (file-pdf, github, database, book, copy), inlined as SVG,
  [CC BY 4.0](https://fontawesome.com/license/free). The stage icons and favicon are original.
- **Fonts:** Google Sans Flex and Noto Sans, SIL Open Font License 1.1, see `static/fonts/OFL-*.txt`.
