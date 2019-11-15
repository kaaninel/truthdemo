"use strict";
var Backer;
(function (Backer) {
    /**
     * Bitwise flag manager
     */
    class Bitfields {
        constructor(flags = 0) {
            this.flags = flags;
        }
        /**
         * Returns approx. size based on last set bit.
         */
        get size() {
            return Math.ceil(Math.log2(this.flags));
        }
        /**
         * Gets a boolean from specified index.
         */
        get(index) {
            if (index < 0 || index > 31)
                return false;
            return this.flags & (1 << index) ? true : false;
        }
        /**
         * Sets a boolean to specified index.
         */
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
    /**
     * Referances to every loaded Code instance.
     */
    Backer.Codes = [];
    /**
     * Last loaded Schema
     */
    Backer.Schema = {};
    /**
     * Referances to every loaded Schema
     */
    Backer.Schemas = [];
    /**
     * Last loaded Data Graph
     */
    Backer.Graph = {};
    /**
     * Referances to every loaded Data Graph
     */
    Backer.Graphs = [];
    /**
     * Truth Code JSON
     *
     * This class manages code types extracted from Truth file by compiler.
     * Also manages relations between prototype, types and data.
     */
    class Code {
        constructor() {
            this.types = [];
            this.prototypes = [];
        }
        /**
         * Loads a CodeJSON and loads DataJSONs on that Code instance.
         *
         * @param code CodeJSON Url
         * @param data DataJSON Urls
         */
        static async load(code, ...data) {
            const instance = Code.new(await Backer.Util.fetchJSON(code));
            for (const url of data)
                instance.loadData(await Backer.Util.fetchJSON(url));
            return instance;
        }
        /**
         * Loads a Code instance from parsed Code JSON.
         * @param data Parsed CodeJSON
         */
        static new(data) {
            const code = new Code();
            const prototypes = data[0].map(x => Backer.Prototype.load(code, x));
            for (const proto of prototypes)
                code.prototypes.push(proto);
            const types = data[1].map(x => Backer.Type.load(code, x));
            for (const type of types) {
                const id = code.types.push(type) - 1;
                Backer.FutureType.IdMap.set(id, type);
            }
            const Schema = {};
            for (const type of types)
                if (!type.container)
                    Schema[type.name] = new Backer.Struct(type, null);
            Backer.Schema = Schema;
            Backer.Schemas.push(Schema);
            Backer.Codes.push(code);
            return code;
        }
        /**
         * Binds a type to Code instance
         */
        add(type) {
            if (!this.prototypes.some(x => x.hash === type.prototype.hash))
                this.prototypes.push(type.prototype);
            const id = this.types.push(type) - 1;
            type.transfer(this);
            return id;
        }
        /**
         * Loads data types and surrogates from parsed DataJSON.
         * @param data Parsed DataJSON
         */
        loadData(data) {
            const Graph = {};
            for (const info of data) {
                const prototypes = info.shift();
                const name = info.shift();
                const prototype = this.prototypes[prototypes.shift()];
                const type = new Backer.Type(this, name, prototype, null, Backer.ValueStore.load(...info.shift()));
                const generate = (base, contents) => {
                    for (const content of contents) {
                        const clone = new Backer.Type(this, content.name, this.prototypes[prototypes.shift()], Backer.FutureType.new(base), content.values.concat(Backer.ValueStore.load(...info.shift())));
                        this.types.push(clone);
                        generate(clone, clone.parallelContents);
                    }
                };
                generate(type, type.parallelContents);
                Graph[type.name] = new Backer.Surrogate(type, null);
            }
            Backer.Graph = Graph;
            Backer.Graphs.push(Graph);
            return Graph;
        }
        /**
         * Extract data from current types of Code
         * @param pattern Data Name Pattern
         */
        extractData(pattern) {
            const dataRoots = this.types.filter(x => x.container === null && pattern.test(x.name));
            const drill = (x) => {
                const array = [x];
                for (const type of x.contents) {
                    const child = drill(type).flat();
                    if (child.length)
                        array.push(...child);
                }
                return array;
            };
            const dataSchema = dataRoots.map(drill).filter(x => Array.isArray(x) ? x.length : true);
            const dataQuery = dataSchema.flat();
            const codeRoots = this.types.filter(x => !dataQuery.includes(x));
            const code = new Code();
            for (const type of codeRoots)
                code.add(type);
            for (const type of dataQuery) {
                if (!code.prototypes.some(x => x.hash === type.prototype.hash))
                    code.prototypes.push(type.prototype);
                type.transfer(code);
            }
            const data = dataSchema.map(x => [x.map(x => x.prototype.id), x[0].name, ...x.map(x => x.values.valueStore)]);
            return {
                code,
                data
            };
        }
        toJSON() { return [this.prototypes, this.types]; }
        valueOf() { return this.types.length; }
        [Symbol.toPrimitive]() { return this.types.length; }
        get [Symbol.toStringTag]() { return "Code"; }
    }
    Backer.Code = Code;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    var TruthTalk;
    (function (TruthTalk) {
        const SurrogateFilter = (x) => x instanceof Backer.Surrogate;
        /**
         * Keeps track of possible output of query
         */
        class CursorSet {
            constructor(...cursors) {
                this.cursors = new Set(cursors);
            }
            /**
             * Snapshot of current possibilities
             */
            snapshot() {
                return Array.from(this.cursors);
            }
            map(filter, map) {
                this.cursors = new Set(this.snapshot().filter(filter).flatMap(map).filter(x => !!x));
            }
            /**
             * Clones current state of CursorSet
             */
            clone() {
                return new CursorSet(...this.snapshot());
            }
            /**
             * Filters current possibilities
             */
            filter(fn) {
                this.cursors = new Set(this.snapshot().filter(x => fn(x)));
            }
            /**
             * Filters current possibilities
             */
            filterSurrogate(fn) {
                this.cursors = new Set(this.snapshot().filter((x) => x instanceof Backer.Surrogate && fn(x)));
            }
            /**
             * Executes a Truth Talk query
             */
            query(ast) {
                if (ast instanceof TruthTalk.Branch)
                    this.branch(ast);
                else
                    this.leaf(ast);
            }
            /**
             * Executes a Truth Talk branch
             */
            branch(branch) {
                switch (branch[TruthTalk.op]) {
                    case TruthTalk.BranchOp.is:
                    case TruthTalk.BranchOp.query:
                        for (const query of branch.children)
                            this.query(query);
                        break;
                    case TruthTalk.BranchOp.not:
                        this.not(branch);
                        break;
                    case TruthTalk.BranchOp.or:
                        this.or(branch);
                        break;
                    case TruthTalk.BranchOp.has:
                        this.contents();
                        for (const query of branch.children)
                            this.query(query);
                        this.containers();
                        break;
                }
            }
            /**
             * Executes a Truth Talk leaf
             */
            leaf(leaf) {
                switch (leaf[TruthTalk.op]) {
                    case TruthTalk.LeafOp.surrogate:
                        this.filterSurrogate(x => x[Backer.typeOf].is(leaf[Backer.typeOf]) || x[Backer.typeOf].parallelRoots.includes(leaf[Backer.typeOf]));
                        break;
                    case TruthTalk.LeafOp.contents:
                        this.contents();
                        break;
                    case TruthTalk.LeafOp.roots:
                        this.roots();
                        break;
                    case TruthTalk.LeafOp.containers:
                        this.containers();
                        break;
                    case TruthTalk.LeafOp.aliased:
                        this.filter(x => x[Backer.value] !== null);
                        break;
                    case TruthTalk.LeafOp.leaves:
                        this.filter(x => x[Backer.value] === null);
                        break;
                    case TruthTalk.LeafOp.fresh:
                        this.filterSurrogate(x => x[Backer.typeOf].isFresh);
                        break;
                    case TruthTalk.PredicateOp.equals:
                        this.filter(x => x[Backer.value] !== null ? x[Backer.value] == leaf.operand : false);
                        break;
                    case TruthTalk.PredicateOp.greaterThan:
                        this.filter(x => (x[Backer.value] || 0) > leaf.operand);
                        break;
                    case TruthTalk.PredicateOp.lessThan:
                        this.filter(x => (x[Backer.value] || 0) < leaf.operand);
                        break;
                    case TruthTalk.PredicateOp.startsWith:
                        this.filter(x => x[Backer.value] == null ? false : x[Backer.value].toString().startsWith(leaf.operand));
                        break;
                    case TruthTalk.PredicateOp.endsWith:
                        this.filter(x => x[Backer.value] == null ? false : x[Backer.value].toString().endsWith(leaf.operand));
                        break;
                    case TruthTalk.LeafOp.slice:
                        this.slice(leaf);
                        break;
                    case TruthTalk.LeafOp.occurences:
                        this.occurences(leaf);
                        break;
                    case TruthTalk.LeafOp.sort:
                        this.sort(leaf);
                        break;
                    case TruthTalk.LeafOp.reverse:
                        this.cursors = new Set(this.snapshot().reverse());
                        break;
                    case TruthTalk.LeafOp.names:
                        this.map(SurrogateFilter, (x) => x[Backer.name]);
                        break;
                }
            }
            /**
             * Go one level nested in
             */
            contents() {
                this.map(SurrogateFilter, x => x.contents);
            }
            /**
             * Go to top level
             */
            roots() {
                this.cursors = new Set(this.snapshot().map((x) => {
                    while (x && x[Backer.parent])
                        x = x[Backer.parent];
                    return x;
                }).filter((x) => !!x));
            }
            /**
             * Go one level nested out
             */
            containers() {
                this.cursors = new Set(this.snapshot().map(x => x[Backer.parent]).filter((x) => !!x));
            }
            /** */
            not(branch) {
                const instance = this.clone();
                for (const query of branch.children)
                    instance.query(query);
                const snap = instance.snapshot();
                this.filter(x => !snap.includes(x));
            }
            /** */
            or(branch) {
                const instances = [];
                for (const query of branch.children) {
                    const instance = this.clone();
                    instance.query(query);
                    instances.push(instance);
                }
                const snap = instances.flat();
                this.filter(x => snap.includes(x));
            }
            /** */
            slice(leaf) {
                let { start, end } = leaf;
                const snap = this.snapshot();
                if (end && end < 1)
                    end = start + Math.round(end * snap.length);
                this.cursors = new Set(snap.slice(start, end));
            }
            /** */
            occurences(leaf) {
                let { min, max } = leaf;
                if (!max)
                    max = min;
                const valueMap = {};
                for (const item of this.cursors) {
                    const val = JSON.stringify(item[Backer.value]);
                    if (!valueMap.hasOwnProperty(val))
                        valueMap[val] = [];
                    valueMap[val].push(item);
                }
                this.cursors = new Set(Object.values(valueMap).filter(x => x.length >= min && x.length <= max).flat());
            }
            /** */
            is(surrogate, not = false) {
                const instance = this.clone();
                return instance.filterSurrogate(x => {
                    const condition = x[Backer.typeOf].is(surrogate[Backer.typeOf]) || x[Backer.typeOf].parallelRoots.includes(surrogate[Backer.typeOf]);
                    return not ? !condition : condition;
                });
            }
            /** */
            sort(leaf) {
                const structs = leaf.contentTypes.filter((x) => !!x).reverse();
                const snap = this.snapshot();
                for (const struct of structs)
                    snap.sort((a, b) => {
                        if (a instanceof Backer.Name)
                            if (b instanceof Backer.Name)
                                return 0;
                            else
                                return -1;
                        if (b instanceof Backer.Name)
                            return 1;
                        const p1 = a.get(struct);
                        const p2 = b.get(struct);
                        const v1 = p1 ? p1[Backer.value] || 0 : 0;
                        const v2 = p2 ? p2[Backer.value] || 0 : 0;
                        return v1 - v2;
                    });
                this.cursors = new Set(snap);
            }
        }
        TruthTalk.CursorSet = CursorSet;
    })(TruthTalk = Backer.TruthTalk || (Backer.TruthTalk = {}));
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    class FutureType {
        constructor(value) {
            this.value = value;
        }
        static new(value) {
            const cached = FutureType.Cache.get(value);
            if (cached)
                return cached;
            const instance = new FutureType(value);
            FutureType.Cache.set(value, instance);
            return instance;
        }
        get type() {
            if (this.value instanceof Truth.Type) {
                const type = FutureType.TypeMap.get(this.value);
                if (!type)
                    return null;
                return type;
            }
            if (this.value instanceof Backer.Type)
                return this.value;
            return FutureType.IdMap.get(this.value) || null;
        }
        get id() {
            if (this.value instanceof Truth.Type) {
                const type = FutureType.TypeMap.get(this.value);
                if (!type)
                    return -1;
                return type.id;
            }
            if (this.value instanceof Backer.Type)
                return this.value.id;
            return this.value;
        }
        is(type) {
            const valueType = this.value;
            if (!valueType)
                return false;
            return valueType === type;
        }
        toJSON() { return this.id; }
        valueOf() { return this.id; }
        [Symbol.toPrimitive]() { return this.id; }
        get [Symbol.toStringTag]() { return "FutureType"; }
    }
    FutureType.Cache = new Map();
    FutureType.TypeMap = new Map();
    FutureType.IdMap = new Map();
    Backer.FutureType = FutureType;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    var TruthTalk;
    (function (TruthTalk) {
        var _a;
        TruthTalk.op = Symbol("op");
        TruthTalk.container = Symbol("container");
        /** */
        let BranchOp;
        (function (BranchOp) {
            BranchOp[BranchOp["query"] = 1] = "query";
            BranchOp[BranchOp["is"] = 2] = "is";
            BranchOp[BranchOp["has"] = 3] = "has";
            BranchOp[BranchOp["not"] = 4] = "not";
            BranchOp[BranchOp["or"] = 5] = "or";
        })(BranchOp = TruthTalk.BranchOp || (TruthTalk.BranchOp = {}));
        /** */
        let PredicateOp;
        (function (PredicateOp) {
            PredicateOp[PredicateOp["equals"] = 30] = "equals";
            PredicateOp[PredicateOp["greaterThan"] = 31] = "greaterThan";
            PredicateOp[PredicateOp["greaterThanOrEquals"] = 32] = "greaterThanOrEquals";
            PredicateOp[PredicateOp["lessThan"] = 33] = "lessThan";
            PredicateOp[PredicateOp["lessThanOrEquals"] = 34] = "lessThanOrEquals";
            PredicateOp[PredicateOp["alike"] = 35] = "alike";
            PredicateOp[PredicateOp["startsWith"] = 36] = "startsWith";
            PredicateOp[PredicateOp["endsWith"] = 37] = "endsWith";
            PredicateOp[PredicateOp["includes"] = 38] = "includes";
            PredicateOp[PredicateOp["matches"] = 39] = "matches";
        })(PredicateOp = TruthTalk.PredicateOp || (TruthTalk.PredicateOp = {}));
        /** */
        let LeafOp;
        (function (LeafOp) {
            LeafOp[LeafOp["predicate"] = 60] = "predicate";
            LeafOp[LeafOp["slice"] = 61] = "slice";
            LeafOp[LeafOp["occurences"] = 62] = "occurences";
            LeafOp[LeafOp["aliased"] = 63] = "aliased";
            LeafOp[LeafOp["terminals"] = 64] = "terminals";
            LeafOp[LeafOp["sort"] = 65] = "sort";
            LeafOp[LeafOp["reverse"] = 66] = "reverse";
            LeafOp[LeafOp["surrogate"] = 67] = "surrogate";
            LeafOp[LeafOp["containers"] = 68] = "containers";
            LeafOp[LeafOp["roots"] = 69] = "roots";
            LeafOp[LeafOp["contents"] = 70] = "contents";
            LeafOp[LeafOp["leaves"] = 71] = "leaves";
            LeafOp[LeafOp["fresh"] = 72] = "fresh";
            LeafOp[LeafOp["names"] = 73] = "names";
        })(LeafOp = TruthTalk.LeafOp || (TruthTalk.LeafOp = {}));
        //# Abstract Classes
        /** */
        class Node {
            constructor() {
                this[_a] = null;
            }
            setContainer(cont) {
                //@ts-ignore
                this[TruthTalk.container] = null;
            }
        }
        _a = TruthTalk.container;
        TruthTalk.Node = Node;
        /** */
        class Branch extends Node {
            constructor() {
                super(...arguments);
                this._children = [];
            }
            /** */
            addChild(child, position = -1) {
                child.setContainer(this);
                if (position === -1)
                    return void this._children.push(child);
                const at = this._children.length - position + 1;
                this._children.splice(at, 0, child);
                return child;
            }
            removeChild(param) {
                const childIdx = param instanceof Node ?
                    this._children.indexOf(param) :
                    param;
                if (childIdx > 0) {
                    const removed = this._children.splice(childIdx, 1)[0];
                    removed.setContainer(null);
                    return removed;
                }
                return null;
            }
            /** */
            get children() {
                return this._children;
            }
        }
        TruthTalk.Branch = Branch;
        /** */
        class Leaf extends Node {
        }
        TruthTalk.Leaf = Leaf;
        //# Concrete Classes
        /** */
        let Branches;
        (function (Branches) {
            var _b, _c, _d, _e, _f;
            /** */
            class Query extends Branch {
                constructor() {
                    super(...arguments);
                    this[_b] = BranchOp.query;
                }
            }
            _b = TruthTalk.op;
            Branches.Query = Query;
            /** */
            class Is extends Branch {
                constructor() {
                    super(...arguments);
                    this[_c] = BranchOp.is;
                }
            }
            _c = TruthTalk.op;
            Branches.Is = Is;
            /** */
            class Has extends Branch {
                constructor() {
                    super(...arguments);
                    this[_d] = BranchOp.has;
                }
            }
            _d = TruthTalk.op;
            Branches.Has = Has;
            /** */
            class Not extends Branch {
                constructor() {
                    super(...arguments);
                    this[_e] = BranchOp.not;
                }
            }
            _e = TruthTalk.op;
            Branches.Not = Not;
            /** */
            class Or extends Branch {
                constructor() {
                    super(...arguments);
                    this[_f] = BranchOp.or;
                }
            }
            _f = TruthTalk.op;
            Branches.Or = Or;
        })(Branches = TruthTalk.Branches || (TruthTalk.Branches = {}));
        /** */
        let Leaves;
        (function (Leaves_1) {
            var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
            /** */
            class Predicate extends Leaf {
                constructor(opv, operand) {
                    super();
                    this.operand = operand;
                    //@ts-ignore
                    this[TruthTalk.op] = opv;
                }
            }
            Leaves_1.Predicate = Predicate;
            /** */
            class Slice extends Leaf {
                constructor(start, end) {
                    super();
                    this.start = start;
                    this.end = end;
                    this[_b] = LeafOp.slice;
                }
            }
            _b = TruthTalk.op;
            Leaves_1.Slice = Slice;
            /** */
            class Occurences extends Leaf {
                constructor(min, max = min) {
                    super();
                    this.min = min;
                    this.max = max;
                    this[_c] = LeafOp.occurences;
                }
            }
            _c = TruthTalk.op;
            Leaves_1.Occurences = Occurences;
            /** */
            class Aliased extends Leaf {
                constructor() {
                    super(...arguments);
                    this[_d] = LeafOp.aliased;
                }
            }
            _d = TruthTalk.op;
            Leaves_1.Aliased = Aliased;
            /** */
            class Leaves extends Leaf {
                constructor() {
                    super(...arguments);
                    this[_e] = LeafOp.leaves;
                }
            }
            _e = TruthTalk.op;
            Leaves_1.Leaves = Leaves;
            /** */
            class Fresh extends Leaf {
                constructor() {
                    super(...arguments);
                    this[_f] = LeafOp.fresh;
                }
            }
            _f = TruthTalk.op;
            Leaves_1.Fresh = Fresh;
            /** */
            class Terminals extends Leaf {
                constructor() {
                    super(...arguments);
                    this[_g] = LeafOp.terminals;
                }
            }
            _g = TruthTalk.op;
            Leaves_1.Terminals = Terminals;
            /** */
            class Sort extends Leaf {
                constructor(...contentTypes) {
                    super();
                    this[_h] = LeafOp.sort;
                    this.contentTypes = contentTypes;
                }
            }
            _h = TruthTalk.op;
            Leaves_1.Sort = Sort;
            /** */
            class Reverse extends Leaf {
                constructor() {
                    super(...arguments);
                    this[_j] = LeafOp.reverse;
                }
            }
            _j = TruthTalk.op;
            Leaves_1.Reverse = Reverse;
            /** */
            class Surrogate extends Leaf {
                constructor() {
                    super(...arguments);
                    this[_k] = LeafOp.surrogate;
                }
            }
            _k = TruthTalk.op;
            Leaves_1.Surrogate = Surrogate;
            /** */
            class Containers extends Leaf {
                constructor() {
                    super(...arguments);
                    this[_l] = LeafOp.containers;
                }
            }
            _l = TruthTalk.op;
            Leaves_1.Containers = Containers;
            /** */
            class Roots extends Leaf {
                constructor() {
                    super(...arguments);
                    this[_m] = LeafOp.roots;
                }
            }
            _m = TruthTalk.op;
            Leaves_1.Roots = Roots;
            /** */
            class Contents extends Leaf {
                constructor() {
                    super(...arguments);
                    this[_o] = LeafOp.contents;
                }
            }
            _o = TruthTalk.op;
            Leaves_1.Contents = Contents;
            /** */
            class Names extends Leaf {
                constructor() {
                    super(...arguments);
                    this[_p] = LeafOp.names;
                }
            }
            _p = TruthTalk.op;
            Leaves_1.Names = Names;
        })(Leaves = TruthTalk.Leaves || (TruthTalk.Leaves = {}));
    })(TruthTalk = Backer.TruthTalk || (Backer.TruthTalk = {}));
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    /**
     *
     */
    class Prototype {
        constructor(code, flags, bases = new Backer.TypeSet(), patterns = new Backer.TypeSet(), parallels = new Backer.TypeSet(), contentsIntrinsic = new Backer.TypeSet()) {
            this.code = code;
            this.flags = flags;
            this.bases = bases;
            this.patterns = patterns;
            this.parallels = parallels;
            this.contentsIntrinsic = contentsIntrinsic;
        }
        /**
         * Generate a Prototype from Truth.Type
         */
        static new(code, type) {
            const flags = new Backer.Bitfields();
            flags.set(0, type.isAnonymous);
            flags.set(1, type.isFresh);
            flags.set(2, type.isList);
            flags.set(3, type.isListIntrinsic);
            flags.set(4, type.isListExtrinsic);
            flags.set(5, type.isPattern);
            flags.set(6, type.isUri);
            flags.set(7, type.isSpecified);
            let proto = new Prototype(code, flags, new Backer.TypeSet(type.bases.map(Backer.FutureType.new)), new Backer.TypeSet(type.patterns.map(Backer.FutureType.new)), new Backer.TypeSet(type.parallels.map(Backer.FutureType.new)), new Backer.TypeSet(type.contentsIntrinsic.map(Backer.FutureType.new)));
            const ex = code.prototypes.find(x => x.hash === proto.hash);
            if (ex)
                proto = ex;
            return proto;
        }
        /**
         * Load Prototype from CodeJSON
         */
        static load(code, serialized) {
            const data = Backer.Util.decode(serialized, 5);
            return new Prototype(code, new Backer.Bitfields(data[0]), Backer.TypeSet.fromJSON(data[1]), Backer.TypeSet.fromJSON(data[2]), Backer.TypeSet.fromJSON(data[3]), Backer.TypeSet.fromJSON(data[4]));
        }
        /** */
        get id() {
            return this.code.prototypes.indexOf(this);
        }
        /** */
        get hash() {
            return Backer.Util.hash(JSON.stringify(this));
        }
        /**
         * Transfer ownership of this instance to another Code instance
         */
        transfer(code) {
            this.code = code;
        }
        /** */
        toJSON() {
            return Backer.Util.encode([
                this.flags, this.bases, this.patterns, this.parallels, this.contentsIntrinsic
            ]);
        }
    }
    Backer.Prototype = Prototype;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    var TruthTalk;
    (function (TruthTalk) {
        class Library {
            /** */
            isKnownLeaf(leaf) {
                return leaf instanceof TruthTalk.Node;
            }
            /** */
            isKnownBranch(branch) {
                return branch instanceof TruthTalk.Node;
            }
            /** */
            isBranchDisposed(branch) {
                return branch instanceof TruthTalk.Branch && branch[TruthTalk.container] !== null;
            }
            /** */
            getStaticBranches() {
                const branches = {};
                Object.entries(TruthTalk.Branches).forEach(([branchName, branchCtor]) => {
                    const name = branchName.toLowerCase();
                    branches[name] = () => new branchCtor();
                });
                return branches;
            }
            /** */
            getStaticNonBranches() {
                const leaves = {};
                for (const [key, value] of Object.entries(TruthTalk.Leaves))
                    leaves[key.toLowerCase()] = (arg1, arg2) => new value(arg1, arg2);
                for (const key in TruthTalk.PredicateOp)
                    if (isNaN(parseInt(key)))
                        leaves[key] = (value) => new TruthTalk.Leaves.Predicate(TruthTalk.PredicateOp[key], value);
                return leaves;
            }
            /** */
            getChildren(target) {
                return target.children;
            }
            /** */
            createContainer() {
                return new TruthTalk.Branches.Query();
            }
            /** */
            attachAtomic(atomic, owner, ref) {
                if (!(atomic instanceof TruthTalk.Node))
                    return;
                const pos = ref === "append" ? -1 :
                    ref === "prepend" ? 0 :
                        // Places the item at the end, in the case when 
                        // ref wasn't found in the owner. )This should
                        // never actually happen.)
                        owner.children.indexOf(ref) + 1 || -1;
                owner.addChild(atomic, pos);
            }
            /** */
            detachAtomic(atomic, owner) {
                owner.removeChild(atomic);
            }
            /** */
            swapBranches(branch1, branch2) {
                if (branch1[TruthTalk.container] === null || branch2[TruthTalk.container] === null)
                    throw new Error("Cannot swap top-level branches.");
                if (branch1[TruthTalk.container] !== branch2[TruthTalk.container])
                    throw new Error("Can only swap branches from the same container.");
                const container = branch1[TruthTalk.container];
                const idx1 = container.children.indexOf(branch1);
                const idx2 = container.children.indexOf(branch2);
                const idxMax = Math.max(idx1, idx2);
                const idxMin = Math.min(idx1, idx2);
                const removedMax = container.removeChild(idxMax);
                const removedMin = container.removeChild(idxMin);
                if (!removedMax || !removedMin)
                    throw new Error("Internal Error.");
                container.addChild(removedMax, idxMin);
                container.addChild(removedMin, idxMax);
            }
            /** */
            replaceBranch(branch1, branch2) {
                if (branch1[TruthTalk.container] === null)
                    throw new Error("Cannot replace top-level branches.");
                const container = branch1[TruthTalk.container];
                const idx = container.children.indexOf(branch1);
                container.removeChild(idx);
                container.addChild(branch2, idx);
            }
            /** */
            attachAttribute(branch, key, value) {
                throw new Error("Not supported.");
            }
            /** */
            detachAttribute(branch, key) {
                throw new Error("Not supported.");
            }
            /** */
            attachRecurrent(kind, target, selector, callback, rest) {
                throw new Error("Not supported.");
                return false;
            }
            /** */
            detachRecurrent(target, selector, callback) {
                throw new Error("Not supported.");
                return false;
            }
        }
        TruthTalk.Library = Library;
    })(TruthTalk = Backer.TruthTalk || (Backer.TruthTalk = {}));
})(Backer || (Backer = {}));
/**
 * Global library object.
 */
//@ts-ignore
const tt = Reflex.Core.createContainerNamespace(new Backer.TruthTalk.Library(), true);
/// <reference path="Nodes.ts"/>
var Backer;
/// <reference path="Nodes.ts"/>
(function (Backer) {
    Backer.typeOf = Symbol("typeOf");
    Backer.value = Symbol("value");
    Backer.name = Symbol("name");
    Backer.values = Symbol("values");
    Backer.parent = Symbol("parent");
    class Base extends Backer.TruthTalk.Leaves.Surrogate {
        constructor(parentValue) {
            super();
            this[Backer.parent] = parentValue;
        }
        /**
         * Climb to root of this Struct
         */
        get root() {
            let root = this;
            while (root && root[Backer.parent])
                root = root[Backer.parent];
            return root;
        }
    }
    class Name extends Base {
        constructor(name, container) {
            super(container);
            this.name = name;
        }
        /** */
        get [Backer.value]() {
            return this.name;
        }
    }
    Backer.Name = Name;
    class Struct extends Base {
        constructor(type, parentValue) {
            super(parentValue);
            this[Backer.typeOf] = type;
            this[Backer.parent] = parentValue;
            this[Backer.name] = new Name(type.name, this);
            Backer.Util.shadows(this, false, Backer.typeOf, Backer.values, Backer.TruthTalk.op, Backer.parent, Backer.TruthTalk.container);
            for (const child of type.contents)
                this[child.name.replace(/[^\d\w]/gm, () => "_")] = Struct.new(child, this);
        }
        /**
         * Generate a Struct/Surrogate from Backer.Type
         */
        static new(type, parentValue) {
            const constr = parentValue ?
                parentValue instanceof Surrogate ?
                    Surrogate : Struct : Struct;
            return new constr(type, parentValue);
        }
        /** */
        get [Backer.values]() {
            return this[Backer.typeOf].values;
        }
        /** */
        get [Backer.value]() {
            return this[Backer.typeOf].value;
        }
        /**
         * Typescript type adjustment
         */
        get proxy() {
            return this;
        }
        /** */
        get contents() {
            return Object.values(this);
        }
        /** */
        instanceof(base) {
            return this[Backer.typeOf].is(base);
        }
        ;
        /** */
        is(base) {
            base = base instanceof Backer.Type ? base : base[Backer.typeOf];
            return this[Backer.typeOf].is(base);
        }
        /** */
        [Symbol.hasInstance](value) {
            return this.instanceof(value);
        }
        toJSON() { return this[Backer.values]; }
        valueOf() { return this[Backer.values]; }
        toString() {
            const val = this[Backer.values];
            if (val === null)
                return val;
            return String(val);
        }
        [Symbol.toPrimitive]() { return this[Backer.values]; }
        get [Symbol.toStringTag]() { return "Struct"; }
    }
    Backer.Struct = Struct;
    class Surrogate extends Struct {
        /** */
        get contents() {
            return Object.values(this);
        }
        /** */
        instanceof(base) {
            return this[Backer.value] instanceof base || this[Backer.typeOf].is(base);
        }
        ;
        /**
         * Get nested property with matching Struct
        */
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
        /** */
        toJSON() {
            const val = this[Backer.value];
            const primitive = val ? this[Backer.typeOf].values.toString() : undefined;
            if (this.contents.length === 0)
                return primitive;
            const Obj = Object.assign({}, this);
            return Obj;
        }
        toString(indent = 0) {
            let base = this[Backer.typeOf].name;
            const primitive = this[Backer.value] ? this[Backer.typeOf].values.toString() : undefined;
            if (primitive)
                base += `: ${primitive}`;
            if (this.contents.length > 0)
                base += this.contents.map(x => "\n" + x.toString(indent + 1));
            return "\t".repeat(indent) + base;
        }
    }
    Backer.Surrogate = Surrogate;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    class Value {
        constructor(base, aliased, value) {
            this.base = base;
            this.aliased = aliased;
            this.value = value;
        }
        static load(data) {
            return new Value(Backer.FutureType.new(data[0]), !!data[1], data[2]);
        }
        get primitive() {
            return this.value || this.baseName;
        }
        get baseName() {
            return this.base ? this.base.type ? this.base.type.name : "" : "";
        }
        toJSON() {
            return [this.base && this.base.id, this.aliased ? 1 : 0, this.value];
        }
        toString() {
            return this.primitive;
        }
    }
    Backer.Value = Value;
    class ValueStore {
        constructor(...values) {
            this.valueStore = values.map(x => {
                if (x.aliased) {
                    try {
                        x.value = JSON.parse(x.value);
                    }
                    catch (ex) {
                        if (/^\d+$/.test(x.value))
                            x.value = BigInt(x.value);
                    }
                }
                return x;
            });
        }
        static load(...data) {
            return new ValueStore(...data.map(x => Value.load(x)));
        }
        get values() {
            return this.valueStore.filter(x => !x.aliased);
        }
        get aliases() {
            return this.valueStore.filter(x => x.aliased);
        }
        concat(store) {
            return new ValueStore(...this.valueStore.concat(store.valueStore));
        }
        get alias() {
            return this.aliases[0];
        }
        get value() {
            return this.values[0];
        }
        get primitive() {
            return this.alias ? this.alias.value : this.value.toString();
        }
        toJSON() {
            return this.valueStore;
        }
        toString() {
            return this.alias ? this.alias.toString() + (this.value ? "[" + this.value.toString() + "]" : "") : this.value.toString();
        }
    }
    Backer.ValueStore = ValueStore;
    class Type {
        constructor(code, name, prototype, _container = null, values) {
            this.code = code;
            this.name = name;
            this.prototype = prototype;
            this._container = _container;
            this.values = values;
        }
        /**
         * Load a Backer.Type from CodeJSON
         */
        static load(code, data) {
            return new Type(code, data[2], code.prototypes[data[0]], data[1] ? Backer.FutureType.new(data[1]) : null, ValueStore.load(...data[3]));
        }
        /**
         * Generate a Backer.Type from Truth.Type
         */
        static new(code, type) {
            const name = type.isPattern ? type.name.substr(9) : type.name;
            const instance = new Type(code, name, Backer.Prototype.new(code, type), type.container ? Backer.FutureType.new(type.container) : null, new ValueStore(...type.values
                .filter(x => name !== x.value)
                .map(x => new Value(x.base ? Backer.FutureType.new(x.base) : null, x.aliased, x.value))));
            Backer.FutureType.TypeMap.set(type, instance);
            return instance;
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
         * @interal
         */
        get parallelContents() {
            const types = [];
            for (const { type: parallelType } of this.iterate(t => t.parallels, true))
                for (const { type: baseType } of parallelType.iterate(t => t.bases, true))
                    for (const content of baseType.contents)
                        if (!types.some(x => x.name === content.name))
                            types.push(content);
            return types;
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
        get value() {
            return this.values.primitive;
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
         * Checks whether this Type has the specified type
         * somewhere in it's base graph.
         */
        isRoot(baseType) {
            return this.is(baseType) || this.parallelRoots.includes(baseType);
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
        /**
         * Transfer ownership of this instance to another Code instance
         */
        transfer(code) {
            this.code = code;
            this.prototype.transfer(code);
        }
        toJSON() {
            return [this.prototype.id, this.container && this.container.id, this.name, this.values];
        }
    }
    Backer.Type = Type;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    /**
     * Keeps track of relations between types.
     */
    class TypeSet extends Set {
        static fromJSON(data) {
            return new TypeSet(data.map(x => Backer.FutureType.new(x)));
        }
        snapshot() {
            return this.toArray().map(x => x.type).filter(x => x);
        }
        toArray() {
            return Array.from(this.values()).sort();
        }
        toJSON() { return this.toArray(); }
        valueOf() { return this.toArray(); }
        [Symbol.toPrimitive]() { return this.toArray(); }
        get [Symbol.toStringTag]() { return "TypeSet"; }
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
        /**
         * Compress nested arrays
         * @param data An array with nested arrays in it
         */
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
        Util.encode = encode;
        /**
         * Decompress nested arrays
         * @param data A compressed array
         */
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
        Util.decode = decode;
        /**
         * Fetch a file without platform dependencies
         * @param url JSON file url
         */
        async function fetchJSON(url) {
            if (globalThis && "fetch" in globalThis) {
                const request = await globalThis.fetch(url);
                return await request.json();
            }
            throw "This platform is not supported!";
        }
        Util.fetchJSON = fetchJSON;
        /**
         * Make a property (non-)enumerable
         */
        function shadow(object, key, enumerable = false) {
            Object.defineProperty(object, key, {
                enumerable
            });
        }
        Util.shadow = shadow;
        /**
         * Make a properties (non-)enumerable
         */
        function shadows(object, enumerable = false, ...keys) {
            for (let key of keys)
                shadow(object, key, enumerable);
        }
        Util.shadows = shadows;
    })(Util = Backer.Util || (Backer.Util = {}));
})(Backer || (Backer = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc291cmNlL0FTVC50cyIsIi4uL3NvdXJjZS9CaXRmaWVsZHMudHMiLCIuLi9zb3VyY2UvQ29kZS50cyIsIi4uL3NvdXJjZS9FbmdpbmUudHMiLCIuLi9zb3VyY2UvRnV0dXJlVHlwZS50cyIsIi4uL3NvdXJjZS9Ob2Rlcy50cyIsIi4uL3NvdXJjZS9Qcm90b3R5cGUudHMiLCIuLi9zb3VyY2UvUmVmbGV4TGlicmFyeS50cyIsIi4uL3NvdXJjZS9TdXJyb2dhdGVzLnRzIiwiLi4vc291cmNlL1R5cGUudHMiLCIuLi9zb3VyY2UvVHlwZVNldC50cyIsIi4uL3NvdXJjZS9VdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUNDQSxJQUFVLE1BQU0sQ0FpRGY7QUFqREQsV0FBVSxNQUFNO0lBRWY7O09BRUc7SUFDSCxNQUFhLFNBQVM7UUFFckIsWUFBbUIsUUFBUSxDQUFDO1lBQVQsVUFBSyxHQUFMLEtBQUssQ0FBSTtRQUFHLENBQUM7UUFFaEM7O1dBRUc7UUFDSCxJQUFJLElBQUk7WUFFUCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxHQUFHLENBQUMsS0FBYTtZQUVoQixJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUU7Z0JBQzFCLE9BQU8sS0FBSyxDQUFDO1lBRWQsT0FBTyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNqRCxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxHQUFHLENBQUMsS0FBYSxFQUFFLEtBQWM7WUFFaEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFO2dCQUMx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LEtBQUosV0FBSSxRQTBHcEI7QUFBRCxDQUFDLEVBMUdTLE1BQU0sS0FBTixNQUFNLFFBMEdmIiwic291cmNlc0NvbnRlbnQiOlsiXG5uYW1lc3BhY2UgQmFja2VyLlRydXRoVGFsa1xue1xuXHQvL0B0cy1pZ25vcmVcblx0ZXhwb3J0IHR5cGUgQXRvbWljID0gUmVmbGV4LkNvcmUuQXRvbWljPE5vZGUsIEJyYW5jaD47XG5cdC8vQHRzLWlnbm9yZVxuXHRleHBvcnQgdHlwZSBBdG9taWNzID0gUmVmbGV4LkNvcmUuQXRvbWljczxOb2RlLCBCcmFuY2g+O1xuXHRcblx0LyoqICovXG5cdGV4cG9ydCBpbnRlcmZhY2UgTmFtZXNwYWNlIGV4dGVuZHNcblx0Ly9AdHMtaWdub3JlXG5cdFx0UmVmbGV4LkNvcmUuSUNvbnRhaW5lck5hbWVzcGFjZTxBdG9taWNzLCBCcmFuY2hlcy5RdWVyeT5cblx0e1xuXHRcdC8qKiAqL1xuXHRcdGlzKC4uLmF0b21pY3M6IEF0b21pY3NbXSk6IEJyYW5jaGVzLklzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGhhcyguLi5hdG9taWNzOiBBdG9taWNzW10pOiBCcmFuY2hlcy5IYXM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bm90KC4uLmF0b21pY3M6IEF0b21pY3NbXSk6IEJyYW5jaGVzLk5vdDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRvciguLi5hdG9taWNzOiBBdG9taWNzW10pOiBCcmFuY2hlcy5Pcjtcblx0XHRcblx0XHQvKiogKi9cblx0XHRjb250YWluZXJzKCk6IExlYXZlcy5Db250YWluZXJzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJvb3QoKTogTGVhdmVzLlJvb3RzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvbnRlbnRzKCk6IExlYXZlcy5Db250ZW50cztcblx0XHRcblx0XHQvKiogKi9cblx0XHRlcXVhbHModmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4pOiBMZWF2ZXMuUHJlZGljYXRlO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdyZWF0ZXJUaGFuKHZhbHVlOiBzdHJpbmcgfCBudW1iZXIpOiBMZWF2ZXMuUHJlZGljYXRlO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGxlc3NUaGFuKHZhbHVlOiBzdHJpbmcgfCBudW1iZXIpOiBMZWF2ZXMuUHJlZGljYXRlO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHN0YXJ0c1dpdGgodmFsdWU6IHN0cmluZyB8IG51bWJlcik6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZW5kc1dpdGgodmFsdWU6IHN0cmluZyB8IG51bWJlcik6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YWxpYXNlZCgpOiBMZWF2ZXMuQWxpYXNlZDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRsZWF2ZXMoKTogTGVhdmVzLkxlYXZlcztcblx0XHRcblx0XHQvKiogKi9cblx0XHRmcmVzaCgpOiBMZWF2ZXMuRnJlc2g7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c2xpY2Uoc3RhcnQ6IG51bWJlciwgZW5kPzogbnVtYmVyKTogTGVhdmVzLlNsaWNlO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdG9jY3VyZW5jZXMobWluOiBudW1iZXIsIG1heD86IG51bWJlcik6IExlYXZlcy5PY2N1cmVuY2VzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHNvcnQoLi4uY29udGVudFR5cGVzOiBPYmplY3RbXSk6IExlYXZlcy5Tb3J0O1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJldmVyc2UoKTogTGVhdmVzLlJldmVyc2U7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bmFtZXMoKTogTGVhdmVzLk5hbWVzO1xuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBCYWNrZXJcbntcblx0LyoqXG5cdCAqIEJpdHdpc2UgZmxhZyBtYW5hZ2VyXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQml0ZmllbGRzXG5cdHtcblx0XHRjb25zdHJ1Y3RvcihwdWJsaWMgZmxhZ3MgPSAwKSB7fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgYXBwcm94LiBzaXplIGJhc2VkIG9uIGxhc3Qgc2V0IGJpdC5cblx0XHQgKi9cblx0XHRnZXQgc2l6ZSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIE1hdGguY2VpbChNYXRoLmxvZzIodGhpcy5mbGFncykpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIGEgYm9vbGVhbiBmcm9tIHNwZWNpZmllZCBpbmRleC5cblx0XHQgKi9cblx0XHRnZXQoaW5kZXg6IG51bWJlcilcblx0XHR7XG5cdFx0XHRpZiAoaW5kZXggPCAwIHx8IGluZGV4ID4gMzEpXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gdGhpcy5mbGFncyAmICgxIDw8IGluZGV4KSA/IHRydWUgOiBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU2V0cyBhIGJvb2xlYW4gdG8gc3BlY2lmaWVkIGluZGV4LlxuXHRcdCAqL1xuXHRcdHNldChpbmRleDogbnVtYmVyLCB2YWx1ZTogYm9vbGVhbilcblx0XHR7XG5cdFx0XHRpZiAoaW5kZXggPCAwIHx8IGluZGV4ID4gMzEpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdFxuXHRcdFx0Y29uc3QgbWFzayA9IDEgPDwgaW5kZXg7XG5cdFx0XHRcblx0XHRcdGlmICh2YWx1ZSlcblx0XHRcdFx0dGhpcy5mbGFncyB8PSBtYXNrO1xuXHRcdFx0ZWxzZSBcblx0XHRcdFx0dGhpcy5mbGFncyAmPSB+bWFzaztcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKCkgeyByZXR1cm4gdGhpcy5mbGFnczsgfVxuXHRcdHZhbHVlT2YoKSB7IHJldHVybiB0aGlzLmZsYWdzOyB9XG5cdFx0W1N5bWJvbC50b1ByaW1pdGl2ZV0oKSB7IHJldHVybiB0aGlzLmZsYWdzOyB9XG5cdFx0Z2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkgeyByZXR1cm4gXCJCaXRmaWVsZHNcIjsgfVxuXHR9XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyXG57XHRcblx0LyoqXG5cdCAqIFJlZmVyYW5jZXMgdG8gZXZlcnkgbG9hZGVkIENvZGUgaW5zdGFuY2UuXG5cdCAqL1xuXHRleHBvcnQgY29uc3QgQ29kZXM6IENvZGVbXSA9IFtdO1xuXHRcblx0LyoqXG5cdCAqIExhc3QgbG9hZGVkIFNjaGVtYVxuXHQgKi9cblx0ZXhwb3J0IGxldCBTY2hlbWE6IFJlY29yZDxzdHJpbmcsIFN0cnVjdD4gPSB7fTtcblx0XG5cdC8qKlxuXHQgKiBSZWZlcmFuY2VzIHRvIGV2ZXJ5IGxvYWRlZCBTY2hlbWFcblx0ICovXG5cdGV4cG9ydCBjb25zdCBTY2hlbWFzOiBSZWNvcmQ8c3RyaW5nLCBTdHJ1Y3Q+W10gPSBbXTtcblx0XG5cdC8qKlxuXHQgKiBMYXN0IGxvYWRlZCBEYXRhIEdyYXBoXG5cdCAqL1xuXHRleHBvcnQgbGV0IEdyYXBoOiBSZWNvcmQ8c3RyaW5nLCBTdXJyb2dhdGU+ID0ge307XG5cdFxuXHQvKipcblx0ICogUmVmZXJhbmNlcyB0byBldmVyeSBsb2FkZWQgRGF0YSBHcmFwaFxuXHQgKi9cblx0ZXhwb3J0IGNvbnN0IEdyYXBoczogUmVjb3JkPHN0cmluZywgU3Vycm9nYXRlPltdID0gW107XG5cdFxuXHQvKipcblx0ICogVHJ1dGggQ29kZSBKU09OXG5cdCAqIFxuXHQgKiBUaGlzIGNsYXNzIG1hbmFnZXMgY29kZSB0eXBlcyBleHRyYWN0ZWQgZnJvbSBUcnV0aCBmaWxlIGJ5IGNvbXBpbGVyLlxuXHQgKiBBbHNvIG1hbmFnZXMgcmVsYXRpb25zIGJldHdlZW4gcHJvdG90eXBlLCB0eXBlcyBhbmQgZGF0YS4gXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQ29kZVxuXHR7XG5cdFx0LyoqXG5cdFx0ICogTG9hZHMgYSBDb2RlSlNPTiBhbmQgbG9hZHMgRGF0YUpTT05zIG9uIHRoYXQgQ29kZSBpbnN0YW5jZS5cblx0XHQgKiBcblx0XHQgKiBAcGFyYW0gY29kZSBDb2RlSlNPTiBVcmxcblx0XHQgKiBAcGFyYW0gZGF0YSBEYXRhSlNPTiBVcmxzXG5cdFx0ICovXG5cdFx0c3RhdGljIGFzeW5jIGxvYWQoY29kZTogc3RyaW5nLCAuLi5kYXRhOiBzdHJpbmdbXSlcblx0XHR7XG5cdFx0XHRjb25zdCBpbnN0YW5jZSA9IENvZGUubmV3KGF3YWl0IFV0aWwuZmV0Y2hKU09OKGNvZGUpKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCB1cmwgb2YgZGF0YSlcblx0XHRcdFx0aW5zdGFuY2UubG9hZERhdGEoYXdhaXQgVXRpbC5mZXRjaEpTT04odXJsKSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBpbnN0YW5jZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogTG9hZHMgYSBDb2RlIGluc3RhbmNlIGZyb20gcGFyc2VkIENvZGUgSlNPTi5cblx0XHQgKiBAcGFyYW0gZGF0YSBQYXJzZWQgQ29kZUpTT05cblx0XHQgKi9cblx0XHRzdGF0aWMgbmV3KGRhdGE6IFtQcm90b3R5cGVKU09OW10sIFR5cGVKU09OW11dKVxuXHRcdHtcblx0XHRcdGNvbnN0IGNvZGUgPSBuZXcgQ29kZSgpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBwcm90b3R5cGVzID0gZGF0YVswXS5tYXAoeCA9PiBQcm90b3R5cGUubG9hZChjb2RlLCB4KSk7XG5cdFx0XHRmb3IgKGNvbnN0IHByb3RvIG9mIHByb3RvdHlwZXMpXG5cdFx0XHRcdGNvZGUucHJvdG90eXBlcy5wdXNoKHByb3RvKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgdHlwZXMgPSBkYXRhWzFdLm1hcCh4ID0+IFR5cGUubG9hZChjb2RlLCB4KSk7XG5cdFx0XHRmb3IgKGNvbnN0IHR5cGUgb2YgdHlwZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGlkID0gY29kZS50eXBlcy5wdXNoKHR5cGUpIC0gMTtcblx0XHRcdFx0RnV0dXJlVHlwZS5JZE1hcC5zZXQoaWQsIHR5cGUpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRjb25zdCBTY2hlbWE6IFJlY29yZDxzdHJpbmcsIFN0cnVjdD4gPSB7fTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCB0eXBlIG9mIHR5cGVzKVxuXHRcdFx0XHRpZiAoIXR5cGUuY29udGFpbmVyKVxuXHRcdFx0XHRcdFNjaGVtYVt0eXBlLm5hbWVdID0gbmV3IFN0cnVjdCh0eXBlLCBudWxsKTtcblx0XHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0QmFja2VyLlNjaGVtYSA9IFNjaGVtYTtcblx0XHRcdFx0XHRcblx0XHRcdFNjaGVtYXMucHVzaChTY2hlbWEpO1xuXHRcdFx0Q29kZXMucHVzaChjb2RlKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGNvZGU7XG5cdFx0fVxuXHRcdFxuXHRcdHR5cGVzOiBUeXBlW10gPSBbXTtcblx0XHRwcm90b3R5cGVzOiBQcm90b3R5cGVbXSA9IFtdO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEJpbmRzIGEgdHlwZSB0byBDb2RlIGluc3RhbmNlXG5cdFx0ICovXG5cdFx0YWRkKHR5cGU6IFR5cGUpXG5cdFx0e1xuXHRcdFx0aWYgKCF0aGlzLnByb3RvdHlwZXMuc29tZSh4ID0+IHguaGFzaCA9PT0gdHlwZS5wcm90b3R5cGUuaGFzaCkpXG5cdFx0XHRcdHRoaXMucHJvdG90eXBlcy5wdXNoKHR5cGUucHJvdG90eXBlKTtcblx0XHRcdFx0XG5cdFx0XHRjb25zdCBpZCA9IHRoaXMudHlwZXMucHVzaCh0eXBlKSAtIDE7XG5cdFx0XHR0eXBlLnRyYW5zZmVyKHRoaXMpO1xuXHRcdFx0cmV0dXJuIGlkO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBMb2FkcyBkYXRhIHR5cGVzIGFuZCBzdXJyb2dhdGVzIGZyb20gcGFyc2VkIERhdGFKU09OLlxuXHRcdCAqIEBwYXJhbSBkYXRhIFBhcnNlZCBEYXRhSlNPTlxuXHRcdCAqL1xuXHRcdGxvYWREYXRhKGRhdGE6IERhdGFKU09OW10pXG5cdFx0e1x0XG5cdFx0XHRjb25zdCBHcmFwaDogUmVjb3JkPHN0cmluZywgU3Vycm9nYXRlPiA9IHt9O1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGluZm8gb2YgZGF0YSlcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgcHJvdG90eXBlcyA9IGluZm8uc2hpZnQoKSBhcyBudW1iZXJbXTtcblx0XHRcdFx0Y29uc3QgbmFtZSA9IGluZm8uc2hpZnQoKSBhcyBzdHJpbmc7XG5cdFx0XHRcdGNvbnN0IHByb3RvdHlwZSA9IHRoaXMucHJvdG90eXBlc1twcm90b3R5cGVzLnNoaWZ0KCkhXTtcblx0XHRcdFx0Y29uc3QgdHlwZSA9IG5ldyBUeXBlKFxuXHRcdFx0XHRcdHRoaXMsIFxuXHRcdFx0XHRcdG5hbWUsIFxuXHRcdFx0XHRcdHByb3RvdHlwZSwgXG5cdFx0XHRcdFx0bnVsbCxcblx0XHRcdFx0XHRWYWx1ZVN0b3JlLmxvYWQoLi4uaW5mby5zaGlmdCgpIGFzIFZhbHVlSlNPTltdKVxuXHRcdFx0XHQpO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgZ2VuZXJhdGUgPSAoYmFzZTogVHlwZSwgY29udGVudHM6IFR5cGVbXSkgPT4gXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRmb3IgKGNvbnN0IGNvbnRlbnQgb2YgY29udGVudHMpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y29uc3QgY2xvbmUgPSBuZXcgVHlwZShcblx0XHRcdFx0XHRcdFx0dGhpcyxcblx0XHRcdFx0XHRcdFx0Y29udGVudC5uYW1lLFxuXHRcdFx0XHRcdFx0XHR0aGlzLnByb3RvdHlwZXNbcHJvdG90eXBlcy5zaGlmdCgpIV0sXG5cdFx0XHRcdFx0XHRcdEZ1dHVyZVR5cGUubmV3KGJhc2UpLFxuXHRcdFx0XHRcdFx0XHRjb250ZW50LnZhbHVlcy5jb25jYXQoVmFsdWVTdG9yZS5sb2FkKC4uLmluZm8uc2hpZnQoKSBhcyBWYWx1ZUpTT05bXSkpXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0dGhpcy50eXBlcy5wdXNoKGNsb25lKTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0Z2VuZXJhdGUoY2xvbmUsIGNsb25lLnBhcmFsbGVsQ29udGVudHMpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0Z2VuZXJhdGUodHlwZSwgdHlwZS5wYXJhbGxlbENvbnRlbnRzKTtcblx0XHRcdFx0XG5cdFx0XHRcdEdyYXBoW3R5cGUubmFtZV0gPSBuZXcgU3Vycm9nYXRlKHR5cGUsIG51bGwpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRCYWNrZXIuR3JhcGggPSBHcmFwaDtcblx0XHRcdEdyYXBocy5wdXNoKEdyYXBoKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIEdyYXBoO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBFeHRyYWN0IGRhdGEgZnJvbSBjdXJyZW50IHR5cGVzIG9mIENvZGVcblx0XHQgKiBAcGFyYW0gcGF0dGVybiBEYXRhIE5hbWUgUGF0dGVyblxuXHRcdCAqL1xuXHRcdGV4dHJhY3REYXRhKHBhdHRlcm46IFJlZ0V4cClcblx0XHR7XG5cdFx0XHRjb25zdCBkYXRhUm9vdHMgPSB0aGlzLnR5cGVzLmZpbHRlcih4ID0+IHguY29udGFpbmVyID09PSBudWxsICYmIHBhdHRlcm4udGVzdCh4Lm5hbWUpKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgZHJpbGwgPSAoeDogVHlwZSkgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgYXJyYXkgPSBbeF07XG5cdFx0XHRcdGZvciAoY29uc3QgdHlwZSBvZiB4LmNvbnRlbnRzKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgY2hpbGQgPSBkcmlsbCh0eXBlKS5mbGF0KCk7XG5cdFx0XHRcdFx0aWYgKGNoaWxkLmxlbmd0aClcblx0XHRcdFx0XHRcdGFycmF5LnB1c2goLi4uY2hpbGQpO1xuXHRcdFx0XHR9IFxuXHRcdFx0XHRyZXR1cm4gYXJyYXk7XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0XHRjb25zdCBkYXRhU2NoZW1hID0gZGF0YVJvb3RzLm1hcChkcmlsbCkuZmlsdGVyKHggPT4gQXJyYXkuaXNBcnJheSh4KSA/IHgubGVuZ3RoIDogdHJ1ZSk7XG5cdFx0XHRjb25zdCBkYXRhUXVlcnkgPSBkYXRhU2NoZW1hLmZsYXQoKTtcblx0XHRcdGNvbnN0IGNvZGVSb290cyA9IHRoaXMudHlwZXMuZmlsdGVyKHggPT4gIWRhdGFRdWVyeS5pbmNsdWRlcyh4KSk7XG5cdFx0XHRjb25zdCBjb2RlID0gbmV3IENvZGUoKTtcblx0XHRcdGZvciAoY29uc3QgdHlwZSBvZiBjb2RlUm9vdHMpXG5cdFx0XHRcdGNvZGUuYWRkKHR5cGUpO1xuXHRcdFx0XHRcblx0XHRcdGZvciAoY29uc3QgdHlwZSBvZiBkYXRhUXVlcnkpXG5cdFx0XHR7XHRcdFx0XG5cdFx0XHRcdGlmICghY29kZS5wcm90b3R5cGVzLnNvbWUoeCA9PiB4Lmhhc2ggPT09IHR5cGUucHJvdG90eXBlLmhhc2gpKVxuXHRcdFx0XHRcdGNvZGUucHJvdG90eXBlcy5wdXNoKHR5cGUucHJvdG90eXBlKTtcdFxuXHRcdFx0XHR0eXBlLnRyYW5zZmVyKGNvZGUpO1xuXHRcdFx0fVxuXHRcdFxuXHRcdFx0Y29uc3QgZGF0YSA9IGRhdGFTY2hlbWEubWFwKHggPT4gW3gubWFwKHggPT4geC5wcm90b3R5cGUuaWQpLCB4WzBdLm5hbWUsIC4uLngubWFwKHggPT4geC52YWx1ZXMudmFsdWVTdG9yZSldKTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjb2RlLFxuXHRcdFx0XHRkYXRhXG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdHRvSlNPTigpIHsgcmV0dXJuIFt0aGlzLnByb3RvdHlwZXMsIHRoaXMudHlwZXNdOyB9XG5cdFx0dmFsdWVPZigpIHsgcmV0dXJuIHRoaXMudHlwZXMubGVuZ3RoOyB9XG5cdFx0W1N5bWJvbC50b1ByaW1pdGl2ZV0oKSB7IHJldHVybiB0aGlzLnR5cGVzLmxlbmd0aDsgfVxuXHRcdGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpIHsgcmV0dXJuIFwiQ29kZVwiOyB9XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXIuVHJ1dGhUYWxrXG57XG5cdHR5cGUgQ3Vyc29yID0gU3Vycm9nYXRlIHwgTmFtZTtcblx0dHlwZSBNYXliZUFycmF5PFQ+ID0gVCB8IFRbXTtcblx0XG5cdGNvbnN0IFN1cnJvZ2F0ZUZpbHRlciA9ICh4OiBDdXJzb3IpOiB4IGlzIFN1cnJvZ2F0ZSA9PiB4IGluc3RhbmNlb2YgU3Vycm9nYXRlO1xuXHRcblx0LyoqXG5cdCAqIEtlZXBzIHRyYWNrIG9mIHBvc3NpYmxlIG91dHB1dCBvZiBxdWVyeVxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIEN1cnNvclNldFxuXHR7XHRcblx0XHRjdXJzb3JzOiBTZXQ8Q3Vyc29yPjtcblx0XHRcblx0XHRjb25zdHJ1Y3RvciguLi5jdXJzb3JzOiBDdXJzb3JbXSlcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KGN1cnNvcnMpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTbmFwc2hvdCBvZiBjdXJyZW50IHBvc3NpYmlsaXRpZXNcblx0XHQgKi9cblx0XHRzbmFwc2hvdCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIEFycmF5LmZyb20odGhpcy5jdXJzb3JzKTtcblx0XHR9XG5cdFx0XG5cdFx0bWFwKGZpbHRlcjogKGN1cnNvcjogQ3Vyc29yKSA9PiBib29sZWFuLCBtYXA6IChpdGVtczogQ3Vyc29yKSA9PiBNYXliZUFycmF5PEN1cnNvcj4pXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkuZmlsdGVyKGZpbHRlcikuZmxhdE1hcChtYXApLmZpbHRlcih4ID0+ICEheCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDbG9uZXMgY3VycmVudCBzdGF0ZSBvZiBDdXJzb3JTZXRcblx0XHQgKi9cblx0XHRjbG9uZSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBDdXJzb3JTZXQoLi4udGhpcy5zbmFwc2hvdCgpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRmlsdGVycyBjdXJyZW50IHBvc3NpYmlsaXRpZXNcblx0XHQgKi9cblx0XHRmaWx0ZXIoZm46ICh2OiBDdXJzb3IpID0+IGJvb2xlYW4pXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkuZmlsdGVyKHggPT4gZm4oeCkpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRmlsdGVycyBjdXJyZW50IHBvc3NpYmlsaXRpZXNcblx0XHQgKi9cblx0XHRmaWx0ZXJTdXJyb2dhdGUoZm46ICh2OiBTdXJyb2dhdGUpID0+IGJvb2xlYW4pXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkuZmlsdGVyKCh4KTogeCBpcyBTdXJyb2dhdGUgPT4geCBpbnN0YW5jZW9mIFN1cnJvZ2F0ZSAmJiBmbih4KSkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBFeGVjdXRlcyBhIFRydXRoIFRhbGsgcXVlcnlcblx0XHQgKi9cblx0XHRxdWVyeShhc3Q6IEJyYW5jaCB8IExlYWYpIFxuXHRcdHtcblx0XHRcdGlmIChhc3QgaW5zdGFuY2VvZiBCcmFuY2gpXG5cdFx0XHRcdHRoaXMuYnJhbmNoKGFzdCk7XG5cdFx0XHRlbHNlIFxuXHRcdFx0XHR0aGlzLmxlYWYoYXN0KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRXhlY3V0ZXMgYSBUcnV0aCBUYWxrIGJyYW5jaFxuXHRcdCAqL1xuXHRcdGJyYW5jaChicmFuY2g6IEJyYW5jaCkgXG5cdFx0e1xuXHRcdFx0c3dpdGNoIChicmFuY2hbb3BdKVxuXHRcdFx0e1xuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLmlzOlxuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLnF1ZXJ5OlxuXHRcdFx0XHRcdGZvciAoY29uc3QgcXVlcnkgb2YgYnJhbmNoLmNoaWxkcmVuKVxuXHRcdFx0XHRcdFx0dGhpcy5xdWVyeShxdWVyeSk7XHRcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBCcmFuY2hPcC5ub3Q6IFxuXHRcdFx0XHRcdHRoaXMubm90KGJyYW5jaCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgQnJhbmNoT3Aub3I6XG5cdFx0XHRcdFx0dGhpcy5vcihicmFuY2gpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLmhhczpcblx0XHRcdFx0XHR0aGlzLmNvbnRlbnRzKCk7XG5cdFx0XHRcdFx0Zm9yIChjb25zdCBxdWVyeSBvZiBicmFuY2guY2hpbGRyZW4pXG5cdFx0XHRcdFx0XHR0aGlzLnF1ZXJ5KHF1ZXJ5KTtcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lcnMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRXhlY3V0ZXMgYSBUcnV0aCBUYWxrIGxlYWZcblx0XHQgKi9cblx0XHRsZWFmKGxlYWY6IExlYWYpIFxuXHRcdHtcblx0XHRcdHN3aXRjaCAobGVhZltvcF0pXG5cdFx0XHR7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLnN1cnJvZ2F0ZTpcblx0XHRcdFx0XHR0aGlzLmZpbHRlclN1cnJvZ2F0ZSh4ID0+IHhbdHlwZU9mXS5pcygoPFN1cnJvZ2F0ZT5sZWFmKVt0eXBlT2ZdKSB8fCB4W3R5cGVPZl0ucGFyYWxsZWxSb290cy5pbmNsdWRlcygoPFN1cnJvZ2F0ZT5sZWFmKVt0eXBlT2ZdKSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLmNvbnRlbnRzOlxuXHRcdFx0XHRcdHRoaXMuY29udGVudHMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3Aucm9vdHM6XG5cdFx0XHRcdFx0dGhpcy5yb290cygpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5jb250YWluZXJzOlxuXHRcdFx0XHRcdHRoaXMuY29udGFpbmVycygpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5hbGlhc2VkOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHggPT4geFt2YWx1ZV0gIT09IG51bGwpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5sZWF2ZXM6XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoeCA9PiB4W3ZhbHVlXSA9PT0gbnVsbCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLmZyZXNoOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyU3Vycm9nYXRlKHggPT4geFt0eXBlT2ZdLmlzRnJlc2gpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLmVxdWFsczpcblx0XHRcdFx0XHR0aGlzLmZpbHRlcih4ID0+IHhbdmFsdWVdICE9PSBudWxsID8geFt2YWx1ZV0gPT0gKDxMZWF2ZXMuUHJlZGljYXRlPmxlYWYpLm9wZXJhbmQgOiBmYWxzZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgUHJlZGljYXRlT3AuZ3JlYXRlclRoYW46XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoeCA9PiAoeFt2YWx1ZV0gfHzCoDApID4gKDxMZWF2ZXMuUHJlZGljYXRlPmxlYWYpLm9wZXJhbmQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLmxlc3NUaGFuOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHggPT4gKHhbdmFsdWVdIHx8IDApIDwgKDxMZWF2ZXMuUHJlZGljYXRlPmxlYWYpLm9wZXJhbmQpO1xuXHRcdFx0XHRcdGJyZWFrO1x0XG5cdFx0XHRcdGNhc2UgUHJlZGljYXRlT3Auc3RhcnRzV2l0aDpcblx0XHRcdFx0XHR0aGlzLmZpbHRlcih4ID0+IHhbdmFsdWVdID09IG51bGwgPyBmYWxzZSA6IHhbdmFsdWVdIS50b1N0cmluZygpLnN0YXJ0c1dpdGgoPHN0cmluZz4oPExlYXZlcy5QcmVkaWNhdGU+bGVhZikub3BlcmFuZCkpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLmVuZHNXaXRoOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHggPT4geFt2YWx1ZV0gPT0gbnVsbCA/IGZhbHNlIDogeFt2YWx1ZV0hLnRvU3RyaW5nKCkuZW5kc1dpdGgoPHN0cmluZz4oPExlYXZlcy5QcmVkaWNhdGU+bGVhZikub3BlcmFuZCkpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5zbGljZTpcblx0XHRcdFx0XHR0aGlzLnNsaWNlKGxlYWYpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5vY2N1cmVuY2VzOlxuXHRcdFx0XHRcdHRoaXMub2NjdXJlbmNlcyhsZWFmKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3Auc29ydDogXG5cdFx0XHRcdFx0dGhpcy5zb3J0KGxlYWYpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5yZXZlcnNlOlxuXHRcdFx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQodGhpcy5zbmFwc2hvdCgpLnJldmVyc2UoKSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLm5hbWVzOlxuXHRcdFx0XHRcdHRoaXMubWFwKFN1cnJvZ2F0ZUZpbHRlciwgKHgpID0+ICg8U3Vycm9nYXRlPngpW25hbWVdKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogR28gb25lIGxldmVsIG5lc3RlZCBpblxuXHRcdCAqL1xuXHRcdGNvbnRlbnRzKClcblx0XHR7XG5cdFx0XHR0aGlzLm1hcChTdXJyb2dhdGVGaWx0ZXIsIHggPT4gKDxTdXJyb2dhdGU+eCkuY29udGVudHMpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHbyB0byB0b3AgbGV2ZWxcblx0XHQgKi9cblx0XHRyb290cygpXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkubWFwKCh4OiBDdXJzb3IgfMKgbnVsbCkgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdHdoaWxlICh4ICYmIHhbcGFyZW50XSkgXG5cdFx0XHRcdFx0XHR4ID0geFtwYXJlbnRdIGFzIFN1cnJvZ2F0ZTtcblx0XHRcdFx0XHRyZXR1cm4geDtcdFx0XHRcdFxuXHRcdFx0XHR9KS5maWx0ZXIoKHgpOiB4IGlzIFN1cnJvZ2F0ZSA9PiAhIXgpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogR28gb25lIGxldmVsIG5lc3RlZCBvdXRcblx0XHQgKi9cblx0XHRjb250YWluZXJzKClcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KHRoaXMuc25hcHNob3QoKS5tYXAoeCA9PiB4W3BhcmVudF0pLmZpbHRlcigoeCk6IHggaXMgU3Vycm9nYXRlID0+ICEheCkpO1xuXHRcdH1cblx0XG5cdFx0LyoqICovXG5cdFx0bm90KGJyYW5jaDogQnJhbmNoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGluc3RhbmNlID0gdGhpcy5jbG9uZSgpO1xuXHRcdFx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBxdWVyeSBvZiBicmFuY2guY2hpbGRyZW4pXG5cdFx0XHRcdGluc3RhbmNlLnF1ZXJ5KHF1ZXJ5KTtcblx0XHRcdFxuXHRcdFx0Y29uc3Qgc25hcCA9IGluc3RhbmNlLnNuYXBzaG90KCk7XG5cdFx0XHR0aGlzLmZpbHRlcih4ID0+ICFzbmFwLmluY2x1ZGVzKHgpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0b3IoYnJhbmNoOiBCcmFuY2gpXG5cdFx0e1xuXHRcdFx0Y29uc3QgaW5zdGFuY2VzID0gW107XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgcXVlcnkgb2YgYnJhbmNoLmNoaWxkcmVuKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBpbnN0YW5jZSA9IHRoaXMuY2xvbmUoKTtcdFxuXHRcdFx0XHRpbnN0YW5jZS5xdWVyeShxdWVyeSk7XG5cdFx0XHRcdGluc3RhbmNlcy5wdXNoKGluc3RhbmNlKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Y29uc3Qgc25hcCA9IGluc3RhbmNlcy5mbGF0KCk7XG5cdFx0XHR0aGlzLmZpbHRlcih4ID0+IHNuYXAuaW5jbHVkZXMoeCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRzbGljZShsZWFmOiBMZWFmKVxuXHRcdHtcblx0XHRcdGxldCB7XG5cdFx0XHRcdHN0YXJ0LFxuXHRcdFx0XHRlbmRcblx0XHRcdH3CoD0gPExlYXZlcy5TbGljZT5sZWFmO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBzbmFwID0gdGhpcy5zbmFwc2hvdCgpO1xuXHRcdFx0aWYgKGVuZCAmJiBlbmQgPCAxKSBlbmQgPSBzdGFydCArIE1hdGgucm91bmQoZW5kICogc25hcC5sZW5ndGgpO1xuXHRcdFx0XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KHNuYXAuc2xpY2Uoc3RhcnQsIGVuZCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRvY2N1cmVuY2VzKGxlYWY6IExlYWYpXG5cdFx0e1xuXHRcdFx0bGV0IHtcblx0XHRcdFx0bWluLFxuXHRcdFx0XHRtYXhcblx0XHRcdH3CoD0gPExlYXZlcy5PY2N1cmVuY2VzPmxlYWY7XG5cdFx0XHRcblx0XHRcdGlmICghbWF4KSBtYXggPSBtaW47XG5cblx0XHRcdGNvbnN0IHZhbHVlTWFwOiBSZWNvcmQ8c3RyaW5nLCBDdXJzb3JbXT4gPSB7fTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBpdGVtIG9mIHRoaXMuY3Vyc29ycylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdmFsID0gSlNPTi5zdHJpbmdpZnkoaXRlbVt2YWx1ZV0pO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKCF2YWx1ZU1hcC5oYXNPd25Qcm9wZXJ0eSh2YWwpKVxuXHRcdFx0XHRcdHZhbHVlTWFwW3ZhbF0gPSBbXTtcblx0XHRcdFx0XHRcblx0XHRcdFx0dmFsdWVNYXBbdmFsXS5wdXNoKGl0ZW0pO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KE9iamVjdC52YWx1ZXModmFsdWVNYXApLmZpbHRlcih4ID0+IHgubGVuZ3RoID49IG1pbiAmJiB4Lmxlbmd0aCA8PSBtYXgpLmZsYXQoKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGlzKHN1cnJvZ2F0ZTogU3Vycm9nYXRlLCBub3QgPSBmYWxzZSlcblx0XHR7XG5cdFx0XHRjb25zdCBpbnN0YW5jZSA9IHRoaXMuY2xvbmUoKTtcblx0XHRcdHJldHVybiBpbnN0YW5jZS5maWx0ZXJTdXJyb2dhdGUoeCA9PiBcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IGNvbmRpdGlvbiA9IHhbdHlwZU9mXS5pcyhzdXJyb2dhdGVbdHlwZU9mXSkgfHwgeFt0eXBlT2ZdLnBhcmFsbGVsUm9vdHMuaW5jbHVkZXMoc3Vycm9nYXRlW3R5cGVPZl0pO1xuXHRcdFx0XHRcdHJldHVybiBub3QgPyAhY29uZGl0aW9uIDogY29uZGl0aW9uO1xuXHRcdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c29ydChsZWFmOiBMZWFmKVxuXHRcdHtcblx0XHRcdGNvbnN0IHN0cnVjdHMgPSAoPFN0cnVjdFtdPig8TGVhdmVzLlNvcnQ+bGVhZikuY29udGVudFR5cGVzKS5maWx0ZXIoKHgpID0+ICEheCkucmV2ZXJzZSgpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBzbmFwID0gdGhpcy5zbmFwc2hvdCgpO1xuXHRcdFx0Zm9yIChjb25zdCBzdHJ1Y3Qgb2Ygc3RydWN0cylcblx0XHRcdFx0c25hcC5zb3J0KChhLCBiKSA9PiBcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChhIGluc3RhbmNlb2YgTmFtZSkgXG5cdFx0XHRcdFx0XHRpZiAoYiBpbnN0YW5jZW9mIE5hbWUpXG5cdFx0XHRcdFx0XHRcdHJldHVybiAwO1xuXHRcdFx0XHRcdFx0ZWxzZSByZXR1cm4gLTE7XG5cdFx0XHRcdFx0aWYgKGIgaW5zdGFuY2VvZiBOYW1lKVxuXHRcdFx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29uc3QgcDEgPSBhLmdldChzdHJ1Y3QpO1xuXHRcdFx0XHRcdGNvbnN0IHAyID0gYi5nZXQoc3RydWN0KTtcblx0XHRcdFx0XHRjb25zdCB2MTogbnVtYmVyID0gcDEgPyA8YW55PnAxW3ZhbHVlXSB8fCAwOiAwO1xuXHRcdFx0XHRcdGNvbnN0IHYyOiBudW1iZXIgPSBwMiA/IDxhbnk+cDJbdmFsdWVdIHx8IDA6IDA7XG5cdFx0XHRcdFx0cmV0dXJuIHYxIC0gdjI7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KHNuYXApO1xuXHRcdH1cblx0XHRcblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlclxue1xuXHRcblx0ZXhwb3J0IHR5cGUgVHlwZWlzaCA9IFRydXRoLlR5cGUgfMKgVHlwZSB8IG51bWJlcjtcblx0XG5cdGV4cG9ydCBjbGFzcyBGdXR1cmVUeXBlXG5cdHtcblx0XHRzdGF0aWMgQ2FjaGUgPSBuZXcgTWFwPFR5cGVpc2gsIEZ1dHVyZVR5cGU+KCk7XG5cdFx0c3RhdGljIFR5cGVNYXAgPSBuZXcgTWFwPFRydXRoLlR5cGUsIFR5cGU+KCk7XG5cdFx0c3RhdGljIElkTWFwID0gbmV3IE1hcDxudW1iZXIsIFR5cGU+KCk7XG5cdFx0XG5cdFx0c3RhdGljIG5ldyh2YWx1ZTogVHlwZWlzaClcblx0XHR7XG5cdFx0XHRjb25zdCBjYWNoZWQgPSBGdXR1cmVUeXBlLkNhY2hlLmdldCh2YWx1ZSk7XG5cdFx0XHRcblx0XHRcdGlmIChjYWNoZWQpXG5cdFx0XHRcdHJldHVybiBjYWNoZWQ7XG5cdFx0XHRcdFxuXHRcdFx0Y29uc3QgaW5zdGFuY2UgPSBuZXcgRnV0dXJlVHlwZSh2YWx1ZSk7XG5cdFx0XHRGdXR1cmVUeXBlLkNhY2hlLnNldCh2YWx1ZSwgaW5zdGFuY2UpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gaW5zdGFuY2U7XG5cdFx0fSBcblx0XHRcblx0XHRjb25zdHJ1Y3Rvcihwcml2YXRlIHZhbHVlOiBUeXBlaXNoKSB7IH1cblx0XHQgXG5cdFx0Z2V0IHR5cGUoKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLnZhbHVlIGluc3RhbmNlb2YgVHJ1dGguVHlwZSlcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdHlwZSA9IEZ1dHVyZVR5cGUuVHlwZU1hcC5nZXQodGhpcy52YWx1ZSk7XG5cdFx0XHRcdGlmICghdHlwZSkgXG5cdFx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHRcdHJldHVybiB0eXBlO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRpZiAodGhpcy52YWx1ZSBpbnN0YW5jZW9mIFR5cGUpXG5cdFx0XHRcdHJldHVybiB0aGlzLnZhbHVlO1xuXHRcdFx0XHRcblx0XHRcdHJldHVybiBGdXR1cmVUeXBlLklkTWFwLmdldCh0aGlzLnZhbHVlKSB8fCBudWxsO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaWQoKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLnZhbHVlIGluc3RhbmNlb2YgVHJ1dGguVHlwZSlcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdHlwZSA9IEZ1dHVyZVR5cGUuVHlwZU1hcC5nZXQodGhpcy52YWx1ZSk7XG5cdFx0XHRcdGlmICghdHlwZSkgXG5cdFx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0XHRyZXR1cm4gdHlwZS5pZDtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMudmFsdWUgaW5zdGFuY2VvZiBUeXBlKVxuXHRcdFx0XHRyZXR1cm4gdGhpcy52YWx1ZS5pZDtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gdGhpcy52YWx1ZTtcblx0XHR9XG5cdFx0XG5cdFx0aXModHlwZTogVHlwZSlcblx0XHR7XG5cdFx0XHRjb25zdCB2YWx1ZVR5cGUgPSB0aGlzLnZhbHVlO1xuXHRcdFx0aWYgKCF2YWx1ZVR5cGUpIHJldHVybiBmYWxzZTtcblx0XHRcdHJldHVybiB2YWx1ZVR5cGUgPT09IHR5cGU7XHRcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKCkgeyByZXR1cm4gdGhpcy5pZDsgfVxuXHRcdHZhbHVlT2YoKSB7IHJldHVybiB0aGlzLmlkOyB9XG5cdFx0W1N5bWJvbC50b1ByaW1pdGl2ZV0oKSB7IHJldHVybiB0aGlzLmlkOyB9XG5cdFx0Z2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkgeyByZXR1cm4gXCJGdXR1cmVUeXBlXCI7IH1cblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlci5UcnV0aFRhbGtcbntcblx0ZXhwb3J0IGNvbnN0IG9wID0gU3ltYm9sKFwib3BcIik7XG5cdGV4cG9ydCBjb25zdCBjb250YWluZXIgPSBTeW1ib2woXCJjb250YWluZXJcIik7XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGVudW0gQnJhbmNoT3Bcblx0e1xuXHRcdHF1ZXJ5ID0gMSxcblx0XHRpcyA9IDIsXG5cdFx0aGFzID0gMyxcblx0XHRub3QgPSA0LFxuXHRcdG9yID0gNSxcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBlbnVtIFByZWRpY2F0ZU9wXG5cdHtcblx0XHRlcXVhbHMgPSAzMCxcblx0XHRncmVhdGVyVGhhbiA9IDMxLFxuXHRcdGdyZWF0ZXJUaGFuT3JFcXVhbHMgPSAzMixcblx0XHRsZXNzVGhhbiA9IDMzLFxuXHRcdGxlc3NUaGFuT3JFcXVhbHMgPSAzNCxcblx0XHRhbGlrZSA9IDM1LFxuXHRcdHN0YXJ0c1dpdGggPSAzNixcblx0XHRlbmRzV2l0aCAgPSAzNyxcblx0XHRpbmNsdWRlcyA9IDM4LFxuXHRcdG1hdGNoZXMgPSAzOVxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGVudW0gTGVhZk9wXG5cdHtcblx0XHRwcmVkaWNhdGUgPSA2MCxcblx0XHRzbGljZSA9IDYxLFxuXHRcdG9jY3VyZW5jZXMgPSA2Mixcblx0XHRhbGlhc2VkID0gNjMsXG5cdFx0dGVybWluYWxzID0gNjQsXG5cdFx0c29ydCA9IDY1LFxuXHRcdHJldmVyc2UgPSA2Nixcblx0XHRzdXJyb2dhdGUgPSA2Nyxcblx0XHRjb250YWluZXJzID0gNjgsXG5cdFx0cm9vdHMgPSA2OSxcblx0XHRjb250ZW50cyA9IDcwLFxuXHRcdGxlYXZlcyA9IDcxLFxuXHRcdGZyZXNoID0gNzIsXG5cdFx0bmFtZXMgPSA3M1xuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IHR5cGUgTm9kZU9wID1cblx0XHRCcmFuY2hPcCB8IFxuXHRcdExlYWZPcCB8XG5cdFx0UHJlZGljYXRlT3A7XG5cdFxuXHQvLyMgQWJzdHJhY3QgQ2xhc3Nlc1xuXHRcblx0LyoqICovXG5cdGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBOb2RlXG5cdHtcblx0XHRhYnN0cmFjdCByZWFkb25seSBbb3BdOiBOb2RlT3A7XG5cdFx0XG5cdFx0cmVhZG9ubHkgW2NvbnRhaW5lcl06IEJyYW5jaCB8IG51bGwgPSBudWxsO1xuXHRcdFxuXHRcdHNldENvbnRhaW5lcihjb250OiBCcmFuY2ggfMKgbnVsbClcblx0XHR7XG5cdFx0XHQvL0B0cy1pZ25vcmVcblx0XHRcdHRoaXNbY29udGFpbmVyXSA9IG51bGw7XG5cdFx0fVxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJyYW5jaCBleHRlbmRzIE5vZGVcblx0e1xuXHRcdC8qKiAqL1xuXHRcdGFkZENoaWxkKGNoaWxkOiBOb2RlLCBwb3NpdGlvbiA9IC0xKVxuXHRcdHtcblx0XHRcdGNoaWxkLnNldENvbnRhaW5lcih0aGlzKTtcblx0XHRcdFxuXHRcdFx0aWYgKHBvc2l0aW9uID09PSAtMSlcblx0XHRcdFx0cmV0dXJuIHZvaWQgdGhpcy5fY2hpbGRyZW4ucHVzaChjaGlsZCk7XG5cdFx0XHRcblx0XHRcdGNvbnN0IGF0ID0gdGhpcy5fY2hpbGRyZW4ubGVuZ3RoIC0gcG9zaXRpb24gKyAxO1xuXHRcdFx0dGhpcy5fY2hpbGRyZW4uc3BsaWNlKGF0LCAwLCBjaGlsZCk7XG5cdFx0XHRyZXR1cm4gY2hpbGQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlbW92ZUNoaWxkKGNoaWxkOiBOb2RlKTogTm9kZSB8IG51bGw7XG5cdFx0cmVtb3ZlQ2hpbGQoY2hpbGRJZHg6IG51bWJlcikgOiBOb2RlfCBudWxsO1xuXHRcdHJlbW92ZUNoaWxkKHBhcmFtOiBOb2RlIHwgbnVtYmVyKVxuXHRcdHtcblx0XHRcdGNvbnN0IGNoaWxkSWR4ID0gcGFyYW0gaW5zdGFuY2VvZiBOb2RlID9cblx0XHRcdFx0dGhpcy5fY2hpbGRyZW4uaW5kZXhPZihwYXJhbSkgOlxuXHRcdFx0XHRwYXJhbTtcblx0XHRcdFxuXHRcdFx0aWYgKGNoaWxkSWR4ID4gMClcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgcmVtb3ZlZCA9IHRoaXMuX2NoaWxkcmVuLnNwbGljZShjaGlsZElkeCwgMSlbMF07XG5cdFx0XHRcdHJlbW92ZWQuc2V0Q29udGFpbmVyKG51bGwpO1xuXHRcdFx0XHRyZXR1cm4gcmVtb3ZlZDtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBjaGlsZHJlbigpOiByZWFkb25seSAoQnJhbmNoIHwgTGVhZilbXVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLl9jaGlsZHJlbjtcblx0XHR9XG5cdFx0cHJpdmF0ZSByZWFkb25seSBfY2hpbGRyZW46IChCcmFuY2ggfCBMZWFmKVtdID0gW107XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgYWJzdHJhY3QgY2xhc3MgTGVhZiBleHRlbmRzIE5vZGUgeyB9XG5cdFxuXHQvLyMgQ29uY3JldGUgQ2xhc3Nlc1xuXHRcblx0LyoqICovXG5cdGV4cG9ydCBuYW1lc3BhY2UgQnJhbmNoZXNcblx0e1xuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBRdWVyeSBleHRlbmRzIEJyYW5jaFxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBCcmFuY2hPcC5xdWVyeTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIElzIGV4dGVuZHMgQnJhbmNoXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IEJyYW5jaE9wLmlzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgSGFzIGV4dGVuZHMgQnJhbmNoXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IEJyYW5jaE9wLmhhcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIE5vdCBleHRlbmRzIEJyYW5jaFxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBCcmFuY2hPcC5ub3Q7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBPciBleHRlbmRzIEJyYW5jaFxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBCcmFuY2hPcC5vcjtcblx0XHR9XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgbmFtZXNwYWNlIExlYXZlc1xuXHR7XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFByZWRpY2F0ZSBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdOiBQcmVkaWNhdGVPcDtcblx0XHRcdFxuXHRcdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRcdG9wdjogUHJlZGljYXRlT3AsXG5cdFx0XHRcdHJlYWRvbmx5IG9wZXJhbmQ6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4pXG5cdFx0XHR7XG5cdFx0XHRcdHN1cGVyKCk7XG5cdFx0XHRcdC8vQHRzLWlnbm9yZVxuXHRcdFx0XHR0aGlzW29wXSA9IG9wdjtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFNsaWNlIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0XHRyZWFkb25seSBzdGFydDogbnVtYmVyLCBcblx0XHRcdFx0cmVhZG9ubHkgZW5kPzogbnVtYmVyKVxuXHRcdFx0e1xuXHRcdFx0XHRzdXBlcigpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLnNsaWNlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgT2NjdXJlbmNlcyBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdFx0cmVhZG9ubHkgbWluOiBudW1iZXIsXG5cdFx0XHRcdHJlYWRvbmx5IG1heDogbnVtYmVyID0gbWluKVxuXHRcdFx0e1xuXHRcdFx0XHRzdXBlcigpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLm9jY3VyZW5jZXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBBbGlhc2VkIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AuYWxpYXNlZDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIExlYXZlcyBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLmxlYXZlcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIEZyZXNoIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AuZnJlc2g7XG5cdFx0fVxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBUZXJtaW5hbHMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC50ZXJtaW5hbHM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBTb3J0IGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdFxuXHRcdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRcdC4uLmNvbnRlbnRUeXBlczogT2JqZWN0W10pXG5cdFx0XHR7XG5cdFx0XHRcdHN1cGVyKCk7XG5cdFx0XHRcdHRoaXMuY29udGVudFR5cGVzID0gY29udGVudFR5cGVzO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZWFkb25seSBjb250ZW50VHlwZXM6IE9iamVjdFtdO1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5zb3J0O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgUmV2ZXJzZSBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLnJldmVyc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBTdXJyb2dhdGUgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5zdXJyb2dhdGU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBDb250YWluZXJzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AuY29udGFpbmVycztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFJvb3RzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3Aucm9vdHM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBDb250ZW50cyBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLmNvbnRlbnRzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgTmFtZXMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5uYW1lcztcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIEJhY2tlclxue1xuXHRleHBvcnQgdHlwZSBQcm90b3R5cGVKU09OID0gW251bWJlciwgbnVtYmVyLCAuLi5udW1iZXJbXVtdXTtcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBQcm90b3R5cGUgXG5cdHtcblx0XHQvKipcblx0XHQgKiBHZW5lcmF0ZSBhIFByb3RvdHlwZSBmcm9tIFRydXRoLlR5cGVcblx0XHQgKi9cblx0XHRzdGF0aWMgbmV3KGNvZGU6IENvZGUsIHR5cGU6IFRydXRoLlR5cGUpXG5cdFx0e1xuXHRcdFx0Y29uc3QgZmxhZ3MgPSBuZXcgQml0ZmllbGRzKCk7XG5cdFx0XHRcblx0XHRcdGZsYWdzLnNldCgwLCB0eXBlLmlzQW5vbnltb3VzKTtcblx0XHRcdGZsYWdzLnNldCgxLCB0eXBlLmlzRnJlc2gpO1xuXHRcdFx0ZmxhZ3Muc2V0KDIsIHR5cGUuaXNMaXN0KTtcblx0XHRcdGZsYWdzLnNldCgzLCB0eXBlLmlzTGlzdEludHJpbnNpYyk7XG5cdFx0XHRmbGFncy5zZXQoNCwgdHlwZS5pc0xpc3RFeHRyaW5zaWMpO1xuXHRcdFx0ZmxhZ3Muc2V0KDUsIHR5cGUuaXNQYXR0ZXJuKTtcblx0XHRcdGZsYWdzLnNldCg2LCB0eXBlLmlzVXJpKTtcblx0XHRcdGZsYWdzLnNldCg3LCB0eXBlLmlzU3BlY2lmaWVkKTtcblx0XHRcdFxuXHRcdFx0bGV0IHByb3RvID0gbmV3IFByb3RvdHlwZShcblx0XHRcdFx0Y29kZSwgXG5cdFx0XHRcdGZsYWdzLFxuXHRcdFx0XHRuZXcgVHlwZVNldCh0eXBlLmJhc2VzLm1hcChGdXR1cmVUeXBlLm5ldykpLFxuXHRcdFx0XHRuZXcgVHlwZVNldCh0eXBlLnBhdHRlcm5zLm1hcChGdXR1cmVUeXBlLm5ldykpLFxuXHRcdFx0XHRuZXcgVHlwZVNldCh0eXBlLnBhcmFsbGVscy5tYXAoRnV0dXJlVHlwZS5uZXcpKSxcblx0XHRcdFx0bmV3IFR5cGVTZXQodHlwZS5jb250ZW50c0ludHJpbnNpYy5tYXAoRnV0dXJlVHlwZS5uZXcpKVxuXHRcdFx0KTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgZXggPSBjb2RlLnByb3RvdHlwZXMuZmluZCh4ID0+IHguaGFzaCA9PT0gcHJvdG8uaGFzaCk7XG5cdFx0XHRcblx0XHRcdGlmIChleCkgXG5cdFx0XHRcdHByb3RvID0gZXg7XG5cdFx0XHRcdFxuXHRcdFx0cmV0dXJuIHByb3RvO1xuXHRcdH1cblx0XG5cdFx0LyoqXG5cdFx0ICogTG9hZCBQcm90b3R5cGUgZnJvbSBDb2RlSlNPTlxuXHRcdCAqL1xuXHRcdHN0YXRpYyBsb2FkKGNvZGU6IENvZGUsIHNlcmlhbGl6ZWQ6IFByb3RvdHlwZUpTT04pXG5cdFx0e1xuXHRcdFx0Y29uc3QgZGF0YSA9IFV0aWwuZGVjb2RlKHNlcmlhbGl6ZWQsIDUpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gbmV3IFByb3RvdHlwZShcblx0XHRcdFx0Y29kZSwgXG5cdFx0XHRcdG5ldyBCaXRmaWVsZHMoZGF0YVswXSksXG5cdFx0XHRcdFR5cGVTZXQuZnJvbUpTT04oZGF0YVsxXSksXG5cdFx0XHRcdFR5cGVTZXQuZnJvbUpTT04oZGF0YVsyXSksXG5cdFx0XHRcdFR5cGVTZXQuZnJvbUpTT04oZGF0YVszXSksXG5cdFx0XHRcdFR5cGVTZXQuZnJvbUpTT04oZGF0YVs0XSlcblx0XHRcdCk7XG5cdFx0fVxuXHRcdFxuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cHJpdmF0ZSBjb2RlOiBDb2RlLFxuXHRcdFx0cHVibGljIGZsYWdzOiBCaXRmaWVsZHMsXG5cdFx0XHRcblx0XHRcdHB1YmxpYyBiYXNlcyA9IG5ldyBUeXBlU2V0KCksXG5cdFx0XHRwdWJsaWMgcGF0dGVybnMgPSBuZXcgVHlwZVNldCgpLFxuXHRcdFx0cHVibGljIHBhcmFsbGVscyA9IG5ldyBUeXBlU2V0KCksXG5cdFx0XHRwdWJsaWMgY29udGVudHNJbnRyaW5zaWMgPSBuZXcgVHlwZVNldCgpKSB7fVxuXHRcdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IGlkKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5jb2RlLnByb3RvdHlwZXMuaW5kZXhPZih0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IGhhc2goKVxuXHRcdHtcblx0XHRcdHJldHVybiBVdGlsLmhhc2goSlNPTi5zdHJpbmdpZnkodGhpcykpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBUcmFuc2ZlciBvd25lcnNoaXAgb2YgdGhpcyBpbnN0YW5jZSB0byBhbm90aGVyIENvZGUgaW5zdGFuY2Vcblx0XHQgKi9cblx0XHR0cmFuc2Zlcihjb2RlOiBDb2RlKVxuXHRcdHtcblx0XHRcdHRoaXMuY29kZSA9IGNvZGU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHRvSlNPTigpXG5cdFx0e1x0XG5cdFx0XHRyZXR1cm4gVXRpbC5lbmNvZGUoW1xuXHRcdFx0XHR0aGlzLmZsYWdzLCB0aGlzLmJhc2VzLCB0aGlzLnBhdHRlcm5zLCB0aGlzLnBhcmFsbGVscywgdGhpcy5jb250ZW50c0ludHJpbnNpY1xuXHRcdFx0XSk7XG5cdFx0fVx0XHRcblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlci5UcnV0aFRhbGtcbntcblx0ZXhwb3J0IGNsYXNzIExpYnJhcnkgaW1wbGVtZW50cyBSZWZsZXguQ29yZS5JTGlicmFyeVxuXHR7XG5cdFx0LyoqICovXG5cdFx0aXNLbm93bkxlYWYobGVhZjogYW55KVxuXHRcdHtcblx0XHRcdHJldHVybiBsZWFmIGluc3RhbmNlb2YgTm9kZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aXNLbm93bkJyYW5jaChicmFuY2g6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRyZXR1cm4gYnJhbmNoIGluc3RhbmNlb2YgTm9kZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aXNCcmFuY2hEaXNwb3NlZChicmFuY2g6IFJlZmxleC5Db3JlLklCcmFuY2gpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGJyYW5jaCBpbnN0YW5jZW9mIEJyYW5jaCAmJiBicmFuY2hbY29udGFpbmVyXSAhPT0gbnVsbDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0U3RhdGljQnJhbmNoZXMoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGJyYW5jaGVzOiBhbnkgPSB7fTtcblx0XHRcdFxuXHRcdFx0T2JqZWN0LmVudHJpZXMoQnJhbmNoZXMpLmZvckVhY2goKFticmFuY2hOYW1lLCBicmFuY2hDdG9yXSkgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgbmFtZSA9IGJyYW5jaE5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0YnJhbmNoZXNbbmFtZV0gPSAoKSA9PiBuZXcgYnJhbmNoQ3RvcigpO1xuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBicmFuY2hlcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0U3RhdGljTm9uQnJhbmNoZXMoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGxlYXZlczogYW55ID0ge307XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKExlYXZlcykpXG5cdFx0XHRcdGxlYXZlc1trZXkudG9Mb3dlckNhc2UoKV0gPSAoYXJnMTogUHJlZGljYXRlT3AsIGFyZzI6IG51bWJlcikgPT4gbmV3IHZhbHVlKGFyZzEsIGFyZzIpO1xuXHRcdFx0XHRcblx0XHRcdGZvciAoY29uc3Qga2V5IGluIFByZWRpY2F0ZU9wKVxuXHRcdFx0XHRpZiAoaXNOYU4ocGFyc2VJbnQoa2V5KSkpXG5cdFx0XHRcdFx0bGVhdmVzW2tleV0gPSAodmFsdWU6IGFueSkgPT4gbmV3IExlYXZlcy5QcmVkaWNhdGUoKDxhbnk+UHJlZGljYXRlT3ApW2tleV0sIHZhbHVlKTtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gbGVhdmVzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXRDaGlsZHJlbih0YXJnZXQ6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGFyZ2V0LmNoaWxkcmVuO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRjcmVhdGVDb250YWluZXIoKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgQnJhbmNoZXMuUXVlcnkoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXR0YWNoQXRvbWljKFxuXHRcdFx0YXRvbWljOiBOb2RlLFxuXHRcdFx0b3duZXI6IEJyYW5jaCxcblx0XHRcdHJlZjogTm9kZSB8IFwicHJlcGVuZFwiIHwgXCJhcHBlbmRcIilcblx0XHR7XG5cdFx0XHRpZiAoIShhdG9taWMgaW5zdGFuY2VvZiBOb2RlKSlcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBwb3MgPVxuXHRcdFx0XHRyZWYgPT09IFwiYXBwZW5kXCIgPyAtMSA6XG5cdFx0XHRcdHJlZiA9PT0gXCJwcmVwZW5kXCIgPyAwIDpcblx0XHRcdFx0Ly8gUGxhY2VzIHRoZSBpdGVtIGF0IHRoZSBlbmQsIGluIHRoZSBjYXNlIHdoZW4gXG5cdFx0XHRcdC8vIHJlZiB3YXNuJ3QgZm91bmQgaW4gdGhlIG93bmVyLiApVGhpcyBzaG91bGRcblx0XHRcdFx0Ly8gbmV2ZXIgYWN0dWFsbHkgaGFwcGVuLilcblx0XHRcdFx0b3duZXIuY2hpbGRyZW4uaW5kZXhPZihyZWYpICsgMSB8fCAtMTtcblx0XHRcdFxuXHRcdFx0b3duZXIuYWRkQ2hpbGQoYXRvbWljLCBwb3MpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRkZXRhY2hBdG9taWMoYXRvbWljOiBOb2RlLCBvd25lcjogQnJhbmNoKVxuXHRcdHtcblx0XHRcdG93bmVyLnJlbW92ZUNoaWxkKGF0b21pYyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHN3YXBCcmFuY2hlcyhicmFuY2gxOiBCcmFuY2gsIGJyYW5jaDI6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRpZiAoYnJhbmNoMVtUcnV0aFRhbGsuY29udGFpbmVyXSA9PT0gbnVsbCB8fCBicmFuY2gyW1RydXRoVGFsay5jb250YWluZXJdID09PSBudWxsKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3Qgc3dhcCB0b3AtbGV2ZWwgYnJhbmNoZXMuXCIpO1xuXHRcdFx0XG5cdFx0XHRpZiAoYnJhbmNoMVtUcnV0aFRhbGsuY29udGFpbmVyXSAhPT0gYnJhbmNoMltUcnV0aFRhbGsuY29udGFpbmVyXSlcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgc3dhcCBicmFuY2hlcyBmcm9tIHRoZSBzYW1lIGNvbnRhaW5lci5cIik7XG5cdFx0XHRcblx0XHRcdGNvbnN0IGNvbnRhaW5lciA9IGJyYW5jaDFbVHJ1dGhUYWxrLmNvbnRhaW5lcl0hO1xuXHRcdFx0Y29uc3QgaWR4MSA9IGNvbnRhaW5lci5jaGlsZHJlbi5pbmRleE9mKGJyYW5jaDEpO1xuXHRcdFx0Y29uc3QgaWR4MiA9IGNvbnRhaW5lci5jaGlsZHJlbi5pbmRleE9mKGJyYW5jaDIpO1xuXHRcdFx0Y29uc3QgaWR4TWF4ID0gTWF0aC5tYXgoaWR4MSwgaWR4Mik7XG5cdFx0XHRjb25zdCBpZHhNaW4gPSBNYXRoLm1pbihpZHgxLCBpZHgyKTtcblx0XHRcdGNvbnN0IHJlbW92ZWRNYXggPSBjb250YWluZXIucmVtb3ZlQ2hpbGQoaWR4TWF4KTtcblx0XHRcdGNvbnN0IHJlbW92ZWRNaW4gPSBjb250YWluZXIucmVtb3ZlQ2hpbGQoaWR4TWluKTtcblx0XHRcdFxuXHRcdFx0aWYgKCFyZW1vdmVkTWF4IHx8ICFyZW1vdmVkTWluKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnRlcm5hbCBFcnJvci5cIik7XG5cdFx0XHRcblx0XHRcdGNvbnRhaW5lci5hZGRDaGlsZChyZW1vdmVkTWF4LCBpZHhNaW4pO1xuXHRcdFx0Y29udGFpbmVyLmFkZENoaWxkKHJlbW92ZWRNaW4sIGlkeE1heCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlcGxhY2VCcmFuY2goYnJhbmNoMTogQnJhbmNoLCBicmFuY2gyOiBCcmFuY2gpXG5cdFx0e1xuXHRcdFx0aWYgKGJyYW5jaDFbVHJ1dGhUYWxrLmNvbnRhaW5lcl0gPT09IG51bGwpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZXBsYWNlIHRvcC1sZXZlbCBicmFuY2hlcy5cIik7XG5cdFx0XHRcblx0XHRcdGNvbnN0IGNvbnRhaW5lciA9IGJyYW5jaDFbVHJ1dGhUYWxrLmNvbnRhaW5lcl0hO1xuXHRcdFx0Y29uc3QgaWR4ID0gY29udGFpbmVyLmNoaWxkcmVuLmluZGV4T2YoYnJhbmNoMSk7XG5cdFx0XHRjb250YWluZXIucmVtb3ZlQ2hpbGQoaWR4KTtcblx0XHRcdGNvbnRhaW5lci5hZGRDaGlsZChicmFuY2gyLCBpZHgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhdHRhY2hBdHRyaWJ1dGUoYnJhbmNoOiBCcmFuY2gsIGtleTogc3RyaW5nLCB2YWx1ZTogYW55KVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBzdXBwb3J0ZWQuXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRkZXRhY2hBdHRyaWJ1dGUoYnJhbmNoOiBCcmFuY2gsIGtleTogc3RyaW5nKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBzdXBwb3J0ZWQuXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhdHRhY2hSZWN1cnJlbnQoXG5cdFx0XHRraW5kOiBSZWZsZXguQ29yZS5SZWN1cnJlbnRLaW5kLFxuXHRcdFx0dGFyZ2V0OiBSZWZsZXguQ29yZS5JQnJhbmNoLFxuXHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdGNhbGxiYWNrOiBSZWZsZXguQ29yZS5SZWN1cnJlbnRDYWxsYmFjayxcblx0XHRcdHJlc3Q6IGFueVtdKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBzdXBwb3J0ZWQuXCIpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRkZXRhY2hSZWN1cnJlbnQoXG5cdFx0XHR0YXJnZXQ6IFJlZmxleC5Db3JlLklCcmFuY2gsXG5cdFx0XHRzZWxlY3RvcjogYW55LFxuXHRcdFx0Y2FsbGJhY2s6IFJlZmxleC5Db3JlLlJlY3VycmVudENhbGxiYWNrKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBzdXBwb3J0ZWQuXCIpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufVxuXG4vKipcbiAqIEdsb2JhbCBsaWJyYXJ5IG9iamVjdC5cbiAqL1xuXHQvL0B0cy1pZ25vcmVcbmNvbnN0IHR0ID0gUmVmbGV4LkNvcmUuY3JlYXRlQ29udGFpbmVyTmFtZXNwYWNlPEJhY2tlci5UcnV0aFRhbGsuTmFtZXNwYWNlLCBCYWNrZXIuVHJ1dGhUYWxrLkxpYnJhcnk+KFxuXHRuZXcgQmFja2VyLlRydXRoVGFsay5MaWJyYXJ5KCksXG5cdHRydWUpO1xuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk5vZGVzLnRzXCIvPlxuXG5uYW1lc3BhY2UgQmFja2VyXG57XG5cdGV4cG9ydCBjb25zdCB0eXBlT2YgPSBTeW1ib2woXCJ0eXBlT2ZcIik7XG5cdGV4cG9ydCBjb25zdCB2YWx1ZSA9IFN5bWJvbChcInZhbHVlXCIpO1xuXHRleHBvcnQgY29uc3QgbmFtZSA9IFN5bWJvbChcIm5hbWVcIik7XG5cdGV4cG9ydCBjb25zdCB2YWx1ZXMgPSBTeW1ib2woXCJ2YWx1ZXNcIik7XG5cdGV4cG9ydCBjb25zdCBwYXJlbnQgPSBTeW1ib2woXCJwYXJlbnRcIik7XG5cdFxuXHRjbGFzcyBCYXNlIGV4dGVuZHMgVHJ1dGhUYWxrLkxlYXZlcy5TdXJyb2dhdGVcblx0e1xuXHRcdFtwYXJlbnRdOiBTdHJ1Y3QgfMKgbnVsbDtcblx0XHRcblx0XHRjb25zdHJ1Y3RvcihwYXJlbnRWYWx1ZTogU3RydWN0IHwgU3Vycm9nYXRlIHwgbnVsbClcblx0XHR7XG5cdFx0XHRzdXBlcigpO1xuXHRcdFx0dGhpc1twYXJlbnRdID0gcGFyZW50VmFsdWU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENsaW1iIHRvIHJvb3Qgb2YgdGhpcyBTdHJ1Y3Rcblx0XHQgKi9cblx0XHRnZXQgcm9vdCgpOiBCYXNlIHzCoG51bGxcblx0XHR7XG5cdFx0XHRsZXQgcm9vdDogQmFzZSB8wqBudWxsID0gdGhpcztcblx0XHRcdFxuXHRcdFx0d2hpbGUgKHJvb3QgJiYgcm9vdFtwYXJlbnRdKSBcblx0XHRcdFx0cm9vdCA9IHJvb3RbcGFyZW50XTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHJvb3Q7XG5cdFx0fVxuXHR9XG5cdFxuXHRleHBvcnQgY2xhc3MgTmFtZSBleHRlbmRzIEJhc2Vcblx0e1xuXHRcdGNvbnN0cnVjdG9yKHB1YmxpYyBuYW1lOiBzdHJpbmcsIGNvbnRhaW5lcjogU3RydWN0IHzCoG51bGwpXG5cdFx0e1xuXHRcdFx0c3VwZXIoY29udGFpbmVyKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IFt2YWx1ZV0oKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLm5hbWU7XG5cdFx0fVxuXHR9XG5cdFxuXHRleHBvcnQgY2xhc3MgU3RydWN0IGV4dGVuZHMgQmFzZVxuXHR7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogR2VuZXJhdGUgYSBTdHJ1Y3QvU3Vycm9nYXRlIGZyb20gQmFja2VyLlR5cGVcblx0XHQgKi9cblx0XHRzdGF0aWMgbmV3KHR5cGU6IFR5cGUsIHBhcmVudFZhbHVlOiBTdHJ1Y3QgfMKgU3Vycm9nYXRlIHwgbnVsbClcblx0XHR7XG5cdFx0XHRjb25zdCBjb25zdHIgPSBwYXJlbnRWYWx1ZSA/IFxuXHRcdFx0XHRwYXJlbnRWYWx1ZSBpbnN0YW5jZW9mIFN1cnJvZ2F0ZSA/XG5cdFx0XHRcdFN1cnJvZ2F0ZSA6IFN0cnVjdCA6IFN0cnVjdDtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gbmV3IGNvbnN0cih0eXBlLCBwYXJlbnRWYWx1ZSk7XG5cdFx0fVxuXHRcdFxuXHRcdHJlYWRvbmx5IFt0eXBlT2ZdOiBUeXBlO1xuXHRcdHJlYWRvbmx5IFtuYW1lXTogTmFtZTtcblx0XHRyZWFkb25seSBbcGFyZW50XTogU3RydWN0IHwgbnVsbDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgW3ZhbHVlc10oKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzW3R5cGVPZl0udmFsdWVzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgW3ZhbHVlXSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXNbdHlwZU9mXS52YWx1ZTtcblx0XHR9XG5cdFx0XG5cdFx0Y29uc3RydWN0b3IodHlwZTogVHlwZSwgcGFyZW50VmFsdWU6IFN0cnVjdCB8IG51bGwpXG5cdFx0e1xuXHRcdFx0c3VwZXIocGFyZW50VmFsdWUpO1xuXHRcdFx0dGhpc1t0eXBlT2ZdID0gdHlwZTtcblx0XHRcdHRoaXNbcGFyZW50XSA9IHBhcmVudFZhbHVlO1xuXHRcdFx0dGhpc1tuYW1lXSA9IG5ldyBOYW1lKHR5cGUubmFtZSwgdGhpcyk7XG5cdFx0XHRcblx0XHRcdFV0aWwuc2hhZG93cyh0aGlzLCBmYWxzZSwgdHlwZU9mLCB2YWx1ZXMsIFRydXRoVGFsay5vcCwgcGFyZW50LCBUcnV0aFRhbGsuY29udGFpbmVyKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiB0eXBlLmNvbnRlbnRzKVxuXHRcdFx0XHQoPGFueT50aGlzKVtjaGlsZC5uYW1lLnJlcGxhY2UoL1teXFxkXFx3XS9nbSwgKCkgPT4gXCJfXCIpXSA9IFN0cnVjdC5uZXcoY2hpbGQsIHRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBUeXBlc2NyaXB0IHR5cGUgYWRqdXN0bWVudCBcblx0XHQgKi9cblx0XHRnZXQgcHJveHkoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzIGFzIHVua25vd24gYXMgU3RydWN0ICYgUmVjb3JkPHN0cmluZywgU3RydWN0Pjtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IGNvbnRlbnRzKCk6IFN0cnVjdFtdXG5cdFx0e1xuXHRcdFx0cmV0dXJuIE9iamVjdC52YWx1ZXModGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGluc3RhbmNlb2YoYmFzZTogYW55KVxuXHRcdHtcblx0XHRcdHJldHVybsKgdGhpc1t0eXBlT2ZdLmlzKGJhc2UpOyBcblx0XHR9O1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGlzKGJhc2U6IFR5cGUgfCBTdHJ1Y3QpXG5cdFx0e1xuXHRcdFx0YmFzZSA9IGJhc2UgaW5zdGFuY2VvZiBUeXBlID8gYmFzZSA6IGJhc2VbdHlwZU9mXTtcblx0XHRcdHJldHVybiB0aGlzW3R5cGVPZl0uaXMoYmFzZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdFtTeW1ib2wuaGFzSW5zdGFuY2VdKHZhbHVlOiBhbnkpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuaW5zdGFuY2VvZih2YWx1ZSk7XG5cdFx0fVxuXHRcdFxuXHRcdHRvSlNPTigpeyByZXR1cm4gdGhpc1t2YWx1ZXNdOyB9XG5cdFx0dmFsdWVPZigpIHsgcmV0dXJuIHRoaXNbdmFsdWVzXTsgfVxuXHRcdHRvU3RyaW5nKCkgXG5cdFx0e1xuXHRcdFx0Y29uc3QgdmFsID0gdGhpc1t2YWx1ZXNdO1xuXHRcdFx0aWYgKHZhbCA9PT0gbnVsbClcblx0XHRcdFx0cmV0dXJuIHZhbDtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIFN0cmluZyh2YWwpO1xuXHRcdH1cblx0XHRbU3ltYm9sLnRvUHJpbWl0aXZlXSgpIHsgcmV0dXJuIHRoaXNbdmFsdWVzXTsgfVxuXHRcdGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpIHsgcmV0dXJuIFwiU3RydWN0XCI7IH1cblx0fVxuXHRcblx0ZXhwb3J0IGNsYXNzIFN1cnJvZ2F0ZTxUID0gc3RyaW5nPiBleHRlbmRzIFN0cnVjdFxuXHR7XG5cdFx0cmVhZG9ubHkgW25hbWVdOiBOYW1lO1xuXHRcdHJlYWRvbmx5IFtwYXJlbnRdOiBTdXJyb2dhdGUgfCBudWxsO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBjb250ZW50cygpOiBTdXJyb2dhdGVbXVxuXHRcdHtcblx0XHRcdHJldHVybiBPYmplY3QudmFsdWVzKHRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRpbnN0YW5jZW9mKGJhc2U6IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpc1t2YWx1ZV0gaW5zdGFuY2VvZiBiYXNlIHx8wqB0aGlzW3R5cGVPZl0uaXMoYmFzZSk7IFxuXHRcdH07XG5cdFx0XG5cdFx0LyoqIFxuXHRcdCAqIEdldCBuZXN0ZWQgcHJvcGVydHkgd2l0aCBtYXRjaGluZyBTdHJ1Y3Rcblx0XHQqL1xuXHRcdGdldCh0eXBlOiBTdHJ1Y3QpOiBTdXJyb2dhdGUgfMKgbnVsbFxuXHRcdHtcdFx0XG5cdFx0XHRjb25zdCByZWN1cnNpdmUgPSAob2JqOiBTdXJyb2dhdGUpOiBTdXJyb2dhdGUgfCBudWxsID0+IFxuXHRcdFx0e1xuXHRcdFx0XHRpZiAob2JqW3R5cGVPZl0ucGFyYWxsZWxSb290cy5zb21lKHggPT4geCA9PT0gdHlwZVt0eXBlT2ZdKSlcblx0XHRcdFx0XHRyZXR1cm4gb2JqO1xuXHRcdFx0XHRcblx0XHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiBvYmouY29udGVudHMpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCByZXMgPSByZWN1cnNpdmUoY2hpbGQpO1x0XG5cdFx0XHRcdFx0aWYgKHJlcylcblx0XHRcdFx0XHRcdHJldHVybiByZXM7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHJlY3Vyc2l2ZSg8YW55PnRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHR0b0pTT04oKTogYW55IFxuXHRcdHsgXG5cdFx0XHRjb25zdCB2YWwgPSB0aGlzW3ZhbHVlXTtcblx0XHRcdGNvbnN0IHByaW1pdGl2ZSA9IHZhbCA/IHRoaXNbdHlwZU9mXS52YWx1ZXMudG9TdHJpbmcoKSA6IHVuZGVmaW5lZDtcblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMuY29udGVudHMubGVuZ3RoID09PSAwKVxuXHRcdFx0XHRyZXR1cm4gcHJpbWl0aXZlO1xuXHRcblx0XHRcdGNvbnN0IE9iajogUmVjb3JkPHN0cmluZywgU3Vycm9nYXRlIHwgVD4gJiB7ICQ6IGFueSB9ID0gPGFueT5PYmplY3QuYXNzaWduKHt9LCB0aGlzKTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gT2JqOyBcblx0XHR9XG5cdFx0XG5cdFx0dG9TdHJpbmcoaW5kZW50ID0gMClcblx0XHR7XG5cdFx0XHRsZXQgYmFzZSA9IHRoaXNbdHlwZU9mXS5uYW1lO1xuXHRcdFx0Y29uc3QgcHJpbWl0aXZlID0gdGhpc1t2YWx1ZV0gPyB0aGlzW3R5cGVPZl0udmFsdWVzLnRvU3RyaW5nKCkgOiB1bmRlZmluZWQ7XG5cdFx0XHRcblx0XHRcdGlmIChwcmltaXRpdmUpIFxuXHRcdFx0XHRiYXNlICs9IGA6ICR7cHJpbWl0aXZlfWA7XG5cdFx0XHRcdFxuXHRcdFx0aWYgKHRoaXMuY29udGVudHMubGVuZ3RoID4gMClcblx0XHRcdFx0YmFzZSArPSB0aGlzLmNvbnRlbnRzLm1hcCh4ID0+IFwiXFxuXCIgKyB4LnRvU3RyaW5nKGluZGVudCArIDEpKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIFwiXFx0XCIucmVwZWF0KGluZGVudCkgKyBiYXNlO1xuXHRcdH1cblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlclxue1xuXHRleHBvcnQgdHlwZSBWYWx1ZUpTT04gPSBbbnVtYmVyLCBudW1iZXIsIHN0cmluZ107XG5cdGV4cG9ydCB0eXBlIERhdGFKU09OID0gW251bWJlcltdLCBzdHJpbmcsIC4uLlZhbHVlSlNPTltdW11dO1xuXHRleHBvcnQgdHlwZSBUeXBlSlNPTiA9IFtudW1iZXIsIG51bWJlciB8IG51bGwsIHN0cmluZywgVmFsdWVKU09OW11dO1xuXHRcblx0ZXhwb3J0IGNsYXNzIFZhbHVlXG5cdHtcblx0XHRzdGF0aWMgbG9hZChkYXRhOiBWYWx1ZUpTT04pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBWYWx1ZShGdXR1cmVUeXBlLm5ldyhkYXRhWzBdKSwgISFkYXRhWzFdLCBkYXRhWzJdKTtcblx0XHR9XG5cdFx0XG5cdFx0cHVibGljIHZhbHVlOiBhbnk7XG5cdFx0XG5cdFx0Y29uc3RydWN0b3IocHVibGljIGJhc2U6IEZ1dHVyZVR5cGUgfCBudWxsLCBwdWJsaWMgYWxpYXNlZDogYm9vbGVhbiwgdmFsdWU6IHN0cmluZykgXG5cdFx0e1xuXHRcdFx0dGhpcy52YWx1ZSA9IHZhbHVlO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgcHJpbWl0aXZlKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy52YWx1ZSB8fCB0aGlzLmJhc2VOYW1lO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgYmFzZU5hbWUoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmJhc2UgPyB0aGlzLmJhc2UudHlwZSA/IHRoaXMuYmFzZS50eXBlLm5hbWUgOiBcIlwiIDogXCJcIjtcdFxuXHRcdH1cblx0XHRcblx0XHR0b0pTT04oKVxuXHRcdHtcblx0XHRcdHJldHVybiBbdGhpcy5iYXNlICYmIHRoaXMuYmFzZS5pZCwgdGhpcy5hbGlhc2VkID8gMSA6IDAsIHRoaXMudmFsdWVdOyAgXG5cdFx0fVxuXHRcdFxuXHRcdHRvU3RyaW5nKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcmltaXRpdmU7XG5cdFx0fVxuXHR9XG5cdFxuXHRleHBvcnQgY2xhc3MgVmFsdWVTdG9yZVxuXHR7XHRcblx0XHRzdGF0aWMgbG9hZCguLi5kYXRhOiBWYWx1ZUpTT05bXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFZhbHVlU3RvcmUoLi4uZGF0YS5tYXAoeCA9PiBWYWx1ZS5sb2FkKHgpKSk7XG5cdFx0fVxuXHRcdFxuXHRcdHB1YmxpYyB2YWx1ZVN0b3JlOiBWYWx1ZVtdO1xuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKC4uLnZhbHVlczogVmFsdWVbXSlcblx0XHR7XG5cdFx0XHR0aGlzLnZhbHVlU3RvcmUgPSB2YWx1ZXMubWFwKHggPT4gXG5cdFx0XHR7XG5cdFx0XHRcdGlmICh4LmFsaWFzZWQpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0cnkgXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0eC52YWx1ZSA9IEpTT04ucGFyc2UoeC52YWx1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNhdGNoIChleClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAoL15cXGQrJC8udGVzdCh4LnZhbHVlKSlcblx0XHRcdFx0XHRcdFx0eC52YWx1ZSA9IEJpZ0ludCh4LnZhbHVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHg7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IHZhbHVlcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudmFsdWVTdG9yZS5maWx0ZXIoeCA9PiAheC5hbGlhc2VkKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGFsaWFzZXMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnZhbHVlU3RvcmUuZmlsdGVyKHggPT4geC5hbGlhc2VkKTtcblx0XHR9XG5cdFx0XG5cdFx0Y29uY2F0KHN0b3JlOiBWYWx1ZVN0b3JlKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgVmFsdWVTdG9yZSguLi50aGlzLnZhbHVlU3RvcmUuY29uY2F0KHN0b3JlLnZhbHVlU3RvcmUpKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGFsaWFzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5hbGlhc2VzWzBdO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgdmFsdWUoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnZhbHVlc1swXTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IHByaW1pdGl2ZSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuYWxpYXMgPyB0aGlzLmFsaWFzLnZhbHVlIDogdGhpcy52YWx1ZS50b1N0cmluZygpO1xuXHRcdH1cblx0XHRcblx0XHR0b0pTT04oKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnZhbHVlU3RvcmU7XG5cdFx0fVxuXHRcblx0XHR0b1N0cmluZygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuYWxpYXMgPyB0aGlzLmFsaWFzLnRvU3RyaW5nKCkgKyAodGhpcy52YWx1ZSA/IFwiW1wiICsgdGhpcy52YWx1ZS50b1N0cmluZygpICsgXCJdXCIgOiBcIlwiKSA6IHRoaXMudmFsdWUudG9TdHJpbmcoKTtcblx0XHR9XG5cdFx0XG5cdH1cblx0XG5cdGV4cG9ydCBjbGFzcyBUeXBlIFxuXHR7XG5cdFx0LyoqXG5cdFx0ICogTG9hZCBhIEJhY2tlci5UeXBlIGZyb20gQ29kZUpTT05cblx0XHQgKi9cblx0XHRzdGF0aWMgbG9hZChjb2RlOiBDb2RlLCBkYXRhOiBUeXBlSlNPTilcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFR5cGUoXG5cdFx0XHRcdGNvZGUsIFxuXHRcdFx0XHRkYXRhWzJdLFxuXHRcdFx0XHRjb2RlLnByb3RvdHlwZXNbZGF0YVswXV0sXG5cdFx0XHRcdGRhdGFbMV0gPyBGdXR1cmVUeXBlLm5ldyhkYXRhWzFdKSA6IG51bGwsXG5cdFx0XHRcdFZhbHVlU3RvcmUubG9hZCguLi5kYXRhWzNdKVxuXHRcdFx0KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogR2VuZXJhdGUgYSBCYWNrZXIuVHlwZSBmcm9tIFRydXRoLlR5cGVcblx0XHQgKi9cblx0XHRzdGF0aWMgbmV3KGNvZGU6IENvZGUsIHR5cGU6IFRydXRoLlR5cGUpXG5cdFx0e1x0XG5cdFx0XHRjb25zdCBuYW1lID0gdHlwZS5pc1BhdHRlcm4gPyB0eXBlLm5hbWUuc3Vic3RyKDkpIDogdHlwZS5uYW1lO1xuXHRcdFx0Y29uc3QgaW5zdGFuY2UgPSBuZXcgVHlwZShcblx0XHRcdFx0Y29kZSwgXG5cdFx0XHRcdG5hbWUsIFxuXHRcdFx0XHRQcm90b3R5cGUubmV3KGNvZGUsIHR5cGUpLFxuXHRcdFx0XHR0eXBlLmNvbnRhaW5lciA/IEZ1dHVyZVR5cGUubmV3KHR5cGUuY29udGFpbmVyKSA6IG51bGwsXG5cdFx0XHRcdG5ldyBWYWx1ZVN0b3JlKC4uLnR5cGUudmFsdWVzXG5cdFx0XHRcdFx0LmZpbHRlcih4ID0+IG5hbWUgIT09IHgudmFsdWUpXG5cdFx0XHRcdFx0Lm1hcCh4ID0+IG5ldyBWYWx1ZSh4LmJhc2UgPyBGdXR1cmVUeXBlLm5ldyh4LmJhc2UpIDogbnVsbCwgeC5hbGlhc2VkLCB4LnZhbHVlKSkpXG5cdFx0XHQpO1xuXHRcdFx0XG5cdFx0XHRGdXR1cmVUeXBlLlR5cGVNYXAuc2V0KHR5cGUsIGluc3RhbmNlKTtcblx0XHRcdHJldHVybiBpbnN0YW5jZTtcblx0XHR9XG5cdFx0XG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRwcml2YXRlIGNvZGU6IENvZGUsXG5cdFx0XHRwdWJsaWMgbmFtZTogc3RyaW5nLFxuXHRcdFx0cHVibGljIHByb3RvdHlwZTogUHJvdG90eXBlLFxuXHRcdFx0cHJpdmF0ZSBfY29udGFpbmVyOiBGdXR1cmVUeXBlIHwgbnVsbCA9IG51bGwsXG5cdFx0XHRwdWJsaWMgdmFsdWVzOiBWYWx1ZVN0b3JlKSBcblx0XHR7IH1cblx0XHRcdFxuXHRcdGdldCBjb250YWluZXIoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLl9jb250YWluZXIgJiYgdGhpcy5fY29udGFpbmVyLnR5cGU7XG5cdFx0fVxuXHRcdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIHRoZSBhcnJheSBvZiB0eXBlcyB0aGF0IGFyZSBjb250YWluZWQgZGlyZWN0bHkgYnkgdGhpc1xuXHRcdCAqIG9uZS4gSW4gdGhlIGNhc2Ugd2hlbiB0aGlzIHR5cGUgaXMgYSBsaXN0IHR5cGUsIHRoaXMgYXJyYXkgZG9lc1xuXHRcdCAqIG5vdCBpbmNsdWRlIHRoZSBsaXN0J3MgaW50cmluc2ljIHR5cGVzLlxuXHRcdCAqL1xuXHRcdGdldCBjb250ZW50cygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuY29kZS50eXBlcy5maWx0ZXIoeCA9PiB4LmNvbnRhaW5lciA9PT0gdGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEBpbnRlcmFsXG5cdFx0ICovXG5cdFx0Z2V0IHBhcmFsbGVsQ29udGVudHMoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHR5cGVzOiBUeXBlW10gPSBbXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCB7IHR5cGU6IHBhcmFsbGVsVHlwZSB9IG9mIHRoaXMuaXRlcmF0ZSh0ID0+IHQucGFyYWxsZWxzLCB0cnVlKSlcblx0XHRcdFx0Zm9yIChjb25zdCB7IHR5cGU6IGJhc2VUeXBlIH0gb2YgcGFyYWxsZWxUeXBlLml0ZXJhdGUodCA9PiB0LmJhc2VzLCB0cnVlKSlcblx0XHRcdFx0XHRmb3IoY29uc3QgY29udGVudCBvZiBiYXNlVHlwZS5jb250ZW50cylcblx0XHRcdFx0XHRpZiAoIXR5cGVzLnNvbWUoeCA9PiB4Lm5hbWUgPT09IGNvbnRlbnQubmFtZSkpXG5cdFx0XHRcdFx0XHR0eXBlcy5wdXNoKGNvbnRlbnQpO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gdHlwZXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyBhIHJlZmVyZW5jZSB0byB0aGUgdHlwZSwgYXMgaXQncyBkZWZpbmVkIGluIGl0J3Ncblx0XHQgKiBuZXh0IG1vc3QgYXBwbGljYWJsZSB0eXBlLlxuXHRcdCAqL1xuXHRcdGdldCBwYXJhbGxlbHMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5wYXJhbGxlbHMuc25hcHNob3QoKVxuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgdGhlIGFycmF5IG9mIHR5cGVzIGZyb20gd2hpY2ggdGhpcyB0eXBlIGV4dGVuZHMuXG5cdFx0ICogSWYgdGhpcyBUeXBlIGV4dGVuZHMgZnJvbSBhIHBhdHRlcm4sIGl0IGlzIGluY2x1ZGVkIGluIHRoaXNcblx0XHQgKiBhcnJheS5cblx0XHQgKi9cblx0XHRnZXQgYmFzZXMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5iYXNlcy5zbmFwc2hvdCgpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHBhdHRlcm5zIHRoYXQgcmVzb2x2ZSB0byB0aGlzIHR5cGUuXG5cdFx0ICovXG5cdFx0Z2V0IHBhdHRlcm5zKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUucGF0dGVybnMuc25hcHNob3QoKTtcdFxuXHRcdH1cblx0XHRcblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHRoYXQgc2hhcmUgdGhlIHNhbWUgY29udGFpbmluZ1xuXHRcdCAqIHR5cGUgYXMgdGhpcyBvbmUuXG5cdFx0ICovXG5cdFx0Z2V0IGFkamFjZW50cygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuY29kZS50eXBlcy5maWx0ZXIoeCA9PiB4LmNvbnRhaW5lciAhPT0gdGhpcy5jb250YWluZXIgJiYgeCAhPT0gdGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdldHMgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdHlwZXMgdGhhdCBkZXJpdmUgZnJvbSB0aGUgXG5cdFx0ICogdGhpcyBUeXBlIGluc3RhbmNlLlxuXHRcdCAqIFxuXHRcdCAqIFRoZSB0eXBlcyB0aGF0IGRlcml2ZSBmcm9tIHRoaXMgb25lIGFzIGEgcmVzdWx0IG9mIHRoZSB1c2Ugb2Zcblx0XHQgKiBhbiBhbGlhcyBhcmUgZXhjbHVkZWQgZnJvbSB0aGlzIGFycmF5LlxuXHRcdCAqL1xuXHRcdGdldCBkZXJpdmF0aW9ucygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuY29kZS50eXBlcy5maWx0ZXIoeCA9PiB4LmJhc2VzLmluY2x1ZGVzKHRoaXMpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIGEgcmVmZXJlbmNlIHRvIHRoZSBwYXJhbGxlbCByb290cyBvZiB0aGlzIHR5cGUuXG5cdFx0ICogVGhlIHBhcmFsbGVsIHJvb3RzIGFyZSB0aGUgZW5kcG9pbnRzIGZvdW5kIHdoZW5cblx0XHQgKiB0cmF2ZXJzaW5nIHVwd2FyZCB0aHJvdWdoIHRoZSBwYXJhbGxlbCBncmFwaC5cblx0XHQgKi9cblx0XHRnZXQgcGFyYWxsZWxSb290cygpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgcm9vdHM6IFR5cGVbXSA9IFtdO1xuXHRcdFx0Zm9yIChjb25zdCB7IHR5cGUgfSBvZiB0aGlzLml0ZXJhdGUodCA9PiB0LnBhcmFsbGVscykpXG5cdFx0XHRcdGlmICh0eXBlICE9PSB0aGlzICYmIHR5cGUucGFyYWxsZWxzLmxlbmd0aCA9PT0gMClcblx0XHRcdFx0XHRyb290cy5wdXNoKHR5cGUpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gcm9vdHM7XG5cdFx0fVxuXHRcdFxuXHRcdGdldCB2YWx1ZSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudmFsdWVzLnByaW1pdGl2ZTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGlkKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5jb2RlLnR5cGVzLmluZGV4T2YodGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdGdldCBpc0Fub255bW91cygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmZsYWdzLmdldCgwKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGlzRnJlc2goKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5mbGFncy5nZXQoMSk7XG5cdFx0fVxuXHRcdFxuXHRcdGdldCBpc0xpc3QoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5mbGFncy5nZXQoMik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyB3aGV0aGVyIHRoaXMgdHlwZSByZXByZXNlbnRzIHRoZSBpbnRyaW5zaWNcblx0XHQgKiBzaWRlIG9mIGEgbGlzdC5cblx0XHQgKi9cblx0XHRnZXQgaXNMaXN0SW50cmluc2ljKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDMpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgd2hldGhlciB0aGlzIHR5cGUgcmVwcmVzZW50cyB0aGUgZXh0cmluc2ljXG5cdFx0ICogc2lkZSBvZiBhIGxpc3QuXG5cdFx0ICovXG5cdFx0Z2V0IGlzTGlzdEV4dHJpbnNpYygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmZsYWdzLmdldCg0KTtcblx0XHR9XG5cdFx0XG5cdFx0XG5cdFx0Z2V0IGlzUGF0dGVybigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmZsYWdzLmdldCg1KTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGlzVXJpKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDYpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgYSB2YWx1ZSB0aGF0IGluZGljYXRlcyBpZiB0aGlzIFR5cGUgd2FzIGRpcmVjdGx5IHNwZWNpZmllZFxuXHRcdCAqIGluIHRoZSBkb2N1bWVudCwgb3IgaWYgaXQncyBleGlzdGVuY2Ugd2FzIGluZmVycmVkLlxuXHRcdCAqL1xuXHRcdGdldCBpc1NwZWNpZmllZCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmZsYWdzLmdldCg3KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IGlzT3ZlcnJpZGUoKSB7IHJldHVybiB0aGlzLnBhcmFsbGVscy5sZW5ndGggPiAwOyB9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IGlzSW50cm9kdWN0aW9uKCkgeyByZXR1cm4gdGhpcy5wYXJhbGxlbHMubGVuZ3RoID09PSAwOyB9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogR2V0cyBhIGJvb2xlYW4gdmFsdWUgdGhhdCBpbmRpY2F0ZXMgd2hldGhlciB0aGlzIFR5cGVcblx0XHQgKiBpbnN0YW5jZSB3YXMgY3JlYXRlZCBmcm9tIGEgcHJldmlvdXMgZWRpdCBmcmFtZSwgYW5kXG5cdFx0ICogc2hvdWxkIG5vIGxvbmdlciBiZSB1c2VkLlxuXHRcdCAqL1xuXHRcdGdldCBpc0RpcnR5KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFBlcmZvcm1zIGFuIGFyYml0cmFyeSByZWN1cnNpdmUsIGJyZWFkdGgtZmlyc3QgdHJhdmVyc2FsXG5cdFx0ICogdGhhdCBiZWdpbnMgYXQgdGhpcyBUeXBlIGluc3RhbmNlLiBFbnN1cmVzIHRoYXQgbm8gdHlwZXNcblx0XHQgKiB0eXBlcyBhcmUgeWllbGRlZCBtdWx0aXBsZSB0aW1lcy5cblx0XHQgKiBcblx0XHQgKiBAcGFyYW0gbmV4dEZuIEEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgdHlwZSwgb3IgYW5cblx0XHQgKiBpdGVyYWJsZSBvZiB0eXBlcyB0aGF0IGFyZSB0byBiZSB2aXNpdGVkIG5leHQuXG5cdFx0ICogQHBhcmFtIHJldmVyc2UgQW4gb3B0aW9uYWwgYm9vbGVhbiB2YWx1ZSB0aGF0IGluZGljYXRlc1xuXHRcdCAqIHdoZXRoZXIgdHlwZXMgaW4gdGhlIHJldHVybmVkIGFycmF5IHNob3VsZCBiZSBzb3J0ZWRcblx0XHQgKiB3aXRoIHRoZSBtb3N0IGRlZXBseSB2aXNpdGVkIG5vZGVzIG9jY3VyaW5nIGZpcnN0LlxuXHRcdCAqIFxuXHRcdCAqIEByZXR1cm5zIEFuIGFycmF5IHRoYXQgc3RvcmVzIHRoZSBsaXN0IG9mIHR5cGVzIHRoYXQgd2VyZVxuXHRcdCAqIHZpc2l0ZWQuXG5cdFx0ICovXG5cdFx0dmlzaXQobmV4dEZuOiAodHlwZTogVHlwZSkgPT4gSXRlcmFibGU8VHlwZSB8IG51bGw+IHwgVHlwZSB8IG51bGwsIHJldmVyc2U/OiBib29sZWFuKVxuXHRcdHtcblx0XHRcdHJldHVybiBBcnJheS5mcm9tKHRoaXMuaXRlcmF0ZShuZXh0Rm4sIHJldmVyc2UpKS5tYXAoZW50cnkgPT4gZW50cnkudHlwZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFBlcmZvcm1zIGFuIGFyYml0cmFyeSByZWN1cnNpdmUsIGJyZWFkdGgtZmlyc3QgaXRlcmF0aW9uXG5cdFx0ICogdGhhdCBiZWdpbnMgYXQgdGhpcyBUeXBlIGluc3RhbmNlLiBFbnN1cmVzIHRoYXQgbm8gdHlwZXNcblx0XHQgKiB0eXBlcyBhcmUgeWllbGRlZCBtdWx0aXBsZSB0aW1lcy5cblx0XHQgKiBcblx0XHQgKiBAcGFyYW0gbmV4dEZuIEEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgdHlwZSwgb3IgYW4gaXRlcmFibGVcblx0XHQgKiBvZiB0eXBlcyB0aGF0IGFyZSB0byBiZSB2aXNpdGVkIG5leHQuXG5cdFx0ICogQHBhcmFtIHJldmVyc2UgQW4gb3B0aW9uYWwgYm9vbGVhbiB2YWx1ZSB0aGF0IGluZGljYXRlc1xuXHRcdCAqIHdoZXRoZXIgdGhlIGl0ZXJhdG9yIHNob3VsZCB5aWVsZCB0eXBlcyBzdGFydGluZyB3aXRoIHRoZVxuXHRcdCAqIG1vc3QgZGVlcGx5IG5lc3RlZCB0eXBlcyBmaXJzdC5cblx0XHQgKiBcblx0XHQgKiBAeWllbGRzIEFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIGEgYHR5cGVgIHByb3BlcnR5IHRoYXQgaXMgdGhlXG5cdFx0ICogdGhlIFR5cGUgYmVpbmcgdmlzaXRlZCwgYW5kIGEgYHZpYWAgcHJvcGVydHkgdGhhdCBpcyB0aGUgVHlwZVxuXHRcdCAqIHRoYXQgd2FzIHJldHVybmVkIGluIHRoZSBwcmV2aW91cyBjYWxsIHRvIGBuZXh0Rm5gLlxuXHRcdCAqL1xuXHRcdCppdGVyYXRlKG5leHRGbjogKHR5cGU6IFR5cGUpID0+IEl0ZXJhYmxlPFR5cGUgfCBudWxsPiB8IFR5cGUgfCBudWxsLCByZXZlcnNlPzogYm9vbGVhbilcblx0XHR7XG5cdFx0XHRjb25zdCB5aWVsZGVkOiBUeXBlW10gPSBbXTtcblx0XHRcdFxuXHRcdFx0dHlwZSBSZWN1cnNlVHlwZSA9IEl0ZXJhYmxlSXRlcmF0b3I8eyB0eXBlOiBUeXBlOyB2aWE6IFR5cGUgfCBudWxsIH0+O1xuXHRcdFx0ZnVuY3Rpb24gKnJlY3Vyc2UodHlwZTogVHlwZSwgdmlhOiBUeXBlIHwgbnVsbCk6IFJlY3Vyc2VUeXBlXG5cdFx0XHR7XG5cdFx0XHRcdGlmICh5aWVsZGVkLmluY2x1ZGVzKHR5cGUpKVxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICghcmV2ZXJzZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHlpZWxkZWQucHVzaCh0eXBlKTtcblx0XHRcdFx0XHR5aWVsZCB7IHR5cGUsIHZpYSB9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCByZWR1Y2VkID0gbmV4dEZuKHR5cGUpO1xuXHRcdFx0XHRpZiAocmVkdWNlZCAhPT0gbnVsbCAmJiByZWR1Y2VkICE9PSB1bmRlZmluZWQpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAocmVkdWNlZCBpbnN0YW5jZW9mIFR5cGUpXG5cdFx0XHRcdFx0XHRyZXR1cm4geWllbGQgKnJlY3Vyc2UocmVkdWNlZCwgdHlwZSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Zm9yIChjb25zdCBuZXh0VHlwZSBvZiByZWR1Y2VkKVxuXHRcdFx0XHRcdFx0aWYgKG5leHRUeXBlIGluc3RhbmNlb2YgVHlwZSlcblx0XHRcdFx0XHRcdFx0eWllbGQgKnJlY3Vyc2UobmV4dFR5cGUsIHR5cGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAocmV2ZXJzZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHlpZWxkZWQucHVzaCh0eXBlKTtcblx0XHRcdFx0XHR5aWVsZCB7IHR5cGUsIHZpYSB9O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHlpZWxkICpyZWN1cnNlKHRoaXMsIG51bGwpO1xuXHRcdH1cblx0XG5cdFx0LyoqXG5cdFx0ICogUXVlcmllcyBmb3IgYSBUeXBlIHRoYXQgaXMgbmVzdGVkIHVuZGVybmVhdGggdGhpcyBUeXBlLFxuXHRcdCAqIGF0IHRoZSBzcGVjaWZpZWQgdHlwZSBwYXRoLlxuXHRcdCAqL1xuXHRcdHF1ZXJ5KC4uLnR5cGVQYXRoOiBzdHJpbmdbXSlcblx0XHR7XG5cdFx0XHRsZXQgY3VycmVudFR5cGU6IFR5cGUgfCBudWxsID0gbnVsbDtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCB0eXBlTmFtZSBvZiB0eXBlUGF0aClcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgbmV4dFR5cGUgPSB0aGlzLmNvbnRlbnRzLmZpbmQodHlwZSA9PiB0eXBlLm5hbWUgPT09IHR5cGVOYW1lKTtcblx0XHRcdFx0aWYgKCFuZXh0VHlwZSlcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XG5cdFx0XHRcdGN1cnJlbnRUeXBlID0gbmV4dFR5cGU7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiBjdXJyZW50VHlwZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQ2hlY2tzIHdoZXRoZXIgdGhpcyBUeXBlIGhhcyB0aGUgc3BlY2lmaWVkIHR5cGVcblx0XHQgKiBzb21ld2hlcmUgaW4gaXQncyBiYXNlIGdyYXBoLlxuXHRcdCAqL1xuXHRcdGlzKGJhc2VUeXBlOiBUeXBlKVxuXHRcdHtcblx0XHRcdGZvciAoY29uc3QgeyB0eXBlIH0gb2YgdGhpcy5pdGVyYXRlKHQgPT4gdC5iYXNlcykpXG5cdFx0XHRcdGlmICh0eXBlID09PSBiYXNlVHlwZSlcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDaGVja3Mgd2hldGhlciB0aGlzIFR5cGUgaGFzIHRoZSBzcGVjaWZpZWQgdHlwZVxuXHRcdCAqIHNvbWV3aGVyZSBpbiBpdCdzIGJhc2UgZ3JhcGguXG5cdFx0ICovXG5cdFx0aXNSb290KGJhc2VUeXBlOiBUeXBlKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmlzKGJhc2VUeXBlKSB8fMKgdGhpcy5wYXJhbGxlbFJvb3RzLmluY2x1ZGVzKGJhc2VUeXBlKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQ2hlY2tzIHdoZXRoZXIgdGhlIHNwZWNpZmllZCB0eXBlIGlzIGluIHRoaXMgVHlwZSdzXG5cdFx0ICogYC5jb250ZW50c2AgcHJvcGVydHksIGVpdGhlciBkaXJlY3RseSwgb3IgaW5kaXJlY3RseSB2aWFcblx0XHQgKiB0aGUgcGFyYWxsZWwgZ3JhcGhzIG9mIHRoZSBgLmNvbnRlbnRzYCBUeXBlcy5cblx0XHQgKi9cblx0XHRoYXModHlwZTogVHlwZSlcblx0XHR7XG5cdFx0XHRpZiAodGhpcy5jb250ZW50cy5pbmNsdWRlcyh0eXBlKSlcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgY29udGFpbmVkVHlwZSBvZiB0aGlzLmNvbnRlbnRzKVxuXHRcdFx0XHRpZiAodHlwZS5uYW1lID09PSBjb250YWluZWRUeXBlLm5hbWUpXG5cdFx0XHRcdFx0Zm9yIChjb25zdCBwYXJhbGxlbCBvZiBjb250YWluZWRUeXBlLml0ZXJhdGUodCA9PiB0LnBhcmFsbGVscykpXG5cdFx0XHRcdFx0XHRpZiAocGFyYWxsZWwudHlwZSA9PT0gdHlwZSlcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVHJhbnNmZXIgb3duZXJzaGlwIG9mIHRoaXMgaW5zdGFuY2UgdG8gYW5vdGhlciBDb2RlIGluc3RhbmNlXG5cdFx0ICovXG5cdFx0dHJhbnNmZXIoY29kZTogQ29kZSlcblx0XHR7XG5cdFx0XHR0aGlzLmNvZGUgPSBjb2RlO1xuXHRcdFx0dGhpcy5wcm90b3R5cGUudHJhbnNmZXIoY29kZSk7XG5cdFx0fVxuXHRcdFxuXHRcdHRvSlNPTigpXG5cdFx0e1x0XG5cdFx0XHRyZXR1cm4gW3RoaXMucHJvdG90eXBlLmlkLCB0aGlzLmNvbnRhaW5lciAmJiB0aGlzLmNvbnRhaW5lci5pZCwgdGhpcy5uYW1lLCB0aGlzLnZhbHVlc107XG5cdFx0fVxuXHR9XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyXG57XG5cdC8qKlxuXHQgKiBLZWVwcyB0cmFjayBvZiByZWxhdGlvbnMgYmV0d2VlbiB0eXBlcy5cblx0ICovXG5cdGV4cG9ydCBjbGFzcyBUeXBlU2V0IGV4dGVuZHMgU2V0PEZ1dHVyZVR5cGU+XG5cdHtcblx0XHRzdGF0aWMgZnJvbUpTT04oZGF0YTogbnVtYmVyW10pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBUeXBlU2V0KGRhdGEubWFwKHggPT4gRnV0dXJlVHlwZS5uZXcoeCkpKTtcblx0XHR9XG5cdFx0XG5cdFx0c25hcHNob3QoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnRvQXJyYXkoKS5tYXAoeCA9PiB4LnR5cGUpLmZpbHRlcih4ID0+IHgpIGFzIFR5cGVbXTtcblx0XHR9XG5cdFx0XG5cdFx0dG9BcnJheSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIEFycmF5LmZyb20odGhpcy52YWx1ZXMoKSkuc29ydCgpO1x0XG5cdFx0fVxuXHRcdFxuXHRcdHRvSlNPTigpIHsgcmV0dXJuIHRoaXMudG9BcnJheSgpOyB9XG5cdFx0dmFsdWVPZigpIHsgcmV0dXJuIHRoaXMudG9BcnJheSgpOyB9XG5cdFx0W1N5bWJvbC50b1ByaW1pdGl2ZV0oKSB7IHJldHVybiB0aGlzLnRvQXJyYXkoKTsgfVxuXHRcdGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpIHsgcmV0dXJuIFwiVHlwZVNldFwiOyB9XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXIuVXRpbFxue1xuXHQvKipcblx0ICogSGFzaCBjYWxjdWxhdGlvbiBmdW5jdGlvbiBhZGFwdGVkIGZyb206XG5cdCAqIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS81MjE3MTQ4MC8xMzM3Mzdcblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBoYXNoKHZhbHVlOiBzdHJpbmcsIHNlZWQgPSAwKVxuXHR7XG5cdFx0bGV0IGgxID0gMHhERUFEQkVFRiBeIHNlZWQ7XG5cdFx0bGV0IGgyID0gMFg0MUM2Q0U1NyBeIHNlZWQ7XG5cdFx0XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKylcblx0XHR7XG5cdFx0XHRsZXQgY2ggPSB2YWx1ZS5jaGFyQ29kZUF0KGkpO1xuXHRcdFx0aDEgPSBNYXRoLmltdWwoaDEgXiBjaCwgMjY1NDQzNTc2MSk7XG5cdFx0XHRoMiA9IE1hdGguaW11bChoMiBeIGNoLCAxNTk3MzM0Njc3KTtcblx0XHR9XG5cdFx0XG5cdFx0aDEgPSBNYXRoLmltdWwoaDEgXiBoMSA+Pj4gMTYsIDIyNDY4MjI1MDcpIF4gTWF0aC5pbXVsKGgyIF4gaDIgPj4+IDEzLCAzMjY2NDg5OTA5KTtcblx0XHRoMiA9IE1hdGguaW11bChoMiBeIGgyID4+PiAxNiwgMjI0NjgyMjUwNykgXiBNYXRoLmltdWwoaDEgXiBoMSA+Pj4gMTMsIDMyNjY0ODk5MDkpO1xuXHRcdHJldHVybiA0Mjk0OTY3Mjk2ICogKDIwOTcxNTEgJiBoMikgKyAoaDEgPj4+IDApO1xuXHR9XG5cdFxuXHQvKipcblx0ICogQ29tcHJlc3MgbmVzdGVkIGFycmF5c1xuXHQgKiBAcGFyYW0gZGF0YSBBbiBhcnJheSB3aXRoIG5lc3RlZCBhcnJheXMgaW4gaXRcblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBlbmNvZGUoZGF0YTogYW55W10pXG5cdHtcblx0XHRjb25zdCBiZiA9IG5ldyBCaXRmaWVsZHMoKTtcblx0XHRjb25zdCByZXN1bHQgPSBbXTtcblx0XHRcblx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGRhdGEubGVuZ3RoOylcblx0XHR7XG5cdFx0XHRjb25zdCB2cCA9IGRhdGFbaV07XG5cdFx0XHRjb25zdCB2YWx1ZSA9IHZwICYmIHR5cGVvZiB2cCA9PT0gXCJvYmplY3RcIiAmJiBcInRvSlNPTlwiIGluIHZwID8gdnAudG9KU09OKCkgOiB2cDtcdFxuXHRcdFx0Y29uc3QgYml0ID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwO1xuXHRcdFx0YmYuc2V0KGksIGJpdCA/IGZhbHNlIDogdHJ1ZSk7XG5cdFx0XHQgXG5cdFx0XHRpZiAoIWJpdCkgXG5cdFx0XHRcdHJlc3VsdC5wdXNoKHZhbHVlKTtcblx0XHR9XG5cdFx0XG5cdFx0cmVzdWx0LnVuc2hpZnQoYmYpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblx0XG5cdFxuXHQvKipcblx0ICogRGVjb21wcmVzcyBuZXN0ZWQgYXJyYXlzXG5cdCAqIEBwYXJhbSBkYXRhIEEgY29tcHJlc3NlZCBhcnJheVxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGRlY29kZShkYXRhOiBbbnVtYmVyLCAuLi5hbnlbXV0sIGxlbmd0aD86IG51bWJlcilcblx0e1xuXHRcdGNvbnN0IGJmID0gbmV3IEJpdGZpZWxkcyhkYXRhLnNoaWZ0KCkpO1xuXHRcdFxuXHRcdGlmICghbGVuZ3RoIHx8wqBsZW5ndGggPCAxKSBcblx0XHRcdGxlbmd0aCA9IGJmLnNpemU7XG5cdFx0XHRcblx0XHRjb25zdCByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoKTtcblx0XHRcblx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGxlbmd0aDspXG5cdFx0e1xuXHRcdFx0Y29uc3QgYml0ID0gYmYuZ2V0KGkpO1xuXHRcdFx0aWYgKGJpdClcblx0XHRcdFx0cmVzdWx0W2ldID0gZGF0YS5zaGlmdCgpO1xuXHRcdFx0ZWxzZSBcblx0XHRcdFx0cmVzdWx0W2ldID0gW107XG5cdFx0fVxuXHRcdFxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBGZXRjaCBhIGZpbGUgd2l0aG91dCBwbGF0Zm9ybSBkZXBlbmRlbmNpZXNcblx0ICogQHBhcmFtIHVybCBKU09OIGZpbGUgdXJsXG5cdCAqL1xuXHRleHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hKU09OKHVybDogc3RyaW5nKVxuXHR7XG5cdFx0aWYgKGdsb2JhbFRoaXMgJiYgXCJmZXRjaFwiIGluIGdsb2JhbFRoaXMpIFxuXHRcdHtcblx0XHRcdGNvbnN0IHJlcXVlc3QgPSBhd2FpdCAoPGFueT5nbG9iYWxUaGlzKS5mZXRjaCh1cmwpO1xuXHRcdFx0cmV0dXJuIGF3YWl0IHJlcXVlc3QuanNvbigpO1xuXHRcdH1cblx0XHRcblx0XHR0aHJvdyBcIlRoaXMgcGxhdGZvcm0gaXMgbm90IHN1cHBvcnRlZCFcIjtcblx0fVxuXHRcblx0LyoqXG5cdCAqIE1ha2UgYSBwcm9wZXJ0eSAobm9uLSllbnVtZXJhYmxlXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gc2hhZG93KG9iamVjdDogb2JqZWN0LCBrZXk6IHN0cmluZyB8IHN5bWJvbCwgZW51bWVyYWJsZSA9IGZhbHNlKVxuXHR7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwga2V5LCB7XG5cdFx0XHRlbnVtZXJhYmxlXG5cdFx0fSk7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBNYWtlIGEgcHJvcGVydGllcyAobm9uLSllbnVtZXJhYmxlXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gc2hhZG93cyhvYmplY3Q6IG9iamVjdCwgZW51bWVyYWJsZSA9IGZhbHNlLCAuLi5rZXlzOiBBcnJheTxzdHJpbmcgfMKgc3ltYm9sPilcblx0e1xuXHRcdGZvciAobGV0IGtleSBvZiBrZXlzKVxuXHRcdFx0c2hhZG93KG9iamVjdCwga2V5LCBlbnVtZXJhYmxlKTtcblx0fVxufSJdfQ==