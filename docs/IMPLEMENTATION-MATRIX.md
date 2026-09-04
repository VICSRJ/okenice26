# Okenice26 Extended — Implementation Matrix

## Architecture

Okenice26 Extended remains a GitHub Pages/static-first application. The existing catalog and desktop hierarchy are preserved. The extended runtime is layered on top:

- app.js — existing catalog, folders, Start menu and shortcut behavior
- win98-runtime.js — window manager and core built-in applications
- win98-patch.js — catalog shortcut bridge
- win98-dnd.js — OS file drag/drop into the virtual filesystem
- win98-shell-v2.js — shell controls: Alt+Tab, taskbar context actions, position persistence and shell settings
- win98-extension.css — extended Win98 system styling and theme variables
- win98-shell-v2.css — taskbar placement/layout and system overlays
- manifest.webmanifest + service-worker.js — PWA/offline shell
- data/links.json — content/catalog source of truth

## Implemented now

### Desktop / Window Manager
- draggable windows
- resizable windows
- minimize / maximize / restore / close
- Z-order and active-window state
- taskbar window buttons
- Alt+F4
- Alt+Tab launcher
- Ctrl+Esc
- window tiling/cascading/minimize-all commands
- taskbar context menu
- taskbar lock state
- taskbar position: top / bottom / left / right
- taskbar row setting
- local shell persistence
- right-bottom resize handle
- responsive mobile fallback

### Virtual filesystem
- persistent local files
- My Documents-style storage
- file creation from Explorer
- browser-side file import using drag & drop
- local metadata: name/type/size/timestamps/content
- Explorer listing

### Built-in applications
- Notepad
- Calculator
- Paint
- Minesweeper
- Internet Explorer-style browser shell
- Sound Recorder UI
- Winamp-style player shell
- Windows Explorer
- Run
- Control Panel
- Task Manager
- Help
- AI Desktop 98
- About

### Themes
The runtime supports the requested theme identifiers:

windows-98, windows-95, rainy-day, rose, slate, spruce, desert, brick, eggplant, lilac, maple, marine, plum, pumpkin, storm, teal, wheat.

### PWA
- installable web-app manifest
- standalone display mode
- service-worker registration
- basic offline cache shell
- mobile metadata

## Partial / next implementation layer

These require dedicated modules rather than more shell patching:

1. Full hierarchical Virtual FS (C:\\Windows, Program Files, My Documents, Temp, Recycled).
2. IndexedDB storage instead of localStorage for larger files and richer metadata.
3. Explorer four view modes, sorting, search, properties and Recycle Bin.
4. Full Start Menu manager with recent items, per-user profiles and quick search.
5. Notepad document model with multiple instances, encoding, save dialogs, Find/Replace and session recovery.
6. Scientific/programmer calculator.
7. Full Paint toolset, selection model, image transforms and export.
8. Full Klondike Solitaire.
9. Expert/custom Minesweeper.
10. FreeCell / Hearts / Tic-Tac-Toe / Snake / Pinball.
11. Winamp playlist, equalizer, Web Audio playback and visualization.
12. AIM-style chat model with local history.
13. Control Panel applet framework.
14. Rich Task Manager process model and metrics.
15. Hardware/BIOS/device simulation.
16. Clippy context integration and optional external AI providers.
17. Event log / registry model / profile export-import.
18. Plugin API.
19. React + TypeScript migration only after the behavior model is stable.

## Engineering rules
- Keep the public GitHub Pages build working at every stage.
- Keep catalog data separate from runtime behavior.
- Avoid fake APIs that look functional but do not work.
- Prefer deterministic browser capabilities over OS-specific assumptions.
- Use local persistence for simulated Windows state.
- Keep modern integrations explicitly separated from the Win98 visual shell.
- Preserve accessibility and keyboard navigation while maintaining the visual retro style.

## Current release target

Extended 1.x = authentic desktop shell + functional local environment.

The full 22-category specification is treated as the long-term product specification. It is intentionally being delivered in modules so each feature remains testable and replaceable.