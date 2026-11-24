// Reuse the web app's shared logic (../src/lib) in the native app.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const shared = path.resolve(projectRoot, "../src/lib");
const config = getDefaultConfig(projectRoot);

config.watchFolders = [shared];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

// Shared modules read their city settings from "./city", which uses Vite's
// import.meta.env. In the app they get mobile/src/city.ts instead.
const nativeCity = path.resolve(projectRoot, "src/city.ts");
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const from = context.originModulePath || "";
  if (from.startsWith(shared) && (moduleName === "./city" || moduleName === "./city.ts")) {
    return { type: "sourceFile", filePath: nativeCity };
  }
  return upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
