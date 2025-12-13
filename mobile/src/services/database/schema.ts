import { appSchema, tableSchema } from '@nozbe/watermelondb'

export default appSchema({
    version: 1,
    tables: [
        tableSchema({
            name: 'reports',
            columns: [
                { name: 'title', type: 'string' },
                { name: 'description', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'user_id', type: 'string' },
            ]
        }),
    ]
})
