# Source Catalog (TypeScript)

Generated on 2025-08-30T02:20:45.296Z

## Directory structure (src)

```
├── .git/
│   ├── hooks/

│   ├── info/

│   ├── logs/
│   │   └── refs/
│   │       ├── heads/

│   │       └── remotes/
│   │           └── origin/

│   ├── objects/
│   │   ├── 03/

│   │   ├── 04/

│   │   ├── 0b/

│   │   ├── 17/

│   │   ├── 29/

│   │   ├── 31/

│   │   ├── 35/

│   │   ├── 3b/

│   │   ├── 4d/

│   │   ├── 4f/

│   │   ├── 55/

│   │   ├── 58/

│   │   ├── 63/

│   │   ├── 72/

│   │   ├── 75/

│   │   ├── 8c/

│   │   ├── 96/

│   │   ├── 97/

│   │   ├── 9e/

│   │   ├── bb/

│   │   ├── c8/

│   │   ├── c9/

│   │   ├── ca/

│   │   ├── ce/

│   │   ├── de/

│   │   ├── info/

│   │   └── pack/

│   └── refs/
│       ├── heads/

│       ├── remotes/
│       │   └── origin/

│       └── tags/

├── collections/
│   ├── collect.ts
│   ├── collection.ts
│   └── map.unital.ts
├── functional/
│   ├── self.ts
│   └── sponge.ts
├── guards/
│   └── object.guard.ts
├── monads/
│   ├── box.canonicalizer.ts
│   ├── box.ts
│   └── top.ts
├── optional/
│   ├── collections/
│   │   ├── optional.map.ts
│   │   ├── optional.map.unital.ts
│   │   └── optional.map.weak.ts
│   ├── either.ts
│   └── optional.ts
├── references/
│   └── entangler.ts
├── cache.ts
└── memo.ts
```

## Files

### cache.ts

``` ts

import { UnitalOptionalMap } from "./optional/collections/optional.map.unital";
import { Optional } from "./optional/optional"

export const cache = <K, V>(store : UnitalOptionalMap<K, V>) => {
    const hit   = (key : K) : Optional<V> => store.get(key);
    const probe = (key : K) : boolean => store.has(key);
    const cache = (key : K, value : Optional<V>) : void => void store.set(key, value);
    const aside = (lookup : K, value : Optional<V>) : Optional<V> => {
        if (!probe(lookup)) {
            cache(lookup, value); // want to provide a transform func as input to the outer hof
        }
        return hit(lookup);
    }
    return {
        // hit,
        // probe,
        // cache,
        aside
    };
}
```

### collections/collect.ts

``` ts
import { Collection } from "./collection";
import { CollectionType } from "./collection";

export const collect = <T>(iterable: CollectionType<T>): Collection<T, CollectionType<T>> => new Collection<T, CollectionType<T>>(iterable);

```

### collections/collection.ts

