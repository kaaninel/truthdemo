"use strict";
var Backer;
(function (Backer) {
    class Bitfields {
        constructor(flags = 0) {
            this.flags = flags;
        }
        get size() {
            return Math.ceil(Math.log2(this.flags));
        }
        get(index) {
            if (index < 0 || index > 31)
                return false;
            return this.flags & (1 << index) ? true : false;
        }
        set(index, value) {
            if (index < 0 || index > 31)
                return;
            const mask = 1 << index;
            if (value)
                this.flags |= mask;
            else
                this.flags &= ~mask;
        }
        toJSON() { return this.flags; }
        valueOf() { return this.flags; }
        [Symbol.toPrimitive]() { return this.flags; }
        get [Symbol.toStringTag]() { return "Bitfields"; }
    }
    Backer.Bitfields = Bitfields;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    Backer.Schema = {};
    class Code {
        constructor() {
            this.types = [];
            this.prototypes = [];
        }
        static async link(code, ...data) {
            const fetchJSON = async (url) => {
                return await (await fetch(url)).json();
            };
            const instance = Code.load(await fetchJSON(code));
            for (const url of data)
                instance.loadData(await fetchJSON(url));
            return instance;
        }
        static load(data) {
            const code = new Code();
            const prototypes = data[0].map(x => Backer.Prototype.fromJSON(code, x));
            for (const proto of prototypes)
                code.prototypes.push(proto);
            const types = data[1].map(x => Backer.Type.fromJSON(code, x));
            for (const type of types) {
                const id = code.types.push(type) - 1;
                Backer.FutureType.IdMap.set(id, type);
            }
            for (const type of types)
                if (!type.container)
                    Backer.Schema[type.name] = new Backer.PLAAny(type, null);
            return code;
        }
        loadData(data) {
            for (const info of data) {
                const prototypes = info.shift();
                const name = info.shift();
                const prototype = this.prototypes[prototypes.shift()];
                const type = new Backer.Type(this, name, prototype, null, info.shift());
                const generate = (content) => {
                    const clone = new Backer.Type(this, content.name, this.prototypes[prototypes.shift()], Backer.FutureType.$(type), content.aliases.concat(info.shift()));
                    this.types.push(clone);
                    for (const contentType of content.contents)
                        generate(contentType);
                };
                this.types.push(type);
                const bases = prototype.bases.toArray().map(x => x.type);
                for (const base of bases)
                    if (base) {
                        type.aliases.push(...base.aliases);
                        for (const content of base.contents)
                            generate(content);
                    }
                Backer.DataGraph[type.name] = Backer.PLA(type, null);
            }
        }
        toJSON() { return this.types; }
        valueOf() { return this.types.length; }
        [Symbol.toPrimitive]() { return this.types.length; }
        get [Symbol.toStringTag]() { return "Code"; }
    }
    Backer.Code = Code;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    class FutureType {
        constructor(value) {
            this.value = value;
        }
        static $(value) {
            const cached = FutureType.Cache.get(value);
            if (cached)
                return cached;
            const instance = new FutureType(value);
            this.Cache.set(value, instance);
            return instance;
        }
        get type() {
            if (this.value instanceof Backer.Type)
                return this.value;
            return FutureType.IdMap.get(this.value) || null;
        }
        get id() {
            if (this.value instanceof Backer.Type)
                return this.value.id;
            return this.value;
        }
        toJSON() { return this.id; }
        valueOf() { return this.id; }
        [Symbol.toPrimitive]() { return this.id; }
        get [Symbol.toStringTag]() { return "FutureType"; }
    }
    FutureType.Cache = new Map();
    FutureType.IdMap = new Map();
    Backer.FutureType = FutureType;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    Backer.DataGraph = {};
    Backer.typeOf = Symbol("typeOf");
    Backer.value = Symbol("value");
    function PLA(type, parent) {
        return new type.PLAConstructor(type, parent);
    }
    Backer.PLA = PLA;
    class PLAAny extends Backer.TruthTalk.Leaves.Surrogate {
        constructor(type, parent) {
            super();
            this.parent = parent;
            Object.defineProperty(this, Backer.value, {
                value: this.valueParse(type.value),
                enumerable: false,
                configurable: false,
                writable: false
            });
            Object.defineProperty(this, Backer.typeOf, {
                value: type,
                enumerable: false,
                configurable: false,
                writable: false
            });
            Object.defineProperties(this, {
                op: { enumerable: false },
                parent: { enumerable: false },
                _container: { enumerable: false },
            });
            for (const child of type.contents)
                this[child.name] = PLA(child, this);
        }
        valueParse(value) {
            return value;
        }
        instanceof(base) {
            return this[Backer.value] instanceof base || this[Backer.typeOf].is(base);
        }
        ;
        is(base) {
            if (base instanceof Backer.Type)
                return this[Backer.typeOf].is(base);
            return this[Backer.typeOf].is(base[Backer.typeOf]);
        }
        get contents() {
            return Object.values(this);
        }
        get root() {
            let root = this;
            while (root.parent)
                root = root.parent;
            return root;
        }
        [Symbol.hasInstance](value) {
            return this.instanceof(value);
        }
        toJSON() { return this[Backer.value]; }
        valueOf() { return this[Backer.value]; }
        toString() {
            const val = this[Backer.value];
            if (val === null)
                return val;
            return String(val);
        }
        [Symbol.toPrimitive]() { return this[Backer.value]; }
        get [Symbol.toStringTag]() { return "PLA"; }
    }
    Backer.PLAAny = PLAAny;
    class PLAObject extends PLAAny {
        get(type) {
            const recursive = (obj) => {
                if (obj[Backer.typeOf].parallelRoots.some(x => x === type[Backer.typeOf]))
                    return obj;
                for (const child of obj.contents) {
                    const res = recursive(child);
                    if (res)
                        return res;
                }
                return null;
            };
            return recursive(this);
        }
        toJSON() {
            if (this instanceof PLAObject && this.constructor !== PLAObject)
                return this[Backer.value];
            const Obj = Object.assign({}, this);
            if (this[Backer.value] !== null && this[Backer.value] !== undefined)
                Obj.$ = this[Backer.value];
            return Obj;
        }
    }
    Backer.PLAObject = PLAObject;
    class PLAString extends PLAObject {
        valueParse(value) {
            if (value === null)
                return null;
            return JSON.parse(value);
        }
    }
    Backer.PLAString = PLAString;
    class PLANumber extends PLAObject {
        valueParse(value) {
            if (value === null)
                return null;
            return JSON.parse(value);
        }
    }
    Backer.PLANumber = PLANumber;
    class PLABigInt extends PLAObject {
        valueParse(value) {
            if (value === null)
                return null;
            return BigInt(value.substring(1, -1));
        }
    }
    Backer.PLABigInt = PLABigInt;
    class PLABoolean extends PLAObject {
        valueParse(value) {
            if (value === null)
                return null;
            return JSON.parse(value);
        }
    }
    Backer.PLABoolean = PLABoolean;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    class Prototype {
        constructor(code, flags, bases = new Backer.TypeSet(), patterns = new Backer.TypeSet(), parallels = new Backer.TypeSet(), contentsIntrinsic = new Backer.TypeSet()) {
            this.code = code;
            this.flags = flags;
            this.bases = bases;
            this.patterns = patterns;
            this.parallels = parallels;
            this.contentsIntrinsic = contentsIntrinsic;
        }
        static fromJSON(code, serialized) {
            const data = Backer.Serializer.decode(serialized, 5);
            return new Prototype(code, new Backer.Bitfields(data[0]), Backer.TypeSet.fromJSON(data[1]), Backer.TypeSet.fromJSON(data[2]), Backer.TypeSet.fromJSON(data[3]), Backer.TypeSet.fromJSON(data[4]));
        }
        get id() {
            return this.code.prototypes.indexOf(this);
        }
        get hash() {
            return Backer.Util.hash(JSON.stringify(this));
        }
        toJSON() {
            return Backer.Serializer.encode([
                this.flags, this.bases, this.patterns, this.parallels, this.contentsIntrinsic
            ]);
        }
    }
    Backer.Prototype = Prototype;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    var Serializer;
    (function (Serializer) {
        function encode(data) {
            const bf = new Backer.Bitfields();
            const result = [];
            for (let i = -1; ++i < data.length;) {
                const vp = data[i];
                const value = vp && typeof vp === "object" && "toJSON" in vp ? vp.toJSON() : vp;
                const bit = Array.isArray(value) && value.length === 0;
                bf.set(i, bit ? false : true);
                if (!bit)
                    result.push(value);
            }
            result.unshift(bf);
            return result;
        }
        Serializer.encode = encode;
        function decode(data, length) {
            const bf = new Backer.Bitfields(data.shift());
            if (!length || length < 1)
                length = bf.size;
            const result = new Array(length);
            for (let i = -1; ++i < length;) {
                const bit = bf.get(i);
                if (bit)
                    result[i] = data.shift();
                else
                    result[i] = [];
            }
            return result;
        }
        Serializer.decode = decode;
    })(Serializer = Backer.Serializer || (Backer.Serializer = {}));
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    class Type {
        constructor(code, name, prototype, _container = null, aliases = []) {
            this.code = code;
            this.name = name;
            this.prototype = prototype;
            this._container = _container;
            this.aliases = aliases;
        }
        static fromJSON(code, data) {
            return new Type(code, data[2], code.prototypes[data[0]], data[1] ? Backer.FutureType.$(data[1]) : null, data[3]);
        }
        get PLAConstructor() {
            return (this.is(this.code.types[5]) ? Backer.PLABoolean :
                this.is(this.code.types[4]) ? Backer.PLABigInt :
                    this.is(this.code.types[3]) ? Backer.PLANumber :
                        this.is(this.code.types[2]) ? Backer.PLAString :
                            this.is(this.code.types[1]) || this.value == null ? Backer.PLAObject : Backer.PLAAny);
        }
        get container() {
            return this._container && this._container.type;
        }
        /**
         * Stores the array of types that are contained directly by this
         * one. In the case when this type is a list type, this array does
         * not include the list's intrinsic types.
         */
        get contents() {
            return this.code.types.filter(x => x.container === this);
        }
        /**
         * Stores a reference to the type, as it's defined in it's
         * next most applicable type.
         */
        get parallels() {
            return this.prototype.parallels.snapshot();
        }
        /**
         * Stores the array of types from which this type extends.
         * If this Type extends from a pattern, it is included in this
         * array.
         */
        get bases() {
            return this.prototype.bases.snapshot();
        }
        /**
         * Gets an array that contains the patterns that resolve to this type.
         */
        get patterns() {
            return this.prototype.patterns.snapshot();
        }
        /**
         * Gets an array that contains the that share the same containing
         * type as this one.
         */
        get adjacents() {
            return this.code.types.filter(x => x.container !== this.container && x !== this);
        }
        /**
         * Gets an array that contains the types that derive from the
         * this Type instance.
         *
         * The types that derive from this one as a result of the use of
         * an alias are excluded from this array.
         */
        get derivations() {
            return this.code.types.filter(x => x.bases.includes(this));
        }
        /**
         * Stores a reference to the parallel roots of this type.
         * The parallel roots are the endpoints found when
         * traversing upward through the parallel graph.
         */
        get parallelRoots() {
            const roots = [];
            for (const { type } of this.iterate(t => t.parallels))
                if (type !== this && type.parallels.length === 0)
                    roots.push(type);
            return roots;
        }
        /**
         * Gets the first alias stored in the .values array, or null if the
         * values array is empty.
         */
        get value() {
            return this.aliases.length > 0 ? this.aliases[0] : null;
        }
        get id() {
            return this.code.types.indexOf(this);
        }
        get isAnonymous() {
            return this.prototype.flags.get(0);
        }
        get isFresh() {
            return this.prototype.flags.get(1);
        }
        get isList() {
            return this.prototype.flags.get(2);
        }
        /**
         * Stores whether this type represents the intrinsic
         * side of a list.
         */
        get isListIntrinsic() {
            return this.prototype.flags.get(3);
        }
        /**
         * Stores whether this type represents the extrinsic
         * side of a list.
         */
        get isListExtrinsic() {
            return this.prototype.flags.get(4);
        }
        get isPattern() {
            return this.prototype.flags.get(5);
        }
        get isUri() {
            return this.prototype.flags.get(6);
        }
        /**
         * Stores a value that indicates if this Type was directly specified
         * in the document, or if it's existence was inferred.
         */
        get isSpecified() {
            return this.prototype.flags.get(7);
        }
        /** */
        get isOverride() { return this.parallels.length > 0; }
        /** */
        get isIntroduction() { return this.parallels.length === 0; }
        /**
         * Gets a boolean value that indicates whether this Type
         * instance was created from a previous edit frame, and
         * should no longer be used.
         */
        get isDirty() {
            return false;
        }
        /**
         * Performs an arbitrary recursive, breadth-first traversal
         * that begins at this Type instance. Ensures that no types
         * types are yielded multiple times.
         *
         * @param nextFn A function that returns a type, or an
         * iterable of types that are to be visited next.
         * @param reverse An optional boolean value that indicates
         * whether types in the returned array should be sorted
         * with the most deeply visited nodes occuring first.
         *
         * @returns An array that stores the list of types that were
         * visited.
         */
        visit(nextFn, reverse) {
            return Array.from(this.iterate(nextFn, reverse)).map(entry => entry.type);
        }
        /**
         * Performs an arbitrary recursive, breadth-first iteration
         * that begins at this Type instance. Ensures that no types
         * types are yielded multiple times.
         *
         * @param nextFn A function that returns a type, or an iterable
         * of types that are to be visited next.
         * @param reverse An optional boolean value that indicates
         * whether the iterator should yield types starting with the
         * most deeply nested types first.
         *
         * @yields An object that contains a `type` property that is the
         * the Type being visited, and a `via` property that is the Type
         * that was returned in the previous call to `nextFn`.
         */
        *iterate(nextFn, reverse) {
            const yielded = [];
            function* recurse(type, via) {
                if (yielded.includes(type))
                    return;
                if (!reverse) {
                    yielded.push(type);
                    yield { type, via };
                }
                const reduced = nextFn(type);
                if (reduced !== null && reduced !== undefined) {
                    if (reduced instanceof Type)
                        return yield* recurse(reduced, type);
                    for (const nextType of reduced)
                        if (nextType instanceof Type)
                            yield* recurse(nextType, type);
                }
                if (reverse) {
                    yielded.push(type);
                    yield { type, via };
                }
            }
            yield* recurse(this, null);
        }
        /**
         * Queries for a Type that is nested underneath this Type,
         * at the specified type path.
         */
        query(...typePath) {
            let currentType = null;
            for (const typeName of typePath) {
                const nextType = this.contents.find(type => type.name === typeName);
                if (!nextType)
                    break;
                currentType = nextType;
            }
            return currentType;
        }
        /**
         * Checks whether this Type has the specified type
         * somewhere in it's base graph.
         */
        is(baseType) {
            for (const { type } of this.iterate(t => t.bases))
                if (type === baseType)
                    return true;
            return false;
        }
        /**
         * Checks whether the specified type is in this Type's
         * `.contents` property, either directly, or indirectly via
         * the parallel graphs of the `.contents` Types.
         */
        has(type) {
            if (this.contents.includes(type))
                return true;
            for (const containedType of this.contents)
                if (type.name === containedType.name)
                    for (const parallel of containedType.iterate(t => t.parallels))
                        if (parallel.type === type)
                            return true;
            return false;
        }
    }
    Backer.Type = Type;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    class TypeSet extends Set {
        static fromJSON(data) {
            return new TypeSet(data.map(x => Backer.FutureType.$(x)));
        }
        snapshot() {
            return this.toArray().map(x => x.type).filter(x => x);
        }
        toArray() {
            return Array.from(this.values()).sort();
        }
    }
    Backer.TypeSet = TypeSet;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    var Util;
    (function (Util) {
        /**
         * Hash calculation function adapted from:
         * https://stackoverflow.com/a/52171480/133737
         */
        function hash(value, seed = 0) {
            let h1 = 0xDEADBEEF ^ seed;
            let h2 = 0X41C6CE57 ^ seed;
            for (let i = 0; i < value.length; i++) {
                let ch = value.charCodeAt(i);
                h1 = Math.imul(h1 ^ ch, 2654435761);
                h2 = Math.imul(h2 ^ ch, 1597334677);
            }
            h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
            h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
            return 4294967296 * (2097151 & h2) + (h1 >>> 0);
        }
        Util.hash = hash;
    })(Util = Backer.Util || (Backer.Util = {}));
})(Backer || (Backer = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jb2Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9CaXRmaWVsZHMudHMiLCIuLi9zb3VyY2UvQ29kZS50cyIsIi4uL3NvdXJjZS9GdXR1cmVUeXBlLnRzIiwiLi4vc291cmNlL0hlYWRlci50cyIsIi4uL3NvdXJjZS9Qcm90b3R5cGUudHMiLCIuLi9zb3VyY2UvU2VyaWFsaXplci50cyIsIi4uL3NvdXJjZS9UeXBlLnRzIiwiLi4vc291cmNlL1R5cGVTZXQudHMiLCIuLi9zb3VyY2UvVXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsSUFBVSxNQUFNLENBcUNmO0FBckNELFdBQVUsTUFBTTtJQUVmLE1BQWEsU0FBUztRQUVyQixZQUFtQixRQUFRLENBQUM7WUFBVCxVQUFLLEdBQUwsS0FBSyxDQUFJO1FBQUcsQ0FBQztRQUVoQyxJQUFJLElBQUk7WUFFUCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBRUQsR0FBRyxDQUFDLEtBQWE7WUFFaEIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFO2dCQUMxQixPQUFPLEtBQUssQ0FBQztZQUVkLE9BQU8sSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDakQsQ0FBQztRQUVELEdBQUcsQ0FBQyxLQUFhLEVBQUUsS0FBYztZQUVoQyxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUU7Z0JBQzFCLE9BQU87WUFFUixNQUFNLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDO1lBRXhCLElBQUksS0FBSztnQkFDUixJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQzs7Z0JBRW5CLElBQUks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QUFJLENBQUM7WUFFM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQ3JDO2dCQUNDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzdCLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQ3BDLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7YUFDcEM7WUFFRCxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRSxVQUFVLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ25GLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFLFVBQVUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDbkYsT0FBTyxVQUFVLEdBQUcsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDakQsQ0FBQztRQWZlLFNBQUksT0FlbkIsQ0FBQTtJQUNGLENBQUMsRUF0QmdCLElBQUksR0FBSixXQUFJLEtBQUosV0FBSSxRQXNCcEI7QUFBRCxDQUFDLEVBdEJTLE1BQU0sS0FBTixNQUFNLFFBc0JmIiwic291cmNlc0NvbnRlbnQiOlsiXG5uYW1lc3BhY2UgQmFja2VyXG57XG5cdGV4cG9ydCBjbGFzcyBCaXRmaWVsZHNcblx0e1xuXHRcdGNvbnN0cnVjdG9yKHB1YmxpYyBmbGFncyA9IDApIHt9XG5cdFx0XG5cdFx0Z2V0IHNpemUoKVxuXHRcdHtcblx0XHRcdHJldHVybiBNYXRoLmNlaWwoTWF0aC5sb2cyKHRoaXMuZmxhZ3MpKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0KGluZGV4OiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0aWYgKGluZGV4IDwgMCB8fCBpbmRleCA+IDMxKVxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFxuXHRcdFx0cmV0dXJuIHRoaXMuZmxhZ3MgJiAoMSA8PCBpbmRleCkgPyB0cnVlIDogZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdHNldChpbmRleDogbnVtYmVyLCB2YWx1ZTogYm9vbGVhbilcblx0XHR7XG5cdFx0XHRpZiAoaW5kZXggPCAwIHx8IGluZGV4ID4gMzEpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdFxuXHRcdFx0Y29uc3QgbWFzayA9IDEgPDwgaW5kZXg7XG5cdFx0XHRcblx0XHRcdGlmICh2YWx1ZSlcblx0XHRcdFx0dGhpcy5mbGFncyB8PSBtYXNrO1xuXHRcdFx0ZWxzZSBcblx0XHRcdFx0dGhpcy5mbGFncyAmPSB+bWFzaztcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKCkgeyByZXR1cm4gdGhpcy5mbGFnczsgfVxuXHRcdHZhbHVlT2YoKSB7IHJldHVybiB0aGlzLmZsYWdzOyB9XG5cdFx0W1N5bWJvbC50b1ByaW1pdGl2ZV0oKSB7IHJldHVybiB0aGlzLmZsYWdzOyB9XG5cdFx0Z2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkgeyByZXR1cm4gXCJCaXRmaWVsZHNcIjsgfVxuXHR9XG59IiwibmFtZXNwYWNlIEJhY2tlclxue1xuXHRleHBvcnQgY29uc3QgU2NoZW1hOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XG5cdFxuXHRleHBvcnQgY2xhc3MgQ29kZVxuXHR7XG5cdFx0dHlwZXM6IFR5cGVbXSA9IFtdO1xuXHRcdHByb3RvdHlwZXM6IFByb3RvdHlwZVtdID0gW107XG5cdFx0XG5cdFx0c3RhdGljIGFzeW5jIGxpbmsoY29kZTogc3RyaW5nLCAuLi5kYXRhOiBzdHJpbmdbXSlcblx0XHR7XG5cdFx0XHRjb25zdCBmZXRjaEpTT04gPSBhc3luYyAodXJsOiBzdHJpbmcpID0+IFxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gYXdhaXQgKGF3YWl0IGZldGNoKHVybCkpLmpzb24oKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Y29uc3QgaW5zdGFuY2UgPSBDb2RlLmxvYWQoYXdhaXQgZmV0Y2hKU09OKGNvZGUpKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCB1cmwgb2YgZGF0YSlcblx0XHRcdFx0aW5zdGFuY2UubG9hZERhdGEoYXdhaXQgZmV0Y2hKU09OKHVybCkpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gaW5zdGFuY2U7XG5cdFx0fVxuXHRcdFxuXHRcdHN0YXRpYyBsb2FkKGRhdGE6IFtQcm90b3R5cGVKU09OW10sIFR5cGVKU09OW11dKVxuXHRcdHtcblx0XHRcdGNvbnN0IGNvZGUgPSBuZXcgQ29kZSgpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBwcm90b3R5cGVzID0gZGF0YVswXS5tYXAoeCA9PiBQcm90b3R5cGUuZnJvbUpTT04oY29kZSwgeCkpO1xuXHRcdFx0Zm9yIChjb25zdCBwcm90byBvZiBwcm90b3R5cGVzKVxuXHRcdFx0XHRjb2RlLnByb3RvdHlwZXMucHVzaChwcm90byk7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHR5cGVzID0gZGF0YVsxXS5tYXAoeCA9PiBUeXBlLmZyb21KU09OKGNvZGUsIHgpKTtcblx0XHRcdGZvciAoY29uc3QgdHlwZSBvZiB0eXBlcylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgaWQgPSBjb2RlLnR5cGVzLnB1c2godHlwZSkgLSAxO1xuXHRcdFx0XHRGdXR1cmVUeXBlLklkTWFwLnNldChpZCwgdHlwZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgdHlwZSBvZiB0eXBlcylcblx0XHRcdFx0aWYgKCF0eXBlLmNvbnRhaW5lcilcblx0XHRcdFx0XHRTY2hlbWFbdHlwZS5uYW1lXSA9IG5ldyBQTEFBbnkodHlwZSwgbnVsbCk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBjb2RlO1xuXHRcdH1cblx0XHRcblx0XHRsb2FkRGF0YShkYXRhOiBEYXRhSlNPTltdKVxuXHRcdHtcdFxuXHRcdFx0Zm9yIChjb25zdCBpbmZvIG9mIGRhdGEpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHByb3RvdHlwZXMgPSBpbmZvLnNoaWZ0KCkgYXMgbnVtYmVyW107XG5cdFx0XHRcdGNvbnN0IG5hbWUgPSBpbmZvLnNoaWZ0KCkgYXMgc3RyaW5nO1xuXHRcdFx0XHRjb25zdCBwcm90b3R5cGUgPSB0aGlzLnByb3RvdHlwZXNbcHJvdG90eXBlcy5zaGlmdCgpIV07XG5cdFx0XHRcdGNvbnN0IHR5cGUgPSBuZXcgVHlwZShcblx0XHRcdFx0XHR0aGlzLCBcblx0XHRcdFx0XHRuYW1lLCBcblx0XHRcdFx0XHRwcm90b3R5cGUsIFxuXHRcdFx0XHRcdG51bGwsXG5cdFx0XHRcdFx0aW5mby5zaGlmdCgpIGFzIHN0cmluZ1tdXG5cdFx0XHRcdCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBnZW5lcmF0ZSA9IChjb250ZW50OiBUeXBlKSA9PiBcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IGNsb25lID0gbmV3IFR5cGUoXG5cdFx0XHRcdFx0XHR0aGlzLFxuXHRcdFx0XHRcdFx0Y29udGVudC5uYW1lLFxuXHRcdFx0XHRcdFx0dGhpcy5wcm90b3R5cGVzW3Byb3RvdHlwZXMuc2hpZnQoKSFdLFxuXHRcdFx0XHRcdFx0RnV0dXJlVHlwZS4kKHR5cGUpLFxuXHRcdFx0XHRcdFx0Y29udGVudC5hbGlhc2VzLmNvbmNhdCg8c3RyaW5nW10+aW5mby5zaGlmdCgpKVxuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0dGhpcy50eXBlcy5wdXNoKGNsb25lKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRmb3IgKGNvbnN0IGNvbnRlbnRUeXBlIG9mIGNvbnRlbnQuY29udGVudHMpXG5cdFx0XHRcdFx0XHRnZW5lcmF0ZShjb250ZW50VHlwZSk7XG5cdFx0XHRcdH07XG5cdFx0XHRcdFxuXHRcdFx0XHR0aGlzLnR5cGVzLnB1c2godHlwZSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBiYXNlcyA9IHByb3RvdHlwZS5iYXNlcy50b0FycmF5KCkubWFwKHggPT4geC50eXBlKTtcblx0XHRcdFx0Zm9yIChjb25zdCBiYXNlIG9mIGJhc2VzKVxuXHRcdFx0XHRcdGlmIChiYXNlKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHR5cGUuYWxpYXNlcy5wdXNoKC4uLmJhc2UuYWxpYXNlcyk7XG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IGNvbnRlbnQgb2YgYmFzZS5jb250ZW50cylcblx0XHRcdFx0XHRcdFx0Z2VuZXJhdGUoY29udGVudCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0RGF0YUdyYXBoW3R5cGUubmFtZV0gPSBQTEEodHlwZSwgbnVsbCkgYXMgT2JqZWN0VHlwZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKCkgeyByZXR1cm4gdGhpcy50eXBlczsgfVxuXHRcdHZhbHVlT2YoKSB7IHJldHVybiB0aGlzLnR5cGVzLmxlbmd0aDsgfVxuXHRcdFtTeW1ib2wudG9QcmltaXRpdmVdKCkgeyByZXR1cm4gdGhpcy50eXBlcy5sZW5ndGg7IH1cblx0XHRnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKSB7IHJldHVybiBcIkNvZGVcIjsgfVxuXHR9XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyIFxue1xuXHRleHBvcnQgdHlwZSBUeXBlaXNoID0gVHlwZSB8IG51bWJlcjtcblx0XG5cdGV4cG9ydCBjbGFzcyBGdXR1cmVUeXBlIFxuXHR7XG5cdFx0c3RhdGljIENhY2hlID0gbmV3IE1hcDxUeXBlaXNoLCBGdXR1cmVUeXBlPigpO1xuXHRcdHN0YXRpYyBJZE1hcCA9IG5ldyBNYXA8bnVtYmVyLCBUeXBlPigpO1xuXHRcdFxuXHRcdHN0YXRpYyAkKHZhbHVlOiBUeXBlaXNoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGNhY2hlZCA9IEZ1dHVyZVR5cGUuQ2FjaGUuZ2V0KHZhbHVlKTtcblx0XHRcdFxuXHRcdFx0aWYgKGNhY2hlZClcblx0XHRcdFx0cmV0dXJuIGNhY2hlZDtcblx0XHRcdFx0XG5cdFx0XHRjb25zdCBpbnN0YW5jZSA9IG5ldyBGdXR1cmVUeXBlKHZhbHVlKTtcblx0XHRcdHRoaXMuQ2FjaGUuc2V0KHZhbHVlLCBpbnN0YW5jZSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBpbnN0YW5jZTtcblx0XHR9IFxuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKHByaXZhdGUgdmFsdWU6IFR5cGVpc2gpIHt9XG5cdFx0XG5cdFx0Z2V0IHR5cGUoKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLnZhbHVlIGluc3RhbmNlb2YgVHlwZSlcblx0XHRcdFx0cmV0dXJuIHRoaXMudmFsdWU7XG5cdFx0XHRcblx0XHRcdHJldHVybiBGdXR1cmVUeXBlLklkTWFwLmdldCh0aGlzLnZhbHVlKSB8fCBudWxsO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaWQoKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLnZhbHVlIGluc3RhbmNlb2YgVHlwZSlcblx0XHRcdFx0cmV0dXJuIHRoaXMudmFsdWUuaWQ7XG5cdFx0XHRcdFxuXHRcdFx0cmV0dXJuIHRoaXMudmFsdWU7XG5cdFx0fVxuXHRcdFxuXHRcdFxuXHRcdHRvSlNPTigpIHsgcmV0dXJuIHRoaXMuaWQ7IH1cblx0XHR2YWx1ZU9mKCkgeyByZXR1cm4gdGhpcy5pZDsgfVxuXHRcdFtTeW1ib2wudG9QcmltaXRpdmVdKCkgeyByZXR1cm4gdGhpcy5pZDsgfVxuXHRcdGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpIHsgcmV0dXJuIFwiRnV0dXJlVHlwZVwiOyB9XG5cdH1cbn0iLCJcbnR5cGUgQ29uc3RydWN0b3I8VCA9IGFueT4gPSB7IG5ldyAoLi4uYXJnczogYW55W10pOiBUIH07XG5cbm5hbWVzcGFjZSBCYWNrZXJcbntcblx0ZXhwb3J0IHR5cGUgUExBVHlwZXMgPSBQTEFCb29sZWFuIHwgUExBQmlnSW50IHwgUExBTnVtYmVyIHwgUExBU3RyaW5nIHwgUExBT2JqZWN0IHwgUExBQW55O1xuXHRcblx0ZXhwb3J0IHR5cGUgT2JqZWN0VHlwZTxUIGV4dGVuZHMgUExBT2JqZWN0ID0gUExBT2JqZWN0PiA9IFQgJiBSZWNvcmQ8c3RyaW5nLCBUPjtcblx0ZXhwb3J0IGNvbnN0IERhdGFHcmFwaDogUmVjb3JkPHN0cmluZywgT2JqZWN0VHlwZT4gPSB7fTtcblx0XG5cdGV4cG9ydCBjb25zdCB0eXBlT2YgPSBTeW1ib2woXCJ0eXBlT2ZcIik7XG5cdGV4cG9ydCBjb25zdCB2YWx1ZSA9IFN5bWJvbChcInZhbHVlXCIpO1xuXHRcblx0ZXhwb3J0IGZ1bmN0aW9uIFBMQSh0eXBlOiBUeXBlLCBwYXJlbnQ6IE9iamVjdFR5cGUgfCBudWxsKVxuXHR7XG5cdFx0cmV0dXJuIG5ldyB0eXBlLlBMQUNvbnN0cnVjdG9yKHR5cGUsIHBhcmVudCk7XG5cdH1cblx0XG5cdGV4cG9ydCBjbGFzcyBQTEFBbnk8VCA9IHN0cmluZz4gZXh0ZW5kcyBUcnV0aFRhbGsuTGVhdmVzLlN1cnJvZ2F0ZVxuXHR7IFxuXHRcdHJlYWRvbmx5IFt0eXBlT2ZdOiBUeXBlO1xuXHRcdHJlYWRvbmx5IFt2YWx1ZV06IFQgfCBudWxsO1xuXHRcdFxuXHRcdHByb3RlY3RlZCB2YWx1ZVBhcnNlKHZhbHVlOiBzdHJpbmcgfMKgbnVsbCk6IFQgfCBudWxsXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHZhbHVlIGFzIGFueTtcblx0XHR9XG5cdFx0XG5cdFx0aW5zdGFuY2VvZihiYXNlOiBhbnkpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXNbdmFsdWVdIGluc3RhbmNlb2YgYmFzZSB8fMKgdGhpc1t0eXBlT2ZdLmlzKGJhc2UpOyBcblx0XHR9O1xuXHRcdFxuXHRcdGlzKGJhc2U6IFR5cGUgfMKgUExBVHlwZXMpXG5cdFx0e1xuXHRcdFx0aWYgKGJhc2UgaW5zdGFuY2VvZiBUeXBlKVxuXHRcdFx0XHRyZXR1cm4gdGhpc1t0eXBlT2ZdLmlzKGJhc2UpO1xuXHRcdFx0cmV0dXJuIHRoaXNbdHlwZU9mXS5pcyhiYXNlW3R5cGVPZl0pO1xuXHRcdH1cblx0XHRcblx0XHRjb25zdHJ1Y3Rvcih0eXBlOiBUeXBlLCBwdWJsaWMgcGFyZW50OiBPYmplY3RUeXBlIHwgbnVsbClcblx0XHR7XHRcblx0XHRcdHN1cGVyKCk7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgdmFsdWUsIHtcblx0XHRcdFx0dmFsdWU6IHRoaXMudmFsdWVQYXJzZSh0eXBlLnZhbHVlKSxcblx0XHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXG5cdFx0XHRcdHdyaXRhYmxlOiBmYWxzZVxuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCB0eXBlT2YsIHtcblx0XHRcdFx0dmFsdWU6IHR5cGUsXG5cdFx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuXHRcdFx0XHR3cml0YWJsZTogZmFsc2Vcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG5cdFx0XHRcdG9wOiB7IGVudW1lcmFibGU6IGZhbHNlIH0sXG5cdFx0XHRcdHBhcmVudDogeyBlbnVtZXJhYmxlOiBmYWxzZSB9LFxuXHRcdFx0XHRfY29udGFpbmVyOiB7IGVudW1lcmFibGU6IGZhbHNlIH0sXG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiB0eXBlLmNvbnRlbnRzKVxuXHRcdFx0XHQoPGFueT50aGlzKVtjaGlsZC5uYW1lXSA9IFBMQShjaGlsZCwgPGFueT50aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGNvbnRlbnRzKCk6IEFycmF5PFBMQVR5cGVzPlxuXHRcdHtcblx0XHRcdHJldHVybiBPYmplY3QudmFsdWVzKHRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgcm9vdCgpXG5cdFx0e1xuXHRcdFx0bGV0IHJvb3Q6IFBMQU9iamVjdCA9IDxhbnk+dGhpcztcblx0XHRcdFxuXHRcdFx0d2hpbGUgKHJvb3QucGFyZW50KSBcblx0XHRcdFx0cm9vdCA9IHJvb3QucGFyZW50O1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gcm9vdDtcblx0XHR9XG5cdFx0XG5cdFx0W1N5bWJvbC5oYXNJbnN0YW5jZV0odmFsdWU6IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5pbnN0YW5jZW9mKHZhbHVlKTtcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKCk6IGFueSB7IHJldHVybiB0aGlzW3ZhbHVlXTsgfVxuXHRcdHZhbHVlT2YoKSB7IHJldHVybiB0aGlzW3ZhbHVlXTsgfVxuXHRcdHRvU3RyaW5nKCkgXG5cdFx0e1xuXHRcdFx0Y29uc3QgdmFsID0gdGhpc1t2YWx1ZV07XG5cdFx0XHRpZiAodmFsID09PSBudWxsKVxuXHRcdFx0XHRyZXR1cm4gdmFsO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gU3RyaW5nKHZhbCk7XG5cdFx0fVxuXHRcdFtTeW1ib2wudG9QcmltaXRpdmVdKCkgeyByZXR1cm4gdGhpc1t2YWx1ZV07IH1cblx0XHRnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKSB7IHJldHVybiBcIlBMQVwiOyB9XG5cdH1cblx0XG5cdGV4cG9ydCBjbGFzcyBQTEFPYmplY3Q8VCA9IFN0cmluZz4gZXh0ZW5kcyBQTEFBbnk8VD5cblx0e1x0XG5cdFx0Z2V0KHR5cGU6IFBMQUFueSk6IFBMQU9iamVjdCB8wqBudWxsXG5cdFx0e1x0XHRcblx0XHRcdGNvbnN0IHJlY3Vyc2l2ZSA9IChvYmo6IFBMQU9iamVjdCk6IFBMQU9iamVjdCB8IG51bGwgPT4gXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChvYmpbdHlwZU9mXS5wYXJhbGxlbFJvb3RzLnNvbWUoeCA9PiB4ID09PSB0eXBlW3R5cGVPZl0pKVxuXHRcdFx0XHRcdHJldHVybiBvYmo7XG5cdFx0XHRcdFxuXHRcdFx0XHRmb3IgKGNvbnN0IGNoaWxkIG9mIG9iai5jb250ZW50cylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IHJlcyA9IHJlY3Vyc2l2ZSg8UExBT2JqZWN0PmNoaWxkKTtcdFxuXHRcdFx0XHRcdGlmIChyZXMpXG5cdFx0XHRcdFx0XHRyZXR1cm4gcmVzO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdHJldHVybiByZWN1cnNpdmUoPGFueT50aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0XG5cdFx0dG9KU09OKCk6IGFueSBcblx0XHR7IFxuXHRcdFx0aWYgKHRoaXMgaW5zdGFuY2VvZiBQTEFPYmplY3QgJiYgdGhpcy5jb25zdHJ1Y3RvciAhPT0gUExBT2JqZWN0KVxuXHRcdFx0XHRyZXR1cm4gdGhpc1t2YWx1ZV07XG5cdFx0XHRcdFxuXHRcdFx0Y29uc3QgT2JqOiBSZWNvcmQ8c3RyaW5nLCBQTEFPYmplY3Q+ICYgeyAkOiBhbnkgfSA9IDxhbnk+T2JqZWN0LmFzc2lnbih7fSwgdGhpcyk7XG5cdFx0XHRpZiAodGhpc1t2YWx1ZV0gIT09IG51bGwgJibCoHRoaXNbdmFsdWVdICE9PSB1bmRlZmluZWQgKSBcblx0XHRcdFx0T2JqLiQgPSB0aGlzW3ZhbHVlXTtcblx0XHRcdHJldHVybiBPYmo7IFxuXHRcdH1cblx0fVxuXHRcblx0ZXhwb3J0IGNsYXNzIFBMQVN0cmluZyBleHRlbmRzIFBMQU9iamVjdFxuXHR7IFxuXHRcdHByb3RlY3RlZCB2YWx1ZVBhcnNlKHZhbHVlOiBzdHJpbmcgfMKgbnVsbClcblx0XHR7XG5cdFx0XHRpZiAodmFsdWUgPT09IG51bGwpXG5cdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0cmV0dXJuIEpTT04ucGFyc2UodmFsdWUpO1xuXHRcdH1cblx0fVxuXHRcblx0ZXhwb3J0IGNsYXNzIFBMQU51bWJlciBleHRlbmRzIFBMQU9iamVjdDxudW1iZXI+XG5cdHtcblx0XHRwcm90ZWN0ZWQgdmFsdWVQYXJzZSh2YWx1ZTogc3RyaW5nIHzCoG51bGwpXG5cdFx0e1xuXHRcdFx0aWYgKHZhbHVlID09PSBudWxsKVxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdHJldHVybiBKU09OLnBhcnNlKHZhbHVlKTtcblx0XHR9XG5cdH1cblx0XG5cdGV4cG9ydCBjbGFzcyBQTEFCaWdJbnQgZXh0ZW5kcyBQTEFPYmplY3Q8YmlnaW50PlxuXHR7IFxuXHRcdHByb3RlY3RlZCB2YWx1ZVBhcnNlKHZhbHVlOiBzdHJpbmcgfMKgbnVsbClcblx0XHR7XG5cdFx0XHRpZiAodmFsdWUgPT09IG51bGwpXG5cdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0cmV0dXJuIEJpZ0ludCh2YWx1ZS5zdWJzdHJpbmcoMSwgLTEpKTtcblx0XHR9XG5cdH1cblx0XG5cdGV4cG9ydCBjbGFzcyBQTEFCb29sZWFuIGV4dGVuZHMgUExBT2JqZWN0PGJvb2xlYW4+XG5cdHtcblx0XHRwcm90ZWN0ZWQgdmFsdWVQYXJzZSh2YWx1ZTogc3RyaW5nIHzCoG51bGwpXG5cdFx0e1xuXHRcdFx0aWYgKHZhbHVlID09PSBudWxsKVxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdHJldHVybiBKU09OLnBhcnNlKHZhbHVlKTtcblx0XHR9XG5cdH1cbn1cblxuZGVjbGFyZSBjb25zdCBhbnk6IHR5cGVvZiBCYWNrZXIuUExBQW55O1xuZGVjbGFyZSBjb25zdCBzdHJpbmc6IHR5cGVvZiBCYWNrZXIuUExBU3RyaW5nO1xuZGVjbGFyZSBjb25zdCBudW1iZXI6IHR5cGVvZiBCYWNrZXIuUExBTnVtYmVyO1xuZGVjbGFyZSBjb25zdCBiaWdpbnQ6IHR5cGVvZiBCYWNrZXIuUExBTnVtYmVyO1xuZGVjbGFyZSBjb25zdCBib29sZWFuOiB0eXBlb2YgQmFja2VyLlBMQU51bWJlcjtcbiIsIlxubmFtZXNwYWNlIEJhY2tlclxue1xuXHRleHBvcnQgdHlwZSBQcm90b3R5cGVKU09OID0gW251bWJlciwgbnVtYmVyLCAuLi5udW1iZXJbXVtdXTtcblx0XG5cdGV4cG9ydCBjbGFzcyBQcm90b3R5cGUgXG5cdHtcblx0XHRzdGF0aWMgZnJvbUpTT04oY29kZTogQ29kZSwgc2VyaWFsaXplZDogUHJvdG90eXBlSlNPTilcblx0XHR7XG5cdFx0XHRjb25zdCBkYXRhID0gU2VyaWFsaXplci5kZWNvZGUoc2VyaWFsaXplZCwgNSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBuZXcgUHJvdG90eXBlKFxuXHRcdFx0XHRjb2RlLCBcblx0XHRcdFx0bmV3IEJpdGZpZWxkcyhkYXRhWzBdKSxcblx0XHRcdFx0VHlwZVNldC5mcm9tSlNPTihkYXRhWzFdKSxcblx0XHRcdFx0VHlwZVNldC5mcm9tSlNPTihkYXRhWzJdKSxcblx0XHRcdFx0VHlwZVNldC5mcm9tSlNPTihkYXRhWzNdKSxcblx0XHRcdFx0VHlwZVNldC5mcm9tSlNPTihkYXRhWzRdKVxuXHRcdFx0KTtcblx0XHR9XG5cdFx0XG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRwcml2YXRlIGNvZGU6IENvZGUsXG5cdFx0XHRwdWJsaWMgZmxhZ3M6IEJhY2tlci5CaXRmaWVsZHMsXG5cdFx0XHRcblx0XHRcdHB1YmxpYyBiYXNlcyA9IG5ldyBUeXBlU2V0KCksXG5cdFx0XHRwdWJsaWMgcGF0dGVybnMgPSBuZXcgVHlwZVNldCgpLFxuXHRcdFx0cHVibGljIHBhcmFsbGVscyA9IG5ldyBUeXBlU2V0KCksXG5cdFx0XHRwdWJsaWMgY29udGVudHNJbnRyaW5zaWMgPSBuZXcgVHlwZVNldCgpKSB7fVxuXHRcdFx0XG5cdFx0Z2V0IGlkKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5jb2RlLnByb3RvdHlwZXMuaW5kZXhPZih0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGhhc2goKVxuXHRcdHtcblx0XHRcdHJldHVybiBCYWNrZXIuVXRpbC5oYXNoKEpTT04uc3RyaW5naWZ5KHRoaXMpKTtcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKClcblx0XHR7XHRcblx0XHRcdHJldHVybiBCYWNrZXIuU2VyaWFsaXplci5lbmNvZGUoW1xuXHRcdFx0XHR0aGlzLmZsYWdzLCB0aGlzLmJhc2VzLCB0aGlzLnBhdHRlcm5zLCB0aGlzLnBhcmFsbGVscywgdGhpcy5jb250ZW50c0ludHJpbnNpY1xuXHRcdFx0XSk7XG5cdFx0fVx0XHRcblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlci5TZXJpYWxpemVyXG57XG5cdGV4cG9ydCBmdW5jdGlvbiBlbmNvZGUoZGF0YTogYW55W10pXG5cdHtcblx0XHRjb25zdCBiZiA9IG5ldyBCaXRmaWVsZHMoKTtcblx0XHRjb25zdCByZXN1bHQgPSBbXTtcblx0XHRcblx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGRhdGEubGVuZ3RoOylcblx0XHR7XG5cdFx0XHRjb25zdCB2cCA9IGRhdGFbaV07XG5cdFx0XHRjb25zdCB2YWx1ZSA9IHZwICYmIHR5cGVvZiB2cCA9PT0gXCJvYmplY3RcIiAmJiBcInRvSlNPTlwiIGluIHZwID8gdnAudG9KU09OKCkgOiB2cDtcdFxuXHRcdFx0Y29uc3QgYml0ID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwO1xuXHRcdFx0YmYuc2V0KGksIGJpdCA/IGZhbHNlIDogdHJ1ZSk7XG5cdFx0XHQgXG5cdFx0XHRpZiAoIWJpdCkgXG5cdFx0XHRcdHJlc3VsdC5wdXNoKHZhbHVlKTtcblx0XHR9XG5cdFx0XG5cdFx0cmVzdWx0LnVuc2hpZnQoYmYpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblx0XG5cdGV4cG9ydCBmdW5jdGlvbiBkZWNvZGUoZGF0YTogW251bWJlciwgLi4uYW55W11dLCBsZW5ndGg/OiBudW1iZXIpXG5cdHtcblx0XHRjb25zdCBiZiA9IG5ldyBCaXRmaWVsZHMoZGF0YS5zaGlmdCgpKTtcblx0XHRcblx0XHRpZiAoIWxlbmd0aCB8fMKgbGVuZ3RoIDwgMSkgXG5cdFx0XHRsZW5ndGggPSBiZi5zaXplO1xuXHRcdFx0XG5cdFx0Y29uc3QgcmVzdWx0ID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cdFx0XG5cdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCBsZW5ndGg7KVxuXHRcdHtcblx0XHRcdGNvbnN0IGJpdCA9IGJmLmdldChpKTtcblx0XHRcdGlmIChiaXQpXG5cdFx0XHRcdHJlc3VsdFtpXSA9IGRhdGEuc2hpZnQoKTtcblx0XHRcdGVsc2UgXG5cdFx0XHRcdHJlc3VsdFtpXSA9IFtdO1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyXG57XG5cdGV4cG9ydCB0eXBlIERhdGFKU09OID0gW251bWJlcltdLCBzdHJpbmcsIC4uLnN0cmluZ1tdW11dO1xuXHRleHBvcnQgdHlwZSBUeXBlSlNPTiA9IFtudW1iZXIsIG51bWJlciB8IG51bGwsIHN0cmluZywgc3RyaW5nW11dO1xuXHRcblx0ZXhwb3J0IGNsYXNzIFR5cGUgXG5cdHtcblx0XHRzdGF0aWMgZnJvbUpTT04oY29kZTogQ29kZSwgZGF0YTogVHlwZUpTT04pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBUeXBlKFxuXHRcdFx0XHRjb2RlLCBcblx0XHRcdFx0ZGF0YVsyXSxcblx0XHRcdFx0Y29kZS5wcm90b3R5cGVzW2RhdGFbMF1dLFxuXHRcdFx0XHRkYXRhWzFdID8gRnV0dXJlVHlwZS4kKGRhdGFbMV0pIDogbnVsbCxcblx0XHRcdFx0ZGF0YVszXVxuXHRcdFx0KTtcblx0XHR9XG5cdFx0XG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRwcml2YXRlIGNvZGU6IENvZGUsXG5cdFx0XHRwdWJsaWMgbmFtZTogc3RyaW5nLFxuXHRcdFx0cHVibGljIHByb3RvdHlwZTogUHJvdG90eXBlLFxuXHRcdFx0cHJpdmF0ZSBfY29udGFpbmVyOiBGdXR1cmVUeXBlIHwgbnVsbCA9IG51bGwsXG5cdFx0XHRcblx0XHRcdHB1YmxpYyBhbGlhc2VzOiBzdHJpbmdbXSA9IFtdKSB7fVxuXHRcdFx0XG5cdFx0Z2V0IFBMQUNvbnN0cnVjdG9yKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHR0aGlzLmlzKHRoaXMuY29kZS50eXBlc1s1XSkgPyBCYWNrZXIuUExBQm9vbGVhbiA6XG5cdFx0XHRcdHRoaXMuaXModGhpcy5jb2RlLnR5cGVzWzRdKSA/IEJhY2tlci5QTEFCaWdJbnQgIDpcblx0XHRcdFx0dGhpcy5pcyh0aGlzLmNvZGUudHlwZXNbM10pID8gQmFja2VyLlBMQU51bWJlciAgOlxuXHRcdFx0XHR0aGlzLmlzKHRoaXMuY29kZS50eXBlc1syXSkgPyBCYWNrZXIuUExBU3RyaW5nICA6XG5cdFx0XHRcdHRoaXMuaXModGhpcy5jb2RlLnR5cGVzWzFdKSB8fCB0aGlzLnZhbHVlID09IG51bGwgPyBCYWNrZXIuUExBT2JqZWN0ICA6IEJhY2tlci5QTEFBbnkpO1xuXHRcdH1cblx0XHRcdFxuXHRcdGdldCBjb250YWluZXIoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLl9jb250YWluZXIgJiYgdGhpcy5fY29udGFpbmVyLnR5cGU7XG5cdFx0fVxuXHRcdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIHRoZSBhcnJheSBvZiB0eXBlcyB0aGF0IGFyZSBjb250YWluZWQgZGlyZWN0bHkgYnkgdGhpc1xuXHRcdCAqIG9uZS4gSW4gdGhlIGNhc2Ugd2hlbiB0aGlzIHR5cGUgaXMgYSBsaXN0IHR5cGUsIHRoaXMgYXJyYXkgZG9lc1xuXHRcdCAqIG5vdCBpbmNsdWRlIHRoZSBsaXN0J3MgaW50cmluc2ljIHR5cGVzLlxuXHRcdCAqL1xuXHRcdGdldCBjb250ZW50cygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuY29kZS50eXBlcy5maWx0ZXIoeCA9PiB4LmNvbnRhaW5lciA9PT0gdGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyBhIHJlZmVyZW5jZSB0byB0aGUgdHlwZSwgYXMgaXQncyBkZWZpbmVkIGluIGl0J3Ncblx0XHQgKiBuZXh0IG1vc3QgYXBwbGljYWJsZSB0eXBlLlxuXHRcdCAqL1xuXHRcdGdldCBwYXJhbGxlbHMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5wYXJhbGxlbHMuc25hcHNob3QoKVxuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgdGhlIGFycmF5IG9mIHR5cGVzIGZyb20gd2hpY2ggdGhpcyB0eXBlIGV4dGVuZHMuXG5cdFx0ICogSWYgdGhpcyBUeXBlIGV4dGVuZHMgZnJvbSBhIHBhdHRlcm4sIGl0IGlzIGluY2x1ZGVkIGluIHRoaXNcblx0XHQgKiBhcnJheS5cblx0XHQgKi9cblx0XHRnZXQgYmFzZXMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5iYXNlcy5zbmFwc2hvdCgpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHBhdHRlcm5zIHRoYXQgcmVzb2x2ZSB0byB0aGlzIHR5cGUuXG5cdFx0ICovXG5cdFx0Z2V0IHBhdHRlcm5zKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUucGF0dGVybnMuc25hcHNob3QoKTtcdFxuXHRcdH1cblx0XHRcblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHRoYXQgc2hhcmUgdGhlIHNhbWUgY29udGFpbmluZ1xuXHRcdCAqIHR5cGUgYXMgdGhpcyBvbmUuXG5cdFx0ICovXG5cdFx0Z2V0IGFkamFjZW50cygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuY29kZS50eXBlcy5maWx0ZXIoeCA9PiB4LmNvbnRhaW5lciAhPT0gdGhpcy5jb250YWluZXIgJiYgeCAhPT0gdGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdldHMgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdHlwZXMgdGhhdCBkZXJpdmUgZnJvbSB0aGUgXG5cdFx0ICogdGhpcyBUeXBlIGluc3RhbmNlLlxuXHRcdCAqIFxuXHRcdCAqIFRoZSB0eXBlcyB0aGF0IGRlcml2ZSBmcm9tIHRoaXMgb25lIGFzIGEgcmVzdWx0IG9mIHRoZSB1c2Ugb2Zcblx0XHQgKiBhbiBhbGlhcyBhcmUgZXhjbHVkZWQgZnJvbSB0aGlzIGFycmF5LlxuXHRcdCAqL1xuXHRcdGdldCBkZXJpdmF0aW9ucygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuY29kZS50eXBlcy5maWx0ZXIoeCA9PiB4LmJhc2VzLmluY2x1ZGVzKHRoaXMpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIGEgcmVmZXJlbmNlIHRvIHRoZSBwYXJhbGxlbCByb290cyBvZiB0aGlzIHR5cGUuXG5cdFx0ICogVGhlIHBhcmFsbGVsIHJvb3RzIGFyZSB0aGUgZW5kcG9pbnRzIGZvdW5kIHdoZW5cblx0XHQgKiB0cmF2ZXJzaW5nIHVwd2FyZCB0aHJvdWdoIHRoZSBwYXJhbGxlbCBncmFwaC5cblx0XHQgKi9cblx0XHRnZXQgcGFyYWxsZWxSb290cygpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgcm9vdHM6IFR5cGVbXSA9IFtdO1xuXHRcdFx0Zm9yIChjb25zdCB7IHR5cGUgfSBvZiB0aGlzLml0ZXJhdGUodCA9PiB0LnBhcmFsbGVscykpXG5cdFx0XHRcdGlmICh0eXBlICE9PSB0aGlzICYmIHR5cGUucGFyYWxsZWxzLmxlbmd0aCA9PT0gMClcblx0XHRcdFx0XHRyb290cy5wdXNoKHR5cGUpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gcm9vdHM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdldHMgdGhlIGZpcnN0IGFsaWFzIHN0b3JlZCBpbiB0aGUgLnZhbHVlcyBhcnJheSwgb3IgbnVsbCBpZiB0aGVcblx0XHQgKiB2YWx1ZXMgYXJyYXkgaXMgZW1wdHkuXG5cdFx0ICovXG5cdFx0Z2V0IHZhbHVlKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5hbGlhc2VzLmxlbmd0aCA+IDAgPyB0aGlzLmFsaWFzZXNbMF0gOiBudWxsO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaWQoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmNvZGUudHlwZXMuaW5kZXhPZih0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGlzQW5vbnltb3VzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDApO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaXNGcmVzaCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmZsYWdzLmdldCgxKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGlzTGlzdCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmZsYWdzLmdldCgyKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIHdoZXRoZXIgdGhpcyB0eXBlIHJlcHJlc2VudHMgdGhlIGludHJpbnNpY1xuXHRcdCAqIHNpZGUgb2YgYSBsaXN0LlxuXHRcdCAqL1xuXHRcdGdldCBpc0xpc3RJbnRyaW5zaWMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5mbGFncy5nZXQoMyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyB3aGV0aGVyIHRoaXMgdHlwZSByZXByZXNlbnRzIHRoZSBleHRyaW5zaWNcblx0XHQgKiBzaWRlIG9mIGEgbGlzdC5cblx0XHQgKi9cblx0XHRnZXQgaXNMaXN0RXh0cmluc2ljKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDQpO1xuXHRcdH1cblx0XHRcblx0XHRcblx0XHRnZXQgaXNQYXR0ZXJuKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDUpO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaXNVcmkoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5mbGFncy5nZXQoNik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyBhIHZhbHVlIHRoYXQgaW5kaWNhdGVzIGlmIHRoaXMgVHlwZSB3YXMgZGlyZWN0bHkgc3BlY2lmaWVkXG5cdFx0ICogaW4gdGhlIGRvY3VtZW50LCBvciBpZiBpdCdzIGV4aXN0ZW5jZSB3YXMgaW5mZXJyZWQuXG5cdFx0ICovXG5cdFx0Z2V0IGlzU3BlY2lmaWVkKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDcpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgaXNPdmVycmlkZSgpIHsgcmV0dXJuIHRoaXMucGFyYWxsZWxzLmxlbmd0aCA+IDA7IH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgaXNJbnRyb2R1Y3Rpb24oKSB7IHJldHVybiB0aGlzLnBhcmFsbGVscy5sZW5ndGggPT09IDA7IH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIGEgYm9vbGVhbiB2YWx1ZSB0aGF0IGluZGljYXRlcyB3aGV0aGVyIHRoaXMgVHlwZVxuXHRcdCAqIGluc3RhbmNlIHdhcyBjcmVhdGVkIGZyb20gYSBwcmV2aW91cyBlZGl0IGZyYW1lLCBhbmRcblx0XHQgKiBzaG91bGQgbm8gbG9uZ2VyIGJlIHVzZWQuXG5cdFx0ICovXG5cdFx0Z2V0IGlzRGlydHkoKVxuXHRcdHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUGVyZm9ybXMgYW4gYXJiaXRyYXJ5IHJlY3Vyc2l2ZSwgYnJlYWR0aC1maXJzdCB0cmF2ZXJzYWxcblx0XHQgKiB0aGF0IGJlZ2lucyBhdCB0aGlzIFR5cGUgaW5zdGFuY2UuIEVuc3VyZXMgdGhhdCBubyB0eXBlc1xuXHRcdCAqIHR5cGVzIGFyZSB5aWVsZGVkIG11bHRpcGxlIHRpbWVzLlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSBuZXh0Rm4gQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSB0eXBlLCBvciBhblxuXHRcdCAqIGl0ZXJhYmxlIG9mIHR5cGVzIHRoYXQgYXJlIHRvIGJlIHZpc2l0ZWQgbmV4dC5cblx0XHQgKiBAcGFyYW0gcmV2ZXJzZSBBbiBvcHRpb25hbCBib29sZWFuIHZhbHVlIHRoYXQgaW5kaWNhdGVzXG5cdFx0ICogd2hldGhlciB0eXBlcyBpbiB0aGUgcmV0dXJuZWQgYXJyYXkgc2hvdWxkIGJlIHNvcnRlZFxuXHRcdCAqIHdpdGggdGhlIG1vc3QgZGVlcGx5IHZpc2l0ZWQgbm9kZXMgb2NjdXJpbmcgZmlyc3QuXG5cdFx0ICogXG5cdFx0ICogQHJldHVybnMgQW4gYXJyYXkgdGhhdCBzdG9yZXMgdGhlIGxpc3Qgb2YgdHlwZXMgdGhhdCB3ZXJlXG5cdFx0ICogdmlzaXRlZC5cblx0XHQgKi9cblx0XHR2aXNpdChuZXh0Rm46ICh0eXBlOiBUeXBlKSA9PiBJdGVyYWJsZTxUeXBlIHwgbnVsbD4gfCBUeXBlIHwgbnVsbCwgcmV2ZXJzZT86IGJvb2xlYW4pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIEFycmF5LmZyb20odGhpcy5pdGVyYXRlKG5leHRGbiwgcmV2ZXJzZSkpLm1hcChlbnRyeSA9PiBlbnRyeS50eXBlKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUGVyZm9ybXMgYW4gYXJiaXRyYXJ5IHJlY3Vyc2l2ZSwgYnJlYWR0aC1maXJzdCBpdGVyYXRpb25cblx0XHQgKiB0aGF0IGJlZ2lucyBhdCB0aGlzIFR5cGUgaW5zdGFuY2UuIEVuc3VyZXMgdGhhdCBubyB0eXBlc1xuXHRcdCAqIHR5cGVzIGFyZSB5aWVsZGVkIG11bHRpcGxlIHRpbWVzLlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSBuZXh0Rm4gQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSB0eXBlLCBvciBhbiBpdGVyYWJsZVxuXHRcdCAqIG9mIHR5cGVzIHRoYXQgYXJlIHRvIGJlIHZpc2l0ZWQgbmV4dC5cblx0XHQgKiBAcGFyYW0gcmV2ZXJzZSBBbiBvcHRpb25hbCBib29sZWFuIHZhbHVlIHRoYXQgaW5kaWNhdGVzXG5cdFx0ICogd2hldGhlciB0aGUgaXRlcmF0b3Igc2hvdWxkIHlpZWxkIHR5cGVzIHN0YXJ0aW5nIHdpdGggdGhlXG5cdFx0ICogbW9zdCBkZWVwbHkgbmVzdGVkIHR5cGVzIGZpcnN0LlxuXHRcdCAqIFxuXHRcdCAqIEB5aWVsZHMgQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgYSBgdHlwZWAgcHJvcGVydHkgdGhhdCBpcyB0aGVcblx0XHQgKiB0aGUgVHlwZSBiZWluZyB2aXNpdGVkLCBhbmQgYSBgdmlhYCBwcm9wZXJ0eSB0aGF0IGlzIHRoZSBUeXBlXG5cdFx0ICogdGhhdCB3YXMgcmV0dXJuZWQgaW4gdGhlIHByZXZpb3VzIGNhbGwgdG8gYG5leHRGbmAuXG5cdFx0ICovXG5cdFx0Kml0ZXJhdGUobmV4dEZuOiAodHlwZTogVHlwZSkgPT4gSXRlcmFibGU8VHlwZSB8IG51bGw+IHwgVHlwZSB8IG51bGwsIHJldmVyc2U/OiBib29sZWFuKVxuXHRcdHtcblx0XHRcdGNvbnN0IHlpZWxkZWQ6IFR5cGVbXSA9IFtdO1xuXHRcdFx0XG5cdFx0XHR0eXBlIFJlY3Vyc2VUeXBlID0gSXRlcmFibGVJdGVyYXRvcjx7IHR5cGU6IFR5cGU7IHZpYTogVHlwZSB8IG51bGwgfT47XG5cdFx0XHRmdW5jdGlvbiAqcmVjdXJzZSh0eXBlOiBUeXBlLCB2aWE6IFR5cGUgfCBudWxsKTogUmVjdXJzZVR5cGVcblx0XHRcdHtcblx0XHRcdFx0aWYgKHlpZWxkZWQuaW5jbHVkZXModHlwZSkpXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKCFyZXZlcnNlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0eWllbGRlZC5wdXNoKHR5cGUpO1xuXHRcdFx0XHRcdHlpZWxkIHsgdHlwZSwgdmlhIH07XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IHJlZHVjZWQgPSBuZXh0Rm4odHlwZSk7XG5cdFx0XHRcdGlmIChyZWR1Y2VkICE9PSBudWxsICYmIHJlZHVjZWQgIT09IHVuZGVmaW5lZClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChyZWR1Y2VkIGluc3RhbmNlb2YgVHlwZSlcblx0XHRcdFx0XHRcdHJldHVybiB5aWVsZCAqcmVjdXJzZShyZWR1Y2VkLCB0eXBlKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRmb3IgKGNvbnN0IG5leHRUeXBlIG9mIHJlZHVjZWQpXG5cdFx0XHRcdFx0XHRpZiAobmV4dFR5cGUgaW5zdGFuY2VvZiBUeXBlKVxuXHRcdFx0XHRcdFx0XHR5aWVsZCAqcmVjdXJzZShuZXh0VHlwZSwgdHlwZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGlmIChyZXZlcnNlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0eWllbGRlZC5wdXNoKHR5cGUpO1xuXHRcdFx0XHRcdHlpZWxkIHsgdHlwZSwgdmlhIH07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0eWllbGQgKnJlY3Vyc2UodGhpcywgbnVsbCk7XG5cdFx0fVxuXHRcblx0XHQvKipcblx0XHQgKiBRdWVyaWVzIGZvciBhIFR5cGUgdGhhdCBpcyBuZXN0ZWQgdW5kZXJuZWF0aCB0aGlzIFR5cGUsXG5cdFx0ICogYXQgdGhlIHNwZWNpZmllZCB0eXBlIHBhdGguXG5cdFx0ICovXG5cdFx0cXVlcnkoLi4udHlwZVBhdGg6IHN0cmluZ1tdKVxuXHRcdHtcblx0XHRcdGxldCBjdXJyZW50VHlwZTogVHlwZSB8IG51bGwgPSBudWxsO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHR5cGVOYW1lIG9mIHR5cGVQYXRoKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBuZXh0VHlwZSA9IHRoaXMuY29udGVudHMuZmluZCh0eXBlID0+IHR5cGUubmFtZSA9PT0gdHlwZU5hbWUpO1xuXHRcdFx0XHRpZiAoIW5leHRUeXBlKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0Y3VycmVudFR5cGUgPSBuZXh0VHlwZTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIGN1cnJlbnRUeXBlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDaGVja3Mgd2hldGhlciB0aGlzIFR5cGUgaGFzIHRoZSBzcGVjaWZpZWQgdHlwZVxuXHRcdCAqIHNvbWV3aGVyZSBpbiBpdCdzIGJhc2UgZ3JhcGguXG5cdFx0ICovXG5cdFx0aXMoYmFzZVR5cGU6IFR5cGUpXG5cdFx0e1xuXHRcdFx0Zm9yIChjb25zdCB7IHR5cGUgfSBvZiB0aGlzLml0ZXJhdGUodCA9PiB0LmJhc2VzKSlcblx0XHRcdFx0aWYgKHR5cGUgPT09IGJhc2VUeXBlKVxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENoZWNrcyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgdHlwZSBpcyBpbiB0aGlzIFR5cGUnc1xuXHRcdCAqIGAuY29udGVudHNgIHByb3BlcnR5LCBlaXRoZXIgZGlyZWN0bHksIG9yIGluZGlyZWN0bHkgdmlhXG5cdFx0ICogdGhlIHBhcmFsbGVsIGdyYXBocyBvZiB0aGUgYC5jb250ZW50c2AgVHlwZXMuXG5cdFx0ICovXG5cdFx0aGFzKHR5cGU6IFR5cGUpXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMuY29udGVudHMuaW5jbHVkZXModHlwZSkpXG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGNvbnRhaW5lZFR5cGUgb2YgdGhpcy5jb250ZW50cylcblx0XHRcdFx0aWYgKHR5cGUubmFtZSA9PT0gY29udGFpbmVkVHlwZS5uYW1lKVxuXHRcdFx0XHRcdGZvciAoY29uc3QgcGFyYWxsZWwgb2YgY29udGFpbmVkVHlwZS5pdGVyYXRlKHQgPT4gdC5wYXJhbGxlbHMpKVxuXHRcdFx0XHRcdFx0aWYgKHBhcmFsbGVsLnR5cGUgPT09IHR5cGUpXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVx0XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXJcbntcblx0ZXhwb3J0IGNsYXNzIFR5cGVTZXQgZXh0ZW5kcyBTZXQ8RnV0dXJlVHlwZT5cblx0e1xuXHRcdHN0YXRpYyBmcm9tSlNPTihkYXRhOiBudW1iZXJbXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFR5cGVTZXQoZGF0YS5tYXAoeCA9PiBGdXR1cmVUeXBlLiQoeCkpKTtcblx0XHR9XG5cdFx0XG5cdFx0c25hcHNob3QoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnRvQXJyYXkoKS5tYXAoeCA9PiB4LnR5cGUpLmZpbHRlcih4ID0+IHgpIGFzIFR5cGVbXTtcblx0XHR9XG5cdFx0XG5cdFx0dG9BcnJheSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIEFycmF5LmZyb20odGhpcy52YWx1ZXMoKSkuc29ydCgpO1x0XG5cdFx0fVxuXHR9XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyLlV0aWxcbntcblx0LyoqXG5cdCAqIEhhc2ggY2FsY3VsYXRpb24gZnVuY3Rpb24gYWRhcHRlZCBmcm9tOlxuXHQgKiBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvNTIxNzE0ODAvMTMzNzM3XG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gaGFzaCh2YWx1ZTogc3RyaW5nLCBzZWVkID0gMClcblx0e1xuXHRcdGxldCBoMSA9IDB4REVBREJFRUYgXiBzZWVkO1xuXHRcdGxldCBoMiA9IDBYNDFDNkNFNTcgXiBzZWVkO1xuXHRcdFxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspXG5cdFx0e1xuXHRcdFx0bGV0IGNoID0gdmFsdWUuY2hhckNvZGVBdChpKTtcblx0XHRcdGgxID0gTWF0aC5pbXVsKGgxIF4gY2gsIDI2NTQ0MzU3NjEpO1xuXHRcdFx0aDIgPSBNYXRoLmltdWwoaDIgXiBjaCwgMTU5NzMzNDY3Nyk7XG5cdFx0fVxuXHRcdFxuXHRcdGgxID0gTWF0aC5pbXVsKGgxIF4gaDEgPj4+IDE2LCAyMjQ2ODIyNTA3KSBeIE1hdGguaW11bChoMiBeIGgyID4+PiAxMywgMzI2NjQ4OTkwOSk7XG5cdFx0aDIgPSBNYXRoLmltdWwoaDIgXiBoMiA+Pj4gMTYsIDIyNDY4MjI1MDcpIF4gTWF0aC5pbXVsKGgxIF4gaDEgPj4+IDEzLCAzMjY2NDg5OTA5KTtcblx0XHRyZXR1cm4gNDI5NDk2NzI5NiAqICgyMDk3MTUxICYgaDIpICsgKGgxID4+PiAwKTtcblx0fVxufSJdfQ==