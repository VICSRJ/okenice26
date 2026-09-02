# Okenice26 — Windows 98 link template

A lightweight Windows 98-style desktop template for web application shortcuts and folders.

## Shortcut model

Each desktop item is a normal `<a>` link. The same icon asset can be reused in the desktop, Quick Launch and Start menu.

Example:

```html
<a class="desktop-icon" href="https://www.google.com/" target="_blank" rel="noopener">
  <img class="shortcut-icon" src="icons/google.icon.svg" alt="">
  <span>Google</span>
</a>
```

Icon assets live in `icons/` and use names such as `google.icon.svg`, `google-cz.icon.svg`, and `search.icon.svg`.
