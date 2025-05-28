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
