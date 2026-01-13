import {
  __commonJS
} from "./chunk-H2SRQSE4.js";

// node_modules/foldline/foldline.js
var require_foldline = __commonJS({
  "node_modules/foldline/foldline.js"(exports, module) {
    var CRLF = "\r\n";
    var SP = " ";
    var MAX_LINE_LENGTH = 998;
    var DEFAULT_LINE_LENGTH = 78;
    var MIN_LINE_LENGTH = 2;
    function foldLine(input, maxLength, hardWrap) {
      if (maxLength != null && maxLength < MIN_LINE_LENGTH) {
        throw new Error("Maximum length must not be less than " + MIN_LINE_LENGTH);
      }
      if (maxLength != null && maxLength > MAX_LINE_LENGTH) {
        throw new Error("Maximum length must not exceed " + MAX_LINE_LENGTH);
      }
      maxLength = maxLength || DEFAULT_LINE_LENGTH;
      input = input.replace(/[\r\n]+/g, "");
      if (input.length <= maxLength) {
        return input;
      }
      var output = "";
      var index = 0;
      var nextIndex = 0;
      var length = input.length;
      var line = 0;
      var trim = 0;
      while (index < length) {
        if (!hardWrap && ~(nextIndex = input.lastIndexOf(SP, index + maxLength))) {
          if (nextIndex > index) {
            output += input.slice(index, nextIndex) + CRLF + SP;
            index = nextIndex;
          } else {
            output += input.slice(index, index + maxLength - trim) + CRLF + SP;
            index = index + maxLength - trim;
            hardWrap = true;
          }
        } else {
          output += input.slice(index, index + maxLength - trim) + CRLF + SP;
          index = index + maxLength - trim;
        }
        if (length - index < maxLength) {
          output += input.slice(index);
          break;
        }
        if (line === 0) {
          trim = 1;
        }
        line++;
      }
      return output;
    }
    foldLine.unfold = function unfold(input) {
      return input.replace(/\r\n\s/gm, "");
    };
    module.exports = foldLine;
  }
});

// node_modules/camelcase/index.js
var require_camelcase = __commonJS({
  "node_modules/camelcase/index.js"(exports, module) {
    "use strict";
    var preserveCamelCase = (string) => {
      let isLastCharLower = false;
      let isLastCharUpper = false;
      let isLastLastCharUpper = false;
      for (let i = 0; i < string.length; i++) {
        const character = string[i];
        if (isLastCharLower && /[a-zA-Z]/.test(character) && character.toUpperCase() === character) {
          string = string.slice(0, i) + "-" + string.slice(i);
          isLastCharLower = false;
          isLastLastCharUpper = isLastCharUpper;
          isLastCharUpper = true;
          i++;
        } else if (isLastCharUpper && isLastLastCharUpper && /[a-zA-Z]/.test(character) && character.toLowerCase() === character) {
          string = string.slice(0, i - 1) + "-" + string.slice(i - 1);
          isLastLastCharUpper = isLastCharUpper;
          isLastCharUpper = false;
          isLastCharLower = true;
        } else {
          isLastCharLower = character.toLowerCase() === character && character.toUpperCase() !== character;
          isLastLastCharUpper = isLastCharUpper;
          isLastCharUpper = character.toUpperCase() === character && character.toLowerCase() !== character;
        }
      }
      return string;
    };
    var camelCase = (input, options) => {
      if (!(typeof input === "string" || Array.isArray(input))) {
        throw new TypeError("Expected the input to be `string | string[]`");
      }
      options = Object.assign({
        pascalCase: false
      }, options);
      const postProcess = (x) => options.pascalCase ? x.charAt(0).toUpperCase() + x.slice(1) : x;
      if (Array.isArray(input)) {
        input = input.map((x) => x.trim()).filter((x) => x.length).join("-");
      } else {
        input = input.trim();
      }
      if (input.length === 0) {
        return "";
      }
      if (input.length === 1) {
        return options.pascalCase ? input.toUpperCase() : input.toLowerCase();
      }
      const hasUpperCase = input !== input.toLowerCase();
      if (hasUpperCase) {
        input = preserveCamelCase(input);
      }
      input = input.replace(/^[_.\- ]+/, "").toLowerCase().replace(/[_.\- ]+(\w|$)/g, (_, p1) => p1.toUpperCase()).replace(/\d+(\w|$)/g, (m) => m.toUpperCase());
      return postProcess(input);
    };
    module.exports = camelCase;
    module.exports.default = camelCase;
  }
});

