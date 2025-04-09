import { Context, Schema } from 'koishi'
import axios from 'axios'

export const name = 'hypixel-ban-tracker'

export interface Config {
  apiUrl?: string
  cacheDuration?: number
}

export const Config: Schema<Config> = Schema.object({
  apiUrl: Schema.string().default('https://api.plancke.io/hypixel/v1/punishmentStats').description('Hypixel封禁统计API地址'),
  cacheDuration: Schema.number().default(60000).description('数据缓存时间(毫秒)')
})

interface BanStats {
  watchdog_lastMinute: number
  watchdog_total: number
  staff_lastMinute: number
  staff_total: number
  watchdog_last24Hours: number
  staff_last24Hours: number
  success: boolean
  lastUpdated: number
}

export function apply(ctx: Context, config: Config) {
  // 缓存变量
  let cachedStats: BanStats = null
  let lastFetchTime: number = 0

  // 获取封禁统计数据
  async function fetchBanStats(): Promise<BanStats> {
    const now = Date.now()
    
    // 如果缓存有效且未过期，直接返回缓存
    if (cachedStats && now - lastFetchTime < (config.cacheDuration || 60000)) {
      return cachedStats
    }

    try {
      const response = await axios.get(config.apiUrl || 'https://api.plancke.io/hypixel/v1/punishmentStats')
      const data = response.data?.record || {}
      
      // 计算24小时数据（假设API返回的是总量，我们需要减去24小时前的总量）
      // 注意：由于API限制，这里简化处理，实际可能需要更复杂的逻辑
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000
      const isNewData = !cachedStats || data.watchdog_total > cachedStats.watchdog_total
      
      const newStats: BanStats = {
        watchdog_lastMinute: data.watchdog_lastMinute || 0,
        watchdog_total: data.watchdog_total || 0,
        staff_lastMinute: data.staff_lastMinute || 0,
        staff_total: data.staff_total || 0,
        watchdog_last24Hours: isNewData ? (data.watchdog_total - (cachedStats?.watchdog_total || 0)) : (cachedStats?.watchdog_last24Hours || 0),
        staff_last24Hours: isNewData ? (data.staff_total - (cachedStats?.staff_total || 0)) : (cachedStats?.staff_last24Hours || 0),
        success: true,
        lastUpdated: now
      }

      cachedStats = newStats
      lastFetchTime = now
      return newStats
    } catch (error) {
      ctx.logger('hypixel-ban-tracker').warn('获取封禁统计数据失败:', error)
      return {
        ...(cachedStats || {
          watchdog_lastMinute: 0,
          watchdog_total: 0,
          staff_lastMinute: 0,
          staff_total: 0,
          watchdog_last24Hours: 0,
          staff_last24Hours: 0
        }),
        success: false,
        lastUpdated: lastFetchTime || now
      }
    }
  }

  // 注册指令
  ctx.command('hypixel', 'Hypixel服务器封禁统计')
    .alias('hpbans')
    .action(async ({ session }) => {
      const stats = await fetchBanStats()
      
      if (!stats.success) {
        return '获取封禁数据失败，正在使用缓存数据...'
      }

      return `Hypixel封禁统计 (数据更新时间: ${new Date(stats.lastUpdated).toLocaleString()})
      
🛡️ Watchdog封禁:
- 最近一分钟: ${stats.watchdog_lastMinute} 次
- 最近24小时: ${stats.watchdog_last24Hours} 次
- 总计: ${stats.watchdog_total} 次

👮 客服封禁:
- 最近一分钟: ${stats.staff_lastMinute} 次
- 最近24小时: ${stats.staff_last24Hours} 次
- 总计: ${stats.staff_total} 次`
    })
}