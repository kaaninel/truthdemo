/// <reference types="node" />
declare namespace Truth {
    /**
     * Asynchronously reads a truth document, and all documents
     * it references from the specified file system or HTTP(s) path.
     * File system paths are only supported if this code is running
     * within a Node.js-compatible environment.
     *
     * @returns A reference to the document read, or an Error.
     */
    function read(truthFilePathOrUri: string): Promise<Error | Document>;
    /**
     * Parses the specified truth content into a new Truth program.
     *
     * @returns A reference to the parsed document.
     */
    function parse(truthContent: string): Promise<Document>;
}
declare namespace Truth {
    /**
     * @internal
     * A Map of the generic key and value types.
     * Supports keys that refer to multiple values.
     */
    class MultiMap<TKey, TVal> {
        /** */
        [Symbol.iterator](): Generator<[TKey, TVal[]], void, unknown>;
        /** */
        entries(): IterableIterator<[TKey, TVal[]]>;
        /** */
        get(key: TKey): TVal[] | undefined;
        /** */
        has(key: TKey, value?: TVal): boolean;
        /** */
        add(key: TKey, value: TVal): this;
        /** */
        delete(key: TKey, value?: TVal): boolean;
        /** */
        values(): IterableIterator<TVal[]>;
        /** */
        private map;
    }
}
declare namespace Truth {
    const NodeFs: typeof import("fs");
    /**
     * @internal
     * Exposes the "fs" module used by the compiler,
     * as well as the ability to change the module used
     * with a custom implementation.
     */
    export class Fs {
        /**
         * Assigns a new implementation of the node "fs" module.
         */
        static override(module: typeof NodeFs): void;
        /** */
        static get module(): typeof import("fs");
        /** */
        private static _module;
    }
    export {};
}
declare namespace Truth {
    /**
     * @internal
     * A class that provides browser-style fetch functionality,
     * but with the ability to change this functions behavior
     * with a custom implementation.
     */
    class Fetch {
        /**
         *
         */
        static exec(url: string): Promise<string | Error>;
    }
    /**
     *
     */
    class FetchError extends Error {
        readonly statusCode: number;
        readonly statusText: string;
        constructor(statusCode: number, statusText: string);
    }
}
declare namespace Truth {
    /**
     * A class that encapsulates string hashing functionality.
     */
    const Hash: {
        /** Stores the constant number of characters in a returned hash. */
        readonly length: 8;
        /**
         * Calculates a hash code from the specified string.
         */
        calculate(text: string): string;
    };
}
declare namespace Truth {
    /**
     * A class that provides various higher-order functions
     * across data structures.
     */
    abstract class HigherOrder {
        /**
         * @returns A readonly copy of the specified array, set, or list.
         */
        static copy<T>(array: readonly T[]): readonly T[];
        static copy<T>(set: ReadonlySet<T>): ReadonlySet<T>;
        static copy<K, V>(map: ReadonlyMap<K, V>): ReadonlyMap<K, V>;
        private constructor();
    }
}
declare namespace Truth {
    /**
     * Utility class for performing basic guarding.
     */
    export class Not {
        /**
         * @returns The argument as specified, but throws an
         * exception in the case when it's strictly equal to null.
         */
        static null<T>(param: T): NotNull<T>;
        /**
         * @returns The argument as specified, but throws an
         * exception in the case when it's strictly equal to undefined.
         */
        static undefined<T>(param: T): NotUndefined<T>;
        /**
         * @returns The argument as specified, but throws an
         * exception in the case when it's null or undefined.
         */
        static nullable<T>(param: T): NotNull<T> | NotUndefined<T>;
    }
    type NotNull<T> = T extends null ? never : T;
    type NotUndefined<T> = T extends undefined ? never : T;
    export {};
}
declare namespace Truth {
    /**
     * A general parsing utility class that provides consumption
     * methods that operate over a given input.
     */
    class Parser {
        /**
         * Constructs a new Parser object that operates over
         * the specified input string, optionally starting at the
         * specified position.
         */
        constructor(input: string);
        /**
         * Attempts to read the specified token immediately
         * following the cursor.
         *
         * @returns The content read. In the case when no
         * match could be found, an empty string is returned.
         */
        read(token?: string): string;
        /**
         * Reads any whitespace characters and floating
         * escape characters.
         *
         * @returns The number of whitespace characters
         * read.
         */
        readWhitespace(): number;
        /**
         * Attempts to read a single stream-level grapheme from the
         * parse stream, using unicode-aware extraction method.
         * If the parse stream specifies a unicode escape sequence,
         * such as \uFFFF, these are seen as 6 individual graphemes.
         *
         * @returns The read grapheme, or an empty string in the case
         * when there is no more content in the parse stream.
         */
        readGrapheme(): string;
        /**
         * Reads graphemes from the parse stream, until either
         * the cursor reaches one of the specified quit tokens,
         * or the parse stream terminates.
         */
        readUntil(...quitTokens: string[]): string;
        /**
         * Attempts to read the specified token from the parse stream,
         * if and only if it's at the end of the parse stream.
         */
        readThenTerminal(token: string): string;
        /**
         * @returns A boolean value that indicates whether the
         * specified string exists immediately at the position of
         * the cursor.
         */
        peek(token: string): boolean;
        /**
         * @returns A boolean value that indicates whether the
         * specified string exists immediately at the position of
         * the cursor, and following this token is the end of the
         * parse stream.
         */
        peekThenTerminal(token: string): boolean;
        /**
         * @returns A boolean value that indicates whether
         * there are more characters to read in the input.
         */
        more(): boolean;
        /**
         * Gets or sets the position of the cursor from where
         * reading takes place in the cursor.
         */
        get position(): number;
        set position(value: number);
        private _position;
        /** */
        private readonly input;
        /**
         *
         */
        private atRealBackslash;
        /**
         * @deprecated
         * @returns A boolean value that indicates whether an
         * escape character exists behind the current character.
         * The algorithm used is respective of sequences of
         * multiple escape characters.
         */
        private escaped;
    }
}
declare namespace Truth {
    type T = [number, number];
    /**
     * Stores the maximum character code in the unicode set.
     */
    export const UnicodeMax = 65536;
    /**
     * Stores a map of the names of all unicode blocks,
     * and their character ranges.
     */
    export const UnicodeBlocks: Readonly<Map<string, T>>;
    export {};
}
declare namespace Truth {
    /**
     * @internal
     * Stores unsorted general utility methods.
     */
    class Misc {
        /**
         * Counts incrementally through numbers, using the specified
         * radix sequence. For example, if the radixes [2, 2, 2] were to
         * be specified, this would result in binary counting starting at
         * [0, 0, 0] and ending at [1, 1, 1].
         */
        static variableRadixCounter(radixes: number[]): Generator<number[], void, unknown>;
        /**
         *
         */
        static calculatePowerset<T>(array: T[]): T[][];
        /**
         * @returns Whether the items of the first set object form
         * a subset (not a proper subset) of the items of the second
         * set.
         */
        static isSubset(sourceSet: ReadonlySet<unknown>, possibleSubset: ReadonlySet<unknown>): boolean;
        /**
         * @returns Whether the items of the first set object form
         * a superset (not a proper superset) of the items of the
         * second set.
         */
        static isSuperset(sourceSet: ReadonlySet<unknown>, possibleSuperset: ReadonlySet<unknown>): boolean;
        /**
         * @returns The number of items that are missing
         * from the second set that exist in the first set.
         */
        static computeSubsetFactor(a: readonly unknown[], b: readonly unknown[]): number;
        /**
         * Performs a recursive reduction operation on an initial object
         * that represents some abstract node of a graph. The traversal
         * algorithm used ensures all provided nodes are only visited
         * once.
         */
        static reduceRecursive<TRet, T>(initialObject: T, followFn: (from: T) => Iterable<T>, reduceFn: (current: T, nestedResults: readonly TRet[]) => TRet): TRet;
        /**
         * @returns A proxy of the specified object, whose members
         * have been patched with the specified patch object.
         */
        static patch<T extends object>(source: T, patch: Partial<T>): T;
        /**
         * Safely parses a JSON object, silencing any thrown parse exceptions.
         */
        static tryParseJson(jsonText: string): any;
        private constructor();
    }
}
declare namespace Truth {
    /**
     * The top-level object that manages Truth documents.
     */
    class Program {
        /**
         * Creates a new Program, into which Documents may
         * be added, and verified.
         */
        constructor();
        /** @internal */
        private readonly agentCache;
        /** */
        readonly documents: DocumentGraph;
        /** @internal */
        readonly graph: HyperGraph;
        /**  */
        readonly faults: FaultService;
        /** */
        get version(): VersionStamp;
        private _version;
        /**
         * Probes the program and returns an array containing information
         * about the callbacks that will be triggered if a cause of the specified
         * type is broadcasted. Essentially, this method answers the question,
         * "Who is listening for Causes of type X?".
         *
         * If no agents have attached to the specified type, an empty array
         * is returned.
         */
        probe(causeType: new (...args: any[]) => any, scope?: AttachmentScope): {
            uri: Uri | null;
            scope: AttachmentScope;
        }[];
        /**
         *
         */
        on<T extends Cause<any>>(causeType: new (...args: any[]) => T, fn: (data: TCauseData<T>) => TCauseReturn<T>, scope?: Document | Type): void;
        /**
         * Progates the specified Cause object to all subscribers that
         * are listening for causes of object's type.
         *
         * @param cause A reference to the Cause instance to broadcast.
         *
         * @param filter An optional array of Uri instances that
         * specify the origin from where an agent that is attached
         * to the cause must loaded in order to be delivered the
         * cause instance.
         *
         * @returns An object that stores information about the
         * cause results that were returned, and the URI of the
         * agent that produced the result. In the case when the
         * agent was attached programmatically, the URI value
         * will be null.
         */
        cause<R>(cause: Cause<R>, ...filters: Uri[]): {
            from: Uri | null;
            returned: R;
        }[];
        /** @internal */
        private readonly causes;
        /**
         * Augments the global scope of the agents attached to this
         * program with a variable whose name and value are specified
         * in the arguments to this method. (Note that this only affects
         * agents that are attached *after* this call has been made.)
         */
        augment(name: string, value: object): void;
        /**
         *
         */
        attach(agentUri: Uri): Promise<Error | void>;
        /**
         *
         */
        detach(agentUri: Uri): void;
        /**
         * Queries the program for the root-level types that exist within
         * the specified document.
         *
         * @param document The document to query.
         *
         * @returns An array containing the top-level types that are
         * defined within the specified document.
         */
        query(document: Document): Type[];
        /**
         * Queries the program for the types that exist within
         * the specified document, at the specified type path.
         *
         * @param document The document to query.
         * @param typePath The type path within the document to search.
         *
         * @returns A fully constructed Type instance that corresponds to
         * the type at the URI specified, or null in the case when no type
         * could be found.
         */
        query(document: Document, ...typePath: string[]): Type | null;
        /**
         * Queries the program for types that exist within this program,
         * at the specified type URI.
         *
         * @param uri The URI of the document to query. If the URI contains
         * a type path, it is factored into the search.
         *
         * @returns An array containing the top-level types that are
         * defined within the specified document. If the specified URI has a
         * type path, the returned array will contain a single Type instance
         * that corresponds to the Type found. In the case when no type
         * could be found at the type path, an empty array is returned.
         */
        query(uri: Uri): Type[];
        /**
         * Queries the program for types that exist within this program,
         * at the specified URI and type path.
         *
         * @param uri The URI of the document to query. If the URI contains
         * a type path, it is factored into the search.
         * @param typePath The type path within the document to search.
         *
         * @returns A fully constructed Type instance that corresponds to
         * the type at the URI specified, or null in the case when no type
         * could be found.
         */
        query(uri: Uri, ...typePath: string[]): Type | null;
        /**
         * Queries the program for types that exist within this document,
         * at the specified URI.
         *
         * @param uri The a string representation of the URI of the document
         * to query. If the URI contains a type path, it is factored into the search.
         *
         * @returns An array containing the top-level types that are
         * defined within the specified document. If the specified URI has a
         * type path, the returned array will contain a single Type instance
         * that corresponds to the Type found. In the case when no type
         * could be found at the type path, an empty array is returned.
         */
        query(uri: string): Type[];
        /**
         * Queries the program for types that exist within this program,
         * at the specified URI and type path.
         *
         * @param uri The URI of the document to query. If the URI contains
         * a type path, it is factored into the search.
         * @param typePath The type path within the document to search.
         *
         * @returns A fully constructed Type instance that corresponds to
         * the type at the URI specified, or null in the case when no type
         * could be found.
         */
        query(uri: string, ...typePath: string[]): Type | null;
        /**
         * Begin inspecting a document loaded
         * into this program, a specific location.
         */
        inspect(document: Document, line: number, offset: number): ProgramInspectionResult;
        /**
         * Performs a full verification of all documents loaded into the program.
         * This Program's .faults field is populated with any faults generated as
         * a result of the verification. If no documents loaded into this program
         * has been edited since the last verification, verification is not re-attempted.
         *
         * @returns An entrypoint into performing analysis of the Types that
         * have been defined in this program.
         */
        verify(): boolean;
        /**
         * Performs verification on the parts of the document that have
         * not been verified since the last call to this method. Once this
         * method has completed, any detected faults will be available
         * by using the methods located in the `.faults` property of this
         * instance.
         *
         * @returns A boolean value that indicates whether verification
         * completed without detecting any faults in this Program.
         */
        reverify(): boolean;
        /** */
        private verifyAssociatedDeclarations;
        /** */
        private finalizeVerification;
        /** */
        private readonly unverifiedStatements;
        /** */
        private readonly unverifiedDocuments;
        /**
         * @internal
         * Stores information about the agent that holds the reference
         * to this Program instance. The property is undefined in the
         * case when the instance is not held by an agent.
         *
         * This value is applied through the Misc.patch() function, which
         * uses a Proxy object to provide
         */
        readonly instanceHolder?: {
            uri: Uri;
            scope: AttachmentScope;
        };
    }
    /**
     * Describes a place in the program where a Cause is attached.
     */
    type AttachmentScope = Program | Document | Type;
    /**
     * Stores the details about a precise location in a Document.
     */
    class ProgramInspectionResult {
        /**
         * Stores the compilation object that most closely represents
         * what was found at the specified location. Stores null in the
         * case when the specified location contains an object that
         * has been marked as cruft (the statement and span fields
         * are still populated in this case).
         */
        readonly foundObject: Document | Type[] | null;
        /**
         * Stores the Statement found at the specified location.
         */
        readonly statement: Statement;
        /**
         * Stores the Span found at the specified location, or
         * null in the case when no Span was found, such as if
         * the specified location is whitespace or a comment.
         */
        readonly span: Span | null;
        /** @internal */
        constructor(
        /**
         * Stores the compilation object that most closely represents
         * what was found at the specified location. Stores null in the
         * case when the specified location contains an object that
         * has been marked as cruft (the statement and span fields
         * are still populated in this case).
         */
        foundObject: Document | Type[] | null, 
        /**
         * Stores the Statement found at the specified location.
         */
        statement: Statement, 
        /**
         * Stores the Span found at the specified location, or
         * null in the case when no Span was found, such as if
         * the specified location is whitespace or a comment.
         */
        span?: Span | null);
    }
}
declare namespace Truth {
    /**
     * @internal
     * A cache that stores agent build function loaded by a single program instance.
     */
    class AgentCache {
        private readonly program;
        /** */
        constructor(program: Program);
        /** */
        private attachAgent;
        /** */
        private detachAgent;
        /**
         * @internal
         * (Called by Program)
         */
        augment(name: string, value: object): void;
        /** */
        private readonly agentFunctionParameters;
        /**
         * Adjusts the content of the sourcemap in the specified source code
         * file, to account for the discrepencies introduced by wrapping JavaScript
         * source code in a new Function() constructor.
         */
        private maybeAdjustSourceMap;
        /** */
        private reportUserLandError;
        /** */
        private toBase64;
        /** */
        private fromBase64;
        /**
         * The require() function is not available within the context of an
         * agent for numerous (and non-obvious) reasons. This function
         * is fed into all agent functions to prevent any otherwise available
         * require() function from being accessed.
         */
        private static readonly hijackedRequireFn;
        /**
         * Stores the number of lines that are introduced by the script
         * engine when a code block is wrapped in a new Function()
         * block, which is then toString()'d. This is used in order to calculate
         * source map line offsets (which varies by engine).
         */
        private readonly sourceMapLineOffset;
        /**
         * Stores a map whose keys are agent URIs, and whose values
         * are a set of Statement instances that reference the agent,
         * or, in the case when the agent is added to the program
         * through another means (such as programmatically),
         * a reference to the program is stored instead.
         *
         * Technically an agent should be attached in only one place
         * in the program, however, this may not always be the case,
         * and the system needs to be able to handle the case when
         * it isn't.
         *
         * This array is used to reference count / garbage collect
         * the attached agents.
         */
        private readonly cache;
    }
}
declare namespace Truth {
    /**
     * Abstract base class for all Causes defined both within
     * the compiler core, and in user code.
     */
    abstract class Cause<R = void> {
        /**
         * Stores the return type of the Cause, if any. In a cause callback function,
         * this property exists as an array of objects that have been returned
         * from other cause aids.
         */
        readonly returns: R;
    }
    /**
     * Extracts the *Result* type parameter of a Cause.
     */
    type TCauseReturn<T> = T extends {
        returns: infer R;
    } ? R : never;
    /**
     * Maps a Cause type over to it's corresponding object
     * that is fed into all cause callback functions.
     */
    type TCauseData<T> = {
        [P in keyof T]: P extends "returns" ? readonly T[P][] : T[P];
    };
    /** */
    class CauseAgentAttach extends Cause {
        /**
         * Stores the URI from where the agent was loaded.
         */
        readonly uri: Uri;
        /**
         * Stores an object that represents the scope of where the agent
         * applies.
         *
         * If the value is `instanceof Program`, this indicates that
         * the agent's causes are scoped to a particular program (which
         * is effectively "unscoped").
         *
         * If the value is `instanceof Document`, this indicates that
         * the agent's causes are scoped to the causes that can
         * originate from a single document.
         *
         * (Not implemented). If the value is `instanceof Type`, this
         * indicates that the agent's causes are scoped to the causes
         * that can originate from a single type.
         */
        readonly scope: Program | Document | Type;
        constructor(
        /**
         * Stores the URI from where the agent was loaded.
         */
        uri: Uri, 
        /**
         * Stores an object that represents the scope of where the agent
         * applies.
         *
         * If the value is `instanceof Program`, this indicates that
         * the agent's causes are scoped to a particular program (which
         * is effectively "unscoped").
         *
         * If the value is `instanceof Document`, this indicates that
         * the agent's causes are scoped to the causes that can
         * originate from a single document.
         *
         * (Not implemented). If the value is `instanceof Type`, this
         * indicates that the agent's causes are scoped to the causes
         * that can originate from a single type.
         */
        scope: Program | Document | Type);
    }
    /** */
    class CauseAgentDetach extends Cause {
        readonly uri: Uri;
        constructor(uri: Uri);
    }
    /** A cause that runs immediately after a document has been created. */
    class CauseDocumentCreate extends Cause {
        readonly document: Document;
        constructor(document: Document);
    }
    /** A cause that runs immediately before a document is removed from the program. */
    class CauseDocumentDelete extends Cause {
        readonly document: Document;
        constructor(document: Document);
    }
    /** A cause that runs when a document's file name changes. */
    class CauseDocumentUriChange extends Cause {
        readonly document: Document;
        readonly newUri: Uri;
        constructor(document: Document, newUri: Uri);
    }
    /** Abstract cause class for the resolution causes */
    abstract class CauseResolve extends Cause<IResolutionReturn> {
        readonly program: Program;
        readonly spine: Spine;
        constructor(program: Program, spine: Spine);
    }
    /** Output for resolution hooks */
    interface IResolutionReturn {
        readonly resolves: boolean;
    }
    /** A cause that runs before the compiler is about to resolve a term. */
    class CauseBeforeResolve extends CauseResolve {
    }
    /** A cause that runs after the compiler has resolved a term. */
    class CauseAfterResolve extends CauseResolve {
    }
    /** A cause that runs when the compiler is unable to resolve a term. */
    class CauseNotResolved extends CauseResolve {
    }
    /** */
    class CauseInvalidate extends Cause {
        /**
         * A reference to the Document object in which the Invalidation occured.
         */
        readonly document: Document;
        /**
         * An array of statements whose descendants should be invalidated.
         * If the array is empty, the entire document should be invalidated.
         */
        readonly parents: readonly Statement[];
        /**
         * An array of indexes whose length is the same as the parents field,
         * that represents the index of each parent within the document.
         */
        readonly indexes: readonly number[];
        constructor(
        /**
         * A reference to the Document object in which the Invalidation occured.
         */
        document: Document, 
        /**
         * An array of statements whose descendants should be invalidated.
         * If the array is empty, the entire document should be invalidated.
         */
        parents: readonly Statement[], 
        /**
         * An array of indexes whose length is the same as the parents field,
         * that represents the index of each parent within the document.
         */
        indexes: readonly number[]);
    }
    /** */
    class CauseRevalidate extends Cause {
        /**
         * A reference to the Document object in which the Revalidation will occur.
         */
        readonly document: Document;
        /**
         * An array of statements whose descendants should be revalidated.
         */
        readonly parents: readonly Statement[];
        /**
         * An array of indexes whose length is the same as the parents field,
         * that represents the index of each parent within the document.
         */
        readonly indexes: readonly number[];
        constructor(
        /**
         * A reference to the Document object in which the Revalidation will occur.
         */
        document: Document, 
        /**
         * An array of statements whose descendants should be revalidated.
         */
        parents: readonly Statement[], 
        /**
         * An array of indexes whose length is the same as the parents field,
         * that represents the index of each parent within the document.
         */
        indexes: readonly number[]);
    }
    /** A cause that runs when a document edit transaction has completed. */
    class CauseEditComplete extends Cause {
        readonly document: Document;
        constructor(document: Document);
    }
    /** */
    abstract class CauseUriReference extends Cause {
        /**
         * A reference to the Statement instance that references
         * this URI, or null in the case when the program itself
         * references the URI by another means.
         */
        readonly statement: Statement | null;
        readonly uri: Uri;
        constructor(
        /**
         * A reference to the Statement instance that references
         * this URI, or null in the case when the program itself
         * references the URI by another means.
         */
        statement: Statement | null, uri: Uri);
    }
    /**
     * A hook that runs when a URI reference is added to a document,
     * but before it resolves to a resource.
     */
    class CauseUriReferenceAdd extends CauseUriReference {
    }
    /**
     * A hook that runs when a URI reference is removed from a document.
     */
    class CauseUriReferenceRemove extends CauseUriReference {
    }
    /**
     * A hook that runs when the set of faults that are detected
     * within the document have changed.
     */
    class CauseFaultChange extends Cause {
        readonly faultsAdded: Fault[];
        readonly faultsRemoved: Fault[];
        constructor(faultsAdded: Fault[], faultsRemoved: Fault[]);
    }
}
declare namespace Truth {
    /** @internal */
    class Exception {
        /** */
        static objectDirty(): Error;
        /** */
        static invalidArgument(): Error;
        /** */
        static passedArrayCannotBeEmpty(paramName: string): Error;
        /** */
        static unknownState(): Error;
        /** */
        static invalidCall(): Error;
        /** */
        static notImplemented(): Error;
        /** */
        static agentNotRead(): Error;
        /** */
        static agentMissing(rawUri: string): Error;
        /** */
        static agentImportError(agentUri: string, errorText: string): Error;
        /** */
        static agentInvalid(rawUri: string): Error;
        /** */
        static noRemoteAgents(): Error;
        /** */
        static causeParameterNameInUse(paramName: string): Error;
        /** */
        static doubleTransaction(): Error;
        /** */
        static invalidUriRetraction(): Error;
        /** */
        static invalidUri(rawUri?: string): Error;
        /** */
        static uriNotSupported(): Error;
        /** */
        static cannotMakeAbsolute(): Error;
        /** */
        static absoluteUriExpected(): Error;
        /** */
        static mustSpecifyVia(): Error;
        /** */
        static viaCannotBeRelative(): Error;
        /** */
        static invalidTypePath(): Error;
        /** */
        static invalidExtension(requiredExtension: string): Error;
        /** */
        static invalidDocumentReference(): Error;
        /** */
        static nonEmptyDocument(): Error;
        /** */
        static invalidWhileInEditTransaction(): Error;
        /** */
        static uncachableDocument(): Error;
        /** */
        static documentAlreadyLoaded(): Error;
        /** */
        static documentNotLoaded(): Error;
        /** */
        static cannotRefresh(): Error;
        /** */
        static offsetRequired(): Error;
        /** */
        static unsupportedPlatform(): Error;
    }
}
declare namespace Truth {
    /**
     * Universal class for handling URIs that exist within a Truth document.
     */
    class Uri {
        /**
         * Constructs a new Uri instance that points to a (possibly nested)
         * type defined in the specified document.
         */
        static from(document: Document, ...types: string[]): Uri;
        /**
         * Attempts to parse the specified string or Uri into
         * another Uri instance. If the parameter is already
         * a Uri, it is returned without further processing.
         */
        static maybeParse(value: string | Uri): Uri | null;
        /**
         * Attempts to parse the specified string into a Uri instance.
         * Returns null in the case when the Uri could not be parsed.
         */
        static tryParse(uri: string | Uri, via?: Uri | string): Uri | null;
        /**
         * Copies the specified URI or Spine into another URI instance.
         */
        static clone(value: Spine | Uri): Uri;
        /**
         * @internal
         * Creates an internal URI used to uniquely identify a
         * document that exists only in memory.
         */
        static createInternal(): Uri;
        /**
         * @internal
         */
        private constructor();
        /**
         * @internal
         * Debugging utility. Do not use.
         */
        private get value();
        /**
         *
         */
        readonly protocol: UriProtocol;
        /**
         * Stores the name of the file referenced in the URI, including any extension.
         */
        readonly file: string;
        /**
         * Stores the extension of the file referenced in the URI, if any.
         */
        readonly ext: UriExtension;
        /**
         * Stores the store-side components of this URI.
         * Excludes the file name.
         */
        readonly stores: readonly UriComponent[];
        /**
         * Stores the type-side components of this URI.
         */
        readonly types: readonly UriComponent[];
        /**
         * Stores the number of retractions that are defined in this
         * URI, in the case when the URI is relative.
         */
        readonly retractionCount: number;
        /**
         * Stores whether the URI is a relative path.
         */
        readonly isRelative: boolean;
        /**
         * Creates a new Uri whose path of types is
         * retracted by the specified number of levels
         * of depth.
         */
        retractType(factor: number): Uri;
        /**
         * Creates a new Uri, whose path of types is
         * retracted to the specified level of depth.
         */
        retractTypeTo(depth: number): Uri;
        /**
         * Creates a new Uri whose path of stores is
         * retracted by the specified number of levels
         * of depth.
         */
        retractStore(factor: number): Uri;
        /**
         * Creates a new Uri, whose path of folders is
         * retracted to the specified level of depth.
         */
        retractStoreTo(depth: number): Uri;
        /**
         *
         */
        extendType(additionalTypeNames: string | readonly string[]): Uri;
        /**
         *
         */
        extendStore(additionalStores: string | readonly string[]): Uri;
        /**
         * @returns A boolean value that indicates whether this
         * Uri is structurally equivalent to the specified Uri.
         */
        equals(other: Uri, compareTypes?: boolean): boolean;
        /**
         *
         */
        toAbsolute(): Uri | null;
        /**
         * @returns The path of types contained by this URI,
         * concatenated into a single string.
         */
        toTypeString(): string;
        /**
         * @returns The path of stores contained by this URI,
         * concatenated into a single string.
         */
        toStoreString(omitFile?: boolean): string;
        /**
         *
         */
        toString(): string;
    }
}
declare namespace Truth {
    /**
     * An enumeration that lists all availble protocols
     * supported by the system. The list can be enumerated
     * via Uri.eachProtocol()
     */
    enum UriProtocol {
        none = "",
        unknown = "?",
        file = "file:",
        https = "https:",
        http = "http:",
        internal = "internal:"
    }
    namespace UriProtocol {
        /**
         * @returns A UriProtocol member from the specified string.
         */
        function resolve(value: string): UriProtocol | null;
    }
}
declare namespace Truth {
    /**
     *
     */
    class UriParser {
        /**
         *
         */
        static parse(raw: string): Partial<Uri> | null;
    }
}
declare namespace Truth {
    /**
     * A class that represents a single component of a Uri.
     * Handled encoding and decoding of the underlying value.
     */
    class UriComponent {
        /** */
        constructor(raw: string);
        /** */
        private tryExtractHash;
        /** Stores whether this component represents a pattern. */
        get isPattern(): boolean;
        /** Stores whether this component is the retraction indicator (..) */
        readonly isRetract: boolean;
        /** Stores whether this component is the current indicator (.) */
        readonly isCurrent: boolean;
        /**
         * Stores a number that indicates a type index that this UriComponent,
         * refers to, used in the case when this UriComponent is referring to
         * an anonymous type.
         *
         * Stores -1 in the case when an index value is not relevant to this
         * UriComponent instance.
         */
        readonly index: number;
        /**
         * Stores the decoded text value of this UriComponent.
         * Stores a string version of the .index property in the case when
         * it is greater than -1.
         * This has the same value as the result of the .toString() method.
         */
        readonly value: string;
        /**
         * Stores a pattern hash, in the case when this UriComponent
         * relates to a pattern. Stores an empty string in other cases.
         */
        private readonly hash;
        /**
         * @returns The raw decoded text value of this UriComponent.
         */
        toString(): string;
        /**
         * @returns The URL encoded text value of this UriComponent.
         */
        toStringEncoded(): string;
        /**
         * @returns The text value of this UriComponent, using an
         * encoding that is compatible with an RFC 3986 host name.
         */
        toStringHost(): string;
    }
}
declare namespace Truth {
    /** */
    const UriReader: {
        /**
         * Attempts to read the contents of the given URI.
         * If an error is generated while trying to read a file
         * at the specified location, the errors is returned.
         */
        tryRead(uri: Uri): Promise<string | Error>;
    };
}
declare namespace Truth {
    /**
     * An enumeration that stores language syntax tokens.
     */
    const enum Syntax {
        tab = "\t",
        space = " ",
        terminal = "\n",
        combinator = ",",
        joint = ":",
        list = "...",
        escapeChar = "\\",
        comment = "//"
    }
    /**
     *
     */
    const enum UriSyntax {
        retract = "..",
        current = ".",
        componentSeparator = "/",
        typeSeparator = "//",
        protocolRelative = "//",
        indexerStart = "[",
        indexerEnd = "]"
    }
    /**
     * A constant enumerations that stores the valid extensions
     * that must be present in a parsable URI.
     */
    const enum UriExtension {
        unknown = "",
        truth = ".truth",
        js = ".truth.js",
        wasm = ".truth.wasm"
    }
    /**
     * An enumeration that stores the escape sequences
     * that only match a single kind of character. "Sign" in
     * this case refers to the fact that these are escape
     * sequences that refer to another character.
     */
    enum RegexSyntaxSign {
        tab = "\\t",
        lineFeed = "\\n",
        carriageReturn = "\\r",
        escapedFinalizer = "\\/",
        backslash = "\\\\"
    }
    namespace RegexSyntaxSign {
        /**
         * @returns A RegexSyntaxSign member from the
         * specified sign literal (ex: "\t") or raw signable
         * character (ex: "	").
         */
        function resolve(value: string): RegexSyntaxSign | null;
        /** */
        function unescape(value: string): string;
    }
    /**
     * An enumeration that stores the escape sequences
     * that can match more than one kind of character.
     */
    enum RegexSyntaxKnownSet {
        digit = "\\d",
        digitNon = "\\D",
        alphanumeric = "\\w",
        alphanumericNon = "\\W",
        whitespace = "\\s",
        whitespaceNon = "\\S",
        wild = "."
    }
    namespace RegexSyntaxKnownSet {
        function resolve(value: string): RegexSyntaxKnownSet | null;
    }
    /**
     * An enumeration that stores the delimiters available
     * in the system's regular expression flavor.
     */
    const enum RegexSyntaxDelimiter {
        main = "/",
        utf16GroupStart = "\\u{",
        utf16GroupEnd = "}",
        groupStart = "(",
        groupEnd = ")",
        alternator = "|",
        setStart = "[",
        setEnd = "]",
        quantifierStart = "{",
        quantifierEnd = "}",
        quantifierSeparator = ",",
        range = "-"
    }
    /**
     * An enumeration that stores miscellaneous regular
     * expression special characters that don't fit into
     * the other enumerations.
     */
    const enum RegexSyntaxMisc {
        star = "*",
        plus = "+",
        negate = "^",
        restrained = "?",
        boundary = "\\b",
        boundaryNon = "\\B"
    }
    /**
     * An enumeration that stores the delimiters available
     * in the infix syntax.
     */
    const enum InfixSyntax {
        start = "<",
        end = ">",
        nominalStart = "<<",
        nominalEnd = ">>",
        patternStart = "</",
        patternEnd = "/>"
    }
}
declare namespace Truth {
    /**
     * A class that manages the diagnostics that have been
     * reported for the current state of the program.
     */
    class FaultService {
        private readonly program;
        /** */
        constructor(program: Program);
        /** */
        private inEditTransaction;
        /**
         * Removes all faults associated with the specified statement.
         */
        private removeStatementFaults;
        /**
         * Enumerates through the unrectified faults retained
         * by this FaultService.
         */
        each(): Generator<Fault<TFaultSource>, void, unknown>;
        /**
         * Gets a number representing the number of
         * unrectified faults retained by this FaultService.
         */
        get count(): number;
        /**
         * Reports a fault. If a similar Fault on the same area
         * of the document hasn't been reported, the method
         * runs the FaultReported hook.
         */
        report(fault: Fault): void;
        /**
         * Reports a fault outside the context of an edit transaction.
         * This method is to be used for faults that are reported in
         * asynchronous callbacks, such as network errors.
         */
        reportAsync(fault: Fault): void;
        /**
         * @returns A boolean value indicating whether this
         * FaultService retains a fault that is similar to the specified
         * fault (meaning that it has the same code and source).
         */
        has(similarFault: Fault): boolean;
        /**
         * @returns An array of Fault objects that have been reported
         * at the specified source. If the source has no faults, an empty
         * array is returned.
         */
        check<TSource extends object>(source: TSource): Fault<TSource>[];
        /**
         * @internal
         * Used internally to inform the FaultService that type-level fault
         * analysis is being done on the provided Node. This is necessary
         * because type-level faults do not live beyond a single edit frame,
         * so the FaultService needs to know which Nodes were analyzed
         * so that newly rectified faults can be cleared out.
         *
         * When this method is called, any the faults corresponding to the
         * specified Node are cleared out, and are only added back in if
         * they were re-detected during this edit transaction.
         */
        inform(node: Node): void;
        /**
         * @internal
         */
        refresh(): void;
        /**
         * Stores the faults that are presented to external consumer
         * of the fault service when they use the accessor methods.
         */
        private visibleFrame;
        /**
         * Stores the faults that have been built up during an edit transaction.
         * These faults are copied to the `visibleFrame` when the edit
         * transaction completes.
         */
        private bufferFrame;
        /**
         * Stores the faults that were reported asynchronously, and therefore
         * are not bound to any edit transaction.
         */
        private asyncFrame;
    }
}
declare namespace Truth {
    /**
     * A type that describes the possible objects within a document
     * that may be responsible for the generation of a fault.
     */
    type TFaultSource = Statement | Span | InfixSpan;
    /**
     *
     */
    class Fault<TSource = TFaultSource> {
        /** */
        readonly type: FaultType<TSource>;
        /** The document object that caused the fault to be reported. */
        readonly source: TSource;
        /**
         * A human-readable message that contains more in-depth detail
         * of the fault that occured, in addition to the standard message.
         */
        readonly additionalDetail: string;
        constructor(
        /** */
        type: FaultType<TSource>, 
        /** The document object that caused the fault to be reported. */
        source: TSource, 
        /**
         * A human-readable message that contains more in-depth detail
         * of the fault that occured, in addition to the standard message.
         */
        additionalDetail?: string);
        /**
         * Converts this fault into a string representation,
         * suitable for output as an error message.
         */
        toString(): string;
        /**
         * Gets a reference to the Document in which this Fault was detected.
         */
        get document(): Document;
        /**
         * Gets a reference to the Statement in which this Fault was detected.
         */
        get statement(): Statement;
        /**
         * Gets the line number of the Statement in which this Fault was detected.
         */
        get line(): number;
        /**
         * Gets an array representing the starting and ending character offsets
         * within the Statement in which this Fault was detected. The character
         * offsets are 1-based (not 0-based) to comply with the behaviour of
         * most text editors.
         */
        readonly range: number[];
    }
    /**
     *
     */
    class FaultType<TSource = TFaultSource> {
        /**
         * An error code, useful for reference purposes, or display in a user interface.
         */
        readonly code: number;
        /**
         * A human-readable description of the fault.
         */
        readonly message: string;
        /**
         *
         */
        readonly severity: FaultSeverity;
        constructor(
        /**
         * An error code, useful for reference purposes, or display in a user interface.
         */
        code: number, 
        /**
         * A human-readable description of the fault.
         */
        message: string, 
        /**
         *
         */
        severity: FaultSeverity);
        /**
         * Creates a fault of this type.
         */
        create(source: TSource): Fault<TSource>;
    }
    /**
     * The following definitions are intentionally equivalent
     * to the severity codes from the monaco editor.
     */
    const enum FaultSeverity {
        /** Unused. */
        hint = 1,
        /** Unused. */
        info = 2,
        /**
         * Indicates the severity of a fault is "warning", which means that
         * the associated object will still be processed during type analysis.
         */
        warning = 4,
        /**
         * Indicates the severity of a fault is "error", which means that
         * the associated object will be ignored during type analysis.
         */
        error = 8
    }
    /**
     *
     */
    const Faults: Readonly<{
        /** */
        each(): Generator<FaultType<object>, void, unknown>;
        /**
         * @returns An object containing the FaultType instance
         * associated with the fault with the specified code, as
         * well as the name of the instance. In the case when the
         * faultCode was not found, null is returned.
         */
        nameOf(faultCode: number): string;
        /** */
        UnresolvedResource: Readonly<FaultType<Statement>>;
        /** */
        CircularResourceReference: Readonly<FaultType<Statement>>;
        /** */
        InsecureResourceReference: Readonly<FaultType<Statement>>;
        /** */
        UnresolvedAnnotation: Readonly<FaultType<Span>>;
        /** */
        CircularTypeReference: Readonly<FaultType<Span>>;
        /** */
        ContractViolation: Readonly<FaultType<Statement>>;
        /** */
        TypeCannotBeRefreshed: Readonly<FaultType<Statement>>;
        /** */
        IgnoredAnnotation: Readonly<FaultType<Span>>;
        /** */
        IgnoredAlias: Readonly<FaultType<Span>>;
        /** */
        TypeSelfReferential: Readonly<FaultType<Span>>;
        /** */
        AnonymousInListIntrinsic: Readonly<FaultType<Statement>>;
        /** */
        ListContractViolation: Readonly<FaultType<Span>>;
        /** */
        ListIntrinsicExtendingList: Readonly<FaultType<Span>>;
        /** (This is the same thing as a list dimensionality conflict) */
        ListExtrinsicExtendingNonList: Readonly<FaultType<Span>>;
        /** */
        ListDimensionalDiscrepancyFault: Readonly<FaultType<Span>>;
        /** */
        ListAnnotationConflict: Readonly<FaultType<Span>>;
        /** */
        PatternInvalid: Readonly<FaultType<Statement>>;
        /** */
        PatternWithoutAnnotation: Readonly<FaultType<Statement>>;
        /** */
        PatternCanMatchEmpty: Readonly<FaultType<Statement>>;
        /** */
        PatternMatchingTypesAlreadyExists: Readonly<FaultType<Statement>>;
        /** */
        PatternMatchingList: Readonly<FaultType<Span>>;
        /** */
        PatternCanMatchWhitespaceOnly: Readonly<FaultType<Statement>>;
        /** */
        PatternAcceptsLeadingWhitespace: Readonly<FaultType<Statement>>;
        /** */
        PatternRequiresLeadingWhitespace: Readonly<FaultType<Statement>>;
        /** */
        PatternAcceptsTrailingWhitespace: Readonly<FaultType<Statement>>;
        /** */
        PatternRequiresTrailingWhitespace: Readonly<FaultType<Statement>>;
        /** */
        PatternNonCovariant: Readonly<FaultType<Statement>>;
        /** */
        PatternPartialWithCombinator: Readonly<FaultType<Statement>>;
        /** */
        PatternsFormDiscrepantUnion: Readonly<FaultType<Span>>;
        /** */
        InfixHasQuantifier: Readonly<FaultType<Statement>>;
        /** */
        InfixHasDuplicateIdentifier: Readonly<FaultType<InfixSpan>>;
        /** */
        InfixHasSelfReferentialType: Readonly<FaultType<InfixSpan>>;
        /** */
        InfixNonConvariant: Readonly<FaultType<InfixSpan>>;
        /** */
        InfixCannotDefineNewTypes: Readonly<FaultType<InfixSpan>>;
        /** */
        InfixReferencedTypeMustHavePattern: Readonly<FaultType<InfixSpan>>;
        /** */
        InfixReferencedTypeCannotBeRecursive: Readonly<FaultType<InfixSpan>>;
        /** */
        InfixContractViolation: Readonly<FaultType<InfixSpan>>;
        /** */
        InfixPopulationChaining: Readonly<FaultType<InfixSpan>>;
        /** */
        InfixUsingListOperator: Readonly<FaultType<InfixSpan>>;
        /** */
        InfixReferencingList: Readonly<FaultType<InfixSpan>>;
        /** */
        PortabilityInfixHasMultipleDefinitions: Readonly<FaultType<InfixSpan>>;
        /** */
        PortabilityInfixHasUnion: Readonly<FaultType<InfixSpan>>;
        /** */
        PopulationInfixHasMultipleDefinitions: Readonly<FaultType<InfixSpan>>;
        /** */
        NominalInfixMustSubtype: Readonly<FaultType<Span>>;
        /** */
        StatementBeginsWithComma: Readonly<FaultType<Statement>>;
        /** */
        StatementBeginsWithEllipsis: Readonly<FaultType<Statement>>;
        /** */
        StatementBeginsWithEscapedSpace: Readonly<FaultType<Statement>>;
        /** */
        StatementContainsOnlyEscapeCharacter: Readonly<FaultType<Statement>>;
        /** */
        StatementBeginsWithInvalidSequence: Readonly<FaultType<Statement>>;
        /** */
        TabsAndSpaces: Readonly<FaultType<Statement>>;
        /** */
        DuplicateDeclaration: Readonly<FaultType<Span>>;
        /** */
        UnterminatedCharacterSet: Readonly<FaultType<Statement>>;
        /** */
        UnterminatedGroup: Readonly<FaultType<Statement>>;
        /** */
        DuplicateQuantifier: Readonly<FaultType<Statement>>;
        /** */
        UnterminatedInfix: Readonly<FaultType<Statement>>;
        /** */
        EmptyPattern: Readonly<FaultType<Statement>>;
    }>;
}
declare namespace Truth {
    /**
     * Infinite incremental counter.
     */
    export class VersionStamp {
        private readonly stamp;
        /** */
        static next(): VersionStamp;
        /** */
        private static nextStamp;
        /** */
        protected constructor(stamp: TStampNumber);
        /** */
        newerThan(otherStamp: VersionStamp): boolean;
        /** */
        toString(): string;
    }
    type TStampNumber = bigint | readonly bigint[] | number | readonly number[];
    export {};
}
declare namespace Truth {
    /**
     * @internal
     */
    class AlphabetRange {
        readonly from: number;
        readonly to: number;
        constructor(from: number, to: number);
    }
    /**
     * @internal
     */
    class Alphabet {
        /** */
        constructor(...ranges: AlphabetRange[]);
        /**
         * Iterates through each character defined in the alphabet.
         */
        [Symbol.iterator](): Generator<string, void, unknown>;
        /**
         * Iterates through all defined ranges in the alphabet,
         * excluding the wildcard range.
         */
        eachRange(): Generator<AlphabetRange, void, unknown>;
        /** */
        has(symbol: string | number): boolean;
        /** */
        hasWildcard(): boolean;
        /**
         * @returns A string representation of this object,
         * for testing and debugging purposes.
         */
        toString(): string;
        /** */
        private readonly ranges;
        /**
         * Stores a special token that the system understands to be the
         * wildcard character. The length of the token is longer than any
         * other token that could otherwise be found in the alphabet.
         */
        static readonly wildcard = "((wild))";
        /**
         * Stores a range that represents the wildcard character.
         * The range of the wildcard is positive infinity in both directions,
         * to ensure that it's always sorted last in the ranges array.
         */
        static readonly wildcardRange: Readonly<AlphabetRange>;
    }
    /**
     * @internal
     * A disposable class for easily creating Alphabet instances
     * (This design avoids introducing mutability into the Alphabet class).
     */
    class AlphabetBuilder {
        /** */
        constructor(...others: (Alphabet | AlphabetRange | string | number)[]);
        /**
         * Adds an entry to the alphabet.
         * If the second parameter is omitted, the entry refers to a
         * single character, rather than a range of characters.
         */
        add(from: string | number, to?: string | number): this;
        /** */
        addWild(): this;
        /**
         * @returns An optimized Alphabet instances composed
         * from the characters and ranges applied to this AlphabetBuilder.
         *
         * @param invert In true, causes the entries in the generated
         * Alphabet to be reversed, such that every character marked
         * as included is excluded, and vice versa.
         */
        toAlphabet(invert?: boolean): Alphabet;
        /** */
        private readonly ranges;
    }
}
declare namespace Truth {
    /**
     * @internal
     */
    class TransitionMap {
        /** */
        constructor(transitionLiteral?: ITransitionLiteral);
        /** */
        [Symbol.iterator](): Generator<[number, TransitionState], void, unknown>;
        /** */
        clone(): TransitionMap;
        /** */
        has(stateId: number, symbol?: string): boolean;
        /** */
        get(stateId: number): TransitionState | undefined;
        get(stateId: number, symbol: string): number | undefined;
        /** */
        acquire(stateId: number): TransitionState;
        acquire(stateId: number, symbol: string): number;
        /** */
        eachStateId(): Generator<number, void, unknown>;
        /**
         * @returns A string representation of this object,
         * for testing and debugging purposes.
         */
        toString(): string;
        /** */
        protected readonly transitions: Map<number, TransitionState>;
    }
    /**
     * @internal
     */
    class MutableTransitionMap extends TransitionMap {
        /** */
        initialize(srcStateId: number): void;
        /** */
        set(srcStateId: number, symbol: string, dstStateId: number): void;
    }
    /**
     *
     */
    interface ITransitionLiteral {
        [stateId: number]: ITransitionStateLiteral;
    }
}
declare namespace Truth {
    /**
     * @internal
     */
    class TransitionState {
        /** */
        constructor(source?: ITransitionStateLiteral);
        /** */
        clone(): TransitionState;
        /** */
        has(symbol: string): boolean;
        /** */
        get(symbol: string): number | undefined;
        /** */
        set(symbol: string, stateId: number): void;
        /** */
        eachSymbol(): Generator<string, void, unknown>;
        /**
         * @returns A string representation of this object,
         * for testing and debugging purposes.
         */
        toString(): string;
        /** */
        protected readonly stateMap: Map<string, number>;
    }
    /**
     *
     */
    interface ITransitionStateLiteral {
        [symbol: string]: number;
    }
}
declare namespace Truth {
    /**
     * @internal
     */
    class Guide {
        /** */
        constructor(from?: number | [number, number][] | Guide);
        /** */
        clone(): Guide;
        /** */
        has(stateIdSrc: number): boolean;
        /** */
        get(stateIdSrc: number): number | null | undefined;
        /** */
        add(stateIdSrc: number, stateIdDst?: number | null): void;
        /** */
        append(other: Guide): void;
        /** */
        first(): number;
        /** */
        keys(): Generator<number, void, unknown>;
        /** */
        values(): Generator<number, void, unknown>;
        /** */
        entries(): Generator<[number, number], void, unknown>;
        /** */
        get size(): number;
        /**
         * @returns A boolean value that indicates whether the contents
         * of this guide match the contents of the guide specified in the
         * parameter.
         */
        equals(other: Guide): boolean;
        /** */
        freeze(): this;
        /**
         * @returns A string representation of this object,
         * for testing and debugging purposes.
         */
        toString(): string;
        /** */
        private hasDst;
        /** */
        private isFrozen;
        /** */
        private readonly arrows;
    }
}
/**
 * This code is a TypeScript conversion of a portion of the the Python
 * project "greenery", from GitHub user "qntm".
 *
 * The greenery project can be found here:
 * https://github.com/qntm/greenery
 *
 * Specifically, the code from where this code drew inspiration is:
 * https://github.com/qntm/greenery/blob/master/greenery/fsm.py
 *
 * Possibly relevant blog post:
 * https://qntm.org/algo
 *
 * The original MIT license from greenery is as follows:
 *
 * Copyright (C) 2012 to 2017 by qntm
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
 * OR OTHER DEALINGS IN THE SOFTWARE.
 */
