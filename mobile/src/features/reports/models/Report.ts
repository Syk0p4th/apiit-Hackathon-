import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, text, json } from '@nozbe/watermelondb/decorators'

const sanitizeImages = (raw: any) => {
    return Array.isArray(raw) ? raw : []
}

export default class Report extends Model {
    static table = 'reports'

    @text('title') declare title: string
    @text('description') declare description: string
    @text('reporter_name') declare reporterName: string
    @field('incident_type') declare incidentType: number
    @field('severity') declare severity: number
    @date('incident_time') declare incidentTime: Date
    @field('latitude') declare latitude: number | null
    @field('longitude') declare longitude: number | null
    @json('images', sanitizeImages) declare images: string[]

    @date('created_at') declare createdAt: Date
    @date('updated_at') declare updatedAt: Date
    @text('user_id') declare userId: string | null

    @field('synced') declare synced: boolean
    @field('sync_attempts') declare syncAttempts: number

    get incidentTypeLabel() {
        switch (this.incidentType) {
            case 1: return 'Flooding'
            case 2: return 'Landslide'
            case 3: return 'Powerline'
            case 4: return 'Roadblock'
            default: return 'Unknown'
        }
    }

    get severityLabel() {
        switch (this.severity) {
            case 1: return 'Low'
            case 2: return 'Medium'
            case 3: return 'High'
            case 4: return 'Critical'
            default: return 'Unknown'
        }
    }
}
