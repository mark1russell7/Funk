/** The rows of the table of small parts. Each row runs real code of Funk when the page starts. */
import { cache } from "funk/cache";
import { collect } from "funk/collections/collect";
import type { Collection } from "funk/collections/collection";
import { isObject } from "funk/guards/object.guard";
import { isBoxed, unbox } from "funk/monads/box";
import { canonicalize } from "funk/monads/box.canonicalizer";
import { OptionalMap } from "funk/optional/collections/optional.map";
import { none, nullable, some } from "funk/optional/optional";
import { Entangler } from "funk/references/entangler";
import { showEither } from "./format.ts";

/** One example of a row. */
export interface Example {
  readonly code: string;
  readonly run: () => string;
}

/** One row of the table. */
export interface Row {
  readonly id: string;
  readonly name: string;
  readonly what: string;
  readonly file: string;
  readonly examples: readonly Example[];
}

/** A small real `Entangler`: each key gets its upper case text as its binding. */
class Shout extends Entangler<string, string> {
  protected unbind(set: Collection<string>): void {
    for (const key of set) this.bindings.delete(key);
  }
  protected bind(set: Collection<string>): void {
    for (const key of set) this.bindings.set(key, some(key.toUpperCase()));
  }
}

/** This function gives the text of a call, or the text of its throw. */
function attempt(call: () => unknown): string {
  try {
    return String(call());
  } catch (error) {
    return `throws: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/** One seeded store for the examples of `cache`. */
const seeded = new OptionalMap<string, number>();
const { aside } = cache(seeded);
aside("a", some(42));
aside("b", none());

const shared = { x: 1 };
const shout = new Shout();
shout.entangle(collect(["ada"]));

export const ROWS: readonly Row[] = [
  {
    id: "cache",
    name: "cache(store).aside",
    what: "Stores a value on the first call. A later call gets the stored value. A stored none stays too.",
    file: "cache.ts",
    examples: [
      { code: 'aside("a", some(7)) after some(42)', run: () => showEither(aside("a", some(7))) },
      { code: 'aside("b", some(7)) after none()', run: () => showEither(aside("b", some(7))) },
    ],
  },
  {
    id: "optional-map",
    name: "OptionalMap",
    what: "A Map with a total get. A missing key gives none, never undefined.",
    file: "optional/collections/optional.map.ts",
    examples: [{ code: 'new OptionalMap().get("x")', run: () => showEither(new OptionalMap<string, number>().get("x")) }],
  },
  {
    id: "nullable",
    name: "nullable",
    what: "Moves a value that can be undefined into an Optional. It tests only undefined, so null is a value.",
    file: "optional/optional.ts",
    examples: [
      { code: "nullable(undefined)", run: () => showEither(nullable(undefined)) },
      { code: "nullable(null)", run: () => showEither(nullable<null>(null)) },
    ],
  },
  {
    id: "canonicalize",
    name: "canonicalize",
    what: "Gives one Box for each object. A primitive gets a new Box on each call.",
    file: "monads/box.canonicalizer.ts",
    examples: [
      { code: "canonicalize(obj) === canonicalize(obj)", run: () => String(canonicalize(shared) === canonicalize(shared)) },
      { code: "canonicalize(1) === canonicalize(1)", run: () => String(canonicalize(1) === canonicalize(1)) },
      { code: "isBoxed(b) && unbox(b) === obj", run: () => String(isBoxed(canonicalize(shared)) && unbox(canonicalize(shared)) === shared) },
    ],
  },
  {
    id: "guard",
    name: "isObject",
    what: "Is true for arrays and objects. It is false for null and for functions.",
    file: "guards/object.guard.ts",
    examples: [
      { code: "isObject([])", run: () => String(isObject([])) },
      { code: "isObject(() => 0)", run: () => String(isObject(() => 0)) },
    ],
  },
  {
    id: "flatten",
    name: "flatten",
    what: "Joins nested collections into one Set. A value that is not a collection causes a throw.",
    file: "collections/collection.ts",
    examples: [
      { code: "collect([collect([1, 2]), collect([2, 3])]).flatten()", run: () => `Set(${[...collect([collect([1, 2]), collect([2, 3])]).flatten<number>()].join(", ")})` },
      { code: "collect([1]).flatten()", run: () => attempt(() => collect([1]).flatten()) },
    ],
  },
  {
    id: "entangler",
    name: "Entangler",
    what: "A base class that binds a set of keys. A subclass tells how to bind and how to unbind. This row has a small subclass.",
    file: "references/entangler.ts",
    examples: [
      { code: 'dereference("ada") after entangle', run: () => attempt(() => shout.dereference("ada")) },
      { code: 'dereference("bob")', run: () => attempt(() => shout.dereference("bob")) },
    ],
  },
];