``` ts
import { orElseThrow } from "../optional/either";
import { isFound, none, Optional, some } from "../optional/optional";
export type CollectionType<T> = T[] | Set<T>;

export class Collection<T, I extends CollectionType<T> = CollectionType<T>> {
    constructor(private iterable : I) { }
    map<K>(f : (value : T) => K) : Collection<K, Set<K>> {
        let newSet = new Set<K>();
        for (let v of this.iterable) newSet.add(f(v));
        return new Collection<K, Set<K>>(newSet);
    }
    forEach(f : (value : T) => void) : void {
        for (let v of this.iterable) f(v);
    }
    reduce<K>(f : (total : K, value : T) => K, initial : K) : K {
        let total = initial;
        for (let v of this.iterable) total = f(total, v);
        return total;
    }
    filter(f : (value : T) => boolean) : Collection<T, Set<T>> {
        let newSet = new Set<T>();
        for (let v of this.iterable) if (f(v)) newSet.add(v);
        return new Collection<T, Set<T>>(newSet);
    }
    every(f : (value : T) => boolean) : boolean {
        for (let v of this.iterable) if (!f(v)) return false;
        return true;
    }
    some(f : (value : T) => boolean) : boolean {
        for (let v of this.iterable) if (f(v)) return true;
        return false;
    }
    without(set : Set<T>) : Collection<T, Set<T>> {
        return this.filter((value : T) => !set.has(value));
    }
    add(value : T) : void {
        if (this.isSet()) {
            this.iterable.add(value);
        } else if (this.isArray()) {
            this.iterable.push(value);
        } else {
            throw new Error('Unsupported iterable type');
        }
    }
    delete(value : T) : void {
        if (this.isSet()) {
            this.iterable.delete(value);
        } else if (this.isArray()) {
            const index = this.iterable.indexOf(value);
            if (index !== -1) this.iterable.splice(index, 1);
        } else {
            throw new Error('Unsupported iterable type');
        }
    }
    private isSet() : this is Collection<T, Set<T>> {
        return this.iterable instanceof Set;
    }
    private isArray() : this is Collection<T, Array<T>> {
        return Array.isArray(this.iterable);
    }
    has(value : T) : boolean {
        if (this.isSet()) {
            return this.iterable.has(value);
        } else if (this.isArray()) {
            return this.iterable.includes(value);
        } else {
            throw new Error('Unsupported iterable type');
        }
    }
    clone() : Collection<T, I> {
        if (this.isSet()) {
            return new Collection<T, Set<T>>(new Set(this.iterable)) as Collection<T, I>;
        } else if (this.isArray()) {
            return new Collection<T, Array<T>>([...this.iterable]) as Collection<T, I>;
        } else {
            throw new Error('Unsupported iterable type for cloning');
        }
    }
    isNestedIterable<K>() : this is Collection<Collection<K, CollectionType<K>>, CollectionType<Collection<K, CollectionType<K>>>> {
        this.forEach((item : T) => { 
            if (!(item instanceof Collection)) {
                throw new Error('Expected nested iterable, but found flat iterable.');
            }
        });
        return true;
    }
    flatten<K>() : Collection<K, Set<K>> {
        let newSet = new Set<K>();
        if(!this.isNestedIterable<K>()) {
            throw new Error('Expected nested iterable, but found flat iterable.');
        }
        this.forEach((iterable : Collection<K, CollectionType<K>>) => iterable.forEach((item : K) => newSet.add(item)));
        return new Collection<K, Set<K>>(newSet);
    }
    pour(set : Collection<T>) : this {
        for (let v of this.iterable) set.add(v);
        return this;
    }
    getOnlyElement() : T {
        let result : Optional<T> = none();
        for (let v of this.iterable) {
            if (isFound<T>(result)) {
                throw new Error('Expected only one element, but found more than one.');
            }
            result = some(v);
        }
        return orElseThrow(result, () => new Error('Expected one element, but found none.'));
    }
    size() : number {
        if (this.isSet()) return this.iterable.size;
        if (this.isArray()) return this.iterable.length;
        throw new Error('Unsupported iterable type');
    }
    end() : I {
        return this.iterable;
    }
    [Symbol.iterator]() : IterableIterator<T> {
        return this.iterable[Symbol.iterator]();
    }
}



```

### collections/map.unital.ts

``` ts
export interface UnitalMap<K, V> {
    delete(key: K) : boolean;
    get   (key: K) : V;
    has   (key: K) : boolean;
    set   (key: K, value: V) : this;
};
```

### functional/self.ts

``` ts
export const self = <T>(x : T) : T => x;
```

### functional/sponge.ts

``` ts
export const sponge = <Pores extends object, Result>(
    pores   : Pores, 
    squeeze : (filled : Pores) => Result
  ) => {
  const sponge : Partial<Pores> = {};
  const absorb = (water : Partial<Pores>) => {
    soak(water);
    return full() 
            ? squeeze(sponge as Pores) 
            : absorb;
  }
  const soak      = (water : Partial<Pores>) => Object.assign(sponge, water);
  const filled    = (pore  : string        ) => pore in sponge;
  const full = () => 
    Object
      .keys (pores)
      .every(filled);
  return absorb;
}
```

### guards/object.guard.ts

``` ts
export const isObject = (value: unknown): value is object => value !== null && typeof value === 'object';
```

### memo.ts

``` ts
// export const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
//     const cache = new Map<string, ReturnType<T>>();
//     return ((...args: Parameters<T>): ReturnType<T> => {
//         const key = JSON.stringify(args);
//         if (cache.has(key)) {
//         return cache.get(key)!;
//         }
//         const result = fn(...args);
//         cache.set(key, result);
//         return result;
//     }) as T;
//     }

```

### monads/box.canonicalizer.ts

