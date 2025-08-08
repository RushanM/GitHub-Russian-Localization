// проверка включения/выключения перевода
let translationEnabled = true;
let observer = null;

// встраиваем библиотеку Fluent для обхода CSP
const fluentLibScript = `
/**
 * @license
 * Copyright 2019 Mozilla Foundation.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.FluentBundle = {}));
})(this, (function (exports) { 'use strict';

    function _typeof(obj) {
        "@babel/helpers - typeof";

        return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
            return typeof obj;
        } : function (obj) {
            return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
        }, _typeof(obj);
    }

    function createCommonjsModule(fn, module) {
        return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var ftl = createCommonjsModule(function (module, exports) {

        Object.defineProperty(exports, "__esModule", {
            value: true
        });
        exports.default = void 0;
        var _default = {
            parse: function parse(source) {
                var cursor = 0;
                var content = source;
                var length = content.length;
                var entries = {};
                var currentAttributes = null;
                var currentEntry = null;
                var currentSection = null;
                var errors = [];
                var warnings = [];
                var comments = [];

                function next() {
                    cursor++;
                }

                function peek() {
                    return content[cursor];
                }

                function peekCharCode() {
                    return content.charCodeAt(cursor);
                }

                function isWhitespace() {
                    return [" ", "\\n", "\\t", "\\r"].includes(peek());
                }

                function isDigit() {
                    var cc = peekCharCode();
                    return cc >= 48 && cc <= 57;
                }

                function isAlpha() {
                    var cc = peekCharCode();
                    return cc >= 65 && cc <= 90 || cc >= 97 && cc <= 122;
                }

                function isIdentifierStart() {
                    return isAlpha() || peek() === "_";
                }

                function isIdentifierChar() {
                    return isAlpha() || isDigit() || peek() === "_" || peek() === "-";
                }

                function skipWhitespace() {
                    while (cursor < length && isWhitespace()) {
                        next();
                    }
                }

                function skipToNextLine() {
                    while (cursor < length && peek() !== "\\n") {
                        next();
                    }

                    if (cursor < length) {
                        next();
                    }
                }

                function skipBlankLines() {
                    while (cursor < length && (peek() === "\\n" || peek() === "\\r")) {
                        next();
                    }
                }

                function expectIdentifier() {
                    if (!isIdentifierStart()) {
                        errors.push(\`Expected an identifier at position \${cursor}\`);
                        return "";
                    }

                    var start = cursor;

                    next();

                    while (cursor < length && isIdentifierChar()) {
                        next();
                    }

                    return content.substring(start, cursor);
                }

                function parseComment() {
                    // Skip the #
                    next();

                    var comment = "";

                    if (peek() === " ") {
                        next();
                    }

                    while (cursor < length && peek() !== "\\n") {
                        comment += peek();
                        next();
                    }

                    comments.push(comment);

                    if (cursor < length) {
                        next();
                    }
                }

                function parseGroupComment() {
                    // Skip the ##
                    next();
                    next();

                    var comment = "";

                    if (peek() === " ") {
                        next();
                    }

                    while (cursor < length && peek() !== "\\n") {
                        comment += peek();
                        next();
                    }

                    // TODO: Store group comments

                    if (cursor < length) {
                        next();
                    }
                }

                function parseResourceComment() {
                    // Skip the ###
                    next();
                    next();
                    next();

                    var comment = "";

                    if (peek() === " ") {
                        next();
                    }

                    while (cursor < length && peek() !== "\\n") {
                        comment += peek();
                        next();
                    }

                    // TODO: Store resource comments

                    if (cursor < length) {
                        next();
                    }
                }

                function parseSection() {
                    // Skip the [
                    next();

                    skipWhitespace();

                    var section = "";

                    while (cursor < length && peek() !== "]") {
                        section += peek();
                        next();
                    }

                    if (cursor < length) {
                        // Skip the ]
                        next();
                    }

                    skipToNextLine();
                    return section.trim();
                }

                function parseMessage() {
                    var id = expectIdentifier();
                    skipWhitespace();

                    if (peek() !== "=") {
                        errors.push(\`Expected = after message id at position \${cursor}\`);
                        skipToNextLine();
                        return;
                    }

                    next(); // Skip the =
                    skipWhitespace();

                    var value = "";
                    var startedLine = false;
                    var startLine = cursor;

                    while (cursor < length) {
                        if (peek() === "\\n") {
                            next();
                            skipWhitespace();

                            if (peek() !== "{" && !isIdentifierStart() && peek() !== "[" && peek() !== "#" && peek() !== ".") {
                                if (peek() === " " || peek() === "\\t") {
                                    if (startedLine) {
                                        value += "\\n";
                                    }

                                    while (cursor < length && (peek() === " " || peek() === "\\t")) {
                                        next();
                                    }

                                    startedLine = true;
                                    continue;
                                }
                            }

                            break;
                        }

                        value += peek();
                        next();
                        startedLine = true;
                    }

                    if (currentEntry === null) {
                        currentEntry = id;
                        currentAttributes = {};
                        entries[id] = {
                            value: value,
                            attributes: currentAttributes
                        };
                    } else {
                        warnings.push(\`Ignoring message "\${id}" which would overwrite previous message\`);
                    }
                }

                function parseAttribute() {
                    // Skip the .
                    next();

                    var name = expectIdentifier();
                    skipWhitespace();

                    if (peek() !== "=") {
                        errors.push(\`Expected = after attribute name at position \${cursor}\`);
                        skipToNextLine();
                        return;
                    }

                    next(); // Skip the =
                    skipWhitespace();

                    var value = "";
                    var startedLine = false;

                    while (cursor < length) {
                        if (peek() === "\\n") {
                            next();
                            skipWhitespace();

                            if (peek() !== "{" && !isIdentifierStart() && peek() !== "[" && peek() !== "#" && peek() !== ".") {
                                if (peek() === " " || peek() === "\\t") {
                                    if (startedLine) {
                                        value += "\\n";
                                    }

                                    while (cursor < length && (peek() === " " || peek() === "\\t")) {
                                        next();
                                    }

                                    startedLine = true;
                                    continue;
                                }
                            }

                            break;
                        }

                        value += peek();
                        next();
                        startedLine = true;
                    }

                    if (currentEntry !== null && currentAttributes !== null) {
                        currentAttributes[name] = value;
                    } else {
                        errors.push(\`Attribute "\${name}" has no corresponding message\`);
                    }
                }

                function parseTermMessage() {
                    // Skip the -
                    next();

                    var id = expectIdentifier();
                    skipWhitespace();

                    if (peek() !== "=") {
                        errors.push(\`Expected = after term at position \${cursor}\`);
                        skipToNextLine();
                        return;
                    }

                    next(); // Skip the =
                    skipWhitespace();

                    var value = "";
                    var startedLine = false;

                    while (cursor < length) {
                        if (peek() === "\\n") {
                            next();
                            skipWhitespace();

                            if (peek() !== "{" && !isIdentifierStart() && peek() !== "[" && peek() !== "#" && peek() !== ".") {
                                if (peek() === " " || peek() === "\\t") {
                                    if (startedLine) {
                                        value += "\\n";
                                    }

                                    while (cursor < length && (peek() === " " || peek() === "\\t")) {
                                        next();
                                    }

                                    startedLine = true;
                                    continue;
                                }
                            }

                            break;
                        }

                        value += peek();
                        next();
                        startedLine = true;
                    }

                    if (currentEntry === null) {
                        currentEntry = \`-\${id}\`;
                        currentAttributes = {};
                        entries[\`-\${id}\`] = {
                            value: value,
                            attributes: currentAttributes
                        };
                    } else {
                        warnings.push(\`Ignoring term "\${id}" which would overwrite previous term or message\`);
                    }
                }

                while (cursor < length) {
                    skipWhitespace();

                    if (cursor >= length) {
                        break;
                    }

                    if (peek() === "#") {
                        if (content[cursor + 1] === "#") {
                            if (content[cursor + 2] === "#") {
                                parseResourceComment();
                            } else {
                                parseGroupComment();
                            }
                        } else {
                            parseComment();
                        }
                    } else if (peek() === "[") {
                        currentSection = parseSection();
                    } else if (peek() === "-") {
                        currentEntry = null;
                        currentAttributes = null;
                        parseTermMessage();
                    } else if (peek() === ".") {
                        parseAttribute();
                    } else if (isIdentifierStart()) {
                        currentEntry = null;
                        currentAttributes = null;
                        parseMessage();
                    } else {
                        errors.push(\`Unexpected character at position \${cursor}: \${peek()}\`);
                        next();
                    }
                }

                return {
                    entries: entries,
                    errors: errors,
                    warnings: warnings,
                    comments: comments
                };
            }
        };
        exports.default = _default;
    });

    var FluentResource = /*#__PURE__*/function () {
        function FluentResource(source) {
            this.source = source;
            var result = ftl.default.parse(source);
            this.entries = result.entries;
            this.errors = result.errors;
        }

        var _proto = FluentResource.prototype;

        _proto.getText = function getText(id) {
            var entry = this.entries[id];
            return entry ? entry.value : null;
        };

        _proto.getAttribute = function getAttribute(id, name) {
            var entry = this.entries[id];
            return entry && entry.attributes[name] ? entry.attributes[name] : null;
        };

        return FluentResource;
    }();

    var FluentType = /*#__PURE__*/function () {
        function FluentType(value) {
            this.value = value;
        }

        var _proto = FluentType.prototype;

        _proto.valueOf = function valueOf() {
            return this.value;
        };

        return FluentType;
    }();

    var FluentNone = /*#__PURE__*/function (_FluentType) {
        function FluentNone() {
            return _FluentType.call(this, null) || this;
        }

        var _proto2 = FluentNone.prototype;

        _proto2.valueOf = function valueOf() {
            return this.value;
        };

        _proto2.toString = function toString() {
            return "???";
        };

        return FluentNone;
    }(FluentType);

    var FluentNumber = /*#__PURE__*/function (_FluentType2) {
        function FluentNumber(value, opts) {
            var _this;

            _this = _FluentType2.call(this, value) || this;
            _this.opts = opts;
            return _this;
        }

        var _proto3 = FluentNumber.prototype;

        _proto3.toString = function toString(locale) {
            try {
                var nf = new Intl.NumberFormat(locale, this.opts);
                return nf.format(this.value);
            } catch (err) {
                return this.value.toString();
            }
        };

        return FluentNumber;
    }(FluentType);

    var FluentDateTime = /*#__PURE__*/function (_FluentType3) {
        function FluentDateTime(value, opts) {
            var _this2;

            _this2 = _FluentType3.call(this, value) || this;
            _this2.opts = opts;
            return _this2;
        }

        var _proto4 = FluentDateTime.prototype;

        _proto4.toString = function toString(locale) {
            try {
                var dtf = new Intl.DateTimeFormat(locale, this.opts);
                return dtf.format(this.value);
            } catch (err) {
                return new Date(this.value).toISOString();
            }
        };

        return FluentDateTime;
    }(FluentType);

    var FluentSymbol = /*#__PURE__*/function (_FluentType4) {
        function FluentSymbol(id) {
            return _FluentType4.call(this, id) || this;
        }

        var _proto5 = FluentSymbol.prototype;

        _proto5.toString = function toString() {
            return this.value;
        };

        return FluentSymbol;
    }(FluentType);

    const MAX_PLACEABLES = 100;
    const FSI = "⁨";
    const PDI = "⁩";
    const RLI = "⁦";
    // Unicode bidi isolation characters.
    const UNICODE_BIDI_ISOLATION_CHARS = new Set([FSI, PDI, RLI]);
    /**
     * Fluent pattern parser implementation.
     *
     * The parser builds up the translation object from strings and placeable
     * expressions. These expressions may refer to external arguments which need to
     * be provided at runtime by the developer, or to other entities in the same
     * translation unit. This parser is stateful and needs a scope of variables currently seen
     * while parsing.
     *
     * Parses a Fluent pattern string to a translation object.
     *
     * @param source - The source string with a Fluent pattern.
     * @param opts - Optional configuration object.
     * @returns A translation object.
     */
    function parsePattern(source, opts = {}) {
        const PS = 1; // PATTERN_START
        const PE = 2; // PATTERN_END
        const PLS = 3; // PLACEABLE_START
        const PLE = 4; // PLACEABLE_END
        const MAX_PLACEABLES_COUNT = opts.maxPlaceablesCount || MAX_PLACEABLES;
        let buffer = "";
        let result = [];
        let placeables = 0;
        let inPlaceable = 0;
        let last = PS;
        for (let i = 0; i < source.length; i++) {
            const ch = source[i];
            if (ch === "{" && last !== PLS) {
                if (last === PS && buffer === "") {
                    // Empty pattern or one that starts with a placeable.
                }
                else if (inPlaceable > 0) {
                    buffer += ch;
                }
                else {
                    // Add the part of the buffer before the placeable.
                    result.push(buffer);
                    buffer = "";
                    inPlaceable++;
                    last = PLS;
                    if (++placeables > MAX_PLACEABLES_COUNT) {
                        throw new Error(\`Too many placeables, maximum allowed is \${MAX_PLACEABLES_COUNT}\`);
                    }
                }
            }
            else if (ch === "}" && last !== PE) {
                if (inPlaceable === 0) {
                    buffer += ch;
                }
                else {
                    // End the placeable.
                    inPlaceable--;
                    result.push(parseExpression(buffer));
                    buffer = "";
                    last = PLE;
                }
            }
            else {
                buffer += ch;
                if (last === PLS) {
                    last = PS;
                }
                else if (last === PLE) {
                    last = PE;
                }
            }
        }
        if (inPlaceable > 0) {
            throw new Error("Unclosed placeable");
        }
        if (buffer.length > 0) {
            result.push(buffer);
        }
        return result;
    }
    /**
     * Parse an expression.
     */
    function parseExpression(source) {
        let firstBracket = source.indexOf("[");
        if (firstBracket === -1) {
            // This is a simple reference.
            return createReferenceFromText(source.trim());
        }
        // Check if the part before the bracket is a function reference.
        let functionName = source.substring(0, firstBracket).trim();
        if (functionName.includes(" ")) {
            // Not a valid function name, parse as a regular reference.
            return createReferenceFromText(source.trim());
        }
        // Parse the arguments within the brackets.
        let argsSource = source.substring(firstBracket).trim();
        if (!argsSource.endsWith("]")) {
            // The expression is malformed, treat as a regular reference.
            return createReferenceFromText(source.trim());
        }
        argsSource = argsSource.slice(1, -1).trim();
        let args = {};
        if (argsSource) {
            // Split the arguments by commas, but not inside quotes.
            let inQuotes = false;
            let quoteChar = '';
            let escaped = false;
            let currentArg = "";
            let argParts = [];
            for (let i = 0; i < argsSource.length; i++) {
                const ch = argsSource[i];
                if (escaped) {
                    currentArg += ch;
                    escaped = false;
                    continue;
                }
                if (ch === '\\\\') {
                    escaped = true;
                    continue;
                }
                if ((ch === '"' || ch === "'") && (!inQuotes || quoteChar === ch)) {
                    inQuotes = !inQuotes;
                    if (inQuotes) {
                        quoteChar = ch;
                    }
                    else {
                        quoteChar = '';
                    }
                    currentArg += ch;
                    continue;
                }
                if (ch === ',' && !inQuotes) {
                    argParts.push(currentArg.trim());
                    currentArg = "";
                    continue;
                }
                currentArg += ch;
            }
            if (currentArg.trim()) {
                argParts.push(currentArg.trim());
            }
            // Process each argument and look for named arguments.
            for (const arg of argParts) {
                const equalIndex = arg.indexOf('=');
                if (equalIndex !== -1) {
                    const key = arg.substring(0, equalIndex).trim();
                    const value = arg.substring(equalIndex + 1).trim();
                    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
                        args[key] = value.slice(1, -1);
                    }
                    else if (!isNaN(Number(value))) {
                        args[key] = Number(value);
                    }
                    else {
                        args[key] = createReferenceFromText(value);
                    }
                }
                else if (!isNaN(Number(arg))) {
                    args[arg] = Number(arg);
                }
                else if (arg.startsWith('"') && arg.endsWith('"') || arg.startsWith("'") && arg.endsWith("'")) {
                    args[arg] = arg.slice(1, -1);
                }
                else {
                    args[arg] = createReferenceFromText(arg);
                }
            }
        }
        return { type: 'function', name: functionName, args };
    }
    /**
     * Create a reference object from a string.
     */
    function createReferenceFromText(text) {
        text = text.trim();
        if (text.startsWith("$")) {
            return { type: 'arg', name: text.substring(1) };
        }
        else if (text.startsWith("-")) {
            const parts = text.split(".");
            const termName = parts[0].substring(1);
            return {
                type: 'term',
                name: termName,
                attr: parts.length > 1 ? parts[1] : null
            };
        }
        else {
            const parts = text.split(".");
            return {
                type: 'msg',
                name: parts[0],
                attr: parts.length > 1 ? parts[1] : null
            };
        }
    }

    var FluentBundle = /*#__PURE__*/function () {
        function FluentBundle(locales, options) {
            var _this = this;

            if (options === void 0) {
                options = {};
            }

            this.locales = Array.isArray(locales) ? locales : [locales];
            this._terms = new Map();
            this._messages = new Map();
            this._functions = Object.assign({}, options.functions);
            this._useIsolating = options.useIsolating !== undefined ? options.useIsolating : true;
            this._transform = options.transform;
            this._parsePattern = parsePattern;
            const locale = this.locales[0] ? this.locales[0] : "en-US";
            this._numberFormat = new Intl.NumberFormat(locale);
            
            this.addFunction("NUMBER", function (args, opts) {
                var arg = args[0];

                if (arg instanceof FluentNone) {
                    return new FluentNone();
                }

                if (arg instanceof FluentNumber) {
                    return new FluentNumber(arg.valueOf(), Object.assign({}, arg.opts, opts));
                }

                if (typeof arg === "string") {
                    var value = parseFloat(arg);

                    if (isNaN(value)) {
                        return new FluentNone("Invalid argument to NUMBER");
                    }

                    return new FluentNumber(value, opts);
                }

                if (typeof arg === "number") {
                    return new FluentNumber(arg, opts);
                }

                return new FluentNone("Invalid argument to NUMBER");
            });

            this.addFunction("DATETIME", function (args, opts) {
                var arg = args[0];

                if (arg instanceof FluentNone) {
                    return new FluentNone();
                }

                if (arg instanceof FluentDateTime) {
                    return new FluentDateTime(arg.valueOf(), Object.assign({}, arg.opts, opts));
                }

                if (arg instanceof Date || typeof arg === "number" || typeof arg === "string") {
                    var date = new Date(arg);

                    if (isNaN(date.getTime())) {
                        return new FluentNone("Invalid argument to DATETIME");
                    }

                    return new FluentDateTime(date, opts);
                }

                return new FluentNone("Invalid argument to DATETIME");
            });
        }

        var _proto = FluentBundle.prototype;

        _proto.hasMessage = function hasMessage(id) {
            return this._messages.has(id);
        };

        _proto.getMessage = function getMessage(id) {
            return this._messages.get(id);
        };

        _proto.addResource = function addResource(resource) {
            var _this2 = this;

            var errors = [];

            for (var id in resource.entries) {
                var entry = resource.entries[id];

                if (id.startsWith('-')) {
                    // It's a term
                    this._terms.set(id.slice(1), {
                        value: this._parsePattern(entry.value || "", { maxPlaceablesCount: MAX_PLACEABLES })
                    });

                    // Add attributes
                    for (var name in entry.attributes) {
                        var attrId = id + '.' + name;
                        this._terms.set(attrId.slice(1), {
                            value: this._parsePattern(entry.attributes[name] || "", { maxPlaceablesCount: MAX_PLACEABLES })
                        });
                    }
                } else {
                    // It's a message
                    this._messages.set(id, {
                        value: entry.value ? this._parsePattern(entry.value, { maxPlaceablesCount: MAX_PLACEABLES }) : null
                    });

                    // Add attributes
                    for (var _name in entry.attributes) {
                        var _attrId = id + '.' + _name;
                        this._messages.set(_attrId, {
                            value: this._parsePattern(entry.attributes[_name] || "", { maxPlaceablesCount: MAX_PLACEABLES })
                        });
                    }
                }
            }

            return errors;
        };

        _proto.formatPattern = function formatPattern(pattern, args) {
            if (args === void 0) {
                args = null;
            }

            if (!Array.isArray(pattern)) {
                return "";
            }

            var result = pattern.map(function (part) {
                if (typeof part === "string") {
                    return part;
                }

                return this._resolveExpression(part, args);
            }, this).join("");

            if (this._transform !== undefined) {
                result = this._transform(result);
            }

            return result;
        };

        _proto._resolveExpression = function _resolveExpression(expr, args) {
            if (typeof expr === "string") {
                return expr;
            }

            if (expr.type === "function") {
                var func = this._functions[expr.name];

                if (!func) {
                    return new FluentNone("Unknown function: " + expr.name).toString(this.locales);
                }

                var resolvedArgs = Object.keys(expr.args).map(function (name) {
                    var arg = expr.args[name];
                    
                    if (arg && typeof arg === "object" && arg.type) {
                        return this._resolveReference(arg, args);
                    }
                    
                    return arg;
                }, this);

                var opts = {};
                
                return func(resolvedArgs, opts).toString(this.locales);
            }

            return this._resolveReference(expr, args);
        };

        _proto._resolveReference = function _resolveReference(expr, args) {
            var _this3 = this;

            if (expr.type === "arg") {
                if (!args || !args.hasOwnProperty(expr.name)) {
                    return new FluentNone("Missing argument: " + expr.name).toString(this.locales);
                }

                var arg = args[expr.name];

                if (arg instanceof FluentType) {
                    return arg.toString(this.locales);
                }

                return arg.toString();
            }

            if (expr.type === "msg") {
                var id = expr.name;

                if (expr.attr) {
                    id += "." + expr.attr;
                }

                var message = this._messages.get(id);

                if (!message) {
                    return new FluentNone("Unknown message: " + id).toString(this.locales);
                }

                if (!message.value) {
                    return new FluentNone("No value: " + id).toString(this.locales);
                }

                return this.formatPattern(message.value, args);
            }

            if (expr.type === "term") {
                var _id = expr.name;

                if (expr.attr) {
                    _id += "." + expr.attr;
                }

                var term = this._terms.get(_id);

                if (!term) {
                    return new FluentNone("Unknown term: " + _id).toString(this.locales);
                }

                if (!term.value) {
                    return new FluentNone("No value: " + _id).toString(this.locales);
                }

                return this.formatPattern(term.value, args);
            }

            return new FluentNone("Unknown reference type: " + expr.type).toString(this.locales);
        };

        _proto.addFunction = function addFunction(name, func) {
            this._functions[name] = func;
        };

        return FluentBundle;
    }();

    exports.FluentBundle = FluentBundle;
    exports.FluentDateTime = FluentDateTime;
    exports.FluentNone = FluentNone;
    exports.FluentNumber = FluentNumber;
    exports.FluentResource = FluentResource;
    exports.FluentSymbol = FluentSymbol;
    exports.FluentType = FluentType;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
`;

