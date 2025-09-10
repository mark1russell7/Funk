# Library Specification

> **Status:** Draft v1.0 (covers all files present as of 2025‑08‑30)
> **Scope:** Functional primitives (Either/Optional, Box/canonicalization), collection utilities, caching helpers, a composable “sponge” accumulator, object guards, and an abstract entangling mechanism.

## 0. Design goals

1. **Ergonomic FP primitives** for error handling (`Either`, `Optional`) and referential wrappers (`Box`), with predictable runtime semantics and strong TypeScript types.
2. **Deterministic collection transforms** that work uniformly across arrays and sets, with clear behavior around identity, duplicates, and order.
3. **Composability over inheritance** (e.g., `sponge`, `collect`, `Entangler`).
4. **Total/“unital” map interfaces** that avoid `undefined` by construction when modeling optional lookups (`OptionalMap`, `OptionalWeakMap`).
5. **Side‑effect boundaries** explicit and narrow (e.g., caching helpers).

---

## 1. Module overview & dependency graph

```
functional/
  self.ts            (identity)
  sponge.ts          (progressive accumulator)

guards/
  object.guard.ts    (isObject type guard)

optional/
  either.ts          (Either ADT + ops)
  optional.ts        (Optional = Either<NotFound, T>)
  collections/
    optional.map.ts       (OptionalMap<K,V>)
    optional.map.weak.ts  (OptionalWeakMap<K extends object, V>)
    optional.map.unital.ts(UnitalOptionalMap<K,V>)

collections/
  collection.ts      (Collection<T, I> wrapper over Array/Set)
  collect.ts         (helper ctor)
  map.unital.ts      (UnitalMap<K,V> baseline interface)

monads/
  box.ts             (Box<T> wrapper, isBoxed, unbox)
  box.canonicalizer.ts (canonicalize via WeakMap)
  top.ts             (Top<T> placeholder)

references/
  entangler.ts       (abstract Entangler<T,B> with OptionalMap)

cache.ts             (cache(store).aside compute-if-absent helper)
memo.ts              (commented-out memoize prototype)
```

*External runtime deps:* none.
*TS target:* ES2020+ recommended (WeakMap, Symbols).

---

## 2. Conventions (normative)

* **Error throwing** is used for programmer‑errors / misuse (e.g., “getOnlyElement” on empty or multi‑element collections). Recoverable absence is modeled as `Optional<T>`.
* **“Unital” interfaces** guarantee a total `get` that **never returns `undefined`** for absence; instead they return an identity element (here: `Optional.none`).
* **Optional** is defined as `Either<NotFound, T>`; absence is value‑typed (not `null`/`undefined`), enabling exhaustiveness with helpers.
* **Box** is a *wrapper object* keyed by a private `Symbol`, not a nominal class; `isBoxed` only tests for the presence of this symbol on an object.

---

## 3. Public API specification (by module)

### 3.1 `functional/self.ts`

```ts
export const self = <T>(x: T): T => x;
```

* **Semantics:** Identity combinator.
* **Complexity:** O(1).
* **Use:** Higher‑order composition, default mappers.

---

### 3.2 `functional/sponge.ts`

```ts
export const sponge = <Pores extends object, Result>(
  pores: Pores,
  squeeze: (filled: Pores) => Result
) => {
  // returns absorb: (water: Partial<Pores>) => Result | absorb
};
```

* **Intent:** Incrementally “absorb” pieces of an object until all declared “pores” (keys of `pores`) are filled. When full, apply `squeeze` to the accumulated object and return its `Result`. Until then, return the same `absorb` function for further feeding.
* **Inputs:**

  * `pores`: shape prototype (only its keys are used; initial values are ignored).
  * `squeeze`: computation executed once all pores are filled (i.e., every key in `pores` is present in the internal accumulator object).
* **Returned function:**
  `absorb(water: Partial<Pores>): Result | typeof absorb`

  * Merges `water` into internal `sponge`.
  * If **full after merge** ⇒ returns `squeeze(sponge as Pores)`.
  * Else ⇒ returns `absorb` (re-entrant).