// node_modules/vcf/lib/property.js
var require_property = __commonJS({
  "node_modules/vcf/lib/property.js"(exports, module) {
    function Property(field, value, params) {
      if (!(this instanceof Property))
        return new Property(value);
      if (params != null)
        Object.assign(this, params);
      this._field = field;
      this._data = value;
      Object.defineProperty(this, "_field", { enumerable: false });
      Object.defineProperty(this, "_data", { enumerable: false });
    }
    Property.fromJSON = function(data) {
      var field = data[0];
      var params = data[1];
      if (!/text/i.test(data[2]))
        params.value = data[2];
      var value = Array.isArray(data[3]) ? data[3].join(";") : data[3];
      return new Property(field, value, params);
    };
    function capitalDashCase(value) {
      return value.replace(/([A-Z])/g, "-$1").toUpperCase();
    }
    Property.prototype = {
      constructor: Property,
      /**
       * Check whether the property is of a given type
       * @param  {String}  type
       * @return {Boolean}
       */
      is: function(type) {
        type = (type + "").toLowerCase();
        return Array.isArray(this.type) ? this.type.indexOf(type) >= 0 : this.type === type;
      },
      /**
       * Check whether the property is empty
       * @return {Boolean}
       */
      isEmpty: function() {
        return this._data == null && Object.keys(this).length === 0;
      },
      /**
       * Clone the property
       * @return {Property}
       */
      clone: function() {
        return new Property(this._field, this._data, this);
      },
      /**
       * Format the property as vcf with given version
       * @param  {String} version
       * @return {String}
       */
      toString: function(version) {
        var propName = (this.group ? this.group + "." : "") + capitalDashCase(this._field);
        var keys = Object.keys(this);
        var params = [];
        for (var i = 0; i < keys.length; i++) {
          if (keys[i] === "group") continue;
          switch (propName) {
            case "TEL":
            case "ADR":
            case "EMAIL":
              if (version === "2.1") {
                if (Array.isArray(this[keys[i]]))
                  params.push(this[keys[i]].join(";"));
                else
                  params.push(this[keys[i]]);
              } else
                params.push(capitalDashCase(keys[i]) + "=" + this[keys[i]]);
              break;
            default:
              params.push(capitalDashCase(keys[i]) + "=" + this[keys[i]]);
          }
        }
        if (version === "2.1" || version === "3.0")
          return propName + (params.length ? ";" + params.join(";").toUpperCase() : params.toString().toUpperCase()) + ":" + (Array.isArray(this._data) ? this._data.join(";") : this._data);
        else
          return propName + (params.length ? ";" + params.join(";") : params) + ":" + (Array.isArray(this._data) ? this._data.join(";") : this._data);
      },
      /**
       * Get the property's value
       * @return {String}
       */
      valueOf: function() {
        return this._data;
      },
      /**
       * Format the property as jCard data
       * @return {Array}
       */
      toJSON: function() {
        var params = Object.assign({}, this);
        if (params.value === "text") {
          params.value = void 0;
          delete params.value;
        }
        var data = [this._field, params, this.value || "text"];
        switch (this._field) {
          default:
            data.push(this._data);
            break;
          case "adr":
          case "n":
            data.push(this._data.split(";"));
        }
        return data;
      }
    };
    module.exports = Property;
  }
});

