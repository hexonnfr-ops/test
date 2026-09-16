import {
  readUltraVisualSettings,
  type UltraVisualSettings,
  writeUltraVisualSettings,
} from "./UltraVisualSettings";

const PANEL_TAG = "openfront-ultra-settings";

function createToggle(
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
): HTMLLabelElement {
  const row = document.createElement("label");
  row.className = "toggle-row";

  const text = document.createElement("span");
  text.textContent = label;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));

  row.append(text, input);
  return row;
}

export function mountUltraSettingsPanel(onChanged: () => void): () => void {
  if (typeof document === "undefined" || document.querySelector(PANEL_TAG)) {
    return () => {};
  }

  const host = document.createElement(PANEL_TAG);
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host { position: fixed; right: 18px; bottom: 18px; z-index: 2147483000; font-family: Inter, system-ui, sans-serif; color: #f5f8fb; }
    button { border: 1px solid rgba(149,201,255,.28); color: inherit; background: linear-gradient(135deg, rgba(10,25,39,.94), rgba(18,47,68,.9)); backdrop-filter: blur(18px); box-shadow: 0 12px 42px rgba(0,0,0,.42), inset 0 1px rgba(255,255,255,.08); border-radius: 13px; cursor: pointer; }
    .launcher { padding: 10px 14px; font-weight: 800; letter-spacing: .12em; font-size: 11px; }
    .panel { width: 286px; margin-bottom: 10px; padding: 14px; border: 1px solid rgba(149,201,255,.22); border-radius: 17px; background: linear-gradient(150deg, rgba(5,14,24,.96), rgba(11,34,50,.92)); backdrop-filter: blur(24px) saturate(130%); box-shadow: 0 24px 70px rgba(0,0,0,.55), inset 0 1px rgba(255,255,255,.07); }
    .hidden { display: none; }
    h2 { margin: 0; font-size: 14px; letter-spacing: .08em; }
    p { margin: 5px 0 12px; color: #91a5b6; font-size: 10px; line-height: 1.4; }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; min-height: 32px; border-top: 1px solid rgba(255,255,255,.055); font-size: 11px; font-weight: 650; letter-spacing: .04em; }
    .toggle-row input { accent-color: #78c8ff; width: 16px; height: 16px; }
    .range-label { display: block; margin-top: 10px; color: #a9bac8; font-size: 10px; }
    input[type=range] { width: 100%; accent-color: #78c8ff; }
    .status { margin-top: 8px; padding: 7px 9px; border-radius: 9px; background: rgba(92,181,255,.08); color: #8fcfff; font-size: 9px; line-height: 1.4; }
  `;

  const panel = document.createElement("section");
  panel.className = "panel hidden";
  const title = document.createElement("h2");
  title.textContent = "OPENFRONT ULTRA";
  const subtitle = document.createElement("p");
  subtitle.textContent = "Renderer remaster controls — gameplay remains authoritative.";
  panel.append(title, subtitle);

  let settings = readUltraVisualSettings();
  const update = (partial: Partial<UltraVisualSettings>): void => {
    settings = writeUltraVisualSettings({ ...settings, ...partial });
    onChanged();
  };

  panel.append(
    createToggle("ULTRA GRAPHICS", settings.ultraGraphics, (value) =>
      update({ ultraGraphics: value }),
    ),
    createToggle("REAL 3D", settings.real3D, (value) => update({ real3D: value })),
    createToggle("BETTER UI / UX", settings.betterUI, (value) =>
      update({ betterUI: value }),
    ),
    createToggle("CINEMATIC EFFECTS", settings.cinematicEffects, (value) =>
      update({ cinematicEffects: value }),
    ),
  );

  const tintLabel = document.createElement("label");
  tintLabel.className = "range-label";
  tintLabel.textContent = `COUNTRY COLOR STRENGTH — ${Math.round(settings.countryColorStrength)}%`;
  const tint = document.createElement("input");
  tint.type = "range";
  tint.min = "0";
  tint.max = "100";
  tint.step = "1";
  tint.value = String(settings.countryColorStrength);
  tint.addEventListener("input", () => {
    const countryColorStrength = Number(tint.value);
    tintLabel.textContent = `COUNTRY COLOR STRENGTH — ${countryColorStrength}%`;
    update({ countryColorStrength });
  });
  panel.append(tintLabel, tint);

  const status = document.createElement("div");
  status.className = "status";
  status.textContent =
    "REAL 3D currently enables the new geometry path configuration. Perspective/depth rendering is the next renderer integration stage.";
  panel.append(status);

  const launcher = document.createElement("button");
  launcher.className = "launcher";
  launcher.type = "button";
  launcher.textContent = "ULTRA";
  launcher.addEventListener("click", () => panel.classList.toggle("hidden"));

  shadow.append(style, panel, launcher);
  document.body.append(host);

  return () => host.remove();
}
