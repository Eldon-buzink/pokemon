/**
 * Image Mirroring Service
 * Downloads and mirrors card images to Supabase Storage for fast serving
 */

import { supabaseAdmin } from '@/lib/supabase'

interface ImageMirrorConfig {
  bucketName: string
  baseUrl: string
}

interface CardImage {
  card_id: string
  small_url: string
  large_url: string
  local_small_path: string
  local_large_path: string
}

export class ImageMirrorService {
  private config: ImageMirrorConfig

  constructor(config: ImageMirrorConfig) {
    this.config = config
  }

  /**
   * Download and mirror a single card image
   */
  async mirrorCardImage(cardImage: CardImage): Promise<{
    small_url: string
    large_url: string
  }> {
    try {
      // Download small image
      const smallResponse = await fetch(cardImage.small_url)
      if (!smallResponse.ok) {
        throw new Error(`Failed to download small image: ${smallResponse.statusText}`)
      }
      const smallBuffer = await smallResponse.arrayBuffer()

      // Download large image
      const largeResponse = await fetch(cardImage.large_url)
      if (!largeResponse.ok) {
        throw new Error(`Failed to download large image: ${largeResponse.statusText}`)
      }
      const largeBuffer = await largeResponse.arrayBuffer()

      // Upload to Supabase Storage
      const { data: smallData, error: smallError } = await supabaseAdmin.storage
        .from(this.config.bucketName)
        .upload(cardImage.local_small_path, smallBuffer, {
          contentType: 'image/png',
          upsert: true
        })

      if (smallError) {
        throw new Error(`Failed to upload small image: ${smallError.message}`)
      }

      const { data: largeData, error: largeError } = await supabaseAdmin.storage
        .from(this.config.bucketName)
        .upload(cardImage.local_large_path, largeBuffer, {
          contentType: 'image/png',
          upsert: true
        })

      if (largeError) {
        throw new Error(`Failed to upload large image: ${largeError.message}`)
      }

      // Get public URLs
      const { data: smallUrlData } = supabaseAdmin.storage
        .from(this.config.bucketName)
        .getPublicUrl(cardImage.local_small_path)

      const { data: largeUrlData } = supabaseAdmin.storage
        .from(this.config.bucketName)
        .getPublicUrl(cardImage.local_large_path)

      return {
        small_url: smallUrlData.publicUrl,
        large_url: largeUrlData.publicUrl
      }
    } catch (error) {
      console.error(`Failed to mirror image for card ${cardImage.card_id}:`, error)
      throw error
    }
  }

  /**
   * Mirror images for multiple cards in batch
   */
  async mirrorCardImages(cardImages: CardImage[]): Promise<{
    success: CardImage[]
    failed: { card: CardImage; error: string }[]
  }> {
    const success: CardImage[] = []
    const failed: { card: CardImage; error: string }[] = []

    // Process in batches to avoid overwhelming the API
    const batchSize = 5
    for (let i = 0; i < cardImages.length; i += batchSize) {
      const batch = cardImages.slice(i, i + batchSize)
      
      const promises = batch.map(async (cardImage) => {
        try {
          await this.mirrorCardImage(cardImage)
          success.push(cardImage)
        } catch (error) {
          failed.push({
            card: cardImage,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })

      await Promise.all(promises)
      
      // Add delay between batches to be respectful to the source API
      if (i + batchSize < cardImages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return { success, failed }
  }

  /**
   * Check if image already exists in storage
   */
  async imageExists(localPath: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin.storage
      .from(this.config.bucketName)
      .list(localPath.split('/').slice(0, -1).join('/'))

    if (error) {
      return false
    }

    const fileName = localPath.split('/').pop()
    return data?.some(file => file.name === fileName) || false
  }

  /**
   * Get public URL for a mirrored image
   */
  getPublicUrl(localPath: string): string {
    const { data } = supabaseAdmin.storage
      .from(this.config.bucketName)
      .getPublicUrl(localPath)

    return data.publicUrl
  }
}

export const createImageMirrorService = (): ImageMirrorService => {
  return new ImageMirrorService({
    bucketName: process.env.SUPABASE_IMAGE_BUCKET || 'card-images',
    baseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!
  })
}