* **Key invariants:**

  * Keys are considered “filled” if `key in sponge` (value may be `undefined`).
  * Later calls may overwrite earlier values (last write wins).
* **Examples:**

  ```ts
  const fillUser = sponge({ id: 0, name: "" }, ({ id, name }) => ({ id, name }));
  const step1 = fillUser({ id: 42 });      // returns absorb
  const user = step1({ name: "Ada" });     // returns { id: 42, name: "Ada" }
  ```
* **Complexity:** Each call merges via `Object.assign`: O(k) in number of properties provided.

---

### 3.3 `guards/object.guard.ts`

```ts
export const isObject = (value: unknown): value is object =>
  value !== null && typeof value === 'object';
```

* **Semantics:** True for arrays, plain objects, functions with `typeof 'function'`? **No**—functions are not `typeof 'object'`; this guard returns **false** for functions.
* **Caveat:** If function values should be considered “object-like” in some modules, update accordingly or add `isObjectOrFunction`.

---

### 3.4 `optional/either.ts`

**ADT:**

```ts
export type Either<L,R> =
  | { tag: 'Left';  left:  L }
  | { tag: 'Right'; right: R };
```

**Constructors & predicates:**

```ts
left<L, R = never>(l: L): Either<L, R>
right<R, L = never>(r: R): Either<L, R>
isLeft<L, R>(e: Either<L,R>): e is { tag:'Left';  left:L  }
isRight<L, R>(e: Either<L,R>): e is { tag:'Right'; right:R }
```

**Combinators:**

```ts
getOrElse<L,R>(e, defaultVal: R): R
orElse<L,R>(e, f: (l: L) => R): R
orElseThrow<L,R,E extends Error>(e, errorFn: (l: L) => E): R

fold<L,R,T>(e, onLeft: (l:L)=>T, onRight: (r:R)=>T): T
map<L,R,LL,RR>(e, fnLeft: (l:L)=>LL, fnRight: (r:R)=>RR): Either<LL,RR>
mapLeft<L,R,LL>(e, f:(l:L)=>LL): Either<LL,R>
mapRight<L,R,RR>(e, f:(r:R)=>RR): Either<L,RR>
chain<L,R,RR>(e, f:(r:R)=> Either<L,RR>): Either<L,RR>

tapLeft<L,R>(e, fn:(l:L)=>void): Either<L,R>
tapRight<L,R>(e, fn:(r:R)=>void): Either<L,R>
tap<L,R>(e, fnLeft:(l:L)=>void, fnRight:(r:R)=>void): Either<L,R>
```

* **Laws:** Standard Right‑bias. `mapRight`/`chain` act only on Right. `mapLeft` acts only on Left.
* **Error boundaries:** `orElseThrow` throws only on `Left` using lazily created error.

---

### 3.5 `optional/optional.ts`

```ts
export const NotFound: unique symbol = Symbol('NotFound');
export type  TNotFound = typeof NotFound;
export type  Optional<T> = Either<TNotFound, T>;

export const none = <T>(): Optional<T>        => left<TNotFound>(NotFound);
export const some = <T>(v: T): Optional<T>    => right<T>(v);

export const isFound   = <T>(o: Optional<T>): o is Either<never, T> => isRight(o);
export const isDefined = <T>(o: T | undefined): o is T              => o !== undefined;

export const nullable  = <T>(o: T | undefined): Optional<T> =>
  isDefined(o) ? some(o) : none<T>();
```

* **Semantics:** `Optional<T>` models presence/absence without `null`/`undefined`.
* **Interop:** `nullable` bridges `T | undefined` into `Optional<T>`.
* **Pattern:** Prefer `orElse`/`orElseThrow` from `Either` to consume.

---

### 3.6 Optional maps (unital)

**Unital concept:** A “unital” map *never returns `undefined`*. Its `get` has an identity value for absence.

#### 3.6.1 `collections/map.unital.ts`

```ts
export interface UnitalMap<K, V> {
  delete(key: K): boolean;
  get   (key: K): V;
  has   (key: K): boolean;
  set   (key: K, value: V): this;
}
```

* **Semantics:** Minimal “Map‑like” surface with total `get`.

