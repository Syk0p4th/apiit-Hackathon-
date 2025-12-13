import { synchronize } from '@nozbe/watermelondb/sync'
import database from './index'
import { supabase } from '../api/supabase'

let isSyncing = false

export async function sync() {
    if (isSyncing) {
        console.log('Sync already in progress, skipping.')
        return
    }

    isSyncing = true
    try {
        await synchronize({
            database,
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
                            created_at: new Date(row.created_at).getTime(),
                            user_id: row.user_id,
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

                // Handle created records
                if (reports.created.length > 0) {
                    const recordsToInsert = reports.created.map((record: any) => ({
                        id: record.id,
                        title: record.title,
                        description: record.description,
                        created_at: new Date(record.createdAt).toISOString(),
                        user_id: record.userId,
                    }))
                    const { error } = await supabase.from('reports').upsert(recordsToInsert)
                    if (error) throw new Error(error.message)
                }

                if (reports.updated.length > 0) {
                    const recordsToUpdate = reports.updated.map((record: any) => ({
                        id: record.id,
                        title: record.title,
                        description: record.description,
                        created_at: new Date(record.createdAt).toISOString(),
                        user_id: record.userId,
                    }))
                    const { error } = await supabase.from('reports').upsert(recordsToUpdate)
                    if (error) throw new Error(error.message)
                }
            },
        })
    } catch (error) {
        console.error('Sync failed:', error)
        // Don't throw if you want to silently fail, but good to know
    } finally {
        isSyncing = false
    }
}
