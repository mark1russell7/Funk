/** The view of the railway: the two tracks, the stops and the result. Each change runs the pipeline again. */
import { byId, h } from "@mark1russell7/site-pages/chrome";
import { MODES, run, type Mode, type Run, type Stop, type StopState, type Track } from "./railway.ts";

const SVG = "http://www.w3.org/2000/svg";
/** The time of one run of the car along the tracks, in milliseconds. */
const RUN_MS = 1300;

/** The sizes of the drawing. A phone gets a drawing with fewer units, so its numbers stay readable. */
interface Geometry {
  readonly width: number;
  readonly height: number;
  readonly right: number;
  readonly left: number;
  readonly dot: number;
  readonly bend: number;
}

const WIDE: Geometry = { width: 1000, height: 190, right: 56, left: 134, dot: 19, bend: 110 };
const NARROW: Geometry = { width: 400, height: 150, right: 46, left: 112, dot: 15, bend: 40 };

const VERDICT: Readonly<Record<StopState, string>> = {
  ran: "Ran",
  failed: "Ran and went Left",
  skipped: "Not called",
};

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Readonly<Record<string, string | number>>, content?: string): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
  if (content !== undefined) el.textContent = content;
  return el;
}

/** This function gives the path of a run along the tracks. */
function routeOf(result: Run, g: Geometry): string {
  const x = (i: number): number => ((i + 0.5) * g.width) / result.stops.length;
  const y = (track: Track): number => (track === "right" ? g.right : g.left);
  let track: Track = "right";
  let d = `M 0 ${g.right}`;
  result.stops.forEach((stop, i) => {
    d += ` L ${x(i)} ${y(track)}`;
    if (stop.kind !== "end" && stop.track !== track) {
      d += ` C ${x(i) + g.bend / 2} ${y(track)}, ${x(i) + g.bend / 2} ${y(stop.track)}, ${x(i) + g.bend} ${y(stop.track)}`;
      track = stop.track;
    }
  });
  return d;
}

export class RailView {
  private mode: Mode = "order";
  private readonly flips = new Set<string>();
  private frame = 0;
  private readonly input = byId<HTMLInputElement>("rail-input");
  private readonly drawing = byId("rail-svg");
  private readonly stops = byId("stops");
  private readonly narrow = window.matchMedia("(max-width: 640px)");
  private lastRoute = "";

