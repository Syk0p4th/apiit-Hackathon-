import { synchronize } from '@nozbe/watermelondb/sync'
import database from './index'
import { supabase } from '../api/supabase'

let isSyncing = false

// Helper to safely parse dates
const safeDate = (date: any): string => {
    const d = new Date(date)
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

export async function sync() {
    if (isSyncing) {
        console.log('Sync already in progress, skipping.')
        return
    }

    isSyncing = true
    try {
        const { data: { user } } = await supabase.auth.getUser()

        await synchronize({
            database,
            sendCreatedAsUpdated: true,
            pullChanges: async ({ lastPulledAt }) => {
                const { data, error } = await supabase
                    .from('reports')
                    .select('*')
                    .gt('updated_at', new Date(lastPulledAt || 0).toISOString())

                if (error) {
                    throw new Error(error.message)
                }

                const safeData = (data as any[]) || []

                const changes = {
                    reports: {
                        created: [],
                        updated: safeData.map(row => ({
                            id: row.id,
                            title: row.title,
                            description: row.description,
                            reporter_name: row.reporter_name,
                            incident_type: row.incident_type,
                            severity: row.severity,
                            incident_time: new Date(safeDate(row.incident_time)).getTime(),
                            latitude: row.latitude,
                            longitude: row.longitude,
                            created_at: new Date(safeDate(row.created_at)).getTime(),
                            user_id: row.user_id,
                            synced: true,
                            sync_attempts: row.sync_attempts
                        })),
                        deleted: [],
                    },
                }

                return { changes, timestamp: Date.now() }
            },
            pushChanges: async ({ changes }) => {
                // WatermelonDB Sync types are complex, simple cast helps
                const reports = (changes as any).reports
                if (!reports) return

                const currentUserId = user?.id

                const mapRecord = (record: any) => ({
                    id: record.id,
                    title: record.title,
                    description: record.description,
                    reporter_name: record.reporter_name, // Raw record uses snake_case schema names
                    incident_type: record.incident_type,
                    severity: record.severity,
                    incident_time: safeDate(record.incident_time),
                    latitude: record.latitude,
                    longitude: record.longitude,
                    created_at: safeDate(record.created_at),
                    updated_at: new Date().toISOString(),
                    user_id: currentUserId || record.user_id,
                    sync_attempts: (record.sync_attempts || 0) + 1
                })

                // Handle created records
                if (reports.created.length > 0) {
                    const recordsToInsert = reports.created.map(mapRecord)
                    const { error } = await supabase.from('reports').upsert(recordsToInsert)
                    if (error) throw new Error(error.message)
                }

                if (reports.updated.length > 0) {
                    const recordsToUpdate = reports.updated.map(mapRecord)
                    const { error } = await supabase.from('reports').upsert(recordsToUpdate)
                    if (error) throw new Error(error.message)
                }
            },
        })
    } catch (error) {
        console.error('Sync failed:', error)
    } finally {
        isSyncing = false
    }
}