``` ts
import { cache } from "../cache";
import { isObject } from "../guards/object.guard";
import { box, Box, isBoxed } from "./box";

// const {
//   hit,
//   probe,
//   cache,
//   aside
// } = cache(new WeakMap<object, Box<any>>())

const cannon  = new WeakMap<object, Box<any>>();
export function canonicalize<T>(value: T | Box<T>): Box<T> {
  if (isBoxed (value)) return value;
  if (isObject(value)) {
    if (!cannon.has(value)) 
      cannon.set(value, box(value));
    return cannon.get(value)!;
  }
  // for primitives, just wrap fresh each time
  return box(value);
}

```

### monads/box.ts

``` ts
// export class Box<T> {
//     constructor(public readonly value: T) { }
// }

import { isObject } from "../guards/object.guard";

// const BOX = Symbol('box');

// type BoxedPrimitive<T> = { value : T };
// type BoxBrand = Record<typeof BOX, true>;
// type Boxable<T> = object | BoxedPrimitive<T>;
// export type Box<T> = Boxable<T> & BoxBrand;

// const boxPrimitive = <T>(value: T): BoxedPrimitive<T> => ({ value });

// const isObject = (value: any): value is object => value !== null && typeof value === 'object';

// const coerceToBoxable = <T>(value: T) : Boxable<T> => {
//     if (isObject(value)) {
//         return value;
//     } else {
//         return boxPrimitive(value);
//     }
// }

// export function box<T extends object | number | string | boolean>(value : T) : Box<T> {
//     if (!Object.isExtensible(value)) {
//         throw new Error("Cannot box a non-extensible object");
//     }      
//     const boxable = coerceToBoxable(value);
//     Object.defineProperty(boxable, BOX, {
//         value: true
//     });
//     return boxable as Box<T>;
// }
// export function isBoxed<T>(value: any): value is Box<T> {
//     return isObject(value) && BOX in value && value[BOX] === true;
// }

        const   BOX     = Symbol('box');
export  type    Box<T>  = Record<typeof BOX, T>;
export  const   box     = <T>(value : T     )   : Box<T>            => ({[BOX]: value});
export  const   unbox   = <T>(box   : Box<T>)   : T                 => box[BOX];
export  const   isBoxed =    (value : any   )   : value is Box<any> => isObject(value) && BOX in value;
```

### monads/top.ts

``` ts
import { none, NotFound, Optional, TNotFound } from "../optional/optional";

enum Types {
    Top = 'Top',
    Bottom = 'Bottom',
    None = 'None',
    Some = 'Some',
    Number = 'Number',
    String = 'String',
    Boolean = 'Boolean',
    Collection = 'Collection',
    Object = 'Object',
    Function = 'Function',
    Optional = 'Optional'
}

export class Top<T> {
    constructor(
        private readonly value : T,
        private readonly type : Types = Types.Top 
    )
    {}
}

```

### optional/collections/optional.map.ts

``` ts
import { none, Optional } from "../optional";
import { UnitalOptionalMap } from "./optional.map.unital";

export  class      OptionalMap      <K, V          > 
        extends    Map              <K, Optional<V>> 
        implements UnitalOptionalMap<K, V          >
{
    get(key: K): Optional<V> 
    {
        return super.get(key) ?? none<V>();
    }
}

// export const getOrNone = <K,V>(m: Map<K,V>, k:K): Optional<V> =>
//     m.has(k) ? some(m.get(k)!) : none();
```

### optional/collections/optional.map.unital.ts

``` ts
import { UnitalMap } from "../../collections/map.unital";
import { Optional } from "../optional";

export interface UnitalOptionalMap<K, V> extends UnitalMap<K, Optional<V>> {}
```

### optional/collections/optional.map.weak.ts

``` ts
import { Optional, none } from "../optional";
import { UnitalOptionalMap } from "./optional.map.unital";

export  class      OptionalWeakMap  <K extends object, V          > 
        extends    WeakMap          <K               , Optional<V>>
        implements UnitalOptionalMap<K               , V          > 
{
  public get(key : K) : Optional<V> 
  {
    return super.get(key) ?? none<V>();
  }
}
```

### optional/either.ts

