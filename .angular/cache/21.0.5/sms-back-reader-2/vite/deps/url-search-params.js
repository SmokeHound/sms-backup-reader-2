import {
  __commonJS
} from "./chunk-H2SRQSE4.js";

// node_modules/url-search-params/build/url-search-params.node.js
var require_url_search_params_node = __commonJS({
  "node_modules/url-search-params/build/url-search-params.node.js"(exports, module) {
    function URLSearchParams(query) {
      var index, key, value, pairs, i, length, dict = /* @__PURE__ */ Object.create(null);
      this[secret] = dict;
      if (!query) return;
      if (typeof query === "string") {
        if (query.charAt(0) === "?") {
          query = query.slice(1);
        }
        for (pairs = query.split("&"), i = 0, length = pairs.length; i < length; i++) {
          value = pairs[i];
          index = value.indexOf("=");
          if (-1 < index) {
            appendTo(
              dict,
              decode(value.slice(0, index)),
              decode(value.slice(index + 1))
            );
          } else if (value.length) {
            appendTo(
              dict,
              decode(value),
              ""
            );
          }
        }
      } else {
        if (isArray(query)) {
          for (i = 0, length = query.length; i < length; i++) {
            value = query[i];
            appendTo(dict, value[0], value[1]);
          }
        } else {
          for (key in query) {
            appendTo(dict, key, query[key]);
          }
        }
      }
    }
    var isArray = Array.isArray;
    var URLSearchParamsProto = URLSearchParams.prototype;
    var find = /[!'\(\)~]|%20|%00/g;
    var plus = /\+/g;
    var replace = {
      "!": "%21",
      "'": "%27",
      "(": "%28",
      ")": "%29",
      "~": "%7E",
      "%20": "+",
      "%00": "\0"
    };
    var replacer = function(match) {
      return replace[match];
    };
    var secret = "__URLSearchParams__:" + Math.random();
    function appendTo(dict, name, value) {
      if (name in dict) {
        dict[name].push("" + value);
      } else {
        dict[name] = isArray(value) ? value : ["" + value];
      }
    }
    function decode(str) {
      return decodeURIComponent(str.replace(plus, " "));
    }
    function encode(str) {
      return encodeURIComponent(str).replace(find, replacer);
    }
    URLSearchParamsProto.append = function append(name, value) {
      appendTo(this[secret], name, value);
    };
    URLSearchParamsProto.delete = function del(name) {
      delete this[secret][name];
    };
    URLSearchParamsProto.get = function get(name) {
      var dict = this[secret];
      return name in dict ? dict[name][0] : null;
    };
    URLSearchParamsProto.getAll = function getAll(name) {
      var dict = this[secret];
      return name in dict ? dict[name].slice(0) : [];
    };
    URLSearchParamsProto.has = function has(name) {
      return name in this[secret];
    };
    URLSearchParamsProto.set = function set(name, value) {
      this[secret][name] = ["" + value];
    };
    URLSearchParamsProto.forEach = function forEach(callback, thisArg) {
      var dict = this[secret];
      Object.getOwnPropertyNames(dict).forEach(function(name) {
        dict[name].forEach(function(value) {
          callback.call(thisArg, value, name, this);
        }, this);
      }, this);
    };
    URLSearchParamsProto.toJSON = function toJSON() {
      return {};
    };
    URLSearchParamsProto.toString = function toString() {
      var dict = this[secret], query = [], i, key, name, value;
      for (key in dict) {
        name = encode(key);
        for (i = 0, value = dict[key]; i < value.length; i++) {
          query.push(name + "=" + encode(value[i]));
        }
      }
      return query.join("&");
    };
    URLSearchParams = module.exports = global.URLSearchParams || URLSearchParams;
    (function(URLSearchParamsProto2) {
      var iterable = (function() {
        try {
          return !!Symbol.iterator;
        } catch (error) {
          return false;
        }
      })();
      if (!("forEach" in URLSearchParamsProto2)) {
        URLSearchParamsProto2.forEach = function forEach(callback, thisArg) {
          var names = /* @__PURE__ */ Object.create(null);
          this.toString().replace(/=[\s\S]*?(?:&|$)/g, "=").split("=").forEach(function(name) {
            if (!name.length || name in names) return;
            (names[name] = this.getAll(name)).forEach(function(value) {
              callback.call(thisArg, value, name, this);
            }, this);
          }, this);
        };
      }
      if (!("keys" in URLSearchParamsProto2)) {
        URLSearchParamsProto2.keys = function keys() {
          var items = [];
          this.forEach(function(value, name) {
            items.push(name);
          });
          var iterator = {
            next: function() {
              var value = items.shift();
              return { done: value === void 0, value };
            }
          };
          if (iterable) {
            iterator[Symbol.iterator] = function() {
              return iterator;
            };
          }
          return iterator;
        };
      }
      if (!("values" in URLSearchParamsProto2)) {
        URLSearchParamsProto2.values = function values() {
          var items = [];
          this.forEach(function(value) {
            items.push(value);
          });
          var iterator = {
            next: function() {
              var value = items.shift();
              return { done: value === void 0, value };
            }
          };
          if (iterable) {
            iterator[Symbol.iterator] = function() {
              return iterator;
            };
          }
          return iterator;
        };
      }
      if (!("entries" in URLSearchParamsProto2)) {
        URLSearchParamsProto2.entries = function entries() {
          var items = [];
          this.forEach(function(value, name) {
            items.push([name, value]);
          });
          var iterator = {
            next: function() {
              var value = items.shift();
              return { done: value === void 0, value };
            }
          };
          if (iterable) {
            iterator[Symbol.iterator] = function() {
              return iterator;
            };
          }
          return iterator;
        };
      }
      if (iterable && !(Symbol.iterator in URLSearchParamsProto2)) {
        URLSearchParamsProto2[Symbol.iterator] = URLSearchParamsProto2.entries;
      }
      if (!("sort" in URLSearchParamsProto2)) {
        URLSearchParamsProto2.sort = function sort() {
          var entries = this.entries(), entry = entries.next(), done = entry.done, keys = [], values = /* @__PURE__ */ Object.create(null), i, key, value;
          while (!done) {
            value = entry.value;
            key = value[0];
            keys.push(key);
            if (!(key in values)) {
              values[key] = [];
            }
            values[key].push(value[1]);
            entry = entries.next();
            done = entry.done;
          }
          keys.sort();
          for (i = 0; i < keys.length; i++) {
            this.delete(keys[i]);
          }
          for (i = 0; i < keys.length; i++) {
            key = keys[i];
            this.append(key, values[key].shift());
          }
        };
      }
    })(URLSearchParams.prototype);
  }
});
export default require_url_search_params_node();
//# sourceMappingURL=url-search-params.js.map
