
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