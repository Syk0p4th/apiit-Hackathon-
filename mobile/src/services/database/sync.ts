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
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
            console.error('User not authenticated')
            return
        }
        const user = session.user
        await synchronize({
            database,
            sendCreatedAsUpdated: false, // Explicitly separate create/update for clearer debugging
            pullChanges: async ({ lastPulledAt }) => {
                console.log('[Sync] Pulling changes since:', lastPulledAt)
                const { data, error } = await supabase
                    .from('reports')
                    .select('*')
                    .gt('updated_at', new Date(lastPulledAt || 0).toISOString())

                if (error) {
                    console.error('[Sync] Pull Error:', error)
                    throw new Error(error.message)
                }

                const safeData = (data as any[]) || []

                // If first sync (no lastPulledAt), everything is new -> 'created'
                // If subsequent sync, we don't know if it's new or updated without checking local DB, 
                // but WatermelonDB handles "update non-existent" by creating it (with a warning).
                // So we stick to 'updated' for incremental syncs to be safe.
                const isInitialSync = !lastPulledAt

                const mappedReports = safeData.map(row => ({
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
                    images: row.images ? JSON.stringify(row.images) : '[]',
                    synced: true,
                    sync_attempts: row.sync_attempts
                }))

                const changes = {
                    reports: {
                        created: isInitialSync ? mappedReports : [],
                        updated: isInitialSync ? [] : mappedReports,
                        deleted: [],
                    },
                }

                return { changes, timestamp: Date.now() }
            },
            pushChanges: async ({ changes }) => {
                // WatermelonDB Sync types are complex, simple cast helps
                const reports = (changes as any).reports
                if (!reports) return

                const createdCount = reports.created.length
                const updatedCount = reports.updated.length

                console.log(`[Sync] Pushing: ${createdCount} created, ${updatedCount} updated`)

                if (createdCount === 0 && updatedCount === 0) return

                const currentUserId = user?.id

                const mapRecord = (record: any) => ({
                    id: record.id,
                    title: record.title,
                    description: record.description,
                    reporter_name: record.reporter_name,
                    incident_type: record.incident_type,
                    severity: record.severity,
                    incident_time: safeDate(record.incident_time),
                    latitude: record.latitude,
                    longitude: record.longitude,
                    images: record.images ? JSON.parse(record.images) : [],
                    created_at: safeDate(record.created_at),
                    updated_at: new Date().toISOString(),
                    // Use the session user_id if available (claimed), otherwise keep existing or null
                    user_id: currentUserId || record.user_id || null,
                    sync_attempts: (record.sync_attempts || 0) + 1
                })

                // Handle created records
                if (createdCount > 0) {
                    const recordsToInsert = reports.created.map(mapRecord)
                    console.log('[Sync] Inserting:', recordsToInsert.length)
                    const { error } = await supabase.from('reports').insert(recordsToInsert) // Use INSERT for created
                    if (error) {
                        console.error('[Sync] Insert Error:', error)
                        throw new Error('Insert Failed: ' + error.message)
                    }
                }

                if (updatedCount > 0) {
                    const recordsToUpdate = reports.updated.map(mapRecord)
                    console.log('[Sync] Updating:', recordsToUpdate.length)
                    const { error } = await supabase.from('reports').upsert(recordsToUpdate)
                    if (error) {
                        console.error('[Sync] Update Error:', error)
                        throw new Error('Update Failed: ' + error.message)
                    }
                }
            },
        })
    } catch (error) {
        console.error('Sync failed:', error)
    } finally {
        isSyncing = false
    }
}
