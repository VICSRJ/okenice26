# Macroloft Luxffery 26 — Windows 98 link template

Lightweight browser desktop inspired by Windows 98. The project turns a large web-app bookmark catalog into a navigable desktop, Start menu, Quick Launch and nested folder structure while keeping the implementation static and GitHub Pages friendly.

## What it is

Macroloft Luxffery 26 is a **web link launcher / bookmark desktop**, not a simulated operating system. The UI deliberately keeps the classic Windows 98 visual language: teal desktop, gray bevels, navy title bars, pixel-oriented 32px icons and cascading menus.

The content model is data-driven. Desktop shortcuts, Start-menu entries, Quick Launch entries and folders are resolved from the same catalog in `data/links.json`.

## Current features

- Windows 98-style desktop and top taskbar
- Classic Start menu with cascading submenus
- Nested folders inside Start-menu submenus
- Desktop folder navigation with Back and `Alt + Left`
- One shared catalog for desktop, menus and Quick Launch
- Desktop single-click selection with shortcut information dialog
- Desktop double-click direct open
- Quick Launch opens web targets in a new tab
- Local PNG icon system with safe remote favicon fallback
- URL protection: only `http:` and `https:` targets are allowed
- GitHub Pages compatible relative asset paths
- Responsive layout for desktop and mobile widths
- Right-click desktop context menu

## Interaction model

### Desktop

**1 click** → select shortcut and show information dialog.

**2 clicks** → open the target directly.

**Folder** → opens the folder view instead of an external URL.

### Start menu

Top-level sections are real menu controls, not hash links. Hover or click a section to open its submenu. Folder entries can open another nested submenu.

### Quick Launch

Quick Launch contains direct shortcuts and opens valid web targets in a new tab.

## Catalog architecture

The central source of truth is:

```text
data/links.json
```

Conceptually:

```text
catalog
├── version
├── name
├── source
├── desktop[]
├── quickLaunch[]
├── menus{}
└── items[]
    ├── app / link
    │   ├── id
    │   ├── title
    │   ├── url
    │   ├── category
    │   ├── description
    │   └── icon
    └── folder
        ├── id
        ├── title
        └── children[]
```

This keeps the UI independent from the bookmark source. The bookmark export can evolve without rewriting the desktop renderer.

## Project structure

```text
okenice26/
├── index.html                 # desktop shell + Start menu + shortcut dialog
├── app.js                     # catalog loading, rendering and interaction logic
├── styles.css                 # base Windows 98 visual system
├── top-taskbar.css            # top-docked taskbar layout
├── shortcut-template.css      # shortcut, menu and folder styling
├── menu.css                   # cascading menu behavior/style
├── data/
│   ├── links.json             # catalog and hierarchy
│   └── icons/
│       └── png/               # local 32×32 application icons
├── docs/
│   └── SITE-MAP.md            # structure map and navigation model
└── README.md
```

## Icon system

The preferred icon source is the project's local PNG library:

```text
data/icons/png/*.png
```

Known application assets include icons for ChatGPT, DeepSeek, Gemini, Claude, Figma, YouTube, Notion, Spotify, GitHub, Discord, Telegram, WhatsApp, Gmail, Steam, GOG, DaVinci Resolve, Canva, Next.js, React, Vue, Nuxt, Vite, Vercel, Docker, Kubernetes, Tailwind CSS and Colab.

Folders use the local:

```text
data/icons/png/folder.png
```

The renderer tries the local asset first and only then considers a remote favicon. This makes the visual result predictable on GitHub Pages and avoids references to local computer paths such as `file:///`.

## GitHub Pages / security

The project is intended to run from a normal HTTPS GitHub Pages origin:

```text
https://vicsrj.github.io/okenice26/
```

All local resources should use relative web paths. The application rejects unsupported URL schemes and never intentionally navigates to `file:` URLs.

## Source catalog

