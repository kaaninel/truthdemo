"use strict";
var Backer;
(function (Backer) {
    var TruthTalk;
    (function (TruthTalk) {
        /**
         *
         */
        function execute(ast) {
            const cursors = new CursorSet(...Object.values(Backer.Graph));
            cursors.query(ast);
            return cursors.snapshot();
        }
        TruthTalk.execute = execute;
        /**
         * Keeps track of possible output of query
         */
        class CursorSet {
            /** */
            constructor(...cursors) {
                this.cursors = new Set(cursors);
            }
            /** */
            static new() {
                return new CursorSet(...Object.values(Backer.Graph));
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
                this.cursors = new Set(this.snapshot()
                    .filter(filter)
                    .flatMap(map)
                    .filter(cursor => !!cursor));
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
                this.cursors = new Set(this.snapshot().filter(cursor => fn(cursor)));
            }
            /**
             * Filters current possibilities
             */
            filterSurrogate(fn) {
                this.cursors = new Set(this.snapshot()
                    .filter((v) => v instanceof Backer.Surrogate && fn(v)));
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
                        const surrogateLeaf = leaf;
                        this.filterSurrogate(sur => {
                            if (sur[Backer.typeOf].is(surrogateLeaf[Backer.typeOf]))
                                return true;
                            if (sur[Backer.typeOf].parallelRoots.includes(surrogateLeaf[Backer.typeOf]))
                                return true;
                            return false;
                        });
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
                        this.filter(sur => sur[Backer.value] !== null);
                        break;
                    case TruthTalk.LeafOp.leaves:
                        this.filter(sur => sur[Backer.value] === null);
                        break;
                    case TruthTalk.LeafOp.fresh:
                        this.filterSurrogate(sur => sur[Backer.typeOf].isFresh);
                        break;
                    case TruthTalk.PredicateOp.equals:
                        this.equals(leaf);
                        break;
                    case TruthTalk.PredicateOp.greaterThan:
                        this.filter(sur => (sur[Backer.value] || 0) > leaf.operand);
                        break;
                    case TruthTalk.PredicateOp.lessThan:
                        this.filter(sur => (sur[Backer.value] || 0) < leaf.operand);
                        break;
                    case TruthTalk.PredicateOp.startsWith:
                        this.filter(sur => sur[Backer.value] == null ?
                            false :
                            sur[Backer.value].toString().startsWith(leaf.operand));
                        break;
                    case TruthTalk.PredicateOp.endsWith:
                        this.filter(sur => sur[Backer.value] == null ?
                            false :
                            sur[Backer.value].toString().endsWith(leaf.operand));
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
            /**
             *
             */
            equals(leaf) {
                this.filter(sur => sur[Backer.sum] === null ?
                    false :
                    sur[Backer.sum] == (leaf).operand);
            }
            /**
             *
             */
            names() {
                this.map(v => v instanceof Backer.Struct, cursor => cursor[Backer.name]);
            }
            /**
             * Extends all cursors to include their direct contents.
             */
            contents() {
                this.map(surrogateFilterFn, cursor => cursor.contents);
            }
            /**
             * Retracts all cursors to their top-level ancestors.
             */
            roots() {
                const newCursors = this.snapshot()
                    .map((cursor) => {
                    while (cursor && cursor[Backer.parent])
                        cursor = cursor[Backer.parent];
                    return cursor;
                })
                    .filter((sur) => !!sur);
                this.cursors = new Set(newCursors);
            }
            /**
             * Retracts all cursors to their immediate container.
             */
            containers() {
                this.map(cursor => !!cursor[Backer.parent], cursor => cursor[Backer.parent]);
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
                const snap = instances.map(v => Array.from(v.cursors.values())).flat();
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
                    max = Number.POSITIVE_INFINITY;
                const delta = max - min + 1;
                const valueMap = {};
                for (const item of this.cursors) {
                    const val = item[Backer.sum];
                    if (!valueMap.hasOwnProperty(val))
                        valueMap[val] = [];
                    valueMap[val].push(item);
                }
                this.cursors = new Set(Object.values(valueMap)
                    .filter(cursor => cursor.length >= min)
                    .map(cursor => cursor.slice(0, delta))
                    .flat());
            }
            /** */
            is(surrogate, not = false) {
                const instance = this.clone();
                return instance.filterSurrogate(sur => {
                    const condition = sur[Backer.typeOf].is(surrogate[Backer.typeOf]) ||
                        sur[Backer.typeOf].parallelRoots.includes(surrogate[Backer.typeOf]);
                    return not ?
                        !condition :
                        condition;
                });
            }
            /** */
            sort(leaf) {
                const contentTypes = leaf.contentTypes;
                const snap = this.snapshot();
                snap.sort((a, b) => a[Backer.value] - b[Backer.value]);
                for (let i = contentTypes.length; i-- > 0;) {
                    const struct = contentTypes[i];
                    if (!struct)
                        continue;
                    snap.sort((a, b) => {
                        if (!(a instanceof Backer.Surrogate))
                            return b instanceof Backer.Surrogate ? -1 : 0;
                        else if (!(b instanceof Backer.Surrogate))
                            return 1;
                        const p1 = a.get(struct);
                        const p2 = b.get(struct);
                        const v1 = p1 ? p1[Backer.value] || 0 : 0;
                        const v2 = p2 ? p2[Backer.value] || 0 : 0;
                        return v1 - v2;
                    });
                }
                this.cursors = new Set(snap);
            }
        }
        TruthTalk.CursorSet = CursorSet;
        const surrogateFilterFn = (x) => x instanceof Backer.Surrogate;
    })(TruthTalk = Backer.TruthTalk || (Backer.TruthTalk = {}));
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    var TruthTalk;
    (function (TruthTalk) {
        var _a;
        /**
         *
         */
        TruthTalk.op = Symbol("op");
        /**
         *
         */
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
                constructor(min, max) {
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
    class Program {
        constructor(document, pattern) {
            this.document = document;
            this.pattern = pattern;
            this.structCache = new WeakMap();
            this.surrogateCache = new WeakMap();
            this.graph = force([]);
            this.schema = force([]);
            const program = this;
            this.calcSchema();
            Object.defineProperties(Backer, {
                Graph: {
                    get() {
                        return program.graphTable;
                    }
                },
                Schema: {
                    get() {
                        return program.schemaTable;
                    }
                }
            });
        }
        calcSchema() {
            this.graph.reset(this.document.types
                .filter(v => !v.isPattern)
                .filter(v => this.pattern.test(v.name))
                .map(v => this.type2Surrogate(v)));
            this.schema.reset(this.document.types
                .filter(v => !v.isPattern)
                .filter(v => !this.pattern.test(v.name))
                .map(v => this.type2Struct(v)));
            this.graphTable = Object.fromEntries(this.graph.snapshot()
                .map(v => [v[Backer.name].toString(), v]));
            this.schemaTable = Object.fromEntries(this.schema.snapshot()
                .map(v => [v[Backer.name].toString(), v]));
        }
        type2Struct(type) {
            let struct = this.structCache.get(type);
            if (!struct) {
                struct = new Backer.Struct(type, null);
                this.structCache.set(type, struct);
            }
            return struct;
        }
        type2Surrogate(type) {
            let surrogate = this.surrogateCache.get(type);
            if (!surrogate) {
                surrogate = new Backer.Surrogate(type, null);
                this.surrogateCache.set(type, surrogate);
            }
            return surrogate;
        }
        async edit(content, pattern) {
            const doc = await Truth.parse(Backer.Util.Headers + content);
            if (doc instanceof Error)
                throw doc;
            this.document = doc;
            this.calcSchema();
            if (pattern)
                this.pattern = pattern;
        }
    }
    Backer.Program = Program;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    class Project {
    }
    Backer.Project = Project;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    var TruthTalk;
    (function (TruthTalk) {
        /**
         *
         */
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
                for (const [branchName, branchCtor] of Object.entries(TruthTalk.Branches)) {
                    const name = branchName.toLowerCase();
                    branches[name] = () => new branchCtor();
                }
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
var Backer;
(function (Backer) {
    Backer.typeOf = Symbol("typeOf");
    Backer.value = Symbol("value");
    Backer.name = Symbol("name");
    Backer.values = Symbol("values");
    Backer.sum = Symbol("sum");
    Backer.parent = Symbol("parent");
    /**
     *
     */
    class Base extends Backer.TruthTalk.Leaves.Surrogate {
        /** */
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
        /** */
        toJSON() {
            return this[Backer.value];
        }
        /** */
        valueOf() {
            return this[Backer.value];
        }
        /** */
        toString() {
            const val = this[Backer.value];
            if (val === null)
                return val;
            return String(val);
        }
        /** */
        [Symbol.toPrimitive]() {
            return this[Backer.value];
        }
        /** */
        get [Symbol.toStringTag]() {
            return "Proxy";
        }
    }
    Backer.Base = Base;
    /**
     *
     */
    class Aggregate extends Base {
        /** */
        constructor(value, containers, _name) {
            super(containers);
            this.value = value;
            this._name = _name;
        }
        /** */
        get [Backer.value]() {
            return this.value;
        }
        get [Backer.sum]() {
            return this.value.toString();
        }
        /** */
        get [Backer.name]() {
            return this._name || this[Backer.parent].map(v => v[Backer.name]).join(",");
        }
    }
    Backer.Aggregate = Aggregate;
    /**
     *
     */
    class Name extends Base {
        /** */
        constructor(name, container) {
            super(container);
            this.name = name;
        }
        /** */
        get [Backer.value]() {
            return this.name;
        }
        get [Backer.sum]() {
            return this.name.toString();
        }
        /** */
        get [Backer.name]() {
            return "name";
        }
    }
    Backer.Name = Name;
    /**
     *
     */
    class Struct extends Base {
        /** */
        constructor(type, parentValue) {
            super(parentValue);
            this[Backer.typeOf] = type;
            this[Backer.parent] = parentValue;
            this[Backer.name] = new Name(type.name, this);
            Backer.Util.shadows(this, false, Backer.typeOf, Backer.name, Backer.TruthTalk.op, Backer.parent, Backer.TruthTalk.container);
            for (const child of type.inners)
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
            return this[Backer.typeOf].values || [];
        }
        get [Backer.sum]() {
            var _a;
            return ((_a = this[Backer.value]) === null || _a === void 0 ? void 0 : _a.toString()) || this[Backer.values].map(v => v.value).join(", ");
        }
        get text() {
            return this[Backer.name].name || "";
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
            base = base instanceof Truth.Type ? base : base[Backer.typeOf];
            return this[Backer.typeOf].is(base);
        }
        /** */
        [Symbol.hasInstance](value) {
            return this.instanceof(value);
        }
    }
    Backer.Struct = Struct;
    /**
     *
     */
    class Surrogate extends Struct {
        /** */
        get contents() {
            return Object.values(this);
        }
        /** */
        get bases() {
            return this[Backer.typeOf].bases.map(x => Backer.Schema[x.name]);
        }
        /** */
        instanceof(base) {
            return this[Backer.value] instanceof base || this[Backer.typeOf].is(base);
        }
        ;
        get [Backer.value]() {
            let value = this[Backer.typeOf].value;
            if (!value && this[Backer.typeOf].values.length) {
                const v = this[Backer.typeOf].values[0];
                if (v.aliased)
                    value = v.value;
                else
                    value = Backer.Schema[v.value];
            }
            return value;
        }
        get text() {
            var _a;
            return this[Backer.typeOf].value || ((_a = this[Backer.typeOf].values[0]) === null || _a === void 0 ? void 0 : _a.value) || "";
        }
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
        /** */
        toString(indent = 0) {
            let base = this[Backer.typeOf].name;
            const primitive = this[Backer.value] ? this[Backer.values].map(v => v.value.toString()).filter(v => v !== base) : undefined;
            if (primitive)
                base += `: ${primitive.join(", ")}`;
            if (this.contents.length > 0)
                base += this.contents.map(x => "\n" + x.toString(indent + 1)).join("");
            return "\t".repeat(indent) + base;
        }
    }
    Backer.Surrogate = Surrogate;
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    var Util;
    (function (Util) {
        Util.Headers = `
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
            const doc = await Truth.parse(Util.Headers + content);
            if (doc instanceof Error)
                throw doc;
            doc.program.verify();
            const faults = Array.from(doc.program.faults.each());
            if (faults.length) {
                for (const fault of faults)
                    console.error(fault.toString());
                throw faults[0].toString();
            }
            const program = new Backer.Program(doc, pattern);
            return program;
        }
        Util.loadFile = loadFile;
    })(Util = Backer.Util || (Backer.Util = {}));
})(Backer || (Backer = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vY29yZS8mLnRzIiwiLi4vY29yZS9BU1QudHMiLCIuLi9jb3JlL0VuZ2luZS50cyIsIi4uL2NvcmUvTm9kZXMudHMiLCIuLi9jb3JlL1Byb2dyYW0udHMiLCIuLi9jb3JlL1Byb2plY3QudHMiLCIuLi9jb3JlL1JlZmxleExpYnJhcnkudHMiLCIuLi9jb3JlL1N1cnJvZ2F0ZS50cyIsIi4uL2NvcmUvVXRpbC50cyIsIi4uL2NvcmUvWmVuaXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUVDQSxJQUFVLE1BQU0sQ0EyWWY7QUEzWUQsV0FBVSxNQUFNO0lBQUMsSUFBQSxTQUFTLENBMll6QjtJQTNZZ0IsV0FBQSxTQUFTO1FBT3pCOztXQUVHO1FBQ0gsU0FBZ0IsT0FBTyxDQUFDLEdBQVc7WUFFbEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxTQUFTLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzlELE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkIsT0FBTyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDM0IsQ0FBQztRQUxlLGlCQUFPLFVBS3RCLENBQUE7UUFFRDs7V0FFRztRQUNILE1BQWEsU0FBUztZQVFyQixNQUFNO1lBQ04sWUFBWSxHQUFHLE9BQWlCO2dCQUUvQixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2pDLENBQUM7WUFWRCxNQUFNO1lBQ04sTUFBTSxDQUFDLEdBQUc7Z0JBRVQsT0FBTyxJQUFJLFNBQVMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDdEQsQ0FBQztZQVdEOztlQUVHO1lBQ0gsUUFBUTtnQkFFUCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMs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Q3JCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUVyRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQ2pCO2dCQUNDLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTTtvQkFDekIsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFFakMsTUFBTSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDM0I7WUFDRCxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQUEsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUUxQyxPQUFPLE9BQU8sQ0FBQztRQUNoQixDQUFDO1FBcEJxQixhQUFRLFdBb0I3QixDQUFBO0lBQ0YsQ0FBQyxFQTFEZ0IsSUFBSSxHQUFKLFdBQUksS0FBSixXQUFJLFFBMERwQjtBQUFELENBQUMsRUExRFMsTUFBTSxLQUFOLE1BQU0sUUEwRGYiLCJzb3VyY2VzQ29udGVudCI6WyJcbm5hbWVzcGFjZSBCYWNrZXJcbntcblx0XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyLlRydXRoVGFsa1xue1xuXHRleHBvcnQgdHlwZSBBdG9tID0gUmVmbGV4LkF0b208Tm9kZSwgQnJhbmNoPjtcblx0ZXhwb3J0IHR5cGUgQXRvbXMgPSBSZWZsZXguQXRvbTxOb2RlLCBCcmFuY2g+O1xuXHRcblx0LyoqICovXG5cdGV4cG9ydCBpbnRlcmZhY2UgTmFtZXNwYWNlIGV4dGVuZHNcblx0XHRSZWZsZXguQ29yZS5JQnJhbmNoTmFtZXNwYWNlPEF0b21zLCBCcmFuY2hlcy5RdWVyeT5cblx0e1xuXHRcdC8qKiAqL1xuXHRcdGlzKC4uLmF0b21pY3M6IEF0b21zW10pOiBCcmFuY2hlcy5Jcztcblx0XHRcblx0XHQvKiogKi9cblx0XHRoYXMoLi4uYXRvbWljczogQXRvbXNbXSk6IEJyYW5jaGVzLkhhcztcblx0XHRcblx0XHQvKiogKi9cblx0XHRub3QoLi4uYXRvbWljczogQXRvbXNbXSk6IEJyYW5jaGVzLk5vdDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRvciguLi5hdG9taWNzOiBBdG9tc1tdKTogQnJhbmNoZXMuT3I7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y29udGFpbmVycygpOiBMZWF2ZXMuQ29udGFpbmVycztcblx0XHRcblx0XHQvKiogKi9cblx0XHRyb290KCk6IExlYXZlcy5Sb290cztcblx0XHRcblx0XHQvKiogKi9cblx0XHRjb250ZW50cygpOiBMZWF2ZXMuQ29udGVudHM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXF1YWxzKHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCk6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z3JlYXRlclRoYW4odmFsdWU6IHN0cmluZyB8IG51bWJlcik6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bGVzc1RoYW4odmFsdWU6IHN0cmluZyB8IG51bWJlcik6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c3RhcnRzV2l0aCh2YWx1ZTogc3RyaW5nIHwgbnVtYmVyKTogTGVhdmVzLlByZWRpY2F0ZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRlbmRzV2l0aCh2YWx1ZTogc3RyaW5nIHwgbnVtYmVyKTogTGVhdmVzLlByZWRpY2F0ZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRhbGlhc2VkKCk6IExlYXZlcy5BbGlhc2VkO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGxlYXZlcygpOiBMZWF2ZXMuTGVhdmVzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZyZXNoKCk6IExlYXZlcy5GcmVzaDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRzbGljZShzdGFydDogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBMZWF2ZXMuU2xpY2U7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0b2NjdXJlbmNlcyhtaW46IG51bWJlciwgbWF4PzogbnVtYmVyKTogTGVhdmVzLk9jY3VyZW5jZXM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c29ydCguLi5jb250ZW50VHlwZXM6IE9iamVjdFtdKTogTGVhdmVzLlNvcnQ7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmV2ZXJzZSgpOiBMZWF2ZXMuUmV2ZXJzZTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRuYW1lcygpOiBMZWF2ZXMuTmFtZXM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bmFtZWQodmFsdWU6IHN0cmluZyk6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c3VtKCk6IExlYXZlcy5TdW07XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXZnKCk6IExlYXZlcy5Bdmc7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bWluKCk6IExlYXZlcy5NaW47XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bWF4KCk6IExlYXZlcy5NYXg7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y291bnQoKTogTGVhdmVzLkNvdW50O1xuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBCYWNrZXIuVHJ1dGhUYWxrXG57XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCB0eXBlIEN1cnNvciA9IEJhc2U8YW55LCBhbnk+O1xuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGV4ZWN1dGUoYXN0OiBCcmFuY2gpXG5cdHtcblx0XHRjb25zdCBjdXJzb3JzID0gbmV3IEN1cnNvclNldCguLi5PYmplY3QudmFsdWVzKEJhY2tlci5HcmFwaCkpO1xuXHRcdGN1cnNvcnMucXVlcnkoYXN0KTtcblx0XHRyZXR1cm4gY3Vyc29ycy5zbmFwc2hvdCgpO1xuXHR9XG5cdFxuXHQvKipcblx0ICogS2VlcHMgdHJhY2sgb2YgcG9zc2libGUgb3V0cHV0IG9mIHF1ZXJ5XG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQ3Vyc29yU2V0XG5cdHtcdFxuXHRcdC8qKiAqL1xuXHRcdHN0YXRpYyBuZXcoKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgQ3Vyc29yU2V0KC4uLk9iamVjdC52YWx1ZXMoQmFja2VyLkdyYXBoKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvbnN0cnVjdG9yKC4uLmN1cnNvcnM6IEN1cnNvcltdKVxuXHRcdHtcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQoY3Vyc29ycyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgY3Vyc29yczogU2V0PEN1cnNvcj47XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU25hcHNob3Qgb2YgY3VycmVudCBwb3NzaWJpbGl0aWVzXG5cdFx0ICovXG5cdFx0c25hcHNob3QoKVxuXHRcdHtcblx0XHRcdHJldHVybiBBcnJheS5mcm9tKHRoaXMuY3Vyc29ycyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdG1hcChmaWx0ZXI6IChjdXJzb3I6IEN1cnNvcikgPT4gYm9vbGVhbiwgbWFwOiAoaXRlbXM6IEN1cnNvcikgPT4gTWF5YmVBcnJheTxDdXJzb3I+KVxuXHRcdHtcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQodGhpcy5zbmFwc2hvdCgpXG5cdFx0XHRcdC5maWx0ZXIoZmlsdGVyKVxuXHRcdFx0XHQuZmxhdE1hcChtYXApXG5cdFx0XHRcdC5maWx0ZXIoY3Vyc29yID0+ICEhY3Vyc29yKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENsb25lcyBjdXJyZW50IHN0YXRlIG9mIEN1cnNvclNldFxuXHRcdCAqL1xuXHRcdGNsb25lKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IEN1cnNvclNldCguLi50aGlzLnNuYXBzaG90KCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBGaWx0ZXJzIGN1cnJlbnQgcG9zc2liaWxpdGllc1xuXHRcdCAqL1xuXHRcdGZpbHRlcihmbjogKGN1cnNvcjogQ3Vyc29yKSA9PiBib29sZWFuKVxuXHRcdHtcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQodGhpcy5zbmFwc2hvdCgpLmZpbHRlcihjdXJzb3IgPT4gZm4oY3Vyc29yKSkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBGaWx0ZXJzIGN1cnJlbnQgcG9zc2liaWxpdGllc1xuXHRcdCAqL1xuXHRcdGZpbHRlclN1cnJvZ2F0ZShmbjogKHY6IFN1cnJvZ2F0ZSkgPT4gYm9vbGVhbilcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KHRoaXMuc25hcHNob3QoKVxuXHRcdFx0XHQuZmlsdGVyKCh2KTogdiBpcyBTdXJyb2dhdGUgPT4gdiBpbnN0YW5jZW9mIFN1cnJvZ2F0ZSAmJiBmbih2KSkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBFeGVjdXRlcyBhIFRydXRoIFRhbGsgcXVlcnlcblx0XHQgKi9cblx0XHRxdWVyeShhc3Q6IEJyYW5jaCB8IExlYWYpIFxuXHRcdHtcblx0XHRcdGlmIChhc3QgaW5zdGFuY2VvZiBCcmFuY2gpXG5cdFx0XHRcdHRoaXMuYnJhbmNoKGFzdCk7XG5cdFx0XHRlbHNlIFxuXHRcdFx0XHR0aGlzLmxlYWYoYXN0KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRXhlY3V0ZXMgYSBUcnV0aCBUYWxrIGJyYW5jaFxuXHRcdCAqL1xuXHRcdGJyYW5jaChicmFuY2g6IEJyYW5jaCkgXG5cdFx0e1xuXHRcdFx0c3dpdGNoIChicmFuY2hbb3BdKVxuXHRcdFx0e1xuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLmlzOlxuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLnF1ZXJ5OlxuXHRcdFx0XHRcdGZvciAoY29uc3QgcXVlcnkgb2YgYnJhbmNoLmNoaWxkcmVuKVxuXHRcdFx0XHRcdFx0dGhpcy5xdWVyeShxdWVyeSk7XHRcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XG5cdFx0XHRcdGNhc2UgQnJhbmNoT3Aubm90OiBcblx0XHRcdFx0XHR0aGlzLm5vdChicmFuY2gpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0Y2FzZSBCcmFuY2hPcC5vcjpcblx0XHRcdFx0XHR0aGlzLm9yKGJyYW5jaCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFxuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLmhhczpcblx0XHRcdFx0XHR0aGlzLmNvbnRlbnRzKCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Zm9yIChjb25zdCBxdWVyeSBvZiBicmFuY2guY2hpbGRyZW4pXG5cdFx0XHRcdFx0XHR0aGlzLnF1ZXJ5KHF1ZXJ5KTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lcnMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRXhlY3V0ZXMgYSBUcnV0aCBUYWxrIGxlYWZcblx0XHQgKi9cblx0XHRsZWFmKGxlYWY6IExlYWYpIFxuXHRcdHtcblx0XHRcdHN3aXRjaCAobGVhZltvcF0pXG5cdFx0XHR7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLnN1cnJvZ2F0ZTpcblx0XHRcdFx0XHRjb25zdCBzdXJyb2dhdGVMZWFmID0gbGVhZiBhcyBTdXJyb2dhdGU7XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXJTdXJyb2dhdGUoc3VyID0+XG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0aWYgKHN1clt0eXBlT2ZdLmlzKHN1cnJvZ2F0ZUxlYWZbdHlwZU9mXSkpXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRpZiAoc3VyW3R5cGVPZl0ucGFyYWxsZWxSb290cy5pbmNsdWRlcyhzdXJyb2dhdGVMZWFmW3R5cGVPZl0pKVxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0Y2FzZSBMZWFmT3AuY29udGVudHM6XG5cdFx0XHRcdFx0dGhpcy5jb250ZW50cygpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0Y2FzZSBMZWFmT3Aucm9vdHM6XG5cdFx0XHRcdFx0dGhpcy5yb290cygpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0Y2FzZSBMZWFmT3AuY29udGFpbmVyczpcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lcnMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XG5cdFx0XHRcdGNhc2UgTGVhZk9wLmFsaWFzZWQ6XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoc3VyID0+IHN1clt2YWx1ZV0gIT09IG51bGwpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0Y2FzZSBMZWFmT3AubGVhdmVzOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHN1ciA9PiBzdXJbdmFsdWVdID09PSBudWxsKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XG5cdFx0XHRcdGNhc2UgTGVhZk9wLmZyZXNoOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyU3Vycm9nYXRlKHN1ciA9PiBzdXJbdHlwZU9mXS5pc0ZyZXNoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XG5cdFx0XHRcdGNhc2UgUHJlZGljYXRlT3AuZXF1YWxzOlxuXHRcdFx0XHRcdHRoaXMuZXF1YWxzKGxlYWYgYXMgTGVhdmVzLlByZWRpY2F0ZSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFxuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLmdyZWF0ZXJUaGFuOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHN1ciA9PiAoc3VyW3ZhbHVlXSB8fMKgMCkgPiAobGVhZiBhcyBMZWF2ZXMuUHJlZGljYXRlKS5vcGVyYW5kKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XG5cdFx0XHRcdGNhc2UgUHJlZGljYXRlT3AubGVzc1RoYW46XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoc3VyID0+IChzdXJbdmFsdWVdIHx8IDApIDwgKGxlYWYgYXMgTGVhdmVzLlByZWRpY2F0ZSkub3BlcmFuZCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdGNhc2UgUHJlZGljYXRlT3Auc3RhcnRzV2l0aDpcblx0XHRcdFx0XHR0aGlzLmZpbHRlcihzdXIgPT4gc3VyW3ZhbHVlXSA9PSBudWxsID8gXG5cdFx0XHRcdFx0XHRmYWxzZSA6IFxuXHRcdFx0XHRcdFx0c3VyW3ZhbHVlXSEudG9TdHJpbmcoKS5zdGFydHNXaXRoKChsZWFmIGFzIExlYXZlcy5QcmVkaWNhdGUpLm9wZXJhbmQgYXMgc3RyaW5nKSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFxuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLmVuZHNXaXRoOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHN1ciA9PiBzdXJbdmFsdWVdID09IG51bGwgPyBcblx0XHRcdFx0XHRcdGZhbHNlIDogXG5cdFx0XHRcdFx0XHRzdXJbdmFsdWVdIS50b1N0cmluZygpLmVuZHNXaXRoKChsZWFmIGFzIExlYXZlcy5QcmVkaWNhdGUpLm9wZXJhbmQgYXMgc3RyaW5nKSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFxuXHRcdFx0XHRjYXNlIExlYWZPcC5zbGljZTpcblx0XHRcdFx0XHR0aGlzLnNsaWNlKGxlYWYpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0Y2FzZSBMZWFmT3Aub2NjdXJlbmNlczpcblx0XHRcdFx0XHR0aGlzLm9jY3VyZW5jZXMobGVhZik7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFxuXHRcdFx0XHRjYXNlIExlYWZPcC5zb3J0OiBcblx0XHRcdFx0XHR0aGlzLnNvcnQobGVhZik7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFxuXHRcdFx0XHRjYXNlIExlYWZPcC5yZXZlcnNlOlxuXHRcdFx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQodGhpcy5zbmFwc2hvdCgpLnJldmVyc2UoKSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFxuXHRcdFx0XHRjYXNlIExlYWZPcC5uYW1lczpcblx0XHRcdFx0XHR0aGlzLm5hbWVzKCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFxuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLm5hbWVkOlxuXHRcdFx0XHRcdHRoaXMubmFtZXMoKTtcblx0XHRcdFx0XHR0aGlzLmVxdWFscyhsZWFmwqBhcyBMZWF2ZXMuUHJlZGljYXRlKTtcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lcnMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGVxdWFscyhsZWFmOiBMZWF2ZXMuUHJlZGljYXRlKVxuXHRcdHtcblx0XHRcdHRoaXMuZmlsdGVyKHN1ciA9PiBzdXJbc3VtXSA9PT0gbnVsbCA/IFxuXHRcdFx0XHRmYWxzZSA6XG5cdFx0XHRcdHN1cltzdW1dID09IChsZWFmKS5vcGVyYW5kKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0bmFtZXMoKVxuXHRcdHtcblx0XHRcdHRoaXMubWFwKHYgPT4gdiBpbnN0YW5jZW9mIFN0cnVjdCwgY3Vyc29yID0+IChjdXJzb3IgYXMgU3RydWN0KVtuYW1lXSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEV4dGVuZHMgYWxsIGN1cnNvcnMgdG8gaW5jbHVkZSB0aGVpciBkaXJlY3QgY29udGVudHMuXG5cdFx0ICovXG5cdFx0Y29udGVudHMoKVxuXHRcdHtcblx0XHRcdHRoaXMubWFwKHN1cnJvZ2F0ZUZpbHRlckZuLCBjdXJzb3IgPT4gKGN1cnNvciBhcyBTdXJyb2dhdGUpLmNvbnRlbnRzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmV0cmFjdHMgYWxsIGN1cnNvcnMgdG8gdGhlaXIgdG9wLWxldmVsIGFuY2VzdG9ycy5cblx0XHQgKi9cblx0XHRyb290cygpXG5cdFx0e1xuXHRcdFx0Y29uc3QgbmV3Q3Vyc29ycyA9IHRoaXMuc25hcHNob3QoKVxuXHRcdFx0XHQubWFwKChjdXJzb3I6IEN1cnNvciB8wqBudWxsKSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0d2hpbGUgKGN1cnNvciAmJiBjdXJzb3JbcGFyZW50XSlcblx0XHRcdFx0XHRcdGN1cnNvciA9IGN1cnNvcltwYXJlbnRdIGFzIFN1cnJvZ2F0ZTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRyZXR1cm4gY3Vyc29yO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQuZmlsdGVyKChzdXIpOiBzdXIgaXMgU3Vycm9nYXRlID0+ICEhc3VyKTtcblx0XHRcdFxuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldChuZXdDdXJzb3JzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmV0cmFjdHMgYWxsIGN1cnNvcnMgdG8gdGhlaXIgaW1tZWRpYXRlIGNvbnRhaW5lci5cblx0XHQgKi9cblx0XHRjb250YWluZXJzKClcblx0XHR7XG5cdFx0XHR0aGlzLm1hcChcblx0XHRcdFx0Y3Vyc29yID0+ICEhY3Vyc29yW3BhcmVudF0sXG5cdFx0XHRcdGN1cnNvciA9PiBjdXJzb3JbcGFyZW50XSBhcyBhbnkpO1xuXHRcdH1cblx0XG5cdFx0LyoqICovXG5cdFx0bm90KGJyYW5jaDogQnJhbmNoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGluc3RhbmNlID0gdGhpcy5jbG9uZSgpO1xuXHRcdFx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBxdWVyeSBvZiBicmFuY2guY2hpbGRyZW4pXG5cdFx0XHRcdGluc3RhbmNlLnF1ZXJ5KHF1ZXJ5KTtcblx0XHRcdFxuXHRcdFx0Y29uc3Qgc25hcCA9IGluc3RhbmNlLnNuYXBzaG90KCk7XG5cdFx0XHR0aGlzLmZpbHRlcih4ID0+ICFzbmFwLmluY2x1ZGVzKHgpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0b3IoYnJhbmNoOiBCcmFuY2gpXG5cdFx0e1xuXHRcdFx0Y29uc3QgaW5zdGFuY2VzOiBDdXJzb3JTZXRbXSA9IFtdO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHF1ZXJ5IG9mIGJyYW5jaC5jaGlsZHJlbilcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgaW5zdGFuY2UgPSB0aGlzLmNsb25lKCk7XHRcblx0XHRcdFx0aW5zdGFuY2UucXVlcnkocXVlcnkpO1xuXHRcdFx0XHRpbnN0YW5jZXMucHVzaChpbnN0YW5jZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGNvbnN0IHNuYXAgPSBpbnN0YW5jZXMubWFwKHYgPT4gQXJyYXkuZnJvbSh2LmN1cnNvcnMudmFsdWVzKCkpKS5mbGF0KCk7XG5cdFx0XHR0aGlzLmZpbHRlcih4ID0+IHNuYXAuaW5jbHVkZXMoeCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRzbGljZShsZWFmOiBMZWFmKVxuXHRcdHtcblx0XHRcdGxldCB7IHN0YXJ0LCBlbmQgfcKgPSBsZWFmIGFzIExlYXZlcy5TbGljZTtcblx0XHRcdGNvbnN0IHNuYXAgPSB0aGlzLnNuYXBzaG90KCk7XG5cdFx0XHRcblx0XHRcdGlmIChlbmQgJiYgZW5kIDwgMSlcblx0XHRcdFx0ZW5kID0gc3RhcnQgKyBNYXRoLnJvdW5kKGVuZCAqIHNuYXAubGVuZ3RoKTtcblx0XHRcdFxuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldChzbmFwLnNsaWNlKHN0YXJ0LCBlbmQpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0b2NjdXJlbmNlcyhsZWFmOiBMZWFmKVxuXHRcdHtcblx0XHRcdGxldCB7IG1pbiwgbWF4IH3CoD0gbGVhZiBhcyBMZWF2ZXMuT2NjdXJlbmNlcztcblx0XHRcdFxuXHRcdFx0aWYgKCFtYXgpXG5cdFx0XHRcdG1heCA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcblx0XHRcdFx0XG5cdFx0XHRjb25zdCBkZWx0YSA9IG1heCAtIG1pbiArIDE7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHZhbHVlTWFwOiBSZWNvcmQ8c3RyaW5nLCBDdXJzb3JbXT4gPSB7fTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBpdGVtIG9mIHRoaXMuY3Vyc29ycylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdmFsID0gaXRlbVtCYWNrZXIuc3VtXTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICghdmFsdWVNYXAuaGFzT3duUHJvcGVydHkodmFsKSlcblx0XHRcdFx0XHR2YWx1ZU1hcFt2YWxdID0gW107XG5cdFx0XHRcdFx0XG5cdFx0XHRcdHZhbHVlTWFwW3ZhbF0ucHVzaChpdGVtKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldChPYmplY3QudmFsdWVzKHZhbHVlTWFwKVxuXHRcdFx0XHQuZmlsdGVyKGN1cnNvciA9PiBjdXJzb3IubGVuZ3RoID49IG1pbilcblx0XHRcdFx0Lm1hcChjdXJzb3IgPT4gY3Vyc29yLnNsaWNlKDAsIGRlbHRhKSlcblx0XHRcdFx0LmZsYXQoKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGlzKHN1cnJvZ2F0ZTogU3Vycm9nYXRlLCBub3QgPSBmYWxzZSlcblx0XHR7XG5cdFx0XHRjb25zdCBpbnN0YW5jZSA9IHRoaXMuY2xvbmUoKTtcblx0XHRcdHJldHVybiBpbnN0YW5jZS5maWx0ZXJTdXJyb2dhdGUoc3VyID0+IFxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBjb25kaXRpb24gPSBcblx0XHRcdFx0XHRzdXJbdHlwZU9mXS5pcyhzdXJyb2dhdGVbdHlwZU9mXSkgfHwgXG5cdFx0XHRcdFx0c3VyW3R5cGVPZl0ucGFyYWxsZWxSb290cy5pbmNsdWRlcyhzdXJyb2dhdGVbdHlwZU9mXSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXR1cm4gbm90ID9cblx0XHRcdFx0XHQhY29uZGl0aW9uIDogXG5cdFx0XHRcdFx0Y29uZGl0aW9uO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHNvcnQobGVhZjogTGVhZilcblx0XHR7XG5cdFx0XHRjb25zdCBjb250ZW50VHlwZXMgPSAobGVhZiBhcyBMZWF2ZXMuU29ydCkuY29udGVudFR5cGVzIGFzIFN0cnVjdFtdO1xuXHRcdFx0Y29uc3Qgc25hcCA9IHRoaXMuc25hcHNob3QoKTtcblx0XHRcdHNuYXAuc29ydCgoYSwgYikgPT4gYVt2YWx1ZV0gLSBiW3ZhbHVlXSk7XG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGkgPSBjb250ZW50VHlwZXMubGVuZ3RoOyBpLS0gPiAwOylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3Qgc3RydWN0ID0gY29udGVudFR5cGVzW2ldO1xuXHRcdFx0XHRpZiAoIXN0cnVjdClcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XG5cdFx0XHRcdHNuYXAuc29ydCgoYSwgYikgPT4gXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoIShhIGluc3RhbmNlb2YgU3Vycm9nYXRlKSkgXG5cdFx0XHRcdFx0XHRyZXR1cm4gYiBpbnN0YW5jZW9mIFN1cnJvZ2F0ZSA/IC0xIDogMDtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRlbHNlIGlmICghKGIgaW5zdGFuY2VvZiBTdXJyb2dhdGUpKVxuXHRcdFx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29uc3QgcDEgPSBhLmdldChzdHJ1Y3QpO1xuXHRcdFx0XHRcdGNvbnN0IHAyID0gYi5nZXQoc3RydWN0KTtcblx0XHRcdFx0XHRjb25zdCB2MTogYW55ID0gcDEgPyBwMVt2YWx1ZV0gfHwgMCA6IDA7XG5cdFx0XHRcdFx0Y29uc3QgdjI6IGFueSA9IHAyID8gcDJbdmFsdWVdIHx8IDAgOiAwO1xuXHRcdFx0XHRcdHJldHVybiB2MSAtIHYyO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldChzbmFwKTtcblx0XHR9XG5cdH1cblx0XG5cdHR5cGUgTWF5YmVBcnJheTxUPiA9IFQgfCBUW107XG5cdGNvbnN0IHN1cnJvZ2F0ZUZpbHRlckZuID0gKHg6IEN1cnNvcik6IHggaXMgU3Vycm9nYXRlID0+IHggaW5zdGFuY2VvZiBTdXJyb2dhdGU7XG59XG4iLCJcbm5hbWVzcGFjZSBCYWNrZXIuVHJ1dGhUYWxrXG57XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjb25zdCBvcCA9IFN5bWJvbChcIm9wXCIpO1xuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGNvbnN0IGNvbnRhaW5lciA9IFN5bWJvbChcImNvbnRhaW5lclwiKTtcblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgZW51bSBCcmFuY2hPcFxuXHR7XG5cdFx0cXVlcnkgPSAxLFxuXHRcdGlzID0gMixcblx0XHRoYXMgPSAzLFxuXHRcdG5vdCA9IDQsXG5cdFx0b3IgPSA1LFxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGVudW0gUHJlZGljYXRlT3Bcblx0e1xuXHRcdGVxdWFscyA9IDMwLFxuXHRcdGdyZWF0ZXJUaGFuID0gMzEsXG5cdFx0Z3JlYXRlclRoYW5PckVxdWFscyA9IDMyLFxuXHRcdGxlc3NUaGFuID0gMzMsXG5cdFx0bGVzc1RoYW5PckVxdWFscyA9IDM0LFxuXHRcdGFsaWtlID0gMzUsXG5cdFx0c3RhcnRzV2l0aCA9IDM2LFxuXHRcdGVuZHNXaXRoICA9IDM3LFxuXHRcdGluY2x1ZGVzID0gMzgsXG5cdFx0bWF0Y2hlcyA9IDM5LFxuXHRcdG5hbWVkID0gNDBcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBlbnVtIExlYWZPcFxuXHR7XG5cdFx0cHJlZGljYXRlID0gNjAsXG5cdFx0c2xpY2UgPSA2MSxcblx0XHRvY2N1cmVuY2VzID0gNjIsXG5cdFx0YWxpYXNlZCA9IDYzLFxuXHRcdHRlcm1pbmFscyA9IDY0LFxuXHRcdHNvcnQgPSA2NSxcblx0XHRyZXZlcnNlID0gNjYsXG5cdFx0c3Vycm9nYXRlID0gNjcsXG5cdFx0Y29udGFpbmVycyA9IDY4LFxuXHRcdHJvb3RzID0gNjksXG5cdFx0Y29udGVudHMgPSA3MCxcblx0XHRsZWF2ZXMgPSA3MSxcblx0XHRmcmVzaCA9IDcyLFxuXHRcdG5hbWVzID0gNzMsXG5cdFx0c3VtID0gNzQsXG5cdFx0YXZnID0gNzUsXG5cdFx0bWluID0gNzYsXG5cdFx0bWF4ID0gNzcsXG5cdFx0Y291bnQgPSA3OFxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IHR5cGUgTm9kZU9wID1cblx0XHRCcmFuY2hPcCB8IFxuXHRcdExlYWZPcCB8XG5cdFx0UHJlZGljYXRlT3A7XG5cdFxuXHQvLyMgQWJzdHJhY3QgQ2xhc3Nlc1xuXHRcblx0LyoqICovXG5cdGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBOb2RlXG5cdHtcblx0XHRhYnN0cmFjdCByZWFkb25seSBbb3BdOiBOb2RlT3A7XG5cdFx0XG5cdFx0cmVhZG9ubHkgW2NvbnRhaW5lcl06IEJyYW5jaCB8IG51bGwgPSBudWxsO1xuXHRcdFxuXHRcdFtSZWZsZXguYXRvbV0oZGVzdGluYXRpb246IEJyYW5jaClcblx0XHR7XG5cdFx0XHRkZXN0aW5hdGlvbi5hZGRDaGlsZCh0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0c2V0Q29udGFpbmVyKGNvbnQ6IEJyYW5jaCB8wqBudWxsKVxuXHRcdHtcblx0XHRcdC8vQHRzLWlnbm9yZVxuXHRcdFx0dGhpc1tjb250YWluZXJdID0gY29udDtcblx0XHR9XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgYWJzdHJhY3QgY2xhc3MgQnJhbmNoIGV4dGVuZHMgTm9kZVxuXHR7XG5cdFx0LyoqICovXG5cdFx0YWRkQ2hpbGQoY2hpbGQ6IE5vZGUsIHBvc2l0aW9uID0gLTEpXG5cdFx0e1xuXHRcdFx0Y2hpbGQuc2V0Q29udGFpbmVyKHRoaXMpO1xuXHRcdFx0XG5cdFx0XHRpZiAocG9zaXRpb24gPT09IC0xKVxuXHRcdFx0XHRyZXR1cm4gdm9pZCB0aGlzLl9jaGlsZHJlbi5wdXNoKGNoaWxkKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgYXQgPSB0aGlzLl9jaGlsZHJlbi5sZW5ndGggLSBwb3NpdGlvbiArIDE7XG5cdFx0XHR0aGlzLl9jaGlsZHJlbi5zcGxpY2UoYXQsIDAsIGNoaWxkKTtcblx0XHRcdHJldHVybiBjaGlsZDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVtb3ZlQ2hpbGQoY2hpbGQ6IE5vZGUpOiBOb2RlIHwgbnVsbDtcblx0XHRyZW1vdmVDaGlsZChjaGlsZElkeDogbnVtYmVyKSA6IE5vZGUgfCBudWxsO1xuXHRcdHJlbW92ZUNoaWxkKHBhcmFtOiBOb2RlIHwgbnVtYmVyKVxuXHRcdHtcblx0XHRcdGNvbnN0IGNoaWxkSWR4ID0gcGFyYW0gaW5zdGFuY2VvZiBOb2RlID9cblx0XHRcdFx0dGhpcy5fY2hpbGRyZW4uaW5kZXhPZihwYXJhbSkgOlxuXHRcdFx0XHRwYXJhbTtcblx0XHRcdFxuXHRcdFx0aWYgKGNoaWxkSWR4ID4gMClcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgcmVtb3ZlZCA9IHRoaXMuX2NoaWxkcmVuLnNwbGljZShjaGlsZElkeCwgMSlbMF07XG5cdFx0XHRcdHJlbW92ZWQuc2V0Q29udGFpbmVyKG51bGwpO1xuXHRcdFx0XHRyZXR1cm4gcmVtb3ZlZDtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBjaGlsZHJlbigpOiByZWFkb25seSAoQnJhbmNoIHwgTGVhZilbXVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLl9jaGlsZHJlbjtcblx0XHR9XG5cdFx0cHJpdmF0ZSByZWFkb25seSBfY2hpbGRyZW46IChCcmFuY2ggfCBMZWFmKVtdID0gW107XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgYWJzdHJhY3QgY2xhc3MgTGVhZiBleHRlbmRzIE5vZGUgeyB9XG5cdFxuXHQvLyMgQ29uY3JldGUgQ2xhc3Nlc1xuXHRcblx0LyoqICovXG5cdGV4cG9ydCBuYW1lc3BhY2UgQnJhbmNoZXNcblx0e1xuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBRdWVyeSBleHRlbmRzIEJyYW5jaFxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBCcmFuY2hPcC5xdWVyeTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIElzIGV4dGVuZHMgQnJhbmNoXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IEJyYW5jaE9wLmlzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgSGFzIGV4dGVuZHMgQnJhbmNoXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IEJyYW5jaE9wLmhhcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIE5vdCBleHRlbmRzIEJyYW5jaFxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBCcmFuY2hPcC5ub3Q7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBPciBleHRlbmRzIEJyYW5jaFxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBCcmFuY2hPcC5vcjtcblx0XHR9XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgbmFtZXNwYWNlIExlYXZlc1xuXHR7XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFByZWRpY2F0ZSBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdOiBQcmVkaWNhdGVPcDtcblx0XHRcdFxuXHRcdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRcdG9wdjogUHJlZGljYXRlT3AsXG5cdFx0XHRcdHJlYWRvbmx5IG9wZXJhbmQ6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4pXG5cdFx0XHR7XG5cdFx0XHRcdHN1cGVyKCk7XG5cdFx0XHRcdC8vQHRzLWlnbm9yZVxuXHRcdFx0XHR0aGlzW29wXSA9IG9wdjtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFNsaWNlIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0XHRyZWFkb25seSBzdGFydDogbnVtYmVyLCBcblx0XHRcdFx0cmVhZG9ubHkgZW5kPzogbnVtYmVyKVxuXHRcdFx0e1xuXHRcdFx0XHRzdXBlcigpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLnNsaWNlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgT2NjdXJlbmNlcyBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdFx0cmVhZG9ubHkgbWluOiBudW1iZXIsXG5cdFx0XHRcdHJlYWRvbmx5IG1heD86IG51bWJlcilcblx0XHRcdHtcblx0XHRcdFx0c3VwZXIoKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5vY2N1cmVuY2VzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgQWxpYXNlZCBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLmFsaWFzZWQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBMZWF2ZXMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5sZWF2ZXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBGcmVzaCBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLmZyZXNoO1xuXHRcdH1cblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgVGVybWluYWxzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AudGVybWluYWxzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgU29ydCBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdFx0Li4uY29udGVudFR5cGVzOiBPYmplY3RbXSlcblx0XHRcdHtcblx0XHRcdFx0c3VwZXIoKTtcblx0XHRcdFx0dGhpcy5jb250ZW50VHlwZXMgPSBjb250ZW50VHlwZXM7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJlYWRvbmx5IGNvbnRlbnRUeXBlczogT2JqZWN0W107XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLnNvcnQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBSZXZlcnNlIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AucmV2ZXJzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFN1cnJvZ2F0ZSBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLnN1cnJvZ2F0ZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIENvbnRhaW5lcnMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5jb250YWluZXJzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgUm9vdHMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5yb290cztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIENvbnRlbnRzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AuY29udGVudHM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBOYW1lcyBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBbb3BdID0gTGVhZk9wLm5hbWVzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgU3VtIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3Auc3VtO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgQXZnIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AuYXZnO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgTWluIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AubWluO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgTWF4IGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IFtvcF0gPSBMZWFmT3AubWF4O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgQ291bnQgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgW29wXSA9IExlYWZPcC5jb3VudDtcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIEJhY2tlclxue1xuXHRleHBvcnQgbGV0IEdyYXBoOiBSZWNvcmQ8c3RyaW5nLCBTdXJyb2dhdGU+O1xuXHRleHBvcnQgbGV0IFNjaGVtYTogUmVjb3JkPHN0cmluZywgU3RydWN0Pjtcblx0XG5cdGV4cG9ydCBjbGFzcyBQcm9ncmFtIFxuXHR7XG5cdFx0cHJpdmF0ZSBzdHJ1Y3RDYWNoZSA9IG5ldyBXZWFrTWFwPFRydXRoLlR5cGUsIFN0cnVjdD4oKTtcblx0XHRwcml2YXRlIHN1cnJvZ2F0ZUNhY2hlID0gbmV3IFdlYWtNYXA8VHJ1dGguVHlwZSwgU3Vycm9nYXRlPigpO1xuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKHByb3RlY3RlZCBkb2N1bWVudDogVHJ1dGguRG9jdW1lbnQsIHByb3RlY3RlZCBwYXR0ZXJuOiBSZWdFeHApXG5cdFx0e1xuXHRcdFx0Y29uc3QgcHJvZ3JhbSA9IHRoaXM7XG5cdFx0XHR0aGlzLmNhbGNTY2hlbWEoKTtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEJhY2tlciwge1xuXHRcdFx0XHRHcmFwaDoge1xuXHRcdFx0XHRcdGdldCgpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIHByb2dyYW0uZ3JhcGhUYWJsZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdFNjaGVtYToge1xuXHRcdFx0XHRcdGdldCgpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIHByb2dyYW0uc2NoZW1hVGFibGU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0cHJpdmF0ZSBncmFwaFRhYmxlITogUmVjb3JkPHN0cmluZywgU3Vycm9nYXRlPjtcblx0XHRwcml2YXRlIHNjaGVtYVRhYmxlITogUmVjb3JkPHN0cmluZywgU3Vycm9nYXRlPjtcblx0XHRcblx0XHRwdWJsaWMgZ3JhcGggPSBmb3JjZTxTdXJyb2dhdGU+KFtdKTtcblx0XHRwdWJsaWMgc2NoZW1hID0gZm9yY2U8U3RydWN0PihbXSk7XG5cdFx0XG5cdFx0cHJpdmF0ZSBjYWxjU2NoZW1hKClcblx0XHR7XG5cdFx0XHR0aGlzLmdyYXBoLnJlc2V0KHRoaXMuZG9jdW1lbnQudHlwZXNcblx0XHRcdFx0LmZpbHRlcih2ID0+ICF2LmlzUGF0dGVybilcblx0XHRcdFx0LmZpbHRlcih2ID0+IHRoaXMucGF0dGVybi50ZXN0KHYubmFtZSkpXG5cdFx0XHRcdC5tYXAodiA9PiB0aGlzLnR5cGUyU3Vycm9nYXRlKHYpKVxuXHRcdFx0KTtcblx0XHRcdHRoaXMuc2NoZW1hLnJlc2V0KHRoaXMuZG9jdW1lbnQudHlwZXNcblx0XHRcdFx0LmZpbHRlcih2ID0+ICF2LmlzUGF0dGVybilcblx0XHRcdFx0LmZpbHRlcih2ID0+ICF0aGlzLnBhdHRlcm4udGVzdCh2Lm5hbWUpKVxuXHRcdFx0XHQubWFwKHYgPT4gdGhpcy50eXBlMlN0cnVjdCh2KSlcblx0XHRcdCk7XG5cdFx0XHR0aGlzLmdyYXBoVGFibGUgPSBPYmplY3QuZnJvbUVudHJpZXMoXG5cdFx0XHRcdHRoaXMuZ3JhcGguc25hcHNob3QoKVxuXHRcdFx0XHRcdC5tYXAodiA9PiBbdltuYW1lXS50b1N0cmluZygpLCB2XSlcblx0XHRcdCk7XG5cdFx0XG5cdFx0XHR0aGlzLnNjaGVtYVRhYmxlID0gT2JqZWN0LmZyb21FbnRyaWVzKFxuXHRcdFx0XHR0aGlzLnNjaGVtYS5zbmFwc2hvdCgpXG5cdFx0XHRcdFx0Lm1hcCh2ID0+IFt2W25hbWVdLnRvU3RyaW5nKCksIHZdKVxuXHRcdFx0KSBhcyBhbnk7XG5cdFx0fVxuXHRcdFxuXHRcdHByaXZhdGUgdHlwZTJTdHJ1Y3QodHlwZTogVHJ1dGguVHlwZSlcblx0XHR7XG5cdFx0XHRsZXQgc3RydWN0ID0gdGhpcy5zdHJ1Y3RDYWNoZS5nZXQodHlwZSk7XG5cdFx0XHRcblx0XHRcdGlmICghc3RydWN0KVxuXHRcdFx0e1xuXHRcdFx0XHRzdHJ1Y3QgPSBuZXcgU3RydWN0KHR5cGUsIG51bGwpO1xuXHRcdFx0XHR0aGlzLnN0cnVjdENhY2hlLnNldCh0eXBlLCBzdHJ1Y3QpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gc3RydWN0O1xuXHRcdH1cblx0XHRcblx0XHRwcml2YXRlIHR5cGUyU3Vycm9nYXRlKHR5cGU6IFRydXRoLlR5cGUpXG5cdFx0e1xuXHRcdFx0bGV0IHN1cnJvZ2F0ZSA9IHRoaXMuc3Vycm9nYXRlQ2FjaGUuZ2V0KHR5cGUpO1xuXHRcdFx0XG5cdFx0XHRpZiAoIXN1cnJvZ2F0ZSlcblx0XHRcdHtcblx0XHRcdFx0c3Vycm9nYXRlID0gbmV3IFN1cnJvZ2F0ZSh0eXBlLCBudWxsKTtcblx0XHRcdFx0dGhpcy5zdXJyb2dhdGVDYWNoZS5zZXQodHlwZSwgc3Vycm9nYXRlKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIHN1cnJvZ2F0ZTtcblx0XHR9XG5cdFx0XG5cdFx0YXN5bmMgZWRpdChjb250ZW50OiBzdHJpbmcsIHBhdHRlcm4/OiBSZWdFeHApXG5cdFx0e1xuXHRcdFx0Y29uc3QgZG9jID0gYXdhaXQgVHJ1dGgucGFyc2UoVXRpbC5IZWFkZXJzICsgY29udGVudCk7XG5cdFx0XHRcblx0XHRcdGlmIChkb2MgaW5zdGFuY2VvZiBFcnJvcilcblx0XHRcdFx0dGhyb3cgZG9jO1xuXHRcdFx0XHRcblx0XHRcdHRoaXMuZG9jdW1lbnQgPSBkb2M7IFxuXHRcdFx0dGhpcy5jYWxjU2NoZW1hKCk7XG5cdFx0XHRcblx0XHRcdGlmIChwYXR0ZXJuKVxuXHRcdFx0XHR0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuXHRcdH1cblx0fVxuXHRcbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXJcbntcblx0ZXhwb3J0IGNsYXNzIFByb2plY3Rcblx0e1xuXHRcdFxuXHR9XG59IiwiXG5uYW1lc3BhY2UgQmFja2VyLlRydXRoVGFsa1xue1xuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgbGV0IHR0OiBSZWZsZXguQ29yZS5Bc0xpYnJhcnk8QmFja2VyLlRydXRoVGFsay5OYW1lc3BhY2UsIEJhY2tlci5UcnV0aFRhbGsuTGlicmFyeT47XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgTGlicmFyeSBpbXBsZW1lbnRzIFJlZmxleC5Db3JlLklMaWJyYXJ5XG5cdHtcblx0XHQvKiogKi9cblx0XHRpc0tub3duQnJhbmNoKGJyYW5jaDogQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiBicmFuY2ggaW5zdGFuY2VvZiBOb2RlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRpc0JyYW5jaERpc3Bvc2VkKGJyYW5jaDogUmVmbGV4LkNvcmUuSUJyYW5jaClcblx0XHR7XG5cdFx0XHRyZXR1cm4gYnJhbmNoIGluc3RhbmNlb2YgQnJhbmNoICYmIGJyYW5jaFtjb250YWluZXJdICE9PSBudWxsO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXRSb290QnJhbmNoKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IEJyYW5jaGVzLlF1ZXJ5KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldFN0YXRpY0JyYW5jaGVzKClcblx0XHR7XG5cdFx0XHRjb25zdCBicmFuY2hlczogYW55ID0ge307XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgW2JyYW5jaE5hbWUsIGJyYW5jaEN0b3JdIG9mIE9iamVjdC5lbnRyaWVzKEJyYW5jaGVzKSlcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgbmFtZSA9IGJyYW5jaE5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0YnJhbmNoZXNbbmFtZV0gPSAoKSA9PiBuZXcgYnJhbmNoQ3RvcigpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gYnJhbmNoZXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldFN0YXRpY05vbkJyYW5jaGVzKClcblx0XHR7XG5cdFx0XHRjb25zdCBsZWF2ZXM6IGFueSA9IHt9O1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhMZWF2ZXMpKVxuXHRcdFx0XHRsZWF2ZXNba2V5LnRvTG93ZXJDYXNlKCldID0gKGFyZzE6IFByZWRpY2F0ZU9wLCBhcmcyOiBudW1iZXIpID0+IG5ldyB2YWx1ZShhcmcxLCBhcmcyKTtcblx0XHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGtleSBpbiBQcmVkaWNhdGVPcClcblx0XHRcdFx0aWYgKGlzTmFOKHBhcnNlSW50KGtleSkpKVxuXHRcdFx0XHRcdGxlYXZlc1trZXldID0gKHZhbHVlOiBhbnkpID0+IG5ldyBMZWF2ZXMuUHJlZGljYXRlKCg8YW55PlByZWRpY2F0ZU9wKVtrZXldLCB2YWx1ZSk7XG5cdFx0XHRcdFxuXHRcdFx0cmV0dXJuIGxlYXZlcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0Q2hpbGRyZW4odGFyZ2V0OiBCcmFuY2gpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRhcmdldC5jaGlsZHJlbjtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y3JlYXRlQ29udGFpbmVyKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IEJyYW5jaGVzLlF1ZXJ5KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGF0dGFjaEF0b20oXG5cdFx0XHRhdG9taWM6IE5vZGUsXG5cdFx0XHRvd25lcjogQnJhbmNoLFxuXHRcdFx0cmVmOiBOb2RlIHwgXCJwcmVwZW5kXCIgfCBcImFwcGVuZFwiKVxuXHRcdHtcblx0XHRcdGlmICghKGF0b21pYyBpbnN0YW5jZW9mIE5vZGUpKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcblx0XHRcdGNvbnN0IHBvcyA9XG5cdFx0XHRcdHJlZiA9PT0gXCJhcHBlbmRcIiA/IC0xIDpcblx0XHRcdFx0cmVmID09PSBcInByZXBlbmRcIiA/IDAgOlxuXHRcdFx0XHQvLyBQbGFjZXMgdGhlIGl0ZW0gYXQgdGhlIGVuZCwgaW4gdGhlIGNhc2Ugd2hlbiBcblx0XHRcdFx0Ly8gcmVmIHdhc24ndCBmb3VuZCBpbiB0aGUgb3duZXIuIClUaGlzIHNob3VsZFxuXHRcdFx0XHQvLyBuZXZlciBhY3R1YWxseSBoYXBwZW4uKVxuXHRcdFx0XHRvd25lci5jaGlsZHJlbi5pbmRleE9mKHJlZikgKyAxIHx8IC0xO1xuXHRcdFx0XG5cdFx0XHRvd25lci5hZGRDaGlsZChhdG9taWMsIHBvcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGRldGFjaEF0b20oYXRvbWljOiBOb2RlLCBvd25lcjogQnJhbmNoKVxuXHRcdHtcblx0XHRcdG93bmVyLnJlbW92ZUNoaWxkKGF0b21pYyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHN3YXBCcmFuY2hlcyhicmFuY2gxOiBCcmFuY2gsIGJyYW5jaDI6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRpZiAoYnJhbmNoMVtUcnV0aFRhbGsuY29udGFpbmVyXSA9PT0gbnVsbCB8fCBicmFuY2gyW1RydXRoVGFsay5jb250YWluZXJdID09PSBudWxsKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3Qgc3dhcCB0b3AtbGV2ZWwgYnJhbmNoZXMuXCIpO1xuXHRcdFx0XG5cdFx0XHRpZiAoYnJhbmNoMVtUcnV0aFRhbGsuY29udGFpbmVyXSAhPT0gYnJhbmNoMltUcnV0aFRhbGsuY29udGFpbmVyXSlcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgc3dhcCBicmFuY2hlcyBmcm9tIHRoZSBzYW1lIGNvbnRhaW5lci5cIik7XG5cdFx0XHRcblx0XHRcdGNvbnN0IGNvbnRhaW5lciA9IGJyYW5jaDFbVHJ1dGhUYWxrLmNvbnRhaW5lcl0hO1xuXHRcdFx0Y29uc3QgaWR4MSA9IGNvbnRhaW5lci5jaGlsZHJlbi5pbmRleE9mKGJyYW5jaDEpO1xuXHRcdFx0Y29uc3QgaWR4MiA9IGNvbnRhaW5lci5jaGlsZHJlbi5pbmRleE9mKGJyYW5jaDIpO1xuXHRcdFx0Y29uc3QgaWR4TWF4ID0gTWF0aC5tYXgoaWR4MSwgaWR4Mik7XG5cdFx0XHRjb25zdCBpZHhNaW4gPSBNYXRoLm1pbihpZHgxLCBpZHgyKTtcblx0XHRcdGNvbnN0IHJlbW92ZWRNYXggPSBjb250YWluZXIucmVtb3ZlQ2hpbGQoaWR4TWF4KTtcblx0XHRcdGNvbnN0IHJlbW92ZWRNaW4gPSBjb250YWluZXIucmVtb3ZlQ2hpbGQoaWR4TWluKTtcblx0XHRcdFxuXHRcdFx0aWYgKCFyZW1vdmVkTWF4IHx8ICFyZW1vdmVkTWluKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJJbnRlcm5hbCBFcnJvci5cIik7XG5cdFx0XHRcblx0XHRcdGNvbnRhaW5lci5hZGRDaGlsZChyZW1vdmVkTWF4LCBpZHhNaW4pO1xuXHRcdFx0Y29udGFpbmVyLmFkZENoaWxkKHJlbW92ZWRNaW4sIGlkeE1heCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlcGxhY2VCcmFuY2goYnJhbmNoMTogQnJhbmNoLCBicmFuY2gyOiBCcmFuY2gpXG5cdFx0e1xuXHRcdFx0aWYgKGJyYW5jaDFbVHJ1dGhUYWxrLmNvbnRhaW5lcl0gPT09IG51bGwpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZXBsYWNlIHRvcC1sZXZlbCBicmFuY2hlcy5cIik7XG5cdFx0XHRcblx0XHRcdGNvbnN0IGNvbnRhaW5lciA9IGJyYW5jaDFbVHJ1dGhUYWxrLmNvbnRhaW5lcl0hO1xuXHRcdFx0Y29uc3QgaWR4ID0gY29udGFpbmVyLmNoaWxkcmVuLmluZGV4T2YoYnJhbmNoMSk7XG5cdFx0XHRjb250YWluZXIucmVtb3ZlQ2hpbGQoaWR4KTtcblx0XHRcdGNvbnRhaW5lci5hZGRDaGlsZChicmFuY2gyLCBpZHgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhdHRhY2hBdHRyaWJ1dGUoYnJhbmNoOiBCcmFuY2gsIGtleTogc3RyaW5nLCB2YWx1ZTogYW55KVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBzdXBwb3J0ZWQuXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRkZXRhY2hBdHRyaWJ1dGUoYnJhbmNoOiBCcmFuY2gsIGtleTogc3RyaW5nKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBzdXBwb3J0ZWQuXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhdHRhY2hSZWN1cnJlbnQoXG5cdFx0XHRraW5kOiBSZWZsZXguQ29yZS5SZWN1cnJlbnRLaW5kLFxuXHRcdFx0dGFyZ2V0OiBSZWZsZXguQ29yZS5JQnJhbmNoLFxuXHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdGNhbGxiYWNrOiBSZWZsZXguUmVjdXJyZW50Q2FsbGJhY2ssXG5cdFx0XHRyZXN0OiBhbnlbXSlcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3Qgc3VwcG9ydGVkLlwiKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZGV0YWNoUmVjdXJyZW50KFxuXHRcdFx0dGFyZ2V0OiBSZWZsZXguQ29yZS5JQnJhbmNoLFxuXHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdGNhbGxiYWNrOiBSZWZsZXguUmVjdXJyZW50Q2FsbGJhY2spXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IHN1cHBvcnRlZC5cIik7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59XG5cbi8qKlxuICogR2xvYmFsIGxpYnJhcnkgb2JqZWN0LlxuICovXG5jb25zdCB0dCA9IFJlZmxleC5Db3JlLmNyZWF0ZUJyYW5jaE5hbWVzcGFjZTxCYWNrZXIuVHJ1dGhUYWxrLk5hbWVzcGFjZSwgQmFja2VyLlRydXRoVGFsay5MaWJyYXJ5Pihcblx0bmV3IEJhY2tlci5UcnV0aFRhbGsuTGlicmFyeSgpLFxuXHR0cnVlKTtcblxuQmFja2VyLlRydXRoVGFsay50dCA9IHR0O1xuIiwiXG5uYW1lc3BhY2UgQmFja2VyXG57XG5cdFxuXHRleHBvcnQgY29uc3QgdHlwZU9mID0gU3ltYm9sKFwidHlwZU9mXCIpO1xuXHRleHBvcnQgY29uc3QgdmFsdWUgPSBTeW1ib2woXCJ2YWx1ZVwiKTtcblx0ZXhwb3J0IGNvbnN0IG5hbWUgPSBTeW1ib2woXCJuYW1lXCIpO1xuXHRleHBvcnQgY29uc3QgdmFsdWVzID0gU3ltYm9sKFwidmFsdWVzXCIpO1xuXHRleHBvcnQgY29uc3Qgc3VtID0gU3ltYm9sKFwic3VtXCIpO1xuXHRleHBvcnQgY29uc3QgcGFyZW50ID0gU3ltYm9sKFwicGFyZW50XCIpO1xuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJhc2U8VCwgUT4gZXh0ZW5kcyBUcnV0aFRhbGsuTGVhdmVzLlN1cnJvZ2F0ZVxuXHR7XG5cdFx0LyoqICovXG5cdFx0YWJzdHJhY3QgW25hbWVdOiBzdHJpbmcgfCBOYW1lO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFic3RyYWN0IFt2YWx1ZV06IFQ7XG5cdFx0LyoqICovXG5cdFx0YWJzdHJhY3QgW3N1bV06IHN0cmluZztcblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRbcGFyZW50XTogUSB8wqBudWxsO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvbnN0cnVjdG9yKHBhcmVudFZhbHVlOiBRIHwgbnVsbClcblx0XHR7XG5cdFx0XHRzdXBlcigpO1xuXHRcdFx0dGhpc1twYXJlbnRdID0gcGFyZW50VmFsdWU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENsaW1iIHRvIHJvb3Qgb2YgdGhpcyBTdHJ1Y3Rcblx0XHQgKi9cblx0XHRnZXQgcm9vdCgpOiBCYXNlPFQsIFE+IHzCoG51bGxcblx0XHR7XG5cdFx0XHRsZXQgcm9vdDogYW55ID0gdGhpcztcblx0XHRcdFxuXHRcdFx0d2hpbGUgKHJvb3QgJiYgcm9vdFtwYXJlbnRdKSBcblx0XHRcdFx0cm9vdCA9IHJvb3RbcGFyZW50XTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHJvb3Q7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHRvSlNPTigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXNbdmFsdWVdO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHR2YWx1ZU9mKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpc1t2YWx1ZV07XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHRvU3RyaW5nKCkgXG5cdFx0e1xuXHRcdFx0Y29uc3QgdmFsID0gdGhpc1t2YWx1ZV07XG5cdFx0XHRpZiAodmFsID09PSBudWxsKVxuXHRcdFx0XHRyZXR1cm4gdmFsO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gU3RyaW5nKHZhbCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdFtTeW1ib2wudG9QcmltaXRpdmVdKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpc1t2YWx1ZV07XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFwiUHJveHlcIjtcblx0XHR9XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBBZ2dyZWdhdGUgZXh0ZW5kcyBCYXNlPGFueSwgU3RydWN0W10+XG5cdHtcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRbcGFyZW50XTogU3RydWN0W107XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y29uc3RydWN0b3IocHVibGljIHZhbHVlOiBhbnksIGNvbnRhaW5lcnM6IFN0cnVjdFtdLCBwcml2YXRlIF9uYW1lOiBzdHJpbmcpXG5cdFx0e1xuXHRcdFx0c3VwZXIoY29udGFpbmVycyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBbdmFsdWVdKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy52YWx1ZTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IFtzdW1dKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy52YWx1ZS50b1N0cmluZygpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgW25hbWVdKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbmFtZSB8fMKgdGhpc1twYXJlbnRdLm1hcCh2ID0+IHZbbmFtZV0pLmpvaW4oXCIsXCIpO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIE5hbWUgZXh0ZW5kcyBCYXNlPHN0cmluZywgU3RydWN0PlxuXHR7XG5cdFx0LyoqICovXG5cdFx0Y29uc3RydWN0b3IocHVibGljIG5hbWU6IHN0cmluZywgY29udGFpbmVyOiBTdHJ1Y3QgfMKgbnVsbClcblx0XHR7XG5cdFx0XHRzdXBlcihjb250YWluZXIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgW3ZhbHVlXSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMubmFtZTtcblx0XHR9XG5cdFx0XG5cdFx0Z2V0IFtzdW1dKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5uYW1lLnRvU3RyaW5nKCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBbbmFtZV0oKVxuXHRcdHtcblx0XHRcdHJldHVybiBcIm5hbWVcIjtcblx0XHR9XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBTdHJ1Y3QgZXh0ZW5kcyBCYXNlPGFueSwgU3RydWN0IHwgU3Vycm9nYXRlPlxuXHR7XG5cdFx0LyoqXG5cdFx0ICogR2VuZXJhdGUgYSBTdHJ1Y3QvU3Vycm9nYXRlIGZyb20gQmFja2VyLlR5cGVcblx0XHQgKi9cblx0XHRzdGF0aWMgbmV3KHR5cGU6IFRydXRoLlR5cGUsIHBhcmVudFZhbHVlOiBTdHJ1Y3QgfMKgU3Vycm9nYXRlIHwgbnVsbClcblx0XHR7XG5cdFx0XHRjb25zdCBjb25zdHIgPSBwYXJlbnRWYWx1ZSA/IFxuXHRcdFx0XHRwYXJlbnRWYWx1ZSBpbnN0YW5jZW9mIFN1cnJvZ2F0ZSA/XG5cdFx0XHRcdFN1cnJvZ2F0ZSA6IFN0cnVjdCA6IFN0cnVjdDtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIG5ldyBjb25zdHIodHlwZSwgcGFyZW50VmFsdWUpO1xuXHRcdH1cblx0XHRcblx0XHRyZWFkb25seSBbdHlwZU9mXTogVHJ1dGguVHlwZTtcblx0XHRyZWFkb25seSBbbmFtZV06IE5hbWU7XG5cdFx0cmVhZG9ubHkgW3BhcmVudF06IFN0cnVjdCB8IG51bGw7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IFt2YWx1ZXNdKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpc1t0eXBlT2ZdLnZhbHVlcyB8fMKgW107XG5cdFx0fVxuXHRcdFxuXHRcdGdldCBbc3VtXSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXNbdmFsdWVdPy50b1N0cmluZygpIHx8IHRoaXNbQmFja2VyLnZhbHVlc10ubWFwKHYgPT4gdi52YWx1ZSkuam9pbihcIiwgXCIpO1xuXHRcdH1cblx0XHRcblx0XHRnZXQgdGV4dCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXNbQmFja2VyLm5hbWVdLm5hbWUgfHzCoFwiXCI7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBbdmFsdWVdKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpc1t0eXBlT2ZdLnZhbHVlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRjb25zdHJ1Y3Rvcih0eXBlOiBUcnV0aC5UeXBlLCBwYXJlbnRWYWx1ZTogU3RydWN0IHwgbnVsbClcblx0XHR7XG5cdFx0XHRzdXBlcihwYXJlbnRWYWx1ZSk7XG5cdFx0XHR0aGlzW3R5cGVPZl0gPSB0eXBlO1xuXHRcdFx0dGhpc1twYXJlbnRdID0gcGFyZW50VmFsdWU7XG5cdFx0XHR0aGlzW25hbWVdID0gbmV3IE5hbWUodHlwZS5uYW1lLCB0aGlzKTtcblx0XHRcdFxuXHRcdFx0VXRpbC5zaGFkb3dzKHRoaXMsIGZhbHNlLCB0eXBlT2YsIG5hbWUsIFRydXRoVGFsay5vcCwgcGFyZW50LCBUcnV0aFRhbGsuY29udGFpbmVyKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiB0eXBlLmlubmVycylcblx0XHRcdFx0KDxhbnk+dGhpcylbY2hpbGQubmFtZS5yZXBsYWNlKC9bXlxcZFxcd10vZ20sICgpID0+IFwiX1wiKV0gPSBTdHJ1Y3QubmV3KGNoaWxkLCB0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVHlwZXNjcmlwdCB0eXBlIGFkanVzdG1lbnQgXG5cdFx0ICovXG5cdFx0Z2V0IHByb3h5KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcyBhcyB1bmtub3duIGFzIFN0cnVjdCAmIFJlY29yZDxzdHJpbmcsIFN0cnVjdD47XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBjb250ZW50cygpOiBTdHJ1Y3RbXVxuXHRcdHtcblx0XHRcdHJldHVybiBPYmplY3QudmFsdWVzKHRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRpbnN0YW5jZW9mKGJhc2U6IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm7CoHRoaXNbdHlwZU9mXS5pcyhiYXNlKTsgXG5cdFx0fTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRpcyhiYXNlOiBUcnV0aC5UeXBlIHwgU3RydWN0KVxuXHRcdHtcblx0XHRcdGJhc2UgPSBiYXNlIGluc3RhbmNlb2YgVHJ1dGguVHlwZSA/IGJhc2UgOiBiYXNlW3R5cGVPZl07XG5cdFx0XHRyZXR1cm4gdGhpc1t0eXBlT2ZdLmlzKGJhc2UpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRbU3ltYm9sLmhhc0luc3RhbmNlXSh2YWx1ZTogYW55KVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmluc3RhbmNlb2YodmFsdWUpO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIFN1cnJvZ2F0ZTxUID0gc3RyaW5nPiBleHRlbmRzIFN0cnVjdFxuXHR7XG5cdFx0cmVhZG9ubHkgW25hbWVdOiBOYW1lO1xuXHRcdHJlYWRvbmx5IFtwYXJlbnRdOiBTdXJyb2dhdGUgfCBudWxsO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBjb250ZW50cygpOiBTdXJyb2dhdGVbXVxuXHRcdHtcblx0XHRcdHJldHVybiBPYmplY3QudmFsdWVzKHRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgYmFzZXMoKTogU3RydWN0W11cblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpc1t0eXBlT2ZdLmJhc2VzLm1hcCh4ID0+IEJhY2tlci5TY2hlbWFbeC5uYW1lXSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGluc3RhbmNlb2YoYmFzZTogYW55KVxuXHRcdHtcblx0XHRcdHJldHVybiAodGhpc1t2YWx1ZV0gYXMgYW55KSBpbnN0YW5jZW9mIGJhc2UgfHzCoHRoaXNbdHlwZU9mXS5pcyhiYXNlKTsgXG5cdFx0fTtcblx0XHRcblx0XHRnZXQgW0JhY2tlci52YWx1ZV0oKVxuXHRcdHtcblx0XHRcdGxldCB2YWx1ZTogYW55ID0gdGhpc1tCYWNrZXIudHlwZU9mXS52YWx1ZTtcblx0XHRcdGlmICghdmFsdWUgJiYgdGhpc1tCYWNrZXIudHlwZU9mXS52YWx1ZXMubGVuZ3RoKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB2ID0gdGhpc1tCYWNrZXIudHlwZU9mXS52YWx1ZXNbMF07XG5cdFx0XHRcdGlmICh2LmFsaWFzZWQpXG5cdFx0XHRcdFx0dmFsdWUgPSB2LnZhbHVlO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0dmFsdWUgPSBCYWNrZXIuU2NoZW1hW3YudmFsdWVdO1xuXHRcdFx0XHRcblx0XHRcdH1cblx0XHRcdHJldHVybiB2YWx1ZTsgXG5cdFx0fVxuXHRcdFxuXHRcdGdldCB0ZXh0KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpc1tCYWNrZXIudHlwZU9mXS52YWx1ZSB8fCB0aGlzW0JhY2tlci50eXBlT2ZdLnZhbHVlc1swXT8udmFsdWUgfHzCoFwiXCI7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiBcblx0XHQgKiBHZXQgbmVzdGVkIHByb3BlcnR5IHdpdGggbWF0Y2hpbmcgU3RydWN0XG5cdFx0Ki9cblx0XHRnZXQodHlwZTogU3RydWN0KTogU3Vycm9nYXRlIHzCoG51bGxcblx0XHR7XG5cdFx0XHRjb25zdCByZWN1cnNpdmUgPSAob2JqOiBTdXJyb2dhdGUpOiBTdXJyb2dhdGUgfCBudWxsID0+IFxuXHRcdFx0e1xuXHRcdFx0XHRpZiAob2JqW3R5cGVPZl0ucGFyYWxsZWxSb290cy5zb21lKHggPT4geCA9PT0gdHlwZVt0eXBlT2ZdKSlcblx0XHRcdFx0XHRyZXR1cm4gb2JqO1xuXHRcdFx0XHRcblx0XHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiBvYmouY29udGVudHMpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCByZXMgPSByZWN1cnNpdmUoY2hpbGQpO1x0XG5cdFx0XHRcdFx0aWYgKHJlcylcblx0XHRcdFx0XHRcdHJldHVybiByZXM7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHJlY3Vyc2l2ZSg8YW55PnRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHR0b0pTT04oKTogYW55IFxuXHRcdHsgXG5cdFx0XHRjb25zdCB2YWwgPSB0aGlzW3ZhbHVlXTtcblx0XHRcdGNvbnN0IHByaW1pdGl2ZSA9IHZhbCA/IHRoaXNbdHlwZU9mXS52YWx1ZXMudG9TdHJpbmcoKSA6IHVuZGVmaW5lZDtcblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMuY29udGVudHMubGVuZ3RoID09PSAwKVxuXHRcdFx0XHRyZXR1cm4gcHJpbWl0aXZlO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBPYmo6IFJlY29yZDxzdHJpbmcsIFN1cnJvZ2F0ZSB8IFQ+ICYgeyAkOiBhbnkgfSA9IDxhbnk+T2JqZWN0LmFzc2lnbih7fSwgdGhpcyk7XG5cdFx0XHRyZXR1cm4gT2JqOyBcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0dG9TdHJpbmcoaW5kZW50ID0gMClcblx0XHR7XG5cdFx0XHRsZXQgYmFzZSA9IHRoaXNbdHlwZU9mXS5uYW1lO1xuXHRcdFx0Y29uc3QgcHJpbWl0aXZlID0gdGhpc1t2YWx1ZV0gPyB0aGlzW3ZhbHVlc10ubWFwKHYgPT4gdi52YWx1ZS50b1N0cmluZygpKS5maWx0ZXIodiA9PiB2ICE9PSBiYXNlKSA6IHVuZGVmaW5lZDtcblx0XHRcdFxuXHRcdFx0aWYgKHByaW1pdGl2ZSkgXG5cdFx0XHRcdGJhc2UgKz0gYDogJHtwcmltaXRpdmUuam9pbihcIiwgXCIpfWA7XG5cdFx0XHRcblx0XHRcdGlmICh0aGlzLmNvbnRlbnRzLmxlbmd0aCA+IDApXG5cdFx0XHRcdGJhc2UgKz0gdGhpcy5jb250ZW50cy5tYXAoeCA9PiBcIlxcblwiICsgeC50b1N0cmluZyhpbmRlbnQgKyAxKSkuam9pbihcIlwiKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIFwiXFx0XCIucmVwZWF0KGluZGVudCkgKyBiYXNlO1xuXHRcdH1cblx0fVxufSIsIlxubmFtZXNwYWNlIEJhY2tlci5VdGlsXG57XHRcblx0ZXhwb3J0IGNvbnN0IEhlYWRlcnMgPSBgXG5hbnlcbm9iamVjdCA6IGFueVxuc3RyaW5nIDogYW55XG5udW1iZXIgOiBhbnlcbmJpZ2ludCA6IGFueVxuYm9vbGVhbiA6IGFueVxuXG4vXCIuK1wiIDogc3RyaW5nXG4vKFxcXFwrfC0pPygoWzEtOV1cXFxcZHswLDE3fSl8KFsxLThdXFxcXGR7MTh9KXwoOVswMV1cXFxcZHsxN30pKSA6IG51bWJlclxuLygwfChbMS05XVswLTldKikpIDogYmlnaW50XG4vKHRydWV8ZmFsc2UpIDogYm9vbGVhblxuXHRgO1xuXHRcblx0LyoqXG5cdCAqIE1ha2UgYSBwcm9wZXJ0eSAobm9uLSllbnVtZXJhYmxlXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gc2hhZG93KG9iamVjdDogb2JqZWN0LCBrZXk6IHN0cmluZyB8IHN5bWJvbCwgZW51bWVyYWJsZSA9IGZhbHNlKVxuXHR7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwga2V5LCB7XG5cdFx0XHRlbnVtZXJhYmxlXG5cdFx0fSk7XG5cdH1cblx0LyoqXG5cdCAqIE1ha2UgYSBwcm9wZXJ0aWVzIChub24tKWVudW1lcmFibGVcblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBzaGFkb3dzKG9iamVjdDogb2JqZWN0LCBlbnVtZXJhYmxlID0gZmFsc2UsIC4uLmtleXM6IEFycmF5PHN0cmluZyB8wqBzeW1ib2w+KVxuXHR7XG5cdFx0Zm9yIChsZXQga2V5IG9mIGtleXMpXG5cdFx0XHRzaGFkb3cob2JqZWN0LCBrZXksIGVudW1lcmFibGUpO1xuXHR9XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZEZpbGUoY29udGVudDogc3RyaW5nLCBwYXR0ZXJuOiBSZWdFeHApXG5cdHtcblx0XHRjb25zdCBkb2MgPSBhd2FpdCBUcnV0aC5wYXJzZShIZWFkZXJzICsgY29udGVudCk7XG5cdFx0XG5cdFx0aWYgKGRvYyBpbnN0YW5jZW9mIEVycm9yKVxuXHRcdFx0dGhyb3cgZG9jO1xuXHRcdFxuXHRcdGRvYy5wcm9ncmFtLnZlcmlmeSgpO1xuXHRcdGNvbnN0IGZhdWx0cyA9IEFycmF5LmZyb20oZG9jLnByb2dyYW0uZmF1bHRzLmVhY2goKSk7XG5cdFx0XG5cdFx0aWYgKGZhdWx0cy5sZW5ndGgpIFxuXHRcdHtcdFx0XHRcblx0XHRcdGZvciAoY29uc3QgZmF1bHQgb2YgZmF1bHRzKVxuXHRcdFx0XHRjb25zb2xlLmVycm9yKGZhdWx0LnRvU3RyaW5nKCkpO1xuXHRcdFx0XG5cdFx0XHR0aHJvdyBmYXVsdHNbMF0udG9TdHJpbmcoKTtcblx0XHR9XG5cdFx0Y29uc3QgcHJvZ3JhbSA9IG5ldyBQcm9ncmFtKGRvYywgcGF0dGVybik7XG5cdFx0XG5cdFx0cmV0dXJuIHByb2dyYW07XG5cdH1cbn0iLCJcbm5hbWVzcGFjZSBCYWNrZXIgXG57XG59Il19