import { describe, expect, it } from "vitest";
import { DROPS, Feed, type Water } from "./feed.ts";
import { ROWS } from "./live.ts";
import { MODES, run, runLookup, runOrder } from "./railway.ts";
import { compare, keptIn, OPS, START, tileOf, TILES, type Op } from "./transforms.ts";

const op = (id: string): Op => {
  const found = OPS.find((entry) => entry.id === id);
  if (found === undefined) throw new Error(id);
  return found;
};
const water = (id: string): Water => DROPS.find((drop) => drop.id === id)?.water ?? {};

describe("the railway of the order", () => {
  it("stays on the Right track with a good count", () => {
    const result = runOrder("3", new Set());
    expect(result.final).toBe("Paid $36");
    expect(result.track).toBe("right");
    expect(result.called).toEqual(["parse", "check", "price", "pay", "end"]);
    expect(result.stops.map((stop) => stop.state)).toEqual(["ran", "ran", "ran", "ran", "skipped", "ran"]);
  });

  it("does not call the later steps after a failure", () => {
    const result = runOrder("3", new Set(["check"]));
    expect(result.called).toEqual(["parse", "check", "explain", "end"]);
    expect(result.final).toBe("No sale: the shelf is empty");
    expect(result.stops.map((stop) => stop.state)).toEqual(["ran", "failed", "skipped", "skipped", "ran", "ran"]);
    // The real chain and mapRight give back the same object on the Left track.
    expect(result.stops.find((stop) => stop.id === "price")?.same).toBe(true);
    expect(result.stops.find((stop) => stop.id === "pay")?.same).toBe(true);
  });

  it("tells a bad input from a forced failure", () => {
    expect(runOrder("three", new Set()).final).toBe('No sale: "three" is not a number');
    expect(runOrder("40", new Set()).final).toBe("No sale: the shelf has only 10");
    expect(runOrder("", new Set()).stops[0]?.state).toBe("failed");
    expect(runOrder("2.5", new Set()).stops[1]?.state).toBe("failed");
  });
});

describe("the railway of the lookup", () => {
  it("finds the lead through three OptionalMap tables", () => {
    expect(runLookup("ada", new Set()).final).toBe("KATHERINE JOHNSON");
    expect(runLookup("Grace ", new Set()).final).toBe("MARGARET HAMILTON");
  });

  it("gives NotFound for a missing entry", () => {
    const result = runLookup("ada", new Set(["team"]));
    expect(result.final).toBe("No lead found");
    expect(result.stops[1]?.after).toBe("Left(NotFound)");
    expect(result.called).toEqual(["person", "team", "end"]);
  });

  it("has presets that run", () => {
    for (const mode of ["order", "lookup"] as const) {
      for (const preset of MODES[mode].presets) expect(run(mode, preset.input, new Set(preset.flips)).final).not.toBe("");
    }
  });
});

