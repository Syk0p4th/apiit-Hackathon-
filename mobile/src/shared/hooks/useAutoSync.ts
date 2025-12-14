import { useEffect, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import { sync } from '../../services/database/sync'

export function useAutoSync(): string {
    const [syncStatus, setSyncStatus] = useState<string>('Idle')

    const triggerSync = async (retryCount = 0) => {
        const state = await NetInfo.fetch()
        if (state.isConnected) {
            console.log(`[AutoSync] Network detected (Retry: ${retryCount}). Syncing...`)
            setSyncStatus('Syncing...')

            try {
                // Small delay to let network stack stabilize
                await new Promise(r => setTimeout(r, 1000))

                await sync()
                setSyncStatus('Synced')
                console.log('[AutoSync] Sync complete.')
            } catch (err) {
                console.warn('[AutoSync] Sync failed:', err)
                setSyncStatus('Sync Failed')

                // Retry logic (max 3 times)
                if (retryCount < 3) {
                    console.log(`[AutoSync] Retrying in 3s... (${retryCount + 1}/3)`)
                    setTimeout(() => triggerSync(retryCount + 1), 3000)
                }
            }
        } else {
            console.log('[AutoSync] Offline.')
            setSyncStatus('Offline')
        }
    }

    useEffect(() => {
        // 1. Initial Sync
        triggerSync()

        let debounceTimer: NodeJS.Timeout

        // 2. Listen for Network Changes
        const unsubscribeNet = NetInfo.addEventListener((state: NetInfoState) => {
            console.log('[AutoSync] NetInfo Change:', state.isConnected)
            if (state.isConnected) {
                // Debounce to prevent rapid firing/race conditions
                clearTimeout(debounceTimer)
                debounceTimer = setTimeout(() => {
                    triggerSync()
                }, 2000)
            } else {
                setSyncStatus('Offline')
            }
        })

        // 3. Listen for AppState Changes
        let appStateTimer: NodeJS.Timeout

        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                console.log('[AutoSync] App Foregrounded. Waiting for network...')
                // Clear any existing timer to avoid multiple syncs
                clearTimeout(appStateTimer)
                // Wait 2s for network stack to wake up before triggering sync
                appStateTimer = setTimeout(() => {
                    triggerSync()
                }, 2000)
            }
        })

        return () => {
            unsubscribeNet()
            subscription.remove()
            clearTimeout(debounceTimer)
            clearTimeout(appStateTimer)
        }
    }, [])

    return syncStatus
}

