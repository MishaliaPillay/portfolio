# Mishalia Pillay — Portfolio

Static, dependency-free portfolio site. No build step: open `index.html` or host the folder as-is.

## Structure

```
index.html          page markup only
css/styles.css      all styles (design tokens at the top, dark mode included)
js/paint-grid.js    interactive pixel canvas + paint toolbar in the hero
js/name-type.js     cursor-reactive name lettering and fit-to-width sizing
js/cursor.js        custom cursor (mouse devices only)
js/contact.js       contact form → email via FormSubmit
Mishalia_Pillay_CV_Updated_November_2026.pdf   downloadable CV
```

Scripts are classic `defer` scripts, each wrapped in an IIFE, rather than ES modules so the
site still works when opened directly from disk (`file://` blocks module imports).

## Setup

1. **Contact email** — `CONTACT_EMAIL` at the top of `js/contact.js` (currently mishaliapillay16@gmail.com).
2. **Publish** — GitHub Pages, Netlify (drag the folder onto app.netlify.com/drop) or Cloudflare Pages.
   The form does not send from `file://`.
3. **Activate the form** — send one test message from the live site and click the activation link
   FormSubmit emails you. Optionally replace the address with the random alias it gives you.
4. **CV** — export a fresh PDF with the same filename; the download buttons point to it.

## Customising

- Colours: edit the tokens in `:root` at the top of `css/styles.css` (`--paint-1`…`--paint-4` are the brush swatches).
- Content: all copy lives in `index.html`.
