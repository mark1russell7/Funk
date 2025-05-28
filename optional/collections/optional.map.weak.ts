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