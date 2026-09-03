# Macroloft Luxffery 26 — Site / MS Map

This map describes the information architecture of the retro web desktop. It is intentionally data-oriented so the same structure can drive the Desktop, Start menu and future search UI.

## 1. Application shell

```text
Browser
└── Macroloft Luxffery 26
    ├── Top Taskbar
    │   ├── Start
    │   ├── Quick Launch
    │   └── System tray / clock
    └── Desktop
```

## 2. Desktop navigation

```text
Desktop
├── Root shortcuts
├── Root folders
└── Current folder
    ├── Back
    ├── Path / breadcrumbs
    ├── Application shortcuts
    ├── Link shortcuts
    └── Nested folders
        └── Repeat recursively
```

A folder is a navigation node, not an external web target.

## 3. Start menu

```text
Start
├── Programs
│   ├── AI
│   ├── Development
│   ├── Design
│   ├── Audio
│   ├── Multimedia
│   ├── Utilities
│   ├── Learning
│   ├── Communication
│   ├── DevOps
│   ├── Business
│   └── Other
├── Favorites
├── Documents / Folders
├── Settings
├── Find
├── Help
├── Run...
└── Shut Down...
```

The first four sections are catalog-driven cascading menus. Folder entries can expose a nested submenu.

## 4. Catalog hierarchy

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

## 5. Content model

```text
data/links.json
├── catalog metadata
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

## 6. Rendering pipeline

```text
links.json
    ↓
Catalog map
    ↓
Folder relations
    ↓
┌──────────────┬────────────────┬─────────────────┐
│ Desktop      │ Start menu     │ Quick Launch    │
└──────────────┴────────────────┴─────────────────┘
    ↓
Remote retro folder icon + embedded catalog icons
    ↓
Safe HTTP/HTTPS target resolver
    ↓
Browser navigation
```

Automatic third-party favicon probing is intentionally disabled. This avoids CORP/ORB failures and keeps rendering predictable.

## 7. Icon pipeline

```text
Item
 ↓
Is folder?
 ├── yes → remote Windows 95/98-era folder PNG
 └── no  → embedded data:image icon when present
              ↓
           no external favicon probing
```

The previous bundled `data/icons/png/` tree has been removed. The remote folder icon is sourced from Wikimedia Commons.

## 8. Shortcut interaction state

```text
Idle
 ↓
Desktop shortcut
 ├── single click → selected + information dialog
 └── double click → direct open

Folder
 └── open → folder view
       ├── Back
       ├── Alt + Left
       └── nested folder

Start
 ├── hover/click top-level section → submenu
 ├── folder → nested submenu
 └── application/link → open in new tab
```

## 9. Future map

```text
Catalog
├── Search index
├── Tags
├── Favorites
├── Recent
├── Health checker
└── Import / export

Desktop
├── Drag & drop
├── Saved positions
├── Snap to grid
├── Multiple layouts
└── Per-folder sorting

Navigation
├── Keyboard arrows
├── Type-to-search
├── Breadcrumb navigation
└── Mobile touch cascading menu

Assets
├── Remote icon source policy
├── Embedded icon validation
├── Missing icon report
└── Icon source health check

Validation
├── Duplicate IDs
├── Duplicate URLs
├── Broken links
├── Invalid schemes
└── Missing catalog references

Deployment
├── GitHub Pages
├── Optional PWA
├── Optional offline cache
└── Optional hosted synchronization
```

## 10. Future implementation priorities

### P1 — Reliability

1. Catalog schema validation.
2. Missing asset detection.
3. Duplicate ID / URL detection.
4. Invalid URL scheme detection.
5. Automated GitHub Pages smoke test.

### P2 — Navigation

1. Full keyboard support.
2. Fast catalog search.
3. Better folder breadcrumbs.
4. Recent and favorite shortcuts.
5. Mobile-specific cascading behavior.

### P3 — Personalization

1. Drag-and-drop desktop layout.
2. Saved icon positions.
3. Multiple desktop profiles.
4. Win95 / Win98 visual profiles.
5. Per-user catalog configuration.

### P4 — Automation

1. Netscape HTML parser.
2. Automatic `links.json` generation.
3. Icon-source validation.
4. Link health report.
5. CI validation before deployment.

## 11. Guiding architecture rule

Keep the project split into four layers:

```text
CONTENT
  data/links.json

ASSET POLICY
  remote folder icon + embedded catalog icons

PRESENTATION
  HTML + CSS

BEHAVIOR
  app.js + runtime-guard.js
```

Changes to one layer should not require rewriting the others unless the data contract itself changes.