#### 3.6.2 `optional/collections/optional.map.unital.ts`

```ts
export interface UnitalOptionalMap<K, V> extends UnitalMap<K, Optional<V>> {}
```

* **Semantics:** Specialization where `get` returns `Optional<V>`.

#### 3.6.3 `optional/collections/optional.map.ts`

```ts
export class OptionalMap<K, V>
  extends Map<K, Optional<V>>
  implements UnitalOptionalMap<K, V> {
  get(key: K): Optional<V> {
    return super.get(key) ?? none<V>();
  }
}
```

* **Semantics:** Concrete `Map` with total `get`.
* **Complexity:** As native `Map`.

#### 3.6.4 `optional/collections/optional.map.weak.ts`

```ts
export class OptionalWeakMap<K extends object, V>
  extends WeakMap<K, Optional<V>>
  implements UnitalOptionalMap<K, V> {
  get(key: K): Optional<V> {
    return super.get(key) ?? none<V>();
  }
}
```

* **Semantics:** Weakly keyed optional map; keys must be objects; supports GC of entries when keys become unreachable.

---

### 3.7 `collections/collection.ts` and `collect.ts`

**Types:**

```ts
export type CollectionType<T> = T[] | Set<T>;
export class Collection<T, I extends CollectionType<T> = CollectionType<T>> { /*…*/ }
export const collect = <T>(iterable: CollectionType<T>): Collection<T, CollectionType<T>>;
```

**Constructor:**

```ts
new Collection<T, I>(iterable: I)
```

**Core transforms:**

```ts
map<K>(f: (value: T) => K): Collection<K, Set<K>>
filter(f: (value: T) => boolean): Collection<T, Set<T>>
reduce<K>(f: (total: K, value: T) => K, initial: K): K
forEach(f: (value: T) => void): void
every(f: (value: T) => boolean): boolean
some (f: (value: T) => boolean): boolean
without(set: Set<T>): Collection<T, Set<T>>
flatten<K>(): Collection<K, Set<K>> // when elements are Collection<K,…>
```

**Mutation helpers:**

```ts
add(value: T): void   // push if array, add if set
delete(value: T): void// splice if array, delete if set
has(value: T): boolean
clone(): Collection<T, I> // shallow copy; preserves underlying kind (Array vs Set)
pour(set: Collection<T>): this // adds all items into 'set' via set.add(v)
getOnlyElement(): T // throws if size != 1
size(): number
end(): I // returns underlying iterable (live reference)
[Symbol.iterator](): IterableIterator<T>
```

**Semantics & invariants:**

* **`map` and `filter` always return a `Set<…>`**, thus:

  * **Order is lost.**
  * **Duplicates are removed.**
  * This is intentional but *surprising* if the input is an array: document at call sites when order/duplication matters.
* **`flatten`** requires that every element is an instance of `Collection`. If any element isn’t, it throws *during* the validation pass.

  * Current implementation pattern:

    ```ts
    if(!this.isNestedIterable<K>()) throw ...
    ```

    Note: `isNestedIterable` throws on first non‑`Collection` element and then returns `true`. The throw is the only failure path.
* **`clone`** preserves the *shape* of the underlying iterable: `Set` ⇒ new `Set`, `Array` ⇒ new array, with elements shallow‑copied via iteration/spread.
* **`end()`** exposes the *live* underlying iterable; subsequent mutations via class methods affect it directly.

**Complexity:**

* `map`/`filter` O(n).
* `reduce`/`forEach` O(n).
* `add`/`delete`/`has` complexity depends on underlying structure (`Array` O(n) for delete/has; `Set` O(1) average).
* `flatten` O(n + total nested sizes).

**Examples:**

```ts
const xs = collect([1,2,2,3]);
const ys = xs.map(x => x % 2); // Set {1,0}
const only3 = collect(new Set([3])).getOnlyElement(); // 3
```

**Sharp edges and guidance:**

* If you need **array semantics** preserved, add helpers like `mapToArray`, `filterToArray`, or expose a generic `toArray()` conversion step.
* `pour` mutates the *target* collection; intended for fluent pipelines.

