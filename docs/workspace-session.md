# Workspace sessions

Rain-edit persists a **storm layout** so refresh does not wipe open work.

## What is saved

| Field | Notes |
| --- | --- |
| Open tabs | name, language, depth `0\|1\|2`, content buffer |
| Dirty flags | `*` in the tab bar; unload confirm when any dirty |
| Cursor / selection | Monaco position restored for the active tab |
| Active tab + view mode | `#view-mode-select` value |
| Reference cards | Markdown source + per-card layout overrides |
| Local project pointer | FSA / OPFS / drag-drop metadata |

**Not persisted:** InputManager hold/toggle modes (magnifier, x-ray, etc.). Keybind *overrides* remain under `rain2.keybinds`.

## Storage

1. **IndexedDB** database `rain-edit-workspace` (primary, large content)
2. Compact **localStorage** mirror key `rain_edit_workspace_session`
3. Legacy `rain_edit_open_tabs` kept in sync for older builds

Export/import uses the same JSON (`SESSION_VERSION = 1`) via dock **Export layout** / **Import layout**.

## Local project mode

| Action | API |
| --- | --- |
| Open folder | Chromium `showDirectoryPicker` (File System Access) |
| Drag-drop | Files or folders onto `#container` |
| OPFS sandbox | `navigator.storage.getDirectory()` → `rain-edit-project/` when no permission |

Local/OPFS saves go through `LocalProject.saveActiveLocal()` (also attempted from the VPS save path when the tab has a `fileHandle` / `opfsPath`).

## Remote session sync (opt-in)

When **Remote session sync** is checked, each persist also writes note:

```
POST /api/notes/write/__rain_workspace_session__.json
{ "content": "<session JSON>" }
```

Read back with:

```
GET /api/notes/read/__rain_workspace_session__.json
```

If the backend is unreachable, the app stays in **local-only mode** (IndexedDB / localStorage / OPFS). Other StorageAPI endpoints used by tabs:

| Use | Endpoint |
| --- | --- |
| Restore VPS-linked tab | `GET /api/vps/file?path=` |
| Restore note-linked tab | `GET /api/notes/read/{name}` |
| Depth-aware VPS save | `POST /api/vps/save` (depth remembered in the local session) |

## Dock controls

- **Open folder** / **OPFS sandbox**
- **Export layout** / **Import layout**
- **Remote session sync** checkbox
- **Clear saved session**

## Programmatic

```js
window.workspaceSession.exportJSON();
await window.workspaceSession.importJSON(json);
window.workspaceSession.hasDirtyFiles();
await window.localProject.openFolder();
```
