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
