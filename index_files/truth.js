"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var Truth;
(function (Truth) {
    /**
     * Asynchronously reads a truth document, and all documents
     * it references from the specified file system or HTTP(s) path.
     * File system paths are only supported if this code is running
     * within a Node.js-compatible environment.
     *
     * @returns A reference to the document read, or an Error.
     */
    async function read(sourcePathOrUri, targetProgram = new Truth.Program()) {
        return await targetProgram.addDocumentFromUri(sourcePathOrUri);
    }
    Truth.read = read;
    /**
     * Parses the specified truth content into a new Truth program.
     *
     * @returns A reference to the parsed document.
     */
    async function parse(sourceText, targetProgram = new Truth.Program()) {
        return await targetProgram.addDocument(sourceText);
    }
    Truth.parse = parse;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     * A Map of the generic key and value types.
     * Supports keys that refer to multiple values.
     */
    class MultiMap {
        constructor() {
            /** */
            this.map = new Map();
        }
        /** */
        *[Symbol.iterator]() {
            for (const entry of this.map)
                yield entry;
        }
        /** */
        entries() {
            return this.map.entries();
        }
        /** */
        get(key) {
            return this.map.get(key);
        }
        /** */
        has(key, value) {
            const values = this.get(key);
            if (!values)
                return false;
            if (value !== undefined)
                return values.includes(value);
            return true;
        }
        /** */
        add(key, value) {
            if (value) {
                const values = this.get(key);
                if (values) {
                    if (!values.includes(value))
                        values.push(value);
                }
                else {
                    this.map.set(key, [value]);
                }
            }
            return this;
        }
        /** */
        delete(key, value) {
            if (value === undefined)
                return !!this.map.delete(key);
            const storedValues = this.map.get(key);
            if (storedValues === undefined)
                return false;
            if (storedValues.length === 1 && storedValues[0] === value) {
                this.map.delete(key);
                return true;
            }
            const valueIdx = storedValues.indexOf(value);
            if (valueIdx < 0)
                return false;
            storedValues.splice(valueIdx, 1);
            return true;
        }
        /** */
        values() {
            return this.map.values();
        }
        /** */
        get size() {
            return this.map.size;
        }
    }
    Truth.MultiMap = MultiMap;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     * Exposes the "fs" module used by the compiler,
     * as well as the ability to change the module used
     * with a custom implementation.
     */
    class Fs {
        /**
         * Assigns a new implementation of the node "fs" module.
         */
        static override(module) {
            this._module = module;
        }
        /** */
        static get module() {
            if (this._module)
                return this._module;
            this._module = require("fs");
            return Truth.Not.null(this._module);
        }
    }
    /** */
    Fs._module = null;
    Truth.Fs = Fs;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * A class that encapsulates string hashing functionality.
     */
    Truth.Hash = new class Hash {
        constructor() {
            /** Stores the constant number of characters in a returned hash. */
            this.length = 8;
        }
        /**
         * Calculates a hash code from the specified string.
         */
        calculate(text) {
            if (text.length === 0)
                return "0".repeat(8);
            let hash = 0;
            for (let i = -1; ++i < text.length;) {
                const char = text.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash %= 2 ** 32;
            }
            return (hash + Math.pow(2, 31)).toString(16).toUpperCase();
        }
    }();
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * A class that provides various higher-order functions
     * across data structures.
     */
    class HigherOrder {
        static copy(param) {
            if (param instanceof Array)
                return Object.freeze(param.slice());
            if (param instanceof Set) {
                const set = new Set();
                for (const value of param)
                    set.add(value);
                return Object.freeze(set);
            }
            if (param instanceof Map) {
                const map = new Map();
                for (const [key, value] of param)
                    map.set(key, value);
                return Object.freeze(map);
            }
            throw new TypeError();
        }
        constructor() { }
    }
    Truth.HigherOrder = HigherOrder;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     * Utility class for performing basic guarding.
     */
    class Not {
        /**
         * @returns The argument as specified, but throws an
         * exception in the case when it's strictly equal to null.
         */
        static null(param) {
            if (param === null) {
                debugger;
                throw new ReferenceError();
            }
            return param;
        }
        /**
         * @returns The argument as specified, but throws an
         * exception in the case when it's strictly equal to undefined.
         */
        static undefined(param) {
            if (param === undefined) {
                debugger;
                throw new ReferenceError();
            }
            return param;
        }
        /**
         * @returns The argument as specified, but throws an
         * exception in the case when it's null or undefined.
         */
        static nullable(param) {
            if (param === null || param === undefined) {
                debugger;
                throw new ReferenceError();
            }
            return param;
        }
    }
    Truth.Not = Not;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
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
        constructor(input) {
            this._position = 0;
            this.input = input.normalize();
            this._position = 0;
        }
        read(token) {
            if (!token)
                throw new TypeError();
            const pos = this._position;
            if (this.input.substr(pos, token.length) === token) {
                this._position += token.length;
                return token;
            }
            return "";
        }
        /**
         * Reads any whitespace characters and floating
         * escape characters.
         *
         * @returns The number of whitespace characters
         * read.
         */
        readWhitespace() {
            let count = 0;
            while (this.more()) {
                const c = count;
                if (this.read("\t" /* tab */))
                    count++;
                if (this.read(" " /* space */))
                    count++;
                if (this.read("\\" /* escapeChar */ + " " /* space */))
                    count++;
                if (this.read("\\" /* escapeChar */ + "\t" /* tab */))
                    count++;
                if (c === count)
                    break;
            }
            return count;
        }
        /**
         * Attempts to read a single stream-level grapheme from the
         * parse stream, using unicode-aware extraction method.
         * If the parse stream specifies a unicode escape sequence,
         * such as \uFFFF, these are seen as 6 individual graphemes.
         *
         * @returns The read grapheme, or an empty string in the case
         * when there is no more content in the parse stream.
         */
        readGrapheme() {
            if (this._position >= this.input.length)
                return "";
            const codeAtCursor = this.input.codePointAt(this._position) || -1;
            this._position += codeAtCursor > 0xFFFF ? 2 : 1;
            return String.fromCodePoint(codeAtCursor);
        }
        /**
         * Reads graphemes from the parse stream, until either
         * the cursor reaches one of the specified quit tokens,
         * or the parse stream terminates.
         */
        readUntil(...quitTokens) {
            let stream = "";
            while (this.more()) {
                if (quitTokens.some(t => this.peek(t)))
                    break;
                stream += this.readGrapheme();
            }
            return stream;
        }
        /**
         * Attempts to read the specified token from the parse stream,
         * if and only if it's at the end of the parse stream.
         */
        readThenTerminal(token) {
            if (this.peek(token) && this._position === this.input.length - token.length) {
                this._position += token.length;
                return token;
            }
            return "";
        }
        /**
         * @returns A boolean value that indicates whether the
         * specified string exists immediately at the position of
         * the cursor.
         */
        peek(token) {
            return this.input.substr(this._position, token.length) === token;
        }
        /**
         * @returns A boolean value that indicates whether the
         * specified string exists immediately at the position of
         * the cursor, and following this token is the end of the
         * parse stream.
         */
        peekThenTerminal(token) {
            return (this._position === this.input.length - token.length &&
                this.input.substr(this._position, token.length) === token);
        }
        /**
         * @returns A boolean value that indicates whether
         * there are more characters to read in the input.
         */
        more() {
            return this._position < this.input.length;
        }
        /**
         * Gets or sets the position of the cursor from where
         * reading takes place in the cursor.
         */
        get position() {
            return this._position;
        }
        set position(value) {
            if (value < 0)
                throw new RangeError();
            this._position = value;
        }
        //
        // DEAD
        //
        /**
         *
         */
        atRealBackslash() {
            const esc = "\\" /* escapeChar */;
            return this.input.substr(this._position, 2) === esc + esc;
        }
        /**
         * @deprecated
         * @returns A boolean value that indicates whether an
         * escape character exists behind the current character.
         * The algorithm used is respective of sequences of
         * multiple escape characters.
         */
        escaped() {
            let escaped = false;
            let backtrackPos = this._position;
            while (--backtrackPos >= 0)
                if (this.input[backtrackPos] === "\\" /* escapeChar */)
                    escaped = !escaped;
            return escaped;
        }
    }
    Truth.Parser = Parser;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * Converts the names in the UnicodeBlocks object
     * to a map with lower case keys, for easy lookup.
     */
    function toMap(blocks) {
        const entries = Object.entries(blocks);
        const entriesFmt = entries.map(entry => [entry[0].toLowerCase(), entry[1]]);
        return Object.freeze(new Map(entriesFmt));
    }
    /**
     * Stores the maximum character code in the unicode set.
     */
    Truth.UnicodeMax = 65536;
    /**
     * Stores a map of the names of all unicode blocks,
     * and their character ranges.
     */
    Truth.UnicodeBlocks = toMap({
        "Control character": [0x0000, 0x001F],
        "Basic Latin": [0x0020, 0x007F],
        "Latin-1 Supplement": [0x0080, 0x00FF],
        "Latin Extended-A": [0x0100, 0x017F],
        "Latin Extended-B": [0x0180, 0x024F],
        "IPA Extensions": [0x0250, 0x02AF],
        "Spacing Modifier Letters": [0x02B0, 0x02FF],
        "Combining Diacritical Marks": [0x0300, 0x036F],
        "Greek and Coptic": [0x0370, 0x03FF],
        "Cyrillic": [0x0400, 0x04FF],
        "Cyrillic Supplement": [0x0500, 0x052F],
        "Armenian": [0x0530, 0x058F],
        "Hebrew": [0x0590, 0x05FF],
        "Arabic": [0x0600, 0x06FF],
        "Syriac": [0x0700, 0x074F],
        "Arabic Supplement": [0x0750, 0x077F],
        "Thaana": [0x0780, 0x07BF],
        "NKo": [0x07C0, 0x07FF],
        "Samaritan": [0x0800, 0x083F],
        "Mandaic": [0x0840, 0x085F],
        "Syriac Supplement": [0x0860, 0x086F],
        "Arabic Extended-A": [0x08A0, 0x08FF],
        "Devanagari": [0x0900, 0x097F],
        "Bengali": [0x0980, 0x09FF],
        "Gurmukhi": [0x0A00, 0x0A7F],
        "Gujarati": [0x0A80, 0x0AFF],
        "Oriya": [0x0B00, 0x0B7F],
        "Tamil": [0x0B80, 0x0BFF],
        "Telugu": [0x0C00, 0x0C7F],
        "Kannada": [0x0C80, 0x0CFF],
        "Malayalam": [0x0D00, 0x0D7F],
        "Sinhala": [0x0D80, 0x0DFF],
        "Thai": [0x0E00, 0x0E7F],
        "Lao": [0x0E80, 0x0EFF],
        "Tibetan": [0x0F00, 0x0FFF],
        "Myanmar": [0x1000, 0x109F],
        "Georgian": [0x10A0, 0x10FF],
        "Hangul Jamo": [0x1100, 0x11FF],
        "Ethiopic": [0x1200, 0x137F],
        "Ethiopic Supplement": [0x1380, 0x139F],
        "Cherokee": [0x13A0, 0x13FF],
        "Unified Canadian Aboriginal Syllabics": [0x1400, 0x167F],
        "Ogham": [0x1680, 0x169F],
        "Runic": [0x16A0, 0x16FF],
        "Tagalog": [0x1700, 0x171F],
        "Hanunoo": [0x1720, 0x173F],
        "Buhid": [0x1740, 0x175F],
        "Tagbanwa": [0x1760, 0x177F],
        "Khmer": [0x1780, 0x17FF],
        "Mongolian": [0x1800, 0x18AF],
        "Unified Canadian Aboriginal Syllabics Extended": [0x18B0, 0x18FF],
        "Limbu": [0x1900, 0x194F],
        "Tai Le": [0x1950, 0x197F],
        "New Tai Lue": [0x1980, 0x19DF],
        "Khmer Symbols": [0x19E0, 0x19FF],
        "Buginese": [0x1A00, 0x1A1F],
        "Tai Tham": [0x1A20, 0x1AAF],
        "Combining Diacritical Marks Extended": [0x1AB0, 0x1AFF],
        "Balinese": [0x1B00, 0x1B7F],
        "Sundanese": [0x1B80, 0x1BBF],
        "Batak": [0x1BC0, 0x1BFF],
        "Lepcha": [0x1C00, 0x1C4F],
        "Ol Chiki": [0x1C50, 0x1C7F],
        "Cyrillic Extended C": [0x1C80, 0x1C8F],
        "Sundanese Supplement": [0x1CC0, 0x1CCF],
        "Vedic Extensions": [0x1CD0, 0x1CFF],
        "Phonetic Extensions": [0x1D00, 0x1D7F],
        "Phonetic Extensions Supplement": [0x1D80, 0x1DBF],
        "Combining Diacritical Marks Supplement": [0x1DC0, 0x1DFF],
        "Latin Extended Additional": [0x1E00, 0x1EFF],
        "Greek Extended": [0x1F00, 0x1FFF],
        "General Punctuation": [0x2000, 0x206F],
        "Superscripts and Subscripts": [0x2070, 0x209F],
        "Currency Symbols": [0x20A0, 0x20CF],
        "Combining Diacritical Marks for Symbols": [0x20D0, 0x20FF],
        "Letterlike Symbols": [0x2100, 0x214F],
        "Number Forms": [0x2150, 0x218F],
        "Arrows": [0x2190, 0x21FF],
        "Mathematical Operators": [0x2200, 0x22FF],
        "Miscellaneous Technical": [0x2300, 0x23FF],
        "Control Pictures": [0x2400, 0x243F],
        "Optical Character Recognition": [0x2440, 0x245F],
        "Enclosed Alphanumerics": [0x2460, 0x24FF],
        "Box Drawing": [0x2500, 0x257F],
        "Block Elements": [0x2580, 0x259F],
        "Geometric Shapes": [0x25A0, 0x25FF],
        "Miscellaneous Symbols": [0x2600, 0x26FF],
        "Dingbats": [0x2700, 0x27BF],
        "Miscellaneous Mathematical Symbols-A": [0x27C0, 0x27EF],
        "Supplemental Arrows-A": [0x27F0, 0x27FF],
        "Braille Patterns": [0x2800, 0x28FF],
        "Supplemental Arrows-B": [0x2900, 0x297F],
        "Miscellaneous Mathematical Symbols-B": [0x2980, 0x29FF],
        "Supplemental Mathematical Operators": [0x2A00, 0x2AFF],
        "Miscellaneous Symbols and Arrows": [0x2B00, 0x2BFF],
        "Glagolitic": [0x2C00, 0x2C5F],
        "Latin Extended-C": [0x2C60, 0x2C7F],
        "Coptic": [0x2C80, 0x2CFF],
        "Georgian Supplement": [0x2D00, 0x2D2F],
        "Tifinagh": [0x2D30, 0x2D7F],
        "Ethiopic Extended": [0x2D80, 0x2DDF],
        "Cyrillic Extended-A": [0x2DE0, 0x2DFF],
        "Supplemental Punctuation": [0x2E00, 0x2E7F],
        "CJK Radicals Supplement": [0x2E80, 0x2EFF],
        "Kangxi Radicals": [0x2F00, 0x2FDF],
        "Ideographic Description Characters": [0x2FF0, 0x2FFF],
        "CJK Symbols and Punctuation": [0x3000, 0x303F],
        "Hiragana": [0x3040, 0x309F],
        "Katakana": [0x30A0, 0x30FF],
        "Bopomofo": [0x3100, 0x312F],
        "Hangul Compatibility Jamo": [0x3130, 0x318F],
        "Kanbun": [0x3190, 0x319F],
        "Bopomofo Extended": [0x31A0, 0x31BF],
        "CJK Strokes": [0x31C0, 0x31EF],
        "Katakana Phonetic Extensions": [0x31F0, 0x31FF],
        "Enclosed CJK Letters and Months": [0x3200, 0x32FF],
        "CJK Compatibility": [0x3300, 0x33FF],
        "CJK Unified Ideographs Extension A": [0x3400, 0x4DBF],
        "Yijing Hexagram Symbols": [0x4DC0, 0x4DFF],
        "CJK Unified Ideographs": [0x4E00, 0x9FFF],
        "Yi Syllables": [0xA000, 0xA48F],
        "Yi Radicals": [0xA490, 0xA4CF],
        "Lisu": [0xA4D0, 0xA4FF],
        "Vai": [0xA500, 0xA63F],
        "Cyrillic Extended-B": [0xA640, 0xA69F],
        "Bamum": [0xA6A0, 0xA6FF],
        "Modifier Tone Letters": [0xA700, 0xA71F],
        "Latin Extended-D": [0xA720, 0xA7FF],
        "Syloti Nagri": [0xA800, 0xA82F],
        "Common Indic Number Forms": [0xA830, 0xA83F],
        "Phags-pa": [0xA840, 0xA87F],
        "Saurashtra": [0xA880, 0xA8DF],
        "Devanagari Extended": [0xA8E0, 0xA8FF],
        "Kayah Li": [0xA900, 0xA92F],
        "Rejang": [0xA930, 0xA95F],
        "Hangul Jamo Extended-A": [0xA960, 0xA97F],
        "Javanese": [0xA980, 0xA9DF],
        "Myanmar Extended-B": [0xA9E0, 0xA9FF],
        "Cham": [0xAA00, 0xAA5F],
        "Myanmar Extended-A": [0xAA60, 0xAA7F],
        "Tai Viet": [0xAA80, 0xAADF],
        "Meetei Mayek Extensions": [0xAAE0, 0xAAFF],
        "Ethiopic Extended-A": [0xAB00, 0xAB2F],
        "Latin Extended-E": [0xAB30, 0xAB6F],
        "Cherokee Supplement": [0xAB70, 0xABBF],
        "Meetei Mayek": [0xABC0, 0xABFF],
        "Hangul Syllables": [0xAC00, 0xD7AF],
        "Hangul Jamo Extended-B": [0xD7B0, 0xD7FF],
        "High Surrogates": [0xD800, 0xDB7F],
        "High Private Use Surrogates": [0xDB80, 0xDBFF],
        "Low Surrogates": [0xDC00, 0xDFFF],
        "Private Use Area": [0xE000, 0xF8FF],
        "CJK Compatibility Ideographs": [0xF900, 0xFAFF],
        "Alphabetic Presentation Forms": [0xFB00, 0xFB4F],
        "Arabic Presentation Forms-A": [0xFB50, 0xFDFF],
        "Variation Selectors": [0xFE00, 0xFE0F],
        "Vertical Forms": [0xFE10, 0xFE1F],
        "Combining Half Marks": [0xFE20, 0xFE2F],
        "CJK Compatibility Forms": [0xFE30, 0xFE4F],
        "Small Form Variants": [0xFE50, 0xFE6F],
        "Arabic Presentation Forms-B": [0xFE70, 0xFEFF],
        "Halfwidth and Fullwidth Forms": [0xFF00, 0xFFEF],
        "Specials": [0xFFF0, 0xFFFF],
        "Linear B Syllabary": [0x10000, 0x1007F],
        "Linear B Ideograms": [0x10080, 0x100FF],
        "Aegean Numbers": [0x10100, 0x1013F],
        "Ancient Greek Numbers": [0x10140, 0x1018F],
        "Ancient Symbols": [0x10190, 0x101CF],
        "Phaistos Disc": [0x101D0, 0x101FF],
        "Lycian": [0x10280, 0x1029F],
        "Carian": [0x102A0, 0x102DF],
        "Coptic Epact Numbers": [0x102E0, 0x102FF],
        "Old Italic": [0x10300, 0x1032F],
        "Gothic": [0x10330, 0x1034F],
        "Old Permic": [0x10350, 0x1037F],
        "Ugaritic": [0x10380, 0x1039F],
        "Old Persian": [0x103A0, 0x103DF],
        "Deseret": [0x10400, 0x1044F],
        "Shavian": [0x10450, 0x1047F],
        "Osmanya": [0x10480, 0x104AF],
        "Osage": [0x104B0, 0x104FF],
        "Elbasan": [0x10500, 0x1052F],
        "Caucasian Albanian": [0x10530, 0x1056F],
        "Linear A": [0x10600, 0x1077F],
        "Cypriot Syllabary": [0x10800, 0x1083F],
        "Imperial Aramaic": [0x10840, 0x1085F],
        "Palmyrene": [0x10860, 0x1087F],
        "Nabataean": [0x10880, 0x108AF],
        "Hatran": [0x108E0, 0x108FF],
        "Phoenician": [0x10900, 0x1091F],
        "Lydian": [0x10920, 0x1093F],
        "Meroitic Hieroglyphs": [0x10980, 0x1099F],
        "Meroitic Cursive": [0x109A0, 0x109FF],
        "Kharoshthi": [0x10A00, 0x10A5F],
        "Old South Arabian": [0x10A60, 0x10A7F],
        "Old North Arabian": [0x10A80, 0x10A9F],
        "Manichaean": [0x10AC0, 0x10AFF],
        "Avestan": [0x10B00, 0x10B3F],
        "Inscriptional Parthian": [0x10B40, 0x10B5F],
        "Inscriptional Pahlavi": [0x10B60, 0x10B7F],
        "Psalter Pahlavi": [0x10B80, 0x10BAF],
        "Old Turkic": [0x10C00, 0x10C4F],
        "Old Hungarian": [0x10C80, 0x10CFF],
        "Rumi Numeral Symbols": [0x10E60, 0x10E7F],
        "Brahmi": [0x11000, 0x1107F],
        "Kaithi": [0x11080, 0x110CF],
        "Sora Sompeng": [0x110D0, 0x110FF],
        "Chakma": [0x11100, 0x1114F],
        "Mahajani": [0x11150, 0x1117F],
        "Sharada": [0x11180, 0x111DF],
        "Sinhala Archaic Numbers": [0x111E0, 0x111FF],
        "Khojki": [0x11200, 0x1124F],
        "Multani": [0x11280, 0x112AF],
        "Khudawadi": [0x112B0, 0x112FF],
        "Grantha": [0x11300, 0x1137F],
        "Newa": [0x11400, 0x1147F],
        "Tirhuta": [0x11480, 0x114DF],
        "Siddham": [0x11580, 0x115FF],
        "Modi": [0x11600, 0x1165F],
        "Mongolian Supplement": [0x11660, 0x1167F],
        "Takri": [0x11680, 0x116CF],
        "Ahom": [0x11700, 0x1173F],
        "Warang Citi": [0x118A0, 0x118FF],
        "Zanabazar Square": [0x11A00, 0x11A4F],
        "Soyombo": [0x11A50, 0x11AAF],
        "Pau Cin Hau": [0x11AC0, 0x11AFF],
        "Bhaiksuki": [0x11C00, 0x11C6F],
        "Marchen": [0x11C70, 0x11CBF],
        "Masaram Gondi": [0x11D00, 0x11D5F],
        "Cuneiform": [0x12000, 0x123FF],
        "Cuneiform Numbers and Punctuation": [0x12400, 0x1247F],
        "Early Dynastic Cuneiform": [0x12480, 0x1254F],
        "Egyptian Hieroglyphs": [0x13000, 0x1342F],
        "Anatolian Hieroglyphs": [0x14400, 0x1467F],
        "Bamum Supplement": [0x16800, 0x16A3F],
        "Mro": [0x16A40, 0x16A6F],
        "Bassa Vah": [0x16AD0, 0x16AFF],
        "Pahawh Hmong": [0x16B00, 0x16B8F],
        "Miao": [0x16F00, 0x16F9F],
        "Ideographic Symbols and Punctuation": [0x16FE0, 0x16FFF],
        "Tangut": [0x17000, 0x187FF],
        "Tangut Components": [0x18800, 0x18AFF],
        "Kana Supplement": [0x1B000, 0x1B0FF],
        "Kana Extended-A": [0x1B100, 0x1B12F],
        "Nushu": [0x1B170, 0x1B2FF],
        "Duployan": [0x1BC00, 0x1BC9F],
        "Shorthand Format Controls": [0x1BCA0, 0x1BCAF],
        "Byzantine Musical Symbols": [0x1D000, 0x1D0FF],
        "Musical Symbols": [0x1D100, 0x1D1FF],
        "Ancient Greek Musical Notation": [0x1D200, 0x1D24F],
        "Tai Xuan Jing Symbols": [0x1D300, 0x1D35F],
        "Counting Rod Numerals": [0x1D360, 0x1D37F],
        "Mathematical Alphanumeric Symbols": [0x1D400, 0x1D7FF],
        "Sutton SignWriting": [0x1D800, 0x1DAAF],
        "Glagolitic Supplement": [0x1E000, 0x1E02F],
        "Mende Kikakui": [0x1E800, 0x1E8DF],
        "Adlam": [0x1E900, 0x1E95F],
        "Arabic Mathematical Alphabetic Symbols": [0x1EE00, 0x1EEFF],
        "Mahjong Tiles": [0x1F000, 0x1F02F],
        "Domino Tiles": [0x1F030, 0x1F09F],
        "Playing Cards": [0x1F0A0, 0x1F0FF],
        "Enclosed Alphanumeric Supplement": [0x1F100, 0x1F1FF],
        "Enclosed Ideographic Supplement": [0x1F200, 0x1F2FF],
        "Miscellaneous Symbols and Pictographs": [0x1F300, 0x1F5FF],
        "Emoji": [0x1F600, 0x1F64F],
        "Ornamental Dingbats": [0x1F650, 0x1F67F],
        "Transport and Map Symbols": [0x1F680, 0x1F6FF],
        "Alchemical Symbols": [0x1F700, 0x1F77F],
        "Geometric Shapes Extended": [0x1F780, 0x1F7FF],
        "Supplemental Arrows-C": [0x1F800, 0x1F8FF],
        "Supplemental Symbols and Pictographs": [0x1F900, 0x1F9FF],
        "CJK Unified Ideographs Extension B": [0x20000, 0x2A6DF],
        "CJK Unified Ideographs Extension C": [0x2A700, 0x2B73F],
        "CJK Unified Ideographs Extension D": [0x2B740, 0x2B81F],
        "CJK Unified Ideographs Extension E": [0x2B820, 0x2CEAF],
        "CJK Unified Ideographs Extension F": [0x2CEB0, 0x2EBEF],
        "CJK Compatibility Ideographs Supplement": [0x2F800, 0x2FA1F],
        "Tags": [0xE0000, 0xE007F],
        "Variation Selectors Supplement": [0xE0100, 0xE01EF]
    });
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     * Stores unsorted general utility methods.
     */
    class Misc {
        static get(map, key, fallbackFn) {
            const value = map.get(key);
            if (value !== void 0)
                return value;
            const fallbackValue = fallbackFn();
            map.set(key, fallbackValue);
            return fallbackValue;
        }
        /**
         * Compresses the number sequence into a reasonably unique 53-bit hash number.
         * The hash is commutative in that the sequences [1, 2, 3] and [3, 2, 1] should result
         * in the same number.
         */
        static hashCommutative(numbers) {
            let mul = 1;
            let add = 0;
            for (let i = numbers.length; i-- > 0;) {
                const num = numbers[i];
                // 32 bits for the multiplying of numbers together
                mul = (mul *= num) % (2 ** 32);
                // 18 bits for the total of all the numbers
                add = (add += num) % (2 ** 18);
            }
            // 3 bits for the number of numbers
            const count = numbers.length % (2 ** 3);
            return (count << 50) | (add << 32) | mul;
        }
        /**
         * Counts incrementally through numbers, using the specified
         * radix sequence. For example, if the radixes [2, 2, 2] were to
         * be specified, this would result in binary counting starting at
         * [0, 0, 0] and ending at [1, 1, 1].
         */
        static *variableRadixCounter(radixes) {
            if (radixes.length === 0)
                return;
            if (radixes.length === 1) {
                for (let i = -1; ++i < radixes[0];)
                    yield [i];
                return;
            }
            const total = radixes.reduce((a, b) => a * b, 1);
            const digits = radixes.map(() => 0);
            const divideFactors = [1];
            for (let baseIdx = radixes.length - 1; --baseIdx >= 0;)
                divideFactors.unshift(radixes.slice(baseIdx + 1).reduce((a, b) => a * b, 1));
            for (let count = -1; ++count < total;) {
                const sequence = [];
                let remainder = count;
                for (let digitIdx = -1; ++digitIdx < digits.length;) {
                    const div = divideFactors[digitIdx];
                    sequence.push(remainder / div | 0);
                    remainder %= div;
                }
                yield sequence;
            }
        }
        /**
         *
         */
        static calculatePowerset(array) {
            const result = [[]];
            for (let i = 0; i < array.length; i++)
                for (let n = 0; n < result.length; n++)
                    result.push(result[n].concat(array[i]));
            return result;
        }
        /**
         * @returns Whether the items of the first set object form
         * a subset (not a proper subset) of the items of the second
         * set.
         */
        static isSubset(sourceSet, possibleSubset) {
            for (const item of possibleSubset)
                if (!sourceSet.has(item))
                    return false;
            return true;
        }
        /**
         * @returns Whether the items of the first set object form
         * a superset (not a proper superset) of the items of the
         * second set.
         */
        static isSuperset(sourceSet, possibleSuperset) {
            for (const item of sourceSet)
                if (!possibleSuperset.has(item))
                    return false;
            return true;
        }
        /**
         * @returns The number of items that are missing
         * from the second set that exist in the first set.
         */
        static computeSubsetFactor(a, b) {
            let count = 0;
            for (const item of a)
                count += b.includes(item) ? 0 : 1;
            return count;
        }
        /**
         * Performs a recursive reduction operation on an initial object
         * that represents some abstract node of a graph. The traversal
         * algorithm used ensures all provided nodes are only visited
         * once.
         */
        static reduceRecursive(initialObject, followFn, reduceFn) {
            const visited = new Set();
            const recurse = (object) => {
                visited.add(object);
                const reduceResult = [];
                for (const next of followFn(object))
                    if (!visited.has(next))
                        reduceResult.push(recurse(next));
                return reduceFn(object, Object.freeze(reduceResult));
            };
            return recurse(initialObject);
        }
        /**
         * @returns A proxy of the specified object, whose members
         * have been patched with the specified patch object.
         */
        static patch(source, patch) {
            const patchKeys = Object.freeze(Object.keys(patch));
            return new Proxy(source, {
                get(target, key) {
                    return patchKeys.includes(key) ?
                        patch[key] :
                        source[key];
                }
            });
        }
        /**
         * Safely parses a JSON object, silencing any thrown parse exceptions.
         */
        static tryParseJson(jsonText) {
            try {
                return JSON.parse(jsonText);
            }
            catch (e) {
                return null;
            }
        }
        constructor() { }
    }
    Truth.Misc = Misc;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * The base class of all domain objects in the system.
     * (The system is slowing being migrated so that more
     * classes make use of this feature).
     */
    class AbstractClass {
        constructor() {
            /** @internal */
            this.id = getNextClassId();
        }
    }
    Truth.AbstractClass = AbstractClass;
    let nextClassId = 0;
    /** */
    function getNextClassId() {
        return (++nextClassId) % 2 ** 32;
    }
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * The top-level object that manages Truth documents.
     */
    class Program {
        /**
         * Creates a new Program, into which Documents may
         * be added, and verified.
         */
        constructor() {
            this.memoryUriCount = 0;
            /** */
            this.queue = new Map();
            this._documents = [];
            /** @internal */
            this.causes = new Truth.MultiMap();
            /** Stores the version of this program when the last full verification occured. */
            this.lastFullVerify = null;
            /** Stores the result produced from the last full verification. */
            this.lastFullVerifyResult = true;
            /** */
            this.unverifiedStatements = [];
            /** */
            this.unverifiedDocuments = [];
            this._version = Truth.VersionStamp.next();
            this.reader = Truth.createDefaultUriReader();
            // The ordering of these instantations is relevant,
            // because it reflects the order in which each of
            // these services are going to process hooks.
            this.on(Truth.CauseDocumentCreate, data => {
                this.unverifiedDocuments.push(data.document);
            });
            this.on(Truth.CauseDocumentDelete, data => {
                const idx = this.unverifiedDocuments.indexOf(data.document);
                if (idx > -1)
                    this.unverifiedDocuments.splice(idx, 1);
            });
            this.on(Truth.CauseDocumentUriChange, () => {
                this._version = Truth.VersionStamp.next();
            });
            this.on(Truth.CauseAgentDetach, data => {
                for (const [cause, attachments] of this.causes)
                    for (const attachment of attachments)
                        if (attachment.uri && attachment.uri === data.uri)
                            this.causes.delete(cause, attachment);
            });
            this.agentCache = new Truth.AgentCache(this);
            this.graph = new Truth.HyperGraph(this);
            this.cycleDetector = new Truth.CycleDetector(this);
            this.on(Truth.CauseRevalidate, data => {
                for (let i = this.unverifiedStatements.length; i-- > 0;)
                    if (this.unverifiedStatements[i].isDisposed)
                        this.unverifiedStatements.splice(i, 1);
                for (const statement of data.parents)
                    if (!statement.isCruft)
                        this.unverifiedStatements.push(statement);
            });
            this.faults = new Truth.FaultService(this);
            this.on(Truth.CauseEditComplete, () => {
                this._version = Truth.VersionStamp.next();
            });
        }
        /**
         * Override the default UriReader used by the program.
         * This reader is used to load the contents of files that
         * are referenced within uri-containing statements within
         * Truth documents.
         */
        setReader(reader) {
            this.reader = reader;
        }
        /**
         * Adds a document to this program with the specified sourceText.
         * The URI for the document is an auto-generated, auto-incrementing
         * number.
         *
         * For example, the first document added in this way is considered
         * to have the URI "memory://memory/1.truth", the second being
         * "memory://memory/2.truth", and so on.
         */
        async addDocument(sourceText) {
            const memoryUri = Truth.KnownUri.createMemoryUri(++this.memoryUriCount);
            return await Truth.Document.new(this, memoryUri, sourceText, d => this.saveDocument(d));
        }
        /**
         * Adds a document to this program, by loading it from the specified
         * URI. In the case when there has already been a document loaded
         * from the URI specified, this pre-loaded document is returned.
         *
         * @param documentUri The URI that will represent the source
         * location of the loaded document.
         *
         * @param sourceText The source text to load into the document
         * by default. If omitted, the source text will be loaded from the
         * the URI specified in the `documentUri`  argument.
         *
         * Use this argument when the source text of the document being
         * added has already been loaded into a string by another means,
         * or when more control of the actual loaded content is required.
         */
        async addDocumentFromUri(documentUri, sourceText) {
            const uri = typeof documentUri === "string" ?
                Truth.KnownUri.fromString(documentUri) :
                documentUri;
            if (!uri)
                throw Truth.Exception.invalidUri();
            const existingDoc = this.getDocumentByUri(uri);
            if (existingDoc)
                return existingDoc;
            const promises = this.queue.get(uri);
            if (promises) {
                return new Promise(resolve => {
                    promises.push(resolve);
                });
            }
            // The problem with this design is that I don't know if the 
            // resolve function is going to be called synchronously.
            // If it is, this code structure will probably work.
            return new Promise(async (resolve) => {
                this.queue.set(uri, [resolve]);
                if (sourceText === undefined) {
                    const loadedSourceText = await (async () => {
                        const readResult = await this.reader.tryRead(uri);
                        if (readResult instanceof Error)
                            return readResult;
                        return readResult;
                    })();
                    if (loadedSourceText instanceof Error)
                        return loadedSourceText;
                    sourceText = loadedSourceText;
                }
                const docOrError = await Truth.Document.new(this, uri, sourceText, d => this.saveDocument(d));
                const resolveFns = this.queue.get(uri);
                if (resolveFns) {
                    this.queue.delete(uri);
                    for (const resolveFn of resolveFns)
                        resolveFn(docOrError);
                }
            });
        }
        /**
         * Adds the specified document to the internal list of documents.
         */
        saveDocument(doc) {
            this._documents.push(doc);
        }
        /**
         * @returns The loaded document with the specified URI.
         */
        getDocumentByUri(uri) {
            for (const doc of this._documents)
                if (doc.uri === uri)
                    return doc;
            return null;
        }
        /**
         * Gets a readonly array of truth documents
         * that have been loaded into this Program.
         */
        get documents() {
            return this._documents;
        }
        /** */
        get version() {
            return this._version;
        }
        /**
         * Probes the program and returns an array containing information
         * about the callbacks that will be triggered if a cause of the specified
         * type is broadcasted. Essentially, this method answers the question,
         * "Who is listening for Causes of type X?".
         *
         * If no agents have attached to the specified type, an empty array
         * is returned.
         */
        probe(causeType, scope = this) {
            if (scope instanceof Truth.Type)
                throw Truth.Exception.notImplemented();
            const results = [];
            const push = (ca) => results.push({ uri: ca.uri, scope: ca.scope });
            for (const [causeTypeKey, attachments] of this.causes)
                if (causeType === causeTypeKey)
                    for (const ca of attachments)
                        if (scope === ca.scope ||
                            scope instanceof Program && ca.scope instanceof Truth.Document)
                            push(ca);
            return results;
        }
        /**
         *
         */
        on(causeType, fn, scope) {
            const info = getHolderInfo(this);
            const usingScope = scope || info.scope || this;
            const ca = new CauseAttachment(info.uri, fn, usingScope);
            this.causes.add(causeType, ca);
        }
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
        cause(cause, ...filters) {
            const causeType = cause.constructor;
            const attachmentsAll = this.causes.get(causeType) || [];
            const attachments = attachmentsAll.filter(attachment => {
                if (filters.length === 0)
                    return true;
                const otherUri = attachment.uri;
                if (otherUri === null)
                    return true;
                return filters.find(uri => uri === otherUri);
            });
            if (attachments.length === 0)
                return [];
            const result = [];
            for (const attachment of attachments) {
                const returned = attachment.callback(cause);
                if (returned !== null && returned !== undefined)
                    result.push({ from: attachment.uri, returned });
            }
            return result;
        }
        /**
         * Augments the global scope of the agents attached to this
         * program with a variable whose name and value are specified
         * in the arguments to this method. (Note that this only affects
         * agents that are attached *after* this call has been made.)
         */
        augment(name, value) {
            this.agentCache.augment(name, value);
        }
        /**
         *
         */
        attach(agentUri) {
            return new Promise(() => {
                throw Truth.Exception.notImplemented();
            });
        }
        /**
         *
         */
        detach(agentUri) {
            throw Truth.Exception.notImplemented();
        }
        query(document, ...typePath) {
            if (arguments.length > 1 && typePath.length === 0)
                throw Truth.Exception.passedArrayCannotBeEmpty("typePath");
            if (typePath.length === 0)
                return Truth.Type.constructRoots(document);
            const phrase = document.phrase.forwardDeep(typePath);
            return Truth.Type.construct(phrase);
        }
        /**
         * Begin inspecting a document loaded
         * into this program, a specific location.
         */
        inspect(document, line, offset) {
            const statement = document.read(line);
            const zone = statement.getZone(offset);
            const position = {
                line,
                offset
            };
            switch (zone) {
                case Truth.StatementZone.void:
                    return new Truth.ProgramInspectionResult(position, zone, null, statement);
                // Return all the types in the declaration side of the parent.
                case Truth.StatementZone.whitespace:
                    {
                        const parent = document.getParentFromPosition(line, offset);
                        if (parent instanceof Truth.Document)
                            return new Truth.ProgramInspectionResult(position, zone, parent, statement);
                        const types = parent.declarations
                            .map(decl => decl.factor())
                            .reduce((spines, s) => spines.concat(s), [])
                            .map(spine => Truth.Type.construct(spine))
                            .filter((type) => !!type);
                        return new Truth.ProgramInspectionResult(position, zone, types, statement, null);
                    }
                //
                case Truth.StatementZone.pattern:
                    {
                        // TODO: This should not be returning a PatternLiteral,
                        // but rather a fully constructed IPattern object. This
                        // code is only here as a shim.
                        const patternTypes = [];
                        return new Truth.ProgramInspectionResult(position, zone, patternTypes, statement);
                    }
                // Return all the types related to the specified declaration.
                case Truth.StatementZone.declaration:
                    {
                        const decl = statement.getDeclaration(offset);
                        if (!decl)
                            throw Truth.Exception.unknownState();
                        const types = decl
                            .factor()
                            .map(spine => Truth.Type.construct(spine))
                            .filter((type) => !!type);
                        return new Truth.ProgramInspectionResult(position, zone, types, statement, decl);
                    }
                // 
                case Truth.StatementZone.annotation:
                    {
                        const anno = statement.getAnnotation(offset);
                        if (!anno)
                            throw Truth.Exception.unknownState();
                        const spine = statement.declarations[0].factor()[0];
                        let base = null;
                        const type = Truth.Type.construct(spine);
                        if (type) {
                            const annoText = anno.boundary.subject.toString();
                            base = type.bases.filter(b => b.name === annoText);
                            base.push(type);
                        }
                        return new Truth.ProgramInspectionResult(position, zone, base, statement, anno);
                    }
                case Truth.StatementZone.annotationVoid:
                    {
                        const anno = statement.getAnnotation(offset);
                        const spine = statement.declarations[0].factor()[0];
                        const type = Truth.Type.construct(spine);
                        const foundObject = type ? [type] : null;
                        return new Truth.ProgramInspectionResult(position, zone, foundObject, statement, anno);
                    }
            }
            return new Truth.ProgramInspectionResult(position, zone, null, statement, null);
        }
        /**
         * Performs a full verification of all documents loaded into the program.
         * This Program's .faults field is populated with any faults generated as
         * a result of the verification. If no documents loaded into this program
         * has been edited since the last verification, verification is not re-attempted.
         *
         * @returns A boolean value that indicates whether the verification passed.
         */
        verify() {
            if (this.lastFullVerify && !this.version.newerThan(this.lastFullVerify))
                return this.lastFullVerifyResult;
            for (const doc of this.documents)
                for (const { statement } of doc.eachDescendant())
                    this.verifyAssociatedDeclarations(statement);
            this.lastFullVerify = this.version;
            return this.lastFullVerifyResult = this.finalizeVerification();
        }
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
        reverify() {
            for (const doc of this.unverifiedDocuments)
                for (const { statement } of doc.eachDescendant())
                    this.verifyAssociatedDeclarations(statement);
            for (const smt of this.unverifiedStatements)
                this.verifyAssociatedDeclarations(smt);
            return this.finalizeVerification();
        }
        /** */
        verifyAssociatedDeclarations(statement) {
            if (!statement.isDisposed)
                for (const decl of statement.declarations)
                    decl.factor().map(spine => Truth.Type.construct(spine));
        }
        /** */
        finalizeVerification() {
            this.faults.refresh();
            this.unverifiedDocuments.length = 0;
            this.unverifiedStatements.length = 0;
            return this.faults.count === 0;
        }
    }
    Truth.Program = Program;
    /**
     * Gets information about the object that holds
     * the specified Program instance.
     */
    function getHolderInfo(program) {
        const ih = program.instanceHolder;
        return {
            uri: ih ? ih.uri : null,
            scope: (ih ? ih.scope : program)
        };
    }
    /**
     * @internal
     * Stores information about the attachment
     * of a cause callback function.
     */
    class CauseAttachment {
        /** */
        constructor(uri, callback, scope) {
            this.uri = uri;
            this.callback = callback;
            this.scope = scope;
        }
    }
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * Stores the details about a precise location in a Document.
     */
    class ProgramInspectionResult {
        /** @internal */
        constructor(
        /**
         * Stores the location of the inspection point within a Document.
         */
        position, 
        /**
         * Stores the zone of the statement found at the specified location.
         */
        zone, 
        /**
         * Stores the compilation object that most closely represents
         * what was found at the specified location. Stores null in the
         * case when the specified location contains an object that
         * has been marked as cruft (the statement and span fields
         * are still populated in this case).
         */
        foundObject, 
        /**
         * Stores the Statement found at the specified location.
         */
        statement, 
        /**
         * Stores the Span found at the specified location, or
         * null in the case when no Span was found, such as if
         * the specified location is whitespace or a comment.
         */
        span = null) {
            this.position = position;
            this.zone = zone;
            this.foundObject = foundObject;
            this.statement = statement;
            this.span = span;
            if (Array.isArray(foundObject) && foundObject.length === 0)
                this.foundObject = null;
        }
    }
    Truth.ProgramInspectionResult = ProgramInspectionResult;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     * A cache that stores agent build function loaded by a single program instance.
     */
    class AgentCache {
        /** */
        constructor(program) {
            this.program = program;
            /** */
            this.agentFunctionParameters = new Map();
            /**
             * Stores the number of lines that are introduced by the script
             * engine when a code block is wrapped in a new Function()
             * block, which is then toString()'d. This is used in order to calculate
             * source map line offsets (which varies by engine).
             */
            this.sourceMapLineOffset = (() => {
                // eslint-disable-next-line no-new-func
                const testFn = new Function("a", "b", "c", ";");
                const lineCount = testFn.toString().split("\n").length;
                return lineCount - 2;
            })();
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
            this.cache = new Map();
            /*
            program.on(CauseUriReferenceAdd, data =>
            {
                if (data.uri.ext === UriExtension.js)
                    this.attachAgent(data.uri, data.statement);
            });
            
            program.on(CauseUriReferenceRemove, data =>
            {
                if (data.uri.ext === UriExtension.js)
                    this.detachAgent(data.uri, data.statement);
            });
            */
        }
        /** * /
        private async attachAgent(uri: KnownUri, statement: Statement | null)
        {
            const existingCacheSet = this.cache.get(uri);
            const reference = statement || this.program;
            
            if (existingCacheSet)
            {
                existingCacheSet.add(reference);
                return;
            }
            
            const scope = statement instanceof Statement ?
                statement.document :
                this.program;
            
            const sourceRaw = await UriReader.tryRead(uri);
            if (sourceRaw instanceof Error)
                return sourceRaw;
            
            const source = this.maybeAdjustSourceMap(uri, sourceRaw);
            const patchedProgram = Misc.patch(this.program, {
                instanceHolder: { uri, scope }
            });
            
            const params = [
                "program",
                "Truth",
                "require",
                ...this.agentFunctionParameters.keys(),
                source
            ];
            
            const args = [
                patchedProgram,
                Truth,
                AgentCache.hijackedRequireFn,
                ...this.agentFunctionParameters.values()
            ];
            
            try
            {
                const fn = Object.freeze(Function.apply(Function, params));
                await fn.apply(fn, args as any);
            }
            catch (e)
            {
                this.reportUserLandError(e);
                return;
            }
            
            this.program.cause(new CauseAgentAttach(uri, scope));
            const set = new Set<Statement | Program>([reference]);
            this.cache.set(uri, set);
        }
        
        /** * /
        private detachAgent(uri: KnownUri, statement: Statement | null)
        {
            const existingCacheSet = this.cache.get(uri);
            if (!existingCacheSet)
                return;
            
            existingCacheSet.delete(statement || this.program);
            if (existingCacheSet.size === 0)
            {
                this.cache.delete(uri);
                this.program.cause(new CauseAgentDetach(uri));
            }
        }
        
        /**
         * @internal
         * (Called by Program)
         */
        augment(name, value) {
            if (this.agentFunctionParameters.has(name))
                throw Truth.Exception.causeParameterNameInUse(name);
            this.agentFunctionParameters.set(name, value);
        }
        /**
         * Adjusts the content of the sourcemap in the specified source code
         * file, to account for the discrepencies introduced by wrapping JavaScript
         * source code in a new Function() constructor.
         */
        maybeAdjustSourceMap(sourceUri, sourceCode) {
            // We can't do any of this source map mutation without Node.JS
            // access right now. Maybe this will change in the future.
            if (typeof require !== "function")
                return sourceCode;
            const lastLineStart = (() => {
                for (let i = sourceCode.length; i-- > 1;)
                    if (sourceCode[i - 1] === "\n")
                        return i;
                return -1;
            })();
            if (lastLineStart < 0)
                return sourceCode;
            const sourceMapUrl = ["//", "#", " source", "MappingURL="].join("");
            if (sourceCode.substr(lastLineStart, sourceMapUrl.length) !== sourceMapUrl)
                return sourceCode;
            const startPos = lastLineStart + sourceMapUrl.length;
            const ending = ";base64,";
            const endPos = sourceCode.indexOf(ending, startPos) + ending.length;
            // Unsupported source map format.
            if (endPos < ending.length)
                return sourceCode;
            const sourceMapRaw = this.fromBase64(sourceCode.slice(endPos));
            // There's probably some error in the source map
            if (!sourceMapRaw)
                return sourceCode;
            // The source map isn't parsing as a JSON object ... probably broken somehow
            const sourceMap = Truth.Misc.tryParseJson(sourceMapRaw);
            if (!sourceMap)
                return sourceCode;
            // Unsupported source map version
            if (typeof sourceMap.mappings !== "string")
                return sourceCode;
            // Placing a ; in the "mappings" property of the source map object
            // shifts the lines down by 1. It needs to be + 1, because we wrap
            // the code in our own setTimeout() block.
            const prefix = ";".repeat(this.sourceMapLineOffset + 1);
            const pathModule = require("path");
            // Should actually be .toString() without a file.
            debugger;
            const basePath = sourceUri.toString();
            sourceMap.mappings = prefix + sourceMap.mappings;
            if (sourceMap.sources instanceof Array)
                sourceMap.sources = sourceMap.sources.map(s => pathModule.join(basePath, s));
            const newSourceMap = this.toBase64(JSON.stringify(sourceMap));
            const newSourceCode = sourceCode.slice(0, lastLineStart);
            // The source code is wrapped in a setTimeout in order
            // to give any attached debuggers a chance to connect.
            const varName = "$$__RESOLVE_FUNCTION__$$";
            const newSourceCodeDelayed = `return new Promise(${varName} => setTimeout(() => {\n` +
                newSourceCode +
                `; ${varName}(); }, 1))\n`;
            const newPrefix = sourceCode.slice(lastLineStart, endPos);
            return newSourceCodeDelayed + newPrefix + newSourceMap;
        }
        /** */
        reportUserLandError(e) {
            // NOTE: This should probably be reporting the error
            // somewhere where it's visible.
            debugger;
            throw e;
        }
        /** */
        toBase64(plain) {
            return typeof btoa === "function" ?
                btoa(plain) :
                Buffer.from(plain, "ascii").toString("base64");
        }
        /** */
        fromBase64(encoded) {
            return typeof atob === "function" ?
                atob(encoded) :
                Buffer.from(encoded, "base64").toString("ascii");
        }
    }
    /**
     * The require() function is not available within the context of an
     * agent for numerous (and non-obvious) reasons. This function
     * is fed into all agent functions to prevent any otherwise available
     * require() function from being accessed.
     */
    AgentCache.hijackedRequireFn = Object.freeze((specifier) => {
        throw new Error("The require() function is not available in this context. " +
            "Multi-file agents should be bundled with a bundler " +
            "such as RollupJS.");
    });
    Truth.AgentCache = AgentCache;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * Abstract base class for all Causes defined both within
     * the compiler core, and in user code.
     */
    class Cause {
        constructor() {
            /**
             * Stores the return type of the Cause, if any. In a cause callback function,
             * this property exists as an array of objects that have been returned
             * from other cause aids.
             */
            this.returns = null;
        }
    }
    Truth.Cause = Cause;
    // 
    // Causes
    // 
    /** */
    class CauseAgentAttach extends Cause {
        constructor(
        /**
         * Stores the URI from where the agent was loaded.
         */
        uri, 
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
        scope) {
            super();
            this.uri = uri;
            this.scope = scope;
        }
    }
    Truth.CauseAgentAttach = CauseAgentAttach;
    /** */
    class CauseAgentDetach extends Cause {
        constructor(uri) {
            super();
            this.uri = uri;
        }
    }
    Truth.CauseAgentDetach = CauseAgentDetach;
    /** A cause that runs immediately after a document has been created. */
    class CauseDocumentCreate extends Cause {
        constructor(document) {
            super();
            this.document = document;
        }
    }
    Truth.CauseDocumentCreate = CauseDocumentCreate;
    /** A cause that runs immediately before a document is removed from the program. */
    class CauseDocumentDelete extends Cause {
        constructor(document) {
            super();
            this.document = document;
        }
    }
    Truth.CauseDocumentDelete = CauseDocumentDelete;
    /** A cause that runs when a document's file name changes. */
    class CauseDocumentUriChange extends Cause {
        constructor(document, newUri) {
            super();
            this.document = document;
            this.newUri = newUri;
        }
    }
    Truth.CauseDocumentUriChange = CauseDocumentUriChange;
    /** Abstract cause class for the resolution causes */
    class CauseResolve extends Cause {
        constructor(program, spine) {
            super();
            this.program = program;
            this.spine = spine;
        }
    }
    Truth.CauseResolve = CauseResolve;
    /** A cause that runs before the compiler is about to resolve a term. */
    class CauseBeforeResolve extends CauseResolve {
    }
    Truth.CauseBeforeResolve = CauseBeforeResolve;
    /** A cause that runs after the compiler has resolved a term. */
    class CauseAfterResolve extends CauseResolve {
    }
    Truth.CauseAfterResolve = CauseAfterResolve;
    /** A cause that runs when the compiler is unable to resolve a term. */
    class CauseNotResolved extends CauseResolve {
    }
    Truth.CauseNotResolved = CauseNotResolved;
    /** */
    class CauseInvalidate extends Cause {
        constructor(
        /**
         * A reference to the Document object in which the Invalidation occured.
         */
        document, 
        /**
         * An array of statements whose descendants should be invalidated.
         * If the array is empty, the entire document should be invalidated.
         */
        parents, 
        /**
         * An array of indexes whose length is the same as the parents field,
         * that represents the index of each parent within the document.
         */
        indexes) {
            super();
            this.document = document;
            this.parents = parents;
            this.indexes = indexes;
        }
    }
    Truth.CauseInvalidate = CauseInvalidate;
    /** */
    class CauseRevalidate extends Cause {
        constructor(
        /**
         * A reference to the Document object in which the Revalidation will occur.
         */
        document, 
        /**
         * An array of statements whose descendants should be revalidated.
         */
        parents, 
        /**
         * An array of indexes whose length is the same as the parents field,
         * that represents the index of each parent within the document.
         */
        indexes) {
            super();
            this.document = document;
            this.parents = parents;
            this.indexes = indexes;
        }
    }
    Truth.CauseRevalidate = CauseRevalidate;
    /** A cause that runs when a document edit transaction has completed. */
    class CauseEditComplete extends Cause {
        constructor(document) {
            super();
            this.document = document;
        }
    }
    Truth.CauseEditComplete = CauseEditComplete;
    /**
     * A hook that runs when the set of faults that are detected
     * within the document have changed.
     */
    class CauseFaultChange extends Cause {
        constructor(faultsAdded, faultsRemoved) {
            super();
            this.faultsAdded = faultsAdded;
            this.faultsRemoved = faultsRemoved;
        }
    }
    Truth.CauseFaultChange = CauseFaultChange;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /** @internal */
    class Exception {
        /** */
        static objectDirty() {
            return error(`
				Cannot call this method or access this property,
				because the document has changed since it
				was created.`);
        }
        /** */
        static invalidArgument() {
            return error("Invalid argument.");
        }
        /** */
        static passedArrayCannotBeEmpty(paramName) {
            return error("Array cannot be empty for parameter: " + paramName);
        }
        /** */
        static unknownState() {
            return error("An unknown state has been reached in the program.");
        }
        /** */
        static invalidCall() {
            return error("Cannot call this method given the current state of the program.");
        }
        /** */
        static notImplemented() {
            return error("Not implemented.");
        }
        /** */
        static agentNotRead() {
            return error(`
				Cannot instantiate an agent of this type,
				added. See agents.add.`);
        }
        /** */
        static agentMissing(rawUri) {
            return error(`Could not load an agent from the URI ${rawUri}`);
        }
        /** */
        static agentImportError(agentUri, errorText) {
            return error(`
				An error occured while trying to evaluate the agent at "${agentUri}".
				The error message returned was: ${errorText}`);
        }
        /** */
        static agentInvalid(rawUri) {
            return error(`
				The code file at ${rawUri} does not export a function. Consider looking
				at the documention and examples for the proper way to stucture an
				agent code file.`);
        }
        /** */
        static noRemoteAgents() {
            return error(`
				Agents cannot be loaded from remote URIs in this context.
				(Most likely, this code is running in Node.js where the loading
				of remote code is a security risk).`);
        }
        /** */
        static causeParameterNameInUse(paramName) {
            return error(`
				Cannot use the name "${paramName}" as a parameter
				name because it's already in use.`);
        }
        /** */
        static doubleTransaction() {
            return error("Cannot start a new transaction while another is executing.");
        }
        /** */
        static invalidUriRetraction() {
            return error("URI contains too few path segments to perform this retraction.");
        }
        /** */
        static invalidUri(rawUri) {
            return error("Invalid URI" + (typeof rawUri === "string" ? ": " + rawUri : ""));
        }
        /** */
        static uriNotSupported() {
            return error("URIs of this type are not supported.");
        }
        /** */
        static cannotMakeAbsolute() {
            return error(`
				Cannot make this URI absolute because no 
				process or window object could be found`);
        }
        /** */
        static absoluteUriExpected() {
            return error(`This method expects an absolute URI to be specified.`);
        }
        /** */
        static mustSpecifyVia() {
            return error(`
				Must specify the "via" argument because the parsed URI 
				was found to be relative`);
        }
        /** */
        static viaCannotBeRelative() {
            return error(`URI instances specified in the "via" argument must not be relative`);
        }
        /** */
        static invalidTypePath() {
            return error(`
				One or more of the types in the specified type path are invalid,
				because they contain either leading or trailing whitespace, or
				is an empty string.`);
        }
        /** */
        static invalidExtension(requiredExtension) {
            return error(`
				This method requires URIs that have the 
				".${requiredExtension}" extension.`);
        }
        /** */
        static invalidDocumentReference() {
            return error(`
				This document cannot be added as a dependency
				of the target document because it's storage location
				(memory or disk) differs from the that of the target.`);
        }
        /** */
        static uriAlreadyExists() {
            return error(`
				Cannot assign this URI to this document, because
				another document is already loaded in the program
				with the Uri specified.`);
        }
        /** */
        static uriProtocolsMustMatch() {
            return error(`
				Cannot assign this URI to this document, because
				it's protocol differs from the URI current assigned 
				to this document`);
        }
        /** */
        static nonEmptyDocument() {
            return error("Cannot call this method on a non-empty document.");
        }
        /** */
        static invalidWhileInEditTransaction() {
            return error(`Cannot call this method, or run this hook while an edit
				transaction is underway.`);
        }
        /** */
        static uncachableDocument() {
            return error(`
				Cannot cache this document because it was not loaded from a file.`);
        }
        /** */
        static documentAlreadyLoaded() {
            return error(`
				A document with this URI has already been created.
				Use Document.fromUri() instead.`);
        }
        /** */
        static documentNotLoaded() {
            return error("This document has not been loaded into the current program.");
        }
        /** */
        static statementNotInDocument() {
            return error("The specified statement does not exist within this document.");
        }
        /** */
        static cannotRefresh() {
            return error(`
				This resource cannot be reloaded because it only exists in memory.`);
        }
        /** */
        static offsetRequired() {
            return error(`
				Offset argument is required because the a whitespace-only
				statement was passed.`);
        }
        /** */
        static unsupportedPlatform() {
            return error("This code appears to be operating in an unsupported platform.");
        }
    }
    Truth.Exception = Exception;
    /**
     * Generates a proper error object from the specified message.
     */
    function error(msg) {
        return new Error(msg.trim().replace(/\s\s+/g, " "));
    }
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * An enumeration that lists all availble protocols
     * supported by the system. The list can be enumerated
     * via Uri.eachProtocol()
     */
    let UriProtocol;
    (function (UriProtocol) {
        UriProtocol["none"] = "";
        UriProtocol["unknown"] = "?";
        UriProtocol["file"] = "file:";
        UriProtocol["https"] = "https:";
        UriProtocol["http"] = "http:";
        /**
         * @internal
         * Internal URIs (which are URIs that refer to an in-memory document)
         * are sourced from the gopher protocol. Yes, the gopher protocol. This
         * is because it's the only protocol that will parse through the standard
         * URL constructor in V8, other than the standard protocols (http, https).
         * (Other JavaScript engines seem to parse all protocols, even made-up
         * ones).
         */
        UriProtocol["memory"] = "memory:";
    })(UriProtocol = Truth.UriProtocol || (Truth.UriProtocol = {}));
    (function (UriProtocol) {
        /**
         * @returns A UriProtocol member from the specified string.
         */
        function resolve(value) {
            const vals = Object.values(UriProtocol);
            const idx = vals.indexOf(value);
            return idx < 0 ? null : vals[idx];
        }
        UriProtocol.resolve = resolve;
    })(UriProtocol = Truth.UriProtocol || (Truth.UriProtocol = {}));
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /** @internal */
    function createDefaultUriReader() {
        return {
            tryRead: async (uri) => {
                const uriText = uri.toString();
                if (uri.protocol === Truth.UriProtocol.file)
                    return await readFileUri(uriText);
                else if (uri.protocol === Truth.UriProtocol.http ||
                    uri.protocol === Truth.UriProtocol.https)
                    return await readWebUri(uriText);
                throw Truth.Exception.notImplemented();
            }
        };
    }
    Truth.createDefaultUriReader = createDefaultUriReader;
    /** */
    async function readFileUri(path, opts = "utf8") {
        return new Promise(resolve => {
            path = decodeURI(path);
            Truth.Fs.module.readFile(path, opts, (error, data) => {
                resolve(error && error.errno ?
                    error :
                    data || "");
            });
        });
    }
    /** */
    async function readWebUri(url) {
        if (typeof fetch === "function") {
            try {
                const response = await fetch(url);
                if (response.status === 200)
                    return response.text();
                return new FetchError(response.status, response.statusText);
            }
            catch (e) {
                return new Error("Unknown error.");
            }
        }
        else if (typeof require === "function") {
            const getFn = url.startsWith("https:") ? require("https").get :
                url.startsWith("http:") ? require("http").get :
                    null;
            if (getFn === null)
                throw Truth.Exception.invalidUri(url);
            return await new Promise(resolve => {
                getFn(url, response => {
                    const data = [];
                    response.on("data", chunk => {
                        data.push(typeof chunk === "string" ?
                            chunk :
                            chunk.toString("utf8"));
                    });
                    response.on("error", error => {
                        resolve(error);
                    });
                    response.on("end", () => {
                        resolve(data.join(""));
                    });
                });
                return "";
            });
        }
        throw Truth.Exception.unsupportedPlatform();
    }
    /**
     *
     */
    class FetchError extends Error {
        constructor(statusCode, statusText) {
            super();
            this.statusCode = statusCode;
            this.statusText = statusText;
        }
    }
    Truth.FetchError = FetchError;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * An enumeration that stores the escape sequences
     * that only match a single kind of character. "Sign" in
     * this case refers to the fact that these are escape
     * sequences that refer to another character.
     */
    let RegexSyntaxSign;
    (function (RegexSyntaxSign) {
        RegexSyntaxSign["tab"] = "\\t";
        RegexSyntaxSign["lineFeed"] = "\\n";
        RegexSyntaxSign["carriageReturn"] = "\\r";
        RegexSyntaxSign["escapedFinalizer"] = "\\/";
        RegexSyntaxSign["backslash"] = "\\\\";
    })(RegexSyntaxSign = Truth.RegexSyntaxSign || (Truth.RegexSyntaxSign = {}));
    /** */
    (function (RegexSyntaxSign) {
        /**
         * @returns A RegexSyntaxSign member from the
         * specified sign literal (ex: "\t") or raw signable
         * character (ex: "	").
         */
        function resolve(value) {
            if (value.length < 1 || value.length > 2)
                return null;
            const vals = Object.values(RegexSyntaxSign);
            const idx = vals.indexOf(value);
            return idx < 0 ? null : vals[idx];
        }
        RegexSyntaxSign.resolve = resolve;
        /** */
        function unescape(value) {
            switch (value) {
                case RegexSyntaxSign.tab: return String.fromCodePoint(9);
                case RegexSyntaxSign.lineFeed: return String.fromCodePoint(10);
                case RegexSyntaxSign.carriageReturn: return String.fromCodePoint(13);
                case RegexSyntaxSign.escapedFinalizer: return String.fromCodePoint(47);
                case RegexSyntaxSign.backslash: return String.fromCodePoint(92);
            }
            return "";
        }
        RegexSyntaxSign.unescape = unescape;
    })(RegexSyntaxSign = Truth.RegexSyntaxSign || (Truth.RegexSyntaxSign = {}));
    /**
     * An enumeration that stores the escape sequences
     * that can match more than one kind of character.
     */
    let RegexSyntaxKnownSet;
    (function (RegexSyntaxKnownSet) {
        RegexSyntaxKnownSet["digit"] = "\\d";
        RegexSyntaxKnownSet["digitNon"] = "\\D";
        RegexSyntaxKnownSet["alphanumeric"] = "\\w";
        RegexSyntaxKnownSet["alphanumericNon"] = "\\W";
        RegexSyntaxKnownSet["whitespace"] = "\\s";
        RegexSyntaxKnownSet["whitespaceNon"] = "\\S";
        RegexSyntaxKnownSet["wild"] = ".";
    })(RegexSyntaxKnownSet = Truth.RegexSyntaxKnownSet || (Truth.RegexSyntaxKnownSet = {}));
    /** */
    (function (RegexSyntaxKnownSet) {
        const vals = Object.values(RegexSyntaxKnownSet);
        function resolve(value) {
            const idx = vals.indexOf(value);
            return idx < 0 ? null : vals[idx];
        }
        RegexSyntaxKnownSet.resolve = resolve;
    })(RegexSyntaxKnownSet = Truth.RegexSyntaxKnownSet || (Truth.RegexSyntaxKnownSet = {}));
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * A class that manages the diagnostics that have been
     * reported for the current state of the program.
     */
    class FaultService {
        constructor(program) {
            // Listen for invalidations and clear out any faults
            // that correspond to objects that don't exist in the
            // document anymore. 
            this.program = program;
            /** */
            this.inEditTransaction = false;
            this.manualRefreshQueued = false;
            /**
             * Stores faults that are exposed to the outside when the
             * FaultService's accessor methods are used. These faults are
             * reported within an edit transaction, and clear automatically
             * when the Statement or Span to which they are connected is
             * disposed.
             */
            this.foregroundAutoFrame = new FaultFrame();
            /**
             * Stores a buffer of the faults that will eventually be exposed to the
             * outside. These faults clear automatically when the Statement or
             * Span to which they are connected is disposed.
             */
            this.backgroundAutoFrame = new FaultFrame();
            /**
             * Stores faults that are exposed to the outside when the
             * FaultService's accessor methods are used.
             */
            this.foregroundManualFrame = new FaultFrame();
            /**
             * Stores a buffer of the faults that will eventually be exposed to the
             * outside, after being copied to the foregroundManualFrame.
             * These faults are reported outside of an edit transacrtion, and must
             * be cleared manually (via reportManual).
             */
            this.backgroundManualFrame = new FaultFrame();
            program.on(Truth.CauseInvalidate, data => {
                if (data.parents.length > 0) {
                    for (const smt of data.parents)
                        for (const { statement } of smt.document.eachDescendant(smt, true))
                            this.removeStatementFaults(statement);
                }
                else
                    for (const { statement } of data.document.eachDescendant())
                        this.removeStatementFaults(statement);
                this.inEditTransaction = true;
            });
            program.on(Truth.CauseEditComplete, () => {
                this.inEditTransaction = false;
                this.refresh();
            });
        }
        /**
         * Removes all faults associated with the specified statement.
         */
        removeStatementFaults(statement) {
            this.backgroundManualFrame.removeSource(statement);
            this.backgroundAutoFrame.removeSource(statement);
            for (const span of statement.allSpans)
                this.backgroundAutoFrame.removeSource(span);
            for (const infixSpan of statement.infixSpans)
                this.backgroundAutoFrame.removeSource(infixSpan);
        }
        /**
         * Returns an array that contains all faults retained by this FaultService,
         * sorted in the order that they exist in the program, optionally filtered
         * by the document specified.
         */
        each(document) {
            let faults = [
                ...this.foregroundAutoFrame.faults.values(),
                ...this.foregroundManualFrame.faults.values()
            ]
                .map(faultMap => [...faultMap.values()])
                .reduce((a, b) => a.concat(b), []);
            if (document)
                faults = faults.filter(v => v.document === document);
            return faults.sort(this.compareFaults);
        }
        /**
         * @internal
         * Compares two fault instances, and returns a number that is suitable
         * as a return value for the callback function passed to JavaScript's
         * Array.sort() method.
         *
         * Returns 0 in the case when the faults appear to be equivalent.
         */
        compareFaults(a, b) {
            if (a.document !== b.document)
                return a.document.uri.toString() < b.document.uri.toString() ? -1 : 1;
            if (a.line !== b.line)
                return a.line - b.line;
            // When the faults exist on the same line, the ordering is based on 
            // the starting offset of the reported fault's range. This should cause
            // Statement faults to always be ordered before Span and InfixSpan
            // faults.
            const offsetDelta = a.range[0] - b.range[0];
            if (offsetDelta !== 0)
                return offsetDelta;
            // If there are multiple faults reported on the same span, the ordering
            // is based on the internal fault code. If the faults are the same, 0 is
            // returned, and the faults are considered to be equivalent.
            return a.type.code - b.type.code;
        }
        /**
         * Gets a number representing the number of
         * unrectified faults retained by this FaultService.
         */
        get count() {
            return this.foregroundAutoFrame.faults.size +
                this.foregroundManualFrame.faults.size;
        }
        /**
         * Reports a fault. If a similar Fault on the same area
         * of the document hasn't been reported, the method
         * runs the FaultReported hook.
         */
        report(fault) {
            this.backgroundAutoFrame.addFault(fault);
        }
        /**
         * Reports a fault outside the context of an edit transaction.
         * This method is to be used for faults that are reported in
         * asynchronous callbacks, such as network errors.
         */
        reportManual(fault) {
            this.backgroundManualFrame.addFault(fault);
            this.maybeQueueManualRefresh();
        }
        /**
         * Clears a fault that was previously reported outside
         * of an edit transaction.
         */
        resolveManual(fault) {
            this.backgroundManualFrame.removeFault(fault);
            this.maybeQueueManualRefresh();
        }
        /**
         * Queues the copying of the background fault buffer to the
         * foreground.
         */
        maybeQueueManualRefresh() {
            if (this.manualRefreshQueued)
                return;
            this.manualRefreshQueued = true;
            setTimeout(() => {
                this.manualRefreshQueued = false;
                if (!this.inEditTransaction)
                    this.refresh();
            }, 0);
        }
        /**
         * @returns An array of Fault objects that have been reported
         * at the specified source. If the source has no faults, an empty
         * array is returned.
         */
        inspect(source) {
            const out = [];
            for (const retainedFault of this.each())
                if (retainedFault.source === source)
                    out.push(retainedFault);
            return out;
        }
        /**
         * @returns An array of Fault objects that have been reported that
         * correspond to the specified Statement, or any Span or InfixSpan
         * objects contained within it.
         */
        inspectDeep(source) {
            const out = [];
            for (const retainedFault of this.each()) {
                const reSource = retainedFault.source;
                if (reSource === source)
                    out.push(retainedFault);
                else if (reSource instanceof Truth.Span || reSource instanceof Truth.InfixSpan)
                    if (reSource.statement === source)
                        out.push(retainedFault);
            }
            return out;
        }
        /**
         * @internal
         * Used internally to inform the FaultService that type-level fault
         * analysis is being done on the provided Node. This is necessary
         * because type-level faults do not live beyond a single edit frame,
         * so the FaultService needs to know which Nodes were analyzed
         * so that newly rectified faults can be cleared out.
         *
         * When this method is called, any faults corresponding to the
         * specified Node are cleared out, and are only added back in if
         * they were re-detected during this edit transaction.
         */
        inform(node) {
            const smts = node.statements.filter(smt => !smt.isDisposed);
            // Clear out any statement-level faults that touch the node
            for (const smt of smts)
                this.backgroundAutoFrame.removeSource(smt);
            // Clear out any span-level faults that touch the node
            const spans = smts
                .map(smt => smt.spans)
                .reduce((a, b) => a.concat(b), []);
            for (const span of spans)
                this.backgroundAutoFrame.removeSource(span);
            // Clear out any infix-level faults that touch the node
            const infixes = smts
                .map(smt => smt.infixSpans || [])
                .reduce((a, b) => a.concat(b), []);
            for (const infix of infixes)
                this.backgroundAutoFrame.removeSource(infix);
        }
        /**
         * @internal
         * Broadcasts any not-yet-reported faults to the FaultService.
         */
        refresh() {
            const [autoAdded, autoRemoved] = this.refreshFrameSet(this.backgroundAutoFrame, this.foregroundAutoFrame);
            const [manualAdded, manualRemoved] = this.refreshFrameSet(this.backgroundManualFrame, this.foregroundManualFrame);
            const autoChanged = autoAdded.length + autoRemoved.length > 0;
            if (autoChanged) {
                this.foregroundAutoFrame = this.backgroundAutoFrame;
                this.backgroundAutoFrame = this.backgroundAutoFrame.clone();
            }
            const manualChanged = manualAdded.length + manualRemoved.length > 0;
            if (manualChanged) {
                this.foregroundManualFrame = this.backgroundManualFrame;
                this.backgroundManualFrame = this.backgroundManualFrame.clone();
            }
            if (autoChanged || manualChanged)
                this.program.cause(new Truth.CauseFaultChange(autoAdded.concat(manualAdded), autoRemoved.concat(manualRemoved)));
        }
        /** */
        refreshFrameSet(bgFrame, fgFrame) {
            const faultsAdded = [];
            const faultsRemoved = [];
            for (const map of bgFrame.faults.values())
                for (const fault of map.values())
                    if (!fgFrame.hasFault(fault))
                        faultsAdded.push(fault);
            for (const map of fgFrame.faults.values())
                for (const fault of map.values())
                    if (!bgFrame.hasFault(fault))
                        faultsRemoved.push(fault);
            return [faultsAdded, faultsRemoved];
        }
    }
    Truth.FaultService = FaultService;
    /**
     * Stores a buffer of faults.
     */
    class FaultFrame {
        constructor() {
            /**
             * A doubly-nested map of fault sources, fault codes, and the actual fault.
             */
            this.faults = new Map();
        }
        /** */
        clone() {
            const newFrame = new FaultFrame();
            for (const [faultSource, existingMap] of this.faults) {
                const newMap = new Map();
                for (const [code, fault] of existingMap)
                    newMap.set(code, fault);
                newFrame.faults.set(faultSource, newMap);
            }
            return newFrame;
        }
        /** */
        addFault(fault) {
            const faultsForSource = this.faults.get(fault.source);
            if (faultsForSource) {
                faultsForSource.set(fault.type.code, fault);
            }
            else {
                const map = new Map();
                map.set(fault.type.code, fault);
                this.faults.set(fault.source, map);
            }
        }
        /** */
        removeSource(source) {
            this.faults.delete(source);
            if (source instanceof Truth.Statement)
                for (const cruftObject of source.cruftObjects)
                    this.faults.delete(cruftObject);
        }
        /** */
        removeFault(fault) {
            const faultsForSource = this.faults.get(fault.source);
            if (faultsForSource)
                faultsForSource.delete(fault.type.code);
        }
        /** */
        hasFault(fault) {
            const faultsForSource = this.faults.get(fault.source);
            return faultsForSource ?
                faultsForSource.has(fault.type.code) :
                false;
        }
    }
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     *
     */
    class Fault {
        constructor(
        /** */
        type, 
        /** The document object that caused the fault to be reported. */
        source, 
        /**
         * A human-readable message that contains more in-depth detail
         * of the fault that occured, in addition to the standard message.
         */
        additionalDetail = "") {
            this.type = type;
            this.source = source;
            this.additionalDetail = additionalDetail;
            const src = this.source;
            // The +1's are necessary in order to deal with the fact that
            // most editors are 1-based whereas the internal representation
            // of statement strings are 0-based.
            if (src instanceof Truth.Statement) {
                // The TabsAndSpaces fault is the only fault that needs a
                // special case where it has a different reporting location.
                this.range = type.code === Truth.Faults.TabsAndSpaces.code ?
                    [1, src.indent + 1] :
                    [src.indent + 1, src.sourceText.length + 1];
            }
            else if (src instanceof Truth.Span || src instanceof Truth.InfixSpan) {
                this.range = [
                    src.boundary.offsetStart + 1,
                    src.boundary.offsetEnd + 1
                ];
            }
            else
                throw Truth.Exception.unknownState();
        }
        /**
         * Converts this fault into a string representation,
         * suitable for output as an error message.
         */
        toString() {
            const doc = this.document;
            const avoidProtocols = [
                Truth.UriProtocol.memory,
                Truth.UriProtocol.none,
                Truth.UriProtocol.unknown
            ];
            const uriText = avoidProtocols.includes(doc.uri.protocol) ?
                "" : doc.uri.toString() + " ";
            const colNums = this.range.join("-");
            const colText = colNums ? ", Col " + colNums : "";
            return `${this.type.message} (${uriText}Line ${this.line}${colText})`;
        }
        /**
         * Gets a reference to the Document in which this Fault was detected.
         */
        get document() {
            return this.statement.document;
        }
        /**
         * Gets a reference to the Statement in which this Fault was detected.
         */
        get statement() {
            const src = this.source;
            return Truth.Not.null(src instanceof Truth.Statement ? src :
                src instanceof Truth.Span ? src.statement :
                    src instanceof Truth.InfixSpan ? src.statement :
                        null);
        }
        /**
         * Gets the 1-based line number of the Statement in which this Fault was detected.
         */
        get line() {
            const smt = this.statement;
            return smt.document.lineNumberOf(smt);
        }
    }
    Truth.Fault = Fault;
    /**
     *
     */
    class FaultType {
        constructor(
        /**
         * An error code, useful for reference purposes, or display in a user interface.
         */
        code, 
        /**
         * A human-readable description of the fault.
         */
        message, 
        /**
         *
         */
        severity) {
            this.code = code;
            this.message = message;
            this.severity = severity;
            this.message = message.trim().replace(/\s\s+/g, " ");
        }
        /**
         * Creates a fault of this type.
         */
        create(source) {
            return new Fault(this, source);
        }
    }
    Truth.FaultType = FaultType;
    /**
     * Utility function for creating frozen fault instances.
     */
    function createFault(code, message, severity = 8 /* error */) {
        return Object.freeze(new FaultType(code, message, severity));
    }
    const quantifiers = `(${"*" /* star */}, 
		${"+" /* plus */},
		${"{" /* quantifierStart */}..${"}" /* quantifierEnd */})`;
    /**
     *
     */
    Truth.Faults = Object.freeze({
        /** */
        *each() {
            const values = Object.values(Truth.Faults);
            for (const faultType of values)
                if (faultType instanceof FaultType)
                    yield faultType;
        },
        /**
         * @returns An object containing the FaultType instance
         * associated with the fault with the specified code, as
         * well as the name of the instance. In the case when the
         * faultCode was not found, null is returned.
         */
        nameOf(faultCode) {
            const entries = Object.entries(Truth.Faults);
            for (const [name, type] of entries)
                if (type instanceof FaultType)
                    if (type.code === faultCode)
                        return name;
            return "";
        },
        //# Resource-related faults
        /** */
        UnresolvedResource: createFault(100, "URI points to a resource that could not be resolved."),
        /** */
        CircularResourceReference: createFault(102, "URI points to a resource that would cause a circular reference."),
        /** */
        InsecureResourceReference: createFault(104, `Documents loaded from remote locations
			cannot reference documents stored locally.`),
        /** */
        DuplicateReference: createFault(106, "Document has already been referenced.", 8 /* error */),
        //# Type verification faults
        /** */
        UnresolvedAnnotation: createFault(201, "Unresolved annotation."),
        /** */
        CircularTypeReference: createFault(203, "Circular type reference detected."),
        /** */
        ContractViolation: createFault(
        //! CHANGE THIS TO 204
        205, "Overridden types must explicitly expand the type as defined in the base."),
        /** */
        TypeCannotBeRefreshed: createFault(206, `This type cannot be refreshed, because one or more base
			types are imposing a specific type contract on it. Consider
			omitting the ${":" /* joint */} operator here.`, 4 /* warning */),
        /** */
        IgnoredAnnotation: createFault(207, `This annotation is ignored because another annotation
			in this statement resolves to the same type.`),
        /** */
        IgnoredAlias: createFault(209, `Aliases (meaning annotations that are matched by patterns)
			can't be added onto types that have a contract put in place
			by a base type.`),
        /** */
        TypeSelfReferential: createFault(211, "Types cannot be self-referential"),
        //# List-related faults
        /** */
        AnonymousInListIntrinsic: createFault(300, "Types contained directly by List-intrinsic types cannot be anonymous.", 4 /* warning */),
        /** */
        ListContractViolation: createFault(301, "The containing list cannot contain children of this type.", 4 /* warning */),
        /** */
        ListIntrinsicExtendingList: createFault(303, "List intrinsic types cannot extend from other lists."),
        /** (This is the same thing as a list dimensionality conflict) */
        ListExtrinsicExtendingNonList: createFault(305, "Lists cannot extend from non-lists."),
        /** */
        ListDimensionalDiscrepancyFault: createFault(307, `A union cannot be created between these two types
			because they are lists of different dimensions.`),
        /** */
        ListAnnotationConflict: createFault(309, `All fragments of this annotation need to have
			a list operator (${"..." /* list */})`),
        //# Pattern-related faults
        /** */
        PatternInvalid: createFault(400, "Invalid pattern."),
        /** */
        PatternWithoutAnnotation: createFault(402, "Pattern has no annotations.", 4 /* warning */),
        /** */
        PatternCanMatchEmpty: createFault(404, "Patterns must not be able to match an empty input."),
        /** */
        PatternMatchingTypesAlreadyExists: createFault(406, `A pattern matching these types has 
			already been defined in this scope.`),
        /** */
        PatternMatchingList: createFault(407, "A pattern cannot match a list type."),
        /** */
        PatternCanMatchWhitespaceOnly: createFault(420, "Patterns must not be able to match an input " +
            "containing only whitespace characters."),
        /** */
        PatternAcceptsLeadingWhitespace: createFault(422, "Patterns must not be able to match an input " +
            "containing only whitespace characters."),
        /** */
        PatternRequiresLeadingWhitespace: createFault(424, "Patterns must not be able to match an input " +
            "containing only whitespace characters."),
        /** */
        PatternAcceptsTrailingWhitespace: createFault(426, "Patterns must not be able to match an input " +
            "containing only whitespace characters."),
        /** */
        PatternRequiresTrailingWhitespace: createFault(428, "Patterns must not be able to match an input " +
            "containing only whitespace characters."),
        /** */
        PatternNonCovariant: createFault(440, "Pattern does not match it's base types."),
        /** */
        PatternPartialWithCombinator: createFault(442, "Partial patterns cannot explicitly match the comma character."),
        /** */
        PatternsFormDiscrepantUnion: createFault(499, "A union cannot be created between these types because their " +
            "associated patterns conflict with each other."),
        //# Infix related
        /** */
        InfixHasQuantifier: createFault(
        ///0,
        500, `Infixes cannot have quantifiers ${quantifiers} applied to them`),
        /** */
        InfixHasDuplicateTerm: createFault(
        ///0,
        501, "Infixes cannot have duplicate terms."),
        /** */
        InfixHasSelfReferentialType: createFault(
        ///410,
        503, "Infixes cannot be self-referential."),
        /** */
        InfixNonConvariant: createFault(
        ///412,
        505, "Infixes must be compatible with their bases."),
        /** */
        InfixCannotDefineNewTypes: createFault(
        ///422,
        507, `A type referenced in an infix must be contained
			by the pattern statement directly, or be contained
			by one of it's matched bases.`),
        /** */
        InfixReferencedTypeMustHavePattern: createFault(
        ///414,
        509, "Types applied to an infix must have at least one associated pattern."),
        /** */
        InfixReferencedTypeCannotBeRecursive: createFault(
        ///416,
        511, "Types applied to an infix must not create a recursive structure."),
        /** */
        InfixContractViolation: createFault(
        ///424,
        513, "Infix type annotations must explicitly expand the type as defined by the base."),
        /** */
        InfixPopulationChaining: createFault(
        ///426,
        515, "Population infixes cannot have multiple declarations."),
        /** */
        InfixUsingListOperator: createFault(
        ///0,
        517, `Infix terms cannot end with the list operator (${"..." /* list */}).`),
        /** */
        InfixReferencingList: createFault(
        ///428,
        519, "Infixes cannot reference list types."),
        /** */
        PortabilityInfixHasMultipleDefinitions: createFault(
        ///418,
        521, `Portability infixes with compatible types cannot
			be specified more than once.`),
        /** */
        PortabilityInfixHasUnion: createFault(
        ///418,
        523, "Portability infixes with unioned types are not supported at this time."),
        /** */
        PopulationInfixHasMultipleDefinitions: createFault(
        ///0,
        525, `Declarations in a population infix cannot be 
			defined twice in the same pattern`),
        /** */
        NominalInfixMustSubtype: createFault(
        ///430,
        527, "Patterns with nominal infixes require an input that is " +
            "a subtype of the type specified, not the type itself."),
        //# Parse errors
        /** */
        StatementBeginsWithComma: createFault(600, "Statements cannot begin with a comma."),
        /** */
        StatementBeginsWithEllipsis: createFault(602, "Statements cannot begin with an ellipsis (...)."),
        /** */
        StatementBeginsWithEscapedSpace: createFault(604, "Statements cannot begin with an escape character (\\) " +
            "that is followed by a tab or space."),
        /** */
        StatementContainsOnlyEscapeCharacter: createFault(606, "A statement cannot consist of a single escape character (\\)"),
        /** */
        StatementBeginsWithInvalidSequence: createFault(608, "A statement cannot begin with the sequences: /*, /+, or /?"),
        //# Parsing Faults
        /** */
        TabsAndSpaces: createFault(1000, "Statement indent contains a mixture of tabs and spaces.", 4 /* warning */),
        /** */
        DuplicateDeclaration: createFault(1001, "Duplicated declaration."),
        /** */
        UnterminatedCharacterSet: createFault(1002, `Unterminated character set. Pattern has an opening
			"${"[" /* setStart */}" character without a matching
			"${"]" /* setEnd */}" character.`),
        /** */
        UnterminatedGroup: createFault(1004, `Unterminated group. Pattern has an opening
			"${"(" /* groupStart */}" character without a matching
			"${")" /* groupEnd */}" character.`),
        /** */
        DuplicateQuantifier: createFault(1006, `Multiple consecutive quantifiers ${quantifiers} are not allowed.`),
        /** */
        UnterminatedInfix: createFault(1008, `Unterminated infix. Pattern has an opening ${"<" /* start */},
			${"<<" /* nominalStart */}, ${"</" /* patternStart */} delimiter without
			a matching closing delimiter.`),
        /** */
        EmptyPattern: createFault(1010, "Pattern has no matchable content.")
    });
    // Additional safety
    Array.from(Truth.Faults.each()).every(Object.freeze);
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * A chain of Subjects that form a path to a particular
     * location within a Document.
     *
     * The lifetime of a Phrase is pinned (directly or indirectly)
     * to the lifetime of a Document. A Document object as a
     * reference to a root-level Phrase, and Phrase objects are
     * then store references to their nested Phrase children.
     */
    class Phrase extends Truth.AbstractClass {
        /** */
        constructor(parent, 
        /**
         * Stores a reference to the Document that ultimately
         * contains this Phrase.
         */
        containingDocument, 
        /**
         * Stores the subject that exists at the end of this phrase.
         */
        terminal, 
        /**
         * Stores the number of subjects in this Phrase. This value
         * is equivalent to the length of this Phrase's ancestry.
         */
        length) {
            super();
            this.containingDocument = containingDocument;
            this.terminal = terminal;
            this.length = length;
            /** */
            this.class = 3 /* phrase */;
            /** */
            this.forwardings = new Map();
            this._subjects = null;
            this._ancestry = null;
            /**
             * @internal
             * For reasons related to performance and architectural simplicity,
             * a reference to the Node to which this Phrase is associated is
             * stored here. This is so that we can avoid managing a separate
             * index to manage the relationship between these two objects.
             * Phrases are created before their associated Node, and so in this
             * case, this field is null.
             *
             * This field should only be assigned from within the Node class.
             */
            this.associatedNode = null;
            this.parent = parent || this;
        }
        /**
         * @internal
         * Creates a new root phrase.
         */
        static new(containingDocument) {
            return new Phrase(null, containingDocument, Truth.Term.void, 0);
        }
        /**
         * @internal
         * Finds or creates a Phrase object from the specified Spine.
         * Returns null in the case when the Spine passes through
         * statements that have been marked as cruft.
         */
        static fromSpine(spine) {
            let current = spine.document.phrase;
            for (const vert of spine.vertebrae) {
                if (!(vert instanceof Truth.Span))
                    return null;
                current = current.forward(vert.boundary.subject);
            }
            return current;
        }
        /**
         * @internal
         * Iterates through the first-level phrases of the specified document,
         * skipping over the phrases that don't have an associated node.
         */
        static *rootsOf(document) {
            for (const phrase of document.phrase.forwardings.values())
                if (phrase.associatedNode !== null)
                    yield phrase;
        }
        /**
         * Returns a reference to the phrase that is 1 subject shorter than
         * this one (counting from the end).
         */
        back() {
            return this.parent || this;
        }
        /**
         * Returns a reference to the phrase that is extended by the subject specified.
         */
        forward(subject) {
            return Truth.Misc.get(this.forwardings, subject, () => new Phrase(this, this.containingDocument, subject, this.length + 1));
        }
        /**
         * Returns a reference to the phrase that is extended by the array of subjects specified.
         */
        forwardDeep(path) {
            let current = this;
            for (const item of path) {
                const subject = typeof item === "string" ? Truth.Term.from(item) : item;
                current = current.forward(subject);
            }
            return current;
        }
        /**
         * Gets an array containing the subjects that compose this phrase.
         * Note that if only the number of subjects is required, the .length
         * field should be used instead.
         */
        get subjects() {
            return this._subjects ?
                this._subjects :
                this._subjects = this.ancestry.map(ph => ph.terminal);
        }
        /**
         * Gets an array of Phrase objects that form a path leading to this Phrase.
         * For example, if the subjects of this Phrase were to serialize to something
         * like AA / BB / CC, then this property would store an array of 3 Phrases,
         * which would serialize to:
         *
         * AA
         * AA / BB
         * AA / BB / CC
         *
         * Note that if only the length of the phrase is required, the .length
         * field should be used instead.
         */
        get ancestry() {
            if (this._ancestry === null) {
                this._ancestry = [];
                let current = this;
                // The ancestry never includes the 0-length phrase
                // attached to a document, and always includes itself.
                while (current.length > 0) {
                    this._ancestry.unshift(current);
                    current = current.parent;
                }
            }
            return this._ancestry;
        }
        /**
         * Returns a string representation of this Phrase, suitable for debugging purposes.
         */
        toString() {
            const uri = this.containingDocument.uri.toString();
            const path = this.subjects.map(sub => sub.toString()).join("/");
            return uri + "//" + path;
        }
    }
    Truth.Phrase = Phrase;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    const hashRegex = new RegExp("[a-f0-9]{" + Truth.Hash.length + "}", "i");
    /**
     * A reference type that encapsulates a unique term within a document.
     * A term may be the name of a type, such as "Product", or it may also
     * be some type alias to be matched by a pattern, such as "10cm".
     */
    class Term extends Truth.AbstractClass {
        /** */
        constructor(
        /**
         * Stores the inner content of this Term.
         */
        textContent, forceSingular) {
            super();
            this.textContent = textContent;
            /** */
            this.class = 4 /* term */;
            /**
             * Stores a pattern hash, in the case when this Term
             * relates to a pattern. Stores an empty string in other cases.
             */
            this.hash = "";
            this.hash = this.tryExtractHash(textContent);
            const listTok = "..." /* list */;
            const tokLen = listTok.length;
            const isList = textContent.length > tokLen + 1 && textContent.slice(-tokLen) === listTok;
            this.singular = isList && !forceSingular ?
                Term.internalFrom(textContent.slice(0, -tokLen), true) :
                this;
        }
        /**
         * Finds or creates a Term object whose inner textContent is equal
         * to the textContent value specified. This method is used to acquire
         * a reference to a Term, instead of using the Term constructor (which
         * is private), to ensure that there is only ever one instance of a Term
         * for each unique textContent value.
         *
         * @returns A term object that corresponds to the string specified.
         */
        static from(textContent) {
            return this.internalFrom(unescape(textContent), false);
        }
        /** */
        static internalFrom(textContent, forceSingular) {
            return Truth.Misc.get(this.cache, textContent, () => new Term(textContent, forceSingular));
        }
        /** */
        tryExtractHash(text) {
            const delim = "/" /* main */;
            const delimEsc = escape(delim);
            const delimLen = text.startsWith(delim) ? delim.length :
                text.startsWith(delimEsc) ? delimEsc.length :
                    -1;
            const hashLen = Truth.Hash.length;
            if (delimLen < 0 || text.length < delimLen + hashLen + 1)
                return "";
            const hash = text.substr(delimLen, hashLen);
            if (hash.length !== hashLen || !hashRegex.test(hash))
                return "";
            return hash;
        }
        /** Stores whether this component represents a pattern. */
        get isPattern() { return this.hash !== ""; }
        /**
         * Gets whether this Term conforms to the list syntax.
         */
        get isList() {
            return this.singular !== this;
        }
        /**
         * Converts this Term to it's string representation.
         * @param escape If true, preserves any necessary
         * escaping required to ensure the term string
         * is in a parsable format.
         */
        toString(escape = 0 /* none */) {
            const val = (() => {
                switch (escape) {
                    case 0 /* none */:
                        return this.textContent;
                    case 1 /* declaration */:
                        {
                            // Regex delimiters are escaped if and only if 
                            // they're the first character in a term.
                            const dlmReg = new RegExp("^" + "/" /* main */);
                            const jntRegS = new RegExp(":" /* joint */ + " " /* space */);
                            const jntRegT = new RegExp(":" /* joint */ + "\t" /* tab */);
                            const cmbReg = new RegExp("," /* combinator */);
                            return this.textContent
                                .replace(dlmReg, "\\" /* escapeChar */ + "/" /* main */)
                                .replace(jntRegS, "\\" /* escapeChar */ + ":" /* joint */ + " " /* space */)
                                .replace(jntRegT, "\\" /* escapeChar */ + ":" /* joint */ + "\t" /* tab */)
                                .replace(cmbReg, "\\" /* escapeChar */ + "," /* combinator */);
                        }
                    case 2 /* annotation */:
                        {
                            const reg = new RegExp("," /* combinator */);
                            const rep = "\\" /* escapeChar */ + "," /* combinator */;
                            return this.textContent.replace(reg, rep);
                        }
                }
            })();
            return val + (this.isList ? "..." /* list */ : "");
        }
    }
    /**
     * Stores a cache of all Terms created by the compiler.
     */
    Term.cache = new Map();
    /**
     * Stores an empty-string term, which is used as a marker term
     * to represent what is eventually presented as an anonymous type.
     */
    Term.void = Term.from("");
    Truth.Term = Term;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * Infinite incremental counter.
     */
    class VersionStamp {
        /** */
        constructor(stamp) {
            this.stamp = stamp;
        }
        /** */
        static next() {
            const createStamp = (stamp) => new VersionStamp(Object.freeze(stamp));
            if (typeof BigInt !== "undefined") {
                if (this.nextStamp === undefined)
                    return createStamp(this.nextStamp = BigInt(1));
                // See: https://github.com/eslint/eslint/issues/10574
                // eslint-disable-next-line valid-typeof
                if (typeof this.nextStamp === "bigint")
                    return createStamp(++this.nextStamp);
            }
            else {
                if (this.nextStamp === undefined) {
                    this.nextStamp = [1];
                    return createStamp(this.nextStamp.slice());
                }
                const ns = this.nextStamp;
                if (Array.isArray(ns)) {
                    // Polyfill infinite number counter for use in the 
                    // absence of a native BigInt implementation.
                    for (let i = ns.length; i-- > 0;) {
                        if (ns[i] === 999999999999) {
                            ns[i] = 0;
                            if (i === 0)
                                ns.unshift(1);
                        }
                        else {
                            ns[i]++;
                            break;
                        }
                    }
                    return createStamp(ns.slice());
                }
            }
            throw Truth.Exception.unknownState();
        }
        /** */
        newerThan(otherStamp) {
            return this.stamp > otherStamp.stamp;
        }
        /** */
        toString() {
            return Array.isArray(this.stamp) ?
                this.stamp.join("") :
                this.stamp.toString();
        }
    }
    Truth.VersionStamp = VersionStamp;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     */
    class AlphabetRange {
        constructor(from, to) {
            this.from = from;
            this.to = to;
        }
    }
    Truth.AlphabetRange = AlphabetRange;
    /**
     * @internal
     */
    class Alphabet {
        /** */
        constructor(...ranges) {
            /** */
            this.ranges = [];
            this.ranges = ranges;
        }
        /**
         * Iterates through each character defined in the alphabet.
         */
        *[Symbol.iterator]() {
            for (const range of this.ranges)
                for (let i = range.from; i <= range.to; i++)
                    yield String.fromCodePoint(i);
        }
        /**
         * Iterates through all defined ranges in the alphabet,
         * excluding the wildcard range.
         */
        *eachRange() {
            if (this.hasWildcard()) {
                for (let rangeIdx = 0; rangeIdx < this.ranges.length - 1;)
                    yield this.ranges[rangeIdx++];
            }
            else
                for (const range of this.ranges)
                    yield range;
        }
        /** */
        has(symbol) {
            if (symbol === Alphabet.wildcard)
                return this.hasWildcard();
            const code = toCharCode(symbol);
            for (const range of this.ranges)
                if (range.from >= code && range.to <= code)
                    return true;
            return false;
        }
        /** */
        hasWildcard() {
            const rng = this.ranges;
            return rng.length > 0 && rng[rng.length - 1] === Alphabet.wildcardRange;
        }
        /**
         * @returns A string representation of this object,
         * for testing and debugging purposes.
         */
        toString() {
            const symbols = [];
            for (const range of this.ranges)
                symbols.push(range.from === range.to ?
                    String.fromCodePoint(range.from) :
                    String.fromCodePoint(range.from) + " - " + String.fromCodePoint(range.to));
            if (this.hasWildcard())
                symbols.push(Alphabet.wildcard);
            return "[" + symbols.join(", ") + "]";
        }
    }
    /**
     * Stores a special token that the system understands to be the
     * wildcard character. The length of the token is longer than any
     * other token that could otherwise be found in the alphabet.
     */
    Alphabet.wildcard = "((wild))";
    /**
     * Stores a range that represents the wildcard character.
     * The range of the wildcard is positive infinity in both directions,
     * to ensure that it's always sorted last in the ranges array.
     */
    Alphabet.wildcardRange = Object.freeze(new AlphabetRange(Infinity, Infinity));
    Truth.Alphabet = Alphabet;
    /**
     * @internal
     * A disposable class for easily creating Alphabet instances
     * (This design avoids introducing mutability into the Alphabet class).
     */
    class AlphabetBuilder {
        /** */
        constructor(...others) {
            /** */
            this.ranges = [];
            for (const item of others) {
                if (item instanceof Alphabet) {
                    const theRanges = Array.from(item.eachRange());
                    for (const range of theRanges)
                        this.ranges.push(range);
                }
                else if (item instanceof AlphabetRange) {
                    this.ranges.push(item);
                }
                else {
                    const code = toCharCode(item);
                    this.ranges.push(new AlphabetRange(code, code));
                }
            }
        }
        /**
         * Adds an entry to the alphabet.
         * If the second parameter is omitted, the entry refers to a
         * single character, rather than a range of characters.
         */
        add(from, to) {
            const toAsNum = to === undefined ? from : to;
            this.ranges.push(new AlphabetRange(toCharCode(from), toCharCode(toAsNum)));
            return this;
        }
        /** */
        addWild() {
            this.ranges.push(Alphabet.wildcardRange);
            return this;
        }
        /**
         * @returns An optimized Alphabet instances composed
         * from the characters and ranges applied to this AlphabetBuilder.
         *
         * @param invert In true, causes the entries in the generated
         * Alphabet to be reversed, such that every character marked
         * as included is excluded, and vice versa.
         */
        toAlphabet(invert) {
            if (this.ranges.length === 0)
                return new Alphabet();
            const ranges = this.ranges
                .slice()
                .sort((a, b) => a.from - b.from);
            // Quick optimization of ranges
            for (let i = 0; i < ranges.length - 1; i++) {
                const thisRange = ranges[i];
                while (i < ranges.length - 1) {
                    const nextRange = ranges[i + 1];
                    // Omit
                    if (thisRange.to >= nextRange.to) {
                        ranges.splice(i + 1, 1);
                    }
                    // Concat
                    else if (thisRange.to + 1 >= nextRange.from) {
                        ranges.splice(i + 1, 1);
                        ranges[i] = new AlphabetRange(thisRange.from, nextRange.to);
                    }
                    // Next
                    else
                        break;
                }
            }
            if (invert) {
                //
                // This alphabet inversion algorithm has to deal with 4 cases,
                // depending on the pattern of the ranges and the spaces.
                // After the ranges are sorted and optimized, the ranges
                // array represents a layout that alternates between ranges
                // and spaces. There are 4 basic layouts (R = Range, S = Space):
                //
                // RSRS - Starts with a range, ends with a space
                // SRSR - Starts with a space, ends with a range
                // RSRSR - Starts with a range, ends with a range
                // SRSRS - Starts with a space, ends with a space
                // 
                // The algorithm deal with any leading or trailing space
                // separately, to make the looping less complicated. 
                // 
                const rangesInv = [];
                const lastRange = ranges[ranges.length - 1];
                const matchesZero = ranges[0].from === 0;
                const matchesMax = lastRange.to === Truth.UnicodeMax;
                if (matchesZero && matchesMax && ranges.length === 1)
                    return new Alphabet();
                if (!matchesZero)
                    rangesInv.push(new AlphabetRange(0, ranges[0].from));
                const endAt = matchesMax ?
                    lastRange.from :
                    Truth.UnicodeMax;
                for (let i = 0; i < ranges.length; i++) {
                    const prevRangeEnd = ranges[i].to;
                    const nextRangeStart = i < ranges.length - 1 ?
                        ranges[i + 1].from :
                        Truth.UnicodeMax + 1;
                    rangesInv.push(new AlphabetRange(prevRangeEnd + 1, nextRangeStart - 1));
                    if (nextRangeStart >= endAt)
                        break;
                }
                if (!matchesMax)
                    rangesInv.push(new AlphabetRange(lastRange.from, Truth.UnicodeMax));
            }
            return new Alphabet(...ranges);
        }
    }
    Truth.AlphabetBuilder = AlphabetBuilder;
    /** */
    function toCharCode(symbol) {
        return typeof symbol === "string" ?
            symbol.charCodeAt(0) :
            symbol;
    }
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     */
    class TransitionMap {
        /** */
        constructor(transitionLiteral) {
            const transitions = new Map();
            if (transitionLiteral) {
                for (const [stateIdText, tslObject] of Object.entries(transitionLiteral)) {
                    const stateId = parseInt(stateIdText, 10);
                    if (stateId !== stateId)
                        throw new TypeError();
                    if (!tslObject || typeof tslObject !== "object")
                        throw new TypeError();
                    const tsl = tslObject;
                    transitions.set(stateId, new Truth.TransitionState(tsl));
                }
            }
            this.transitions = transitions;
        }
        /** */
        *[Symbol.iterator]() {
            for (const [stateId, transitionState] of this.transitions.entries())
                yield [stateId, transitionState];
        }
        /** */
        clone() {
            const out = new TransitionMap({});
            for (const [key, value] of this.transitions)
                out.transitions.set(key, value.clone());
            return out;
        }
        /** */
        has(stateId, symbol) {
            const transitionState = this.transitions.get(stateId);
            if (!transitionState)
                return false;
            if (symbol === undefined)
                return !!transitionState;
            return transitionState.has(symbol);
        }
        get(stateId, symbol) {
            const transitionState = this.transitions.get(stateId);
            if (!transitionState)
                return undefined;
            if (symbol === undefined)
                return transitionState;
            return transitionState.get(symbol);
        }
        acquire(stateId, symbol) {
            const transitionState = this.transitions.get(stateId);
            if (!transitionState)
                throw new Error();
            if (symbol === undefined)
                return transitionState;
            const subStateId = transitionState.get(symbol);
            if (subStateId === undefined)
                throw new Error();
            return subStateId;
        }
        /** */
        *eachStateId() {
            for (const stateId of this.transitions.keys())
                yield stateId;
        }
        /**
         * @returns A string representation of this object,
         * for testing and debugging purposes.
         */
        toString() {
            const out = ["{"];
            for (const [stateId, tState] of this.transitions)
                out.push("\t" + stateId + ": " + tState.toString());
            out.push("}");
            return out.join("\n");
        }
    }
    Truth.TransitionMap = TransitionMap;
    /**
     * @internal
     */
    class MutableTransitionMap extends TransitionMap {
        /** */
        initialize(srcStateId) {
            this.transitions.set(srcStateId, new Truth.TransitionState());
        }
        /** */
        set(srcStateId, symbol, dstStateId) {
            const tState = this.transitions.get(srcStateId);
            if (!tState) {
                const tState = new Truth.TransitionState();
                tState.set(symbol, dstStateId);
                this.transitions.set(srcStateId, tState);
            }
            else {
                tState.set(symbol, dstStateId);
            }
        }
    }
    Truth.MutableTransitionMap = MutableTransitionMap;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     */
    class TransitionState {
        /** */
        constructor(source) {
            this.stateMap = new Map();
            if (source)
                for (const [symbol, stateId] of Object.entries(source))
                    this.stateMap.set(symbol, stateId);
        }
        /** */
        clone() {
            const cloned = new TransitionState();
            for (const [symbol, stateId] of this.stateMap)
                cloned.stateMap.set(symbol, stateId);
            return cloned;
        }
        /** */
        has(symbol) {
            return this.stateMap.has(symbol);
        }
        /** */
        get(symbol) {
            return this.stateMap.get(symbol);
        }
        /** */
        set(symbol, stateId) {
            this.stateMap.set(symbol, stateId);
        }
        /** */
        *eachSymbol() {
            for (const symbol of this.stateMap.keys())
                yield symbol;
        }
        /**
         * @returns A string representation of this object,
         * for testing and debugging purposes.
         */
        toString() {
            const out = [];
            for (const [symbol, stateId] of this.stateMap)
                out.push("{ " + symbol + ": " + stateId + " }");
            return out.length ? out.join(", ") : "{}";
        }
    }
    Truth.TransitionState = TransitionState;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     */
    class Guide {
        /** */
        constructor(from) {
            /** */
            this.hasDst = null;
            /** */
            this.isFrozen = false;
            /** */
            this.arrows = new Map();
            if (from instanceof Guide) {
                this.hasDst = from.hasDst;
                for (const [stateIdSrc, stateIdDst] of from.arrows)
                    this.arrows.set(stateIdSrc, stateIdDst);
            }
            else if (typeof from === "number") {
                this.add(from);
            }
            else if (from) {
                for (const [stateIdSrc, stateIdDst] of from)
                    this.arrows.set(stateIdSrc, stateIdDst);
            }
        }
        /** */
        clone() {
            const cloned = new Guide();
            for (const [stateIdSrc, stateIdDst] of this.arrows)
                cloned.arrows.set(stateIdSrc, stateIdDst);
            return cloned;
        }
        /** */
        has(stateIdSrc) {
            return this.arrows.has(stateIdSrc);
        }
        /** */
        get(stateIdSrc) {
            return this.arrows.get(stateIdSrc);
        }
        /** */
        add(stateIdSrc, stateIdDst = null) {
            if (this.isFrozen)
                throw new TypeError();
            if (this.hasDst === null) {
                this.arrows.set(stateIdSrc, stateIdDst);
            }
            else {
                if (stateIdDst !== stateIdDst)
                    throw new TypeError();
                if (this.hasDst === true && typeof stateIdDst !== "number" ||
                    this.hasDst === false && typeof stateIdDst === "number")
                    throw new Error("Parameters need to be kept consistent across the instance.");
                this.arrows.set(stateIdSrc, stateIdDst);
            }
            this.hasDst = stateIdDst !== null;
        }
        /** */
        append(other) {
            if (this.isFrozen)
                throw new TypeError();
            if (this.hasDst === null) {
                for (const [src, dst] of other.arrows) {
                    this.hasDst = typeof dst === "number";
                    this.arrows.set(src, dst);
                }
            }
            else if (other.hasDst === null) {
                if (other.size !== 0)
                    throw Truth.Exception.unknownState();
            }
            else {
                for (const [src, dst] of other.arrows)
                    this.arrows.set(src, dst);
            }
        }
        /** */
        first() {
            const out = this.arrows.get(0);
            if (out === null || out === undefined)
                throw new Error();
            return out;
        }
        /** */
        *keys() {
            for (const src of this.arrows.keys())
                yield src;
        }
        /** */
        *values() {
            if (this.hasDst === true)
                for (const dst of this.arrows.values())
                    yield Truth.Not.null(dst);
        }
        /** */
        *entries() {
            if (this.hasDst === false)
                throw new Error("Cannot enumerate the full entries of this instance.");
            for (const [stateIdSrc, stateIdDst] of this.arrows)
                yield [stateIdSrc, Truth.Not.null(stateIdDst)];
        }
        /** */
        get size() { return this.arrows.size; }
        /**
         * @returns A boolean value that indicates whether the contents
         * of this guide match the contents of the guide specified in the
         * parameter.
         */
        equals(other) {
            if (this.size !== other.size)
                return false;
            for (const [src, dst] of this.arrows)
                if (other.arrows.get(src) !== dst)
                    return false;
            return true;
        }
        /** */
        freeze() {
            this.isFrozen = true;
            return this;
        }
        /**
         * @returns A string representation of this object,
         * for testing and debugging purposes.
         */
        toString() {
            if (this.hasDst) {
                const literal = [];
                for (const [stateIdSrc, stateIdDst] of this.arrows)
                    literal.push(stateIdSrc + ": " + stateIdDst);
                return "{ " + literal.join(", ") + " }";
            }
            return "[" + Array.from(this.arrows.keys()).join(", ") + "]";
        }
    }
    Truth.Guide = Guide;
})(Truth || (Truth = {}));
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
var Truth;
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
(function (Truth) {
    /**
     * Oblivion is a Symbol object that is returned while calling crawl() if the Fsm
     * is transitioned to the oblivion state. For example while crawling two Fsms
     * in parallel we may transition to the oblivion state of both Fsms at once.
     * This warrants an out-of-bound signal which will reduce the complexity of
     * the new Fsm's map.
     */
    const Oblivion = Symbol();
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
    class Fsm {
        /** */
        constructor(
        /**
         * An iterable of symbols the Fsm can be fed.
         */
        alphabet, 
        /**
         * The set of possible states for the Fsm.
         */
        states, 
        /**
         * The initial state of the Fsm.
         */
        initial, 
        /**
         * The set of states that the Fsm accepts.
         */
        finals, 
        /**
         * May be sparse (i.e. it may omit transitions).
         * In the case of omitted transitions, a non-final
         * "oblivion" state is simulated.
         */
        transitions) {
            this.alphabet = alphabet;
            this.states = states;
            this.initial = initial;
            this.finals = finals;
            this.transitions = transitions;
        }
        /**
         * @returns A new Fsm instance that accept
         * no inputs, not even an empty string.
         */
        static empty(alphabet) {
            const tsl = {};
            for (const symbol of alphabet)
                tsl[symbol] = 0;
            return new Fsm(alphabet, new Set([0]), 0, new Set(), new Truth.TransitionMap({ 0: tsl }));
        }
        /**
         * @returns An Fsm that matches only an empty string.
         */
        static epsilon(alphabet) {
            return new Fsm(alphabet, new Set([0]), 0, new Set([0]), new Truth.TransitionMap());
        }
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
        accepts(input) {
            const thisHasWild = this.alphabet.hasWildcard();
            let stateId = this.initial;
            for (const char of input) {
                const symbol = thisHasWild && !this.alphabet.has(char) ?
                    Truth.Alphabet.wildcard :
                    char;
                // Missing transition = transition to dead state
                if (!this.transitions.has(stateId, symbol))
                    return false;
                const newStateId = this.transitions.get(stateId, symbol);
                if (newStateId === undefined)
                    throw new ReferenceError();
                stateId = newStateId;
            }
            return this.finals.has(stateId);
        }
        /**
         * @returns A reduced version of the Fsm, down to a minimal finite
         * state machine equivalent.
         *
         * (A result by Brzozowski (1963) shows that a minimal finite state
         * machine equivalent to the original can be obtained by reversing
         * the original twice.)
         */
        reduce() {
            return this.reverse().reverse();
        }
        /**
         * @returns A new Fsm instance that represents the concatenation
         * of the specified series of finite state machines.
         */
        concatenate(...fsms) {
            if (fsms.length === 0)
                throw new RangeError();
            if (fsms.length === 1)
                return fsms[0];
            /**
             * Take a state in the numbered Fsm and return a set containing it,
             * plus (if it's final) the first state from the next Fsm,
             * plus (if that's final) the first state from the next but one Fsm,
             * plus...
             */
            const connectAll = (idx, substateId) => {
                const result = new Truth.Guide();
                result.add(idx, substateId);
                let i = idx;
                let id = substateId;
                while (i < fsms.length - 1 && fsms[i].finals.has(id)) {
                    i++;
                    id = fsms[i].initial;
                    result.add(i, id);
                }
                return result;
            };
            /**
             * Use a superset containing states from all Fsms at once.
             * We start at the start of the first Fsm. If this state is final in the
             * first Fsm, then we are also at the start of the second Fsm. And so on.
             */
            const initial = new Truth.Guide();
            if (fsms.length > 0)
                initial.append(connectAll(0, fsms[0].initial));
            /**
             * If you're in a final state of the final Fsm, it's final.
             */
            const finalFn = (guide) => {
                for (const [i, substateId] of guide.entries())
                    if (i === fsms.length - 1 && fsms[i].finals.has(substateId))
                        return true;
                return false;
            };
            /** */
            const followFn = (guide, symbol) => {
                const next = new Truth.Guide();
                for (const [i, substateId] of guide.entries()) {
                    const fsm = fsms[i];
                    if (fsm.transitions.has(substateId, symbol)) {
                        const storedValue = fsm.transitions.acquire(substateId, symbol);
                        next.append(connectAll(i, storedValue));
                    }
                }
                return next.size === 0 ?
                    Oblivion :
                    next;
            };
            const alphabets = fsms.map(fsm => fsm.alphabet);
            const alphabet = new Truth.AlphabetBuilder(...alphabets).toAlphabet();
            return crawl(alphabet, initial, finalFn, followFn);
        }
        /**
         * Concatenate two finite state machines together.
         * For example, if this accepts "0*" and other accepts "1+(0|1)",
         * will return a finite state machine accepting "0*1+(0|1)".
         * Accomplished by effectively following non-deterministically.
         */
        add(other) {
            return this.concatenate(this, other);
        }
        /**
         * If the present Fsm accepts X, returns an Fsm accepting X*
         * (i.e. 0 or more instances of X). Note that this is not as simple
         * as naively connecting the final states back to the initial state:
         * see (b*ab)* for example.
         */
        star() {
            const initial = new Truth.Guide(this.initial);
            /** */
            const followFn = (guide, symbol) => {
                const next = new Truth.Guide();
                for (const substateId of guide.keys()) {
                    if (this.transitions.has(substateId, symbol))
                        next.add(this.transitions.acquire(substateId, symbol));
                    // If one of our substates is final, then we can also consider
                    // transitions from the initial state of the original Fsm.
                    if (this.finals.has(substateId) && this.transitions.has(this.initial, symbol))
                        next.add(this.transitions.acquire(this.initial, symbol));
                }
                return next.size === 0 ?
                    Oblivion :
                    next;
            };
            /** */
            const finalFn = (guide) => {
                for (const substateId of guide.keys())
                    if (this.finals.has(substateId))
                        return true;
                return false;
            };
            return crawl(this.alphabet, initial, finalFn, followFn).or(Fsm.epsilon(this.alphabet));
        }
        /**
         * Given an Fsm and a multiplication factor, return the multiplied Fsm.
         */
        multiply(factor) {
            if (factor < 0)
                throw new RangeError();
            const initial = new Truth.Guide([[this.initial, 0]]);
            /** */
            const finalFn = (guide) => {
                for (const [substateId, iteration] of guide.entries())
                    if (this.initial === substateId)
                        if (this.finals.has(this.initial) || iteration === factor)
                            return true;
                return false;
            };
            /** */
            const followFn = (guide, symbol) => {
                const next = new Truth.Guide();
                for (const [substateId, iteration] of guide.entries()) {
                    if (iteration < factor && this.transitions.has(substateId, symbol)) {
                        const num = this.transitions.acquire(substateId, symbol);
                        next.add(num, iteration);
                        if (this.finals.has(num))
                            next.add(this.initial, iteration + 1);
                    }
                }
                if (next.size === 0)
                    return Oblivion;
                return next;
            };
            return crawl(this.alphabet, initial, finalFn, followFn).reduce();
        }
        /**
         * @returns A new Fsm object that presents the union of
         * all supplied Fsm instances.
         */
        union(...fsms) {
            return crawlParallel(prependFsm(this, fsms), accepts => accepts.some(val => val));
        }
        /**
         * Performs logical alternation between this Fsm, and the Fsm
         * instance supplied in the argument.
         *
         * @returns A finite state machine which accepts any sequence of
         * symbols that is accepted by either self or other. Note that the set
         * of strings recognised by the two Fsms undergoes a set union.
         */
        or(other) {
            return this.union(other);
        }
        /**
         * @returns A new Fsm object that represents the
         * intersection of all supplied Fsm instances.
         */
        intersection(...fsms) {
            return crawlParallel(prependFsm(this, fsms), accepts => accepts.every(val => val));
        }
        /**
         * Treat the Fsms as sets of strings and return the
         * intersection of those sets in the form of a new Fsm.
         */
        and(other) {
            return this.intersection(other);
        }
        /**
         * @returns A new Fsm object that represents the computed
         * symmetric difference of all suppled Fsm instances.
         */
        symmetricDifference(...fsms) {
            return crawlParallel(prependFsm(this, fsms), accepts => accepts.filter(val => val).length % 2 === 1);
        }
        /**
         * @returns A new Fsm instances that recognises only the strings
         * recognised by this Fsm, or the Fsm instance supplied in the
         * other argument, but not both.
         */
        xor(other) {
            return this.symmetricDifference(other);
        }
        /**
         * @returns A new Fsm instance that recogizes all inputs that
         * would not be accepted by this Fsm.
         */
        not() {
            const initial = new Truth.Guide([[0, this.initial]]);
            /** */
            const followFn = (guide, symbol) => {
                const next = new Truth.Guide();
                const first = guide.first();
                if (first !== undefined)
                    if (this.transitions.has(first, symbol))
                        next.add(0, this.transitions.get(first, symbol));
                return next;
            };
            /** */
            const finalFn = (guide) => {
                const first = guide.first();
                return !(first !== undefined && this.finals.has(first));
            };
            return crawl(this.alphabet, initial, finalFn, followFn);
        }
        /**
         * @returns A new Fsm such that for every input that the supplied
         * Fsm accepts, the new Fsm accepts the same input, but reversed.
         */
        reverse() {
            // Start from a composite "state-set" consisting of all final states.
            // If there are no final states, this set is empty and we'll find that
            // no other states get generated.
            const initial = new Truth.Guide();
            for (const stateId of this.finals)
                initial.add(stateId);
            // Find every possible way to reach the current state-set
            // using this symbol.
            const followFn = (guide, symbol) => {
                const next = new Truth.Guide();
                for (const prevStateId of this.transitions.eachStateId())
                    for (const stateId of guide.keys())
                        if (this.transitions.has(prevStateId, symbol))
                            if (this.transitions.get(prevStateId, symbol) === stateId)
                                next.add(prevStateId);
                return next.size === 0 ?
                    Oblivion :
                    next;
            };
            /** */
            const finalFn = (guide) => guide.has(this.initial);
            return crawl(this.alphabet, initial, finalFn, followFn);
        }
        /**
         * @returns A boolean value indicating whether this Fsm instance
         * accepts the same set of inputs as the Fsm instance specified
         * in the argument.
         */
        equivalent(other) {
            return this.xor(other).isEmpty();
        }
        /**
         * @returns A boolean value indicating whether this Fsm instance
         * does not accept the same set of inputs as the Fsm instance
         * specified in the argument.
         */
        unequivalent(other) {
            return !this.xor(other).isEmpty();
        }
        /**
         * @returns An Fsm instance which recognises only the inputs
         * recognised by the first Fsm instance in the list, but none of
         * the others.
         */
        difference(...fsms) {
            return crawlParallel(prependFsm(this, fsms), accepts => accepts[0] && accepts.slice(1).every(accepts => !accepts));
        }
        /**
         * @returns A boolean value that indicates whether a final state
         * can be reached from the specified state.
         */
        isStateLive(stateId) {
            const reachable = [stateId];
            for (let i = -1; ++i < reachable.length;) {
                const currentStateId = reachable[i];
                if (this.finals.has(currentStateId))
                    return true;
                if (this.transitions.has(currentStateId)) {
                    const transitionState = this.transitions.acquire(currentStateId);
                    for (const symbol of transitionState.eachSymbol()) {
                        const next = this.transitions.acquire(currentStateId, symbol);
                        if (!reachable.includes(next))
                            reachable.push(next);
                    }
                }
            }
            return false;
        }
        /**
         * An Fsm is empty if it recognises no strings. An Fsm may be arbitrarily
         * complicated and have arbitrarily many final states while still recognising
         * no strings because those final states may all be inaccessible from the
         * initial state. Equally, an Fsm may be non-empty despite having an empty
         * alphabet if the initial state is final.
         */
        isEmpty() {
            return !this.isStateLive(this.initial);
        }
        /**
         * Generate strings (lists of symbols) that this Fsm accepts. Since there may
         * be infinitely many of these we use a generator instead of constructing a
         * static list. Strings will be sorted in order of length and then lexically.
         * This procedure uses arbitrary amounts of memory but is very fast. There
         * may be more efficient ways to do this, that I haven't investigated yet.
         * You can use this in list comprehensions.
         */
        *eachString() {
            "Not implemented";
            debugger;
            yield "";
        }
        /**
         * @returns A boolean value that indicates whether the act of merging
         * this Fsm instance with the Fsm instance supplied in the argument
         * would result in an Fsm instance that accepts no inputs.
         */
        isDiscrepant(other) {
            return this.and(other).isEmpty();
        }
        /**
         * @returns A boolean value that indicates whether the set of inputs
         * accepted by this Fsm instance is a subset of the inputs accepted by
         * other Fsm instance specified.
         */
        isSubset(other) {
            return this.difference(other).isEmpty();
        }
        /**
         * @returns A boolean value that indicates whether the set of inputs
         * accepted by this Fsm instance is a proper subset of the inputs
         * accepted by other Fsm instance specified.
         */
        isProperSubset(other) {
            return this.difference(other).isEmpty() && this.unequivalent(other);
        }
        /**
         * @returns A boolean value that indicates whether the set of inputs
         * accepted by this Fsm instance is a superset of the inputs accepted
         * by other Fsm instance specified.
         */
        isSuperset(other) {
            return other.difference(this).isEmpty();
        }
        /**
         * @returns A boolean value that indicates whether the set of inputs
         * accepted by this Fsm instance is a proper superset of the inputs
         * accepted by other Fsm instance specified.
         */
        isProperSuperset(other) {
            return other.difference(this).isEmpty() && other.unequivalent(this);
        }
        /**
         * Compute the Brzozowski derivative of this Fsm with respect to the input
         * string of symbols. <https://en.wikipedia.org/wiki/Brzozowski_derivative>
         * If any of the symbols are not members of the alphabet, that's a KeyError.
         * If you fall into oblivion, then the derivative is an Fsm accepting no
         * strings.
         *
         * @returns A new Fsm instance with the computed characteristics.
         */
        derive(input) {
            let stateId = this.initial;
            for (const char of input) {
                const symbol = (() => {
                    if (this.alphabet.has(char)) {
                        if (!this.alphabet.hasWildcard)
                            throw new Error(char);
                        return Truth.Alphabet.wildcard;
                    }
                    return char;
                })();
                if (!this.transitions.has(stateId, symbol))
                    return Oblivion;
                stateId = this.transitions.acquire(stateId, symbol);
            }
            return new Fsm(this.alphabet, this.states, stateId, this.finals, this.transitions.clone());
        }
        /**
         * @returns A string representation of this object,
         * for testing and debugging purposes.
         */
        toString() {
            return [
                "alphabet = " + this.alphabet.toString(),
                "states = " + Array.from(this.states).join(),
                "inital = " + this.initial,
                "finals = " + Array.from(this.finals).join(),
                "transitions = " + this.transitions.toString()
            ].join("\n");
        }
    }
    Truth.Fsm = Fsm;
    /**
     * Utility function to prepend an Fsm instance to an Fsm array.
     */
    function prependFsm(fsm, fsms) {
        return [fsm].concat(...fsms);
    }
    /**
     * Crawl several Fsms in parallel, mapping the states of a larger meta-Fsm.
     * To determine whether a state in the larger Fsm is final, pass all of the
     * finality statuses (e.g. [true, false, false] to testFn.
     */
    function crawlParallel(fsms, testFn) {
        const initial = new Truth.Guide();
        for (const [index, fsm] of fsms.entries())
            initial.add(index, fsm.initial);
        /**
         * Dedicated function accepts a "superset" and returns the next "superset"
         * obtained by following this transition in the new Fsm.
         */
        const followFn = (guide, symbol) => {
            const next = new Truth.Guide();
            for (const [index, fsm] of fsms.entries()) {
                const stateId = guide.get(index);
                if (stateId === null || stateId === undefined)
                    continue;
                const substateId = fsm.transitions.get(stateId);
                if (substateId === undefined)
                    continue;
                const alpha = fsm.alphabet;
                const actualSymbol = alpha.has(symbol) && alpha.hasWildcard() ?
                    Truth.Alphabet.wildcard :
                    symbol;
                if (substateId.has(actualSymbol))
                    next.add(index, fsm.transitions.get(stateId, actualSymbol));
            }
            if (next.size === 0)
                return Oblivion;
            return next;
        };
        /**
         * Determine the "is final?" condition of each substateId, then pass it to the
         * test to determine finality of the overall Fsm.
         */
        const finalFn = (guide) => {
            const accepts = [];
            for (const [idx, fsm] of fsms.entries()) {
                const substateId = guide.get(idx);
                if (substateId !== null && substateId !== undefined)
                    accepts.push(guide.has(idx) && fsm.finals.has(substateId));
            }
            return testFn(accepts);
        };
        const alphabets = fsms.map(fsm => fsm.alphabet);
        const alphabet = new Truth.AlphabetBuilder(...alphabets).toAlphabet();
        return crawl(alphabet, initial, finalFn, followFn).reduce();
    }
    /**
     * Given the above conditions and instructions, crawl a new unknown Fsm,
     * mapping its states, final states and transitions. Return the new Fsm.
     */
    function crawl(alphabet, initial, finalFn, followFn) {
        const debugLines = [];
        const guides = [initial];
        const finals = new Set();
        const transitions = new Truth.MutableTransitionMap();
        // Iterate over a growing list
        for (const [i, guide] of guides.entries()) {
            // Add to finals
            if (finalFn(guide))
                finals.add(i);
            // Compute transitions for this state
            transitions.initialize(i);
            for (const symbol of alphabet) {
                const next = followFn(guide, symbol);
                if (next !== Oblivion) {
                    let nextIdx = guides.findIndex(guide => guide.equals(next));
                    if (nextIdx < 0) {
                        nextIdx = guides.length;
                        guides.push(next);
                    }
                    transitions.set(i, symbol, nextIdx);
                    debugLines.push(next.toString());
                }
            }
        }
        return new Fsm(alphabet, new Set(Array(guides.length).keys()), 0, finals, transitions);
    }
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     * Translates Pattern instances into a corresponding Fsm.
     */
    class FsmTranslator {
        /** */
        static exec(units) {
            for (const unit of units) {
                if (unit instanceof Truth.RegexSet) {
                    throw Truth.Exception.notImplemented();
                }
                else if (unit instanceof Truth.RegexGroup) {
                    throw Truth.Exception.notImplemented();
                }
                else if (unit instanceof Truth.RegexGrapheme) {
                    throw Truth.Exception.notImplemented();
                }
                else if (unit instanceof Truth.RegexSign) {
                    throw Truth.Exception.notImplemented();
                }
                else
                    throw Truth.Exception.unknownState();
            }
            return null;
        }
        /** */
        static translateSet(set, alpha = null) {
        }
        /** */
        static translateGroup(group, alpha = null) {
            const builder = alpha || new Truth.AlphabetBuilder().addWild();
        }
        /** */
        static createGroupAlphabet(group) {
            const builder = new Truth.AlphabetBuilder();
            builder.addWild();
            for (const element of group.cases) {
                throw Truth.Exception.notImplemented();
            }
        }
        /** */
        static translateGrapheme(grapheme, alpha = null) {
        }
        /** */
        static translateSign(sign, alpha = null) {
        }
    }
    Truth.FsmTranslator = FsmTranslator;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * A class that manages a single Truth document loaded as part of
     * a Program.
     *
     * Truth documents may be loaded from files, or they may be loaded
     * from a string of Truth content directly (see the associated methods
     * in Truth.Program).
     */
    class Document extends Truth.AbstractClass {
        /** */
        constructor(program, sourceUri) {
            super();
            /** @internal */
            this.class = 0 /* document */;
            this._version = Truth.VersionStamp.next();
            /**
             * Stores the complete list of the Document's statements,
             * sorted in the order that they appear in the file.
             */
            this.statements = new Truth.Array1Based();
            this._types = null;
            /**
             * A state variable that stores whether an
             * edit transaction is currently underway.
             */
            this.inEdit = false;
            /**
             * Stores the Reference objects that are having some impact
             * on this document's relationship structure.
             */
            this.referencesReal = [];
            /**
             * Stores an array of Reference objects, where each item the array
             * corresponds to a unique URI-containing Statement objects.
             * Statement objects may not actually be affecting the document's
             * relationship structure, such as in the case when there are multiple
             * statements within this document all referencing the same document,
             * (only one statement would be affecting in this case), or when the
             * referenced document is unavailable for some reason.
             */
            this.referencesRaw = [];
            this._dependencies = [];
            this._dependents = [];
            this.program = program;
            this._uri = sourceUri;
            this.phrase = Truth.Phrase.new(this);
        }
        /**
         * @internal
         * Internal constructor for Document objects.
         * Document objects are created via a Program object.
         */
        static async new(program, fromUri, sourceText, saveFn) {
            const doc = new Document(program, fromUri);
            const uriStatements = [];
            const topLevelStatements = [];
            const topLevelStatementIndexes = [];
            let maxIndent = Number.MAX_SAFE_INTEGER;
            let lineNumber = 0;
            for (const statementText of this.readLines(sourceText)) {
                const smt = new Truth.Statement(doc, statementText);
                doc.statements.push(smt);
                if (smt.uri) {
                    uriStatements.push(smt);
                }
                else if (smt.indent <= maxIndent && !smt.isNoop) {
                    topLevelStatements.push(smt);
                    topLevelStatementIndexes.push(++lineNumber);
                    maxIndent = smt.indent;
                }
            }
            // Calling this function saves the document in the Program instance
            // that invoked this new Document. This is a bit spagetti-ish, but the
            // newly created document has to be in the Program's .documents
            // array, or the updating of references won't work.
            saveFn(doc);
            if (uriStatements.length > 0)
                await doc.updateReferences([], uriStatements);
            program.cause(new Truth.CauseRevalidate(doc, topLevelStatements, topLevelStatementIndexes));
            return doc;
        }
        /**
         * Generator function that yields all statements (unparsed lines)
         * of the given source text.
         */
        static *readLines(source) {
            let cursor = -1;
            let statementStart = 0;
            const char = () => source[cursor];
            for (;;) {
                if (cursor >= source.length - 1)
                    return yield source.slice(statementStart);
                cursor++;
                if (char() === "\n" /* terminal */) {
                    yield source.slice(statementStart, cursor);
                    statementStart = cursor + 1;
                }
            }
        }
        /**
         * Stores the URI from where this document was loaded.
         */
        get uri() {
            return this._uri;
        }
        /**
         * @internal
         * A rolling version stamp that increments after each edit transaction.
         */
        get version() {
            return this._version;
        }
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
        query(...typePath) {
            return this.program.query(this, ...typePath);
        }
        /**
         * Gets the root-level types that are defined within this document.
         */
        get types() {
            if (this._types)
                return this._types;
            return this._types = Object.freeze(this.program.query(this));
        }
        hasFault(faultType, line, termIndex = -1) {
            const comp = termIndex < 0 ?
                [faultType, line] :
                [faultType, line, termIndex];
            const compFault = this.createComparisonFault(comp);
            for (const fault of this.program.faults.each(this))
                if (this.program.faults.compareFaults(compFault, fault) === 0)
                    return true;
            return false;
        }
        hasFaults(...expectations) {
            const faultsReported = Array.from(this.program.faults.each(this));
            if (expectations.length === 0)
                return faultsReported.length > 0;
            if (expectations.length !== faultsReported.length)
                return false;
            const faultsExpected = expectations
                .map(exp => this.createComparisonFault(exp))
                .sort(this.program.faults.compareFaults);
            for (let i = -1; ++i < faultsReported.length;) {
                const rep = faultsReported[i];
                const exp = faultsExpected[i];
                if (this.program.faults.compareFaults(rep, exp) !== 0)
                    return false;
            }
            return true;
        }
        /** */
        createComparisonFault(comp) {
            const smt = this.read(comp[1]);
            if (comp.length === 2)
                return new Truth.Fault(comp[0], smt);
            const nfxLen = smt.infixSpans.length;
            const idx = comp[2];
            const span = nfxLen > 0 && idx === 0 ? smt.spans[0] :
                nfxLen > 0 && idx < nfxLen + 1 ? smt.infixSpans[idx - 1] :
                    smt.spans[idx - nfxLen];
            return new Truth.Fault(comp[0], span);
        }
        /**
         * @returns An array of Statement objects that represent
         * ancestry of the specified statement, or 1-based line number.
         * If the specified statement is not in this document, the
         * returned value is null.
         */
        getAncestry(statement) {
            const smt = this.toStatement(statement);
            // If the statement is root-level, it can't have an ancestry.
            if (smt.indent === 0)
                return [];
            let pos = this.statements.posOf(smt);
            if (pos < 0)
                return null;
            if (pos < 2)
                return [];
            const ancestry = [smt];
            let indentToBeat = smt.indent;
            for (const currentStatement of this.statements.enumerateBackward(pos)) {
                if (currentStatement.isNoop)
                    continue;
                if (currentStatement.indent < indentToBeat) {
                    ancestry.unshift(currentStatement);
                    indentToBeat = currentStatement.indent;
                }
                if (currentStatement.indent === 0)
                    break;
            }
            return ancestry.slice(0, -1);
        }
        /**
         * Gets the parent Statement object of the specified Statement.
         * If the statement is top level, a reference to this document object
         * is returned. If the statement is not found in the document, or the
         * specified statement is a no-op, the returned value is null.
         *
         * @param statement A statement object, or a 1-based line number
         * of a statement within this document.
         */
        getParent(statement) {
            const smt = this.toStatement(statement);
            if (smt.isNoop)
                return null;
            // If the statement is root-level, it can't have a parent.
            if (smt.indent === 0)
                return this;
            let pos = this.statements.posOf(smt);
            if (pos < 0)
                return null;
            // Simple optimization
            if (pos < 2)
                return this;
            const indentToBeat = smt.indent;
            for (const currentStatement of this.statements.enumerateBackward(pos)) {
                if (currentStatement.isNoop)
                    continue;
                if (currentStatement.indent < indentToBeat)
                    return currentStatement;
            }
            // If a parent statement wasn't found, then the
            // input statement is top-level, and a reference
            // to this Document object is returned.
            return this;
        }
        /**
         * @returns The Statement that would act as the parent if a statement where to be
         * inserted at the specified virtual position in the document. If an inserted statement
         * would be top-level, a reference to this document object is returned.
         */
        getParentFromPosition(lineNumber, lineOffset) {
            if (lineNumber === 1 ||
                lineNumber === 0 ||
                lineOffset < 1 ||
                this.statements.length === 0)
                return this;
            for (const smt of this.statements.enumerateBackward(lineNumber))
                if (!smt.isNoop && smt.indent < lineOffset)
                    return smt;
            return this;
        }
        /**
         * @returns The sibling Statement objects of the  specified Statement.
         * If the specified statement is a no-op, the returned value is null.
         * @throws An error in the case when the statement is not found in
         * the document.
         */
        getSiblings(statement) {
            const smt = this.toStatement(statement);
            if (smt.isNoop)
                return null;
            if (smt.indent === 0)
                return this.getChildren();
            const parent = this.getParent(smt);
            if (parent === null)
                return this.getChildren();
            if (parent === this)
                return parent.getChildren();
            return this.getChildren(parent);
        }
        /**
         * @returns The child Statement objects of the specified
         * Statement. If the argument is null or omitted, the
         * document's top-level statements are returned.
         *
         * @throws An error in the case when the specified
         * statement is not found in the document.
         */
        getChildren(statement) {
            const children = [];
            let pos = 1;
            // Stores the indent value that causes the loop
            // to terminate when reached.
            let stopIndent = -1;
            // Stores the indent value the indicates the maximum
            // value at which a statement is still considered to be
            // a child. This value can retract as the algorithm is
            // operating to deal with bizarre (but valid) indentation.
            let maxIndent = Number.MAX_SAFE_INTEGER;
            if (statement) {
                pos = this.statements.posOf(statement);
                if (pos < 0)
                    throw Truth.Exception.statementNotInDocument();
                stopIndent = statement.indent;
                // Start the iteration 1 position after the statement
                // specified, so that we're always passing through
                // potential children.
                pos++;
            }
            for (const smt of this.statements.enumerateForward(pos)) {
                if (smt.isNoop)
                    continue;
                // Check if we need to back up the indentation of child statements, 
                // in order to deal with bizarre (but valid) indentation.
                if (smt.indent < maxIndent)
                    maxIndent = smt.indent;
                if (smt.indent <= stopIndent)
                    break;
                if (smt.indent <= maxIndent)
                    children.push(smt);
            }
            return children;
        }
        /**
         * @returns A boolean value that indicates whether the specified
         * statement, or the statement at the specified index has any
         * descendants. If the argument is null, the returned value is a
         * boolean indicating whether this document has any non-noop
         * statements.
         */
        hasDescendants(statement) {
            if (statement === null) {
                for (const smt of this.statements.enumerateForward())
                    if (!smt.isNoop)
                        return true;
            }
            else {
                const smt = statement instanceof Truth.Statement ?
                    statement :
                    this.statements.get(statement);
                if (smt.isNoop)
                    return false;
                let idx = statement instanceof Truth.Statement ?
                    this.statements.posOf(statement) :
                    statement;
                for (const currentStatement of this.statements.enumerateForward(idx + 1)) {
                    if (currentStatement.isNoop)
                        continue;
                    return currentStatement.indent > smt.indent;
                }
            }
            return false;
        }
        /**
         * @returns The 1-based line number of the specified statement in
         * the document, relying on caching when available. If the statement
         * does not exist in the document, the returned value is -1.
         */
        lineNumberOf(statement) {
            return this.statements.posOf(statement);
        }
        /**
         * @returns An array of strings containing the content
         * written in the comments directly above the specified
         * statement. Whitespace lines are ignored. If the specified
         * statement is a no-op, an empty array is returned.
         */
        getNotes(statement) {
            const smt = this.toStatement(statement);
            if (smt.isNoop)
                return [];
            const lineNum = this.lineNumberOf(smt);
            if (lineNum < 1)
                return [];
            const commentLines = [];
            const requiredIndent = smt.indent;
            for (const currentStatement of this.statements.enumerateBackward(lineNum)) {
                if (currentStatement.isWhitespace)
                    continue;
                const commentText = currentStatement.getCommentText();
                if (commentText === null)
                    break;
                if (currentStatement.indent !== requiredIndent)
                    break;
                commentLines.push(commentText);
            }
            return commentLines;
        }
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
        *eachDescendant(initialStatement = undefined, includeInitial) {
            if (includeInitial) {
                if (!initialStatement)
                    throw Truth.Exception.invalidArgument();
                yield { statement: initialStatement, level: 0 };
            }
            const initialChildren = this.getChildren(initialStatement);
            if (!initialChildren)
                return;
            const self = this;
            // The initial level is 0 if the specified initialStatement is
            // null, because it indicates that the enumeration starts
            // at the root of the document.
            let level = initialStatement ? 1 : 0;
            function* recurse(statement) {
                yield { statement, level };
                level++;
                for (const childStatement of self.getChildren(statement) || [])
                    yield* recurse(childStatement);
                level--;
            }
            for (const statement of initialChildren)
                yield* recurse(statement);
        }
        /**
         * Enumerates through each statement in the document,
         * including comments and whitespace-only lines, starting
         * at the specified statement or numeric position.
         *
         * @yields The statements in the order that they appear
         * in the document, excluding whitespace-only statements.
         */
        *eachStatement(statement) {
            const startPos = (() => {
                if (!statement)
                    return 1;
                if (statement instanceof Truth.Statement)
                    return this.statements.posOf(statement);
                return statement;
            })();
            for (const smt of this.statements.enumerateForward(startPos))
                yield smt;
        }
        /**
         * Reads the Statement at the given 1-based line number.
         * Negative numbers read Statement starting from the end of the document.
         */
        read(lineNumber) {
            return this.statements.get(lineNumber);
        }
        /**
         * Convenience method that converts a statement or it's index
         * within this document to a statement object.
         */
        toStatement(statementOrIndex) {
            return statementOrIndex instanceof Truth.Statement ?
                statementOrIndex :
                this.read(statementOrIndex);
        }
        /**
         * Starts an edit transaction in the specified callback function.
         * Edit transactions are used to synchronize changes made in
         * an underlying file, typically done by a user in a text editing
         * environment. System-initiated changes such as automated
         * fixes, refactors, or renames do not go through this pathway.
         *
         * @param editFn The callback function in which to perform
         * document mutation operations.
         *
         * @returns A promise that resolves any external document
         * references added during the edit operation have been resolved.
         * If no such references were added, a promise is returned that
         * resolves immediately.
         */
        async edit(editFn) {
            if (this.inEdit)
                throw Truth.Exception.doubleTransaction();
            this.inEdit = true;
            const calls = [];
            let hasDelete = false;
            let hasInsert = false;
            let hasUpdate = false;
            editFn({
                delete: (pos = -1, count = 1) => {
                    if (count > 0) {
                        calls.push(new Truth.DeleteCall(pos, count));
                        hasDelete = true;
                    }
                },
                insert: (text, pos = -1) => {
                    calls.push(new Truth.InsertCall(new Truth.Statement(this, text), pos));
                    hasInsert = true;
                },
                update: (text, pos = -1) => {
                    if (this.read(pos).sourceText !== text) {
                        calls.push(new Truth.UpdateCall(new Truth.Statement(this, text), pos));
                        hasUpdate = true;
                    }
                }
            });
            if (calls.length === 0) {
                this.inEdit = false;
                return;
            }
            const deletedUriSmts = [];
            const addedUriSmts = [];
            // Begin the algorithm that determines the changeset,
            // and runs the appropriate invalidation and revalidation
            // hooks. This is wrapped in an IIFE because we need to
            // perform finalization at the bottom (and there are early
            // return points throughout the algorithm.
            (() => {
                const hasMixed = hasInsert && hasUpdate ||
                    hasInsert && hasDelete ||
                    hasUpdate && hasDelete;
                const doDelete = (call) => {
                    const smts = this.statements.splice(call.pos, call.count);
                    for (const smt of smts) {
                        smt.dispose();
                        if (smt.uri)
                            deletedUriSmts.push(smt);
                    }
                    return smts;
                };
                const doInsert = (call) => {
                    this.statements.splice(call.pos, 0, call.smt);
                    if (call.smt.uri)
                        addedUriSmts.push(call.smt);
                };
                const doUpdate = (call) => {
                    const existing = this.statements.get(call.pos);
                    if (existing.uri)
                        deletedUriSmts.push(existing);
                    this.statements.set(call.pos, call.smt);
                    if (call.smt.uri)
                        addedUriSmts.push(call.smt);
                    existing.dispose();
                };
                if (!hasMixed) {
                    // This handles the first optimization, which is the case where
                    // the only kinds of mutations where updates, and no structural
                    // changes occured. This handles typical "user is typing" cases.
                    // Most edits will be caught here.
                    if (hasUpdate) {
                        // Sort the update calls by their index, and prune updates
                        // that would be overridden in a following call.
                        const updateCallsTyped = calls;
                        const updateCalls = updateCallsTyped
                            .sort((a, b) => a.pos - b.pos)
                            .filter((call, i) => i >= calls.length - 1 || call.pos !== calls[i + 1].pos);
                        const oldStatements = updateCalls.map(c => this.statements.get(c.pos));
                        const newStatements = updateCalls.map(c => c.smt);
                        const indexes = Object.freeze(updateCalls.map(c => c.pos));
                        const noStructuralChanges = oldStatements.every((oldSmt, idx) => {
                            const newSmt = newStatements[idx];
                            return oldSmt.indent === newSmt.indent ||
                                oldSmt.isNoop && newSmt.isNoop;
                        });
                        if (noStructuralChanges) {
                            const hasOpStatements = oldStatements.some(smt => !smt.isNoop) ||
                                newStatements.some(smt => !smt.isNoop);
                            if (hasOpStatements) {
                                // Tell subscribers to blow away all the old statements.
                                this.program.cause(new Truth.CauseInvalidate(this, oldStatements, indexes));
                            }
                            // Run the actual mutations
                            for (const updateCall of updateCalls)
                                doUpdate(updateCall);
                            if (hasOpStatements) {
                                // Tell subscribers what changed
                                this.program.cause(new Truth.CauseRevalidate(this, newStatements, indexes));
                            }
                            return;
                        }
                    }
                    // This handles the second optimization, which is the case where
                    // only deletes occured, and none of the deleted statements have any
                    // descendants. This will handle the majority of "delete a line" cases.
                    if (hasDelete) {
                        const deleteCalls = calls;
                        const deadStatements = [];
                        const deadIndexes = [];
                        let hasOpStatements = false;
                        forCalls: for (const deleteCall of deleteCalls) {
                            for (let i = -1; ++i < deleteCall.count;) {
                                const deadSmt = this.statements.get(deleteCall.pos + i);
                                if (this.hasDescendants(deadSmt)) {
                                    deadStatements.length = 0;
                                    break forCalls;
                                }
                                deadStatements.push(deadSmt);
                                deadIndexes.push(i);
                                if (!deadSmt.isNoop)
                                    hasOpStatements = true;
                            }
                        }
                        if (deadStatements.length > 0) {
                            // Tell subscribers to blow away all the old statements.
                            // An edit transaction can be avoided completely in the case
                            // when the only statements that were deleted were noops.
                            if (hasOpStatements)
                                this.program.cause(new Truth.CauseInvalidate(this, deadStatements, deadIndexes));
                            // Run the actual mutations
                            deleteCalls.forEach(doDelete);
                            // Run an empty revalidation hook, to comply with the
                            // rule that for every invalidation hook, there is always a
                            // corresponding revalidation hook.
                            if (hasOpStatements)
                                this.program.cause(new Truth.CauseRevalidate(this, [], []));
                            return;
                        }
                    }
                    // This handles the third optimization, which is the case
                    // where there are only noop statements being inserted
                    // into the document.
                    if (hasInsert) {
                        const insertCalls = calls;
                        if (insertCalls.every(call => call.smt.isNoop)) {
                            insertCalls.forEach(doInsert);
                            return;
                        }
                    }
                }
                // At this point, the checks to see if we can get away with
                // performing simplistic updates have failed. So we need
                // to resort to invalidating and revalidating larger swaths 
                // of statements.
                // Stores an array of statements whose descendant statements
                // should be invalidated. 
                const invalidatedParents = new Map();
                // Stores a value indicating whether the entire document
                // needs to be invalidated.
                let mustInvalidateDoc = false;
                // The first step is to go through all the statements, and compute the 
                // set of parent statements from where invalidation should originate.
                // In the majority of cases, this will only be one single statement object.
                for (const call of calls) {
                    if (call instanceof Truth.DeleteCall) {
                        const deletedStatement = this.statements.get(call.pos);
                        if (deletedStatement.isNoop)
                            continue;
                        const parent = this.getParent(call.pos);
                        if (parent instanceof Truth.Statement) {
                            invalidatedParents.set(call.pos, parent);
                        }
                        else if (parent instanceof Document) {
                            mustInvalidateDoc = true;
                            break;
                        }
                        else
                            throw Truth.Exception.unknownState();
                    }
                    else {
                        if (call instanceof Truth.InsertCall) {
                            if (call.smt.isNoop)
                                continue;
                        }
                        else if (call instanceof Truth.UpdateCall) {
                            const oldStatement = this.statements.get(call.pos);
                            if (oldStatement.isNoop && call.smt.isNoop)
                                continue;
                        }
                        const parent = this.getParentFromPosition(call.pos, call.smt.indent);
                        if (parent instanceof Truth.Statement) {
                            invalidatedParents.set(call.pos, parent);
                        }
                        else if (parent === this) {
                            mustInvalidateDoc = true;
                            break;
                        }
                    }
                }
                // Although unclear how this could happen, if there
                // are no invalidated parents, we can safely return.
                if (!mustInvalidateDoc && invalidatedParents.size === 0)
                    return;
                // Prune any redundant parents. A parent is redundant
                // when it's a descendant of another parent in the 
                // invalidation array. The algorithm below compares the
                // statement ancestries of each possible pairs of invalidated
                // parents, and splices invalidated parents out of the 
                // array in the case when the parent is parented by some
                // other invalidated parent in the invalidatedParents array.
                const invalidatedAncestries = [];
                for (const line of invalidatedParents.keys()) {
                    const ancestry = this.getAncestry(line);
                    if (ancestry)
                        invalidatedAncestries.push(ancestry);
                }
                if (invalidatedAncestries.length > 1) {
                    for (let i = invalidatedAncestries.length; i--;) {
                        const ancestryA = invalidatedAncestries[i];
                        for (let n = i; n--;) {
                            const ancestryB = invalidatedAncestries[n];
                            if (ancestryA.length === ancestryB.length)
                                continue;
                            const aLessB = ancestryA.length < ancestryB.length;
                            const ancestryShort = aLessB ? ancestryA : ancestryB;
                            const ancestryLong = aLessB ? ancestryB : ancestryA;
                            if (ancestryShort.every((smt, idx) => smt === ancestryLong[idx]))
                                invalidatedAncestries.splice(aLessB ? n : i, 1);
                        }
                    }
                }
                const parents = mustInvalidateDoc ? [] : Array.from(invalidatedParents.values());
                const indexes = mustInvalidateDoc ? [] : Array.from(invalidatedParents.keys());
                // Notify observers of the Invalidate hook to invalidate the
                // descendants of the specified set of parent statements.
                this.program.cause(new Truth.CauseInvalidate(this, parents, indexes));
                const deletedStatements = [];
                // Perform the document mutations.
                for (const call of calls) {
                    if (call instanceof Truth.DeleteCall)
                        deletedStatements.push(...doDelete(call));
                    else if (call instanceof Truth.InsertCall)
                        doInsert(call);
                    else if (call instanceof Truth.UpdateCall)
                        doUpdate(call);
                }
                // Remove any deleted statements from the invalidatedParents map
                for (const deletedStatement of deletedStatements)
                    for (const [at, parentStatement] of invalidatedParents)
                        if (deletedStatement === parentStatement)
                            invalidatedParents.delete(at);
                // Notify observers of the Revalidate hook to update the
                // descendants of the specified set of parent statements.
                this.program.cause(new Truth.CauseRevalidate(this, Array.from(invalidatedParents.values()), Array.from(invalidatedParents.keys())));
            })();
            // Perform a debug-time check to be sure that there are
            // no disposed statements left hanging around in the document
            // after the edit transaction has completed.
            if ("DEBUG")
                for (const smt of this.statements.enumerateForward())
                    if (smt.isDisposed)
                        throw Truth.Exception.unknownState();
            // Clean out any type cache
            this._types = null;
            // Tell subscribers that the edit transaction completed.
            this.program.cause(new Truth.CauseEditComplete(this));
            this._version = Truth.VersionStamp.next();
            this.inEdit = false;
            if (addedUriSmts.length + deletedUriSmts.length > 0)
                await this.updateReferences(deletedUriSmts, addedUriSmts);
        }
        /**
         * Executes a complete edit transaction, applying the series
         * of edits specified in the `edits` parameter.
         *
         * @returns A promise that resolves any external document
         * references added during the edit operation have been resolved.
         * If no such references were added, a promise is returned that
         * resolves immediately.
         */
        async editAtomic(edits) {
            return this.edit(statements => {
                for (const editInfo of edits) {
                    if (!editInfo.range)
                        throw new TypeError("No range included.");
                    const startLine = editInfo.range.startLineNumber;
                    const endLine = editInfo.range.endLineNumber;
                    const startChar = editInfo.range.startColumn;
                    const endChar = editInfo.range.endColumn;
                    const startLineText = this.read(startLine).sourceText;
                    const endLineText = this.read(endLine).sourceText;
                    const prefixSegment = startLineText.slice(0, startChar);
                    const suffixSegment = endLineText.slice(endChar);
                    const segments = editInfo.text.split("\n");
                    const pastCount = endLine - startLine + 1;
                    const presentCount = segments.length;
                    const deltaCount = presentCount - pastCount;
                    // Detect the pure update cases
                    if (deltaCount === 0) {
                        if (pastCount === 1) {
                            statements.update(prefixSegment + editInfo.text + suffixSegment, startLine);
                        }
                        else {
                            statements.update(prefixSegment + segments[0], startLine);
                            for (let i = startLine; i <= endLine; i++) {
                                statements.update(prefixSegment + segments[i] + suffixSegment, startLine);
                            }
                            statements.update(segments.slice(-1)[0] + suffixSegment, endLine);
                        }
                        continue;
                    }
                    // Detect the pure delete cases
                    if (deltaCount < 0) {
                        const deleteCount = deltaCount * -1;
                        // Detect a delete ranging from the end of 
                        // one line, to the end of a successive line
                        if (startChar === startLineText.length)
                            if (endChar === endLineText.length) {
                                statements.delete(startLine + 1, deleteCount);
                                continue;
                            }
                        // Detect a delete ranging from the start of
                        // one line to the start of a successive line
                        if (startChar + endChar === 0) {
                            statements.delete(startLine, deleteCount);
                            continue;
                        }
                    }
                    // Detect the pure insert cases
                    if (deltaCount > 0) {
                        // Cursor is at the end of the line, and the first line of the 
                        // inserted content is empty (most likely, enter was pressed)						
                        if (startChar === startLineText.length && segments[0] === "") {
                            for (let i = 0; ++i < segments.length;)
                                statements.insert(segments[i], startLine + i);
                            continue;
                        }
                        // Cursor is at the beginning of the line, and the
                        // last line of the inserted content is empty.
                        if (startChar === 0 && segments.slice(-1)[0] === "") {
                            for (let i = -1; ++i < segments.length - 1;)
                                statements.insert(segments[i], startLine + i);
                            continue;
                        }
                    }
                    // This is the "fallback" behavior -- simply delete everything
                    // that is old, and insert everything that is new.
                    const deleteCount = endLine - startLine + 1;
                    statements.delete(startLine, deleteCount);
                    const insertLines = segments.slice();
                    insertLines[0] = prefixSegment + insertLines[0];
                    insertLines[insertLines.length - 1] += suffixSegment;
                    for (let i = -1; ++i < insertLines.length;)
                        statements.insert(insertLines[i], startLine + i);
                }
            });
        }
        /**
         *
         */
        async updateReferences(deleted, added) {
            // This algorithm always performs all deletes before adds.
            // For this reason, if a URI is both in the list of deleted URIs
            // as well as the list of added URIs, it means that the URI
            // started in the document, and is currently still there.
            var e_1, _a;
            var _b, _c;
            const rawRefsExisting = this.referencesRaw.slice();
            const rawRefsToAdd = [];
            const rawRefsToDelete = [];
            // The faults that are generated are stored in an array,
            // so that they can all be reported at once at the end.
            // This is because this method is async, and it's important
            // that all the faults are reported in the same turn of
            // the event loop.
            const faults = [];
            // Delete old URI statements from the array.
            for (const del of deleted) {
                const idx = rawRefsExisting.findIndex(v => v.statement === del);
                if (idx > -1)
                    rawRefsToDelete.push(rawRefsExisting.splice(idx, 1)[0]);
            }
            if ("DEBUG")
                if (deleted.length !== rawRefsToDelete.length)
                    throw Truth.Exception.unknownState();
            try {
                // Populate addedReferences array. This loop blindly attempts to load
                // all referenced documents, regardless of whether there's going to be
                // some fault generated as a result of attempting to establish a reference
                // to the document.
                for (var added_1 = __asyncValues(added), added_1_1; added_1_1 = await added_1.next(), !added_1_1.done;) {
                    const smt = added_1_1.value;
                    let refDoc = null;
                    // Bail if a document loaded from HTTP is trying to reference
                    // a document located on the file system.
                    const isToFile = smt.uri.protocol === Truth.UriProtocol.file;
                    const thisProto = this.uri.protocol;
                    if (isToFile && (thisProto === Truth.UriProtocol.http || thisProto === Truth.UriProtocol.https)) {
                        faults.push(Truth.Faults.InsecureResourceReference.create(smt));
                    }
                    else {
                        refDoc = this.program.getDocumentByUri(smt.uri);
                        if (!refDoc)
                            refDoc = await this.program.addDocumentFromUri(smt.uri);
                    }
                    // This is cheating a bit. It's unclear how this could result in an error
                    // at this point, or what to do if it did.
                    if (refDoc instanceof Error) {
                        refDoc = null;
                        faults.push(Truth.Faults.UnresolvedResource.create(smt));
                    }
                    rawRefsToAdd.push(new Truth.Reference(smt, refDoc));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (added_1_1 && !added_1_1.done && (_a = added_1.return)) await _a.call(added_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if ("DEBUG")
                if (added.length !== rawRefsToAdd.length)
                    throw Truth.Exception.unknownState();
            const toReferenceTuples = (refs) => refs.map(v => [this.lineNumberOf(v.statement), v]);
            const rawRefsProposed = [
                ...toReferenceTuples(rawRefsExisting),
                ...toReferenceTuples(rawRefsToAdd)
            ]
                .sort(([numA], [numB]) => numB - numA)
                .map(([num, ref]) => ref);
            const realRefs = [];
            const rawRefDocuments = rawRefsProposed.map(v => v.target);
            for (const [idx, doc] of rawRefDocuments.entries()) {
                if (!doc)
                    continue;
                if (rawRefDocuments.indexOf(doc) !== idx) {
                    const smt = rawRefsProposed[idx].statement;
                    faults.push(Truth.Faults.DuplicateReference.create(smt));
                }
                else {
                    realRefs.push(rawRefsProposed[idx]);
                }
            }
            const realRefsDeleted = this.referencesReal.filter(v => !realRefs.includes(v));
            const realRefsAdded = realRefs.filter(v => !this.referencesReal.includes(v));
            this.referencesRaw.length = 0;
            this.referencesRaw.push(...rawRefsProposed);
            this.referencesReal.length = 0;
            this.referencesReal.push(...realRefs);
            this._dependencies.length = 0;
            this._dependencies.push(...realRefs
                .map(v => v.target)
                .filter((v) => !!v));
            for (const ref of realRefsAdded) {
                const dependents = (_b = ref.target) === null || _b === void 0 ? void 0 : _b._dependents;
                if (dependents && !dependents.includes(this))
                    dependents.push(this);
            }
            for (const ref of realRefsDeleted) {
                const dependents = (_c = ref.target) === null || _c === void 0 ? void 0 : _c._dependents;
                if (dependents)
                    for (let i = dependents.length; i-- > 0;)
                        if (dependents[i] === this)
                            dependents.splice(i, 1);
            }
            let hasCircularFaults = false;
            for (const refDeleted of realRefsDeleted)
                if (this.program.cycleDetector.didDelete(refDeleted.statement))
                    hasCircularFaults = true;
            for (const refAdded of realRefsAdded)
                if (this.program.cycleDetector.didAdd(refAdded.statement))
                    hasCircularFaults = true;
            for (const fault of faults)
                this.program.faults.report(fault);
            if (faults.length || hasCircularFaults)
                this.program.faults.refresh();
            // TODO: Broadcast the added and removed dependencies to external
            // observers (outside the compiler). Make sure to broadcast only the
            // change in dependencies, not the change in references (which are different)
            // Implementing this will require a re-working of the cause system.
        }
        /**
         * (Not implemented)
         *
         * Updates this document's sourceUri with the new URI specified.
         * The value specified may be a relative URI, in which case, the final
         * URI will be made relative to this document.
         *
         * @throws An error in the case when a document has been loaded
         * into the Program that is already associated with the URI specified,
         * or when the value specified could not be parsed.
         */
        updateUri(newValue) {
            const newUri = Truth.KnownUri.fromString(newValue, this._uri);
            if (newUri === null)
                throw Truth.Exception.invalidUri(newValue);
            const existing = this.program.getDocumentByUri(newUri);
            if (existing)
                throw Truth.Exception.uriAlreadyExists();
            if (newUri.protocol !== this._uri.protocol)
                throw Truth.Exception.uriProtocolsMustMatch();
            const wasUri = this._uri;
            this._uri = newUri;
            for (const doc of this.program.documents)
                doc.didUpdateUri(this, wasUri);
        }
        /** */
        didUpdateUri(affectedDoc, was) {
            const newlyBrokenRaw = [];
            const newlyTargetedRaw = [];
            for (const ref of this.referencesRaw) {
                if (ref.statement.uri === was)
                    newlyBrokenRaw.push(ref);
                else if (ref.statement.uri === affectedDoc._uri)
                    newlyTargetedRaw.push(ref);
            }
            if (newlyBrokenRaw.length + newlyTargetedRaw.length === 0)
                return;
            throw Truth.Exception.notImplemented();
        }
        /**
         * Gets an array containing the other documents that this document has
         * as a dependency.
         *
         * Because circular document relationships are storable at the Document
         * level, performing a deep traversal on these dependencies is considered an
         * unsafe operation, due to the possibility of generating a stack overflow.
         *
         * To perform a deep traversal on document dependencies, considering
         * using the .traverseDependencies() method.
         */
        get dependencies() {
            return this._dependencies;
        }
        /**
         * Gets an array containing the other documents that depend on this
         * document.
         *
         * Because circular document relationships are storable at the Document
         * level, performing a deep traversal on these dependents is considered an
         * unsafe operation, due to the possibility of generating a stack overflow.
         */
        get dependents() {
            return this._dependents;
        }
        /** @internal */
        getStatementCausingDependency(dependency) {
            for (const ref of this.referencesReal)
                if (ref.target === dependency)
                    return ref.statement;
            return null;
        }
        /**
         * Performs a depth-first traversal on this Document's dependency structure.
         * The traversal pattern avoids following infinite loops due to circular dependencies.
         */
        *traverseDependencies() {
            const self = this;
            const yielded = [];
            function* recurse(doc) {
                if (doc === self)
                    return;
                if (!yielded.includes(doc)) {
                    yielded.push(doc);
                    yield doc;
                }
                for (const dependency of doc._dependencies)
                    yield* recurse(dependency);
            }
            ;
            for (const dependency of this._dependencies)
                yield* recurse(dependency);
        }
        /**
         * Returns a formatted version of the Document.
         */
        toString(keepOriginalFormatting) {
            const lines = [];
            if (keepOriginalFormatting) {
                for (const statement of this.statements.enumerateForward())
                    lines.push(statement.sourceText);
            }
            else
                for (const { statement, level } of this.eachDescendant()) {
                    const indent = "\t" /* tab */.repeat(level);
                    lines.push(indent + statement.toString());
                }
            return lines.join("\n");
        }
    }
    Truth.Document = Document;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /** @internal */
    class InsertCall {
        constructor(smt, pos) {
            this.smt = smt;
            this.pos = pos;
        }
    }
    Truth.InsertCall = InsertCall;
    /** @internal */
    class UpdateCall {
        constructor(smt, pos) {
            this.smt = smt;
            this.pos = pos;
        }
    }
    Truth.UpdateCall = UpdateCall;
    /** @internal */
    class DeleteCall {
        constructor(pos, count) {
            this.pos = pos;
            this.count = count;
        }
    }
    Truth.DeleteCall = DeleteCall;
    /**
     * @internal
     * A class that stores information about a reference established by
     * one document (via a Statement) to another document.
     */
    class Reference extends Truth.AbstractClass {
        constructor(statement, target) {
            super();
            this.statement = statement;
            this.target = target;
            /** @internal */
            this.class = 2 /* reference */;
        }
    }
    Truth.Reference = Reference;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     * A class that detects circular relationships between
     * inter-referencing documents, and handles the reporting
     * and resolution of the necessary faults when circular
     * relationships are detected and resolved.
     * Instances of this class are owned by a Program instance,
     * and each Program owns exactly one CycleDetector.
     */
    class CycleDetector {
        constructor(program) {
            this.program = program;
            /**
             * Stores the array of cycles that were discovered in the program.
             */
            this.cycles = [];
        }
        /**
         * Informs the CycleDetector that a referentially-significant
         * statement (meaning that it was having an effect on the graph
         * of  connected documents) was deleted from a document.
         *
         * @returns A boolean value indicating whether faults were
         * reported to the FaultService.
         */
        didDelete(statement) {
            let hasFaults = false;
            for (let i = this.cycles.length; i-- > 0;) {
                const faults = this.cycles[i];
                if (faults.map(v => v.statement).includes(statement)) {
                    this.cycles.splice(i, 1);
                    for (const fault of faults)
                        this.program.faults.resolveManual(fault);
                    hasFaults = true;
                }
            }
            return hasFaults;
        }
        /**
         * Informs the CycleDetector that a referentially-significant
         * statement (meaning that it was having an effect on the graph
         * of  connected documents) was added to a document.
         *
         * @returns A boolean value indicating whether faults were
         * reported to the FaultService.
         */
        didAdd(statement) {
            let hasFaults = false;
            const startingDocument = statement.document;
            // The algorithm tracks the documents that have been visited,
            // and terminates the traversal when visited documents are
            // discovered. This is to prevent stack overflows.
            const visited = [];
            // The output of the recurse function below is a series of document
            // pairs, where the first document contains the statement that is
            // responsible for the introduction of the reference, and the second
            // document is the one being targetted by said reference. 
            const discoveredDocPairs = [];
            // While the recurse function is operating, it keeps track of a stack
            // of pairs (roughly corresponding to the call stack of the recurse
            // function). The stack is then copied to the discoveredDocPairs
            // array in the case that the stack is found to be a circular relationship.
            const stackPairs = [];
            const recurse = (srcDoc, dstDoc) => {
                // Don't follow previously visited destination documents.
                if (visited.includes(dstDoc))
                    return;
                // Found a cycle, add any new cyclical contributors
                // found in the current stack to the array.
                if (dstDoc === startingDocument) {
                    const pair = stackPairs.slice();
                    pair.push([srcDoc, dstDoc]);
                    discoveredDocPairs.push(pair);
                    visited.push(dstDoc);
                    return;
                }
                stackPairs.push([srcDoc, dstDoc]);
                for (const dependencyDoc of dstDoc.dependencies)
                    recurse(dstDoc, dependencyDoc);
                stackPairs.pop();
            };
            for (const dependency of startingDocument.dependencies)
                recurse(statement.document, dependency);
            // The discoveredDocPairs array is converted into a proper cycle,
            // (an array of faults), before being stored.
            for (const cyclePair of discoveredDocPairs) {
                const faults = [];
                for (const [srcDoc, dstDoc] of cyclePair) {
                    const smt = srcDoc.getStatementCausingDependency(dstDoc);
                    if (smt) {
                        const fault = Truth.Faults.CircularResourceReference.create(smt);
                        faults.push(fault);
                        this.program.faults.reportManual(fault);
                        hasFaults = true;
                    }
                }
                this.cycles.push(faults);
            }
            return hasFaults;
        }
    }
    Truth.CycleDetector = CycleDetector;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * Parses a single line of Truth code, and returns
     * a Line object that contains information about
     * what was read.
     */
    class LineParser {
        /**
         * Generator function that yields all statements (unparsed lines)
         * of the given source text.
         */
        static *read(sourceText) {
            if (sourceText.length === 0)
                return;
            let cursor = 0;
            let statementStart = 0;
            for (; cursor < sourceText.length; cursor++) {
                if (sourceText[cursor] === "\n" /* terminal */) {
                    yield sourceText.slice(statementStart, cursor);
                    statementStart = cursor + 1;
                }
            }
            if (statementStart < cursor)
                yield sourceText.slice(statementStart);
        }
        /**
         * Main entry point for parsing a single line and producing a
         * RawStatement object.
         *
         * The parsing algorithm is some kind of quasi-recusive descent with
         * lookheads and backtracking in some places to make the logic easier
         * to follow. Technically, it's probably some mash-up of LL(k) & LALR.
         * Maybe if I blew 4 years of my life in some silly Comp Sci program
         * instead of dropping out of high school I could say for sure.
         *
         * @param lineText A string containing the line to parse.
         */
        static parse(lineText, options) {
            const parser = new Truth.Parser(lineText);
            const sourceText = lineText;
            const indent = parser.readWhitespace();
            const declarationEntries = [];
            const annotationEntries = [];
            const esc = "\\" /* escapeChar */;
            let flags = Truth.LineFlags.none;
            let jointPosition = -1;
            let sum = "";
            /**
             * Universal function for quickly producing a RawStatement
             * instance using the values of the constructed local variables.
             */
            const ret = (fault = null) => new Truth.Line(sourceText, indent, new Truth.BoundaryGroup(declarationEntries), new Truth.BoundaryGroup(annotationEntries), sum, jointPosition, flags, fault);
            // In the case when the line contains only whitespace characters,
            // this condition will pass, bypassing the entire parsing process
            // and returning an (basically) fresh RawStatement object.
            if (!parser.more()) {
                flags |= Truth.LineFlags.isWhitespace;
                return ret();
            }
            {
                const mark = parser.position;
                if (parser.read("//" /* comment */)) {
                    if (!parser.more() || parser.read(" " /* space */) || parser.read("\t" /* tab */)) {
                        flags |= Truth.LineFlags.isComment;
                        return ret();
                    }
                    parser.position = mark;
                }
            }
            {
                const unparsableFaultType = (() => {
                    if (parser.read("," /* combinator */))
                        return Truth.Faults.StatementBeginsWithComma;
                    if (parser.read("..." /* list */))
                        return Truth.Faults.StatementBeginsWithEllipsis;
                    if (parser.read(esc + " " /* space */) || parser.read(esc + "\t" /* tab */))
                        return Truth.Faults.StatementBeginsWithEscapedSpace;
                    if (parser.readThenTerminal(esc))
                        return Truth.Faults.StatementContainsOnlyEscapeCharacter;
                    return null;
                })();
                if (unparsableFaultType) {
                    flags |= Truth.LineFlags.isCruft;
                    return ret(unparsableFaultType);
                }
            }
            {
                const markBeforeUri = parser.position;
                const uri = maybeReadUri();
                if (uri) {
                    flags |= Truth.LineFlags.hasUri;
                    declarationEntries.push(new Truth.Boundary(markBeforeUri, parser.position, uri));
                    return then();
                }
                const markBeforePattern = parser.position;
                const pattern = maybeReadPattern();
                if (isFault(pattern)) {
                    flags |= Truth.LineFlags.isCruft;
                    return ret(pattern);
                }
                if (pattern) {
                    flags |= Truth.LineFlags.hasPattern;
                    flags |= pattern.isTotal ?
                        Truth.LineFlags.hasTotalPattern :
                        Truth.LineFlags.hasPartialPattern;
                    declarationEntries.push(new Truth.Boundary(markBeforePattern, parser.position, pattern));
                    return then();
                }
                for (const boundsEntry of readDeclarations([]))
                    declarationEntries.push(boundsEntry);
                return then();
            }
            function then() {
                jointPosition = maybeReadJoint();
                const readResult = readAnnotations([]);
                sum = readResult.raw.trim();
                for (const boundsEntry of readResult.annotations)
                    annotationEntries.push(boundsEntry);
                if (jointPosition > -1) {
                    const dLen = declarationEntries.length;
                    const aLen = readResult.annotations.length;
                    if (dLen === 0) {
                        declarationEntries.unshift(new Truth.Boundary(jointPosition, jointPosition, Truth.Term.void));
                        if (aLen === 0)
                            flags |= Truth.LineFlags.isVacuous;
                    }
                    else if (aLen === 0) {
                        flags |= Truth.LineFlags.isRefresh;
                    }
                }
                return ret();
            }
            /**
             * Reads the following series of declarations, which may be
             * either directly contained by a statement, or inside an infix.
             */
            function readDeclarations(quitTokens) {
                const entries = [];
                const until = quitTokens.concat(":" /* joint */);
                while (parser.more()) {
                    const readResult = maybeReadTerm(until);
                    if (readResult !== null)
                        entries.push(new Truth.Boundary(readResult.at, parser.position, readResult.term));
                    // The following combinator must be eaten before
                    // moving on to another declaration. If this fails,
                    // it's because the parse stream has ended.
                    if (!parser.read("," /* combinator */))
                        break;
                    if (peekJoint())
                        break;
                }
                return entries;
            }
            /**
             * Attempts to read the joint token from the parse stream.
             * Consumes all surrounding whitespace.
             * @returns A boolean value indicating whether the joint
             * token was read.
             */
            function maybeReadJoint() {
                const markBeforeWs = parser.position;
                parser.readWhitespace();
                const markAfterWs = parser.position;
                let foundJointPosition = -1;
                if (parser.read(":" /* joint */ + " " /* space */) ||
                    parser.read(":" /* joint */ + "\t" /* tab */) ||
                    parser.readThenTerminal(":" /* joint */)) {
                    foundJointPosition = markAfterWs;
                    parser.readWhitespace();
                }
                else {
                    parser.position = markBeforeWs;
                }
                return foundJointPosition;
            }
            /**
             * @returns A boolean value that indicates whether the joint
             * is the next logical token to be consumed. True is returned
             * in the case when whitespace characters sit between the
             * cursor and the joint operator.
             */
            function peekJoint() {
                const innerPeekJoint = () => {
                    return parser.peek(":" /* joint */ + " " /* space */) ||
                        parser.peek(":" /* joint */ + "\t" /* tab */) ||
                        parser.peekThenTerminal(":" /* joint */);
                };
                if (innerPeekJoint())
                    return true;
                if (!parser.peek(" " /* space */) && !parser.peek("\t" /* tab */))
                    return false;
                const mark = parser.position;
                parser.readWhitespace();
                const atJoint = innerPeekJoint();
                parser.position = mark;
                return atJoint;
            }
            /**
             *
             */
            function readAnnotations(quitTokens) {
                const annotations = [];
                let raw = "";
                while (parser.more()) {
                    const readResult = maybeReadTerm(quitTokens);
                    if (readResult !== null) {
                        annotations.push(new Truth.Boundary(readResult.at, parser.position, readResult.term));
                        raw += readResult.raw;
                    }
                    // If the next token is not a combinator, 
                    // the parse stream has ended.
                    if (!parser.read("," /* combinator */))
                        break;
                }
                return {
                    annotations,
                    raw
                };
            }
            /**
             * Attempts to read and return a term from the parse stream.
             */
            function maybeReadTerm(quitTokens) {
                const until = quitTokens
                    .concat("," /* combinator */)
                    .filter(tok => tok !== ":" /* joint */);
                const shouldQuitOnJoint = quitTokens.includes(":" /* joint */);
                const at = parser.position + parser.readWhitespace();
                let token = "";
                while (parser.more()) {
                    if (until.some(tok => parser.peek(tok)))
                        break;
                    if (shouldQuitOnJoint && peekJoint())
                        break;
                    const g1 = parser.readGrapheme();
                    if (parser.more()) {
                        // The only operators that can be meaningfully escaped at
                        // the term level are the joint, the combinator, and the
                        // pattern delimiter. Other occurences of the escape character
                        // append this character to the term.
                        if (g1 === esc) {
                            const g2 = parser.readGrapheme();
                            token += g2;
                            continue;
                        }
                    }
                    token += g1;
                }
                const tokenTrimmed = token.trim();
                if (!tokenTrimmed.length)
                    return null;
                return {
                    at,
                    term: Truth.Term.from(tokenTrimmed),
                    raw: token
                };
            }
            /**
             * Attempts to read a URI starting at the current position
             * of the cursor. The position of the cursor is not changed
             * in the case when a valid URI was not read.
             */
            function maybeReadUri() {
                if (!options.readUris)
                    return null;
                let prefix = parser.read("http://" /* httpPrefix */) ||
                    parser.read("https://" /* httpsPrefix */) ||
                    parser.read("../" /* retractingUriPrefix */) ||
                    parser.read("./" /* relativeUriPrefix */);
                if (prefix === "")
                    return null;
                const mark = parser.position;
                const maybeUriContent = parser.readUntil();
                if (maybeUriContent.endsWith(".truth" /* truthExtension */))
                    return Truth.KnownUri.fromString(prefix + maybeUriContent, options.assumedUri);
                parser.position = mark;
                return null;
            }
            /**
             * Attempts to read a pattern from the steam.
             */
            function maybeReadPattern(nested = false) {
                if (!nested && !parser.read("/" /* main */))
                    return null;
                if (!options.readPatterns)
                    return null;
                // These are reserved starting sequences. They're invalid
                // regex syntax, and we may use them in the future to pack
                // in other language features.
                if (parser.peek("+" /* plus */) ||
                    parser.peek("*" /* star */) ||
                    parser.peek("?" /* restrained */))
                    return Truth.Faults.StatementBeginsWithInvalidSequence;
                // TypeScript isn't perfect.
                const units = nested ?
                    readRegexUnits(true) :
                    readRegexUnits(false);
                if (isFault(units))
                    return units;
                // Right-trim any trailing whitespace
                while (units.length) {
                    const last = units[units.length - 1];
                    if (!(last instanceof Truth.RegexGrapheme))
                        break;
                    if (last.grapheme !== " " /* space */ && last.grapheme !== "\t" /* tab */)
                        break;
                    units.pop();
                }
                if (units.length === 0)
                    return Truth.Faults.EmptyPattern;
                const last = units[units.length - 1];
                const isTotal = last instanceof Truth.RegexGrapheme &&
                    last.quantifier === null &&
                    last.grapheme === "/" /* main */;
                // Need to pop off the 
                if (isTotal)
                    units.pop();
                // Now read the annotations, in order to compute the Pattern's hash
                const mark = parser.position;
                const foundJointPosition = maybeReadJoint();
                if (foundJointPosition < 0)
                    return new Truth.Pattern(Object.freeze(units), isTotal, "");
                const annos = readAnnotations([]).annotations;
                const annosArrayJoined = Array.from(annos.values())
                    .map(v => v.subject.toString())
                    .join("\n" /* terminal */);
                const hash = Truth.Hash.calculate(annosArrayJoined);
                parser.position = mark;
                return new Truth.Pattern(Object.freeze(units), isTotal, hash);
            }
            function readRegexUnits(nested) {
                const units = [];
                while (parser.more()) {
                    const setOrGroup = maybeReadRegexSet() || maybeReadRegexGroup();
                    if (isFault(setOrGroup))
                        return setOrGroup;
                    if (setOrGroup !== null) {
                        const quantifier = maybeReadRegexQuantifier();
                        if (isFault(quantifier))
                            return quantifier;
                        units.push(appendQuantifier(setOrGroup, quantifier));
                        continue;
                    }
                    if (nested) {
                        if (parser.peek("|" /* alternator */))
                            break;
                        if (parser.peek(")" /* groupEnd */))
                            break;
                    }
                    else {
                        // Infixes are not supported anywhere other 
                        // than at the top level of the pattern.
                        const infix = maybeReadInfix();
                        if (isFault(infix))
                            return infix;
                        if (infix !== null) {
                            const quantifier = maybeReadRegexQuantifier();
                            if (quantifier !== null)
                                return Truth.Faults.InfixHasQuantifier;
                            units.push(infix);
                            continue;
                        }
                        if (peekJoint())
                            break;
                    }
                    const grapheme = maybeReadRegexGrapheme();
                    if (!grapheme)
                        break;
                    // If the grapheme read is in the RegexSyntaxKnownSet
                    // enumeration, we need to convert the grapheme to a
                    // RegexSet instance, and push that on to the units array
                    // instead.
                    const regexKnownSet = (() => {
                        if (grapheme.character === Truth.RegexSyntaxKnownSet.wild && !grapheme.escaped)
                            return Truth.RegexSyntaxKnownSet.wild;
                        if (grapheme.escaped) {
                            const characterWithEscape = esc + grapheme.character;
                            const knownSet = Truth.RegexSyntaxKnownSet.resolve(characterWithEscape);
                            if (knownSet !== null)
                                return knownSet;
                        }
                        return null;
                    })();
                    const quantifier = maybeReadRegexQuantifier();
                    if (isFault(quantifier))
                        return quantifier;
                    if (regexKnownSet !== null) {
                        units.push(new Truth.RegexSet([regexKnownSet], [], [], [], false, quantifier));
                        continue;
                    }
                    if (grapheme.unicodeBlockName) {
                        const ubn = grapheme.unicodeBlockName;
                        units.push(new Truth.RegexSet([], [], [ubn], [], false, quantifier));
                        continue;
                    }
                    if (grapheme.escaped) {
                        const sign = Truth.RegexSyntaxSign.resolve(esc + grapheme.character);
                        if (sign !== null) {
                            units.push(new Truth.RegexSign(sign, quantifier));
                            continue;
                        }
                        // If this point is reached, it's because there was a unneccesarily
                        // escaped character found in the parse stream, such as "\a". In
                        // this case, the raw character can just be added as a regex unit.
                    }
                    units.push(new Truth.RegexGrapheme(grapheme.character, quantifier));
                }
                return units;
            }
            /**
             * Attempts to read a character set from the parse stream.
             * Example: [a-z0-9]
             */
            function maybeReadRegexSet() {
                if (!parser.read("[" /* setStart */))
                    return null;
                const rng = "-" /* range */;
                const knowns = [];
                const ranges = [];
                const blocks = [];
                const singles = [];
                const isNegated = !!parser.read("^" /* negate */);
                let closed = false;
                /**
                 * Stores all Graphemes read.
                 */
                const graphemes = [];
                /**
                 * Stores booleans that align with the items in "queue",
                 * that indicate whether or not the queued Grapheme
                 * can participate in a range.
                 */
                const rangableQueue = [];
                for (;;) {
                    const g = maybeReadRegexGrapheme();
                    if (g === null)
                        break;
                    if (!g.escaped && g.character === "]" /* setEnd */) {
                        closed = true;
                        break;
                    }
                    if (g.unicodeBlockName) {
                        blocks.push(g.unicodeBlockName);
                        rangableQueue.push(false);
                        graphemes.push(null);
                        continue;
                    }
                    const gFull = g.escaped ? esc + g.character : g.character;
                    const known = Truth.RegexSyntaxKnownSet.resolve(gFull);
                    if (known !== null) {
                        knowns.push(known);
                        rangableQueue.push(false);
                        graphemes.push(null);
                        continue;
                    }
                    graphemes.push(g);
                    rangableQueue.push(g.character.length > 0 &&
                        g.character !== "\\b" /* boundary */ &&
                        g.character !== "\\B" /* boundaryNon */);
                    if (g.unicodeBlockName)
                        continue;
                    const len = graphemes.length;
                    if (len < 3)
                        continue;
                    const maybeRng = graphemes[len - 2];
                    if (maybeRng !== null && maybeRng.character !== rng)
                        continue;
                    if (!rangableQueue[len - 3])
                        continue;
                    const maybeFrom = graphemes[len - 3];
                    if (maybeFrom === null)
                        throw Truth.Exception.unknownState();
                    // Peel back symbol queue, and add a range
                    // to the alphabet builder if the queue gets into
                    // a state where it's ending with something
                    // looking like: ?-?
                    const from = maybeFrom.character.codePointAt(0) || 0;
                    const to = g.character.codePointAt(0) || 0;
                    ranges.push(new Truth.RegexCharRange(from, to));
                    graphemes.length -= 3;
                    continue;
                }
                if (!closed)
                    return Truth.Faults.UnterminatedCharacterSet;
                for (const g of graphemes)
                    if (g !== null)
                        singles.push(g.character);
                const quantifier = maybeReadRegexQuantifier();
                if (isFault(quantifier))
                    return quantifier;
                return new Truth.RegexSet(knowns, ranges, blocks, singles, isNegated, quantifier);
            }
            /**
             * Attempts to read an alternation group from the parse stream.
             * Example: (A|B|C)
             */
            function maybeReadRegexGroup() {
                if (!parser.read("(" /* groupStart */))
                    return null;
                const cases = [];
                let closed = false;
                while (parser.more()) {
                    if (parser.read("|" /* alternator */))
                        continue;
                    if (parser.read(")" /* groupEnd */)) {
                        closed = true;
                        break;
                    }
                    const subUnits = readRegexUnits(true);
                    if (isFault(subUnits))
                        return subUnits;
                    // If the call to maybeReadPattern causes the cursor
                    // to reach the end of te parse stream, the expression
                    // is invalid because it would mean the input looks
                    // something like: /(aa|bb
                    if (!parser.more())
                        return Truth.Faults.UnterminatedGroup;
                    // A null subPattern could come back in the case when some
                    // bizarre syntax is found in the pattern such as: (a||b)
                    if (subUnits === null)
                        continue;
                    cases.push(Object.freeze(subUnits));
                }
                if (!closed)
                    return Truth.Faults.UnterminatedGroup;
                const quantifier = maybeReadRegexQuantifier();
                if (isFault(quantifier))
                    return quantifier;
                return new Truth.RegexGroup(Object.freeze(cases), quantifier);
            }
            /**
             * Attempts to read a pattern quantifier from the parse stream.
             * Checks for duplicates, which is necessary because the JavaScript
             * regular expression flavor (and others?) cannot parse an expression
             * with two consecutive quantifiers.
             */
            function maybeReadRegexQuantifier() {
                /** */
                function maybeReadQuantifier() {
                    const mark = parser.position;
                    if (parser.read("*" /* star */))
                        return new Truth.RegexQuantifier(0, Infinity, isRestrained());
                    if (parser.read("+" /* plus */))
                        return new Truth.RegexQuantifier(1, Infinity, isRestrained());
                    if (parser.read("?" /* restrained */))
                        return new Truth.RegexQuantifier(0, 1, false);
                    if (!parser.read("{" /* quantifierStart */))
                        return null;
                    const min = maybeReadInteger();
                    if (min !== null) {
                        const quantEnd = "}" /* quantifierEnd */;
                        // {2}
                        if (parser.read(quantEnd))
                            return new Truth.RegexQuantifier(min, min, isRestrained());
                        // {2,} or {2,3} or {2,???
                        if (parser.read("," /* quantifierSeparator */)) {
                            if (parser.read(quantEnd))
                                return new Truth.RegexQuantifier(min, Infinity, isRestrained());
                            const max = maybeReadInteger();
                            if (max !== null && parser.read(quantEnd))
                                return new Truth.RegexQuantifier(min, max, isRestrained());
                        }
                    }
                    parser.position = mark;
                    return null;
                }
                /** */
                function isRestrained() {
                    return !!parser.read("?" /* restrained */);
                }
                const quantifier = maybeReadQuantifier();
                if (quantifier)
                    if (maybeReadQuantifier())
                        return Truth.Faults.DuplicateQuantifier;
                return quantifier;
            }
            /**
             *
             */
            function maybeReadInteger() {
                let integerText = "";
                for (let i = 0; i < 16 && parser.more(); i++) {
                    const digit = (() => {
                        for (let digit = 0; digit <= 9; digit++)
                            if (parser.read(digit.toString()))
                                return digit.toString();
                        return "";
                    })();
                    if (!digit)
                        break;
                    integerText += digit;
                }
                return integerText.length > 0 ?
                    parseInt(integerText, 10) :
                    null;
            }
            /**
             *
             */
            function maybeReadInfix() {
                const mark = parser.position;
                const lhsEntries = [];
                const rhsEntries = [];
                const infixStart = parser.position;
                let infixFlags = Truth.InfixFlags.none;
                let quitToken = ">" /* end */;
                let hasJoint = false;
                if (parser.read("<<" /* nominalStart */)) {
                    infixFlags |= Truth.InfixFlags.nominal;
                    quitToken = ">>" /* nominalEnd */;
                }
                else if (parser.read("</" /* patternStart */)) {
                    infixFlags |= Truth.InfixFlags.pattern;
                    quitToken = "/>" /* patternEnd */;
                }
                else if (parser.read("<" /* start */)) {
                    infixFlags |= Truth.InfixFlags.population;
                    quitToken = ">" /* end */;
                }
                else
                    return null;
                parser.readWhitespace();
                if (parser.read(":" /* joint */)) {
                    infixFlags |= Truth.InfixFlags.portability;
                    parser.readWhitespace();
                    for (const boundsEntry of readAnnotations([quitToken]).annotations)
                        rhsEntries.push(new Truth.Boundary(boundsEntry.offsetStart, parser.position, boundsEntry.subject));
                }
                else {
                    for (const boundsEntry of readDeclarations([quitToken]))
                        lhsEntries.push(boundsEntry);
                    parser.readWhitespace();
                    if (maybeReadJoint() > -1) {
                        hasJoint = true;
                        parser.readWhitespace();
                        for (const boundsEntry of readAnnotations([quitToken]).annotations)
                            rhsEntries.push(new Truth.Boundary(boundsEntry.offsetStart, parser.position, boundsEntry.subject));
                    }
                }
                // Avoid producing an infix in weird cases such as:
                // < : >  </  />  <<:>>
                if (lhsEntries.length + rhsEntries.length === 0) {
                    parser.position = mark;
                    return null;
                }
                if (hasJoint)
                    infixFlags |= Truth.InfixFlags.hasJoint;
                parser.readWhitespace();
                if (!parser.read(quitToken))
                    return Truth.Faults.UnterminatedInfix;
                return new Truth.Infix(infixStart, parser.position, new Truth.BoundaryGroup(lhsEntries), new Truth.BoundaryGroup(rhsEntries), infixFlags);
            }
            /**
             * Attempts to read one single symbol from the parse stream,
             * while respecting unicode escape sequences, and escaped
             * characters.
             *
             * @returns The read string, or an empty string in the case when
             * there are no more characters in the parse stream.
             */
            function maybeReadRegexGrapheme() {
                if (!parser.more())
                    return null;
                const mark = parser.position;
                if (parser.read("\\u{" /* utf16GroupStart */)) {
                    const delim = "}" /* utf16GroupEnd */;
                    const unicodeRef = parser.readUntil(delim);
                    // Make sure the readUntil method stopped because it
                    // actually hit the delimiter, and not because it ran out
                    // of characters.
                    if (parser.more()) {
                        parser.read(delim);
                        if (Truth.UnicodeBlocks.has(unicodeRef.toLowerCase()))
                            return new Grapheme("", unicodeRef, true);
                        const len = unicodeRef.length;
                        if (len >= 1 && len <= 5) {
                            const num = parseInt(unicodeRef, 16);
                            if (num === num) {
                                const char = String.fromCodePoint(num);
                                return new Grapheme(char, "", true);
                            }
                        }
                    }
                    // Something came in that looked like a unicode escape
                    // sequence, but turned out not to be, like: \u
                    parser.position = mark;
                }
                if (parser.read(esc)) {
                    // If the parse stream ends with a backslash, we just
                    // return the actual backslash character as a character.
                    // This covers ridiculous but possible cases where a
                    // an unannotated type is named something like "Thing\".
                    if (!parser.more())
                        return new Grapheme(esc, "", false);
                    const g = parser.readGrapheme();
                    const decoded = Truth.RegexSyntaxSign.unescape(esc + g) || g;
                    return new Grapheme(decoded, "", true);
                }
                return new Grapheme(parser.readGrapheme(), "", false);
            }
            /** */
            function isFault(value) {
                return value instanceof Truth.FaultType;
            }
        }
        /** */
        constructor() { }
    }
    Truth.LineParser = LineParser;
    /** */
    class Grapheme {
        constructor(
        /**
         * Stores the character found in the parse stream in
         * their unescaped format. For example, in the case
         * when the field is referring to a unicode character,
         * the field would store "🐇" ... not "\u1F407".
         */
        character, 
        /**
         * Stores the name of the unicode block specified,
         * or an empty string if the grapheme does not refer
         * to a unicode block.
         */
        unicodeBlockName, 
        /**
         * Stores whether the discovered grapheme was
         * escaped in the parse stream. Note that if the
         * grapheme refers to a special character, such
         * as "\d" for all digits, this will be true.
         */
        escaped) {
            this.character = character;
            this.unicodeBlockName = unicodeBlockName;
            this.escaped = escaped;
        }
    }
    /**
     * Slightly awkward hack function to attach a PatternQuantifier
     * to an already existing PatternUnit (without resorting to making
     * quantifier a mutable property.
     */
    function appendQuantifier(unit, quantifier = null) {
        if (quantifier === null)
            return unit;
        if (unit instanceof Truth.RegexSet)
            return new Truth.RegexSet(unit.knowns, unit.ranges, unit.unicodeBlocks, unit.singles, unit.isNegated, quantifier);
        if (unit instanceof Truth.RegexGroup)
            return new Truth.RegexGroup(unit.cases, quantifier);
        if (unit instanceof Truth.RegexGrapheme)
            return new Truth.RegexGrapheme(unit.grapheme, quantifier);
        throw Truth.Exception.notImplemented();
    }
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * Placeholder object to mark the position of
     * an anonymous type within a statement.
     */
    class Anon {
        constructor() {
            /**
             * @internal
             * No-op property used for debugging
             * purposes, and also to dodge structural
             * type compatibility bugs in TypeScript.
             */
            this.id = ++nextId;
        }
        /**
         * Returns a string representation of the Anon object which may be used to
         * uniquely identify it.
         *
         * Each Anon object serializes differently, otherwise, problems would arise
         * when trying to reference any of it's contained types (Ex. What specific
         * type is being refered to in "__ANON__" in the type URI "A/B/__ANON__/C"?
         */
        toString() {
            return `__ANON${this.id}__`;
        }
    }
    Truth.Anon = Anon;
    let nextId = 0;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * Stores information about a line, after being parsed.
     * A Line is different from a Statement in that it has no
     * relationship to a Document.
     */
    class Line {
        /*** */
        constructor(sourceText, indent, declarations, annotations, sum, jointPosition, flags, faultType) {
            this.sourceText = sourceText;
            this.indent = indent;
            this.declarations = declarations;
            this.annotations = annotations;
            this.sum = sum;
            this.jointPosition = jointPosition;
            this.flags = flags;
            this.faultType = faultType;
        }
    }
    Truth.Line = Line;
    /**
     * A bit field enumeration used to efficiently store
     * meta data about a Line (or a Statement) object.
     */
    let LineFlags;
    (function (LineFlags) {
        LineFlags[LineFlags["none"] = 0] = "none";
        LineFlags[LineFlags["isRefresh"] = 1] = "isRefresh";
        LineFlags[LineFlags["isVacuous"] = 2] = "isVacuous";
        LineFlags[LineFlags["isComment"] = 4] = "isComment";
        LineFlags[LineFlags["isWhitespace"] = 8] = "isWhitespace";
        LineFlags[LineFlags["isDisposed"] = 16] = "isDisposed";
        LineFlags[LineFlags["isCruft"] = 32] = "isCruft";
        LineFlags[LineFlags["hasUri"] = 64] = "hasUri";
        LineFlags[LineFlags["hasTotalPattern"] = 128] = "hasTotalPattern";
        LineFlags[LineFlags["hasPartialPattern"] = 256] = "hasPartialPattern";
        LineFlags[LineFlags["hasPattern"] = 512] = "hasPattern";
    })(LineFlags = Truth.LineFlags || (Truth.LineFlags = {}));
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * A marking object that stakes out a starting and ending
     * character offset within a statement, signifying the
     * boundary of a particular subject.
     */
    class Boundary {
        constructor(offsetStart, offsetEnd, subject) {
            this.offsetStart = offsetStart;
            this.offsetEnd = offsetEnd;
            this.subject = subject;
        }
    }
    Truth.Boundary = Boundary;
    /**
     * Groups together a series of related Boundary objects.
     */
    class BoundaryGroup {
        /** */
        constructor(boundaries) {
            this.entries = Object.freeze(boundaries.slice().sort((entryA, entryB) => {
                return entryA.offsetStart - entryB.offsetStart;
            }));
        }
        /** */
        *[Symbol.iterator]() {
            for (const entry of this.entries)
                yield entry;
        }
        /**
         * Iterates through each subject in the boundary group.
         */
        *eachSubject() {
            for (const entry of this.entries)
                yield entry.subject;
        }
        /**
         * Returns the subject at the specified offset, or null in the case
         * when no subject exists at the specified offset.
         */
        inspect(offset) {
            for (const entry of this.entries)
                if (offset >= entry.offsetStart && offset <= entry.offsetEnd)
                    return entry.subject;
            return null;
        }
        /**
         * Returns the first subject in the boundary group, or null in the
         * case when the boundary group contains no subjects.
         */
        first() {
            for (const entry of this)
                return entry;
            return null;
        }
        /** Gets the number of entries defined in the bounds. */
        get length() {
            return this.entries.length;
        }
    }
    Truth.BoundaryGroup = BoundaryGroup;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * A class that represents a single line within a Truth document.
     */
    class Statement extends Truth.AbstractClass {
        /**
         *
         */
        constructor(document, text) {
            super();
            /** @internal */
            this.class = 1 /* statement */;
            /**
             * @internal
             * Logical clock value used to make chronological
             * creation-time comparisons between Statements.
             */
            this.stamp = Truth.VersionStamp.next();
            /** @internal */
            this.flags = Truth.LineFlags.none;
            this._infixSpans = Object.freeze([]);
            const line = Truth.LineParser.parse(text, {
                readPatterns: true,
                readUris: true,
                assumedUri: document.uri
            });
            this.document = document;
            this.sourceText = line.sourceText;
            this.sum = line.sum;
            this.indent = line.indent;
            this.flags = line.flags;
            this.jointPosition = line.jointPosition;
            this.allDeclarations = Object.freeze(Array.from(line.declarations)
                .map(boundary => new Truth.Span(this, boundary)));
            this.allAnnotations = Object.freeze(Array.from(line.annotations)
                .map(boundary => new Truth.Span(this, boundary)));
            const faults = [];
            const cruftObjects = new Set();
            if (line.faultType !== null)
                faults.push(new Truth.Fault(line.faultType, this));
            for (const fault of this.eachParseFault()) {
                if (fault.type.severity === 8 /* error */)
                    cruftObjects.add(fault.source);
                faults.push(fault);
            }
            for (const fault of faults)
                // Check needed to support the unit tests, the feed
                // fake document objects into the statement constructor.
                if (document.program && document.program.faults)
                    document.program.faults.report(fault);
            this.cruftObjects = cruftObjects;
            this.faults = Object.freeze(faults);
            this.programStamp = document.program ?
                document.program.version :
                Truth.VersionStamp.next();
        }
        /**
         *
         */
        *eachParseFault() {
            // Check for tabs and spaces mixture
            if (this.indent > 0) {
                let hasTabs = false;
                let hasSpaces = false;
                for (let i = -1; ++i < this.indent;) {
                    const chr = this.sourceText[i];
                    if (chr === "\t" /* tab */)
                        hasTabs = true;
                    if (chr === " " /* space */)
                        hasSpaces = true;
                }
                if (hasTabs && hasSpaces)
                    yield new Truth.Fault(Truth.Faults.TabsAndSpaces, this);
            }
            if (this.allDeclarations.length > 1) {
                const subjects = [];
                for (const span of this.allDeclarations) {
                    const subText = span.toString();
                    if (subjects.includes(subText))
                        yield new Truth.Fault(Truth.Faults.DuplicateDeclaration, span);
                    else
                        subjects.push(subText);
                }
            }
            if (this.allAnnotations.length > 0) {
                // This performs an expedient check for "ListIntrinsicExtendingList",
                // however, full type analysis is required to cover all cases where
                // this fault may be reported.
                const getListSpans = (spans) => spans.filter(span => {
                    const sub = span.boundary.subject;
                    return sub instanceof Truth.Term && sub.isList;
                });
                const lhsListSpans = getListSpans(this.allDeclarations);
                const rhsListSpans = getListSpans(this.allAnnotations);
                if (lhsListSpans.length > 0 && rhsListSpans.length > 0)
                    for (const span of rhsListSpans)
                        yield new Truth.Fault(Truth.Faults.ListIntrinsicExtendingList, span);
            }
            const pattern = (() => {
                if (this.allDeclarations.length === 0)
                    return null;
                const hp = Truth.LineFlags.hasPattern;
                if ((this.flags & hp) !== hp)
                    return null;
                const subject = this.allDeclarations[0].boundary.subject;
                return subject instanceof Truth.Pattern ?
                    subject :
                    null;
            })();
            if (pattern === null)
                return;
            if (!pattern.isValid) {
                yield new Truth.Fault(Truth.Faults.PatternInvalid, this);
                return;
            }
            if (this.allAnnotations.length === 0)
                yield new Truth.Fault(Truth.Faults.PatternWithoutAnnotation, this);
            if (pattern.test(""))
                yield new Truth.Fault(Truth.Faults.PatternCanMatchEmpty, this);
            if (!pattern.isTotal)
                for (const unit of pattern.eachUnit())
                    if (unit instanceof Truth.RegexGrapheme)
                        if (unit.grapheme === "," /* combinator */) {
                            yield new Truth.Fault(Truth.Faults.PatternPartialWithCombinator, this);
                            break;
                        }
            const patternSpan = this.allDeclarations[0];
            if (patternSpan.infixes.length === 0)
                return;
            const infixSpans = [];
            for (const infix of patternSpan.infixes) {
                const lhs = Array.from(patternSpan.eachDeclarationForInfix(infix));
                const rhs = Array.from(patternSpan.eachAnnotationForInfix(infix));
                const all = lhs.concat(rhs);
                // This is a bit out of place ... but we need to populate the
                // infixSpans array and this is probably the most efficient
                // place to do that.
                infixSpans.push(...all);
                for (const infixSpan of all)
                    if (infixSpan.boundary.subject.isList)
                        yield new Truth.Fault(Truth.Faults.InfixUsingListOperator, infixSpan);
                yield* normalizeInfixSpans(lhs);
                yield* normalizeInfixSpans(rhs);
                const lhsSubjects = lhs.map(nfxSpan => nfxSpan.boundary.subject.toString());
                for (const infixSpan of rhs)
                    if (lhsSubjects.includes(infixSpan.boundary.subject.toString()))
                        yield new Truth.Fault(Truth.Faults.InfixHasSelfReferentialType, infixSpan);
                if (infix.isPopulation)
                    for (let idx = 1; idx < lhs.length; idx++)
                        yield new Truth.Fault(Truth.Faults.InfixPopulationChaining, lhs[idx]);
                yield* expedientListCheck(lhs);
                yield* expedientListCheck(rhs);
            }
            for (const infixSpan of eachRepeatedInfix(patternSpan, infix => patternSpan.eachDeclarationForInfix(infix))) {
                if (infixSpan.containingInfix.isPopulation)
                    yield new Truth.Fault(Truth.Faults.PopulationInfixHasMultipleDefinitions, infixSpan);
            }
            for (const infixSpan of eachRepeatedInfix(patternSpan, infix => patternSpan.eachAnnotationForInfix(infix))) {
                if (infixSpan.containingInfix.isPortability)
                    yield new Truth.Fault(Truth.Faults.PortabilityInfixHasMultipleDefinitions, infixSpan);
            }
            this._infixSpans = Object.freeze(infixSpans);
        }
        /**
         * Gets whether the joint operator exists at the
         * end of the statement, forcing the statement's
         * declarations to be "refresh types".
         */
        get isRefresh() {
            const f = Truth.LineFlags.isRefresh;
            return (this.flags & f) === f;
        }
        /**
         * Gets whether the statement contains nothing
         * other than a single joint operator.
         */
        get isVacuous() {
            const f = Truth.LineFlags.isVacuous;
            return (this.flags & f) === f;
        }
        /**
         * Gets whether the statement is a comment.
         */
        get isComment() {
            const f = Truth.LineFlags.isComment;
            return (this.flags & f) === f;
        }
        /**
         * Gets whether the statement contains
         * no non-whitespace characters.
         */
        get isWhitespace() {
            const f = Truth.LineFlags.isWhitespace;
            return (this.flags & f) === f;
        }
        /**
         * Gets whether the statement is a comment or whitespace.
         */
        get isNoop() {
            return this.isComment || this.isWhitespace;
        }
        /**
         * Gets whether this Statement has been removed from it's
         * containing document. Removal occurs after the statement
         * has been invalidated. Therefore, this property will be false
         * before the invalidation phase has occured, even if it will be
         * disposed in the current edit transaction.
         */
        get isDisposed() {
            const f = Truth.LineFlags.isDisposed;
            return (this.flags & f) === f;
        }
        /**
         * Gets whether the Statement has been marked as cruft,
         * due to a parsing error (and specifically not a type error).
         */
        get isCruft() {
            const f = Truth.LineFlags.isCruft;
            return (this.flags & f) === f;
        }
        /**
         * Gets the URI embedded within the Statement, in the case
         * when the statement is a URI statement.
         *
         * Gets null in the case when the Statement is not a URI
         * statement.
         */
        get uri() {
            const f = Truth.LineFlags.hasUri;
            return (this.flags & f) === f ?
                this.declarations[0].boundary.subject :
                null;
        }
        /**
         * Gets the line number of this statement in it's containing
         * document, or -1 if the statement is disposed and/or is not
         * in the document.
         */
        get line() {
            if (this.isDisposed)
                return -1;
            return this.document instanceof Truth.Document ?
                this.document.lineNumberOf(this) :
                -1;
        }
        /**
         * Gets an array of spans in that represent the declarations
         * of this statement, excluding those that have been marked
         * as object-level cruft.
         */
        get declarations() {
            if (this.cruftObjects.size === 0)
                return this.allDeclarations;
            const out = [];
            for (const span of this.allDeclarations)
                if (!this.cruftObjects.has(span))
                    out.push(span);
            return Object.freeze(out);
        }
        /**
         * Gets a list of all infixes defined in the pattern of this statement.
         */
        get infixSpans() {
            return this._infixSpans;
        }
        /**
         * Gets an array of spans in that represent the annotations
         * of this statement, from left to right, excluding those that
         * have been marked as object-level cruft.
         */
        get annotations() {
            if (this.cruftObjects.size === 0)
                return this.allAnnotations;
            const out = [];
            for (const span of this.allAnnotations)
                if (!this.cruftObjects.has(span))
                    out.push(span);
            return Object.freeze(out);
        }
        /**
         * Gets an array of spans in that represent both the declarations
         * and the annotations of this statement, excluding those that have
         * been marked as object-level cruft.
         */
        get spans() {
            return this.isCruft ?
                [] :
                this.declarations.concat(this.annotations);
        }
        /**
         *
         */
        get allSpans() {
            return this.declarations.concat(this.annotations);
        }
        /**
         * Gets a boolean value indicating whether or not the
         * statement contains a declaration of a pattern.
         */
        get hasPattern() {
            const d = this.allDeclarations;
            return d.length === 1 && d[0].boundary.subject instanceof Truth.Pattern;
        }
        /**
         * @internal
         * Marks the statement as being removed from it's containing document.
         */
        dispose() {
            this.flags = this.flags | Truth.LineFlags.isDisposed;
        }
        /**
         * @returns The kind of StatementZone that exists
         * at the given character offset within the Statement.
         */
        getZone(offset) {
            if (this.isComment || offset < this.indent || this.isCruft)
                return StatementZone.void;
            if (this.isWhitespace)
                return StatementZone.whitespace;
            if (this.hasPattern) {
                const bnd = this.allDeclarations[0].boundary;
                if (offset >= bnd.offsetStart && offset <= bnd.offsetEnd)
                    return StatementZone.pattern;
            }
            if (offset <= this.jointPosition || this.jointPosition < 0) {
                for (const span of this.allDeclarations) {
                    const bnd = span.boundary;
                    if (offset >= bnd.offsetStart && offset <= bnd.offsetEnd)
                        return StatementZone.declaration;
                }
                return StatementZone.declarationVoid;
            }
            for (const span of this.allAnnotations) {
                const bnd = span.boundary;
                if (offset >= bnd.offsetStart && offset <= bnd.offsetEnd)
                    return StatementZone.annotation;
            }
            return StatementZone.annotationVoid;
        }
        /**
         *
         */
        getSubject(offset) {
            return this.getDeclaration(offset) || this.getAnnotation(offset);
        }
        /**
         * @returns A span to the declaration subject at the
         * specified offset, or null if there is none was found.
         */
        getDeclaration(offset) {
            for (const span of this.declarations) {
                const bnd = span.boundary;
                if (offset >= bnd.offsetStart && offset <= bnd.offsetEnd)
                    return span;
            }
            return null;
        }
        /**
         * @returns A span to the annotation subject at the
         * specified offset, or null if there is none was found.
         */
        getAnnotation(offset) {
            for (const span of this.annotations) {
                const bnd = span.boundary;
                if (offset >= bnd.offsetStart && offset <= bnd.offsetEnd)
                    return span;
            }
            return null;
        }
        /**
         * @returns A string containing the inner comment text of
         * this statement, excluding the comment syntax token.
         * If the statement isn't a comment, an empty string is returned.
         */
        getCommentText() {
            return this.isComment ?
                this.sourceText.slice(this.indent + "//" /* comment */.length).trim() :
                "";
        }
        /**
         * Converts the statement to a formatted string representation.
         */
        toString(includeIndent = false) {
            const serializeSpans = (spans, escStyle) => {
                return spans
                    .filter(sp => !(sp.boundary.subject instanceof Truth.Anon))
                    .map(sp => Truth.SubjectSerializer.forExternal(sp, escStyle))
                    .join("," /* combinator */ + " " /* space */);
            };
            const indent = includeIndent ? "\t" /* tab */.repeat(this.indent) : "";
            if (this.isCruft)
                return indent + "(cruft)";
            if (this.isWhitespace)
                return indent;
            if (this.isVacuous)
                return indent + ":" /* joint */;
            const decls = serializeSpans(this.allDeclarations, 1 /* declaration */);
            const annos = serializeSpans(this.allAnnotations, 2 /* annotation */);
            const joint = annos.length > 0 || this.isRefresh ? ":" /* joint */ : "";
            const jointL = decls.length > 0 && joint !== "" ? " " /* space */ : "";
            const jointR = annos.length > 0 ? " " /* space */ : "";
            return indent + decls + jointL + joint + jointR + annos;
        }
    }
    Truth.Statement = Statement;
    /**
     * Defines the areas of a statement that are significantly
     * different when performing inspection.
     */
    let StatementZone;
    (function (StatementZone) {
        /**
         * Refers to the area within a comment statement,
         * or the whitespace preceeding a non-no-op.
         */
        StatementZone[StatementZone["void"] = 0] = "void";
        /**
         * Refers to the area in the indentation area.
         */
        StatementZone[StatementZone["whitespace"] = 1] = "whitespace";
        /**
         * Refers to the
         */
        StatementZone[StatementZone["pattern"] = 2] = "pattern";
        /** */
        StatementZone[StatementZone["declaration"] = 3] = "declaration";
        /** */
        StatementZone[StatementZone["annotation"] = 4] = "annotation";
        /** */
        StatementZone[StatementZone["declarationVoid"] = 5] = "declarationVoid";
        /** */
        StatementZone[StatementZone["annotationVoid"] = 6] = "annotationVoid";
    })(StatementZone = Truth.StatementZone || (Truth.StatementZone = {}));
    /**
     * Yields faults on infix spans in the case when a term
     * exists multiple times within the same infix.
     */
    function* normalizeInfixSpans(side) {
        if (side.length === 0)
            return;
        const subjects = new Set();
        for (const nfxSpan of side) {
            const sub = nfxSpan.boundary.subject;
            if (subjects.has(sub))
                yield new Truth.Fault(Truth.Faults.InfixHasDuplicateTerm, nfxSpan);
            else
                subjects.add(sub);
        }
    }
    /**
     * Yields faults on infix spans in the case when a term
     * has been re-declared multiple times across the infixes.
     *
     * Yields infixes that have terms that exist multiple times
     * within the same statement.
     */
    function* eachRepeatedInfix(span, infixFn) {
        const subjects = new Set();
        for (const infix of span.infixes) {
            const infixSpans = Array.from(infixFn(infix));
            for (const infixSpan of infixSpans) {
                const sub = infixSpan.boundary.subject;
                if (subjects.has(sub))
                    yield infixSpan;
                else
                    subjects.add(sub);
            }
        }
    }
    /**
     * Performs a quick and dirty check to see if the infix is referencing
     * a list, by looking to see if it has the list operator. A full check needs
     * to perform type inspection to see if any of the types that correspond
     * to the terms specified are actually lists.
     */
    function* expedientListCheck(side) {
        if (side.length === 0)
            return;
        for (const nfxSpan of side)
            if (nfxSpan.boundary.subject.isList)
                yield new Truth.Fault(Truth.Faults.InfixUsingListOperator, nfxSpan);
    }
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     *
     */
    class Pattern {
        /** @internal */
        constructor(
        /**
         *
         */
        units, 
        /**
         * Stores whether the pattern is considered to be "Total"
         * or "Partial". Total patterns must match an entire annotation
         * set (the entire strip of content to the right of a joint, after
         * being trimmed). Partial patterns match individually
         * specified subjects (separated by commas).
         */
        isTotal, 
        /**
         * Stores a hash which is computed from the set of
         * annotations specified to the right of the pattern.
         */
        hash) {
            this.units = units;
            this.isTotal = isTotal;
            this.hash = hash;
            /** */
            this.compiledRegExp = null;
            this.compiledRegExp = Truth.PatternPrecompiler.exec(this);
            this.isValid = this.compiledRegExp instanceof RegExp;
        }
        /**
         * Recursively enumerates through this Pattern's unit structure.
         */
        *eachUnit() {
            function* recurse(units) {
                for (const unit of units) {
                    yield unit;
                    if (unit instanceof Truth.RegexGroup)
                        for (const unitCase of unit.cases)
                            recurse(unitCase);
                }
            }
            yield* recurse(this.units);
        }
        /**
         * @returns A boolean value that indicates whether
         * this Pattern has at least one infix, of any type.
         */
        hasInfixes() {
            return this.units.some(u => u instanceof Truth.Infix);
        }
        /**
         * @returns An array containing the infixes of the
         * specified type that are defined in this Pattern.
         * If the argument is omitted, all infixes of any type
         * defined on this Pattern are returned.
         */
        getInfixes(type = Truth.InfixFlags.none) {
            return this.units
                .filter((u) => u instanceof Truth.Infix)
                .filter(nfx => (nfx.flags & type) === type);
        }
        /**
         * Performs an "expedient" test that determines whether the
         * specified input has a chance of being matched by this pattern.
         * The check is considered expedient, rather than thorough,
         * because any infixes that exist in this pattern are replaced
         * with "catch all" regular expression sequence, rather than
         * embedding the pattern associated with the type specified
         * in the infix.
         */
        test(input) {
            const regExp = this.compiledRegExp;
            if (regExp === null)
                return false;
            const inputTrimmed = input.trim();
            if (inputTrimmed === "")
                return false;
            return regExp.test(input);
        }
        /**
         * Executes the pattern (like a function) using the specified
         * string as the input.
         *
         * @returns A ReadonlyMap whose keys align with the infixes
         * contained in this Pattern, and whose values are strings that
         * are the extracted "inputs", found in the place of each infix.
         * If this Pattern has no infixes, an empty map is returned.
         */
        exec(patternParameter) {
            const regExp = this.compiledRegExp;
            if (regExp === null)
                return new Map();
            const result = new Map();
            const infixes = this.getInfixes();
            if (this.getInfixes().length === 0)
                return result;
            const infixCaptureGroupIndexes = (() => {
                const idxArray = [];
                let idx = 0;
                for (const unit of this.eachUnit()) {
                    if (unit instanceof Truth.Infix)
                        idxArray.push(++idx);
                    if (unit instanceof Truth.RegexGroup)
                        idx++;
                }
                ///Make sure the above produces the same behavior before deleting
                ///const recurseUnits = (units: readonly (RegexUnit | Infix>)[]) =>
                ///{
                ///	for (const unit of units)
                ///	{
                ///		if (unit instanceof Infix)
                ///		{
                ///			idxArray.push(++idx);
                ///		}
                ///		else if (unit instanceof RegexGroup)
                ///		{
                ///			++idx;
                ///			for (const unitCase of unit.cases)
                ///				recurseUnits(unitCase);
                ///		}
                ///	}
                ///}
                ///recurseUnits(this.units);
                return idxArray;
            })();
            const reg = new RegExp(regExp.source, regExp.flags);
            const matches = reg.exec(patternParameter);
            if (matches === null)
                return result;
            for (const [idx, infix] of infixes.entries())
                result.set(infix, matches[infixCaptureGroupIndexes[idx]]);
            return result;
        }
        /**
         * Converts this Pattern to a string representation.
         * (Note that the serialized pattern cannot be used
         * as a parameter to a JavaScript RegExp object.)
         *
         * @param includeHashPrefix If true, the Pattern's hash
         * prefix will be prepended to the serialized result.
         */
        toString(includeHashPrefix) {
            const prefix = includeHashPrefix ? escape(this.hash) : "";
            const delim = "/" /* main */.toString();
            return delim + prefix +
                this.units.map(u => u.toString()).join("") +
                (this.isTotal ? delim : "");
        }
    }
    Truth.Pattern = Pattern;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /** */
    class PatternPrecompiler {
        /**
         * Compiles the specified pattern into a JS-native
         * RegExp object that can be used to execute regular
         * expression pre-matching (i.e. checks that essentially
         * ignore any infixes that the pattern may have).
         */
        static exec(pattern) {
            const result = [];
            for (const unit of pattern.units) {
                if (unit instanceof Truth.RegexGrapheme) {
                    if (mustEscapeChars.includes(unit.grapheme))
                        result.push("\\" /* escapeChar */ + unit.grapheme);
                    else
                        result.push(unit.grapheme);
                    if (unit.quantifier)
                        result.push(unit.quantifier.toString());
                }
                else if (unit instanceof Truth.Infix) {
                    result.push(expedientInfixPattern);
                }
                else {
                    result.push(unit.toString());
                }
            }
            result.unshift("^");
            result.push("$");
            const regText = result.join("");
            try {
                return new RegExp(regText, "u");
            }
            catch (e) {
                return null;
            }
        }
    }
    Truth.PatternPrecompiler = PatternPrecompiler;
    /**
     * Stores the list of characters that must be escaped
     * in order for the Truth regular expression flavor to
     * be compatible with the engine build into JavaScript.
     */
    const mustEscapeChars = ["$", "^", "{", "}"];
    /**
     * Stores the pattern that is fed into a pattern in
     * place of where infixes are, in order to be able to
     * do early tests on the regular expression without
     * doing a full resolution of the types that the infixes
     * reference. The pattern essentially means:
     *
     * "Match one non-whitespace character, or a series
     * of characters, provided that the string of characters
     * don't begin or end with whitespace."
     */
    const expedientInfixPattern = "(\\S+(\\s+\\S+)*)";
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * Ambient unifier for all PatternUnit instances
     */
    class RegexUnit {
        constructor(quantifier) {
            this.quantifier = quantifier;
        }
    }
    Truth.RegexUnit = RegexUnit;
    /**
     *
     */
    class RegexSet extends RegexUnit {
        /** */
        constructor(knowns, ranges, unicodeBlocks, singles, isNegated, quantifier) {
            super(quantifier);
            this.knowns = knowns;
            this.ranges = ranges;
            this.unicodeBlocks = unicodeBlocks;
            this.singles = singles;
            this.isNegated = isNegated;
            this.quantifier = quantifier;
        }
        /** */
        toString() {
            const kLen = this.knowns.length;
            const rLen = this.ranges.length;
            const uLen = this.unicodeBlocks.length;
            const cLen = this.singles.length;
            const setText = (() => {
                if (kLen === 1 && rLen + uLen + cLen === 0)
                    return this.knowns[0].toString();
                if (uLen === 1 && kLen + rLen + cLen === 0)
                    return [
                        "[" /* setStart */ +
                            serializeUnicodeBlock(this.unicodeBlocks[0]) +
                            "]" /* setEnd */
                    ].join("");
                if (cLen === 1 && kLen + rLen + uLen === 0)
                    return this.singles[0];
                return [
                    "[" /* setStart */,
                    ...this.knowns,
                    ...this.ranges.map(r => esc(r.from) + "-" + esc(r.to)),
                    ...this.unicodeBlocks.map(serializeUnicodeBlock),
                    ...escMany(this.singles),
                    "]" /* setEnd */
                ].join("");
            })();
            return setText + (this.quantifier ? this.quantifier.toString() : "");
        }
        /**
         * @internal
         */
        toAlphabet() {
            const alphabetBuilder = new Truth.AlphabetBuilder();
            const gt = (char) => char.charCodeAt(0) + 1;
            const lt = (char) => char.charCodeAt(0) - 1;
            for (const known of this.knowns) {
                switch (known) {
                    case Truth.RegexSyntaxKnownSet.digit:
                        alphabetBuilder.add("0", "9");
                        break;
                    case Truth.RegexSyntaxKnownSet.digitNon:
                        alphabetBuilder.add(0, lt("0"));
                        alphabetBuilder.add(gt("9"), Truth.UnicodeMax);
                        break;
                    case Truth.RegexSyntaxKnownSet.alphanumeric:
                        alphabetBuilder.add("0", "9");
                        alphabetBuilder.add("A", "Z");
                        alphabetBuilder.add("a", "z");
                        break;
                    case Truth.RegexSyntaxKnownSet.alphanumericNon:
                        alphabetBuilder.add(0, lt("0"));
                        alphabetBuilder.add(gt("9"), lt("A"));
                        alphabetBuilder.add(gt("Z"), lt("a"));
                        alphabetBuilder.add(gt("z"), Truth.UnicodeMax);
                        break;
                    case Truth.RegexSyntaxKnownSet.whitespace:
                        alphabetBuilder.add(9, 13);
                        alphabetBuilder.add(160);
                        alphabetBuilder.add(5760);
                        alphabetBuilder.add(8192, 8202);
                        alphabetBuilder.add(8232);
                        alphabetBuilder.add(8233);
                        alphabetBuilder.add(8239);
                        alphabetBuilder.add(8287);
                        alphabetBuilder.add(12288);
                        alphabetBuilder.add(65279);
                        break;
                    case Truth.RegexSyntaxKnownSet.whitespaceNon:
                        alphabetBuilder.add(0, 8);
                        alphabetBuilder.add(14, 159);
                        alphabetBuilder.add(161, 5759);
                        alphabetBuilder.add(5761, 8191);
                        alphabetBuilder.add(8203, 8231);
                        alphabetBuilder.add(8232);
                        alphabetBuilder.add(8233);
                        alphabetBuilder.add(8234, 8238);
                        alphabetBuilder.add(8240, 8286);
                        alphabetBuilder.add(8288, 12287);
                        alphabetBuilder.add(12289, 65278);
                        alphabetBuilder.add(65280, Truth.UnicodeMax);
                        break;
                    case Truth.RegexSyntaxKnownSet.wild:
                        alphabetBuilder.addWild();
                        break;
                }
            }
            for (const range of this.ranges)
                alphabetBuilder.add(range.from, range.to);
            for (const single of this.singles)
                alphabetBuilder.add(single);
            return alphabetBuilder.toAlphabet(this.isNegated);
        }
    }
    Truth.RegexSet = RegexSet;
    /**
     *
     */
    class RegexCharRange {
        constructor(from, to) {
            this.from = from;
            this.to = to;
        }
    }
    Truth.RegexCharRange = RegexCharRange;
    /**
     *
     */
    class RegexGroup extends RegexUnit {
        constructor(
        /**
         *
         */
        cases, quantifier) {
            super(quantifier);
            this.cases = cases;
            this.quantifier = quantifier;
        }
        /** */
        toString() {
            if (this.cases.length === 0)
                return "";
            const start = "(" /* groupStart */;
            const mid = this.cases
                .map(ca => ca.map(unit => esc(unit.toString())).join(""))
                .join("|" /* alternator */);
            const end = ")" /* groupEnd */;
            const quant = this.quantifier ? this.quantifier.toString() : "";
            return start + mid + end + quant;
        }
    }
    Truth.RegexGroup = RegexGroup;
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
        constructor(grapheme, quantifier) {
            super(quantifier);
            this.grapheme = grapheme;
            this.quantifier = quantifier;
        }
        /** */
        toString() {
            const q = this.quantifier;
            const qEsc = q === null ? "" : esc(q.toString());
            const g = this.grapheme.toString();
            return escapableGraphemes.includes(g) ?
                "\\" + g + qEsc :
                g + qEsc;
        }
    }
    Truth.RegexGrapheme = RegexGrapheme;
    /** */
    const escapableGraphemes = [
        "*" /* star */,
        "+" /* plus */,
        "^" /* negate */,
        "?" /* restrained */,
        "(" /* groupStart */,
        ")" /* groupEnd */,
        "|" /* alternator */,
        "[" /* setStart */,
        "]" /* setEnd */,
        "{" /* quantifierStart */,
        "}" /* quantifierEnd */
    ];
    /**
     * A Regex "Sign" refers to an escape sequence that refers
     * to one other character, as opposed to that character
     * being written directly in the parse stream.
     */
    class RegexSign extends RegexUnit {
        constructor(sign, quantifier) {
            super(quantifier);
            this.sign = sign;
            this.quantifier = quantifier;
        }
        /** */
        toString() {
            const q = this.quantifier;
            return this.sign.toString() + (q === null ? "" : esc(q.toString()));
        }
    }
    Truth.RegexSign = RegexSign;
    /**
     * A pattern unit class that represents +, *,
     * and explicit quantifiers such as {1,2}.
     */
    class RegexQuantifier {
        constructor(
        /**
         * Stores the lower bound of the quantifier,
         * or the fewest number of graphemes to be matched.
         */
        min = 0, 
        /**
         * Stores the upper bound of the quantifier,
         * or the most number of graphemes to be matched.
         */
        max = Infinity, 
        /**
         * Stores whether the the quantifier is restrained,
         * in that it matches the fewest possible number
         * of characters.
         *
         * (Some regular expression flavours awkwardly
         * refer to this as "non-greedy".)
         */
        restrained) {
            this.min = min;
            this.max = max;
            this.restrained = restrained;
        }
        /**
         * Converts the regex quantifier to an optimized string.
         */
        toString() {
            const rst = this.restrained ? "?" /* restrained */ : "";
            if (this.min === 0 && this.max === Infinity)
                return "*" /* star */ + rst;
            if (this.min === 1 && this.max === Infinity)
                return "+" /* plus */ + rst;
            if (this.min === 0 && this.max === 1)
                return "?" /* restrained */;
            const qs = "{" /* quantifierStart */;
            const qp = "," /* quantifierSeparator */;
            const qe = "}" /* quantifierEnd */;
            return this.min === this.max ?
                qs + this.min + qe :
                qs + this.min + qp + (this.max === Infinity ? "" : this.max.toString()) + qe;
        }
    }
    Truth.RegexQuantifier = RegexQuantifier;
    /**
     * Utility function that returns a double escape
     * if the passed value is a backslash.
     */
    function esc(maybeBackslash) {
        if (maybeBackslash === 92 || maybeBackslash === "\\")
            return "\\\\";
        if (typeof maybeBackslash === "number")
            return String.fromCodePoint(maybeBackslash);
        return maybeBackslash;
    }
    /**
     *
     */
    function escMany(array) {
        return array.map(esc).join("");
    }
    /**
     *
     */
    function serializeUnicodeBlock(blockName) {
        const block = Truth.UnicodeBlocks.get(blockName.toLowerCase());
        if (block === undefined)
            throw Truth.Exception.unknownState();
        const rng = "-" /* range */;
        const from = block[0].toString(16);
        const to = block[1].toString(16);
        return `\\u{${from}}${rng}\\u{${to}}`;
    }
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * A class that represents a portion of the content
     * within an Infix that spans a type reference.
     */
    class Infix {
        constructor(
        /**
         * Stores the left-most character position of the Infix
         * (before the delimiter), relative to the containing statement.
         */
        offsetStart, 
        /**
         * Stores the left-most character position of the Infix
         * (after the delimiter), relative to the containing statement.
         */
        offsetEnd, 
        /**
         * Stores the Bounds object that marks out the positions
         * of the terms in the Infix that are located before
         * any Joint operator.
         */
        lhs, 
        /**
         * Stores the Bounds object that marks out the positions
         * of the terms in the Infix that are located after
         * any Joint operator.
         */
        rhs, 
        /** */
        flags) {
            this.offsetStart = offsetStart;
            this.offsetEnd = offsetEnd;
            this.lhs = lhs;
            this.rhs = rhs;
            this.flags = flags;
        }
        /**
         * Gets whether this Infix is of the "pattern" variety.
         */
        get isPattern() {
            return (this.flags & InfixFlags.pattern) === InfixFlags.pattern;
        }
        /**
         * Gets whether this Infix is of the "portability" variety.
         */
        get isPortability() {
            return (this.flags & InfixFlags.portability) === InfixFlags.portability;
        }
        /**
         * Gets whether this Infix is of the "population" variety.
         */
        get isPopulation() {
            return (this.flags & InfixFlags.population) === InfixFlags.population;
        }
        /**
         * Gets whether this Infix has the "nominal" option set.
         */
        get isNominal() {
            return (this.flags & InfixFlags.nominal) === InfixFlags.nominal;
        }
        /** */
        toString() {
            const delimL = this.isPattern ? "</" /* patternStart */ :
                this.isNominal ? "<<" /* nominalStart */ :
                    this.isPortability ? "<" /* start */ + " " /* space */ + ":" /* joint */ + " " /* space */ :
                        "<" /* start */;
            const delimR = this.isPattern ? "/>" /* patternEnd */ :
                this.isNominal ? ">>" /* nominalEnd */ :
                    ">" /* end */;
            const join = (spans) => Array.from(spans)
                .map(entry => entry.subject)
                .join("," /* combinator */ + " " /* space */);
            if (this.isPortability)
                return join(this.rhs);
            if (this.isPattern)
                return join(this.lhs);
            const joint = this.rhs.length > 0 ?
                " " /* space */ + ":" /* joint */ + " " /* space */ :
                "";
            return delimL + join(this.lhs) + joint + join(this.rhs) + delimR;
        }
    }
    Truth.Infix = Infix;
    /**
     *
     */
    let InfixFlags;
    (function (InfixFlags) {
        InfixFlags[InfixFlags["none"] = 0] = "none";
        /**
         * Indicates that the joint was specified within
         * the infix. Can be used to determine if the infix
         * contains some (erroneous) syntax resembing
         * a refresh type, eg - /<Type : >/
         */
        InfixFlags[InfixFlags["hasJoint"] = 1] = "hasJoint";
        /**
         * Indicates that the </Pattern/> syntax was
         * used to embed the patterns associated
         * with a specified type.
         */
        InfixFlags[InfixFlags["pattern"] = 2] = "pattern";
        /**
         * Indicates that the infix is of the "portabiity"
         * variety, using the syntax < : Type>
         */
        InfixFlags[InfixFlags["portability"] = 4] = "portability";
        /**
         * Indicates that the infix is of the "popuation"
         * variety, using the syntax <Declaration : Annotation>
         * or <Declaration>
         */
        InfixFlags[InfixFlags["population"] = 8] = "population";
        /**
         * Indicates that the <<Double>> angle bracket
         * syntax was used to only match named types,
         * rather than aliases.
         */
        InfixFlags[InfixFlags["nominal"] = 16] = "nominal";
    })(InfixFlags = Truth.InfixFlags || (Truth.InfixFlags = {}));
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * A class that represents a position in a statement.
     */
    class Span {
        /**
         * @internal
         */
        constructor(
        /**
         * Stores a reference to the Statement that contains this Span.
         */
        statement, 
        /**
         * Stores the subject, and the location of it in the document.
         */
        boundary) {
            this.statement = statement;
            this.boundary = boundary;
            /**
             * @internal
             * Logical clock value used to make chronological
             * creation-time comparisons between Spans.
             */
            this.stamp = Truth.VersionStamp.next();
            this._infixes = null;
            /** */
            this.infixSpanTable = new Map();
            this._ancestry = null;
            /**  */
            this.factoredSpines = null;
            this.name =
                Truth.SubjectSerializer.forInternal(boundary) +
                    ` (${boundary.offsetStart}, ${boundary.offsetEnd})`;
        }
        /**
         * Gets the Infixes stored within this Span, in the case when
         * the Span corresponds to a Pattern. In other cases, and
         * empty array is returned.
         */
        get infixes() {
            return this._infixes || (this._infixes = Object.freeze((() => {
                return this.boundary.subject instanceof Truth.Pattern ?
                    Array.from(this.boundary.subject.getInfixes()) :
                    [];
            })()));
        }
        /** */
        *eachDeclarationForInfix(infix) {
            if (!this.infixes.includes(infix))
                throw Truth.Exception.invalidCall();
            const { lhs } = this.queryInfixSpanTable(infix);
            for (const infixSpan of lhs)
                yield infixSpan;
        }
        /** */
        *eachAnnotationForInfix(infix) {
            if (!this.infixes.includes(infix))
                throw Truth.Exception.invalidCall();
            const { rhs } = this.queryInfixSpanTable(infix);
            for (const infixSpan of rhs)
                yield infixSpan;
        }
        /** */
        queryInfixSpanTable(infix) {
            return this.infixSpanTable.get(infix) || (() => {
                const lhs = [];
                const rhs = [];
                for (const boundary of infix.lhs)
                    lhs.push(new Truth.InfixSpan(this, infix, boundary));
                for (const boundary of infix.rhs)
                    rhs.push(new Truth.InfixSpan(this, infix, boundary));
                return { lhs, rhs };
            })();
        }
        /**
         * Gets an array of statements that represent the statement
         * containment progression, all the way back to the containing
         * document.
         */
        get ancestry() {
            if (this._ancestry)
                if (this._ancestry.every(smt => !smt.isDisposed))
                    return this._ancestry;
            // If the ancestry has no yet been computed, or it has, but at least of
            // it's statements have been disposed, then it must be recomputed.
            this._ancestry = this.statement.document.getAncestry(this.statement);
            if (!this._ancestry)
                throw Truth.Exception.unknownState();
            return this._ancestry;
        }
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
        factor() {
            if (this.factoredSpines)
                return this.factoredSpines;
            if (this.isCruft || this.statement.isCruft)
                return this.factoredSpines = Object.freeze([]);
            if (this.ancestry.length === 0)
                return this.factoredSpines = Object.freeze([new Truth.Spine([this])]);
            // We need to factor the ancestry. This means we're taking the
            // specified ancestry path, and splitting where any has-a side unions
            // exist, in effect creating all possible paths to the specified tip.
            // It's possible to have statements in the span path in the case
            // when the statement has been deemed as cruft, and therefore,
            // is impossible to extract any spans from it.
            const factoredSpanPaths = [];
            // An array of arrays. The first dimension corresponds to a statement. 
            // The second dimension stores the declaration spans themselves.
            const ancestryMatrix = this.ancestry.map(smt => Array.from(smt.declarations));
            // An array that stores the number of declaration spans in each statement.
            const ancestryLengths = ancestryMatrix.map(span => span.length);
            // Multiplying together the number of spans in each statement will
            // give the total number of unique spines that will be produced.
            const numSpines = ancestryLengths.reduce((a, b) => a * b, 1);
            // Start with an array of 0's, whose length matches the number
            // of statements in the ancestry. Each number in this array will be 
            // incremented by 1, from right to left, each number maxing out at
            // the number of declarations in the ancestor. After each incrementation,
            // the progression of numbers will run through all indexes required to
            // perform a full factorization of the terms in the ancestry. This array
            // tells the algorithm which indexes in ancestryMatrix to pull when
            // constructing a spine.
            const cherryPickIndexes = ancestryLengths.map(() => 0);
            // Stores the position in cherryPickIndexes that we're currently
            // incrementing. Moves backward when the number at 
            // the target position is >= the number of terms at that position.
            let targetIncLevel = 0;
            for (let i = -1; ++i < numSpines;) {
                // Do an insertion at the indexes specified by insertionIndexes
                const spanPath = [];
                // Cherry pick a series of terms from the ancestry terms,
                // according to the index set we're currently on.
                for (let level = -1; ++level < this.ancestry.length;) {
                    const statement = this.ancestry[level];
                    if (statement.isCruft) {
                        spanPath.push(statement);
                        continue;
                    }
                    const spansForStatement = ancestryMatrix[level];
                    const spanIndex = cherryPickIndexes[level];
                    const span = spansForStatement[spanIndex];
                    if (!span)
                        throw Truth.Exception.unknownState();
                    spanPath.push(span);
                }
                // The tip span specified in the method arguments
                // is added at the end of all generated span paths.
                spanPath.push(this);
                factoredSpanPaths.push(spanPath);
                // Bump up the current cherry pick index, 
                // or if we hit the roof, move to the next level,
                // and keep doing this until we find a number
                // to increment.
                while (cherryPickIndexes[targetIncLevel] >= ancestryLengths[targetIncLevel] - 1)
                    targetIncLevel++;
                cherryPickIndexes[targetIncLevel]++;
            }
            return this.factoredSpines =
                Object.freeze(factoredSpanPaths.map(spanPath => new Truth.Spine(spanPath)));
        }
        /**
         * Gets a boolean value that indicates whether this Span is considered
         * object-level cruft, and should therefore be ignored during type analysis.
         */
        get isCruft() {
            return this.statement.cruftObjects.has(this);
        }
        /**
         * Converts this Span to a string representation.
         *
         * @param includeHashPrefix If the subject inside this Span is a
         * Pattern, and this argument is true, the Pattern's hash prefix
         * will be prepended to the serialized result.
         */
        toString(includeHashPrefix) {
            const sub = this.boundary.subject;
            return sub instanceof Truth.Pattern ?
                sub.toString(!!includeHashPrefix) :
                sub.toString();
        }
    }
    Truth.Span = Span;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * A class that manages an array of Span objects that
     * represent a specific spine of declarations, starting at
     * a document, passing through a series of spans,
     * and ending at a tip span.
     */
    class Spine {
        /** */
        constructor(vertebrae) {
            /** Stores an array of the Spans that compose the Spine. */
            this.vertebrae = [];
            if (vertebrae.length === 0)
                throw Truth.Exception.invalidCall();
            this.vertebrae = vertebrae.map(v => {
                if (v instanceof Truth.Span)
                    return v;
                const existCruftMarker = cruftMarkers.get(v);
                if (existCruftMarker !== undefined)
                    return existCruftMarker;
                const newCruftMarker = new CruftMarker(v);
                cruftMarkers.set(v, newCruftMarker);
                return newCruftMarker;
            });
            const tip = this.vertebrae[vertebrae.length - 1];
            if (tip instanceof CruftMarker)
                throw Truth.Exception.invalidCall();
            this.tip = tip;
        }
        /** */
        get statement() { return this.tip.statement; }
        /** Gets a reference to the document that sits at the top of the spine. */
        get document() { return this.statement.document; }
    }
    Truth.Spine = Spine;
    /**
     * A class that acts as a stand-in for a statement that has been
     * marked as cruft, suitable for usage in a Spine.
     */
    class CruftMarker {
        /** @internal */
        constructor(statement) {
            this.statement = statement;
        }
        /**
         * Converts this cruft marker to a string representation,
         * which is derived from a hash calculated from this
         * marker's underlying statement.
         */
        toString() {
            return "≈" + Truth.Hash.calculate(this.statement.sourceText);
        }
    }
    Truth.CruftMarker = CruftMarker;
    const cruftMarkers = new WeakMap();
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /** */
    class SubjectSerializer {
        /**
         * Universal method for serializing a subject to a string,
         * useful for debugging and supporting tests.
         */
        static forExternal(target, escapeStyle = 0 /* none */) {
            const subject = this.resolveSubject(target);
            return this.serialize(subject, escapeStyle, false);
        }
        /**
         * Serializes a subject, or a known subject containing object for internal use.
         */
        static forInternal(target) {
            const subject = this.resolveSubject(target);
            return this.serialize(subject, 0 /* none */, true);
        }
        /** */
        static resolveSubject(target) {
            return target instanceof Truth.Boundary ? target.subject :
                target instanceof Truth.Span ? target.boundary.subject :
                    target instanceof Truth.InfixSpan ? target.boundary.subject :
                        target;
        }
        /** */
        static serialize(subject, escapeStyle, includeHash) {
            if (subject instanceof Truth.Term)
                return subject.toString(escapeStyle);
            else if (subject instanceof Truth.Pattern)
                return subject.toString(includeHash);
            else if (subject instanceof Truth.KnownUri)
                return subject.toString();
            throw Truth.Exception.unknownState();
        }
    }
    Truth.SubjectSerializer = SubjectSerializer;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     * Stores a representation of a Truth program in a graph
     * format, which lays the foundation for type analysis.
     */
    class HyperGraph {
        /** */
        constructor(program) {
            this.program = program;
            /**
             * Stores a GraphTransaction instance in the case
             * when an edit transaction is underway.
             */
            this.activeTransactions = new Map();
            this.nodeIndex = new Truth.NodeIndex();
            if (HyperGraph.disabled)
                return;
            for (const doc of program.documents)
                this.include(doc);
            program.on(Truth.CauseDocumentCreate, data => {
                this.include(data.document);
            });
            program.on(Truth.CauseDocumentDelete, data => {
                this.exclude(data.document);
            });
            program.on(Truth.CauseInvalidate, data => {
                if (data.parents.length > 0) {
                    for (const smt of data.parents)
                        this.exclude(smt);
                }
                else
                    this.exclude(data.document);
            });
            program.on(Truth.CauseRevalidate, data => {
                if (data.parents.length > 0) {
                    for (const smt of data.parents)
                        this.include(smt);
                }
                else
                    this.include(data.document);
            });
            program.on(Truth.CauseEditComplete, data => {
                this.activeTransactions.delete(data.document);
            });
        }
        /**
         * Handles a document-level exclusion, which is the removal
         * of a section of Spans within a document, or possibly the
         * entire document itself.
         */
        exclude(root) {
            const { document, iterator } = this.methodSetup(root);
            const txn = this.getTransaction(root);
            const entries = Array.from(iterator);
            ///const maybeDestabilizedEdges: HyperEdge[] = [];
            for (const { statement } of entries) {
                for (const declaration of statement.declarations) {
                    const associatedNodes = new Set(declaration
                        .factor()
                        .map(spine => { var _a; return (_a = Truth.Phrase.fromSpine(spine)) === null || _a === void 0 ? void 0 : _a.associatedNode; })
                        .filter((n) => n instanceof Truth.Node));
                    for (const associatedNode of associatedNodes) {
                        associatedNode.removeDeclaration(declaration);
                        if (associatedNode.declarations.size === 0)
                            txn.destabilizedNodes.push(associatedNode);
                        for (const ob of associatedNode.outbounds)
                            if (ob.fragments.length === 0)
                                txn.destablizedEdges.push(ob);
                        ///for (const ib of associatedNode.inbounds)
                        ///	maybeDestabilizedEdges.push(ib);
                    }
                }
            }
            ///for (const edge of maybeDestabilizedEdges)
            ///	if (edge.successors.every(scsr => txn.destabilizedNodes.includes(scsr.node)))
            ///		txn.destablizedEdges.push(edge);
            this.activeTransactions.set(document, txn);
        }
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
        include(root) {
            const { document, iterator } = this.methodSetup(root);
            const txn = this.getTransaction(document);
            // The first step is to collect all the Phrase objects in the invalidated area,
            // and the Spans and InfixSpans that are associated with that Phrase. The
            // data structure here is a MultiMap, to the correspondence is 
            // 1 Phrase to N Spans.
            const phraseSpansMap = new Truth.MultiMap();
            for (const { statement } of iterator) {
                for (const decl of statement.declarations) {
                    for (const spine of decl.factor()) {
                        const phrase = Truth.Phrase.fromSpine(spine);
                        if (!phrase)
                            continue;
                        phraseSpansMap.add(phrase, decl);
                        // If the declaration has population infixes, these
                        // need to be added to the map as though they
                        // were regular declarations.
                        for (const popInfix of decl.infixes.filter(nfx => nfx.isPopulation))
                            for (const infixSpan of decl.eachDeclarationForInfix(popInfix))
                                phraseSpansMap.add(phrase.forward(infixSpan.boundary.subject), infixSpan);
                    }
                }
            }
            if (phraseSpansMap.size === 0)
                return;
            // It's important that the Phrases are enumerated in breadth-first
            // order. For example, this means that all Phrases with a length of 2
            // (such as Object / Density) must be evaluated before all Phrases
            // with a length of 3 (such as Object / Density / Tolerance). This is
            // because in order to construct a 3rd-level Node, we have to 
            // guarantee that it's outer 2nd-level node was fully constructed,
            // otherwise, the 3rd-level node will have nowhere to connect.
            const newAreaSorted = Array.from(phraseSpansMap.entries())
                .sort((a, b) => a[0].length - b[0].length);
            // Stores all the nodes that have been affected by a new
            // fragment either being added or removed from it.
            const affectedNodes = new Map();
            // Stores a subset of the affectedNodes array. Contains
            // only the nodes that are at the outer-most level of depth
            // within the node set (not necessarily the document root).
            const affectedNodesApexes = [];
            /**
             * @returns The containing node that
             * corresponds to the specified phrase.
             */
            const findNode = (phrase) => {
                if (phrase.length === 0)
                    throw Truth.Exception.invalidArgument();
                return affectedNodes.get(phrase) || phrase.associatedNode;
            };
            // The following block populates the appropriate Nodes
            // in the graph with the new Span objects that were sent
            // in through the "root" parameter. New Node objects
            // are created if necessary.
            for (const [phrase, declarations] of newAreaSorted) {
                for (const declaration of declarations) {
                    const nodeAtPhrase = findNode(phrase);
                    if (nodeAtPhrase) {
                        // We add the phrase to the table of affected nodes,
                        // to handle the case when it was extracted from the
                        // cache.
                        affectedNodes.set(phrase, nodeAtPhrase);
                        nodeAtPhrase.addDeclaration(declaration);
                        continue;
                    }
                    const container = phrase.length > 1 ?
                        findNode(phrase.back()) :
                        null;
                    if (phrase.length > 1 && container === null)
                        throw Truth.Exception.unknownState();
                    // Note that when creating a Node, it's
                    // automatically bound to it's container.
                    const newNode = new Truth.Node(container, declaration);
                    affectedNodes.set(phrase, newNode);
                    // Populate the affectedNodesApexes array, 
                    // which is needed to find the nodes that are
                    // affected by the change, but are not located
                    // directly within the patch.
                    if (affectedNodesApexes.length === 0) {
                        affectedNodesApexes.push(newNode);
                    }
                    else {
                        // If we've encountered a node that is higher
                        // than the level of depth defined in the nodes
                        // currently in the affectedNodesApexes array.
                        const highestDepth = affectedNodesApexes[0].phrase.length;
                        const nodeDepth = newNode.phrase.length;
                        if (nodeDepth < highestDepth)
                            affectedNodesApexes.length = 0;
                        if (nodeDepth <= highestDepth)
                            affectedNodesApexes.push(newNode);
                    }
                }
            }
            // Add or update all new HyperEdges by feeding in all
            // annotation spans for each declaration span.
            // This needs to happen in a second pass because
            // all new nodes need to be created and positioned
            // in the graph before new "HyperEdge spans" can be added,
            // because doing this causes resolution to occur.
            for (const node of affectedNodes.values())
                for (const declaration of node.declarations) {
                    if (declaration instanceof Truth.Span) {
                        for (const annotation of declaration.statement.annotations)
                            node.addEdgeFragment(annotation);
                    }
                    else {
                        const nfx = declaration.containingInfix;
                        for (const boundary of nfx.rhs) {
                            node.addEdgeFragment(new Truth.InfixSpan(declaration.containingSpan, nfx, boundary));
                        }
                    }
                }
            // This is doing the reverse of what the above affectedNodes
            // loop is doing ... this is connecting other nodes to the affected
            // nodes, whereas the loop above is connecting affectedNodes
            // to others.
            if (affectedNodesApexes.length > 0) {
                // Stores the series of containers that any of the newly discovered
                // possibly affected nodes must have in their containment list
                // in order to be included in the "affectedNodes" array.
                const apexContainers = affectedNodesApexes
                    .map(node => node.container)
                    .filter((node) => node !== null)
                    .filter((v, i, a) => a.indexOf(v) === i);
                const checkRoot = apexContainers.length === 0;
                const isBelowAnApexContainer = (node) => node.containment.some(n => apexContainers.includes(n));
                for (const scsrNode of affectedNodesApexes) {
                    // Pattern and URI resolution doesn't occur in the
                    // Node graph, so when the node's subject isn't 
                    // a term, we don't add any edges to it.
                    if (!(scsrNode.subject instanceof Truth.Term))
                        continue;
                    const terms = this.nodeIndex.getAssociatedTerms(scsrNode);
                    for (const term of terms) {
                        const predecessors = this.nodeIndex.getNodesByTerm(term);
                        for (const predecessor of predecessors)
                            if (checkRoot || isBelowAnApexContainer(predecessor))
                                predecessor.addEdgeSuccessor(scsrNode);
                    }
                }
            }
            // If there's no active transaction the corresponds to the input
            // document, the most likely reason is that an entire document
            // is being included for the first time.
            if (txn) {
                for (const maybeDeadEdge of txn.destablizedEdges)
                    if (maybeDeadEdge.fragments.length > 0)
                        maybeDeadEdge.predecessor.disposeEdge(maybeDeadEdge);
                for (const maybeDeadNode of txn.destabilizedNodes)
                    if (maybeDeadNode.declarations.size === 0) {
                        maybeDeadNode.dispose();
                        this.nodeIndex.delete(maybeDeadNode);
                    }
            }
            // Populate nodeCache with any newly created nodes.
            for (const affectedNode of affectedNodes.values()) {
                affectedNode.sortOutbounds();
                const cachedNode = affectedNode.phrase.associatedNode;
                if (cachedNode) {
                    if (cachedNode !== affectedNode)
                        throw Truth.Exception.unknownState();
                    this.nodeIndex.update(affectedNode);
                }
                this.sanitize(affectedNode);
            }
        }
        /**
         * Performs setup for the invalidate and revalidate methods.
         */
        methodSetup(root) {
            const document = root instanceof Truth.Document ?
                root :
                root.document;
            const iterator = root instanceof Truth.Document ?
                document.eachDescendant() :
                document.eachDescendant(root, true);
            return { document, iterator };
        }
        /**
         * Reports any Node-level faults detected.
         */
        sanitize(node) {
            // Check for faulty refresh types
            // This can only happen on non-infix spans
            if (!(node.declarations.values().next().value instanceof Truth.Span))
                return;
            const smts = node.statements;
            const smtsRefresh = smts.filter(smt => smt.isRefresh);
            const smtsAnnotated = smts.filter(smt => smt.allAnnotations.length > 0);
            if (smtsRefresh.length > 0 && smtsAnnotated.length > 0)
                for (const smt of smtsRefresh)
                    this.program.faults.report(new Truth.Fault(Truth.Faults.TypeCannotBeRefreshed, smt));
        }
        /**
         * Returns the GraphTransaction associated with the specified source object.
         * A new GraphTransaction is created in the case when no match active
         * transaction is available, or when the active transaction is from a previous
         * version of the document.
         */
        getTransaction(source) {
            const doc = source.class === 0 /* document */ ?
                source :
                source.document;
            let txn = this.activeTransactions.get(doc);
            if (!txn || doc.version.newerThan(txn.version))
                this.activeTransactions.set(doc, txn = new GraphTransaction(doc.version));
            return txn;
        }
        /**
         * Serializes the Graph into a format suitable
         * for debugging and comparing against baselines.
         */
        toString() {
            return this.nodeIndex.toString();
        }
    }
    Truth.HyperGraph = HyperGraph;
    /**
     * @internal
     */
    class GraphTransaction {
        constructor(
        /**
         * Stores the version of a document to which this GraphTransaction
         * is applied. GraphTransactions are expected to operate on documents
         * within the time frame of a single version. If a document's version
         * changes, the GraphTransaction is no longer applicable.
         */
        version) {
            this.version = version;
            /**
             * Stores an array of Nodes that no longer have any
             * underlying Span objects, due to their removal in
             * the invalidation phase.
             */
            this.destabilizedNodes = [];
            /**
             * Stores an array of Fans that no longer have any
             * underlying Span objects, due to their removal in
             * the invalidation phase.
             */
            this.destablizedEdges = [];
        }
    }
    /**
     * @internal
     * Debug utility.
     */
    function serializeNodes(nodes) {
        return "\n" + nodes.map(node => node.toString(true)).join("\n");
    }
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
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
    class Node {
        constructor(container, declaration) {
            /** */
            this.container = null;
            this._contents = new Map();
            this._portabilityTargets = null;
            this._inbounds = new Set();
            this._outbounds = [];
            this._containment = null;
            const span = declaration instanceof Truth.Span ?
                declaration :
                declaration.containingSpan;
            this.document = span.statement.document;
            this.stamp = this.document.version;
            this._declarations = new Set([declaration]);
            if (this._declarations.size === 0)
                throw Truth.Exception.unknownState();
            this.subject = declaration.boundary.subject;
            this.isListIntrinsic =
                this.subject instanceof Truth.Term &&
                    this.subject.isList;
            if (container) {
                this.container = container;
                this.phrase = container.phrase.forward(this.subject);
                container._contents.set(this.subject, this);
                // This appears to need to be brought back in the case
                // when the code below is uncommented.
                /// return this;
            }
            else {
                this.phrase = this.document.phrase.forward(this.subject);
                this.addRootNode(this);
            }
            // Performance shortcut. See notes in "associatedNode".
            this.phrase.associatedNode = this;
            ///if (!(declaration instanceof Span))
            ///	return this;
            ///
            ///const term = declaration.boundary.subject;
            ///
            ///if (!(term instanceof Term))
            ///	return this;
            ///
            ///const containerPattern = (() =>
            ///{
            ///	for (const decl of this.container.declarations)
            ///		if (decl.boundary.subject instanceof Pattern)
            ///			return decl.boundary.subject;
            ///})();
            ///
            ///if (!containerPattern)
            ///	return this;
            ///
            ///for (const nfx of containerPattern.getInfixes(InfixFlags.population))
            ///	for (const term of nfx.lhs.eachSubject())
            ///		if (term.fullName === term.fullName)
            ///			//return (this.containerInfix = nfx), this;
            ///			return this;
        }
        /**
         * Removes this Node, and all its contents from the graph.
         */
        dispose() {
            if (this.container === null) {
                const map = Node.rootNodes.get(this.document);
                if (map)
                    map.delete(this.subject);
            }
            else
                this.container._contents.delete(this.subject);
            for (const ib of this._inbounds)
                ib.removeSuccessor(this);
            function recurse(node) {
                if (node.phrase.associatedNode === node)
                    node.phrase.associatedNode = null;
                for (const edge of node._outbounds)
                    node.disposeEdge(edge);
                for (const containedNode of node._contents.values())
                    recurse(containedNode);
                // Manual memory management going on here.
                // Clearing out the Sets is probably unnecessary
                // because the GC would catch it anyways, but
                // these calls are here just to be safe.
                // It's still required that we clear out the inbounds
                // from the nodes to which this one is connected.
                node._declarations.clear();
                node._inbounds.clear();
            }
            recurse(this);
        }
        /**
         * Removes the specified HyperEdge from this Node's
         * set of outbounds.
         *
         * @throws In the case when the specified HyperEdge is
         * not owned by this Node.
         */
        disposeEdge(edge) {
            if (edge.predecessor !== this)
                throw Truth.Exception.invalidArgument();
            const idx = this._outbounds.indexOf(edge);
            this._outbounds.splice(idx, 1);
            for (const scsr of edge.successors)
                scsr.node._inbounds.delete(edge);
            edge.clearFragments();
        }
        /**
         * In the case when this node is a direct descendent of a
         * pattern node, and that pattern has population infixes,
         * and this node directly corresponds to one of those infixes,
         * this property gets a reference to said corresponding infix.
         */
        get containerInfix() {
            var _a;
            const flag = Truth.InfixFlags.population;
            if (((_a = this.container) === null || _a === void 0 ? void 0 : _a.subject) instanceof Truth.Pattern)
                for (const nfx of this.container.subject.getInfixes(flag))
                    if (nfx.lhs.length > 0)
                        return nfx;
            return null;
        }
        /**
         * @internal
         * Gets a text representation of this Node's subject,
         * for debugging purposes only.
         */
        get name() {
            return Truth.SubjectSerializer.forInternal(this.subject);
        }
        /**
         * Gets whether this Node has been explicitly defined as a list
         * extrinsic. It is worth noting that this property in and of itself is
         * not sufficient to determine whether any corresponding type is
         * actually a list (full type analysis is required to make this conclusion).
         */
        get isListExtrinsic() {
            for (const ob of this.outbounds)
                for (const source of ob.fragments)
                    if (source.boundary.subject instanceof Truth.Term)
                        if (source.boundary.subject.isList)
                            return true;
            return false;
        }
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
        get intrinsicExtrinsicBridge() {
            if (this.subject instanceof Truth.Term)
                for (const adjacent of this.adjacents.values())
                    if (adjacent.subject instanceof Truth.Term)
                        if (adjacent.subject === this.subject)
                            if (adjacent.subject.isList !== this.isListIntrinsic)
                                return adjacent;
            return null;
        }
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
        get declarations() {
            return this._declarations;
        }
        /** */
        addDeclaration(span) {
            this._declarations.add(span);
        }
        /** */
        removeDeclaration(span) {
            const wasDeleted = this._declarations.delete(span);
            if (wasDeleted) {
                // Remove all of the annotations that exist on the same
                // statement as the one that contains the declaration that
                // was removed. Note that this won't mess up fragmented
                // types. For example, consider the situation when the first
                // statement is removed from the following document:
                // 
                // A, B : X, Y
                // A, C : X, Y
                // 
                // Statements are removed atomically, so when the statement
                // is removed, this will result in 2 calls to this method: one for
                // the first "A", and one for the "B". When the second call is made,
                // the associated annotations will already have been removed.
                for (let i = this._outbounds.length; i-- > 0;) {
                    const ob = this._outbounds[i];
                    for (const anno of span.statement.allAnnotations)
                        ob.removeFragment(anno);
                    if (ob.fragments.length === 0)
                        this._outbounds.splice(i, 1);
                }
            }
        }
        /**
         * Gets an array containing the statements that
         * contain this Node.
         */
        get statements() {
            return Object.freeze(Array.from(this.declarations)
                .map(decl => decl.statement)
                .filter((v, i, a) => a.indexOf(v) === i));
        }
        /**
         * Gets a readonly map of Nodes that are contained
         * by this node in the containment hierarchy.
         */
        get contents() {
            return this._contents;
        }
        /**
         * Gets a readonly name of Nodes that are adjacent
         * to this Node in the containment hierarchy.
         */
        get adjacents() {
            const adjacentNodes = this.container ?
                this.container.contents :
                this.getRootNodes();
            // Filter this node out of the result set, because
            // Nodes cannot be adjacent to themselves.
            const out = new Map();
            for (const [subject, node] of adjacentNodes)
                if (node !== this)
                    out.set(subject, node);
            return out;
        }
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
        get portabilityTargets() {
            if (this._portabilityTargets !== null)
                return this._portabilityTargets;
            if (!(this.subject instanceof Truth.Pattern))
                return this._portabilityTargets = [];
            return this._portabilityTargets = this.subject
                .getInfixes(Truth.InfixFlags.portability)
                .map(nfx => Array.from(nfx.rhs.eachSubject()));
        }
        /**
         * @returns A set of nodes that are matched by
         * patterns of adjacent nodes.
         *
         * (Note that this is possible because annotations
         * that have been applied to a pattern cannot be
         * polymorphic)
         */
        getPatternNodesMatching(nodes) {
            const outNodes = [];
            //
            // This doesn't work because we don't know if
            // a node has been marked as cruft at this point.
            // This method may return junk results in the
            // case when one of the required nodes has
            // been marked as cruft (but then, wouldn't the
            // incoming node also be cruft?)
            //
            for (const node of this.adjacents.values()) {
                if (node.subject instanceof Truth.Pattern) {
                    const unorphaned = node.outbounds
                        .filter(ob => ob.successors.length > 0)
                        .map(ob => ob.successors[0].node);
                    if (unorphaned.length === 0)
                        continue;
                    if (unorphaned.length === nodes.length)
                        if (unorphaned.every(node => nodes.includes(node)))
                            outNodes.push(...unorphaned);
                }
            }
            return outNodes;
        }
        /**
         * Gets an immutable set of HyperEdges from adjacent
         * or contained Nodes that reference this Node.
         *
         * (The ordering of inbounds isn't important, as
         * they have no physical representation in the
         * document, which is why they're stored in a Set
         * rather than an array.)
         */
        get inbounds() {
            return this._inbounds;
        }
        /**
         * Gets an array of HyperEdges that connect this Node to
         * others, being either adjacents, or Nodes that
         * exists somewhere in the containment hierarchy.
         */
        get outbounds() {
            return this._outbounds;
        }
        /**
         * @internal
         * Sorts the outbound HyperEdges, so that they're ordering
         * is consistent with the way their corresponding
         * annotations appear in the underlying document.
         */
        sortOutbounds() {
            if (this._outbounds.length === 0)
                return;
            if (this._outbounds.length === 1) {
                const edge = this._outbounds[0];
                if (edge.fragments.length === 1)
                    return;
            }
            const edgeLookup = new Map();
            for (const edge of this._outbounds) {
                for (const src of edge.fragments.values()) {
                    const smt = src.statement;
                    const lineNum = smt.document.lineNumberOf(smt);
                    const existingTuple = edgeLookup.get(edge);
                    if (existingTuple !== undefined) {
                        const existingStmt = existingTuple[0];
                        const existingStmtLineNum = existingTuple[1];
                        if (lineNum < existingStmtLineNum) {
                            existingTuple[0] = existingStmt;
                            existingTuple[1] = existingStmtLineNum;
                        }
                    }
                    else {
                        edgeLookup.set(edge, [smt, lineNum]);
                    }
                }
            }
            // Sort the output edges in the array, so that the sorting of
            // the array aligns with the appearance of the underlying
            // spans in the document.
            this._outbounds.sort((edgeA, edgeB) => {
                const tupleA = edgeLookup.get(edgeA);
                const tupleB = edgeLookup.get(edgeB);
                const obs = this._outbounds;
                if (tupleA === undefined || tupleB === undefined)
                    throw Truth.Exception.unknownState();
                const [smtA, smtIdxA] = tupleA;
                const [smtB, smtIdxB] = tupleB;
                // If the top-most span of the predecessors of
                // the edges are located in different statements,
                // a simple comparison of the statement indexes
                // is possible.
                if (smtIdxA < smtIdxB)
                    return -1;
                if (smtIdxB < smtIdxA)
                    return 1;
                // At this point, statement A and statement B 
                // are actually equal.
                if (smtA !== smtB) {
                    throw Truth.Exception.unknownState();
                }
                const annos = smtA.annotations;
                const findMinIndex = (edge) => {
                    let minIdx = Infinity;
                    for (const src of edge.fragments) {
                        if (src instanceof Truth.InfixSpan)
                            throw Truth.Exception.unknownState();
                        const idx = annos.indexOf(src);
                        if (idx < minIdx)
                            minIdx = idx;
                    }
                    if (minIdx === Infinity)
                        throw Truth.Exception.unknownState();
                    return minIdx;
                };
                const edgeAIdx = findMinIndex(edgeA);
                const edgeBIdx = findMinIndex(edgeB);
                return edgeAIdx - edgeBIdx;
            });
        }
        /**
         * @internal
         * Adds a new edge to the node, or updates an existing one with
         * a new fragment.
         *
         * If no edge exists for the new fragment, a new one is created.
         */
        addEdgeFragment(fragment) {
            const term = fragment.boundary.subject;
            if (!(term instanceof Truth.Term))
                throw Truth.Exception.unknownState();
            // If the input source is "alone", it means that it refers to
            // a statement-level annotation that has no other annotations
            // beside it (e.g. in an annotation structure looking like "D: A1, A2")
            // This is relevant, because if the source is alone, it also needs
            // to be compared against any visible total patterns.
            const sourceIsAlone = fragment instanceof Truth.Span &&
                fragment.statement.annotations.length === 1;
            /**
             * Adds an edge to it's two applicable successor nodes.
             */
            const append = (edge) => {
                this._outbounds.push(edge);
                for (const suc of edge.successors)
                    suc.node._inbounds.add(edge);
            };
            // If there is already an existing outbound HyperEdge, we can
            // add the new Span to the edge's list of Spans, and quit.
            // This works whether the edge is for a type or pattern.
            const existingEdge = this._outbounds.find(edge => {
                return edge.term.singular === term.singular;
            });
            if (existingEdge) {
                existingEdge.addFragment(fragment);
            }
            else {
                const successors = [];
                for (const level of this.enumerateContainment()) {
                    const successorNode = level.container !== null &&
                        level.container !== this &&
                        level.container.subject === term ?
                        level.container :
                        level.adjacents.get(term);
                    if (successorNode !== undefined) {
                        successors.push(new Truth.Successor(successorNode, level.longitudeDelta));
                        // There should only ever be a single successor in the case when
                        // the node is a pattern node, because the annotations (which
                        // are eventually become bases) of these nodes do not have
                        // polymorphic behavior.
                        if (this.subject instanceof Truth.Pattern)
                            break;
                    }
                }
                append(new Truth.HyperEdge(this, fragment, successors));
            }
            // 
            // Refresh the sums before quitting.
            // 
            ///const sumEdgeForInputSpanIdx = this._outbounds.findIndex(edge => 
            ///{
            ///	if (edge.kind === HyperEdgeKind.summation)
            ///		for (const src of edge.sources)
            ///			return src.statement === smt;
            ///	
            ///	return false;
            ///});
            ///
            ///if (sumEdgeForInputSpanIdx > -1)
            ///	this._outbounds.splice(sumEdgeForInputSpanIdx, 1);
            ///
            ///if (!sourceIsAlone)
            ///	for (const { longitudeDelta, adjacents } of this.enumerateContainment())
            ///		for (const adjacentNode of adjacents.values())
            ///			if (adjacentNode.subject instanceof Pattern)
            ///				if (adjacentNode.subject.isTotal)
            ///					if (adjacentNode.subject.test(smt.sum))
            ///						append(new HyperEdge(
            ///							this,
            ///							smt.sum,
            ///							[new Successor(
            ///								adjacentNode,
            ///								longitudeDelta)],
            ///							HyperEdgeKind.summation));
        }
        /**
         *
         */
        addEdgeSuccessor(successorNode) {
            const term = successorNode.subject;
            if (!(term instanceof Truth.Term))
                throw Truth.Exception.unknownState();
            for (const ob of this.outbounds) {
                if (ob.term !== successorNode.subject)
                    continue;
                const scsrLong = successorNode.phrase.length;
                const predLong = ob.predecessor.phrase.length;
                ob.addSuccessor(successorNode, predLong - scsrLong);
                successorNode._inbounds.add(ob);
            }
        }
        /**
         * Enumerates upwards through the containment
         * hierarchy of the Nodes present in this Node's
         * containing document, yielding the adjacents at
         * every level, and then continues through to the
         * root level adjacents of each of the document's
         * dependencies.
         */
        *enumerateContainment() {
            let currentLevel = this;
            let longitudeCount = 0;
            do {
                yield {
                    sourceDocument: this.document,
                    container: currentLevel,
                    adjacents: currentLevel.adjacents,
                    longitudeDelta: longitudeCount++
                };
            } while ((currentLevel = currentLevel.container) !== null);
            for (const doc of this.document.traverseDependencies()) {
                yield {
                    sourceDocument: doc,
                    container: null,
                    adjacents: this.getRootNodes(doc),
                    longitudeDelta: longitudeCount
                };
            }
        }
        /**
         * @returns An array that stores the containment hierarchy
         * of the Nodes present in this Node's containing document,
         * yielding each containerof this Node.
         */
        get containment() {
            if (this._containment !== null)
                return this._containment;
            const nodes = [];
            let currentLevel = this;
            while ((currentLevel = currentLevel.container) !== null)
                nodes.push(currentLevel);
            return this._containment = Object.freeze(nodes);
        }
        /** */
        removeEdgeSource(src) {
            for (let i = this._outbounds.length; --i > 0;)
                this._outbounds[i].removeFragment(src);
        }
        /** */
        addRootNode(node) {
            const existingSet = Node.rootNodes.get(node.document);
            if (existingSet) {
                existingSet.set(node.subject, node);
            }
            else {
                const map = new Map();
                map.set(node.subject, node);
                Node.rootNodes.set(node.document, map);
            }
        }
        /** */
        removeRootNode(node) {
            const existingSet = Node.rootNodes.get(node.document);
            if (existingSet) {
                existingSet.delete(node.subject);
                // This is somewhat redundant as the set
                // is likely going to be GC'd away anyway in
                // this case. It's here for completeness sake.
                if (existingSet.size === 0)
                    Node.rootNodes.delete(node.document);
            }
        }
        /** */
        getRootNodes(fromDocument) {
            const fromDoc = fromDocument || this.document;
            const out = Node.rootNodes.get(fromDoc) || new Map();
            return Truth.HigherOrder.copy(out);
        }
        /** */
        toString(includePath = true) {
            const decls = Array.from(this.declarations);
            const spans = decls.filter((s) => s instanceof Truth.Span);
            const anchors = decls.filter((a) => a instanceof Truth.InfixSpan);
            const spansText = spans.map(s => Truth.SubjectSerializer.forInternal(s)).join(", ");
            const anchorText = anchors.map(a => Truth.SubjectSerializer.forInternal(a)).join(", ");
            const ob = this.outbounds.length;
            const ib = this.inbounds.size;
            const path = includePath ? this.phrase.toString() + " " : "";
            const simple = [
                path,
                spansText.length ? "spans=" + spansText : "",
                anchorText.length ? "anchor=" + anchorText : "",
                "out=" + ob,
                "in=" + ib
            ].filter(s => s.trim()).join(", ");
            const fmt = (str) => str.split("\n").map(s => "\t\t" + s).join("\n");
            const obsVerbose = this.outbounds
                .map(ob => fmt(ob.toString()));
            const ibsVerbose = Array.from(this.inbounds.values())
                .map(ib => fmt(ib.toString()));
            const verbose = "\n\tOuts:\n" + obsVerbose.join("\n\n") +
                "\n\tIns:\n" + ibsVerbose.join("\n\n");
            return simple + verbose;
        }
    }
    /** */
    Node.rootNodes = new WeakMap();
    Truth.Node = Node;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     *
     */
    class NodeIndex {
        constructor() {
            /**
             * Stores a map which is indexed by a unique term, and which as
             * values that are the nodes that use that term, either as a declaration
             * or an annotation.
             *
             * The purpose of this cache is to get a quick answer to the question:
             * "We added a new term at position X ... what nodes might possibly
             * have been affected by this?"
             */
            this.termToNodesMap = new Map();
            /**
             * Stores a map which is essentially a reverse of termToNodesMap.
             * This is so that when nodes need to be deleted or updated, we can
             * quickly find the place in termToNodesMap where the node has
             * been referenced.
             */
            this.nodesToTermsMap = new WeakMap();
        }
        /**
         * Updates the index by refreshing in the set of terms
         * that are associated with the specified node.
         */
        update(node) {
            const pastTerms = this.nodesToTermsMap.get(node);
            const presentTerms = this.getAssociatedTerms(node);
            if (pastTerms !== undefined) {
                for (const [idx, term] of pastTerms.entries()) {
                    if (presentTerms.includes(term))
                        continue;
                    pastTerms.splice(idx, 1);
                    const map = this.termToNodesMap.get(term);
                    if (map === undefined)
                        continue;
                    map.delete(node);
                    if (map.size === 0)
                        this.termToNodesMap.delete(term);
                }
            }
            for (const term of presentTerms) {
                const nodesForTerm = this.termToNodesMap.get(term) || (() => {
                    const out = new Set();
                    this.termToNodesMap.set(term, out);
                    return out;
                })();
                nodesForTerm.add(node);
            }
            this.nodesToTermsMap.set(node, presentTerms);
        }
        /**
         * @returns An array that contains the nodes that are associated
         * with the specified term that exist at or below the specified
         * depth. "Associated" means that the term is either equivalent
         * to the Node's main subject, or it is referenced in one of it's edges.
         */
        getNodesByTerm(term) {
            const out = this.termToNodesMap.get(term);
            return out ? Array.from(out) : [];
        }
        /**
         * Removes the specified node from the index, if it exists.
         */
        delete(deadNode) {
            const existingTerms = this.nodesToTermsMap.get(deadNode);
            if (existingTerms === undefined)
                return;
            for (const term of existingTerms) {
                const nodes = this.termToNodesMap.get(term);
                if (nodes === undefined)
                    continue;
                nodes.delete(deadNode);
                if (nodes.size === 0)
                    this.termToNodesMap.delete(term);
            }
            this.nodesToTermsMap.delete(deadNode);
        }
        /**
         * @returns An array that contains the terms associated with
         * the specified Node.
         */
        getAssociatedTerms(node) {
            const terms = [];
            if (node.subject instanceof Truth.Term)
                terms.push(node.subject);
            for (const smt of node.statements)
                for (const anno of smt.allAnnotations)
                    if (anno.boundary.subject instanceof Truth.Term)
                        terms.push(anno.boundary.subject);
            return terms;
        }
        /**
         * Serializes the index into a format suitable
         * for debugging and comparing against baselines.
         */
        toString() {
            const out = ["(Term Cache)"];
            for (const [term, nodes] of this.termToNodesMap) {
                out.push("\t" + term);
                out.push("\t\t: " + Array.from(nodes)
                    .map(node => node.phrase.toString())
                    .join(", "));
            }
            return out.join("\n").trim();
        }
    }
    Truth.NodeIndex = NodeIndex;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     * A HyperEdge connects an origin predecessor Node to a series of
     * successor Nodes. From graph theory, a "hyper edge" is different
     * from an "edge" in that it can have many successors:
     * https://en.wikipedia.org/wiki/Hypergraph
     */
    class HyperEdge {
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
        predecessor, source, successors) {
            this.predecessor = predecessor;
            if (!(source.boundary.subject instanceof Truth.Term))
                throw Truth.Exception.unknownState();
            const successorNodes = successors
                .map(scsr => scsr.node)
                .filter((v, i, a) => a.indexOf(v) === i);
            if (successorNodes.length !== successors.length)
                throw Truth.Exception.unknownState();
            this.term = source.boundary.subject;
            this._fragments = [source];
            this._successors = successors.slice();
        }
        /**
         * Attempts to add another fragment to the HyperEdge.
         * Reports a fault instead in the case when there is a
         * list conflict between the source provided and the
         * existing sources. (I.e. one of the sources is defined
         * as a list, and another is not).
         */
        addFragment(fragment) {
            ///const isPattern = this.predecessor.subject instanceof Pattern;
            ///const isInfix = source instanceof InfixSpan;
            ///if (isPattern !== isInfix)
            ///	throw Exception.invalidCall();
            if (this._fragments.includes(fragment))
                return;
            //! The ordering of the sources is not being handled here.
            this._fragments.push(fragment);
        }
        /**
         * Removes the specified annotation-side Span or InfixSpan
         * from this edge.
         */
        removeFragment(fragment) {
            const fragPos = this._fragments.indexOf(fragment);
            if (fragPos >= 0)
                this._fragments.splice(fragPos, 1);
        }
        /** */
        clearFragments() {
            this._fragments.length = 0;
        }
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
        get fragments() {
            return this._fragments;
        }
        /**
         *
         */
        addSuccessor(node, longitude) {
            if (!this._successors.find(scsr => scsr.node === node))
                this._successors.push(new Successor(node, longitude));
        }
        /**
         *
         */
        removeSuccessor(node) {
            for (let i = this._successors.length; i-- > 0;)
                if (this._successors[i].node === node)
                    this._successors.splice(i, 1);
        }
        /**
         * Stores all possible success Nodes to which the predecessor
         * Node is preemptively connected via this HyperEdge. The
         * connection is said to be preemptive, because the connection
         * might be ignored during polymorphic name resolution.
         */
        get successors() {
            return this._successors;
        }
        /**
         * Gets whether this HyperEdge has no immediately resolvable
         * successors. This means that the subject being referred to by
         * this HyperEdge is either a type alias which will be matched by
         * a pattern, or just a plain old fault.
         */
        get isDangling() {
            return this.successors.length === 0;
        }
        /**
         * Gets a value that indicates whether the sources of the edge
         * causes incrementation of the list dimensionality of the type
         * that corresponnds to this HyperEdge's predecessor Node.
         *
         * (Note that all sources need to agree on this value, and the
         * necessary faults are generated to ensure that this is always
         * the case.)
         */
        get isList() {
            for (const source of this.fragments) {
                const sub = source.boundary.subject;
                return sub instanceof Truth.Term && sub.isList;
            }
            return false;
        }
        /**
         * Gets a value that indicates the specific part of the
         * predecessor where this HyperEdge begins.
         */
        get predecessorOrigin() {
            //! Is this still necessary?
            if (this._fragments.length === 0)
                throw Truth.Exception.unknownState();
            const src = this._fragments[0];
            if (src instanceof Truth.Span)
                return HyperEdgeOrigin.statement;
            if (src.containingInfix.isPortability)
                return HyperEdgeOrigin.portabilityInfix;
            if (src.containingInfix.isPopulation)
                return HyperEdgeOrigin.populationInfix;
            if (src.containingInfix.isPattern)
                return HyperEdgeOrigin.patternInfix;
            throw Truth.Exception.unknownState();
        }
        /**
         * @returns A string representation of this HyperEdge,
         * suitable for debugging and testing purposes.
         */
        toString() {
            const print = (sub) => Truth.SubjectSerializer.forInternal(sub);
            return [
                "Value=" + this.term,
                "Predecessors=" + print(this.predecessor.subject),
                "Successors=" + this.successors
                    .map(n => print(n.node.subject) + " << " + n.longitude)
                    .join(", "),
                "Sources=" + Array.from(this.fragments)
                    .map(src => src.boundary.subject).join(", "),
                "---"
            ].join("\n");
        }
    }
    Truth.HyperEdge = HyperEdge;
    /**
     * @internal
     */
    class Successor {
        constructor(node, 
        /**
         * The the number of levels of depth in the containment
         * hierarchy that need to be crossed in order for the containing
         * HyperEdge to be established between the predecessor and
         * this successor.
         */
        longitude) {
            this.node = node;
            this.longitude = longitude;
            this.stamp = Truth.VersionStamp.next();
        }
    }
    Truth.Successor = Successor;
    /**
     * @internal
     * Indicates the place in a statement where a HyperEdge starts.
     * (HyperEdges can start either at the statement level, or within
     * various kinds of infixes.)
     */
    let HyperEdgeOrigin;
    (function (HyperEdgeOrigin) {
        HyperEdgeOrigin[HyperEdgeOrigin["statement"] = 0] = "statement";
        HyperEdgeOrigin[HyperEdgeOrigin["populationInfix"] = 1] = "populationInfix";
        HyperEdgeOrigin[HyperEdgeOrigin["portabilityInfix"] = 2] = "portabilityInfix";
        HyperEdgeOrigin[HyperEdgeOrigin["patternInfix"] = 3] = "patternInfix";
    })(HyperEdgeOrigin = Truth.HyperEdgeOrigin || (Truth.HyperEdgeOrigin = {}));
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * A class that marks out the location of an infix term within
     * it's containing Infix, it's containing Span, and then it's containing
     * Statement, Document, and Program.
     */
    class InfixSpan {
        constructor(containingSpan, containingInfix, boundary) {
            this.containingSpan = containingSpan;
            this.containingInfix = containingInfix;
            this.boundary = boundary;
        }
        /**
         * Gets the Statement that contains this Anchor.
         */
        get statement() {
            return this.containingSpan.statement;
        }
        /**
         * Gets a boolean value that indicates whether this InfixSpan
         * is considered object-level cruft, and should therefore be
         * ignored during type analysis.
         */
        get isCruft() {
            return this.containingSpan.statement.cruftObjects.has(this);
        }
    }
    Truth.InfixSpan = InfixSpan;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     * A worker class that handles the construction of networks
     * of Parallel instances, which are eventually transformed
     * into type objects.
     */
    class ConstructionWorker {
        /** */
        constructor(program) {
            this.program = program;
            /** */
            this.excavated = new WeakSet();
            /** A call queue used to prevent circular drilling. */
            this.drillQueue = [];
            /**
             * Used for safety purposes to catch unexpected behavior.
             */
            this.handledHyperEdges = new WeakSet();
            /** */
            this.parallels = new Truth.ParallelCache();
            /**
             * Stores the set of Parallel instances that have been "raked",
             * which means that that have gone through the process of
             * having their requested bases applied.
             *
             * This set may include both pattern and non-patterns Parallels,
             * (even though their raking processes are completely different).
             */
            this.rakedParallels = new WeakSet();
            this.cruft = new Truth.CruftCache(this.program);
        }
        /**
         * Constructs the corresponding Parallel instances for
         * all explicit types that exist within the provided Document,
         * or below the provided ExplicitParallel.
         */
        excavate(from) {
            if (this.excavated.has(from))
                return;
            this.excavated.add(from);
            const queue = [];
            if (from instanceof Truth.Document) {
                for (const phrase of Truth.Phrase.rootsOf(from)) {
                    const drilledParallel = this.drillFromNode(phrase.associatedNode);
                    if (drilledParallel !== null)
                        queue.push(drilledParallel);
                }
            }
            else
                for (const currentParallel of queue) {
                    for (const node of currentParallel.node.contents.values()) {
                        const drilledParallel = this.drillFromNode(node);
                        if (drilledParallel !== null)
                            queue.push(drilledParallel);
                    }
                }
        }
        /**
         * Constructs the fewest possible Parallel instances
         * to arrive at the type specified by the directive.
         */
        drill(directive) {
            const result = this.drillFromPhrase(directive);
            this.drillQueue.length = 0;
            return result;
        }
        /** */
        drillFromPhrase(directive) {
            if (this.parallels.has(directive))
                return Truth.Not.undefined(this.parallels.get(directive));
            if (directive.length === 0)
                throw Truth.Exception.invalidArgument();
            const ancestry = directive.ancestry;
            const surfaceNode = directive.containingDocument.phrase
                .forward(ancestry[0].terminal)
                .associatedNode;
            if (surfaceNode === null)
                return null;
            let typeIdx = 0;
            let lastSeed = this.parallels.get(directive.back()) ||
                this.rake(this.parallels.create(surfaceNode, this.cruft));
            // This code skips by any Parallel instances that have already
            // been constructed. The real work begins when we get to
            // the first point in the Phrase where there is no constructed
            // Parallel instance.
            for (const phrase of ancestry) {
                if (!this.parallels.has(phrase))
                    break;
                lastSeed = Truth.Not.undefined(this.parallels.get(phrase));
                if (++typeIdx >= directive.length)
                    return lastSeed;
            }
            do {
                const targetSubject = ancestry[typeIdx].terminal;
                const descended = this.descend(lastSeed, targetSubject);
                if (descended === null)
                    return null;
                lastSeed = this.rake(descended);
            } while (++typeIdx < directive.length);
            return lastSeed;
        }
        /**
         * An entrypoint into the drill function that operates
         * on a Node instead of a Phrase. Essentially, this method
         * calls "drillFromPhrase()" safely (meaning that it detects
         * circular invokations, and returns null in these cases).
         */
        drillFromNode(node) {
            // Circular drilling is only a problem if we're
            // drilling on the same level.
            const dq = this.drillQueue;
            if (dq.length === 0) {
                dq.push(node);
            }
            else if (dq[0].container === node.container) {
                if (dq.includes(node))
                    return null;
            }
            else {
                dq.length = 0;
                dq.push(node);
            }
            const drillResult = this.drillFromPhrase(node.phrase);
            if (drillResult === null)
                throw Truth.Exception.unknownState();
            if (!(drillResult instanceof Truth.ExplicitParallel))
                throw Truth.Exception.unknownState();
            return drillResult;
        }
        /**
         * "Raking" a Parallel is the process of deeply traversing it's
         * Parallel Graph (depth first), and for each visited Parallel,
         * deeply traversing it's Base Graph as well (also depth first).
         * Through this double-traversal process, the Parallel's edges
         * are constructed into a traversable graph.
         */
        rake(seed) {
            // If the seed's container is null, this means that the seed
            // is root-level, and so it cannot have any Parallel types.
            // It may however have Base types, and these need to be
            // handled.
            if (seed.container === null) {
                if (!(seed instanceof Truth.ExplicitParallel))
                    throw Truth.Exception.unknownState();
                this.rakeExplicitParallel(seed);
            }
            else
                this.rakeParallelGraph(seed);
            return seed;
        }
        /**
         * Recursive function that digs through the parallel graph,
         * and rakes all ExplicitParallels that are discovered.
         */
        rakeParallelGraph(par) {
            for (const edgePar of par.getParallels())
                this.rakeParallelGraph(edgePar);
            if (par instanceof Truth.ExplicitParallel)
                this.rakeExplicitParallel(par);
        }
        /**
         * Splitter method that rakes both a pattern and a non-pattern
         * containing ExplicitParallel.
         */
        rakeExplicitParallel(par) {
            if (this.rakedParallels.has(par))
                return par;
            this.rakedParallels.add(par);
            if (par.pattern)
                this.rakePatternBases(par);
            else
                this.rakeBaseGraph(par);
        }
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
        rakeBaseGraph(srcParallel) {
            if (srcParallel.pattern)
                throw Truth.Exception.unknownState();
            for (const hyperEdge of srcParallel.node.outbounds) {
                if (this.cruft.has(hyperEdge))
                    continue;
                const possibilities = hyperEdge.successors
                    .filter(scsr => !this.cruft.has(scsr.node))
                    .sort((a, b) => a.longitude - b.longitude);
                if (possibilities.length > 0) {
                    // This is where the polymorphic name resolution algorithm
                    // takes place. The algorithm operates by working it's way
                    // up the list of nodes (aka the scope chain), looking for
                    // a possible resolution target where the act of applying the
                    // associated Parallel as a base, causes at least one of the 
                    // conditions on the contract to be satisfied. Or, in the case
                    // when there are no conditions on the contract, the node
                    // that is the closest ancestor is used.
                    for (const possibleScsr of possibilities) {
                        const possibleNode = possibleScsr.node;
                        const baseParallel = this.drillFromNode(possibleNode);
                        // baseParallel will be null in the case when a circular
                        // relationship has been detected (and quitting is
                        // required here in order to avoid a stack overflow).
                        if (baseParallel === null)
                            continue;
                        this.rakeExplicitParallel(baseParallel);
                        // There are cases when an entire parallel needs to be
                        // "excavated", meaning that the Parallel's entire subtree
                        // of contents needs to be analyzed and converted into
                        // parallels. This is necessary because a fully defined set
                        // of parallels is required in order to detect discrepant
                        // unions (and therefore, report the attempt at a type
                        // union as faulty).
                        if (srcParallel.baseCount > 0) {
                            if (srcParallel.baseCount === 1)
                                this.excavate(srcParallel.firstBase);
                            this.excavate(baseParallel);
                        }
                        if (!srcParallel.tryAddLiteralBase(baseParallel, hyperEdge))
                            continue;
                        if (this.handledHyperEdges.has(hyperEdge))
                            throw Truth.Exception.unknownState();
                        this.handledHyperEdges.add(hyperEdge);
                        continue;
                    }
                }
                else {
                    // At this point, we've discovered an annotation that we're
                    // going to try to resolve as an alias. If this doesn't work,
                    // the edge will be marked as cruft. Possibly a future version
                    // of this compiler will allow other agents to hook into this
                    // process and augment the resolution strategy.
                    const candidatePatternPars = [];
                    for (const { patternParallel } of this.ascend(srcParallel)) {
                        this.rakePatternBases(patternParallel);
                        candidatePatternPars.push(patternParallel);
                    }
                    if (candidatePatternPars.length > 0) {
                        const terms = hyperEdge.fragments
                            .map(src => src.boundary.subject)
                            .filter((v) => v instanceof Truth.Term);
                        if (terms.length === 0)
                            continue;
                        const alias = terms[0].textContent;
                        if (srcParallel.tryAddAliasedBase(candidatePatternPars, hyperEdge, alias)) {
                            this.handledHyperEdges.add(hyperEdge);
                            continue;
                        }
                    }
                    if (!this.handledHyperEdges.has(hyperEdge))
                        this.cruft.add(hyperEdge, Truth.Faults.UnresolvedAnnotation);
                }
            }
            if (!srcParallel.isContractSatisfied)
                for (const smt of srcParallel.node.statements)
                    this.program.faults.report(new Truth.Fault(Truth.Faults.ContractViolation, smt));
            return srcParallel;
        }
        /**
         * Finds the set of bases that should be applied to the provided
         * pattern-containing ExplicitParallel instance, and attempts
         * to have them applied.
         */
        rakePatternBases(patternParallel) {
            if (!patternParallel.pattern)
                throw Truth.Exception.unknownState();
            const bases = new Map();
            const obs = patternParallel.node.outbounds;
            const nameOf = (edge) => Truth.SubjectSerializer.forInternal(edge.fragments[0]);
            for (let i = -1; ++i < obs.length;) {
                const hyperEdge = obs[i];
                if (this.cruft.has(hyperEdge))
                    continue;
                const len = hyperEdge.successors.length;
                // Because resolving pattern bases has non-polymorphic behavior, 
                // we can get away with checking for these faults here without going
                // through the whole drilling process.
                if (len === 0) {
                    this.cruft.add(hyperEdge, Truth.Faults.UnresolvedAnnotation);
                    continue;
                }
                if (obs.findIndex(e => nameOf(e) === nameOf(hyperEdge)) !== i) {
                    this.cruft.add(hyperEdge, Truth.Faults.IgnoredAnnotation);
                    continue;
                }
                if (len > 1)
                    throw Truth.Exception.unknownState();
                const baseNode = hyperEdge.successors[0].node;
                const baseParallel = this.drillFromNode(baseNode);
                if (baseParallel !== null)
                    bases.set(baseParallel, hyperEdge);
            }
            // Circular bases still need to be checked. It's unclear how and
            // where to actually do this, while factoring in the constraint
            // that these can be caused through the use of aliases.
            // Anything that is a list (with any dimensionality) needs to be
            // cut off, because these bases can't be applied to patterns.
            for (const [base, via] of bases)
                if (base.getListDimensionality() > 0)
                    this.cruft.add(via, Truth.Faults.PatternMatchingList);
            // Now we need to determine if any of these bases are redundant.
            // This is done by checking to see if any of the bases are specified
            // somewhere in the base graph of all others.
            for (const [baseA] of bases)
                for (const [baseB, via] of bases)
                    if (baseA !== baseB)
                        if (baseA.hasBase(baseB))
                            this.cruft.add(via, Truth.Faults.IgnoredAnnotation);
            const pattern = patternParallel.node.subject;
            const span = patternParallel.node.declarations.values().next().value;
            const portInfixes = pattern.getInfixes(Truth.InfixFlags.portability);
            if (portInfixes.length > 0) {
                const validPortabilityInfixes = [];
                for (const portInfix of portInfixes) {
                    const nfxAnnosIter = span.eachAnnotationForInfix(portInfix);
                    const nfxAnnos = Array.from(nfxAnnosIter);
                    if (nfxAnnos.length === 0)
                        throw Truth.Exception.unknownState();
                    // At this time, we're currently generating a fault in the case when
                    // a portability infix has multiple definitions. Although the parser
                    // and the Graph-level infrastructure supports this, more study is
                    // required in order to determine if this is a characteristic of Truth.
                    if (nfxAnnos.length > 1) {
                        for (const nfx of nfxAnnos.slice(1))
                            this.cruft.add(nfx, Truth.Faults.PortabilityInfixHasUnion);
                    }
                    else
                        validPortabilityInfixes.push(portInfix);
                }
                // This code checks for overlapping types. The algorithm used here is
                // similar to the redundant bases check used above. However, in the case
                // of infixes, these aren't just redundant, they would be problematic if
                // left in. To explain why, try to figure out how a String type would draw
                // it's data out of an alias matching the following pattern:
                // 	/< : Email>< : String> : Type
                // (hint: it doesn't work)
                //! Not implemented
            }
            // TODO: Check for use of lists within any kind of infix.
            // It's possible for no collected bases to be returned
            // in the case when there were actually annotations
            // specified within the file, but they were all found to
            // be cruft.
            if (bases.size === 0)
                return;
            patternParallel.tryApplyPatternBases(bases);
        }
        /**
         * A generator function that works its way upwards, starting at the
         * provided ExplicitParallel. The function yields the series of
         * Parallels that contain Patterns that are visible to the provided
         * srcParallel. The bases of these parallels have not necessarily
         * been applied.
         *
         * The ordering of the Parallels yielded is relevant. The instances
         * that were yielded closer to the beginning take prescedence over
         * the ones yielded at the end.
         */
        *ascend(srcParallel) {
            const discoveredPatternNodes = new Set();
            const yieldable = (patternNode) => {
                discoveredPatternNodes.add(patternNode);
                return Truth.Not.null(this.parallels.get(patternNode) ||
                    this.parallels.create(patternNode, this.cruft));
            };
            function* recurse(current) {
                for (const { base } of current.eachBase())
                    yield* recurse(base);
                if (current instanceof Truth.ExplicitParallel)
                    for (const node of current.node.contents.values())
                        if (node.subject instanceof Truth.Pattern)
                            if (!discoveredPatternNodes.has(node))
                                yield {
                                    pattern: node.subject,
                                    patternParallel: yieldable(node)
                                };
            }
            // The process starts at the container of the current parallel,
            // even though this function needs to yield other parallels that
            // are adjacent to srcParallel, because we reach back into the
            // adjacents from the container.
            for (let current = srcParallel.container; current instanceof Truth.ExplicitParallel;) {
                yield* recurse(current);
                current = current.container;
            }
            for (const phrase of Truth.Phrase.rootsOf(srcParallel.node.document))
                if (phrase.terminal instanceof Truth.Pattern)
                    if (!discoveredPatternNodes.has(phrase.associatedNode))
                        yield {
                            pattern: phrase.terminal,
                            patternParallel: yieldable(phrase.associatedNode)
                        };
        }
        /**
         * Constructs and returns a new seed Parallel from the specified
         * zenith Parallel, navigating downwards to the specified target subject.
         */
        descend(zenith, targetSubject) {
            /**
             * @returns A new Parallel (either being a ExplicitParallel
             * or an ImplicitParallel instance), that corresponds to
             * the specified zenith parallel.
             */
            const descendOne = (zenith) => {
                if (zenith instanceof Truth.ExplicitParallel) {
                    const nextNode = zenith.node.contents.get(targetSubject);
                    if (nextNode) {
                        const out = this.parallels.get(nextNode) ||
                            this.parallels.create(nextNode, this.cruft);
                        this.verifyDescend(zenith, out);
                        return out;
                    }
                }
                const nextPhrase = zenith.phrase.forward(targetSubject);
                return (this.parallels.get(nextPhrase) ||
                    this.parallels.create(nextPhrase));
            };
            /**
             * @returns A boolean value that indicates whether the act
             * of descending from the specified Parallel to the typeName
             * passed to the containing method is going to result in a
             * ExplicitParallel instance.
             */
            function canDescendToExplicit(parallel) {
                return (parallel instanceof Truth.ExplicitParallel &&
                    parallel.node.contents.has(targetSubject));
            }
            //
            // TODO: These functions can probably be replaced with
            // a call to Misc.reduceRecursive()
            //
            function* recurseParallels(par) {
                for (const parEdge of par.getParallels())
                    yield* recurseParallels(parEdge);
                yield par;
            }
            function* recurseBases(par) {
                for (const { base } of par.eachBase())
                    yield* recurseBases(base);
                yield par;
            }
            function* recurse(par) {
                for (const parallelEdge of recurseParallels(par)) {
                    if (parallelEdge instanceof Truth.ExplicitParallel)
                        for (const baseEdge of recurseBases(parallelEdge))
                            yield baseEdge;
                    yield parallelEdge;
                }
            }
            // The following algorithm performs a recursive reduction on
            // the zenith, and produces a set of Parallels to prune from the
            // descension process. The Parallels that end up getting pruned
            // are the ones that, if unpruned, would result in a layer that
            // has ImplicitParallels that shouldn't actually exist. For
            // example, consider the following document:
            //
            // Class
            // 
            // SubClass : Class
            // 	Child
            // 
            // "Class" should not have an ImplicitParallel called "Child",
            // because that was introduced in the derived "SubClass" type.
            // And so this algorithm stakes out cut off points so that we don't
            // blindly just descend all Parallels in the layer.
            const prunedParallels = new Set();
            const pruneParallelsFollowFn = (par) => {
                const upperParallels = par.getParallels().slice();
                if (par instanceof Truth.ExplicitParallel)
                    for (const { base } of par.eachBase())
                        upperParallels.push(base);
                return upperParallels;
            };
            const hasExplicitContents = Truth.Misc.reduceRecursive(zenith, pruneParallelsFollowFn, (current, results) => {
                const prune = results.every(result => !result) &&
                    !canDescendToExplicit(current);
                if (prune)
                    prunedParallels.add(current);
                return !prune;
            });
            // In the case when the method is attempting to descend
            // to a level where there are no nodes whose name match
            // the type name specified (i.e. the whole layer would be 
            // implicit parallels), null is returned because a descend
            // wouldn't make sense.
            if (!hasExplicitContents)
                return null;
            const descendParallelsFollowFn = (par) => {
                if (!(par instanceof Truth.ExplicitParallel))
                    return [];
                const bases = Array.from(par.eachBase())
                    .map(entry => entry.base)
                    .slice();
                const result = bases
                    .concat(par.getParallels())
                    .filter(par => !prunedParallels.has(par));
                return result;
            };
            const seed = Truth.Misc.reduceRecursive(zenith, descendParallelsFollowFn, (current, nested) => {
                const nextPar = descendOne(current);
                for (const edge of nested)
                    nextPar.addParallel(edge);
                return nextPar;
            });
            return seed;
        }
        /**
         * Performs verification on the descend operation.
         * Reports any faults that can occur during this process.
         */
        verifyDescend(zenithParallel, descendParallel) {
            if (descendParallel.node.subject instanceof Truth.Anon)
                if (zenithParallel.isListIntrinsic)
                    this.program.faults.report(new Truth.Fault(Truth.Faults.AnonymousInListIntrinsic, descendParallel.node.statements[0]));
        }
    }
    Truth.ConstructionWorker = ConstructionWorker;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     *
     */
    class Parallel {
        /**
         * @internal
         * Invoked by ParallelCache. Do not call.
         */
        constructor(phrase, container) {
            this.phrase = phrase;
            this.container = container;
            /**
             * Stores a version number for this instance,
             * useful for debugging purposes.
             */
            this.version = Truth.VersionStamp.next();
            this._contents = new Map();
            this._parallels = [];
            if ("DEBUG") {
                this.name = phrase.toString();
                if (this.name.startsWith("/"))
                    this.name = unescape(this.name);
            }
            if (container !== null)
                container._contents.set(phrase.terminal, this);
        }
        /**
         *
         */
        get contents() {
            return this._contents;
        }
        /** */
        getParallels() {
            return Object.freeze(this._parallels.slice());
        }
        /** */
        get hasParallels() {
            return this._parallels.length > 0;
        }
        /** */
        addParallel(parallel) {
            if (!this._parallels.includes(parallel))
                this._parallels.push(parallel);
        }
        /**
         * Returns a string representation of this Parallel, suitable for debugging purposes.
         */
        toString() {
            return this.phrase.toString();
        }
    }
    Truth.Parallel = Parallel;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     *
     */
    class ExplicitParallel extends Truth.Parallel {
        /**
         * @internal
         * Invoked by ParallelCache. Do not call.
         */
        constructor(node, container, cruft) {
            super(node.phrase, container);
            this._contract = null;
            this._bases = new Map();
            this._intrinsicExtrinsicBridge = null;
            /**
             * Stores a string representation of the compiled regular expression
             * associated with this instance, in the case when this instance is
             * a pattern parallel.
             *
             * This string representation should have any infixes compiled away,
             * and should be passable to a JavaScript RegExp, or to the Fsm system.
             */
            this.compiledExpression = null;
            this.node = node;
            this.cruft = cruft;
            node.document.program.faults.inform(node);
        }
        /** */
        get isContractSatisfied() {
            return this.contract.unsatisfiedConditions.size === 0;
        }
        /** */
        get contract() {
            // It's important that this contract is computed lazily, because
            // if you try to compute it in the constructor, the Parallel graph
            // won't be constructed, and you'll end up with an empty contract.
            if (this._contract === null)
                this._contract = new Truth.Contract(this);
            return this._contract;
        }
        /**
         * Gets the first base contained by this instance.
         * @throws In the case when this instance contains no bases.
         */
        get firstBase() {
            for (const baseEntry of this._bases.values())
                return baseEntry.parallels[0];
            throw Truth.Exception.unknownState();
        }
        /**
         * Performs a shallow traversal on the non-cruft bases
         * defined directly on this ExplicitParallel.
         */
        *eachBase() {
            for (const [edge, baseEntry] of this._bases)
                if (!this.cruft.has(edge))
                    for (const base of baseEntry.parallels)
                        yield { base, edge, aliased: baseEntry.aliased };
        }
        /**
         *
         */
        addBaseEntry(base, edge, aliased) {
            const existing = this._bases.get(edge);
            if (existing)
                existing.parallels.push(base);
            else
                this._bases.set(edge, { parallels: [base], aliased });
        }
        /**
         * Performs a deep traversal on the non-cruft bases
         * defined on this Parallel.
         */
        *eachBaseDeep() {
            const queue = Array.from(this.eachBase()).map(e => e.base);
            for (let i = -1; ++i < queue.length;) {
                const current = queue[i];
                yield current;
                for (const { base } of current.eachBase())
                    if (!queue.includes(base))
                        queue.push(base);
            }
        }
        /**
         * @returns A boolean value that indicates whether the provided
         * ExplicitParallel instance exists somewhere, possibly nested,
         * in the base graph of this instance.
         */
        hasBase(testBase) {
            const queue = Array.from(this.eachBase()).map(e => e.base);
            for (let i = -1; ++i < queue.length;) {
                const current = queue[i];
                if (current === testBase)
                    return true;
                for (const { base } of current.eachBase())
                    if (!queue.includes(base))
                        queue.push(base);
            }
            return false;
        }
        /**
         * Attempts to add the provided ExplicitParallel as a base of
         * this instance. If the addition of the new base would not generate
         * any critical faults, it is added. Otherwise, it's marked as cruft.
         *
         * @returns A boolean value that indicates whether the base
         * was added successfully.
         */
        tryAddLiteralBase(base, via) {
            if (this._bases.has(via))
                throw Truth.Exception.unknownState();
            // Just as a reminder -- pattern-containing parallels 
            // don't come into this method. Bases are applied to
            // patterns in tryApplyPatternBases.
            if (this.pattern)
                throw Truth.Exception.unknownState();
            const numSatisfied = this.contract.trySatisfyCondition(base);
            if (numSatisfied === 0 && this.contract.hasConditions)
                return false;
            const sanitizer = new Truth.Sanitizer(this, base, via, this.cruft);
            // In this case, we only need to do a 
            // shallow check for circular inheritance.
            if (sanitizer.detectCircularReferences())
                return false;
            if (sanitizer.detectListFragmentConflicts())
                return false;
            if (this.baseCount > 0)
                if (sanitizer.detectListDimensionalityConflict())
                    return false;
            this.addBaseEntry(base, via, false);
            return true;
        }
        /**
         * Attempts to indirectly apply a base to this ExplicitParallel via an alias
         * and edge.
         *
         * @param patternParallelCandidates The pattern-containing
         * ExplicitParallel instance whose bases should be applied to this
         * ExplicitParallel, if the provided alias is a match.
         *
         * @param viaEdge The HyperEdge in which the alias was found.
         *
         * @param viaAlias The string to test against the parallel embedded
         * within patternParallelCandidates.
         *
         * @returns A boolean value that indicates whether a base was added
         * successfully.
         */
        tryAddAliasedBase(patternParallelCandidates, viaEdge, viaAlias) {
            if (this._bases.has(viaEdge))
                throw Truth.Exception.unknownState();
            const chosenParallels = patternParallelCandidates.slice();
            const conditions = this.contract.unsatisfiedConditions;
            const beganWithConditions = conditions.size > 0;
            if (beganWithConditions) {
                let maxMatchCount = 1;
                nextCandidate: for (const candidate of patternParallelCandidates) {
                    const entries = Array.from(candidate._bases.values());
                    const candidateBases = entries
                        .map(e => e.parallels)
                        .reduce((a, b) => a.concat(b), []);
                    if (candidateBases.length < maxMatchCount)
                        continue;
                    for (const candidateBase of candidateBases)
                        if (!conditions.has(candidateBase))
                            continue nextCandidate;
                    chosenParallels.push(candidate);
                    maxMatchCount = candidateBases.length;
                }
                if (chosenParallels.length === 0)
                    return false;
            }
            let wasAdded = false;
            for (const chosenParallel of chosenParallels) {
                // Just as a reminder -- pattern-containing parallels don't come
                // into this method ... only the aliases that might match them.
                if (this.pattern || !chosenParallel.pattern)
                    throw Truth.Exception.unknownState();
                // If the targetPattern has no infixes, we can get away with a simple
                // check to see if the alias matches the regular expression.
                if (!chosenParallel.pattern.hasInfixes()) {
                    if (!chosenParallel.pattern.test(viaAlias))
                        continue;
                    if (beganWithConditions)
                        if (this.contract.trySatisfyCondition(chosenParallel) === 0)
                            continue;
                    this.addBaseEntry(chosenParallel, viaEdge, true);
                    wasAdded = true;
                }
            }
            // Not implemented, but we shouldn't throw an exception here yet.
            return wasAdded;
        }
        /**
         * Attempts to apply a set of bases to a pattern-containing parallel.
         *
         * @example
         * /pattern : This, Function, Adds, These
         */
        tryApplyPatternBases(baseTable) {
            const bases = Array.from(baseTable.keys());
            // Non-Pattern nodes should never come to this method.
            if (!this.pattern)
                throw Truth.Exception.unknownState();
            const basesDeep = bases
                .map(b => Array.from(b.eachBaseDeep()))
                .reduce((a, b) => a.concat(b), [])
                .filter((v, i, a) => a.indexOf(v) === i);
            // Reminder: the ExplicitParallels in the basesDeep array
            // are expected to be fully processed by the time we get to
            // this method. It should be safe to touch them.
            if (basesDeep.length > 0) {
                const basesNodes = bases.map(b => b.node);
                // Finds all pattern nodes that have an edge that points
                // to at least one of the bases in the basesDeep array.
                const basesDeepSprawl = basesDeep
                    .map(b => Array.from(b.node.inbounds))
                    .reduce((a, b) => a.concat(b), [])
                    .map(inb => inb.predecessor)
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .filter(node => node.subject instanceof Truth.Pattern)
                    .filter(node => node.outbounds
                    .filter(ob => ob.successors.length === 0)
                    .map(ob => ob.successors[0].node)
                    .every(node => basesNodes.includes(node)));
                const basesDeepSprawlPatterns = basesDeepSprawl
                    .map(n => n.subject)
                    .filter((s) => s instanceof Truth.Pattern);
                /**
                 * At this point, we need to test every single one of the
                 * patterns in basesDeepSprawlPatterns against this
                 * this.node.subject to make sure the two patterns are
                 * compliant.
                 *
                 * If they're not compliant, we need to start marking
                 * bases as cruft until they are.
                 *
                 * There is also a recursive infix embed process that
                 * needs to happen here, but maybe we should just
                 * put this off until the basic pattern functionality
                 * is working?
                 */
            }
            /**
             * This also needs to take into account any other patterns
             * that are applied to any of the bases defined directly
             * inline.
             */
            // Here we're just adding all the bases regardless of whether
            // or not any of the associated edges were marked as cruft.
            // The other enumerators skip over cruft edges, so this likely
            // isn't a problem, and it keeps it consistent with the way the
            // rest of the system works.
            for (const [base, via] of baseTable)
                this.addBaseEntry(base, via, false);
        }
        /**
         * Gets the number of bases that have
         * been explicitly applied to this Parallel.
         */
        get baseCount() {
            return this._bases.size;
        }
        /** */
        get isListIntrinsic() {
            return this.node.isListIntrinsic;
        }
        /** */
        get intrinsicExtrinsicBridge() {
            return this._intrinsicExtrinsicBridge;
        }
        /**
         * Establishes a bridge between this ExplicitParallel and the
         * one provided.
         */
        createIntrinsicExtrinsicBridge(parallel) {
            if (this._intrinsicExtrinsicBridge !== null)
                throw Truth.Exception.unknownState();
            if (parallel._intrinsicExtrinsicBridge !== null)
                throw Truth.Exception.unknownState();
            if (parallel.node.isListIntrinsic === this.node.isListIntrinsic)
                throw Truth.Exception.unknownState();
            this._intrinsicExtrinsicBridge = parallel;
            parallel._intrinsicExtrinsicBridge = this;
        }
        /** */
        getListDimensionality() {
            // NOTE: This actually needs to be "each base inferred"
            // This is purposely only returning the dimensionality of
            // the first base. There is a guarantee that all dimensionalities
            // will be the same here.
            for (const { base, edge } of this.eachBase()) {
                const initialDim = base.getListDimensionality();
                return edge.isList ? initialDim + 1 : initialDim;
            }
            return 0;
        }
        /**
         *
         */
        comparePatternTo(other) {
        }
        /**
         *
         */
        maybeCompilePattern() {
            ///if (!this.pattern)
            ///	return;
            ///if (!pattern.hasInfixes())
            ///	this.compiledExpression = pattern.
        }
        /**
         * Gets the Pattern instance that resides inside this ExplicitParallel,
         * or null in the case when this ExplicitParallel does not have an
         * inner Pattern.
         */
        get pattern() {
            return this.node.subject instanceof Truth.Pattern ?
                this.node.subject :
                null;
        }
    }
    Truth.ExplicitParallel = ExplicitParallel;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     *
     */
    class ImplicitParallel extends Truth.Parallel {
        /**
         * @internal
         * Invoked by ParallelCache. Do not call.
         */
        constructor(phrase, container) {
            super(phrase, container);
        }
    }
    Truth.ImplicitParallel = ImplicitParallel;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * A simple class for handling objects marked as cruft.
     */
    class CruftCache {
        /** */
        constructor(program) {
            this.program = program;
            /** Stores a set of objects that have been marked as cruft. */
            this.cruft = new Set();
        }
        /**
         * Adds a fault of the specified type to the internal set,
         * marks all relevant objects as cruft, and reports the
         * relevant fault type.
         */
        add(cruft, relevantFaultType) {
            const faultSources = cruft instanceof Truth.Node ? cruft.statements :
                cruft instanceof Truth.HyperEdge ? cruft.fragments :
                    [cruft];
            for (const faultSrc of faultSources) {
                const fault = new Truth.Fault(relevantFaultType, faultSrc);
                this.program.faults.report(fault);
                this.cruft.add(faultSrc);
            }
            this.cruft.add(cruft);
        }
        /**
         * @returns A boolean value that indicates whether the
         * specified object has been marked as cruft.
         */
        has(source) {
            return this.cruft.has(source);
        }
    }
    Truth.CruftCache = CruftCache;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     *
     */
    class ParallelCache {
        constructor() {
            /**
             * Stores a map of all Parallel objects that have been constructed,
             * keyed by the Phrase to which they correspond.
             */
            this.parallels = new Map();
        }
        create(key, cruft) {
            if (this.has(key))
                throw Truth.Exception.unknownState();
            const save = (par) => {
                const keyVal = this.getKeyVal(key);
                this.parallels.set(keyVal, par);
                return par;
            };
            const container = (() => {
                if (key instanceof Truth.Node)
                    return key.container !== null ?
                        Truth.Not.undefined(this.get(key.container)) :
                        null;
                return key.length > 1 ?
                    Truth.Not.undefined(this.get(key.back())) :
                    null;
            })();
            if (key instanceof Truth.Phrase)
                return save(new Truth.ImplicitParallel(key, container));
            if (!(container instanceof Truth.ExplicitParallel) && container !== null)
                throw Truth.Exception.unknownState();
            if (cruft === undefined)
                throw Truth.Exception.unknownState();
            const outPar = new Truth.ExplicitParallel(key, container, cruft);
            if (key.intrinsicExtrinsicBridge === null)
                return save(outPar);
            if (this.has(key.intrinsicExtrinsicBridge))
                throw Truth.Exception.unknownState();
            const bridgePar = new Truth.ExplicitParallel(key.intrinsicExtrinsicBridge, container, cruft);
            outPar.createIntrinsicExtrinsicBridge(bridgePar);
            return save(outPar);
        }
        get(key) {
            const keyVal = this.getKeyVal(key);
            const out = this.parallels.get(keyVal);
            if (key instanceof Truth.Node)
                if (out !== undefined)
                    if (!(out instanceof Truth.ExplicitParallel))
                        throw Truth.Exception.unknownState();
            return out;
        }
        /** */
        has(key) {
            return this.parallels.has(this.getKeyVal(key));
        }
        /** */
        getKeyVal(key) {
            return key instanceof Truth.Node ? key.phrase : key;
        }
        /** */
        get debug() {
            const text = [];
            for (const parallel of this.parallels.values())
                text.push(parallel.name || "(undefined)");
            return text.join("\n");
        }
    }
    Truth.ParallelCache = ParallelCache;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     *
     */
    class Contract {
        /** */
        constructor(sourceParallel) {
            this._unsatisfiedConditions = new Set();
            const recurse = (srcParallel) => {
                if (srcParallel instanceof Truth.ImplicitParallel) {
                    for (const nestedParallel of srcParallel.getParallels())
                        recurse(nestedParallel);
                }
                else if (srcParallel instanceof Truth.ExplicitParallel) {
                    for (const { base } of srcParallel.eachBase())
                        this._unsatisfiedConditions.add(base);
                }
            };
            for (const higherParallel of sourceParallel.getParallels())
                recurse(higherParallel);
            this.allConditions = Object.freeze(Array.from(this._unsatisfiedConditions));
        }
        /**
         * Computes whether the input ExplicitParallel is a more derived
         * type of the ExplicitParallel that corresponds to this Contract.
         *
         * @returns A number that indicates the number of conditions that
         * were satisfied as a result of adding the provided ExplicitParallel
         * to the Contract.
         */
        trySatisfyCondition(foreignParallel) {
            if (this.allConditions.length === 0)
                return 0;
            const foreignParallelBases = new Set();
            foreignParallelBases.add(foreignParallel);
            let satisfied = 0;
            const addForeignParallelBases = (srcParallel) => {
                for (const { base } of srcParallel.eachBase())
                    addForeignParallelBases(base);
                foreignParallelBases.add(srcParallel);
            };
            for (const { base } of foreignParallel.eachBase())
                addForeignParallelBases(base);
            for (const foreignBase of foreignParallelBases)
                for (const condition of this.allConditions)
                    if (foreignBase === condition)
                        satisfied += this._unsatisfiedConditions.delete(condition) ? 1 : 0;
            return satisfied;
        }
        /** */
        get hasConditions() {
            return this.allConditions.length > 0;
        }
        /** */
        get unsatisfiedConditions() {
            return this._unsatisfiedConditions;
        }
    }
    Truth.Contract = Contract;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * A class that encapsulates the actual fault detection behavior,
     * with facilities to perform analysis on Parallel instances, before
     * the actual base has been applied to it.
     */
    class Sanitizer {
        /** */
        constructor(targetParallel, proposedBase, proposedEdge, cruft) {
            this.targetParallel = targetParallel;
            this.proposedBase = proposedBase;
            this.proposedEdge = proposedEdge;
            this.cruft = cruft;
            this._foundCruft = false;
        }
        /**
         * Detects list operartor conflicts between the fragments of an
         * annotation. For example, conflicts of the following type are
         * caught here:
         *
         * List : Item
         * List : Item...
         */
        detectListFragmentConflicts() {
            const sources = this.proposedEdge.fragments;
            if (sources.length === 0)
                return false;
            const spans = sources.filter((src) => src instanceof Truth.Span);
            const terms = spans
                .map(f => f.boundary.subject)
                .filter((sub) => sub instanceof Truth.Term);
            const termsList = terms.filter(id => id.isList);
            const termsNonList = terms.filter(id => !id.isList);
            if (termsList.length > 0 && termsNonList.length > 0)
                for (const span of spans)
                    this.addFault(span, Truth.Faults.ListAnnotationConflict);
            return this.foundCruft;
        }
        /** */
        detectCircularReferences() {
            const circularEdgePaths = [];
            const recurse = (srcBase, path) => {
                for (const { base, edge } of this.basesOf(srcBase)) {
                    if (path.includes(edge))
                        circularEdgePaths.push(path.slice());
                    else
                        recurse(base, path.concat(edge));
                }
            };
            for (const { base, edge } of this.basesOf(this.targetParallel))
                recurse(base, []);
            for (const item of circularEdgePaths)
                for (const circularEdge of item)
                    this.addFault(circularEdge, Truth.Faults.CircularTypeReference);
            return this.foundCruft;
        }
        /** */
        detectListDimensionalityConflict() {
            const targetDim = this.targetParallel.getListDimensionality();
            const proposedDim = this.proposedBase.getListDimensionality() +
                (this.proposedEdge.isList ? 1 : 0);
            if (targetDim !== proposedDim)
                this.addFault(this.proposedEdge, Truth.Faults.ListDimensionalDiscrepancyFault);
            return this.foundCruft;
        }
        /** Gets a boolean value that indicates whether a fault has been reported. */
        get foundCruft() {
            return this._foundCruft;
        }
        /** */
        *basesOf(par) {
            for (const { base, edge } of par.eachBase())
                yield { base, edge };
            if (this.targetParallel === par)
                yield { base: this.proposedBase, edge: this.proposedEdge };
        }
        /** */
        addFault(source, relevantFaultType) {
            this._foundCruft = true;
            this.cruft.add(source, relevantFaultType);
        }
    }
    Truth.Sanitizer = Sanitizer;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * A class that represents a fully constructed type within the program.
     */
    class Type {
        /**
         *
         */
        constructor(seed, container) {
            /**
             * Stores whether this type represents the intrinsic
             * side of a list.
             */
            this.isListIntrinsic = false;
            /**
             * Stores whether this type represents the extrinsic
             * side of a list.
             */
            this.isListExtrinsic = false;
            /**
             * Stores whether this Type instance has no annotations applied to it.
             */
            this.isFresh = false;
            /**
             * Stores a value that indicates if this Type was directly specified
             * in the document, or if it's existence was inferred.
             */
            this.isExplicit = false;
            /** */
            this.isAnonymous = false;
            /** */
            this.isPattern = false;
            /** */
            this.isUri = false;
            /** */
            this.isList = false;
            this.private = new TypePrivate(seed);
            this.name = seed.phrase.terminal.toString();
            this.phrase = seed.phrase;
            this.outer = container;
            this.private.parallels = new Truth.TypeProxyArray(seed.getParallels().map(edge => new Truth.TypeProxy(edge.phrase)));
            const getBases = (ep) => {
                const bases = Array.from(ep.eachBase());
                return bases.map(entry => new Truth.TypeProxy(entry.base.node.phrase));
            };
            if (seed instanceof Truth.ExplicitParallel) {
                this.private.bases = new Truth.TypeProxyArray(getBases(seed));
            }
            else if (seed instanceof Truth.ImplicitParallel) {
                const queue = [seed];
                const explicitParallels = [];
                for (let i = -1; ++i < queue.length;) {
                    const current = queue[i];
                    if (current instanceof Truth.ImplicitParallel)
                        queue.push(...current.getParallels());
                    else if (current instanceof Truth.ExplicitParallel)
                        explicitParallels.push(current);
                }
                const bases = explicitParallels
                    .map(par => getBases(par))
                    .reduce((a, b) => a.concat(b), [])
                    .filter((v, i, a) => a.indexOf(v) === i);
                this.private.bases = new Truth.TypeProxyArray(bases);
            }
            this.isList = false;
            if (seed instanceof Truth.ExplicitParallel) {
                const sub = seed.node.subject;
                this.isPattern = sub instanceof Truth.Pattern;
                this.isUri = sub instanceof Truth.KnownUri;
                this.isAnonymous = sub instanceof Truth.Anon;
                this.isExplicit = true;
                this.isFresh = seed.getParallels().length === 0;
            }
        }
        static construct(param) {
            const phrase = param instanceof Truth.Phrase ?
                param :
                Truth.Phrase.fromSpine(param);
            if (!phrase || phrase.length === 0)
                return null;
            if (Truth.TypeCache.has(phrase)) {
                const cached = Truth.TypeCache.get(phrase);
                // If the cached type exists, but hasn't been compiled yet,
                // we can't return it, we need to compile it first.
                if (!(cached instanceof Truth.TypeProxy))
                    return cached;
            }
            const program = phrase.containingDocument.program;
            const worker = (() => {
                const stored = this.parallelContextMap.get(program);
                if (stored === undefined) {
                    const newStored = {
                        version: program.version,
                        worker: new Truth.ConstructionWorker(program)
                    };
                    this.parallelContextMap.set(program, newStored);
                    return newStored.worker;
                }
                else if (program.version.newerThan(stored.version)) {
                    stored.version = program.version;
                    stored.worker = new Truth.ConstructionWorker(program);
                }
                return stored.worker;
            })();
            const parallel = worker.drill(phrase);
            if (parallel === null) {
                Truth.TypeCache.set(phrase, null);
                return null;
            }
            const parallelLineage = [parallel];
            for (let currentParallel = parallel.container; currentParallel !== null;) {
                parallelLineage.unshift(currentParallel);
                currentParallel = currentParallel.container;
            }
            let lastType = null;
            for (const currentParallel of parallelLineage) {
                if (Truth.TypeCache.has(currentParallel.phrase)) {
                    const existingType = Truth.TypeCache.get(currentParallel.phrase);
                    if (existingType instanceof Truth.TypeProxy)
                        throw Truth.Exception.unknownState();
                    if (existingType === null)
                        throw Truth.Exception.unknownState();
                    lastType = existingType;
                }
                else {
                    const type = new Type(currentParallel, lastType);
                    Truth.TypeCache.set(currentParallel.phrase, type);
                    lastType = type;
                }
            }
            return lastType;
        }
        /**
         * @internal
         * Constructs the invisible root-level Type object that corresponds
         * to the specified document.
         */
        static constructRoots(document) {
            const roots = [];
            for (const phrase of Truth.Phrase.rootsOf(document)) {
                const type = this.construct(phrase);
                if (type !== null)
                    roots.push(type);
            }
            return Object.freeze(roots);
        }
        /**
         * Stores an array of Statement objects that are responsible
         * for the initiation of this type. In the case when this Type
         * object represents a path that is implicitly defined, the
         * array is empty. For example, given the following document:
         *
         * ```
         * Class
         * 	Field
         * SubClass : Class
         * ```
         *
         * The type at path SubClass/Field is an implicit type, and
         * therefore, although a valid type object, has no phyisical
         * statements associated.
         */
        get statements() {
            this.private.throwOnDirty();
            if (this.private.statements !== null)
                return this.private.statements;
            if (!(this.private.seed instanceof Truth.ExplicitParallel))
                return this.private.statements = Object.freeze([]);
            return this.private.statements = this.private.seed.node.statements.slice();
        }
        /**
         * Stores a reference to the type, as it's defined in it's
         * next most applicable type.
         */
        get parallels() {
            this.private.throwOnDirty();
            return Truth.Not.null(this.private.parallels).maybeCompile();
        }
        /**
         * Stores a reference to the parallel roots of this type.
         * The parallel roots are the endpoints found when
         * traversing upward through the parallel graph.
         */
        get parallelRoots() {
            this.private.throwOnDirty();
            if (this.private.parallelRoots !== null)
                return this.private.parallelRoots;
            const roots = [];
            for (const { type } of this.iterate(t => t.parallels))
                if (type !== this && type.parallels.length === 0)
                    roots.push(type);
            return this.private.parallelRoots = Object.freeze(roots);
        }
        /**
         * Stores the array of types that are contained directly by this
         * one. In the case when this type is a list type, this array does
         * not include the list's intrinsic types.
         */
        get inners() {
            if (this.private.inners !== null)
                return this.private.inners;
            this.private.throwOnDirty();
            const innerSubs = [];
            // Dig through the parallel graph recursively, and at each parallel,
            // dig through the base graph recursively, and collect all the names
            // that are found.
            for (const { type: parallelType } of this.iterate(t => t.parallels, true))
                for (const { type: baseType } of parallelType.iterate(t => t.bases, true))
                    if (baseType.private.seed instanceof Truth.ExplicitParallel)
                        for (const subject of baseType.private.seed.node.contents.keys())
                            if (!innerSubs.includes(subject))
                                innerSubs.push(subject);
            const inners = innerSubs
                .map(innerSub => {
                const maybeInnerPhrase = this.phrase.forward(innerSub);
                return Type.construct(maybeInnerPhrase);
            })
                .filter((t) => t !== null);
            return this.private.inners = Object.freeze(inners);
        }
        /**
         * @internal
         * Stores the array of types that are contained directly by this
         * one. In the case when this type is not a list type, this array
         * is empty.
         */
        get innersIntrinsic() {
            if (this.private.innersIntrinsic !== null)
                return this.private.innersIntrinsic;
            if (!this.isList)
                return this.private.innersIntrinsic = Object.freeze([]);
            this.private.throwOnDirty();
            throw Truth.Exception.notImplemented();
        }
        /**
         * Stores the array of types from which this type extends.
         * If this Type extends from a pattern, it is included in this
         * array.
         */
        get bases() {
            this.private.throwOnDirty();
            if (this.private.bases === null)
                throw Truth.Exception.unknownState();
            return this.private.bases.maybeCompile();
        }
        /**
         * @internal
         * Not implemented.
         */
        get superordinates() {
            if (this.private.superordinates !== null)
                return this.private.superordinates;
            this.private.throwOnDirty();
            throw Truth.Exception.notImplemented();
            // eslint-disable-next-line no-unreachable
            return this.private.superordinates = Object.freeze([]);
        }
        /**
         * @internal
         * Not implemented.
         */
        get subordinates() {
            if (this.private.subordinates !== null)
                return this.private.subordinates;
            this.private.throwOnDirty();
            throw Truth.Exception.notImplemented();
            // eslint-disable-next-line no-unreachable
            return this.private.subordinates = Object.freeze([]);
        }
        /**
         * Gets an array that contains the types that derive from the
         * this Type instance.
         *
         * The types that derive from this one as a result of the use of
         * an alias are excluded from this array.
         */
        get derivations() {
            if (this.private.derivations !== null)
                return this.private.derivations;
            this.private.throwOnDirty();
            if (!(this.private.seed instanceof Truth.ExplicitParallel))
                return this.private.derivations = Object.freeze([]);
            const derivations = Array.from(this.private.seed.node.inbounds)
                .map(ib => ib.predecessor.phrase)
                .map(phrase => Type.construct(phrase))
                .filter((t) => t instanceof Type)
                .filter(type => type.bases.includes(this));
            return this.private.derivations = Object.freeze(derivations);
        }
        /**
         * Gets an array that contains the that share the same containing
         * type as this one.
         */
        get adjacents() {
            if (this.private.adjacents !== null)
                return this.private.adjacents;
            this.private.throwOnDirty();
            if (this.outer)
                return this.private.adjacents = this.outer.inners.filter(t => t !== this);
            const document = this.phrase.containingDocument;
            const roots = Array.from(Truth.Phrase.rootsOf(document));
            const adjacents = roots
                .map(phrase => Type.construct(phrase))
                .filter((t) => t !== null && t !== this);
            return this.private.adjacents = Object.freeze(adjacents);
        }
        /**
         * Gets an array that contains the patterns that resolve to this type.
         */
        get patterns() {
            if (this.private.patterns !== null)
                return this.private.patterns;
            this.private.throwOnDirty();
            // Stores a map whose keys are a concatenation of the Uris of all
            // the bases that are matched by a particular pattern, and whose
            // values are the type object containing that pattern. This map
            // provides an easy way to determine if there is already a pattern
            // that matches a particular set of types in the type scope.
            const patternMap = new Map();
            for (const { type } of this.iterate(t => t.outer)) {
                const applicablePatternTypes = type.adjacents
                    .filter(t => t.isPattern)
                    .filter(t => t.bases.includes(type));
                const applicablePatternsBasesLabels = applicablePatternTypes.map(p => p.bases
                    .map(b => b.phrase.toString())
                    .join("\n" /* terminal */));
                for (let i = -1; ++i < applicablePatternTypes.length;) {
                    const baseLabel = applicablePatternsBasesLabels[i];
                    if (!patternMap.has(baseLabel))
                        patternMap.set(baseLabel, applicablePatternTypes[i]);
                }
            }
            const out = Array.from(patternMap.values());
            return this.private.patterns = Object.freeze(out);
        }
        /**
         * Gets an array that contains the raw string values representing
         * the type aliases with which this type has been annotated.
         *
         * If this type is unspecified, the parallel graph is searched,
         * and any applicable type aliases will be present in the returned
         * array.
         */
        get aliases() {
            if (this.private.aliases !== null)
                return this.private.aliases;
            this.private.throwOnDirty();
            const aliases = [];
            const extractAlias = (ep) => {
                for (const { edge, aliased } of ep.eachBase())
                    if (aliased)
                        aliases.push(edge.term.toString());
            };
            if (this.private.seed instanceof Truth.ExplicitParallel) {
                extractAlias(this.private.seed);
            }
            else if (this.private.seed instanceof Truth.ImplicitParallel) {
                const queue = [this.private.seed];
                for (let i = -1; ++i < queue.length;) {
                    const current = queue[i];
                    for (const parallel of current.getParallels()) {
                        if (parallel instanceof Truth.ExplicitParallel)
                            extractAlias(parallel);
                        else if (parallel instanceof Truth.ImplicitParallel)
                            queue.push(parallel);
                    }
                }
            }
            return this.private.aliases = aliases;
        }
        /**
         *
         */
        get values() {
            if (this.private.values !== null)
                return this.private.values;
            this.private.throwOnDirty();
            const values = [];
            const extractType = (ep) => {
                for (const { edge, aliased } of ep.eachBase())
                    values.push({
                        aliased,
                        value: edge.term.toString(),
                        base: Type.construct(edge.predecessor.phrase)
                    });
            };
            if (this.private.seed instanceof Truth.ExplicitParallel) {
                extractType(this.private.seed);
            }
            else if (this.private.seed instanceof Truth.ImplicitParallel) {
                const queue = [this.private.seed];
                for (let i = -1; ++i < queue.length;) {
                    const current = queue[i];
                    for (const parallel of current.getParallels()) {
                        if (parallel instanceof Truth.ExplicitParallel)
                            extractType(parallel);
                        else if (parallel instanceof Truth.ImplicitParallel)
                            queue.push(parallel);
                    }
                }
            }
            return this.private.values = values;
        }
        /**
         * Gets the first alias stored in the .values array, or null if the
         * values array is empty.
         */
        get value() {
            return this.aliases.length > 0 ? this.aliases[0] : null;
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
            return this.private.program.version.newerThan(this.private.stamp);
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
                const nextType = this.inners.find(type => type.name === typeName);
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
         * `.inners` property, either directly, or indirectly via
         * the parallel graphs of the `.inners` Types.
         */
        has(type) {
            if (this.inners.includes(type))
                return true;
            for (const innerType of this.inners)
                if (type.name === innerType.name)
                    for (const parallel of innerType.iterate(t => t.parallels))
                        if (parallel.type === type)
                            return true;
            return false;
        }
    }
    /** */
    Type.parallelContextMap = new WeakMap();
    Truth.Type = Type;
    /**
     * @internal
     * A hidden class that stores the private information of
     * a Type instance, used to mitigate the risk of low-rank
     * developers from getting themselves into trouble.
     */
    class TypePrivate {
        constructor(seed) {
            this.seed = seed;
            /** */
            this.statements = null;
            /** */
            this.inners = null;
            /** */
            this.innersIntrinsic = null;
            /** */
            this.bases = null;
            /** */
            this.parallels = null;
            /** */
            this.parallelRoots = null;
            /** */
            this.patterns = null;
            /** */
            this.aliases = null;
            /** */
            this.values = null;
            /** */
            this.superordinates = null;
            /** */
            this.subordinates = null;
            /** */
            this.derivations = null;
            /** */
            this.adjacents = null;
            this.stamp = this.program.version;
        }
        /** */
        get program() {
            return this.seed.phrase.containingDocument.program;
        }
        /** */
        throwOnDirty() {
            if (this.program.version.newerThan(this.stamp))
                throw Truth.Exception.objectDirty();
        }
    }
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     */
    class TypeProxy {
        /** */
        constructor(phrase) {
            this.phrase = phrase;
            /** */
            this.compiledType = undefined;
        }
        /** */
        maybeCompile() {
            if (this.compiledType !== undefined)
                return this.compiledType;
            return this.compiledType = Truth.Type.construct(this.phrase);
        }
    }
    Truth.TypeProxy = TypeProxy;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     */
    class TypeProxyArray {
        /**
         *
         */
        constructor(array) {
            this.array = array;
            this.compiledArray = undefined;
        }
        /**
         *
         */
        maybeCompile() {
            if (this.compiledArray !== undefined)
                return this.compiledArray;
            const out = this.array
                .map(lazy => lazy.maybeCompile())
                .filter((type) => type !== null);
            return this.compiledArray = Object.freeze(out);
        }
    }
    Truth.TypeProxyArray = TypeProxyArray;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     */
    class TypeCache {
        /** */
        constructor(program) {
            this.program = program;
            /** */
            this.map = new Map();
            this.version = program.version;
        }
        /** */
        static has(phrase) {
            const cache = this.getCache(phrase.containingDocument.program);
            return cache.map.has(phrase);
        }
        /** */
        static get(phrase) {
            const program = phrase.containingDocument.program;
            const cache = this.getCache(program);
            if (cache.map.has(phrase))
                return Truth.Not.undefined(cache.map.get(phrase));
            const proxy = new Truth.TypeProxy(phrase);
            this.set(phrase, proxy);
            return proxy;
        }
        /** */
        static set(phrase, type) {
            const cache = this.getCache(phrase.containingDocument.program);
            cache.map.set(phrase, type);
            return type;
        }
        /** */
        static getCache(program) {
            const cache = this.allCaches.get(program) || (() => {
                const cache = new TypeCache(program);
                this.allCaches.set(program, cache);
                return cache;
            })();
            cache.maybeClear();
            return cache;
        }
        /** */
        maybeClear() {
            if (this.program.version.newerThan(this.version)) {
                this.map.clear();
                this.version = this.program.version;
            }
        }
    }
    /**
     *
     */
    TypeCache.allCaches = new WeakMap();
    Truth.TypeCache = TypeCache;
})(Truth || (Truth = {}));
// Util
/// <reference path="./Util/Helpers.ts" />
/// <reference path="./Util/MultiMap.ts" />
/// <reference path="./Util/Fs.ts" />
/// <reference path="./Util/Hash.ts" />
/// <reference path="./Util/HigherOrder.ts" />
/// <reference path="./Util/Not.ts" />
/// <reference path="./Util/Parser.ts" />
/// <reference path="./Util/UnicodeBlocks.ts" />
/// <reference path="./Util/Misc.ts" />
// System
/// <reference path="./System/AbstractClass.ts" />
/// <reference path="./System/Program.ts" />
/// <reference path="./System/ProgramInspectionResult.ts" />
/// <reference path="./System/AgentCache.ts" />
/// <reference path="./System/Cause.ts" />
/// <reference path="./System/Exception.ts" />
/// <reference path="./System/UriProtocol.ts" />
/// <reference path="./System/UriReader.ts" />
/// <reference path="./System/Syntax.ts" />
/// <reference path="./System/FaultService.ts" />
/// <reference path="./System/Faults.ts" />
/// <reference path="./System/Phrase.ts" />
/// <reference path="./System/Term.ts" />
/// <reference path="./System/VersionStamp.ts" />
// Finite State Machine
/// <reference path="./Fsm/Alphabet.ts" />
/// <reference path="./Fsm/TransitionMap.ts" />
/// <reference path="./Fsm/TransitionState.ts" />
/// <reference path="./Fsm/Guide.ts" />
/// <reference path="./Fsm/Fsm.ts" />
/// <reference path="./Fsm/FsmTranslator.ts" />
// Phases / File Representation
/// <reference path="./Phases/File/Document.ts" />
/// <reference path="./Phases/File/DocumentTypes.ts" />
/// <reference path="./Phases/File/CycleDetector.ts" />
/// <reference path="./Phases/File/LineParser.ts" />
/// <reference path="./Phases/File/Anon.ts" />
/// <reference path="./Phases/File/Line.ts" />
/// <reference path="./Phases/File/Boundary.ts" />
/// <reference path="./Phases/File/Statement.ts" />
/// <reference path="./Phases/File/Pattern.ts" />
/// <reference path="./Phases/File/PatternPrecompiler.ts" />
/// <reference path="./Phases/File/RegexTypes.ts" />
/// <reference path="./Phases/File/Infix.ts" />
/// <reference path="./Phases/File/Span.ts" />
/// <reference path="./Phases/File/Spine.ts" />
/// <reference path="./Phases/File/Subject.ts" />
// Phases / Graph Representation
/// <reference path="./Phases/Graph/HyperGraph.ts" />
/// <reference path="./Phases/Graph/Node.ts" />
/// <reference path="./Phases/Graph/NodeIndex.ts" />
/// <reference path="./Phases/Graph/HyperEdge.ts" />
/// <reference path="./Phases/Graph/InfixSpan.ts" />
// Phases / Parallel Representation
/// <reference path="./Phases/Parallel/ConstructionWorker.ts" />
/// <reference path="./Phases/Parallel/Parallel.ts" />
/// <reference path="./Phases/Parallel/ExplicitParallel.ts" />
/// <reference path="./Phases/Parallel/ImplicitParallel.ts" />
/// <reference path="./Phases/Parallel/CruftCache.ts" />
/// <reference path="./Phases/Parallel/ParallelCache.ts" />
/// <reference path="./Phases/Parallel/Contract.ts" />
/// <reference path="./Phases/Parallel/Sanitizer.ts" />
// Phases / Type Representation
/// <reference path="./Phases/Type/Type.ts" />
/// <reference path="./Phases/Type/TypeProxy.ts" />
/// <reference path="./Phases/Type/TypeProxyArray.ts" />
/// <reference path="./Phases/Type/TypeCache.ts" />
// Node compatibility
if (typeof module !== "undefined" && module.exports)
    module.exports = Truth;
var Truth;
(function (Truth) {
    /**
     * @internal
     * A minimal abstraction of a JavaScript array, but where the indexes
     * are treated as 1-based.
     */
    class Array1Based {
        constructor() {
            /** */
            this.items = [];
        }
        /**
         * Yields items starting at the specified position, and continues forward
         * until the end of the array is reached.
         */
        *enumerateForward(from = 1) {
            const len = this.items.length;
            for (let idx = this.toZeroBased(from); idx < len; idx++)
                yield this.items[idx];
        }
        /**
         * Yields items starting at the specified position, and continues backward
         * until the start of the array is reached.
         */
        *enumerateBackward(from = -1) {
            for (let idx = this.toZeroBased(from); idx >= 0; idx--)
                yield this.items[idx];
        }
        /**
         * Get the length of the array.
         */
        get length() {
            return this.items.length;
        }
        /**
         * Returns the item at the specified position.
         * If the specified position is less than 0, the position
         * is assumed to be relative to the end of the array.
         */
        get(pos) {
            return this.items[this.toZeroBased(pos)];
        }
        /**
         *
         */
        set(pos, item) {
            this.items[this.toZeroBased(pos)] = item;
        }
        /**
         * Returns a 1-based position of the specified item.
         * Returns -1 in the case when the item was not found in the array.
         */
        posOf(item) {
            const idx = this.items.indexOf(item);
            return idx < 0 ? -1 : idx + 1;
        }
        /**
         * Adds an item to the array.
         */
        push(item) {
            return this.items.push(item);
        }
        /**
         * Performs a standard Array.splice() call on the array.
         */
        splice(pos, deleteCount, ...items) {
            return this.items.splice(this.toZeroBased(pos), deleteCount, ...items);
        }
        /**
         * Converts a 1-based position into a 0-based index.
         */
        toZeroBased(pos) {
            const len = this.items.length;
            if (pos < 0)
                return Math.max(0, len - pos);
            if (pos > len)
                return len - 1;
            if (pos === 0)
                throw Truth.Exception.invalidArgument();
            return pos - 1;
        }
    }
    Truth.Array1Based = Array1Based;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * This is a class that wraps the built-in URL object.
     * It ensures that the system only every stores references
     * to unique URLs, so that equality of two Uris can be tested
     * by doing a simple referential comparison.
     */
    class KnownUri {
        /** */
        constructor(innerUrl) {
            this.innerUrl = innerUrl;
            // Generates an error if the URL isn't from a known protocol.
            this.protocol;
        }
        /**
         * @internal
         * Returns a KnownUri suitable for internal documents that aren't actually
         * stored anywhere other than in memory. The number provided ends up
         * as the fictitious name of the truth file specified in the URI.
         */
        static createMemoryUri(number) {
            const uriText = Truth.UriProtocol.memory + "//memory/" + number + ".truth";
            return Truth.Misc.get(this.cache, uriText, () => new KnownUri(new URL(uriText)));
        }
        /**
         * Returns the KnownUri object associated with the text representation
         * of the URI specified, or null in the case when the text value specified
         * could not be parsed as a URI.
         */
        static fromString(uriText, base) {
            let mergedUrl = null;
            try {
                mergedUrl = new URL(uriText, base ? base.innerUrl : void 0);
            }
            catch (e) { }
            if (mergedUrl === null)
                return null;
            const url = mergedUrl;
            return Truth.Misc.get(this.cache, mergedUrl.href, () => new KnownUri(url));
        }
        /**
         * Gets the protocol of the underlying URL.
         */
        get protocol() {
            return Truth.Not.null(Truth.UriProtocol.resolve(this.innerUrl.protocol));
        }
        /**
         * Returns a fully-qualified string representation of this KnownUri.
         */
        toString() {
            return this.innerUrl.protocol === Truth.UriProtocol.file ?
                this.innerUrl.pathname :
                this.innerUrl.href;
        }
    }
    /**
     * Stores a cache of all KnownUris created by the compiler,
     * keyed by a string representation of the KnownUri's inner URL.
     */
    KnownUri.cache = new Map();
    Truth.KnownUri = KnownUri;
})(Truth || (Truth = {}));
var Truth;
(function (Truth) {
    /**
     * @internal
     * (Not implemented)
     * A class that specifies behavior around the recognition
     * of patterns found within documents.
     */
    class Recognition {
        /** */
        constructor() {
            /** Whether File URIs should be recognized in statements. */
            this.fileUris = 0 /* on */;
            /** Whether HTTP URIs should be recognized in statements. */
            this.httpUris = 0 /* on */;
            /** Whether regular expressions should be recognized in statements. */
            this.regularExpressions = 0 /* on */;
            /** Whether comments should be recognized in statements. */
            this.comments = 0 /* on */;
        }
    }
    Truth.Recognition = Recognition;
})(Truth || (Truth = {}));