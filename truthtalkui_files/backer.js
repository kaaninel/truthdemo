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
    class Summary extends Backer.TruthTalk.Leaves.Surrogate {
        constructor(value, containers) {
            super();
            this.value = value;
            this[Backer.parent] = containers;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc291cmNlL0FTVC50cyIsIi4uL3NvdXJjZS9CaXRmaWVsZHMudHMiLCIuLi9zb3VyY2UvQ29kZS50cyIsIi4uL3NvdXJjZS9FbmdpbmUudHMiLCIuLi9zb3VyY2UvRnV0dXJlVHlwZS50cyIsIi4uL3NvdXJjZS9Ob2Rlcy50cyIsIi4uL3NvdXJjZS9Qcm90b3R5cGUudHMiLCIuLi9zb3VyY2UvUmVmbGV4TGlicmFyeS50cyIsIi4uL3NvdXJjZS9TdXJyb2dhdGVzLnRzIiwiLi4vc291cmNlL1R5cGUudHMiLCIuLi9zb3VyY2UvVHlwZVNldC50cyIsIi4uL3NvdXJjZS9VdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUNDQSxJQUFVLE1BQU0sQ0FpRGY7QUFqREQsV0FBVSxNQUFNO0lBRWY7O09BRUc7SUFDSCxNQUFhLFNBQVM7UUFFckIsWUFBbUIsUUFBUSxDQUFDO1lBQVQsVUFBSyxHQUFMLEtBQUssQ0FBSTtRQUFHLENBQUM7UUFFaEM7O1dBRUc7UUFDSCxJQUFJLElBQUk7WUFFUCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxHQUFHLENBQUMsS0FBYTtZQUVoQixJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUU7Z0JBQzFCLE9BQU8sS0FBSyxDQUFDO1lBRWQsT0FBTyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNqRCxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxHQUFHLENBQUMsS0FBYSxFQUFFLEtBQWM7WUFFaEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFO2dCQUMx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SUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUM7WUFFNUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDcEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFFcEQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUUzQixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUF4Q3FCLGFBQVEsV0F3QzdCLENBQUE7SUFDRixDQUFDLEVBdEtnQixJQUFJLEdBQUosV0FBSSxLQUFKLFdBQUksUUFzS3BCO0FBQUQsQ0FBQyxFQXRLUyxNQUFNLEtBQU4sTUFBTSxRQXNLZiIsInNvdXJjZXNDb250ZW50IjpbIlxubmFtZXNwYWNlIEJhY2tlci5UcnV0aFRhbGtcbntcblx0ZXhwb3J0IHR5cGUgQXRvbWljID0gUmVmbGV4LkF0b208Tm9kZSwgQnJhbmNoPjtcblx0ZXhwb3J0IHR5cGUgQXRvbWljcyA9IFJlZmxleC5BdG9tPE5vZGUsIEJyYW5jaD47XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGludGVyZmFjZSBOYW1lc3BhY2UgZXh0ZW5kc1xuXHRcdFJlZmxleC5Db3JlLklCcmFuY2hOYW1lc3BhY2U8QXRvbWljcywgQnJhbmNoZXMuUXVlcnk+XG5cdHtcblx0XHQvKiogKi9cblx0XHRpcyguLi5hdG9taWNzOiBBdG9taWNzW10pOiBCcmFuY2hlcy5Jcztcblx0XHRcblx0XHQvKiogKi9cblx0XHRoYXMoLi4uYXRvbWljczogQXRvbWljc1tdKTogQnJhbmNoZXMuSGFzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdG5vdCguLi5hdG9taWNzOiBBdG9taWNzW10pOiBCcmFuY2hlcy5Ob3Q7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0b3IoLi4uYXRvbWljczogQXRvbWljc1tdKTogQnJhbmNoZXMuT3I7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y29udGFpbmVycygpOiBMZWF2ZXMuQ29udGFpbmVycztcblx0XHRcblx0XHQvKiogKi9cblx0XHRyb290KCk6IExlYXZlcy5Sb290cztcblx0XHRcblx0XHQvKiogKi9cblx0XHRjb250ZW50cygpOiBMZWF2ZXMuQ29udGVudHM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXF1YWxzKHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuKTogTGVhdmVzLlByZWRpY2F0ZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRncmVhdGVyVGhhbih2YWx1ZTogc3RyaW5nIHwgbnVtYmVyKTogTGVhdmVzLlByZWRpY2F0ZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRsZXNzVGhhbih2YWx1ZTogc3RyaW5nIHwgbnVtYmVyKTogTGVhdmVzLlByZWRpY2F0ZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRzdGFydHNXaXRoKHZhbHVlOiBzdHJpbmcgfCBudW1iZXIpOiBMZWF2ZXMuUHJlZGljYXRlO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGVuZHNXaXRoKHZhbHVlOiBzdHJpbmcgfCBudW1iZXIpOiBMZWF2ZXMuUHJlZGljYXRlO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFsaWFzZWQoKTogTGVhdmVzLkFsaWFzZWQ7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bGVhdmVzKCk6IExlYXZlcy5MZWF2ZXM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZnJlc2goKTogTGVhdmVzLkZyZXNoO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHNsaWNlKHN0YXJ0OiBudW1iZXIsIGVuZD86IG51bWJlcik6IExlYXZlcy5TbGljZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRvY2N1cmVuY2VzKG1pbjogbnVtYmVyLCBtYXg/OiBudW1iZXIpOiBMZWF2ZXMuT2NjdXJlbmNlcztcblx0XHRcblx0XHQvKiogKi9cblx0XHRzb3J0KC4uLmNvbnRlbnRUeXBlczogT2JqZWN0W10pOiBMZWF2ZXMuU29ydDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRyZXZlcnNlKCk6IExlYXZlcy5SZXZlcnNlO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdG5hbWVzKCk6IExlYXZlcy5OYW1lcztcblx0XHRcblx0XHQvKiogKi9cblx0XHRuYW1lZCh2YWx1ZTogc3RyaW5nKTogTGVhdmVzLlByZWRpY2F0ZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRzdW0oKTogTGVhdmVzLlN1bTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRhdmcoKTogTGVhdmVzLkF2Zztcblx0XHRcblx0XHQvKiogKi9cblx0XHRtaW4oKTogTGVhdmVzLk1pbjtcblx0XHRcblx0XHQvKiogKi9cblx0XHRtYXgoKTogTGVhdmVzLk1heDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRjb3VudCgpOiBMZWF2ZXMuQ291bnQ7XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIEJhY2tlclxue1xuXHQvKipcblx0ICogQml0d2lzZSBmbGFnIG1hbmFnZXJcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBCaXRmaWVsZHNcblx0e1xuXHRcdGNvbnN0cnVjdG9yKHB1YmxpYyBmbGFncyA9IDApIHt9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyBhcHByb3guIHNpemUgYmFzZWQgb24gbGFzdCBzZXQgYml0LlxuXHRcdCAqL1xuXHRcdGdldCBzaXplKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gTWF0aC5jZWlsKE1hdGgubG9nMih0aGlzLmZsYWdzKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdldHMgYSBib29sZWFuIGZyb20gc3BlY2lmaWVkIGluZGV4LlxuXHRcdCAqL1xuXHRcdGdldChpbmRleDogbnVtYmVyKVxuXHRcdHtcblx0XHRcdGlmIChpbmRleCA8IDAgfHwgaW5kZXggPiAzMSlcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcblx0XHRcdHJldHVybiB0aGlzLmZsYWdzICYgKDEgPDwgaW5kZXgpID8gdHJ1ZSA6IGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTZXRzIGEgYm9vbGVhbiB0byBzcGVjaWZpZWQgaW5kZXguXG5cdFx0ICovXG5cdFx0c2V0KGluZGV4OiBudW1iZXIsIHZhbHVlOiBib29sZWFuKVxuXHRcdHtcblx0XHRcdGlmIChpbmRleCA8IDAgfHwgaW5kZXggPiAzMSlcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBtYXNrID0gMSA8PCBpbmRleDtcblx0XHRcdFxuXHRcdFx0aWYgKHZhbHVlKVxuXHRcdFx0XHR0aGlzLmZsYWdzIHw9IG1hc2s7XG5cdFx0XHRlbHNlIFxuXHRcdFx0XHR0aGlzLmZsYWdzICY9IH5tYXNrO1xuXHRcdH1cblx0XHRcblx0XHR0b0pTT04oKSB7IHJldHVybiB0aGlzLmZsYWdzOyB9XG5cdFx0dmFsdWVPZigpIHsgcmV0dXJuIHRoaXMuZmxhZ3M7IH1cblx0XHRbU3ltYm9sLnRvUHJpbWl0aXZlXSgpIHsgcmV0dXJuIHRoaXMuZmxhZ3M7IH1cblx0XHRnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKSB7IHJldHVybiBcIkJpdGZpZWxkc1wiOyB9XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXJcbntcdFxuXHQvKipcblx0ICogUmVmZXJhbmNlcyB0byBldmVyeSBsb2FkZWQgQ29kZSBpbnN0YW5jZS5cblx0ICovXG5cdGV4cG9ydCBjb25zdCBDb2RlczogQ29kZVtdID0gW107XG5cdFxuXHQvKipcblx0ICogTGFzdCBsb2FkZWQgU2NoZW1hXG5cdCAqL1xuXHRleHBvcnQgbGV0IFNjaGVtYTogUmVjb3JkPHN0cmluZywgU3RydWN0PiA9IHt9O1xuXHRcblx0LyoqXG5cdCAqIFJlZmVyYW5jZXMgdG8gZXZlcnkgbG9hZGVkIFNjaGVtYVxuXHQgKi9cblx0ZXhwb3J0IGNvbnN0IFNjaGVtYXM6IFJlY29yZDxzdHJpbmcsIFN0cnVjdD5bXSA9IFtdO1xuXHRcblx0LyoqXG5cdCAqIExhc3QgbG9hZGVkIERhdGEgR3JhcGhcblx0ICovXG5cdGV4cG9ydCBsZXQgR3JhcGg6IFJlY29yZDxzdHJpbmcsIFN1cnJvZ2F0ZT4gPSB7fTtcblx0XG5cdC8qKlxuXHQgKiBSZWZlcmFuY2VzIHRvIGV2ZXJ5IGxvYWRlZCBEYXRhIEdyYXBoXG5cdCAqL1xuXHRleHBvcnQgY29uc3QgR3JhcGhzOiBSZWNvcmQ8c3RyaW5nLCBTdXJyb2dhdGU+W10gPSBbXTtcblx0XG5cdC8qKlxuXHQgKiBUcnV0aCBDb2RlIEpTT05cblx0ICogXG5cdCAqIFRoaXMgY2xhc3MgbWFuYWdlcyBjb2RlIHR5cGVzIGV4dHJhY3RlZCBmcm9tIFRydXRoIGZpbGUgYnkgY29tcGlsZXIuXG5cdCAqIEFsc28gbWFuYWdlcyByZWxhdGlvbnMgYmV0d2VlbiBwcm90b3R5cGUsIHR5cGVzIGFuZCBkYXRhLiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBDb2RlXG5cdHtcblx0XHQvKipcblx0XHQgKiBMb2FkcyBhIENvZGVKU09OIGFuZCBsb2FkcyBEYXRhSlNPTnMgb24gdGhhdCBDb2RlIGluc3RhbmNlLlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSBjb2RlIENvZGVKU09OIFVybFxuXHRcdCAqIEBwYXJhbSBkYXRhIERhdGFKU09OIFVybHNcblx0XHQgKi9cblx0XHRzdGF0aWMgYXN5bmMgbG9hZChjb2RlOiBzdHJpbmcsIC4uLmRhdGE6IHN0cmluZ1tdKVxuXHRcdHtcblx0XHRcdGNvbnN0IGluc3RhbmNlID0gQ29kZS5uZXcoYXdhaXQgVXRpbC5mZXRjaEpTT04oY29kZSkpO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHVybCBvZiBkYXRhKVxuXHRcdFx0XHRpbnN0YW5jZS5sb2FkRGF0YShhd2FpdCBVdGlsLmZldGNoSlNPTih1cmwpKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGluc3RhbmNlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBMb2FkcyBhIENvZGUgaW5zdGFuY2UgZnJvbSBwYXJzZWQgQ29kZSBKU09OLlxuXHRcdCAqIEBwYXJhbSBkYXRhIFBhcnNlZCBDb2RlSlNPTlxuXHRcdCAqL1xuXHRcdHN0YXRpYyBuZXcoZGF0YTogW1Byb3RvdHlwZUpTT05bXSwgVHlwZUpTT05bXV0pXG5cdFx0e1xuXHRcdFx0Y29uc3QgY29kZSA9IG5ldyBDb2RlKCk7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHByb3RvdHlwZXMgPSBkYXRhWzBdLm1hcCh4ID0+IFByb3RvdHlwZS5sb2FkKGNvZGUsIHgpKTtcblx0XHRcdGZvciAoY29uc3QgcHJvdG8gb2YgcHJvdG90eXBlcylcblx0XHRcdFx0Y29kZS5wcm90b3R5cGVzLnB1c2gocHJvdG8pO1xuXHRcdFx0XG5cdFx0XHRjb25zdCB0eXBlcyA9IGRhdGFbMV0ubWFwKHggPT4gVHlwZS5sb2FkKGNvZGUsIHgpKTtcblx0XHRcdGZvciAoY29uc3QgdHlwZSBvZiB0eXBlcylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgaWQgPSBjb2RlLnR5cGVzLnB1c2godHlwZSkgLSAxO1xuXHRcdFx0XHRGdXR1cmVUeXBlLklkTWFwLnNldChpZCwgdHlwZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGNvbnN0IFNjaGVtYTogUmVjb3JkPHN0cmluZywgU3RydWN0PiA9IHt9O1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHR5cGUgb2YgdHlwZXMpXG5cdFx0XHRcdGlmICghdHlwZS5jb250YWluZXIpXG5cdFx0XHRcdFx0U2NoZW1hW3R5cGUubmFtZV0gPSBuZXcgU3RydWN0KHR5cGUsIG51bGwpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHRCYWNrZXIuU2NoZW1hID0gU2NoZW1hO1xuXHRcdFx0XHRcdFxuXHRcdFx0U2NoZW1hcy5wdXNoKFNjaGVtYSk7XG5cdFx0XHRDb2Rlcy5wdXNoKGNvZGUpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gY29kZTtcblx0XHR9XG5cdFx0XG5cdFx0dHlwZXM6IFR5cGVbXSA9IFtdO1xuXHRcdHByb3RvdHlwZXM6IFByb3RvdHlwZVtdID0gW107XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQmluZHMgYSB0eXBlIHRvIENvZGUgaW5zdGFuY2Vcblx0XHQgKi9cblx0XHRhZGQodHlwZTogVHlwZSlcblx0XHR7XG5cdFx0XHRpZiAoIXRoaXMucHJvdG90eXBlcy5zb21lKHggPT4geC5oYXNoID09PSB0eXBlLnByb3RvdHlwZS5oYXNoKSlcblx0XHRcdFx0dGhpcy5wcm90b3R5cGVzLnB1c2godHlwZS5wcm90b3R5cGUpO1xuXHRcdFx0XHRcblx0XHRcdGNvbnN0IGlkID0gdGhpcy50eXBlcy5wdXNoKHR5cGUpIC0gMTtcblx0XHRcdHR5cGUudHJhbnNmZXIodGhpcyk7XG5cdFx0XHRyZXR1cm4gaWQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIExvYWRzIGRhdGEgdHlwZXMgYW5kIHN1cnJvZ2F0ZXMgZnJvbSBwYXJzZWQgRGF0YUpTT04uXG5cdFx0ICogQHBhcmFtIGRhdGEgUGFyc2VkIERhdGFKU09OXG5cdFx0ICovXG5cdFx0bG9hZERhdGEoZGF0YTogRGF0YUpTT05bXSlcblx0XHR7XHRcblx0XHRcdGNvbnN0IEdyYXBoOiBSZWNvcmQ8c3RyaW5nLCBTdXJyb2dhdGU+ID0ge307XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgaW5mbyBvZiBkYXRhKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBwcm90b3R5cGVzID0gaW5mby5zaGlmdCgpIGFzIG51bWJlcltdO1xuXHRcdFx0XHRjb25zdCBuYW1lID0gaW5mby5zaGlmdCgpIGFzIHN0cmluZztcblx0XHRcdFx0Y29uc3QgcHJvdG90eXBlID0gdGhpcy5wcm90b3R5cGVzW3Byb3RvdHlwZXMuc2hpZnQoKSFdO1xuXHRcdFx0XHRjb25zdCB0eXBlID0gbmV3IFR5cGUoXG5cdFx0XHRcdFx0dGhpcywgXG5cdFx0XHRcdFx0bmFtZSwgXG5cdFx0XHRcdFx0cHJvdG90eXBlLCBcblx0XHRcdFx0XHRudWxsLFxuXHRcdFx0XHRcdFZhbHVlU3RvcmUubG9hZCguLi5pbmZvLnNoaWZ0KCkgYXMgVmFsdWVKU09OW10pXG5cdFx0XHRcdCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBnZW5lcmF0ZSA9IChiYXNlOiBUeXBlLCBjb250ZW50czogVHlwZVtdKSA9PiBcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGZvciAoY29uc3QgY29udGVudCBvZiBjb250ZW50cylcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBjbG9uZSA9IG5ldyBUeXBlKFxuXHRcdFx0XHRcdFx0XHR0aGlzLFxuXHRcdFx0XHRcdFx0XHRjb250ZW50Lm5hbWUsXG5cdFx0XHRcdFx0XHRcdHRoaXMucHJvdG90eXBlc1twcm90b3R5cGVzLnNoaWZ0KCkhXSxcblx0XHRcdFx0XHRcdFx0RnV0dXJlVHlwZS5uZXcoYmFzZSksXG5cdFx0XHRcdFx0XHRcdGNvbnRlbnQudmFsdWVzLmNvbmNhdChWYWx1ZVN0b3JlLmxvYWQoLi4uaW5mby5zaGlmdCgpIGFzIFZhbHVlSlNPTltdKSlcblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR0aGlzLnR5cGVzLnB1c2goY2xvbmUpO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRnZW5lcmF0ZShjbG9uZSwgY2xvbmUucGFyYWxsZWxDb250ZW50cyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRnZW5lcmF0ZSh0eXBlLCB0eXBlLnBhcmFsbGVsQ29udGVudHMpO1xuXHRcdFx0XHRcblx0XHRcdFx0R3JhcGhbdHlwZS5uYW1lXSA9IG5ldyBTdXJyb2dhdGUodHlwZSwgbnVsbCk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdEJhY2tlci5HcmFwaCA9IEdyYXBoO1xuXHRcdFx0R3JhcGhzLnB1c2goR3JhcGgpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gR3JhcGg7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEV4dHJhY3QgZGF0YSBmcm9tIGN1cnJlbnQgdHlwZXMgb2YgQ29kZVxuXHRcdCAqIEBwYXJhbSBwYXR0ZXJuIERhdGEgTmFtZSBQYXR0ZXJuXG5cdFx0ICovXG5cdFx0ZXh0cmFjdERhdGEocGF0dGVybjogUmVnRXhwKVxuXHRcdHtcblx0XHRcdGNvbnN0IGRhdGFSb290cyA9IHRoaXMudHlwZXMuZmlsdGVyKHggPT4geC5jb250YWluZXIgPT09IG51bGwgJiYgcGF0dGVybi50ZXN0KHgubmFtZSkpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBkcmlsbCA9ICh4OiBUeXBlKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBhcnJheSA9IFt4XTtcblx0XHRcdFx0Zm9yIChjb25zdCB0eXBlIG9mIHguY29udGVudHMpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBjaGlsZCA9IGRyaWxsKHR5cGUpLmZsYXQoKTtcblx0XHRcdFx0XHRpZiAoY2hpbGQubGVuZ3RoKVxuXHRcdFx0XHRcdFx0YXJyYXkucHVzaCguLi5jaGlsZCk7XG5cdFx0XHRcdH0gXG5cdFx0XHRcdHJldHVybiBhcnJheTtcblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdGNvbnN0IGRhdGFTY2hlbWEgPSBkYXRhUm9vdHMubWFwKGRyaWxsKS5maWx0ZXIoeCA9PiBBcnJheS5pc0FycmF5KHgpID8geC5sZW5ndGggOiB0cnVlKTtcblx0XHRcdGNvbnN0IGRhdGFRdWVyeSA9IGRhdGFTY2hlbWEuZmxhdCgpO1xuXHRcdFx0Y29uc3QgY29kZVJvb3RzID0gdGhpcy50eXBlcy5maWx0ZXIoeCA9PiAhZGF0YVF1ZXJ5LmluY2x1ZGVzKHgpKTtcblx0XHRcdGNvbnN0IGNvZGUgPSBuZXcgQ29kZSgpO1xuXHRcdFx0Zm9yIChjb25zdCB0eXBlIG9mIGNvZGVSb290cylcblx0XHRcdFx0Y29kZS5hZGQodHlwZSk7XG5cdFx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCB0eXBlIG9mIGRhdGFRdWVyeSlcblx0XHRcdHtcdFx0XHRcblx0XHRcdFx0aWYgKCFjb2RlLnByb3RvdHlwZXMuc29tZSh4ID0+IHguaGFzaCA9PT0gdHlwZS5wcm90b3R5cGUuaGFzaCkpXG5cdFx0XHRcdFx0Y29kZS5wcm90b3R5cGVzLnB1c2godHlwZS5wcm90b3R5cGUpO1x0XG5cdFx0XHRcdHR5cGUudHJhbnNmZXIoY29kZSk7XG5cdFx0XHR9XG5cdFx0XG5cdFx0XHRjb25zdCBkYXRhID0gZGF0YVNjaGVtYS5tYXAoeCA9PiBbeC5tYXAoeCA9PiB4LnByb3RvdHlwZS5pZCksIHhbMF0ubmFtZSwgLi4ueC5tYXAoeCA9PiB4LnZhbHVlcy52YWx1ZVN0b3JlKV0pO1xuXHRcdFx0XHRcdFx0XHRcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGNvZGUsXG5cdFx0XHRcdGRhdGFcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKCkgeyByZXR1cm4gW3RoaXMucHJvdG90eXBlcywgdGhpcy50eXBlc107IH1cblx0XHR2YWx1ZU9mKCkgeyByZXR1cm4gdGhpcy50eXBlcy5sZW5ndGg7IH1cblx0XHRbU3ltYm9sLnRvUHJpbWl0aXZlXSgpIHsgcmV0dXJuIHRoaXMudHlwZXMubGVuZ3RoOyB9XG5cdFx0Z2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkgeyByZXR1cm4gXCJDb2RlXCI7IH1cblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlci5UcnV0aFRhbGtcbntcblx0dHlwZSBDdXJzb3IgPSBTdXJyb2dhdGUgfCBOYW1lIHzCoFN1bW1hcnk7XG5cdHR5cGUgTWF5YmVBcnJheTxUPiA9IFQgfCBUW107XG5cdFxuXHRjb25zdCBTdXJyb2dhdGVGaWx0ZXIgPSAoeDogQ3Vyc29yKTogeCBpcyBTdXJyb2dhdGUgPT4geCBpbnN0YW5jZW9mIFN1cnJvZ2F0ZTtcblx0XG5cdGV4cG9ydCBmdW5jdGlvbiBFeGVjdXRlKEFzdDogQnJhbmNoKVxuXHR7XG5cdFx0Y29uc3QgY3Vyc29ycyA9IG5ldyBDdXJzb3JTZXQoLi4uT2JqZWN0LnZhbHVlcyhCYWNrZXIuR3JhcGgpKTtcblx0XHRjdXJzb3JzLnF1ZXJ5KEFzdCk7XG5cdFx0cmV0dXJuIGN1cnNvcnMuc25hcHNob3QoKTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIEtlZXBzIHRyYWNrIG9mIHBvc3NpYmxlIG91dHB1dCBvZiBxdWVyeVxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIEN1cnNvclNldFxuXHR7XHRcblx0XHRjdXJzb3JzOiBTZXQ8Q3Vyc29yPjtcblx0XHRcblx0XHRjb25zdHJ1Y3RvciguLi5jdXJzb3JzOiBDdXJzb3JbXSlcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KGN1cnNvcnMpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTbmFwc2hvdCBvZiBjdXJyZW50IHBvc3NpYmlsaXRpZXNcblx0XHQgKi9cblx0XHRzbmFwc2hvdCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIEFycmF5LmZyb20odGhpcy5jdXJzb3JzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0bWFwKGZpbHRlcjogKGN1cnNvcjogQ3Vyc29yKSA9PiBib29sZWFuLCBtYXA6IChpdGVtczogQ3Vyc29yKSA9PiBNYXliZUFycmF5PEN1cnNvcj4pXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkuZmlsdGVyKGZpbHRlcikuZmxhdE1hcChtYXApLmZpbHRlcih4ID0+ICEheCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDbG9uZXMgY3VycmVudCBzdGF0ZSBvZiBDdXJzb3JTZXRcblx0XHQgKi9cblx0XHRjbG9uZSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBDdXJzb3JTZXQoLi4udGhpcy5zbmFwc2hvdCgpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRmlsdGVycyBjdXJyZW50IHBvc3NpYmlsaXRpZXNcblx0XHQgKi9cblx0XHRmaWx0ZXIoZm46ICh2OiBDdXJzb3IpID0+IGJvb2xlYW4pXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkuZmlsdGVyKHggPT4gZm4oeCkpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRmlsdGVycyBjdXJyZW50IHBvc3NpYmlsaXRpZXNcblx0XHQgKi9cblx0XHRmaWx0ZXJTdXJyb2dhdGUoZm46ICh2OiBTdXJyb2dhdGUpID0+IGJvb2xlYW4pXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkuZmlsdGVyKCh4KTogeCBpcyBTdXJyb2dhdGUgPT4geCBpbnN0YW5jZW9mIFN1cnJvZ2F0ZSAmJiBmbih4KSkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBFeGVjdXRlcyBhIFRydXRoIFRhbGsgcXVlcnlcblx0XHQgKi9cblx0XHRxdWVyeShhc3Q6IEJyYW5jaCB8IExlYWYpIFxuXHRcdHtcblx0XHRcdGlmIChhc3QgaW5zdGFuY2VvZiBCcmFuY2gpXG5cdFx0XHRcdHRoaXMuYnJhbmNoKGFzdCk7XG5cdFx0XHRlbHNlIFxuXHRcdFx0XHR0aGlzLmxlYWYoYXN0KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRXhlY3V0ZXMgYSBUcnV0aCBUYWxrIGJyYW5jaFxuXHRcdCAqL1xuXHRcdGJyYW5jaChicmFuY2g6IEJyYW5jaCkgXG5cdFx0e1xuXHRcdFx0c3dpdGNoIChicmFuY2hbb3BdKVxuXHRcdFx0e1xuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLmlzOlxuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLnF1ZXJ5OlxuXHRcdFx0XHRcdGZvciAoY29uc3QgcXVlcnkgb2YgYnJhbmNoLmNoaWxkcmVuKVxuXHRcdFx0XHRcdFx0dGhpcy5xdWVyeShxdWVyeSk7XHRcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBCcmFuY2hPcC5ub3Q6IFxuXHRcdFx0XHRcdHRoaXMubm90KGJyYW5jaCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgQnJhbmNoT3Aub3I6XG5cdFx0XHRcdFx0dGhpcy5vcihicmFuY2gpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLmhhczpcblx0XHRcdFx0XHR0aGlzLmNvbnRlbnRzKCk7XG5cdFx0XHRcdFx0Zm9yIChjb25zdCBxdWVyeSBvZiBicmFuY2guY2hpbGRyZW4pXG5cdFx0XHRcdFx0XHR0aGlzLnF1ZXJ5KHF1ZXJ5KTtcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lcnMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRXhlY3V0ZXMgYSBUcnV0aCBUYWxrIGxlYWZcblx0XHQgKi9cblx0XHRsZWFmKGxlYWY6IExlYWYpIFxuXHRcdHtcblx0XHRcdHN3aXRjaCAobGVhZltvcF0pXG5cdFx0XHR7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLnN1cnJvZ2F0ZTpcblx0XHRcdFx0XHR0aGlzLmZpbHRlclN1cnJvZ2F0ZSh4ID0+IHhbdHlwZU9mXS5pcygoPFN1cnJvZ2F0ZT5sZWFmKVt0eXBlT2ZdKSB8fCB4W3R5cGVPZl0ucGFyYWxsZWxSb290cy5pbmNsdWRlcygoPFN1cnJvZ2F0ZT5sZWFmKVt0eXBlT2ZdKSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLmNvbnRlbnRzOlxuXHRcdFx0XHRcdHRoaXMuY29udGVudHMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3Aucm9vdHM6XG5cdFx0XHRcdFx0dGhpcy5yb290cygpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5jb250YWluZXJzOlxuXHRcdFx0XHRcdHRoaXMuY29udGFpbmVycygpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5hbGlhc2VkOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHggPT4geFt2YWx1ZV0gIT09IG51bGwpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5sZWF2ZXM6XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoeCA9PiB4W3ZhbHVlXSA9PT0gbnVsbCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLmZyZXNoOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyU3Vycm9nYXRlKHggPT4geFt0eXBlT2ZdLmlzRnJlc2gpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLmVxdWFsczpcblx0XHRcdFx0XHR0aGlzLmVxdWFscyg8TGVhdmVzLlByZWRpY2F0ZT5sZWFmKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBQcmVkaWNhdGVPcC5ncmVhdGVyVGhhbjpcblx0XHRcdFx0XHR0aGlzLmZpbHRlcih4ID0+ICh4W3ZhbHVlXSB8fMKgMCkgPiAoPExlYXZlcy5QcmVkaWNhdGU+bGVhZikub3BlcmFuZCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgUHJlZGljYXRlT3AubGVzc1RoYW46XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoeCA9PiAoeFt2YWx1ZV0gfHwgMCkgPCAoPExlYXZlcy5QcmVkaWNhdGU+bGVhZikub3BlcmFuZCk7XG5cdFx0XHRcdFx0YnJlYWs7XHRcblx0XHRcdFx0Y2FzZSBQcmVkaWNhdGVPcC5zdGFydHNXaXRoOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHggPT4geFt2YWx1ZV0gPT0gbnVsbCA/IGZhbHNlIDogeFt2YWx1ZV0hLnRvU3RyaW5nKCkuc3RhcnRzV2l0aCg8c3RyaW5nPig8TGVhdmVzLlByZWRpY2F0ZT5sZWFmKS5vcGVyYW5kKSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgUHJlZGljYXRlT3AuZW5kc1dpdGg6XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoeCA9PiB4W3ZhbHVlXSA9PSBudWxsID8gZmFsc2UgOiB4W3ZhbHVlXSEudG9TdHJpbmcoKS5lbmRzV2l0aCg8c3RyaW5nPig8TGVhdmVzLlByZWRpY2F0ZT5sZWFmKS5vcGVyYW5kKSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLnNsaWNlOlxuXHRcdFx0XHRcdHRoaXMuc2xpY2UobGVhZik7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLm9jY3VyZW5jZXM6XG5cdFx0XHRcdFx0dGhpcy5vY2N1cmVuY2VzKGxlYWYpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5zb3J0OiBcblx0XHRcdFx0XHR0aGlzLnNvcnQobGVhZik7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLnJldmVyc2U6XG5cdFx0XHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkucmV2ZXJzZSgpKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3AubmFtZXM6XG5cdFx0XHRcdFx0dGhpcy5uYW1lcygpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLm5hbWVkOlxuXHRcdFx0XHRcdHRoaXMubmFtZXMoKTtcblx0XHRcdFx0XHR0aGlzLmVxdWFscyg8TGVhdmVzLlByZWRpY2F0ZT5sZWFmKTtcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lcnMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0ZXF1YWxzKGxlYWY6IExlYXZlcy5QcmVkaWNhdGUpXG5cdFx0e1xuXHRcdFx0dGhpcy5maWx0ZXIoeCA9PiB4W3ZhbHVlXSAhPT0gbnVsbCA/IHhbdmFsdWVdID09IChsZWFmKS5vcGVyYW5kIDogZmFsc2UpO1xuXHRcdH1cblx0XHRcblx0XHRuYW1lcygpXG5cdFx0e1xuXHRcdFx0dGhpcy5tYXAoU3Vycm9nYXRlRmlsdGVyLCAoeCkgPT4gKDxTdXJyb2dhdGU+eClbbmFtZV0pO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHbyBvbmUgbGV2ZWwgbmVzdGVkIGluXG5cdFx0ICovXG5cdFx0Y29udGVudHMoKVxuXHRcdHtcblx0XHRcdHRoaXMubWFwKFN1cnJvZ2F0ZUZpbHRlciwgeCA9PiAoPFN1cnJvZ2F0ZT54KS5jb250ZW50cyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdvIHRvIHRvcCBsZXZlbFxuXHRcdCAqL1xuXHRcdHJvb3RzKClcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KHRoaXMuc25hcHNob3QoKS5tYXAoKHg6IEN1cnNvciB8wqBudWxsKSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0d2hpbGUgKHggJiYgeFtwYXJlbnRdKSBcblx0XHRcdFx0XHRcdHggPSB4W3BhcmVudF0gYXMgU3Vycm9nYXRlO1xuXHRcdFx0XHRcdHJldHVybiB4O1x0XHRcdFx0XG5cdFx0XHRcdH0pLmZpbHRlcigoeCk6IHggaXMgU3Vycm9nYXRlID0+ICEheCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHbyBvbmUgbGV2ZWwgbmVzdGVkIG91dFxuXHRcdCAqL1xuXHRcdGNvbnRhaW5lcnMoKVxuXHRcdHtcblx0XHRcdHRoaXMubWFwKHggPT4gISF4W3BhcmVudF0sIHggPT4gKDxhbnk+eFtwYXJlbnRdKSk7XG5cdFx0fVxuXHRcblx0XHQvKiogKi9cblx0XHRub3QoYnJhbmNoOiBCcmFuY2gpXG5cdFx0e1xuXHRcdFx0Y29uc3QgaW5zdGFuY2UgPSB0aGlzLmNsb25lKCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHF1ZXJ5IG9mIGJyYW5jaC5jaGlsZHJlbilcblx0XHRcdFx0aW5zdGFuY2UucXVlcnkocXVlcnkpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBzbmFwID0gaW5zdGFuY2Uuc25hcHNob3QoKTtcblx0XHRcdHRoaXMuZmlsdGVyKHggPT4gIXNuYXAuaW5jbHVkZXMoeCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRvcihicmFuY2g6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRjb25zdCBpbnN0YW5jZXMgPSBbXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBxdWVyeSBvZiBicmFuY2guY2hpbGRyZW4pXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGluc3RhbmNlID0gdGhpcy5jbG9uZSgpO1x0XG5cdFx0XHRcdGluc3RhbmNlLnF1ZXJ5KHF1ZXJ5KTtcblx0XHRcdFx0aW5zdGFuY2VzLnB1c2goaW5zdGFuY2UpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRjb25zdCBzbmFwID0gaW5zdGFuY2VzLmZsYXQoKTtcblx0XHRcdHRoaXMuZmlsdGVyKHggPT4gc25hcC5pbmNsdWRlcyh4KSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHNsaWNlKGxlYWY6IExlYWYpXG5cdFx0e1xuXHRcdFx0bGV0IHtcblx0XHRcdFx0c3RhcnQsXG5cdFx0XHRcdGVuZFxuXHRcdFx0fcKgPSA8TGVhdmVzLlNsaWNlPmxlYWY7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHNuYXAgPSB0aGlzLnNuYXBzaG90KCk7XG5cdFx0XHRpZiAoZW5kICYmIGVuZCA8IDEpIGVuZCA9IHN0YXJ0ICsgTWF0aC5yb3VuZChlbmQgKiBzbmFwLmxlbmd0aCk7XG5cdFx0XHRcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQoc25hcC5zbGljZShzdGFydCwgZW5kKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdG9jY3VyZW5jZXMobGVhZjogTGVhZilcblx0XHR7XG5cdFx0XHRsZXQge1xuXHRcdFx0XHRtaW4sXG5cdFx0XHRcdG1heFxuXHRcdFx0fcKgPSA8TGVhdmVzLk9jY3VyZW5jZXM+bGVhZjtcblx0XHRcdFxuXHRcdFx0aWYgKCFtYXgpIG1heCA9IG1pbjtcblxuXHRcdFx0Y29uc3QgdmFsdWVNYXA6IFJlY29yZDxzdHJpbmcsIEN1cnNvcltdPiA9IHt9O1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5jdXJzb3JzKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB2YWwgPSBKU09OLnN0cmluZ2lmeShpdGVtW3ZhbHVlXSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoIXZhbHVlTWFwLmhhc093blByb3BlcnR5KHZhbCkpXG5cdFx0XHRcdFx0dmFsdWVNYXBbdmFsXSA9IFtdO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHR2YWx1ZU1hcFt2YWxdLnB1c2goaXRlbSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQoT2JqZWN0LnZhbHVlcyh2YWx1ZU1hcCkuZmlsdGVyKHggPT4geC5sZW5ndGggPj0gbWluICYmIHgubGVuZ3RoIDw9IG1heCkuZmxhdCgpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aXMoc3Vycm9nYXRlOiBTdXJyb2dhdGUsIG5vdCA9IGZhbHNlKVxuXHRcdHtcblx0XHRcdGNvbnN0IGluc3RhbmNlID0gdGhpcy5jbG9uZSgpO1xuXHRcdFx0cmV0dXJuIGluc3RhbmNlLmZpbHRlclN1cnJvZ2F0ZSh4ID0+IFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgY29uZGl0aW9uID0geFt0eXBlT2ZdLmlzKHN1cnJvZ2F0ZVt0eXBlT2ZdKSB8fCB4W3R5cGVPZl0ucGFyYWxsZWxSb290cy5pbmNsdWRlcyhzdXJyb2dhdGVbdHlwZU9mXSk7XG5cdFx0XHRcdFx0cmV0dXJuIG5vdCA/ICFjb25kaXRpb24gOiBjb25kaXRpb247XG5cdFx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRzb3J0KGxlYWY6IExlYWYpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RydWN0cyA9ICg8U3RydWN0W10+KDxMZWF2ZXMuU29ydD5sZWFmKS5jb250ZW50VHlwZXMpLmZpbHRlcigoeCkgPT4gISF4KS5yZXZlcnNlKCk7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHNuYXAgPSB0aGlzLnNuYXBzaG90KCk7XG5cdFx0XHRcblx0XHRcdHNuYXAuc29ydCgoeCx5KSA9PiB4W3ZhbHVlXSAtIHlbdmFsdWVdKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBzdHJ1Y3Qgb2Ygc3RydWN0cylcblx0XHRcdFx0c25hcC5zb3J0KChhLCBiKSA9PiBcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmICghKGEgaW5zdGFuY2VvZiBTdXJyb2dhdGUpKSBcblx0XHRcdFx0XHRcdGlmICghKGIgaW5zdGFuY2VvZiBTdXJyb2dhdGUpKVxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdFx0XHRcdGVsc2UgcmV0dXJuIC0xO1xuXHRcdFx0XHRcdGVsc2UgaWYgKCEoYiBpbnN0YW5jZW9mIFN1cnJvZ2F0ZSkpXG5cdFx0XHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRjb25zdCBwMSA9IGEuZ2V0KHN0cnVjdCk7XG5cdFx0XHRcdFx0Y29uc3QgcDIgPSBiLmdldChzdHJ1Y3QpO1xuXHRcdFx0XHRcdGNvbnN0IHYxOiBudW1iZXIgPSBwMSA/IDxhbnk+cDFbdmFsdWVdIHx8IDA6IDA7XG5cdFx0XHRcdFx0Y29uc3QgdjI6IG51bWJlciA9IHAyID8gPGFueT5wMlt2YWx1ZV0gfHwgMDogMDtcblx0XHRcdFx0XHRyZXR1cm4gdjEgLSB2Mjtcblx0XHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQoc25hcCk7XG5cdFx0fVxuXHRcdFxuXHR9XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyXG57XG5cdFxuXHRleHBvcnQgdHlwZSBUeXBlaXNoID0gVHJ1dGguVHlwZSB8wqBUeXBlIHwgbnVtYmVyO1xuXHRcblx0ZXhwb3J0IGNsYXNzIEZ1dHVyZVR5cGVcblx0e1xuXHRcdHN0YXRpYyBDYWNoZSA9IG5ldyBNYXA8VHlwZWlzaCwgRnV0dXJlVHlwZT4oKTtcblx0XHRzdGF0aWMgVHlwZU1hcCA9IG5ldyBNYXA8VHJ1dGguVHlwZSwgVHlwZT4oKTtcblx0XHRzdGF0aWMgSWRNYXAgPSBuZXcgTWFwPG51bWJlciwgVHlwZT4oKTtcblx0XHRcblx0XHRzdGF0aWMgbmV3KHZhbHVlOiBUeXBlaXNoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGNhY2hlZCA9IEZ1dHVyZVR5cGUuQ2FjaGUuZ2V0KHZhbHVlKTtcblx0XHRcdFxuXHRcdFx0aWYgKGNhY2hlZClcblx0XHRcdFx0cmV0dXJuIGNhY2hlZDtcblx0XHRcdFx0XG5cdFx0XHRjb25zdCBpbnN0YW5jZSA9IG5ldyBGdXR1cmVUeXBlKHZhbHVlKTtcblx0XHRcdEZ1dHVyZVR5cGUuQ2FjaGUuc2V0KHZhbHVlLCBpbnN0YW5jZSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBpbnN0YW5jZTtcblx0XHR9IFxuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKHByaXZhdGUgdmFsdWU6IFR5cGVpc2gpIHsgfVxuXHRcdCBcblx0XHRnZXQgdHlwZSgpXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMudmFsdWUgaW5zdGFuY2VvZiBUcnV0aC5UeXBlKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB0eXBlID0gRnV0dXJlVHlwZS5UeXBlTWFwLmdldCh0aGlzLnZhbHVlKTtcblx0XHRcdFx0aWYgKCF0eXBlKSBcblx0XHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdFx0cmV0dXJuIHR5cGU7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGlmICh0aGlzLnZhbHVlIGluc3RhbmNlb2YgVHlwZSlcblx0XHRcdFx0cmV0dXJuIHRoaXMudmFsdWU7XG5cdFx0XHRcdFxuXHRcdFx0cmV0dXJuIEZ1dHVyZVR5cGUuSWRNYXAuZ2V0KHRoaXMudmFsdWUpIHx8IG51bGw7XG5cdFx0fVxuXHRcdFxuXHRcdGdldCBpZCgpXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMudmFsdWUgaW5zdGFuY2VvZiBUcnV0aC5UeXBlKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB0eXBlID0gRnV0dXJlVHlwZS5UeXBlTWFwLmdldCh0aGlzLnZhbHVlKTtcblx0XHRcdFx0aWYgKCF0eXBlKSBcblx0XHRcdFx0XHRyZXR1cm4gLTE7XG5cdFx0XHRcdHJldHVybiB0eXBlLmlkO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRpZiAodGhpcy52YWx1ZSBpbnN0YW5jZW9mIFR5cGUpXG5cdFx0XHRcdHJldHVybiB0aGlzLnZhbHVlLmlkO1xuXHRcdFx0XHRcblx0XHRcdHJldHVybiB0aGlzLnZhbHVlO1xuXHRcdH1cblx0XHRcblx0XHRpcyh0eXBlOiBUeXBlKVxuXHRcdHtcblx0XHRcdGNvbnN0IHZhbHVlVHlwZSA9IHRoaXMudmFsdWU7XG5cdFx0XHRpZiAoIXZhbHVlVHlwZSkgcmV0dXJuIGZhbHNlO1xuXHRcdFx0cmV0dXJuIHZhbHVlVHlwZSA9PT0gdHlwZTtcdFxuXHRcdH1cblx0XHRcblx0XHR0b0pTT04oKSB7IHJldHVybiB0aGlzLmlkOyB9XG5cdFx0dmFsdWVPZigpIHsgcmV0dXJuIHRoaXMuaWQ7IH1cblx0XHRbU3ltYm9sLnRvUHJpbWl0aXZlXSgpIHsgcmV0dXJuIHRoaXMuaWQ7IH1cblx0XHRnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKSB7IHJldHVybiBcIkZ1dHVyZVR5cGVcIjsgfVxuXHR9XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyLlRydXRoVGFsa1xue1xuXHRleHBvcnQgY29uc3Qgb3AgPSBTeW1ib2woXCJvcFwiKTtcblx0ZXhwb3J0IGNvbnN0IGNvbnRhaW5lciA9IFN5bWJvbChcImNvbnRhaW5lclwiKTtcblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgZW51bSBCcmFuY2hPcFxuXHR7XG5cdFx0cXVlcnkgPSAxLFxuXHRcdGlzID0gMixcblx0XHRoYXMgPSAzLFxuXHRcdG5vdCA9IDQsXG5cdFx0b3IgPSA1LFxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGVudW0gUHJlZGljYXRlT3Bcblx0e1xuXHRcdGVxdWFscyA9IDMwLFxuXHRcdGdyZWF0ZXJUaGFuID0gMzEsXG5cdFx0Z3JlYXRlclRoYW5PckVxdWFscyA9IDMyLFxuXHRcdGxlc3NUaGFuID0gMzMsXG5cdFx0bGVzc1RoYW5PckVxdWFscyA9IDM0LFxuXHRcdGFsaWtlID0gMzUsXG5cdFx0c3RhcnRzV2l0aCA9IDM2LFxuXHRcdGVuZHNXaXRoICA9IDM3LFxuXHRcdGluY2x1ZGVzID0gMzgsXG5cdFx0bWF0Y2hlcyA9IDM5LFxuXHRcdG5hbWVkID0gNDBcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBlbnVtIExlYWZPcFxuXHR7XG5cdFx0cHJlZGljYXRlID0gNjAsXG5cdFx0c2xpY2UgPSA2MSxcblx0XHRvY2N1cmVuY2VzID0gNjIsXG5cdFx0YWxpYXNlZCA9IDYzLFxuXHRcdHRlcm1pbmFscyA9IDY0LFxuXHRcdHNvcnQgPSA2NSxcblx0XHRyZXZlcnNlID0gNjYsXG5cdFx0c3Vycm9nYXRlID0gNjcsXG5cdFx0Y29udGFpbmVycyA9IDY4LFxuXHRcdHJvb3RzID0gNjksXG5cdFx0Y29udGVudHMgPSA3MCxcblx0XHRsZWF2ZXMgPSA3MSxcblx0XHRmcmVzaCA9IDcyLFxuXHRcdG5hbWVzID0gNzMsXG5cdFx0c3VtID0gNzQsXG5cdFx0YXZnID0gNzUsXG5cdFx0bWluID0gNzYsXG5cdFx0bWF4ID0gNzcsXG5cdFx0Y291bnQgPSA3OFxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IHR5cGUgTm9kZU9wID1cblx0XHRCcmFuY2hPcCB8IFxuXHRcdExlYWZPcCB8XG5cdFx0UHJlZGljYXRlT3A7XG5cdFxuXHQvLyMgQWJzdHJhY3QgQ2xhc3Nlc1xuXHRcblx0LyoqICovXG5cdGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBOb2RlXG5cdHtcblx0XHRhYnN0cmFjdCByZWFkb25seSBbb3BdOiBOb2RlT3A7XG5cdFx0XG5cdFx0cmVhZG9ubHkgW2NvbnRhaW5lcl06IEJyYW5jaCB8IG51bGwgPSBudWxsO1xuXHRcdFxuXHRcdFtSZWZsZXguYXRvbV0oZGVzdGluYXRpb246IEJyYW5jaClcblx0XHR7XG5cdFx0XHRkZXN0aW5hdGlvbi5hZGRDaGlsZCh0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0c2V0Q29udGFpbmVyKGNvbnQ6IEJyYW5jaCB8wqBudWxsKVxuXHRcdHtcblx0XHRcdC8vQHRzLWlnbm9yZVxuXHRcdFx0dGhpc1tjb250YWluZXJdID0gY29udDtcblx0XHR9XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgYWJzdHJhY3QgY2xhc3MgQnJhbmNoIGV4dGVuZHMgTm9kZVxuXHR7XG5cdFx0LyoqICovXG5cdFx0YWRkQ2hpbGQoY2hpbGQ6IE5vZGUsIHBvc2l0aW9uID0gLTEpXG5cdFx0e1xuXHRcdFx0Y2hpbGQuc2V0Q29udGFpbmVyKHRoaXMpO1xuXHRcdFx0XG5cdFx0XHRpZiAocG9zaXRpb24gPT09IC0xKVxuXHRcdFx0XHRyZXR1cm4gdm9pZCB0aGlzLl9jaGlsZHJlbi5wdXNoKGNoaWxkKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgYXQgPSB0aGlzLl9jaGlsZHJlbi5sZW5ndGggLSBwb3NpdGlvbiArIDE7XG5cdFx0XHR0aGlzLl9jaGlsZHJlbi5zcGxpY2UoYXQsIDAsIGNoaWxkKTtcblx0XHRcdHJldHVybiBjaGlsZDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVtb3ZlQ2hpbGQoY2hpbGQ6IE5vZGUpOiBOb2RlIHwgbnVsbDtcblx0XHRyZW1vdmVDaGlsZChjaGlsZElkeDogbnVtYmVyKSA6IE5vZGV8IG51bGw7XG5cdFx0cmVtb3ZlQ2hpbGQocGFyYW06IE5vZGUgfCBudW1iZXIpXG5cdFx0e1xuXHRcdFx0Y29uc3QgY2hpbGRJZHggPSBwYXJhbSBpbnN0YW5jZW9mIE5vZGUgP1xuXHRcdFx0XHR0aGlzLl9jaGlsZHJlbi5pbmRleE9mKHBhcmFtKSA6XG5cdFx0XHRcdHBhcmFtO1xuXHRcdFx0XG5cdFx0XHRpZiAoY2hpbGRJZHggPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCByZW1vdmVkID0gdGhpcy5fY2hpbGRyZW4uc3BsaWNlKGNoaWxkSWR4LCAxKVswXTtcblx0XHRcdFx0cmVtb3ZlZC5zZXRDb250YWluZXIobnVsbCk7XG5cdFx0XHRcdHJldHVybiByZW1vdmVkO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IGNoaWxkcmVuKCk6IHJlYWRvbmx5IChCcmFuY2ggfCBMZWFmKVtdXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NoaWxkcmVuO1xuXHRcdH1cblx0XHRwcml2YXRlIHJlYWRvbmx5IF9jaGlsZHJlbjogKEJyYW5jaCB8IExlYWYpW10gPSBbXTtcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBMZWFmIGV4dGVuZHMgTm9kZSB7IH1cblx0XG5cdC8vIyBDb25jcmV0ZSBDbGFzc2VzXG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IG5hbWVzcGFjZSBCcmFuY2hlc1xuXHR7XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFF1ZXJ5IGV4dGVuZHMgQnJhbmNoXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IEJyYW5jaE9wLnF1ZXJ5O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgSXMgZXh0ZW5kcyBCcmFuY2hcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gQnJhbmNoT3AuaXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBIYXMgZXh0ZW5kcyBCcmFuY2hcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gQnJhbmNoT3AuaGFzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgTm90IGV4dGVuZHMgQnJhbmNoXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IEJyYW5jaE9wLm5vdDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIE9yIGV4dGVuZHMgQnJhbmNoXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IEJyYW5jaE9wLm9yO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBuYW1lc3BhY2UgTGVhdmVzXG5cdHtcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgUHJlZGljYXRlIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF06IFByZWRpY2F0ZU9wO1xuXHRcdFx0XG5cdFx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdFx0b3B2OiBQcmVkaWNhdGVPcCxcblx0XHRcdFx0cmVhZG9ubHkgb3BlcmFuZDogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbilcblx0XHRcdHtcblx0XHRcdFx0c3VwZXIoKTtcblx0XHRcdFx0Ly9AdHMtaWdub3JlXG5cdFx0XHRcdHRoaXNbb3BdID0gb3B2O1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgU2xpY2UgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRcdHJlYWRvbmx5IHN0YXJ0OiBudW1iZXIsIFxuXHRcdFx0XHRyZWFkb25seSBlbmQ/OiBudW1iZXIpXG5cdFx0XHR7XG5cdFx0XHRcdHN1cGVyKCk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3Auc2xpY2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBPY2N1cmVuY2VzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0XHRyZWFkb25seSBtaW46IG51bWJlcixcblx0XHRcdFx0cmVhZG9ubHkgbWF4OiBudW1iZXIgPSBtaW4pXG5cdFx0XHR7XG5cdFx0XHRcdHN1cGVyKCk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3Aub2NjdXJlbmNlcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIEFsaWFzZWQgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5hbGlhc2VkO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgTGVhdmVzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AubGVhdmVzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgRnJlc2ggZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5mcmVzaDtcblx0XHR9XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFRlcm1pbmFscyBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLnRlcm1pbmFscztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFNvcnQgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0XG5cdFx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdFx0Li4uY29udGVudFR5cGVzOiBPYmplY3RbXSlcblx0XHRcdHtcblx0XHRcdFx0c3VwZXIoKTtcblx0XHRcdFx0dGhpcy5jb250ZW50VHlwZXMgPSBjb250ZW50VHlwZXM7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJlYWRvbmx5IGNvbnRlbnRUeXBlczogT2JqZWN0W107XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLnNvcnQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBSZXZlcnNlIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AucmV2ZXJzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFN1cnJvZ2F0ZSBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLnN1cnJvZ2F0ZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIENvbnRhaW5lcnMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5jb250YWluZXJzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgUm9vdHMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5yb290cztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIENvbnRlbnRzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AuY29udGVudHM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBOYW1lcyBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLm5hbWVzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgU3VtIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3Auc3VtO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgQXZnIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AuYXZnO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgTWluIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AubWluO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgTWF4IGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AubWF4O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgQ291bnQgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5jb3VudDtcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIEJhY2tlclxue1xuXHRleHBvcnQgdHlwZSBQcm90b3R5cGVKU09OID0gW251bWJlciwgbnVtYmVyLCAuLi5udW1iZXJbXVtdXTtcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBQcm90b3R5cGUgXG5cdHtcblx0XHQvKipcblx0XHQgKiBHZW5lcmF0ZSBhIFByb3RvdHlwZSBmcm9tIFRydXRoLlR5cGVcblx0XHQgKi9cblx0XHRzdGF0aWMgbmV3KGNvZGU6IENvZGUsIHR5cGU6IFRydXRoLlR5cGUpXG5cdFx0e1xuXHRcdFx0Y29uc3QgZmxhZ3MgPSBuZXcgQml0ZmllbGRzKCk7XG5cdFx0XHRcblx0XHRcdGZsYWdzLnNldCgwLCB0eXBlLmlzQW5vbnltb3VzKTtcblx0XHRcdGZsYWdzLnNldCgxLCB0eXBlLmlzRnJlc2gpO1xuXHRcdFx0ZmxhZ3Muc2V0KDIsIHR5cGUuaXNMaXN0KTtcblx0XHRcdGZsYWdzLnNldCgzLCB0eXBlLmlzTGlzdEludHJpbnNpYyk7XG5cdFx0XHRmbGFncy5zZXQoNCwgdHlwZS5pc0xpc3RFeHRyaW5zaWMpO1xuXHRcdFx0ZmxhZ3Muc2V0KDUsIHR5cGUuaXNQYXR0ZXJuKTtcblx0XHRcdGZsYWdzLnNldCg2LCB0eXBlLmlzVXJpKTtcblx0XHRcdGZsYWdzLnNldCg3LCB0eXBlLmlzU3BlY2lmaWVkKTtcblx0XHRcdFxuXHRcdFx0bGV0IHByb3RvID0gbmV3IFByb3RvdHlwZShcblx0XHRcdFx0Y29kZSwgXG5cdFx0XHRcdGZsYWdzLFxuXHRcdFx0XHRuZXcgVHlwZVNldCh0eXBlLmJhc2VzLm1hcChGdXR1cmVUeXBlLm5ldykpLFxuXHRcdFx0XHRuZXcgVHlwZVNldCh0eXBlLnBhdHRlcm5zLm1hcChGdXR1cmVUeXBlLm5ldykpLFxuXHRcdFx0XHRuZXcgVHlwZVNldCh0eXBlLnBhcmFsbGVscy5tYXAoRnV0dXJlVHlwZS5uZXcpKSxcblx0XHRcdFx0bmV3IFR5cGVTZXQodHlwZS5jb250ZW50c0ludHJpbnNpYy5tYXAoRnV0dXJlVHlwZS5uZXcpKVxuXHRcdFx0KTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgZXggPSBjb2RlLnByb3RvdHlwZXMuZmluZCh4ID0+IHguaGFzaCA9PT0gcHJvdG8uaGFzaCk7XG5cdFx0XHRcblx0XHRcdGlmIChleCkgXG5cdFx0XHRcdHByb3RvID0gZXg7XG5cdFx0XHRcdFxuXHRcdFx0cmV0dXJuIHByb3RvO1xuXHRcdH1cblx0XG5cdFx0LyoqXG5cdFx0ICogTG9hZCBQcm90b3R5cGUgZnJvbSBDb2RlSlNPTlxuXHRcdCAqL1xuXHRcdHN0YXRpYyBsb2FkKGNvZGU6IENvZGUsIHNlcmlhbGl6ZWQ6IFByb3RvdHlwZUpTT04pXG5cdFx0e1xuXHRcdFx0Y29uc3QgZGF0YSA9IFV0aWwuZGVjb2RlKHNlcmlhbGl6ZWQsIDUpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gbmV3IFByb3RvdHlwZShcblx0XHRcdFx0Y29kZSwgXG5cdFx0XHRcdG5ldyBCaXRmaWVsZHMoZGF0YVswXSksXG5cdFx0XHRcdFR5cGVTZXQuZnJvbUpTT04oZGF0YVsxXSksXG5cdFx0XHRcdFR5cGVTZXQuZnJvbUpTT04oZGF0YVsyXSksXG5cdFx0XHRcdFR5cGVTZXQuZnJvbUpTT04oZGF0YVszXSksXG5cdFx0XHRcdFR5cGVTZXQuZnJvbUpTT04oZGF0YVs0XSlcblx0XHRcdCk7XG5cdFx0fVxuXHRcdFxuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cHJpdmF0ZSBjb2RlOiBDb2RlLFxuXHRcdFx0cHVibGljIGZsYWdzOiBCaXRmaWVsZHMsXG5cdFx0XHRcblx0XHRcdHB1YmxpYyBiYXNlcyA9IG5ldyBUeXBlU2V0KCksXG5cdFx0XHRwdWJsaWMgcGF0dGVybnMgPSBuZXcgVHlwZVNldCgpLFxuXHRcdFx0cHVibGljIHBhcmFsbGVscyA9IG5ldyBUeXBlU2V0KCksXG5cdFx0XHRwdWJsaWMgY29udGVudHNJbnRyaW5zaWMgPSBuZXcgVHlwZVNldCgpKSB7fVxuXHRcdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IGlkKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5jb2RlLnByb3RvdHlwZXMuaW5kZXhPZih0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IGhhc2goKVxuXHRcdHtcblx0XHRcdHJldHVybiBVdGlsLmhhc2goSlNPTi5zdHJpbmdpZnkodGhpcykpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBUcmFuc2ZlciBvd25lcnNoaXAgb2YgdGhpcyBpbnN0YW5jZSB0byBhbm90aGVyIENvZGUgaW5zdGFuY2Vcblx0XHQgKi9cblx0XHR0cmFuc2Zlcihjb2RlOiBDb2RlKVxuXHRcdHtcblx0XHRcdHRoaXMuY29kZSA9IGNvZGU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHRvSlNPTigpXG5cdFx0e1x0XG5cdFx0XHRyZXR1cm4gVXRpbC5lbmNvZGUoW1xuXHRcdFx0XHR0aGlzLmZsYWdzLCB0aGlzLmJhc2VzLCB0aGlzLnBhdHRlcm5zLCB0aGlzLnBhcmFsbGVscywgdGhpcy5jb250ZW50c0ludHJpbnNpY1xuXHRcdFx0XSk7XG5cdFx0fVx0XHRcblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlci5UcnV0aFRhbGtcbntcblx0ZXhwb3J0IGxldCB0dDogUmVmbGV4LkNvcmUuQXNMaWJyYXJ5PEJhY2tlci5UcnV0aFRhbGsuTmFtZXNwYWNlLCBCYWNrZXIuVHJ1dGhUYWxrLkxpYnJhcnk+O1xuXHRcblx0ZXhwb3J0IGNsYXNzIExpYnJhcnkgaW1wbGVtZW50cyBSZWZsZXguQ29yZS5JTGlicmFyeVxuXHR7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aXNLbm93bkJyYW5jaChicmFuY2g6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRyZXR1cm4gYnJhbmNoIGluc3RhbmNlb2YgTm9kZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aXNCcmFuY2hEaXNwb3NlZChicmFuY2g6IFJlZmxleC5Db3JlLklCcmFuY2gpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGJyYW5jaCBpbnN0YW5jZW9mIEJyYW5jaCAmJiBicmFuY2hbY29udGFpbmVyXSAhPT0gbnVsbDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0Um9vdEJyYW5jaCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBCcmFuY2hlcy5RdWVyeSgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXRTdGF0aWNCcmFuY2hlcygpXG5cdFx0e1xuXHRcdFx0Y29uc3QgYnJhbmNoZXM6IGFueSA9IHt9O1xuXHRcdFx0XG5cdFx0XHRPYmplY3QuZW50cmllcyhCcmFuY2hlcykuZm9yRWFjaCgoW2JyYW5jaE5hbWUsIGJyYW5jaEN0b3JdKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBuYW1lID0gYnJhbmNoTmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRicmFuY2hlc1tuYW1lXSA9ICgpID0+IG5ldyBicmFuY2hDdG9yKCk7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGJyYW5jaGVzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXRTdGF0aWNOb25CcmFuY2hlcygpXG5cdFx0e1xuXHRcdFx0Y29uc3QgbGVhdmVzOiBhbnkgPSB7fTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoTGVhdmVzKSlcblx0XHRcdFx0bGVhdmVzW2tleS50b0xvd2VyQ2FzZSgpXSA9IChhcmcxOiBQcmVkaWNhdGVPcCwgYXJnMjogbnVtYmVyKSA9PiBuZXcgdmFsdWUoYXJnMSwgYXJnMik7XG5cdFx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBrZXkgaW4gUHJlZGljYXRlT3ApXG5cdFx0XHRcdGlmIChpc05hTihwYXJzZUludChrZXkpKSlcblx0XHRcdFx0XHRsZWF2ZXNba2V5XSA9ICh2YWx1ZTogYW55KSA9PiBuZXcgTGVhdmVzLlByZWRpY2F0ZSgoPGFueT5QcmVkaWNhdGVPcClba2V5XSwgdmFsdWUpO1xuXHRcdFx0XHRcblx0XHRcdHJldHVybiBsZWF2ZXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldENoaWxkcmVuKHRhcmdldDogQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0YXJnZXQuY2hpbGRyZW47XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNyZWF0ZUNvbnRhaW5lcigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBCcmFuY2hlcy5RdWVyeSgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhdHRhY2hBdG9tKFxuXHRcdFx0YXRvbWljOiBOb2RlLFxuXHRcdFx0b3duZXI6IEJyYW5jaCxcblx0XHRcdHJlZjogTm9kZSB8IFwicHJlcGVuZFwiIHwgXCJhcHBlbmRcIilcblx0XHR7XG5cdFx0XHRpZiAoIShhdG9taWMgaW5zdGFuY2VvZiBOb2RlKSlcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBwb3MgPVxuXHRcdFx0XHRyZWYgPT09IFwiYXBwZW5kXCIgPyAtMSA6XG5cdFx0XHRcdHJlZiA9PT0gXCJwcmVwZW5kXCIgPyAwIDpcblx0XHRcdFx0Ly8gUGxhY2VzIHRoZSBpdGVtIGF0IHRoZSBlbmQsIGluIHRoZSBjYXNlIHdoZW4gXG5cdFx0XHRcdC8vIHJlZiB3YXNuJ3QgZm91bmQgaW4gdGhlIG93bmVyLiApVGhpcyBzaG91bGRcblx0XHRcdFx0Ly8gbmV2ZXIgYWN0dWFsbHkgaGFwcGVuLilcblx0XHRcdFx0b3duZXIuY2hpbGRyZW4uaW5kZXhPZihyZWYpICsgMSB8fCAtMTtcblx0XHRcdFxuXHRcdFx0b3duZXIuYWRkQ2hpbGQoYXRvbWljLCBwb3MpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRkZXRhY2hBdG9tKGF0b21pYzogTm9kZSwgb3duZXI6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRvd25lci5yZW1vdmVDaGlsZChhdG9taWMpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRzd2FwQnJhbmNoZXMoYnJhbmNoMTogQnJhbmNoLCBicmFuY2gyOiBCcmFuY2gpXG5cdFx0e1xuXHRcdFx0aWYgKGJyYW5jaDFbVHJ1dGhUYWxrLmNvbnRhaW5lcl0gPT09IG51bGwgfHwgYnJhbmNoMltUcnV0aFRhbGsuY29udGFpbmVyXSA9PT0gbnVsbClcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHN3YXAgdG9wLWxldmVsIGJyYW5jaGVzLlwiKTtcblx0XHRcdFxuXHRcdFx0aWYgKGJyYW5jaDFbVHJ1dGhUYWxrLmNvbnRhaW5lcl0gIT09IGJyYW5jaDJbVHJ1dGhUYWxrLmNvbnRhaW5lcl0pXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IHN3YXAgYnJhbmNoZXMgZnJvbSB0aGUgc2FtZSBjb250YWluZXIuXCIpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBjb250YWluZXIgPSBicmFuY2gxW1RydXRoVGFsay5jb250YWluZXJdITtcblx0XHRcdGNvbnN0IGlkeDEgPSBjb250YWluZXIuY2hpbGRyZW4uaW5kZXhPZihicmFuY2gxKTtcblx0XHRcdGNvbnN0IGlkeDIgPSBjb250YWluZXIuY2hpbGRyZW4uaW5kZXhPZihicmFuY2gyKTtcblx0XHRcdGNvbnN0IGlkeE1heCA9IE1hdGgubWF4KGlkeDEsIGlkeDIpO1xuXHRcdFx0Y29uc3QgaWR4TWluID0gTWF0aC5taW4oaWR4MSwgaWR4Mik7XG5cdFx0XHRjb25zdCByZW1vdmVkTWF4ID0gY29udGFpbmVyLnJlbW92ZUNoaWxkKGlkeE1heCk7XG5cdFx0XHRjb25zdCByZW1vdmVkTWluID0gY29udGFpbmVyLnJlbW92ZUNoaWxkKGlkeE1pbik7XG5cdFx0XHRcblx0XHRcdGlmICghcmVtb3ZlZE1heCB8fCAhcmVtb3ZlZE1pbilcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSW50ZXJuYWwgRXJyb3IuXCIpO1xuXHRcdFx0XG5cdFx0XHRjb250YWluZXIuYWRkQ2hpbGQocmVtb3ZlZE1heCwgaWR4TWluKTtcblx0XHRcdGNvbnRhaW5lci5hZGRDaGlsZChyZW1vdmVkTWluLCBpZHhNYXgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRyZXBsYWNlQnJhbmNoKGJyYW5jaDE6IEJyYW5jaCwgYnJhbmNoMjogQnJhbmNoKVxuXHRcdHtcblx0XHRcdGlmIChicmFuY2gxW1RydXRoVGFsay5jb250YWluZXJdID09PSBudWxsKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgcmVwbGFjZSB0b3AtbGV2ZWwgYnJhbmNoZXMuXCIpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBjb250YWluZXIgPSBicmFuY2gxW1RydXRoVGFsay5jb250YWluZXJdITtcblx0XHRcdGNvbnN0IGlkeCA9IGNvbnRhaW5lci5jaGlsZHJlbi5pbmRleE9mKGJyYW5jaDEpO1xuXHRcdFx0Y29udGFpbmVyLnJlbW92ZUNoaWxkKGlkeCk7XG5cdFx0XHRjb250YWluZXIuYWRkQ2hpbGQoYnJhbmNoMiwgaWR4KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXR0YWNoQXR0cmlidXRlKGJyYW5jaDogQnJhbmNoLCBrZXk6IHN0cmluZywgdmFsdWU6IGFueSlcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3Qgc3VwcG9ydGVkLlwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZGV0YWNoQXR0cmlidXRlKGJyYW5jaDogQnJhbmNoLCBrZXk6IHN0cmluZylcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3Qgc3VwcG9ydGVkLlwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXR0YWNoUmVjdXJyZW50KFxuXHRcdFx0a2luZDogUmVmbGV4LkNvcmUuUmVjdXJyZW50S2luZCxcblx0XHRcdHRhcmdldDogUmVmbGV4LkNvcmUuSUJyYW5jaCxcblx0XHRcdHNlbGVjdG9yOiBhbnksXG5cdFx0XHRjYWxsYmFjazogUmVmbGV4LlJlY3VycmVudENhbGxiYWNrLFxuXHRcdFx0cmVzdDogYW55W10pXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IHN1cHBvcnRlZC5cIik7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGRldGFjaFJlY3VycmVudChcblx0XHRcdHRhcmdldDogUmVmbGV4LkNvcmUuSUJyYW5jaCxcblx0XHRcdHNlbGVjdG9yOiBhbnksXG5cdFx0XHRjYWxsYmFjazogUmVmbGV4LlJlY3VycmVudENhbGxiYWNrKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBzdXBwb3J0ZWQuXCIpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxufVxuXG4vKipcbiAqIEdsb2JhbCBsaWJyYXJ5IG9iamVjdC5cbiAqL1xuY29uc3QgdHQgPSBSZWZsZXguQ29yZS5jcmVhdGVCcmFuY2hOYW1lc3BhY2U8QmFja2VyLlRydXRoVGFsay5OYW1lc3BhY2UsIEJhY2tlci5UcnV0aFRhbGsuTGlicmFyeT4oXG5cdG5ldyBCYWNrZXIuVHJ1dGhUYWxrLkxpYnJhcnkoKSxcblx0dHJ1ZSk7XG5cbkJhY2tlci5UcnV0aFRhbGsudHQgPSB0dDsiLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiTm9kZXMudHNcIi8+XG5cbm5hbWVzcGFjZSBCYWNrZXJcbntcblx0ZXhwb3J0IGNvbnN0IHR5cGVPZiA9IFN5bWJvbChcInR5cGVPZlwiKTtcblx0ZXhwb3J0IGNvbnN0IHZhbHVlID0gU3ltYm9sKFwidmFsdWVcIik7XG5cdGV4cG9ydCBjb25zdCBuYW1lID0gU3ltYm9sKFwibmFtZVwiKTtcblx0ZXhwb3J0IGNvbnN0IHZhbHVlcyA9IFN5bWJvbChcInZhbHVlc1wiKTtcblx0ZXhwb3J0IGNvbnN0IHBhcmVudCA9IFN5bWJvbChcInBhcmVudFwiKTtcblx0XG5cdGFic3RyYWN0IGNsYXNzIEJhc2UgZXh0ZW5kcyBUcnV0aFRhbGsuTGVhdmVzLlN1cnJvZ2F0ZVxuXHR7XG5cdFx0YWJzdHJhY3QgW3ZhbHVlXTogYW55O1xuXHRcdFxuXHRcdFtwYXJlbnRdOiBTdHJ1Y3QgfMKgbnVsbDtcblx0XHRcblx0XHRjb25zdHJ1Y3RvcihwYXJlbnRWYWx1ZTogU3RydWN0IHwgU3Vycm9nYXRlIHwgbnVsbClcblx0XHR7XG5cdFx0XHRzdXBlcigpO1xuXHRcdFx0dGhpc1twYXJlbnRdID0gcGFyZW50VmFsdWU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENsaW1iIHRvIHJvb3Qgb2YgdGhpcyBTdHJ1Y3Rcblx0XHQgKi9cblx0XHRnZXQgcm9vdCgpOiBCYXNlIHzCoG51bGxcblx0XHR7XG5cdFx0XHRsZXQgcm9vdDogQmFzZSB8wqBudWxsID0gdGhpcztcblx0XHRcdFxuXHRcdFx0d2hpbGUgKHJvb3QgJiYgcm9vdFtwYXJlbnRdKSBcblx0XHRcdFx0cm9vdCA9IHJvb3RbcGFyZW50XTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHJvb3Q7XG5cdFx0fVxuXHRcdFxuXHRcdHRvSlNPTigpeyByZXR1cm4gdGhpc1t2YWx1ZV07IH1cblx0XHR2YWx1ZU9mKCkgeyByZXR1cm4gdGhpc1t2YWx1ZV07IH1cblx0XHR0b1N0cmluZygpIFxuXHRcdHtcblx0XHRcdGNvbnN0IHZhbCA9IHRoaXNbdmFsdWVdO1xuXHRcdFx0aWYgKHZhbCA9PT0gbnVsbClcblx0XHRcdFx0cmV0dXJuIHZhbDtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIFN0cmluZyh2YWwpO1xuXHRcdH1cblx0XHRbU3ltYm9sLnRvUHJpbWl0aXZlXSgpIHsgcmV0dXJuIHRoaXNbdmFsdWVdOyB9XG5cdFx0Z2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkgeyByZXR1cm4gXCJQcm94eVwiOyB9XG5cdH1cblx0XG5cdGV4cG9ydCBjbGFzcyBTdW1tYXJ5IGV4dGVuZHMgVHJ1dGhUYWxrLkxlYXZlcy5TdXJyb2dhdGVcblx0e1xuXHRcdFtwYXJlbnRdOiBTdHJ1Y3RbXTtcblx0XHRcblx0XHRjb25zdHJ1Y3RvcihwdWJsaWMgdmFsdWU6IGFueSwgY29udGFpbmVyczogU3RydWN0W10pXG5cdFx0e1xuXHRcdFx0c3VwZXIoKTtcblx0XHRcdHRoaXNbcGFyZW50XSA9IGNvbnRhaW5lcnM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBbdmFsdWVdKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy52YWx1ZTtcblx0XHR9XG5cdH1cblx0XG5cdGV4cG9ydCBjbGFzcyBOYW1lIGV4dGVuZHMgQmFzZVxuXHR7XG5cdFx0Y29uc3RydWN0b3IocHVibGljIG5hbWU6IHN0cmluZywgY29udGFpbmVyOiBTdHJ1Y3QgfMKgbnVsbClcblx0XHR7XG5cdFx0XHRzdXBlcihjb250YWluZXIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgW3ZhbHVlXSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMubmFtZTtcblx0XHR9XG5cdH1cblx0XG5cdGV4cG9ydCBjbGFzcyBTdHJ1Y3QgZXh0ZW5kcyBCYXNlXG5cdHtcblx0XHRcblx0XHQvKipcblx0XHQgKiBHZW5lcmF0ZSBhIFN0cnVjdC9TdXJyb2dhdGUgZnJvbSBCYWNrZXIuVHlwZVxuXHRcdCAqL1xuXHRcdHN0YXRpYyBuZXcodHlwZTogVHlwZSwgcGFyZW50VmFsdWU6IFN0cnVjdCB8wqBTdXJyb2dhdGUgfCBudWxsKVxuXHRcdHtcblx0XHRcdGNvbnN0IGNvbnN0ciA9IHBhcmVudFZhbHVlID8gXG5cdFx0XHRcdHBhcmVudFZhbHVlIGluc3RhbmNlb2YgU3Vycm9nYXRlID9cblx0XHRcdFx0U3Vycm9nYXRlIDogU3RydWN0IDogU3RydWN0O1xuXHRcdFx0XHRcblx0XHRcdHJldHVybiBuZXcgY29uc3RyKHR5cGUsIHBhcmVudFZhbHVlKTtcblx0XHR9XG5cdFx0XG5cdFx0cmVhZG9ubHkgW3R5cGVPZl06IFR5cGU7XG5cdFx0cmVhZG9ubHkgW25hbWVdOiBOYW1lO1xuXHRcdHJlYWRvbmx5IFtwYXJlbnRdOiBTdHJ1Y3QgfCBudWxsO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBbdmFsdWVzXSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXNbdHlwZU9mXS52YWx1ZXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBbdmFsdWVdKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpc1t0eXBlT2ZdLnZhbHVlO1xuXHRcdH1cblx0XHRcblx0XHRjb25zdHJ1Y3Rvcih0eXBlOiBUeXBlLCBwYXJlbnRWYWx1ZTogU3RydWN0IHwgbnVsbClcblx0XHR7XG5cdFx0XHRzdXBlcihwYXJlbnRWYWx1ZSk7XG5cdFx0XHR0aGlzW3R5cGVPZl0gPSB0eXBlO1xuXHRcdFx0dGhpc1twYXJlbnRdID0gcGFyZW50VmFsdWU7XG5cdFx0XHR0aGlzW25hbWVdID0gbmV3IE5hbWUodHlwZS5uYW1lLCB0aGlzKTtcblx0XHRcdFxuXHRcdFx0VXRpbC5zaGFkb3dzKHRoaXMsIGZhbHNlLCB0eXBlT2YsIHZhbHVlcywgVHJ1dGhUYWxrLm9wLCBwYXJlbnQsIFRydXRoVGFsay5jb250YWluZXIpO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGNoaWxkIG9mIHR5cGUuY29udGVudHMpXG5cdFx0XHRcdCg8YW55PnRoaXMpW2NoaWxkLm5hbWUucmVwbGFjZSgvW15cXGRcXHddL2dtLCAoKSA9PiBcIl9cIildID0gU3RydWN0Lm5ldyhjaGlsZCwgdGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFR5cGVzY3JpcHQgdHlwZSBhZGp1c3RtZW50IFxuXHRcdCAqL1xuXHRcdGdldCBwcm94eSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMgYXMgdW5rbm93biBhcyBTdHJ1Y3QgJiBSZWNvcmQ8c3RyaW5nLCBTdHJ1Y3Q+O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgY29udGVudHMoKTogU3RydWN0W11cblx0XHR7XG5cdFx0XHRyZXR1cm4gT2JqZWN0LnZhbHVlcyh0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aW5zdGFuY2VvZihiYXNlOiBhbnkpXG5cdFx0e1xuXHRcdFx0cmV0dXJuwqB0aGlzW3R5cGVPZl0uaXMoYmFzZSk7IFxuXHRcdH07XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aXMoYmFzZTogVHlwZSB8IFN0cnVjdClcblx0XHR7XG5cdFx0XHRiYXNlID0gYmFzZSBpbnN0YW5jZW9mIFR5cGUgPyBiYXNlIDogYmFzZVt0eXBlT2ZdO1xuXHRcdFx0cmV0dXJuIHRoaXNbdHlwZU9mXS5pcyhiYXNlKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0W1N5bWJvbC5oYXNJbnN0YW5jZV0odmFsdWU6IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5pbnN0YW5jZW9mKHZhbHVlKTtcblx0XHR9XG5cdH1cblx0XG5cdGV4cG9ydCBjbGFzcyBTdXJyb2dhdGU8VCA9IHN0cmluZz4gZXh0ZW5kcyBTdHJ1Y3Rcblx0e1xuXHRcdHJlYWRvbmx5IFtuYW1lXTogTmFtZTtcblx0XHRyZWFkb25seSBbcGFyZW50XTogU3Vycm9nYXRlIHwgbnVsbDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgY29udGVudHMoKTogU3Vycm9nYXRlW11cblx0XHR7XG5cdFx0XHRyZXR1cm4gT2JqZWN0LnZhbHVlcyh0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aW5zdGFuY2VvZihiYXNlOiBhbnkpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXNbdmFsdWVdIGluc3RhbmNlb2YgYmFzZSB8fMKgdGhpc1t0eXBlT2ZdLmlzKGJhc2UpOyBcblx0XHR9O1xuXHRcdFxuXHRcdC8qKiBcblx0XHQgKiBHZXQgbmVzdGVkIHByb3BlcnR5IHdpdGggbWF0Y2hpbmcgU3RydWN0XG5cdFx0Ki9cblx0XHRnZXQodHlwZTogU3RydWN0KTogU3Vycm9nYXRlIHzCoG51bGxcblx0XHR7XHRcdFxuXHRcdFx0Y29uc3QgcmVjdXJzaXZlID0gKG9iajogU3Vycm9nYXRlKTogU3Vycm9nYXRlIHwgbnVsbCA9PiBcblx0XHRcdHtcblx0XHRcdFx0aWYgKG9ialt0eXBlT2ZdLnBhcmFsbGVsUm9vdHMuc29tZSh4ID0+IHggPT09IHR5cGVbdHlwZU9mXSkpXG5cdFx0XHRcdFx0cmV0dXJuIG9iajtcblx0XHRcdFx0XG5cdFx0XHRcdGZvciAoY29uc3QgY2hpbGQgb2Ygb2JqLmNvbnRlbnRzKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgcmVzID0gcmVjdXJzaXZlKGNoaWxkKTtcdFxuXHRcdFx0XHRcdGlmIChyZXMpXG5cdFx0XHRcdFx0XHRyZXR1cm4gcmVzO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdHJldHVybiByZWN1cnNpdmUoPGFueT50aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0dG9KU09OKCk6IGFueSBcblx0XHR7IFxuXHRcdFx0Y29uc3QgdmFsID0gdGhpc1t2YWx1ZV07XG5cdFx0XHRjb25zdCBwcmltaXRpdmUgPSB2YWwgPyB0aGlzW3R5cGVPZl0udmFsdWVzLnRvU3RyaW5nKCkgOiB1bmRlZmluZWQ7XG5cdFx0XHRcblx0XHRcdGlmICh0aGlzLmNvbnRlbnRzLmxlbmd0aCA9PT0gMClcblx0XHRcdFx0cmV0dXJuIHByaW1pdGl2ZTtcblx0XG5cdFx0XHRjb25zdCBPYmo6IFJlY29yZDxzdHJpbmcsIFN1cnJvZ2F0ZSB8IFQ+ICYgeyAkOiBhbnkgfSA9IDxhbnk+T2JqZWN0LmFzc2lnbih7fSwgdGhpcyk7XG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0cmV0dXJuIE9iajsgXG5cdFx0fVxuXHRcdFxuXHRcdHRvU3RyaW5nKGluZGVudCA9IDApXG5cdFx0e1xuXHRcdFx0bGV0IGJhc2UgPSB0aGlzW3R5cGVPZl0ubmFtZTtcblx0XHRcdGNvbnN0IHByaW1pdGl2ZSA9IHRoaXNbdmFsdWVdID8gdGhpc1t0eXBlT2ZdLnZhbHVlcy50b1N0cmluZygpIDogdW5kZWZpbmVkO1xuXHRcdFx0XG5cdFx0XHRpZiAocHJpbWl0aXZlKSBcblx0XHRcdFx0YmFzZSArPSBgOiAke3ByaW1pdGl2ZX1gO1xuXHRcdFx0XHRcblx0XHRcdGlmICh0aGlzLmNvbnRlbnRzLmxlbmd0aCA+IDApXG5cdFx0XHRcdGJhc2UgKz0gdGhpcy5jb250ZW50cy5tYXAoeCA9PiBcIlxcblwiICsgeC50b1N0cmluZyhpbmRlbnQgKyAxKSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBcIlxcdFwiLnJlcGVhdChpbmRlbnQpICsgYmFzZTtcblx0XHR9XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXJcbntcblx0ZXhwb3J0IHR5cGUgVmFsdWVKU09OID0gW251bWJlciwgbnVtYmVyLCBzdHJpbmddO1xuXHRleHBvcnQgdHlwZSBEYXRhSlNPTiA9IFtudW1iZXJbXSwgc3RyaW5nLCAuLi5WYWx1ZUpTT05bXVtdXTtcblx0ZXhwb3J0IHR5cGUgVHlwZUpTT04gPSBbbnVtYmVyLCBudW1iZXIgfCBudWxsLCBzdHJpbmcsIFZhbHVlSlNPTltdXTtcblx0XG5cdGV4cG9ydCBjbGFzcyBWYWx1ZVxuXHR7XG5cdFx0c3RhdGljIGxvYWQoZGF0YTogVmFsdWVKU09OKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgVmFsdWUoRnV0dXJlVHlwZS5uZXcoZGF0YVswXSksICEhZGF0YVsxXSwgZGF0YVsyXSk7XG5cdFx0fVxuXHRcdFxuXHRcdHB1YmxpYyB2YWx1ZTogYW55O1xuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKHB1YmxpYyBiYXNlOiBGdXR1cmVUeXBlIHwgbnVsbCwgcHVibGljIGFsaWFzZWQ6IGJvb2xlYW4sIHZhbHVlOiBzdHJpbmcpIFxuXHRcdHtcblx0XHRcdHRoaXMudmFsdWUgPSB2YWx1ZTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IHByaW1pdGl2ZSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudmFsdWUgfHwgdGhpcy5iYXNlTmFtZTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGJhc2VOYW1lKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5iYXNlID8gdGhpcy5iYXNlLnR5cGUgPyB0aGlzLmJhc2UudHlwZS5uYW1lIDogXCJcIiA6IFwiXCI7XHRcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gW3RoaXMuYmFzZSAmJiB0aGlzLmJhc2UuaWQsIHRoaXMuYWxpYXNlZCA/IDEgOiAwLCB0aGlzLnZhbHVlXTsgIFxuXHRcdH1cblx0XHRcblx0XHR0b1N0cmluZygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJpbWl0aXZlO1xuXHRcdH1cblx0fVxuXHRcblx0ZXhwb3J0IGNsYXNzIFZhbHVlU3RvcmVcblx0e1x0XG5cdFx0c3RhdGljIGxvYWQoLi4uZGF0YTogVmFsdWVKU09OW10pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBWYWx1ZVN0b3JlKC4uLmRhdGEubWFwKHggPT4gVmFsdWUubG9hZCh4KSkpO1xuXHRcdH1cblx0XHRcblx0XHRwdWJsaWMgdmFsdWVTdG9yZTogVmFsdWVbXTtcblx0XHRcblx0XHRjb25zdHJ1Y3RvciguLi52YWx1ZXM6IFZhbHVlW10pXG5cdFx0e1xuXHRcdFx0dGhpcy52YWx1ZVN0b3JlID0gdmFsdWVzLm1hcCh4ID0+IFxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoeC5hbGlhc2VkKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dHJ5IFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHgudmFsdWUgPSBKU09OLnBhcnNlKHgudmFsdWUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjYXRjaCAoZXgpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0aWYgKC9eXFxkKyQvLnRlc3QoeC52YWx1ZSkpXG5cdFx0XHRcdFx0XHRcdHgudmFsdWUgPSBCaWdJbnQoeC52YWx1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB4O1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdGdldCB2YWx1ZXMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnZhbHVlU3RvcmUuZmlsdGVyKHggPT4gIXguYWxpYXNlZCk7XG5cdFx0fVxuXHRcdFxuXHRcdGdldCBhbGlhc2VzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy52YWx1ZVN0b3JlLmZpbHRlcih4ID0+IHguYWxpYXNlZCk7XG5cdFx0fVxuXHRcdFxuXHRcdGNvbmNhdChzdG9yZTogVmFsdWVTdG9yZSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFZhbHVlU3RvcmUoLi4udGhpcy52YWx1ZVN0b3JlLmNvbmNhdChzdG9yZS52YWx1ZVN0b3JlKSk7XG5cdFx0fVxuXHRcdFxuXHRcdGdldCBhbGlhcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuYWxpYXNlc1swXTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IHZhbHVlKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy52YWx1ZXNbMF07XG5cdFx0fVxuXHRcdFxuXHRcdGdldCBwcmltaXRpdmUoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmFsaWFzID8gdGhpcy5hbGlhcy52YWx1ZSA6IHRoaXMudmFsdWUudG9TdHJpbmcoKTtcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy52YWx1ZVN0b3JlO1xuXHRcdH1cblx0XG5cdFx0dG9TdHJpbmcoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmFsaWFzID8gdGhpcy5hbGlhcy50b1N0cmluZygpICsgKHRoaXMudmFsdWUgPyBcIltcIiArIHRoaXMudmFsdWUudG9TdHJpbmcoKSArIFwiXVwiIDogXCJcIikgOiB0aGlzLnZhbHVlLnRvU3RyaW5nKCk7XG5cdFx0fVxuXHRcdFxuXHR9XG5cdFxuXHRleHBvcnQgY2xhc3MgVHlwZSBcblx0e1xuXHRcdC8qKlxuXHRcdCAqIExvYWQgYSBCYWNrZXIuVHlwZSBmcm9tIENvZGVKU09OXG5cdFx0ICovXG5cdFx0c3RhdGljIGxvYWQoY29kZTogQ29kZSwgZGF0YTogVHlwZUpTT04pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBUeXBlKFxuXHRcdFx0XHRjb2RlLCBcblx0XHRcdFx0ZGF0YVsyXSxcblx0XHRcdFx0Y29kZS5wcm90b3R5cGVzW2RhdGFbMF1dLFxuXHRcdFx0XHRkYXRhWzFdID8gRnV0dXJlVHlwZS5uZXcoZGF0YVsxXSkgOiBudWxsLFxuXHRcdFx0XHRWYWx1ZVN0b3JlLmxvYWQoLi4uZGF0YVszXSlcblx0XHRcdCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdlbmVyYXRlIGEgQmFja2VyLlR5cGUgZnJvbSBUcnV0aC5UeXBlXG5cdFx0ICovXG5cdFx0c3RhdGljIG5ldyhjb2RlOiBDb2RlLCB0eXBlOiBUcnV0aC5UeXBlKVxuXHRcdHtcdFxuXHRcdFx0Y29uc3QgbmFtZSA9IHR5cGUuaXNQYXR0ZXJuID8gdHlwZS5uYW1lLnN1YnN0cig5KSA6IHR5cGUubmFtZTtcblx0XHRcdGNvbnN0IGluc3RhbmNlID0gbmV3IFR5cGUoXG5cdFx0XHRcdGNvZGUsIFxuXHRcdFx0XHRuYW1lLCBcblx0XHRcdFx0UHJvdG90eXBlLm5ldyhjb2RlLCB0eXBlKSxcblx0XHRcdFx0dHlwZS5jb250YWluZXIgPyBGdXR1cmVUeXBlLm5ldyh0eXBlLmNvbnRhaW5lcikgOiBudWxsLFxuXHRcdFx0XHRuZXcgVmFsdWVTdG9yZSguLi50eXBlLnZhbHVlc1xuXHRcdFx0XHRcdC5maWx0ZXIoeCA9PiBuYW1lICE9PSB4LnZhbHVlKVxuXHRcdFx0XHRcdC5tYXAoeCA9PiBuZXcgVmFsdWUoeC5iYXNlID8gRnV0dXJlVHlwZS5uZXcoeC5iYXNlKSA6IG51bGwsIHguYWxpYXNlZCwgeC52YWx1ZSkpKVxuXHRcdFx0KTtcblx0XHRcdFxuXHRcdFx0RnV0dXJlVHlwZS5UeXBlTWFwLnNldCh0eXBlLCBpbnN0YW5jZSk7XG5cdFx0XHRyZXR1cm4gaW5zdGFuY2U7XG5cdFx0fVxuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cHJpdmF0ZSBjb2RlOiBDb2RlLFxuXHRcdFx0cHVibGljIG5hbWU6IHN0cmluZyxcblx0XHRcdHB1YmxpYyBwcm90b3R5cGU6IFByb3RvdHlwZSxcblx0XHRcdHByaXZhdGUgX2NvbnRhaW5lcjogRnV0dXJlVHlwZSB8IG51bGwgPSBudWxsLFxuXHRcdFx0cHVibGljIHZhbHVlczogVmFsdWVTdG9yZSkgXG5cdFx0eyB9XG5cdFx0XHRcblx0XHRnZXQgY29udGFpbmVyKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY29udGFpbmVyICYmIHRoaXMuX2NvbnRhaW5lci50eXBlO1xuXHRcdH1cblx0XHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyB0aGUgYXJyYXkgb2YgdHlwZXMgdGhhdCBhcmUgY29udGFpbmVkIGRpcmVjdGx5IGJ5IHRoaXNcblx0XHQgKiBvbmUuIEluIHRoZSBjYXNlIHdoZW4gdGhpcyB0eXBlIGlzIGEgbGlzdCB0eXBlLCB0aGlzIGFycmF5IGRvZXNcblx0XHQgKiBub3QgaW5jbHVkZSB0aGUgbGlzdCdzIGludHJpbnNpYyB0eXBlcy5cblx0XHQgKi9cblx0XHRnZXQgY29udGVudHMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmNvZGUudHlwZXMuZmlsdGVyKHggPT4geC5jb250YWluZXIgPT09IHRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBAaW50ZXJhbFxuXHRcdCAqL1xuXHRcdGdldCBwYXJhbGxlbENvbnRlbnRzKClcblx0XHR7XG5cdFx0XHRjb25zdCB0eXBlczogVHlwZVtdID0gW107XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgeyB0eXBlOiBwYXJhbGxlbFR5cGUgfSBvZiB0aGlzLml0ZXJhdGUodCA9PiB0LnBhcmFsbGVscywgdHJ1ZSkpXG5cdFx0XHRcdGZvciAoY29uc3QgeyB0eXBlOiBiYXNlVHlwZSB9IG9mIHBhcmFsbGVsVHlwZS5pdGVyYXRlKHQgPT4gdC5iYXNlcywgdHJ1ZSkpXG5cdFx0XHRcdFx0Zm9yKGNvbnN0IGNvbnRlbnQgb2YgYmFzZVR5cGUuY29udGVudHMpXG5cdFx0XHRcdFx0aWYgKCF0eXBlcy5zb21lKHggPT4geC5uYW1lID09PSBjb250ZW50Lm5hbWUpKVxuXHRcdFx0XHRcdFx0dHlwZXMucHVzaChjb250ZW50KTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0cmV0dXJuIHR5cGVzO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgYSByZWZlcmVuY2UgdG8gdGhlIHR5cGUsIGFzIGl0J3MgZGVmaW5lZCBpbiBpdCdzXG5cdFx0ICogbmV4dCBtb3N0IGFwcGxpY2FibGUgdHlwZS5cblx0XHQgKi9cblx0XHRnZXQgcGFyYWxsZWxzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUucGFyYWxsZWxzLnNuYXBzaG90KClcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIHRoZSBhcnJheSBvZiB0eXBlcyBmcm9tIHdoaWNoIHRoaXMgdHlwZSBleHRlbmRzLlxuXHRcdCAqIElmIHRoaXMgVHlwZSBleHRlbmRzIGZyb20gYSBwYXR0ZXJuLCBpdCBpcyBpbmNsdWRlZCBpbiB0aGlzXG5cdFx0ICogYXJyYXkuXG5cdFx0ICovXG5cdFx0Z2V0IGJhc2VzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuYmFzZXMuc25hcHNob3QoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogR2V0cyBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSBwYXR0ZXJucyB0aGF0IHJlc29sdmUgdG8gdGhpcyB0eXBlLlxuXHRcdCAqL1xuXHRcdGdldCBwYXR0ZXJucygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLnBhdHRlcm5zLnNuYXBzaG90KCk7XHRcblx0XHR9XG5cdFx0XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogR2V0cyBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSB0aGF0IHNoYXJlIHRoZSBzYW1lIGNvbnRhaW5pbmdcblx0XHQgKiB0eXBlIGFzIHRoaXMgb25lLlxuXHRcdCAqL1xuXHRcdGdldCBhZGphY2VudHMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmNvZGUudHlwZXMuZmlsdGVyKHggPT4geC5jb250YWluZXIgIT09IHRoaXMuY29udGFpbmVyICYmIHggIT09IHRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHR5cGVzIHRoYXQgZGVyaXZlIGZyb20gdGhlIFxuXHRcdCAqIHRoaXMgVHlwZSBpbnN0YW5jZS5cblx0XHQgKiBcblx0XHQgKiBUaGUgdHlwZXMgdGhhdCBkZXJpdmUgZnJvbSB0aGlzIG9uZSBhcyBhIHJlc3VsdCBvZiB0aGUgdXNlIG9mXG5cdFx0ICogYW4gYWxpYXMgYXJlIGV4Y2x1ZGVkIGZyb20gdGhpcyBhcnJheS5cblx0XHQgKi9cblx0XHRnZXQgZGVyaXZhdGlvbnMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmNvZGUudHlwZXMuZmlsdGVyKHggPT4geC5iYXNlcy5pbmNsdWRlcyh0aGlzKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyBhIHJlZmVyZW5jZSB0byB0aGUgcGFyYWxsZWwgcm9vdHMgb2YgdGhpcyB0eXBlLlxuXHRcdCAqIFRoZSBwYXJhbGxlbCByb290cyBhcmUgdGhlIGVuZHBvaW50cyBmb3VuZCB3aGVuXG5cdFx0ICogdHJhdmVyc2luZyB1cHdhcmQgdGhyb3VnaCB0aGUgcGFyYWxsZWwgZ3JhcGguXG5cdFx0ICovXG5cdFx0Z2V0IHBhcmFsbGVsUm9vdHMoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHJvb3RzOiBUeXBlW10gPSBbXTtcblx0XHRcdGZvciAoY29uc3QgeyB0eXBlIH0gb2YgdGhpcy5pdGVyYXRlKHQgPT4gdC5wYXJhbGxlbHMpKVxuXHRcdFx0XHRpZiAodHlwZSAhPT0gdGhpcyAmJiB0eXBlLnBhcmFsbGVscy5sZW5ndGggPT09IDApXG5cdFx0XHRcdFx0cm9vdHMucHVzaCh0eXBlKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHJvb3RzO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgdmFsdWUoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnZhbHVlcy5wcmltaXRpdmU7XG5cdFx0fVxuXHRcdFxuXHRcdGdldCBpZCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuY29kZS50eXBlcy5pbmRleE9mKHRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaXNBbm9ueW1vdXMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5mbGFncy5nZXQoMCk7XG5cdFx0fVxuXHRcdFxuXHRcdGdldCBpc0ZyZXNoKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDEpO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaXNMaXN0KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDIpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgd2hldGhlciB0aGlzIHR5cGUgcmVwcmVzZW50cyB0aGUgaW50cmluc2ljXG5cdFx0ICogc2lkZSBvZiBhIGxpc3QuXG5cdFx0ICovXG5cdFx0Z2V0IGlzTGlzdEludHJpbnNpYygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmZsYWdzLmdldCgzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIHdoZXRoZXIgdGhpcyB0eXBlIHJlcHJlc2VudHMgdGhlIGV4dHJpbnNpY1xuXHRcdCAqIHNpZGUgb2YgYSBsaXN0LlxuXHRcdCAqL1xuXHRcdGdldCBpc0xpc3RFeHRyaW5zaWMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5mbGFncy5nZXQoNCk7XG5cdFx0fVxuXHRcdFxuXHRcdFxuXHRcdGdldCBpc1BhdHRlcm4oKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5mbGFncy5nZXQoNSk7XG5cdFx0fVxuXHRcdFxuXHRcdGdldCBpc1VyaSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmZsYWdzLmdldCg2KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIGEgdmFsdWUgdGhhdCBpbmRpY2F0ZXMgaWYgdGhpcyBUeXBlIHdhcyBkaXJlY3RseSBzcGVjaWZpZWRcblx0XHQgKiBpbiB0aGUgZG9jdW1lbnQsIG9yIGlmIGl0J3MgZXhpc3RlbmNlIHdhcyBpbmZlcnJlZC5cblx0XHQgKi9cblx0XHRnZXQgaXNTcGVjaWZpZWQoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5mbGFncy5nZXQoNyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBpc092ZXJyaWRlKCkgeyByZXR1cm4gdGhpcy5wYXJhbGxlbHMubGVuZ3RoID4gMDsgfVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBpc0ludHJvZHVjdGlvbigpIHsgcmV0dXJuIHRoaXMucGFyYWxsZWxzLmxlbmd0aCA9PT0gMDsgfVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdldHMgYSBib29sZWFuIHZhbHVlIHRoYXQgaW5kaWNhdGVzIHdoZXRoZXIgdGhpcyBUeXBlXG5cdFx0ICogaW5zdGFuY2Ugd2FzIGNyZWF0ZWQgZnJvbSBhIHByZXZpb3VzIGVkaXQgZnJhbWUsIGFuZFxuXHRcdCAqIHNob3VsZCBubyBsb25nZXIgYmUgdXNlZC5cblx0XHQgKi9cblx0XHRnZXQgaXNEaXJ0eSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBQZXJmb3JtcyBhbiBhcmJpdHJhcnkgcmVjdXJzaXZlLCBicmVhZHRoLWZpcnN0IHRyYXZlcnNhbFxuXHRcdCAqIHRoYXQgYmVnaW5zIGF0IHRoaXMgVHlwZSBpbnN0YW5jZS4gRW5zdXJlcyB0aGF0IG5vIHR5cGVzXG5cdFx0ICogdHlwZXMgYXJlIHlpZWxkZWQgbXVsdGlwbGUgdGltZXMuXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIG5leHRGbiBBIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHR5cGUsIG9yIGFuXG5cdFx0ICogaXRlcmFibGUgb2YgdHlwZXMgdGhhdCBhcmUgdG8gYmUgdmlzaXRlZCBuZXh0LlxuXHRcdCAqIEBwYXJhbSByZXZlcnNlIEFuIG9wdGlvbmFsIGJvb2xlYW4gdmFsdWUgdGhhdCBpbmRpY2F0ZXNcblx0XHQgKiB3aGV0aGVyIHR5cGVzIGluIHRoZSByZXR1cm5lZCBhcnJheSBzaG91bGQgYmUgc29ydGVkXG5cdFx0ICogd2l0aCB0aGUgbW9zdCBkZWVwbHkgdmlzaXRlZCBub2RlcyBvY2N1cmluZyBmaXJzdC5cblx0XHQgKiBcblx0XHQgKiBAcmV0dXJucyBBbiBhcnJheSB0aGF0IHN0b3JlcyB0aGUgbGlzdCBvZiB0eXBlcyB0aGF0IHdlcmVcblx0XHQgKiB2aXNpdGVkLlxuXHRcdCAqL1xuXHRcdHZpc2l0KG5leHRGbjogKHR5cGU6IFR5cGUpID0+IEl0ZXJhYmxlPFR5cGUgfCBudWxsPiB8IFR5cGUgfCBudWxsLCByZXZlcnNlPzogYm9vbGVhbilcblx0XHR7XG5cdFx0XHRyZXR1cm4gQXJyYXkuZnJvbSh0aGlzLml0ZXJhdGUobmV4dEZuLCByZXZlcnNlKSkubWFwKGVudHJ5ID0+IGVudHJ5LnR5cGUpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBQZXJmb3JtcyBhbiBhcmJpdHJhcnkgcmVjdXJzaXZlLCBicmVhZHRoLWZpcnN0IGl0ZXJhdGlvblxuXHRcdCAqIHRoYXQgYmVnaW5zIGF0IHRoaXMgVHlwZSBpbnN0YW5jZS4gRW5zdXJlcyB0aGF0IG5vIHR5cGVzXG5cdFx0ICogdHlwZXMgYXJlIHlpZWxkZWQgbXVsdGlwbGUgdGltZXMuXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIG5leHRGbiBBIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHR5cGUsIG9yIGFuIGl0ZXJhYmxlXG5cdFx0ICogb2YgdHlwZXMgdGhhdCBhcmUgdG8gYmUgdmlzaXRlZCBuZXh0LlxuXHRcdCAqIEBwYXJhbSByZXZlcnNlIEFuIG9wdGlvbmFsIGJvb2xlYW4gdmFsdWUgdGhhdCBpbmRpY2F0ZXNcblx0XHQgKiB3aGV0aGVyIHRoZSBpdGVyYXRvciBzaG91bGQgeWllbGQgdHlwZXMgc3RhcnRpbmcgd2l0aCB0aGVcblx0XHQgKiBtb3N0IGRlZXBseSBuZXN0ZWQgdHlwZXMgZmlyc3QuXG5cdFx0ICogXG5cdFx0ICogQHlpZWxkcyBBbiBvYmplY3QgdGhhdCBjb250YWlucyBhIGB0eXBlYCBwcm9wZXJ0eSB0aGF0IGlzIHRoZVxuXHRcdCAqIHRoZSBUeXBlIGJlaW5nIHZpc2l0ZWQsIGFuZCBhIGB2aWFgIHByb3BlcnR5IHRoYXQgaXMgdGhlIFR5cGVcblx0XHQgKiB0aGF0IHdhcyByZXR1cm5lZCBpbiB0aGUgcHJldmlvdXMgY2FsbCB0byBgbmV4dEZuYC5cblx0XHQgKi9cblx0XHQqaXRlcmF0ZShuZXh0Rm46ICh0eXBlOiBUeXBlKSA9PiBJdGVyYWJsZTxUeXBlIHwgbnVsbD4gfCBUeXBlIHwgbnVsbCwgcmV2ZXJzZT86IGJvb2xlYW4pXG5cdFx0e1xuXHRcdFx0Y29uc3QgeWllbGRlZDogVHlwZVtdID0gW107XG5cdFx0XHRcblx0XHRcdHR5cGUgUmVjdXJzZVR5cGUgPSBJdGVyYWJsZUl0ZXJhdG9yPHsgdHlwZTogVHlwZTsgdmlhOiBUeXBlIHwgbnVsbCB9Pjtcblx0XHRcdGZ1bmN0aW9uICpyZWN1cnNlKHR5cGU6IFR5cGUsIHZpYTogVHlwZSB8IG51bGwpOiBSZWN1cnNlVHlwZVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoeWllbGRlZC5pbmNsdWRlcyh0eXBlKSlcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoIXJldmVyc2UpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR5aWVsZGVkLnB1c2godHlwZSk7XG5cdFx0XHRcdFx0eWllbGQgeyB0eXBlLCB2aWEgfTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgcmVkdWNlZCA9IG5leHRGbih0eXBlKTtcblx0XHRcdFx0aWYgKHJlZHVjZWQgIT09IG51bGwgJiYgcmVkdWNlZCAhPT0gdW5kZWZpbmVkKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKHJlZHVjZWQgaW5zdGFuY2VvZiBUeXBlKVxuXHRcdFx0XHRcdFx0cmV0dXJuIHlpZWxkICpyZWN1cnNlKHJlZHVjZWQsIHR5cGUpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGZvciAoY29uc3QgbmV4dFR5cGUgb2YgcmVkdWNlZClcblx0XHRcdFx0XHRcdGlmIChuZXh0VHlwZSBpbnN0YW5jZW9mIFR5cGUpXG5cdFx0XHRcdFx0XHRcdHlpZWxkICpyZWN1cnNlKG5leHRUeXBlLCB0eXBlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0aWYgKHJldmVyc2UpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR5aWVsZGVkLnB1c2godHlwZSk7XG5cdFx0XHRcdFx0eWllbGQgeyB0eXBlLCB2aWEgfTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHR5aWVsZCAqcmVjdXJzZSh0aGlzLCBudWxsKTtcblx0XHR9XG5cdFxuXHRcdC8qKlxuXHRcdCAqIFF1ZXJpZXMgZm9yIGEgVHlwZSB0aGF0IGlzIG5lc3RlZCB1bmRlcm5lYXRoIHRoaXMgVHlwZSxcblx0XHQgKiBhdCB0aGUgc3BlY2lmaWVkIHR5cGUgcGF0aC5cblx0XHQgKi9cblx0XHRxdWVyeSguLi50eXBlUGF0aDogc3RyaW5nW10pXG5cdFx0e1xuXHRcdFx0bGV0IGN1cnJlbnRUeXBlOiBUeXBlIHwgbnVsbCA9IG51bGw7XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgdHlwZU5hbWUgb2YgdHlwZVBhdGgpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IG5leHRUeXBlID0gdGhpcy5jb250ZW50cy5maW5kKHR5cGUgPT4gdHlwZS5uYW1lID09PSB0eXBlTmFtZSk7XG5cdFx0XHRcdGlmICghbmV4dFR5cGUpXG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFxuXHRcdFx0XHRjdXJyZW50VHlwZSA9IG5leHRUeXBlO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gY3VycmVudFR5cGU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENoZWNrcyB3aGV0aGVyIHRoaXMgVHlwZSBoYXMgdGhlIHNwZWNpZmllZCB0eXBlXG5cdFx0ICogc29tZXdoZXJlIGluIGl0J3MgYmFzZSBncmFwaC5cblx0XHQgKi9cblx0XHRpcyhiYXNlVHlwZTogVHlwZSlcblx0XHR7XG5cdFx0XHRmb3IgKGNvbnN0IHsgdHlwZSB9IG9mIHRoaXMuaXRlcmF0ZSh0ID0+IHQuYmFzZXMpKVxuXHRcdFx0XHRpZiAodHlwZSA9PT0gYmFzZVR5cGUpXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQ2hlY2tzIHdoZXRoZXIgdGhpcyBUeXBlIGhhcyB0aGUgc3BlY2lmaWVkIHR5cGVcblx0XHQgKiBzb21ld2hlcmUgaW4gaXQncyBiYXNlIGdyYXBoLlxuXHRcdCAqL1xuXHRcdGlzUm9vdChiYXNlVHlwZTogVHlwZSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5pcyhiYXNlVHlwZSkgfHzCoHRoaXMucGFyYWxsZWxSb290cy5pbmNsdWRlcyhiYXNlVHlwZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENoZWNrcyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgdHlwZSBpcyBpbiB0aGlzIFR5cGUnc1xuXHRcdCAqIGAuY29udGVudHNgIHByb3BlcnR5LCBlaXRoZXIgZGlyZWN0bHksIG9yIGluZGlyZWN0bHkgdmlhXG5cdFx0ICogdGhlIHBhcmFsbGVsIGdyYXBocyBvZiB0aGUgYC5jb250ZW50c2AgVHlwZXMuXG5cdFx0ICovXG5cdFx0aGFzKHR5cGU6IFR5cGUpXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMuY29udGVudHMuaW5jbHVkZXModHlwZSkpXG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGNvbnRhaW5lZFR5cGUgb2YgdGhpcy5jb250ZW50cylcblx0XHRcdFx0aWYgKHR5cGUubmFtZSA9PT0gY29udGFpbmVkVHlwZS5uYW1lKVxuXHRcdFx0XHRcdGZvciAoY29uc3QgcGFyYWxsZWwgb2YgY29udGFpbmVkVHlwZS5pdGVyYXRlKHQgPT4gdC5wYXJhbGxlbHMpKVxuXHRcdFx0XHRcdFx0aWYgKHBhcmFsbGVsLnR5cGUgPT09IHR5cGUpXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRyYW5zZmVyIG93bmVyc2hpcCBvZiB0aGlzIGluc3RhbmNlIHRvIGFub3RoZXIgQ29kZSBpbnN0YW5jZVxuXHRcdCAqL1xuXHRcdHRyYW5zZmVyKGNvZGU6IENvZGUpXG5cdFx0e1xuXHRcdFx0dGhpcy5jb2RlID0gY29kZTtcblx0XHRcdHRoaXMucHJvdG90eXBlLnRyYW5zZmVyKGNvZGUpO1xuXHRcdH1cblx0XHRcblx0XHR0b0pTT04oKVxuXHRcdHtcdFxuXHRcdFx0cmV0dXJuIFt0aGlzLnByb3RvdHlwZS5pZCwgdGhpcy5jb250YWluZXIgJiYgdGhpcy5jb250YWluZXIuaWQsIHRoaXMubmFtZSwgdGhpcy52YWx1ZXNdO1xuXHRcdH1cblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlclxue1xuXHQvKipcblx0ICogS2VlcHMgdHJhY2sgb2YgcmVsYXRpb25zIGJldHdlZW4gdHlwZXMuXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgVHlwZVNldCBleHRlbmRzIFNldDxGdXR1cmVUeXBlPlxuXHR7XG5cdFx0c3RhdGljIGZyb21KU09OKGRhdGE6IG51bWJlcltdKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgVHlwZVNldChkYXRhLm1hcCh4ID0+IEZ1dHVyZVR5cGUubmV3KHgpKSk7XG5cdFx0fVxuXHRcdFxuXHRcdHNuYXBzaG90KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy50b0FycmF5KCkubWFwKHggPT4geC50eXBlKS5maWx0ZXIoeCA9PiB4KSBhcyBUeXBlW107XG5cdFx0fVxuXHRcdFxuXHRcdHRvQXJyYXkoKVxuXHRcdHtcblx0XHRcdHJldHVybiBBcnJheS5mcm9tKHRoaXMudmFsdWVzKCkpLnNvcnQoKTtcdFxuXHRcdH1cblx0XHRcblx0XHR0b0pTT04oKSB7IHJldHVybiB0aGlzLnRvQXJyYXkoKTsgfVxuXHRcdHZhbHVlT2YoKSB7IHJldHVybiB0aGlzLnRvQXJyYXkoKTsgfVxuXHRcdFtTeW1ib2wudG9QcmltaXRpdmVdKCkgeyByZXR1cm4gdGhpcy50b0FycmF5KCk7IH1cblx0XHRnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKSB7IHJldHVybiBcIlR5cGVTZXRcIjsgfVxuXHR9XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyLlV0aWxcbntcblx0Y29uc3QgSGVhZGVycyA9IGBcblx0YW55XG5cdG9iamVjdCA6IGFueVxuXHRzdHJpbmcgOiBhbnlcblx0bnVtYmVyIDogYW55XG5cdGJpZ2ludCA6IGFueVxuXHRib29sZWFuIDogYW55XG5cdFxuXHQvXCIuK1wiIDogc3RyaW5nXG5cdC8oXFxcXCt8LSk/KChbMS05XVxcXFxkezAsMTd9KXwoWzEtOF1cXFxcZHsxOH0pfCg5WzAxXVxcXFxkezE3fSkpIDogbnVtYmVyXG5cdC8oMHwoWzEtOV1bMC05XSopKSA6IGJpZ2ludFxuXHQvKHRydWV8ZmFsc2UpIDogYm9vbGVhblxuXHRcblx0YDtcblx0XG5cdC8qKlxuXHQgKiBIYXNoIGNhbGN1bGF0aW9uIGZ1bmN0aW9uIGFkYXB0ZWQgZnJvbTpcblx0ICogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzUyMTcxNDgwLzEzMzczN1xuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGhhc2godmFsdWU6IHN0cmluZywgc2VlZCA9IDApXG5cdHtcblx0XHRsZXQgaDEgPSAweERFQURCRUVGIF4gc2VlZDtcblx0XHRsZXQgaDIgPSAwWDQxQzZDRTU3IF4gc2VlZDtcblx0XHRcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKVxuXHRcdHtcblx0XHRcdGxldCBjaCA9IHZhbHVlLmNoYXJDb2RlQXQoaSk7XG5cdFx0XHRoMSA9IE1hdGguaW11bChoMSBeIGNoLCAyNjU0NDM1NzYxKTtcblx0XHRcdGgyID0gTWF0aC5pbXVsKGgyIF4gY2gsIDE1OTczMzQ2NzcpO1xuXHRcdH1cblx0XHRcblx0XHRoMSA9IE1hdGguaW11bChoMSBeIGgxID4+PiAxNiwgMjI0NjgyMjUwNykgXiBNYXRoLmltdWwoaDIgXiBoMiA+Pj4gMTMsIDMyNjY0ODk5MDkpO1xuXHRcdGgyID0gTWF0aC5pbXVsKGgyIF4gaDIgPj4+IDE2LCAyMjQ2ODIyNTA3KSBeIE1hdGguaW11bChoMSBeIGgxID4+PiAxMywgMzI2NjQ4OTkwOSk7XG5cdFx0cmV0dXJuIDQyOTQ5NjcyOTYgKiAoMjA5NzE1MSAmIGgyKSArIChoMSA+Pj4gMCk7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBDb21wcmVzcyBuZXN0ZWQgYXJyYXlzXG5cdCAqIEBwYXJhbSBkYXRhIEFuIGFycmF5IHdpdGggbmVzdGVkIGFycmF5cyBpbiBpdFxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGVuY29kZShkYXRhOiBhbnlbXSlcblx0e1xuXHRcdGNvbnN0IGJmID0gbmV3IEJpdGZpZWxkcygpO1xuXHRcdGNvbnN0IHJlc3VsdCA9IFtdO1xuXHRcdFxuXHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgZGF0YS5sZW5ndGg7KVxuXHRcdHtcblx0XHRcdGNvbnN0IHZwID0gZGF0YVtpXTtcblx0XHRcdGNvbnN0IHZhbHVlID0gdnAgJiYgdHlwZW9mIHZwID09PSBcIm9iamVjdFwiICYmIFwidG9KU09OXCIgaW4gdnAgPyB2cC50b0pTT04oKSA6IHZwO1x0XG5cdFx0XHRjb25zdCBiaXQgPSBBcnJheS5pc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDA7XG5cdFx0XHRiZi5zZXQoaSwgYml0ID8gZmFsc2UgOiB0cnVlKTtcblx0XHRcdCBcblx0XHRcdGlmICghYml0KSBcblx0XHRcdFx0cmVzdWx0LnB1c2godmFsdWUpO1xuXHRcdH1cblx0XHRcblx0XHRyZXN1bHQudW5zaGlmdChiZik7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXHRcblx0XG5cdC8qKlxuXHQgKiBEZWNvbXByZXNzIG5lc3RlZCBhcnJheXNcblx0ICogQHBhcmFtIGRhdGEgQSBjb21wcmVzc2VkIGFycmF5XG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gZGVjb2RlKGRhdGE6IFtudW1iZXIsIC4uLmFueVtdXSwgbGVuZ3RoPzogbnVtYmVyKVxuXHR7XG5cdFx0Y29uc3QgYmYgPSBuZXcgQml0ZmllbGRzKGRhdGEuc2hpZnQoKSk7XG5cdFx0XG5cdFx0aWYgKCFsZW5ndGggfHzCoGxlbmd0aCA8IDEpIFxuXHRcdFx0bGVuZ3RoID0gYmYuc2l6ZTtcblx0XHRcdFxuXHRcdGNvbnN0IHJlc3VsdCA9IG5ldyBBcnJheShsZW5ndGgpO1xuXHRcdFxuXHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgbGVuZ3RoOylcblx0XHR7XG5cdFx0XHRjb25zdCBiaXQgPSBiZi5nZXQoaSk7XG5cdFx0XHRpZiAoYml0KVxuXHRcdFx0XHRyZXN1bHRbaV0gPSBkYXRhLnNoaWZ0KCk7XG5cdFx0XHRlbHNlIFxuXHRcdFx0XHRyZXN1bHRbaV0gPSBbXTtcblx0XHR9XG5cdFx0XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fVxuXHRcblx0LyoqXG5cdCAqIEZldGNoIGEgZmlsZSB3aXRob3V0IHBsYXRmb3JtIGRlcGVuZGVuY2llc1xuXHQgKiBAcGFyYW0gdXJsIEpTT04gZmlsZSB1cmxcblx0ICovXG5cdGV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaEpTT04odXJsOiBzdHJpbmcpXG5cdHtcblx0XHRpZiAoZ2xvYmFsVGhpcyAmJiBcImZldGNoXCIgaW4gZ2xvYmFsVGhpcykgXG5cdFx0e1xuXHRcdFx0Y29uc3QgcmVxdWVzdCA9IGF3YWl0ICg8YW55Pmdsb2JhbFRoaXMpLmZldGNoKHVybCk7XG5cdFx0XHRyZXR1cm4gYXdhaXQgcmVxdWVzdC5qc29uKCk7XG5cdFx0fVxuXHRcdFxuXHRcdHRocm93IFwiVGhpcyBwbGF0Zm9ybSBpcyBub3Qgc3VwcG9ydGVkIVwiO1xuXHR9XG5cdFxuXHQvKipcblx0ICogTWFrZSBhIHByb3BlcnR5IChub24tKWVudW1lcmFibGVcblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBzaGFkb3cob2JqZWN0OiBvYmplY3QsIGtleTogc3RyaW5nIHwgc3ltYm9sLCBlbnVtZXJhYmxlID0gZmFsc2UpXG5cdHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBrZXksIHtcblx0XHRcdGVudW1lcmFibGVcblx0XHR9KTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIE1ha2UgYSBwcm9wZXJ0aWVzIChub24tKWVudW1lcmFibGVcblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBzaGFkb3dzKG9iamVjdDogb2JqZWN0LCBlbnVtZXJhYmxlID0gZmFsc2UsIC4uLmtleXM6IEFycmF5PHN0cmluZyB8wqBzeW1ib2w+KVxuXHR7XG5cdFx0Zm9yIChsZXQga2V5IG9mIGtleXMpXG5cdFx0XHRzaGFkb3cob2JqZWN0LCBrZXksIGVudW1lcmFibGUpO1xuXHR9XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZEZpbGUoY29udGVudDogc3RyaW5nLCBwYXR0ZXJuOiBSZWdFeHApXG5cdHtcblx0XHRjb25zdCBkb2MgPSBhd2FpdCBUcnV0aC5wYXJzZShIZWFkZXJzICsgY29udGVudCk7XG5cdFx0XG5cdFx0ZG9jLnByb2dyYW0udmVyaWZ5KCk7XG5cdFx0XG5cdFx0Y29uc3QgZmF1bHRzID0gQXJyYXkuZnJvbShkb2MucHJvZ3JhbS5mYXVsdHMuZWFjaCgpKTtcblx0XHRcblx0XHRpZiAoZmF1bHRzLmxlbmd0aCkgXG5cdFx0e1x0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBmYXVsdCBvZiBmYXVsdHMpXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoZmF1bHQudG9TdHJpbmcoKSk7XG5cdFx0XHRcdFxuXHRcdFx0dGhyb3cgZmF1bHRzWzBdLnRvU3RyaW5nKCk7XG5cdFx0fVxuXHRcdFxuXHRcdGxldCBjb2RlID0gbmV3IEJhY2tlci5Db2RlKCk7XG5cdFx0XHRcblx0XHRjb25zdCBkcmlsbCA9ICh0eXBlOiBUcnV0aC5UeXBlKSA9PiBcblx0XHR7XG5cdFx0XHRjb2RlLmFkZChCYWNrZXIuVHlwZS5uZXcoY29kZSwgdHlwZSkpO1xuXHRcdFx0Zm9yIChjb25zdCBzdWIgb2YgdHlwZS5jb250ZW50cylcblx0XHRcdFx0ZHJpbGwoc3ViKTtcblx0XHR9O1xuXHRcdFxuXHRcdGZvciAoY29uc3QgdHlwZSBvZiBkb2MudHlwZXMpXG5cdFx0XHRkcmlsbCh0eXBlKTtcblx0XHRcdFxuXHRcdGNvbnN0IGV4dHJhY3RlZCA9IGNvZGUuZXh0cmFjdERhdGEocGF0dGVybik7XG5cdFx0XG5cdFx0Y29kZSA9IGV4dHJhY3RlZC5jb2RlO1xuXHRcdGNvbnN0IGRhdGEgPSBleHRyYWN0ZWQuZGF0YTtcblx0XHRcblx0XHRjb25zdCBzaW1wbGVjb2RlID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjb2RlKSk7XG5cdFx0Y29uc3Qgc2ltcGxlZGF0YSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xuXHRcdFxuXHRcdGNvbnN0IEJDb2RlID0gQmFja2VyLkNvZGUubmV3KHNpbXBsZWNvZGUpO1xuXHRcdEJDb2RlLmxvYWREYXRhKHNpbXBsZWRhdGEpO1xuXHRcdFxuXHRcdHJldHVybiBjb2RlO1xuXHR9XG59Il19