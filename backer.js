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
                        this.equals(leaf);
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
                        this.names();
                        break;
                    case TruthTalk.PredicateOp.named:
                        this.names();
                        this.equals(leaf);
                        this.containers();
                        break;
                }
            }
            equals(leaf) {
                this.filter(x => x[Backer.value] !== null ? x[Backer.value] == (leaf).operand : false);
            }
            names() {
                this.map(SurrogateFilter, (x) => x[Backer.name]);
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
                        else if (b instanceof Backer.Name)
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
            PredicateOp[PredicateOp["named"] = 40] = "named";
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
            LeafOp[LeafOp["sum"] = 74] = "sum";
            LeafOp[LeafOp["avg"] = 75] = "avg";
            LeafOp[LeafOp["min"] = 76] = "min";
            LeafOp[LeafOp["max"] = 77] = "max";
            LeafOp[LeafOp["count"] = 78] = "count";
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
            var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
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
            /** */
            class Sum extends Leaf {
                constructor() {
                    super(...arguments);
                    this[_q] = LeafOp.sum;
                }
            }
            _q = TruthTalk.op;
            Leaves_1.Sum = Sum;
            /** */
            class Avg extends Leaf {
                constructor() {
                    super(...arguments);
                    this[_r] = LeafOp.avg;
                }
            }
            _r = TruthTalk.op;
            Leaves_1.Avg = Avg;
            /** */
            class Min extends Leaf {
                constructor() {
                    super(...arguments);
                    this[_s] = LeafOp.min;
                }
            }
            _s = TruthTalk.op;
            Leaves_1.Min = Min;
            /** */
            class Max extends Leaf {
                constructor() {
                    super(...arguments);
                    this[_t] = LeafOp.max;
                }
            }
            _t = TruthTalk.op;
            Leaves_1.Max = Max;
            /** */
            class Count extends Leaf {
                constructor() {
                    super(...arguments);
                    this[_u] = LeafOp.count;
                }
            }
            _u = TruthTalk.op;
            Leaves_1.Count = Count;
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
        toJSON() { return this[Backer.value]; }
        valueOf() { return this[Backer.value]; }
        toString() {
            const val = this[Backer.value];
            if (val === null)
                return val;
            return String(val);
        }
        [Symbol.toPrimitive]() { return this[Backer.value]; }
        get [Symbol.toStringTag]() { return "Proxy"; }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc291cmNlL0FTVC50cyIsIi4uL3NvdXJjZS9CaXRmaWVsZHMudHMiLCIuLi9zb3VyY2UvQ29kZS50cyIsIi4uL3NvdXJjZS9FbmdpbmUudHMiLCIuLi9zb3VyY2UvRnV0dXJlVHlwZS50cyIsIi4uL3NvdXJjZS9Ob2Rlcy50cyIsIi4uL3NvdXJjZS9Qcm90b3R5cGUudHMiLCIuLi9zb3VyY2UvUmVmbGV4TGlicmFyeS50cyIsIi4uL3NvdXJjZS9TdXJyb2dhdGVzLnRzIiwiLi4vc291cmNlL1R5cGUudHMiLCIuLi9zb3VyY2UvVHlwZVNldC50cyIsIi4uL3NvdXJjZS9VdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUNDQSxJQUFVLE1BQU0sQ0FpRGY7QUFqREQsV0FBVSxNQUFNO0lBRWY7O09BRUc7SUFDSCxNQUFhLFNBQVM7UUFFckIsWUFBbUIsUUFBUSxDQUFDO1lBQVQsVUFBSyxHQUFMLEtBQUssQ0FBSTtRQUFHLENBQUM7UUFFaEM7O1dBRUc7UUFDSCxJQUFJLElBQUk7WUFFUCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxHQUFHLENBQUMsS0FBYTtZQUVoQixJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUU7Z0JBQzFCLE9BQU8sS0FBSyxDQUFDO1lBRWQsT0FBTyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNqRCxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxHQUFHLENBQUMsS0FBYSxFQUFFLEtBQWM7WUFFaEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFO2dCQUMx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S0FBSyxJQUFJLEdBQUcsSUFBSSxJQUFJO2dCQUNuQixNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBSmUsWUFBTyxVQUl0QixDQUFBO0lBQ0YsQ0FBQyxFQTFHZ0IsSUFBSSxHQUFKLFdBQUksS0FBSixXQUFJLFFBMEdwQjtBQUFELENBQUMsRUExR1MsTUFBTSxLQUFOLE1BQU0sUUEwR2YiLCJzb3VyY2VzQ29udGVudCI6WyJcbm5hbWVzcGFjZSBCYWNrZXIuVHJ1dGhUYWxrXG57XG5cdC8vQHRzLWlnbm9yZVxuXHRleHBvcnQgdHlwZSBBdG9taWMgPSBSZWZsZXguQ29yZS5BdG9taWM8Tm9kZSwgQnJhbmNoPjtcblx0Ly9AdHMtaWdub3JlXG5cdGV4cG9ydCB0eXBlIEF0b21pY3MgPSBSZWZsZXguQ29yZS5BdG9taWNzPE5vZGUsIEJyYW5jaD47XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGludGVyZmFjZSBOYW1lc3BhY2UgZXh0ZW5kc1xuXHQvL0B0cy1pZ25vcmVcblx0XHRSZWZsZXguQ29yZS5JQ29udGFpbmVyTmFtZXNwYWNlPEF0b21pY3MsIEJyYW5jaGVzLlF1ZXJ5PlxuXHR7XG5cdFx0LyoqICovXG5cdFx0aXMoLi4uYXRvbWljczogQXRvbWljc1tdKTogQnJhbmNoZXMuSXM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aGFzKC4uLmF0b21pY3M6IEF0b21pY3NbXSk6IEJyYW5jaGVzLkhhcztcblx0XHRcblx0XHQvKiogKi9cblx0XHRub3QoLi4uYXRvbWljczogQXRvbWljc1tdKTogQnJhbmNoZXMuTm90O1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdG9yKC4uLmF0b21pY3M6IEF0b21pY3NbXSk6IEJyYW5jaGVzLk9yO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvbnRhaW5lcnMoKTogTGVhdmVzLkNvbnRhaW5lcnM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cm9vdCgpOiBMZWF2ZXMuUm9vdHM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y29udGVudHMoKTogTGVhdmVzLkNvbnRlbnRzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGVxdWFscyh2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbik6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z3JlYXRlclRoYW4odmFsdWU6IHN0cmluZyB8IG51bWJlcik6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bGVzc1RoYW4odmFsdWU6IHN0cmluZyB8IG51bWJlcik6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c3RhcnRzV2l0aCh2YWx1ZTogc3RyaW5nIHwgbnVtYmVyKTogTGVhdmVzLlByZWRpY2F0ZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRlbmRzV2l0aCh2YWx1ZTogc3RyaW5nIHwgbnVtYmVyKTogTGVhdmVzLlByZWRpY2F0ZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRhbGlhc2VkKCk6IExlYXZlcy5BbGlhc2VkO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGxlYXZlcygpOiBMZWF2ZXMuTGVhdmVzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZyZXNoKCk6IExlYXZlcy5GcmVzaDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRzbGljZShzdGFydDogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBMZWF2ZXMuU2xpY2U7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0b2NjdXJlbmNlcyhtaW46IG51bWJlciwgbWF4PzogbnVtYmVyKTogTGVhdmVzLk9jY3VyZW5jZXM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c29ydCguLi5jb250ZW50VHlwZXM6IE9iamVjdFtdKTogTGVhdmVzLlNvcnQ7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmV2ZXJzZSgpOiBMZWF2ZXMuUmV2ZXJzZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRuYW1lcygpOiBMZWF2ZXMuTmFtZXM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bmFtZWQodmFsdWU6IHN0cmluZyk6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c3VtKCk6IExlYXZlcy5TdW07XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXZnKCk6IExlYXZlcy5Bdmc7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bWluKCk6IExlYXZlcy5NaW47XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bWF4KCk6IExlYXZlcy5NYXg7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y291bnQoKTogTGVhdmVzLkNvdW50O1xuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBCYWNrZXJcbntcblx0LyoqXG5cdCAqIEJpdHdpc2UgZmxhZyBtYW5hZ2VyXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQml0ZmllbGRzXG5cdHtcblx0XHRjb25zdHJ1Y3RvcihwdWJsaWMgZmxhZ3MgPSAwKSB7fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgYXBwcm94LiBzaXplIGJhc2VkIG9uIGxhc3Qgc2V0IGJpdC5cblx0XHQgKi9cblx0XHRnZXQgc2l6ZSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIE1hdGguY2VpbChNYXRoLmxvZzIodGhpcy5mbGFncykpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIGEgYm9vbGVhbiBmcm9tIHNwZWNpZmllZCBpbmRleC5cblx0XHQgKi9cblx0XHRnZXQoaW5kZXg6IG51bWJlcilcblx0XHR7XG5cdFx0XHRpZiAoaW5kZXggPCAwIHx8IGluZGV4ID4gMzEpXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gdGhpcy5mbGFncyAmICgxIDw8IGluZGV4KSA/IHRydWUgOiBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU2V0cyBhIGJvb2xlYW4gdG8gc3BlY2lmaWVkIGluZGV4LlxuXHRcdCAqL1xuXHRcdHNldChpbmRleDogbnVtYmVyLCB2YWx1ZTogYm9vbGVhbilcblx0XHR7XG5cdFx0XHRpZiAoaW5kZXggPCAwIHx8IGluZGV4ID4gMzEpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdFxuXHRcdFx0Y29uc3QgbWFzayA9IDEgPDwgaW5kZXg7XG5cdFx0XHRcblx0XHRcdGlmICh2YWx1ZSlcblx0XHRcdFx0dGhpcy5mbGFncyB8PSBtYXNrO1xuXHRcdFx0ZWxzZSBcblx0XHRcdFx0dGhpcy5mbGFncyAmPSB+bWFzaztcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKCkgeyByZXR1cm4gdGhpcy5mbGFnczsgfVxuXHRcdHZhbHVlT2YoKSB7IHJldHVybiB0aGlzLmZsYWdzOyB9XG5cdFx0W1N5bWJvbC50b1ByaW1pdGl2ZV0oKSB7IHJldHVybiB0aGlzLmZsYWdzOyB9XG5cdFx0Z2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkgeyByZXR1cm4gXCJCaXRmaWVsZHNcIjsgfVxuXHR9XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyXG57XHRcblx0LyoqXG5cdCAqIFJlZmVyYW5jZXMgdG8gZXZlcnkgbG9hZGVkIENvZGUgaW5zdGFuY2UuXG5cdCAqL1xuXHRleHBvcnQgY29uc3QgQ29kZXM6IENvZGVbXSA9IFtdO1xuXHRcblx0LyoqXG5cdCAqIExhc3QgbG9hZGVkIFNjaGVtYVxuXHQgKi9cblx0ZXhwb3J0IGxldCBTY2hlbWE6IFJlY29yZDxzdHJpbmcsIFN0cnVjdD4gPSB7fTtcblx0XG5cdC8qKlxuXHQgKiBSZWZlcmFuY2VzIHRvIGV2ZXJ5IGxvYWRlZCBTY2hlbWFcblx0ICovXG5cdGV4cG9ydCBjb25zdCBTY2hlbWFzOiBSZWNvcmQ8c3RyaW5nLCBTdHJ1Y3Q+W10gPSBbXTtcblx0XG5cdC8qKlxuXHQgKiBMYXN0IGxvYWRlZCBEYXRhIEdyYXBoXG5cdCAqL1xuXHRleHBvcnQgbGV0IEdyYXBoOiBSZWNvcmQ8c3RyaW5nLCBTdXJyb2dhdGU+ID0ge307XG5cdFxuXHQvKipcblx0ICogUmVmZXJhbmNlcyB0byBldmVyeSBsb2FkZWQgRGF0YSBHcmFwaFxuXHQgKi9cblx0ZXhwb3J0IGNvbnN0IEdyYXBoczogUmVjb3JkPHN0cmluZywgU3Vycm9nYXRlPltdID0gW107XG5cdFxuXHQvKipcblx0ICogVHJ1dGggQ29kZSBKU09OXG5cdCAqIFxuXHQgKiBUaGlzIGNsYXNzIG1hbmFnZXMgY29kZSB0eXBlcyBleHRyYWN0ZWQgZnJvbSBUcnV0aCBmaWxlIGJ5IGNvbXBpbGVyLlxuXHQgKiBBbHNvIG1hbmFnZXMgcmVsYXRpb25zIGJldHdlZW4gcHJvdG90eXBlLCB0eXBlcyBhbmQgZGF0YS4gXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQ29kZVxuXHR7XG5cdFx0LyoqXG5cdFx0ICogTG9hZHMgYSBDb2RlSlNPTiBhbmQgbG9hZHMgRGF0YUpTT05zIG9uIHRoYXQgQ29kZSBpbnN0YW5jZS5cblx0XHQgKiBcblx0XHQgKiBAcGFyYW0gY29kZSBDb2RlSlNPTiBVcmxcblx0XHQgKiBAcGFyYW0gZGF0YSBEYXRhSlNPTiBVcmxzXG5cdFx0ICovXG5cdFx0c3RhdGljIGFzeW5jIGxvYWQoY29kZTogc3RyaW5nLCAuLi5kYXRhOiBzdHJpbmdbXSlcblx0XHR7XG5cdFx0XHRjb25zdCBpbnN0YW5jZSA9IENvZGUubmV3KGF3YWl0IFV0aWwuZmV0Y2hKU09OKGNvZGUpKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCB1cmwgb2YgZGF0YSlcblx0XHRcdFx0aW5zdGFuY2UubG9hZERhdGEoYXdhaXQgVXRpbC5mZXRjaEpTT04odXJsKSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBpbnN0YW5jZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogTG9hZHMgYSBDb2RlIGluc3RhbmNlIGZyb20gcGFyc2VkIENvZGUgSlNPTi5cblx0XHQgKiBAcGFyYW0gZGF0YSBQYXJzZWQgQ29kZUpTT05cblx0XHQgKi9cblx0XHRzdGF0aWMgbmV3KGRhdGE6IFtQcm90b3R5cGVKU09OW10sIFR5cGVKU09OW11dKVxuXHRcdHtcblx0XHRcdGNvbnN0IGNvZGUgPSBuZXcgQ29kZSgpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBwcm90b3R5cGVzID0gZGF0YVswXS5tYXAoeCA9PiBQcm90b3R5cGUubG9hZChjb2RlLCB4KSk7XG5cdFx0XHRmb3IgKGNvbnN0IHByb3RvIG9mIHByb3RvdHlwZXMpXG5cdFx0XHRcdGNvZGUucHJvdG90eXBlcy5wdXNoKHByb3RvKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgdHlwZXMgPSBkYXRhWzFdLm1hcCh4ID0+IFR5cGUubG9hZChjb2RlLCB4KSk7XG5cdFx0XHRmb3IgKGNvbnN0IHR5cGUgb2YgdHlwZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGlkID0gY29kZS50eXBlcy5wdXNoKHR5cGUpIC0gMTtcblx0XHRcdFx0RnV0dXJlVHlwZS5JZE1hcC5zZXQoaWQsIHR5cGUpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRjb25zdCBTY2hlbWE6IFJlY29yZDxzdHJpbmcsIFN0cnVjdD4gPSB7fTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCB0eXBlIG9mIHR5cGVzKVxuXHRcdFx0XHRpZiAoIXR5cGUuY29udGFpbmVyKVxuXHRcdFx0XHRcdFNjaGVtYVt0eXBlLm5hbWVdID0gbmV3IFN0cnVjdCh0eXBlLCBudWxsKTtcblx0XHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0QmFja2VyLlNjaGVtYSA9IFNjaGVtYTtcblx0XHRcdFx0XHRcblx0XHRcdFNjaGVtYXMucHVzaChTY2hlbWEpO1xuXHRcdFx0Q29kZXMucHVzaChjb2RlKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGNvZGU7XG5cdFx0fVxuXHRcdFxuXHRcdHR5cGVzOiBUeXBlW10gPSBbXTtcblx0XHRwcm90b3R5cGVzOiBQcm90b3R5cGVbXSA9IFtdO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEJpbmRzIGEgdHlwZSB0byBDb2RlIGluc3RhbmNlXG5cdFx0ICovXG5cdFx0YWRkKHR5cGU6IFR5cGUpXG5cdFx0e1xuXHRcdFx0aWYgKCF0aGlzLnByb3RvdHlwZXMuc29tZSh4ID0+IHguaGFzaCA9PT0gdHlwZS5wcm90b3R5cGUuaGFzaCkpXG5cdFx0XHRcdHRoaXMucHJvdG90eXBlcy5wdXNoKHR5cGUucHJvdG90eXBlKTtcblx0XHRcdFx0XG5cdFx0XHRjb25zdCBpZCA9IHRoaXMudHlwZXMucHVzaCh0eXBlKSAtIDE7XG5cdFx0XHR0eXBlLnRyYW5zZmVyKHRoaXMpO1xuXHRcdFx0cmV0dXJuIGlkO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBMb2FkcyBkYXRhIHR5cGVzIGFuZCBzdXJyb2dhdGVzIGZyb20gcGFyc2VkIERhdGFKU09OLlxuXHRcdCAqIEBwYXJhbSBkYXRhIFBhcnNlZCBEYXRhSlNPTlxuXHRcdCAqL1xuXHRcdGxvYWREYXRhKGRhdGE6IERhdGFKU09OW10pXG5cdFx0e1x0XG5cdFx0XHRjb25zdCBHcmFwaDogUmVjb3JkPHN0cmluZywgU3Vycm9nYXRlPiA9IHt9O1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGluZm8gb2YgZGF0YSlcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgcHJvdG90eXBlcyA9IGluZm8uc2hpZnQoKSBhcyBudW1iZXJbXTtcblx0XHRcdFx0Y29uc3QgbmFtZSA9IGluZm8uc2hpZnQoKSBhcyBzdHJpbmc7XG5cdFx0XHRcdGNvbnN0IHByb3RvdHlwZSA9IHRoaXMucHJvdG90eXBlc1twcm90b3R5cGVzLnNoaWZ0KCkhXTtcblx0XHRcdFx0Y29uc3QgdHlwZSA9IG5ldyBUeXBlKFxuXHRcdFx0XHRcdHRoaXMsIFxuXHRcdFx0XHRcdG5hbWUsIFxuXHRcdFx0XHRcdHByb3RvdHlwZSwgXG5cdFx0XHRcdFx0bnVsbCxcblx0XHRcdFx0XHRWYWx1ZVN0b3JlLmxvYWQoLi4uaW5mby5zaGlmdCgpIGFzIFZhbHVlSlNPTltdKVxuXHRcdFx0XHQpO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgZ2VuZXJhdGUgPSAoYmFzZTogVHlwZSwgY29udGVudHM6IFR5cGVbXSkgPT4gXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRmb3IgKGNvbnN0IGNvbnRlbnQgb2YgY29udGVudHMpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y29uc3QgY2xvbmUgPSBuZXcgVHlwZShcblx0XHRcdFx0XHRcdFx0dGhpcyxcblx0XHRcdFx0XHRcdFx0Y29udGVudC5uYW1lLFxuXHRcdFx0XHRcdFx0XHR0aGlzLnByb3RvdHlwZXNbcHJvdG90eXBlcy5zaGlmdCgpIV0sXG5cdFx0XHRcdFx0XHRcdEZ1dHVyZVR5cGUubmV3KGJhc2UpLFxuXHRcdFx0XHRcdFx0XHRjb250ZW50LnZhbHVlcy5jb25jYXQoVmFsdWVTdG9yZS5sb2FkKC4uLmluZm8uc2hpZnQoKSBhcyBWYWx1ZUpTT05bXSkpXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0dGhpcy50eXBlcy5wdXNoKGNsb25lKTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0Z2VuZXJhdGUoY2xvbmUsIGNsb25lLnBhcmFsbGVsQ29udGVudHMpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0Z2VuZXJhdGUodHlwZSwgdHlwZS5wYXJhbGxlbENvbnRlbnRzKTtcblx0XHRcdFx0XG5cdFx0XHRcdEdyYXBoW3R5cGUubmFtZV0gPSBuZXcgU3Vycm9nYXRlKHR5cGUsIG51bGwpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRCYWNrZXIuR3JhcGggPSBHcmFwaDtcblx0XHRcdEdyYXBocy5wdXNoKEdyYXBoKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIEdyYXBoO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBFeHRyYWN0IGRhdGEgZnJvbSBjdXJyZW50IHR5cGVzIG9mIENvZGVcblx0XHQgKiBAcGFyYW0gcGF0dGVybiBEYXRhIE5hbWUgUGF0dGVyblxuXHRcdCAqL1xuXHRcdGV4dHJhY3REYXRhKHBhdHRlcm46IFJlZ0V4cClcblx0XHR7XG5cdFx0XHRjb25zdCBkYXRhUm9vdHMgPSB0aGlzLnR5cGVzLmZpbHRlcih4ID0+IHguY29udGFpbmVyID09PSBudWxsICYmIHBhdHRlcm4udGVzdCh4Lm5hbWUpKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgZHJpbGwgPSAoeDogVHlwZSkgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgYXJyYXkgPSBbeF07XG5cdFx0XHRcdGZvciAoY29uc3QgdHlwZSBvZiB4LmNvbnRlbnRzKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgY2hpbGQgPSBkcmlsbCh0eXBlKS5mbGF0KCk7XG5cdFx0XHRcdFx0aWYgKGNoaWxkLmxlbmd0aClcblx0XHRcdFx0XHRcdGFycmF5LnB1c2goLi4uY2hpbGQpO1xuXHRcdFx0XHR9IFxuXHRcdFx0XHRyZXR1cm4gYXJyYXk7XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0XHRjb25zdCBkYXRhU2NoZW1hID0gZGF0YVJvb3RzLm1hcChkcmlsbCkuZmlsdGVyKHggPT4gQXJyYXkuaXNBcnJheSh4KSA/IHgubGVuZ3RoIDogdHJ1ZSk7XG5cdFx0XHRjb25zdCBkYXRhUXVlcnkgPSBkYXRhU2NoZW1hLmZsYXQoKTtcblx0XHRcdGNvbnN0IGNvZGVSb290cyA9IHRoaXMudHlwZXMuZmlsdGVyKHggPT4gIWRhdGFRdWVyeS5pbmNsdWRlcyh4KSk7XG5cdFx0XHRjb25zdCBjb2RlID0gbmV3IENvZGUoKTtcblx0XHRcdGZvciAoY29uc3QgdHlwZSBvZiBjb2RlUm9vdHMpXG5cdFx0XHRcdGNvZGUuYWRkKHR5cGUpO1xuXHRcdFx0XHRcblx0XHRcdGZvciAoY29uc3QgdHlwZSBvZiBkYXRhUXVlcnkpXG5cdFx0XHR7XHRcdFx0XG5cdFx0XHRcdGlmICghY29kZS5wcm90b3R5cGVzLnNvbWUoeCA9PiB4Lmhhc2ggPT09IHR5cGUucHJvdG90eXBlLmhhc2gpKVxuXHRcdFx0XHRcdGNvZGUucHJvdG90eXBlcy5wdXNoKHR5cGUucHJvdG90eXBlKTtcdFxuXHRcdFx0XHR0eXBlLnRyYW5zZmVyKGNvZGUpO1xuXHRcdFx0fVxuXHRcdFxuXHRcdFx0Y29uc3QgZGF0YSA9IGRhdGFTY2hlbWEubWFwKHggPT4gW3gubWFwKHggPT4geC5wcm90b3R5cGUuaWQpLCB4WzBdLm5hbWUsIC4uLngubWFwKHggPT4geC52YWx1ZXMudmFsdWVTdG9yZSldKTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjb2RlLFxuXHRcdFx0XHRkYXRhXG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdHRvSlNPTigpIHsgcmV0dXJuIFt0aGlzLnByb3RvdHlwZXMsIHRoaXMudHlwZXNdOyB9XG5cdFx0dmFsdWVPZigpIHsgcmV0dXJuIHRoaXMudHlwZXMubGVuZ3RoOyB9XG5cdFx0W1N5bWJvbC50b1ByaW1pdGl2ZV0oKSB7IHJldHVybiB0aGlzLnR5cGVzLmxlbmd0aDsgfVxuXHRcdGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpIHsgcmV0dXJuIFwiQ29kZVwiOyB9XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXIuVHJ1dGhUYWxrXG57XG5cdHR5cGUgQ3Vyc29yID0gU3Vycm9nYXRlIHwgTmFtZTtcblx0dHlwZSBNYXliZUFycmF5PFQ+ID0gVCB8IFRbXTtcblx0XG5cdGNvbnN0IFN1cnJvZ2F0ZUZpbHRlciA9ICh4OiBDdXJzb3IpOiB4IGlzIFN1cnJvZ2F0ZSA9PiB4IGluc3RhbmNlb2YgU3Vycm9nYXRlO1xuXHRcblx0LyoqXG5cdCAqIEtlZXBzIHRyYWNrIG9mIHBvc3NpYmxlIG91dHB1dCBvZiBxdWVyeVxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIEN1cnNvclNldFxuXHR7XHRcblx0XHRjdXJzb3JzOiBTZXQ8Q3Vyc29yPjtcblx0XHRcblx0XHRjb25zdHJ1Y3RvciguLi5jdXJzb3JzOiBDdXJzb3JbXSlcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KGN1cnNvcnMpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTbmFwc2hvdCBvZiBjdXJyZW50IHBvc3NpYmlsaXRpZXNcblx0XHQgKi9cblx0XHRzbmFwc2hvdCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIEFycmF5LmZyb20odGhpcy5jdXJzb3JzKTtcblx0XHR9XG5cdFx0XG5cdFx0bWFwKGZpbHRlcjogKGN1cnNvcjogQ3Vyc29yKSA9PiBib29sZWFuLCBtYXA6IChpdGVtczogQ3Vyc29yKSA9PiBNYXliZUFycmF5PEN1cnNvcj4pXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkuZmlsdGVyKGZpbHRlcikuZmxhdE1hcChtYXApLmZpbHRlcih4ID0+ICEheCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDbG9uZXMgY3VycmVudCBzdGF0ZSBvZiBDdXJzb3JTZXRcblx0XHQgKi9cblx0XHRjbG9uZSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBDdXJzb3JTZXQoLi4udGhpcy5zbmFwc2hvdCgpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRmlsdGVycyBjdXJyZW50IHBvc3NpYmlsaXRpZXNcblx0XHQgKi9cblx0XHRmaWx0ZXIoZm46ICh2OiBDdXJzb3IpID0+IGJvb2xlYW4pXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkuZmlsdGVyKHggPT4gZm4oeCkpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRmlsdGVycyBjdXJyZW50IHBvc3NpYmlsaXRpZXNcblx0XHQgKi9cblx0XHRmaWx0ZXJTdXJyb2dhdGUoZm46ICh2OiBTdXJyb2dhdGUpID0+IGJvb2xlYW4pXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkuZmlsdGVyKCh4KTogeCBpcyBTdXJyb2dhdGUgPT4geCBpbnN0YW5jZW9mIFN1cnJvZ2F0ZSAmJiBmbih4KSkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBFeGVjdXRlcyBhIFRydXRoIFRhbGsgcXVlcnlcblx0XHQgKi9cblx0XHRxdWVyeShhc3Q6IEJyYW5jaCB8IExlYWYpIFxuXHRcdHtcblx0XHRcdGlmIChhc3QgaW5zdGFuY2VvZiBCcmFuY2gpXG5cdFx0XHRcdHRoaXMuYnJhbmNoKGFzdCk7XG5cdFx0XHRlbHNlIFxuXHRcdFx0XHR0aGlzLmxlYWYoYXN0KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRXhlY3V0ZXMgYSBUcnV0aCBUYWxrIGJyYW5jaFxuXHRcdCAqL1xuXHRcdGJyYW5jaChicmFuY2g6IEJyYW5jaCkgXG5cdFx0e1xuXHRcdFx0c3dpdGNoIChicmFuY2hbb3BdKVxuXHRcdFx0e1xuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLmlzOlxuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLnF1ZXJ5OlxuXHRcdFx0XHRcdGZvciAoY29uc3QgcXVlcnkgb2YgYnJhbmNoLmNoaWxkcmVuKVxuXHRcdFx0XHRcdFx0dGhpcy5xdWVyeShxdWVyeSk7XHRcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBCcmFuY2hPcC5ub3Q6IFxuXHRcdFx0XHRcdHRoaXMubm90KGJyYW5jaCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgQnJhbmNoT3Aub3I6XG5cdFx0XHRcdFx0dGhpcy5vcihicmFuY2gpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLmhhczpcblx0XHRcdFx0XHR0aGlzLmNvbnRlbnRzKCk7XG5cdFx0XHRcdFx0Zm9yIChjb25zdCBxdWVyeSBvZiBicmFuY2guY2hpbGRyZW4pXG5cdFx0XHRcdFx0XHR0aGlzLnF1ZXJ5KHF1ZXJ5KTtcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lcnMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRXhlY3V0ZXMgYSBUcnV0aCBUYWxrIGxlYWZcblx0XHQgKi9cblx0XHRsZWFmKGxlYWY6IExlYWYpIFxuXHRcdHtcblx0XHRcdHN3aXRjaCAobGVhZltvcF0pXG5cdFx0XHR7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLnN1cnJvZ2F0ZTpcblx0XHRcdFx0XHR0aGlzLmZpbHRlclN1cnJvZ2F0ZSh4ID0+IHhbdHlwZU9mXS5pcygoPFN1cnJvZ2F0ZT5sZWFmKVt0eXBlT2ZdKSB8fCB4W3R5cGVPZl0ucGFyYWxsZWxSb290cy5pbmNsdWRlcygoPFN1cnJvZ2F0ZT5sZWFmKVt0eXBlT2ZdKSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLmNvbnRlbnRzOlxuXHRcdFx0XHRcdHRoaXMuY29udGVudHMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3Aucm9vdHM6XG5cdFx0XHRcdFx0dGhpcy5yb290cygpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5jb250YWluZXJzOlxuXHRcdFx0XHRcdHRoaXMuY29udGFpbmVycygpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5hbGlhc2VkOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHggPT4geFt2YWx1ZV0gIT09IG51bGwpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5sZWF2ZXM6XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoeCA9PiB4W3ZhbHVlXSA9PT0gbnVsbCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLmZyZXNoOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyU3Vycm9nYXRlKHggPT4geFt0eXBlT2ZdLmlzRnJlc2gpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLmVxdWFsczpcblx0XHRcdFx0XHR0aGlzLmVxdWFscyg8TGVhdmVzLlByZWRpY2F0ZT5sZWFmKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBQcmVkaWNhdGVPcC5ncmVhdGVyVGhhbjpcblx0XHRcdFx0XHR0aGlzLmZpbHRlcih4ID0+ICh4W3ZhbHVlXSB8fMKgMCkgPiAoPExlYXZlcy5QcmVkaWNhdGU+bGVhZikub3BlcmFuZCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgUHJlZGljYXRlT3AubGVzc1RoYW46XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoeCA9PiAoeFt2YWx1ZV0gfHwgMCkgPCAoPExlYXZlcy5QcmVkaWNhdGU+bGVhZikub3BlcmFuZCk7XG5cdFx0XHRcdFx0YnJlYWs7XHRcblx0XHRcdFx0Y2FzZSBQcmVkaWNhdGVPcC5zdGFydHNXaXRoOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHggPT4geFt2YWx1ZV0gPT0gbnVsbCA/IGZhbHNlIDogeFt2YWx1ZV0hLnRvU3RyaW5nKCkuc3RhcnRzV2l0aCg8c3RyaW5nPig8TGVhdmVzLlByZWRpY2F0ZT5sZWFmKS5vcGVyYW5kKSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgUHJlZGljYXRlT3AuZW5kc1dpdGg6XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoeCA9PiB4W3ZhbHVlXSA9PSBudWxsID8gZmFsc2UgOiB4W3ZhbHVlXSEudG9TdHJpbmcoKS5lbmRzV2l0aCg8c3RyaW5nPig8TGVhdmVzLlByZWRpY2F0ZT5sZWFmKS5vcGVyYW5kKSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLnNsaWNlOlxuXHRcdFx0XHRcdHRoaXMuc2xpY2UobGVhZik7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLm9jY3VyZW5jZXM6XG5cdFx0XHRcdFx0dGhpcy5vY2N1cmVuY2VzKGxlYWYpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5zb3J0OiBcblx0XHRcdFx0XHR0aGlzLnNvcnQobGVhZik7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLnJldmVyc2U6XG5cdFx0XHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkucmV2ZXJzZSgpKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3AubmFtZXM6XG5cdFx0XHRcdFx0dGhpcy5uYW1lcygpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLm5hbWVkOlxuXHRcdFx0XHRcdHRoaXMubmFtZXMoKTtcblx0XHRcdFx0XHR0aGlzLmVxdWFscyg8TGVhdmVzLlByZWRpY2F0ZT5sZWFmKTtcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lcnMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0ZXF1YWxzKGxlYWY6IExlYXZlcy5QcmVkaWNhdGUpXG5cdFx0e1xuXHRcdFx0dGhpcy5maWx0ZXIoeCA9PiB4W3ZhbHVlXSAhPT0gbnVsbCA/IHhbdmFsdWVdID09IChsZWFmKS5vcGVyYW5kIDogZmFsc2UpO1xuXHRcdH1cblx0XHRcblx0XHRuYW1lcygpXG5cdFx0e1xuXHRcdFx0dGhpcy5tYXAoU3Vycm9nYXRlRmlsdGVyLCAoeCkgPT4gKDxTdXJyb2dhdGU+eClbbmFtZV0pO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHbyBvbmUgbGV2ZWwgbmVzdGVkIGluXG5cdFx0ICovXG5cdFx0Y29udGVudHMoKVxuXHRcdHtcblx0XHRcdHRoaXMubWFwKFN1cnJvZ2F0ZUZpbHRlciwgeCA9PiAoPFN1cnJvZ2F0ZT54KS5jb250ZW50cyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdvIHRvIHRvcCBsZXZlbFxuXHRcdCAqL1xuXHRcdHJvb3RzKClcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KHRoaXMuc25hcHNob3QoKS5tYXAoKHg6IEN1cnNvciB8wqBudWxsKSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0d2hpbGUgKHggJiYgeFtwYXJlbnRdKSBcblx0XHRcdFx0XHRcdHggPSB4W3BhcmVudF0gYXMgU3Vycm9nYXRlO1xuXHRcdFx0XHRcdHJldHVybiB4O1x0XHRcdFx0XG5cdFx0XHRcdH0pLmZpbHRlcigoeCk6IHggaXMgU3Vycm9nYXRlID0+ICEheCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHbyBvbmUgbGV2ZWwgbmVzdGVkIG91dFxuXHRcdCAqL1xuXHRcdGNvbnRhaW5lcnMoKVxuXHRcdHtcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQodGhpcy5zbmFwc2hvdCgpLm1hcCh4ID0+IHhbcGFyZW50XSkuZmlsdGVyKCh4KTogeCBpcyBTdXJyb2dhdGUgPT4gISF4KSk7XG5cdFx0fVxuXHRcblx0XHQvKiogKi9cblx0XHRub3QoYnJhbmNoOiBCcmFuY2gpXG5cdFx0e1xuXHRcdFx0Y29uc3QgaW5zdGFuY2UgPSB0aGlzLmNsb25lKCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHF1ZXJ5IG9mIGJyYW5jaC5jaGlsZHJlbilcblx0XHRcdFx0aW5zdGFuY2UucXVlcnkocXVlcnkpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBzbmFwID0gaW5zdGFuY2Uuc25hcHNob3QoKTtcblx0XHRcdHRoaXMuZmlsdGVyKHggPT4gIXNuYXAuaW5jbHVkZXMoeCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRvcihicmFuY2g6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRjb25zdCBpbnN0YW5jZXMgPSBbXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBxdWVyeSBvZiBicmFuY2guY2hpbGRyZW4pXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGluc3RhbmNlID0gdGhpcy5jbG9uZSgpO1x0XG5cdFx0XHRcdGluc3RhbmNlLnF1ZXJ5KHF1ZXJ5KTtcblx0XHRcdFx0aW5zdGFuY2VzLnB1c2goaW5zdGFuY2UpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRjb25zdCBzbmFwID0gaW5zdGFuY2VzLmZsYXQoKTtcblx0XHRcdHRoaXMuZmlsdGVyKHggPT4gc25hcC5pbmNsdWRlcyh4KSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHNsaWNlKGxlYWY6IExlYWYpXG5cdFx0e1xuXHRcdFx0bGV0IHtcblx0XHRcdFx0c3RhcnQsXG5cdFx0XHRcdGVuZFxuXHRcdFx0fcKgPSA8TGVhdmVzLlNsaWNlPmxlYWY7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHNuYXAgPSB0aGlzLnNuYXBzaG90KCk7XG5cdFx0XHRpZiAoZW5kICYmIGVuZCA8IDEpIGVuZCA9IHN0YXJ0ICsgTWF0aC5yb3VuZChlbmQgKiBzbmFwLmxlbmd0aCk7XG5cdFx0XHRcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQoc25hcC5zbGljZShzdGFydCwgZW5kKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdG9jY3VyZW5jZXMobGVhZjogTGVhZilcblx0XHR7XG5cdFx0XHRsZXQge1xuXHRcdFx0XHRtaW4sXG5cdFx0XHRcdG1heFxuXHRcdFx0fcKgPSA8TGVhdmVzLk9jY3VyZW5jZXM+bGVhZjtcblx0XHRcdFxuXHRcdFx0aWYgKCFtYXgpIG1heCA9IG1pbjtcblxuXHRcdFx0Y29uc3QgdmFsdWVNYXA6IFJlY29yZDxzdHJpbmcsIEN1cnNvcltdPiA9IHt9O1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5jdXJzb3JzKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB2YWwgPSBKU09OLnN0cmluZ2lmeShpdGVtW3ZhbHVlXSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoIXZhbHVlTWFwLmhhc093blByb3BlcnR5KHZhbCkpXG5cdFx0XHRcdFx0dmFsdWVNYXBbdmFsXSA9IFtdO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHR2YWx1ZU1hcFt2YWxdLnB1c2goaXRlbSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQoT2JqZWN0LnZhbHVlcyh2YWx1ZU1hcCkuZmlsdGVyKHggPT4geC5sZW5ndGggPj0gbWluICYmIHgubGVuZ3RoIDw9IG1heCkuZmxhdCgpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aXMoc3Vycm9nYXRlOiBTdXJyb2dhdGUsIG5vdCA9IGZhbHNlKVxuXHRcdHtcblx0XHRcdGNvbnN0IGluc3RhbmNlID0gdGhpcy5jbG9uZSgpO1xuXHRcdFx0cmV0dXJuIGluc3RhbmNlLmZpbHRlclN1cnJvZ2F0ZSh4ID0+IFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgY29uZGl0aW9uID0geFt0eXBlT2ZdLmlzKHN1cnJvZ2F0ZVt0eXBlT2ZdKSB8fCB4W3R5cGVPZl0ucGFyYWxsZWxSb290cy5pbmNsdWRlcyhzdXJyb2dhdGVbdHlwZU9mXSk7XG5cdFx0XHRcdFx0cmV0dXJuIG5vdCA/ICFjb25kaXRpb24gOiBjb25kaXRpb247XG5cdFx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRzb3J0KGxlYWY6IExlYWYpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RydWN0cyA9ICg8U3RydWN0W10+KDxMZWF2ZXMuU29ydD5sZWFmKS5jb250ZW50VHlwZXMpLmZpbHRlcigoeCkgPT4gISF4KS5yZXZlcnNlKCk7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHNuYXAgPSB0aGlzLnNuYXBzaG90KCk7XG5cdFx0XHRmb3IgKGNvbnN0IHN0cnVjdCBvZiBzdHJ1Y3RzKVxuXHRcdFx0XHRzbmFwLnNvcnQoKGEsIGIpID0+IFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKGEgaW5zdGFuY2VvZiBOYW1lKSBcblx0XHRcdFx0XHRcdGlmIChiIGluc3RhbmNlb2YgTmFtZSlcblx0XHRcdFx0XHRcdFx0cmV0dXJuIDA7XG5cdFx0XHRcdFx0XHRlbHNlIHJldHVybiAtMTtcblx0XHRcdFx0XHRlbHNlIGlmIChiIGluc3RhbmNlb2YgTmFtZSlcblx0XHRcdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvbnN0IHAxID0gYS5nZXQoc3RydWN0KTtcblx0XHRcdFx0XHRjb25zdCBwMiA9IGIuZ2V0KHN0cnVjdCk7XG5cdFx0XHRcdFx0Y29uc3QgdjE6IG51bWJlciA9IHAxID8gPGFueT5wMVt2YWx1ZV0gfHwgMDogMDtcblx0XHRcdFx0XHRjb25zdCB2MjogbnVtYmVyID0gcDIgPyA8YW55PnAyW3ZhbHVlXSB8fCAwOiAwO1xuXHRcdFx0XHRcdHJldHVybiB2MSAtIHYyO1xuXHRcdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldChzbmFwKTtcblx0XHR9XG5cdFx0XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXJcbntcblx0XG5cdGV4cG9ydCB0eXBlIFR5cGVpc2ggPSBUcnV0aC5UeXBlIHzCoFR5cGUgfCBudW1iZXI7XG5cdFxuXHRleHBvcnQgY2xhc3MgRnV0dXJlVHlwZVxuXHR7XG5cdFx0c3RhdGljIENhY2hlID0gbmV3IE1hcDxUeXBlaXNoLCBGdXR1cmVUeXBlPigpO1xuXHRcdHN0YXRpYyBUeXBlTWFwID0gbmV3IE1hcDxUcnV0aC5UeXBlLCBUeXBlPigpO1xuXHRcdHN0YXRpYyBJZE1hcCA9IG5ldyBNYXA8bnVtYmVyLCBUeXBlPigpO1xuXHRcdFxuXHRcdHN0YXRpYyBuZXcodmFsdWU6IFR5cGVpc2gpXG5cdFx0e1xuXHRcdFx0Y29uc3QgY2FjaGVkID0gRnV0dXJlVHlwZS5DYWNoZS5nZXQodmFsdWUpO1xuXHRcdFx0XG5cdFx0XHRpZiAoY2FjaGVkKVxuXHRcdFx0XHRyZXR1cm4gY2FjaGVkO1xuXHRcdFx0XHRcblx0XHRcdGNvbnN0IGluc3RhbmNlID0gbmV3IEZ1dHVyZVR5cGUodmFsdWUpO1xuXHRcdFx0RnV0dXJlVHlwZS5DYWNoZS5zZXQodmFsdWUsIGluc3RhbmNlKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGluc3RhbmNlO1xuXHRcdH0gXG5cdFx0XG5cdFx0Y29uc3RydWN0b3IocHJpdmF0ZSB2YWx1ZTogVHlwZWlzaCkgeyB9XG5cdFx0IFxuXHRcdGdldCB0eXBlKClcblx0XHR7XG5cdFx0XHRpZiAodGhpcy52YWx1ZSBpbnN0YW5jZW9mIFRydXRoLlR5cGUpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHR5cGUgPSBGdXR1cmVUeXBlLlR5cGVNYXAuZ2V0KHRoaXMudmFsdWUpO1xuXHRcdFx0XHRpZiAoIXR5cGUpIFxuXHRcdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0XHRyZXR1cm4gdHlwZTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMudmFsdWUgaW5zdGFuY2VvZiBUeXBlKVxuXHRcdFx0XHRyZXR1cm4gdGhpcy52YWx1ZTtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gRnV0dXJlVHlwZS5JZE1hcC5nZXQodGhpcy52YWx1ZSkgfHwgbnVsbDtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGlkKClcblx0XHR7XG5cdFx0XHRpZiAodGhpcy52YWx1ZSBpbnN0YW5jZW9mIFRydXRoLlR5cGUpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHR5cGUgPSBGdXR1cmVUeXBlLlR5cGVNYXAuZ2V0KHRoaXMudmFsdWUpO1xuXHRcdFx0XHRpZiAoIXR5cGUpIFxuXHRcdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdFx0cmV0dXJuIHR5cGUuaWQ7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGlmICh0aGlzLnZhbHVlIGluc3RhbmNlb2YgVHlwZSlcblx0XHRcdFx0cmV0dXJuIHRoaXMudmFsdWUuaWQ7XG5cdFx0XHRcdFxuXHRcdFx0cmV0dXJuIHRoaXMudmFsdWU7XG5cdFx0fVxuXHRcdFxuXHRcdGlzKHR5cGU6IFR5cGUpXG5cdFx0e1xuXHRcdFx0Y29uc3QgdmFsdWVUeXBlID0gdGhpcy52YWx1ZTtcblx0XHRcdGlmICghdmFsdWVUeXBlKSByZXR1cm4gZmFsc2U7XG5cdFx0XHRyZXR1cm4gdmFsdWVUeXBlID09PSB0eXBlO1x0XG5cdFx0fVxuXHRcdFxuXHRcdHRvSlNPTigpIHsgcmV0dXJuIHRoaXMuaWQ7IH1cblx0XHR2YWx1ZU9mKCkgeyByZXR1cm4gdGhpcy5pZDsgfVxuXHRcdFtTeW1ib2wudG9QcmltaXRpdmVdKCkgeyByZXR1cm4gdGhpcy5pZDsgfVxuXHRcdGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpIHsgcmV0dXJuIFwiRnV0dXJlVHlwZVwiOyB9XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXIuVHJ1dGhUYWxrXG57XG5cdGV4cG9ydCBjb25zdCBvcCA9IFN5bWJvbChcIm9wXCIpO1xuXHRleHBvcnQgY29uc3QgY29udGFpbmVyID0gU3ltYm9sKFwiY29udGFpbmVyXCIpO1xuXHRcblx0LyoqICovXG5cdGV4cG9ydCBlbnVtIEJyYW5jaE9wXG5cdHtcblx0XHRxdWVyeSA9IDEsXG5cdFx0aXMgPSAyLFxuXHRcdGhhcyA9IDMsXG5cdFx0bm90ID0gNCxcblx0XHRvciA9IDUsXG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgZW51bSBQcmVkaWNhdGVPcFxuXHR7XG5cdFx0ZXF1YWxzID0gMzAsXG5cdFx0Z3JlYXRlclRoYW4gPSAzMSxcblx0XHRncmVhdGVyVGhhbk9yRXF1YWxzID0gMzIsXG5cdFx0bGVzc1RoYW4gPSAzMyxcblx0XHRsZXNzVGhhbk9yRXF1YWxzID0gMzQsXG5cdFx0YWxpa2UgPSAzNSxcblx0XHRzdGFydHNXaXRoID0gMzYsXG5cdFx0ZW5kc1dpdGggID0gMzcsXG5cdFx0aW5jbHVkZXMgPSAzOCxcblx0XHRtYXRjaGVzID0gMzksXG5cdFx0bmFtZWQgPSA0MFxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGVudW0gTGVhZk9wXG5cdHtcblx0XHRwcmVkaWNhdGUgPSA2MCxcblx0XHRzbGljZSA9IDYxLFxuXHRcdG9jY3VyZW5jZXMgPSA2Mixcblx0XHRhbGlhc2VkID0gNjMsXG5cdFx0dGVybWluYWxzID0gNjQsXG5cdFx0c29ydCA9IDY1LFxuXHRcdHJldmVyc2UgPSA2Nixcblx0XHRzdXJyb2dhdGUgPSA2Nyxcblx0XHRjb250YWluZXJzID0gNjgsXG5cdFx0cm9vdHMgPSA2OSxcblx0XHRjb250ZW50cyA9IDcwLFxuXHRcdGxlYXZlcyA9IDcxLFxuXHRcdGZyZXNoID0gNzIsXG5cdFx0bmFtZXMgPSA3Myxcblx0XHRzdW0gPSA3NCxcblx0XHRhdmcgPSA3NSxcblx0XHRtaW4gPSA3Nixcblx0XHRtYXggPSA3Nyxcblx0XHRjb3VudCA9IDc4XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgdHlwZSBOb2RlT3AgPVxuXHRcdEJyYW5jaE9wIHwgXG5cdFx0TGVhZk9wIHxcblx0XHRQcmVkaWNhdGVPcDtcblx0XG5cdC8vIyBBYnN0cmFjdCBDbGFzc2VzXG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGFic3RyYWN0IGNsYXNzIE5vZGVcblx0e1xuXHRcdGFic3RyYWN0IHJlYWRvbmx5IFtvcF06IE5vZGVPcDtcblx0XHRcblx0XHRyZWFkb25seSBbY29udGFpbmVyXTogQnJhbmNoIHwgbnVsbCA9IG51bGw7XG5cdFx0XG5cdFx0c2V0Q29udGFpbmVyKGNvbnQ6IEJyYW5jaCB8wqBudWxsKVxuXHRcdHtcblx0XHRcdC8vQHRzLWlnbm9yZVxuXHRcdFx0dGhpc1tjb250YWluZXJdID0gbnVsbDtcblx0XHR9XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgYWJzdHJhY3QgY2xhc3MgQnJhbmNoIGV4dGVuZHMgTm9kZVxuXHR7XG5cdFx0LyoqICovXG5cdFx0YWRkQ2hpbGQoY2hpbGQ6IE5vZGUsIHBvc2l0aW9uID0gLTEpXG5cdFx0e1xuXHRcdFx0Y2hpbGQuc2V0Q29udGFpbmVyKHRoaXMpO1xuXHRcdFx0XG5cdFx0XHRpZiAocG9zaXRpb24gPT09IC0xKVxuXHRcdFx0XHRyZXR1cm4gdm9pZCB0aGlzLl9jaGlsZHJlbi5wdXNoKGNoaWxkKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgYXQgPSB0aGlzLl9jaGlsZHJlbi5sZW5ndGggLSBwb3NpdGlvbiArIDE7XG5cdFx0XHR0aGlzLl9jaGlsZHJlbi5zcGxpY2UoYXQsIDAsIGNoaWxkKTtcblx0XHRcdHJldHVybiBjaGlsZDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVtb3ZlQ2hpbGQoY2hpbGQ6IE5vZGUpOiBOb2RlIHwgbnVsbDtcblx0XHRyZW1vdmVDaGlsZChjaGlsZElkeDogbnVtYmVyKSA6IE5vZGV8IG51bGw7XG5cdFx0cmVtb3ZlQ2hpbGQocGFyYW06IE5vZGUgfCBudW1iZXIpXG5cdFx0e1xuXHRcdFx0Y29uc3QgY2hpbGRJZHggPSBwYXJhbSBpbnN0YW5jZW9mIE5vZGUgP1xuXHRcdFx0XHR0aGlzLl9jaGlsZHJlbi5pbmRleE9mKHBhcmFtKSA6XG5cdFx0XHRcdHBhcmFtO1xuXHRcdFx0XG5cdFx0XHRpZiAoY2hpbGRJZHggPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCByZW1vdmVkID0gdGhpcy5fY2hpbGRyZW4uc3BsaWNlKGNoaWxkSWR4LCAxKVswXTtcblx0XHRcdFx0cmVtb3ZlZC5zZXRDb250YWluZXIobnVsbCk7XG5cdFx0XHRcdHJldHVybiByZW1vdmVkO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IGNoaWxkcmVuKCk6IHJlYWRvbmx5IChCcmFuY2ggfCBMZWFmKVtdXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NoaWxkcmVuO1xuXHRcdH1cblx0XHRwcml2YXRlIHJlYWRvbmx5IF9jaGlsZHJlbjogKEJyYW5jaCB8IExlYWYpW10gPSBbXTtcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBMZWFmIGV4dGVuZHMgTm9kZSB7IH1cblx0XG5cdC8vIyBDb25jcmV0ZSBDbGFzc2VzXG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IG5hbWVzcGFjZSBCcmFuY2hlc1xuXHR7XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFF1ZXJ5IGV4dGVuZHMgQnJhbmNoXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IEJyYW5jaE9wLnF1ZXJ5O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgSXMgZXh0ZW5kcyBCcmFuY2hcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gQnJhbmNoT3AuaXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBIYXMgZXh0ZW5kcyBCcmFuY2hcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gQnJhbmNoT3AuaGFzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgTm90IGV4dGVuZHMgQnJhbmNoXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IEJyYW5jaE9wLm5vdDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIE9yIGV4dGVuZHMgQnJhbmNoXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IEJyYW5jaE9wLm9yO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBuYW1lc3BhY2UgTGVhdmVzXG5cdHtcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgUHJlZGljYXRlIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF06IFByZWRpY2F0ZU9wO1xuXHRcdFx0XG5cdFx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdFx0b3B2OiBQcmVkaWNhdGVPcCxcblx0XHRcdFx0cmVhZG9ubHkgb3BlcmFuZDogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbilcblx0XHRcdHtcblx0XHRcdFx0c3VwZXIoKTtcblx0XHRcdFx0Ly9AdHMtaWdub3JlXG5cdFx0XHRcdHRoaXNbb3BdID0gb3B2O1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgU2xpY2UgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRcdHJlYWRvbmx5IHN0YXJ0OiBudW1iZXIsIFxuXHRcdFx0XHRyZWFkb25seSBlbmQ/OiBudW1iZXIpXG5cdFx0XHR7XG5cdFx0XHRcdHN1cGVyKCk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3Auc2xpY2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBPY2N1cmVuY2VzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0XHRyZWFkb25seSBtaW46IG51bWJlcixcblx0XHRcdFx0cmVhZG9ubHkgbWF4OiBudW1iZXIgPSBtaW4pXG5cdFx0XHR7XG5cdFx0XHRcdHN1cGVyKCk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3Aub2NjdXJlbmNlcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIEFsaWFzZWQgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5hbGlhc2VkO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgTGVhdmVzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AubGVhdmVzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgRnJlc2ggZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5mcmVzaDtcblx0XHR9XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFRlcm1pbmFscyBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLnRlcm1pbmFscztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFNvcnQgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0XG5cdFx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdFx0Li4uY29udGVudFR5cGVzOiBPYmplY3RbXSlcblx0XHRcdHtcblx0XHRcdFx0c3VwZXIoKTtcblx0XHRcdFx0dGhpcy5jb250ZW50VHlwZXMgPSBjb250ZW50VHlwZXM7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJlYWRvbmx5IGNvbnRlbnRUeXBlczogT2JqZWN0W107XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLnNvcnQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBSZXZlcnNlIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AucmV2ZXJzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFN1cnJvZ2F0ZSBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLnN1cnJvZ2F0ZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIENvbnRhaW5lcnMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5jb250YWluZXJzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgUm9vdHMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5yb290cztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIENvbnRlbnRzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AuY29udGVudHM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBOYW1lcyBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLm5hbWVzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgU3VtIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3Auc3VtO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgQXZnIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AuYXZnO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgTWluIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AubWluO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgTWF4IGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AubWF4O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgQ291bnQgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5jb3VudDtcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIEJhY2tlclxue1xuXHRleHBvcnQgdHlwZSBQcm90b3R5cGVKU09OID0gW251bWJlciwgbnVtYmVyLCAuLi5udW1iZXJbXVtdXTtcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBQcm90b3R5cGUgXG5cdHtcblx0XHQvKipcblx0XHQgKiBHZW5lcmF0ZSBhIFByb3RvdHlwZSBmcm9tIFRydXRoLlR5cGVcblx0XHQgKi9cblx0XHRzdGF0aWMgbmV3KGNvZGU6IENvZGUsIHR5cGU6IFRydXRoLlR5cGUpXG5cdFx0e1xuXHRcdFx0Y29uc3QgZmxhZ3MgPSBuZXcgQml0ZmllbGRzKCk7XG5cdFx0XHRcblx0XHRcdGZsYWdzLnNldCgwLCB0eXBlLmlzQW5vbnltb3VzKTtcblx0XHRcdGZsYWdzLnNldCgxLCB0eXBlLmlzRnJlc2gpO1xuXHRcdFx0ZmxhZ3Muc2V0KDIsIHR5cGUuaXNMaXN0KTtcblx0XHRcdGZsYWdzLnNldCgzLCB0eXBlLmlzTGlzdEludHJpbnNpYyk7XG5cdFx0XHRmbGFncy5zZXQoNCwgdHlwZS5pc0xpc3RFeHRyaW5zaWMpO1xuXHRcdFx0ZmxhZ3Muc2V0KDUsIHR5cGUuaXNQYXR0ZXJuKTtcblx0XHRcdGZsYWdzLnNldCg2LCB0eXBlLmlzVXJpKTtcblx0XHRcdGZsYWdzLnNldCg3LCB0eXBlLmlzU3BlY2lmaWVkKTtcblx0XHRcdFxuXHRcdFx0bGV0IHByb3RvID0gbmV3IFByb3RvdHlwZShcblx0XHRcdFx0Y29kZSwgXG5cdFx0XHRcdGZsYWdzLFxuXHRcdFx0XHRuZXcgVHlwZVNldCh0eXBlLmJhc2VzLm1hcChGdXR1cmVUeXBlLm5ldykpLFxuXHRcdFx0XHRuZXcgVHlwZVNldCh0eXBlLnBhdHRlcm5zLm1hcChGdXR1cmVUeXBlLm5ldykpLFxuXHRcdFx0XHRuZXcgVHlwZVNldCh0eXBlLnBhcmFsbGVscy5tYXAoRnV0dXJlVHlwZS5uZXcpKSxcblx0XHRcdFx0bmV3IFR5cGVTZXQodHlwZS5jb250ZW50c0ludHJpbnNpYy5tYXAoRnV0dXJlVHlwZS5uZXcpKVxuXHRcdFx0KTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgZXggPSBjb2RlLnByb3RvdHlwZXMuZmluZCh4ID0+IHguaGFzaCA9PT0gcHJvdG8uaGFzaCk7XG5cdFx0XHRcblx0XHRcdGlmIChleCkgXG5cdFx0XHRcdHByb3RvID0gZXg7XG5cdFx0XHRcdFxuXHRcdFx0cmV0dXJuIHByb3RvO1xuXHRcdH1cblx0XG5cdFx0LyoqXG5cdFx0ICogTG9hZCBQcm90b3R5cGUgZnJvbSBDb2RlSlNPTlxuXHRcdCAqL1xuXHRcdHN0YXRpYyBsb2FkKGNvZGU6IENvZGUsIHNlcmlhbGl6ZWQ6IFByb3RvdHlwZUpTT04pXG5cdFx0e1xuXHRcdFx0Y29uc3QgZGF0YSA9IFV0aWwuZGVjb2RlKHNlcmlhbGl6ZWQsIDUpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gbmV3IFByb3RvdHlwZShcblx0XHRcdFx0Y29kZSwgXG5cdFx0XHRcdG5ldyBCaXRmaWVsZHMoZGF0YVswXSksXG5cdFx0XHRcdFR5cGVTZXQuZnJvbUpTT04oZGF0YVsxXSksXG5cdFx0XHRcdFR5cGVTZXQuZnJvbUpTT04oZGF0YVsyXSksXG5cdFx0XHRcdFR5cGVTZXQuZnJvbUpTT04oZGF0YVszXSksXG5cdFx0XHRcdFR5cGVTZXQuZnJvbUpTT04oZGF0YVs0XSlcblx0XHRcdCk7XG5cdFx0fVxuXHRcdFxuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cHJpdmF0ZSBjb2RlOiBDb2RlLFxuXHRcdFx0cHVibGljIGZsYWdzOiBCaXRmaWVsZHMsXG5cdFx0XHRcblx0XHRcdHB1YmxpYyBiYXNlcyA9IG5ldyBUeXBlU2V0KCksXG5cdFx0XHRwdWJsaWMgcGF0dGVybnMgPSBuZXcgVHlwZVNldCgpLFxuXHRcdFx0cHVibGljIHBhcmFsbGVscyA9IG5ldyBUeXBlU2V0KCksXG5cdFx0XHRwdWJsaWMgY29udGVudHNJbnRyaW5zaWMgPSBuZXcgVHlwZVNldCgpKSB7fVxuXHRcdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IGlkKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5jb2RlLnByb3RvdHlwZXMuaW5kZXhPZih0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IGhhc2goKVxuXHRcdHtcblx0XHRcdHJldHVybiBVdGlsLmhhc2goSlNPTi5zdHJpbmdpZnkodGhpcykpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBUcmFuc2ZlciBvd25lcnNoaXAgb2YgdGhpcyBpbnN0YW5jZSB0byBhbm90aGVyIENvZGUgaW5zdGFuY2Vcblx0XHQgKi9cblx0XHR0cmFuc2Zlcihjb2RlOiBDb2RlKVxuXHRcdHtcblx0XHRcdHRoaXMuY29kZSA9IGNvZGU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHRvSlNPTigpXG5cdFx0e1x0XG5cdFx0XHRyZXR1cm4gVXRpbC5lbmNvZGUoW1xuXHRcdFx0XHR0aGlzLmZsYWdzLCB0aGlzLmJhc2VzLCB0aGlzLnBhdHRlcm5zLCB0aGlzLnBhcmFsbGVscywgdGhpcy5jb250ZW50c0ludHJpbnNpY1xuXHRcdFx0XSk7XG5cdFx0fVx0XHRcblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlci5UcnV0aFRhbGtcbntcblx0ZXhwb3J0IGNsYXNzIExpYnJhcnkgaW1wbGVtZW50cyBSZWZsZXguQ29yZS5JTGlicmFyeVxuXHR7XG5cdFx0LyoqICovXG5cdFx0aXNLbm93bkxlYWYobGVhZjogYW55KVxuXHRcdHtcblx0XHRcdHJldHVybiBsZWFmIGluc3RhbmNlb2YgTm9kZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aXNLbm93bkJyYW5jaChicmFuY2g6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRyZXR1cm4gYnJhbmNoIGluc3RhbmNlb2YgTm9kZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aXNCcmFuY2hEaXNwb3NlZChicmFuY2g6IFJlZmxleC5Db3JlLklCcmFuY2gpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGJyYW5jaCBpbnN0YW5jZW9mIEJyYW5jaCAmJiBicmFuY2hbY29udGFpbmVyXSAhPT0gbnVsbDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0U3RhdGljQnJhbmNoZXMoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGJyYW5jaGVzOiBhbnkgPSB7fTtcblx0XHRcdFxuXHRcdFx0T2JqZWN0LmVudHJpZXMoQnJhbmNoZXMpLmZvckVhY2goKFticmFuY2hOYW1lLCBicmFuY2hDdG9yXSkgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgbmFtZSA9IGJyYW5jaE5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0YnJhbmNoZXNbbmFtZV0gPSAoKSA9PiBuZXcgYnJhbmNoQ3RvcigpO1xuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBicmFuY2hlcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0U3RhdGljTm9uQnJhbmNoZXMoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGxlYXZlczogYW55ID0ge307XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKExlYXZlcykpXG5cdFx0XHRcdGxlYXZlc1trZXkudG9Mb3dlckNhc2UoKV0gPSAoYXJnMTogUHJlZGljYXRlT3AsIGFyZzI6IG51bWJlcikgPT4gbmV3IHZhbHVlKGFyZzEsIGFyZzIpO1xuXHRcdFx0XHRcblx0XHRcdGZvciAoY29uc3Qga2V5IGluIFByZWRpY2F0ZU9wKVxuXHRcdFx0XHRpZiAoaXNOYU4ocGFyc2VJbnQoa2V5KSkpXG5cdFx0XHRcdFx0bGVhdmVzW2tleV0gPSAodmFsdWU6IGFueSkgPT4gbmV3IExlYXZlcy5QcmVkaWNhdGUoKDxhbnk+UHJlZGljYXRlT3ApW2tleV0sIHZhbHVlKTtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gbGVhdmVzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXRDaGlsZHJlbih0YXJnZXQ6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGFyZ2V0LmNoaWxkcmVuO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRjcmVhdGVDb250YWluZXIoKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgQnJhbmNoZXMuUXVlcnkoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXR0YWNoQXRvbWljKFxuXHRcdFx0YXRvbWljOiBOb2RlLFxuXHRcdFx0b3duZXI6IEJyYW5jaCxcblx0XHRcdHJlZjogTm9kZSB8IFwicHJlcGVuZFwiIHwgXCJhcHBlbmRcIilcblx0XHR7XG5cdFx0XHRpZiAoIShhdG9taWMgaW5zdGFuY2VvZiBOb2RlKSlcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBwb3MgPVxuXHRcdFx0XHRyZWYgPT09IFwiYXBwZW5kXCIgPyAtMSA6XG5cdFx0XHRcdHJlZiA9PT0gXCJwcmVwZW5kXCIgPyAwIDpcblx0XHRcdFx0Ly8gUGxhY2VzIHRoZSBpdGVtIGF0IHRoZSBlbmQsIGluIHRoZSBjYXNlIHdoZW4gXG5cdFx0XHRcdC8vIHJlZiB3YXNuJ3QgZm91bmQgaW4gdGhlIG93bmVyLiApVGhpcyBzaG91bGRcblx0XHRcdFx0Ly8gbmV2ZXIgYWN0dWFsbHkgaGFwcGVuLilcblx0XHRcdFx0b3duZXIuY2hpbGRyZW4uaW5kZXhPZihyZWYpICsgMSB8fCAtMTtcblx0XHRcdFxuXHRcdFx0b3duZXIuYWRkQ2hpbGQoYXRvbWljLCBwb3MpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRkZXRhY2hBdG9taWMoYXRvbWljOiBOb2RlLCBvd25lcjogQnJhbmNoKVxuXHRcdHtcblx0XHRcdG93bmVyLnJlbW92ZUNoaWxkKGF0b21pYyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHN3YXBCcmFuY2hlcyhicmFuY2gxOiBCcmFuY2gsIGJyYW5jaDI6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRpZiAoYnJhbmNoMVtUcnV0aFRhbGsuY29udGFpbmVyXSA9PT0gbnVsbCB8fCBicmFuY2gyW1RydXRoVGFsay5jb250YWluZXJdID09PSBudWxsKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3Qgc3dhcCB0b3AtbGV2ZWwgYnJhbmNoZXMuXCIpO1xuXHRcdFx0XG5cdFx0XHRpZiAoYnJhbmNoMVtUcnV0aFRhbGsuY29udGFpbmVyXSAhPT0gYnJhbmNoMltUcnV0aFRhbGsuY29udGFpbmVyXSlcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgc3dhcCBicmFuY2hlcyBmcm9tIHRoZSBzYW1lIGNvbnRhaW5lci5cIik7XG5cdFx0XHRcblx0XHRcdGNvbnN0IGNvbnRhaW5lciA9IGJyYW5jaDFbVHJ1dGhUYWxrLmNvbnRhaW5lcl0hO1xuXHRcdFx0Y29uc3QgaWR4MSA9IGNvbnRhaW5lci5jaGlsZHJlbi5pbmRleE9mKGJyYW5jaDEpO1xuXHRcdFx0Y29uc3QgaWR4MiA9IGNvbnRhaW5lci5jaGlsZHJlbi5pbmRleE9mKGJyYW5jaDIpO1xuXHRcdFx0Y29uc3QgaWR4TWF4ID0gTWF0aC5tYXgoaWR4MSwgaWR4Mik7XG5cdFx0XHRjb25zdCBpZHhNaW4gPSBNYXRoLm1pbihpZHgxLCBpZHgyKTtcblx0XHRcdGNvbnN0IHJlbW92ZWRNYXggPSBjb250YWluZXIucmVtb3ZlQ2hpbGQoaWR4TWF4KTtcblx0XHRcdGNvbnN0IHJlbW92ZWRNaW4gPSBjb250YWluZXIucmVtb3ZlQ2hpbGQoaWR4TWluKTtcblx0XHRcdFxuXHRcdFx0aWYgKCFyZW1vdmVkTWF4IHx8ICFyZW1vdmVkTWluKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnRlcm5hbCBFcnJvci5cIik7XG5cdFx0XHRcblx0XHRcdGNvbnRhaW5lci5hZGRDaGlsZChyZW1vdmVkTWF4LCBpZHhNaW4pO1xuXHRcdFx0Y29udGFpbmVyLmFkZENoaWxkKHJlbW92ZWRNaW4sIGlkeE1heCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlcGxhY2VCcmFuY2goYnJhbmNoMTogQnJhbmNoLCBicmFuY2gyOiBCcmFuY2gpXG5cdFx0e1xuXHRcdFx0aWYgKGJyYW5jaDFbVHJ1dGhUYWxrLmNvbnRhaW5lcl0gPT09IG51bGwpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZXBsYWNlIHRvcC1sZXZlbCBicmFuY2hlcy5cIik7XG5cdFx0XHRcblx0XHRcdGNvbnN0IGNvbnRhaW5lciA9IGJyYW5jaDFbVHJ1dGhUYWxrLmNvbnRhaW5lcl0hO1xuXHRcdFx0Y29uc3QgaWR4ID0gY29udGFpbmVyLmNoaWxkcmVuLmluZGV4T2YoYnJhbmNoMSk7XG5cdFx0XHRjb250YWluZXIucmVtb3ZlQ2hpbGQoaWR4KTtcblx0XHRcdGNvbnRhaW5lci5hZGRDaGlsZChicmFuY2gyLCBpZHgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhdHRhY2hBdHRyaWJ1dGUoYnJhbmNoOiBCcmFuY2gsIGtleTogc3RyaW5nLCB2YWx1ZTogYW55KVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBzdXBwb3J0ZWQuXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRkZXRhY2hBdHRyaWJ1dGUoYnJhbmNoOiBCcmFuY2gsIGtleTogc3RyaW5nKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBzdXBwb3J0ZWQuXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhdHRhY2hSZWN1cnJlbnQoXG5cdFx0XHRraW5kOiBSZWZsZXguQ29yZS5SZWN1cnJlbnRLaW5kLFxuXHRcdFx0dGFyZ2V0OiBSZWZsZXguQ29yZS5JQnJhbmNoLFxuXHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdGNhbGxiYWNrOiBSZWZsZXguQ29yZS5SZWN1cnJlbnRDYWxsYmFjayxcblx0XHRcdHJlc3Q6IGFueVtdKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBzdXBwb3J0ZWQuXCIpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRkZXRhY2hSZWN1cnJlbnQoXG5cdFx0XHR0YXJnZXQ6IFJlZmxleC5Db3JlLklCcmFuY2gsXG5cdFx0XHRzZWxlY3RvcjogYW55LFxuXHRcdFx0Y2FsbGJhY2s6IFJlZmxleC5Db3JlLlJlY3VycmVudENhbGxiYWNrKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBzdXBwb3J0ZWQuXCIpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufVxuXG4vKipcbiAqIEdsb2JhbCBsaWJyYXJ5IG9iamVjdC5cbiAqL1xuXHQvL0B0cy1pZ25vcmVcbmNvbnN0IHR0ID0gUmVmbGV4LkNvcmUuY3JlYXRlQ29udGFpbmVyTmFtZXNwYWNlPEJhY2tlci5UcnV0aFRhbGsuTmFtZXNwYWNlLCBCYWNrZXIuVHJ1dGhUYWxrLkxpYnJhcnk+KFxuXHRuZXcgQmFja2VyLlRydXRoVGFsay5MaWJyYXJ5KCksXG5cdHRydWUpO1xuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk5vZGVzLnRzXCIvPlxuXG5uYW1lc3BhY2UgQmFja2VyXG57XG5cdGV4cG9ydCBjb25zdCB0eXBlT2YgPSBTeW1ib2woXCJ0eXBlT2ZcIik7XG5cdGV4cG9ydCBjb25zdCB2YWx1ZSA9IFN5bWJvbChcInZhbHVlXCIpO1xuXHRleHBvcnQgY29uc3QgbmFtZSA9IFN5bWJvbChcIm5hbWVcIik7XG5cdGV4cG9ydCBjb25zdCB2YWx1ZXMgPSBTeW1ib2woXCJ2YWx1ZXNcIik7XG5cdGV4cG9ydCBjb25zdCBwYXJlbnQgPSBTeW1ib2woXCJwYXJlbnRcIik7XG5cdFxuXHRhYnN0cmFjdCBjbGFzcyBCYXNlIGV4dGVuZHMgVHJ1dGhUYWxrLkxlYXZlcy5TdXJyb2dhdGVcblx0e1xuXHRcdGFic3RyYWN0IFt2YWx1ZV06IGFueTtcblx0XHRcblx0XHRbcGFyZW50XTogU3RydWN0IHzCoG51bGw7XG5cdFx0XG5cdFx0Y29uc3RydWN0b3IocGFyZW50VmFsdWU6IFN0cnVjdCB8IFN1cnJvZ2F0ZSB8IG51bGwpXG5cdFx0e1xuXHRcdFx0c3VwZXIoKTtcblx0XHRcdHRoaXNbcGFyZW50XSA9IHBhcmVudFZhbHVlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDbGltYiB0byByb290IG9mIHRoaXMgU3RydWN0XG5cdFx0ICovXG5cdFx0Z2V0IHJvb3QoKTogQmFzZSB8wqBudWxsXG5cdFx0e1xuXHRcdFx0bGV0IHJvb3Q6IEJhc2UgfMKgbnVsbCA9IHRoaXM7XG5cdFx0XHRcblx0XHRcdHdoaWxlIChyb290ICYmIHJvb3RbcGFyZW50XSkgXG5cdFx0XHRcdHJvb3QgPSByb290W3BhcmVudF07XG5cdFx0XHRcblx0XHRcdHJldHVybiByb290O1xuXHRcdH1cblx0XHRcblx0XHR0b0pTT04oKXsgcmV0dXJuIHRoaXNbdmFsdWVdOyB9XG5cdFx0dmFsdWVPZigpIHsgcmV0dXJuIHRoaXNbdmFsdWVdOyB9XG5cdFx0dG9TdHJpbmcoKSBcblx0XHR7XG5cdFx0XHRjb25zdCB2YWwgPSB0aGlzW3ZhbHVlXTtcblx0XHRcdGlmICh2YWwgPT09IG51bGwpXG5cdFx0XHRcdHJldHVybiB2YWw7XG5cdFx0XHRcblx0XHRcdHJldHVybiBTdHJpbmcodmFsKTtcblx0XHR9XG5cdFx0W1N5bWJvbC50b1ByaW1pdGl2ZV0oKSB7IHJldHVybiB0aGlzW3ZhbHVlXTsgfVxuXHRcdGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpIHsgcmV0dXJuIFwiUHJveHlcIjsgfVxuXHR9XG5cdFxuXHRleHBvcnQgY2xhc3MgTmFtZSBleHRlbmRzIEJhc2Vcblx0e1xuXHRcdGNvbnN0cnVjdG9yKHB1YmxpYyBuYW1lOiBzdHJpbmcsIGNvbnRhaW5lcjogU3RydWN0IHzCoG51bGwpXG5cdFx0e1xuXHRcdFx0c3VwZXIoY29udGFpbmVyKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IFt2YWx1ZV0oKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLm5hbWU7XG5cdFx0fVxuXHR9XG5cdFxuXHRleHBvcnQgY2xhc3MgU3RydWN0IGV4dGVuZHMgQmFzZVxuXHR7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogR2VuZXJhdGUgYSBTdHJ1Y3QvU3Vycm9nYXRlIGZyb20gQmFja2VyLlR5cGVcblx0XHQgKi9cblx0XHRzdGF0aWMgbmV3KHR5cGU6IFR5cGUsIHBhcmVudFZhbHVlOiBTdHJ1Y3QgfMKgU3Vycm9nYXRlIHwgbnVsbClcblx0XHR7XG5cdFx0XHRjb25zdCBjb25zdHIgPSBwYXJlbnRWYWx1ZSA/IFxuXHRcdFx0XHRwYXJlbnRWYWx1ZSBpbnN0YW5jZW9mIFN1cnJvZ2F0ZSA/XG5cdFx0XHRcdFN1cnJvZ2F0ZSA6IFN0cnVjdCA6IFN0cnVjdDtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gbmV3IGNvbnN0cih0eXBlLCBwYXJlbnRWYWx1ZSk7XG5cdFx0fVxuXHRcdFxuXHRcdHJlYWRvbmx5IFt0eXBlT2ZdOiBUeXBlO1xuXHRcdHJlYWRvbmx5IFtuYW1lXTogTmFtZTtcblx0XHRyZWFkb25seSBbcGFyZW50XTogU3RydWN0IHwgbnVsbDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgW3ZhbHVlc10oKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzW3R5cGVPZl0udmFsdWVzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgW3ZhbHVlXSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXNbdHlwZU9mXS52YWx1ZTtcblx0XHR9XG5cdFx0XG5cdFx0Y29uc3RydWN0b3IodHlwZTogVHlwZSwgcGFyZW50VmFsdWU6IFN0cnVjdCB8IG51bGwpXG5cdFx0e1xuXHRcdFx0c3VwZXIocGFyZW50VmFsdWUpO1xuXHRcdFx0dGhpc1t0eXBlT2ZdID0gdHlwZTtcblx0XHRcdHRoaXNbcGFyZW50XSA9IHBhcmVudFZhbHVlO1xuXHRcdFx0dGhpc1tuYW1lXSA9IG5ldyBOYW1lKHR5cGUubmFtZSwgdGhpcyk7XG5cdFx0XHRcblx0XHRcdFV0aWwuc2hhZG93cyh0aGlzLCBmYWxzZSwgdHlwZU9mLCB2YWx1ZXMsIFRydXRoVGFsay5vcCwgcGFyZW50LCBUcnV0aFRhbGsuY29udGFpbmVyKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiB0eXBlLmNvbnRlbnRzKVxuXHRcdFx0XHQoPGFueT50aGlzKVtjaGlsZC5uYW1lLnJlcGxhY2UoL1teXFxkXFx3XS9nbSwgKCkgPT4gXCJfXCIpXSA9IFN0cnVjdC5uZXcoY2hpbGQsIHRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBUeXBlc2NyaXB0IHR5cGUgYWRqdXN0bWVudCBcblx0XHQgKi9cblx0XHRnZXQgcHJveHkoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzIGFzIHVua25vd24gYXMgU3RydWN0ICYgUmVjb3JkPHN0cmluZywgU3RydWN0Pjtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IGNvbnRlbnRzKCk6IFN0cnVjdFtdXG5cdFx0e1xuXHRcdFx0cmV0dXJuIE9iamVjdC52YWx1ZXModGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGluc3RhbmNlb2YoYmFzZTogYW55KVxuXHRcdHtcblx0XHRcdHJldHVybsKgdGhpc1t0eXBlT2ZdLmlzKGJhc2UpOyBcblx0XHR9O1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGlzKGJhc2U6IFR5cGUgfCBTdHJ1Y3QpXG5cdFx0e1xuXHRcdFx0YmFzZSA9IGJhc2UgaW5zdGFuY2VvZiBUeXBlID8gYmFzZSA6IGJhc2VbdHlwZU9mXTtcblx0XHRcdHJldHVybiB0aGlzW3R5cGVPZl0uaXMoYmFzZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdFtTeW1ib2wuaGFzSW5zdGFuY2VdKHZhbHVlOiBhbnkpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuaW5zdGFuY2VvZih2YWx1ZSk7XG5cdFx0fVxuXHR9XG5cdFxuXHRleHBvcnQgY2xhc3MgU3Vycm9nYXRlPFQgPSBzdHJpbmc+IGV4dGVuZHMgU3RydWN0XG5cdHtcblx0XHRyZWFkb25seSBbbmFtZV06IE5hbWU7XG5cdFx0cmVhZG9ubHkgW3BhcmVudF06IFN1cnJvZ2F0ZSB8IG51bGw7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IGNvbnRlbnRzKCk6IFN1cnJvZ2F0ZVtdXG5cdFx0e1xuXHRcdFx0cmV0dXJuIE9iamVjdC52YWx1ZXModGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGluc3RhbmNlb2YoYmFzZTogYW55KVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzW3ZhbHVlXSBpbnN0YW5jZW9mIGJhc2UgfHzCoHRoaXNbdHlwZU9mXS5pcyhiYXNlKTsgXG5cdFx0fTtcblx0XHRcblx0XHQvKiogXG5cdFx0ICogR2V0IG5lc3RlZCBwcm9wZXJ0eSB3aXRoIG1hdGNoaW5nIFN0cnVjdFxuXHRcdCovXG5cdFx0Z2V0KHR5cGU6IFN0cnVjdCk6IFN1cnJvZ2F0ZSB8wqBudWxsXG5cdFx0e1x0XHRcblx0XHRcdGNvbnN0IHJlY3Vyc2l2ZSA9IChvYmo6IFN1cnJvZ2F0ZSk6IFN1cnJvZ2F0ZSB8IG51bGwgPT4gXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChvYmpbdHlwZU9mXS5wYXJhbGxlbFJvb3RzLnNvbWUoeCA9PiB4ID09PSB0eXBlW3R5cGVPZl0pKVxuXHRcdFx0XHRcdHJldHVybiBvYmo7XG5cdFx0XHRcdFxuXHRcdFx0XHRmb3IgKGNvbnN0IGNoaWxkIG9mIG9iai5jb250ZW50cylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IHJlcyA9IHJlY3Vyc2l2ZShjaGlsZCk7XHRcblx0XHRcdFx0XHRpZiAocmVzKVxuXHRcdFx0XHRcdFx0cmV0dXJuIHJlcztcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gcmVjdXJzaXZlKDxhbnk+dGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHRvSlNPTigpOiBhbnkgXG5cdFx0eyBcblx0XHRcdGNvbnN0IHZhbCA9IHRoaXNbdmFsdWVdO1xuXHRcdFx0Y29uc3QgcHJpbWl0aXZlID0gdmFsID8gdGhpc1t0eXBlT2ZdLnZhbHVlcy50b1N0cmluZygpIDogdW5kZWZpbmVkO1xuXHRcdFx0XG5cdFx0XHRpZiAodGhpcy5jb250ZW50cy5sZW5ndGggPT09IDApXG5cdFx0XHRcdHJldHVybiBwcmltaXRpdmU7XG5cdFxuXHRcdFx0Y29uc3QgT2JqOiBSZWNvcmQ8c3RyaW5nLCBTdXJyb2dhdGUgfCBUPiAmIHsgJDogYW55IH0gPSA8YW55Pk9iamVjdC5hc3NpZ24oe30sIHRoaXMpO1xuXHRcdFx0XHRcdFx0XHRcblx0XHRcdHJldHVybiBPYmo7IFxuXHRcdH1cblx0XHRcblx0XHR0b1N0cmluZyhpbmRlbnQgPSAwKVxuXHRcdHtcblx0XHRcdGxldCBiYXNlID0gdGhpc1t0eXBlT2ZdLm5hbWU7XG5cdFx0XHRjb25zdCBwcmltaXRpdmUgPSB0aGlzW3ZhbHVlXSA/IHRoaXNbdHlwZU9mXS52YWx1ZXMudG9TdHJpbmcoKSA6IHVuZGVmaW5lZDtcblx0XHRcdFxuXHRcdFx0aWYgKHByaW1pdGl2ZSkgXG5cdFx0XHRcdGJhc2UgKz0gYDogJHtwcmltaXRpdmV9YDtcblx0XHRcdFx0XG5cdFx0XHRpZiAodGhpcy5jb250ZW50cy5sZW5ndGggPiAwKVxuXHRcdFx0XHRiYXNlICs9IHRoaXMuY29udGVudHMubWFwKHggPT4gXCJcXG5cIiArIHgudG9TdHJpbmcoaW5kZW50ICsgMSkpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gXCJcXHRcIi5yZXBlYXQoaW5kZW50KSArIGJhc2U7XG5cdFx0fVxuXHR9XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyXG57XG5cdGV4cG9ydCB0eXBlIFZhbHVlSlNPTiA9IFtudW1iZXIsIG51bWJlciwgc3RyaW5nXTtcblx0ZXhwb3J0IHR5cGUgRGF0YUpTT04gPSBbbnVtYmVyW10sIHN0cmluZywgLi4uVmFsdWVKU09OW11bXV07XG5cdGV4cG9ydCB0eXBlIFR5cGVKU09OID0gW251bWJlciwgbnVtYmVyIHwgbnVsbCwgc3RyaW5nLCBWYWx1ZUpTT05bXV07XG5cdFxuXHRleHBvcnQgY2xhc3MgVmFsdWVcblx0e1xuXHRcdHN0YXRpYyBsb2FkKGRhdGE6IFZhbHVlSlNPTilcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFZhbHVlKEZ1dHVyZVR5cGUubmV3KGRhdGFbMF0pLCAhIWRhdGFbMV0sIGRhdGFbMl0pO1xuXHRcdH1cblx0XHRcblx0XHRwdWJsaWMgdmFsdWU6IGFueTtcblx0XHRcblx0XHRjb25zdHJ1Y3RvcihwdWJsaWMgYmFzZTogRnV0dXJlVHlwZSB8IG51bGwsIHB1YmxpYyBhbGlhc2VkOiBib29sZWFuLCB2YWx1ZTogc3RyaW5nKSBcblx0XHR7XG5cdFx0XHR0aGlzLnZhbHVlID0gdmFsdWU7XG5cdFx0fVxuXHRcdFxuXHRcdGdldCBwcmltaXRpdmUoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnZhbHVlIHx8IHRoaXMuYmFzZU5hbWU7XG5cdFx0fVxuXHRcdFxuXHRcdGdldCBiYXNlTmFtZSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuYmFzZSA/IHRoaXMuYmFzZS50eXBlID8gdGhpcy5iYXNlLnR5cGUubmFtZSA6IFwiXCIgOiBcIlwiO1x0XG5cdFx0fVxuXHRcdFxuXHRcdHRvSlNPTigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFt0aGlzLmJhc2UgJiYgdGhpcy5iYXNlLmlkLCB0aGlzLmFsaWFzZWQgPyAxIDogMCwgdGhpcy52YWx1ZV07ICBcblx0XHR9XG5cdFx0XG5cdFx0dG9TdHJpbmcoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByaW1pdGl2ZTtcblx0XHR9XG5cdH1cblx0XG5cdGV4cG9ydCBjbGFzcyBWYWx1ZVN0b3JlXG5cdHtcdFxuXHRcdHN0YXRpYyBsb2FkKC4uLmRhdGE6IFZhbHVlSlNPTltdKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgVmFsdWVTdG9yZSguLi5kYXRhLm1hcCh4ID0+IFZhbHVlLmxvYWQoeCkpKTtcblx0XHR9XG5cdFx0XG5cdFx0cHVibGljIHZhbHVlU3RvcmU6IFZhbHVlW107XG5cdFx0XG5cdFx0Y29uc3RydWN0b3IoLi4udmFsdWVzOiBWYWx1ZVtdKVxuXHRcdHtcblx0XHRcdHRoaXMudmFsdWVTdG9yZSA9IHZhbHVlcy5tYXAoeCA9PiBcblx0XHRcdHtcblx0XHRcdFx0aWYgKHguYWxpYXNlZClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRyeSBcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR4LnZhbHVlID0gSlNPTi5wYXJzZSh4LnZhbHVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y2F0Y2ggKGV4KVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGlmICgvXlxcZCskLy50ZXN0KHgudmFsdWUpKVxuXHRcdFx0XHRcdFx0XHR4LnZhbHVlID0gQmlnSW50KHgudmFsdWUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4geDtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgdmFsdWVzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy52YWx1ZVN0b3JlLmZpbHRlcih4ID0+ICF4LmFsaWFzZWQpO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgYWxpYXNlcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudmFsdWVTdG9yZS5maWx0ZXIoeCA9PiB4LmFsaWFzZWQpO1xuXHRcdH1cblx0XHRcblx0XHRjb25jYXQoc3RvcmU6IFZhbHVlU3RvcmUpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBWYWx1ZVN0b3JlKC4uLnRoaXMudmFsdWVTdG9yZS5jb25jYXQoc3RvcmUudmFsdWVTdG9yZSkpO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgYWxpYXMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmFsaWFzZXNbMF07XG5cdFx0fVxuXHRcdFxuXHRcdGdldCB2YWx1ZSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudmFsdWVzWzBdO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgcHJpbWl0aXZlKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5hbGlhcyA/IHRoaXMuYWxpYXMudmFsdWUgOiB0aGlzLnZhbHVlLnRvU3RyaW5nKCk7XG5cdFx0fVxuXHRcdFxuXHRcdHRvSlNPTigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudmFsdWVTdG9yZTtcblx0XHR9XG5cdFxuXHRcdHRvU3RyaW5nKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5hbGlhcyA/IHRoaXMuYWxpYXMudG9TdHJpbmcoKSArICh0aGlzLnZhbHVlID8gXCJbXCIgKyB0aGlzLnZhbHVlLnRvU3RyaW5nKCkgKyBcIl1cIiA6IFwiXCIpIDogdGhpcy52YWx1ZS50b1N0cmluZygpO1xuXHRcdH1cblx0XHRcblx0fVxuXHRcblx0ZXhwb3J0IGNsYXNzIFR5cGUgXG5cdHtcblx0XHQvKipcblx0XHQgKiBMb2FkIGEgQmFja2VyLlR5cGUgZnJvbSBDb2RlSlNPTlxuXHRcdCAqL1xuXHRcdHN0YXRpYyBsb2FkKGNvZGU6IENvZGUsIGRhdGE6IFR5cGVKU09OKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgVHlwZShcblx0XHRcdFx0Y29kZSwgXG5cdFx0XHRcdGRhdGFbMl0sXG5cdFx0XHRcdGNvZGUucHJvdG90eXBlc1tkYXRhWzBdXSxcblx0XHRcdFx0ZGF0YVsxXSA/IEZ1dHVyZVR5cGUubmV3KGRhdGFbMV0pIDogbnVsbCxcblx0XHRcdFx0VmFsdWVTdG9yZS5sb2FkKC4uLmRhdGFbM10pXG5cdFx0XHQpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHZW5lcmF0ZSBhIEJhY2tlci5UeXBlIGZyb20gVHJ1dGguVHlwZVxuXHRcdCAqL1xuXHRcdHN0YXRpYyBuZXcoY29kZTogQ29kZSwgdHlwZTogVHJ1dGguVHlwZSlcblx0XHR7XHRcblx0XHRcdGNvbnN0IG5hbWUgPSB0eXBlLmlzUGF0dGVybiA/IHR5cGUubmFtZS5zdWJzdHIoOSkgOiB0eXBlLm5hbWU7XG5cdFx0XHRjb25zdCBpbnN0YW5jZSA9IG5ldyBUeXBlKFxuXHRcdFx0XHRjb2RlLCBcblx0XHRcdFx0bmFtZSwgXG5cdFx0XHRcdFByb3RvdHlwZS5uZXcoY29kZSwgdHlwZSksXG5cdFx0XHRcdHR5cGUuY29udGFpbmVyID8gRnV0dXJlVHlwZS5uZXcodHlwZS5jb250YWluZXIpIDogbnVsbCxcblx0XHRcdFx0bmV3IFZhbHVlU3RvcmUoLi4udHlwZS52YWx1ZXNcblx0XHRcdFx0XHQuZmlsdGVyKHggPT4gbmFtZSAhPT0geC52YWx1ZSlcblx0XHRcdFx0XHQubWFwKHggPT4gbmV3IFZhbHVlKHguYmFzZSA/IEZ1dHVyZVR5cGUubmV3KHguYmFzZSkgOiBudWxsLCB4LmFsaWFzZWQsIHgudmFsdWUpKSlcblx0XHRcdCk7XG5cdFx0XHRcblx0XHRcdEZ1dHVyZVR5cGUuVHlwZU1hcC5zZXQodHlwZSwgaW5zdGFuY2UpO1xuXHRcdFx0cmV0dXJuIGluc3RhbmNlO1xuXHRcdH1cblx0XHRcblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdHByaXZhdGUgY29kZTogQ29kZSxcblx0XHRcdHB1YmxpYyBuYW1lOiBzdHJpbmcsXG5cdFx0XHRwdWJsaWMgcHJvdG90eXBlOiBQcm90b3R5cGUsXG5cdFx0XHRwcml2YXRlIF9jb250YWluZXI6IEZ1dHVyZVR5cGUgfCBudWxsID0gbnVsbCxcblx0XHRcdHB1YmxpYyB2YWx1ZXM6IFZhbHVlU3RvcmUpIFxuXHRcdHsgfVxuXHRcdFx0XG5cdFx0Z2V0IGNvbnRhaW5lcigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NvbnRhaW5lciAmJiB0aGlzLl9jb250YWluZXIudHlwZTtcblx0XHR9XG5cdFx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgdGhlIGFycmF5IG9mIHR5cGVzIHRoYXQgYXJlIGNvbnRhaW5lZCBkaXJlY3RseSBieSB0aGlzXG5cdFx0ICogb25lLiBJbiB0aGUgY2FzZSB3aGVuIHRoaXMgdHlwZSBpcyBhIGxpc3QgdHlwZSwgdGhpcyBhcnJheSBkb2VzXG5cdFx0ICogbm90IGluY2x1ZGUgdGhlIGxpc3QncyBpbnRyaW5zaWMgdHlwZXMuXG5cdFx0ICovXG5cdFx0Z2V0IGNvbnRlbnRzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5jb2RlLnR5cGVzLmZpbHRlcih4ID0+IHguY29udGFpbmVyID09PSB0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQGludGVyYWxcblx0XHQgKi9cblx0XHRnZXQgcGFyYWxsZWxDb250ZW50cygpXG5cdFx0e1xuXHRcdFx0Y29uc3QgdHlwZXM6IFR5cGVbXSA9IFtdO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHsgdHlwZTogcGFyYWxsZWxUeXBlIH0gb2YgdGhpcy5pdGVyYXRlKHQgPT4gdC5wYXJhbGxlbHMsIHRydWUpKVxuXHRcdFx0XHRmb3IgKGNvbnN0IHsgdHlwZTogYmFzZVR5cGUgfSBvZiBwYXJhbGxlbFR5cGUuaXRlcmF0ZSh0ID0+IHQuYmFzZXMsIHRydWUpKVxuXHRcdFx0XHRcdGZvcihjb25zdCBjb250ZW50IG9mIGJhc2VUeXBlLmNvbnRlbnRzKVxuXHRcdFx0XHRcdGlmICghdHlwZXMuc29tZSh4ID0+IHgubmFtZSA9PT0gY29udGVudC5uYW1lKSlcblx0XHRcdFx0XHRcdHR5cGVzLnB1c2goY29udGVudCk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdHJldHVybiB0eXBlcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIGEgcmVmZXJlbmNlIHRvIHRoZSB0eXBlLCBhcyBpdCdzIGRlZmluZWQgaW4gaXQnc1xuXHRcdCAqIG5leHQgbW9zdCBhcHBsaWNhYmxlIHR5cGUuXG5cdFx0ICovXG5cdFx0Z2V0IHBhcmFsbGVscygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLnBhcmFsbGVscy5zbmFwc2hvdCgpXG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyB0aGUgYXJyYXkgb2YgdHlwZXMgZnJvbSB3aGljaCB0aGlzIHR5cGUgZXh0ZW5kcy5cblx0XHQgKiBJZiB0aGlzIFR5cGUgZXh0ZW5kcyBmcm9tIGEgcGF0dGVybiwgaXQgaXMgaW5jbHVkZWQgaW4gdGhpc1xuXHRcdCAqIGFycmF5LlxuXHRcdCAqL1xuXHRcdGdldCBiYXNlcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmJhc2VzLnNuYXBzaG90KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdldHMgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgcGF0dGVybnMgdGhhdCByZXNvbHZlIHRvIHRoaXMgdHlwZS5cblx0XHQgKi9cblx0XHRnZXQgcGF0dGVybnMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5wYXR0ZXJucy5zbmFwc2hvdCgpO1x0XG5cdFx0fVxuXHRcdFxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdldHMgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdGhhdCBzaGFyZSB0aGUgc2FtZSBjb250YWluaW5nXG5cdFx0ICogdHlwZSBhcyB0aGlzIG9uZS5cblx0XHQgKi9cblx0XHRnZXQgYWRqYWNlbnRzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5jb2RlLnR5cGVzLmZpbHRlcih4ID0+IHguY29udGFpbmVyICE9PSB0aGlzLmNvbnRhaW5lciAmJiB4ICE9PSB0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogR2V0cyBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSB0eXBlcyB0aGF0IGRlcml2ZSBmcm9tIHRoZSBcblx0XHQgKiB0aGlzIFR5cGUgaW5zdGFuY2UuXG5cdFx0ICogXG5cdFx0ICogVGhlIHR5cGVzIHRoYXQgZGVyaXZlIGZyb20gdGhpcyBvbmUgYXMgYSByZXN1bHQgb2YgdGhlIHVzZSBvZlxuXHRcdCAqIGFuIGFsaWFzIGFyZSBleGNsdWRlZCBmcm9tIHRoaXMgYXJyYXkuXG5cdFx0ICovXG5cdFx0Z2V0IGRlcml2YXRpb25zKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5jb2RlLnR5cGVzLmZpbHRlcih4ID0+IHguYmFzZXMuaW5jbHVkZXModGhpcykpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgYSByZWZlcmVuY2UgdG8gdGhlIHBhcmFsbGVsIHJvb3RzIG9mIHRoaXMgdHlwZS5cblx0XHQgKiBUaGUgcGFyYWxsZWwgcm9vdHMgYXJlIHRoZSBlbmRwb2ludHMgZm91bmQgd2hlblxuXHRcdCAqIHRyYXZlcnNpbmcgdXB3YXJkIHRocm91Z2ggdGhlIHBhcmFsbGVsIGdyYXBoLlxuXHRcdCAqL1xuXHRcdGdldCBwYXJhbGxlbFJvb3RzKClcblx0XHR7XG5cdFx0XHRjb25zdCByb290czogVHlwZVtdID0gW107XG5cdFx0XHRmb3IgKGNvbnN0IHsgdHlwZSB9IG9mIHRoaXMuaXRlcmF0ZSh0ID0+IHQucGFyYWxsZWxzKSlcblx0XHRcdFx0aWYgKHR5cGUgIT09IHRoaXMgJiYgdHlwZS5wYXJhbGxlbHMubGVuZ3RoID09PSAwKVxuXHRcdFx0XHRcdHJvb3RzLnB1c2godHlwZSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiByb290cztcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IHZhbHVlKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy52YWx1ZXMucHJpbWl0aXZlO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaWQoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmNvZGUudHlwZXMuaW5kZXhPZih0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGlzQW5vbnltb3VzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDApO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaXNGcmVzaCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmZsYWdzLmdldCgxKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGlzTGlzdCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmZsYWdzLmdldCgyKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIHdoZXRoZXIgdGhpcyB0eXBlIHJlcHJlc2VudHMgdGhlIGludHJpbnNpY1xuXHRcdCAqIHNpZGUgb2YgYSBsaXN0LlxuXHRcdCAqL1xuXHRcdGdldCBpc0xpc3RJbnRyaW5zaWMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5mbGFncy5nZXQoMyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyB3aGV0aGVyIHRoaXMgdHlwZSByZXByZXNlbnRzIHRoZSBleHRyaW5zaWNcblx0XHQgKiBzaWRlIG9mIGEgbGlzdC5cblx0XHQgKi9cblx0XHRnZXQgaXNMaXN0RXh0cmluc2ljKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDQpO1xuXHRcdH1cblx0XHRcblx0XHRcblx0XHRnZXQgaXNQYXR0ZXJuKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDUpO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaXNVcmkoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5mbGFncy5nZXQoNik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyBhIHZhbHVlIHRoYXQgaW5kaWNhdGVzIGlmIHRoaXMgVHlwZSB3YXMgZGlyZWN0bHkgc3BlY2lmaWVkXG5cdFx0ICogaW4gdGhlIGRvY3VtZW50LCBvciBpZiBpdCdzIGV4aXN0ZW5jZSB3YXMgaW5mZXJyZWQuXG5cdFx0ICovXG5cdFx0Z2V0IGlzU3BlY2lmaWVkKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDcpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgaXNPdmVycmlkZSgpIHsgcmV0dXJuIHRoaXMucGFyYWxsZWxzLmxlbmd0aCA+IDA7IH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgaXNJbnRyb2R1Y3Rpb24oKSB7IHJldHVybiB0aGlzLnBhcmFsbGVscy5sZW5ndGggPT09IDA7IH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIGEgYm9vbGVhbiB2YWx1ZSB0aGF0IGluZGljYXRlcyB3aGV0aGVyIHRoaXMgVHlwZVxuXHRcdCAqIGluc3RhbmNlIHdhcyBjcmVhdGVkIGZyb20gYSBwcmV2aW91cyBlZGl0IGZyYW1lLCBhbmRcblx0XHQgKiBzaG91bGQgbm8gbG9uZ2VyIGJlIHVzZWQuXG5cdFx0ICovXG5cdFx0Z2V0IGlzRGlydHkoKVxuXHRcdHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUGVyZm9ybXMgYW4gYXJiaXRyYXJ5IHJlY3Vyc2l2ZSwgYnJlYWR0aC1maXJzdCB0cmF2ZXJzYWxcblx0XHQgKiB0aGF0IGJlZ2lucyBhdCB0aGlzIFR5cGUgaW5zdGFuY2UuIEVuc3VyZXMgdGhhdCBubyB0eXBlc1xuXHRcdCAqIHR5cGVzIGFyZSB5aWVsZGVkIG11bHRpcGxlIHRpbWVzLlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSBuZXh0Rm4gQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSB0eXBlLCBvciBhblxuXHRcdCAqIGl0ZXJhYmxlIG9mIHR5cGVzIHRoYXQgYXJlIHRvIGJlIHZpc2l0ZWQgbmV4dC5cblx0XHQgKiBAcGFyYW0gcmV2ZXJzZSBBbiBvcHRpb25hbCBib29sZWFuIHZhbHVlIHRoYXQgaW5kaWNhdGVzXG5cdFx0ICogd2hldGhlciB0eXBlcyBpbiB0aGUgcmV0dXJuZWQgYXJyYXkgc2hvdWxkIGJlIHNvcnRlZFxuXHRcdCAqIHdpdGggdGhlIG1vc3QgZGVlcGx5IHZpc2l0ZWQgbm9kZXMgb2NjdXJpbmcgZmlyc3QuXG5cdFx0ICogXG5cdFx0ICogQHJldHVybnMgQW4gYXJyYXkgdGhhdCBzdG9yZXMgdGhlIGxpc3Qgb2YgdHlwZXMgdGhhdCB3ZXJlXG5cdFx0ICogdmlzaXRlZC5cblx0XHQgKi9cblx0XHR2aXNpdChuZXh0Rm46ICh0eXBlOiBUeXBlKSA9PiBJdGVyYWJsZTxUeXBlIHwgbnVsbD4gfCBUeXBlIHwgbnVsbCwgcmV2ZXJzZT86IGJvb2xlYW4pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIEFycmF5LmZyb20odGhpcy5pdGVyYXRlKG5leHRGbiwgcmV2ZXJzZSkpLm1hcChlbnRyeSA9PiBlbnRyeS50eXBlKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUGVyZm9ybXMgYW4gYXJiaXRyYXJ5IHJlY3Vyc2l2ZSwgYnJlYWR0aC1maXJzdCBpdGVyYXRpb25cblx0XHQgKiB0aGF0IGJlZ2lucyBhdCB0aGlzIFR5cGUgaW5zdGFuY2UuIEVuc3VyZXMgdGhhdCBubyB0eXBlc1xuXHRcdCAqIHR5cGVzIGFyZSB5aWVsZGVkIG11bHRpcGxlIHRpbWVzLlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSBuZXh0Rm4gQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSB0eXBlLCBvciBhbiBpdGVyYWJsZVxuXHRcdCAqIG9mIHR5cGVzIHRoYXQgYXJlIHRvIGJlIHZpc2l0ZWQgbmV4dC5cblx0XHQgKiBAcGFyYW0gcmV2ZXJzZSBBbiBvcHRpb25hbCBib29sZWFuIHZhbHVlIHRoYXQgaW5kaWNhdGVzXG5cdFx0ICogd2hldGhlciB0aGUgaXRlcmF0b3Igc2hvdWxkIHlpZWxkIHR5cGVzIHN0YXJ0aW5nIHdpdGggdGhlXG5cdFx0ICogbW9zdCBkZWVwbHkgbmVzdGVkIHR5cGVzIGZpcnN0LlxuXHRcdCAqIFxuXHRcdCAqIEB5aWVsZHMgQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgYSBgdHlwZWAgcHJvcGVydHkgdGhhdCBpcyB0aGVcblx0XHQgKiB0aGUgVHlwZSBiZWluZyB2aXNpdGVkLCBhbmQgYSBgdmlhYCBwcm9wZXJ0eSB0aGF0IGlzIHRoZSBUeXBlXG5cdFx0ICogdGhhdCB3YXMgcmV0dXJuZWQgaW4gdGhlIHByZXZpb3VzIGNhbGwgdG8gYG5leHRGbmAuXG5cdFx0ICovXG5cdFx0Kml0ZXJhdGUobmV4dEZuOiAodHlwZTogVHlwZSkgPT4gSXRlcmFibGU8VHlwZSB8IG51bGw+IHwgVHlwZSB8IG51bGwsIHJldmVyc2U/OiBib29sZWFuKVxuXHRcdHtcblx0XHRcdGNvbnN0IHlpZWxkZWQ6IFR5cGVbXSA9IFtdO1xuXHRcdFx0XG5cdFx0XHR0eXBlIFJlY3Vyc2VUeXBlID0gSXRlcmFibGVJdGVyYXRvcjx7IHR5cGU6IFR5cGU7IHZpYTogVHlwZSB8IG51bGwgfT47XG5cdFx0XHRmdW5jdGlvbiAqcmVjdXJzZSh0eXBlOiBUeXBlLCB2aWE6IFR5cGUgfCBudWxsKTogUmVjdXJzZVR5cGVcblx0XHRcdHtcblx0XHRcdFx0aWYgKHlpZWxkZWQuaW5jbHVkZXModHlwZSkpXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKCFyZXZlcnNlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0eWllbGRlZC5wdXNoKHR5cGUpO1xuXHRcdFx0XHRcdHlpZWxkIHsgdHlwZSwgdmlhIH07XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IHJlZHVjZWQgPSBuZXh0Rm4odHlwZSk7XG5cdFx0XHRcdGlmIChyZWR1Y2VkICE9PSBudWxsICYmIHJlZHVjZWQgIT09IHVuZGVmaW5lZClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChyZWR1Y2VkIGluc3RhbmNlb2YgVHlwZSlcblx0XHRcdFx0XHRcdHJldHVybiB5aWVsZCAqcmVjdXJzZShyZWR1Y2VkLCB0eXBlKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRmb3IgKGNvbnN0IG5leHRUeXBlIG9mIHJlZHVjZWQpXG5cdFx0XHRcdFx0XHRpZiAobmV4dFR5cGUgaW5zdGFuY2VvZiBUeXBlKVxuXHRcdFx0XHRcdFx0XHR5aWVsZCAqcmVjdXJzZShuZXh0VHlwZSwgdHlwZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGlmIChyZXZlcnNlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0eWllbGRlZC5wdXNoKHR5cGUpO1xuXHRcdFx0XHRcdHlpZWxkIHsgdHlwZSwgdmlhIH07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0eWllbGQgKnJlY3Vyc2UodGhpcywgbnVsbCk7XG5cdFx0fVxuXHRcblx0XHQvKipcblx0XHQgKiBRdWVyaWVzIGZvciBhIFR5cGUgdGhhdCBpcyBuZXN0ZWQgdW5kZXJuZWF0aCB0aGlzIFR5cGUsXG5cdFx0ICogYXQgdGhlIHNwZWNpZmllZCB0eXBlIHBhdGguXG5cdFx0ICovXG5cdFx0cXVlcnkoLi4udHlwZVBhdGg6IHN0cmluZ1tdKVxuXHRcdHtcblx0XHRcdGxldCBjdXJyZW50VHlwZTogVHlwZSB8IG51bGwgPSBudWxsO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHR5cGVOYW1lIG9mIHR5cGVQYXRoKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBuZXh0VHlwZSA9IHRoaXMuY29udGVudHMuZmluZCh0eXBlID0+IHR5cGUubmFtZSA9PT0gdHlwZU5hbWUpO1xuXHRcdFx0XHRpZiAoIW5leHRUeXBlKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0Y3VycmVudFR5cGUgPSBuZXh0VHlwZTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIGN1cnJlbnRUeXBlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDaGVja3Mgd2hldGhlciB0aGlzIFR5cGUgaGFzIHRoZSBzcGVjaWZpZWQgdHlwZVxuXHRcdCAqIHNvbWV3aGVyZSBpbiBpdCdzIGJhc2UgZ3JhcGguXG5cdFx0ICovXG5cdFx0aXMoYmFzZVR5cGU6IFR5cGUpXG5cdFx0e1xuXHRcdFx0Zm9yIChjb25zdCB7IHR5cGUgfSBvZiB0aGlzLml0ZXJhdGUodCA9PiB0LmJhc2VzKSlcblx0XHRcdFx0aWYgKHR5cGUgPT09IGJhc2VUeXBlKVxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENoZWNrcyB3aGV0aGVyIHRoaXMgVHlwZSBoYXMgdGhlIHNwZWNpZmllZCB0eXBlXG5cdFx0ICogc29tZXdoZXJlIGluIGl0J3MgYmFzZSBncmFwaC5cblx0XHQgKi9cblx0XHRpc1Jvb3QoYmFzZVR5cGU6IFR5cGUpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuaXMoYmFzZVR5cGUpIHx8wqB0aGlzLnBhcmFsbGVsUm9vdHMuaW5jbHVkZXMoYmFzZVR5cGUpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDaGVja3Mgd2hldGhlciB0aGUgc3BlY2lmaWVkIHR5cGUgaXMgaW4gdGhpcyBUeXBlJ3Ncblx0XHQgKiBgLmNvbnRlbnRzYCBwcm9wZXJ0eSwgZWl0aGVyIGRpcmVjdGx5LCBvciBpbmRpcmVjdGx5IHZpYVxuXHRcdCAqIHRoZSBwYXJhbGxlbCBncmFwaHMgb2YgdGhlIGAuY29udGVudHNgIFR5cGVzLlxuXHRcdCAqL1xuXHRcdGhhcyh0eXBlOiBUeXBlKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLmNvbnRlbnRzLmluY2x1ZGVzKHR5cGUpKVxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBjb250YWluZWRUeXBlIG9mIHRoaXMuY29udGVudHMpXG5cdFx0XHRcdGlmICh0eXBlLm5hbWUgPT09IGNvbnRhaW5lZFR5cGUubmFtZSlcblx0XHRcdFx0XHRmb3IgKGNvbnN0IHBhcmFsbGVsIG9mIGNvbnRhaW5lZFR5cGUuaXRlcmF0ZSh0ID0+IHQucGFyYWxsZWxzKSlcblx0XHRcdFx0XHRcdGlmIChwYXJhbGxlbC50eXBlID09PSB0eXBlKVxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBUcmFuc2ZlciBvd25lcnNoaXAgb2YgdGhpcyBpbnN0YW5jZSB0byBhbm90aGVyIENvZGUgaW5zdGFuY2Vcblx0XHQgKi9cblx0XHR0cmFuc2Zlcihjb2RlOiBDb2RlKVxuXHRcdHtcblx0XHRcdHRoaXMuY29kZSA9IGNvZGU7XG5cdFx0XHR0aGlzLnByb3RvdHlwZS50cmFuc2Zlcihjb2RlKTtcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKClcblx0XHR7XHRcblx0XHRcdHJldHVybiBbdGhpcy5wcm90b3R5cGUuaWQsIHRoaXMuY29udGFpbmVyICYmIHRoaXMuY29udGFpbmVyLmlkLCB0aGlzLm5hbWUsIHRoaXMudmFsdWVzXTtcblx0XHR9XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXJcbntcblx0LyoqXG5cdCAqIEtlZXBzIHRyYWNrIG9mIHJlbGF0aW9ucyBiZXR3ZWVuIHR5cGVzLlxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIFR5cGVTZXQgZXh0ZW5kcyBTZXQ8RnV0dXJlVHlwZT5cblx0e1xuXHRcdHN0YXRpYyBmcm9tSlNPTihkYXRhOiBudW1iZXJbXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFR5cGVTZXQoZGF0YS5tYXAoeCA9PiBGdXR1cmVUeXBlLm5ldyh4KSkpO1xuXHRcdH1cblx0XHRcblx0XHRzbmFwc2hvdCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudG9BcnJheSgpLm1hcCh4ID0+IHgudHlwZSkuZmlsdGVyKHggPT4geCkgYXMgVHlwZVtdO1xuXHRcdH1cblx0XHRcblx0XHR0b0FycmF5KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gQXJyYXkuZnJvbSh0aGlzLnZhbHVlcygpKS5zb3J0KCk7XHRcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKCkgeyByZXR1cm4gdGhpcy50b0FycmF5KCk7IH1cblx0XHR2YWx1ZU9mKCkgeyByZXR1cm4gdGhpcy50b0FycmF5KCk7IH1cblx0XHRbU3ltYm9sLnRvUHJpbWl0aXZlXSgpIHsgcmV0dXJuIHRoaXMudG9BcnJheSgpOyB9XG5cdFx0Z2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkgeyByZXR1cm4gXCJUeXBlU2V0XCI7IH1cblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlci5VdGlsXG57XG5cdC8qKlxuXHQgKiBIYXNoIGNhbGN1bGF0aW9uIGZ1bmN0aW9uIGFkYXB0ZWQgZnJvbTpcblx0ICogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzUyMTcxNDgwLzEzMzczN1xuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGhhc2godmFsdWU6IHN0cmluZywgc2VlZCA9IDApXG5cdHtcblx0XHRsZXQgaDEgPSAweERFQURCRUVGIF4gc2VlZDtcblx0XHRsZXQgaDIgPSAwWDQxQzZDRTU3IF4gc2VlZDtcblx0XHRcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKVxuXHRcdHtcblx0XHRcdGxldCBjaCA9IHZhbHVlLmNoYXJDb2RlQXQoaSk7XG5cdFx0XHRoMSA9IE1hdGguaW11bChoMSBeIGNoLCAyNjU0NDM1NzYxKTtcblx0XHRcdGgyID0gTWF0aC5pbXVsKGgyIF4gY2gsIDE1OTczMzQ2NzcpO1xuXHRcdH1cblx0XHRcblx0XHRoMSA9IE1hdGguaW11bChoMSBeIGgxID4+PiAxNiwgMjI0NjgyMjUwNykgXiBNYXRoLmltdWwoaDIgXiBoMiA+Pj4gMTMsIDMyNjY0ODk5MDkpO1xuXHRcdGgyID0gTWF0aC5pbXVsKGgyIF4gaDIgPj4+IDE2LCAyMjQ2ODIyNTA3KSBeIE1hdGguaW11bChoMSBeIGgxID4+PiAxMywgMzI2NjQ4OTkwOSk7XG5cdFx0cmV0dXJuIDQyOTQ5NjcyOTYgKiAoMjA5NzE1MSAmIGgyKSArIChoMSA+Pj4gMCk7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBDb21wcmVzcyBuZXN0ZWQgYXJyYXlzXG5cdCAqIEBwYXJhbSBkYXRhIEFuIGFycmF5IHdpdGggbmVzdGVkIGFycmF5cyBpbiBpdFxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGVuY29kZShkYXRhOiBhbnlbXSlcblx0e1xuXHRcdGNvbnN0IGJmID0gbmV3IEJpdGZpZWxkcygpO1xuXHRcdGNvbnN0IHJlc3VsdCA9IFtdO1xuXHRcdFxuXHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgZGF0YS5sZW5ndGg7KVxuXHRcdHtcblx0XHRcdGNvbnN0IHZwID0gZGF0YVtpXTtcblx0XHRcdGNvbnN0IHZhbHVlID0gdnAgJiYgdHlwZW9mIHZwID09PSBcIm9iamVjdFwiICYmIFwidG9KU09OXCIgaW4gdnAgPyB2cC50b0pTT04oKSA6IHZwO1x0XG5cdFx0XHRjb25zdCBiaXQgPSBBcnJheS5pc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDA7XG5cdFx0XHRiZi5zZXQoaSwgYml0ID8gZmFsc2UgOiB0cnVlKTtcblx0XHRcdCBcblx0XHRcdGlmICghYml0KSBcblx0XHRcdFx0cmVzdWx0LnB1c2godmFsdWUpO1xuXHRcdH1cblx0XHRcblx0XHRyZXN1bHQudW5zaGlmdChiZik7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXHRcblx0XG5cdC8qKlxuXHQgKiBEZWNvbXByZXNzIG5lc3RlZCBhcnJheXNcblx0ICogQHBhcmFtIGRhdGEgQSBjb21wcmVzc2VkIGFycmF5XG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gZGVjb2RlKGRhdGE6IFtudW1iZXIsIC4uLmFueVtdXSwgbGVuZ3RoPzogbnVtYmVyKVxuXHR7XG5cdFx0Y29uc3QgYmYgPSBuZXcgQml0ZmllbGRzKGRhdGEuc2hpZnQoKSk7XG5cdFx0XG5cdFx0aWYgKCFsZW5ndGggfHzCoGxlbmd0aCA8IDEpIFxuXHRcdFx0bGVuZ3RoID0gYmYuc2l6ZTtcblx0XHRcdFxuXHRcdGNvbnN0IHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpO1xuXHRcdFxuXHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgbGVuZ3RoOylcblx0XHR7XG5cdFx0XHRjb25zdCBiaXQgPSBiZi5nZXQoaSk7XG5cdFx0XHRpZiAoYml0KVxuXHRcdFx0XHRyZXN1bHRbaV0gPSBkYXRhLnNoaWZ0KCk7XG5cdFx0XHRlbHNlIFxuXHRcdFx0XHRyZXN1bHRbaV0gPSBbXTtcblx0XHR9XG5cdFx0XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXHRcblx0LyoqXG5cdCAqIEZldGNoIGEgZmlsZSB3aXRob3V0IHBsYXRmb3JtIGRlcGVuZGVuY2llc1xuXHQgKiBAcGFyYW0gdXJsIEpTT04gZmlsZSB1cmxcblx0ICovXG5cdGV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaEpTT04odXJsOiBzdHJpbmcpXG5cdHtcblx0XHRpZiAoZ2xvYmFsVGhpcyAmJiBcImZldGNoXCIgaW4gZ2xvYmFsVGhpcykgXG5cdFx0e1xuXHRcdFx0Y29uc3QgcmVxdWVzdCA9IGF3YWl0ICg8YW55Pmdsb2JhbFRoaXMpLmZldGNoKHVybCk7XG5cdFx0XHRyZXR1cm4gYXdhaXQgcmVxdWVzdC5qc29uKCk7XG5cdFx0fVxuXHRcdFxuXHRcdHRocm93IFwiVGhpcyBwbGF0Zm9ybSBpcyBub3Qgc3VwcG9ydGVkIVwiO1xuXHR9XG5cdFxuXHQvKipcblx0ICogTWFrZSBhIHByb3BlcnR5IChub24tKWVudW1lcmFibGVcblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBzaGFkb3cob2JqZWN0OiBvYmplY3QsIGtleTogc3RyaW5nIHwgc3ltYm9sLCBlbnVtZXJhYmxlID0gZmFsc2UpXG5cdHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBrZXksIHtcblx0XHRcdGVudW1lcmFibGVcblx0XHR9KTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIE1ha2UgYSBwcm9wZXJ0aWVzIChub24tKWVudW1lcmFibGVcblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBzaGFkb3dzKG9iamVjdDogb2JqZWN0LCBlbnVtZXJhYmxlID0gZmFsc2UsIC4uLmtleXM6IEFycmF5PHN0cmluZyB8wqBzeW1ib2w+KVxuXHR7XG5cdFx0Zm9yIChsZXQga2V5IG9mIGtleXMpXG5cdFx0XHRzaGFkb3cob2JqZWN0LCBrZXksIGVudW1lcmFibGUpO1xuXHR9XG59Il19