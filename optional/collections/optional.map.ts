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