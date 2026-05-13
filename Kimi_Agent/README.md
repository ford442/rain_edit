# Rain Edit - Feature Updates (Corrected)

## Summary of Changes

This patch adds two key features to the rain_edit project:

### 1. Notes Cube in 3D File Browser

A new "notes" category has been added to the 3D file browser (Cabinet3D), properly integrated with the existing notes API:

**StorageAPI.js Changes:**
- Added `'notes'` to `STORAGE_CATEGORIES` array
- **`getCategoryFiles(type)`** - Intercepts `apiType === 'notes'` and routes to `listNotes()`, mapping results to `{id, name, date}` format
- **`getFileContent(id, type)`** - Intercepts `apiType === 'notes'` and routes to `loadNote(id)`, returning `{content, language: 'markdown'}`
- **`fetchFileContent(id, type)`** - Intercepts `type === 'notes'` and routes to `loadNote(id)`

**Cabinet3D.js Changes:**
- Added yellow color (`0xffff00`) for the notes category cube

### 2. Fixed "Bring Forward" / "Push Back" Buttons

The depth control buttons now work correctly:
- **Bring Forward (⬆️)** - Cycles the current file's depth: Deep → Middle → Front → Deep
- **Push Back (⬇️)** - Cycles the current file's depth: Deep → Front → Middle → Deep

Depth levels:
- **0 (Deep)** - Behind all rain layers (z-index: 0)
- **1 (Middle)** - Between rain layers (z-index: 5)  
- **2 (Front)** - Above all rain (z-index: 15) - unobscured editing

**main.js Changes:**
- Added event listeners for `btn-depth-forward` and `btn-depth-back`
- Properly cycles through depth levels and updates UI

## How to Apply These Changes

Copy the modified files to your project:
```bash
cp StorageAPI.js /path/to/your/project/src/
cp Cabinet3D.js /path/to/your/project/src/
cp main.js /path/to/your/project/src/
```

Then rebuild and deploy.

## Testing the Features

### Testing the Notes Cube:
1. Open the 3D File Cabinet (bottom right button)
2. Look for the yellow "notes" cube
3. Click on it to browse available notes (uses `/api/notes/list`)
4. Click a note file to open it in the editor (uses `/api/notes/read/{name}`)

### Testing Depth Controls:
1. Open any file in the editor
2. Click "⬆️ Bring Forward" to move it above the rain (depth 2)
3. Click "⬇️ Push Back" to cycle through depth levels
4. The tab icon will change to show current depth: ▼ (deep), ◆ (middle), ▲ (front)

## API Endpoints Used

The notes integration uses the existing dedicated notes API:
- `GET /api/notes/list` - List all notes (via `listNotes()`)
- `GET /api/notes/read/{name}` - Load a specific note (via `loadNote(name)`)
- `POST /api/notes/write/{name}` - Save a note (via `saveNote(name, content)`)
