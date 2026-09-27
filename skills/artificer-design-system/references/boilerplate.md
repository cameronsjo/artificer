# New-page boilerplate

Use when wiring a new Artificer page. Runtime paths below are relative to the consumer page.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>...</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg" />
  <!-- og:image must be an absolute raster URL in production — social crawlers reject SVG and relative paths. -->
  <meta property="og:image" content="assets/og-image.png" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="assets/og-image.png" />
  <!-- Theme bootstrap (v0.9.0 baseline): runs before paint so dark pages don't flash light.
       Key 'artificer.theme' MUST match artificer-theme.js. Fail-safe to dark. -->
  <script>
    (function () {
      try {
        var saved = localStorage.getItem('artificer.theme');
        var pinned = saved === 'light' || saved === 'dark';
        var prefersLight = window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: light)').matches;
        document.documentElement.setAttribute('data-theme', pinned ? saved : (prefersLight ? 'light' : 'dark'));
      } catch (e) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    })();
  </script>
  <link rel="stylesheet" href="artificer.css" />
  <link rel="stylesheet" href="print.css" media="print" />
  <script src="artificer-theme.js" defer></script>
  <script src="artificer-icons.js" defer></script>
</head>
<body>
  <button class="theme-toggle" data-theme-toggle aria-label="Toggle theme"></button>
  <main class="container container--md container--page">
    <!-- your content -->
  </main>
</body>
</html>
```

If you have **no file system** (chat-only artifact), inline the contents of `artificer.css` into a `<style>` block instead of linking it.