// node_modules/vcf/lib/parse-lines.js
var require_parse_lines = __commonJS({
  "node_modules/vcf/lib/parse-lines.js"(exports, module) {
    var camelCase = require_camelcase();
    var Property = require_property();
    function set(object, key, value) {
      if (Array.isArray(object[key])) {
        object[key].push(value);
      } else if (object[key] != null) {
        object[key] = [object[key], value];
      } else {
        object[key] = value;
      }
    }
    function createParams(params, param) {
      var parts = param.split("=");
      var k = camelCase(parts[0]);
      var value = parts[1];
      if (value == null || value === "") {
        value = parts[0];
        k = "type";
      }
      if (k === "type") {
        if (value[0] === '"' && value[value.length - 1] === '"' && value.indexOf(",") !== -1)
          value = value.slice(1, -1);
        value.toLowerCase().split(",").forEach(function(value2) {
          set(params, k, value2);
        });
        return params;
      }
      set(params, k, value);
      return params;
    }
    function parseLines(lines) {
      var data = {};
      var line = null;
      var pattern = /^([^;:]+)((?:;(?:[^;:]+))*)(?:\:([\s\S]+))?$/i;
      var len = lines.length - 1;
      for (var i = 1; i < len; i++) {
        line = lines[i];
        var match = pattern.exec(line);
        if (!match) continue;
        var name = match[1].split(".");
        var property = name.pop();
        var group = name.pop();
        var value = match[3];
        var params = match[2] ? match[2].replace(/^;|;$/g, "").split(";") : [];
        var propParams = params.reduce(createParams, group ? { group } : {});
        var propName = camelCase(property);
        var propVal = new Property(propName, value, propParams);
        set(data, propName, propVal);
      }
      return data;
    }
    module.exports = parseLines;
  }
});

