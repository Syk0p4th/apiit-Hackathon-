import { useEffect, useState } from 'react'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import { sync } from '../../services/database/sync'

export function useAutoSync(): string {
    const [syncStatus, setSyncStatus] = useState<string>('Idle')

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            if (state.isConnected) {
                setSyncStatus('Syncing...')
                sync()
                    .then(() => setSyncStatus('Synced'))
                    .catch(err => {
                        console.warn('Sync failed:', err)
                        setSyncStatus('Sync Failed')
                    })
            } else {
                setSyncStatus('Offline')
            }
        })

        return () => unsubscribe()
    }, [])

    return syncStatus
}
