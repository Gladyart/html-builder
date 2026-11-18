# HTML Builder — Electron prototype

General-purpose local visual HTML layout builder with optional reusable HTML components.

## Run
Requires Node.js 20+ and npm. Extract the source archive, then run:

npm install
npm start

## Project format
- **Save project** defaults to `document.htmlproj`. It is UTF-8 JSON, not a binary format.
- **Open project** supports `.htmlproj`, `.json`, and legacy `.kbproj` from v0.1.
- Project schema: `{ "format": "html-builder", "version": 1, "html": "<div>...</div>" }`.
- **Export HTML** produces a `.html` file; it is not an editable project snapshot.

## Features
Add, select, edit, reorder, duplicate, and remove HTML elements; import/export HTML; edit source; save/load JSON-based projects; preview light/dark colors.

## Limitations
This is source code, not a compiled installer. Preview theme colors are simulated and are not exported. HTML imports use basic sanitization, not a comprehensive security boundary; only open trusted documents. Some text-property edits replace nested markup. There is no direct ServiceNow integration or signed corporate installer.


## Version changes

- Drag a component from the library to an element in the preview or document tree.
- Drag a tree element to move it; drop at top/middle/bottom of a row to place before/inside/after.
- In the preview, drag an element itself to move it (the clicked element becomes draggable).
- Invalid parent/child combinations and moving elements into their descendants are blocked.
