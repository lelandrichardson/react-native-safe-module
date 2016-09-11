import { NativeModules, NativeEventEmitter } from 'react-native';
import dedent from 'dedent';

// const AccountModule = SafeModule.create({
//   moduleName: ['AccountModule', 'AirbnbAccountModuleOldName'],
//   isEventEmitter: true,
//   getVersion: module => module.VERSION,
//   onInit: (module, version) => {},
//   onNoModuleFound: () => {},
//   onVersionFound: (version) => {},
//   onOverrideUsed: (version, overrideName) => {},
//   onOverrideCalled: (version, overrideName) => {},
//   mock: {
//     push: () => Promise.resolve(),
//     pushNative: () => Promise.resolve(),
//     setTitle: noop,
//   },
//   overrides: {
//     7: {
//       push: old => (id, props, options) => {
//         return old(id, props, !!options.animated);
//       },
//     },
//   },
// });

const hasOwnProperty = Object.prototype.hasOwnProperty;

const moduleWithName = (nameOrArray) => {
  if (!nameOrArray) return null;
  if (Array.isArray(nameOrArray)) return nameOrArray.find(moduleWithName);
  return NativeModules[nameOrArray];
};

const getPrimaryName = (nameOrArray) => {
  return Array.isArray(nameOrArray) ? getPrimaryName(nameOrArray[0]) : nameOrArray;
};

const getModule = (moduleNameOrNames, mock) => {
  const module = moduleWithName(moduleNameOrNames);
  // TODO: in __DEV__, we should console.warn if anything but the first module got used.
  return module || mock;
};

const defaultGetVersion = module => module.VERSION;


const create = function SafeModuleCreate(options) {
  if (!options) {
    throw new Error(dedent`
      SafeModule.create(...) was invoked without any options parameter.
    `);
  }
  const {
    moduleName,
    mock,
    isEventEmitter,
    versionOverrides,
    } = options;
  let {
    getVersion,
    } = options;

  if (!getVersion) {
    getVersion = defaultGetVersion;
  }

  if (!moduleName) {
    throw new Error(`
      SafeModule.create(...) requires a moduleName property to be specified.
    `);
  }
  const MODULE_NAME = getPrimaryName(moduleName);

  if (!mock) {
    throw new Error(dedent`
      Missing a "mock" parameter.
    `);
  }

  const result = {};

  const module = getModule(moduleName, mock);
  const version = getVersion(module);
  const overrides = versionOverrides[version];

  if (__DEV__) {
    Object.keys(module).forEach(key => {
      if (!hasOwnProperty.call(mock, key)) {
        console.warn(dedent`
          ReactNative.NativeModules.${MODULE_NAME}.${key} did not have a corresponding prop defined
          in the mock provided to SafeModule.
        `);
      }
    });
  }

  if (isEventEmitter) {
    // TODO(lmr): should this be put inside of a try/catch?
    result.emitter = new NativeEventEmitter(module);
  }

  if (overrides) {
    Object.keys(overrides).forEach(key => {
      if (typeof overrides[key] === 'function') {
        overrides[key] = overrides[key](module[key], module);
      }
    });
  }

  Object.assign(
    result,
    mock,
    module,
    overrides
  );

  return result;
};

const SafeModule = { create };

module.exports = SafeModule;
