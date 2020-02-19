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
            constructor(branch, initialAtoms, library, locator) {
                super(locator || new Core.Locator(0 /* branch */));
                /**
                 * An arbitrary unique value used to identify an index in a force
                 * array that was responsible for rendering this BranchMeta.
                 */
                this.key = 0;
                this.library = library;
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
            constructor(value, library, locator) {
                super(locator);
                this.value = value;
                /**
                 * An arbitrary unique value used to identify an index in a force
                 * array that was responsible for rendering this BranchMeta.
                 */
                this.key = 0;
                this.library = library;
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
var Reflex;
(function (Reflex) {
    /**
     * Stores a WeakMap of all forces used across the entire system.
     */
    const globalForceMap = new WeakMap();
    /** */
    class ForceEntry {
        constructor() {
            this.systemCallbacks = new Set();
            this.watchers = [];
        }
    }
    /**
     * Returns a boolean that indicates whether the specified value
     * is a stateless or stateful force.
     */
    function isForce(fo) {
        return isStatelessForce(fo) || fo instanceof Reflex.StatefulForce;
    }
    Reflex.isForce = isForce;
    /**
     * Guards on whether the specified value is stateless force function.
     */
    function isStatelessForce(forceFn) {
        return !!forceFn && globalForceMap.has(forceFn);
    }
    Reflex.isStatelessForce = isStatelessForce;
    let Core;
    (function (Core) {
        /** @internal */
        Core.ForceUtil = {
            /** */
            createFunction() {
                // The user force function is sent back to the user, who uses
                // this function as a parameter to other on() calls, or to call
                // directly when the thing happens.
                const userForceFn = (...args) => {
                    const foFn = globalForceMap.get(userForceFn);
                    if (foFn) {
                        for (const watcherFn of foFn.watchers)
                            watcherFn(...args);
                        for (const systemCallback of foFn.systemCallbacks)
                            systemCallback(...args);
                    }
                };
                userForceFn.watch = (function (watchFn) {
                    const foFn = globalForceMap.get(this);
                    if (foFn)
                        foFn.watchers.push(watchFn);
                    return this;
                }).bind(userForceFn);
                const fe = new ForceEntry();
                globalForceMap.set(userForceFn, fe);
                return userForceFn;
            },
            /**
             * Returns the StatelessForce that corresponds to the specified
             * force function.
             */
            attachForce(fn, systemCallback) {
                const re = globalForceMap.get(fn);
                if (re)
                    re.systemCallbacks.add(systemCallback);
            },
            /**
             *
             */
            detachForce(fn, systemCallback) {
                const fo = globalForceMap.get(fn);
                if (fo)
                    fo.systemCallbacks.delete(systemCallback);
            }
        };
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
            this.returners = [];
            this.watchers = [];
            this._value = value;
        }
        /**
         * Gets or sets the value of the force.
         */
        get value() {
            return this._value;
        }
        set value(value) {
            if (value === this._value)
                return;
            let was = this._value;
            this._value = value;
            // Use a sliced version of the returners array instead of
            // the actual, to handle the case when external code is
            // adding returners to the force in the code that is run
            // when the force changes.
            let wasRet = was;
            let nowRet = value;
            // Move through all the returners, left to right, storing
            // the old values, and feeding them into the next returner.
            for (const retFn of this.returners.slice()) {
                this._value = retFn(nowRet, wasRet);
                if (this._value !== void 0 && this._value === this._value) {
                    wasRet = nowRet;
                    nowRet = this._value;
                }
            }
            // In the case when some return function changed
            // the value back to what it was originally, then cancel
            // further propagation.
            if (this._value === was)
                return;
            this.changed(value, was);
            for (const watchFn of this.watchers.slice())
                watchFn(this._value, was);
        }
        /**
         * Sets the value of the force and returns void.
         * (Useful for force arguments in arrow functions to cancel the return value.)
         */
        set(value) {
            this.value = value;
        }
        /**
         * Returns a string representation of the value of this force.
         */
        toString() {
            return "" + this._value;
        }
        /**
         * Returns a JavaScript primitive representation of the force.
         */
        valueOf() {
            return this._value;
        }
        /**
         * Adds a translation function to this force that is executed when the
         * value of the force changes, but after the change has propagated
         * to the rest of the system.
         *
         * The return value of the function specified in the `returnFn` argument
         * is fed to the other return functions that were added in the same way,
         * before finally becoming the propagated value.
         *
         * This method can be used to cancel the propagation of a force by
         * simply returning the value passed in through the "was" parameter.
         * In this case, it will be assumed that the force's internal state value
         * hasn't actually changed, and so propagation will be cancelled.
         *
         * If the returned value is undefined or NaN, these are return values
         * are ignored, and the chain of return function calls proceeds.
         *
         * @returns A reference to this force.
         */
        return(returnFn) {
            if (!this.returners.includes(returnFn))
                this.returners.push(returnFn);
            return this;
        }
        /**
         * Adds a watching function to this force that is executed after the
         * value of the force has changed and has propagated.
         *
         * @returns A reference to this force.
         */
        watch(watchFn) {
            if (!this.watchers.includes(watchFn))
                this.watchers.push(watchFn);
            return this;
        }
    }
    Reflex.StatefulForce = StatefulForce;
    /**
     * A class that wraps a boolean whose changes can be observed.
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
    /**
     * A class that mimicks a JavaScript array, but whose contents can be observed.
     */
    class ArrayForce extends Reflex.StatefulForce {
        /** */
        constructor(root) {
            super(root);
            /**
             * A StatelessForce that triggers when an item is added to the backing array.
             */
            this.added = force();
            /**
             * A StatelessForce that triggers when an item is removed from the backing array.
             */
            this.removed = force();
            /**
             * A StatelessForce that triggers when an item is moved in the backing array
             * from one position to another.
             */
            this.moved = force();
            /**
             * A StatelessForce that triggers when the last item of the ArrayForce changes.
             */
            this.tailChanged = force();
            /** @internal */
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
            const reload = (newValue, oldValue) => {
                for (const watchFn of this.watchers.slice())
                    watchFn(newValue, oldValue);
            };
            Reflex.Core.ForceUtil.attachForce(this.root.changed, () => {
                this.executeFilter();
                this.executeSort();
            });
            Reflex.Core.ForceUtil.attachForce(this.added, (item) => {
                reload(item, null);
            });
            Reflex.Core.ForceUtil.attachForce(this.removed, (item) => {
                reload(null, item);
            });
            Reflex.Core.ForceUtil.attachForce(this.moved, (e1, e2) => {
                reload(e1, e2);
            });
        }
        /** @internal */
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
                for (let i = this.positions.length; i-- > 0;) {
                    const position = this.positions[i];
                    const root = this.getRoot(position);
                    if (!this.filterFn(root, i, this)) {
                        const loc = this.positions.indexOf(position);
                        if (loc < 0)
                            throw new Error("Unknown state.");
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
                        const itemNow = this.get(n);
                        const itemNext = this.get(n + 1);
                        if (this.sortFn(itemNow, itemNext) > 0) {
                            changed = true;
                            [array[n], array[n + 1]] = [array[n + 1], array[n]];
                            this.moved(itemNow, itemNext, n, n + 1);
                        }
                    }
                    if (!changed)
                        break;
                }
                const newLastItem = array[length - 1];
                if (lastItem !== newLastItem)
                    this.tailChanged(this.get(length - 1), length - 1);
            }
        }
        /** */
        filterPush(...items) {
            if (this.filterFn)
                return items
                    .filter((value, index) => this.filterFn && this.filterFn(value, index, this))
                    .map(item => this.root.push(item));
            return items.map(item => this.root.push(item));
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
                        return index !== index ?
                            target[prop] :
                            target.get(index);
                    },
                    set(target, prop, value) {
                        const index = parseInt(prop, 10);
                        if (index !== index)
                            target.set(value, index);
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
            const result = this.root.get(index);
            if (result === void 0)
                throw new Error("No item exists at the position " + index);
            return result;
        }
        /**
         * Sets a value within the array, at the specified index.
         */
        set(value, index = this.positions.length - 1) {
            if (this.filterFn)
                if (!this.filterFn(value, index, this))
                    this.positions.splice(index, 1);
            this.root.set(this.positions[index], value);
        }
        /**
         * Returns snapshot of this ArrayForce as a plain JavaScript array.
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
            const fo = ArrayForce.create(this.positions
                .map(x => this.getRoot(x))
                .map((value, index) => callbackFn.call(thisArg || this, value, index, this)));
            Reflex.Core.ForceUtil.attachForce(this.added, (item, index) => {
                fo.splice(index, 0, callbackFn(item, index, this));
            });
            Reflex.Core.ForceUtil.attachForce(this.removed, (item, index, id) => {
                const loc = fo.positions.indexOf(id);
                if (loc > -1)
                    fo.splice(loc, 1);
            });
            Reflex.Core.ForceUtil.attachForce(this.root.changed, (item, index) => {
                fo.root.set(index, callbackFn(item, index, this));
            });
            return fo;
        }
        filter(callbackFn, ...forces) {
            const array = new ArrayForce(this);
            array.filterFn = callbackFn;
            for (const fo of forces) {
                Reflex.Core.ForceUtil.attachForce(fo instanceof Reflex.StatefulForce ? fo.changed : fo, () => {
                    array.executeFilter();
                    for (let i = -1; ++i < this.positions.length;) {
                        const pos = this.positions[i];
                        if (array.filterFn)
                            if (array.filterFn(this.getRoot(i), i, this))
                                if (!array.positions.includes(pos))
                                    array.insertRef(i, pos);
                    }
                });
            }
            array.insertRef(0, ...this.positions);
            return array.proxy();
        }
        reduce(callbackFn, initialValue) {
            return this.positions.reduce((previousVal, currentVal, currentIdx) => {
                return callbackFn(previousVal, this.get(currentVal), currentIdx, this);
            }, initialValue);
        }
        reduceRight(callbackFn, initialValue) {
            return this.positions.reduceRight((previousVal, currentVal, currentIdx) => {
                return callbackFn(previousVal, this.get(currentVal), currentIdx, this);
            }, initialValue);
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
            const startIdx = Math.max(0, start || 0);
            for (let i = (end !== null && end !== void 0 ? end : this.positions.length); i-- > startIdx;)
                this.set(value, i);
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
            for (let i = this.positions.length; i-- > fromIndex;)
                if (this.get(i) === searchElement)
                    return true;
            return false;
        }
        /** */
        flatMap(callback, thisArg) {
            return this.map(callback, thisArg).flat();
        }
        flat(depth = 1) {
            if (depth < 1)
                return this;
            const levelDown = (source) => {
                const fo = ArrayForce
                    .create(source.snapshot()
                    .flatMap(v => v instanceof ArrayForce ?
                    v.snapshot() :
                    v));
                const numberMap = new Map();
                Reflex.Core.ForceUtil.attachForce(source.added, (item, index) => {
                    const id = source.positions[index];
                    const indexes = item.map(v => fo.root.push(v));
                    numberMap.set(id, indexes);
                    fo.positions.splice(index, 0, ...indexes);
                    for (let i = -1; ++i < indexes.length;) {
                        fo.added(item[i], index + i);
                        fo.defineIndex(index + i);
                    }
                });
                Reflex.Core.ForceUtil.attachForce(source.removed, (item, index, id) => {
                    const map = numberMap.get(id);
                    if (map) {
                        for (const item of map) {
                            const loc = fo.positions.indexOf(item);
                            if (loc > -1)
                                fo.splice(loc, 1);
                        }
                    }
                });
                return fo;
            };
            let result = this;
            while (depth--)
                result = levelDown(result);
            return result;
        }
        /**
         *
         */
        distinct(keyFn) {
            const keyMap = new Map();
            const fo = ArrayForce.create([]);
            const added = (item, index) => {
                const key = keyFn(item, index);
                const current = keyMap.get(key) || 0;
                if (!current)
                    fo.splice(index, 0, item);
                keyMap.set(key, current + 1);
            };
            const removed = (item, index) => {
                const key = keyFn(item, index);
                let current = keyMap.get(key) || 0;
                if (current > 0) {
                    current--;
                    if (current === 0) {
                        keyMap.delete(key);
                        const itemSerialized = JSON.stringify(item);
                        const loc = fo.findIndex(item => JSON.stringify(item) == itemSerialized);
                        if (loc > -1)
                            fo.splice(loc, 1);
                    }
                    else {
                        keyMap.set(key, current);
                    }
                }
            };
            for (let i = -1; ++i < this.length;)
                added(this[i], i);
            Reflex.Core.ForceUtil.attachForce(this.added, added);
            Reflex.Core.ForceUtil.attachForce(this.removed, removed);
            return fo;
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
            if (pos === void 0)
                return void 0;
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
            if (pos === void 0)
                return void 0;
            const item = this.getRoot(pos);
            this.removed(item, 0, pos);
            this.root.delete(pos);
            return item;
        }
        /** */
        splice(start, deleteCount, ...items) {
            const positions = this.positions.splice(start, deleteCount);
            for (let i = -1; ++i < positions.length;) {
                const item = positions[i];
                this.removed(this.getRoot(item), start + i, item);
            }
            this.insertRef(start, ...this.filterPush(...items));
            const result = positions.map(pos => this.getRoot(pos));
            for (const pos of positions)
                this.root.delete(pos);
            return result;
        }
        /**
         * Returns absolute index in root
         */
        absoluteIndex(index) {
            return this.positions[index];
        }
        /**
         * Returns item from root with given absolute index
         */
        getAbsolute(index) {
            return this.root.get(index);
        }
        /**
         * Diff with given array and apply changes
         */
        reset(state) {
            const diff = this.snapshot()
                .map((v, i) => v !== state[i] ? i : undefined)
                .filter((v) => v !== undefined)
                .reverse();
            for (const item of diff)
                this.splice(item, 1);
            for (let index = -1; ++index < state.length;) {
                const item = state[index];
                if (index >= this.positions.length || this[index] !== item)
                    this.splice(index, 0, item);
            }
        }
        /** */
        as(ctor) {
            return new ctor(this);
        }
    }
    Reflex.ArrayForce = ArrayForce;
})(Reflex || (Reflex = {}));
/// <reference path="Meta/Meta.ts" />
/// <reference path="Meta/BranchMeta.ts" />
/// <reference path="Meta/LeafMeta.ts" />
/// <reference path="Meta/RecurrentStreamMeta.ts" />
/// <reference path="Meta/PromiseStreamMeta.ts" />
/// <reference path="Meta/AsyncIterableStreamMeta.ts" />
/// <reference path="ForceUtil.ts" />
/// <reference path="StatefulForce.ts" />
/// <reference path="ArrayForce.ts" />
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
                if (Object.prototype.hasOwnProperty.call(this.root, index))
                    this.changed(value, index);
                else
                    this.root[index] = { value: void 0, ref: 1 };
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
                        item.value = void 0;
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
                let lib = null;
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
                    const existingMeta = Core.BranchMeta.of(atom) || Core.LeafMeta.of(atom);
                    if (existingMeta &&
                        ((lib = lib || Core.RoutingLibrary.of(containerBranch)) === existingMeta.library))
                        metas.push(existingMeta);
                    else if (atom instanceof Core.Meta)
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
                    // This error occurs when something was passed as a atom 
                    // to a branch function, and neither the Reflex core, or any of
                    // the connected Reflexive libraries know what to do with it.
                    else
                        throw new Error("Unidentified flying object.");
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
                            if (metasReturned.length < 1)
                                continue;
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
         * Returns the ILibrary instance that corresponds to the specified namespace
         * object. This function is used for layering Reflexive libraries on top of each
         * other, i.e., to defer the implementation of one of the ILibrary functions to
         * another ILibrary at a lower-level.
         *
         * The typings of the returned ILibrary assume that all ILibrary functions are
         * implemented in order to avoid excessive "possibly undefined" checks.
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
         * Returns the IBranch back to the user, while providing an
         * opportunity for the Reflexive library to augment the actual
         * return value.
         */
        function returnBranch(branch, atoms) {
            const lib = Core.RoutingLibrary.of(branch);
            if (!lib)
                throw new Error("Unknown branch type.");
            new Core.BranchMeta(branch, atoms, lib);
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
                                new Core.LeafMeta(result, library);
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
                    new Core.LeafMeta(object, library);
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
             * Returns a reference to the Reflexive library that
             * interprets the specified object as a branch.
             */
            static of(branch) {
                if (branch)
                    for (const lib of RoutingLibrary.libraries)
                        if (lib.isKnownBranch(branch))
                            return lib;
                return null;
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
                Core.ForceUtil.attachForce(arrayForce.tailChanged, (item, position) => {
                    const source = findMeta(position);
                    if (source)
                        localTracker.update(source.branch);
                });
            }
        }
        Core.ArrayStreamMeta = ArrayStreamMeta;
    })(Core = Reflex.Core || (Reflex.Core = {}));
})(Reflex || (Reflex = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmbGV4LWNvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90c2NvbnN0LnRzIiwiLi4vY29yZS9NZXRhL01ldGEudHMiLCIuLi9jb3JlL01ldGEvQnJhbmNoTWV0YS50cyIsIi4uL2NvcmUvTWV0YS9MZWFmTWV0YS50cyIsIi4uL2NvcmUvTWV0YS9SZWN1cnJlbnRTdHJlYW1NZXRhLnRzIiwiLi4vY29yZS9NZXRhL1Byb21pc2VTdHJlYW1NZXRhLnRzIiwiLi4vY29yZS9NZXRhL0FzeW5jSXRlcmFibGVTdHJlYW1NZXRhLnRzIiwiLi4vY29yZS9Gb3JjZVV0aWwudHMiLCIuLi9jb3JlL1N0YXRlZnVsRm9yY2UudHMiLCIuLi9jb3JlL0FycmF5Rm9yY2UudHMiLCIuLi9jb3JlLyEudHMiLCIuLi9jb3JlL0FycmF5U3RvcmUudHMiLCIuLi9jb3JlL0NoaWxkcmVuT2YudHMiLCIuLi9jb3JlL0NvcmVVdGlsLnRzIiwiLi4vY29yZS9EZWZpbml0aW9ucy50cyIsIi4uL2NvcmUvR2xvYmFscy50cyIsIi4uL2NvcmUvSUxpYnJhcnkudHMiLCIuLi9jb3JlL0xvY2F0b3IudHMiLCIuLi9jb3JlL05hbWVzcGFjZU9iamVjdC50cyIsIi4uL2NvcmUvTm9kZUFycmF5LnRzIiwiLi4vY29yZS9SZWFkeVN0YXRlLnRzIiwiLi4vY29yZS9SZWN1cnJlbnQudHMiLCIuLi9jb3JlL1JvdXRpbmdMaWJyYXJ5LnRzIiwiLi4vY29yZS9UcmFja2VyLnRzIiwiLi4vY29yZS9NZXRhL0FycmF5U3RyZWFtTWV0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQ0NBLElBQVUsTUFBTSxDQXVFZjtBQXZFRCxXQUFVLE1BQU07SUFBQyxJQUFBLElBQUksQ0F1RXBCO0lBdkVnQixXQUFBLElBQUk7UUFFcEIsTUFBTTtRQUNOLE1BQXNCLElBQUk7WUFFekIsWUFBcUIsT0FBZ0I7Z0JBQWhCLFlBQU8sR0FBUCxPQUFPLENBQVM7WUFBSSxDQUFDO1NB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Q0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUFDLE1BQU07d0JBQ3BELEtBQUssQ0FBQzs0QkFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQUMsTUFBTTt3QkFDMUQsS0FBSyxDQUFDOzRCQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQUMsTUFBTTt3QkFDaEUsS0FBSyxDQUFDOzRCQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUFDLE1BQU07d0JBQ3RFLEtBQUssQ0FBQzs0QkFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFD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QW1CLEVBQUUsQ0FBQzt3QkFDdkQsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO3dCQUMxRCxNQUFNLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxDQUFDO3dCQUNqRCxNQUFNLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO3dCQUM5QyxLQUFBLGNBQWMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO3FCQUMvRDtnQkFDRixDQUFDLENBQUMsQ0FBQztnQkFFSCxLQUFBLFNBQVMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQVMsRUFBRSxRQUFnQixFQUFFLEVBQUU7b0JBRTdFLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxNQUFNO3dCQUNULFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNyQyxDQUFDLENBQUMsQ0FBQztZQUNKLENBQUM7U0FDRDtRQXhJWSxvQkFBZSxrQkF3STNCLENBQUE7SUFDRixDQUFDLEVBOUlnQixJQUFJLEdBQUosV0FBSSxLQUFKLFdBQUksUUE4SXBCO0FBQUQsQ0FBQyxFQTlJUyxNQUFNLEtBQU4sTUFBTSxRQThJZiIsInNvdXJjZXNDb250ZW50IjpbIlxuY29uc3QgZW51bSBDb25zdFxue1xuXHRcIlwiLFxuXHRkZWJ1Zyxcblx0bW9kZXJuLFxuXHRub2RlLFxuXHRicm93c2VyXG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKiogKi9cblx0ZXhwb3J0IGFic3RyYWN0IGNsYXNzIE1ldGFcblx0e1xuXHRcdGNvbnN0cnVjdG9yKHJlYWRvbmx5IGxvY2F0b3I6IExvY2F0b3IpIHsgfVxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGFic3RyYWN0IGNsYXNzIFN0ZW1NZXRhIGV4dGVuZHMgTWV0YVxuXHR7XG5cdFx0Y29uc3RydWN0b3IobG9jYXRvcj86IExvY2F0b3IpXG5cdFx0e1xuXHRcdFx0c3VwZXIobG9jYXRvciB8fCBuZXcgTG9jYXRvcihMb2NhdG9yVHlwZS5sZWFmKSk7XG5cdFx0fVxuXHR9XG5cdFxuXHQvKipcblx0ICogU3RvcmVzIHRoZSBpbmZvcm1hdGlvbiBhYm91dCBhIHNpbmdsZSBhdHRyaWJ1dGUuXG5cdCAqIEFsdGhvdWdoIGF0dHJpYnV0ZXMgY2FuIGNvbWUgaW4gYSBsYXJnZSBvYmplY3QgbGl0ZXJhbFxuXHQgKiB0aGF0IHNwZWNpZmllcyBtYW55IGF0dHJpYnV0ZXMgdG9nZXRoZXIsIHRoZSBhdG9tXG5cdCAqIHRyYW5zbGF0b3IgZnVuY3Rpb24gc3BsaXRzIHRoZW0gdXAgaW50byBzbWFsbGVyIG1ldGFzLFxuXHQgKiB3aGljaCBpcyBkb25lIGJlY2F1c2Ugc29tZSB2YWx1ZXMgbWF5IGJlIHN0YXRpYyxcblx0ICogYW5kIG90aGVycyBtYXkgYmUgYmVoaW5kIGEgZm9yY2UuXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQXR0cmlidXRlTWV0YSBleHRlbmRzIFN0ZW1NZXRhXG5cdHtcblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdHJlYWRvbmx5IGtleTogc3RyaW5nLFxuXHRcdFx0cmVhZG9ubHkgdmFsdWU6IGFueSlcblx0XHR7XG5cdFx0XHRzdXBlcigpO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqXG5cdCAqIFN0b3JlcyBpbmZvcm1hdGlvbiBhYm91dCBzb21lIHZhbHVlIHRoYXQgaXMga25vd25cblx0ICogdG8gdGhlIGxpYnJhcnkgdGhhdCB3aWxsIGJlIGFwcGxpZWQgdG8gc29tZSBicmFuY2guXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgVmFsdWVNZXRhIGV4dGVuZHMgU3RlbU1ldGFcblx0e1xuXHRcdGNvbnN0cnVjdG9yKHJlYWRvbmx5IHZhbHVlOiBzdHJpbmcgfCBudW1iZXIgfCBiaWdpbnQpXG5cdFx0e1xuXHRcdFx0c3VwZXIoKTtcblx0XHR9XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgY2xhc3MgQ2xvc3VyZU1ldGEgZXh0ZW5kcyBTdGVtTWV0YVxuXHR7XG5cdFx0Y29uc3RydWN0b3IocmVhZG9ubHkgY2xvc3VyZTogRnVuY3Rpb24pXG5cdFx0e1xuXHRcdFx0c3VwZXIoKTtcblx0XHR9XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgYWJzdHJhY3QgY2xhc3MgQ29udGFpbmVyTWV0YSBleHRlbmRzIE1ldGEgeyB9XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgYWJzdHJhY3QgY2xhc3MgU3RyZWFtTWV0YSBleHRlbmRzIENvbnRhaW5lck1ldGFcblx0e1xuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cmVhZG9ubHkgY29udGFpbmVyTWV0YTogQ29udGFpbmVyTWV0YSxcblx0XHRcdGxvY2F0b3I/OiBMb2NhdG9yKVxuXHRcdHtcblx0XHRcdHN1cGVyKGxvY2F0b3IgfHwgbmV3IExvY2F0b3IoTG9jYXRvclR5cGUuc3RyZWFtKSk7XG5cdFx0fVxuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQnJhbmNoTWV0YSBleHRlbmRzIENvbnRhaW5lck1ldGFcblx0e1xuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgdGhlIEJyYW5jaE1ldGEgb2JqZWN0IHRoYXQgY29ycmVzcG9uZHNcblx0XHQgKiB0byB0aGUgc3BlY2lmaWVkIEJyYW5jaCBvYmplY3QuXG5cdFx0ICovXG5cdFx0c3RhdGljIG9mKGJyYW5jaDogSUJyYW5jaClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5tZXRhcy5nZXQoYnJhbmNoKSB8fCBudWxsO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIHN0YXRpYyByZWFkb25seSBtZXRhcyA9IG5ldyBXZWFrTWFwPElCcmFuY2gsIEJyYW5jaE1ldGE+KCk7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRicmFuY2g6IElCcmFuY2gsXG5cdFx0XHRpbml0aWFsQXRvbXM6IEF0b21bXSxcblx0XHRcdGxpYnJhcnk6IElMaWJyYXJ5LFxuXHRcdFx0bG9jYXRvcj86IExvY2F0b3IpXG5cdFx0e1xuXHRcdFx0c3VwZXIobG9jYXRvciB8fCBuZXcgTG9jYXRvcihMb2NhdG9yVHlwZS5icmFuY2gpKTtcblx0XHRcdFxuXHRcdFx0dGhpcy5saWJyYXJ5ID0gbGlicmFyeTtcblx0XHRcdHRoaXMuYnJhbmNoID0gYnJhbmNoO1xuXHRcdFx0QnJhbmNoTWV0YS5tZXRhcy5zZXQoYnJhbmNoLCB0aGlzKTtcblx0XHRcdFxuXHRcdFx0aWYgKGluaXRpYWxBdG9tcy5sZW5ndGgpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IG1ldGFzID0gQ29yZVV0aWwudHJhbnNsYXRlQXRvbXMoXG5cdFx0XHRcdFx0YnJhbmNoLFxuXHRcdFx0XHRcdHRoaXMsXG5cdFx0XHRcdFx0aW5pdGlhbEF0b21zKTtcblx0XHRcdFx0XG5cdFx0XHRcdENvcmVVdGlsLmFwcGx5TWV0YXMoYnJhbmNoLCB0aGlzLCBtZXRhcyk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEBpbnRlcm5hbFxuXHRcdCAqIFN0b3JlcyBhIHJlZmVyZW5jZSB0byB0aGUgSUxpYnJhcnkgdGhhdCB3YXMgcmVzcG9uc2libGUgZm9yXG5cdFx0ICogaW5zdGFudGlhdGluZyB0aGUgdW5kZXJseWluZyBicmFuY2ggb2JqZWN0LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGxpYnJhcnk6IElMaWJyYXJ5O1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEBpbnRlcm5hbFxuXHRcdCAqIFdBUk5JTkc6IERvIG5vdCBob2xkIG9udG8gcmVmZXJlbmNlcyB0byB0aGlzXG5cdFx0ICogdmFsdWUsIG9yIG1lbW9yeSBsZWFrcyB3aWxsIGhhcHBlbi5cblx0XHQgKiBcblx0XHQgKiAoTm90ZTogdGhpcyBwcm9wZXJ0eSBpcyBhIGJpdCBvZiBhIGNvZGUgc21lbGwuIFRoZSB1c2FnZXNcblx0XHQgKiBvZiBpdCBzaG91bGQgYmUgcmVwbGFjZWQgd2l0aCBjb2RlIHRoYXQgcmUtZGlzY292ZXJzIHRoZVxuXHRcdCAqIGJyYW5jaCBvYmplY3QuKVxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGJyYW5jaDogSUJyYW5jaDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBBbiBhcmJpdHJhcnkgdW5pcXVlIHZhbHVlIHVzZWQgdG8gaWRlbnRpZnkgYW4gaW5kZXggaW4gYSBmb3JjZVxuXHRcdCAqIGFycmF5IHRoYXQgd2FzIHJlc3BvbnNpYmxlIGZvciByZW5kZXJpbmcgdGhpcyBCcmFuY2hNZXRhLlxuXHRcdCAqL1xuXHRcdGtleSA9IDA7XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKiAqL1xuXHRleHBvcnQgY2xhc3MgTGVhZk1ldGEgZXh0ZW5kcyBTdGVtTWV0YVxuXHR7XG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyB0aGUgTGVhZk1ldGEgb2JqZWN0IHRoYXQgY29ycmVzcG9uZHNcblx0XHQgKiB0byB0aGUgc3BlY2lmaWVkIExlYWYgb2JqZWN0LlxuXHRcdCAqL1xuXHRcdHN0YXRpYyBvZihsZWFmOiBJTGVhZilcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5tZXRhcy5nZXQobGVhZikgfHwgbnVsbDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgbWV0YXMgPSBuZXcgV2Vha01hcDxJTGVhZiwgTGVhZk1ldGE+KCk7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRyZWFkb25seSB2YWx1ZTogSUxlYWYsXG5cdFx0XHRsaWJyYXJ5OiBJTGlicmFyeSxcblx0XHRcdGxvY2F0b3I/OiBMb2NhdG9yKVxuXHRcdHtcblx0XHRcdHN1cGVyKGxvY2F0b3IpO1xuXHRcdFx0dGhpcy5saWJyYXJ5ID0gbGlicmFyeTtcblx0XHRcdExlYWZNZXRhLm1ldGFzLnNldCh2YWx1ZSwgdGhpcyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEBpbnRlcm5hbFxuXHRcdCAqIFN0b3JlcyBhIHJlZmVyZW5jZSB0byB0aGUgSUxpYnJhcnkgdGhhdCB3YXMgcmVzcG9uc2libGUgZm9yXG5cdFx0ICogaW5zdGFudGlhdGluZyB0aGUgdW5kZXJseWluZyBicmFuY2ggb2JqZWN0LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGxpYnJhcnk6IElMaWJyYXJ5O1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEFuIGFyYml0cmFyeSB1bmlxdWUgdmFsdWUgdXNlZCB0byBpZGVudGlmeSBhbiBpbmRleCBpbiBhIGZvcmNlXG5cdFx0ICogYXJyYXkgdGhhdCB3YXMgcmVzcG9uc2libGUgZm9yIHJlbmRlcmluZyB0aGlzIEJyYW5jaE1ldGEuXG5cdFx0ICovXG5cdFx0a2V5ID0gMDtcblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIFJlY3VycmVudFN0cmVhbU1ldGEgZXh0ZW5kcyBTdHJlYW1NZXRhXG5cdHtcblx0XHQvKiogKi9cblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdHJlYWRvbmx5IGNvbnRhaW5lck1ldGE6IENvbnRhaW5lck1ldGEsXG5cdFx0XHRyZWFkb25seSByZWN1cnJlbnQ6IFJlY3VycmVudCxcblx0XHRcdGxvY2F0b3I/OiBMb2NhdG9yKVxuXHRcdHtcblx0XHRcdHN1cGVyKGNvbnRhaW5lck1ldGEsIGxvY2F0b3IpO1xuXHRcdFx0dGhpcy5yZWN1cnJlbnQgPSByZWN1cnJlbnQ7XG5cdFx0XHRjb25zdCBzZWxmID0gdGhpcztcblx0XHRcdFxuXHRcdFx0dGhpcy5fc3lzdGVtQ2FsbGJhY2sgPSAoZnVuY3Rpb24odGhpczogSUJyYW5jaCwgLi4uc3lzdGVtUmVzdEFyZ3M6IGFueVtdKVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBUaGlzIGlzIGNoZWF0aW5nIGEgYml0LiBXZSdyZSBnZXR0aW5nIHRoZSBicmFuY2hcblx0XHRcdFx0Ly8gZnJvbSB0aGUgXCJ0aGlzXCIgcmVmZXJlbmNlIHBhc3NlZCB0byBldmVudCBjYWxsYmFja3MuXG5cdFx0XHRcdC8vIFNvbWUgbGlicmFyaWVzIChzdWNoIGFzIHRoZSBET00pIHNldCB0aGUgXCJ0aGlzXCIgcmVmZXJlbmNlXG5cdFx0XHRcdC8vIHRvIHdoYXQgZXNzZW50aWFsbHkgYW1vdW50cyB0byB0aGUgYnJhbmNoIHdlJ3JlIHRyeWluZ1xuXHRcdFx0XHQvLyB0byBnZXQsIHdpdGhvdXQgYWN0dWFsbHkgc3RvcmluZyBhIHJlZmVyZW5jZSB0byBpdC4gSG9wZWZ1bGx5XG5cdFx0XHRcdC8vIHRoZSBvdGhlciBwbGF0Zm9ybXMgb24gd2hpY2ggcmVmbGV4aXZlIGxpYnJhcmllcyBhcmUgYnVpbHRcblx0XHRcdFx0Ly8gd2lsbCBleGhpYml0IChvciBjYW4gYmUgbWFkZSB0byBleGliaXQpIHRoaXMgc2FtZSBiZWhhdmlvci5cblx0XHRcdFx0XG5cdFx0XHRcdGlmICh0aGlzID09PSBudWxsKVxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkxpYnJhcnkgbm90IGltcGxlbWVudGVkIHByb3Blcmx5LlwiKTtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IHdhc01ldGFzID0gcmVzb2x2ZVJldHVybmVkKHNlbGYucmV0dXJuZWQsIHRoaXMpO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKCFzZWxmLmluQXV0b1J1bkNvbnRleHQpXG5cdFx0XHRcdFx0aWYgKFJvdXRpbmdMaWJyYXJ5LnRoaXMuaXNCcmFuY2hEaXNwb3NlZCh0aGlzKSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRzZWxmLmRldGFjaFJlY3VycmVudHMoXG5cdFx0XHRcdFx0XHRcdHRoaXMsXG5cdFx0XHRcdFx0XHRcdHJlY3VycmVudC5zZWxlY3Rvcixcblx0XHRcdFx0XHRcdFx0c2VsZi5zeXN0ZW1DYWxsYmFjayk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdENvcmVVdGlsLnVuYXBwbHlNZXRhcyh0aGlzLCB3YXNNZXRhcyk7XG5cdFx0XHRcdFx0XHRzZWxmLnJldHVybmVkLmxlbmd0aCA9IDA7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0Ly8gVGhpcyBpcyBhIHNhZmV0eSBjaGVjaywgd2UncmUgYWxzbyBkb2luZyB0aGlzIGJlbG93LCBidXQgaXQnc1xuXHRcdFx0XHQvLyBpbXBvcnRhbnQgdG8gbWFrZSBzdXJlIHRoaXMgZ2V0cyBzZXQgdG8gZmFsc2UgYXMgc29vbiBhcyBwb3NzaWJsZS5cblx0XHRcdFx0c2VsZi5pbkF1dG9SdW5Db250ZXh0ID0gZmFsc2U7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBmbiA9IHJlY3VycmVudC51c2VyQ2FsbGJhY2s7XG5cdFx0XHRcdGNvbnN0IHIgPSBzeXN0ZW1SZXN0QXJnc1xuXHRcdFx0XHRcdC5jb25jYXQodGhpcylcblx0XHRcdFx0XHQuY29uY2F0KHJlY3VycmVudC51c2VyUmVzdEFyZ3MpO1xuXHRcdFx0XHRcblx0XHRcdFx0bGV0IHA6IGFueTtcblx0XHRcdFx0XG5cdFx0XHRcdHN3aXRjaCAoci5sZW5ndGgpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjYXNlIDA6IHAgPSBmbigpOyBicmVhaztcblx0XHRcdFx0XHRjYXNlIDE6IHAgPSBmbihyWzBdKTsgYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAyOiBwID0gZm4oclswXSwgclsxXSk7IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgMzogcCA9IGZuKHJbMF0sIHJbMV0sIHJbMl0pOyBicmVhaztcblx0XHRcdFx0XHRjYXNlIDQ6IHAgPSBmbihyWzBdLCByWzFdLCByWzJdLCByWzNdKTsgYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSA1OiBwID0gZm4oclswXSwgclsxXSwgclsyXSwgclszXSwgcls0XSk7IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgNjogcCA9IGZuKHJbMF0sIHJbMV0sIHJbMl0sIHJbM10sIHJbNF0sIHJbNV0pOyBicmVhaztcblx0XHRcdFx0XHRjYXNlIDc6IHAgPSBmbihyWzBdLCByWzFdLCByWzJdLCByWzNdLCByWzRdLCByWzVdLCByWzZdKTsgYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSA4OiBwID0gZm4oclswXSwgclsxXSwgclsyXSwgclszXSwgcls0XSwgcls1XSwgcls2XSwgcls3XSk7IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgOTogcCA9IGZuKHJbMF0sIHJbMV0sIHJbMl0sIHJbM10sIHJbNF0sIHJbNV0sIHJbNl0sIHJbN10sIHJbOF0pOyBicmVhaztcblx0XHRcdFx0XHRjYXNlIDEwOiBwID0gZm4oclswXSwgclsxXSwgclsyXSwgclszXSwgcls0XSwgcls1XSwgcls2XSwgcls3XSwgcls4XSwgcls5XSk7IGJyZWFrO1xuXHRcdFx0XHRcdGRlZmF1bHQ6IHAgPSBmbiguLi5yKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0Ly8gVGhpcyBpcyBhIHF1aWNrIHRlc3QgdG8gYXZvaWQgZG9pbmcgcG9pbnRsZXNzIHdvcmtcblx0XHRcdFx0Ly8gaW4gdGhlIHJlbGF0aXZlbHkgY29tbW9uIGNhc2UgdGhhdCB0aGUgcmVjdXJyZW50XG5cdFx0XHRcdC8vIGRvZXNuJ3QgaGF2ZSBhIHJlbGV2YW50IHJldHVybiB2YWx1ZS5cblx0XHRcdFx0aWYgKHdhc01ldGFzLmxlbmd0aCA+IDAgfHwgcCAhPT0gdW5kZWZpbmVkICYmIHAgIT09IG51bGwpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBub3dNZXRhcyA9IENvcmVVdGlsLnRyYW5zbGF0ZUF0b21zKHRoaXMsIGNvbnRhaW5lck1ldGEsIHApO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChzZWxmLndoZW4pXG5cdFx0XHRcdFx0XHRzZWxmLndoZW4od2FzTWV0YXMsIG5vd01ldGFzLCB0aGlzKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRzZWxmLnJldHVybmVkLmxlbmd0aCA9IDA7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKHJlY3VycmVudC5raW5kICE9PSBSZWN1cnJlbnRLaW5kLm9uY2UpXG5cdFx0XHRcdFx0XHRzZWxmLnJldHVybmVkLnB1c2goLi4udW5yZXNvbHZlUmV0dXJuZWQobm93TWV0YXMpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0aWYgKHJlY3VycmVudC5raW5kID09PSBSZWN1cnJlbnRLaW5kLm9uY2UpXG5cdFx0XHRcdFx0Q29yZVV0aWwudW5hcHBseU1ldGFzKHRoaXMsIFtzZWxmXSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIHRoZSB3cmFwcGVkIHZlcnNpb24gb2YgdGhlIHVzZXIncyBjYWxsYmFjayB0aGF0IGdldHMgYWRkZWRcblx0XHQgKiB0byB0aGUgUmVmbGV4aXZlIGxpYnJhcnkncyB0cmVlIChzdWNoIGFzIHZpYSBhbiBhZGRFdmVudExpc3RlbmVyKCkgY2FsbCkuXG5cdFx0ICovXG5cdFx0Z2V0IHN5c3RlbUNhbGxiYWNrKCk6IFJlY3VycmVudENhbGxiYWNrXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMuX3N5c3RlbUNhbGxiYWNrID09PSBudWxsKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHRoaXMuX3N5c3RlbUNhbGxiYWNrO1xuXHRcdH1cblx0XHRwcml2YXRlIF9zeXN0ZW1DYWxsYmFjazogUmVjdXJyZW50Q2FsbGJhY2s7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQXBwbGllcyB0aGUgc3RyZWFtIG1ldGEgKGFuZCBhbnkgbWV0YXMgdGhhdCBhcmUgc3RyZWFtZWQgZnJvbSBpdFxuXHRcdCAqIGF0IGFueSBwb2ludCBpbiB0aGUgZnV0dXJlKSB0byB0aGUgc3BlY2lmaWVkIGNvbnRhaW5pbmcgYnJhbmNoLlxuXHRcdCAqIFxuXHRcdCAqIFJldHVybnMgdGhlIGlucHV0IHJlZiB2YWx1ZSwgb3IgdGhlIGxhc3Qgc3luY2hyb25vdXNseSBpbnNlcnRlZCBtZXRhLlxuXHRcdCAqL1xuXHRcdGF0dGFjaChjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoLCB0cmFja2VyOiBUcmFja2VyKVxuXHRcdHtcblx0XHRcdHRoaXMuX3N5c3RlbUNhbGxiYWNrID0gdGhpcy5fc3lzdGVtQ2FsbGJhY2suYmluZChjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgbG9jYWxUcmFja2VyID0gdHJhY2tlci5kZXJpdmUoKTtcblx0XHRcdGxvY2FsVHJhY2tlci51cGRhdGUodGhpcy5sb2NhdG9yKTtcblx0XHRcdGNvbnN0IHJlYyA9IHRoaXMucmVjdXJyZW50O1xuXHRcdFx0XG5cdFx0XHR0aGlzLndoZW4gPSAod2FzTWV0YXMsIG5vd01ldGFzKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRpZiAod2FzTWV0YXMubGVuZ3RoKVxuXHRcdFx0XHRcdENvcmVVdGlsLnVuYXBwbHlNZXRhcyhjb250YWluaW5nQnJhbmNoLCB3YXNNZXRhcyk7XG5cdFx0XHRcdFxuXHRcdFx0XHRmb3IgKGNvbnN0IG5vd01ldGEgb2Ygbm93TWV0YXMpXG5cdFx0XHRcdFx0bm93TWV0YS5sb2NhdG9yLnNldENvbnRhaW5lcih0aGlzLmxvY2F0b3IpO1xuXHRcdFx0XHRcblx0XHRcdFx0Q29yZVV0aWwuYXBwbHlNZXRhcyhcblx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdHRoaXMsXG5cdFx0XHRcdFx0bm93TWV0YXMsXG5cdFx0XHRcdFx0bG9jYWxUcmFja2VyKTtcblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdGNvbnN0IHNlbGVjdG9yID0gQXJyYXkuaXNBcnJheShyZWMuc2VsZWN0b3IpID9cblx0XHRcdFx0cmVjLnNlbGVjdG9yIDpcblx0XHRcdFx0W3JlYy5zZWxlY3Rvcl07XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3Qgc2VsZWN0b3JJdGVtIG9mIHNlbGVjdG9yKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoc2VsZWN0b3JJdGVtIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSlcblx0XHRcdFx0XHRGb3JjZVV0aWwuYXR0YWNoRm9yY2Uoc2VsZWN0b3JJdGVtLmNoYW5nZWQsIHRoaXMuc3lzdGVtQ2FsbGJhY2spO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAoaXNTdGF0ZWxlc3NGb3JjZShzZWxlY3Rvckl0ZW0pKVxuXHRcdFx0XHRcdEZvcmNlVXRpbC5hdHRhY2hGb3JjZShzZWxlY3Rvckl0ZW0sIHRoaXMuc3lzdGVtQ2FsbGJhY2spO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBzd2l0Y2ggKHNlbGVjdG9ySXRlbSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNhc2UgbXV0YXRpb24uYW55OiBicmVhaztcblx0XHRcdFx0XHRjYXNlIG11dGF0aW9uLmJyYW5jaDogYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSBtdXRhdGlvbi5icmFuY2hBZGQ6IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgbXV0YXRpb24uYnJhbmNoUmVtb3ZlOiBicmVhaztcblx0XHRcdFx0XHRjYXNlIG11dGF0aW9uLmxlYWY6IGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgbXV0YXRpb24ubGVhZkFkZDogYnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSBtdXRhdGlvbi5sZWFmUmVtb3ZlOiBicmVhaztcblx0XHRcdFx0XHRkZWZhdWx0OiBSb3V0aW5nTGlicmFyeS50aGlzLmF0dGFjaFJlY3VycmVudChcblx0XHRcdFx0XHRcdHJlYy5raW5kLFxuXHRcdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHRcdHNlbGVjdG9ySXRlbSxcblx0XHRcdFx0XHRcdHRoaXMuc3lzdGVtQ2FsbGJhY2ssXG5cdFx0XHRcdFx0XHR0aGlzLnJlY3VycmVudC51c2VyUmVzdEFyZ3MpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGNvbnN0IGF1dG9ydW5Bcmd1bWVudHMgPSBleHRyYWN0QXV0b3J1bkFyZ3VtZW50cyhyZWMpO1xuXHRcdFx0aWYgKGF1dG9ydW5Bcmd1bWVudHMpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGl0ZW0gPSBzZWxlY3RvclswXTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChpdGVtIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSlcblx0XHRcdFx0XHR0aGlzLmludm9rZUF1dG9ydW5DYWxsYmFjayhbaXRlbS52YWx1ZSwgaXRlbS52YWx1ZV0sIGNvbnRhaW5pbmdCcmFuY2gpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAoaXNTdGF0ZWxlc3NGb3JjZShpdGVtKSlcblx0XHRcdFx0XHR0aGlzLmludm9rZUF1dG9ydW5DYWxsYmFjayhhdXRvcnVuQXJndW1lbnRzLCBjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiBpdGVtID09PSBcInN0cmluZ1wiICYmIGl0ZW0gaW4gUmVmbGV4Lm11dGF0aW9uKVxuXHRcdFx0XHRcdHRoaXMuaW52b2tlQXV0b3J1bkNhbGxiYWNrKFtSZWZsZXgubXV0YXRpb24uYW55XSwgY29udGFpbmluZ0JyYW5jaCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0dGhpcy5pbnZva2VBdXRvcnVuQ2FsbGJhY2soW10sIGNvbnRhaW5pbmdCcmFuY2gpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRkZXRhY2hSZWN1cnJlbnRzKFxuXHRcdFx0YnJhbmNoOiBJQnJhbmNoLFxuXHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdHN5c3RlbUNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9tPilcblx0XHR7XG5cdFx0XHRjb25zdCBsaWIgPSBSb3V0aW5nTGlicmFyeS50aGlzO1xuXHRcdFx0XG5cdFx0XHRpZiAoIUFycmF5LmlzQXJyYXkoc2VsZWN0b3IpKVxuXHRcdFx0XHRsaWIuZGV0YWNoUmVjdXJyZW50KGJyYW5jaCwgc2VsZWN0b3IsIHN5c3RlbUNhbGxiYWNrKTtcblx0XHRcdFxuXHRcdFx0ZWxzZSBmb3IgKGNvbnN0IHNlbGVjdG9yUGFydCBvZiBzZWxlY3Rvcilcblx0XHRcdFx0bGliLmRldGFjaFJlY3VycmVudChicmFuY2gsIHNlbGVjdG9yUGFydCwgc3lzdGVtQ2FsbGJhY2spO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDYWxsIHRoaXMgbWV0aG9kIHRvIGluZGlyZWN0bHkgaW52b2tlIHRoZSBzeXN0ZW1DYWxsYmFjaywgYnV0IGRvbmVcblx0XHQgKiBpbiBhIHdheSB0aGF0IG1ha2VzIGl0IGF3YXJlIHRoYXQgaXQncyBiZWluZyBydW4gdmlhIHRoZSBhdXRvcnVuLlxuXHRcdCAqL1xuXHRcdGludm9rZUF1dG9ydW5DYWxsYmFjayhhcmdzOiBhbnlbXSwgdGhpc0FyZz86IElCcmFuY2gpXG5cdFx0e1xuXHRcdFx0dHJ5XG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuaW5BdXRvUnVuQ29udGV4dCA9IHRydWU7XG5cdFx0XHRcdFxuXHRcdFx0XHR0aGlzQXJnID9cblx0XHRcdFx0XHR0aGlzLnN5c3RlbUNhbGxiYWNrLmFwcGx5KHRoaXNBcmcsIGFyZ3MpIDpcblx0XHRcdFx0XHR0aGlzLnN5c3RlbUNhbGxiYWNrKC4uLmFyZ3MpO1xuXHRcdFx0fVxuXHRcdFx0ZmluYWxseVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmluQXV0b1J1bkNvbnRleHQgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBpbkF1dG9SdW5Db250ZXh0ID0gZmFsc2U7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIGNhbGxiYWNrIHRoYXQgdHJpZ2dlcnMgd2hlbiB0aGUgbmV3IG1ldGFzIGhhdmUgYmVlbiBwcm9jZXNzZWQuXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSB3aGVuOiAoKHdhc01ldGFzOiBNZXRhW10sIG5vd01ldGFzOiBNZXRhW10sIGJyYW5jaDogSUJyYW5jaCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBTdG9yZXMgYW4gYXJyYXkgb2YgdmFsdWVzIHRoYXQgd2VyZSByZXR1cm5lZCBmcm9tIHRoZVxuXHRcdCAqIHJlY3VycmVudCBmdW5jdGlvbiwgaW4gc3RvcmFnaXplZCBmb3JtLlxuXHRcdCAqL1xuXHRcdHByaXZhdGUgcmVhZG9ubHkgcmV0dXJuZWQ6IChNZXRhIHwgTG9jYXRvcilbXSA9IFtdO1xuXHR9XG5cdFxuXHQvKipcblx0ICogUmV0dXJucyBhIG5ldyBhcnJheSB0aGF0IGlzIGEgY29weSBvZiB0aGUgc3BlY2lmaWVkIHJldHVybiBhcnJheSxcblx0ICogZXhjZXB0IHdpdGggdGhlIHVuc2FmZSBtZXRhcyByZXBsYWNlZCB3aXRoIGxvY2F0b3JzLlxuXHQgKi9cblx0ZnVuY3Rpb24gdW5yZXNvbHZlUmV0dXJuZWQocmV0dXJuZWQ6IE1ldGFbXSlcblx0e1xuXHRcdGNvbnN0IHVucmVzb2x2ZWQ6IChNZXRhIHwgTG9jYXRvcilbXSA9IFtdO1xuXHRcdFxuXHRcdGZvciAoY29uc3QgbWV0YSBvZiByZXR1cm5lZClcblx0XHR7XG5cdFx0XHR1bnJlc29sdmVkLnB1c2goXG5cdFx0XHRcdG1ldGEgaW5zdGFuY2VvZiBCcmFuY2hNZXRhIHx8IG1ldGEgaW5zdGFuY2VvZiBMZWFmTWV0YSA/XG5cdFx0XHRcdFx0bWV0YS5sb2NhdG9yIDpcblx0XHRcdFx0XHRtZXRhKTtcblx0XHR9XG5cdFx0XG5cdFx0cmV0dXJuIHVucmVzb2x2ZWQ7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBSZXR1cm5zIGEgbmV3IGFycmF5IHRoYXQgaXMgdGhlIGNvcHkgb2YgdGhlIHNwZWNpZmllZCByZXR1cm4gYXJyYXksXG5cdCAqIGV4Y2VwdCB3aXRoIGFueSBpbnN0YW5jZXMgb2YgTG9jYXRvciByZXBsYWNlZCB3aXRoIHRoZSBhY3R1YWwgbWV0YS5cblx0ICovXG5cdGZ1bmN0aW9uIHJlc29sdmVSZXR1cm5lZChyZXR1cm5lZDogKE1ldGEgfCBMb2NhdG9yKVtdLCBjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoKVxuXHR7XG5cdFx0Y29uc3QgcmVzb2x2ZWQ6IChNZXRhIHwgbnVsbClbXSA9IG5ldyBBcnJheShyZXR1cm5lZC5sZW5ndGgpLmZpbGwobnVsbCk7XG5cdFx0bGV0IGhhc0xvY2F0b3JzID0gZmFsc2U7XG5cdFx0XG5cdFx0Ly8gUHJlLXBvcHVsYXRlIHRoZSByZXNvbHZlZCBhcnJheSB3aXRoIGV2ZXJ5dGhpbmcgdGhhdCBpcyBhbHJlYWR5IGEgbWV0YS5cblx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IHJldHVybmVkLmxlbmd0aDspXG5cdFx0e1xuXHRcdFx0Y29uc3QgciA9IHJldHVybmVkW2ldO1xuXHRcdFx0aWYgKHIgaW5zdGFuY2VvZiBNZXRhKVxuXHRcdFx0XHRyZXNvbHZlZFtpXSA9IHI7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdGhhc0xvY2F0b3JzID0gdHJ1ZTtcblx0XHR9XG5cdFx0XG5cdFx0Ly8gQXZvaWQgaGl0dGluZyB0aGUgbGlicmFyeSBpZiBwb3NzaWJsZVxuXHRcdGlmICghaGFzTG9jYXRvcnMpXG5cdFx0XHRyZXR1cm4gPE1ldGFbXT5yZXR1cm5lZC5zbGljZSgpO1xuXHRcdFxuXHRcdGNvbnN0IGNoaWxkcmVuID0gQXJyYXkuZnJvbShSb3V0aW5nTGlicmFyeS50aGlzLmdldENoaWxkcmVuKGNvbnRhaW5pbmdCcmFuY2gpKTtcblx0XHRcblx0XHRmb3IgKGxldCByZXRJZHggPSAtMTsgKytyZXRJZHggPCByZXR1cm5lZC5sZW5ndGg7KVxuXHRcdHtcblx0XHRcdGNvbnN0IHJldCA9IHJldHVybmVkW3JldElkeF07XG5cdFx0XHRpZiAocmV0IGluc3RhbmNlb2YgTG9jYXRvcilcblx0XHRcdHtcblx0XHRcdFx0Zm9yIChsZXQgY2hpbGRJZHggPSAtMTsgKytjaGlsZElkeCA8IGNoaWxkcmVuLmxlbmd0aDspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBjaGlsZCA9IGNoaWxkcmVuW2NoaWxkSWR4XTtcblx0XHRcdFx0XHRjb25zdCBjaGlsZE1ldGEgPSBcblx0XHRcdFx0XHRcdEJyYW5jaE1ldGEub2YoPGFueT5jaGlsZCkgfHxcblx0XHRcdFx0XHRcdExlYWZNZXRhLm9mKDxhbnk+Y2hpbGQpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmICghY2hpbGRNZXRhKVxuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29uc3QgY21wID0gcmV0LmNvbXBhcmUoY2hpbGRNZXRhLmxvY2F0b3IpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChjbXAgPT09IENvbXBhcmVSZXN1bHQuZXF1YWwpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0cmVzb2x2ZWRbcmV0SWR4XSA9IGNoaWxkTWV0YTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSByZXNvbHZlZFtyZXRJZHhdID0gcmV0O1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gcmVzb2x2ZWQuZmlsdGVyKChyKTogciBpcyBNZXRhID0+IHIgIT09IG51bGwpO1xuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgUHJvbWlzZVN0cmVhbU1ldGEgZXh0ZW5kcyBTdHJlYW1NZXRhXG5cdHtcblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdHJlYWRvbmx5IGNvbnRhaW5lck1ldGE6IENvbnRhaW5lck1ldGEsXG5cdFx0XHRyZWFkb25seSBwcm9taXNlOiBQcm9taXNlPGFueT4pXG5cdFx0e1xuXHRcdFx0c3VwZXIoY29udGFpbmVyTWV0YSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGF0dGFjaChjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoLCB0cmFja2VyOiBUcmFja2VyKVxuXHRcdHtcblx0XHRcdFJlYWR5U3RhdGUuaW5jKCk7XG5cdFx0XHRcblx0XHRcdHRoaXMucHJvbWlzZS50aGVuKHJlc3VsdCA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBjb250YWluaW5nQnJhbmNoTWV0YSA9IEJyYW5jaE1ldGEub2YoY29udGFpbmluZ0JyYW5jaCk7XG5cdFx0XHRcdGlmIChjb250YWluaW5nQnJhbmNoTWV0YSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdENvcmVVdGlsLmFwcGx5TWV0YXMoXG5cdFx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdFx0dGhpcy5jb250YWluZXJNZXRhLFxuXHRcdFx0XHRcdFx0Q29yZVV0aWwudHJhbnNsYXRlQXRvbXMoXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2hNZXRhLFxuXHRcdFx0XHRcdFx0XHRyZXN1bHQpLFxuXHRcdFx0XHRcdFx0dHJhY2tlcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdFJlYWR5U3RhdGUuZGVjKCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdGV4cG9ydCBjbGFzcyBBc3luY0l0ZXJhYmxlU3RyZWFtTWV0YSBleHRlbmRzIFN0cmVhbU1ldGFcblx0e1xuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cmVhZG9ubHkgY29udGFpbmVyTWV0YTogQ29udGFpbmVyTWV0YSxcblx0XHRcdHJlYWRvbmx5IGl0ZXJhdG9yOiBBc3luY0l0ZXJhYmxlPGFueT4pXG5cdFx0e1xuXHRcdFx0c3VwZXIoY29udGFpbmVyTWV0YSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgdGhlIGlucHV0IHJlZiB2YWx1ZSwgb3IgdGhlIGxhc3Qgc3luY2hyb25vdXNseSBpbnNlcnRlZCBtZXRhLlxuXHRcdCAqL1xuXHRcdGF0dGFjaChjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoLCB0cmFja2VyOiBUcmFja2VyKVxuXHRcdHtcblx0XHRcdFJlYWR5U3RhdGUuaW5jKCk7XG5cdFx0XHRcblx0XHRcdChhc3luYyAoKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBsb2NhbFRyYWNrZXIgPSB0cmFja2VyLmRlcml2ZSgpO1xuXHRcdFx0XHRsb2NhbFRyYWNrZXIudXBkYXRlKHRoaXMubG9jYXRvcik7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBicmFuY2hNZXRhID0gQnJhbmNoTWV0YS5vZihjb250YWluaW5nQnJhbmNoKSE7XG5cdFx0XHRcdFxuXHRcdFx0XHRmb3IgYXdhaXQgKGNvbnN0IGl0ZXJhYmxlUmVzdWx0IG9mIHRoaXMuaXRlcmF0b3IpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCByZXN1bHRNZXRhcyA9IENvcmVVdGlsLnRyYW5zbGF0ZUF0b21zKFxuXHRcdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHRcdGJyYW5jaE1ldGEsXG5cdFx0XHRcdFx0XHRpdGVyYWJsZVJlc3VsdCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Zm9yIChjb25zdCByZXN1bHRNZXRhIG9mIHJlc3VsdE1ldGFzKVxuXHRcdFx0XHRcdFx0cmVzdWx0TWV0YS5sb2NhdG9yLnNldENvbnRhaW5lcih0aGlzLmxvY2F0b3IpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdENvcmVVdGlsLmFwcGx5TWV0YXMoXG5cdFx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdFx0dGhpcyxcblx0XHRcdFx0XHRcdHJlc3VsdE1ldGFzLFxuXHRcdFx0XHRcdFx0bG9jYWxUcmFja2VyKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0UmVhZHlTdGF0ZS5kZWMoKTtcblx0XHRcdH0pKCk7XG5cdFx0fVxuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXhcbntcblx0LyoqXG5cdCAqIFN0b3JlcyBhIFdlYWtNYXAgb2YgYWxsIGZvcmNlcyB1c2VkIGFjcm9zcyB0aGUgZW50aXJlIHN5c3RlbS5cblx0ICovXG5cdGNvbnN0IGdsb2JhbEZvcmNlTWFwID0gbmV3IFdlYWtNYXA8RnVuY3Rpb24sIEZvcmNlRW50cnk+KCk7XG5cdFxuXHQvKiogKi9cblx0Y2xhc3MgRm9yY2VFbnRyeVxuXHR7XG5cdFx0cmVhZG9ubHkgc3lzdGVtQ2FsbGJhY2tzID0gbmV3IFNldDxSZWN1cnJlbnRDYWxsYmFjazxBdG9tPj4oKTtcblx0XHRyZWFkb25seSB3YXRjaGVyczogQXJyb3dGdW5jdGlvbltdID0gW107XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBBIHR5cGUgdGhhdCBkZXNjcmliZXMgYSBwYXJhbWV0ZXJsZXNzIGZvcmNlIGZ1bmN0aW9uIHRoYXRcblx0ICogdHJpZ2dlcnMgdGhlIGV4ZWN1dGlvbiBvZiBhbnkgY29ubmVjdGVkIHJlY3VycmVudCBmdW5jdGlvbnNcblx0ICogd2hlbiBjYWxsZWQuXG5cdCAqL1xuXHRleHBvcnQgaW50ZXJmYWNlIFN0YXRlbGVzc0ZvcmNlXG5cdHtcblx0XHQvKipcblx0XHQgKiBUcmlnZ2VycyB0aGUgZm9yY2UsIGFuZCBjb25zZXF1ZW50bHkgaW52b2tlcyBhbnkgY29ubmVjdGVkIHJlZmxleGVzLlxuXHRcdCAqL1xuXHRcdCgpOiB2b2lkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEF0dGFjaGVzIGEgd2F0Y2hlciBmdW5jdGlvbiB0aGF0IGlzIGNhbGxlZCBpbW1lZGlhdGVseSBiZWZvcmUgdGhpc1xuXHRcdCAqIFN0YXRlbGVzc0ZvcmNlIGlzIGFib3V0IHRvIGJlIHRyaWdnZXJlZC5cblx0XHQgKi9cblx0XHR3YXRjaCh3YXRjaEZuOiAoKSA9PiB2b2lkKTogU3RhdGVsZXNzRm9yY2U7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgdHlwZSBBcnJvd0Z1bmN0aW9uID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkO1xuXHRcblx0LyoqXG5cdCAqIEEgdHlwZSB0aGF0IGRlc2NyaWJlcyBhIGZvcmNlIGZ1bmN0aW9uIHdpdGggMSBvciBtb3JlIHBhcmFtZXRlcnNcblx0ICogdGhhdCB0cmlnZ2VycyB0aGUgZXhlY3V0aW9uIG9mIGFueSBjb25uZWN0ZWQgcmVjdXJyZW50IGZ1bmN0aW9uc1xuXHQgKiB3aGVuIGNhbGxlZC5cblx0ICovXG5cdGV4cG9ydCB0eXBlIFN0YXRlbGVzc0ZvcmNlUGFyYW1ldHJpYzxGIGV4dGVuZHMgQXJyb3dGdW5jdGlvbj4gPVxuXHR7XG5cdFx0LyoqXG5cdFx0ICogVHJpZ2dlcnMgdGhlIGZvcmNlLCBhbmQgY29uc2VxdWVudGx5IGludm9rZXMgYW55IGNvbm5lY3RlZCByZWZsZXhlcyxcblx0XHQgKiBhbmQgcGFzc2VzIHRoZW0gdGhlIHNwZWNpZmllZCBhcmd1bWVudHMuXG5cdFx0ICovXG5cdFx0KC4uLmFyZ3M6IFBhcmFtZXRlcnM8Rj4pOiB2b2lkO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEF0dGFjaGVzIGEgd2F0Y2hlciBmdW5jdGlvbiB0aGF0IGlzIGNhbGxlZCBpbW1lZGlhdGVseSBiZWZvcmUgdGhpc1xuXHRcdCAqIFN0YXRlbGVzc0ZvcmNlIGlzIGFib3V0IHRvIGJlIHRyaWdnZXJlZC5cblx0XHQgKi9cblx0XHR3YXRjaCh3YXRjaEZuOiBGKTogU3RhdGVsZXNzRm9yY2VQYXJhbWV0cmljPEY+O1xuXHR9O1xuXHRcblx0LyoqXG5cdCAqIFJldHVybnMgYSBib29sZWFuIHRoYXQgaW5kaWNhdGVzIHdoZXRoZXIgdGhlIHNwZWNpZmllZCB2YWx1ZVxuXHQgKiBpcyBhIHN0YXRlbGVzcyBvciBzdGF0ZWZ1bCBmb3JjZS5cblx0ICovXG5cdGV4cG9ydCBmdW5jdGlvbiBpc0ZvcmNlKGZvOiBhbnkpOiBmbyBpcyBBcnJvd0Z1bmN0aW9uIHwgU3RhdGVmdWxGb3JjZVxuXHR7XG5cdFx0cmV0dXJuIGlzU3RhdGVsZXNzRm9yY2UoZm8pIHx8IGZvIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIEd1YXJkcyBvbiB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgdmFsdWUgaXMgc3RhdGVsZXNzIGZvcmNlIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGlzU3RhdGVsZXNzRm9yY2UoZm9yY2VGbjogYW55KTogZm9yY2VGbiBpcyBTdGF0ZWxlc3NGb3JjZVxuXHR7XG5cdFx0cmV0dXJuICEhZm9yY2VGbiAmJiBnbG9iYWxGb3JjZU1hcC5oYXMoZm9yY2VGbik7XG5cdH1cblx0XG5cdGV4cG9ydCBuYW1lc3BhY2UgQ29yZVxuXHR7XG5cdFx0LyoqIEBpbnRlcm5hbCAqL1xuXHRcdGV4cG9ydCBjb25zdCBGb3JjZVV0aWwgPVxuXHRcdHtcblx0XHRcdC8qKiAqL1xuXHRcdFx0Y3JlYXRlRnVuY3Rpb24oKVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBUaGUgdXNlciBmb3JjZSBmdW5jdGlvbiBpcyBzZW50IGJhY2sgdG8gdGhlIHVzZXIsIHdobyB1c2VzXG5cdFx0XHRcdC8vIHRoaXMgZnVuY3Rpb24gYXMgYSBwYXJhbWV0ZXIgdG8gb3RoZXIgb24oKSBjYWxscywgb3IgdG8gY2FsbFxuXHRcdFx0XHQvLyBkaXJlY3RseSB3aGVuIHRoZSB0aGluZyBoYXBwZW5zLlxuXHRcdFx0XHRjb25zdCB1c2VyRm9yY2VGbiA9ICguLi5hcmdzOiBhbnlbXSkgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IGZvRm4gPSBnbG9iYWxGb3JjZU1hcC5nZXQodXNlckZvcmNlRm4pO1xuXHRcdFx0XHRcdGlmIChmb0ZuKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGZvciAoY29uc3Qgd2F0Y2hlckZuIG9mIGZvRm4ud2F0Y2hlcnMpXG5cdFx0XHRcdFx0XHRcdHdhdGNoZXJGbiguLi5hcmdzKTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRmb3IgKGNvbnN0IHN5c3RlbUNhbGxiYWNrIG9mIGZvRm4uc3lzdGVtQ2FsbGJhY2tzKVxuXHRcdFx0XHRcdFx0XHRzeXN0ZW1DYWxsYmFjayguLi5hcmdzKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cdFx0XHRcdFxuXHRcdFx0XHQoPFN0YXRlbGVzc0ZvcmNlPnVzZXJGb3JjZUZuKS53YXRjaCA9IChmdW5jdGlvbih0aGlzOiBGdW5jdGlvbiwgd2F0Y2hGbjogQXJyb3dGdW5jdGlvbilcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IGZvRm4gPSBnbG9iYWxGb3JjZU1hcC5nZXQodGhpcyk7XG5cdFx0XHRcdFx0aWYgKGZvRm4pXG5cdFx0XHRcdFx0XHRmb0ZuLndhdGNoZXJzLnB1c2god2F0Y2hGbik7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0cmV0dXJuIDxhbnk+dGhpcztcblx0XHRcdFx0XHRcblx0XHRcdFx0fSkuYmluZCh1c2VyRm9yY2VGbik7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBmZSA9IG5ldyBGb3JjZUVudHJ5KCk7XG5cdFx0XHRcdGdsb2JhbEZvcmNlTWFwLnNldCh1c2VyRm9yY2VGbiwgZmUpO1xuXHRcdFx0XHRyZXR1cm4gdXNlckZvcmNlRm47XG5cdFx0XHR9LFxuXHRcdFx0XG5cdFx0XHQvKipcblx0XHRcdCAqIFJldHVybnMgdGhlIFN0YXRlbGVzc0ZvcmNlIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIHNwZWNpZmllZFxuXHRcdFx0ICogZm9yY2UgZnVuY3Rpb24uXG5cdFx0XHQgKi9cblx0XHRcdGF0dGFjaEZvcmNlPEYgZXh0ZW5kcyBBcnJvd0Z1bmN0aW9uPihcblx0XHRcdFx0Zm46IFN0YXRlbGVzc0ZvcmNlIHwgU3RhdGVsZXNzRm9yY2VQYXJhbWV0cmljPEY+LFxuXHRcdFx0XHRzeXN0ZW1DYWxsYmFjazogUmVjdXJyZW50Q2FsbGJhY2s8QXRvbT4pXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHJlID0gZ2xvYmFsRm9yY2VNYXAuZ2V0KGZuKTtcblx0XHRcdFx0aWYgKHJlKVxuXHRcdFx0XHRcdHJlLnN5c3RlbUNhbGxiYWNrcy5hZGQoc3lzdGVtQ2FsbGJhY2spO1xuXHRcdFx0fSxcblx0XHRcdFxuXHRcdFx0LyoqXG5cdFx0XHQgKiBcblx0XHRcdCAqL1xuXHRcdFx0ZGV0YWNoRm9yY2U8RiBleHRlbmRzIEFycm93RnVuY3Rpb24+KFxuXHRcdFx0XHRmbjogU3RhdGVsZXNzRm9yY2UgfCBTdGF0ZWxlc3NGb3JjZVBhcmFtZXRyaWM8Rj4sXG5cdFx0XHRcdHN5c3RlbUNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9tPilcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgZm8gPSBnbG9iYWxGb3JjZU1hcC5nZXQoZm4pO1xuXHRcdFx0XHRpZiAoZm8pXG5cdFx0XHRcdFx0Zm8uc3lzdGVtQ2FsbGJhY2tzLmRlbGV0ZShzeXN0ZW1DYWxsYmFjayk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4XG57XG5cdC8qKlxuXHQgKiBBIGNsYXNzIHRoYXQgd3JhcHMgYSB2YWx1ZSB3aG9zZSBjaGFuZ2VzIGNhbiBiZSBvYnNlcnZlZC5cblx0ICovXG5cdGV4cG9ydCBjbGFzcyBTdGF0ZWZ1bEZvcmNlPFQgPSBhbnk+XG5cdHtcblx0XHRjb25zdHJ1Y3Rvcih2YWx1ZTogVClcblx0XHR7XG5cdFx0XHR0aGlzLl92YWx1ZSA9IHZhbHVlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogXG5cdFx0ICogR2V0cyBvciBzZXRzIHRoZSB2YWx1ZSBvZiB0aGUgZm9yY2UuXG5cdFx0ICovXG5cdFx0Z2V0IHZhbHVlKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5fdmFsdWU7XG5cdFx0fVxuXHRcdHNldCB2YWx1ZSh2YWx1ZTogVClcblx0XHR7XG5cdFx0XHRpZiAodmFsdWUgPT09IHRoaXMuX3ZhbHVlKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcblx0XHRcdGxldCB3YXMgPSB0aGlzLl92YWx1ZTtcblx0XHRcdHRoaXMuX3ZhbHVlID0gdmFsdWU7XG5cdFx0XHRcblx0XHRcdC8vIFVzZSBhIHNsaWNlZCB2ZXJzaW9uIG9mIHRoZSByZXR1cm5lcnMgYXJyYXkgaW5zdGVhZCBvZlxuXHRcdFx0Ly8gdGhlIGFjdHVhbCwgdG8gaGFuZGxlIHRoZSBjYXNlIHdoZW4gZXh0ZXJuYWwgY29kZSBpc1xuXHRcdFx0Ly8gYWRkaW5nIHJldHVybmVycyB0byB0aGUgZm9yY2UgaW4gdGhlIGNvZGUgdGhhdCBpcyBydW5cblx0XHRcdC8vIHdoZW4gdGhlIGZvcmNlIGNoYW5nZXMuXG5cdFx0XHRsZXQgd2FzUmV0ID0gd2FzO1xuXHRcdFx0bGV0IG5vd1JldCA9IHZhbHVlO1xuXHRcdFx0XG5cdFx0XHQvLyBNb3ZlIHRocm91Z2ggYWxsIHRoZSByZXR1cm5lcnMsIGxlZnQgdG8gcmlnaHQsIHN0b3Jpbmdcblx0XHRcdC8vIHRoZSBvbGQgdmFsdWVzLCBhbmQgZmVlZGluZyB0aGVtIGludG8gdGhlIG5leHQgcmV0dXJuZXIuXG5cdFx0XHRmb3IgKGNvbnN0IHJldEZuIG9mIHRoaXMucmV0dXJuZXJzLnNsaWNlKCkpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3ZhbHVlID0gcmV0Rm4obm93UmV0LCB3YXNSZXQpO1xuXHRcdFx0XHRpZiAodGhpcy5fdmFsdWUgIT09IHZvaWQgMCAmJiB0aGlzLl92YWx1ZSA9PT0gdGhpcy5fdmFsdWUpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR3YXNSZXQgPSBub3dSZXQ7XG5cdFx0XHRcdFx0bm93UmV0ID0gdGhpcy5fdmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Ly8gSW4gdGhlIGNhc2Ugd2hlbiBzb21lIHJldHVybiBmdW5jdGlvbiBjaGFuZ2VkXG5cdFx0XHQvLyB0aGUgdmFsdWUgYmFjayB0byB3aGF0IGl0IHdhcyBvcmlnaW5hbGx5LCB0aGVuIGNhbmNlbFxuXHRcdFx0Ly8gZnVydGhlciBwcm9wYWdhdGlvbi5cblx0XHRcdGlmICh0aGlzLl92YWx1ZSA9PT0gd2FzKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcblx0XHRcdHRoaXMuY2hhbmdlZCh2YWx1ZSwgd2FzKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCB3YXRjaEZuIG9mIHRoaXMud2F0Y2hlcnMuc2xpY2UoKSlcblx0XHRcdFx0d2F0Y2hGbih0aGlzLl92YWx1ZSwgd2FzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqIEBpbnRlcm5hbCAqL1xuXHRcdHByaXZhdGUgX3ZhbHVlOiBhbnk7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU2V0cyB0aGUgdmFsdWUgb2YgdGhlIGZvcmNlIGFuZCByZXR1cm5zIHZvaWQuXG5cdFx0ICogKFVzZWZ1bCBmb3IgZm9yY2UgYXJndW1lbnRzIGluIGFycm93IGZ1bmN0aW9ucyB0byBjYW5jZWwgdGhlIHJldHVybiB2YWx1ZS4pXG5cdFx0ICovXG5cdFx0c2V0KHZhbHVlOiBUKVxuXHRcdHtcblx0XHRcdHRoaXMudmFsdWUgPSB2YWx1ZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQGludGVybmFsXG5cdFx0ICogSXQncyBpbXBvcnRhbnQgdGhhdCB0aGlzIGlzIGFuIGFzc2lnbm1lbnQgcmF0aGVyIHRoYW4gYSBmdW5jdGlvbixcblx0XHQgKiBiZWNhdXNlIHRoZSBldmVudCBuZWVkcyB0byBiZSBvbiB0aGUgaW5zdGFuY2UgcmF0aGVyIHRoYW4gaW4gdGhlXG5cdFx0ICogcHJvdG90eXBlIHNvIHRoYXQgaXQncyBjYXVnaHQgYnkgdGhlIGV2ZW50IHN5c3RlbS5cblx0XHQgKi9cblx0XHRjaGFuZ2VkID0gZm9yY2U8KG5vdzogVCwgd2FzOiBUKSA9PiB2b2lkPigpO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIHZhbHVlIG9mIHRoaXMgZm9yY2UuXG5cdFx0ICovXG5cdFx0dG9TdHJpbmcoKVxuXHRcdHtcblx0XHRcdHJldHVybiBcIlwiICsgdGhpcy5fdmFsdWU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgYSBKYXZhU2NyaXB0IHByaW1pdGl2ZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZm9yY2UuXG5cdFx0ICovXG5cdFx0dmFsdWVPZigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuX3ZhbHVlO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBBZGRzIGEgdHJhbnNsYXRpb24gZnVuY3Rpb24gdG8gdGhpcyBmb3JjZSB0aGF0IGlzIGV4ZWN1dGVkIHdoZW4gdGhlXG5cdFx0ICogdmFsdWUgb2YgdGhlIGZvcmNlIGNoYW5nZXMsIGJ1dCBhZnRlciB0aGUgY2hhbmdlIGhhcyBwcm9wYWdhdGVkXG5cdFx0ICogdG8gdGhlIHJlc3Qgb2YgdGhlIHN5c3RlbS5cblx0XHQgKiBcblx0XHQgKiBUaGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiBzcGVjaWZpZWQgaW4gdGhlIGByZXR1cm5GbmAgYXJndW1lbnRcblx0XHQgKiBpcyBmZWQgdG8gdGhlIG90aGVyIHJldHVybiBmdW5jdGlvbnMgdGhhdCB3ZXJlIGFkZGVkIGluIHRoZSBzYW1lIHdheSxcblx0XHQgKiBiZWZvcmUgZmluYWxseSBiZWNvbWluZyB0aGUgcHJvcGFnYXRlZCB2YWx1ZS5cblx0XHQgKiBcblx0XHQgKiBUaGlzIG1ldGhvZCBjYW4gYmUgdXNlZCB0byBjYW5jZWwgdGhlIHByb3BhZ2F0aW9uIG9mIGEgZm9yY2UgYnlcblx0XHQgKiBzaW1wbHkgcmV0dXJuaW5nIHRoZSB2YWx1ZSBwYXNzZWQgaW4gdGhyb3VnaCB0aGUgXCJ3YXNcIiBwYXJhbWV0ZXIuXG5cdFx0ICogSW4gdGhpcyBjYXNlLCBpdCB3aWxsIGJlIGFzc3VtZWQgdGhhdCB0aGUgZm9yY2UncyBpbnRlcm5hbCBzdGF0ZSB2YWx1ZVxuXHRcdCAqIGhhc24ndCBhY3R1YWxseSBjaGFuZ2VkLCBhbmQgc28gcHJvcGFnYXRpb24gd2lsbCBiZSBjYW5jZWxsZWQuXG5cdFx0ICogXG5cdFx0ICogSWYgdGhlIHJldHVybmVkIHZhbHVlIGlzIHVuZGVmaW5lZCBvciBOYU4sIHRoZXNlIGFyZSByZXR1cm4gdmFsdWVzXG5cdFx0ICogYXJlIGlnbm9yZWQsIGFuZCB0aGUgY2hhaW4gb2YgcmV0dXJuIGZ1bmN0aW9uIGNhbGxzIHByb2NlZWRzLlxuXHRcdCAqIFxuXHRcdCAqIEByZXR1cm5zIEEgcmVmZXJlbmNlIHRvIHRoaXMgZm9yY2UuXG5cdFx0ICovXG5cdFx0cmV0dXJuKHJldHVybkZuOiAobm93OiBULCB3YXM6IFQpID0+IFQpXG5cdFx0e1xuXHRcdFx0aWYgKCF0aGlzLnJldHVybmVycy5pbmNsdWRlcyhyZXR1cm5GbikpXG5cdFx0XHRcdHRoaXMucmV0dXJuZXJzLnB1c2gocmV0dXJuRm4pO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQWRkcyBhIHdhdGNoaW5nIGZ1bmN0aW9uIHRvIHRoaXMgZm9yY2UgdGhhdCBpcyBleGVjdXRlZCBhZnRlciB0aGVcblx0XHQgKiB2YWx1ZSBvZiB0aGUgZm9yY2UgaGFzIGNoYW5nZWQgYW5kIGhhcyBwcm9wYWdhdGVkLlxuXHRcdCAqIFxuXHRcdCAqIEByZXR1cm5zIEEgcmVmZXJlbmNlIHRvIHRoaXMgZm9yY2UuXG5cdFx0ICovXG5cdFx0d2F0Y2god2F0Y2hGbjogKG5vdzogVCwgd2FzOiBUKSA9PiB2b2lkKVxuXHRcdHtcblx0XHRcdGlmICghdGhpcy53YXRjaGVycy5pbmNsdWRlcyh3YXRjaEZuKSlcblx0XHRcdFx0dGhpcy53YXRjaGVycy5wdXNoKHdhdGNoRm4pO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0XG5cdFx0cHJvdGVjdGVkIHJlYWRvbmx5IHJldHVybmVyczogKChub3c6IFQsIHdhczogVCkgPT4gVClbXSA9IFtdO1xuXHRcdHByb3RlY3RlZCByZWFkb25seSB3YXRjaGVyczogKChub3c6IFQsIHdhczogVCkgPT4gdm9pZClbXSA9IFtdO1xuXHR9XG5cdFxuXHQvKipcblx0ICogQSBjbGFzcyB0aGF0IHdyYXBzIGEgYm9vbGVhbiB3aG9zZSBjaGFuZ2VzIGNhbiBiZSBvYnNlcnZlZC5cblx0ICovXG5cdGV4cG9ydCBjbGFzcyBCb29sZWFuRm9yY2UgZXh0ZW5kcyBTdGF0ZWZ1bEZvcmNlPGJvb2xlYW4+XG5cdHtcblx0XHQvKipcblx0XHQgKiBGbGlwcyB0aGUgdmFsdWUgb2YgdGhlIGZvcmNlIGZyb20gdHJ1ZSB0byBmYWxzZSBvciBmYWxzZSB0byB0cnVlLlxuXHRcdCAqIChVc2VmdWwgZm9yIGZvcmNlIGFyZ3VtZW50cyBpbiBhcnJvdyBmdW5jdGlvbnMgdG8gY2FuY2VsIHRoZSByZXR1cm4gdmFsdWUuKVxuXHRcdCAqL1xuXHRcdGZsaXAoKVxuXHRcdHtcblx0XHRcdHRoaXMuc2V0KCF0aGlzLnZhbHVlKTtcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleFxue1xuXHQvKipcblx0ICogQSBjbGFzcyB0aGF0IG1pbWlja3MgYSBKYXZhU2NyaXB0IGFycmF5LCBidXQgd2hvc2UgY29udGVudHMgY2FuIGJlIG9ic2VydmVkLlxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIEFycmF5Rm9yY2U8VD4gZXh0ZW5kcyBTdGF0ZWZ1bEZvcmNlIGltcGxlbWVudHMgQXJyYXk8VD5cblx0e1xuXHRcdC8qKiBAaW50ZXJuYWwgKi9cblx0XHRzdGF0aWMgY3JlYXRlPFQ+KGl0ZW1zOiBUW10pXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RvcmUgPSBuZXcgQ29yZS5BcnJheVN0b3JlPFQ+KCk7XG5cdFx0XHRjb25zdCB2aWV3ID0gbmV3IEFycmF5Rm9yY2Uoc3RvcmUpO1xuXHRcdFx0dmlldy5wdXNoKC4uLml0ZW1zKTtcblx0XHRcdHJldHVybiB2aWV3LnByb3h5KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdFtuOiBudW1iZXJdOiBUO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEEgU3RhdGVsZXNzRm9yY2UgdGhhdCB0cmlnZ2VycyB3aGVuIGFuIGl0ZW0gaXMgYWRkZWQgdG8gdGhlIGJhY2tpbmcgYXJyYXkuXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgYWRkZWQgPSBmb3JjZTwoaXRlbTogVCwgcG9zaXRpb246IG51bWJlcikgPT4gdm9pZD4oKTtcblx0XHRcblx0XHQvKipcblx0XHQgKiBBIFN0YXRlbGVzc0ZvcmNlIHRoYXQgdHJpZ2dlcnMgd2hlbiBhbiBpdGVtIGlzIHJlbW92ZWQgZnJvbSB0aGUgYmFja2luZyBhcnJheS5cblx0XHQgKi9cblx0XHRyZWFkb25seSByZW1vdmVkID0gZm9yY2U8KGl0ZW06IFQsIHBvc2l0aW9uOiBudW1iZXIsIGlkOiBudW1iZXIpID0+IHZvaWQ+KCk7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogQSBTdGF0ZWxlc3NGb3JjZSB0aGF0IHRyaWdnZXJzIHdoZW4gYW4gaXRlbSBpcyBtb3ZlZCBpbiB0aGUgYmFja2luZyBhcnJheVxuXHRcdCAqIGZyb20gb25lIHBvc2l0aW9uIHRvIGFub3RoZXIuXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgbW92ZWQgPSBmb3JjZTwoZTE6IFQsIGUyOiBULCBpMTogbnVtYmVyLCBpMjogbnVtYmVyKSA9PiB2b2lkPigpO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEEgU3RhdGVsZXNzRm9yY2UgdGhhdCB0cmlnZ2VycyB3aGVuIHRoZSBsYXN0IGl0ZW0gb2YgdGhlIEFycmF5Rm9yY2UgY2hhbmdlcy5cblx0XHQgKi9cdFxuXHRcdHJlYWRvbmx5IHRhaWxDaGFuZ2VkID0gZm9yY2U8KGl0ZW06IFQsIHBvc2l0aW9uOiBudW1iZXIpID0+IHZvaWQ+KCk7XG5cdFx0XG5cdFx0LyoqIEBpbnRlcm5hbCAqL1xuXHRcdHJlYWRvbmx5IHBvc2l0aW9uczogbnVtYmVyW10gPSBbXTtcblx0XHRcblx0XHQvKiogQGludGVybmFsICovXG5cdFx0cmVhZG9ubHkgcm9vdDogQ29yZS5BcnJheVN0b3JlPFQ+O1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByb3RlY3RlZCBjb25zdHJ1Y3Rvcihyb290OiBDb3JlLkFycmF5U3RvcmU8VD4gfCBBcnJheUZvcmNlPFQ+KVxuXHRcdHtcblx0XHRcdHN1cGVyKHJvb3QpO1xuXHRcdFx0XG5cdFx0XHRpZiAocm9vdCBpbnN0YW5jZW9mIENvcmUuQXJyYXlTdG9yZSlcblx0XHRcdHtcdFxuXHRcdFx0XHR0aGlzLnJvb3QgPSByb290O1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5yb290ID0gcm9vdC5yb290O1xuXHRcdFx0XHRcblx0XHRcdFx0Q29yZS5Gb3JjZVV0aWwuYXR0YWNoRm9yY2Uocm9vdC5hZGRlZCwgKGl0ZW06IFQsIGluZGV4OiBudW1iZXIpID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmluc2VydFJlZihpbmRleCwgcm9vdC5wb3NpdGlvbnNbaW5kZXhdKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRDb3JlLkZvcmNlVXRpbC5hdHRhY2hGb3JjZShyb290LnJlbW92ZWQsIChpdGVtOiBULCBpbmRleDogbnVtYmVyLCBpZDogbnVtYmVyKSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgbG9jID0gdGhpcy5wb3NpdGlvbnMuaW5kZXhPZihpZCk7XG5cdFx0XHRcdFx0aWYgKGxvYyA+IC0xKSBcblx0XHRcdFx0XHRcdHRoaXMuc3BsaWNlKGxvYywgMSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRjb25zdCByZWxvYWQgPSAobmV3VmFsdWU6IFQgfCBudWxsLCBvbGRWYWx1ZTogVMKgfCBudWxsKSA9PiBcblx0XHRcdHtcblx0XHRcdFx0Zm9yIChjb25zdCB3YXRjaEZuIG9mIHRoaXMud2F0Y2hlcnMuc2xpY2UoKSlcblx0XHRcdFx0XHR3YXRjaEZuKG5ld1ZhbHVlLCBvbGRWYWx1ZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdENvcmUuRm9yY2VVdGlsLmF0dGFjaEZvcmNlKHRoaXMucm9vdC5jaGFuZ2VkLCAoKSA9PiBcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5leGVjdXRlRmlsdGVyKCk7XG5cdFx0XHRcdHRoaXMuZXhlY3V0ZVNvcnQoKTtcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHRDb3JlLkZvcmNlVXRpbC5hdHRhY2hGb3JjZSh0aGlzLmFkZGVkLCAoaXRlbTogVCkgPT5cblx0XHRcdHtcblx0XHRcdFx0cmVsb2FkKGl0ZW0sIG51bGwpO1xuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdENvcmUuRm9yY2VVdGlsLmF0dGFjaEZvcmNlKHRoaXMucmVtb3ZlZCwgKGl0ZW06IFQpID0+XG5cdFx0XHR7XG5cdFx0XHRcdHJlbG9hZChudWxsLCBpdGVtKTtcblx0XHRcdH0pO1xuXHRcdFx0XHRcblx0XHRcdENvcmUuRm9yY2VVdGlsLmF0dGFjaEZvcmNlKHRoaXMubW92ZWQsIChlMTogVCwgZTI6IFQpID0+XG5cdFx0XHR7XG5cdFx0XHRcdHJlbG9hZChlMSwgZTIpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdHByaXZhdGUgc29ydEZuPzogKGE6IFQsIGI6IFQpID0+IG51bWJlcjtcblx0XHRwcml2YXRlIGZpbHRlckZuPzogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogQXJyYXlGb3JjZTxUPikgPT4gYm9vbGVhbjtcblx0XHRcblx0XHQvKiogXG5cdFx0ICogQGludGVybmFsXG5cdFx0ICovXG5cdFx0YXNzaWduU29ydGVyKHNvcnRGbjogKGE6IFQsIGI6IFQpID0+IG51bWJlcilcblx0XHR7XG5cdFx0XHR0aGlzLnNvcnRGbiA9IHNvcnRGbjtcblx0XHRcdHRoaXMuZXhlY3V0ZVNvcnQoKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogXG5cdFx0ICogQGludGVybmFsXG5cdFx0ICovXG5cdFx0YXNzaWduRmlsdGVyKGZpbHRlckZuOiAodmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIGFycmF5OiBBcnJheUZvcmNlPFQ+KSA9PiBib29sZWFuKVxuXHRcdHtcblx0XHRcdHRoaXMuZmlsdGVyRm4gPSBmaWx0ZXJGbjtcblx0XHRcdHRoaXMuZXhlY3V0ZUZpbHRlcigpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByb3RlY3RlZCBleGVjdXRlRmlsdGVyKClcblx0XHR7XG5cdFx0XHRpZiAodGhpcy5maWx0ZXJGbilcblx0XHRcdHtcblx0XHRcdFx0Zm9yIChsZXQgaSA9IHRoaXMucG9zaXRpb25zLmxlbmd0aDsgaS0tID4gMDspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBwb3NpdGlvbiA9IHRoaXMucG9zaXRpb25zW2ldO1xuXHRcdFx0XHRcdGNvbnN0IHJvb3QgPSB0aGlzLmdldFJvb3QocG9zaXRpb24pO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmICghdGhpcy5maWx0ZXJGbihyb290LCBpLCB0aGlzKSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBsb2MgPSB0aGlzLnBvc2l0aW9ucy5pbmRleE9mKHBvc2l0aW9uKTtcblx0XHRcdFx0XHRcdGlmIChsb2MgPCAwKVxuXHRcdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHN0YXRlLlwiKTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0dGhpcy5zcGxpY2UobG9jLCAxKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJvdGVjdGVkIGV4ZWN1dGVTb3J0KClcblx0XHR7XG5cdFx0XHRpZiAodGhpcy5zb3J0Rm4pXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGFycmF5ID0gdGhpcy5wb3NpdGlvbnM7XG5cdFx0XHRcdGNvbnN0IGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblx0XHRcdFx0Y29uc3QgbGFzdEl0ZW0gPSBhcnJheVtsZW5ndGggLSAxXTtcblx0XHRcdFx0XG5cdFx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgbGVuZ3RoIC0gMTspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRsZXQgY2hhbmdlZCA9IGZhbHNlO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGZvciAobGV0IG4gPSAtMTsgKytuIDwgbGVuZ3RoIC0gKGkgKyAxKTspXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y29uc3QgaXRlbU5vdyA9IHRoaXMuZ2V0KG4pO1xuXHRcdFx0XHRcdFx0Y29uc3QgaXRlbU5leHQgPSB0aGlzLmdldChuICsgMSk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGlmICh0aGlzLnNvcnRGbihpdGVtTm93LCBpdGVtTmV4dCkgPiAwKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRjaGFuZ2VkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0W2FycmF5W25dLCBhcnJheVtuICsgMV1dID0gW2FycmF5W24gKyAxXSwgYXJyYXlbbl1dO1xuXHRcdFx0XHRcdFx0XHR0aGlzLm1vdmVkKGl0ZW1Ob3csIGl0ZW1OZXh0LCBuLCBuICsgMSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmICghY2hhbmdlZClcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBuZXdMYXN0SXRlbSA9IGFycmF5W2xlbmd0aCAtIDFdO1xuXHRcdFx0XHRpZiAobGFzdEl0ZW0gIT09IG5ld0xhc3RJdGVtKVxuXHRcdFx0XHRcdHRoaXMudGFpbENoYW5nZWQodGhpcy5nZXQobGVuZ3RoIC0gMSksIGxlbmd0aCAtIDEpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcm90ZWN0ZWQgZmlsdGVyUHVzaCguLi5pdGVtczogVFtdKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLmZpbHRlckZuKVxuXHRcdFx0XHRyZXR1cm4gaXRlbXNcblx0XHRcdFx0XHQuZmlsdGVyKCh2YWx1ZSwgaW5kZXgpID0+IHRoaXMuZmlsdGVyRm4gJiYgdGhpcy5maWx0ZXJGbih2YWx1ZSwgaW5kZXgsIHRoaXMpKVxuXHRcdFx0XHRcdC5tYXAoaXRlbSA9PiB0aGlzLnJvb3QucHVzaChpdGVtKSk7XG5cblx0XHRcdHJldHVybiBpdGVtcy5tYXAoaXRlbSA9PiB0aGlzLnJvb3QucHVzaChpdGVtKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIERlZmluZXMgZ2V0dGVyIGFuZCBzZXR0ZXIgZm9yIGluZGV4IG51bWJlciBwcm9wZXJ0aWVzIGV4LiBhcnJbNV1cblx0XHQgKi9cblx0XHRwcml2YXRlIGRlZmluZUluZGV4KGluZGV4OiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0aWYgKCFcIk5PUFJPWFlcIilcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XG5cdFx0XHRpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCBpbmRleCkpXG5cdFx0XHR7XHRcblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIGluZGV4LCB7XG5cdFx0XHRcdFx0Z2V0KClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5nZXQoaW5kZXgpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0c2V0KHZhbHVlOiBhbnkpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuc2V0KGluZGV4LCB2YWx1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqIFxuXHRcdCAqIEBpbnRlcm5hbFxuXHRcdCAqIEluc2VydHMgcG9zaXRpb25zIGZyb20gcGFyYW1ldGVycyBpbnRvIHBvc2l0aW9ucyBhcnJheSBvZiB0aGlzXG5cdFx0ICogQWxsIHBvc2l0aW9ucyBhcmUgZmlsdGVyZWQgaWYgdGhlcmUgaXMgYSBmaWx0ZXIgZnVuY3Rpb24gYXNzaWduZWQgdG8gdGhpc1xuXHRcdCAqIFRyaWdnZXJzIHRoZSBhZGRlZCBGb3JjZVxuXHRcdCAqIERlZmluZXMgaW5kZXggZm9yIHByb2Nlc3NlZCBsb2NhdGlvbnNcblx0XHQgKi9cblx0XHRwcm90ZWN0ZWQgaW5zZXJ0UmVmKHN0YXJ0OiBudW1iZXIsIC4uLnBvc2l0aW9uczogbnVtYmVyW10pXG5cdFx0e1xuXHRcdFx0Y29uc3QgZmlsdGVyZWQgPSB0aGlzLmZpbHRlckZuID9cblx0XHRcdFx0cG9zaXRpb25zLmZpbHRlcigodmFsdWUsIGluZGV4KSA9PiB0aGlzLmZpbHRlckZuISh0aGlzLmdldFJvb3QodmFsdWUpLCBzdGFydCArIGluZGV4LCB0aGlzKSkgOlxuXHRcdFx0XHRwb3NpdGlvbnM7XG5cdFx0XHRcblx0XHRcdHRoaXMucG9zaXRpb25zLnNwbGljZShzdGFydCwgMCwgLi4uZmlsdGVyZWQpO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGZpbHRlcmVkLmxlbmd0aDspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGl0ZW0gPSBmaWx0ZXJlZFtpXTtcblx0XHRcdFx0Y29uc3QgbG9jID0gc3RhcnQgKyBpO1xuXHRcdFx0XHR0aGlzLmFkZGVkKHRoaXMuZ2V0Um9vdChpdGVtKSwgbG9jKTtcblx0XHRcdFx0dGhpcy5kZWZpbmVJbmRleChsb2MpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHR0aGlzLmV4ZWN1dGVTb3J0KCk7IFxuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRnZXQgbGVuZ3RoKCkgXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucG9zaXRpb25zLmxlbmd0aDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0c2V0IGxlbmd0aChpOiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0dGhpcy5zcGxpY2UoaSwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoIC0gaSk7XG5cdFx0XHR0aGlzLnBvc2l0aW9ucy5sZW5ndGggPSBpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogXG5cdFx0ICogQGludGVybmFsXG5cdFx0ICovXG5cdFx0cHJveHkoKVxuXHRcdHtcblx0XHRcdGlmIChcIk5PUFJPWFlcIikgXG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0XG5cdFx0XHRpZiAoIXRoaXMuX3Byb3h5KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9wcm94eSA9IG5ldyBQcm94eSh0aGlzLCB7XG5cdFx0XHRcdFx0Z2V0KHRhcmdldCwgcHJvcDogRXh0cmFjdDxrZXlvZiBBcnJheUZvcmNlPFQ+LCBzdHJpbmc+KVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGNvbnN0IGluZGV4ID0gcGFyc2VJbnQocHJvcCwgMTApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGluZGV4ICE9PSBpbmRleCA/XG5cdFx0XHRcdFx0XHRcdHRhcmdldFtwcm9wXSA6XG5cdFx0XHRcdFx0XHRcdHRhcmdldC5nZXQoaW5kZXgpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0c2V0KHRhcmdldCwgcHJvcDogRXh0cmFjdDxrZXlvZiBBcnJheUZvcmNlPFQ+LCBzdHJpbmc+LCB2YWx1ZTogVClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBpbmRleCA9IHBhcnNlSW50KHByb3AsIDEwKTtcblx0XHRcdFx0XHRcdGlmIChpbmRleCAhPT0gaW5kZXgpXG5cdFx0XHRcdFx0XHRcdHRhcmdldC5zZXQodmFsdWUsIGluZGV4KTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pIGFzIEFycmF5Rm9yY2U8VD47XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHJldHVybiB0aGlzLl9wcm94eTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBfcHJveHk/OiBBcnJheUZvcmNlPFQ+O1xuXG5cdFx0LyoqICovXG5cdFx0Z2V0KGluZGV4OiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0Um9vdCh0aGlzLnBvc2l0aW9uc1tpbmRleF0pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIGdldFJvb3QoaW5kZXg6IG51bWJlcilcblx0XHR7XG5cdFx0XHRjb25zdCByZXN1bHQgPSB0aGlzLnJvb3QuZ2V0KGluZGV4KTtcblx0XHRcdGlmIChyZXN1bHQgPT09IHZvaWQgMClcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm8gaXRlbSBleGlzdHMgYXQgdGhlIHBvc2l0aW9uIFwiICsgaW5kZXgpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBTZXRzIGEgdmFsdWUgd2l0aGluIHRoZSBhcnJheSwgYXQgdGhlIHNwZWNpZmllZCBpbmRleC5cblx0XHQgKi9cblx0XHRzZXQodmFsdWU6IFQsIGluZGV4ID0gdGhpcy5wb3NpdGlvbnMubGVuZ3RoIC0gMSlcblx0XHR7XG5cdFx0XHRpZiAodGhpcy5maWx0ZXJGbilcblx0XHRcdFx0aWYgKCF0aGlzLmZpbHRlckZuKHZhbHVlLCBpbmRleCwgdGhpcykpXG5cdFx0XHRcdFx0dGhpcy5wb3NpdGlvbnMuc3BsaWNlKGluZGV4LCAxKTtcblx0XHRcdFxuXHRcdFx0dGhpcy5yb290LnNldCh0aGlzLnBvc2l0aW9uc1tpbmRleF0sIHZhbHVlKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqIFxuXHRcdCAqIFJldHVybnMgc25hcHNob3Qgb2YgdGhpcyBBcnJheUZvcmNlIGFzIGEgcGxhaW4gSmF2YVNjcmlwdCBhcnJheS5cblx0XHQgKi9cblx0XHRzbmFwc2hvdCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucG9zaXRpb25zLm1hcCh4ID0+IHRoaXMuZ2V0Um9vdCh4KSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHRvU3RyaW5nKCk6IHN0cmluZ1xuXHRcdHtcblx0XHRcdHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLnNuYXBzaG90KCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHR0b0xvY2FsZVN0cmluZygpOiBzdHJpbmdcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy50b1N0cmluZygpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRjb25jYXQoLi4uaXRlbXM6IENvbmNhdEFycmF5PFQ+W10pOiBUW107XG5cdFx0Y29uY2F0KC4uLml0ZW1zOiAoVCB8IENvbmNhdEFycmF5PFQ+KVtdKTogVFtdO1xuXHRcdGNvbmNhdCguLi5pdGVtczogYW55W10pXG5cdFx0e1xuXHRcdFx0Y29uc3QgYXJyYXkgPSBBcnJheUZvcmNlLmNyZWF0ZTxUPih0aGlzLnNuYXBzaG90KCkgYXMgVFtdKTtcblx0XHRcdGFycmF5LnB1c2goLi4uaXRlbXMpO1xuXHRcdFx0cmV0dXJuIGFycmF5LnByb3h5KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGpvaW4oc2VwYXJhdG9yPzogc3RyaW5nKTogc3RyaW5nXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuc25hcHNob3QoKS5qb2luKHNlcGFyYXRvcik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJldmVyc2UoKVxuXHRcdHtcblx0XHRcdHRoaXMucG9zaXRpb25zLnJldmVyc2UoKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRzbGljZShzdGFydD86IG51bWJlciwgZW5kPzogbnVtYmVyKTogVFtdXG5cdFx0e1xuXHRcdFx0Y29uc3QgYXJyYXkgPSBuZXcgQXJyYXlGb3JjZSh0aGlzLnJvb3QpO1xuXHRcdFx0YXJyYXkuaW5zZXJ0UmVmKDAsIC4uLnRoaXMucG9zaXRpb25zLnNsaWNlKHN0YXJ0LCBlbmQpKTtcblx0XHRcdHJldHVybiBhcnJheS5wcm94eSgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRzb3J0KGNvbXBhcmVGbjogU29ydEZ1bmN0aW9uPFQ+LCAuLi5mb3JjZXM6IEFycmF5PFN0YXRlbGVzc0ZvcmNlIHwgU3RhdGVmdWxGb3JjZT4pOiB0aGlzXG5cdFx0e1xuXHRcdFx0Y29uc3QgYXJyYXkgPSBuZXcgQXJyYXlGb3JjZSh0aGlzKTtcblx0XHRcdGFycmF5LnNvcnRGbiA9IGNvbXBhcmVGbjtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBmbyBvZiBmb3JjZXMpXG5cdFx0XHRcdENvcmUuRm9yY2VVdGlsLmF0dGFjaEZvcmNlKFxuXHRcdFx0XHRcdGZvIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSA/XG5cdFx0XHRcdFx0XHRmby5jaGFuZ2VkIDogZm8sIGFycmF5LmV4ZWN1dGVTb3J0XG5cdFx0XHRcdCk7XG5cdFx0XHRcblx0XHRcdGFycmF5Lmluc2VydFJlZigwLCAuLi50aGlzLnBvc2l0aW9ucyk7XG5cdFx0XHRyZXR1cm4gYXJyYXkucHJveHkoKSBhcyB0aGlzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRpbmRleE9mKHNlYXJjaEVsZW1lbnQ6IFQsIGZyb21JbmRleCA9IDApOiBudW1iZXJcblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gZnJvbUluZGV4IC0gMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0aWYgKHRoaXMuZ2V0KGkpID09PSBzZWFyY2hFbGVtZW50KSBcblx0XHRcdFx0XHRyZXR1cm4gaTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRsYXN0SW5kZXhPZihzZWFyY2hFbGVtZW50OiBULCBmcm9tSW5kZXg/OiBudW1iZXIpOiBudW1iZXJcblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gZnJvbUluZGV4IHx8IHRoaXMucG9zaXRpb25zLmxlbmd0aDsgLS1pID4gLTE7KVxuXHRcdFx0XHRpZiAodGhpcy5nZXQoaSkgPT09IHNlYXJjaEVsZW1lbnQpIFxuXHRcdFx0XHRcdHJldHVybiBpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gLTE7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGV2ZXJ5KGNhbGxiYWNrRm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biwgdGhpc0FyZz86IGFueSk6IGJvb2xlYW5cblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IHRoaXMucG9zaXRpb25zLmxlbmd0aDspXG5cdFx0XHRcdGlmICghY2FsbGJhY2tGbi5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdGhpcy5nZXQoaSksIGksIHRoaXMpKSBcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRzb21lKGNhbGxiYWNrRm46ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gdW5rbm93biwgdGhpc0FyZz86IGFueSk6IGJvb2xlYW5cblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IHRoaXMucG9zaXRpb25zLmxlbmd0aDspXG5cdFx0XHRcdGlmIChjYWxsYmFja0ZuLmNhbGwodGhpc0FyZyB8fCB0aGlzLCB0aGlzLmdldChpKSwgaSwgdGhpcykpIFxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZvckVhY2goY2FsbGJhY2tGbjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiB2b2lkLCB0aGlzQXJnPzogYW55KTogdm9pZFxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0Y2FsbGJhY2tGbi5jYWxsKHRoaXNBcmcgfHwgdGhpcywgdGhpcy5nZXQoaSksIGksIHRoaXMpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRtYXA8VT4oY2FsbGJhY2tGbjogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVLCB0aGlzQXJnPzogYW55KTogQXJyYXlGb3JjZTxVPlxuXHRcdHtcblx0XHRcdGNvbnN0IGZvID0gQXJyYXlGb3JjZS5jcmVhdGUoXG5cdFx0XHRcdHRoaXMucG9zaXRpb25zXG5cdFx0XHRcdFx0Lm1hcCh4ID0+IHRoaXMuZ2V0Um9vdCh4KSlcblx0XHRcdFx0XHQubWFwKCh2YWx1ZSwgaW5kZXgpID0+IGNhbGxiYWNrRm4uY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHZhbHVlLCBpbmRleCwgdGhpcykpXG5cdFx0XHQpO1xuXHRcdFx0XG5cdFx0XHRDb3JlLkZvcmNlVXRpbC5hdHRhY2hGb3JjZSh0aGlzLmFkZGVkLCAoaXRlbTogVCwgaW5kZXg6IG51bWJlcikgPT5cblx0XHRcdHtcblx0XHRcdFx0Zm8uc3BsaWNlKGluZGV4LCAwLCBjYWxsYmFja0ZuKGl0ZW0sIGluZGV4LCB0aGlzKSk7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Q29yZS5Gb3JjZVV0aWwuYXR0YWNoRm9yY2UodGhpcy5yZW1vdmVkLCAoaXRlbTogVCwgaW5kZXg6IG51bWJlciwgaWQ6IG51bWJlcikgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgbG9jID0gZm8ucG9zaXRpb25zLmluZGV4T2YoaWQpO1xuXHRcdFx0XHRpZiAobG9jID4gLTEpIFxuXHRcdFx0XHRcdGZvLnNwbGljZShsb2MsIDEpO1xuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdENvcmUuRm9yY2VVdGlsLmF0dGFjaEZvcmNlKHRoaXMucm9vdC5jaGFuZ2VkLCAoaXRlbTogVCwgaW5kZXg6IG51bWJlcikgPT4gXG5cdFx0XHR7XG5cdFx0XHRcdGZvLnJvb3Quc2V0KGluZGV4LCBjYWxsYmFja0ZuKGl0ZW0sIGluZGV4LCB0aGlzKSk7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGZvO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRmaWx0ZXI8UyBleHRlbmRzIFQ+KGNhbGxiYWNrRm46IEZpbHRlckZ1bmN0aW9uPFQ+LCAuLi5mb3JjZTogQXJyYXk8U3RhdGVmdWxGb3JjZSB8IFN0YXRlbGVzc0ZvcmNlPik6IEFycmF5Rm9yY2U8Uz47XG5cdFx0ZmlsdGVyKGNhbGxiYWNrRm46IEZpbHRlckZ1bmN0aW9uPFQ+LCAuLi5mb3JjZTogQXJyYXk8U3RhdGVmdWxGb3JjZSB8IFN0YXRlbGVzc0ZvcmNlPik6IEFycmF5Rm9yY2U8VD47XG5cdFx0ZmlsdGVyKGNhbGxiYWNrRm46IEZpbHRlckZ1bmN0aW9uPFQ+LCAuLi5mb3JjZXM6IEFycmF5PFN0YXRlZnVsRm9yY2UgfCBTdGF0ZWxlc3NGb3JjZT4pXG5cdFx0e1xuXHRcdFx0Y29uc3QgYXJyYXkgPSBuZXcgQXJyYXlGb3JjZSh0aGlzKTtcblx0XHRcdGFycmF5LmZpbHRlckZuID0gY2FsbGJhY2tGbjtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBmbyBvZiBmb3JjZXMpXG5cdFx0XHR7XG5cdFx0XHRcdENvcmUuRm9yY2VVdGlsLmF0dGFjaEZvcmNlKGZvIGluc3RhbmNlb2YgU3RhdGVmdWxGb3JjZSA/IGZvLmNoYW5nZWQgOiBmbywgKCkgPT4gXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRhcnJheS5leGVjdXRlRmlsdGVyKCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7KVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGNvbnN0IHBvcyA9IHRoaXMucG9zaXRpb25zW2ldO1xuXHRcdFx0XHRcdFx0aWYgKGFycmF5LmZpbHRlckZuKVxuXHRcdFx0XHRcdFx0XHRpZiAoYXJyYXkuZmlsdGVyRm4odGhpcy5nZXRSb290KGkpLCBpLCB0aGlzKSlcblx0XHRcdFx0XHRcdFx0XHRpZiAoIWFycmF5LnBvc2l0aW9ucy5pbmNsdWRlcyhwb3MpKVxuXHRcdFx0XHRcdFx0XHRcdFx0YXJyYXkuaW5zZXJ0UmVmKGksIHBvcyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0YXJyYXkuaW5zZXJ0UmVmKDAsIC4uLnRoaXMucG9zaXRpb25zKTtcblx0XHRcdHJldHVybiBhcnJheS5wcm94eSgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRyZWR1Y2UoY2FsbGJhY2tGbjogKHByZXZpb3VzVmFsdWU6IFQsIGN1cnJlbnRWYWx1ZTogVCwgY3VycmVudEluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFQpOiBUO1xuXHRcdHJlZHVjZShjYWxsYmFja0ZuOiAocHJldmlvdXNWYWx1ZTogVCwgY3VycmVudFZhbHVlOiBULCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVCwgaW5pdGlhbFZhbHVlOiBUKTogVDtcblx0XHRyZWR1Y2U8VT4oY2FsbGJhY2tGbjogKHByZXZpb3VzVmFsdWU6IFUsIGN1cnJlbnRWYWx1ZTogVCwgY3VycmVudEluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUsIGluaXRpYWxWYWx1ZTogVSk6IFU7XG5cdFx0cmVkdWNlKGNhbGxiYWNrRm46IChwcmV2aW91c1ZhbHVlOiBhbnksIGN1cnJlbnRWYWx1ZTogYW55LCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IGFueVtdKSA9PiBhbnksIGluaXRpYWxWYWx1ZT86IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5wb3NpdGlvbnMucmVkdWNlKChwcmV2aW91c1ZhbCwgY3VycmVudFZhbCwgY3VycmVudElkeCkgPT5cblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrRm4oXG5cdFx0XHRcdFx0cHJldmlvdXNWYWwsXG5cdFx0XHRcdFx0dGhpcy5nZXQoY3VycmVudFZhbCksXG5cdFx0XHRcdFx0Y3VycmVudElkeCxcblx0XHRcdFx0XHR0aGlzKTtcblx0XHRcdH0sXG5cdFx0XHRpbml0aWFsVmFsdWUpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRyZWR1Y2VSaWdodChjYWxsYmFja0ZuOiAocHJldmlvdXNWYWx1ZTogVCwgY3VycmVudFZhbHVlOiBULCBjdXJyZW50SW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gVCk6IFQ7XG5cdFx0cmVkdWNlUmlnaHQoY2FsbGJhY2tGbjogKHByZXZpb3VzVmFsdWU6IFQsIGN1cnJlbnRWYWx1ZTogVCwgY3VycmVudEluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFQsIGluaXRpYWxWYWx1ZTogVCk6IFQ7XG5cdFx0cmVkdWNlUmlnaHQ8VT4oY2FsbGJhY2tGbjogKHByZXZpb3VzVmFsdWU6IFUsIGN1cnJlbnRWYWx1ZTogVCwgY3VycmVudEluZGV4OiBudW1iZXIsIGFycmF5OiBUW10pID0+IFUsIGluaXRpYWxWYWx1ZTogVSk6IFU7XG5cdFx0cmVkdWNlUmlnaHQoY2FsbGJhY2tGbjogKHByZXZpb3VzVmFsdWU6IGFueSwgY3VycmVudFZhbHVlOiBhbnksIGN1cnJlbnRJbmRleDogbnVtYmVyLCBhcnJheTogYW55W10pID0+IGFueSwgaW5pdGlhbFZhbHVlPzogYW55KVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnBvc2l0aW9ucy5yZWR1Y2VSaWdodCgocHJldmlvdXNWYWwsIGN1cnJlbnRWYWwsIGN1cnJlbnRJZHgpID0+XG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiBjYWxsYmFja0ZuKFxuXHRcdFx0XHRcdHByZXZpb3VzVmFsLFxuXHRcdFx0XHRcdHRoaXMuZ2V0KGN1cnJlbnRWYWwpLFxuXHRcdFx0XHRcdGN1cnJlbnRJZHgsXG5cdFx0XHRcdFx0dGhpcyk7XG5cdFx0XHR9LFxuXHRcdFx0aW5pdGlhbFZhbHVlKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0ZmluZDxTIGV4dGVuZHMgVD4ocHJlZGljYXRlOiAodGhpczogdm9pZCwgdmFsdWU6IFQsIGluZGV4OiBudW1iZXIsIG9iajogVFtdKSA9PiB2YWx1ZSBpcyBTLCB0aGlzQXJnPzogYW55KTogUyB8IHVuZGVmaW5lZDtcblx0XHRmaW5kKHByZWRpY2F0ZTogKHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBvYmo6IFRbXSkgPT4gdW5rbm93biwgdGhpc0FyZz86IGFueSk6IFQgfCB1bmRlZmluZWQ7XG5cdFx0ZmluZChwcmVkaWNhdGU6IGFueSwgdGhpc0FyZz86IGFueSlcblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IHRoaXMucG9zaXRpb25zLmxlbmd0aDspXG5cdFx0XHRcdGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHRoaXMuZ2V0KGkpLCBpLCB0aGlzKSlcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5nZXQoaSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZpbmRJbmRleChwcmVkaWNhdGU6ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgb2JqOiBUW10pID0+IHVua25vd24sIHRoaXNBcmc/OiBhbnkpOiBudW1iZXJcblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IHRoaXMucG9zaXRpb25zLmxlbmd0aDspXG5cdFx0XHRcdGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHRoaXMuZ2V0KGkpLCBpLCB0aGlzKSlcblx0XHRcdFx0XHRyZXR1cm4gaTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRmaWxsKHZhbHVlOiBULCBzdGFydD86IG51bWJlciwgZW5kPzogbnVtYmVyKTogdGhpc1xuXHRcdHtcblx0XHRcdGNvbnN0IHN0YXJ0SWR4ID0gTWF0aC5tYXgoMCwgc3RhcnQgfHwgMCk7XG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGkgPSBlbmQgPz8gdGhpcy5wb3NpdGlvbnMubGVuZ3RoOyBpLS0gPiBzdGFydElkeDspXG5cdFx0XHRcdHRoaXMuc2V0KHZhbHVlLCBpKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvcHlXaXRoaW4odGFyZ2V0OiBudW1iZXIsIHN0YXJ0OiBudW1iZXIsIGVuZD86IG51bWJlcik6IHRoaXNcblx0XHR7XG5cdFx0XHR0aGlzLnBvc2l0aW9ucy5jb3B5V2l0aGluKHRhcmdldCwgc3RhcnQsIGVuZCk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0KltTeW1ib2wuaXRlcmF0b3JdKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD5cblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IHRoaXMucG9zaXRpb25zLmxlbmd0aDspXG5cdFx0XHRcdHlpZWxkIHRoaXMuZ2V0KGkpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHQqZW50cmllcygpOiBJdGVyYWJsZUl0ZXJhdG9yPFtudW1iZXIsIFRdPlxuXHRcdHtcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgdGhpcy5wb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdFx0eWllbGQgW2ksIHRoaXMuZ2V0KGkpXTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0KmtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxudW1iZXI+XG5cdFx0e1xuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7KVxuXHRcdFx0XHR5aWVsZCBpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHQqdmFsdWVzKCk6IEl0ZXJhYmxlSXRlcmF0b3I8VD5cblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IHRoaXMucG9zaXRpb25zLmxlbmd0aDspXG5cdFx0XHRcdHlpZWxkIHRoaXMuZ2V0KGkpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRbU3ltYm9sLnVuc2NvcGFibGVzXSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucG9zaXRpb25zW1N5bWJvbC51bnNjb3BhYmxlc10oKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0aW5jbHVkZXMoc2VhcmNoRWxlbWVudDogVCwgZnJvbUluZGV4ID0gMCk6IGJvb2xlYW5cblx0XHR7XG5cdFx0XHRmb3IgKGxldCBpID0gdGhpcy5wb3NpdGlvbnMubGVuZ3RoOyBpLS0gPiBmcm9tSW5kZXg7KVxuXHRcdFx0XHRpZiAodGhpcy5nZXQoaSkgPT09IHNlYXJjaEVsZW1lbnQpIFxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGZsYXRNYXA8VSwgVGhpcyA9IHVuZGVmaW5lZD4oXG5cdFx0XHRjYWxsYmFjazogKHRoaXM6IFRoaXMsIHZhbHVlOiBULCBpbmRleDogbnVtYmVyLCBhcnJheTogVFtdKSA9PiBVIHwgcmVhZG9ubHkgVVtdLCBcblx0XHRcdHRoaXNBcmc/OiBUaGlzIHwgdW5kZWZpbmVkKTogQXJyYXlGb3JjZTxVPlxuXHRcdHtcblx0XHRcdHJldHVybiAoPEFycmF5Rm9yY2U8VT4+dGhpcy5tYXAoY2FsbGJhY2ssIHRoaXNBcmcpKS5mbGF0KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgYSBuZXcgQXJyYXlGb3JjZSB3aXRoIGFsbCBuZXN0ZWQgYXJyYXkgZWxlbWVudHMgY29uY2F0ZW5hdGVkIGludG8gaXQgcmVjdXJzaXZlbHksXG5cdFx0ICogdXAgdG8gdGhlIHNwZWNpZmllZCBkZXB0aC5cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBkZXB0aCBUaGUgbWF4aW11bSByZWN1cnNpb24gZGVwdGhcblx0XHQgKi9cblx0XHRmbGF0PFU+KHRoaXM6IFVbXVtdW11bXVtdW11bXVtdLCBkZXB0aDogNyk6IEFycmF5Rm9yY2U8VT47XG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyBhIG5ldyBBcnJheUZvcmNlIHdpdGggYWxsIG5lc3RlZCBhcnJheSBlbGVtZW50cyBjb25jYXRlbmF0ZWQgaW50byBpdCByZWN1cnNpdmVseSxcblx0XHQgKiB1cCB0byB0aGUgc3BlY2lmaWVkIGRlcHRoLlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRlcHRoIFRoZSBtYXhpbXVtIHJlY3Vyc2lvbiBkZXB0aFxuXHRcdCAqL1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW11bXVtdW11bXVtdLCBkZXB0aDogNik6IEFycmF5Rm9yY2U8VT47XG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyBhIG5ldyBBcnJheUZvcmNlIHdpdGggYWxsIG5lc3RlZCBhcnJheSBlbGVtZW50cyBjb25jYXRlbmF0ZWQgaW50byBpdCByZWN1cnNpdmVseSxcblx0XHQgKiB1cCB0byB0aGUgc3BlY2lmaWVkIGRlcHRoLlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRlcHRoIFRoZSBtYXhpbXVtIHJlY3Vyc2lvbiBkZXB0aFxuXHRcdCAqL1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW11bXVtdW11bXSwgZGVwdGg6IDUpOiBBcnJheUZvcmNlPFU+O1xuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgYSBuZXcgQXJyYXlGb3JjZSB3aXRoIGFsbCBuZXN0ZWQgYXJyYXkgZWxlbWVudHMgY29uY2F0ZW5hdGVkIGludG8gaXQgcmVjdXJzaXZlbHksXG5cdFx0ICogdXAgdG8gdGhlIHNwZWNpZmllZCBkZXB0aC5cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBkZXB0aCBUaGUgbWF4aW11bSByZWN1cnNpb24gZGVwdGhcblx0XHQgKi9cblx0XHRmbGF0PFU+KHRoaXM6IFVbXVtdW11bXVtdLCBkZXB0aDogNCk6IEFycmF5Rm9yY2U8VT47XG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyBhIG5ldyBBcnJheUZvcmNlIHdpdGggYWxsIG5lc3RlZCBhcnJheSBlbGVtZW50cyBjb25jYXRlbmF0ZWQgaW50byBpdCByZWN1cnNpdmVseSxcblx0XHQgKiB1cCB0byB0aGUgc3BlY2lmaWVkIGRlcHRoLlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRlcHRoIFRoZSBtYXhpbXVtIHJlY3Vyc2lvbiBkZXB0aFxuXHRcdCAqL1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW11bXVtdLCBkZXB0aDogMyk6IEFycmF5Rm9yY2U8VT47XG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyBhIG5ldyBBcnJheUZvcmNlIHdpdGggYWxsIG5lc3RlZCBhcnJheSBlbGVtZW50cyBjb25jYXRlbmF0ZWQgaW50byBpdCByZWN1cnNpdmVseSxcblx0XHQgKiB1cCB0byB0aGUgc3BlY2lmaWVkIGRlcHRoLlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRlcHRoIFRoZSBtYXhpbXVtIHJlY3Vyc2lvbiBkZXB0aFxuXHRcdCAqL1xuXHRcdGZsYXQ8VT4odGhpczogVVtdW11bXSwgZGVwdGg6IDIpOiBBcnJheUZvcmNlPFU+O1xuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgYSBuZXcgQXJyYXlGb3JjZSB3aXRoIGFsbCBuZXN0ZWQgYXJyYXkgZWxlbWVudHMgY29uY2F0ZW5hdGVkIGludG8gaXQgcmVjdXJzaXZlbHksXG5cdFx0ICogdXAgdG8gdGhlIHNwZWNpZmllZCBkZXB0aC5cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBkZXB0aCBUaGUgbWF4aW11bSByZWN1cnNpb24gZGVwdGhcblx0XHQgKi9cblx0XHRmbGF0PFU+KHRoaXM6IFVbXVtdLCBkZXB0aD86IDEpOiBBcnJheUZvcmNlPFU+O1xuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgYSBuZXcgQXJyYXlGb3JjZSB3aXRoIGFsbCBuZXN0ZWQgYXJyYXkgZWxlbWVudHMgY29uY2F0ZW5hdGVkIGludG8gaXQgcmVjdXJzaXZlbHksXG5cdFx0ICogdXAgdG8gdGhlIHNwZWNpZmllZCBkZXB0aC5cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSBkZXB0aCBUaGUgbWF4aW11bSByZWN1cnNpb24gZGVwdGhcblx0XHQgKi9cblx0XHRmbGF0PFU+KHRoaXM6IFVbXSwgZGVwdGg6IDApOiBBcnJheUZvcmNlPFU+O1xuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgYSBuZXcgQXJyYXlGb3JjZSB3aXRoIGFsbCBuZXN0ZWQgYXJyYXkgZWxlbWVudHMgY29uY2F0ZW5hdGVkIGludG8gaXQgcmVjdXJzaXZlbHksXG5cdFx0ICogdXAgdG8gdGhlIHNwZWNpZmllZCBkZXB0aC4gSWYgbm8gZGVwdGggaXMgcHJvdmlkZWQsIGZsYXQgbWV0aG9kIGRlZmF1bHRzIHRvIHRoZSBkZXB0aCBvZiAxLlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGRlcHRoIFRoZSBtYXhpbXVtIHJlY3Vyc2lvbiBkZXB0aFxuXHRcdCAqL1xuXHRcdGZsYXQ8VT4odGhpczogYW55W10sIGRlcHRoPzogbnVtYmVyKTogQXJyYXlGb3JjZTxVPjtcblx0XHRmbGF0KGRlcHRoOiBudW1iZXIgPSAxKTogYW55XG5cdFx0e1xuXHRcdFx0aWYgKGRlcHRoIDwgMSlcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHRcblx0XHRcdGNvbnN0IGxldmVsRG93biA9IChzb3VyY2U6IEFycmF5Rm9yY2U8VD4pID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGZvID0gQXJyYXlGb3JjZVxuXHRcdFx0XHRcdC5jcmVhdGUoc291cmNlLnNuYXBzaG90KClcblx0XHRcdFx0XHQuZmxhdE1hcCh2ID0+IHYgaW5zdGFuY2VvZiBBcnJheUZvcmNlID9cblx0XHRcdFx0XHRcdHYuc25hcHNob3QoKSA6IFxuXHRcdFx0XHRcdFx0dikpO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgbnVtYmVyTWFwID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcltdPigpO1xuXHRcdFx0XHRcblx0XHRcdFx0Q29yZS5Gb3JjZVV0aWwuYXR0YWNoRm9yY2Uoc291cmNlLmFkZGVkLCAoaXRlbTogVFtdLCBpbmRleDogbnVtYmVyKSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgaWQgPSBzb3VyY2UucG9zaXRpb25zW2luZGV4XTtcblx0XHRcdFx0XHRjb25zdCBpbmRleGVzID0gaXRlbS5tYXAodiA9PiBmby5yb290LnB1c2godikpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdG51bWJlck1hcC5zZXQoaWQsIGluZGV4ZXMpO1xuXHRcdFx0XHRcdGZvLnBvc2l0aW9ucy5zcGxpY2UoaW5kZXgsIDAsIC4uLmluZGV4ZXMpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgaW5kZXhlcy5sZW5ndGg7KVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGZvLmFkZGVkKGl0ZW1baV0sIGluZGV4ICsgaSk7XG5cdFx0XHRcdFx0XHRmby5kZWZpbmVJbmRleChpbmRleCArIGkpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRDb3JlLkZvcmNlVXRpbC5hdHRhY2hGb3JjZShzb3VyY2UucmVtb3ZlZCwgKGl0ZW06IFRbXSwgaW5kZXg6IG51bWJlciwgaWQ6IG51bWJlcikgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IG1hcCA9IG51bWJlck1hcC5nZXQoaWQpO1xuXHRcdFx0XHRcdGlmIChtYXApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Zm9yKGNvbnN0IGl0ZW0gb2YgbWFwKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRjb25zdCBsb2MgPSBmby5wb3NpdGlvbnMuaW5kZXhPZihpdGVtKTtcblx0XHRcdFx0XHRcdFx0aWYgKGxvYyA+IC0xKVxuXHRcdFx0XHRcdFx0XHRcdGZvLnNwbGljZShsb2MsIDEpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXR1cm4gZm87XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGxldCByZXN1bHQgPSB0aGlzIGFzIEFycmF5Rm9yY2U8VD47XG5cdFx0XHRcblx0XHRcdHdoaWxlIChkZXB0aC0tKVxuXHRcdFx0XHRyZXN1bHQgPSBsZXZlbERvd24oPEFycmF5Rm9yY2U8VD4+cmVzdWx0KTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0ZGlzdGluY3Qoa2V5Rm46ICh4OiBhbnksIGluZGV4OiBudW1iZXIpID0+IGFueSlcblx0XHR7XG5cdFx0XHRjb25zdCBrZXlNYXAgPSBuZXcgTWFwPGFueSwgbnVtYmVyPigpO1xuXHRcdFx0Y29uc3QgZm8gPSBBcnJheUZvcmNlLmNyZWF0ZTxUPihbXSk7XG5cdFx0XHRcblx0XHRcdGNvbnN0IGFkZGVkID0gKGl0ZW06IFQsIGluZGV4OiBudW1iZXIpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGtleSA9IGtleUZuKGl0ZW0sIGluZGV4KTtcblx0XHRcdFx0Y29uc3QgY3VycmVudCA9IGtleU1hcC5nZXQoa2V5KSB8fCAwO1xuXHRcdFx0XHRpZiAoIWN1cnJlbnQpXG5cdFx0XHRcdFx0Zm8uc3BsaWNlKGluZGV4LCAwLCBpdGVtKTtcblx0XHRcdFx0XG5cdFx0XHRcdGtleU1hcC5zZXQoa2V5LCBjdXJyZW50ICsgMSk7XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0XHRjb25zdCByZW1vdmVkID0gKGl0ZW06IFQsIGluZGV4OiBudW1iZXIpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGtleSA9IGtleUZuKGl0ZW0sIGluZGV4KTtcblx0XHRcdFx0bGV0IGN1cnJlbnQgPSBrZXlNYXAuZ2V0KGtleSkgfHwgMDtcblx0XHRcdFx0aWYgKGN1cnJlbnQgPiAwKVxuXHRcdFx0XHR7XHRcblx0XHRcdFx0XHRjdXJyZW50LS07XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKGN1cnJlbnQgPT09IDApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0a2V5TWFwLmRlbGV0ZShrZXkpO1xuXHRcdFx0XHRcdFx0Y29uc3QgaXRlbVNlcmlhbGl6ZWQgPSBKU09OLnN0cmluZ2lmeShpdGVtKTtcblx0XHRcdFx0XHRcdGNvbnN0IGxvYyA9IGZvLmZpbmRJbmRleChpdGVtID0+IEpTT04uc3RyaW5naWZ5KGl0ZW0pID09IGl0ZW1TZXJpYWxpemVkKTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0aWYgKGxvYyA+IC0xKSBcblx0XHRcdFx0XHRcdFx0Zm8uc3BsaWNlKGxvYywgMSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0a2V5TWFwLnNldChrZXksIGN1cnJlbnQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IHRoaXMubGVuZ3RoOylcblx0XHRcdFx0YWRkZWQodGhpc1tpXSwgaSk7XG5cdFx0XHRcblx0XHRcdENvcmUuRm9yY2VVdGlsLmF0dGFjaEZvcmNlKHRoaXMuYWRkZWQsIGFkZGVkKTtcblx0XHRcdENvcmUuRm9yY2VVdGlsLmF0dGFjaEZvcmNlKHRoaXMucmVtb3ZlZCwgcmVtb3ZlZCk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBmbztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHVzaCguLi5pdGVtczogVFtdKVxuXHRcdHtcblx0XHRcdHRoaXMuaW5zZXJ0UmVmKHRoaXMubGVuZ3RoLCAuLi50aGlzLmZpbHRlclB1c2goLi4uaXRlbXMpKTtcblx0XHRcdHJldHVybiB0aGlzLnBvc2l0aW9ucy5sZW5ndGg7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHBvcCgpXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMucG9zaXRpb25zLmxlbmd0aCA8IDEpIFxuXHRcdFx0XHRyZXR1cm4gdm9pZCAwO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBwb3MgPSB0aGlzLnBvc2l0aW9ucy5wb3AoKTtcblx0XHRcdGlmIChwb3MgPT09IHZvaWQgMClcblx0XHRcdFx0cmV0dXJuIHZvaWQgMDtcblx0XHRcdFxuXHRcdFx0Y29uc3QgaXRlbSA9IHRoaXMuZ2V0Um9vdChwb3MpO1xuXHRcdFx0dGhpcy5yZW1vdmVkKGl0ZW0sIHRoaXMucG9zaXRpb25zLmxlbmd0aCwgcG9zKTtcblx0XHRcdHRoaXMucm9vdC5kZWxldGUocG9zKTtcblx0XHRcdHJldHVybiBpdGVtO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHR1bnNoaWZ0KC4uLml0ZW1zOiBUW10pXG5cdFx0e1xuXHRcdFx0dGhpcy5pbnNlcnRSZWYoMCwgLi4udGhpcy5maWx0ZXJQdXNoKC4uLml0ZW1zKSk7XG5cdFx0XHRyZXR1cm4gdGhpcy5wb3NpdGlvbnMubGVuZ3RoO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRzaGlmdCgpXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMucG9zaXRpb25zLmxlbmd0aCA8IDEpIFxuXHRcdFx0XHRyZXR1cm4gdm9pZCAwO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBwb3MgPSB0aGlzLnBvc2l0aW9ucy5zaGlmdCgpO1xuXHRcdFx0aWYgKHBvcyA9PT0gdm9pZCAwKVxuXHRcdFx0XHRyZXR1cm4gdm9pZCAwO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBpdGVtID0gdGhpcy5nZXRSb290KHBvcyk7XG5cdFx0XHR0aGlzLnJlbW92ZWQoaXRlbSwgMCwgcG9zKTtcblx0XHRcdHRoaXMucm9vdC5kZWxldGUocG9zKTtcblx0XHRcdHJldHVybiBpdGVtO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRzcGxpY2Uoc3RhcnQ6IG51bWJlciwgZGVsZXRlQ291bnQ6IG51bWJlciwgLi4uaXRlbXM6IFRbXSlcblx0XHR7XG5cdFx0XHRjb25zdCBwb3NpdGlvbnMgPSB0aGlzLnBvc2l0aW9ucy5zcGxpY2Uoc3RhcnQsIGRlbGV0ZUNvdW50KTtcblx0XHRcdFxuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCBwb3NpdGlvbnMubGVuZ3RoOylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgaXRlbSA9IHBvc2l0aW9uc1tpXTtcblx0XHRcdFx0dGhpcy5yZW1vdmVkKFxuXHRcdFx0XHRcdHRoaXMuZ2V0Um9vdChpdGVtKSxcblx0XHRcdFx0XHRzdGFydCArIGksXG5cdFx0XHRcdFx0aXRlbSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHRoaXMuaW5zZXJ0UmVmKHN0YXJ0LCAuLi50aGlzLmZpbHRlclB1c2goLi4uaXRlbXMpKTtcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHBvc2l0aW9ucy5tYXAocG9zID0+IHRoaXMuZ2V0Um9vdChwb3MpKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBwb3Mgb2YgcG9zaXRpb25zKVxuXHRcdFx0XHR0aGlzLnJvb3QuZGVsZXRlKHBvcyk7XG5cdFx0XHRcblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiBcblx0XHQgKiBSZXR1cm5zIGFic29sdXRlIGluZGV4IGluIHJvb3Rcblx0XHQgKi9cblx0XHRhYnNvbHV0ZUluZGV4KGluZGV4OiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucG9zaXRpb25zW2luZGV4XTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqIFxuXHRcdCAqIFJldHVybnMgaXRlbSBmcm9tIHJvb3Qgd2l0aCBnaXZlbiBhYnNvbHV0ZSBpbmRleFxuXHRcdCAqL1xuXHRcdGdldEFic29sdXRlKGluZGV4OiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucm9vdC5nZXQoaW5kZXgpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBEaWZmIHdpdGggZ2l2ZW4gYXJyYXkgYW5kIGFwcGx5IGNoYW5nZXNcblx0XHQgKi9cblx0XHRyZXNldChzdGF0ZTogVFtdKVxuXHRcdHtcblx0XHRcdGNvbnN0IGRpZmYgPSB0aGlzLnNuYXBzaG90KClcblx0XHRcdFx0Lm1hcCgodiwgaSkgPT4gdiAhPT0gc3RhdGVbaV0gPyBpIDogdW5kZWZpbmVkKVxuXHRcdFx0XHQuZmlsdGVyKCh2KTogdiBpcyBudW1iZXIgPT4gdiAhPT0gdW5kZWZpbmVkKVxuXHRcdFx0XHQucmV2ZXJzZSgpO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGl0ZW0gb2YgZGlmZilcblx0XHRcdFx0dGhpcy5zcGxpY2UoaXRlbSwgMSk7XG5cdFx0XHRcdFxuXHRcdFx0Zm9yIChsZXQgaW5kZXggPSAtMTsgKytpbmRleCA8IHN0YXRlLmxlbmd0aDspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGl0ZW0gPSBzdGF0ZVtpbmRleF07XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoaW5kZXggPj0gdGhpcy5wb3NpdGlvbnMubGVuZ3RoIHx8wqB0aGlzW2luZGV4XSAhPT0gaXRlbSlcblx0XHRcdFx0XHR0aGlzLnNwbGljZShpbmRleCwgMCwgaXRlbSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzPEw+KGN0b3I6IG5ldyAoYXJyOiBBcnJheUZvcmNlPFQ+KSA9PiBMKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgY3Rvcih0aGlzKTtcblx0XHR9XG5cdH1cblx0XG5cdC8qKiAqL1xuXHR0eXBlIFNvcnRGdW5jdGlvbjxUID0gYW55PiA9IChhOiBULCBiOiBUKSA9PiBudW1iZXI7XG5cdFxuXHQvKiogKi9cblx0dHlwZSBGaWx0ZXJGdW5jdGlvbjxUID0gYW55PiA9ICh2YWx1ZTogVCwgaW5kZXg6IG51bWJlciwgYXJyYXk6IFRbXSkgPT4gYm9vbGVhbjtcbn1cbiIsIlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk1ldGEvTWV0YS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiTWV0YS9CcmFuY2hNZXRhLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJNZXRhL0xlYWZNZXRhLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJNZXRhL1JlY3VycmVudFN0cmVhbU1ldGEudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk1ldGEvUHJvbWlzZVN0cmVhbU1ldGEudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIk1ldGEvQXN5bmNJdGVyYWJsZVN0cmVhbU1ldGEudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkZvcmNlVXRpbC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiU3RhdGVmdWxGb3JjZS50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiQXJyYXlGb3JjZS50c1wiIC8+XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQXJyYXlTdG9yZTxUPlxuXHR7XG5cdFx0LyoqICovXG5cdFx0Z2V0KGluZGV4OiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0Y29uc3QgaXRlbSA9IHRoaXMucm9vdFtpbmRleF07XG5cdFx0XHRyZXR1cm4gaXRlbSAmJiBpdGVtLnZhbHVlO1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdHNldChpbmRleDogbnVtYmVyLCB2YWx1ZTogVClcblx0XHR7XG5cdFx0XHRpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMucm9vdCwgaW5kZXgpKSBcblx0XHRcdFx0dGhpcy5jaGFuZ2VkKHZhbHVlLCBpbmRleCk7XG5cdFx0XHRlbHNlIFxuXHRcdFx0XHR0aGlzLnJvb3RbaW5kZXhdID0geyB2YWx1ZTogdm9pZCAwLCByZWY6IDEgfTtcblx0XHRcdFxuXHRcdFx0dGhpcy5yb290W2luZGV4XS52YWx1ZSA9IHZhbHVlO1xuXHRcdFx0cmV0dXJuIGluZGV4O1xuXHRcdH1cblxuXHRcdC8qKiAqL1xuXHRcdHB1c2godmFsdWU6IFQpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuc2V0KHRoaXMubmV4dCsrLCB2YWx1ZSk7XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0bWFyayhpbmRleDogbnVtYmVyKVxuXHRcdHtcblx0XHRcdHRoaXMucm9vdFtpbmRleF0ucmVmKys7XG5cdFx0XHRyZXR1cm4gaW5kZXg7XG5cdFx0fVxuXG5cdFx0LyoqICovXG5cdFx0ZGVsZXRlKGluZGV4OiBudW1iZXIpXG5cdFx0e1xuXHRcdFx0aWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLnJvb3QsIGluZGV4KSkgXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGl0ZW0gPSB0aGlzLnJvb3RbaW5kZXhdO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKGl0ZW0ucmVmID4gMSlcblx0XHRcdFx0XHRpdGVtLnJlZi0tO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKGl0ZW0ucmVmID09PSAwKSBcblx0XHRcdFx0XHRpdGVtLnZhbHVlID0gdm9pZCAwO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRyZWFkb25seSBjaGFuZ2VkID0gZm9yY2U8KGl0ZW06IFQsIGluZGV4OiBudW1iZXIpID0+IHZvaWQ+KCk7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSByZWFkb25seSByb290OiBSZWNvcmQ8bnVtYmVyLCB7XG5cdFx0XHR2YWx1ZTogVCB8IHVuZGVmaW5lZDtcblx0XHRcdHJlZjogbnVtYmVyO1xuXHRcdH0+ID0ge307XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBuZXh0ID0gMDtcblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqIFxuXHQgKiBXQVJOSU5HOiBUaGlzIG1ldGhvZCBoYXMgcG90ZW50aWFsIG1lbW9yeSBpc3N1ZXNcblx0ICogYW5kIGlzIG5vdCBpbnRlbmRlZCBmb3IgbG9uZy1ydW5uaW5nIHByb2Nlc3NlcyAoaS5lLiBpblxuXHQgKiB0aGUgYnJvd3NlcikuIEluIG9yZGVyIHRvIHVzZSBpdCBmcm9tIHRoZSBicm93c2VyLCB0aGVcblx0ICogY2hpbGRyZW5PZi5lbmFibGVkIHZhbHVlIG11c3QgYmUgc2V0IHRvIHRydWUuIEluIE5vZGUuanMsXG5cdCAqIHRoaXMgdmFsdWUgZGVmYXVsdHMgdG8gdHJ1ZS4gSW4gdGhlIGJyb3dzZXIsIGl0IGRlZmF1bHRzIHRvXG5cdCAqIGZhbHNlO1xuXHQgKiBcblx0ICogQHJldHVybnMgQW4gYXJyYXkgY29udGFpbmluZyB0aGUgTWV0YSBvYmplY3RzIHRoYXQgXG5cdCAqIGFyZSBsb2dpY2FsIGNoaWxkcmVuIG9mIHRoZSBzcGVjaWZpZWQgYnJhbmNoLlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGNoaWxkcmVuT2YoYnJhbmNoOiBJQnJhbmNoKVxuXHR7XG5cdFx0cmV0dXJuIGNoaWxkTWV0YXMuZ2V0KGJyYW5jaCkgfHwgW107XG5cdH1cblx0XG5cdGV4cG9ydCBuYW1lc3BhY2UgY2hpbGRyZW5PZlxuXHR7XG5cdFx0ZXhwb3J0IGxldCBlbmFibGVkID0gdHlwZW9mIF9fZGlybmFtZSA9PT0gXCJzdHJpbmdcIjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBAaW50ZXJuYWxcblx0XHQgKiBQb3B1bGF0ZXMgdGhlIGludGVybmFsIHdlYWsgbWFwIHRoYXQgYWxsb3dzXG5cdFx0ICogYnJhbmNoZXMgdG8gc3RvcmUgdGhlaXIgY2hpbGQgbWV0YSBvYmplY3RzLiBcblx0XHQgKiBEbyBub3QgY2FsbCBmcm9tIGFwcGxpY2F0aW9uIGNvZGUuXG5cdFx0ICovXG5cdFx0ZXhwb3J0IGZ1bmN0aW9uIHN0b3JlKGJyYW5jaDogSUJyYW5jaCwgbWV0YTogTWV0YSlcblx0XHR7XG5cdFx0XHRjb25zdCBleGlzdGluZyA9IGNoaWxkTWV0YXMuZ2V0KGJyYW5jaCk7XG5cdFx0XHRpZiAoZXhpc3RpbmcpXG5cdFx0XHR7XG5cdFx0XHRcdGlmICghZXhpc3RpbmcuaW5jbHVkZXMobWV0YSkpXG5cdFx0XHRcdFx0ZXhpc3RpbmcucHVzaChtZXRhKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgY2hpbGRNZXRhcy5zZXQoYnJhbmNoLCBbbWV0YV0pO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqICovXG5cdGNvbnN0IGNoaWxkTWV0YXMgPSBuZXcgV2Vha01hcDxJQnJhbmNoLCBNZXRhW10+KCk7XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKipcblx0ICogQGludGVybmFsXG5cdCAqIFB1cmVseSBmdW5jdGlvbmFsIHV0aWxpdHkgbWV0aG9kcyB0aGF0IHBlcmZvcm0gb3BlcmF0aW9ucyBmb3IgdGhlIFJlbGV4IENvcmUuXG5cdCAqL1xuXHRleHBvcnQgY29uc3QgQ29yZVV0aWwgPSBuZXcgY2xhc3MgQ29yZVV0aWxcblx0e1xuXHRcdC8qKlxuXHRcdCAqIENsZWFucyBvdXQgdGhlIGNydWZ0IGZyb20gdGhlIGF0b21zIGFycmF5LFxuXHRcdCAqIGZsYXR0ZW5zIGFsbCBhcnJheXMsIGFuZCBjb252ZXJ0cyB0aGUgcmVzdWx0aW5nXG5cdFx0ICogdmFsdWVzIGludG8gTWV0YSBpbnN0YW5jZXMuXG5cdFx0ICovXG5cdFx0dHJhbnNsYXRlQXRvbXMoXG5cdFx0XHRjb250YWluZXJCcmFuY2g6IElCcmFuY2gsXG5cdFx0XHRjb250YWluZXJNZXRhOiBDb250YWluZXJNZXRhLFxuXHRcdFx0cmF3QXRvbXM6IHVua25vd24pXG5cdFx0e1xuXHRcdFx0Y29uc3QgYXRvbXMgPSBBcnJheS5pc0FycmF5KHJhd0F0b21zKSA/XG5cdFx0XHRcdHJhd0F0b21zLnNsaWNlKCkgOlxuXHRcdFx0XHRbcmF3QXRvbXNdO1xuXHRcdFx0XG5cdFx0XHRsZXQgbGliOiBJTGlicmFyeSB8IG51bGwgPSBudWxsO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGF0b21zLmxlbmd0aDspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGF0b20gPSBhdG9tc1tpXTtcblx0XHRcdFx0XG5cdFx0XHRcdC8vIEluaXRpYWwgY2xlYXIgb3V0IG9mIGRpc2NhcmRlZCB2YWx1ZXMuXG5cdFx0XHRcdGlmIChhdG9tID09PSBudWxsIHx8IFxuXHRcdFx0XHRcdGF0b20gPT09IHVuZGVmaW5lZCB8fCBcblx0XHRcdFx0XHR0eXBlb2YgYXRvbSA9PT0gXCJib29sZWFuXCIgfHxcblx0XHRcdFx0XHRhdG9tID09PSBcIlwiIHx8IFxuXHRcdFx0XHRcdGF0b20gIT09IGF0b20gfHwgXG5cdFx0XHRcdFx0YXRvbSA9PT0gY29udGFpbmVyQnJhbmNoKVxuXHRcdFx0XHRcdGF0b21zLnNwbGljZShpLS0sIDEpO1xuXHRcdFx0XHRcblx0XHRcdFx0Ly8gc3RyaW5ncywgbnVtYmVycywgYW5kIGJpZ2ludHMgYXJlIHBhc3NlZCB0aHJvdWdoIHZlcmJhdGltIGluIHRoaXMgcGhhc2UuXG5cdFx0XHRcdGVsc2UgaWYgKHR5cGVvZiBhdG9tICE9PSBcIm9iamVjdFwiKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAoQXJyYXkuaXNBcnJheShhdG9tKSlcblx0XHRcdFx0XHRhdG9tcy5zcGxpY2UoaS0tLCAxLCAuLi5hdG9tKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKHRoaXMuaGFzU3ltYm9sICYmIGF0b21bU3ltYm9sLml0ZXJhdG9yXSlcblx0XHRcdFx0XHRhdG9tcy5zcGxpY2UoaS0tLCAxLCAuLi5BcnJheS5mcm9tKGF0b20pKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Y29uc3QgbWV0YXM6IE1ldGFbXSA9IFtdO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGF0b21zLmxlbmd0aDspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGF0b20gPSBhdG9tc1tpXTtcblx0XHRcdFx0Y29uc3QgdHlwZU9mID0gdHlwZW9mIGF0b207XG5cdFx0XHRcdGNvbnN0IGV4aXN0aW5nTWV0YSA9IEJyYW5jaE1ldGEub2YoYXRvbSkgfHwgTGVhZk1ldGEub2YoYXRvbSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoZXhpc3RpbmdNZXRhICYmXG5cdFx0XHRcdFx0KChsaWIgPSBsaWIgfHwgUm91dGluZ0xpYnJhcnkub2YoY29udGFpbmVyQnJhbmNoKSkgPT09IGV4aXN0aW5nTWV0YS5saWJyYXJ5KSlcblx0XHRcdFx0XHRtZXRhcy5wdXNoKGV4aXN0aW5nTWV0YSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChhdG9tIGluc3RhbmNlb2YgTWV0YSlcblx0XHRcdFx0XHRtZXRhcy5wdXNoKGF0b20pO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAoYXRvbSBpbnN0YW5jZW9mIFJlY3VycmVudClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChhdG9tLnNlbGVjdG9yIGluc3RhbmNlb2YgQXJyYXlGb3JjZSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRtZXRhcy5wdXNoKG5ldyBBcnJheVN0cmVhbU1ldGEoXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5lck1ldGEsXG5cdFx0XHRcdFx0XHRcdGF0b20pKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdG1ldGFzLnB1c2gobmV3IFJlY3VycmVudFN0cmVhbU1ldGEoXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5lck1ldGEsXG5cdFx0XHRcdFx0XHRcdGF0b20pKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoYXRvbVtSZWZsZXguYXRvbV0pXG5cdFx0XHRcdFx0bWV0YXMucHVzaChuZXcgQ2xvc3VyZU1ldGEodGhpcy5jcmVhdGVTeW1ib2xpY0Nsb3N1cmUoYXRvbSkpKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKHR5cGVPZiA9PT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0XHRcdG1ldGFzLnB1c2gobmV3IENsb3N1cmVNZXRhKGF0b20pKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKFxuXHRcdFx0XHRcdHR5cGVPZiA9PT0gXCJzdHJpbmdcIiB8fFxuXHRcdFx0XHRcdHR5cGVPZiA9PT0gXCJudW1iZXJcIiB8fFxuXHRcdFx0XHRcdHR5cGVPZiA9PT0gXCJiaWdpbnRcIilcblx0XHRcdFx0XHRtZXRhcy5wdXNoKG5ldyBWYWx1ZU1ldGEoYXRvbSkpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAodGhpcy5pc0FzeW5jSXRlcmFibGUoYXRvbSkpXG5cdFx0XHRcdFx0bWV0YXMucHVzaChuZXcgQXN5bmNJdGVyYWJsZVN0cmVhbU1ldGEoY29udGFpbmVyTWV0YSwgYXRvbSkpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAoYXRvbSBpbnN0YW5jZW9mIFByb21pc2UpXG5cdFx0XHRcdFx0bWV0YXMucHVzaChuZXcgUHJvbWlzZVN0cmVhbU1ldGEoY29udGFpbmVyTWV0YSwgYXRvbSkpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAodGhpcy5pc0F0dHJpYnV0ZXMoYXRvbSkpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhhdG9tKSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAodiBpbnN0YW5jZW9mIFN0YXRlZnVsRm9yY2UpXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdG1ldGFzLnB1c2gobmV3IFJlY3VycmVudFN0cmVhbU1ldGEoXG5cdFx0XHRcdFx0XHRcdFx0Y29udGFpbmVyTWV0YSxcblx0XHRcdFx0XHRcdFx0XHRuZXcgQXR0cmlidXRlUmVjdXJyZW50KGssIHYpKSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIG1ldGFzLnB1c2gobmV3IEF0dHJpYnV0ZU1ldGEoaywgdikpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0Ly8gVGhpcyBlcnJvciBvY2N1cnMgd2hlbiBzb21ldGhpbmcgd2FzIHBhc3NlZCBhcyBhIGF0b20gXG5cdFx0XHRcdC8vIHRvIGEgYnJhbmNoIGZ1bmN0aW9uLCBhbmQgbmVpdGhlciB0aGUgUmVmbGV4IGNvcmUsIG9yIGFueSBvZlxuXHRcdFx0XHQvLyB0aGUgY29ubmVjdGVkIFJlZmxleGl2ZSBsaWJyYXJpZXMga25vdyB3aGF0IHRvIGRvIHdpdGggaXQuXG5cdFx0XHRcdGVsc2UgdGhyb3cgbmV3IEVycm9yKFwiVW5pZGVudGlmaWVkIGZseWluZyBvYmplY3QuXCIpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gbWV0YXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGlzQXR0cmlidXRlcyhvYmplY3Q6IGFueSk6IG9iamVjdCBpcyBJQXR0cmlidXRlc1xuXHRcdHtcblx0XHRcdGlmICghb2JqZWN0IHx8IG9iamVjdC5jb25zdHJ1Y3RvciAhPT0gT2JqZWN0KVxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgdmFsdWUgb2YgT2JqZWN0LnZhbHVlcyhvYmplY3QpKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB0ID0gdHlwZW9mIHZhbHVlO1xuXHRcdFx0XHRpZiAodCAhPT0gXCJzdHJpbmdcIiAmJiB0ICE9PSBcIm51bWJlclwiICYmIHQgIT09IFwiYmlnaW50XCIgJiYgdCAhPT0gXCJib29sZWFuXCIpXG5cdFx0XHRcdFx0aWYgKCEodmFsdWUgaW5zdGFuY2VvZiBTdGF0ZWZ1bEZvcmNlKSlcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENyZWF0ZXMgYSB0ZW1wb3JhcnkgY2xvc3VyZSBmdW5jdGlvbiBmb3IgdGhlXG5cdFx0ICogc3BlY2lmaWVkIHN5bWJvbGljIGF0b20gb2JqZWN0LlxuXHRcdCAqL1xuXHRcdHByaXZhdGUgY3JlYXRlU3ltYm9saWNDbG9zdXJlKGF0b206IGFueSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gKGJyYW5jaDogSUJyYW5jaCwgY2hpbGRyZW46IGFueVtdKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBwcm9wZXJ0eSA9IGF0b21bUmVmbGV4LmF0b21dO1xuXHRcdFx0XHRyZXR1cm4gdHlwZW9mIHByb3BlcnR5ID09PSBcImZ1bmN0aW9uXCIgP1xuXHRcdFx0XHRcdHByb3BlcnR5LmNhbGwoYXRvbSwgYnJhbmNoLCBjaGlsZHJlbikgOlxuXHRcdFx0XHRcdHByb3BlcnR5O1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRpc0FzeW5jSXRlcmFibGUobzogYW55KTogbyBpcyBBc3luY0l0ZXJhYmxlPGFueT5cblx0XHR7XG5cdFx0XHRpZiAodGhpcy5oYXNTeW1ib2wgJiYgbyAmJiB0eXBlb2YgbyA9PT0gXCJvYmplY3RcIilcblx0XHRcdFx0aWYgKG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdKVxuXHRcdFx0XHRcdGlmICh0eXBlb2Ygby5uZXh0ID09PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIG8ucmV0dXJuID09PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdFx0XHRcdGlmICh0eXBlb2Ygby50aHJvdyA9PT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGdldCBoYXNTeW1ib2woKVxuXHRcdHtcblx0XHRcdHJldHVybiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCI7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEFwcGxpZXMgdGhlIHNwZWNpZmllZCBtZXRhcyB0byB0aGUgc3BlY2lmaWVkIGJyYW5jaCwgYW5kIHJldHVybnNcblx0XHQgKiB0aGUgbGFzdCBhcHBsaWVkIGJyYW5jaCBvciBsZWFmIG9iamVjdCwgd2hpY2ggY2FuIGJlIHVzZWQgZm9yXG5cdFx0ICogZnV0dXJlIHJlZmVyZW5jZXMuXG5cdFx0ICovXG5cdFx0YXBwbHlNZXRhcyhcblx0XHRcdGNvbnRhaW5pbmdCcmFuY2g6IElCcmFuY2gsXG5cdFx0XHRjb250YWluZXJNZXRhOiBDb250YWluZXJNZXRhLFxuXHRcdFx0Y2hpbGRNZXRhczogTWV0YVtdLFxuXHRcdFx0dHJhY2tlcjogVHJhY2tlciA9IG5ldyBUcmFja2VyKGNvbnRhaW5pbmdCcmFuY2gpKVxuXHRcdHtcblx0XHRcdGNvbnN0IGNvbnRhaW5pbmdCcmFuY2hNZXRhID0gQnJhbmNoTWV0YS5vZihjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdGlmICghY29udGFpbmluZ0JyYW5jaE1ldGEpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlwiKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgbGliID0gUm91dGluZ0xpYnJhcnkudGhpcztcblx0XHRcdGNoaWxkTWV0YXMgPSBjaGlsZE1ldGFzLnNsaWNlKCk7XG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgY2hpbGRNZXRhcy5sZW5ndGg7KVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBtZXRhID0gY2hpbGRNZXRhc1tpXTtcblx0XHRcdFx0XG5cdFx0XHRcdC8vIENsb3N1cmVNZXRhIGluc3RhbmNlcyBtdXN0IGJlIGRlYWx0IHdpdGggZmlyc3QsIGJlY2F1c2Vcblx0XHRcdFx0Ly8gdGhleSBjYW4gcmV0dXJuIG90aGVyIE1ldGEgaW5zdGFuY2VzLCBhbmQgdGhvc2UgTWV0YVxuXHRcdFx0XHQvLyBpbnN0YW5jZXMgYXJlIHRoZSBvbmVzIHRoYXQgKGxpa2VseSkgaGF2ZSBMb2NhdG9ycyB0aGF0XG5cdFx0XHRcdC8vIG11c3QgYmUgYXNzaW1pbGF0ZWQgKGkuZS4gYnkgY2FsbGluZyAuc2V0Q29udGFpbmVyKCkpXG5cdFx0XHRcdC8vIFRoZSBDbG9zdXJlTWV0YSBpbnN0YW5jZXMgdGhlbXNlbHZlcyBkb24ndCBwYXJ0aWNpcGF0ZVxuXHRcdFx0XHQvLyBpbiB0aGUgVHJhY2tlciAvIExvY2F0b3IgbWFkbmVzcywgYnV0IHRoZXkgY2FuIHJldHVybiBcblx0XHRcdFx0Ly8gb3RoZXIgTWV0YSBpbnN0YW5jZXMgdGhhdCBkby5cblx0XHRcdFx0aWYgKG1ldGEgaW5zdGFuY2VvZiBDbG9zdXJlTWV0YSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChsaWIuaGFuZGxlQnJhbmNoRnVuY3Rpb24gJiYgaXNCcmFuY2hGdW5jdGlvbihtZXRhLmNsb3N1cmUpKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGxpYi5oYW5kbGVCcmFuY2hGdW5jdGlvbihcblx0XHRcdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCwgXG5cdFx0XHRcdFx0XHRcdDwoLi4uYXRvbXM6IGFueVtdKSA9PiBJQnJhbmNoPm1ldGEuY2xvc3VyZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBjaGlsZHJlbiA9IGxpYi5nZXRDaGlsZHJlbihjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdFx0XHRcdGNvbnN0IGNsb3N1cmVSZXR1cm4gPSBtZXRhLmNsb3N1cmUoY29udGFpbmluZ0JyYW5jaCwgY2hpbGRyZW4pO1xuXHRcdFx0XHRcdFx0Y29uc3QgbWV0YXNSZXR1cm5lZCA9IHRoaXMudHJhbnNsYXRlQXRvbXMoXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2hNZXRhLFxuXHRcdFx0XHRcdFx0XHRjbG9zdXJlUmV0dXJuKTtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0aWYgKG1ldGFzUmV0dXJuZWQubGVuZ3RoIDwgMSlcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGNoaWxkTWV0YXMuc3BsaWNlKGktLSwgMSwgLi4ubWV0YXNSZXR1cm5lZCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRtZXRhLmxvY2F0b3Iuc2V0Q29udGFpbmVyKGNvbnRhaW5lck1ldGEubG9jYXRvcik7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAobWV0YSBpbnN0YW5jZW9mIEJyYW5jaE1ldGEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBoYXJkUmVmID0gdHJhY2tlci5nZXRMYXN0SGFyZFJlZigpO1xuXHRcdFx0XHRcdGxpYi5hdHRhY2hBdG9tKG1ldGEuYnJhbmNoLCBjb250YWluaW5nQnJhbmNoLCBoYXJkUmVmKTtcblx0XHRcdFx0XHR0cmFja2VyLnVwZGF0ZShtZXRhLmJyYW5jaCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAobWV0YSBpbnN0YW5jZW9mIExlYWZNZXRhKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgaGFyZFJlZiA9IHRyYWNrZXIuZ2V0TGFzdEhhcmRSZWYoKTtcblx0XHRcdFx0XHRsaWIuYXR0YWNoQXRvbShtZXRhLnZhbHVlLCBjb250YWluaW5nQnJhbmNoLCBoYXJkUmVmKTtcblx0XHRcdFx0XHR0cmFja2VyLnVwZGF0ZShtZXRhLnZhbHVlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgVmFsdWVNZXRhKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bGliLmF0dGFjaEF0b20obWV0YS52YWx1ZSwgY29udGFpbmluZ0JyYW5jaCwgXCJhcHBlbmRcIik7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAobWV0YSBpbnN0YW5jZW9mIFN0cmVhbU1ldGEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAobWV0YSBpbnN0YW5jZW9mIFJlY3VycmVudFN0cmVhbU1ldGEpXG5cdFx0XHRcdFx0XHRtZXRhLmF0dGFjaChjb250YWluaW5nQnJhbmNoLCB0cmFja2VyKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgQXN5bmNJdGVyYWJsZVN0cmVhbU1ldGEpXG5cdFx0XHRcdFx0XHRtZXRhLmF0dGFjaChjb250YWluaW5nQnJhbmNoLCB0cmFja2VyKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgQXJyYXlTdHJlYW1NZXRhKVxuXHRcdFx0XHRcdFx0bWV0YS5hdHRhY2goY29udGFpbmluZ0JyYW5jaCwgdHJhY2tlcik7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0ZWxzZSBpZiAobWV0YSBpbnN0YW5jZW9mIFByb21pc2VTdHJlYW1NZXRhKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGNvbnN0IGxvY2FsVHJhY2tlciA9IHRyYWNrZXIuZGVyaXZlKCk7XG5cdFx0XHRcdFx0XHRsb2NhbFRyYWNrZXIudXBkYXRlKG1ldGEubG9jYXRvcik7XG5cdFx0XHRcdFx0XHRtZXRhLmF0dGFjaChjb250YWluaW5nQnJhbmNoLCBsb2NhbFRyYWNrZXIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgQXR0cmlidXRlTWV0YSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGxpYi5hdHRhY2hBdHRyaWJ1dGUoY29udGFpbmluZ0JyYW5jaCwgbWV0YS5rZXksIG1ldGEudmFsdWUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoQ29uc3QuZGVidWcgfHwgQ29uc3Qubm9kZSlcblx0XHRcdFx0XHRjaGlsZHJlbk9mLnN0b3JlKGNvbnRhaW5pbmdCcmFuY2gsIG1ldGEpO1xuXHRcdFx0XHRcblx0XHRcdFx0dHJhY2tlci51cGRhdGUobWV0YS5sb2NhdG9yKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0dW5hcHBseU1ldGFzKFxuXHRcdFx0Y29udGFpbmluZ0JyYW5jaDogSUJyYW5jaCxcblx0XHRcdGNoaWxkTWV0YXM6IE1ldGFbXSlcblx0XHR7XG5cdFx0XHRjb25zdCBsaWIgPSBSb3V0aW5nTGlicmFyeS50aGlzO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IG1ldGEgb2YgY2hpbGRNZXRhcylcblx0XHRcdHtcblx0XHRcdFx0Ly8gQ2xvc3VyZU1ldGFzIGNhbiBiZSBzYWZlbHkgaWdub3JlZC5cblx0XHRcdFx0aWYgKG1ldGEgaW5zdGFuY2VvZiBDbG9zdXJlTWV0YSlcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChtZXRhIGluc3RhbmNlb2YgTGVhZk1ldGEgfHwgbWV0YSBpbnN0YW5jZW9mIFZhbHVlTWV0YSlcblx0XHRcdFx0XHRsaWIuZGV0YWNoQXRvbShtZXRhLnZhbHVlLCBjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBBdHRyaWJ1dGVNZXRhKVxuXHRcdFx0XHRcdGxpYi5kZXRhY2hBdHRyaWJ1dGUoY29udGFpbmluZ0JyYW5jaCwgbWV0YS52YWx1ZSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgQnJhbmNoTWV0YSlcblx0XHRcdFx0XHQvLyBXZSBzaG91bGQgcHJvYmFibHkgY29uc2lkZXIgZ2V0dGluZyByaWQgb2YgdGhpc1xuXHRcdFx0XHRcdC8vIFlvdSB3b3VsZCBiZSBhYmxlIHRvIHJlLWRpc2NvdmVyIHRoZSBicmFuY2ggYnlcblx0XHRcdFx0XHQvLyBlbnVtZXJhdGluZyB0aHJvdWdoIHRoZSBjaGlsZHJlbiBvZiBjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdC8vIHVzaW5nIHRoZSBnZXRDaGlsZHJlbigpIG1ldGhvZCBwcm92aWRlZCBieSB0aGUgbGlicmFyeS5cblx0XHRcdFx0XHRsaWIuZGV0YWNoQXRvbShtZXRhLmJyYW5jaCwgY29udGFpbmluZ0JyYW5jaCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRlbHNlIGlmIChtZXRhIGluc3RhbmNlb2YgUmVjdXJyZW50U3RyZWFtTWV0YSlcblx0XHRcdFx0XHRtZXRhLmRldGFjaFJlY3VycmVudHMoXG5cdFx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdFx0bWV0YS5yZWN1cnJlbnQuc2VsZWN0b3IsXG5cdFx0XHRcdFx0XHRtZXRhLnN5c3RlbUNhbGxiYWNrKTtcblx0XHRcdFx0XG5cdFx0XHRcdGVsc2UgaWYgKG1ldGEgaW5zdGFuY2VvZiBQcm9taXNlU3RyZWFtTWV0YSlcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQuXCIpO1xuXHRcdFx0XHRcblx0XHRcdFx0ZWxzZSBpZiAobWV0YSBpbnN0YW5jZW9mIEFzeW5jSXRlcmFibGVTdHJlYW1NZXRhKVxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZC5cIik7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KCk7XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXhcbntcblx0LyoqICovXG5cdGV4cG9ydCBlbnVtIG11dGF0aW9uXG5cdHtcblx0XHRhbnkgPSBcIm11dGF0aW9uLWFueVwiLFxuXHRcdGJyYW5jaCA9IFwibXV0YXRpb24tYnJhbmNoXCIsXG5cdFx0YnJhbmNoQWRkID0gXCJtdXRhdGlvbi1icmFuY2gtYWRkXCIsXG5cdFx0YnJhbmNoUmVtb3ZlID0gXCJtdXRhdGlvbi1icmFuY2gtcmVtb3ZlXCIsXG5cdFx0bGVhZiA9IFwibXV0YXRpb24tbGVhZlwiLFxuXHRcdGxlYWZBZGQgPSBcIm11dGF0aW9uLWxlYWYtYWRkXCIsXG5cdFx0bGVhZlJlbW92ZSA9IFwibXV0YXRpb24tbGVhZi1yZW1vdmVcIlxuXHR9XG5cdFxuXHQvKipcblx0ICogQSBzeW1ib2wgd2hpY2ggbWF5IGJlIGFwcGxpZWQgYXMgYW4gb2JqZWN0IGtleSBpbiBcblx0ICogYSB0eXBlLCBpbiBvcmRlciB0byBtYWtlIGl0IGEgdmFsaWQgUmVmbGV4IGF0b20uXG5cdCAqL1xuXHRleHBvcnQgZGVjbGFyZSBjb25zdCBhdG9tOiB1bmlxdWUgc3ltYm9sO1xuXHQoPGFueT5SZWZsZXgpW1wiYXRvbVwiXSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiA/XG5cdFx0U3ltYm9sKFwiUmVmbGV4LmF0b21cIikgOlxuXHRcdFwiUmVmbGV4LmF0b21cIjtcblx0XG5cdC8qKlxuXHQgKiBBIHR5cGUgdGhhdCBpZGVudGlmaWVzIHRoZSB0eXBlcyBvZiBhdG9tcyB0aGF0IGNhbiBleGlzdFxuXHQgKiBpbiBhbnkgcmVmbGV4aXZlIGFyZ3VtZW50cyBsaXN0LlxuXHQgKiBcblx0ICogQHBhcmFtIEIgVGhlIGxpYnJhcnkncyBCcmFuY2ggdHlwZS5cblx0ICogQHBhcmFtIEwgVGhlIGxpYnJhcnkncyBMZWFmIHR5cGUuXG5cdCAqIEBwYXJhbSBYIEV4dHJhIHR5cGVzIHVuZGVyc3Rvb2QgYnkgdGhlIGxpYnJhcnkuXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBBdG9tPEIgZXh0ZW5kcyBvYmplY3QgPSBvYmplY3QsIEwgPSBhbnksIFggPSB2b2lkPiA9XG5cdFx0QiB8XG5cdFx0TCB8XG5cdFx0WCB8XG5cdFx0ZmFsc2UgfFxuXHRcdG51bGwgfFxuXHRcdHZvaWQgfFxuXHRcdFN5bWJvbGljQXRvbTxCLCBMLCBYPiB8XG5cdFx0SXRlcmFibGU8QXRvbTxCLCBMLCBYPj4gfFxuXHRcdEFzeW5jSXRlcmFibGU8QXRvbTxCLCBMLCBYPj4gfFxuXHRcdFByb21pc2U8QXRvbTxCLCBMLCBYPj4gfFxuXHRcdCgoYnJhbmNoOiBCLCBjaGlsZHJlbjogKEIgfCBMKVtdKSA9PiBBdG9tPEIsIEwsIFg+KSB8XG5cdFx0Q29yZS5CcmFuY2hGdW5jdGlvbiB8XG5cdFx0UmVjdXJyZW50IHxcblx0XHRJQXR0cmlidXRlcztcblx0XG5cdC8qKlxuXHQgKiBBbiBpbnRlcmZhY2UgZm9yIGFuIG9iamVjdCB0aGF0IGhhcyBpdCdzIG93biBhdG9taXphdGlvblxuXHQgKiBwcm9jZXNzLlxuXHQgKi9cblx0ZXhwb3J0IGludGVyZmFjZSBTeW1ib2xpY0F0b208QiBleHRlbmRzIG9iamVjdCA9IG9iamVjdCwgTCA9IGFueSwgWCA9IHZvaWQ+XG5cdHtcblx0XHRyZWFkb25seSBbYXRvbV06IEF0b208QiwgTCwgWD47XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgaW50ZXJmYWNlIElBdHRyaWJ1dGVzPFQgPSBzdHJpbmcgfCBudW1iZXIgfCBiaWdpbnQgfCBib29sZWFuPlxuXHR7XG5cdFx0W2F0dHJpYnV0ZU5hbWU6IHN0cmluZ106IENvcmUuVm9pZGFibGU8VD4gfCBTdGF0ZWZ1bEZvcmNlPENvcmUuVm9pZGFibGU8VD4+O1xuXHR9XG5cdFxuXHQvKipcblx0ICogR2VuZXJpYyBmdW5jdGlvbiBkZWZpbml0aW9uIGZvciBjYWxsYmFjayBmdW5jdGlvbnMgcHJvdmlkZWQgdG9cblx0ICogdGhlIGdsb2JhbCBvbigpIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgUmVjdXJyZW50Q2FsbGJhY2s8VCBleHRlbmRzIEF0b20gPSBBdG9tPiA9ICguLi5hcmdzOiBhbnlbXSkgPT4gVDtcbn1cblxuZGVjbGFyZSBuYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqXG5cdCAqIE1hcmtlciBpbnRlcmZhY2UgdGhhdCBkZWZpbmVzIGFuIG9iamVjdCB0aGF0IGNhbiBoYXZlXG5cdCAqIHJlZmxleGl2ZSB2YWx1ZXMgYXR0YWNoZWQgdG8gaXQuXG5cdCAqIChGb3IgZXhhbXBsZTogSFRNTEVsZW1lbnQgb3IgTlNXaW5kb3cpXG5cdCAqL1xuXHRleHBvcnQgaW50ZXJmYWNlIElCcmFuY2ggZXh0ZW5kcyBPYmplY3QgeyB9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGNsYXNzIEJyYW5jaEZ1bmN0aW9uPFROYW1lIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nPlxuXHR7XG5cdFx0cmVhZG9ubHkgbmFtZTogVE5hbWU7XG5cdFx0cHJpdmF0ZSByZWFkb25seSBub21pbmFsOiB1bmRlZmluZWQ7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBNYXJrZXIgaW50ZXJmYWNlIHRoYXQgZGVmaW5lcyBhbiBvYmplY3QgdGhhdCByZXByZXNlbnRzXG5cdCAqIGEgYmxvY2sgb2YgdmlzaWJsZSBsZWF2ZXMgKGNvbnRlbnQpIGluIHRoZSB0cmVlLlxuXHQgKiAoRm9yIGV4YW1wbGU6IHRoZSBXM0MgRE9NJ3MgVGV4dCBvYmplY3QpXG5cdCAqL1xuXHRleHBvcnQgaW50ZXJmYWNlIElMZWFmIGV4dGVuZHMgT2JqZWN0IHsgfVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCB0eXBlIFZvaWRhYmxlPFQ+ID0gXG5cdFx0VCB8XG5cdFx0ZmFsc2UgfFxuXHRcdG51bGwgfFxuXHRcdHZvaWQ7XG5cdFxuXHQvKipcblx0ICogQWJzdHJhY3QgZGVmaW5pdGlvbiBvZiB0aGUgbGVhZiB2YXJpYW50IG9mIHRoZSB0b3AtbGV2ZWxcblx0ICogbmFtZXNwYWNlIGZ1bmN0aW9uLlxuXHQgKiBcblx0ICogQHBhcmFtIEwgVGhlIExlYWYgdHlwZSBvZiB0aGUgbGlicmFyeS5cblx0ICogQHBhcmFtIFMgVGhlIFwiTGVhZiBzb3VyY2VcIiB0eXBlLCB3aGljaCBhcmUgdGhlIG90aGVyIHR5cGVzXG5cdCAqICh0eXBpY2FsbHkgcHJpbWl0aXZlcykgdGhhdCB0aGUgbGlicmFyeSBpcyBjYXBhYmxlIG9mIGNvbnZlcnRpbmdcblx0ICogaW50byBpdCdzIExlYWYgdHlwZS5cblx0ICovXG5cdGV4cG9ydCBpbnRlcmZhY2UgSUxlYWZOYW1lc3BhY2U8TCA9IGFueSwgUyA9IHN0cmluZyB8IG51bWJlciB8IGJpZ2ludD5cblx0e1xuXHRcdChcblx0XHRcdHRlbXBsYXRlOlxuXHRcdFx0XHRUZW1wbGF0ZVN0cmluZ3NBcnJheSB8IFxuXHRcdFx0XHRMIHwgUyB8IHZvaWQgfFxuXHRcdFx0XHRTdGF0ZWZ1bEZvcmNlLFxuXHRcdFx0XG5cdFx0XHQuLi52YWx1ZXM6IChcblx0XHRcdFx0SUJyYW5jaCB8IFxuXHRcdFx0XHRMIHwgUyB8IHZvaWQgfFxuXHRcdFx0XHRTdGF0ZWZ1bEZvcmNlKVtdXG5cdFx0KTogTDtcblx0fVxuXHRcblx0LyoqXG5cdCAqIEFic3RyYWN0IGRlZmluaXRpb24gb2YgdGhlIGJyYW5jaCB2YXJpYW50IG9mIHRoZSB0b3AtbGV2ZWxcblx0ICogbmFtZXNwYWNlIGZ1bmN0aW9uLlxuXHQgKiBcblx0ICogQHBhcmFtIFRBdG9tIFRoZSBBdG9tIHR5cGUgb2YgdGhlIFJlZmxleGl2ZSBsaWJyYXJ5LlxuXHQgKiBAcGFyYW0gVFJldCBUaGUgcmV0dXJuIHR5cGUgb2YgdGhlIHJvb3QtbGV2ZWwgYnJhbmNoIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZXhwb3J0IGludGVyZmFjZSBJQnJhbmNoTmFtZXNwYWNlPFRBdG9tID0gYW55LCBUUmV0ID0gYW55PlxuXHR7XG5cdFx0KC4uLmF0b21zOiBUQXRvbVtdKTogVFJldDtcblx0fVxuXHRcblx0LyoqXG5cdCAqIERlZmluZXMgYSByZWxhdGl2ZSBvciBzcGVjaWZpYyBtZXRhIHJlZmVyZW5jZSwgdXNlZCBmb3IgaW5kaWNhdGluZ1xuXHQgKiBhbiBpbnNlcnRpb24gcG9zaXRpb24gb2YgYSBuZXcgbWV0YSB3aXRoaW4gYSBSZWZsZXhpdmUgdHJlZS5cblx0ICovXG5cdGV4cG9ydCB0eXBlIFJlZjxCID0gSUJyYW5jaCwgTCA9IElMZWFmPiA9IEIgfCBMIHwgXCJwcmVwZW5kXCIgfCBcImFwcGVuZFwiO1xuXHRcblx0LyoqXG5cdCAqIEEgbWFwcGVkIHR5cGUgdGhhdCBleHRyYWN0cyB0aGUgbmFtZXMgb2YgdGhlIG1ldGhvZHMgYW5kXG5cdCAqIGZ1bmN0aW9uLXZhbHVlZCBmaWVsZHMgb3V0IG9mIHRoZSBzcGVjaWZpZWQgdHlwZS5cblx0ICovXG5cdGV4cG9ydCB0eXBlIE1ldGhvZE5hbWVzPFQ+ID0ge1xuXHRcdFtLIGluIGtleW9mIFRdOiBUW0tdIGV4dGVuZHMgKCguLi5hcmdzOiBhbnlbXSkgPT4gYW55KSA/IEsgOiBuZXZlcjtcblx0fVtrZXlvZiBUXTtcblxuXHQvKipcblx0ICogRXh0cmFjdHMgYW55IHJldHVybiB0eXBlIGZyb20gdGhlIHNwZWNpZmllZCB0eXBlLCBpbiB0aGUgY2FzZVxuXHQgKiB3aGVuIHRoZSB0eXBlIHNwZWNpZmllZCBpcyBhIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgTWF5YmVSZXR1cm5UeXBlPFQ+ID0gVCBleHRlbmRzICguLi5hcmdzOiBhbnlbXSkgPT4gaW5mZXIgUiA/IFIgOiBuZXZlcjtcblx0XG5cdC8qKlxuXHQgKiBNYXBzIHRoZSBzcGVjaWZpZWQgdHlwZSB0byBhIHZlcnNpb24gb2YgaXRzZWxmLFxuXHQgKiBidXQgd2l0aG91dCBhbnkgcG9zc2libHkgdW5kZWZpbmVkIHZhbHVlcy5cblx0ICovXG5cdGV4cG9ydCB0eXBlIERlZmluZWQ8VD4gPSB7IFtLIGluIGtleW9mIFRdLT86IFRbS10gfTtcblx0XG5cdC8qKlxuXHQgKiBFeHRyYWN0cyB0aGUgcmV0dXJuIHR5cGUgb2YgdGhlIHNwZWNpZmllZCBmdW5jdGlvbiB0eXBlLlxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgUmV0dXJuT2Y8b3JpZ2luYWwgZXh0ZW5kcyBGdW5jdGlvbj4gPSBcblx0XHRvcmlnaW5hbCBleHRlbmRzICguLi54OiBhbnlbXSkgPT4gaW5mZXIgcmV0dXJuVHlwZSA/XG5cdFx0XHRyZXR1cm5UeXBlIDogXG5cdFx0XHRuZXZlcjtcblx0XG5cdC8qKlxuXHQgKiBFeHRyYWN0cyB0aGUgbWV0aG9kcyBvdXQgb2YgdGhlIHR5cGUsIGFuZCByZXR1cm5zIGEgbWFwcGVkIG9iamVjdCB0eXBlXG5cdCAqIHdob3NlIG1lbWJlcnMgYXJlIHRyYW5zZm9ybWVkIGludG8gYnJhbmNoIGNyZWF0aW9uIG1ldGhvZHMuXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBBc0JyYW5jaGVzPFQ+ID0ge1xuXHRcdHJlYWRvbmx5IFtLIGluIGtleW9mIFRdOiBBc0JyYW5jaDxUW0tdPlxuXHR9O1xuXHRcblx0LyoqXG5cdCAqIEV4dHJhY3RzIFxuXHQgKi9cblx0ZXhwb3J0IHR5cGUgQXNCcmFuY2g8Rj4gPSBcblx0XHRGIGV4dGVuZHMgKCkgPT4gaW5mZXIgUiA/ICguLi5hdG9tczogQXRvbVtdKSA9PiBSIDpcblx0XHRGIGV4dGVuZHMgKC4uLmFyZ3M6IGluZmVyIEEpID0+IGluZmVyIFIgPyAoLi4uYXJnczogQSkgPT4gKC4uLmF0b21zOiBBdG9tW10pID0+IFIgOlxuXHRcdEY7XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBTdGF0aWNCcmFuY2hlc09mPEwgZXh0ZW5kcyBSZWZsZXguQ29yZS5JTGlicmFyeT4gPVxuXHRcdExbXCJnZXRTdGF0aWNCcmFuY2hlc1wiXSBleHRlbmRzIEZ1bmN0aW9uID9cblx0XHRcdEFzQnJhbmNoZXM8UmV0dXJuT2Y8TFtcImdldFN0YXRpY0JyYW5jaGVzXCJdPj4gOlxuXHRcdFx0e307XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBTdGF0aWNOb25CcmFuY2hlc09mPEwgZXh0ZW5kcyBSZWZsZXguQ29yZS5JTGlicmFyeT4gPVxuXHRcdExbXCJnZXRTdGF0aWNOb25CcmFuY2hlc1wiXSBleHRlbmRzIEZ1bmN0aW9uID9cblx0XHRcdEFzQnJhbmNoZXM8UmV0dXJuT2Y8TFtcImdldFN0YXRpY05vbkJyYW5jaGVzXCJdPj4gOlxuXHRcdFx0e307XG59XG5cbiIsIlxuLyoqXG4gKiBSZXR1cm5zIGEgZm9yY2UgZnVuY3Rpb24gdGhhdCByZW1vdGVseSB0cmlnZ2VycyBzb21lIGJlaGF2aW9yIHdoZW4gaW52b2tlZC5cbiAqL1xuZnVuY3Rpb24gZm9yY2UoKTogUmVmbGV4LlN0YXRlbGVzc0ZvcmNlO1xuLyoqXG4gKiBSZXR1cm5zIGEgU3RhdGVsZXNzRm9yY2UgdGhhdCByZW1vdGVseSB0cmlnZ2VycyBzb21lIGJlaGF2aW9yIHdoZW4gdGhlXG4gKiBpbnRlcm5hbCB2YWx1ZSBpcyBjaGFuZ2VkLlxuICovXG5mdW5jdGlvbiBmb3JjZTxGIGV4dGVuZHMgUmVmbGV4LkFycm93RnVuY3Rpb24+KCk6IFJlZmxleC5TdGF0ZWxlc3NGb3JjZVBhcmFtZXRyaWM8Rj47XG4vKipcbiAqIFJldHVybnMgYSBCb29sZWFuRm9yY2Ugb2JqZWN0IHRoYXQgcmVtb3RlbHkgdHJpZ2dlcnMgc29tZSBiZWhhdmlvclxuICogd2hlbiB0aGUgaW50ZXJuYWwgYm9vbGVhbiB2YWx1ZSBpcyBjaGFuZ2VkLlxuICovXG5mdW5jdGlvbiBmb3JjZShpbml0aWFsVmFsdWU6IGJvb2xlYW4pOiBSZWZsZXguQm9vbGVhbkZvcmNlO1xuLyoqXG4gKiBSZXR1cm5zIGFuIEFycmF5Rm9yY2Ugb2JqZWN0IHRoYXQgcmVtb3RlbHkgdHJpZ2dlcnMgc29tZSBiZWhhdmlvclxuICogd2hlbiB0aGUgYXJyYXkgaXMgbW9kaWZpZWQuXG4gKi9cbmZ1bmN0aW9uIGZvcmNlPFQ+KGJhY2tpbmdBcnJheTogVFtdKTogUmVmbGV4LkFycmF5Rm9yY2U8VD47XG4vKipcbiAqIFJldHVybnMgYSBTdGF0ZWxlc3NGb3JjZSBvYmplY3QgdGhhdCByZW1vdGVseSB0cmlnZ2VycyBzb21lXG4gKiBiZWhhdmlvciB3aGVuIHRoZSBpbnRlcm5hbCBvYmplY3QgdmFsdWUgaXMgY2hhbmdlZC5cbiAqL1xuZnVuY3Rpb24gZm9yY2U8VCBleHRlbmRzIHt9Pihpbml0aWFsVmFsdWU6IFQpOiBSZWZsZXguU3RhdGVmdWxGb3JjZTxUPjtcbmZ1bmN0aW9uIGZvcmNlKHZhbD86IGFueSlcbntcblx0aWYgKHZhbCA9PT0gdW5kZWZpbmVkIHx8IHZhbCA9PT0gbnVsbClcblx0XHRyZXR1cm4gUmVmbGV4LkNvcmUuRm9yY2VVdGlsLmNyZWF0ZUZ1bmN0aW9uKCk7XG5cdFxuXHRpZiAodHlwZW9mIHZhbCA9PT0gXCJib29sZWFuXCIpXG5cdFx0cmV0dXJuIG5ldyBSZWZsZXguQm9vbGVhbkZvcmNlKHZhbCk7XG5cdFxuXHRpZiAodHlwZW9mIHZhbCA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgdmFsID09PSBcImJpZ2ludFwiKVxuXHRcdHJldHVybiBuZXcgUmVmbGV4LlN0YXRlZnVsRm9yY2UodmFsKTtcblx0XG5cdGlmICh0eXBlb2YgdmFsID09PSBcIm51bWJlclwiKVxuXHRcdHJldHVybiBuZXcgUmVmbGV4LlN0YXRlZnVsRm9yY2UodmFsIHx8IDApO1xuXHRcblx0aWYgKEFycmF5LmlzQXJyYXkodmFsKSlcblx0XHRyZXR1cm4gUmVmbGV4LkFycmF5Rm9yY2UuY3JlYXRlKHZhbCk7XG5cdFxuXHRpZiAodHlwZW9mIHZhbCA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgdmFsID09PSBcInN5bWJvbFwiKVxuXHRcdHJldHVybiBuZXcgUmVmbGV4LlN0YXRlZnVsRm9yY2UodmFsKTtcblx0XG5cdHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBjcmVhdGUgYSBmb3JjZSBmcm9tIHRoaXMgdmFsdWUuXCIpO1xufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0LyoqXG5cdCAqIFRoZSBpbnRlcmZhY2UgdGhhdCBSZWZsZXggbGlicmFyaWVzIChSZWZsZXggTUwsIFJlZmxleCBTUywgZXRjKVxuXHQgKiBtdXN0IGltcGxlbWVudC4gXG5cdCAqL1xuXHRleHBvcnQgaW50ZXJmYWNlIElMaWJyYXJ5XG5cdHtcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIG11c3QgaW1wbGVtZW50IHRoaXMgbWV0aG9kLCBzbyB0aGF0IHRoZVxuXHRcdCAqIFJlZmxleCBDb3JlIGNhbiBkZXRlcm1pbmUgdGhlIG9yaWdpbmF0aW5nIGxpYnJhcnkgb2YgYSBnaXZlblxuXHRcdCAqIG9iamVjdC4gVGhlIGxpYnJhcnkgc2hvdWxkIHJldHVybiBhIGJvb2xlYW4gdmFsdWUgaW5kaWNhdGluZ1xuXHRcdCAqIHdoZXRoZXIgdGhlIGxpYnJhcnkgaXMgYWJsZSB0byBvcGVyYXRlIG9uIHRoZSBvYmplY3Qgc3BlY2lmaWVkLlxuXHRcdCAqL1xuXHRcdGlzS25vd25CcmFuY2goYnJhbmNoOiBJQnJhbmNoKTogYm9vbGVhbjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIG1heSBpbXBsZW1lbnQgdGhpcyBtZXRob2QgaW4gb3JkZXIgdG8gcHJvdmlkZVxuXHRcdCAqIHRoZSBzeXN0ZW0gd2l0aCBrbm93bGVkZ2Ugb2Ygd2hldGhlciBhIGJyYW5jaCBoYXMgYmVlbiBkaXNwb3NlZCxcblx0XHQgKiB3aGljaCBpdCB1c2VzIGZvciBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25zLiBJZiB0aGUgbGlicmFyeSBoYXMgbm9cblx0XHQgKiBtZWFucyBvZiBkb2luZyB0aGlzLCBpdCBtYXkgcmV0dXJuIFwibnVsbFwiLlxuXHRcdCAqL1xuXHRcdGlzQnJhbmNoRGlzcG9zZWQ/OiAoYnJhbmNoOiBJQnJhbmNoKSA9PiBib29sZWFuO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGdldFN0YXRpY0JyYW5jaGVzPzogKCkgPT4geyBbbmFtZTogc3RyaW5nXTogYW55IH0gfCB1bmRlZmluZWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyB0aGF0IGhhdmUgc3RhdGljIG1lbWJlcnMgaW4gdGhlaXIgbmFtZXNwYWNlIG11c3Rcblx0XHQgKiByZXR1cm4gdGhlbSBhcyBhbiBvYmplY3QgaW4gdGhpcyBtZXRob2QuXG5cdFx0ICovXG5cdFx0Z2V0U3RhdGljTm9uQnJhbmNoZXM/OiAoKSA9PiB7IFtuYW1lOiBzdHJpbmddOiBhbnkgfSB8IHVuZGVmaW5lZDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRnZXREeW5hbWljQnJhbmNoPzogKG5hbWU6IHN0cmluZykgPT4gSUJyYW5jaDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIG11c3QgaW1wbGVtZW50IHRoaXMgZnVuY3Rpb24gdG8gY3JlYXRlIGFic3RyYWN0XG5cdFx0ICogdG9wLWxldmVsIGNvbnRhaW5lciBicmFuY2hlcy5cblx0XHQgKiBcblx0XHQgKiBUaGlzIGZ1bmN0aW9uIHNob3VsZCBiZSBpbXBsZW1lbnRlZCBieSBsaWJyYXJpZXMgdGhhdCB1c2UgdGhlXG5cdFx0ICogY29udGFpbmVyIG5hbWVzcGFjZSB2YXJpYW50LlxuXHRcdCAqL1xuXHRcdGdldER5bmFtaWNOb25CcmFuY2g/OiAobmFtZTogc3RyaW5nKSA9PiBhbnk7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0Z2V0Um9vdEJyYW5jaD86ICgpID0+IElCcmFuY2g7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyB0aGF0IGFyZSBpbXBsZW1lbnRlZCB3aXRoIHRoZSBsZWFmIG5hbWVzcGFjZVxuXHRcdCAqIHZhcmlhbnQgdXNlIHRoaXMgbWV0aG9kIHRvIGNvbnZlcnQgdmFsdWVzIHBhc3NlZCBpbnRvIHRoZSBuYW1lc3BhY2Vcblx0XHQgKiBvYmplY3QncyB0YWdnZWQgdGVtcGxhdGUgZnVuY3Rpb24gaW50byBvYmplY3RzIHRoYXQgbWF5IGJlIGludGVycHJldGVkXG5cdFx0ICogYXMgZGlzcGxheSB0ZXh0LlxuXHRcdCAqL1xuXHRcdGdldExlYWY/OiAobGVhZjogYW55KSA9PiBJTGVhZiB8IG51bGw7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyB0aGF0IHN1cHBvcnQgaW5saW5lIHRhcmdldCtjaGlsZHJlbiBjbG9zdXJlc1xuXHRcdCAqIG11c3QgcHJvdmlkZSBhbiBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBtZXRob2QuXG5cdFx0ICovXG5cdFx0Z2V0Q2hpbGRyZW4odGFyZ2V0OiBJQnJhbmNoKTogSXRlcmFibGU8SUJyYW5jaCB8IElMZWFmPjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRzd2FwQnJhbmNoZXMoYnJhbmNoMTogSUJyYW5jaCwgYnJhbmNoMjogSUJyYW5jaCk6IHZvaWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0cmVwbGFjZUJyYW5jaChicmFuY2gxOiBJQnJhbmNoLCBicmFuY2gyOiBJQnJhbmNoKTogdm9pZDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRhdHRhY2hBdG9tKGF0b206IGFueSwgYnJhbmNoOiBJQnJhbmNoLCByZWY6IFJlZik6IHZvaWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0ZGV0YWNoQXRvbShhdG9tOiBhbnksIGJyYW5jaDogSUJyYW5jaCk6IHZvaWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0YXR0YWNoQXR0cmlidXRlKGJyYW5jaDogSUJyYW5jaCwga2V5OiBzdHJpbmcsIHZhbHVlOiBhbnkpOiB2b2lkO1xuXHRcdFx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRkZXRhY2hBdHRyaWJ1dGUoYnJhbmNoOiBJQnJhbmNoLCBrZXk6IHN0cmluZyk6IHZvaWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyBjYW4gaGlqYWNrIHRoZSBvbigpLCBvbmNlKCkgYW5kIG9ubHkoKSBmdW5jdGlvbnNcblx0XHQgKiB0byBwcm92aWRlIHRoZWlyIG93biBjdXN0b20gYmVoYXZpb3IgYnkgb3ZlcnJpZGluZyB0aGlzIG1ldGhvZC5cblx0XHQgKiBcblx0XHQgKiBJZiB0aGUgbWV0aG9kIHJldHVybnMgdW5kZWZpbmVkLCB0aGUgcmVjdXJyZW50IGZ1bmN0aW9uIGNyZWF0aW9uXG5cdFx0ICogZmFjaWxpdGllcyBidWlsdCBpbnRvIHRoZSBSZWZsZXggQ29yZSBhcmUgdXNlZC5cblx0XHQgKi9cblx0XHRjcmVhdGVSZWN1cnJlbnQ/OiAoXG5cdFx0XHRraW5kOiBSZWN1cnJlbnRLaW5kLFxuXHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdGNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9tPixcblx0XHRcdHJlc3Q6IGFueVtdKSA9PiBhbnlcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIHRoYXQgY29udHJpYnV0ZSB0byB0aGUgZ2xvYmFsIG9uKCkgZnVuY3Rpb25cblx0XHQgKiBtdXN0IHByb3ZpZGUgYW4gaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgbWV0aG9kLlxuXHRcdCAqIFxuXHRcdCAqIExpYnJhcmllcyBtdXN0IGltcGxlbWVudCB0aGlzIGZ1bmN0aW9uIGluIG9yZGVyIHRvIHByb3ZpZGUgdGhlaXIgb3duXG5cdFx0ICogaG9va3MgaW50byB0aGUgZ2xvYmFsIHJlY3VycmVudCBmdW5jdGlvbnMgKHN1Y2ggYXMgb24oKSwgb25seSgpIGFuZCBvbmNlKCkpLlxuXHRcdCAqIFxuXHRcdCAqIElmIHRoZSBsaWJyYXJ5IGRvZXMgbm90IHJlY29nbml6ZSB0aGUgc2VsZWN0b3IgcHJvdmlkZWQsIGl0IHNob3VsZFxuXHRcdCAqIHJldHVybiBmYWxzZSwgc28gdGhhdCB0aGUgUmVmbGV4IGVuZ2luZSBjYW4gZmluZCBhbm90aGVyIHBsYWNlIHRvXG5cdFx0ICogcGVyZm9ybSB0aGUgYXR0YWNobWVudC4gSW4gb3RoZXIgY2FzZXMsIGl0IHNob3VsZCByZXR1cm4gdHJ1ZS5cblx0XHQgKi9cblx0XHRhdHRhY2hSZWN1cnJlbnQ/OiAoXG5cdFx0XHRraW5kOiBSZWN1cnJlbnRLaW5kLFxuXHRcdFx0dGFyZ2V0OiBJQnJhbmNoLFxuXHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdGNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9tPixcblx0XHRcdHJlc3Q6IGFueVtdKSA9PiBib29sZWFuO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgdGhhdCBjb250cmlidXRlIHRvIHRoZSBnbG9iYWwgb2ZmKCkgZnVuY3Rpb25cblx0XHQgKiBtdXN0IHByb3ZpZGUgYW4gaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgbWV0aG9kLlxuXHRcdCAqL1xuXHRcdGRldGFjaFJlY3VycmVudD86IChcblx0XHRcdGJyYW5jaDogSUJyYW5jaCxcblx0XHRcdHNlbGVjdG9yOiBhbnksXG5cdFx0XHRjYWxsYmFjazogUmVjdXJyZW50Q2FsbGJhY2s8QXRvbT4pID0+IHZvaWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyBjYW4gaW1wbGVtZW50IHRoaXMgZnVuY3Rpb24gaW4gb3JkZXJcblx0XHQgKiB0byBjYXB0dXJlIHRoZSBmbG93IG9mIGJyYW5jaGVzIGJlaW5nIHBhc3NlZCBhc1xuXHRcdCAqIGF0b21zIHRvIG90aGVyIGJyYW5jaCBmdW5jdGlvbnMuXG5cdFx0ICovXG5cdFx0aGFuZGxlQnJhbmNoRnVuY3Rpb24/OiAoXG5cdFx0XHRicmFuY2g6IElCcmFuY2gsXG5cdFx0XHRicmFuY2hGbjogKC4uLmF0b21zOiBhbnlbXSkgPT4gSUJyYW5jaCkgPT4gdm9pZDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIGNhbiBpbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiBpbiBvcmRlciB0byBwcm9jZXNzXG5cdFx0ICogYSBicmFuY2ggYmVmb3JlIGl0J3MgcmV0dXJuZWQgZnJvbSBhIGJyYW5jaCBmdW5jdGlvbi4gV2hlbiB0aGlzXG5cdFx0ICogZnVuY3Rpb24gaXMgaW1wbGVtZW50ZWQsIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGJyYW5jaCBmdW5jdGlvbnNcblx0XHQgKiBhcmUgcmVwbGFjZWQgd2l0aCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoaXMgZnVuY3Rpb24uIFJlZmxleGl2ZSBsaWJyYXJpZXNcblx0XHQgKiB0aGF0IHJlcXVpcmUgdGhlIHN0YW5kYXJkIGJlaGF2aW9yIG9mIHJldHVybmluZyBicmFuY2hlcyBmcm9tIHRoZVxuXHRcdCAqIGJyYW5jaCBmdW5jdGlvbnMgc2hvdWxkIHJldHVybiB0aGUgYGJyYW5jaGAgYXJndW1lbnQgdG8gdGhpcyBmdW5jdGlvblxuXHRcdCAqIHZlcmJhdGltLlxuXHRcdCAqL1xuXHRcdHJldHVybkJyYW5jaD86IChicmFuY2g6IElCcmFuY2gpID0+IHN0cmluZyB8IG51bWJlciB8IGJpZ2ludCB8IG9iamVjdDtcblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4LkNvcmVcbntcblx0bGV0IG5leHRWYWwgPSAwO1xuXHRsZXQgbmV4dFRpbWVzdGFtcCA9IDA7XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGNvbnN0IGVudW0gTG9jYXRvclR5cGVcblx0e1xuXHRcdGJyYW5jaCA9IDAsXG5cdFx0bGVhZiA9IDEsXG5cdFx0c3RyZWFtID0gMlxuXHR9XG5cdFxuXHQvKipcblx0ICogQSBtdWx0aS1sZXZlbCBpbmRleGluZyBkYXRhIHR5cGUsIHVzZWQgdG8gY29udHJvbCB3aGVyZSBuZXcgc2libGluZyBicmFuY2hlc1xuXHQgKiBzaG91bGQgYmUgaW5zZXJ0ZWQgaW4gYSBnaXZlbiBzaWJsaW5nIGxpc3QuXG5cdCAqIFxuXHQgKiBMb2NhdG9ycyBhcmUgdXNlZCB0byBzb2x2ZSB0aGUgcHJvYmxlbSBvZiBkZXRlcm1pbmluZyB3aGVyZSB0byBwb3NpdGlvbiB0aGVcblx0ICogbGVhdmVzIGFuZCBicmFuY2hlcyByZXR1cm5lZCBieSByZWN1cnJlbnQgZnVuY3Rpb25zIHdpdGhpbiBzb21lIG90aGVyIGJyYW5jaC5cblx0ICogXG5cdCAqIEVhY2ggTWV0YSBvYmplY3QgaGFzIGEgY29ycmVzcG9uZGluZyBMb2NhdG9yLlxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIExvY2F0b3Jcblx0e1xuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgYSBmdWxseSBmb3JtZWQgTG9jYXRvciBvYmplY3QgZnJvbSBpdCdzIHNlcmlhbGl6ZWQgcmVwcmVzZW50YXRpb24uXG5cdFx0ICovXG5cdFx0c3RhdGljIHBhcnNlKHNlcmlhbGl6ZWRMb2NhdG9yOiBzdHJpbmcpXG5cdFx0e1xuXHRcdFx0Y29uc3QgcGFydHMgPSBzZXJpYWxpemVkTG9jYXRvci5zcGxpdCgvW3w+XS9nKTtcblx0XHRcdGNvbnN0IHR5cGUgPSA8TG9jYXRvclR5cGU+cGFyc2VJbnQocGFydHMuc2hpZnQoKSB8fCBcIjBcIiwgMTApIHx8IExvY2F0b3JUeXBlLmJyYW5jaDtcblx0XHRcdGNvbnN0IGxvY2F0b3IgPSBuZXcgTG9jYXRvcih0eXBlKTtcblx0XHRcdGxvY2F0b3IuaG9tZVRpbWVzdGFtcCA9IHBhcnNlSW50KHBhcnRzLnNoaWZ0KCkgfHwgXCIwXCIsIDEwKSB8fCAwO1xuXHRcdFx0bG9jYXRvci52YWx1ZXMucHVzaCguLi5wYXJ0cy5tYXAocCA9PiBwYXJzZUludChwLCAxMCkgfHwgMCkpO1xuXHRcdFx0cmV0dXJuIGxvY2F0b3I7XG5cdFx0fVxuXHRcdFxuXHRcdGNvbnN0cnVjdG9yKHJlYWRvbmx5IHR5cGU6IExvY2F0b3JUeXBlKSB7IH1cblx0XHRcblx0XHQvKiogKi9cblx0XHR0b1N0cmluZygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIChcblx0XHRcdFx0dGhpcy50eXBlICsgXCJ8XCIgK1xuXHRcdFx0XHR0aGlzLmhvbWVUaW1lc3RhbXAgKyBcInxcIiArXG5cdFx0XHRcdHRoaXMudmFsdWVzLmpvaW4oXCI+XCIpXG5cdFx0XHQpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgYmVsb3cgYXJyYXkgaXMgaW5pdGlhbGl6ZWQgdG8gZW1wdHkgd2hlbiB0aGUgTG9jYXRvciBpbnN0YW5jZVxuIFx0XHQgKiBpcyBpbnN0YW50aWF0ZWQuIFRoaXMgaXMgYmVjYXVzZSB3aGVuIGxvY2F0b3JzIGFyZSBmaXJzdCBpbnN0YW50aWF0ZWQsXG4gXHRcdCAqIHRoZXkgcmVmZXIgdG8gbWV0YXMgdGhhdCBhcmUgZmxvYXRpbmcgaW4gbGltYm8gLS0gdGhleSdyZSBub3QgYXR0YWNoZWRcbiBcdFx0ICogdG8gYW55dGhpbmcuIExvY2F0b3IgdmFsdWVzIG9ubHkgYmVjb21lIHJlbGV2YW50IGF0IHRoZSBwb2ludCB3aGVuXG4gXHRcdCAqIHRoZXkgYXJlIGF0dGFjaGVkIHRvIHNvbWUgY29udGFpbmluZyBtZXRhLCBiZWNhdXNlIG90aGVyd2lzZSwgaXQnc1xuIFx0XHQgKiBub3QgcG9zc2libGUgZm9yIHRoZSBsb2NhdG9yIHRvIHJlZmVyIHRvIGEgbWV0YSB0aGF0IGhhcyBcInNpYmxpbmdzXCIsIFxuIFx0XHQgKiB3aGljaCBpcyB0aGUgZW50aXJlIHBvaW50IG9mIHRoZSBMb2NhdG9yIGNvbmNlcHQuXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSB2YWx1ZXM6IG51bWJlcltdID0gW107XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0c2V0TGFzdExvY2F0b3JWYWx1ZSh2YWx1ZTogbnVtYmVyKVxuXHRcdHtcblx0XHRcdHRoaXMudmFsdWVzW3RoaXMudmFsdWVzLmxlbmd0aCAtIDFdID0gdmFsdWU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGdldExhc3RMb2NhdG9yVmFsdWUoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnZhbHVlc1t0aGlzLnZhbHVlcy5sZW5ndGggLSAxXTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGltZXN0YW1wcyBhcmUgYXR0YWNoZWQgdG8gZWFjaCBtZXRhLiBUaGV5IGFyZSBvbmx5IHVzZWQgdG8gZGV0ZXJtaW5lXG5cdFx0ICogd2hldGhlciB0d28gbWV0YXMgb3JpZ2luYXRlZCBpbiB0aGUgc2FtZSBjb250YWluZXIuIFdoZW4gaXRlcmF0aW5nXG5cdFx0ICogdGhyb3VnaCBhIG1ldGEncyBjaGlsZHJlbiwgaXRzIHBvc3NpYmxlIHRoYXQgc29tZSBvZiB0aGUgbWV0YXMgd2VyZSBtb3ZlZFxuXHRcdCAqIGluIGFzIHNpYmxpbmdzIGF0IHJ1bnRpbWUuIFRpbWVzdGFtcHMgYXJlIHVzZWQgdG8gbWFrZSBzdXJlIHRoZXNlIGZvcmVpZ25cblx0XHQgKiBtZXRhcyBhcmUgb21pdHRlZCB3aGVuIGRvaW5nIHRoZXNlIGl0ZXJhdGlvbnMuXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSByZWFkb25seSB0aW1lc3RhbXAgPSArK25leHRUaW1lc3RhbXA7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIHRoZSB0aW1lc3RhbXAgb2YgdGhlIGJyYW5jaCB0aGF0IHdhcyB0aGUgb3JpZ2luYWwgXCJob21lXCIgb2Zcblx0XHQgKiB0aGUgYnJhbmNoIHRoYXQgdGhpcyBsb2NhdG9yIHJlZmVycyB0by4gXCJIb21lXCIgaW4gdGhpcyBjYXNlIG1lYW5zIHRoZVxuXHRcdCAqIGJyYW5jaCB3aGVyZSBpdCB3YXMgb3JpZ2luYWxseSBhcHBlbmRlZC4gSW4gdGhlIGNhc2Ugd2hlbiB0aGUgbG9jYXRvclxuXHRcdCAqIGhhc24ndCBiZWVuIGFwcGVuZGVkIGFueXdoZXJlLCB0aGUgdmFsdWUgaXMgMC5cblx0XHQgKi9cblx0XHRwcml2YXRlIGhvbWVUaW1lc3RhbXAgPSAwO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHNldENvbnRhaW5lcihjb250YWluZXJMb2M6IExvY2F0b3IpXG5cdFx0e1xuXHRcdFx0aWYgKHRoaXMuaG9tZVRpbWVzdGFtcCAhPT0gMClcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XG5cdFx0XHRpZiAoQ29uc3QuZGVidWcgJiYgdGhpcy52YWx1ZXMubGVuZ3RoID4gMClcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiP1wiKTtcblx0XHRcdFxuXHRcdFx0Y29uc3QgdmFsID0gKytuZXh0VmFsO1xuXHRcdFx0XG5cdFx0XHRpZiAoY29udGFpbmVyTG9jLnR5cGUgPT09IExvY2F0b3JUeXBlLnN0cmVhbSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5ob21lVGltZXN0YW1wID0gY29udGFpbmVyTG9jLmhvbWVUaW1lc3RhbXA7XG5cdFx0XHRcdHRoaXMudmFsdWVzLnB1c2goLi4uY29udGFpbmVyTG9jLnZhbHVlcywgdmFsKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGNvbnRhaW5lckxvYy50eXBlID09PSBMb2NhdG9yVHlwZS5icmFuY2gpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuaG9tZVRpbWVzdGFtcCA9IGNvbnRhaW5lckxvYy50aW1lc3RhbXA7XG5cdFx0XHRcdHRoaXMudmFsdWVzLnB1c2godmFsKTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKENvbnN0LmRlYnVnICYmIGNvbnRhaW5lckxvYy50eXBlID09PSBMb2NhdG9yVHlwZS5sZWFmKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCI/XCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRjb21wYXJlKG90aGVyOiBMb2NhdG9yKTogQ29tcGFyZVJlc3VsdFxuXHRcdHtcblx0XHRcdC8vIERldGVjdCBhIHBvdGVudGlhbCBjb21wYXJpc29uIHdpdGggYSBmbG9hdGluZyBtZXRhXG5cdFx0XHRpZiAodGhpcy5ob21lVGltZXN0YW1wID09PSAwIHx8IG90aGVyLmhvbWVUaW1lc3RhbXAgPT09IDApXG5cdFx0XHRcdHJldHVybiBDb21wYXJlUmVzdWx0LmluY29tcGFyYWJsZTtcblx0XHRcdFxuXHRcdFx0Ly8gRGV0ZWN0IGRpZmZlcmluZyBvcmlnaW5hdGluZyBjb250YWluZXJzXG5cdFx0XHRpZiAodGhpcy5ob21lVGltZXN0YW1wICE9PSBvdGhlci5ob21lVGltZXN0YW1wKVxuXHRcdFx0XHRyZXR1cm4gQ29tcGFyZVJlc3VsdC5pbmNvbXBhcmFibGU7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHRoaXNMYXN0ID0gdGhpcy52YWx1ZXNbdGhpcy52YWx1ZXMubGVuZ3RoIC0gMV07XG5cdFx0XHRjb25zdCBvdGhlckxhc3QgPSBvdGhlci52YWx1ZXNbb3RoZXIudmFsdWVzLmxlbmd0aCAtIDFdO1xuXHRcdFx0XG5cdFx0XHQvLyBEZXRlY3Qgc2ltcGxlIGVxdWFsaXR5XG5cdFx0XHRpZiAodGhpc0xhc3QgPT09IG90aGVyTGFzdClcblx0XHRcdFx0cmV0dXJuIENvbXBhcmVSZXN1bHQuZXF1YWw7XG5cdFx0XHRcblx0XHRcdC8vIFdlJ3JlIHJ1bm5pbmcgYSBjb21wYXJpc29uIG9uIHRoZSBjb21tb24gcG9ydGlvbiBvZiB0aGVcblx0XHRcdC8vIHR3byBudW1iZXIgc2VxdWVuY2VzLiBJZiB0aGUgb25lIGlzIGxvbmdlciB0aGFuIHRoZSBvdGhlcixcblx0XHRcdC8vIGl0J3Mgbm90IGNvbnNpZGVyZWQgaGVyZS5cblx0XHRcdGNvbnN0IG1pbkxlbiA9IE1hdGgubWluKHRoaXMudmFsdWVzLmxlbmd0aCwgb3RoZXIudmFsdWVzLmxlbmd0aCk7XG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgbWluTGVuOylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdGhpc1ZhbCA9IHRoaXMudmFsdWVzW2ldO1xuXHRcdFx0XHRjb25zdCBvdGhlclZhbCA9IG90aGVyLnZhbHVlc1tpXTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICh0aGlzVmFsIDwgb3RoZXJWYWwpXG5cdFx0XHRcdFx0cmV0dXJuIENvbXBhcmVSZXN1bHQuaGlnaGVyO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKHRoaXNWYWwgPiBvdGhlclZhbClcblx0XHRcdFx0XHRyZXR1cm4gQ29tcGFyZVJlc3VsdC5sb3dlcjtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Ly8gVGhlIGNvZGUgYmVsb3cgaGFuZGxlcyB0aGUgY2FzZSB3aGVuIHdlIGhhdmUgdHdvIHNlcXVlbmNlc1xuXHRcdFx0Ly8gb2YgdmFsdWVzLCB3aGVyZSB0aGUgb25lIHNlcXVlbmNlcyBpcyBiYXNpY2FsbHkgYW4gZXh0ZW5zaW9uIG9mIHRoZVxuXHRcdFx0Ly8gb3RoZXIsIHVsdGltYXRlbHkgbG9va2luZyBzb21ldGhpbmcgbGlrZSB0aGlzOlxuXHRcdFx0Ly8gXG5cdFx0XHQvLyAxPjJcblx0XHRcdC8vIDE+Mj4zPjRcblx0XHRcdC8vIFxuXHRcdFx0Ly8gSW4gdGhpcyBjYXNlLCB0aGUgc2hvcnRlciBzZXF1ZW5jZSBpcyBjb25zaWRlcmVkIFwibG93ZXJcIiB0aGFuIHRoZVxuXHRcdFx0Ly8gbG9uZ2VyIG9uZSwgYmVjYXVzZSBpbiB0aGlzIGNhc2UsIHRoZSBjb25zdW1lcnMgb2YgdGhpcyBtZXRob2QgYXJlXG5cdFx0XHQvLyBiYXNpY2FsbHkgdHJ5aW5nIHRvIFwiZ2V0IHRvIHRoZSBlbmQgb2YgYWxsIHRoZSAxPjInc1wiLCBhbmQgdXNpbmcgMT4yXG5cdFx0XHQvLyBhcyB0aGUgaW5wdXQgdG8gY29tbXVuaWNhdGUgdGhhdC5cblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMudmFsdWVzLmxlbmd0aCA+IG90aGVyLnZhbHVlcy5sZW5ndGgpXG5cdFx0XHRcdHJldHVybiBDb21wYXJlUmVzdWx0LmhpZ2hlcjtcblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMudmFsdWVzLmxlbmd0aCA8IG90aGVyLnZhbHVlcy5sZW5ndGgpXG5cdFx0XHRcdHJldHVybiBDb21wYXJlUmVzdWx0Lmxvd2VyO1xuXHRcdFx0XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCI/XCIpO1xuXHRcdH1cblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBjb25zdCBlbnVtIENvbXBhcmVSZXN1bHRcblx0e1xuXHRcdGVxdWFsLFxuXHRcdGluY29tcGFyYWJsZSxcblx0XHRoaWdoZXIsXG5cdFx0bG93ZXJcblx0fVx0XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHRleHBvcnQgdHlwZSBDb25zdHJ1Y3RCcmFuY2hGbiA9ICguLi5hcmdzOiBhbnlbXSkgPT4gSUJyYW5jaDtcblx0XG5cdC8qKiBAaW50ZXJuYWwgKi9cblx0ZGVjbGFyZSBjb25zdCBEZW5vOiBhbnk7XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgdHlwZSBBc0xpYnJhcnk8VE5hbWVzcGFjZSwgVExpYiBleHRlbmRzIElMaWJyYXJ5PiA9IFxuXHRcdFROYW1lc3BhY2UgJlxuXHRcdFN0YXRpY0JyYW5jaGVzT2Y8VExpYj4gJlxuXHRcdFN0YXRpY05vbkJyYW5jaGVzT2Y8VExpYj47XG5cdFxuXHQvKipcblx0ICogQ3JlYXRlcyBhIFJlZmxleCBuYW1lc3BhY2UsIHdoaWNoIGlzIHRoZSB0b3AtbGV2ZWwgZnVuY3Rpb24gb2JqZWN0IHRoYXRcblx0ICogaG9sZHMgYWxsIGZ1bmN0aW9ucyBpbiB0aGUgcmVmbGV4aXZlIGxpYnJhcnkuXG5cdCAqIFxuXHQgKiBUaGlzIGZ1bmN0aW9uIGNyZWF0ZXMgdGhlIFwibGVhZlwiIHZhcmlhbnQgb2YgYSBSZWZsZXggbmFtZXNwYWNlLCB3aGljaFxuXHQgKiBpcyB0aGUgc3R5bGUgd2hlcmUgdGhlIG5hbWVzcGFjZSwgd2hlbiBjYWxsZWQgYXMgYSBmdW5jdGlvbiwgcHJvZHVjZXNcblx0ICogdmlzdWFsIGNvbnRlbnQgdG8gZGlzcGxheS4gUmVmbGV4aXZlIGxpYnJhcmllcyB0aGF0IHVzZSB0aGlzIHZhcmlhbnQgbWF5XG5cdCAqIHVzZSB0aGUgbmFtZXNwYWNlIGFzIGEgdGFnZ2VkIHRlbXBsYXRlIGZ1bmN0aW9uLCBmb3IgZXhhbXBsZTpcblx0ICogbWxgTGl0ZXJhbCB0ZXh0IGNvbnRlbnRgO1xuXHQgKiBcblx0ICogQHBhcmFtIGxpYnJhcnkgQW4gb2JqZWN0IHRoYXQgaW1wbGVtZW50cyB0aGUgSUxpYnJhcnkgaW50ZXJmYWNlLFxuXHQgKiBmcm9tIHdoaWNoIHRoZSBuYW1lc3BhY2Ugb2JqZWN0IHdpbGwgYmUgZ2VuZXJhdGVkLlxuXHQgKiBcblx0ICogQHBhcmFtIGdsb2JhbGl6ZSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgb24vb25jZS9vbmx5IGdsb2JhbHMgc2hvdWxkXG5cdCAqIGJlIGFwcGVuZGVkIHRvIHRoZSBnbG9iYWwgb2JqZWN0ICh3aGljaCBpcyBhdXRvLWRldGVjdGVkIGZyb20gdGhlXG5cdCAqIGN1cnJlbnQgZW52aXJvbm1lbnQuIElmIHRoZSBJTGlicmFyeSBpbnRlcmZhY2UgcHJvdmlkZWQgZG9lc24ndCBzdXBwb3J0XG5cdCAqIHRoZSBjcmVhdGlvbiBvZiByZWN1cnJlbnQgZnVuY3Rpb25zLCB0aGlzIHBhcmFtZXRlciBoYXMgbm8gZWZmZWN0LlxuXHQgKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxlYWZOYW1lc3BhY2Vcblx0XHQ8TiBleHRlbmRzIElMZWFmTmFtZXNwYWNlLCBMIGV4dGVuZHMgSUxpYnJhcnk+KFxuXHRcdGxpYnJhcnk6IEwsXG5cdFx0Z2xvYmFsaXplPzogYm9vbGVhbik6IEFzTGlicmFyeTxOLCBMPlxuXHR7XG5cdFx0aWYgKENvbnN0LmRlYnVnICYmICFsaWJyYXJ5LmdldExlYWYpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGUgLmdldExlYWYgZnVuY3Rpb24gbXVzdCBiZSBpbXBsZW1lbnRlZCBpbiB0aGlzIGxpYnJhcnkuXCIpO1xuXHRcdFxuXHRcdHJldHVybiBjcmVhdGVOYW1lc3BhY2UodHJ1ZSwgbGlicmFyeSwgZ2xvYmFsaXplKTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIENyZWF0ZXMgYSBSZWZsZXggbmFtZXNwYWNlLCB3aGljaCBpcyB0aGUgdG9wLWxldmVsIGZ1bmN0aW9uIG9iamVjdCB0aGF0XG5cdCAqIGhvbGRzIGFsbCBmdW5jdGlvbnMgaW4gdGhlIHJlZmxleGl2ZSBsaWJyYXJ5LlxuXHQgKiBcblx0ICogVGhpcyBmdW5jdGlvbiBjcmVhdGVzIHRoZSBcImNvbnRhaW5lclwiIHZhcmlhbnQgb2YgYSBSZWZsZXggbmFtZXNwYWNlLCB3aGljaFxuXHQgKiBpcyB0aGUgc3R5bGUgd2hlcmUgdGhlIG5hbWVzcGFjZSwgd2hlbiBjYWxsZWQgYXMgYSBmdW5jdGlvbiwgcHJvZHVjZXNcblx0ICogYW4gYWJzdHJhY3QgdG9wLWxldmVsIGNvbnRhaW5lciBvYmplY3QuXG5cdCAqIFxuXHQgKiBAcGFyYW0gbGlicmFyeSBBbiBvYmplY3QgdGhhdCBpbXBsZW1lbnRzIHRoZSBJTGlicmFyeSBpbnRlcmZhY2UsXG5cdCAqIGZyb20gd2hpY2ggdGhlIG5hbWVzcGFjZSBvYmplY3Qgd2lsbCBiZSBnZW5lcmF0ZWQuXG5cdCAqIFxuXHQgKiBAcGFyYW0gZ2xvYmFsaXplIEluZGljYXRlcyB3aGV0aGVyIHRoZSBvbi9vbmNlL29ubHkgZ2xvYmFscyBzaG91bGRcblx0ICogYmUgYXBwZW5kZWQgdG8gdGhlIGdsb2JhbCBvYmplY3QgKHdoaWNoIGlzIGF1dG8tZGV0ZWN0ZWQgZnJvbSB0aGVcblx0ICogY3VycmVudCBlbnZpcm9ubWVudC4gSWYgdGhlIElMaWJyYXJ5IGludGVyZmFjZSBwcm92aWRlZCBkb2Vzbid0IHN1cHBvcnRcblx0ICogdGhlIGNyZWF0aW9uIG9mIHJlY3VycmVudCBmdW5jdGlvbnMsIHRoaXMgcGFyYW1ldGVyIGhhcyBubyBlZmZlY3QuXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gY3JlYXRlQnJhbmNoTmFtZXNwYWNlXG5cdFx0PFROYW1lc3BhY2UgZXh0ZW5kcyBJQnJhbmNoTmFtZXNwYWNlLCBUTGliIGV4dGVuZHMgSUxpYnJhcnk+KFxuXHRcdGxpYnJhcnk6IFRMaWIsXG5cdFx0Z2xvYmFsaXplPzogYm9vbGVhbik6IEFzTGlicmFyeTxUTmFtZXNwYWNlLCBUTGliPlxuXHR7XG5cdFx0aWYgKENvbnN0LmRlYnVnICYmICFsaWJyYXJ5LmdldFJvb3RCcmFuY2gpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJUaGUgLmdldFJvb3RCcmFuY2ggZnVuY3Rpb24gbXVzdCBiZSBpbXBsZW1lbnRlZCBpbiB0aGlzIGxpYnJhcnkuXCIpO1xuXHRcdFxuXHRcdHJldHVybiBjcmVhdGVOYW1lc3BhY2UoZmFsc2UsIGxpYnJhcnksIGdsb2JhbGl6ZSk7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBJbnRlcm5hbCBuYW1lc3BhY2Ugb2JqZWN0IGNyZWF0aW9uIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZnVuY3Rpb24gY3JlYXRlTmFtZXNwYWNlPFROYW1lc3BhY2UsIFRMaWJyYXJ5IGV4dGVuZHMgSUxpYnJhcnk+KFxuXHRcdGlzTGVhZjogYm9vbGVhbixcblx0XHRsaWJyYXJ5OiBUTGlicmFyeSxcblx0XHRnbG9iYWxpemU/OiBib29sZWFuKTogQXNMaWJyYXJ5PFROYW1lc3BhY2UsIFRMaWJyYXJ5PlxuXHR7XG5cdFx0Um91dGluZ0xpYnJhcnkuYWRkTGlicmFyeShsaWJyYXJ5KTtcblx0XHRcblx0XHRjb25zdCBnbG9iOiBhbnkgPVxuXHRcdFx0IWdsb2JhbGl6ZSA/IG51bGwgOlxuXHRcdFx0Ly8gTm9kZS5qc1xuXHRcdFx0KHR5cGVvZiBnbG9iYWwgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIGdsb2JhbC5zZXRUaW1lb3V0ID09PSBcImZ1bmN0aW9uXCIpID8gZ2xvYmFsIDpcblx0XHRcdC8vIEJyb3dzZXIgLyBEZW5vXG5cdFx0XHQodHlwZW9mIG5hdmlnYXRvciA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgRGVubyA9PT0gXCJvYmplY3RcIikgPyB3aW5kb3cgOlxuXHRcdFx0bnVsbDtcblx0XHRcblx0XHQvLyBXZSBjcmVhdGUgdGhlIG9uLCBvbmNlLCBhbmQgb25seSBnbG9iYWxzIGluIHRoZSBjYXNlIHdoZW4gd2UncmUgY3JlYXRpbmdcblx0XHQvLyBhIG5hbWVzcGFjZSBvYmplY3QgZm9yIGEgbGlicmFyeSB0aGF0IHN1cHBvcnRzIHJlY3VycmVudCBmdW5jdGlvbnMuXG5cdFx0aWYgKGdsb2IgJiYgbGlicmFyeS5hdHRhY2hSZWN1cnJlbnQpXG5cdFx0e1xuXHRcdFx0Y29uc3QgY3JlYXRlR2xvYmFsID0gKGtpbmQ6IFJlY3VycmVudEtpbmQpID0+IChcblx0XHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdFx0Y2FsbGJhY2s6IFJlY3VycmVudENhbGxiYWNrPEF0b208YW55Pj4sXG5cdFx0XHRcdC4uLnJlc3Q6IGFueVtdKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRpZiAobGlicmFyeS5jcmVhdGVSZWN1cnJlbnQpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBjdXN0b21SZWN1cnJlbnQgPSBsaWJyYXJ5LmNyZWF0ZVJlY3VycmVudChraW5kLCBzZWxlY3RvciwgY2FsbGJhY2ssIHJlc3QpO1xuXHRcdFx0XHRcdGlmIChjdXN0b21SZWN1cnJlbnQgIT09IHVuZGVmaW5lZClcblx0XHRcdFx0XHRcdHJldHVybiBjdXN0b21SZWN1cnJlbnQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdC8vIFdlIGNvdWxkIHBhcnNlIHRoZSBzZWxlY3RvciBoZXJlLCBzZWUgaWYgeW91IGhhdmUgYW55IG9uLW9uJ3MsXG5cdFx0XHRcdC8vIGlmIHlvdSBkbywgY2FsbCB0aGUgZnVuY3Rpb25zIHRvIGF1Z21lbnQgdGhlIHJldHVybiB2YWx1ZS5cblx0XHRcdFx0Ly8gQWx0ZXJuYXRpdmVseSwgd2UgY291bGQgaW5saW5lIHRoZSBzdXBwb3J0IGZvciBmb3JjZSBhcnJheXMuXG5cdFx0XHRcdHJldHVybiBuZXcgUmVjdXJyZW50KGtpbmQsIHNlbGVjdG9yLCBjYWxsYmFjaywgcmVzdCk7XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0XHRpZiAodHlwZW9mIGdsb2Iub24gIT09IFwiZnVuY3Rpb25cIilcblx0XHRcdFx0Z2xvYi5vbiA9IGNyZWF0ZUdsb2JhbChSZWN1cnJlbnRLaW5kLm9uKTtcblx0XHRcdFxuXHRcdFx0aWYgKHR5cGVvZiBnbG9iLm9uY2UgIT09IFwiZnVuY3Rpb25cIilcblx0XHRcdFx0Z2xvYi5vbmNlID0gY3JlYXRlR2xvYmFsKFJlY3VycmVudEtpbmQub25jZSk7XG5cdFx0XHRcblx0XHRcdGlmICh0eXBlb2YgZ2xvYi5vbmx5ICE9PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdGdsb2Iub25seSA9IGNyZWF0ZUdsb2JhbChSZWN1cnJlbnRLaW5kLm9ubHkpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRjb25zdCBzdGF0aWNNZW1iZXJzID0gKCgpID0+XG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RhdGljQnJhbmNoZXMgPSAoKCkgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgYnJhbmNoRm5zOiB7IFtrZXk6IHN0cmluZ106ICguLi5hcmdzOiBhbnkpID0+IGFueTsgfSA9IHt9O1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKGxpYnJhcnkuZ2V0U3RhdGljQnJhbmNoZXMpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhsaWJyYXJ5LmdldFN0YXRpY0JyYW5jaGVzKCkgfHwge30pKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIilcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGNvbnN0IGNvbnN0cnVjdEJyYW5jaEZuOiBDb25zdHJ1Y3RCcmFuY2hGbiA9IHZhbHVlO1xuXHRcdFx0XHRcdFx0YnJhbmNoRm5zW2tleV0gPSBjb25zdHJ1Y3RCcmFuY2hGbi5sZW5ndGggPT09IDAgP1xuXHRcdFx0XHRcdFx0XHRjcmVhdGVCcmFuY2hGbihjb25zdHJ1Y3RCcmFuY2hGbiwga2V5KSA6XG5cdFx0XHRcdFx0XHRcdGNyZWF0ZVBhcmFtZXRpY0JyYW5jaEZuKGNvbnN0cnVjdEJyYW5jaEZuLCBrZXkpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0cmV0dXJuIGJyYW5jaEZucztcblx0XHRcdH0pKCk7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHN0YXRpY05vbkJyYW5jaGVzID0gXG5cdFx0XHRcdGxpYnJhcnkuZ2V0U3RhdGljTm9uQnJhbmNoZXMgP1xuXHRcdFx0XHRcdGxpYnJhcnkuZ2V0U3RhdGljTm9uQnJhbmNoZXMoKSB8fCB7fSA6IHt9O1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGljQnJhbmNoZXMsIHN0YXRpY05vbkJyYW5jaGVzKTtcblx0XHR9KSgpO1xuXHRcdFxuXHRcdGNvbnN0IG5zRm4gPSBpc0xlYWYgP1xuXHRcdFx0Y3JlYXRlTGVhZk5hbWVzcGFjZUZuKGxpYnJhcnkpIDpcblx0XHRcdGNyZWF0ZUJyYW5jaE5hbWVzcGFjZUZuKGxpYnJhcnkpO1xuXHRcdFxuXHRcdGNvbnN0IG5zT2JqID0gKCgpID0+XG5cdFx0e1xuXHRcdFx0Ly8gSW4gdGhlIGNhc2Ugd2hlbiB0aGVyZSBhcmUgbm8gZHluYW1pYyBtZW1iZXJzLCB3ZSBjYW4ganVzdFxuXHRcdFx0Ly8gcmV0dXJuIHRoZSBzdGF0aWMgbmFtZXNwYWNlIG1lbWJlcnMsIGFuZCBhdm9pZCB1c2Ugb2YgUHJveGllc1xuXHRcdFx0Ly8gYWxsIHRvZ2V0aGVyLlxuXHRcdFx0aWYgKCFsaWJyYXJ5LmdldER5bmFtaWNCcmFuY2ggJiYgIWxpYnJhcnkuZ2V0RHluYW1pY05vbkJyYW5jaClcblx0XHRcdFx0cmV0dXJuIDxhbnk+T2JqZWN0LmFzc2lnbihuc0ZuLCBzdGF0aWNNZW1iZXJzKTtcblx0XHRcdFxuXHRcdFx0Ly8gVGhpcyB2YXJpYWJsZSBzdG9yZXMgYW4gb2JqZWN0IHRoYXQgY29udGFpbnMgdGhlIG1lbWJlcnNcblx0XHRcdC8vIHRoYXQgd2VyZSBhdHRhY2hlZCB0byB0aGUgcHJveHkgb2JqZWN0IGFmdGVyIGl0J3MgY3JlYXRpb24uXG5cdFx0XHQvLyBDdXJyZW50bHkgdGhpcyBpcyBvbmx5IGJlaW5nIHVzZWQgYnkgUmVmbGV4TUwgdG8gYXR0YWNoXG5cdFx0XHQvLyB0aGUgXCJlbWl0XCIgZnVuY3Rpb24sIGJ1dCBvdGhlcnMgbWF5IHVzZSBpdCBhc3dlbGwuXG5cdFx0XHRsZXQgYXR0YWNoZWRNZW1iZXJzOiB7IFtrZXk6IHN0cmluZ106IGFueTsgfSB8IG51bGwgPSBudWxsO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gPGFueT5uZXcgUHJveHkobnNGbiwge1xuXHRcdFx0XHRnZXQodGFyZ2V0OiBGdW5jdGlvbiwga2V5OiBzdHJpbmcpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAodHlwZW9mIGtleSAhPT0gXCJzdHJpbmdcIilcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIlVua25vd24gcHJvcGVydHkuXCIpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChrZXkgPT09IFwiY2FsbFwiIHx8IGtleSA9PT0gXCJhcHBseVwiKVxuXHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiY2FsbCgpIGFuZCBhcHBseSgpIGFyZSBub3Qgc3VwcG9ydGVkLlwiKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoa2V5IGluIHN0YXRpY01lbWJlcnMpXG5cdFx0XHRcdFx0XHRyZXR1cm4gc3RhdGljTWVtYmVyc1trZXldO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChhdHRhY2hlZE1lbWJlcnMgJiYga2V5IGluIGF0dGFjaGVkTWVtYmVycylcblx0XHRcdFx0XHRcdHJldHVybiBhdHRhY2hlZE1lbWJlcnNba2V5XTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAobGlicmFyeS5nZXREeW5hbWljQnJhbmNoKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGNvbnN0IGJyYW5jaCA9IGxpYnJhcnkuZ2V0RHluYW1pY0JyYW5jaChrZXkpO1xuXHRcdFx0XHRcdFx0aWYgKGJyYW5jaClcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGNyZWF0ZUJyYW5jaEZuKCgpID0+IGJyYW5jaCwga2V5KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKGxpYnJhcnkuZ2V0RHluYW1pY05vbkJyYW5jaClcblx0XHRcdFx0XHRcdHJldHVybiBsaWJyYXJ5LmdldER5bmFtaWNOb25CcmFuY2goa2V5KTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c2V0KHRhcmdldDogRnVuY3Rpb24sIHA6IGFueSwgdmFsdWU6IGFueSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdChhdHRhY2hlZE1lbWJlcnMgfHwgKGF0dGFjaGVkTWVtYmVycyA9IHt9KSlbcF0gPSB2YWx1ZTtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSkoKTtcblx0XHRcblx0XHRuYW1lc3BhY2VPYmplY3RzLnNldChuc09iaiwgbGlicmFyeSk7XG5cdFx0cmV0dXJuIG5zT2JqO1xuXHR9XG5cdFxuXHQvKipcblx0ICogUmV0dXJucyB0aGUgSUxpYnJhcnkgaW5zdGFuY2UgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgc3BlY2lmaWVkIG5hbWVzcGFjZVxuXHQgKiBvYmplY3QuIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCBmb3IgbGF5ZXJpbmcgUmVmbGV4aXZlIGxpYnJhcmllcyBvbiB0b3Agb2YgZWFjaFxuXHQgKiBvdGhlciwgaS5lLiwgdG8gZGVmZXIgdGhlIGltcGxlbWVudGF0aW9uIG9mIG9uZSBvZiB0aGUgSUxpYnJhcnkgZnVuY3Rpb25zIHRvXG5cdCAqIGFub3RoZXIgSUxpYnJhcnkgYXQgYSBsb3dlci1sZXZlbC5cblx0ICogXG5cdCAqIFRoZSB0eXBpbmdzIG9mIHRoZSByZXR1cm5lZCBJTGlicmFyeSBhc3N1bWUgdGhhdCBhbGwgSUxpYnJhcnkgZnVuY3Rpb25zIGFyZVxuXHQgKiBpbXBsZW1lbnRlZCBpbiBvcmRlciB0byBhdm9pZCBleGNlc3NpdmUgXCJwb3NzaWJseSB1bmRlZmluZWRcIiBjaGVja3MuXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gbGlicmFyeU9mKG5hbWVzcGFjZU9iamVjdDogb2JqZWN0KTogRGVmaW5lZDxJTGlicmFyeT5cblx0e1xuXHRcdGNvbnN0IGxpYjogYW55ID0gbmFtZXNwYWNlT2JqZWN0cy5nZXQobmFtZXNwYWNlT2JqZWN0KTtcblx0XHRcblx0XHRpZiAoQ29uc3QuZGVidWcgJiYgIWxpYilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlRoaXMgb2JqZWN0IGRvZXMgbm90IGhhdmUgYW4gYXNzb2NpYXRlZCBSZWZsZXggbGlicmFyeS5cIik7XG5cdFx0XG5cdFx0cmV0dXJuIGxpYjtcblx0fVxuXHRcblx0LyoqICovXG5cdHR5cGUgRGVmaW5lZDxUPiA9IHsgW1AgaW4ga2V5b2YgVF0tPzogVFtQXSB9O1xuXHRcblx0LyoqXG5cdCAqIFN0b3JlcyBhbGwgY3JlYXRlZCBuYW1lc3BhY2Ugb2JqZWN0cywgdXNlZCB0byBwb3dlciB0aGUgLmxpYnJhcnlPZigpIGZ1bmN0aW9uLlxuXHQgKi9cblx0Y29uc3QgbmFtZXNwYWNlT2JqZWN0cyA9IG5ldyBXZWFrTWFwPG9iamVjdCwgSUxpYnJhcnk+KCk7XG5cdFxuXHQvKipcblx0ICogUmV0dXJucyB3aGV0aGVyIHRoZSBzcGVjaWZpZWQgZnVuY3Rpb24gb3IgbWV0aG9kXG5cdCAqIHJlZmVycyB0byBhIGJyYW5jaCBmdW5jdGlvbiB0aGF0IHdhcyBjcmVhdGVkIGJ5IGFcblx0ICogcmVmbGV4aXZlIGxpYnJhcnkuXG5cdCAqL1xuXHRleHBvcnQgZnVuY3Rpb24gaXNCcmFuY2hGdW5jdGlvbihmbjogRnVuY3Rpb24pXG5cdHtcblx0XHRyZXR1cm4gYnJhbmNoRm5zLmhhcyhmbik7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRjb25zdCB0b0JyYW5jaEZ1bmN0aW9uID0gPFQgZXh0ZW5kcyBGdW5jdGlvbj4obmFtZTogc3RyaW5nLCBmbjogVCkgPT5cblx0e1xuXHRcdGlmIChuYW1lKVxuXHRcdHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShmbiwgXCJuYW1lXCIsIHtcblx0XHRcdFx0dmFsdWU6IG5hbWUsXG5cdFx0XHRcdHdyaXRhYmxlOiBmYWxzZSxcblx0XHRcdFx0Y29uZmlndXJhYmxlOiBmYWxzZVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdGJyYW5jaEZucy5hZGQoZm4pO1xuXHRcdHJldHVybiBmbjtcblx0fVxuXHRcblx0LyoqIFN0b3JlcyB0aGUgc2V0IG9mIGFsbCBicmFuY2ggZnVuY3Rpb25zIGNyZWF0ZWQgYnkgYWxsIHJlZmxleGl2ZSBsaWJyYXJpZXMuICovXG5cdGNvbnN0IGJyYW5jaEZucyA9IG5ldyBXZWFrU2V0PEZ1bmN0aW9uPigpO1xuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0Y29uc3QgY3JlYXRlQnJhbmNoRm4gPSAoY29uc3RydWN0QnJhbmNoRm46ICgpID0+IElCcmFuY2gsIG5hbWU6IHN0cmluZykgPT5cblx0XHR0b0JyYW5jaEZ1bmN0aW9uKG5hbWUsICguLi5hdG9tczogQXRvbVtdKSA9PlxuXHRcdFx0cmV0dXJuQnJhbmNoKGNvbnN0cnVjdEJyYW5jaEZuKCksIGF0b21zKSk7XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRjb25zdCBjcmVhdGVQYXJhbWV0aWNCcmFuY2hGbiA9IChicmFuY2hGbjogKC4uLmFyZ3M6IGFueVtdKSA9PiBJQnJhbmNoLCBuYW1lOiBzdHJpbmcpID0+XG5cdFx0KC4uLmNvbnN0cnVjdEJyYW5jaEFyZ3M6IGFueVtdKSA9PlxuXHRcdFx0dG9CcmFuY2hGdW5jdGlvbihuYW1lLCAoLi4uYXRvbXM6IEF0b21bXSkgPT5cblx0XHRcdFx0cmV0dXJuQnJhbmNoKGJyYW5jaEZuKGNvbnN0cnVjdEJyYW5jaEFyZ3MpLCBhdG9tcykpO1xuXHRcblx0LyoqXG5cdCAqIFJldHVybnMgdGhlIElCcmFuY2ggYmFjayB0byB0aGUgdXNlciwgd2hpbGUgcHJvdmlkaW5nIGFuXG5cdCAqIG9wcG9ydHVuaXR5IGZvciB0aGUgUmVmbGV4aXZlIGxpYnJhcnkgdG8gYXVnbWVudCB0aGUgYWN0dWFsXG5cdCAqIHJldHVybiB2YWx1ZS5cblx0ICovXG5cdGZ1bmN0aW9uIHJldHVybkJyYW5jaChicmFuY2g6IElCcmFuY2gsIGF0b21zOiBhbnlbXSlcblx0e1xuXHRcdGNvbnN0IGxpYiA9IFJvdXRpbmdMaWJyYXJ5Lm9mKGJyYW5jaCk7XG5cdFx0aWYgKCFsaWIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIGJyYW5jaCB0eXBlLlwiKTtcblx0XHRcblx0XHRuZXcgQnJhbmNoTWV0YShicmFuY2gsIGF0b21zLCBsaWIpO1xuXHRcdHJldHVybiBsaWIucmV0dXJuQnJhbmNoID9cblx0XHRcdGxpYi5yZXR1cm5CcmFuY2goYnJhbmNoKSA6XG5cdFx0XHRicmFuY2g7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBDcmVhdGVzIHRoZSBmdW5jdGlvbiB0aGF0IGV4aXN0cyBhdCB0aGUgdG9wIG9mIHRoZSBsaWJyYXJ5LFxuXHQgKiB3aGljaCBpcyB1c2VkIGZvciBpbnNlcnRpbmcgdmlzaWJsZSB0ZXh0IGludG8gdGhlIHRyZWUuXG5cdCAqL1xuXHRmdW5jdGlvbiBjcmVhdGVMZWFmTmFtZXNwYWNlRm4obGlicmFyeTogSUxpYnJhcnkpXG5cdHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0dGVtcGxhdGU6IFRlbXBsYXRlU3RyaW5nc0FycmF5IHwgU3RhdGVmdWxGb3JjZSxcblx0XHRcdC4uLnZhbHVlczogKElCcmFuY2ggfCBTdGF0ZWZ1bEZvcmNlKVtdKTogYW55ID0+XG5cdFx0e1xuXHRcdFx0Y29uc3QgYXJyYXkgPSBBcnJheS5pc0FycmF5KHRlbXBsYXRlKSA/XG5cdFx0XHRcdHRlbXBsYXRlIDpcblx0XHRcdFx0W3RlbXBsYXRlXTtcblx0XHRcdFxuXHRcdFx0Y29uc3Qgb3V0OiBvYmplY3RbXSA9IFtdO1xuXHRcdFx0Y29uc3QgbGVuID0gYXJyYXkubGVuZ3RoICsgdmFsdWVzLmxlbmd0aDtcblx0XHRcdFxuXHRcdFx0Y29uc3QgZ2V0TGVhZiA9IGxpYnJhcnkuZ2V0TGVhZjtcblx0XHRcdGlmICghZ2V0TGVhZilcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XG5cdFx0XHQvLyBUT0RPOiBUaGlzIHNob3VsZCBiZSBvcHRpbWl6ZWQgc28gdGhhdCBtdWx0aXBsZVxuXHRcdFx0Ly8gcmVwZWF0aW5nIHN0cmluZyB2YWx1ZXMgZG9uJ3QgcmVzdWx0IGluIHRoZSBjcmVhdGlvblxuXHRcdFx0Ly8gb2YgbWFueSBMZWFmTWV0YSBvYmplY3RzLlxuXHRcdFx0XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGxlbjspXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHZhbCA9IGkgJSAyID09PSAwID9cblx0XHRcdFx0XHRhcnJheVtpIC8gMl0gOlxuXHRcdFx0XHRcdHZhbHVlc1soaSAtIDEpIC8gMl07XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKHZhbCBpbnN0YW5jZW9mIFN0YXRlZnVsRm9yY2UpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRvdXQucHVzaChuZXcgUmVjdXJyZW50KFxuXHRcdFx0XHRcdFx0UmVjdXJyZW50S2luZC5vbixcblx0XHRcdFx0XHRcdHZhbCxcblx0XHRcdFx0XHRcdG5vdyA9PlxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRjb25zdCByZXN1bHQgPSBnZXRMZWFmKG5vdyk7XG5cdFx0XHRcdFx0XHRcdGlmIChyZXN1bHQpXG5cdFx0XHRcdFx0XHRcdFx0bmV3IExlYWZNZXRhKHJlc3VsdCwgbGlicmFyeSk7XG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdFx0XHRcdFx0fSkucnVuKCkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IHByZXBhcmVkID0gZ2V0TGVhZih2YWwpO1xuXHRcdFx0XHRcdGlmIChwcmVwYXJlZClcblx0XHRcdFx0XHRcdG91dC5wdXNoKHByZXBhcmVkKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IG9iamVjdCBvZiBvdXQpXG5cdFx0XHRcdG5ldyBMZWFmTWV0YShvYmplY3QsIGxpYnJhcnkpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gb3V0O1xuXHRcdH07XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBDcmVhdGVzIHRoZSBmdW5jdGlvbiB0aGF0IGV4aXN0cyBhdCB0aGUgdG9wIG9mIHRoZSBsaWJyYXJ5LFxuXHQgKiB3aGljaCBpcyB1c2VkIGZvciBjcmVhdGluZyBhbiBhYnN0cmFjdCBjb250YWluZXIgb2JqZWN0LlxuXHQgKi9cblx0ZnVuY3Rpb24gY3JlYXRlQnJhbmNoTmFtZXNwYWNlRm4obGlicmFyeTogSUxpYnJhcnkpXG5cdHtcblx0XHRjb25zdCBnZXRSb290QnJhbmNoID0gbGlicmFyeS5nZXRSb290QnJhbmNoO1xuXHRcdHJldHVybiBnZXRSb290QnJhbmNoID9cblx0XHRcdGNyZWF0ZUJyYW5jaEZuKCgpID0+IGdldFJvb3RCcmFuY2goKSwgXCJcIikgOlxuXHRcdFx0KCkgPT4ge307XG5cdH07XG59XG4iLCJcbmRlY2xhcmUgbmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdGV4cG9ydCBpbnRlcmZhY2UgTWV0YUFycmF5PFQgZXh0ZW5kcyBNZXRhID0gTWV0YT5cblx0e1xuXHRcdC8qKlxuXHRcdCAqIE1vdmVzIGEgc2VjdGlvbiBvZiB0aGlzIGFycmF5IGlkZW50aWZpZWQgYnkgc3RhcnQgYW5kIGVuZCB0b1xuXHRcdCAqIHRvIGFub3RoZXIgbG9jYXRpb24gd2l0aGluIHRoaXMgYXJyYXksIHN0YXJ0aW5nIGF0IHRoZSBzcGVjaWZpZWRcblx0XHQgKiB0YXJnZXQgcG9zaXRpb24uXG5cdFx0ICogXG5cdFx0ICogQHBhcmFtIHRhcmdldCBJZiB0YXJnZXQgaXMgbmVnYXRpdmUsIGl0IGlzIHRyZWF0ZWQgYXMgbGVuZ3RoK3RhcmdldCB3aGVyZSBsZW5ndGggaXMgdGhlXG5cdFx0ICogbGVuZ3RoIG9mIHRoZSBhcnJheS5cblx0XHQgKiBAcGFyYW0gc3RhcnQgSWYgc3RhcnQgaXMgbmVnYXRpdmUsIGl0IGlzIHRyZWF0ZWQgYXMgbGVuZ3RoK3N0YXJ0LiBJZiBlbmQgaXMgbmVnYXRpdmUsIGl0XG5cdFx0ICogaXMgdHJlYXRlZCBhcyBsZW5ndGgrZW5kLlxuXHRcdCAqIEBwYXJhbSBlbmQgSWYgbm90IHNwZWNpZmllZCwgbGVuZ3RoIG9mIHRoZSB0aGlzIG9iamVjdCBpcyB1c2VkIGFzIGl0cyBkZWZhdWx0IHZhbHVlLlxuXHRcdCAqL1xuXHRcdG1vdmVXaXRoaW4odGFyZ2V0OiBudW1iZXIsIHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyKTogdGhpcztcblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIG9yIHNldHMgdGhlIGxlbmd0aCBvZiB0aGUgYXJyYXkuIFRoaXMgaXMgYSBudW1iZXIgb25lIGhpZ2hlciBcblx0XHQgKiB0aGFuIHRoZSBoaWdoZXN0IGVsZW1lbnQgZGVmaW5lZCBpbiBhbiBhcnJheS5cblx0XHQgKi9cblx0XHRsZW5ndGg6IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBBcHBlbmRzIG5ldyBlbGVtZW50cyB0byBhbiBhcnJheSwgYW5kIHJldHVybnMgdGhlIG5ldyBsZW5ndGggb2YgdGhlIGFycmF5LlxuXHQgICAgICAgKiBAcGFyYW0gY2hpbGRyZW4gTmV3IGVsZW1lbnRzIG9mIHRoZSBBcnJheS5cblx0XHQgKi9cblx0XHRwdXNoKC4uLmNoaWxkcmVuOiBNZXRhW10pOiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVtb3ZlcyB0aGUgbGFzdCBlbGVtZW50IGZyb20gYW4gYXJyYXkgYW5kIHJldHVybnMgaXQuXG5cdFx0ICovXG5cdFx0cG9wKCk6IE1ldGEgfCB1bmRlZmluZWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVtb3ZlcyB0aGUgZmlyc3QgZWxlbWVudCBmcm9tIGFuIGFycmF5IGFuZCByZXR1cm5zIGl0LlxuXHRcdCAqL1xuXHRcdHNoaWZ0KCk6IE1ldGEgfCB1bmRlZmluZWQ7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogSW5zZXJ0cyBuZXcgZWxlbWVudHMgYXQgdGhlIHN0YXJ0IG9mIGFuIGFycmF5LlxuXHRcdCAqIEBwYXJhbSBjaGlsZHJlbiAgRWxlbWVudHMgdG8gaW5zZXJ0IGF0IHRoZSBzdGFydCBvZiB0aGUgYXJyYXkuXG5cdFx0ICovXG5cdFx0dW5zaGlmdCguLi5jaGlsZHJlbjogTWV0YVtdKTogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJldmVyc2VzIHRoZSBlbGVtZW50cyBpbiB0aGUgYXJyYXkuXG5cdFx0ICovXG5cdFx0cmV2ZXJzZSgpOiB0aGlzO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgYSBzZWN0aW9uIG9mIGFuIGFycmF5LlxuXHRcdCAqIEBwYXJhbSBzdGFydCBUaGUgYmVnaW5uaW5nIG9mIHRoZSBzcGVjaWZpZWQgcG9ydGlvbiBvZiB0aGUgYXJyYXkuXG5cdFx0ICogQHBhcmFtIGVuZCBUaGUgZW5kIG9mIHRoZSBzcGVjaWZpZWQgcG9ydGlvbiBvZiB0aGUgYXJyYXkuXG5cdFx0ICovXG5cdFx0c2xpY2Uoc3RhcnQ/OiBudW1iZXIsIGVuZD86IG51bWJlcik6IE1ldGFBcnJheTxUPjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZW1vdmVzIGVsZW1lbnRzIGZyb20gYW4gYXJyYXkgYW5kLCBpZiBuZWNlc3NhcnksIGluc2VydHMgbmV3IGVsZW1lbnRzIGluIHRoZWlyXG5cdFx0ICogcGxhY2UsIHJldHVybmluZyB0aGUgZGVsZXRlZCBlbGVtZW50cy5cblx0XHQgKiBAcGFyYW0gc3RhcnQgVGhlIHplcm8tYmFzZWQgbG9jYXRpb24gaW4gdGhlIGFycmF5IGZyb20gd2hpY2ggdG8gc3RhcnQgcmVtb3ZpbmcgZWxlbWVudHMuXG5cdFx0ICogQHBhcmFtIGRlbGV0ZUNvdW50IFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmVtb3ZlLlxuXHRcdCAqL1xuXHRcdHNwbGljZShzdGFydDogbnVtYmVyLCBkZWxldGVDb3VudD86IG51bWJlcik6IE1ldGFbXTtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZW1vdmVzIGVsZW1lbnRzIGZyb20gYW4gYXJyYXkgYW5kLCBpZiBuZWNlc3NhcnksIGluc2VydHMgbmV3IGVsZW1lbnRzIGluIHRoZWlyIHBsYWNlLFxuXHRcdCAqIHJldHVybmluZyB0aGUgZGVsZXRlZCBlbGVtZW50cy5cblx0XHQgKiBAcGFyYW0gc3RhcnQgVGhlIHplcm8tYmFzZWQgbG9jYXRpb24gaW4gdGhlIGFycmF5IGZyb20gd2hpY2ggdG8gc3RhcnQgcmVtb3ZpbmcgZWxlbWVudHMuXG5cdFx0ICogQHBhcmFtIGRlbGV0ZUNvdW50IFRoZSBudW1iZXIgb2YgZWxlbWVudHMgdG8gcmVtb3ZlLlxuXHRcdCAqIEBwYXJhbSBpdGVtcyBFbGVtZW50cyB0byBpbnNlcnQgaW50byB0aGUgYXJyYXkgaW4gcGxhY2Ugb2YgdGhlIGRlbGV0ZWQgZWxlbWVudHMuXG5cdFx0ICovXG5cdFx0c3BsaWNlKHN0YXJ0OiBudW1iZXIsIGRlbGV0ZUNvdW50PzogbnVtYmVyLCAuLi5pdGVtczogTWV0YVtdKTogTWV0YVtdO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFNvcnRzIGFuIGFycmF5LlxuXHRcdCAqIEBwYXJhbSBjb21wYXJlRm4gVGhlIG5hbWUgb2YgdGhlIGZ1bmN0aW9uIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZVxuXHRcdCAqIG9yZGVyIG9mIHRoZSBlbGVtZW50cy4gSWYgb21pdHRlZCwgdGhlIGVsZW1lbnRzIGFyZSBzb3J0ZWQgaW4gYXNjZW5kaW5nLCBcblx0XHQgKiBBU0NJSSBjaGFyYWN0ZXIgb3JkZXIuXG5cdFx0ICovXG5cdFx0c29ydDxUPihyZWZlcmVuY2U6IFRbXSwgY29tcGFyZUZuOiAoYTogVCwgYjogVCkgPT4gbnVtYmVyKTogdGhpcztcblx0XHRzb3J0PFQ+KHJlZmVyZW5jZTogVFtdKTogdGhpcztcblx0XHRzb3J0PFQ+KGNvbXBhcmVGbjogKGE6IE1ldGEsIGI6IE1ldGEpID0+IG51bWJlcik6IHRoaXM7XG5cdFx0XG5cdFx0LyoqXG5cdCAgICAgICAqIFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIGEgdmFsdWUgaW4gYW4gYXJyYXkuXG5cdCAgICAgICAqIEBwYXJhbSBzZWFyY2hNZXRhIFRoZSB2YWx1ZSB0byBsb2NhdGUgaW4gdGhlIGFycmF5LlxuXHQgICAgICAgKiBAcGFyYW0gZnJvbUluZGV4IFRoZSBhcnJheSBpbmRleCBhdCB3aGljaCB0byBiZWdpbiB0aGUgc2VhcmNoLiBcblx0XHQgKiBJZiBmcm9tSW5kZXggaXMgb21pdHRlZCwgdGhlIHNlYXJjaCBzdGFydHMgYXQgaW5kZXggMC5cblx0ICAgICAgICovXG5cdFx0aW5kZXhPZihzZWFyY2hNZXRhOiBNZXRhLCBmcm9tSW5kZXg/OiBudW1iZXIpOiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdCAgICAgICAqIFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBsYXN0IG9jY3VycmVuY2Ugb2YgYSBzcGVjaWZpZWQgdmFsdWUgaW4gYW4gYXJyYXkuXG5cdCAgICAgICAqIEBwYXJhbSBzZWFyY2hNZXRhIFRoZSB2YWx1ZSB0byBsb2NhdGUgaW4gdGhlIGFycmF5LlxuXHQgICAgICAgKiBAcGFyYW0gZnJvbUluZGV4IFRoZSBhcnJheSBpbmRleCBhdCB3aGljaCB0byBiZWdpbiB0aGUgc2VhcmNoLiBcblx0XHQgKiBJZiBmcm9tSW5kZXggaXMgb21pdHRlZCwgdGhlIHNlYXJjaCBzdGFydHMgYXQgdGhlIGxhc3QgaW5kZXggaW4gdGhlIGFycmF5LlxuXHQgICAgICAgKi9cblx0XHRsYXN0SW5kZXhPZihzZWFyY2hNZXRhOiBNZXRhLCBmcm9tSW5kZXg/OiBudW1iZXIpOiBudW1iZXI7XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdGNvbnN0IGNhbGxiYWNrczogKCgpID0+IHZvaWQpW10gPSBbXTtcblx0XG5cdC8qKlxuXHQgKiBTdG9yZXMgdGhlIG51bWJlciBvZiBvdXRzdGFuZGluZyBhc3luY2hyb25vdXMgb3BlcmF0aW9uc1xuXHQgKiBhcmUgd2FpdGluZyB0byBiZSBjb21wbGV0ZWQsIHNvIHRoYXQgdGhlIHJlYWR5IHN0YXRlIGNhbGxiYWNrc1xuXHQgKiBjYW4gYmUgdHJpZ2dlcmVkLlxuXHQgKi9cblx0bGV0IG91dHN0YW5kaW5nID0gMDtcblx0XG5cdGV4cG9ydCBjb25zdCBSZWFkeVN0YXRlID1cblx0e1xuXHRcdC8qKlxuXHRcdCAqIEFkZHMgdGhlIHNwZWNpZmllZCBmdW5jdGlvbiB0byB0aGUgbGlzdCBvZiBjYWxsYmFja3MgdG8gaW52b2tlXG5cdFx0ICogd2hlbiBhbGwgb3V0c3RhbmRpbmcgYXN5bmNocm9ub3VzIG9wZXJhdGlvbnMgaGF2ZSBjb21wbGV0ZWQuXG5cdFx0ICogSW4gdGhlIGNhc2Ugd2hlbiB0aGVyZSBhcmUgbm8gb3V0c3RhbmRpbmcgY2FsbGJhY2tzLCB0aGUgZnVuY3Rpb25cblx0XHQgKiBpcyBjYWxsZWQgaW1tZWRpYXRlbHkuXG5cdFx0ICovXG5cdFx0YXdhaXQoY2FsbGJhY2s6ICgpID0+IHZvaWQpXG5cdFx0e1xuXHRcdFx0aWYgKG91dHN0YW5kaW5nIDwgMSlcblx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0Y2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuXHRcdH0sXG5cdFx0XG5cdFx0LyoqIEluY3JlbWVudCB0aGUgcmVhZHkgc3RhdGUuICovXG5cdFx0aW5jKClcblx0XHR7XG5cdFx0XHRvdXRzdGFuZGluZysrO1xuXHRcdH0sXG5cdFx0XG5cdFx0LyoqIERlY3JlbWVudCB0aGUgcmVhZHkgc3RhdGUuICovXG5cdFx0ZGVjKClcblx0XHR7XG5cdFx0XHRvdXRzdGFuZGluZy0tO1xuXHRcdFx0aWYgKG91dHN0YW5kaW5nIDwgMClcblx0XHRcdFx0b3V0c3RhbmRpbmcgPSAwO1xuXHRcdFx0XG5cdFx0XHRpZiAob3V0c3RhbmRpbmcgPT09IDApXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGZucyA9IGNhbGxiYWNrcy5zbGljZSgpO1xuXHRcdFx0XHRjYWxsYmFja3MubGVuZ3RoID0gMDtcblx0XHRcdFx0XG5cdFx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgZm5zLmxlbmd0aDspXG5cdFx0XHRcdFx0Zm5zW2ldKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufVxuIiwiXG5uYW1lc3BhY2UgUmVmbGV4XG57XG5cdGNvbnN0IGF1dG9ydW5DYWNoZSA9IG5ldyBXZWFrTWFwPFJlY3VycmVudCwgYW55W10+KCk7XG5cdFxuXHQvKipcblx0ICogTWFuYWdlcyB0aGUgcmVzcG9uc2liaWxpdGllcyBvZiBhIHNpbmdsZSBjYWxsIHRvIG9uKCkgb3Igb25seSgpLlxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIFJlY3VycmVudDxUUnVuQXJncyBleHRlbmRzIGFueVtdID0gYW55W10+XG5cdHtcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRjb25zdHJ1Y3Rvcihcblx0XHRcdHJlYWRvbmx5IGtpbmQ6IENvcmUuUmVjdXJyZW50S2luZCxcblx0XHRcdHJlYWRvbmx5IHNlbGVjdG9yOiBhbnksXG5cdFx0XHRyZWFkb25seSB1c2VyQ2FsbGJhY2s6IFJlY3VycmVudENhbGxiYWNrPEF0b20+LFxuXHRcdFx0cmVhZG9ubHkgdXNlclJlc3RBcmdzOiBhbnlbXSA9IFtdKVxuXHRcdHtcblx0XHRcdC8vIEluIHRoZSBjYXNlIHdoZW4gdGhlIGZpcnN0IGFyZ3VtZW50IHBhc3NlZCB0byB0aGVcblx0XHRcdC8vIHJlY3VycmVudCBmdW5jdGlvbiBpc24ndCBhIHZhbGlkIHNlbGVjdG9yLCB0aGUgcGFyYW1ldGVyc1xuXHRcdFx0Ly8gYXJlIHNoaWZ0ZWQgYmFja3dhcmRzLiBUaGlzIGlzIHRvIGhhbmRsZSB0aGUgb24oKSBjYWxsc1xuXHRcdFx0Ly8gdGhhdCBhcmUgdXNlZCB0byBzdXBwb3J0IHJlc3RvcmF0aW9ucy5cblx0XHRcdGlmICh0eXBlb2Ygc2VsZWN0b3IgPT09IFwiZnVuY3Rpb25cIiAmJiAhaXNGb3JjZShzZWxlY3RvcikpXG5cdFx0XHR7XG5cdFx0XHRcdHVzZXJSZXN0QXJncy51bnNoaWZ0KHVzZXJDYWxsYmFjayk7XG5cdFx0XHRcdHRoaXMudXNlckNhbGxiYWNrID0gc2VsZWN0b3I7XG5cdFx0XHRcdHRoaXMuc2VsZWN0b3IgPSBcIlwiO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRydW4oLi4uY2FsbGJhY2tBcmd1bWVudHM6IFRSdW5BcmdzKVxuXHRcdHtcblx0XHRcdGF1dG9ydW5DYWNoZS5zZXQodGhpcywgY2FsbGJhY2tBcmd1bWVudHMpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiBQcmV2ZW50IHN0cnVjdHVyYWwgdHlwZSBjb21wYXRpYmlsaXRpZXMuICovXG5cdFx0cHJpdmF0ZSByZWN1cnJlbnROb21pbmFsOiB1bmRlZmluZWQ7XG5cdH1cblx0XG5cdGV4cG9ydCBuYW1lc3BhY2UgQ29yZVxuXHR7XG5cdFx0LyoqXG5cdFx0ICogQGludGVybmFsXG5cdFx0ICogQSBjbGFzcyB0aGF0IGRlYWxzIHdpdGggdGhlIHNwZWNpYWwgY2FzZSBvZiBhIEZvcmNlIHRoYXRcblx0XHQgKiB3YXMgcGx1Z2dlZCBpbnRvIGFuIGF0dHJpYnV0ZS5cblx0XHQgKi9cblx0XHRleHBvcnQgY2xhc3MgQXR0cmlidXRlUmVjdXJyZW50IGV4dGVuZHMgUmVjdXJyZW50XG5cdFx0e1xuXHRcdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRcdGF0dHJpYnV0ZUtleTogc3RyaW5nLFxuXHRcdFx0XHRmb3JjZTogU3RhdGVmdWxGb3JjZSlcblx0XHRcdHtcblx0XHRcdFx0c3VwZXIoXG5cdFx0XHRcdFx0UmVjdXJyZW50S2luZC5vbiwgXHRcblx0XHRcdFx0XHRmb3JjZSxcblx0XHRcdFx0XHQoKG5vdzogYW55KSA9PiBuZXcgQXR0cmlidXRlTWV0YShhdHRyaWJ1dGVLZXksIG5vdykpKTtcblx0XHRcdFx0XG5cdFx0XHRcdGF1dG9ydW5DYWNoZS5zZXQodGhpcywgW10pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBAaW50ZXJuYWxcblx0XHQgKiBFeHRyYWN0cyB0aGUgYXV0b3J1biBhcmd1bWVudHMgZnJvbSB0aGUgaW50ZXJuYWwgY2FjaGUuXG5cdFx0ICogQ2FuIG9ubHkgYmUgZXhlY3V0ZWQgb25jZS5cblx0XHQgKi9cblx0XHRleHBvcnQgZnVuY3Rpb24gZXh0cmFjdEF1dG9ydW5Bcmd1bWVudHMocmVjdXJyZW50OiBSZWN1cnJlbnQpXG5cdFx0e1xuXHRcdFx0Y29uc3QgYXJncyA9IGF1dG9ydW5DYWNoZS5nZXQocmVjdXJyZW50KSB8fCBudWxsO1xuXHRcdFx0aWYgKGFyZ3MpXG5cdFx0XHRcdGF1dG9ydW5DYWNoZS5kZWxldGUocmVjdXJyZW50KTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGFyZ3M7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGV4cG9ydCBjb25zdCBlbnVtIFJlY3VycmVudEtpbmRcblx0XHR7XG5cdFx0XHRvbixcblx0XHRcdG9uY2UsXG5cdFx0XHRvbmx5XG5cdFx0fVxuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKipcblx0ICogQGludGVybmFsXG5cdCAqIEEgY2xhc3MgdGhhdCBzaXRzIGJldHdlZW4gdGhlIHNwZWNpZmljIFJlZmxleGl2ZSBsaWJyYXJ5LCBcblx0ICogYW5kIHRoZSBMaWJyYXJ5IGNsYXNzIGFzIGRlZmluZWQgaW4gdGhlIFJlZmxleCBDb3JlLiBUaGVcblx0ICogcHVycG9zZSBvZiB0aGlzIGNsYXNzIGlzIHRvIG92ZXJyaWRlIGFsbCB0aGUgbWV0aG9kcywgYW5kXG5cdCAqIGRldGVybWluZSB0aGUgc3BlY2lmaWMgbGlicmFyeSB0byByb3V0ZSBlYWNoIGNhbGwgdG8gdGhlIFxuXHQgKiBhYnN0cmFjdCBtZXRob2RzLiBJdCBvcGVyYXRlcyBieSBsb29raW5nIGF0IHRoZSBjb25zdHJ1Y3RvclxuXHQgKiBmdW5jdGlvbiBvZiB0aGUgQnJhbmNoIG9iamVjdCBwcm92aWRlZCB0byBhbGwgdGhlIG1ldGhvZHMsXG5cdCAqIGFuZCB0aGVuIHVzaW5nIHRoaXMgdG8gZGV0ZXJtaW5lIHdoYXQgbGlicmFyeSBpcyByZXNwb25zaWJsZVxuXHQgKiBmb3Igb2JqZWN0cyBvZiB0aGlzIHR5cGUuXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgUm91dGluZ0xpYnJhcnkgaW1wbGVtZW50cyBJTGlicmFyeVxuXHR7XG5cdFx0LyoqXG5cdFx0ICogU2luZ2xldG9uIGFjY2Vzc29yIHByb3BlcnR5LlxuXHRcdCAqL1xuXHRcdHN0YXRpYyBnZXQgdGhpcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuX3RoaXMgPT09IG51bGwgP1xuXHRcdFx0XHR0aGlzLl90aGlzID0gbmV3IFJvdXRpbmdMaWJyYXJ5KCkgOlxuXHRcdFx0XHR0aGlzLl90aGlzO1xuXHRcdH1cblx0XHRwcml2YXRlIHN0YXRpYyBfdGhpczogUm91dGluZ0xpYnJhcnkgfCBudWxsID0gbnVsbDtcblx0XHRcblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBSZWZsZXhpdmUgbGlicmFyeSB0aGF0XG5cdFx0ICogaW50ZXJwcmV0cyB0aGUgc3BlY2lmaWVkIG9iamVjdCBhcyBhIGJyYW5jaC5cblx0XHQgKi9cblx0XHRzdGF0aWMgb2YoYnJhbmNoOiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdGlmIChicmFuY2gpXG5cdFx0XHRcdGZvciAoY29uc3QgbGliIG9mIFJvdXRpbmdMaWJyYXJ5LmxpYnJhcmllcylcblx0XHRcdFx0XHRpZiAobGliLmlzS25vd25CcmFuY2goYnJhbmNoKSlcblx0XHRcdFx0XHRcdHJldHVybiBsaWI7XG5cdFx0XHRcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBBZGRzIGEgcmVmZXJlbmNlIHRvIGEgUmVmbGV4aXZlIGxpYnJhcnksIHdoaWNoIG1heSBiZVxuXHRcdCAqIGNhbGxlZCB1cG9uIGluIHRoZSBmdXR1cmUuXG5cdFx0ICovXG5cdFx0c3RhdGljIGFkZExpYnJhcnkobGlicmFyeTogSUxpYnJhcnkpXG5cdFx0e1xuXHRcdFx0dGhpcy5saWJyYXJpZXMucHVzaChsaWJyYXJ5KTtcblx0XHR9XG5cdFx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgbGlicmFyaWVzOiBJTGlicmFyeVtdID0gW107XG5cdFx0XG5cdFx0cHJpdmF0ZSBjb25zdHJ1Y3RvcigpIHsgfVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIENvbmRpdGlvbmFsbHkgZXhlY3V0ZXMgdGhlIHNwZWNpZmllZCBsaWJyYXJ5IGZ1bmN0aW9uLFxuXHRcdCAqIGluIHRoZSBjYXNlIHdoZW4gaXQncyBkZWZpbmVkLlxuXHRcdCAqL1xuXHRcdHByaXZhdGUgcm91dGU8RiBleHRlbmRzICguLi5hcmdzOiBhbnlbXSkgPT4gUiwgUj4oXG5cdFx0XHRyZWZlcmVuY2VCcmFuY2g6IElCcmFuY2gsXG5cdFx0XHRnZXRGbjogKGxpYnJhcnk6IElMaWJyYXJ5KSA9PiBGIHwgdW5kZWZpbmVkLFxuXHRcdFx0Y2FsbEZuOiAoZm46IEYsIHRoaXNBcmc6IElMaWJyYXJ5KSA9PiBSLFxuXHRcdFx0ZGVmYXVsdFZhbHVlPzogYW55KTogUlxuXHRcdHtcblx0XHRcdGlmIChyZWZlcmVuY2VCcmFuY2gpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGxpYnMgPSBSb3V0aW5nTGlicmFyeS5saWJyYXJpZXM7XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBJdCdzIGltcG9ydGFudCB0aGF0IHRlc3QgZm9yIGFzc29jaWF0aXZpdHkgYmV0d2VlbiBhXG5cdFx0XHRcdC8vIGJyYW5jaCBhbmQgYSBsaWJyYXJ5IGlzIGRvbmUgaW4gcmV2ZXJzZSBvcmRlciwgaW4gb3JkZXJcblx0XHRcdFx0Ly8gdG8gc3VwcG9ydCB0aGUgY2FzZSBvZiBSZWZsZXhpdmUgbGlicmFyaWVzIGJlaW5nIGxheWVyZWRcblx0XHRcdFx0Ly8gb24gdG9wIG9mIGVhY2ggb3RoZXIuIElmIFJlZmxleGl2ZSBsaWJyYXJ5IEEgaXMgbGF5ZXJlZCBvblxuXHRcdFx0XHQvLyBSZWZsZXhpdmUgbGlicmFyeSBCLCBBIHdpbGwgYmUgYWRkZWQgdG8gdGhlIGxpYnJhcmllcyBhcnJheVxuXHRcdFx0XHQvLyBiZWZvcmUgQi4gVGhlIGxpYnJhcmllcyBhcnJheSB0aGVyZWZvcmUgaGFzIGFuIGltcGxpY2l0XG5cdFx0XHRcdC8vIHRvcG9sb2dpY2FsIHNvcnQuIEl0ZXJhdGluZyBiYWNrd2FyZHMgZW5zdXJlcyB0aGF0IHRoZVxuXHRcdFx0XHQvLyBoaWdoZXItbGV2ZWwgbGlicmFyaWVzIGFyZSB0ZXN0ZWQgYmVmb3JlIHRoZSBsb3dlci1sZXZlbCBvbmVzLlxuXHRcdFx0XHQvLyBUaGlzIGlzIGNyaXRpY2FsLCBiZWNhdXNlIGEgaGlnaGVyLWxldmVsIGxpYnJhcnkgbWF5IG9wZXJhdGVcblx0XHRcdFx0Ly8gb24gdGhlIHNhbWUgYnJhbmNoIHR5cGVzIGFzIHRoZSBsb3dlci1sZXZlbCBsaWJyYXJpZXMgdGhhdFxuXHRcdFx0XHQvLyBpdCdzIGFic3RyYWN0aW5nLlxuXHRcdFx0XHRmb3IgKGxldCBpID0gbGlicy5sZW5ndGg7IGktLSA+IDA7KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgbGliID0gbGlic1tpXTtcblx0XHRcdFx0XHRpZiAobGliLmlzS25vd25CcmFuY2gocmVmZXJlbmNlQnJhbmNoKSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRjb25zdCBsaWJGbiA9IGdldEZuKGxpYik7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHlwZW9mIGxpYkZuID09PSBcImZ1bmN0aW9uXCIgP1xuXHRcdFx0XHRcdFx0XHRjYWxsRm4obGliRm4sIGxpYikgOlxuXHRcdFx0XHRcdFx0XHRkZWZhdWx0VmFsdWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIlVua25vd24gYnJhbmNoIHR5cGUuXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRpc0tub3duQnJhbmNoKGJyYW5jaDogSUJyYW5jaClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5yb3V0ZShcblx0XHRcdFx0YnJhbmNoLFxuXHRcdFx0XHRsaWIgPT4gbGliLmlzS25vd25CcmFuY2gsXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYnJhbmNoKSxcblx0XHRcdFx0ZmFsc2UpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBSZWZsZXhpdmUgbGlicmFyaWVzIG1heSBpbXBsZW1lbnQgdGhpcyBtZXRob2QgaW4gb3JkZXIgdG8gcHJvdmlkZVxuXHRcdCAqIHRoZSBzeXN0ZW0gd2l0aCBrbm93bGVkZ2Ugb2Ygd2hldGhlciBhIGJyYW5jaCBoYXMgYmVlbiBkaXNwb3NlZCxcblx0XHQgKiB3aGljaCBpdCB1c2VzIGZvciBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25zLiBJZiB0aGUgbGlicmFyeSBoYXMgbm9cblx0XHQgKiBtZWFucyBvZiBkb2luZyB0aGlzLCBpdCBtYXkgcmV0dXJuIFwibnVsbFwiLlxuXHRcdCAqL1xuXHRcdGlzQnJhbmNoRGlzcG9zZWQoYnJhbmNoOiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdGxpYiA9PiBsaWIuaXNCcmFuY2hEaXNwb3NlZCxcblx0XHRcdFx0KGZuLCBsaWIpID0+IGZuLmNhbGwobGliLCBicmFuY2gpLFxuXHRcdFx0XHRmYWxzZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJlZmxleGl2ZSBsaWJyYXJpZXMgdGhhdCBzdXBwb3J0IGlubGluZSB0YXJnZXQrY2hpbGRyZW4gY2xvc3VyZXNcblx0XHQgKiBtdXN0IHByb3ZpZGUgYW4gaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgbWV0aG9kLlxuXHRcdCAqL1xuXHRcdGdldENoaWxkcmVuKHRhcmdldDogSUJyYW5jaClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5yb3V0ZShcblx0XHRcdFx0dGFyZ2V0LFxuXHRcdFx0XHRsaWIgPT4gbGliLmdldENoaWxkcmVuLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIHRhcmdldCksXG5cdFx0XHRcdFtdKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0Z2V0TGVhZihsZWFmOiBhbnkpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMucm91dGUoXG5cdFx0XHRcdGxlYWYsXG5cdFx0XHRcdGxpYiA9PiBsaWIuZ2V0TGVhZixcblx0XHRcdFx0KGZuLCBsaWIpID0+IGZuLmNhbGwobGliLCBsZWFmKSxcblx0XHRcdFx0bnVsbCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGF0dGFjaEF0b20oXG5cdFx0XHRhdG9tOiBhbnksXG5cdFx0XHRicmFuY2g6IElCcmFuY2gsXG5cdFx0XHRyZWY6IFJlZilcblx0XHR7XG5cdFx0XHR0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdGxpYiA9PiBsaWIuYXR0YWNoQXRvbSxcblx0XHRcdFx0KGZuLCBsaWIpID0+IGZuLmNhbGwobGliLCBhdG9tLCBicmFuY2gsIHJlZikpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBcblx0XHQgKi9cblx0XHRkZXRhY2hBdG9tKGF0b206IGFueSwgYnJhbmNoOiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHRoaXMucm91dGUoXG5cdFx0XHRcdGJyYW5jaCxcblx0XHRcdFx0bGliID0+IGxpYi5kZXRhY2hBdG9tLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGF0b20sIGJyYW5jaCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKlxuXHRcdCAqL1xuXHRcdHN3YXBCcmFuY2hlcyhicmFuY2gxOiBJQnJhbmNoLCBicmFuY2gyOiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHRoaXMucm91dGUoXG5cdFx0XHRcdGJyYW5jaDEsXG5cdFx0XHRcdGxpYiA9PiBsaWIuc3dhcEJyYW5jaGVzLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGJyYW5jaDEsIGJyYW5jaDIpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICpcblx0XHQgKi9cblx0XHRyZXBsYWNlQnJhbmNoKGJyYW5jaDE6IElCcmFuY2gsIGJyYW5jaDI6IElCcmFuY2gpXG5cdFx0e1xuXHRcdFx0dGhpcy5yb3V0ZShcblx0XHRcdFx0YnJhbmNoMSxcblx0XHRcdFx0bGliID0+IGxpYi5yZXBsYWNlQnJhbmNoLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGJyYW5jaDEsIGJyYW5jaDIpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogXG5cdFx0ICovXG5cdFx0YXR0YWNoQXR0cmlidXRlKGJyYW5jaDogSUJyYW5jaCwga2V5OiBzdHJpbmcsIHZhbHVlOiBhbnkpXG5cdFx0e1xuXHRcdFx0dGhpcy5yb3V0ZShcblx0XHRcdFx0YnJhbmNoLFxuXHRcdFx0XHRsaWIgPT4gbGliLmF0dGFjaEF0dHJpYnV0ZSxcblx0XHRcdFx0KGZuLCBsaWIpID0+IGZuLmNhbGwobGliLCBicmFuY2gsIGtleSwgdmFsdWUpKTtcblx0XHR9XG5cdFx0XHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGRldGFjaEF0dHJpYnV0ZShicmFuY2g6IElCcmFuY2gsIGtleTogc3RyaW5nKVxuXHRcdHtcblx0XHRcdHRoaXMucm91dGUoXG5cdFx0XHRcdGJyYW5jaCxcblx0XHRcdFx0bGliID0+IGxpYi5kZXRhY2hBdHRyaWJ1dGUsXG5cdFx0XHRcdChmbiwgbGliKSA9PiBmbi5jYWxsKGxpYiwgYnJhbmNoLCBrZXkpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyB0aGF0IGNvbnRyaWJ1dGUgdG8gdGhlIGdsb2JhbCBvbigpIGZ1bmN0aW9uXG5cdFx0ICogbXVzdCBwcm92aWRlIGFuIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIG1ldGhvZC5cblx0XHQgKiBcblx0XHQgKiBMaWJyYXJpZXMgbXVzdCBpbXBsZW1lbnQgdGhpcyBmdW5jdGlvbiBpbiBvcmRlciB0byBwcm92aWRlIHRoZWlyIG93blxuXHRcdCAqIGhvb2tzIGludG8gdGhlIGdsb2JhbCByZWN1cnJlbnQgZnVuY3Rpb25zIChzdWNoIGFzIG9uKCksIG9ubHkoKSBhbmQgb25jZSgpKS5cblx0XHQgKiBcblx0XHQgKiBJZiB0aGUgbGlicmFyeSBkb2VzIG5vdCByZWNvZ25pemUgdGhlIHNlbGVjdG9yIHByb3ZpZGVkLCBpdCBzaG91bGRcblx0XHQgKiByZXR1cm4gZmFsc2UsIHNvIHRoYXQgdGhlIFJlZmxleCBlbmdpbmUgY2FuIGZpbmQgYW5vdGhlciBwbGFjZSB0b1xuXHRcdCAqIHBlcmZvcm0gdGhlIGF0dGFjaG1lbnQuIEluIG90aGVyIGNhc2VzLCBpdCBzaG91bGQgcmV0dXJuIHRydWUuXG5cdFx0ICovXG5cdFx0YXR0YWNoUmVjdXJyZW50KFxuXHRcdFx0a2luZDogUmVjdXJyZW50S2luZCxcblx0XHRcdHRhcmdldDogSUJyYW5jaCxcblx0XHRcdHNlbGVjdG9yOiBhbnksXG5cdFx0XHRjYWxsYmFjazogUmVjdXJyZW50Q2FsbGJhY2s8QXRvbT4sXG5cdFx0XHRyZXN0OiBhbnlbXSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5yb3V0ZShcblx0XHRcdFx0dGFyZ2V0LFxuXHRcdFx0XHRsaWIgPT4gbGliLmF0dGFjaFJlY3VycmVudCxcblx0XHRcdFx0KGZuLCBsaWIpID0+IGZuLmNhbGwobGliLCBraW5kLCB0YXJnZXQsIHNlbGVjdG9yLCBjYWxsYmFjaywgcmVzdCksXG5cdFx0XHRcdGZhbHNlKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyB0aGF0IGNvbnRyaWJ1dGUgdG8gdGhlIGdsb2JhbCBvZmYoKSBmdW5jdGlvblxuXHRcdCAqIG11c3QgcHJvdmlkZSBhbiBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBtZXRob2QuXG5cdFx0ICovXG5cdFx0ZGV0YWNoUmVjdXJyZW50KFxuXHRcdFx0YnJhbmNoOiBJQnJhbmNoLFxuXHRcdFx0c2VsZWN0b3I6IGFueSxcblx0XHRcdGNhbGxiYWNrOiBSZWN1cnJlbnRDYWxsYmFjazxBdG9tPilcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5yb3V0ZShcblx0XHRcdFx0YnJhbmNoLFxuXHRcdFx0XHRsaWIgPT4gbGliLmRldGFjaFJlY3VycmVudCxcblx0XHRcdFx0KGZuLCBsaWIpID0+IGZuLmNhbGwobGliLCBicmFuY2gsIHNlbGVjdG9yLCBjYWxsYmFjayksXG5cdFx0XHRcdGZhbHNlKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyBjYW4gaW1wbGVtZW50IHRoaXMgZnVuY3Rpb24gaW4gb3JkZXJcblx0XHQgKiB0byBjYXB0dXJlIHRoZSBmbG93IG9mIGJyYW5jaGVzIGJlaW5nIHBhc3NlZCBhc1xuXHRcdCAqIGF0b21zIHRvIG90aGVyIGJyYW5jaCBmdW5jdGlvbnMuXG5cdFx0ICovXG5cdFx0aGFuZGxlQnJhbmNoRnVuY3Rpb24oXG5cdFx0XHRicmFuY2g6IElCcmFuY2gsXG5cdFx0XHRicmFuY2hGbjogKC4uLmF0b21zOiBhbnlbXSkgPT4gSUJyYW5jaClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5yb3V0ZShcblx0XHRcdFx0YnJhbmNoLFxuXHRcdFx0XHRsaWIgPT4gbGliLmhhbmRsZUJyYW5jaEZ1bmN0aW9uLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGJyYW5jaCwgYnJhbmNoRm4pKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogUmVmbGV4aXZlIGxpYnJhcmllcyBjYW4gaW1wbGVtZW50IHRoaXMgZnVuY3Rpb24gaW4gb3JkZXIgdG8gcHJvY2Vzc1xuXHRcdCAqIGEgYnJhbmNoIGJlZm9yZSBpdCdzIHJldHVybmVkIGZyb20gYSBicmFuY2ggZnVuY3Rpb24uIFdoZW4gdGhpc1xuXHRcdCAqIGZ1bmN0aW9uIGlzIGltcGxlbWVudGVkLCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBicmFuY2ggZnVuY3Rpb25zXG5cdFx0ICogYXJlIHJlcGxhY2VkIHdpdGggdGhlIHJldHVybiB2YWx1ZSBvZiB0aGlzIGZ1bmN0aW9uLiBSZWZsZXhpdmUgbGlicmFyaWVzXG5cdFx0ICogdGhhdCByZXF1aXJlIHRoZSBzdGFuZGFyZCBiZWhhdmlvciBvZiByZXR1cm5pbmcgYnJhbmNoZXMgZnJvbSB0aGVcblx0XHQgKiBicmFuY2ggZnVuY3Rpb25zIHNob3VsZCByZXR1cm4gdGhlIGBicmFuY2hgIGFyZ3VtZW50IHRvIHRoaXMgZnVuY3Rpb25cblx0XHQgKiB2ZXJiYXRpbS5cblx0XHQgKi9cblx0XHRyZXR1cm5CcmFuY2goYnJhbmNoOiBJQnJhbmNoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLnJvdXRlKFxuXHRcdFx0XHRicmFuY2gsXG5cdFx0XHRcdGxpYiA9PiBsaWIucmV0dXJuQnJhbmNoLFxuXHRcdFx0XHQoZm4sIGxpYikgPT4gZm4uY2FsbChsaWIsIGJyYW5jaCksXG5cdFx0XHRcdGJyYW5jaClcblx0XHR9XG5cdH1cbn1cbiIsIlxubmFtZXNwYWNlIFJlZmxleC5Db3JlXG57XG5cdC8qKlxuXHQgKiBEZWFscyB3aXRoIHRlbXBvcmFyaWx5IHRyYWNraW5nIGluc2VydGVkIG1ldGFzLlxuXHQgKiBcblx0ICogT25lIHNpbmdsZSBicmFuY2ggY2FuIHBvdGVudGlhbGx5IGhhdmUgbXVsdGlwbGUgdHJhY2tlcnNcblx0ICogYXNzb2NpYXRlZCB3aXRoIGl0LCBpbiB0aGUgY2FzZSB3aGVuIHRoZSBicmFuY2ggaGFzIG11bHRpcGxlXG5cdCAqIGxheWVycyBvZiBzdHJlYW0gbWV0YXMgYXBwbGllZCB0byBpdC4gVGhlcmUgaXMgb25lIHRyYWNrZXIgaW5zdGFuY2Vcblx0ICogZm9yIGVhY2ggc2V0IG9mIFwic2libGluZ1wiIG1ldGFzLlxuXHQgKi9cblx0ZXhwb3J0IGNsYXNzIFRyYWNrZXJcblx0e1xuXHRcdC8qKiAqL1xuXHRcdGNvbnN0cnVjdG9yKFxuXHRcdFx0cHJpdmF0ZSByZWFkb25seSBicmFuY2g6IElCcmFuY2gsXG5cdFx0XHRyZWY6IFJlZiB8IExvY2F0b3IgPSBcImFwcGVuZFwiKVxuXHRcdHtcblx0XHRcdHRoaXMubGFzdCA9IHJlZjtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVXBkYXRlcyB0aGUgaW50ZXJuYWwgdHJhY2tpbmcgdmFsdWUgb2YgdGhlIFRyYWNrZXIuXG5cdFx0ICovXG5cdFx0dXBkYXRlKG9iamVjdDogUmVmIHwgTG9jYXRvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxhc3QgPSBvYmplY3Q7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgYSB2YWx1ZSB0aGF0IGNhbiBiZSB1c2VkIGluIGEgY2xpZW50IGxpYnJhcnkgYXMgdGhlXG5cdFx0ICogcmVmZXJlbmNlIHNpYmxpbmcgdmFsdWUgdG8gaW5kaWNhdGUgYW4gaW5zZXJ0aW9uIHBvaW50LlxuXHRcdCAqL1xuXHRcdGdldExhc3RIYXJkUmVmKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5sYXN0IGluc3RhbmNlb2YgTG9jYXRvciA/XG5cdFx0XHRcdHRoaXMucmVzb2x2ZVJlZigpIDpcblx0XHRcdFx0dGhpcy5sYXN0O1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBDbG9uZXMgYW5kIHJldHVybnMgdGhpcyBUcmFja2VyLiBVc2VkIHRvIGNyZWF0ZSBhIG5ld1xuXHRcdCAqIFRyYWNrZXIgaW5zdGFuY2UgZm9yIGEgbW9yZSBuZXN0ZWQgbGV2ZWwgb2Ygc3RyZWFtIG1ldGEuXG5cdFx0ICovXG5cdFx0ZGVyaXZlKClcblx0XHR7XG5cdFx0XHRjb25zdCBvdXQgPSBuZXcgVHJhY2tlcih0aGlzLmJyYW5jaCk7XG5cdFx0XHRvdXQubGFzdCA9IHRoaXMubGFzdDtcblx0XHRcdFxuXHRcdFx0aWYgKENvbnN0LmRlYnVnKVxuXHRcdFx0XHRvdXQudHJhY2tlckNvbnRhaW5lciA9IHRoaXM7XG5cdFx0XHRcblx0XHRcdHJldHVybiBvdXQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEVuc3VyZXMgdGhhdCB0aGUgc3BlY2lmaWVkIHJlZiBvYmplY3QgYWN0dWFsbHkgZXhpc3RzIGluIHRoZSBSZWZsZXhpdmVcblx0XHQgKiB0cmVlLCBhbmQgaWYgbm90LCBhIG5ldyBvYmplY3QgaXMgcmV0dXJuZWQgdGhhdCBjYW4gYmUgdXNlZCBhcyB0aGUgcmVmLlxuXHRcdCAqIEluIHRoZSBjYXNlIHdoZW4gbnVsbCBpcyByZXR1cm5lZCwgbnVsbCBzaG91bGQgYmUgdXNlZCBhcyB0aGUgcmVmLFxuXHRcdCAqIGluZGljYXRpbmcgdGhhdCB0aGUgaW5zZXJ0aW9uIHNob3VsZCBvY2N1ciBhdCB0aGUgZW5kIG9mIHRoZSBjaGlsZCBsaXN0LlxuXHRcdCAqL1xuXHRcdHByaXZhdGUgcmVzb2x2ZVJlZigpOiBSZWZcblx0XHR7XG5cdFx0XHRjb25zdCByZWYgPSB0aGlzLmxhc3Q7XG5cdFx0XHRcblx0XHRcdGlmIChyZWYgPT09IG51bGwpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIj9cIik7XG5cdFx0XHRcblx0XHRcdGlmIChyZWYgPT09IFwicHJlcGVuZFwiIHx8IHJlZiA9PT0gXCJhcHBlbmRcIilcblx0XHRcdFx0cmV0dXJuIHJlZjtcblx0XHRcdFxuXHRcdFx0Y29uc3QgcmVmTG9jYXRvciA9ICgoKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRpZiAocmVmIGluc3RhbmNlb2YgTG9jYXRvcilcblx0XHRcdFx0XHRyZXR1cm4gcmVmO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgcmVmTWV0YSA9IFxuXHRcdFx0XHRcdEJyYW5jaE1ldGEub2YocmVmKSB8fFxuXHRcdFx0XHRcdExlYWZNZXRhLm9mKHJlZik7XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXR1cm4gcmVmTWV0YSA/XG5cdFx0XHRcdFx0cmVmTWV0YS5sb2NhdG9yIDpcblx0XHRcdFx0XHRudWxsO1xuXHRcdFx0fSkoKTtcblx0XHRcdFxuXHRcdFx0aWYgKCFyZWZMb2NhdG9yKVxuXHRcdFx0XHRyZXR1cm4gXCJhcHBlbmRcIjtcblx0XHRcdFxuXHRcdFx0Y29uc3QgY2hpbGRyZW4gPSBSb3V0aW5nTGlicmFyeS50aGlzLmdldENoaWxkcmVuKHRoaXMuYnJhbmNoKTtcblx0XHRcdGxldCBwcmV2aW91czogSUJyYW5jaCB8IElMZWFmIHwgbnVsbCA9IG51bGw7XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgY2hpbGQgb2YgY2hpbGRyZW4pXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChyZWYgPT09IGNoaWxkKVxuXHRcdFx0XHRcdHJldHVybiByZWY7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBjdXJyZW50Q2hpbGRNZXRhID0gXG5cdFx0XHRcdFx0QnJhbmNoTWV0YS5vZihjaGlsZCkgfHxcblx0XHRcdFx0XHRMZWFmTWV0YS5vZihjaGlsZCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoY3VycmVudENoaWxkTWV0YSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdC8vIFRoZSBleHBsYW5hdGlvbiBvZiB0aGlzIGFsZ29yaXRobSBpcyB0aGF0IHdlJ3JlIHdhbGtpbmcgdGhyb3VnaFxuXHRcdFx0XHRcdC8vIHRoZSBkaXJlY3QgY2hpbGQgbWV0YXMgb2YgY29udGFpbmluZ0JyYW5jaC4gVGhlIGlkZWFsIGNhc2UgaXNcblx0XHRcdFx0XHQvLyB0aGF0IHRoZSBtZXRhIHRoYXQgd2FzIHByZXZpb3VzbHkgYmVpbmcgdXNlZCBhcyB0aGUgbG9jYXRvciBpc1xuXHRcdFx0XHRcdC8vIHN0aWxsIHByZXNlbnQgaW4gdGhlIGRvY3VtZW50LiBJbiB0aGlzIGNhc2UsIHRoZSByZWYgZG9lc24ndCBuZWVkXG5cdFx0XHRcdFx0Ly8gdG8gYmUgdXBkYXRlZCwgc28gaXQgY2FuIGp1c3QgYmUgcmV0dXJuZWQgdmVyYmF0aW0uIEhvd2V2ZXIsIFxuXHRcdFx0XHRcdC8vIGluIHRoZSBjYXNlIHdoZW4gdGhlIHJlZiBpcyBtaXNzaW5nLCB3ZSBuZWVkIHRvIHJldHVybiB0aGUgbmV4dFxuXHRcdFx0XHRcdC8vIG5ld2VzdCBtZXRhIHRoYXQgaXNuJ3QgbmV3ZXIgdGhhbiB0aGUgbG9jYXRvciBvZiB0aGUgb3JpZ2luYWxcblx0XHRcdFx0XHQvLyByZWYuXG5cdFx0XHRcdFx0Y29uc3QgY21wID0gY3VycmVudENoaWxkTWV0YS5sb2NhdG9yLmNvbXBhcmUocmVmTG9jYXRvcik7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKGNtcCA9PT0gQ29tcGFyZVJlc3VsdC5lcXVhbClcblx0XHRcdFx0XHRcdHJldHVybiBjaGlsZDtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHQvLyBUaGUgY3VycmVudCBjaGlsZCBtZXRhIGlzIG5ld2VyIHRoYW4gdGhlIHJlZiBtZXRhLiBUaGlzIG1lYW5zXG5cdFx0XHRcdFx0Ly8gdGhhdCB3ZSB3ZW50IHRvbyBmYXIsIHNvIHdlIHNob3VsZCByZXR1cm4gdGhlIHByZXZpb3VzIG1ldGEuXG5cdFx0XHRcdFx0Ly8gT3IsIGluIHRoZSBjYXNlIHdoZW4gd2UgaGF2ZW4ndCBoaXQgYSBtZXRhIHlldCwgd2UgbmVlZCB0b1xuXHRcdFx0XHRcdC8vIHJldHVybiB0aGUgY29uc3RhbnQgXCJwcmVwZW5kXCIgKGJlY2F1c2UgdGhlcmUncyBub3RoaW5nIHRvXG5cdFx0XHRcdFx0Ly8gcmVmZXIgdG8gaW4gdGhpcyBjYXNlKS5cblx0XHRcdFx0XHRpZiAoY21wID09PSBDb21wYXJlUmVzdWx0Lmxvd2VyKVxuXHRcdFx0XHRcdFx0cmV0dXJuIHByZXZpb3VzIHx8IFwicHJlcGVuZFwiO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRwcmV2aW91cyA9IGNoaWxkO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRyZXR1cm4gXCJhcHBlbmRcIjtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogU3RvcmVzIGEgcm9sbGluZyB2YWx1ZSB0aGF0IGluZGlyZWN0bHkgcmVmZXJzIHRvIHRoZSBsYXN0IG1ldGFcblx0XHQgKiB0aGF0IHdhcyBhcHBlbmRlZCB0byB0aGUgYnJhbmNoIHRoYXQgdGhpcyB0cmFja2VyIGlzIHRyYWNraW5nLlxuXHRcdCAqL1xuXHRcdHByaXZhdGUgbGFzdDogUmVmIHwgTG9jYXRvcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBAaW50ZXJuYWxcblx0XHQgKiBGb3IgZGVidWdnaW5nIG9ubHkuXG5cdFx0ICovXG5cdFx0cHJpdmF0ZSB0cmFja2VyQ29udGFpbmVyOiBUcmFja2VyIHwgdW5kZWZpbmVkO1xuXHR9XG59XG4iLCJcbm5hbWVzcGFjZSBSZWZsZXguQ29yZVxue1xuXHQvKipcblx0ICogXG5cdCAqL1xuXHRleHBvcnQgY2xhc3MgQXJyYXlTdHJlYW1NZXRhIGV4dGVuZHMgU3RyZWFtTWV0YVxuXHR7XG5cdFx0Y29uc3RydWN0b3IoXG5cdFx0XHRyZWFkb25seSBjb250YWluZXJNZXRhOiBDb250YWluZXJNZXRhLFxuXHRcdFx0cmVhZG9ubHkgcmVjdXJyZW50OiBSZWN1cnJlbnQpXG5cdFx0e1xuXHRcdFx0c3VwZXIoY29udGFpbmVyTWV0YSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFxuXHRcdCAqL1xuXHRcdGF0dGFjaChjb250YWluaW5nQnJhbmNoOiBJQnJhbmNoLCB0cmFja2VyOiBUcmFja2VyKVxuXHRcdHtcblx0XHRcdGNvbnN0IGxvY2FsVHJhY2tlciA9IHRyYWNrZXIuZGVyaXZlKCk7XG5cdFx0XHRsb2NhbFRyYWNrZXIudXBkYXRlKHRoaXMubG9jYXRvcik7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHJlYyA9IHRoaXMucmVjdXJyZW50O1xuXHRcdFx0Y29uc3QgYXJyYXlGb3JjZTogQXJyYXlGb3JjZTxhbnk+ID0gcmVjLnNlbGVjdG9yO1xuXHRcdFx0Y29uc3QgcmVzdEFyZ3MgPSByZWMudXNlclJlc3RBcmdzLnNsaWNlKCk7XG5cdFx0XHRcblx0XHRcdGZvciAobGV0IGkgPSAtMTsgKytpIDwgYXJyYXlGb3JjZS5sZW5ndGg7KVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBmbyA9IGFycmF5Rm9yY2VbaV07XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCBhdG9tcyA9IHJlYy51c2VyQ2FsbGJhY2soXG5cdFx0XHRcdFx0Zm8sXG5cdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHRpLFxuXHRcdFx0XHRcdC4uLnJlc3RBcmdzKTtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IG1ldGFzID0gQ29yZVV0aWwudHJhbnNsYXRlQXRvbXMoXG5cdFx0XHRcdFx0Y29udGFpbmluZ0JyYW5jaCxcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lck1ldGEsXG5cdFx0XHRcdFx0YXRvbXMpO1xuXHRcdFx0XHRcblx0XHRcdFx0Q29yZVV0aWwuYXBwbHlNZXRhcyhcblx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdHRoaXMuY29udGFpbmVyTWV0YSxcblx0XHRcdFx0XHRtZXRhcyxcblx0XHRcdFx0XHRsb2NhbFRyYWNrZXIpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBmaW5kTWV0YSA9IChwb3NpdGlvbjogbnVtYmVyKSA9PiBcblx0XHRcdHtcdFxuXHRcdFx0XHRsZXQgcG9zID0gcG9zaXRpb247XG5cdFx0XHRcdGNvbnN0IGl0ZXJhdG9yID0gUm91dGluZ0xpYnJhcnkudGhpcy5nZXRDaGlsZHJlbihjb250YWluaW5nQnJhbmNoKTtcblx0XHRcdFx0Zm9yIChjb25zdCBpdGVtIG9mIGl0ZXJhdG9yKSBcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IE1ldGEgPSBCcmFuY2hNZXRhLm9mKGl0ZW0pO1xuXHRcdFx0XHRcdGlmIChNZXRhICYmIFxuXHRcdFx0XHRcdFx0TWV0YS5sb2NhdG9yLmNvbXBhcmUodGhpcy5sb2NhdG9yKSA9PT0gQ29tcGFyZVJlc3VsdC5sb3dlciAmJlxuXHRcdFx0XHRcdFx0LS1wb3MgPT09IC0xKSBcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRyZXR1cm4gTWV0YTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdEZvcmNlVXRpbC5hdHRhY2hGb3JjZShhcnJheUZvcmNlLnJvb3QuY2hhbmdlZCwgKGl0ZW06IGFueSwgcG9zaXRpb246IG51bWJlcikgPT4gXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGludGVybmFsUG9zID0gYXJyYXlGb3JjZS5wb3NpdGlvbnMuaW5kZXhPZihwb3NpdGlvbik7XG5cdFx0XHRcdGlmIChwb3NpdGlvbiA+IC0xKSBcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IG1ldGEgPSBmaW5kTWV0YShpbnRlcm5hbFBvcyk7XG5cdFx0XHRcdFx0aWYgKG1ldGEpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y29uc3QgYXRvbXMgPSByZWMudXNlckNhbGxiYWNrKGl0ZW0sIGNvbnRhaW5pbmdCcmFuY2gsIHBvc2l0aW9uKTtcblx0XHRcdFx0XHRcdGNvbnN0IG1ldGFzID0gQ29yZVV0aWwudHJhbnNsYXRlQXRvbXMoXG5cdFx0XHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0XHRcdHRoaXMuY29udGFpbmVyTWV0YSxcblx0XHRcdFx0XHRcdFx0YXRvbXMpWzBdIGFzIEJyYW5jaE1ldGE7XG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0bWV0YXMubG9jYXRvci5zZXRDb250YWluZXIodGhpcy5jb250YWluZXJNZXRhLmxvY2F0b3IpO1xuXHRcdFx0XHRcdFx0Um91dGluZ0xpYnJhcnkudGhpcy5yZXBsYWNlQnJhbmNoKG1ldGEuYnJhbmNoLCBtZXRhcy5icmFuY2gpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdEZvcmNlVXRpbC5hdHRhY2hGb3JjZShhcnJheUZvcmNlLmFkZGVkLCAoaXRlbTogYW55LCBwb3NpdGlvbjogbnVtYmVyKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBhdG9tcyA9IHJlYy51c2VyQ2FsbGJhY2soaXRlbSwgY29udGFpbmluZ0JyYW5jaCwgcG9zaXRpb24pO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3QgbWV0YXMgPSBDb3JlVXRpbC50cmFuc2xhdGVBdG9tcyhcblx0XHRcdFx0XHRjb250YWluaW5nQnJhbmNoLFxuXHRcdFx0XHRcdHRoaXMuY29udGFpbmVyTWV0YSxcblx0XHRcdFx0XHRhdG9tcyk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdGxldCB0cmFja2VyID0gbG9jYWxUcmFja2VyO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKHBvc2l0aW9uIDwgYXJyYXlGb3JjZS5sZW5ndGgpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBtZXRhID0gZmluZE1ldGEocG9zaXRpb24gLSAxKTtcblx0XHRcdFx0XHRpZiAobWV0YSlcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHR0cmFja2VyID0gbG9jYWxUcmFja2VyLmRlcml2ZSgpO1xuXHRcdFx0XHRcdFx0dHJhY2tlci51cGRhdGUobWV0YS5icmFuY2gpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRcdFxuXHRcdFx0XHRDb3JlVXRpbC5hcHBseU1ldGFzKFxuXHRcdFx0XHRcdGNvbnRhaW5pbmdCcmFuY2gsXG5cdFx0XHRcdFx0dGhpcy5jb250YWluZXJNZXRhLFxuXHRcdFx0XHRcdG1ldGFzLFxuXHRcdFx0XHRcdHRyYWNrZXIpO1xuXHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdEZvcmNlVXRpbC5hdHRhY2hGb3JjZShhcnJheUZvcmNlLnJlbW92ZWQsIChpdGVtOiBhbnksIHBvc2l0aW9uOiBudW1iZXIpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IG1ldGEgPSBmaW5kTWV0YShwb3NpdGlvbik7XG5cdFx0XHRcdGlmIChtZXRhKVxuXHRcdFx0XHRcdENvcmVVdGlsLnVuYXBwbHlNZXRhcyhjb250YWluaW5nQnJhbmNoLCBbbWV0YV0pO1xuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdEZvcmNlVXRpbC5hdHRhY2hGb3JjZShhcnJheUZvcmNlLm1vdmVkLCAoaXRlbTE6IGFueSwgaXRlbTI6IGFueSwgaW5kZXgxOiBudW1iZXIsIGluZGV4MjogbnVtYmVyKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBzb3VyY2UgPSBmaW5kTWV0YShpbmRleDEpO1xuXHRcdFx0XHRjb25zdCB0YXJnZXQgPSBmaW5kTWV0YShpbmRleDIpO1xuXG5cdFx0XHRcdGlmIChzb3VyY2UgJiYgdGFyZ2V0KVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3Qgc3JjTG9jVmFsID0gc291cmNlLmxvY2F0b3IuZ2V0TGFzdExvY2F0b3JWYWx1ZSgpO1xuXHRcdFx0XHRcdGNvbnN0IHRhcmdldExvY1ZhbCA9IHRhcmdldC5sb2NhdG9yLmdldExhc3RMb2NhdG9yVmFsdWUoKTtcblx0XHRcdFx0XHRzb3VyY2UubG9jYXRvci5zZXRMYXN0TG9jYXRvclZhbHVlKHRhcmdldExvY1ZhbCk7XG5cdFx0XHRcdFx0dGFyZ2V0LmxvY2F0b3Iuc2V0TGFzdExvY2F0b3JWYWx1ZShzcmNMb2NWYWwpO1xuXHRcdFx0XHRcdFJvdXRpbmdMaWJyYXJ5LnRoaXMuc3dhcEJyYW5jaGVzKHNvdXJjZS5icmFuY2gsIHRhcmdldC5icmFuY2gpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Rm9yY2VVdGlsLmF0dGFjaEZvcmNlKGFycmF5Rm9yY2UudGFpbENoYW5nZWQsIChpdGVtOiBhbnksIHBvc2l0aW9uOiBudW1iZXIpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHNvdXJjZSA9IGZpbmRNZXRhKHBvc2l0aW9uKTtcblx0XHRcdFx0aWYgKHNvdXJjZSlcblx0XHRcdFx0XHRsb2NhbFRyYWNrZXIudXBkYXRlKHNvdXJjZS5icmFuY2gpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG59XG4iXX0=