/**
 * The probe of the three live views. The site check of the Pages workflow starts it in a browser at each width, before
 * the deploy. A failed check stops the deploy.
 *
 * The site check reads this TypeScript file directly. It removes the types and the `export` line, and it starts the
 * result as the body of an async function.
 */

// The site check gives these helpers to the probe. Each element of this page is an HTML element.
declare const check: (name: string, ok: unknown, detail?: unknown) => boolean;
declare const until: <T>(fn: () => T | Promise<T>, ms?: number) => Promise<T>;
declare const $: (selector: string) => HTMLElement | null;
declare const $$: (selector: string) => HTMLElement[];
declare const type: (target: string | Element, text: string) => void;
declare const click: (target: string | Element) => void;

const final = () => $("#rail-final")?.textContent ?? "";
const stop = (id: string) => $(`#stops li[data-step="${id}"]`);
const state = (id: string) => stop(id)?.dataset["state"];
const states = () => $$("#stops li").map((li) => li.dataset["state"]).join(" ");
const route = () => document.querySelector("#rail-trail")?.getAttribute("data-route") ?? "";

// The railway of the order.
check("the first run pays for 3 records", await until(() => final() === "Paid $36"), final());
check("the first run stays on the Right track", route() === "RRRRRR", route());
check("mapLeft is not called on the Right track", state("explain") === "skipped", states());
check("the page says how many steps ran", ($("#rail-calls")?.textContent ?? "").startsWith("Funk called 5 of 6"), $("#rail-calls")?.textContent);

click('#stops button[data-flip="check"]');
check("a flipped step moves the value to the Left track", await until(() => final() === "No sale: the shelf is empty"), final());
check("the route turns Left at the flipped step", route() === "RLLLLL", route());
check("the flipped step ran and failed", state("check") === "failed", states());
check("chain does not call the later steps", state("price") === "skipped" && state("pay") === "skipped", states());
check("mapLeft runs on the Left track", state("explain") === "ran", states());
check("the skipped steps pass the same object", stop("price")?.dataset["same"] === "true" && stop("pay")?.dataset["same"] === "true", states());
check("the page counts the skipped steps", ($("#rail-calls")?.textContent ?? "").includes("It skipped 2."), $("#rail-calls")?.textContent);
click('#stops button[data-flip="check"]');
check("a second click restores the Right track", await until(() => final() === "Paid $36"), final());

type("#rail-input", "three");
check("a word fails at the first step", await until(() => final() === 'No sale: "three" is not a number'), final());
check("a word stops the run at step 1", route() === "LLLLLL" && state("parse") === "failed", `${route()} ${states()}`);
click('#rail-presets [data-preset="card"]');
check("the card preset fails at the payment", await until(() => final() === "No sale: the card was declined"), final());
check("the card preset presses the flip of the payment", $('#stops button[data-flip="pay"]')?.getAttribute("aria-pressed") === "true", states());

// The railway of the lookup: a failure is a real missing entry of an OptionalMap.
click('#rail-tabs [data-mode="lookup"]');
check("the lookup finds the lead", await until(() => final() === "KATHERINE JOHNSON"), final());
click('#stops button[data-flip="team"]');
check("a deleted entry gives NotFound", await until(() => (stop("team")?.querySelector(".stop-out")?.textContent ?? "") === "Left(NotFound)"), stop("team")?.textContent);
check("orElse gives its default after NotFound", final() === "No lead found", final());
click('#rail-tabs [data-mode="order"]');

// Arrays against sets.
const lane = (name: string) => $(`#lane-${name}`);
const after = (name: string) => $$(`#${name}-after .tile`);
check("the row starts with 9 tiles and the Set with 6", $$("#tile-source .tile").length === 9 && $$("#set-before .tile").length === 6, $$("#set-before .tile").length);
check("map(self) on the array gives a Set of 6", lane("array")?.dataset["kind"] === "Set" && lane("array")?.dataset["size"] === "6", lane("array")?.dataset);
check("the array side marks 3 lost duplicates", $$("#array-before .tile.gone").length === 3, $$("#array-before .tile.gone").length);
check("equal objects stay apart and the Set keeps the first-seen order", after("array").map((t) => t.dataset["tile"]).join() === "3,1,2,nan,ada,twin", after("array").map((t) => t.dataset["tile"]).join());

