/**
 * The calls of the tile view. Each call runs on a real `Collection`: one wraps an array, and one wraps a Set. This file
 * only reads what the call gave.
 */
import { collect } from "funk/collections/collect";
import type { Collection } from "funk/collections/collection";
import { self } from "funk/functional/self";

/** A value that the visitor can put in the row. */
export interface Tile {
  readonly id: string;
  readonly label: string;
  readonly value: unknown;
  /** The class of the tile on the page. */
  readonly kind: "number" | "string" | "nan" | "object-a" | "object-b";
}

const ada = { name: "ada" };
const adaTwin = { name: "ada" };

export const TILES: readonly Tile[] = [
  { id: "3", label: "3", value: 3, kind: "number" },
  { id: "1", label: "1", value: 1, kind: "number" },
  { id: "2", label: "2", value: 2, kind: "number" },
  { id: "a", label: '"a"', value: "a", kind: "string" },
  { id: "nan", label: "NaN", value: Number.NaN, kind: "nan" },
  { id: "ada", label: "ada", value: ada, kind: "object-a" },
  { id: "twin", label: "ada", value: adaTwin, kind: "object-b" },
];

/** The first row of the page. It has each kind of duplicate. */
export const START: readonly string[] = ["3", "1", "3", "2", "nan", "nan", "ada", "ada", "twin"];

/** This function gives the tile of a value. A value with no tile, such as a type name, gets a tile of its own. */
export function tileOf(value: unknown): Tile {
  return TILES.find((tile) => Object.is(tile.value, value)) ?? { id: String(value), label: JSON.stringify(value), value, kind: "string" };
}

/** What a call gave. */
export interface Outcome {
  /** "Array" or "Set" for a collection, "value" for one value, "error" for a throw. */
  readonly kind: "Array" | "Set" | "value" | "error";
  readonly values: readonly unknown[];
  /** The text of a throw of Funk. */
  readonly error?: string;
  /** True when the result is the object that the collection wraps. */
  readonly same: boolean;
}

/** A call that the visitor can select. */
export interface Op {
  readonly id: string;
  readonly code: string;
  /** What to look for in the two results. */
  readonly lesson: string;
  /** False when the result tiles are not the input tiles, so the page does not mark the input tiles. */
  readonly keepsTiles: boolean;
  readonly call: (c: Collection<unknown>) => unknown;
}

export const OPS: readonly Op[] = [
  { id: "map-self", code: "map(self)", lesson: "The identity map gives a Set on both sides, so the array loses its duplicates. The two ada tiles stay: they are equal, but not the same object.", keepsTiles: true, call: (c) => c.map(self).end() },
  { id: "map-type", code: "map(typeof)", lesson: "Each value becomes its type name, and the Set keeps each name once.", keepsTiles: false, call: (c) => c.map((v) => typeof v).end() },
  { id: "filter", code: "filter(isNumber)", lesson: "The result of filter is also a Set. NaN has the type number, so it stays, once.", keepsTiles: true, call: (c) => c.filter((v) => typeof v === "number").end() },
  { id: "without", code: "without(new Set([3]))", lesson: "The function without is a filter. Each 3 goes, and the other duplicates go too.", keepsTiles: true, call: (c) => c.without(new Set([3])).end() },
  {
    id: "add",
    code: "add(3)",
    lesson: "The array grows by one tile. The Set already has 3, so nothing changes.",
    keepsTiles: true,
    call: (c) => {
      c.add(3);
      return c.end();
    },
  },
  {
    id: "delete",
    code: "delete(3)",
    lesson: "The array loses only its first 3. The Set had one 3, so no 3 stays.",
    keepsTiles: true,
    call: (c) => {
      c.delete(3);
      return c.end();
    },
  },
  {
    id: "delete-nan",
    code: "delete(NaN)",
    lesson: "On the array, has(NaN) is true, but delete(NaN) removes nothing, because delete uses indexOf. The Set removes it.",
    keepsTiles: true,
    call: (c) => {
      c.delete(Number.NaN);
      return c.end();
    },
  },
  { id: "clone", code: "clone()", lesson: "A clone keeps the kind and the duplicates, in a new object. The result is not the same object.", keepsTiles: true, call: (c) => c.clone().end() },
  { id: "end", code: "end()", lesson: "The function end gives the wrapped object itself, not a copy. A change to it changes the collection.", keepsTiles: true, call: (c) => c.end() },
  { id: "only", code: "getOnlyElement()", lesson: "This call throws unless the collection has one value. Remove tiles until one kind stays: the Set passes before the array.", keepsTiles: true, call: (c) => c.getOnlyElement() },
];

/** This function runs a call on a collection. `backing` is the object that the collection wraps. */
function outcomeOf(op: Op, backing: unknown[] | Set<unknown>): Outcome {
  try {
    const result = op.call(collect(backing));
    if (result instanceof Set) return { kind: "Set", values: [...result], same: result === backing };
    if (Array.isArray(result)) return { kind: "Array", values: [...(result as unknown[])], same: result === backing };
    return { kind: "value", values: [result], same: false };
  } catch (error) {
    return { kind: "error", values: [], error: error instanceof Error ? error.message : String(error), same: false };
  }
}

/** One side of the view: the values before the call and the result. */
export interface Side {
  readonly before: readonly unknown[];
  readonly outcome: Outcome;
  /** For each value of `before`, true when the result still has it. */
  readonly kept: readonly boolean[];
}

/** This function marks the values of `before` that the result still has, in sequence. */
export function keptIn(before: readonly unknown[], after: readonly unknown[]): boolean[] {
  let next = 0;
  return before.map((value) => {
    const found = next < after.length && (after[next] === value || Object.is(after[next], value));
    if (found) next += 1;
    return found;
  });
}

function sideOf(op: Op, backing: unknown[] | Set<unknown>): Side {
  const before = [...backing];
  const outcome = outcomeOf(op, backing);
  const marks = op.keepsTiles && outcome.kind !== "error" && outcome.kind !== "value";
  return { before, outcome, kept: marks ? keptIn(before, outcome.values) : before.map(() => true) };
}

/** This function runs a call on the array side and on the Set side, each with a fresh collection. */
export function compare(op: Op, tiles: readonly string[]): { array: Side; set: Side } {
  const values = tiles.map((id) => TILES.find((tile) => tile.id === id)?.value);
  return { array: sideOf(op, [...values]), set: sideOf(op, new Set(values)) };
}
