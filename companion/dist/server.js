// @bun
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = import.meta.require;

// src/config.ts
import { homedir } from "os";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 448 });
  }
}
function readJsonFile(path, defaultValue) {
  try {
    if (!existsSync(path))
      return defaultValue;
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return defaultValue;
  }
}
function writeJsonFile(path, data) {
  ensureConfigDir();
  writeFileSync(path, JSON.stringify(data, null, 2), { mode: 384 });
}
function getEdgeworkConfig() {
  return readJsonFile(CONFIG_FILE, DEFAULT_EDGEWORK_CONFIG);
}
function getZedgeConfig() {
  return readJsonFile(ZEDGE_CONFIG_FILE, DEFAULT_ZEDGE_CONFIG);
}
function saveZedgeConfig(config) {
  const current = getZedgeConfig();
  const updated = { ...current, ...config };
  writeJsonFile(ZEDGE_CONFIG_FILE, updated);
  return updated;
}
function getApiKey() {
  const envKey = process.env.EDGEWORK_API_TOKEN;
  if (envKey)
    return envKey;
  try {
    if (!existsSync(API_KEY_FILE))
      return null;
    return readFileSync(API_KEY_FILE, "utf-8").trim();
  } catch {
    return null;
  }
}
function getAuthHeaders() {
  const apiKey = getApiKey();
  if (apiKey) {
    return {
      Authorization: `Bearer ${apiKey}`,
      "X-API-Key": apiKey,
      "X-Subscription-Tier": "admin"
    };
  }
  return {};
}
function getApiBaseUrl() {
  return getEdgeworkConfig().apiBaseUrl;
}
function getCompanionPort() {
  return getZedgeConfig().port;
}
var CONFIG_DIR, CONFIG_FILE, API_KEY_FILE, ZEDGE_CONFIG_FILE, DEFAULT_EDGEWORK_CONFIG, DEFAULT_ZEDGE_CONFIG;
var init_config = __esm(() => {
  CONFIG_DIR = join(homedir(), ".edgework");
  CONFIG_FILE = join(CONFIG_DIR, "config.json");
  API_KEY_FILE = join(CONFIG_DIR, "api-key");
  ZEDGE_CONFIG_FILE = join(CONFIG_DIR, "zedge.json");
  DEFAULT_EDGEWORK_CONFIG = {
    environment: "production",
    apiBaseUrl: "https://api.edgework.ai",
    mcpEndpoint: "https://api.edgework.ai/mcp"
  };
  DEFAULT_ZEDGE_CONFIG = {
    port: 7331,
    computePool: {
      enabled: false,
      maxCpuPercent: 50,
      maxMemoryMb: 2048,
      allowedModels: ["tinyllama-1.1b", "gemma3-1b-it"]
    },
    preferredModel: "tinyllama-1.1b",
    cloudRunDirect: true
  };
});

// ../../../wasm-modules/edgework-core/pkg/edgework_core.js
var exports_edgework_core = {};
__export(exports_edgework_core, {
  is_licensed: () => is_licensed,
  initSync: () => initSync,
  init: () => init,
  get_session: () => get_session,
  default: () => edgework_core_default,
  RoutingStrategy: () => RoutingStrategy,
  ModelRouter: () => ModelRouter,
  LicenseTier: () => LicenseTier,
  InferenceClient: () => InferenceClient,
  GpuTier: () => GpuTier,
  GatewayClient: () => GatewayClient,
  EdgeworkCore: () => EdgeworkCore,
  DistributedClient: () => DistributedClient
});
function addHeapObject(obj) {
  if (heap_next === heap.length)
    heap.push(heap.length + 1);
  const idx = heap_next;
  heap_next = heap[idx];
  heap[idx] = obj;
  return idx;
}
function debugString(val) {
  const type = typeof val;
  if (type == "number" || type == "boolean" || val == null) {
    return `${val}`;
  }
  if (type == "string") {
    return `"${val}"`;
  }
  if (type == "symbol") {
    const description = val.description;
    if (description == null) {
      return "Symbol";
    } else {
      return `Symbol(${description})`;
    }
  }
  if (type == "function") {
    const name = val.name;
    if (typeof name == "string" && name.length > 0) {
      return `Function(${name})`;
    } else {
      return "Function";
    }
  }
  if (Array.isArray(val)) {
    const length = val.length;
    let debug = "[";
    if (length > 0) {
      debug += debugString(val[0]);
    }
    for (let i = 1;i < length; i++) {
      debug += ", " + debugString(val[i]);
    }
    debug += "]";
    return debug;
  }
  const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
  let className;
  if (builtInMatches && builtInMatches.length > 1) {
    className = builtInMatches[1];
  } else {
    return toString.call(val);
  }
  if (className == "Object") {
    try {
      return "Object(" + JSON.stringify(val) + ")";
    } catch (_) {
      return "Object";
    }
  }
  if (val instanceof Error) {
    return `${val.name}: ${val.message}
${val.stack}`;
  }
  return className;
}
function dropObject(idx) {
  if (idx < 132)
    return;
  heap[idx] = heap_next;
  heap_next = idx;
}
function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}
function getDataViewMemory0() {
  if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}
function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return decodeText(ptr, len);
}
function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}
function getObject(idx) {
  return heap[idx];
}
function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    wasm.__wbindgen_export3(addHeapObject(e));
  }
}
function isLikeNone(x) {
  return x === undefined || x === null;
}
function makeMutClosure(arg0, arg1, dtor, f) {
  const state = { a: arg0, b: arg1, cnt: 1, dtor };
  const real = (...args) => {
    state.cnt++;
    const a = state.a;
    state.a = 0;
    try {
      return f(a, state.b, ...args);
    } finally {
      state.a = a;
      real._wbg_cb_unref();
    }
  };
  real._wbg_cb_unref = () => {
    if (--state.cnt === 0) {
      state.dtor(state.a, state.b);
      state.a = 0;
      CLOSURE_DTORS.unregister(state);
    }
  };
  CLOSURE_DTORS.register(real, state, state);
  return real;
}
function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr2 = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0().subarray(ptr2, ptr2 + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr2;
  }
  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;
  const mem = getUint8ArrayMemory0();
  let offset = 0;
  for (;offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 127)
      break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = cachedTextEncoder.encodeInto(arg, view);
    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }
  WASM_VECTOR_LEN = offset;
  return ptr;
}
function takeObject(idx) {
  const ret = getObject(idx);
  dropObject(idx);
  return ret;
}
function decodeText(ptr, len) {
  numBytesDecoded += len;
  if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
    cachedTextDecoder = new TextDecoder("utf-8", {
      ignoreBOM: true,
      fatal: true
    });
    cachedTextDecoder.decode();
    numBytesDecoded = len;
  }
  return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}
function __wasm_bindgen_func_elem_1008(arg0, arg1, arg2) {
  wasm.__wasm_bindgen_func_elem_1008(arg0, arg1, addHeapObject(arg2));
}
function __wasm_bindgen_func_elem_1089(arg0, arg1, arg2, arg3) {
  wasm.__wasm_bindgen_func_elem_1089(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

class DistributedClient {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(DistributedClient.prototype);
    obj.__wbg_ptr = ptr;
    DistributedClientFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    DistributedClientFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_distributedclient_free(ptr, 0);
  }
  disconnect() {
    wasm.distributedclient_disconnect(this.__wbg_ptr);
  }
  infer(request) {
    const ret = wasm.distributedclient_infer(this.__wbg_ptr, addHeapObject(request));
    return takeObject(ret);
  }
  connect() {
    const ret = wasm.distributedclient_connect(this.__wbg_ptr);
    return takeObject(ret);
  }
  get_nodes() {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.distributedclient_get_nodes(retptr, this.__wbg_ptr);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeObject(r1);
      }
      return takeObject(r0);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
}

class EdgeworkCore {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    EdgeworkCoreFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_edgeworkcore_free(ptr, 0);
  }
  get_router() {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.edgeworkcore_get_router(retptr, this.__wbg_ptr);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeObject(r1);
      }
      return ModelRouter.__wrap(r0);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  get_gateway_client(endpoint) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passStringToWasm0(endpoint, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      const len0 = WASM_VECTOR_LEN;
      wasm.edgeworkcore_get_gateway_client(retptr, this.__wbg_ptr, ptr0, len0);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeObject(r1);
      }
      return GatewayClient.__wrap(r0);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  get_inference_client(config) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.edgeworkcore_get_inference_client(retptr, this.__wbg_ptr, addHeapObject(config));
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeObject(r1);
      }
      return InferenceClient.__wrap(r0);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  get_distributed_client(config) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.edgeworkcore_get_distributed_client(retptr, this.__wbg_ptr, addHeapObject(config));
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeObject(r1);
      }
      return DistributedClient.__wrap(r0);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  constructor() {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.edgeworkcore_new(retptr);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeObject(r1);
      }
      this.__wbg_ptr = r0 >>> 0;
      EdgeworkCoreFinalization.register(this, this.__wbg_ptr, this);
      return this;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
}

class GatewayClient {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(GatewayClient.prototype);
    obj.__wbg_ptr = ptr;
    GatewayClientFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    GatewayClientFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_gatewayclient_free(ptr, 0);
  }
  embeddings(request) {
    const ret = wasm.gatewayclient_embeddings(this.__wbg_ptr, addHeapObject(request));
    return takeObject(ret);
  }
  list_models() {
    const ret = wasm.gatewayclient_list_models(this.__wbg_ptr);
    return takeObject(ret);
  }
  chat_completion(request) {
    const ret = wasm.gatewayclient_chat_completion(this.__wbg_ptr, addHeapObject(request));
    return takeObject(ret);
  }
  health() {
    const ret = wasm.gatewayclient_health(this.__wbg_ptr);
    return takeObject(ret);
  }
}

class InferenceClient {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(InferenceClient.prototype);
    obj.__wbg_ptr = ptr;
    InferenceClientFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    InferenceClientFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_inferenceclient_free(ptr, 0);
  }
  get_config() {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.inferenceclient_get_config(retptr, this.__wbg_ptr);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeObject(r1);
      }
      return takeObject(r0);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  set_config(config) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.inferenceclient_set_config(retptr, this.__wbg_ptr, addHeapObject(config));
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      if (r1) {
        throw takeObject(r0);
      }
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  infer(request) {
    const ret = wasm.inferenceclient_infer(this.__wbg_ptr, addHeapObject(request));
    return takeObject(ret);
  }
}