click('#tile-ops [data-op="add"]');
check("add grows the array and not the Set", await until(() => lane("array")?.dataset["size"] === "10" && lane("set")?.dataset["size"] === "6"), `${lane("array")?.dataset["size"]} ${lane("set")?.dataset["size"]}`);
click('#tile-ops [data-op="delete-nan"]');
check("delete(NaN) leaves the array and changes the Set", await until(() => lane("array")?.dataset["size"] === "9" && lane("set")?.dataset["size"] === "5"), `${lane("array")?.dataset["size"]} ${lane("set")?.dataset["size"]}`);
click('#tile-ops [data-op="end"]');
check("end gives the wrapped object itself", await until(() => lane("array")?.dataset["same"] === "true" && lane("array")?.dataset["kind"] === "Array"), lane("array")?.dataset);
click('#tile-ops [data-op="only"]');
check("getOnlyElement shows the real throw", await until(() => ($("#array-after")?.textContent ?? "") === "Expected only one element, but found more than one."), $("#array-after")?.textContent);
click("#tile-clear");
click('#tile-palette [data-add="3"]');
click('#tile-palette [data-add="3"]');
check("two equal tiles pass on the Set and throw on the array", await until(() => lane("set")?.dataset["kind"] === "value" && lane("array")?.dataset["kind"] === "error"), `${lane("set")?.dataset["kind"]} ${lane("array")?.dataset["kind"]}`);
click("#tile-source button");
check("a click removes a tile from the row", await until(() => $$("#tile-source .tile").length === 1), $$("#tile-source .tile").length);
click("#tile-reset");
click('#tile-ops [data-op="map-type"]');
check("map(typeof) gives each type name once", await until(() => after("array").map((t) => t.textContent).join() === '"number","object"'), after("array").map((t) => t.textContent).join());

// The sponge.
const result = () => $("#sponge-result")?.textContent ?? "";
const filled = (pore: string) => $(`#pore-${pore}`)?.getAttribute("data-filled");
const squeezes = () => $("#squeeze-count")?.textContent;
check("the new sponge wants more", result() === "The sponge wants more." && squeezes() === "0", result());
click('#drops [data-drop="extra"]');
check("a key with no pore fills nothing", filled("host") === "false" && filled("port") === "false" && filled("db") === "false", $("#feed-log")?.textContent);
click('#drops [data-drop="host"]');
check("a feed fills its pore and gives the same function", filled("host") === "true" && ($("#feed-log li .gave")?.textContent ?? "") === "absorb, the same function", $("#feed-log")?.textContent);
click('#drops [data-drop="port"]');
click('#drops [data-drop="db"]');
check("the last pore squeezes the sponge", await until(() => result() === "postgres://localhost:5432/shop"), result());
check("the squeeze ran once", squeezes() === "1", squeezes());
click('#drops [data-drop="port2"]');
check("a later feed overwrites and squeezes again", await until(() => result() === "postgres://localhost:6543/shop" && squeezes() === "2"), `${result()} ${squeezes()}`);
click("#sponge-new");
type("#water", '{"db": null}');
click("#water-go");
check("typed water fills a pore", await until(() => filled("db") === "true" && ($("#pore-db-value")?.textContent ?? "") === "null"), $("#pore-db-value")?.textContent);
type("#water", "nope");
click("#water-go");
check("bad JSON shows a problem and feeds nothing", await until(() => ($("#water-problem")?.textContent ?? "").startsWith("This water is not")), $("#water-problem")?.textContent);
click('#drops [data-drop="undef"]');
check("undefined counts as filled", ($("#pore-db-value")?.textContent ?? "") === "undefined", $("#pore-db-value")?.textContent);

// The small parts.
const row = (id: string) => $$(`#parts tr[data-row="${id}"] output`).map((o) => o.textContent);
check("the cache keeps the first value and a stored none", row("cache").join() === "Right(42),Left(NotFound)", row("cache").join());
check("canonicalize gives one Box for an object", row("canonicalize").join() === "true,false,true", row("canonicalize").join());
check("the Entangler binds and throws", row("entangler").join() === "ADA,throws: No entanglement for bob", row("entangler").join());
check("each small part shows a result", $$("#parts output").length >= 13 && $$("#parts output").every((o) => (o.textContent ?? "") !== ""), $$("#parts output").length);

export {};
