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


