/**
 * App Version Service
 * Manages version tracking, database migrations, and what's new notifications
 */

import { BackendAPIService, MigrationCheckResult } from '../../../data/services/BackendAPIService'
import migrationsData from '../../../data/migrations.json'

export interface WhatsNewContent {
  title: string
  content: string
}

export interface MigrationData {
  migrations: string[]
  whatsNew: WhatsNewContent
}

export interface AppStartupResult {
  success: boolean
  migrationsRun: string[]
  whatsNewToShow: Array<{
    version: string
    content: WhatsNewContent
  }>
  errors: string[]
}

export class AppVersionService {

  /**
   * Main startup method - handles migration check and what's new preparation
   * Call this from App.tsx on startup
   */
  static async handleAppStartup(): Promise<AppStartupResult> {
    console.log('🚀 AppVersionService: Starting app version check and migrations...')

    try {
      // Get available versions from migrations data
      const availableVersions = Object.keys(migrationsData).sort(this.compareVersions)
      console.log('📦 Available versions:', availableVersions)

      // Check and run migrations via backend
      const migrationResult = await BackendAPIService.checkAndRunMigrations(availableVersions)
      console.log('✅ Migration check result:', migrationResult)

      // Prepare what's new content for unseen versions
      const whatsNewToShow = this.prepareWhatsNewContent(migrationResult.unseenVersions)

      const result: AppStartupResult = {
        success: migrationResult.errors?.length === 0,
        migrationsRun: migrationResult.migrationsRun,
        whatsNewToShow,
        errors: migrationResult.errors || []
      }

      console.log('🎯 App startup result:', result)
      return result

    } catch (error) {
      console.error('❌ Error during app startup version check:', error)
      return {
        success: false,
        migrationsRun: [],
        whatsNewToShow: [],
        errors: [error instanceof Error ? error.message : 'Unknown startup error']
      }
    }
  }

  /**
   * Show what's new modals in sequence for unseen versions
   * Returns promise that resolves when all modals are dismissed
   */
  static async showWhatsNewSequence(whatsNewItems: Array<{ version: string, content: WhatsNewContent }>): Promise<void> {
    if (whatsNewItems.length === 0) {
      return
    }

    console.log(`📢 Showing what's new for ${whatsNewItems.length} versions...`)

    for (const item of whatsNewItems) {
      try {
        // Show modal and wait for user to dismiss
        await this.showWhatsNewModal(item.version, item.content)

        // Mark version as seen in backend
        const success = await BackendAPIService.markVersionSeen(item.version)

        if (success) {
          console.log(`✅ Marked version ${item.version} as seen`)
        } else {
          console.warn(`⚠️ Failed to mark version ${item.version} as seen`)
        }

      } catch (error) {
        console.error(`❌ Error showing what's new for version ${item.version}:`, error)
      }
    }

    console.log('🎉 What\'s new sequence completed')
  }

  /**
   * Show a single what's new modal
   * This will be implemented by the WhatsNewModal component
   */
  private static async showWhatsNewModal(version: string, content: WhatsNewContent): Promise<void> {
    return new Promise((resolve) => {
      // Create and show the modal
      const event = new CustomEvent('show-whats-new', {
        detail: {
          version,
          content,
          onClose: resolve
        }
      })

      window.dispatchEvent(event)
    })
  }

  /**
   * Prepare what's new content for given versions
   */
  private static prepareWhatsNewContent(versions: string[]): Array<{ version: string, content: WhatsNewContent }> {
    const whatsNewContent: Array<{ version: string, content: WhatsNewContent }> = []

    // Sort versions chronologically so we show them in order
    const sortedVersions = versions.sort(this.compareVersions)

    for (const version of sortedVersions) {
      const migrationData = (migrationsData as Record<string, MigrationData>)[version]

      if (migrationData?.whatsNew) {
        whatsNewContent.push({
          version,
          content: migrationData.whatsNew
        })
      } else {
        console.warn(`⚠️ No what's new content found for version ${version}`)
      }
    }

    return whatsNewContent
  }

  /**
   * Manual method to check for unseen versions (for debugging)
   */
  static async getUnseenVersions(): Promise<string[]> {
    try {
      return await BackendAPIService.getUnseenVersions()
    } catch (error) {
      console.error('Error getting unseen versions:', error)
      return []
    }
  }

  /**
   * Manual method to mark a version as seen (for debugging)
   */
  static async markVersionSeen(version: string): Promise<boolean> {
    try {
      return await BackendAPIService.markVersionSeen(version)
    } catch (error) {
      console.error('Error marking version as seen:', error)
      return false
    }
  }

  /**
   * Check if version tracking is enabled
   */
  static async isVersionTrackingEnabled(): Promise<boolean> {
    try {
      return await BackendAPIService.isVersionTrackingEnabled()
    } catch (error) {
      console.error('Error checking version tracking status:', error)
      return false
    }
  }

  /**
   * Get available versions from migrations data
   */
  static getAvailableVersions(): string[] {
    return Object.keys(migrationsData).sort(this.compareVersions)
  }

  /**
   * Get what's new content for a specific version
   */
  static getWhatsNewContent(version: string): WhatsNewContent | null {
    const migrationData = (migrationsData as Record<string, MigrationData>)[version]
    return migrationData?.whatsNew || null
  }

  /**
   * Compare two version strings using semantic versioning rules
   * Returns negative if v1 < v2, positive if v1 > v2, zero if equal
   */
  private static compareVersions(v1: string, v2: string): number {
    try {
      const parts1 = v1.split('.').map(Number)
      const parts2 = v2.split('.').map(Number)

      const maxLength = Math.max(parts1.length, parts2.length)

      for (let i = 0; i < maxLength; i++) {
        const num1 = i < parts1.length ? parts1[i] : 0
        const num2 = i < parts2.length ? parts2[i] : 0

        if (num1 !== num2) {
          return num1 - num2
        }
      }

      return 0
    } catch (error) {
      // Fallback to string comparison
      return v1.localeCompare(v2)
    }
  }

}