import {
  TerritoryAppearanceSchema,
  type TerritoryAppearance,
  type TerritorySkinMode,
} from "../../../chaos/customization/TerritorySkin";
import {
  getSavedTerritoryAppearance,
  saveTerritoryAppearance,
} from "../customization/TerritoryAppearanceStore";
import { uploadTerritorySkin } from "../customization/TerritorySkinUploadClient";

const MODES: readonly TerritorySkinMode[] = [
  "stretch",
  "cover",
  "contain",
  "tile",
  "center-logo",
  "flag-texture",
  "dynamic",
];

export class TerritoryCustomizer extends HTMLElement {
  private appearance: TerritoryAppearance = TerritoryAppearanceSchema.parse({});
  private previewUrl: string | undefined;
  private uploadAbort?: AbortController;
  private dragging = false;
  private dragStart = { x: 0, y: 0, ox: 0, oy: 0 };

  connectedCallback(): void {
    this.appearance = getSavedTerritoryAppearance() ?? TerritoryAppearanceSchema.parse({});
    this.render();
  }

  disconnectedCallback(): void {
    this.uploadAbort?.abort();
    if (this.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(this.previewUrl);
  }

  private render(): void {
    const a = this.appearance;
    this.innerHTML = `
      <section class="tc-customizer" aria-label="Customize territory">
        <style>
          .tc-customizer{display:grid;grid-template-columns:minmax(260px,1fr) minmax(280px,1.3fr);gap:18px;padding:18px;border:1px solid rgba(255,255,255,.13);border-radius:18px;background:linear-gradient(145deg,rgba(8,14,24,.92),rgba(18,24,36,.82));backdrop-filter:blur(18px);color:#f5f7fb;font:500 14px/1.35 system-ui,sans-serif}
          .tc-panel{display:flex;flex-direction:column;gap:12px}.tc-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tc-field{display:flex;flex-direction:column;gap:6px}.tc-field label{font-size:12px;color:#b8c0ce}.tc-field input,.tc-field select{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(255,255,255,.06);color:inherit;padding:9px 10px}.tc-field input[type=color]{height:38px;padding:3px}.tc-field input[type=range]{padding:0;border:0;background:transparent}.tc-upload{border:1px dashed rgba(255,255,255,.25);border-radius:12px;padding:13px;background:rgba(255,255,255,.035)}
          .tc-preview{position:relative;min-height:320px;overflow:hidden;border-radius:16px;border:1px solid rgba(255,255,255,.14);background:radial-gradient(circle at 50% 40%,#21364e,#07111f 70%);touch-action:none;user-select:none}.tc-territory{position:absolute;inset:8%;overflow:hidden;clip-path:polygon(8% 18%,35% 7%,58% 15%,87% 8%,95% 31%,82% 55%,91% 81%,63% 93%,43% 80%,19% 91%,7% 66%,15% 43%);background:var(--primary);box-shadow:inset 0 0 0 var(--border-size) var(--border),0 0 30px rgba(105,160,255,.2)}.tc-territory img{position:absolute;left:50%;top:50%;max-width:none;pointer-events:none;transform-origin:center}.tc-hint{position:absolute;left:12px;bottom:10px;padding:5px 8px;border-radius:8px;background:rgba(0,0,0,.55);font-size:11px;color:#d9e1ee}.tc-status{min-height:20px;color:#9fd1ff}.tc-actions{display:flex;gap:8px}.tc-btn{appearance:none;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:inherit;border-radius:10px;padding:9px 12px;cursor:pointer}.tc-btn.primary{background:#eef4ff;color:#0b1422;font-weight:750}.tc-btn:disabled{opacity:.45;cursor:default}@media(max-width:760px){.tc-customizer{grid-template-columns:1fr}.tc-preview{min-height:260px}}
        </style>
        <div class="tc-panel">
          <div class="tc-upload tc-field">
            <label for="tc-file">PNG / JPG / WebP · max 3 MiB</label>
            <input id="tc-file" type="file" accept="image/png,image/jpeg,image/webp" />
          </div>
          <div class="tc-row">
            <div class="tc-field"><label>Nation name</label><input id="tc-name" maxlength="32" value="${this.escape(a.nationName ?? "")}" /></div>
            <div class="tc-field"><label>Display mode</label><select id="tc-mode">${MODES.map((m) => `<option value="${m}" ${a.render.mode === m ? "selected" : ""}>${m}</option>`).join("")}</select></div>
          </div>
          <div class="tc-row">
            <div class="tc-field"><label>Territory color</label><input id="tc-primary" type="color" value="${a.primaryColor}" /></div>
            <div class="tc-field"><label>Border color</label><input id="tc-border" type="color" value="${a.borderColor}" /></div>
          </div>
          <div class="tc-field"><label>Image opacity <output id="tc-opacity-out">${a.render.opacity.toFixed(2)}</output></label><input id="tc-opacity" type="range" min="0.05" max="1" step="0.01" value="${a.render.opacity}" /></div>
          <div class="tc-field"><label>Zoom <output id="tc-scale-out">${a.render.scale.toFixed(2)}×</output></label><input id="tc-scale" type="range" min="0.05" max="5" step="0.01" value="${Math.min(5, a.render.scale)}" /></div>
          <div class="tc-field"><label>Rotation <output id="tc-rotation-out">${a.render.rotationDeg.toFixed(0)}°</output></label><input id="tc-rotation" type="range" min="-180" max="180" step="1" value="${a.render.rotationDeg}" /></div>
          <div class="tc-row">
            <div class="tc-field"><label>X offset</label><input id="tc-x" type="range" min="-2" max="2" step="0.01" value="${a.render.offsetX}" /></div>
            <div class="tc-field"><label>Y offset</label><input id="tc-y" type="range" min="-2" max="2" step="0.01" value="${a.render.offsetY}" /></div>
          </div>
          <div class="tc-status" id="tc-status" role="status"></div>
          <div class="tc-actions"><button class="tc-btn primary" id="tc-save" type="button">SAVE TERRITORY</button><button class="tc-btn" id="tc-reset-position" type="button">Reset position</button></div>
        </div>
        <div class="tc-preview" id="tc-preview">
          <div class="tc-territory" id="tc-territory"></div>
          <div class="tc-hint">Drag image to move · sliders zoom/rotate</div>
        </div>
      </section>`;

    this.bind();
    this.updatePreview();
  }

  private bind(): void {
    this.querySelector<HTMLInputElement>("#tc-file")?.addEventListener("change", (event) => void this.onFile(event));
    for (const id of ["tc-name", "tc-mode", "tc-primary", "tc-border", "tc-opacity", "tc-scale", "tc-rotation", "tc-x", "tc-y"]) {
      this.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)?.addEventListener("input", () => this.readControls());
    }
    this.querySelector<HTMLButtonElement>("#tc-save")?.addEventListener("click", () => this.save());
    this.querySelector<HTMLButtonElement>("#tc-reset-position")?.addEventListener("click", () => {
      this.appearance = TerritoryAppearanceSchema.parse({
        ...this.appearance,
        render: { ...this.appearance.render, scale: 1, rotationDeg: 0, offsetX: 0, offsetY: 0 },
      });
      this.syncControls();
      this.updatePreview();
    });
    const preview = this.querySelector<HTMLElement>("#tc-preview");
    preview?.addEventListener("pointerdown", (event) => this.startDrag(event));
    preview?.addEventListener("pointermove", (event) => this.moveDrag(event));
    preview?.addEventListener("pointerup", (event) => this.endDrag(event));
    preview?.addEventListener("pointercancel", (event) => this.endDrag(event));
  }

