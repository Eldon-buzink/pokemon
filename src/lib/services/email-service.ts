/**
 * Email Service for Weekly Market Updates
 * Sends top 5 movers every Monday based on user's filter preferences
 */

import { supabaseAdmin } from '@/lib/supabase'

interface EmailSubscription {
  id: number
  email: string
  filters: Record<string, string | number | boolean>
  is_active: boolean
  unsubscribe_token: string
}

interface TopMover {
  card_id: string
  name: string
  set_name: string
  spread_after_fees: number
  psa10_delta: number
  raw_delta: number
  confidence: string
  image_url_small: string
}

// interface MarketUpdateData {
//   topMovers: TopMover[]
//   period: number
//   totalCards: number
//   updateDate: string
// }

export class EmailService {
  /**
   * Send weekly market updates to all active subscribers
   */
  async sendWeeklyUpdates(): Promise<{
    totalSubscribers: number
    successfulSends: number
    failedSends: number
    topMovers: TopMover[]
  }> {
    console.log('Starting weekly market update emails...')
    
    // Get all active subscribers
    const { data: subscribers, error: subscribersError } = await supabaseAdmin
      .from('email_subscriptions')
      .select('*')
      .eq('is_active', true)

    if (subscribersError) {
      throw new Error(`Failed to get subscribers: ${subscribersError.message}`)
    }

    if (!subscribers || subscribers.length === 0) {
      console.log('No active subscribers found')
      return {
        totalSubscribers: 0,
        successfulSends: 0,
        failedSends: 0,
        topMovers: []
      }
    }

    // Get top 5 movers for the week
    const topMovers = await this.getTopMovers(7) // 7-day period

    let successfulSends = 0
    let failedSends = 0

    // Send emails to each subscriber
    for (const subscriber of subscribers) {
      try {
        await this.sendMarketUpdateEmail(subscriber, topMovers)
        successfulSends++
        
        // Update last sent timestamp
        await supabaseAdmin
          .from('email_subscriptions')
          .update({ last_sent: new Date().toISOString() })
          .eq('id', subscriber.id)
          
      } catch (error) {
        console.error(`Failed to send email to ${subscriber.email}:`, error)
        failedSends++
      }
    }

    // Log the market update
    await this.logMarketUpdate({
      totalSubscribers: subscribers.length,
      successfulSends,
      failedSends,
      topMovers
    })

    console.log(`Weekly updates sent: ${successfulSends} successful, ${failedSends} failed`)
    
    return {
      totalSubscribers: subscribers.length,
      successfulSends,
      failedSends,
      topMovers
    }
  }

  /**
   * Get top 5 movers based on profit/loss
   */
  private async getTopMovers(periodDays: number): Promise<TopMover[]> {
    const { data: movers, error } = await supabaseAdmin
      .from('facts_historical')
      .select(`
        card_id,
        spread_after_fees,
        psa10_delta,
        raw_delta,
        confidence,
        cards!inner(name),
        card_assets!inner(set_name, image_url_small)
      `)
      .eq('period_days', periodDays)
      .order('spread_after_fees', { ascending: false })
      .limit(5)

    if (error) {
      throw new Error(`Failed to get top movers: ${error.message}`)
    }

    return movers?.map(mover => ({
      card_id: mover.card_id,
      name: mover.cards.name,
      set_name: mover.card_assets.set_name,
      spread_after_fees: mover.spread_after_fees,
      psa10_delta: mover.psa10_delta,
      raw_delta: mover.raw_delta,
      confidence: mover.confidence,
      image_url_small: mover.card_assets.image_url_small
    })) || []
  }

  /**
   * Send market update email to a subscriber
   */
  private async sendMarketUpdateEmail(
    subscriber: EmailSubscription, 
    topMovers: TopMover[]
  ): Promise<void> {
    // TODO: Implement actual email sending (using Resend, SendGrid, etc.)
    // This is a placeholder structure
    
    const emailData = {
      to: subscriber.email,
      subject: `Weekly Pokémon Card Market Update - Top 5 Movers`,
      html: this.generateEmailHTML(topMovers, subscriber.filters),
      unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?token=${subscriber.unsubscribe_token}`
    }

    console.log(`Would send email to ${subscriber.email}:`, emailData.subject)
    
    // For now, just log the email content
    // In production, you'd use a service like Resend, SendGrid, or AWS SES
  }

  /**
   * Generate HTML email content
   */
  private generateEmailHTML(topMovers: TopMover[], filters: Record<string, string | number | boolean>): string {
    const period = filters.period || 7
    const periodText = period === 7 ? 'week' : `${period} days`
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Weekly Pokémon Card Market Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
            .card-image { width: 60px; height: 60px; border-radius: 4px; float: left; margin-right: 15px; }
            .card-info { overflow: hidden; }
            .profit { color: #28a745; font-weight: bold; }
            .loss { color: #dc3545; font-weight: bold; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📈 Weekly Pokémon Card Market Update</h1>
              <p>Top 5 movers from the last ${periodText} based on your filter preferences</p>
            </div>
            
            ${topMovers.map((mover, index) => `
              <div class="card">
                <img src="${mover.image_url_small}" alt="${mover.name}" class="card-image">
                <div class="card-info">
                  <h3>#${index + 1} ${mover.name}</h3>
                  <p><strong>Set:</strong> ${mover.set_name}</p>
                  <p><strong>Profit/Loss:</strong> 
                    <span class="${mover.spread_after_fees >= 0 ? 'profit' : 'loss'}">
                      $${mover.spread_after_fees.toFixed(2)}
                    </span>
                  </p>
                  <p><strong>PSA 10 Change:</strong> ${mover.psa10_delta.toFixed(1)}%</p>
                  <p><strong>Raw Change:</strong> ${mover.raw_delta.toFixed(1)}%</p>
                  <p><strong>Confidence:</strong> ${mover.confidence}</p>
                </div>
              </div>
            `).join('')}
            
            <div class="footer">
              <p>This email was sent based on your filter preferences. You can update your settings or unsubscribe at any time.</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?token=${filters.unsubscribe_token}">Unsubscribe</a></p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Log market update statistics
   */
  private async logMarketUpdate(data: {
    totalSubscribers: number
    successfulSends: number
    failedSends: number
    topMovers: TopMover[]
  }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('market_update_logs')
      .insert({
        sent_date: new Date().toISOString().split('T')[0],
        total_subscribers: data.totalSubscribers,
        successful_sends: data.successfulSends,
        failed_sends: data.failedSends,
        top_movers: data.topMovers
      })

    if (error) {
      console.error('Failed to log market update:', error)
    }
  }

  /**
   * Subscribe user to weekly updates
   */
  async subscribe(email: string, filters: Record<string, string | number | boolean>): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabaseAdmin
        .from('email_subscriptions')
        .upsert({
          email,
          filters,
          is_active: true,
          unsubscribe_token: crypto.randomUUID()
        }, {
          onConflict: 'email'
        })

      if (error) {
        throw new Error(`Failed to subscribe: ${error.message}`)
      }

      return {
        success: true,
        message: 'Successfully subscribed to weekly market updates!'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to subscribe'
      }
    }
  }

  /**
   * Unsubscribe user from weekly updates
   */
  async unsubscribe(token: string): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabaseAdmin
        .from('email_subscriptions')
        .update({ is_active: false })
        .eq('unsubscribe_token', token)

      if (error) {
        throw new Error(`Failed to unsubscribe: ${error.message}`)
      }

      return {
        success: true,
        message: 'Successfully unsubscribed from weekly market updates.'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to unsubscribe'
      }
    }
  }
}

export const emailService = new EmailService()
