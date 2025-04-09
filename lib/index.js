var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  name: () => name
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var import_axios = __toESM(require("axios"));
var name = "hypixel-ban-tracker";
var Config = import_koishi.Schema.object({
  apiUrl: import_koishi.Schema.string().default("https://api.plancke.io/hypixel/v1/punishmentStats").description("Hypixel封禁统计API地址"),
  cacheDuration: import_koishi.Schema.number().default(6e4).description("数据缓存时间(毫秒)")
});
function apply(ctx, config) {
  let cachedStats = null;
  let lastFetchTime = 0;
  async function fetchBanStats() {
    const now = Date.now();
    if (cachedStats && now - lastFetchTime < (config.cacheDuration || 6e4)) {
      return cachedStats;
    }
    try {
      const response = await import_axios.default.get(config.apiUrl || "https://api.plancke.io/hypixel/v1/punishmentStats");
      const data = response.data?.record || {};
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1e3;
      const isNewData = !cachedStats || data.watchdog_total > cachedStats.watchdog_total;
      const newStats = {
        watchdog_lastMinute: data.watchdog_lastMinute || 0,
        watchdog_total: data.watchdog_total || 0,
        staff_lastMinute: data.staff_lastMinute || 0,
        staff_total: data.staff_total || 0,
        watchdog_last24Hours: isNewData ? data.watchdog_total - (cachedStats?.watchdog_total || 0) : cachedStats?.watchdog_last24Hours || 0,
        staff_last24Hours: isNewData ? data.staff_total - (cachedStats?.staff_total || 0) : cachedStats?.staff_last24Hours || 0,
        success: true,
        lastUpdated: now
      };
      cachedStats = newStats;
      lastFetchTime = now;
      return newStats;
    } catch (error) {
      ctx.logger("hypixel-ban-tracker").warn("获取封禁统计数据失败:", error);
      return {
        ...cachedStats || {
          watchdog_lastMinute: 0,
          watchdog_total: 0,
          staff_lastMinute: 0,
          staff_total: 0,
          watchdog_last24Hours: 0,
          staff_last24Hours: 0
        },
        success: false,
        lastUpdated: lastFetchTime || now
      };
    }
  }
  __name(fetchBanStats, "fetchBanStats");
  ctx.command("hypixel", "Hypixel服务器封禁统计").alias("hpbans").action(async ({ session }) => {
    const stats = await fetchBanStats();
    if (!stats.success) {
      return "获取封禁数据失败，正在使用缓存数据...";
    }
    return `Hypixel封禁统计 (数据更新时间: ${new Date(stats.lastUpdated).toLocaleString()})
      
🛡️ Watchdog封禁:
- 最近一分钟: ${stats.watchdog_lastMinute} 次
- 最近24小时: ${stats.watchdog_last24Hours} 次
- 总计: ${stats.watchdog_total} 次

👮 客服封禁:
- 最近一分钟: ${stats.staff_lastMinute} 次
- 最近24小时: ${stats.staff_last24Hours} 次
- 总计: ${stats.staff_total} 次`;
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  name
});
