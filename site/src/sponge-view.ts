/** The view of the sponge: the pores, the feed buttons, the log and the result. */
import { byId, h } from "@mark1russell7/site-pages/chrome";
import { DROPS, Feed, PORES, type Feeding, type Pore, type Water } from "./feed.ts";
import { text } from "./format.ts";

/** The log shows at most this number of lines. */
const MAX_LOG = 6;

/** This function gives the text of water, also for a value of undefined, which JSON leaves out. */
export function waterText(water: Water): string {
  const fields = Object.entries(water).map(([key, value]) => `${key}: ${text(value)}`);
  return `{ ${fields.join(", ")} }`;
}

export class SpongeView {
  private feed = new Feed();
  private readonly log = byId("feed-log");
  private readonly blob = byId("sponge-blob");
  private readonly problem = byId("water-problem");

  constructor() {
    byId("drops").replaceChildren(...DROPS.map((drop) => h("button", { type: "button", class: "chip mono", "data-drop": drop.id }, waterText(drop.water))));
    byId("drops").addEventListener("click", (event) => {
      const id = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-drop]")?.dataset["drop"];
      const drop = DROPS.find((entry) => entry.id === id);
      if (drop) this.give(drop.water);
    });
    byId("water-form").addEventListener("submit", (event) => {
      event.preventDefault();
      this.giveTyped();
    });
    byId("sponge-new").addEventListener("click", () => {
      this.feed = new Feed();
      this.log.replaceChildren();
      this.problem.textContent = "";
      this.render();
    });
    this.render();
  }

  private giveTyped(): void {
    const raw = byId<HTMLInputElement>("water").value;
    try {
      const water: unknown = JSON.parse(raw);
      if (typeof water !== "object" || water === null || Array.isArray(water)) throw new Error("Write one object.");
      this.give(water as Water);
    } catch (error) {
      this.problem.textContent = `This water is not a JSON object. ${error instanceof Error ? error.message : ""}`;
    }
  }

  private give(water: Water): void {
    this.problem.textContent = "";
    const feeding = this.feed.feed(water);
    this.log.prepend(this.logLine(feeding));
    while (this.log.children.length > MAX_LOG) this.log.lastElementChild?.remove();
    this.render();
    if (feeding.gave === "result") {
      this.blob.classList.remove("squeeze");
      void this.blob.getBoundingClientRect();
      this.blob.classList.add("squeeze");
    }
  }

  private logLine(feeding: Feeding): HTMLElement {
    const gave = feeding.gave === "result" ? text(feeding.result) : feeding.sameFunction ? "absorb, the same function" : "absorb";
    return h("li", { "data-gave": feeding.gave }, h("code", {}, `absorb(${waterText(feeding.water)})`), h("span", { class: "gave" }, gave));
  }

  private render(): void {
    const pores = this.feed.pores();
    for (const pore of PORES as readonly Pore[]) {
      const state = pores[pore];
      const group = byId(`pore-${pore}`);
      group.dataset["filled"] = String(state.filled);
      byId(`pore-${pore}-value`).textContent = state.filled ? text(state.value) : "empty";
    }
    const squeezed = this.feed.squeezes > 0;
    const result = byId("sponge-result");
    result.dataset["squeezed"] = String(squeezed);
    result.textContent = this.feed.result ?? "The sponge wants more.";
    byId("squeeze-count").textContent = String(this.feed.squeezes);
  }
}
