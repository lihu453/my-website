# LumenOS



LumenOS is a small personal web desktop I built with plain HTML, CSS, and JavaScript. It's a place for my intro, notes, places, and desktop settings, wrapped in a clickable little interface. No frameworks, no build step.

## What it does

- Starts with a boot screen.
- Top bar with a live date/time.
- App windows you can open, close, minimize, and drag around.
- **Field Notes**: a small notes app. You can open, create, edit, save, and delete notes. They're stored in `localStorage`, so they survive a refresh.
- **About.me**: personal intro window.
- **The Atlas**: map interaction window.
- **System Settings**: desktop colors, background presets, and image wallpapers.
- **Virtual Files**: a tiny file manager. Create/edit text files, upload images/videos, and preview them inside the desktop.
- You can close the whole interface and go back to the boot screen.
- Click the big LumenOS letters on the desktop and they fall. Opening an app puts them back.
- Desktop and mobile layouts are supported.

## Running it

It's just static files. From the project root:

```bash
python -m http.server 4173
```

Then open:

```
http://localhost:4173/
```

You can also open `index.html` directly. There's a hosted copy here:

https://lihu453.github.io/my-website/

## Files

- `index.html` — page structure and app windows
- `style.css` — styles, animations, responsive layout
- `script.js` — clock, windows, dragging, notes, background settings, etc.
- `readme.txt` — project description

## Where data lives

Saved in `localStorage` under these keys:

- Notes: `lumenNotes`
- Desktop background: `lumenBackground`
- Virtual files: `lumenFiles`

## A few things to know

- `localStorage` is per browser and per domain. If you clear site data, your notes, background, and virtual files are gone.
- Image wallpapers need to be a URL the browser can actually load.
- Virtual Files are not real files on your computer. Images and videos are stored as browser data and limited by `localStorage`, so don't throw huge videos in there.
- The project uses Google Fonts. If you're offline, it falls back to system fonts.

It's a personal project, so there are probably a few rough edges.