---

### 3.8 `monads/box.ts`

```ts
const   BOX     = Symbol('box');
export  type    Box<T>  = Record<typeof BOX, T>;
export  const   box     = <T>(value: T): Box<T>            => ({ [BOX]: value });
export  const   unbox   = <T>(b: Box<T>): T                 => b[BOX];
export  const   isBoxed = (value: any): value is Box<any>   => isObject(value) && BOX in value;
```

* **Semantics:** `Box<T>` is a wrapper object with a single symbol‑keyed property holding `T`.
* **`isBoxed`** detects if an object has the `BOX` symbol; primitives are never “boxed” unless created by `box`.
* **Purposes:**

  * Attach an identity to values (e.g., canonicalization).
  * Distinguish wrapped from unwrapped at runtime.
* **Caveat:** Because `box` returns a *fresh object*, boxing a frozen object is fine (unlike designs that mark the original).

---

### 3.9 `monads/box.canonicalizer.ts`

```ts
import { box, Box, isBoxed } from "./box";
import { isObject } from "../guards/object.guard";

const cannon = new WeakMap<object, Box<any>>();

export function canonicalize<T>(value: T | Box<T>): Box<T> {
  if (isBoxed(value)) return value;
  if (isObject(value)) {
    if (!cannon.has(value)) cannon.set(value, box(value));
    return cannon.get(value)!;
  }
  // primitives: box freshly each time
  return box(value);
}
```

* **Semantics:**

  * **Idempotent for boxes:** already boxed ⇒ return as‑is.
  * **Objects:** stable per‑object canonical boxing via internal `WeakMap`; the *same object reference* yields the *same* `Box`.
  * **Primitives:** no stable identity across calls; each call returns a *fresh* `Box`.
* **Memory behavior:** `WeakMap` allows entries to be GC’d when the object key becomes unreachable.
* **Use cases:** de‑duplication of object identities, binding tables keyed by canonical boxes, reference‑equality caches.

---

### 3.10 `monads/top.ts`

```ts
enum Types { Top, Bottom, None, Some, Number, String, Boolean, Collection, Object, Function, Optional }
export class Top<T> {
  constructor(private readonly value: T, private readonly type: Types = Types.Top) {}
}
```

* **Status:** Placeholder for a type‑tagged lattice/top element.
* **Current behavior:** Opaque container; unused elsewhere.
* **Future direction (non‑normative):** Could model a simple *type domain* for partial evaluation or introspection (top/bottom/constructors).

---

### 3.11 `references/entangler.ts`

```ts
export abstract class Entangler<T, B> {
  protected readonly bindings = new OptionalMap<T, B>();

  /** Tear down for 'set' then rebuild for 'set'. */
  public entangle(set: Collection<T>): void {
    this.unbind(set);
    this.bind(set);
  }

  /** Lookup-or-throw for whatever B is in this mode. */
  public dereference(key: T): B {
    return orElseThrow(this.bindings.get(key), () => new Error(`No entanglement for ${key}`));
  }

  protected abstract unbind(set: Collection<T>): void;
  protected abstract bind  (set: Collection<T>): void;
}
```

* **Semantics:**

  * `bindings`: internal `OptionalMap<T,B>` for established bindings.
  * `entangle(set)`: template method; clears/rebuilds bindings according to subclass policy.
  * `dereference(key)`: *total* accessor by design; throws if missing.
* **Subclass contract (normative):**

  * `bind(set)`: for each `T` in `set`, compute and `bindings.set(t, some(binding))`.
  * `unbind(set)`: undo prior side effects and/or `bindings.delete(t)` for members of `set`. Must be idempotent.
* **Typical usages:**

  * Connecting UI nodes to DOM elements, reactive variables to subscriptions, etc.

---

### 3.12 `cache.ts`

