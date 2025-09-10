/**
 * Quota Manager
 * Tracks and manages API request quotas to avoid burning through daily limits
 */

interface QuotaConfig {
  dailyLimit: number
  warningThreshold: number
  criticalThreshold: number
  emergencyThreshold: number
}

interface QuotaStatus {
  used: number
  remaining: number
  percentage: number
  resetDate: string
  status: 'healthy' | 'warning' | 'critical' | 'emergency' | 'exhausted'
}

interface RequestLog {
  timestamp: Date
  endpoint: string
  success: boolean
  responseTime: number
  error?: string
}

export class QuotaManager {
  private config: QuotaConfig
  private dailyUsage: number = 0
  private lastReset: Date = new Date()
  private requestLogs: RequestLog[] = []
  private alertCallbacks: ((status: QuotaStatus) => void)[] = []

  constructor(config: QuotaConfig) {
    this.config = config
    this.loadUsageFromStorage()
  }

  /**
   * Check if we can make a request
   */
  canMakeRequest(): boolean {
    this.checkReset()
    return this.dailyUsage < this.config.dailyLimit
  }

  /**
   * Record a request and check quotas
   */
  async recordRequest(
    endpoint: string,
    success: boolean,
    responseTime: number,
    error?: string
  ): Promise<QuotaStatus> {
    this.checkReset()
    
    if (success) {
      this.dailyUsage++
      this.saveUsageToStorage()
    }

    // Log the request
    this.requestLogs.push({
      timestamp: new Date(),
      endpoint,
      success,
      responseTime,
      error
    })

    // Keep only last 1000 logs
    if (this.requestLogs.length > 1000) {
      this.requestLogs = this.requestLogs.slice(-1000)
    }

    const status = this.getStatus()
    
    // Check for alerts
    if (this.shouldAlert(status)) {
      this.triggerAlerts(status)
    }

    return status
  }

  /**
   * Get current quota status
   */
  getStatus(): QuotaStatus {
    this.checkReset()
    
    const percentage = (this.dailyUsage / this.config.dailyLimit) * 100
    let status: QuotaStatus['status'] = 'healthy'

    if (percentage >= 100) {
      status = 'exhausted'
    } else if (percentage >= this.config.emergencyThreshold) {
      status = 'emergency'
    } else if (percentage >= this.config.criticalThreshold) {
      status = 'critical'
    } else if (percentage >= this.config.warningThreshold) {
      status = 'warning'
    }

    return {
      used: this.dailyUsage,
      remaining: this.config.dailyLimit - this.dailyUsage,
      percentage: Math.round(percentage * 100) / 100,
      resetDate: this.lastReset.toISOString().split('T')[0],
      status
    }
  }

  /**
   * Get request statistics
   */
  getStats(): {
    totalRequests: number
    successRate: number
    averageResponseTime: number
    errorRate: number
    topEndpoints: Array<{ endpoint: string; count: number }>
  } {
    const totalRequests = this.requestLogs.length
    const successfulRequests = this.requestLogs.filter(log => log.success).length
    const errorRequests = this.requestLogs.filter(log => !log.success).length
    
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0
    
    const averageResponseTime = this.requestLogs.length > 0
      ? this.requestLogs.reduce((sum, log) => sum + log.responseTime, 0) / this.requestLogs.length
      : 0

    // Count endpoint usage
    const endpointCounts = this.requestLogs.reduce((acc, log) => {
      acc[log.endpoint] = (acc[log.endpoint] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalRequests,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      topEndpoints
    }
  }

  /**
   * Add alert callback
   */
  onAlert(callback: (status: QuotaStatus) => void): void {
    this.alertCallbacks.push(callback)
  }

  /**
   * Remove alert callback
   */
  removeAlert(callback: (status: QuotaStatus) => void): void {
    const index = this.alertCallbacks.indexOf(callback)
    if (index > -1) {
      this.alertCallbacks.splice(index, 1)
    }
  }

  /**
   * Check if we need to reset daily usage
   */
  private checkReset(): void {
    const today = new Date().toISOString().split('T')[0]
    const lastResetDate = this.lastReset.toISOString().split('T')[0]
    
    if (today !== lastResetDate) {
      this.dailyUsage = 0
      this.lastReset = new Date()
      this.saveUsageToStorage()
    }
  }

  /**
   * Check if we should trigger alerts
   */
  private shouldAlert(status: QuotaStatus): boolean {
    return status.status !== 'healthy'
  }

  /**
   * Trigger alert callbacks
   */
  private triggerAlerts(status: QuotaStatus): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(status)
      } catch (error) {
        console.error('Error in quota alert callback:', error)
      }
    })
  }

  /**
   * Load usage from localStorage
   */
  private loadUsageFromStorage(): void {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem('quota-usage')
      if (stored) {
        const data = JSON.parse(stored)
        const storedDate = new Date(data.date)
        const today = new Date()
        
        // Only use stored data if it's from today
        if (storedDate.toISOString().split('T')[0] === today.toISOString().split('T')[0]) {
          this.dailyUsage = data.usage
          this.lastReset = storedDate
        }
      }
    } catch (error) {
      console.error('Error loading quota usage from storage:', error)
    }
  }

  /**
   * Save usage to localStorage
   */
  private saveUsageToStorage(): void {
    if (typeof window === 'undefined') return
    
    try {
      const data = {
        usage: this.dailyUsage,
        date: this.lastReset.toISOString()
      }
      localStorage.setItem('quota-usage', JSON.stringify(data))
    } catch (error) {
      console.error('Error saving quota usage to storage:', error)
    }
  }
}

// Global quota manager instances
export const pptQuotaManager = new QuotaManager({
  dailyLimit: 20000,
  warningThreshold: 80,
  criticalThreshold: 90,
  emergencyThreshold: 95
})

export const catalogQuotaManager = new QuotaManager({
  dailyLimit: 2400, // 100 requests/hour * 24 hours
  warningThreshold: 80,
  criticalThreshold: 90,
  emergencyThreshold: 95
})