  private async onFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.setStatus("Validating and optimizing…");
    this.querySelector<HTMLButtonElement>("#tc-save")!.disabled = true;
    this.uploadAbort?.abort();
    this.uploadAbort = new AbortController();
    if (this.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = URL.createObjectURL(file);
    this.updatePreview();
    try {
      const asset = await uploadTerritorySkin(file, this.uploadAbort.signal);
      this.appearance = TerritoryAppearanceSchema.parse({ ...this.appearance, asset });
      this.previewUrl = asset.publicUrl;
      this.setStatus(`Optimized ${asset.width}×${asset.height} · ${(asset.byteLength / 1024).toFixed(0)} KiB`);
    } catch (error) {
      this.setStatus(error instanceof Error ? error.message : "Upload failed");
      this.appearance = TerritoryAppearanceSchema.parse({ ...this.appearance, asset: undefined });
    } finally {
      this.querySelector<HTMLButtonElement>("#tc-save")!.disabled = false;
      this.updatePreview();
    }
  }

  private readControls(): void {
    const value = (id: string) => this.querySelector<HTMLInputElement>(`#${id}`)!.value;
    this.appearance = TerritoryAppearanceSchema.parse({
      ...this.appearance,
      nationName: value("tc-name").trim() || undefined,
      primaryColor: value("tc-primary"),
      borderColor: value("tc-border"),
      render: {
        ...this.appearance.render,
        mode: this.querySelector<HTMLSelectElement>("#tc-mode")!.value,
        opacity: Number(value("tc-opacity")),
        scale: Number(value("tc-scale")),
        rotationDeg: Number(value("tc-rotation")),
        offsetX: Number(value("tc-x")),
        offsetY: Number(value("tc-y")),
      },
    });
    this.updatePreview();
  }

