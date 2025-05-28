import { UnitalMap } from "../../collections/map.unital";
import { Optional } from "../optional";

export interface UnitalOptionalMap<K, V> extends UnitalMap<K, Optional<V>> {}