declare namespace Truth {
    /**
     * Oblivion is a Symbol object that is returned while calling crawl() if the Fsm
     * is transitioned to the oblivion state. For example while crawling two Fsms
     * in parallel we may transition to the oblivion state of both Fsms at once.
     * This warrants an out-of-bound signal which will reduce the complexity of
     * the new Fsm's map.
     */
    const Oblivion: unique symbol;
    /**
     * @internal
     * A Finite State Machine or Fsm has an alphabet and a set of states. At any
     * given moment, the Fsm is in one state. When passed a symbol from the
     * alphabet, the Fsm jumps to another state (or possibly the same state).
     * A TransitionMap indicates where to jump. One state is nominated as the
     * initial state. Zero or more states are nominated as final states. If, after
     * consuming a string of symbols, the Fsm is in a final state, then it is said
     * to "accept" the string.
     */
    export class Fsm {
        /**
         * An iterable of symbols the Fsm can be fed.
         */
        readonly alphabet: Alphabet;
        /**
         * The set of possible states for the Fsm.
         */
        readonly states: ReadonlySet<number>;
        /**
         * The initial state of the Fsm.
         */
        readonly initial: number;
        /**
         * The set of states that the Fsm accepts.
         */
        readonly finals: ReadonlySet<number>;
        /**
         * May be sparse (i.e. it may omit transitions).
         * In the case of omitted transitions, a non-final
         * "oblivion" state is simulated.
         */
        readonly transitions: TransitionMap;
        /**
         * @returns A new Fsm instance that accept
         * no inputs, not even an empty string.
         */
        static empty(alphabet: Alphabet): Fsm;
        /**
         * @returns An Fsm that matches only an empty string.
         */
        static epsilon(alphabet: Alphabet): Fsm;
        /** */
        constructor(
        /**
         * An iterable of symbols the Fsm can be fed.
         */
        alphabet: Alphabet, 
        /**
         * The set of possible states for the Fsm.
         */
        states: ReadonlySet<number>, 
        /**
         * The initial state of the Fsm.
         */
        initial: number, 
        /**
         * The set of states that the Fsm accepts.
         */
        finals: ReadonlySet<number>, 
        /**
         * May be sparse (i.e. it may omit transitions).
         * In the case of omitted transitions, a non-final
         * "oblivion" state is simulated.
         */
        transitions: TransitionMap);
        /**
         * @returns A boolean value that indicates whether the present Fsm
         * accepts the supplied array of symbols. Equivalently, consider this
         * Fsm instance as a possibly-infinite set of strings and test whether
         * the input is a member of it.
         *
         * If the wildcard character is present in the specified alphabet, then
         * any symbol not in the specified alphabet will be assumed to be
         * wildcard.
         */
        accepts(input: string): boolean;
        /**
         * @returns A reduced version of the Fsm, down to a minimal finite
         * state machine equivalent.
         *
         * (A result by Brzozowski (1963) shows that a minimal finite state
         * machine equivalent to the original can be obtained by reversing
         * the original twice.)
         */
        reduce(): Fsm;
        /**
         * @returns A new Fsm instance that represents the concatenation
         * of the specified series of finite state machines.
         */
        concatenate(...fsms: Fsm[]): Fsm;
        /**
         * Concatenate two finite state machines together.
         * For example, if this accepts "0*" and other accepts "1+(0|1)",
         * will return a finite state machine accepting "0*1+(0|1)".
         * Accomplished by effectively following non-deterministically.
         */
        add(other: Fsm): Fsm;
        /**
         * If the present Fsm accepts X, returns an Fsm accepting X*
         * (i.e. 0 or more instances of X). Note that this is not as simple
         * as naively connecting the final states back to the initial state:
         * see (b*ab)* for example.
         */
        star(): Fsm;
        /**
         * Given an Fsm and a multiplication factor, return the multiplied Fsm.
         */
        multiply(factor: number): Fsm;
        /**
         * @returns A new Fsm object that presents the union of
         * all supplied Fsm instances.
         */
        union(...fsms: Fsm[]): Fsm;
        /**
         * Performs logical alternation between this Fsm, and the Fsm
         * instance supplied in the argument.
         *
         * @returns A finite state machine which accepts any sequence of
         * symbols that is accepted by either self or other. Note that the set
         * of strings recognised by the two Fsms undergoes a set union.
         */
        or(other: Fsm): Fsm;
        /**
         * @returns A new Fsm object that represents the
         * intersection of all supplied Fsm instances.
         */
        intersection(...fsms: Fsm[]): Fsm;
        /**
         * Treat the Fsms as sets of strings and return the
         * intersection of those sets in the form of a new Fsm.
         */
        and(other: Fsm): Fsm;
        /**
         * @returns A new Fsm object that represents the computed
         * symmetric difference of all suppled Fsm instances.
         */
        symmetricDifference(...fsms: Fsm[]): Fsm;
        /**
         * @returns A new Fsm instances that recognises only the strings
         * recognised by this Fsm, or the Fsm instance supplied in the
         * other argument, but not both.
         */
        xor(other: Fsm): Fsm;
        /**
         * @returns A new Fsm instance that recogizes all inputs that
         * would not be accepted by this Fsm.
         */
        not(): Fsm;
        /**
         * @returns A new Fsm such that for every input that the supplied
         * Fsm accepts, the new Fsm accepts the same input, but reversed.
         */
        reverse(): Fsm;
        /**
         * @returns A boolean value indicating whether this Fsm instance
         * accepts the same set of inputs as the Fsm instance specified
         * in the argument.
         */
        equivalent(other: Fsm): boolean;
        /**
         * @returns A boolean value indicating whether this Fsm instance
         * does not accept the same set of inputs as the Fsm instance
         * specified in the argument.
         */
        unequivalent(other: Fsm): boolean;
        /**
         * @returns An Fsm instance which recognises only the inputs
         * recognised by the first Fsm instance in the list, but none of
         * the others.
         */
        difference(...fsms: Fsm[]): Fsm;
        /**
         * @returns A boolean value that indicates whether a final state
         * can be reached from the specified state.
         */
        isStateLive(stateId: number): boolean;
        /**
         * An Fsm is empty if it recognises no strings. An Fsm may be arbitrarily
         * complicated and have arbitrarily many final states while still recognising
         * no strings because those final states may all be inaccessible from the
         * initial state. Equally, an Fsm may be non-empty despite having an empty
         * alphabet if the initial state is final.
         */
        isEmpty(): boolean;
        /**
         * Generate strings (lists of symbols) that this Fsm accepts. Since there may
         * be infinitely many of these we use a generator instead of constructing a
         * static list. Strings will be sorted in order of length and then lexically.
         * This procedure uses arbitrary amounts of memory but is very fast. There
         * may be more efficient ways to do this, that I haven't investigated yet.
         * You can use this in list comprehensions.
         */
        eachString(): Generator<string, void, unknown>;
        /**
         * @returns A boolean value that indicates whether the act of merging
         * this Fsm instance with the Fsm instance supplied in the argument
         * would result in an Fsm instance that accepts no inputs.
         */
        isDiscrepant(other: Fsm): boolean;
        /**
         * @returns A boolean value that indicates whether the set of inputs
         * accepted by this Fsm instance is a subset of the inputs accepted by
         * other Fsm instance specified.
         */
        isSubset(other: Fsm): boolean;
        /**
         * @returns A boolean value that indicates whether the set of inputs
         * accepted by this Fsm instance is a proper subset of the inputs
         * accepted by other Fsm instance specified.
         */
        isProperSubset(other: Fsm): boolean;
        /**
         * @returns A boolean value that indicates whether the set of inputs
         * accepted by this Fsm instance is a superset of the inputs accepted
         * by other Fsm instance specified.
         */
        isSuperset(other: Fsm): boolean;
        /**
         * @returns A boolean value that indicates whether the set of inputs
         * accepted by this Fsm instance is a proper superset of the inputs
         * accepted by other Fsm instance specified.
         */
        isProperSuperset(other: Fsm): boolean;
        /**
         * Compute the Brzozowski derivative of this Fsm with respect to the input
         * string of symbols. <https://en.wikipedia.org/wiki/Brzozowski_derivative>
         * If any of the symbols are not members of the alphabet, that's a KeyError.
         * If you fall into oblivion, then the derivative is an Fsm accepting no
         * strings.
         *
         * @returns A new Fsm instance with the computed characteristics.
         */
        derive(input: string): typeof Oblivion | Fsm;
        /**
         * @returns A string representation of this object,
         * for testing and debugging purposes.
         */
        toString(): string;
    }
    export {};
}
declare namespace Truth {
    /**
     * @internal
     * Translates Pattern instances into a corresponding Fsm.
     */
    class FsmTranslator {
        /** */
        static exec(units: Iterable<RegexUnit>): Fsm;
        /** */
        private static translateSet;
        /** */
        private static translateGroup;
        /** */
        private static createGroupAlphabet;
        /** */
        private static translateGrapheme;
        /** */
        private static translateSign;
    }
}
declare namespace Truth {
    /**
     *
     */
    export class Document {
        /**
         * @internal
         * Internal constructor for Document objects.
         * Document objects are created via a Program
         * object.
         */
        constructor(program: Program, sourceUri: Uri, sourceText: string);
        /**
         * Queries this document for the root-level types.
         *
         * @param uri The URI of the document to query. If the URI contains
         * a type path, it is factored into the search.
         *
         * @param typePath The type path within the document to search.
         *
         * @returns A fully constructed Type instance that corresponds to
         * the type at the URI specified, or null in the case when no type
         * could be found.
         */
        query(...typePath: string[]): Type | null;
        /**
         * Gets the root-level types that are defined within this document.
         */
        get types(): readonly Type[];
        private _types;
        /**
         * @returns An array of Statement objects that represent
         * ancestry of the specified statement. If the specified
         * statement is not in this document, the returned value
         * is null.
         */
        getAncestry(statement: Statement | number): Statement[] | null;
        /**
         * @returns The parent Statement object of the specified
         * Statement. If the statement is top level, a reference to
         * this document object is returned. If the statement is
         * not found in the document, or the specified statement
         * is a no-op, the returned value is null.
         */
        getParent(statement: Statement | number): this | Statement | null;
        /**
         * @returns The Statement that would act as the parent
         * if a statement where to be inserted at the specified
         * virtual position in the document. If an inserted
         * statement would be top-level, a reference to this
         * document object is returned.
         */
        getParentFromPosition(virtualLine: number, virtualOffset: number): Statement | this;
        /**
         * @returns The sibling Statement objects of the
         * specified Statement. If the specified statement
         * is not found in the document, or is a no-op, the
         * returned value is null.
         */
        getSiblings(statement: Statement | number): Statement[] | null;
        /**
         * @returns The child Statement objects of the specified
         * Statement. If the argument is null or omitted, the document's
         * top-level statements are returned. If the specified statement
         * is not found in the document, the returned value is null.
         */
        getChildren(statement?: Statement | null): Statement[];
        /**
         * @returns A boolean value that indicates whether the specified
         * statement, or the statement at the specified index has any
         * descendants. If the argument is null, the returned value is a
         * boolean indicating whether this document has any non-noop
         * statements.
         */
        hasDescendants(statement: Statement | number | null): boolean;
        /**
         * @returns The index of the specified statement in
         * the document, relying on caching when available.
         * If the statement does not exist in the document,
         * the returned value is -1.
         */
        getLineNumber(statement: Statement): number;
        /**
         * @returns An array of strings containing the content
         * written in the comments directly above the specified
         * statement. Whitespace lines are ignored. If the specified
         * statement is a no-op, an empty array is returned.
         */
        getNotes(statement: Statement | number): string[];
        /**
         * Enumerates through each statement that is a descendant of the
         * specified statement. If the parameters are null or omitted, all
         * statements in this Document are yielded.
         *
         * The method yields an object that contains the yielded statement,
         * as well as a numeric level value that specifies the difference in
         * the number of nesting levels between the specified initialStatement
         * and the yielded statement.
         *
         * @param initialStatement A reference to the statement object
         * from where the enumeration should begin.
         *
         * @param includeInitial A boolean value indicating whether or
         * not the specified initialStatement should also be returned
         * as an element in the enumeration. If true, initialStatement
         * must be non-null.
         */
        eachDescendant(initialStatement?: Statement | null, includeInitial?: boolean): Generator<{
            statement: Statement;
            level: number;
        }, void, undefined>;
        /**
         * @deprecated
         * Enumerates through each unique URI defined in this document,
         * that are referenced within the descendants of the specified
         * statement. If the parameters are null or omitted, all unique
         * URIs referenced in this document are yielded.
         *
         * @param initialStatement A reference to the statement object
         * from where the enumeration should begin.
         *
         * @param includeInitial A boolean value indicating whether or
         * not the specified initialStatement should also be returned
         * as an element in the enumeration. If true, initialStatement
         * must be non-null.
         */
        eachUri(initialStatement?: Statement | null, includeInitial?: boolean): Generator<{
            uri: Uri;
            uriText: string;
        }, void, unknown>;
        /**
         * Enumerates through each statement in the document,
         * including comments and whitespace-only lines, starting
         * at the specified statement or numeric position.
         *
         * @yields The statements in the order that they appear
         * in the document, excluding whitespace-only statements.
         */
        eachStatement(statement?: Statement | number): Generator<Statement, void, unknown>;
        /**
         * Reads the Statement at the given position.
         * Negative numbers read Statement starting from the end of the document.
         */
        read(lineNumber: number): Statement;
        /**
         * Convenience method that converts a statement or it's index
         * within this document to a statement object.
         */
        private toStatement;
        /**
         * Convenience method to quickly turn a value that may be
         * a statement or a statement index, into a bounded statement
         * index.
         */
        private toLineNumber;
        /**
         * Starts an edit transaction in the specified callback function.
         * Edit transactions are used to synchronize changes made in
         * an underlying file, typically done by a user in a text editing
         * environment. System-initiated changes such as automated
         * fixes, refactors, or renames do not go through this pathway.
         *
         * @param editFn The callback function in which to perform
         * document mutation operations.
         */
        edit(editFn: (mutator: IDocumentMutator) => void): void;
        /**
         * Executes a complete edit transaction, applying the series
         * of edits specified in the `edits` parameter.
         */
        editAtomic(edits: IDocumentEdit[]): void;
        /** Stores the URI from where this document was loaded. */
        get sourceUri(): Uri;
        private _sourceUri;
        /** A reference to the instance of the Compiler that owns this Document. */
        readonly program: Program;
        /**
         * Stores the complete list of the Document's statements,
         * sorted in the order that they appear in the file.
         */
        private readonly statements;
        /**
         * A state variable that stores whether an
         * edit transaction is currently underway.
         */
        private inEdit;
        /**
         * @internal
         * A rolling version stamp that increments after each edit transaction.
         */
        get version(): VersionStamp;
        private _version;
        /**
         * Returns a formatted version of the Document.
         */
        toString(keepOriginalFormatting?: boolean): string;
    }
    /**
     * Represents an interface for creating a
     * batch of document mutation operations.
     */
    interface IDocumentMutator {
        /**
         * Inserts a fact at the given position, and returns the inserted Fact.
         * Negative numbers insert facts starting from the end of the document.
         * The factText argument is expected to be one single complete line of text.
         */
        insert(text: string, at: number): void;
        /**
         * Replaces a fact at the given position, and returns the replaced Fact.
         * Negative numbers insert facts starting from the end of the document.
         * The factText argument is expected to be one single complete line of text.
         */
        update(factText: string, at: number): void;
        /**
         * Deletes a fact at the given position, and returns the deleted Fact.
         * Negative numbers delete facts starting from the end of the document.
         */
        delete(at: number, count?: number): void;
    }
    /**
     *
     */
    interface IDocumentEdit {
        /**
         * Stores a range in the document that represents the
         * content that should be replaced.
         */
        readonly range: IDocumentEditRange;
        /**
         * Stores the new text to be inserted into the document.
         */
        readonly text: string;
    }
    /**
     * An interface that represents a text range within the loaded document.
     * This interface is explicitly designed to be compatible with the Monaco
     * text editor API (and maybe others) to simplify integrations.
     */
    export interface IDocumentEditRange {
        /**
         * Stores the line number on which the range starts (starts at 0).
         */
        readonly startLineNumber: number;
        /**
         * Stores the column on which the range starts in line
         * `startLineNumber` (starts at 0).
         */
        readonly startColumn: number;
        /**
         * Stores the line number on which the range ends.
         */
        readonly endLineNumber: number;
        /**
         * Stores the Column on which the range ends in line
         * `endLineNumber`.
         */
        readonly endColumn: number;
    }
    export {};
}
declare namespace Truth {
    /**
     * A class that stores all the documents loaded into a
     * program, and the inter-dependencies between them.
     */
    class DocumentGraph {
        /** */
        constructor(program: Program);
        /**
         * Reads a Document from the specified URI.
         * The document is created and returned, asynchronously.
         */
        read(uri: string | Uri): Promise<Error | Document>;
        /**
         * Creates a temporary document that will exist only in memory.
         * The document may not be linked to other documents in the
         * graph.
         */
        create(): Document;
        /**
         * Creates a temporary document that will exist only in memory,
         * which is initialized with the specified source text. The document
         * may not be linked to other documents in the graph.
         */
        create(sourceText: string): Document;
        /**
         * Creates a document that was read from the specified URI,
         * with the specified sourceText. If the content still needs to be
         * read from a URI, use the .read() method.
         */
        create(uri: Uri | string, sourceText: string): Document;
        /**
         * Blocks execution until all queued IO operations have completed.
         */
        await(): Promise<void>;
        /**
         * @returns The document loaded into this graph
         * with the specified URI.
         */
        get(uri: string | Uri): Document | null;
        /**
         * @returns A boolean value that indicates whether
         * the specified Document has been loaded into
         * this DocumentGraph.
         */
        has(param: Uri | Document): boolean;
        /**
         * @returns An array containing all documents loaded into this
         * DocumentGraph. The array returned is sorted topologically
         * from left to right, so that forward traversals are guaranteed
         * to not cause dependency conflicts.
         */
        each(): Document[];
        /**
         * Deletes a document that was previously loaded into the compiler.
         * Intended to be called by the host environment when a file changes.
         */
        delete(target: Document | Uri): void;
        /**
         * Removes all documents from this graph.
         */
        clear(): void;
        /**
         * @returns An array containing the dependencies
         * associated with the specified document. The returned
         * array is sorted in the order in which the dependencies
         * are defined in the document.
         */
        getDependencies(doc: Document): Document[];
        /**
         * @returns An array containing the dependents
         * associated with the specified document.
         */
        getDependents(doc: Document): Document[];
        /**
         * Attempts to add a link from one document to another,
         * via the specified URI. If there is some reason why the
         * link cannot be established, (circular references, bad
         * URIs), no link is added, and a fault is reported.
         */
        private tryLink;
        /**
         * An array of functions that should be executed when
         * all outstanding async operations have completed.
         */
        private waitFns;
        /**
         * Counts the number of async operations in progress.
         */
        private asyncCount;
        /**
         * Checks to see if the addition of a reference between the two
         * specified documents would result in a document graph with
         * circular relationships.
         *
         * The algorithm used performs a depth-first dependency search,
         * starting at the candidateTo. If the traversal pattern is able to
         * make its way to candidateFrom, it can be concluded that the
         * addition of the proposed reference would result in a cyclical
         * relationship.
         */
        private wouldCreateCycles;
        /**
         * Adds a dependency between two documents in the graph.
         * If a dependency between the two documents already exists,
         * the reference count of the dependency is incremented.
         * This method is executed only after other methods have
         * indicated that the addition of the link will not cause conflict.
         */
        private link;
        /**
         * Removes a dependency between two documents in the graph.
         * If the reference count of the dependency is greater than 1, the
         * the reference count is decremented instead of the dependency
         * being removed completely.
         */
        private unlink;
        /**
         * A map of documents loaded into the graph,
         * indexed by their URIs.
         */
        private readonly documents;
        /**
         * A map of each document's dependencies.
         */
        private readonly dependencies;
        /**
         * A map of the documents that depend on each document.
         */
        private readonly dependents;
        /** */
        private readonly program;
        /**
         * Converts the contents of this DocumentGraph to a
         * string representation, useful for testing purposes.
         */
        toString(): string;
    }
}
declare namespace Truth {
    /**
     * @internal
     * Stores information about a document's header.
     */
    class DocumentHeader {
        /** */
        constructor(document: Document);
        /**
         * Forces the header to be recomputed, by scanning
         * the statements in the underlying document.
         *
         * If the header has changed, the method runs the
         * necessary hooks to notify subscribers of hooks
         * any added or removed.
         */
        recompute(): void;
        /**
         * @returns The document reference URI that corresponds
         * to the specified statement. Returns null in the case when
         * the specified statement is not a part of the header.
         */
        getHeaderUri(statement: Statement): Uri | null;
        /**
         * Stores a map of the URIs referenced in the header of this
         * document, which are indexed by the statement in which
         * the URI is found.
         */
        private readonly uriMap;
        /** */
        private readonly document;
    }
}
declare namespace Truth {
    /**
     * Stores the options for the line parser.
     */
    interface ILineParserOptions {
        readonly readPatterns?: boolean;
        readonly readUris?: boolean;
    }
    /**
     * Parses a single line of Truth code, and returns
     * a Line object that contains information about
     * what was read.
     */
    class LineParser {
        /**
         * Generator function that yields all statements
         * (unparsed lines) of the given source text.
         */
        static read(fullSource: string): Generator<string, void, unknown>;
        /**
         * Main entry point for parsing a single line and producing a
         * RawStatement object.
         *
         * The parsing algorithm is some kind of quasi-recusive descent with
         * lookheads and backtracking in some places to make the logic easier
         * to follow. Technically, it's probably some mash-up of LL(k) & LALR.
         * Maybe if I blew 4 years of my life in some silly Comp Sci program
         * instead of dropping out of high school I could say for sure.
         */
        static parse(lineText: string, options?: ILineParserOptions): Line;
        /** */
        private constructor();
    }
}
declare namespace Truth {
    /**
     * Placeholder object to mark the position of
     * an anonymous type within a statement.
     */
    class Anon {
        /**
         * @internal
         * No-op property used for debugging
         * purposes, and also to dodge structural
         * type compatibility bugs in TypeScript.
         */
        readonly id: number;
        /** */
        toString(): string;
    }
}
declare namespace Truth {
    /**
     * Stores information about a line, after being parsed.
     * A Line is different from a Statement in that it has no
     * relationship to a Document.
     */
    class Line {
        readonly sourceText: string;
        readonly indent: number;
        readonly declarations: BoundaryGroup<DeclarationSubject>;
        readonly annotations: BoundaryGroup<AnnotationSubject>;
        readonly sum: string;
        readonly jointPosition: number;
        readonly flags: LineFlags;
        readonly faultType: Readonly<FaultType<Statement>> | null;
        /*** */
        constructor(sourceText: string, indent: number, declarations: BoundaryGroup<DeclarationSubject>, annotations: BoundaryGroup<AnnotationSubject>, sum: string, jointPosition: number, flags: LineFlags, faultType: Readonly<FaultType<Statement>> | null);
    }
    /**
     * A bit field enumeration used to efficiently store
     * meta data about a Line (or a Statement) object.
     */
    enum LineFlags {
        none = 0,
        isRefresh = 1,
        isVacuous = 2,
        isComment = 4,
        isWhitespace = 8,
        isDisposed = 16,
        isCruft = 32,
        hasUri = 64,
        hasTotalPattern = 128,
        hasPartialPattern = 256,
        hasPattern = 512
    }
}
declare namespace Truth {
    /**
     * Stakes out starting and ending character positions
     * of subjects within a given region.
     */
    class BoundaryGroup<TSubject> {
        /** */
        constructor(boundaries: Boundary<TSubject>[]);
        /** */
        [Symbol.iterator](): Generator<Boundary<TSubject>, void, unknown>;
        /** */
        eachSubject(): Generator<TSubject, void, unknown>;
        /** */
        inspect(offset: number): TSubject | null;
        /** */
        first(): Boundary<TSubject> | null;
        /** Gets the number of entries defined in the bounds. */
        get length(): number;
        /** */
        private readonly entries;
    }
    /** */
    class Boundary<TSubject> {
        readonly offsetStart: number;
        readonly offsetEnd: number;
        readonly subject: TSubject;
        constructor(offsetStart: number, offsetEnd: number, subject: TSubject);
    }
}
declare namespace Truth {
    /**
     *
     */
    class Statement {
        /**
         * @internal
         * Logical clock value used to make chronological
         * creation-time comparisons between Statements.
         */
        readonly stamp: VersionStamp;
        /**
         * @internal
         */
        constructor(document: Document, text: string);
        readonly programStamp: VersionStamp;
        /**
         *
         */
        private eachParseFault;
        /**
         * Gets whether the joint operator exists at the
         * end of the statement, forcing the statement's
         * declarations to be "refresh types".
         */
        get isRefresh(): boolean;
        /**
         * Gets whether the statement contains nothing
         * other than a single joint operator.
         */
        get isVacuous(): boolean;
        /**
         * Gets whether the statement is a comment.
         */
        get isComment(): boolean;
        /**
         * Gets whether the statement contains
         * no non-whitespace characters.
         */
        get isWhitespace(): boolean;
        /**
         * Gets whether the statement is a comment or whitespace.
         */
        get isNoop(): boolean;
        /**
         * Gets whether the statement has been removed from it's
         * containing document. Removal occurs after the statement
         * has been invalidated. Therefore, this property will be false
         * before the invalidation phase has occured, even if it will be
         * disposed in the current edit transaction.
         */
        get isDisposed(): boolean;
        /**
         *
         */
        get isCruft(): boolean;
        /** @internal */
        private flags;
        /** */
        readonly faults: readonly Fault[];
        /** Stores a reference to the document that contains this statement. */
        readonly document: Document;
        /** Stores the indent level of the statement. */
        readonly indent: number;
        /**
         * Stores the set of objects that are contained by this Statement,
         * and are marked as cruft. Note that the only Statement object
         * that may be located in this set is this Statement object itself.
         */
        readonly cruftObjects: ReadonlySet<Statement | Span | InfixSpan>;
        /**
         * Gets the line number of this statement in it's containing
         * document, or -1 if the statement is disposed and/or is not
         * in the document.
         */
        get index(): number;
        /**
         * Gets an array of spans in that represent the declarations
         * of this statement, excluding those that have been marked
         * as object-level cruft.
         */
        get declarations(): readonly Span[];
        /**
         * Stores the array of spans that represent the declarations
         * of this statement, including those that have been marked
         * as object-level cruft.
         */
        readonly allDeclarations: readonly Span[];
        /**
         * Gets a list of all infixes defined in the pattern of this statement.
         */
        get infixSpans(): readonly InfixSpan[];
        private _infixSpans;
        /**
         * Gets an array of spans in that represent the annotations
         * of this statement, from left to right, excluding those that
         * have been marked as object-level cruft.
         */
        get annotations(): readonly Span[];
        /**
         * Stores the array of spans that represent the annotations
         * of this statement, including those that have been marked
         * as object-level cruft.
         */
        readonly allAnnotations: readonly Span[];
        /**
         * Gets an array of spans in that represent both the declarations
         * and the annotations of this statement, excluding those that have
         * been marked as object-level cruft.
         */
        get spans(): Span[];
        /**
         *
         */
        get allSpans(): Span[];
        /**
         * Stores the position at which the joint operator exists
         * in the statement. A negative number indicates that
         * the joint operator does not exist in the statement.
         */
        readonly jointPosition: number;
        /**
         * Stores the unprocessed text content of the statement,
         * as it appears in the document.
         */
        readonly sourceText: string;
        /**
         * Stores the statement's textual *sum*, which is the
         * raw text of the statement's annotations, with whitespace
         * trimmed. The sum is suitable as an input to a total
         * pattern.
         */
        readonly sum: string;
        /**
         * Gets a boolean value indicating whether or not the
         * statement contains a declaration of a pattern.
         */
        get hasPattern(): boolean;
        /**
         * @internal
         * Marks the statement as being removed from it's containing document.
         */
        dispose(): void;
        /**
         * @returns The kind of StatementRegion that exists
         * at the given character offset within the Statement.
         */
        getRegion(offset: number): StatementRegion;
        /**
         *
         */
        getSubject(offset: number): Span | null;
        /**
         * @returns A span to the declaration subject at the
         * specified offset, or null if there is none was found.
         */
        getDeclaration(offset: number): Span | null;
        /**
         * @returns A span to the annotation subject at the
         * specified offset, or null if there is none was found.
         */
        getAnnotation(offset: number): Span | null;
        /**
         * @returns A string containing the inner comment text of
         * this statement, excluding the comment syntax token.
         * If the statement isn't a comment, an empty string is returned.
         */
        getCommentText(): string;
        /**
         * Converts the statement to a formatted string representation.
         */
        toString(includeIndent?: boolean): string;
    }
    /**
     * Defines the areas of a statement that are significantly
     * different when performing inspection.
     */
    enum StatementRegion {
        /**
         * Refers to the area within a comment statement,
         * or the whitespace preceeding a non-no-op.
         */
        void = 0,
        /**
         * Refers to the area in the indentation area.
         */
        whitespace = 1,
        /**
         * Refers to the
         */
        pattern = 2,
        /** */
        declaration = 3,
        /** */
        annotation = 4,
        /** */
        declarationVoid = 5,
        /** */
        annotationVoid = 6
    }
}
declare namespace Truth {
    /**
     *
     */
    class Pattern {
        /**
         *
         */
        readonly units: readonly (RegexUnit | Infix)[];
        /**
         * Stores whether the pattern is considered to be "Total"
         * or "Partial". Total patterns must match an entire annotation
         * set (the entire strip of content to the right of a joint, after
         * being trimmed). Partial patterns match individually
         * specified subjects (separated by commas).
         */
        readonly isTotal: boolean;
        /**
         * Stores a hash which is computed from the set of
         * annotations specified to the right of the pattern.
         */
        readonly hash: string;
        /** @internal */
        constructor(
        /**
         *
         */
        units: readonly (RegexUnit | Infix)[], 
        /**
         * Stores whether the pattern is considered to be "Total"
         * or "Partial". Total patterns must match an entire annotation
         * set (the entire strip of content to the right of a joint, after
         * being trimmed). Partial patterns match individually
         * specified subjects (separated by commas).
         */
        isTotal: boolean, 
        /**
         * Stores a hash which is computed from the set of
         * annotations specified to the right of the pattern.
         */
        hash: string);
        /**
         * Stores whether the internal regular expression
         * was compiled successfully.
         */
        readonly isValid: boolean;
        /**
         * Recursively enumerates through this Pattern's unit structure.
         */
        eachUnit(): Generator<RegexUnit | Infix, void, unknown>;
        /**
         * @returns A boolean value that indicates whether
         * this Pattern has at least one infix, of any type.
         */
        hasInfixes(): boolean;
        /**
         * @returns An array containing the infixes of the
         * specified type that are defined in this Pattern.
         * If the argument is omitted, all infixes of any type
         * defined on this Pattern are returned.
         */
        getInfixes(type?: InfixFlags): Infix[];
        /**
         * Performs an "expedient" test that determines whether the
         * specified input has a chance of being matched by this pattern.
         * The check is considered expedient, rather than thorough,
         * because any infixes that exist in this pattern are replaced
         * with "catch all" regular expression sequence, rather than
         * embedding the pattern associated with the type specified
         * in the infix.
         */
        test(input: string): boolean;
        /**
         * Executes the pattern (like a function) using the specified
         * string as the input.
         *
         * @returns A ReadonlyMap whose keys align with the infixes
         * contained in this Pattern, and whose values are strings that
         * are the extracted "inputs", found in the place of each infix.
         * If this Pattern has no infixes, an empty map is returned.
         */
        exec(patternParameter: string): ReadonlyMap<Infix, string>;
        /** */
        private compiledRegExp;
        /**
         * Converts this Pattern to a string representation.
         * (Note that the serialized pattern cannot be used
         * as a parameter to a JavaScript RegExp object.)
         *
         * @param includeHashPrefix If true, the Pattern's hash
         * prefix will be prepended to the serialized result.
         */
        toString(includeHashPrefix?: boolean): string;
    }
}
declare namespace Truth {
    /** */
    class PatternPrecompiler {
        /**
         * Compiles the specified pattern into a JS-native
         * RegExp object that can be used to execute regular
         * expression pre-matching (i.e. checks that essentially
         * ignore any infixes that the pattern may have).
         */
        static exec(pattern: Pattern): RegExp | null;
    }
}
declare namespace Truth {
    /**
     * Ambient unifier for all PatternUnit instances
     */
    abstract class RegexUnit {
        readonly quantifier: RegexQuantifier | null;
        constructor(quantifier: RegexQuantifier | null);
        /** */
        abstract toString(): string;
    }
    /**
     *
     */
    class RegexSet extends RegexUnit {
        readonly knowns: readonly RegexSyntaxKnownSet[];
        readonly ranges: readonly RegexCharRange[];
        readonly unicodeBlocks: readonly string[];
        readonly singles: readonly string[];
        readonly isNegated: boolean;
        readonly quantifier: RegexQuantifier | null;
        /** */
        constructor(knowns: readonly RegexSyntaxKnownSet[], ranges: readonly RegexCharRange[], unicodeBlocks: readonly string[], singles: readonly string[], isNegated: boolean, quantifier: RegexQuantifier | null);
        /** */
        toString(): string;
        /**
         * @internal
         */
        toAlphabet(): Alphabet;
    }
    /**
     *
     */
    class RegexCharRange {
        readonly from: number;
        readonly to: number;
        constructor(from: number, to: number);
    }
    /**
     *
     */
    class RegexGroup extends RegexUnit {
        /**
         *
         */
        readonly cases: readonly (readonly RegexUnit[])[];
        readonly quantifier: RegexQuantifier | null;
        constructor(
        /**
         *
         */
        cases: readonly (readonly RegexUnit[])[], quantifier: RegexQuantifier | null);
        /** */
        toString(): string;
    }
    /**
     * A pattern "grapheme" is a pattern unit class that
     * represents:
     *
     * a) A "Literal", which is a single unicode-aware character,
     * with possible representations being an ascii character,
     * a unicode character, or an ascii or unicode escape
     * sequence.
     *
     * or b) A "Special", which is a sequence that matches
     * something other than the character specified,
     * such as . \b \s
     */
    class RegexGrapheme extends RegexUnit {
        readonly grapheme: string;
        readonly quantifier: RegexQuantifier | null;
        constructor(grapheme: string, quantifier: RegexQuantifier | null);
        /** */
        toString(): string;
    }
    /**
     * A Regex "Sign" refers to an escape sequence that refers
     * to one other character, as opposed to that character
     * being written directly in the parse stream.
     */
    class RegexSign extends RegexUnit {
        readonly sign: RegexSyntaxSign;
        readonly quantifier: RegexQuantifier | null;
        constructor(sign: RegexSyntaxSign, quantifier: RegexQuantifier | null);
        /** */
        toString(): string;
    }
    /**
     * A pattern unit class that represents +, *,
     * and explicit quantifiers such as {1,2}.
     */
    class RegexQuantifier {
        /**
         * Stores the lower bound of the quantifier,
         * or the fewest number of graphemes to be matched.
         */
        readonly min: number;
        /**
         * Stores the upper bound of the quantifier,
         * or the most number of graphemes to be matched.
         */
        readonly max: number;
        /**
         * Stores whether the the quantifier is restrained,
         * in that it matches the fewest possible number
         * of characters.
         *
         * (Some regular expression flavours awkwardly
         * refer to this as "non-greedy".)
         */
        readonly restrained: boolean;
        constructor(
        /**
         * Stores the lower bound of the quantifier,
         * or the fewest number of graphemes to be matched.
         */
        min: number, 
        /**
         * Stores the upper bound of the quantifier,
         * or the most number of graphemes to be matched.
         */
        max: number, 
        /**
         * Stores whether the the quantifier is restrained,
         * in that it matches the fewest possible number
         * of characters.
         *
         * (Some regular expression flavours awkwardly
         * refer to this as "non-greedy".)
         */
        restrained: boolean);
        /**
         * Converts the regex quantifier to an optimized string.
         */
        toString(): string;
    }
}
declare namespace Truth {
    /**
     * A class that represents a portion of the content
     * within an Infix that spans a type reference.
     */
    class Infix {
        /**
         * Stores the left-most character position of the Infix
         * (before the delimiter), relative to the containing statement.
         */
        readonly offsetStart: number;
        /**
         * Stores the left-most character position of the Infix
         * (after the delimiter), relative to the containing statement.
         */
        readonly offsetEnd: number;
        /**
         * Stores the Bounds object that marks out the positions
         * of the identifiers in the Infix that are located before
         * any Joint operator.
         */
        readonly lhs: BoundaryGroup<Identifier>;
        /**
         * Stores the Bounds object that marks out the positions
         * of the identifiers in the Infix that are located after
         * any Joint operator.
         */
        readonly rhs: BoundaryGroup<Identifier>;
        /** */
        readonly flags: InfixFlags;
        constructor(
        /**
         * Stores the left-most character position of the Infix
         * (before the delimiter), relative to the containing statement.
         */
        offsetStart: number, 
        /**
         * Stores the left-most character position of the Infix
         * (after the delimiter), relative to the containing statement.
         */
        offsetEnd: number, 
        /**
         * Stores the Bounds object that marks out the positions
         * of the identifiers in the Infix that are located before
         * any Joint operator.
         */
        lhs: BoundaryGroup<Identifier>, 
        /**
         * Stores the Bounds object that marks out the positions
         * of the identifiers in the Infix that are located after
         * any Joint operator.
         */
        rhs: BoundaryGroup<Identifier>, 
        /** */
        flags: InfixFlags);
        /**
         * Gets whether this Infix is of the "pattern" variety.
         */
        get isPattern(): boolean;
        /**
         * Gets whether this Infix is of the "portability" variety.
         */
        get isPortability(): boolean;
        /**
         * Gets whether this Infix is of the "population" variety.
         */
        get isPopulation(): boolean;
        /**
         * Gets whether this Infix has the "nominal" option set.
         */
        get isNominal(): boolean;
        /** */
        toString(): string;
    }
    /**
     *
     */
    enum InfixFlags {
        none = 0,
        /**
         * Indicates that the joint was specified within
         * the infix. Can be used to determine if the infix
         * contains some (erroneous) syntax resembing
         * a refresh type, eg - /<Type : >/
         */
        hasJoint = 1,
        /**
         * Indicates that the </Pattern/> syntax was
         * used to embed the patterns associated
         * with a specified type.
         */
        pattern = 2,
        /**
         * Indicates that the infix is of the "portabiity"
         * variety, using the syntax < : Type>
         */
        portability = 4,
        /**
         * Indicates that the infix is of the "popuation"
         * variety, using the syntax <Declaration : Annotation>
         * or <Declaration>
         */
        population = 8,
        /**
         * Indicates that the <<Double>> angle bracket
         * syntax was used to only match named types,
         * rather than aliases.
         */
        nominal = 16
    }
}
declare namespace Truth {
    /**
     * A class that represents a single subject in a Statement.
     * Consumers of this class should not expect Subject objects
     * to be long-lived, as they are discarded regularly after edit
     * transactions complete.
     */
    class Identifier {
        /** */
        constructor(text: string);
        /**
         * Stores a full string representation of the subject,
         * as it appears in the document.
         */
        readonly fullName: string;
        /**
         * Stores a string representation of the name of the
         * type to which the subject refers, without any List
         * operator suffix.
         */
        readonly typeName: string;
        /** */
        readonly isList: boolean;
        /**
         * Converts this Subject to it's string representation.
         * @param escape If true, preserves any necessary
         * escaping required to ensure the identifier string
         * is in a parsable format.
         */
        toString(escape?: IdentifierEscapeKind): string;
    }
    /**
     * An enumeration that describes the various ways
     * to handle escaping when serializing an identifier.
     * This enumeration is used to address the differences
     * in the way identifiers can be serialized, which can
     * depend on whether the identifier is a declaration or
     * an annotation.
     */
    const enum IdentifierEscapeKind {
        none = 0,
        declaration = 1,
        annotation = 2
    }
}
declare namespace Truth {
    /**
     * A class that represents a position in a statement.
     */
    class Span {
        /**
         * Stores a reference to the Statement that contains this Span.
         */
        readonly statement: Statement;
        /**
         * Stores the subject, and the location of it in the document.
         */
        readonly boundary: Boundary<Subject>;
        /**
         * @internal
         * Logical clock value used to make chronological
         * creation-time comparisons between Spans.
         */
        readonly stamp: VersionStamp;
        /**
         * @internal
         */
        constructor(
        /**
         * Stores a reference to the Statement that contains this Span.
         */
        statement: Statement, 
        /**
         * Stores the subject, and the location of it in the document.
         */
        boundary: Boundary<Subject>);
        /**
         * Stores a string representation of this Span, useful for debugging.
         */
        private readonly name;
        /**
         * Gets the Infixes stored within this Span, in the case when
         * the Span corresponds to a Pattern. In other cases, and
         * empty array is returned.
         */
        get infixes(): readonly Infix[];
        private _infixes;
        /** */
        eachDeclarationForInfix(infix: Infix): Generator<InfixSpan, void, unknown>;
        /** */
        eachAnnotationForInfix(infix: Infix): Generator<InfixSpan, void, unknown>;
        /** */
        private queryInfixSpanTable;
        /** */
        private readonly infixSpanTable;
        /**
         * Gets an array of statements that represent the statement
         * containment progression, all the way back to the containing
         * document.
         */
        get ancestry(): readonly Statement[];
        private _ancestry;
        /**
         * Splits apart the groups subjects specified in the containing
         * statement's ancestry, and generates a series of spines,
         * each indicating a separate pathway of declarations through
         * the ancestry that reach the location in the document
         * referenced by this global span object.
         *
         * The generated spines are referentially opaque. Running this
         * method on the same Span object always returns the same
         * Spine instance.
         */
        factor(): readonly Spine[];
        /**  */
        private factoredSpines;
        /**
         * Gets a boolean value that indicates whether this Span is considered
         * object-level cruft, and should therefore be ignored during type analysis.
         */
        get isCruft(): boolean;
        /**
         * Converts this Span to a string representation.
         *
         * @param includeHashPrefix If the subject inside this Span is a
         * Pattern, and this argument is true, the Pattern's hash prefix
         * will be prepended to the serialized result.
         */
        toString(includeHashPrefix?: boolean): string;
    }
}
declare namespace Truth {
    /**
     * A class that manages an array of Span objects that
     * represent a specific spine of declarations, starting at
     * a document, passing through a series of spans,
     * and ending at a tip span.
     */
    class Spine {
        /** */
        constructor(vertebrae: (Span | Statement)[]);
        /** Stores the last span in the array of segments. */
        readonly tip: Span;
        /** */
        get statement(): Statement;
        /** Gets a reference to the document that sits at the top of the spine. */
        get document(): Document;
        /** Stores an array of the Spans that compose the Spine. */
        readonly vertebrae: readonly (Span | CruftMarker)[];
    }
    /**
     * A class that acts as a stand-in for a statement that has been
     * marked as cruft, suitable for usage in a Spine.
     */
    class CruftMarker {
        readonly statement: Statement;
        /** @internal */
        constructor(statement: Statement);
        /**
         * Converts this cruft marker to a string representation,
         * which is derived from a hash calculated from this
         * marker's underlying statement.
         */
        toString(): string;
    }
}
declare namespace Truth {
    /** */
    type Subject = DeclarationSubject | AnnotationSubject;
    /**
     * Stores a map of the character offsets within a Statement
     * that represent the starting positions of the statement's
     * declarartions.
     */
    type DeclarationSubject = Identifier | Pattern | Uri | Anon;
    /**
     * Stores a map of the character offsets within a Statement
     * that represent the starting positions of the statement's
     * annotations.
     */
    type AnnotationSubject = Identifier;
    /** */
    class SubjectSerializer {
        /**
         * Universal method for serializing a subject to a string,
         * useful for debugging and supporting tests.
         */
        static forExternal(target: SubjectContainer, escapeStyle?: IdentifierEscapeKind): string;
        /**
         * Serializes a subject, or a known subject containing object for internal use.
         */
        static forInternal(target: SubjectContainer): string;
        /** */
        private static resolveSubject;
        /** */
        private static serialize;
    }
    /** Identifies a Type that is or contains a Subject. */
    type SubjectContainer = Subject | Boundary<Subject> | Span | InfixSpan;
}
declare namespace Truth {
    /**
     *
     */
    class HyperGraph {
        private readonly program;
        /**
         * @internal
         * Test-only field used to disable the functions of the Graph.
         */
        static disabled: boolean | undefined;
        /** @internal */
        constructor(program: Program);
        /**
         * Reads a root Node with the specified
         * name out of the specified document.
         */
        read(document: Document, name: string): Node | null;
        /**
         * @returns An array containing the node objects
         * that are defined at the root level of the specified
         * document.
         */
        readRoots(document: Document): Generator<Node, void, unknown>;
        /**
         * Handles a document-level exclusion, which is the removal
         * of a section of Spans within a document, or possibly the
         * entire document itself.
         */
        private exclude;
        /**
         * Performs a revalidation of the Nodes that correspond to the
         * input argument.
         *
         * @param root The root object under which which revalidation
         * should occur. In the case when a Document instance is passed,
         * all Nodes present within the document are revalidated. In the
         * case when a Statement instance is passed, the Nodes that
         * correspond to the Statement, and all of it's contents are
         * revalidated.
         */
        private include;
        /** */
        private log;
        /**
         * Performs setup for the invalidate and revalidate methods.
         */
        private methodSetup;
        /**
         * Reports any Node-level faults detected.
         */
        private sanitize;
        /**
         * Stores a map of all nodes that
         * have been loaded into the program, indexed
         * by a string representation of it's URI.
         */
        private readonly nodeIndex;
        /**
         * Stores a GraphTransaction instance in the case
         * when an edit transaction is underway.
         */
        private activeTransactions;
        /**
         * Serializes the Graph into a format suitable
         * for debugging and comparing against baselines.
         */
        toString(): string;
    }
}
declare namespace Truth {
    /**
     * A class that represents a single Node contained within
     * the Program's Graph. Nodes are long-lived, referentially
     * significant objects that persist between edit frames.
     *
     * Nodes are connected in a graph not by edges, but by
     * HyperEdges. A HyperEdge (from graph theory) is similar
     * to a directed edge in that it has a single predecessor,
     * but differs in that it has multiple successors.
     *
     * It is necessary for Nodes to be connected to each other
     * in this way, in order for further phases in the pipeline
     * to execute the various kinds of polymorphic type
     * resolution.
     */
    export class Node {
        /** @internal */
        constructor(container: Node | null, declaration: Span | InfixSpan);
        /**
         * Removes this Node, and all its contents from the graph.
         */
        dispose(): void;
        /**
         * Removes the specified HyperEdge from this Node's
         * set of outbounds.
         *
         * @throws In the case when the specified HyperEdge is
         * not owned by this Node.
         */
        disposeEdge(edge: HyperEdge): void;
        /** */
        readonly container: Node | null;
        /**
         * In the case when this node is a direct descendent of a
         * pattern node, and that pattern has population infixes,
         * and this node directly corresponds to one of those infixes,
         * this property gets a reference to said corresponding infix.
         */
        get containerInfix(): Infix | null;
        /** */
        readonly name: string;
        /** */
        readonly subject: Subject;
        /** */
        get uri(): Uri;
        private lastUri;
        private readonly typePath;
        /** Stores the document that contains this Node. */
        readonly document: Document;
        /** */
        readonly stamp: VersionStamp;
        /**
         * Stores whether this Node has been explicitly defined as
         * a list intrinsic.
         */
        readonly isListIntrinsic: boolean;
        /**
         * Gets whether this Node has been explicitly defined as a list
         * extrinsic. It is worth noting that this property in and of itself is
         * not sufficient to determine whether any corresponding type is
         * actually a list (full type analysis is required to make this conclusion).
         */
        get isListExtrinsic(): boolean;
        /**
         * Gets a reference to the "opposite side of the list".
         *
         * If this Node represents a list intrinsic type, this property gets
         * a reference to the Node that represents the corresponding
         * extrinsic side.
         *
         * If this Node represents anything that *isn't* a list intrinsic type,
         * the property gets a reference to the Node that represents the
         * corresponding intrinsic side (whether the node is a list or not).
         *
         * Gets null in the case when there is no corresponding list intrinsic
         * or extrinsic Node to connect.
         */
        get intrinsicExtrinsicBridge(): Node | null;
        /**
         * Stores the set of declaration-side Span instances that
         * compose this Node. If this the size of this set were to
         * reach zero, the Node would be marked for deletion.
         * (Node cleanup uses a reference counted collection
         * mechanism that uses the size of this set as it's guide).
         *
         * Note that although the type of this field is defined as
         * "Set<Span | InfixSpan>", in practice, it is either a set
         * of Span instances, or a set containing one single
         * InfixSpan instance. This is because it's possible to have
         * fragments of a type declared in multiple places in
         * a document, however, InfixSpans can only exist in one
         * place.
         */
        get declarations(): ReadonlySet<Span | InfixSpan>;
        private readonly _declarations;
        /** */
        addDeclaration(span: Span | InfixSpan): void;
        /** */
        removeDeclaration(span: Span | InfixSpan): void;
        /**
         * Gets an array containing the statements that
         * contain this Node.
         */
        get statements(): readonly Statement[];
        /**
         * Gets a readonly map of Nodes that are contained
         * by this node in the containment hierarchy.
         */
        get contents(): NodeMap;
        private readonly _contents;
        /**
         * Gets a readonly name of Nodes that are adjacent
         * to this Node in the containment hierarchy.
         */
        get adjacents(): NodeMap;
        /**
         * Gets a 2-dimensional array containing the names of
         * the portability infixes that have been defined within
         * this node, with the first dimension corresponding to
         * a unique portability infix, and the second dimension
         * corresponding to the names defined within that infix.
         *
         * For example, given the following pattern:
         * /< : A, B, C>< : D, E, F> : ???
         *
         * The following result would be produced:
         * [["A", "B", "C"], ["D", "E", "F"]]
         */
        get portabilityTargets(): readonly (readonly string[])[];
        private _portabilityTargets;
        /**
         * @returns A set of nodes that are matched by
         * patterns of adjacent nodes.
         *
         * (Note that this is possible because annotations
         * that have been applied to a pattern cannot be
         * polymorphic)
         */
        getPatternNodesMatching(nodes: Node[]): Node[];
        /**
         * Gets an immutable set of HyperEdges from adjacent
         * or contained Nodes that reference this Node.
         *
         * (The ordering of inbounds isn't important, as
         * they have no physical representation in the
         * document, which is why they're stored in a Set
         * rather than an array.)
         */
        get inbounds(): ReadonlySet<HyperEdge>;
        private readonly _inbounds;
        /**
         * Gets an array of HyperEdges that connect this Node to
         * others, being either adjacents, or Nodes that
         * exists somewhere in the containment hierarchy.
         */
        get outbounds(): readonly HyperEdge[];
        private readonly _outbounds;
        /**
         * @internal
         * Sorts the outbound HyperEdges, so that they're ordering
         * is consistent with the way their corresponding
         * annotations appear in the underlying document.
         */
        sortOutbounds(): void;
        /**
         * @internal
         * Adds a new edge to the node, or updates an existing one with
         * a new fragment.
         *
         * If no edge exists for the new fragment, a new one is created.
         */
        addEdgeFragment(fragment: Span | InfixSpan): void;
        /**
         *
         */
        addEdgeSuccessor(successorNode: Node): void;
        /**
         *
         */
        private enumerateOutbounds;
        /**
         * Enumerates upwards through the containment
         * hierarchy of the Nodes present in this Node's
         * containing document, yielding the adjacents at
         * every level, and then continues through to the
         * root level adjacents of each of the document's
         * dependencies.
         */
        enumerateContainment(): Generator<{
            sourceDocument: Document;
            container: Node | null;
            adjacents: NodeMap;
            longitudeDelta: number;
        }, void, unknown>;
        /**
         * @returns An array that stores the containment hierarchy
         * of the Nodes present in this Node's containing document,
         * yielding each containerof this Node.
         */
        get containment(): readonly Node[];
        private _containment;
        /** */
        removeEdgeSource(src: Span | InfixSpan): void;
        /** */
        toString(includePath?: boolean): string;
        /** */
        private addRootNode;
        /** */
        private removeRootNode;
        /** */
        private getRootNodes;
        /** */
        private static rootNodes;
    }
    type NodeMap = ReadonlyMap<string, Node>;
    export {};
}
declare namespace Truth {
    /**
     *
     */
    class NodeIndex {
        /** */
        constructor(program: Program);
        /**
         * Enumerates through all Node instances stored
         * in the index.
         */
        eachNode(): Generator<Node, void, unknown>;
        /**
         * Gets the number of nodes stored in the index.
         */
        get count(): number;
        /**
         * Updates the index, establishing a cached relationship
         * between the specified uri and the specified node.
         */
        set(uri: Uri | string, node: Node): void;
        /**
         * Updates the index by refreshing in the set of identifiers
         * that are associated with the specified node.
         */
        update(node: Node): void;
        /** */
        getNodeByUri(uri: Uri | string): Node | undefined;
        /**
         * @returns An array that contains the nodes that are associated
         * with the specified identifier that exist at or below the specified
         * depth. "Associated" means that the identifier is either equivalent
         * to the Node's main subject, or it is referenced in one of it's edges.
         */
        getNodesByIdentifier(identifer: string): Node[];
        /**
         * Removes the specified node from the index, if it exists.
         */
        delete(deadNode: Node): void;
        /**
         * @returns An array that contains the identifiers associated with
         * the specified Node.
         */
        getAssociatedIdentifiers(node: Node): string[];
        /**
         * Stores a map of all nodes that have been loaded into the program,
         * indexed by a string representation of it's URI.
         */
        private readonly uriToNodeMap;
        /**
         * Stores a map which is indexed by a unique identifier, and which as
         * values that are the nodes that use that identifier, either as a declaration
         * or an annotation.
         *
         * The purpose of this cache is to get a quick answer to the question:
         * "We added a new identifier at position X ... what nodes might possibly
         * have been affected by this?"
         */
        private readonly identifierToNodesMap;
        /**
         * Stores a map which is essentially a reverse of identifierToNodesMap.
         * This is so that when nodes need to be deleted or updated, we can
         * quickly find the place in identifierToNodesMap where the node has
         * been referenced.
         */
        private readonly nodesToIdentifiersMap;
        /**
         * Serializes the index into a format suitable
         * for debugging and comparing against baselines.
         */
        toString(): string;
    }
}
declare namespace Truth {
    /**
     * A HyperEdge connects an origin predecessor Node to a series of
     * successor Nodes. From graph theory, a "hyper edge" is different
     * from an "edge" in that it can have many successors:
     * https://en.wikipedia.org/wiki/Hypergraph
     */
    class HyperEdge {
        /**
         * The Node from where the HyperEdge connection begins.
         * For example, given the following document:
         *
         * Foo
         * 	Bar : Foo
         *
         * Two Node objects would be created, one for the first instance
         * of "Foo", and another for the instance of "Bar". A HyperEdge
         * would be created between "Bar" and "Foo", and it's
         * precedessor would refer to the Node representing the
         * occurence of "Bar".
         */
        readonly predecessor: Node;
        constructor(
        /**
         * The Node from where the HyperEdge connection begins.
         * For example, given the following document:
         *
         * Foo
         * 	Bar : Foo
         *
         * Two Node objects would be created, one for the first instance
         * of "Foo", and another for the instance of "Bar". A HyperEdge
         * would be created between "Bar" and "Foo", and it's
         * precedessor would refer to the Node representing the
         * occurence of "Bar".
         */
        predecessor: Node, source: Span | InfixSpan, successors: readonly Successor[]);
        /**
         * Attempts to add another fragment to the HyperEdge.
         * Reports a fault instead in the case when there is a
         * list conflict between the source provided and the
         * existing sources. (I.e. one of the sources is defined
         * as a list, and another is not).
         */
        addFragment(fragment: Span | InfixSpan): void;
        /**
         * Removes the specified annotation-side Span or InfixSpan
         * from this edge.
         */
        removeFragment(fragment: Span | InfixSpan): void;
        /** */
        clearFragments(): void;
        /**
         * Gets the set of annotation-side Spans or annotation-side
         * InfixSpans that are responsible for the conception of this
         * HyperEdge.
         *
         * The array contains either Span instances or InfixSpan instances,
         * but never both. In the case when the array stores Span instances,
         * the location of those Spans are potentially scattered across many
         * statements.
         */
        get fragments(): readonly (Span | InfixSpan)[];
        /** */
        private readonly fragmentsMutable;
        /**
         *
         */
        addSuccessor(node: Node, longitude: number): void;
        /**
         *
         */
        removeSuccessor(node: Node): void;
        /**
         * Stores all possible success Nodes to which the predecessor
         * Node is preemptively connected via this HyperEdge. The
         * connection is said to be preemptive, because the connection
         * might be ignored during polymorphic name resolution.
         */
        get successors(): readonly Successor[];
        /** */
        private readonly successorsMutable;
        /**
         * Gets whether this HyperEdge has no immediately resolvable
         * successors. This means that the subject being referred to by
         * this HyperEdge is either a type alias which will be matched by
         * a pattern, or just a plain old fault.
         */
        get isDangling(): boolean;
        /**
         * Gets a value that indicates whether the sources of the edge
         * causes incrementation of the list dimensionality of the type
         * that corresponnds to this HyperEdge's predecessor Node.
         *
         * (Note that all sources need to agree on this value, and the
         * necessary faults are generated to ensure that this is always
         * the case.)
         */
        get isList(): boolean;
        /**
         * The textual value of an Edge represents different things
         * depending on the Edge's *kind* property.
         *
         * If *kind* is *literal*, the textual value is the given name
         * of the type being referenced, for example "String" or
         * "Employee".
         *
         * If *kind* is *categorical*, the textual value is an alias that
         * will later be resolved to a specific type, or set of types, for
         * example "10cm" (presumably resolving to "Unit") or
         * "user@email.com" (presumable resolving to "Email").
         *
         * If *kind* is *summation* , the textual value is the raw
         * literal text of the annotation found in the document. For
         * example, if the document had the content:
         *
         * Foo, Bar : foo, bar
         *
         * This would result in two nodes named "Foo" and "Bar",
         * each with their own HyperEdges whose textual values
         * would both be: "foo, bar". In the case of a fragmented
         * type, the last sum in document order is counted as the
         * textual value. For example, given the following
         * document:
         *
         * T : aa, bb
         * T : xx, yy
         *
         * The "T" node would have a HyperEdge with a textual
         * value being "xx, yy".
         *
         * The *-overlay kinds have not yet been implemented.
         */
        readonly identifier: Identifier;
        /**
         * Gets a value that indicates the specific part of the
         * predecessor where this HyperEdge begins.
         */
        get predecessorOrigin(): HyperEdgeOrigin;
        /**
         * @returns A string representation of this HyperEdge,
         * suitable for debugging and testing purposes.
         */
        toString(): string;
    }
    /**
     *
     */
    class Successor {
        readonly node: Node;
        /**
         * The the number of levels of depth in the containment
         * hierarchy that need to be crossed in order for the containing
         * HyperEdge to be established between the predecessor and
         * this successor.
         */
        readonly longitude: number;
        constructor(node: Node, 
        /**
         * The the number of levels of depth in the containment
         * hierarchy that need to be crossed in order for the containing
         * HyperEdge to be established between the predecessor and
         * this successor.
         */
        longitude: number);
        readonly stamp: VersionStamp;
    }
    /**
     * Indicates the place in a statement where a HyperEdge starts.
     * (HyperEdges can start either at the statement level, or within
     * various kinds of infixes.)
     */
    enum HyperEdgeOrigin {
        statement = 0,
        populationInfix = 1,
        portabilityInfix = 2,
        patternInfix = 3
    }
}
declare namespace Truth {
    /**
     * A class that marks out the location of an infix Identifer within
     * it's containing Infix, it's containing Span, and then it's containing
     * Statement, Document, and Program.
     */
    class InfixSpan {
        readonly containingSpan: Span;
        readonly containingInfix: Infix;
        readonly boundary: Boundary<Identifier>;
        constructor(containingSpan: Span, containingInfix: Infix, boundary: Boundary<Identifier>);
        /**
         * Gets the Statement that contains this Anchor.
         */
        get statement(): Statement;
        /**
         * Gets a boolean value that indicates whether this InfixSpan
         * is considered object-level cruft, and should therefore be
         * ignored during type analysis.
         */
        get isCruft(): boolean;
    }
}
declare namespace Truth {
    /**
     * A worker class that handles the construction of networks
     * of Parallel instances, which are eventually transformed
     * into type objects.
     */
    class ConstructionWorker {
        private readonly program;
        /** */
        constructor(program: Program);
        /**
         * Constructs the corresponding Parallel instances for
         * all specified types that exist within the provided Document,
         * or below the provided SpecifiedParallel.
         */
        excavate(from: Document | SpecifiedParallel): void;
        /** */
        private readonly excavated;
        /**
         * Constructs the fewest possible Parallel instances
         * to arrive at the type specified by the directive.
         */
        drill(directive: Uri): Parallel | null;
        /** */
        private drillFromUri;
        /**
         * An entrypoint into the drill function that operates
         * on a Node instead of a Uri. Essentially, this method
         * calls "drillFromUri()" safely (meaning that it detects
         * circular invokations, and returns null in these cases).
         */
        private drillFromNode;
        /** A call queue used to prevent circular drilling. */
        private readonly drillQueue;
        /**
         * "Raking" a Parallel is the process of deeply traversing it's
         * Parallel Graph (depth first), and for each visited Parallel,
         * deeply traversing it's Base Graph as well (also depth first).
         * Through this double-traversal process, the Parallel's edges
         * are constructed into a traversable graph.
         */
        private rake;
        /**
         * Recursive function that digs through the parallel graph,
         * and rakes all SpecifiedParallels that are discovered.
         */
        private rakeParallelGraph;
        /**
         * Splitter method that rakes both a pattern and a non-pattern
         * containing SpecifiedParallel.
         */
        private rakeSpecifiedParallel;
        /**
         * Recursively follows the bases of the specified source Node.
         * Parallel instances are created for any visited Node instance
         * that does not have one already created.
         * Although the algorithm is careful to avoid circular bases, it's
         * too early in the processing pipeline to report these circular
         * bases as faults. This is because polymorphic name resolution
         * needs to take place before the system can be sure that a
         * seemingly-circular base structure is in fact what it seems.
         * True circular base detection is therefore handled at a future
         * point in the pipeline.
         */
        private rakeBaseGraph;
        /**
         * Finds the set of bases that should be applied to the provided
         * pattern-containing SpecifiedParallel instance, and attempts
         * to have them applied.
         */
        private rakePatternBases;
        /**
         * A generator function that works its way upwards, starting at the
         * provided SpecifiedParallel. The function yields the series of
         * Parallels that contain Patterns that are visible to the provided
         * srcParallel. The bases of these parallels have not necessarily
         * been applied.
         *
         * The ordering of the Parallels yielded is relevant. The instances
         * that were yielded closer to the beginning take prescedence over
         * the ones yielded at the end.
         */
        private ascend;
        /**
         * Used for safety purposes to catch unexpected behavior.
         */
        private readonly handledHyperEdges;
        /**
         * Constructs and returns a new seed Parallel from the specified
         * zenith Parallel, navigating downwards to the specified type name.
         */
        private descend;
        /**
         * Performs verification on the descend operation.
         * Reports any faults that can occur during this process.
         */
        private verifyDescend;
        /** */
        private readonly parallels;
        /**
         * Stores the set of Parallel instances that have been "raked",
         * which means that that have gone through the process of
         * having their requested bases applied.
         *
         * This set may include both pattern and non-patterns Parallels,
         * (even though their raking processes are completely different).
         */
        private readonly rakedParallels;
        /** */
        private readonly cruft;
    }
    /** */
    type TBaseTable = ReadonlyMap<SpecifiedParallel, HyperEdge>;
}
declare namespace Truth {
    /**
     *
     */
    abstract class Parallel {
        readonly uri: Uri;
        readonly container: Parallel | null;
        /**
         * @internal
         * Invoked by ParallelCache. Do not call.
         */
        constructor(uri: Uri, container: Parallel | null);
        /**
         * Stores a string representation of this Parallel,
         * useful for debugging purposes.
         */
        readonly name: string;
        /**
         * Stores a version number for this instance,
         * useful for debugging purposes.
         */
        readonly version: VersionStamp;
        /**
         *
         */
        get contents(): ReadonlyMap<string, Parallel>;
        private _contents;
        /** */
        getParallels(): readonly Parallel[];
        private readonly _parallels;
        /** */
        get hasParallels(): boolean;
        /** */
        addParallel(parallel: Parallel): void;
    }
}
declare namespace Truth {
    /**
     *
     */
    class SpecifiedParallel extends Parallel {
        /**
         * @internal
         * Invoked by ParallelCache. Do not call.
         */
        constructor(node: Node, container: SpecifiedParallel | null, cruft: CruftCache);
        /**
         * Stores the Node instance that corresponds to this
         * SpecifiedParallel instance.
         */
        readonly node: Node;
        /** */
        get isContractSatisfied(): boolean;
        /** */
        private get contract();
        private _contract;
        /** */
        private readonly cruft;
        /**
         * Gets the first base contained by this instance.
         * @throws In the case when this instance contains no bases.
         */
        get firstBase(): SpecifiedParallel;
        /**
         * Performs a shallow traversal on the non-cruft bases
         * defined directly on this Parallel.
         */
        eachBase(): Generator<{
            base: SpecifiedParallel;
            edge: HyperEdge;
            aliased: boolean;
        }, void, unknown>;
        private readonly _bases;
        /**
         *
         */
        private addBaseEntry;
        /**
         * Performs a deep traversal on the non-cruft bases
         * defined on this Parallel.
         */
        eachBaseDeep(): Generator<SpecifiedParallel, void, unknown>;
        /**
         * @returns A boolean value that indicates whether the provided
         * SpecifiedParallel instance exists somewhere, possibly nested,
         * in the base graph of this instance.
         */
        hasBase(testBase: SpecifiedParallel): boolean;
        /**
         * Attempts to add the provided SpecifiedParallel as a base of
         * this instance. If the addition of the new base would not generate
         * any critical faults, it is added. Otherwise, it's marked as cruft.
         *
         * @returns A boolean value that indicates whether the base
         * was added successfully.
         */
        tryAddLiteralBase(base: SpecifiedParallel, via: HyperEdge): boolean;
        /**
         * Attempts to indirectly apply a base to this SpecifiedParallel via an alias
         * and edge.
         *
         * @param patternParallelCandidates The pattern-containing
         * SpecifiedParallel instance whose bases should be applied to this
         * SpecifiedParallel, if the provided alias is a match.
         *
         * @param viaEdge The HyperEdge in which the alias was found.
         *
         * @param viaAlias The string to test against the parallel embedded
         * within patternParallelCandidates.
         *
         * @returns A boolean value that indicates whether a base was added
         * successfully.
         */
        tryAddAliasedBase(patternParallelCandidates: SpecifiedParallel[], viaEdge: HyperEdge, viaAlias: string): boolean;
        /**
         * Attempts to apply a set of bases to a pattern-containing parallel.
         *
         * @example
         * /pattern : This, Function, Adds, These
         */
        tryApplyPatternBases(baseTable: TBaseTable): void;
        /**
         * Gets the number of bases that have
         * been explicitly applied to this Parallel.
         */
        get baseCount(): number;
        /** */
        get isListIntrinsic(): boolean;
        /** */
        get intrinsicExtrinsicBridge(): SpecifiedParallel | null;
        private _intrinsicExtrinsicBridge;
        /**
         * Establishes a bridge between this SpecifiedParallel and the
         * one provided.
         */
        createIntrinsicExtrinsicBridge(parallel: SpecifiedParallel): void;
        /** */
        getListDimensionality(): number;
        /**
         *
         */
        private comparePatternTo;
        /**
         *
         */
        private maybeCompilePattern;
        /**
         * Gets the Pattern instance that resides inside this SpecifiedParallel,
         * or null in the case when this SpecifiedParallel does not have an
         * inner Pattern.
         */
        get pattern(): Pattern | null;
        /**
         * Stores a string representation of the compiled regular expression
         * associated with this instance, in the case when this instance is
         * a pattern parallel.
         *
         * This string representation should have any infixes compiled away,
         * and should be passable to a JavaScript RegExp, or to the Fsm system.
         */
        private compiledExpression;
    }
}
declare namespace Truth {
    /**
     *
     */
    class UnspecifiedParallel extends Parallel {
        /**
         * @internal
         * Invoked by ParallelCache. Do not call.
         */
        constructor(uri: Uri, container: Parallel | null);
        /**
         * Avoids erroneous structural type compatibility with Parallel.
         */
        private readonly unique;
    }
}
declare namespace Truth {
    /**
     * A simple class for handling objects marked as cruft.
     */
    class CruftCache {
        private readonly program;
        /** */
        constructor(program: Program);
        /**
         * Adds a fault of the specified type to the internal set,
         * marks all relevant objects as cruft, and reports the
         * relevant fault type.
         */
        add(cruft: TCruft, relevantFaultType: FaultType): void;
        /**
         * @returns A boolean value that indicates whether the
         * specified object has been marked as cruft.
         */
        has(source: TCruft): boolean;
        /** Stores a set of objects that have been marked as cruft. */
        private readonly cruft;
    }
    /** */
    type TCruft = TFaultSource | Node | HyperEdge;
}
declare namespace Truth {
    /**
     *
     */
    class ParallelCache {
        /**
         * Creates a Parallel instance from the specified Node or
         * Uri instance.
         *
         * @throws In the case when all containing ParallelTypes to have
         * not been created beforehand.
         *
         * @throw In the case when a ParallelType corresponding to the
         * input was already created.
         */
        create(node: Node, cruft: CruftCache): SpecifiedParallel;
        create(uri: Uri): UnspecifiedParallel;
        /** */
        get(key: Uri): Parallel | undefined;
        get(key: Node): SpecifiedParallel | undefined;
        /** */
        has(key: Node | Uri): boolean;
        /** */
        private getKeyVal;
        /**
         * Stores a map of all Parallel instances that have been
         * constructed by this object.
         */
        private readonly parallels;
        /** */
        get debug(): string;
    }
}
declare namespace Truth {
    /**
     *
     */
    class Contract {
        /** */
        constructor(sourceParallel: SpecifiedParallel);
        /**
         * Computes whether the input SpecifiedParallel is a more derived
         * type of the SpecifiedParallel that corresponds to this Contract.
         *
         * @returns A number that indicates the number of conditions that
         * were satisfied as a result of adding the provided SpecifiedParallel
         * to the Contract.
         */
        trySatisfyCondition(foreignParallel: SpecifiedParallel): number;
        /** */
        get hasConditions(): boolean;
        /** */
        get unsatisfiedConditions(): ReadonlySet<SpecifiedParallel>;
        private readonly _unsatisfiedConditions;
        /**
         * Stores an array containing the parallels that any supplied
         * parallel must have in it's base graph in order to be deemed
         * compliant.
         */
        private readonly allConditions;
    }
}
declare namespace Truth {
    /**
     * A class that encapsulates the actual fault detection behavior,
     * with facilities to perform analysis on Parallel instances, before
     * the actual base has been applied to it.
     */
    class Sanitizer {
        private readonly targetParallel;
        private readonly proposedBase;
        private readonly proposedEdge;
        private readonly cruft;
        /** */
        constructor(targetParallel: SpecifiedParallel, proposedBase: SpecifiedParallel, proposedEdge: HyperEdge, cruft: CruftCache);
        /**
         * Detects list operartor conflicts between the fragments of an
         * annotation. For example, conflicts of the following type are
         * caught here:
         *
         * List : Item
         * List : Item...
         */
        detectListFragmentConflicts(): boolean;
        /** */
        detectCircularReferences(): boolean;
        /** */
        detectListDimensionalityConflict(): boolean;
        /** Gets a boolean value that indicates whether a fault has been reported. */
        get foundCruft(): boolean;
        private _foundCruft;
        /** */
        private basesOf;
        /** */
        private addFault;
    }
}
declare namespace Truth {
    /**
     * A class that represents a fully constructed type within the program.
     */
    class Type {
        /**
         * @internal
         * Constructs one or more Type objects from the specified location.
         */
        static construct(uri: Uri, program: Program): Type | null;
        static construct(spine: Spine, program: Program): Type;
        /**
         * @internal
         * Constructs the invisible root-level Type object that corresponds
         * to the specified document.
         */
        static constructRoots(document: Document): readonly Type[];
        /** */
        private static parallelContextMap;
        /**
         *
         */
        private constructor();
        /**
         * Stores a text representation of the name of the type,
         * or a serialized version of the pattern content in the
         * case when the type is actually a pattern.
         */
        readonly name: string;
        /**
         * Stores the URI that specifies where this Type was
         * found in the document.
         */
        readonly uri: Uri;
        /**
         * Stores a reference to the type, as it's defined in it's
         * next most applicable type.
         */
        get parallels(): readonly Type[];
        /**
         * Stores a reference to the parallel roots of this type.
         * The parallel roots are the endpoints found when
         * traversing upward through the parallel graph.
         */
        get parallelRoots(): readonly Type[];
        /**
         * Stores the Type that contains this Type, or null in
         * the case when this Type is top-level.
         */
        readonly container: Type | null;
        /**
         * Stores the array of types that are contained directly by this
         * one. In the case when this type is a list type, this array does
         * not include the list's intrinsic types.
         */
        get contents(): readonly Type[];
        /**
         * @internal
         * Stores the array of types that are contained directly by this
         * one. In the case when this type is not a list type, this array
         * is empty.
         */
        get contentsIntrinsic(): readonly Type[];
        /**
         * Stores the array of types from which this type extends.
         * If this Type extends from a pattern, it is included in this
         * array.
         */
        get bases(): readonly Type[];
        /**
         * @internal
         * Not implemented.
         */
        get superordinates(): readonly Type[];
        /**
         * @internal
         */
        get subordinates(): readonly Type[];
        /**
         * Gets an array that contains the types that derive from the
         * this Type instance.
         *
         * The types that derive from this one as a result of the use of
         * an alias are excluded from this array.
         */
        get derivations(): readonly Type[];
        /**
         * Gets an array that contains the that share the same containing
         * type as this one.
         */
        get adjacents(): readonly Type[];
        /**
         * Gets an array that contains the patterns that resolve to this type.
         */
        get patterns(): readonly Type[];
        /**
         * Gets an array that contains the raw string values representing
         * the type aliases with which this type has been annotated.
         *
         * If this type is unspecified, the parallel graph is searched,
         * and any applicable type aliases will be present in the returned
         * array.
         */
        get aliases(): readonly string[];
        /**
         *
         */
        get values(): readonly {
            value: string;
            base: Type | null;
            aliased: boolean;
        }[];
        /**
         * Gets the first alias stored in the .values array, or null if the
         * values array is empty.
         */
        get value(): string | null;
        /**
         * Stores whether this type represents the intrinsic
         * side of a list.
         */
        readonly isListIntrinsic: boolean;
        /**
         * Stores whether this type represents the extrinsic
         * side of a list.
         */
        readonly isListExtrinsic: boolean;
        /**
         * Stores whether this Type instance has no annotations applied to it.
         */
        readonly isFresh: boolean;
        /** */
        get isOverride(): boolean;
        /** */
        get isIntroduction(): boolean;
        /**
         * Stores a value that indicates if this Type was directly specified
         * in the document, or if it's existence was inferred.
         */
        readonly isSpecified: boolean;
        /** */
        readonly isAnonymous: boolean;
        /** */
        readonly isPattern: boolean;
        /** */
        readonly isUri: boolean;
        /** */
        readonly isList: boolean;
        /**
         * Gets a boolean value that indicates whether this Type
         * instance was created from a previous edit frame, and
         * should no longer be used.
         */
        get isDirty(): boolean;
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
        visit(nextFn: (type: Type) => Iterable<Type | null> | Type | null, reverse?: boolean): Type[];
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
        iterate(nextFn: (type: Type) => Iterable<Type | null> | Type | null, reverse?: boolean): Generator<{
            type: Type;
            via: Type | null;
        }, void, undefined>;
        /**
         * Queries for a Type that is nested underneath this Type,
         * at the specified type path.
         */
        query(...typePath: string[]): Type | null;
        /**
         * Checks whether this Type has the specified type
         * somewhere in it's base graph.
         */
        is(baseType: Type): boolean;
        /**
         * Checks whether the specified type is in this Type's
         * `.contents` property, either directly, or indirectly via
         * the parallel graphs of the `.contents` Types.
         */
        has(type: Type): boolean;
        /**
         * @internal
         * Internal object that stores the private members
         * of the Type object. Do not use.
         */
        private readonly private;
    }
}
declare namespace Truth {
    /**
     * @internal
     */
    class TypeProxy {
        private readonly uri;
        private readonly program;
        /** */
        constructor(uri: Uri, program: Program);
        /** */
        maybeCompile(): Type | null;
        /** */
        private compiledType;
    }
}
declare namespace Truth {
    /**
     * @internal
     */
    class TypeProxyArray {
        private readonly array;
        /**
         *
         */
        constructor(array: readonly TypeProxy[]);
        /**
         *
         */
        maybeCompile(): readonly Type[];
        private compiledArray;
    }
}
declare namespace Truth {
    /**
     * @internal
     */
    type TCachedType = Type | TypeProxy | null;
    /**
     * @internal
     */
    class TypeCache {
        private readonly program;
        /** */
        static has(uri: Uri, program: Program): boolean;
        /** */
        static get(uri: Uri, program: Program): TCachedType;
        /** */
        static set(uri: Uri, program: Program, type: TCachedType): TCachedType;
        /** */
        private static getCache;
        /**
         *
         */
        private static readonly allCaches;
        /** */
        private constructor();
        /** */
        private maybeClear;
        /** */
        private version;
        /** */
        private readonly map;
    }
}
declare namespace Truth {
    /**
     * @internal
     * (Not implemented)
     * A class that specifies behavior around the recognition
     * of patterns found within documents.
     */
    class Recognition {
        /** */
        constructor();
        /** Whether File URIs should be recognized in statements. */
        fileUris: RecognitionState;
        /** Whether HTTP URIs should be recognized in statements. */
        httpUris: RecognitionState;
        /** Whether regular expressions should be recognized in statements. */
        regularExpressions: RecognitionState;
        /** Whether comments should be recognized in statements. */
        comments: RecognitionState;
    }
    const enum RecognitionState {
        /** Indicates that a pattern is recognized by the system. */
        on = 0,
        /** Indicates that a pattern is not recognized by the system. */
        off = 1,
        /** Indicates that a pattern is recognized by the system, and omitted. */
        omitted = 2
    }
}
//# sourceMappingURL=truth.d.ts.map