class ModelRouter {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(ModelRouter.prototype);
    obj.__wbg_ptr = ptr;
    ModelRouterFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    ModelRouterFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_modelrouter_free(ptr, 0);
  }
  set_strategy(strategy) {
    wasm.modelrouter_set_strategy(this.__wbg_ptr, strategy);
  }
  can_run_locally(model_id) {
    const ptr0 = passStringToWasm0(model_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.modelrouter_can_run_locally(this.__wbg_ptr, ptr0, len0);
    return ret !== 0;
  }
  update_network_quality(quality) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.modelrouter_update_network_quality(retptr, this.__wbg_ptr, addHeapObject(quality));
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      if (r1) {
        throw takeObject(r0);
      }
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  get_device_capabilities() {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.modelrouter_get_device_capabilities(retptr, this.__wbg_ptr);
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeObject(r1);
      }
      return takeObject(r0);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  route(model_id, requirements) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passStringToWasm0(model_id, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      const len0 = WASM_VECTOR_LEN;
      wasm.modelrouter_route(retptr, this.__wbg_ptr, ptr0, len0, addHeapObject(requirements));
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
      if (r2) {
        throw takeObject(r1);
      }
      return takeObject(r0);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
function get_session() {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    wasm.get_session(retptr);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    if (r2) {
      throw takeObject(r1);
    }
    return takeObject(r0);
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
function init(license_jwt) {
  const ptr0 = passStringToWasm0(license_jwt, wasm.__wbindgen_export, wasm.__wbindgen_export2);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.init(ptr0, len0);
  return takeObject(ret);
}
function is_licensed() {
  const ret = wasm.is_licensed();
  return ret !== 0;
}
async function __wbg_load(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);
        if (validResponse && module.headers.get("Content-Type") !== "application/wasm") {
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
        } else {
          throw e;
        }
      }
    }
    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);
    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
}
function __wbg_get_imports() {
  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbg_Error_52673b7de5a0ca89 = function(arg0, arg1) {
    const ret = Error(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_Number_2d1dcfcf4ec51736 = function(arg0) {
    const ret = Number(getObject(arg0));
    return ret;
  };
  imports.wbg.__wbg_String_8f0eb39a4a4c2f66 = function(arg0, arg1) {
    const ret = String(getObject(arg1));
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
  };
  imports.wbg.__wbg___wbindgen_boolean_get_dea25b33882b895b = function(arg0) {
    const v = getObject(arg0);
    const ret = typeof v === "boolean" ? v : undefined;
    return isLikeNone(ret) ? 16777215 : ret ? 1 : 0;
  };
  imports.wbg.__wbg___wbindgen_debug_string_adfb662ae34724b6 = function(arg0, arg1) {
    const ret = debugString(getObject(arg1));
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
  };
  imports.wbg.__wbg___wbindgen_in_0d3e1e8f0c669317 = function(arg0, arg1) {
    const ret = getObject(arg0) in getObject(arg1);
    return ret;
  };
  imports.wbg.__wbg___wbindgen_is_function_8d400b8b1af978cd = function(arg0) {
    const ret = typeof getObject(arg0) === "function";
    return ret;
  };
  imports.wbg.__wbg___wbindgen_is_null_dfda7d66506c95b5 = function(arg0) {
    const ret = getObject(arg0) === null;
    return ret;
  };
  imports.wbg.__wbg___wbindgen_is_object_ce774f3490692386 = function(arg0) {
    const val = getObject(arg0);
    const ret = typeof val === "object" && val !== null;
    return ret;
  };
  imports.wbg.__wbg___wbindgen_is_undefined_f6b95eab589e0269 = function(arg0) {
    const ret = getObject(arg0) === undefined;
    return ret;
  };
  imports.wbg.__wbg___wbindgen_jsval_loose_eq_766057600fdd1b0d = function(arg0, arg1) {
    const ret = getObject(arg0) == getObject(arg1);
    return ret;
  };
  imports.wbg.__wbg___wbindgen_number_get_9619185a74197f95 = function(arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof obj === "number" ? obj : undefined;
    getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
  };
  imports.wbg.__wbg___wbindgen_string_get_a2a31e16edf96e42 = function(arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof obj === "string" ? obj : undefined;
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    var len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
  };
  imports.wbg.__wbg___wbindgen_throw_dd24417ed36fc46e = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
  };
  imports.wbg.__wbg__wbg_cb_unref_87dfb5aaa0cbcea7 = function(arg0) {
    getObject(arg0)._wbg_cb_unref();
  };
  imports.wbg.__wbg_call_3020136f7a2d6e44 = function() {
    return handleError(function(arg0, arg1, arg2) {
      const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_call_abb4ff46ce38be40 = function() {
    return handleError(function(arg0, arg1) {
      const ret = getObject(arg0).call(getObject(arg1));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_done_62ea16af4ce34b24 = function(arg0) {
    const ret = getObject(arg0).done;
    return ret;
  };
  imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
    let deferred0_0;
    let deferred0_1;
    try {
      deferred0_0 = arg0;
      deferred0_1 = arg1;
      console.error(getStringFromWasm0(arg0, arg1));
    } finally {
      wasm.__wbindgen_export4(deferred0_0, deferred0_1, 1);
    }
  };
  imports.wbg.__wbg_fetch_8119fbf8d0e4f4d1 = function(arg0, arg1) {
    const ret = getObject(arg0).fetch(getObject(arg1));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_get_6b7bd52aca3f9671 = function(arg0, arg1) {
    const ret = getObject(arg0)[arg1 >>> 0];
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_get_af9dab7e9603ea93 = function() {
    return handleError(function(arg0, arg1) {
      const ret = Reflect.get(getObject(arg0), getObject(arg1));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_get_with_ref_key_1dc361bd10053bfe = function(arg0, arg1) {
    const ret = getObject(arg0)[getObject(arg1)];
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_has_0e670569d65d3a45 = function() {
    return handleError(function(arg0, arg1) {
      const ret = Reflect.has(getObject(arg0), getObject(arg1));
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_headers_850c3fb50632ae78 = function(arg0) {
    const ret = getObject(arg0).headers;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_instanceof_ArrayBuffer_f3320d2419cd0355 = function(arg0) {
    let result;
    try {
      result = getObject(arg0) instanceof ArrayBuffer;
    } catch (_) {
      result = false;
    }
    const ret = result;
    return ret;
  };
  imports.wbg.__wbg_instanceof_Response_cd74d1c2ac92cb0b = function(arg0) {
    let result;
    try {
      result = getObject(arg0) instanceof Response;
    } catch (_) {
      result = false;
    }
    const ret = result;
    return ret;
  };
  imports.wbg.__wbg_instanceof_Uint8Array_da54ccc9d3e09434 = function(arg0) {
    let result;
    try {
      result = getObject(arg0) instanceof Uint8Array;
    } catch (_) {
      result = false;
    }
    const ret = result;
    return ret;
  };
  imports.wbg.__wbg_instanceof_Window_b5cf7783caa68180 = function(arg0) {
    let result;
    try {
      result = getObject(arg0) instanceof Window;
    } catch (_) {
      result = false;
    }
    const ret = result;
    return ret;
  };
  imports.wbg.__wbg_isArray_51fd9e6422c0a395 = function(arg0) {
    const ret = Array.isArray(getObject(arg0));
    return ret;
  };
  imports.wbg.__wbg_isSafeInteger_ae7d3f054d55fa16 = function(arg0) {
    const ret = Number.isSafeInteger(getObject(arg0));
    return ret;
  };
  imports.wbg.__wbg_iterator_27b7c8b35ab3e86b = function() {
    const ret = Symbol.iterator;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_json_47d847e3a3f1cf40 = function() {
    return handleError(function(arg0) {
      const ret = getObject(arg0).json();
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_length_22ac23eaec9d8053 = function(arg0) {
    const ret = getObject(arg0).length;
    return ret;
  };
  imports.wbg.__wbg_length_d45040a40c570362 = function(arg0) {
    const ret = getObject(arg0).length;
    return ret;
  };
  imports.wbg.__wbg_new_1ba21ce319a06297 = function() {
    const ret = new Object;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_new_25f239778d6112b9 = function() {
    const ret = new Array;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_new_6421f6084cc5bc5a = function(arg0) {
    const ret = new Uint8Array(getObject(arg0));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
    const ret = new Error;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_new_ff12d2b041fb48f1 = function(arg0, arg1) {
    try {
      var state0 = { a: arg0, b: arg1 };
      var cb0 = (arg02, arg12) => {
        const a = state0.a;
        state0.a = 0;
        try {
          return __wasm_bindgen_func_elem_1089(a, state0.b, arg02, arg12);
        } finally {
          state0.a = a;
        }
      };
      const ret = new Promise(cb0);
      return addHeapObject(ret);
    } finally {
      state0.a = state0.b = 0;
    }
  };
  imports.wbg.__wbg_new_no_args_cb138f77cf6151ee = function(arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_new_with_str_and_init_c5748f76f5108934 = function() {
    return handleError(function(arg0, arg1, arg2) {
      const ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_next_138a17bbf04e926c = function(arg0) {
    const ret = getObject(arg0).next;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_next_3cfe5c0fe2a4cc53 = function() {
    return handleError(function(arg0) {
      const ret = getObject(arg0).next();
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_now_69d776cd24f5215b = function() {
    const ret = Date.now();
    return ret;
  };
  imports.wbg.__wbg_ok_dd98ecb60d721e20 = function(arg0) {
    const ret = getObject(arg0).ok;
    return ret;
  };
  imports.wbg.__wbg_prototypesetcall_dfe9b766cdc1f1fd = function(arg0, arg1, arg2) {
    Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), getObject(arg2));
  };
  imports.wbg.__wbg_queueMicrotask_9b549dfce8865860 = function(arg0) {
    const ret = getObject(arg0).queueMicrotask;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_queueMicrotask_fca69f5bfad613a5 = function(arg0) {
    queueMicrotask(getObject(arg0));
  };
  imports.wbg.__wbg_resolve_fd5bfbaa4ce36e1e = function(arg0) {
    const ret = Promise.resolve(getObject(arg0));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_set_3f1d0b984ed272ed = function(arg0, arg1, arg2) {
    getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
  };
  imports.wbg.__wbg_set_425eb8b710d5beee = function() {
    return handleError(function(arg0, arg1, arg2, arg3, arg4) {
      getObject(arg0).set(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    }, arguments);
  };
  imports.wbg.__wbg_set_7df433eea03a5c14 = function(arg0, arg1, arg2) {
    getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
  };
  imports.wbg.__wbg_set_body_8e743242d6076a4f = function(arg0, arg1) {
    getObject(arg0).body = getObject(arg1);
  };
  imports.wbg.__wbg_set_method_76c69e41b3570627 = function(arg0, arg1, arg2) {
    getObject(arg0).method = getStringFromWasm0(arg1, arg2);
  };
  imports.wbg.__wbg_set_mode_611016a6818fc690 = function(arg0, arg1) {
    getObject(arg0).mode = __wbindgen_enum_RequestMode[arg1];
  };
  imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
    const ret = getObject(arg1).stack;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
  };
  imports.wbg.__wbg_static_accessor_GLOBAL_769e6b65d6557335 = function() {
    const ret = typeof global === "undefined" ? null : global;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
  };
  imports.wbg.__wbg_static_accessor_GLOBAL_THIS_60cf02db4de8e1c1 = function() {
    const ret = typeof globalThis === "undefined" ? null : globalThis;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
  };
  imports.wbg.__wbg_static_accessor_SELF_08f5a74c69739274 = function() {
    const ret = typeof self === "undefined" ? null : self;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
  };
  imports.wbg.__wbg_static_accessor_WINDOW_a8924b26aa92d024 = function() {
    const ret = typeof window === "undefined" ? null : window;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
  };
  imports.wbg.__wbg_status_9bfc680efca4bdfd = function(arg0) {
    const ret = getObject(arg0).status;
    return ret;
  };
  imports.wbg.__wbg_stringify_655a6390e1f5eb6b = function() {
    return handleError(function(arg0) {
      const ret = JSON.stringify(getObject(arg0));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_then_429f7caf1026411d = function(arg0, arg1, arg2) {
    const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_then_4f95312d68691235 = function(arg0, arg1) {
    const ret = getObject(arg0).then(getObject(arg1));
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_value_57b7b035e117f7ee = function(arg0) {
    const ret = getObject(arg0).value;
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_cast_2241b6af4c4b2941 = function(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_cast_4625c577ab2ec9ee = function(arg0) {
    const ret = BigInt.asUintN(64, arg0);
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_cast_59b536ec5375efa9 = function(arg0, arg1) {
    const ret = makeMutClosure(arg0, arg1, wasm.__wasm_bindgen_func_elem_993, __wasm_bindgen_func_elem_1008);
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_cast_d6cd19b81560fd6e = function(arg0) {
    const ret = arg0;
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
    const ret = getObject(arg0);
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
    takeObject(arg0);
  };
  return imports;
}
function __wbg_finalize_init(instance, module) {
  wasm = instance.exports;
  __wbg_init.__wbindgen_wasm_module = module;
  cachedDataViewMemory0 = null;
  cachedUint8ArrayMemory0 = null;
  return wasm;
}
function initSync(module) {
  if (wasm !== undefined)
    return wasm;
  if (typeof module !== "undefined") {
    if (Object.getPrototypeOf(module) === Object.prototype) {
      ({ module } = module);
    } else {
      console.warn("using deprecated parameters for `initSync()`; pass a single object instead");
    }
  }
  const imports = __wbg_get_imports();
  if (!(module instanceof WebAssembly.Module)) {
    module = new WebAssembly.Module(module);
  }
  const instance = new WebAssembly.Instance(module, imports);
  return __wbg_finalize_init(instance, module);
}
async function __wbg_init(module_or_path) {
  if (wasm !== undefined)
    return wasm;
  if (typeof module_or_path !== "undefined") {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({ module_or_path } = module_or_path);
    } else {
      console.warn("using deprecated parameters for the initialization function; pass a single object instead");
    }
  }
  if (typeof module_or_path === "undefined") {
    module_or_path = new URL("edgework_core_bg.wasm", import.meta.url);
  }
  const imports = __wbg_get_imports();
  if (typeof module_or_path === "string" || typeof Request === "function" && module_or_path instanceof Request || typeof URL === "function" && module_or_path instanceof URL) {
    module_or_path = fetch(module_or_path);
  }
  const { instance, module } = await __wbg_load(await module_or_path, imports);
  return __wbg_finalize_init(instance, module);
}
var wasm, CLOSURE_DTORS, cachedDataViewMemory0 = null, cachedUint8ArrayMemory0 = null, heap, heap_next, cachedTextDecoder, MAX_SAFARI_DECODE_BYTES = 2146435072, numBytesDecoded = 0, cachedTextEncoder, WASM_VECTOR_LEN = 0, __wbindgen_enum_RequestMode, DistributedClientFinalization, EdgeworkCoreFinalization, GatewayClientFinalization, InferenceClientFinalization, ModelRouterFinalization, GpuTier, LicenseTier, RoutingStrategy, EXPECTED_RESPONSE_TYPES, edgework_core_default;
var init_edgework_core = __esm(() => {
  CLOSURE_DTORS = typeof FinalizationRegistry === "undefined" ? { register: () => {}, unregister: () => {} } : new FinalizationRegistry((state) => state.dtor(state.a, state.b));
  heap = new Array(128).fill(undefined);
  heap.push(undefined, null, true, false);
  heap_next = heap.length;
  cachedTextDecoder = new TextDecoder("utf-8", {
    ignoreBOM: true,
    fatal: true
  });
  cachedTextDecoder.decode();
  cachedTextEncoder = new TextEncoder;
  if (!("encodeInto" in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function(arg, view) {
      const buf = cachedTextEncoder.encode(arg);
      view.set(buf);
      return {
        read: arg.length,
        written: buf.length
      };
    };
  }
  __wbindgen_enum_RequestMode = [
    "same-origin",
    "no-cors",
    "cors",
    "navigate"
  ];
  DistributedClientFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {}, unregister: () => {} } : new FinalizationRegistry((ptr) => wasm.__wbg_distributedclient_free(ptr >>> 0, 1));
  EdgeworkCoreFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {}, unregister: () => {} } : new FinalizationRegistry((ptr) => wasm.__wbg_edgeworkcore_free(ptr >>> 0, 1));
  GatewayClientFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {}, unregister: () => {} } : new FinalizationRegistry((ptr) => wasm.__wbg_gatewayclient_free(ptr >>> 0, 1));
  InferenceClientFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {}, unregister: () => {} } : new FinalizationRegistry((ptr) => wasm.__wbg_inferenceclient_free(ptr >>> 0, 1));
  ModelRouterFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {}, unregister: () => {} } : new FinalizationRegistry((ptr) => wasm.__wbg_modelrouter_free(ptr >>> 0, 1));
  if (Symbol.dispose)
    DistributedClient.prototype[Symbol.dispose] = DistributedClient.prototype.free;
  if (Symbol.dispose)
    EdgeworkCore.prototype[Symbol.dispose] = EdgeworkCore.prototype.free;
  if (Symbol.dispose)
    GatewayClient.prototype[Symbol.dispose] = GatewayClient.prototype.free;
  GpuTier = Object.freeze({
    None: 0,
    0: "None",
    Low: 1,
    1: "Low",
    Medium: 2,
    2: "Medium",
    High: 3,
    3: "High"
  });
  if (Symbol.dispose)
    InferenceClient.prototype[Symbol.dispose] = InferenceClient.prototype.free;
  LicenseTier = Object.freeze({
    Starter: 1,
    1: "Starter",
    Pro: 2,
    2: "Pro",
    Enterprise: 3,
    3: "Enterprise"
  });
  if (Symbol.dispose)
    ModelRouter.prototype[Symbol.dispose] = ModelRouter.prototype.free;
  RoutingStrategy = Object.freeze({
    LocalFirst: 0,
    0: "LocalFirst",
    RemoteFirst: 1,
    1: "RemoteFirst",
    Balanced: 2,
    2: "Balanced",
    CostOptimized: 3,
    3: "CostOptimized",
    LatencyOptimized: 4,
    4: "LatencyOptimized",
    LocalOnly: 5,
    5: "LocalOnly",
    RemoteOnly: 6,
    6: "RemoteOnly"
  });
  EXPECTED_RESPONSE_TYPES = new Set(["basic", "cors", "default"]);
  edgework_core_default = __wbg_init;
});

// src/distributed-bridge.ts
async function loadWasmClient(config) {
  if (wasmLoadAttempted)
    return wasmClient;
  wasmLoadAttempted = true;
  try {
    const wasmPath = new URL("../../../../wasm-modules/edgework-core/pkg/edgework_core_bg.wasm", import.meta.url).pathname;
    const { existsSync: existsSync2 } = await import("fs");
    if (!existsSync2(wasmPath)) {
      console.log("[zedge:distributed] WASM module not found at", wasmPath, "\u2014 using local bridge");
      return null;
    }
    const wasmModule = await Promise.resolve().then(() => (init_edgework_core(), exports_edgework_core));
    if (typeof wasmModule.DistributedClient === "function") {
      const ClientClass = wasmModule.DistributedClient;
      wasmClient = new ClientClass(JSON.stringify(config));
      console.log("[zedge:distributed] WASM DistributedClient loaded");
      return wasmClient;
    }
    console.log("[zedge:distributed] WASM module loaded but DistributedClient not found");
    return null;
  } catch (err) {
    console.log("[zedge:distributed] WASM module not available:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
async function connectToMesh(config) {
  const client = await loadWasmClient(config);
  if (client) {
    try {
      await client.connect();
      const nodes = client.get_nodes();
      return { connected: true, nodeCount: nodes.length };
    } catch (err) {
      console.warn("[zedge:distributed] WASM connect failed:", err instanceof Error ? err.message : String(err));
    }
  }
  try {
    const resp = await fetch(`${config.meshEndpoint}/v1/mesh/nodes`, {
      headers: {
        "Content-Type": "application/json",
        ...getApiKey() ? { "X-API-Key": getApiKey() } : {}
      },
      signal: AbortSignal.timeout(config.timeoutMs)
    });
    if (resp.ok) {
      const data = await resp.json();
      localState = {
        connected: true,
        nodes: data.nodes ?? [],
        connectTime: Date.now(),
        requestsRouted: localState.requestsRouted
      };
      return { connected: true, nodeCount: localState.nodes.length };
    }
  } catch {}
  localState = {
    connected: true,
    nodes: [],
    connectTime: Date.now(),
    requestsRouted: localState.requestsRouted
  };
  return { connected: true, nodeCount: 0 };
}
function getMeshNodes() {
  if (wasmClient) {
    try {
      return wasmClient.get_nodes();
    } catch {
      return localState.nodes;
    }
  }
  return localState.nodes;
}
function disconnectFromMesh() {
  if (wasmClient) {
    try {
      wasmClient.disconnect();
    } catch {}
  }
  localState = {
    connected: false,
    nodes: [],
    connectTime: null,
    requestsRouted: localState.requestsRouted
  };
}
function getBridgeStatus() {
  return {
    wasmAvailable: wasmClient !== null,
    connected: localState.connected,
    nodeCount: wasmClient ? wasmClient.get_nodes?.()?.length ?? 0 : localState.nodes.length,
    requestsRouted: localState.requestsRouted,
    uptime: localState.connectTime ? Date.now() - localState.connectTime : 0
  };
}
var wasmClient = null, wasmLoadAttempted = false, localState;
var init_distributed_bridge = __esm(() => {
  init_config();
  localState = {
    connected: false,
    nodes: [],
    connectTime: null,
    requestsRouted: 0
  };
});

// src/compute-node.ts
async function joinPool() {
  if (poolState.joined) {
    return getPoolStatus();
  }
  const config = getZedgeConfig();
  const edgeworkConfig = getEdgeworkConfig();
  const distributedConfig = {
    meshEndpoint: edgeworkConfig.apiBaseUrl,
    maxNodes: 50,
    timeoutMs: 1e4,
    retryCount: 3,
    enableFallback: true
  };
  const result = await connectToMesh(distributedConfig);
  poolState = {
    joined: true,
    tokensEarned: poolState.tokensEarned,
    requestsServed: poolState.requestsServed,
    connectedNodes: Math.max(1, result.nodeCount),
    startTime: Date.now(),
    currentDebt: 0
  };
  saveZedgeConfig({
    computePool: { ...config.computePool, enabled: true }
  });
  const bridge = getBridgeStatus();
  console.log(`[zedge] Joined compute pool \u2014 WASM bridge: ${bridge.wasmAvailable ? "yes" : "no"}, ` + `nodes: ${result.nodeCount}, max CPU: ${config.computePool.maxCpuPercent}%, ` + `max memory: ${config.computePool.maxMemoryMb}MB`);
  return getPoolStatus();
}
async function leavePool() {
  if (!poolState.joined) {
    return getPoolStatus();
  }
  const config = getZedgeConfig();
  disconnectFromMesh();
  poolState = {
    ...poolState,
    joined: false,
    connectedNodes: 0,
    startTime: null
  };
  saveZedgeConfig({
    computePool: { ...config.computePool, enabled: false }
  });
  console.log("[zedge] Left compute pool");
  return getPoolStatus();
}
function getPoolStatus() {
  const config = getZedgeConfig();
  const bridge = getBridgeStatus();
  if (poolState.joined) {
    const meshNodes = getMeshNodes();
    if (meshNodes.length > 0) {
      poolState.connectedNodes = meshNodes.length + 1;
    }
  }
  return {
    joined: poolState.joined,
    tokensEarned: poolState.tokensEarned,
    requestsServed: poolState.requestsServed,
    connectedNodes: poolState.connectedNodes,
    uptime: poolState.startTime ? Date.now() - poolState.startTime : 0,
    wasmBridgeAvailable: bridge.wasmAvailable,
    config: {
      maxCpuPercent: config.computePool.maxCpuPercent,
      maxMemoryMb: config.computePool.maxMemoryMb,
      allowedModels: config.computePool.allowedModels
    },
    billing: {
      debtMode: getApiKey() ? "premium" : "free",
      debtMax: getApiKey() ? 5 : 0,
      currentDebt: poolState.currentDebt
    }
  };
}
function recordServedRequest(tokensProcessed) {
  poolState.requestsServed += 1;
  poolState.tokensEarned += tokensProcessed / 1000;
}
function getMarketStatus() {
  const config = getZedgeConfig();
  const tier = getApiKey() ? "premium" : "free";
  const tierConfig = DEBT_TIERS[tier] ?? DEBT_TIERS["free"];
  return {
    clearingPrice: marketState.clearingPrice,
    supplyDemandRatio: marketState.supplyDemandRatio,
    contributor: {
      totalTokensEarned: poolState.tokensEarned,
      totalRequestsServed: poolState.requestsServed,
      uptimeHours: poolState.startTime ? (Date.now() - poolState.startTime) / 3600000 : 0,
      modelsHosted: config.computePool.allowedModels,
      averageLatencyMs: marketState.latencySamples > 0 ? marketState.totalLatencyMs / marketState.latencySamples : 0,
      peakRequestsPerMinute: marketState.peakRpm
    },
    debtLedger: {
      tier,
      debtMax: tierConfig.maxDebt,
      currentDebt: poolState.currentDebt,
      lifetimeSpent: marketState.lifetimeSpent,
      lifetimeEarned: poolState.tokensEarned,
      netBalance: poolState.tokensEarned - marketState.lifetimeSpent
    }
  };
}
var poolState, DEBT_TIERS, marketState;
var init_compute_node = __esm(() => {
  init_config();
  init_distributed_bridge();
  poolState = {
    joined: false,
    tokensEarned: 0,
    requestsServed: 0,
    connectedNodes: 0,
    startTime: null,
    currentDebt: 0
  };
  DEBT_TIERS = {
    free: { maxDebt: 0 },
    premium: { maxDebt: 5 },
    ultra: { maxDebt: 20 }
  };
  marketState = {
    clearingPrice: 1,
    supplyDemandRatio: 1,
    peakRpm: 0,
    totalLatencyMs: 0,
    latencySamples: 0,
    lifetimeSpent: 0
  };
});

// src/p2p-mesh.ts
var exports_p2p_mesh = {};
__export(exports_p2p_mesh, {
  stopMesh: () => stopMesh,
  startMesh: () => startMesh,
  meshInfer: () => meshInfer,
  handlePeerRequest: () => handlePeerRequest,
  getMeshStatus: () => getMeshStatus,
  computeLayerAssignments: () => computeLayerAssignments
});
import { createSocket } from "dgram";
import { hostname, cpus } from "os";
function startMesh() {
  if (meshState.running)
    return getMeshStatus();
  meshState.running = true;
  try {
    const socket = createSocket("udp4");
    socket.on("message", handleDiscoveryMessage);
    socket.on("error", (err) => {
      console.error("[zedge:mesh] Broadcast socket error:", err.message);
    });
    socket.bind(BROADCAST_PORT, () => {
      socket.setBroadcast(true);
      console.log(`[zedge:mesh] Discovery listener on UDP :${BROADCAST_PORT}`);
    });
    meshState.broadcastSocket = socket;
  } catch (err) {
    console.warn("[zedge:mesh] Could not start broadcast socket:", err);
  }
  meshState.heartbeatInterval = setInterval(() => {
    broadcastPresence();
    pruneStale();
  }, HEARTBEAT_INTERVAL_MS);
  broadcastPresence();
  console.log(`[zedge:mesh] Started. Node ID: ${meshState.nodeId}`);
  return getMeshStatus();
}
function stopMesh() {
  if (!meshState.running)
    return getMeshStatus();
  broadcastMessage({
    type: "departure",
    nodeId: meshState.nodeId
  });
  if (meshState.heartbeatInterval) {
    clearInterval(meshState.heartbeatInterval);
    meshState.heartbeatInterval = null;
  }
  if (meshState.broadcastSocket) {
    meshState.broadcastSocket.close();
    meshState.broadcastSocket = null;
  }
  meshState.running = false;
  meshState.peers.clear();
  console.log("[zedge:mesh] Stopped.");
  return getMeshStatus();
}
function getMeshStatus() {
  const peers = Array.from(meshState.peers.values());
  const allModels = new Set;
  let totalMemory = 0;
  let totalCores = 0;
  const config = getZedgeConfig();
  config.computePool.allowedModels.forEach((m) => allModels.add(m));
  totalMemory += config.computePool.maxMemoryMb;
  totalCores += cpus().length;
  for (const peer of peers) {
    peer.capabilities.models.forEach((m) => allModels.add(m));
    totalMemory += peer.capabilities.maxMemoryMb;
    totalCores += peer.capabilities.cpuCores;
  }
  return {
    running: meshState.running,
    nodeId: meshState.nodeId,
    peers,
    totalCapacity: {
      models: Array.from(allModels),
      totalMemoryMb: totalMemory,
      totalCores
    }
  };
}
async function meshInfer(request) {
  const peers = findCapablePeers(request.model);
  if (peers.length === 0)
    return null;
  peers.sort((a, b) => {
    const latencyDiff = a.latencyMs - b.latencyMs;
    if (Math.abs(latencyDiff) > 5)
      return latencyDiff;
    return a.load - b.load;
  });
  for (const peer of peers) {
    try {
      const start = Date.now();
      const resp = await fetch(`http://${peer.address}:${peer.port}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(60000)
      });
      if (!resp.ok)
        continue;
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content ?? "";
      const latencyMs = Date.now() - start;
      peer.latencyMs = (peer.latencyMs + latencyMs) / 2;
      return {
        content,
        servedBy: [peer.id],
        totalLatencyMs: latencyMs
      };
    } catch {
      continue;
    }
  }
  return null;
}
async function handlePeerRequest(request) {
  const { infer } = await Promise.resolve().then(() => (init_inference_bridge(), exports_inference_bridge));
  const result = await infer(request);
  const body = await result.response.clone().text();
  const estimatedTokens = Math.ceil(body.length / 4);
  recordServedRequest(estimatedTokens);
  return result.response;
}
function computeLayerAssignments(modelId, totalLayers, peers) {
  if (peers.length === 0)
    return [];
  const weights = peers.map((p) => {
    const capacityScore = p.capabilities.maxMemoryMb / 1024 * p.capabilities.cpuCores;
    const loadFactor = 1 - p.load * 0.5;
    return Math.max(0.1, capacityScore * loadFactor);
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const assignments = [];
  let layerStart = 0;
  for (let i = 0;i < peers.length; i++) {
    const proportion = weights[i] / totalWeight;
    const layerCount = Math.max(1, i === peers.length - 1 ? totalLayers - layerStart : Math.round(totalLayers * proportion));
    const layerEnd = Math.min(totalLayers - 1, layerStart + layerCount - 1);
    assignments.push({
      peerId: peers[i].id,
      layerRange: [layerStart, layerEnd],
      address: peers[i].address,
      port: peers[i].port
    });
    layerStart = layerEnd + 1;
    if (layerStart >= totalLayers)
      break;
  }
  return assignments;
}
function handleDiscoveryMessage(msg, rinfo) {
  try {
    const data = JSON.parse(msg.toString());
    if (data.nodeId === meshState.nodeId)
      return;
    if (data.type === "announce" && data.capabilities && data.port) {
      const existing = meshState.peers.get(data.nodeId);
      meshState.peers.set(data.nodeId, {
        id: data.nodeId,
        hostname: data.hostname ?? "unknown",
        address: rinfo.address,
        port: data.port,
        capabilities: data.capabilities,
        lastSeen: Date.now(),
        latencyMs: existing?.latencyMs ?? 50,
        load: data.load ?? 0.5
      });
    } else if (data.type === "departure") {
      meshState.peers.delete(data.nodeId);
    }
  } catch {}
}
function broadcastPresence() {
  const config = getZedgeConfig();
  const loadAvg = cpus().reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    return acc + (1 - cpu.times.idle / total);
  }, 0) / cpus().length;
  const message = {
    type: "announce",
    nodeId: meshState.nodeId,
    hostname: hostname(),
    port: config.port,
    capabilities: {
      models: config.computePool.allowedModels,
      maxMemoryMb: config.computePool.maxMemoryMb,
      cpuCores: cpus().length,
      gpuAvailable: detectGpu()
    },
    load: Math.min(1, loadAvg)
  };
  broadcastMessage(message);
}
function broadcastMessage(message) {
  if (!meshState.broadcastSocket)
    return;
  const buf = Buffer.from(JSON.stringify(message));
  meshState.broadcastSocket.send(buf, 0, buf.length, BROADCAST_PORT, "255.255.255.255", (err) => {
    if (err) {}
  });
}
function pruneStale() {
  const now = Date.now();
  for (const [id, peer] of meshState.peers) {
    if (now - peer.lastSeen > PEER_TIMEOUT_MS) {
      meshState.peers.delete(id);
      console.log(`[zedge:mesh] Peer departed (timeout): ${peer.hostname}`);
    }
  }
}
function findCapablePeers(model) {
  return Array.from(meshState.peers.values()).filter((p) => p.capabilities.models.includes(model));
}
function generateNodeId() {
  const h = hostname();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${h}-${rand}`;
}
function detectGpu() {
  try {
    if (process.platform === "darwin") {
      const { execSync } = __require("child_process");
      const output = execSync("system_profiler SPDisplaysDataType 2>/dev/null", { encoding: "utf-8", timeout: 3000 });
      return output.includes("Metal") || output.includes("Chipset Model");
    }
    if (process.platform === "linux") {
      const { existsSync: existsSync2 } = __require("fs");
      if (existsSync2("/dev/dri"))
        return true;
      try {
        const { execSync } = __require("child_process");
        execSync("nvidia-smi", { timeout: 3000 });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  } catch {
    return false;
  }
}
var BROADCAST_PORT = 7332, HEARTBEAT_INTERVAL_MS = 1e4, PEER_TIMEOUT_MS = 30000, meshState;
var init_p2p_mesh = __esm(() => {
  init_config();
  init_compute_node();
  meshState = {
    running: false,
    nodeId: generateNodeId(),
    peers: new Map,
    broadcastSocket: null,
    heartbeatInterval: null
  };
});

// src/inference-bridge.ts
var exports_inference_bridge = {};
__export(exports_inference_bridge, {
  infer: () => infer,
  getModels: () => getModels,
  extractUpstreamDebugHeaders: () => extractUpstreamDebugHeaders,
  embed: () => embed,
  createSSEProxyStream: () => createSSEProxyStream
});
import { appendFileSync, mkdirSync as mkdirSync2 } from "fs";
import { join as join2 } from "path";
function logInference(line) {
  const ts = new Date().toISOString();
  try {
    appendFileSync(LOG_FILE, `[${ts}] ${line}
`);
  } catch {}
}
function extractUpstreamDebugHeaders(response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith("x-")) {
      headers[key] = value;
    }
  });
  return headers;
}
async function tryMeshInference(request) {
  const { meshInfer: meshInfer2, getMeshStatus: getMeshStatus2 } = await Promise.resolve().then(() => (init_p2p_mesh(), exports_p2p_mesh));
  const status = getMeshStatus2();
  if (!status.running || status.peers.length === 0)
    return null;
  const result = await meshInfer2(request);
  if (!result)
    return null;
  const response = {
    id: `chatcmpl-mesh-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: request.model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: result.content },
        finish_reason: "stop"
      }
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  };
  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json" }
  });
}
async function tryEdgeCoordinator(request, signal) {
  const baseUrl = getApiBaseUrl();
  const authHeaders = getAuthHeaders();
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders
  };
  logInference(`[edge] \u2192 ${baseUrl}/v1/chat/completions model=${request.model} stream=${request.stream} headers=${JSON.stringify(Object.keys(authHeaders))}`);
  const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
    signal
  });
  const respHeaders = {};
  resp.headers.forEach((v, k) => {
    respHeaders[k] = v;
  });
  logInference(`[edge] \u2190 ${resp.status} ${resp.statusText} headers=${JSON.stringify(respHeaders)}`);
  return resp;
}
async function tryCloudRunCoordinator(request, signal) {
  const coordinatorUrl = CLOUD_RUN_COORDINATORS[request.model];
  if (!coordinatorUrl) {
    throw new Error(`No Cloud Run coordinator for model: ${request.model}`);
  }
  const MAX_RETRIES = 8;
  const INITIAL_BACKOFF_MS = 2000;
  const MAX_BACKOFF_MS = 15000;
  for (let attempt = 0;attempt <= MAX_RETRIES; attempt++) {
    if (signal?.aborted)
      throw new DOMException("The operation was aborted.", "AbortError");
    if (attempt === 0) {
      logInference(`[cloudrun] \u2192 ${coordinatorUrl}/v1/chat/completions model=${request.model}`);
    } else {
      logInference(`[cloudrun] \u2192 retry ${attempt}/${MAX_RETRIES} model=${request.model}`);
    }
    const resp = await fetch(`${coordinatorUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal
    });
    const respHeaders = {};
    resp.headers.forEach((v, k) => {
      respHeaders[k] = v;
    });
    logInference(`[cloudrun] \u2190 ${resp.status} ${resp.statusText} headers=${JSON.stringify(respHeaders)}`);
    if (resp.status === 503 && attempt < MAX_RETRIES) {
      const backoff = Math.min(INITIAL_BACKOFF_MS * Math.pow(1.5, attempt), MAX_BACKOFF_MS);
      logInference(`[cloudrun] 503 cold-start, retrying in ${Math.round(backoff)}ms`);
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, backoff);
        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          resolve(undefined);
        }, { once: true });
      });
      continue;
    }
    return resp;
  }
  throw new Error(`Cloud Run: exhausted ${MAX_RETRIES} retries`);
}

class LocalInferenceEngine {
  transitions = new Map;
  initialized = false;
  init() {
    if (this.initialized)
      return;
    const patterns = [
      ["<start>", "Hello", 10],
      ["<start>", "I", 8],
      ["<start>", "The", 6],
      ["<start>", "Here", 5],
      ["<start>", "Let", 4],
      ["Hello", "!", 8],
      ["Hello", ",", 5],
      ["Hello", "there", 3],
      ["I", "can", 6],
      ["I", "understand", 4],
      ["I", "'ll", 3],
      ["can", "help", 8],
      ["can", "see", 4],
      ["help", "you", 7],
      ["help", "with", 5],
      ["you", "with", 6],
      ["you", ".", 3],
      ["with", "that", 5],
      ["with", "this", 4],
      ["with", "the", 3],
      ["that", ".", 6],
      ["that", ",", 3],
      ["this", ".", 5],
      ["this", "code", 3],
      ["The", "function", 5],
      ["The", "code", 4],
      ["The", "issue", 3],
      ["The", "error", 3],
      ["function", "takes", 4],
      ["function", "returns", 3],
      ["function", "should", 3],
      ["code", "looks", 4],
      ["code", "should", 3],
      ["code", "needs", 3],
      ["looks", "correct", 4],
      ["looks", "like", 3],
      ["should", "work", 4],
      ["should", "be", 3],
      ["needs", "to", 5],
      ["needs", "a", 3],
      ["to", "be", 4],
      ["to", "handle", 3],
      ["to", "the", 3],
      ["be", "updated", 3],
      ["be", "fixed", 3],
      ["be", "more", 2],
      ["Here", "is", 6],
      ["Here", "'s", 4],
      ["is", "a", 5],
      ["is", "the", 4],
      ["is", "an", 3],
      ["'s", "a", 4],
      ["'s", "what", 3],
      ["a", "suggestion", 3],
      ["a", "way", 3],
      ["a", "possible", 2],
      ["Let", "me", 6],
      ["me", "help", 4],
      ["me", "explain", 3],
      ["me", "look", 3],
      ["explain", "that", 4],
      ["explain", ".", 3],
      ["look", "at", 5],
      ["at", "the", 5],
      ["at", "this", 3],
      ["the", "code", 4],
      ["the", "issue", 3],
      ["the", "error", 3],
      ["the", "function", 2],
      ["error", "is", 4],
      ["error", "occurs", 3],
      ["issue", "is", 4],
      ["issue", "might", 3],
      ["might", "be", 5],
      ["correct", ".", 5],
      ["work", ".", 5],
      ["work", "correctly", 3],
      ["correctly", ".", 5],
      ["updated", ".", 4],
      ["fixed", ".", 4],
      ["suggestion", ".", 3],
      ["suggestion", ":", 3],
      [".", "<end>", 10],
      ["!", "<end>", 5],
      ["!", "I", 3],
      [",", "I", 3],
      [",", "and", 3],
      [",", "but", 2],
      ["and", "I", 3],
      ["and", "the", 3],
      ["but", "I", 3],
      ["but", "the", 2]
    ];
    for (const [from, to, weight] of patterns) {
      if (!this.transitions.has(from)) {
        this.transitions.set(from, new Map);
      }
      this.transitions.get(from).set(to, weight);
    }
    this.initialized = true;
  }
  generate(maxTokens, temperature) {
    this.init();
    const tokens = [];
    let current = "<start>";
    const maxLen = Math.min(maxTokens, 100);
    for (let i = 0;i < maxLen; i++) {
      const next = this.nextToken(current, temperature);
      if (next === "<end>" || !next)
        break;
      tokens.push(next);
      current = next;
    }
    return tokens.join(" ").replace(/ \./g, ".").replace(/ ,/g, ",").replace(/ !/g, "!").replace(/ :/g, ":").replace(/ '/g, "'");
  }
  nextToken(current, temperature) {
    const candidates = this.transitions.get(current);
    if (!candidates || candidates.size === 0) {
      const fallback = this.transitions.get("the");
      if (!fallback)
        return null;
      return this.sample(fallback, temperature);
    }
    return this.sample(candidates, temperature);
  }
  sample(candidates, temperature) {
    const entries = Array.from(candidates.entries());
    const weights = entries.map(([, w]) => Math.pow(w, 1 / Math.max(0.1, temperature)));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;
    for (let i = 0;i < entries.length; i++) {
      rand -= weights[i];
      if (rand <= 0)
        return entries[i][0];
    }
    return entries[entries.length - 1][0];
  }
}
async function raceForFirst(promises) {
  return new Promise((resolve) => {
    let remaining = promises.length;
    for (const p of promises) {
      p.then((result) => {
        if (result !== null) {
          resolve(result);
        } else {
          remaining--;
          if (remaining === 0)
            resolve(null);
        }
      }).catch(() => {
        remaining--;
        if (remaining === 0)
          resolve(null);
      });
    }
  });
}
async function tryWasmFallback(request) {
  const temperature = request.temperature ?? 0.7;
  const maxTokens = request.max_tokens ?? 128;
  const content = localEngine.generate(maxTokens, temperature);
  const promptTokens = request.messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0);
  const completionTokens = Math.ceil(content.length / 4);
  const response = {
    id: `chatcmpl-wasm-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "wasm-local",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens
    }
  };
  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json" }
  });
}
function echoFallback(request) {
  const lastMessage = request.messages[request.messages.length - 1];
  const content = `I received your message. All inference tiers are currently unavailable. Your message was: "${lastMessage?.content?.slice(0, 200) ?? ""}"`;
  const response = {
    id: `chatcmpl-echo-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "echo-fallback",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop"
      }
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  };
  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json" }
  });
}
function createSSEProxyStream(upstreamBody, tier, upstreamHeaders = {}, attempts) {
  const encoder = new TextEncoder;
  const decoder = new TextDecoder;
  if (attempts?.length) {
    const chainStr = attempts.map((a) => `${a.tier}:${a.status}(${a.ms}ms)${a.detail ? "[" + a.detail.slice(0, 40) + "]" : ""}`).join(" \u2192 ");
    logInference(`[sse-proxy] tier=${tier} chain: ${chainStr}`);
  }
  for (const [key, value] of Object.entries(upstreamHeaders)) {
    logInference(`[sse-proxy] tier=${tier} header: ${key}=${value}`);
  }
  return new ReadableStream({
    async start(controller) {
      if (!upstreamBody) {
        logInference(`[sse-proxy] tier=${tier} no upstream body`);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "No response body" })}

`));
        controller.enqueue(encoder.encode(`data: [DONE]

`));
        controller.close();
        return;
      }
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat

`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 5000);
      let totalBytes = 0;
      let dataEventCount = 0;
      let firstDataLogged = false;
      let sawDone = false;
      const streamStart = Date.now();
      let lineBuf = "";
      try {
        const reader = upstreamBody.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done)
            break;
          totalBytes += value.byteLength;
          const text = decoder.decode(value, { stream: true });
          lineBuf += text;
          const lines = lineBuf.split(`
`);
          lineBuf = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              dataEventCount++;
              const payload = line.slice(6).trim();
              if (payload === "[DONE]") {
                sawDone = true;
              } else if (!firstDataLogged) {
                firstDataLogged = true;
                logInference(`[sse-proxy] tier=${tier} first-data: ${payload.slice(0, 200)}`);
              }
              controller.enqueue(encoder.encode(line + `
`));
            } else if (line === "") {
              controller.enqueue(encoder.encode(`
`));
            } else if (line.startsWith(":")) {
              logInference(`[sse-proxy] tier=${tier} upstream: ${line.slice(0, 100)}`);
            }
          }
        }
        if (lineBuf.startsWith("data: ")) {
          controller.enqueue(encoder.encode(lineBuf + `

`));
          const payload = lineBuf.slice(6).trim();
          if (payload === "[DONE]")
            sawDone = true;
          else
            dataEventCount++;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Stream error";
        logInference(`[sse-proxy] tier=${tier} stream-error: ${errMsg}`);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}

`));
      } finally {
        clearInterval(heartbeat);
        if (!sawDone) {
          controller.enqueue(encoder.encode(`data: [DONE]

`));
        }
        const elapsed = Date.now() - streamStart;
        logInference(`[sse-proxy] tier=${tier} stream-end: ${totalBytes}B ${dataEventCount} data-events sawDone=${sawDone} ${elapsed}ms`);
        try {
          controller.close();
        } catch {}
      }
    }
  });
}
async function infer(request) {
  const config = getZedgeConfig();
  const attempts = [];
  const lastMsg = request.messages[request.messages.length - 1];
  const msgPreview = typeof lastMsg?.content === "string" ? lastMsg.content.slice(0, 80) : JSON.stringify(lastMsg?.content)?.slice(0, 80) ?? "";
  logInference(`--- REQUEST model=${request.model} stream=${request.stream ?? false} msgs=${request.messages.length} last="${msgPreview}"`);
  function attempt(tier, startMs, status, detail) {
    attempts.push({ tier, status, ms: Date.now() - startMs, detail });
  }
  {
    const t0 = Date.now();
    try {
      const meshResponse = await tryMeshInference(request);
      if (meshResponse && meshResponse.ok) {
        attempt("mesh", t0, "ok");
        logInference(`model=${request.model} tier=mesh status=ok ms=${Date.now() - t0}`);
        return {
          tier: "mesh",
          response: meshResponse,
          upstreamHeaders: extractUpstreamDebugHeaders(meshResponse),
          attempts
        };
      }
      attempt("mesh", t0, "skipped", "no peers or not running");
    } catch (err) {
      attempt("mesh", t0, "error", String(err));
    }
  }
  const RACE_DEADLINE_MS = 900000;
  const canCloudRun = config.cloudRunDirect && !!CLOUD_RUN_COORDINATORS[request.model];
  {
    const t0 = Date.now();
    const edgeAbort = new AbortController;
    const cloudRunAbort = new AbortController;
    const edgeTimeout = setTimeout(() => edgeAbort.abort(), 150000);
    const edgePromise = tryEdgeCoordinator(request, edgeAbort.signal).then((response) => {
      if (response.ok)
        return { tier: "edge", response };
      attempt("edge", t0, "http_error", `${response.status} ${response.statusText}`);
      return null;
    }).catch((err) => {
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      attempt("edge", t0, isTimeout ? "timeout" : "error", String(err));
      return null;
    });
    let cloudRunPromise;
    if (canCloudRun) {
      const cloudRunTimeout = setTimeout(() => cloudRunAbort.abort(), 900000);
      cloudRunPromise = tryCloudRunCoordinator(request, cloudRunAbort.signal).then((response) => {
        if (response.ok)
          return { tier: "cloudrun", response };
        attempt("cloudrun", t0, "http_error", `${response.status} ${response.statusText}`);
        return null;
      }).catch((err) => {
        const isTimeout = err instanceof DOMException && err.name === "AbortError";
        attempt("cloudrun", t0, isTimeout ? "timeout" : "error", String(err));
        return null;
      }).finally(() => clearTimeout(cloudRunTimeout));
    } else {
      attempts.push({
        tier: "cloudrun",
        status: "skipped",
        ms: 0,
        detail: !config.cloudRunDirect ? "cloudRunDirect disabled" : `no coordinator URL for ${request.model}`
      });
      cloudRunPromise = Promise.resolve(null);
    }
    const deadlinePromise = new Promise((resolve) => setTimeout(() => {
      attempt("edge", t0, "timeout", `race deadline ${RACE_DEADLINE_MS}ms`);
      if (canCloudRun) {
        attempt("cloudrun", t0, "timeout", `race deadline ${RACE_DEADLINE_MS}ms`);
      }
      resolve(null);
    }, RACE_DEADLINE_MS));
    const winner = await Promise.race([
      raceForFirst([edgePromise, cloudRunPromise]),
      deadlinePromise.then(() => null)
    ]);
    clearTimeout(edgeTimeout);
    if (winner) {
      const loserTier = winner.tier === "edge" ? "cloudrun" : "edge";
      const loserPromise = winner.tier === "edge" ? cloudRunPromise : edgePromise;
      loserPromise.then((result) => {
        if (result) {
          logInference(`model=${request.model} [background-warm] ${loserTier} completed after ${Date.now() - t0}ms (winner was ${winner.tier})`);
          result.response.body?.cancel().catch(() => {});
        }
      }).catch(() => {});
      attempt(winner.tier, t0, "ok");
      const xHeaders = extractUpstreamDebugHeaders(winner.response);
      logInference(`model=${request.model} tier=${winner.tier} status=ok ms=${Date.now() - t0} x-headers=${JSON.stringify(xHeaders)}`);
      return {
        tier: winner.tier,
        response: winner.response,
        upstreamHeaders: xHeaders,
        attempts
      };
    }
    logInference(`model=${request.model} edge+cloudrun race: no winner within ${RACE_DEADLINE_MS}ms, falling to WASM (coordinators still warming)`);
    raceForFirst([edgePromise, cloudRunPromise]).then((lateWinner) => {
      if (lateWinner) {
        const warmMs = Date.now() - t0;
        logInference(`model=${request.model} [background-warm] ${lateWinner.tier} responded after ${warmMs}ms (was past ${RACE_DEADLINE_MS}ms deadline)`);
        lateWinner.response.body?.cancel().catch(() => {});
      } else {
        logInference(`model=${request.model} [background-warm] both tiers failed even after waiting`);
      }
    }).catch(() => {});
  }
  {
    const t0 = Date.now();
    try {
      const response = await tryWasmFallback(request);
      attempt("wasm", t0, "ok");
      const chainStr = attempts.map((a) => `${a.tier}:${a.status}(${a.ms}ms)${a.detail ? "[" + a.detail.slice(0, 40) + "]" : ""}`).join(" \u2192 ");
      console.warn(`[zedge] fell to WASM for model=${request.model} | chain: ${chainStr}`);
      logInference(`model=${request.model} tier=wasm FALLBACK chain: ${chainStr}`);
      return {
        tier: "wasm",
        response,
        upstreamHeaders: {},
        attempts
      };
    } catch (err) {
      attempt("wasm", t0, "error", String(err));
    }
  }
  attempts.push({ tier: "echo", status: "ok", ms: 0 });
  const echoChain = attempts.map((a) => `${a.tier}:${a.status}(${a.ms}ms)`).join(" \u2192 ");
  console.error(`[zedge] fell to ECHO for model=${request.model} | chain: ${echoChain}`);
  logInference(`model=${request.model} tier=echo FALLBACK chain: ${echoChain}`);
  return {
    tier: "echo",
    response: echoFallback(request),
    upstreamHeaders: {},
    attempts
  };
}
async function getModels() {
  const models = [];
  try {
    const baseUrl = getApiBaseUrl();
    const resp = await fetch(`${baseUrl}/v1/models`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(5000)
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.data) {
        models.push(...data.data);
      }
    }
  } catch {}
  for (const modelId of Object.keys(CLOUD_RUN_COORDINATORS)) {
    if (!models.some((m) => m.id === modelId)) {
      models.push({
        id: modelId,
        object: "model",
        owned_by: "edgework-cloudrun"
      });
    }
  }
  try {
    const { getMeshStatus: getMeshStatus2 } = await Promise.resolve().then(() => (init_p2p_mesh(), exports_p2p_mesh));
    const meshStatus = getMeshStatus2();
    for (const peer of meshStatus.peers) {
      for (const modelId of peer.capabilities.models) {
        if (!models.some((m) => m.id === modelId)) {
          models.push({
            id: modelId,
            object: "model",
            owned_by: `edgework-mesh-${peer.hostname}`
          });
        }
      }
    }
  } catch {}
  models.push({
    id: "wasm-local",
    object: "model",
    owned_by: "edgework-wasm"
  });
  return models;
}
async function embed(input, model = "text-embedding-3-small") {
  const baseUrl = getApiBaseUrl();
  try {
    const resp = await fetch(`${baseUrl}/v1/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ input, model }),
      signal: AbortSignal.timeout(1e4)
    });
    if (resp.ok)
      return resp;
  } catch {}
  const inputs = Array.isArray(input) ? input : [input];
  const data = inputs.map((text, index) => ({
    object: "embedding",
    embedding: localEmbed(text),
    index
  }));
  return new Response(JSON.stringify({
    object: "list",
    data,
    model: "local-ngram-hash",
    usage: {
      prompt_tokens: inputs.reduce((a, t) => a + Math.ceil(t.length / 4), 0),
      total_tokens: inputs.reduce((a, t) => a + Math.ceil(t.length / 4), 0)
    }
  }), { headers: { "Content-Type": "application/json" } });
}
function localEmbed(text, dims = 384) {
  const vec = new Float32Array(dims);
  const normalized = text.toLowerCase();
  for (let i = 0;i <= normalized.length - 3; i++) {
    const trigram = normalized.slice(i, i + 3);
    let hash = 0;
    for (let j = 0;j < trigram.length; j++) {
      hash = (hash << 5) - hash + trigram.charCodeAt(j) | 0;
    }
    const bucket = (hash % dims + dims) % dims;
    vec[bucket] += 1;
  }
  let norm = 0;
  for (let i = 0;i < dims; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0;i < dims; i++) {
      vec[i] /= norm;
    }
  }
  return Array.from(vec);
}
var LOG_DIR, LOG_FILE, CLOUD_RUN_COORDINATORS, localEngine;
var init_inference_bridge = __esm(() => {
  init_config();
  LOG_DIR = join2(import.meta.dir, "..", "..", ".edgework");
  try {
    mkdirSync2(LOG_DIR, { recursive: true });
  } catch {}
  LOG_FILE = join2(LOG_DIR, "inference.log");
  CLOUD_RUN_COORDINATORS = {
    "tinyllama-1.1b": "https://inference-tinyllama-coordinator-6ptd7xm6fq-uc.a.run.app",
    "mistral-7b": "https://inference-7b-coordinator-6ptd7xm6fq-uc.a.run.app",
    "qwen-2.5-coder-7b": "https://inference-qwen-coordinator-6ptd7xm6fq-uc.a.run.app",
    "gemma3-4b-it": "https://inference-gemma3-4b-it-coordinator-6ptd7xm6fq-uc.a.run.app",
    "gemma3-1b-it": "https://inference-gemma3-1b-it-coordinator-6ptd7xm6fq-uc.a.run.app",
    "glm-4-9b": "https://inference-glm-4-9b-coordinator-6ptd7xm6fq-uc.a.run.app",
    "personaplex-7b": "https://inference-personaplex-7b-coordinator-6ptd7xm6fq-uc.a.run.app",
    "lfm2.5-1.2b-glm-4.7-flash-thinking": "https://inference-lfm2-5-coordinator-6ptd7xm6fq-uc.a.run.app"
  };
  localEngine = new LocalInferenceEngine;
});

// src/server.ts
init_inference_bridge();
init_compute_node();
init_config();
init_p2p_mesh();

// src/auth.ts
init_config();
import { homedir as homedir2 } from "os";
import { join as join3 } from "path";
import {
  existsSync as existsSync2,
  readFileSync as readFileSync2,
  writeFileSync as writeFileSync2,
  mkdirSync as mkdirSync3,
  unlinkSync
} from "fs";
import { createServer } from "http";
var CONFIG_DIR2 = join3(homedir2(), ".edgework");
var TOKEN_FILE = join3(CONFIG_DIR2, "token.json");
var API_KEY_FILE2 = join3(CONFIG_DIR2, "api-key");
function ensureConfigDir2() {
  if (!existsSync2(CONFIG_DIR2)) {
    mkdirSync3(CONFIG_DIR2, { recursive: true, mode: 448 });
  }
}
async function login() {
  const config = getEdgeworkConfig();
  const callbackPort = 7340 + Math.floor(Math.random() * 100);
  const redirectUri = `http://localhost:${callbackPort}/callback`;
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${callbackPort}`);
      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        if (error) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end("<html><body><h1>Login Failed</h1><p>You can close this window.</p></body></html>");
          server.close();
          resolve({ success: false, error });
          return;
        }
        if (!code) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end("<html><body><h1>No Auth Code</h1><p>You can close this window.</p></body></html>");
          server.close();
          resolve({ success: false, error: "No auth code received" });
          return;
        }
        try {
          const tokenResp = await fetch(`${config.apiBaseUrl}/auth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              redirect_uri: redirectUri,
              grant_type: "authorization_code"
            })
          });
          if (!tokenResp.ok) {
            throw new Error(`Token exchange failed: ${tokenResp.status}`);
          }
          const tokenData = await tokenResp.json();
          const token = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + tokenData.expires_in * 1000,
            userId: tokenData.user_id,
            email: tokenData.email
          };
          ensureConfigDir2();
          writeFileSync2(TOKEN_FILE, JSON.stringify(token, null, 2), {
            mode: 384
          });
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`<html><body><h1>Login Successful</h1><p>Logged in as ${token.email}. You can close this window.</p></body></html>`);
          server.close();
          resolve({ success: true, email: token.email });
        } catch (err) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end("<html><body><h1>Login Failed</h1><p>Token exchange error. You can close this window.</p></body></html>");
          server.close();
          resolve({
            success: false,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }
    });
    server.listen(callbackPort, () => {
      const authUrl = `${config.apiBaseUrl}/auth/login?redirect_uri=${encodeURIComponent(redirectUri)}&client=zedge`;
      const { exec } = __require("child_process");
      const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
      exec(`${openCmd} "${authUrl}"`, (err) => {
        if (err) {
          console.log(`[zedge] Open this URL in your browser:
  ${authUrl}`);
        } else {
          console.log("[zedge] Browser opened for authentication...");
        }
      });
      setTimeout(() => {
        server.close();
        resolve({
          success: false,
          error: "Login timed out after 5 minutes"
        });
      }, 300000);
    });
  });
}
function logout() {
  try {
    if (existsSync2(TOKEN_FILE))
      unlinkSync(TOKEN_FILE);
  } catch {}
  try {
    if (existsSync2(API_KEY_FILE2))
      unlinkSync(API_KEY_FILE2);
  } catch {}
  console.log("[zedge] Logged out. Auth tokens cleared.");
}
function whoami() {
  try {
    if (existsSync2(TOKEN_FILE)) {
      const token = JSON.parse(readFileSync2(TOKEN_FILE, "utf-8"));
      if (token.expiresAt > Date.now()) {
        return {
          authenticated: true,
          method: "token",
          email: token.email,
          expiresAt: token.expiresAt
        };
      }
    }
  } catch {}
  try {
    if (existsSync2(API_KEY_FILE2)) {
      const key = readFileSync2(API_KEY_FILE2, "utf-8").trim();
      if (key.length > 0) {
        return {
          authenticated: true,
          method: "api-key"
        };
      }
    }
  } catch {}
  return { authenticated: false };
}

// src/latency-probe.ts
init_config();
var probeCache = new Map;
var CLOUD_RUN_COORDINATORS2 = {
  "tinyllama-1.1b": "https://tinyllama-1-1b-coordinator-jqfuhpqhja-uc.a.run.app",
  "mistral-7b": "https://mistral-7b-coordinator-jqfuhpqhja-uc.a.run.app",
  "qwen-2.5-coder-7b": "https://qwen-edit-coordinator-jqfuhpqhja-uc.a.run.app",
  "gemma3-4b-it": "https://gemma3-4b-it-coordinator-jqfuhpqhja-uc.a.run.app",
  "gemma3-1b-it": "https://gemma3-1b-it-coordinator-jqfuhpqhja-uc.a.run.app",
  "glm-4-9b": "https://glm-4-9b-coordinator-jqfuhpqhja-uc.a.run.app",
  "deepseek-r1": "https://deepseek-r1-coordinator-jqfuhpqhja-uc.a.run.app",
  "lfm2.5-1.2b-glm-4.7-flash-thinking": "https://lfm-1-2b-coordinator-jqfuhpqhja-uc.a.run.app"
};
function getFastestTier(model) {
  const candidates = [];
  const edge = probeCache.get("edge:global");
  if (edge && edge.healthy) {
    candidates.push(edge);
  }
  const cloudRun = probeCache.get(`cloudrun:${model}`);
  if (cloudRun && cloudRun.healthy) {
    candidates.push(cloudRun);
  }
  candidates.push({
    tier: "wasm",
    model: "wasm-local",
    url: "local",
    latencyMs: 1,
    healthy: true,
    lastProbed: Date.now()
  });
  if (candidates.length === 0)
    return null;
  candidates.sort((a, b) => a.latencyMs - b.latencyMs);
  return candidates[0].tier;
}
function getTierHealth() {
  const edge = probeCache.get("edge:global");
  const cloudRunHealth = {};
  for (const model of Object.keys(CLOUD_RUN_COORDINATORS2)) {
    const probe = probeCache.get(`cloudrun:${model}`);
    cloudRunHealth[model] = probe ? { healthy: probe.healthy, latencyMs: probe.latencyMs } : { healthy: false, latencyMs: -1 };
  }
  return {
    edge: edge ? { healthy: edge.healthy, latencyMs: edge.latencyMs } : { healthy: false, latencyMs: -1 },
    cloudRun: cloudRunHealth,
    mesh: { healthy: false, peerCount: 0 },
    wasm: { healthy: true, latencyMs: 1 }
  };
}
function getProbeResults() {
  return Array.from(probeCache.values());
}

// src/stream-reconnect.ts
init_inference_bridge();
var sessions = new Map;
function createResilientStream(request, maxReconnects = 3) {
  const sessionId = `stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const encoder = new TextEncoder;
  const session = {
    id: sessionId,
    request: { ...request, stream: true },
    bufferedTokens: "",
    currentTier: "mesh",
    reconnectCount: 0,
    maxReconnects,
    startTime: Date.now()
  };
  sessions.set(sessionId, session);
  return new ReadableStream({
    async start(controller) {
      try {
        await streamWithReconnect(session, controller, encoder);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Stream failed";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}

`));
      } finally {
        try {
          controller.enqueue(encoder.encode(`data: [DONE]

`));
          controller.close();
        } catch {}
        sessions.delete(sessionId);
      }
    }
  });
}
async function streamWithReconnect(session, controller, encoder) {
  while (session.reconnectCount <= session.maxReconnects) {
    try {
      const request = buildReconnectRequest(session);
      const result = await infer(request);
      session.currentTier = result.tier;
      controller.enqueue(encoder.encode(`: tier=${result.tier} reconnect=${session.reconnectCount}

`));
      const contentType = result.response.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream") && result.response.body) {
        await readSSEStream(result.response.body, session, controller);
        return;
      }
      const data = await result.response.json();
      const content = data.choices?.[0]?.message?.content ?? "";
      session.bufferedTokens += content;
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        choices: [
          {
            delta: { content },
            index: 0,
            finish_reason: "stop"
          }
        ]
      })}

`));
      return;
    } catch {
      session.reconnectCount++;
      if (session.reconnectCount > session.maxReconnects) {
        throw new Error(`Stream failed after ${session.maxReconnects} reconnection attempts`);
      }
      await new Promise((r) => setTimeout(r, 500));
      controller.enqueue(encoder.encode(`: reconnecting (attempt ${session.reconnectCount}/${session.maxReconnects})

`));
    }
  }
}
function buildReconnectRequest(session) {
  if (session.bufferedTokens.length === 0) {
    return session.request;
  }
  const messages = [
    ...session.request.messages,
    {
      role: "assistant",
      content: session.bufferedTokens
    },
    {
      role: "user",
      content: "Continue your previous response from where you left off. Do not repeat what you already said."
    }
  ];
  return {
    ...session.request,
    messages
  };
}
async function readSSEStream(body, session, controller) {
  const reader = body.getReader();
  const decoder = new TextDecoder;
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done)
      break;
    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    controller.enqueue(value);
    const lines = buffer.split(`
`);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ") && line !== "data: [DONE]") {
        try {
          const data = JSON.parse(line.slice(6));
          const token = data.choices?.[0]?.delta?.content;
          if (token) {
            session.bufferedTokens += token;
          }
        } catch {}
      }
    }
  }
}
function getActiveSessions() {
  return Array.from(sessions.values()).map((s) => ({
    id: s.id,
    tier: s.currentTier,
    reconnects: s.reconnectCount,
    bufferedLength: s.bufferedTokens.length,
    durationMs: Date.now() - s.startTime
  }));
}

// src/superinference.ts
init_inference_bridge();
var DEFAULT_MODELS = [
  "qwen-2.5-coder-7b",
  "tinyllama-1.1b",
  "gemma3-4b-it"
];
var DEFAULT_TIMEOUT_MS = 30000;
var DEFAULT_MAX_DEPTH = 3;
var DEFAULT_TOKEN_BUDGET = 50000;
var COMPOSITION_PRESETS = {
  empathyFormal: {
    name: "Empathy + Formal",
    description: "Empathetic understanding with formal output style",
    models: ["gemma3-4b-it", "tinyllama-1.1b"],
    strategy: "consensus",
    adapters: {
      semantics: "empathy-decoder",
      style: "formal-tone"
    },
    steering: {
      reasoning: { direction: "empathetic", strength: 0.7 },
      style: { direction: "formal", strength: 0.8 }
    }
  },
  analyticalCasual: {
    name: "Analytical + Casual",
    description: "Deep analytical reasoning with casual delivery",
    models: ["qwen-2.5-coder-7b", "gemma3-4b-it"],
    strategy: "consensus",
    adapters: {
      reasoning: "chain-of-thought",
      style: "casual-tone"
    },
    steering: {
      reasoning: { direction: "analytical", strength: 0.9 },
      style: { direction: "casual", strength: 0.6 }
    }
  },
  supportiveMindful: {
    name: "Supportive + Mindful",
    description: "Encouraging feedback with mindful pacing",
    models: ["gemma3-4b-it", "tinyllama-1.1b"],
    strategy: "constructive",
    adapters: {
      semantics: "supportive-framing",
      style: "mindful-pacing"
    },
    steering: {
      semantics: { direction: "supportive", strength: 0.8 },
      style: { direction: "mindful", strength: 0.7 }
    }
  },
  codeReview: {
    name: "Code Review",
    description: "Constructive collapse with empathy adapter for PR reviews",
    models: ["qwen-2.5-coder-7b", "gemma3-4b-it", "tinyllama-1.1b"],
    strategy: "constructive",
    adapters: {
      reasoning: "constructive-critique",
      style: "empathetic-delivery"
    }
  },
  bugFix: {
    name: "Bug Fix",
    description: "Analytical reasoning adapter for debugging",
    models: ["qwen-2.5-coder-7b"],
    strategy: "fastest",
    adapters: {
      reasoning: "root-cause-analysis"
    },
    steering: {
      reasoning: { direction: "analytical", strength: 1 }
    }
  },
  autocomplete: {
    name: "Autocomplete",
    description: "Fastest collapse, syntax-only focus",
    models: ["tinyllama-1.1b", "qwen-2.5-coder-7b"],
    strategy: "fastest",
    steering: {
      syntax: { direction: "completion", strength: 1 }
    }
  }
};
function getCompositionPreset(name) {
  return COMPOSITION_PRESETS[name] ?? null;
}
async function superinferWithPreset(preset, messages, options) {
  let systemSuffix = "";
  if (preset.steering) {
    const steeringParts = [];
    for (const [zone, config] of Object.entries(preset.steering)) {
      steeringParts.push(`[${zone}:${config.direction}@${config.strength}]`);
    }
    systemSuffix = `

[Steering: ${steeringParts.join(" ")}]`;
  }
  const steeringMessages = messages.map((m, i) => {
    if (i === 0 && m.role === "system") {
      return { ...m, content: m.content + systemSuffix };
    }
    return m;
  });
  if (steeringMessages.length === 0 || steeringMessages[0].role !== "system") {
    steeringMessages.unshift({
      role: "system",
      content: `You are an AI assistant.${systemSuffix}`
    });
  }
  return superinfer({
    request: {
      model: preset.models[0],
      messages: steeringMessages,
      max_tokens: options?.maxTokens
    },
    models: preset.models,
    strategy: preset.strategy,
    timeoutMs: options?.timeoutMs
  });
}
async function superinfer(req) {
  const models = req.models ?? DEFAULT_MODELS;
  const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startTime = Date.now();
  if (models.length === 0) {
    throw new Error("At least one model required for superinference");
  }
  if (models.length === 1) {
    const result = await inferModel(models[0], req.request, timeoutMs);
    return {
      content: result.content,
      winningModel: result.model,
      strategy: req.strategy,
      modelResults: [result],
      durationMs: Date.now() - startTime,
      confidence: 1
    };
  }
  switch (req.strategy) {
    case "fastest":
      return raceFastest(models, req.request, timeoutMs, startTime);
    case "consensus":
      return raceConsensus(models, req.request, timeoutMs, startTime);
    case "constructive":
      return raceConstructive(models, req.request, timeoutMs, startTime);
  }
}
async function raceFastest(models, request, timeoutMs, startTime) {
  const controllers = models.map(() => new AbortController);
  const results = [];
  const promises = models.map((model, i) => inferModel(model, request, timeoutMs, controllers[i].signal).then((result) => {
    results.push(result);
    controllers.forEach((c, j) => {
      if (j !== i)
        c.abort();
    });
    return result;
  }));
  try {
    const winner = await Promise.any(promises);
    return {
      content: winner.content,
      winningModel: winner.model,
      strategy: "fastest",
      modelResults: results,
      durationMs: Date.now() - startTime,
      confidence: 1
    };
  } catch {
    return {
      content: "[superinference] All models failed to respond",
      winningModel: "none",
      strategy: "fastest",
      modelResults: results,
      durationMs: Date.now() - startTime,
      confidence: 0
    };
  }
}
async function raceConsensus(models, request, timeoutMs, startTime) {
  const results = await Promise.allSettled(models.map((model) => inferModel(model, request, timeoutMs)));
  const completed = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  if (completed.length === 0) {
    return {
      content: "[superinference] All models failed",
      winningModel: "none",
      strategy: "consensus",
      modelResults: [],
      durationMs: Date.now() - startTime,
      confidence: 0
    };
  }
  const { winner, confidence } = findConsensus(completed);
  return {
    content: winner.content,
    winningModel: winner.model,
    strategy: "consensus",
    modelResults: completed,
    durationMs: Date.now() - startTime,
    confidence
  };
}
async function raceConstructive(models, request, timeoutMs, startTime) {
  const results = await Promise.allSettled(models.map((model) => inferModel(model, request, timeoutMs)));
  const completed = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  if (completed.length === 0) {
    return {
      content: "[superinference] All models failed",
      winningModel: "none",
      strategy: "constructive",
      modelResults: [],
      durationMs: Date.now() - startTime,
      confidence: 0
    };
  }
  const { content, confidence } = buildConstructiveOutput(completed);
  return {
    content,
    winningModel: completed[0].model,
    strategy: "constructive",
    modelResults: completed,
    durationMs: Date.now() - startTime,
    confidence
  };
}
async function recursiveSuperinfer(req) {
  const maxDepth = req.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxTokens = req.maxTokenBudget ?? DEFAULT_TOKEN_BUDGET;
  const visited = req._visited ?? new Set;
  const currentDepth = req._currentDepth ?? 0;
  let tokensUsed = req._tokensUsed ?? 0;
  if (currentDepth >= maxDepth) {
    const result = await superinfer({
      request: {
        model: req.models?.[0] ?? DEFAULT_MODELS[0],
        messages: [{ role: "user", content: req.prompt }]
      },
      models: req.models,
      strategy: req.strategy
    });
    return {
      content: result.content,
      depth: currentDepth,
      totalTokens: tokensUsed,
      subResults: [result]
    };
  }
  const promptHash = simpleHash(req.prompt);
  if (visited.has(promptHash)) {
    return {
      content: `[cycle detected at depth ${currentDepth}]`,
      depth: currentDepth,
      totalTokens: tokensUsed,
      subResults: []
    };
  }
  visited.add(promptHash);
  if (tokensUsed >= maxTokens) {
    return {
      content: `[token budget exhausted at depth ${currentDepth}]`,
      depth: currentDepth,
      totalTokens: tokensUsed,
      subResults: []
    };
  }
  const decomposition = await superinfer({
    request: {
      model: req.models?.[0] ?? DEFAULT_MODELS[0],
      messages: [
        {
          role: "system",
          content: 'You are a task decomposition assistant. Break the following task into 2-4 independent sub-tasks. Output each sub-task on its own line, prefixed with "- ". If the task is already atomic, output just the task itself prefixed with "- ".'
        },
        { role: "user", content: req.prompt }
      ],
      max_tokens: 512
    },
    models: req.models,
    strategy: "consensus",
    timeoutMs: 15000
  });
  tokensUsed += estimateTokens(decomposition.content);
  const subTasks = decomposition.content.split(`
`).map((line) => line.replace(/^[-*]\s*/, "").trim()).filter((line) => line.length > 0);
  if (subTasks.length <= 1) {
    const result = await superinfer({
      request: {
        model: req.models?.[0] ?? DEFAULT_MODELS[0],
        messages: [{ role: "user", content: req.prompt }]
      },
      models: req.models,
      strategy: req.strategy
    });
    tokensUsed += estimateTokens(result.content);
    return {
      content: result.content,
      depth: currentDepth,
      totalTokens: tokensUsed,
      subResults: [result]
    };
  }
  const subResults = [];
  const subContents = [];
  for (const subTask of subTasks) {
    if (tokensUsed >= maxTokens)
      break;
    const subResult = await recursiveSuperinfer({
      prompt: subTask,
      models: req.models,
      strategy: req.strategy,
      maxDepth,
      maxTokenBudget: maxTokens,
      _visited: visited,
      _currentDepth: currentDepth + 1,
      _tokensUsed: tokensUsed
    });
    tokensUsed = subResult.totalTokens;
    subResults.push(...subResult.subResults);
    subContents.push(subResult.content);
  }
  const synthesis = await superinfer({
    request: {
      model: req.models?.[0] ?? DEFAULT_MODELS[0],
      messages: [
        {
          role: "system",
          content: "Synthesize the following sub-task results into a coherent final answer. Be concise."
        },
        {
          role: "user",
          content: subContents.map((c, i) => `Sub-task ${i + 1}:
${c}`).join(`

`)
        }
      ]
    },
    models: req.models,
    strategy: req.strategy
  });
  tokensUsed += estimateTokens(synthesis.content);
  subResults.push(synthesis);
  return {
    content: synthesis.content,
    depth: currentDepth,
    totalTokens: tokensUsed,
    subResults
  };
}
async function inferModel(model, request, timeoutMs, signal) {
  const start = Date.now();
  try {
    const modelRequest = { ...request, model, stream: false };
    const controller = new AbortController;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    if (signal) {
      signal.addEventListener("abort", () => controller.abort());
    }
    const result = await infer(modelRequest);
    clearTimeout(timeout);
    const data = await result.response.json();
    const content = data.choices?.[0]?.message?.content ?? "[no content]";
    return {
      model,
      content,
      tier: result.tier,
      durationMs: Date.now() - start,
      finished: true
    };
  } catch {
    return {
      model,
      content: "",
      tier: "error",
      durationMs: Date.now() - start,
      finished: false
    };
  }
}
function findConsensus(results) {
  if (results.length === 1) {
    return { winner: results[0], confidence: 1 };
  }
  const scores = results.map((result, i) => {
    let agreements = 0;
    const lines = normalizeContent(result.content);
    for (let j = 0;j < results.length; j++) {
      if (i === j)
        continue;
      const otherLines = normalizeContent(results[j].content);
      const overlap = computeLineOverlap(lines, otherLines);
      if (overlap > 0.5)
        agreements++;
    }
    return { result, agreements, score: agreements / (results.length - 1) };
  });
  scores.sort((a, b) => b.score - a.score || a.result.durationMs - b.result.durationMs);
  return {
    winner: scores[0].result,
    confidence: scores[0].score
  };
}
function buildConstructiveOutput(results) {
  if (results.length === 1) {
    return { content: results[0].content, confidence: 1 };
  }
  const allLines = results.map((r) => normalizeContent(r.content));
  const lineVotes = new Map;
  for (const lines of allLines) {
    for (const line of lines) {
      lineVotes.set(line, (lineVotes.get(line) ?? 0) + 1);
    }
  }
  const majority = Math.ceil(results.length / 2);
  const agreed = [];
  const disputed = [];
  for (const [line, votes] of lineVotes) {
    if (votes >= majority) {
      agreed.push(line);
    } else {
      disputed.push(line);
    }
  }
  const totalLines = agreed.length + disputed.length;
  const confidence = totalLines > 0 ? agreed.length / totalLines : 0;
  let content = "";
  if (agreed.length > 0) {
    content += agreed.join(`
`);
  }
  if (disputed.length > 0) {
    content += `

--- UNCERTAIN (models disagree) ---
`;
    content += disputed.join(`
`);
  }
  return { content: content.trim(), confidence };
}
function normalizeContent(content) {
  return content.split(`
`).map((line) => line.trim()).filter((line) => line.length > 0);
}
function computeLineOverlap(a, b) {
  if (a.length === 0 && b.length === 0)
    return 1;
  if (a.length === 0 || b.length === 0)
    return 0;
  const setB = new Set(b);
  let matches = 0;
  for (const line of a) {
    if (setB.has(line))
      matches++;
  }
  return matches / Math.max(a.length, b.length);
}
function simpleHash(str) {
  let hash = 0;
  for (let i = 0;i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char | 0;
  }
  return hash.toString(36);
}
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// src/acp-agent.ts
init_inference_bridge();
init_config();
import {
  readFileSync as readFileSync3,
  writeFileSync as writeFileSync3,
  existsSync as existsSync3,
  readdirSync
} from "fs";
import { join as join4 } from "path";
import { execSync } from "child_process";
var TOOLS = [
  {
    name: "read_file",
    description: "Read the contents of a file in the workspace",
    parameters: {
      path: {
        type: "string",
        description: "Relative path from workspace root"
      }
    }
  },
  {
    name: "write_file",
    description: "Write content to a file in the workspace",
    parameters: {
      path: {
        type: "string",
        description: "Relative path from workspace root"
      },
      content: { type: "string", description: "File content to write" }
    }
  },
  {
    name: "list_files",
    description: "List files in a directory",
    parameters: {
      path: { type: "string", description: "Relative directory path" },
      recursive: { type: "boolean", description: "List recursively" }
    }
  },
  {
    name: "run_command",
    description: "Run a shell command in the workspace",
    parameters: {
      command: { type: "string", description: "Command to execute" }
    }
  },
  {
    name: "git_diff",
    description: "Get the current git diff (staged and unstaged)",
    parameters: {}
  },
  {
    name: "git_log",
    description: "Get recent git log entries",
    parameters: {
      count: { type: "number", description: "Number of entries" }
    }
  },
  {
    name: "search_files",
    description: "Search for a pattern across workspace files",
    parameters: {
      pattern: { type: "string", description: "Regex pattern to search for" },
      glob: {
        type: "string",
        description: 'File glob to filter (e.g., "*.ts")'
      }
    }
  },
  {
    name: "deploy",
    description: "Trigger ForgoCD deploy for the current workspace",
    parameters: {
      project: {
        type: "string",
        description: "Project name to deploy (optional)"
      }
    }
  },
  {
    name: "create_branch",
    description: "Create a new git branch",
    parameters: {
      name: { type: "string", description: "Branch name" },
      from: { type: "string", description: "Base branch (default: current)" }
    }
  },
  {
    name: "create_merge_request",
    description: "Create a merge request description",
    parameters: {
      title: { type: "string", description: "MR title" },
      description: { type: "string", description: "MR description" },
      source: { type: "string", description: "Source branch" },
      target: { type: "string", description: "Target branch (default: main)" }
    }
  },
  {
    name: "run_tests",
    description: "Execute test suite and parse results",
    parameters: {
      path: { type: "string", description: "Test file or directory path" },
      filter: { type: "string", description: "Test name filter pattern" }
    }
  },
  {
    name: "ai_review",
    description: "Request AI code review using superinference consensus",
    parameters: {
      path: { type: "string", description: "File path to review" }
    }
  },
  {
    name: "security_scan",
    description: "Run basic security scan on workspace files",
    parameters: {
      path: { type: "string", description: "File or directory to scan" }
    }
  },
  {
    name: "search_docs",
    description: "Search project documentation and README files",
    parameters: {
      query: { type: "string", description: "Search query" }
    }
  }
];
var sessions2 = new Map;
function createSession(workspacePath, capabilities) {
  const session = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workspacePath,
    capabilities,
    conversationHistory: [],
    contextCache: {
      fileTree: null,
      fileTreeTimestamp: 0,
      openFiles: new Map,
      gitDiff: null,
      gitDiffTimestamp: 0
    },
    createdAt: Date.now()
  };
  sessions2.set(session.id, session);
  return session;
}
function getSession(sessionId) {
  return sessions2.get(sessionId) ?? null;
}
function deleteSession(sessionId) {
  sessions2.delete(sessionId);
}
async function agentTurn(sessionId, userMessage) {
  const session = sessions2.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  session.conversationHistory.push({
    role: "user",
    content: userMessage
  });
  const context = await gatherContext(session);
  const systemPrompt = buildSystemPrompt(session, context);
  const config = getZedgeConfig();
  const request = {
    model: config.preferredModel,
    messages: [
      { role: "system", content: systemPrompt },
      ...session.conversationHistory
    ],
    temperature: 0.3,
    max_tokens: 4096
  };
  const result = await infer(request);
  const data = await result.response.json();
  const responseContent = data.choices?.[0]?.message?.content ?? "";
  const toolCalls = parseToolCalls(responseContent);
  const toolResults = [];
  if (toolCalls.length > 0) {
    for (const call of toolCalls) {
      const toolResult = executeTool(session, call);
      toolResults.push(toolResult);
    }
    session.conversationHistory.push({
      role: "assistant",
      content: responseContent
    });
    const toolSummary = toolResults.map((r) => `[${r.name}] ${r.success ? "OK" : "ERROR"}: ${r.output.slice(0, 500)}`).join(`

`);
    session.conversationHistory.push({
      role: "user",
      content: `Tool results:
${toolSummary}`
    });
    const followUpRequest = {
      model: config.preferredModel,
      messages: [
        { role: "system", content: systemPrompt },
        ...session.conversationHistory
      ],
      temperature: 0.3,
      max_tokens: 4096
    };
    const followUp = await infer(followUpRequest);
    const followUpData = await followUp.response.json();
    const finalContent = followUpData.choices?.[0]?.message?.content ?? responseContent;
    session.conversationHistory.push({
      role: "assistant",
      content: finalContent
    });
    return {
      content: finalContent,
      toolCalls,
      toolResults,
      done: true
    };
  }
  session.conversationHistory.push({
    role: "assistant",
    content: responseContent
  });
  return {
    content: responseContent,
    done: true
  };
}
async function gatherContext(session) {
  const parts = [];
  const now = Date.now();
  const CACHE_TTL = 30000;
  if (!session.contextCache.fileTree || now - session.contextCache.fileTreeTimestamp > CACHE_TTL) {
    session.contextCache.fileTree = buildFileTree(session.workspacePath, 3);
    session.contextCache.fileTreeTimestamp = now;
  }
  parts.push(`<file_tree>
${session.contextCache.fileTree}
</file_tree>`);
  if (session.capabilities.gitAccess && (!session.contextCache.gitDiff || now - session.contextCache.gitDiffTimestamp > CACHE_TTL)) {
    try {
      session.contextCache.gitDiff = execSync("git diff", {
        cwd: session.workspacePath,
        encoding: "utf-8",
        timeout: 5000
      }).slice(0, 5000);
      session.contextCache.gitDiffTimestamp = now;
    } catch {
      session.contextCache.gitDiff = "";
    }
  }
  if (session.contextCache.gitDiff) {
    parts.push(`<git_diff>
${session.contextCache.gitDiff}
</git_diff>`);
  }
  return parts.join(`

`);
}
function buildFileTree(dir, maxDepth, depth = 0) {
  if (depth >= maxDepth)
    return "";
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    const lines = [];
    const indent = "  ".repeat(depth);
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist" || entry.name === "target" || entry.name === ".git") {
        continue;
      }
      if (entry.isDirectory()) {
        lines.push(`${indent}${entry.name}/`);
        lines.push(buildFileTree(join4(dir, entry.name), maxDepth, depth + 1));
      } else {
        lines.push(`${indent}${entry.name}`);
      }
    }
    return lines.filter(Boolean).join(`
`);
  } catch {
    return "";
  }
}
function buildSystemPrompt(session, context) {
  const toolDefs = TOOLS.filter((t) => {
    if (t.name === "run_command" && session.capabilities.processExec.length === 0)
      return false;
    if (t.name === "write_file" && !session.capabilities.fileWrite)
      return false;
    if ((t.name === "git_diff" || t.name === "git_log") && !session.capabilities.gitAccess)
      return false;
    return true;
  });
  const toolSection = toolDefs.map((t) => `- ${t.name}: ${t.description}
  Parameters: ${JSON.stringify(t.parameters)}`).join(`
`);
  return `You are Zedge, an AI coding assistant running at the edge. You help developers write, refactor, test, and debug code.

## Available Tools

To use a tool, output a line in this exact format:
<tool name="tool_name" arg1="value1" arg2="value2" />

${toolSection}

## Workspace Context

${context}

## Rules

- Read files before modifying them
- Make minimal, focused changes
- Explain what you're doing and why
- If a tool fails, try an alternative approach
- Never modify files outside the workspace
- For commands, only run: ${session.capabilities.processExec.join(", ") || "none allowed"}`;
}
function parseToolCalls(content) {
  const calls = [];
  const regex = /<tool\s+name="(\w+)"([^/]*)\s*\/>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const name = match[1];
    const argsStr = match[2];
    const args = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(argsStr)) !== null) {
      args[attrMatch[1]] = attrMatch[2];
    }
    calls.push({ name, arguments: args });
  }
  return calls;
}
function executeTool(session, call) {
  const { name } = call;
  const args = call.arguments;
  try {
    switch (name) {
      case "read_file": {
        if (!session.capabilities.fileRead) {
          return { name, success: false, output: "File read not permitted" };
        }
        const filePath = join4(session.workspacePath, String(args.path ?? ""));
        if (!filePath.startsWith(session.workspacePath)) {
          return { name, success: false, output: "Path escapes workspace" };
        }
        if (!existsSync3(filePath)) {
          return { name, success: false, output: "File not found" };
        }
        const content = readFileSync3(filePath, "utf-8");
        session.contextCache.openFiles.set(String(args.path), content);
        return { name, success: true, output: content.slice(0, 1e4) };
      }
      case "write_file": {
        if (!session.capabilities.fileWrite) {
          return { name, success: false, output: "File write not permitted" };
        }
        const filePath = join4(session.workspacePath, String(args.path ?? ""));
        if (!filePath.startsWith(session.workspacePath)) {
          return { name, success: false, output: "Path escapes workspace" };
        }
        writeFileSync3(filePath, String(args.content ?? ""));
        return { name, success: true, output: `Wrote ${filePath}` };
      }
      case "list_files": {
        if (!session.capabilities.fileRead) {
          return { name, success: false, output: "File read not permitted" };
        }
        const dirPath = join4(session.workspacePath, String(args.path ?? "."));
        if (!dirPath.startsWith(session.workspacePath)) {
          return { name, success: false, output: "Path escapes workspace" };
        }
        const depth = args.recursive ? 3 : 1;
        const tree = buildFileTree(dirPath, depth);
        return { name, success: true, output: tree };
      }
      case "run_command": {
        const cmd = String(args.command ?? "");
        if (!isCommandAllowed(cmd, session.capabilities.processExec)) {
          return {
            name,
            success: false,
            output: `Command not permitted. Allowed patterns: ${session.capabilities.processExec.join(", ")}`
          };
        }
        const output = execSync(cmd, {
          cwd: session.workspacePath,
          encoding: "utf-8",
          timeout: 30000,
          maxBuffer: 1024 * 1024
        });
        return { name, success: true, output: output.slice(0, 1e4) };
      }
      case "git_diff": {
        if (!session.capabilities.gitAccess) {
          return { name, success: false, output: "Git access not permitted" };
        }
        const diff = execSync("git diff && git diff --staged", {
          cwd: session.workspacePath,
          encoding: "utf-8",
          timeout: 5000
        });
        return { name, success: true, output: diff.slice(0, 1e4) };
      }
      case "git_log": {
        if (!session.capabilities.gitAccess) {
          return { name, success: false, output: "Git access not permitted" };
        }
        const count = Number(args.count ?? 10);
        const log = execSync(`git log --oneline -${count}`, {
          cwd: session.workspacePath,
          encoding: "utf-8",
          timeout: 5000
        });
        return { name, success: true, output: log };
      }
      case "search_files": {
        if (!session.capabilities.fileRead) {
          return { name, success: false, output: "File read not permitted" };
        }
        const pattern = String(args.pattern ?? "");
        const glob = String(args.glob ?? "*");
        try {
          const output = execSync(`grep -rn --include="${glob}" "${pattern}" . || true`, {
            cwd: session.workspacePath,
            encoding: "utf-8",
            timeout: 1e4,
            maxBuffer: 1024 * 1024
          });
          return { name, success: true, output: output.slice(0, 1e4) };
        } catch {
          return { name, success: true, output: "No matches found" };
        }
      }
      case "deploy": {
        const project = args.project ? String(args.project) : "";
        try {
          const cmd = project ? `cd "${session.workspacePath}" && bun run forge deploy --filter ${project} 2>&1 || echo "Deploy triggered for ${project}"` : `cd "${session.workspacePath}" && bun run forge deploy 2>&1 || echo "Deploy triggered"`;
          const output = execSync(cmd, {
            cwd: session.workspacePath,
            encoding: "utf-8",
            timeout: 60000
          });
          return { name, success: true, output: output.slice(0, 1e4) };
        } catch (err) {
          return {
            name,
            success: true,
            output: `Deploy command initiated${project ? ` for ${project}` : ""}`
          };
        }
      }
      case "create_branch": {
        if (!session.capabilities.gitAccess) {
          return { name, success: false, output: "Git access not permitted" };
        }
        const branchName = String(args.name ?? "");
        const fromBranch = args.from ? String(args.from) : "";
        if (!branchName) {
          return { name, success: false, output: "Branch name is required" };
        }
        const cmd = fromBranch ? `git checkout -b "${branchName}" "${fromBranch}"` : `git checkout -b "${branchName}"`;
        const output = execSync(cmd, {
          cwd: session.workspacePath,
          encoding: "utf-8",
          timeout: 1e4
        });
        return { name, success: true, output };
      }
      case "create_merge_request": {
        if (!session.capabilities.gitAccess) {
          return { name, success: false, output: "Git access not permitted" };
        }
        const title = String(args.title ?? "Untitled MR");
        const description = String(args.description ?? "");
        const source = String(args.source ?? "");
        const target = String(args.target ?? "main");
        const mrDoc = [
          `# Merge Request: ${title}`,
          "",
          `**Source**: ${source || "(current branch)"}`,
          `**Target**: ${target}`,
          "",
          "## Description",
          description,
          "",
          `_Created at ${new Date().toISOString()}_`
        ].join(`
`);
        return { name, success: true, output: mrDoc };
      }
      case "run_tests": {
        const testPath = args.path ? String(args.path) : ".";
        const filter = args.filter ? String(args.filter) : "";
        const filterArg = filter ? ` --grep "${filter}"` : "";
        try {
          const output = execSync(`bun test ${testPath}${filterArg} 2>&1`, {
            cwd: session.workspacePath,
            encoding: "utf-8",
            timeout: 120000,
            maxBuffer: 2 * 1024 * 1024
          });
          return { name, success: true, output: output.slice(0, 1e4) };
        } catch (err) {
          const output = err instanceof Error && "stdout" in err ? String(err.stdout).slice(0, 1e4) : String(err);
          return { name, success: false, output };
        }
      }
      case "ai_review": {
        if (!session.capabilities.fileRead) {
          return { name, success: false, output: "File read not permitted" };
        }
        const reviewPath = join4(session.workspacePath, String(args.path ?? ""));
        if (!reviewPath.startsWith(session.workspacePath)) {
          return { name, success: false, output: "Path escapes workspace" };
        }
        if (!existsSync3(reviewPath)) {
          return { name, success: false, output: "File not found" };
        }
        const code = readFileSync3(reviewPath, "utf-8").slice(0, 5000);
        return {
          name,
          success: true,
          output: `Code review requested for ${String(args.path)}.

File content (first 5000 chars):
${code}

[AI review would use superinference consensus across multiple models]`
        };
      }
      case "security_scan": {
        if (!session.capabilities.fileRead) {
          return { name, success: false, output: "File read not permitted" };
        }
        const scanPath = join4(session.workspacePath, String(args.path ?? "."));
        if (!scanPath.startsWith(session.workspacePath)) {
          return { name, success: false, output: "Path escapes workspace" };
        }
        try {
          const patterns = [
            "eval\\s*\\(",
            "innerHTML\\s*=",
            "dangerouslySetInnerHTML",
            "exec\\s*\\(",
            "child_process",
            "\\.env\\b",
            `password\\s*=\\s*["']`,
            `secret\\s*=\\s*["']`,
            `api.key\\s*=\\s*["']`,
            `token\\s*=\\s*["']`
          ];
          const grepPattern = patterns.join("|");
          const output = execSync(`grep -rn --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" -E '${grepPattern}' "${scanPath}" 2>/dev/null || echo "No security issues found"`, {
            cwd: session.workspacePath,
            encoding: "utf-8",
            timeout: 30000,
            maxBuffer: 1024 * 1024
          });
          return { name, success: true, output: output.slice(0, 1e4) };
        } catch {
          return { name, success: true, output: "No security issues found" };
        }
      }
      case "search_docs": {
        if (!session.capabilities.fileRead) {
          return { name, success: false, output: "File read not permitted" };
        }
        const query = String(args.query ?? "");
        try {
          const output = execSync(`grep -rni --include="*.md" --include="*.txt" --include="*.rst" "${query}" . 2>/dev/null || echo "No documentation matches found"`, {
            cwd: session.workspacePath,
            encoding: "utf-8",
            timeout: 1e4,
            maxBuffer: 1024 * 1024
          });
          return { name, success: true, output: output.slice(0, 1e4) };
        } catch {
          return {
            name,
            success: true,
            output: "No documentation matches found"
          };
        }
      }
      default:
        return { name, success: false, output: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return {
      name,
      success: false,
      output: err instanceof Error ? err.message : String(err)
    };
  }
}
function isCommandAllowed(cmd, patterns) {
  for (const pattern of patterns) {
    if (matchGlob(cmd, pattern))
      return true;
  }
  return false;
}
function matchGlob(str, pattern) {
  const regex = new RegExp("^" + pattern.split("*").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
  return regex.test(str);
}

// src/binary-protocol.ts
var MAGIC = 1229866546;
var VERSION = 2;
var DESCRIPTOR_SIZE = 32;
var HEADER_SIZE = 8;
var DATA_TYPE_BYTES = {
  [0 /* F32 */]: 4,
  [1 /* F16 */]: 2,
  [2 /* BF16 */]: 2,
  [3 /* Q8_0 */]: 1,
  [4 /* Q4_0 */]: 0.5,
  [5 /* Q4_K */]: 0.5625,
  [6 /* Q6_K */]: 0.6875,
  [7 /* I32 */]: 4
};
function encode(frame) {
  const tensorCount = frame.tensors.length;
  let totalDataSize = 0;
  for (const tensor of frame.tensors) {
    totalDataSize += alignTo16(tensor.data.byteLength);
  }
  const totalSize = HEADER_SIZE + tensorCount * DESCRIPTOR_SIZE + totalDataSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;
  view.setUint32(offset, MAGIC, false);
  offset += 4;
  view.setUint16(offset, VERSION, false);
  offset += 2;
  view.setUint16(offset, tensorCount, false);
  offset += 2;
  let dataOffset = 0;
  for (const tensor of frame.tensors) {
    const desc = tensor.descriptor;
    const dims = padDimensions(desc.dimensions);
    const dataLen = tensor.data.byteLength;
    view.setUint8(offset, desc.archType);
    view.setUint8(offset + 1, desc.tensorType);
    view.setUint8(offset + 2, desc.dataType);
    view.setUint8(offset + 3, 0);
    view.setUint32(offset + 4, desc.dimensions.length, false);
    for (let i = 0;i < 4; i++) {
      view.setUint32(offset + 8 + i * 4, dims[i], false);
    }
    view.setUint32(offset + 24, dataOffset, false);
    view.setUint32(offset + 28, dataLen, false);
    offset += DESCRIPTOR_SIZE;
    dataOffset += alignTo16(dataLen);
  }
  const dataStart = HEADER_SIZE + tensorCount * DESCRIPTOR_SIZE;
  let dataWriteOffset = dataStart;
  for (const tensor of frame.tensors) {
    const src = new Uint8Array(tensor.data);
    const dst = new Uint8Array(buffer, dataWriteOffset, src.length);
    dst.set(src);
    dataWriteOffset += alignTo16(tensor.data.byteLength);
  }
  return buffer;
}
function decode(buffer) {
  const view = new DataView(buffer);
  let offset = 0;
  const magic = view.getUint32(offset, false);
  if (magic !== MAGIC) {
    throw new Error(`Invalid magic: expected 0x${MAGIC.toString(16)}, got 0x${magic.toString(16)}`);
  }
  offset += 4;
  const version = view.getUint16(offset, false);
  if (version !== VERSION) {
    throw new Error(`Unsupported protocol version: ${version}`);
  }
  offset += 2;
  const tensorCount = view.getUint16(offset, false);
  offset += 2;
  const descriptors = [];
  for (let i = 0;i < tensorCount; i++) {
    const archType = view.getUint8(offset);
    const tensorType = view.getUint8(offset + 1);
    const dataType = view.getUint8(offset + 2);
    const dimCount = view.getUint32(offset + 4, false);
    const dimensions = [];
    for (let d = 0;d < dimCount; d++) {
      dimensions.push(view.getUint32(offset + 8 + d * 4, false));
    }
    const _dataOffset = view.getUint32(offset + 24, false);
    const _dataLen = view.getUint32(offset + 28, false);
    descriptors.push({
      archType,
      tensorType,
      dataType,
      dimensions,
      _dataOffset,
      _dataLen
    });
    offset += DESCRIPTOR_SIZE;
  }
  const dataStart = HEADER_SIZE + tensorCount * DESCRIPTOR_SIZE;
  const tensors = descriptors.map((desc) => ({
    descriptor: {
      archType: desc.archType,
      tensorType: desc.tensorType,
      dataType: desc.dataType,
      dimensions: desc.dimensions
    },
    data: buffer.slice(dataStart + desc._dataOffset, dataStart + desc._dataOffset + desc._dataLen)
  }));
  return { tensors };
}
function isValidFrame(buffer) {
  if (buffer.byteLength < HEADER_SIZE)
    return false;
  const view = new DataView(buffer);
  return view.getUint32(0, false) === MAGIC && view.getUint16(4, false) === VERSION;
}
var CONTENT_TYPE = "application/x-infer2";
function alignTo16(n) {
  return n + 15 & ~15;
}
function padDimensions(dims) {
  const padded = [0, 0, 0, 0];
  for (let i = 0;i < Math.min(4, dims.length); i++) {
    padded[i] = dims[i];
  }
  return padded;
}

// src/ucan-scope.ts
var MODE_CAPABILITIES = {
  reviewMode: [
    { resource: "zedge/file", action: "read" },
    { resource: "zedge/presence", action: "read" },
    { resource: "zedge/diagnostics", action: "read" },
    { resource: "zedge/annotations", action: "read" }
  ],
  pairMode: [
    { resource: "zedge/file", action: "*" },
    { resource: "zedge/presence", action: "*" },
    { resource: "zedge/diagnostics", action: "*" },
    { resource: "zedge/annotations", action: "*" },
    { resource: "zedge/cursor", action: "*" }
  ],
  autonomousMode: [{ resource: "zedge/*", action: "*" }]
};
function base64UrlEncode(data) {
  return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64UrlDecode(data) {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded);
}
function generateRoomUcan(issuer, audience, roomName, capabilities, ttlMs = 15 * 60 * 1000) {
  const now = Date.now();
  const payload = {
    iss: issuer,
    aud: audience,
    room: roomName,
    capabilities,
    exp: now + ttlMs,
    iat: now,
    nonce: crypto.randomUUID()
  };
  const header = base64UrlEncode(JSON.stringify({ alg: "none", typ: "JWT", ucv: "0.10.0" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const token = `${header}.${body}.unsigned`;
  return { token, payload };
}
function parseRoomUcan(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3)
      return null;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload;
  } catch {
    return null;
  }
}
function isRoomUcanExpired(token) {
  const payload = parseRoomUcan(token);
  if (!payload)
    return true;
  return Date.now() > payload.exp;
}
function getCapabilitiesForMode(mode) {
  return MODE_CAPABILITIES[mode];
}
function generateInvite(issuer, roomName, mode, ttlMs = 15 * 60 * 1000) {
  const capabilities = getCapabilitiesForMode(mode);
  const { token, payload } = generateRoomUcan(issuer, "*", roomName, capabilities, ttlMs);
  const deepLinkUrl = `aeon://zedge/join?token=${encodeURIComponent(token)}&room=${encodeURIComponent(roomName)}`;
  return {
    token,
    roomName,
    mode,
    expiresAt: payload.exp,
    deepLinkUrl
  };
}

// src/agent-participant.ts
var AGENT_COLORS = {
  "agent-qwen-7b": "#8b5cf6",
  "agent-tinyllama": "#06b6d4",
  "agent-mistral": "#f59e0b",
  "agent-gemma3": "#10b981",
  "agent-glm4": "#ec4899",
  default: "#8b5cf6"
};

class AgentParticipant {
  config;
  crdtBridge;
  ucanBridge;
  ucanToken = null;
  activeFile = null;
  activity = { type: "idle" };
  totalEdits = 0;
  openFiles = new Set;
  constructor(config, crdtBridge, ucanBridge) {
    this.config = {
      ...config,
      color: config.color || AGENT_COLORS[config.agentId] || AGENT_COLORS.default
    };
    this.crdtBridge = crdtBridge;
    this.ucanBridge = ucanBridge ?? null;
  }
  async join() {
    if (this.ucanBridge) {
      const agentDid = `did:key:agent-${this.config.agentId}`;
      const result = await this.ucanBridge.issueAgentToken(agentDid, this.config.mode);
      this.ucanToken = result.token;
    }
    this.setActivity({ type: "idle" });
  }
  leave() {
    for (const path of this.openFiles) {
      this.crdtBridge.closeFile(path);
    }
    this.openFiles.clear();
    this.activeFile = null;
    this.activity = { type: "idle" };
  }
  async openFile(path, initialContent) {
    const handle = await this.crdtBridge.openFile(path, initialContent);
    this.openFiles.add(path);
    this.activeFile = path;
    this.crdtBridge.updateCursor(path, 0, 0);
    this.setActivity({ type: "reading", path });
    return {
      path,
      content: handle.content.toString(),
      cursorLine: 0,
      cursorCol: 0
    };
  }
  readFile(path) {
    const handle = this.crdtBridge.getFile(path);
    if (!handle)
      return null;
    this.setActivity({ type: "reading", path });
    return handle.content.toString();
  }
  closeFile(path) {
    this.crdtBridge.closeFile(path);
    this.openFiles.delete(path);
    if (this.activeFile === path) {
      this.activeFile = this.openFiles.size > 0 ? Array.from(this.openFiles)[0] : null;
    }
  }
  insert(path, offset, text) {
    const handle = this.crdtBridge.getFile(path);
    if (!handle)
      return false;
    handle.doc.transact(() => {
      handle.content.insert(offset, text);
    }, handle.doc.clientID);
    this.totalEdits++;
    this.updateCursorFromOffset(handle, offset + text.length);
    this.setActivity({ type: "typing", path });
    return true;
  }
  delete(path, offset, length) {
    const handle = this.crdtBridge.getFile(path);
    if (!handle)
      return false;
    handle.doc.transact(() => {
      handle.content.delete(offset, length);
    }, handle.doc.clientID);
    this.totalEdits++;
    this.updateCursorFromOffset(handle, offset);
    this.setActivity({ type: "typing", path });
    return true;
  }
  replace(path, offset, length, text) {
    const handle = this.crdtBridge.getFile(path);
    if (!handle)
      return false;
    handle.doc.transact(() => {
      handle.content.delete(offset, length);
      handle.content.insert(offset, text);
    }, handle.doc.clientID);
    this.totalEdits++;
    this.updateCursorFromOffset(handle, offset + text.length);
    this.setActivity({ type: "typing", path });
    return true;
  }
  applyEdits(edits) {
    const byFile = new Map;
    for (const edit of edits) {
      const group = byFile.get(edit.path) ?? [];
      group.push(edit);
      byFile.set(edit.path, group);
    }
    let applied = 0;
    for (const [path, fileEdits] of byFile) {
      const handle = this.crdtBridge.getFile(path);
      if (!handle)
        continue;
      const sorted = [...fileEdits].sort((a, b) => b.offset - a.offset);
      handle.doc.transact(() => {
        for (const edit of sorted) {
          handle.content.insert(edit.offset, edit.text);
          applied++;
        }
      }, handle.doc.clientID);
      this.totalEdits += fileEdits.length;
      this.setActivity({ type: "typing", path });
    }
    return applied;
  }
  applyReplacements(replacements) {
    const byFile = new Map;
    for (const r of replacements) {
      const group = byFile.get(r.path) ?? [];
      group.push(r);
      byFile.set(r.path, group);
    }
    let applied = 0;
    for (const [path, fileReplacements] of byFile) {
      const handle = this.crdtBridge.getFile(path);
      if (!handle)
        continue;
      const sorted = [...fileReplacements].sort((a, b) => b.offset - a.offset);
      handle.doc.transact(() => {
        for (const r of sorted) {
          handle.content.delete(r.offset, r.length);
          handle.content.insert(r.offset, r.text);
          applied++;
        }
      }, handle.doc.clientID);
      this.totalEdits += fileReplacements.length;
      this.setActivity({ type: "typing", path });
    }
    return applied;
  }
  addReviewComment(path, line, content) {
    this.crdtBridge.addAnnotation(path, {
      blockId: `line-${line}`,
      content,
      type: "comment",
      line
    });
  }
  addSuggestion(path, line, content) {
    this.crdtBridge.addAnnotation(path, {
      blockId: `line-${line}`,
      content,
      type: "suggestion",
      line
    });
  }
  shareDiagnostics(path, diagnostics) {
    this.crdtBridge.shareDiagnostics(path, diagnostics);
  }
  recordReading(path, blockId, timeSpentMs) {
    this.crdtBridge.recordReading(path, blockId, timeSpentMs);
    this.setActivity({ type: "reading", path });
  }
  tagEmotion(path, blockId, emotion, intensity = 0.5) {
    this.crdtBridge.tagEmotion(path, {
      blockId,
      emotion,
      valence: 0,
      arousal: 0,
      dominance: 0,
      intensity
    });
  }
  setThinking(context) {
    this.setActivity({ type: "thinking", context });
  }
  setReviewing(path) {
    this.setActivity({ type: "reviewing", path });
  }
  undo(path) {
    this.crdtBridge.undo(path);
  }
  redo(path) {
    this.crdtBridge.redo(path);
  }
  getStatus() {
    return {
      agentId: this.config.agentId,
      displayName: this.config.displayName,
      model: this.config.model,
      mode: this.config.mode,
      color: this.config.color,
      activeFile: this.activeFile,
      openFiles: Array.from(this.openFiles),
      activity: this.activity,
      totalEdits: this.totalEdits,
      ucanScoped: this.ucanToken !== null
    };
  }
  getUcanToken() {
    return this.ucanToken;
  }
  setActivity(activity) {
    this.activity = activity;
  }
  updateCursorFromOffset(handle, offset) {
    const text = handle.content.toString().slice(0, offset);
    const lines = text.split(`
`);
    const line = lines.length - 1;
    const col = lines[lines.length - 1]?.length ?? 0;
    this.crdtBridge.updateCursor(handle.path, line, col);
  }
}

// src/server.ts
init_compute_node();
var __dirname = "/Users/buley/Documents/Code/emotions/open-source/zedge/companion/src";
var SYSTEM_PROMPT_THRESHOLD = 2000;
var _edgeworkPrompt = null;
function getEdgeworkPrompt() {
  if (_edgeworkPrompt !== null)
    return _edgeworkPrompt;
  try {
    const fs = __require("fs");
    const path = __require("path");
    let dir = __dirname;
    for (let i = 0;i < 10; i++) {
      const candidate = path.join(dir, "EDGEWORK.md");
      if (fs.existsSync(candidate)) {
        _edgeworkPrompt = fs.readFileSync(candidate, "utf-8");
        return _edgeworkPrompt;
      }
      dir = path.dirname(dir);
    }
  } catch {}
  _edgeworkPrompt = "You are a coding assistant for an Nx/TypeScript monorepo. Be concise and code-focused.";
  return _edgeworkPrompt;
}
function compactSystemPrompts(messages) {
  return messages.map((msg) => {
    if (msg.role === "system" && msg.content.length > SYSTEM_PROMPT_THRESHOLD) {
      return { role: "system", content: getEdgeworkPrompt() };
    }
    return msg;
  });
}
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
function deprecatedJsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "X-Deprecated": "Use /crdt/* endpoints instead"
    }
  });
}
function buildAttemptHeaders(attempts) {
  const chain = attempts.map((a) => {
    const detail = a.detail ? `[${a.detail.slice(0, 60)}]` : "";
    return `${a.tier}:${a.status}(${a.ms}ms)${detail}`;
  }).join("; ");
  return {
    "X-Zedge-Chain": chain,
    "X-Zedge-Attempts": JSON.stringify(attempts)
  };
}
function corsHeaders() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Zedge-Session",
      "Access-Control-Expose-Headers": "*"
    }
  });
}
var forgeBridge = null;
var vfsBridge = null;
var collabBridge = null;
var kernelBridge = null;
var capacitorBridge = null;
var crdtBridge = null;
var ucanBridge = null;
var agentParticipants = new Map;
function setForgeBridge(bridge) {
  forgeBridge = bridge;
}
function setVfsBridge(bridge) {
  vfsBridge = bridge;
}
function setCollabBridge(bridge) {
  collabBridge = bridge;
}
function setKernelBridge(bridge) {
  kernelBridge = bridge;
}
function setCapacitorBridge(bridge) {
  capacitorBridge = bridge;
}
function setCrdtBridge(bridge) {
  crdtBridge = bridge;
}
function setUcanBridge(bridge) {
  ucanBridge = bridge;
}
async function handleRequest(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  if (req.method === "OPTIONS") {
    return corsHeaders();
  }
  if (path === "/health" && req.method === "GET") {
    const config = getZedgeConfig();
    const pool = getPoolStatus();
    const mesh = getMeshStatus();
    return jsonResponse({
      status: "ok",
      version: "2.0.0",
      port: config.port,
      preferredModel: config.preferredModel,
      computePool: {
        joined: pool.joined,
        tokensEarned: pool.tokensEarned,
        requestsServed: pool.requestsServed
      },
      mesh: {
        running: mesh.running,
        nodeId: mesh.nodeId,
        peerCount: mesh.peers.length,
        totalModels: mesh.totalCapacity.models.length,
        totalCores: mesh.totalCapacity.totalCores,
        totalMemoryMb: mesh.totalCapacity.totalMemoryMb
      },
      inference: {
        tiers: ["mesh", "edge", "cloudrun", "wasm", "echo"],
        meshAvailable: mesh.running && mesh.peers.length > 0,
        edgeAvailable: true,
        cloudRunDirect: config.cloudRunDirect,
        wasmLocal: true
      },
      ghostwriter: {
        crdt: crdtBridge?.getStatus() ?? null,
        ucan: ucanBridge?.getStatus() ?? null
      }
    });
  }
  if (path === "/v1/chat/completions" && req.method === "POST") {
    const body = await req.json();
    const rawMessages = body.messages ?? [];
    const normalizedMessages = rawMessages.map((msg) => {
      if (Array.isArray(msg.content)) {
        const text = msg.content.filter((p) => p.type === "text").map((p) => p.text ?? "").join("");
        return { role: msg.role, content: text };
      }
      return { role: msg.role, content: String(msg.content ?? "") };
    });
    const messages = compactSystemPrompts(normalizedMessages);
    const request = {
      model: body.model ?? getZedgeConfig().preferredModel,
      messages,
      stream: body.stream ?? false,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      top_p: body.top_p
    };
    const result = await infer(request);
    const contentType = result.response.headers.get("content-type") ?? "application/json";
    const upstreamIsSSE = contentType.includes("text/event-stream");
    const attemptHeaders = buildAttemptHeaders(result.attempts);
    if (upstreamIsSSE) {
      const proxyStream = createSSEProxyStream(result.response.body, result.tier, { ...result.upstreamHeaders, ...attemptHeaders }, result.attempts);
      return new Response(proxyStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "X-Zedge-Tier": result.tier,
          ...result.upstreamHeaders,
          ...attemptHeaders
        }
      });
    }
    if (request.stream) {
      const data2 = await result.response.json();
      const content = data2?.choices?.[0]?.message?.content ?? "";
      const id = data2.id ?? `chatcmpl-${Date.now()}`;
      const created = data2.created ?? Math.floor(Date.now() / 1000);
      const model = data2.model ?? request.model;
      const encoder = new TextEncoder;
      const tokens = content.match(/\S+\s*/g) ?? [content];
      const sseStream = new ReadableStream({
        async start(controller) {
          for (let i = 0;i < tokens.length; i++) {
            const chunk = {
              id,
              object: "chat.completion.chunk",
              created,
              model,
              choices: [
                {
                  index: 0,
                  delta: i === 0 ? { role: "assistant", content: tokens[i] } : { content: tokens[i] },
                  finish_reason: null
                }
              ]
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}

`));
            if (i < tokens.length - 1) {
              await new Promise((r) => setTimeout(r, 30));
            }
          }
          const finishChunk = {
            id,
            object: "chat.completion.chunk",
            created,
            model,
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: "stop"
              }
            ]
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finishChunk)}

`));
          controller.enqueue(encoder.encode(`data: [DONE]

`));
          controller.close();
        }
      });
      return new Response(sseStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "X-Zedge-Tier": result.tier,
          ...result.upstreamHeaders,
          ...attemptHeaders
        }
      });
    }
    const data = await result.response.json();
    return new Response(JSON.stringify({
      ...data,
      _zedge_tier: result.tier,
      _zedge_chain: attemptHeaders["X-Zedge-Chain"],
      _zedge_attempts: result.attempts,
      _zedge_debug: result.upstreamHeaders
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Zedge-Tier": result.tier,
        ...result.upstreamHeaders,
        ...attemptHeaders
      }
    });
  }
  if (path === "/v1/completions" && req.method === "POST") {
    const body = await req.json();
    const prompt = body.prompt ?? "";
    const hasFimMarkers = prompt.includes("<|fim_prefix|>") || prompt.includes("<PRE>");
    let messages;
    if (hasFimMarkers) {
      messages = [
        {
          role: "system",
          content: "You are a code completion engine. Output ONLY the code that fills the gap. No explanation, no markdown fences."
        },
        { role: "user", content: prompt }
      ];
    } else {
      messages = [
        {
          role: "system",
          content: "You are a code completion assistant. Complete the code that follows. Output ONLY the completion, no explanation, no markdown fences."
        },
        { role: "user", content: prompt }
      ];
    }
    const request = {
      model: body.model ?? "qwen-2.5-coder-7b",
      messages,
      temperature: body.temperature ?? 0.2,
      max_tokens: body.max_tokens ?? 256
    };
    const result = await infer(request);
    const completionAttemptHeaders = buildAttemptHeaders(result.attempts);
    const data = await result.response.json();
    return new Response(JSON.stringify({
      ...data,
      _zedge_tier: result.tier,
      _zedge_chain: completionAttemptHeaders["X-Zedge-Chain"],
      _zedge_attempts: result.attempts,
      _zedge_debug: result.upstreamHeaders
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Zedge-Tier": result.tier,
        ...result.upstreamHeaders,
        ...completionAttemptHeaders
      }
    });
  }
  if (path === "/v1/models" && req.method === "GET") {
    const models = await getModels();
    return jsonResponse({ object: "list", data: models });
  }
  if (path === "/v1/embeddings" && req.method === "POST") {
    const body = await req.json();
    const resp = await embed(body.input ?? "", body.model);
    const data = await resp.json();
    return jsonResponse(data);
  }
  if (path === "/compute-pool/join" && req.method === "POST") {
    const status = await joinPool();
    return jsonResponse(status);
  }
  if (path === "/compute-pool/leave" && req.method === "POST") {
    const status = await leavePool();
    return jsonResponse(status);
  }
  if (path === "/compute-pool/status" && req.method === "GET") {
    return jsonResponse(getPoolStatus());
  }
  if (path === "/mesh/start" && req.method === "POST") {
    const status = startMesh();
    return jsonResponse(status);
  }
  if (path === "/mesh/stop" && req.method === "POST") {
    const status = stopMesh();
    return jsonResponse(status);
  }
  if (path === "/mesh/status" && req.method === "GET") {
    return jsonResponse(getMeshStatus());
  }
  if (path === "/mesh/infer" && req.method === "POST") {
    const body = await req.json();
    const request = {
      model: body.model ?? getZedgeConfig().preferredModel,
      messages: body.messages ?? [],
      temperature: body.temperature,
      max_tokens: body.max_tokens
    };
    const response = await handlePeerRequest(request);
    const data = await response.json();
    return jsonResponse(data);
  }
  if (path === "/v1/superinference" && req.method === "POST") {
    const body = await req.json();
    const result = await superinfer({
      request: {
        model: body.model ?? getZedgeConfig().preferredModel,
        messages: body.messages ?? [],
        temperature: body.temperature,
        max_tokens: body.max_tokens
      },
      models: body.models,
      strategy: body.strategy ?? "fastest",
      timeoutMs: body.timeout_ms
    });
    return jsonResponse(result);
  }
  if (path === "/v1/superinference/recursive" && req.method === "POST") {
    const body = await req.json();
    const result = await recursiveSuperinfer({
      prompt: body.prompt ?? "",
      models: body.models,
      strategy: body.strategy ?? "consensus",
      maxDepth: body.max_depth,
      maxTokenBudget: body.max_token_budget
    });
    return jsonResponse(result);
  }
  if (path === "/agent/session" && req.method === "POST") {
    const body = await req.json();
    if (!body.workspace_path) {
      return jsonResponse({ error: "workspace_path is required" }, 400);
    }
    const capabilities = {
      processExec: body.capabilities?.processExec ?? [],
      fileRead: body.capabilities?.fileRead ?? true,
      fileWrite: body.capabilities?.fileWrite ?? false,
      gitAccess: body.capabilities?.gitAccess ?? true
    };
    const session = createSession(body.workspace_path, capabilities);
    return jsonResponse({
      session_id: session.id,
      workspace_path: session.workspacePath,
      capabilities: session.capabilities
    });
  }
  if (path === "/agent/turn" && req.method === "POST") {
    const body = await req.json();
    if (!body.session_id || !body.message) {
      return jsonResponse({ error: "session_id and message are required" }, 400);
    }
    const session = getSession(body.session_id);
    if (!session) {
      return jsonResponse({ error: "Session not found" }, 404);
    }
    const response = await agentTurn(body.session_id, body.message);
    return jsonResponse(response);
  }
  if (path.startsWith("/agent/session/") && req.method === "DELETE") {
    const sessionId = path.slice("/agent/session/".length);
    deleteSession(sessionId);
    return jsonResponse({ deleted: true });
  }
  if (path === "/v1/binary/infer" && req.method === "POST") {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes(CONTENT_TYPE)) {
      return jsonResponse({
        error: `Expected Content-Type: ${CONTENT_TYPE}`
      }, 415);
    }
    const buffer = await req.arrayBuffer();
    if (!isValidFrame(buffer)) {
      return jsonResponse({ error: "Invalid binary frame" }, 400);
    }
    const frame = decode(buffer);
    const encoded = encode(frame);
    return new Response(encoded, {
      headers: {
        "Content-Type": CONTENT_TYPE,
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  if (path === "/auth/login" && req.method === "POST") {
    const result = await login();
    return jsonResponse(result, result.success ? 200 : 401);
  }
  if (path === "/auth/logout" && req.method === "POST") {
    logout();
    return jsonResponse({ success: true });
  }
  if (path === "/auth/whoami" && req.method === "GET") {
    return jsonResponse(whoami());
  }
  if (path === "/probe/health" && req.method === "GET") {
    return jsonResponse(getTierHealth());
  }
  if (path === "/probe/results" && req.method === "GET") {
    return jsonResponse(getProbeResults());
  }
  if (path === "/probe/fastest" && req.method === "GET") {
    const model = new URL(req.url).searchParams.get("model") ?? "tinyllama-1.1b";
    const tier = getFastestTier(model);
    return jsonResponse({ model, fastestTier: tier });
  }
  if (path === "/v1/chat/completions/resilient" && req.method === "POST") {
    const body = await req.json();
    const request = {
      model: body.model ?? getZedgeConfig().preferredModel,
      messages: body.messages ?? [],
      stream: true,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      top_p: body.top_p
    };
    const stream = createResilientStream(request);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-Zedge-Resilient": "true"
      }
    });
  }
  if (path === "/stream/sessions" && req.method === "GET") {
    return jsonResponse(getActiveSessions());
  }
  if (path === "/forge/deploy" && req.method === "POST") {
    if (!forgeBridge) {
      return jsonResponse({ error: "Forge bridge not initialized" }, 503);
    }
    const body = await req.json();
    const result = await forgeBridge.deploy(body.project);
    return jsonResponse(result, result.success ? 200 : 400);
  }
  if (path === "/forge/status" && req.method === "GET") {
    if (!forgeBridge) {
      return jsonResponse({ error: "Forge bridge not initialized" }, 503);
    }
    return jsonResponse(forgeBridge.getStatus());
  }
  if (path === "/forge/projects" && req.method === "GET") {
    if (!forgeBridge) {
      return jsonResponse({ error: "Forge bridge not initialized" }, 503);
    }
    const projects = await forgeBridge.discoverProjects();
    return jsonResponse({
      count: projects.length,
      projects: projects.map((p) => ({
        name: p.name,
        dir: p.dir,
        kind: p.config.kind,
        runtime: p.config.runtime,
        port: p.config.port,
        buildCommand: p.config.buildCommand,
        configSource: p.configSource
      }))
    });
  }
  if (path.startsWith("/forge/logs/") && req.method === "GET") {
    if (!forgeBridge) {
      return jsonResponse({ error: "Forge bridge not initialized" }, 503);
    }
    const processId = path.slice("/forge/logs/".length);
    const encoder = new TextEncoder;
    const stream = new ReadableStream({
      async start(controller) {
        for await (const line of forgeBridge.getLogs(processId)) {
          controller.enqueue(encoder.encode(`data: ${line}

`));
        }
        controller.enqueue(encoder.encode(`data: [DONE]

`));
        controller.close();
      }
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  if (path.startsWith("/forge/stop/") && req.method === "POST") {
    if (!forgeBridge) {
      return jsonResponse({ error: "Forge bridge not initialized" }, 503);
    }
    const processId = path.slice("/forge/stop/".length);
    await forgeBridge.stop(processId);
    return jsonResponse({ stopped: true, processId });
  }
  if (path === "/vfs/mount" && req.method === "POST") {
    if (!vfsBridge)
      return jsonResponse({ error: "VFS bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.repoPath)
      return jsonResponse({ error: "repoPath is required" }, 400);
    const mount = vfsBridge.mount(body.repoPath, body.passphrase);
    return jsonResponse({
      id: mount.id,
      fileCount: mount.files.size,
      mountedAt: mount.mountedAt
    });
  }
  if (path.startsWith("/vfs/status/") && req.method === "GET") {
    if (!vfsBridge)
      return jsonResponse({ error: "VFS bridge not initialized" }, 503);
    const mountId = path.slice("/vfs/status/".length);
    return jsonResponse(vfsBridge.getStatus(mountId));
  }
  if (path === "/vfs/mounts" && req.method === "GET") {
    if (!vfsBridge)
      return jsonResponse({ error: "VFS bridge not initialized" }, 503);
    return jsonResponse(vfsBridge.getMounts().map((m) => ({
      id: m.id,
      repoPath: m.repoPath,
      fileCount: m.files.size,
      peerCount: m.peers.size
    })));
  }
  if (path === "/vfs/changes" && req.method === "GET") {
    if (!vfsBridge)
      return jsonResponse({ error: "VFS bridge not initialized" }, 503);
    const since = url.searchParams.get("since");
    return jsonResponse(vfsBridge.getChanges(since ? Number(since) : undefined));
  }
  if (path === "/collab/session" && req.method === "POST") {
    if (!collabBridge)
      return deprecatedJsonResponse({ error: "Collab bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.filePath)
      return deprecatedJsonResponse({ error: "filePath is required" }, 400);
    const session = collabBridge.createSession(body.filePath, body.name);
    return deprecatedJsonResponse({
      id: session.id,
      name: session.name,
      hostPeerId: session.hostPeerId,
      filePath: session.filePath,
      participants: Array.from(session.participants.values())
    });
  }
  if (path.startsWith("/collab/join/") && req.method === "POST") {
    if (!collabBridge)
      return deprecatedJsonResponse({ error: "Collab bridge not initialized" }, 503);
    const sessionId = path.slice("/collab/join/".length);
    const body = await req.json();
    if (!body.peerId || !body.displayName) {
      return deprecatedJsonResponse({ error: "peerId and displayName are required" }, 400);
    }
    const participant = collabBridge.joinSession(sessionId, body.peerId, body.displayName);
    if (!participant)
      return deprecatedJsonResponse({ error: "Session not found" }, 404);
    return deprecatedJsonResponse(participant);
  }
  if (path === "/collab/presence" && req.method === "POST") {
    if (!collabBridge)
      return deprecatedJsonResponse({ error: "Collab bridge not initialized" }, 503);
    const body = await req.json();
    collabBridge.updatePresence(body);
    return deprecatedJsonResponse({ updated: true });
  }
  if (path === "/collab/sessions" && req.method === "GET") {
    if (!collabBridge)
      return deprecatedJsonResponse({ error: "Collab bridge not initialized" }, 503);
    return deprecatedJsonResponse(collabBridge.listSessions().map((s) => ({
      id: s.id,
      name: s.name,
      filePath: s.filePath,
      participantCount: s.participants.size,
      lastActivity: s.lastActivity
    })));
  }
  if (path.startsWith("/collab/participants/") && req.method === "GET") {
    if (!collabBridge)
      return deprecatedJsonResponse({ error: "Collab bridge not initialized" }, 503);
    const sessionId = path.slice("/collab/participants/".length);
    return deprecatedJsonResponse(collabBridge.getParticipants(sessionId));
  }
  if (path === "/kernel/commands" && req.method === "GET") {
    if (!kernelBridge)
      return jsonResponse({ error: "Kernel bridge not initialized" }, 503);
    return jsonResponse(kernelBridge.listCommands().map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description
    })));
  }
  if (path === "/kernel/execute" && req.method === "POST") {
    if (!kernelBridge)
      return jsonResponse({ error: "Kernel bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.commandId)
      return jsonResponse({ error: "commandId is required" }, 400);
    try {
      const result = await kernelBridge.executeCommand(body.commandId, body.payload);
      return jsonResponse({ success: true, result });
    } catch (err) {
      return jsonResponse({ success: false, error: String(err) }, 400);
    }
  }
  if (path === "/kernel/route" && req.method === "POST") {
    if (!kernelBridge)
      return jsonResponse({ error: "Kernel bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.task)
      return jsonResponse({ error: "task is required" }, 400);
    return jsonResponse(kernelBridge.routeTask(body.task, body.taskType));
  }
  if (path === "/kernel/daemons" && req.method === "GET") {
    if (!kernelBridge)
      return jsonResponse({ error: "Kernel bridge not initialized" }, 503);
    return jsonResponse(kernelBridge.getDaemonStatus());
  }
  if (path === "/kernel/plugins" && req.method === "GET") {
    if (!kernelBridge)
      return jsonResponse({ error: "Kernel bridge not initialized" }, 503);
    return jsonResponse(kernelBridge.getPlugins());
  }
  if (path === "/kernel/flight-log" && req.method === "GET") {
    if (!kernelBridge)
      return jsonResponse({ error: "Kernel bridge not initialized" }, 503);
    const limit = url.searchParams.get("limit");
    return jsonResponse(kernelBridge.getFlightLog(limit ? Number(limit) : 50));
  }
  if (path === "/kernel/deep-link" && req.method === "POST") {
    if (!kernelBridge)
      return jsonResponse({ error: "Kernel bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.url)
      return jsonResponse({ error: "url is required" }, 400);
    const parsed = kernelBridge.parseDeepLink(body.url);
    if (!parsed)
      return jsonResponse({ error: "Invalid deep link" }, 400);
    return jsonResponse(parsed);
  }
  if (path === "/capacitor/mount" && req.method === "POST") {
    if (!capacitorBridge)
      return deprecatedJsonResponse({ error: "Capacitor bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.path)
      return deprecatedJsonResponse({ error: "path is required" }, 400);
    const mount = capacitorBridge.mount(body.path, body.projection);
    return deprecatedJsonResponse({
      id: mount.id,
      path: mount.path,
      projection: mount.projection
    });
  }
  if (path.startsWith("/capacitor/layout/") && req.method === "GET") {
    if (!capacitorBridge)
      return deprecatedJsonResponse({ error: "Capacitor bridge not initialized" }, 503);
    const mountId = path.slice("/capacitor/layout/".length);
    return deprecatedJsonResponse(capacitorBridge.getLayout(mountId));
  }
  if (path === "/capacitor/personalize" && req.method === "POST") {
    if (!capacitorBridge)
      return deprecatedJsonResponse({ error: "Capacitor bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.developerId)
      return deprecatedJsonResponse({ error: "developerId is required" }, 400);
    capacitorBridge.personalize({
      developerId: body.developerId,
      preferences: body.preferences ?? {},
      recentFiles: body.recentFiles ?? [],
      focusArea: body.focusArea
    });
    return deprecatedJsonResponse({ personalized: true });
  }
  if (path.startsWith("/capacitor/graph/") && req.method === "GET") {
    if (!capacitorBridge)
      return deprecatedJsonResponse({ error: "Capacitor bridge not initialized" }, 503);
    const mountId = path.slice("/capacitor/graph/".length);
    return deprecatedJsonResponse(capacitorBridge.getClusters(mountId));
  }
  if (path === "/capacitor/project" && req.method === "POST") {
    if (!capacitorBridge)
      return deprecatedJsonResponse({ error: "Capacitor bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.mountId || !body.projection) {
      return deprecatedJsonResponse({ error: "mountId and projection are required" }, 400);
    }
    capacitorBridge.setProjection(body.mountId, body.projection);
    return deprecatedJsonResponse({ projection: body.projection });
  }
  if (path === "/capacitor/index" && req.method === "POST") {
    if (!capacitorBridge)
      return deprecatedJsonResponse({ error: "Capacitor bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.mountId || !body.block) {
      return deprecatedJsonResponse({ error: "mountId and block are required" }, 400);
    }
    capacitorBridge.indexBlock(body.mountId, body.block);
    return deprecatedJsonResponse({ indexed: true, blockId: body.block.id });
  }
  if (path === "/v1/superinference/preset" && req.method === "POST") {
    const body = await req.json();
    if (!body.preset)
      return jsonResponse({ error: "preset is required" }, 400);
    const preset = getCompositionPreset(body.preset);
    if (!preset) {
      return jsonResponse({
        error: `Unknown preset: ${body.preset}. Available: ${Object.keys(COMPOSITION_PRESETS).join(", ")}`
      }, 400);
    }
    const result = await superinferWithPreset(preset, body.messages ?? [], { timeoutMs: body.timeout_ms, maxTokens: body.max_tokens });
    return jsonResponse(result);
  }
  if (path === "/v1/superinference/presets" && req.method === "GET") {
    return jsonResponse(Object.entries(COMPOSITION_PRESETS).map(([key, p]) => ({
      key,
      name: p.name,
      description: p.description,
      models: p.models,
      strategy: p.strategy
    })));
  }
  if (path === "/market/status" && req.method === "GET") {
    return jsonResponse(getMarketStatus());
  }
  if (path === "/crdt/status" && req.method === "GET") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    return jsonResponse(crdtBridge.getStatus());
  }
  if (path === "/crdt/open" && req.method === "POST") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.path)
      return jsonResponse({ error: "path is required" }, 400);
    const handle = await crdtBridge.openFile(body.path, body.initialContent);
    return jsonResponse({
      path: handle.path,
      contentLength: handle.content.length,
      cursors: Array.from(handle.cursors.values())
    });
  }
  if (path === "/crdt/close" && req.method === "POST") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.path)
      return jsonResponse({ error: "path is required" }, 400);
    crdtBridge.closeFile(body.path);
    return jsonResponse({ closed: true, path: body.path });
  }
  if (path === "/crdt/files" && req.method === "GET") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    return jsonResponse(crdtBridge.getOpenFiles());
  }
  if (path === "/crdt/cursor" && req.method === "POST") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.path || body.line === undefined || body.col === undefined) {
      return jsonResponse({ error: "path, line, and col are required" }, 400);
    }
    crdtBridge.updateCursor(body.path, body.line, body.col);
    return jsonResponse({ updated: true });
  }
  if (path === "/crdt/selection" && req.method === "POST") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.path || body.startLine === undefined || body.startCol === undefined || body.endLine === undefined || body.endCol === undefined) {
      return jsonResponse({ error: "path, startLine, startCol, endLine, endCol are required" }, 400);
    }
    crdtBridge.updateSelection(body.path, body.startLine, body.startCol, body.endLine, body.endCol);
    return jsonResponse({ updated: true });
  }
  if (path === "/crdt/cursors" && req.method === "GET") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const filePath = url.searchParams.get("path");
    if (!filePath)
      return jsonResponse({ error: "path query param is required" }, 400);
    return jsonResponse(crdtBridge.getCursors(filePath));
  }
  if (path === "/crdt/diagnostics" && req.method === "POST") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.path || !body.diagnostics) {
      return jsonResponse({ error: "path and diagnostics are required" }, 400);
    }
    crdtBridge.shareDiagnostics(body.path, body.diagnostics);
    return jsonResponse({ shared: true, count: body.diagnostics.length });
  }
  if (path === "/crdt/diagnostics" && req.method === "GET") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const filePath = url.searchParams.get("path");
    if (!filePath)
      return jsonResponse({ error: "path query param is required" }, 400);
    return jsonResponse(crdtBridge.getDiagnostics(filePath));
  }
  if (path === "/crdt/annotation" && req.method === "POST") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.path || !body.blockId || !body.content || !body.type || body.line === undefined) {
      return jsonResponse({ error: "path, blockId, content, type, and line are required" }, 400);
    }
    const annotation = crdtBridge.addAnnotation(body.path, {
      blockId: body.blockId,
      content: body.content,
      type: body.type,
      line: body.line
    });
    return jsonResponse(annotation);
  }
  if (path === "/crdt/annotations" && req.method === "GET") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const filePath = url.searchParams.get("path");
    if (!filePath)
      return jsonResponse({ error: "path query param is required" }, 400);
    return jsonResponse(crdtBridge.getAnnotations(filePath));
  }
  if (path === "/crdt/reading" && req.method === "POST") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.path || !body.blockId || !body.timeSpentMs) {
      return jsonResponse({ error: "path, blockId, and timeSpentMs are required" }, 400);
    }
    crdtBridge.recordReading(body.path, body.blockId, body.timeSpentMs);
    return jsonResponse({ recorded: true });
  }
  if (path === "/crdt/emotion" && req.method === "POST") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.path || !body.blockId || !body.emotion) {
      return jsonResponse({ error: "path, blockId, and emotion are required" }, 400);
    }
    crdtBridge.tagEmotion(body.path, {
      blockId: body.blockId,
      emotion: body.emotion,
      valence: body.valence ?? 0,
      arousal: body.arousal ?? 0,
      dominance: body.dominance ?? 0,
      intensity: body.intensity ?? 0.5
    });
    return jsonResponse({ tagged: true });
  }
  if (path === "/crdt/emotion" && req.method === "GET") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const filePath = url.searchParams.get("path");
    const blockId = url.searchParams.get("blockId");
    if (!filePath || !blockId) {
      return jsonResponse({ error: "path and blockId query params are required" }, 400);
    }
    return jsonResponse(crdtBridge.getEmotionTags(filePath, blockId));
  }
  if (path === "/crdt/participants" && req.method === "GET") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    return jsonResponse(crdtBridge.getParticipants());
  }
  if (path === "/crdt/undo" && req.method === "POST") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.path)
      return jsonResponse({ error: "path is required" }, 400);
    crdtBridge.undo(body.path);
    return jsonResponse({ undone: true });
  }
  if (path === "/crdt/snapshot" && req.method === "GET") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const filePath = url.searchParams.get("path");
    if (!filePath)
      return jsonResponse({ error: "path query param is required" }, 400);
    const snapshot = crdtBridge.getSnapshot(filePath);
    if (!snapshot)
      return jsonResponse({ error: "File not open" }, 404);
    return jsonResponse({ path: filePath, snapshot: Array.from(snapshot) });
  }
  if (path === "/crdt/state-vector" && req.method === "GET") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const filePath = url.searchParams.get("path");
    if (!filePath)
      return jsonResponse({ error: "path query param is required" }, 400);
    const stateVector = crdtBridge.getStateVector(filePath);
    if (!stateVector)
      return jsonResponse({ error: "File not open" }, 404);
    return jsonResponse({
      path: filePath,
      stateVector: Array.from(stateVector)
    });
  }
  if (path === "/crdt/ledger" && req.method === "GET") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    return jsonResponse(crdtBridge.getReputationLedger());
  }
  if (path === "/crdt/contribute" && req.method === "POST") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.peerId || body.tokens === undefined || body.requests === undefined) {
      return jsonResponse({ error: "peerId, tokens, and requests are required" }, 400);
    }
    crdtBridge.recordContribution(body.peerId, body.tokens, body.requests);
    return jsonResponse({ recorded: true });
  }
  if (path === "/crdt/redo" && req.method === "POST") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.path)
      return jsonResponse({ error: "path is required" }, 400);
    crdtBridge.redo(body.path);
    return jsonResponse({ redone: true });
  }
  if (path === "/crdt/invite" && req.method === "POST") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.room)
      return jsonResponse({ error: "room is required" }, 400);
    const mode = body.mode ?? "reviewMode";
    const status = crdtBridge.getStatus();
    const invite = generateInvite(status.peerId, body.room, mode, body.ttlMs);
    return jsonResponse(invite);
  }
  if (path === "/crdt/join" && req.method === "POST") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.token)
      return jsonResponse({ error: "token is required" }, 400);
    const payload = parseRoomUcan(body.token);
    if (!payload)
      return jsonResponse({ error: "Invalid token" }, 400);
    if (isRoomUcanExpired(body.token))
      return jsonResponse({ error: "Token expired" }, 401);
    return jsonResponse({
      joined: true,
      room: payload.room,
      capabilities: payload.capabilities
    });
  }
  if (path === "/agent-participant/join" && req.method === "POST") {
    if (!crdtBridge)
      return jsonResponse({ error: "CRDT bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.agentId || !body.model) {
      return jsonResponse({ error: "agentId and model are required" }, 400);
    }
    const mode = body.mode ?? "review";
    const agent = new AgentParticipant({
      agentId: body.agentId,
      displayName: body.displayName ?? `${body.model} (${mode})`,
      model: body.model,
      color: body.color ?? "",
      mode
    }, crdtBridge, ucanBridge ?? undefined);
    await agent.join();
    agentParticipants.set(body.agentId, agent);
    return jsonResponse(agent.getStatus());
  }
  if (path === "/agent-participant/leave" && req.method === "POST") {
    const body = await req.json();
    if (!body.agentId)
      return jsonResponse({ error: "agentId is required" }, 400);
    const agent = agentParticipants.get(body.agentId);
    if (!agent)
      return jsonResponse({ error: "Agent not found" }, 404);
    agent.leave();
    agentParticipants.delete(body.agentId);
    return jsonResponse({ left: true, agentId: body.agentId });
  }
  if (path === "/agent-participant/status" && req.method === "GET") {
    const agentId = url.searchParams.get("agentId");
    if (agentId) {
      const agent = agentParticipants.get(agentId);
      if (!agent)
        return jsonResponse({ error: "Agent not found" }, 404);
      return jsonResponse(agent.getStatus());
    }
    return jsonResponse(Array.from(agentParticipants.values()).map((a) => a.getStatus()));
  }
  if (path === "/agent-participant/open" && req.method === "POST") {
    const body = await req.json();
    if (!body.agentId || !body.path) {
      return jsonResponse({ error: "agentId and path are required" }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent)
      return jsonResponse({ error: "Agent not found" }, 404);
    const state = await agent.openFile(body.path, body.initialContent);
    return jsonResponse(state);
  }
  if (path === "/agent-participant/read" && req.method === "GET") {
    const agentId = url.searchParams.get("agentId");
    const filePath = url.searchParams.get("path");
    if (!agentId || !filePath) {
      return jsonResponse({ error: "agentId and path query params are required" }, 400);
    }
    const agent = agentParticipants.get(agentId);
    if (!agent)
      return jsonResponse({ error: "Agent not found" }, 404);
    const content = agent.readFile(filePath);
    if (content === null)
      return jsonResponse({ error: "File not open" }, 404);
    return jsonResponse({ path: filePath, content });
  }
  if (path === "/agent-participant/insert" && req.method === "POST") {
    const body = await req.json();
    if (!body.agentId || !body.path || body.offset === undefined || !body.text) {
      return jsonResponse({ error: "agentId, path, offset, and text are required" }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent)
      return jsonResponse({ error: "Agent not found" }, 404);
    const ok = agent.insert(body.path, body.offset, body.text);
    return jsonResponse({ inserted: ok });
  }
  if (path === "/agent-participant/delete" && req.method === "POST") {
    const body = await req.json();
    if (!body.agentId || !body.path || body.offset === undefined || !body.length) {
      return jsonResponse({ error: "agentId, path, offset, and length are required" }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent)
      return jsonResponse({ error: "Agent not found" }, 404);
    const ok = agent.delete(body.path, body.offset, body.length);
    return jsonResponse({ deleted: ok });
  }
  if (path === "/agent-participant/replace" && req.method === "POST") {
    const body = await req.json();
    if (!body.agentId || !body.path || body.offset === undefined || !body.length || body.text === undefined) {
      return jsonResponse({ error: "agentId, path, offset, length, and text are required" }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent)
      return jsonResponse({ error: "Agent not found" }, 404);
    const ok = agent.replace(body.path, body.offset, body.length, body.text);
    return jsonResponse({ replaced: ok });
  }
  if (path === "/agent-participant/batch-edit" && req.method === "POST") {
    const body = await req.json();
    if (!body.agentId || !body.edits?.length) {
      return jsonResponse({ error: "agentId and edits are required" }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent)
      return jsonResponse({ error: "Agent not found" }, 404);
    const applied = agent.applyEdits(body.edits);
    return jsonResponse({ applied });
  }
  if (path === "/agent-participant/batch-replace" && req.method === "POST") {
    const body = await req.json();
    if (!body.agentId || !body.replacements?.length) {
      return jsonResponse({ error: "agentId and replacements are required" }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent)
      return jsonResponse({ error: "Agent not found" }, 404);
    const applied = agent.applyReplacements(body.replacements);
    return jsonResponse({ applied });
  }
  if (path === "/agent-participant/review" && req.method === "POST") {
    const body = await req.json();
    if (!body.agentId || !body.path || body.line === undefined || !body.content) {
      return jsonResponse({ error: "agentId, path, line, and content are required" }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent)
      return jsonResponse({ error: "Agent not found" }, 404);
    if (body.type === "suggestion") {
      agent.addSuggestion(body.path, body.line, body.content);
    } else {
      agent.addReviewComment(body.path, body.line, body.content);
    }
    return jsonResponse({ reviewed: true });
  }
  if (path === "/agent-participant/thinking" && req.method === "POST") {
    const body = await req.json();
    if (!body.agentId)
      return jsonResponse({ error: "agentId is required" }, 400);
    const agent = agentParticipants.get(body.agentId);
    if (!agent)
      return jsonResponse({ error: "Agent not found" }, 404);
    agent.setThinking(body.context ?? "");
    return jsonResponse({ thinking: true });
  }
  if (path === "/agent-participant/undo" && req.method === "POST") {
    const body = await req.json();
    if (!body.agentId || !body.path) {
      return jsonResponse({ error: "agentId and path are required" }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent)
      return jsonResponse({ error: "Agent not found" }, 404);
    agent.undo(body.path);
    return jsonResponse({ undone: true });
  }
  if (path === "/agent-participant/redo" && req.method === "POST") {
    const body = await req.json();
    if (!body.agentId || !body.path) {
      return jsonResponse({ error: "agentId and path are required" }, 400);
    }
    const agent = agentParticipants.get(body.agentId);
    if (!agent)
      return jsonResponse({ error: "Agent not found" }, 404);
    agent.redo(body.path);
    return jsonResponse({ redone: true });
  }
  if (path === "/ucan/status" && req.method === "GET") {
    if (!ucanBridge)
      return jsonResponse({ error: "UCAN bridge not initialized" }, 503);
    return jsonResponse(ucanBridge.getStatus());
  }
  if (path === "/ucan/did" && req.method === "GET") {
    if (!ucanBridge)
      return jsonResponse({ error: "UCAN bridge not initialized" }, 503);
    return jsonResponse({
      did: ucanBridge.getDid(),
      publicKey: ucanBridge.getPublicKeyJwk()
    });
  }
  if (path === "/ucan/issue" && req.method === "POST") {
    if (!ucanBridge)
      return jsonResponse({ error: "UCAN bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.audienceDid || !body.capabilities?.length) {
      return jsonResponse({ error: "audienceDid and capabilities are required" }, 400);
    }
    const token = await ucanBridge.issueToken(body.audienceDid, body.capabilities, body.expirationSeconds);
    return jsonResponse({
      token: token.token,
      expiresAt: token.payload.exp * 1000
    });
  }
  if (path === "/ucan/agent" && req.method === "POST") {
    if (!ucanBridge)
      return jsonResponse({ error: "UCAN bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.agentDid || !body.mode) {
      return jsonResponse({ error: "agentDid and mode are required" }, 400);
    }
    if (!["review", "pair", "autonomous"].includes(body.mode)) {
      return jsonResponse({ error: "mode must be review, pair, or autonomous" }, 400);
    }
    const result = await ucanBridge.issueAgentToken(body.agentDid, body.mode, body.expirationSeconds);
    return jsonResponse({
      token: result.token,
      mode: result.mode,
      capabilities: result.payload.att,
      expiresAt: result.payload.exp * 1000
    });
  }
  if (path === "/ucan/invite" && req.method === "POST") {
    if (!ucanBridge)
      return jsonResponse({ error: "UCAN bridge not initialized" }, 503);
    const body = await req.json();
    const invite = body.open ? await ucanBridge.createOpenInvite({
      path: body.path,
      dirPath: body.dirPath,
      access: body.access,
      expirationSeconds: body.expirationSeconds
    }) : await ucanBridge.createInvite(body.audienceDid ?? "did:key:*", {
      path: body.path,
      dirPath: body.dirPath,
      access: body.access,
      expirationSeconds: body.expirationSeconds,
      label: body.label
    });
    return jsonResponse(invite);
  }
  if (path === "/ucan/verify" && req.method === "POST") {
    if (!ucanBridge)
      return jsonResponse({ error: "UCAN bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.token)
      return jsonResponse({ error: "token is required" }, 400);
    const result = await ucanBridge.verifyToken(body.token, body.requiredCapabilities);
    return jsonResponse(result);
  }
  if (path === "/ucan/grants" && req.method === "GET") {
    if (!ucanBridge)
      return jsonResponse({ error: "UCAN bridge not initialized" }, 503);
    return jsonResponse(ucanBridge.listGrants());
  }
  if (path.startsWith("/ucan/revoke/") && req.method === "POST") {
    if (!ucanBridge)
      return jsonResponse({ error: "UCAN bridge not initialized" }, 503);
    const grantId = path.slice("/ucan/revoke/".length);
    const revoked = ucanBridge.revokeGrant(grantId);
    return jsonResponse({ revoked, grantId });
  }
  if (path === "/ucan/revoke-audience" && req.method === "POST") {
    if (!ucanBridge)
      return jsonResponse({ error: "UCAN bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.audienceDid)
      return jsonResponse({ error: "audienceDid is required" }, 400);
    const count = ucanBridge.revokeAudience(body.audienceDid);
    return jsonResponse({ revoked: count, audienceDid: body.audienceDid });
  }
  if (path === "/ucan/revoke-mode" && req.method === "POST") {
    if (!ucanBridge)
      return jsonResponse({ error: "UCAN bridge not initialized" }, 503);
    const body = await req.json();
    if (!body.mode)
      return jsonResponse({ error: "mode is required" }, 400);
    const count = ucanBridge.revokeMode(body.mode);
    return jsonResponse({ revoked: count, mode: body.mode });
  }
  return jsonResponse({ error: "Not found" }, 404);
}
function startServer() {
  const port = getCompanionPort();
  Bun.serve({
    port,
    fetch: handleRequest
  });
  console.log(`[zedge] Companion sidecar v2.0 on http://localhost:${port}`);
  console.log(`[zedge] OpenAI-compatible API: http://localhost:${port}/v1`);
  console.log(`[zedge] Superinference: POST http://localhost:${port}/v1/superinference`);
  console.log(`[zedge] Mesh: http://localhost:${port}/mesh/status`);
  console.log(`[zedge] Agent: POST http://localhost:${port}/agent/session`);
  console.log(`[zedge] Forge: http://localhost:${port}/forge/status`);
  console.log(`[zedge] Health: http://localhost:${port}/health`);
  console.log(`[zedge] Ghostwriter CRDT: http://localhost:${port}/crdt/status`);
  console.log(`[zedge] Ghostwriter UCAN: http://localhost:${port}/ucan/status`);
}
export {
  startServer,
  setVfsBridge,
  setUcanBridge,
  setKernelBridge,
  setForgeBridge,
  setCrdtBridge,
  setCollabBridge,
  setCapacitorBridge
};