describe("the tiles", () => {
  it("shows that map(self) gives a Set on both sides", () => {
    const { array, set } = compare(op("map-self"), START);
    expect(array.before).toHaveLength(9);
    expect(set.before).toHaveLength(6);
    expect(array.outcome.kind).toBe("Set");
    expect(set.outcome.kind).toBe("Set");
    expect(array.outcome.values).toHaveLength(6);
    expect(array.kept.filter(Boolean)).toHaveLength(6);
    expect(array.kept[2]).toBe(false);
  });

  it("shows the first-seen order and the two objects", () => {
    const { array } = compare(op("map-self"), START);
    expect(array.outcome.values.map((value) => tileOf(value).id)).toEqual(["3", "1", "2", "nan", "ada", "twin"]);
  });

  it("shows add and delete on each side", () => {
    expect(compare(op("add"), START).array.outcome.values).toHaveLength(10);
    expect(compare(op("add"), START).set.outcome.values).toHaveLength(6);
    const removed = compare(op("delete"), START);
    expect(removed.array.outcome.values).toHaveLength(8);
    expect(removed.array.kept[0]).toBe(false);
    expect(removed.array.kept[2]).toBe(true);
    expect(removed.set.outcome.values).toHaveLength(5);
  });

  it("shows that delete does not remove NaN from an array", () => {
    const { array, set } = compare(op("delete-nan"), START);
    expect(array.outcome.values).toHaveLength(9);
    expect(set.outcome.values).toHaveLength(5);
  });

  it("tells a clone from the wrapped object", () => {
    expect(compare(op("clone"), START).array.outcome.same).toBe(false);
    expect(compare(op("clone"), START).array.outcome.kind).toBe("Array");
    expect(compare(op("end"), START).set.outcome.same).toBe(true);
  });

  it("shows the throw of getOnlyElement and its value", () => {
    expect(compare(op("only"), START).array.outcome.error).toBe("Expected only one element, but found more than one.");
    expect(compare(op("only"), []).set.outcome.error).toBe("Expected one element, but found none.");
    const { array, set } = compare(op("only"), ["3", "3"]);
    expect(array.outcome.kind).toBe("error");
    expect(set.outcome).toMatchObject({ kind: "value", values: [3] });
  });

  it("marks the kept values in sequence", () => {
    expect(keptIn([3, 1, 3], [1, 3])).toEqual([false, true, true]);
    expect(keptIn([Number.NaN, Number.NaN], [Number.NaN])).toEqual([true, false]);
  });

  it("gives a tile for a value without one", () => {
    expect(tileOf("number").label).toBe('"number"');
    expect(TILES.map((tile) => tile.id)).toContain("twin");
  });
});

describe("the sponge", () => {
  it("wants more until each pore is filled, and gives the same function", () => {
    const feed = new Feed();
    expect(feed.feed(water("host"))).toMatchObject({ gave: "absorb", sameFunction: true });
    expect(feed.feed(water("port")).gave).toBe("absorb");
    expect(feed.squeezes).toBe(0);
    expect(feed.feed(water("db"))).toMatchObject({ gave: "result", result: "postgres://localhost:5432/shop" });
    expect(feed.squeezes).toBe(1);
  });

  it("counts undefined as filled, and ignores a key with no pore", () => {
    const feed = new Feed();
    feed.feed(water("undef"));
    expect(feed.pores().db).toEqual({ filled: true, value: undefined });
    feed.feed(water("extra"));
    expect(feed.pores().host.filled).toBe(false);
  });

  it("keeps the last write, and squeezes again after each later feed", () => {
    const feed = new Feed();
    for (const id of ["host", "port", "db", "port2"]) feed.feed(water(id));
    expect(feed.pores().port.value).toBe(6543);
    expect(feed.result).toBe("postgres://localhost:6543/shop");
    expect(feed.squeezes).toBe(2);
  });
});

describe("the small parts", () => {
  const result = (id: string, index: number): string | undefined => ROWS.find((row) => row.id === id)?.examples[index]?.run();

  it("keeps the first value in the cache, also a none", () => {
    expect(result("cache", 0)).toBe("Right(42)");
    expect(result("cache", 1)).toBe("Left(NotFound)");
  });

  it("gives one Box for an object and a new Box for a primitive", () => {
    expect(result("canonicalize", 0)).toBe("true");
    expect(result("canonicalize", 1)).toBe("false");
    expect(result("canonicalize", 2)).toBe("true");
  });

  it("shows the throw of the Entangler and of flatten", () => {
    expect(result("entangler", 0)).toBe("ADA");
    expect(result("entangler", 1)).toBe("throws: No entanglement for bob");
    expect(result("flatten", 0)).toBe("Set(1, 2, 3)");
    expect(result("flatten", 1)).toBe("throws: Expected nested iterable, but found flat iterable.");
  });

  it("gives Some for null", () => {
    expect(result("nullable", 0)).toBe("Left(NotFound)");
    expect(result("nullable", 1)).toBe("Right(null)");
  });
});
