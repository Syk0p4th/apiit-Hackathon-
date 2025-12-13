import { useEffect, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import { sync } from '../../services/database/sync'

export function useAutoSync(): string {
    const [syncStatus, setSyncStatus] = useState<string>('Idle')

    const triggerSync = async () => {
        const state = await NetInfo.fetch()
        if (state.isConnected) {
            setSyncStatus('Syncing...')
            try {
                await sync()
                setSyncStatus('Synced')
            } catch (err) {
                console.warn('Sync failed:', err)
                setSyncStatus('Sync Failed')
            }
        } else {
            setSyncStatus('Offline')
        }
    }

    useEffect(() => {
        // 1. Initial Sync on mount
        triggerSync()

        // 2. Listen for Network Changes
        const unsubscribeNet = NetInfo.addEventListener((state: NetInfoState) => {
            if (state.isConnected) {
                triggerSync()
            } else {
                setSyncStatus('Offline')
            }
        })

        // 3. Listen for AppState Changes (Background -> Foreground)
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                triggerSync()
            }
        })

        return () => {
            unsubscribeNet()
            subscription.remove()
        }
    }, [])

    return syncStatus
}

