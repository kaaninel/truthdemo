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
        function Execute(Ast) {
            const cursors = new CursorSet(...Object.values(Backer.Graph));
            cursors.query(Ast);
            return cursors.snapshot();
        }
        TruthTalk.Execute = Execute;
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
            /**
             *
             */
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
                this.map(x => !!x[Backer.parent], x => x[Backer.parent]);
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
                snap.sort((x, y) => x[Backer.value] - y[Backer.value]);
                for (const struct of structs)
                    snap.sort((a, b) => {
                        if (!(a instanceof Backer.Surrogate))
                            if (!(b instanceof Backer.Surrogate))
                                return 0;
                            else
                                return -1;
                        else if (!(b instanceof Backer.Surrogate))
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
            [(_a = TruthTalk.container, Reflex.atom)](destination) {
                destination.addChild(this);
            }
            setContainer(cont) {
                //@ts-ignore
                this[TruthTalk.container] = cont;
            }
        }
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
            isKnownBranch(branch) {
                return branch instanceof TruthTalk.Node;
            }
            /** */
            isBranchDisposed(branch) {
                return branch instanceof TruthTalk.Branch && branch[TruthTalk.container] !== null;
            }
            /** */
            getRootBranch() {
                return new TruthTalk.Branches.Query();
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
            attachAtom(atomic, owner, ref) {
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
            detachAtom(atomic, owner) {
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
const tt = Reflex.Core.createBranchNamespace(new Backer.TruthTalk.Library(), true);
Backer.TruthTalk.tt = tt;
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
    Backer.Base = Base;
    class Summary extends Base {
        constructor(value, containers) {
            super(containers);
            this.value = value;
        }
        /** */
        get [Backer.value]() {
            return this.value;
        }
    }
    Backer.Summary = Summary;
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
        get bases() {
            return this[Backer.typeOf].bases.map(x => Backer.Schema[x.name]);
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
            return this.alias ? this.alias.value : this.value && this.value.toString();
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
        const Headers = `
	any
	object : any
	string : any
	number : any
	bigint : any
	boolean : any
	
	/".+" : string
	/(\\+|-)?(([1-9]\\d{0,17})|([1-8]\\d{18})|(9[01]\\d{17})) : number
	/(0|([1-9][0-9]*)) : bigint
	/(true|false) : boolean
	
	`;
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
        /**
         *
         */
        async function loadFile(content, pattern) {
            const doc = await Truth.parse(Headers + content);
            doc.program.verify();
            const faults = Array.from(doc.program.faults.each());
            if (faults.length) {
                for (const fault of faults)
                    console.error(fault.toString());
                throw faults[0].toString();
            }
            let code = new Backer.Code();
            const drill = (type) => {
                code.add(Backer.Type.new(code, type));
                for (const sub of type.contents)
                    drill(sub);
            };
            for (const type of doc.types)
                drill(type);
            const extracted = code.extractData(pattern);
            code = extracted.code;
            const data = extracted.data;
            const simplecode = JSON.parse(JSON.stringify(code));
            const simpledata = JSON.parse(JSON.stringify(data));
            const BCode = Backer.Code.new(simplecode);
            BCode.loadData(simpledata);
            return code;
        }
        Util.loadFile = loadFile;
    })(Util = Backer.Util || (Backer.Util = {}));
})(Backer || (Backer = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc291cmNlL0FTVC50cyIsIi4uL3NvdXJjZS9CaXRmaWVsZHMudHMiLCIuLi9zb3VyY2UvQ29kZS50cyIsIi4uL3NvdXJjZS9FbmdpbmUudHMiLCIuLi9zb3VyY2UvRnV0dXJlVHlwZS50cyIsIi4uL3NvdXJjZS9Ob2Rlcy50cyIsIi4uL3NvdXJjZS9Qcm90b3R5cGUudHMiLCIuLi9zb3VyY2UvUmVmbGV4TGlicmFyeS50cyIsIi4uL3NvdXJjZS9TdXJyb2dhdGVzLnRzIiwiLi4vc291cmNlL1R5cGUudHMiLCIuLi9zb3VyY2UvVHlwZVNldC50cyIsIi4uL3NvdXJjZS9VdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUNDQSxJQUFVLE1BQU0sQ0FpRGY7QUFqREQsV0FBVSxNQUFNO0lBRWY7O09BRUc7SUFDSCxNQUFhLFNBQVM7UUFFckIsWUFBbUIsUUFBUSxDQUFDO1lBQVQsVUFBSyxHQUFMLEtBQUssQ0FBSTtRQUFHLENBQUM7UUFFaEM7O1dBRUc7UUFDSCxJQUFJLElBQUk7WUFFUCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxHQUFHLENBQUMsS0FBYTtZQUVoQixJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUU7Z0JBQzFCLE9BQU8sS0FBSyxDQUFDO1lBRWQsT0FBTyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNqRCxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxHQUFHLENBQUMsS0FBYSxFQUFFLEtBQWM7WUFFaEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFO2dCQUMx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QUMsS0FBSztnQkFDM0IsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRWIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUU1QyxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQztZQUN0QixNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO1lBRTVCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3BELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBRXBELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFM0IsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBeENxQixhQUFRLFdBd0M3QixDQUFBO0lBQ0YsQ0FBQyxFQXRLZ0IsSUFBSSxHQUFKLFdBQUksS0FBSixXQUFJLFFBc0twQjtBQUFELENBQUMsRUF0S1MsTUFBTSxLQUFOLE1BQU0sUUFzS2YiLCJzb3VyY2VzQ29udGVudCI6WyJcbm5hbWVzcGFjZSBCYWNrZXIuVHJ1dGhUYWxrXG57XG5cdGV4cG9ydCB0eXBlIEF0b21pYyA9IFJlZmxleC5BdG9tPE5vZGUsIEJyYW5jaD47XG5cdGV4cG9ydCB0eXBlIEF0b21pY3MgPSBSZWZsZXguQXRvbTxOb2RlLCBCcmFuY2g+O1xuXHRcblx0LyoqICovXG5cdGV4cG9ydCBpbnRlcmZhY2UgTmFtZXNwYWNlIGV4dGVuZHNcblx0XHRSZWZsZXguQ29yZS5JQnJhbmNoTmFtZXNwYWNlPEF0b21pY3MsIEJyYW5jaGVzLlF1ZXJ5PlxuXHR7XG5cdFx0LyoqICovXG5cdFx0aXMoLi4uYXRvbWljczogQXRvbWljc1tdKTogQnJhbmNoZXMuSXM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aGFzKC4uLmF0b21pY3M6IEF0b21pY3NbXSk6IEJyYW5jaGVzLkhhcztcblx0XHRcblx0XHQvKiogKi9cblx0XHRub3QoLi4uYXRvbWljczogQXRvbWljc1tdKTogQnJhbmNoZXMuTm90O1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdG9yKC4uLmF0b21pY3M6IEF0b21pY3NbXSk6IEJyYW5jaGVzLk9yO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvbnRhaW5lcnMoKTogTGVhdmVzLkNvbnRhaW5lcnM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cm9vdCgpOiBMZWF2ZXMuUm9vdHM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y29udGVudHMoKTogTGVhdmVzLkNvbnRlbnRzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGVxdWFscyh2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbik6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z3JlYXRlclRoYW4odmFsdWU6IHN0cmluZyB8IG51bWJlcik6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bGVzc1RoYW4odmFsdWU6IHN0cmluZyB8IG51bWJlcik6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c3RhcnRzV2l0aCh2YWx1ZTogc3RyaW5nIHwgbnVtYmVyKTogTGVhdmVzLlByZWRpY2F0ZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRlbmRzV2l0aCh2YWx1ZTogc3RyaW5nIHwgbnVtYmVyKTogTGVhdmVzLlByZWRpY2F0ZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRhbGlhc2VkKCk6IExlYXZlcy5BbGlhc2VkO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGxlYXZlcygpOiBMZWF2ZXMuTGVhdmVzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZyZXNoKCk6IExlYXZlcy5GcmVzaDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRzbGljZShzdGFydDogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBMZWF2ZXMuU2xpY2U7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0b2NjdXJlbmNlcyhtaW46IG51bWJlciwgbWF4PzogbnVtYmVyKTogTGVhdmVzLk9jY3VyZW5jZXM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c29ydCguLi5jb250ZW50VHlwZXM6IE9iamVjdFtdKTogTGVhdmVzLlNvcnQ7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmV2ZXJzZSgpOiBMZWF2ZXMuUmV2ZXJzZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRuYW1lcygpOiBMZWF2ZXMuTmFtZXM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bmFtZWQodmFsdWU6IHN0cmluZyk6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c3VtKCk6IExlYXZlcy5TdW07XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXZnKCk6IExlYXZlcy5Bdmc7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bWluKCk6IExlYXZlcy5NaW47XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bWF4KCk6IExlYXZlcy5NYXg7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y291bnQoKTogTGVhdmVzLkNvdW50O1xuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBCYWNrZXJcbntcblx0LyoqXG5cdCAqIEJpdHdpc2UgZmxhZyBtYW5hZ2VyXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQml0ZmllbGRzXG5cdHtcblx0XHRjb25zdHJ1Y3RvcihwdWJsaWMgZmxhZ3MgPSAwKSB7fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgYXBwcm94LiBzaXplIGJhc2VkIG9uIGxhc3Qgc2V0IGJpdC5cblx0XHQgKi9cblx0XHRnZXQgc2l6ZSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIE1hdGguY2VpbChNYXRoLmxvZzIodGhpcy5mbGFncykpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIGEgYm9vbGVhbiBmcm9tIHNwZWNpZmllZCBpbmRleC5cblx0XHQgKi9cblx0XHRnZXQoaW5kZXg6IG51bWJlcilcblx0XHR7XG5cdFx0XHRpZiAoaW5kZXggPCAwIHx8IGluZGV4ID4gMzEpXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gdGhpcy5mbGFncyAmICgxIDw8IGluZGV4KSA/IHRydWUgOiBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU2V0cyBhIGJvb2xlYW4gdG8gc3BlY2lmaWVkIGluZGV4LlxuXHRcdCAqL1xuXHRcdHNldChpbmRleDogbnVtYmVyLCB2YWx1ZTogYm9vbGVhbilcblx0XHR7XG5cdFx0XHRpZiAoaW5kZXggPCAwIHx8IGluZGV4ID4gMzEpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdFxuXHRcdFx0Y29uc3QgbWFzayA9IDEgPDwgaW5kZXg7XG5cdFx0XHRcblx0XHRcdGlmICh2YWx1ZSlcblx0XHRcdFx0dGhpcy5mbGFncyB8PSBtYXNrO1xuXHRcdFx0ZWxzZSBcblx0XHRcdFx0dGhpcy5mbGFncyAmPSB+bWFzaztcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKCkgeyByZXR1cm4gdGhpcy5mbGFnczsgfVxuXHRcdHZhbHVlT2YoKSB7IHJldHVybiB0aGlzLmZsYWdzOyB9XG5cdFx0W1N5bWJvbC50b1ByaW1pdGl2ZV0oKSB7IHJldHVybiB0aGlzLmZsYWdzOyB9XG5cdFx0Z2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkgeyByZXR1cm4gXCJCaXRmaWVsZHNcIjsgfVxuXHR9XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyXG57XHRcblx0LyoqXG5cdCAqIFJlZmVyYW5jZXMgdG8gZXZlcnkgbG9hZGVkIENvZGUgaW5zdGFuY2UuXG5cdCAqL1xuXHRleHBvcnQgY29uc3QgQ29kZXM6IENvZGVbXSA9IFtdO1xuXHRcblx0LyoqXG5cdCAqIExhc3QgbG9hZGVkIFNjaGVtYVxuXHQgKi9cblx0ZXhwb3J0IGxldCBTY2hlbWE6IFJlY29yZDxzdHJpbmcsIFN0cnVjdD4gPSB7fTtcblx0XG5cdC8qKlxuXHQgKiBSZWZlcmFuY2VzIHRvIGV2ZXJ5IGxvYWRlZCBTY2hlbWFcblx0ICovXG5cdGV4cG9ydCBjb25zdCBTY2hlbWFzOiBSZWNvcmQ8c3RyaW5nLCBTdHJ1Y3Q+W10gPSBbXTtcblx0XG5cdC8qKlxuXHQgKiBMYXN0IGxvYWRlZCBEYXRhIEdyYXBoXG5cdCAqL1xuXHRleHBvcnQgbGV0IEdyYXBoOiBSZWNvcmQ8c3RyaW5nLCBTdXJyb2dhdGU+ID0ge307XG5cdFxuXHQvKipcblx0ICogUmVmZXJhbmNlcyB0byBldmVyeSBsb2FkZWQgRGF0YSBHcmFwaFxuXHQgKi9cblx0ZXhwb3J0IGNvbnN0IEdyYXBoczogUmVjb3JkPHN0cmluZywgU3Vycm9nYXRlPltdID0gW107XG5cdFxuXHQvKipcblx0ICogVHJ1dGggQ29kZSBKU09OXG5cdCAqIFxuXHQgKiBUaGlzIGNsYXNzIG1hbmFnZXMgY29kZSB0eXBlcyBleHRyYWN0ZWQgZnJvbSBUcnV0aCBmaWxlIGJ5IGNvbXBpbGVyLlxuXHQgKiBBbHNvIG1hbmFnZXMgcmVsYXRpb25zIGJldHdlZW4gcHJvdG90eXBlLCB0eXBlcyBhbmQgZGF0YS4gXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQ29kZVxuXHR7XG5cdFx0LyoqXG5cdFx0ICogTG9hZHMgYSBDb2RlSlNPTiBhbmQgbG9hZHMgRGF0YUpTT05zIG9uIHRoYXQgQ29kZSBpbnN0YW5jZS5cblx0XHQgKiBcblx0XHQgKiBAcGFyYW0gY29kZSBDb2RlSlNPTiBVcmxcblx0XHQgKiBAcGFyYW0gZGF0YSBEYXRhSlNPTiBVcmxzXG5cdFx0ICovXG5cdFx0c3RhdGljIGFzeW5jIGxvYWQoY29kZTogc3RyaW5nLCAuLi5kYXRhOiBzdHJpbmdbXSlcblx0XHR7XG5cdFx0XHRjb25zdCBpbnN0YW5jZSA9IENvZGUubmV3KGF3YWl0IFV0aWwuZmV0Y2hKU09OKGNvZGUpKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCB1cmwgb2YgZGF0YSlcblx0XHRcdFx0aW5zdGFuY2UubG9hZERhdGEoYXdhaXQgVXRpbC5mZXRjaEpTT04odXJsKSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBpbnN0YW5jZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogTG9hZHMgYSBDb2RlIGluc3RhbmNlIGZyb20gcGFyc2VkIENvZGUgSlNPTi5cblx0XHQgKiBAcGFyYW0gZGF0YSBQYXJzZWQgQ29kZUpTT05cblx0XHQgKi9cblx0XHRzdGF0aWMgbmV3KGRhdGE6IFtQcm90b3R5cGVKU09OW10sIFR5cGVKU09OW11dKVxuXHRcdHtcblx0XHRcdGNvbnN0IGNvZGUgPSBuZXcgQ29kZSgpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBwcm90b3R5cGVzID0gZGF0YVswXS5tYXAoeCA9PiBQcm90b3R5cGUubG9hZChjb2RlLCB4KSk7XG5cdFx0XHRmb3IgKGNvbnN0IHByb3RvIG9mIHByb3RvdHlwZXMpXG5cdFx0XHRcdGNvZGUucHJvdG90eXBlcy5wdXNoKHByb3RvKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgdHlwZXMgPSBkYXRhWzFdLm1hcCh4ID0+IFR5cGUubG9hZChjb2RlLCB4KSk7XG5cdFx0XHRmb3IgKGNvbnN0IHR5cGUgb2YgdHlwZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGlkID0gY29kZS50eXBlcy5wdXNoKHR5cGUpIC0gMTtcblx0XHRcdFx0RnV0dXJlVHlwZS5JZE1hcC5zZXQoaWQsIHR5cGUpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRjb25zdCBTY2hlbWE6IFJlY29yZDxzdHJpbmcsIFN0cnVjdD4gPSB7fTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCB0eXBlIG9mIHR5cGVzKVxuXHRcdFx0XHRpZiAoIXR5cGUuY29udGFpbmVyKVxuXHRcdFx0XHRcdFNjaGVtYVt0eXBlLm5hbWVdID0gbmV3IFN0cnVjdCh0eXBlLCBudWxsKTtcblx0XHRcdFx0XHRcdFx0XHRcdFxuXHRcdFx0QmFja2VyLlNjaGVtYSA9IFNjaGVtYTtcblx0XHRcdFx0XHRcblx0XHRcdFNjaGVtYXMucHVzaChTY2hlbWEpO1xuXHRcdFx0Q29kZXMucHVzaChjb2RlKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGNvZGU7XG5cdFx0fVxuXHRcdFxuXHRcdHR5cGVzOiBUeXBlW10gPSBbXTtcblx0XHRwcm90b3R5cGVzOiBQcm90b3R5cGVbXSA9IFtdO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEJpbmRzIGEgdHlwZSB0byBDb2RlIGluc3RhbmNlXG5cdFx0ICovXG5cdFx0YWRkKHR5cGU6IFR5cGUpXG5cdFx0e1xuXHRcdFx0aWYgKCF0aGlzLnByb3RvdHlwZXMuc29tZSh4ID0+IHguaGFzaCA9PT0gdHlwZS5wcm90b3R5cGUuaGFzaCkpXG5cdFx0XHRcdHRoaXMucHJvdG90eXBlcy5wdXNoKHR5cGUucHJvdG90eXBlKTtcblx0XHRcdFx0XG5cdFx0XHRjb25zdCBpZCA9IHRoaXMudHlwZXMucHVzaCh0eXBlKSAtIDE7XG5cdFx0XHR0eXBlLnRyYW5zZmVyKHRoaXMpO1xuXHRcdFx0cmV0dXJuIGlkO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBMb2FkcyBkYXRhIHR5cGVzIGFuZCBzdXJyb2dhdGVzIGZyb20gcGFyc2VkIERhdGFKU09OLlxuXHRcdCAqIEBwYXJhbSBkYXRhIFBhcnNlZCBEYXRhSlNPTlxuXHRcdCAqL1xuXHRcdGxvYWREYXRhKGRhdGE6IERhdGFKU09OW10pXG5cdFx0e1x0XG5cdFx0XHRjb25zdCBHcmFwaDogUmVjb3JkPHN0cmluZywgU3Vycm9nYXRlPiA9IHt9O1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGluZm8gb2YgZGF0YSlcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgcHJvdG90eXBlcyA9IGluZm8uc2hpZnQoKSBhcyBudW1iZXJbXTtcblx0XHRcdFx0Y29uc3QgbmFtZSA9IGluZm8uc2hpZnQoKSBhcyBzdHJpbmc7XG5cdFx0XHRcdGNvbnN0IHByb3RvdHlwZSA9IHRoaXMucHJvdG90eXBlc1twcm90b3R5cGVzLnNoaWZ0KCkhXTtcblx0XHRcdFx0Y29uc3QgdHlwZSA9IG5ldyBUeXBlKFxuXHRcdFx0XHRcdHRoaXMsIFxuXHRcdFx0XHRcdG5hbWUsIFxuXHRcdFx0XHRcdHByb3RvdHlwZSwgXG5cdFx0XHRcdFx0bnVsbCxcblx0XHRcdFx0XHRWYWx1ZVN0b3JlLmxvYWQoLi4uaW5mby5zaGlmdCgpIGFzIFZhbHVlSlNPTltdKVxuXHRcdFx0XHQpO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgZ2VuZXJhdGUgPSAoYmFzZTogVHlwZSwgY29udGVudHM6IFR5cGVbXSkgPT4gXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRmb3IgKGNvbnN0IGNvbnRlbnQgb2YgY29udGVudHMpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y29uc3QgY2xvbmUgPSBuZXcgVHlwZShcblx0XHRcdFx0XHRcdFx0dGhpcyxcblx0XHRcdFx0XHRcdFx0Y29udGVudC5uYW1lLFxuXHRcdFx0XHRcdFx0XHR0aGlzLnByb3RvdHlwZXNbcHJvdG90eXBlcy5zaGlmdCgpIV0sXG5cdFx0XHRcdFx0XHRcdEZ1dHVyZVR5cGUubmV3KGJhc2UpLFxuXHRcdFx0XHRcdFx0XHRjb250ZW50LnZhbHVlcy5jb25jYXQoVmFsdWVTdG9yZS5sb2FkKC4uLmluZm8uc2hpZnQoKSBhcyBWYWx1ZUpTT05bXSkpXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0dGhpcy50eXBlcy5wdXNoKGNsb25lKTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0Z2VuZXJhdGUoY2xvbmUsIGNsb25lLnBhcmFsbGVsQ29udGVudHMpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0Z2VuZXJhdGUodHlwZSwgdHlwZS5wYXJhbGxlbENvbnRlbnRzKTtcblx0XHRcdFx0XG5cdFx0XHRcdEdyYXBoW3R5cGUubmFtZV0gPSBuZXcgU3Vycm9nYXRlKHR5cGUsIG51bGwpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRCYWNrZXIuR3JhcGggPSBHcmFwaDtcblx0XHRcdEdyYXBocy5wdXNoKEdyYXBoKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIEdyYXBoO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBFeHRyYWN0IGRhdGEgZnJvbSBjdXJyZW50IHR5cGVzIG9mIENvZGVcblx0XHQgKiBAcGFyYW0gcGF0dGVybiBEYXRhIE5hbWUgUGF0dGVyblxuXHRcdCAqL1xuXHRcdGV4dHJhY3REYXRhKHBhdHRlcm46IFJlZ0V4cClcblx0XHR7XG5cdFx0XHRjb25zdCBkYXRhUm9vdHMgPSB0aGlzLnR5cGVzLmZpbHRlcih4ID0+IHguY29udGFpbmVyID09PSBudWxsICYmIHBhdHRlcm4udGVzdCh4Lm5hbWUpKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgZHJpbGwgPSAoeDogVHlwZSkgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgYXJyYXkgPSBbeF07XG5cdFx0XHRcdGZvciAoY29uc3QgdHlwZSBvZiB4LmNvbnRlbnRzKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgY2hpbGQgPSBkcmlsbCh0eXBlKS5mbGF0KCk7XG5cdFx0XHRcdFx0aWYgKGNoaWxkLmxlbmd0aClcblx0XHRcdFx0XHRcdGFycmF5LnB1c2goLi4uY2hpbGQpO1xuXHRcdFx0XHR9IFxuXHRcdFx0XHRyZXR1cm4gYXJyYXk7XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0XHRjb25zdCBkYXRhU2NoZW1hID0gZGF0YVJvb3RzLm1hcChkcmlsbCkuZmlsdGVyKHggPT4gQXJyYXkuaXNBcnJheSh4KSA/IHgubGVuZ3RoIDogdHJ1ZSk7XG5cdFx0XHRjb25zdCBkYXRhUXVlcnkgPSBkYXRhU2NoZW1hLmZsYXQoKTtcblx0XHRcdGNvbnN0IGNvZGVSb290cyA9IHRoaXMudHlwZXMuZmlsdGVyKHggPT4gIWRhdGFRdWVyeS5pbmNsdWRlcyh4KSk7XG5cdFx0XHRjb25zdCBjb2RlID0gbmV3IENvZGUoKTtcblx0XHRcdGZvciAoY29uc3QgdHlwZSBvZiBjb2RlUm9vdHMpXG5cdFx0XHRcdGNvZGUuYWRkKHR5cGUpO1xuXHRcdFx0XHRcblx0XHRcdGZvciAoY29uc3QgdHlwZSBvZiBkYXRhUXVlcnkpXG5cdFx0XHR7XHRcdFx0XG5cdFx0XHRcdGlmICghY29kZS5wcm90b3R5cGVzLnNvbWUoeCA9PiB4Lmhhc2ggPT09IHR5cGUucHJvdG90eXBlLmhhc2gpKVxuXHRcdFx0XHRcdGNvZGUucHJvdG90eXBlcy5wdXNoKHR5cGUucHJvdG90eXBlKTtcdFxuXHRcdFx0XHR0eXBlLnRyYW5zZmVyKGNvZGUpO1xuXHRcdFx0fVxuXHRcdFxuXHRcdFx0Y29uc3QgZGF0YSA9IGRhdGFTY2hlbWEubWFwKHggPT4gW3gubWFwKHggPT4geC5wcm90b3R5cGUuaWQpLCB4WzBdLm5hbWUsIC4uLngubWFwKHggPT4geC52YWx1ZXMudmFsdWVTdG9yZSldKTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjb2RlLFxuXHRcdFx0XHRkYXRhXG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdHRvSlNPTigpIHsgcmV0dXJuIFt0aGlzLnByb3RvdHlwZXMsIHRoaXMudHlwZXNdOyB9XG5cdFx0dmFsdWVPZigpIHsgcmV0dXJuIHRoaXMudHlwZXMubGVuZ3RoOyB9XG5cdFx0W1N5bWJvbC50b1ByaW1pdGl2ZV0oKSB7IHJldHVybiB0aGlzLnR5cGVzLmxlbmd0aDsgfVxuXHRcdGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpIHsgcmV0dXJuIFwiQ29kZVwiOyB9XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXIuVHJ1dGhUYWxrXG57XG5cdGV4cG9ydCB0eXBlIEN1cnNvciA9IFN1cnJvZ2F0ZSB8IE5hbWUgfMKgU3VtbWFyeTtcblx0dHlwZSBNYXliZUFycmF5PFQ+ID0gVCB8IFRbXTtcblx0XG5cdGNvbnN0IFN1cnJvZ2F0ZUZpbHRlciA9ICh4OiBDdXJzb3IpOiB4IGlzIFN1cnJvZ2F0ZSA9PiB4IGluc3RhbmNlb2YgU3Vycm9nYXRlO1xuXHRcblx0ZXhwb3J0IGZ1bmN0aW9uIEV4ZWN1dGUoQXN0OiBCcmFuY2gpXG5cdHtcblx0XHRjb25zdCBjdXJzb3JzID0gbmV3IEN1cnNvclNldCguLi5PYmplY3QudmFsdWVzKEJhY2tlci5HcmFwaCkpO1xuXHRcdGN1cnNvcnMucXVlcnkoQXN0KTtcblx0XHRyZXR1cm4gY3Vyc29ycy5zbmFwc2hvdCgpO1xuXHR9XG5cdFxuXHQvKipcblx0ICogS2VlcHMgdHJhY2sgb2YgcG9zc2libGUgb3V0cHV0IG9mIHF1ZXJ5XG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQ3Vyc29yU2V0XG5cdHtcdFxuXHRcdGN1cnNvcnM6IFNldDxDdXJzb3I+O1xuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKC4uLmN1cnNvcnM6IEN1cnNvcltdKVxuXHRcdHtcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQoY3Vyc29ycyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFNuYXBzaG90IG9mIGN1cnJlbnQgcG9zc2liaWxpdGllc1xuXHRcdCAqL1xuXHRcdHNuYXBzaG90KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmN1cnNvcnMpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRtYXAoZmlsdGVyOiAoY3Vyc29yOiBDdXJzb3IpID0+IGJvb2xlYW4sIG1hcDogKGl0ZW1zOiBDdXJzb3IpID0+IE1heWJlQXJyYXk8Q3Vyc29yPilcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KHRoaXMuc25hcHNob3QoKS5maWx0ZXIoZmlsdGVyKS5mbGF0TWFwKG1hcCkuZmlsdGVyKHggPT4gISF4KSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENsb25lcyBjdXJyZW50IHN0YXRlIG9mIEN1cnNvclNldFxuXHRcdCAqL1xuXHRcdGNsb25lKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IEN1cnNvclNldCguLi50aGlzLnNuYXBzaG90KCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBGaWx0ZXJzIGN1cnJlbnQgcG9zc2liaWxpdGllc1xuXHRcdCAqL1xuXHRcdGZpbHRlcihmbjogKHY6IEN1cnNvcikgPT4gYm9vbGVhbilcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KHRoaXMuc25hcHNob3QoKS5maWx0ZXIoeCA9PiBmbih4KSkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBGaWx0ZXJzIGN1cnJlbnQgcG9zc2liaWxpdGllc1xuXHRcdCAqL1xuXHRcdGZpbHRlclN1cnJvZ2F0ZShmbjogKHY6IFN1cnJvZ2F0ZSkgPT4gYm9vbGVhbilcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KHRoaXMuc25hcHNob3QoKS5maWx0ZXIoKHgpOiB4IGlzIFN1cnJvZ2F0ZSA9PiB4IGluc3RhbmNlb2YgU3Vycm9nYXRlICYmIGZuKHgpKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEV4ZWN1dGVzIGEgVHJ1dGggVGFsayBxdWVyeVxuXHRcdCAqL1xuXHRcdHF1ZXJ5KGFzdDogQnJhbmNoIHwgTGVhZikgXG5cdFx0e1xuXHRcdFx0aWYgKGFzdCBpbnN0YW5jZW9mIEJyYW5jaClcblx0XHRcdFx0dGhpcy5icmFuY2goYXN0KTtcblx0XHRcdGVsc2UgXG5cdFx0XHRcdHRoaXMubGVhZihhc3QpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBFeGVjdXRlcyBhIFRydXRoIFRhbGsgYnJhbmNoXG5cdFx0ICovXG5cdFx0YnJhbmNoKGJyYW5jaDogQnJhbmNoKSBcblx0XHR7XG5cdFx0XHRzd2l0Y2ggKGJyYW5jaFtvcF0pXG5cdFx0XHR7XG5cdFx0XHRcdGNhc2UgQnJhbmNoT3AuaXM6XG5cdFx0XHRcdGNhc2UgQnJhbmNoT3AucXVlcnk6XG5cdFx0XHRcdFx0Zm9yIChjb25zdCBxdWVyeSBvZiBicmFuY2guY2hpbGRyZW4pXG5cdFx0XHRcdFx0XHR0aGlzLnF1ZXJ5KHF1ZXJ5KTtcdFxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLm5vdDogXG5cdFx0XHRcdFx0dGhpcy5ub3QoYnJhbmNoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBCcmFuY2hPcC5vcjpcblx0XHRcdFx0XHR0aGlzLm9yKGJyYW5jaCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgQnJhbmNoT3AuaGFzOlxuXHRcdFx0XHRcdHRoaXMuY29udGVudHMoKTtcblx0XHRcdFx0XHRmb3IgKGNvbnN0IHF1ZXJ5IG9mIGJyYW5jaC5jaGlsZHJlbilcblx0XHRcdFx0XHRcdHRoaXMucXVlcnkocXVlcnkpO1xuXHRcdFx0XHRcdHRoaXMuY29udGFpbmVycygpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBFeGVjdXRlcyBhIFRydXRoIFRhbGsgbGVhZlxuXHRcdCAqL1xuXHRcdGxlYWYobGVhZjogTGVhZikgXG5cdFx0e1xuXHRcdFx0c3dpdGNoIChsZWFmW29wXSlcblx0XHRcdHtcblx0XHRcdFx0Y2FzZSBMZWFmT3Auc3Vycm9nYXRlOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyU3Vycm9nYXRlKHggPT4geFt0eXBlT2ZdLmlzKCg8U3Vycm9nYXRlPmxlYWYpW3R5cGVPZl0pIHx8IHhbdHlwZU9mXS5wYXJhbGxlbFJvb3RzLmluY2x1ZGVzKCg8U3Vycm9nYXRlPmxlYWYpW3R5cGVPZl0pKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3AuY29udGVudHM6XG5cdFx0XHRcdFx0dGhpcy5jb250ZW50cygpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5yb290czpcblx0XHRcdFx0XHR0aGlzLnJvb3RzKCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLmNvbnRhaW5lcnM6XG5cdFx0XHRcdFx0dGhpcy5jb250YWluZXJzKCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLmFsaWFzZWQ6XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoeCA9PiB4W3ZhbHVlXSAhPT0gbnVsbCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLmxlYXZlczpcblx0XHRcdFx0XHR0aGlzLmZpbHRlcih4ID0+IHhbdmFsdWVdID09PSBudWxsKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3AuZnJlc2g6XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXJTdXJyb2dhdGUoeCA9PiB4W3R5cGVPZl0uaXNGcmVzaCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgUHJlZGljYXRlT3AuZXF1YWxzOlxuXHRcdFx0XHRcdHRoaXMuZXF1YWxzKDxMZWF2ZXMuUHJlZGljYXRlPmxlYWYpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLmdyZWF0ZXJUaGFuOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHggPT4gKHhbdmFsdWVdIHx8wqAwKSA+ICg8TGVhdmVzLlByZWRpY2F0ZT5sZWFmKS5vcGVyYW5kKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBQcmVkaWNhdGVPcC5sZXNzVGhhbjpcblx0XHRcdFx0XHR0aGlzLmZpbHRlcih4ID0+ICh4W3ZhbHVlXSB8fCAwKSA8ICg8TGVhdmVzLlByZWRpY2F0ZT5sZWFmKS5vcGVyYW5kKTtcblx0XHRcdFx0XHRicmVhaztcdFxuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLnN0YXJ0c1dpdGg6XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoeCA9PiB4W3ZhbHVlXSA9PSBudWxsID8gZmFsc2UgOiB4W3ZhbHVlXSEudG9TdHJpbmcoKS5zdGFydHNXaXRoKDxzdHJpbmc+KDxMZWF2ZXMuUHJlZGljYXRlPmxlYWYpLm9wZXJhbmQpKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBQcmVkaWNhdGVPcC5lbmRzV2l0aDpcblx0XHRcdFx0XHR0aGlzLmZpbHRlcih4ID0+IHhbdmFsdWVdID09IG51bGwgPyBmYWxzZSA6IHhbdmFsdWVdIS50b1N0cmluZygpLmVuZHNXaXRoKDxzdHJpbmc+KDxMZWF2ZXMuUHJlZGljYXRlPmxlYWYpLm9wZXJhbmQpKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3Auc2xpY2U6XG5cdFx0XHRcdFx0dGhpcy5zbGljZShsZWFmKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3Aub2NjdXJlbmNlczpcblx0XHRcdFx0XHR0aGlzLm9jY3VyZW5jZXMobGVhZik7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLnNvcnQ6IFxuXHRcdFx0XHRcdHRoaXMuc29ydChsZWFmKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3AucmV2ZXJzZTpcblx0XHRcdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KHRoaXMuc25hcHNob3QoKS5yZXZlcnNlKCkpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5uYW1lczpcblx0XHRcdFx0XHR0aGlzLm5hbWVzKCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgUHJlZGljYXRlT3AubmFtZWQ6XG5cdFx0XHRcdFx0dGhpcy5uYW1lcygpO1xuXHRcdFx0XHRcdHRoaXMuZXF1YWxzKDxMZWF2ZXMuUHJlZGljYXRlPmxlYWYpO1xuXHRcdFx0XHRcdHRoaXMuY29udGFpbmVycygpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHRlcXVhbHMobGVhZjogTGVhdmVzLlByZWRpY2F0ZSlcblx0XHR7XG5cdFx0XHR0aGlzLmZpbHRlcih4ID0+IHhbdmFsdWVdICE9PSBudWxsID8geFt2YWx1ZV0gPT0gKGxlYWYpLm9wZXJhbmQgOiBmYWxzZSk7XG5cdFx0fVxuXHRcdFxuXHRcdG5hbWVzKClcblx0XHR7XG5cdFx0XHR0aGlzLm1hcChTdXJyb2dhdGVGaWx0ZXIsICh4KSA9PiAoPFN1cnJvZ2F0ZT54KVtuYW1lXSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdvIG9uZSBsZXZlbCBuZXN0ZWQgaW5cblx0XHQgKi9cblx0XHRjb250ZW50cygpXG5cdFx0e1xuXHRcdFx0dGhpcy5tYXAoU3Vycm9nYXRlRmlsdGVyLCB4ID0+ICg8U3Vycm9nYXRlPngpLmNvbnRlbnRzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogR28gdG8gdG9wIGxldmVsXG5cdFx0ICovXG5cdFx0cm9vdHMoKVxuXHRcdHtcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQodGhpcy5zbmFwc2hvdCgpLm1hcCgoeDogQ3Vyc29yIHzCoG51bGwpID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHR3aGlsZSAoeCAmJiB4W3BhcmVudF0pIFxuXHRcdFx0XHRcdFx0eCA9IHhbcGFyZW50XSBhcyBTdXJyb2dhdGU7XG5cdFx0XHRcdFx0cmV0dXJuIHg7XHRcdFx0XHRcblx0XHRcdFx0fSkuZmlsdGVyKCh4KTogeCBpcyBTdXJyb2dhdGUgPT4gISF4KSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdvIG9uZSBsZXZlbCBuZXN0ZWQgb3V0XG5cdFx0ICovXG5cdFx0Y29udGFpbmVycygpXG5cdFx0e1xuXHRcdFx0dGhpcy5tYXAoeCA9PiAhIXhbcGFyZW50XSwgeCA9PiAoPGFueT54W3BhcmVudF0pKTtcblx0XHR9XG5cdFxuXHRcdC8qKiAqL1xuXHRcdG5vdChicmFuY2g6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRjb25zdCBpbnN0YW5jZSA9IHRoaXMuY2xvbmUoKTtcblx0XHRcdFx0XHRcblx0XHRcdGZvciAoY29uc3QgcXVlcnkgb2YgYnJhbmNoLmNoaWxkcmVuKVxuXHRcdFx0XHRpbnN0YW5jZS5xdWVyeShxdWVyeSk7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHNuYXAgPSBpbnN0YW5jZS5zbmFwc2hvdCgpO1xuXHRcdFx0dGhpcy5maWx0ZXIoeCA9PiAhc25hcC5pbmNsdWRlcyh4KSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdG9yKGJyYW5jaDogQnJhbmNoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGluc3RhbmNlcyA9IFtdO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHF1ZXJ5IG9mIGJyYW5jaC5jaGlsZHJlbilcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgaW5zdGFuY2UgPSB0aGlzLmNsb25lKCk7XHRcblx0XHRcdFx0aW5zdGFuY2UucXVlcnkocXVlcnkpO1xuXHRcdFx0XHRpbnN0YW5jZXMucHVzaChpbnN0YW5jZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGNvbnN0IHNuYXAgPSBpbnN0YW5jZXMuZmxhdCgpO1xuXHRcdFx0dGhpcy5maWx0ZXIoeCA9PiBzbmFwLmluY2x1ZGVzKHgpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c2xpY2UobGVhZjogTGVhZilcblx0XHR7XG5cdFx0XHRsZXQge1xuXHRcdFx0XHRzdGFydCxcblx0XHRcdFx0ZW5kXG5cdFx0XHR9wqA9IDxMZWF2ZXMuU2xpY2U+bGVhZjtcblx0XHRcdFxuXHRcdFx0Y29uc3Qgc25hcCA9IHRoaXMuc25hcHNob3QoKTtcblx0XHRcdGlmIChlbmQgJiYgZW5kIDwgMSkgZW5kID0gc3RhcnQgKyBNYXRoLnJvdW5kKGVuZCAqIHNuYXAubGVuZ3RoKTtcblx0XHRcdFxuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldChzbmFwLnNsaWNlKHN0YXJ0LCBlbmQpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0b2NjdXJlbmNlcyhsZWFmOiBMZWFmKVxuXHRcdHtcblx0XHRcdGxldCB7XG5cdFx0XHRcdG1pbixcblx0XHRcdFx0bWF4XG5cdFx0XHR9wqA9IDxMZWF2ZXMuT2NjdXJlbmNlcz5sZWFmO1xuXHRcdFx0XG5cdFx0XHRpZiAoIW1heCkgbWF4ID0gbWluO1xuXG5cdFx0XHRjb25zdCB2YWx1ZU1hcDogUmVjb3JkPHN0cmluZywgQ3Vyc29yW10+ID0ge307XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLmN1cnNvcnMpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHZhbCA9IEpTT04uc3RyaW5naWZ5KGl0ZW1bdmFsdWVdKTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICghdmFsdWVNYXAuaGFzT3duUHJvcGVydHkodmFsKSlcblx0XHRcdFx0XHR2YWx1ZU1hcFt2YWxdID0gW107XG5cdFx0XHRcdFx0XG5cdFx0XHRcdHZhbHVlTWFwW3ZhbF0ucHVzaChpdGVtKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldChPYmplY3QudmFsdWVzKHZhbHVlTWFwKS5maWx0ZXIoeCA9PiB4Lmxlbmd0aCA+PSBtaW4gJiYgeC5sZW5ndGggPD0gbWF4KS5mbGF0KCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRpcyhzdXJyb2dhdGU6IFN1cnJvZ2F0ZSwgbm90ID0gZmFsc2UpXG5cdFx0e1xuXHRcdFx0Y29uc3QgaW5zdGFuY2UgPSB0aGlzLmNsb25lKCk7XG5cdFx0XHRyZXR1cm4gaW5zdGFuY2UuZmlsdGVyU3Vycm9nYXRlKHggPT4gXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBjb25kaXRpb24gPSB4W3R5cGVPZl0uaXMoc3Vycm9nYXRlW3R5cGVPZl0pIHx8IHhbdHlwZU9mXS5wYXJhbGxlbFJvb3RzLmluY2x1ZGVzKHN1cnJvZ2F0ZVt0eXBlT2ZdKTtcblx0XHRcdFx0XHRyZXR1cm4gbm90ID8gIWNvbmRpdGlvbiA6IGNvbmRpdGlvbjtcblx0XHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHNvcnQobGVhZjogTGVhZilcblx0XHR7XG5cdFx0XHRjb25zdCBzdHJ1Y3RzID0gKDxTdHJ1Y3RbXT4oPExlYXZlcy5Tb3J0PmxlYWYpLmNvbnRlbnRUeXBlcykuZmlsdGVyKCh4KSA9PiAhIXgpLnJldmVyc2UoKTtcblx0XHRcdFxuXHRcdFx0Y29uc3Qgc25hcCA9IHRoaXMuc25hcHNob3QoKTtcblx0XHRcdFxuXHRcdFx0c25hcC5zb3J0KCh4LHkpID0+IHhbdmFsdWVdIC0geVt2YWx1ZV0pO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHN0cnVjdCBvZiBzdHJ1Y3RzKVxuXHRcdFx0XHRzbmFwLnNvcnQoKGEsIGIpID0+IFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKCEoYSBpbnN0YW5jZW9mIFN1cnJvZ2F0ZSkpIFxuXHRcdFx0XHRcdFx0aWYgKCEoYiBpbnN0YW5jZW9mIFN1cnJvZ2F0ZSkpXG5cdFx0XHRcdFx0XHRcdHJldHVybiAwO1xuXHRcdFx0XHRcdFx0ZWxzZSByZXR1cm4gLTE7XG5cdFx0XHRcdFx0ZWxzZSBpZiAoIShiIGluc3RhbmNlb2YgU3Vycm9nYXRlKSlcblx0XHRcdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvbnN0IHAxID0gYS5nZXQoc3RydWN0KTtcblx0XHRcdFx0XHRjb25zdCBwMiA9IGIuZ2V0KHN0cnVjdCk7XG5cdFx0XHRcdFx0Y29uc3QgdjE6IG51bWJlciA9IHAxID8gPGFueT5wMVt2YWx1ZV0gfHwgMDogMDtcblx0XHRcdFx0XHRjb25zdCB2MjogbnVtYmVyID0gcDIgPyA8YW55PnAyW3ZhbHVlXSB8fCAwOiAwO1xuXHRcdFx0XHRcdHJldHVybiB2MSAtIHYyO1xuXHRcdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldChzbmFwKTtcblx0XHR9XG5cdFx0XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXJcbntcblx0XG5cdGV4cG9ydCB0eXBlIFR5cGVpc2ggPSBUcnV0aC5UeXBlIHzCoFR5cGUgfCBudW1iZXI7XG5cdFxuXHRleHBvcnQgY2xhc3MgRnV0dXJlVHlwZVxuXHR7XG5cdFx0c3RhdGljIENhY2hlID0gbmV3IE1hcDxUeXBlaXNoLCBGdXR1cmVUeXBlPigpO1xuXHRcdHN0YXRpYyBUeXBlTWFwID0gbmV3IE1hcDxUcnV0aC5UeXBlLCBUeXBlPigpO1xuXHRcdHN0YXRpYyBJZE1hcCA9IG5ldyBNYXA8bnVtYmVyLCBUeXBlPigpO1xuXHRcdFxuXHRcdHN0YXRpYyBuZXcodmFsdWU6IFR5cGVpc2gpXG5cdFx0e1xuXHRcdFx0Y29uc3QgY2FjaGVkID0gRnV0dXJlVHlwZS5DYWNoZS5nZXQodmFsdWUpO1xuXHRcdFx0XG5cdFx0XHRpZiAoY2FjaGVkKVxuXHRcdFx0XHRyZXR1cm4gY2FjaGVkO1xuXHRcdFx0XHRcblx0XHRcdGNvbnN0IGluc3RhbmNlID0gbmV3IEZ1dHVyZVR5cGUodmFsdWUpO1xuXHRcdFx0RnV0dXJlVHlwZS5DYWNoZS5zZXQodmFsdWUsIGluc3RhbmNlKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGluc3RhbmNlO1xuXHRcdH0gXG5cdFx0XG5cdFx0Y29uc3RydWN0b3IocHJpdmF0ZSB2YWx1ZTogVHlwZWlzaCkgeyB9XG5cdFx0IFxuXHRcdGdldCB0eXBlKClcblx0XHR7XG5cdFx0XHRpZiAodGhpcy52YWx1ZSBpbnN0YW5jZW9mIFRydXRoLlR5cGUpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHR5cGUgPSBGdXR1cmVUeXBlLlR5cGVNYXAuZ2V0KHRoaXMudmFsdWUpO1xuXHRcdFx0XHRpZiAoIXR5cGUpIFxuXHRcdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0XHRyZXR1cm4gdHlwZTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMudmFsdWUgaW5zdGFuY2VvZiBUeXBlKVxuXHRcdFx0XHRyZXR1cm4gdGhpcy52YWx1ZTtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gRnV0dXJlVHlwZS5JZE1hcC5nZXQodGhpcy52YWx1ZSkgfHwgbnVsbDtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGlkKClcblx0XHR7XG5cdFx0XHRpZiAodGhpcy52YWx1ZSBpbnN0YW5jZW9mIFRydXRoLlR5cGUpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHR5cGUgPSBGdXR1cmVUeXBlLlR5cGVNYXAuZ2V0KHRoaXMudmFsdWUpO1xuXHRcdFx0XHRpZiAoIXR5cGUpIFxuXHRcdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdFx0cmV0dXJuIHR5cGUuaWQ7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGlmICh0aGlzLnZhbHVlIGluc3RhbmNlb2YgVHlwZSlcblx0XHRcdFx0cmV0dXJuIHRoaXMudmFsdWUuaWQ7XG5cdFx0XHRcdFxuXHRcdFx0cmV0dXJuIHRoaXMudmFsdWU7XG5cdFx0fVxuXHRcdFxuXHRcdGlzKHR5cGU6IFR5cGUpXG5cdFx0e1xuXHRcdFx0Y29uc3QgdmFsdWVUeXBlID0gdGhpcy52YWx1ZTtcblx0XHRcdGlmICghdmFsdWVUeXBlKSByZXR1cm4gZmFsc2U7XG5cdFx0XHRyZXR1cm4gdmFsdWVUeXBlID09PSB0eXBlO1x0XG5cdFx0fVxuXHRcdFxuXHRcdHRvSlNPTigpIHsgcmV0dXJuIHRoaXMuaWQ7IH1cblx0XHR2YWx1ZU9mKCkgeyByZXR1cm4gdGhpcy5pZDsgfVxuXHRcdFtTeW1ib2wudG9QcmltaXRpdmVdKCkgeyByZXR1cm4gdGhpcy5pZDsgfVxuXHRcdGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpIHsgcmV0dXJuIFwiRnV0dXJlVHlwZVwiOyB9XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXIuVHJ1dGhUYWxrXG57XG5cdGV4cG9ydCBjb25zdCBvcCA9IFN5bWJvbChcIm9wXCIpO1xuXHRleHBvcnQgY29uc3QgY29udGFpbmVyID0gU3ltYm9sKFwiY29udGFpbmVyXCIpO1xuXHRcblx0LyoqICovXG5cdGV4cG9ydCBlbnVtIEJyYW5jaE9wXG5cdHtcblx0XHRxdWVyeSA9IDEsXG5cdFx0aXMgPSAyLFxuXHRcdGhhcyA9IDMsXG5cdFx0bm90ID0gNCxcblx0XHRvciA9IDUsXG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgZW51bSBQcmVkaWNhdGVPcFxuXHR7XG5cdFx0ZXF1YWxzID0gMzAsXG5cdFx0Z3JlYXRlclRoYW4gPSAzMSxcblx0XHRncmVhdGVyVGhhbk9yRXF1YWxzID0gMzIsXG5cdFx0bGVzc1RoYW4gPSAzMyxcblx0XHRsZXNzVGhhbk9yRXF1YWxzID0gMzQsXG5cdFx0YWxpa2UgPSAzNSxcblx0XHRzdGFydHNXaXRoID0gMzYsXG5cdFx0ZW5kc1dpdGggID0gMzcsXG5cdFx0aW5jbHVkZXMgPSAzOCxcblx0XHRtYXRjaGVzID0gMzksXG5cdFx0bmFtZWQgPSA0MFxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGVudW0gTGVhZk9wXG5cdHtcblx0XHRwcmVkaWNhdGUgPSA2MCxcblx0XHRzbGljZSA9IDYxLFxuXHRcdG9jY3VyZW5jZXMgPSA2Mixcblx0XHRhbGlhc2VkID0gNjMsXG5cdFx0dGVybWluYWxzID0gNjQsXG5cdFx0c29ydCA9IDY1LFxuXHRcdHJldmVyc2UgPSA2Nixcblx0XHRzdXJyb2dhdGUgPSA2Nyxcblx0XHRjb250YWluZXJzID0gNjgsXG5cdFx0cm9vdHMgPSA2OSxcblx0XHRjb250ZW50cyA9IDcwLFxuXHRcdGxlYXZlcyA9IDcxLFxuXHRcdGZyZXNoID0gNzIsXG5cdFx0bmFtZXMgPSA3Myxcblx0XHRzdW0gPSA3NCxcblx0XHRhdmcgPSA3NSxcblx0XHRtaW4gPSA3Nixcblx0XHRtYXggPSA3Nyxcblx0XHRjb3VudCA9IDc4XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgdHlwZSBOb2RlT3AgPVxuXHRcdEJyYW5jaE9wIHwgXG5cdFx0TGVhZk9wIHxcblx0XHRQcmVkaWNhdGVPcDtcblx0XG5cdC8vIyBBYnN0cmFjdCBDbGFzc2VzXG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGFic3RyYWN0IGNsYXNzIE5vZGVcblx0e1xuXHRcdGFic3RyYWN0IHJlYWRvbmx5IFtvcF06IE5vZGVPcDtcblx0XHRcblx0XHRyZWFkb25seSBbY29udGFpbmVyXTogQnJhbmNoIHwgbnVsbCA9IG51bGw7XG5cdFx0XG5cdFx0W1JlZmxleC5hdG9tXShkZXN0aW5hdGlvbjogQnJhbmNoKVxuXHRcdHtcblx0XHRcdGRlc3RpbmF0aW9uLmFkZENoaWxkKHRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHRzZXRDb250YWluZXIoY29udDogQnJhbmNoIHzCoG51bGwpXG5cdFx0e1xuXHRcdFx0Ly9AdHMtaWdub3JlXG5cdFx0XHR0aGlzW2NvbnRhaW5lcl0gPSBjb250O1xuXHRcdH1cblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCcmFuY2ggZXh0ZW5kcyBOb2RlXG5cdHtcblx0XHQvKiogKi9cblx0XHRhZGRDaGlsZChjaGlsZDogTm9kZSwgcG9zaXRpb24gPSAtMSlcblx0XHR7XG5cdFx0XHRjaGlsZC5zZXRDb250YWluZXIodGhpcyk7XG5cdFx0XHRcblx0XHRcdGlmIChwb3NpdGlvbiA9PT0gLTEpXG5cdFx0XHRcdHJldHVybiB2b2lkIHRoaXMuX2NoaWxkcmVuLnB1c2goY2hpbGQpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBhdCA9IHRoaXMuX2NoaWxkcmVuLmxlbmd0aCAtIHBvc2l0aW9uICsgMTtcblx0XHRcdHRoaXMuX2NoaWxkcmVuLnNwbGljZShhdCwgMCwgY2hpbGQpO1xuXHRcdFx0cmV0dXJuIGNoaWxkO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRyZW1vdmVDaGlsZChjaGlsZDogTm9kZSk6IE5vZGUgfCBudWxsO1xuXHRcdHJlbW92ZUNoaWxkKGNoaWxkSWR4OiBudW1iZXIpIDogTm9kZXwgbnVsbDtcblx0XHRyZW1vdmVDaGlsZChwYXJhbTogTm9kZSB8IG51bWJlcilcblx0XHR7XG5cdFx0XHRjb25zdCBjaGlsZElkeCA9IHBhcmFtIGluc3RhbmNlb2YgTm9kZSA/XG5cdFx0XHRcdHRoaXMuX2NoaWxkcmVuLmluZGV4T2YocGFyYW0pIDpcblx0XHRcdFx0cGFyYW07XG5cdFx0XHRcblx0XHRcdGlmIChjaGlsZElkeCA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHJlbW92ZWQgPSB0aGlzLl9jaGlsZHJlbi5zcGxpY2UoY2hpbGRJZHgsIDEpWzBdO1xuXHRcdFx0XHRyZW1vdmVkLnNldENvbnRhaW5lcihudWxsKTtcblx0XHRcdFx0cmV0dXJuIHJlbW92ZWQ7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgY2hpbGRyZW4oKTogcmVhZG9ubHkgKEJyYW5jaCB8IExlYWYpW11cblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2hpbGRyZW47XG5cdFx0fVxuXHRcdHByaXZhdGUgcmVhZG9ubHkgX2NoaWxkcmVuOiAoQnJhbmNoIHwgTGVhZilbXSA9IFtdO1xuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGFic3RyYWN0IGNsYXNzIExlYWYgZXh0ZW5kcyBOb2RlIHsgfVxuXHRcblx0Ly8jIENvbmNyZXRlIENsYXNzZXNcblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgbmFtZXNwYWNlIEJyYW5jaGVzXG5cdHtcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgUXVlcnkgZXh0ZW5kcyBCcmFuY2hcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gQnJhbmNoT3AucXVlcnk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBJcyBleHRlbmRzIEJyYW5jaFxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBCcmFuY2hPcC5pcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIEhhcyBleHRlbmRzIEJyYW5jaFxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBCcmFuY2hPcC5oYXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBOb3QgZXh0ZW5kcyBCcmFuY2hcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gQnJhbmNoT3Aubm90O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgT3IgZXh0ZW5kcyBCcmFuY2hcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gQnJhbmNoT3Aub3I7XG5cdFx0fVxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IG5hbWVzcGFjZSBMZWF2ZXNcblx0e1xuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBQcmVkaWNhdGUgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXTogUHJlZGljYXRlT3A7XG5cdFx0XHRcblx0XHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0XHRvcHY6IFByZWRpY2F0ZU9wLFxuXHRcdFx0XHRyZWFkb25seSBvcGVyYW5kOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuKVxuXHRcdFx0e1xuXHRcdFx0XHRzdXBlcigpO1xuXHRcdFx0XHQvL0B0cy1pZ25vcmVcblx0XHRcdFx0dGhpc1tvcF0gPSBvcHY7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBTbGljZSBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdFx0cmVhZG9ubHkgc3RhcnQ6IG51bWJlciwgXG5cdFx0XHRcdHJlYWRvbmx5IGVuZD86IG51bWJlcilcblx0XHRcdHtcblx0XHRcdFx0c3VwZXIoKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5zbGljZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIE9jY3VyZW5jZXMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRcdHJlYWRvbmx5IG1pbjogbnVtYmVyLFxuXHRcdFx0XHRyZWFkb25seSBtYXg6IG51bWJlciA9IG1pbilcblx0XHRcdHtcblx0XHRcdFx0c3VwZXIoKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5vY2N1cmVuY2VzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgQWxpYXNlZCBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLmFsaWFzZWQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBMZWF2ZXMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5sZWF2ZXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBGcmVzaCBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLmZyZXNoO1xuXHRcdH1cblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgVGVybWluYWxzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AudGVybWluYWxzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgU29ydCBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRcblx0XHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0XHQuLi5jb250ZW50VHlwZXM6IE9iamVjdFtdKVxuXHRcdFx0e1xuXHRcdFx0XHRzdXBlcigpO1xuXHRcdFx0XHR0aGlzLmNvbnRlbnRUeXBlcyA9IGNvbnRlbnRUeXBlcztcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmVhZG9ubHkgY29udGVudFR5cGVzOiBPYmplY3RbXTtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3Auc29ydDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFJldmVyc2UgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5yZXZlcnNlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgU3Vycm9nYXRlIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3Auc3Vycm9nYXRlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgQ29udGFpbmVycyBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLmNvbnRhaW5lcnM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBSb290cyBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLnJvb3RzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgQ29udGVudHMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5jb250ZW50cztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIE5hbWVzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AubmFtZXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBTdW0gZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5zdW07XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBBdmcgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5hdmc7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBNaW4gZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5taW47XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBNYXggZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5tYXg7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBDb3VudCBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLmNvdW50O1xuXHRcdH1cblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgQmFja2VyXG57XG5cdGV4cG9ydCB0eXBlIFByb3RvdHlwZUpTT04gPSBbbnVtYmVyLCBudW1iZXIsIC4uLm51bWJlcltdW11dO1xuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIFByb3RvdHlwZSBcblx0e1xuXHRcdC8qKlxuXHRcdCAqIEdlbmVyYXRlIGEgUHJvdG90eXBlIGZyb20gVHJ1dGguVHlwZVxuXHRcdCAqL1xuXHRcdHN0YXRpYyBuZXcoY29kZTogQ29kZSwgdHlwZTogVHJ1dGguVHlwZSlcblx0XHR7XG5cdFx0XHRjb25zdCBmbGFncyA9IG5ldyBCaXRmaWVsZHMoKTtcblx0XHRcdFxuXHRcdFx0ZmxhZ3Muc2V0KDAsIHR5cGUuaXNBbm9ueW1vdXMpO1xuXHRcdFx0ZmxhZ3Muc2V0KDEsIHR5cGUuaXNGcmVzaCk7XG5cdFx0XHRmbGFncy5zZXQoMiwgdHlwZS5pc0xpc3QpO1xuXHRcdFx0ZmxhZ3Muc2V0KDMsIHR5cGUuaXNMaXN0SW50cmluc2ljKTtcblx0XHRcdGZsYWdzLnNldCg0LCB0eXBlLmlzTGlzdEV4dHJpbnNpYyk7XG5cdFx0XHRmbGFncy5zZXQoNSwgdHlwZS5pc1BhdHRlcm4pO1xuXHRcdFx0ZmxhZ3Muc2V0KDYsIHR5cGUuaXNVcmkpO1xuXHRcdFx0ZmxhZ3Muc2V0KDcsIHR5cGUuaXNTcGVjaWZpZWQpO1xuXHRcdFx0XG5cdFx0XHRsZXQgcHJvdG8gPSBuZXcgUHJvdG90eXBlKFxuXHRcdFx0XHRjb2RlLCBcblx0XHRcdFx0ZmxhZ3MsXG5cdFx0XHRcdG5ldyBUeXBlU2V0KHR5cGUuYmFzZXMubWFwKEZ1dHVyZVR5cGUubmV3KSksXG5cdFx0XHRcdG5ldyBUeXBlU2V0KHR5cGUucGF0dGVybnMubWFwKEZ1dHVyZVR5cGUubmV3KSksXG5cdFx0XHRcdG5ldyBUeXBlU2V0KHR5cGUucGFyYWxsZWxzLm1hcChGdXR1cmVUeXBlLm5ldykpLFxuXHRcdFx0XHRuZXcgVHlwZVNldCh0eXBlLmNvbnRlbnRzSW50cmluc2ljLm1hcChGdXR1cmVUeXBlLm5ldykpXG5cdFx0XHQpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBleCA9IGNvZGUucHJvdG90eXBlcy5maW5kKHggPT4geC5oYXNoID09PSBwcm90by5oYXNoKTtcblx0XHRcdFxuXHRcdFx0aWYgKGV4KSBcblx0XHRcdFx0cHJvdG8gPSBleDtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gcHJvdG87XG5cdFx0fVxuXHRcblx0XHQvKipcblx0XHQgKiBMb2FkIFByb3RvdHlwZSBmcm9tIENvZGVKU09OXG5cdFx0ICovXG5cdFx0c3RhdGljIGxvYWQoY29kZTogQ29kZSwgc2VyaWFsaXplZDogUHJvdG90eXBlSlNPTilcblx0XHR7XG5cdFx0XHRjb25zdCBkYXRhID0gVXRpbC5kZWNvZGUoc2VyaWFsaXplZCwgNSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBuZXcgUHJvdG90eXBlKFxuXHRcdFx0XHRjb2RlLCBcblx0XHRcdFx0bmV3IEJpdGZpZWxkcyhkYXRhWzBdKSxcblx0XHRcdFx0VHlwZVNldC5mcm9tSlNPTihkYXRhWzFdKSxcblx0XHRcdFx0VHlwZVNldC5mcm9tSlNPTihkYXRhWzJdKSxcblx0XHRcdFx0VHlwZVNldC5mcm9tSlNPTihkYXRhWzNdKSxcblx0XHRcdFx0VHlwZVNldC5mcm9tSlNPTihkYXRhWzRdKVxuXHRcdFx0KTtcblx0XHR9XG5cdFx0XG5cdFx0XG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRwcml2YXRlIGNvZGU6IENvZGUsXG5cdFx0XHRwdWJsaWMgZmxhZ3M6IEJpdGZpZWxkcyxcblx0XHRcdFxuXHRcdFx0cHVibGljIGJhc2VzID0gbmV3IFR5cGVTZXQoKSxcblx0XHRcdHB1YmxpYyBwYXR0ZXJucyA9IG5ldyBUeXBlU2V0KCksXG5cdFx0XHRwdWJsaWMgcGFyYWxsZWxzID0gbmV3IFR5cGVTZXQoKSxcblx0XHRcdHB1YmxpYyBjb250ZW50c0ludHJpbnNpYyA9IG5ldyBUeXBlU2V0KCkpIHt9XG5cdFx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgaWQoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmNvZGUucHJvdG90eXBlcy5pbmRleE9mKHRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgaGFzaCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFV0aWwuaGFzaChKU09OLnN0cmluZ2lmeSh0aGlzKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRyYW5zZmVyIG93bmVyc2hpcCBvZiB0aGlzIGluc3RhbmNlIHRvIGFub3RoZXIgQ29kZSBpbnN0YW5jZVxuXHRcdCAqL1xuXHRcdHRyYW5zZmVyKGNvZGU6IENvZGUpXG5cdFx0e1xuXHRcdFx0dGhpcy5jb2RlID0gY29kZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0dG9KU09OKClcblx0XHR7XHRcblx0XHRcdHJldHVybiBVdGlsLmVuY29kZShbXG5cdFx0XHRcdHRoaXMuZmxhZ3MsIHRoaXMuYmFzZXMsIHRoaXMucGF0dGVybnMsIHRoaXMucGFyYWxsZWxzLCB0aGlzLmNvbnRlbnRzSW50cmluc2ljXG5cdFx0XHRdKTtcblx0XHR9XHRcdFxuXHR9XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyLlRydXRoVGFsa1xue1xuXHRleHBvcnQgbGV0IHR0OiBSZWZsZXguQ29yZS5Bc0xpYnJhcnk8QmFja2VyLlRydXRoVGFsay5OYW1lc3BhY2UsIEJhY2tlci5UcnV0aFRhbGsuTGlicmFyeT47XG5cdFxuXHRleHBvcnQgY2xhc3MgTGlicmFyeSBpbXBsZW1lbnRzIFJlZmxleC5Db3JlLklMaWJyYXJ5XG5cdHtcblx0XHRcblx0XHQvKiogKi9cblx0XHRpc0tub3duQnJhbmNoKGJyYW5jaDogQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiBicmFuY2ggaW5zdGFuY2VvZiBOb2RlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRpc0JyYW5jaERpc3Bvc2VkKGJyYW5jaDogUmVmbGV4LkNvcmUuSUJyYW5jaClcblx0XHR7XG5cdFx0XHRyZXR1cm4gYnJhbmNoIGluc3RhbmNlb2YgQnJhbmNoICYmIGJyYW5jaFtjb250YWluZXJdICE9PSBudWxsO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXRSb290QnJhbmNoKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IEJyYW5jaGVzLlF1ZXJ5KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldFN0YXRpY0JyYW5jaGVzKClcblx0XHR7XG5cdFx0XHRjb25zdCBicmFuY2hlczogYW55ID0ge307XG5cdFx0XHRcblx0XHRcdE9iamVjdC5lbnRyaWVzKEJyYW5jaGVzKS5mb3JFYWNoKChbYnJhbmNoTmFtZSwgYnJhbmNoQ3Rvcl0pID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IG5hbWUgPSBicmFuY2hOYW1lLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdGJyYW5jaGVzW25hbWVdID0gKCkgPT4gbmV3IGJyYW5jaEN0b3IoKTtcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gYnJhbmNoZXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldFN0YXRpY05vbkJyYW5jaGVzKClcblx0XHR7XG5cdFx0XHRjb25zdCBsZWF2ZXM6IGFueSA9IHt9O1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhMZWF2ZXMpKVxuXHRcdFx0XHRsZWF2ZXNba2V5LnRvTG93ZXJDYXNlKCldID0gKGFyZzE6IFByZWRpY2F0ZU9wLCBhcmcyOiBudW1iZXIpID0+IG5ldyB2YWx1ZShhcmcxLCBhcmcyKTtcblx0XHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGtleSBpbiBQcmVkaWNhdGVPcClcblx0XHRcdFx0aWYgKGlzTmFOKHBhcnNlSW50KGtleSkpKVxuXHRcdFx0XHRcdGxlYXZlc1trZXldID0gKHZhbHVlOiBhbnkpID0+IG5ldyBMZWF2ZXMuUHJlZGljYXRlKCg8YW55PlByZWRpY2F0ZU9wKVtrZXldLCB2YWx1ZSk7XG5cdFx0XHRcdFxuXHRcdFx0cmV0dXJuIGxlYXZlcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0Q2hpbGRyZW4odGFyZ2V0OiBCcmFuY2gpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRhcmdldC5jaGlsZHJlbjtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y3JlYXRlQ29udGFpbmVyKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IEJyYW5jaGVzLlF1ZXJ5KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGF0dGFjaEF0b20oXG5cdFx0XHRhdG9taWM6IE5vZGUsXG5cdFx0XHRvd25lcjogQnJhbmNoLFxuXHRcdFx0cmVmOiBOb2RlIHwgXCJwcmVwZW5kXCIgfCBcImFwcGVuZFwiKVxuXHRcdHtcblx0XHRcdGlmICghKGF0b21pYyBpbnN0YW5jZW9mIE5vZGUpKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcblx0XHRcdGNvbnN0IHBvcyA9XG5cdFx0XHRcdHJlZiA9PT0gXCJhcHBlbmRcIiA/IC0xIDpcblx0XHRcdFx0cmVmID09PSBcInByZXBlbmRcIiA/IDAgOlxuXHRcdFx0XHQvLyBQbGFjZXMgdGhlIGl0ZW0gYXQgdGhlIGVuZCwgaW4gdGhlIGNhc2Ugd2hlbiBcblx0XHRcdFx0Ly8gcmVmIHdhc24ndCBmb3VuZCBpbiB0aGUgb3duZXIuIClUaGlzIHNob3VsZFxuXHRcdFx0XHQvLyBuZXZlciBhY3R1YWxseSBoYXBwZW4uKVxuXHRcdFx0XHRvd25lci5jaGlsZHJlbi5pbmRleE9mKHJlZikgKyAxIHx8IC0xO1xuXHRcdFx0XG5cdFx0XHRvd25lci5hZGRDaGlsZChhdG9taWMsIHBvcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGRldGFjaEF0b20oYXRvbWljOiBOb2RlLCBvd25lcjogQnJhbmNoKVxuXHRcdHtcblx0XHRcdG93bmVyLnJlbW92ZUNoaWxkKGF0b21pYyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHN3YXBCcmFuY2hlcyhicmFuY2gxOiBCcmFuY2gsIGJyYW5jaDI6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRpZiAoYnJhbmNoMVtUcnV0aFRhbGsuY29udGFpbmVyXSA9PT0gbnVsbCB8fCBicmFuY2gyW1RydXRoVGFsay5jb250YWluZXJdID09PSBudWxsKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3Qgc3dhcCB0b3AtbGV2ZWwgYnJhbmNoZXMuXCIpO1xuXHRcdFx0XG5cdFx0XHRpZiAoYnJhbmNoMVtUcnV0aFRhbGsuY29udGFpbmVyXSAhPT0gYnJhbmNoMltUcnV0aFRhbGsuY29udGFpbmVyXSlcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgc3dhcCBicmFuY2hlcyBmcm9tIHRoZSBzYW1lIGNvbnRhaW5lci5cIik7XG5cdFx0XHRcblx0XHRcdGNvbnN0IGNvbnRhaW5lciA9IGJyYW5jaDFbVHJ1dGhUYWxrLmNvbnRhaW5lcl0hO1xuXHRcdFx0Y29uc3QgaWR4MSA9IGNvbnRhaW5lci5jaGlsZHJlbi5pbmRleE9mKGJyYW5jaDEpO1xuXHRcdFx0Y29uc3QgaWR4MiA9IGNvbnRhaW5lci5jaGlsZHJlbi5pbmRleE9mKGJyYW5jaDIpO1xuXHRcdFx0Y29uc3QgaWR4TWF4ID0gTWF0aC5tYXgoaWR4MSwgaWR4Mik7XG5cdFx0XHRjb25zdCBpZHhNaW4gPSBNYXRoLm1pbihpZHgxLCBpZHgyKTtcblx0XHRcdGNvbnN0IHJlbW92ZWRNYXggPSBjb250YWluZXIucmVtb3ZlQ2hpbGQoaWR4TWF4KTtcblx0XHRcdGNvbnN0IHJlbW92ZWRNaW4gPSBjb250YWluZXIucmVtb3ZlQ2hpbGQoaWR4TWluKTtcblx0XHRcdFxuXHRcdFx0aWYgKCFyZW1vdmVkTWF4IHx8ICFyZW1vdmVkTWluKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnRlcm5hbCBFcnJvci5cIik7XG5cdFx0XHRcblx0XHRcdGNvbnRhaW5lci5hZGRDaGlsZChyZW1vdmVkTWF4LCBpZHhNaW4pO1xuXHRcdFx0Y29udGFpbmVyLmFkZENoaWxkKHJlbW92ZWRNaW4sIGlkeE1heCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlcGxhY2VCcmFuY2goYnJhbmNoMTogQnJhbmNoLCBicmFuY2gyOiBCcmFuY2gpXG5cdFx0e1xuXHRcdFx0aWYgKGJyYW5jaDFbVHJ1dGhUYWxrLmNvbnRhaW5lcl0gPT09IG51bGwpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZXBsYWNlIHRvcC1sZXZlbCBicmFuY2hlcy5cIik7XG5cdFx0XHRcblx0XHRcdGNvbnN0IGNvbnRhaW5lciA9IGJyYW5jaDFbVHJ1dGhUYWxrLmNvbnRhaW5lcl0hO1xuXHRcdFx0Y29uc3QgaWR4ID0gY29udGFpbmVyLmNoaWxkcmVuLmluZGV4T2YoYnJhbmNoMSk7XG5cdFx0XHRjb250YWluZXIucmVtb3ZlQ2hpbGQoaWR4KTtcblx0XHRcdGNvbnRhaW5lci5hZGRDaGlsZChicmFuY2gyLCBpZHgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhdHRhY2hBdHRyaWJ1dGUoYnJhbmNoOiBCcmFuY2gsIGtleTogc3RyaW5nLCB2YWx1ZTogYW55KVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBzdXBwb3J0ZWQuXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRkZXRhY2hBdHRyaWJ1dGUoYnJhbmNoOiBCcmFuY2gsIGtleTogc3RyaW5nKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBzdXBwb3J0ZWQuXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhdHRhY2hSZWN1cnJlbnQoXG5cdFx0XHRraW5kOiBSZWZsZXguQ29yZS5SZWN1cnJlbnRLaW5kLFxuXHRcdFx0dGFyZ2V0OiBSZWZsZXguQ29yZS5JQnJhbmNoLFxuXHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdGNhbGxiYWNrOiBSZWZsZXguUmVjdXJyZW50Q2FsbGJhY2ssXG5cdFx0XHRyZXN0OiBhbnlbXSlcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3Qgc3VwcG9ydGVkLlwiKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZGV0YWNoUmVjdXJyZW50KFxuXHRcdFx0dGFyZ2V0OiBSZWZsZXguQ29yZS5JQnJhbmNoLFxuXHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdGNhbGxiYWNrOiBSZWZsZXguUmVjdXJyZW50Q2FsbGJhY2spXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IHN1cHBvcnRlZC5cIik7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59XG5cbi8qKlxuICogR2xvYmFsIGxpYnJhcnkgb2JqZWN0LlxuICovXG5jb25zdCB0dCA9IFJlZmxleC5Db3JlLmNyZWF0ZUJyYW5jaE5hbWVzcGFjZTxCYWNrZXIuVHJ1dGhUYWxrLk5hbWVzcGFjZSwgQmFja2VyLlRydXRoVGFsay5MaWJyYXJ5Pihcblx0bmV3IEJhY2tlci5UcnV0aFRhbGsuTGlicmFyeSgpLFxuXHR0cnVlKTtcblxuQmFja2VyLlRydXRoVGFsay50dCA9IHR0OyIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOb2Rlcy50c1wiLz5cblxubmFtZXNwYWNlIEJhY2tlclxue1xuXHRleHBvcnQgY29uc3QgdHlwZU9mID0gU3ltYm9sKFwidHlwZU9mXCIpO1xuXHRleHBvcnQgY29uc3QgdmFsdWUgPSBTeW1ib2woXCJ2YWx1ZVwiKTtcblx0ZXhwb3J0IGNvbnN0IG5hbWUgPSBTeW1ib2woXCJuYW1lXCIpO1xuXHRleHBvcnQgY29uc3QgdmFsdWVzID0gU3ltYm9sKFwidmFsdWVzXCIpO1xuXHRleHBvcnQgY29uc3QgcGFyZW50ID0gU3ltYm9sKFwicGFyZW50XCIpO1xuXHRcblx0ZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJhc2U8VCwgUT4gZXh0ZW5kcyBUcnV0aFRhbGsuTGVhdmVzLlN1cnJvZ2F0ZVxuXHR7XG5cdFx0YWJzdHJhY3QgW3ZhbHVlXTogVDtcblx0XHRcblx0XHRbcGFyZW50XTogUSB8wqBudWxsO1xuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKHBhcmVudFZhbHVlOiBRIHwgbnVsbClcblx0XHR7XG5cdFx0XHRzdXBlcigpO1xuXHRcdFx0dGhpc1twYXJlbnRdID0gcGFyZW50VmFsdWU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENsaW1iIHRvIHJvb3Qgb2YgdGhpcyBTdHJ1Y3Rcblx0XHQgKi9cblx0XHRnZXQgcm9vdCgpOiBCYXNlPFQsIFE+IHzCoG51bGxcblx0XHR7XG5cdFx0XHRsZXQgcm9vdDogYW55ID0gdGhpcztcblx0XHRcdFxuXHRcdFx0d2hpbGUgKHJvb3QgJiYgcm9vdFtwYXJlbnRdKSBcblx0XHRcdFx0cm9vdCA9IHJvb3RbcGFyZW50XTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHJvb3Q7XG5cdFx0fVxuXHRcdFxuXHRcdHRvSlNPTigpeyByZXR1cm4gdGhpc1t2YWx1ZV07IH1cblx0XHR2YWx1ZU9mKCkgeyByZXR1cm4gdGhpc1t2YWx1ZV07IH1cblx0XHR0b1N0cmluZygpIFxuXHRcdHtcblx0XHRcdGNvbnN0IHZhbCA9IHRoaXNbdmFsdWVdO1xuXHRcdFx0aWYgKHZhbCA9PT0gbnVsbClcblx0XHRcdFx0cmV0dXJuIHZhbDtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIFN0cmluZyh2YWwpO1xuXHRcdH1cblx0XHRbU3ltYm9sLnRvUHJpbWl0aXZlXSgpIHsgcmV0dXJuIHRoaXNbdmFsdWVdOyB9XG5cdFx0Z2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkgeyByZXR1cm4gXCJQcm94eVwiOyB9XG5cdH1cblx0XG5cdGV4cG9ydCBjbGFzcyBTdW1tYXJ5IGV4dGVuZHMgQmFzZTxhbnksIFN0cnVjdFtdPlxuXHR7XHRcblx0XHRbcGFyZW50XTogU3RydWN0W107XG5cdFx0XG5cdFx0Y29uc3RydWN0b3IocHVibGljIHZhbHVlOiBhbnksIGNvbnRhaW5lcnM6IFN0cnVjdFtdKVxuXHRcdHtcblx0XHRcdHN1cGVyKGNvbnRhaW5lcnMpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgW3ZhbHVlXSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudmFsdWU7XG5cdFx0fVxuXHR9XG5cdFxuXHRleHBvcnQgY2xhc3MgTmFtZSBleHRlbmRzIEJhc2U8c3RyaW5nLCBTdHJ1Y3Q+XG5cdHtcblx0XHRjb25zdHJ1Y3RvcihwdWJsaWMgbmFtZTogc3RyaW5nLCBjb250YWluZXI6IFN0cnVjdCB8wqBudWxsKVxuXHRcdHtcblx0XHRcdHN1cGVyKGNvbnRhaW5lcik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBbdmFsdWVdKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5uYW1lO1xuXHRcdH1cblx0fVxuXHRcblx0ZXhwb3J0IGNsYXNzIFN0cnVjdCBleHRlbmRzIEJhc2U8YW55LCBTdHJ1Y3QgfCBTdXJyb2dhdGU+XG5cdHtcblx0XHQvKipcblx0XHQgKiBHZW5lcmF0ZSBhIFN0cnVjdC9TdXJyb2dhdGUgZnJvbSBCYWNrZXIuVHlwZVxuXHRcdCAqL1xuXHRcdHN0YXRpYyBuZXcodHlwZTogVHlwZSwgcGFyZW50VmFsdWU6IFN0cnVjdCB8wqBTdXJyb2dhdGUgfCBudWxsKVxuXHRcdHtcblx0XHRcdGNvbnN0IGNvbnN0ciA9IHBhcmVudFZhbHVlID8gXG5cdFx0XHRcdHBhcmVudFZhbHVlIGluc3RhbmNlb2YgU3Vycm9nYXRlID9cblx0XHRcdFx0U3Vycm9nYXRlIDogU3RydWN0IDogU3RydWN0O1xuXHRcdFx0XHRcblx0XHRcdHJldHVybiBuZXcgY29uc3RyKHR5cGUsIHBhcmVudFZhbHVlKTtcblx0XHR9XG5cdFx0XG5cdFx0cmVhZG9ubHkgW3R5cGVPZl06IFR5cGU7XG5cdFx0cmVhZG9ubHkgW25hbWVdOiBOYW1lO1xuXHRcdHJlYWRvbmx5IFtwYXJlbnRdOiBTdHJ1Y3QgfCBudWxsO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBbdmFsdWVzXSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXNbdHlwZU9mXS52YWx1ZXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBbdmFsdWVdKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpc1t0eXBlT2ZdLnZhbHVlO1xuXHRcdH1cblx0XHRcblx0XHRjb25zdHJ1Y3Rvcih0eXBlOiBUeXBlLCBwYXJlbnRWYWx1ZTogU3RydWN0IHwgbnVsbClcblx0XHR7XG5cdFx0XHRzdXBlcihwYXJlbnRWYWx1ZSk7XG5cdFx0XHR0aGlzW3R5cGVPZl0gPSB0eXBlO1xuXHRcdFx0dGhpc1twYXJlbnRdID0gcGFyZW50VmFsdWU7XG5cdFx0XHR0aGlzW25hbWVdID0gbmV3IE5hbWUodHlwZS5uYW1lLCB0aGlzKTtcblx0XHRcdFxuXHRcdFx0VXRpbC5zaGFkb3dzKHRoaXMsIGZhbHNlLCB0eXBlT2YsIHZhbHVlcywgVHJ1dGhUYWxrLm9wLCBwYXJlbnQsIFRydXRoVGFsay5jb250YWluZXIpO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGNoaWxkIG9mIHR5cGUuY29udGVudHMpXG5cdFx0XHRcdCg8YW55PnRoaXMpW2NoaWxkLm5hbWUucmVwbGFjZSgvW15cXGRcXHddL2dtLCAoKSA9PiBcIl9cIildID0gU3RydWN0Lm5ldyhjaGlsZCwgdGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFR5cGVzY3JpcHQgdHlwZSBhZGp1c3RtZW50IFxuXHRcdCAqL1xuXHRcdGdldCBwcm94eSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMgYXMgdW5rbm93biBhcyBTdHJ1Y3QgJiBSZWNvcmQ8c3RyaW5nLCBTdHJ1Y3Q+O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgY29udGVudHMoKTogU3RydWN0W11cblx0XHR7XG5cdFx0XHRyZXR1cm4gT2JqZWN0LnZhbHVlcyh0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aW5zdGFuY2VvZihiYXNlOiBhbnkpXG5cdFx0e1xuXHRcdFx0cmV0dXJuwqB0aGlzW3R5cGVPZl0uaXMoYmFzZSk7IFxuXHRcdH07XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aXMoYmFzZTogVHlwZSB8IFN0cnVjdClcblx0XHR7XG5cdFx0XHRiYXNlID0gYmFzZSBpbnN0YW5jZW9mIFR5cGUgPyBiYXNlIDogYmFzZVt0eXBlT2ZdO1xuXHRcdFx0cmV0dXJuIHRoaXNbdHlwZU9mXS5pcyhiYXNlKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0W1N5bWJvbC5oYXNJbnN0YW5jZV0odmFsdWU6IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5pbnN0YW5jZW9mKHZhbHVlKTtcblx0XHR9XG5cdH1cblx0XG5cdGV4cG9ydCBjbGFzcyBTdXJyb2dhdGU8VCA9IHN0cmluZz4gZXh0ZW5kcyBTdHJ1Y3Rcblx0e1xuXHRcdHJlYWRvbmx5IFtuYW1lXTogTmFtZTtcblx0XHRyZWFkb25seSBbcGFyZW50XTogU3Vycm9nYXRlIHwgbnVsbDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgY29udGVudHMoKTogU3Vycm9nYXRlW11cblx0XHR7XG5cdFx0XHRyZXR1cm4gT2JqZWN0LnZhbHVlcyh0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGJhc2VzKCk6IFN0cnVjdFtdXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXNbdHlwZU9mXS5iYXNlcy5tYXAoeCA9PiBCYWNrZXIuU2NoZW1hW3gubmFtZV0pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRpbnN0YW5jZW9mKGJhc2U6IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpc1t2YWx1ZV0gaW5zdGFuY2VvZiBiYXNlIHx8wqB0aGlzW3R5cGVPZl0uaXMoYmFzZSk7IFxuXHRcdH07XG5cdFx0XG5cdFx0LyoqIFxuXHRcdCAqIEdldCBuZXN0ZWQgcHJvcGVydHkgd2l0aCBtYXRjaGluZyBTdHJ1Y3Rcblx0XHQqL1xuXHRcdGdldCh0eXBlOiBTdHJ1Y3QpOiBTdXJyb2dhdGUgfMKgbnVsbFxuXHRcdHtcdFx0XG5cdFx0XHRjb25zdCByZWN1cnNpdmUgPSAob2JqOiBTdXJyb2dhdGUpOiBTdXJyb2dhdGUgfCBudWxsID0+IFxuXHRcdFx0e1xuXHRcdFx0XHRpZiAob2JqW3R5cGVPZl0ucGFyYWxsZWxSb290cy5zb21lKHggPT4geCA9PT0gdHlwZVt0eXBlT2ZdKSlcblx0XHRcdFx0XHRyZXR1cm4gb2JqO1xuXHRcdFx0XHRcblx0XHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiBvYmouY29udGVudHMpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCByZXMgPSByZWN1cnNpdmUoY2hpbGQpO1x0XG5cdFx0XHRcdFx0aWYgKHJlcylcblx0XHRcdFx0XHRcdHJldHVybiByZXM7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHJlY3Vyc2l2ZSg8YW55PnRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHR0b0pTT04oKTogYW55IFxuXHRcdHsgXG5cdFx0XHRjb25zdCB2YWwgPSB0aGlzW3ZhbHVlXTtcblx0XHRcdGNvbnN0IHByaW1pdGl2ZSA9IHZhbCA/IHRoaXNbdHlwZU9mXS52YWx1ZXMudG9TdHJpbmcoKSA6IHVuZGVmaW5lZDtcblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMuY29udGVudHMubGVuZ3RoID09PSAwKVxuXHRcdFx0XHRyZXR1cm4gcHJpbWl0aXZlO1xuXHRcblx0XHRcdGNvbnN0IE9iajogUmVjb3JkPHN0cmluZywgU3Vycm9nYXRlIHwgVD4gJiB7ICQ6IGFueSB9ID0gPGFueT5PYmplY3QuYXNzaWduKHt9LCB0aGlzKTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gT2JqOyBcblx0XHR9XG5cdFx0XG5cdFx0dG9TdHJpbmcoaW5kZW50ID0gMClcblx0XHR7XG5cdFx0XHRsZXQgYmFzZSA9IHRoaXNbdHlwZU9mXS5uYW1lO1xuXHRcdFx0Y29uc3QgcHJpbWl0aXZlID0gdGhpc1t2YWx1ZV0gPyB0aGlzW3R5cGVPZl0udmFsdWVzLnRvU3RyaW5nKCkgOiB1bmRlZmluZWQ7XG5cdFx0XHRcblx0XHRcdGlmIChwcmltaXRpdmUpIFxuXHRcdFx0XHRiYXNlICs9IGA6ICR7cHJpbWl0aXZlfWA7XG5cdFx0XHRcdFxuXHRcdFx0aWYgKHRoaXMuY29udGVudHMubGVuZ3RoID4gMClcblx0XHRcdFx0YmFzZSArPSB0aGlzLmNvbnRlbnRzLm1hcCh4ID0+IFwiXFxuXCIgKyB4LnRvU3RyaW5nKGluZGVudCArIDEpKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIFwiXFx0XCIucmVwZWF0KGluZGVudCkgKyBiYXNlO1xuXHRcdH1cblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlclxue1xuXHRleHBvcnQgdHlwZSBWYWx1ZUpTT04gPSBbbnVtYmVyLCBudW1iZXIsIHN0cmluZ107XG5cdGV4cG9ydCB0eXBlIERhdGFKU09OID0gW251bWJlcltdLCBzdHJpbmcsIC4uLlZhbHVlSlNPTltdW11dO1xuXHRleHBvcnQgdHlwZSBUeXBlSlNPTiA9IFtudW1iZXIsIG51bWJlciB8IG51bGwsIHN0cmluZywgVmFsdWVKU09OW11dO1xuXHRcblx0ZXhwb3J0IGNsYXNzIFZhbHVlXG5cdHtcblx0XHRzdGF0aWMgbG9hZChkYXRhOiBWYWx1ZUpTT04pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBWYWx1ZShGdXR1cmVUeXBlLm5ldyhkYXRhWzBdKSwgISFkYXRhWzFdLCBkYXRhWzJdKTtcblx0XHR9XG5cdFx0XG5cdFx0cHVibGljIHZhbHVlOiBhbnk7XG5cdFx0XG5cdFx0Y29uc3RydWN0b3IocHVibGljIGJhc2U6IEZ1dHVyZVR5cGUgfCBudWxsLCBwdWJsaWMgYWxpYXNlZDogYm9vbGVhbiwgdmFsdWU6IHN0cmluZykgXG5cdFx0e1xuXHRcdFx0dGhpcy52YWx1ZSA9IHZhbHVlO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgcHJpbWl0aXZlKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy52YWx1ZSB8fCB0aGlzLmJhc2VOYW1lO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgYmFzZU5hbWUoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmJhc2UgPyB0aGlzLmJhc2UudHlwZSA/IHRoaXMuYmFzZS50eXBlLm5hbWUgOiBcIlwiIDogXCJcIjtcdFxuXHRcdH1cblx0XHRcblx0XHR0b0pTT04oKVxuXHRcdHtcblx0XHRcdHJldHVybiBbdGhpcy5iYXNlICYmIHRoaXMuYmFzZS5pZCwgdGhpcy5hbGlhc2VkID8gMSA6IDAsIHRoaXMudmFsdWVdOyAgXG5cdFx0fVxuXHRcdFxuXHRcdHRvU3RyaW5nKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcmltaXRpdmU7XG5cdFx0fVxuXHR9XG5cdFxuXHRleHBvcnQgY2xhc3MgVmFsdWVTdG9yZVxuXHR7XHRcblx0XHRzdGF0aWMgbG9hZCguLi5kYXRhOiBWYWx1ZUpTT05bXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFZhbHVlU3RvcmUoLi4uZGF0YS5tYXAoeCA9PiBWYWx1ZS5sb2FkKHgpKSk7XG5cdFx0fVxuXHRcdFxuXHRcdHB1YmxpYyB2YWx1ZVN0b3JlOiBWYWx1ZVtdO1xuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKC4uLnZhbHVlczogVmFsdWVbXSlcblx0XHR7XG5cdFx0XHR0aGlzLnZhbHVlU3RvcmUgPSB2YWx1ZXMubWFwKHggPT4gXG5cdFx0XHR7XG5cdFx0XHRcdGlmICh4LmFsaWFzZWQpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0cnkgXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0eC52YWx1ZSA9IEpTT04ucGFyc2UoeC52YWx1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNhdGNoIChleClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAoL15cXGQrJC8udGVzdCh4LnZhbHVlKSlcblx0XHRcdFx0XHRcdFx0eC52YWx1ZSA9IEJpZ0ludCh4LnZhbHVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHg7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IHZhbHVlcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudmFsdWVTdG9yZS5maWx0ZXIoeCA9PiAheC5hbGlhc2VkKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGFsaWFzZXMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnZhbHVlU3RvcmUuZmlsdGVyKHggPT4geC5hbGlhc2VkKTtcblx0XHR9XG5cdFx0XG5cdFx0Y29uY2F0KHN0b3JlOiBWYWx1ZVN0b3JlKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgVmFsdWVTdG9yZSguLi50aGlzLnZhbHVlU3RvcmUuY29uY2F0KHN0b3JlLnZhbHVlU3RvcmUpKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGFsaWFzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5hbGlhc2VzWzBdO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgdmFsdWUoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnZhbHVlc1swXTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IHByaW1pdGl2ZSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuYWxpYXMgPyB0aGlzLmFsaWFzLnZhbHVlIDogdGhpcy52YWx1ZSAmJiB0aGlzLnZhbHVlLnRvU3RyaW5nKCk7XG5cdFx0fVxuXHRcdFxuXHRcdHRvSlNPTigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudmFsdWVTdG9yZTtcblx0XHR9XG5cdFxuXHRcdHRvU3RyaW5nKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5hbGlhcyA/IHRoaXMuYWxpYXMudG9TdHJpbmcoKSArICh0aGlzLnZhbHVlID8gXCJbXCIgKyB0aGlzLnZhbHVlLnRvU3RyaW5nKCkgKyBcIl1cIiA6IFwiXCIpIDogdGhpcy52YWx1ZS50b1N0cmluZygpO1xuXHRcdH1cblx0XHRcblx0fVxuXHRcblx0ZXhwb3J0IGNsYXNzIFR5cGUgXG5cdHtcblx0XHQvKipcblx0XHQgKiBMb2FkIGEgQmFja2VyLlR5cGUgZnJvbSBDb2RlSlNPTlxuXHRcdCAqL1xuXHRcdHN0YXRpYyBsb2FkKGNvZGU6IENvZGUsIGRhdGE6IFR5cGVKU09OKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgVHlwZShcblx0XHRcdFx0Y29kZSwgXG5cdFx0XHRcdGRhdGFbMl0sXG5cdFx0XHRcdGNvZGUucHJvdG90eXBlc1tkYXRhWzBdXSxcblx0XHRcdFx0ZGF0YVsxXSA/IEZ1dHVyZVR5cGUubmV3KGRhdGFbMV0pIDogbnVsbCxcblx0XHRcdFx0VmFsdWVTdG9yZS5sb2FkKC4uLmRhdGFbM10pXG5cdFx0XHQpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHZW5lcmF0ZSBhIEJhY2tlci5UeXBlIGZyb20gVHJ1dGguVHlwZVxuXHRcdCAqL1xuXHRcdHN0YXRpYyBuZXcoY29kZTogQ29kZSwgdHlwZTogVHJ1dGguVHlwZSlcblx0XHR7XHRcblx0XHRcdGNvbnN0IG5hbWUgPSB0eXBlLmlzUGF0dGVybiA/IHR5cGUubmFtZS5zdWJzdHIoOSkgOiB0eXBlLm5hbWU7XG5cdFx0XHRjb25zdCBpbnN0YW5jZSA9IG5ldyBUeXBlKFxuXHRcdFx0XHRjb2RlLCBcblx0XHRcdFx0bmFtZSwgXG5cdFx0XHRcdFByb3RvdHlwZS5uZXcoY29kZSwgdHlwZSksXG5cdFx0XHRcdHR5cGUuY29udGFpbmVyID8gRnV0dXJlVHlwZS5uZXcodHlwZS5jb250YWluZXIpIDogbnVsbCxcblx0XHRcdFx0bmV3IFZhbHVlU3RvcmUoLi4udHlwZS52YWx1ZXNcblx0XHRcdFx0XHQuZmlsdGVyKHggPT4gbmFtZSAhPT0geC52YWx1ZSlcblx0XHRcdFx0XHQubWFwKHggPT4gbmV3IFZhbHVlKHguYmFzZSA/IEZ1dHVyZVR5cGUubmV3KHguYmFzZSkgOiBudWxsLCB4LmFsaWFzZWQsIHgudmFsdWUpKSlcblx0XHRcdCk7XG5cdFx0XHRcblx0XHRcdEZ1dHVyZVR5cGUuVHlwZU1hcC5zZXQodHlwZSwgaW5zdGFuY2UpO1xuXHRcdFx0cmV0dXJuIGluc3RhbmNlO1xuXHRcdH1cblx0XHRcblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdHByaXZhdGUgY29kZTogQ29kZSxcblx0XHRcdHB1YmxpYyBuYW1lOiBzdHJpbmcsXG5cdFx0XHRwdWJsaWMgcHJvdG90eXBlOiBQcm90b3R5cGUsXG5cdFx0XHRwcml2YXRlIF9jb250YWluZXI6IEZ1dHVyZVR5cGUgfCBudWxsID0gbnVsbCxcblx0XHRcdHB1YmxpYyB2YWx1ZXM6IFZhbHVlU3RvcmUpIFxuXHRcdHsgfVxuXHRcdFx0XG5cdFx0Z2V0IGNvbnRhaW5lcigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NvbnRhaW5lciAmJiB0aGlzLl9jb250YWluZXIudHlwZTtcblx0XHR9XG5cdFx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgdGhlIGFycmF5IG9mIHR5cGVzIHRoYXQgYXJlIGNvbnRhaW5lZCBkaXJlY3RseSBieSB0aGlzXG5cdFx0ICogb25lLiBJbiB0aGUgY2FzZSB3aGVuIHRoaXMgdHlwZSBpcyBhIGxpc3QgdHlwZSwgdGhpcyBhcnJheSBkb2VzXG5cdFx0ICogbm90IGluY2x1ZGUgdGhlIGxpc3QncyBpbnRyaW5zaWMgdHlwZXMuXG5cdFx0ICovXG5cdFx0Z2V0IGNvbnRlbnRzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5jb2RlLnR5cGVzLmZpbHRlcih4ID0+IHguY29udGFpbmVyID09PSB0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQGludGVyYWxcblx0XHQgKi9cblx0XHRnZXQgcGFyYWxsZWxDb250ZW50cygpXG5cdFx0e1xuXHRcdFx0Y29uc3QgdHlwZXM6IFR5cGVbXSA9IFtdO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHsgdHlwZTogcGFyYWxsZWxUeXBlIH0gb2YgdGhpcy5pdGVyYXRlKHQgPT4gdC5wYXJhbGxlbHMsIHRydWUpKVxuXHRcdFx0XHRmb3IgKGNvbnN0IHsgdHlwZTogYmFzZVR5cGUgfSBvZiBwYXJhbGxlbFR5cGUuaXRlcmF0ZSh0ID0+IHQuYmFzZXMsIHRydWUpKVxuXHRcdFx0XHRcdGZvcihjb25zdCBjb250ZW50IG9mIGJhc2VUeXBlLmNvbnRlbnRzKVxuXHRcdFx0XHRcdGlmICghdHlwZXMuc29tZSh4ID0+IHgubmFtZSA9PT0gY29udGVudC5uYW1lKSlcblx0XHRcdFx0XHRcdHR5cGVzLnB1c2goY29udGVudCk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdHJldHVybiB0eXBlcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIGEgcmVmZXJlbmNlIHRvIHRoZSB0eXBlLCBhcyBpdCdzIGRlZmluZWQgaW4gaXQnc1xuXHRcdCAqIG5leHQgbW9zdCBhcHBsaWNhYmxlIHR5cGUuXG5cdFx0ICovXG5cdFx0Z2V0IHBhcmFsbGVscygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLnBhcmFsbGVscy5zbmFwc2hvdCgpXG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyB0aGUgYXJyYXkgb2YgdHlwZXMgZnJvbSB3aGljaCB0aGlzIHR5cGUgZXh0ZW5kcy5cblx0XHQgKiBJZiB0aGlzIFR5cGUgZXh0ZW5kcyBmcm9tIGEgcGF0dGVybiwgaXQgaXMgaW5jbHVkZWQgaW4gdGhpc1xuXHRcdCAqIGFycmF5LlxuXHRcdCAqL1xuXHRcdGdldCBiYXNlcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmJhc2VzLnNuYXBzaG90KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdldHMgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgcGF0dGVybnMgdGhhdCByZXNvbHZlIHRvIHRoaXMgdHlwZS5cblx0XHQgKi9cblx0XHRnZXQgcGF0dGVybnMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5wYXR0ZXJucy5zbmFwc2hvdCgpO1x0XG5cdFx0fVxuXHRcdFxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdldHMgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdGhhdCBzaGFyZSB0aGUgc2FtZSBjb250YWluaW5nXG5cdFx0ICogdHlwZSBhcyB0aGlzIG9uZS5cblx0XHQgKi9cblx0XHRnZXQgYWRqYWNlbnRzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5jb2RlLnR5cGVzLmZpbHRlcih4ID0+IHguY29udGFpbmVyICE9PSB0aGlzLmNvbnRhaW5lciAmJiB4ICE9PSB0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogR2V0cyBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSB0eXBlcyB0aGF0IGRlcml2ZSBmcm9tIHRoZSBcblx0XHQgKiB0aGlzIFR5cGUgaW5zdGFuY2UuXG5cdFx0ICogXG5cdFx0ICogVGhlIHR5cGVzIHRoYXQgZGVyaXZlIGZyb20gdGhpcyBvbmUgYXMgYSByZXN1bHQgb2YgdGhlIHVzZSBvZlxuXHRcdCAqIGFuIGFsaWFzIGFyZSBleGNsdWRlZCBmcm9tIHRoaXMgYXJyYXkuXG5cdFx0ICovXG5cdFx0Z2V0IGRlcml2YXRpb25zKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5jb2RlLnR5cGVzLmZpbHRlcih4ID0+IHguYmFzZXMuaW5jbHVkZXModGhpcykpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgYSByZWZlcmVuY2UgdG8gdGhlIHBhcmFsbGVsIHJvb3RzIG9mIHRoaXMgdHlwZS5cblx0XHQgKiBUaGUgcGFyYWxsZWwgcm9vdHMgYXJlIHRoZSBlbmRwb2ludHMgZm91bmQgd2hlblxuXHRcdCAqIHRyYXZlcnNpbmcgdXB3YXJkIHRocm91Z2ggdGhlIHBhcmFsbGVsIGdyYXBoLlxuXHRcdCAqL1xuXHRcdGdldCBwYXJhbGxlbFJvb3RzKClcblx0XHR7XG5cdFx0XHRjb25zdCByb290czogVHlwZVtdID0gW107XG5cdFx0XHRmb3IgKGNvbnN0IHsgdHlwZSB9IG9mIHRoaXMuaXRlcmF0ZSh0ID0+IHQucGFyYWxsZWxzKSlcblx0XHRcdFx0aWYgKHR5cGUgIT09IHRoaXMgJiYgdHlwZS5wYXJhbGxlbHMubGVuZ3RoID09PSAwKVxuXHRcdFx0XHRcdHJvb3RzLnB1c2godHlwZSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiByb290cztcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IHZhbHVlKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy52YWx1ZXMucHJpbWl0aXZlO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaWQoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmNvZGUudHlwZXMuaW5kZXhPZih0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGlzQW5vbnltb3VzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDApO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaXNGcmVzaCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmZsYWdzLmdldCgxKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGlzTGlzdCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmZsYWdzLmdldCgyKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIHdoZXRoZXIgdGhpcyB0eXBlIHJlcHJlc2VudHMgdGhlIGludHJpbnNpY1xuXHRcdCAqIHNpZGUgb2YgYSBsaXN0LlxuXHRcdCAqL1xuXHRcdGdldCBpc0xpc3RJbnRyaW5zaWMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5mbGFncy5nZXQoMyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyB3aGV0aGVyIHRoaXMgdHlwZSByZXByZXNlbnRzIHRoZSBleHRyaW5zaWNcblx0XHQgKiBzaWRlIG9mIGEgbGlzdC5cblx0XHQgKi9cblx0XHRnZXQgaXNMaXN0RXh0cmluc2ljKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDQpO1xuXHRcdH1cblx0XHRcblx0XHRcblx0XHRnZXQgaXNQYXR0ZXJuKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDUpO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaXNVcmkoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5mbGFncy5nZXQoNik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyBhIHZhbHVlIHRoYXQgaW5kaWNhdGVzIGlmIHRoaXMgVHlwZSB3YXMgZGlyZWN0bHkgc3BlY2lmaWVkXG5cdFx0ICogaW4gdGhlIGRvY3VtZW50LCBvciBpZiBpdCdzIGV4aXN0ZW5jZSB3YXMgaW5mZXJyZWQuXG5cdFx0ICovXG5cdFx0Z2V0IGlzU3BlY2lmaWVkKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDcpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgaXNPdmVycmlkZSgpIHsgcmV0dXJuIHRoaXMucGFyYWxsZWxzLmxlbmd0aCA+IDA7IH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgaXNJbnRyb2R1Y3Rpb24oKSB7IHJldHVybiB0aGlzLnBhcmFsbGVscy5sZW5ndGggPT09IDA7IH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIGEgYm9vbGVhbiB2YWx1ZSB0aGF0IGluZGljYXRlcyB3aGV0aGVyIHRoaXMgVHlwZVxuXHRcdCAqIGluc3RhbmNlIHdhcyBjcmVhdGVkIGZyb20gYSBwcmV2aW91cyBlZGl0IGZyYW1lLCBhbmRcblx0XHQgKiBzaG91bGQgbm8gbG9uZ2VyIGJlIHVzZWQuXG5cdFx0ICovXG5cdFx0Z2V0IGlzRGlydHkoKVxuXHRcdHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUGVyZm9ybXMgYW4gYXJiaXRyYXJ5IHJlY3Vyc2l2ZSwgYnJlYWR0aC1maXJzdCB0cmF2ZXJzYWxcblx0XHQgKiB0aGF0IGJlZ2lucyBhdCB0aGlzIFR5cGUgaW5zdGFuY2UuIEVuc3VyZXMgdGhhdCBubyB0eXBlc1xuXHRcdCAqIHR5cGVzIGFyZSB5aWVsZGVkIG11bHRpcGxlIHRpbWVzLlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSBuZXh0Rm4gQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSB0eXBlLCBvciBhblxuXHRcdCAqIGl0ZXJhYmxlIG9mIHR5cGVzIHRoYXQgYXJlIHRvIGJlIHZpc2l0ZWQgbmV4dC5cblx0XHQgKiBAcGFyYW0gcmV2ZXJzZSBBbiBvcHRpb25hbCBib29sZWFuIHZhbHVlIHRoYXQgaW5kaWNhdGVzXG5cdFx0ICogd2hldGhlciB0eXBlcyBpbiB0aGUgcmV0dXJuZWQgYXJyYXkgc2hvdWxkIGJlIHNvcnRlZFxuXHRcdCAqIHdpdGggdGhlIG1vc3QgZGVlcGx5IHZpc2l0ZWQgbm9kZXMgb2NjdXJpbmcgZmlyc3QuXG5cdFx0ICogXG5cdFx0ICogQHJldHVybnMgQW4gYXJyYXkgdGhhdCBzdG9yZXMgdGhlIGxpc3Qgb2YgdHlwZXMgdGhhdCB3ZXJlXG5cdFx0ICogdmlzaXRlZC5cblx0XHQgKi9cblx0XHR2aXNpdChuZXh0Rm46ICh0eXBlOiBUeXBlKSA9PiBJdGVyYWJsZTxUeXBlIHwgbnVsbD4gfCBUeXBlIHwgbnVsbCwgcmV2ZXJzZT86IGJvb2xlYW4pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIEFycmF5LmZyb20odGhpcy5pdGVyYXRlKG5leHRGbiwgcmV2ZXJzZSkpLm1hcChlbnRyeSA9PiBlbnRyeS50eXBlKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUGVyZm9ybXMgYW4gYXJiaXRyYXJ5IHJlY3Vyc2l2ZSwgYnJlYWR0aC1maXJzdCBpdGVyYXRpb25cblx0XHQgKiB0aGF0IGJlZ2lucyBhdCB0aGlzIFR5cGUgaW5zdGFuY2UuIEVuc3VyZXMgdGhhdCBubyB0eXBlc1xuXHRcdCAqIHR5cGVzIGFyZSB5aWVsZGVkIG11bHRpcGxlIHRpbWVzLlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSBuZXh0Rm4gQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSB0eXBlLCBvciBhbiBpdGVyYWJsZVxuXHRcdCAqIG9mIHR5cGVzIHRoYXQgYXJlIHRvIGJlIHZpc2l0ZWQgbmV4dC5cblx0XHQgKiBAcGFyYW0gcmV2ZXJzZSBBbiBvcHRpb25hbCBib29sZWFuIHZhbHVlIHRoYXQgaW5kaWNhdGVzXG5cdFx0ICogd2hldGhlciB0aGUgaXRlcmF0b3Igc2hvdWxkIHlpZWxkIHR5cGVzIHN0YXJ0aW5nIHdpdGggdGhlXG5cdFx0ICogbW9zdCBkZWVwbHkgbmVzdGVkIHR5cGVzIGZpcnN0LlxuXHRcdCAqIFxuXHRcdCAqIEB5aWVsZHMgQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgYSBgdHlwZWAgcHJvcGVydHkgdGhhdCBpcyB0aGVcblx0XHQgKiB0aGUgVHlwZSBiZWluZyB2aXNpdGVkLCBhbmQgYSBgdmlhYCBwcm9wZXJ0eSB0aGF0IGlzIHRoZSBUeXBlXG5cdFx0ICogdGhhdCB3YXMgcmV0dXJuZWQgaW4gdGhlIHByZXZpb3VzIGNhbGwgdG8gYG5leHRGbmAuXG5cdFx0ICovXG5cdFx0Kml0ZXJhdGUobmV4dEZuOiAodHlwZTogVHlwZSkgPT4gSXRlcmFibGU8VHlwZSB8IG51bGw+IHwgVHlwZSB8IG51bGwsIHJldmVyc2U/OiBib29sZWFuKVxuXHRcdHtcblx0XHRcdGNvbnN0IHlpZWxkZWQ6IFR5cGVbXSA9IFtdO1xuXHRcdFx0XG5cdFx0XHR0eXBlIFJlY3Vyc2VUeXBlID0gSXRlcmFibGVJdGVyYXRvcjx7IHR5cGU6IFR5cGU7IHZpYTogVHlwZSB8IG51bGwgfT47XG5cdFx0XHRmdW5jdGlvbiAqcmVjdXJzZSh0eXBlOiBUeXBlLCB2aWE6IFR5cGUgfCBudWxsKTogUmVjdXJzZVR5cGVcblx0XHRcdHtcblx0XHRcdFx0aWYgKHlpZWxkZWQuaW5jbHVkZXModHlwZSkpXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKCFyZXZlcnNlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0eWllbGRlZC5wdXNoKHR5cGUpO1xuXHRcdFx0XHRcdHlpZWxkIHsgdHlwZSwgdmlhIH07XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IHJlZHVjZWQgPSBuZXh0Rm4odHlwZSk7XG5cdFx0XHRcdGlmIChyZWR1Y2VkICE9PSBudWxsICYmIHJlZHVjZWQgIT09IHVuZGVmaW5lZClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChyZWR1Y2VkIGluc3RhbmNlb2YgVHlwZSlcblx0XHRcdFx0XHRcdHJldHVybiB5aWVsZCAqcmVjdXJzZShyZWR1Y2VkLCB0eXBlKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRmb3IgKGNvbnN0IG5leHRUeXBlIG9mIHJlZHVjZWQpXG5cdFx0XHRcdFx0XHRpZiAobmV4dFR5cGUgaW5zdGFuY2VvZiBUeXBlKVxuXHRcdFx0XHRcdFx0XHR5aWVsZCAqcmVjdXJzZShuZXh0VHlwZSwgdHlwZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGlmIChyZXZlcnNlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0eWllbGRlZC5wdXNoKHR5cGUpO1xuXHRcdFx0XHRcdHlpZWxkIHsgdHlwZSwgdmlhIH07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0eWllbGQgKnJlY3Vyc2UodGhpcywgbnVsbCk7XG5cdFx0fVxuXHRcblx0XHQvKipcblx0XHQgKiBRdWVyaWVzIGZvciBhIFR5cGUgdGhhdCBpcyBuZXN0ZWQgdW5kZXJuZWF0aCB0aGlzIFR5cGUsXG5cdFx0ICogYXQgdGhlIHNwZWNpZmllZCB0eXBlIHBhdGguXG5cdFx0ICovXG5cdFx0cXVlcnkoLi4udHlwZVBhdGg6IHN0cmluZ1tdKVxuXHRcdHtcblx0XHRcdGxldCBjdXJyZW50VHlwZTogVHlwZSB8IG51bGwgPSBudWxsO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHR5cGVOYW1lIG9mIHR5cGVQYXRoKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBuZXh0VHlwZSA9IHRoaXMuY29udGVudHMuZmluZCh0eXBlID0+IHR5cGUubmFtZSA9PT0gdHlwZU5hbWUpO1xuXHRcdFx0XHRpZiAoIW5leHRUeXBlKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0Y3VycmVudFR5cGUgPSBuZXh0VHlwZTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIGN1cnJlbnRUeXBlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDaGVja3Mgd2hldGhlciB0aGlzIFR5cGUgaGFzIHRoZSBzcGVjaWZpZWQgdHlwZVxuXHRcdCAqIHNvbWV3aGVyZSBpbiBpdCdzIGJhc2UgZ3JhcGguXG5cdFx0ICovXG5cdFx0aXMoYmFzZVR5cGU6IFR5cGUpXG5cdFx0e1xuXHRcdFx0Zm9yIChjb25zdCB7IHR5cGUgfSBvZiB0aGlzLml0ZXJhdGUodCA9PiB0LmJhc2VzKSlcblx0XHRcdFx0aWYgKHR5cGUgPT09IGJhc2VUeXBlKVxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENoZWNrcyB3aGV0aGVyIHRoaXMgVHlwZSBoYXMgdGhlIHNwZWNpZmllZCB0eXBlXG5cdFx0ICogc29tZXdoZXJlIGluIGl0J3MgYmFzZSBncmFwaC5cblx0XHQgKi9cblx0XHRpc1Jvb3QoYmFzZVR5cGU6IFR5cGUpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuaXMoYmFzZVR5cGUpIHx8wqB0aGlzLnBhcmFsbGVsUm9vdHMuaW5jbHVkZXMoYmFzZVR5cGUpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDaGVja3Mgd2hldGhlciB0aGUgc3BlY2lmaWVkIHR5cGUgaXMgaW4gdGhpcyBUeXBlJ3Ncblx0XHQgKiBgLmNvbnRlbnRzYCBwcm9wZXJ0eSwgZWl0aGVyIGRpcmVjdGx5LCBvciBpbmRpcmVjdGx5IHZpYVxuXHRcdCAqIHRoZSBwYXJhbGxlbCBncmFwaHMgb2YgdGhlIGAuY29udGVudHNgIFR5cGVzLlxuXHRcdCAqL1xuXHRcdGhhcyh0eXBlOiBUeXBlKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLmNvbnRlbnRzLmluY2x1ZGVzKHR5cGUpKVxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBjb250YWluZWRUeXBlIG9mIHRoaXMuY29udGVudHMpXG5cdFx0XHRcdGlmICh0eXBlLm5hbWUgPT09IGNvbnRhaW5lZFR5cGUubmFtZSlcblx0XHRcdFx0XHRmb3IgKGNvbnN0IHBhcmFsbGVsIG9mIGNvbnRhaW5lZFR5cGUuaXRlcmF0ZSh0ID0+IHQucGFyYWxsZWxzKSlcblx0XHRcdFx0XHRcdGlmIChwYXJhbGxlbC50eXBlID09PSB0eXBlKVxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBUcmFuc2ZlciBvd25lcnNoaXAgb2YgdGhpcyBpbnN0YW5jZSB0byBhbm90aGVyIENvZGUgaW5zdGFuY2Vcblx0XHQgKi9cblx0XHR0cmFuc2Zlcihjb2RlOiBDb2RlKVxuXHRcdHtcblx0XHRcdHRoaXMuY29kZSA9IGNvZGU7XG5cdFx0XHR0aGlzLnByb3RvdHlwZS50cmFuc2Zlcihjb2RlKTtcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKClcblx0XHR7XHRcblx0XHRcdHJldHVybiBbdGhpcy5wcm90b3R5cGUuaWQsIHRoaXMuY29udGFpbmVyICYmIHRoaXMuY29udGFpbmVyLmlkLCB0aGlzLm5hbWUsIHRoaXMudmFsdWVzXTtcblx0XHR9XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXJcbntcblx0LyoqXG5cdCAqIEtlZXBzIHRyYWNrIG9mIHJlbGF0aW9ucyBiZXR3ZWVuIHR5cGVzLlxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIFR5cGVTZXQgZXh0ZW5kcyBTZXQ8RnV0dXJlVHlwZT5cblx0e1xuXHRcdHN0YXRpYyBmcm9tSlNPTihkYXRhOiBudW1iZXJbXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFR5cGVTZXQoZGF0YS5tYXAoeCA9PiBGdXR1cmVUeXBlLm5ldyh4KSkpO1xuXHRcdH1cblx0XHRcblx0XHRzbmFwc2hvdCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudG9BcnJheSgpLm1hcCh4ID0+IHgudHlwZSkuZmlsdGVyKHggPT4geCkgYXMgVHlwZVtdO1xuXHRcdH1cblx0XHRcblx0XHR0b0FycmF5KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gQXJyYXkuZnJvbSh0aGlzLnZhbHVlcygpKS5zb3J0KCk7XHRcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKCkgeyByZXR1cm4gdGhpcy50b0FycmF5KCk7IH1cblx0XHR2YWx1ZU9mKCkgeyByZXR1cm4gdGhpcy50b0FycmF5KCk7IH1cblx0XHRbU3ltYm9sLnRvUHJpbWl0aXZlXSgpIHsgcmV0dXJuIHRoaXMudG9BcnJheSgpOyB9XG5cdFx0Z2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkgeyByZXR1cm4gXCJUeXBlU2V0XCI7IH1cblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlci5VdGlsXG57XG5cdGNvbnN0IEhlYWRlcnMgPSBgXG5cdGFueVxuXHRvYmplY3QgOiBhbnlcblx0c3RyaW5nIDogYW55XG5cdG51bWJlciA6IGFueVxuXHRiaWdpbnQgOiBhbnlcblx0Ym9vbGVhbiA6IGFueVxuXHRcblx0L1wiLitcIiA6IHN0cmluZ1xuXHQvKFxcXFwrfC0pPygoWzEtOV1cXFxcZHswLDE3fSl8KFsxLThdXFxcXGR7MTh9KXwoOVswMV1cXFxcZHsxN30pKSA6IG51bWJlclxuXHQvKDB8KFsxLTldWzAtOV0qKSkgOiBiaWdpbnRcblx0Lyh0cnVlfGZhbHNlKSA6IGJvb2xlYW5cblx0XG5cdGA7XG5cdFxuXHQvKipcblx0ICogSGFzaCBjYWxjdWxhdGlvbiBmdW5jdGlvbiBhZGFwdGVkIGZyb206XG5cdCAqIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS81MjE3MTQ4MC8xMzM3Mzdcblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBoYXNoKHZhbHVlOiBzdHJpbmcsIHNlZWQgPSAwKVxuXHR7XG5cdFx0bGV0IGgxID0gMHhERUFEQkVFRiBeIHNlZWQ7XG5cdFx0bGV0IGgyID0gMFg0MUM2Q0U1NyBeIHNlZWQ7XG5cdFx0XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7IGkrKylcblx0XHR7XG5cdFx0XHRsZXQgY2ggPSB2YWx1ZS5jaGFyQ29kZUF0KGkpO1xuXHRcdFx0aDEgPSBNYXRoLmltdWwoaDEgXiBjaCwgMjY1NDQzNTc2MSk7XG5cdFx0XHRoMiA9IE1hdGguaW11bChoMiBeIGNoLCAxNTk3MzM0Njc3KTtcblx0XHR9XG5cdFx0XG5cdFx0aDEgPSBNYXRoLmltdWwoaDEgXiBoMSA+Pj4gMTYsIDIyNDY4MjI1MDcpIF4gTWF0aC5pbXVsKGgyIF4gaDIgPj4+IDEzLCAzMjY2NDg5OTA5KTtcblx0XHRoMiA9IE1hdGguaW11bChoMiBeIGgyID4+PiAxNiwgMjI0NjgyMjUwNykgXiBNYXRoLmltdWwoaDEgXiBoMSA+Pj4gMTMsIDMyNjY0ODk5MDkpO1xuXHRcdHJldHVybiA0Mjk0OTY3Mjk2ICogKDIwOTcxNTEgJiBoMikgKyAoaDEgPj4+IDApO1xuXHR9XG5cdFxuXHQvKipcblx0ICogQ29tcHJlc3MgbmVzdGVkIGFycmF5c1xuXHQgKiBAcGFyYW0gZGF0YSBBbiBhcnJheSB3aXRoIG5lc3RlZCBhcnJheXMgaW4gaXRcblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBlbmNvZGUoZGF0YTogYW55W10pXG5cdHtcblx0XHRjb25zdCBiZiA9IG5ldyBCaXRmaWVsZHMoKTtcblx0XHRjb25zdCByZXN1bHQgPSBbXTtcblx0XHRcblx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGRhdGEubGVuZ3RoOylcblx0XHR7XG5cdFx0XHRjb25zdCB2cCA9IGRhdGFbaV07XG5cdFx0XHRjb25zdCB2YWx1ZSA9IHZwICYmIHR5cGVvZiB2cCA9PT0gXCJvYmplY3RcIiAmJiBcInRvSlNPTlwiIGluIHZwID8gdnAudG9KU09OKCkgOiB2cDtcdFxuXHRcdFx0Y29uc3QgYml0ID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwO1xuXHRcdFx0YmYuc2V0KGksIGJpdCA/IGZhbHNlIDogdHJ1ZSk7XG5cdFx0XHQgXG5cdFx0XHRpZiAoIWJpdCkgXG5cdFx0XHRcdHJlc3VsdC5wdXNoKHZhbHVlKTtcblx0XHR9XG5cdFx0XG5cdFx0cmVzdWx0LnVuc2hpZnQoYmYpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblx0XG5cdFxuXHQvKipcblx0ICogRGVjb21wcmVzcyBuZXN0ZWQgYXJyYXlzXG5cdCAqIEBwYXJhbSBkYXRhIEEgY29tcHJlc3NlZCBhcnJheVxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGRlY29kZShkYXRhOiBbbnVtYmVyLCAuLi5hbnlbXV0sIGxlbmd0aD86IG51bWJlcilcblx0e1xuXHRcdGNvbnN0IGJmID0gbmV3IEJpdGZpZWxkcyhkYXRhLnNoaWZ0KCkpO1xuXHRcdFxuXHRcdGlmICghbGVuZ3RoIHx8wqBsZW5ndGggPCAxKSBcblx0XHRcdGxlbmd0aCA9IGJmLnNpemU7XG5cdFx0XHRcblx0XHRjb25zdCByZXN1bHQgPSBuZXcgQXJyYXkobGVuZ3RoKTtcblx0XHRcblx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGxlbmd0aDspXG5cdFx0e1xuXHRcdFx0Y29uc3QgYml0ID0gYmYuZ2V0KGkpO1xuXHRcdFx0aWYgKGJpdClcblx0XHRcdFx0cmVzdWx0W2ldID0gZGF0YS5zaGlmdCgpO1xuXHRcdFx0ZWxzZSBcblx0XHRcdFx0cmVzdWx0W2ldID0gW107XG5cdFx0fVxuXHRcdFxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBGZXRjaCBhIGZpbGUgd2l0aG91dCBwbGF0Zm9ybSBkZXBlbmRlbmNpZXNcblx0ICogQHBhcmFtIHVybCBKU09OIGZpbGUgdXJsXG5cdCAqL1xuXHRleHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hKU09OKHVybDogc3RyaW5nKVxuXHR7XG5cdFx0aWYgKGdsb2JhbFRoaXMgJiYgXCJmZXRjaFwiIGluIGdsb2JhbFRoaXMpIFxuXHRcdHtcblx0XHRcdGNvbnN0IHJlcXVlc3QgPSBhd2FpdCAoPGFueT5nbG9iYWxUaGlzKS5mZXRjaCh1cmwpO1xuXHRcdFx0cmV0dXJuIGF3YWl0IHJlcXVlc3QuanNvbigpO1xuXHRcdH1cblx0XHRcblx0XHR0aHJvdyBcIlRoaXMgcGxhdGZvcm0gaXMgbm90IHN1cHBvcnRlZCFcIjtcblx0fVxuXHRcblx0LyoqXG5cdCAqIE1ha2UgYSBwcm9wZXJ0eSAobm9uLSllbnVtZXJhYmxlXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gc2hhZG93KG9iamVjdDogb2JqZWN0LCBrZXk6IHN0cmluZyB8IHN5bWJvbCwgZW51bWVyYWJsZSA9IGZhbHNlKVxuXHR7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwga2V5LCB7XG5cdFx0XHRlbnVtZXJhYmxlXG5cdFx0fSk7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBNYWtlIGEgcHJvcGVydGllcyAobm9uLSllbnVtZXJhYmxlXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gc2hhZG93cyhvYmplY3Q6IG9iamVjdCwgZW51bWVyYWJsZSA9IGZhbHNlLCAuLi5rZXlzOiBBcnJheTxzdHJpbmcgfMKgc3ltYm9sPilcblx0e1xuXHRcdGZvciAobGV0IGtleSBvZiBrZXlzKVxuXHRcdFx0c2hhZG93KG9iamVjdCwga2V5LCBlbnVtZXJhYmxlKTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRGaWxlKGNvbnRlbnQ6IHN0cmluZywgcGF0dGVybjogUmVnRXhwKVxuXHR7XG5cdFx0Y29uc3QgZG9jID0gYXdhaXQgVHJ1dGgucGFyc2UoSGVhZGVycyArIGNvbnRlbnQpO1xuXHRcdFxuXHRcdGRvYy5wcm9ncmFtLnZlcmlmeSgpO1xuXHRcdFxuXHRcdGNvbnN0IGZhdWx0cyA9IEFycmF5LmZyb20oZG9jLnByb2dyYW0uZmF1bHRzLmVhY2goKSk7XG5cdFx0XG5cdFx0aWYgKGZhdWx0cy5sZW5ndGgpIFxuXHRcdHtcdFx0XHRcblx0XHRcdGZvciAoY29uc3QgZmF1bHQgb2YgZmF1bHRzKVxuXHRcdFx0XHRjb25zb2xlLmVycm9yKGZhdWx0LnRvU3RyaW5nKCkpO1xuXHRcdFx0XHRcblx0XHRcdHRocm93IGZhdWx0c1swXS50b1N0cmluZygpO1xuXHRcdH1cblx0XHRcblx0XHRsZXQgY29kZSA9IG5ldyBCYWNrZXIuQ29kZSgpO1xuXHRcdFx0XG5cdFx0Y29uc3QgZHJpbGwgPSAodHlwZTogVHJ1dGguVHlwZSkgPT4gXG5cdFx0e1xuXHRcdFx0Y29kZS5hZGQoQmFja2VyLlR5cGUubmV3KGNvZGUsIHR5cGUpKTtcblx0XHRcdGZvciAoY29uc3Qgc3ViIG9mIHR5cGUuY29udGVudHMpXG5cdFx0XHRcdGRyaWxsKHN1Yik7XG5cdFx0fTtcblx0XHRcblx0XHRmb3IgKGNvbnN0IHR5cGUgb2YgZG9jLnR5cGVzKVxuXHRcdFx0ZHJpbGwodHlwZSk7XG5cdFx0XHRcblx0XHRjb25zdCBleHRyYWN0ZWQgPSBjb2RlLmV4dHJhY3REYXRhKHBhdHRlcm4pO1xuXHRcdFxuXHRcdGNvZGUgPSBleHRyYWN0ZWQuY29kZTtcblx0XHRjb25zdCBkYXRhID0gZXh0cmFjdGVkLmRhdGE7XG5cdFx0XG5cdFx0Y29uc3Qgc2ltcGxlY29kZSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY29kZSkpO1xuXHRcdGNvbnN0IHNpbXBsZWRhdGEgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcblx0XHRcblx0XHRjb25zdCBCQ29kZSA9IEJhY2tlci5Db2RlLm5ldyhzaW1wbGVjb2RlKTtcblx0XHRCQ29kZS5sb2FkRGF0YShzaW1wbGVkYXRhKTtcblx0XHRcblx0XHRyZXR1cm4gY29kZTtcblx0fVxufSJdfQ==