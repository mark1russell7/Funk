export interface UnitalMap<K, V> {
    delete(key: K) : boolean;
    get   (key: K) : V;
    has   (key: K) : boolean;
    set   (key: K, value: V) : this;
};