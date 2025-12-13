import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators'

export default class Report extends Model {
    static table = 'reports'

    @text('title') title!: string
    @text('description') description!: string
    @text('reporter_name') reporterName!: string
    @field('incident_type') incidentType!: number
    @field('severity') severity!: number
    @date('incident_time') incidentTime!: Date
    @field('latitude') latitude!: number | null
    @field('longitude') longitude!: number | null

    @date('created_at') createdAt!: Date
    @date('updated_at') updatedAt!: Date
    @text('user_id') userId!: string

    @field('synced') synced!: boolean
    @field('sync_attempts') syncAttempts!: number

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