  private save(): void {
    this.readControls();
    saveTerritoryAppearance(this.appearance);
    this.setStatus("Saved. This appearance will be sent when you join/create a lobby.");
  }

  private updatePreview(): void {
    const territory = this.querySelector<HTMLElement>("#tc-territory");
    if (!territory) return;
    territory.style.setProperty("--primary", this.appearance.primaryColor);
    territory.style.setProperty("--border", this.appearance.borderColor);
    territory.style.setProperty("--border-size", `${Math.max(1, this.appearance.borderIntensity * 2)}px`);
    territory.replaceChildren();
    const src = this.previewUrl ?? this.appearance.asset?.publicUrl;
    if (src) {
      const img = new Image();
      img.alt = "Territory skin preview";
      img.src = src;
      const r = this.appearance.render;
      img.style.opacity = String(r.opacity);
      img.style.transform = `translate(calc(-50% + ${r.offsetX * 50}%), calc(-50% + ${r.offsetY * 50}%)) rotate(${r.rotationDeg}deg) scale(${r.scale})`;
      const mode = r.mode;
      if (mode === "stretch") {
        img.style.width = "100%"; img.style.height = "100%";
      } else if (mode === "contain" || mode === "center-logo") {
        img.style.width = mode === "center-logo" ? "45%" : "90%"; img.style.height = "auto";
      } else if (mode === "tile" || mode === "flag-texture") {
        img.style.width = `${mode === "flag-texture" ? 35 : 45}%`; img.style.height = "auto";
      } else {
        img.style.width = "110%"; img.style.height = "auto";
      }
      territory.appendChild(img);
    }
    const opacityOut = this.querySelector<HTMLOutputElement>("#tc-opacity-out");
    const scaleOut = this.querySelector<HTMLOutputElement>("#tc-scale-out");
    const rotOut = this.querySelector<HTMLOutputElement>("#tc-rotation-out");
    if (opacityOut) opacityOut.value = this.appearance.render.opacity.toFixed(2);
    if (scaleOut) scaleOut.value = `${this.appearance.render.scale.toFixed(2)}×`;
    if (rotOut) rotOut.value = `${this.appearance.render.rotationDeg.toFixed(0)}°`;
  }

  private syncControls(): void {
    const r = this.appearance.render;
    this.querySelector<HTMLInputElement>("#tc-scale")!.value = String(r.scale);
    this.querySelector<HTMLInputElement>("#tc-rotation")!.value = String(r.rotationDeg);
    this.querySelector<HTMLInputElement>("#tc-x")!.value = String(r.offsetX);
    this.querySelector<HTMLInputElement>("#tc-y")!.value = String(r.offsetY);
  }

  private startDrag(event: PointerEvent): void {
    if (!(this.previewUrl ?? this.appearance.asset?.publicUrl)) return;
    this.dragging = true;
    this.dragStart = { x: event.clientX, y: event.clientY, ox: this.appearance.render.offsetX, oy: this.appearance.render.offsetY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  private moveDrag(event: PointerEvent): void {
    if (!this.dragging) return;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const ox = Math.max(-2, Math.min(2, this.dragStart.ox + ((event.clientX - this.dragStart.x) / Math.max(1, box.width)) * 2));
    const oy = Math.max(-2, Math.min(2, this.dragStart.oy + ((event.clientY - this.dragStart.y) / Math.max(1, box.height)) * 2));
    this.appearance = TerritoryAppearanceSchema.parse({ ...this.appearance, render: { ...this.appearance.render, offsetX: ox, offsetY: oy } });
    this.querySelector<HTMLInputElement>("#tc-x")!.value = String(ox);
    this.querySelector<HTMLInputElement>("#tc-y")!.value = String(oy);
    this.updatePreview();
  }

  private endDrag(event: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }

  private setStatus(message: string): void {
    const status = this.querySelector<HTMLElement>("#tc-status");
    if (status) status.textContent = message;
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
  }
}

if (!customElements.get("territory-customizer")) {
  customElements.define("territory-customizer", TerritoryCustomizer);
}