```ts
import { UnitalOptionalMap } from "./optional/collections/optional.map.unital";
import { Optional } from "./optional/optional"

export const cache = <K, V>(store: UnitalOptionalMap<K, V>) => {
  const hit   = (key: K): Optional<V> => store.get(key);
  const probe = (key: K): boolean     => store.has(key);
  const cache = (key: K, value: Optional<V>): void => void store.set(key, value);

  const aside = (lookup: K, value: Optional<V>): Optional<V> => {
    if (!probe(lookup)) {
      cache(lookup, value);
    }
    return hit(lookup);
  };

  return {
    // hit,
    // probe,
    // cache,
    aside
  };
}
```

* **Semantics (`aside`)**: *Compute‑if‑absent* helper that **conditionally** seeds `store` at `lookup` with `value` if no entry exists, then returns the entry from the store.

  * `value` is already an `Optional<V>` (pre‑computed); no thunking.
* **Notes:**

  * `hit`, `probe`, and internal `cache` are intentionally not exported from the factory (commented out).
  * Works with any `UnitalOptionalMap` (`OptionalMap`, `OptionalWeakMap`, custom).
* **Sharp edge:** Because `value` is computed **before** the check, `aside` may do unnecessary work if the key already exists. See §6 for `asideBy` (thunked) suggestion.

---

### 3.13 `memo.ts` (prototype)

Commented reference implementation of argument‑tuple memoization using a `Map<string, ReturnType<T>>` and `JSON.stringify(args)` as the key.

* **Status:** Not part of the public API.
* **Future:** See §6 for a robust, typed `memoize` with pluggable keying.

---

## 4. Behavioral details & edge cases (normative where applicable)

1. **Collections return Sets for `map`/`filter`.** Callers MUST NOT rely on input ordering or duplication preservation in results of these transforms.
2. **`Collection.flatten` requires nested `Collection` instances.** It throws if any element isn’t a `Collection` (check happens eagerly via `isNestedIterable`).
3. **`Box` identity:**

   * Boxes compare by reference equality; `box(1) !== box(1)`.
   * `canonicalize(object)` returns a *stable* `Box` for that **object reference only**.
4. **`OptionalMap`/`OptionalWeakMap` defaults:** `get` **always** returns an `Optional<V>`; `has` indicates whether a key is present regardless of `some` vs `none` payload stored.
5. **`Entangler.dereference` throws on missing binding.** Subclasses SHOULD ensure `entangle()` populates all required keys prior to dereferencing.

---

## 5. Complexity summary

| API                                    | Time (average) | Space notes            |   |            |
| -------------------------------------- | -------------- | ---------------------- | - | ---------- |
| `Collection.map/filter`                | O(n)           | Output Set of size ≤ n |   |            |
| `Collection.reduce/forEach/every/some` | O(n)           |                        |   |            |
| `Collection.add/delete/has` (Array)    | O(n)           | index & splice         |   |            |
| `Collection.add/delete/has` (Set)      | O(1)           |                        |   |            |
| `Collection.flatten`                   | O(n + Σ        | child                  | ) | Output Set |
| `canonicalize(object)`                 | O(1)           | Entry lives in WeakMap |   |            |
| `cache(...).aside`                     | O(1)           | Optional map entry     |   |            |

---

## 6. Recommended extensions (non‑normative, fits current design)

1. **Thunked cache:** avoid eager computation in `aside`.

   ```ts
   export const cacheBy = <K,V>(store: UnitalOptionalMap<K,V>) => {
     const asideBy = (lookup: K, compute: () => Optional<V>): Optional<V> => {
       if (!store.has(lookup)) store.set(lookup, compute());
       return store.get(lookup);
     };
     return { asideBy };
   };
   ```
2. **`Collection` array‑preserving variants:**

   * `mapToArray`, `filterToArray`, or a `toArray()` conversion before mapping when order matters.
3. **`Collection.flatten` ergonomics:** accept iterables (`Iterable<T>`) and/or union discriminate via duck typing rather than `instanceof Collection`.
4. **`isObject` variant for functions:** `isObjectLike` returning true for functions too, if needed by `isBoxed` or others.
5. **Stable box for primitives (optional):** a global `Map` per primitive could provide stable boxes when required; keep off by default for memory.
6. **`Entangler` convenience hooks:**

   * `protected set(t: T, b: B)` helper writing `some(b)`.
   * `protected unset(t: T)` helper deleting.
