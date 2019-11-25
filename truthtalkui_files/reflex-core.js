"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
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
                for (let i = this.positions.length; --i >= 0;) {
                    const position = this.positions[i];
                    if (!this.filterFn(this.getRoot(position), i, this)) {
                        const loc = this.positions.indexOf(position);
                        if (loc > -1)
                            this.splice(loc, 1);
                        else
                            debugger;
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
                positions.filter((value, index) => this.filterFn(this.getRoot(value), start + index, this)) :
                positions;
            this.positions.splice(start, 0, ...filtered);
            for (let i = -1; ++i < filtered.length;) {
                const item = filtered[i];
                const loc = start + i;
                console.log(this.getRoot(item), loc);
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
                for (let i = -1; ++i < childMetas.length;) {
                    const meta = childMetas[i];
                    // ClosureMeta instances must be dealt with first, because
                    // they can return other Meta instances, and those Meta
                    // instances are the ones that (likely) have Locators that
                    // must be assimilated (i.e. by calling .setContainer())
                    // The ClosureMeta instances themselves don't participate
                    // in the Tracker / Locator madness, but they can return 
                    // other Meta instances that do.
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
                    meta.locator.setContainer(containerMeta.locator);
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
        /**
         * A multi-level indexing data type, used to control where new sibling branches
         * should be inserted in a given sibling list.
         *
         * Locators are used to solve the problem of determining where to position the
         * leaves and branches returned by recurrent functions within some other branch.
         *
         * Each Meta object has a corresponding Locator.
         */
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
            getLastLocatorValue() {
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
            }
            /**
             *
             */
            attach(containingBranch, tracker) {
                const localTracker = tracker.derive();
                localTracker.update(this.locator);
                const rec = this.recurrent;
                const arrayForce = rec.selector;
                const restArgs = rec.userRestArgs.slice();
                for (let i = -1; ++i < arrayForce.length;) {
                    const fo = arrayForce[i];
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
                Core.ForceUtil.attachForce(arrayForce.root.changed, (item, position) => {
                    const internalPos = arrayForce.positions.indexOf(position);
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
                Core.ForceUtil.attachForce(arrayForce.added, (item, position) => {
                    const atoms = rec.userCallback(item, containingBranch, position);
                    const metas = Core.CoreUtil.translateAtoms(containingBranch, this.containerMeta, atoms);
                    let tracker = localTracker;
                    if (position < arrayForce.length) {
                        const meta = findMeta(position - 1);
                        if (meta) {
                            tracker = localTracker.derive();
                            tracker.update(meta.branch);
                        }
                    }
                    Core.CoreUtil.applyMetas(containingBranch, this.containerMeta, metas, tracker);
                });
                Core.ForceUtil.attachForce(arrayForce.removed, (item, position) => {
                    const meta = findMeta(position);
                    if (meta)
                        Core.CoreUtil.unapplyMetas(containingBranch, [meta]);
                });
                Core.ForceUtil.attachForce(arrayForce.moved, (item1, item2, index1, index2) => {
                    const source = findMeta(index1);
                    const target = findMeta(index2);
                    if (source && target) {
                        const srcLocVal = source.locator.getLastLocatorValue();
                        const targetLocVal = target.locator.getLastLocatorValue();
                        source.locator.setLastLocatorValue(targetLocVal);
                        target.locator.setLastLocatorValue(srcLocVal);
                        Core.RoutingLibrary.this.swapBranches(source.branch, target.branch);
                    }
                });
                Core.ForceUtil.attachForce(arrayForce.tailChange, (item, position) => {
                    const source = findMeta(position);
                    if (source)
                        localTracker.update(source.branch);
                });
            }
        }
        Core.ArrayStreamMeta = ArrayStreamMeta;
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmbGV4LWNvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90c2NvbnN0LnRzIiwiLi4vc291cmNlL01ldGEvTWV0YS50cyIsIi4uL3NvdXJjZS9NZXRhL0JyYW5jaE1ldGEudHMiLCIuLi9zb3VyY2UvTWV0YS9MZWFmTWV0YS50cyIsIi4uL3NvdXJjZS9NZXRhL1JlY3VycmVudFN0cmVhbU1ldGEudHMiLCIuLi9zb3VyY2UvTWV0YS9Qcm9taXNlU3RyZWFtTWV0YS50cyIsIi4uL3NvdXJjZS9NZXRhL0FzeW5jSXRlcmFibGVTdHJlYW1NZXRhLnRzIiwiLi4vc291cmNlLyEudHMiLCIuLi9zb3VyY2UvQXJyYXlGb3JjZS50cyIsIi4uL3NvdXJjZS9BcnJheVN0b3JlLnRzIiwiLi4vc291cmNlL0NoaWxkcmVuT2YudHMiLCIuLi9zb3VyY2UvQ29yZVV0aWwudHMiLCIuLi9zb3VyY2UvRGVmaW5pdGlvbnMudHMiLCIuLi9zb3VyY2UvRm9yY2VVdGlsLnRzIiwiLi4vc291cmNlL0dsb2JhbHMudHMiLCIuLi9zb3VyY2UvSUxpYnJhcnkudHMiLCIuLi9zb3VyY2UvTG9jYXRvci50cyIsIi4uL3NvdXJjZS9OYW1lc3BhY2VPYmplY3QudHMiLCIuLi9zb3VyY2UvTm9kZUFycmF5LnRzIiwiLi4vc291cmNlL1JlYWR5U3RhdGUudHMiLCIuLi9zb3VyY2UvUmVjdXJyZW50LnRzIiwiLi4vc291cmNlL1JvdXRpbmdMaWJyYXJ5LnRzIiwiLi4vc291cmNlL1N0YXRlZnVsRm9yY2UudHMiLCIuLi9zb3VyY2UvVHJhY2tlci50cyIsIi4uL3NvdXJjZS9NZXRhL0FycmF5U3RyZWFtTWV0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQ0NBLElBQVUsTUFBTSxDQXVFZjtBQXZFRCxXQUFVLE1BQU07SUFBQyxJQUFBLElBQUksQ0F1RXBCO0lBdkVnQixXQUFBLElBQUk7UUFFcEIsTUFBTTtRQUNOLE1BQXNCLElBQUk7WUFFekIsWUFB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QUFDOzRCQUFDLE1BQU07d0JBQ3BELEtBQUssQ0FBQzs0QkFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQUMsTUFBTTt3QkFDMUQsS0FBSyxDQUFDOzRCQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQUMsTUFBTTt3QkFDaEUsS0FBSyxDQUFDOzRCQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUFDLE1BQU07d0JBQ3RFLEtBQUssQ0FBQzs0QkFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMs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Q3JDLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztTQUNEO1FBeklZLG9CQUFlLGtCQXlJM0IsQ0FBQTtJQUNGLENBQUMsRUEvSWdCLElBQUksR0FBSixXQUFJLEtBQUosV0FBSSxRQStJcEI7QUFBRCxDQUFDLEVBL0lTLE1BQU0sS0FBTixNQUFNLFFBK0lmIiwic291cmNlc0NvbnRlbnQiOlsiXG5jb25zdCBlbnVtIENvbnN0XG57XG5cdFwiXCIsXG5cdGRlYnVnLFxuXHRtb2Rlcm4sXG5cdG5vZGUsXG5cdGJyb3dzZXJcbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKiAqL1xuXHRleHBvcnQgYWJzdHJhY3QgY2xhc3MgTWV0YVxuXHR7XG5cdFx0Y29uc3RydWN0b3IocmVhZG9ubHkgbG9jYXRvcjogTG9jYXRvcikgeyB9XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgYWJzdHJhY3QgY2xhc3MgU3RlbU1ldGEgZXh0ZW5kcyBNZXRhXG5cdHtcblx0XHRjb25zdHJ1Y3Rvcihsb2NhdG9yPzogTG9jYXRvcilcblx0XHR7XG5cdFx0XHRzdXBlcihsb2NhdG9yIHx8IG5ldyBMb2NhdG9yKExvY2F0b3JUeXBlLmxlYWYpKTtcblx0XHR9XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBTdG9yZXMgdGhlIGluZm9ybWF0aW9uIGFib3V0IGEgc2luZ2xlIGF0dHJpYnV0ZS5cblx0ICogQWx0aG91Z2ggYXR0cmlidXRlcyBjYW4gY29tZSBpbiBhIGxhcmdlIG9iamVjdCBsaXRlcmFsXG5cdCAqIHRoYXQgc3BlY2lmaWVzIG1hbnkgYXR0cmlidXRlcyB0b2dldGhlciwgdGhlIGF0b21cblx0ICogdHJhbnNsYXRvciBmdW5jdGlvbiBzcGxpdHMgdGhlbSB1cCBpbnRvIHNtYWxsZXIgbWV0YXMsXG5cdCAqIHdoaWNoIGlzIGRvbmUgYmVjYXVzZSBzb21lIHZhbHVlcyBtYXkgYmUgc3RhdGljLFxuXHQgKiBhbmQgb3RoZXJzIG1heSBiZSBiZWhpbmQgYSBmb3JjZS5cblx0ICovXG5cdGV4cG9ydCBjbGFzcyBBdHRyaWJ1dGVNZXRhIGV4dGVuZHMgU3RlbU1ldGFcblx0e1xuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cmVhZG9ubHkga2V5OiBzdHJpbmcsXG5cdFx0XHRyZWFkb25seSB2YWx1ZTogYW55KVxuXHRcdHtcblx0XHRcdHN1cGVyKCk7XG5cdFx0fVxuXHR9XG5cdFxuXHQvKipcblx0ICogU3RvcmVzIGluZm9ybWF0aW9uIGFib3V0IHNvbWUgdmFsdWUgdGhhdCBpcyBrbm93blxuXHQgKiB0byB0aGUgbGlicmFyeSB0aGF0IHdpbGwgYmUgYXBwbGllZCB0byBzb21lIGJyYW5jaC5cblx0ICovXG5cdGV4cG9ydCBjbGFzcyBWYWx1ZU1ldGEgZXh0ZW5kcyBTdGVtTWV0YVxuXHR7XG5cdFx0Y29uc3RydWN0b3IocmVhZG9ubHkgdmFsdWU6IHN0cmluZyB8IG51bWJlciB8IGJpZ2ludClcblx0XHR7XG5cdFx0XHRzdXBlcigpO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBjbGFzcyBDbG9zdXJlTWV0YSBleHRlbmRzIFN0ZW1NZXRhXG5cdHtcblx0XHRjb25zdHJ1Y3RvcihyZWFkb25seSBjbG9zdXJlOiBGdW5jdGlvbilcblx0XHR7XG5cdFx0XHRzdXBlcigpO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBDb250YWluZXJNZXRhIGV4dGVuZHMgTWV0YSB7IH1cblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBTdHJlYW1NZXRhIGV4dGVuZHMgQ29udGFpbmVyTWV0YVxuXHR7XG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRyZWFkb25seSBjb250YWluZXJNZXRhOiBDb250YWluZXJNZXRhLFxuXHRcdFx0bG9jYXRvcj86IExvY2F0b3IpXG5cdFx0e1xuXHRcdFx0c3VwZXIobG9jYXRvciB8fCBuZXcgTG9jYXRvcihMb2NhdG9yVHlwZS5zdHJlYW0pKTtcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBCcmFuY2hNZXRhIGV4dGVuZHMgQ29udGFpbmVyTWV0YVxuXHR7XG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyB0aGUgQnJhbmNoTWV0YSBvYmplY3QgdGhhdCBjb3JyZXNwb25kc1xuXHRcdCAqIHRvIHRoZSBzcGVjaWZpZWQgQnJhbmNoIG9iamVjdC5cblx0XHQgKi9cblx0XHRzdGF0aWMgb2YoYnJhbmNoOiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLm1ldGFzLmdldChicmFuY2gpIHx8IG51bGw7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IG1ldGFzID0gbmV3IFdlYWtNYXA8SUJyYW5jaCwgQnJhbmNoTWV0YT4oKTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdGJyYW5jaDogSUJyYW5jaCxcblx0XHRcdGluaXRpYWxBdG9tczogQXRvbVtdLFxuXHRcdFx0bG9jYXRvcj86IExvY2F0b3IpXG5cdFx0e1xuXHRcdFx0c3VwZXIobG9jYXRvciB8fCBuZXcgTG9jYXRvcihMb2NhdG9yVHlwZS5icmFuY2gpKTtcblx0XHRcdHRoaXMuYnJhbmNoID0gYnJhbmNoO1xuXHRcdFx0QnJhbmNoTWV0YS5tZXRhcy5zZXQoYnJhbmNoLCB0aGlzKTtcblx0XHRcdFxuXHRcdFx0aWYgKGluaXRpYWxBdG9tcy5sZW5ndGgpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IG1ldGFzID0gQ29yZVV0aWwudHJhbnNsYXRlQXRvbXMoXG5cdFx0XHRcdFx0YnJhbmNoLFxuXHRcdFx0XHRcdHRoaXMsXG5cdFx0XHRcdFx0aW5pdGlhbEF0b21zKTtcblx0XHRcdFx0XG5cdFx0XHRcdENvcmVVdGlsLmFwcGx5TWV0YXMoYnJhbmNoLCB0aGlzLCBtZXRhcyk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEBpbnRlcm5hbFxuXHRcdCAqIFdBUk5JTkc6IERvIG5vdCBob2xkIG9udG8gcmVmZXJlbmNlcyB0byB0aGlzXG5cdFx0ICogdmFsdWUsIG9yIG1lbW9yeSBsZWFrcyB3aWxsIGhhcHBlbi5cblx0XHQgKiBcblx0XHQgKiAoTm90ZTogdGhpcyBwcm9wZXJ0eSBpcyBhIGJpdCBvZiBhIGNvZGUgc21lbGwuIFRoZSB1c2FnZXNcblx0XHQgKiBvZiBpdCBzaG91bGQgYmUgcmVwbGFjZWQgd2l0aCBjb2RlIHRoYXQgcmUtZGlzY292ZXJzIHRoZVxuXHRcdCAqIGJyYW5jaCBvYmplY3QuKVxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGJyYW5jaDogSUJyYW5jaDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBBbiBhcmJpdHJhcnkgdW5pcXVlIHZhbHVlIHVzZWQgdG8gaWRlbnRpZnkgYW4gaW5kZXggaW4gYSBmb3JjZVxuXHRcdCAqIGFycmF5IHRoYXQgd2FzIHJlc3BvbnNpYmxlIGZvciByZW5kZXJpbmcgdGhpcyBCcmFuY2hNZXRhLlxuXHRcdCAqL1xuXHRcdGtleSA9IDA7XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKiAqL1xuXHRleHBvcnQgY2xhc3MgTGVhZk1ldGEgZXh0ZW5kcyBTdGVtTWV0YVxuXHR7XG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyB0aGUgTGVhZk1ldGEgb2JqZWN0IHRoYXQgY29ycmVzcG9uZHNcblx0XHQgKiB0byB0aGUgc3BlY2lmaWVkIExlYWYgb2JqZWN0LlxuXHRcdCAqL1xuXHRcdHN0YXRpYyBvZihsZWFmOiBJTGVhZilcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5tZXRhcy5nZXQobGVhZikgfHwgbnVsbDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgbWV0YXMgPSBuZXcgV2Vha01hcDxJTGVhZiwgTGVhZk1ldGE+KCk7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRyZWFkb25seSB2YWx1ZTogSUxlYWYsXG5cdFx0XHRsb2NhdG9yPzogTG9jYXRvcilcblx0XHR7XG5cdFx0XHRzdXBlcihsb2NhdG9yKTtcblx0XHRcdExlYWZNZXRhLm1ldGFzLnNldCh2YWx1ZSwgdGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEFuIGFyYml0cmFyeSB1bmlxdWUgdmFsdWUgdXNlZCB0byBpZGVudGlmeSBhbiBpbmRleCBpbiBhIGZvcmNlXG5cdFx0ICogYXJyYXkgdGhhdCB3YXMgcmVzcG9uc2libGUgZm9yIHJlbmRlcmluZyB0aGlzIEJyYW5jaE1ldGEuXG5cdFx0ICovXG5cdFx0a2V5ID0gMDtcblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIFJlY3VycmVudFN0cmVhbU1ldGEgZXh0ZW5kcyBTdHJlYW1NZXRhXG5cdHtcblx0XHQvKiogKi9cblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdHJlYWRvbmx5IGNvbnRhaW5lck1ldGE6IENvbnRhaW5lck1ldGEsXG5cdFx0XHRyZWFkb25seSByZWN1cnJlbnQ6IFJlY3VycmVudCxcblx0XHRcdGxvY2F0b3I/OiBMb2NhdG9yKVxuXHRcdHtcblx0XHRcdHN1cGVyKGNvbnRhaW5lck1ldGEsIGxvY2F0b3IpO1xuXHRcdFx0dGhpcy5yZWN1cnJlbnQgPSByZWN1cnJlbnQ7XG5cdFx0XHRjb25zdCBzZWxmID0gdGhpcztcblx0XHRcdFxuXHRcdFx0dGhpcy5fc3lzdGVtQ2FsbGJhY2sgPSAoZnVuY3Rpb24odGhpczogSUJyYW5jaCwgLi4uc3lzdGVtUmVzdEFyZ3M6IGFueVtdKVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBUaGlzIGlzIGNoZWF0aW5nIGEgYml0LiBXZSdyZSBnZXR0aW5nIHRoZSBicmFuY2hcblx0XHRcdFx0Ly8gZnJvbSB0aGUgXCJ0aGlzXCIgcmVmZXJlbmNlIHBhc3NlZCB0byBldmVudCBjYWxsYmFja3MuXG5cdFx0XHRcdC8vIFNvbWUgbGlicmFyaWVzIChzdWNoIGFzIHRoZSBET00pIHNldCB0aGUgXCJ0aGlzXCIgcmVmZXJlbmNlXG5cdFx0XHRcdC8vIHRvIHdoYXQgZXNzZW50aWFsbHkgYW1vdW50cyB0byB0aGUgYnJhbmNoIHdlJ3JlIHRyeWluZ1xuXHRcdFx0XHQvLyB0byBnZXQsIHdpdGhvdXQgYWN0dWFsbHkgc3RvcmluZyBhIHJlZmVyZW5jZSB0byBpdC4gSG9wZWZ1bGx5XG5cdFx0XHRcdC8vIHRoZSBvdGhlciBwbGF0Zm9ybXMgb24gd2hpY2ggcmVmbGV4aXZlIGxpYnJhcmllcyBhcmUgYnVpbHRcblx0XHRcdFx0Ly8gd2lsbCBleGhpYml0IChvciBjYW4gYmUgbWFkZSB0byBleGliaXQpIHRoaXMgc2FtZSBiZWhhdmlvci5cblx0XHRcdFx0XG5cdFx0XHRcdGlmICh0aGlzID09PSBudWxsKVxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkxpYnJhcnkgbm90IGltcGxlbWVudGVkIHByb3Blcmx5LlwiKTtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IHdhc01ldGFzID0gcmVzb2x2ZVJldHVybmVkKHNlbGYucmV0dXJuZWQsIHRoaXMpO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKCFzZWxmLmluQXV0b1J1bkNvbnRleHQpXG5cdFx0XHRcdFx0aWYgKFJvdXRpbmdMaWJyYXJ5LnRoaXMuaXNCcmFuY2hEaXNwb3NlZCh0aGlzKSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRzZWxmLmRldGFjaFJlY3VycmVudHMoXG5cdFx0XHRcdFx0XHRcdHRoaXMsXG5cdFx0XHRcdFx0XHRcdHJlY3VycmVudC5zZWxlY3Rvcixcblx0XHRcdFx0XHRcdFx0c2VsZi5zeXN0ZW1DYWxsYmFjayk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdENvcmVVdGlsLnVuYXBwbHlNZXRhcyh0aGlzLCB3YXNNZXRhcyk7XG5cdFx0XHRcdFx0XHRzZWxmLnJldHVybmVkLmxlbmd0aCA9IDA7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0Ly8gVGhpcyBpcyBhIHNhZmV0eSBjaGVjaywgd2UncmUgYWxzbyBkb2luZyB0aGlzIGJlbG93LCBidXQgaXQnc1xuXHRcdFx0XHQvLyBpbXBvcnRhbnQgdG8gbWFrZSBzdXJlIHRoaXMgZ2V0cyBzZXQgdG8gZmFsc2UgYXMgc29vbiBhcyBwb3NzaWJsZS5cblx0XHRcdFx0c2VsZi5pbkF1dG9SdW5Db250ZXh0ID0gZmFsc2U7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBmbiA9IHJlY3VycmVudC51c2VyQ2FsbGJhY2s7XG5cdFx0XHRcdGNvbnN0IHIgPSBzeXN0ZW1SZXN0QXJnc1xuXHRcdFx0XHRcdC5jb25jYXQodGhpcylcblx0XHRcdFx0XHQuY29uY2F0KHJlY3VycmVudC51c2VyUmVzdEFyZ3MpO1xuXHRcdFx0XHRcblx0XHRcdFx0bGV0IHA6IGFueTtcblx0XHRcdFx0XG5cdFx0XHRcdHN3aXRjaCAoci5sZW5ndGgpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjYXNlIDA6IHAgPSBmbigpOyBicmVhaztcblx0XHRcdFx0XHRjYXNlIDE6IHAgPSBmbihyWzBdKTsgYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAyOiBwID0gZm4oclswXSwgclsxXSk7IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgMzogcCA9IGZuKHJbMF0sIHJbMV0sIHJbMl0pOyBicmVhaztcblx0XHRcdFx0XHRjYXNlIDQ6IHAgPSBmbihyWzBdLCByWzFdLCByWzJdLCByWzNdKTsgYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSA1OiBwID0gZm4oclswXSwgclsxXSwgclsyXSwgclszXSwgcls0XSk7IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgNjogcCA9IGZuKHJbMF0sIHJbMV0sIHJbMl0sIHJbM10sIHJbNF0sIHJbNV0pOyBicmVhaztcblx0XHRcdFx0XHRjYXNlIDc6IHAgPSBmbihyWzBdLCByWzFdLCByWzJdLCByWzNdLCByWzRdLCByWzVdLCByWzZdKTsgYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSA4OiBwID0gZm4oclswXSwgclsxXSwgclsyXSwgclszXSwgcls0XSwgcls1XSwgcls2XSwgcls3XSk7IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgOTogcCA9IGZuKHJbMF0sIHJbMV0sIHJbMl0sIHJbM10sIHJbNF0sIHJbNV0sIHJbNl0sIHJbN10sIHJbOF0pOyBicmVhaztcblx0XHRcdFx0XHRjYXNlIDEwOiBwID0gZm4oclswXSwgclsxXSwgclsyXSwgclszXSwgcls0XSwgcls1XSwgcls2XSwgcls3XSwgcls4XSwgcls5XSk7IGJyZWFrO1xuXHRcdFx0XHRcdGRlZmF1bHQ6IHAgPSBmbiguLi5yKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0Ly8gVGhpcyBpcyBhIHF1aWNrIHRlc3QgdG8gYXZvaWQgZG9pbmcgcG9pbnRsZXNzIHdvcmtcblx0XHRcdFx0Ly8gaW4gdGhlIHJlbGF0aXZlbHkgY29tbW9uIGNhc2UgdGhhdCB0aGUgcmVjdXJyZW50XG5cdFx0XHRcdC8vIGRvZXNuJ3QgaGF2ZSBhIHJlbGV2YW50IHJldHVybiB2YWx1ZS5cblx0XHRcdFx0aWYgKHdhc01ldGFzLmxlbmd0aCA+IDAgfHwgcCAhPT0gdW5kZWZpbmVkICYmIHAgIT09IG51bGwpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBub3dNZXRhcyA9IENvcmVVdGlsLnRyYW5zbGF0ZUF0b21zKHRoaXMsIGNvbnRhaW5lck1ldGEsIHApO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChzZWxmLndoZW4pXG5cdFx0XHRcdFx0XHRzZWxmLndoZW4od2FzTWV0YXMsIG5vd01ldGFzLCB0aGlzKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRzZWxmLnJldHVybmVkLmxlbmd0aCA9IDA7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKHJlY3VycmVudC5raW5kICE9PSBSZWN1cnJlbnRLaW5kLm9uY2UpXG5cdFx0XHRcdFx0XHRzZWxmLnJldHVybmVkLnB1c2goLi4udW5yZXNvbHZlUmV0dXJuZWQobm93TWV0YXMpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0aWYgKHJlY3VycmVudC5raW5kID09PSBSZWN1cnJlbnRLaW5kLm9uY2UpXG5cdFx0XHRcdFx0Q29yZVV0aWwudW5hcHBseU1ldGFzKHRoaXMsIFtzZWxmXSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIHRoZSB3cmFwcGVkIHZlcnNpb24gb2YgdGhlIHVzZXIncyBjYWxsYmFjayB0aGF0IGdldHMgYWRkZWRcblx0XHQgKiB0byB0aGUgUmVmbGV4aXZlIGxpYnJhcnkncyB0cmVlIChzdWNoIGFzIHZpYSBhbiBhZGRFdmVudExpc3RlbmVyKCkgY2FsbCkuXG5cdFx0ICovXG5cdFx0Z2V0IHN5c3RlbUNhbGxiYWNrKCk6IFJlY3VycmVudENhbGxiYWNrXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMuX3N5c3RlbUNhbGxiYWNrID09PSBudWxsKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHRoaXMuX3N5c3RlbUNhbGxiYWNrO1xuXHRcdH1cblx0XHRwcml2YXRlIF9zeXN0ZW1DYWxsYmFjazogUmVjdXJyZW50Q2FsbGJhY2s7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQXBwbGllcyB0aGUgc3RyZWFtIG1ldGEgKGFuZCBhbnkgbWV0YXMgdGhhdCBhcmUgc3RyZWFtZWQgZnJvbSBpdFxuXHRcdCAqIGF0IGFueSBwb2ludCBpbiB0aGUgZnV0dXJlKSB0byB0aGUgc3BlY2lmaWVkIGNvbnRhaW5pbmcgYnJhbmNoLlxuXHRcdCAqIFxuXHRcdCAqIFJldHVybnMgdGhlIGlucHV0IHJlZiB2YWx1ZSwgb3IgdGhlIGxhc3Qgc3luY2hyb25vdXNseSBpbnNlcnRlZCBtZXRhLlxuXHRcdCAqL1xuXHRcdGF0dGFjaChjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoLCB0cmFja2VyOiBUcmFja2VyKVxuXHRcdHtcblx0XHRcdHRoaXMuX3N5c3RlbUNhbGxiYWNrID0gdGhpcy5fc3lzdGVtQ2FsbGJhY2suYmluZChjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgbG9jYWxUcmFja2VyID0gdHJhY2tlci5kZXJpdmUoKTtcblx0XHRcdGxvY2FsVHJhY2tlci51cGRhdGUodGhpcy5sb2NhdG9yKTtcblx0XHRcdGNvbnN0IHJlYyA9IHRoaXMucmVjdXJyZW50O1xuXHRcdFx0XG5cdFx0XHR0aGlzLndoZW4gPSAod2FzTWV0YXMsIG5vd01ldGFzKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRpZiAod2FzTWV0YXMubGVuZ3RoKVxuXHRcdFx0XHRcdENvcmVVdGlsLnVuYXBwbHlNZXRhcyhjb250YWluaW5nQnJhbmNoLCB3YXNNZXRhcyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRmb3IgKGNvbnN0IG5vd01ldGEgb2Ygbm93TWV0YXMpXG5cdFx0XHRcdFx0bm93TWV0YS5sb2NhdG9yLnNldENvbnRhaW5lcih0aGlzLmxvY2F0b3IpO1xuXHRcdFx0XHRcblx0XHRcdFx0Q29yZVV0aWwuYXBwbHlNZXRhcyhcblx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdHRoaXMsXG5cdFx0XHRcdFx0bm93TWV0YXMsXG5cdFx0XHRcdFx0bG9jYWxUcmFja2VyKTtcblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdGNvbnN0IHNlbGVjdG9yID0gQXJyYXkuaXNBcnJheShyZWMuc2VsZWN0b3IpID9cblx0XHRcdFx0cmVjLnNlbGVjdG9yIDpcblx0XHRcdFx0W3JlYy5zZWxlY3Rvcl07XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3Qgc2VsZWN0b3JJdGVtIG9mIHNlbGVjdG9yKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoc2VsZWN0b3JJdGVtIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSlcblx0XHRcdFx0XHRGb3JjZVV0aWwuYXR0YWNoRm9yY2Uoc2VsZWN0b3JJdGVtLmNoYW5nZWQsIHRoaXMuc3lzdGVtQ2FsbGJhY2spO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAoaXNTdGF0ZWxlc3NGb3JjZShzZWxlY3Rvckl0ZW0pKVxuXHRcdFx0XHRcdEZvcmNlVXRpbC5hdHRhY2hGb3JjZShzZWxlY3Rvckl0ZW0sIHRoaXMuc3lzdGVtQ2FsbGJhY2spO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBzd2l0Y2ggKHNlbGVjdG9ySXRlbSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNhc2UgbXV0YXRpb24uYW55OiBicmVhaztcblx0XHRcdFx0XHRjYXNlIG11dGF0aW9uLmJyYW5jaDogYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSBtdXRhdGlvbi5icmFuY2hBZGQ6IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgbXV0YXRpb24uYnJhbmNoUmVtb3ZlOiBicmVhaztcblx0XHRcdFx0XHRjYXNlIG11dGF0aW9uLmxlYWY6IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgbXV0YXRpb24ubGVhZkFkZDogYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSBtdXRhdGlvbi5sZWFmUmVtb3ZlOiBicmVhaztcblx0XHRcdFx0XHRkZWZhdWx0OiBSb3V0aW5nTGlicmFyeS50aGlzLmF0dGFjaFJlY3VycmVudChcblx0XHRcdFx0XHRcdHJlYy5raW5kLFxuXHRcdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHRcdHNlbGVjdG9ySXRlbSxcblx0XHRcdFx0XHRcdHRoaXMuc3lzdGVtQ2FsbGJhY2ssXG5cdFx0XHRcdFx0XHR0aGlzLnJlY3VycmVudC51c2VyUmVzdEFyZ3MpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGNvbnN0IGF1dG9ydW5Bcmd1bWVudHMgPSBleHRyYWN0QXV0b3J1bkFyZ3VtZW50cyhyZWMpO1xuXHRcdFx0aWYgKGF1dG9ydW5Bcmd1bWVudHMpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGl0ZW0gPSBzZWxlY3RvclswXTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChpdGVtIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSlcblx0XHRcdFx0XHR0aGlzLmludm9rZUF1dG9ydW5DYWxsYmFjayhbaXRlbS52YWx1ZSwgaXRlbS52YWx1ZV0sIGNvbnRhaW5pbmdCcmFuY2gpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAoaXNTdGF0ZWxlc3NGb3JjZShpdGVtKSlcblx0XHRcdFx0XHR0aGlzLmludm9rZUF1dG9ydW5DYWxsYmFjayhhdXRvcnVuQXJndW1lbnRzLCBjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiBpdGVtID09PSBcInN0cmluZ1wiICYmIGl0ZW0gaW4gUmVmbGV4Lm11dGF0aW9uKVxuXHRcdFx0XHRcdHRoaXMuaW52b2tlQXV0b3J1bkNhbGxiYWNrKFtSZWZsZXgubXV0YXRpb24uYW55XSwgY29udGFpbmluZ0JyYW5jaCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0dGhpcy5pbnZva2VBdXRvcnVuQ2FsbGJhY2soW10sIGNvbnRhaW5pbmdCcmFuY2gpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRkZXRhY2hSZWN1cnJlbnRzKFxuXHRcdFx0YnJhbmNoOiBJQnJhbmNoLFxuXHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdHN5c3RlbUNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9tPilcblx0XHR7XG5cdFx0XHRjb25zdCBsaWIgPSBSb3V0aW5nTGlicmFyeS50aGlzO1xuXHRcdFx0XG5cdFx0XHRpZiAoIUFycmF5LmlzQXJyYXkoc2VsZWN0b3IpKVxuXHRcdFx0XHRsaWIuZGV0YWNoUmVjdXJyZW50KGJyYW5jaCwgc2VsZWN0b3IsIHN5c3RlbUNhbGxiYWNrKTtcblx0XHRcdFxuXHRcdFx0ZWxzZSBmb3IgKGNvbnN0IHNlbGVjdG9yUGFydCBvZiBzZWxlY3Rvcilcblx0XHRcdFx0bGliLmRldGFjaFJlY3VycmVudChicmFuY2gsIHNlbGVjdG9yUGFydCwgc3lzdGVtQ2FsbGJhY2spO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDYWxsIHRoaXMgbWV0aG9kIHRvIGluZGlyZWN0bHkgaW52b2tlIHRoZSBzeXN0ZW1DYWxsYmFjaywgYnV0IGRvbmVcblx0XHQgKiBpbiBhIHdheSB0aGF0IG1ha2VzIGl0IGF3YXJlIHRoYXQgaXQncyBiZWluZyBydW4gdmlhIHRoZSBhdXRvcnVuLlxuXHRcdCAqL1xuXHRcdGludm9rZUF1dG9ydW5DYWxsYmFjayhhcmdzOiBhbnlbXSwgdGhpc0FyZz86IElCcmFuY2gpXG5cdFx0e1xuXHRcdFx0dHJ5XG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuaW5BdXRvUnVuQ29udGV4dCA9IHRydWU7XG5cdFx0XHRcdFxuXHRcdFx0XHR0aGlzQXJnID9cblx0XHRcdFx0XHR0aGlzLnN5c3RlbUNhbGxiYWNrLmFwcGx5KHRoaXNBcmcsIGFyZ3MpIDpcblx0XHRcdFx0XHR0aGlzLnN5c3RlbUNhbGxiYWNrKC4uLmFyZ3MpO1xuXHRcdFx0fVxuXHRcdFx0ZmluYWxseVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmluQXV0b1J1bkNvbnRleHQgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBpbkF1dG9SdW5Db250ZXh0ID0gZmFsc2U7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIGNhbGxiYWNrIHRoYXQgdHJpZ2dlcnMgd2hlbiB0aGUgbmV3IG1ldGFzIGhhdmUgYmVlbiBwcm9jZXNzZWQuXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSB3aGVuOiAoKHdhc01ldGFzOiBNZXRhW10sIG5vd01ldGFzOiBNZXRhW10sIGJyYW5jaDogSUJyYW5jaCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgYW4gYXJyYXkgb2YgdmFsdWVzIHRoYXQgd2VyZSByZXR1cm5lZCBmcm9tIHRoZVxuXHRcdCAqIHJlY3VycmVudCBmdW5jdGlvbiwgaW4gc3RvcmFnaXplZCBmb3JtLlxuXHRcdCAqL1xuXHRcdHByaXZhdGUgcmVhZG9ubHkgcmV0dXJuZWQ6IChNZXRhIHwgTG9jYXRvcilbXSA9IFtdO1xuXHR9XG5cdFxuXHQvKipcblx0ICogUmV0dXJucyBhIG5ldyBhcnJheSB0aGF0IGlzIGEgY29weSBvZiB0aGUgc3BlY2lmaWVkIHJldHVybiBhcnJheSxcblx0ICogZXhjZXB0IHdpdGggdGhlIHVuc2FmZSBtZXRhcyByZXBsYWNlZCB3aXRoIGxvY2F0b3JzLlxuXHQgKi9cblx0ZnVuY3Rpb24gdW5yZXNvbHZlUmV0dXJuZWQocmV0dXJuZWQ6IE1ldGFbXSlcblx0e1xuXHRcdGNvbnN0IHVucmVzb2x2ZWQ6IChNZXRhIHwgTG9jYXRvcilbXSA9IFtdO1xuXHRcdFxuXHRcdGZvciAoY29uc3QgbWV0YSBvZiByZXR1cm5lZClcblx0XHR7XG5cdFx0XHR1bnJlc29sdmVkLnB1c2goXG5cdFx0XHRcdG1ldGEgaW5zdGFuY2VvZiBCcmFuY2hNZXRhIHx8IG1ldGEgaW5zdGFuY2VvZiBMZWFmTWV0YSA/XG5cdFx0XHRcdFx0bWV0YS5sb2NhdG9yIDpcblx0XHRcdFx0XHRtZXRhKTtcblx0XHR9XG5cdFx0XG5cdFx0cmV0dXJuIHVucmVzb2x2ZWQ7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBSZXR1cm5zIGEgbmV3IGFycmF5IHRoYXQgaXMgdGhlIGNvcHkgb2YgdGhlIHNwZWNpZmllZCByZXR1cm4gYXJyYXksXG5cdCAqIGV4Y2VwdCB3aXRoIGFueSBpbnN0YW5jZXMgb2YgTG9jYXRvciByZXBsYWNlZCB3aXRoIHRoZSBhY3R1YWwgbWV0YS5cblx0ICovXG5cdGZ1bmN0aW9uIHJlc29sdmVSZXR1cm5lZChyZXR1cm5lZDogKE1ldGEgfCBMb2NhdG9yKVtdLCBjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoKVxuXHR7XG5cdFx0Y29uc3QgcmVzb2x2ZWQ6IChNZXRhIHwgbnVsbClbXSA9IG5ldyBBcnJheShyZXR1cm5lZC5sZW5ndGgpLmZpbGwobnVsbCk7XG5cdFx0bGV0IGhhc0xvY2F0b3JzID0gZmFsc2U7XG5cdFx0XG5cdFx0Ly8gUHJlLXBvcHVsYXRlIHRoZSByZXNvbHZlZCBhcnJheSB3aXRoIGV2ZXJ5dGhpbmcgdGhhdCBpcyBhbHJlYWR5IGEgbWV0YS5cblx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IHJldHVybmVkLmxlbmd0aDspXG5cdFx0e1xuXHRcdFx0Y29uc3QgciA9IHJldHVybmVkW2ldO1xuXHRcdFx0aWYgKHIgaW5zdGFuY2VvZiBNZXRhKVxuXHRcdFx0XHRyZXNvbHZlZFtpXSA9IHI7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdGhhc0xvY2F0b3JzID0gdHJ1ZTtcblx0XHR9XG5cdFx0XG5cdFx0Ly8gQXZvaWQgaGl0dGluZyB0aGUgbGlicmFyeSBpZiBwb3NzaWJsZVxuXHRcdGlmICghaGFzTG9jYXRvcnMpXG5cdFx0XHRyZXR1cm4gPE1ldGFbXT5yZXR1cm5lZC5zbGljZSgpO1xuXHRcdFxuXHRcdGNvbnN0IGNoaWxkcmVuID0gQXJyYXkuZnJvbShSb3V0aW5nTGlicmFyeS50aGlzLmdldENoaWxkcmVuKGNvbnRhaW5pbmdCcmFuY2gpKTtcblx0XHRcblx0XHRmb3IgKGxldCByZXRJZHggPSAtMTsgKytyZXRJZHggPCByZXR1cm5lZC5sZW5ndGg7KVxuXHRcdHtcblx0XHRcdGNvbnN0IHJldCA9IHJldHVybmVkW3JldElkeF07XG5cdFx0XHRpZiAocmV0IGluc3RhbmNlb2YgTG9jYXRvcilcblx0XHRcdHtcblx0XHRcdFx0Zm9yIChsZXQgY2hpbGRJZHggPSAtMTsgKytjaGlsZElkeCA8IGNoaWxkcmVuLmxlbmd0aDspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBjaGlsZCA9IGNoaWxkcmVuW2NoaWxkSWR4XTtcblx0XHRcdFx0XHRjb25zdCBjaGlsZE1ldGEgPSBcblx0XHRcdFx0XHRcdEJyYW5jaE1ldGEub2YoPGFueT5jaGlsZCkgfHxcblx0XHRcdFx0XHRcdExlYWZNZXRhLm9mKDxhbnk+Y2hpbGQpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmICghY2hpbGRNZXRhKVxuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29uc3QgY21wID0gcmV0LmNvbXBhcmUoY2hpbGRNZXRhLmxvY2F0b3IpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChjbXAgPT09IENvbXBhcmVSZXN1bHQuZXF1YWwpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0cmVzb2x2ZWRbcmV0SWR4XSA9IGNoaWxkTWV0YTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSByZXNvbHZlZFtyZXRJZHhdID0gcmV0O1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gcmVzb2x2ZWQuZmlsdGVyKChyKTogciBpcyBNZXRhID0+IHIgIT09IG51bGwpO1xuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgUHJvbWlzZVN0cmVhbU1ldGEgZXh0ZW5kcyBTdHJlYW1NZXRhXG5cdHtcblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdHJlYWRvbmx5IGNvbnRhaW5lck1ldGE6IENvbnRhaW5lck1ldGEsXG5cdFx0XHRyZWFkb25seSBwcm9taXNlOiBQcm9taXNlPGFueT4pXG5cdFx0e1xuXHRcdFx0c3VwZXIoY29udGFpbmVyTWV0YSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGF0dGFjaChjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoLCB0cmFja2VyOiBUcmFja2VyKVxuXHRcdHtcblx0XHRcdFJlYWR5U3RhdGUuaW5jKCk7XG5cdFx0XHRcblx0XHRcdHRoaXMucHJvbWlzZS50aGVuKHJlc3VsdCA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBjb250YWluaW5nQnJhbmNoTWV0YSA9IEJyYW5jaE1ldGEub2YoY29udGFpbmluZ0JyYW5jaCk7XG5cdFx0XHRcdGlmIChjb250YWluaW5nQnJhbmNoTWV0YSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdENvcmVVdGlsLmFwcGx5TWV0YXMoXG5cdFx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdFx0dGhpcy5jb250YWluZXJNZXRhLFxuXHRcdFx0XHRcdFx0Q29yZVV0aWwudHJhbnNsYXRlQXRvbXMoXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2hNZXRhLFxuXHRcdFx0XHRcdFx0XHRyZXN1bHQpLFxuXHRcdFx0XHRcdFx0dHJhY2tlcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdFJlYWR5U3RhdGUuZGVjKCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBBc3luY0l0ZXJhYmxlU3RyZWFtTWV0YSBleHRlbmRzIFN0cmVhbU1ldGFcblx0e1xuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cmVhZG9ubHkgY29udGFpbmVyTWV0YTogQ29udGFpbmVyTWV0YSxcblx0XHRcdHJlYWRvbmx5IGl0ZXJhdG9yOiBBc3luY0l0ZXJhYmxlPGFueT4pXG5cdFx0e1xuXHRcdFx0c3VwZXIoY29udGFpbmVyTWV0YSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgdGhlIGlucHV0IHJlZiB2YWx1ZSwgb3IgdGhlIGxhc3Qgc3luY2hyb25vdXNseSBpbnNlcnRlZCBtZXRhLlxuXHRcdCAqL1xuXHRcdGF0dGFjaChjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoLCB0cmFja2VyOiBUcmFja2VyKVxuXHRcdHtcblx0XHRcdFJlYWR5U3RhdGUuaW5jKCk7XG5cdFx0XHRcblx0XHRcdChhc3luYyAoKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBsb2NhbFRyYWNrZXIgPSB0cmFja2VyLmRlcml2ZSgpO1xuXHRcdFx0XHRsb2NhbFRyYWNrZXIudXBkYXRlKHRoaXMubG9jYXRvcik7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBicmFuY2hNZXRhID0gQnJhbmNoTWV0YS5vZihjb250YWluaW5nQnJhbmNoKSE7XG5cdFx0XHRcdFxuXHRcdFx0XHRmb3IgYXdhaXQgKGNvbnN0IGl0ZXJhYmxlUmVzdWx0IG9mIHRoaXMuaXRlcmF0b3IpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCByZXN1bHRNZXRhcyA9IENvcmVVdGlsLnRyYW5zbGF0ZUF0b21zKFxuXHRcdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHRcdGJyYW5jaE1ldGEsXG5cdFx0XHRcdFx0XHRpdGVyYWJsZVJlc3VsdCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Zm9yIChjb25zdCByZXN1bHRNZXRhIG9mIHJlc3VsdE1ldGFzKVxuXHRcdFx0XHRcdFx0cmVzdWx0TWV0YS5sb2NhdG9yLnNldENvbnRhaW5lcih0aGlzLmxvY2F0b3IpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdENvcmVVdGlsLmFwcGx5TWV0YXMoXG5cdFx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdFx0dGhpcyxcblx0XHRcdFx0XHRcdHJlc3VsdE1ldGFzLFxuXHRcdFx0XHRcdFx0bG9jYWxUcmFja2VyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0UmVhZHlTdGF0ZS5kZWMoKTtcblx0XHRcdH0pKCk7XG5cdFx0fVxuXHR9XG59XG4iLCJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJNZXRhL01ldGEudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk1ldGEvQnJhbmNoTWV0YS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTWV0YS9MZWFmTWV0YS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTWV0YS9SZWN1cnJlbnRTdHJlYW1NZXRhLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJNZXRhL1Byb21pc2VTdHJlYW1NZXRhLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJNZXRhL0FzeW5jSXRlcmFibGVTdHJlYW1NZXRhLnRzXCIgLz5cbiIsIlxubmFtZXNwYWNlIFJlZmxleFxue1xuXHR0eXBlIFNvcnRGdW5jdGlvbjxUID0gYW55PiA9IChhOiBULCBiOiBUKSA9PiBudW1iZXI7XG5cdHR5cGUgRmlsdGVyRnVuY3Rpb248VCA9IGFueT4gPSAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IGJvb2xlYW47XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQXJyYXlGb3JjZTxUPiBpbXBsZW1lbnRzIEFycmF5PFQ+XG5cdHtcblx0XHQvKiogKi9cblx0XHRzdGF0aWMgY3JlYXRlPFQ+KGl0ZW1zOiBUW10pXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RvcmUgPSBuZXcgQ29yZS5BcnJheVN0b3JlPFQ+KCk7XG5cdFx0XHRjb25zdCB2aWV3ID0gbmV3IEFycmF5Rm9yY2Uoc3RvcmUpO1xuXHRcdFx0dmlldy5wdXNoKC4uLml0ZW1zKTtcblx0XHRcdHJldHVybiB2aWV3LnByb3h5KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdFtuOiBudW1iZXJdOiBUO1xuXHRcdFxuXHRcdHJlYWRvbmx5IGFkZGVkID0gZm9yY2U8KGl0ZW06IFQsIHBvc2l0aW9uOiBudW1iZXIpID0+IHZvaWQ+KCk7XG5cdFx0cmVhZG9ubHkgcmVtb3ZlZCA9IGZvcmNlPChpdGVtOiBULCBwb3NpdGlvbjogbnVtYmVyLCBpZDogbnVtYmVyKSA9PiB2b2lkPigpO1xuXHRcdHJlYWRvbmx5IG1vdmVkID0gZm9yY2U8KGUxOiBULCBlMjogVCwgaTE6IG51bWJlciwgaTI6IG51bWJlcikgPT4gdm9pZD4oKTtcblx0XHRyZWFkb25seSB0YWlsQ2hhbmdlID0gZm9yY2U8KGl0ZW06IFQsIHBvc2l0aW9uOiBudW1iZXIpID0+IHZvaWQ+KCk7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVhZG9ubHkgcG9zaXRpb25zOiBudW1iZXJbXSA9IFtdO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlYWRvbmx5IHJvb3Q6IENvcmUuQXJyYXlTdG9yZTxUPjtcblx0XHRcblx0XHQvKiogKi9cblx0XHRjb25zdHJ1Y3Rvcihyb290OiBDb3JlLkFycmF5U3RvcmU8VD4gfCBBcnJheUZvcmNlPFQ+KVxuXHRcdHtcblx0XHRcdGlmIChyb290IGluc3RhbmNlb2YgQ29yZS5BcnJheVN0b3JlKVxuXHRcdFx0e1x0XG5cdFx0XHRcdHRoaXMucm9vdCA9IHJvb3Q7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIFxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnJvb3QgPSByb290LnJvb3Q7XG5cdFx0XHRcdFxuXHRcdFx0XHRDb3JlLkZvcmNlVXRpbC5hdHRhY2hGb3JjZShyb290LmFkZGVkLCAoaXRlbTogVCwgaW5kZXg6IG51bWJlcikgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuaW5zZXJ0UmVmKGluZGV4LCByb290LnBvc2l0aW9uc1tpbmRleF0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0XG5cdFx0XHRcdENvcmUuRm9yY2VVdGlsLmF0dGFjaEZvcmNlKHJvb3QucmVtb3ZlZCwgKGl0ZW06IFQsIGluZGV4OiBudW1iZXIsIGlkOiBudW1iZXIpID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBsb2MgPSB0aGlzLnBvc2l0aW9ucy5pbmRleE9mKGlkKTtcblx0XHRcdFx0XHRpZiAobG9jID4gLTEpIFxuXHRcdFx0XHRcdFx0dGhpcy5zcGxpY2UobG9jLCAxKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRDb3JlLkZvcmNlVXRpbC5hdHRhY2hGb3JjZSh0aGlzLnJvb3QuY2hhbmdlZCwgKCkgPT4gXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZXhlY3V0ZUZpbHRlcigpO1xuXHRcdFx0XHR0aGlzLmV4ZWN1dGVTb3J0KCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRwcml2YXRlIHNvcnRGbj86IChhOiBULCBiOiBUKSA9PiBudW1iZXI7XG5cdFx0cHJpdmF0ZSBmaWx0ZXJGbj86ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IEFycmF5Rm9yY2U8VD4pID0+IGJvb2xlYW47XG5cblx0XHQvKiogXG5cdFx0ICogQGludGVybmFsXG5cdFx0ICovXG5cdFx0YXNzaWduU29ydGVyKHNvcnRGbjogKGE6IFQsIGI6IFQpID0+IG51bWJlcilcblx0XHR7XG5cdFx0XHR0aGlzLnNvcnRGbiA9IHNvcnRGbjtcblx0XHRcdHRoaXMuZXhlY3V0ZVNvcnQoKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblxuXHRcdC8qKiBcblx0XHQgKiBAaW50ZXJuYWxcblx0XHQgKi9cblx0XHRhc3NpZ25GaWx0ZXIoZmlsdGVyRm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IEFycmF5Rm9yY2U8VD4pID0+IGJvb2xlYW4pXG5cdFx0e1xuXHRcdFx0dGhpcy5maWx0ZXJGbiA9IGZpbHRlckZuO1xuXHRcdFx0dGhpcy5leGVjdXRlRmlsdGVyKCk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJvdGVjdGVkIGV4ZWN1dGVGaWx0ZXIoKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLmZpbHRlckZuKVxuXHRcdFx0e1xuXHRcdFx0XHRmb3IgKGxldCBpID0gdGhpcy5wb3NpdGlvbnMubGVuZ3RoOyAtLWkgPj0gMDspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBwb3NpdGlvbiA9IHRoaXMucG9zaXRpb25zW2ldO1xuXHRcdFx0XHRcdGlmICghdGhpcy5maWx0ZXJGbih0aGlzLmdldFJvb3QocG9zaXRpb24pLCBpLCB0aGlzKSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBsb2MgPSB0aGlzLnBvc2l0aW9ucy5pbmRleE9mKHBvc2l0aW9uKTtcblx0XHRcdFx0XHRcdGlmIChsb2MgPiAtMSkgXG5cdFx0XHRcdFx0XHRcdHRoaXMuc3BsaWNlKGxvYywgMSk7XG5cdFx0XHRcdFx0XHRlbHNlIFxuXHRcdFx0XHRcdFx0XHRkZWJ1Z2dlcjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRwcm90ZWN0ZWQgZXhlY3V0ZVNvcnQoKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLnNvcnRGbilcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgYXJyYXkgPSB0aGlzLnBvc2l0aW9ucztcblx0XHRcdFx0Y29uc3QgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuXHRcdFx0XHRjb25zdCBsYXN0SXRlbSA9IGFycmF5W2xlbmd0aCAtIDFdO1xuXHRcdFx0XHRcblx0XHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCBsZW5ndGggLSAxOylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGxldCBjaGFuZ2VkID0gZmFsc2U7XG5cdFx0XHRcdFx0Zm9yIChsZXQgbiA9IC0xOyArK24gPCBsZW5ndGggLSAoaSArIDEpOylcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5zb3J0Rm4odGhpcy5nZXQobikhLCB0aGlzLmdldChuICsgMSkhKSA+IDApXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGNoYW5nZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRbYXJyYXlbbl0sIGFycmF5W24gKyAxXV0gPSBbYXJyYXlbbiArIDFdLCBhcnJheVtuXV07XG5cdFx0XHRcdFx0XHRcdHRoaXMubW92ZWQodGhpcy5nZXQobikhLCB0aGlzLmdldChuICsgMSkhLCBuLCBuICsgMSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCFjaGFuZ2VkKVxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IG5ld0xhc3RJdGVtID0gYXJyYXlbbGVuZ3RoIC0gMV07XG5cdFx0XHRcdGlmIChsYXN0SXRlbSAhPT0gbmV3TGFzdEl0ZW0pXG5cdFx0XHRcdFx0dGhpcy50YWlsQ2hhbmdlKHRoaXMuZ2V0KGxlbmd0aCAtIDEpISwgbGVuZ3RoIC0gMSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0cHJvdGVjdGVkIGZpbHRlclB1c2goLi4uaXRlbXM6IFRbXSlcblx0XHR7XG5cdFx0XHRpZiAodGhpcy5maWx0ZXJGbilcblx0XHRcdFx0cmV0dXJuIGl0ZW1zXG5cdFx0XHRcdFx0LmZpbHRlcigodmFsdWUsIGluZGV4KSA9PiB0aGlzLmZpbHRlckZuISh2YWx1ZSwgaW5kZXgsIHRoaXMpKVxuXHRcdFx0XHRcdC5tYXAoeCA9PiB0aGlzLnJvb3QucHVzaCh4KSk7XG5cblx0XHRcdHJldHVybiBpdGVtcy5tYXAoeCA9PiB0aGlzLnJvb3QucHVzaCh4KSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIERlZmluZXMgZ2V0dGVyIGFuZCBzZXR0ZXIgZm9yIGluZGV4IG51bWJlciBwcm9wZXJ0aWVzIGV4LiBhcnJbNV1cblx0XHQgKi9cblx0XHRwcml2YXRlIGRlZmluZUluZGV4KGluZGV4OiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0aWYgKCFcIk5PUFJPWFlcIilcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XG5cdFx0XHRpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCBpbmRleCkpXG5cdFx0XHR7XHRcblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIGluZGV4LCB7XG5cdFx0XHRcdFx0Z2V0KClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5nZXQoaW5kZXgpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0c2V0KHZhbHVlOiBhbnkpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuc2V0KGluZGV4LCB2YWx1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvKiogXG5cdFx0ICogQGludGVybmFsXG5cdFx0ICogSW5zZXJ0cyBwb3NpdGlvbnMgZnJvbSBwYXJhbWV0ZXJzIGludG8gcG9zaXRpb25zIGFycmF5IG9mIHRoaXNcblx0XHQgKiBBbGwgcG9zaXRpb25zIGFyZSBmaWx0ZXJlZCBpZiB0aGVyZSBpcyBhIGZpbHRlciBmdW5jdGlvbiBhc3NpZ25lZCB0byB0aGlzXG5cdFx0ICogVHJpZ2dlcnMgdGhlIGFkZGVkIEZvcmNlXG5cdFx0ICogRGVmaW5lcyBpbmRleCBmb3IgcHJvY2Vzc2VkIGxvY2F0aW9uc1xuXHRcdCAqL1xuXHRcdHByb3RlY3RlZCBpbnNlcnRSZWYoc3RhcnQ6IG51bWJlciwgLi4ucG9zaXRpb25zOiBudW1iZXJbXSlcblx0XHR7XG5cdFx0XHRjb25zdCBmaWx0ZXJlZCA9IHRoaXMuZmlsdGVyRm4gP1xuXHRcdFx0XHRwb3NpdGlvbnMuZmlsdGVyKCh2YWx1ZSwgaW5kZXgpID0+IFxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyRm4hKHRoaXMuZ2V0Um9vdCh2YWx1ZSksIHN0YXJ0ICsgaW5kZXgsIHRoaXMpKSA6XG5cdFx0XHRcdHBvc2l0aW9ucztcblx0XHRcdFxuXHRcdFx0dGhpcy5wb3NpdGlvbnMuc3BsaWNlKHN0YXJ0LCAwLCAuLi5maWx0ZXJlZCk7XG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgZmlsdGVyZWQubGVuZ3RoOylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgaXRlbSA9IGZpbHRlcmVkW2ldO1xuXHRcdFx0XHRjb25zdCBsb2MgPSBzdGFydCArIGk7XG5cdFx0XHRcdGNvbnNvbGUubG9nKHRoaXMuZ2V0Um9vdChpdGVtKSwgbG9jKTtcblx0XHRcdFx0dGhpcy5hZGRlZCh0aGlzLmdldFJvb3QoaXRlbSksIGxvYyk7XG5cdFx0XHRcdHRoaXMuZGVmaW5lSW5kZXgobG9jKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0dGhpcy5leGVjdXRlU29ydCgpOyBcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Z2V0IGxlbmd0aCgpIFxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0c2V0IGxlbmd0aChpOiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0dGhpcy5zcGxpY2UoaSwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoIC0gaSk7XG5cdFx0XHR0aGlzLnBvc2l0aW9ucy5sZW5ndGggPSBpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogXG5cdFx0ICogQGludGVybmFsXG5cdFx0ICovXG5cdFx0cHJveHkoKVxuXHRcdHtcblx0XHRcdGlmIChcIk5PUFJPWFlcIikgXG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0XG5cdFx0XHRpZiAoIXRoaXMuX3Byb3h5KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9wcm94eSA9IG5ldyBQcm94eSh0aGlzLCB7XG5cdFx0XHRcdFx0Z2V0KHRhcmdldCwgcHJvcDogRXh0cmFjdDxrZXlvZiBBcnJheUZvcmNlPFQ+LCBzdHJpbmc+KVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGNvbnN0IGluZGV4ID0gcGFyc2VJbnQocHJvcCwgMTApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGluZGV4ICE9PSBpbmRleCA/IHRhcmdldFtwcm9wXSA6IHRhcmdldC5nZXQoaW5kZXgpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0c2V0KHRhcmdldCwgcHJvcDogRXh0cmFjdDxrZXlvZiBBcnJheUZvcmNlPFQ+LCBzdHJpbmc+LCB2YWx1ZTogVClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBpbmRleCA9IHBhcnNlSW50KHByb3AsIDEwKTtcblx0XHRcdFx0XHRcdGlmIChpbmRleCAhPT0gaW5kZXgpXG5cdFx0XHRcdFx0XHRcdHRhcmdldC5zZXQoaW5kZXgsIHZhbHVlKTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pIGFzIEFycmF5Rm9yY2U8VD47XG5cdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0cmV0dXJuIHRoaXMuX3Byb3h5O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIF9wcm94eT86IEFycmF5Rm9yY2U8VD47XG5cblx0XHQvKiogKi9cblx0XHRnZXQoaW5kZXg6IG51bWJlcilcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRSb290KHRoaXMucG9zaXRpb25zW2luZGV4XSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgZ2V0Um9vdChpbmRleDogbnVtYmVyKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnJvb3QuZ2V0KGluZGV4KSE7XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0c2V0KGluZGV4OiBudW1iZXIsIHZhbHVlOiBUKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLmZpbHRlckZuKVxuXHRcdFx0XHRpZiAoIXRoaXMuZmlsdGVyRm4odmFsdWUsIGluZGV4LCB0aGlzKSlcblx0XHRcdFx0XHR0aGlzLnBvc2l0aW9ucy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0XHRcdFxuXHRcdFx0dGhpcy5yb290LnNldCh0aGlzLnBvc2l0aW9uc1tpbmRleF0sIHZhbHVlKTtcblx0XHR9XG5cblx0XHQvKiogXG5cdFx0ICogUmV0dXJucyBzbmFwc2hvdCBvZiB0aGlzIGFzIGEganMgYXJyYXkgXG5cdFx0ICovXG5cdFx0c25hcHNob3QoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnBvc2l0aW9ucy5tYXAoeCA9PiB0aGlzLmdldFJvb3QoeCkpO1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdHRvU3RyaW5nKCk6IHN0cmluZ1xuXHRcdHtcblx0XHRcdHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLnNuYXBzaG90KCkpO1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdHRvTG9jYWxlU3RyaW5nKCk6IHN0cmluZ1xuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnRvU3RyaW5nKCk7XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0Y29uY2F0KC4uLml0ZW1zOiBDb25jYXRBcnJheTxUPltdKTogVFtdO1xuXHRcdGNvbmNhdCguLi5pdGVtczogKFQgfCBDb25jYXRBcnJheTxUPilbXSk6IFRbXTtcblx0XHRjb25jYXQoLi4uaXRlbXM6IGFueVtdKVxuXHRcdHtcblx0XHRcdGNvbnN0IGFycmF5ID0gQXJyYXlGb3JjZS5jcmVhdGU8VD4odGhpcy5zbmFwc2hvdCgpIGFzIFRbXSk7XG5cdFx0XHRhcnJheS5wdXNoKC4uLml0ZW1zKTtcblx0XHRcdHJldHVybiBhcnJheS5wcm94eSgpO1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdGpvaW4oc2VwYXJhdG9yPzogc3RyaW5nIHwgdW5kZWZpbmVkKTogc3RyaW5nXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuc25hcHNob3QoKS5qb2luKHNlcGFyYXRvcik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJldmVyc2UoKVxuXHRcdHtcblx0XHRcdHRoaXMucG9zaXRpb25zLnJldmVyc2UoKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRzbGljZShzdGFydD86IG51bWJlciB8IHVuZGVmaW5lZCwgZW5kPzogbnVtYmVyIHwgdW5kZWZpbmVkKTogVFtdXG5cdFx0e1xuXHRcdFx0Y29uc3QgYXJyYXkgPSBuZXcgQXJyYXlGb3JjZSh0aGlzLnJvb3QpO1xuXHRcdFx0YXJyYXkuaW5zZXJ0UmVmKDAsIC4uLnRoaXMucG9zaXRpb25zLnNsaWNlKHN0YXJ0LCBlbmQpKTtcblx0XHRcdHJldHVybiBhcnJheS5wcm94eSgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRzb3J0KGNvbXBhcmVGbjogU29ydEZ1bmN0aW9uPFQ+LCAuLi5mb3JjZXM6IEFycmF5PFN0YXRlbGVzc0ZvcmNlIHwgU3RhdGVmdWxGb3JjZT4pOiB0aGlzXG5cdFx0e1xuXHRcdFx0Y29uc3QgYXJyYXkgPSBuZXcgQXJyYXlGb3JjZSh0aGlzKTtcblx0XHRcdGFycmF5LnNvcnRGbiA9IGNvbXBhcmVGbjtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBmbyBvZiBmb3JjZXMpXG5cdFx0XHRcdENvcmUuRm9yY2VVdGlsLmF0dGFjaEZvcmNlKFxuXHRcdFx0XHRcdGZvIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSA/XG5cdFx0XHRcdFx0XHRmby5jaGFuZ2VkIDogZm8sIGFycmF5LmV4ZWN1dGVTb3J0XG5cdFx0XHRcdCk7XG5cdFx0XHRcdFxuXHRcdFx0YXJyYXkuaW5zZXJ0UmVmKDAsIC4uLnRoaXMucG9zaXRpb25zKTtcblx0XHRcdHJldHVybiBhcnJheS5wcm94eSgpIGFzIHRoaXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGluZGV4T2Yoc2VhcmNoRWxlbWVudDogVCwgZnJvbUluZGV4ID0gMCk6IG51bWJlclxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSBmcm9tSW5kZXggLSAxOyArK2kgPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7KVxuXHRcdFx0XHRpZiAodGhpcy5nZXQoaSkgPT09IHNlYXJjaEVsZW1lbnQpIFxuXHRcdFx0XHRcdHJldHVybiBpO1xuXHRcdFx0XHRcdFxuXHRcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRsYXN0SW5kZXhPZihzZWFyY2hFbGVtZW50OiBULCBmcm9tSW5kZXg/OiBudW1iZXIgfCB1bmRlZmluZWQpOiBudW1iZXJcblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gZnJvbUluZGV4IHx8IHRoaXMucG9zaXRpb25zLmxlbmd0aDsgLS1pID4gLTE7KVxuXHRcdFx0XHRpZiAodGhpcy5nZXQoaSkgPT09IHNlYXJjaEVsZW1lbnQpIFxuXHRcdFx0XHRcdHJldHVybiBpO1xuXHRcdFx0XHRcdFxuXHRcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRldmVyeShjYWxsYmFja0ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHVua25vd24sIHRoaXNBcmc/OiBhbnkpOiBib29sZWFuXG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7KVxuXHRcdFx0XHRpZiAoIWNhbGxiYWNrRm4uY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHRoaXMuZ2V0KGkpLCBpLCB0aGlzKSkgXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHNvbWUoY2FsbGJhY2tGbjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiB1bmtub3duLCB0aGlzQXJnPzogYW55KTogYm9vbGVhblxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0aWYgKGNhbGxiYWNrRm4uY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHRoaXMuZ2V0KGkpISwgaSwgdGhpcykpIFxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRmb3JFYWNoKGNhbGxiYWNrRm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdm9pZCwgdGhpc0FyZz86IGFueSk6IHZvaWRcblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IHRoaXMucG9zaXRpb25zLmxlbmd0aDspXG5cdFx0XHRcdGNhbGxiYWNrRm4uY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHRoaXMuZ2V0KGkpLCBpLCB0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bWFwPFU+KGNhbGxiYWNrRm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSwgdGhpc0FyZz86IGFueSk6IFVbXVxuXHRcdHtcblx0XHRcdHJldHVybiBBcnJheUZvcmNlLmNyZWF0ZShcblx0XHRcdFx0dGhpcy5wb3NpdGlvbnNcblx0XHRcdFx0XHQubWFwKHggPT4gdGhpcy5nZXRSb290KHgpKVxuXHRcdFx0XHRcdC5tYXAoKHZhbHVlLCBpbmRleCkgPT4gY2FsbGJhY2tGbi5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdmFsdWUsIGluZGV4LCB0aGlzKSlcblx0XHRcdCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZpbHRlcjxTIGV4dGVuZHMgVD4oY2FsbGJhY2tGbjogRmlsdGVyRnVuY3Rpb248VD4sIC4uLmZvcmNlOiBBcnJheTxTdGF0ZWZ1bEZvcmNlIHwgU3RhdGVsZXNzRm9yY2U+KTogQXJyYXlGb3JjZTxTPjtcblx0XHRmaWx0ZXIoY2FsbGJhY2tGbjogRmlsdGVyRnVuY3Rpb248VD4sIC4uLmZvcmNlOiBBcnJheTxTdGF0ZWZ1bEZvcmNlIHwgU3RhdGVsZXNzRm9yY2U+KTogQXJyYXlGb3JjZTxUPjtcblx0XHRmaWx0ZXIoY2FsbGJhY2tGbjogRmlsdGVyRnVuY3Rpb248VD4sIC4uLmZvcmNlczogQXJyYXk8U3RhdGVmdWxGb3JjZSB8IFN0YXRlbGVzc0ZvcmNlPilcblx0XHR7XG5cdFx0XHRjb25zdCBhcnJheSA9IG5ldyBBcnJheUZvcmNlKHRoaXMpO1xuXHRcdFx0YXJyYXkuZmlsdGVyRm4gPSBjYWxsYmFja0ZuO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGZvIG9mIGZvcmNlcylcblx0XHRcdHtcblx0XHRcdFx0Q29yZS5Gb3JjZVV0aWwuYXR0YWNoRm9yY2UoZm8gaW5zdGFuY2VvZiBTdGF0ZWZ1bEZvcmNlID8gZm8uY2hhbmdlZCA6IGZvLCAoKSA9PiBcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGFycmF5LmV4ZWN1dGVGaWx0ZXIoKTtcblx0XHRcdFx0XHR0aGlzLnBvc2l0aW9ucy5mb3JFYWNoKCh4LCBpKSA9PiBcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAoYXJyYXkuZmlsdGVyRm4hKHRoaXMuZ2V0Um9vdCh4KSwgaSwgdGhpcykgJiYgIWFycmF5LnBvc2l0aW9ucy5pbmNsdWRlcyh4KSkgXG5cdFx0XHRcdFx0XHRcdGFycmF5Lmluc2VydFJlZihpLCB4KTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGFycmF5Lmluc2VydFJlZigwLCAuLi50aGlzLnBvc2l0aW9ucyk7XG5cdFx0XHRyZXR1cm4gYXJyYXkucHJveHkoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVkdWNlKGNhbGxiYWNrRm46IChwcmV2aW91c1ZhbHVlOiBULCBjdXJyZW50VmFsdWU6IFQsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBUKTogVDtcblx0XHRyZWR1Y2UoY2FsbGJhY2tGbjogKHByZXZpb3VzVmFsdWU6IFQsIGN1cnJlbnRWYWx1ZTogVCwgY3VycmVudEluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFQsIGluaXRpYWxWYWx1ZTogVCk6IFQ7XG5cdFx0cmVkdWNlPFU+KGNhbGxiYWNrRm46IChwcmV2aW91c1ZhbHVlOiBVLCBjdXJyZW50VmFsdWU6IFQsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVLCBpbml0aWFsVmFsdWU6IFUpOiBVO1xuXHRcdHJlZHVjZShjYWxsYmFja0ZuOiBhbnksIGluaXRpYWxWYWx1ZT86IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wb3NpdGlvbnNcblx0XHRcdFx0LnJlZHVjZSgocHJldiwgY3VyciwgY2kpID0+IGNhbGxiYWNrRm4ocHJldiwgdGhpcy5nZXQoY3VyciksIGNpLCB0aGlzKSwgaW5pdGlhbFZhbHVlKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVkdWNlUmlnaHQoY2FsbGJhY2tGbjogKHByZXZpb3VzVmFsdWU6IFQsIGN1cnJlbnRWYWx1ZTogVCwgY3VycmVudEluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFQpOiBUO1xuXHRcdHJlZHVjZVJpZ2h0KGNhbGxiYWNrRm46IChwcmV2aW91c1ZhbHVlOiBULCBjdXJyZW50VmFsdWU6IFQsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBULCBpbml0aWFsVmFsdWU6IFQpOiBUO1xuXHRcdHJlZHVjZVJpZ2h0PFU+KGNhbGxiYWNrRm46IChwcmV2aW91c1ZhbHVlOiBVLCBjdXJyZW50VmFsdWU6IFQsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVLCBpbml0aWFsVmFsdWU6IFUpOiBVO1xuXHRcdHJlZHVjZVJpZ2h0KGNhbGxiYWNrRm46IGFueSwgaW5pdGlhbFZhbHVlPzogYW55KVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnBvc2l0aW9uc1xuXHRcdFx0XHQucmVkdWNlUmlnaHQoKHByZXYsIGN1cnIsIGNpKSA9PiBjYWxsYmFja0ZuKHByZXYsIHRoaXMuZ2V0KGN1cnIpLCBjaSwgdGhpcyksIGluaXRpYWxWYWx1ZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZpbmQ8UyBleHRlbmRzIFQ+KHByZWRpY2F0ZTogKHRoaXM6IHZvaWQsIHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBvYmo6IFRbXSkgPT4gdmFsdWUgaXMgUywgdGhpc0FyZz86IGFueSk6IFMgfCB1bmRlZmluZWQ7XG5cdFx0ZmluZChwcmVkaWNhdGU6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgb2JqOiBUW10pID0+IHVua25vd24sIHRoaXNBcmc/OiBhbnkpOiBUIHwgdW5kZWZpbmVkO1xuXHRcdGZpbmQocHJlZGljYXRlOiBhbnksIHRoaXNBcmc/OiBhbnkpXG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7KVxuXHRcdFx0XHRpZiAocHJlZGljYXRlLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB0aGlzLmdldChpKSEsIGksIHRoaXMpKSBcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5nZXQoaSkhO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRmaW5kSW5kZXgocHJlZGljYXRlOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIG9iajogVFtdKSA9PiB1bmtub3duLCB0aGlzQXJnPzogYW55KTogbnVtYmVyXG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7KVxuXHRcdFx0XHRpZiAocHJlZGljYXRlLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB0aGlzLmdldChpKSEsIGksIHRoaXMpKSBcblx0XHRcdFx0XHRyZXR1cm4gaTtcblx0XHRcdFx0XHRcblx0XHRcdHJldHVybiAtMTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZmlsbCh2YWx1ZTogVCwgc3RhcnQ/OiBudW1iZXIgfCB1bmRlZmluZWQsIGVuZD86IG51bWJlciB8IHVuZGVmaW5lZCk6IHRoaXNcblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gKHN0YXJ0IHx8IDApIC0gMTsgKytpIDwgKGVuZCB8fCB0aGlzLnBvc2l0aW9ucy5sZW5ndGgpOylcblx0XHRcdFx0dGhpcy5zZXQoaSwgdmFsdWUpO1xuXHRcdFx0XHRcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRjb3B5V2l0aGluKHRhcmdldDogbnVtYmVyLCBzdGFydDogbnVtYmVyLCBlbmQ/OiBudW1iZXIgfCB1bmRlZmluZWQpOiB0aGlzXG5cdFx0e1xuXHRcdFx0dGhpcy5wb3NpdGlvbnMuY29weVdpdGhpbih0YXJnZXQsIHN0YXJ0LCBlbmQpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdCpbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+XG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7KVxuXHRcdFx0XHR5aWVsZCB0aGlzLmdldChpKSE7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdCplbnRyaWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8W251bWJlciwgVF0+XG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7KVxuXHRcdFx0XHR5aWVsZCBbaSwgdGhpcy5nZXQoaSkhXTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0KmtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxudW1iZXI+XG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7KVxuXHRcdFx0XHR5aWVsZCBpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHQqdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD5cblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IHRoaXMucG9zaXRpb25zLmxlbmd0aDspXG5cdFx0XHRcdHlpZWxkIHRoaXMuZ2V0KGkpITtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0W1N5bWJvbC51bnNjb3BhYmxlc10oKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnBvc2l0aW9uc1tTeW1ib2wudW5zY29wYWJsZXNdKCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGluY2x1ZGVzKHNlYXJjaEVsZW1lbnQ6IFQsIGZyb21JbmRleDogbnVtYmVyID0gMCk6IGJvb2xlYW5cblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gZnJvbUluZGV4IC0gMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0aWYgKHRoaXMuZ2V0KGkpID09PSBzZWFyY2hFbGVtZW50KSBcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZmxhdE1hcDxVLCBUaGlzID0gdW5kZWZpbmVkPihcblx0XHRcdGNhbGxiYWNrOiAodGhpczogVGhpcywgdmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUgfCByZWFkb25seSBVW10sIFxuXHRcdFx0dGhpc0FyZz86IFRoaXMgfCB1bmRlZmluZWQpOiBVW11cblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5zbmFwc2hvdCgpLmZsYXRNYXAoY2FsbGJhY2ssIHRoaXNBcmcpOyBcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZmxhdDxVPih0aGlzOiBVW11bXVtdW11bXVtdW11bXSwgZGVwdGg6IDcpOiBVW107XG5cdFx0ZmxhdDxVPih0aGlzOiBVW11bXVtdW11bXVtdW10sIGRlcHRoOiA2KTogVVtdO1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW11bXVtdW11bXSwgZGVwdGg6IDUpOiBVW107XG5cdFx0ZmxhdDxVPih0aGlzOiBVW11bXVtdW11bXSwgZGVwdGg6IDQpOiBVW107XG5cdFx0ZmxhdDxVPih0aGlzOiBVW11bXVtdW10sIGRlcHRoOiAzKTogVVtdO1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW11bXSwgZGVwdGg6IDIpOiBVW107XG5cdFx0ZmxhdDxVPih0aGlzOiBVW11bXSwgZGVwdGg/OiAxIHwgdW5kZWZpbmVkKTogVVtdO1xuXHRcdGZsYXQ8VT4odGhpczogVVtdLCBkZXB0aDogMCk6IFVbXTtcblx0XHRmbGF0PFU+KGRlcHRoPzogbnVtYmVyIHwgdW5kZWZpbmVkKTogYW55W107XG5cdFx0ZmxhdChkZXB0aD86IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5zbmFwc2hvdCgpLmZsYXQoZGVwdGgpO1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdHB1c2goLi4uaXRlbXM6IFRbXSlcblx0XHR7XG5cdFx0XHR0aGlzLmluc2VydFJlZih0aGlzLmxlbmd0aCwgLi4udGhpcy5maWx0ZXJQdXNoKC4uLml0ZW1zKSk7XG5cdFx0XHRyZXR1cm4gdGhpcy5wb3NpdGlvbnMubGVuZ3RoO1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdHBvcCgpXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMucG9zaXRpb25zLmxlbmd0aCA8IDEpIFxuXHRcdFx0XHRyZXR1cm4gdm9pZCAwO1xuXHRcdFx0XHRcblx0XHRcdGNvbnN0IHBvcyA9IHRoaXMucG9zaXRpb25zLnBvcCgpITtcblx0XHRcdGNvbnN0IGl0ZW0gPSB0aGlzLmdldFJvb3QocG9zKTtcblx0XHRcdHRoaXMucmVtb3ZlZChpdGVtISwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoLCBwb3MpO1xuXHRcdFx0dGhpcy5yb290LmRlbGV0ZShwb3MpO1xuXHRcdFx0cmV0dXJuIGl0ZW07XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0dW5zaGlmdCguLi5pdGVtczogVFtdKVxuXHRcdHtcblx0XHRcdHRoaXMuaW5zZXJ0UmVmKDAsIC4uLnRoaXMuZmlsdGVyUHVzaCguLi5pdGVtcykpO1xuXHRcdFx0cmV0dXJuIHRoaXMucG9zaXRpb25zLmxlbmd0aDtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRzaGlmdCgpXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMucG9zaXRpb25zLmxlbmd0aCA8IDEpIFxuXHRcdFx0XHRyZXR1cm4gdm9pZCAwO1xuXHRcdFx0XHRcblx0XHRcdGNvbnN0IHBvcyA9IHRoaXMucG9zaXRpb25zLnNoaWZ0KCkhO1xuXHRcdFx0Y29uc3QgaXRlbSA9IHRoaXMuZ2V0Um9vdChwb3MpO1xuXHRcdFx0dGhpcy5yZW1vdmVkKGl0ZW0hLCAwLCBwb3MpO1xuXHRcdFx0dGhpcy5yb290LmRlbGV0ZShwb3MpO1xuXHRcdFx0cmV0dXJuIGl0ZW07XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0c3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50OiBudW1iZXIsIC4uLml0ZW1zOiBUW10pXG5cdFx0e1xuXHRcdFx0Y29uc3QgcG9zaXRpb25zID0gdGhpcy5wb3NpdGlvbnMuc3BsaWNlKHN0YXJ0LCBkZWxldGVDb3VudCk7XG5cdFx0XHRwb3NpdGlvbnMuZm9yRWFjaCgoeCwgaSkgPT4gdGhpcy5yZW1vdmVkKHRoaXMuZ2V0Um9vdCh4KSwgc3RhcnQgKyBpLCB4KSk7XG5cdFx0XHR0aGlzLmluc2VydFJlZihzdGFydCwgLi4udGhpcy5maWx0ZXJQdXNoKC4uLml0ZW1zKSk7XG5cdFx0XHRjb25zdCByZXN1bHQgPSBwb3NpdGlvbnMubWFwKHggPT4gdGhpcy5nZXRSb290KHgpKTtcblx0XHRcdHBvc2l0aW9ucy5mb3JFYWNoKHggPT4gdGhpcy5yb290LmRlbGV0ZSh4KSk7XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIEFycmF5U3RvcmU8VD5cblx0e1xuXHRcdC8qKiAqL1xuXHRcdGdldChpbmRleDogbnVtYmVyKVxuXHRcdHtcblx0XHRcdGNvbnN0IGl0ZW0gPSB0aGlzLnJvb3RbaW5kZXhdO1xuXHRcdFx0cmV0dXJuIGl0ZW0gJiYgaXRlbS52YWx1ZTtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRzZXQoaW5kZXg6IG51bWJlciwgdmFsdWU6IFQpXG5cdFx0e1xuXHRcdFx0aWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGhpcy5yb290LCBpbmRleCkpIFxuXHRcdFx0XHR0aGlzLnJvb3RbaW5kZXhdID0geyB2YWx1ZTogdW5kZWZpbmVkLCByZWY6IDEgfTtcblx0XHRcdGVsc2UgXG5cdFx0XHRcdHRoaXMuY2hhbmdlZCh2YWx1ZSwgaW5kZXgpO1xuXHRcdFx0XG5cdFx0XHR0aGlzLnJvb3RbaW5kZXhdLnZhbHVlID0gdmFsdWU7XG5cdFx0XHRyZXR1cm4gaW5kZXg7XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0cHVzaCh2YWx1ZTogVClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5zZXQodGhpcy5uZXh0KyssIHZhbHVlKTtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRtYXJrKGluZGV4OiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0dGhpcy5yb290W2luZGV4XS5yZWYrKztcblx0XHRcdHJldHVybiBpbmRleDtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRkZWxldGUoaW5kZXg6IG51bWJlcilcblx0XHR7XG5cdFx0XHRpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMucm9vdCwgaW5kZXgpKSBcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgaXRlbSA9IHRoaXMucm9vdFtpbmRleF07XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoaXRlbS5yZWYgPiAxKSBcblx0XHRcdFx0XHRpdGVtLnJlZi0tO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKGl0ZW0ucmVmID09PSAwKSBcblx0XHRcdFx0XHRpdGVtLnZhbHVlID0gdW5kZWZpbmVkO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRyZWFkb25seSBjaGFuZ2VkID0gZm9yY2U8KGl0ZW06IFQsIGluZGV4OiBudW1iZXIpID0+IHZvaWQ+KCk7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSByb290OiBSZWNvcmQ8bnVtYmVyLCB7XG5cdFx0XHR2YWx1ZTogVCB8IHVuZGVmaW5lZDtcblx0XHRcdHJlZjogbnVtYmVyO1xuXHRcdH0+ID0ge307XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBuZXh0ID0gMDtcblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqIFxuXHQgKiBXQVJOSU5HOiBUaGlzIG1ldGhvZCBoYXMgcG90ZW50aWFsIG1lbW9yeSBpc3N1ZXNcblx0ICogYW5kIGlzIG5vdCBpbnRlbmRlZCBmb3IgbG9uZy1ydW5uaW5nIHByb2Nlc3NlcyAoaS5lLiBpblxuXHQgKiB0aGUgYnJvd3NlcikuIEluIG9yZGVyIHRvIHVzZSBpdCBmcm9tIHRoZSBicm93c2VyLCB0aGVcblx0ICogY2hpbGRyZW5PZi5lbmFibGVkIHZhbHVlIG11c3QgYmUgc2V0IHRvIHRydWUuIEluIE5vZGUuanMsXG5cdCAqIHRoaXMgdmFsdWUgZGVmYXVsdHMgdG8gdHJ1ZS4gSW4gdGhlIGJyb3dzZXIsIGl0IGRlZmF1bHRzIHRvXG5cdCAqIGZhbHNlO1xuXHQgKiBcblx0ICogQHJldHVybnMgQW4gYXJyYXkgY29udGFpbmluZyB0aGUgTWV0YSBvYmplY3RzIHRoYXQgXG5cdCAqIGFyZSBsb2dpY2FsIGNoaWxkcmVuIG9mIHRoZSBzcGVjaWZpZWQgYnJhbmNoLlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGNoaWxkcmVuT2YoYnJhbmNoOiBJQnJhbmNoKVxuXHR7XG5cdFx0cmV0dXJuIGNoaWxkTWV0YXMuZ2V0KGJyYW5jaCkgfHwgW107XG5cdH1cblx0XG5cdGV4cG9ydCBuYW1lc3BhY2UgY2hpbGRyZW5PZlxuXHR7XG5cdFx0ZXhwb3J0IGxldCBlbmFibGVkID0gdHlwZW9mIF9fZGlybmFtZSA9PT0gXCJzdHJpbmdcIjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBAaW50ZXJuYWxcblx0XHQgKiBQb3B1bGF0ZXMgdGhlIGludGVybmFsIHdlYWsgbWFwIHRoYXQgYWxsb3dzXG5cdFx0ICogYnJhbmNoZXMgdG8gc3RvcmUgdGhlaXIgY2hpbGQgbWV0YSBvYmplY3RzLiBcblx0XHQgKiBEbyBub3QgY2FsbCBmcm9tIGFwcGxpY2F0aW9uIGNvZGUuXG5cdFx0ICovXG5cdFx0ZXhwb3J0IGZ1bmN0aW9uIHN0b3JlKGJyYW5jaDogSUJyYW5jaCwgbWV0YTogTWV0YSlcblx0XHR7XG5cdFx0XHRjb25zdCBleGlzdGluZyA9IGNoaWxkTWV0YXMuZ2V0KGJyYW5jaCk7XG5cdFx0XHRpZiAoZXhpc3RpbmcpXG5cdFx0XHR7XG5cdFx0XHRcdGlmICghZXhpc3RpbmcuaW5jbHVkZXMobWV0YSkpXG5cdFx0XHRcdFx0ZXhpc3RpbmcucHVzaChtZXRhKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgY2hpbGRNZXRhcy5zZXQoYnJhbmNoLCBbbWV0YV0pO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqICovXG5cdGNvbnN0IGNoaWxkTWV0YXMgPSBuZXcgV2Vha01hcDxJQnJhbmNoLCBNZXRhW10+KCk7XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKipcblx0ICogQGludGVybmFsXG5cdCAqIFB1cmVseSBmdW5jdGlvbmFsIHV0aWxpdHkgbWV0aG9kcyB0aGF0IHBlcmZvcm0gb3BlcmF0aW9ucyBmb3IgdGhlIFJlbGV4IENvcmUuXG5cdCAqL1xuXHRleHBvcnQgY29uc3QgQ29yZVV0aWwgPSBuZXcgY2xhc3MgQ29yZVV0aWxcblx0e1xuXHRcdC8qKlxuXHRcdCAqIENsZWFucyBvdXQgdGhlIGNydWZ0IGZyb20gdGhlIGF0b21zIGFycmF5LFxuXHRcdCAqIGZsYXR0ZW5zIGFsbCBhcnJheXMsIGFuZCBjb252ZXJ0cyB0aGUgcmVzdWx0aW5nXG5cdFx0ICogdmFsdWVzIGludG8gTWV0YSBpbnN0YW5jZXMuXG5cdFx0ICovXG5cdFx0dHJhbnNsYXRlQXRvbXMoXG5cdFx0XHRjb250YWluZXJCcmFuY2g6IElCcmFuY2gsXG5cdFx0XHRjb250YWluZXJNZXRhOiBDb250YWluZXJNZXRhLFxuXHRcdFx0cmF3QXRvbXM6IHVua25vd24pXG5cdFx0e1xuXHRcdFx0Y29uc3QgYXRvbXMgPSBBcnJheS5pc0FycmF5KHJhd0F0b21zKSA/XG5cdFx0XHRcdHJhd0F0b21zLnNsaWNlKCkgOlxuXHRcdFx0XHRbcmF3QXRvbXNdO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGF0b21zLmxlbmd0aDspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGF0b20gPSBhdG9tc1tpXTtcblx0XHRcdFx0XG5cdFx0XHRcdC8vIEluaXRpYWwgY2xlYXIgb3V0IG9mIGRpc2NhcmRlZCB2YWx1ZXMuXG5cdFx0XHRcdGlmIChhdG9tID09PSBudWxsIHx8IFxuXHRcdFx0XHRcdGF0b20gPT09IHVuZGVmaW5lZCB8fCBcblx0XHRcdFx0XHR0eXBlb2YgYXRvbSA9PT0gXCJib29sZWFuXCIgfHxcblx0XHRcdFx0XHRhdG9tID09PSBcIlwiIHx8IFxuXHRcdFx0XHRcdGF0b20gIT09IGF0b20gfHwgXG5cdFx0XHRcdFx0YXRvbSA9PT0gY29udGFpbmVyQnJhbmNoKVxuXHRcdFx0XHRcdGF0b21zLnNwbGljZShpLS0sIDEpO1xuXHRcdFx0XHRcblx0XHRcdFx0Ly8gc3RyaW5ncywgbnVtYmVycywgYW5kIGJpZ2ludHMgYXJlIHBhc3NlZCB0aHJvdWdoIHZlcmJhdGltIGluIHRoaXMgcGhhc2UuXG5cdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiBhdG9tICE9PSBcIm9iamVjdFwiKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAoQXJyYXkuaXNBcnJheShhdG9tKSlcblx0XHRcdFx0XHRhdG9tcy5zcGxpY2UoaS0tLCAxLCAuLi5hdG9tKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKHRoaXMuaGFzU3ltYm9sICYmIGF0b21bU3ltYm9sLml0ZXJhdG9yXSlcblx0XHRcdFx0XHRhdG9tcy5zcGxpY2UoaS0tLCAxLCAuLi5BcnJheS5mcm9tKGF0b20pKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Y29uc3QgbWV0YXM6IE1ldGFbXSA9IFtdO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGF0b21zLmxlbmd0aDspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGF0b20gPSBhdG9tc1tpXTtcblx0XHRcdFx0Y29uc3QgdHlwZU9mID0gdHlwZW9mIGF0b207XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoYXRvbSBpbnN0YW5jZW9mIE1ldGEpXG5cdFx0XHRcdFx0bWV0YXMucHVzaChhdG9tKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKGF0b20gaW5zdGFuY2VvZiBSZWN1cnJlbnQpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoYXRvbS5zZWxlY3RvciBpbnN0YW5jZW9mIEFycmF5Rm9yY2UpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bWV0YXMucHVzaChuZXcgQXJyYXlTdHJlYW1NZXRhKFxuXHRcdFx0XHRcdFx0XHRjb250YWluZXJNZXRhLFxuXHRcdFx0XHRcdFx0XHRhdG9tKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRtZXRhcy5wdXNoKG5ldyBSZWN1cnJlbnRTdHJlYW1NZXRhKFxuXHRcdFx0XHRcdFx0XHRjb250YWluZXJNZXRhLFxuXHRcdFx0XHRcdFx0XHRhdG9tKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKGF0b21bUmVmbGV4LmF0b21dKVxuXHRcdFx0XHRcdG1ldGFzLnB1c2gobmV3IENsb3N1cmVNZXRhKHRoaXMuY3JlYXRlU3ltYm9saWNDbG9zdXJlKGF0b20pKSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmICh0eXBlT2YgPT09IFwiZnVuY3Rpb25cIilcblx0XHRcdFx0XHRtZXRhcy5wdXNoKG5ldyBDbG9zdXJlTWV0YShhdG9tKSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChcblx0XHRcdFx0XHR0eXBlT2YgPT09IFwic3RyaW5nXCIgfHxcblx0XHRcdFx0XHR0eXBlT2YgPT09IFwibnVtYmVyXCIgfHxcblx0XHRcdFx0XHR0eXBlT2YgPT09IFwiYmlnaW50XCIpXG5cdFx0XHRcdFx0bWV0YXMucHVzaChuZXcgVmFsdWVNZXRhKGF0b20pKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKHRoaXMuaXNBc3luY0l0ZXJhYmxlKGF0b20pKVxuXHRcdFx0XHRcdG1ldGFzLnB1c2gobmV3IEFzeW5jSXRlcmFibGVTdHJlYW1NZXRhKGNvbnRhaW5lck1ldGEsIGF0b20pKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKGF0b20gaW5zdGFuY2VvZiBQcm9taXNlKVxuXHRcdFx0XHRcdG1ldGFzLnB1c2gobmV3IFByb21pc2VTdHJlYW1NZXRhKGNvbnRhaW5lck1ldGEsIGF0b20pKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKHRoaXMuaXNBdHRyaWJ1dGVzKGF0b20pKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Zm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXMoYXRvbSkpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0aWYgKHYgaW5zdGFuY2VvZiBTdGF0ZWZ1bEZvcmNlKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRtZXRhcy5wdXNoKG5ldyBSZWN1cnJlbnRTdHJlYW1NZXRhKFxuXHRcdFx0XHRcdFx0XHRcdGNvbnRhaW5lck1ldGEsXG5cdFx0XHRcdFx0XHRcdFx0bmV3IEF0dHJpYnV0ZVJlY3VycmVudChrLCB2KSkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSBtZXRhcy5wdXNoKG5ldyBBdHRyaWJ1dGVNZXRhKGssIHYpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgZXhpc3RpbmdNZXRhID0gXG5cdFx0XHRcdFx0XHRCcmFuY2hNZXRhLm9mKGF0b20pIHx8XG5cdFx0XHRcdFx0XHRMZWFmTWV0YS5vZihhdG9tKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoZXhpc3RpbmdNZXRhKVxuXHRcdFx0XHRcdFx0bWV0YXMucHVzaChleGlzdGluZ01ldGEpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIFRoaXMgZXJyb3Igb2NjdXJzIHdoZW4gc29tZXRoaW5nIHdhcyBwYXNzZWQgYXMgYSBhdG9tIFxuXHRcdFx0XHRcdC8vIHRvIGEgYnJhbmNoIGZ1bmN0aW9uLCBhbmQgbmVpdGhlciB0aGUgUmVmbGV4IGNvcmUsIG9yIGFueSBvZlxuXHRcdFx0XHRcdC8vIHRoZSBjb25uZWN0ZWQgUmVmbGV4aXZlIGxpYnJhcmllcyBrbm93IHdoYXQgdG8gZG8gd2l0aCBpdC5cblx0XHRcdFx0XHRlbHNlIHRocm93IG5ldyBFcnJvcihcIlVuaWRlbnRpZmllZCBmbHlpbmcgb2JqZWN0LlwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gbWV0YXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGlzQXR0cmlidXRlcyhvYmplY3Q6IGFueSk6IG9iamVjdCBpcyBJQXR0cmlidXRlc1xuXHRcdHtcblx0XHRcdGlmICghb2JqZWN0IHx8IG9iamVjdC5jb25zdHJ1Y3RvciAhPT0gT2JqZWN0KVxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgdmFsdWUgb2YgT2JqZWN0LnZhbHVlcyhvYmplY3QpKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB0ID0gdHlwZW9mIHZhbHVlO1xuXHRcdFx0XHRpZiAodCAhPT0gXCJzdHJpbmdcIiAmJiB0ICE9PSBcIm51bWJlclwiICYmIHQgIT09IFwiYmlnaW50XCIgJiYgdCAhPT0gXCJib29sZWFuXCIpXG5cdFx0XHRcdFx0aWYgKCEodmFsdWUgaW5zdGFuY2VvZiBTdGF0ZWZ1bEZvcmNlKSlcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENyZWF0ZXMgYSB0ZW1wb3JhcnkgY2xvc3VyZSBmdW5jdGlvbiBmb3IgdGhlXG5cdFx0ICogc3BlY2lmaWVkIHN5bWJvbGljIGF0b20gb2JqZWN0LlxuXHRcdCAqL1xuXHRcdHByaXZhdGUgY3JlYXRlU3ltYm9saWNDbG9zdXJlKGF0b206IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gKGJyYW5jaDogSUJyYW5jaCwgY2hpbGRyZW46IGFueVtdKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBwcm9wZXJ0eSA9IGF0b21bUmVmbGV4LmF0b21dO1xuXHRcdFx0XHRyZXR1cm4gdHlwZW9mIHByb3BlcnR5ID09PSBcImZ1bmN0aW9uXCIgP1xuXHRcdFx0XHRcdHByb3BlcnR5LmNhbGwoYXRvbSwgYnJhbmNoLCBjaGlsZHJlbikgOlxuXHRcdFx0XHRcdHByb3BlcnR5O1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRpc0FzeW5jSXRlcmFibGUobzogYW55KTogbyBpcyBBc3luY0l0ZXJhYmxlPGFueT5cblx0XHR7XG5cdFx0XHRpZiAodGhpcy5oYXNTeW1ib2wgJiYgbyAmJiB0eXBlb2YgbyA9PT0gXCJvYmplY3RcIilcblx0XHRcdFx0aWYgKG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdKVxuXHRcdFx0XHRcdGlmICh0eXBlb2Ygby5uZXh0ID09PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIG8ucmV0dXJuID09PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdFx0XHRcdGlmICh0eXBlb2Ygby50aHJvdyA9PT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBoYXNTeW1ib2woKVxuXHRcdHtcblx0XHRcdHJldHVybiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCI7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEFwcGxpZXMgdGhlIHNwZWNpZmllZCBtZXRhcyB0byB0aGUgc3BlY2lmaWVkIGJyYW5jaCwgYW5kIHJldHVybnNcblx0XHQgKiB0aGUgbGFzdCBhcHBsaWVkIGJyYW5jaCBvciBsZWFmIG9iamVjdCwgd2hpY2ggY2FuIGJlIHVzZWQgZm9yXG5cdFx0ICogZnV0dXJlIHJlZmVyZW5jZXMuXG5cdFx0ICovXG5cdFx0YXBwbHlNZXRhcyhcblx0XHRcdGNvbnRhaW5pbmdCcmFuY2g6IElCcmFuY2gsXG5cdFx0XHRjb250YWluZXJNZXRhOiBDb250YWluZXJNZXRhLFxuXHRcdFx0Y2hpbGRNZXRhczogTWV0YVtdLFxuXHRcdFx0dHJhY2tlcjogVHJhY2tlciA9IG5ldyBUcmFja2VyKGNvbnRhaW5pbmdCcmFuY2gpKVxuXHRcdHtcblx0XHRcdGNvbnN0IGNvbnRhaW5pbmdCcmFuY2hNZXRhID0gQnJhbmNoTWV0YS5vZihjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdGlmICghY29udGFpbmluZ0JyYW5jaE1ldGEpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlwiKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgbGliID0gUm91dGluZ0xpYnJhcnkudGhpcztcblx0XHRcdGNoaWxkTWV0YXMgPSBjaGlsZE1ldGFzLnNsaWNlKCk7XG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgY2hpbGRNZXRhcy5sZW5ndGg7KVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBtZXRhID0gY2hpbGRNZXRhc1tpXTtcblx0XHRcdFx0XG5cdFx0XHRcdC8vIENsb3N1cmVNZXRhIGluc3RhbmNlcyBtdXN0IGJlIGRlYWx0IHdpdGggZmlyc3QsIGJlY2F1c2Vcblx0XHRcdFx0Ly8gdGhleSBjYW4gcmV0dXJuIG90aGVyIE1ldGEgaW5zdGFuY2VzLCBhbmQgdGhvc2UgTWV0YVxuXHRcdFx0XHQvLyBpbnN0YW5jZXMgYXJlIHRoZSBvbmVzIHRoYXQgKGxpa2VseSkgaGF2ZSBMb2NhdG9ycyB0aGF0XG5cdFx0XHRcdC8vIG11c3QgYmUgYXNzaW1pbGF0ZWQgKGkuZS4gYnkgY2FsbGluZyAuc2V0Q29udGFpbmVyKCkpXG5cdFx0XHRcdC8vIFRoZSBDbG9zdXJlTWV0YSBpbnN0YW5jZXMgdGhlbXNlbHZlcyBkb24ndCBwYXJ0aWNpcGF0ZVxuXHRcdFx0XHQvLyBpbiB0aGUgVHJhY2tlciAvIExvY2F0b3IgbWFkbmVzcywgYnV0IHRoZXkgY2FuIHJldHVybiBcblx0XHRcdFx0Ly8gb3RoZXIgTWV0YSBpbnN0YW5jZXMgdGhhdCBkby5cblx0XHRcdFx0aWYgKG1ldGEgaW5zdGFuY2VvZiBDbG9zdXJlTWV0YSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChsaWIuaGFuZGxlQnJhbmNoRnVuY3Rpb24gJiYgaXNCcmFuY2hGdW5jdGlvbihtZXRhLmNsb3N1cmUpKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGxpYi5oYW5kbGVCcmFuY2hGdW5jdGlvbihcblx0XHRcdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCwgXG5cdFx0XHRcdFx0XHRcdDwoLi4uYXRvbXM6IGFueVtdKSA9PiBJQnJhbmNoPm1ldGEuY2xvc3VyZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBjaGlsZHJlbiA9IGxpYi5nZXRDaGlsZHJlbihjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdFx0XHRcdGNvbnN0IGNsb3N1cmVSZXR1cm4gPSBtZXRhLmNsb3N1cmUoY29udGFpbmluZ0JyYW5jaCwgY2hpbGRyZW4pO1xuXHRcdFx0XHRcdFx0Y29uc3QgbWV0YXNSZXR1cm5lZCA9IHRoaXMudHJhbnNsYXRlQXRvbXMoXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2hNZXRhLFxuXHRcdFx0XHRcdFx0XHRjbG9zdXJlUmV0dXJuKTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0Y2hpbGRNZXRhcy5zcGxpY2UoaS0tLCAxLCAuLi5tZXRhc1JldHVybmVkKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdG1ldGEubG9jYXRvci5zZXRDb250YWluZXIoY29udGFpbmVyTWV0YS5sb2NhdG9yKTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChtZXRhIGluc3RhbmNlb2YgQnJhbmNoTWV0YSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IGhhcmRSZWYgPSB0cmFja2VyLmdldExhc3RIYXJkUmVmKCk7XG5cdFx0XHRcdFx0bGliLmF0dGFjaEF0b20obWV0YS5icmFuY2gsIGNvbnRhaW5pbmdCcmFuY2gsIGhhcmRSZWYpO1xuXHRcdFx0XHRcdHRyYWNrZXIudXBkYXRlKG1ldGEuYnJhbmNoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgTGVhZk1ldGEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBoYXJkUmVmID0gdHJhY2tlci5nZXRMYXN0SGFyZFJlZigpO1xuXHRcdFx0XHRcdGxpYi5hdHRhY2hBdG9tKG1ldGEudmFsdWUsIGNvbnRhaW5pbmdCcmFuY2gsIGhhcmRSZWYpO1xuXHRcdFx0XHRcdHRyYWNrZXIudXBkYXRlKG1ldGEudmFsdWUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBWYWx1ZU1ldGEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRsaWIuYXR0YWNoQXRvbShtZXRhLnZhbHVlLCBjb250YWluaW5nQnJhbmNoLCBcImFwcGVuZFwiKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgU3RyZWFtTWV0YSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChtZXRhIGluc3RhbmNlb2YgUmVjdXJyZW50U3RyZWFtTWV0YSlcblx0XHRcdFx0XHRcdG1ldGEuYXR0YWNoKGNvbnRhaW5pbmdCcmFuY2gsIHRyYWNrZXIpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBBc3luY0l0ZXJhYmxlU3RyZWFtTWV0YSlcblx0XHRcdFx0XHRcdG1ldGEuYXR0YWNoKGNvbnRhaW5pbmdCcmFuY2gsIHRyYWNrZXIpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBBcnJheVN0cmVhbU1ldGEpXG5cdFx0XHRcdFx0XHRtZXRhLmF0dGFjaChjb250YWluaW5nQnJhbmNoLCB0cmFja2VyKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgUHJvbWlzZVN0cmVhbU1ldGEpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y29uc3QgbG9jYWxUcmFja2VyID0gdHJhY2tlci5kZXJpdmUoKTtcblx0XHRcdFx0XHRcdGxvY2FsVHJhY2tlci51cGRhdGUobWV0YS5sb2NhdG9yKTtcblx0XHRcdFx0XHRcdG1ldGEuYXR0YWNoKGNvbnRhaW5pbmdCcmFuY2gsIGxvY2FsVHJhY2tlcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBBdHRyaWJ1dGVNZXRhKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bGliLmF0dGFjaEF0dHJpYnV0ZShjb250YWluaW5nQnJhbmNoLCBtZXRhLmtleSwgbWV0YS52YWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGlmIChDb25zdC5kZWJ1ZyB8fCBDb25zdC5ub2RlKVxuXHRcdFx0XHRcdGNoaWxkcmVuT2Yuc3RvcmUoY29udGFpbmluZ0JyYW5jaCwgbWV0YSk7XG5cdFx0XHRcdFxuXHRcdFx0XHR0cmFja2VyLnVwZGF0ZShtZXRhLmxvY2F0b3IpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHR1bmFwcGx5TWV0YXMoXG5cdFx0XHRjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoLFxuXHRcdFx0Y2hpbGRNZXRhczogTWV0YVtdKVxuXHRcdHtcblx0XHRcdGNvbnN0IGxpYiA9IFJvdXRpbmdMaWJyYXJ5LnRoaXM7XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgbWV0YSBvZiBjaGlsZE1ldGFzKVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBDbG9zdXJlTWV0YXMgY2FuIGJlIHNhZmVseSBpZ25vcmVkLlxuXHRcdFx0XHRpZiAobWV0YSBpbnN0YW5jZW9mIENsb3N1cmVNZXRhKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKG1ldGEgaW5zdGFuY2VvZiBMZWFmTWV0YSB8fCBtZXRhIGluc3RhbmNlb2YgVmFsdWVNZXRhKVxuXHRcdFx0XHRcdGxpYi5kZXRhY2hBdG9tKG1ldGEudmFsdWUsIGNvbnRhaW5pbmdCcmFuY2gpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAobWV0YSBpbnN0YW5jZW9mIEF0dHJpYnV0ZU1ldGEpXG5cdFx0XHRcdFx0bGliLmRldGFjaEF0dHJpYnV0ZShjb250YWluaW5nQnJhbmNoLCBtZXRhLnZhbHVlKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBCcmFuY2hNZXRhKVxuXHRcdFx0XHRcdC8vIFdlIHNob3VsZCBwcm9iYWJseSBjb25zaWRlciBnZXR0aW5nIHJpZCBvZiB0aGlzXG5cdFx0XHRcdFx0Ly8gWW91IHdvdWxkIGJlIGFibGUgdG8gcmUtZGlzY292ZXIgdGhlIGJyYW5jaCBieVxuXHRcdFx0XHRcdC8vIGVudW1lcmF0aW5nIHRocm91Z2ggdGhlIGNoaWxkcmVuIG9mIGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0Ly8gdXNpbmcgdGhlIGdldENoaWxkcmVuKCkgbWV0aG9kIHByb3ZpZGVkIGJ5IHRoZSBsaWJyYXJ5LlxuXHRcdFx0XHRcdGxpYi5kZXRhY2hBdG9tKG1ldGEuYnJhbmNoLCBjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBSZWN1cnJlbnRTdHJlYW1NZXRhKVxuXHRcdFx0XHRcdG1ldGEuZGV0YWNoUmVjdXJyZW50cyhcblx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0XHRtZXRhLnJlY3VycmVudC5zZWxlY3Rvcixcblx0XHRcdFx0XHRcdG1ldGEuc3lzdGVtQ2FsbGJhY2spO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAobWV0YSBpbnN0YW5jZW9mIFByb21pc2VTdHJlYW1NZXRhKVxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZC5cIik7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgQXN5bmNJdGVyYWJsZVN0cmVhbU1ldGEpXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkLlwiKTtcblx0XHRcdH1cblx0XHR9XG5cdH0oKTtcbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleFxue1xuXHQvKiogKi9cblx0ZXhwb3J0IGVudW0gbXV0YXRpb25cblx0e1xuXHRcdGFueSA9IFwibXV0YXRpb24tYW55XCIsXG5cdFx0YnJhbmNoID0gXCJtdXRhdGlvbi1icmFuY2hcIixcblx0XHRicmFuY2hBZGQgPSBcIm11dGF0aW9uLWJyYW5jaC1hZGRcIixcblx0XHRicmFuY2hSZW1vdmUgPSBcIm11dGF0aW9uLWJyYW5jaC1yZW1vdmVcIixcblx0XHRsZWFmID0gXCJtdXRhdGlvbi1sZWFmXCIsXG5cdFx0bGVhZkFkZCA9IFwibXV0YXRpb24tbGVhZi1hZGRcIixcblx0XHRsZWFmUmVtb3ZlID0gXCJtdXRhdGlvbi1sZWFmLXJlbW92ZVwiXG5cdH1cblx0XG5cdC8qKlxuXHQgKiBBIHN5bWJvbCB3aGljaCBtYXkgYmUgYXBwbGllZCBhcyBhbiBvYmplY3Qga2V5IGluIFxuXHQgKiBhIHR5cGUsIGluIG9yZGVyIHRvIG1ha2UgaXQgYSB2YWxpZCBSZWZsZXggYXRvbS5cblx0ICovXG5cdGV4cG9ydCBkZWNsYXJlIGNvbnN0IGF0b206IHVuaXF1ZSBzeW1ib2w7XG5cdCg8YW55PlJlZmxleClbXCJhdG9tXCJdID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiID9cblx0XHRTeW1ib2woXCJSZWZsZXguYXRvbVwiKSA6XG5cdFx0XCJSZWZsZXguYXRvbVwiO1xuXHRcblx0LyoqXG5cdCAqIEEgdHlwZSB0aGF0IGlkZW50aWZpZXMgdGhlIHR5cGVzIG9mIGF0b21zIHRoYXQgY2FuIGV4aXN0XG5cdCAqIGluIGFueSByZWZsZXhpdmUgYXJndW1lbnRzIGxpc3QuXG5cdCAqIFxuXHQgKiBAcGFyYW0gQiBUaGUgbGlicmFyeSdzIEJyYW5jaCB0eXBlLlxuXHQgKiBAcGFyYW0gTCBUaGUgbGlicmFyeSdzIExlYWYgdHlwZS5cblx0ICogQHBhcmFtIFggRXh0cmEgdHlwZXMgdW5kZXJzdG9vZCBieSB0aGUgbGlicmFyeS5cblx0ICovXG5cdGV4cG9ydCB0eXBlIEF0b208QiBleHRlbmRzIG9iamVjdCA9IG9iamVjdCwgTCA9IGFueSwgWCA9IHZvaWQ+ID1cblx0XHRCIHxcblx0XHRMIHxcblx0XHRYIHxcblx0XHRmYWxzZSB8XG5cdFx0bnVsbCB8XG5cdFx0dm9pZCB8XG5cdFx0U3ltYm9saWNBdG9tPEIsIEwsIFg+IHxcblx0XHRJdGVyYWJsZTxBdG9tPEIsIEwsIFg+PiB8XG5cdFx0QXN5bmNJdGVyYWJsZTxBdG9tPEIsIEwsIFg+PiB8XG5cdFx0UHJvbWlzZTxBdG9tPEIsIEwsIFg+PiB8XG5cdFx0KChicmFuY2g6IEIsIGNoaWxkcmVuOiAoQiB8IEwpW10pID0+IEF0b208QiwgTCwgWD4pIHxcblx0XHRDb3JlLkJyYW5jaEZ1bmN0aW9uIHxcblx0XHRSZWN1cnJlbnQgfFxuXHRcdElBdHRyaWJ1dGVzO1xuXHRcblx0LyoqXG5cdCAqIEFuIGludGVyZmFjZSBmb3IgYW4gb2JqZWN0IHRoYXQgaGFzIGl0J3Mgb3duIGF0b21pemF0aW9uXG5cdCAqIHByb2Nlc3MuXG5cdCAqL1xuXHRleHBvcnQgaW50ZXJmYWNlIFN5bWJvbGljQXRvbTxCIGV4dGVuZHMgb2JqZWN0ID0gb2JqZWN0LCBMID0gYW55LCBYID0gdm9pZD5cblx0e1xuXHRcdHJlYWRvbmx5IFthdG9tXTogQXRvbTxCLCBMLCBYPjtcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBpbnRlcmZhY2UgSUF0dHJpYnV0ZXM8VCA9IHN0cmluZyB8IG51bWJlciB8IGJpZ2ludCB8IGJvb2xlYW4+XG5cdHtcblx0XHRbYXR0cmlidXRlTmFtZTogc3RyaW5nXTogQ29yZS5Wb2lkYWJsZTxUPiB8IFN0YXRlZnVsRm9yY2U8Q29yZS5Wb2lkYWJsZTxUPj47XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBHZW5lcmljIGZ1bmN0aW9uIGRlZmluaXRpb24gZm9yIGNhbGxiYWNrIGZ1bmN0aW9ucyBwcm92aWRlZCB0b1xuXHQgKiB0aGUgZ2xvYmFsIG9uKCkgZnVuY3Rpb24uXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBSZWN1cnJlbnRDYWxsYmFjazxUIGV4dGVuZHMgQXRvbSA9IEF0b20+ID0gKC4uLmFyZ3M6IGFueVtdKSA9PiBUO1xufVxuXG5kZWNsYXJlIG5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKipcblx0ICogTWFya2VyIGludGVyZmFjZSB0aGF0IGRlZmluZXMgYW4gb2JqZWN0IHRoYXQgY2FuIGhhdmVcblx0ICogcmVmbGV4aXZlIHZhbHVlcyBhdHRhY2hlZCB0byBpdC5cblx0ICogKEZvciBleGFtcGxlOiBIVE1MRWxlbWVudCBvciBOU1dpbmRvdylcblx0ICovXG5cdGV4cG9ydCBpbnRlcmZhY2UgSUJyYW5jaCBleHRlbmRzIE9iamVjdCB7IH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgY2xhc3MgQnJhbmNoRnVuY3Rpb248VE5hbWUgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmc+XG5cdHtcblx0XHRyZWFkb25seSBuYW1lOiBUTmFtZTtcblx0XHRwcml2YXRlIHJlYWRvbmx5IG5vbWluYWw6IHVuZGVmaW5lZDtcblx0fVxuXHRcblx0LyoqXG5cdCAqIE1hcmtlciBpbnRlcmZhY2UgdGhhdCBkZWZpbmVzIGFuIG9iamVjdCB0aGF0IHJlcHJlc2VudHNcblx0ICogYSBibG9jayBvZiB2aXNpYmxlIGxlYXZlcyAoY29udGVudCkgaW4gdGhlIHRyZWUuXG5cdCAqIChGb3IgZXhhbXBsZTogdGhlIFczQyBET00ncyBUZXh0IG9iamVjdClcblx0ICovXG5cdGV4cG9ydCBpbnRlcmZhY2UgSUxlYWYgZXh0ZW5kcyBPYmplY3QgeyB9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IHR5cGUgVm9pZGFibGU8VD4gPSBcblx0XHRUIHxcblx0XHRmYWxzZSB8XG5cdFx0bnVsbCB8XG5cdFx0dm9pZDtcblx0XG5cdC8qKlxuXHQgKiBBYnN0cmFjdCBkZWZpbml0aW9uIG9mIHRoZSBsZWFmIHZhcmlhbnQgb2YgdGhlIHRvcC1sZXZlbFxuXHQgKiBuYW1lc3BhY2UgZnVuY3Rpb24uXG5cdCAqIFxuXHQgKiBAcGFyYW0gTCBUaGUgTGVhZiB0eXBlIG9mIHRoZSBsaWJyYXJ5LlxuXHQgKiBAcGFyYW0gUyBUaGUgXCJMZWFmIHNvdXJjZVwiIHR5cGUsIHdoaWNoIGFyZSB0aGUgb3RoZXIgdHlwZXNcblx0ICogKHR5cGljYWxseSBwcmltaXRpdmVzKSB0aGF0IHRoZSBsaWJyYXJ5IGlzIGNhcGFibGUgb2YgY29udmVydGluZ1xuXHQgKiBpbnRvIGl0J3MgTGVhZiB0eXBlLlxuXHQgKi9cblx0ZXhwb3J0IGludGVyZmFjZSBJTGVhZk5hbWVzcGFjZTxMID0gYW55LCBTID0gc3RyaW5nIHwgbnVtYmVyIHwgYmlnaW50PlxuXHR7XG5cdFx0KFxuXHRcdFx0dGVtcGxhdGU6XG5cdFx0XHRcdFRlbXBsYXRlU3RyaW5nc0FycmF5IHwgXG5cdFx0XHRcdEwgfCBTIHwgdm9pZCB8XG5cdFx0XHRcdFN0YXRlZnVsRm9yY2UsXG5cdFx0XHRcblx0XHRcdC4uLnZhbHVlczogKFxuXHRcdFx0XHRJQnJhbmNoIHwgXG5cdFx0XHRcdEwgfCBTIHwgdm9pZCB8XG5cdFx0XHRcdFN0YXRlZnVsRm9yY2UpW11cblx0XHQpOiBMO1xuXHR9XG5cdFxuXHQvKipcblx0ICogQWJzdHJhY3QgZGVmaW5pdGlvbiBvZiB0aGUgYnJhbmNoIHZhcmlhbnQgb2YgdGhlIHRvcC1sZXZlbFxuXHQgKiBuYW1lc3BhY2UgZnVuY3Rpb24uXG5cdCAqIFxuXHQgKiBAcGFyYW0gQSBUaGUgQXRvbSB0eXBlIG9mIHRoZSBSZWZsZXhpdmUgbGlicmFyeS5cblx0ICogQHBhcmFtIFIgVGhlIHJldHVybiB0eXBlIG9mIHRoZSByb290LWxldmVsIGJyYW5jaCBmdW5jdGlvbi5cblx0ICovXG5cdGV4cG9ydCBpbnRlcmZhY2UgSUJyYW5jaE5hbWVzcGFjZTxBID0gYW55LCBSID0gYW55PlxuXHR7XG5cdFx0KC4uLmF0b21zOiBBW10pOiBSO1xuXHR9XG5cdFxuXHQvKipcblx0ICogRGVmaW5lcyBhIHJlbGF0aXZlIG9yIHNwZWNpZmljIG1ldGEgcmVmZXJlbmNlLCB1c2VkIGZvciBpbmRpY2F0aW5nXG5cdCAqIGFuIGluc2VydGlvbiBwb3NpdGlvbiBvZiBhIG5ldyBtZXRhIHdpdGhpbiBhIFJlZmxleGl2ZSB0cmVlLlxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgUmVmPEIgPSBJQnJhbmNoLCBMID0gSUxlYWY+ID0gQiB8IEwgfCBcInByZXBlbmRcIiB8IFwiYXBwZW5kXCI7XG5cdFxuXHQvKipcblx0ICogQSBtYXBwZWQgdHlwZSB0aGF0IGV4dHJhY3RzIHRoZSBuYW1lcyBvZiB0aGUgbWV0aG9kcyBhbmRcblx0ICogZnVuY3Rpb24tdmFsdWVkIGZpZWxkcyBvdXQgb2YgdGhlIHNwZWNpZmllZCB0eXBlLlxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgTWV0aG9kTmFtZXM8VD4gPSB7XG5cdFx0W0sgaW4ga2V5b2YgVF06IFRbS10gZXh0ZW5kcyAoKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnkpID8gSyA6IG5ldmVyO1xuXHR9W2tleW9mIFRdO1xuXG5cdC8qKlxuXHQgKiBFeHRyYWN0cyBhbnkgcmV0dXJuIHR5cGUgZnJvbSB0aGUgc3BlY2lmaWVkIHR5cGUsIGluIHRoZSBjYXNlXG5cdCAqIHdoZW4gdGhlIHR5cGUgc3BlY2lmaWVkIGlzIGEgZnVuY3Rpb24uXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBNYXliZVJldHVyblR5cGU8VD4gPSBUIGV4dGVuZHMgKC4uLmFyZ3M6IGFueVtdKSA9PiBpbmZlciBSID8gUiA6IG5ldmVyO1xuXHRcblx0LyoqXG5cdCAqIE1hcHMgdGhlIHNwZWNpZmllZCB0eXBlIHRvIGEgdmVyc2lvbiBvZiBpdHNlbGYsXG5cdCAqIGJ1dCB3aXRob3V0IGFueSBwb3NzaWJseSB1bmRlZmluZWQgdmFsdWVzLlxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgRGVmaW5lZDxUPiA9IHsgW0sgaW4ga2V5b2YgVF0tPzogVFtLXSB9O1xuXHRcblx0LyoqXG5cdCAqIEV4dHJhY3RzIHRoZSByZXR1cm4gdHlwZSBvZiB0aGUgc3BlY2lmaWVkIGZ1bmN0aW9uIHR5cGUuXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBSZXR1cm5PZjxvcmlnaW5hbCBleHRlbmRzIEZ1bmN0aW9uPiA9IFxuXHRcdG9yaWdpbmFsIGV4dGVuZHMgKC4uLng6IGFueVtdKSA9PiBpbmZlciByZXR1cm5UeXBlID9cblx0XHRcdHJldHVyblR5cGUgOiBcblx0XHRcdG5ldmVyO1xuXHRcblx0LyoqXG5cdCAqIEV4dHJhY3RzIHRoZSBtZXRob2RzIG91dCBvZiB0aGUgdHlwZSwgYW5kIHJldHVybnMgYSBtYXBwZWQgb2JqZWN0IHR5cGVcblx0ICogd2hvc2UgbWVtYmVycyBhcmUgdHJhbnNmb3JtZWQgaW50byBicmFuY2ggY3JlYXRpb24gbWV0aG9kcy5cblx0ICovXG5cdGV4cG9ydCB0eXBlIEFzQnJhbmNoZXM8VD4gPSB7XG5cdFx0cmVhZG9ubHkgW0sgaW4ga2V5b2YgVF06IEFzQnJhbmNoPFRbS10+XG5cdH07XG5cdFxuXHQvKipcblx0ICogRXh0cmFjdHMgXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBBc0JyYW5jaDxGPiA9IFxuXHRcdEYgZXh0ZW5kcyAoKSA9PiBpbmZlciBSID8gKC4uLmF0b21zOiBBdG9tW10pID0+IFIgOlxuXHRcdEYgZXh0ZW5kcyAoLi4uYXJnczogaW5mZXIgQSkgPT4gaW5mZXIgUiA/ICguLi5hcmdzOiBBKSA9PiAoLi4uYXRvbXM6IEF0b21bXSkgPT4gUiA6XG5cdFx0Rjtcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCB0eXBlIFN0YXRpY0JyYW5jaGVzT2Y8TCBleHRlbmRzIFJlZmxleC5Db3JlLklMaWJyYXJ5PiA9XG5cdFx0TFtcImdldFN0YXRpY0JyYW5jaGVzXCJdIGV4dGVuZHMgRnVuY3Rpb24gP1xuXHRcdFx0QXNCcmFuY2hlczxSZXR1cm5PZjxMW1wiZ2V0U3RhdGljQnJhbmNoZXNcIl0+PiA6XG5cdFx0XHR7fTtcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCB0eXBlIFN0YXRpY05vbkJyYW5jaGVzT2Y8TCBleHRlbmRzIFJlZmxleC5Db3JlLklMaWJyYXJ5PiA9XG5cdFx0TFtcImdldFN0YXRpY05vbkJyYW5jaGVzXCJdIGV4dGVuZHMgRnVuY3Rpb24gP1xuXHRcdFx0QXNCcmFuY2hlczxSZXR1cm5PZjxMW1wiZ2V0U3RhdGljTm9uQnJhbmNoZXNcIl0+PiA6XG5cdFx0XHR7fTtcbn1cblxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4XG57XG5cdC8qKiAqL1xuXHRjb25zdCBlbnRyaWVzID0gbmV3IFdlYWtNYXA8U3RhdGVsZXNzRm9yY2UsIEVudHJ5PigpO1xuXHRcblx0LyoqICovXG5cdGNsYXNzIEVudHJ5XG5cdHtcblx0XHRyZWFkb25seSBzeXN0ZW1DYWxsYmFja3MgPSBuZXcgU2V0PFJlY3VycmVudENhbGxiYWNrPEF0b20+PigpO1xuXHR9XG5cdFxuXHQvKipcblx0ICogQSB0eXBlIHRoYXQgZGVzY3JpYmVzIGEgZm9yY2UgdGhhdCBjb250YWlucyBzb21lIHN0YXRlIHZhcmlhYmxlIHRoYXQsXG5cdCAqIHdoZW4gY2hhbmdlZCwgcG90ZW50aWFsbHkgY2F1c2VzIHRoZSBleGVjdXRpb24gb2YgYSBzZXJpZXMgb2YgXG5cdCAqIHJlY3VycmVudCBmdW5jdGlvbnMuXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBTdGF0ZWxlc3NGb3JjZSA9ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZDtcblx0XG5cdC8qKlxuXHQgKiBSZXR1cm5zIGEgYm9vbGVhbiB0aGF0IGluZGljYXRlcyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgdmFsdWVcblx0ICogaXMgYSBzdGF0ZWxlc3Mgb3Igc3RhdGVmdWwgZm9yY2UuXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gaXNGb3JjZShmbzogYW55KTogZm8gaXMgKCguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCkgfCBTdGF0ZWZ1bEZvcmNlXG5cdHtcblx0XHQvLyBUT0RPOiBUaGlzIGZ1bmN0aW9uIGFsc28gbmVlZHMgdG8gY2hlY2sgZm9yIEFycmF5Rm9yY2Unc1xuXHRcdHJldHVybiBpc1N0YXRlbGVzc0ZvcmNlKGZvKSB8fCBmbyBpbnN0YW5jZW9mIFN0YXRlZnVsRm9yY2U7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBHdWFyZHMgb24gd2hldGhlciB0aGUgc3BlY2lmaWVkIHZhbHVlIGlzIHN0YXRlbGVzcyBmb3JjZSBmdW5jdGlvbi5cblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBpc1N0YXRlbGVzc0ZvcmNlKGZvcmNlRm46IGFueSk6IGZvcmNlRm4gaXMgKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkXG5cdHtcblx0XHRyZXR1cm4gISFmb3JjZUZuICYmIGVudHJpZXMuaGFzKGZvcmNlRm4pO1xuXHR9XG5cdFxuXHRleHBvcnQgbmFtZXNwYWNlIENvcmVcblx0e1xuXHRcdGV4cG9ydCBjb25zdCBGb3JjZVV0aWwgPVxuXHRcdHtcblx0XHRcdC8qKiAqL1xuXHRcdFx0Y3JlYXRlRnVuY3Rpb24oKVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBUaGUgdXNlciBmb3JjZSBmdW5jdGlvbiBpcyBzZW50IGJhY2sgdG8gdGhlIHVzZXIsIHdobyB1c2VzXG5cdFx0XHRcdC8vIHRoaXMgZnVuY3Rpb24gYXMgYSBwYXJhbWV0ZXIgdG8gb3RoZXIgb24oKSBjYWxscywgb3IgdG8gY2FsbFxuXHRcdFx0XHQvLyBkaXJlY3RseSB3aGVuIHRoZSB0aGluZyBoYXBwZW5zLlxuXHRcdFx0XHRjb25zdCB1c2VyRm9yY2VGbiA9ICguLi5hcmdzOiBhbnlbXSkgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IHJlRm4gPSBlbnRyaWVzLmdldCh1c2VyRm9yY2VGbik7XG5cdFx0XHRcdFx0aWYgKHJlRm4pXG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IHN5c3RlbUNhbGxiYWNrIG9mIHJlRm4uc3lzdGVtQ2FsbGJhY2tzKVxuXHRcdFx0XHRcdFx0XHRzeXN0ZW1DYWxsYmFjayguLi5hcmdzKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IGVudHJ5ID0gbmV3IEVudHJ5KCk7XG5cdFx0XHRcdGVudHJpZXMuc2V0KHVzZXJGb3JjZUZuLCBlbnRyeSk7XG5cdFx0XHRcdHJldHVybiB1c2VyRm9yY2VGbjtcblx0XHRcdH0sXG5cdFx0XHRcblx0XHRcdC8qKlxuXHRcdFx0ICogUmV0dXJucyB0aGUgU3RhdGVsZXNzRm9yY2UgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgc3BlY2lmaWVkXG5cdFx0XHQgKiBmb3JjZSBmdW5jdGlvbi5cblx0XHRcdCAqL1xuXHRcdFx0YXR0YWNoRm9yY2UoXG5cdFx0XHRcdGZuOiBTdGF0ZWxlc3NGb3JjZSwgXG5cdFx0XHRcdHN5c3RlbUNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9tPilcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgcmUgPSBlbnRyaWVzLmdldChmbik7XG5cdFx0XHRcdGlmIChyZSlcblx0XHRcdFx0XHRyZS5zeXN0ZW1DYWxsYmFja3MuYWRkKHN5c3RlbUNhbGxiYWNrKTtcblx0XHRcdH0sXG5cdFx0XHRcblx0XHRcdC8qKlxuXHRcdFx0ICogXG5cdFx0XHQgKi9cblx0XHRcdGRldGFjaEZvcmNlKFxuXHRcdFx0XHRmbjogU3RhdGVsZXNzRm9yY2UsXG5cdFx0XHRcdHN5c3RlbUNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9tPilcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgZm8gPSBlbnRyaWVzLmdldChmbik7XG5cdFx0XHRcdGlmIChmbylcblx0XHRcdFx0XHRmby5zeXN0ZW1DYWxsYmFja3MuZGVsZXRlKHN5c3RlbUNhbGxiYWNrKTtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG59XG4iLCJcbi8qKlxuICogUmV0dXJucyBhIGZvcmNlIGZ1bmN0aW9uIHRoYXQgcmVtb3RlbHkgdHJpZ2dlcnMgc29tZSBiZWhhdmlvciB3aGVuIGludm9rZWQuXG4gKi9cbmZ1bmN0aW9uIGZvcmNlKCk6ICgpID0+IHZvaWQ7XG4vKipcbiAqIFJldHVybnMgYSBTdGF0ZWxlc3NGb3JjZSB0aGF0IHJlbW90ZWx5IHRyaWdnZXJzIHNvbWUgYmVoYXZpb3Igd2hlbiB0aGVcbiAqIGludGVybmFsIHZhbHVlIGlzIGNoYW5nZWQuXG4gKi9cbmZ1bmN0aW9uIGZvcmNlPEYgZXh0ZW5kcyAoLi4uYXJnczogYW55W10pID0+IHZvaWQgPSAoKSA9PiB2b2lkPigpOiBGO1xuLyoqXG4gKiBSZXR1cm5zIGEgQm9vbGVhbkZvcmNlIG9iamVjdCB0aGF0IHJlbW90ZWx5IHRyaWdnZXJzIHNvbWUgYmVoYXZpb3JcbiAqIHdoZW4gdGhlIGludGVybmFsIGJvb2xlYW4gdmFsdWUgaXMgY2hhbmdlZC5cbiAqL1xuZnVuY3Rpb24gZm9yY2UoaW5pdGlhbFZhbHVlOiBib29sZWFuKTogUmVmbGV4LkJvb2xlYW5Gb3JjZTtcbi8qKlxuICogUmV0dXJucyBhbiBBcnJheUZvcmNlIG9iamVjdCB0aGF0IHJlbW90ZWx5IHRyaWdnZXJzIHNvbWUgYmVoYXZpb3JcbiAqIHdoZW4gdGhlIGFycmF5IGlzIG1vZGlmaWVkLlxuICovXG5mdW5jdGlvbiBmb3JjZTxUPihiYWNraW5nQXJyYXk6IFRbXSk6IFJlZmxleC5BcnJheUZvcmNlPFQ+O1xuLyoqXG4gKiBSZXR1cm5zIGEgU3RhdGVsZXNzRm9yY2Ugb2JqZWN0IHRoYXQgcmVtb3RlbHkgdHJpZ2dlcnMgc29tZVxuICogYmVoYXZpb3Igd2hlbiB0aGUgaW50ZXJuYWwgb2JqZWN0IHZhbHVlIGlzIGNoYW5nZWQuXG4gKi9cbmZ1bmN0aW9uIGZvcmNlPFQgZXh0ZW5kcyB7fT4oaW5pdGlhbFZhbHVlOiBUKTogUmVmbGV4LlN0YXRlZnVsRm9yY2U8VD47XG5mdW5jdGlvbiBmb3JjZSh2YWw/OiBhbnkpXG57XG5cdGlmICh2YWwgPT09IHVuZGVmaW5lZCB8fCB2YWwgPT09IG51bGwpXG5cdFx0cmV0dXJuIFJlZmxleC5Db3JlLkZvcmNlVXRpbC5jcmVhdGVGdW5jdGlvbigpO1xuXHRcblx0aWYgKHR5cGVvZiB2YWwgPT09IFwiYm9vbGVhblwiKVxuXHRcdHJldHVybiBuZXcgUmVmbGV4LkJvb2xlYW5Gb3JjZSh2YWwpO1xuXHRcblx0aWYgKHR5cGVvZiB2YWwgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHZhbCA9PT0gXCJiaWdpbnRcIilcblx0XHRyZXR1cm4gbmV3IFJlZmxleC5TdGF0ZWZ1bEZvcmNlKHZhbCk7XG5cdFxuXHRpZiAodHlwZW9mIHZhbCA9PT0gXCJudW1iZXJcIilcblx0XHRyZXR1cm4gbmV3IFJlZmxleC5TdGF0ZWZ1bEZvcmNlKHZhbCB8fCAwKTtcblx0XG5cdGlmIChBcnJheS5pc0FycmF5KHZhbCkpXG5cdFx0cmV0dXJuIFJlZmxleC5BcnJheUZvcmNlLmNyZWF0ZSh2YWwpO1xuXHRcblx0aWYgKHR5cGVvZiB2YWwgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIHZhbCA9PT0gXCJzeW1ib2xcIilcblx0XHRyZXR1cm4gbmV3IFJlZmxleC5TdGF0ZWZ1bEZvcmNlKHZhbCk7XG5cdFxuXHR0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgY3JlYXRlIGEgZm9yY2UgZnJvbSB0aGlzIHZhbHVlLlwiKTtcbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBUaGUgaW50ZXJmYWNlIHRoYXQgUmVmbGV4IGxpYnJhcmllcyAoUmVmbGV4IE1MLCBSZWZsZXggU1MsIGV0Yylcblx0ICogbXVzdCBpbXBsZW1lbnQuIFxuXHQgKi9cblx0ZXhwb3J0IGludGVyZmFjZSBJTGlicmFyeVxuXHR7XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyBtdXN0IGltcGxlbWVudCB0aGlzIG1ldGhvZCwgc28gdGhhdCB0aGVcblx0XHQgKiBSZWZsZXggQ29yZSBjYW4gZGV0ZXJtaW5lIHRoZSBvcmlnaW5hdGluZyBsaWJyYXJ5IG9mIGEgZ2l2ZW5cblx0XHQgKiBvYmplY3QuIFRoZSBsaWJyYXJ5IHNob3VsZCByZXR1cm4gYSBib29sZWFuIHZhbHVlIGluZGljYXRpbmdcblx0XHQgKiB3aGV0aGVyIHRoZSBsaWJyYXJ5IGlzIGFibGUgdG8gb3BlcmF0ZSBvbiB0aGUgb2JqZWN0IHNwZWNpZmllZC5cblx0XHQgKi9cblx0XHRpc0tub3duQnJhbmNoKGJyYW5jaDogSUJyYW5jaCk6IGJvb2xlYW47XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyBtYXkgaW1wbGVtZW50IHRoaXMgbWV0aG9kIGluIG9yZGVyIHRvIHByb3ZpZGVcblx0XHQgKiB0aGUgc3lzdGVtIHdpdGgga25vd2xlZGdlIG9mIHdoZXRoZXIgYSBicmFuY2ggaGFzIGJlZW4gZGlzcG9zZWQsXG5cdFx0ICogd2hpY2ggaXQgdXNlcyBmb3IgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9ucy4gSWYgdGhlIGxpYnJhcnkgaGFzIG5vXG5cdFx0ICogbWVhbnMgb2YgZG9pbmcgdGhpcywgaXQgbWF5IHJldHVybiBcIm51bGxcIi5cblx0XHQgKi9cblx0XHRpc0JyYW5jaERpc3Bvc2VkPzogKGJyYW5jaDogSUJyYW5jaCkgPT4gYm9vbGVhbjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRnZXRTdGF0aWNCcmFuY2hlcz86ICgpID0+IHsgW25hbWU6IHN0cmluZ106IGFueSB9IHwgdW5kZWZpbmVkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgdGhhdCBoYXZlIHN0YXRpYyBtZW1iZXJzIGluIHRoZWlyIG5hbWVzcGFjZSBtdXN0XG5cdFx0ICogcmV0dXJuIHRoZW0gYXMgYW4gb2JqZWN0IGluIHRoaXMgbWV0aG9kLlxuXHRcdCAqL1xuXHRcdGdldFN0YXRpY05vbkJyYW5jaGVzPzogKCkgPT4geyBbbmFtZTogc3RyaW5nXTogYW55IH0gfCB1bmRlZmluZWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0Z2V0RHluYW1pY0JyYW5jaD86IChuYW1lOiBzdHJpbmcpID0+IElCcmFuY2g7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyBtdXN0IGltcGxlbWVudCB0aGlzIGZ1bmN0aW9uIHRvIGNyZWF0ZSBhYnN0cmFjdFxuXHRcdCAqIHRvcC1sZXZlbCBjb250YWluZXIgYnJhbmNoZXMuXG5cdFx0ICogXG5cdFx0ICogVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgaW1wbGVtZW50ZWQgYnkgbGlicmFyaWVzIHRoYXQgdXNlIHRoZVxuXHRcdCAqIGNvbnRhaW5lciBuYW1lc3BhY2UgdmFyaWFudC5cblx0XHQgKi9cblx0XHRnZXREeW5hbWljTm9uQnJhbmNoPzogKG5hbWU6IHN0cmluZykgPT4gYW55O1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGdldFJvb3RCcmFuY2g/OiAoKSA9PiBJQnJhbmNoO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgdGhhdCBhcmUgaW1wbGVtZW50ZWQgd2l0aCB0aGUgbGVhZiBuYW1lc3BhY2Vcblx0XHQgKiB2YXJpYW50IHVzZSB0aGlzIG1ldGhvZCB0byBjb252ZXJ0IHZhbHVlcyBwYXNzZWQgaW50byB0aGUgbmFtZXNwYWNlXG5cdFx0ICogb2JqZWN0J3MgdGFnZ2VkIHRlbXBsYXRlIGZ1bmN0aW9uIGludG8gb2JqZWN0cyB0aGF0IG1heSBiZSBpbnRlcnByZXRlZFxuXHRcdCAqIGFzIGRpc3BsYXkgdGV4dC5cblx0XHQgKi9cblx0XHRnZXRMZWFmPzogKGxlYWY6IGFueSkgPT4gYW55O1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgdGhhdCBzdXBwb3J0IGlubGluZSB0YXJnZXQrY2hpbGRyZW4gY2xvc3VyZXNcblx0XHQgKiBtdXN0IHByb3ZpZGUgYW4gaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgbWV0aG9kLlxuXHRcdCAqL1xuXHRcdGdldENoaWxkcmVuKHRhcmdldDogSUJyYW5jaCk6IEl0ZXJhYmxlPElCcmFuY2ggfCBJTGVhZj47XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0c3dhcEJyYW5jaGVzKGJyYW5jaDE6IElCcmFuY2gsIGJyYW5jaDI6IElCcmFuY2gpOiB2b2lkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdHJlcGxhY2VCcmFuY2goYnJhbmNoMTogSUJyYW5jaCwgYnJhbmNoMjogSUJyYW5jaCk6IHZvaWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0YXR0YWNoQXRvbShhdG9tOiBhbnksIGJyYW5jaDogSUJyYW5jaCwgcmVmOiBSZWYpOiB2b2lkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGRldGFjaEF0b20oYXRvbTogYW55LCBicmFuY2g6IElCcmFuY2gpOiB2b2lkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGF0dGFjaEF0dHJpYnV0ZShicmFuY2g6IElCcmFuY2gsIGtleTogc3RyaW5nLCB2YWx1ZTogYW55KTogdm9pZDtcblx0XHRcdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0ZGV0YWNoQXR0cmlidXRlKGJyYW5jaDogSUJyYW5jaCwga2V5OiBzdHJpbmcpOiB2b2lkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgY2FuIGhpamFjayB0aGUgb24oKSwgb25jZSgpIGFuZCBvbmx5KCkgZnVuY3Rpb25zXG5cdFx0ICogdG8gcHJvdmlkZSB0aGVpciBvd24gY3VzdG9tIGJlaGF2aW9yIGJ5IG92ZXJyaWRpbmcgdGhpcyBtZXRob2QuXG5cdFx0ICogXG5cdFx0ICogSWYgdGhlIG1ldGhvZCByZXR1cm5zIHVuZGVmaW5lZCwgdGhlIHJlY3VycmVudCBmdW5jdGlvbiBjcmVhdGlvblxuXHRcdCAqIGZhY2lsaXRpZXMgYnVpbHQgaW50byB0aGUgUmVmbGV4IENvcmUgYXJlIHVzZWQuXG5cdFx0ICovXG5cdFx0Y3JlYXRlUmVjdXJyZW50PzogKFxuXHRcdFx0a2luZDogUmVjdXJyZW50S2luZCxcblx0XHRcdHNlbGVjdG9yOiBhbnksXG5cdFx0XHRjYWxsYmFjazogUmVjdXJyZW50Q2FsbGJhY2s8QXRvbT4sXG5cdFx0XHRyZXN0OiBhbnlbXSkgPT4gYW55XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyB0aGF0IGNvbnRyaWJ1dGUgdG8gdGhlIGdsb2JhbCBvbigpIGZ1bmN0aW9uXG5cdFx0ICogbXVzdCBwcm92aWRlIGFuIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIG1ldGhvZC5cblx0XHQgKiBcblx0XHQgKiBMaWJyYXJpZXMgbXVzdCBpbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiBpbiBvcmRlciB0byBwcm92aWRlIHRoZWlyIG93blxuXHRcdCAqIGhvb2tzIGludG8gdGhlIGdsb2JhbCByZWN1cnJlbnQgZnVuY3Rpb25zIChzdWNoIGFzIG9uKCksIG9ubHkoKSBhbmQgb25jZSgpKS5cblx0XHQgKiBcblx0XHQgKiBJZiB0aGUgbGlicmFyeSBkb2VzIG5vdCByZWNvZ25pemUgdGhlIHNlbGVjdG9yIHByb3ZpZGVkLCBpdCBzaG91bGRcblx0XHQgKiByZXR1cm4gZmFsc2UsIHNvIHRoYXQgdGhlIFJlZmxleCBlbmdpbmUgY2FuIGZpbmQgYW5vdGhlciBwbGFjZSB0b1xuXHRcdCAqIHBlcmZvcm0gdGhlIGF0dGFjaG1lbnQuIEluIG90aGVyIGNhc2VzLCBpdCBzaG91bGQgcmV0dXJuIHRydWUuXG5cdFx0ICovXG5cdFx0YXR0YWNoUmVjdXJyZW50PzogKFxuXHRcdFx0a2luZDogUmVjdXJyZW50S2luZCxcblx0XHRcdHRhcmdldDogSUJyYW5jaCxcblx0XHRcdHNlbGVjdG9yOiBhbnksXG5cdFx0XHRjYWxsYmFjazogUmVjdXJyZW50Q2FsbGJhY2s8QXRvbT4sXG5cdFx0XHRyZXN0OiBhbnlbXSkgPT4gYm9vbGVhbjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIHRoYXQgY29udHJpYnV0ZSB0byB0aGUgZ2xvYmFsIG9mZigpIGZ1bmN0aW9uXG5cdFx0ICogbXVzdCBwcm92aWRlIGFuIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIG1ldGhvZC5cblx0XHQgKi9cblx0XHRkZXRhY2hSZWN1cnJlbnQ/OiAoXG5cdFx0XHRicmFuY2g6IElCcmFuY2gsXG5cdFx0XHRzZWxlY3RvcjogYW55LFxuXHRcdFx0Y2FsbGJhY2s6IFJlY3VycmVudENhbGxiYWNrPEF0b20+KSA9PiB2b2lkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgY2FuIGltcGxlbWVudCB0aGlzIGZ1bmN0aW9uIGluIG9yZGVyXG5cdFx0ICogdG8gY2FwdHVyZSB0aGUgZmxvdyBvZiBicmFuY2hlcyBiZWluZyBwYXNzZWQgYXNcblx0XHQgKiBhdG9tcyB0byBvdGhlciBicmFuY2ggZnVuY3Rpb25zLlxuXHRcdCAqL1xuXHRcdGhhbmRsZUJyYW5jaEZ1bmN0aW9uPzogKFxuXHRcdFx0YnJhbmNoOiBJQnJhbmNoLFxuXHRcdFx0YnJhbmNoRm46ICguLi5hdG9tczogYW55W10pID0+IElCcmFuY2gpID0+IHZvaWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyBjYW4gaW1wbGVtZW50IHRoaXMgZnVuY3Rpb24gaW4gb3JkZXIgdG8gcHJvY2Vzc1xuXHRcdCAqIGEgYnJhbmNoIGJlZm9yZSBpdCdzIHJldHVybmVkIGZyb20gYSBicmFuY2ggZnVuY3Rpb24uIFdoZW4gdGhpc1xuXHRcdCAqIGZ1bmN0aW9uIGlzIGltcGxlbWVudGVkLCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBicmFuY2ggZnVuY3Rpb25zXG5cdFx0ICogYXJlIHJlcGxhY2VkIHdpdGggdGhlIHJldHVybiB2YWx1ZSBvZiB0aGlzIGZ1bmN0aW9uLiBSZWZsZXhpdmUgbGlicmFyaWVzXG5cdFx0ICogdGhhdCByZXF1aXJlIHRoZSBzdGFuZGFyZCBiZWhhdmlvciBvZiByZXR1cm5pbmcgYnJhbmNoZXMgZnJvbSB0aGVcblx0XHQgKiBicmFuY2ggZnVuY3Rpb25zIHNob3VsZCByZXR1cm4gdGhlIGBicmFuY2hgIGFyZ3VtZW50IHRvIHRoaXMgZnVuY3Rpb25cblx0XHQgKiB2ZXJiYXRpbS5cblx0XHQgKi9cblx0XHRyZXR1cm5CcmFuY2g/OiAoYnJhbmNoOiBJQnJhbmNoKSA9PiBzdHJpbmcgfCBudW1iZXIgfCBiaWdpbnQgfCBvYmplY3Q7XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdGxldCBuZXh0VmFsID0gMDtcblx0bGV0IG5leHRUaW1lc3RhbXAgPSAwO1xuXHRcblx0LyoqICovXG5cdGV4cG9ydCBjb25zdCBlbnVtIExvY2F0b3JUeXBlXG5cdHtcblx0XHRicmFuY2ggPSAwLFxuXHRcdGxlYWYgPSAxLFxuXHRcdHN0cmVhbSA9IDJcblx0fVxuXHRcblx0LyoqXG5cdCAqIEEgbXVsdGktbGV2ZWwgaW5kZXhpbmcgZGF0YSB0eXBlLCB1c2VkIHRvIGNvbnRyb2wgd2hlcmUgbmV3IHNpYmxpbmcgYnJhbmNoZXNcblx0ICogc2hvdWxkIGJlIGluc2VydGVkIGluIGEgZ2l2ZW4gc2libGluZyBsaXN0LlxuXHQgKiBcblx0ICogTG9jYXRvcnMgYXJlIHVzZWQgdG8gc29sdmUgdGhlIHByb2JsZW0gb2YgZGV0ZXJtaW5pbmcgd2hlcmUgdG8gcG9zaXRpb24gdGhlXG5cdCAqIGxlYXZlcyBhbmQgYnJhbmNoZXMgcmV0dXJuZWQgYnkgcmVjdXJyZW50IGZ1bmN0aW9ucyB3aXRoaW4gc29tZSBvdGhlciBicmFuY2guXG5cdCAqIFxuXHQgKiBFYWNoIE1ldGEgb2JqZWN0IGhhcyBhIGNvcnJlc3BvbmRpbmcgTG9jYXRvci5cblx0ICovXG5cdGV4cG9ydCBjbGFzcyBMb2NhdG9yXG5cdHtcblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIGEgZnVsbHkgZm9ybWVkIExvY2F0b3Igb2JqZWN0IGZyb20gaXQncyBzZXJpYWxpemVkIHJlcHJlc2VudGF0aW9uLlxuXHRcdCAqL1xuXHRcdHN0YXRpYyBwYXJzZShzZXJpYWxpemVkTG9jYXRvcjogc3RyaW5nKVxuXHRcdHtcblx0XHRcdGNvbnN0IHBhcnRzID0gc2VyaWFsaXplZExvY2F0b3Iuc3BsaXQoL1t8Pl0vZyk7XG5cdFx0XHRjb25zdCB0eXBlID0gPExvY2F0b3JUeXBlPnBhcnNlSW50KHBhcnRzLnNoaWZ0KCkgfHwgXCIwXCIsIDEwKSB8fCBMb2NhdG9yVHlwZS5icmFuY2g7XG5cdFx0XHRjb25zdCBsb2NhdG9yID0gbmV3IExvY2F0b3IodHlwZSk7XG5cdFx0XHRsb2NhdG9yLmhvbWVUaW1lc3RhbXAgPSBwYXJzZUludChwYXJ0cy5zaGlmdCgpIHx8IFwiMFwiLCAxMCkgfHwgMDtcblx0XHRcdGxvY2F0b3IudmFsdWVzLnB1c2goLi4ucGFydHMubWFwKHAgPT4gcGFyc2VJbnQocCwgMTApIHx8IDApKTtcblx0XHRcdHJldHVybiBsb2NhdG9yO1xuXHRcdH1cblx0XHRcblx0XHRjb25zdHJ1Y3RvcihyZWFkb25seSB0eXBlOiBMb2NhdG9yVHlwZSkgeyB9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0dG9TdHJpbmcoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoXG5cdFx0XHRcdHRoaXMudHlwZSArIFwifFwiICtcblx0XHRcdFx0dGhpcy5ob21lVGltZXN0YW1wICsgXCJ8XCIgK1xuXHRcdFx0XHR0aGlzLnZhbHVlcy5qb2luKFwiPlwiKVxuXHRcdFx0KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIGJlbG93IGFycmF5IGlzIGluaXRpYWxpemVkIHRvIGVtcHR5IHdoZW4gdGhlIExvY2F0b3IgaW5zdGFuY2VcbiBcdFx0ICogaXMgaW5zdGFudGlhdGVkLiBUaGlzIGlzIGJlY2F1c2Ugd2hlbiBsb2NhdG9ycyBhcmUgZmlyc3QgaW5zdGFudGlhdGVkLFxuIFx0XHQgKiB0aGV5IHJlZmVyIHRvIG1ldGFzIHRoYXQgYXJlIGZsb2F0aW5nIGluIGxpbWJvIC0tIHRoZXkncmUgbm90IGF0dGFjaGVkXG4gXHRcdCAqIHRvIGFueXRoaW5nLiBMb2NhdG9yIHZhbHVlcyBvbmx5IGJlY29tZSByZWxldmFudCBhdCB0aGUgcG9pbnQgd2hlblxuIFx0XHQgKiB0aGV5IGFyZSBhdHRhY2hlZCB0byBzb21lIGNvbnRhaW5pbmcgbWV0YSwgYmVjYXVzZSBvdGhlcndpc2UsIGl0J3NcbiBcdFx0ICogbm90IHBvc3NpYmxlIGZvciB0aGUgbG9jYXRvciB0byByZWZlciB0byBhIG1ldGEgdGhhdCBoYXMgXCJzaWJsaW5nc1wiLCBcbiBcdFx0ICogd2hpY2ggaXMgdGhlIGVudGlyZSBwb2ludCBvZiB0aGUgTG9jYXRvciBjb25jZXB0LlxuXHRcdCAqL1xuXHRcdHByaXZhdGUgdmFsdWVzOiBudW1iZXJbXSA9IFtdO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdHNldExhc3RMb2NhdG9yVmFsdWUodmFsdWU6IG51bWJlcilcblx0XHR7XG5cdFx0XHR0aGlzLnZhbHVlc1t0aGlzLnZhbHVlcy5sZW5ndGggLSAxXSA9IHZhbHVlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRnZXRMYXN0TG9jYXRvclZhbHVlKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy52YWx1ZXNbdGhpcy52YWx1ZXMubGVuZ3RoIC0gMV07XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRpbWVzdGFtcHMgYXJlIGF0dGFjaGVkIHRvIGVhY2ggbWV0YS4gVGhleSBhcmUgb25seSB1c2VkIHRvIGRldGVybWluZVxuXHRcdCAqIHdoZXRoZXIgdHdvIG1ldGFzIG9yaWdpbmF0ZWQgaW4gdGhlIHNhbWUgY29udGFpbmVyLiBXaGVuIGl0ZXJhdGluZ1xuXHRcdCAqIHRocm91Z2ggYSBtZXRhJ3MgY2hpbGRyZW4sIGl0cyBwb3NzaWJsZSB0aGF0IHNvbWUgb2YgdGhlIG1ldGFzIHdlcmUgbW92ZWRcblx0XHQgKiBpbiBhcyBzaWJsaW5ncyBhdCBydW50aW1lLiBUaW1lc3RhbXBzIGFyZSB1c2VkIHRvIG1ha2Ugc3VyZSB0aGVzZSBmb3JlaWduXG5cdFx0ICogbWV0YXMgYXJlIG9taXR0ZWQgd2hlbiBkb2luZyB0aGVzZSBpdGVyYXRpb25zLlxuXHRcdCAqL1xuXHRcdHByaXZhdGUgcmVhZG9ubHkgdGltZXN0YW1wID0gKytuZXh0VGltZXN0YW1wO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyB0aGUgdGltZXN0YW1wIG9mIHRoZSBicmFuY2ggdGhhdCB3YXMgdGhlIG9yaWdpbmFsIFwiaG9tZVwiIG9mXG5cdFx0ICogdGhlIGJyYW5jaCB0aGF0IHRoaXMgbG9jYXRvciByZWZlcnMgdG8uIFwiSG9tZVwiIGluIHRoaXMgY2FzZSBtZWFucyB0aGVcblx0XHQgKiBicmFuY2ggd2hlcmUgaXQgd2FzIG9yaWdpbmFsbHkgYXBwZW5kZWQuIEluIHRoZSBjYXNlIHdoZW4gdGhlIGxvY2F0b3Jcblx0XHQgKiBoYXNuJ3QgYmVlbiBhcHBlbmRlZCBhbnl3aGVyZSwgdGhlIHZhbHVlIGlzIDAuXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSBob21lVGltZXN0YW1wID0gMDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRzZXRDb250YWluZXIoY29udGFpbmVyTG9jOiBMb2NhdG9yKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLmhvbWVUaW1lc3RhbXAgIT09IDApXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdFxuXHRcdFx0aWYgKENvbnN0LmRlYnVnICYmIHRoaXMudmFsdWVzLmxlbmd0aCA+IDApXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIj9cIik7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHZhbCA9ICsrbmV4dFZhbDtcblx0XHRcdFxuXHRcdFx0aWYgKGNvbnRhaW5lckxvYy50eXBlID09PSBMb2NhdG9yVHlwZS5zdHJlYW0pXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuaG9tZVRpbWVzdGFtcCA9IGNvbnRhaW5lckxvYy5ob21lVGltZXN0YW1wO1xuXHRcdFx0XHR0aGlzLnZhbHVlcy5wdXNoKC4uLmNvbnRhaW5lckxvYy52YWx1ZXMsIHZhbCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChjb250YWluZXJMb2MudHlwZSA9PT0gTG9jYXRvclR5cGUuYnJhbmNoKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmhvbWVUaW1lc3RhbXAgPSBjb250YWluZXJMb2MudGltZXN0YW1wO1xuXHRcdFx0XHR0aGlzLnZhbHVlcy5wdXNoKHZhbCk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChDb25zdC5kZWJ1ZyAmJiBjb250YWluZXJMb2MudHlwZSA9PT0gTG9jYXRvclR5cGUubGVhZilcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiP1wiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y29tcGFyZShvdGhlcjogTG9jYXRvcik6IENvbXBhcmVSZXN1bHRcblx0XHR7XG5cdFx0XHQvLyBEZXRlY3QgYSBwb3RlbnRpYWwgY29tcGFyaXNvbiB3aXRoIGEgZmxvYXRpbmcgbWV0YVxuXHRcdFx0aWYgKHRoaXMuaG9tZVRpbWVzdGFtcCA9PT0gMCB8fCBvdGhlci5ob21lVGltZXN0YW1wID09PSAwKVxuXHRcdFx0XHRyZXR1cm4gQ29tcGFyZVJlc3VsdC5pbmNvbXBhcmFibGU7XG5cdFx0XHRcblx0XHRcdC8vIERldGVjdCBkaWZmZXJpbmcgb3JpZ2luYXRpbmcgY29udGFpbmVyc1xuXHRcdFx0aWYgKHRoaXMuaG9tZVRpbWVzdGFtcCAhPT0gb3RoZXIuaG9tZVRpbWVzdGFtcClcblx0XHRcdFx0cmV0dXJuIENvbXBhcmVSZXN1bHQuaW5jb21wYXJhYmxlO1xuXHRcdFx0XG5cdFx0XHRjb25zdCB0aGlzTGFzdCA9IHRoaXMudmFsdWVzW3RoaXMudmFsdWVzLmxlbmd0aCAtIDFdO1xuXHRcdFx0Y29uc3Qgb3RoZXJMYXN0ID0gb3RoZXIudmFsdWVzW290aGVyLnZhbHVlcy5sZW5ndGggLSAxXTtcblx0XHRcdFxuXHRcdFx0Ly8gRGV0ZWN0IHNpbXBsZSBlcXVhbGl0eVxuXHRcdFx0aWYgKHRoaXNMYXN0ID09PSBvdGhlckxhc3QpXG5cdFx0XHRcdHJldHVybiBDb21wYXJlUmVzdWx0LmVxdWFsO1xuXHRcdFx0XG5cdFx0XHQvLyBXZSdyZSBydW5uaW5nIGEgY29tcGFyaXNvbiBvbiB0aGUgY29tbW9uIHBvcnRpb24gb2YgdGhlXG5cdFx0XHQvLyB0d28gbnVtYmVyIHNlcXVlbmNlcy4gSWYgdGhlIG9uZSBpcyBsb25nZXIgdGhhbiB0aGUgb3RoZXIsXG5cdFx0XHQvLyBpdCdzIG5vdCBjb25zaWRlcmVkIGhlcmUuXG5cdFx0XHRjb25zdCBtaW5MZW4gPSBNYXRoLm1pbih0aGlzLnZhbHVlcy5sZW5ndGgsIG90aGVyLnZhbHVlcy5sZW5ndGgpO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IG1pbkxlbjspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHRoaXNWYWwgPSB0aGlzLnZhbHVlc1tpXTtcblx0XHRcdFx0Y29uc3Qgb3RoZXJWYWwgPSBvdGhlci52YWx1ZXNbaV07XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAodGhpc1ZhbCA8IG90aGVyVmFsKVxuXHRcdFx0XHRcdHJldHVybiBDb21wYXJlUmVzdWx0LmhpZ2hlcjtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICh0aGlzVmFsID4gb3RoZXJWYWwpXG5cdFx0XHRcdFx0cmV0dXJuIENvbXBhcmVSZXN1bHQubG93ZXI7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdC8vIFRoZSBjb2RlIGJlbG93IGhhbmRsZXMgdGhlIGNhc2Ugd2hlbiB3ZSBoYXZlIHR3byBzZXF1ZW5jZXNcblx0XHRcdC8vIG9mIHZhbHVlcywgd2hlcmUgdGhlIG9uZSBzZXF1ZW5jZXMgaXMgYmFzaWNhbGx5IGFuIGV4dGVuc2lvbiBvZiB0aGVcblx0XHRcdC8vIG90aGVyLCB1bHRpbWF0ZWx5IGxvb2tpbmcgc29tZXRoaW5nIGxpa2UgdGhpczpcblx0XHRcdC8vIFxuXHRcdFx0Ly8gMT4yXG5cdFx0XHQvLyAxPjI+Mz40XG5cdFx0XHQvLyBcblx0XHRcdC8vIEluIHRoaXMgY2FzZSwgdGhlIHNob3J0ZXIgc2VxdWVuY2UgaXMgY29uc2lkZXJlZCBcImxvd2VyXCIgdGhhbiB0aGVcblx0XHRcdC8vIGxvbmdlciBvbmUsIGJlY2F1c2UgaW4gdGhpcyBjYXNlLCB0aGUgY29uc3VtZXJzIG9mIHRoaXMgbWV0aG9kIGFyZVxuXHRcdFx0Ly8gYmFzaWNhbGx5IHRyeWluZyB0byBcImdldCB0byB0aGUgZW5kIG9mIGFsbCB0aGUgMT4yJ3NcIiwgYW5kIHVzaW5nIDE+MlxuXHRcdFx0Ly8gYXMgdGhlIGlucHV0IHRvIGNvbW11bmljYXRlIHRoYXQuXG5cdFx0XHRcblx0XHRcdGlmICh0aGlzLnZhbHVlcy5sZW5ndGggPiBvdGhlci52YWx1ZXMubGVuZ3RoKVxuXHRcdFx0XHRyZXR1cm4gQ29tcGFyZVJlc3VsdC5oaWdoZXI7XG5cdFx0XHRcblx0XHRcdGlmICh0aGlzLnZhbHVlcy5sZW5ndGggPCBvdGhlci52YWx1ZXMubGVuZ3RoKVxuXHRcdFx0XHRyZXR1cm4gQ29tcGFyZVJlc3VsdC5sb3dlcjtcblx0XHRcdFxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiP1wiKTtcblx0XHR9XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgY29uc3QgZW51bSBDb21wYXJlUmVzdWx0XG5cdHtcblx0XHRlcXVhbCxcblx0XHRpbmNvbXBhcmFibGUsXG5cdFx0aGlnaGVyLFxuXHRcdGxvd2VyXG5cdH1cdFxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0ZXhwb3J0IHR5cGUgQ29uc3RydWN0QnJhbmNoRm4gPSAoLi4uYXJnczogYW55W10pID0+IElCcmFuY2g7XG5cdFxuXHQvKiogQGludGVybmFsICovXG5cdGRlY2xhcmUgY29uc3QgRGVubzogYW55O1xuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgQXNMaWJyYXJ5PFQsIEwgZXh0ZW5kcyBJTGlicmFyeT4gPSBcblx0XHRUICZcblx0XHRTdGF0aWNCcmFuY2hlc09mPEw+ICZcblx0XHRTdGF0aWNOb25CcmFuY2hlc09mPEw+O1xuXHRcblx0LyoqXG5cdCAqIENyZWF0ZXMgYSBSZWZsZXggbmFtZXNwYWNlLCB3aGljaCBpcyB0aGUgdG9wLWxldmVsIGZ1bmN0aW9uIG9iamVjdCB0aGF0XG5cdCAqIGhvbGRzIGFsbCBmdW5jdGlvbnMgaW4gdGhlIHJlZmxleGl2ZSBsaWJyYXJ5LlxuXHQgKiBcblx0ICogVGhpcyBmdW5jdGlvbiBjcmVhdGVzIHRoZSBcImxlYWZcIiB2YXJpYW50IG9mIGEgUmVmbGV4IG5hbWVzcGFjZSwgd2hpY2hcblx0ICogaXMgdGhlIHN0eWxlIHdoZXJlIHRoZSBuYW1lc3BhY2UsIHdoZW4gY2FsbGVkIGFzIGEgZnVuY3Rpb24sIHByb2R1Y2VzXG5cdCAqIHZpc3VhbCBjb250ZW50IHRvIGRpc3BsYXkuIFJlZmxleGl2ZSBsaWJyYXJpZXMgdGhhdCB1c2UgdGhpcyB2YXJpYW50IG1heVxuXHQgKiB1c2UgdGhlIG5hbWVzcGFjZSBhcyBhIHRhZ2dlZCB0ZW1wbGF0ZSBmdW5jdGlvbiwgZm9yIGV4YW1wbGU6XG5cdCAqIG1sYExpdGVyYWwgdGV4dCBjb250ZW50YDtcblx0ICogXG5cdCAqIEBwYXJhbSBsaWJyYXJ5IEFuIG9iamVjdCB0aGF0IGltcGxlbWVudHMgdGhlIElMaWJyYXJ5IGludGVyZmFjZSxcblx0ICogZnJvbSB3aGljaCB0aGUgbmFtZXNwYWNlIG9iamVjdCB3aWxsIGJlIGdlbmVyYXRlZC5cblx0ICogXG5cdCAqIEBwYXJhbSBnbG9iYWxpemUgSW5kaWNhdGVzIHdoZXRoZXIgdGhlIG9uL29uY2Uvb25seSBnbG9iYWxzIHNob3VsZFxuXHQgKiBiZSBhcHBlbmRlZCB0byB0aGUgZ2xvYmFsIG9iamVjdCAod2hpY2ggaXMgYXV0by1kZXRlY3RlZCBmcm9tIHRoZVxuXHQgKiBjdXJyZW50IGVudmlyb25tZW50LiBJZiB0aGUgSUxpYnJhcnkgaW50ZXJmYWNlIHByb3ZpZGVkIGRvZXNuJ3Qgc3VwcG9ydFxuXHQgKiB0aGUgY3JlYXRpb24gb2YgcmVjdXJyZW50IGZ1bmN0aW9ucywgdGhpcyBwYXJhbWV0ZXIgaGFzIG5vIGVmZmVjdC5cblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMZWFmTmFtZXNwYWNlXG5cdFx0PE4gZXh0ZW5kcyBJTGVhZk5hbWVzcGFjZSwgTCBleHRlbmRzIElMaWJyYXJ5Pihcblx0XHRsaWJyYXJ5OiBMLFxuXHRcdGdsb2JhbGl6ZT86IGJvb2xlYW4pOiBBc0xpYnJhcnk8TiwgTD5cblx0e1xuXHRcdGlmIChDb25zdC5kZWJ1ZyAmJiAhbGlicmFyeS5nZXRMZWFmKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhlIC5nZXRMZWFmIGZ1bmN0aW9uIG11c3QgYmUgaW1wbGVtZW50ZWQgaW4gdGhpcyBsaWJyYXJ5LlwiKTtcblx0XHRcblx0XHRyZXR1cm4gY3JlYXRlTmFtZXNwYWNlKHRydWUsIGxpYnJhcnksIGdsb2JhbGl6ZSk7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEgUmVmbGV4IG5hbWVzcGFjZSwgd2hpY2ggaXMgdGhlIHRvcC1sZXZlbCBmdW5jdGlvbiBvYmplY3QgdGhhdFxuXHQgKiBob2xkcyBhbGwgZnVuY3Rpb25zIGluIHRoZSByZWZsZXhpdmUgbGlicmFyeS5cblx0ICogXG5cdCAqIFRoaXMgZnVuY3Rpb24gY3JlYXRlcyB0aGUgXCJjb250YWluZXJcIiB2YXJpYW50IG9mIGEgUmVmbGV4IG5hbWVzcGFjZSwgd2hpY2hcblx0ICogaXMgdGhlIHN0eWxlIHdoZXJlIHRoZSBuYW1lc3BhY2UsIHdoZW4gY2FsbGVkIGFzIGEgZnVuY3Rpb24sIHByb2R1Y2VzXG5cdCAqIGFuIGFic3RyYWN0IHRvcC1sZXZlbCBjb250YWluZXIgb2JqZWN0LlxuXHQgKiBcblx0ICogQHBhcmFtIGxpYnJhcnkgQW4gb2JqZWN0IHRoYXQgaW1wbGVtZW50cyB0aGUgSUxpYnJhcnkgaW50ZXJmYWNlLFxuXHQgKiBmcm9tIHdoaWNoIHRoZSBuYW1lc3BhY2Ugb2JqZWN0IHdpbGwgYmUgZ2VuZXJhdGVkLlxuXHQgKiBcblx0ICogQHBhcmFtIGdsb2JhbGl6ZSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgb24vb25jZS9vbmx5IGdsb2JhbHMgc2hvdWxkXG5cdCAqIGJlIGFwcGVuZGVkIHRvIHRoZSBnbG9iYWwgb2JqZWN0ICh3aGljaCBpcyBhdXRvLWRldGVjdGVkIGZyb20gdGhlXG5cdCAqIGN1cnJlbnQgZW52aXJvbm1lbnQuIElmIHRoZSBJTGlicmFyeSBpbnRlcmZhY2UgcHJvdmlkZWQgZG9lc24ndCBzdXBwb3J0XG5cdCAqIHRoZSBjcmVhdGlvbiBvZiByZWN1cnJlbnQgZnVuY3Rpb25zLCB0aGlzIHBhcmFtZXRlciBoYXMgbm8gZWZmZWN0LlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUJyYW5jaE5hbWVzcGFjZVxuXHRcdDxOIGV4dGVuZHMgSUJyYW5jaE5hbWVzcGFjZSwgTCBleHRlbmRzIElMaWJyYXJ5Pihcblx0XHRsaWJyYXJ5OiBMLFxuXHRcdGdsb2JhbGl6ZT86IGJvb2xlYW4pOiBBc0xpYnJhcnk8TiwgTD5cblx0e1xuXHRcdGlmIChDb25zdC5kZWJ1ZyAmJiAhbGlicmFyeS5nZXRSb290QnJhbmNoKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhlIC5nZXRSb290QnJhbmNoIGZ1bmN0aW9uIG11c3QgYmUgaW1wbGVtZW50ZWQgaW4gdGhpcyBsaWJyYXJ5LlwiKTtcblx0XHRcblx0XHRyZXR1cm4gY3JlYXRlTmFtZXNwYWNlKGZhbHNlLCBsaWJyYXJ5LCBnbG9iYWxpemUpO1xuXHR9XG5cdFxuXHQvKipcblx0ICogSW50ZXJuYWwgbmFtZXNwYWNlIG9iamVjdCBjcmVhdGlvbiBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIGNyZWF0ZU5hbWVzcGFjZTxUTmFtZXNwYWNlLCBUTGlicmFyeSBleHRlbmRzIElMaWJyYXJ5Pihcblx0XHRpc0xlYWY6IGJvb2xlYW4sXG5cdFx0bGlicmFyeTogVExpYnJhcnksXG5cdFx0Z2xvYmFsaXplPzogYm9vbGVhbik6IEFzTGlicmFyeTxUTmFtZXNwYWNlLCBUTGlicmFyeT5cblx0e1xuXHRcdFJvdXRpbmdMaWJyYXJ5LmFkZExpYnJhcnkobGlicmFyeSk7XG5cdFx0XG5cdFx0Y29uc3QgZ2xvYjogYW55ID1cblx0XHRcdCFnbG9iYWxpemUgPyBudWxsIDpcblx0XHRcdC8vIE5vZGUuanNcblx0XHRcdCh0eXBlb2YgZ2xvYmFsID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBnbG9iYWwuc2V0VGltZW91dCA9PT0gXCJmdW5jdGlvblwiKSA/IGdsb2JhbCA6XG5cdFx0XHQvLyBCcm93c2VyIC8gRGVub1xuXHRcdFx0KHR5cGVvZiBuYXZpZ2F0b3IgPT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIERlbm8gPT09IFwib2JqZWN0XCIpID8gd2luZG93IDpcblx0XHRcdG51bGw7XG5cdFx0XG5cdFx0Ly8gV2UgY3JlYXRlIHRoZSBvbiwgb25jZSwgYW5kIG9ubHkgZ2xvYmFscyBpbiB0aGUgY2FzZSB3aGVuIHdlJ3JlIGNyZWF0aW5nXG5cdFx0Ly8gYSBuYW1lc3BhY2Ugb2JqZWN0IGZvciBhIGxpYnJhcnkgdGhhdCBzdXBwb3J0cyByZWN1cnJlbnQgZnVuY3Rpb25zLlxuXHRcdGlmIChnbG9iICYmIGxpYnJhcnkuYXR0YWNoUmVjdXJyZW50KVxuXHRcdHtcblx0XHRcdGNvbnN0IGNyZWF0ZUdsb2JhbCA9IChraW5kOiBSZWN1cnJlbnRLaW5kKSA9PiAoXG5cdFx0XHRcdHNlbGVjdG9yOiBhbnksXG5cdFx0XHRcdGNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9tPGFueT4+LFxuXHRcdFx0XHQuLi5yZXN0OiBhbnlbXSkgPT5cblx0XHRcdHtcblx0XHRcdFx0aWYgKGxpYnJhcnkuY3JlYXRlUmVjdXJyZW50KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgY3VzdG9tUmVjdXJyZW50ID0gbGlicmFyeS5jcmVhdGVSZWN1cnJlbnQoa2luZCwgc2VsZWN0b3IsIGNhbGxiYWNrLCByZXN0KTtcblx0XHRcdFx0XHRpZiAoY3VzdG9tUmVjdXJyZW50ICE9PSB1bmRlZmluZWQpXG5cdFx0XHRcdFx0XHRyZXR1cm4gY3VzdG9tUmVjdXJyZW50O1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBXZSBjb3VsZCBwYXJzZSB0aGUgc2VsZWN0b3IgaGVyZSwgc2VlIGlmIHlvdSBoYXZlIGFueSBvbi1vbidzLFxuXHRcdFx0XHQvLyBpZiB5b3UgZG8sIGNhbGwgdGhlIGZ1bmN0aW9ucyB0byBhdWdtZW50IHRoZSByZXR1cm4gdmFsdWUuXG5cdFx0XHRcdC8vIEFsdGVybmF0aXZlbHksIHdlIGNvdWxkIGlubGluZSB0aGUgc3VwcG9ydCBmb3IgZm9yY2UgYXJyYXlzLlxuXHRcdFx0XHRyZXR1cm4gbmV3IFJlY3VycmVudChraW5kLCBzZWxlY3RvciwgY2FsbGJhY2ssIHJlc3QpO1xuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0aWYgKHR5cGVvZiBnbG9iLm9uICE9PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdGdsb2Iub24gPSBjcmVhdGVHbG9iYWwoUmVjdXJyZW50S2luZC5vbik7XG5cdFx0XHRcblx0XHRcdGlmICh0eXBlb2YgZ2xvYi5vbmNlICE9PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdGdsb2Iub25jZSA9IGNyZWF0ZUdsb2JhbChSZWN1cnJlbnRLaW5kLm9uY2UpO1xuXHRcdFx0XG5cdFx0XHRpZiAodHlwZW9mIGdsb2Iub25seSAhPT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0XHRnbG9iLm9ubHkgPSBjcmVhdGVHbG9iYWwoUmVjdXJyZW50S2luZC5vbmx5KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y29uc3Qgc3RhdGljTWVtYmVycyA9ICgoKSA9PlxuXHRcdHtcblx0XHRcdGNvbnN0IHN0YXRpY0JyYW5jaGVzID0gKCgpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGJyYW5jaEZuczogeyBba2V5OiBzdHJpbmddOiAoLi4uYXJnczogYW55KSA9PiBhbnk7IH0gPSB7fTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChsaWJyYXJ5LmdldFN0YXRpY0JyYW5jaGVzKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Zm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMobGlicmFyeS5nZXRTdGF0aWNCcmFuY2hlcygpIHx8IHt9KSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRjb25zdCBjb25zdHJ1Y3RCcmFuY2hGbjogQ29uc3RydWN0QnJhbmNoRm4gPSB2YWx1ZTtcblx0XHRcdFx0XHRcdGJyYW5jaEZuc1trZXldID0gY29uc3RydWN0QnJhbmNoRm4ubGVuZ3RoID09PSAwID9cblx0XHRcdFx0XHRcdFx0Y3JlYXRlQnJhbmNoRm4oY29uc3RydWN0QnJhbmNoRm4sIGtleSkgOlxuXHRcdFx0XHRcdFx0XHRjcmVhdGVQYXJhbWV0aWNCcmFuY2hGbihjb25zdHJ1Y3RCcmFuY2hGbiwga2V5KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdHJldHVybiBicmFuY2hGbnM7XG5cdFx0XHR9KSgpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBzdGF0aWNOb25CcmFuY2hlcyA9IFxuXHRcdFx0XHRsaWJyYXJ5LmdldFN0YXRpY05vbkJyYW5jaGVzID9cblx0XHRcdFx0XHRsaWJyYXJ5LmdldFN0YXRpY05vbkJyYW5jaGVzKCkgfHwge30gOiB7fTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHN0YXRpY0JyYW5jaGVzLCBzdGF0aWNOb25CcmFuY2hlcyk7XG5cdFx0fSkoKTtcblx0XHRcblx0XHRjb25zdCBuc0ZuID0gaXNMZWFmID9cblx0XHRcdGNyZWF0ZUxlYWZOYW1lc3BhY2VGbihsaWJyYXJ5KSA6XG5cdFx0XHRjcmVhdGVCcmFuY2hOYW1lc3BhY2VGbihsaWJyYXJ5KTtcblx0XHRcblx0XHRjb25zdCBuc09iaiA9ICgoKSA9PlxuXHRcdHtcblx0XHRcdC8vIEluIHRoZSBjYXNlIHdoZW4gdGhlcmUgYXJlIG5vIGR5bmFtaWMgbWVtYmVycywgd2UgY2FuIGp1c3Rcblx0XHRcdC8vIHJldHVybiB0aGUgc3RhdGljIG5hbWVzcGFjZSBtZW1iZXJzLCBhbmQgYXZvaWQgdXNlIG9mIFByb3hpZXNcblx0XHRcdC8vIGFsbCB0b2dldGhlci5cblx0XHRcdGlmICghbGlicmFyeS5nZXREeW5hbWljQnJhbmNoICYmICFsaWJyYXJ5LmdldER5bmFtaWNOb25CcmFuY2gpXG5cdFx0XHRcdHJldHVybiA8YW55Pk9iamVjdC5hc3NpZ24obnNGbiwgc3RhdGljTWVtYmVycyk7XG5cdFx0XHRcblx0XHRcdC8vIFRoaXMgdmFyaWFibGUgc3RvcmVzIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIHRoZSBtZW1iZXJzXG5cdFx0XHQvLyB0aGF0IHdlcmUgYXR0YWNoZWQgdG8gdGhlIHByb3h5IG9iamVjdCBhZnRlciBpdCdzIGNyZWF0aW9uLlxuXHRcdFx0Ly8gQ3VycmVudGx5IHRoaXMgaXMgb25seSBiZWluZyB1c2VkIGJ5IFJlZmxleE1MIHRvIGF0dGFjaFxuXHRcdFx0Ly8gdGhlIFwiZW1pdFwiIGZ1bmN0aW9uLCBidXQgb3RoZXJzIG1heSB1c2UgaXQgYXN3ZWxsLlxuXHRcdFx0bGV0IGF0dGFjaGVkTWVtYmVyczogeyBba2V5OiBzdHJpbmddOiBhbnk7IH0gfCBudWxsID0gbnVsbDtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIDxhbnk+bmV3IFByb3h5KG5zRm4sIHtcblx0XHRcdFx0Z2V0KHRhcmdldDogRnVuY3Rpb24sIGtleTogc3RyaW5nKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBrZXkgIT09IFwic3RyaW5nXCIpXG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHByb3BlcnR5LlwiKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoa2V5ID09PSBcImNhbGxcIiB8fCBrZXkgPT09IFwiYXBwbHlcIilcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcImNhbGwoKSBhbmQgYXBwbHkoKSBhcmUgbm90IHN1cHBvcnRlZC5cIik7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKGtleSBpbiBzdGF0aWNNZW1iZXJzKVxuXHRcdFx0XHRcdFx0cmV0dXJuIHN0YXRpY01lbWJlcnNba2V5XTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoYXR0YWNoZWRNZW1iZXJzICYmIGtleSBpbiBhdHRhY2hlZE1lbWJlcnMpXG5cdFx0XHRcdFx0XHRyZXR1cm4gYXR0YWNoZWRNZW1iZXJzW2tleV07XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKGxpYnJhcnkuZ2V0RHluYW1pY0JyYW5jaClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBicmFuY2ggPSBsaWJyYXJ5LmdldER5bmFtaWNCcmFuY2goa2V5KTtcblx0XHRcdFx0XHRcdGlmIChicmFuY2gpXG5cdFx0XHRcdFx0XHRcdHJldHVybiBjcmVhdGVCcmFuY2hGbigoKSA9PiBicmFuY2gsIGtleSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChsaWJyYXJ5LmdldER5bmFtaWNOb25CcmFuY2gpXG5cdFx0XHRcdFx0XHRyZXR1cm4gbGlicmFyeS5nZXREeW5hbWljTm9uQnJhbmNoKGtleSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNldCh0YXJnZXQ6IEZ1bmN0aW9uLCBwOiBhbnksIHZhbHVlOiBhbnkpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHQoYXR0YWNoZWRNZW1iZXJzIHx8IChhdHRhY2hlZE1lbWJlcnMgPSB7fSkpW3BdID0gdmFsdWU7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pKCk7XG5cdFx0XG5cdFx0bmFtZXNwYWNlT2JqZWN0cy5zZXQobnNPYmosIGxpYnJhcnkpO1xuXHRcdHJldHVybiBuc09iajtcblx0fVxuXHRcblx0LyoqXG5cdCAqIFJldHVybnMgdGhlIElMaWJyYXJ5IGluc3RhbmNlIHRoYXQgY29ycmVzcG9uZHNcblx0ICogdG8gdGhlIHNwZWNpZmllZCBuYW1lc3BhY2Ugb2JqZWN0LiBUaGlzIGZ1bmN0aW9uXG5cdCAqIGlzIHVzZWQgZm9yIGxheWVyaW5nIFJlZmxleGl2ZSBsaWJyYXJpZXMgb24gdG9wIG9mXG5cdCAqIGVhY2ggb3RoZXIsIGkuZS4sIHRvIGRlZmVyIHRoZSBpbXBsZW1lbnRhdGlvbiBvZlxuXHQgKiBvbmUgb2YgdGhlIElMaWJyYXJ5IGZ1bmN0aW9ucyB0byBhbm90aGVyIElMaWJyYXJ5XG5cdCAqIGF0IGEgbG93ZXItbGV2ZWwuXG5cdCAqIFxuXHQgKiBUaGUgdHlwaW5ncyBvZiB0aGUgcmV0dXJuZWQgSUxpYnJhcnkgYXNzdW1lIHRoYXRcblx0ICogYWxsIElMaWJyYXJ5IGZ1bmN0aW9ucyBhcmUgaW1wbGVtZW50ZWQgaW4gb3JkZXIgdG9cblx0ICogYXZvaWQgZXhjZXNzaXZlIFwicG9zc2libHkgdW5kZWZpbmVkXCIgY2hlY2tzLlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGxpYnJhcnlPZihuYW1lc3BhY2VPYmplY3Q6IG9iamVjdCk6IERlZmluZWQ8SUxpYnJhcnk+XG5cdHtcblx0XHRjb25zdCBsaWI6IGFueSA9IG5hbWVzcGFjZU9iamVjdHMuZ2V0KG5hbWVzcGFjZU9iamVjdCk7XG5cdFx0XG5cdFx0aWYgKENvbnN0LmRlYnVnICYmICFsaWIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIG9iamVjdCBkb2VzIG5vdCBoYXZlIGFuIGFzc29jaWF0ZWQgUmVmbGV4IGxpYnJhcnkuXCIpO1xuXHRcdFxuXHRcdHJldHVybiBsaWI7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHR0eXBlIERlZmluZWQ8VD4gPSB7IFtQIGluIGtleW9mIFRdLT86IFRbUF0gfTtcblx0XG5cdC8qKlxuXHQgKiBTdG9yZXMgYWxsIGNyZWF0ZWQgbmFtZXNwYWNlIG9iamVjdHMsIHVzZWQgdG8gcG93ZXIgdGhlIC5saWJyYXJ5T2YoKSBmdW5jdGlvbi5cblx0ICovXG5cdGNvbnN0IG5hbWVzcGFjZU9iamVjdHMgPSBuZXcgV2Vha01hcDxvYmplY3QsIElMaWJyYXJ5PigpO1xuXHRcblx0LyoqXG5cdCAqIFJldHVybnMgd2hldGhlciB0aGUgc3BlY2lmaWVkIGZ1bmN0aW9uIG9yIG1ldGhvZFxuXHQgKiByZWZlcnMgdG8gYSBicmFuY2ggZnVuY3Rpb24gdGhhdCB3YXMgY3JlYXRlZCBieSBhXG5cdCAqIHJlZmxleGl2ZSBsaWJyYXJ5LlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGlzQnJhbmNoRnVuY3Rpb24oZm46IEZ1bmN0aW9uKVxuXHR7XG5cdFx0cmV0dXJuIGJyYW5jaEZucy5oYXMoZm4pO1xuXHR9XG5cdFxuXHQvKiogKi9cblx0Y29uc3QgdG9CcmFuY2hGdW5jdGlvbiA9IDxUIGV4dGVuZHMgRnVuY3Rpb24+KG5hbWU6IHN0cmluZywgZm46IFQpID0+XG5cdHtcblx0XHRpZiAobmFtZSlcblx0XHR7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZm4sIFwibmFtZVwiLCB7XG5cdFx0XHRcdHZhbHVlOiBuYW1lLFxuXHRcdFx0XHR3cml0YWJsZTogZmFsc2UsXG5cdFx0XHRcdGNvbmZpZ3VyYWJsZTogZmFsc2Vcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHRicmFuY2hGbnMuYWRkKGZuKTtcblx0XHRyZXR1cm4gZm47XG5cdH1cblx0XG5cdC8qKiBTdG9yZXMgdGhlIHNldCBvZiBhbGwgYnJhbmNoIGZ1bmN0aW9ucyBjcmVhdGVkIGJ5IGFsbCByZWZsZXhpdmUgbGlicmFyaWVzLiAqL1xuXHRjb25zdCBicmFuY2hGbnMgPSBuZXcgV2Vha1NldDxGdW5jdGlvbj4oKTtcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGNvbnN0IGNyZWF0ZUJyYW5jaEZuID0gKGNvbnN0cnVjdEJyYW5jaEZuOiAoKSA9PiBJQnJhbmNoLCBuYW1lOiBzdHJpbmcpID0+XG5cdFx0dG9CcmFuY2hGdW5jdGlvbihuYW1lLCAoLi4uYXRvbXM6IEF0b21bXSkgPT5cblx0XHRcdHJldHVybkJyYW5jaChjb25zdHJ1Y3RCcmFuY2hGbigpLCBhdG9tcykpO1xuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0Y29uc3QgY3JlYXRlUGFyYW1ldGljQnJhbmNoRm4gPSAoYnJhbmNoRm46ICguLi5hcmdzOiBhbnlbXSkgPT4gSUJyYW5jaCwgbmFtZTogc3RyaW5nKSA9PlxuXHRcdCguLi5jb25zdHJ1Y3RCcmFuY2hBcmdzOiBhbnlbXSkgPT5cblx0XHRcdHRvQnJhbmNoRnVuY3Rpb24obmFtZSwgKC4uLmF0b21zOiBBdG9tW10pID0+XG5cdFx0XHRcdHJldHVybkJyYW5jaChicmFuY2hGbihjb25zdHJ1Y3RCcmFuY2hBcmdzKSwgYXRvbXMpKTtcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGZ1bmN0aW9uIHJldHVybkJyYW5jaChicmFuY2g6IElCcmFuY2gsIGF0b21zOiBhbnlbXSlcblx0e1xuXHRcdG5ldyBCcmFuY2hNZXRhKGJyYW5jaCwgYXRvbXMpO1xuXHRcdGNvbnN0IGxpYiA9IFJvdXRpbmdMaWJyYXJ5LnRoaXM7XG5cdFx0cmV0dXJuIGxpYi5yZXR1cm5CcmFuY2ggP1xuXHRcdFx0bGliLnJldHVybkJyYW5jaChicmFuY2gpIDpcblx0XHRcdGJyYW5jaDtcblx0fVxuXHRcblx0LyoqXG5cdCAqIENyZWF0ZXMgdGhlIGZ1bmN0aW9uIHRoYXQgZXhpc3RzIGF0IHRoZSB0b3Agb2YgdGhlIGxpYnJhcnksXG5cdCAqIHdoaWNoIGlzIHVzZWQgZm9yIGluc2VydGluZyB2aXNpYmxlIHRleHQgaW50byB0aGUgdHJlZS5cblx0ICovXG5cdGZ1bmN0aW9uIGNyZWF0ZUxlYWZOYW1lc3BhY2VGbihsaWJyYXJ5OiBJTGlicmFyeSlcblx0e1xuXHRcdHJldHVybiAoXG5cdFx0XHR0ZW1wbGF0ZTogVGVtcGxhdGVTdHJpbmdzQXJyYXkgfCBTdGF0ZWZ1bEZvcmNlLFxuXHRcdFx0Li4udmFsdWVzOiAoSUJyYW5jaCB8IFN0YXRlZnVsRm9yY2UpW10pOiBhbnkgPT5cblx0XHR7XG5cdFx0XHRjb25zdCBhcnJheSA9IEFycmF5LmlzQXJyYXkodGVtcGxhdGUpID9cblx0XHRcdFx0dGVtcGxhdGUgOlxuXHRcdFx0XHRbdGVtcGxhdGVdO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBvdXQ6IG9iamVjdFtdID0gW107XG5cdFx0XHRjb25zdCBsZW4gPSBhcnJheS5sZW5ndGggKyB2YWx1ZXMubGVuZ3RoO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBnZXRMZWFmID0gbGlicmFyeS5nZXRMZWFmO1xuXHRcdFx0aWYgKCFnZXRMZWFmKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcblx0XHRcdC8vIFRPRE86IFRoaXMgc2hvdWxkIGJlIG9wdGltaXplZCBzbyB0aGF0IG11bHRpcGxlXG5cdFx0XHQvLyByZXBlYXRpbmcgc3RyaW5nIHZhbHVlcyBkb24ndCByZXN1bHQgaW4gdGhlIGNyZWF0aW9uXG5cdFx0XHQvLyBvZiBtYW55IExlYWZNZXRhIG9iamVjdHMuXG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgbGVuOylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdmFsID0gaSAlIDIgPT09IDAgP1xuXHRcdFx0XHRcdGFycmF5W2kgLyAyXSA6XG5cdFx0XHRcdFx0dmFsdWVzWyhpIC0gMSkgLyAyXTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB1bmRlZmluZWQpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAodmFsIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG91dC5wdXNoKG5ldyBSZWN1cnJlbnQoXG5cdFx0XHRcdFx0XHRSZWN1cnJlbnRLaW5kLm9uLFxuXHRcdFx0XHRcdFx0dmFsLFxuXHRcdFx0XHRcdFx0bm93ID0+XG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGdldExlYWYobm93KTtcblx0XHRcdFx0XHRcdFx0aWYgKHJlc3VsdClcblx0XHRcdFx0XHRcdFx0XHRuZXcgTGVhZk1ldGEocmVzdWx0KTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHRcdFx0XHR9KS5ydW4oKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgcHJlcGFyZWQgPSBnZXRMZWFmKHZhbCk7XG5cdFx0XHRcdFx0aWYgKHByZXBhcmVkKVxuXHRcdFx0XHRcdFx0b3V0LnB1c2gocHJlcGFyZWQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3Qgb2JqZWN0IG9mIG91dClcblx0XHRcdFx0bmV3IExlYWZNZXRhKG9iamVjdCk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBvdXQ7XG5cdFx0fTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIENyZWF0ZXMgdGhlIGZ1bmN0aW9uIHRoYXQgZXhpc3RzIGF0IHRoZSB0b3Agb2YgdGhlIGxpYnJhcnksXG5cdCAqIHdoaWNoIGlzIHVzZWQgZm9yIGNyZWF0aW5nIGFuIGFic3RyYWN0IGNvbnRhaW5lciBvYmplY3QuXG5cdCAqL1xuXHRmdW5jdGlvbiBjcmVhdGVCcmFuY2hOYW1lc3BhY2VGbihsaWJyYXJ5OiBJTGlicmFyeSlcblx0e1xuXHRcdGNvbnN0IGdldFJvb3RCcmFuY2ggPSBsaWJyYXJ5LmdldFJvb3RCcmFuY2g7XG5cdFx0cmV0dXJuIGdldFJvb3RCcmFuY2ggP1xuXHRcdFx0Y3JlYXRlQnJhbmNoRm4oKCkgPT4gZ2V0Um9vdEJyYW5jaCgpLCBcIlwiKSA6XG5cdFx0XHQoKSA9PiB7fTtcblx0fTtcbn1cbiIsIlxuZGVjbGFyZSBuYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0ZXhwb3J0IGludGVyZmFjZSBNZXRhQXJyYXk8VCBleHRlbmRzIE1ldGEgPSBNZXRhPlxuXHR7XG5cdFx0LyoqXG5cdFx0ICogTW92ZXMgYSBzZWN0aW9uIG9mIHRoaXMgYXJyYXkgaWRlbnRpZmllZCBieSBzdGFydCBhbmQgZW5kIHRvXG5cdFx0ICogdG8gYW5vdGhlciBsb2NhdGlvbiB3aXRoaW4gdGhpcyBhcnJheSwgc3RhcnRpbmcgYXQgdGhlIHNwZWNpZmllZFxuXHRcdCAqIHRhcmdldCBwb3NpdGlvbi5cblx0XHQgKiBcblx0XHQgKiBAcGFyYW0gdGFyZ2V0IElmIHRhcmdldCBpcyBuZWdhdGl2ZSwgaXQgaXMgdHJlYXRlZCBhcyBsZW5ndGgrdGFyZ2V0IHdoZXJlIGxlbmd0aCBpcyB0aGVcblx0XHQgKiBsZW5ndGggb2YgdGhlIGFycmF5LlxuXHRcdCAqIEBwYXJhbSBzdGFydCBJZiBzdGFydCBpcyBuZWdhdGl2ZSwgaXQgaXMgdHJlYXRlZCBhcyBsZW5ndGgrc3RhcnQuIElmIGVuZCBpcyBuZWdhdGl2ZSwgaXRcblx0XHQgKiBpcyB0cmVhdGVkIGFzIGxlbmd0aCtlbmQuXG5cdFx0ICogQHBhcmFtIGVuZCBJZiBub3Qgc3BlY2lmaWVkLCBsZW5ndGggb2YgdGhlIHRoaXMgb2JqZWN0IGlzIHVzZWQgYXMgaXRzIGRlZmF1bHQgdmFsdWUuXG5cdFx0ICovXG5cdFx0bW92ZVdpdGhpbih0YXJnZXQ6IG51bWJlciwgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpOiB0aGlzO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdldHMgb3Igc2V0cyB0aGUgbGVuZ3RoIG9mIHRoZSBhcnJheS4gVGhpcyBpcyBhIG51bWJlciBvbmUgaGlnaGVyIFxuXHRcdCAqIHRoYW4gdGhlIGhpZ2hlc3QgZWxlbWVudCBkZWZpbmVkIGluIGFuIGFycmF5LlxuXHRcdCAqL1xuXHRcdGxlbmd0aDogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEFwcGVuZHMgbmV3IGVsZW1lbnRzIHRvIGFuIGFycmF5LCBhbmQgcmV0dXJucyB0aGUgbmV3IGxlbmd0aCBvZiB0aGUgYXJyYXkuXG5cdCAgICAgICAqIEBwYXJhbSBjaGlsZHJlbiBOZXcgZWxlbWVudHMgb2YgdGhlIEFycmF5LlxuXHRcdCAqL1xuXHRcdHB1c2goLi4uY2hpbGRyZW46IE1ldGFbXSk6IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZW1vdmVzIHRoZSBsYXN0IGVsZW1lbnQgZnJvbSBhbiBhcnJheSBhbmQgcmV0dXJucyBpdC5cblx0XHQgKi9cblx0XHRwb3AoKTogTWV0YSB8IHVuZGVmaW5lZDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZW1vdmVzIHRoZSBmaXJzdCBlbGVtZW50IGZyb20gYW4gYXJyYXkgYW5kIHJldHVybnMgaXQuXG5cdFx0ICovXG5cdFx0c2hpZnQoKTogTWV0YSB8IHVuZGVmaW5lZDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBJbnNlcnRzIG5ldyBlbGVtZW50cyBhdCB0aGUgc3RhcnQgb2YgYW4gYXJyYXkuXG5cdFx0ICogQHBhcmFtIGNoaWxkcmVuICBFbGVtZW50cyB0byBpbnNlcnQgYXQgdGhlIHN0YXJ0IG9mIHRoZSBhcnJheS5cblx0XHQgKi9cblx0XHR1bnNoaWZ0KC4uLmNoaWxkcmVuOiBNZXRhW10pOiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmV2ZXJzZXMgdGhlIGVsZW1lbnRzIGluIHRoZSBhcnJheS5cblx0XHQgKi9cblx0XHRyZXZlcnNlKCk6IHRoaXM7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyBhIHNlY3Rpb24gb2YgYW4gYXJyYXkuXG5cdFx0ICogQHBhcmFtIHN0YXJ0IFRoZSBiZWdpbm5pbmcgb2YgdGhlIHNwZWNpZmllZCBwb3J0aW9uIG9mIHRoZSBhcnJheS5cblx0XHQgKiBAcGFyYW0gZW5kIFRoZSBlbmQgb2YgdGhlIHNwZWNpZmllZCBwb3J0aW9uIG9mIHRoZSBhcnJheS5cblx0XHQgKi9cblx0XHRzbGljZShzdGFydD86IG51bWJlciwgZW5kPzogbnVtYmVyKTogTWV0YUFycmF5PFQ+O1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlbW92ZXMgZWxlbWVudHMgZnJvbSBhbiBhcnJheSBhbmQsIGlmIG5lY2Vzc2FyeSwgaW5zZXJ0cyBuZXcgZWxlbWVudHMgaW4gdGhlaXJcblx0XHQgKiBwbGFjZSwgcmV0dXJuaW5nIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuXHRcdCAqIEBwYXJhbSBzdGFydCBUaGUgemVyby1iYXNlZCBsb2NhdGlvbiBpbiB0aGUgYXJyYXkgZnJvbSB3aGljaCB0byBzdGFydCByZW1vdmluZyBlbGVtZW50cy5cblx0XHQgKiBAcGFyYW0gZGVsZXRlQ291bnQgVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZW1vdmUuXG5cdFx0ICovXG5cdFx0c3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50PzogbnVtYmVyKTogTWV0YVtdO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlbW92ZXMgZWxlbWVudHMgZnJvbSBhbiBhcnJheSBhbmQsIGlmIG5lY2Vzc2FyeSwgaW5zZXJ0cyBuZXcgZWxlbWVudHMgaW4gdGhlaXIgcGxhY2UsXG5cdFx0ICogcmV0dXJuaW5nIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuXHRcdCAqIEBwYXJhbSBzdGFydCBUaGUgemVyby1iYXNlZCBsb2NhdGlvbiBpbiB0aGUgYXJyYXkgZnJvbSB3aGljaCB0byBzdGFydCByZW1vdmluZyBlbGVtZW50cy5cblx0XHQgKiBAcGFyYW0gZGVsZXRlQ291bnQgVGhlIG51bWJlciBvZiBlbGVtZW50cyB0byByZW1vdmUuXG5cdFx0ICogQHBhcmFtIGl0ZW1zIEVsZW1lbnRzIHRvIGluc2VydCBpbnRvIHRoZSBhcnJheSBpbiBwbGFjZSBvZiB0aGUgZGVsZXRlZCBlbGVtZW50cy5cblx0XHQgKi9cblx0XHRzcGxpY2Uoc3RhcnQ6IG51bWJlciwgZGVsZXRlQ291bnQ/OiBudW1iZXIsIC4uLml0ZW1zOiBNZXRhW10pOiBNZXRhW107XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU29ydHMgYW4gYXJyYXkuXG5cdFx0ICogQHBhcmFtIGNvbXBhcmVGbiBUaGUgbmFtZSBvZiB0aGUgZnVuY3Rpb24gdXNlZCB0byBkZXRlcm1pbmUgdGhlXG5cdFx0ICogb3JkZXIgb2YgdGhlIGVsZW1lbnRzLiBJZiBvbWl0dGVkLCB0aGUgZWxlbWVudHMgYXJlIHNvcnRlZCBpbiBhc2NlbmRpbmcsIFxuXHRcdCAqIEFTQ0lJIGNoYXJhY3RlciBvcmRlci5cblx0XHQgKi9cblx0XHRzb3J0PFQ+KHJlZmVyZW5jZTogVFtdLCBjb21wYXJlRm46IChhOiBULCBiOiBUKSA9PiBudW1iZXIpOiB0aGlzO1xuXHRcdHNvcnQ8VD4ocmVmZXJlbmNlOiBUW10pOiB0aGlzO1xuXHRcdHNvcnQ8VD4oY29tcGFyZUZuOiAoYTogTWV0YSwgYjogTWV0YSkgPT4gbnVtYmVyKTogdGhpcztcblx0XHRcblx0XHQvKipcblx0ICAgICAgICogUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYSB2YWx1ZSBpbiBhbiBhcnJheS5cblx0ICAgICAgICogQHBhcmFtIHNlYXJjaE1ldGEgVGhlIHZhbHVlIHRvIGxvY2F0ZSBpbiB0aGUgYXJyYXkuXG5cdCAgICAgICAqIEBwYXJhbSBmcm9tSW5kZXggVGhlIGFycmF5IGluZGV4IGF0IHdoaWNoIHRvIGJlZ2luIHRoZSBzZWFyY2guIFxuXHRcdCAqIElmIGZyb21JbmRleCBpcyBvbWl0dGVkLCB0aGUgc2VhcmNoIHN0YXJ0cyBhdCBpbmRleCAwLlxuXHQgICAgICAgKi9cblx0XHRpbmRleE9mKHNlYXJjaE1ldGE6IE1ldGEsIGZyb21JbmRleD86IG51bWJlcik6IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0ICAgICAgICogUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGxhc3Qgb2NjdXJyZW5jZSBvZiBhIHNwZWNpZmllZCB2YWx1ZSBpbiBhbiBhcnJheS5cblx0ICAgICAgICogQHBhcmFtIHNlYXJjaE1ldGEgVGhlIHZhbHVlIHRvIGxvY2F0ZSBpbiB0aGUgYXJyYXkuXG5cdCAgICAgICAqIEBwYXJhbSBmcm9tSW5kZXggVGhlIGFycmF5IGluZGV4IGF0IHdoaWNoIHRvIGJlZ2luIHRoZSBzZWFyY2guIFxuXHRcdCAqIElmIGZyb21JbmRleCBpcyBvbWl0dGVkLCB0aGUgc2VhcmNoIHN0YXJ0cyBhdCB0aGUgbGFzdCBpbmRleCBpbiB0aGUgYXJyYXkuXG5cdCAgICAgICAqL1xuXHRcdGxhc3RJbmRleE9mKHNlYXJjaE1ldGE6IE1ldGEsIGZyb21JbmRleD86IG51bWJlcik6IG51bWJlcjtcblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0Y29uc3QgY2FsbGJhY2tzOiAoKCkgPT4gdm9pZClbXSA9IFtdO1xuXHRcblx0LyoqXG5cdCAqIFN0b3JlcyB0aGUgbnVtYmVyIG9mIG91dHN0YW5kaW5nIGFzeW5jaHJvbm91cyBvcGVyYXRpb25zXG5cdCAqIGFyZSB3YWl0aW5nIHRvIGJlIGNvbXBsZXRlZCwgc28gdGhhdCB0aGUgcmVhZHkgc3RhdGUgY2FsbGJhY2tzXG5cdCAqIGNhbiBiZSB0cmlnZ2VyZWQuXG5cdCAqL1xuXHRsZXQgb3V0c3RhbmRpbmcgPSAwO1xuXHRcblx0ZXhwb3J0IGNvbnN0IFJlYWR5U3RhdGUgPVxuXHR7XG5cdFx0LyoqXG5cdFx0ICogQWRkcyB0aGUgc3BlY2lmaWVkIGZ1bmN0aW9uIHRvIHRoZSBsaXN0IG9mIGNhbGxiYWNrcyB0byBpbnZva2Vcblx0XHQgKiB3aGVuIGFsbCBvdXRzdGFuZGluZyBhc3luY2hyb25vdXMgb3BlcmF0aW9ucyBoYXZlIGNvbXBsZXRlZC5cblx0XHQgKiBJbiB0aGUgY2FzZSB3aGVuIHRoZXJlIGFyZSBubyBvdXRzdGFuZGluZyBjYWxsYmFja3MsIHRoZSBmdW5jdGlvblxuXHRcdCAqIGlzIGNhbGxlZCBpbW1lZGlhdGVseS5cblx0XHQgKi9cblx0XHRhd2FpdChjYWxsYmFjazogKCkgPT4gdm9pZClcblx0XHR7XG5cdFx0XHRpZiAob3V0c3RhbmRpbmcgPCAxKVxuXHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRjYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG5cdFx0fSxcblx0XHRcblx0XHQvKiogSW5jcmVtZW50IHRoZSByZWFkeSBzdGF0ZS4gKi9cblx0XHRpbmMoKVxuXHRcdHtcblx0XHRcdG91dHN0YW5kaW5nKys7XG5cdFx0fSxcblx0XHRcblx0XHQvKiogRGVjcmVtZW50IHRoZSByZWFkeSBzdGF0ZS4gKi9cblx0XHRkZWMoKVxuXHRcdHtcblx0XHRcdG91dHN0YW5kaW5nLS07XG5cdFx0XHRpZiAob3V0c3RhbmRpbmcgPCAwKVxuXHRcdFx0XHRvdXRzdGFuZGluZyA9IDA7XG5cdFx0XHRcblx0XHRcdGlmIChvdXRzdGFuZGluZyA9PT0gMClcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgZm5zID0gY2FsbGJhY2tzLnNsaWNlKCk7XG5cdFx0XHRcdGNhbGxiYWNrcy5sZW5ndGggPSAwO1xuXHRcdFx0XHRcblx0XHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCBmbnMubGVuZ3RoOylcblx0XHRcdFx0XHRmbnNbaV0oKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXhcbntcblx0Y29uc3QgYXV0b3J1bkNhY2hlID0gbmV3IFdlYWtNYXA8UmVjdXJyZW50LCBhbnlbXT4oKTtcblx0XG5cdC8qKlxuXHQgKiBNYW5hZ2VzIHRoZSByZXNwb25zaWJpbGl0aWVzIG9mIGEgc2luZ2xlIGNhbGwgdG8gb24oKSBvciBvbmx5KCkuXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgUmVjdXJyZW50PFRSdW5BcmdzIGV4dGVuZHMgYW55W10gPSBhbnlbXT5cblx0e1xuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cmVhZG9ubHkga2luZDogQ29yZS5SZWN1cnJlbnRLaW5kLFxuXHRcdFx0cmVhZG9ubHkgc2VsZWN0b3I6IGFueSxcblx0XHRcdHJlYWRvbmx5IHVzZXJDYWxsYmFjazogUmVjdXJyZW50Q2FsbGJhY2s8QXRvbT4sXG5cdFx0XHRyZWFkb25seSB1c2VyUmVzdEFyZ3M6IGFueVtdID0gW10pXG5cdFx0e1xuXHRcdFx0Ly8gSW4gdGhlIGNhc2Ugd2hlbiB0aGUgZmlyc3QgYXJndW1lbnQgcGFzc2VkIHRvIHRoZVxuXHRcdFx0Ly8gcmVjdXJyZW50IGZ1bmN0aW9uIGlzbid0IGEgdmFsaWQgc2VsZWN0b3IsIHRoZSBwYXJhbWV0ZXJzXG5cdFx0XHQvLyBhcmUgc2hpZnRlZCBiYWNrd2FyZHMuIFRoaXMgaXMgdG8gaGFuZGxlIHRoZSBvbigpIGNhbGxzXG5cdFx0XHQvLyB0aGF0IGFyZSB1c2VkIHRvIHN1cHBvcnQgcmVzdG9yYXRpb25zLlxuXHRcdFx0aWYgKHR5cGVvZiBzZWxlY3RvciA9PT0gXCJmdW5jdGlvblwiICYmICFpc0ZvcmNlKHNlbGVjdG9yKSlcblx0XHRcdHtcblx0XHRcdFx0dXNlclJlc3RBcmdzLnVuc2hpZnQodXNlckNhbGxiYWNrKTtcblx0XHRcdFx0dGhpcy51c2VyQ2FsbGJhY2sgPSBzZWxlY3Rvcjtcblx0XHRcdFx0dGhpcy5zZWxlY3RvciA9IFwiXCI7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdHJ1biguLi5jYWxsYmFja0FyZ3VtZW50czogVFJ1bkFyZ3MpXG5cdFx0e1xuXHRcdFx0YXV0b3J1bkNhY2hlLnNldCh0aGlzLCBjYWxsYmFja0FyZ3VtZW50cyk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqIFByZXZlbnQgc3RydWN0dXJhbCB0eXBlIGNvbXBhdGliaWxpdGllcy4gKi9cblx0XHRwcml2YXRlIHJlY3VycmVudE5vbWluYWw6IHVuZGVmaW5lZDtcblx0fVxuXHRcblx0ZXhwb3J0IG5hbWVzcGFjZSBDb3JlXG5cdHtcblx0XHQvKipcblx0XHQgKiBAaW50ZXJuYWxcblx0XHQgKiBBIGNsYXNzIHRoYXQgZGVhbHMgd2l0aCB0aGUgc3BlY2lhbCBjYXNlIG9mIGEgRm9yY2UgdGhhdFxuXHRcdCAqIHdhcyBwbHVnZ2VkIGludG8gYW4gYXR0cmlidXRlLlxuXHRcdCAqL1xuXHRcdGV4cG9ydCBjbGFzcyBBdHRyaWJ1dGVSZWN1cnJlbnQgZXh0ZW5kcyBSZWN1cnJlbnRcblx0XHR7XG5cdFx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdFx0YXR0cmlidXRlS2V5OiBzdHJpbmcsXG5cdFx0XHRcdGZvcmNlOiBTdGF0ZWZ1bEZvcmNlKVxuXHRcdFx0e1xuXHRcdFx0XHRzdXBlcihcblx0XHRcdFx0XHRSZWN1cnJlbnRLaW5kLm9uLCBcdFxuXHRcdFx0XHRcdGZvcmNlLFxuXHRcdFx0XHRcdCgobm93OiBhbnkpID0+IG5ldyBBdHRyaWJ1dGVNZXRhKGF0dHJpYnV0ZUtleSwgbm93KSkpO1xuXHRcdFx0XHRcblx0XHRcdFx0YXV0b3J1bkNhY2hlLnNldCh0aGlzLCBbXSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEBpbnRlcm5hbFxuXHRcdCAqIEV4dHJhY3RzIHRoZSBhdXRvcnVuIGFyZ3VtZW50cyBmcm9tIHRoZSBpbnRlcm5hbCBjYWNoZS5cblx0XHQgKiBDYW4gb25seSBiZSBleGVjdXRlZCBvbmNlLlxuXHRcdCAqL1xuXHRcdGV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QXV0b3J1bkFyZ3VtZW50cyhyZWN1cnJlbnQ6IFJlY3VycmVudClcblx0XHR7XG5cdFx0XHRjb25zdCBhcmdzID0gYXV0b3J1bkNhY2hlLmdldChyZWN1cnJlbnQpIHx8IG51bGw7XG5cdFx0XHRpZiAoYXJncylcblx0XHRcdFx0YXV0b3J1bkNhY2hlLmRlbGV0ZShyZWN1cnJlbnQpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gYXJncztcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0ZXhwb3J0IGNvbnN0IGVudW0gUmVjdXJyZW50S2luZFxuXHRcdHtcblx0XHRcdG9uLFxuXHRcdFx0b25jZSxcblx0XHRcdG9ubHlcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBAaW50ZXJuYWxcblx0ICogQSBjbGFzcyB0aGF0IHNpdHMgYmV0d2VlbiB0aGUgc3BlY2lmaWMgUmVmbGV4aXZlIGxpYnJhcnksIFxuXHQgKiBhbmQgdGhlIExpYnJhcnkgY2xhc3MgYXMgZGVmaW5lZCBpbiB0aGUgUmVmbGV4IENvcmUuIFRoZVxuXHQgKiBwdXJwb3NlIG9mIHRoaXMgY2xhc3MgaXMgdG8gb3ZlcnJpZGUgYWxsIHRoZSBtZXRob2RzLCBhbmRcblx0ICogZGV0ZXJtaW5lIHRoZSBzcGVjaWZpYyBsaWJyYXJ5IHRvIHJvdXRlIGVhY2ggY2FsbCB0byB0aGUgXG5cdCAqIGFic3RyYWN0IG1ldGhvZHMuIEl0IG9wZXJhdGVzIGJ5IGxvb2tpbmcgYXQgdGhlIGNvbnN0cnVjdG9yXG5cdCAqIGZ1bmN0aW9uIG9mIHRoZSBCcmFuY2ggb2JqZWN0IHByb3ZpZGVkIHRvIGFsbCB0aGUgbWV0aG9kcyxcblx0ICogYW5kIHRoZW4gdXNpbmcgdGhpcyB0byBkZXRlcm1pbmUgd2hhdCBsaWJyYXJ5IGlzIHJlc3BvbnNpYmxlXG5cdCAqIGZvciBvYmplY3RzIG9mIHRoaXMgdHlwZS5cblx0ICovXG5cdGV4cG9ydCBjbGFzcyBSb3V0aW5nTGlicmFyeSBpbXBsZW1lbnRzIElMaWJyYXJ5XG5cdHtcblx0XHQvKipcblx0XHQgKiBTaW5nbGV0b24gYWNjZXNzb3IgcHJvcGVydHkuXG5cdFx0ICovXG5cdFx0c3RhdGljIGdldCB0aGlzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5fdGhpcyA9PT0gbnVsbCA/XG5cdFx0XHRcdHRoaXMuX3RoaXMgPSBuZXcgUm91dGluZ0xpYnJhcnkoKSA6XG5cdFx0XHRcdHRoaXMuX3RoaXM7XG5cdFx0fVxuXHRcdHByaXZhdGUgc3RhdGljIF90aGlzOiBSb3V0aW5nTGlicmFyeSB8IG51bGwgPSBudWxsO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEFkZHMgYSByZWZlcmVuY2UgdG8gYSBSZWZsZXhpdmUgbGlicmFyeSwgd2hpY2ggbWF5IGJlXG5cdFx0ICogY2FsbGVkIHVwb24gaW4gdGhlIGZ1dHVyZS5cblx0XHQgKi9cblx0XHRzdGF0aWMgYWRkTGlicmFyeShsaWJyYXJ5OiBJTGlicmFyeSlcblx0XHR7XG5cdFx0XHR0aGlzLmxpYnJhcmllcy5wdXNoKGxpYnJhcnkpO1xuXHRcdH1cblx0XHRwcml2YXRlIHN0YXRpYyByZWFkb25seSBsaWJyYXJpZXM6IElMaWJyYXJ5W10gPSBbXTtcblx0XHRcblx0XHRwcml2YXRlIGNvbnN0cnVjdG9yKCkgeyB9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQ29uZGl0aW9uYWxseSBleGVjdXRlcyB0aGUgc3BlY2lmaWVkIGxpYnJhcnkgZnVuY3Rpb24sXG5cdFx0ICogaW4gdGhlIGNhc2Ugd2hlbiBpdCdzIGRlZmluZWQuXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSByb3V0ZTxGIGV4dGVuZHMgKC4uLmFyZ3M6IGFueVtdKSA9PiBSLCBSPihcblx0XHRcdHJlZmVyZW5jZUJyYW5jaDogSUJyYW5jaCxcblx0XHRcdGdldEZuOiAobGlicmFyeTogSUxpYnJhcnkpID0+IEYgfCB1bmRlZmluZWQsXG5cdFx0XHRjYWxsRm46IChmbjogRiwgdGhpc0FyZzogSUxpYnJhcnkpID0+IFIsXG5cdFx0XHRkZWZhdWx0VmFsdWU/OiBhbnkpOiBSXG5cdFx0e1xuXHRcdFx0aWYgKHJlZmVyZW5jZUJyYW5jaClcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgbGlicyA9IFJvdXRpbmdMaWJyYXJ5LmxpYnJhcmllcztcblx0XHRcdFx0XG5cdFx0XHRcdC8vIEl0J3MgaW1wb3J0YW50IHRoYXQgdGVzdCBmb3IgYXNzb2NpYXRpdml0eSBiZXR3ZWVuIGFcblx0XHRcdFx0Ly8gYnJhbmNoIGFuZCBhIGxpYnJhcnkgaXMgZG9uZSBpbiByZXZlcnNlIG9yZGVyLCBpbiBvcmRlclxuXHRcdFx0XHQvLyB0byBzdXBwb3J0IHRoZSBjYXNlIG9mIFJlZmxleGl2ZSBsaWJyYXJpZXMgYmVpbmcgbGF5ZXJlZFxuXHRcdFx0XHQvLyBvbiB0b3Agb2YgZWFjaCBvdGhlci4gSWYgUmVmbGV4aXZlIGxpYnJhcnkgQSBpcyBsYXllcmVkIG9uXG5cdFx0XHRcdC8vIFJlZmxleGl2ZSBsaWJyYXJ5IEIsIEEgd2lsbCBiZSBhZGRlZCB0byB0aGUgbGlicmFyaWVzIGFycmF5XG5cdFx0XHRcdC8vIGJlZm9yZSBCLiBUaGUgbGlicmFyaWVzIGFycmF5IHRoZXJlZm9yZSBoYXMgYW4gaW1wbGljaXRcblx0XHRcdFx0Ly8gdG9wb2xvZ2ljYWwgc29ydC4gSXRlcmF0aW5nIGJhY2t3YXJkcyBlbnN1cmVzIHRoYXQgdGhlXG5cdFx0XHRcdC8vIGhpZ2hlci1sZXZlbCBsaWJyYXJpZXMgYXJlIHRlc3RlZCBiZWZvcmUgdGhlIGxvd2VyLWxldmVsIG9uZXMuXG5cdFx0XHRcdC8vIFRoaXMgaXMgY3JpdGljYWwsIGJlY2F1c2UgYSBoaWdoZXItbGV2ZWwgbGlicmFyeSBtYXkgb3BlcmF0ZVxuXHRcdFx0XHQvLyBvbiB0aGUgc2FtZSBicmFuY2ggdHlwZXMgYXMgdGhlIGxvd2VyLWxldmVsIGxpYnJhcmllcyB0aGF0XG5cdFx0XHRcdC8vIGl0J3MgYWJzdHJhY3RpbmcuXG5cdFx0XHRcdGZvciAobGV0IGkgPSBsaWJzLmxlbmd0aDsgaS0tID4gMDspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBsaWIgPSBsaWJzW2ldO1xuXHRcdFx0XHRcdGlmIChsaWIuaXNLbm93bkJyYW5jaChyZWZlcmVuY2VCcmFuY2gpKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGNvbnN0IGxpYkZuID0gZ2V0Rm4obGliKTtcblx0XHRcdFx0XHRcdHJldHVybiB0eXBlb2YgbGliRm4gPT09IFwiZnVuY3Rpb25cIiA/XG5cdFx0XHRcdFx0XHRcdGNhbGxGbihsaWJGbiwgbGliKSA6XG5cdFx0XHRcdFx0XHRcdGRlZmF1bHRWYWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBicmFuY2ggdHlwZS5cIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGlzS25vd25CcmFuY2goYnJhbmNoOiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdGxpYiA9PiBsaWIuaXNLbm93bkJyYW5jaCxcblx0XHRcdFx0KGZuLCBsaWIpID0+IGZuLmNhbGwobGliLCBicmFuY2gpLFxuXHRcdFx0XHRmYWxzZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgbWF5IGltcGxlbWVudCB0aGlzIG1ldGhvZCBpbiBvcmRlciB0byBwcm92aWRlXG5cdFx0ICogdGhlIHN5c3RlbSB3aXRoIGtub3dsZWRnZSBvZiB3aGV0aGVyIGEgYnJhbmNoIGhhcyBiZWVuIGRpc3Bvc2VkLFxuXHRcdCAqIHdoaWNoIGl0IHVzZXMgZm9yIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvbnMuIElmIHRoZSBsaWJyYXJ5IGhhcyBub1xuXHRcdCAqIG1lYW5zIG9mIGRvaW5nIHRoaXMsIGl0IG1heSByZXR1cm4gXCJudWxsXCIuXG5cdFx0ICovXG5cdFx0aXNCcmFuY2hEaXNwb3NlZChicmFuY2g6IElCcmFuY2gpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucm91dGUoXG5cdFx0XHRcdGJyYW5jaCxcblx0XHRcdFx0bGliID0+IGxpYi5pc0JyYW5jaERpc3Bvc2VkLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGJyYW5jaCksXG5cdFx0XHRcdGZhbHNlKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyB0aGF0IHN1cHBvcnQgaW5saW5lIHRhcmdldCtjaGlsZHJlbiBjbG9zdXJlc1xuXHRcdCAqIG11c3QgcHJvdmlkZSBhbiBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBtZXRob2QuXG5cdFx0ICovXG5cdFx0Z2V0Q2hpbGRyZW4odGFyZ2V0OiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnJvdXRlKFxuXHRcdFx0XHR0YXJnZXQsXG5cdFx0XHRcdGxpYiA9PiBsaWIuZ2V0Q2hpbGRyZW4sXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgdGFyZ2V0KSxcblx0XHRcdFx0W10pO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRnZXRMZWFmKGxlYWY6IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5yb3V0ZShcblx0XHRcdFx0bGVhZixcblx0XHRcdFx0bGliID0+IGxpYi5nZXRMZWFmLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGxlYWYpLFxuXHRcdFx0XHRudWxsKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0YXR0YWNoQXRvbShcblx0XHRcdGF0b206IGFueSxcblx0XHRcdGJyYW5jaDogSUJyYW5jaCxcblx0XHRcdHJlZjogUmVmKVxuXHRcdHtcblx0XHRcdHRoaXMucm91dGUoXG5cdFx0XHRcdGJyYW5jaCxcblx0XHRcdFx0bGliID0+IGxpYi5hdHRhY2hBdG9tLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGF0b20sIGJyYW5jaCwgcmVmKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGRldGFjaEF0b20oYXRvbTogYW55LCBicmFuY2g6IElCcmFuY2gpXG5cdFx0e1xuXHRcdFx0dGhpcy5yb3V0ZShcblx0XHRcdFx0YnJhbmNoLFxuXHRcdFx0XHRsaWIgPT4gbGliLmRldGFjaEF0b20sXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYXRvbSwgYnJhbmNoKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICovXG5cdFx0c3dhcEJyYW5jaGVzKGJyYW5jaDE6IElCcmFuY2gsIGJyYW5jaDI6IElCcmFuY2gpXG5cdFx0e1xuXHRcdFx0dGhpcy5yb3V0ZShcblx0XHRcdFx0YnJhbmNoMSxcblx0XHRcdFx0bGliID0+IGxpYi5zd2FwQnJhbmNoZXMsXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYnJhbmNoMSwgYnJhbmNoMikpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKlxuXHRcdCAqL1xuXHRcdHJlcGxhY2VCcmFuY2goYnJhbmNoMTogSUJyYW5jaCwgYnJhbmNoMjogSUJyYW5jaClcblx0XHR7XG5cdFx0XHR0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gxLFxuXHRcdFx0XHRsaWIgPT4gbGliLnJlcGxhY2VCcmFuY2gsXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYnJhbmNoMSwgYnJhbmNoMikpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRhdHRhY2hBdHRyaWJ1dGUoYnJhbmNoOiBJQnJhbmNoLCBrZXk6IHN0cmluZywgdmFsdWU6IGFueSlcblx0XHR7XG5cdFx0XHR0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdGxpYiA9PiBsaWIuYXR0YWNoQXR0cmlidXRlLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGJyYW5jaCwga2V5LCB2YWx1ZSkpO1xuXHRcdH1cblx0XHRcdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0ZGV0YWNoQXR0cmlidXRlKGJyYW5jaDogSUJyYW5jaCwga2V5OiBzdHJpbmcpXG5cdFx0e1xuXHRcdFx0dGhpcy5yb3V0ZShcblx0XHRcdFx0YnJhbmNoLFxuXHRcdFx0XHRsaWIgPT4gbGliLmRldGFjaEF0dHJpYnV0ZSxcblx0XHRcdFx0KGZuLCBsaWIpID0+IGZuLmNhbGwobGliLCBicmFuY2gsIGtleSkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIHRoYXQgY29udHJpYnV0ZSB0byB0aGUgZ2xvYmFsIG9uKCkgZnVuY3Rpb25cblx0XHQgKiBtdXN0IHByb3ZpZGUgYW4gaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgbWV0aG9kLlxuXHRcdCAqIFxuXHRcdCAqIExpYnJhcmllcyBtdXN0IGltcGxlbWVudCB0aGlzIGZ1bmN0aW9uIGluIG9yZGVyIHRvIHByb3ZpZGUgdGhlaXIgb3duXG5cdFx0ICogaG9va3MgaW50byB0aGUgZ2xvYmFsIHJlY3VycmVudCBmdW5jdGlvbnMgKHN1Y2ggYXMgb24oKSwgb25seSgpIGFuZCBvbmNlKCkpLlxuXHRcdCAqIFxuXHRcdCAqIElmIHRoZSBsaWJyYXJ5IGRvZXMgbm90IHJlY29nbml6ZSB0aGUgc2VsZWN0b3IgcHJvdmlkZWQsIGl0IHNob3VsZFxuXHRcdCAqIHJldHVybiBmYWxzZSwgc28gdGhhdCB0aGUgUmVmbGV4IGVuZ2luZSBjYW4gZmluZCBhbm90aGVyIHBsYWNlIHRvXG5cdFx0ICogcGVyZm9ybSB0aGUgYXR0YWNobWVudC4gSW4gb3RoZXIgY2FzZXMsIGl0IHNob3VsZCByZXR1cm4gdHJ1ZS5cblx0XHQgKi9cblx0XHRhdHRhY2hSZWN1cnJlbnQoXG5cdFx0XHRraW5kOiBSZWN1cnJlbnRLaW5kLFxuXHRcdFx0dGFyZ2V0OiBJQnJhbmNoLFxuXHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdGNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9tPixcblx0XHRcdHJlc3Q6IGFueVtdKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnJvdXRlKFxuXHRcdFx0XHR0YXJnZXQsXG5cdFx0XHRcdGxpYiA9PiBsaWIuYXR0YWNoUmVjdXJyZW50LFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGtpbmQsIHRhcmdldCwgc2VsZWN0b3IsIGNhbGxiYWNrLCByZXN0KSxcblx0XHRcdFx0ZmFsc2UpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIHRoYXQgY29udHJpYnV0ZSB0byB0aGUgZ2xvYmFsIG9mZigpIGZ1bmN0aW9uXG5cdFx0ICogbXVzdCBwcm92aWRlIGFuIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIG1ldGhvZC5cblx0XHQgKi9cblx0XHRkZXRhY2hSZWN1cnJlbnQoXG5cdFx0XHRicmFuY2g6IElCcmFuY2gsXG5cdFx0XHRzZWxlY3RvcjogYW55LFxuXHRcdFx0Y2FsbGJhY2s6IFJlY3VycmVudENhbGxiYWNrPEF0b20+KVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdGxpYiA9PiBsaWIuZGV0YWNoUmVjdXJyZW50LFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGJyYW5jaCwgc2VsZWN0b3IsIGNhbGxiYWNrKSxcblx0XHRcdFx0ZmFsc2UpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIGNhbiBpbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiBpbiBvcmRlclxuXHRcdCAqIHRvIGNhcHR1cmUgdGhlIGZsb3cgb2YgYnJhbmNoZXMgYmVpbmcgcGFzc2VkIGFzXG5cdFx0ICogYXRvbXMgdG8gb3RoZXIgYnJhbmNoIGZ1bmN0aW9ucy5cblx0XHQgKi9cblx0XHRoYW5kbGVCcmFuY2hGdW5jdGlvbihcblx0XHRcdGJyYW5jaDogSUJyYW5jaCxcblx0XHRcdGJyYW5jaEZuOiAoLi4uYXRvbXM6IGFueVtdKSA9PiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdGxpYiA9PiBsaWIuaGFuZGxlQnJhbmNoRnVuY3Rpb24sXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYnJhbmNoLCBicmFuY2hGbikpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIGNhbiBpbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiBpbiBvcmRlciB0byBwcm9jZXNzXG5cdFx0ICogYSBicmFuY2ggYmVmb3JlIGl0J3MgcmV0dXJuZWQgZnJvbSBhIGJyYW5jaCBmdW5jdGlvbi4gV2hlbiB0aGlzXG5cdFx0ICogZnVuY3Rpb24gaXMgaW1wbGVtZW50ZWQsIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGJyYW5jaCBmdW5jdGlvbnNcblx0XHQgKiBhcmUgcmVwbGFjZWQgd2l0aCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoaXMgZnVuY3Rpb24uIFJlZmxleGl2ZSBsaWJyYXJpZXNcblx0XHQgKiB0aGF0IHJlcXVpcmUgdGhlIHN0YW5kYXJkIGJlaGF2aW9yIG9mIHJldHVybmluZyBicmFuY2hlcyBmcm9tIHRoZVxuXHRcdCAqIGJyYW5jaCBmdW5jdGlvbnMgc2hvdWxkIHJldHVybiB0aGUgYGJyYW5jaGAgYXJndW1lbnQgdG8gdGhpcyBmdW5jdGlvblxuXHRcdCAqIHZlcmJhdGltLlxuXHRcdCAqL1xuXHRcdHJldHVybkJyYW5jaChicmFuY2g6IElCcmFuY2gpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucm91dGUoXG5cdFx0XHRcdGJyYW5jaCxcblx0XHRcdFx0bGliID0+IGxpYi5yZXR1cm5CcmFuY2gsXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYnJhbmNoKSxcblx0XHRcdFx0YnJhbmNoKVxuXHRcdH1cblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4XG57XG5cdC8qKlxuXHQgKiBBIGNsYXNzIHRoYXQgd3JhcHMgYSB2YWx1ZSB3aG9zZSBjaGFuZ2VzIGNhbiBiZSBvYnNlcnZlZC5cblx0ICovXG5cdGV4cG9ydCBjbGFzcyBTdGF0ZWZ1bEZvcmNlPFQgPSBhbnk+XG5cdHtcblx0XHRjb25zdHJ1Y3Rvcih2YWx1ZTogVClcblx0XHR7XG5cdFx0XHR0aGlzLl92YWx1ZSA9IHZhbHVlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogXG5cdFx0ICogR2V0cyBvciBzZXRzIHRoZSB2YWx1ZSBvZiB0aGUgZm9yY2UuXG5cdFx0ICovXG5cdFx0Z2V0IHZhbHVlKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5fdmFsdWU7XG5cdFx0fVxuXHRcdHNldCB2YWx1ZSh2YWx1ZTogVClcblx0XHR7XG5cdFx0XHRjb25zdCB3YXMgPSB0aGlzLl92YWx1ZTtcblx0XHRcdHRoaXMuX3ZhbHVlID0gdmFsdWU7XG5cdFx0XHRcblx0XHRcdGlmICh3YXMgIT09IHRoaXMuX3ZhbHVlKVxuXHRcdFx0XHR0aGlzLmNoYW5nZWQodmFsdWUsIHdhcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiBAaW50ZXJuYWwgKi9cblx0XHRwcml2YXRlIF92YWx1ZTogYW55O1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFNldHMgdGhlIHZhbHVlIG9mIHRoZSBmb3JjZSBhbmQgcmV0dXJucyB2b2lkLlxuXHRcdCAqIChVc2VmdWwgZm9yIGZvcmNlIGFyZ3VtZW50cyBpbiBhcnJvdyBmdW5jdGlvbnMgdG8gY2FuY2VsIHRoZSByZXR1cm4gdmFsdWUuKVxuXHRcdCAqL1xuXHRcdHNldCh2YWx1ZTogVClcblx0XHR7XG5cdFx0XHR0aGlzLnZhbHVlID0gdmFsdWU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEBpbnRlcm5hbFxuXHRcdCAqIEl0J3MgaW1wb3J0YW50IHRoYXQgdGhpcyBpcyBhbiBhc3NpZ25tZW50IHJhdGhlciB0aGFuIGEgZnVuY3Rpb24sXG5cdFx0ICogYmVjYXVzZSB0aGUgZXZlbnQgbmVlZHMgdG8gYmUgb24gdGhlIGluc3RhbmNlIHJhdGhlciB0aGFuIGluIHRoZVxuXHRcdCAqIHByb3RvdHlwZSBzbyB0aGF0IGl0J3MgY2F1Z2h0IGJ5IHRoZSBldmVudCBzeXN0ZW0uXG5cdFx0ICovXG5cdFx0Y2hhbmdlZCA9IGZvcmNlPChub3c6IFQsIHdhczogVCkgPT4gdm9pZD4oKTtcblx0XHRcblx0XHQvKiogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgdmFsdWUgb2YgdGhpcyBmb3JjZS4gKi9cblx0XHR0b1N0cmluZygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIFwiXCIgKyB0aGlzLl92YWx1ZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0dmFsdWVPZigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuX3ZhbHVlO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIEJvb2xlYW5Gb3JjZSBleHRlbmRzIFN0YXRlZnVsRm9yY2U8Ym9vbGVhbj5cblx0e1xuXHRcdC8qKlxuXHRcdCAqIEZsaXBzIHRoZSB2YWx1ZSBvZiB0aGUgZm9yY2UgZnJvbSB0cnVlIHRvIGZhbHNlIG9yIGZhbHNlIHRvIHRydWUuXG5cdFx0ICogKFVzZWZ1bCBmb3IgZm9yY2UgYXJndW1lbnRzIGluIGFycm93IGZ1bmN0aW9ucyB0byBjYW5jZWwgdGhlIHJldHVybiB2YWx1ZS4pXG5cdFx0ICovXG5cdFx0ZmxpcCgpXG5cdFx0e1xuXHRcdFx0dGhpcy5zZXQoIXRoaXMudmFsdWUpO1xuXHRcdH1cblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqXG5cdCAqIERlYWxzIHdpdGggdGVtcG9yYXJpbHkgdHJhY2tpbmcgaW5zZXJ0ZWQgbWV0YXMuXG5cdCAqIFxuXHQgKiBPbmUgc2luZ2xlIGJyYW5jaCBjYW4gcG90ZW50aWFsbHkgaGF2ZSBtdWx0aXBsZSB0cmFja2Vyc1xuXHQgKiBhc3NvY2lhdGVkIHdpdGggaXQsIGluIHRoZSBjYXNlIHdoZW4gdGhlIGJyYW5jaCBoYXMgbXVsdGlwbGVcblx0ICogbGF5ZXJzIG9mIHN0cmVhbSBtZXRhcyBhcHBsaWVkIHRvIGl0LiBUaGVyZSBpcyBvbmUgdHJhY2tlciBpbnN0YW5jZVxuXHQgKiBmb3IgZWFjaCBzZXQgb2YgXCJzaWJsaW5nXCIgbWV0YXMuXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgVHJhY2tlclxuXHR7XG5cdFx0LyoqICovXG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRwcml2YXRlIHJlYWRvbmx5IGJyYW5jaDogSUJyYW5jaCxcblx0XHRcdHJlZjogUmVmIHwgTG9jYXRvciA9IFwiYXBwZW5kXCIpXG5cdFx0e1xuXHRcdFx0dGhpcy5sYXN0ID0gcmVmO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBVcGRhdGVzIHRoZSBpbnRlcm5hbCB0cmFja2luZyB2YWx1ZSBvZiB0aGUgVHJhY2tlci5cblx0XHQgKi9cblx0XHR1cGRhdGUob2JqZWN0OiBSZWYgfCBMb2NhdG9yKVxuXHRcdHtcblx0XHRcdHRoaXMubGFzdCA9IG9iamVjdDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyBhIHZhbHVlIHRoYXQgY2FuIGJlIHVzZWQgaW4gYSBjbGllbnQgbGlicmFyeSBhcyB0aGVcblx0XHQgKiByZWZlcmVuY2Ugc2libGluZyB2YWx1ZSB0byBpbmRpY2F0ZSBhbiBpbnNlcnRpb24gcG9pbnQuXG5cdFx0ICovXG5cdFx0Z2V0TGFzdEhhcmRSZWYoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmxhc3QgaW5zdGFuY2VvZiBMb2NhdG9yID9cblx0XHRcdFx0dGhpcy5yZXNvbHZlUmVmKCkgOlxuXHRcdFx0XHR0aGlzLmxhc3Q7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENsb25lcyBhbmQgcmV0dXJucyB0aGlzIFRyYWNrZXIuIFVzZWQgdG8gY3JlYXRlIGEgbmV3XG5cdFx0ICogVHJhY2tlciBpbnN0YW5jZSBmb3IgYSBtb3JlIG5lc3RlZCBsZXZlbCBvZiBzdHJlYW0gbWV0YS5cblx0XHQgKi9cblx0XHRkZXJpdmUoKVxuXHRcdHtcblx0XHRcdGNvbnN0IG91dCA9IG5ldyBUcmFja2VyKHRoaXMuYnJhbmNoKTtcblx0XHRcdG91dC5sYXN0ID0gdGhpcy5sYXN0O1xuXHRcdFx0XG5cdFx0XHRpZiAoQ29uc3QuZGVidWcpXG5cdFx0XHRcdG91dC50cmFja2VyQ29udGFpbmVyID0gdGhpcztcblx0XHRcdFxuXHRcdFx0cmV0dXJuIG91dDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRW5zdXJlcyB0aGF0IHRoZSBzcGVjaWZpZWQgcmVmIG9iamVjdCBhY3R1YWxseSBleGlzdHMgaW4gdGhlIFJlZmxleGl2ZVxuXHRcdCAqIHRyZWUsIGFuZCBpZiBub3QsIGEgbmV3IG9iamVjdCBpcyByZXR1cm5lZCB0aGF0IGNhbiBiZSB1c2VkIGFzIHRoZSByZWYuXG5cdFx0ICogSW4gdGhlIGNhc2Ugd2hlbiBudWxsIGlzIHJldHVybmVkLCBudWxsIHNob3VsZCBiZSB1c2VkIGFzIHRoZSByZWYsXG5cdFx0ICogaW5kaWNhdGluZyB0aGF0IHRoZSBpbnNlcnRpb24gc2hvdWxkIG9jY3VyIGF0IHRoZSBlbmQgb2YgdGhlIGNoaWxkIGxpc3QuXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSByZXNvbHZlUmVmKCk6IFJlZlxuXHRcdHtcblx0XHRcdGNvbnN0IHJlZiA9IHRoaXMubGFzdDtcblx0XHRcdFxuXHRcdFx0aWYgKHJlZiA9PT0gbnVsbClcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiP1wiKTtcblx0XHRcdFxuXHRcdFx0aWYgKHJlZiA9PT0gXCJwcmVwZW5kXCIgfHwgcmVmID09PSBcImFwcGVuZFwiKVxuXHRcdFx0XHRyZXR1cm4gcmVmO1xuXHRcdFx0XG5cdFx0XHRjb25zdCByZWZMb2NhdG9yID0gKCgpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGlmIChyZWYgaW5zdGFuY2VvZiBMb2NhdG9yKVxuXHRcdFx0XHRcdHJldHVybiByZWY7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCByZWZNZXRhID0gXG5cdFx0XHRcdFx0QnJhbmNoTWV0YS5vZihyZWYpIHx8XG5cdFx0XHRcdFx0TGVhZk1ldGEub2YocmVmKTtcblx0XHRcdFx0XG5cdFx0XHRcdHJldHVybiByZWZNZXRhID9cblx0XHRcdFx0XHRyZWZNZXRhLmxvY2F0b3IgOlxuXHRcdFx0XHRcdG51bGw7XG5cdFx0XHR9KSgpO1xuXHRcdFx0XG5cdFx0XHRpZiAoIXJlZkxvY2F0b3IpXG5cdFx0XHRcdHJldHVybiBcImFwcGVuZFwiO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBjaGlsZHJlbiA9IFJvdXRpbmdMaWJyYXJ5LnRoaXMuZ2V0Q2hpbGRyZW4odGhpcy5icmFuY2gpO1xuXHRcdFx0bGV0IHByZXZpb3VzOiBJQnJhbmNoIHwgSUxlYWYgfCBudWxsID0gbnVsbDtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiBjaGlsZHJlbilcblx0XHRcdHtcblx0XHRcdFx0aWYgKHJlZiA9PT0gY2hpbGQpXG5cdFx0XHRcdFx0cmV0dXJuIHJlZjtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRDaGlsZE1ldGEgPSBcblx0XHRcdFx0XHRCcmFuY2hNZXRhLm9mKGNoaWxkKSB8fFxuXHRcdFx0XHRcdExlYWZNZXRhLm9mKGNoaWxkKTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChjdXJyZW50Q2hpbGRNZXRhKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Ly8gVGhlIGV4cGxhbmF0aW9uIG9mIHRoaXMgYWxnb3JpdGhtIGlzIHRoYXQgd2UncmUgd2Fsa2luZyB0aHJvdWdoXG5cdFx0XHRcdFx0Ly8gdGhlIGRpcmVjdCBjaGlsZCBtZXRhcyBvZiBjb250YWluaW5nQnJhbmNoLiBUaGUgaWRlYWwgY2FzZSBpc1xuXHRcdFx0XHRcdC8vIHRoYXQgdGhlIG1ldGEgdGhhdCB3YXMgcHJldmlvdXNseSBiZWluZyB1c2VkIGFzIHRoZSBsb2NhdG9yIGlzXG5cdFx0XHRcdFx0Ly8gc3RpbGwgcHJlc2VudCBpbiB0aGUgZG9jdW1lbnQuIEluIHRoaXMgY2FzZSwgdGhlIHJlZiBkb2Vzbid0IG5lZWRcblx0XHRcdFx0XHQvLyB0byBiZSB1cGRhdGVkLCBzbyBpdCBjYW4ganVzdCBiZSByZXR1cm5lZCB2ZXJiYXRpbS4gSG93ZXZlciwgXG5cdFx0XHRcdFx0Ly8gaW4gdGhlIGNhc2Ugd2hlbiB0aGUgcmVmIGlzIG1pc3NpbmcsIHdlIG5lZWQgdG8gcmV0dXJuIHRoZSBuZXh0XG5cdFx0XHRcdFx0Ly8gbmV3ZXN0IG1ldGEgdGhhdCBpc24ndCBuZXdlciB0aGFuIHRoZSBsb2NhdG9yIG9mIHRoZSBvcmlnaW5hbFxuXHRcdFx0XHRcdC8vIHJlZi5cblx0XHRcdFx0XHRjb25zdCBjbXAgPSBjdXJyZW50Q2hpbGRNZXRhLmxvY2F0b3IuY29tcGFyZShyZWZMb2NhdG9yKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoY21wID09PSBDb21wYXJlUmVzdWx0LmVxdWFsKVxuXHRcdFx0XHRcdFx0cmV0dXJuIGNoaWxkO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIFRoZSBjdXJyZW50IGNoaWxkIG1ldGEgaXMgbmV3ZXIgdGhhbiB0aGUgcmVmIG1ldGEuIFRoaXMgbWVhbnNcblx0XHRcdFx0XHQvLyB0aGF0IHdlIHdlbnQgdG9vIGZhciwgc28gd2Ugc2hvdWxkIHJldHVybiB0aGUgcHJldmlvdXMgbWV0YS5cblx0XHRcdFx0XHQvLyBPciwgaW4gdGhlIGNhc2Ugd2hlbiB3ZSBoYXZlbid0IGhpdCBhIG1ldGEgeWV0LCB3ZSBuZWVkIHRvXG5cdFx0XHRcdFx0Ly8gcmV0dXJuIHRoZSBjb25zdGFudCBcInByZXBlbmRcIiAoYmVjYXVzZSB0aGVyZSdzIG5vdGhpbmcgdG9cblx0XHRcdFx0XHQvLyByZWZlciB0byBpbiB0aGlzIGNhc2UpLlxuXHRcdFx0XHRcdGlmIChjbXAgPT09IENvbXBhcmVSZXN1bHQubG93ZXIpXG5cdFx0XHRcdFx0XHRyZXR1cm4gcHJldmlvdXMgfHwgXCJwcmVwZW5kXCI7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdHByZXZpb3VzID0gY2hpbGQ7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiBcImFwcGVuZFwiO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgYSByb2xsaW5nIHZhbHVlIHRoYXQgaW5kaXJlY3RseSByZWZlcnMgdG8gdGhlIGxhc3QgbWV0YVxuXHRcdCAqIHRoYXQgd2FzIGFwcGVuZGVkIHRvIHRoZSBicmFuY2ggdGhhdCB0aGlzIHRyYWNrZXIgaXMgdHJhY2tpbmcuXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSBsYXN0OiBSZWYgfCBMb2NhdG9yO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEBpbnRlcm5hbFxuXHRcdCAqIEZvciBkZWJ1Z2dpbmcgb25seS5cblx0XHQgKi9cblx0XHRwcml2YXRlIHRyYWNrZXJDb250YWluZXI6IFRyYWNrZXIgfCB1bmRlZmluZWQ7XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBBcnJheVN0cmVhbU1ldGEgZXh0ZW5kcyBTdHJlYW1NZXRhXG5cdHtcblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdHJlYWRvbmx5IGNvbnRhaW5lck1ldGE6IENvbnRhaW5lck1ldGEsXG5cdFx0XHRyZWFkb25seSByZWN1cnJlbnQ6IFJlY3VycmVudClcblx0XHR7XG5cdFx0XHRzdXBlcihjb250YWluZXJNZXRhKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0YXR0YWNoKGNvbnRhaW5pbmdCcmFuY2g6IElCcmFuY2gsIHRyYWNrZXI6IFRyYWNrZXIpXG5cdFx0e1xuXHRcdFx0Y29uc3QgbG9jYWxUcmFja2VyID0gdHJhY2tlci5kZXJpdmUoKTtcblx0XHRcdGxvY2FsVHJhY2tlci51cGRhdGUodGhpcy5sb2NhdG9yKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgcmVjID0gdGhpcy5yZWN1cnJlbnQ7XG5cdFx0XHRjb25zdCBhcnJheUZvcmNlOiBBcnJheUZvcmNlPGFueT4gPSByZWMuc2VsZWN0b3I7XG5cdFx0XHRjb25zdCByZXN0QXJncyA9IHJlYy51c2VyUmVzdEFyZ3Muc2xpY2UoKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCBhcnJheUZvcmNlLmxlbmd0aDspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGZvID0gYXJyYXlGb3JjZVtpXTtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IGF0b21zID0gcmVjLnVzZXJDYWxsYmFjayhcblx0XHRcdFx0XHRmbyxcblx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdGksXG5cdFx0XHRcdFx0Li4ucmVzdEFyZ3MpO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgbWV0YXMgPSBDb3JlVXRpbC50cmFuc2xhdGVBdG9tcyhcblx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdHRoaXMuY29udGFpbmVyTWV0YSxcblx0XHRcdFx0XHRhdG9tcyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRDb3JlVXRpbC5hcHBseU1ldGFzKFxuXHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0dGhpcy5jb250YWluZXJNZXRhLFxuXHRcdFx0XHRcdG1ldGFzLFxuXHRcdFx0XHRcdGxvY2FsVHJhY2tlcik7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGZpbmRNZXRhID0gKHBvc2l0aW9uOiBudW1iZXIpID0+IFxuXHRcdFx0e1x0XG5cdFx0XHRcdGxldCBwb3MgPSBwb3NpdGlvbjtcblx0XHRcdFx0Y29uc3QgaXRlcmF0b3IgPSBSb3V0aW5nTGlicmFyeS50aGlzLmdldENoaWxkcmVuKGNvbnRhaW5pbmdCcmFuY2gpO1xuXHRcdFx0XHRmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlcmF0b3IpIFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgTWV0YSA9IEJyYW5jaE1ldGEub2YoaXRlbSk7XG5cdFx0XHRcdFx0aWYgKE1ldGEgJiYgXG5cdFx0XHRcdFx0XHRNZXRhLmxvY2F0b3IuY29tcGFyZSh0aGlzLmxvY2F0b3IpID09PSBDb21wYXJlUmVzdWx0Lmxvd2VyICYmXG5cdFx0XHRcdFx0XHQtLXBvcyA9PT0gLTEpIFxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHJldHVybiBNZXRhO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0Rm9yY2VVdGlsLmF0dGFjaEZvcmNlKGFycmF5Rm9yY2Uucm9vdC5jaGFuZ2VkLCAoaXRlbTogYW55LCBwb3NpdGlvbjogbnVtYmVyKSA9PiBcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgaW50ZXJuYWxQb3MgPSBhcnJheUZvcmNlLnBvc2l0aW9ucy5pbmRleE9mKHBvc2l0aW9uKTtcblx0XHRcdFx0aWYgKHBvc2l0aW9uID4gLTEpIFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgbWV0YSA9IGZpbmRNZXRhKGludGVybmFsUG9zKTtcblx0XHRcdFx0XHRpZiAobWV0YSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBhdG9tcyA9IHJlYy51c2VyQ2FsbGJhY2soaXRlbSwgY29udGFpbmluZ0JyYW5jaCwgcG9zaXRpb24pO1xuXHRcdFx0XHRcdFx0Y29uc3QgbWV0YXMgPSBDb3JlVXRpbC50cmFuc2xhdGVBdG9tcyhcblx0XHRcdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHRcdFx0dGhpcy5jb250YWluZXJNZXRhLFxuXHRcdFx0XHRcdFx0XHRhdG9tcylbMF0gYXMgQnJhbmNoTWV0YTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRtZXRhcy5sb2NhdG9yLnNldENvbnRhaW5lcih0aGlzLmNvbnRhaW5lck1ldGEubG9jYXRvcik7XG5cdFx0XHRcdFx0XHRSb3V0aW5nTGlicmFyeS50aGlzLnJlcGxhY2VCcmFuY2gobWV0YS5icmFuY2gsIG1ldGFzLmJyYW5jaCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Rm9yY2VVdGlsLmF0dGFjaEZvcmNlKGFycmF5Rm9yY2UuYWRkZWQsIChpdGVtOiBhbnksIHBvc2l0aW9uOiBudW1iZXIpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGF0b21zID0gcmVjLnVzZXJDYWxsYmFjayhpdGVtLCBjb250YWluaW5nQnJhbmNoLCBwb3NpdGlvbik7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBtZXRhcyA9IENvcmVVdGlsLnRyYW5zbGF0ZUF0b21zKFxuXHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0dGhpcy5jb250YWluZXJNZXRhLFxuXHRcdFx0XHRcdGF0b21zKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0bGV0IHRyYWNrZXIgPSBsb2NhbFRyYWNrZXI7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAocG9zaXRpb24gPCBhcnJheUZvcmNlLmxlbmd0aClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IG1ldGEgPSBmaW5kTWV0YShwb3NpdGlvbiAtIDEpO1xuXHRcdFx0XHRcdGlmIChtZXRhKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHRyYWNrZXIgPSBsb2NhbFRyYWNrZXIuZGVyaXZlKCk7XG5cdFx0XHRcdFx0XHR0cmFja2VyLnVwZGF0ZShtZXRhLmJyYW5jaCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdENvcmVVdGlsLmFwcGx5TWV0YXMoXG5cdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lck1ldGEsXG5cdFx0XHRcdFx0bWV0YXMsXG5cdFx0XHRcdFx0dHJhY2tlcik7XG5cdFx0XHR9KTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0Rm9yY2VVdGlsLmF0dGFjaEZvcmNlKGFycmF5Rm9yY2UucmVtb3ZlZCwgKGl0ZW06IGFueSwgcG9zaXRpb246IG51bWJlcikgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgbWV0YSA9IGZpbmRNZXRhKHBvc2l0aW9uKTtcblx0XHRcdFx0aWYgKG1ldGEpXG5cdFx0XHRcdFx0Q29yZVV0aWwudW5hcHBseU1ldGFzKGNvbnRhaW5pbmdCcmFuY2gsIFttZXRhXSk7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Rm9yY2VVdGlsLmF0dGFjaEZvcmNlKGFycmF5Rm9yY2UubW92ZWQsIChpdGVtMTogYW55LCBpdGVtMjogYW55LCBpbmRleDE6IG51bWJlciwgaW5kZXgyOiBudW1iZXIpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHNvdXJjZSA9IGZpbmRNZXRhKGluZGV4MSk7XG5cdFx0XHRcdGNvbnN0IHRhcmdldCA9IGZpbmRNZXRhKGluZGV4Mik7XG5cblx0XHRcdFx0aWYgKHNvdXJjZSAmJiB0YXJnZXQpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBzcmNMb2NWYWwgPSBzb3VyY2UubG9jYXRvci5nZXRMYXN0TG9jYXRvclZhbHVlKCk7XG5cdFx0XHRcdFx0Y29uc3QgdGFyZ2V0TG9jVmFsID0gdGFyZ2V0LmxvY2F0b3IuZ2V0TGFzdExvY2F0b3JWYWx1ZSgpO1xuXHRcdFx0XHRcdHNvdXJjZS5sb2NhdG9yLnNldExhc3RMb2NhdG9yVmFsdWUodGFyZ2V0TG9jVmFsKTtcblx0XHRcdFx0XHR0YXJnZXQubG9jYXRvci5zZXRMYXN0TG9jYXRvclZhbHVlKHNyY0xvY1ZhbCk7XG5cblx0XHRcdFx0XHRSb3V0aW5nTGlicmFyeS50aGlzLnN3YXBCcmFuY2hlcyhzb3VyY2UuYnJhbmNoLCB0YXJnZXQuYnJhbmNoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdEZvcmNlVXRpbC5hdHRhY2hGb3JjZShhcnJheUZvcmNlLnRhaWxDaGFuZ2UsIChpdGVtOiBhbnksIHBvc2l0aW9uOiBudW1iZXIpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHNvdXJjZSA9IGZpbmRNZXRhKHBvc2l0aW9uKTtcblx0XHRcdFx0aWYgKHNvdXJjZSlcblx0XHRcdFx0XHRsb2NhbFRyYWNrZXIudXBkYXRlKHNvdXJjZS5icmFuY2gpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG59XG4iXX0=