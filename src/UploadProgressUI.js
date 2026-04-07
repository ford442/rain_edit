/**
 * UploadProgressUI — lightweight upload progress overlay for Cabinet3D drag-and-drop uploads.
 *
 * Usage:
 *   const ui = new UploadProgressUI();
 *   ui.show('song.flac');
 *   // pass as onProgress callback to StorageAPI.uploadVPSFile()
 *   await storageAPI.uploadVPSFile(file, dir, (pct) => ui.setProgress(pct));
 *   ui.setDone();          // or ui.setError('message')
 */
export class UploadProgressUI {
  constructor() {
    this._el = null;
    this._bar = null;
    this._label = null;
    this._status = null;
  }

  _build() {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      bottom: 32px;
      right: 32px;
      z-index: 99999;
      background: rgba(10,10,20,0.92);
      border: 1px solid rgba(100,200,255,0.3);
      border-radius: 12px;
      padding: 16px 20px;
      min-width: 280px;
      max-width: 380px;
      color: #e0f0ff;
      font-family: monospace;
      font-size: 13px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      backdrop-filter: blur(12px);
      pointer-events: none;
      transition: opacity 0.3s;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;';

    const icon = document.createElement('span');
    icon.textContent = '⬆';
    icon.style.cssText = 'font-size:16px;color:#64c8ff;';

    this._label = document.createElement('span');
    this._label.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

    header.appendChild(icon);
    header.appendChild(this._label);

    const track = document.createElement('div');
    track.style.cssText = `
      height: 4px;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 8px;
    `;

    this._bar = document.createElement('div');
    this._bar.style.cssText = `
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #64c8ff, #a0f0c0);
      border-radius: 2px;
      transition: width 0.2s;
    `;
    track.appendChild(this._bar);

    this._status = document.createElement('div');
    this._status.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.5);';

    el.appendChild(header);
    el.appendChild(track);
    el.appendChild(this._status);

    document.body.appendChild(el);
    this._el = el;
  }

  show(filename) {
    if (!this._el) this._build();
    this._label.textContent = filename;
    this._bar.style.width = '0%';
    this._bar.style.background = 'linear-gradient(90deg, #64c8ff, #a0f0c0)';
    this._status.textContent = 'Uploading…';
    this._el.style.opacity = '1';
    this._el.style.pointerEvents = 'none';
  }

  setProgress(percent) {
    if (!this._el) return;
    this._bar.style.width = `${Math.min(100, percent)}%`;
    this._status.textContent = `${percent}%`;
  }

  setDone() {
    if (!this._el) return;
    this._bar.style.width = '100%';
    this._bar.style.background = 'linear-gradient(90deg, #40e080, #80ffc0)';
    this._status.textContent = 'Upload complete';
    setTimeout(() => this.hide(), 2000);
  }

  setError(message = 'Upload failed') {
    if (!this._el) return;
    this._bar.style.background = 'linear-gradient(90deg, #ff4060, #ff8080)';
    this._status.textContent = message;
    this._el.style.pointerEvents = 'auto';
    setTimeout(() => this.hide(), 4000);
  }

  hide() {
    if (!this._el) return;
    this._el.style.opacity = '0';
    setTimeout(() => {
      if (this._el) {
        this._el.remove();
        this._el = null;
        this._bar = null;
        this._label = null;
        this._status = null;
      }
    }, 300);
  }
}

export default UploadProgressUI;