The catalog was derived from the supplied Netscape bookmark HTML export and organized into application-oriented sections. The current structure includes areas such as:

```text
AI
├── Chatbots
├── Coding
├── Image
├── Video
├── Audio
└── Tools

Development
├── Frameworks
├── CSS & UI
├── Components
├── Playgrounds
├── Build Tools
└── Documentation

Design
├── Vector Graphics
├── Fonts
├── Stock Media
├── Color Tools
├── Animation
└── Design Apps

Audio
├── VST Plugins
├── Audio Editors
├── Streaming
├── Samples
└── Mastering

Multimedia
├── Movies & Series
├── Games
├── Video Editors
└── TV & IPTV

Utilities
├── File Managers
├── Converters
├── Online Tools
├── Security
└── QR Codes

Learning
├── Programming
├── Courses
└── Documentation

Communication
├── Messaging
├── Email
└── Social Media

DevOps
├── Cloud
├── Databases
├── API
└── Containers

Business
├── E-commerce
├── Finance
└── SEO

Other
├── Work
└── Misc
```

See the detailed map in [`docs/SITE-MAP.md`](docs/SITE-MAP.md).

## MS mapa / systémová mapa

The intended information architecture is:

```text
Browser
└── Macroloft Luxffery 26
    ├── Desktop
    │   ├── Top-level folders
    │   └── Direct application shortcuts
    ├── Start
    │   ├── Programs
    │   ├── Favorites
    │   ├── Documents / Folders
    │   └── Settings
    ├── Quick Launch
    │   └── Frequently used applications
    ├── Folder navigation
    │   ├── Current path
    │   ├── Back
    │   └── Nested folders
    └── Shortcut dialog
        ├── Name
        ├── Target
        ├── Type
        ├── Category
        └── Description
```

The renderer should remain intentionally small; most future complexity belongs in the data model, validation and indexing rather than in the visual shell.

## Roadmap

### Near term

- Improve keyboard navigation through cascading menus with arrow keys and `Esc`
- Add catalog search with instant filtering
- Add a compact “All Apps” browser for large catalogs
- Add active-folder highlighting and cleaner breadcrumbs
- Add missing-icon diagnostics
- Add duplicate-ID and duplicate-URL checks
- Add broken-link checks for the catalog

### Medium term

- Drag-and-drop desktop icon positioning
- Persist icon positions with `localStorage`
- Pin / unpin favorite applications
- Recently used shortcuts
- Search by title, category, domain and folder
- Import/export of the Netscape bookmark format
- Generate the JSON catalog automatically from the HTML bookmark export
- Optional icon pack definitions instead of a hard-coded icon map
- Better mobile menu mode with touch-first cascading navigation

### Long term

- Optional PWA/offline shell
- Catalog versioning and migration rules
- Automated asset validation in GitHub Actions
- Link health reports and stale-link detection
- Multiple visual profiles: Windows 95, Windows 98 and compact mode
- User-configurable desktop arrangements
- Multi-profile catalogs for work, development, design and personal links
- Optional hosted sync layer while keeping the static GitHub Pages mode as the default

## Recommended next engineering step

The strongest next step is to formalize the catalog pipeline:

```text
Netscape HTML export
        ↓
parser / normalizer
        ↓
validated links.json
        ↓
asset resolver
        ↓
desktop + Start + Quick Launch renderer
        ↓
GitHub Pages
```

That separates **content**, **assets**, **validation** and **presentation**, making the project much easier to extend without repeatedly editing the UI code.

## Development

No framework or build step is required for the current static version. Open the project through an HTTP server or deploy it to GitHub Pages. Do not open it with `file://` when testing dynamic catalog loading.

For local testing, any simple static server is sufficient.

## Design principle

Preserve the Windows 98 visual grammar while modernizing only the implementation underneath it:

```text
classic appearance
+ data-driven navigation
+ safe web URLs
+ reusable local PNG assets
+ responsive layout
= maintainable retro web desktop
```
