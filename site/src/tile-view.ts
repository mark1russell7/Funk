/** The view of arrays against sets. The visitor edits one row of tiles and selects a call. Each change runs both sides again. */
import { byId, h } from "@mark1russell7/site-pages/chrome";
import { text } from "./format.ts";
import { compare, OPS, START, tileOf, TILES, type Op, type Side, type Tile } from "./transforms.ts";

/** The row has at most this number of tiles. */
const MAX_TILES = 16;

function tileNode(tile: Tile, gone = false): HTMLElement {
  return h("span", { class: `tile k-${tile.kind}${gone ? " gone" : ""}`, "data-tile": tile.id, "data-gone": gone ? "true" : null }, tile.label);
}

function outcomeLine(op: Op, side: Side): string {
  const { outcome } = side;
  if (outcome.kind === "error") return "Funk threw this error.";
  if (outcome.kind === "value") return "One value";
  const size = `${outcome.kind} of ${outcome.values.length}`;
  if (op.id === "end") return `${size}. The same object.`;
  return `${size}. ${outcome.same ? "The same object, changed." : "A new object."}`;
}

export class TileView {
  private tiles: string[] = [...START];
  private op: Op = OPS[0] as Op;
  private readonly source = byId("tile-source");

  constructor() {
    byId("tile-palette").replaceChildren(
      ...TILES.map((tile) => h("button", { type: "button", class: `tile k-${tile.kind}`, "data-add": tile.id, "aria-label": `Add ${tile.kind.startsWith("object") ? `the ${tile.kind === "object-a" ? "first" : "second"} ada object` : tile.label}` }, tile.label)),
    );
    byId("tile-palette").addEventListener("click", (event) => {
      const id = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-add]")?.dataset["add"];
      if (id !== undefined && this.tiles.length < MAX_TILES) {
        this.tiles.push(id);
        this.render();
      }
    });
    this.source.addEventListener("click", (event) => {
      const index = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-index]")?.dataset["index"];
      if (index === undefined) return;
      this.tiles.splice(Number(index), 1);
      this.render();
    });
    byId("tile-reset").addEventListener("click", () => {
      this.tiles = [...START];
      this.render();
    });
    byId("tile-clear").addEventListener("click", () => {
      this.tiles = [];
      this.render();
    });
    byId("tile-ops").replaceChildren(...OPS.map((op) => h("button", { type: "button", class: "chip mono", "data-op": op.id, "aria-pressed": "false" }, op.code)));
    byId("tile-ops").addEventListener("click", (event) => {
      const id = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-op]")?.dataset["op"];
      const op = OPS.find((entry) => entry.id === id);
      if (op) {
        this.op = op;
        this.render();
      }
    });
    this.render();
  }

  private render(): void {
    this.source.replaceChildren(
      ...this.tiles.map((id, index) => {
        const tile = tileOf(TILES.find((entry) => entry.id === id)?.value);
        return h("button", { type: "button", class: `tile k-${tile.kind}`, "data-index": index, "aria-label": `Remove ${tile.label} at place ${index + 1}` }, tile.label);
      }),
    );
    byId("tile-empty").hidden = this.tiles.length > 0;
    for (const button of document.querySelectorAll<HTMLButtonElement>("#tile-ops button")) button.setAttribute("aria-pressed", String(button.dataset["op"] === this.op.id));
    const { array, set } = compare(this.op, this.tiles);
    this.side("array", array);
    this.side("set", set);
    byId("tile-lesson").textContent = this.op.lesson;
  }

  private side(name: "array" | "set", side: Side): void {
    const lane = byId(`lane-${name}`);
    const { outcome } = side;
    lane.dataset["kind"] = outcome.kind;
    lane.dataset["size"] = String(outcome.values.length);
    lane.dataset["same"] = String(outcome.same);
    byId(`${name}-call`).textContent = `.${this.op.code}`;
    byId(`${name}-before`).replaceChildren(...side.before.map((value, i) => tileNode(tileOf(value), !(side.kept[i] ?? true))));
    const after = byId(`${name}-after`);
    if (outcome.kind === "error") after.replaceChildren(h("span", { class: "thrown" }, outcome.error ?? ""));
    else if (outcome.kind === "value") after.replaceChildren(h("span", { class: "value-out" }, text(outcome.values[0])));
    else after.replaceChildren(...outcome.values.map((value) => tileNode(tileOf(value))));
    byId(`${name}-line`).textContent = outcomeLine(this.op, side);
  }
}
