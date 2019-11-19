"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
// No, no. This isn't actually a usage of the eval() function.
// This is only for development time. At runtime, the eval call
// is unwrapped. 
//
// This is just to get around the problem that there's currently
// no way to merge a namespace across multiple files, in the
// case when the namespace is also being merged with a
// function. However, because this project uses --outFile for
// bundling, the output doesn't have any JavaScript-level
// issues.
eval("function Reflex() { }");
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        /** */
        class Meta {
            constructor(locator) {
                this.locator = locator;
            }
        }
        Core.Meta = Meta;
        /** */
        class StemMeta extends Meta {
            constructor(locator) {
                super(locator || new Core.Locator(1 /* leaf */));
            }
        }
        Core.StemMeta = StemMeta;
        /**
         * Stores the information about a single attribute.
         * Although attributes can come in a large object literal
         * that specifies many attributes together, the atom
         * translator function splits them up into smaller metas,
         * which is done because some values may be static,
         * and others may be behind a force.
         */
        class AttributeMeta extends StemMeta {
            constructor(key, value) {
                super();
                this.key = key;
                this.value = value;
            }
        }
        Core.AttributeMeta = AttributeMeta;
        /**
         * Stores information about some value that is known
         * to the library that will be applied to some branch.
         */
        class ValueMeta extends StemMeta {
            constructor(value) {
                super();
                this.value = value;
            }
        }
        Core.ValueMeta = ValueMeta;
        /** */
        class ClosureMeta extends StemMeta {
            constructor(closure) {
                super();
                this.closure = closure;
            }
        }
        Core.ClosureMeta = ClosureMeta;
        /** */
        class ContainerMeta extends Meta {
        }
        Core.ContainerMeta = ContainerMeta;
        /**
         *
         */
        class StreamMeta extends ContainerMeta {
            constructor(containerMeta, locator) {
                super(locator || new Core.Locator(2 /* stream */));
                this.containerMeta = containerMeta;
            }
        }
        Core.StreamMeta = StreamMeta;
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        /**
         *
         */
        class BranchMeta extends Core.ContainerMeta {
            /** */
            constructor(branch, initialAtoms, locator) {
                super(locator || new Core.Locator(0 /* branch */));
                /**
                 * An arbitrary unique value used to identify an index in a force
                 * array that was responsible for rendering this BranchMeta.
                 */
                this.key = 0;
                this.branch = branch;
                BranchMeta.metas.set(branch, this);
                if (initialAtoms.length) {
                    const metas = Core.CoreUtil.translateAtoms(branch, this, initialAtoms);
                    Core.CoreUtil.applyMetas(branch, this, metas);
                }
            }
            /**
             * Returns the BranchMeta object that corresponds
             * to the specified Branch object.
             */
            static of(branch) {
                return this.metas.get(branch) || null;
            }
        }
        /** */
        BranchMeta.metas = new WeakMap();
        Core.BranchMeta = BranchMeta;
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        /** */
        class LeafMeta extends Core.StemMeta {
            /** */
            constructor(value, locator) {
                super(locator);
                this.value = value;
                /**
                 * An arbitrary unique value used to identify an index in a force
                 * array that was responsible for rendering this BranchMeta.
                 */
                this.key = 0;
                LeafMeta.metas.set(value, this);
            }
            /**
             * Returns the LeafMeta object that corresponds
             * to the specified Leaf object.
             */
            static of(leaf) {
                return this.metas.get(leaf) || null;
            }
        }
        /** */
        LeafMeta.metas = new WeakMap();
        Core.LeafMeta = LeafMeta;
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        /**
         *
         */
        class RecurrentStreamMeta extends Core.StreamMeta {
            /** */
            constructor(containerMeta, recurrent, locator) {
                super(containerMeta, locator);
                this.containerMeta = containerMeta;
                this.recurrent = recurrent;
                /** */
                this.inAutoRunContext = false;
                /**
                 * The callback that triggers when the new metas have been processed.
                 */
                this.when = null;
                /**
                 * Stores an array of values that were returned from the
                 * recurrent function, in storagized form.
                 */
                this.returned = [];
                this.recurrent = recurrent;
                const self = this;
                this._systemCallback = (function (...systemRestArgs) {
                    // This is cheating a bit. We're getting the branch
                    // from the "this" reference passed to event callbacks.
                    // Some libraries (such as the DOM) set the "this" reference
                    // to what essentially amounts to the branch we're trying
                    // to get, without actually storing a reference to it. Hopefully
                    // the other platforms on which reflexive libraries are built
                    // will exhibit (or can be made to exibit) this same behavior.
                    if (this === null)
                        throw new Error("Library not implemented properly.");
                    const wasMetas = resolveReturned(self.returned, this);
                    if (!self.inAutoRunContext)
                        if (Core.RoutingLibrary.this.isBranchDisposed(this)) {
                            self.detachRecurrents(this, recurrent.selector, self.systemCallback);
                            Core.CoreUtil.unapplyMetas(this, wasMetas);
                            self.returned.length = 0;
                            return;
                        }
                    // This is a safety check, we're also doing this below, but it's
                    // important to make sure this gets set to false as soon as possible.
                    self.inAutoRunContext = false;
                    const fn = recurrent.userCallback;
                    const r = systemRestArgs
                        .concat(this)
                        .concat(recurrent.userRestArgs);
                    let p;
                    switch (r.length) {
                        case 0:
                            p = fn();
                            break;
                        case 1:
                            p = fn(r[0]);
                            break;
                        case 2:
                            p = fn(r[0], r[1]);
                            break;
                        case 3:
                            p = fn(r[0], r[1], r[2]);
                            break;
                        case 4:
                            p = fn(r[0], r[1], r[2], r[3]);
                            break;
                        case 5:
                            p = fn(r[0], r[1], r[2], r[3], r[4]);
                            break;
                        case 6:
                            p = fn(r[0], r[1], r[2], r[3], r[4], r[5]);
                            break;
                        case 7:
                            p = fn(r[0], r[1], r[2], r[3], r[4], r[5], r[6]);
                            break;
                        case 8:
                            p = fn(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7]);
                            break;
                        case 9:
                            p = fn(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8]);
                            break;
                        case 10:
                            p = fn(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9]);
                            break;
                        default: p = fn(...r);
                    }
                    // This is a quick test to avoid doing pointless work
                    // in the relatively common case that the recurrent
                    // doesn't have a relevant return value.
                    if (wasMetas.length > 0 || p !== undefined && p !== null) {
                        const nowMetas = Core.CoreUtil.translateAtoms(this, containerMeta, p);
                        if (self.when)
                            self.when(wasMetas, nowMetas, this);
                        self.returned.length = 0;
                        if (recurrent.kind !== 1 /* once */)
                            self.returned.push(...unresolveReturned(nowMetas));
                    }
                    if (recurrent.kind === 1 /* once */)
                        Core.CoreUtil.unapplyMetas(this, [self]);
                });
            }
            /**
             * Stores the wrapped version of the user's callback that gets added
             * to the Reflexive library's tree (such as via an addEventListener() call).
             */
            get systemCallback() {
                if (this._systemCallback === null)
                    throw new Error();
                return this._systemCallback;
            }
            /**
             * Applies the stream meta (and any metas that are streamed from it
             * at any point in the future) to the specified containing branch.
             *
             * Returns the input ref value, or the last synchronously inserted meta.
             */
            attach(containingBranch, tracker) {
                this._systemCallback = this._systemCallback.bind(containingBranch);
                const localTracker = tracker.derive();
                localTracker.update(this.locator);
                const rec = this.recurrent;
                this.when = (wasMetas, nowMetas) => {
                    if (wasMetas.length)
                        Core.CoreUtil.unapplyMetas(containingBranch, wasMetas);
                    for (const nowMeta of nowMetas)
                        nowMeta.locator.setContainer(this.locator);
                    Core.CoreUtil.applyMetas(containingBranch, this, nowMetas, localTracker);
                };
                const selector = Array.isArray(rec.selector) ?
                    rec.selector :
                    [rec.selector];
                for (const selectorItem of selector) {
                    if (selectorItem instanceof Reflex.StatefulForce)
                        Core.ForceUtil.attachForce(selectorItem.changed, this.systemCallback);
                    else if (Reflex.isStatelessForce(selectorItem))
                        Core.ForceUtil.attachForce(selectorItem, this.systemCallback);
                    else
                        switch (selectorItem) {
                            case Reflex.mutation.any: break;
                            case Reflex.mutation.branch: break;
                            case Reflex.mutation.branchAdd: break;
                            case Reflex.mutation.branchRemove: break;
                            case Reflex.mutation.leaf: break;
                            case Reflex.mutation.leafAdd: break;
                            case Reflex.mutation.leafRemove: break;
                            default: Core.RoutingLibrary.this.attachRecurrent(rec.kind, containingBranch, selectorItem, this.systemCallback, this.recurrent.userRestArgs);
                        }
                }
                const autorunArguments = Core.extractAutorunArguments(rec);
                if (autorunArguments) {
                    const item = selector[0];
                    if (item instanceof Reflex.StatefulForce)
                        this.invokeAutorunCallback([item.value, item.value], containingBranch);
                    else if (Reflex.isStatelessForce(item))
                        this.invokeAutorunCallback(autorunArguments, containingBranch);
                    else if (typeof item === "string" && item in Reflex.mutation)
                        this.invokeAutorunCallback([Reflex.mutation.any], containingBranch);
                    else
                        this.invokeAutorunCallback([], containingBranch);
                }
            }
            /**
             *
             */
            detachRecurrents(branch, selector, systemCallback) {
                const lib = Core.RoutingLibrary.this;
                if (!Array.isArray(selector))
                    lib.detachRecurrent(branch, selector, systemCallback);
                else
                    for (const selectorPart of selector)
                        lib.detachRecurrent(branch, selectorPart, systemCallback);
            }
            /**
             * Call this method to indirectly invoke the systemCallback, but done
             * in a way that makes it aware that it's being run via the autorun.
             */
            invokeAutorunCallback(args, thisArg) {
                try {
                    this.inAutoRunContext = true;
                    thisArg ?
                        this.systemCallback.apply(thisArg, args) :
                        this.systemCallback(...args);
                }
                finally {
                    this.inAutoRunContext = false;
                }
            }
        }
        Core.RecurrentStreamMeta = RecurrentStreamMeta;
        /**
         * Returns a new array that is a copy of the specified return array,
         * except with the unsafe metas replaced with locators.
         */
        function unresolveReturned(returned) {
            const unresolved = [];
            for (const meta of returned) {
                unresolved.push(meta instanceof Core.BranchMeta || meta instanceof Core.LeafMeta ?
                    meta.locator :
                    meta);
            }
            return unresolved;
        }
        /**
         * Returns a new array that is the copy of the specified return array,
         * except with any instances of Locator replaced with the actual meta.
         */
        function resolveReturned(returned, containingBranch) {
            const resolved = new Array(returned.length).fill(null);
            let hasLocators = false;
            // Pre-populate the resolved array with everything that is already a meta.
            for (let i = -1; ++i < returned.length;) {
                const r = returned[i];
                if (r instanceof Core.Meta)
                    resolved[i] = r;
                else
                    hasLocators = true;
            }
            // Avoid hitting the library if possible
            if (!hasLocators)
                return returned.slice();
            const children = Array.from(Core.RoutingLibrary.this.getChildren(containingBranch));
            for (let retIdx = -1; ++retIdx < returned.length;) {
                const ret = returned[retIdx];
                if (ret instanceof Core.Locator) {
                    for (let childIdx = -1; ++childIdx < children.length;) {
                        const child = children[childIdx];
                        const childMeta = Core.BranchMeta.of(child) ||
                            Core.LeafMeta.of(child);
                        if (!childMeta)
                            continue;
                        const cmp = ret.compare(childMeta.locator);
                        if (cmp === 0 /* equal */) {
                            resolved[retIdx] = childMeta;
                            break;
                        }
                    }
                }
                else
                    resolved[retIdx] = ret;
            }
            return resolved.filter((r) => r !== null);
        }
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        /**
         *
         */
        class PromiseStreamMeta extends Core.StreamMeta {
            constructor(containerMeta, promise) {
                super(containerMeta);
                this.containerMeta = containerMeta;
                this.promise = promise;
            }
            /** */
            attach(containingBranch, tracker) {
                Core.ReadyState.inc();
                this.promise.then(result => {
                    const containingBranchMeta = Core.BranchMeta.of(containingBranch);
                    if (containingBranchMeta) {
                        Core.CoreUtil.applyMetas(containingBranch, this.containerMeta, Core.CoreUtil.translateAtoms(containingBranch, containingBranchMeta, result), tracker);
                    }
                    Core.ReadyState.dec();
                });
            }
        }
        Core.PromiseStreamMeta = PromiseStreamMeta;
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        /**
         *
         */
        class AsyncIterableStreamMeta extends Core.StreamMeta {
            constructor(containerMeta, iterator) {
                super(containerMeta);
                this.containerMeta = containerMeta;
                this.iterator = iterator;
            }
            /**
             * Returns the input ref value, or the last synchronously inserted meta.
             */
            attach(containingBranch, tracker) {
                Core.ReadyState.inc();
                (async () => {
                    var e_1, _a;
                    const localTracker = tracker.derive();
                    localTracker.update(this.locator);
                    const branchMeta = Core.BranchMeta.of(containingBranch);
                    try {
                        for (var _b = __asyncValues(this.iterator), _c; _c = await _b.next(), !_c.done;) {
                            const iterableResult = _c.value;
                            const resultMetas = Core.CoreUtil.translateAtoms(containingBranch, branchMeta, iterableResult);
                            for (const resultMeta of resultMetas)
                                resultMeta.locator.setContainer(this.locator);
                            Core.CoreUtil.applyMetas(containingBranch, this, resultMetas, localTracker);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) await _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    Core.ReadyState.dec();
                })();
            }
        }
        Core.AsyncIterableStreamMeta = AsyncIterableStreamMeta;
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
/// <reference path="Apex.ts" />
/// <reference path="Meta/Meta.ts" />
/// <reference path="Meta/BranchMeta.ts" />
/// <reference path="Meta/LeafMeta.ts" />
/// <reference path="Meta/RecurrentStreamMeta.ts" />
/// <reference path="Meta/PromiseStreamMeta.ts" />
/// <reference path="Meta/AsyncIterableStreamMeta.ts" />
var Reflex;
(function (Reflex) {
    /**
     *
     */
    class ArrayForce {
        /** */
        constructor(root) {
            this.added = force();
            this.removed = force();
            this.moved = force();
            this.tailChange = force();
            /** */
            this.positions = [];
            if (root instanceof Reflex.Core.ArrayStore) {
                this.root = root;
            }
            else {
                this.root = root.root;
                Reflex.Core.ForceUtil.attachForce(root.added, (item, index) => {
                    this.insertRef(index, root.positions[index]);
                });
                Reflex.Core.ForceUtil.attachForce(root.removed, (item, index, id) => {
                    const loc = this.positions.indexOf(id);
                    if (loc > -1)
                        this.splice(loc, 1);
                });
            }
            Reflex.Core.ForceUtil.attachForce(this.root.changed, () => {
                this.executeFilter();
                this.executeSort();
            });
        }
        /** */
        static create(items) {
            const store = new Reflex.Core.ArrayStore();
            const view = new ArrayForce(store);
            view.push(...items);
            return view.proxy();
        }
        /**
         * @internal
         */
        assignSorter(sortFn) {
            this.sortFn = sortFn;
            this.executeSort();
            return this;
        }
        /**
         * @internal
         */
        assignFilter(filterFn) {
            this.filterFn = filterFn;
            this.executeFilter();
            return this;
        }
        /** */
        executeFilter() {
            if (this.filterFn) {
                for (let i = -1; ++i < this.positions.length;) {
                    const position = this.positions[i];
                    if (this.filterFn(this.getRoot(position), i, this)) {
                        const loc = this.positions.indexOf(i);
                        if (loc > -1)
                            this.splice(loc, 1);
                    }
                }
            }
        }
        /** */
        executeSort() {
            if (this.sortFn) {
                const array = this.positions;
                const length = array.length;
                const lastItem = array[length - 1];
                for (let i = -1; ++i < length - 1;) {
                    let changed = false;
                    for (let n = -1; ++n < length - (i + 1);) {
                        if (this.sortFn(this.get(n), this.get(n + 1)) > 0) {
                            changed = true;
                            [array[n], array[n + 1]] = [array[n + 1], array[n]];
                            this.moved(this.get(n), this.get(n + 1), n, n + 1);
                        }
                    }
                    if (!changed)
                        break;
                }
                const newLastItem = array[length - 1];
                if (lastItem !== newLastItem)
                    this.tailChange(this.get(length - 1), length - 1);
            }
        }
        /** */
        filterPush(...items) {
            if (this.filterFn)
                return items
                    .filter((value, index) => this.filterFn(value, index, this))
                    .map(x => this.root.push(x));
            return items.map(x => this.root.push(x));
        }
        /**
         * Defines getter and setter for index number properties ex. arr[5]
         */
        defineIndex(index) {
            if (!"NOPROXY")
                return;
            if (!Object.prototype.hasOwnProperty.call(this, index)) {
                Object.defineProperty(this, index, {
                    get() {
                        return this.get(index);
                    },
                    set(value) {
                        return this.set(index, value);
                    }
                });
            }
        }
        /**
         * @internal
         * Inserts positions from parameters into positions array of this
         * All positions are filtered if there is a filter function assigned to this
         * Triggers the added Force
         * Defines index for processed locations
         */
        insertRef(start, ...positions) {
            const filtered = this.filterFn ?
                positions.filter((value, index) => this.filterFn(this.getRoot(value), index, this)) :
                positions;
            this.positions.splice(start, 0, ...filtered);
            for (let i = -1; ++i < filtered.length;) {
                const item = filtered[i];
                const loc = start + i;
                this.added(this.getRoot(item), loc);
                this.defineIndex(loc);
            }
            this.executeSort();
        }
        /** */
        get length() {
            return this.positions.length;
        }
        /** */
        set length(i) {
            this.splice(i, this.positions.length - i);
            this.positions.length = i;
        }
        /**
         * @internal
         */
        proxy() {
            if ("NOPROXY")
                return this;
            if (!this._proxy) {
                this._proxy = new Proxy(this, {
                    get(target, prop) {
                        const index = parseInt(prop, 10);
                        return index !== index ? target[prop] : target.get(index);
                    },
                    set(target, prop, value) {
                        const index = parseInt(prop, 10);
                        if (index !== index)
                            target.set(index, value);
                        return true;
                    }
                });
            }
            return this._proxy;
        }
        /** */
        get(index) {
            return this.getRoot(this.positions[index]);
        }
        /** */
        getRoot(index) {
            return this.root.get(index);
        }
        /** */
        set(index, value) {
            if (this.filterFn)
                if (!this.filterFn(value, index, this))
                    this.positions.splice(index, 1);
            this.root.set(this.positions[index], value);
        }
        /**
         * Returns snapshot of this as a js array
         */
        snapshot() {
            return this.positions.map(x => this.getRoot(x));
        }
        /** */
        toString() {
            return JSON.stringify(this.snapshot());
        }
        /** */
        toLocaleString() {
            return this.toString();
        }
        concat(...items) {
            const array = ArrayForce.create(this.snapshot());
            array.push(...items);
            return array.proxy();
        }
        /** */
        join(separator) {
            return this.snapshot().join(separator);
        }
        /** */
        reverse() {
            this.positions.reverse();
            return this;
        }
        /** */
        slice(start, end) {
            const array = new ArrayForce(this.root);
            array.insertRef(0, ...this.positions.slice(start, end));
            return array.proxy();
        }
        /** */
        sort(compareFn, ...forces) {
            const array = new ArrayForce(this);
            array.sortFn = compareFn;
            for (const fo of forces)
                Reflex.Core.ForceUtil.attachForce(fo instanceof Reflex.StatefulForce ?
                    fo.changed : fo, array.executeSort);
            array.insertRef(0, ...this.positions);
            return array.proxy();
        }
        /** */
        indexOf(searchElement, fromIndex = 0) {
            for (let i = fromIndex - 1; ++i < this.positions.length;)
                if (this.get(i) === searchElement)
                    return i;
            return -1;
        }
        /** */
        lastIndexOf(searchElement, fromIndex) {
            for (let i = fromIndex || this.positions.length; --i > -1;)
                if (this.get(i) === searchElement)
                    return i;
            return -1;
        }
        /** */
        every(callbackFn, thisArg) {
            for (let i = -1; ++i < this.positions.length;)
                if (!callbackFn.call(thisArg || this, this.get(i), i, this))
                    return false;
            return true;
        }
        /** */
        some(callbackFn, thisArg) {
            for (let i = -1; ++i < this.positions.length;)
                if (callbackFn.call(thisArg || this, this.get(i), i, this))
                    return true;
            return false;
        }
        /** */
        forEach(callbackFn, thisArg) {
            for (let i = -1; ++i < this.positions.length;)
                callbackFn.call(thisArg || this, this.get(i), i, this);
        }
        /** */
        map(callbackFn, thisArg) {
            return ArrayForce.create(this.positions
                .map(x => this.getRoot(x))
                .map((value, index) => callbackFn.call(thisArg || this, value, index, this)));
        }
        filter(callbackFn, ...forces) {
            const array = new ArrayForce(this);
            array.filterFn = callbackFn;
            for (const fo of forces) {
                Reflex.Core.ForceUtil.attachForce(fo instanceof Reflex.StatefulForce ? fo.changed : fo, () => {
                    array.executeFilter();
                    this.positions.forEach((x, i) => {
                        if (array.filterFn(this.getRoot(x), i, this) && !array.positions.includes(x))
                            array.insertRef(i, x);
                    });
                });
            }
            array.insertRef(0, ...this.positions);
            return array.proxy();
        }
        reduce(callbackFn, initialValue) {
            return this.positions
                .reduce((prev, curr, ci) => callbackFn(prev, this.get(curr), ci, this), initialValue);
        }
        reduceRight(callbackFn, initialValue) {
            return this.positions
                .reduceRight((prev, curr, ci) => callbackFn(prev, this.get(curr), ci, this), initialValue);
        }
        find(predicate, thisArg) {
            for (let i = -1; ++i < this.positions.length;)
                if (predicate.call(thisArg || this, this.get(i), i, this))
                    return this.get(i);
        }
        /** */
        findIndex(predicate, thisArg) {
            for (let i = -1; ++i < this.positions.length;)
                if (predicate.call(thisArg || this, this.get(i), i, this))
                    return i;
            return -1;
        }
        /** */
        fill(value, start, end) {
            for (let i = (start || 0) - 1; ++i < (end || this.positions.length);)
                this.set(i, value);
            return this;
        }
        /** */
        copyWithin(target, start, end) {
            this.positions.copyWithin(target, start, end);
            return this;
        }
        /** */
        *[Symbol.iterator]() {
            for (let i = -1; ++i < this.positions.length;)
                yield this.get(i);
        }
        /** */
        *entries() {
            for (let i = -1; ++i < this.positions.length;)
                yield [i, this.get(i)];
        }
        /** */
        *keys() {
            for (let i = -1; ++i < this.positions.length;)
                yield i;
        }
        /** */
        *values() {
            for (let i = -1; ++i < this.positions.length;)
                yield this.get(i);
        }
        /** */
        [Symbol.unscopables]() {
            return this.positions[Symbol.unscopables]();
        }
        /** */
        includes(searchElement, fromIndex = 0) {
            for (let i = fromIndex - 1; ++i < this.positions.length;)
                if (this.get(i) === searchElement)
                    return true;
            return false;
        }
        /** */
        flatMap(callback, thisArg) {
            return this.snapshot().flatMap(callback, thisArg);
        }
        flat(depth) {
            return this.snapshot().flat(depth);
        }
        /** */
        push(...items) {
            this.insertRef(this.length, ...this.filterPush(...items));
            return this.positions.length;
        }
        /** */
        pop() {
            if (this.positions.length < 1)
                return void 0;
            const pos = this.positions.pop();
            const item = this.getRoot(pos);
            this.removed(item, this.positions.length, pos);
            this.root.delete(pos);
            return item;
        }
        /** */
        unshift(...items) {
            this.insertRef(0, ...this.filterPush(...items));
            return this.positions.length;
        }
        /** */
        shift() {
            if (this.positions.length < 1)
                return void 0;
            const pos = this.positions.shift();
            const item = this.getRoot(pos);
            this.removed(item, 0, pos);
            this.root.delete(pos);
            return item;
        }
        /** */
        splice(start, deleteCount, ...items) {
            const positions = this.positions.splice(start, deleteCount);
            positions.forEach((x, i) => this.removed(this.getRoot(x), start + i, x));
            this.insertRef(start, ...this.filterPush(...items));
            const result = positions.map(x => this.getRoot(x));
            positions.forEach(x => this.root.delete(x));
            return result;
        }
    }
    Reflex.ArrayForce = ArrayForce;
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        /**
         *
         */
        class ArrayStore {
            constructor() {
                /** */
                this.changed = force();
                /** */
                this.root = {};
                /** */
                this.next = 0;
            }
            /** */
            get(index) {
                const item = this.root[index];
                return item && item.value;
            }
            /** */
            set(index, value) {
                if (!Object.prototype.hasOwnProperty.call(this.root, index))
                    this.root[index] = { value: undefined, ref: 1 };
                else
                    this.changed(value, index);
                this.root[index].value = value;
                return index;
            }
            /** */
            push(value) {
                return this.set(this.next++, value);
            }
            /** */
            mark(index) {
                this.root[index].ref++;
                return index;
            }
            /** */
            delete(index) {
                if (Object.prototype.hasOwnProperty.call(this.root, index)) {
                    const item = this.root[index];
                    if (item.ref > 1)
                        item.ref--;
                    if (item.ref === 0)
                        item.value = undefined;
                }
            }
        }
        Core.ArrayStore = ArrayStore;
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        /**
         * WARNING: This method has potential memory issues
         * and is not intended for long-running processes (i.e. in
         * the browser). In order to use it from the browser, the
         * childrenOf.enabled value must be set to true. In Node.js,
         * this value defaults to true. In the browser, it defaults to
         * false;
         *
         * @returns An array containing the Meta objects that
         * are logical children of the specified branch.
         */
        function childrenOf(branch) {
            return childMetas.get(branch) || [];
        }
        Core.childrenOf = childrenOf;
        (function (childrenOf) {
            childrenOf.enabled = typeof __dirname === "string";
            /**
             * @internal
             * Populates the internal weak map that allows
             * branches to store their child meta objects.
             * Do not call from application code.
             */
            function store(branch, meta) {
                const existing = childMetas.get(branch);
                if (existing) {
                    if (!existing.includes(meta))
                        existing.push(meta);
                }
                else
                    childMetas.set(branch, [meta]);
            }
            childrenOf.store = store;
        })(childrenOf = Core.childrenOf || (Core.childrenOf = {}));
        /** */
        const childMetas = new WeakMap();
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        /**
         * @internal
         * Purely functional utility methods that perform operations for the Relex Core.
         */
        Core.CoreUtil = new class CoreUtil {
            /**
             * Cleans out the cruft from the atoms array,
             * flattens all arrays, and converts the resulting
             * values into Meta instances.
             */
            translateAtoms(containerBranch, containerMeta, rawAtoms) {
                const atoms = Array.isArray(rawAtoms) ?
                    rawAtoms.slice() :
                    [rawAtoms];
                for (let i = -1; ++i < atoms.length;) {
                    const atom = atoms[i];
                    // Initial clear out of discarded values.
                    if (atom === null ||
                        atom === undefined ||
                        typeof atom === "boolean" ||
                        atom === "" ||
                        atom !== atom ||
                        atom === containerBranch)
                        atoms.splice(i--, 1);
                    // strings, numbers, and bigints are passed through verbatim in this phase.
                    else if (typeof atom !== "object")
                        continue;
                    else if (Array.isArray(atom))
                        atoms.splice(i--, 1, ...atom);
                    else if (this.hasSymbol && atom[Symbol.iterator])
                        atoms.splice(i--, 1, ...Array.from(atom));
                }
                const metas = [];
                for (let i = -1; ++i < atoms.length;) {
                    const atom = atoms[i];
                    const typeOf = typeof atom;
                    if (atom instanceof Core.Meta)
                        metas.push(atom);
                    else if (atom instanceof Reflex.Recurrent) {
                        if (atom.selector instanceof Reflex.ArrayForce) {
                            metas.push(new Core.ArrayStreamMeta(containerMeta, atom));
                        }
                        else {
                            metas.push(new Core.RecurrentStreamMeta(containerMeta, atom));
                        }
                    }
                    else if (atom[Reflex.atom])
                        metas.push(new Core.ClosureMeta(this.createSymbolicClosure(atom)));
                    else if (typeOf === "function")
                        metas.push(new Core.ClosureMeta(atom));
                    else if (typeOf === "string" ||
                        typeOf === "number" ||
                        typeOf === "bigint")
                        metas.push(new Core.ValueMeta(atom));
                    else if (this.isAsyncIterable(atom))
                        metas.push(new Core.AsyncIterableStreamMeta(containerMeta, atom));
                    else if (atom instanceof Promise)
                        metas.push(new Core.PromiseStreamMeta(containerMeta, atom));
                    else if (this.isAttributes(atom)) {
                        for (const [k, v] of Object.entries(atom)) {
                            if (v instanceof Reflex.StatefulForce) {
                                metas.push(new Core.RecurrentStreamMeta(containerMeta, new Core.AttributeRecurrent(k, v)));
                            }
                            else
                                metas.push(new Core.AttributeMeta(k, v));
                        }
                    }
                    else {
                        const existingMeta = Core.BranchMeta.of(atom) ||
                            Core.LeafMeta.of(atom);
                        if (existingMeta)
                            metas.push(existingMeta);
                        // This error occurs when something was passed as a atom 
                        // to a branch function, and neither the Reflex core, or any of
                        // the connected Reflexive libraries know what to do with it.
                        else
                            throw new Error("Unidentified flying object.");
                    }
                }
                return metas;
            }
            /**
             *
             */
            isAttributes(object) {
                if (!object || object.constructor !== Object)
                    return false;
                for (const value of Object.values(object)) {
                    const t = typeof value;
                    if (t !== "string" && t !== "number" && t !== "bigint" && t !== "boolean")
                        if (!(value instanceof Reflex.StatefulForce))
                            return false;
                }
                return true;
            }
            /**
             * Creates a temporary closure function for the
             * specified symbolic atom object.
             */
            createSymbolicClosure(atom) {
                return (branch, children) => {
                    const property = atom[Reflex.atom];
                    return typeof property === "function" ?
                        property.call(atom, branch, children) :
                        property;
                };
            }
            /**
             *
             */
            isAsyncIterable(o) {
                if (this.hasSymbol && o && typeof o === "object")
                    if (o[Symbol.asyncIterator])
                        if (typeof o.next === "function")
                            if (typeof o.return === "function")
                                if (typeof o.throw === "function")
                                    return true;
                return false;
            }
            /** */
            get hasSymbol() {
                return typeof Symbol === "function";
            }
            /**
             * Applies the specified metas to the specified branch, and returns
             * the last applied branch or leaf object, which can be used for
             * future references.
             */
            applyMetas(containingBranch, containerMeta, childMetas, tracker = new Core.Tracker(containingBranch)) {
                const containingBranchMeta = Core.BranchMeta.of(containingBranch);
                if (!containingBranchMeta)
                    throw new Error("");
                const lib = Core.RoutingLibrary.this;
                childMetas = childMetas.slice();
                // ClosureMeta instances need to be collapsed before
                // we proceed so that the locators of any meta that it
                // returns can be assimilated.
                for (let i = -1; ++i < childMetas.length;) {
                    const meta = childMetas[i];
                    if (meta instanceof Core.ClosureMeta) {
                        if (lib.handleBranchFunction && Core.isBranchFunction(meta.closure)) {
                            lib.handleBranchFunction(containingBranch, meta.closure);
                        }
                        else {
                            const children = lib.getChildren(containingBranch);
                            const closureReturn = meta.closure(containingBranch, children);
                            const metasReturned = this.translateAtoms(containingBranch, containingBranchMeta, closureReturn);
                            childMetas.splice(i--, 1, ...metasReturned);
                        }
                    }
                }
                for (const meta of childMetas)
                    meta.locator.setContainer(containerMeta.locator);
                for (let i = -1; ++i < childMetas.length;) {
                    const meta = childMetas[i];
                    if (meta instanceof Core.BranchMeta) {
                        const hardRef = tracker.getLastHardRef();
                        lib.attachAtom(meta.branch, containingBranch, hardRef);
                        tracker.update(meta.branch);
                    }
                    else if (meta instanceof Core.LeafMeta) {
                        const hardRef = tracker.getLastHardRef();
                        lib.attachAtom(meta.value, containingBranch, hardRef);
                        tracker.update(meta.value);
                    }
                    else if (meta instanceof Core.ValueMeta) {
                        lib.attachAtom(meta.value, containingBranch, "append");
                    }
                    else if (meta instanceof Core.StreamMeta) {
                        if (meta instanceof Core.RecurrentStreamMeta)
                            meta.attach(containingBranch, tracker);
                        else if (meta instanceof Core.AsyncIterableStreamMeta)
                            meta.attach(containingBranch, tracker);
                        else if (meta instanceof Core.ArrayStreamMeta)
                            meta.attach(containingBranch, tracker);
                        else if (meta instanceof Core.PromiseStreamMeta) {
                            const localTracker = tracker.derive();
                            localTracker.update(meta.locator);
                            meta.attach(containingBranch, localTracker);
                        }
                    }
                    else if (meta instanceof Core.AttributeMeta) {
                        lib.attachAttribute(containingBranch, meta.key, meta.value);
                    }
                    if (1 /* debug */ || 3 /* node */)
                        Core.childrenOf.store(containingBranch, meta);
                    tracker.update(meta.locator);
                }
            }
            /**
             *
             */
            unapplyMetas(containingBranch, childMetas) {
                const lib = Core.RoutingLibrary.this;
                for (const meta of childMetas) {
                    // ClosureMetas can be safely ignored.
                    if (meta instanceof Core.ClosureMeta)
                        continue;
                    if (meta instanceof Core.LeafMeta || meta instanceof Core.ValueMeta)
                        lib.detachAtom(meta.value, containingBranch);
                    else if (meta instanceof Core.AttributeMeta)
                        lib.detachAttribute(containingBranch, meta.value);
                    else if (meta instanceof Core.BranchMeta)
                        // We should probably consider getting rid of this
                        // You would be able to re-discover the branch by
                        // enumerating through the children of containingBranch,
                        // using the getChildren() method provided by the library.
                        lib.detachAtom(meta.branch, containingBranch);
                    else if (meta instanceof Core.RecurrentStreamMeta)
                        meta.detachRecurrents(containingBranch, meta.recurrent.selector, meta.systemCallback);
                    else if (meta instanceof Core.PromiseStreamMeta)
                        throw new Error("Not implemented.");
                    else if (meta instanceof Core.AsyncIterableStreamMeta)
                        throw new Error("Not implemented.");
                }
            }
        }();
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    /** */
    let mutation;
    (function (mutation) {
        mutation["any"] = "mutation-any";
        mutation["branch"] = "mutation-branch";
        mutation["branchAdd"] = "mutation-branch-add";
        mutation["branchRemove"] = "mutation-branch-remove";
        mutation["leaf"] = "mutation-leaf";
        mutation["leafAdd"] = "mutation-leaf-add";
        mutation["leafRemove"] = "mutation-leaf-remove";
    })(mutation = Reflex.mutation || (Reflex.mutation = {}));
    Reflex["atom"] = typeof Symbol === "function" ?
        Symbol("Reflex.atom") :
        "Reflex.atom";
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    /** */
    const entries = new WeakMap();
    /** */
    class Entry {
        constructor() {
            this.systemCallbacks = new Set();
        }
    }
    /**
     * Returns a boolean that indicates whether the specified value
     * is a stateless or stateful force.
     */
    function isForce(fo) {
        // TODO: This function also needs to check for ArrayForce's
        return isStatelessForce(fo) || fo instanceof Reflex.StatefulForce;
    }
    Reflex.isForce = isForce;
    /**
     * Guards on whether the specified value is stateless force function.
     */
    function isStatelessForce(forceFn) {
        return !!forceFn && entries.has(forceFn);
    }
    Reflex.isStatelessForce = isStatelessForce;
    let Core;
    (function (Core) {
        /**
         * @internal
         */
        Core.ForceUtil = {
            /** */
            createFunction() {
                // The user force function is sent back to the user, who uses
                // this function as a parameter to other on() calls, or to call
                // directly when the thing happens.
                const userForceFn = (...args) => {
                    const reFn = entries.get(userForceFn);
                    if (reFn)
                        for (const systemCallback of reFn.systemCallbacks)
                            systemCallback(...args);
                };
                const entry = new Entry();
                entries.set(userForceFn, entry);
                return userForceFn;
            },
            /**
             * Returns the StatelessForce that corresponds to the specified
             * force function.
             */
            attachForce(fn, systemCallback) {
                const re = entries.get(fn);
                if (re)
                    re.systemCallbacks.add(systemCallback);
            },
            /**
             *
             */
            detachForce(fn, systemCallback) {
                const fo = entries.get(fn);
                if (fo)
                    fo.systemCallbacks.delete(systemCallback);
            }
        };
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
function force(val) {
    if (val === undefined || val === null)
        return Reflex.Core.ForceUtil.createFunction();
    if (typeof val === "boolean")
        return new Reflex.BooleanForce(val);
    if (typeof val === "string" || typeof val === "bigint")
        return new Reflex.StatefulForce(val);
    if (typeof val === "number")
        return new Reflex.StatefulForce(val || 0);
    if (Array.isArray(val))
        return Reflex.ArrayForce.create(val);
    if (typeof val === "object" || typeof val === "symbol")
        return new Reflex.StatefulForce(val);
    throw new Error("Cannot create a force from this value.");
}
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        let nextVal = 0;
        let nextTimestamp = 0;
        /** */
        class Locator {
            constructor(type) {
                this.type = type;
                /**
                 * The below array is initialized to empty when the Locator instance
                 * is instantiated. This is because when locators are first instantiated,
                 * they refer to metas that are floating in limbo -- they're not attached
                 * to anything. Locator values only become relevant at the point when
                 * they are attached to some containing meta, because otherwise, it's
                 * not possible for the locator to refer to a meta that has "siblings",
                 * which is the entire point of the Locator concept.
                 */
                this.values = [];
                /**
                 * Timestamps are attached to each meta. They are only used to determine
                 * whether two metas originated in the same container. When iterating
                 * through a meta's children, its possible that some of the metas were moved
                 * in as siblings at runtime. Timestamps are used to make sure these foreign
                 * metas are omitted when doing these iterations.
                 */
                this.timestamp = ++nextTimestamp;
                /**
                 * Stores the timestamp of the branch that was the original "home" of
                 * the branch that this locator refers to. "Home" in this case means the
                 * branch where it was originally appended. In the case when the locator
                 * hasn't been appended anywhere, the value is 0.
                 */
                this.homeTimestamp = 0;
            }
            /**
             * Returns a fully formed Locator object from it's serialized representation.
             */
            static parse(serializedLocator) {
                const parts = serializedLocator.split(/[|>]/g);
                const type = parseInt(parts.shift() || "0", 10) || 0 /* branch */;
                const locator = new Locator(type);
                locator.homeTimestamp = parseInt(parts.shift() || "0", 10) || 0;
                locator.values.push(...parts.map(p => parseInt(p, 10) || 0));
                return locator;
            }
            /** */
            toString() {
                return (this.type + "|" +
                    this.homeTimestamp + "|" +
                    this.values.join(">"));
            }
            /**
             *
             */
            setLastLocatorValue(value) {
                this.values[this.values.length - 1] = value;
            }
            /**
             *
             */
            getlastLocatorValue() {
                return this.values[this.values.length - 1];
            }
            /** */
            setContainer(containerLoc) {
                if (this.homeTimestamp !== 0)
                    return;
                if (1 /* debug */ && this.values.length > 0)
                    throw new Error("?");
                const val = ++nextVal;
                if (containerLoc.type === 2 /* stream */) {
                    this.homeTimestamp = containerLoc.homeTimestamp;
                    this.values.push(...containerLoc.values, val);
                }
                else if (containerLoc.type === 0 /* branch */) {
                    this.homeTimestamp = containerLoc.timestamp;
                    this.values.push(val);
                }
                else if (1 /* debug */ && containerLoc.type === 1 /* leaf */)
                    throw new Error("?");
            }
            /** */
            compare(other) {
                // Detect a potential comparison with a floating meta
                if (this.homeTimestamp === 0 || other.homeTimestamp === 0)
                    return 1 /* incomparable */;
                // Detect differing originating containers
                if (this.homeTimestamp !== other.homeTimestamp)
                    return 1 /* incomparable */;
                const thisLast = this.values[this.values.length - 1];
                const otherLast = other.values[other.values.length - 1];
                // Detect simple equality
                if (thisLast === otherLast)
                    return 0 /* equal */;
                // We're running a comparison on the common portion of the
                // two number sequences. If the one is longer than the other,
                // it's not considered here.
                const minLen = Math.min(this.values.length, other.values.length);
                for (let i = -1; ++i < minLen;) {
                    const thisVal = this.values[i];
                    const otherVal = other.values[i];
                    if (thisVal < otherVal)
                        return 2 /* higher */;
                    if (thisVal > otherVal)
                        return 3 /* lower */;
                }
                // The code below handles the case when we have two sequences
                // of values, where the one sequences is basically an extension of the
                // other, ultimately looking something like this:
                // 
                // 1>2
                // 1>2>3>4
                // 
                // In this case, the shorter sequence is considered "lower" than the
                // longer one, because in this case, the consumers of this method are
                // basically trying to "get to the end of all the 1>2's", and using 1>2
                // as the input to communicate that.
                if (this.values.length > other.values.length)
                    return 2 /* higher */;
                if (this.values.length < other.values.length)
                    return 3 /* lower */;
                throw new Error("?");
            }
        }
        Core.Locator = Locator;
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        /**
         * Creates a Reflex namespace, which is the top-level function object that
         * holds all functions in the reflexive library.
         *
         * This function creates the "leaf" variant of a Reflex namespace, which
         * is the style where the namespace, when called as a function, produces
         * visual content to display. Reflexive libraries that use this variant may
         * use the namespace as a tagged template function, for example:
         * ml`Literal text content`;
         *
         * @param library An object that implements the ILibrary interface,
         * from which the namespace object will be generated.
         *
         * @param globalize Indicates whether the on/once/only globals should
         * be appended to the global object (which is auto-detected from the
         * current environment. If the ILibrary interface provided doesn't support
         * the creation of recurrent functions, this parameter has no effect.
         */
        function createLeafNamespace(library, globalize) {
            if (1 /* debug */ && !library.getLeaf)
                throw new Error("The .getLeaf function must be implemented in this library.");
            return createNamespace(true, library, globalize);
        }
        Core.createLeafNamespace = createLeafNamespace;
        /**
         * Creates a Reflex namespace, which is the top-level function object that
         * holds all functions in the reflexive library.
         *
         * This function creates the "container" variant of a Reflex namespace, which
         * is the style where the namespace, when called as a function, produces
         * an abstract top-level container object.
         *
         * @param library An object that implements the ILibrary interface,
         * from which the namespace object will be generated.
         *
         * @param globalize Indicates whether the on/once/only globals should
         * be appended to the global object (which is auto-detected from the
         * current environment. If the ILibrary interface provided doesn't support
         * the creation of recurrent functions, this parameter has no effect.
         */
        function createBranchNamespace(library, globalize) {
            if (1 /* debug */ && !library.getRootBranch)
                throw new Error("The .getRootBranch function must be implemented in this library.");
            return createNamespace(false, library, globalize);
        }
        Core.createBranchNamespace = createBranchNamespace;
        /**
         * Internal namespace object creation function.
         */
        function createNamespace(isLeaf, library, globalize) {
            Core.RoutingLibrary.addLibrary(library);
            const glob = !globalize ? null :
                // Node.js
                (typeof global === "object" && typeof global.setTimeout === "function") ? global :
                    // Browser / Deno
                    (typeof navigator === "object" || typeof Deno === "object") ? window :
                        null;
            // We create the on, once, and only globals in the case when we're creating
            // a namespace object for a library that supports recurrent functions.
            if (glob && library.attachRecurrent) {
                const createGlobal = (kind) => (selector, callback, ...rest) => {
                    if (library.createRecurrent) {
                        const customRecurrent = library.createRecurrent(kind, selector, callback, rest);
                        if (customRecurrent !== undefined)
                            return customRecurrent;
                    }
                    // We could parse the selector here, see if you have any on-on's,
                    // if you do, call the functions to augment the return value.
                    // Alternatively, we could inline the support for force arrays.
                    return new Reflex.Recurrent(kind, selector, callback, rest);
                };
                if (typeof glob.on !== "function")
                    glob.on = createGlobal(0 /* on */);
                if (typeof glob.once !== "function")
                    glob.once = createGlobal(1 /* once */);
                if (typeof glob.only !== "function")
                    glob.only = createGlobal(2 /* only */);
            }
            /** */
            const staticMembers = (() => {
                const staticBranches = (() => {
                    const branchFns = {};
                    if (library.getStaticBranches) {
                        for (const [key, value] of Object.entries(library.getStaticBranches() || {})) {
                            if (typeof value !== "function")
                                continue;
                            const constructBranchFn = value;
                            branchFns[key] = constructBranchFn.length === 0 ?
                                createBranchFn(constructBranchFn, key) :
                                createParameticBranchFn(constructBranchFn, key);
                        }
                    }
                    return branchFns;
                })();
                const staticNonBranches = library.getStaticNonBranches ?
                    library.getStaticNonBranches() || {} : {};
                return Object.assign({}, staticBranches, staticNonBranches);
            })();
            const nsFn = isLeaf ?
                createLeafNamespaceFn(library) :
                createBranchNamespaceFn(library);
            const nsObj = (() => {
                // In the case when there are no dynamic members, we can just
                // return the static namespace members, and avoid use of Proxies
                // all together.
                if (!library.getDynamicBranch && !library.getDynamicNonBranch)
                    return Object.assign(nsFn, staticMembers);
                // This variable stores an object that contains the members
                // that were attached to the proxy object after it's creation.
                // Currently this is only being used by ReflexML to attach
                // the "emit" function, but others may use it aswell.
                let attachedMembers = null;
                return new Proxy(nsFn, {
                    get(target, key) {
                        if (typeof key !== "string")
                            throw new Error("Unknown property.");
                        if (key === "call" || key === "apply")
                            throw new Error("call() and apply() are not supported.");
                        if (key in staticMembers)
                            return staticMembers[key];
                        if (attachedMembers && key in attachedMembers)
                            return attachedMembers[key];
                        if (library.getDynamicBranch) {
                            const branch = library.getDynamicBranch(key);
                            if (branch)
                                return createBranchFn(() => branch, key);
                        }
                        if (library.getDynamicNonBranch)
                            return library.getDynamicNonBranch(key);
                    },
                    set(target, p, value) {
                        (attachedMembers || (attachedMembers = {}))[p] = value;
                        return true;
                    }
                });
            })();
            namespaceObjects.set(nsObj, library);
            return nsObj;
        }
        /**
         * Returns the ILibrary instance that corresponds
         * to the specified namespace object. This function
         * is used for layering Reflexive libraries on top of
         * each other, i.e., to defer the implementation of
         * one of the ILibrary functions to another ILibrary
         * at a lower-level.
         *
         * The typings of the returned ILibrary assume that
         * all ILibrary functions are implemented in order to
         * avoid excessive "possibly undefined" checks.
         */
        function libraryOf(namespaceObject) {
            const lib = namespaceObjects.get(namespaceObject);
            if (1 /* debug */ && !lib)
                throw new Error("This object does not have an associated Reflex library.");
            return lib;
        }
        Core.libraryOf = libraryOf;
        /**
         * Stores all created namespace objects, used to power the .libraryOf() function.
         */
        const namespaceObjects = new WeakMap();
        /**
         * Returns whether the specified function or method
         * refers to a branch function that was created by a
         * reflexive library.
         */
        function isBranchFunction(fn) {
            return branchFns.has(fn);
        }
        Core.isBranchFunction = isBranchFunction;
        /** */
        const toBranchFunction = (name, fn) => {
            if (name) {
                Object.defineProperty(fn, "name", {
                    value: name,
                    writable: false,
                    configurable: false
                });
            }
            branchFns.add(fn);
            return fn;
        };
        /** Stores the set of all branch functions created by all reflexive libraries. */
        const branchFns = new WeakSet();
        /**
         *
         */
        const createBranchFn = (constructBranchFn, name) => toBranchFunction(name, (...atoms) => returnBranch(constructBranchFn(), atoms));
        /**
         *
         */
        const createParameticBranchFn = (branchFn, name) => (...constructBranchArgs) => toBranchFunction(name, (...atoms) => returnBranch(branchFn(constructBranchArgs), atoms));
        /**
         *
         */
        function returnBranch(branch, atoms) {
            new Core.BranchMeta(branch, atoms);
            const lib = Core.RoutingLibrary.this;
            return lib.returnBranch ?
                lib.returnBranch(branch) :
                branch;
        }
        /**
         * Creates the function that exists at the top of the library,
         * which is used for inserting visible text into the tree.
         */
        function createLeafNamespaceFn(library) {
            return (template, ...values) => {
                const array = Array.isArray(template) ?
                    template :
                    [template];
                const out = [];
                const len = array.length + values.length;
                const getLeaf = library.getLeaf;
                if (!getLeaf)
                    return;
                // TODO: This should be optimized so that multiple
                // repeating string values don't result in the creation
                // of many LeafMeta objects.
                for (let i = -1; ++i < len;) {
                    const val = i % 2 === 0 ?
                        array[i / 2] :
                        values[(i - 1) / 2];
                    if (val === null || val === undefined)
                        continue;
                    if (val instanceof Reflex.StatefulForce) {
                        out.push(new Reflex.Recurrent(0 /* on */, val, now => {
                            const result = getLeaf(now);
                            if (result)
                                new Core.LeafMeta(result);
                            return result;
                        }).run());
                    }
                    else {
                        const prepared = getLeaf(val);
                        if (prepared)
                            out.push(prepared);
                    }
                }
                for (const object of out)
                    new Core.LeafMeta(object);
                return out;
            };
        }
        /**
         * Creates the function that exists at the top of the library,
         * which is used for creating an abstract container object.
         */
        function createBranchNamespaceFn(library) {
            const getRootBranch = library.getRootBranch;
            return getRootBranch ?
                createBranchFn(() => getRootBranch(), "") :
                () => { };
        }
        ;
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        const callbacks = [];
        /**
         * Stores the number of outstanding asynchronous operations
         * are waiting to be completed, so that the ready state callbacks
         * can be triggered.
         */
        let outstanding = 0;
        Core.ReadyState = {
            /**
             * Adds the specified function to the list of callbacks to invoke
             * when all outstanding asynchronous operations have completed.
             * In the case when there are no outstanding callbacks, the function
             * is called immediately.
             */
            await(callback) {
                if (outstanding < 1)
                    callback();
                else
                    callbacks.push(callback);
            },
            /** Increment the ready state. */
            inc() {
                outstanding++;
            },
            /** Decrement the ready state. */
            dec() {
                outstanding--;
                if (outstanding < 0)
                    outstanding = 0;
                if (outstanding === 0) {
                    const fns = callbacks.slice();
                    callbacks.length = 0;
                    for (let i = -1; ++i < fns.length;)
                        fns[i]();
                }
            }
        };
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    const autorunCache = new WeakMap();
    /**
     * Manages the responsibilities of a single call to on() or only().
     */
    class Recurrent {
        /**
         *
         */
        constructor(kind, selector, userCallback, userRestArgs = []) {
            this.kind = kind;
            this.selector = selector;
            this.userCallback = userCallback;
            this.userRestArgs = userRestArgs;
            // In the case when the first argument passed to the
            // recurrent function isn't a valid selector, the parameters
            // are shifted backwards. This is to handle the on() calls
            // that are used to support restorations.
            if (typeof selector === "function" && !Reflex.isForce(selector)) {
                userRestArgs.unshift(userCallback);
                this.userCallback = selector;
                this.selector = "";
            }
        }
        /**
         *
         */
        run(...callbackArguments) {
            autorunCache.set(this, callbackArguments);
            return this;
        }
    }
    Reflex.Recurrent = Recurrent;
    let Core;
    (function (Core) {
        /**
         * @internal
         * A class that deals with the special case of a Force that
         * was plugged into an attribute.
         */
        class AttributeRecurrent extends Recurrent {
            constructor(attributeKey, force) {
                super(0 /* on */, force, ((now) => new Core.AttributeMeta(attributeKey, now)));
                autorunCache.set(this, []);
            }
        }
        Core.AttributeRecurrent = AttributeRecurrent;
        /**
         * @internal
         * Extracts the autorun arguments from the internal cache.
         * Can only be executed once.
         */
        function extractAutorunArguments(recurrent) {
            const args = autorunCache.get(recurrent) || null;
            if (args)
                autorunCache.delete(recurrent);
            return args;
        }
        Core.extractAutorunArguments = extractAutorunArguments;
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        /**
         * @internal
         * A class that sits between the specific Reflexive library,
         * and the Library class as defined in the Reflex Core. The
         * purpose of this class is to override all the methods, and
         * determine the specific library to route each call to the
         * abstract methods. It operates by looking at the constructor
         * function of the Branch object provided to all the methods,
         * and then using this to determine what library is responsible
         * for objects of this type.
         */
        class RoutingLibrary {
            constructor() {
            }
            /**
             * Singleton accessor property.
             */
            static get this() {
                return this._this === null ?
                    this._this = new RoutingLibrary() :
                    this._this;
            }
            /**
             * Adds a reference to a Reflexive library, which may be
             * called upon in the future.
             */
            static addLibrary(library) {
                this.libraries.push(library);
            }
            /**
             * Conditionally executes the specified library function,
             * in the case when it's defined.
             */
            route(referenceBranch, getFn, callFn, defaultValue) {
                if (referenceBranch) {
                    const libs = RoutingLibrary.libraries;
                    // It's important that test for associativity between a
                    // branch and a library is done in reverse order, in order
                    // to support the case of Reflexive libraries being layered
                    // on top of each other. If Reflexive library A is layered on
                    // Reflexive library B, A will be added to the libraries array
                    // before B. The libraries array therefore has an implicit
                    // topological sort. Iterating backwards ensures that the
                    // higher-level libraries are tested before the lower-level ones.
                    // This is critical, because a higher-level library may operate
                    // on the same branch types as the lower-level libraries that
                    // it's abstracting.
                    for (let i = libs.length; i-- > 0;) {
                        const lib = libs[i];
                        if (lib.isKnownBranch(referenceBranch)) {
                            const libFn = getFn(lib);
                            return typeof libFn === "function" ?
                                callFn(libFn, lib) :
                                defaultValue;
                        }
                    }
                }
                throw new Error("Unknown branch type.");
            }
            /**
             *
             */
            isKnownBranch(branch) {
                return this.route(branch, lib => lib.isKnownBranch, (fn, lib) => fn.call(lib, branch), false);
            }
            /**
             * Reflexive libraries may implement this method in order to provide
             * the system with knowledge of whether a branch has been disposed,
             * which it uses for performance optimizations. If the library has no
             * means of doing this, it may return "null".
             */
            isBranchDisposed(branch) {
                return this.route(branch, lib => lib.isBranchDisposed, (fn, lib) => fn.call(lib, branch), false);
            }
            /**
             * Reflexive libraries that support inline target+children closures
             * must provide an implementation for this method.
             */
            getChildren(target) {
                return this.route(target, lib => lib.getChildren, (fn, lib) => fn.call(lib, target), []);
            }
            /**
             *
             */
            getLeaf(leaf) {
                return this.route(leaf, lib => lib.getLeaf, (fn, lib) => fn.call(lib, leaf), null);
            }
            /**
             *
             */
            attachAtom(atom, branch, ref) {
                this.route(branch, lib => lib.attachAtom, (fn, lib) => fn.call(lib, atom, branch, ref));
            }
            /**
             *
             */
            detachAtom(atom, branch) {
                this.route(branch, lib => lib.detachAtom, (fn, lib) => fn.call(lib, atom, branch));
            }
            /**
             *
             */
            swapBranches(branch1, branch2) {
                this.route(branch1, lib => lib.swapBranches, (fn, lib) => fn.call(lib, branch1, branch2));
            }
            /**
             *
             */
            replaceBranch(branch1, branch2) {
                this.route(branch1, lib => lib.replaceBranch, (fn, lib) => fn.call(lib, branch1, branch2));
            }
            /**
             *
             */
            attachAttribute(branch, key, value) {
                this.route(branch, lib => lib.attachAttribute, (fn, lib) => fn.call(lib, branch, key, value));
            }
            /**
             *
             */
            detachAttribute(branch, key) {
                this.route(branch, lib => lib.detachAttribute, (fn, lib) => fn.call(lib, branch, key));
            }
            /**
             * Reflexive libraries that contribute to the global on() function
             * must provide an implementation for this method.
             *
             * Libraries must implement this function in order to provide their own
             * hooks into the global recurrent functions (such as on(), only() and once()).
             *
             * If the library does not recognize the selector provided, it should
             * return false, so that the Reflex engine can find another place to
             * perform the attachment. In other cases, it should return true.
             */
            attachRecurrent(kind, target, selector, callback, rest) {
                return this.route(target, lib => lib.attachRecurrent, (fn, lib) => fn.call(lib, kind, target, selector, callback, rest), false);
            }
            /**
             * Reflexive libraries that contribute to the global off() function
             * must provide an implementation for this method.
             */
            detachRecurrent(branch, selector, callback) {
                return this.route(branch, lib => lib.detachRecurrent, (fn, lib) => fn.call(lib, branch, selector, callback), false);
            }
            /**
             * Reflexive libraries can implement this function in order
             * to capture the flow of branches being passed as
             * atoms to other branch functions.
             */
            handleBranchFunction(branch, branchFn) {
                return this.route(branch, lib => lib.handleBranchFunction, (fn, lib) => fn.call(lib, branch, branchFn));
            }
            /**
             * Reflexive libraries can implement this function in order to process
             * a branch before it's returned from a branch function. When this
             * function is implemented, the return value of the branch functions
             * are replaced with the return value of this function. Reflexive libraries
             * that require the standard behavior of returning branches from the
             * branch functions should return the `branch` argument to this function
             * verbatim.
             */
            returnBranch(branch) {
                return this.route(branch, lib => lib.returnBranch, (fn, lib) => fn.call(lib, branch), branch);
            }
        }
        RoutingLibrary._this = null;
        RoutingLibrary.libraries = [];
        Core.RoutingLibrary = RoutingLibrary;
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    /**
     * A class that wraps a value whose changes can be observed.
     */
    class StatefulForce {
        constructor(value) {
            /**
             * @internal
             * It's important that this is an assignment rather than a function,
             * because the event needs to be on the instance rather than in the
             * prototype so that it's caught by the event system.
             */
            this.changed = force();
            this._value = value;
        }
        /**
         * Gets or sets the value of the force.
         */
        get value() {
            return this._value;
        }
        set value(value) {
            const was = this._value;
            this._value = value;
            if (was !== this._value)
                this.changed(value, was);
        }
        /**
         * Sets the value of the force and returns void.
         * (Useful for force arguments in arrow functions to cancel the return value.)
         */
        set(value) {
            this.value = value;
        }
        /** Returns a string representation of the value of this force. */
        toString() {
            return "" + this._value;
        }
        /**
         *
         */
        valueOf() {
            return this._value;
        }
    }
    Reflex.StatefulForce = StatefulForce;
    /**
     *
     */
    class BooleanForce extends StatefulForce {
        /**
         * Flips the value of the force from true to false or false to true.
         * (Useful for force arguments in arrow functions to cancel the return value.)
         */
        flip() {
            this.set(!this.value);
        }
    }
    Reflex.BooleanForce = BooleanForce;
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        /**
         * Deals with temporarily tracking inserted metas.
         *
         * One single branch can potentially have multiple trackers
         * associated with it, in the case when the branch has multiple
         * layers of stream metas applied to it. There is one tracker instance
         * for each set of "sibling" metas.
         */
        class Tracker {
            /** */
            constructor(branch, ref = "append") {
                this.branch = branch;
                this.last = ref;
            }
            /**
             * Updates the internal tracking value of the Tracker.
             */
            update(object) {
                this.last = object;
            }
            /**
             * Returns a value that can be used in a client library as the
             * reference sibling value to indicate an insertion point.
             */
            getLastHardRef() {
                return this.last instanceof Core.Locator ?
                    this.resolveRef() :
                    this.last;
            }
            /**
             * Clones and returns this Tracker. Used to create a new
             * Tracker instance for a more nested level of stream meta.
             */
            derive() {
                const out = new Tracker(this.branch);
                out.last = this.last;
                if (1 /* debug */)
                    out.trackerContainer = this;
                return out;
            }
            /**
             * Ensures that the specified ref object actually exists in the Reflexive
             * tree, and if not, a new object is returned that can be used as the ref.
             * In the case when null is returned, null should be used as the ref,
             * indicating that the insertion should occur at the end of the child list.
             */
            resolveRef() {
                const ref = this.last;
                if (ref === null)
                    throw new Error("?");
                if (ref === "prepend" || ref === "append")
                    return ref;
                const refLocator = (() => {
                    if (ref instanceof Core.Locator)
                        return ref;
                    const refMeta = Core.BranchMeta.of(ref) ||
                        Core.LeafMeta.of(ref);
                    return refMeta ?
                        refMeta.locator :
                        null;
                })();
                if (!refLocator)
                    return "append";
                const children = Core.RoutingLibrary.this.getChildren(this.branch);
                let previous = null;
                for (const child of children) {
                    if (ref === child)
                        return ref;
                    const currentChildMeta = Core.BranchMeta.of(child) ||
                        Core.LeafMeta.of(child);
                    if (currentChildMeta) {
                        // The explanation of this algorithm is that we're walking through
                        // the direct child metas of containingBranch. The ideal case is
                        // that the meta that was previously being used as the locator is
                        // still present in the document. In this case, the ref doesn't need
                        // to be updated, so it can just be returned verbatim. However, 
                        // in the case when the ref is missing, we need to return the next
                        // newest meta that isn't newer than the locator of the original
                        // ref.
                        const cmp = currentChildMeta.locator.compare(refLocator);
                        if (cmp === 0 /* equal */)
                            return child;
                        // The current child meta is newer than the ref meta. This means
                        // that we went too far, so we should return the previous meta.
                        // Or, in the case when we haven't hit a meta yet, we need to
                        // return the constant "prepend" (because there's nothing to
                        // refer to in this case).
                        if (cmp === 3 /* lower */)
                            return previous || "prepend";
                    }
                    previous = child;
                }
                return "append";
            }
        }
        Core.Tracker = Tracker;
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        /**
         *
         */
        class ArrayStreamMeta extends Core.StreamMeta {
            constructor(containerMeta, recurrent) {
                super(containerMeta);
                this.containerMeta = containerMeta;
                this.recurrent = recurrent;
                this.nextMetaKey = 0;
            }
            /**
             *
             */
            attach(containingBranch, tracker) {
                const localTracker = tracker.derive();
                localTracker.update(this.locator);
                const rec = this.recurrent;
                const forceArray = rec.selector;
                const restArgs = rec.userRestArgs.slice();
                for (let i = -1; ++i < forceArray.length;) {
                    const fo = forceArray[i];
                    const atoms = rec.userCallback(fo, containingBranch, i, ...restArgs);
                    const metas = Core.CoreUtil.translateAtoms(containingBranch, this.containerMeta, atoms);
                    Core.CoreUtil.applyMetas(containingBranch, this.containerMeta, metas, localTracker);
                }
                const findMeta = (position) => {
                    let pos = position;
                    const iterator = Core.RoutingLibrary.this.getChildren(containingBranch);
                    for (const item of iterator) {
                        const Meta = Core.BranchMeta.of(item);
                        if (Meta &&
                            Meta.locator.compare(this.locator) === 3 /* lower */ &&
                            --pos === -1) {
                            return Meta;
                        }
                    }
                };
                Core.ForceUtil.attachForce(forceArray.root.changed, (item, position) => {
                    const internalPos = forceArray.positions.indexOf(position);
                    if (position > -1) {
                        const meta = findMeta(internalPos);
                        if (meta) {
                            const atoms = rec.userCallback(item, containingBranch, position);
                            const metas = Core.CoreUtil.translateAtoms(containingBranch, this.containerMeta, atoms)[0];
                            metas.locator.setContainer(this.containerMeta.locator);
                            Core.RoutingLibrary.this.replaceBranch(meta.branch, metas.branch);
                        }
                    }
                });
                Core.ForceUtil.attachForce(forceArray.added, (item, position) => {
                    const atoms = rec.userCallback(item, containingBranch, position);
                    const metas = Core.CoreUtil.translateAtoms(containingBranch, this.containerMeta, atoms);
                    let tracker = localTracker;
                    if (position < forceArray.length) {
                        const meta = findMeta(position - 1);
                        if (meta) {
                            tracker = localTracker.derive();
                            tracker.update(meta.branch);
                        }
                    }
                    Core.CoreUtil.applyMetas(containingBranch, this.containerMeta, metas, tracker);
                });
                Core.ForceUtil.attachForce(forceArray.removed, (item, position) => {
                    const meta = findMeta(position);
                    if (meta)
                        Core.CoreUtil.unapplyMetas(containingBranch, [meta]);
                });
                Core.ForceUtil.attachForce(forceArray.moved, (item1, item2, index1, index2) => {
                    const source = findMeta(index1);
                    const target = findMeta(index2);
                    if (source && target) {
                        const srcLocVal = source.locator.getlastLocatorValue();
                        const targetLocVal = target.locator.getlastLocatorValue();
                        source.locator.setLastLocatorValue(targetLocVal);
                        target.locator.setLastLocatorValue(srcLocVal);
                        Core.RoutingLibrary.this.swapBranches(source.branch, target.branch);
                    }
                });
                Core.ForceUtil.attachForce(forceArray.tailChange, (item, position) => {
                    const source = findMeta(position);
                    if (source)
                        localTracker.update(source.branch);
                });
            }
            /** */
            filterRendered(rendered) {
                const metas = rendered.slice();
                for (let i = metas.length; i-- > 0;) {
                    const meta = metas[i];
                    if (meta instanceof Core.BranchMeta || meta instanceof Core.LeafMeta) {
                        meta.key = ++this.nextMetaKey;
                        rendered.splice(i, 1);
                    }
                }
                return metas;
            }
            /** */
            unfilterRendered(key, containingBranch) {
                const resolved = [];
                const iterator = Core.RoutingLibrary.this.getChildren(containingBranch);
                let inRange = false;
                for (const child of iterator) {
                    const childMeta = Core.BranchMeta.of(child) ||
                        Core.LeafMeta.of(child);
                    if (childMeta && childMeta.key === key) {
                        inRange = true;
                        resolved.push(childMeta);
                    }
                    else if (inRange)
                        break;
                }
                return resolved;
            }
        }
        Core.ArrayStreamMeta = ArrayStreamMeta;
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmbGV4LWNvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90c2NvbnN0LnRzIiwiLi4vc291cmNlL0FwZXgudHMiLCIuLi9zb3VyY2UvTWV0YS9NZXRhLnRzIiwiLi4vc291cmNlL01ldGEvQnJhbmNoTWV0YS50cyIsIi4uL3NvdXJjZS9NZXRhL0xlYWZNZXRhLnRzIiwiLi4vc291cmNlL01ldGEvUmVjdXJyZW50U3RyZWFtTWV0YS50cyIsIi4uL3NvdXJjZS9NZXRhL1Byb21pc2VTdHJlYW1NZXRhLnRzIiwiLi4vc291cmNlL01ldGEvQXN5bmNJdGVyYWJsZVN0cmVhbU1ldGEudHMiLCIuLi9zb3VyY2UvIS50cyIsIi4uL3NvdXJjZS9BcnJheUZvcmNlLnRzIiwiLi4vc291cmNlL0FycmF5U3RvcmUudHMiLCIuLi9zb3VyY2UvQ2hpbGRyZW5PZi50cyIsIi4uL3NvdXJjZS9Db3JlVXRpbC50cyIsIi4uL3NvdXJjZS9EZWZpbml0aW9ucy50cyIsIi4uL3NvdXJjZS9Gb3JjZVV0aWwudHMiLCIuLi9zb3VyY2UvR2xvYmFscy50cyIsIi4uL3NvdXJjZS9JTGlicmFyeS50cyIsIi4uL3NvdXJjZS9Mb2NhdG9yLnRzIiwiLi4vc291cmNlL05hbWVzcGFjZU9iamVjdC50cyIsIi4uL3NvdXJjZS9Ob2RlQXJyYXkudHMiLCIuLi9zb3VyY2UvUmVhZHlTdGF0ZS50cyIsIi4uL3NvdXJjZS9SZWN1cnJlbnQudHMiLCIuLi9zb3VyY2UvUm91dGluZ0xpYnJhcnkudHMiLCIuLi9zb3VyY2UvU3RhdGVmdWxGb3JjZS50cyIsIi4uL3NvdXJjZS9UcmFja2VyLnRzIiwiLi4vc291cmNlL01ldGEvQXJyYXlTdHJlYW1NZXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FDR0EsOERBQThEO0FBQzlELCtEQUErRDtBQUMvRCxpQkFBaUI7QUFDakIsRUFBRTtBQUNGLGdFQUFnRTtBQUNoRSw0REFBNEQ7QUFDNUQsc0RBQXNEO0FBQ3RE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QUMsTUFBTTt3QkFDOUMsS0FBSyxDQUFDOzRCQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUFDLE1BQU07d0JBQ3BELEtBQUssQ0FBQzs0QkFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQUMsTUFBTTt3QkFDMUQsS0FBSyxDQUFDOzRCQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQUMsTUFBTTt3QkFDaEUsS0FBSyxDQUFDOzRCQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUFDLE1BQU07d0JBQ3RF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QUNkLEtBQUEsVUFBVSxDQUFDLEVBQUUsQ0FBTSxLQUFLLENBQUM7d0JBQ3pCLEtBQUEsUUFBUSxDQUFDLEVBQUUsQ0FBTSxLQUFLLENBQUMsQ0FBQztvQkFFekIsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDLEdBQUcsS0FBSyxHQUFHLEVBQ3RDO3dCQUNDLE9BQU8sR0FBRyxJQUFJLENBQUM7d0JBQ2YsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztxQkFDekI7eUJBQ0ksSUFBSSxPQUFPO3dCQUNmLE1BQU07aUJBQ1A7Z0JBRUQsT0FBTyxRQUFRLENBQUM7WUFDakIsQ0FBQztTQUNEO1FBdkxZLG9CQUFlLGtCQXVMM0IsQ0FBQTtJQUdGLENBQUMsRUEvTGdCLElBQUksR0FBSixXQUFJLEtBQUosV0FBSSxRQStMcEI7QUFBRCxDQUFDLEVBL0xTLE1BQU0sS0FBTixNQUFNLFFBK0xmIiwic291cmNlc0NvbnRlbnQiOlsiXG5jb25zdCBlbnVtIENvbnN0XG57XG5cdFwiXCIsXG5cdGRlYnVnLFxuXHRtb2Rlcm4sXG5cdG5vZGUsXG5cdGJyb3dzZXJcbn1cbiIsIlxuZGVjbGFyZSBmdW5jdGlvbiBSZWZsZXgoKTogdm9pZDtcblxuLy8gTm8sIG5vLiBUaGlzIGlzbid0IGFjdHVhbGx5IGEgdXNhZ2Ugb2YgdGhlIGV2YWwoKSBmdW5jdGlvbi5cbi8vIFRoaXMgaXMgb25seSBmb3IgZGV2ZWxvcG1lbnQgdGltZS4gQXQgcnVudGltZSwgdGhlIGV2YWwgY2FsbFxuLy8gaXMgdW53cmFwcGVkLiBcbi8vXG4vLyBUaGlzIGlzIGp1c3QgdG8gZ2V0IGFyb3VuZCB0aGUgcHJvYmxlbSB0aGF0IHRoZXJlJ3MgY3VycmVudGx5XG4vLyBubyB3YXkgdG8gbWVyZ2UgYSBuYW1lc3BhY2UgYWNyb3NzIG11bHRpcGxlIGZpbGVzLCBpbiB0aGVcbi8vIGNhc2Ugd2hlbiB0aGUgbmFtZXNwYWNlIGlzIGFsc28gYmVpbmcgbWVyZ2VkIHdpdGggYVxuLy8gZnVuY3Rpb24uIEhvd2V2ZXIsIGJlY2F1c2UgdGhpcyBwcm9qZWN0IHVzZXMgLS1vdXRGaWxlIGZvclxuLy8gYnVuZGxpbmcsIHRoZSBvdXRwdXQgZG9lc24ndCBoYXZlIGFueSBKYXZhU2NyaXB0LWxldmVsXG4vLyBpc3N1ZXMuXG5ldmFsKFwiZnVuY3Rpb24gUmVmbGV4KCkgeyB9XCIpO1xuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqICovXG5cdGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBNZXRhXG5cdHtcblx0XHRjb25zdHJ1Y3RvcihyZWFkb25seSBsb2NhdG9yOiBMb2NhdG9yKSB7IH1cblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTdGVtTWV0YSBleHRlbmRzIE1ldGFcblx0e1xuXHRcdGNvbnN0cnVjdG9yKGxvY2F0b3I/OiBMb2NhdG9yKVxuXHRcdHtcblx0XHRcdHN1cGVyKGxvY2F0b3IgfHwgbmV3IExvY2F0b3IoTG9jYXRvclR5cGUubGVhZikpO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqXG5cdCAqIFN0b3JlcyB0aGUgaW5mb3JtYXRpb24gYWJvdXQgYSBzaW5nbGUgYXR0cmlidXRlLlxuXHQgKiBBbHRob3VnaCBhdHRyaWJ1dGVzIGNhbiBjb21lIGluIGEgbGFyZ2Ugb2JqZWN0IGxpdGVyYWxcblx0ICogdGhhdCBzcGVjaWZpZXMgbWFueSBhdHRyaWJ1dGVzIHRvZ2V0aGVyLCB0aGUgYXRvbVxuXHQgKiB0cmFuc2xhdG9yIGZ1bmN0aW9uIHNwbGl0cyB0aGVtIHVwIGludG8gc21hbGxlciBtZXRhcyxcblx0ICogd2hpY2ggaXMgZG9uZSBiZWNhdXNlIHNvbWUgdmFsdWVzIG1heSBiZSBzdGF0aWMsXG5cdCAqIGFuZCBvdGhlcnMgbWF5IGJlIGJlaGluZCBhIGZvcmNlLlxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIEF0dHJpYnV0ZU1ldGEgZXh0ZW5kcyBTdGVtTWV0YVxuXHR7XG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRyZWFkb25seSBrZXk6IHN0cmluZyxcblx0XHRcdHJlYWRvbmx5IHZhbHVlOiBhbnkpXG5cdFx0e1xuXHRcdFx0c3VwZXIoKTtcblx0XHR9XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBTdG9yZXMgaW5mb3JtYXRpb24gYWJvdXQgc29tZSB2YWx1ZSB0aGF0IGlzIGtub3duXG5cdCAqIHRvIHRoZSBsaWJyYXJ5IHRoYXQgd2lsbCBiZSBhcHBsaWVkIHRvIHNvbWUgYnJhbmNoLlxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIFZhbHVlTWV0YSBleHRlbmRzIFN0ZW1NZXRhXG5cdHtcblx0XHRjb25zdHJ1Y3RvcihyZWFkb25seSB2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgYmlnaW50KVxuXHRcdHtcblx0XHRcdHN1cGVyKCk7XG5cdFx0fVxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGNsYXNzIENsb3N1cmVNZXRhIGV4dGVuZHMgU3RlbU1ldGFcblx0e1xuXHRcdGNvbnN0cnVjdG9yKHJlYWRvbmx5IGNsb3N1cmU6IEZ1bmN0aW9uKVxuXHRcdHtcblx0XHRcdHN1cGVyKCk7XG5cdFx0fVxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGFic3RyYWN0IGNsYXNzIENvbnRhaW5lck1ldGEgZXh0ZW5kcyBNZXRhIHsgfVxuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGFic3RyYWN0IGNsYXNzIFN0cmVhbU1ldGEgZXh0ZW5kcyBDb250YWluZXJNZXRhXG5cdHtcblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdHJlYWRvbmx5IGNvbnRhaW5lck1ldGE6IENvbnRhaW5lck1ldGEsXG5cdFx0XHRsb2NhdG9yPzogTG9jYXRvcilcblx0XHR7XG5cdFx0XHRzdXBlcihsb2NhdG9yIHx8IG5ldyBMb2NhdG9yKExvY2F0b3JUeXBlLnN0cmVhbSkpO1xuXHRcdH1cblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIEJyYW5jaE1ldGEgZXh0ZW5kcyBDb250YWluZXJNZXRhXG5cdHtcblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIHRoZSBCcmFuY2hNZXRhIG9iamVjdCB0aGF0IGNvcnJlc3BvbmRzXG5cdFx0ICogdG8gdGhlIHNwZWNpZmllZCBCcmFuY2ggb2JqZWN0LlxuXHRcdCAqL1xuXHRcdHN0YXRpYyBvZihicmFuY2g6IElCcmFuY2gpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMubWV0YXMuZ2V0KGJyYW5jaCkgfHwgbnVsbDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgbWV0YXMgPSBuZXcgV2Vha01hcDxJQnJhbmNoLCBCcmFuY2hNZXRhPigpO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0YnJhbmNoOiBJQnJhbmNoLFxuXHRcdFx0aW5pdGlhbEF0b21zOiBBdG9tW10sXG5cdFx0XHRsb2NhdG9yPzogTG9jYXRvcilcblx0XHR7XG5cdFx0XHRzdXBlcihsb2NhdG9yIHx8IG5ldyBMb2NhdG9yKExvY2F0b3JUeXBlLmJyYW5jaCkpO1xuXHRcdFx0dGhpcy5icmFuY2ggPSBicmFuY2g7XG5cdFx0XHRCcmFuY2hNZXRhLm1ldGFzLnNldChicmFuY2gsIHRoaXMpO1xuXHRcdFx0XG5cdFx0XHRpZiAoaW5pdGlhbEF0b21zLmxlbmd0aClcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgbWV0YXMgPSBDb3JlVXRpbC50cmFuc2xhdGVBdG9tcyhcblx0XHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdFx0dGhpcyxcblx0XHRcdFx0XHRpbml0aWFsQXRvbXMpO1xuXHRcdFx0XHRcblx0XHRcdFx0Q29yZVV0aWwuYXBwbHlNZXRhcyhicmFuY2gsIHRoaXMsIG1ldGFzKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQGludGVybmFsXG5cdFx0ICogV0FSTklORzogRG8gbm90IGhvbGQgb250byByZWZlcmVuY2VzIHRvIHRoaXNcblx0XHQgKiB2YWx1ZSwgb3IgbWVtb3J5IGxlYWtzIHdpbGwgaGFwcGVuLlxuXHRcdCAqIFxuXHRcdCAqIChOb3RlOiB0aGlzIHByb3BlcnR5IGlzIGEgYml0IG9mIGEgY29kZSBzbWVsbC4gVGhlIHVzYWdlc1xuXHRcdCAqIG9mIGl0IHNob3VsZCBiZSByZXBsYWNlZCB3aXRoIGNvZGUgdGhhdCByZS1kaXNjb3ZlcnMgdGhlXG5cdFx0ICogYnJhbmNoIG9iamVjdC4pXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgYnJhbmNoOiBJQnJhbmNoO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEFuIGFyYml0cmFyeSB1bmlxdWUgdmFsdWUgdXNlZCB0byBpZGVudGlmeSBhbiBpbmRleCBpbiBhIGZvcmNlXG5cdFx0ICogYXJyYXkgdGhhdCB3YXMgcmVzcG9uc2libGUgZm9yIHJlbmRlcmluZyB0aGlzIEJyYW5jaE1ldGEuXG5cdFx0ICovXG5cdFx0a2V5ID0gMDtcblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqICovXG5cdGV4cG9ydCBjbGFzcyBMZWFmTWV0YSBleHRlbmRzIFN0ZW1NZXRhXG5cdHtcblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIHRoZSBMZWFmTWV0YSBvYmplY3QgdGhhdCBjb3JyZXNwb25kc1xuXHRcdCAqIHRvIHRoZSBzcGVjaWZpZWQgTGVhZiBvYmplY3QuXG5cdFx0ICovXG5cdFx0c3RhdGljIG9mKGxlYWY6IElMZWFmKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLm1ldGFzLmdldChsZWFmKSB8fCBudWxsO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIHN0YXRpYyByZWFkb25seSBtZXRhcyA9IG5ldyBXZWFrTWFwPElMZWFmLCBMZWFmTWV0YT4oKTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdHJlYWRvbmx5IHZhbHVlOiBJTGVhZixcblx0XHRcdGxvY2F0b3I/OiBMb2NhdG9yKVxuXHRcdHtcblx0XHRcdHN1cGVyKGxvY2F0b3IpO1xuXHRcdFx0TGVhZk1ldGEubWV0YXMuc2V0KHZhbHVlLCB0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQW4gYXJiaXRyYXJ5IHVuaXF1ZSB2YWx1ZSB1c2VkIHRvIGlkZW50aWZ5IGFuIGluZGV4IGluIGEgZm9yY2Vcblx0XHQgKiBhcnJheSB0aGF0IHdhcyByZXNwb25zaWJsZSBmb3IgcmVuZGVyaW5nIHRoaXMgQnJhbmNoTWV0YS5cblx0XHQgKi9cblx0XHRrZXkgPSAwO1xuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgUmVjdXJyZW50U3RyZWFtTWV0YSBleHRlbmRzIFN0cmVhbU1ldGFcblx0e1xuXHRcdC8qKiAqL1xuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cmVhZG9ubHkgY29udGFpbmVyTWV0YTogQ29udGFpbmVyTWV0YSxcblx0XHRcdHJlYWRvbmx5IHJlY3VycmVudDogUmVjdXJyZW50LFxuXHRcdFx0bG9jYXRvcj86IExvY2F0b3IpXG5cdFx0e1xuXHRcdFx0c3VwZXIoY29udGFpbmVyTWV0YSwgbG9jYXRvcik7XG5cdFx0XHR0aGlzLnJlY3VycmVudCA9IHJlY3VycmVudDtcblx0XHRcdGNvbnN0IHNlbGYgPSB0aGlzO1xuXHRcdFx0XG5cdFx0XHR0aGlzLl9zeXN0ZW1DYWxsYmFjayA9IChmdW5jdGlvbih0aGlzOiBJQnJhbmNoLCAuLi5zeXN0ZW1SZXN0QXJnczogYW55W10pXG5cdFx0XHR7XG5cdFx0XHRcdC8vIFRoaXMgaXMgY2hlYXRpbmcgYSBiaXQuIFdlJ3JlIGdldHRpbmcgdGhlIGJyYW5jaFxuXHRcdFx0XHQvLyBmcm9tIHRoZSBcInRoaXNcIiByZWZlcmVuY2UgcGFzc2VkIHRvIGV2ZW50IGNhbGxiYWNrcy5cblx0XHRcdFx0Ly8gU29tZSBsaWJyYXJpZXMgKHN1Y2ggYXMgdGhlIERPTSkgc2V0IHRoZSBcInRoaXNcIiByZWZlcmVuY2Vcblx0XHRcdFx0Ly8gdG8gd2hhdCBlc3NlbnRpYWxseSBhbW91bnRzIHRvIHRoZSBicmFuY2ggd2UncmUgdHJ5aW5nXG5cdFx0XHRcdC8vIHRvIGdldCwgd2l0aG91dCBhY3R1YWxseSBzdG9yaW5nIGEgcmVmZXJlbmNlIHRvIGl0LiBIb3BlZnVsbHlcblx0XHRcdFx0Ly8gdGhlIG90aGVyIHBsYXRmb3JtcyBvbiB3aGljaCByZWZsZXhpdmUgbGlicmFyaWVzIGFyZSBidWlsdFxuXHRcdFx0XHQvLyB3aWxsIGV4aGliaXQgKG9yIGNhbiBiZSBtYWRlIHRvIGV4aWJpdCkgdGhpcyBzYW1lIGJlaGF2aW9yLlxuXHRcdFx0XHRcblx0XHRcdFx0aWYgKHRoaXMgPT09IG51bGwpXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTGlicmFyeSBub3QgaW1wbGVtZW50ZWQgcHJvcGVybHkuXCIpO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3Qgd2FzTWV0YXMgPSByZXNvbHZlUmV0dXJuZWQoc2VsZi5yZXR1cm5lZCwgdGhpcyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoIXNlbGYuaW5BdXRvUnVuQ29udGV4dClcblx0XHRcdFx0XHRpZiAoUm91dGluZ0xpYnJhcnkudGhpcy5pc0JyYW5jaERpc3Bvc2VkKHRoaXMpKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHNlbGYuZGV0YWNoUmVjdXJyZW50cyhcblx0XHRcdFx0XHRcdFx0dGhpcyxcblx0XHRcdFx0XHRcdFx0cmVjdXJyZW50LnNlbGVjdG9yLFxuXHRcdFx0XHRcdFx0XHRzZWxmLnN5c3RlbUNhbGxiYWNrKTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0Q29yZVV0aWwudW5hcHBseU1ldGFzKHRoaXMsIHdhc01ldGFzKTtcblx0XHRcdFx0XHRcdHNlbGYucmV0dXJuZWQubGVuZ3RoID0gMDtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBUaGlzIGlzIGEgc2FmZXR5IGNoZWNrLCB3ZSdyZSBhbHNvIGRvaW5nIHRoaXMgYmVsb3csIGJ1dCBpdCdzXG5cdFx0XHRcdC8vIGltcG9ydGFudCB0byBtYWtlIHN1cmUgdGhpcyBnZXRzIHNldCB0byBmYWxzZSBhcyBzb29uIGFzIHBvc3NpYmxlLlxuXHRcdFx0XHRzZWxmLmluQXV0b1J1bkNvbnRleHQgPSBmYWxzZTtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IGZuID0gcmVjdXJyZW50LnVzZXJDYWxsYmFjaztcblx0XHRcdFx0Y29uc3QgciA9IHN5c3RlbVJlc3RBcmdzXG5cdFx0XHRcdFx0LmNvbmNhdCh0aGlzKVxuXHRcdFx0XHRcdC5jb25jYXQocmVjdXJyZW50LnVzZXJSZXN0QXJncyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRsZXQgcDogYW55O1xuXHRcdFx0XHRcblx0XHRcdFx0c3dpdGNoIChyLmxlbmd0aClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNhc2UgMDogcCA9IGZuKCk7IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgMTogcCA9IGZuKHJbMF0pOyBicmVhaztcblx0XHRcdFx0XHRjYXNlIDI6IHAgPSBmbihyWzBdLCByWzFdKTsgYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAzOiBwID0gZm4oclswXSwgclsxXSwgclsyXSk7IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgNDogcCA9IGZuKHJbMF0sIHJbMV0sIHJbMl0sIHJbM10pOyBicmVhaztcblx0XHRcdFx0XHRjYXNlIDU6IHAgPSBmbihyWzBdLCByWzFdLCByWzJdLCByWzNdLCByWzRdKTsgYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSA2OiBwID0gZm4oclswXSwgclsxXSwgclsyXSwgclszXSwgcls0XSwgcls1XSk7IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgNzogcCA9IGZuKHJbMF0sIHJbMV0sIHJbMl0sIHJbM10sIHJbNF0sIHJbNV0sIHJbNl0pOyBicmVhaztcblx0XHRcdFx0XHRjYXNlIDg6IHAgPSBmbihyWzBdLCByWzFdLCByWzJdLCByWzNdLCByWzRdLCByWzVdLCByWzZdLCByWzddKTsgYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSA5OiBwID0gZm4oclswXSwgclsxXSwgclsyXSwgclszXSwgcls0XSwgcls1XSwgcls2XSwgcls3XSwgcls4XSk7IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgMTA6IHAgPSBmbihyWzBdLCByWzFdLCByWzJdLCByWzNdLCByWzRdLCByWzVdLCByWzZdLCByWzddLCByWzhdLCByWzldKTsgYnJlYWs7XG5cdFx0XHRcdFx0ZGVmYXVsdDogcCA9IGZuKC4uLnIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBUaGlzIGlzIGEgcXVpY2sgdGVzdCB0byBhdm9pZCBkb2luZyBwb2ludGxlc3Mgd29ya1xuXHRcdFx0XHQvLyBpbiB0aGUgcmVsYXRpdmVseSBjb21tb24gY2FzZSB0aGF0IHRoZSByZWN1cnJlbnRcblx0XHRcdFx0Ly8gZG9lc24ndCBoYXZlIGEgcmVsZXZhbnQgcmV0dXJuIHZhbHVlLlxuXHRcdFx0XHRpZiAod2FzTWV0YXMubGVuZ3RoID4gMCB8fCBwICE9PSB1bmRlZmluZWQgJiYgcCAhPT0gbnVsbClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IG5vd01ldGFzID0gQ29yZVV0aWwudHJhbnNsYXRlQXRvbXModGhpcywgY29udGFpbmVyTWV0YSwgcCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKHNlbGYud2hlbilcblx0XHRcdFx0XHRcdHNlbGYud2hlbih3YXNNZXRhcywgbm93TWV0YXMsIHRoaXMpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHNlbGYucmV0dXJuZWQubGVuZ3RoID0gMDtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAocmVjdXJyZW50LmtpbmQgIT09IFJlY3VycmVudEtpbmQub25jZSlcblx0XHRcdFx0XHRcdHNlbGYucmV0dXJuZWQucHVzaCguLi51bnJlc29sdmVSZXR1cm5lZChub3dNZXRhcykpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAocmVjdXJyZW50LmtpbmQgPT09IFJlY3VycmVudEtpbmQub25jZSlcblx0XHRcdFx0XHRDb3JlVXRpbC51bmFwcGx5TWV0YXModGhpcywgW3NlbGZdKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgdGhlIHdyYXBwZWQgdmVyc2lvbiBvZiB0aGUgdXNlcidzIGNhbGxiYWNrIHRoYXQgZ2V0cyBhZGRlZFxuXHRcdCAqIHRvIHRoZSBSZWZsZXhpdmUgbGlicmFyeSdzIHRyZWUgKHN1Y2ggYXMgdmlhIGFuIGFkZEV2ZW50TGlzdGVuZXIoKSBjYWxsKS5cblx0XHQgKi9cblx0XHRnZXQgc3lzdGVtQ2FsbGJhY2soKTogUmVjdXJyZW50Q2FsbGJhY2tcblx0XHR7XG5cdFx0XHRpZiAodGhpcy5fc3lzdGVtQ2FsbGJhY2sgPT09IG51bGwpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcigpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gdGhpcy5fc3lzdGVtQ2FsbGJhY2s7XG5cdFx0fVxuXHRcdHByaXZhdGUgX3N5c3RlbUNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjaztcblx0XHRcblx0XHQvKipcblx0XHQgKiBBcHBsaWVzIHRoZSBzdHJlYW0gbWV0YSAoYW5kIGFueSBtZXRhcyB0aGF0IGFyZSBzdHJlYW1lZCBmcm9tIGl0XG5cdFx0ICogYXQgYW55IHBvaW50IGluIHRoZSBmdXR1cmUpIHRvIHRoZSBzcGVjaWZpZWQgY29udGFpbmluZyBicmFuY2guXG5cdFx0ICogXG5cdFx0ICogUmV0dXJucyB0aGUgaW5wdXQgcmVmIHZhbHVlLCBvciB0aGUgbGFzdCBzeW5jaHJvbm91c2x5IGluc2VydGVkIG1ldGEuXG5cdFx0ICovXG5cdFx0YXR0YWNoKGNvbnRhaW5pbmdCcmFuY2g6IElCcmFuY2gsIHRyYWNrZXI6IFRyYWNrZXIpXG5cdFx0e1xuXHRcdFx0dGhpcy5fc3lzdGVtQ2FsbGJhY2sgPSB0aGlzLl9zeXN0ZW1DYWxsYmFjay5iaW5kKGNvbnRhaW5pbmdCcmFuY2gpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBsb2NhbFRyYWNrZXIgPSB0cmFja2VyLmRlcml2ZSgpO1xuXHRcdFx0bG9jYWxUcmFja2VyLnVwZGF0ZSh0aGlzLmxvY2F0b3IpO1xuXHRcdFx0Y29uc3QgcmVjID0gdGhpcy5yZWN1cnJlbnQ7XG5cdFx0XHRcblx0XHRcdHRoaXMud2hlbiA9ICh3YXNNZXRhcywgbm93TWV0YXMpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGlmICh3YXNNZXRhcy5sZW5ndGgpXG5cdFx0XHRcdFx0Q29yZVV0aWwudW5hcHBseU1ldGFzKGNvbnRhaW5pbmdCcmFuY2gsIHdhc01ldGFzKTtcblx0XHRcdFx0XG5cdFx0XHRcdGZvciAoY29uc3Qgbm93TWV0YSBvZiBub3dNZXRhcylcblx0XHRcdFx0XHRub3dNZXRhLmxvY2F0b3Iuc2V0Q29udGFpbmVyKHRoaXMubG9jYXRvcik7XG5cdFx0XHRcdFxuXHRcdFx0XHRDb3JlVXRpbC5hcHBseU1ldGFzKFxuXHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0dGhpcyxcblx0XHRcdFx0XHRub3dNZXRhcyxcblx0XHRcdFx0XHRsb2NhbFRyYWNrZXIpO1xuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0Y29uc3Qgc2VsZWN0b3IgPSBBcnJheS5pc0FycmF5KHJlYy5zZWxlY3RvcikgP1xuXHRcdFx0XHRyZWMuc2VsZWN0b3IgOlxuXHRcdFx0XHRbcmVjLnNlbGVjdG9yXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBzZWxlY3Rvckl0ZW0gb2Ygc2VsZWN0b3IpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChzZWxlY3Rvckl0ZW0gaW5zdGFuY2VvZiBTdGF0ZWZ1bEZvcmNlKVxuXHRcdFx0XHRcdEZvcmNlVXRpbC5hdHRhY2hGb3JjZShzZWxlY3Rvckl0ZW0uY2hhbmdlZCwgdGhpcy5zeXN0ZW1DYWxsYmFjayk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChpc1N0YXRlbGVzc0ZvcmNlKHNlbGVjdG9ySXRlbSkpXG5cdFx0XHRcdFx0Rm9yY2VVdGlsLmF0dGFjaEZvcmNlKHNlbGVjdG9ySXRlbSwgdGhpcy5zeXN0ZW1DYWxsYmFjayk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIHN3aXRjaCAoc2VsZWN0b3JJdGVtKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y2FzZSBtdXRhdGlvbi5hbnk6IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgbXV0YXRpb24uYnJhbmNoOiBicmVhaztcblx0XHRcdFx0XHRjYXNlIG11dGF0aW9uLmJyYW5jaEFkZDogYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSBtdXRhdGlvbi5icmFuY2hSZW1vdmU6IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgbXV0YXRpb24ubGVhZjogYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSBtdXRhdGlvbi5sZWFmQWRkOiBicmVhaztcblx0XHRcdFx0XHRjYXNlIG11dGF0aW9uLmxlYWZSZW1vdmU6IGJyZWFrO1xuXHRcdFx0XHRcdGRlZmF1bHQ6IFJvdXRpbmdMaWJyYXJ5LnRoaXMuYXR0YWNoUmVjdXJyZW50KFxuXHRcdFx0XHRcdFx0cmVjLmtpbmQsXG5cdFx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdFx0c2VsZWN0b3JJdGVtLFxuXHRcdFx0XHRcdFx0dGhpcy5zeXN0ZW1DYWxsYmFjayxcblx0XHRcdFx0XHRcdHRoaXMucmVjdXJyZW50LnVzZXJSZXN0QXJncyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Y29uc3QgYXV0b3J1bkFyZ3VtZW50cyA9IGV4dHJhY3RBdXRvcnVuQXJndW1lbnRzKHJlYyk7XG5cdFx0XHRpZiAoYXV0b3J1bkFyZ3VtZW50cylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgaXRlbSA9IHNlbGVjdG9yWzBdO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKGl0ZW0gaW5zdGFuY2VvZiBTdGF0ZWZ1bEZvcmNlKVxuXHRcdFx0XHRcdHRoaXMuaW52b2tlQXV0b3J1bkNhbGxiYWNrKFtpdGVtLnZhbHVlLCBpdGVtLnZhbHVlXSwgY29udGFpbmluZ0JyYW5jaCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChpc1N0YXRlbGVzc0ZvcmNlKGl0ZW0pKVxuXHRcdFx0XHRcdHRoaXMuaW52b2tlQXV0b3J1bkNhbGxiYWNrKGF1dG9ydW5Bcmd1bWVudHMsIGNvbnRhaW5pbmdCcmFuY2gpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIGl0ZW0gPT09IFwic3RyaW5nXCIgJiYgaXRlbSBpbiBSZWZsZXgubXV0YXRpb24pXG5cdFx0XHRcdFx0dGhpcy5pbnZva2VBdXRvcnVuQ2FsbGJhY2soW1JlZmxleC5tdXRhdGlvbi5hbnldLCBjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHR0aGlzLmludm9rZUF1dG9ydW5DYWxsYmFjayhbXSwgY29udGFpbmluZ0JyYW5jaCk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGRldGFjaFJlY3VycmVudHMoXG5cdFx0XHRicmFuY2g6IElCcmFuY2gsXG5cdFx0XHRzZWxlY3RvcjogYW55LFxuXHRcdFx0c3lzdGVtQ2FsbGJhY2s6IFJlY3VycmVudENhbGxiYWNrPEF0b20+KVxuXHRcdHtcblx0XHRcdGNvbnN0IGxpYiA9IFJvdXRpbmdMaWJyYXJ5LnRoaXM7XG5cdFx0XHRcblx0XHRcdGlmICghQXJyYXkuaXNBcnJheShzZWxlY3RvcikpXG5cdFx0XHRcdGxpYi5kZXRhY2hSZWN1cnJlbnQoYnJhbmNoLCBzZWxlY3Rvciwgc3lzdGVtQ2FsbGJhY2spO1xuXHRcdFx0XG5cdFx0XHRlbHNlIGZvciAoY29uc3Qgc2VsZWN0b3JQYXJ0IG9mIHNlbGVjdG9yKVxuXHRcdFx0XHRsaWIuZGV0YWNoUmVjdXJyZW50KGJyYW5jaCwgc2VsZWN0b3JQYXJ0LCBzeXN0ZW1DYWxsYmFjayk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENhbGwgdGhpcyBtZXRob2QgdG8gaW5kaXJlY3RseSBpbnZva2UgdGhlIHN5c3RlbUNhbGxiYWNrLCBidXQgZG9uZVxuXHRcdCAqIGluIGEgd2F5IHRoYXQgbWFrZXMgaXQgYXdhcmUgdGhhdCBpdCdzIGJlaW5nIHJ1biB2aWEgdGhlIGF1dG9ydW4uXG5cdFx0ICovXG5cdFx0aW52b2tlQXV0b3J1bkNhbGxiYWNrKGFyZ3M6IGFueVtdLCB0aGlzQXJnPzogSUJyYW5jaClcblx0XHR7XG5cdFx0XHR0cnlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5pbkF1dG9SdW5Db250ZXh0ID0gdHJ1ZTtcblx0XHRcdFx0XG5cdFx0XHRcdHRoaXNBcmcgP1xuXHRcdFx0XHRcdHRoaXMuc3lzdGVtQ2FsbGJhY2suYXBwbHkodGhpc0FyZywgYXJncykgOlxuXHRcdFx0XHRcdHRoaXMuc3lzdGVtQ2FsbGJhY2soLi4uYXJncyk7XG5cdFx0XHR9XG5cdFx0XHRmaW5hbGx5XG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuaW5BdXRvUnVuQ29udGV4dCA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIGluQXV0b1J1bkNvbnRleHQgPSBmYWxzZTtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgY2FsbGJhY2sgdGhhdCB0cmlnZ2VycyB3aGVuIHRoZSBuZXcgbWV0YXMgaGF2ZSBiZWVuIHByb2Nlc3NlZC5cblx0XHQgKi9cblx0XHRwcml2YXRlIHdoZW46ICgod2FzTWV0YXM6IE1ldGFbXSwgbm93TWV0YXM6IE1ldGFbXSwgYnJhbmNoOiBJQnJhbmNoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyBhbiBhcnJheSBvZiB2YWx1ZXMgdGhhdCB3ZXJlIHJldHVybmVkIGZyb20gdGhlXG5cdFx0ICogcmVjdXJyZW50IGZ1bmN0aW9uLCBpbiBzdG9yYWdpemVkIGZvcm0uXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSByZWFkb25seSByZXR1cm5lZDogKE1ldGEgfCBMb2NhdG9yKVtdID0gW107XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBSZXR1cm5zIGEgbmV3IGFycmF5IHRoYXQgaXMgYSBjb3B5IG9mIHRoZSBzcGVjaWZpZWQgcmV0dXJuIGFycmF5LFxuXHQgKiBleGNlcHQgd2l0aCB0aGUgdW5zYWZlIG1ldGFzIHJlcGxhY2VkIHdpdGggbG9jYXRvcnMuXG5cdCAqL1xuXHRmdW5jdGlvbiB1bnJlc29sdmVSZXR1cm5lZChyZXR1cm5lZDogTWV0YVtdKVxuXHR7XG5cdFx0Y29uc3QgdW5yZXNvbHZlZDogKE1ldGEgfCBMb2NhdG9yKVtdID0gW107XG5cdFx0XG5cdFx0Zm9yIChjb25zdCBtZXRhIG9mIHJldHVybmVkKVxuXHRcdHtcblx0XHRcdHVucmVzb2x2ZWQucHVzaChcblx0XHRcdFx0bWV0YSBpbnN0YW5jZW9mIEJyYW5jaE1ldGEgfHwgbWV0YSBpbnN0YW5jZW9mIExlYWZNZXRhID9cblx0XHRcdFx0XHRtZXRhLmxvY2F0b3IgOlxuXHRcdFx0XHRcdG1ldGEpO1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gdW5yZXNvbHZlZDtcblx0fVxuXHRcblx0LyoqXG5cdCAqIFJldHVybnMgYSBuZXcgYXJyYXkgdGhhdCBpcyB0aGUgY29weSBvZiB0aGUgc3BlY2lmaWVkIHJldHVybiBhcnJheSxcblx0ICogZXhjZXB0IHdpdGggYW55IGluc3RhbmNlcyBvZiBMb2NhdG9yIHJlcGxhY2VkIHdpdGggdGhlIGFjdHVhbCBtZXRhLlxuXHQgKi9cblx0ZnVuY3Rpb24gcmVzb2x2ZVJldHVybmVkKHJldHVybmVkOiAoTWV0YSB8IExvY2F0b3IpW10sIGNvbnRhaW5pbmdCcmFuY2g6IElCcmFuY2gpXG5cdHtcblx0XHRjb25zdCByZXNvbHZlZDogKE1ldGEgfCBudWxsKVtdID0gbmV3IEFycmF5KHJldHVybmVkLmxlbmd0aCkuZmlsbChudWxsKTtcblx0XHRsZXQgaGFzTG9jYXRvcnMgPSBmYWxzZTtcblx0XHRcblx0XHQvLyBQcmUtcG9wdWxhdGUgdGhlIHJlc29sdmVkIGFycmF5IHdpdGggZXZlcnl0aGluZyB0aGF0IGlzIGFscmVhZHkgYSBtZXRhLlxuXHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgcmV0dXJuZWQubGVuZ3RoOylcblx0XHR7XG5cdFx0XHRjb25zdCByID0gcmV0dXJuZWRbaV07XG5cdFx0XHRpZiAociBpbnN0YW5jZW9mIE1ldGEpXG5cdFx0XHRcdHJlc29sdmVkW2ldID0gcjtcblx0XHRcdGVsc2Vcblx0XHRcdFx0aGFzTG9jYXRvcnMgPSB0cnVlO1xuXHRcdH1cblx0XHRcblx0XHQvLyBBdm9pZCBoaXR0aW5nIHRoZSBsaWJyYXJ5IGlmIHBvc3NpYmxlXG5cdFx0aWYgKCFoYXNMb2NhdG9ycylcblx0XHRcdHJldHVybiA8TWV0YVtdPnJldHVybmVkLnNsaWNlKCk7XG5cdFx0XG5cdFx0Y29uc3QgY2hpbGRyZW4gPSBBcnJheS5mcm9tKFJvdXRpbmdMaWJyYXJ5LnRoaXMuZ2V0Q2hpbGRyZW4oY29udGFpbmluZ0JyYW5jaCkpO1xuXHRcdFxuXHRcdGZvciAobGV0IHJldElkeCA9IC0xOyArK3JldElkeCA8IHJldHVybmVkLmxlbmd0aDspXG5cdFx0e1xuXHRcdFx0Y29uc3QgcmV0ID0gcmV0dXJuZWRbcmV0SWR4XTtcblx0XHRcdGlmIChyZXQgaW5zdGFuY2VvZiBMb2NhdG9yKVxuXHRcdFx0e1xuXHRcdFx0XHRmb3IgKGxldCBjaGlsZElkeCA9IC0xOyArK2NoaWxkSWR4IDwgY2hpbGRyZW4ubGVuZ3RoOylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IGNoaWxkID0gY2hpbGRyZW5bY2hpbGRJZHhdO1xuXHRcdFx0XHRcdGNvbnN0IGNoaWxkTWV0YSA9IFxuXHRcdFx0XHRcdFx0QnJhbmNoTWV0YS5vZig8YW55PmNoaWxkKSB8fFxuXHRcdFx0XHRcdFx0TGVhZk1ldGEub2YoPGFueT5jaGlsZCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKCFjaGlsZE1ldGEpXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRjb25zdCBjbXAgPSByZXQuY29tcGFyZShjaGlsZE1ldGEubG9jYXRvcik7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKGNtcCA9PT0gQ29tcGFyZVJlc3VsdC5lcXVhbClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRyZXNvbHZlZFtyZXRJZHhdID0gY2hpbGRNZXRhO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHJlc29sdmVkW3JldElkeF0gPSByZXQ7XG5cdFx0fVxuXHRcdFxuXHRcdHJldHVybiByZXNvbHZlZC5maWx0ZXIoKHIpOiByIGlzIE1ldGEgPT4gciAhPT0gbnVsbCk7XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBQcm9taXNlU3RyZWFtTWV0YSBleHRlbmRzIFN0cmVhbU1ldGFcblx0e1xuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cmVhZG9ubHkgY29udGFpbmVyTWV0YTogQ29udGFpbmVyTWV0YSxcblx0XHRcdHJlYWRvbmx5IHByb21pc2U6IFByb21pc2U8YW55Pilcblx0XHR7XG5cdFx0XHRzdXBlcihjb250YWluZXJNZXRhKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXR0YWNoKGNvbnRhaW5pbmdCcmFuY2g6IElCcmFuY2gsIHRyYWNrZXI6IFRyYWNrZXIpXG5cdFx0e1xuXHRcdFx0UmVhZHlTdGF0ZS5pbmMoKTtcblx0XHRcdFxuXHRcdFx0dGhpcy5wcm9taXNlLnRoZW4ocmVzdWx0ID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGNvbnRhaW5pbmdCcmFuY2hNZXRhID0gQnJhbmNoTWV0YS5vZihjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdFx0aWYgKGNvbnRhaW5pbmdCcmFuY2hNZXRhKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Q29yZVV0aWwuYXBwbHlNZXRhcyhcblx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lck1ldGEsXG5cdFx0XHRcdFx0XHRDb3JlVXRpbC50cmFuc2xhdGVBdG9tcyhcblx0XHRcdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaE1ldGEsXG5cdFx0XHRcdFx0XHRcdHJlc3VsdCksXG5cdFx0XHRcdFx0XHR0cmFja2VyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0UmVhZHlTdGF0ZS5kZWMoKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIEFzeW5jSXRlcmFibGVTdHJlYW1NZXRhIGV4dGVuZHMgU3RyZWFtTWV0YVxuXHR7XG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRyZWFkb25seSBjb250YWluZXJNZXRhOiBDb250YWluZXJNZXRhLFxuXHRcdFx0cmVhZG9ubHkgaXRlcmF0b3I6IEFzeW5jSXRlcmFibGU8YW55Pilcblx0XHR7XG5cdFx0XHRzdXBlcihjb250YWluZXJNZXRhKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyB0aGUgaW5wdXQgcmVmIHZhbHVlLCBvciB0aGUgbGFzdCBzeW5jaHJvbm91c2x5IGluc2VydGVkIG1ldGEuXG5cdFx0ICovXG5cdFx0YXR0YWNoKGNvbnRhaW5pbmdCcmFuY2g6IElCcmFuY2gsIHRyYWNrZXI6IFRyYWNrZXIpXG5cdFx0e1xuXHRcdFx0UmVhZHlTdGF0ZS5pbmMoKTtcblx0XHRcdFxuXHRcdFx0KGFzeW5jICgpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGxvY2FsVHJhY2tlciA9IHRyYWNrZXIuZGVyaXZlKCk7XG5cdFx0XHRcdGxvY2FsVHJhY2tlci51cGRhdGUodGhpcy5sb2NhdG9yKTtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IGJyYW5jaE1ldGEgPSBCcmFuY2hNZXRhLm9mKGNvbnRhaW5pbmdCcmFuY2gpITtcblx0XHRcdFx0XG5cdFx0XHRcdGZvciBhd2FpdCAoY29uc3QgaXRlcmFibGVSZXN1bHQgb2YgdGhpcy5pdGVyYXRvcilcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IHJlc3VsdE1ldGFzID0gQ29yZVV0aWwudHJhbnNsYXRlQXRvbXMoXG5cdFx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdFx0YnJhbmNoTWV0YSxcblx0XHRcdFx0XHRcdGl0ZXJhYmxlUmVzdWx0KTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRmb3IgKGNvbnN0IHJlc3VsdE1ldGEgb2YgcmVzdWx0TWV0YXMpXG5cdFx0XHRcdFx0XHRyZXN1bHRNZXRhLmxvY2F0b3Iuc2V0Q29udGFpbmVyKHRoaXMubG9jYXRvcik7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Q29yZVV0aWwuYXBwbHlNZXRhcyhcblx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0XHR0aGlzLFxuXHRcdFx0XHRcdFx0cmVzdWx0TWV0YXMsXG5cdFx0XHRcdFx0XHRsb2NhbFRyYWNrZXIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRSZWFkeVN0YXRlLmRlYygpO1xuXHRcdFx0fSkoKTtcblx0XHR9XG5cdH1cbn1cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJBcGV4LnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJNZXRhL01ldGEudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk1ldGEvQnJhbmNoTWV0YS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTWV0YS9MZWFmTWV0YS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTWV0YS9SZWN1cnJlbnRTdHJlYW1NZXRhLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJNZXRhL1Byb21pc2VTdHJlYW1NZXRhLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJNZXRhL0FzeW5jSXRlcmFibGVTdHJlYW1NZXRhLnRzXCIgLz5cbiIsIlxubmFtZXNwYWNlIFJlZmxleFxue1xuXHR0eXBlIFNvcnRGdW5jdGlvbjxUID0gYW55PiA9IChhOiBULCBiOiBUKSA9PiBudW1iZXI7XG5cdHR5cGUgRmlsdGVyRnVuY3Rpb248VCA9IGFueT4gPSAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IGJvb2xlYW47XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQXJyYXlGb3JjZTxUPiBpbXBsZW1lbnRzIEFycmF5PFQ+XG5cdHtcblx0XHQvKiogKi9cblx0XHRzdGF0aWMgY3JlYXRlPFQ+KGl0ZW1zOiBUW10pXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RvcmUgPSBuZXcgQ29yZS5BcnJheVN0b3JlPFQ+KCk7XG5cdFx0XHRjb25zdCB2aWV3ID0gbmV3IEFycmF5Rm9yY2Uoc3RvcmUpO1xuXHRcdFx0dmlldy5wdXNoKC4uLml0ZW1zKTtcblx0XHRcdHJldHVybiB2aWV3LnByb3h5KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdFtuOiBudW1iZXJdOiBUO1xuXHRcdFxuXHRcdHJlYWRvbmx5IGFkZGVkID0gZm9yY2U8KGl0ZW06IFQsIHBvc2l0aW9uOiBudW1iZXIpID0+IHZvaWQ+KCk7XG5cdFx0cmVhZG9ubHkgcmVtb3ZlZCA9IGZvcmNlPChpdGVtOiBULCBwb3NpdGlvbjogbnVtYmVyLCBpZDogbnVtYmVyKSA9PiB2b2lkPigpO1xuXHRcdHJlYWRvbmx5IG1vdmVkID0gZm9yY2U8KGUxOiBULCBlMjogVCwgaTE6IG51bWJlciwgaTI6IG51bWJlcikgPT4gdm9pZD4oKTtcblx0XHRyZWFkb25seSB0YWlsQ2hhbmdlID0gZm9yY2U8KGl0ZW06IFQsIHBvc2l0aW9uOiBudW1iZXIpID0+IHZvaWQ+KCk7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVhZG9ubHkgcG9zaXRpb25zOiBudW1iZXJbXSA9IFtdO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlYWRvbmx5IHJvb3Q6IENvcmUuQXJyYXlTdG9yZTxUPjtcblx0XHRcblx0XHQvKiogKi9cblx0XHRjb25zdHJ1Y3Rvcihyb290OiBDb3JlLkFycmF5U3RvcmU8VD4gfCBBcnJheUZvcmNlPFQ+KVxuXHRcdHtcblx0XHRcdGlmIChyb290IGluc3RhbmNlb2YgQ29yZS5BcnJheVN0b3JlKVxuXHRcdFx0e1x0XG5cdFx0XHRcdHRoaXMucm9vdCA9IHJvb3Q7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIFxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnJvb3QgPSByb290LnJvb3Q7XG5cdFx0XHRcdFxuXHRcdFx0XHRDb3JlLkZvcmNlVXRpbC5hdHRhY2hGb3JjZShyb290LmFkZGVkLCAoaXRlbTogVCwgaW5kZXg6IG51bWJlcikgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuaW5zZXJ0UmVmKGluZGV4LCByb290LnBvc2l0aW9uc1tpbmRleF0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0XG5cdFx0XHRcdENvcmUuRm9yY2VVdGlsLmF0dGFjaEZvcmNlKHJvb3QucmVtb3ZlZCwgKGl0ZW06IFQsIGluZGV4OiBudW1iZXIsIGlkOiBudW1iZXIpID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBsb2MgPSB0aGlzLnBvc2l0aW9ucy5pbmRleE9mKGlkKTtcblx0XHRcdFx0XHRpZiAobG9jID4gLTEpIFxuXHRcdFx0XHRcdFx0dGhpcy5zcGxpY2UobG9jLCAxKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRDb3JlLkZvcmNlVXRpbC5hdHRhY2hGb3JjZSh0aGlzLnJvb3QuY2hhbmdlZCwgKCkgPT4gXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZXhlY3V0ZUZpbHRlcigpO1xuXHRcdFx0XHR0aGlzLmV4ZWN1dGVTb3J0KCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRwcml2YXRlIHNvcnRGbj86IChhOiBULCBiOiBUKSA9PiBudW1iZXI7XG5cdFx0cHJpdmF0ZSBmaWx0ZXJGbj86ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IEFycmF5Rm9yY2U8VD4pID0+IGJvb2xlYW47XG5cblx0XHQvKiogXG5cdFx0ICogQGludGVybmFsXG5cdFx0ICovXG5cdFx0YXNzaWduU29ydGVyKHNvcnRGbjogKGE6IFQsIGI6IFQpID0+IG51bWJlcilcblx0XHR7XG5cdFx0XHR0aGlzLnNvcnRGbiA9IHNvcnRGbjtcblx0XHRcdHRoaXMuZXhlY3V0ZVNvcnQoKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblxuXHRcdC8qKiBcblx0XHQgKiBAaW50ZXJuYWxcblx0XHQgKi9cblx0XHRhc3NpZ25GaWx0ZXIoZmlsdGVyRm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IEFycmF5Rm9yY2U8VD4pID0+IGJvb2xlYW4pXG5cdFx0e1xuXHRcdFx0dGhpcy5maWx0ZXJGbiA9IGZpbHRlckZuO1xuXHRcdFx0dGhpcy5leGVjdXRlRmlsdGVyKCk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJvdGVjdGVkIGV4ZWN1dGVGaWx0ZXIoKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLmZpbHRlckZuKVxuXHRcdFx0e1xuXHRcdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IHRoaXMucG9zaXRpb25zLmxlbmd0aDspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBwb3NpdGlvbiA9IHRoaXMucG9zaXRpb25zW2ldO1xuXHRcdFx0XHRcdGlmICh0aGlzLmZpbHRlckZuKHRoaXMuZ2V0Um9vdChwb3NpdGlvbiksIGksIHRoaXMpKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGNvbnN0IGxvYyA9IHRoaXMucG9zaXRpb25zLmluZGV4T2YoaSk7XG5cdFx0XHRcdFx0XHRpZiAobG9jID4gLTEpIFxuXHRcdFx0XHRcdFx0XHR0aGlzLnNwbGljZShsb2MsIDEpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdHByb3RlY3RlZCBleGVjdXRlU29ydCgpXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMuc29ydEZuKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBhcnJheSA9IHRoaXMucG9zaXRpb25zO1xuXHRcdFx0XHRjb25zdCBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG5cdFx0XHRcdGNvbnN0IGxhc3RJdGVtID0gYXJyYXlbbGVuZ3RoIC0gMV07XG5cdFx0XHRcdFxuXHRcdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGxlbmd0aCAtIDE7KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bGV0IGNoYW5nZWQgPSBmYWxzZTtcblx0XHRcdFx0XHRmb3IgKGxldCBuID0gLTE7ICsrbiA8IGxlbmd0aCAtIChpICsgMSk7KVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGlmICh0aGlzLnNvcnRGbih0aGlzLmdldChuKSEsIHRoaXMuZ2V0KG4gKyAxKSEpID4gMClcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0Y2hhbmdlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFthcnJheVtuXSwgYXJyYXlbbiArIDFdXSA9IFthcnJheVtuICsgMV0sIGFycmF5W25dXTtcblx0XHRcdFx0XHRcdFx0dGhpcy5tb3ZlZCh0aGlzLmdldChuKSEsIHRoaXMuZ2V0KG4gKyAxKSEsIG4sIG4gKyAxKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIWNoYW5nZWQpXG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgbmV3TGFzdEl0ZW0gPSBhcnJheVtsZW5ndGggLSAxXTtcblx0XHRcdFx0aWYgKGxhc3RJdGVtICE9PSBuZXdMYXN0SXRlbSlcblx0XHRcdFx0XHR0aGlzLnRhaWxDaGFuZ2UodGhpcy5nZXQobGVuZ3RoIC0gMSkhLCBsZW5ndGggLSAxKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRwcm90ZWN0ZWQgZmlsdGVyUHVzaCguLi5pdGVtczogVFtdKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLmZpbHRlckZuKVxuXHRcdFx0XHRyZXR1cm4gaXRlbXNcblx0XHRcdFx0XHQuZmlsdGVyKCh2YWx1ZSwgaW5kZXgpID0+IHRoaXMuZmlsdGVyRm4hKHZhbHVlLCBpbmRleCwgdGhpcykpXG5cdFx0XHRcdFx0Lm1hcCh4ID0+IHRoaXMucm9vdC5wdXNoKHgpKTtcblxuXHRcdFx0cmV0dXJuIGl0ZW1zLm1hcCh4ID0+IHRoaXMucm9vdC5wdXNoKHgpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRGVmaW5lcyBnZXR0ZXIgYW5kIHNldHRlciBmb3IgaW5kZXggbnVtYmVyIHByb3BlcnRpZXMgZXguIGFycls1XVxuXHRcdCAqL1xuXHRcdHByaXZhdGUgZGVmaW5lSW5kZXgoaW5kZXg6IG51bWJlcilcblx0XHR7XG5cdFx0XHRpZiAoIVwiTk9QUk9YWVwiKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcblx0XHRcdGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMsIGluZGV4KSlcblx0XHRcdHtcdFxuXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgaW5kZXgsIHtcblx0XHRcdFx0XHRnZXQoKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmdldChpbmRleCk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRzZXQodmFsdWU6IGFueSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zZXQoaW5kZXgsIHZhbHVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8qKiBcblx0XHQgKiBAaW50ZXJuYWxcblx0XHQgKiBJbnNlcnRzIHBvc2l0aW9ucyBmcm9tIHBhcmFtZXRlcnMgaW50byBwb3NpdGlvbnMgYXJyYXkgb2YgdGhpc1xuXHRcdCAqIEFsbCBwb3NpdGlvbnMgYXJlIGZpbHRlcmVkIGlmIHRoZXJlIGlzIGEgZmlsdGVyIGZ1bmN0aW9uIGFzc2lnbmVkIHRvIHRoaXNcblx0XHQgKiBUcmlnZ2VycyB0aGUgYWRkZWQgRm9yY2Vcblx0XHQgKiBEZWZpbmVzIGluZGV4IGZvciBwcm9jZXNzZWQgbG9jYXRpb25zXG5cdFx0ICovXG5cdFx0cHJvdGVjdGVkIGluc2VydFJlZihzdGFydDogbnVtYmVyLCAuLi5wb3NpdGlvbnM6IG51bWJlcltdKVxuXHRcdHtcblx0XHRcdGNvbnN0IGZpbHRlcmVkID0gdGhpcy5maWx0ZXJGbiA/XG5cdFx0XHRcdHBvc2l0aW9ucy5maWx0ZXIoKHZhbHVlLCBpbmRleCkgPT4gXG5cdFx0XHRcdFx0dGhpcy5maWx0ZXJGbiEodGhpcy5nZXRSb290KHZhbHVlKSwgaW5kZXgsIHRoaXMpKSA6XG5cdFx0XHRcdHBvc2l0aW9ucztcblx0XHRcdFxuXHRcdFx0dGhpcy5wb3NpdGlvbnMuc3BsaWNlKHN0YXJ0LCAwLCAuLi5maWx0ZXJlZCk7XG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgZmlsdGVyZWQubGVuZ3RoOylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgaXRlbSA9IGZpbHRlcmVkW2ldO1xuXHRcdFx0XHRjb25zdCBsb2MgPSBzdGFydCArIGk7XG5cdFx0XHRcdHRoaXMuYWRkZWQodGhpcy5nZXRSb290KGl0ZW0pLCBsb2MpO1xuXHRcdFx0XHR0aGlzLmRlZmluZUluZGV4KGxvYyk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHRoaXMuZXhlY3V0ZVNvcnQoKTsgXG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBsZW5ndGgoKSBcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wb3NpdGlvbnMubGVuZ3RoO1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdHNldCBsZW5ndGgoaTogbnVtYmVyKVxuXHRcdHtcblx0XHRcdHRoaXMuc3BsaWNlKGksIHRoaXMucG9zaXRpb25zLmxlbmd0aCAtIGkpO1xuXHRcdFx0dGhpcy5wb3NpdGlvbnMubGVuZ3RoID0gaTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqIFxuXHRcdCAqIEBpbnRlcm5hbFxuXHRcdCAqL1xuXHRcdHByb3h5KClcblx0XHR7XG5cdFx0XHRpZiAoXCJOT1BST1hZXCIpIFxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdFxuXHRcdFx0aWYgKCF0aGlzLl9wcm94eSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fcHJveHkgPSBuZXcgUHJveHkodGhpcywge1xuXHRcdFx0XHRcdGdldCh0YXJnZXQsIHByb3A6IEV4dHJhY3Q8a2V5b2YgQXJyYXlGb3JjZTxUPiwgc3RyaW5nPilcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBpbmRleCA9IHBhcnNlSW50KHByb3AsIDEwKTtcblx0XHRcdFx0XHRcdHJldHVybiBpbmRleCAhPT0gaW5kZXggPyB0YXJnZXRbcHJvcF0gOiB0YXJnZXQuZ2V0KGluZGV4KTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHNldCh0YXJnZXQsIHByb3A6IEV4dHJhY3Q8a2V5b2YgQXJyYXlGb3JjZTxUPiwgc3RyaW5nPiwgdmFsdWU6IFQpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y29uc3QgaW5kZXggPSBwYXJzZUludChwcm9wLCAxMCk7XG5cdFx0XHRcdFx0XHRpZiAoaW5kZXggIT09IGluZGV4KVxuXHRcdFx0XHRcdFx0XHR0YXJnZXQuc2V0KGluZGV4LCB2YWx1ZSk7XG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSBhcyBBcnJheUZvcmNlPFQ+O1xuXHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdHJldHVybiB0aGlzLl9wcm94eTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBfcHJveHk/OiBBcnJheUZvcmNlPFQ+O1xuXG5cdFx0LyoqICovXG5cdFx0Z2V0KGluZGV4OiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0Um9vdCh0aGlzLnBvc2l0aW9uc1tpbmRleF0pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIGdldFJvb3QoaW5kZXg6IG51bWJlcilcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5yb290LmdldChpbmRleCkhO1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdHNldChpbmRleDogbnVtYmVyLCB2YWx1ZTogVClcblx0XHR7XG5cdFx0XHRpZiAodGhpcy5maWx0ZXJGbilcblx0XHRcdFx0aWYgKCF0aGlzLmZpbHRlckZuKHZhbHVlLCBpbmRleCwgdGhpcykpXG5cdFx0XHRcdFx0dGhpcy5wb3NpdGlvbnMuc3BsaWNlKGluZGV4LCAxKTtcblx0XHRcdFx0XHRcblx0XHRcdHRoaXMucm9vdC5zZXQodGhpcy5wb3NpdGlvbnNbaW5kZXhdLCB2YWx1ZSk7XG5cdFx0fVxuXG5cdFx0LyoqIFxuXHRcdCAqIFJldHVybnMgc25hcHNob3Qgb2YgdGhpcyBhcyBhIGpzIGFycmF5IFxuXHRcdCAqL1xuXHRcdHNuYXBzaG90KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wb3NpdGlvbnMubWFwKHggPT4gdGhpcy5nZXRSb290KHgpKTtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHR0b1N0cmluZygpOiBzdHJpbmdcblx0XHR7XG5cdFx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5zbmFwc2hvdCgpKTtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHR0b0xvY2FsZVN0cmluZygpOiBzdHJpbmdcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy50b1N0cmluZygpO1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdGNvbmNhdCguLi5pdGVtczogQ29uY2F0QXJyYXk8VD5bXSk6IFRbXTtcblx0XHRjb25jYXQoLi4uaXRlbXM6IChUIHwgQ29uY2F0QXJyYXk8VD4pW10pOiBUW107XG5cdFx0Y29uY2F0KC4uLml0ZW1zOiBhbnlbXSlcblx0XHR7XG5cdFx0XHRjb25zdCBhcnJheSA9IEFycmF5Rm9yY2UuY3JlYXRlPFQ+KHRoaXMuc25hcHNob3QoKSBhcyBUW10pO1xuXHRcdFx0YXJyYXkucHVzaCguLi5pdGVtcyk7XG5cdFx0XHRyZXR1cm4gYXJyYXkucHJveHkoKTtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRqb2luKHNlcGFyYXRvcj86IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZ1xuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnNuYXBzaG90KCkuam9pbihzZXBhcmF0b3IpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRyZXZlcnNlKClcblx0XHR7XG5cdFx0XHR0aGlzLnBvc2l0aW9ucy5yZXZlcnNlKCk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c2xpY2Uoc3RhcnQ/OiBudW1iZXIgfCB1bmRlZmluZWQsIGVuZD86IG51bWJlciB8IHVuZGVmaW5lZCk6IFRbXVxuXHRcdHtcblx0XHRcdGNvbnN0IGFycmF5ID0gbmV3IEFycmF5Rm9yY2UodGhpcy5yb290KTtcblx0XHRcdGFycmF5Lmluc2VydFJlZigwLCAuLi50aGlzLnBvc2l0aW9ucy5zbGljZShzdGFydCwgZW5kKSk7XG5cdFx0XHRyZXR1cm4gYXJyYXkucHJveHkoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c29ydChjb21wYXJlRm46IFNvcnRGdW5jdGlvbjxUPiwgLi4uZm9yY2VzOiBBcnJheTxTdGF0ZWxlc3NGb3JjZSB8IFN0YXRlZnVsRm9yY2U+KTogdGhpc1xuXHRcdHtcblx0XHRcdGNvbnN0IGFycmF5ID0gbmV3IEFycmF5Rm9yY2UodGhpcyk7XG5cdFx0XHRhcnJheS5zb3J0Rm4gPSBjb21wYXJlRm47XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgZm8gb2YgZm9yY2VzKVxuXHRcdFx0XHRDb3JlLkZvcmNlVXRpbC5hdHRhY2hGb3JjZShcblx0XHRcdFx0XHRmbyBpbnN0YW5jZW9mIFN0YXRlZnVsRm9yY2UgP1xuXHRcdFx0XHRcdFx0Zm8uY2hhbmdlZCA6IGZvLCBhcnJheS5leGVjdXRlU29ydFxuXHRcdFx0XHQpO1xuXHRcdFx0XHRcblx0XHRcdGFycmF5Lmluc2VydFJlZigwLCAuLi50aGlzLnBvc2l0aW9ucyk7XG5cdFx0XHRyZXR1cm4gYXJyYXkucHJveHkoKSBhcyB0aGlzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRpbmRleE9mKHNlYXJjaEVsZW1lbnQ6IFQsIGZyb21JbmRleCA9IDApOiBudW1iZXJcblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gZnJvbUluZGV4IC0gMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0aWYgKHRoaXMuZ2V0KGkpID09PSBzZWFyY2hFbGVtZW50KSBcblx0XHRcdFx0XHRyZXR1cm4gaTtcblx0XHRcdFx0XHRcblx0XHRcdHJldHVybiAtMTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bGFzdEluZGV4T2Yoc2VhcmNoRWxlbWVudDogVCwgZnJvbUluZGV4PzogbnVtYmVyIHwgdW5kZWZpbmVkKTogbnVtYmVyXG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IGZyb21JbmRleCB8fCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7IC0taSA+IC0xOylcblx0XHRcdFx0aWYgKHRoaXMuZ2V0KGkpID09PSBzZWFyY2hFbGVtZW50KSBcblx0XHRcdFx0XHRyZXR1cm4gaTtcblx0XHRcdFx0XHRcblx0XHRcdHJldHVybiAtMTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZXZlcnkoY2FsbGJhY2tGbjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiB1bmtub3duLCB0aGlzQXJnPzogYW55KTogYm9vbGVhblxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0aWYgKCFjYWxsYmFja0ZuLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB0aGlzLmdldChpKSwgaSwgdGhpcykpIFxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHRcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRzb21lKGNhbGxiYWNrRm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biwgdGhpc0FyZz86IGFueSk6IGJvb2xlYW5cblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IHRoaXMucG9zaXRpb25zLmxlbmd0aDspXG5cdFx0XHRcdGlmIChjYWxsYmFja0ZuLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB0aGlzLmdldChpKSEsIGksIHRoaXMpKSBcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Zm9yRWFjaChjYWxsYmFja0ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHZvaWQsIHRoaXNBcmc/OiBhbnkpOiB2b2lkXG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7KVxuXHRcdFx0XHRjYWxsYmFja0ZuLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB0aGlzLmdldChpKSwgaSwgdGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdG1hcDxVPihjYWxsYmFja0ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUsIHRoaXNBcmc/OiBhbnkpOiBVW11cblx0XHR7XG5cdFx0XHRyZXR1cm4gQXJyYXlGb3JjZS5jcmVhdGUoXG5cdFx0XHRcdHRoaXMucG9zaXRpb25zXG5cdFx0XHRcdFx0Lm1hcCh4ID0+IHRoaXMuZ2V0Um9vdCh4KSlcblx0XHRcdFx0XHQubWFwKCh2YWx1ZSwgaW5kZXgpID0+IGNhbGxiYWNrRm4uY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHZhbHVlLCBpbmRleCwgdGhpcykpXG5cdFx0XHQpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRmaWx0ZXI8UyBleHRlbmRzIFQ+KGNhbGxiYWNrRm46IEZpbHRlckZ1bmN0aW9uPFQ+LCAuLi5mb3JjZTogQXJyYXk8U3RhdGVmdWxGb3JjZSB8IFN0YXRlbGVzc0ZvcmNlPik6IEFycmF5Rm9yY2U8Uz47XG5cdFx0ZmlsdGVyKGNhbGxiYWNrRm46IEZpbHRlckZ1bmN0aW9uPFQ+LCAuLi5mb3JjZTogQXJyYXk8U3RhdGVmdWxGb3JjZSB8IFN0YXRlbGVzc0ZvcmNlPik6IEFycmF5Rm9yY2U8VD47XG5cdFx0ZmlsdGVyKGNhbGxiYWNrRm46IEZpbHRlckZ1bmN0aW9uPFQ+LCAuLi5mb3JjZXM6IEFycmF5PFN0YXRlZnVsRm9yY2UgfCBTdGF0ZWxlc3NGb3JjZT4pXG5cdFx0e1xuXHRcdFx0Y29uc3QgYXJyYXkgPSBuZXcgQXJyYXlGb3JjZSh0aGlzKTtcblx0XHRcdGFycmF5LmZpbHRlckZuID0gY2FsbGJhY2tGbjtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBmbyBvZiBmb3JjZXMpXG5cdFx0XHR7XG5cdFx0XHRcdENvcmUuRm9yY2VVdGlsLmF0dGFjaEZvcmNlKGZvIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSA/IGZvLmNoYW5nZWQgOiBmbywgKCkgPT4gXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRhcnJheS5leGVjdXRlRmlsdGVyKCk7XG5cdFx0XHRcdFx0dGhpcy5wb3NpdGlvbnMuZm9yRWFjaCgoeCwgaSkgPT4gXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0aWYgKGFycmF5LmZpbHRlckZuISh0aGlzLmdldFJvb3QoeCksIGksIHRoaXMpICYmICFhcnJheS5wb3NpdGlvbnMuaW5jbHVkZXMoeCkpIFxuXHRcdFx0XHRcdFx0XHRhcnJheS5pbnNlcnRSZWYoaSwgeCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRhcnJheS5pbnNlcnRSZWYoMCwgLi4udGhpcy5wb3NpdGlvbnMpO1xuXHRcdFx0cmV0dXJuIGFycmF5LnByb3h5KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlZHVjZShjYWxsYmFja0ZuOiAocHJldmlvdXNWYWx1ZTogVCwgY3VycmVudFZhbHVlOiBULCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVCk6IFQ7XG5cdFx0cmVkdWNlKGNhbGxiYWNrRm46IChwcmV2aW91c1ZhbHVlOiBULCBjdXJyZW50VmFsdWU6IFQsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBULCBpbml0aWFsVmFsdWU6IFQpOiBUO1xuXHRcdHJlZHVjZTxVPihjYWxsYmFja0ZuOiAocHJldmlvdXNWYWx1ZTogVSwgY3VycmVudFZhbHVlOiBULCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSwgaW5pdGlhbFZhbHVlOiBVKTogVTtcblx0XHRyZWR1Y2UoY2FsbGJhY2tGbjogYW55LCBpbml0aWFsVmFsdWU/OiBhbnkpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucG9zaXRpb25zXG5cdFx0XHRcdC5yZWR1Y2UoKHByZXYsIGN1cnIsIGNpKSA9PiBjYWxsYmFja0ZuKHByZXYsIHRoaXMuZ2V0KGN1cnIpLCBjaSwgdGhpcyksIGluaXRpYWxWYWx1ZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlZHVjZVJpZ2h0KGNhbGxiYWNrRm46IChwcmV2aW91c1ZhbHVlOiBULCBjdXJyZW50VmFsdWU6IFQsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBUKTogVDtcblx0XHRyZWR1Y2VSaWdodChjYWxsYmFja0ZuOiAocHJldmlvdXNWYWx1ZTogVCwgY3VycmVudFZhbHVlOiBULCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVCwgaW5pdGlhbFZhbHVlOiBUKTogVDtcblx0XHRyZWR1Y2VSaWdodDxVPihjYWxsYmFja0ZuOiAocHJldmlvdXNWYWx1ZTogVSwgY3VycmVudFZhbHVlOiBULCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSwgaW5pdGlhbFZhbHVlOiBVKTogVTtcblx0XHRyZWR1Y2VSaWdodChjYWxsYmFja0ZuOiBhbnksIGluaXRpYWxWYWx1ZT86IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wb3NpdGlvbnNcblx0XHRcdFx0LnJlZHVjZVJpZ2h0KChwcmV2LCBjdXJyLCBjaSkgPT4gY2FsbGJhY2tGbihwcmV2LCB0aGlzLmdldChjdXJyKSwgY2ksIHRoaXMpLCBpbml0aWFsVmFsdWUpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRmaW5kPFMgZXh0ZW5kcyBUPihwcmVkaWNhdGU6ICh0aGlzOiB2b2lkLCB2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgb2JqOiBUW10pID0+IHZhbHVlIGlzIFMsIHRoaXNBcmc/OiBhbnkpOiBTIHwgdW5kZWZpbmVkO1xuXHRcdGZpbmQocHJlZGljYXRlOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIG9iajogVFtdKSA9PiB1bmtub3duLCB0aGlzQXJnPzogYW55KTogVCB8IHVuZGVmaW5lZDtcblx0XHRmaW5kKHByZWRpY2F0ZTogYW55LCB0aGlzQXJnPzogYW55KVxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0aWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdGhpcy5nZXQoaSkhLCBpLCB0aGlzKSkgXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0KGkpITtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZmluZEluZGV4KHByZWRpY2F0ZTogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBvYmo6IFRbXSkgPT4gdW5rbm93biwgdGhpc0FyZz86IGFueSk6IG51bWJlclxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0aWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdGhpcy5nZXQoaSkhLCBpLCB0aGlzKSkgXG5cdFx0XHRcdFx0cmV0dXJuIGk7XG5cdFx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gLTE7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZpbGwodmFsdWU6IFQsIHN0YXJ0PzogbnVtYmVyIHwgdW5kZWZpbmVkLCBlbmQ/OiBudW1iZXIgfCB1bmRlZmluZWQpOiB0aGlzXG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IChzdGFydCB8fCAwKSAtIDE7ICsraSA8IChlbmQgfHwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoKTspXG5cdFx0XHRcdHRoaXMuc2V0KGksIHZhbHVlKTtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y29weVdpdGhpbih0YXJnZXQ6IG51bWJlciwgc3RhcnQ6IG51bWJlciwgZW5kPzogbnVtYmVyIHwgdW5kZWZpbmVkKTogdGhpc1xuXHRcdHtcblx0XHRcdHRoaXMucG9zaXRpb25zLmNvcHlXaXRoaW4odGFyZ2V0LCBzdGFydCwgZW5kKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHQqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxUPlxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0eWllbGQgdGhpcy5nZXQoaSkhO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHQqZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRdPlxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0eWllbGQgW2ksIHRoaXMuZ2V0KGkpIV07XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdCprZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8bnVtYmVyPlxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0eWllbGQgaTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0KnZhbHVlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+XG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7KVxuXHRcdFx0XHR5aWVsZCB0aGlzLmdldChpKSE7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdFtTeW1ib2wudW5zY29wYWJsZXNdKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wb3NpdGlvbnNbU3ltYm9sLnVuc2NvcGFibGVzXSgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRpbmNsdWRlcyhzZWFyY2hFbGVtZW50OiBULCBmcm9tSW5kZXg6IG51bWJlciA9IDApOiBib29sZWFuXG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IGZyb21JbmRleCAtIDE7ICsraSA8IHRoaXMucG9zaXRpb25zLmxlbmd0aDspXG5cdFx0XHRcdGlmICh0aGlzLmdldChpKSA9PT0gc2VhcmNoRWxlbWVudCkgXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZsYXRNYXA8VSwgVGhpcyA9IHVuZGVmaW5lZD4oXG5cdFx0XHRjYWxsYmFjazogKHRoaXM6IFRoaXMsIHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVIHwgcmVhZG9ubHkgVVtdLCBcblx0XHRcdHRoaXNBcmc/OiBUaGlzIHwgdW5kZWZpbmVkKTogVVtdXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuc25hcHNob3QoKS5mbGF0TWFwKGNhbGxiYWNrLCB0aGlzQXJnKTsgXG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW11bXVtdW11bXVtdW10sIGRlcHRoOiA3KTogVVtdO1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW11bXVtdW11bXVtdLCBkZXB0aDogNik6IFVbXTtcblx0XHRmbGF0PFU+KHRoaXM6IFVbXVtdW11bXVtdW10sIGRlcHRoOiA1KTogVVtdO1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW11bXVtdW10sIGRlcHRoOiA0KTogVVtdO1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW11bXVtdLCBkZXB0aDogMyk6IFVbXTtcblx0XHRmbGF0PFU+KHRoaXM6IFVbXVtdW10sIGRlcHRoOiAyKTogVVtdO1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW10sIGRlcHRoPzogMSB8IHVuZGVmaW5lZCk6IFVbXTtcblx0XHRmbGF0PFU+KHRoaXM6IFVbXSwgZGVwdGg6IDApOiBVW107XG5cdFx0ZmxhdDxVPihkZXB0aD86IG51bWJlciB8IHVuZGVmaW5lZCk6IGFueVtdO1xuXHRcdGZsYXQoZGVwdGg/OiBhbnkpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuc25hcHNob3QoKS5mbGF0KGRlcHRoKTtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRwdXNoKC4uLml0ZW1zOiBUW10pXG5cdFx0e1xuXHRcdFx0dGhpcy5pbnNlcnRSZWYodGhpcy5sZW5ndGgsIC4uLnRoaXMuZmlsdGVyUHVzaCguLi5pdGVtcykpO1xuXHRcdFx0cmV0dXJuIHRoaXMucG9zaXRpb25zLmxlbmd0aDtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRwb3AoKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLnBvc2l0aW9ucy5sZW5ndGggPCAxKSBcblx0XHRcdFx0cmV0dXJuIHZvaWQgMDtcblx0XHRcdFx0XG5cdFx0XHRjb25zdCBwb3MgPSB0aGlzLnBvc2l0aW9ucy5wb3AoKSE7XG5cdFx0XHRjb25zdCBpdGVtID0gdGhpcy5nZXRSb290KHBvcyk7XG5cdFx0XHR0aGlzLnJlbW92ZWQoaXRlbSEsIHRoaXMucG9zaXRpb25zLmxlbmd0aCwgcG9zKTtcblx0XHRcdHRoaXMucm9vdC5kZWxldGUocG9zKTtcblx0XHRcdHJldHVybiBpdGVtO1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdHVuc2hpZnQoLi4uaXRlbXM6IFRbXSlcblx0XHR7XG5cdFx0XHR0aGlzLmluc2VydFJlZigwLCAuLi50aGlzLmZpbHRlclB1c2goLi4uaXRlbXMpKTtcblx0XHRcdHJldHVybiB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0c2hpZnQoKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLnBvc2l0aW9ucy5sZW5ndGggPCAxKSBcblx0XHRcdFx0cmV0dXJuIHZvaWQgMDtcblx0XHRcdFx0XG5cdFx0XHRjb25zdCBwb3MgPSB0aGlzLnBvc2l0aW9ucy5zaGlmdCgpITtcblx0XHRcdGNvbnN0IGl0ZW0gPSB0aGlzLmdldFJvb3QocG9zKTtcblx0XHRcdHRoaXMucmVtb3ZlZChpdGVtISwgMCwgcG9zKTtcblx0XHRcdHRoaXMucm9vdC5kZWxldGUocG9zKTtcblx0XHRcdHJldHVybiBpdGVtO1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdHNwbGljZShzdGFydDogbnVtYmVyLCBkZWxldGVDb3VudDogbnVtYmVyLCAuLi5pdGVtczogVFtdKVxuXHRcdHtcblx0XHRcdGNvbnN0IHBvc2l0aW9ucyA9IHRoaXMucG9zaXRpb25zLnNwbGljZShzdGFydCwgZGVsZXRlQ291bnQpO1xuXHRcdFx0cG9zaXRpb25zLmZvckVhY2goKHgsIGkpID0+IHRoaXMucmVtb3ZlZCh0aGlzLmdldFJvb3QoeCksIHN0YXJ0ICsgaSwgeCkpO1xuXHRcdFx0dGhpcy5pbnNlcnRSZWYoc3RhcnQsIC4uLnRoaXMuZmlsdGVyUHVzaCguLi5pdGVtcykpO1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gcG9zaXRpb25zLm1hcCh4ID0+IHRoaXMuZ2V0Um9vdCh4KSk7XG5cdFx0XHRwb3NpdGlvbnMuZm9yRWFjaCh4ID0+IHRoaXMucm9vdC5kZWxldGUoeCkpO1xuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBBcnJheVN0b3JlPFQ+XG5cdHtcblx0XHQvKiogKi9cblx0XHRnZXQoaW5kZXg6IG51bWJlcilcblx0XHR7XG5cdFx0XHRjb25zdCBpdGVtID0gdGhpcy5yb290W2luZGV4XTtcblx0XHRcdHJldHVybiBpdGVtICYmIGl0ZW0udmFsdWU7XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0c2V0KGluZGV4OiBudW1iZXIsIHZhbHVlOiBUKVxuXHRcdHtcblx0XHRcdGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMucm9vdCwgaW5kZXgpKSBcblx0XHRcdFx0dGhpcy5yb290W2luZGV4XSA9IHsgdmFsdWU6IHVuZGVmaW5lZCwgcmVmOiAxIH07XG5cdFx0XHRlbHNlIFxuXHRcdFx0XHR0aGlzLmNoYW5nZWQodmFsdWUsIGluZGV4KTtcblx0XHRcdFxuXHRcdFx0dGhpcy5yb290W2luZGV4XS52YWx1ZSA9IHZhbHVlO1xuXHRcdFx0cmV0dXJuIGluZGV4O1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdHB1c2godmFsdWU6IFQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuc2V0KHRoaXMubmV4dCsrLCB2YWx1ZSk7XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0bWFyayhpbmRleDogbnVtYmVyKVxuXHRcdHtcblx0XHRcdHRoaXMucm9vdFtpbmRleF0ucmVmKys7XG5cdFx0XHRyZXR1cm4gaW5kZXg7XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0ZGVsZXRlKGluZGV4OiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0aWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLnJvb3QsIGluZGV4KSkgXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGl0ZW0gPSB0aGlzLnJvb3RbaW5kZXhdO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKGl0ZW0ucmVmID4gMSkgXG5cdFx0XHRcdFx0aXRlbS5yZWYtLTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChpdGVtLnJlZiA9PT0gMCkgXG5cdFx0XHRcdFx0aXRlbS52YWx1ZSA9IHVuZGVmaW5lZDtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVhZG9ubHkgY2hhbmdlZCA9IGZvcmNlPChpdGVtOiBULCBpbmRleDogbnVtYmVyKSA9PiB2b2lkPigpO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgcm9vdDogUmVjb3JkPG51bWJlciwge1xuXHRcdFx0dmFsdWU6IFQgfCB1bmRlZmluZWQ7XG5cdFx0XHRyZWY6IG51bWJlcjtcblx0XHR9PiA9IHt9O1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgbmV4dCA9IDA7XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKiBcblx0ICogV0FSTklORzogVGhpcyBtZXRob2QgaGFzIHBvdGVudGlhbCBtZW1vcnkgaXNzdWVzXG5cdCAqIGFuZCBpcyBub3QgaW50ZW5kZWQgZm9yIGxvbmctcnVubmluZyBwcm9jZXNzZXMgKGkuZS4gaW5cblx0ICogdGhlIGJyb3dzZXIpLiBJbiBvcmRlciB0byB1c2UgaXQgZnJvbSB0aGUgYnJvd3NlciwgdGhlXG5cdCAqIGNoaWxkcmVuT2YuZW5hYmxlZCB2YWx1ZSBtdXN0IGJlIHNldCB0byB0cnVlLiBJbiBOb2RlLmpzLFxuXHQgKiB0aGlzIHZhbHVlIGRlZmF1bHRzIHRvIHRydWUuIEluIHRoZSBicm93c2VyLCBpdCBkZWZhdWx0cyB0b1xuXHQgKiBmYWxzZTtcblx0ICogXG5cdCAqIEByZXR1cm5zIEFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIE1ldGEgb2JqZWN0cyB0aGF0IFxuXHQgKiBhcmUgbG9naWNhbCBjaGlsZHJlbiBvZiB0aGUgc3BlY2lmaWVkIGJyYW5jaC5cblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBjaGlsZHJlbk9mKGJyYW5jaDogSUJyYW5jaClcblx0e1xuXHRcdHJldHVybiBjaGlsZE1ldGFzLmdldChicmFuY2gpIHx8IFtdO1xuXHR9XG5cdFxuXHRleHBvcnQgbmFtZXNwYWNlIGNoaWxkcmVuT2Zcblx0e1xuXHRcdGV4cG9ydCBsZXQgZW5hYmxlZCA9IHR5cGVvZiBfX2Rpcm5hbWUgPT09IFwic3RyaW5nXCI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQGludGVybmFsXG5cdFx0ICogUG9wdWxhdGVzIHRoZSBpbnRlcm5hbCB3ZWFrIG1hcCB0aGF0IGFsbG93c1xuXHRcdCAqIGJyYW5jaGVzIHRvIHN0b3JlIHRoZWlyIGNoaWxkIG1ldGEgb2JqZWN0cy4gXG5cdFx0ICogRG8gbm90IGNhbGwgZnJvbSBhcHBsaWNhdGlvbiBjb2RlLlxuXHRcdCAqL1xuXHRcdGV4cG9ydCBmdW5jdGlvbiBzdG9yZShicmFuY2g6IElCcmFuY2gsIG1ldGE6IE1ldGEpXG5cdFx0e1xuXHRcdFx0Y29uc3QgZXhpc3RpbmcgPSBjaGlsZE1ldGFzLmdldChicmFuY2gpO1xuXHRcdFx0aWYgKGV4aXN0aW5nKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoIWV4aXN0aW5nLmluY2x1ZGVzKG1ldGEpKVxuXHRcdFx0XHRcdGV4aXN0aW5nLnB1c2gobWV0YSk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGNoaWxkTWV0YXMuc2V0KGJyYW5jaCwgW21ldGFdKTtcblx0XHR9XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRjb25zdCBjaGlsZE1ldGFzID0gbmV3IFdlYWtNYXA8SUJyYW5jaCwgTWV0YVtdPigpO1xufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqXG5cdCAqIEBpbnRlcm5hbFxuXHQgKiBQdXJlbHkgZnVuY3Rpb25hbCB1dGlsaXR5IG1ldGhvZHMgdGhhdCBwZXJmb3JtIG9wZXJhdGlvbnMgZm9yIHRoZSBSZWxleCBDb3JlLlxuXHQgKi9cblx0ZXhwb3J0IGNvbnN0IENvcmVVdGlsID0gbmV3IGNsYXNzIENvcmVVdGlsXG5cdHtcblx0XHQvKipcblx0XHQgKiBDbGVhbnMgb3V0IHRoZSBjcnVmdCBmcm9tIHRoZSBhdG9tcyBhcnJheSxcblx0XHQgKiBmbGF0dGVucyBhbGwgYXJyYXlzLCBhbmQgY29udmVydHMgdGhlIHJlc3VsdGluZ1xuXHRcdCAqIHZhbHVlcyBpbnRvIE1ldGEgaW5zdGFuY2VzLlxuXHRcdCAqL1xuXHRcdHRyYW5zbGF0ZUF0b21zKFxuXHRcdFx0Y29udGFpbmVyQnJhbmNoOiBJQnJhbmNoLFxuXHRcdFx0Y29udGFpbmVyTWV0YTogQ29udGFpbmVyTWV0YSxcblx0XHRcdHJhd0F0b21zOiB1bmtub3duKVxuXHRcdHtcblx0XHRcdGNvbnN0IGF0b21zID0gQXJyYXkuaXNBcnJheShyYXdBdG9tcykgP1xuXHRcdFx0XHRyYXdBdG9tcy5zbGljZSgpIDpcblx0XHRcdFx0W3Jhd0F0b21zXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCBhdG9tcy5sZW5ndGg7KVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBhdG9tID0gYXRvbXNbaV07XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBJbml0aWFsIGNsZWFyIG91dCBvZiBkaXNjYXJkZWQgdmFsdWVzLlxuXHRcdFx0XHRpZiAoYXRvbSA9PT0gbnVsbCB8fCBcblx0XHRcdFx0XHRhdG9tID09PSB1bmRlZmluZWQgfHwgXG5cdFx0XHRcdFx0dHlwZW9mIGF0b20gPT09IFwiYm9vbGVhblwiIHx8XG5cdFx0XHRcdFx0YXRvbSA9PT0gXCJcIiB8fCBcblx0XHRcdFx0XHRhdG9tICE9PSBhdG9tIHx8IFxuXHRcdFx0XHRcdGF0b20gPT09IGNvbnRhaW5lckJyYW5jaClcblx0XHRcdFx0XHRhdG9tcy5zcGxpY2UoaS0tLCAxKTtcblx0XHRcdFx0XG5cdFx0XHRcdC8vIHN0cmluZ3MsIG51bWJlcnMsIGFuZCBiaWdpbnRzIGFyZSBwYXNzZWQgdGhyb3VnaCB2ZXJiYXRpbSBpbiB0aGlzIHBoYXNlLlxuXHRcdFx0XHRlbHNlIGlmICh0eXBlb2YgYXRvbSAhPT0gXCJvYmplY3RcIilcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoYXRvbSkpXG5cdFx0XHRcdFx0YXRvbXMuc3BsaWNlKGktLSwgMSwgLi4uYXRvbSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmICh0aGlzLmhhc1N5bWJvbCAmJiBhdG9tW1N5bWJvbC5pdGVyYXRvcl0pXG5cdFx0XHRcdFx0YXRvbXMuc3BsaWNlKGktLSwgMSwgLi4uQXJyYXkuZnJvbShhdG9tKSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGNvbnN0IG1ldGFzOiBNZXRhW10gPSBbXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCBhdG9tcy5sZW5ndGg7KVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBhdG9tID0gYXRvbXNbaV07XG5cdFx0XHRcdGNvbnN0IHR5cGVPZiA9IHR5cGVvZiBhdG9tO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKGF0b20gaW5zdGFuY2VvZiBNZXRhKVxuXHRcdFx0XHRcdG1ldGFzLnB1c2goYXRvbSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChhdG9tIGluc3RhbmNlb2YgUmVjdXJyZW50KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKGF0b20uc2VsZWN0b3IgaW5zdGFuY2VvZiBBcnJheUZvcmNlKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG1ldGFzLnB1c2gobmV3IEFycmF5U3RyZWFtTWV0YShcblx0XHRcdFx0XHRcdFx0Y29udGFpbmVyTWV0YSxcblx0XHRcdFx0XHRcdFx0YXRvbSkpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bWV0YXMucHVzaChuZXcgUmVjdXJyZW50U3RyZWFtTWV0YShcblx0XHRcdFx0XHRcdFx0Y29udGFpbmVyTWV0YSxcblx0XHRcdFx0XHRcdFx0YXRvbSkpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChhdG9tW1JlZmxleC5hdG9tXSlcblx0XHRcdFx0XHRtZXRhcy5wdXNoKG5ldyBDbG9zdXJlTWV0YSh0aGlzLmNyZWF0ZVN5bWJvbGljQ2xvc3VyZShhdG9tKSkpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAodHlwZU9mID09PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdFx0bWV0YXMucHVzaChuZXcgQ2xvc3VyZU1ldGEoYXRvbSkpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAoXG5cdFx0XHRcdFx0dHlwZU9mID09PSBcInN0cmluZ1wiIHx8XG5cdFx0XHRcdFx0dHlwZU9mID09PSBcIm51bWJlclwiIHx8XG5cdFx0XHRcdFx0dHlwZU9mID09PSBcImJpZ2ludFwiKVxuXHRcdFx0XHRcdG1ldGFzLnB1c2gobmV3IFZhbHVlTWV0YShhdG9tKSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmICh0aGlzLmlzQXN5bmNJdGVyYWJsZShhdG9tKSlcblx0XHRcdFx0XHRtZXRhcy5wdXNoKG5ldyBBc3luY0l0ZXJhYmxlU3RyZWFtTWV0YShjb250YWluZXJNZXRhLCBhdG9tKSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChhdG9tIGluc3RhbmNlb2YgUHJvbWlzZSlcblx0XHRcdFx0XHRtZXRhcy5wdXNoKG5ldyBQcm9taXNlU3RyZWFtTWV0YShjb250YWluZXJNZXRhLCBhdG9tKSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmICh0aGlzLmlzQXR0cmlidXRlcyhhdG9tKSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKGF0b20pKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGlmICh2IGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSlcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0bWV0YXMucHVzaChuZXcgUmVjdXJyZW50U3RyZWFtTWV0YShcblx0XHRcdFx0XHRcdFx0XHRjb250YWluZXJNZXRhLFxuXHRcdFx0XHRcdFx0XHRcdG5ldyBBdHRyaWJ1dGVSZWN1cnJlbnQoaywgdikpKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2UgbWV0YXMucHVzaChuZXcgQXR0cmlidXRlTWV0YShrLCB2KSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IGV4aXN0aW5nTWV0YSA9IFxuXHRcdFx0XHRcdFx0QnJhbmNoTWV0YS5vZihhdG9tKSB8fFxuXHRcdFx0XHRcdFx0TGVhZk1ldGEub2YoYXRvbSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKGV4aXN0aW5nTWV0YSlcblx0XHRcdFx0XHRcdG1ldGFzLnB1c2goZXhpc3RpbmdNZXRhKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBUaGlzIGVycm9yIG9jY3VycyB3aGVuIHNvbWV0aGluZyB3YXMgcGFzc2VkIGFzIGEgYXRvbSBcblx0XHRcdFx0XHQvLyB0byBhIGJyYW5jaCBmdW5jdGlvbiwgYW5kIG5laXRoZXIgdGhlIFJlZmxleCBjb3JlLCBvciBhbnkgb2Zcblx0XHRcdFx0XHQvLyB0aGUgY29ubmVjdGVkIFJlZmxleGl2ZSBsaWJyYXJpZXMga25vdyB3aGF0IHRvIGRvIHdpdGggaXQuXG5cdFx0XHRcdFx0ZWxzZSB0aHJvdyBuZXcgRXJyb3IoXCJVbmlkZW50aWZpZWQgZmx5aW5nIG9iamVjdC5cIik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIG1ldGFzO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRpc0F0dHJpYnV0ZXMob2JqZWN0OiBhbnkpOiBvYmplY3QgaXMgSUF0dHJpYnV0ZXNcblx0XHR7XG5cdFx0XHRpZiAoIW9iamVjdCB8fCBvYmplY3QuY29uc3RydWN0b3IgIT09IE9iamVjdClcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHZhbHVlIG9mIE9iamVjdC52YWx1ZXMob2JqZWN0KSlcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdCA9IHR5cGVvZiB2YWx1ZTtcblx0XHRcdFx0aWYgKHQgIT09IFwic3RyaW5nXCIgJiYgdCAhPT0gXCJudW1iZXJcIiAmJiB0ICE9PSBcImJpZ2ludFwiICYmIHQgIT09IFwiYm9vbGVhblwiKVxuXHRcdFx0XHRcdGlmICghKHZhbHVlIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSkpXG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDcmVhdGVzIGEgdGVtcG9yYXJ5IGNsb3N1cmUgZnVuY3Rpb24gZm9yIHRoZVxuXHRcdCAqIHNwZWNpZmllZCBzeW1ib2xpYyBhdG9tIG9iamVjdC5cblx0XHQgKi9cblx0XHRwcml2YXRlIGNyZWF0ZVN5bWJvbGljQ2xvc3VyZShhdG9tOiBhbnkpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIChicmFuY2g6IElCcmFuY2gsIGNoaWxkcmVuOiBhbnlbXSkgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgcHJvcGVydHkgPSBhdG9tW1JlZmxleC5hdG9tXTtcblx0XHRcdFx0cmV0dXJuIHR5cGVvZiBwcm9wZXJ0eSA9PT0gXCJmdW5jdGlvblwiID9cblx0XHRcdFx0XHRwcm9wZXJ0eS5jYWxsKGF0b20sIGJyYW5jaCwgY2hpbGRyZW4pIDpcblx0XHRcdFx0XHRwcm9wZXJ0eTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0aXNBc3luY0l0ZXJhYmxlKG86IGFueSk6IG8gaXMgQXN5bmNJdGVyYWJsZTxhbnk+XG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMuaGFzU3ltYm9sICYmIG8gJiYgdHlwZW9mIG8gPT09IFwib2JqZWN0XCIpXG5cdFx0XHRcdGlmIChvW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSlcblx0XHRcdFx0XHRpZiAodHlwZW9mIG8ubmV4dCA9PT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBvLnJldHVybiA9PT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0XHRcdFx0XHRpZiAodHlwZW9mIG8udGhyb3cgPT09IFwiZnVuY3Rpb25cIilcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgaGFzU3ltYm9sKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBBcHBsaWVzIHRoZSBzcGVjaWZpZWQgbWV0YXMgdG8gdGhlIHNwZWNpZmllZCBicmFuY2gsIGFuZCByZXR1cm5zXG5cdFx0ICogdGhlIGxhc3QgYXBwbGllZCBicmFuY2ggb3IgbGVhZiBvYmplY3QsIHdoaWNoIGNhbiBiZSB1c2VkIGZvclxuXHRcdCAqIGZ1dHVyZSByZWZlcmVuY2VzLlxuXHRcdCAqL1xuXHRcdGFwcGx5TWV0YXMoXG5cdFx0XHRjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoLFxuXHRcdFx0Y29udGFpbmVyTWV0YTogQ29udGFpbmVyTWV0YSxcblx0XHRcdGNoaWxkTWV0YXM6IE1ldGFbXSxcblx0XHRcdHRyYWNrZXI6IFRyYWNrZXIgPSBuZXcgVHJhY2tlcihjb250YWluaW5nQnJhbmNoKSlcblx0XHR7XG5cdFx0XHRjb25zdCBjb250YWluaW5nQnJhbmNoTWV0YSA9IEJyYW5jaE1ldGEub2YoY29udGFpbmluZ0JyYW5jaCk7XG5cdFx0XHRpZiAoIWNvbnRhaW5pbmdCcmFuY2hNZXRhKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJcIik7XG5cdFx0XHRcblx0XHRcdGNvbnN0IGxpYiA9IFJvdXRpbmdMaWJyYXJ5LnRoaXM7XG5cdFx0XHRjaGlsZE1ldGFzID0gY2hpbGRNZXRhcy5zbGljZSgpO1xuXHRcdFx0XG5cdFx0XHQvLyBDbG9zdXJlTWV0YSBpbnN0YW5jZXMgbmVlZCB0byBiZSBjb2xsYXBzZWQgYmVmb3JlXG5cdFx0XHQvLyB3ZSBwcm9jZWVkIHNvIHRoYXQgdGhlIGxvY2F0b3JzIG9mIGFueSBtZXRhIHRoYXQgaXRcblx0XHRcdC8vIHJldHVybnMgY2FuIGJlIGFzc2ltaWxhdGVkLlxuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCBjaGlsZE1ldGFzLmxlbmd0aDspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IG1ldGEgPSBjaGlsZE1ldGFzW2ldO1xuXHRcdFx0XHRpZiAobWV0YSBpbnN0YW5jZW9mIENsb3N1cmVNZXRhKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKGxpYi5oYW5kbGVCcmFuY2hGdW5jdGlvbiAmJiBpc0JyYW5jaEZ1bmN0aW9uKG1ldGEuY2xvc3VyZSkpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bGliLmhhbmRsZUJyYW5jaEZ1bmN0aW9uKFxuXHRcdFx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLCBcblx0XHRcdFx0XHRcdFx0PCguLi5hdG9tczogYW55W10pID0+IElCcmFuY2g+bWV0YS5jbG9zdXJlKTtcblx0XHRcdFx0XHR9XHRcblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y29uc3QgY2hpbGRyZW4gPSBsaWIuZ2V0Q2hpbGRyZW4oY29udGFpbmluZ0JyYW5jaCk7XG5cdFx0XHRcdFx0XHRjb25zdCBjbG9zdXJlUmV0dXJuID0gbWV0YS5jbG9zdXJlKGNvbnRhaW5pbmdCcmFuY2gsIGNoaWxkcmVuKTtcblx0XHRcdFx0XHRcdGNvbnN0IG1ldGFzUmV0dXJuZWQgPSB0aGlzLnRyYW5zbGF0ZUF0b21zKFxuXHRcdFx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoTWV0YSxcblx0XHRcdFx0XHRcdFx0Y2xvc3VyZVJldHVybik7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGNoaWxkTWV0YXMuc3BsaWNlKGktLSwgMSwgLi4ubWV0YXNSZXR1cm5lZCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgbWV0YSBvZiBjaGlsZE1ldGFzKVxuXHRcdFx0XHRtZXRhLmxvY2F0b3Iuc2V0Q29udGFpbmVyKGNvbnRhaW5lck1ldGEubG9jYXRvcik7XG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgY2hpbGRNZXRhcy5sZW5ndGg7KVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBtZXRhID0gY2hpbGRNZXRhc1tpXTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChtZXRhIGluc3RhbmNlb2YgQnJhbmNoTWV0YSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IGhhcmRSZWYgPSB0cmFja2VyLmdldExhc3RIYXJkUmVmKCk7XG5cdFx0XHRcdFx0bGliLmF0dGFjaEF0b20obWV0YS5icmFuY2gsIGNvbnRhaW5pbmdCcmFuY2gsIGhhcmRSZWYpO1xuXHRcdFx0XHRcdHRyYWNrZXIudXBkYXRlKG1ldGEuYnJhbmNoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgTGVhZk1ldGEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBoYXJkUmVmID0gdHJhY2tlci5nZXRMYXN0SGFyZFJlZigpO1xuXHRcdFx0XHRcdGxpYi5hdHRhY2hBdG9tKG1ldGEudmFsdWUsIGNvbnRhaW5pbmdCcmFuY2gsIGhhcmRSZWYpO1xuXHRcdFx0XHRcdHRyYWNrZXIudXBkYXRlKG1ldGEudmFsdWUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBWYWx1ZU1ldGEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRsaWIuYXR0YWNoQXRvbShtZXRhLnZhbHVlLCBjb250YWluaW5nQnJhbmNoLCBcImFwcGVuZFwiKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgU3RyZWFtTWV0YSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChtZXRhIGluc3RhbmNlb2YgUmVjdXJyZW50U3RyZWFtTWV0YSlcblx0XHRcdFx0XHRcdG1ldGEuYXR0YWNoKGNvbnRhaW5pbmdCcmFuY2gsIHRyYWNrZXIpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBBc3luY0l0ZXJhYmxlU3RyZWFtTWV0YSlcblx0XHRcdFx0XHRcdG1ldGEuYXR0YWNoKGNvbnRhaW5pbmdCcmFuY2gsIHRyYWNrZXIpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBBcnJheVN0cmVhbU1ldGEpXG5cdFx0XHRcdFx0XHRtZXRhLmF0dGFjaChjb250YWluaW5nQnJhbmNoLCB0cmFja2VyKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgUHJvbWlzZVN0cmVhbU1ldGEpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y29uc3QgbG9jYWxUcmFja2VyID0gdHJhY2tlci5kZXJpdmUoKTtcblx0XHRcdFx0XHRcdGxvY2FsVHJhY2tlci51cGRhdGUobWV0YS5sb2NhdG9yKTtcblx0XHRcdFx0XHRcdG1ldGEuYXR0YWNoKGNvbnRhaW5pbmdCcmFuY2gsIGxvY2FsVHJhY2tlcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBBdHRyaWJ1dGVNZXRhKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bGliLmF0dGFjaEF0dHJpYnV0ZShjb250YWluaW5nQnJhbmNoLCBtZXRhLmtleSwgbWV0YS52YWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGlmIChDb25zdC5kZWJ1ZyB8fCBDb25zdC5ub2RlKVxuXHRcdFx0XHRcdGNoaWxkcmVuT2Yuc3RvcmUoY29udGFpbmluZ0JyYW5jaCwgbWV0YSk7XG5cdFx0XHRcdFxuXHRcdFx0XHR0cmFja2VyLnVwZGF0ZShtZXRhLmxvY2F0b3IpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHR1bmFwcGx5TWV0YXMoXG5cdFx0XHRjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoLFxuXHRcdFx0Y2hpbGRNZXRhczogTWV0YVtdKVxuXHRcdHtcblx0XHRcdGNvbnN0IGxpYiA9IFJvdXRpbmdMaWJyYXJ5LnRoaXM7XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgbWV0YSBvZiBjaGlsZE1ldGFzKVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBDbG9zdXJlTWV0YXMgY2FuIGJlIHNhZmVseSBpZ25vcmVkLlxuXHRcdFx0XHRpZiAobWV0YSBpbnN0YW5jZW9mIENsb3N1cmVNZXRhKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKG1ldGEgaW5zdGFuY2VvZiBMZWFmTWV0YSB8fCBtZXRhIGluc3RhbmNlb2YgVmFsdWVNZXRhKVxuXHRcdFx0XHRcdGxpYi5kZXRhY2hBdG9tKG1ldGEudmFsdWUsIGNvbnRhaW5pbmdCcmFuY2gpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAobWV0YSBpbnN0YW5jZW9mIEF0dHJpYnV0ZU1ldGEpXG5cdFx0XHRcdFx0bGliLmRldGFjaEF0dHJpYnV0ZShjb250YWluaW5nQnJhbmNoLCBtZXRhLnZhbHVlKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBCcmFuY2hNZXRhKVxuXHRcdFx0XHRcdC8vIFdlIHNob3VsZCBwcm9iYWJseSBjb25zaWRlciBnZXR0aW5nIHJpZCBvZiB0aGlzXG5cdFx0XHRcdFx0Ly8gWW91IHdvdWxkIGJlIGFibGUgdG8gcmUtZGlzY292ZXIgdGhlIGJyYW5jaCBieVxuXHRcdFx0XHRcdC8vIGVudW1lcmF0aW5nIHRocm91Z2ggdGhlIGNoaWxkcmVuIG9mIGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0Ly8gdXNpbmcgdGhlIGdldENoaWxkcmVuKCkgbWV0aG9kIHByb3ZpZGVkIGJ5IHRoZSBsaWJyYXJ5LlxuXHRcdFx0XHRcdGxpYi5kZXRhY2hBdG9tKG1ldGEuYnJhbmNoLCBjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBSZWN1cnJlbnRTdHJlYW1NZXRhKVxuXHRcdFx0XHRcdG1ldGEuZGV0YWNoUmVjdXJyZW50cyhcblx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0XHRtZXRhLnJlY3VycmVudC5zZWxlY3Rvcixcblx0XHRcdFx0XHRcdG1ldGEuc3lzdGVtQ2FsbGJhY2spO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAobWV0YSBpbnN0YW5jZW9mIFByb21pc2VTdHJlYW1NZXRhKVxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZC5cIik7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgQXN5bmNJdGVyYWJsZVN0cmVhbU1ldGEpXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkLlwiKTtcblx0XHRcdH1cblx0XHR9XG5cdH0oKTtcbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleFxue1xuXHQvKiogKi9cblx0ZXhwb3J0IGVudW0gbXV0YXRpb25cblx0e1xuXHRcdGFueSA9IFwibXV0YXRpb24tYW55XCIsXG5cdFx0YnJhbmNoID0gXCJtdXRhdGlvbi1icmFuY2hcIixcblx0XHRicmFuY2hBZGQgPSBcIm11dGF0aW9uLWJyYW5jaC1hZGRcIixcblx0XHRicmFuY2hSZW1vdmUgPSBcIm11dGF0aW9uLWJyYW5jaC1yZW1vdmVcIixcblx0XHRsZWFmID0gXCJtdXRhdGlvbi1sZWFmXCIsXG5cdFx0bGVhZkFkZCA9IFwibXV0YXRpb24tbGVhZi1hZGRcIixcblx0XHRsZWFmUmVtb3ZlID0gXCJtdXRhdGlvbi1sZWFmLXJlbW92ZVwiXG5cdH1cblx0XG5cdC8qKlxuXHQgKiBBIHN5bWJvbCB3aGljaCBtYXkgYmUgYXBwbGllZCBhcyBhbiBvYmplY3Qga2V5IGluIFxuXHQgKiBhIHR5cGUsIGluIG9yZGVyIHRvIG1ha2UgaXQgYSB2YWxpZCBSZWZsZXggYXRvbS5cblx0ICovXG5cdGV4cG9ydCBkZWNsYXJlIGNvbnN0IGF0b206IHVuaXF1ZSBzeW1ib2w7XG5cdCg8YW55PlJlZmxleClbXCJhdG9tXCJdID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiID9cblx0XHRTeW1ib2woXCJSZWZsZXguYXRvbVwiKSA6XG5cdFx0XCJSZWZsZXguYXRvbVwiO1xuXHRcblx0LyoqXG5cdCAqIEEgdHlwZSB0aGF0IGlkZW50aWZpZXMgdGhlIHR5cGVzIG9mIGF0b21zIHRoYXQgY2FuIGV4aXN0XG5cdCAqIGluIGFueSByZWZsZXhpdmUgYXJndW1lbnRzIGxpc3QuXG5cdCAqIFxuXHQgKiBAcGFyYW0gQiBUaGUgbGlicmFyeSdzIEJyYW5jaCB0eXBlLlxuXHQgKiBAcGFyYW0gTCBUaGUgbGlicmFyeSdzIExlYWYgdHlwZS5cblx0ICogQHBhcmFtIFggRXh0cmEgdHlwZXMgdW5kZXJzdG9vZCBieSB0aGUgbGlicmFyeS5cblx0ICovXG5cdGV4cG9ydCB0eXBlIEF0b208QiBleHRlbmRzIG9iamVjdCA9IG9iamVjdCwgTCA9IGFueSwgWCA9IHZvaWQ+ID1cblx0XHRCIHxcblx0XHRMIHxcblx0XHRYIHxcblx0XHRmYWxzZSB8XG5cdFx0bnVsbCB8XG5cdFx0dm9pZCB8XG5cdFx0SXRlcmFibGU8QXRvbTxCLCBMLCBYPj4gfFxuXHRcdEFzeW5jSXRlcmFibGU8QXRvbTxCLCBMLCBYPj4gfFxuXHRcdFByb21pc2U8QXRvbTxCLCBMLCBYPj4gfFxuXHRcdCgoYnJhbmNoOiBCLCBjaGlsZHJlbjogKEIgfCBMKVtdKSA9PiBBdG9tPEIsIEwsIFg+KSB8XG5cdFx0Q29yZS5CcmFuY2hGdW5jdGlvbiB8XG5cdFx0UmVjdXJyZW50IHxcblx0XHRTeW1ib2xpY0F0b208QiwgTCwgWD4gfFxuXHRcdElBdHRyaWJ1dGVzO1xuXHRcblx0LyoqXG5cdCAqIEFuIGludGVyZmFjZSBmb3IgYW4gb2JqZWN0IHRoYXQgaGFzIGl0J3Mgb3duIGF0b21pemF0aW9uXG5cdCAqIHByb2Nlc3MuXG5cdCAqL1xuXHRleHBvcnQgaW50ZXJmYWNlIFN5bWJvbGljQXRvbTxCIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0LCBMID0gYW55LCBYID0gdm9pZD5cblx0e1xuXHRcdHJlYWRvbmx5IFthdG9tXTogQXRvbTxCLCBMLCBYPjtcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBpbnRlcmZhY2UgSUF0dHJpYnV0ZXM8VCA9IHN0cmluZyB8IG51bWJlciB8IGJpZ2ludCB8IGJvb2xlYW4+XG5cdHtcblx0XHRbYXR0cmlidXRlTmFtZTogc3RyaW5nXTogQ29yZS5Wb2lkYWJsZTxUPiB8IFN0YXRlZnVsRm9yY2U8Q29yZS5Wb2lkYWJsZTxUPj47XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBHZW5lcmljIGZ1bmN0aW9uIGRlZmluaXRpb24gZm9yIGNhbGxiYWNrIGZ1bmN0aW9ucyBwcm92aWRlZCB0b1xuXHQgKiB0aGUgZ2xvYmFsIG9uKCkgZnVuY3Rpb24uXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBSZWN1cnJlbnRDYWxsYmFjazxUIGV4dGVuZHMgQXRvbSA9IEF0b20+ID0gKC4uLmFyZ3M6IGFueVtdKSA9PiBUO1xufVxuXG5kZWNsYXJlIG5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKipcblx0ICogTWFya2VyIGludGVyZmFjZSB0aGF0IGRlZmluZXMgYW4gb2JqZWN0IHRoYXQgY2FuIGhhdmVcblx0ICogcmVmbGV4aXZlIHZhbHVlcyBhdHRhY2hlZCB0byBpdC5cblx0ICogKEZvciBleGFtcGxlOiBIVE1MRWxlbWVudCBvciBOU1dpbmRvdylcblx0ICovXG5cdGV4cG9ydCBpbnRlcmZhY2UgSUJyYW5jaCBleHRlbmRzIE9iamVjdCB7IH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgY2xhc3MgQnJhbmNoRnVuY3Rpb248VE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+XG5cdHtcblx0XHRyZWFkb25seSBuYW1lOiBUTmFtZTtcblx0XHRwcml2YXRlIHJlYWRvbmx5IG5vbWluYWw6IHVuZGVmaW5lZDtcblx0fVxuXHRcblx0LyoqXG5cdCAqIE1hcmtlciBpbnRlcmZhY2UgdGhhdCBkZWZpbmVzIGFuIG9iamVjdCB0aGF0IHJlcHJlc2VudHNcblx0ICogYSBibG9jayBvZiB2aXNpYmxlIGxlYXZlcyAoY29udGVudCkgaW4gdGhlIHRyZWUuXG5cdCAqIChGb3IgZXhhbXBsZTogdGhlIFczQyBET00ncyBUZXh0IG9iamVjdClcblx0ICovXG5cdGV4cG9ydCBpbnRlcmZhY2UgSUxlYWYgZXh0ZW5kcyBPYmplY3QgeyB9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IHR5cGUgVm9pZGFibGU8VD4gPSBcblx0XHRUIHxcblx0XHRmYWxzZSB8XG5cdFx0bnVsbCB8XG5cdFx0dm9pZDtcblx0XG5cdC8qKlxuXHQgKiBBYnN0cmFjdCBkZWZpbml0aW9uIG9mIHRoZSBsZWFmIHZhcmlhbnQgb2YgdGhlIHRvcC1sZXZlbFxuXHQgKiBuYW1lc3BhY2UgZnVuY3Rpb24uXG5cdCAqIFxuXHQgKiBAcGFyYW0gTCBUaGUgTGVhZiB0eXBlIG9mIHRoZSBsaWJyYXJ5LlxuXHQgKiBAcGFyYW0gUyBUaGUgXCJMZWFmIHNvdXJjZVwiIHR5cGUsIHdoaWNoIGFyZSB0aGUgb3RoZXIgdHlwZXNcblx0ICogKHR5cGljYWxseSBwcmltaXRpdmVzKSB0aGF0IHRoZSBsaWJyYXJ5IGlzIGNhcGFibGUgb2YgY29udmVydGluZ1xuXHQgKiBpbnRvIGl0J3MgTGVhZiB0eXBlLlxuXHQgKi9cblx0ZXhwb3J0IGludGVyZmFjZSBJTGVhZk5hbWVzcGFjZTxMID0gYW55LCBTID0gc3RyaW5nIHwgbnVtYmVyIHwgYmlnaW50PlxuXHR7XG5cdFx0KFxuXHRcdFx0dGVtcGxhdGU6XG5cdFx0XHRcdFRlbXBsYXRlU3RyaW5nc0FycmF5IHwgXG5cdFx0XHRcdEwgfCBTIHwgdm9pZCB8XG5cdFx0XHRcdFN0YXRlZnVsRm9yY2UsXG5cdFx0XHRcblx0XHRcdC4uLnZhbHVlczogKFxuXHRcdFx0XHRJQnJhbmNoIHwgXG5cdFx0XHRcdEwgfCBTIHwgdm9pZCB8XG5cdFx0XHRcdFN0YXRlZnVsRm9yY2UpW11cblx0XHQpOiBMO1xuXHR9XG5cdFxuXHQvKipcblx0ICogQWJzdHJhY3QgZGVmaW5pdGlvbiBvZiB0aGUgYnJhbmNoIHZhcmlhbnQgb2YgdGhlIHRvcC1sZXZlbFxuXHQgKiBuYW1lc3BhY2UgZnVuY3Rpb24uXG5cdCAqIFxuXHQgKiBAcGFyYW0gQSBUaGUgQXRvbSB0eXBlIG9mIHRoZSBSZWZsZXhpdmUgbGlicmFyeS5cblx0ICogQHBhcmFtIFIgVGhlIHJldHVybiB0eXBlIG9mIHRoZSByb290LWxldmVsIGJyYW5jaCBmdW5jdGlvbi5cblx0ICovXG5cdGV4cG9ydCBpbnRlcmZhY2UgSUJyYW5jaE5hbWVzcGFjZTxBID0gYW55LCBSID0gYW55PlxuXHR7XG5cdFx0KC4uLmF0b21zOiBBW10pOiBSO1xuXHR9XG5cdFxuXHQvKipcblx0ICogRGVmaW5lcyBhIHJlbGF0aXZlIG9yIHNwZWNpZmljIG1ldGEgcmVmZXJlbmNlLCB1c2VkIGZvciBpbmRpY2F0aW5nXG5cdCAqIGFuIGluc2VydGlvbiBwb3NpdGlvbiBvZiBhIG5ldyBtZXRhIHdpdGhpbiBhIFJlZmxleGl2ZSB0cmVlLlxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgUmVmPEIgPSBJQnJhbmNoLCBMID0gSUxlYWY+ID0gQiB8IEwgfCBcInByZXBlbmRcIiB8IFwiYXBwZW5kXCI7XG5cdFxuXHQvKipcblx0ICogQSBtYXBwZWQgdHlwZSB0aGF0IGV4dHJhY3RzIHRoZSBuYW1lcyBvZiB0aGUgbWV0aG9kcyBhbmRcblx0ICogZnVuY3Rpb24tdmFsdWVkIGZpZWxkcyBvdXQgb2YgdGhlIHNwZWNpZmllZCB0eXBlLlxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgTWV0aG9kTmFtZXM8VD4gPSB7XG5cdFx0W0sgaW4ga2V5b2YgVF06IFRbS10gZXh0ZW5kcyAoKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnkpID8gSyA6IG5ldmVyO1xuXHR9W2tleW9mIFRdO1xuXG5cdC8qKlxuXHQgKiBFeHRyYWN0cyBhbnkgcmV0dXJuIHR5cGUgZnJvbSB0aGUgc3BlY2lmaWVkIHR5cGUsIGluIHRoZSBjYXNlXG5cdCAqIHdoZW4gdGhlIHR5cGUgc3BlY2lmaWVkIGlzIGEgZnVuY3Rpb24uXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBNYXliZVJldHVyblR5cGU8VD4gPSBUIGV4dGVuZHMgKC4uLmFyZ3M6IGFueVtdKSA9PiBpbmZlciBSID8gUiA6IG5ldmVyO1xuXHRcblx0LyoqXG5cdCAqIE1hcHMgdGhlIHNwZWNpZmllZCB0eXBlIHRvIGEgdmVyc2lvbiBvZiBpdHNlbGYsXG5cdCAqIGJ1dCB3aXRob3V0IGFueSBwb3NzaWJseSB1bmRlZmluZWQgdmFsdWVzLlxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgRGVmaW5lZDxUPiA9IHsgW0sgaW4ga2V5b2YgVF0tPzogVFtLXSB9O1xuXHRcblx0LyoqXG5cdCAqIEV4dHJhY3RzIHRoZSByZXR1cm4gdHlwZSBvZiB0aGUgc3BlY2lmaWVkIGZ1bmN0aW9uIHR5cGUuXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBSZXR1cm5PZjxvcmlnaW5hbCBleHRlbmRzIEZ1bmN0aW9uPiA9IFxuXHRcdG9yaWdpbmFsIGV4dGVuZHMgKC4uLng6IGFueVtdKSA9PiBpbmZlciByZXR1cm5UeXBlID9cblx0XHRcdHJldHVyblR5cGUgOiBcblx0XHRcdG5ldmVyO1xuXHRcblx0LyoqXG5cdCAqIEV4dHJhY3RzIHRoZSBtZXRob2RzIG91dCBvZiB0aGUgdHlwZSwgYW5kIHJldHVybnMgYSBtYXBwZWQgb2JqZWN0IHR5cGVcblx0ICogd2hvc2UgbWVtYmVycyBhcmUgdHJhbnNmb3JtZWQgaW50byBicmFuY2ggY3JlYXRpb24gbWV0aG9kcy5cblx0ICovXG5cdGV4cG9ydCB0eXBlIEFzQnJhbmNoZXM8VD4gPSB7XG5cdFx0cmVhZG9ubHkgW0sgaW4ga2V5b2YgVF06IEFzQnJhbmNoPFRbS10+XG5cdH07XG5cdFxuXHQvKipcblx0ICogRXh0cmFjdHMgXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBBc0JyYW5jaDxGPiA9IFxuXHRcdEYgZXh0ZW5kcyAoKSA9PiBpbmZlciBSID8gKC4uLmF0b21zOiBBdG9tW10pID0+IFIgOlxuXHRcdEYgZXh0ZW5kcyAoLi4uYXJnczogaW5mZXIgQSkgPT4gaW5mZXIgUiA/ICguLi5hcmdzOiBBKSA9PiAoLi4uYXRvbXM6IEF0b21bXSkgPT4gUiA6XG5cdFx0Rjtcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCB0eXBlIFN0YXRpY0JyYW5jaGVzT2Y8TCBleHRlbmRzIFJlZmxleC5Db3JlLklMaWJyYXJ5PiA9XG5cdFx0TFtcImdldFN0YXRpY0JyYW5jaGVzXCJdIGV4dGVuZHMgRnVuY3Rpb24gP1xuXHRcdFx0QXNCcmFuY2hlczxSZXR1cm5PZjxMW1wiZ2V0U3RhdGljQnJhbmNoZXNcIl0+PiA6XG5cdFx0XHR7fTtcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCB0eXBlIFN0YXRpY05vbkJyYW5jaGVzT2Y8TCBleHRlbmRzIFJlZmxleC5Db3JlLklMaWJyYXJ5PiA9XG5cdFx0TFtcImdldFN0YXRpY05vbkJyYW5jaGVzXCJdIGV4dGVuZHMgRnVuY3Rpb24gP1xuXHRcdFx0QXNCcmFuY2hlczxSZXR1cm5PZjxMW1wiZ2V0U3RhdGljTm9uQnJhbmNoZXNcIl0+PiA6XG5cdFx0XHR7fTtcbn1cblxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4XG57XG5cdC8qKiAqL1xuXHRjb25zdCBlbnRyaWVzID0gbmV3IFdlYWtNYXA8U3RhdGVsZXNzRm9yY2UsIEVudHJ5PigpO1xuXHRcblx0LyoqICovXG5cdGNsYXNzIEVudHJ5XG5cdHtcblx0XHRyZWFkb25seSBzeXN0ZW1DYWxsYmFja3MgPSBuZXcgU2V0PFJlY3VycmVudENhbGxiYWNrPEF0b20+PigpO1xuXHR9XG5cdFxuXHQvKipcblx0ICogQSB0eXBlIHRoYXQgZGVzY3JpYmVzIGEgZm9yY2UgdGhhdCBjb250YWlucyBzb21lIHN0YXRlIHZhcmlhYmxlIHRoYXQsXG5cdCAqIHdoZW4gY2hhbmdlZCwgcG90ZW50aWFsbHkgY2F1c2VzIHRoZSBleGVjdXRpb24gb2YgYSBzZXJpZXMgb2YgXG5cdCAqIHJlY3VycmVudCBmdW5jdGlvbnMuXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBTdGF0ZWxlc3NGb3JjZTxBIGV4dGVuZHMgYW55W10gPSBhbnlbXT4gPSAoLi4uYXJnczogQSkgPT4gdm9pZDtcblx0XG5cdC8qKlxuXHQgKiBSZXR1cm5zIGEgYm9vbGVhbiB0aGF0IGluZGljYXRlcyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgdmFsdWVcblx0ICogaXMgYSBzdGF0ZWxlc3Mgb3Igc3RhdGVmdWwgZm9yY2UuXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gaXNGb3JjZShmbzogYW55KTogZm8gaXMgKCguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCkgfCBTdGF0ZWZ1bEZvcmNlXG5cdHtcblx0XHQvLyBUT0RPOiBUaGlzIGZ1bmN0aW9uIGFsc28gbmVlZHMgdG8gY2hlY2sgZm9yIEFycmF5Rm9yY2Unc1xuXHRcdHJldHVybiBpc1N0YXRlbGVzc0ZvcmNlKGZvKSB8fCBmbyBpbnN0YW5jZW9mIFN0YXRlZnVsRm9yY2U7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBHdWFyZHMgb24gd2hldGhlciB0aGUgc3BlY2lmaWVkIHZhbHVlIGlzIHN0YXRlbGVzcyBmb3JjZSBmdW5jdGlvbi5cblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBpc1N0YXRlbGVzc0ZvcmNlKGZvcmNlRm46IGFueSk6IGZvcmNlRm4gaXMgKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkXG5cdHtcblx0XHRyZXR1cm4gISFmb3JjZUZuICYmIGVudHJpZXMuaGFzKGZvcmNlRm4pO1xuXHR9XG5cdFxuXHRleHBvcnQgbmFtZXNwYWNlIENvcmVcblx0e1xuXHRcdC8qKlxuXHRcdCAqIEBpbnRlcm5hbFxuXHRcdCAqL1xuXHRcdGV4cG9ydCBjb25zdCBGb3JjZVV0aWwgPVxuXHRcdHtcblx0XHRcdC8qKiAqL1xuXHRcdFx0Y3JlYXRlRnVuY3Rpb24oKVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBUaGUgdXNlciBmb3JjZSBmdW5jdGlvbiBpcyBzZW50IGJhY2sgdG8gdGhlIHVzZXIsIHdobyB1c2VzXG5cdFx0XHRcdC8vIHRoaXMgZnVuY3Rpb24gYXMgYSBwYXJhbWV0ZXIgdG8gb3RoZXIgb24oKSBjYWxscywgb3IgdG8gY2FsbFxuXHRcdFx0XHQvLyBkaXJlY3RseSB3aGVuIHRoZSB0aGluZyBoYXBwZW5zLlxuXHRcdFx0XHRjb25zdCB1c2VyRm9yY2VGbiA9ICguLi5hcmdzOiBhbnlbXSkgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IHJlRm4gPSBlbnRyaWVzLmdldCh1c2VyRm9yY2VGbik7XG5cdFx0XHRcdFx0aWYgKHJlRm4pXG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IHN5c3RlbUNhbGxiYWNrIG9mIHJlRm4uc3lzdGVtQ2FsbGJhY2tzKVxuXHRcdFx0XHRcdFx0XHRzeXN0ZW1DYWxsYmFjayguLi5hcmdzKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IGVudHJ5ID0gbmV3IEVudHJ5KCk7XG5cdFx0XHRcdGVudHJpZXMuc2V0KHVzZXJGb3JjZUZuLCBlbnRyeSk7XG5cdFx0XHRcdHJldHVybiB1c2VyRm9yY2VGbjtcblx0XHRcdH0sXG5cdFx0XHRcblx0XHRcdC8qKlxuXHRcdFx0ICogUmV0dXJucyB0aGUgU3RhdGVsZXNzRm9yY2UgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgc3BlY2lmaWVkXG5cdFx0XHQgKiBmb3JjZSBmdW5jdGlvbi5cblx0XHRcdCAqL1xuXHRcdFx0YXR0YWNoRm9yY2UoXG5cdFx0XHRcdGZuOiBTdGF0ZWxlc3NGb3JjZSwgXG5cdFx0XHRcdHN5c3RlbUNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9tPilcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgcmUgPSBlbnRyaWVzLmdldChmbik7XG5cdFx0XHRcdGlmIChyZSlcblx0XHRcdFx0XHRyZS5zeXN0ZW1DYWxsYmFja3MuYWRkKHN5c3RlbUNhbGxiYWNrKTtcblx0XHRcdH0sXG5cdFx0XHRcblx0XHRcdC8qKlxuXHRcdFx0ICogXG5cdFx0XHQgKi9cblx0XHRcdGRldGFjaEZvcmNlKFxuXHRcdFx0XHRmbjogU3RhdGVsZXNzRm9yY2UsXG5cdFx0XHRcdHN5c3RlbUNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9tPilcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgZm8gPSBlbnRyaWVzLmdldChmbik7XG5cdFx0XHRcdGlmIChmbylcblx0XHRcdFx0XHRmby5zeXN0ZW1DYWxsYmFja3MuZGVsZXRlKHN5c3RlbUNhbGxiYWNrKTtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG59XG4iLCJcbi8qKlxuICogUmV0dXJucyBhIGZvcmNlIGZ1bmN0aW9uIHRoYXQgcmVtb3RlbHkgdHJpZ2dlcnMgc29tZSBiZWhhdmlvciB3aGVuIGludm9rZWQuXG4gKi9cbmZ1bmN0aW9uIGZvcmNlKCk6ICgpID0+IHZvaWQ7XG4vKipcbiAqIFJldHVybnMgYSBTdGF0ZWxlc3NGb3JjZSB0aGF0IHJlbW90ZWx5IHRyaWdnZXJzIHNvbWUgYmVoYXZpb3Igd2hlbiB0aGVcbiAqIGludGVybmFsIHZhbHVlIGlzIGNoYW5nZWQuXG4gKi9cbmZ1bmN0aW9uIGZvcmNlPEYgZXh0ZW5kcyBSZWZsZXguU3RhdGVsZXNzRm9yY2UgPSAoKSA9PiB2b2lkPigpOiBGO1xuLyoqXG4gKiBSZXR1cm5zIGEgQm9vbGVhbkZvcmNlIG9iamVjdCB0aGF0IHJlbW90ZWx5IHRyaWdnZXJzIHNvbWUgYmVoYXZpb3JcbiAqIHdoZW4gdGhlIGludGVybmFsIGJvb2xlYW4gdmFsdWUgaXMgY2hhbmdlZC5cbiAqL1xuZnVuY3Rpb24gZm9yY2UoaW5pdGlhbFZhbHVlOiBib29sZWFuKTogUmVmbGV4LkJvb2xlYW5Gb3JjZTtcbi8qKlxuICogUmV0dXJucyBhbiBBcnJheUZvcmNlIG9iamVjdCB0aGF0IHJlbW90ZWx5IHRyaWdnZXJzIHNvbWUgYmVoYXZpb3JcbiAqIHdoZW4gdGhlIGFycmF5IGlzIG1vZGlmaWVkLlxuICovXG5mdW5jdGlvbiBmb3JjZTxUPihiYWNraW5nQXJyYXk6IFRbXSk6IFJlZmxleC5BcnJheUZvcmNlPFQ+O1xuLyoqXG4gKiBSZXR1cm5zIGEgU3RhdGVsZXNzRm9yY2Ugb2JqZWN0IHRoYXQgcmVtb3RlbHkgdHJpZ2dlcnMgc29tZVxuICogYmVoYXZpb3Igd2hlbiB0aGUgaW50ZXJuYWwgb2JqZWN0IHZhbHVlIGlzIGNoYW5nZWQuXG4gKi9cbmZ1bmN0aW9uIGZvcmNlPFQgZXh0ZW5kcyB7fT4oaW5pdGlhbFZhbHVlOiBUKTogUmVmbGV4LlN0YXRlZnVsRm9yY2U8VD47XG5mdW5jdGlvbiBmb3JjZSh2YWw/OiBhbnkpXG57XG5cdGlmICh2YWwgPT09IHVuZGVmaW5lZCB8fCB2YWwgPT09IG51bGwpXG5cdFx0cmV0dXJuIFJlZmxleC5Db3JlLkZvcmNlVXRpbC5jcmVhdGVGdW5jdGlvbigpO1xuXHRcblx0aWYgKHR5cGVvZiB2YWwgPT09IFwiYm9vbGVhblwiKVxuXHRcdHJldHVybiBuZXcgUmVmbGV4LkJvb2xlYW5Gb3JjZSh2YWwpO1xuXHRcblx0aWYgKHR5cGVvZiB2YWwgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHZhbCA9PT0gXCJiaWdpbnRcIilcblx0XHRyZXR1cm4gbmV3IFJlZmxleC5TdGF0ZWZ1bEZvcmNlKHZhbCk7XG5cdFxuXHRpZiAodHlwZW9mIHZhbCA9PT0gXCJudW1iZXJcIilcblx0XHRyZXR1cm4gbmV3IFJlZmxleC5TdGF0ZWZ1bEZvcmNlKHZhbCB8fCAwKTtcblx0XG5cdGlmIChBcnJheS5pc0FycmF5KHZhbCkpXG5cdFx0cmV0dXJuIFJlZmxleC5BcnJheUZvcmNlLmNyZWF0ZSh2YWwpO1xuXHRcblx0aWYgKHR5cGVvZiB2YWwgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIHZhbCA9PT0gXCJzeW1ib2xcIilcblx0XHRyZXR1cm4gbmV3IFJlZmxleC5TdGF0ZWZ1bEZvcmNlKHZhbCk7XG5cdFxuXHR0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgY3JlYXRlIGEgZm9yY2UgZnJvbSB0aGlzIHZhbHVlLlwiKTtcbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBUaGUgaW50ZXJmYWNlIHRoYXQgUmVmbGV4IGxpYnJhcmllcyAoUmVmbGV4IE1MLCBSZWZsZXggU1MsIGV0Yylcblx0ICogbXVzdCBpbXBsZW1lbnQuIFxuXHQgKi9cblx0ZXhwb3J0IGludGVyZmFjZSBJTGlicmFyeVxuXHR7XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyBtdXN0IGltcGxlbWVudCB0aGlzIG1ldGhvZCwgc28gdGhhdCB0aGVcblx0XHQgKiBSZWZsZXggQ29yZSBjYW4gZGV0ZXJtaW5lIHRoZSBvcmlnaW5hdGluZyBsaWJyYXJ5IG9mIGEgZ2l2ZW5cblx0XHQgKiBvYmplY3QuIFRoZSBsaWJyYXJ5IHNob3VsZCByZXR1cm4gYSBib29sZWFuIHZhbHVlIGluZGljYXRpbmdcblx0XHQgKiB3aGV0aGVyIHRoZSBsaWJyYXJ5IGlzIGFibGUgdG8gb3BlcmF0ZSBvbiB0aGUgb2JqZWN0IHNwZWNpZmllZC5cblx0XHQgKi9cblx0XHRpc0tub3duQnJhbmNoKGJyYW5jaDogSUJyYW5jaCk6IGJvb2xlYW47XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyBtYXkgaW1wbGVtZW50IHRoaXMgbWV0aG9kIGluIG9yZGVyIHRvIHByb3ZpZGVcblx0XHQgKiB0aGUgc3lzdGVtIHdpdGgga25vd2xlZGdlIG9mIHdoZXRoZXIgYSBicmFuY2ggaGFzIGJlZW4gZGlzcG9zZWQsXG5cdFx0ICogd2hpY2ggaXQgdXNlcyBmb3IgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9ucy4gSWYgdGhlIGxpYnJhcnkgaGFzIG5vXG5cdFx0ICogbWVhbnMgb2YgZG9pbmcgdGhpcywgaXQgbWF5IHJldHVybiBcIm51bGxcIi5cblx0XHQgKi9cblx0XHRpc0JyYW5jaERpc3Bvc2VkPzogKGJyYW5jaDogSUJyYW5jaCkgPT4gYm9vbGVhbjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRnZXRTdGF0aWNCcmFuY2hlcz86ICgpID0+IHsgW25hbWU6IHN0cmluZ106IGFueSB9IHwgdW5kZWZpbmVkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgdGhhdCBoYXZlIHN0YXRpYyBtZW1iZXJzIGluIHRoZWlyIG5hbWVzcGFjZSBtdXN0XG5cdFx0ICogcmV0dXJuIHRoZW0gYXMgYW4gb2JqZWN0IGluIHRoaXMgbWV0aG9kLlxuXHRcdCAqL1xuXHRcdGdldFN0YXRpY05vbkJyYW5jaGVzPzogKCkgPT4geyBbbmFtZTogc3RyaW5nXTogYW55IH0gfCB1bmRlZmluZWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0Z2V0RHluYW1pY0JyYW5jaD86IChuYW1lOiBzdHJpbmcpID0+IElCcmFuY2g7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyBtdXN0IGltcGxlbWVudCB0aGlzIGZ1bmN0aW9uIHRvIGNyZWF0ZSBhYnN0cmFjdFxuXHRcdCAqIHRvcC1sZXZlbCBjb250YWluZXIgYnJhbmNoZXMuXG5cdFx0ICogXG5cdFx0ICogVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgaW1wbGVtZW50ZWQgYnkgbGlicmFyaWVzIHRoYXQgdXNlIHRoZVxuXHRcdCAqIGNvbnRhaW5lciBuYW1lc3BhY2UgdmFyaWFudC5cblx0XHQgKi9cblx0XHRnZXREeW5hbWljTm9uQnJhbmNoPzogKG5hbWU6IHN0cmluZykgPT4gYW55O1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGdldFJvb3RCcmFuY2g/OiAoKSA9PiBJQnJhbmNoO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgdGhhdCBhcmUgaW1wbGVtZW50ZWQgd2l0aCB0aGUgbGVhZiBuYW1lc3BhY2Vcblx0XHQgKiB2YXJpYW50IHVzZSB0aGlzIG1ldGhvZCB0byBjb252ZXJ0IHZhbHVlcyBwYXNzZWQgaW50byB0aGUgbmFtZXNwYWNlXG5cdFx0ICogb2JqZWN0J3MgdGFnZ2VkIHRlbXBsYXRlIGZ1bmN0aW9uIGludG8gb2JqZWN0cyB0aGF0IG1heSBiZSBpbnRlcnByZXRlZFxuXHRcdCAqIGFzIGRpc3BsYXkgdGV4dC5cblx0XHQgKi9cblx0XHRnZXRMZWFmPzogKGxlYWY6IGFueSkgPT4gYW55O1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgdGhhdCBzdXBwb3J0IGlubGluZSB0YXJnZXQrY2hpbGRyZW4gY2xvc3VyZXNcblx0XHQgKiBtdXN0IHByb3ZpZGUgYW4gaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgbWV0aG9kLlxuXHRcdCAqL1xuXHRcdGdldENoaWxkcmVuKHRhcmdldDogSUJyYW5jaCk6IEl0ZXJhYmxlPElCcmFuY2ggfCBJTGVhZj47XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0c3dhcEJyYW5jaGVzKGJyYW5jaDE6IElCcmFuY2gsIGJyYW5jaDI6IElCcmFuY2gpOiB2b2lkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdHJlcGxhY2VCcmFuY2goYnJhbmNoMTogSUJyYW5jaCwgYnJhbmNoMjogSUJyYW5jaCk6IHZvaWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0YXR0YWNoQXRvbShhdG9tOiBhbnksIGJyYW5jaDogSUJyYW5jaCwgcmVmOiBSZWYpOiB2b2lkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGRldGFjaEF0b20oYXRvbTogYW55LCBicmFuY2g6IElCcmFuY2gpOiB2b2lkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGF0dGFjaEF0dHJpYnV0ZShicmFuY2g6IElCcmFuY2gsIGtleTogc3RyaW5nLCB2YWx1ZTogYW55KTogdm9pZDtcblx0XHRcdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0ZGV0YWNoQXR0cmlidXRlKGJyYW5jaDogSUJyYW5jaCwga2V5OiBzdHJpbmcpOiB2b2lkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgY2FuIGhpamFjayB0aGUgb24oKSwgb25jZSgpIGFuZCBvbmx5KCkgZnVuY3Rpb25zXG5cdFx0ICogdG8gcHJvdmlkZSB0aGVpciBvd24gY3VzdG9tIGJlaGF2aW9yIGJ5IG92ZXJyaWRpbmcgdGhpcyBtZXRob2QuXG5cdFx0ICogXG5cdFx0ICogSWYgdGhlIG1ldGhvZCByZXR1cm5zIHVuZGVmaW5lZCwgdGhlIHJlY3VycmVudCBmdW5jdGlvbiBjcmVhdGlvblxuXHRcdCAqIGZhY2lsaXRpZXMgYnVpbHQgaW50byB0aGUgUmVmbGV4IENvcmUgYXJlIHVzZWQuXG5cdFx0ICovXG5cdFx0Y3JlYXRlUmVjdXJyZW50PzogKFxuXHRcdFx0a2luZDogUmVjdXJyZW50S2luZCxcblx0XHRcdHNlbGVjdG9yOiBhbnksXG5cdFx0XHRjYWxsYmFjazogUmVjdXJyZW50Q2FsbGJhY2s8QXRvbT4sXG5cdFx0XHRyZXN0OiBhbnlbXSkgPT4gYW55XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyB0aGF0IGNvbnRyaWJ1dGUgdG8gdGhlIGdsb2JhbCBvbigpIGZ1bmN0aW9uXG5cdFx0ICogbXVzdCBwcm92aWRlIGFuIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIG1ldGhvZC5cblx0XHQgKiBcblx0XHQgKiBMaWJyYXJpZXMgbXVzdCBpbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiBpbiBvcmRlciB0byBwcm92aWRlIHRoZWlyIG93blxuXHRcdCAqIGhvb2tzIGludG8gdGhlIGdsb2JhbCByZWN1cnJlbnQgZnVuY3Rpb25zIChzdWNoIGFzIG9uKCksIG9ubHkoKSBhbmQgb25jZSgpKS5cblx0XHQgKiBcblx0XHQgKiBJZiB0aGUgbGlicmFyeSBkb2VzIG5vdCByZWNvZ25pemUgdGhlIHNlbGVjdG9yIHByb3ZpZGVkLCBpdCBzaG91bGRcblx0XHQgKiByZXR1cm4gZmFsc2UsIHNvIHRoYXQgdGhlIFJlZmxleCBlbmdpbmUgY2FuIGZpbmQgYW5vdGhlciBwbGFjZSB0b1xuXHRcdCAqIHBlcmZvcm0gdGhlIGF0dGFjaG1lbnQuIEluIG90aGVyIGNhc2VzLCBpdCBzaG91bGQgcmV0dXJuIHRydWUuXG5cdFx0ICovXG5cdFx0YXR0YWNoUmVjdXJyZW50PzogKFxuXHRcdFx0a2luZDogUmVjdXJyZW50S2luZCxcblx0XHRcdHRhcmdldDogSUJyYW5jaCxcblx0XHRcdHNlbGVjdG9yOiBhbnksXG5cdFx0XHRjYWxsYmFjazogUmVjdXJyZW50Q2FsbGJhY2s8QXRvbT4sXG5cdFx0XHRyZXN0OiBhbnlbXSkgPT4gYm9vbGVhbjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIHRoYXQgY29udHJpYnV0ZSB0byB0aGUgZ2xvYmFsIG9mZigpIGZ1bmN0aW9uXG5cdFx0ICogbXVzdCBwcm92aWRlIGFuIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIG1ldGhvZC5cblx0XHQgKi9cblx0XHRkZXRhY2hSZWN1cnJlbnQ/OiAoXG5cdFx0XHRicmFuY2g6IElCcmFuY2gsXG5cdFx0XHRzZWxlY3RvcjogYW55LFxuXHRcdFx0Y2FsbGJhY2s6IFJlY3VycmVudENhbGxiYWNrPEF0b20+KSA9PiB2b2lkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgY2FuIGltcGxlbWVudCB0aGlzIGZ1bmN0aW9uIGluIG9yZGVyXG5cdFx0ICogdG8gY2FwdHVyZSB0aGUgZmxvdyBvZiBicmFuY2hlcyBiZWluZyBwYXNzZWQgYXNcblx0XHQgKiBhdG9tcyB0byBvdGhlciBicmFuY2ggZnVuY3Rpb25zLlxuXHRcdCAqL1xuXHRcdGhhbmRsZUJyYW5jaEZ1bmN0aW9uPzogKFxuXHRcdFx0YnJhbmNoOiBJQnJhbmNoLFxuXHRcdFx0YnJhbmNoRm46ICguLi5hdG9tczogYW55W10pID0+IElCcmFuY2gpID0+IHZvaWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyBjYW4gaW1wbGVtZW50IHRoaXMgZnVuY3Rpb24gaW4gb3JkZXIgdG8gcHJvY2Vzc1xuXHRcdCAqIGEgYnJhbmNoIGJlZm9yZSBpdCdzIHJldHVybmVkIGZyb20gYSBicmFuY2ggZnVuY3Rpb24uIFdoZW4gdGhpc1xuXHRcdCAqIGZ1bmN0aW9uIGlzIGltcGxlbWVudGVkLCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBicmFuY2ggZnVuY3Rpb25zXG5cdFx0ICogYXJlIHJlcGxhY2VkIHdpdGggdGhlIHJldHVybiB2YWx1ZSBvZiB0aGlzIGZ1bmN0aW9uLiBSZWZsZXhpdmUgbGlicmFyaWVzXG5cdFx0ICogdGhhdCByZXF1aXJlIHRoZSBzdGFuZGFyZCBiZWhhdmlvciBvZiByZXR1cm5pbmcgYnJhbmNoZXMgZnJvbSB0aGVcblx0XHQgKiBicmFuY2ggZnVuY3Rpb25zIHNob3VsZCByZXR1cm4gdGhlIGBicmFuY2hgIGFyZ3VtZW50IHRvIHRoaXMgZnVuY3Rpb25cblx0XHQgKiB2ZXJiYXRpbS5cblx0XHQgKi9cblx0XHRyZXR1cm5CcmFuY2g/OiAoYnJhbmNoOiBJQnJhbmNoKSA9PiBzdHJpbmcgfCBudW1iZXIgfCBiaWdpbnQgfCBvYmplY3Q7XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdGxldCBuZXh0VmFsID0gMDtcblx0bGV0IG5leHRUaW1lc3RhbXAgPSAwO1xuXHRcblx0LyoqICovXG5cdGV4cG9ydCBjb25zdCBlbnVtIExvY2F0b3JUeXBlXG5cdHtcblx0XHRicmFuY2ggPSAwLFxuXHRcdGxlYWYgPSAxLFxuXHRcdHN0cmVhbSA9IDJcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBjbGFzcyBMb2NhdG9yXG5cdHtcblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIGEgZnVsbHkgZm9ybWVkIExvY2F0b3Igb2JqZWN0IGZyb20gaXQncyBzZXJpYWxpemVkIHJlcHJlc2VudGF0aW9uLlxuXHRcdCAqL1xuXHRcdHN0YXRpYyBwYXJzZShzZXJpYWxpemVkTG9jYXRvcjogc3RyaW5nKVxuXHRcdHtcblx0XHRcdGNvbnN0IHBhcnRzID0gc2VyaWFsaXplZExvY2F0b3Iuc3BsaXQoL1t8Pl0vZyk7XG5cdFx0XHRjb25zdCB0eXBlID0gPExvY2F0b3JUeXBlPnBhcnNlSW50KHBhcnRzLnNoaWZ0KCkgfHwgXCIwXCIsIDEwKSB8fCBMb2NhdG9yVHlwZS5icmFuY2g7XG5cdFx0XHRjb25zdCBsb2NhdG9yID0gbmV3IExvY2F0b3IodHlwZSk7XG5cdFx0XHRsb2NhdG9yLmhvbWVUaW1lc3RhbXAgPSBwYXJzZUludChwYXJ0cy5zaGlmdCgpIHx8IFwiMFwiLCAxMCkgfHwgMDtcblx0XHRcdGxvY2F0b3IudmFsdWVzLnB1c2goLi4ucGFydHMubWFwKHAgPT4gcGFyc2VJbnQocCwgMTApIHx8IDApKTtcblx0XHRcdHJldHVybiBsb2NhdG9yO1xuXHRcdH1cblx0XHRcblx0XHRjb25zdHJ1Y3RvcihyZWFkb25seSB0eXBlOiBMb2NhdG9yVHlwZSkgeyB9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0dG9TdHJpbmcoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdHRoaXMudHlwZSArIFwifFwiICtcblx0XHRcdFx0dGhpcy5ob21lVGltZXN0YW1wICsgXCJ8XCIgK1xuXHRcdFx0XHR0aGlzLnZhbHVlcy5qb2luKFwiPlwiKVxuXHRcdFx0KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIGJlbG93IGFycmF5IGlzIGluaXRpYWxpemVkIHRvIGVtcHR5IHdoZW4gdGhlIExvY2F0b3IgaW5zdGFuY2VcbiBcdFx0ICogaXMgaW5zdGFudGlhdGVkLiBUaGlzIGlzIGJlY2F1c2Ugd2hlbiBsb2NhdG9ycyBhcmUgZmlyc3QgaW5zdGFudGlhdGVkLFxuIFx0XHQgKiB0aGV5IHJlZmVyIHRvIG1ldGFzIHRoYXQgYXJlIGZsb2F0aW5nIGluIGxpbWJvIC0tIHRoZXkncmUgbm90IGF0dGFjaGVkXG4gXHRcdCAqIHRvIGFueXRoaW5nLiBMb2NhdG9yIHZhbHVlcyBvbmx5IGJlY29tZSByZWxldmFudCBhdCB0aGUgcG9pbnQgd2hlblxuIFx0XHQgKiB0aGV5IGFyZSBhdHRhY2hlZCB0byBzb21lIGNvbnRhaW5pbmcgbWV0YSwgYmVjYXVzZSBvdGhlcndpc2UsIGl0J3NcbiBcdFx0ICogbm90IHBvc3NpYmxlIGZvciB0aGUgbG9jYXRvciB0byByZWZlciB0byBhIG1ldGEgdGhhdCBoYXMgXCJzaWJsaW5nc1wiLCBcbiBcdFx0ICogd2hpY2ggaXMgdGhlIGVudGlyZSBwb2ludCBvZiB0aGUgTG9jYXRvciBjb25jZXB0LlxuXHRcdCAqL1xuXHRcdHByaXZhdGUgdmFsdWVzOiBudW1iZXJbXSA9IFtdO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdHNldExhc3RMb2NhdG9yVmFsdWUodmFsdWU6IG51bWJlcilcblx0XHR7XG5cdFx0XHR0aGlzLnZhbHVlc1t0aGlzLnZhbHVlcy5sZW5ndGggLSAxXSA9IHZhbHVlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRnZXRsYXN0TG9jYXRvclZhbHVlKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy52YWx1ZXNbdGhpcy52YWx1ZXMubGVuZ3RoIC0gMV07XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRpbWVzdGFtcHMgYXJlIGF0dGFjaGVkIHRvIGVhY2ggbWV0YS4gVGhleSBhcmUgb25seSB1c2VkIHRvIGRldGVybWluZVxuXHRcdCAqIHdoZXRoZXIgdHdvIG1ldGFzIG9yaWdpbmF0ZWQgaW4gdGhlIHNhbWUgY29udGFpbmVyLiBXaGVuIGl0ZXJhdGluZ1xuXHRcdCAqIHRocm91Z2ggYSBtZXRhJ3MgY2hpbGRyZW4sIGl0cyBwb3NzaWJsZSB0aGF0IHNvbWUgb2YgdGhlIG1ldGFzIHdlcmUgbW92ZWRcblx0XHQgKiBpbiBhcyBzaWJsaW5ncyBhdCBydW50aW1lLiBUaW1lc3RhbXBzIGFyZSB1c2VkIHRvIG1ha2Ugc3VyZSB0aGVzZSBmb3JlaWduXG5cdFx0ICogbWV0YXMgYXJlIG9taXR0ZWQgd2hlbiBkb2luZyB0aGVzZSBpdGVyYXRpb25zLlxuXHRcdCAqL1xuXHRcdHByaXZhdGUgcmVhZG9ubHkgdGltZXN0YW1wID0gKytuZXh0VGltZXN0YW1wO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyB0aGUgdGltZXN0YW1wIG9mIHRoZSBicmFuY2ggdGhhdCB3YXMgdGhlIG9yaWdpbmFsIFwiaG9tZVwiIG9mXG5cdFx0ICogdGhlIGJyYW5jaCB0aGF0IHRoaXMgbG9jYXRvciByZWZlcnMgdG8uIFwiSG9tZVwiIGluIHRoaXMgY2FzZSBtZWFucyB0aGVcblx0XHQgKiBicmFuY2ggd2hlcmUgaXQgd2FzIG9yaWdpbmFsbHkgYXBwZW5kZWQuIEluIHRoZSBjYXNlIHdoZW4gdGhlIGxvY2F0b3Jcblx0XHQgKiBoYXNuJ3QgYmVlbiBhcHBlbmRlZCBhbnl3aGVyZSwgdGhlIHZhbHVlIGlzIDAuXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSBob21lVGltZXN0YW1wID0gMDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRzZXRDb250YWluZXIoY29udGFpbmVyTG9jOiBMb2NhdG9yKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLmhvbWVUaW1lc3RhbXAgIT09IDApXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdFxuXHRcdFx0aWYgKENvbnN0LmRlYnVnICYmIHRoaXMudmFsdWVzLmxlbmd0aCA+IDApXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIj9cIik7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHZhbCA9ICsrbmV4dFZhbDtcblx0XHRcdFxuXHRcdFx0aWYgKGNvbnRhaW5lckxvYy50eXBlID09PSBMb2NhdG9yVHlwZS5zdHJlYW0pXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuaG9tZVRpbWVzdGFtcCA9IGNvbnRhaW5lckxvYy5ob21lVGltZXN0YW1wO1xuXHRcdFx0XHR0aGlzLnZhbHVlcy5wdXNoKC4uLmNvbnRhaW5lckxvYy52YWx1ZXMsIHZhbCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChjb250YWluZXJMb2MudHlwZSA9PT0gTG9jYXRvclR5cGUuYnJhbmNoKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmhvbWVUaW1lc3RhbXAgPSBjb250YWluZXJMb2MudGltZXN0YW1wO1xuXHRcdFx0XHR0aGlzLnZhbHVlcy5wdXNoKHZhbCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChDb25zdC5kZWJ1ZyAmJiBjb250YWluZXJMb2MudHlwZSA9PT0gTG9jYXRvclR5cGUubGVhZilcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiP1wiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y29tcGFyZShvdGhlcjogTG9jYXRvcik6IENvbXBhcmVSZXN1bHRcblx0XHR7XG5cdFx0XHQvLyBEZXRlY3QgYSBwb3RlbnRpYWwgY29tcGFyaXNvbiB3aXRoIGEgZmxvYXRpbmcgbWV0YVxuXHRcdFx0aWYgKHRoaXMuaG9tZVRpbWVzdGFtcCA9PT0gMCB8fCBvdGhlci5ob21lVGltZXN0YW1wID09PSAwKVxuXHRcdFx0XHRyZXR1cm4gQ29tcGFyZVJlc3VsdC5pbmNvbXBhcmFibGU7XG5cdFx0XHRcblx0XHRcdC8vIERldGVjdCBkaWZmZXJpbmcgb3JpZ2luYXRpbmcgY29udGFpbmVyc1xuXHRcdFx0aWYgKHRoaXMuaG9tZVRpbWVzdGFtcCAhPT0gb3RoZXIuaG9tZVRpbWVzdGFtcClcblx0XHRcdFx0cmV0dXJuIENvbXBhcmVSZXN1bHQuaW5jb21wYXJhYmxlO1xuXHRcdFx0XG5cdFx0XHRjb25zdCB0aGlzTGFzdCA9IHRoaXMudmFsdWVzW3RoaXMudmFsdWVzLmxlbmd0aCAtIDFdO1xuXHRcdFx0Y29uc3Qgb3RoZXJMYXN0ID0gb3RoZXIudmFsdWVzW290aGVyLnZhbHVlcy5sZW5ndGggLSAxXTtcblx0XHRcdFxuXHRcdFx0Ly8gRGV0ZWN0IHNpbXBsZSBlcXVhbGl0eVxuXHRcdFx0aWYgKHRoaXNMYXN0ID09PSBvdGhlckxhc3QpXG5cdFx0XHRcdHJldHVybiBDb21wYXJlUmVzdWx0LmVxdWFsO1xuXHRcdFx0XG5cdFx0XHQvLyBXZSdyZSBydW5uaW5nIGEgY29tcGFyaXNvbiBvbiB0aGUgY29tbW9uIHBvcnRpb24gb2YgdGhlXG5cdFx0XHQvLyB0d28gbnVtYmVyIHNlcXVlbmNlcy4gSWYgdGhlIG9uZSBpcyBsb25nZXIgdGhhbiB0aGUgb3RoZXIsXG5cdFx0XHQvLyBpdCdzIG5vdCBjb25zaWRlcmVkIGhlcmUuXG5cdFx0XHRjb25zdCBtaW5MZW4gPSBNYXRoLm1pbih0aGlzLnZhbHVlcy5sZW5ndGgsIG90aGVyLnZhbHVlcy5sZW5ndGgpO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IG1pbkxlbjspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHRoaXNWYWwgPSB0aGlzLnZhbHVlc1tpXTtcblx0XHRcdFx0Y29uc3Qgb3RoZXJWYWwgPSBvdGhlci52YWx1ZXNbaV07XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAodGhpc1ZhbCA8IG90aGVyVmFsKVxuXHRcdFx0XHRcdHJldHVybiBDb21wYXJlUmVzdWx0LmhpZ2hlcjtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICh0aGlzVmFsID4gb3RoZXJWYWwpXG5cdFx0XHRcdFx0cmV0dXJuIENvbXBhcmVSZXN1bHQubG93ZXI7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdC8vIFRoZSBjb2RlIGJlbG93IGhhbmRsZXMgdGhlIGNhc2Ugd2hlbiB3ZSBoYXZlIHR3byBzZXF1ZW5jZXNcblx0XHRcdC8vIG9mIHZhbHVlcywgd2hlcmUgdGhlIG9uZSBzZXF1ZW5jZXMgaXMgYmFzaWNhbGx5IGFuIGV4dGVuc2lvbiBvZiB0aGVcblx0XHRcdC8vIG90aGVyLCB1bHRpbWF0ZWx5IGxvb2tpbmcgc29tZXRoaW5nIGxpa2UgdGhpczpcblx0XHRcdC8vIFxuXHRcdFx0Ly8gMT4yXG5cdFx0XHQvLyAxPjI+Mz40XG5cdFx0XHQvLyBcblx0XHRcdC8vIEluIHRoaXMgY2FzZSwgdGhlIHNob3J0ZXIgc2VxdWVuY2UgaXMgY29uc2lkZXJlZCBcImxvd2VyXCIgdGhhbiB0aGVcblx0XHRcdC8vIGxvbmdlciBvbmUsIGJlY2F1c2UgaW4gdGhpcyBjYXNlLCB0aGUgY29uc3VtZXJzIG9mIHRoaXMgbWV0aG9kIGFyZVxuXHRcdFx0Ly8gYmFzaWNhbGx5IHRyeWluZyB0byBcImdldCB0byB0aGUgZW5kIG9mIGFsbCB0aGUgMT4yJ3NcIiwgYW5kIHVzaW5nIDE+MlxuXHRcdFx0Ly8gYXMgdGhlIGlucHV0IHRvIGNvbW11bmljYXRlIHRoYXQuXG5cdFx0XHRcblx0XHRcdGlmICh0aGlzLnZhbHVlcy5sZW5ndGggPiBvdGhlci52YWx1ZXMubGVuZ3RoKVxuXHRcdFx0XHRyZXR1cm4gQ29tcGFyZVJlc3VsdC5oaWdoZXI7XG5cdFx0XHRcblx0XHRcdGlmICh0aGlzLnZhbHVlcy5sZW5ndGggPCBvdGhlci52YWx1ZXMubGVuZ3RoKVxuXHRcdFx0XHRyZXR1cm4gQ29tcGFyZVJlc3VsdC5sb3dlcjtcblx0XHRcdFxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiP1wiKTtcblx0XHR9XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgY29uc3QgZW51bSBDb21wYXJlUmVzdWx0XG5cdHtcblx0XHRlcXVhbCxcblx0XHRpbmNvbXBhcmFibGUsXG5cdFx0aGlnaGVyLFxuXHRcdGxvd2VyXG5cdH1cdFxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0ZXhwb3J0IHR5cGUgQ29uc3RydWN0QnJhbmNoRm4gPSAoLi4uYXJnczogYW55W10pID0+IElCcmFuY2g7XG5cdFxuXHQvKiogQGludGVybmFsICovXG5cdGRlY2xhcmUgY29uc3QgRGVubzogYW55O1xuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgQXNMaWJyYXJ5PFQsIEwgZXh0ZW5kcyBJTGlicmFyeT4gPSBcblx0XHRUICZcblx0XHRTdGF0aWNCcmFuY2hlc09mPEw+ICZcblx0XHRTdGF0aWNOb25CcmFuY2hlc09mPEw+O1xuXHRcblx0LyoqXG5cdCAqIENyZWF0ZXMgYSBSZWZsZXggbmFtZXNwYWNlLCB3aGljaCBpcyB0aGUgdG9wLWxldmVsIGZ1bmN0aW9uIG9iamVjdCB0aGF0XG5cdCAqIGhvbGRzIGFsbCBmdW5jdGlvbnMgaW4gdGhlIHJlZmxleGl2ZSBsaWJyYXJ5LlxuXHQgKiBcblx0ICogVGhpcyBmdW5jdGlvbiBjcmVhdGVzIHRoZSBcImxlYWZcIiB2YXJpYW50IG9mIGEgUmVmbGV4IG5hbWVzcGFjZSwgd2hpY2hcblx0ICogaXMgdGhlIHN0eWxlIHdoZXJlIHRoZSBuYW1lc3BhY2UsIHdoZW4gY2FsbGVkIGFzIGEgZnVuY3Rpb24sIHByb2R1Y2VzXG5cdCAqIHZpc3VhbCBjb250ZW50IHRvIGRpc3BsYXkuIFJlZmxleGl2ZSBsaWJyYXJpZXMgdGhhdCB1c2UgdGhpcyB2YXJpYW50IG1heVxuXHQgKiB1c2UgdGhlIG5hbWVzcGFjZSBhcyBhIHRhZ2dlZCB0ZW1wbGF0ZSBmdW5jdGlvbiwgZm9yIGV4YW1wbGU6XG5cdCAqIG1sYExpdGVyYWwgdGV4dCBjb250ZW50YDtcblx0ICogXG5cdCAqIEBwYXJhbSBsaWJyYXJ5IEFuIG9iamVjdCB0aGF0IGltcGxlbWVudHMgdGhlIElMaWJyYXJ5IGludGVyZmFjZSxcblx0ICogZnJvbSB3aGljaCB0aGUgbmFtZXNwYWNlIG9iamVjdCB3aWxsIGJlIGdlbmVyYXRlZC5cblx0ICogXG5cdCAqIEBwYXJhbSBnbG9iYWxpemUgSW5kaWNhdGVzIHdoZXRoZXIgdGhlIG9uL29uY2Uvb25seSBnbG9iYWxzIHNob3VsZFxuXHQgKiBiZSBhcHBlbmRlZCB0byB0aGUgZ2xvYmFsIG9iamVjdCAod2hpY2ggaXMgYXV0by1kZXRlY3RlZCBmcm9tIHRoZVxuXHQgKiBjdXJyZW50IGVudmlyb25tZW50LiBJZiB0aGUgSUxpYnJhcnkgaW50ZXJmYWNlIHByb3ZpZGVkIGRvZXNuJ3Qgc3VwcG9ydFxuXHQgKiB0aGUgY3JlYXRpb24gb2YgcmVjdXJyZW50IGZ1bmN0aW9ucywgdGhpcyBwYXJhbWV0ZXIgaGFzIG5vIGVmZmVjdC5cblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMZWFmTmFtZXNwYWNlXG5cdFx0PE4gZXh0ZW5kcyBJTGVhZk5hbWVzcGFjZSwgTCBleHRlbmRzIElMaWJyYXJ5Pihcblx0XHRsaWJyYXJ5OiBMLFxuXHRcdGdsb2JhbGl6ZT86IGJvb2xlYW4pOiBBc0xpYnJhcnk8TiwgTD5cblx0e1xuXHRcdGlmIChDb25zdC5kZWJ1ZyAmJiAhbGlicmFyeS5nZXRMZWFmKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhlIC5nZXRMZWFmIGZ1bmN0aW9uIG11c3QgYmUgaW1wbGVtZW50ZWQgaW4gdGhpcyBsaWJyYXJ5LlwiKTtcblx0XHRcblx0XHRyZXR1cm4gY3JlYXRlTmFtZXNwYWNlKHRydWUsIGxpYnJhcnksIGdsb2JhbGl6ZSk7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEgUmVmbGV4IG5hbWVzcGFjZSwgd2hpY2ggaXMgdGhlIHRvcC1sZXZlbCBmdW5jdGlvbiBvYmplY3QgdGhhdFxuXHQgKiBob2xkcyBhbGwgZnVuY3Rpb25zIGluIHRoZSByZWZsZXhpdmUgbGlicmFyeS5cblx0ICogXG5cdCAqIFRoaXMgZnVuY3Rpb24gY3JlYXRlcyB0aGUgXCJjb250YWluZXJcIiB2YXJpYW50IG9mIGEgUmVmbGV4IG5hbWVzcGFjZSwgd2hpY2hcblx0ICogaXMgdGhlIHN0eWxlIHdoZXJlIHRoZSBuYW1lc3BhY2UsIHdoZW4gY2FsbGVkIGFzIGEgZnVuY3Rpb24sIHByb2R1Y2VzXG5cdCAqIGFuIGFic3RyYWN0IHRvcC1sZXZlbCBjb250YWluZXIgb2JqZWN0LlxuXHQgKiBcblx0ICogQHBhcmFtIGxpYnJhcnkgQW4gb2JqZWN0IHRoYXQgaW1wbGVtZW50cyB0aGUgSUxpYnJhcnkgaW50ZXJmYWNlLFxuXHQgKiBmcm9tIHdoaWNoIHRoZSBuYW1lc3BhY2Ugb2JqZWN0IHdpbGwgYmUgZ2VuZXJhdGVkLlxuXHQgKiBcblx0ICogQHBhcmFtIGdsb2JhbGl6ZSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgb24vb25jZS9vbmx5IGdsb2JhbHMgc2hvdWxkXG5cdCAqIGJlIGFwcGVuZGVkIHRvIHRoZSBnbG9iYWwgb2JqZWN0ICh3aGljaCBpcyBhdXRvLWRldGVjdGVkIGZyb20gdGhlXG5cdCAqIGN1cnJlbnQgZW52aXJvbm1lbnQuIElmIHRoZSBJTGlicmFyeSBpbnRlcmZhY2UgcHJvdmlkZWQgZG9lc24ndCBzdXBwb3J0XG5cdCAqIHRoZSBjcmVhdGlvbiBvZiByZWN1cnJlbnQgZnVuY3Rpb25zLCB0aGlzIHBhcmFtZXRlciBoYXMgbm8gZWZmZWN0LlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUJyYW5jaE5hbWVzcGFjZVxuXHRcdDxOIGV4dGVuZHMgSUJyYW5jaE5hbWVzcGFjZSwgTCBleHRlbmRzIElMaWJyYXJ5Pihcblx0XHRsaWJyYXJ5OiBMLFxuXHRcdGdsb2JhbGl6ZT86IGJvb2xlYW4pOiBBc0xpYnJhcnk8TiwgTD5cblx0e1xuXHRcdGlmIChDb25zdC5kZWJ1ZyAmJiAhbGlicmFyeS5nZXRSb290QnJhbmNoKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhlIC5nZXRSb290QnJhbmNoIGZ1bmN0aW9uIG11c3QgYmUgaW1wbGVtZW50ZWQgaW4gdGhpcyBsaWJyYXJ5LlwiKTtcblx0XHRcblx0XHRyZXR1cm4gY3JlYXRlTmFtZXNwYWNlKGZhbHNlLCBsaWJyYXJ5LCBnbG9iYWxpemUpO1xuXHR9XG5cdFxuXHQvKipcblx0ICogSW50ZXJuYWwgbmFtZXNwYWNlIG9iamVjdCBjcmVhdGlvbiBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIGNyZWF0ZU5hbWVzcGFjZTxUTmFtZXNwYWNlLCBUTGlicmFyeSBleHRlbmRzIElMaWJyYXJ5Pihcblx0XHRpc0xlYWY6IGJvb2xlYW4sXG5cdFx0bGlicmFyeTogVExpYnJhcnksXG5cdFx0Z2xvYmFsaXplPzogYm9vbGVhbik6IEFzTGlicmFyeTxUTmFtZXNwYWNlLCBUTGlicmFyeT5cblx0e1xuXHRcdFJvdXRpbmdMaWJyYXJ5LmFkZExpYnJhcnkobGlicmFyeSk7XG5cdFx0XG5cdFx0Y29uc3QgZ2xvYjogYW55ID1cblx0XHRcdCFnbG9iYWxpemUgPyBudWxsIDpcblx0XHRcdC8vIE5vZGUuanNcblx0XHRcdCh0eXBlb2YgZ2xvYmFsID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBnbG9iYWwuc2V0VGltZW91dCA9PT0gXCJmdW5jdGlvblwiKSA/IGdsb2JhbCA6XG5cdFx0XHQvLyBCcm93c2VyIC8gRGVub1xuXHRcdFx0KHR5cGVvZiBuYXZpZ2F0b3IgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIERlbm8gPT09IFwib2JqZWN0XCIpID8gd2luZG93IDpcblx0XHRcdG51bGw7XG5cdFx0XG5cdFx0Ly8gV2UgY3JlYXRlIHRoZSBvbiwgb25jZSwgYW5kIG9ubHkgZ2xvYmFscyBpbiB0aGUgY2FzZSB3aGVuIHdlJ3JlIGNyZWF0aW5nXG5cdFx0Ly8gYSBuYW1lc3BhY2Ugb2JqZWN0IGZvciBhIGxpYnJhcnkgdGhhdCBzdXBwb3J0cyByZWN1cnJlbnQgZnVuY3Rpb25zLlxuXHRcdGlmIChnbG9iICYmIGxpYnJhcnkuYXR0YWNoUmVjdXJyZW50KVxuXHRcdHtcblx0XHRcdGNvbnN0IGNyZWF0ZUdsb2JhbCA9IChraW5kOiBSZWN1cnJlbnRLaW5kKSA9PiAoXG5cdFx0XHRcdHNlbGVjdG9yOiBhbnksXG5cdFx0XHRcdGNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9tPGFueT4+LFxuXHRcdFx0XHQuLi5yZXN0OiBhbnlbXSkgPT5cblx0XHRcdHtcblx0XHRcdFx0aWYgKGxpYnJhcnkuY3JlYXRlUmVjdXJyZW50KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgY3VzdG9tUmVjdXJyZW50ID0gbGlicmFyeS5jcmVhdGVSZWN1cnJlbnQoa2luZCwgc2VsZWN0b3IsIGNhbGxiYWNrLCByZXN0KTtcblx0XHRcdFx0XHRpZiAoY3VzdG9tUmVjdXJyZW50ICE9PSB1bmRlZmluZWQpXG5cdFx0XHRcdFx0XHRyZXR1cm4gY3VzdG9tUmVjdXJyZW50O1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBXZSBjb3VsZCBwYXJzZSB0aGUgc2VsZWN0b3IgaGVyZSwgc2VlIGlmIHlvdSBoYXZlIGFueSBvbi1vbidzLFxuXHRcdFx0XHQvLyBpZiB5b3UgZG8sIGNhbGwgdGhlIGZ1bmN0aW9ucyB0byBhdWdtZW50IHRoZSByZXR1cm4gdmFsdWUuXG5cdFx0XHRcdC8vIEFsdGVybmF0aXZlbHksIHdlIGNvdWxkIGlubGluZSB0aGUgc3VwcG9ydCBmb3IgZm9yY2UgYXJyYXlzLlxuXHRcdFx0XHRyZXR1cm4gbmV3IFJlY3VycmVudChraW5kLCBzZWxlY3RvciwgY2FsbGJhY2ssIHJlc3QpO1xuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0aWYgKHR5cGVvZiBnbG9iLm9uICE9PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdGdsb2Iub24gPSBjcmVhdGVHbG9iYWwoUmVjdXJyZW50S2luZC5vbik7XG5cdFx0XHRcblx0XHRcdGlmICh0eXBlb2YgZ2xvYi5vbmNlICE9PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdGdsb2Iub25jZSA9IGNyZWF0ZUdsb2JhbChSZWN1cnJlbnRLaW5kLm9uY2UpO1xuXHRcdFx0XG5cdFx0XHRpZiAodHlwZW9mIGdsb2Iub25seSAhPT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0XHRnbG9iLm9ubHkgPSBjcmVhdGVHbG9iYWwoUmVjdXJyZW50S2luZC5vbmx5KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y29uc3Qgc3RhdGljTWVtYmVycyA9ICgoKSA9PlxuXHRcdHtcblx0XHRcdGNvbnN0IHN0YXRpY0JyYW5jaGVzID0gKCgpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGJyYW5jaEZuczogeyBba2V5OiBzdHJpbmddOiAoLi4uYXJnczogYW55KSA9PiBhbnk7IH0gPSB7fTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChsaWJyYXJ5LmdldFN0YXRpY0JyYW5jaGVzKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Zm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMobGlicmFyeS5nZXRTdGF0aWNCcmFuY2hlcygpIHx8IHt9KSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRjb25zdCBjb25zdHJ1Y3RCcmFuY2hGbjogQ29uc3RydWN0QnJhbmNoRm4gPSB2YWx1ZTtcblx0XHRcdFx0XHRcdGJyYW5jaEZuc1trZXldID0gY29uc3RydWN0QnJhbmNoRm4ubGVuZ3RoID09PSAwID9cblx0XHRcdFx0XHRcdFx0Y3JlYXRlQnJhbmNoRm4oY29uc3RydWN0QnJhbmNoRm4sIGtleSkgOlxuXHRcdFx0XHRcdFx0XHRjcmVhdGVQYXJhbWV0aWNCcmFuY2hGbihjb25zdHJ1Y3RCcmFuY2hGbiwga2V5KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdHJldHVybiBicmFuY2hGbnM7XG5cdFx0XHR9KSgpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBzdGF0aWNOb25CcmFuY2hlcyA9IFxuXHRcdFx0XHRsaWJyYXJ5LmdldFN0YXRpY05vbkJyYW5jaGVzID9cblx0XHRcdFx0XHRsaWJyYXJ5LmdldFN0YXRpY05vbkJyYW5jaGVzKCkgfHwge30gOiB7fTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHN0YXRpY0JyYW5jaGVzLCBzdGF0aWNOb25CcmFuY2hlcyk7XG5cdFx0fSkoKTtcblx0XHRcblx0XHRjb25zdCBuc0ZuID0gaXNMZWFmID9cblx0XHRcdGNyZWF0ZUxlYWZOYW1lc3BhY2VGbihsaWJyYXJ5KSA6XG5cdFx0XHRjcmVhdGVCcmFuY2hOYW1lc3BhY2VGbihsaWJyYXJ5KTtcblx0XHRcblx0XHRjb25zdCBuc09iaiA9ICgoKSA9PlxuXHRcdHtcblx0XHRcdC8vIEluIHRoZSBjYXNlIHdoZW4gdGhlcmUgYXJlIG5vIGR5bmFtaWMgbWVtYmVycywgd2UgY2FuIGp1c3Rcblx0XHRcdC8vIHJldHVybiB0aGUgc3RhdGljIG5hbWVzcGFjZSBtZW1iZXJzLCBhbmQgYXZvaWQgdXNlIG9mIFByb3hpZXNcblx0XHRcdC8vIGFsbCB0b2dldGhlci5cblx0XHRcdGlmICghbGlicmFyeS5nZXREeW5hbWljQnJhbmNoICYmICFsaWJyYXJ5LmdldER5bmFtaWNOb25CcmFuY2gpXG5cdFx0XHRcdHJldHVybiA8YW55Pk9iamVjdC5hc3NpZ24obnNGbiwgc3RhdGljTWVtYmVycyk7XG5cdFx0XHRcblx0XHRcdC8vIFRoaXMgdmFyaWFibGUgc3RvcmVzIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIHRoZSBtZW1iZXJzXG5cdFx0XHQvLyB0aGF0IHdlcmUgYXR0YWNoZWQgdG8gdGhlIHByb3h5IG9iamVjdCBhZnRlciBpdCdzIGNyZWF0aW9uLlxuXHRcdFx0Ly8gQ3VycmVudGx5IHRoaXMgaXMgb25seSBiZWluZyB1c2VkIGJ5IFJlZmxleE1MIHRvIGF0dGFjaFxuXHRcdFx0Ly8gdGhlIFwiZW1pdFwiIGZ1bmN0aW9uLCBidXQgb3RoZXJzIG1heSB1c2UgaXQgYXN3ZWxsLlxuXHRcdFx0bGV0IGF0dGFjaGVkTWVtYmVyczogeyBba2V5OiBzdHJpbmddOiBhbnk7IH0gfCBudWxsID0gbnVsbDtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIDxhbnk+bmV3IFByb3h5KG5zRm4sIHtcblx0XHRcdFx0Z2V0KHRhcmdldDogRnVuY3Rpb24sIGtleTogc3RyaW5nKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBrZXkgIT09IFwic3RyaW5nXCIpXG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHByb3BlcnR5LlwiKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoa2V5ID09PSBcImNhbGxcIiB8fCBrZXkgPT09IFwiYXBwbHlcIilcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcImNhbGwoKSBhbmQgYXBwbHkoKSBhcmUgbm90IHN1cHBvcnRlZC5cIik7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKGtleSBpbiBzdGF0aWNNZW1iZXJzKVxuXHRcdFx0XHRcdFx0cmV0dXJuIHN0YXRpY01lbWJlcnNba2V5XTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoYXR0YWNoZWRNZW1iZXJzICYmIGtleSBpbiBhdHRhY2hlZE1lbWJlcnMpXG5cdFx0XHRcdFx0XHRyZXR1cm4gYXR0YWNoZWRNZW1iZXJzW2tleV07XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKGxpYnJhcnkuZ2V0RHluYW1pY0JyYW5jaClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBicmFuY2ggPSBsaWJyYXJ5LmdldER5bmFtaWNCcmFuY2goa2V5KTtcblx0XHRcdFx0XHRcdGlmIChicmFuY2gpXG5cdFx0XHRcdFx0XHRcdHJldHVybiBjcmVhdGVCcmFuY2hGbigoKSA9PiBicmFuY2gsIGtleSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChsaWJyYXJ5LmdldER5bmFtaWNOb25CcmFuY2gpXG5cdFx0XHRcdFx0XHRyZXR1cm4gbGlicmFyeS5nZXREeW5hbWljTm9uQnJhbmNoKGtleSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNldCh0YXJnZXQ6IEZ1bmN0aW9uLCBwOiBhbnksIHZhbHVlOiBhbnkpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHQoYXR0YWNoZWRNZW1iZXJzIHx8IChhdHRhY2hlZE1lbWJlcnMgPSB7fSkpW3BdID0gdmFsdWU7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pKCk7XG5cdFx0XG5cdFx0bmFtZXNwYWNlT2JqZWN0cy5zZXQobnNPYmosIGxpYnJhcnkpO1xuXHRcdHJldHVybiBuc09iajtcblx0fVxuXHRcblx0LyoqXG5cdCAqIFJldHVybnMgdGhlIElMaWJyYXJ5IGluc3RhbmNlIHRoYXQgY29ycmVzcG9uZHNcblx0ICogdG8gdGhlIHNwZWNpZmllZCBuYW1lc3BhY2Ugb2JqZWN0LiBUaGlzIGZ1bmN0aW9uXG5cdCAqIGlzIHVzZWQgZm9yIGxheWVyaW5nIFJlZmxleGl2ZSBsaWJyYXJpZXMgb24gdG9wIG9mXG5cdCAqIGVhY2ggb3RoZXIsIGkuZS4sIHRvIGRlZmVyIHRoZSBpbXBsZW1lbnRhdGlvbiBvZlxuXHQgKiBvbmUgb2YgdGhlIElMaWJyYXJ5IGZ1bmN0aW9ucyB0byBhbm90aGVyIElMaWJyYXJ5XG5cdCAqIGF0IGEgbG93ZXItbGV2ZWwuXG5cdCAqIFxuXHQgKiBUaGUgdHlwaW5ncyBvZiB0aGUgcmV0dXJuZWQgSUxpYnJhcnkgYXNzdW1lIHRoYXRcblx0ICogYWxsIElMaWJyYXJ5IGZ1bmN0aW9ucyBhcmUgaW1wbGVtZW50ZWQgaW4gb3JkZXIgdG9cblx0ICogYXZvaWQgZXhjZXNzaXZlIFwicG9zc2libHkgdW5kZWZpbmVkXCIgY2hlY2tzLlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGxpYnJhcnlPZihuYW1lc3BhY2VPYmplY3Q6IG9iamVjdCk6IERlZmluZWQ8SUxpYnJhcnk+XG5cdHtcblx0XHRjb25zdCBsaWI6IGFueSA9IG5hbWVzcGFjZU9iamVjdHMuZ2V0KG5hbWVzcGFjZU9iamVjdCk7XG5cdFx0XG5cdFx0aWYgKENvbnN0LmRlYnVnICYmICFsaWIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIG9iamVjdCBkb2VzIG5vdCBoYXZlIGFuIGFzc29jaWF0ZWQgUmVmbGV4IGxpYnJhcnkuXCIpO1xuXHRcdFxuXHRcdHJldHVybiBsaWI7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHR0eXBlIERlZmluZWQ8VD4gPSB7IFtQIGluIGtleW9mIFRdLT86IFRbUF0gfTtcblx0XG5cdC8qKlxuXHQgKiBTdG9yZXMgYWxsIGNyZWF0ZWQgbmFtZXNwYWNlIG9iamVjdHMsIHVzZWQgdG8gcG93ZXIgdGhlIC5saWJyYXJ5T2YoKSBmdW5jdGlvbi5cblx0ICovXG5cdGNvbnN0IG5hbWVzcGFjZU9iamVjdHMgPSBuZXcgV2Vha01hcDxvYmplY3QsIElMaWJyYXJ5PigpO1xuXHRcblx0LyoqXG5cdCAqIFJldHVybnMgd2hldGhlciB0aGUgc3BlY2lmaWVkIGZ1bmN0aW9uIG9yIG1ldGhvZFxuXHQgKiByZWZlcnMgdG8gYSBicmFuY2ggZnVuY3Rpb24gdGhhdCB3YXMgY3JlYXRlZCBieSBhXG5cdCAqIHJlZmxleGl2ZSBsaWJyYXJ5LlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGlzQnJhbmNoRnVuY3Rpb24oZm46IEZ1bmN0aW9uKVxuXHR7XG5cdFx0cmV0dXJuIGJyYW5jaEZucy5oYXMoZm4pO1xuXHR9XG5cdFxuXHQvKiogKi9cblx0Y29uc3QgdG9CcmFuY2hGdW5jdGlvbiA9IDxUIGV4dGVuZHMgRnVuY3Rpb24+KG5hbWU6IHN0cmluZywgZm46IFQpID0+XG5cdHtcblx0XHRpZiAobmFtZSlcblx0XHR7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZm4sIFwibmFtZVwiLCB7XG5cdFx0XHRcdHZhbHVlOiBuYW1lLFxuXHRcdFx0XHR3cml0YWJsZTogZmFsc2UsXG5cdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2Vcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHRicmFuY2hGbnMuYWRkKGZuKTtcblx0XHRyZXR1cm4gZm47XG5cdH1cblx0XG5cdC8qKiBTdG9yZXMgdGhlIHNldCBvZiBhbGwgYnJhbmNoIGZ1bmN0aW9ucyBjcmVhdGVkIGJ5IGFsbCByZWZsZXhpdmUgbGlicmFyaWVzLiAqL1xuXHRjb25zdCBicmFuY2hGbnMgPSBuZXcgV2Vha1NldDxGdW5jdGlvbj4oKTtcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGNvbnN0IGNyZWF0ZUJyYW5jaEZuID0gKGNvbnN0cnVjdEJyYW5jaEZuOiAoKSA9PiBJQnJhbmNoLCBuYW1lOiBzdHJpbmcpID0+XG5cdFx0dG9CcmFuY2hGdW5jdGlvbihuYW1lLCAoLi4uYXRvbXM6IEF0b21bXSkgPT5cblx0XHRcdHJldHVybkJyYW5jaChjb25zdHJ1Y3RCcmFuY2hGbigpLCBhdG9tcykpO1xuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0Y29uc3QgY3JlYXRlUGFyYW1ldGljQnJhbmNoRm4gPSAoYnJhbmNoRm46ICguLi5hcmdzOiBhbnlbXSkgPT4gSUJyYW5jaCwgbmFtZTogc3RyaW5nKSA9PlxuXHRcdCguLi5jb25zdHJ1Y3RCcmFuY2hBcmdzOiBhbnlbXSkgPT5cblx0XHRcdHRvQnJhbmNoRnVuY3Rpb24obmFtZSwgKC4uLmF0b21zOiBBdG9tW10pID0+XG5cdFx0XHRcdHJldHVybkJyYW5jaChicmFuY2hGbihjb25zdHJ1Y3RCcmFuY2hBcmdzKSwgYXRvbXMpKTtcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGZ1bmN0aW9uIHJldHVybkJyYW5jaChicmFuY2g6IElCcmFuY2gsIGF0b21zOiBhbnlbXSlcblx0e1xuXHRcdG5ldyBCcmFuY2hNZXRhKGJyYW5jaCwgYXRvbXMpO1xuXHRcdGNvbnN0IGxpYiA9IFJvdXRpbmdMaWJyYXJ5LnRoaXM7XG5cdFx0cmV0dXJuIGxpYi5yZXR1cm5CcmFuY2ggP1xuXHRcdFx0bGliLnJldHVybkJyYW5jaChicmFuY2gpIDpcblx0XHRcdGJyYW5jaDtcblx0fVxuXHRcblx0LyoqXG5cdCAqIENyZWF0ZXMgdGhlIGZ1bmN0aW9uIHRoYXQgZXhpc3RzIGF0IHRoZSB0b3Agb2YgdGhlIGxpYnJhcnksXG5cdCAqIHdoaWNoIGlzIHVzZWQgZm9yIGluc2VydGluZyB2aXNpYmxlIHRleHQgaW50byB0aGUgdHJlZS5cblx0ICovXG5cdGZ1bmN0aW9uIGNyZWF0ZUxlYWZOYW1lc3BhY2VGbihsaWJyYXJ5OiBJTGlicmFyeSlcblx0e1xuXHRcdHJldHVybiAoXG5cdFx0XHR0ZW1wbGF0ZTogVGVtcGxhdGVTdHJpbmdzQXJyYXkgfCBTdGF0ZWZ1bEZvcmNlLFxuXHRcdFx0Li4udmFsdWVzOiAoSUJyYW5jaCB8IFN0YXRlZnVsRm9yY2UpW10pOiBhbnkgPT5cblx0XHR7XG5cdFx0XHRjb25zdCBhcnJheSA9IEFycmF5LmlzQXJyYXkodGVtcGxhdGUpID9cblx0XHRcdFx0dGVtcGxhdGUgOlxuXHRcdFx0XHRbdGVtcGxhdGVdO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBvdXQ6IG9iamVjdFtdID0gW107XG5cdFx0XHRjb25zdCBsZW4gPSBhcnJheS5sZW5ndGggKyB2YWx1ZXMubGVuZ3RoO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBnZXRMZWFmID0gbGlicmFyeS5nZXRMZWFmO1xuXHRcdFx0aWYgKCFnZXRMZWFmKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcblx0XHRcdC8vIFRPRE86IFRoaXMgc2hvdWxkIGJlIG9wdGltaXplZCBzbyB0aGF0IG11bHRpcGxlXG5cdFx0XHQvLyByZXBlYXRpbmcgc3RyaW5nIHZhbHVlcyBkb24ndCByZXN1bHQgaW4gdGhlIGNyZWF0aW9uXG5cdFx0XHQvLyBvZiBtYW55IExlYWZNZXRhIG9iamVjdHMuXG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgbGVuOylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdmFsID0gaSAlIDIgPT09IDAgP1xuXHRcdFx0XHRcdGFycmF5W2kgLyAyXSA6XG5cdFx0XHRcdFx0dmFsdWVzWyhpIC0gMSkgLyAyXTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB1bmRlZmluZWQpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAodmFsIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG91dC5wdXNoKG5ldyBSZWN1cnJlbnQoXG5cdFx0XHRcdFx0XHRSZWN1cnJlbnRLaW5kLm9uLFxuXHRcdFx0XHRcdFx0dmFsLFxuXHRcdFx0XHRcdFx0bm93ID0+XG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGdldExlYWYobm93KTtcblx0XHRcdFx0XHRcdFx0aWYgKHJlc3VsdClcblx0XHRcdFx0XHRcdFx0XHRuZXcgTGVhZk1ldGEocmVzdWx0KTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHRcdFx0XHR9KS5ydW4oKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgcHJlcGFyZWQgPSBnZXRMZWFmKHZhbCk7XG5cdFx0XHRcdFx0aWYgKHByZXBhcmVkKVxuXHRcdFx0XHRcdFx0b3V0LnB1c2gocHJlcGFyZWQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3Qgb2JqZWN0IG9mIG91dClcblx0XHRcdFx0bmV3IExlYWZNZXRhKG9iamVjdCk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBvdXQ7XG5cdFx0fTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIENyZWF0ZXMgdGhlIGZ1bmN0aW9uIHRoYXQgZXhpc3RzIGF0IHRoZSB0b3Agb2YgdGhlIGxpYnJhcnksXG5cdCAqIHdoaWNoIGlzIHVzZWQgZm9yIGNyZWF0aW5nIGFuIGFic3RyYWN0IGNvbnRhaW5lciBvYmplY3QuXG5cdCAqL1xuXHRmdW5jdGlvbiBjcmVhdGVCcmFuY2hOYW1lc3BhY2VGbihsaWJyYXJ5OiBJTGlicmFyeSlcblx0e1xuXHRcdGNvbnN0IGdldFJvb3RCcmFuY2ggPSBsaWJyYXJ5LmdldFJvb3RCcmFuY2g7XG5cdFx0cmV0dXJuIGdldFJvb3RCcmFuY2ggP1xuXHRcdFx0Y3JlYXRlQnJhbmNoRm4oKCkgPT4gZ2V0Um9vdEJyYW5jaCgpLCBcIlwiKSA6XG5cdFx0XHQoKSA9PiB7fTtcblx0fTtcbn1cbiIsIlxuZGVjbGFyZSBuYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0ZXhwb3J0IGludGVyZmFjZSBNZXRhQXJyYXk8VCBleHRlbmRzIE1ldGEgPSBNZXRhPlxuXHR7XG5cdFx0LyoqXG5cdFx0ICogTW92ZXMgYSBzZWN0aW9uIG9mIHRoaXMgYXJyYXkgaWRlbnRpZmllZCBieSBzdGFydCBhbmQgZW5kIHRvXG5cdFx0ICogdG8gYW5vdGhlciBsb2NhdGlvbiB3aXRoaW4gdGhpcyBhcnJheSwgc3RhcnRpbmcgYXQgdGhlIHNwZWNpZmllZFxuXHRcdCAqIHRhcmdldCBwb3NpdGlvbi5cblx0XHQgKiBcblx0XHQgKiBAcGFyYW0gdGFyZ2V0IElmIHRhcmdldCBpcyBuZWdhdGl2ZSwgaXQgaXMgdHJlYXRlZCBhcyBsZW5ndGgrdGFyZ2V0IHdoZXJlIGxlbmd0aCBpcyB0aGVcblx0XHQgKiBsZW5ndGggb2YgdGhlIGFycmF5LlxuXHRcdCAqIEBwYXJhbSBzdGFydCBJZiBzdGFydCBpcyBuZWdhdGl2ZSwgaXQgaXMgdHJlYXRlZCBhcyBsZW5ndGgrc3RhcnQuIElmIGVuZCBpcyBuZWdhdGl2ZSwgaXRcblx0XHQgKiBpcyB0cmVhdGVkIGFzIGxlbmd0aCtlbmQuXG5cdFx0ICogQHBhcmFtIGVuZCBJZiBub3Qgc3BlY2lmaWVkLCBsZW5ndGggb2YgdGhlIHRoaXMgb2JqZWN0IGlzIHVzZWQgYXMgaXRzIGRlZmF1bHQgdmFsdWUuXG5cdFx0ICovXG5cdFx0bW92ZVdpdGhpbih0YXJnZXQ6IG51bWJlciwgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpOiB0aGlzO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdldHMgb3Igc2V0cyB0aGUgbGVuZ3RoIG9mIHRoZSBhcnJheS4gVGhpcyBpcyBhIG51bWJlciBvbmUgaGlnaGVyIFxuXHRcdCAqIHRoYW4gdGhlIGhpZ2hlc3QgZWxlbWVudCBkZWZpbmVkIGluIGFuIGFycmF5LlxuXHRcdCAqL1xuXHRcdGxlbmd0aDogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEFwcGVuZHMgbmV3IGVsZW1lbnRzIHRvIGFuIGFycmF5LCBhbmQgcmV0dXJucyB0aGUgbmV3IGxlbmd0aCBvZiB0aGUgYXJyYXkuXG5cdCAgICAgICAqIEBwYXJhbSBjaGlsZHJlbiBOZXcgZWxlbWVudHMgb2YgdGhlIEFycmF5LlxuXHRcdCAqL1xuXHRcdHB1c2goLi4uY2hpbGRyZW46IE1ldGFbXSk6IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZW1vdmVzIHRoZSBsYXN0IGVsZW1lbnQgZnJvbSBhbiBhcnJheSBhbmQgcmV0dXJucyBpdC5cblx0XHQgKi9cblx0XHRwb3AoKTogTWV0YSB8IHVuZGVmaW5lZDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZW1vdmVzIHRoZSBmaXJzdCBlbGVtZW50IGZyb20gYW4gYXJyYXkgYW5kIHJldHVybnMgaXQuXG5cdFx0ICovXG5cdFx0c2hpZnQoKTogTWV0YSB8IHVuZGVmaW5lZDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBJbnNlcnRzIG5ldyBlbGVtZW50cyBhdCB0aGUgc3RhcnQgb2YgYW4gYXJyYXkuXG5cdFx0ICogQHBhcmFtIGNoaWxkcmVuICBFbGVtZW50cyB0byBpbnNlcnQgYXQgdGhlIHN0YXJ0IG9mIHRoZSBhcnJheS5cblx0XHQgKi9cblx0XHR1bnNoaWZ0KC4uLmNoaWxkcmVuOiBNZXRhW10pOiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmV2ZXJzZXMgdGhlIGVsZW1lbnRzIGluIHRoZSBhcnJheS5cblx0XHQgKi9cblx0XHRyZXZlcnNlKCk6IHRoaXM7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyBhIHNlY3Rpb24gb2YgYW4gYXJyYXkuXG5cdFx0ICogQHBhcmFtIHN0YXJ0IFRoZSBiZWdpbm5pbmcgb2YgdGhlIHNwZWNpZmllZCBwb3J0aW9uIG9mIHRoZSBhcnJheS5cblx0XHQgKiBAcGFyYW0gZW5kIFRoZSBlbmQgb2YgdGhlIHNwZWNpZmllZCBwb3J0aW9uIG9mIHRoZSBhcnJheS5cblx0XHQgKi9cblx0XHRzbGljZShzdGFydD86IG51bWJlciwgZW5kPzogbnVtYmVyKTogTWV0YUFycmF5PFQ+O1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlbW92ZXMgZWxlbWVudHMgZnJvbSBhbiBhcnJheSBhbmQsIGlmIG5lY2Vzc2FyeSwgaW5zZXJ0cyBuZXcgZWxlbWVudHMgaW4gdGhlaXJcblx0XHQgKiBwbGFjZSwgcmV0dXJuaW5nIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuXHRcdCAqIEBwYXJhbSBzdGFydCBUaGUgemVyby1iYXNlZCBsb2NhdGlvbiBpbiB0aGUgYXJyYXkgZnJvbSB3aGljaCB0byBzdGFydCByZW1vdmluZyBlbGVtZW50cy5cblx0XHQgKiBAcGFyYW0gZGVsZXRlQ291bnQgVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZW1vdmUuXG5cdFx0ICovXG5cdFx0c3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50PzogbnVtYmVyKTogTWV0YVtdO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlbW92ZXMgZWxlbWVudHMgZnJvbSBhbiBhcnJheSBhbmQsIGlmIG5lY2Vzc2FyeSwgaW5zZXJ0cyBuZXcgZWxlbWVudHMgaW4gdGhlaXIgcGxhY2UsXG5cdFx0ICogcmV0dXJuaW5nIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuXHRcdCAqIEBwYXJhbSBzdGFydCBUaGUgemVyby1iYXNlZCBsb2NhdGlvbiBpbiB0aGUgYXJyYXkgZnJvbSB3aGljaCB0byBzdGFydCByZW1vdmluZyBlbGVtZW50cy5cblx0XHQgKiBAcGFyYW0gZGVsZXRlQ291bnQgVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZW1vdmUuXG5cdFx0ICogQHBhcmFtIGl0ZW1zIEVsZW1lbnRzIHRvIGluc2VydCBpbnRvIHRoZSBhcnJheSBpbiBwbGFjZSBvZiB0aGUgZGVsZXRlZCBlbGVtZW50cy5cblx0XHQgKi9cblx0XHRzcGxpY2Uoc3RhcnQ6IG51bWJlciwgZGVsZXRlQ291bnQ/OiBudW1iZXIsIC4uLml0ZW1zOiBNZXRhW10pOiBNZXRhW107XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU29ydHMgYW4gYXJyYXkuXG5cdFx0ICogQHBhcmFtIGNvbXBhcmVGbiBUaGUgbmFtZSBvZiB0aGUgZnVuY3Rpb24gdXNlZCB0byBkZXRlcm1pbmUgdGhlXG5cdFx0ICogb3JkZXIgb2YgdGhlIGVsZW1lbnRzLiBJZiBvbWl0dGVkLCB0aGUgZWxlbWVudHMgYXJlIHNvcnRlZCBpbiBhc2NlbmRpbmcsIFxuXHRcdCAqIEFTQ0lJIGNoYXJhY3RlciBvcmRlci5cblx0XHQgKi9cblx0XHRzb3J0PFQ+KHJlZmVyZW5jZTogVFtdLCBjb21wYXJlRm46IChhOiBULCBiOiBUKSA9PiBudW1iZXIpOiB0aGlzO1xuXHRcdHNvcnQ8VD4ocmVmZXJlbmNlOiBUW10pOiB0aGlzO1xuXHRcdHNvcnQ8VD4oY29tcGFyZUZuOiAoYTogTWV0YSwgYjogTWV0YSkgPT4gbnVtYmVyKTogdGhpcztcblx0XHRcblx0XHQvKipcblx0ICAgICAgICogUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYSB2YWx1ZSBpbiBhbiBhcnJheS5cblx0ICAgICAgICogQHBhcmFtIHNlYXJjaE1ldGEgVGhlIHZhbHVlIHRvIGxvY2F0ZSBpbiB0aGUgYXJyYXkuXG5cdCAgICAgICAqIEBwYXJhbSBmcm9tSW5kZXggVGhlIGFycmF5IGluZGV4IGF0IHdoaWNoIHRvIGJlZ2luIHRoZSBzZWFyY2guIFxuXHRcdCAqIElmIGZyb21JbmRleCBpcyBvbWl0dGVkLCB0aGUgc2VhcmNoIHN0YXJ0cyBhdCBpbmRleCAwLlxuXHQgICAgICAgKi9cblx0XHRpbmRleE9mKHNlYXJjaE1ldGE6IE1ldGEsIGZyb21JbmRleD86IG51bWJlcik6IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0ICAgICAgICogUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGxhc3Qgb2NjdXJyZW5jZSBvZiBhIHNwZWNpZmllZCB2YWx1ZSBpbiBhbiBhcnJheS5cblx0ICAgICAgICogQHBhcmFtIHNlYXJjaE1ldGEgVGhlIHZhbHVlIHRvIGxvY2F0ZSBpbiB0aGUgYXJyYXkuXG5cdCAgICAgICAqIEBwYXJhbSBmcm9tSW5kZXggVGhlIGFycmF5IGluZGV4IGF0IHdoaWNoIHRvIGJlZ2luIHRoZSBzZWFyY2guIFxuXHRcdCAqIElmIGZyb21JbmRleCBpcyBvbWl0dGVkLCB0aGUgc2VhcmNoIHN0YXJ0cyBhdCB0aGUgbGFzdCBpbmRleCBpbiB0aGUgYXJyYXkuXG5cdCAgICAgICAqL1xuXHRcdGxhc3RJbmRleE9mKHNlYXJjaE1ldGE6IE1ldGEsIGZyb21JbmRleD86IG51bWJlcik6IG51bWJlcjtcblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0Y29uc3QgY2FsbGJhY2tzOiAoKCkgPT4gdm9pZClbXSA9IFtdO1xuXHRcblx0LyoqXG5cdCAqIFN0b3JlcyB0aGUgbnVtYmVyIG9mIG91dHN0YW5kaW5nIGFzeW5jaHJvbm91cyBvcGVyYXRpb25zXG5cdCAqIGFyZSB3YWl0aW5nIHRvIGJlIGNvbXBsZXRlZCwgc28gdGhhdCB0aGUgcmVhZHkgc3RhdGUgY2FsbGJhY2tzXG5cdCAqIGNhbiBiZSB0cmlnZ2VyZWQuXG5cdCAqL1xuXHRsZXQgb3V0c3RhbmRpbmcgPSAwO1xuXHRcblx0ZXhwb3J0IGNvbnN0IFJlYWR5U3RhdGUgPVxuXHR7XG5cdFx0LyoqXG5cdFx0ICogQWRkcyB0aGUgc3BlY2lmaWVkIGZ1bmN0aW9uIHRvIHRoZSBsaXN0IG9mIGNhbGxiYWNrcyB0byBpbnZva2Vcblx0XHQgKiB3aGVuIGFsbCBvdXRzdGFuZGluZyBhc3luY2hyb25vdXMgb3BlcmF0aW9ucyBoYXZlIGNvbXBsZXRlZC5cblx0XHQgKiBJbiB0aGUgY2FzZSB3aGVuIHRoZXJlIGFyZSBubyBvdXRzdGFuZGluZyBjYWxsYmFja3MsIHRoZSBmdW5jdGlvblxuXHRcdCAqIGlzIGNhbGxlZCBpbW1lZGlhdGVseS5cblx0XHQgKi9cblx0XHRhd2FpdChjYWxsYmFjazogKCkgPT4gdm9pZClcblx0XHR7XG5cdFx0XHRpZiAob3V0c3RhbmRpbmcgPCAxKVxuXHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRjYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG5cdFx0fSxcblx0XHRcblx0XHQvKiogSW5jcmVtZW50IHRoZSByZWFkeSBzdGF0ZS4gKi9cblx0XHRpbmMoKVxuXHRcdHtcblx0XHRcdG91dHN0YW5kaW5nKys7XG5cdFx0fSxcblx0XHRcblx0XHQvKiogRGVjcmVtZW50IHRoZSByZWFkeSBzdGF0ZS4gKi9cblx0XHRkZWMoKVxuXHRcdHtcblx0XHRcdG91dHN0YW5kaW5nLS07XG5cdFx0XHRpZiAob3V0c3RhbmRpbmcgPCAwKVxuXHRcdFx0XHRvdXRzdGFuZGluZyA9IDA7XG5cdFx0XHRcblx0XHRcdGlmIChvdXRzdGFuZGluZyA9PT0gMClcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgZm5zID0gY2FsbGJhY2tzLnNsaWNlKCk7XG5cdFx0XHRcdGNhbGxiYWNrcy5sZW5ndGggPSAwO1xuXHRcdFx0XHRcblx0XHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCBmbnMubGVuZ3RoOylcblx0XHRcdFx0XHRmbnNbaV0oKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXhcbntcblx0Y29uc3QgYXV0b3J1bkNhY2hlID0gbmV3IFdlYWtNYXA8UmVjdXJyZW50LCBhbnlbXT4oKTtcblx0XG5cdC8qKlxuXHQgKiBNYW5hZ2VzIHRoZSByZXNwb25zaWJpbGl0aWVzIG9mIGEgc2luZ2xlIGNhbGwgdG8gb24oKSBvciBvbmx5KCkuXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgUmVjdXJyZW50PFRSdW5BcmdzIGV4dGVuZHMgYW55W10gPSBhbnlbXT5cblx0e1xuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cmVhZG9ubHkga2luZDogQ29yZS5SZWN1cnJlbnRLaW5kLFxuXHRcdFx0cmVhZG9ubHkgc2VsZWN0b3I6IGFueSxcblx0XHRcdHJlYWRvbmx5IHVzZXJDYWxsYmFjazogUmVjdXJyZW50Q2FsbGJhY2s8QXRvbT4sXG5cdFx0XHRyZWFkb25seSB1c2VyUmVzdEFyZ3M6IGFueVtdID0gW10pXG5cdFx0e1xuXHRcdFx0Ly8gSW4gdGhlIGNhc2Ugd2hlbiB0aGUgZmlyc3QgYXJndW1lbnQgcGFzc2VkIHRvIHRoZVxuXHRcdFx0Ly8gcmVjdXJyZW50IGZ1bmN0aW9uIGlzbid0IGEgdmFsaWQgc2VsZWN0b3IsIHRoZSBwYXJhbWV0ZXJzXG5cdFx0XHQvLyBhcmUgc2hpZnRlZCBiYWNrd2FyZHMuIFRoaXMgaXMgdG8gaGFuZGxlIHRoZSBvbigpIGNhbGxzXG5cdFx0XHQvLyB0aGF0IGFyZSB1c2VkIHRvIHN1cHBvcnQgcmVzdG9yYXRpb25zLlxuXHRcdFx0aWYgKHR5cGVvZiBzZWxlY3RvciA9PT0gXCJmdW5jdGlvblwiICYmICFpc0ZvcmNlKHNlbGVjdG9yKSlcblx0XHRcdHtcblx0XHRcdFx0dXNlclJlc3RBcmdzLnVuc2hpZnQodXNlckNhbGxiYWNrKTtcblx0XHRcdFx0dGhpcy51c2VyQ2FsbGJhY2sgPSBzZWxlY3Rvcjtcblx0XHRcdFx0dGhpcy5zZWxlY3RvciA9IFwiXCI7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdHJ1biguLi5jYWxsYmFja0FyZ3VtZW50czogVFJ1bkFyZ3MpXG5cdFx0e1xuXHRcdFx0YXV0b3J1bkNhY2hlLnNldCh0aGlzLCBjYWxsYmFja0FyZ3VtZW50cyk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqIFByZXZlbnQgc3RydWN0dXJhbCB0eXBlIGNvbXBhdGliaWxpdGllcy4gKi9cblx0XHRwcml2YXRlIHJlY3VycmVudE5vbWluYWw6IHVuZGVmaW5lZDtcblx0fVxuXHRcblx0ZXhwb3J0IG5hbWVzcGFjZSBDb3JlXG5cdHtcblx0XHQvKipcblx0XHQgKiBAaW50ZXJuYWxcblx0XHQgKiBBIGNsYXNzIHRoYXQgZGVhbHMgd2l0aCB0aGUgc3BlY2lhbCBjYXNlIG9mIGEgRm9yY2UgdGhhdFxuXHRcdCAqIHdhcyBwbHVnZ2VkIGludG8gYW4gYXR0cmlidXRlLlxuXHRcdCAqL1xuXHRcdGV4cG9ydCBjbGFzcyBBdHRyaWJ1dGVSZWN1cnJlbnQgZXh0ZW5kcyBSZWN1cnJlbnRcblx0XHR7XG5cdFx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdFx0YXR0cmlidXRlS2V5OiBzdHJpbmcsXG5cdFx0XHRcdGZvcmNlOiBTdGF0ZWZ1bEZvcmNlKVxuXHRcdFx0e1xuXHRcdFx0XHRzdXBlcihcblx0XHRcdFx0XHRSZWN1cnJlbnRLaW5kLm9uLCBcdFxuXHRcdFx0XHRcdGZvcmNlLFxuXHRcdFx0XHRcdCgobm93OiBhbnkpID0+IG5ldyBBdHRyaWJ1dGVNZXRhKGF0dHJpYnV0ZUtleSwgbm93KSkpO1xuXHRcdFx0XHRcblx0XHRcdFx0YXV0b3J1bkNhY2hlLnNldCh0aGlzLCBbXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEBpbnRlcm5hbFxuXHRcdCAqIEV4dHJhY3RzIHRoZSBhdXRvcnVuIGFyZ3VtZW50cyBmcm9tIHRoZSBpbnRlcm5hbCBjYWNoZS5cblx0XHQgKiBDYW4gb25seSBiZSBleGVjdXRlZCBvbmNlLlxuXHRcdCAqL1xuXHRcdGV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QXV0b3J1bkFyZ3VtZW50cyhyZWN1cnJlbnQ6IFJlY3VycmVudClcblx0XHR7XG5cdFx0XHRjb25zdCBhcmdzID0gYXV0b3J1bkNhY2hlLmdldChyZWN1cnJlbnQpIHx8IG51bGw7XG5cdFx0XHRpZiAoYXJncylcblx0XHRcdFx0YXV0b3J1bkNhY2hlLmRlbGV0ZShyZWN1cnJlbnQpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gYXJncztcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0ZXhwb3J0IGNvbnN0IGVudW0gUmVjdXJyZW50S2luZFxuXHRcdHtcblx0XHRcdG9uLFxuXHRcdFx0b25jZSxcblx0XHRcdG9ubHlcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBAaW50ZXJuYWxcblx0ICogQSBjbGFzcyB0aGF0IHNpdHMgYmV0d2VlbiB0aGUgc3BlY2lmaWMgUmVmbGV4aXZlIGxpYnJhcnksIFxuXHQgKiBhbmQgdGhlIExpYnJhcnkgY2xhc3MgYXMgZGVmaW5lZCBpbiB0aGUgUmVmbGV4IENvcmUuIFRoZVxuXHQgKiBwdXJwb3NlIG9mIHRoaXMgY2xhc3MgaXMgdG8gb3ZlcnJpZGUgYWxsIHRoZSBtZXRob2RzLCBhbmRcblx0ICogZGV0ZXJtaW5lIHRoZSBzcGVjaWZpYyBsaWJyYXJ5IHRvIHJvdXRlIGVhY2ggY2FsbCB0byB0aGUgXG5cdCAqIGFic3RyYWN0IG1ldGhvZHMuIEl0IG9wZXJhdGVzIGJ5IGxvb2tpbmcgYXQgdGhlIGNvbnN0cnVjdG9yXG5cdCAqIGZ1bmN0aW9uIG9mIHRoZSBCcmFuY2ggb2JqZWN0IHByb3ZpZGVkIHRvIGFsbCB0aGUgbWV0aG9kcyxcblx0ICogYW5kIHRoZW4gdXNpbmcgdGhpcyB0byBkZXRlcm1pbmUgd2hhdCBsaWJyYXJ5IGlzIHJlc3BvbnNpYmxlXG5cdCAqIGZvciBvYmplY3RzIG9mIHRoaXMgdHlwZS5cblx0ICovXG5cdGV4cG9ydCBjbGFzcyBSb3V0aW5nTGlicmFyeSBpbXBsZW1lbnRzIElMaWJyYXJ5XG5cdHtcblx0XHQvKipcblx0XHQgKiBTaW5nbGV0b24gYWNjZXNzb3IgcHJvcGVydHkuXG5cdFx0ICovXG5cdFx0c3RhdGljIGdldCB0aGlzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5fdGhpcyA9PT0gbnVsbCA/XG5cdFx0XHRcdHRoaXMuX3RoaXMgPSBuZXcgUm91dGluZ0xpYnJhcnkoKSA6XG5cdFx0XHRcdHRoaXMuX3RoaXM7XG5cdFx0fVxuXHRcdHByaXZhdGUgc3RhdGljIF90aGlzOiBSb3V0aW5nTGlicmFyeSB8IG51bGwgPSBudWxsO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEFkZHMgYSByZWZlcmVuY2UgdG8gYSBSZWZsZXhpdmUgbGlicmFyeSwgd2hpY2ggbWF5IGJlXG5cdFx0ICogY2FsbGVkIHVwb24gaW4gdGhlIGZ1dHVyZS5cblx0XHQgKi9cblx0XHRzdGF0aWMgYWRkTGlicmFyeShsaWJyYXJ5OiBJTGlicmFyeSlcblx0XHR7XG5cdFx0XHR0aGlzLmxpYnJhcmllcy5wdXNoKGxpYnJhcnkpO1xuXHRcdH1cblx0XHRwcml2YXRlIHN0YXRpYyByZWFkb25seSBsaWJyYXJpZXM6IElMaWJyYXJ5W10gPSBbXTtcblx0XHRcblx0XHRwcml2YXRlIGNvbnN0cnVjdG9yKCkgeyB9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQ29uZGl0aW9uYWxseSBleGVjdXRlcyB0aGUgc3BlY2lmaWVkIGxpYnJhcnkgZnVuY3Rpb24sXG5cdFx0ICogaW4gdGhlIGNhc2Ugd2hlbiBpdCdzIGRlZmluZWQuXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSByb3V0ZTxGIGV4dGVuZHMgKC4uLmFyZ3M6IGFueVtdKSA9PiBSLCBSPihcblx0XHRcdHJlZmVyZW5jZUJyYW5jaDogSUJyYW5jaCxcblx0XHRcdGdldEZuOiAobGlicmFyeTogSUxpYnJhcnkpID0+IEYgfCB1bmRlZmluZWQsXG5cdFx0XHRjYWxsRm46IChmbjogRiwgdGhpc0FyZzogSUxpYnJhcnkpID0+IFIsXG5cdFx0XHRkZWZhdWx0VmFsdWU/OiBhbnkpOiBSXG5cdFx0e1xuXHRcdFx0aWYgKHJlZmVyZW5jZUJyYW5jaClcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgbGlicyA9IFJvdXRpbmdMaWJyYXJ5LmxpYnJhcmllcztcblx0XHRcdFx0XG5cdFx0XHRcdC8vIEl0J3MgaW1wb3J0YW50IHRoYXQgdGVzdCBmb3IgYXNzb2NpYXRpdml0eSBiZXR3ZWVuIGFcblx0XHRcdFx0Ly8gYnJhbmNoIGFuZCBhIGxpYnJhcnkgaXMgZG9uZSBpbiByZXZlcnNlIG9yZGVyLCBpbiBvcmRlclxuXHRcdFx0XHQvLyB0byBzdXBwb3J0IHRoZSBjYXNlIG9mIFJlZmxleGl2ZSBsaWJyYXJpZXMgYmVpbmcgbGF5ZXJlZFxuXHRcdFx0XHQvLyBvbiB0b3Agb2YgZWFjaCBvdGhlci4gSWYgUmVmbGV4aXZlIGxpYnJhcnkgQSBpcyBsYXllcmVkIG9uXG5cdFx0XHRcdC8vIFJlZmxleGl2ZSBsaWJyYXJ5IEIsIEEgd2lsbCBiZSBhZGRlZCB0byB0aGUgbGlicmFyaWVzIGFycmF5XG5cdFx0XHRcdC8vIGJlZm9yZSBCLiBUaGUgbGlicmFyaWVzIGFycmF5IHRoZXJlZm9yZSBoYXMgYW4gaW1wbGljaXRcblx0XHRcdFx0Ly8gdG9wb2xvZ2ljYWwgc29ydC4gSXRlcmF0aW5nIGJhY2t3YXJkcyBlbnN1cmVzIHRoYXQgdGhlXG5cdFx0XHRcdC8vIGhpZ2hlci1sZXZlbCBsaWJyYXJpZXMgYXJlIHRlc3RlZCBiZWZvcmUgdGhlIGxvd2VyLWxldmVsIG9uZXMuXG5cdFx0XHRcdC8vIFRoaXMgaXMgY3JpdGljYWwsIGJlY2F1c2UgYSBoaWdoZXItbGV2ZWwgbGlicmFyeSBtYXkgb3BlcmF0ZVxuXHRcdFx0XHQvLyBvbiB0aGUgc2FtZSBicmFuY2ggdHlwZXMgYXMgdGhlIGxvd2VyLWxldmVsIGxpYnJhcmllcyB0aGF0XG5cdFx0XHRcdC8vIGl0J3MgYWJzdHJhY3RpbmcuXG5cdFx0XHRcdGZvciAobGV0IGkgPSBsaWJzLmxlbmd0aDsgaS0tID4gMDspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBsaWIgPSBsaWJzW2ldO1xuXHRcdFx0XHRcdGlmIChsaWIuaXNLbm93bkJyYW5jaChyZWZlcmVuY2VCcmFuY2gpKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGNvbnN0IGxpYkZuID0gZ2V0Rm4obGliKTtcblx0XHRcdFx0XHRcdHJldHVybiB0eXBlb2YgbGliRm4gPT09IFwiZnVuY3Rpb25cIiA/XG5cdFx0XHRcdFx0XHRcdGNhbGxGbihsaWJGbiwgbGliKSA6XG5cdFx0XHRcdFx0XHRcdGRlZmF1bHRWYWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBicmFuY2ggdHlwZS5cIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGlzS25vd25CcmFuY2goYnJhbmNoOiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdGxpYiA9PiBsaWIuaXNLbm93bkJyYW5jaCxcblx0XHRcdFx0KGZuLCBsaWIpID0+IGZuLmNhbGwobGliLCBicmFuY2gpLFxuXHRcdFx0XHRmYWxzZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgbWF5IGltcGxlbWVudCB0aGlzIG1ldGhvZCBpbiBvcmRlciB0byBwcm92aWRlXG5cdFx0ICogdGhlIHN5c3RlbSB3aXRoIGtub3dsZWRnZSBvZiB3aGV0aGVyIGEgYnJhbmNoIGhhcyBiZWVuIGRpc3Bvc2VkLFxuXHRcdCAqIHdoaWNoIGl0IHVzZXMgZm9yIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvbnMuIElmIHRoZSBsaWJyYXJ5IGhhcyBub1xuXHRcdCAqIG1lYW5zIG9mIGRvaW5nIHRoaXMsIGl0IG1heSByZXR1cm4gXCJudWxsXCIuXG5cdFx0ICovXG5cdFx0aXNCcmFuY2hEaXNwb3NlZChicmFuY2g6IElCcmFuY2gpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucm91dGUoXG5cdFx0XHRcdGJyYW5jaCxcblx0XHRcdFx0bGliID0+IGxpYi5pc0JyYW5jaERpc3Bvc2VkLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGJyYW5jaCksXG5cdFx0XHRcdGZhbHNlKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyB0aGF0IHN1cHBvcnQgaW5saW5lIHRhcmdldCtjaGlsZHJlbiBjbG9zdXJlc1xuXHRcdCAqIG11c3QgcHJvdmlkZSBhbiBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBtZXRob2QuXG5cdFx0ICovXG5cdFx0Z2V0Q2hpbGRyZW4odGFyZ2V0OiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnJvdXRlKFxuXHRcdFx0XHR0YXJnZXQsXG5cdFx0XHRcdGxpYiA9PiBsaWIuZ2V0Q2hpbGRyZW4sXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgdGFyZ2V0KSxcblx0XHRcdFx0W10pO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRnZXRMZWFmKGxlYWY6IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5yb3V0ZShcblx0XHRcdFx0bGVhZixcblx0XHRcdFx0bGliID0+IGxpYi5nZXRMZWFmLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGxlYWYpLFxuXHRcdFx0XHRudWxsKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0YXR0YWNoQXRvbShcblx0XHRcdGF0b206IGFueSxcblx0XHRcdGJyYW5jaDogSUJyYW5jaCxcblx0XHRcdHJlZjogUmVmKVxuXHRcdHtcblx0XHRcdHRoaXMucm91dGUoXG5cdFx0XHRcdGJyYW5jaCxcblx0XHRcdFx0bGliID0+IGxpYi5hdHRhY2hBdG9tLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGF0b20sIGJyYW5jaCwgcmVmKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGRldGFjaEF0b20oYXRvbTogYW55LCBicmFuY2g6IElCcmFuY2gpXG5cdFx0e1xuXHRcdFx0dGhpcy5yb3V0ZShcblx0XHRcdFx0YnJhbmNoLFxuXHRcdFx0XHRsaWIgPT4gbGliLmRldGFjaEF0b20sXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYXRvbSwgYnJhbmNoKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICovXG5cdFx0c3dhcEJyYW5jaGVzKGJyYW5jaDE6IElCcmFuY2gsIGJyYW5jaDI6IElCcmFuY2gpXG5cdFx0e1xuXHRcdFx0dGhpcy5yb3V0ZShcblx0XHRcdFx0YnJhbmNoMSxcblx0XHRcdFx0bGliID0+IGxpYi5zd2FwQnJhbmNoZXMsXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYnJhbmNoMSwgYnJhbmNoMikpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKlxuXHRcdCAqL1xuXHRcdHJlcGxhY2VCcmFuY2goYnJhbmNoMTogSUJyYW5jaCwgYnJhbmNoMjogSUJyYW5jaClcblx0XHR7XG5cdFx0XHR0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gxLFxuXHRcdFx0XHRsaWIgPT4gbGliLnJlcGxhY2VCcmFuY2gsXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYnJhbmNoMSwgYnJhbmNoMikpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRhdHRhY2hBdHRyaWJ1dGUoYnJhbmNoOiBJQnJhbmNoLCBrZXk6IHN0cmluZywgdmFsdWU6IGFueSlcblx0XHR7XG5cdFx0XHR0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdGxpYiA9PiBsaWIuYXR0YWNoQXR0cmlidXRlLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGJyYW5jaCwga2V5LCB2YWx1ZSkpO1xuXHRcdH1cblx0XHRcdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0ZGV0YWNoQXR0cmlidXRlKGJyYW5jaDogSUJyYW5jaCwga2V5OiBzdHJpbmcpXG5cdFx0e1xuXHRcdFx0dGhpcy5yb3V0ZShcblx0XHRcdFx0YnJhbmNoLFxuXHRcdFx0XHRsaWIgPT4gbGliLmRldGFjaEF0dHJpYnV0ZSxcblx0XHRcdFx0KGZuLCBsaWIpID0+IGZuLmNhbGwobGliLCBicmFuY2gsIGtleSkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIHRoYXQgY29udHJpYnV0ZSB0byB0aGUgZ2xvYmFsIG9uKCkgZnVuY3Rpb25cblx0XHQgKiBtdXN0IHByb3ZpZGUgYW4gaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgbWV0aG9kLlxuXHRcdCAqIFxuXHRcdCAqIExpYnJhcmllcyBtdXN0IGltcGxlbWVudCB0aGlzIGZ1bmN0aW9uIGluIG9yZGVyIHRvIHByb3ZpZGUgdGhlaXIgb3duXG5cdFx0ICogaG9va3MgaW50byB0aGUgZ2xvYmFsIHJlY3VycmVudCBmdW5jdGlvbnMgKHN1Y2ggYXMgb24oKSwgb25seSgpIGFuZCBvbmNlKCkpLlxuXHRcdCAqIFxuXHRcdCAqIElmIHRoZSBsaWJyYXJ5IGRvZXMgbm90IHJlY29nbml6ZSB0aGUgc2VsZWN0b3IgcHJvdmlkZWQsIGl0IHNob3VsZFxuXHRcdCAqIHJldHVybiBmYWxzZSwgc28gdGhhdCB0aGUgUmVmbGV4IGVuZ2luZSBjYW4gZmluZCBhbm90aGVyIHBsYWNlIHRvXG5cdFx0ICogcGVyZm9ybSB0aGUgYXR0YWNobWVudC4gSW4gb3RoZXIgY2FzZXMsIGl0IHNob3VsZCByZXR1cm4gdHJ1ZS5cblx0XHQgKi9cblx0XHRhdHRhY2hSZWN1cnJlbnQoXG5cdFx0XHRraW5kOiBSZWN1cnJlbnRLaW5kLFxuXHRcdFx0dGFyZ2V0OiBJQnJhbmNoLFxuXHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdGNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9tPixcblx0XHRcdHJlc3Q6IGFueVtdKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnJvdXRlKFxuXHRcdFx0XHR0YXJnZXQsXG5cdFx0XHRcdGxpYiA9PiBsaWIuYXR0YWNoUmVjdXJyZW50LFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGtpbmQsIHRhcmdldCwgc2VsZWN0b3IsIGNhbGxiYWNrLCByZXN0KSxcblx0XHRcdFx0ZmFsc2UpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIHRoYXQgY29udHJpYnV0ZSB0byB0aGUgZ2xvYmFsIG9mZigpIGZ1bmN0aW9uXG5cdFx0ICogbXVzdCBwcm92aWRlIGFuIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIG1ldGhvZC5cblx0XHQgKi9cblx0XHRkZXRhY2hSZWN1cnJlbnQoXG5cdFx0XHRicmFuY2g6IElCcmFuY2gsXG5cdFx0XHRzZWxlY3RvcjogYW55LFxuXHRcdFx0Y2FsbGJhY2s6IFJlY3VycmVudENhbGxiYWNrPEF0b20+KVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdGxpYiA9PiBsaWIuZGV0YWNoUmVjdXJyZW50LFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGJyYW5jaCwgc2VsZWN0b3IsIGNhbGxiYWNrKSxcblx0XHRcdFx0ZmFsc2UpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIGNhbiBpbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiBpbiBvcmRlclxuXHRcdCAqIHRvIGNhcHR1cmUgdGhlIGZsb3cgb2YgYnJhbmNoZXMgYmVpbmcgcGFzc2VkIGFzXG5cdFx0ICogYXRvbXMgdG8gb3RoZXIgYnJhbmNoIGZ1bmN0aW9ucy5cblx0XHQgKi9cblx0XHRoYW5kbGVCcmFuY2hGdW5jdGlvbihcblx0XHRcdGJyYW5jaDogSUJyYW5jaCxcblx0XHRcdGJyYW5jaEZuOiAoLi4uYXRvbXM6IGFueVtdKSA9PiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdGxpYiA9PiBsaWIuaGFuZGxlQnJhbmNoRnVuY3Rpb24sXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYnJhbmNoLCBicmFuY2hGbikpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIGNhbiBpbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiBpbiBvcmRlciB0byBwcm9jZXNzXG5cdFx0ICogYSBicmFuY2ggYmVmb3JlIGl0J3MgcmV0dXJuZWQgZnJvbSBhIGJyYW5jaCBmdW5jdGlvbi4gV2hlbiB0aGlzXG5cdFx0ICogZnVuY3Rpb24gaXMgaW1wbGVtZW50ZWQsIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGJyYW5jaCBmdW5jdGlvbnNcblx0XHQgKiBhcmUgcmVwbGFjZWQgd2l0aCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoaXMgZnVuY3Rpb24uIFJlZmxleGl2ZSBsaWJyYXJpZXNcblx0XHQgKiB0aGF0IHJlcXVpcmUgdGhlIHN0YW5kYXJkIGJlaGF2aW9yIG9mIHJldHVybmluZyBicmFuY2hlcyBmcm9tIHRoZVxuXHRcdCAqIGJyYW5jaCBmdW5jdGlvbnMgc2hvdWxkIHJldHVybiB0aGUgYGJyYW5jaGAgYXJndW1lbnQgdG8gdGhpcyBmdW5jdGlvblxuXHRcdCAqIHZlcmJhdGltLlxuXHRcdCAqL1xuXHRcdHJldHVybkJyYW5jaChicmFuY2g6IElCcmFuY2gpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucm91dGUoXG5cdFx0XHRcdGJyYW5jaCxcblx0XHRcdFx0bGliID0+IGxpYi5yZXR1cm5CcmFuY2gsXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYnJhbmNoKSxcblx0XHRcdFx0YnJhbmNoKVxuXHRcdH1cblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4XG57XG5cdC8qKlxuXHQgKiBBIGNsYXNzIHRoYXQgd3JhcHMgYSB2YWx1ZSB3aG9zZSBjaGFuZ2VzIGNhbiBiZSBvYnNlcnZlZC5cblx0ICovXG5cdGV4cG9ydCBjbGFzcyBTdGF0ZWZ1bEZvcmNlPFQgPSBhbnk+XG5cdHtcblx0XHRjb25zdHJ1Y3Rvcih2YWx1ZTogVClcblx0XHR7XG5cdFx0XHR0aGlzLl92YWx1ZSA9IHZhbHVlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogXG5cdFx0ICogR2V0cyBvciBzZXRzIHRoZSB2YWx1ZSBvZiB0aGUgZm9yY2UuXG5cdFx0ICovXG5cdFx0Z2V0IHZhbHVlKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5fdmFsdWU7XG5cdFx0fVxuXHRcdHNldCB2YWx1ZSh2YWx1ZTogVClcblx0XHR7XG5cdFx0XHRjb25zdCB3YXMgPSB0aGlzLl92YWx1ZTtcblx0XHRcdHRoaXMuX3ZhbHVlID0gdmFsdWU7XG5cdFx0XHRcblx0XHRcdGlmICh3YXMgIT09IHRoaXMuX3ZhbHVlKVxuXHRcdFx0XHR0aGlzLmNoYW5nZWQodmFsdWUsIHdhcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiBAaW50ZXJuYWwgKi9cblx0XHRwcml2YXRlIF92YWx1ZTogYW55O1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFNldHMgdGhlIHZhbHVlIG9mIHRoZSBmb3JjZSBhbmQgcmV0dXJucyB2b2lkLlxuXHRcdCAqIChVc2VmdWwgZm9yIGZvcmNlIGFyZ3VtZW50cyBpbiBhcnJvdyBmdW5jdGlvbnMgdG8gY2FuY2VsIHRoZSByZXR1cm4gdmFsdWUuKVxuXHRcdCAqL1xuXHRcdHNldCh2YWx1ZTogVClcblx0XHR7XG5cdFx0XHR0aGlzLnZhbHVlID0gdmFsdWU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEBpbnRlcm5hbFxuXHRcdCAqIEl0J3MgaW1wb3J0YW50IHRoYXQgdGhpcyBpcyBhbiBhc3NpZ25tZW50IHJhdGhlciB0aGFuIGEgZnVuY3Rpb24sXG5cdFx0ICogYmVjYXVzZSB0aGUgZXZlbnQgbmVlZHMgdG8gYmUgb24gdGhlIGluc3RhbmNlIHJhdGhlciB0aGFuIGluIHRoZVxuXHRcdCAqIHByb3RvdHlwZSBzbyB0aGF0IGl0J3MgY2F1Z2h0IGJ5IHRoZSBldmVudCBzeXN0ZW0uXG5cdFx0ICovXG5cdFx0Y2hhbmdlZCA9IGZvcmNlPChub3c6IFQsIHdhczogVCkgPT4gdm9pZD4oKTtcblx0XHRcblx0XHQvKiogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgdmFsdWUgb2YgdGhpcyBmb3JjZS4gKi9cblx0XHR0b1N0cmluZygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFwiXCIgKyB0aGlzLl92YWx1ZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0dmFsdWVPZigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuX3ZhbHVlO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIEJvb2xlYW5Gb3JjZSBleHRlbmRzIFN0YXRlZnVsRm9yY2U8Ym9vbGVhbj5cblx0e1xuXHRcdC8qKlxuXHRcdCAqIEZsaXBzIHRoZSB2YWx1ZSBvZiB0aGUgZm9yY2UgZnJvbSB0cnVlIHRvIGZhbHNlIG9yIGZhbHNlIHRvIHRydWUuXG5cdFx0ICogKFVzZWZ1bCBmb3IgZm9yY2UgYXJndW1lbnRzIGluIGFycm93IGZ1bmN0aW9ucyB0byBjYW5jZWwgdGhlIHJldHVybiB2YWx1ZS4pXG5cdFx0ICovXG5cdFx0ZmxpcCgpXG5cdFx0e1xuXHRcdFx0dGhpcy5zZXQoIXRoaXMudmFsdWUpO1xuXHRcdH1cblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqXG5cdCAqIERlYWxzIHdpdGggdGVtcG9yYXJpbHkgdHJhY2tpbmcgaW5zZXJ0ZWQgbWV0YXMuXG5cdCAqIFxuXHQgKiBPbmUgc2luZ2xlIGJyYW5jaCBjYW4gcG90ZW50aWFsbHkgaGF2ZSBtdWx0aXBsZSB0cmFja2Vyc1xuXHQgKiBhc3NvY2lhdGVkIHdpdGggaXQsIGluIHRoZSBjYXNlIHdoZW4gdGhlIGJyYW5jaCBoYXMgbXVsdGlwbGVcblx0ICogbGF5ZXJzIG9mIHN0cmVhbSBtZXRhcyBhcHBsaWVkIHRvIGl0LiBUaGVyZSBpcyBvbmUgdHJhY2tlciBpbnN0YW5jZVxuXHQgKiBmb3IgZWFjaCBzZXQgb2YgXCJzaWJsaW5nXCIgbWV0YXMuXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgVHJhY2tlclxuXHR7XG5cdFx0LyoqICovXG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRwcml2YXRlIHJlYWRvbmx5IGJyYW5jaDogSUJyYW5jaCxcblx0XHRcdHJlZjogUmVmIHwgTG9jYXRvciA9IFwiYXBwZW5kXCIpXG5cdFx0e1xuXHRcdFx0dGhpcy5sYXN0ID0gcmVmO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBVcGRhdGVzIHRoZSBpbnRlcm5hbCB0cmFja2luZyB2YWx1ZSBvZiB0aGUgVHJhY2tlci5cblx0XHQgKi9cblx0XHR1cGRhdGUob2JqZWN0OiBSZWYgfCBMb2NhdG9yKVxuXHRcdHtcblx0XHRcdHRoaXMubGFzdCA9IG9iamVjdDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyBhIHZhbHVlIHRoYXQgY2FuIGJlIHVzZWQgaW4gYSBjbGllbnQgbGlicmFyeSBhcyB0aGVcblx0XHQgKiByZWZlcmVuY2Ugc2libGluZyB2YWx1ZSB0byBpbmRpY2F0ZSBhbiBpbnNlcnRpb24gcG9pbnQuXG5cdFx0ICovXG5cdFx0Z2V0TGFzdEhhcmRSZWYoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmxhc3QgaW5zdGFuY2VvZiBMb2NhdG9yID9cblx0XHRcdFx0dGhpcy5yZXNvbHZlUmVmKCkgOlxuXHRcdFx0XHR0aGlzLmxhc3Q7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENsb25lcyBhbmQgcmV0dXJucyB0aGlzIFRyYWNrZXIuIFVzZWQgdG8gY3JlYXRlIGEgbmV3XG5cdFx0ICogVHJhY2tlciBpbnN0YW5jZSBmb3IgYSBtb3JlIG5lc3RlZCBsZXZlbCBvZiBzdHJlYW0gbWV0YS5cblx0XHQgKi9cblx0XHRkZXJpdmUoKVxuXHRcdHtcblx0XHRcdGNvbnN0IG91dCA9IG5ldyBUcmFja2VyKHRoaXMuYnJhbmNoKTtcblx0XHRcdG91dC5sYXN0ID0gdGhpcy5sYXN0O1xuXHRcdFx0XG5cdFx0XHRpZiAoQ29uc3QuZGVidWcpXG5cdFx0XHRcdG91dC50cmFja2VyQ29udGFpbmVyID0gdGhpcztcblx0XHRcdFxuXHRcdFx0cmV0dXJuIG91dDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRW5zdXJlcyB0aGF0IHRoZSBzcGVjaWZpZWQgcmVmIG9iamVjdCBhY3R1YWxseSBleGlzdHMgaW4gdGhlIFJlZmxleGl2ZVxuXHRcdCAqIHRyZWUsIGFuZCBpZiBub3QsIGEgbmV3IG9iamVjdCBpcyByZXR1cm5lZCB0aGF0IGNhbiBiZSB1c2VkIGFzIHRoZSByZWYuXG5cdFx0ICogSW4gdGhlIGNhc2Ugd2hlbiBudWxsIGlzIHJldHVybmVkLCBudWxsIHNob3VsZCBiZSB1c2VkIGFzIHRoZSByZWYsXG5cdFx0ICogaW5kaWNhdGluZyB0aGF0IHRoZSBpbnNlcnRpb24gc2hvdWxkIG9jY3VyIGF0IHRoZSBlbmQgb2YgdGhlIGNoaWxkIGxpc3QuXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSByZXNvbHZlUmVmKCk6IFJlZlxuXHRcdHtcblx0XHRcdGNvbnN0IHJlZiA9IHRoaXMubGFzdDtcblx0XHRcdFxuXHRcdFx0aWYgKHJlZiA9PT0gbnVsbClcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiP1wiKTtcblx0XHRcdFxuXHRcdFx0aWYgKHJlZiA9PT0gXCJwcmVwZW5kXCIgfHwgcmVmID09PSBcImFwcGVuZFwiKVxuXHRcdFx0XHRyZXR1cm4gcmVmO1xuXHRcdFx0XG5cdFx0XHRjb25zdCByZWZMb2NhdG9yID0gKCgpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGlmIChyZWYgaW5zdGFuY2VvZiBMb2NhdG9yKVxuXHRcdFx0XHRcdHJldHVybiByZWY7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCByZWZNZXRhID0gXG5cdFx0XHRcdFx0QnJhbmNoTWV0YS5vZihyZWYpIHx8XG5cdFx0XHRcdFx0TGVhZk1ldGEub2YocmVmKTtcblx0XHRcdFx0XG5cdFx0XHRcdHJldHVybiByZWZNZXRhID9cblx0XHRcdFx0XHRyZWZNZXRhLmxvY2F0b3IgOlxuXHRcdFx0XHRcdG51bGw7XG5cdFx0XHR9KSgpO1xuXHRcdFx0XG5cdFx0XHRpZiAoIXJlZkxvY2F0b3IpXG5cdFx0XHRcdHJldHVybiBcImFwcGVuZFwiO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBjaGlsZHJlbiA9IFJvdXRpbmdMaWJyYXJ5LnRoaXMuZ2V0Q2hpbGRyZW4odGhpcy5icmFuY2gpO1xuXHRcdFx0bGV0IHByZXZpb3VzOiBJQnJhbmNoIHwgSUxlYWYgfCBudWxsID0gbnVsbDtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiBjaGlsZHJlbilcblx0XHRcdHtcblx0XHRcdFx0aWYgKHJlZiA9PT0gY2hpbGQpXG5cdFx0XHRcdFx0cmV0dXJuIHJlZjtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRDaGlsZE1ldGEgPSBcblx0XHRcdFx0XHRCcmFuY2hNZXRhLm9mKGNoaWxkKSB8fFxuXHRcdFx0XHRcdExlYWZNZXRhLm9mKGNoaWxkKTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChjdXJyZW50Q2hpbGRNZXRhKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Ly8gVGhlIGV4cGxhbmF0aW9uIG9mIHRoaXMgYWxnb3JpdGhtIGlzIHRoYXQgd2UncmUgd2Fsa2luZyB0aHJvdWdoXG5cdFx0XHRcdFx0Ly8gdGhlIGRpcmVjdCBjaGlsZCBtZXRhcyBvZiBjb250YWluaW5nQnJhbmNoLiBUaGUgaWRlYWwgY2FzZSBpc1xuXHRcdFx0XHRcdC8vIHRoYXQgdGhlIG1ldGEgdGhhdCB3YXMgcHJldmlvdXNseSBiZWluZyB1c2VkIGFzIHRoZSBsb2NhdG9yIGlzXG5cdFx0XHRcdFx0Ly8gc3RpbGwgcHJlc2VudCBpbiB0aGUgZG9jdW1lbnQuIEluIHRoaXMgY2FzZSwgdGhlIHJlZiBkb2Vzbid0IG5lZWRcblx0XHRcdFx0XHQvLyB0byBiZSB1cGRhdGVkLCBzbyBpdCBjYW4ganVzdCBiZSByZXR1cm5lZCB2ZXJiYXRpbS4gSG93ZXZlciwgXG5cdFx0XHRcdFx0Ly8gaW4gdGhlIGNhc2Ugd2hlbiB0aGUgcmVmIGlzIG1pc3NpbmcsIHdlIG5lZWQgdG8gcmV0dXJuIHRoZSBuZXh0XG5cdFx0XHRcdFx0Ly8gbmV3ZXN0IG1ldGEgdGhhdCBpc24ndCBuZXdlciB0aGFuIHRoZSBsb2NhdG9yIG9mIHRoZSBvcmlnaW5hbFxuXHRcdFx0XHRcdC8vIHJlZi5cblx0XHRcdFx0XHRjb25zdCBjbXAgPSBjdXJyZW50Q2hpbGRNZXRhLmxvY2F0b3IuY29tcGFyZShyZWZMb2NhdG9yKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoY21wID09PSBDb21wYXJlUmVzdWx0LmVxdWFsKVxuXHRcdFx0XHRcdFx0cmV0dXJuIGNoaWxkO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIFRoZSBjdXJyZW50IGNoaWxkIG1ldGEgaXMgbmV3ZXIgdGhhbiB0aGUgcmVmIG1ldGEuIFRoaXMgbWVhbnNcblx0XHRcdFx0XHQvLyB0aGF0IHdlIHdlbnQgdG9vIGZhciwgc28gd2Ugc2hvdWxkIHJldHVybiB0aGUgcHJldmlvdXMgbWV0YS5cblx0XHRcdFx0XHQvLyBPciwgaW4gdGhlIGNhc2Ugd2hlbiB3ZSBoYXZlbid0IGhpdCBhIG1ldGEgeWV0LCB3ZSBuZWVkIHRvXG5cdFx0XHRcdFx0Ly8gcmV0dXJuIHRoZSBjb25zdGFudCBcInByZXBlbmRcIiAoYmVjYXVzZSB0aGVyZSdzIG5vdGhpbmcgdG9cblx0XHRcdFx0XHQvLyByZWZlciB0byBpbiB0aGlzIGNhc2UpLlxuXHRcdFx0XHRcdGlmIChjbXAgPT09IENvbXBhcmVSZXN1bHQubG93ZXIpXG5cdFx0XHRcdFx0XHRyZXR1cm4gcHJldmlvdXMgfHwgXCJwcmVwZW5kXCI7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdHByZXZpb3VzID0gY2hpbGQ7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiBcImFwcGVuZFwiO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgYSByb2xsaW5nIHZhbHVlIHRoYXQgaW5kaXJlY3RseSByZWZlcnMgdG8gdGhlIGxhc3QgbWV0YVxuXHRcdCAqIHRoYXQgd2FzIGFwcGVuZGVkIHRvIHRoZSBicmFuY2ggdGhhdCB0aGlzIHRyYWNrZXIgaXMgdHJhY2tpbmcuXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSBsYXN0OiBSZWYgfCBMb2NhdG9yO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEBpbnRlcm5hbFxuXHRcdCAqIEZvciBkZWJ1Z2dpbmcgb25seS5cblx0XHQgKi9cblx0XHRwcml2YXRlIHRyYWNrZXJDb250YWluZXI6IFRyYWNrZXIgfCB1bmRlZmluZWQ7XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBBcnJheVN0cmVhbU1ldGEgZXh0ZW5kcyBTdHJlYW1NZXRhXG5cdHtcblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdHJlYWRvbmx5IGNvbnRhaW5lck1ldGE6IENvbnRhaW5lck1ldGEsXG5cdFx0XHRyZWFkb25seSByZWN1cnJlbnQ6IFJlY3VycmVudClcblx0XHR7XG5cdFx0XHRzdXBlcihjb250YWluZXJNZXRhKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0YXR0YWNoKGNvbnRhaW5pbmdCcmFuY2g6IElCcmFuY2gsIHRyYWNrZXI6IFRyYWNrZXIpXG5cdFx0e1xuXHRcdFx0Y29uc3QgbG9jYWxUcmFja2VyID0gdHJhY2tlci5kZXJpdmUoKTtcblx0XHRcdGxvY2FsVHJhY2tlci51cGRhdGUodGhpcy5sb2NhdG9yKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgcmVjID0gdGhpcy5yZWN1cnJlbnQ7XG5cdFx0XHRjb25zdCBmb3JjZUFycmF5OiBBcnJheUZvcmNlPGFueT4gPSByZWMuc2VsZWN0b3I7XG5cdFx0XHRjb25zdCByZXN0QXJncyA9IHJlYy51c2VyUmVzdEFyZ3Muc2xpY2UoKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCBmb3JjZUFycmF5Lmxlbmd0aDspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGZvID0gZm9yY2VBcnJheVtpXTtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IGF0b21zID0gcmVjLnVzZXJDYWxsYmFjayhcblx0XHRcdFx0XHRmbyxcblx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdGksXG5cdFx0XHRcdFx0Li4ucmVzdEFyZ3MpO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgbWV0YXMgPSBDb3JlVXRpbC50cmFuc2xhdGVBdG9tcyhcblx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdHRoaXMuY29udGFpbmVyTWV0YSxcblx0XHRcdFx0XHRhdG9tcyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRDb3JlVXRpbC5hcHBseU1ldGFzKFxuXHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0dGhpcy5jb250YWluZXJNZXRhLFxuXHRcdFx0XHRcdG1ldGFzLFxuXHRcdFx0XHRcdGxvY2FsVHJhY2tlcik7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGZpbmRNZXRhID0gKHBvc2l0aW9uOiBudW1iZXIpID0+IFxuXHRcdFx0e1x0XG5cdFx0XHRcdGxldCBwb3MgPSBwb3NpdGlvbjtcblx0XHRcdFx0Y29uc3QgaXRlcmF0b3IgPSBSb3V0aW5nTGlicmFyeS50aGlzLmdldENoaWxkcmVuKGNvbnRhaW5pbmdCcmFuY2gpO1xuXHRcdFx0XHRmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlcmF0b3IpIFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgTWV0YSA9IEJyYW5jaE1ldGEub2YoaXRlbSk7XG5cdFx0XHRcdFx0aWYgKE1ldGEgJiYgXG5cdFx0XHRcdFx0XHRNZXRhLmxvY2F0b3IuY29tcGFyZSh0aGlzLmxvY2F0b3IpID09PSBDb21wYXJlUmVzdWx0Lmxvd2VyICYmXG5cdFx0XHRcdFx0XHQtLXBvcyA9PT0gLTEpIFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHJldHVybiBNZXRhO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0Rm9yY2VVdGlsLmF0dGFjaEZvcmNlKGZvcmNlQXJyYXkucm9vdC5jaGFuZ2VkLCAoaXRlbTogYW55LCBwb3NpdGlvbjogbnVtYmVyKSA9PiBcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgaW50ZXJuYWxQb3MgPSBmb3JjZUFycmF5LnBvc2l0aW9ucy5pbmRleE9mKHBvc2l0aW9uKTtcblx0XHRcdFx0aWYgKHBvc2l0aW9uID4gLTEpIFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgbWV0YSA9IGZpbmRNZXRhKGludGVybmFsUG9zKTtcblx0XHRcdFx0XHRpZiAobWV0YSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBhdG9tcyA9IHJlYy51c2VyQ2FsbGJhY2soaXRlbSwgY29udGFpbmluZ0JyYW5jaCwgcG9zaXRpb24pO1xuXHRcdFx0XHRcdFx0Y29uc3QgbWV0YXMgPSBDb3JlVXRpbC50cmFuc2xhdGVBdG9tcyhcblx0XHRcdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHRcdFx0dGhpcy5jb250YWluZXJNZXRhLFxuXHRcdFx0XHRcdFx0XHRhdG9tcylbMF0gYXMgQnJhbmNoTWV0YTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRtZXRhcy5sb2NhdG9yLnNldENvbnRhaW5lcih0aGlzLmNvbnRhaW5lck1ldGEubG9jYXRvcik7XG5cdFx0XHRcdFx0XHRSb3V0aW5nTGlicmFyeS50aGlzLnJlcGxhY2VCcmFuY2gobWV0YS5icmFuY2gsIG1ldGFzLmJyYW5jaCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Rm9yY2VVdGlsLmF0dGFjaEZvcmNlKGZvcmNlQXJyYXkuYWRkZWQsIChpdGVtOiBhbnksIHBvc2l0aW9uOiBudW1iZXIpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGF0b21zID0gcmVjLnVzZXJDYWxsYmFjayhpdGVtLCBjb250YWluaW5nQnJhbmNoLCBwb3NpdGlvbik7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBtZXRhcyA9IENvcmVVdGlsLnRyYW5zbGF0ZUF0b21zKFxuXHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0dGhpcy5jb250YWluZXJNZXRhLFxuXHRcdFx0XHRcdGF0b21zKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0bGV0IHRyYWNrZXIgPSBsb2NhbFRyYWNrZXI7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAocG9zaXRpb24gPCBmb3JjZUFycmF5Lmxlbmd0aClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IG1ldGEgPSBmaW5kTWV0YShwb3NpdGlvbiAtIDEpO1xuXHRcdFx0XHRcdGlmIChtZXRhKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHRyYWNrZXIgPSBsb2NhbFRyYWNrZXIuZGVyaXZlKCk7XG5cdFx0XHRcdFx0XHR0cmFja2VyLnVwZGF0ZShtZXRhLmJyYW5jaCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdENvcmVVdGlsLmFwcGx5TWV0YXMoXG5cdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lck1ldGEsXG5cdFx0XHRcdFx0bWV0YXMsXG5cdFx0XHRcdFx0dHJhY2tlcik7XG5cdFx0XHR9KTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0Rm9yY2VVdGlsLmF0dGFjaEZvcmNlKGZvcmNlQXJyYXkucmVtb3ZlZCwgKGl0ZW06IGFueSwgcG9zaXRpb246IG51bWJlcikgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgbWV0YSA9IGZpbmRNZXRhKHBvc2l0aW9uKTtcblx0XHRcdFx0aWYgKG1ldGEpXG5cdFx0XHRcdFx0Q29yZVV0aWwudW5hcHBseU1ldGFzKGNvbnRhaW5pbmdCcmFuY2gsIFttZXRhXSk7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Rm9yY2VVdGlsLmF0dGFjaEZvcmNlKGZvcmNlQXJyYXkubW92ZWQsIChpdGVtMTogYW55LCBpdGVtMjogYW55LCBpbmRleDE6IG51bWJlciwgaW5kZXgyOiBudW1iZXIpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHNvdXJjZSA9IGZpbmRNZXRhKGluZGV4MSk7XG5cdFx0XHRcdGNvbnN0IHRhcmdldCA9IGZpbmRNZXRhKGluZGV4Mik7XG5cblx0XHRcdFx0aWYgKHNvdXJjZSAmJiB0YXJnZXQpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBzcmNMb2NWYWwgPSBzb3VyY2UubG9jYXRvci5nZXRsYXN0TG9jYXRvclZhbHVlKCk7XG5cdFx0XHRcdFx0Y29uc3QgdGFyZ2V0TG9jVmFsID0gdGFyZ2V0LmxvY2F0b3IuZ2V0bGFzdExvY2F0b3JWYWx1ZSgpO1xuXHRcdFx0XHRcdHNvdXJjZS5sb2NhdG9yLnNldExhc3RMb2NhdG9yVmFsdWUodGFyZ2V0TG9jVmFsKTtcblx0XHRcdFx0XHR0YXJnZXQubG9jYXRvci5zZXRMYXN0TG9jYXRvclZhbHVlKHNyY0xvY1ZhbCk7XG5cblx0XHRcdFx0XHRSb3V0aW5nTGlicmFyeS50aGlzLnN3YXBCcmFuY2hlcyhzb3VyY2UuYnJhbmNoLCB0YXJnZXQuYnJhbmNoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdEZvcmNlVXRpbC5hdHRhY2hGb3JjZShmb3JjZUFycmF5LnRhaWxDaGFuZ2UsIChpdGVtOiBhbnksIHBvc2l0aW9uOiBudW1iZXIpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHNvdXJjZSA9IGZpbmRNZXRhKHBvc2l0aW9uKTtcblx0XHRcdFx0aWYgKHNvdXJjZSlcblx0XHRcdFx0XHRsb2NhbFRyYWNrZXIudXBkYXRlKHNvdXJjZS5icmFuY2gpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgZmlsdGVyUmVuZGVyZWQocmVuZGVyZWQ6IE1ldGFbXSlcblx0XHR7XG5cdFx0XHRjb25zdCBtZXRhcyA9IHJlbmRlcmVkLnNsaWNlKCk7XG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGkgPSBtZXRhcy5sZW5ndGg7IGktLSA+IDA7KVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBtZXRhID0gbWV0YXNbaV07XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAobWV0YSBpbnN0YW5jZW9mIEJyYW5jaE1ldGEgfHwgbWV0YSBpbnN0YW5jZW9mIExlYWZNZXRhKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bWV0YS5rZXkgPSArK3RoaXMubmV4dE1ldGFLZXk7XG5cdFx0XHRcdFx0cmVuZGVyZWQuc3BsaWNlKGksIDEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiBtZXRhcztcblx0XHR9XG5cdFx0XG5cdFx0cHJpdmF0ZSBuZXh0TWV0YUtleSA9IDA7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSB1bmZpbHRlclJlbmRlcmVkKGtleTogbnVtYmVyLCBjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHJlc29sdmVkOiBNZXRhW10gPSBbXTtcblx0XHRcdGNvbnN0IGl0ZXJhdG9yID0gUm91dGluZ0xpYnJhcnkudGhpcy5nZXRDaGlsZHJlbihjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdGxldCBpblJhbmdlID0gZmFsc2U7XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgY2hpbGQgb2YgaXRlcmF0b3IpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGNoaWxkTWV0YSA9IFxuXHRcdFx0XHRcdEJyYW5jaE1ldGEub2YoPGFueT5jaGlsZCkgfHxcblx0XHRcdFx0XHRMZWFmTWV0YS5vZig8YW55PmNoaWxkKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0aWYgKGNoaWxkTWV0YSAmJiBjaGlsZE1ldGEua2V5ID09PSBrZXkpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpblJhbmdlID0gdHJ1ZTtcblx0XHRcdFx0XHRyZXNvbHZlZC5wdXNoKGNoaWxkTWV0YSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoaW5SYW5nZSlcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIHJlc29sdmVkO1xuXHRcdH1cblx0fVxuXHRcblx0dHlwZSBBcnJheUl0ZW1SZW5kZXJlckZuID0gKGl0ZW06IGFueSwgYnJhbmNoOiBJQnJhbmNoLCBpbmRleDogbnVtYmVyKSA9PiBhbnk7XG59XG4iXX0=