  constructor() {
    this.input.value = "3";
    this.input.addEventListener("input", () => this.render());
    byId("rail-tabs").addEventListener("click", (event) => {
      const tab = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-mode]");
      if (tab) this.setMode(tab.dataset["mode"] as Mode);
    });
    byId("rail-presets").addEventListener("click", (event) => {
      const chip = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-preset]");
      const preset = MODES[this.mode].presets.find((entry) => entry.id === chip?.dataset["preset"]);
      if (!preset) return;
      this.input.value = preset.input;
      this.flips.clear();
      for (const id of preset.flips) this.flips.add(id);
      this.render();
    });
    this.stops.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-flip]");
      const id = button?.dataset["flip"];
      if (id === undefined) return;
      if (!this.flips.delete(id)) this.flips.add(id);
      this.render();
      this.stops.querySelector<HTMLButtonElement>(`button[data-flip="${id}"]`)?.focus();
    });
    this.narrow.addEventListener("change", () => this.render(true));
    this.setMode("order");
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    this.flips.clear();
    this.input.value = MODES[mode].presets[0]?.input ?? "";
    this.render();
  }

  private render(force = false): void {
    const info = MODES[this.mode];
    const result = run(this.mode, this.input.value, this.flips);
    byId("rail-input-label").textContent = info.inputLabel;
    byId("rail-tabs").replaceChildren(
      ...(Object.keys(MODES) as Mode[]).map((mode) =>
        h("button", { type: "button", role: "tab", "data-mode": mode, "aria-selected": String(mode === this.mode) }, MODES[mode].tab),
      ),
    );
    byId("rail-presets").replaceChildren(...info.presets.map((preset) => h("button", { type: "button", class: "chip", "data-preset": preset.id }, preset.label)));
    this.stops.style.setProperty("--stops", String(result.stops.length));
    this.stops.replaceChildren(...result.stops.map((stop, i) => this.stopRow(stop, i)));

    const final = byId("rail-final");
    final.dataset["track"] = result.track;
    final.textContent = result.final;
    byId("rail-track-name").textContent = result.track === "right" ? "Right track" : "Left track";
    const skipped = result.stops.filter((stop) => stop.state === "skipped").length;
    byId("rail-calls").textContent = `Funk called ${result.called.length} of ${result.stops.length} step functions. ${skipped === 0 ? "It skipped none." : `It skipped ${skipped}.`}`;
    this.draw(result, force);
  }

  private stopRow(stop: Stop, i: number): HTMLElement {
    const info = MODES[this.mode];
    const flipped = this.flips.has(stop.id);
    const note =
      stop.kind === "mapLeft"
        ? "Runs only on Left"
        : stop.kind === "mapRight"
          ? "Runs only on Right. It cannot fail."
          : stop.kind === "end"
            ? "Joins the two tracks"
            : stop.same
              ? "Same object passed through"
              : null;
    return h(
      "li",
      { class: `stop is-${stop.state}`, "data-step": stop.id, "data-state": stop.state, "data-same": String(stop.same), "data-track": stop.track },
      h("span", { class: "stop-head" }, h("span", { class: "stop-num", "aria-hidden": "true" }, String(i + 1)), h("code", { class: "stop-call" }, stop.call)),
      h("span", { class: "stop-verdict" }, VERDICT[stop.state]),
      h("output", { class: "stop-out" }, stop.after),
      stop.canFail
        ? h("button", { type: "button", class: "flip", "data-flip": stop.id, "aria-pressed": String(flipped) }, flipped ? info.flipOn : info.flipOff)
        : null,
      note === null ? null : h("span", { class: "stop-note" }, note),
    );
  }

  /** This function draws the tracks and the stops, and sends the car along the route. */
  private draw(result: Run, force: boolean): void {
    const g = this.narrow.matches ? NARROW : WIDE;
    const x = (i: number): number => ((i + 0.5) * g.width) / result.stops.length;
    const route = routeOf(result, g);
    const nodes: SVGElement[] = [
      svg("path", { class: "track track-right", d: `M 0 ${g.right} H ${g.width}` }),
      svg("path", { class: "track track-left", d: `M 0 ${g.left} H ${g.width}` }),
    ];
    result.stops.forEach((stop, i) => {
      if (!stop.canFail) return;
      nodes.push(svg("path", { class: "branch", d: `M ${x(i)} ${g.right} C ${x(i) + g.bend / 2} ${g.right}, ${x(i) + g.bend / 2} ${g.left}, ${x(i) + g.bend} ${g.left}` }));
    });
    const trail = svg("path", { id: "rail-trail", class: `trail on-${result.track}`, d: route, "data-route": result.stops.map((stop) => (stop.track === "right" ? "R" : "L")).join("") });
    nodes.push(trail);
    result.stops.forEach((stop, i) => {
      const cy = stop.kind === "mapLeft" ? g.left : g.right;
      if (stop.kind === "end") {
        nodes.push(svg("rect", { class: "joint", x: x(i) - g.dot, y: g.right - g.dot, width: g.dot * 2, height: g.left - g.right + g.dot * 2, rx: g.dot }));
      } else {
        nodes.push(svg("circle", { class: `dot is-${stop.state}`, cx: x(i), cy, r: g.dot }));
      }
      nodes.push(svg("text", { class: "dot-num", x: x(i), y: (stop.kind === "end" ? (g.right + g.left) / 2 : cy) + g.dot * 0.36 }, String(i + 1)));
    });
    const car = svg("circle", { class: "car", r: g.dot * 0.62, cx: 0, cy: g.right });
    nodes.push(car);
    this.drawing.setAttribute("viewBox", `0 0 ${g.width} ${g.height}`);
    this.drawing.replaceChildren(...nodes);
    const same = route === this.lastRoute && !force;
    this.lastRoute = route;
    this.travel(trail, car, same);
  }

  private travel(trail: SVGPathElement, car: SVGCircleElement, atEnd: boolean): void {
    cancelAnimationFrame(this.frame);
    const total = trail.getTotalLength();
    trail.style.strokeDasharray = String(total);
    const place = (share: number): void => {
      const point = trail.getPointAtLength(total * share);
      car.setAttribute("cx", String(point.x));
      car.setAttribute("cy", String(point.y));
      trail.style.strokeDashoffset = String(total * (1 - share));
    };
    if (atEnd || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      place(1);
      return;
    }
    place(0);
    const start = performance.now();
    const tick = (now: number): void => {
      const share = Math.min(1, (now - start) / RUN_MS);
      place(1 - (1 - share) ** 3);
      if (share < 1) this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
}
