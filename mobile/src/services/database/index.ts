import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import schema from './schema'
import Report from '../../features/reports/models/Report'

// Expo Go does not support WatermelonDB's SQLiteAdapter (JSI) directly.
// We use LokiJSAdapter as a fallback for development in Expo Go.
// For production, you must use a Development Build (prebuild) to use SQLiteAdapter.
const adapter = new LokiJSAdapter({
    schema,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    extraLokiOptions: {
        autosave: true,
        autosaveInterval: 2500,
    },
    onSetUpError: (error: any) => {
        console.error('LokiJS Setup Failed', error)
    }

    // Uncomment this block to use SQLite (Requires Development Build / Native Prebuild)
    /*
    const adapter = new SQLiteAdapter({
      schema, 
      jsi: true, 
      onSetUpError: error => console.error(error) 
    })
    */
})

const database = new Database({
    adapter,
    modelClasses: [
        Report,
    ],
})

export default database
