import "./style.css";
import { createApplication } from "@application";
import { CanvasRenderer } from "@rendering";
import { UiShell, QuantityPanel, INVENTORY_SOURCE, SECTOR_NATURAL_SOURCE } from "@ui";

const canvas = document.getElementById("game-canvas");
const uiRoot = document.getElementById("ui-root");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("missing #game-canvas element");
}
if (!(uiRoot instanceof HTMLElement)) {
  throw new Error("missing #ui-root element");
}

const app = createApplication(canvas, uiRoot);
new CanvasRenderer(app);
new UiShell(app);
new QuantityPanel(app, INVENTORY_SOURCE);
new QuantityPanel(app, SECTOR_NATURAL_SOURCE);
app.start();
