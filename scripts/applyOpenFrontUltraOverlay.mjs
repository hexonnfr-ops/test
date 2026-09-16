import { readFile, writeFile } from "node:fs/promises";

async function patchFile(path, transforms) {
  let text = await readFile(path, "utf8");
  for (const transform of transforms) {
    if (text.includes(transform.after)) continue;
    if (!text.includes(transform.before)) {
      throw new Error(`Ultra patch anchor not found in ${path}: ${transform.label}`);
    }
    text = text.replace(transform.before, transform.after);
  }
  await writeFile(path, text);
}

// Wire the remaster into the real game startup path. The authoritative worker,
// transport and GameView contracts remain untouched; only renderer settings and
// the local graphics control surface are extended here.
await patchFile("src/client/ClientGameRunner.ts", [
  {
    label: "ultra runtime import",
    before: 'import { ALL_UNIT_TYPES, UnitState } from "./render/types";',
    after:
      'import { ALL_UNIT_TYPES, UnitState } from "./render/types";\nimport { applyUltraRenderOverrides, mountUltraSettingsPanel, readUltraVisualSettings } from "./ultra";',
  },
  {
    label: "apply ultra renderer settings",
    before:
      '    const resolveRenderSettings = (): RenderSettings => {\n      const settings = createRenderSettings();\n      applyGraphicsOverrides(settings, userSettings.graphicsOverrides());\n      return settings;\n    };',
    after:
      '    const resolveRenderSettings = (): RenderSettings => {\n      const settings = createRenderSettings();\n      applyGraphicsOverrides(settings, userSettings.graphicsOverrides());\n      applyUltraRenderOverrides(settings, readUltraVisualSettings());\n      return settings;\n    };',
  },
  {
    label: "mount ultra settings panel",
    before:
      '    // Loaded on demand so lil-gui and the debug GUI stay out of the main bundle.\n    // Two folders: "Effect Editor" and "Render Settings".',
    after:
      '    const disposeUltraSettingsPanel = mountUltraSettingsPanel(() => {\n      regenerateRenderSettings();\n      refreshDerivedGraphics();\n    });\n\n    // Loaded on demand so lil-gui and the debug GUI stay out of the main bundle.\n    // Two folders: "Effect Editor" and "Render Settings".',
  },
  {
    label: "dispose ultra settings panel",
    before:
      '      stopFrameLoop();\n      view.dispose();\n      glCanvas.remove();\n      inputOverlay.remove();',
    after:
      '      stopFrameLoop();\n      disposeUltraSettingsPanel();\n      view.dispose();\n      glCanvas.remove();\n      inputOverlay.remove();',
  },
]);

console.log("OpenFront Ultra renderer integration applied.");
