# Rain Edit - Feature Updates

## Summary of Changes

This patch adds two key features to the rain_edit project:

### 1. Notes Cube in 3D File Browser

A new "notes" category has been added to the 3D file browser (Cabinet3D), allowing users to:
- Create, load, and save text documents/notes
- Access notes through a yellow cube in the 3D browser
- Store quick thoughts, code snippets, or documentation

**Files Modified:**
- `src/StorageAPI.js` - Added 'notes' to STORAGE_CATEGORIES and added saveNote() method
- `src/Cabinet3D.js` - Added yellow color (0xffff00) for the notes category

### 2. Fixed "Bring Forward" / "Push Back" Buttons

The depth control buttons now work correctly:
- **Bring Forward (⬆️)** - Cycles the current file's depth: Deep → Middle → Front → Deep
- **Push Back (⬇️)** - Cycles the current file's depth: Deep → Front → Middle → Deep

Depth levels:
- **0 (Deep)** - Behind all rain layers (z-index: 0)
- **1 (Middle)** - Between rain layers (z-index: 5)  
- **2 (Front)** - Above all rain (z-index: 15) - unobscured editing

**Files Modified:**
- `src/main.js` - Added event listeners for btn-depth-forward and btn-depth-back

## How to Apply These Changes

### Option 1: Copy Modified Files
Copy the modified files from this patch directory to your project:
```bash
cp StorageAPI.js /path/to/your/project/src/
cp Cabinet3D.js /path/to/your/project/src/
cp main.js /path/to/your/project/src/
```

### Option 2: Manual Patch Application
See the individual `.patch.txt` files for line-by-line instructions on what to change.

## Testing the Features

### Testing the Notes Cube:
1. Open the 3D File Cabinet (bottom right button)
2. Look for the yellow "notes" cube
3. Click on it to browse available notes
4. Click a note file to open it in the editor

### Testing Depth Controls:
1. Open any file in the editor
2. Click "⬆️ Bring Forward" to move it above the rain (depth 2)
3. Click "⬇️ Push Back" to cycle through depth levels
4. The tab icon will change to show current depth: ▼ (deep), ◆ (middle), ▲ (front)

## Backend Requirements

For full notes functionality, your backend API should support:
- `GET /api/songs?type=notes` - List all notes
- `GET /api/songs/{id}?type=notes` - Get a specific note's content
- `POST /api/songs` with `{type: 'notes', name, content}` - Save a note

If the backend doesn't support notes yet, the code will gracefully handle it and return empty lists.
