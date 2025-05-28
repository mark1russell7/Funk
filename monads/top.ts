import { none, NotFound, Optional, TNotFound } from "../optional/optional";

enum Types {
    Top = 'Top',
    Bottom = 'Bottom',
    None = 'None',
    Some = 'Some',
    Number = 'Number',
    String = 'String',
    Boolean = 'Boolean',
    Collection = 'Collection',
    Object = 'Object',
    Function = 'Function',
    Optional = 'Optional'
}

export class Top<T> {
    constructor(
        private readonly value : T,
        private readonly type : Types = Types.Top 
    )
    {}
}