7. **`memoize` utility:** pluggable keyer, WeakMap path for single object arg, TTL option.

---

## 7. Usage examples

### 7.1 Optional + Either

```ts
import { Optional, some, none, isFound } from "./optional/optional";
import { orElse } from "./optional/either";

function parseIntOpt(s: string): Optional<number> {
  const n = Number.parseInt(s, 10);
  return Number.isNaN(n) ? none<number>() : some(n);
}

const port = orElse(parseIntOpt(process.env.PORT ?? ""), () => 3000);
```

### 7.2 Optional maps & caching

```ts
import { OptionalMap } from "./optional/collections/optional.map";
import { cache } from "./cache";
import { some } from "./optional/optional";

const m = new OptionalMap<string, number>();
const c = cache(m);

// First insert occurs because "a" is absent:
c.aside("a", some(42)); // -> Right(42)

// Second call reads existing (no overwrite):
c.aside("a", some(7));  // -> Right(42)
```

### 7.3 Box + canonicalize

```ts
import { canonicalize } from "./monads/box.canonicalizer";
import { isBoxed, unbox } from "./monads/box";

const obj = { x: 1 };

const b1 = canonicalize(obj);
const b2 = canonicalize(obj);

b1 === b2; // true
isBoxed(b1); // true
unbox(b1) === obj; // true
```

### 7.4 Collection pipelines

```ts
import { collect } from "./collections/collect";

const out = collect([1,2,2,3,4])
  .filter(x => x % 2 === 0)   // Set {2,4}
  .map(x => x * 10)           // Set {20,40}
  .end();                     // returns Set<number>
```

### 7.5 Sponge

```ts
import { sponge } from "./functional/sponge";

type User = { id: number; name: string; email: string };

const absorbUser = sponge<User, string>({ id: 0, name: "", email: "" },
  u => `${u.id}:${u.name}<${u.email}>`
);

const s1 = absorbUser({ id: 1 });
const s2 = s1({ name: "Ada" });
const formatted = s2({ email: "ada@example.com" }); // "1:Ada<ada@example.com>"
```

### 7.6 Entangler subclass

```ts
import { Entangler } from "./references/entangler";
import { Collection } from "./collections/collection";
import { some } from "./optional/optional";

type NodeId = number;
type Binding = { cleanup(): void };

class MyEntangler extends Entangler<NodeId, Binding> {
  protected unbind(set: Collection<NodeId>): void {
    for (const id of set) {
      const b = this.bindings.get(id);
      if (b.tag === "Right") b.right.cleanup();
      this.bindings.delete(id);
    }
  }
  protected bind(set: Collection<NodeId>): void {
    for (const id of set) {
      const binding = /* ... */ { cleanup(){/*...*/} };
      this.bindings.set(id, some(binding));
    }
  }
}
```

---

## 8. Error handling & diagnostics

* **`getOnlyElement`** throws:

  * `"Expected only one element, but found more than one."` if ≥2.
  * `"Expected one element, but found none."` if 0.
* **`Collection` unsupported type:** throws `"Unsupported iterable type"` for unknown `iterable` kinds or in `clone`.
* **`Entangler.dereference`** throws `"No entanglement for ${key}"` when absent.
* **`sponge`** has no explicit errors; incorrectly shaped inputs merely delay “fullness”.

---

## 9. TypeScript typing guarantees

* All combinators are fully generic; `Optional` and `Either` preserve type parameters through `map`/`chain`.
* `Collection<T, I>` carries the *underlying* iterable type `I` through methods that preserve it (`clone`, `end`, `size`, `add`, `delete`, `has`).
* Methods that *change* structure (`map`, `filter`, `flatten`) explicitly return `Set<…>` wrapped in `Collection`.

---

## 10. Testing guidelines (suggested)

1. **Either/Optional:** exhaustiveness tests for `mapLeft/mapRight/chain`, `orElseThrow`.
2. **OptionalMap/OptionalWeakMap:** `get` returns `none` on unknown key; `has` semantics; GC behavior (WeakMap) cannot be asserted directly—rely on type constraints and no strong references.
3. **Collection:**

   * `map/filter` deduplication and order loss verified.
   * `flatten` throws for mixed/flats; succeeds for nested.
   * `clone` independence from original reference.
