import { ActivityLog } from '../../domain/models/activity-log.model';
import { ExcelSheetDefinition } from './excel-export.models';

export class ActivityWorkbookMapper {
  static map(entries: readonly ActivityLog[]): ExcelSheetDefinition {
    const columns = [
      { headerKey: 'exports.activity.dateTime', fallbackHeader: 'Date & Time' },
      { headerKey: 'exports.activity.type', fallbackHeader: 'Type' },
      { headerKey: 'exports.activity.details', fallbackHeader: 'Details' },
      { headerKey: 'exports.activity.operator', fallbackHeader: 'Operator' },
    ];
    const rows = entries.map((entry) => [entry.created_at, entry.event_code, JSON.stringify(entry.payload), entry.operator_name]);
    return { name: 'Activity Log', columns, rows, summary: ['Summary', `${entries.length} entries`, null, null] };
  }
}
