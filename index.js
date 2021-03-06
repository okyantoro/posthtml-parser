'use strict';

var htmlparser = require('htmlparser2');
var isObject = require('isobject');
var objectAssign = require('object-assign');

/**
 * @see https://github.com/fb55/htmlparser2/wiki/Parser-options
 */
var defaultOptions = {lowerCaseTags: false, lowerCaseAttributeNames: false};

var defaultDirectives = [{name: '!doctype', start: '<', end: '>'}];

/**
 * Parse html to PostHTMLTree
 * @param  {String} html
 * @param  {Object} [options=defaultOptions]
 * @return {PostHTMLTree}
 */
function postHTMLParser(html, options) {
    var bufArray = [],
        results = [];

    bufArray.last = function() {
        return this[this.length - 1];
    };

    function parserDirective(name, data) {
        var directives = options.directives || defaultDirectives;
        var last = bufArray.last();

        for (var i = 0; i < directives.length; i++) {
            var directive = directives[i];
            var directiveText = directive.start + data + directive.end;

            if (name.toLowerCase() === directive.name) {
                if (!last) {
                    results.push(directiveText);
                    return;
                }

                last.content || (last.content = []);
                last.content.push(directiveText);
            }
        }
    }

    function normalizeArributes(attrs) {
        var result = {};
        Object.keys(attrs).forEach(function(key) {
            var obj = {};
                obj[key] = attrs[key].replace(/&quot;/g, '"');
            objectAssign(result, obj);
        });

        return result;
    }

    var parser = new htmlparser.Parser({
        onprocessinginstruction: parserDirective,
        oncomment: function(data) {
            var comment = '<!--' + data + '-->',
                last = bufArray.last();

            if (!last) {
                results.push(comment);
                return;
            }

            last.content || (last.content = []);
            last.content.push(comment);
        },
        onopentag: function(tag, attrs) {
            var buf = { tag: tag };

            if (Object.keys(attrs).length) {
                buf.attrs = normalizeArributes(attrs);
            }

            bufArray.push(buf);
        },
        onclosetag: function() {
            var buf = bufArray.pop();

            if (!bufArray.length) {
                results.push(buf);
                return;
            }

            var last = bufArray.last();
            if (!Array.isArray(last.content)) {
                last.content = [];
            }

            last.content.push(buf);
        },
        ontext: function(text) {
            var last = bufArray.last();
            if (!last) {
                results.push(text);
                return;
            }

            last.content || (last.content = []);
            last.content.push(text);
        }
    }, options || defaultOptions);

    parser.write(html);
    parser.end();

    return results;
}

function parserWrapper() {
    var option;

    function parser(html) {
        var opt = option || defaultOptions;
        return postHTMLParser(html, opt);
    }

    if (arguments.length === 1 && isObject(arguments[0])) {
        option = arguments[0];
        return parser;
    }

    option = arguments[1];
    return parser(arguments[0]);
}

module.exports = parserWrapper;
module.exports.defaultOptions = defaultOptions;
module.exports.defaultDirectives = defaultDirectives;
