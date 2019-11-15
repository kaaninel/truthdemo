declare namespace Demo {
    const TruthTypes: Truth.Type[];
    class Text {
        static Backer: string;
        static get(query: string): string;
        static get Code(): string;
        static get Query(): string;
        static get Pattern(): string;
    }
    function Calculate(): Promise<Backer.Surrogate<string>[] | undefined>;
}
//# sourceMappingURL=demo.d.ts.map