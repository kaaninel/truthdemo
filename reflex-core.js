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
        class LeafMeta extends Meta {
            constructor(locator) {
                super(locator || new Core.Locator(1 /* leaf */));
            }
        }
        Core.LeafMeta = LeafMeta;
        /**
         * Stores information about a raw string or number that
         * will be applied to some branch.
         */
        class ValueMeta extends LeafMeta {
            constructor(value) {
                super();
                this.value = value;
            }
        }
        Core.ValueMeta = ValueMeta;
        /** */
        class ClosureMeta extends LeafMeta {
            constructor(closure) {
                super();
                this.closure = closure;
            }
        }
        Core.ClosureMeta = ClosureMeta;
        /**
         * Stores the information about a single attribute.
         * Although attributes can come in a large object literal
         * that specifies many attributes together, the atomic
         * translator function splits them up into smaller metas,
         * which is done because some values may be static,
         * and others may be behind a force.
         */
        class AttributeMeta extends LeafMeta {
            constructor(key, value) {
                super();
                this.key = key;
                this.value = value;
            }
        }
        Core.AttributeMeta = AttributeMeta;
        /**
         * Stores information about an instance of some class
         * that is known to a client Reflex library.
         */
        class InstanceMeta extends LeafMeta {
            constructor(value) {
                super();
                this.value = value;
            }
        }
        Core.InstanceMeta = InstanceMeta;
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
            constructor(branch, initialAtomics, locator) {
                super(locator || new Core.Locator(0 /* branch */));
                /**
                 * An arbitrary unique value used to identify an index in a force
                 * array that was responsible for rendering this BranchMeta.
                 */
                this.key = 0;
                this.branch = branch;
                BranchMeta.metas.set(branch, this);
                if (initialAtomics.length) {
                    const metas = Core.CoreUtil.translateAtomics(branch, this, initialAtomics);
                    Core.CoreUtil.applyMetas(branch, this, metas);
                }
            }
            /**
             * Returns the ContentMeta object that corresponds
             * to the specified content object.
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
        class ContentMeta extends Core.LeafMeta {
            /** */
            constructor(value, locator) {
                super(locator);
                this.value = value;
                /**
                 * An arbitrary unique value used to identify an index in a force
                 * array that was responsible for rendering this BranchMeta.
                 */
                this.key = 0;
                ContentMeta.metas.set(value, this);
            }
            /**
             * Returns the ContentMeta object that corresponds
             * to the specified content object.
             */
            static of(content) {
                return this.metas.get(content) || null;
            }
        }
        /** */
        ContentMeta.metas = new WeakMap();
        Core.ContentMeta = ContentMeta;
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
                        const nowMetas = Core.CoreUtil.translateAtomics(this, containerMeta, p);
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
                    if (selectorItem instanceof Core.StatefulForce)
                        Core.ForceUtil.attachForce(selectorItem.changed, this.systemCallback);
                    else if (Core.isForceFunction(selectorItem))
                        Core.ForceUtil.attachForce(selectorItem, this.systemCallback);
                    else
                        switch (selectorItem) {
                            case Reflex.mutation.any: break;
                            case Reflex.mutation.branch: break;
                            case Reflex.mutation.branchAdd: break;
                            case Reflex.mutation.branchRemove: break;
                            case Reflex.mutation.content: break;
                            case Reflex.mutation.contentAdd: break;
                            case Reflex.mutation.contentRemove: break;
                            default: Core.RoutingLibrary.this.attachRecurrent(rec.kind, containingBranch, selectorItem, this.systemCallback, this.recurrent.userRestArgs);
                        }
                }
                const autorunArguments = Core.extractAutorunArguments(rec);
                if (autorunArguments) {
                    const item = selector[0];
                    if (item instanceof Core.StatefulForce)
                        this.invokeAutorunCallback([item.value, item.value], containingBranch);
                    else if (Core.isForceFunction(item))
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
                unresolved.push(meta instanceof Core.BranchMeta || meta instanceof Core.ContentMeta ?
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
                            Core.ContentMeta.of(child);
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
                        Core.CoreUtil.applyMetas(containingBranch, this.containerMeta, Core.CoreUtil.translateAtomics(containingBranch, containingBranchMeta, result), tracker);
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
                            const resultMetas = Core.CoreUtil.translateAtomics(containingBranch, branchMeta, iterableResult);
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
/// <reference path="Meta/ContentMeta.ts" />
/// <reference path="Meta/RecurrentStreamMeta.ts" />
/// <reference path="Meta/PromiseStreamMeta.ts" />
/// <reference path="Meta/AsyncIterableStreamMeta.ts" />
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        class ArrayForce {
            /** */
            constructor(root) {
                this.added = force();
                this.removed = force();
                this.moved = force();
                this.tailChange = force();
                /** */
                this.positions = [];
                if (root instanceof Core.ArrayStore) {
                    this.root = root;
                }
                else {
                    this.root = root.root;
                    Core.ForceUtil.attachForce(root.added, (item, index) => {
                        this.insertRef(index, root.positions[index]);
                    });
                    Core.ForceUtil.attachForce(root.removed, (item, index, id) => {
                        const loc = this.positions.indexOf(id);
                        if (loc > -1)
                            this.splice(loc, 1);
                    });
                }
                Core.ForceUtil.attachForce(this.root.changed, () => {
                    this.executeFilter();
                    this.executeSort();
                });
            }
            /** */
            static create(items) {
                const store = new Core.ArrayStore();
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
                    Core.ForceUtil.attachForce(fo instanceof Core.StatefulForce ?
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
                    Core.ForceUtil.attachForce(fo instanceof Core.StatefulForce ? fo.changed : fo, () => {
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
        Core.ArrayForce = ArrayForce;
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        class ArrayStore {
            constructor() {
                this.root = {};
                this.next = 0;
                this.changed = force();
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
                    if (item.ref === 0) {
                        item.value = undefined;
                    }
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
         * Handles the running of recurrent functions that are built into
         * the Reflex Core.
         */
        class CoreRecurrent {
            /**
             *
             */
            static attachAtomic(branch, atomic) {
                this.run("reflex:attach-atomic", branch, [atomic, branch]);
            }
            /**
             *
             */
            static detachAtomic(branch, atomic) {
                this.run("reflex:detach-atomic", branch, [atomic, branch]);
            }
            /**
             *
             */
            static run(selector, branch, args) {
                const recs = this.listeners.get(branch);
                if (recs)
                    for (const rec of recs)
                        if (rec.selector === selector)
                            if (rec.userCallback(...args, ...rec.userRestArgs) === true)
                                recs.delete(rec);
            }
            /**
             *
             */
            static listen(branch, recurrent) {
                let recs = this.listeners.get(branch);
                recs ?
                    recs.add(recurrent) :
                    this.listeners.set(branch, new Set([recurrent]));
            }
        }
        /** */
        CoreRecurrent.selectors = Object.freeze([
            "reflex:attach-atomic",
            "reflex:detach-atomic"
        ]);
        /** */
        CoreRecurrent.listeners = new WeakMap();
        Core.CoreRecurrent = CoreRecurrent;
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
             * Cleans out the cruft from the atomics array,
             * flattens all arrays, and converts the resulting
             * values into Meta instances.
             */
            translateAtomics(containerBranch, containerMeta, rawAtomics) {
                const lib = Core.RoutingLibrary.this;
                const atomics = Array.isArray(rawAtomics) ?
                    rawAtomics.slice() :
                    [rawAtomics];
                for (let i = -1; ++i < atomics.length;) {
                    const atomic = atomics[i];
                    // Initial clear out of discarded values.
                    if (atomic === null ||
                        atomic === undefined ||
                        typeof atomic === "boolean" ||
                        atomic === "" ||
                        atomic !== atomic ||
                        atomic === containerBranch)
                        atomics.splice(i--, 1);
                    // strings, numbers, and bigints are passed through verbatim in this phase.
                    else if (typeof atomic !== "object")
                        continue;
                    else if (Array.isArray(atomic))
                        atomics.splice(i--, 1, ...atomic);
                    else if (this.hasSymbol && atomic[Symbol.iterator])
                        atomics.splice(i--, 1, ...Array.from(atomic));
                }
                const metas = [];
                for (let i = -1; ++i < atomics.length;) {
                    const atomic = atomics[i];
                    if (atomic instanceof Core.Meta)
                        metas.push(atomic);
                    else if (atomic instanceof Core.Recurrent) {
                        if (atomic.selector instanceof Core.ArrayForce) {
                            metas.push(new Core.ArrayStreamMeta(containerMeta, atomic));
                        }
                        else if (Core.CoreRecurrent.selectors.includes(atomic.selector)) {
                            Core.CoreRecurrent.listen(containerBranch, atomic);
                        }
                        else {
                            metas.push(new Core.RecurrentStreamMeta(containerMeta, atomic));
                        }
                    }
                    else if (typeof atomic === "function")
                        metas.push(new Core.ClosureMeta(atomic));
                    else if (this.isAsyncIterable(atomic))
                        metas.push(new Core.AsyncIterableStreamMeta(containerMeta, atomic));
                    else if (atomic instanceof Promise)
                        metas.push(new Core.PromiseStreamMeta(containerMeta, atomic));
                    else if (this.isAttributes(atomic)) {
                        for (const [k, v] of Object.entries(atomic)) {
                            if (v instanceof Core.StatefulForce) {
                                metas.push(new Core.RecurrentStreamMeta(containerMeta, new Core.AttributeRecurrent(k, v)));
                            }
                            else
                                metas.push(new Core.AttributeMeta(k, v));
                        }
                    }
                    else if (["string", "number", "bigint"].includes(typeof atomic)) {
                        metas.push(new Core.ValueMeta(atomic));
                    }
                    else {
                        const existingMeta = Core.BranchMeta.of(atomic) ||
                            Core.ContentMeta.of(atomic);
                        if (existingMeta)
                            metas.push(existingMeta);
                        else if (typeof atomic === "object" &&
                            lib.isKnownLeaf(atomic))
                            metas.push(new Core.InstanceMeta(atomic));
                        // This error occurs when something was passed as a atomic 
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
                        if (!(value instanceof Core.StatefulForce))
                            return false;
                }
                return true;
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
             * the last applied branch or content object, which can be used for
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
                            const metasReturned = this.translateAtomics(containingBranch, containingBranchMeta, closureReturn);
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
                        lib.attachAtomic(meta.branch, containingBranch, hardRef);
                        tracker.update(meta.branch);
                    }
                    else if (meta instanceof Core.ContentMeta) {
                        const hardRef = tracker.getLastHardRef();
                        lib.attachAtomic(meta.value, containingBranch, hardRef);
                        tracker.update(meta.value);
                    }
                    else if (meta instanceof Core.ValueMeta || meta instanceof Core.InstanceMeta) {
                        lib.attachAtomic(meta.value, containingBranch, "append");
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
                    if (meta instanceof Core.ContentMeta || meta instanceof Core.ValueMeta)
                        lib.detachAtomic(meta.value, containingBranch);
                    else if (meta instanceof Core.AttributeMeta)
                        lib.detachAttribute(containingBranch, meta.value);
                    else if (meta instanceof Core.BranchMeta)
                        // We should probably consider getting rid of this
                        // You would be able to re-discover the branch by
                        // enumerating through the children of containingBranch,
                        // using the getChildren() method provided by the library.
                        lib.detachAtomic(meta.branch, containingBranch);
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
        mutation["content"] = "mutation-content";
        mutation["contentAdd"] = "mutation-content-add";
        mutation["contentRemove"] = "mutation-content-remove";
    })(mutation = Reflex.mutation || (Reflex.mutation = {}));
})(Reflex || (Reflex = {}));
var Reflex;
(function (Reflex) {
    var Core;
    (function (Core) {
        /**
         * Returns a boolean that indicates whether the specified value
         * is a stateless or stateful force.
         */
        function isForce(target) {
            // TODO: This function also needs to check for ArrayForce's
            return isForceFunction(target) ||
                target instanceof Core.StatefulForce;
        }
        Core.isForce = isForce;
        /**
         * Guards on whether the specified value is stateless force function.
         */
        function isForceFunction(forceFn) {
            return !!forceFn && entries.has(forceFn);
        }
        Core.isForceFunction = isForceFunction;
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
        /** */
        const entries = new WeakMap();
        class Entry {
            constructor() {
                this.systemCallbacks = new Set();
            }
        }
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
function force(initialValue) {
    const tryCreateSingle = (val) => {
        if (val === undefined || val === null)
            return Reflex.Core.ForceUtil.createFunction();
        if (typeof val === "boolean")
            return new Reflex.Core.BooleanForce(val);
        if (typeof val === "string" || typeof val === "bigint")
            return new Reflex.Core.StatefulForce(val);
        if (typeof val === "number")
            return new Reflex.Core.StatefulForce(val || 0);
        if (Array.isArray(val))
            return Reflex.Core.ArrayForce.create(val);
        return null;
    };
    const single = tryCreateSingle(initialValue);
    if (single !== null)
        return single;
    const backing = {};
    for (const key in initialValue) {
        // Skip past any private properties
        if (key.startsWith("_"))
            continue;
        const value = initialValue[key];
        // We can't deal with anything that starts as null or undefined
        if (value === undefined || value === null || typeof value === "function")
            continue;
        const single = tryCreateSingle(value);
        if (single !== null)
            backing[key] = single;
    }
    return new Proxy(initialValue, {
        get: (target, property) => {
            if (property in backing)
                return backing[property];
            return target[property];
        },
        set: (target, property, value) => {
            if (property in backing) {
                const targetVal = backing[property];
                if (targetVal instanceof Reflex.Core.StatefulForce)
                    targetVal.value = value;
                else if (targetVal instanceof Reflex.Core.ArrayForce)
                    throw new Error("Re-assignment of arrays is not implemented.");
                else
                    throw new Error("Unknown error.");
            }
            else
                target[property] = value;
            return true;
        }
    });
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
         * This function creates the "content" variant of a Reflex namespace, which
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
        function createContentNamespace(library, globalize) {
            if (1 /* debug */ && !library.createContent)
                throw new Error("The .createContent function must be implemented in this library.");
            return createNamespace(true, library, globalize);
        }
        Core.createContentNamespace = createContentNamespace;
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
        function createContainerNamespace(library, globalize) {
            if (1 /* debug */ && !library.createContainer)
                throw new Error("The .createContainer function must be implemented in this library.");
            return createNamespace(false, library, globalize);
        }
        Core.createContainerNamespace = createContainerNamespace;
        /**
         * Internal namespace object creation function.
         */
        function createNamespace(isContent, library, globalize) {
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
                    return new Core.Recurrent(kind, selector, callback, rest);
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
            const nsFn = isContent ?
                createContentNamespaceFn(library) :
                createContainerNamespaceFn(library);
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
        const createBranchFn = (constructBranchFn, name) => toBranchFunction(name, (...atomics) => returnBranch(constructBranchFn(), atomics));
        /**
         *
         */
        const createParameticBranchFn = (branchFn, name) => (...constructBranchArgs) => toBranchFunction(name, (...atomics) => returnBranch(branchFn(constructBranchArgs), atomics));
        /**
         *
         */
        function returnBranch(branch, atomics) {
            new Core.BranchMeta(branch, atomics);
            const lib = Core.RoutingLibrary.this;
            return lib.returnBranch ?
                lib.returnBranch(branch) :
                branch;
        }
        /**
         * Creates the function that exists at the top of the library,
         * which is used for inserting textual content into the tree.
         */
        function createContentNamespaceFn(library) {
            return (template, ...values) => {
                const array = Array.isArray(template) ?
                    template :
                    [template];
                const out = [];
                const len = array.length + values.length;
                const createContent = library.createContent;
                if (!createContent)
                    return;
                // TODO: This should be optimized so that multiple
                // repeating string values don't result in the creation
                // of many ContentMeta objects.
                for (let i = -1; ++i < len;) {
                    const val = i % 2 === 0 ?
                        array[i / 2] :
                        values[(i - 1) / 2];
                    if (val === null || val === undefined)
                        continue;
                    if (val instanceof Core.StatefulForce) {
                        out.push(new Core.Recurrent(0 /* on */, val, now => {
                            const result = createContent(now);
                            if (result)
                                new Core.ContentMeta(result);
                            return result;
                        }).run());
                    }
                    else {
                        const prepared = createContent(val);
                        if (prepared)
                            out.push(prepared);
                    }
                }
                for (const object of out)
                    new Core.ContentMeta(object);
                return out;
            };
        }
        /**
         * Creates the function that exists at the top of the library,
         * which is used for creating an abstract container object.
         */
        function createContainerNamespaceFn(library) {
            const createContainer = library.createContainer;
            return createContainer ?
                createBranchFn(() => createContainer(), "") :
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
    var Core;
    (function (Core) {
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
                if (typeof selector === "function" && !Core.isForce(selector)) {
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
        Core.Recurrent = Recurrent;
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
        const autorunCache = new WeakMap();
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
             *
             */
            isKnownLeaf(leaf) {
                if (leaf && typeof leaf === "object")
                    for (const lib of RoutingLibrary.libraries)
                        if (lib.isKnownLeaf && lib.isKnownLeaf(leaf))
                            return true;
                return false;
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
            createContent(content) {
                return this.route(content, lib => lib.createContent, (fn, lib) => fn.call(lib, content), null);
            }
            /**
             *
             */
            attachAtomic(atomic, branch, ref) {
                this.route(branch, lib => lib.attachAtomic, (fn, lib) => fn.call(lib, atomic, branch, ref));
                Core.CoreRecurrent.attachAtomic(branch, atomic);
            }
            /**
             *
             */
            detachAtomic(atomic, branch) {
                this.route(branch, lib => lib.detachAtomic, (fn, lib) => fn.call(lib, atomic, branch));
                Core.CoreRecurrent.detachAtomic(branch, atomic);
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
             * atomics to other branch functions.
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
    var Core;
    (function (Core) {
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
        Core.StatefulForce = StatefulForce;
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
        Core.BooleanForce = BooleanForce;
    })(Core = Reflex.Core || (Reflex.Core = {}));
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
                        Core.ContentMeta.of(ref);
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
                        Core.ContentMeta.of(child);
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
                    const atomics = rec.userCallback(fo, containingBranch, i, ...restArgs);
                    const metas = Core.CoreUtil.translateAtomics(containingBranch, this.containerMeta, atomics);
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
                            const atomics = rec.userCallback(item, containingBranch, position);
                            const metas = Core.CoreUtil.translateAtomics(containingBranch, this.containerMeta, atomics)[0];
                            metas.locator.setContainer(this.containerMeta.locator);
                            Core.RoutingLibrary.this.replaceBranch(meta.branch, metas.branch);
                        }
                    }
                });
                Core.ForceUtil.attachForce(forceArray.added, (item, position) => {
                    const atomics = rec.userCallback(item, containingBranch, position);
                    const metas = Core.CoreUtil.translateAtomics(containingBranch, this.containerMeta, atomics);
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
                    if (meta instanceof Core.BranchMeta || meta instanceof Core.ContentMeta) {
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
                        Core.ContentMeta.of(child);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmbGV4LWNvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90c2NvbnN0LnRzIiwiLi4vc291cmNlL01ldGEvTWV0YS50cyIsIi4uL3NvdXJjZS9NZXRhL0JyYW5jaE1ldGEudHMiLCIuLi9zb3VyY2UvTWV0YS9Db250ZW50TWV0YS50cyIsIi4uL3NvdXJjZS9NZXRhL1JlY3VycmVudFN0cmVhbU1ldGEudHMiLCIuLi9zb3VyY2UvTWV0YS9Qcm9taXNlU3RyZWFtTWV0YS50cyIsIi4uL3NvdXJjZS9NZXRhL0FzeW5jSXRlcmFibGVTdHJlYW1NZXRhLnRzIiwiLi4vc291cmNlLyEudHMiLCIuLi9zb3VyY2UvQXJyYXlGb3JjZS50cyIsIi4uL3NvdXJjZS9BcnJheVN0b3JlLnRzIiwiLi4vc291cmNlL0NoaWxkcmVuT2YudHMiLCIuLi9zb3VyY2UvQ29yZVJlY3VycmVudC50cyIsIi4uL3NvdXJjZS9Db3JlVXRpbC50cyIsIi4uL3NvdXJjZS9EZWZpbml0aW9ucy50cyIsIi4uL3NvdXJjZS9Gb3JjZVV0aWwudHMiLCIuLi9zb3VyY2UvR2xvYmFscy50cyIsIi4uL3NvdXJjZS9MaWJyYXJ5LnRzIiwiLi4vc291cmNlL0xvY2F0b3IudHMiLCIuLi9zb3VyY2UvTmFtZXNwYWNlT2JqZWN0LnRzIiwiLi4vc291cmNlL05vZGVBcnJheS50cyIsIi4uL3NvdXJjZS9SZWFkeVN0YXRlLnRzIiwiLi4vc291cmNlL1JlY3VycmVudC50cyIsIi4uL3NvdXJjZS9Sb3V0aW5nTGlicmFyeS50cyIsIi4uL3NvdXJjZS9TdGF0ZWZ1bEZvcmNlLnRzIiwiLi4vc291cmNlL1RyYWNrZXIudHMiLCIuLi9zb3VyY2UvTWV0YS9BcnJheVN0cmVhbU1ldGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUNDQSxJQUFVLE1BQU0sQ0FnRmY7QUFoRkQsV0FBVSxNQUFNO0lBQUMsSUFBQSxJQUFJLENBZ0ZwQjtJQWhGZ0IsV0FBQSxJQUFJO1FBRXBC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QUMsTUFBTTt3QkFDOUMsS0FBSyxDQUFDOzRCQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUFDLE1BQU07d0JBQ3BELEtBQUssQ0FBQzs0QkFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQUMsTUFBTTt3QkFDMUQsS0FBSyxDQUFDOzRCQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQUMsTUFBTTt3QkFDaEUsS0FBSyxDQUFDOzRCQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUFDLE1BQU07d0JBQ3RF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TSxTQUFTLEdBQ2QsS0FBQSxVQUFVLENBQUMsRUFBRSxDQUFNLEtBQUssQ0FBQzt3QkFDekIsS0FBQSxXQUFXLENBQUMsRUFBRSxDQUFNLEtBQUssQ0FBQyxDQUFDO29CQUU1QixJQUFJLFNBQVMsSUFBSSxTQUFTLENBQUMsR0FBRyxLQUFLLEdBQUcsRUFDdEM7d0JBQ0MsT0FBTyxHQUFHLElBQUksQ0FBQzt3QkFDZixRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO3FCQUN6Qjt5QkFDSSxJQUFJLE9BQU87d0JBQ2YsTUFBTTtpQkFDUDtnQkFFRCxPQUFPLFFBQVEsQ0FBQztZQUNqQixDQUFDO1NBQ0Q7UUF2TFksb0JBQWUsa0JBdUwzQixDQUFBO0lBR0YsQ0FBQyxFQS9MZ0IsSUFBSSxHQUFKLFdBQUksS0FBSixXQUFJLFFBK0xwQjtBQUFELENBQUMsRUEvTFMsTUFBTSxLQUFOLE1BQU0sUUErTGYiLCJzb3VyY2VzQ29udGVudCI6WyJcbmNvbnN0IGVudW0gQ29uc3Rcbntcblx0XCJcIixcblx0ZGVidWcsXG5cdG1vZGVybixcblx0bm9kZSxcblx0YnJvd3NlclxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqICovXG5cdGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBNZXRhXG5cdHtcblx0XHRjb25zdHJ1Y3RvcihyZWFkb25seSBsb2NhdG9yOiBMb2NhdG9yKSB7IH1cblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBMZWFmTWV0YSBleHRlbmRzIE1ldGFcblx0e1xuXHRcdGNvbnN0cnVjdG9yKGxvY2F0b3I/OiBMb2NhdG9yKVxuXHRcdHtcblx0XHRcdHN1cGVyKGxvY2F0b3IgfHwgbmV3IExvY2F0b3IoTG9jYXRvclR5cGUubGVhZikpO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqXG5cdCAqIFN0b3JlcyBpbmZvcm1hdGlvbiBhYm91dCBhIHJhdyBzdHJpbmcgb3IgbnVtYmVyIHRoYXRcblx0ICogd2lsbCBiZSBhcHBsaWVkIHRvIHNvbWUgYnJhbmNoLlxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIFZhbHVlTWV0YSBleHRlbmRzIExlYWZNZXRhXG5cdHtcblx0XHRjb25zdHJ1Y3RvcihyZWFkb25seSB2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgYmlnaW50KSB7IHN1cGVyKCk7IH1cblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBjbGFzcyBDbG9zdXJlTWV0YSBleHRlbmRzIExlYWZNZXRhXG5cdHtcblx0XHRjb25zdHJ1Y3RvcihyZWFkb25seSBjbG9zdXJlOiBGdW5jdGlvbilcblx0XHR7XG5cdFx0XHRzdXBlcigpO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqXG5cdCAqIFN0b3JlcyB0aGUgaW5mb3JtYXRpb24gYWJvdXQgYSBzaW5nbGUgYXR0cmlidXRlLlxuXHQgKiBBbHRob3VnaCBhdHRyaWJ1dGVzIGNhbiBjb21lIGluIGEgbGFyZ2Ugb2JqZWN0IGxpdGVyYWxcblx0ICogdGhhdCBzcGVjaWZpZXMgbWFueSBhdHRyaWJ1dGVzIHRvZ2V0aGVyLCB0aGUgYXRvbWljXG5cdCAqIHRyYW5zbGF0b3IgZnVuY3Rpb24gc3BsaXRzIHRoZW0gdXAgaW50byBzbWFsbGVyIG1ldGFzLFxuXHQgKiB3aGljaCBpcyBkb25lIGJlY2F1c2Ugc29tZSB2YWx1ZXMgbWF5IGJlIHN0YXRpYyxcblx0ICogYW5kIG90aGVycyBtYXkgYmUgYmVoaW5kIGEgZm9yY2UuXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQXR0cmlidXRlTWV0YSBleHRlbmRzIExlYWZNZXRhXG5cdHtcblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdHJlYWRvbmx5IGtleTogc3RyaW5nLFxuXHRcdFx0cmVhZG9ubHkgdmFsdWU6IGFueSlcblx0XHR7XG5cdFx0XHRzdXBlcigpO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqXG5cdCAqIFN0b3JlcyBpbmZvcm1hdGlvbiBhYm91dCBhbiBpbnN0YW5jZSBvZiBzb21lIGNsYXNzXG5cdCAqIHRoYXQgaXMga25vd24gdG8gYSBjbGllbnQgUmVmbGV4IGxpYnJhcnkuXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgSW5zdGFuY2VNZXRhIGV4dGVuZHMgTGVhZk1ldGFcblx0e1xuXHRcdGNvbnN0cnVjdG9yKHJlYWRvbmx5IHZhbHVlOiBvYmplY3QpXG5cdFx0e1xuXHRcdFx0c3VwZXIoKTtcblx0XHR9XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29udGFpbmVyTWV0YSBleHRlbmRzIE1ldGEgeyB9XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgYWJzdHJhY3QgY2xhc3MgU3RyZWFtTWV0YSBleHRlbmRzIENvbnRhaW5lck1ldGFcblx0e1xuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cmVhZG9ubHkgY29udGFpbmVyTWV0YTogQ29udGFpbmVyTWV0YSxcblx0XHRcdGxvY2F0b3I/OiBMb2NhdG9yKVxuXHRcdHtcblx0XHRcdHN1cGVyKGxvY2F0b3IgfHwgbmV3IExvY2F0b3IoTG9jYXRvclR5cGUuc3RyZWFtKSk7XG5cdFx0fVxuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQnJhbmNoTWV0YSBleHRlbmRzIENvbnRhaW5lck1ldGFcblx0e1xuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgdGhlIENvbnRlbnRNZXRhIG9iamVjdCB0aGF0IGNvcnJlc3BvbmRzXG5cdFx0ICogdG8gdGhlIHNwZWNpZmllZCBjb250ZW50IG9iamVjdC5cblx0XHQgKi9cblx0XHRzdGF0aWMgb2YoYnJhbmNoOiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLm1ldGFzLmdldChicmFuY2gpIHx8IG51bGw7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IG1ldGFzID0gbmV3IFdlYWtNYXA8SUJyYW5jaCwgQnJhbmNoTWV0YT4oKTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdGJyYW5jaDogSUJyYW5jaCxcblx0XHRcdGluaXRpYWxBdG9taWNzOiBBdG9taWNbXSxcblx0XHRcdGxvY2F0b3I/OiBMb2NhdG9yKVxuXHRcdHtcblx0XHRcdHN1cGVyKGxvY2F0b3IgfHwgbmV3IExvY2F0b3IoTG9jYXRvclR5cGUuYnJhbmNoKSk7XG5cdFx0XHR0aGlzLmJyYW5jaCA9IGJyYW5jaDtcblx0XHRcdEJyYW5jaE1ldGEubWV0YXMuc2V0KGJyYW5jaCwgdGhpcyk7XG5cdFx0XHRcblx0XHRcdGlmIChpbml0aWFsQXRvbWljcy5sZW5ndGgpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IG1ldGFzID0gQ29yZVV0aWwudHJhbnNsYXRlQXRvbWljcyhcblx0XHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdFx0dGhpcyxcblx0XHRcdFx0XHRpbml0aWFsQXRvbWljcyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRDb3JlVXRpbC5hcHBseU1ldGFzKGJyYW5jaCwgdGhpcywgbWV0YXMpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBAaW50ZXJuYWxcblx0XHQgKiBXQVJOSU5HOiBEbyBub3QgaG9sZCBvbnRvIHJlZmVyZW5jZXMgdG8gdGhpc1xuXHRcdCAqIHZhbHVlLCBvciBtZW1vcnkgbGVha3Mgd2lsbCBoYXBwZW4uXG5cdFx0ICogXG5cdFx0ICogKE5vdGU6IHRoaXMgcHJvcGVydHkgaXMgYSBiaXQgb2YgYSBjb2RlIHNtZWxsLiBUaGUgdXNhZ2VzXG5cdFx0ICogb2YgaXQgc2hvdWxkIGJlIHJlcGxhY2VkIHdpdGggY29kZSB0aGF0IHJlLWRpc2NvdmVycyB0aGVcblx0XHQgKiBicmFuY2ggb2JqZWN0Lilcblx0XHQgKi9cblx0XHRyZWFkb25seSBicmFuY2g6IElCcmFuY2g7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQW4gYXJiaXRyYXJ5IHVuaXF1ZSB2YWx1ZSB1c2VkIHRvIGlkZW50aWZ5IGFuIGluZGV4IGluIGEgZm9yY2Vcblx0XHQgKiBhcnJheSB0aGF0IHdhcyByZXNwb25zaWJsZSBmb3IgcmVuZGVyaW5nIHRoaXMgQnJhbmNoTWV0YS5cblx0XHQgKi9cblx0XHRrZXkgPSAwO1xuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKiogKi9cblx0ZXhwb3J0IGNsYXNzIENvbnRlbnRNZXRhIGV4dGVuZHMgTGVhZk1ldGFcblx0e1xuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgdGhlIENvbnRlbnRNZXRhIG9iamVjdCB0aGF0IGNvcnJlc3BvbmRzXG5cdFx0ICogdG8gdGhlIHNwZWNpZmllZCBjb250ZW50IG9iamVjdC5cblx0XHQgKi9cblx0XHRzdGF0aWMgb2YoY29udGVudDogSUNvbnRlbnQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMubWV0YXMuZ2V0KGNvbnRlbnQpIHx8IG51bGw7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IG1ldGFzID0gbmV3IFdlYWtNYXA8SUNvbnRlbnQsIENvbnRlbnRNZXRhPigpO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cmVhZG9ubHkgdmFsdWU6IElDb250ZW50LFxuXHRcdFx0bG9jYXRvcj86IExvY2F0b3IpXG5cdFx0e1xuXHRcdFx0c3VwZXIobG9jYXRvcik7XG5cdFx0XHRDb250ZW50TWV0YS5tZXRhcy5zZXQodmFsdWUsIHRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBBbiBhcmJpdHJhcnkgdW5pcXVlIHZhbHVlIHVzZWQgdG8gaWRlbnRpZnkgYW4gaW5kZXggaW4gYSBmb3JjZVxuXHRcdCAqIGFycmF5IHRoYXQgd2FzIHJlc3BvbnNpYmxlIGZvciByZW5kZXJpbmcgdGhpcyBCcmFuY2hNZXRhLlxuXHRcdCAqL1xuXHRcdGtleSA9IDA7XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBSZWN1cnJlbnRTdHJlYW1NZXRhIGV4dGVuZHMgU3RyZWFtTWV0YVxuXHR7XG5cdFx0LyoqICovXG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRyZWFkb25seSBjb250YWluZXJNZXRhOiBDb250YWluZXJNZXRhLFxuXHRcdFx0cmVhZG9ubHkgcmVjdXJyZW50OiBSZWN1cnJlbnQsXG5cdFx0XHRsb2NhdG9yPzogTG9jYXRvcilcblx0XHR7XG5cdFx0XHRzdXBlcihjb250YWluZXJNZXRhLCBsb2NhdG9yKTtcblx0XHRcdHRoaXMucmVjdXJyZW50ID0gcmVjdXJyZW50O1xuXHRcdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdFx0XHRcblx0XHRcdHRoaXMuX3N5c3RlbUNhbGxiYWNrID0gKGZ1bmN0aW9uKHRoaXM6IElCcmFuY2gsIC4uLnN5c3RlbVJlc3RBcmdzOiBhbnlbXSlcblx0XHRcdHtcblx0XHRcdFx0Ly8gVGhpcyBpcyBjaGVhdGluZyBhIGJpdC4gV2UncmUgZ2V0dGluZyB0aGUgYnJhbmNoXG5cdFx0XHRcdC8vIGZyb20gdGhlIFwidGhpc1wiIHJlZmVyZW5jZSBwYXNzZWQgdG8gZXZlbnQgY2FsbGJhY2tzLlxuXHRcdFx0XHQvLyBTb21lIGxpYnJhcmllcyAoc3VjaCBhcyB0aGUgRE9NKSBzZXQgdGhlIFwidGhpc1wiIHJlZmVyZW5jZVxuXHRcdFx0XHQvLyB0byB3aGF0IGVzc2VudGlhbGx5IGFtb3VudHMgdG8gdGhlIGJyYW5jaCB3ZSdyZSB0cnlpbmdcblx0XHRcdFx0Ly8gdG8gZ2V0LCB3aXRob3V0IGFjdHVhbGx5IHN0b3JpbmcgYSByZWZlcmVuY2UgdG8gaXQuIEhvcGVmdWxseVxuXHRcdFx0XHQvLyB0aGUgb3RoZXIgcGxhdGZvcm1zIG9uIHdoaWNoIHJlZmxleGl2ZSBsaWJyYXJpZXMgYXJlIGJ1aWx0XG5cdFx0XHRcdC8vIHdpbGwgZXhoaWJpdCAob3IgY2FuIGJlIG1hZGUgdG8gZXhpYml0KSB0aGlzIHNhbWUgYmVoYXZpb3IuXG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAodGhpcyA9PT0gbnVsbClcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJMaWJyYXJ5IG5vdCBpbXBsZW1lbnRlZCBwcm9wZXJseS5cIik7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCB3YXNNZXRhcyA9IHJlc29sdmVSZXR1cm5lZChzZWxmLnJldHVybmVkLCB0aGlzKTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICghc2VsZi5pbkF1dG9SdW5Db250ZXh0KVxuXHRcdFx0XHRcdGlmIChSb3V0aW5nTGlicmFyeS50aGlzLmlzQnJhbmNoRGlzcG9zZWQodGhpcykpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0c2VsZi5kZXRhY2hSZWN1cnJlbnRzKFxuXHRcdFx0XHRcdFx0XHR0aGlzLFxuXHRcdFx0XHRcdFx0XHRyZWN1cnJlbnQuc2VsZWN0b3IsXG5cdFx0XHRcdFx0XHRcdHNlbGYuc3lzdGVtQ2FsbGJhY2spO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRDb3JlVXRpbC51bmFwcGx5TWV0YXModGhpcywgd2FzTWV0YXMpO1xuXHRcdFx0XHRcdFx0c2VsZi5yZXR1cm5lZC5sZW5ndGggPSAwO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdC8vIFRoaXMgaXMgYSBzYWZldHkgY2hlY2ssIHdlJ3JlIGFsc28gZG9pbmcgdGhpcyBiZWxvdywgYnV0IGl0J3Ncblx0XHRcdFx0Ly8gaW1wb3J0YW50IHRvIG1ha2Ugc3VyZSB0aGlzIGdldHMgc2V0IHRvIGZhbHNlIGFzIHNvb24gYXMgcG9zc2libGUuXG5cdFx0XHRcdHNlbGYuaW5BdXRvUnVuQ29udGV4dCA9IGZhbHNlO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgZm4gPSByZWN1cnJlbnQudXNlckNhbGxiYWNrO1xuXHRcdFx0XHRjb25zdCByID0gc3lzdGVtUmVzdEFyZ3Ncblx0XHRcdFx0XHQuY29uY2F0KHRoaXMpXG5cdFx0XHRcdFx0LmNvbmNhdChyZWN1cnJlbnQudXNlclJlc3RBcmdzKTtcblx0XHRcdFx0XG5cdFx0XHRcdGxldCBwOiBhbnk7XG5cdFx0XHRcdFxuXHRcdFx0XHRzd2l0Y2ggKHIubGVuZ3RoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y2FzZSAwOiBwID0gZm4oKTsgYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAxOiBwID0gZm4oclswXSk7IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgMjogcCA9IGZuKHJbMF0sIHJbMV0pOyBicmVhaztcblx0XHRcdFx0XHRjYXNlIDM6IHAgPSBmbihyWzBdLCByWzFdLCByWzJdKTsgYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSA0OiBwID0gZm4oclswXSwgclsxXSwgclsyXSwgclszXSk7IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgNTogcCA9IGZuKHJbMF0sIHJbMV0sIHJbMl0sIHJbM10sIHJbNF0pOyBicmVhaztcblx0XHRcdFx0XHRjYXNlIDY6IHAgPSBmbihyWzBdLCByWzFdLCByWzJdLCByWzNdLCByWzRdLCByWzVdKTsgYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSA3OiBwID0gZm4oclswXSwgclsxXSwgclsyXSwgclszXSwgcls0XSwgcls1XSwgcls2XSk7IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgODogcCA9IGZuKHJbMF0sIHJbMV0sIHJbMl0sIHJbM10sIHJbNF0sIHJbNV0sIHJbNl0sIHJbN10pOyBicmVhaztcblx0XHRcdFx0XHRjYXNlIDk6IHAgPSBmbihyWzBdLCByWzFdLCByWzJdLCByWzNdLCByWzRdLCByWzVdLCByWzZdLCByWzddLCByWzhdKTsgYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAxMDogcCA9IGZuKHJbMF0sIHJbMV0sIHJbMl0sIHJbM10sIHJbNF0sIHJbNV0sIHJbNl0sIHJbN10sIHJbOF0sIHJbOV0pOyBicmVhaztcblx0XHRcdFx0XHRkZWZhdWx0OiBwID0gZm4oLi4ucik7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdC8vIFRoaXMgaXMgYSBxdWljayB0ZXN0IHRvIGF2b2lkIGRvaW5nIHBvaW50bGVzcyB3b3JrXG5cdFx0XHRcdC8vIGluIHRoZSByZWxhdGl2ZWx5IGNvbW1vbiBjYXNlIHRoYXQgdGhlIHJlY3VycmVudFxuXHRcdFx0XHQvLyBkb2Vzbid0IGhhdmUgYSByZWxldmFudCByZXR1cm4gdmFsdWUuXG5cdFx0XHRcdGlmICh3YXNNZXRhcy5sZW5ndGggPiAwIHx8IHAgIT09IHVuZGVmaW5lZCAmJiBwICE9PSBudWxsKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3Qgbm93TWV0YXMgPSBDb3JlVXRpbC50cmFuc2xhdGVBdG9taWNzKHRoaXMsIGNvbnRhaW5lck1ldGEsIHApO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChzZWxmLndoZW4pXG5cdFx0XHRcdFx0XHRzZWxmLndoZW4od2FzTWV0YXMsIG5vd01ldGFzLCB0aGlzKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRzZWxmLnJldHVybmVkLmxlbmd0aCA9IDA7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKHJlY3VycmVudC5raW5kICE9PSBSZWN1cnJlbnRLaW5kLm9uY2UpXG5cdFx0XHRcdFx0XHRzZWxmLnJldHVybmVkLnB1c2goLi4udW5yZXNvbHZlUmV0dXJuZWQobm93TWV0YXMpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0aWYgKHJlY3VycmVudC5raW5kID09PSBSZWN1cnJlbnRLaW5kLm9uY2UpXG5cdFx0XHRcdFx0Q29yZVV0aWwudW5hcHBseU1ldGFzKHRoaXMsIFtzZWxmXSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIHRoZSB3cmFwcGVkIHZlcnNpb24gb2YgdGhlIHVzZXIncyBjYWxsYmFjayB0aGF0IGdldHMgYWRkZWRcblx0XHQgKiB0byB0aGUgUmVmbGV4aXZlIGxpYnJhcnkncyB0cmVlIChzdWNoIGFzIHZpYSBhbiBhZGRFdmVudExpc3RlbmVyKCkgY2FsbCkuXG5cdFx0ICovXG5cdFx0Z2V0IHN5c3RlbUNhbGxiYWNrKCk6IFJlY3VycmVudENhbGxiYWNrXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMuX3N5c3RlbUNhbGxiYWNrID09PSBudWxsKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHRoaXMuX3N5c3RlbUNhbGxiYWNrO1xuXHRcdH1cblx0XHRwcml2YXRlIF9zeXN0ZW1DYWxsYmFjazogUmVjdXJyZW50Q2FsbGJhY2s7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQXBwbGllcyB0aGUgc3RyZWFtIG1ldGEgKGFuZCBhbnkgbWV0YXMgdGhhdCBhcmUgc3RyZWFtZWQgZnJvbSBpdFxuXHRcdCAqIGF0IGFueSBwb2ludCBpbiB0aGUgZnV0dXJlKSB0byB0aGUgc3BlY2lmaWVkIGNvbnRhaW5pbmcgYnJhbmNoLlxuXHRcdCAqIFxuXHRcdCAqIFJldHVybnMgdGhlIGlucHV0IHJlZiB2YWx1ZSwgb3IgdGhlIGxhc3Qgc3luY2hyb25vdXNseSBpbnNlcnRlZCBtZXRhLlxuXHRcdCAqL1xuXHRcdGF0dGFjaChjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoLCB0cmFja2VyOiBUcmFja2VyKVxuXHRcdHtcblx0XHRcdHRoaXMuX3N5c3RlbUNhbGxiYWNrID0gdGhpcy5fc3lzdGVtQ2FsbGJhY2suYmluZChjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgbG9jYWxUcmFja2VyID0gdHJhY2tlci5kZXJpdmUoKTtcblx0XHRcdGxvY2FsVHJhY2tlci51cGRhdGUodGhpcy5sb2NhdG9yKTtcblx0XHRcdGNvbnN0IHJlYyA9IHRoaXMucmVjdXJyZW50O1xuXHRcdFx0XG5cdFx0XHR0aGlzLndoZW4gPSAod2FzTWV0YXMsIG5vd01ldGFzKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRpZiAod2FzTWV0YXMubGVuZ3RoKVxuXHRcdFx0XHRcdENvcmVVdGlsLnVuYXBwbHlNZXRhcyhjb250YWluaW5nQnJhbmNoLCB3YXNNZXRhcyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRmb3IgKGNvbnN0IG5vd01ldGEgb2Ygbm93TWV0YXMpXG5cdFx0XHRcdFx0bm93TWV0YS5sb2NhdG9yLnNldENvbnRhaW5lcih0aGlzLmxvY2F0b3IpO1xuXHRcdFx0XHRcblx0XHRcdFx0Q29yZVV0aWwuYXBwbHlNZXRhcyhcblx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdHRoaXMsXG5cdFx0XHRcdFx0bm93TWV0YXMsXG5cdFx0XHRcdFx0bG9jYWxUcmFja2VyKTtcblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdGNvbnN0IHNlbGVjdG9yID0gQXJyYXkuaXNBcnJheShyZWMuc2VsZWN0b3IpID9cblx0XHRcdFx0cmVjLnNlbGVjdG9yIDpcblx0XHRcdFx0W3JlYy5zZWxlY3Rvcl07XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3Qgc2VsZWN0b3JJdGVtIG9mIHNlbGVjdG9yKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoc2VsZWN0b3JJdGVtIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSlcblx0XHRcdFx0XHRGb3JjZVV0aWwuYXR0YWNoRm9yY2Uoc2VsZWN0b3JJdGVtLmNoYW5nZWQsIHRoaXMuc3lzdGVtQ2FsbGJhY2spO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAoaXNGb3JjZUZ1bmN0aW9uKHNlbGVjdG9ySXRlbSkpXG5cdFx0XHRcdFx0Rm9yY2VVdGlsLmF0dGFjaEZvcmNlKHNlbGVjdG9ySXRlbSwgdGhpcy5zeXN0ZW1DYWxsYmFjayk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIHN3aXRjaCAoc2VsZWN0b3JJdGVtKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y2FzZSBtdXRhdGlvbi5hbnk6IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgbXV0YXRpb24uYnJhbmNoOiBicmVhaztcblx0XHRcdFx0XHRjYXNlIG11dGF0aW9uLmJyYW5jaEFkZDogYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSBtdXRhdGlvbi5icmFuY2hSZW1vdmU6IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgbXV0YXRpb24uY29udGVudDogYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSBtdXRhdGlvbi5jb250ZW50QWRkOiBicmVhaztcblx0XHRcdFx0XHRjYXNlIG11dGF0aW9uLmNvbnRlbnRSZW1vdmU6IGJyZWFrO1xuXHRcdFx0XHRcdGRlZmF1bHQ6IFJvdXRpbmdMaWJyYXJ5LnRoaXMuYXR0YWNoUmVjdXJyZW50KFxuXHRcdFx0XHRcdFx0cmVjLmtpbmQsXG5cdFx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdFx0c2VsZWN0b3JJdGVtLFxuXHRcdFx0XHRcdFx0dGhpcy5zeXN0ZW1DYWxsYmFjayxcblx0XHRcdFx0XHRcdHRoaXMucmVjdXJyZW50LnVzZXJSZXN0QXJncyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Y29uc3QgYXV0b3J1bkFyZ3VtZW50cyA9IGV4dHJhY3RBdXRvcnVuQXJndW1lbnRzKHJlYyk7XG5cdFx0XHRpZiAoYXV0b3J1bkFyZ3VtZW50cylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgaXRlbSA9IHNlbGVjdG9yWzBdO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKGl0ZW0gaW5zdGFuY2VvZiBTdGF0ZWZ1bEZvcmNlKVxuXHRcdFx0XHRcdHRoaXMuaW52b2tlQXV0b3J1bkNhbGxiYWNrKFtpdGVtLnZhbHVlLCBpdGVtLnZhbHVlXSwgY29udGFpbmluZ0JyYW5jaCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChpc0ZvcmNlRnVuY3Rpb24oaXRlbSkpXG5cdFx0XHRcdFx0dGhpcy5pbnZva2VBdXRvcnVuQ2FsbGJhY2soYXV0b3J1bkFyZ3VtZW50cywgY29udGFpbmluZ0JyYW5jaCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmICh0eXBlb2YgaXRlbSA9PT0gXCJzdHJpbmdcIiAmJiBpdGVtIGluIFJlZmxleC5tdXRhdGlvbilcblx0XHRcdFx0XHR0aGlzLmludm9rZUF1dG9ydW5DYWxsYmFjayhbUmVmbGV4Lm11dGF0aW9uLmFueV0sIGNvbnRhaW5pbmdCcmFuY2gpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHRoaXMuaW52b2tlQXV0b3J1bkNhbGxiYWNrKFtdLCBjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0ZGV0YWNoUmVjdXJyZW50cyhcblx0XHRcdGJyYW5jaDogSUJyYW5jaCxcblx0XHRcdHNlbGVjdG9yOiBhbnksXG5cdFx0XHRzeXN0ZW1DYWxsYmFjazogUmVjdXJyZW50Q2FsbGJhY2s8QXRvbWljcz4pXG5cdFx0e1xuXHRcdFx0Y29uc3QgbGliID0gUm91dGluZ0xpYnJhcnkudGhpcztcblx0XHRcdFxuXHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KHNlbGVjdG9yKSlcblx0XHRcdFx0bGliLmRldGFjaFJlY3VycmVudChicmFuY2gsIHNlbGVjdG9yLCBzeXN0ZW1DYWxsYmFjayk7XG5cdFx0XHRcblx0XHRcdGVsc2UgZm9yIChjb25zdCBzZWxlY3RvclBhcnQgb2Ygc2VsZWN0b3IpXG5cdFx0XHRcdGxpYi5kZXRhY2hSZWN1cnJlbnQoYnJhbmNoLCBzZWxlY3RvclBhcnQsIHN5c3RlbUNhbGxiYWNrKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQ2FsbCB0aGlzIG1ldGhvZCB0byBpbmRpcmVjdGx5IGludm9rZSB0aGUgc3lzdGVtQ2FsbGJhY2ssIGJ1dCBkb25lXG5cdFx0ICogaW4gYSB3YXkgdGhhdCBtYWtlcyBpdCBhd2FyZSB0aGF0IGl0J3MgYmVpbmcgcnVuIHZpYSB0aGUgYXV0b3J1bi5cblx0XHQgKi9cblx0XHRpbnZva2VBdXRvcnVuQ2FsbGJhY2soYXJnczogYW55W10sIHRoaXNBcmc/OiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHRyeVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmluQXV0b1J1bkNvbnRleHQgPSB0cnVlO1xuXHRcdFx0XHRcblx0XHRcdFx0dGhpc0FyZyA/XG5cdFx0XHRcdFx0dGhpcy5zeXN0ZW1DYWxsYmFjay5hcHBseSh0aGlzQXJnLCBhcmdzKSA6XG5cdFx0XHRcdFx0dGhpcy5zeXN0ZW1DYWxsYmFjayguLi5hcmdzKTtcblx0XHRcdH1cblx0XHRcdGZpbmFsbHlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5pbkF1dG9SdW5Db250ZXh0ID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgaW5BdXRvUnVuQ29udGV4dCA9IGZhbHNlO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSBjYWxsYmFjayB0aGF0IHRyaWdnZXJzIHdoZW4gdGhlIG5ldyBtZXRhcyBoYXZlIGJlZW4gcHJvY2Vzc2VkLlxuXHRcdCAqL1xuXHRcdHByaXZhdGUgd2hlbjogKCh3YXNNZXRhczogTWV0YVtdLCBub3dNZXRhczogTWV0YVtdLCBicmFuY2g6IElCcmFuY2gpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIGFuIGFycmF5IG9mIHZhbHVlcyB0aGF0IHdlcmUgcmV0dXJuZWQgZnJvbSB0aGVcblx0XHQgKiByZWN1cnJlbnQgZnVuY3Rpb24sIGluIHN0b3JhZ2l6ZWQgZm9ybS5cblx0XHQgKi9cblx0XHRwcml2YXRlIHJlYWRvbmx5IHJldHVybmVkOiAoTWV0YSB8IExvY2F0b3IpW10gPSBbXTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIFJldHVybnMgYSBuZXcgYXJyYXkgdGhhdCBpcyBhIGNvcHkgb2YgdGhlIHNwZWNpZmllZCByZXR1cm4gYXJyYXksXG5cdCAqIGV4Y2VwdCB3aXRoIHRoZSB1bnNhZmUgbWV0YXMgcmVwbGFjZWQgd2l0aCBsb2NhdG9ycy5cblx0ICovXG5cdGZ1bmN0aW9uIHVucmVzb2x2ZVJldHVybmVkKHJldHVybmVkOiBNZXRhW10pXG5cdHtcblx0XHRjb25zdCB1bnJlc29sdmVkOiAoTWV0YSB8IExvY2F0b3IpW10gPSBbXTtcblx0XHRcblx0XHRmb3IgKGNvbnN0IG1ldGEgb2YgcmV0dXJuZWQpXG5cdFx0e1xuXHRcdFx0dW5yZXNvbHZlZC5wdXNoKFxuXHRcdFx0XHRtZXRhIGluc3RhbmNlb2YgQnJhbmNoTWV0YSB8fCBtZXRhIGluc3RhbmNlb2YgQ29udGVudE1ldGEgP1xuXHRcdFx0XHRcdG1ldGEubG9jYXRvciA6XG5cdFx0XHRcdFx0bWV0YSk7XG5cdFx0fVxuXHRcdFxuXHRcdHJldHVybiB1bnJlc29sdmVkO1xuXHR9XG5cdFxuXHQvKipcblx0ICogUmV0dXJucyBhIG5ldyBhcnJheSB0aGF0IGlzIHRoZSBjb3B5IG9mIHRoZSBzcGVjaWZpZWQgcmV0dXJuIGFycmF5LFxuXHQgKiBleGNlcHQgd2l0aCBhbnkgaW5zdGFuY2VzIG9mIExvY2F0b3IgcmVwbGFjZWQgd2l0aCB0aGUgYWN0dWFsIG1ldGEuXG5cdCAqL1xuXHRmdW5jdGlvbiByZXNvbHZlUmV0dXJuZWQocmV0dXJuZWQ6IChNZXRhIHwgTG9jYXRvcilbXSwgY29udGFpbmluZ0JyYW5jaDogSUJyYW5jaClcblx0e1xuXHRcdGNvbnN0IHJlc29sdmVkOiAoTWV0YSB8IG51bGwpW10gPSBuZXcgQXJyYXkocmV0dXJuZWQubGVuZ3RoKS5maWxsKG51bGwpO1xuXHRcdGxldCBoYXNMb2NhdG9ycyA9IGZhbHNlO1xuXHRcdFxuXHRcdC8vIFByZS1wb3B1bGF0ZSB0aGUgcmVzb2x2ZWQgYXJyYXkgd2l0aCBldmVyeXRoaW5nIHRoYXQgaXMgYWxyZWFkeSBhIG1ldGEuXG5cdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCByZXR1cm5lZC5sZW5ndGg7KVxuXHRcdHtcblx0XHRcdGNvbnN0IHIgPSByZXR1cm5lZFtpXTtcblx0XHRcdGlmIChyIGluc3RhbmNlb2YgTWV0YSlcblx0XHRcdFx0cmVzb2x2ZWRbaV0gPSByO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRoYXNMb2NhdG9ycyA9IHRydWU7XG5cdFx0fVxuXHRcdFxuXHRcdC8vIEF2b2lkIGhpdHRpbmcgdGhlIGxpYnJhcnkgaWYgcG9zc2libGVcblx0XHRpZiAoIWhhc0xvY2F0b3JzKVxuXHRcdFx0cmV0dXJuIDxNZXRhW10+cmV0dXJuZWQuc2xpY2UoKTtcblx0XHRcblx0XHRjb25zdCBjaGlsZHJlbiA9IEFycmF5LmZyb20oUm91dGluZ0xpYnJhcnkudGhpcy5nZXRDaGlsZHJlbihjb250YWluaW5nQnJhbmNoKSk7XG5cdFx0XG5cdFx0Zm9yIChsZXQgcmV0SWR4ID0gLTE7ICsrcmV0SWR4IDwgcmV0dXJuZWQubGVuZ3RoOylcblx0XHR7XG5cdFx0XHRjb25zdCByZXQgPSByZXR1cm5lZFtyZXRJZHhdO1xuXHRcdFx0aWYgKHJldCBpbnN0YW5jZW9mIExvY2F0b3IpXG5cdFx0XHR7XG5cdFx0XHRcdGZvciAobGV0IGNoaWxkSWR4ID0gLTE7ICsrY2hpbGRJZHggPCBjaGlsZHJlbi5sZW5ndGg7KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgY2hpbGQgPSBjaGlsZHJlbltjaGlsZElkeF07XG5cdFx0XHRcdFx0Y29uc3QgY2hpbGRNZXRhID0gXG5cdFx0XHRcdFx0XHRCcmFuY2hNZXRhLm9mKDxhbnk+Y2hpbGQpIHx8XG5cdFx0XHRcdFx0XHRDb250ZW50TWV0YS5vZig8YW55PmNoaWxkKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoIWNoaWxkTWV0YSlcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvbnN0IGNtcCA9IHJldC5jb21wYXJlKGNoaWxkTWV0YS5sb2NhdG9yKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoY21wID09PSBDb21wYXJlUmVzdWx0LmVxdWFsKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHJlc29sdmVkW3JldElkeF0gPSBjaGlsZE1ldGE7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGVsc2UgcmVzb2x2ZWRbcmV0SWR4XSA9IHJldDtcblx0XHR9XG5cdFx0XG5cdFx0cmV0dXJuIHJlc29sdmVkLmZpbHRlcigocik6IHIgaXMgTWV0YSA9PiByICE9PSBudWxsKTtcblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIFByb21pc2VTdHJlYW1NZXRhIGV4dGVuZHMgU3RyZWFtTWV0YVxuXHR7XG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRyZWFkb25seSBjb250YWluZXJNZXRhOiBDb250YWluZXJNZXRhLFxuXHRcdFx0cmVhZG9ubHkgcHJvbWlzZTogUHJvbWlzZTxhbnk+KVxuXHRcdHtcblx0XHRcdHN1cGVyKGNvbnRhaW5lck1ldGEpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhdHRhY2goY29udGFpbmluZ0JyYW5jaDogSUJyYW5jaCwgdHJhY2tlcjogVHJhY2tlcilcblx0XHR7XG5cdFx0XHRSZWFkeVN0YXRlLmluYygpO1xuXHRcdFx0XG5cdFx0XHR0aGlzLnByb21pc2UudGhlbihyZXN1bHQgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgY29udGFpbmluZ0JyYW5jaE1ldGEgPSBCcmFuY2hNZXRhLm9mKGNvbnRhaW5pbmdCcmFuY2gpO1xuXHRcdFx0XHRpZiAoY29udGFpbmluZ0JyYW5jaE1ldGEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRDb3JlVXRpbC5hcHBseU1ldGFzKFxuXHRcdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHRcdHRoaXMuY29udGFpbmVyTWV0YSxcblx0XHRcdFx0XHRcdENvcmVVdGlsLnRyYW5zbGF0ZUF0b21pY3MoXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2hNZXRhLFxuXHRcdFx0XHRcdFx0XHRyZXN1bHQpLFxuXHRcdFx0XHRcdFx0dHJhY2tlcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdFJlYWR5U3RhdGUuZGVjKCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBBc3luY0l0ZXJhYmxlU3RyZWFtTWV0YSBleHRlbmRzIFN0cmVhbU1ldGFcblx0e1xuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cmVhZG9ubHkgY29udGFpbmVyTWV0YTogQ29udGFpbmVyTWV0YSxcblx0XHRcdHJlYWRvbmx5IGl0ZXJhdG9yOiBBc3luY0l0ZXJhYmxlPGFueT4pXG5cdFx0e1xuXHRcdFx0c3VwZXIoY29udGFpbmVyTWV0YSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgdGhlIGlucHV0IHJlZiB2YWx1ZSwgb3IgdGhlIGxhc3Qgc3luY2hyb25vdXNseSBpbnNlcnRlZCBtZXRhLlxuXHRcdCAqL1xuXHRcdGF0dGFjaChjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoLCB0cmFja2VyOiBUcmFja2VyKVxuXHRcdHtcblx0XHRcdFJlYWR5U3RhdGUuaW5jKCk7XG5cdFx0XHRcblx0XHRcdChhc3luYyAoKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBsb2NhbFRyYWNrZXIgPSB0cmFja2VyLmRlcml2ZSgpO1xuXHRcdFx0XHRsb2NhbFRyYWNrZXIudXBkYXRlKHRoaXMubG9jYXRvcik7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBicmFuY2hNZXRhID0gQnJhbmNoTWV0YS5vZihjb250YWluaW5nQnJhbmNoKSE7XG5cdFx0XHRcdFxuXHRcdFx0XHRmb3IgYXdhaXQgKGNvbnN0IGl0ZXJhYmxlUmVzdWx0IG9mIHRoaXMuaXRlcmF0b3IpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCByZXN1bHRNZXRhcyA9IENvcmVVdGlsLnRyYW5zbGF0ZUF0b21pY3MoXG5cdFx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdFx0YnJhbmNoTWV0YSxcblx0XHRcdFx0XHRcdGl0ZXJhYmxlUmVzdWx0KTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRmb3IgKGNvbnN0IHJlc3VsdE1ldGEgb2YgcmVzdWx0TWV0YXMpXG5cdFx0XHRcdFx0XHRyZXN1bHRNZXRhLmxvY2F0b3Iuc2V0Q29udGFpbmVyKHRoaXMubG9jYXRvcik7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Q29yZVV0aWwuYXBwbHlNZXRhcyhcblx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0XHR0aGlzLFxuXHRcdFx0XHRcdFx0cmVzdWx0TWV0YXMsXG5cdFx0XHRcdFx0XHRsb2NhbFRyYWNrZXIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRSZWFkeVN0YXRlLmRlYygpO1xuXHRcdFx0fSkoKTtcblx0XHR9XG5cdH1cbn1cbiIsIlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk1ldGEvTWV0YS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTWV0YS9CcmFuY2hNZXRhLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJNZXRhL0NvbnRlbnRNZXRhLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJNZXRhL1JlY3VycmVudFN0cmVhbU1ldGEudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk1ldGEvUHJvbWlzZVN0cmVhbU1ldGEudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk1ldGEvQXN5bmNJdGVyYWJsZVN0cmVhbU1ldGEudHNcIiAvPlxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0dHlwZSBTb3J0RnVuY3Rpb248VCA9IGFueT4gPSAoYTogVCwgYjogVCkgPT4gbnVtYmVyO1xuXHR0eXBlIEZpbHRlckZ1bmN0aW9uPFQgPSBhbnk+ID0gKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBib29sZWFuO1xuXHRcblx0ZXhwb3J0IGNsYXNzIEFycmF5Rm9yY2U8VD4gaW1wbGVtZW50cyBBcnJheTxUPlxuXHR7XG5cdFx0LyoqICovXG5cdFx0c3RhdGljIGNyZWF0ZTxUPihpdGVtczogVFtdKVxuXHRcdHtcblx0XHRcdGNvbnN0IHN0b3JlID0gbmV3IEFycmF5U3RvcmU8VD4oKTtcblx0XHRcdGNvbnN0IHZpZXcgPSBuZXcgQXJyYXlGb3JjZShzdG9yZSk7XG5cdFx0XHR2aWV3LnB1c2goLi4uaXRlbXMpO1xuXHRcdFx0cmV0dXJuIHZpZXcucHJveHkoKTtcblx0XHR9XG5cdFx0XG5cdFx0W246IG51bWJlcl06IFQ7XG5cdFx0XG5cdFx0cmVhZG9ubHkgYWRkZWQgPSBmb3JjZTwoaXRlbTogVCwgcG9zaXRpb246IG51bWJlcikgPT4gdm9pZD4oKTtcblx0XHRyZWFkb25seSByZW1vdmVkID0gZm9yY2U8KGl0ZW06IFQsIHBvc2l0aW9uOiBudW1iZXIsIGlkOiBudW1iZXIpID0+IHZvaWQ+KCk7XG5cdFx0cmVhZG9ubHkgbW92ZWQgPSBmb3JjZTwoZTE6IFQsIGUyOiBULCBpMTogbnVtYmVyLCBpMjogbnVtYmVyKSA9PiB2b2lkPigpO1xuXHRcdHJlYWRvbmx5IHRhaWxDaGFuZ2UgPSBmb3JjZTwoaXRlbTogVCwgcG9zaXRpb246IG51bWJlcikgPT4gdm9pZD4oKTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRyZWFkb25seSBwb3NpdGlvbnM6IG51bWJlcltdID0gW107XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVhZG9ubHkgcm9vdDogQXJyYXlTdG9yZTxUPjtcblx0XHRcblx0XHQvKiogKi9cblx0XHRjb25zdHJ1Y3Rvcihyb290OiBBcnJheVN0b3JlPFQ+IHwgQXJyYXlGb3JjZTxUPikgXG5cdFx0e1xuXHRcdFx0aWYgKHJvb3QgaW5zdGFuY2VvZiBBcnJheVN0b3JlKVxuXHRcdFx0e1x0XG5cdFx0XHRcdHRoaXMucm9vdCA9IHJvb3Q7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIFxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLnJvb3QgPSByb290LnJvb3Q7XG5cdFx0XHRcdEZvcmNlVXRpbC5hdHRhY2hGb3JjZShyb290LmFkZGVkLCAoaXRlbTogVCwgaW5kZXg6IG51bWJlcikgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuaW5zZXJ0UmVmKGluZGV4LCByb290LnBvc2l0aW9uc1tpbmRleF0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0Rm9yY2VVdGlsLmF0dGFjaEZvcmNlKHJvb3QucmVtb3ZlZCwgKGl0ZW06IFQsIGluZGV4OiBudW1iZXIsIGlkOiBudW1iZXIpID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBsb2MgPSB0aGlzLnBvc2l0aW9ucy5pbmRleE9mKGlkKTtcblx0XHRcdFx0XHRpZiAobG9jID4gLTEpIFxuXHRcdFx0XHRcdFx0dGhpcy5zcGxpY2UobG9jLCAxKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRGb3JjZVV0aWwuYXR0YWNoRm9yY2UodGhpcy5yb290LmNoYW5nZWQsICgpID0+IFxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmV4ZWN1dGVGaWx0ZXIoKTtcblx0XHRcdFx0dGhpcy5leGVjdXRlU29ydCgpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cHJpdmF0ZSBzb3J0Rm4/OiAoYTogVCwgYjogVCkgPT4gbnVtYmVyO1xuXHRcdHByaXZhdGUgZmlsdGVyRm4/OiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBBcnJheUZvcmNlPFQ+KSA9PiBib29sZWFuO1xuXG5cdFx0LyoqIFxuXHRcdCAqIEBpbnRlcm5hbFxuXHRcdCAqL1xuXHRcdGFzc2lnblNvcnRlcihzb3J0Rm46IChhOiBULCBiOiBUKSA9PiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0dGhpcy5zb3J0Rm4gPSBzb3J0Rm47XG5cdFx0XHR0aGlzLmV4ZWN1dGVTb3J0KCk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cblx0XHQvKiogXG5cdFx0ICogQGludGVybmFsXG5cdFx0ICovXG5cdFx0YXNzaWduRmlsdGVyKGZpbHRlckZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBBcnJheUZvcmNlPFQ+KSA9PiBib29sZWFuKVxuXHRcdHtcblx0XHRcdHRoaXMuZmlsdGVyRm4gPSBmaWx0ZXJGbjtcblx0XHRcdHRoaXMuZXhlY3V0ZUZpbHRlcigpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByb3RlY3RlZCBleGVjdXRlRmlsdGVyKClcblx0XHR7XG5cdFx0XHRpZiAodGhpcy5maWx0ZXJGbilcblx0XHRcdHtcblx0XHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgcG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uc1tpXTtcblx0XHRcdFx0XHRpZiAodGhpcy5maWx0ZXJGbih0aGlzLmdldFJvb3QocG9zaXRpb24pLCBpLCB0aGlzKSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBsb2MgPSB0aGlzLnBvc2l0aW9ucy5pbmRleE9mKGkpO1xuXHRcdFx0XHRcdFx0aWYgKGxvYyA+IC0xKSBcblx0XHRcdFx0XHRcdFx0dGhpcy5zcGxpY2UobG9jLCAxKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRwcm90ZWN0ZWQgZXhlY3V0ZVNvcnQoKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLnNvcnRGbilcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgYXJyYXkgPSB0aGlzLnBvc2l0aW9ucztcblx0XHRcdFx0Y29uc3QgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuXHRcdFx0XHRjb25zdCBsYXN0SXRlbSA9IGFycmF5W2xlbmd0aCAtIDFdO1xuXHRcdFx0XHRcblx0XHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCBsZW5ndGggLSAxOylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGxldCBjaGFuZ2VkID0gZmFsc2U7XG5cdFx0XHRcdFx0Zm9yIChsZXQgbiA9IC0xOyArK24gPCBsZW5ndGggLSAoaSArIDEpOylcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5zb3J0Rm4odGhpcy5nZXQobikhLCB0aGlzLmdldChuICsgMSkhKSA+IDApXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGNoYW5nZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRbYXJyYXlbbl0sIGFycmF5W24gKyAxXV0gPSBbYXJyYXlbbiArIDFdLCBhcnJheVtuXV07XG5cdFx0XHRcdFx0XHRcdHRoaXMubW92ZWQodGhpcy5nZXQobikhLCB0aGlzLmdldChuICsgMSkhLCBuLCBuICsgMSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCFjaGFuZ2VkKVxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IG5ld0xhc3RJdGVtID0gYXJyYXlbbGVuZ3RoIC0gMV07XG5cdFx0XHRcdGlmIChsYXN0SXRlbSAhPT0gbmV3TGFzdEl0ZW0pXG5cdFx0XHRcdFx0dGhpcy50YWlsQ2hhbmdlKHRoaXMuZ2V0KGxlbmd0aCAtIDEpISwgbGVuZ3RoIC0gMSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0cHJvdGVjdGVkIGZpbHRlclB1c2goLi4uaXRlbXM6IFRbXSlcblx0XHR7XG5cdFx0XHRpZiAodGhpcy5maWx0ZXJGbilcblx0XHRcdFx0cmV0dXJuIGl0ZW1zXG5cdFx0XHRcdFx0LmZpbHRlcigodmFsdWUsIGluZGV4KSA9PiB0aGlzLmZpbHRlckZuISh2YWx1ZSwgaW5kZXgsIHRoaXMpKVxuXHRcdFx0XHRcdC5tYXAoeCA9PiB0aGlzLnJvb3QucHVzaCh4KSk7XG5cblx0XHRcdHJldHVybiBpdGVtcy5tYXAoeCA9PiB0aGlzLnJvb3QucHVzaCh4KSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIERlZmluZXMgZ2V0dGVyIGFuZCBzZXR0ZXIgZm9yIGluZGV4IG51bWJlciBwcm9wZXJ0aWVzIGV4LiBhcnJbNV1cblx0XHQgKi9cblx0XHRwcml2YXRlIGRlZmluZUluZGV4KGluZGV4OiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0aWYgKCFcIk5PUFJPWFlcIilcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XG5cdFx0XHRpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCBpbmRleCkpXG5cdFx0XHR7XHRcblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIGluZGV4LCB7XG5cdFx0XHRcdFx0Z2V0KClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5nZXQoaW5kZXgpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0c2V0KHZhbHVlOiBhbnkpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuc2V0KGluZGV4LCB2YWx1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvKiogXG5cdFx0ICogQGludGVybmFsXG5cdFx0ICogSW5zZXJ0cyBwb3NpdGlvbnMgZnJvbSBwYXJhbWV0ZXJzIGludG8gcG9zaXRpb25zIGFycmF5IG9mIHRoaXNcblx0XHQgKiBBbGwgcG9zaXRpb25zIGFyZSBmaWx0ZXJlZCBpZiB0aGVyZSBpcyBhIGZpbHRlciBmdW5jdGlvbiBhc3NpZ25lZCB0byB0aGlzXG5cdFx0ICogVHJpZ2dlcnMgdGhlIGFkZGVkIEZvcmNlXG5cdFx0ICogRGVmaW5lcyBpbmRleCBmb3IgcHJvY2Vzc2VkIGxvY2F0aW9uc1xuXHRcdCAqL1xuXHRcdHByb3RlY3RlZCBpbnNlcnRSZWYoc3RhcnQ6IG51bWJlciwgLi4ucG9zaXRpb25zOiBudW1iZXJbXSlcblx0XHR7XG5cdFx0XHRjb25zdCBmaWx0ZXJlZCA9IHRoaXMuZmlsdGVyRm4gP1xuXHRcdFx0XHRwb3NpdGlvbnMuZmlsdGVyKCh2YWx1ZSwgaW5kZXgpID0+IFxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyRm4hKHRoaXMuZ2V0Um9vdCh2YWx1ZSksIGluZGV4LCB0aGlzKSkgOlxuXHRcdFx0XHRwb3NpdGlvbnM7XG5cdFx0XHRcblx0XHRcdHRoaXMucG9zaXRpb25zLnNwbGljZShzdGFydCwgMCwgLi4uZmlsdGVyZWQpO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGZpbHRlcmVkLmxlbmd0aDspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGl0ZW0gPSBmaWx0ZXJlZFtpXTtcblx0XHRcdFx0Y29uc3QgbG9jID0gc3RhcnQgKyBpO1xuXHRcdFx0XHR0aGlzLmFkZGVkKHRoaXMuZ2V0Um9vdChpdGVtKSwgbG9jKTtcblx0XHRcdFx0dGhpcy5kZWZpbmVJbmRleChsb2MpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHR0aGlzLmV4ZWN1dGVTb3J0KCk7IFxuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgbGVuZ3RoKCkgXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucG9zaXRpb25zLmxlbmd0aDtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRzZXQgbGVuZ3RoKGk6IG51bWJlcilcblx0XHR7XG5cdFx0XHR0aGlzLnNwbGljZShpLCB0aGlzLnBvc2l0aW9ucy5sZW5ndGggLSBpKTtcblx0XHRcdHRoaXMucG9zaXRpb25zLmxlbmd0aCA9IGk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiBcblx0XHQgKiBAaW50ZXJuYWxcblx0XHQgKi9cblx0XHRwcm94eSgpXG5cdFx0e1xuXHRcdFx0aWYgKFwiTk9QUk9YWVwiKSBcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHRcblx0XHRcdGlmICghdGhpcy5fcHJveHkpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3Byb3h5ID0gbmV3IFByb3h5KHRoaXMsIHtcblx0XHRcdFx0XHRnZXQodGFyZ2V0LCBwcm9wOiBFeHRyYWN0PGtleW9mIEFycmF5Rm9yY2U8VD4sIHN0cmluZz4pXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y29uc3QgaW5kZXggPSBwYXJzZUludChwcm9wLCAxMCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gaW5kZXggIT09IGluZGV4ID8gdGFyZ2V0W3Byb3BdIDogdGFyZ2V0LmdldChpbmRleCk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRzZXQodGFyZ2V0LCBwcm9wOiBFeHRyYWN0PGtleW9mIEFycmF5Rm9yY2U8VD4sIHN0cmluZz4sIHZhbHVlOiBUKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGNvbnN0IGluZGV4ID0gcGFyc2VJbnQocHJvcCwgMTApO1xuXHRcdFx0XHRcdFx0aWYgKGluZGV4ICE9PSBpbmRleClcblx0XHRcdFx0XHRcdFx0dGFyZ2V0LnNldChpbmRleCwgdmFsdWUpO1xuXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSkgYXMgQXJyYXlGb3JjZTxUPjtcblx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gdGhpcy5fcHJveHk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgX3Byb3h5PzogQXJyYXlGb3JjZTxUPjtcblxuXHRcdC8qKiAqL1xuXHRcdGdldChpbmRleDogbnVtYmVyKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmdldFJvb3QodGhpcy5wb3NpdGlvbnNbaW5kZXhdKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBnZXRSb290KGluZGV4OiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucm9vdC5nZXQoaW5kZXgpITtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRzZXQoaW5kZXg6IG51bWJlciwgdmFsdWU6IFQpXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMuZmlsdGVyRm4pXG5cdFx0XHRcdGlmICghdGhpcy5maWx0ZXJGbih2YWx1ZSwgaW5kZXgsIHRoaXMpKVxuXHRcdFx0XHRcdHRoaXMucG9zaXRpb25zLnNwbGljZShpbmRleCwgMSk7XG5cdFx0XHRcdFx0XG5cdFx0XHR0aGlzLnJvb3Quc2V0KHRoaXMucG9zaXRpb25zW2luZGV4XSwgdmFsdWUpO1xuXHRcdH1cblxuXHRcdC8qKiBcblx0XHQgKiBSZXR1cm5zIHNuYXBzaG90IG9mIHRoaXMgYXMgYSBqcyBhcnJheSBcblx0XHQgKi9cblx0XHRzbmFwc2hvdCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucG9zaXRpb25zLm1hcCh4ID0+IHRoaXMuZ2V0Um9vdCh4KSk7XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0dG9TdHJpbmcoKTogc3RyaW5nXG5cdFx0e1xuXHRcdFx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KHRoaXMuc25hcHNob3QoKSk7XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0dG9Mb2NhbGVTdHJpbmcoKTogc3RyaW5nXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMudG9TdHJpbmcoKTtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRjb25jYXQoLi4uaXRlbXM6IENvbmNhdEFycmF5PFQ+W10pOiBUW107XG5cdFx0Y29uY2F0KC4uLml0ZW1zOiAoVCB8IENvbmNhdEFycmF5PFQ+KVtdKTogVFtdO1xuXHRcdGNvbmNhdCguLi5pdGVtczogYW55W10pXG5cdFx0e1xuXHRcdFx0Y29uc3QgYXJyYXkgPSBBcnJheUZvcmNlLmNyZWF0ZTxUPih0aGlzLnNuYXBzaG90KCkgYXMgVFtdKTtcblx0XHRcdGFycmF5LnB1c2goLi4uaXRlbXMpO1xuXHRcdFx0cmV0dXJuIGFycmF5LnByb3h5KCk7XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0am9pbihzZXBhcmF0b3I/OiBzdHJpbmcgfCB1bmRlZmluZWQpOiBzdHJpbmdcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5zbmFwc2hvdCgpLmpvaW4oc2VwYXJhdG9yKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmV2ZXJzZSgpXG5cdFx0e1xuXHRcdFx0dGhpcy5wb3NpdGlvbnMucmV2ZXJzZSgpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHNsaWNlKHN0YXJ0PzogbnVtYmVyIHwgdW5kZWZpbmVkLCBlbmQ/OiBudW1iZXIgfCB1bmRlZmluZWQpOiBUW11cblx0XHR7XG5cdFx0XHRjb25zdCBhcnJheSA9IG5ldyBBcnJheUZvcmNlKHRoaXMucm9vdCk7XG5cdFx0XHRhcnJheS5pbnNlcnRSZWYoMCwgLi4udGhpcy5wb3NpdGlvbnMuc2xpY2Uoc3RhcnQsIGVuZCkpO1xuXHRcdFx0cmV0dXJuIGFycmF5LnByb3h5KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHNvcnQoY29tcGFyZUZuOiBTb3J0RnVuY3Rpb248VD4sIC4uLmZvcmNlczogQXJyYXk8U3RhdGVsZXNzRm9yY2UgfCBTdGF0ZWZ1bEZvcmNlPik6IHRoaXNcblx0XHR7XG5cdFx0XHRjb25zdCBhcnJheSA9IG5ldyBBcnJheUZvcmNlKHRoaXMpO1xuXHRcdFx0YXJyYXkuc29ydEZuID0gY29tcGFyZUZuO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGZvIG9mIGZvcmNlcylcblx0XHRcdFx0Rm9yY2VVdGlsLmF0dGFjaEZvcmNlKFxuXHRcdFx0XHRcdGZvIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSA/XG5cdFx0XHRcdFx0XHRmby5jaGFuZ2VkIDogZm8sIGFycmF5LmV4ZWN1dGVTb3J0XG5cdFx0XHRcdCk7XG5cdFx0XHRcdFxuXHRcdFx0YXJyYXkuaW5zZXJ0UmVmKDAsIC4uLnRoaXMucG9zaXRpb25zKTtcblx0XHRcdHJldHVybiBhcnJheS5wcm94eSgpIGFzIHRoaXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGluZGV4T2Yoc2VhcmNoRWxlbWVudDogVCwgZnJvbUluZGV4ID0gMCk6IG51bWJlclxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSBmcm9tSW5kZXggLSAxOyArK2kgPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7KVxuXHRcdFx0XHRpZiAodGhpcy5nZXQoaSkgPT09IHNlYXJjaEVsZW1lbnQpIFxuXHRcdFx0XHRcdHJldHVybiBpO1xuXHRcdFx0XHRcdFxuXHRcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRsYXN0SW5kZXhPZihzZWFyY2hFbGVtZW50OiBULCBmcm9tSW5kZXg/OiBudW1iZXIgfCB1bmRlZmluZWQpOiBudW1iZXJcblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gZnJvbUluZGV4IHx8IHRoaXMucG9zaXRpb25zLmxlbmd0aDsgLS1pID4gLTE7KVxuXHRcdFx0XHRpZiAodGhpcy5nZXQoaSkgPT09IHNlYXJjaEVsZW1lbnQpIFxuXHRcdFx0XHRcdHJldHVybiBpO1xuXHRcdFx0XHRcdFxuXHRcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRldmVyeShjYWxsYmFja0ZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IHVua25vd24sIHRoaXNBcmc/OiBhbnkpOiBib29sZWFuXG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7KVxuXHRcdFx0XHRpZiAoIWNhbGxiYWNrRm4uY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHRoaXMuZ2V0KGkpLCBpLCB0aGlzKSkgXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHNvbWUoY2FsbGJhY2tGbjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiB1bmtub3duLCB0aGlzQXJnPzogYW55KTogYm9vbGVhblxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0aWYgKGNhbGxiYWNrRm4uY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHRoaXMuZ2V0KGkpISwgaSwgdGhpcykpIFxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRmb3JFYWNoKGNhbGxiYWNrRm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdm9pZCwgdGhpc0FyZz86IGFueSk6IHZvaWRcblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IHRoaXMucG9zaXRpb25zLmxlbmd0aDspXG5cdFx0XHRcdGNhbGxiYWNrRm4uY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHRoaXMuZ2V0KGkpLCBpLCB0aGlzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bWFwPFU+KGNhbGxiYWNrRm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSwgdGhpc0FyZz86IGFueSk6IFVbXVxuXHRcdHtcblx0XHRcdHJldHVybiBBcnJheUZvcmNlLmNyZWF0ZShcblx0XHRcdFx0dGhpcy5wb3NpdGlvbnNcblx0XHRcdFx0XHQubWFwKHggPT4gdGhpcy5nZXRSb290KHgpKVxuXHRcdFx0XHRcdC5tYXAoKHZhbHVlLCBpbmRleCkgPT4gY2FsbGJhY2tGbi5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdmFsdWUsIGluZGV4LCB0aGlzKSlcblx0XHRcdCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZpbHRlcjxTIGV4dGVuZHMgVD4oY2FsbGJhY2tGbjogRmlsdGVyRnVuY3Rpb248VD4sIC4uLmZvcmNlOiBBcnJheTxTdGF0ZWZ1bEZvcmNlIHwgU3RhdGVsZXNzRm9yY2U+KTogQXJyYXlGb3JjZTxTPjtcblx0XHRmaWx0ZXIoY2FsbGJhY2tGbjogRmlsdGVyRnVuY3Rpb248VD4sIC4uLmZvcmNlOiBBcnJheTxTdGF0ZWZ1bEZvcmNlIHwgU3RhdGVsZXNzRm9yY2U+KTogQXJyYXlGb3JjZTxUPjtcblx0XHRmaWx0ZXIoY2FsbGJhY2tGbjogRmlsdGVyRnVuY3Rpb248VD4sIC4uLmZvcmNlczogQXJyYXk8U3RhdGVmdWxGb3JjZSB8IFN0YXRlbGVzc0ZvcmNlPilcblx0XHR7XG5cdFx0XHRjb25zdCBhcnJheSA9IG5ldyBBcnJheUZvcmNlKHRoaXMpO1xuXHRcdFx0YXJyYXkuZmlsdGVyRm4gPSBjYWxsYmFja0ZuO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGZvIG9mIGZvcmNlcylcblx0XHRcdHtcblx0XHRcdFx0Rm9yY2VVdGlsLmF0dGFjaEZvcmNlKGZvIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSA/IGZvLmNoYW5nZWQgOiBmbywgKCkgPT4gXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRhcnJheS5leGVjdXRlRmlsdGVyKCk7XG5cdFx0XHRcdFx0dGhpcy5wb3NpdGlvbnMuZm9yRWFjaCgoeCwgaSkgPT4gXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0aWYgKGFycmF5LmZpbHRlckZuISh0aGlzLmdldFJvb3QoeCksIGksIHRoaXMpICYmICFhcnJheS5wb3NpdGlvbnMuaW5jbHVkZXMoeCkpIFxuXHRcdFx0XHRcdFx0XHRhcnJheS5pbnNlcnRSZWYoaSwgeCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRhcnJheS5pbnNlcnRSZWYoMCwgLi4udGhpcy5wb3NpdGlvbnMpO1xuXHRcdFx0cmV0dXJuIGFycmF5LnByb3h5KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlZHVjZShjYWxsYmFja0ZuOiAocHJldmlvdXNWYWx1ZTogVCwgY3VycmVudFZhbHVlOiBULCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVCk6IFQ7XG5cdFx0cmVkdWNlKGNhbGxiYWNrRm46IChwcmV2aW91c1ZhbHVlOiBULCBjdXJyZW50VmFsdWU6IFQsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBULCBpbml0aWFsVmFsdWU6IFQpOiBUO1xuXHRcdHJlZHVjZTxVPihjYWxsYmFja0ZuOiAocHJldmlvdXNWYWx1ZTogVSwgY3VycmVudFZhbHVlOiBULCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSwgaW5pdGlhbFZhbHVlOiBVKTogVTtcblx0XHRyZWR1Y2UoY2FsbGJhY2tGbjogYW55LCBpbml0aWFsVmFsdWU/OiBhbnkpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucG9zaXRpb25zXG5cdFx0XHRcdC5yZWR1Y2UoKHByZXYsIGN1cnIsIGNpKSA9PiBjYWxsYmFja0ZuKHByZXYsIHRoaXMuZ2V0KGN1cnIpLCBjaSwgdGhpcyksIGluaXRpYWxWYWx1ZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlZHVjZVJpZ2h0KGNhbGxiYWNrRm46IChwcmV2aW91c1ZhbHVlOiBULCBjdXJyZW50VmFsdWU6IFQsIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBUKTogVDtcblx0XHRyZWR1Y2VSaWdodChjYWxsYmFja0ZuOiAocHJldmlvdXNWYWx1ZTogVCwgY3VycmVudFZhbHVlOiBULCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVCwgaW5pdGlhbFZhbHVlOiBUKTogVDtcblx0XHRyZWR1Y2VSaWdodDxVPihjYWxsYmFja0ZuOiAocHJldmlvdXNWYWx1ZTogVSwgY3VycmVudFZhbHVlOiBULCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVSwgaW5pdGlhbFZhbHVlOiBVKTogVTtcblx0XHRyZWR1Y2VSaWdodChjYWxsYmFja0ZuOiBhbnksIGluaXRpYWxWYWx1ZT86IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wb3NpdGlvbnNcblx0XHRcdFx0LnJlZHVjZVJpZ2h0KChwcmV2LCBjdXJyLCBjaSkgPT4gY2FsbGJhY2tGbihwcmV2LCB0aGlzLmdldChjdXJyKSwgY2ksIHRoaXMpLCBpbml0aWFsVmFsdWUpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRmaW5kPFMgZXh0ZW5kcyBUPihwcmVkaWNhdGU6ICh0aGlzOiB2b2lkLCB2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgb2JqOiBUW10pID0+IHZhbHVlIGlzIFMsIHRoaXNBcmc/OiBhbnkpOiBTIHwgdW5kZWZpbmVkO1xuXHRcdGZpbmQocHJlZGljYXRlOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIG9iajogVFtdKSA9PiB1bmtub3duLCB0aGlzQXJnPzogYW55KTogVCB8IHVuZGVmaW5lZDtcblx0XHRmaW5kKHByZWRpY2F0ZTogYW55LCB0aGlzQXJnPzogYW55KVxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0aWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdGhpcy5nZXQoaSkhLCBpLCB0aGlzKSkgXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0KGkpITtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZmluZEluZGV4KHByZWRpY2F0ZTogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBvYmo6IFRbXSkgPT4gdW5rbm93biwgdGhpc0FyZz86IGFueSk6IG51bWJlclxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0aWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdGhpcy5nZXQoaSkhLCBpLCB0aGlzKSkgXG5cdFx0XHRcdFx0cmV0dXJuIGk7XG5cdFx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gLTE7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZpbGwodmFsdWU6IFQsIHN0YXJ0PzogbnVtYmVyIHwgdW5kZWZpbmVkLCBlbmQ/OiBudW1iZXIgfCB1bmRlZmluZWQpOiB0aGlzXG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IChzdGFydCB8fCAwKSAtIDE7ICsraSA8IChlbmQgfHwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoKTspXG5cdFx0XHRcdHRoaXMuc2V0KGksIHZhbHVlKTtcblx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y29weVdpdGhpbih0YXJnZXQ6IG51bWJlciwgc3RhcnQ6IG51bWJlciwgZW5kPzogbnVtYmVyIHwgdW5kZWZpbmVkKTogdGhpc1xuXHRcdHtcblx0XHRcdHRoaXMucG9zaXRpb25zLmNvcHlXaXRoaW4odGFyZ2V0LCBzdGFydCwgZW5kKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHQqW1N5bWJvbC5pdGVyYXRvcl0oKTogSXRlcmFibGVJdGVyYXRvcjxUPlxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0eWllbGQgdGhpcy5nZXQoaSkhO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHQqZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRdPlxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0eWllbGQgW2ksIHRoaXMuZ2V0KGkpIV07XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdCprZXlzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8bnVtYmVyPlxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0eWllbGQgaTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0KnZhbHVlcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFQ+XG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7KVxuXHRcdFx0XHR5aWVsZCB0aGlzLmdldChpKSE7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdFtTeW1ib2wudW5zY29wYWJsZXNdKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wb3NpdGlvbnNbU3ltYm9sLnVuc2NvcGFibGVzXSgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRpbmNsdWRlcyhzZWFyY2hFbGVtZW50OiBULCBmcm9tSW5kZXg6IG51bWJlciA9IDApOiBib29sZWFuXG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IGZyb21JbmRleCAtIDE7ICsraSA8IHRoaXMucG9zaXRpb25zLmxlbmd0aDspXG5cdFx0XHRcdGlmICh0aGlzLmdldChpKSA9PT0gc2VhcmNoRWxlbWVudCkgXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZsYXRNYXA8VSwgVGhpcyA9IHVuZGVmaW5lZD4oXG5cdFx0XHRjYWxsYmFjazogKHRoaXM6IFRoaXMsIHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVIHwgcmVhZG9ubHkgVVtdLCBcblx0XHRcdHRoaXNBcmc/OiBUaGlzIHwgdW5kZWZpbmVkKTogVVtdXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuc25hcHNob3QoKS5mbGF0TWFwKGNhbGxiYWNrLCB0aGlzQXJnKTsgXG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW11bXVtdW11bXVtdW10sIGRlcHRoOiA3KTogVVtdO1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW11bXVtdW11bXVtdLCBkZXB0aDogNik6IFVbXTtcblx0XHRmbGF0PFU+KHRoaXM6IFVbXVtdW11bXVtdW10sIGRlcHRoOiA1KTogVVtdO1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW11bXVtdW10sIGRlcHRoOiA0KTogVVtdO1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW11bXVtdLCBkZXB0aDogMyk6IFVbXTtcblx0XHRmbGF0PFU+KHRoaXM6IFVbXVtdW10sIGRlcHRoOiAyKTogVVtdO1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW10sIGRlcHRoPzogMSB8IHVuZGVmaW5lZCk6IFVbXTtcblx0XHRmbGF0PFU+KHRoaXM6IFVbXSwgZGVwdGg6IDApOiBVW107XG5cdFx0ZmxhdDxVPihkZXB0aD86IG51bWJlciB8IHVuZGVmaW5lZCk6IGFueVtdO1xuXHRcdGZsYXQoZGVwdGg/OiBhbnkpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuc25hcHNob3QoKS5mbGF0KGRlcHRoKTtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRwdXNoKC4uLml0ZW1zOiBUW10pXG5cdFx0e1xuXHRcdFx0dGhpcy5pbnNlcnRSZWYodGhpcy5sZW5ndGgsIC4uLnRoaXMuZmlsdGVyUHVzaCguLi5pdGVtcykpO1xuXHRcdFx0cmV0dXJuIHRoaXMucG9zaXRpb25zLmxlbmd0aDtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRwb3AoKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLnBvc2l0aW9ucy5sZW5ndGggPCAxKSBcblx0XHRcdFx0cmV0dXJuIHZvaWQgMDtcblx0XHRcdFx0XG5cdFx0XHRjb25zdCBwb3MgPSB0aGlzLnBvc2l0aW9ucy5wb3AoKSE7XG5cdFx0XHRjb25zdCBpdGVtID0gdGhpcy5nZXRSb290KHBvcyk7XG5cdFx0XHR0aGlzLnJlbW92ZWQoaXRlbSEsIHRoaXMucG9zaXRpb25zLmxlbmd0aCwgcG9zKTtcblx0XHRcdHRoaXMucm9vdC5kZWxldGUocG9zKTtcblx0XHRcdHJldHVybiBpdGVtO1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdHVuc2hpZnQoLi4uaXRlbXM6IFRbXSlcblx0XHR7XG5cdFx0XHR0aGlzLmluc2VydFJlZigwLCAuLi50aGlzLmZpbHRlclB1c2goLi4uaXRlbXMpKTtcblx0XHRcdHJldHVybiB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0c2hpZnQoKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLnBvc2l0aW9ucy5sZW5ndGggPCAxKSBcblx0XHRcdFx0cmV0dXJuIHZvaWQgMDtcblx0XHRcdFx0XG5cdFx0XHRjb25zdCBwb3MgPSB0aGlzLnBvc2l0aW9ucy5zaGlmdCgpITtcblx0XHRcdGNvbnN0IGl0ZW0gPSB0aGlzLmdldFJvb3QocG9zKTtcblx0XHRcdHRoaXMucmVtb3ZlZChpdGVtISwgMCwgcG9zKTtcblx0XHRcdHRoaXMucm9vdC5kZWxldGUocG9zKTtcblx0XHRcdHJldHVybiBpdGVtO1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdHNwbGljZShzdGFydDogbnVtYmVyLCBkZWxldGVDb3VudDogbnVtYmVyLCAuLi5pdGVtczogVFtdKVxuXHRcdHtcblx0XHRcdGNvbnN0IHBvc2l0aW9ucyA9IHRoaXMucG9zaXRpb25zLnNwbGljZShzdGFydCwgZGVsZXRlQ291bnQpO1xuXHRcdFx0cG9zaXRpb25zLmZvckVhY2goKHgsIGkpID0+IHRoaXMucmVtb3ZlZCh0aGlzLmdldFJvb3QoeCksIHN0YXJ0ICsgaSwgeCkpO1xuXHRcdFx0dGhpcy5pbnNlcnRSZWYoc3RhcnQsIC4uLnRoaXMuZmlsdGVyUHVzaCguLi5pdGVtcykpO1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gcG9zaXRpb25zLm1hcCh4ID0+IHRoaXMuZ2V0Um9vdCh4KSk7XG5cdFx0XHRwb3NpdGlvbnMuZm9yRWFjaCh4ID0+IHRoaXMucm9vdC5kZWxldGUoeCkpO1xuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdGV4cG9ydCBjbGFzcyBBcnJheVN0b3JlPFQ+XG5cdHtcblx0XHRyb290OiBSZWNvcmQ8bnVtYmVyLCB7XG5cdFx0XHR2YWx1ZTogVCB8IHVuZGVmaW5lZDtcblx0XHRcdHJlZjogbnVtYmVyO1xuXHRcdH0+ID0ge307XG5cdFx0bmV4dCA9IDA7XG5cdFx0XG5cdFx0Y2hhbmdlZCA9IGZvcmNlPChpdGVtOiBULCBpbmRleDogbnVtYmVyKSA9PiB2b2lkPigpO1xuXG5cdFx0LyoqICovXG5cdFx0Z2V0KGluZGV4OiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0Y29uc3QgaXRlbSA9IHRoaXMucm9vdFtpbmRleF07XG5cdFx0XHRyZXR1cm4gaXRlbSAmJiBpdGVtLnZhbHVlO1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdHNldChpbmRleDogbnVtYmVyLCB2YWx1ZTogVClcblx0XHR7XG5cdFx0XHRpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLnJvb3QsIGluZGV4KSkgXG5cdFx0XHRcdHRoaXMucm9vdFtpbmRleF0gPSB7IHZhbHVlOiB1bmRlZmluZWQsIHJlZjogMSB9O1xuXHRcdFx0ZWxzZSBcblx0XHRcdFx0dGhpcy5jaGFuZ2VkKHZhbHVlLCBpbmRleCk7XG5cdFx0XHR0aGlzLnJvb3RbaW5kZXhdLnZhbHVlID0gdmFsdWU7XG5cdFx0XHRyZXR1cm4gaW5kZXg7XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0cHVzaCh2YWx1ZTogVClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5zZXQodGhpcy5uZXh0KyssIHZhbHVlKTtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRtYXJrKGluZGV4OiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0dGhpcy5yb290W2luZGV4XS5yZWYrKztcblx0XHRcdHJldHVybiBpbmRleDtcblx0XHR9XG5cblx0XHQvKiogKi9cblx0XHRkZWxldGUoaW5kZXg6IG51bWJlcilcblx0XHR7XG5cdFx0XHRpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMucm9vdCwgaW5kZXgpKSBcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgaXRlbSA9IHRoaXMucm9vdFtpbmRleF07XG5cdFx0XHRcdGlmIChpdGVtLnJlZiA+IDEpIFxuXHRcdFx0XHRcdGl0ZW0ucmVmLS07XG5cdFx0XHRcdGlmIChpdGVtLnJlZiA9PT0gMCkgXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpdGVtLnZhbHVlID0gdW5kZWZpbmVkO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKiogXG5cdCAqIFdBUk5JTkc6IFRoaXMgbWV0aG9kIGhhcyBwb3RlbnRpYWwgbWVtb3J5IGlzc3Vlc1xuXHQgKiBhbmQgaXMgbm90IGludGVuZGVkIGZvciBsb25nLXJ1bm5pbmcgcHJvY2Vzc2VzIChpLmUuIGluXG5cdCAqIHRoZSBicm93c2VyKS4gSW4gb3JkZXIgdG8gdXNlIGl0IGZyb20gdGhlIGJyb3dzZXIsIHRoZVxuXHQgKiBjaGlsZHJlbk9mLmVuYWJsZWQgdmFsdWUgbXVzdCBiZSBzZXQgdG8gdHJ1ZS4gSW4gTm9kZS5qcyxcblx0ICogdGhpcyB2YWx1ZSBkZWZhdWx0cyB0byB0cnVlLiBJbiB0aGUgYnJvd3NlciwgaXQgZGVmYXVsdHMgdG9cblx0ICogZmFsc2U7XG5cdCAqIFxuXHQgKiBAcmV0dXJucyBBbiBhcnJheSBjb250YWluaW5nIHRoZSBNZXRhIG9iamVjdHMgdGhhdCBcblx0ICogYXJlIGxvZ2ljYWwgY2hpbGRyZW4gb2YgdGhlIHNwZWNpZmllZCBicmFuY2guXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gY2hpbGRyZW5PZihicmFuY2g6IElCcmFuY2gpXG5cdHtcblx0XHRyZXR1cm4gY2hpbGRNZXRhcy5nZXQoYnJhbmNoKSB8fCBbXTtcblx0fVxuXHRcblx0ZXhwb3J0IG5hbWVzcGFjZSBjaGlsZHJlbk9mXG5cdHtcblx0XHRleHBvcnQgbGV0IGVuYWJsZWQgPSB0eXBlb2YgX19kaXJuYW1lID09PSBcInN0cmluZ1wiO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEBpbnRlcm5hbFxuXHRcdCAqIFBvcHVsYXRlcyB0aGUgaW50ZXJuYWwgd2VhayBtYXAgdGhhdCBhbGxvd3Ncblx0XHQgKiBicmFuY2hlcyB0byBzdG9yZSB0aGVpciBjaGlsZCBtZXRhIG9iamVjdHMuIFxuXHRcdCAqIERvIG5vdCBjYWxsIGZyb20gYXBwbGljYXRpb24gY29kZS5cblx0XHQgKi9cblx0XHRleHBvcnQgZnVuY3Rpb24gc3RvcmUoYnJhbmNoOiBJQnJhbmNoLCBtZXRhOiBNZXRhKVxuXHRcdHtcblx0XHRcdGNvbnN0IGV4aXN0aW5nID0gY2hpbGRNZXRhcy5nZXQoYnJhbmNoKTtcblx0XHRcdGlmIChleGlzdGluZylcblx0XHRcdHtcblx0XHRcdFx0aWYgKCFleGlzdGluZy5pbmNsdWRlcyhtZXRhKSlcblx0XHRcdFx0XHRleGlzdGluZy5wdXNoKG1ldGEpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBjaGlsZE1ldGFzLnNldChicmFuY2gsIFttZXRhXSk7XG5cdFx0fVxuXHR9XG5cdFxuXHQvKiogKi9cblx0Y29uc3QgY2hpbGRNZXRhcyA9IG5ldyBXZWFrTWFwPElCcmFuY2gsIE1ldGFbXT4oKTtcbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBAaW50ZXJuYWxcblx0ICogSGFuZGxlcyB0aGUgcnVubmluZyBvZiByZWN1cnJlbnQgZnVuY3Rpb25zIHRoYXQgYXJlIGJ1aWx0IGludG9cblx0ICogdGhlIFJlZmxleCBDb3JlLlxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIENvcmVSZWN1cnJlbnRcblx0e1xuXHRcdC8qKiAqL1xuXHRcdHN0YXRpYyByZWFkb25seSBzZWxlY3RvcnMgPSBPYmplY3QuZnJlZXplKFtcblx0XHRcdFwicmVmbGV4OmF0dGFjaC1hdG9taWNcIixcblx0XHRcdFwicmVmbGV4OmRldGFjaC1hdG9taWNcIlxuXHRcdF0gYXMgY29uc3QpO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdHN0YXRpYyBhdHRhY2hBdG9taWMoYnJhbmNoOiBJQnJhbmNoLCBhdG9taWM6IGFueSlcblx0XHR7XG5cdFx0XHR0aGlzLnJ1bihcInJlZmxleDphdHRhY2gtYXRvbWljXCIsIGJyYW5jaCwgW2F0b21pYywgYnJhbmNoXSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdHN0YXRpYyBkZXRhY2hBdG9taWMoYnJhbmNoOiBJQnJhbmNoLCBhdG9taWM6IGFueSlcblx0XHR7XG5cdFx0XHR0aGlzLnJ1bihcInJlZmxleDpkZXRhY2gtYXRvbWljXCIsIGJyYW5jaCwgW2F0b21pYywgYnJhbmNoXSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSBzdGF0aWMgcnVuKHNlbGVjdG9yOiBzdHJpbmcsIGJyYW5jaDogSUJyYW5jaCwgYXJnczogYW55W10pXG5cdFx0e1xuXHRcdFx0Y29uc3QgcmVjcyA9IHRoaXMubGlzdGVuZXJzLmdldChicmFuY2gpO1xuXHRcdFx0aWYgKHJlY3MpXG5cdFx0XHRcdGZvciAoY29uc3QgcmVjIG9mIHJlY3MpXG5cdFx0XHRcdFx0aWYgKHJlYy5zZWxlY3RvciA9PT0gc2VsZWN0b3IpXG5cdFx0XHRcdFx0XHRpZiAocmVjLnVzZXJDYWxsYmFjayguLi5hcmdzLCAuLi5yZWMudXNlclJlc3RBcmdzKSA9PT0gdHJ1ZSlcblx0XHRcdFx0XHRcdFx0cmVjcy5kZWxldGUocmVjKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0c3RhdGljIGxpc3RlbihicmFuY2g6IElCcmFuY2gsIHJlY3VycmVudDogUmVjdXJyZW50KVxuXHRcdHtcblx0XHRcdGxldCByZWNzID0gdGhpcy5saXN0ZW5lcnMuZ2V0KGJyYW5jaCk7XG5cdFx0XHRyZWNzID9cblx0XHRcdFx0cmVjcy5hZGQocmVjdXJyZW50KSA6XG5cdFx0XHRcdHRoaXMubGlzdGVuZXJzLnNldChicmFuY2gsIG5ldyBTZXQoW3JlY3VycmVudF0pKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgbGlzdGVuZXJzID0gbmV3IFdlYWtNYXA8SUJyYW5jaCwgU2V0PFJlY3VycmVudD4+KCk7XG5cdH1cbn1cblxuLyoqXG4gKiBcbiAqL1xuZGVjbGFyZSBmdW5jdGlvbiBvbihcblx0ZXZlbnRzOiBcInJlZmxleDphdHRhY2gtYXRvbWljXCIsXG5cdGNhbGxiYWNrOiAoYXRvbWljOiBhbnksIGJyYW5jaDogUmVmbGV4LkNvcmUuSUJyYW5jaCkgPT4gdHJ1ZSB8IHZvaWQsXG4pOiBSZWZsZXguQ29yZS5SZWN1cnJlbnQ7XG5cbi8qKlxuICogXG4gKi9cbmRlY2xhcmUgZnVuY3Rpb24gb24oXG5cdGV2ZW50czogXCJyZWZsZXg6ZGV0YWNoLWF0b21pY1wiLFxuXHRjYWxsYmFjazogKGF0b21pYzogYW55LCBicmFuY2g6IFJlZmxleC5Db3JlLklCcmFuY2gpID0+IHRydWUgfCB2b2lkLFxuKTogUmVmbGV4LkNvcmUuUmVjdXJyZW50O1xuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqXG5cdCAqIEBpbnRlcm5hbFxuXHQgKiBQdXJlbHkgZnVuY3Rpb25hbCB1dGlsaXR5IG1ldGhvZHMgdGhhdCBwZXJmb3JtIG9wZXJhdGlvbnMgZm9yIHRoZSBSZWxleCBDb3JlLlxuXHQgKi9cblx0ZXhwb3J0IGNvbnN0IENvcmVVdGlsID0gbmV3IGNsYXNzIENvcmVVdGlsXG5cdHtcblx0XHQvKipcblx0XHQgKiBDbGVhbnMgb3V0IHRoZSBjcnVmdCBmcm9tIHRoZSBhdG9taWNzIGFycmF5LFxuXHRcdCAqIGZsYXR0ZW5zIGFsbCBhcnJheXMsIGFuZCBjb252ZXJ0cyB0aGUgcmVzdWx0aW5nXG5cdFx0ICogdmFsdWVzIGludG8gTWV0YSBpbnN0YW5jZXMuXG5cdFx0ICovXG5cdFx0dHJhbnNsYXRlQXRvbWljcyhcblx0XHRcdGNvbnRhaW5lckJyYW5jaDogSUJyYW5jaCxcblx0XHRcdGNvbnRhaW5lck1ldGE6IENvbnRhaW5lck1ldGEsXG5cdFx0XHRyYXdBdG9taWNzOiB1bmtub3duKVxuXHRcdHtcblx0XHRcdGNvbnN0IGxpYiA9IFJvdXRpbmdMaWJyYXJ5LnRoaXM7XG5cdFx0XHRjb25zdCBhdG9taWNzID0gQXJyYXkuaXNBcnJheShyYXdBdG9taWNzKSA/XG5cdFx0XHRcdHJhd0F0b21pY3Muc2xpY2UoKSA6XG5cdFx0XHRcdFtyYXdBdG9taWNzXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCBhdG9taWNzLmxlbmd0aDspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGF0b21pYyA9IGF0b21pY3NbaV07XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBJbml0aWFsIGNsZWFyIG91dCBvZiBkaXNjYXJkZWQgdmFsdWVzLlxuXHRcdFx0XHRpZiAoYXRvbWljID09PSBudWxsIHx8IFxuXHRcdFx0XHRcdGF0b21pYyA9PT0gdW5kZWZpbmVkIHx8IFxuXHRcdFx0XHRcdHR5cGVvZiBhdG9taWMgPT09IFwiYm9vbGVhblwiIHx8XG5cdFx0XHRcdFx0YXRvbWljID09PSBcIlwiIHx8ICBcblx0XHRcdFx0XHRhdG9taWMgIT09IGF0b21pYyB8fCBcblx0XHRcdFx0XHRhdG9taWMgPT09IGNvbnRhaW5lckJyYW5jaClcblx0XHRcdFx0XHRhdG9taWNzLnNwbGljZShpLS0sIDEpO1xuXHRcdFx0XHRcblx0XHRcdFx0Ly8gc3RyaW5ncywgbnVtYmVycywgYW5kIGJpZ2ludHMgYXJlIHBhc3NlZCB0aHJvdWdoIHZlcmJhdGltIGluIHRoaXMgcGhhc2UuXG5cdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiBhdG9taWMgIT09IFwib2JqZWN0XCIpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChBcnJheS5pc0FycmF5KGF0b21pYykpXG5cdFx0XHRcdFx0YXRvbWljcy5zcGxpY2UoaS0tLCAxLCAuLi5hdG9taWMpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAodGhpcy5oYXNTeW1ib2wgJiYgYXRvbWljW1N5bWJvbC5pdGVyYXRvcl0pXG5cdFx0XHRcdFx0YXRvbWljcy5zcGxpY2UoaS0tLCAxLCAuLi5BcnJheS5mcm9tKGF0b21pYykpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRjb25zdCBtZXRhczogTWV0YVtdID0gW107XG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgYXRvbWljcy5sZW5ndGg7KVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBhdG9taWMgPSBhdG9taWNzW2ldO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKGF0b21pYyBpbnN0YW5jZW9mIE1ldGEpXG5cdFx0XHRcdFx0bWV0YXMucHVzaChhdG9taWMpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChhdG9taWMgaW5zdGFuY2VvZiBSZWN1cnJlbnQpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoYXRvbWljLnNlbGVjdG9yIGluc3RhbmNlb2YgQXJyYXlGb3JjZSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRtZXRhcy5wdXNoKG5ldyBBcnJheVN0cmVhbU1ldGEoXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5lck1ldGEsXG5cdFx0XHRcdFx0XHRcdGF0b21pYykpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmIChDb3JlUmVjdXJyZW50LnNlbGVjdG9ycy5pbmNsdWRlcyhhdG9taWMuc2VsZWN0b3IpKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdENvcmVSZWN1cnJlbnQubGlzdGVuKGNvbnRhaW5lckJyYW5jaCwgYXRvbWljKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG1ldGFzLnB1c2gobmV3IFJlY3VycmVudFN0cmVhbU1ldGEoXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5lck1ldGEsXG5cdFx0XHRcdFx0XHRcdGF0b21pYykpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmICh0eXBlb2YgYXRvbWljID09PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdFx0bWV0YXMucHVzaChuZXcgQ2xvc3VyZU1ldGEoYXRvbWljKSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmICh0aGlzLmlzQXN5bmNJdGVyYWJsZShhdG9taWMpKVxuXHRcdFx0XHRcdG1ldGFzLnB1c2gobmV3IEFzeW5jSXRlcmFibGVTdHJlYW1NZXRhKGNvbnRhaW5lck1ldGEsIGF0b21pYykpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAoYXRvbWljIGluc3RhbmNlb2YgUHJvbWlzZSlcblx0XHRcdFx0XHRtZXRhcy5wdXNoKG5ldyBQcm9taXNlU3RyZWFtTWV0YShjb250YWluZXJNZXRhLCBhdG9taWMpKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKHRoaXMuaXNBdHRyaWJ1dGVzKGF0b21pYykpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhhdG9taWMpKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGlmICh2IGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSlcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0bWV0YXMucHVzaChuZXcgUmVjdXJyZW50U3RyZWFtTWV0YShcblx0XHRcdFx0XHRcdFx0XHRjb250YWluZXJNZXRhLFxuXHRcdFx0XHRcdFx0XHRcdG5ldyBBdHRyaWJ1dGVSZWN1cnJlbnQoaywgdikpKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2UgbWV0YXMucHVzaChuZXcgQXR0cmlidXRlTWV0YShrLCB2KSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKFtcInN0cmluZ1wiLCBcIm51bWJlclwiLCBcImJpZ2ludFwiXS5pbmNsdWRlcyh0eXBlb2YgYXRvbWljKSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG1ldGFzLnB1c2gobmV3IFZhbHVlTWV0YShhdG9taWMpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBleGlzdGluZ01ldGEgPSBcblx0XHRcdFx0XHRcdEJyYW5jaE1ldGEub2YoYXRvbWljKSB8fFxuXHRcdFx0XHRcdFx0Q29udGVudE1ldGEub2YoYXRvbWljKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoZXhpc3RpbmdNZXRhKVxuXHRcdFx0XHRcdFx0bWV0YXMucHVzaChleGlzdGluZ01ldGEpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiBhdG9taWMgPT09IFwib2JqZWN0XCIgJiZcblx0XHRcdFx0XHRcdGxpYi5pc0tub3duTGVhZihhdG9taWMpKVxuXHRcdFx0XHRcdFx0bWV0YXMucHVzaChuZXcgSW5zdGFuY2VNZXRhKGF0b21pYykpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdC8vIFRoaXMgZXJyb3Igb2NjdXJzIHdoZW4gc29tZXRoaW5nIHdhcyBwYXNzZWQgYXMgYSBhdG9taWMgXG5cdFx0XHRcdFx0Ly8gdG8gYSBicmFuY2ggZnVuY3Rpb24sIGFuZCBuZWl0aGVyIHRoZSBSZWZsZXggY29yZSwgb3IgYW55IG9mXG5cdFx0XHRcdFx0Ly8gdGhlIGNvbm5lY3RlZCBSZWZsZXhpdmUgbGlicmFyaWVzIGtub3cgd2hhdCB0byBkbyB3aXRoIGl0LlxuXHRcdFx0XHRcdGVsc2UgdGhyb3cgbmV3IEVycm9yKFwiVW5pZGVudGlmaWVkIGZseWluZyBvYmplY3QuXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiBtZXRhcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0aXNBdHRyaWJ1dGVzKG9iamVjdDogYW55KTogb2JqZWN0IGlzIElBdHRyaWJ1dGVzXG5cdFx0e1xuXHRcdFx0aWYgKCFvYmplY3QgfHwgb2JqZWN0LmNvbnN0cnVjdG9yICE9PSBPYmplY3QpXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCB2YWx1ZSBvZiBPYmplY3QudmFsdWVzKG9iamVjdCkpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHQgPSB0eXBlb2YgdmFsdWU7XG5cdFx0XHRcdGlmICh0ICE9PSBcInN0cmluZ1wiICYmIHQgIT09IFwibnVtYmVyXCIgJiYgdCAhPT0gXCJiaWdpbnRcIiAmJiB0ICE9PSBcImJvb2xlYW5cIilcblx0XHRcdFx0XHRpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIFN0YXRlZnVsRm9yY2UpKVxuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0aXNBc3luY0l0ZXJhYmxlKG86IGFueSk6IG8gaXMgQXN5bmNJdGVyYWJsZTxhbnk+XG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMuaGFzU3ltYm9sICYmIG8gJiYgdHlwZW9mIG8gPT09IFwib2JqZWN0XCIpXG5cdFx0XHRcdGlmIChvW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSlcblx0XHRcdFx0XHRpZiAodHlwZW9mIG8ubmV4dCA9PT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBvLnJldHVybiA9PT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0XHRcdFx0XHRpZiAodHlwZW9mIG8udGhyb3cgPT09IFwiZnVuY3Rpb25cIilcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgaGFzU3ltYm9sKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBBcHBsaWVzIHRoZSBzcGVjaWZpZWQgbWV0YXMgdG8gdGhlIHNwZWNpZmllZCBicmFuY2gsIGFuZCByZXR1cm5zXG5cdFx0ICogdGhlIGxhc3QgYXBwbGllZCBicmFuY2ggb3IgY29udGVudCBvYmplY3QsIHdoaWNoIGNhbiBiZSB1c2VkIGZvclxuXHRcdCAqIGZ1dHVyZSByZWZlcmVuY2VzLlxuXHRcdCAqL1xuXHRcdGFwcGx5TWV0YXMoXG5cdFx0XHRjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoLFxuXHRcdFx0Y29udGFpbmVyTWV0YTogQ29udGFpbmVyTWV0YSxcblx0XHRcdGNoaWxkTWV0YXM6IE1ldGFbXSxcblx0XHRcdHRyYWNrZXI6IFRyYWNrZXIgPSBuZXcgVHJhY2tlcihjb250YWluaW5nQnJhbmNoKSlcblx0XHR7XG5cdFx0XHRjb25zdCBjb250YWluaW5nQnJhbmNoTWV0YSA9IEJyYW5jaE1ldGEub2YoY29udGFpbmluZ0JyYW5jaCk7XG5cdFx0XHRpZiAoIWNvbnRhaW5pbmdCcmFuY2hNZXRhKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJcIik7XG5cdFx0XHRcblx0XHRcdGNvbnN0IGxpYiA9IFJvdXRpbmdMaWJyYXJ5LnRoaXM7XG5cdFx0XHRjaGlsZE1ldGFzID0gY2hpbGRNZXRhcy5zbGljZSgpO1xuXHRcdFx0XG5cdFx0XHQvLyBDbG9zdXJlTWV0YSBpbnN0YW5jZXMgbmVlZCB0byBiZSBjb2xsYXBzZWQgYmVmb3JlXG5cdFx0XHQvLyB3ZSBwcm9jZWVkIHNvIHRoYXQgdGhlIGxvY2F0b3JzIG9mIGFueSBtZXRhIHRoYXQgaXRcblx0XHRcdC8vIHJldHVybnMgY2FuIGJlIGFzc2ltaWxhdGVkLlxuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCBjaGlsZE1ldGFzLmxlbmd0aDspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IG1ldGEgPSBjaGlsZE1ldGFzW2ldO1xuXHRcdFx0XHRpZiAobWV0YSBpbnN0YW5jZW9mIENsb3N1cmVNZXRhKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKGxpYi5oYW5kbGVCcmFuY2hGdW5jdGlvbiAmJiBpc0JyYW5jaEZ1bmN0aW9uKG1ldGEuY2xvc3VyZSkpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0bGliLmhhbmRsZUJyYW5jaEZ1bmN0aW9uKFxuXHRcdFx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLCBcblx0XHRcdFx0XHRcdFx0PCguLi5hdG9taWNzOiBhbnlbXSkgPT4gSUJyYW5jaD5tZXRhLmNsb3N1cmUpO1xuXHRcdFx0XHRcdH1cdFxuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBjaGlsZHJlbiA9IGxpYi5nZXRDaGlsZHJlbihjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdFx0XHRcdGNvbnN0IGNsb3N1cmVSZXR1cm4gPSBtZXRhLmNsb3N1cmUoY29udGFpbmluZ0JyYW5jaCwgY2hpbGRyZW4pO1xuXHRcdFx0XHRcdFx0Y29uc3QgbWV0YXNSZXR1cm5lZCA9IHRoaXMudHJhbnNsYXRlQXRvbWljcyhcblx0XHRcdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaE1ldGEsXG5cdFx0XHRcdFx0XHRcdGNsb3N1cmVSZXR1cm4pO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRjaGlsZE1ldGFzLnNwbGljZShpLS0sIDEsIC4uLm1ldGFzUmV0dXJuZWQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IG1ldGEgb2YgY2hpbGRNZXRhcylcblx0XHRcdFx0bWV0YS5sb2NhdG9yLnNldENvbnRhaW5lcihjb250YWluZXJNZXRhLmxvY2F0b3IpO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGNoaWxkTWV0YXMubGVuZ3RoOylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgbWV0YSA9IGNoaWxkTWV0YXNbaV07XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAobWV0YSBpbnN0YW5jZW9mIEJyYW5jaE1ldGEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBoYXJkUmVmID0gdHJhY2tlci5nZXRMYXN0SGFyZFJlZigpO1xuXHRcdFx0XHRcdGxpYi5hdHRhY2hBdG9taWMobWV0YS5icmFuY2gsIGNvbnRhaW5pbmdCcmFuY2gsIGhhcmRSZWYpO1xuXHRcdFx0XHRcdHRyYWNrZXIudXBkYXRlKG1ldGEuYnJhbmNoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgQ29udGVudE1ldGEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBoYXJkUmVmID0gdHJhY2tlci5nZXRMYXN0SGFyZFJlZigpO1xuXHRcdFx0XHRcdGxpYi5hdHRhY2hBdG9taWMobWV0YS52YWx1ZSwgY29udGFpbmluZ0JyYW5jaCwgaGFyZFJlZik7XG5cdFx0XHRcdFx0dHJhY2tlci51cGRhdGUobWV0YS52YWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAobWV0YSBpbnN0YW5jZW9mIFZhbHVlTWV0YSB8fCBtZXRhIGluc3RhbmNlb2YgSW5zdGFuY2VNZXRhKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bGliLmF0dGFjaEF0b21pYyhtZXRhLnZhbHVlLCBjb250YWluaW5nQnJhbmNoLCBcImFwcGVuZFwiKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgU3RyZWFtTWV0YSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChtZXRhIGluc3RhbmNlb2YgUmVjdXJyZW50U3RyZWFtTWV0YSlcblx0XHRcdFx0XHRcdG1ldGEuYXR0YWNoKGNvbnRhaW5pbmdCcmFuY2gsIHRyYWNrZXIpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBBc3luY0l0ZXJhYmxlU3RyZWFtTWV0YSlcblx0XHRcdFx0XHRcdG1ldGEuYXR0YWNoKGNvbnRhaW5pbmdCcmFuY2gsIHRyYWNrZXIpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBBcnJheVN0cmVhbU1ldGEpXG5cdFx0XHRcdFx0XHRtZXRhLmF0dGFjaChjb250YWluaW5nQnJhbmNoLCB0cmFja2VyKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgUHJvbWlzZVN0cmVhbU1ldGEpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y29uc3QgbG9jYWxUcmFja2VyID0gdHJhY2tlci5kZXJpdmUoKTtcblx0XHRcdFx0XHRcdGxvY2FsVHJhY2tlci51cGRhdGUobWV0YS5sb2NhdG9yKTtcblx0XHRcdFx0XHRcdG1ldGEuYXR0YWNoKGNvbnRhaW5pbmdCcmFuY2gsIGxvY2FsVHJhY2tlcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBBdHRyaWJ1dGVNZXRhKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bGliLmF0dGFjaEF0dHJpYnV0ZShjb250YWluaW5nQnJhbmNoLCBtZXRhLmtleSwgbWV0YS52YWx1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdGlmIChDb25zdC5kZWJ1ZyB8fCBDb25zdC5ub2RlKVxuXHRcdFx0XHRcdGNoaWxkcmVuT2Yuc3RvcmUoY29udGFpbmluZ0JyYW5jaCwgbWV0YSk7XG5cdFx0XHRcdFxuXHRcdFx0XHR0cmFja2VyLnVwZGF0ZShtZXRhLmxvY2F0b3IpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHR1bmFwcGx5TWV0YXMoXG5cdFx0XHRjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoLFxuXHRcdFx0Y2hpbGRNZXRhczogTWV0YVtdKVxuXHRcdHtcblx0XHRcdGNvbnN0IGxpYiA9IFJvdXRpbmdMaWJyYXJ5LnRoaXM7XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgbWV0YSBvZiBjaGlsZE1ldGFzKVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBDbG9zdXJlTWV0YXMgY2FuIGJlIHNhZmVseSBpZ25vcmVkLlxuXHRcdFx0XHRpZiAobWV0YSBpbnN0YW5jZW9mIENsb3N1cmVNZXRhKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKG1ldGEgaW5zdGFuY2VvZiBDb250ZW50TWV0YSB8fCBtZXRhIGluc3RhbmNlb2YgVmFsdWVNZXRhKVxuXHRcdFx0XHRcdGxpYi5kZXRhY2hBdG9taWMobWV0YS52YWx1ZSwgY29udGFpbmluZ0JyYW5jaCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgQXR0cmlidXRlTWV0YSlcblx0XHRcdFx0XHRsaWIuZGV0YWNoQXR0cmlidXRlKGNvbnRhaW5pbmdCcmFuY2gsIG1ldGEudmFsdWUpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAobWV0YSBpbnN0YW5jZW9mIEJyYW5jaE1ldGEpXG5cdFx0XHRcdFx0Ly8gV2Ugc2hvdWxkIHByb2JhYmx5IGNvbnNpZGVyIGdldHRpbmcgcmlkIG9mIHRoaXNcblx0XHRcdFx0XHQvLyBZb3Ugd291bGQgYmUgYWJsZSB0byByZS1kaXNjb3ZlciB0aGUgYnJhbmNoIGJ5XG5cdFx0XHRcdFx0Ly8gZW51bWVyYXRpbmcgdGhyb3VnaCB0aGUgY2hpbGRyZW4gb2YgY29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHQvLyB1c2luZyB0aGUgZ2V0Q2hpbGRyZW4oKSBtZXRob2QgcHJvdmlkZWQgYnkgdGhlIGxpYnJhcnkuXG5cdFx0XHRcdFx0bGliLmRldGFjaEF0b21pYyhtZXRhLmJyYW5jaCwgY29udGFpbmluZ0JyYW5jaCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgUmVjdXJyZW50U3RyZWFtTWV0YSlcblx0XHRcdFx0XHRtZXRhLmRldGFjaFJlY3VycmVudHMoXG5cdFx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdFx0bWV0YS5yZWN1cnJlbnQuc2VsZWN0b3IsXG5cdFx0XHRcdFx0XHRtZXRhLnN5c3RlbUNhbGxiYWNrKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBQcm9taXNlU3RyZWFtTWV0YSlcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQuXCIpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAobWV0YSBpbnN0YW5jZW9mIEFzeW5jSXRlcmFibGVTdHJlYW1NZXRhKVxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZC5cIik7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KCk7XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXhcbntcblx0LyoqICovXG5cdGV4cG9ydCBlbnVtIG11dGF0aW9uXG5cdHtcblx0XHRhbnkgPSBcIm11dGF0aW9uLWFueVwiLFxuXHRcdGJyYW5jaCA9IFwibXV0YXRpb24tYnJhbmNoXCIsXG5cdFx0YnJhbmNoQWRkID0gXCJtdXRhdGlvbi1icmFuY2gtYWRkXCIsXG5cdFx0YnJhbmNoUmVtb3ZlID0gXCJtdXRhdGlvbi1icmFuY2gtcmVtb3ZlXCIsXG5cdFx0Y29udGVudCA9IFwibXV0YXRpb24tY29udGVudFwiLFxuXHRcdGNvbnRlbnRBZGQgPSBcIm11dGF0aW9uLWNvbnRlbnQtYWRkXCIsXG5cdFx0Y29udGVudFJlbW92ZSA9IFwibXV0YXRpb24tY29udGVudC1yZW1vdmVcIlxuXHR9XG59XG5cbmRlY2xhcmUgbmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKiAqL1xuXHRleHBvcnQgdHlwZSBWb2lkYWJsZTxUPiA9IFxuXHRcdFQgfFxuXHRcdGZhbHNlIHxcblx0XHR2b2lkO1xuXHRcblx0LyoqXG5cdCAqIE1hcmtlciBpbnRlcmZhY2UgdGhhdCBkZWZpbmVzIGFuIG9iamVjdCB0aGF0IGNhbiBoYXZlXG5cdCAqIHJlZmxleGl2ZSB2YWx1ZXMgYXR0YWNoZWQgdG8gaXQuXG5cdCAqIChGb3IgZXhhbXBsZTogSFRNTEVsZW1lbnQgb3IgTlNXaW5kb3cpXG5cdCAqL1xuXHRleHBvcnQgaW50ZXJmYWNlIElCcmFuY2ggZXh0ZW5kcyBPYmplY3QgeyB9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGNsYXNzIEJyYW5jaEZ1bmN0aW9uPFROYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPlxuXHR7XG5cdFx0cmVhZG9ubHkgbmFtZTogVE5hbWU7XG5cdFx0cHJpdmF0ZSByZWFkb25seSBub21pbmFsOiB1bmRlZmluZWQ7IFxuXHR9XG5cdFxuXHQvKipcblx0ICogTWFya2VyIGludGVyZmFjZSB0aGF0IGRlZmluZXMgYW4gb2JqZWN0IHRoYXQgcmVwcmVzZW50c1xuXHQgKiBhIGJsb2NrIG9mIHZpc2libGUgY29udGVudCBpbiB0aGUgdHJlZS5cblx0ICogKEZvciBleGFtcGxlOiB0aGUgVzNDIERPTSdzIFRleHQgb2JqZWN0KVxuXHQgKi9cblx0ZXhwb3J0IGludGVyZmFjZSBJQ29udGVudCBleHRlbmRzIE9iamVjdCB7IH1cblx0XG5cdC8qKlxuXHQgKiBBIHR5cGUgdGhhdCBpZGVudGlmaWVzIHRoZSBhdG9taWMgdHlwZXMgdGhhdCBjYW4gZXhpc3Rcblx0ICogaW4gYW55IHJlZmxleGl2ZSBhcmd1bWVudHMgbGlzdC5cblx0ICovXG5cdGV4cG9ydCB0eXBlIEF0b21pYzxUTWV0YSA9IG9iamVjdCwgVEJyYW5jaCA9IG9iamVjdCwgVEFkZGl0aW9uYWxzID0gdW5rbm93bj4gPVxuXHRcdFZvaWRhYmxlPFRNZXRhIHwgVEFkZGl0aW9uYWxzPiB8XG5cdFx0SXRlcmFibGU8VE1ldGEgfCBUQWRkaXRpb25hbHM+IHxcblx0XHRBc3luY0l0ZXJhYmxlPFRNZXRhIHwgVEFkZGl0aW9uYWxzPiB8XG5cdFx0UHJvbWlzZTxUTWV0YSB8IFRBZGRpdGlvbmFscz4gfFxuXHRcdCgoYnJhbmNoOiBUQnJhbmNoLCBjaGlsZHJlbjogVE1ldGFbXSkgPT4gQXRvbWljczxUTWV0YSwgVEJyYW5jaCwgVEFkZGl0aW9uYWxzPikgfFxuXHRcdEJyYW5jaEZ1bmN0aW9uIHxcblx0XHRSZWN1cnJlbnQgfCBcblx0XHRJQXR0cmlidXRlcztcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCB0eXBlIEF0b21pY3M8TSA9IG9iamVjdCwgQiA9IG9iamVjdCwgQSA9IHVua25vd24+ID1cblx0XHRNIHxcblx0XHRCIHxcblx0XHRBIHxcblx0XHRBdG9taWM8TSwgQiwgQT4gfFxuXHRcdEF0b21pYzxNLCBCLCBBdG9taWM8TSwgQiwgQT4+IHxcblx0XHRBdG9taWM8TSwgQiwgQXRvbWljPE0sIEIsIEF0b21pYzxNLCBCLCBBPj4+IHxcblx0XHRBdG9taWM8TSwgQiwgQXRvbWljPE0sIEIsIEF0b21pYzxNLCBCLCBBdG9taWM8TSwgQiwgQT4+Pj47XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGludGVyZmFjZSBJQXR0cmlidXRlczxUID0gc3RyaW5nIHwgbnVtYmVyIHwgYmlnaW50IHwgYm9vbGVhbj5cblx0e1xuXHRcdFthdHRyaWJ1dGVOYW1lOiBzdHJpbmddOiBWb2lkYWJsZTxUPiB8IFN0YXRlZnVsRm9yY2U8Vm9pZGFibGU8VD4+O1xuXHR9XG5cdFxuXHQvKipcblx0ICogQWJzdHJhY3QgZGVmaW5pdGlvbiBvZiB0aGUgY29udGVudCB2YXJpYW50IG9mIHRoZSB0b3AtbGV2ZWxcblx0ICogbmFtZXNwYWNlIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZXhwb3J0IGludGVyZmFjZSBJQ29udGVudE5hbWVzcGFjZTxUUHJlcGFyZWRDb250ZW50LCBUQ29udGVudD5cblx0e1xuXHRcdChcblx0XHRcdHRlbXBsYXRlOlxuXHRcdFx0XHRUZW1wbGF0ZVN0cmluZ3NBcnJheSB8IFxuXHRcdFx0XHRWb2lkYWJsZTxUQ29udGVudD4gfCBcblx0XHRcdFx0U3RhdGVmdWxGb3JjZTxWb2lkYWJsZTxUQ29udGVudD4+LFxuXHRcdFx0XG5cdFx0XHQuLi52YWx1ZXM6IChcblx0XHRcdFx0SUJyYW5jaCB8IFxuXHRcdFx0XHRWb2lkYWJsZTxUQ29udGVudD4gfCBcblx0XHRcdFx0U3RhdGVmdWxGb3JjZTxWb2lkYWJsZTxUQ29udGVudD4+KVtdXG5cdFx0KTogVFByZXBhcmVkQ29udGVudDtcblx0fVxuXHRcblx0LyoqXG5cdCAqIEFic3RyYWN0IGRlZmluaXRpb24gb2YgdGhlIGNvbnRhaW5lciB2YXJpYW50IG9mIHRoZSB0b3AtbGV2ZWxcblx0ICogbmFtZXNwYWNlIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZXhwb3J0IGludGVyZmFjZSBJQ29udGFpbmVyTmFtZXNwYWNlPFAgZXh0ZW5kcyBBdG9taWNzLCBUUmVzdWx0ID0gb2JqZWN0PlxuXHR7XG5cdFx0KC4uLmF0b21pY3M6IFBbXSk6IFRSZXN1bHQ7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBEZWZpbmVzIGEgcmVsYXRpdmUgb3Igc3BlY2lmaWMgbWV0YSByZWZlcmVuY2UsIHVzZWQgZm9yIGluZGljYXRpbmdcblx0ICogYW4gaW5zZXJ0aW9uIHBvc2l0aW9uIG9mIGEgbmV3IG1ldGEgd2l0aGluIGEgUmVmbGV4aXZlIHRyZWUuXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBSZWYgPSBJQnJhbmNoIHwgSUNvbnRlbnQgfCBcInByZXBlbmRcIiB8IFwiYXBwZW5kXCI7XG5cdFxuXHQvKipcblx0ICogR2VuZXJpYyBmdW5jdGlvbiBkZWZpbml0aW9uIGZvciBjYWxsYmFjayBmdW5jdGlvbnMgcHJvdmlkZWQgdG9cblx0ICogdGhlIGdsb2JhbCBvbigpIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgUmVjdXJyZW50Q2FsbGJhY2s8VCBleHRlbmRzIEF0b21pY3MgPSBBdG9taWNzPiA9ICguLi5hcmdzOiBhbnlbXSkgPT4gVDtcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCB0eXBlIE9iamVjdEZvcmNlPFQ+ID0ge1xuXHRcdFtQIGluIGtleW9mIFRdOlxuXHRcdFx0VFtQXSBleHRlbmRzIChzdHJpbmcgfCBudW1iZXIgfCBiaWdpbnQgfCBib29sZWFuIHwgbnVsbCkgPyBTdGF0ZWZ1bEZvcmNlPFRbUF0+IDpcblx0XHRcdFRbUF0gZXh0ZW5kcyBBcnJheTxpbmZlciBVPiA/IEFycmF5Rm9yY2U8VT4gOlxuXHRcdFx0VFtQXTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIEEgbWFwcGVkIHR5cGUgdGhhdCBleHRyYWN0cyB0aGUgbmFtZXMgb2YgdGhlIG1ldGhvZHMgYW5kXG5cdCAqIGZ1bmN0aW9uLXZhbHVlZCBmaWVsZHMgb3V0IG9mIHRoZSBzcGVjaWZpZWQgdHlwZS5cblx0ICovXG5cdGV4cG9ydCB0eXBlIE1ldGhvZE5hbWVzPFQ+ID0ge1xuXHRcdFtLIGluIGtleW9mIFRdOiBUW0tdIGV4dGVuZHMgKCguLi5hcmdzOiBhbnlbXSkgPT4gYW55KSA/IEsgOiBuZXZlcjtcblx0fVtrZXlvZiBUXTtcblxuXHQvKipcblx0ICogRXh0cmFjdHMgYW55IHJldHVybiB0eXBlIGZyb20gdGhlIHNwZWNpZmllZCB0eXBlLCBpbiB0aGUgY2FzZVxuXHQgKiB3aGVuIHRoZSB0eXBlIHNwZWNpZmllZCBpcyBhIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgTWF5YmVSZXR1cm5UeXBlPFQ+ID0gVCBleHRlbmRzICguLi5hcmdzOiBhbnlbXSkgPT4gaW5mZXIgUiA/IFIgOiBuZXZlcjtcblx0XG5cdC8qKlxuXHQgKiBNYXBzIHRoZSBzcGVjaWZpZWQgdHlwZSB0byBhIHZlcnNpb24gb2YgaXRzZWxmLFxuXHQgKiBidXQgd2l0aG91dCBhbnkgcG9zc2libHkgdW5kZWZpbmVkIHZhbHVlcy5cblx0ICovXG5cdGV4cG9ydCB0eXBlIERlZmluZWQ8VD4gPSB7IFtLIGluIGtleW9mIFRdLT86IFRbS10gfTtcblx0XG5cdC8qKlxuXHQgKiBFeHRyYWN0cyB0aGUgcmV0dXJuIHR5cGUgb2YgdGhlIHNwZWNpZmllZCBmdW5jdGlvbiB0eXBlLlxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgUmV0dXJuT2Y8b3JpZ2luYWwgZXh0ZW5kcyBGdW5jdGlvbj4gPSBcblx0XHRvcmlnaW5hbCBleHRlbmRzICguLi54OiBhbnlbXSkgPT4gaW5mZXIgcmV0dXJuVHlwZSA/XG5cdFx0XHRyZXR1cm5UeXBlIDogXG5cdFx0XHRuZXZlcjtcblx0XG5cdC8qKlxuXHQgKiBFeHRyYWN0cyB0aGUgbWV0aG9kcyBvdXQgb2YgdGhlIHR5cGUsIGFuZCByZXR1cm5zIGEgbWFwcGVkIG9iamVjdCB0eXBlXG5cdCAqIHdob3NlIG1lbWJlcnMgYXJlIHRyYW5zZm9ybWVkIGludG8gYnJhbmNoIGNyZWF0aW9uIG1ldGhvZHMuXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBBc0JyYW5jaGVzPFQ+ID0ge1xuXHRcdFtLIGluIGtleW9mIFRdOiBBc0JyYW5jaDxUW0tdPlxuXHR9O1xuXHRcblx0LyoqXG5cdCAqIEV4dHJhY3RzIFxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgQXNCcmFuY2g8Rj4gPSBcblx0XHRGIGV4dGVuZHMgKCkgPT4gaW5mZXIgUiA/ICguLi5hdG9taWNzOiBBdG9taWNzW10pID0+IFIgOlxuXHRcdEYgZXh0ZW5kcyAoLi4uYXJnczogaW5mZXIgQSkgPT4gaW5mZXIgUiA/ICguLi5hcmdzOiBBKSA9PiAoLi4uYXRvbWljczogQXRvbWljc1tdKSA9PiBSIDpcblx0XHRGO1xuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgU3RhdGljQnJhbmNoZXNPZjxMIGV4dGVuZHMgUmVmbGV4LkNvcmUuSUxpYnJhcnk+ID1cblx0XHRMW1wiZ2V0U3RhdGljQnJhbmNoZXNcIl0gZXh0ZW5kcyBGdW5jdGlvbiA/XG5cdFx0XHRBc0JyYW5jaGVzPFJldHVybk9mPExbXCJnZXRTdGF0aWNCcmFuY2hlc1wiXT4+IDpcblx0XHRcdHt9O1xuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgU3RhdGljTm9uQnJhbmNoZXNPZjxMIGV4dGVuZHMgUmVmbGV4LkNvcmUuSUxpYnJhcnk+ID1cblx0XHRMW1wiZ2V0U3RhdGljTm9uQnJhbmNoZXNcIl0gZXh0ZW5kcyBGdW5jdGlvbiA/XG5cdFx0XHRBc0JyYW5jaGVzPFJldHVybk9mPExbXCJnZXRTdGF0aWNOb25CcmFuY2hlc1wiXT4+IDpcblx0XHRcdHt9O1xufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgU3RhdGVsZXNzRm9yY2U8QSBleHRlbmRzIGFueVtdID0gYW55W10+ID0gKC4uLmFyZ3M6IEEpID0+IHZvaWQ7XG5cdFxuXHQvKipcblx0ICogUmV0dXJucyBhIGJvb2xlYW4gdGhhdCBpbmRpY2F0ZXMgd2hldGhlciB0aGUgc3BlY2lmaWVkIHZhbHVlXG5cdCAqIGlzIGEgc3RhdGVsZXNzIG9yIHN0YXRlZnVsIGZvcmNlLlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGlzRm9yY2UodGFyZ2V0OiBhbnkpXG5cdHtcblx0XHQvLyBUT0RPOiBUaGlzIGZ1bmN0aW9uIGFsc28gbmVlZHMgdG8gY2hlY2sgZm9yIEFycmF5Rm9yY2Unc1xuXHRcdHJldHVybiBpc0ZvcmNlRnVuY3Rpb24odGFyZ2V0KSB8fFxuXHRcdFx0dGFyZ2V0IGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIEd1YXJkcyBvbiB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgdmFsdWUgaXMgc3RhdGVsZXNzIGZvcmNlIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGlzRm9yY2VGdW5jdGlvbihmb3JjZUZuOiBhbnkpOiBmb3JjZUZuIGlzICguLi5hcmdzOiBhbnkpID0+IHZvaWRcblx0e1xuXHRcdHJldHVybiAhIWZvcmNlRm4gJiYgZW50cmllcy5oYXMoZm9yY2VGbik7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBAaW50ZXJuYWxcblx0ICovXG5cdGV4cG9ydCBjb25zdCBGb3JjZVV0aWwgPVxuXHR7XG5cdFx0LyoqICovXG5cdFx0Y3JlYXRlRnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdC8vIFRoZSB1c2VyIGZvcmNlIGZ1bmN0aW9uIGlzIHNlbnQgYmFjayB0byB0aGUgdXNlciwgd2hvIHVzZXNcblx0XHRcdC8vIHRoaXMgZnVuY3Rpb24gYXMgYSBwYXJhbWV0ZXIgdG8gb3RoZXIgb24oKSBjYWxscywgb3IgdG8gY2FsbFxuXHRcdFx0Ly8gZGlyZWN0bHkgd2hlbiB0aGUgdGhpbmcgaGFwcGVucy5cblx0XHRcdGNvbnN0IHVzZXJGb3JjZUZuID0gKC4uLmFyZ3M6IGFueVtdKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCByZUZuID0gZW50cmllcy5nZXQodXNlckZvcmNlRm4pO1xuXHRcdFx0XHRpZiAocmVGbilcblx0XHRcdFx0XHRmb3IgKGNvbnN0IHN5c3RlbUNhbGxiYWNrIG9mIHJlRm4uc3lzdGVtQ2FsbGJhY2tzKVxuXHRcdFx0XHRcdFx0c3lzdGVtQ2FsbGJhY2soLi4uYXJncyk7XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0XHRjb25zdCBlbnRyeSA9IG5ldyBFbnRyeSgpO1xuXHRcdFx0ZW50cmllcy5zZXQodXNlckZvcmNlRm4sIGVudHJ5KTtcblx0XHRcdHJldHVybiB1c2VyRm9yY2VGbjtcblx0XHR9LFxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgdGhlIFN0YXRlbGVzc0ZvcmNlIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIHNwZWNpZmllZFxuXHRcdCAqIGZvcmNlIGZ1bmN0aW9uLlxuXHRcdCAqL1xuXHRcdGF0dGFjaEZvcmNlKFxuXHRcdFx0Zm46IFN0YXRlbGVzc0ZvcmNlLCBcblx0XHRcdHN5c3RlbUNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9taWNzPilcblx0XHR7XG5cdFx0XHRjb25zdCByZSA9IGVudHJpZXMuZ2V0KGZuKTtcblx0XHRcdGlmIChyZSlcblx0XHRcdFx0cmUuc3lzdGVtQ2FsbGJhY2tzLmFkZChzeXN0ZW1DYWxsYmFjayk7XG5cdFx0fSxcblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRkZXRhY2hGb3JjZShcblx0XHRcdGZuOiBTdGF0ZWxlc3NGb3JjZSxcblx0XHRcdHN5c3RlbUNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9taWNzPilcblx0XHR7XG5cdFx0XHRjb25zdCBmbyA9IGVudHJpZXMuZ2V0KGZuKTtcblx0XHRcdGlmIChmbylcblx0XHRcdFx0Zm8uc3lzdGVtQ2FsbGJhY2tzLmRlbGV0ZShzeXN0ZW1DYWxsYmFjayk7XG5cdFx0fVxuXHR9O1xuXHRcblx0XG5cdC8qKiAqL1xuXHRjb25zdCBlbnRyaWVzID0gbmV3IFdlYWtNYXA8U3RhdGVsZXNzRm9yY2UsIEVudHJ5PigpO1xuXHRcblx0Y2xhc3MgRW50cnlcblx0e1xuXHRcdHJlYWRvbmx5IHN5c3RlbUNhbGxiYWNrcyA9IG5ldyBTZXQ8UmVjdXJyZW50Q2FsbGJhY2s8QXRvbWljcz4+KCk7XG5cdH1cbn1cbiIsIlxuLyoqXG4gKiBcbiAqL1xuZnVuY3Rpb24gZm9yY2UoKTogKCkgPT4gdm9pZDtcbi8qKlxuICogXG4gKi9cbmZ1bmN0aW9uIGZvcmNlPEYgZXh0ZW5kcyBSZWZsZXguQ29yZS5TdGF0ZWxlc3NGb3JjZSA9ICgpID0+IHZvaWQ+KCk6IEY7XG4vKipcbiAqIFxuICovXG5mdW5jdGlvbiBmb3JjZShpbml0aWFsVmFsdWU6IGJvb2xlYW4pOiBSZWZsZXguQ29yZS5Cb29sZWFuRm9yY2U7XG4vKipcbiAqIFxuICovXG5mdW5jdGlvbiBmb3JjZShpbml0aWFsVmFsdWU6IHN0cmluZyk6IFJlZmxleC5Db3JlLlN0YXRlZnVsRm9yY2U8c3RyaW5nPjtcbi8qKlxuICogXG4gKi9cbmZ1bmN0aW9uIGZvcmNlKGluaXRpYWxWYWx1ZTogbnVtYmVyKTogUmVmbGV4LkNvcmUuU3RhdGVmdWxGb3JjZTxudW1iZXI+O1xuLyoqXG4gKiBcbiAqL1xuZnVuY3Rpb24gZm9yY2UoaW5pdGlhbFZhbHVlOiBiaWdpbnQpOiBSZWZsZXguQ29yZS5TdGF0ZWZ1bEZvcmNlPGJpZ2ludD47XG4vKipcbiAqIFxuICovXG5mdW5jdGlvbiBmb3JjZTxUPihiYWNraW5nQXJyYXk6IFRbXSk6IFJlZmxleC5Db3JlLkFycmF5Rm9yY2U8VD47XG4vKipcbiAqIFJldHVybnMgYW4gb2JzZXJ2YWJsZSBwcm94eSBvZiB0aGUgc3BlY2lmaWVkIHNvdXJjZSBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIGZvcmNlPFQ+KGJhY2tpbmdPYmplY3Q6IFQpOiBSZWZsZXguQ29yZS5PYmplY3RGb3JjZTxUPjtcbmZ1bmN0aW9uIGZvcmNlKGluaXRpYWxWYWx1ZT86IGFueSlcbntcblx0Y29uc3QgdHJ5Q3JlYXRlU2luZ2xlID0gKHZhbDogYW55KSA9PlxuXHR7XG5cdFx0aWYgKHZhbCA9PT0gdW5kZWZpbmVkIHx8IHZhbCA9PT0gbnVsbClcblx0XHRcdHJldHVybiBSZWZsZXguQ29yZS5Gb3JjZVV0aWwuY3JlYXRlRnVuY3Rpb24oKTtcblx0XHRcblx0XHRpZiAodHlwZW9mIHZhbCA9PT0gXCJib29sZWFuXCIpXG5cdFx0XHRyZXR1cm4gbmV3IFJlZmxleC5Db3JlLkJvb2xlYW5Gb3JjZSh2YWwpO1xuXHRcdFxuXHRcdGlmICh0eXBlb2YgdmFsID09PSBcInN0cmluZ1wiIHx8IHR5cGVvZiB2YWwgPT09IFwiYmlnaW50XCIpXG5cdFx0XHRyZXR1cm4gbmV3IFJlZmxleC5Db3JlLlN0YXRlZnVsRm9yY2UodmFsKTtcblx0XHRcblx0XHRpZiAodHlwZW9mIHZhbCA9PT0gXCJudW1iZXJcIilcblx0XHRcdHJldHVybiBuZXcgUmVmbGV4LkNvcmUuU3RhdGVmdWxGb3JjZSh2YWwgfHwgMCk7XG5cdFx0XG5cdFx0aWYgKEFycmF5LmlzQXJyYXkodmFsKSlcblx0XHRcdHJldHVybiBSZWZsZXguQ29yZS5BcnJheUZvcmNlLmNyZWF0ZSh2YWwpO1xuXHRcdFxuXHRcdHJldHVybiBudWxsO1xuXHR9O1xuXHRcblx0Y29uc3Qgc2luZ2xlID0gdHJ5Q3JlYXRlU2luZ2xlKGluaXRpYWxWYWx1ZSk7XG5cdGlmIChzaW5nbGUgIT09IG51bGwpXG5cdFx0cmV0dXJuIHNpbmdsZTtcblx0XG5cdGNvbnN0IGJhY2tpbmc6IHsgW2tleTogc3RyaW5nXTogb2JqZWN0OyB9ID0ge307XG5cdFxuXHRmb3IgKGNvbnN0IGtleSBpbiBpbml0aWFsVmFsdWUpXG5cdHtcblx0XHQvLyBTa2lwIHBhc3QgYW55IHByaXZhdGUgcHJvcGVydGllc1xuXHRcdGlmIChrZXkuc3RhcnRzV2l0aChcIl9cIikpXG5cdFx0XHRjb250aW51ZTtcblx0XHRcblx0XHRjb25zdCB2YWx1ZSA9IGluaXRpYWxWYWx1ZVtrZXldO1xuXHRcdFxuXHRcdC8vIFdlIGNhbid0IGRlYWwgd2l0aCBhbnl0aGluZyB0aGF0IHN0YXJ0cyBhcyBudWxsIG9yIHVuZGVmaW5lZFxuXHRcdGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsIHx8IHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0Y29udGludWU7XG5cdFx0XG5cdFx0Y29uc3Qgc2luZ2xlID0gdHJ5Q3JlYXRlU2luZ2xlKHZhbHVlKTtcblx0XHRpZiAoc2luZ2xlICE9PSBudWxsKVxuXHRcdFx0YmFja2luZ1trZXldID0gc2luZ2xlO1xuXHR9XG5cdFxuXHRyZXR1cm4gbmV3IFByb3h5KGluaXRpYWxWYWx1ZSwge1xuXHRcdGdldDogKHRhcmdldDogYW55LCBwcm9wZXJ0eTogc3RyaW5nKSA9PlxuXHRcdHtcblx0XHRcdGlmIChwcm9wZXJ0eSBpbiBiYWNraW5nKVxuXHRcdFx0XHRyZXR1cm4gYmFja2luZ1twcm9wZXJ0eV07XG5cdFx0XHRcblx0XHRcdHJldHVybiB0YXJnZXRbcHJvcGVydHldO1xuXHRcdH0sXG5cdFx0c2V0OiAodGFyZ2V0OiBhbnksIHByb3BlcnR5OiBzdHJpbmcsIHZhbHVlOiBhbnkpID0+XG5cdFx0e1xuXHRcdFx0aWYgKHByb3BlcnR5IGluIGJhY2tpbmcpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHRhcmdldFZhbCA9IGJhY2tpbmdbcHJvcGVydHldO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKHRhcmdldFZhbCBpbnN0YW5jZW9mIFJlZmxleC5Db3JlLlN0YXRlZnVsRm9yY2UpXG5cdFx0XHRcdFx0dGFyZ2V0VmFsLnZhbHVlID0gdmFsdWU7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmICh0YXJnZXRWYWwgaW5zdGFuY2VvZiBSZWZsZXguQ29yZS5BcnJheUZvcmNlKVxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlJlLWFzc2lnbm1lbnQgb2YgYXJyYXlzIGlzIG5vdCBpbXBsZW1lbnRlZC5cIik7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gZXJyb3IuXCIpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB0YXJnZXRbcHJvcGVydHldID0gdmFsdWU7XG5cdFx0XHRcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0fSk7XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHRleHBvcnQgaW50ZXJmYWNlIElMaWJyYXJ5XG5cdHtcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIG11c3QgaW1wbGVtZW50IHRoaXMgbWV0aG9kLCBzbyB0aGF0IHRoZVxuXHRcdCAqIFJlZmxleCBDb3JlIGNhbiBkZXRlcm1pbmUgdGhlIG9yaWdpbmF0aW5nIGxpYnJhcnkgb2YgYSBnaXZlblxuXHRcdCAqIG9iamVjdC4gVGhlIGxpYnJhcnkgc2hvdWxkIHJldHVybiBhIGJvb2xlYW4gdmFsdWUgaW5kaWNhdGluZ1xuXHRcdCAqIHdoZXRoZXIgdGhlIGxpYnJhcnkgaXMgYWJsZSB0byBvcGVyYXRlIG9uIHRoZSBvYmplY3Qgc3BlY2lmaWVkLlxuXHRcdCAqL1xuXHRcdGlzS25vd25CcmFuY2goYnJhbmNoOiBJQnJhbmNoKTogYm9vbGVhbjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRpc0tub3duTGVhZj86IChsZWFmOiBvYmplY3QpID0+IGJvb2xlYW47XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyBtYXkgaW1wbGVtZW50IHRoaXMgbWV0aG9kIGluIG9yZGVyIHRvIHByb3ZpZGVcblx0XHQgKiB0aGUgc3lzdGVtIHdpdGgga25vd2xlZGdlIG9mIHdoZXRoZXIgYSBicmFuY2ggaGFzIGJlZW4gZGlzcG9zZWQsXG5cdFx0ICogd2hpY2ggaXQgdXNlcyBmb3IgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9ucy4gSWYgdGhlIGxpYnJhcnkgaGFzIG5vXG5cdFx0ICogbWVhbnMgb2YgZG9pbmcgdGhpcywgaXQgbWF5IHJldHVybiBcIm51bGxcIi5cblx0XHQgKi9cblx0XHRpc0JyYW5jaERpc3Bvc2VkPzogKGJyYW5jaDogSUJyYW5jaCkgPT4gYm9vbGVhbjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRnZXRTdGF0aWNCcmFuY2hlcz86ICgpID0+IHsgW25hbWU6IHN0cmluZ106IGFueSB9IHwgdW5kZWZpbmVkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgdGhhdCBoYXZlIHN0YXRpYyBtZW1iZXJzIGluIHRoZWlyIG5hbWVzcGFjZSBtdXN0XG5cdFx0ICogcmV0dXJuIHRoZW0gYXMgYW4gb2JqZWN0IGluIHRoaXMgbWV0aG9kLlxuXHRcdCAqL1xuXHRcdGdldFN0YXRpY05vbkJyYW5jaGVzPzogKCkgPT4geyBbbmFtZTogc3RyaW5nXTogYW55IH0gfCB1bmRlZmluZWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0Z2V0RHluYW1pY0JyYW5jaD86IChuYW1lOiBzdHJpbmcpID0+IElCcmFuY2g7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0Z2V0RHluYW1pY05vbkJyYW5jaD86IChuYW1lOiBzdHJpbmcpID0+IGFueTtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIHRoYXQgc3VwcG9ydCBpbmxpbmUgdGFyZ2V0K2NoaWxkcmVuIGNsb3N1cmVzXG5cdFx0ICogbXVzdCBwcm92aWRlIGFuIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIG1ldGhvZC5cblx0XHQgKi9cblx0XHRnZXRDaGlsZHJlbih0YXJnZXQ6IElCcmFuY2gpOiBJdGVyYWJsZTxJQnJhbmNoIHwgSUNvbnRlbnQ+O1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgbXVzdCBpbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiB0byBjb252ZXJ0IHZhbHVlc1xuXHRcdCAqIGJlaW5nIHByb2Nlc3NlZCBieSB0aGUgdG9wLWxldmVsIG5hbWVzcGFjZSBmdW5jdGlvbiBpbnRvIG90aGVyXG5cdFx0ICogdmFsdWVzIHRoYXQgd2lsbCBldmVudHVhbGx5IGJlIGFwcGxpZWQgYXMgYXRvbWljcy5cblx0XHQgKiBcblx0XHQgKiBUaGlzIGZ1bmN0aW9uIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBieSBsaWJyYXJpZXMgdGhhdCB1c2UgdGhlXG5cdFx0ICogY29udGVudCBuYW1lc3BhY2UgdmFyaWFudC5cblx0XHQgKi9cblx0XHRjcmVhdGVDb250ZW50PzogKGNvbnRlbnQ6IGFueSkgPT4gb2JqZWN0IHwgbnVsbDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIG11c3QgaW1wbGVtZW50IHRoaXMgZnVuY3Rpb24gdG8gY3JlYXRlIGFic3RyYWN0XG5cdFx0ICogdG9wLWxldmVsIGNvbnRhaW5lciBicmFuY2hlcy5cblx0XHQgKiBcblx0XHQgKiBUaGlzIGZ1bmN0aW9uIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBieSBsaWJyYXJpZXMgdGhhdCB1c2UgdGhlXG5cdFx0ICogY29udGFpbmVyIG5hbWVzcGFjZSB2YXJpYW50LlxuXHRcdCAqL1xuXHRcdGNyZWF0ZUNvbnRhaW5lcj86ICgpID0+IElCcmFuY2g7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0YXR0YWNoQXRvbWljKGF0b21pYzogYW55LCBicmFuY2g6IElCcmFuY2gsIHJlZjogUmVmKTogdm9pZDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRkZXRhY2hBdG9taWMoYXRvbWljOiBhbnksIGJyYW5jaDogSUJyYW5jaCk6IHZvaWQ7XG5cblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRzd2FwQnJhbmNoZXMoYnJhbmNoMTogSUJyYW5jaCwgYnJhbmNoMjogSUJyYW5jaCk6IHZvaWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0cmVwbGFjZUJyYW5jaChicmFuY2gxOiBJQnJhbmNoLCBicmFuY2gyOiBJQnJhbmNoKTogdm9pZDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRhdHRhY2hBdHRyaWJ1dGUoYnJhbmNoOiBJQnJhbmNoLCBrZXk6IHN0cmluZywgdmFsdWU6IGFueSk6IHZvaWQ7XG5cdFx0XHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGRldGFjaEF0dHJpYnV0ZShicmFuY2g6IElCcmFuY2gsIGtleTogc3RyaW5nKTogdm9pZDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIGNhbiBoaWphY2sgdGhlIG9uKCksIG9uY2UoKSBhbmQgb25seSgpIGZ1bmN0aW9uc1xuXHRcdCAqIHRvIHByb3ZpZGUgdGhlaXIgb3duIGN1c3RvbSBiZWhhdmlvciBieSBvdmVycmlkaW5nIHRoaXMgbWV0aG9kLlxuXHRcdCAqIFxuXHRcdCAqIElmIHRoZSBtZXRob2QgcmV0dXJucyB1bmRlZmluZWQsIHRoZSByZWN1cnJlbnQgZnVuY3Rpb24gY3JlYXRpb25cblx0XHQgKiBmYWNpbGl0aWVzIGJ1aWx0IGludG8gdGhlIFJlZmxleCBDb3JlIGFyZSB1c2VkLlxuXHRcdCAqL1xuXHRcdGNyZWF0ZVJlY3VycmVudD86IChcblx0XHRcdGtpbmQ6IFJlY3VycmVudEtpbmQsXG5cdFx0XHRzZWxlY3RvcjogYW55LFxuXHRcdFx0Y2FsbGJhY2s6IFJlY3VycmVudENhbGxiYWNrPEF0b21pY3M+LFxuXHRcdFx0cmVzdDogYW55W10pID0+IGFueVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgdGhhdCBjb250cmlidXRlIHRvIHRoZSBnbG9iYWwgb24oKSBmdW5jdGlvblxuXHRcdCAqIG11c3QgcHJvdmlkZSBhbiBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBtZXRob2QuXG5cdFx0ICogXG5cdFx0ICogTGlicmFyaWVzIG11c3QgaW1wbGVtZW50IHRoaXMgZnVuY3Rpb24gaW4gb3JkZXIgdG8gcHJvdmlkZSB0aGVpciBvd25cblx0XHQgKiBob29rcyBpbnRvIHRoZSBnbG9iYWwgcmVjdXJyZW50IGZ1bmN0aW9ucyAoc3VjaCBhcyBvbigpLCBvbmx5KCkgYW5kIG9uY2UoKSkuXG5cdFx0ICogXG5cdFx0ICogSWYgdGhlIGxpYnJhcnkgZG9lcyBub3QgcmVjb2duaXplIHRoZSBzZWxlY3RvciBwcm92aWRlZCwgaXQgc2hvdWxkXG5cdFx0ICogcmV0dXJuIGZhbHNlLCBzbyB0aGF0IHRoZSBSZWZsZXggZW5naW5lIGNhbiBmaW5kIGFub3RoZXIgcGxhY2UgdG9cblx0XHQgKiBwZXJmb3JtIHRoZSBhdHRhY2htZW50LiBJbiBvdGhlciBjYXNlcywgaXQgc2hvdWxkIHJldHVybiB0cnVlLlxuXHRcdCAqL1xuXHRcdGF0dGFjaFJlY3VycmVudD86IChcblx0XHRcdGtpbmQ6IFJlY3VycmVudEtpbmQsXG5cdFx0XHR0YXJnZXQ6IElCcmFuY2gsXG5cdFx0XHRzZWxlY3RvcjogYW55LFxuXHRcdFx0Y2FsbGJhY2s6IFJlY3VycmVudENhbGxiYWNrPEF0b21pY3M+LFxuXHRcdFx0cmVzdDogYW55W10pID0+IGJvb2xlYW47XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyB0aGF0IGNvbnRyaWJ1dGUgdG8gdGhlIGdsb2JhbCBvZmYoKSBmdW5jdGlvblxuXHRcdCAqIG11c3QgcHJvdmlkZSBhbiBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBtZXRob2QuXG5cdFx0ICovXG5cdFx0ZGV0YWNoUmVjdXJyZW50PzogKFxuXHRcdFx0YnJhbmNoOiBJQnJhbmNoLFxuXHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdGNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9taWNzPikgPT4gdm9pZDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIGNhbiBpbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiBpbiBvcmRlclxuXHRcdCAqIHRvIGNhcHR1cmUgdGhlIGZsb3cgb2YgYnJhbmNoZXMgYmVpbmcgcGFzc2VkIGFzXG5cdFx0ICogYXRvbWljcyB0byBvdGhlciBicmFuY2ggZnVuY3Rpb25zLlxuXHRcdCAqL1xuXHRcdGhhbmRsZUJyYW5jaEZ1bmN0aW9uPzogKFxuXHRcdFx0YnJhbmNoOiBJQnJhbmNoLFxuXHRcdFx0YnJhbmNoRm46ICguLi5hdG9taWNzOiBhbnlbXSkgPT4gSUJyYW5jaCkgPT4gdm9pZDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIGNhbiBpbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiBpbiBvcmRlciB0byBwcm9jZXNzXG5cdFx0ICogYSBicmFuY2ggYmVmb3JlIGl0J3MgcmV0dXJuZWQgZnJvbSBhIGJyYW5jaCBmdW5jdGlvbi4gV2hlbiB0aGlzXG5cdFx0ICogZnVuY3Rpb24gaXMgaW1wbGVtZW50ZWQsIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGJyYW5jaCBmdW5jdGlvbnNcblx0XHQgKiBhcmUgcmVwbGFjZWQgd2l0aCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoaXMgZnVuY3Rpb24uIFJlZmxleGl2ZSBsaWJyYXJpZXNcblx0XHQgKiB0aGF0IHJlcXVpcmUgdGhlIHN0YW5kYXJkIGJlaGF2aW9yIG9mIHJldHVybmluZyBicmFuY2hlcyBmcm9tIHRoZVxuXHRcdCAqIGJyYW5jaCBmdW5jdGlvbnMgc2hvdWxkIHJldHVybiB0aGUgYGJyYW5jaGAgYXJndW1lbnQgdG8gdGhpcyBmdW5jdGlvblxuXHRcdCAqIHZlcmJhdGltLlxuXHRcdCAqL1xuXHRcdHJldHVybkJyYW5jaD86IChicmFuY2g6IElCcmFuY2gpID0+IHN0cmluZyB8IG51bWJlciB8IGJpZ2ludCB8IG9iamVjdDtcblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0bGV0IG5leHRWYWwgPSAwO1xuXHRsZXQgbmV4dFRpbWVzdGFtcCA9IDA7XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGNvbnN0IGVudW0gTG9jYXRvclR5cGVcblx0e1xuXHRcdGJyYW5jaCA9IDAsXG5cdFx0bGVhZiA9IDEsXG5cdFx0c3RyZWFtID0gMlxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGNsYXNzIExvY2F0b3Jcblx0e1xuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgYSBmdWxseSBmb3JtZWQgTG9jYXRvciBvYmplY3QgZnJvbSBpdCdzIHNlcmlhbGl6ZWQgcmVwcmVzZW50YXRpb24uXG5cdFx0ICovXG5cdFx0c3RhdGljIHBhcnNlKHNlcmlhbGl6ZWRMb2NhdG9yOiBzdHJpbmcpXG5cdFx0e1xuXHRcdFx0Y29uc3QgcGFydHMgPSBzZXJpYWxpemVkTG9jYXRvci5zcGxpdCgvW3w+XS9nKTtcblx0XHRcdGNvbnN0IHR5cGUgPSA8TG9jYXRvclR5cGU+cGFyc2VJbnQocGFydHMuc2hpZnQoKSB8fCBcIjBcIiwgMTApIHx8IExvY2F0b3JUeXBlLmJyYW5jaDtcblx0XHRcdGNvbnN0IGxvY2F0b3IgPSBuZXcgTG9jYXRvcih0eXBlKTtcblx0XHRcdGxvY2F0b3IuaG9tZVRpbWVzdGFtcCA9IHBhcnNlSW50KHBhcnRzLnNoaWZ0KCkgfHwgXCIwXCIsIDEwKSB8fCAwO1xuXHRcdFx0bG9jYXRvci52YWx1ZXMucHVzaCguLi5wYXJ0cy5tYXAocCA9PiBwYXJzZUludChwLCAxMCkgfHwgMCkpO1xuXHRcdFx0cmV0dXJuIGxvY2F0b3I7XG5cdFx0fVxuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKHJlYWRvbmx5IHR5cGU6IExvY2F0b3JUeXBlKSB7IH1cblx0XHRcblx0XHQvKiogKi9cblx0XHR0b1N0cmluZygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0dGhpcy50eXBlICsgXCJ8XCIgK1xuXHRcdFx0XHR0aGlzLmhvbWVUaW1lc3RhbXAgKyBcInxcIiArXG5cdFx0XHRcdHRoaXMudmFsdWVzLmpvaW4oXCI+XCIpXG5cdFx0XHQpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgYmVsb3cgYXJyYXkgaXMgaW5pdGlhbGl6ZWQgdG8gZW1wdHkgd2hlbiB0aGUgTG9jYXRvciBpbnN0YW5jZVxuIFx0XHQgKiBpcyBpbnN0YW50aWF0ZWQuIFRoaXMgaXMgYmVjYXVzZSB3aGVuIGxvY2F0b3JzIGFyZSBmaXJzdCBpbnN0YW50aWF0ZWQsXG4gXHRcdCAqIHRoZXkgcmVmZXIgdG8gbWV0YXMgdGhhdCBhcmUgZmxvYXRpbmcgaW4gbGltYm8gLS0gdGhleSdyZSBub3QgYXR0YWNoZWRcbiBcdFx0ICogdG8gYW55dGhpbmcuIExvY2F0b3IgdmFsdWVzIG9ubHkgYmVjb21lIHJlbGV2YW50IGF0IHRoZSBwb2ludCB3aGVuXG4gXHRcdCAqIHRoZXkgYXJlIGF0dGFjaGVkIHRvIHNvbWUgY29udGFpbmluZyBtZXRhLCBiZWNhdXNlIG90aGVyd2lzZSwgaXQnc1xuIFx0XHQgKiBub3QgcG9zc2libGUgZm9yIHRoZSBsb2NhdG9yIHRvIHJlZmVyIHRvIGEgbWV0YSB0aGF0IGhhcyBcInNpYmxpbmdzXCIsIFxuIFx0XHQgKiB3aGljaCBpcyB0aGUgZW50aXJlIHBvaW50IG9mIHRoZSBMb2NhdG9yIGNvbmNlcHQuXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSB2YWx1ZXM6IG51bWJlcltdID0gW107XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0c2V0TGFzdExvY2F0b3JWYWx1ZSh2YWx1ZTogbnVtYmVyKVxuXHRcdHtcblx0XHRcdHRoaXMudmFsdWVzW3RoaXMudmFsdWVzLmxlbmd0aCAtIDFdID0gdmFsdWU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGdldGxhc3RMb2NhdG9yVmFsdWUoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnZhbHVlc1t0aGlzLnZhbHVlcy5sZW5ndGggLSAxXTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGltZXN0YW1wcyBhcmUgYXR0YWNoZWQgdG8gZWFjaCBtZXRhLiBUaGV5IGFyZSBvbmx5IHVzZWQgdG8gZGV0ZXJtaW5lXG5cdFx0ICogd2hldGhlciB0d28gbWV0YXMgb3JpZ2luYXRlZCBpbiB0aGUgc2FtZSBjb250YWluZXIuIFdoZW4gaXRlcmF0aW5nXG5cdFx0ICogdGhyb3VnaCBhIG1ldGEncyBjaGlsZHJlbiwgaXRzIHBvc3NpYmxlIHRoYXQgc29tZSBvZiB0aGUgbWV0YXMgd2VyZSBtb3ZlZFxuXHRcdCAqIGluIGFzIHNpYmxpbmdzIGF0IHJ1bnRpbWUuIFRpbWVzdGFtcHMgYXJlIHVzZWQgdG8gbWFrZSBzdXJlIHRoZXNlIGZvcmVpZ25cblx0XHQgKiBtZXRhcyBhcmUgb21pdHRlZCB3aGVuIGRvaW5nIHRoZXNlIGl0ZXJhdGlvbnMuXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSByZWFkb25seSB0aW1lc3RhbXAgPSArK25leHRUaW1lc3RhbXA7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIHRoZSB0aW1lc3RhbXAgb2YgdGhlIGJyYW5jaCB0aGF0IHdhcyB0aGUgb3JpZ2luYWwgXCJob21lXCIgb2Zcblx0XHQgKiB0aGUgYnJhbmNoIHRoYXQgdGhpcyBsb2NhdG9yIHJlZmVycyB0by4gXCJIb21lXCIgaW4gdGhpcyBjYXNlIG1lYW5zIHRoZVxuXHRcdCAqIGJyYW5jaCB3aGVyZSBpdCB3YXMgb3JpZ2luYWxseSBhcHBlbmRlZC4gSW4gdGhlIGNhc2Ugd2hlbiB0aGUgbG9jYXRvclxuXHRcdCAqIGhhc24ndCBiZWVuIGFwcGVuZGVkIGFueXdoZXJlLCB0aGUgdmFsdWUgaXMgMC5cblx0XHQgKi9cblx0XHRwcml2YXRlIGhvbWVUaW1lc3RhbXAgPSAwO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHNldENvbnRhaW5lcihjb250YWluZXJMb2M6IExvY2F0b3IpXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMuaG9tZVRpbWVzdGFtcCAhPT0gMClcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XG5cdFx0XHRpZiAoQ29uc3QuZGVidWcgJiYgdGhpcy52YWx1ZXMubGVuZ3RoID4gMClcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiP1wiKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgdmFsID0gKytuZXh0VmFsO1xuXHRcdFx0XG5cdFx0XHRpZiAoY29udGFpbmVyTG9jLnR5cGUgPT09IExvY2F0b3JUeXBlLnN0cmVhbSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5ob21lVGltZXN0YW1wID0gY29udGFpbmVyTG9jLmhvbWVUaW1lc3RhbXA7XG5cdFx0XHRcdHRoaXMudmFsdWVzLnB1c2goLi4uY29udGFpbmVyTG9jLnZhbHVlcywgdmFsKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGNvbnRhaW5lckxvYy50eXBlID09PSBMb2NhdG9yVHlwZS5icmFuY2gpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuaG9tZVRpbWVzdGFtcCA9IGNvbnRhaW5lckxvYy50aW1lc3RhbXA7XG5cdFx0XHRcdHRoaXMudmFsdWVzLnB1c2godmFsKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKENvbnN0LmRlYnVnICYmIGNvbnRhaW5lckxvYy50eXBlID09PSBMb2NhdG9yVHlwZS5sZWFmKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCI/XCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRjb21wYXJlKG90aGVyOiBMb2NhdG9yKTogQ29tcGFyZVJlc3VsdFxuXHRcdHtcblx0XHRcdC8vIERldGVjdCBhIHBvdGVudGlhbCBjb21wYXJpc29uIHdpdGggYSBmbG9hdGluZyBtZXRhXG5cdFx0XHRpZiAodGhpcy5ob21lVGltZXN0YW1wID09PSAwIHx8IG90aGVyLmhvbWVUaW1lc3RhbXAgPT09IDApXG5cdFx0XHRcdHJldHVybiBDb21wYXJlUmVzdWx0LmluY29tcGFyYWJsZTtcblx0XHRcdFxuXHRcdFx0Ly8gRGV0ZWN0IGRpZmZlcmluZyBvcmlnaW5hdGluZyBjb250YWluZXJzXG5cdFx0XHRpZiAodGhpcy5ob21lVGltZXN0YW1wICE9PSBvdGhlci5ob21lVGltZXN0YW1wKVxuXHRcdFx0XHRyZXR1cm4gQ29tcGFyZVJlc3VsdC5pbmNvbXBhcmFibGU7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHRoaXNMYXN0ID0gdGhpcy52YWx1ZXNbdGhpcy52YWx1ZXMubGVuZ3RoIC0gMV07XG5cdFx0XHRjb25zdCBvdGhlckxhc3QgPSBvdGhlci52YWx1ZXNbb3RoZXIudmFsdWVzLmxlbmd0aCAtIDFdO1xuXHRcdFx0XG5cdFx0XHQvLyBEZXRlY3Qgc2ltcGxlIGVxdWFsaXR5XG5cdFx0XHRpZiAodGhpc0xhc3QgPT09IG90aGVyTGFzdClcblx0XHRcdFx0cmV0dXJuIENvbXBhcmVSZXN1bHQuZXF1YWw7XG5cdFx0XHRcblx0XHRcdC8vIFdlJ3JlIHJ1bm5pbmcgYSBjb21wYXJpc29uIG9uIHRoZSBjb21tb24gcG9ydGlvbiBvZiB0aGVcblx0XHRcdC8vIHR3byBudW1iZXIgc2VxdWVuY2VzLiBJZiB0aGUgb25lIGlzIGxvbmdlciB0aGFuIHRoZSBvdGhlcixcblx0XHRcdC8vIGl0J3Mgbm90IGNvbnNpZGVyZWQgaGVyZS5cblx0XHRcdGNvbnN0IG1pbkxlbiA9IE1hdGgubWluKHRoaXMudmFsdWVzLmxlbmd0aCwgb3RoZXIudmFsdWVzLmxlbmd0aCk7XG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgbWluTGVuOylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdGhpc1ZhbCA9IHRoaXMudmFsdWVzW2ldO1xuXHRcdFx0XHRjb25zdCBvdGhlclZhbCA9IG90aGVyLnZhbHVlc1tpXTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICh0aGlzVmFsIDwgb3RoZXJWYWwpXG5cdFx0XHRcdFx0cmV0dXJuIENvbXBhcmVSZXN1bHQuaGlnaGVyO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKHRoaXNWYWwgPiBvdGhlclZhbClcblx0XHRcdFx0XHRyZXR1cm4gQ29tcGFyZVJlc3VsdC5sb3dlcjtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Ly8gVGhlIGNvZGUgYmVsb3cgaGFuZGxlcyB0aGUgY2FzZSB3aGVuIHdlIGhhdmUgdHdvIHNlcXVlbmNlc1xuXHRcdFx0Ly8gb2YgdmFsdWVzLCB3aGVyZSB0aGUgb25lIHNlcXVlbmNlcyBpcyBiYXNpY2FsbHkgYW4gZXh0ZW5zaW9uIG9mIHRoZVxuXHRcdFx0Ly8gb3RoZXIsIHVsdGltYXRlbHkgbG9va2luZyBzb21ldGhpbmcgbGlrZSB0aGlzOlxuXHRcdFx0Ly8gXG5cdFx0XHQvLyAxPjJcblx0XHRcdC8vIDE+Mj4zPjRcblx0XHRcdC8vIFxuXHRcdFx0Ly8gSW4gdGhpcyBjYXNlLCB0aGUgc2hvcnRlciBzZXF1ZW5jZSBpcyBjb25zaWRlcmVkIFwibG93ZXJcIiB0aGFuIHRoZVxuXHRcdFx0Ly8gbG9uZ2VyIG9uZSwgYmVjYXVzZSBpbiB0aGlzIGNhc2UsIHRoZSBjb25zdW1lcnMgb2YgdGhpcyBtZXRob2QgYXJlXG5cdFx0XHQvLyBiYXNpY2FsbHkgdHJ5aW5nIHRvIFwiZ2V0IHRvIHRoZSBlbmQgb2YgYWxsIHRoZSAxPjInc1wiLCBhbmQgdXNpbmcgMT4yXG5cdFx0XHQvLyBhcyB0aGUgaW5wdXQgdG8gY29tbXVuaWNhdGUgdGhhdC5cblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMudmFsdWVzLmxlbmd0aCA+IG90aGVyLnZhbHVlcy5sZW5ndGgpXG5cdFx0XHRcdHJldHVybiBDb21wYXJlUmVzdWx0LmhpZ2hlcjtcblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMudmFsdWVzLmxlbmd0aCA8IG90aGVyLnZhbHVlcy5sZW5ndGgpXG5cdFx0XHRcdHJldHVybiBDb21wYXJlUmVzdWx0Lmxvd2VyO1xuXHRcdFx0XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCI/XCIpO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBjb25zdCBlbnVtIENvbXBhcmVSZXN1bHRcblx0e1xuXHRcdGVxdWFsLFxuXHRcdGluY29tcGFyYWJsZSxcblx0XHRoaWdoZXIsXG5cdFx0bG93ZXJcblx0fVx0XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHRleHBvcnQgdHlwZSBDb25zdHJ1Y3RCcmFuY2hGbiA9ICguLi5hcmdzOiBhbnlbXSkgPT4gSUJyYW5jaDtcblx0XG5cdC8qKiBAaW50ZXJuYWwgKi9cblx0ZGVjbGFyZSBjb25zdCBEZW5vOiBhbnk7XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBBc0xpYnJhcnk8VCwgTCBleHRlbmRzIElMaWJyYXJ5PiA9IFxuXHRcdFQgJlxuXHRcdFN0YXRpY0JyYW5jaGVzT2Y8TD4gJlxuXHRcdFN0YXRpY05vbkJyYW5jaGVzT2Y8TD47XG5cdFxuXHQvKipcblx0ICogQ3JlYXRlcyBhIFJlZmxleCBuYW1lc3BhY2UsIHdoaWNoIGlzIHRoZSB0b3AtbGV2ZWwgZnVuY3Rpb24gb2JqZWN0IHRoYXRcblx0ICogaG9sZHMgYWxsIGZ1bmN0aW9ucyBpbiB0aGUgcmVmbGV4aXZlIGxpYnJhcnkuXG5cdCAqIFxuXHQgKiBUaGlzIGZ1bmN0aW9uIGNyZWF0ZXMgdGhlIFwiY29udGVudFwiIHZhcmlhbnQgb2YgYSBSZWZsZXggbmFtZXNwYWNlLCB3aGljaFxuXHQgKiBpcyB0aGUgc3R5bGUgd2hlcmUgdGhlIG5hbWVzcGFjZSwgd2hlbiBjYWxsZWQgYXMgYSBmdW5jdGlvbiwgcHJvZHVjZXNcblx0ICogdmlzdWFsIGNvbnRlbnQgdG8gZGlzcGxheS4gUmVmbGV4aXZlIGxpYnJhcmllcyB0aGF0IHVzZSB0aGlzIHZhcmlhbnQgbWF5XG5cdCAqIHVzZSB0aGUgbmFtZXNwYWNlIGFzIGEgdGFnZ2VkIHRlbXBsYXRlIGZ1bmN0aW9uLCBmb3IgZXhhbXBsZTpcblx0ICogbWxgTGl0ZXJhbCB0ZXh0IGNvbnRlbnRgO1xuXHQgKiBcblx0ICogQHBhcmFtIGxpYnJhcnkgQW4gb2JqZWN0IHRoYXQgaW1wbGVtZW50cyB0aGUgSUxpYnJhcnkgaW50ZXJmYWNlLFxuXHQgKiBmcm9tIHdoaWNoIHRoZSBuYW1lc3BhY2Ugb2JqZWN0IHdpbGwgYmUgZ2VuZXJhdGVkLlxuXHQgKiBcblx0ICogQHBhcmFtIGdsb2JhbGl6ZSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgb24vb25jZS9vbmx5IGdsb2JhbHMgc2hvdWxkXG5cdCAqIGJlIGFwcGVuZGVkIHRvIHRoZSBnbG9iYWwgb2JqZWN0ICh3aGljaCBpcyBhdXRvLWRldGVjdGVkIGZyb20gdGhlXG5cdCAqIGN1cnJlbnQgZW52aXJvbm1lbnQuIElmIHRoZSBJTGlicmFyeSBpbnRlcmZhY2UgcHJvdmlkZWQgZG9lc24ndCBzdXBwb3J0XG5cdCAqIHRoZSBjcmVhdGlvbiBvZiByZWN1cnJlbnQgZnVuY3Rpb25zLCB0aGlzIHBhcmFtZXRlciBoYXMgbm8gZWZmZWN0LlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbnRlbnROYW1lc3BhY2Vcblx0XHQ8VCBleHRlbmRzIElDb250ZW50TmFtZXNwYWNlPGFueSwgYW55PiwgTCBleHRlbmRzIElMaWJyYXJ5Pihcblx0XHRsaWJyYXJ5OiBMLFxuXHRcdGdsb2JhbGl6ZT86IGJvb2xlYW4pOiBBc0xpYnJhcnk8VCwgTD5cblx0e1xuXHRcdGlmIChDb25zdC5kZWJ1ZyAmJiAhbGlicmFyeS5jcmVhdGVDb250ZW50KVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhlIC5jcmVhdGVDb250ZW50IGZ1bmN0aW9uIG11c3QgYmUgaW1wbGVtZW50ZWQgaW4gdGhpcyBsaWJyYXJ5LlwiKTtcblx0XHRcblx0XHRyZXR1cm4gY3JlYXRlTmFtZXNwYWNlKHRydWUsIGxpYnJhcnksIGdsb2JhbGl6ZSk7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEgUmVmbGV4IG5hbWVzcGFjZSwgd2hpY2ggaXMgdGhlIHRvcC1sZXZlbCBmdW5jdGlvbiBvYmplY3QgdGhhdFxuXHQgKiBob2xkcyBhbGwgZnVuY3Rpb25zIGluIHRoZSByZWZsZXhpdmUgbGlicmFyeS5cblx0ICogXG5cdCAqIFRoaXMgZnVuY3Rpb24gY3JlYXRlcyB0aGUgXCJjb250YWluZXJcIiB2YXJpYW50IG9mIGEgUmVmbGV4IG5hbWVzcGFjZSwgd2hpY2hcblx0ICogaXMgdGhlIHN0eWxlIHdoZXJlIHRoZSBuYW1lc3BhY2UsIHdoZW4gY2FsbGVkIGFzIGEgZnVuY3Rpb24sIHByb2R1Y2VzXG5cdCAqIGFuIGFic3RyYWN0IHRvcC1sZXZlbCBjb250YWluZXIgb2JqZWN0LlxuXHQgKiBcblx0ICogQHBhcmFtIGxpYnJhcnkgQW4gb2JqZWN0IHRoYXQgaW1wbGVtZW50cyB0aGUgSUxpYnJhcnkgaW50ZXJmYWNlLFxuXHQgKiBmcm9tIHdoaWNoIHRoZSBuYW1lc3BhY2Ugb2JqZWN0IHdpbGwgYmUgZ2VuZXJhdGVkLlxuXHQgKiBcblx0ICogQHBhcmFtIGdsb2JhbGl6ZSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgb24vb25jZS9vbmx5IGdsb2JhbHMgc2hvdWxkXG5cdCAqIGJlIGFwcGVuZGVkIHRvIHRoZSBnbG9iYWwgb2JqZWN0ICh3aGljaCBpcyBhdXRvLWRldGVjdGVkIGZyb20gdGhlXG5cdCAqIGN1cnJlbnQgZW52aXJvbm1lbnQuIElmIHRoZSBJTGlicmFyeSBpbnRlcmZhY2UgcHJvdmlkZWQgZG9lc24ndCBzdXBwb3J0XG5cdCAqIHRoZSBjcmVhdGlvbiBvZiByZWN1cnJlbnQgZnVuY3Rpb25zLCB0aGlzIHBhcmFtZXRlciBoYXMgbm8gZWZmZWN0LlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbnRhaW5lck5hbWVzcGFjZVxuXHRcdDxUIGV4dGVuZHMgSUNvbnRhaW5lck5hbWVzcGFjZTxhbnksIGFueT4sIEwgZXh0ZW5kcyBJTGlicmFyeT4oXG5cdFx0bGlicmFyeTogTCxcblx0XHRnbG9iYWxpemU/OiBib29sZWFuKTogQXNMaWJyYXJ5PFQsIEw+XG5cdHtcblx0XHRpZiAoQ29uc3QuZGVidWcgJiYgIWxpYnJhcnkuY3JlYXRlQ29udGFpbmVyKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiVGhlIC5jcmVhdGVDb250YWluZXIgZnVuY3Rpb24gbXVzdCBiZSBpbXBsZW1lbnRlZCBpbiB0aGlzIGxpYnJhcnkuXCIpO1xuXHRcdFxuXHRcdHJldHVybiBjcmVhdGVOYW1lc3BhY2UoZmFsc2UsIGxpYnJhcnksIGdsb2JhbGl6ZSk7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBJbnRlcm5hbCBuYW1lc3BhY2Ugb2JqZWN0IGNyZWF0aW9uIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZnVuY3Rpb24gY3JlYXRlTmFtZXNwYWNlPFROYW1lc3BhY2UsIFRMaWJyYXJ5IGV4dGVuZHMgSUxpYnJhcnk+KFxuXHRcdGlzQ29udGVudDogYm9vbGVhbixcblx0XHRsaWJyYXJ5OiBUTGlicmFyeSxcblx0XHRnbG9iYWxpemU/OiBib29sZWFuKTogQXNMaWJyYXJ5PFROYW1lc3BhY2UsIFRMaWJyYXJ5PlxuXHR7XG5cdFx0Um91dGluZ0xpYnJhcnkuYWRkTGlicmFyeShsaWJyYXJ5KTtcblx0XHRcblx0XHRjb25zdCBnbG9iOiBhbnkgPVxuXHRcdFx0IWdsb2JhbGl6ZSA/IG51bGwgOlxuXHRcdFx0Ly8gTm9kZS5qc1xuXHRcdFx0KHR5cGVvZiBnbG9iYWwgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIGdsb2JhbC5zZXRUaW1lb3V0ID09PSBcImZ1bmN0aW9uXCIpID8gZ2xvYmFsIDpcblx0XHRcdC8vIEJyb3dzZXIgLyBEZW5vXG5cdFx0XHQodHlwZW9mIG5hdmlnYXRvciA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgRGVubyA9PT0gXCJvYmplY3RcIikgPyB3aW5kb3cgOlxuXHRcdFx0bnVsbDtcblx0XHRcblx0XHQvLyBXZSBjcmVhdGUgdGhlIG9uLCBvbmNlLCBhbmQgb25seSBnbG9iYWxzIGluIHRoZSBjYXNlIHdoZW4gd2UncmUgY3JlYXRpbmdcblx0XHQvLyBhIG5hbWVzcGFjZSBvYmplY3QgZm9yIGEgbGlicmFyeSB0aGF0IHN1cHBvcnRzIHJlY3VycmVudCBmdW5jdGlvbnMuXG5cdFx0aWYgKGdsb2IgJiYgbGlicmFyeS5hdHRhY2hSZWN1cnJlbnQpXG5cdFx0e1xuXHRcdFx0Y29uc3QgY3JlYXRlR2xvYmFsID0gKGtpbmQ6IFJlY3VycmVudEtpbmQpID0+IChcblx0XHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdFx0Y2FsbGJhY2s6IFJlY3VycmVudENhbGxiYWNrPEF0b21pY3M8YW55Pj4sXG5cdFx0XHRcdC4uLnJlc3Q6IGFueVtdKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRpZiAobGlicmFyeS5jcmVhdGVSZWN1cnJlbnQpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBjdXN0b21SZWN1cnJlbnQgPSBsaWJyYXJ5LmNyZWF0ZVJlY3VycmVudChraW5kLCBzZWxlY3RvciwgY2FsbGJhY2ssIHJlc3QpO1xuXHRcdFx0XHRcdGlmIChjdXN0b21SZWN1cnJlbnQgIT09IHVuZGVmaW5lZClcblx0XHRcdFx0XHRcdHJldHVybiBjdXN0b21SZWN1cnJlbnQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdC8vIFdlIGNvdWxkIHBhcnNlIHRoZSBzZWxlY3RvciBoZXJlLCBzZWUgaWYgeW91IGhhdmUgYW55IG9uLW9uJ3MsXG5cdFx0XHRcdC8vIGlmIHlvdSBkbywgY2FsbCB0aGUgZnVuY3Rpb25zIHRvIGF1Z21lbnQgdGhlIHJldHVybiB2YWx1ZS5cblx0XHRcdFx0Ly8gQWx0ZXJuYXRpdmVseSwgd2UgY291bGQgaW5saW5lIHRoZSBzdXBwb3J0IGZvciBmb3JjZSBhcnJheXMuXG5cdFx0XHRcdHJldHVybiBuZXcgUmVjdXJyZW50KGtpbmQsIHNlbGVjdG9yLCBjYWxsYmFjaywgcmVzdCk7XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0XHRpZiAodHlwZW9mIGdsb2Iub24gIT09IFwiZnVuY3Rpb25cIilcblx0XHRcdFx0Z2xvYi5vbiA9IGNyZWF0ZUdsb2JhbChSZWN1cnJlbnRLaW5kLm9uKTtcblx0XHRcdFxuXHRcdFx0aWYgKHR5cGVvZiBnbG9iLm9uY2UgIT09IFwiZnVuY3Rpb25cIilcblx0XHRcdFx0Z2xvYi5vbmNlID0gY3JlYXRlR2xvYmFsKFJlY3VycmVudEtpbmQub25jZSk7XG5cdFx0XHRcblx0XHRcdGlmICh0eXBlb2YgZ2xvYi5vbmx5ICE9PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdGdsb2Iub25seSA9IGNyZWF0ZUdsb2JhbChSZWN1cnJlbnRLaW5kLm9ubHkpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRjb25zdCBzdGF0aWNNZW1iZXJzID0gKCgpID0+XG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RhdGljQnJhbmNoZXMgPSAoKCkgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgYnJhbmNoRm5zOiB7IFtrZXk6IHN0cmluZ106ICguLi5hcmdzOiBhbnkpID0+IGFueTsgfSA9IHt9O1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKGxpYnJhcnkuZ2V0U3RhdGljQnJhbmNoZXMpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhsaWJyYXJ5LmdldFN0YXRpY0JyYW5jaGVzKCkgfHwge30pKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIilcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGNvbnN0IGNvbnN0cnVjdEJyYW5jaEZuOiBDb25zdHJ1Y3RCcmFuY2hGbiA9IHZhbHVlO1xuXHRcdFx0XHRcdFx0YnJhbmNoRm5zW2tleV0gPSBjb25zdHJ1Y3RCcmFuY2hGbi5sZW5ndGggPT09IDAgP1xuXHRcdFx0XHRcdFx0XHRjcmVhdGVCcmFuY2hGbihjb25zdHJ1Y3RCcmFuY2hGbiwga2V5KSA6XG5cdFx0XHRcdFx0XHRcdGNyZWF0ZVBhcmFtZXRpY0JyYW5jaEZuKGNvbnN0cnVjdEJyYW5jaEZuLCBrZXkpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0cmV0dXJuIGJyYW5jaEZucztcblx0XHRcdH0pKCk7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHN0YXRpY05vbkJyYW5jaGVzID0gXG5cdFx0XHRcdGxpYnJhcnkuZ2V0U3RhdGljTm9uQnJhbmNoZXMgP1xuXHRcdFx0XHRcdGxpYnJhcnkuZ2V0U3RhdGljTm9uQnJhbmNoZXMoKSB8fCB7fSA6IHt9O1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGljQnJhbmNoZXMsIHN0YXRpY05vbkJyYW5jaGVzKTtcblx0XHR9KSgpO1xuXHRcdFxuXHRcdGNvbnN0IG5zRm4gPSBpc0NvbnRlbnQgP1xuXHRcdFx0Y3JlYXRlQ29udGVudE5hbWVzcGFjZUZuKGxpYnJhcnkpIDpcblx0XHRcdGNyZWF0ZUNvbnRhaW5lck5hbWVzcGFjZUZuKGxpYnJhcnkpO1xuXHRcdFxuXHRcdGNvbnN0IG5zT2JqID0gKCgpID0+XG5cdFx0e1xuXHRcdFx0Ly8gSW4gdGhlIGNhc2Ugd2hlbiB0aGVyZSBhcmUgbm8gZHluYW1pYyBtZW1iZXJzLCB3ZSBjYW4ganVzdFxuXHRcdFx0Ly8gcmV0dXJuIHRoZSBzdGF0aWMgbmFtZXNwYWNlIG1lbWJlcnMsIGFuZCBhdm9pZCB1c2Ugb2YgUHJveGllc1xuXHRcdFx0Ly8gYWxsIHRvZ2V0aGVyLlxuXHRcdFx0aWYgKCFsaWJyYXJ5LmdldER5bmFtaWNCcmFuY2ggJiYgIWxpYnJhcnkuZ2V0RHluYW1pY05vbkJyYW5jaClcblx0XHRcdFx0cmV0dXJuIDxhbnk+T2JqZWN0LmFzc2lnbihuc0ZuLCBzdGF0aWNNZW1iZXJzKTtcblx0XHRcdFxuXHRcdFx0Ly8gVGhpcyB2YXJpYWJsZSBzdG9yZXMgYW4gb2JqZWN0IHRoYXQgY29udGFpbnMgdGhlIG1lbWJlcnNcblx0XHRcdC8vIHRoYXQgd2VyZSBhdHRhY2hlZCB0byB0aGUgcHJveHkgb2JqZWN0IGFmdGVyIGl0J3MgY3JlYXRpb24uXG5cdFx0XHQvLyBDdXJyZW50bHkgdGhpcyBpcyBvbmx5IGJlaW5nIHVzZWQgYnkgUmVmbGV4TUwgdG8gYXR0YWNoXG5cdFx0XHQvLyB0aGUgXCJlbWl0XCIgZnVuY3Rpb24sIGJ1dCBvdGhlcnMgbWF5IHVzZSBpdCBhc3dlbGwuXG5cdFx0XHRsZXQgYXR0YWNoZWRNZW1iZXJzOiB7IFtrZXk6IHN0cmluZ106IGFueTsgfSB8IG51bGwgPSBudWxsO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gPGFueT5uZXcgUHJveHkobnNGbiwge1xuXHRcdFx0XHRnZXQodGFyZ2V0OiBGdW5jdGlvbiwga2V5OiBzdHJpbmcpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAodHlwZW9mIGtleSAhPT0gXCJzdHJpbmdcIilcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlVua25vd24gcHJvcGVydHkuXCIpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChrZXkgPT09IFwiY2FsbFwiIHx8IGtleSA9PT0gXCJhcHBseVwiKVxuXHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiY2FsbCgpIGFuZCBhcHBseSgpIGFyZSBub3Qgc3VwcG9ydGVkLlwiKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoa2V5IGluIHN0YXRpY01lbWJlcnMpXG5cdFx0XHRcdFx0XHRyZXR1cm4gc3RhdGljTWVtYmVyc1trZXldO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChhdHRhY2hlZE1lbWJlcnMgJiYga2V5IGluIGF0dGFjaGVkTWVtYmVycylcblx0XHRcdFx0XHRcdHJldHVybiBhdHRhY2hlZE1lbWJlcnNba2V5XTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAobGlicmFyeS5nZXREeW5hbWljQnJhbmNoKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGNvbnN0IGJyYW5jaCA9IGxpYnJhcnkuZ2V0RHluYW1pY0JyYW5jaChrZXkpO1xuXHRcdFx0XHRcdFx0aWYgKGJyYW5jaClcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGNyZWF0ZUJyYW5jaEZuKCgpID0+IGJyYW5jaCwga2V5KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKGxpYnJhcnkuZ2V0RHluYW1pY05vbkJyYW5jaClcblx0XHRcdFx0XHRcdHJldHVybiBsaWJyYXJ5LmdldER5bmFtaWNOb25CcmFuY2goa2V5KTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c2V0KHRhcmdldDogRnVuY3Rpb24sIHA6IGFueSwgdmFsdWU6IGFueSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdChhdHRhY2hlZE1lbWJlcnMgfHwgKGF0dGFjaGVkTWVtYmVycyA9IHt9KSlbcF0gPSB2YWx1ZTtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSkoKTtcblx0XHRcblx0XHRuYW1lc3BhY2VPYmplY3RzLnNldChuc09iaiwgbGlicmFyeSk7XG5cdFx0cmV0dXJuIG5zT2JqO1xuXHR9XG5cdFxuXHQvKipcblx0ICogUmV0dXJucyB0aGUgSUxpYnJhcnkgaW5zdGFuY2UgdGhhdCBjb3JyZXNwb25kc1xuXHQgKiB0byB0aGUgc3BlY2lmaWVkIG5hbWVzcGFjZSBvYmplY3QuIFRoaXMgZnVuY3Rpb25cblx0ICogaXMgdXNlZCBmb3IgbGF5ZXJpbmcgUmVmbGV4aXZlIGxpYnJhcmllcyBvbiB0b3Agb2Zcblx0ICogZWFjaCBvdGhlciwgaS5lLiwgdG8gZGVmZXIgdGhlIGltcGxlbWVudGF0aW9uIG9mXG5cdCAqIG9uZSBvZiB0aGUgSUxpYnJhcnkgZnVuY3Rpb25zIHRvIGFub3RoZXIgSUxpYnJhcnlcblx0ICogYXQgYSBsb3dlci1sZXZlbC5cblx0ICogXG5cdCAqIFRoZSB0eXBpbmdzIG9mIHRoZSByZXR1cm5lZCBJTGlicmFyeSBhc3N1bWUgdGhhdFxuXHQgKiBhbGwgSUxpYnJhcnkgZnVuY3Rpb25zIGFyZSBpbXBsZW1lbnRlZCBpbiBvcmRlciB0b1xuXHQgKiBhdm9pZCBleGNlc3NpdmUgXCJwb3NzaWJseSB1bmRlZmluZWRcIiBjaGVja3MuXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gbGlicmFyeU9mKG5hbWVzcGFjZU9iamVjdDogb2JqZWN0KTogRGVmaW5lZDxJTGlicmFyeT5cblx0e1xuXHRcdGNvbnN0IGxpYjogYW55ID0gbmFtZXNwYWNlT2JqZWN0cy5nZXQobmFtZXNwYWNlT2JqZWN0KTtcblx0XHRcblx0XHRpZiAoQ29uc3QuZGVidWcgJiYgIWxpYilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlRoaXMgb2JqZWN0IGRvZXMgbm90IGhhdmUgYW4gYXNzb2NpYXRlZCBSZWZsZXggbGlicmFyeS5cIik7XG5cdFx0XG5cdFx0cmV0dXJuIGxpYjtcblx0fVxuXHRcblx0LyoqICovXG5cdHR5cGUgRGVmaW5lZDxUPiA9IHsgW1AgaW4ga2V5b2YgVF0tPzogVFtQXSB9O1xuXHRcblx0LyoqXG5cdCAqIFN0b3JlcyBhbGwgY3JlYXRlZCBuYW1lc3BhY2Ugb2JqZWN0cywgdXNlZCB0byBwb3dlciB0aGUgLmxpYnJhcnlPZigpIGZ1bmN0aW9uLlxuXHQgKi9cblx0Y29uc3QgbmFtZXNwYWNlT2JqZWN0cyA9IG5ldyBXZWFrTWFwPG9iamVjdCwgSUxpYnJhcnk+KCk7XG5cdFxuXHQvKipcblx0ICogUmV0dXJucyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgZnVuY3Rpb24gb3IgbWV0aG9kXG5cdCAqIHJlZmVycyB0byBhIGJyYW5jaCBmdW5jdGlvbiB0aGF0IHdhcyBjcmVhdGVkIGJ5IGFcblx0ICogcmVmbGV4aXZlIGxpYnJhcnkuXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gaXNCcmFuY2hGdW5jdGlvbihmbjogRnVuY3Rpb24pXG5cdHtcblx0XHRyZXR1cm4gYnJhbmNoRm5zLmhhcyhmbik7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRjb25zdCB0b0JyYW5jaEZ1bmN0aW9uID0gPFQgZXh0ZW5kcyBGdW5jdGlvbj4obmFtZTogc3RyaW5nLCBmbjogVCkgPT5cblx0e1xuXHRcdGlmIChuYW1lKVxuXHRcdHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShmbiwgXCJuYW1lXCIsIHtcblx0XHRcdFx0dmFsdWU6IG5hbWUsXG5cdFx0XHRcdHdyaXRhYmxlOiBmYWxzZSxcblx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdGJyYW5jaEZucy5hZGQoZm4pO1xuXHRcdHJldHVybiBmbjtcblx0fVxuXHRcblx0LyoqIFN0b3JlcyB0aGUgc2V0IG9mIGFsbCBicmFuY2ggZnVuY3Rpb25zIGNyZWF0ZWQgYnkgYWxsIHJlZmxleGl2ZSBsaWJyYXJpZXMuICovXG5cdGNvbnN0IGJyYW5jaEZucyA9IG5ldyBXZWFrU2V0PEZ1bmN0aW9uPigpO1xuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0Y29uc3QgY3JlYXRlQnJhbmNoRm4gPSAoY29uc3RydWN0QnJhbmNoRm46ICgpID0+IElCcmFuY2gsIG5hbWU6IHN0cmluZykgPT5cblx0XHR0b0JyYW5jaEZ1bmN0aW9uKG5hbWUsICguLi5hdG9taWNzOiBBdG9taWNbXSkgPT5cblx0XHRcdHJldHVybkJyYW5jaChjb25zdHJ1Y3RCcmFuY2hGbigpLCBhdG9taWNzKSk7XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRjb25zdCBjcmVhdGVQYXJhbWV0aWNCcmFuY2hGbiA9IChicmFuY2hGbjogKC4uLmFyZ3M6IGFueVtdKSA9PiBJQnJhbmNoLCBuYW1lOiBzdHJpbmcpID0+XG5cdFx0KC4uLmNvbnN0cnVjdEJyYW5jaEFyZ3M6IGFueVtdKSA9PlxuXHRcdFx0dG9CcmFuY2hGdW5jdGlvbihuYW1lLCAoLi4uYXRvbWljczogQXRvbWljW10pID0+XG5cdFx0XHRcdHJldHVybkJyYW5jaChicmFuY2hGbihjb25zdHJ1Y3RCcmFuY2hBcmdzKSwgYXRvbWljcykpO1xuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZnVuY3Rpb24gcmV0dXJuQnJhbmNoKGJyYW5jaDogSUJyYW5jaCwgYXRvbWljczogYW55W10pXG5cdHtcblx0XHRuZXcgQnJhbmNoTWV0YShicmFuY2gsIGF0b21pY3MpO1xuXHRcdGNvbnN0IGxpYiA9IFJvdXRpbmdMaWJyYXJ5LnRoaXM7XG5cdFx0cmV0dXJuIGxpYi5yZXR1cm5CcmFuY2ggP1xuXHRcdFx0bGliLnJldHVybkJyYW5jaChicmFuY2gpIDpcblx0XHRcdGJyYW5jaDtcblx0fVxuXHRcblx0LyoqXG5cdCAqIENyZWF0ZXMgdGhlIGZ1bmN0aW9uIHRoYXQgZXhpc3RzIGF0IHRoZSB0b3Agb2YgdGhlIGxpYnJhcnksXG5cdCAqIHdoaWNoIGlzIHVzZWQgZm9yIGluc2VydGluZyB0ZXh0dWFsIGNvbnRlbnQgaW50byB0aGUgdHJlZS5cblx0ICovXG5cdGZ1bmN0aW9uIGNyZWF0ZUNvbnRlbnROYW1lc3BhY2VGbihsaWJyYXJ5OiBJTGlicmFyeSlcblx0e1xuXHRcdHJldHVybiAoXG5cdFx0XHR0ZW1wbGF0ZTogVGVtcGxhdGVTdHJpbmdzQXJyYXkgfCBTdGF0ZWZ1bEZvcmNlLFxuXHRcdFx0Li4udmFsdWVzOiAoSUJyYW5jaCB8IFN0YXRlZnVsRm9yY2UpW10pOiBhbnkgPT5cblx0XHR7XG5cdFx0XHRjb25zdCBhcnJheSA9IEFycmF5LmlzQXJyYXkodGVtcGxhdGUpID9cblx0XHRcdFx0dGVtcGxhdGUgOlxuXHRcdFx0XHRbdGVtcGxhdGVdO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBvdXQ6IG9iamVjdFtdID0gW107XG5cdFx0XHRjb25zdCBsZW4gPSBhcnJheS5sZW5ndGggKyB2YWx1ZXMubGVuZ3RoO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBjcmVhdGVDb250ZW50ID0gbGlicmFyeS5jcmVhdGVDb250ZW50O1xuXHRcdFx0aWYgKCFjcmVhdGVDb250ZW50KVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcblx0XHRcdC8vIFRPRE86IFRoaXMgc2hvdWxkIGJlIG9wdGltaXplZCBzbyB0aGF0IG11bHRpcGxlXG5cdFx0XHQvLyByZXBlYXRpbmcgc3RyaW5nIHZhbHVlcyBkb24ndCByZXN1bHQgaW4gdGhlIGNyZWF0aW9uXG5cdFx0XHQvLyBvZiBtYW55IENvbnRlbnRNZXRhIG9iamVjdHMuXG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgbGVuOylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdmFsID0gaSAlIDIgPT09IDAgP1xuXHRcdFx0XHRcdGFycmF5W2kgLyAyXSA6XG5cdFx0XHRcdFx0dmFsdWVzWyhpIC0gMSkgLyAyXTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB1bmRlZmluZWQpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAodmFsIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdG91dC5wdXNoKG5ldyBSZWN1cnJlbnQoXG5cdFx0XHRcdFx0XHRSZWN1cnJlbnRLaW5kLm9uLFxuXHRcdFx0XHRcdFx0dmFsLFxuXHRcdFx0XHRcdFx0bm93ID0+XG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGNyZWF0ZUNvbnRlbnQobm93KTtcblx0XHRcdFx0XHRcdFx0aWYgKHJlc3VsdClcblx0XHRcdFx0XHRcdFx0XHRuZXcgQ29udGVudE1ldGEocmVzdWx0KTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHRcdFx0XHR9KS5ydW4oKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgcHJlcGFyZWQgPSBjcmVhdGVDb250ZW50KHZhbCk7XG5cdFx0XHRcdFx0aWYgKHByZXBhcmVkKVxuXHRcdFx0XHRcdFx0b3V0LnB1c2gocHJlcGFyZWQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3Qgb2JqZWN0IG9mIG91dClcblx0XHRcdFx0bmV3IENvbnRlbnRNZXRhKG9iamVjdCk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBvdXQ7XG5cdFx0fTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIENyZWF0ZXMgdGhlIGZ1bmN0aW9uIHRoYXQgZXhpc3RzIGF0IHRoZSB0b3Agb2YgdGhlIGxpYnJhcnksXG5cdCAqIHdoaWNoIGlzIHVzZWQgZm9yIGNyZWF0aW5nIGFuIGFic3RyYWN0IGNvbnRhaW5lciBvYmplY3QuXG5cdCAqL1xuXHRmdW5jdGlvbiBjcmVhdGVDb250YWluZXJOYW1lc3BhY2VGbihsaWJyYXJ5OiBJTGlicmFyeSlcblx0e1xuXHRcdGNvbnN0IGNyZWF0ZUNvbnRhaW5lciA9IGxpYnJhcnkuY3JlYXRlQ29udGFpbmVyO1xuXHRcdHJldHVybiBjcmVhdGVDb250YWluZXIgP1xuXHRcdFx0Y3JlYXRlQnJhbmNoRm4oKCkgPT4gY3JlYXRlQ29udGFpbmVyKCksIFwiXCIpIDpcblx0XHRcdCgpID0+IHt9O1xuXHR9O1xufVxuIiwiXG5kZWNsYXJlIG5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHRleHBvcnQgaW50ZXJmYWNlIE1ldGFBcnJheTxUIGV4dGVuZHMgTWV0YSA9IE1ldGE+XG5cdHtcblx0XHQvKipcblx0XHQgKiBNb3ZlcyBhIHNlY3Rpb24gb2YgdGhpcyBhcnJheSBpZGVudGlmaWVkIGJ5IHN0YXJ0IGFuZCBlbmQgdG9cblx0XHQgKiB0byBhbm90aGVyIGxvY2F0aW9uIHdpdGhpbiB0aGlzIGFycmF5LCBzdGFydGluZyBhdCB0aGUgc3BlY2lmaWVkXG5cdFx0ICogdGFyZ2V0IHBvc2l0aW9uLlxuXHRcdCAqIFxuXHRcdCAqIEBwYXJhbSB0YXJnZXQgSWYgdGFyZ2V0IGlzIG5lZ2F0aXZlLCBpdCBpcyB0cmVhdGVkIGFzIGxlbmd0aCt0YXJnZXQgd2hlcmUgbGVuZ3RoIGlzIHRoZVxuXHRcdCAqIGxlbmd0aCBvZiB0aGUgYXJyYXkuXG5cdFx0ICogQHBhcmFtIHN0YXJ0IElmIHN0YXJ0IGlzIG5lZ2F0aXZlLCBpdCBpcyB0cmVhdGVkIGFzIGxlbmd0aCtzdGFydC4gSWYgZW5kIGlzIG5lZ2F0aXZlLCBpdFxuXHRcdCAqIGlzIHRyZWF0ZWQgYXMgbGVuZ3RoK2VuZC5cblx0XHQgKiBAcGFyYW0gZW5kIElmIG5vdCBzcGVjaWZpZWQsIGxlbmd0aCBvZiB0aGUgdGhpcyBvYmplY3QgaXMgdXNlZCBhcyBpdHMgZGVmYXVsdCB2YWx1ZS5cblx0XHQgKi9cblx0XHRtb3ZlV2l0aGluKHRhcmdldDogbnVtYmVyLCBzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcik6IHRoaXM7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogR2V0cyBvciBzZXRzIHRoZSBsZW5ndGggb2YgdGhlIGFycmF5LiBUaGlzIGlzIGEgbnVtYmVyIG9uZSBoaWdoZXIgXG5cdFx0ICogdGhhbiB0aGUgaGlnaGVzdCBlbGVtZW50IGRlZmluZWQgaW4gYW4gYXJyYXkuXG5cdFx0ICovXG5cdFx0bGVuZ3RoOiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQXBwZW5kcyBuZXcgZWxlbWVudHMgdG8gYW4gYXJyYXksIGFuZCByZXR1cm5zIHRoZSBuZXcgbGVuZ3RoIG9mIHRoZSBhcnJheS5cblx0ICAgICAgICogQHBhcmFtIGNoaWxkcmVuIE5ldyBlbGVtZW50cyBvZiB0aGUgQXJyYXkuXG5cdFx0ICovXG5cdFx0cHVzaCguLi5jaGlsZHJlbjogTWV0YVtdKTogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlbW92ZXMgdGhlIGxhc3QgZWxlbWVudCBmcm9tIGFuIGFycmF5IGFuZCByZXR1cm5zIGl0LlxuXHRcdCAqL1xuXHRcdHBvcCgpOiBNZXRhIHwgdW5kZWZpbmVkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlbW92ZXMgdGhlIGZpcnN0IGVsZW1lbnQgZnJvbSBhbiBhcnJheSBhbmQgcmV0dXJucyBpdC5cblx0XHQgKi9cblx0XHRzaGlmdCgpOiBNZXRhIHwgdW5kZWZpbmVkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEluc2VydHMgbmV3IGVsZW1lbnRzIGF0IHRoZSBzdGFydCBvZiBhbiBhcnJheS5cblx0XHQgKiBAcGFyYW0gY2hpbGRyZW4gIEVsZW1lbnRzIHRvIGluc2VydCBhdCB0aGUgc3RhcnQgb2YgdGhlIGFycmF5LlxuXHRcdCAqL1xuXHRcdHVuc2hpZnQoLi4uY2hpbGRyZW46IE1ldGFbXSk6IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZXZlcnNlcyB0aGUgZWxlbWVudHMgaW4gdGhlIGFycmF5LlxuXHRcdCAqL1xuXHRcdHJldmVyc2UoKTogdGhpcztcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIGEgc2VjdGlvbiBvZiBhbiBhcnJheS5cblx0XHQgKiBAcGFyYW0gc3RhcnQgVGhlIGJlZ2lubmluZyBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuXHRcdCAqIEBwYXJhbSBlbmQgVGhlIGVuZCBvZiB0aGUgc3BlY2lmaWVkIHBvcnRpb24gb2YgdGhlIGFycmF5LlxuXHRcdCAqL1xuXHRcdHNsaWNlKHN0YXJ0PzogbnVtYmVyLCBlbmQ/OiBudW1iZXIpOiBNZXRhQXJyYXk8VD47XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVtb3ZlcyBlbGVtZW50cyBmcm9tIGFuIGFycmF5IGFuZCwgaWYgbmVjZXNzYXJ5LCBpbnNlcnRzIG5ldyBlbGVtZW50cyBpbiB0aGVpclxuXHRcdCAqIHBsYWNlLCByZXR1cm5pbmcgdGhlIGRlbGV0ZWQgZWxlbWVudHMuXG5cdFx0ICogQHBhcmFtIHN0YXJ0IFRoZSB6ZXJvLWJhc2VkIGxvY2F0aW9uIGluIHRoZSBhcnJheSBmcm9tIHdoaWNoIHRvIHN0YXJ0IHJlbW92aW5nIGVsZW1lbnRzLlxuXHRcdCAqIEBwYXJhbSBkZWxldGVDb3VudCBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHJlbW92ZS5cblx0XHQgKi9cblx0XHRzcGxpY2Uoc3RhcnQ6IG51bWJlciwgZGVsZXRlQ291bnQ/OiBudW1iZXIpOiBNZXRhW107XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVtb3ZlcyBlbGVtZW50cyBmcm9tIGFuIGFycmF5IGFuZCwgaWYgbmVjZXNzYXJ5LCBpbnNlcnRzIG5ldyBlbGVtZW50cyBpbiB0aGVpciBwbGFjZSxcblx0XHQgKiByZXR1cm5pbmcgdGhlIGRlbGV0ZWQgZWxlbWVudHMuXG5cdFx0ICogQHBhcmFtIHN0YXJ0IFRoZSB6ZXJvLWJhc2VkIGxvY2F0aW9uIGluIHRoZSBhcnJheSBmcm9tIHdoaWNoIHRvIHN0YXJ0IHJlbW92aW5nIGVsZW1lbnRzLlxuXHRcdCAqIEBwYXJhbSBkZWxldGVDb3VudCBUaGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHJlbW92ZS5cblx0XHQgKiBAcGFyYW0gaXRlbXMgRWxlbWVudHMgdG8gaW5zZXJ0IGludG8gdGhlIGFycmF5IGluIHBsYWNlIG9mIHRoZSBkZWxldGVkIGVsZW1lbnRzLlxuXHRcdCAqL1xuXHRcdHNwbGljZShzdGFydDogbnVtYmVyLCBkZWxldGVDb3VudD86IG51bWJlciwgLi4uaXRlbXM6IE1ldGFbXSk6IE1ldGFbXTtcblx0XHRcblx0XHQvKipcblx0XHQgKiBTb3J0cyBhbiBhcnJheS5cblx0XHQgKiBAcGFyYW0gY29tcGFyZUZuIFRoZSBuYW1lIG9mIHRoZSBmdW5jdGlvbiB1c2VkIHRvIGRldGVybWluZSB0aGVcblx0XHQgKiBvcmRlciBvZiB0aGUgZWxlbWVudHMuIElmIG9taXR0ZWQsIHRoZSBlbGVtZW50cyBhcmUgc29ydGVkIGluIGFzY2VuZGluZywgXG5cdFx0ICogQVNDSUkgY2hhcmFjdGVyIG9yZGVyLlxuXHRcdCAqL1xuXHRcdHNvcnQ8VD4ocmVmZXJlbmNlOiBUW10sIGNvbXBhcmVGbjogKGE6IFQsIGI6IFQpID0+IG51bWJlcik6IHRoaXM7XG5cdFx0c29ydDxUPihyZWZlcmVuY2U6IFRbXSk6IHRoaXM7XG5cdFx0c29ydDxUPihjb21wYXJlRm46IChhOiBNZXRhLCBiOiBNZXRhKSA9PiBudW1iZXIpOiB0aGlzO1xuXHRcdFxuXHRcdC8qKlxuXHQgICAgICAgKiBSZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiBhIHZhbHVlIGluIGFuIGFycmF5LlxuXHQgICAgICAgKiBAcGFyYW0gc2VhcmNoTWV0YSBUaGUgdmFsdWUgdG8gbG9jYXRlIGluIHRoZSBhcnJheS5cblx0ICAgICAgICogQHBhcmFtIGZyb21JbmRleCBUaGUgYXJyYXkgaW5kZXggYXQgd2hpY2ggdG8gYmVnaW4gdGhlIHNlYXJjaC4gXG5cdFx0ICogSWYgZnJvbUluZGV4IGlzIG9taXR0ZWQsIHRoZSBzZWFyY2ggc3RhcnRzIGF0IGluZGV4IDAuXG5cdCAgICAgICAqL1xuXHRcdGluZGV4T2Yoc2VhcmNoTWV0YTogTWV0YSwgZnJvbUluZGV4PzogbnVtYmVyKTogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHQgICAgICAgKiBSZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgbGFzdCBvY2N1cnJlbmNlIG9mIGEgc3BlY2lmaWVkIHZhbHVlIGluIGFuIGFycmF5LlxuXHQgICAgICAgKiBAcGFyYW0gc2VhcmNoTWV0YSBUaGUgdmFsdWUgdG8gbG9jYXRlIGluIHRoZSBhcnJheS5cblx0ICAgICAgICogQHBhcmFtIGZyb21JbmRleCBUaGUgYXJyYXkgaW5kZXggYXQgd2hpY2ggdG8gYmVnaW4gdGhlIHNlYXJjaC4gXG5cdFx0ICogSWYgZnJvbUluZGV4IGlzIG9taXR0ZWQsIHRoZSBzZWFyY2ggc3RhcnRzIGF0IHRoZSBsYXN0IGluZGV4IGluIHRoZSBhcnJheS5cblx0ICAgICAgICovXG5cdFx0bGFzdEluZGV4T2Yoc2VhcmNoTWV0YTogTWV0YSwgZnJvbUluZGV4PzogbnVtYmVyKTogbnVtYmVyO1xuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHRjb25zdCBjYWxsYmFja3M6ICgoKSA9PiB2b2lkKVtdID0gW107XG5cdFxuXHQvKipcblx0ICogU3RvcmVzIHRoZSBudW1iZXIgb2Ygb3V0c3RhbmRpbmcgYXN5bmNocm9ub3VzIG9wZXJhdGlvbnNcblx0ICogYXJlIHdhaXRpbmcgdG8gYmUgY29tcGxldGVkLCBzbyB0aGF0IHRoZSByZWFkeSBzdGF0ZSBjYWxsYmFja3Ncblx0ICogY2FuIGJlIHRyaWdnZXJlZC5cblx0ICovXG5cdGxldCBvdXRzdGFuZGluZyA9IDA7XG5cdFxuXHRleHBvcnQgY29uc3QgUmVhZHlTdGF0ZSA9XG5cdHtcblx0XHQvKipcblx0XHQgKiBBZGRzIHRoZSBzcGVjaWZpZWQgZnVuY3Rpb24gdG8gdGhlIGxpc3Qgb2YgY2FsbGJhY2tzIHRvIGludm9rZVxuXHRcdCAqIHdoZW4gYWxsIG91dHN0YW5kaW5nIGFzeW5jaHJvbm91cyBvcGVyYXRpb25zIGhhdmUgY29tcGxldGVkLlxuXHRcdCAqIEluIHRoZSBjYXNlIHdoZW4gdGhlcmUgYXJlIG5vIG91dHN0YW5kaW5nIGNhbGxiYWNrcywgdGhlIGZ1bmN0aW9uXG5cdFx0ICogaXMgY2FsbGVkIGltbWVkaWF0ZWx5LlxuXHRcdCAqL1xuXHRcdGF3YWl0KGNhbGxiYWNrOiAoKSA9PiB2b2lkKVxuXHRcdHtcblx0XHRcdGlmIChvdXRzdGFuZGluZyA8IDEpXG5cdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdGNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcblx0XHR9LFxuXHRcdFxuXHRcdC8qKiBJbmNyZW1lbnQgdGhlIHJlYWR5IHN0YXRlLiAqL1xuXHRcdGluYygpXG5cdFx0e1xuXHRcdFx0b3V0c3RhbmRpbmcrKztcblx0XHR9LFxuXHRcdFxuXHRcdC8qKiBEZWNyZW1lbnQgdGhlIHJlYWR5IHN0YXRlLiAqL1xuXHRcdGRlYygpXG5cdFx0e1xuXHRcdFx0b3V0c3RhbmRpbmctLTtcblx0XHRcdGlmIChvdXRzdGFuZGluZyA8IDApXG5cdFx0XHRcdG91dHN0YW5kaW5nID0gMDtcblx0XHRcdFxuXHRcdFx0aWYgKG91dHN0YW5kaW5nID09PSAwKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBmbnMgPSBjYWxsYmFja3Muc2xpY2UoKTtcblx0XHRcdFx0Y2FsbGJhY2tzLmxlbmd0aCA9IDA7XG5cdFx0XHRcdFxuXHRcdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGZucy5sZW5ndGg7KVxuXHRcdFx0XHRcdGZuc1tpXSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBNYW5hZ2VzIHRoZSByZXNwb25zaWJpbGl0aWVzIG9mIGEgc2luZ2xlIGNhbGwgdG8gb24oKSBvciBvbmx5KCkuXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgUmVjdXJyZW50PFRSdW5BcmdzIGV4dGVuZHMgYW55W10gPSBhbnlbXT5cblx0e1xuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cmVhZG9ubHkga2luZDogUmVjdXJyZW50S2luZCxcblx0XHRcdHJlYWRvbmx5IHNlbGVjdG9yOiBhbnksXG5cdFx0XHRyZWFkb25seSB1c2VyQ2FsbGJhY2s6IFJlY3VycmVudENhbGxiYWNrPEF0b21pY3M+LFxuXHRcdFx0cmVhZG9ubHkgdXNlclJlc3RBcmdzOiBhbnlbXSA9IFtdKVxuXHRcdHtcblx0XHRcdC8vIEluIHRoZSBjYXNlIHdoZW4gdGhlIGZpcnN0IGFyZ3VtZW50IHBhc3NlZCB0byB0aGVcblx0XHRcdC8vIHJlY3VycmVudCBmdW5jdGlvbiBpc24ndCBhIHZhbGlkIHNlbGVjdG9yLCB0aGUgcGFyYW1ldGVyc1xuXHRcdFx0Ly8gYXJlIHNoaWZ0ZWQgYmFja3dhcmRzLiBUaGlzIGlzIHRvIGhhbmRsZSB0aGUgb24oKSBjYWxsc1xuXHRcdFx0Ly8gdGhhdCBhcmUgdXNlZCB0byBzdXBwb3J0IHJlc3RvcmF0aW9ucy5cblx0XHRcdGlmICh0eXBlb2Ygc2VsZWN0b3IgPT09IFwiZnVuY3Rpb25cIiAmJiAhaXNGb3JjZShzZWxlY3RvcikpXG5cdFx0XHR7XG5cdFx0XHRcdHVzZXJSZXN0QXJncy51bnNoaWZ0KHVzZXJDYWxsYmFjayk7XG5cdFx0XHRcdHRoaXMudXNlckNhbGxiYWNrID0gc2VsZWN0b3I7XG5cdFx0XHRcdHRoaXMuc2VsZWN0b3IgPSBcIlwiO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRydW4oLi4uY2FsbGJhY2tBcmd1bWVudHM6IFRSdW5BcmdzKVxuXHRcdHtcblx0XHRcdGF1dG9ydW5DYWNoZS5zZXQodGhpcywgY2FsbGJhY2tBcmd1bWVudHMpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiBQcmV2ZW50IHN0cnVjdHVyYWwgdHlwZSBjb21wYXRpYmlsaXRpZXMuICovXG5cdFx0cHJpdmF0ZSByZWN1cnJlbnROb21pbmFsOiB1bmRlZmluZWQ7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBAaW50ZXJuYWxcblx0ICogQSBjbGFzcyB0aGF0IGRlYWxzIHdpdGggdGhlIHNwZWNpYWwgY2FzZSBvZiBhIEZvcmNlIHRoYXRcblx0ICogd2FzIHBsdWdnZWQgaW50byBhbiBhdHRyaWJ1dGUuXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQXR0cmlidXRlUmVjdXJyZW50IGV4dGVuZHMgUmVjdXJyZW50XG5cdHtcblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdGF0dHJpYnV0ZUtleTogc3RyaW5nLFxuXHRcdFx0Zm9yY2U6IFN0YXRlZnVsRm9yY2UpXG5cdFx0e1xuXHRcdFx0c3VwZXIoXG5cdFx0XHRcdFJlY3VycmVudEtpbmQub24sIFx0XG5cdFx0XHRcdGZvcmNlLFxuXHRcdFx0XHQoKG5vdzogYW55KSA9PiBuZXcgQXR0cmlidXRlTWV0YShhdHRyaWJ1dGVLZXksIG5vdykpKTtcblx0XHRcdFxuXHRcdFx0YXV0b3J1bkNhY2hlLnNldCh0aGlzLCBbXSk7XG5cdFx0fVxuXHR9XG5cdFxuXHQvKipcblx0ICogQGludGVybmFsXG5cdCAqIEV4dHJhY3RzIHRoZSBhdXRvcnVuIGFyZ3VtZW50cyBmcm9tIHRoZSBpbnRlcm5hbCBjYWNoZS5cblx0ICogQ2FuIG9ubHkgYmUgZXhlY3V0ZWQgb25jZS5cblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QXV0b3J1bkFyZ3VtZW50cyhyZWN1cnJlbnQ6IFJlY3VycmVudClcblx0e1xuXHRcdGNvbnN0IGFyZ3MgPSBhdXRvcnVuQ2FjaGUuZ2V0KHJlY3VycmVudCkgfHwgbnVsbDtcblx0XHRpZiAoYXJncylcblx0XHRcdGF1dG9ydW5DYWNoZS5kZWxldGUocmVjdXJyZW50KTtcblx0XHRcblx0XHRyZXR1cm4gYXJncztcblx0fVxuXHRcblx0Y29uc3QgYXV0b3J1bkNhY2hlID0gbmV3IFdlYWtNYXA8UmVjdXJyZW50LCBhbnlbXT4oKTtcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjb25zdCBlbnVtIFJlY3VycmVudEtpbmRcblx0e1xuXHRcdG9uLFxuXHRcdG9uY2UsXG5cdFx0b25seVxuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKipcblx0ICogQGludGVybmFsXG5cdCAqIEEgY2xhc3MgdGhhdCBzaXRzIGJldHdlZW4gdGhlIHNwZWNpZmljIFJlZmxleGl2ZSBsaWJyYXJ5LCBcblx0ICogYW5kIHRoZSBMaWJyYXJ5IGNsYXNzIGFzIGRlZmluZWQgaW4gdGhlIFJlZmxleCBDb3JlLiBUaGVcblx0ICogcHVycG9zZSBvZiB0aGlzIGNsYXNzIGlzIHRvIG92ZXJyaWRlIGFsbCB0aGUgbWV0aG9kcywgYW5kXG5cdCAqIGRldGVybWluZSB0aGUgc3BlY2lmaWMgbGlicmFyeSB0byByb3V0ZSBlYWNoIGNhbGwgdG8gdGhlIFxuXHQgKiBhYnN0cmFjdCBtZXRob2RzLiBJdCBvcGVyYXRlcyBieSBsb29raW5nIGF0IHRoZSBjb25zdHJ1Y3RvclxuXHQgKiBmdW5jdGlvbiBvZiB0aGUgQnJhbmNoIG9iamVjdCBwcm92aWRlZCB0byBhbGwgdGhlIG1ldGhvZHMsXG5cdCAqIGFuZCB0aGVuIHVzaW5nIHRoaXMgdG8gZGV0ZXJtaW5lIHdoYXQgbGlicmFyeSBpcyByZXNwb25zaWJsZVxuXHQgKiBmb3Igb2JqZWN0cyBvZiB0aGlzIHR5cGUuXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgUm91dGluZ0xpYnJhcnkgaW1wbGVtZW50cyBJTGlicmFyeVxuXHR7XG5cdFx0LyoqXG5cdFx0ICogU2luZ2xldG9uIGFjY2Vzc29yIHByb3BlcnR5LlxuXHRcdCAqL1xuXHRcdHN0YXRpYyBnZXQgdGhpcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuX3RoaXMgPT09IG51bGwgP1xuXHRcdFx0XHR0aGlzLl90aGlzID0gbmV3IFJvdXRpbmdMaWJyYXJ5KCkgOlxuXHRcdFx0XHR0aGlzLl90aGlzO1xuXHRcdH1cblx0XHRwcml2YXRlIHN0YXRpYyBfdGhpczogUm91dGluZ0xpYnJhcnkgfCBudWxsID0gbnVsbDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBBZGRzIGEgcmVmZXJlbmNlIHRvIGEgUmVmbGV4aXZlIGxpYnJhcnksIHdoaWNoIG1heSBiZVxuXHRcdCAqIGNhbGxlZCB1cG9uIGluIHRoZSBmdXR1cmUuXG5cdFx0ICovXG5cdFx0c3RhdGljIGFkZExpYnJhcnkobGlicmFyeTogSUxpYnJhcnkpXG5cdFx0e1xuXHRcdFx0dGhpcy5saWJyYXJpZXMucHVzaChsaWJyYXJ5KTtcblx0XHR9XG5cdFx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgbGlicmFyaWVzOiBJTGlicmFyeVtdID0gW107XG5cdFx0XG5cdFx0cHJpdmF0ZSBjb25zdHJ1Y3RvcigpIHsgfVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENvbmRpdGlvbmFsbHkgZXhlY3V0ZXMgdGhlIHNwZWNpZmllZCBsaWJyYXJ5IGZ1bmN0aW9uLFxuXHRcdCAqIGluIHRoZSBjYXNlIHdoZW4gaXQncyBkZWZpbmVkLlxuXHRcdCAqL1xuXHRcdHByaXZhdGUgcm91dGU8RiBleHRlbmRzICguLi5hcmdzOiBhbnlbXSkgPT4gUiwgUj4oXG5cdFx0XHRyZWZlcmVuY2VCcmFuY2g6IElCcmFuY2gsXG5cdFx0XHRnZXRGbjogKGxpYnJhcnk6IElMaWJyYXJ5KSA9PiBGIHwgdW5kZWZpbmVkLFxuXHRcdFx0Y2FsbEZuOiAoZm46IEYsIHRoaXNBcmc6IElMaWJyYXJ5KSA9PiBSLFxuXHRcdFx0ZGVmYXVsdFZhbHVlPzogYW55KTogUlxuXHRcdHtcblx0XHRcdGlmIChyZWZlcmVuY2VCcmFuY2gpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGxpYnMgPSBSb3V0aW5nTGlicmFyeS5saWJyYXJpZXM7XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBJdCdzIGltcG9ydGFudCB0aGF0IHRlc3QgZm9yIGFzc29jaWF0aXZpdHkgYmV0d2VlbiBhXG5cdFx0XHRcdC8vIGJyYW5jaCBhbmQgYSBsaWJyYXJ5IGlzIGRvbmUgaW4gcmV2ZXJzZSBvcmRlciwgaW4gb3JkZXJcblx0XHRcdFx0Ly8gdG8gc3VwcG9ydCB0aGUgY2FzZSBvZiBSZWZsZXhpdmUgbGlicmFyaWVzIGJlaW5nIGxheWVyZWRcblx0XHRcdFx0Ly8gb24gdG9wIG9mIGVhY2ggb3RoZXIuIElmIFJlZmxleGl2ZSBsaWJyYXJ5IEEgaXMgbGF5ZXJlZCBvblxuXHRcdFx0XHQvLyBSZWZsZXhpdmUgbGlicmFyeSBCLCBBIHdpbGwgYmUgYWRkZWQgdG8gdGhlIGxpYnJhcmllcyBhcnJheVxuXHRcdFx0XHQvLyBiZWZvcmUgQi4gVGhlIGxpYnJhcmllcyBhcnJheSB0aGVyZWZvcmUgaGFzIGFuIGltcGxpY2l0XG5cdFx0XHRcdC8vIHRvcG9sb2dpY2FsIHNvcnQuIEl0ZXJhdGluZyBiYWNrd2FyZHMgZW5zdXJlcyB0aGF0IHRoZVxuXHRcdFx0XHQvLyBoaWdoZXItbGV2ZWwgbGlicmFyaWVzIGFyZSB0ZXN0ZWQgYmVmb3JlIHRoZSBsb3dlci1sZXZlbCBvbmVzLlxuXHRcdFx0XHQvLyBUaGlzIGlzIGNyaXRpY2FsLCBiZWNhdXNlIGEgaGlnaGVyLWxldmVsIGxpYnJhcnkgbWF5IG9wZXJhdGVcblx0XHRcdFx0Ly8gb24gdGhlIHNhbWUgYnJhbmNoIHR5cGVzIGFzIHRoZSBsb3dlci1sZXZlbCBsaWJyYXJpZXMgdGhhdFxuXHRcdFx0XHQvLyBpdCdzIGFic3RyYWN0aW5nLlxuXHRcdFx0XHRmb3IgKGxldCBpID0gbGlicy5sZW5ndGg7IGktLSA+IDA7KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgbGliID0gbGlic1tpXTtcblx0XHRcdFx0XHRpZiAobGliLmlzS25vd25CcmFuY2gocmVmZXJlbmNlQnJhbmNoKSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBsaWJGbiA9IGdldEZuKGxpYik7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHlwZW9mIGxpYkZuID09PSBcImZ1bmN0aW9uXCIgP1xuXHRcdFx0XHRcdFx0XHRjYWxsRm4obGliRm4sIGxpYikgOlxuXHRcdFx0XHRcdFx0XHRkZWZhdWx0VmFsdWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlVua25vd24gYnJhbmNoIHR5cGUuXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRpc0tub3duQnJhbmNoKGJyYW5jaDogSUJyYW5jaClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5yb3V0ZShcblx0XHRcdFx0YnJhbmNoLFxuXHRcdFx0XHRsaWIgPT4gbGliLmlzS25vd25CcmFuY2gsXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYnJhbmNoKSxcblx0XHRcdFx0ZmFsc2UpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRpc0tub3duTGVhZihsZWFmOiBvYmplY3QpXG5cdFx0e1xuXHRcdFx0aWYgKGxlYWYgJiYgdHlwZW9mIGxlYWYgPT09IFwib2JqZWN0XCIpXG5cdFx0XHRcdGZvciAoY29uc3QgbGliIG9mIFJvdXRpbmdMaWJyYXJ5LmxpYnJhcmllcylcblx0XHRcdFx0XHRpZiAobGliLmlzS25vd25MZWFmICYmIGxpYi5pc0tub3duTGVhZihsZWFmKSlcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgbWF5IGltcGxlbWVudCB0aGlzIG1ldGhvZCBpbiBvcmRlciB0byBwcm92aWRlXG5cdFx0ICogdGhlIHN5c3RlbSB3aXRoIGtub3dsZWRnZSBvZiB3aGV0aGVyIGEgYnJhbmNoIGhhcyBiZWVuIGRpc3Bvc2VkLFxuXHRcdCAqIHdoaWNoIGl0IHVzZXMgZm9yIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvbnMuIElmIHRoZSBsaWJyYXJ5IGhhcyBub1xuXHRcdCAqIG1lYW5zIG9mIGRvaW5nIHRoaXMsIGl0IG1heSByZXR1cm4gXCJudWxsXCIuXG5cdFx0ICovXG5cdFx0aXNCcmFuY2hEaXNwb3NlZChicmFuY2g6IElCcmFuY2gpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucm91dGUoXG5cdFx0XHRcdGJyYW5jaCxcblx0XHRcdFx0bGliID0+IGxpYi5pc0JyYW5jaERpc3Bvc2VkLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGJyYW5jaCksXG5cdFx0XHRcdGZhbHNlKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyB0aGF0IHN1cHBvcnQgaW5saW5lIHRhcmdldCtjaGlsZHJlbiBjbG9zdXJlc1xuXHRcdCAqIG11c3QgcHJvdmlkZSBhbiBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBtZXRob2QuXG5cdFx0ICovXG5cdFx0Z2V0Q2hpbGRyZW4odGFyZ2V0OiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnJvdXRlKFxuXHRcdFx0XHR0YXJnZXQsXG5cdFx0XHRcdGxpYiA9PiBsaWIuZ2V0Q2hpbGRyZW4sXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgdGFyZ2V0KSxcblx0XHRcdFx0W10pO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRjcmVhdGVDb250ZW50KGNvbnRlbnQ6IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5yb3V0ZShcblx0XHRcdFx0Y29udGVudCxcblx0XHRcdFx0bGliID0+IGxpYi5jcmVhdGVDb250ZW50LFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGNvbnRlbnQpLFxuXHRcdFx0XHRudWxsKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0YXR0YWNoQXRvbWljKFxuXHRcdFx0YXRvbWljOiBhbnksXG5cdFx0XHRicmFuY2g6IElCcmFuY2gsXG5cdFx0XHRyZWY6IFJlZilcblx0XHR7XG5cdFx0XHR0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdGxpYiA9PiBsaWIuYXR0YWNoQXRvbWljLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGF0b21pYywgYnJhbmNoLCByZWYpKTtcblx0XHRcdFxuXHRcdFx0Q29yZVJlY3VycmVudC5hdHRhY2hBdG9taWMoYnJhbmNoLCBhdG9taWMpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRkZXRhY2hBdG9taWMoYXRvbWljOiBhbnksIGJyYW5jaDogSUJyYW5jaClcblx0XHR7XG5cdFx0XHR0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdGxpYiA9PiBsaWIuZGV0YWNoQXRvbWljLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGF0b21pYywgYnJhbmNoKSk7XG5cdFx0XHRcblx0XHRcdENvcmVSZWN1cnJlbnQuZGV0YWNoQXRvbWljKGJyYW5jaCwgYXRvbWljKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICpcblx0XHQgKi9cblx0XHRzd2FwQnJhbmNoZXMoYnJhbmNoMTogSUJyYW5jaCwgYnJhbmNoMjogSUJyYW5jaClcblx0XHR7XG5cdFx0XHR0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gxLFxuXHRcdFx0XHRsaWIgPT4gbGliLnN3YXBCcmFuY2hlcyxcblx0XHRcdFx0KGZuLCBsaWIpID0+IGZuLmNhbGwobGliLCBicmFuY2gxLCBicmFuY2gyKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICovXG5cdFx0cmVwbGFjZUJyYW5jaChicmFuY2gxOiBJQnJhbmNoLCBicmFuY2gyOiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHRoaXMucm91dGUoXG5cdFx0XHRcdGJyYW5jaDEsXG5cdFx0XHRcdGxpYiA9PiBsaWIucmVwbGFjZUJyYW5jaCxcblx0XHRcdFx0KGZuLCBsaWIpID0+IGZuLmNhbGwobGliLCBicmFuY2gxLCBicmFuY2gyKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGF0dGFjaEF0dHJpYnV0ZShicmFuY2g6IElCcmFuY2gsIGtleTogc3RyaW5nLCB2YWx1ZTogYW55KVxuXHRcdHtcblx0XHRcdHRoaXMucm91dGUoXG5cdFx0XHRcdGJyYW5jaCxcblx0XHRcdFx0bGliID0+IGxpYi5hdHRhY2hBdHRyaWJ1dGUsXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYnJhbmNoLCBrZXksIHZhbHVlKSk7XG5cdFx0fVxuXHRcdFx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRkZXRhY2hBdHRyaWJ1dGUoYnJhbmNoOiBJQnJhbmNoLCBrZXk6IHN0cmluZylcblx0XHR7XG5cdFx0XHR0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdGxpYiA9PiBsaWIuZGV0YWNoQXR0cmlidXRlLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGJyYW5jaCwga2V5KSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgdGhhdCBjb250cmlidXRlIHRvIHRoZSBnbG9iYWwgb24oKSBmdW5jdGlvblxuXHRcdCAqIG11c3QgcHJvdmlkZSBhbiBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBtZXRob2QuXG5cdFx0ICogXG5cdFx0ICogTGlicmFyaWVzIG11c3QgaW1wbGVtZW50IHRoaXMgZnVuY3Rpb24gaW4gb3JkZXIgdG8gcHJvdmlkZSB0aGVpciBvd25cblx0XHQgKiBob29rcyBpbnRvIHRoZSBnbG9iYWwgcmVjdXJyZW50IGZ1bmN0aW9ucyAoc3VjaCBhcyBvbigpLCBvbmx5KCkgYW5kIG9uY2UoKSkuXG5cdFx0ICogXG5cdFx0ICogSWYgdGhlIGxpYnJhcnkgZG9lcyBub3QgcmVjb2duaXplIHRoZSBzZWxlY3RvciBwcm92aWRlZCwgaXQgc2hvdWxkXG5cdFx0ICogcmV0dXJuIGZhbHNlLCBzbyB0aGF0IHRoZSBSZWZsZXggZW5naW5lIGNhbiBmaW5kIGFub3RoZXIgcGxhY2UgdG9cblx0XHQgKiBwZXJmb3JtIHRoZSBhdHRhY2htZW50LiBJbiBvdGhlciBjYXNlcywgaXQgc2hvdWxkIHJldHVybiB0cnVlLlxuXHRcdCAqL1xuXHRcdGF0dGFjaFJlY3VycmVudChcblx0XHRcdGtpbmQ6IFJlY3VycmVudEtpbmQsXG5cdFx0XHR0YXJnZXQ6IElCcmFuY2gsXG5cdFx0XHRzZWxlY3RvcjogYW55LFxuXHRcdFx0Y2FsbGJhY2s6IFJlY3VycmVudENhbGxiYWNrPEF0b21pY3M+LFxuXHRcdFx0cmVzdDogYW55W10pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucm91dGUoXG5cdFx0XHRcdHRhcmdldCxcblx0XHRcdFx0bGliID0+IGxpYi5hdHRhY2hSZWN1cnJlbnQsXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwga2luZCwgdGFyZ2V0LCBzZWxlY3RvciwgY2FsbGJhY2ssIHJlc3QpLFxuXHRcdFx0XHRmYWxzZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgdGhhdCBjb250cmlidXRlIHRvIHRoZSBnbG9iYWwgb2ZmKCkgZnVuY3Rpb25cblx0XHQgKiBtdXN0IHByb3ZpZGUgYW4gaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgbWV0aG9kLlxuXHRcdCAqL1xuXHRcdGRldGFjaFJlY3VycmVudChcblx0XHRcdGJyYW5jaDogSUJyYW5jaCxcblx0XHRcdHNlbGVjdG9yOiBhbnksXG5cdFx0XHRjYWxsYmFjazogUmVjdXJyZW50Q2FsbGJhY2s8QXRvbWljcz4pXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucm91dGUoXG5cdFx0XHRcdGJyYW5jaCxcblx0XHRcdFx0bGliID0+IGxpYi5kZXRhY2hSZWN1cnJlbnQsXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYnJhbmNoLCBzZWxlY3RvciwgY2FsbGJhY2spLFxuXHRcdFx0XHRmYWxzZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgY2FuIGltcGxlbWVudCB0aGlzIGZ1bmN0aW9uIGluIG9yZGVyXG5cdFx0ICogdG8gY2FwdHVyZSB0aGUgZmxvdyBvZiBicmFuY2hlcyBiZWluZyBwYXNzZWQgYXNcblx0XHQgKiBhdG9taWNzIHRvIG90aGVyIGJyYW5jaCBmdW5jdGlvbnMuXG5cdFx0ICovXG5cdFx0aGFuZGxlQnJhbmNoRnVuY3Rpb24oXG5cdFx0XHRicmFuY2g6IElCcmFuY2gsXG5cdFx0XHRicmFuY2hGbjogKC4uLmF0b21pY3M6IGFueVtdKSA9PiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdGxpYiA9PiBsaWIuaGFuZGxlQnJhbmNoRnVuY3Rpb24sXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYnJhbmNoLCBicmFuY2hGbikpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIGNhbiBpbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiBpbiBvcmRlciB0byBwcm9jZXNzXG5cdFx0ICogYSBicmFuY2ggYmVmb3JlIGl0J3MgcmV0dXJuZWQgZnJvbSBhIGJyYW5jaCBmdW5jdGlvbi4gV2hlbiB0aGlzXG5cdFx0ICogZnVuY3Rpb24gaXMgaW1wbGVtZW50ZWQsIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGJyYW5jaCBmdW5jdGlvbnNcblx0XHQgKiBhcmUgcmVwbGFjZWQgd2l0aCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoaXMgZnVuY3Rpb24uIFJlZmxleGl2ZSBsaWJyYXJpZXNcblx0XHQgKiB0aGF0IHJlcXVpcmUgdGhlIHN0YW5kYXJkIGJlaGF2aW9yIG9mIHJldHVybmluZyBicmFuY2hlcyBmcm9tIHRoZVxuXHRcdCAqIGJyYW5jaCBmdW5jdGlvbnMgc2hvdWxkIHJldHVybiB0aGUgYGJyYW5jaGAgYXJndW1lbnQgdG8gdGhpcyBmdW5jdGlvblxuXHRcdCAqIHZlcmJhdGltLlxuXHRcdCAqL1xuXHRcdHJldHVybkJyYW5jaChicmFuY2g6IElCcmFuY2gpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucm91dGUoXG5cdFx0XHRcdGJyYW5jaCxcblx0XHRcdFx0bGliID0+IGxpYi5yZXR1cm5CcmFuY2gsXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYnJhbmNoKSxcblx0XHRcdFx0YnJhbmNoKVxuXHRcdH1cblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqXG5cdCAqIEEgY2xhc3MgdGhhdCB3cmFwcyBhIHZhbHVlIHdob3NlIGNoYW5nZXMgY2FuIGJlIG9ic2VydmVkLlxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIFN0YXRlZnVsRm9yY2U8VCA9IGFueT5cblx0e1xuXHRcdGNvbnN0cnVjdG9yKHZhbHVlOiBUKVxuXHRcdHtcblx0XHRcdHRoaXMuX3ZhbHVlID0gdmFsdWU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiBcblx0XHQgKiBHZXRzIG9yIHNldHMgdGhlIHZhbHVlIG9mIHRoZSBmb3JjZS5cblx0XHQgKi9cblx0XHRnZXQgdmFsdWUoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLl92YWx1ZTtcblx0XHR9XG5cdFx0c2V0IHZhbHVlKHZhbHVlOiBUKVxuXHRcdHtcblx0XHRcdGNvbnN0IHdhcyA9IHRoaXMuX3ZhbHVlO1xuXHRcdFx0dGhpcy5fdmFsdWUgPSB2YWx1ZTtcblx0XHRcdFxuXHRcdFx0aWYgKHdhcyAhPT0gdGhpcy5fdmFsdWUpXG5cdFx0XHRcdHRoaXMuY2hhbmdlZCh2YWx1ZSwgd2FzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqIEBpbnRlcm5hbCAqL1xuXHRcdHByaXZhdGUgX3ZhbHVlOiBhbnk7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU2V0cyB0aGUgdmFsdWUgb2YgdGhlIGZvcmNlIGFuZCByZXR1cm5zIHZvaWQuXG5cdFx0ICogKFVzZWZ1bCBmb3IgZm9yY2UgYXJndW1lbnRzIGluIGFycm93IGZ1bmN0aW9ucyB0byBjYW5jZWwgdGhlIHJldHVybiB2YWx1ZS4pXG5cdFx0ICovXG5cdFx0c2V0KHZhbHVlOiBUKVxuXHRcdHtcblx0XHRcdHRoaXMudmFsdWUgPSB2YWx1ZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQGludGVybmFsXG5cdFx0ICogSXQncyBpbXBvcnRhbnQgdGhhdCB0aGlzIGlzIGFuIGFzc2lnbm1lbnQgcmF0aGVyIHRoYW4gYSBmdW5jdGlvbixcblx0XHQgKiBiZWNhdXNlIHRoZSBldmVudCBuZWVkcyB0byBiZSBvbiB0aGUgaW5zdGFuY2UgcmF0aGVyIHRoYW4gaW4gdGhlXG5cdFx0ICogcHJvdG90eXBlIHNvIHRoYXQgaXQncyBjYXVnaHQgYnkgdGhlIGV2ZW50IHN5c3RlbS5cblx0XHQgKi9cblx0XHRjaGFuZ2VkID0gZm9yY2U8KG5vdzogVCwgd2FzOiBUKSA9PiB2b2lkPigpO1xuXHRcdFxuXHRcdC8qKiBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSB2YWx1ZSBvZiB0aGlzIGZvcmNlLiAqL1xuXHRcdHRvU3RyaW5nKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gXCJcIiArIHRoaXMuX3ZhbHVlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHR2YWx1ZU9mKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5fdmFsdWU7XG5cdFx0fVxuXHR9XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQm9vbGVhbkZvcmNlIGV4dGVuZHMgU3RhdGVmdWxGb3JjZTxib29sZWFuPlxuXHR7XG5cdFx0LyoqXG5cdFx0ICogRmxpcHMgdGhlIHZhbHVlIG9mIHRoZSBmb3JjZSBmcm9tIHRydWUgdG8gZmFsc2Ugb3IgZmFsc2UgdG8gdHJ1ZS5cblx0XHQgKiAoVXNlZnVsIGZvciBmb3JjZSBhcmd1bWVudHMgaW4gYXJyb3cgZnVuY3Rpb25zIHRvIGNhbmNlbCB0aGUgcmV0dXJuIHZhbHVlLilcblx0XHQgKi9cblx0XHRmbGlwKClcblx0XHR7XG5cdFx0XHR0aGlzLnNldCghdGhpcy52YWx1ZSk7XG5cdFx0fVxuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKipcblx0ICogRGVhbHMgd2l0aCB0ZW1wb3JhcmlseSB0cmFja2luZyBpbnNlcnRlZCBtZXRhcy5cblx0ICogXG5cdCAqIE9uZSBzaW5nbGUgYnJhbmNoIGNhbiBwb3RlbnRpYWxseSBoYXZlIG11bHRpcGxlIHRyYWNrZXJzXG5cdCAqIGFzc29jaWF0ZWQgd2l0aCBpdCwgaW4gdGhlIGNhc2Ugd2hlbiB0aGUgYnJhbmNoIGhhcyBtdWx0aXBsZVxuXHQgKiBsYXllcnMgb2Ygc3RyZWFtIG1ldGFzIGFwcGxpZWQgdG8gaXQuIFRoZXJlIGlzIG9uZSB0cmFja2VyIGluc3RhbmNlXG5cdCAqIGZvciBlYWNoIHNldCBvZiBcInNpYmxpbmdcIiBtZXRhcy5cblx0ICovXG5cdGV4cG9ydCBjbGFzcyBUcmFja2VyXG5cdHtcblx0XHQvKiogKi9cblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdHByaXZhdGUgcmVhZG9ubHkgYnJhbmNoOiBJQnJhbmNoLFxuXHRcdFx0cmVmOiBSZWYgfCBMb2NhdG9yID0gXCJhcHBlbmRcIilcblx0XHR7XG5cdFx0XHR0aGlzLmxhc3QgPSByZWY7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFVwZGF0ZXMgdGhlIGludGVybmFsIHRyYWNraW5nIHZhbHVlIG9mIHRoZSBUcmFja2VyLlxuXHRcdCAqL1xuXHRcdHVwZGF0ZShvYmplY3Q6IFJlZiB8IExvY2F0b3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sYXN0ID0gb2JqZWN0O1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIGEgdmFsdWUgdGhhdCBjYW4gYmUgdXNlZCBpbiBhIGNsaWVudCBsaWJyYXJ5IGFzIHRoZVxuXHRcdCAqIHJlZmVyZW5jZSBzaWJsaW5nIHZhbHVlIHRvIGluZGljYXRlIGFuIGluc2VydGlvbiBwb2ludC5cblx0XHQgKi9cblx0XHRnZXRMYXN0SGFyZFJlZigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMubGFzdCBpbnN0YW5jZW9mIExvY2F0b3IgP1xuXHRcdFx0XHR0aGlzLnJlc29sdmVSZWYoKSA6XG5cdFx0XHRcdHRoaXMubGFzdDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQ2xvbmVzIGFuZCByZXR1cm5zIHRoaXMgVHJhY2tlci4gVXNlZCB0byBjcmVhdGUgYSBuZXdcblx0XHQgKiBUcmFja2VyIGluc3RhbmNlIGZvciBhIG1vcmUgbmVzdGVkIGxldmVsIG9mIHN0cmVhbSBtZXRhLlxuXHRcdCAqL1xuXHRcdGRlcml2ZSgpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgb3V0ID0gbmV3IFRyYWNrZXIodGhpcy5icmFuY2gpO1xuXHRcdFx0b3V0Lmxhc3QgPSB0aGlzLmxhc3Q7XG5cdFx0XHRcblx0XHRcdGlmIChDb25zdC5kZWJ1Zylcblx0XHRcdFx0b3V0LnRyYWNrZXJDb250YWluZXIgPSB0aGlzO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gb3V0O1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBFbnN1cmVzIHRoYXQgdGhlIHNwZWNpZmllZCByZWYgb2JqZWN0IGFjdHVhbGx5IGV4aXN0cyBpbiB0aGUgUmVmbGV4aXZlXG5cdFx0ICogdHJlZSwgYW5kIGlmIG5vdCwgYSBuZXcgb2JqZWN0IGlzIHJldHVybmVkIHRoYXQgY2FuIGJlIHVzZWQgYXMgdGhlIHJlZi5cblx0XHQgKiBJbiB0aGUgY2FzZSB3aGVuIG51bGwgaXMgcmV0dXJuZWQsIG51bGwgc2hvdWxkIGJlIHVzZWQgYXMgdGhlIHJlZixcblx0XHQgKiBpbmRpY2F0aW5nIHRoYXQgdGhlIGluc2VydGlvbiBzaG91bGQgb2NjdXIgYXQgdGhlIGVuZCBvZiB0aGUgY2hpbGQgbGlzdC5cblx0XHQgKi9cblx0XHRwcml2YXRlIHJlc29sdmVSZWYoKTogUmVmXG5cdFx0e1xuXHRcdFx0Y29uc3QgcmVmID0gdGhpcy5sYXN0O1xuXHRcdFx0XG5cdFx0XHRpZiAocmVmID09PSBudWxsKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCI/XCIpO1xuXHRcdFx0XG5cdFx0XHRpZiAocmVmID09PSBcInByZXBlbmRcIiB8fCByZWYgPT09IFwiYXBwZW5kXCIpXG5cdFx0XHRcdHJldHVybiByZWY7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHJlZkxvY2F0b3IgPSAoKCkgPT5cblx0XHRcdHtcblx0XHRcdFx0aWYgKHJlZiBpbnN0YW5jZW9mIExvY2F0b3IpXG5cdFx0XHRcdFx0cmV0dXJuIHJlZjtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IHJlZk1ldGEgPSBcblx0XHRcdFx0XHRCcmFuY2hNZXRhLm9mKHJlZikgfHxcblx0XHRcdFx0XHRDb250ZW50TWV0YS5vZihyZWYpO1xuXHRcdFx0XHRcblx0XHRcdFx0cmV0dXJuIHJlZk1ldGEgP1xuXHRcdFx0XHRcdHJlZk1ldGEubG9jYXRvciA6XG5cdFx0XHRcdFx0bnVsbDtcblx0XHRcdH0pKCk7XG5cdFx0XHRcblx0XHRcdGlmICghcmVmTG9jYXRvcilcblx0XHRcdFx0cmV0dXJuIFwiYXBwZW5kXCI7XG5cdFx0XHRcblx0XHRcdGNvbnN0IGNoaWxkcmVuID0gUm91dGluZ0xpYnJhcnkudGhpcy5nZXRDaGlsZHJlbih0aGlzLmJyYW5jaCk7XG5cdFx0XHRsZXQgcHJldmlvdXM6IElCcmFuY2ggfCBJQ29udGVudCB8IG51bGwgPSBudWxsO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAocmVmID09PSBjaGlsZClcblx0XHRcdFx0XHRyZXR1cm4gcmVmO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgY3VycmVudENoaWxkTWV0YSA9IFxuXHRcdFx0XHRcdEJyYW5jaE1ldGEub2YoY2hpbGQpIHx8XG5cdFx0XHRcdFx0Q29udGVudE1ldGEub2YoY2hpbGQpO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKGN1cnJlbnRDaGlsZE1ldGEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHQvLyBUaGUgZXhwbGFuYXRpb24gb2YgdGhpcyBhbGdvcml0aG0gaXMgdGhhdCB3ZSdyZSB3YWxraW5nIHRocm91Z2hcblx0XHRcdFx0XHQvLyB0aGUgZGlyZWN0IGNoaWxkIG1ldGFzIG9mIGNvbnRhaW5pbmdCcmFuY2guIFRoZSBpZGVhbCBjYXNlIGlzXG5cdFx0XHRcdFx0Ly8gdGhhdCB0aGUgbWV0YSB0aGF0IHdhcyBwcmV2aW91c2x5IGJlaW5nIHVzZWQgYXMgdGhlIGxvY2F0b3IgaXNcblx0XHRcdFx0XHQvLyBzdGlsbCBwcmVzZW50IGluIHRoZSBkb2N1bWVudC4gSW4gdGhpcyBjYXNlLCB0aGUgcmVmIGRvZXNuJ3QgbmVlZFxuXHRcdFx0XHRcdC8vIHRvIGJlIHVwZGF0ZWQsIHNvIGl0IGNhbiBqdXN0IGJlIHJldHVybmVkIHZlcmJhdGltLiBIb3dldmVyLCBcblx0XHRcdFx0XHQvLyBpbiB0aGUgY2FzZSB3aGVuIHRoZSByZWYgaXMgbWlzc2luZywgd2UgbmVlZCB0byByZXR1cm4gdGhlIG5leHRcblx0XHRcdFx0XHQvLyBuZXdlc3QgbWV0YSB0aGF0IGlzbid0IG5ld2VyIHRoYW4gdGhlIGxvY2F0b3Igb2YgdGhlIG9yaWdpbmFsXG5cdFx0XHRcdFx0Ly8gcmVmLlxuXHRcdFx0XHRcdGNvbnN0IGNtcCA9IGN1cnJlbnRDaGlsZE1ldGEubG9jYXRvci5jb21wYXJlKHJlZkxvY2F0b3IpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChjbXAgPT09IENvbXBhcmVSZXN1bHQuZXF1YWwpXG5cdFx0XHRcdFx0XHRyZXR1cm4gY2hpbGQ7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Ly8gVGhlIGN1cnJlbnQgY2hpbGQgbWV0YSBpcyBuZXdlciB0aGFuIHRoZSByZWYgbWV0YS4gVGhpcyBtZWFuc1xuXHRcdFx0XHRcdC8vIHRoYXQgd2Ugd2VudCB0b28gZmFyLCBzbyB3ZSBzaG91bGQgcmV0dXJuIHRoZSBwcmV2aW91cyBtZXRhLlxuXHRcdFx0XHRcdC8vIE9yLCBpbiB0aGUgY2FzZSB3aGVuIHdlIGhhdmVuJ3QgaGl0IGEgbWV0YSB5ZXQsIHdlIG5lZWQgdG9cblx0XHRcdFx0XHQvLyByZXR1cm4gdGhlIGNvbnN0YW50IFwicHJlcGVuZFwiIChiZWNhdXNlIHRoZXJlJ3Mgbm90aGluZyB0b1xuXHRcdFx0XHRcdC8vIHJlZmVyIHRvIGluIHRoaXMgY2FzZSkuXG5cdFx0XHRcdFx0aWYgKGNtcCA9PT0gQ29tcGFyZVJlc3VsdC5sb3dlcilcblx0XHRcdFx0XHRcdHJldHVybiBwcmV2aW91cyB8fCBcInByZXBlbmRcIjtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0cHJldmlvdXMgPSBjaGlsZDtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIFwiYXBwZW5kXCI7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFN0b3JlcyBhIHJvbGxpbmcgdmFsdWUgdGhhdCBpbmRpcmVjdGx5IHJlZmVycyB0byB0aGUgbGFzdCBtZXRhXG5cdFx0ICogdGhhdCB3YXMgYXBwZW5kZWQgdG8gdGhlIGJyYW5jaCB0aGF0IHRoaXMgdHJhY2tlciBpcyB0cmFja2luZy5cblx0XHQgKi9cblx0XHRwcml2YXRlIGxhc3Q6IFJlZiB8IExvY2F0b3I7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQGludGVybmFsXG5cdFx0ICogRm9yIGRlYnVnZ2luZyBvbmx5LlxuXHRcdCAqL1xuXHRcdHByaXZhdGUgdHJhY2tlckNvbnRhaW5lcjogVHJhY2tlciB8IHVuZGVmaW5lZDtcblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIEFycmF5U3RyZWFtTWV0YSBleHRlbmRzIFN0cmVhbU1ldGFcblx0e1xuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cmVhZG9ubHkgY29udGFpbmVyTWV0YTogQ29udGFpbmVyTWV0YSxcblx0XHRcdHJlYWRvbmx5IHJlY3VycmVudDogUmVjdXJyZW50KVxuXHRcdHtcblx0XHRcdHN1cGVyKGNvbnRhaW5lck1ldGEpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRhdHRhY2goY29udGFpbmluZ0JyYW5jaDogSUJyYW5jaCwgdHJhY2tlcjogVHJhY2tlcilcblx0XHR7XG5cdFx0XHRjb25zdCBsb2NhbFRyYWNrZXIgPSB0cmFja2VyLmRlcml2ZSgpO1xuXHRcdFx0bG9jYWxUcmFja2VyLnVwZGF0ZSh0aGlzLmxvY2F0b3IpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCByZWMgPSB0aGlzLnJlY3VycmVudDtcblx0XHRcdGNvbnN0IGZvcmNlQXJyYXk6IEFycmF5Rm9yY2U8YW55PiA9IHJlYy5zZWxlY3Rvcjtcblx0XHRcdGNvbnN0IHJlc3RBcmdzID0gcmVjLnVzZXJSZXN0QXJncy5zbGljZSgpO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGZvcmNlQXJyYXkubGVuZ3RoOylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgZm8gPSBmb3JjZUFycmF5W2ldO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgYXRvbWljcyA9IHJlYy51c2VyQ2FsbGJhY2soXG5cdFx0XHRcdFx0Zm8sXG5cdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHRpLFxuXHRcdFx0XHRcdC4uLnJlc3RBcmdzKTtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IG1ldGFzID0gQ29yZVV0aWwudHJhbnNsYXRlQXRvbWljcyhcblx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdHRoaXMuY29udGFpbmVyTWV0YSxcblx0XHRcdFx0XHRhdG9taWNzKTtcblx0XHRcdFx0XG5cdFx0XHRcdENvcmVVdGlsLmFwcGx5TWV0YXMoXG5cdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lck1ldGEsXG5cdFx0XHRcdFx0bWV0YXMsXG5cdFx0XHRcdFx0bG9jYWxUcmFja2VyKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgZmluZE1ldGEgPSAocG9zaXRpb246IG51bWJlcikgPT4gXG5cdFx0XHR7XHRcblx0XHRcdFx0bGV0IHBvcyA9IHBvc2l0aW9uO1xuXHRcdFx0XHRjb25zdCBpdGVyYXRvciA9IFJvdXRpbmdMaWJyYXJ5LnRoaXMuZ2V0Q2hpbGRyZW4oY29udGFpbmluZ0JyYW5jaCk7XG5cdFx0XHRcdGZvciAoY29uc3QgaXRlbSBvZiBpdGVyYXRvcikgXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBNZXRhID0gQnJhbmNoTWV0YS5vZihpdGVtKTtcblx0XHRcdFx0XHRpZiAoTWV0YSAmJiBcblx0XHRcdFx0XHRcdE1ldGEubG9jYXRvci5jb21wYXJlKHRoaXMubG9jYXRvcikgPT09IENvbXBhcmVSZXN1bHQubG93ZXIgJiZcblx0XHRcdFx0XHRcdC0tcG9zID09PSAtMSkgXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0cmV0dXJuIE1ldGE7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0XHRGb3JjZVV0aWwuYXR0YWNoRm9yY2UoZm9yY2VBcnJheS5yb290LmNoYW5nZWQsIChpdGVtOiBhbnksIHBvc2l0aW9uOiBudW1iZXIpID0+IFxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBpbnRlcm5hbFBvcyA9IGZvcmNlQXJyYXkucG9zaXRpb25zLmluZGV4T2YocG9zaXRpb24pO1xuXHRcdFx0XHRpZiAocG9zaXRpb24gPiAtMSkgXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBtZXRhID0gZmluZE1ldGEoaW50ZXJuYWxQb3MpO1xuXHRcdFx0XHRcdGlmIChtZXRhKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGNvbnN0IGF0b21pY3MgPSByZWMudXNlckNhbGxiYWNrKGl0ZW0sIGNvbnRhaW5pbmdCcmFuY2gsIHBvc2l0aW9uKTtcblx0XHRcdFx0XHRcdGNvbnN0IG1ldGFzID0gQ29yZVV0aWwudHJhbnNsYXRlQXRvbWljcyhcblx0XHRcdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHRcdFx0dGhpcy5jb250YWluZXJNZXRhLFxuXHRcdFx0XHRcdFx0XHRhdG9taWNzKVswXSBhcyBCcmFuY2hNZXRhO1xuXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdG1ldGFzLmxvY2F0b3Iuc2V0Q29udGFpbmVyKHRoaXMuY29udGFpbmVyTWV0YS5sb2NhdG9yKTtcblx0XHRcdFx0XHRcdFJvdXRpbmdMaWJyYXJ5LnRoaXMucmVwbGFjZUJyYW5jaChtZXRhLmJyYW5jaCwgbWV0YXMuYnJhbmNoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHRGb3JjZVV0aWwuYXR0YWNoRm9yY2UoZm9yY2VBcnJheS5hZGRlZCwgKGl0ZW06IGFueSwgcG9zaXRpb246IG51bWJlcikgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgYXRvbWljcyA9IHJlYy51c2VyQ2FsbGJhY2soaXRlbSwgY29udGFpbmluZ0JyYW5jaCwgcG9zaXRpb24pO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgbWV0YXMgPSBDb3JlVXRpbC50cmFuc2xhdGVBdG9taWNzKFxuXHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0dGhpcy5jb250YWluZXJNZXRhLFxuXHRcdFx0XHRcdGF0b21pY3MpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRsZXQgdHJhY2tlciA9IGxvY2FsVHJhY2tlcjtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChwb3NpdGlvbiA8IGZvcmNlQXJyYXkubGVuZ3RoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgbWV0YSA9IGZpbmRNZXRhKHBvc2l0aW9uIC0gMSk7XG5cdFx0XHRcdFx0aWYgKG1ldGEpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0dHJhY2tlciA9IGxvY2FsVHJhY2tlci5kZXJpdmUoKTtcblx0XHRcdFx0XHRcdHRyYWNrZXIudXBkYXRlKG1ldGEuYnJhbmNoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0XHRcblx0XHRcdFx0Q29yZVV0aWwuYXBwbHlNZXRhcyhcblx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdHRoaXMuY29udGFpbmVyTWV0YSxcblx0XHRcdFx0XHRtZXRhcyxcblx0XHRcdFx0XHR0cmFja2VyKTtcblx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRGb3JjZVV0aWwuYXR0YWNoRm9yY2UoZm9yY2VBcnJheS5yZW1vdmVkLCAoaXRlbTogYW55LCBwb3NpdGlvbjogbnVtYmVyKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBtZXRhID0gZmluZE1ldGEocG9zaXRpb24pO1xuXHRcdFx0XHRpZiAobWV0YSlcblx0XHRcdFx0XHRDb3JlVXRpbC51bmFwcGx5TWV0YXMoY29udGFpbmluZ0JyYW5jaCwgW21ldGFdKTtcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHRGb3JjZVV0aWwuYXR0YWNoRm9yY2UoZm9yY2VBcnJheS5tb3ZlZCwgKGl0ZW0xOiBhbnksIGl0ZW0yOiBhbnksIGluZGV4MTogbnVtYmVyLCBpbmRleDI6IG51bWJlcikgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3Qgc291cmNlID0gZmluZE1ldGEoaW5kZXgxKTtcblx0XHRcdFx0Y29uc3QgdGFyZ2V0ID0gZmluZE1ldGEoaW5kZXgyKTtcblxuXHRcdFx0XHRpZiAoc291cmNlICYmIHRhcmdldClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IHNyY0xvY1ZhbCA9IHNvdXJjZS5sb2NhdG9yLmdldGxhc3RMb2NhdG9yVmFsdWUoKTtcblx0XHRcdFx0XHRjb25zdCB0YXJnZXRMb2NWYWwgPSB0YXJnZXQubG9jYXRvci5nZXRsYXN0TG9jYXRvclZhbHVlKCk7XG5cdFx0XHRcdFx0c291cmNlLmxvY2F0b3Iuc2V0TGFzdExvY2F0b3JWYWx1ZSh0YXJnZXRMb2NWYWwpO1xuXHRcdFx0XHRcdHRhcmdldC5sb2NhdG9yLnNldExhc3RMb2NhdG9yVmFsdWUoc3JjTG9jVmFsKTtcblxuXHRcdFx0XHRcdFJvdXRpbmdMaWJyYXJ5LnRoaXMuc3dhcEJyYW5jaGVzKHNvdXJjZS5icmFuY2gsIHRhcmdldC5icmFuY2gpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Rm9yY2VVdGlsLmF0dGFjaEZvcmNlKGZvcmNlQXJyYXkudGFpbENoYW5nZSwgKGl0ZW06IGFueSwgcG9zaXRpb246IG51bWJlcikgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3Qgc291cmNlID0gZmluZE1ldGEocG9zaXRpb24pO1xuXHRcdFx0XHRpZiAoc291cmNlKVxuXHRcdFx0XHRcdGxvY2FsVHJhY2tlci51cGRhdGUoc291cmNlLmJyYW5jaCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBmaWx0ZXJSZW5kZXJlZChyZW5kZXJlZDogTWV0YVtdKVxuXHRcdHtcblx0XHRcdGNvbnN0IG1ldGFzID0gcmVuZGVyZWQuc2xpY2UoKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChsZXQgaSA9IG1ldGFzLmxlbmd0aDsgaS0tID4gMDspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IG1ldGEgPSBtZXRhc1tpXTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChtZXRhIGluc3RhbmNlb2YgQnJhbmNoTWV0YSB8fCBtZXRhIGluc3RhbmNlb2YgQ29udGVudE1ldGEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRtZXRhLmtleSA9ICsrdGhpcy5uZXh0TWV0YUtleTtcblx0XHRcdFx0XHRyZW5kZXJlZC5zcGxpY2UoaSwgMSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIG1ldGFzO1xuXHRcdH1cblx0XHRcblx0XHRwcml2YXRlIG5leHRNZXRhS2V5ID0gMDtcblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIHVuZmlsdGVyUmVuZGVyZWQoa2V5OiBudW1iZXIsIGNvbnRhaW5pbmdCcmFuY2g6IElCcmFuY2gpXG5cdFx0e1xuXHRcdFx0Y29uc3QgcmVzb2x2ZWQ6IE1ldGFbXSA9IFtdO1xuXHRcdFx0Y29uc3QgaXRlcmF0b3IgPSBSb3V0aW5nTGlicmFyeS50aGlzLmdldENoaWxkcmVuKGNvbnRhaW5pbmdCcmFuY2gpO1xuXHRcdFx0bGV0IGluUmFuZ2UgPSBmYWxzZTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiBpdGVyYXRvcilcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgY2hpbGRNZXRhID0gXG5cdFx0XHRcdFx0QnJhbmNoTWV0YS5vZig8YW55PmNoaWxkKSB8fFxuXHRcdFx0XHRcdENvbnRlbnRNZXRhLm9mKDxhbnk+Y2hpbGQpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRpZiAoY2hpbGRNZXRhICYmIGNoaWxkTWV0YS5rZXkgPT09IGtleSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGluUmFuZ2UgPSB0cnVlO1xuXHRcdFx0XHRcdHJlc29sdmVkLnB1c2goY2hpbGRNZXRhKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChpblJhbmdlKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gcmVzb2x2ZWQ7XG5cdFx0fVxuXHR9XG5cdFxuXHR0eXBlIEFycmF5SXRlbVJlbmRlcmVyRm4gPSAoaXRlbTogYW55LCBicmFuY2g6IElCcmFuY2gsIGluZGV4OiBudW1iZXIpID0+IGFueTtcbn1cbiJdfQ==