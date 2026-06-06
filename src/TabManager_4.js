import StorageAPI from "./StorageAPI.js";
import { storageAPI, TOAST_DISPLAY_DURATION, DEPTH_Z_INDEX, DEPTH_ICONS, DEPTH_TITLES, _extractSymbols, _symbolKindIcon } from './TabManager.js';
export const TabManagerMixin4 = {
  _buildEchoElement(file, index, totalEchoes, inactiveFiles, activeFile) {
      const el = document.createElement("div");
      el.className = "echo-document";
      el.dataset.id = file.id;
      el.dataset.index = index; // Store for CSS vars restore later
      el.dataset.depth = file.depth ?? 0; // data-depth for CSS targeting

      // Chromatic Depth Layering
      // Shift hue gradually based on depth index. We base it off a base color.
      let baseTint = 180; // cyan base
      if (file.name.endsWith(".js"))
        baseTint = 60; // yellow
      else if (file.name.endsWith(".css"))
        baseTint = 200; // blue
      else if (file.name.endsWith(".html") || file.name.endsWith(".md"))
        baseTint = 320; // pink

      // Shift hue by 15 degrees per depth level
      let currentTint = (baseTint + index * 15) % 360;
      if (this.isMatrixRainView) {
        currentTint = 120; // Green tint for Matrix Rain
      }
      el.style.setProperty("--echo-tint", `${currentTint}deg`);

      // Semantic Gravity: Pull files with similar extensions or languages closer
      const fileExt = file.name.split(".").pop();
      if (
        (fileExt === activeExt || file.language === activeLang) &&
        !this.isCascadeView &&
        !this.isOrbitView &&
        !this.isScatteredView &&
        !this.isIsometricView &&
        !this.isStackView &&
        !this.isTunnelView &&
        !this.isGridView &&
        !this.isHelixView &&
        !this.isPinboardView &&
        !this.isVortexView &&
        !this.isConstellationView &&
        !this.isPrismView &&
        !this.isCoverflowView &&
        !this.isWaveView &&
        !this.isSphereView &&
        !this.isRolodexView &&
        !this.isCylinderView &&
        !this.isMatrixRainView &&
        !this.isFractalView &&
        !this.isNeonSynthView &&
        !this.isBlueprint3dView &&
        !this.isCyberCortexView &&
        !this.isArchwayView
      ) {
        el.classList.add("semantic-gravity-pull");
      }

      // Set parallax factor for vertical scrolling (deeper = moves slower)
      const parallaxFactor = Math.max(0.05, 0.3 - index * 0.08);
      el.style.setProperty("--parallax-factor", parallaxFactor);

      if (index === 0) {
        el.classList.add("echo-recent");
      }

      // Add a header so users know what this file is
      const echoHeader = document.createElement("div");
      echoHeader.className = "echo-header";

      const headerTitle = document.createElement("div");
      headerTitle.className = "echo-header-title";
      headerTitle.innerHTML = `<span class="echo-file-icon">◈</span> <span class="echo-file-name">${file.name}</span> <span class="echo-file-lang">${file.language || "text"}</span>`;

      const headerStatus = document.createElement("div");
      headerStatus.className = "echo-header-status";
      const randomHex = Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, "0")
        .toUpperCase();
      headerStatus.innerHTML = `<span class="echo-status-dot"></span>0x${randomHex}`;

      const overlayBtn = document.createElement("button");
      overlayBtn.className = "echo-peek-btn";
      overlayBtn.title = "Holographic Overlay (Ghost Diff)";
      overlayBtn.style.marginRight = "8px";
      overlayBtn.innerHTML = `⧉`;

      overlayBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        el.classList.toggle("hologram-overlay-active");
      });

      const peekBtn = document.createElement("button");
      peekBtn.className = "echo-peek-btn";
      peekBtn.title = "Expanded Peek";
      peekBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
        </svg>
      `;

      echoHeader.appendChild(headerTitle);
      echoHeader.appendChild(headerStatus);
      echoHeader.appendChild(overlayBtn);
      echoHeader.appendChild(peekBtn);

      // Focus Outline button — highlights matching content in active editor
      const focusOutlineBtn = document.createElement("button");
      focusOutlineBtn.className = "echo-focus-outline-btn";
      focusOutlineBtn.title =
        "Focus Outline — highlight this file's symbols in the active editor";
      focusOutlineBtn.textContent = "⌖";
      focusOutlineBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        // Toggle outline-highlight class on this echo
        const isHighlighting = el.classList.contains("outline-focus-active");
        this.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
          doc.classList.remove("outline-focus-active");
        });
        if (!isHighlighting) {
          el.classList.add("outline-focus-active");
          // Apply semantic resonance — find matching symbols in active editor
          if (this.editor && !file.isImage) {
            const symbols = _extractSymbols(
              file.model ? file.model.getValue() : "",
            );
            if (symbols.length > 0) {
              const activeModel = this.editor.getModel();
              if (activeModel && this.editor.revealLineInCenter) {
                const activeContent = activeModel.getValue();
                const firstSymbol = symbols[0].name;
                // Use \b word boundary for cross-browser compatibility (avoids substring false positives)
                const escaped = firstSymbol.replace(
                  /[.*+?^${}()|[\]\\]/g,
                  "\\$&",
                );
                const wordRe = new RegExp(`\\b${escaped}\\b`);
                const matchIdx = activeContent.search(wordRe);
                if (matchIdx !== -1) {
                  const pos = activeModel.getPositionAt(matchIdx);
                  this.editor.revealLineInCenter(pos.lineNumber);
                  this.editor.setSelection({
                    startLineNumber: pos.lineNumber,
                    startColumn: pos.column,
                    endLineNumber: pos.lineNumber,
                    endColumn: pos.column + firstSymbol.length,
                  });
                }
              }
            }
          }
        }
      });
      echoHeader.appendChild(focusOutlineBtn);

      peekBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // prevent click from making it active
        const isPeeking = el.classList.contains("is-peeking");
        if (isPeeking) {
          el.classList.remove("is-peeking");
          peekBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                </svg>
              `;
          if (this.editorEl) this.editorEl.classList.remove("editor-peek-fade");
        } else {
          // Un-peek others
          this.echoLayerEl.querySelectorAll(".is-peeking").forEach((doc) => {
            doc.classList.remove("is-peeking");
            const otherBtn = doc.querySelector(".echo-peek-btn");
            if (otherBtn) {
              otherBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                        </svg>
                      `;
            }
          });

          el.classList.add("is-peeking");
          peekBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>
                </svg>
              `;
          if (this.editorEl) this.editorEl.classList.add("editor-peek-fade");

          const rect = el.getBoundingClientRect();
          const evt = new CustomEvent("echo-peek", {
            detail: { x: window.innerWidth / 2, y: window.innerHeight / 2 }, // clear center screen
          });
          document.dispatchEvent(evt);
        }
      });

      el.appendChild(echoHeader);

      // Symbol Outline section — collapsible panel showing top-level symbols
      if (!file.isImage && file.model) {
        const symbols = _extractSymbols(file.model.getValue());
        if (symbols.length > 0) {
          const outlineSection = document.createElement("div");
          outlineSection.className = "echo-symbol-outline";
          outlineSection.dataset.collapsed = "false";

          const outlineToggle = document.createElement("button");
          outlineToggle.className = "echo-outline-toggle";
          outlineToggle.title = "Toggle symbol outline";
          const toggleIcon = document.createElement("span");
          toggleIcon.className = "outline-icon";
          toggleIcon.textContent = "⬡";
          const toggleCount = document.createElement("span");
          toggleCount.className = "outline-count";
          toggleCount.textContent = `(${symbols.length})`;
          outlineToggle.appendChild(toggleIcon);
          outlineToggle.append(" Symbols ");
          outlineToggle.appendChild(toggleCount);
          outlineToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            const isCollapsed = outlineSection.dataset.collapsed === "true";
            outlineSection.dataset.collapsed = isCollapsed ? "false" : "true";
          });

          const outlineList = document.createElement("ul");
          outlineList.className = "echo-outline-list";
          symbols.slice(0, 12).forEach((sym) => {
            const item = document.createElement("li");
            item.className = `echo-outline-item outline-kind-${sym.kind}`;
            item.title = `${sym.kind}: ${sym.name} (line ${sym.line})`;

            const kindIconEl = document.createElement("span");
            kindIconEl.className = "outline-kind-icon";
            kindIconEl.textContent = _symbolKindIcon(sym.kind);

            const symNameEl = document.createElement("span");
            symNameEl.className = "outline-sym-name";
            symNameEl.textContent = sym.name;

            const lineEl = document.createElement("span");
            lineEl.className = "outline-line";
            lineEl.textContent = `:${sym.line}`;

            item.appendChild(kindIconEl);
            item.appendChild(symNameEl);
            item.appendChild(lineEl);
            outlineList.appendChild(item);
          });

          outlineSection.appendChild(outlineToggle);
          outlineSection.appendChild(outlineList);
          el.appendChild(outlineSection);
        }
      }

      const bodyWrapper = document.createElement("div");
      bodyWrapper.className = "echo-body-wrapper";

      const lineNumbers = document.createElement("div");
      lineNumbers.className = "echo-line-numbers";
      let linesHtml = "";
      const lineCount = file.isImage
        ? 1
        : Math.min(
            40,
            file.model?.getLineCount ? file.model.getLineCount() : 40,
          );
      for (let i = 1; i <= lineCount; i++) {
        linesHtml += `<span>${i}</span>`;
      }
      lineNumbers.innerHTML = linesHtml;
      bodyWrapper.appendChild(lineNumbers);

      // Extract text or show image placeholder
      let contentStr = "";
      if (file.isImage) {
        contentStr = `[IMAGE: ${file.name}]`;
      } else {
        contentStr = file.model.getValue().substring(0, 1000);
      }

      const pre = document.createElement("pre");
      const code = document.createElement("code");
      if (file.isImage) {
        code.textContent = contentStr;
      } else {
        // Asynchronous syntax highlighting for background code blocks
        code.textContent = "Loading..."; // Placeholder
        this.monaco.editor
          .colorize(contentStr, file.language || "javascript", {})
          .then((html) => {
            // Only update if the element is still in the DOM (the tab manager might have re-rendered)
            if (el.isConnected) {
              code.innerHTML = html;
            }
          })
          .catch((err) => {
            console.warn("Failed to colorize background document:", err);
            code.textContent = contentStr; // Fallback to plain text
          });
      }

      // Allow drag & drop for Holographic Siphon
      pre.draggable = true;
      pre.addEventListener("dragstart", (e) => {
        if (!document.body.classList.contains("siphon-mode-active")) {
          e.preventDefault();
          return;
        }

        const selection = window.getSelection();
        let text = selection.toString();

        if (!text) {
          // If no text is selected, fallback to the whole content or a snippet
          text = code.textContent.substring(0, 500);
        }

        e.dataTransfer.setData("text/plain", text);
        e.dataTransfer.effectAllowed = "copy";

        // Optional: Add a custom drag image
        const dragImg = document.createElement("div");
        dragImg.style.position = "absolute";
        dragImg.style.top = "-1000px";
        dragImg.style.color = "#00e5ff";
        dragImg.style.background = "rgba(0, 0, 0, 0.8)";
        dragImg.style.padding = "8px";
        dragImg.style.border = "1px solid #00e5ff";
        dragImg.textContent =
          text.length > 20 ? text.substring(0, 20) + "..." : text;
        document.body.appendChild(dragImg);

        e.dataTransfer.setDragImage(dragImg, 0, 0);

        setTimeout(() => {
          if (dragImg.parentNode) dragImg.parentNode.removeChild(dragImg);
        }, 100);
      });

      pre.appendChild(code);
      bodyWrapper.appendChild(pre);

      const minimap = document.createElement("div");
      minimap.className = "echo-minimap";
      minimap.style.transform = "translateZ(30px)";
      minimap.style.boxShadow = "-10px 10px 20px rgba(0,0,0,0.5)";
      let minimapHtml = "";
      for (let i = 0; i < 35; i++) {
        const width = 20 + Math.random() * 80;
        const opacity = 0.1 + Math.random() * 0.5;
        minimapHtml += `<div class="minimap-block" style="width: ${width}%; opacity: ${opacity};"></div>`;
      }
      minimap.innerHTML = minimapHtml;
      bodyWrapper.appendChild(minimap);

      el.appendChild(bodyWrapper);

      // Add a CSS-animated scanning line effect to the document
      const scanLineDiv = document.createElement("div");
      scanLineDiv.className = "scan-line";
      scanLineDiv.style.setProperty("--index", index);
      el.appendChild(scanLineDiv);

      const semanticLaser = document.createElement("div");
      semanticLaser.className = "semantic-sync-laser";
      el.appendChild(semanticLaser);

      // Dynamic Opacity and Blur based on depth index via CSS variables
      // (This avoids inline style specificity issues that break hover states)
      const baseOpacity = Math.max(0.15, 0.7 - index * 0.2);
      const baseBlur = Math.min(15, 3 + index * 3);
      el.style.setProperty("--base-opacity", baseOpacity);
      el.style.setProperty("--base-blur", `${baseBlur}px`);

      // Add visual feedback elements for obscured distant documents
      if (index >= 2) {
        el.classList.add("depth-aware-glitch");
      }

      const hexOverlay = document.createElement("div");
      hexOverlay.className = "hex-overlay";
      el.appendChild(hexOverlay);

      const lightLeak = document.createElement("div");
      lightLeak.className = "light-leak";
      el.appendChild(lightLeak);

      const holoRing = document.createElement("div");
      holoRing.className = "echo-document-holo-ring";
      el.appendChild(holoRing);

      const magneticEdge = document.createElement("div");
      magneticEdge.className = "magnetic-edge";
      el.appendChild(magneticEdge);

      const edgeBleedLayer = document.createElement("div");
      edgeBleedLayer.className = "edge-bleed-layer";
      el.appendChild(edgeBleedLayer);

      const spotlight = document.createElement("div");
      spotlight.className = "volumetric-spotlight";
      el.appendChild(spotlight);

      // Ghost Scroll feature: allow scrolling without bringing document to front
      pre.addEventListener("wheel", (e) => {
        e.stopPropagation(); // prevent main editor from scrolling
        // Dispatch echo-peek to clear fog locally
        const evt = new CustomEvent("echo-peek", {
          detail: { x: e.clientX, y: e.clientY },
        });
        document.dispatchEvent(evt);
      });

      // Holographic Glitch on Hover
    this._bindEchoEvents(el, file, index, totalEchoes, inactiveFiles, activeFile, header, content, outlineList, activeExt, activeLang);
      this.echoLayerEl.appendChild(el);
    return el;
  },
};
