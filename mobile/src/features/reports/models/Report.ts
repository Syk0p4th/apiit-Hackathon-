import { Model } from '@nozbe/watermelondb'
import { field, date } from '@nozbe/watermelondb/decorators'

export default class Report extends Model {
    static table = 'reports'

    @field('title') title!: string
    @field('description') description!: string
    @date('created_at') createdAt!: Date
    @field('user_id') userId!: string
}
