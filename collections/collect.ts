import { Collection } from "./collection";
import { CollectionType } from "./collection";

export const collect = <T>(iterable: CollectionType<T>): Collection<T, CollectionType<T>> => new Collection<T, CollectionType<T>>(iterable);