4. **Box/canonicalize:**

   * Idempotence for `isBoxed`.
   * Stability for the same object; instability for primitives across calls.
5. **Sponge:** partial feeds return the same function; final feed calls `squeeze` exactly once.
6. **Entangler:** subclass binds/unbinds idempotently; `dereference` behavior.

---

## 11. Security & performance considerations

* **`JSON.stringify` keys** (in the draft `memo.ts`) can leak PII in debug tooling and are brittle for non‑serializable args; prefer custom keyers.
* **`end()` exposing internal iterables** allows external mutation; this is intentional. Callers MUST treat the return as mutable and avoid aliasing surprises.
* **`sponge`** uses `Object.assign`; last write wins silently. If you need write‑once semantics, wrap it and assert `!(key in sponge)` before write.

---

## 12. Proposed API additions (backwards compatible)

* **`cacheBy`** (thunked compute, §6).
* **`Collection` conversions:**

  ```ts
  toArray(): T[];
  toSet(): Set<T>;
  ```
* **`Collection` creation helpers:**

  ```ts
  from<T>(iter: Iterable<T>): Collection<T, Set<T>> // or overloads
  ```
* **`Optional` helpers:**

  ```ts
  map<T,U>(o: Optional<T>, f: (t:T)=>U): Optional<U>
  flatMap<T,U>(o: Optional<T>, f: (t:T)=> Optional<U>): Optional<U>
  withDefault<T>(o: Optional<T>, d: T): T
  ```
* **`isObjectLike`** to include functions when desired:

  ```ts
  export const isObjectLike = (v: unknown): v is object | Function =>
    (typeof v === 'function') || (v !== null && typeof v === 'object');
  ```

---

## 13. Versioning & stability

* Treat current modules as **stable** except:

  * `monads/top.ts` (experimental).
  * `memo.ts` (commented prototype).
* Semver policy recommendation:

  * **Patch:** Internal fixes; no behavioral change.
  * **Minor:** Additive APIs (e.g., thunked cache, collection converters).
  * **Major:** Behavior changes (e.g., making `map` preserve arrays) or renames.

---

## 14. Glossary

* **Unital map:** Map whose `get` is total (never `undefined`) by returning an identity element for absence.
* **Canonicalization (Box):** Assigning a stable wrapper identity to object references.
* **Sponge:** Progressive builder that produces a result only when a predeclared set of fields has been provided.

---

## 15. Known nits (implementation notes)

* In `collection.ts`, `isNestedIterable` returns `true` unconditionally but may throw during iteration. This is acceptable but slightly awkward. A clearer shape:

  ```ts
  private assertNested<K>(): asserts this is Collection<Collection<K, CollectionType<K>>, CollectionType<Collection<K, CollectionType<K>>>> {
    for (const item of this.iterable) {
      if (!(item instanceof Collection)) throw new Error('Expected nested iterable, but found flat iterable.');
    }
  }
  // then in flatten<K>(): this.assertNested<K>(); ...
  ```
* In `box.canonicalizer.ts`, the `cannon` variable name appears to be a typo; recommend `canon` or `canonicalTable`.

---

## 16. Minimal quick‑start (README‑style)

```ts
import { collect } from "./collections/collect";
import { some, none, Optional } from "./optional/optional";
import { OptionalMap } from "./optional/collections/optional.map";
import { canonicalize } from "./monads/box.canonicalizer";

// Collections
const evens = collect([1,2,3,4]).filter(n => n % 2 === 0).end(); // Set {2,4}

// Optional maps & caching
const m = new OptionalMap<string, number>();
m.set("answer", some(42));
m.get("missing"); // none<number>()

// Canonical boxes
const o = {};
const b = canonicalize(o); // stable box for 'o'
```

---

If you’d like, I can turn this into a polished `README.md` and `docs/` API reference (with JSDoc‑driven signatures) or add the thunked `cacheBy`, array‑preserving `Collection` variants, and tests aligned to this spec.
