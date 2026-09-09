import { supabaseClient, isSupabaseConfigured } from '../../../config/supabase';

export interface CalendarEvent {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
}

export interface ICalendarAdapter {
  name: string;
  syncEvent(event: CalendarEvent): Promise<{ success: boolean; externalEventId?: string; error?: string }>;
}

export class MockCalendarAdapter implements ICalendarAdapter {
  name = 'Google Calendar Adapter (OAuth2 Ready)';

  async syncEvent(event: CalendarEvent) {
    const startTime = Date.now();
    const externalEventId = `gcal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    console.log(`[CALENDAR SYNC] [${this.name}] Event: "${event.title}" | Start: ${event.startTime}`);

    const duration = Date.now() - startTime;
    if (isSupabaseConfigured() && supabaseClient) {
      await supabaseClient.from('integration_logs').insert({
        provider_type: 'CALENDAR',
        provider_name: this.name,
        direction: 'OUTBOUND',
        endpoint_or_action: 'sync_event',
        status_code: 200,
        execution_time_ms: duration,
        payload_summary: `Title: ${event.title}, Start: ${event.startTime}, ExtID: ${externalEventId}`,
      });
    }

    return { success: true, externalEventId };
  }
}
