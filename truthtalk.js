"use strict";
var Backer;
(function (Backer) {
    var TruthTalk;
    (function (TruthTalk) {
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
                this._container = null;
            }
            /** */
            get container() {
                return this._container;
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
                child._container = this;
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
                    removed._container = null;
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
            /** */
            class Query extends Branch {
                constructor() {
                    super(...arguments);
                    this.op = BranchOp.query;
                }
            }
            Branches.Query = Query;
            /** */
            class Is extends Branch {
                constructor() {
                    super(...arguments);
                    this.op = BranchOp.is;
                }
            }
            Branches.Is = Is;
            /** */
            class Has extends Branch {
                constructor() {
                    super(...arguments);
                    this.op = BranchOp.has;
                }
            }
            Branches.Has = Has;
            /** */
            class Not extends Branch {
                constructor() {
                    super(...arguments);
                    this.op = BranchOp.not;
                }
            }
            Branches.Not = Not;
            /** */
            class Or extends Branch {
                constructor() {
                    super(...arguments);
                    this.op = BranchOp.or;
                }
            }
            Branches.Or = Or;
        })(Branches = TruthTalk.Branches || (TruthTalk.Branches = {}));
        /** */
        let Leaves;
        (function (Leaves_1) {
            /** */
            class Predicate extends Leaf {
                constructor(op, operand) {
                    super();
                    this.op = op;
                    this.operand = operand;
                }
            }
            Leaves_1.Predicate = Predicate;
            /** */
            class Slice extends Leaf {
                constructor(start, end) {
                    super();
                    this.start = start;
                    this.end = end;
                    this.op = LeafOp.slice;
                }
            }
            Leaves_1.Slice = Slice;
            /** */
            class Occurences extends Leaf {
                constructor(min, max = min) {
                    super();
                    this.min = min;
                    this.max = max;
                    this.op = LeafOp.occurences;
                }
            }
            Leaves_1.Occurences = Occurences;
            /** */
            class Aliased extends Leaf {
                constructor() {
                    super(...arguments);
                    this.op = LeafOp.aliased;
                }
            }
            Leaves_1.Aliased = Aliased;
            /** */
            class Leaves extends Leaf {
                constructor() {
                    super(...arguments);
                    this.op = LeafOp.leaves;
                }
            }
            Leaves_1.Leaves = Leaves;
            /** */
            class Fresh extends Leaf {
                constructor() {
                    super(...arguments);
                    this.op = LeafOp.fresh;
                }
            }
            Leaves_1.Fresh = Fresh;
            /** */
            class Terminals extends Leaf {
                constructor() {
                    super(...arguments);
                    this.op = LeafOp.terminals;
                }
            }
            Leaves_1.Terminals = Terminals;
            /** */
            class Sort extends Leaf {
                constructor(...contentTypes) {
                    super();
                    this.op = LeafOp.sort;
                    this.contentTypes = contentTypes;
                }
            }
            Leaves_1.Sort = Sort;
            /** */
            class Reverse extends Leaf {
                constructor() {
                    super(...arguments);
                    this.op = LeafOp.reverse;
                }
            }
            Leaves_1.Reverse = Reverse;
            /** */
            class Surrogate extends Leaf {
                constructor() {
                    super(...arguments);
                    this.op = LeafOp.surrogate;
                }
            }
            Leaves_1.Surrogate = Surrogate;
            class Containers extends Leaf {
                constructor() {
                    super(...arguments);
                    this.op = LeafOp.containers;
                }
            }
            Leaves_1.Containers = Containers;
            class Roots extends Leaf {
                constructor() {
                    super(...arguments);
                    this.op = LeafOp.roots;
                }
            }
            Leaves_1.Roots = Roots;
            class Contents extends Leaf {
                constructor() {
                    super(...arguments);
                    this.op = LeafOp.contents;
                }
            }
            Leaves_1.Contents = Contents;
        })(Leaves = TruthTalk.Leaves || (TruthTalk.Leaves = {}));
    })(TruthTalk = Backer.TruthTalk || (Backer.TruthTalk = {}));
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
                return branch instanceof TruthTalk.Branch && branch.container !== null;
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
                if (branch1.container === null || branch2.container === null)
                    throw new Error("Cannot swap top-level branches.");
                if (branch1.container !== branch2.container)
                    throw new Error("Can only swap branches from the same container.");
                const container = branch1.container;
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
                if (branch1.container === null)
                    throw new Error("Cannot replace top-level branches.");
                const container = branch1.container;
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
/// <reference path="../../../Reflex/ReflexCore/build/reflex-core.d.ts" />
/// <reference path="Definitions.ts" />
/// <reference path="Node.ts" />
/// <reference path="Library.ts" />
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1dGh0YWxrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc291cmNlL0RlZmluaXRpb25zLnRzIiwiLi4vc291cmNlL05vZGUudHMiLCIuLi9zb3VyY2UvTGlicmFyeS50cyIsIi4uL3NvdXJjZS9ALnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUNDQSxJQUFVLE1BQU0sQ0E2UGY7QUE3UEQsV0FBVSxNQUFNO0lBQUMsSUFBQSxTQUFTLENBNlB6QjtJQTdQZ0IsV0FBQSxTQUFTO1FBRXpCLE1BQU07UUFDTixJQUFZLFFBT1g7UUFQRCxXQUFZLFFBQVE7WUFFbkIseUNBQVMsQ0FBQTtZQUNULG1DQUFNLENBQUE7WUFDTixxQ0FBTyxDQUFBO1lBQ1AscUNBQU8sQ0FBQTtZQUNQLG1DQUFNLENBQUE7UUFDUCxDQUFDLEVBUFcsUUFBUSxHQUFSLGtCQUFRLEtBQVIsa0JBQVEsUUFPbkI7UUFFRCxNQUFNO1FBQ04sSUFBWSxXQVlYO1FBWkQsV0FBWSxXQUFXO1lBRXRCLGtEQUFXLENBQUE7WUFDWCw0REFBZ0IsQ0FBQTtZQUNoQiw0RUFBd0IsQ0FBQTtZQUN4QixzREFBYSxDQUFBO1lBQ2Isc0VBQXFCLENBQUE7WUFDckIsZ0RBQVUsQ0FBQTtZQUNWLDBEQUFlLENBQUE7WUFDZixzREFBYyxDQUFBO1lBQ2Qsc0RBQWEsQ0FBQTtZQUNiLG9EQUFZLENBQUE7UUFDYixDQUFDLEVBWlcsV0FBVyxHQUFYLHFCQUFXLEtBQVgscUJBQVcsUUFZdEI7UUFFRCxNQUFNO1FBQ04sSUFBWSxNQWVYO1FBZkQsV0FBWSxNQUFNO1lBRWpCLDhDQUFjLENBQUE7WUFDZCxzQ0FBVSxDQUFBO1lBQ1YsZ0RBQWUsQ0FBQTtZQUNmLDBDQUFZLENBQUE7WUFDWiw4Q0FBYyxDQUFBO1lBQ2Qsb0NBQVMsQ0FBQTtZQUNULDBDQUFZLENBQUE7WUFDWiw4Q0FBYyxDQUFBO1lBQ2QsZ0RBQWUsQ0FBQTtZQUNmLHNDQUFVLENBQUE7WUFDViw0Q0FBYSxDQUFBO1lBQ2Isd0NB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RUFDL0IsTUFBMkIsRUFDM0IsUUFBYSxFQUNiLFFBQXVDLEVBQ3ZDLElBQVc7Z0JBRVgsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUNsQyxPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7WUFFRCxNQUFNO1lBQ04sZUFBZSxDQUNkLE1BQTJCLEVBQzNCLFFBQWEsRUFDYixRQUF1QztnQkFFdkMsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUNsQyxPQUFPLEtBQUssQ0FBQztZQUNkLENBQUM7U0FDRDtRQTVKWSxpQkFBTyxVQTRKbkIsQ0FBQTtJQUNGLENBQUMsRUEvSmdCLFNBQVMsR0FBVCxnQkFBUyxLQUFULGdCQUFTLFFBK0p6QjtBQUFELENBQUMsRUEvSlMsTUFBTSxLQUFOLE1BQU0sUUErSmY7QUFFRDs7R0FFRztBQUNILE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQzlDLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFDOUIsSUFBSSxDQUFDLENBQUM7QUN2S1AsMEVBQTBFO0FBQzFFLHVDQUF1QztBQUN2QyxnQ0FBZ0M7QUFDaEMsbUNBQW1DIiwic291cmNlc0NvbnRlbnQiOlsiXG5uYW1lc3BhY2UgQmFja2VyLlRydXRoVGFsa1xue1xuXHRleHBvcnQgdHlwZSBBdG9taWMgPSBSZWZsZXguQ29yZS5BdG9taWM8Tm9kZSwgQnJhbmNoPjtcblx0ZXhwb3J0IHR5cGUgQXRvbWljcyA9IFJlZmxleC5Db3JlLkF0b21pY3M8Tm9kZSwgQnJhbmNoPjtcblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgaW50ZXJmYWNlIE5hbWVzcGFjZSBleHRlbmRzXG5cdFx0UmVmbGV4LkNvcmUuSUNvbnRhaW5lck5hbWVzcGFjZTxBdG9taWNzLCBCcmFuY2hlcy5RdWVyeT5cblx0e1xuXHRcdC8qKiAqL1xuXHRcdGlzKC4uLmF0b21pY3M6IEF0b21pY3NbXSk6IEJyYW5jaGVzLklzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGhhcyguLi5hdG9taWNzOiBBdG9taWNzW10pOiBCcmFuY2hlcy5IYXM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bm90KC4uLmF0b21pY3M6IEF0b21pY3NbXSk6IEJyYW5jaGVzLk5vdDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRvciguLi5hdG9taWNzOiBBdG9taWNzW10pOiBCcmFuY2hlcy5Pcjtcblx0XHRcblx0XHQvKiogKi9cblx0XHRjb250YWluZXJzKCk6IExlYXZlcy5Db250YWluZXJzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJvb3QoKTogTGVhdmVzLlJvb3RzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvbnRlbnRzKCk6IExlYXZlcy5Db250ZW50cztcblx0XHRcblx0XHQvKiogKi9cblx0XHRlcXVhbHModmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4pOiBMZWF2ZXMuUHJlZGljYXRlO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdyZWF0ZXJUaGFuKHZhbHVlOiBzdHJpbmcgfCBudW1iZXIpOiBMZWF2ZXMuUHJlZGljYXRlO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGxlc3NUaGFuKHZhbHVlOiBzdHJpbmcgfCBudW1iZXIpOiBMZWF2ZXMuUHJlZGljYXRlO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHN0YXJ0c1dpdGgodmFsdWU6IHN0cmluZyB8IG51bWJlcik6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZW5kc1dpdGgodmFsdWU6IHN0cmluZyB8IG51bWJlcik6IExlYXZlcy5QcmVkaWNhdGU7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YWxpYXNlZCgpOiBMZWF2ZXMuQWxpYXNlZDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRsZWF2ZXMoKTogTGVhdmVzLkxlYXZlcztcblx0XHRcblx0XHQvKiogKi9cblx0XHRmcmVzaCgpOiBMZWF2ZXMuRnJlc2g7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c2xpY2Uoc3RhcnQ6IG51bWJlciwgZW5kPzogbnVtYmVyKTogTGVhdmVzLlNsaWNlO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdG9jY3VyZW5jZXMobWluOiBudW1iZXIsIG1heD86IG51bWJlcik6IExlYXZlcy5PY2N1cmVuY2VzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHNvcnQoLi4uY29udGVudFR5cGVzOiBPYmplY3RbXSk6IExlYXZlcy5Tb3J0O1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJldmVyc2UoKTogTGVhdmVzLlJldmVyc2U7XG5cdFx0XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIEJhY2tlci5UcnV0aFRhbGtcbntcblx0LyoqICovXG5cdGV4cG9ydCBlbnVtIEJyYW5jaE9wXG5cdHtcblx0XHRxdWVyeSA9IDEsXG5cdFx0aXMgPSAyLFxuXHRcdGhhcyA9IDMsXG5cdFx0bm90ID0gNCxcblx0XHRvciA9IDUsXG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgZW51bSBQcmVkaWNhdGVPcFxuXHR7XG5cdFx0ZXF1YWxzID0gMzAsXG5cdFx0Z3JlYXRlclRoYW4gPSAzMSxcblx0XHRncmVhdGVyVGhhbk9yRXF1YWxzID0gMzIsXG5cdFx0bGVzc1RoYW4gPSAzMyxcblx0XHRsZXNzVGhhbk9yRXF1YWxzID0gMzQsXG5cdFx0YWxpa2UgPSAzNSxcblx0XHRzdGFydHNXaXRoID0gMzYsXG5cdFx0ZW5kc1dpdGggID0gMzcsXG5cdFx0aW5jbHVkZXMgPSAzOCxcblx0XHRtYXRjaGVzID0gMzlcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBlbnVtIExlYWZPcFxuXHR7XG5cdFx0cHJlZGljYXRlID0gNjAsXG5cdFx0c2xpY2UgPSA2MSxcblx0XHRvY2N1cmVuY2VzID0gNjIsXG5cdFx0YWxpYXNlZCA9IDYzLFxuXHRcdHRlcm1pbmFscyA9IDY0LFxuXHRcdHNvcnQgPSA2NSxcblx0XHRyZXZlcnNlID0gNjYsXG5cdFx0c3Vycm9nYXRlID0gNjcsXG5cdFx0Y29udGFpbmVycyA9IDY4LFxuXHRcdHJvb3RzID0gNjksXG5cdFx0Y29udGVudHMgPSA3MCxcblx0XHRsZWF2ZXMgPSA3MSxcblx0XHRmcmVzaCA9IDcyXG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgdHlwZSBOb2RlT3AgPVxuXHRcdEJyYW5jaE9wIHwgXG5cdFx0TGVhZk9wIHxcblx0XHRQcmVkaWNhdGVPcDtcblx0XG5cdC8vIyBBYnN0cmFjdCBDbGFzc2VzXG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGFic3RyYWN0IGNsYXNzIE5vZGVcblx0e1xuXHRcdGFic3RyYWN0IHJlYWRvbmx5IG9wOiBOb2RlT3A7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IGNvbnRhaW5lcigpOiBCcmFuY2ggfCBudWxsXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NvbnRhaW5lcjtcblx0XHR9XG5cdFx0cHJpdmF0ZSBfY29udGFpbmVyOiBCcmFuY2ggfCBudWxsID0gbnVsbDtcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCcmFuY2ggZXh0ZW5kcyBOb2RlXG5cdHtcblx0XHQvKiogKi9cblx0XHRhZGRDaGlsZChjaGlsZDogTm9kZSwgcG9zaXRpb24gPSAtMSlcblx0XHR7XG5cdFx0XHQoPGFueT5jaGlsZCkuX2NvbnRhaW5lciA9IHRoaXM7XG5cdFx0XHRcblx0XHRcdGlmIChwb3NpdGlvbiA9PT0gLTEpXG5cdFx0XHRcdHJldHVybiB2b2lkIHRoaXMuX2NoaWxkcmVuLnB1c2goY2hpbGQpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBhdCA9IHRoaXMuX2NoaWxkcmVuLmxlbmd0aCAtIHBvc2l0aW9uICsgMTtcblx0XHRcdHRoaXMuX2NoaWxkcmVuLnNwbGljZShhdCwgMCwgY2hpbGQpO1xuXHRcdFx0cmV0dXJuIGNoaWxkO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRyZW1vdmVDaGlsZChjaGlsZDogTm9kZSk6IE5vZGUgfCBudWxsO1xuXHRcdHJlbW92ZUNoaWxkKGNoaWxkSWR4OiBudW1iZXIpIDogTm9kZXwgbnVsbDtcblx0XHRyZW1vdmVDaGlsZChwYXJhbTogTm9kZSB8IG51bWJlcilcblx0XHR7XG5cdFx0XHRjb25zdCBjaGlsZElkeCA9IHBhcmFtIGluc3RhbmNlb2YgTm9kZSA/XG5cdFx0XHRcdHRoaXMuX2NoaWxkcmVuLmluZGV4T2YocGFyYW0pIDpcblx0XHRcdFx0cGFyYW07XG5cdFx0XHRcblx0XHRcdGlmIChjaGlsZElkeCA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHJlbW92ZWQgPSB0aGlzLl9jaGlsZHJlbi5zcGxpY2UoY2hpbGRJZHgsIDEpWzBdO1xuXHRcdFx0XHQoPGFueT5yZW1vdmVkKS5fY29udGFpbmVyID0gbnVsbDtcblx0XHRcdFx0cmV0dXJuIHJlbW92ZWQ7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgY2hpbGRyZW4oKTogcmVhZG9ubHkgKEJyYW5jaCB8IExlYWYpW11cblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2hpbGRyZW47XG5cdFx0fVxuXHRcdHByaXZhdGUgcmVhZG9ubHkgX2NoaWxkcmVuOiAoQnJhbmNoIHwgTGVhZilbXSA9IFtdO1xuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGFic3RyYWN0IGNsYXNzIExlYWYgZXh0ZW5kcyBOb2RlIHsgfVxuXHRcblx0Ly8jIENvbmNyZXRlIENsYXNzZXNcblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgbmFtZXNwYWNlIEJyYW5jaGVzXG5cdHtcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgUXVlcnkgZXh0ZW5kcyBCcmFuY2hcblx0XHR7XG5cdFx0XHRyZWFkb25seSBvcCA9IEJyYW5jaE9wLnF1ZXJ5O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgSXMgZXh0ZW5kcyBCcmFuY2hcblx0XHR7XG5cdFx0XHRyZWFkb25seSBvcCA9IEJyYW5jaE9wLmlzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgSGFzIGV4dGVuZHMgQnJhbmNoXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgb3AgPSBCcmFuY2hPcC5oYXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV4cG9ydCBjbGFzcyBOb3QgZXh0ZW5kcyBCcmFuY2hcblx0XHR7XG5cdFx0XHRyZWFkb25seSBvcCA9IEJyYW5jaE9wLm5vdDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIE9yIGV4dGVuZHMgQnJhbmNoXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgb3AgPSBCcmFuY2hPcC5vcjtcblx0XHR9XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgbmFtZXNwYWNlIExlYXZlc1xuXHR7XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFByZWRpY2F0ZSBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdFx0cmVhZG9ubHkgb3A6IFByZWRpY2F0ZU9wLFxuXHRcdFx0XHRyZWFkb25seSBvcGVyYW5kOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuKVxuXHRcdFx0e1xuXHRcdFx0XHRzdXBlcigpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgU2xpY2UgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRcdHJlYWRvbmx5IHN0YXJ0OiBudW1iZXIsIFxuXHRcdFx0XHRyZWFkb25seSBlbmQ/OiBudW1iZXIpXG5cdFx0XHR7XG5cdFx0XHRcdHN1cGVyKCk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJlYWRvbmx5IG9wID0gTGVhZk9wLnNsaWNlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgT2NjdXJlbmNlcyBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdFx0cmVhZG9ubHkgbWluOiBudW1iZXIsXG5cdFx0XHRcdHJlYWRvbmx5IG1heDogbnVtYmVyID0gbWluKVxuXHRcdFx0e1xuXHRcdFx0XHRzdXBlcigpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZWFkb25seSBvcCA9IExlYWZPcC5vY2N1cmVuY2VzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgQWxpYXNlZCBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBvcCA9IExlYWZPcC5hbGlhc2VkO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgTGVhdmVzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IG9wID0gTGVhZk9wLmxlYXZlcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIEZyZXNoIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IG9wID0gTGVhZk9wLmZyZXNoO1xuXHRcdH1cblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgVGVybWluYWxzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IG9wID0gTGVhZk9wLnRlcm1pbmFscztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXhwb3J0IGNsYXNzIFNvcnQgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0XG5cdFx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdFx0Li4uY29udGVudFR5cGVzOiBPYmplY3RbXSlcblx0XHRcdHtcblx0XHRcdFx0c3VwZXIoKTtcblx0XHRcdFx0dGhpcy5jb250ZW50VHlwZXMgPSBjb250ZW50VHlwZXM7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJlYWRvbmx5IGNvbnRlbnRUeXBlczogT2JqZWN0W107XG5cdFx0XHRyZWFkb25seSBvcCA9IExlYWZPcC5zb3J0O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgUmV2ZXJzZSBleHRlbmRzIExlYWZcblx0XHR7XG5cdFx0XHRyZWFkb25seSBvcCA9IExlYWZPcC5yZXZlcnNlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRleHBvcnQgY2xhc3MgU3Vycm9nYXRlIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IG9wID0gTGVhZk9wLnN1cnJvZ2F0ZTtcblx0XHR9XG5cdFx0XG5cdFx0ZXhwb3J0IGNsYXNzIENvbnRhaW5lcnMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgb3AgPSBMZWFmT3AuY29udGFpbmVycztcblx0XHR9XG5cdFx0XG5cdFx0ZXhwb3J0IGNsYXNzIFJvb3RzIGV4dGVuZHMgTGVhZlxuXHRcdHtcblx0XHRcdHJlYWRvbmx5IG9wID0gTGVhZk9wLnJvb3RzO1xuXHRcdH1cblx0XHRcblx0XHRleHBvcnQgY2xhc3MgQ29udGVudHMgZXh0ZW5kcyBMZWFmXG5cdFx0e1xuXHRcdFx0cmVhZG9ubHkgb3AgPSBMZWFmT3AuY29udGVudHM7XG5cdFx0fVxuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBCYWNrZXIuVHJ1dGhUYWxrXG57XG5cdGV4cG9ydCBjbGFzcyBMaWJyYXJ5IGltcGxlbWVudHMgUmVmbGV4LkNvcmUuSUxpYnJhcnlcblx0e1xuXHRcdC8qKiAqL1xuXHRcdGlzS25vd25MZWFmKGxlYWY6IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gbGVhZiBpbnN0YW5jZW9mIE5vZGU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGlzS25vd25CcmFuY2goYnJhbmNoOiBCcmFuY2gpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGJyYW5jaCBpbnN0YW5jZW9mIE5vZGU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGlzQnJhbmNoRGlzcG9zZWQoYnJhbmNoOiBSZWZsZXguQ29yZS5JQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiBicmFuY2ggaW5zdGFuY2VvZiBCcmFuY2ggJiYgYnJhbmNoLmNvbnRhaW5lciAhPT0gbnVsbDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0U3RhdGljQnJhbmNoZXMoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGJyYW5jaGVzOiBhbnkgPSB7fTtcblx0XHRcdFxuXHRcdFx0T2JqZWN0LmVudHJpZXMoQnJhbmNoZXMpLmZvckVhY2goKFticmFuY2hOYW1lLCBicmFuY2hDdG9yXSkgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgbmFtZSA9IGJyYW5jaE5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0YnJhbmNoZXNbbmFtZV0gPSAoKSA9PiBuZXcgYnJhbmNoQ3RvcigpO1xuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBicmFuY2hlcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0U3RhdGljTm9uQnJhbmNoZXMoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGxlYXZlczogYW55ID0ge307XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKExlYXZlcykpXG5cdFx0XHRcdGxlYXZlc1trZXkudG9Mb3dlckNhc2UoKV0gPSAoYXJnMTogUHJlZGljYXRlT3AsIGFyZzI6IG51bWJlcikgPT4gbmV3IHZhbHVlKGFyZzEsIGFyZzIpO1xuXHRcdFx0XHRcblx0XHRcdGZvciAoY29uc3Qga2V5IGluIFByZWRpY2F0ZU9wKVxuXHRcdFx0XHRpZiAoaXNOYU4ocGFyc2VJbnQoa2V5KSkpXG5cdFx0XHRcdFx0bGVhdmVzW2tleV0gPSAodmFsdWU6IGFueSkgPT4gbmV3IExlYXZlcy5QcmVkaWNhdGUoKDxhbnk+UHJlZGljYXRlT3ApW2tleV0sIHZhbHVlKTtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gbGVhdmVzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXRDaGlsZHJlbih0YXJnZXQ6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGFyZ2V0LmNoaWxkcmVuO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRjcmVhdGVDb250YWluZXIoKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgQnJhbmNoZXMuUXVlcnkoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXR0YWNoQXRvbWljKFxuXHRcdFx0YXRvbWljOiBOb2RlLFxuXHRcdFx0b3duZXI6IEJyYW5jaCxcblx0XHRcdHJlZjogTm9kZSB8IFwicHJlcGVuZFwiIHwgXCJhcHBlbmRcIilcblx0XHR7XG5cdFx0XHRpZiAoIShhdG9taWMgaW5zdGFuY2VvZiBOb2RlKSlcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBwb3MgPVxuXHRcdFx0XHRyZWYgPT09IFwiYXBwZW5kXCIgPyAtMSA6XG5cdFx0XHRcdHJlZiA9PT0gXCJwcmVwZW5kXCIgPyAwIDpcblx0XHRcdFx0Ly8gUGxhY2VzIHRoZSBpdGVtIGF0IHRoZSBlbmQsIGluIHRoZSBjYXNlIHdoZW4gXG5cdFx0XHRcdC8vIHJlZiB3YXNuJ3QgZm91bmQgaW4gdGhlIG93bmVyLiApVGhpcyBzaG91bGRcblx0XHRcdFx0Ly8gbmV2ZXIgYWN0dWFsbHkgaGFwcGVuLilcblx0XHRcdFx0b3duZXIuY2hpbGRyZW4uaW5kZXhPZihyZWYpICsgMSB8fCAtMTtcblx0XHRcdFxuXHRcdFx0b3duZXIuYWRkQ2hpbGQoYXRvbWljLCBwb3MpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRkZXRhY2hBdG9taWMoYXRvbWljOiBOb2RlLCBvd25lcjogQnJhbmNoKVxuXHRcdHtcblx0XHRcdG93bmVyLnJlbW92ZUNoaWxkKGF0b21pYyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHN3YXBCcmFuY2hlcyhicmFuY2gxOiBCcmFuY2gsIGJyYW5jaDI6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRpZiAoYnJhbmNoMS5jb250YWluZXIgPT09IG51bGwgfHwgYnJhbmNoMi5jb250YWluZXIgPT09IG51bGwpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBzd2FwIHRvcC1sZXZlbCBicmFuY2hlcy5cIik7XG5cdFx0XHRcblx0XHRcdGlmIChicmFuY2gxLmNvbnRhaW5lciAhPT0gYnJhbmNoMi5jb250YWluZXIpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IHN3YXAgYnJhbmNoZXMgZnJvbSB0aGUgc2FtZSBjb250YWluZXIuXCIpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBjb250YWluZXIgPSBicmFuY2gxLmNvbnRhaW5lcjtcblx0XHRcdGNvbnN0IGlkeDEgPSBjb250YWluZXIuY2hpbGRyZW4uaW5kZXhPZihicmFuY2gxKTtcblx0XHRcdGNvbnN0IGlkeDIgPSBjb250YWluZXIuY2hpbGRyZW4uaW5kZXhPZihicmFuY2gyKTtcblx0XHRcdGNvbnN0IGlkeE1heCA9IE1hdGgubWF4KGlkeDEsIGlkeDIpO1xuXHRcdFx0Y29uc3QgaWR4TWluID0gTWF0aC5taW4oaWR4MSwgaWR4Mik7XG5cdFx0XHRjb25zdCByZW1vdmVkTWF4ID0gY29udGFpbmVyLnJlbW92ZUNoaWxkKGlkeE1heCk7XG5cdFx0XHRjb25zdCByZW1vdmVkTWluID0gY29udGFpbmVyLnJlbW92ZUNoaWxkKGlkeE1pbik7XG5cdFx0XHRcblx0XHRcdGlmICghcmVtb3ZlZE1heCB8fCAhcmVtb3ZlZE1pbilcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSW50ZXJuYWwgRXJyb3IuXCIpO1xuXHRcdFx0XG5cdFx0XHRjb250YWluZXIuYWRkQ2hpbGQocmVtb3ZlZE1heCwgaWR4TWluKTtcblx0XHRcdGNvbnRhaW5lci5hZGRDaGlsZChyZW1vdmVkTWluLCBpZHhNYXgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRyZXBsYWNlQnJhbmNoKGJyYW5jaDE6IEJyYW5jaCwgYnJhbmNoMjogQnJhbmNoKVxuXHRcdHtcblx0XHRcdGlmIChicmFuY2gxLmNvbnRhaW5lciA9PT0gbnVsbClcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHJlcGxhY2UgdG9wLWxldmVsIGJyYW5jaGVzLlwiKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgY29udGFpbmVyID0gYnJhbmNoMS5jb250YWluZXI7XG5cdFx0XHRjb25zdCBpZHggPSBjb250YWluZXIuY2hpbGRyZW4uaW5kZXhPZihicmFuY2gxKTtcblx0XHRcdGNvbnRhaW5lci5yZW1vdmVDaGlsZChpZHgpO1xuXHRcdFx0Y29udGFpbmVyLmFkZENoaWxkKGJyYW5jaDIsIGlkeCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGF0dGFjaEF0dHJpYnV0ZShicmFuY2g6IEJyYW5jaCwga2V5OiBzdHJpbmcsIHZhbHVlOiBhbnkpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IHN1cHBvcnRlZC5cIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGRldGFjaEF0dHJpYnV0ZShicmFuY2g6IEJyYW5jaCwga2V5OiBzdHJpbmcpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IHN1cHBvcnRlZC5cIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGF0dGFjaFJlY3VycmVudChcblx0XHRcdGtpbmQ6IFJlZmxleC5Db3JlLlJlY3VycmVudEtpbmQsXG5cdFx0XHR0YXJnZXQ6IFJlZmxleC5Db3JlLklCcmFuY2gsXG5cdFx0XHRzZWxlY3RvcjogYW55LFxuXHRcdFx0Y2FsbGJhY2s6IFJlZmxleC5Db3JlLlJlY3VycmVudENhbGxiYWNrLFxuXHRcdFx0cmVzdDogYW55W10pXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IHN1cHBvcnRlZC5cIik7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGRldGFjaFJlY3VycmVudChcblx0XHRcdHRhcmdldDogUmVmbGV4LkNvcmUuSUJyYW5jaCxcblx0XHRcdHNlbGVjdG9yOiBhbnksXG5cdFx0XHRjYWxsYmFjazogUmVmbGV4LkNvcmUuUmVjdXJyZW50Q2FsbGJhY2spXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IHN1cHBvcnRlZC5cIik7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG59XG5cbi8qKlxuICogR2xvYmFsIGxpYnJhcnkgb2JqZWN0LlxuICovXG5jb25zdCB0dCA9IFJlZmxleC5Db3JlLmNyZWF0ZUNvbnRhaW5lck5hbWVzcGFjZTxCYWNrZXIuVHJ1dGhUYWxrLk5hbWVzcGFjZSwgQmFja2VyLlRydXRoVGFsay5MaWJyYXJ5Pihcblx0bmV3IEJhY2tlci5UcnV0aFRhbGsuTGlicmFyeSgpLFxuXHR0cnVlKTtcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi8uLi9SZWZsZXgvUmVmbGV4Q29yZS9idWlsZC9yZWZsZXgtY29yZS5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJEZWZpbml0aW9ucy50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTm9kZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTGlicmFyeS50c1wiIC8+Il19