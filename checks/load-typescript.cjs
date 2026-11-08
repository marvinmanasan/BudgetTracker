// Run app logic under Node while replacing only the native Expo bridge in tests.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

exports.createLoader = (overrides = {}) => {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    const localRequire = (name) => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name.startsWith(".")) {
        const target = path.resolve(path.dirname(filename), name);
        return load(target.endsWith(".ts") ? target : `${target}.ts`);
      }
      return require(name);
    };
    vm.runInThisContext(`(function(require, module, exports) {${code}\n})`, { filename })(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
};
