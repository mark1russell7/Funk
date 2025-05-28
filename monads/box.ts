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