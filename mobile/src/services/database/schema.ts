import { appSchema, tableSchema } from '@nozbe/watermelondb'

export default appSchema({
    version: 3,
    tables: [
        tableSchema({
            name: 'reports',
            columns: [
                { name: 'title', type: 'string' }, // Keeping for backwards compat or quick summary
                { name: 'description', type: 'string' },
                { name: 'reporter_name', type: 'string' },
                { name: 'incident_type', type: 'number' },
                { name: 'severity', type: 'number' },
                { name: 'incident_time', type: 'number' }, // UNIX timestamp
                { name: 'latitude', type: 'number', isOptional: true },
                { name: 'longitude', type: 'number', isOptional: true },
                { name: 'images', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'user_id', type: 'string' },
                { name: 'synced', type: 'boolean' },
                { name: 'sync_attempts', type: 'number' },
            ]
        }),
    ]
})