``` ts
export type Either<L,R>
  = { tag : 'Left' ; left  : L }
  | { tag : 'Right'; right : R };

export const left  = <L, R = never>(l : L) : Either<L,R> => ({ tag : 'Left' , left  : l });
export const right = <R, L = never>(r : R) : Either<L,R> => ({ tag : 'Right', right : r });

export const isLeft  = <L, R>(e : Either<L, R>) : e is { tag : 'Left' ; left  : L } => e.tag === 'Left';
export const isRight = <L, R>(e : Either<L, R>) : e is { tag : 'Right'; right : R } => e.tag === 'Right';



export const getOrElse = <L, R>(e : Either<L, R>, defaultVal : R) : R => isRight(e) ? e.right : defaultVal;
export const orElse = <L, R>(e : Either<L, R>, f : (l : L) => R) : R => isRight(e) ? e.right : f(e.left);
export const orElseThrow = <L, R, E extends Error>(e : Either<L, R>, errorFn : (l : L) => E) : R => isRight(e) ? e.right : (() => { throw errorFn(e.left); })();

export const fold = <L, R, T>(
  e : Either<L, R>,
  onLeft  : (l : L) => T,
  onRight : (r : R) => T
) : T => 
  e.tag === 'Right'
    ? onRight(e.right)
    : onLeft (e.left);

export const map = <L, R, LL, RR>(
  e : Either<L, R>,
  fnLeft : (l : L) => LL, 
  fnRight : (r : R) => RR
) : Either<LL, RR> =>
  e.tag === 'Right'
    ? right(fnRight(e.right))
    : left(fnLeft(e.left));

export const mapLeft = <L, R, LL>(
  e : Either<L, R>,
  f : (l : L) => LL
) : Either<LL, R> => 
  e.tag === 'Left'
    ? left(f(e.left))
    : e;

export const mapRight = <L, R, RR>(
  e : Either<L, R>,
  f : (r : R) => RR
) : Either<L, RR> => 
  e.tag === 'Right'
    ? right(f(e.right))
    : e;

export const chain = <L, R, RR>(
  e : Either<L, R>,
  f : (r : R) => Either<L, RR>
) : Either<L, RR> => 
  e.tag === 'Right'
    ? f(e.right)
    : e;

export function tapLeft<L, R>(e : Either<L, R>, fn : (l : L) => void) : Either<L, R> {
  if (isLeft(e)) {
    fn(e.left);
  }
  return e;
}
export function tapRight<L, R>(e : Either<L, R>, fn : (r : R) => void) : Either<L, R> {
  if (isRight(e)) {
    fn(e.right);
  }
  return e;
}
export function tap<L, R>(e : Either<L, R>, fnLeft : (l : L) => void, fnRight : (r : R) => void) : Either<L, R> {
  if (isLeft(e)) {
    fnLeft(e.left);
  } else {
    fnRight(e.right);
  }
  return e;
}

```

### optional/optional.ts

``` ts
import { Either, isRight, left, right } from "./either";

export const NotFound: unique symbol = Symbol('NotFound');
export type TNotFound = typeof NotFound;

export type Optional<T> = Either<TNotFound, T>;

export const none       = <T>()      : Optional<T> => left<TNotFound>(NotFound);
export const some       = <T>(v : T) : Optional<T> => right<T>(v);

export const isFound    = <T>(o : Optional<T>)    : o is Either<never, T> => isRight(o);
export const isDefined  = <T>(o : T | undefined)  : o is T                => o !== undefined;

export const nullable   = <T>(o : T | undefined) : Optional<T> => isDefined(o) 
                                                                    ? some(o) 
                                                                    : none<T>();
```

### references/entangler.ts

``` ts
import { Collection } from "../collections/collection";
import { OptionalMap } from "../optional/collections/optional.map";
import { OptionalWeakMap } from "../optional/collections/optional.map.weak";
import { orElseThrow } from "../optional/either";

export abstract class Entangler<T, B> {
  protected readonly bindings = new OptionalMap<T, B>();

  /** public API: tear down whatever this mode defines, then rebuild */
  public entangle(set: Collection<T>): void {
    this.unbind(set);
    this.bind(set);
  }

  /** lookup-or-throw for whatever B is in this mode */
  public dereference(key: T): B {
    return orElseThrow(this.bindings.get(key), () => new Error(`No entanglement for ${key}`));
  }

  /** “how do I tear down old bindings for this set?” */
  protected abstract unbind(set: Collection<T>): void;

  /** “how do I build new bindings for this set?” */
  protected abstract bind(set: Collection<T>): void;
}

```

