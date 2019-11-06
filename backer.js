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
                const type = new Backer.Type(this, name, prototype, null, info.shift());
                const generate = (content) => {
                    const clone = new Backer.Type(this, content.name, this.prototypes[prototypes.shift()], Backer.FutureType.new(type), content.aliases.concat(info.shift()));
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
            const data = dataSchema.map(x => [x.map(x => x.prototype.id), x[0].name, ...x.map(x => x.aliases)]);
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
                        this.filter(x => x[Backer.typeOf].is(leaf[Backer.typeOf]) || x[Backer.typeOf].parallelRoots.includes(leaf[Backer.typeOf]));
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
                        this.filter(x => x[Backer.typeOf].isFresh);
                        break;
                    case TruthTalk.PredicateOp.equals:
                        this.filter(x => x[Backer.value] == leaf.operand);
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
                }
            }
            /**
             * Go one level nested in
             */
            contents() {
                this.cursors = new Set(this.snapshot().flatMap(x => x.contents).filter((x) => !!x));
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
                return instance.filter(x => {
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
            var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
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
        static load(code, serialized) {
            const data = Backer.Util.decode(serialized, 5);
            return new Prototype(code, new Backer.Bitfields(data[0]), Backer.TypeSet.fromJSON(data[1]), Backer.TypeSet.fromJSON(data[2]), Backer.TypeSet.fromJSON(data[3]), Backer.TypeSet.fromJSON(data[4]));
        }
        get id() {
            return this.code.prototypes.indexOf(this);
        }
        get hash() {
            return Backer.Util.hash(JSON.stringify(this));
        }
        transfer(code) {
            this.code = code;
        }
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
const tt = Reflex.Core.createContainerNamespace(new Backer.TruthTalk.Library(), true);
/// <reference path="Nodes.ts"/>
var Backer;
/// <reference path="Nodes.ts"/>
(function (Backer) {
    Backer.typeOf = Symbol("typeOf");
    Backer.value = Symbol("value");
    Backer.values = Symbol("values");
    Backer.parent = Symbol("parent");
    class Struct extends Backer.TruthTalk.Leaves.Surrogate {
        constructor(type, parentValue) {
            super();
            this[Backer.typeOf] = type;
            this[Backer.parent] = parentValue;
            Backer.Util.shadows(this, false, Backer.typeOf, Backer.values, Backer.TruthTalk.op, Backer.parent, Backer.TruthTalk.container);
            for (const child of type.contents)
                this[child.name] = Struct.new(child, this);
        }
        static new(type, parentValue) {
            const constr = parentValue ?
                parentValue instanceof Surrogate ?
                    type.is(Backer.Schema.object[Backer.typeOf]) ? Surrogate :
                        type.is(Backer.Schema.string[Backer.typeOf]) ? SurrogateString :
                            type.is(Backer.Schema.number[Backer.typeOf]) ? SurrogateNumber :
                                type.is(Backer.Schema.bigint[Backer.typeOf]) ? SurrogateBigInt :
                                    type.is(Backer.Schema.boolean[Backer.typeOf]) ? SurrogateBoolean :
                                        Surrogate : Struct : Struct;
            return new constr(type, parentValue);
        }
        get [Backer.values]() {
            return this[Backer.typeOf].aliases;
        }
        get proxy() {
            return this;
        }
        get contents() {
            return Object.values(this);
        }
        get root() {
            let root = this;
            while (root && root[Backer.parent])
                root = root[Backer.parent];
            return root;
        }
        instanceof(base) {
            return this[Backer.typeOf].is(base);
        }
        ;
        is(base) {
            base = base instanceof Backer.Type ? base : base[Backer.typeOf];
            return this[Backer.typeOf].is(base);
        }
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
        get [Backer.value]() {
            return this[Backer.typeOf].value;
        }
        get contents() {
            return Object.values(this);
        }
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
            if (this instanceof Surrogate && this.constructor !== Surrogate)
                return this[Backer.value];
            const Obj = Object.assign({}, this);
            if (this[Backer.value] !== null && this[Backer.value] !== undefined)
                Obj[Backer.value] = this[Backer.value];
            return Obj;
        }
    }
    Backer.Surrogate = Surrogate;
    class SurrogateString extends Surrogate {
        get [Backer.value]() {
            const val = this[Backer.typeOf].value;
            return val ? JSON.parse(val) : null;
        }
    }
    Backer.SurrogateString = SurrogateString;
    class SurrogateNumber extends Surrogate {
        get [Backer.value]() {
            const val = this[Backer.typeOf].value;
            return val ? Number(val) : null;
        }
    }
    Backer.SurrogateNumber = SurrogateNumber;
    class SurrogateBigInt extends Surrogate {
        get [Backer.value]() {
            const val = this[Backer.typeOf].value;
            return val ? BigInt(val) : null;
        }
    }
    Backer.SurrogateBigInt = SurrogateBigInt;
    class SurrogateBoolean extends Surrogate {
        get [Backer.value]() {
            const val = this[Backer.typeOf].value;
            return val ? JSON.parse(val) : null;
        }
    }
    Backer.SurrogateBoolean = SurrogateBoolean;
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
        static load(code, data) {
            console.log(data);
            return new Type(code, data[2], code.prototypes[data[0]], data[1] ? Backer.FutureType.new(data[1]) : null, data[3]);
        }
        static new(code, type) {
            const instance = new Type(code, type.isPattern ? type.name.substr(9) : type.name, Backer.Prototype.new(code, type), type.container ? Backer.FutureType.new(type.container) : null, type.aliases);
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
        transfer(code) {
            this.code = code;
            this.prototype.transfer(code);
        }
        toJSON() {
            return [this.prototype.id, this.container && this.container.id, this.name, this.aliases];
        }
    }
    Backer.Type = Type;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
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
        async function fetchJSON(url) {
            if (globalThis && "fetch" in globalThis) {
                const request = await globalThis.fetch(url);
                return await request.json();
            }
            throw "This platform is not supported!";
        }
        Util.fetchJSON = fetchJSON;
        function shadow(object, key, enumerable = false) {
            Object.defineProperty(object, key, {
                enumerable: enumerable
            });
        }
        Util.shadow = shadow;
        function shadows(object, enumerable = false, ...keys) {
            for (let key of keys)
                shadow(object, key, enumerable);
        }
        Util.shadows = shadows;
    })(Util = Backer.Util || (Backer.Util = {}));
})(Backer || (Backer = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc291cmNlL0FTVC50cyIsIi4uL3NvdXJjZS9CaXRmaWVsZHMudHMiLCIuLi9zb3VyY2UvQ29kZS50cyIsIi4uL3NvdXJjZS9FbmdpbmUudHMiLCIuLi9zb3VyY2UvRnV0dXJlVHlwZS50cyIsIi4uL3NvdXJjZS9Ob2Rlcy50cyIsIi4uL3NvdXJjZS9Qcm90b3R5cGUudHMiLCIuLi9zb3VyY2UvUmVmbGV4TGlicmFyeS50cyIsIi4uL3NvdXJjZS9TdXJyb2dhdGVzLnRzIiwiLi4vc291cmNlL1R5cGUudHMiLCIuLi9zb3VyY2UvVHlwZVNldC50cyIsIi4uL3NvdXJjZS9VdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUNDQSxJQUFVLE1BQU0sQ0FpRGY7QUFqREQsV0FBVSxNQUFNO0lBRWY7O09BRUc7SUFDSCxNQUFhLFNBQVM7UUFFckIsWUFBbUIsUUFBUSxDQUFDO1lBQVQsVUFBSyxHQUFMLEtBQUssQ0FBSTtRQUFHLENBQUM7UUFFaEM7O1dBRUc7UUFDSCxJQUFJLElBQUk7WUFFUCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxHQUFHLENBQUMsS0FBYTtZQUVoQixJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUU7Z0JBQzFCLE9BQU8sS0FBSyxDQUFDO1lBRWQsT0FBTyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNqRCxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxHQUFHLENBQUMsS0FBYSxFQUFFLEtBQWM7WUFFaEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFO2dCQUMx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RyxDQUFDLENBQUM7Z0JBQ25ELE9BQU8sTUFBTSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7YUFDNUI7WUFFRCxNQUFNLGlDQUFpQyxDQUFDO1FBQ3pDLENBQUM7UUFUcUIsY0FBUyxZQVM5QixDQUFBO1FBRUQsU0FBZ0IsTUFBTSxDQUFDLE1BQWMsRUFBRSxHQUFvQixFQUFFLFVBQVUsR0FBRyxLQUFLO1lBRTlFLE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtnQkFDbEMsVUFBVSxFQUFFLFVBQVU7YUFDdEIsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUxlLFdBQU0sU0FLckIsQ0FBQTtRQUVELFNBQWdCLE9BQU8sQ0FBQyxNQUFjLEVBQUUsVUFBVSxHQUFHLEtBQUssRUFBRSxHQUFHLElBQTRCO1lBRTFGLEtBQUssSUFBSSxHQUFHLElBQUksSUFBSTtnQkFDbkIsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUplLFlBQU8sVUFJdEIsQ0FBQTtJQUNGLENBQUMsRUF2RmdCLElBQUksR0FBSixXQUFJLEtBQUosV0FBSSxRQXVGcEI7QUFBRCxDQUFDLEVBdkZTLE1BQU0sS0FBTixNQUFNLFFBdUZmIiwic291cmNlc0NvbnRlbnQiOlsiXG5uYW1lc3BhY2UgQmFja2VyLlRydXRoVGFsa1xue1xuXHRleHBvcnQgdHlwZSBBdG9taWMgPSBSZWZsZXguQ29yZS5BdG9taWM8Tm9kZSwgQnJhbmNoPjtcblx0ZXhwb3J0IHR5cGUgQXRvbWljcyA9IFJlZmxleC5Db3JlLkF0b21pY3M8Tm9kZSwgQnJhbmNoPjtcblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgaW50ZXJmYWNlIE5hbWVzcGFjZSBleHRlbmRzXG5cdFx0UmVmbGV4LkNvcmUuSUNvbnRhaW5lck5hbWVzcGFjZTxBdG9taWNzLCBCcmFuY2hlcy5RdWVyeT5cblx0e1xuXHRcdC8qKiAqL1xuXHRcdGlzKC4uLmF0b21pY3M6IEF0b21pY3NbXSk6IEJyYW5jaGVzLklzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGhhcyguLi5hdG9taWNzOiBBdG9taWNzW10pOiBCcmFuY2hlcy5IYXM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bm90KC4uLmF0b21pY3M6IEF0b21pY3NbXSk6IEJyYW5jaGVzLk5vdDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRvciguLi5hdG9taWNzOiBBdG9taWNzW10pOiBCcmFuY2hlcy5Pcjtcblx0XHRcblx0XHQvKiogKi9cblx0XHRjb250YWluZXJzKCk6IExlYXZlcy5Db250YWluZXJzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJvb3QoKTogTGVhdmVzLlJvb3RzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvbnRlbnRzKCk6IExlYXZlcy5Db250ZW50cztcblx0XHRcblx0XHQvKiogKi9cblx0XHRlcXVhbHModmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4pOiBMZWF2ZXMuUHJlZGljYXRlO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdyZWF0ZXJUaGFuKHZhbHVlOiBzdHJpbmcgfCBudW1iZXIpOiBMZWF2ZXMuUHJlZGljYXRlO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGxlc3NUaGFuKHZhbHVlOiBzdHJpbmcgfCBudW1iZXIpOiBMZWF2ZXMuUHJlZGljYXRlO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHN0YXJ0c1dpdGgodmFsdWU6IHN0cmluZyB8IG51bWJlcik6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZW5kc1dpdGgodmFsdWU6IHN0cmluZyB8IG51bWJlcik6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YWxpYXNlZCgpOiBMZWF2ZXMuQWxpYXNlZDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRsZWF2ZXMoKTogTGVhdmVzLkxlYXZlcztcblx0XHRcblx0XHQvKiogKi9cblx0XHRmcmVzaCgpOiBMZWF2ZXMuRnJlc2g7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c2xpY2Uoc3RhcnQ6IG51bWJlciwgZW5kPzogbnVtYmVyKTogTGVhdmVzLlNsaWNlO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdG9jY3VyZW5jZXMobWluOiBudW1iZXIsIG1heD86IG51bWJlcik6IExlYXZlcy5PY2N1cmVuY2VzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHNvcnQoLi4uY29udGVudFR5cGVzOiBPYmplY3RbXSk6IExlYXZlcy5Tb3J0O1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJldmVyc2UoKTogTGVhdmVzLlJldmVyc2U7XG5cdFx0XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIEJhY2tlclxue1xuXHQvKipcblx0ICogQml0d2lzZSBmbGFnIG1hbmFnZXJcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBCaXRmaWVsZHNcblx0e1xuXHRcdGNvbnN0cnVjdG9yKHB1YmxpYyBmbGFncyA9IDApIHt9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyBhcHByb3guIHNpemUgYmFzZWQgb24gbGFzdCBzZXQgYml0LlxuXHRcdCAqL1xuXHRcdGdldCBzaXplKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gTWF0aC5jZWlsKE1hdGgubG9nMih0aGlzLmZsYWdzKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdldHMgYSBib29sZWFuIGZyb20gc3BlY2lmaWVkIGluZGV4LlxuXHRcdCAqL1xuXHRcdGdldChpbmRleDogbnVtYmVyKVxuXHRcdHtcblx0XHRcdGlmIChpbmRleCA8IDAgfHwgaW5kZXggPiAzMSlcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcblx0XHRcdHJldHVybiB0aGlzLmZsYWdzICYgKDEgPDwgaW5kZXgpID8gdHJ1ZSA6IGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTZXRzIGEgYm9vbGVhbiB0byBzcGVjaWZpZWQgaW5kZXguXG5cdFx0ICovXG5cdFx0c2V0KGluZGV4OiBudW1iZXIsIHZhbHVlOiBib29sZWFuKVxuXHRcdHtcblx0XHRcdGlmIChpbmRleCA8IDAgfHwgaW5kZXggPiAzMSlcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBtYXNrID0gMSA8PCBpbmRleDtcblx0XHRcdFxuXHRcdFx0aWYgKHZhbHVlKVxuXHRcdFx0XHR0aGlzLmZsYWdzIHw9IG1hc2s7XG5cdFx0XHRlbHNlIFxuXHRcdFx0XHR0aGlzLmZsYWdzICY9IH5tYXNrO1xuXHRcdH1cblx0XHRcblx0XHR0b0pTT04oKSB7IHJldHVybiB0aGlzLmZsYWdzOyB9XG5cdFx0dmFsdWVPZigpIHsgcmV0dXJuIHRoaXMuZmxhZ3M7IH1cblx0XHRbU3ltYm9sLnRvUHJpbWl0aXZlXSgpIHsgcmV0dXJuIHRoaXMuZmxhZ3M7IH1cblx0XHRnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKSB7IHJldHVybiBcIkJpdGZpZWxkc1wiOyB9XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXJcbntcdFxuXHQvKipcblx0ICogUmVmZXJhbmNlcyB0byBldmVyeSBsb2FkZWQgQ29kZSBpbnN0YW5jZS5cblx0ICovXG5cdGV4cG9ydCBjb25zdCBDb2RlczogQ29kZVtdID0gW107XG5cdFxuXHQvKipcblx0ICogTGFzdCBsb2FkZWQgU2NoZW1hXG5cdCAqL1xuXHRleHBvcnQgbGV0IFNjaGVtYTogUmVjb3JkPHN0cmluZywgU3RydWN0PiA9IHt9O1xuXHRcblx0LyoqXG5cdCAqIFJlZmVyYW5jZXMgdG8gZXZlcnkgbG9hZGVkIFNjaGVtYVxuXHQgKi9cblx0ZXhwb3J0IGNvbnN0IFNjaGVtYXM6IFJlY29yZDxzdHJpbmcsIFN0cnVjdD5bXSA9IFtdO1xuXHRcblx0LyoqXG5cdCAqIExhc3QgbG9hZGVkIERhdGEgR3JhcGhcblx0ICovXG5cdGV4cG9ydCBsZXQgR3JhcGg6IFJlY29yZDxzdHJpbmcsIFN1cnJvZ2F0ZT4gPSB7fTtcblx0XG5cdC8qKlxuXHQgKiBSZWZlcmFuY2VzIHRvIGV2ZXJ5IGxvYWRlZCBEYXRhIEdyYXBoXG5cdCAqL1xuXHRleHBvcnQgY29uc3QgR3JhcGhzOiBSZWNvcmQ8c3RyaW5nLCBTdXJyb2dhdGU+W10gPSBbXTtcblx0XG5cdC8qKlxuXHQgKiBUcnV0aCBDb2RlIEpTT05cblx0ICogXG5cdCAqIFRoaXMgY2xhc3MgbWFuYWdlcyBjb2RlIHR5cGVzIGV4dHJhY3RlZCBmcm9tIFRydXRoIGZpbGUgYnkgY29tcGlsZXIuXG5cdCAqIEFsc28gbWFuYWdlcyByZWxhdGlvbnMgYmV0d2VlbiBwcm90b3R5cGUsIHR5cGVzIGFuZCBkYXRhLiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBDb2RlXG5cdHtcblx0XHQvKipcblx0XHQgKiBMb2FkcyBhIENvZGVKU09OIGFuZCBsb2FkcyBEYXRhSlNPTnMgb24gdGhhdCBDb2RlIGluc3RhbmNlLlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSBjb2RlIENvZGVKU09OIFVybFxuXHRcdCAqIEBwYXJhbSBkYXRhIERhdGFKU09OIFVybHNcblx0XHQgKi9cblx0XHRzdGF0aWMgYXN5bmMgbG9hZChjb2RlOiBzdHJpbmcsIC4uLmRhdGE6IHN0cmluZ1tdKVxuXHRcdHtcblx0XHRcdGNvbnN0IGluc3RhbmNlID0gQ29kZS5uZXcoYXdhaXQgVXRpbC5mZXRjaEpTT04oY29kZSkpO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHVybCBvZiBkYXRhKVxuXHRcdFx0XHRpbnN0YW5jZS5sb2FkRGF0YShhd2FpdCBVdGlsLmZldGNoSlNPTih1cmwpKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGluc3RhbmNlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBMb2FkcyBhIENvZGUgaW5zdGFuY2UgZnJvbSBwYXJzZWQgQ29kZSBKU09OLlxuXHRcdCAqIEBwYXJhbSBkYXRhIFBhcnNlZCBDb2RlSlNPTlxuXHRcdCAqL1xuXHRcdHN0YXRpYyBuZXcoZGF0YTogW1Byb3RvdHlwZUpTT05bXSwgVHlwZUpTT05bXV0pXG5cdFx0e1xuXHRcdFx0Y29uc3QgY29kZSA9IG5ldyBDb2RlKCk7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHByb3RvdHlwZXMgPSBkYXRhWzBdLm1hcCh4ID0+IFByb3RvdHlwZS5sb2FkKGNvZGUsIHgpKTtcblx0XHRcdGZvciAoY29uc3QgcHJvdG8gb2YgcHJvdG90eXBlcylcblx0XHRcdFx0Y29kZS5wcm90b3R5cGVzLnB1c2gocHJvdG8pO1xuXHRcdFx0XG5cdFx0XHRjb25zdCB0eXBlcyA9IGRhdGFbMV0ubWFwKHggPT4gVHlwZS5sb2FkKGNvZGUsIHgpKTtcblx0XHRcdGZvciAoY29uc3QgdHlwZSBvZiB0eXBlcylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgaWQgPSBjb2RlLnR5cGVzLnB1c2godHlwZSkgLSAxO1xuXHRcdFx0XHRGdXR1cmVUeXBlLklkTWFwLnNldChpZCwgdHlwZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGNvbnN0IFNjaGVtYTogUmVjb3JkPHN0cmluZywgU3RydWN0PiA9IHt9O1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHR5cGUgb2YgdHlwZXMpXG5cdFx0XHRcdGlmICghdHlwZS5jb250YWluZXIpXG5cdFx0XHRcdFx0U2NoZW1hW3R5cGUubmFtZV0gPSBuZXcgU3RydWN0KHR5cGUsIG51bGwpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHRCYWNrZXIuU2NoZW1hID0gU2NoZW1hO1xuXHRcdFx0XHRcdFxuXHRcdFx0U2NoZW1hcy5wdXNoKFNjaGVtYSk7XG5cdFx0XHRDb2Rlcy5wdXNoKGNvZGUpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gY29kZTtcblx0XHR9XG5cdFx0XG5cdFx0dHlwZXM6IFR5cGVbXSA9IFtdO1xuXHRcdHByb3RvdHlwZXM6IFByb3RvdHlwZVtdID0gW107XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQmluZHMgYSB0eXBlIHRvIENvZGUgaW5zdGFuY2Vcblx0XHQgKi9cblx0XHRhZGQodHlwZTogVHlwZSlcblx0XHR7XG5cdFx0XHRpZiAoIXRoaXMucHJvdG90eXBlcy5zb21lKHggPT4geC5oYXNoID09PSB0eXBlLnByb3RvdHlwZS5oYXNoKSlcblx0XHRcdFx0dGhpcy5wcm90b3R5cGVzLnB1c2godHlwZS5wcm90b3R5cGUpO1xuXHRcdFx0XHRcblx0XHRcdGNvbnN0IGlkID0gdGhpcy50eXBlcy5wdXNoKHR5cGUpIC0gMTtcblx0XHRcdHR5cGUudHJhbnNmZXIodGhpcyk7XG5cdFx0XHRyZXR1cm4gaWQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIExvYWRzIGRhdGEgdHlwZXMgYW5kIHN1cnJvZ2F0ZXMgZnJvbSBwYXJzZWQgRGF0YUpTT04uXG5cdFx0ICogQHBhcmFtIGRhdGEgUGFyc2VkIERhdGFKU09OXG5cdFx0ICovXG5cdFx0bG9hZERhdGEoZGF0YTogRGF0YUpTT05bXSlcblx0XHR7XHRcblx0XHRcdGNvbnN0IEdyYXBoOiBSZWNvcmQ8c3RyaW5nLCBTdXJyb2dhdGU+ID0ge307XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgaW5mbyBvZiBkYXRhKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBwcm90b3R5cGVzID0gaW5mby5zaGlmdCgpIGFzIG51bWJlcltdO1xuXHRcdFx0XHRjb25zdCBuYW1lID0gaW5mby5zaGlmdCgpIGFzIHN0cmluZztcblx0XHRcdFx0Y29uc3QgcHJvdG90eXBlID0gdGhpcy5wcm90b3R5cGVzW3Byb3RvdHlwZXMuc2hpZnQoKSFdO1xuXHRcdFx0XHRjb25zdCB0eXBlID0gbmV3IFR5cGUoXG5cdFx0XHRcdFx0dGhpcywgXG5cdFx0XHRcdFx0bmFtZSwgXG5cdFx0XHRcdFx0cHJvdG90eXBlLCBcblx0XHRcdFx0XHRudWxsLFxuXHRcdFx0XHRcdGluZm8uc2hpZnQoKSBhcyBzdHJpbmdbXVxuXHRcdFx0XHQpO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgZ2VuZXJhdGUgPSAoY29udGVudDogVHlwZSkgPT4gXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBjbG9uZSA9IG5ldyBUeXBlKFxuXHRcdFx0XHRcdFx0dGhpcyxcblx0XHRcdFx0XHRcdGNvbnRlbnQubmFtZSxcblx0XHRcdFx0XHRcdHRoaXMucHJvdG90eXBlc1twcm90b3R5cGVzLnNoaWZ0KCkhXSxcblx0XHRcdFx0XHRcdEZ1dHVyZVR5cGUubmV3KHR5cGUpLFxuXHRcdFx0XHRcdFx0Y29udGVudC5hbGlhc2VzLmNvbmNhdCg8c3RyaW5nW10+aW5mby5zaGlmdCgpKVxuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0dGhpcy50eXBlcy5wdXNoKGNsb25lKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRmb3IgKGNvbnN0IGNvbnRlbnRUeXBlIG9mIGNvbnRlbnQuY29udGVudHMpXG5cdFx0XHRcdFx0XHRnZW5lcmF0ZShjb250ZW50VHlwZSk7XG5cdFx0XHRcdH07XG5cdFx0XHRcdFxuXHRcdFx0XHR0aGlzLnR5cGVzLnB1c2godHlwZSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBiYXNlcyA9IHByb3RvdHlwZS5iYXNlcy50b0FycmF5KCkubWFwKHggPT4geC50eXBlKTtcblx0XHRcdFx0Zm9yIChjb25zdCBiYXNlIG9mIGJhc2VzKVxuXHRcdFx0XHRcdGlmIChiYXNlKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHR5cGUuYWxpYXNlcy5wdXNoKC4uLmJhc2UuYWxpYXNlcyk7XG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IGNvbnRlbnQgb2YgYmFzZS5jb250ZW50cylcblx0XHRcdFx0XHRcdFx0Z2VuZXJhdGUoY29udGVudCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0R3JhcGhbdHlwZS5uYW1lXSA9IG5ldyBTdXJyb2dhdGUodHlwZSwgbnVsbCk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdEJhY2tlci5HcmFwaCA9IEdyYXBoO1xuXHRcdFx0R3JhcGhzLnB1c2goR3JhcGgpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gR3JhcGg7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEV4dHJhY3QgZGF0YSBmcm9tIGN1cnJlbnQgdHlwZXMgb2YgQ29kZVxuXHRcdCAqIEBwYXJhbSBwYXR0ZXJuIERhdGEgTmFtZSBQYXR0ZXJuXG5cdFx0ICovXG5cdFx0ZXh0cmFjdERhdGEocGF0dGVybjogUmVnRXhwKVxuXHRcdHtcblx0XHRcdGNvbnN0IGRhdGFSb290cyA9IHRoaXMudHlwZXMuZmlsdGVyKHggPT4geC5jb250YWluZXIgPT09IG51bGwgJiYgcGF0dGVybi50ZXN0KHgubmFtZSkpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBkcmlsbCA9ICh4OiBUeXBlKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBhcnJheSA9IFt4XTtcblx0XHRcdFx0Zm9yIChjb25zdCB0eXBlIG9mIHguY29udGVudHMpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBjaGlsZCA9IGRyaWxsKHR5cGUpLmZsYXQoKTtcblx0XHRcdFx0XHRpZiAoY2hpbGQubGVuZ3RoKVxuXHRcdFx0XHRcdFx0YXJyYXkucHVzaCguLi5jaGlsZCk7XG5cdFx0XHRcdH0gXG5cdFx0XHRcdHJldHVybiBhcnJheTtcblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdGNvbnN0IGRhdGFTY2hlbWEgPSBkYXRhUm9vdHMubWFwKGRyaWxsKS5maWx0ZXIoeCA9PiBBcnJheS5pc0FycmF5KHgpID8geC5sZW5ndGggOiB0cnVlKTtcblx0XHRcdGNvbnN0IGRhdGFRdWVyeSA9IGRhdGFTY2hlbWEuZmxhdCgpO1xuXHRcdFx0Y29uc3QgY29kZVJvb3RzID0gdGhpcy50eXBlcy5maWx0ZXIoeCA9PiAhZGF0YVF1ZXJ5LmluY2x1ZGVzKHgpKTtcblx0XHRcdGNvbnN0IGNvZGUgPSBuZXcgQ29kZSgpO1xuXHRcdFx0Zm9yIChjb25zdCB0eXBlIG9mIGNvZGVSb290cylcblx0XHRcdFx0Y29kZS5hZGQodHlwZSk7XG5cdFx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCB0eXBlIG9mIGRhdGFRdWVyeSlcblx0XHRcdHtcdFx0XHRcblx0XHRcdFx0aWYgKCFjb2RlLnByb3RvdHlwZXMuc29tZSh4ID0+IHguaGFzaCA9PT0gdHlwZS5wcm90b3R5cGUuaGFzaCkpXG5cdFx0XHRcdFx0Y29kZS5wcm90b3R5cGVzLnB1c2godHlwZS5wcm90b3R5cGUpO1x0XG5cdFx0XHRcdHR5cGUudHJhbnNmZXIoY29kZSk7XG5cdFx0XHR9XG5cdFx0XG5cdFx0XHRjb25zdCBkYXRhID0gZGF0YVNjaGVtYS5tYXAoeCA9PiBbeC5tYXAoeCA9PiB4LnByb3RvdHlwZS5pZCksIHhbMF0ubmFtZSwgLi4ueC5tYXAoeCA9PiB4LmFsaWFzZXMpXSk7XG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0Y29kZSxcblx0XHRcdFx0ZGF0YVxuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHR0b0pTT04oKSB7IHJldHVybiBbdGhpcy5wcm90b3R5cGVzLCB0aGlzLnR5cGVzXTsgfVxuXHRcdHZhbHVlT2YoKSB7IHJldHVybiB0aGlzLnR5cGVzLmxlbmd0aDsgfVxuXHRcdFtTeW1ib2wudG9QcmltaXRpdmVdKCkgeyByZXR1cm4gdGhpcy50eXBlcy5sZW5ndGg7IH1cblx0XHRnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKSB7IHJldHVybiBcIkNvZGVcIjsgfVxuXHR9XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyLlRydXRoVGFsa1xue1xuXHQvKipcblx0ICogS2VlcHMgdHJhY2sgb2YgcG9zc2libGUgb3V0cHV0IG9mIHF1ZXJ5XG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQ3Vyc29yU2V0XG5cdHtcdFxuXHRcdGN1cnNvcnM6IFNldDxTdXJyb2dhdGU+O1xuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKC4uLmN1cnNvcnM6IFN1cnJvZ2F0ZVtdKVxuXHRcdHtcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQoY3Vyc29ycyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFNuYXBzaG90IG9mIGN1cnJlbnQgcG9zc2liaWxpdGllc1xuXHRcdCAqL1xuXHRcdHNuYXBzaG90KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmN1cnNvcnMpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDbG9uZXMgY3VycmVudCBzdGF0ZSBvZiBDdXJzb3JTZXRcblx0XHQgKi9cblx0XHRjbG9uZSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBDdXJzb3JTZXQoLi4udGhpcy5zbmFwc2hvdCgpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRmlsdGVycyBjdXJyZW50IHBvc3NpYmlsaXRpZXNcblx0XHQgKi9cblx0XHRmaWx0ZXIoZm46ICh2OiBTdXJyb2dhdGUpID0+IGJvb2xlYW4pXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkuZmlsdGVyKHggPT4gZm4oeCkpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRXhlY3V0ZXMgYSBUcnV0aCBUYWxrIHF1ZXJ5XG5cdFx0ICovXG5cdFx0cXVlcnkoYXN0OiBCcmFuY2ggfCBMZWFmKSBcblx0XHR7XG5cdFx0XHRpZiAoYXN0IGluc3RhbmNlb2YgQnJhbmNoKVxuXHRcdFx0XHR0aGlzLmJyYW5jaChhc3QpO1xuXHRcdFx0ZWxzZSBcblx0XHRcdFx0dGhpcy5sZWFmKGFzdCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEV4ZWN1dGVzIGEgVHJ1dGggVGFsayBicmFuY2hcblx0XHQgKi9cblx0XHRicmFuY2goYnJhbmNoOiBCcmFuY2gpIFxuXHRcdHtcblx0XHRcdHN3aXRjaCAoYnJhbmNoW29wXSlcblx0XHRcdHtcblx0XHRcdFx0Y2FzZSBCcmFuY2hPcC5pczpcblx0XHRcdFx0Y2FzZSBCcmFuY2hPcC5xdWVyeTpcblx0XHRcdFx0XHRmb3IgKGNvbnN0IHF1ZXJ5IG9mIGJyYW5jaC5jaGlsZHJlbilcblx0XHRcdFx0XHRcdHRoaXMucXVlcnkocXVlcnkpO1x0XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgQnJhbmNoT3Aubm90OiBcblx0XHRcdFx0XHR0aGlzLm5vdChicmFuY2gpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLm9yOlxuXHRcdFx0XHRcdHRoaXMub3IoYnJhbmNoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBCcmFuY2hPcC5oYXM6XG5cdFx0XHRcdFx0dGhpcy5jb250ZW50cygpO1xuXHRcdFx0XHRcdGZvciAoY29uc3QgcXVlcnkgb2YgYnJhbmNoLmNoaWxkcmVuKVxuXHRcdFx0XHRcdFx0dGhpcy5xdWVyeShxdWVyeSk7XG5cdFx0XHRcdFx0dGhpcy5jb250YWluZXJzKCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEV4ZWN1dGVzIGEgVHJ1dGggVGFsayBsZWFmXG5cdFx0ICovXG5cdFx0bGVhZihsZWFmOiBMZWFmKSBcblx0XHR7XG5cdFx0XHRzd2l0Y2ggKGxlYWZbb3BdKVxuXHRcdFx0e1xuXHRcdFx0XHRjYXNlIExlYWZPcC5zdXJyb2dhdGU6XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoeCA9PiB4W3R5cGVPZl0uaXMoKDxTdXJyb2dhdGU+bGVhZilbdHlwZU9mXSkgfHwgeFt0eXBlT2ZdLnBhcmFsbGVsUm9vdHMuaW5jbHVkZXMoKDxTdXJyb2dhdGU+bGVhZilbdHlwZU9mXSkpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5jb250ZW50czpcblx0XHRcdFx0XHR0aGlzLmNvbnRlbnRzKCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLnJvb3RzOlxuXHRcdFx0XHRcdHRoaXMucm9vdHMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3AuY29udGFpbmVyczpcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lcnMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3AuYWxpYXNlZDpcblx0XHRcdFx0XHR0aGlzLmZpbHRlcih4ID0+IHhbdmFsdWVdICE9PSBudWxsKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3AubGVhdmVzOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHggPT4geFt2YWx1ZV0gPT09IG51bGwpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5mcmVzaDpcblx0XHRcdFx0XHR0aGlzLmZpbHRlcih4ID0+IHhbdHlwZU9mXS5pc0ZyZXNoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBQcmVkaWNhdGVPcC5lcXVhbHM6XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoeCA9PiB4W3ZhbHVlXSA9PSAoPExlYXZlcy5QcmVkaWNhdGU+bGVhZikub3BlcmFuZCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgUHJlZGljYXRlT3AuZ3JlYXRlclRoYW46XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoeCA9PiAoeFt2YWx1ZV0gfHzCoDApID4gKDxMZWF2ZXMuUHJlZGljYXRlPmxlYWYpLm9wZXJhbmQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLmxlc3NUaGFuOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHggPT4gKHhbdmFsdWVdIHx8IDApIDwgKDxMZWF2ZXMuUHJlZGljYXRlPmxlYWYpLm9wZXJhbmQpO1xuXHRcdFx0XHRcdGJyZWFrO1x0XG5cdFx0XHRcdGNhc2UgUHJlZGljYXRlT3Auc3RhcnRzV2l0aDpcblx0XHRcdFx0XHR0aGlzLmZpbHRlcih4ID0+IHhbdmFsdWVdID09IG51bGwgPyBmYWxzZSA6IHhbdmFsdWVdIS50b1N0cmluZygpLnN0YXJ0c1dpdGgoPHN0cmluZz4oPExlYXZlcy5QcmVkaWNhdGU+bGVhZikub3BlcmFuZCkpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLmVuZHNXaXRoOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHggPT4geFt2YWx1ZV0gPT0gbnVsbCA/IGZhbHNlIDogeFt2YWx1ZV0hLnRvU3RyaW5nKCkuZW5kc1dpdGgoPHN0cmluZz4oPExlYXZlcy5QcmVkaWNhdGU+bGVhZikub3BlcmFuZCkpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5zbGljZTpcblx0XHRcdFx0XHR0aGlzLnNsaWNlKGxlYWYpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5vY2N1cmVuY2VzOlxuXHRcdFx0XHRcdHRoaXMub2NjdXJlbmNlcyhsZWFmKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3Auc29ydDogXG5cdFx0XHRcdFx0dGhpcy5zb3J0KGxlYWYpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5yZXZlcnNlOlxuXHRcdFx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQodGhpcy5zbmFwc2hvdCgpLnJldmVyc2UoKSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdvIG9uZSBsZXZlbCBuZXN0ZWQgaW5cblx0XHQgKi9cblx0XHRjb250ZW50cygpXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkuZmxhdE1hcCh4ID0+IHguY29udGVudHMpLmZpbHRlcigoeCk6IHggaXMgU3Vycm9nYXRlID0+ICEheCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHbyB0byB0b3AgbGV2ZWxcblx0XHQgKi9cblx0XHRyb290cygpXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkubWFwKCh4OiBTdXJyb2dhdGUgfMKgbnVsbCkgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdHdoaWxlICh4ICYmIHhbcGFyZW50XSkgXG5cdFx0XHRcdFx0XHR4ID0geFtwYXJlbnRdO1xuXHRcdFx0XHRcdHJldHVybiB4O1x0XHRcdFx0XG5cdFx0XHRcdH0pLmZpbHRlcigoeCk6IHggaXMgU3Vycm9nYXRlID0+ICEheCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHbyBvbmUgbGV2ZWwgbmVzdGVkIG91dFxuXHRcdCAqL1xuXHRcdGNvbnRhaW5lcnMoKVxuXHRcdHtcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQodGhpcy5zbmFwc2hvdCgpLm1hcCh4ID0+IHhbcGFyZW50XSkuZmlsdGVyKCh4KTogeCBpcyBTdXJyb2dhdGUgPT4gISF4KSk7XG5cdFx0fVxuXHRcblx0XHQvKiogKi9cblx0XHRub3QoYnJhbmNoOiBCcmFuY2gpXG5cdFx0e1xuXHRcdFx0Y29uc3QgaW5zdGFuY2UgPSB0aGlzLmNsb25lKCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHF1ZXJ5IG9mIGJyYW5jaC5jaGlsZHJlbilcblx0XHRcdFx0aW5zdGFuY2UucXVlcnkocXVlcnkpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBzbmFwID0gaW5zdGFuY2Uuc25hcHNob3QoKTtcblx0XHRcdHRoaXMuZmlsdGVyKHggPT4gIXNuYXAuaW5jbHVkZXMoeCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRvcihicmFuY2g6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRjb25zdCBpbnN0YW5jZXMgPSBbXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBxdWVyeSBvZiBicmFuY2guY2hpbGRyZW4pXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGluc3RhbmNlID0gdGhpcy5jbG9uZSgpO1x0XG5cdFx0XHRcdGluc3RhbmNlLnF1ZXJ5KHF1ZXJ5KTtcblx0XHRcdFx0aW5zdGFuY2VzLnB1c2goaW5zdGFuY2UpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRjb25zdCBzbmFwID0gaW5zdGFuY2VzLmZsYXQoKTtcblx0XHRcdHRoaXMuZmlsdGVyKHggPT4gc25hcC5pbmNsdWRlcyh4KSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHNsaWNlKGxlYWY6IExlYWYpXG5cdFx0e1xuXHRcdFx0bGV0IHtcblx0XHRcdFx0c3RhcnQsXG5cdFx0XHRcdGVuZFxuXHRcdFx0fcKgPSA8TGVhdmVzLlNsaWNlPmxlYWY7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHNuYXAgPSB0aGlzLnNuYXBzaG90KCk7XG5cdFx0XHRpZiAoZW5kICYmIGVuZCA8IDEpIGVuZCA9IHN0YXJ0ICsgTWF0aC5yb3VuZChlbmQgKiBzbmFwLmxlbmd0aCk7XG5cdFx0XHRcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQoc25hcC5zbGljZShzdGFydCwgZW5kKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdG9jY3VyZW5jZXMobGVhZjogTGVhZilcblx0XHR7XG5cdFx0XHRsZXQge1xuXHRcdFx0XHRtaW4sXG5cdFx0XHRcdG1heFxuXHRcdFx0fcKgPSA8TGVhdmVzLk9jY3VyZW5jZXM+bGVhZjtcblx0XHRcdFxuXHRcdFx0aWYgKCFtYXgpIG1heCA9IG1pbjtcblxuXHRcdFx0Y29uc3QgdmFsdWVNYXA6IFJlY29yZDxzdHJpbmcsIFN1cnJvZ2F0ZVtdPiA9IHt9O1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGl0ZW0gb2YgdGhpcy5jdXJzb3JzKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB2YWwgPSBKU09OLnN0cmluZ2lmeShpdGVtW3ZhbHVlXSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoIXZhbHVlTWFwLmhhc093blByb3BlcnR5KHZhbCkpXG5cdFx0XHRcdFx0dmFsdWVNYXBbdmFsXSA9IFtdO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHR2YWx1ZU1hcFt2YWxdLnB1c2goaXRlbSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQoT2JqZWN0LnZhbHVlcyh2YWx1ZU1hcCkuZmlsdGVyKHggPT4geC5sZW5ndGggPj0gbWluICYmIHgubGVuZ3RoIDw9IG1heCkuZmxhdCgpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aXMoc3Vycm9nYXRlOiBTdXJyb2dhdGUsIG5vdCA9IGZhbHNlKVxuXHRcdHtcblx0XHRcdGNvbnN0IGluc3RhbmNlID0gdGhpcy5jbG9uZSgpO1xuXHRcdFx0cmV0dXJuIGluc3RhbmNlLmZpbHRlcih4ID0+IFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgY29uZGl0aW9uID0geFt0eXBlT2ZdLmlzKHN1cnJvZ2F0ZVt0eXBlT2ZdKSB8fCB4W3R5cGVPZl0ucGFyYWxsZWxSb290cy5pbmNsdWRlcyhzdXJyb2dhdGVbdHlwZU9mXSk7XG5cdFx0XHRcdFx0cmV0dXJuIG5vdCA/ICFjb25kaXRpb24gOiBjb25kaXRpb247XG5cdFx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRzb3J0KGxlYWY6IExlYWYpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RydWN0cyA9ICg8U3RydWN0W10+KDxMZWF2ZXMuU29ydD5sZWFmKS5jb250ZW50VHlwZXMpLmZpbHRlcigoeCkgPT4gISF4KS5yZXZlcnNlKCk7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHNuYXAgPSB0aGlzLnNuYXBzaG90KCk7XG5cdFx0XHRmb3IgKGNvbnN0IHN0cnVjdCBvZiBzdHJ1Y3RzKVxuXHRcdFx0XHRzbmFwLnNvcnQoKGEsIGIpID0+IFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgcDEgPSBhLmdldChzdHJ1Y3QpO1xuXHRcdFx0XHRcdGNvbnN0IHAyID0gYi5nZXQoc3RydWN0KTtcblx0XHRcdFx0XHRjb25zdCB2MTogbnVtYmVyID0gcDEgPyA8YW55PnAxW3ZhbHVlXSB8fCAwOiAwO1xuXHRcdFx0XHRcdGNvbnN0IHYyOiBudW1iZXIgPSBwMiA/IDxhbnk+cDJbdmFsdWVdIHx8IDA6IDA7XG5cdFx0XHRcdFx0cmV0dXJuIHYxIC0gdjI7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KHNuYXApO1xuXHRcdH1cblx0XHRcblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlclxue1xuXHRcblx0ZXhwb3J0IHR5cGUgVHlwZWlzaCA9IFRydXRoLlR5cGUgfMKgVHlwZSB8IG51bWJlcjtcblx0XG5cdGV4cG9ydCBjbGFzcyBGdXR1cmVUeXBlXG5cdHtcblx0XHRzdGF0aWMgQ2FjaGUgPSBuZXcgTWFwPFR5cGVpc2gsIEZ1dHVyZVR5cGU+KCk7XG5cdFx0c3RhdGljIFR5cGVNYXAgPSBuZXcgTWFwPFRydXRoLlR5cGUsIFR5cGU+KCk7XG5cdFx0c3RhdGljIElkTWFwID0gbmV3IE1hcDxudW1iZXIsIFR5cGU+KCk7XG5cdFx0XG5cdFx0c3RhdGljIG5ldyh2YWx1ZTogVHlwZWlzaClcblx0XHR7XG5cdFx0XHRjb25zdCBjYWNoZWQgPSBGdXR1cmVUeXBlLkNhY2hlLmdldCh2YWx1ZSk7XG5cdFx0XHRcblx0XHRcdGlmIChjYWNoZWQpXG5cdFx0XHRcdHJldHVybiBjYWNoZWQ7XG5cdFx0XHRcdFxuXHRcdFx0Y29uc3QgaW5zdGFuY2UgPSBuZXcgRnV0dXJlVHlwZSh2YWx1ZSk7XG5cdFx0XHRGdXR1cmVUeXBlLkNhY2hlLnNldCh2YWx1ZSwgaW5zdGFuY2UpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gaW5zdGFuY2U7XG5cdFx0fSBcblx0XHRcblx0XHRjb25zdHJ1Y3Rvcihwcml2YXRlIHZhbHVlOiBUeXBlaXNoKSB7IH1cblx0XHQgXG5cdFx0Z2V0IHR5cGUoKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLnZhbHVlIGluc3RhbmNlb2YgVHJ1dGguVHlwZSlcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdHlwZSA9IEZ1dHVyZVR5cGUuVHlwZU1hcC5nZXQodGhpcy52YWx1ZSk7XG5cdFx0XHRcdGlmICghdHlwZSkgXG5cdFx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHRcdHJldHVybiB0eXBlO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRpZiAodGhpcy52YWx1ZSBpbnN0YW5jZW9mIFR5cGUpXG5cdFx0XHRcdHJldHVybiB0aGlzLnZhbHVlO1xuXHRcdFx0XHRcblx0XHRcdHJldHVybiBGdXR1cmVUeXBlLklkTWFwLmdldCh0aGlzLnZhbHVlKSB8fCBudWxsO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaWQoKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLnZhbHVlIGluc3RhbmNlb2YgVHJ1dGguVHlwZSlcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdHlwZSA9IEZ1dHVyZVR5cGUuVHlwZU1hcC5nZXQodGhpcy52YWx1ZSk7XG5cdFx0XHRcdGlmICghdHlwZSkgXG5cdFx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0XHRyZXR1cm4gdHlwZS5pZDtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMudmFsdWUgaW5zdGFuY2VvZiBUeXBlKVxuXHRcdFx0XHRyZXR1cm4gdGhpcy52YWx1ZS5pZDtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gdGhpcy52YWx1ZTtcblx0XHR9XG5cdFx0XG5cdFx0aXModHlwZTogVHlwZSlcblx0XHR7XG5cdFx0XHRjb25zdCB2YWx1ZVR5cGUgPSB0aGlzLnZhbHVlO1xuXHRcdFx0aWYgKCF2YWx1ZVR5cGUpIHJldHVybiBmYWxzZTtcblx0XHRcdHJldHVybiB2YWx1ZVR5cGUgPT09IHR5cGU7XHRcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKCkgeyByZXR1cm4gdGhpcy5pZDsgfVxuXHRcdHZhbHVlT2YoKSB7IHJldHVybiB0aGlzLmlkOyB9XG5cdFx0W1N5bWJvbC50b1ByaW1pdGl2ZV0oKSB7IHJldHVybiB0aGlzLmlkOyB9XG5cdFx0Z2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkgeyByZXR1cm4gXCJGdXR1cmVUeXBlXCI7IH1cblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlci5UcnV0aFRhbGtcbntcblx0ZXhwb3J0IGNvbnN0IG9wID0gU3ltYm9sKFwib3BcIik7XG5cdGV4cG9ydCBjb25zdCBjb250YWluZXIgPSBTeW1ib2woXCJjb250YWluZXJcIik7XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGVudW0gQnJhbmNoT3Bcblx0e1xuXHRcdHF1ZXJ5ID0gMSxcblx0XHRpcyA9IDIsXG5cdFx0aGFzID0gMyxcblx0XHRub3QgPSA0LFxuXHRcdG9yID0gNSxcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBlbnVtIFByZWRpY2F0ZU9wXG5cdHtcblx0XHRlcXVhbHMgPSAzMCxcblx0XHRncmVhdGVyVGhhbiA9IDMxLFxuXHRcdGdyZWF0ZXJUaGFuT3JFcXVhbHMgPSAzMixcblx0XHRsZXNzVGhhbiA9IDMzLFxuXHRcdGxlc3NUaGFuT3JFcXVhbHMgPSAzNCxcblx0XHRhbGlrZSA9IDM1LFxuXHRcdHN0YXJ0c1dpdGggPSAzNixcblx0XHRlbmRzV2l0aCAgPSAzNyxcblx0XHRpbmNsdWRlcyA9IDM4LFxuXHRcdG1hdGNoZXMgPSAzOVxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGVudW0gTGVhZk9wXG5cdHtcblx0XHRwcmVkaWNhdGUgPSA2MCxcblx0XHRzbGljZSA9IDYxLFxuXHRcdG9jY3VyZW5jZXMgPSA2Mixcblx0XHRhbGlhc2VkID0gNjMsXG5cdFx0dGVybWluYWxzID0gNjQsXG5cdFx0c29ydCA9IDY1LFxuXHRcdHJldmVyc2UgPSA2Nixcblx0XHRzdXJyb2dhdGUgPSA2Nyxcblx0XHRjb250YWluZXJzID0gNjgsXG5cdFx0cm9vdHMgPSA2OSxcblx0XHRjb250ZW50cyA9IDcwLFxuXHRcdGxlYXZlcyA9IDcxLFxuXHRcdGZyZXNoID0gNzJcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCB0eXBlIE5vZGVPcCA9XG5cdFx0QnJhbmNoT3AgfCBcblx0XHRMZWFmT3AgfFxuXHRcdFByZWRpY2F0ZU9wO1xuXHRcblx0Ly8jIEFic3RyYWN0IENsYXNzZXNcblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgYWJzdHJhY3QgY2xhc3MgTm9kZVxuXHR7XG5cdFx0YWJzdHJhY3QgcmVhZG9ubHkgW29wXTogTm9kZU9wO1xuXHRcdFxuXHRcdHJlYWRvbmx5IFtjb250YWluZXJdOiBCcmFuY2ggfCBudWxsID0gbnVsbDtcblx0XHRcblx0XHRzZXRDb250YWluZXIoY29udDogQnJhbmNoIHzCoG51bGwpXG5cdFx0e1xuXHRcdFx0Ly9AdHMtaWdub3JlXG5cdFx0XHR0aGlzW2NvbnRhaW5lcl0gPSBudWxsO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCcmFuY2ggZXh0ZW5kcyBOb2RlXG5cdHtcblx0XHQvKiogKi9cblx0XHRhZGRDaGlsZChjaGlsZDogTm9kZSwgcG9zaXRpb24gPSAtMSlcblx0XHR7XG5cdFx0XHRjaGlsZC5zZXRDb250YWluZXIodGhpcyk7XG5cdFx0XHRcblx0XHRcdGlmIChwb3NpdGlvbiA9PT0gLTEpXG5cdFx0XHRcdHJldHVybiB2b2lkIHRoaXMuX2NoaWxkcmVuLnB1c2goY2hpbGQpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBhdCA9IHRoaXMuX2NoaWxkcmVuLmxlbmd0aCAtIHBvc2l0aW9uICsgMTtcblx0XHRcdHRoaXMuX2NoaWxkcmVuLnNwbGljZShhdCwgMCwgY2hpbGQpO1xuXHRcdFx0cmV0dXJuIGNoaWxkO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRyZW1vdmVDaGlsZChjaGlsZDogTm9kZSk6IE5vZGUgfCBudWxsO1xuXHRcdHJlbW92ZUNoaWxkKGNoaWxkSWR4OiBudW1iZXIpIDogTm9kZXwgbnVsbDtcblx0XHRyZW1vdmVDaGlsZChwYXJhbTogTm9kZSB8IG51bWJlcilcblx0XHR7XG5cdFx0XHRjb25zdCBjaGlsZElkeCA9IHBhcmFtIGluc3RhbmNlb2YgTm9kZSA/XG5cdFx0XHRcdHRoaXMuX2NoaWxkcmVuLmluZGV4T2YocGFyYW0pIDpcblx0XHRcdFx0cGFyYW07XG5cdFx0XHRcblx0XHRcdGlmIChjaGlsZElkeCA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHJlbW92ZWQgPSB0aGlzLl9jaGlsZHJlbi5zcGxpY2UoY2hpbGRJZHgsIDEpWzBdO1xuXHRcdFx0XHRyZW1vdmVkLnNldENvbnRhaW5lcihudWxsKTtcblx0XHRcdFx0cmV0dXJuIHJlbW92ZWQ7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgY2hpbGRyZW4oKTogcmVhZG9ubHkgKEJyYW5jaCB8IExlYWYpW11cblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2hpbGRyZW47XG5cdFx0fVxuXHRcdHByaXZhdGUgcmVhZG9ubHkgX2NoaWxkcmVuOiAoQnJhbmNoIHwgTGVhZilbXSA9IFtdO1xuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGFic3RyYWN0IGNsYXNzIExlYWYgZXh0ZW5kcyBOb2RlIHsgfVxuXHRcblx0Ly8jIENvbmNyZXRlIENsYXNzZXNcblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgbmFtZXNwYWNlIEJyYW5jaGVzXG5cdHtcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgUXVlcnkgZXh0ZW5kcyBCcmFuY2hcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gQnJhbmNoT3AucXVlcnk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBJcyBleHRlbmRzIEJyYW5jaFxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBCcmFuY2hPcC5pcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIEhhcyBleHRlbmRzIEJyYW5jaFxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBCcmFuY2hPcC5oYXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBOb3QgZXh0ZW5kcyBCcmFuY2hcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gQnJhbmNoT3Aubm90O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgT3IgZXh0ZW5kcyBCcmFuY2hcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gQnJhbmNoT3Aub3I7XG5cdFx0fVxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IG5hbWVzcGFjZSBMZWF2ZXNcblx0e1xuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBQcmVkaWNhdGUgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXTogUHJlZGljYXRlT3A7XG5cdFx0XHRcblx0XHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0XHRvcHY6IFByZWRpY2F0ZU9wLFxuXHRcdFx0XHRyZWFkb25seSBvcGVyYW5kOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuKVxuXHRcdFx0e1xuXHRcdFx0XHRzdXBlcigpO1xuXHRcdFx0XHQvL0B0cy1pZ25vcmVcblx0XHRcdFx0dGhpc1tvcF0gPSBvcHY7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBTbGljZSBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdFx0cmVhZG9ubHkgc3RhcnQ6IG51bWJlciwgXG5cdFx0XHRcdHJlYWRvbmx5IGVuZD86IG51bWJlcilcblx0XHRcdHtcblx0XHRcdFx0c3VwZXIoKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5zbGljZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIE9jY3VyZW5jZXMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRcdHJlYWRvbmx5IG1pbjogbnVtYmVyLFxuXHRcdFx0XHRyZWFkb25seSBtYXg6IG51bWJlciA9IG1pbilcblx0XHRcdHtcblx0XHRcdFx0c3VwZXIoKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5vY2N1cmVuY2VzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgQWxpYXNlZCBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLmFsaWFzZWQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBMZWF2ZXMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5sZWF2ZXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBGcmVzaCBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLmZyZXNoO1xuXHRcdH1cblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgVGVybWluYWxzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AudGVybWluYWxzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgU29ydCBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRcblx0XHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0XHQuLi5jb250ZW50VHlwZXM6IE9iamVjdFtdKVxuXHRcdFx0e1xuXHRcdFx0XHRzdXBlcigpO1xuXHRcdFx0XHR0aGlzLmNvbnRlbnRUeXBlcyA9IGNvbnRlbnRUeXBlcztcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmVhZG9ubHkgY29udGVudFR5cGVzOiBPYmplY3RbXTtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3Auc29ydDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFJldmVyc2UgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5yZXZlcnNlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgU3Vycm9nYXRlIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3Auc3Vycm9nYXRlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgQ29udGFpbmVycyBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLmNvbnRhaW5lcnM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBSb290cyBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLnJvb3RzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgQ29udGVudHMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5jb250ZW50cztcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIEJhY2tlclxue1xuXHRleHBvcnQgdHlwZSBQcm90b3R5cGVKU09OID0gW251bWJlciwgbnVtYmVyLCAuLi5udW1iZXJbXVtdXTtcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBQcm90b3R5cGUgXG5cdHtcblx0XHRzdGF0aWMgbmV3KGNvZGU6IENvZGUsIHR5cGU6IFRydXRoLlR5cGUpXG5cdFx0e1xuXHRcdFx0Y29uc3QgZmxhZ3MgPSBuZXcgQml0ZmllbGRzKCk7XG5cdFx0XHRcblx0XHRcdGZsYWdzLnNldCgwLCB0eXBlLmlzQW5vbnltb3VzKTtcblx0XHRcdGZsYWdzLnNldCgxLCB0eXBlLmlzRnJlc2gpO1xuXHRcdFx0ZmxhZ3Muc2V0KDIsIHR5cGUuaXNMaXN0KTtcblx0XHRcdGZsYWdzLnNldCgzLCB0eXBlLmlzTGlzdEludHJpbnNpYyk7XG5cdFx0XHRmbGFncy5zZXQoNCwgdHlwZS5pc0xpc3RFeHRyaW5zaWMpO1xuXHRcdFx0ZmxhZ3Muc2V0KDUsIHR5cGUuaXNQYXR0ZXJuKTtcblx0XHRcdGZsYWdzLnNldCg2LCB0eXBlLmlzVXJpKTtcblx0XHRcdGZsYWdzLnNldCg3LCB0eXBlLmlzU3BlY2lmaWVkKTtcblx0XHRcdFxuXHRcdFx0bGV0IHByb3RvID0gbmV3IFByb3RvdHlwZShcblx0XHRcdFx0Y29kZSwgXG5cdFx0XHRcdGZsYWdzLFxuXHRcdFx0XHRuZXcgVHlwZVNldCh0eXBlLmJhc2VzLm1hcChGdXR1cmVUeXBlLm5ldykpLFxuXHRcdFx0XHRuZXcgVHlwZVNldCh0eXBlLnBhdHRlcm5zLm1hcChGdXR1cmVUeXBlLm5ldykpLFxuXHRcdFx0XHRuZXcgVHlwZVNldCh0eXBlLnBhcmFsbGVscy5tYXAoRnV0dXJlVHlwZS5uZXcpKSxcblx0XHRcdFx0bmV3IFR5cGVTZXQodHlwZS5jb250ZW50c0ludHJpbnNpYy5tYXAoRnV0dXJlVHlwZS5uZXcpKVxuXHRcdFx0KTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgZXggPSBjb2RlLnByb3RvdHlwZXMuZmluZCh4ID0+IHguaGFzaCA9PT0gcHJvdG8uaGFzaCk7XG5cdFx0XHRcblx0XHRcdGlmIChleCkgXG5cdFx0XHRcdHByb3RvID0gZXg7XG5cdFx0XHRcdFxuXHRcdFx0cmV0dXJuIHByb3RvO1xuXHRcdH1cblx0XG5cdFx0c3RhdGljIGxvYWQoY29kZTogQ29kZSwgc2VyaWFsaXplZDogUHJvdG90eXBlSlNPTilcblx0XHR7XG5cdFx0XHRjb25zdCBkYXRhID0gVXRpbC5kZWNvZGUoc2VyaWFsaXplZCwgNSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBuZXcgUHJvdG90eXBlKFxuXHRcdFx0XHRjb2RlLCBcblx0XHRcdFx0bmV3IEJpdGZpZWxkcyhkYXRhWzBdKSxcblx0XHRcdFx0VHlwZVNldC5mcm9tSlNPTihkYXRhWzFdKSxcblx0XHRcdFx0VHlwZVNldC5mcm9tSlNPTihkYXRhWzJdKSxcblx0XHRcdFx0VHlwZVNldC5mcm9tSlNPTihkYXRhWzNdKSxcblx0XHRcdFx0VHlwZVNldC5mcm9tSlNPTihkYXRhWzRdKVxuXHRcdFx0KTtcblx0XHR9XG5cdFx0XG5cdFx0XG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRwcml2YXRlIGNvZGU6IENvZGUsXG5cdFx0XHRwdWJsaWMgZmxhZ3M6IEJpdGZpZWxkcyxcblx0XHRcdFxuXHRcdFx0cHVibGljIGJhc2VzID0gbmV3IFR5cGVTZXQoKSxcblx0XHRcdHB1YmxpYyBwYXR0ZXJucyA9IG5ldyBUeXBlU2V0KCksXG5cdFx0XHRwdWJsaWMgcGFyYWxsZWxzID0gbmV3IFR5cGVTZXQoKSxcblx0XHRcdHB1YmxpYyBjb250ZW50c0ludHJpbnNpYyA9IG5ldyBUeXBlU2V0KCkpIHt9XG5cdFx0XHRcblx0XHRnZXQgaWQoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmNvZGUucHJvdG90eXBlcy5pbmRleE9mKHRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaGFzaCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFV0aWwuaGFzaChKU09OLnN0cmluZ2lmeSh0aGlzKSk7XG5cdFx0fVxuXHRcdFxuXHRcdHRyYW5zZmVyKGNvZGU6IENvZGUpXG5cdFx0e1xuXHRcdFx0dGhpcy5jb2RlID0gY29kZTtcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKClcblx0XHR7XHRcblx0XHRcdHJldHVybiBVdGlsLmVuY29kZShbXG5cdFx0XHRcdHRoaXMuZmxhZ3MsIHRoaXMuYmFzZXMsIHRoaXMucGF0dGVybnMsIHRoaXMucGFyYWxsZWxzLCB0aGlzLmNvbnRlbnRzSW50cmluc2ljXG5cdFx0XHRdKTtcblx0XHR9XHRcdFxuXHR9XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyLlRydXRoVGFsa1xue1xuXHRleHBvcnQgY2xhc3MgTGlicmFyeSBpbXBsZW1lbnRzIFJlZmxleC5Db3JlLklMaWJyYXJ5XG5cdHtcblx0XHQvKiogKi9cblx0XHRpc0tub3duTGVhZihsZWFmOiBhbnkpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGxlYWYgaW5zdGFuY2VvZiBOb2RlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRpc0tub3duQnJhbmNoKGJyYW5jaDogQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiBicmFuY2ggaW5zdGFuY2VvZiBOb2RlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRpc0JyYW5jaERpc3Bvc2VkKGJyYW5jaDogUmVmbGV4LkNvcmUuSUJyYW5jaClcblx0XHR7XG5cdFx0XHRyZXR1cm4gYnJhbmNoIGluc3RhbmNlb2YgQnJhbmNoICYmIGJyYW5jaFtjb250YWluZXJdICE9PSBudWxsO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXRTdGF0aWNCcmFuY2hlcygpXG5cdFx0e1xuXHRcdFx0Y29uc3QgYnJhbmNoZXM6IGFueSA9IHt9O1xuXHRcdFx0XG5cdFx0XHRPYmplY3QuZW50cmllcyhCcmFuY2hlcykuZm9yRWFjaCgoW2JyYW5jaE5hbWUsIGJyYW5jaEN0b3JdKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBuYW1lID0gYnJhbmNoTmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRicmFuY2hlc1tuYW1lXSA9ICgpID0+IG5ldyBicmFuY2hDdG9yKCk7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGJyYW5jaGVzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXRTdGF0aWNOb25CcmFuY2hlcygpXG5cdFx0e1xuXHRcdFx0Y29uc3QgbGVhdmVzOiBhbnkgPSB7fTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoTGVhdmVzKSlcblx0XHRcdFx0bGVhdmVzW2tleS50b0xvd2VyQ2FzZSgpXSA9IChhcmcxOiBQcmVkaWNhdGVPcCwgYXJnMjogbnVtYmVyKSA9PiBuZXcgdmFsdWUoYXJnMSwgYXJnMik7XG5cdFx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBrZXkgaW4gUHJlZGljYXRlT3ApXG5cdFx0XHRcdGlmIChpc05hTihwYXJzZUludChrZXkpKSlcblx0XHRcdFx0XHRsZWF2ZXNba2V5XSA9ICh2YWx1ZTogYW55KSA9PiBuZXcgTGVhdmVzLlByZWRpY2F0ZSgoPGFueT5QcmVkaWNhdGVPcClba2V5XSwgdmFsdWUpO1xuXHRcdFx0XHRcblx0XHRcdHJldHVybiBsZWF2ZXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldENoaWxkcmVuKHRhcmdldDogQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0YXJnZXQuY2hpbGRyZW47XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNyZWF0ZUNvbnRhaW5lcigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBCcmFuY2hlcy5RdWVyeSgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhdHRhY2hBdG9taWMoXG5cdFx0XHRhdG9taWM6IE5vZGUsXG5cdFx0XHRvd25lcjogQnJhbmNoLFxuXHRcdFx0cmVmOiBOb2RlIHwgXCJwcmVwZW5kXCIgfCBcImFwcGVuZFwiKVxuXHRcdHtcblx0XHRcdGlmICghKGF0b21pYyBpbnN0YW5jZW9mIE5vZGUpKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcblx0XHRcdGNvbnN0IHBvcyA9XG5cdFx0XHRcdHJlZiA9PT0gXCJhcHBlbmRcIiA/IC0xIDpcblx0XHRcdFx0cmVmID09PSBcInByZXBlbmRcIiA/IDAgOlxuXHRcdFx0XHQvLyBQbGFjZXMgdGhlIGl0ZW0gYXQgdGhlIGVuZCwgaW4gdGhlIGNhc2Ugd2hlbiBcblx0XHRcdFx0Ly8gcmVmIHdhc24ndCBmb3VuZCBpbiB0aGUgb3duZXIuIClUaGlzIHNob3VsZFxuXHRcdFx0XHQvLyBuZXZlciBhY3R1YWxseSBoYXBwZW4uKVxuXHRcdFx0XHRvd25lci5jaGlsZHJlbi5pbmRleE9mKHJlZikgKyAxIHx8IC0xO1xuXHRcdFx0XG5cdFx0XHRvd25lci5hZGRDaGlsZChhdG9taWMsIHBvcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGRldGFjaEF0b21pYyhhdG9taWM6IE5vZGUsIG93bmVyOiBCcmFuY2gpXG5cdFx0e1xuXHRcdFx0b3duZXIucmVtb3ZlQ2hpbGQoYXRvbWljKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c3dhcEJyYW5jaGVzKGJyYW5jaDE6IEJyYW5jaCwgYnJhbmNoMjogQnJhbmNoKVxuXHRcdHtcblx0XHRcdGlmIChicmFuY2gxW1RydXRoVGFsay5jb250YWluZXJdID09PSBudWxsIHx8IGJyYW5jaDJbVHJ1dGhUYWxrLmNvbnRhaW5lcl0gPT09IG51bGwpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBzd2FwIHRvcC1sZXZlbCBicmFuY2hlcy5cIik7XG5cdFx0XHRcblx0XHRcdGlmIChicmFuY2gxW1RydXRoVGFsay5jb250YWluZXJdICE9PSBicmFuY2gyW1RydXRoVGFsay5jb250YWluZXJdKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDYW4gb25seSBzd2FwIGJyYW5jaGVzIGZyb20gdGhlIHNhbWUgY29udGFpbmVyLlwiKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgY29udGFpbmVyID0gYnJhbmNoMVtUcnV0aFRhbGsuY29udGFpbmVyXSE7XG5cdFx0XHRjb25zdCBpZHgxID0gY29udGFpbmVyLmNoaWxkcmVuLmluZGV4T2YoYnJhbmNoMSk7XG5cdFx0XHRjb25zdCBpZHgyID0gY29udGFpbmVyLmNoaWxkcmVuLmluZGV4T2YoYnJhbmNoMik7XG5cdFx0XHRjb25zdCBpZHhNYXggPSBNYXRoLm1heChpZHgxLCBpZHgyKTtcblx0XHRcdGNvbnN0IGlkeE1pbiA9IE1hdGgubWluKGlkeDEsIGlkeDIpO1xuXHRcdFx0Y29uc3QgcmVtb3ZlZE1heCA9IGNvbnRhaW5lci5yZW1vdmVDaGlsZChpZHhNYXgpO1xuXHRcdFx0Y29uc3QgcmVtb3ZlZE1pbiA9IGNvbnRhaW5lci5yZW1vdmVDaGlsZChpZHhNaW4pO1xuXHRcdFx0XG5cdFx0XHRpZiAoIXJlbW92ZWRNYXggfHwgIXJlbW92ZWRNaW4pXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkludGVybmFsIEVycm9yLlwiKTtcblx0XHRcdFxuXHRcdFx0Y29udGFpbmVyLmFkZENoaWxkKHJlbW92ZWRNYXgsIGlkeE1pbik7XG5cdFx0XHRjb250YWluZXIuYWRkQ2hpbGQocmVtb3ZlZE1pbiwgaWR4TWF4KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVwbGFjZUJyYW5jaChicmFuY2gxOiBCcmFuY2gsIGJyYW5jaDI6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRpZiAoYnJhbmNoMVtUcnV0aFRhbGsuY29udGFpbmVyXSA9PT0gbnVsbClcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHJlcGxhY2UgdG9wLWxldmVsIGJyYW5jaGVzLlwiKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgY29udGFpbmVyID0gYnJhbmNoMVtUcnV0aFRhbGsuY29udGFpbmVyXSE7XG5cdFx0XHRjb25zdCBpZHggPSBjb250YWluZXIuY2hpbGRyZW4uaW5kZXhPZihicmFuY2gxKTtcblx0XHRcdGNvbnRhaW5lci5yZW1vdmVDaGlsZChpZHgpO1xuXHRcdFx0Y29udGFpbmVyLmFkZENoaWxkKGJyYW5jaDIsIGlkeCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGF0dGFjaEF0dHJpYnV0ZShicmFuY2g6IEJyYW5jaCwga2V5OiBzdHJpbmcsIHZhbHVlOiBhbnkpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IHN1cHBvcnRlZC5cIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGRldGFjaEF0dHJpYnV0ZShicmFuY2g6IEJyYW5jaCwga2V5OiBzdHJpbmcpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IHN1cHBvcnRlZC5cIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGF0dGFjaFJlY3VycmVudChcblx0XHRcdGtpbmQ6IFJlZmxleC5Db3JlLlJlY3VycmVudEtpbmQsXG5cdFx0XHR0YXJnZXQ6IFJlZmxleC5Db3JlLklCcmFuY2gsXG5cdFx0XHRzZWxlY3RvcjogYW55LFxuXHRcdFx0Y2FsbGJhY2s6IFJlZmxleC5Db3JlLlJlY3VycmVudENhbGxiYWNrLFxuXHRcdFx0cmVzdDogYW55W10pXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IHN1cHBvcnRlZC5cIik7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGRldGFjaFJlY3VycmVudChcblx0XHRcdHRhcmdldDogUmVmbGV4LkNvcmUuSUJyYW5jaCxcblx0XHRcdHNlbGVjdG9yOiBhbnksXG5cdFx0XHRjYWxsYmFjazogUmVmbGV4LkNvcmUuUmVjdXJyZW50Q2FsbGJhY2spXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IHN1cHBvcnRlZC5cIik7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59XG5cbi8qKlxuICogR2xvYmFsIGxpYnJhcnkgb2JqZWN0LlxuICovXG5jb25zdCB0dCA9IFJlZmxleC5Db3JlLmNyZWF0ZUNvbnRhaW5lck5hbWVzcGFjZTxCYWNrZXIuVHJ1dGhUYWxrLk5hbWVzcGFjZSwgQmFja2VyLlRydXRoVGFsay5MaWJyYXJ5Pihcblx0bmV3IEJhY2tlci5UcnV0aFRhbGsuTGlicmFyeSgpLFxuXHR0cnVlKTtcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJOb2Rlcy50c1wiLz5cblxubmFtZXNwYWNlIEJhY2tlclxue1xuXHRleHBvcnQgY29uc3QgdHlwZU9mID0gU3ltYm9sKFwidHlwZU9mXCIpO1xuXHRleHBvcnQgY29uc3QgdmFsdWUgPSBTeW1ib2woXCJ2YWx1ZVwiKTtcblx0ZXhwb3J0IGNvbnN0IHZhbHVlcyA9IFN5bWJvbChcInZhbHVlc1wiKTtcblx0ZXhwb3J0IGNvbnN0IHBhcmVudCA9IFN5bWJvbChcInBhcmVudFwiKTtcblx0XG5cdGV4cG9ydCBjbGFzcyBTdHJ1Y3QgZXh0ZW5kcyBUcnV0aFRhbGsuTGVhdmVzLlN1cnJvZ2F0ZVxuXHR7XG5cdFx0c3RhdGljIG5ldyh0eXBlOiBUeXBlLCBwYXJlbnRWYWx1ZTogU3RydWN0IHzCoFN1cnJvZ2F0ZSB8IG51bGwpXG5cdFx0e1xuXHRcdFx0Y29uc3QgY29uc3RyID0gcGFyZW50VmFsdWUgPyBcblx0XHRcdFx0cGFyZW50VmFsdWUgaW5zdGFuY2VvZiBTdXJyb2dhdGUgP1xuXHRcdFx0XHR0eXBlLmlzKFNjaGVtYS5vYmplY3RbdHlwZU9mXSkgPyBTdXJyb2dhdGUgOlxuXHRcdFx0XHR0eXBlLmlzKFNjaGVtYS5zdHJpbmdbdHlwZU9mXSkgPyBTdXJyb2dhdGVTdHJpbmcgOlxuXHRcdFx0XHR0eXBlLmlzKFNjaGVtYS5udW1iZXJbdHlwZU9mXSkgPyBTdXJyb2dhdGVOdW1iZXIgOlxuXHRcdFx0XHR0eXBlLmlzKFNjaGVtYS5iaWdpbnRbdHlwZU9mXSkgPyBTdXJyb2dhdGVCaWdJbnQgOlxuXHRcdFx0XHR0eXBlLmlzKFNjaGVtYS5ib29sZWFuW3R5cGVPZl0pID8gU3Vycm9nYXRlQm9vbGVhbiA6XG5cdFx0XHRcdFN1cnJvZ2F0ZSA6IFN0cnVjdCA6IFN0cnVjdDtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gbmV3IGNvbnN0cih0eXBlLCBwYXJlbnRWYWx1ZSk7XG5cdFx0fVxuXHRcdFxuXHRcdHJlYWRvbmx5IFt0eXBlT2ZdOiBUeXBlO1xuXHRcdHJlYWRvbmx5IFtwYXJlbnRdOiBTdHJ1Y3QgfCBudWxsO1xuXHRcdFxuXHRcdGdldCBbdmFsdWVzXSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXNbdHlwZU9mXS5hbGlhc2VzO1xuXHRcdH1cblx0XHRcblx0XHRjb25zdHJ1Y3Rvcih0eXBlOiBUeXBlLCBwYXJlbnRWYWx1ZTogU3RydWN0IHwgbnVsbClcblx0XHR7XG5cdFx0XHRzdXBlcigpO1xuXHRcdFx0dGhpc1t0eXBlT2ZdID0gdHlwZTtcblx0XHRcdHRoaXNbcGFyZW50XSA9IHBhcmVudFZhbHVlO1xuXHRcdFx0VXRpbC5zaGFkb3dzKHRoaXMsIGZhbHNlLCB0eXBlT2YsIHZhbHVlcywgVHJ1dGhUYWxrLm9wLCBwYXJlbnQsIFRydXRoVGFsay5jb250YWluZXIpO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGNoaWxkIG9mIHR5cGUuY29udGVudHMpXG5cdFx0XHRcdCg8YW55PnRoaXMpW2NoaWxkLm5hbWVdID0gU3RydWN0Lm5ldyhjaGlsZCwgdGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdGdldCBwcm94eSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMgYXMgdW5rbm93biBhcyBTdHJ1Y3QgJiBSZWNvcmQ8c3RyaW5nLCBTdHJ1Y3Q+O1xuXHRcdH1cblx0XHRcblx0XHRnZXQgY29udGVudHMoKTogU3RydWN0W11cblx0XHR7XG5cdFx0XHRyZXR1cm4gT2JqZWN0LnZhbHVlcyh0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IHJvb3QoKVxuXHRcdHtcblx0XHRcdGxldCByb290OiBTdHJ1Y3QgfMKgbnVsbCA9IHRoaXM7XG5cdFx0XHRcblx0XHRcdHdoaWxlIChyb290ICYmIHJvb3RbcGFyZW50XSkgXG5cdFx0XHRcdHJvb3QgPSByb290W3BhcmVudF07XG5cdFx0XHRcblx0XHRcdHJldHVybiByb290O1xuXHRcdH1cblx0XHRcblx0XHRpbnN0YW5jZW9mKGJhc2U6IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm7CoHRoaXNbdHlwZU9mXS5pcyhiYXNlKTsgXG5cdFx0fTtcblx0XHRcblx0XHRpcyhiYXNlOiBUeXBlIHwgU3RydWN0KVxuXHRcdHtcblx0XHRcdGJhc2UgPSBiYXNlIGluc3RhbmNlb2YgVHlwZSA/IGJhc2UgOiBiYXNlW3R5cGVPZl07XG5cdFx0XHRyZXR1cm4gdGhpc1t0eXBlT2ZdLmlzKGJhc2UpO1xuXHRcdH1cblx0XHRcblx0XHRbU3ltYm9sLmhhc0luc3RhbmNlXSh2YWx1ZTogYW55KVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmluc3RhbmNlb2YodmFsdWUpO1xuXHRcdH1cblx0XHRcblx0XHR0b0pTT04oKXsgcmV0dXJuIHRoaXNbdmFsdWVzXTsgfVxuXHRcdHZhbHVlT2YoKSB7IHJldHVybiB0aGlzW3ZhbHVlc107IH1cblx0XHR0b1N0cmluZygpIFxuXHRcdHtcblx0XHRcdGNvbnN0IHZhbCA9IHRoaXNbdmFsdWVzXTtcblx0XHRcdGlmICh2YWwgPT09IG51bGwpXG5cdFx0XHRcdHJldHVybiB2YWw7XG5cdFx0XHRcblx0XHRcdHJldHVybiBTdHJpbmcodmFsKTtcblx0XHR9XG5cdFx0W1N5bWJvbC50b1ByaW1pdGl2ZV0oKSB7IHJldHVybiB0aGlzW3ZhbHVlc107IH1cblx0XHRnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKSB7IHJldHVybiBcIlN0cnVjdFwiOyB9XG5cdH1cblx0XG5cdGV4cG9ydCBjbGFzcyBTdXJyb2dhdGU8VCA9IHN0cmluZz4gZXh0ZW5kcyBTdHJ1Y3Rcblx0e1xuXHRcdHJlYWRvbmx5IFtwYXJlbnRdOiBTdXJyb2dhdGUgfCBudWxsO1xuXHRcdFxuXHRcdGdldCBbdmFsdWVdKCkgOiBUIHzCoG51bGxcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpc1t0eXBlT2ZdLnZhbHVlIGFzIFQgfCBudWxsO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgY29udGVudHMoKTogU3Vycm9nYXRlW11cblx0XHR7XG5cdFx0XHRyZXR1cm4gT2JqZWN0LnZhbHVlcyh0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0KHR5cGU6IFN0cnVjdCk6IFN1cnJvZ2F0ZSB8wqBudWxsXG5cdFx0e1x0XHRcblx0XHRcdGNvbnN0IHJlY3Vyc2l2ZSA9IChvYmo6IFN1cnJvZ2F0ZSk6IFN1cnJvZ2F0ZSB8IG51bGwgPT4gXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChvYmpbdHlwZU9mXS5wYXJhbGxlbFJvb3RzLnNvbWUoeCA9PiB4ID09PSB0eXBlW3R5cGVPZl0pKVxuXHRcdFx0XHRcdHJldHVybiBvYmo7XG5cdFx0XHRcdFxuXHRcdFx0XHRmb3IgKGNvbnN0IGNoaWxkIG9mIG9iai5jb250ZW50cylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IHJlcyA9IHJlY3Vyc2l2ZShjaGlsZCk7XHRcblx0XHRcdFx0XHRpZiAocmVzKVxuXHRcdFx0XHRcdFx0cmV0dXJuIHJlcztcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gcmVjdXJzaXZlKDxhbnk+dGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdFxuXHRcdHRvSlNPTigpOiBhbnkgXG5cdFx0eyBcblx0XHRcdGlmICh0aGlzIGluc3RhbmNlb2YgU3Vycm9nYXRlICYmIHRoaXMuY29uc3RydWN0b3IgIT09IFN1cnJvZ2F0ZSlcblx0XHRcdFx0cmV0dXJuIHRoaXNbdmFsdWVdO1xuXHRcdFx0XHRcblx0XHRcdGNvbnN0IE9iajogUmVjb3JkPHN0cmluZyB8IHR5cGVvZiB2YWx1ZSwgU3Vycm9nYXRlIHwgVD4gJiB7ICQ6IGFueSB9ID0gPGFueT5PYmplY3QuYXNzaWduKHt9LCB0aGlzKTtcblx0XHRcdGlmICh0aGlzW3ZhbHVlXSAhPT0gbnVsbCAmJsKgdGhpc1t2YWx1ZV0gIT09IHVuZGVmaW5lZCApIFxuXHRcdFx0XHRPYmpbdmFsdWVdID0gdGhpc1t2YWx1ZV0hO1xuXHRcdFx0XHRcblx0XHRcdHJldHVybiBPYmo7IFxuXHRcdH1cblx0fVxuXHRcblx0ZXhwb3J0IGNsYXNzIFN1cnJvZ2F0ZVN0cmluZyBleHRlbmRzIFN1cnJvZ2F0ZTxzdHJpbmc+XG5cdHtcblx0XHRnZXQgW3ZhbHVlXSgpXG5cdFx0e1xuXHRcdFx0Y29uc3QgdmFsID0gdGhpc1t0eXBlT2ZdLnZhbHVlO1xuXHRcdFx0cmV0dXJuIHZhbCA/IEpTT04ucGFyc2UodmFsKSA6IG51bGw7XG5cdFx0fVxuXHR9XG5cdFxuXHRleHBvcnQgY2xhc3MgU3Vycm9nYXRlTnVtYmVyIGV4dGVuZHMgU3Vycm9nYXRlPG51bWJlcj5cblx0e1xuXHRcdGdldCBbdmFsdWVdKClcblx0XHR7XG5cdFx0XHRjb25zdCB2YWwgPSB0aGlzW3R5cGVPZl0udmFsdWU7XG5cdFx0XHRyZXR1cm4gdmFsID8gTnVtYmVyKHZhbCkgOiBudWxsO1xuXHRcdH1cblx0fVxuXHRleHBvcnQgY2xhc3MgU3Vycm9nYXRlQmlnSW50IGV4dGVuZHMgU3Vycm9nYXRlPEJpZ0ludD5cblx0e1xuXHRcdGdldCBbdmFsdWVdKClcblx0XHR7XG5cdFx0XHRjb25zdCB2YWwgPSB0aGlzW3R5cGVPZl0udmFsdWU7XG5cdFx0XHRyZXR1cm4gdmFsID8gQmlnSW50KHZhbCkgOiBudWxsO1xuXHRcdH1cblx0fVxuXHRleHBvcnQgY2xhc3MgU3Vycm9nYXRlQm9vbGVhbiBleHRlbmRzIFN1cnJvZ2F0ZVxuXHR7XG5cdFx0Z2V0IFt2YWx1ZV0oKVxuXHRcdHtcblx0XHRcdGNvbnN0IHZhbCA9IHRoaXNbdHlwZU9mXS52YWx1ZTtcblx0XHRcdHJldHVybiB2YWwgPyBKU09OLnBhcnNlKHZhbCkgOiBudWxsO1xuXHRcdH1cblx0fVxufVxuXG5kZWNsYXJlIGNvbnN0IGFueTogdHlwZW9mIEJhY2tlci5TdXJyb2dhdGU7XG5kZWNsYXJlIGNvbnN0IHN0cmluZzogdHlwZW9mIEJhY2tlci5TdXJyb2dhdGVTdHJpbmc7XG5kZWNsYXJlIGNvbnN0IG51bWJlcjogdHlwZW9mIEJhY2tlci5TdXJyb2dhdGVOdW1iZXI7XG5kZWNsYXJlIGNvbnN0IGJpZ2ludDogdHlwZW9mIEJhY2tlci5TdXJyb2dhdGVCaWdJbnQ7XG5kZWNsYXJlIGNvbnN0IGJvb2xlYW46IHR5cGVvZiBCYWNrZXIuU3Vycm9nYXRlQm9vbGVhbjtcbiIsIlxubmFtZXNwYWNlIEJhY2tlclxue1xuXHRleHBvcnQgdHlwZSBEYXRhSlNPTiA9IFtudW1iZXJbXSwgc3RyaW5nLCAuLi5zdHJpbmdbXVtdXTtcblx0ZXhwb3J0IHR5cGUgVHlwZUpTT04gPSBbbnVtYmVyLCBudW1iZXIgfCBudWxsLCBzdHJpbmcsIHN0cmluZ1tdXTtcblx0XG5cdGV4cG9ydCBjbGFzcyBUeXBlIFxuXHR7XG5cdFx0c3RhdGljIGxvYWQoY29kZTogQ29kZSwgZGF0YTogVHlwZUpTT04pXG5cdFx0e1xuXHRcdFx0Y29uc29sZS5sb2coZGF0YSk7XG5cdFx0XHRyZXR1cm4gbmV3IFR5cGUoXG5cdFx0XHRcdGNvZGUsIFxuXHRcdFx0XHRkYXRhWzJdLFxuXHRcdFx0XHRjb2RlLnByb3RvdHlwZXNbZGF0YVswXV0sXG5cdFx0XHRcdGRhdGFbMV0gPyBGdXR1cmVUeXBlLm5ldyhkYXRhWzFdKSA6IG51bGwsXG5cdFx0XHRcdGRhdGFbM11cblx0XHRcdCk7XG5cdFx0fVxuXHRcdFxuXHRcdHN0YXRpYyBuZXcoY29kZTogQ29kZSwgdHlwZTogVHJ1dGguVHlwZSlcblx0XHR7XHRcblx0XHRcdGNvbnN0IGluc3RhbmNlID0gbmV3IFR5cGUoXG5cdFx0XHRcdGNvZGUsIFxuXHRcdFx0XHR0eXBlLmlzUGF0dGVybiA/IHR5cGUubmFtZS5zdWJzdHIoOSkgOiB0eXBlLm5hbWUsIFxuXHRcdFx0XHRQcm90b3R5cGUubmV3KGNvZGUsIHR5cGUpLFxuXHRcdFx0XHR0eXBlLmNvbnRhaW5lciA/IEZ1dHVyZVR5cGUubmV3KHR5cGUuY29udGFpbmVyKSA6IG51bGwsXG5cdFx0XHRcdHR5cGUuYWxpYXNlcyBhcyBzdHJpbmdbXVxuXHRcdFx0KTtcblx0XHRcdFxuXHRcdFx0RnV0dXJlVHlwZS5UeXBlTWFwLnNldCh0eXBlLCBpbnN0YW5jZSk7XG5cdFx0XHRyZXR1cm4gaW5zdGFuY2U7XG5cdFx0fVxuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cHJpdmF0ZSBjb2RlOiBDb2RlLFxuXHRcdFx0cHVibGljIG5hbWU6IHN0cmluZyxcblx0XHRcdHB1YmxpYyBwcm90b3R5cGU6IFByb3RvdHlwZSxcblx0XHRcdHByaXZhdGUgX2NvbnRhaW5lcjogRnV0dXJlVHlwZSB8IG51bGwgPSBudWxsLFxuXHRcdFx0XG5cdFx0XHRwdWJsaWMgYWxpYXNlczogc3RyaW5nW10gPSBbXSkge31cblx0XHRcdFxuXHRcdGdldCBjb250YWluZXIoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLl9jb250YWluZXIgJiYgdGhpcy5fY29udGFpbmVyLnR5cGU7XG5cdFx0fVxuXHRcdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIHRoZSBhcnJheSBvZiB0eXBlcyB0aGF0IGFyZSBjb250YWluZWQgZGlyZWN0bHkgYnkgdGhpc1xuXHRcdCAqIG9uZS4gSW4gdGhlIGNhc2Ugd2hlbiB0aGlzIHR5cGUgaXMgYSBsaXN0IHR5cGUsIHRoaXMgYXJyYXkgZG9lc1xuXHRcdCAqIG5vdCBpbmNsdWRlIHRoZSBsaXN0J3MgaW50cmluc2ljIHR5cGVzLlxuXHRcdCAqL1xuXHRcdGdldCBjb250ZW50cygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuY29kZS50eXBlcy5maWx0ZXIoeCA9PiB4LmNvbnRhaW5lciA9PT0gdGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyBhIHJlZmVyZW5jZSB0byB0aGUgdHlwZSwgYXMgaXQncyBkZWZpbmVkIGluIGl0J3Ncblx0XHQgKiBuZXh0IG1vc3QgYXBwbGljYWJsZSB0eXBlLlxuXHRcdCAqL1xuXHRcdGdldCBwYXJhbGxlbHMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5wYXJhbGxlbHMuc25hcHNob3QoKVxuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgdGhlIGFycmF5IG9mIHR5cGVzIGZyb20gd2hpY2ggdGhpcyB0eXBlIGV4dGVuZHMuXG5cdFx0ICogSWYgdGhpcyBUeXBlIGV4dGVuZHMgZnJvbSBhIHBhdHRlcm4sIGl0IGlzIGluY2x1ZGVkIGluIHRoaXNcblx0XHQgKiBhcnJheS5cblx0XHQgKi9cblx0XHRnZXQgYmFzZXMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5iYXNlcy5zbmFwc2hvdCgpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHBhdHRlcm5zIHRoYXQgcmVzb2x2ZSB0byB0aGlzIHR5cGUuXG5cdFx0ICovXG5cdFx0Z2V0IHBhdHRlcm5zKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUucGF0dGVybnMuc25hcHNob3QoKTtcdFxuXHRcdH1cblx0XHRcblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHRoYXQgc2hhcmUgdGhlIHNhbWUgY29udGFpbmluZ1xuXHRcdCAqIHR5cGUgYXMgdGhpcyBvbmUuXG5cdFx0ICovXG5cdFx0Z2V0IGFkamFjZW50cygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuY29kZS50eXBlcy5maWx0ZXIoeCA9PiB4LmNvbnRhaW5lciAhPT0gdGhpcy5jb250YWluZXIgJiYgeCAhPT0gdGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdldHMgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdHlwZXMgdGhhdCBkZXJpdmUgZnJvbSB0aGUgXG5cdFx0ICogdGhpcyBUeXBlIGluc3RhbmNlLlxuXHRcdCAqIFxuXHRcdCAqIFRoZSB0eXBlcyB0aGF0IGRlcml2ZSBmcm9tIHRoaXMgb25lIGFzIGEgcmVzdWx0IG9mIHRoZSB1c2Ugb2Zcblx0XHQgKiBhbiBhbGlhcyBhcmUgZXhjbHVkZWQgZnJvbSB0aGlzIGFycmF5LlxuXHRcdCAqL1xuXHRcdGdldCBkZXJpdmF0aW9ucygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuY29kZS50eXBlcy5maWx0ZXIoeCA9PiB4LmJhc2VzLmluY2x1ZGVzKHRoaXMpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIGEgcmVmZXJlbmNlIHRvIHRoZSBwYXJhbGxlbCByb290cyBvZiB0aGlzIHR5cGUuXG5cdFx0ICogVGhlIHBhcmFsbGVsIHJvb3RzIGFyZSB0aGUgZW5kcG9pbnRzIGZvdW5kIHdoZW5cblx0XHQgKiB0cmF2ZXJzaW5nIHVwd2FyZCB0aHJvdWdoIHRoZSBwYXJhbGxlbCBncmFwaC5cblx0XHQgKi9cblx0XHRnZXQgcGFyYWxsZWxSb290cygpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgcm9vdHM6IFR5cGVbXSA9IFtdO1xuXHRcdFx0Zm9yIChjb25zdCB7IHR5cGUgfSBvZiB0aGlzLml0ZXJhdGUodCA9PiB0LnBhcmFsbGVscykpXG5cdFx0XHRcdGlmICh0eXBlICE9PSB0aGlzICYmIHR5cGUucGFyYWxsZWxzLmxlbmd0aCA9PT0gMClcblx0XHRcdFx0XHRyb290cy5wdXNoKHR5cGUpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gcm9vdHM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdldHMgdGhlIGZpcnN0IGFsaWFzIHN0b3JlZCBpbiB0aGUgLnZhbHVlcyBhcnJheSwgb3IgbnVsbCBpZiB0aGVcblx0XHQgKiB2YWx1ZXMgYXJyYXkgaXMgZW1wdHkuXG5cdFx0ICovXG5cdFx0Z2V0IHZhbHVlKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5hbGlhc2VzLmxlbmd0aCA+IDAgPyB0aGlzLmFsaWFzZXNbMF0gOiBudWxsO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaWQoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmNvZGUudHlwZXMuaW5kZXhPZih0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGlzQW5vbnltb3VzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDApO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaXNGcmVzaCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmZsYWdzLmdldCgxKTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IGlzTGlzdCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvdG90eXBlLmZsYWdzLmdldCgyKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIHdoZXRoZXIgdGhpcyB0eXBlIHJlcHJlc2VudHMgdGhlIGludHJpbnNpY1xuXHRcdCAqIHNpZGUgb2YgYSBsaXN0LlxuXHRcdCAqL1xuXHRcdGdldCBpc0xpc3RJbnRyaW5zaWMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5mbGFncy5nZXQoMyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyB3aGV0aGVyIHRoaXMgdHlwZSByZXByZXNlbnRzIHRoZSBleHRyaW5zaWNcblx0XHQgKiBzaWRlIG9mIGEgbGlzdC5cblx0XHQgKi9cblx0XHRnZXQgaXNMaXN0RXh0cmluc2ljKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDQpO1xuXHRcdH1cblx0XHRcblx0XHRcblx0XHRnZXQgaXNQYXR0ZXJuKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDUpO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgaXNVcmkoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnByb3RvdHlwZS5mbGFncy5nZXQoNik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyBhIHZhbHVlIHRoYXQgaW5kaWNhdGVzIGlmIHRoaXMgVHlwZSB3YXMgZGlyZWN0bHkgc3BlY2lmaWVkXG5cdFx0ICogaW4gdGhlIGRvY3VtZW50LCBvciBpZiBpdCdzIGV4aXN0ZW5jZSB3YXMgaW5mZXJyZWQuXG5cdFx0ICovXG5cdFx0Z2V0IGlzU3BlY2lmaWVkKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wcm90b3R5cGUuZmxhZ3MuZ2V0KDcpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgaXNPdmVycmlkZSgpIHsgcmV0dXJuIHRoaXMucGFyYWxsZWxzLmxlbmd0aCA+IDA7IH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgaXNJbnRyb2R1Y3Rpb24oKSB7IHJldHVybiB0aGlzLnBhcmFsbGVscy5sZW5ndGggPT09IDA7IH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIGEgYm9vbGVhbiB2YWx1ZSB0aGF0IGluZGljYXRlcyB3aGV0aGVyIHRoaXMgVHlwZVxuXHRcdCAqIGluc3RhbmNlIHdhcyBjcmVhdGVkIGZyb20gYSBwcmV2aW91cyBlZGl0IGZyYW1lLCBhbmRcblx0XHQgKiBzaG91bGQgbm8gbG9uZ2VyIGJlIHVzZWQuXG5cdFx0ICovXG5cdFx0Z2V0IGlzRGlydHkoKVxuXHRcdHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUGVyZm9ybXMgYW4gYXJiaXRyYXJ5IHJlY3Vyc2l2ZSwgYnJlYWR0aC1maXJzdCB0cmF2ZXJzYWxcblx0XHQgKiB0aGF0IGJlZ2lucyBhdCB0aGlzIFR5cGUgaW5zdGFuY2UuIEVuc3VyZXMgdGhhdCBubyB0eXBlc1xuXHRcdCAqIHR5cGVzIGFyZSB5aWVsZGVkIG11bHRpcGxlIHRpbWVzLlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSBuZXh0Rm4gQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSB0eXBlLCBvciBhblxuXHRcdCAqIGl0ZXJhYmxlIG9mIHR5cGVzIHRoYXQgYXJlIHRvIGJlIHZpc2l0ZWQgbmV4dC5cblx0XHQgKiBAcGFyYW0gcmV2ZXJzZSBBbiBvcHRpb25hbCBib29sZWFuIHZhbHVlIHRoYXQgaW5kaWNhdGVzXG5cdFx0ICogd2hldGhlciB0eXBlcyBpbiB0aGUgcmV0dXJuZWQgYXJyYXkgc2hvdWxkIGJlIHNvcnRlZFxuXHRcdCAqIHdpdGggdGhlIG1vc3QgZGVlcGx5IHZpc2l0ZWQgbm9kZXMgb2NjdXJpbmcgZmlyc3QuXG5cdFx0ICogXG5cdFx0ICogQHJldHVybnMgQW4gYXJyYXkgdGhhdCBzdG9yZXMgdGhlIGxpc3Qgb2YgdHlwZXMgdGhhdCB3ZXJlXG5cdFx0ICogdmlzaXRlZC5cblx0XHQgKi9cblx0XHR2aXNpdChuZXh0Rm46ICh0eXBlOiBUeXBlKSA9PiBJdGVyYWJsZTxUeXBlIHwgbnVsbD4gfCBUeXBlIHwgbnVsbCwgcmV2ZXJzZT86IGJvb2xlYW4pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIEFycmF5LmZyb20odGhpcy5pdGVyYXRlKG5leHRGbiwgcmV2ZXJzZSkpLm1hcChlbnRyeSA9PiBlbnRyeS50eXBlKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUGVyZm9ybXMgYW4gYXJiaXRyYXJ5IHJlY3Vyc2l2ZSwgYnJlYWR0aC1maXJzdCBpdGVyYXRpb25cblx0XHQgKiB0aGF0IGJlZ2lucyBhdCB0aGlzIFR5cGUgaW5zdGFuY2UuIEVuc3VyZXMgdGhhdCBubyB0eXBlc1xuXHRcdCAqIHR5cGVzIGFyZSB5aWVsZGVkIG11bHRpcGxlIHRpbWVzLlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSBuZXh0Rm4gQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSB0eXBlLCBvciBhbiBpdGVyYWJsZVxuXHRcdCAqIG9mIHR5cGVzIHRoYXQgYXJlIHRvIGJlIHZpc2l0ZWQgbmV4dC5cblx0XHQgKiBAcGFyYW0gcmV2ZXJzZSBBbiBvcHRpb25hbCBib29sZWFuIHZhbHVlIHRoYXQgaW5kaWNhdGVzXG5cdFx0ICogd2hldGhlciB0aGUgaXRlcmF0b3Igc2hvdWxkIHlpZWxkIHR5cGVzIHN0YXJ0aW5nIHdpdGggdGhlXG5cdFx0ICogbW9zdCBkZWVwbHkgbmVzdGVkIHR5cGVzIGZpcnN0LlxuXHRcdCAqIFxuXHRcdCAqIEB5aWVsZHMgQW4gb2JqZWN0IHRoYXQgY29udGFpbnMgYSBgdHlwZWAgcHJvcGVydHkgdGhhdCBpcyB0aGVcblx0XHQgKiB0aGUgVHlwZSBiZWluZyB2aXNpdGVkLCBhbmQgYSBgdmlhYCBwcm9wZXJ0eSB0aGF0IGlzIHRoZSBUeXBlXG5cdFx0ICogdGhhdCB3YXMgcmV0dXJuZWQgaW4gdGhlIHByZXZpb3VzIGNhbGwgdG8gYG5leHRGbmAuXG5cdFx0ICovXG5cdFx0Kml0ZXJhdGUobmV4dEZuOiAodHlwZTogVHlwZSkgPT4gSXRlcmFibGU8VHlwZSB8IG51bGw+IHwgVHlwZSB8IG51bGwsIHJldmVyc2U/OiBib29sZWFuKVxuXHRcdHtcblx0XHRcdGNvbnN0IHlpZWxkZWQ6IFR5cGVbXSA9IFtdO1xuXHRcdFx0XG5cdFx0XHR0eXBlIFJlY3Vyc2VUeXBlID0gSXRlcmFibGVJdGVyYXRvcjx7IHR5cGU6IFR5cGU7IHZpYTogVHlwZSB8IG51bGwgfT47XG5cdFx0XHRmdW5jdGlvbiAqcmVjdXJzZSh0eXBlOiBUeXBlLCB2aWE6IFR5cGUgfCBudWxsKTogUmVjdXJzZVR5cGVcblx0XHRcdHtcblx0XHRcdFx0aWYgKHlpZWxkZWQuaW5jbHVkZXModHlwZSkpXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKCFyZXZlcnNlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0eWllbGRlZC5wdXNoKHR5cGUpO1xuXHRcdFx0XHRcdHlpZWxkIHsgdHlwZSwgdmlhIH07XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IHJlZHVjZWQgPSBuZXh0Rm4odHlwZSk7XG5cdFx0XHRcdGlmIChyZWR1Y2VkICE9PSBudWxsICYmIHJlZHVjZWQgIT09IHVuZGVmaW5lZClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChyZWR1Y2VkIGluc3RhbmNlb2YgVHlwZSlcblx0XHRcdFx0XHRcdHJldHVybiB5aWVsZCAqcmVjdXJzZShyZWR1Y2VkLCB0eXBlKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRmb3IgKGNvbnN0IG5leHRUeXBlIG9mIHJlZHVjZWQpXG5cdFx0XHRcdFx0XHRpZiAobmV4dFR5cGUgaW5zdGFuY2VvZiBUeXBlKVxuXHRcdFx0XHRcdFx0XHR5aWVsZCAqcmVjdXJzZShuZXh0VHlwZSwgdHlwZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGlmIChyZXZlcnNlKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0eWllbGRlZC5wdXNoKHR5cGUpO1xuXHRcdFx0XHRcdHlpZWxkIHsgdHlwZSwgdmlhIH07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0eWllbGQgKnJlY3Vyc2UodGhpcywgbnVsbCk7XG5cdFx0fVxuXHRcblx0XHQvKipcblx0XHQgKiBRdWVyaWVzIGZvciBhIFR5cGUgdGhhdCBpcyBuZXN0ZWQgdW5kZXJuZWF0aCB0aGlzIFR5cGUsXG5cdFx0ICogYXQgdGhlIHNwZWNpZmllZCB0eXBlIHBhdGguXG5cdFx0ICovXG5cdFx0cXVlcnkoLi4udHlwZVBhdGg6IHN0cmluZ1tdKVxuXHRcdHtcblx0XHRcdGxldCBjdXJyZW50VHlwZTogVHlwZSB8IG51bGwgPSBudWxsO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHR5cGVOYW1lIG9mIHR5cGVQYXRoKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBuZXh0VHlwZSA9IHRoaXMuY29udGVudHMuZmluZCh0eXBlID0+IHR5cGUubmFtZSA9PT0gdHlwZU5hbWUpO1xuXHRcdFx0XHRpZiAoIW5leHRUeXBlKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0Y3VycmVudFR5cGUgPSBuZXh0VHlwZTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIGN1cnJlbnRUeXBlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDaGVja3Mgd2hldGhlciB0aGlzIFR5cGUgaGFzIHRoZSBzcGVjaWZpZWQgdHlwZVxuXHRcdCAqIHNvbWV3aGVyZSBpbiBpdCdzIGJhc2UgZ3JhcGguXG5cdFx0ICovXG5cdFx0aXMoYmFzZVR5cGU6IFR5cGUpXG5cdFx0e1xuXHRcdFx0Zm9yIChjb25zdCB7IHR5cGUgfSBvZiB0aGlzLml0ZXJhdGUodCA9PiB0LmJhc2VzKSlcblx0XHRcdFx0aWYgKHR5cGUgPT09IGJhc2VUeXBlKVxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENoZWNrcyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgdHlwZSBpcyBpbiB0aGlzIFR5cGUnc1xuXHRcdCAqIGAuY29udGVudHNgIHByb3BlcnR5LCBlaXRoZXIgZGlyZWN0bHksIG9yIGluZGlyZWN0bHkgdmlhXG5cdFx0ICogdGhlIHBhcmFsbGVsIGdyYXBocyBvZiB0aGUgYC5jb250ZW50c2AgVHlwZXMuXG5cdFx0ICovXG5cdFx0aGFzKHR5cGU6IFR5cGUpXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMuY29udGVudHMuaW5jbHVkZXModHlwZSkpXG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGNvbnRhaW5lZFR5cGUgb2YgdGhpcy5jb250ZW50cylcblx0XHRcdFx0aWYgKHR5cGUubmFtZSA9PT0gY29udGFpbmVkVHlwZS5uYW1lKVxuXHRcdFx0XHRcdGZvciAoY29uc3QgcGFyYWxsZWwgb2YgY29udGFpbmVkVHlwZS5pdGVyYXRlKHQgPT4gdC5wYXJhbGxlbHMpKVxuXHRcdFx0XHRcdFx0aWYgKHBhcmFsbGVsLnR5cGUgPT09IHR5cGUpXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdHRyYW5zZmVyKGNvZGU6IENvZGUpXG5cdFx0e1xuXHRcdFx0dGhpcy5jb2RlID0gY29kZTtcblx0XHRcdHRoaXMucHJvdG90eXBlLnRyYW5zZmVyKGNvZGUpO1xuXHRcdH1cblx0XHRcblx0XHR0b0pTT04oKVxuXHRcdHtcdFxuXHRcdFx0cmV0dXJuIFt0aGlzLnByb3RvdHlwZS5pZCwgdGhpcy5jb250YWluZXIgJiYgdGhpcy5jb250YWluZXIuaWQsIHRoaXMubmFtZSwgdGhpcy5hbGlhc2VzXTtcblx0XHR9XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXJcbntcblx0ZXhwb3J0IGNsYXNzIFR5cGVTZXQgZXh0ZW5kcyBTZXQ8RnV0dXJlVHlwZT5cblx0e1xuXHRcdHN0YXRpYyBmcm9tSlNPTihkYXRhOiBudW1iZXJbXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFR5cGVTZXQoZGF0YS5tYXAoeCA9PiBGdXR1cmVUeXBlLm5ldyh4KSkpO1xuXHRcdH1cblx0XHRcblx0XHRzbmFwc2hvdCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudG9BcnJheSgpLm1hcCh4ID0+IHgudHlwZSkuZmlsdGVyKHggPT4geCkgYXMgVHlwZVtdO1xuXHRcdH1cblx0XHRcblx0XHR0b0FycmF5KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gQXJyYXkuZnJvbSh0aGlzLnZhbHVlcygpKS5zb3J0KCk7XHRcblx0XHR9XG5cdFx0XG5cdFx0dG9KU09OKCkgeyByZXR1cm4gdGhpcy50b0FycmF5KCk7IH1cblx0XHR2YWx1ZU9mKCkgeyByZXR1cm4gdGhpcy50b0FycmF5KCk7IH1cblx0XHRbU3ltYm9sLnRvUHJpbWl0aXZlXSgpIHsgcmV0dXJuIHRoaXMudG9BcnJheSgpOyB9XG5cdFx0Z2V0IFtTeW1ib2wudG9TdHJpbmdUYWddKCkgeyByZXR1cm4gXCJUeXBlU2V0XCI7IH1cblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlci5VdGlsXG57XG5cdC8qKlxuXHQgKiBIYXNoIGNhbGN1bGF0aW9uIGZ1bmN0aW9uIGFkYXB0ZWQgZnJvbTpcblx0ICogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzUyMTcxNDgwLzEzMzczN1xuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGhhc2godmFsdWU6IHN0cmluZywgc2VlZCA9IDApXG5cdHtcblx0XHRsZXQgaDEgPSAweERFQURCRUVGIF4gc2VlZDtcblx0XHRsZXQgaDIgPSAwWDQxQzZDRTU3IF4gc2VlZDtcblx0XHRcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKVxuXHRcdHtcblx0XHRcdGxldCBjaCA9IHZhbHVlLmNoYXJDb2RlQXQoaSk7XG5cdFx0XHRoMSA9IE1hdGguaW11bChoMSBeIGNoLCAyNjU0NDM1NzYxKTtcblx0XHRcdGgyID0gTWF0aC5pbXVsKGgyIF4gY2gsIDE1OTczMzQ2NzcpO1xuXHRcdH1cblx0XHRcblx0XHRoMSA9IE1hdGguaW11bChoMSBeIGgxID4+PiAxNiwgMjI0NjgyMjUwNykgXiBNYXRoLmltdWwoaDIgXiBoMiA+Pj4gMTMsIDMyNjY0ODk5MDkpO1xuXHRcdGgyID0gTWF0aC5pbXVsKGgyIF4gaDIgPj4+IDE2LCAyMjQ2ODIyNTA3KSBeIE1hdGguaW11bChoMSBeIGgxID4+PiAxMywgMzI2NjQ4OTkwOSk7XG5cdFx0cmV0dXJuIDQyOTQ5NjcyOTYgKiAoMjA5NzE1MSAmIGgyKSArIChoMSA+Pj4gMCk7XG5cdH1cblx0XG5cdGV4cG9ydCBmdW5jdGlvbiBlbmNvZGUoZGF0YTogYW55W10pXG5cdHtcblx0XHRjb25zdCBiZiA9IG5ldyBCaXRmaWVsZHMoKTtcblx0XHRjb25zdCByZXN1bHQgPSBbXTtcblx0XHRcblx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGRhdGEubGVuZ3RoOylcblx0XHR7XG5cdFx0XHRjb25zdCB2cCA9IGRhdGFbaV07XG5cdFx0XHRjb25zdCB2YWx1ZSA9IHZwICYmIHR5cGVvZiB2cCA9PT0gXCJvYmplY3RcIiAmJiBcInRvSlNPTlwiIGluIHZwID8gdnAudG9KU09OKCkgOiB2cDtcdFxuXHRcdFx0Y29uc3QgYml0ID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwO1xuXHRcdFx0YmYuc2V0KGksIGJpdCA/IGZhbHNlIDogdHJ1ZSk7XG5cdFx0XHQgXG5cdFx0XHRpZiAoIWJpdCkgXG5cdFx0XHRcdHJlc3VsdC5wdXNoKHZhbHVlKTtcblx0XHR9XG5cdFx0XG5cdFx0cmVzdWx0LnVuc2hpZnQoYmYpO1xuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblx0XG5cdGV4cG9ydCBmdW5jdGlvbiBkZWNvZGUoZGF0YTogW251bWJlciwgLi4uYW55W11dLCBsZW5ndGg/OiBudW1iZXIpXG5cdHtcblx0XHRjb25zdCBiZiA9IG5ldyBCaXRmaWVsZHMoZGF0YS5zaGlmdCgpKTtcblx0XHRcblx0XHRpZiAoIWxlbmd0aCB8fMKgbGVuZ3RoIDwgMSkgXG5cdFx0XHRsZW5ndGggPSBiZi5zaXplO1xuXHRcdFx0XG5cdFx0Y29uc3QgcmVzdWx0ID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cdFx0XG5cdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCBsZW5ndGg7KVxuXHRcdHtcblx0XHRcdGNvbnN0IGJpdCA9IGJmLmdldChpKTtcblx0XHRcdGlmIChiaXQpXG5cdFx0XHRcdHJlc3VsdFtpXSA9IGRhdGEuc2hpZnQoKTtcblx0XHRcdGVsc2UgXG5cdFx0XHRcdHJlc3VsdFtpXSA9IFtdO1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cdFxuXHRleHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hKU09OKHVybDogc3RyaW5nKVxuXHR7XG5cdFx0aWYgKGdsb2JhbFRoaXMgJiYgXCJmZXRjaFwiIGluIGdsb2JhbFRoaXMpIFxuXHRcdHtcblx0XHRcdGNvbnN0IHJlcXVlc3QgPSBhd2FpdCAoPGFueT5nbG9iYWxUaGlzKS5mZXRjaCh1cmwpO1xuXHRcdFx0cmV0dXJuIGF3YWl0IHJlcXVlc3QuanNvbigpO1xuXHRcdH1cblx0XHRcblx0XHR0aHJvdyBcIlRoaXMgcGxhdGZvcm0gaXMgbm90IHN1cHBvcnRlZCFcIjtcblx0fVxuXHRcblx0ZXhwb3J0IGZ1bmN0aW9uIHNoYWRvdyhvYmplY3Q6IG9iamVjdCwga2V5OiBzdHJpbmcgfCBzeW1ib2wsIGVudW1lcmFibGUgPSBmYWxzZSlcblx0e1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIGtleSwge1xuXHRcdFx0ZW51bWVyYWJsZTogZW51bWVyYWJsZVxuXHRcdH0pO1xuXHR9XG5cdFxuXHRleHBvcnQgZnVuY3Rpb24gc2hhZG93cyhvYmplY3Q6IG9iamVjdCwgZW51bWVyYWJsZSA9IGZhbHNlLCAuLi5rZXlzOiBBcnJheTxzdHJpbmcgfMKgc3ltYm9sPilcblx0e1xuXHRcdGZvciAobGV0IGtleSBvZiBrZXlzKVxuXHRcdFx0c2hhZG93KG9iamVjdCwga2V5LCBlbnVtZXJhYmxlKTtcblx0fVxufSJdfQ==