// проверяем сохранённое состояние при загрузке
browser.storage.local.get('enabled').then(result => {
    translationEnabled = result.enabled !== undefined ? result.enabled : true;
    if (translationEnabled) {
        initTranslation();
    }
});

// слушаем сообщения от popup.js
browser.runtime.onMessage.addListener(function (message) {
    if (message.action === "toggleTranslation") {
        translationEnabled = message.enabled;

        if (translationEnabled) {
            initTranslation();
        } else {
            disableTranslation();
        }
    }
    return Promise.resolve({ response: "Состояние изменено" });
});

// функция выключения перевода
function disableTranslation() {
    if (observer) {
        // останавливаем наблюдатель
        observer.disconnect();
        observer = null;
    }

    window.location.reload();
}

// загружаем библиотеку Fluent напрямую
function injectFluentLibrary() {
    const script = document.createElement('script');
    script.textContent = fluentLibScript;
    document.head.appendChild(script);
    
    // после добавления скрипта создаём модуль переводчика Fluent
    const fluentTranslationModule = `
    // Модуль для работы с Mozilla Fluent локализацией
    const FluentTranslationModule = {
        // хранилище переведённых строк
        _messages: null,

        // получение перевода по ключу
        getMessage(id, args = null) {
            if (!this._messages) {
                return id;
            }

            const message = this._messages.getMessage(id);
            if (!message) {
                return id;
            }

            try {
                const formatted = this._messages.formatPattern(message.value, args);
                return formatted;
            } catch (e) {
                console.warn('Ошибка форматирования сообщения \\'' + id + '\\':', e);
                return id;
            }
        },

        // проверка наличия перевода для ключа
        hasMessage(id) {
            return this._messages && this._messages.hasMessage(id);
        },

        // склонение числа репозиториев 
        formatRepositories(count) {
            return this.getMessage('repositories-one', { count });
        }
    };

    // Экспортирование объекта модуля в глобальную область видимости
    window.FluentTranslationModule = FluentTranslationModule;
    `;
    
    const moduleScript = document.createElement('script');
    moduleScript.textContent = fluentTranslationModule;
    document.head.appendChild(moduleScript);
}