// node_modules/vcf/lib/vcard.js
var require_vcard = __commonJS({
  "node_modules/vcf/lib/vcard.js"(exports, module) {
    function vCard() {
      if (!(this instanceof vCard))
        return new vCard();
      this.version = vCard.versions[vCard.versions.length - 1];
      this.data = {};
    }
    vCard.mimeType = "text/vcard";
    vCard.extension = ".vcf";
    vCard.versions = ["2.1", "3.0", "4.0"];
    vCard.EOL = "\r\n";
    vCard.foldLine = require_foldline();
    vCard.normalize = function(input) {
      return (input + "").replace(/^[\s\r\n]+|[\s\r\n]+$/g, "").replace(/(\r\n)[\x09\x20]?(\r\n)|$/g, "$1").replace(/\r\n[\x20\x09]/g, "");
    };
    vCard.isSupported = function(version) {
      return /^\d\.\d$/.test(version) && vCard.versions.indexOf(version) !== -1;
    };
    vCard.parse = function(value) {
      var objects = (value + "").split(/(?=BEGIN\:VCARD)/gi);
      var cards = [];
      for (var i = 0; i < objects.length; i++) {
        cards.push(new vCard().parse(objects[i]));
      }
      return cards;
    };
    vCard.parseLines = require_parse_lines();
    vCard.fromJSON = function(jcard) {
      jcard = typeof jcard === "string" ? JSON.parse(jcard) : jcard;
      if (jcard == null || !Array.isArray(jcard))
        return new vCard();
      if (!/vcard/i.test(jcard[0]))
        throw new Error("Object not in jCard format");
      var card = new vCard();
      jcard[1].forEach(function(prop) {
        card.addProperty(vCard.Property.fromJSON(prop));
      });
      return card;
    };
    vCard.format = function(card, version) {
      version = version || card.version || vCard.versions[vCard.versions.length - 1];
      if (!vCard.isSupported(version))
        throw new Error('Unsupported vCard version "' + version + '"');
      var vcf = [];
      vcf.push("BEGIN:VCARD");
      vcf.push("VERSION:" + version);
      var props = Object.keys(card.data);
      var prop = "";
      for (var i = 0; i < props.length; i++) {
        if (props[i] === "version") continue;
        prop = card.data[props[i]];
        if (Array.isArray(prop)) {
          for (var k = 0; k < prop.length; k++) {
            if (prop[k].isEmpty()) continue;
            vcf.push(vCard.foldLine(prop[k].toString(version), 75));
          }
        } else if (!prop.isEmpty()) {
          vcf.push(vCard.foldLine(prop.toString(version), 75));
        }
      }
      vcf.push("END:VCARD");
      return vcf.join(vCard.EOL);
    };
    vCard.Property = require_property();
    vCard.prototype = {
      constructor: vCard,
      /**
       * Get a vCard property
       * @param  {String} key
       * @return {Object|Array}
       */
      get: function(key) {
        if (this.data[key] == null) {
          return this.data[key];
        }
        if (Array.isArray(this.data[key])) {
          return this.data[key].map(function(prop) {
            return prop.clone();
          });
        } else {
          return this.data[key].clone();
        }
      },
      /**
       * Set a vCard property
       * @param {String} key
       * @param {String} value
       * @param {Object} params
       */
      set: function(key, value, params) {
        return this.setProperty(new vCard.Property(key, value, params));
      },
      /**
       * Add a vCard property
       * @param {String} key
       * @param {String} value
       * @param {Object} params
       */
      add: function(key, value, params) {
        var prop = new vCard.Property(key, value, params);
        this.addProperty(prop);
        return this;
      },
      /**
       * Set a vCard property from an already
       * constructed vCard.Property
       * @param {vCard.Property} prop
       */
      setProperty: function(prop) {
        this.data[prop._field] = prop;
        return this;
      },
      /**
       * Add a vCard property from an already
       * constructed vCard.Property
       * @param {vCard.Property} prop
       */
      addProperty: function(prop) {
        var key = prop._field;
        if (Array.isArray(this.data[key])) {
          this.data[key].push(prop);
        } else if (this.data[key] != null) {
          this.data[key] = [this.data[key], prop];
        } else {
          this.data[key] = prop;
        }
        return this;
      },
      /**
       * Parse a vcf formatted vCard
       * @param  {String} value
       * @return {vCard}
       */
      parse: function(value) {
        var lines = vCard.normalize(value).split(/\r\n/g);
        var begin = lines[0];
        var version = lines[1];
        var end = lines[lines.length - 1];
        const regexp_version = /VERSION:\d\.\d/i;
        if (!/BEGIN:VCARD/i.test(begin))
          throw new SyntaxError('Invalid vCard: Expected "BEGIN:VCARD" but found "' + begin + '"');
        if (!/END:VCARD/i.test(end))
          throw new SyntaxError('Invalid vCard: Expected "END:VCARD" but found "' + end + '"');
        if (!regexp_version.test(version)) {
          if (!(version = lines.find((line) => regexp_version.test(line))))
            throw new SyntaxError('Invalid vCard: Expected "VERSION:\\d.\\d" but none found');
        }
        this.version = version.substring(8, 11);
        if (!vCard.isSupported(this.version))
          throw new Error('Unsupported version "' + this.version + '"');
        this.data = vCard.parseLines(lines);
        return this;
      },
      /**
       * Format the vCard as vcf with given version
       * @param  {String} version
       * @param  {String} charset
       * @return {String}
       */
      toString: function(version, charset) {
        version = version || this.version;
        return vCard.format(this, version);
      },
      /**
       * Format the card as jCard
       * @param {String} version='4.0'
       * @return {Array} jCard
       */
      toJCard: function(version) {
        version = version || "4.0";
        var keys = Object.keys(this.data);
        var data = [["version", {}, "text", version]];
        var prop = null;
        for (var i = 0; i < keys.length; i++) {
          if (keys[i] === "version") continue;
          prop = this.data[keys[i]];
          if (Array.isArray(prop)) {
            for (var k = 0; k < prop.length; k++) {
              data.push(prop[k].toJSON());
            }
          } else {
            data.push(prop.toJSON());
          }
        }
        return ["vcard", data];
      },
      /**
       * Format the card as jCard
       * @return {Array} jCard
       */
      toJSON: function() {
        return this.toJCard(this.version);
      }
    };
    module.exports = vCard;
  }
});
export default require_vcard();
//# sourceMappingURL=vcf.js.map
