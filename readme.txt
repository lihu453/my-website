LumenOS
=======

A personal web operating system built with HTML, CSS, and JavaScript.
It organizes personal introduction, notes, places, and desktop settings into an explorable interface.

Features

Welcome boot screen

Desktop top bar and live date/time

App windows that can be opened, closed, minimized, and dragged

App windows with maximize and desktop fullscreen modes

Field Notes notes app

Open, edit, create, save, and delete notes

Notes are saved to browser localStorage and persist after refresh

About.me personal introduction window

The Atlas map interaction window

System settings window

Browser app with address bar, navigation history, reload, and new-tab support

Custom desktop colors, background presets, and image wallpapers

Close the interface and return to the boot screen

Click characters in the large desktop title, and the characters fall

When an app is opened, the title characters return to their original positions

Supports desktop and mobile layouts

Run

The project is a static website and requires no dependencies to install.

Run in the project root directory:

python -m http.server 4173

Then visit in your browser:

http://localhost:4173/

You can also open index.html directly.

You can also open https://lihu453.github.io/my-website/

File Structure

index.html Page structure and app windows
style.css Page styles, animations, and responsive layout
script.js Clock, windows, dragging, notes, and background settings logic
readme.txt Project description
log.txt Development log

Note Data

Note data is saved in the browser's localStorage under the key:

lumenNotes

Desktop background settings are saved in localStorage under the key:

lumenBackground

Notes

localStorage data is only saved in the current browser and under the current domain.

Clearing browser website data will delete saved notes and background settings.

Image wallpapers require an image URL that the browser can access.

The project uses Google Fonts; fallback fonts are used automatically when there is no network.