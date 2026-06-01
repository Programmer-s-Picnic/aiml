# AI-ML Classes from 0 to Infinity

Static course site for Programmer's Picnic AI-ML Classes by Champak Roy.

## What is inside

- shared `header.html` and `footer.html`
- automatic navigation from `assets/data/menu.json`
- automatic breadcrumbs based on the current file path
- student-friendly homepage
- lessons, datasets, assignments, projects, teacher and student sections
- `sitemap.xml`, `robots.txt`, `404.html`, and `CNAME`
- warm light blue theme in `assets/css/site.css`

## Editing navigation

Edit:

```txt
assets/data/menu.json
```

The header search and navigation are generated from this file.

## Adding a new lesson

Create a folder with an `index.html`, for example:

```txt
lessons/new-topic/index.html
```

Use the shared includes:

```html
<link rel="stylesheet" href="../../assets/css/site.css">
<script defer src="../../assets/js/site.js"></script>
<script defer src="../../assets/js/include.js"></script>
<div data-include="header"></div>
<main id="main-content" class="pp-content">...</main>
<div data-include="footer"></div>
```

## Deployment

Upload the contents of this folder to GitHub Pages or any static host. Keep `CNAME` if the custom domain is `aiml.learnwithchampak.live`.