// функция инициализации всего перевода
async function initTranslation() {
    'use strict';
    
    // встраиваем библиотеку Fluent
    injectFluentLibrary();
    
    // Ждём небольшую паузу, чтобы скрипт успел инициализироваться
    await new Promise(resolve => setTimeout(resolve, 100));

    // загружаем файл FTL
    fetch("https://raw.githubusercontent.com/RushanM/GitHub-Russian-Translation/refs/heads/master/%D0%9E%D0%B1%D1%89%D0%B5%D0%B5/ru-ru.ftl")
        .then(response => {
            if (!response.ok) {
                throw new Error("Не удалось загрузить файл FTL");
            }
            return response.text();
        })
        .then(ftlContent => {
            // Инициализируем библиотеку Fluent
            const initScript = document.createElement('script');
            initScript.textContent = `
            (function() {
                try {
                    // проверяем, загружена ли библиотека Fluent
                    if (!window.FluentBundle || !window.FluentBundle.FluentBundle) {
                        console.error('Библиотека Fluent не инициализирована');
                        return;
                    }
                    
                    const { FluentBundle, FluentResource } = window.FluentBundle;
                    
                    // Создаём ресурс и сборку
                    const resource = new FluentResource(${JSON.stringify(ftlContent)});
                    const bundle = new FluentBundle('ru');
                    
                    // Добавляем ресурс в сборку
                    const errors = bundle.addResource(resource);
                    if (errors.length) {
                        console.warn('Ошибки при синтаксическом анализе файла FTL:', errors);
                    }
                    
                    // Сохраняем сборку в модуле
                    if (window.FluentTranslationModule) {
                        window.FluentTranslationModule._messages = bundle;
                        console.log('Fluent успешно загружен и инициализирован');
                    } else {
                        console.error('Модуль FluentTranslationModule не найден');
                    }
                } catch (error) {
                    console.error('Ошибка при инициализации Fluent:', error);
                }
            })();
            `;
            document.head.appendChild(initScript);
            
            // запускаем перевод
            runTranslation();
        })
        .catch(error => {
            console.error('Ошибка при загрузке FTL:', error);
            // загружаем JSON как запасной вариант
            loadJsonFallback();
        });

    // загрузка JSON в случае ошибки с FTL
    function loadJsonFallback() {
        fetch("https://raw.githubusercontent.com/RushanM/GitHub-Russian-Translation/refs/heads/master/%D0%9E%D0%B1%D1%89%D0%B5%D0%B5/rus_p.json")
            .then(response => response.json())
            .then(data => {
                // сохраняем перевод из dashboard для Chat with Copilot
                window.dashboardCopilotTranslation = data.dashboard["Chat with Copilot"];
                // сохраняем перевод из dashboard для Home
                window.dashboardHomeTranslation = data.dashboard["Home"];
                const translations = Object.assign(
                    {},
                    data.dashboard,
                    data.search,
                    data.left_sidebar,
                    data.settings,
                    data.repo_tabs,
                    data.copilot,
                    data.createnew,
                    data.right_sidebar,
                    data.copilot_openwith,
                    data.general
                );
                runTranslationWithJson(translations);
            })
            .catch(error => {
                console.error('Не удалось загрузить JSON переводы:', error);
            });
    }

    // Функция для запуска перевода
    function runTranslation() {
        // Инжектируем код для работы с переводами
        const translationScript = document.createElement('script');
        translationScript.textContent = `
        (function() {
            // Функция для перевода текстовых узлов
            function translateTextNodes() {
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode: function(node) {
                            if (!node.textContent.trim() || 
                                node.parentElement.tagName === 'SCRIPT' || 
                                node.parentElement.tagName === 'STYLE') {
                                return NodeFilter.FILTER_REJECT;
                            }
                            return NodeFilter.FILTER_ACCEPT;
                        }
                    }
                );
                
                let currentNode;
                while (currentNode = walker.nextNode()) {
                    if (isExcludedElement(currentNode.parentElement)) {
                        continue;
                    }
                    
                    const text = currentNode.textContent.trim();
                    if (!text) continue;
                    
                    // пытаемся найти перевод через FluentTranslationModule
                    if (window.FluentTranslationModule && window.FluentTranslationModule.hasMessage) {
                        const translation = window.FluentTranslationModule.getMessage(convertToFluentKey(text));
                        if (translation && translation !== text && translation !== convertToFluentKey(text)) {
                            currentNode.textContent = currentNode.textContent.replace(text, translation);
                            continue;
                        }
                    }
                    
                    // Обрабатываем относительное время
                    translateRelativeTime(currentNode);
                }
            }
            
            // Функция для конвертации текста в ключ Fluent
            function convertToFluentKey(text) {
                // преобразуем ключи Dashboard, Chat with Copilot и т.д. в dashboard-title, dashboard-chat-with-copilot
                switch (text) {
                    case 'Dashboard': return 'dashboard-title';
                    case 'Type / to search': return 'dashboard-type-to-search';
                    case 'Command palette': return 'dashboard-command-palette';
                    case 'Chat with Copilot': return 'dashboard-chat-with-copilot';
                    case 'Open Copilot…': return 'dashboard-open-copilot';
                    case 'Create new...': return 'dashboard-create-new';
                    case 'Your issues': return 'dashboard-your-issues';
                    case 'Your pull requests': return 'dashboard-your-pull-requests';
                    case 'You have no unread notifications': return 'dashboard-no-unread-notifications';
                    case 'You have unread notifications': return 'dashboard-unread-notifications';
                    case 'Top repositories': return 'dashboard-top-repositories';
                    case 'Ask Copilot': return 'dashboard-ask-copilot';
                    case 'Send': return 'dashboard-send';
                    case 'Learn. Collaborate. Grow.': return 'dashboard-learn-collaborate-grow';
                    case 'Find a repository…': return 'dashboard-find-repository';
                    case 'Home': return 'dashboard-home';
                    case 'Filter': return 'dashboard-filter';
                    case 'Issues': return 'left-sidebar-issues';
                    case 'Pull requests': return 'left-sidebar-pull-requests';
                    case 'Projects': return 'left-sidebar-projects';
                    case 'Discussions': return 'left-sidebar-discussions';
                    case 'Codespaces': return 'left-sidebar-codespaces';
                    case 'Copilot': return 'left-sidebar-copilot';
                    case 'Settings': return 'copilot-settings';
                    case 'Sign out': return 'right-sidebar-sign-out';
                    case 'Releases': return 'repo-tabs-releases';
                    case '© 2025 GitHub, Inc.': return 'left-sidebar-copyright';
                    default: return text;
                }
            }
            
            // Функция перевода относительного времени
            function translateRelativeTime(node) {
                const text = node.textContent.trim();
                
                // обрабатываем часы
                const hoursMatch = text.match(/^(\\d+) hours? ago$/);
                if (hoursMatch) {
                    const hours = parseInt(hoursMatch[1]);
                    const translation = \`\${hours} \${hours === 1 ? 'час' : (hours >= 2 && hours <= 4 ? 'часа' : 'часов')} назад\`;
                    node.textContent = node.textContent.replace(text, translation);
                    return;
                }
                
                // обрабатываем минуты
                const minutesMatch = text.match(/^(\\d+) minutes? ago$/);
                if (minutesMatch) {
                    const minutes = parseInt(minutesMatch[1]);
                    const translation = \`\${minutes} \${minutes === 1 ? 'минуту' : (minutes >= 2 && minutes <= 4 ? 'минуты' : 'минут')} назад\`;
                    node.textContent = node.textContent.replace(text, translation);
                    return;
                }
                
                // аналогично для дней, недель и т. д.
                const daysMatch = text.match(/^(\\d+) days? ago$/);
                if (daysMatch) {
                    const days = parseInt(daysMatch[1]);
                    const translation = \`\${days} \${days === 1 ? 'день' : (days >= 2 && days <= 4 ? 'дня' : 'дней')} назад\`;
                    node.textContent = node.textContent.replace(text, translation);
                    return;
                }
                
                const weeksMatch = text.match(/^(\\d+) weeks? ago$/);
                if (weeksMatch) {
                    const weeks = parseInt(weeksMatch[1]);
                    const translation = \`\${weeks} \${weeks === 1 ? 'неделю' : (weeks >= 2 && weeks <= 4 ? 'недели' : 'недель')} назад\`;
                    node.textContent = node.textContent.replace(text, translation);
                    return;
                }
            }
            
            // функция для перевода атрибутов
            function translateAttributes() {
                const elementsWithAttrs = document.querySelectorAll('[aria-label], [placeholder], [title]');
                elementsWithAttrs.forEach(el => {
                    ['aria-label', 'placeholder', 'title'].forEach(attr => {
                        if (el.hasAttribute(attr)) {
                            const text = el.getAttribute(attr).trim();
                            if (window.FluentTranslationModule && window.FluentTranslationModule.hasMessage) {
                                const translation = window.FluentTranslationModule.getMessage(convertToFluentKey(text));
                                if (translation && translation !== text && translation !== convertToFluentKey(text)) {
                                    el.setAttribute(attr, translation);
                                }
                            }
                        }
                    });
                });
            }
            
            // Функция для проверки исключений
            function isExcludedElement(el) {
                if (el.closest('.markdown-heading')) return true;
                if (el.closest('.react-directory-filename-column')) return true;
                return false;
            }
            
            // Форматирование звёздочек (k -> К)
            function formatStarCount() {
                const starCounters = document.querySelectorAll('.Counter.js-social-count');
                starCounters.forEach(counter => {
                    let text = counter.textContent.trim();
                    if (text.includes('k')) {
                        text = text.replace('.', ',').replace('k', 'К');
                        counter.textContent = text;
                    }
                });
            }
            
            // Специальные функции для конкретных элементов интерфейса
            function translateDashboardBreadcrumbs() {
                // переводим основную крошку
                document.querySelectorAll('.AppHeader-context-item-label').forEach(el => {
                    if (el.textContent.trim() === 'Dashboard' && window.FluentTranslationModule) {
                        el.textContent = window.FluentTranslationModule.getMessage('dashboard-title');
                    }
                });
                
                // переводим выпадающее меню
                document.querySelectorAll('.ActionListItem-label').forEach(el => {
                    if (el.textContent.trim() === 'Dashboard' && window.FluentTranslationModule) {
                        el.textContent = window.FluentTranslationModule.getMessage('dashboard-title');
                    }
                });
                
                // переводим tool-tip
                document.querySelectorAll('tool-tip[role="tooltip"], tool-tip.sr-only').forEach(el => {
                    if (el.textContent.trim() === 'Dashboard' && window.FluentTranslationModule) {
                        el.textContent = window.FluentTranslationModule.getMessage('dashboard-title');
                    }
                });
            }
            
            // перевод навигационной панели
            function translateNavigation() {
                document.querySelectorAll('.UnderlineNav-item').forEach(item => {
                    const textSpan = item.querySelector(':scope > span:not(.Counter)');
                    if (textSpan) {
                        const text = textSpan.textContent.trim();
                        const key = convertToFluentKey(text);
                        if (window.FluentTranslationModule && window.FluentTranslationModule.hasMessage && key !== text) {
                            const translation = window.FluentTranslationModule.getMessage(key);
                            if (translation && translation !== text && translation !== key) {
                                textSpan.textContent = translation;
                            }
                        }
                    }
                });
            }
            
            // запускаем начальный перевод
            function translatePage() {
                translateTextNodes();
                translateAttributes();
                translateDashboardBreadcrumbs();
                translateNavigation();
                formatStarCount();
            }
            
            // запускаем перевод
            translatePage();
            
            // настраиваем MutationObserver для отслеживания изменений DOM
            const observer = new MutationObserver(mutations => {
                translatePage();
            });
            
            // наблюдаем за всем документом
            observer.observe(document, {
                childList: true,
                subtree: true,
                attributes: true
            });
            
            // запускаем перевод периодически, чтобы обрабатывать возможные асинхронные обновления
            setInterval(translatePage, 2000);
        })();
        `;
        document.head.appendChild(translationScript);
    }

    // Функция для запуска перевода с использованием JSON
    function runTranslationWithJson(translations) {
        // здесь код для перевода с использованием JSON-словаря
        // (сохраним исходную логику для поддержки запасного варианта)
        
        function getRepositoriesTranslation(count) {
            if (count === 1) return `${count} репозиторий`;
            if (count >= 2 && count <= 4) return `${count} репозитория`;
            return `${count} репозиториев`;
        }

        function formatStarCount() {
            const starCounters = document.querySelectorAll('.Counter.js-social-count');
            starCounters.forEach(counter => {
                let text = counter.textContent.trim();
                if (text.includes('k')) {
                    text = text.replace('.', ',').replace('k', 'К');
                    counter.textContent = text;
                }
            });
        }

        function translateAbsoluteTime(text) {
            // регулярное выражение для извлечения компонентов времени
            const regex = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}), (\d{1,2}):(\d{2})\s*(AM|PM)\s*GMT\+3$/;
            const match = text.match(regex);
            if (match) {
                const monthEn = match[1];
                const day = match[2];
                const year = match[3];
                let hour = parseInt(match[4], 10);
                const minute = match[5];
                const period = match[6];

                // маппирование месяцев
                const monthMap = {
                    'Jan': 'января',
                    'Feb': 'февраля',
                    'Mar': 'марта',
                    'Apr': 'апреля',
                    'May': 'мая',
                    'Jun': 'июня',
                    'Jul': 'июля',
                    'Aug': 'августа',
                    'Sep': 'сентября',
                    'Oct': 'октября',
                    'Nov': 'ноября',
                    'Dec': 'декабря'
                };
                
                // преобразование в 24-часовой формат
                if (period === 'PM' && hour !== 12) {
                    hour += 12;
                } else if (period === 'AM' && hour === 12) {
                    hour = 0;
                }
                
                // форматирование часов с ведущим нулём
                const hourStr = hour < 10 ? '0' + hour : hour.toString();
                const monthRu = monthMap[monthEn] || monthEn;
                
                return `${day} ${monthRu} ${year}, ${hourStr}:${minute} по московскому времени`;
            }
            return text;
        }

        function isExcludedElement(el) {
            if (el.closest('.markdown-heading')) return true;
            if (el.closest('.react-directory-filename-column')) return true;
            return false;
        }

        function translateTextContent() {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        if (!node.textContent.trim() || 
                            node.parentElement.tagName === 'SCRIPT' || 
                            node.parentElement.tagName === 'STYLE') {
                            return NodeFilter.FILTER_REJECT;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );
            
            let currentNode;
            while (currentNode = walker.nextNode()) {
                if (isExcludedElement(currentNode.parentElement)) {
                    continue;
                }
                
                const text = currentNode.textContent.trim();
                if (!text) continue;
                
                // проверяем, есть ли прямой перевод
                if (translations[text]) {
                    currentNode.textContent = currentNode.textContent.replace(text, translations[text]);
                    continue;
                }
                
                // обрабатываем часы
                const hoursMatch = text.match(/^(\d+) hours? ago$/);
                if (hoursMatch) {
                    const hours = parseInt(hoursMatch[1]);
                    const translation = `${hours} ${hours === 1 ? 'час' : (hours >= 2 && hours <= 4 ? 'часа' : 'часов')} назад`;
                    currentNode.textContent = currentNode.textContent.replace(text, translation);
                    continue;
                }
                
                // обрабатываем минуты
                const minutesMatch = text.match(/^(\d+) minutes? ago$/);
                if (minutesMatch) {
                    const minutes = parseInt(minutesMatch[1]);
                    const translation = `${minutes} ${minutes === 1 ? 'минуту' : (minutes >= 2 && minutes <= 4 ? 'минуты' : 'минут')} назад`;
                    currentNode.textContent = currentNode.textContent.replace(text, translation);
                    continue;
                }
                
                // аналогично для дней, недель и т. д.
                const daysMatch = text.match(/^(\d+) days? ago$/);
                if (daysMatch) {
                    const days = parseInt(daysMatch[1]);
                    const translation = `${days} ${days === 1 ? 'день' : (days >= 2 && days <= 4 ? 'дня' : 'дней')} назад`;
                    currentNode.textContent = currentNode.textContent.replace(text, translation);
                    continue;
                }
                
                const weeksMatch = text.match(/^(\d+) weeks? ago$/);
                if (weeksMatch) {
                    const weeks = parseInt(weeksMatch[1]);
                    const translation = `${weeks} ${weeks === 1 ? 'неделю' : (weeks >= 2 && weeks <= 4 ? 'недели' : 'недель')} назад`;
                    currentNode.textContent = currentNode.textContent.replace(text, translation);
                    continue;
                }
            }
        }

        function translateAttributes() {
            const elementsWithAttrs = document.querySelectorAll('[aria-label], [placeholder], [title]');
            elementsWithAttrs.forEach(el => {
                ['aria-label', 'placeholder', 'title'].forEach(attr => {
                    if (el.hasAttribute(attr)) {
                        const text = el.getAttribute(attr).trim();
                        if (translations[text]) {
                            el.setAttribute(attr, translations[text]);
                        }
                    }
                });
            });
        }

        function translateDashboardBreadcrumbs() {
            // переводим основную крошку
            document.querySelectorAll('.AppHeader-context-item-label').forEach(el => {
                if (el.textContent.trim() === 'Dashboard' && translations['Dashboard']) {
                    el.textContent = translations['Dashboard'];
                }
            });
            
            // переводим выпадающее меню
            document.querySelectorAll('.ActionListItem-label').forEach(el => {
                if (el.textContent.trim() === 'Dashboard' && translations['Dashboard']) {
                    el.textContent = translations['Dashboard'];
                }
            });
            
            // переводим tool-tip
            document.querySelectorAll('tool-tip[role="tooltip"], tool-tip.sr-only').forEach(el => {
                if (el.textContent.trim() === 'Dashboard' && translations['Dashboard']) {
                    el.textContent = translations['Dashboard'];
                }
            });
        }

        // запускаем начальный перевод
        translateTextContent();
        translateAttributes();
        translateDashboardBreadcrumbs();
        formatStarCount();
        
        // настраиваем MutationObserver для отслеживания изменений DOM
        observer = new MutationObserver(() => {
            translateTextContent();
            translateAttributes();
            translateDashboardBreadcrumbs();
            formatStarCount();
        });
        
        // наблюдаем за всем документом
        observer.observe(document, {
            childList: true,
            subtree: true,
            attributes: true
        });
        
        // запускаем перевод периодически, чтобы обрабатывать возможные асинхронные обновления
        setInterval(() => {
            translateTextContent();
            translateAttributes();
            translateDashboardBreadcrumbs();
            formatStarCount();
        }, 2000);
    }
}
