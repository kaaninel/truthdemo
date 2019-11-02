"use strict";
var Backer;
(function (Backer) {
    var TruthTalk;
    (function (TruthTalk) {
        class CursorSet {
            constructor(...cursors) {
                this.cursors = new Set(cursors);
            }
            snapshot() {
                return Array.from(this.cursors);
            }
            clone() {
                return new CursorSet(...this.snapshot());
            }
            filter(fn) {
                this.cursors = new Set(this.snapshot().filter(x => fn(x)));
            }
            query(ast) {
                if (ast instanceof TruthTalk.Branch)
                    this.branch(ast);
                else
                    this.leaf(ast);
            }
            branch(branch) {
                switch (branch.op) {
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
            leaf(leaf) {
                switch (leaf.op) {
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
            contents() {
                this.cursors = new Set(this.snapshot().flatMap(x => x.contents).filter((x) => !!x));
            }
            roots() {
                this.cursors = new Set(this.snapshot().map(x => {
                    while (x.parent)
                        x = x.parent;
                    return x;
                }).filter((x) => !!x));
            }
            containers() {
                this.cursors = new Set(this.snapshot().map(x => x.parent).filter((x) => !!x));
            }
            not(branch) {
                const instance = this.clone();
                for (const query of branch.children)
                    instance.query(query);
                const snap = instance.snapshot();
                this.filter(x => !snap.includes(x));
            }
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
            slice(leaf) {
                let { start, end } = leaf;
                const snap = this.snapshot();
                if (end && end < 1)
                    end = start + Math.round(end * snap.length);
                this.cursors = new Set(snap.slice(start, end));
            }
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
            is(PLA, not = false) {
                const instance = this.clone();
                return instance.filter(x => {
                    const condition = x[Backer.typeOf].is(PLA[Backer.typeOf]) || x[Backer.typeOf].parallelRoots.includes(PLA[Backer.typeOf]);
                    return not ? !condition : condition;
                });
            }
            sort(leaf) {
                const PLAs = leaf.contentTypes.filter((x) => !!x).reverse();
                const snap = this.snapshot();
                for (const PLA of PLAs)
                    snap.sort((a, b) => {
                        const p1 = a.get(PLA);
                        const p2 = b.get(PLA);
                        const v1 = p1 ? p1[Backer.value] || 0 : 0;
                        const v2 = p2 ? p2[Backer.value] || 0 : 0;
                        return v2 - v1;
                    });
                this.cursors = new Set(snap);
            }
        }
        TruthTalk.CursorSet = CursorSet;
    })(TruthTalk = Backer.TruthTalk || (Backer.TruthTalk = {}));
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    var TruthTalk;
    (function (TruthTalk) {
        function Query(...args) {
            const ast = tt(...args);
            const cursors = new TruthTalk.CursorSet(...Object.values(Backer.DataGraph));
            cursors.query(ast);
            return cursors.snapshot();
        }
        TruthTalk.Query = Query;
    })(TruthTalk = Backer.TruthTalk || (Backer.TruthTalk = {}));
})(Backer || (Backer = {}));
var Backer;
(function (Backer) {
    var TruthTalk;
    (function (TruthTalk) {
        var Util;
        (function (Util) {
            function filter(obj, predicate) {
                const result = {};
                for (const key in obj)
                    if (predicate(obj[key], key, obj))
                        result[key] = obj[key];
                return result;
            }
            Util.filter = filter;
        })(Util = TruthTalk.Util || (TruthTalk.Util = {}));
    })(TruthTalk = Backer.TruthTalk || (Backer.TruthTalk = {}));
})(Backer || (Backer = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1dGh0YWxrLWVuZ2luZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9DdXJzb3JTZXQudHMiLCIuLi9zb3VyY2UvRW5naW5lLnRzIiwiLi4vc291cmNlL1V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLElBQVUsTUFBTSxDQWlPZjtBQWpPRCxXQUFVLE1BQU07SUFBQyxJQUFBLFNBQVMsQ0FpT3pCO0lBak9nQixXQUFBLFNBQVM7UUFFekIsTUFBYSxTQUFTO1lBSXJCLFlBQVksR0FBRyxPQUFxQjtnQkFFbkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNqQyxDQUFDO1lBRUQsUUFBUTtnQkFFUCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2pDLENBQUM7WUFFRCxLQUFLO2dCQUVKLE9BQU8sSUFBSSxTQUFTLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUMxQyxDQUFDO1lBRUQsTUFBTSxDQUFDLEVBQThCO2dCQUVwQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVELENBQUM7WUFFRCxLQUFLLENBQUMsR0FBa0I7Z0JBRXZCLElBQUksR0FBRyxZQUFZLFVBQUEsTUFBTTtvQkFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzs7b0JBRWpCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDakIsQ0FBQztZQUVELE1BQU0sQ0FBQyxNQUFjO2dCQUVwQixRQUFRLE1BQU0sQ0FBQyxFQUFFLEVBQ2pCO29CQUNDLEtBQUssVUFBQSxRQUFRLENBQUMsRUFBRSxD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QUFNLENBQUM7WUFDZixDQUFDO1lBVGUsV0FBTSxTQVNyQixDQUFBO1FBQ0YsQ0FBQyxFQVowQixJQUFJLEdBQUosY0FBSSxLQUFKLGNBQUksUUFZOUI7SUFBRCxDQUFDLEVBWmdCLFNBQVMsR0FBVCxnQkFBUyxLQUFULGdCQUFTLFFBWXpCO0FBQUQsQ0FBQyxFQVpTLE1BQU0sS0FBTixNQUFNLFFBWWYiLCJzb3VyY2VzQ29udGVudCI6WyJcbm5hbWVzcGFjZSBCYWNrZXIuVHJ1dGhUYWxrXG57XG5cdGV4cG9ydCBjbGFzcyBDdXJzb3JTZXRcblx0e1xuXHRcdGN1cnNvcnM6IFNldDxPYmplY3RUeXBlPjtcblx0XHRcblx0XHRjb25zdHJ1Y3RvciguLi5jdXJzb3JzOiBPYmplY3RUeXBlW10pXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldChjdXJzb3JzKTtcblx0XHR9XG5cdFx0XG5cdFx0c25hcHNob3QoKVxuXHRcdHtcblx0XHRcdHJldHVybiBBcnJheS5mcm9tKHRoaXMuY3Vyc29ycyk7XG5cdFx0fVxuXHRcdFxuXHRcdGNsb25lKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IEN1cnNvclNldCguLi50aGlzLnNuYXBzaG90KCkpO1xuXHRcdH1cblx0XHRcblx0XHRmaWx0ZXIoZm46ICh2OiBPYmplY3RUeXBlKSA9PiBib29sZWFuKVxuXHRcdHtcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQodGhpcy5zbmFwc2hvdCgpLmZpbHRlcih4ID0+IGZuKHgpKSk7XG5cdFx0fVxuXHRcdFxuXHRcdHF1ZXJ5KGFzdDogQnJhbmNoIHwgTGVhZikgXG5cdFx0e1xuXHRcdFx0aWYgKGFzdCBpbnN0YW5jZW9mIEJyYW5jaClcblx0XHRcdFx0dGhpcy5icmFuY2goYXN0KTtcblx0XHRcdGVsc2UgXG5cdFx0XHRcdHRoaXMubGVhZihhc3QpO1xuXHRcdH1cblx0XHRcblx0XHRicmFuY2goYnJhbmNoOiBCcmFuY2gpIFxuXHRcdHtcblx0XHRcdHN3aXRjaCAoYnJhbmNoLm9wKVxuXHRcdFx0e1xuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLmlzOlxuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLnF1ZXJ5OlxuXHRcdFx0XHRcdGZvciAoY29uc3QgcXVlcnkgb2YgYnJhbmNoLmNoaWxkcmVuKVxuXHRcdFx0XHRcdFx0dGhpcy5xdWVyeShxdWVyeSk7XHRcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBCcmFuY2hPcC5ub3Q6IFxuXHRcdFx0XHRcdHRoaXMubm90KGJyYW5jaCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgQnJhbmNoT3Aub3I6XG5cdFx0XHRcdFx0dGhpcy5vcihicmFuY2gpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIEJyYW5jaE9wLmhhczpcblx0XHRcdFx0XHR0aGlzLmNvbnRlbnRzKCk7XG5cdFx0XHRcdFx0Zm9yIChjb25zdCBxdWVyeSBvZiBicmFuY2guY2hpbGRyZW4pXG5cdFx0XHRcdFx0XHR0aGlzLnF1ZXJ5KHF1ZXJ5KTtcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lcnMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0bGVhZihsZWFmOiBMZWFmKSBcblx0XHR7XG5cdFx0XHRzd2l0Y2ggKGxlYWYub3ApXG5cdFx0XHR7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLnN1cnJvZ2F0ZTpcblx0XHRcdFx0XHR0aGlzLmZpbHRlcih4ID0+IHhbdHlwZU9mXS5pcygoPFBMQVR5cGVzPmxlYWYpW3R5cGVPZl0pIHx8IHhbdHlwZU9mXS5wYXJhbGxlbFJvb3RzLmluY2x1ZGVzKCg8UExBVHlwZXM+bGVhZilbdHlwZU9mXSkpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5jb250ZW50czpcblx0XHRcdFx0XHR0aGlzLmNvbnRlbnRzKCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgTGVhZk9wLnJvb3RzOlxuXHRcdFx0XHRcdHRoaXMucm9vdHMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3AuY29udGFpbmVyczpcblx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lcnMoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3AuYWxpYXNlZDpcblx0XHRcdFx0XHR0aGlzLmZpbHRlcih4ID0+IHhbdmFsdWVdICE9PSBudWxsKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3AubGVhdmVzOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHggPT4geFt2YWx1ZV0gPT09IG51bGwpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5mcmVzaDpcblx0XHRcdFx0XHR0aGlzLmZpbHRlcih4ID0+IHhbdHlwZU9mXS5pc0ZyZXNoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBQcmVkaWNhdGVPcC5lcXVhbHM6XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoeCA9PiB4W3ZhbHVlXSA9PSAoPExlYXZlcy5QcmVkaWNhdGU+bGVhZikub3BlcmFuZCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgUHJlZGljYXRlT3AuZ3JlYXRlclRoYW46XG5cdFx0XHRcdFx0dGhpcy5maWx0ZXIoeCA9PiAoeFt2YWx1ZV0gfHzCoDApID4gKDxMZWF2ZXMuUHJlZGljYXRlPmxlYWYpLm9wZXJhbmQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLmxlc3NUaGFuOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHggPT4gKHhbdmFsdWVdIHx8IDApIDwgKDxMZWF2ZXMuUHJlZGljYXRlPmxlYWYpLm9wZXJhbmQpO1xuXHRcdFx0XHRcdGJyZWFrO1x0XG5cdFx0XHRcdGNhc2UgUHJlZGljYXRlT3Auc3RhcnRzV2l0aDpcblx0XHRcdFx0XHR0aGlzLmZpbHRlcih4ID0+IHhbdmFsdWVdID09IG51bGwgPyBmYWxzZSA6IHhbdmFsdWVdIS50b1N0cmluZygpLnN0YXJ0c1dpdGgoPHN0cmluZz4oPExlYXZlcy5QcmVkaWNhdGU+bGVhZikub3BlcmFuZCkpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFByZWRpY2F0ZU9wLmVuZHNXaXRoOlxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyKHggPT4geFt2YWx1ZV0gPT0gbnVsbCA/IGZhbHNlIDogeFt2YWx1ZV0hLnRvU3RyaW5nKCkuZW5kc1dpdGgoPHN0cmluZz4oPExlYXZlcy5QcmVkaWNhdGU+bGVhZikub3BlcmFuZCkpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5zbGljZTpcblx0XHRcdFx0XHR0aGlzLnNsaWNlKGxlYWYpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5vY2N1cmVuY2VzOlxuXHRcdFx0XHRcdHRoaXMub2NjdXJlbmNlcyhsZWFmKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBMZWFmT3Auc29ydDogXG5cdFx0XHRcdFx0dGhpcy5zb3J0KGxlYWYpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIExlYWZPcC5yZXZlcnNlOlxuXHRcdFx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQodGhpcy5zbmFwc2hvdCgpLnJldmVyc2UoKSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdGNvbnRlbnRzKClcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KHRoaXMuc25hcHNob3QoKS5mbGF0TWFwKHggPT4geC5jb250ZW50cykuZmlsdGVyKCh4KTogeCBpcyBPYmplY3RUeXBlID0+ICEheCkpO1xuXHRcdH1cblx0XHRcblx0XHRyb290cygpXG5cdFx0e1xuXHRcdFx0dGhpcy5jdXJzb3JzID0gbmV3IFNldCh0aGlzLnNuYXBzaG90KCkubWFwKHggPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdHdoaWxlICh4LnBhcmVudCkgXG5cdFx0XHRcdFx0XHR4ID0geC5wYXJlbnQ7XG5cdFx0XHRcdFx0cmV0dXJuIHg7XHRcdFx0XHRcblx0XHRcdFx0fSkuZmlsdGVyKCh4KTogeCBpcyBPYmplY3RUeXBlID0+ICEheCkpO1xuXHRcdH1cblx0XHRcblx0XHRjb250YWluZXJzKClcblx0XHR7XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KHRoaXMuc25hcHNob3QoKS5tYXAoeCA9PiB4LnBhcmVudCkuZmlsdGVyKCh4KTogeCBpcyBPYmplY3RUeXBlID0+ICEheCkpO1xuXHRcdH1cblx0XHRcblx0XHRub3QoYnJhbmNoOiBCcmFuY2gpXG5cdFx0e1xuXHRcdFx0Y29uc3QgaW5zdGFuY2UgPSB0aGlzLmNsb25lKCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IHF1ZXJ5IG9mIGJyYW5jaC5jaGlsZHJlbilcblx0XHRcdFx0aW5zdGFuY2UucXVlcnkocXVlcnkpO1xuXHRcdFx0XG5cdFx0XHRjb25zdCBzbmFwID0gaW5zdGFuY2Uuc25hcHNob3QoKTtcblx0XHRcdHRoaXMuZmlsdGVyKHggPT4gIXNuYXAuaW5jbHVkZXMoeCkpO1xuXHRcdH1cblx0XHRcblx0XHRvcihicmFuY2g6IEJyYW5jaClcblx0XHR7XG5cdFx0XHRjb25zdCBpbnN0YW5jZXMgPSBbXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBxdWVyeSBvZiBicmFuY2guY2hpbGRyZW4pXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGluc3RhbmNlID0gdGhpcy5jbG9uZSgpO1x0XG5cdFx0XHRcdGluc3RhbmNlLnF1ZXJ5KHF1ZXJ5KTtcblx0XHRcdFx0aW5zdGFuY2VzLnB1c2goaW5zdGFuY2UpO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRjb25zdCBzbmFwID0gaW5zdGFuY2VzLmZsYXQoKTtcblx0XHRcdHRoaXMuZmlsdGVyKHggPT4gc25hcC5pbmNsdWRlcyh4KSk7XG5cdFx0fVxuXHRcdFxuXHRcdHNsaWNlKGxlYWY6IExlYWYpXG5cdFx0e1xuXHRcdFx0bGV0IHtcblx0XHRcdFx0c3RhcnQsXG5cdFx0XHRcdGVuZFxuXHRcdFx0fcKgPSA8TGVhdmVzLlNsaWNlPmxlYWY7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHNuYXAgPSB0aGlzLnNuYXBzaG90KCk7XG5cdFx0XHRpZiAoZW5kICYmIGVuZCA8IDEpIGVuZCA9IHN0YXJ0ICsgTWF0aC5yb3VuZChlbmQgKiBzbmFwLmxlbmd0aCk7XG5cdFx0XHRcblx0XHRcdHRoaXMuY3Vyc29ycyA9IG5ldyBTZXQoc25hcC5zbGljZShzdGFydCwgZW5kKSk7XG5cdFx0fVxuXHRcdFxuXHRcdG9jY3VyZW5jZXMobGVhZjogTGVhZilcblx0XHR7XG5cdFx0XHRsZXQge1xuXHRcdFx0XHRtaW4sXG5cdFx0XHRcdG1heFxuXHRcdFx0fcKgPSA8TGVhdmVzLk9jY3VyZW5jZXM+bGVhZjtcblx0XHRcdFxuXHRcdFx0aWYgKCFtYXgpIG1heCA9IG1pbjtcblxuXHRcdFx0Y29uc3QgdmFsdWVNYXA6IFJlY29yZDxzdHJpbmcsIE9iamVjdFR5cGVbXT4gPSB7fTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBpdGVtIG9mIHRoaXMuY3Vyc29ycylcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdmFsID0gSlNPTi5zdHJpbmdpZnkoaXRlbVt2YWx1ZV0pO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKCF2YWx1ZU1hcC5oYXNPd25Qcm9wZXJ0eSh2YWwpKVxuXHRcdFx0XHRcdHZhbHVlTWFwW3ZhbF0gPSBbXTtcblx0XHRcdFx0XHRcblx0XHRcdFx0dmFsdWVNYXBbdmFsXS5wdXNoKGl0ZW0pO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KE9iamVjdC52YWx1ZXModmFsdWVNYXApLmZpbHRlcih4ID0+IHgubGVuZ3RoID49IG1pbiAmJiB4Lmxlbmd0aCA8PSBtYXgpLmZsYXQoKSk7XG5cdFx0fVxuXHRcdFxuXHRcdGlzKFBMQTogUExBVHlwZXMsIG5vdCA9IGZhbHNlKVxuXHRcdHtcblx0XHRcdGNvbnN0IGluc3RhbmNlID0gdGhpcy5jbG9uZSgpO1xuXHRcdFx0cmV0dXJuIGluc3RhbmNlLmZpbHRlcih4ID0+IFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgY29uZGl0aW9uID0geFt0eXBlT2ZdLmlzKFBMQVt0eXBlT2ZdKSB8fCB4W3R5cGVPZl0ucGFyYWxsZWxSb290cy5pbmNsdWRlcyhQTEFbdHlwZU9mXSk7XG5cdFx0XHRcdFx0cmV0dXJuIG5vdCA/ICFjb25kaXRpb24gOiBjb25kaXRpb247XG5cdFx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHRzb3J0KGxlYWY6IExlYWYpXG5cdFx0e1xuXHRcdFx0Y29uc3QgUExBcyA9ICg8UExBQW55W10+KDxMZWF2ZXMuU29ydD5sZWFmKS5jb250ZW50VHlwZXMpLmZpbHRlcigoeCkgPT4gISF4KS5yZXZlcnNlKCk7XG5cdFx0XHRcblx0XHRcdGNvbnN0IHNuYXAgPSB0aGlzLnNuYXBzaG90KCk7XG5cdFx0XHRmb3IgKGNvbnN0IFBMQSBvZiBQTEFzKVxuXHRcdFx0XHRzbmFwLnNvcnQoKGEsIGIpID0+IFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgcDEgPSBhLmdldChQTEEpO1xuXHRcdFx0XHRcdGNvbnN0IHAyID0gYi5nZXQoUExBKTtcblx0XHRcdFx0XHRjb25zdCB2MTogbnVtYmVyID0gcDEgPyA8YW55PnAxW3ZhbHVlXSB8fCAwOiAwO1xuXHRcdFx0XHRcdGNvbnN0IHYyOiBudW1iZXIgPSBwMiA/IDxhbnk+cDJbdmFsdWVdIHx8IDA6IDA7XG5cdFx0XHRcdFx0cmV0dXJuIHYyIC0gdjE7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHR0aGlzLmN1cnNvcnMgPSBuZXcgU2V0KHNuYXApO1xuXHRcdH1cblx0XHRcblx0fVxufSAiLCJcbm5hbWVzcGFjZSBCYWNrZXIuVHJ1dGhUYWxrXG57XHRcblx0ZXhwb3J0IGZ1bmN0aW9uIFF1ZXJ5KC4uLmFyZ3M6IGFueVtdKVxuXHR7XG5cdFx0Y29uc3QgYXN0ID0gdHQoLi4uYXJncyk7XG5cdFx0Y29uc3QgY3Vyc29ycyA9IG5ldyBDdXJzb3JTZXQoLi4uT2JqZWN0LnZhbHVlcyhEYXRhR3JhcGgpKTtcblx0XHRcblx0XHRjdXJzb3JzLnF1ZXJ5KGFzdCk7XG5cdFx0XG5cdFx0cmV0dXJuIGN1cnNvcnMuc25hcHNob3QoKTtcblx0fVxufVxuIiwiXG5uYW1lc3BhY2UgQmFja2VyLlRydXRoVGFsay5VdGlsXG57XG5cdGV4cG9ydCBmdW5jdGlvbiBmaWx0ZXIob2JqOiBhbnksIHByZWRpY2F0ZTogKHZhbHVlOiBhbnksIGtleTogc3RyaW5nLCBvYmo6IGFueSkgPT4gYm9vbGVhbilcblx0e1xuXHRcdGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuXHRcdFxuXHRcdGZvciAoY29uc3Qga2V5IGluIG9iailcblx0XHRcdGlmIChwcmVkaWNhdGUob2JqW2tleV0sIGtleSwgb2JqKSlcblx0XHRcdFx0cmVzdWx0W2tleV0gPSBvYmpba2V5XTtcblx0XHRcdFx0XG5cdFx0cmV0dXJuIHJlc3VsdDtcdFx0XG5cdH1cbn0iXX0=