import { eventsRepository } from './events.repository';
import { Event, EventStatus, EventType } from '../../types';

export class EventsService {
  async listEvents(options: {
    page?: number;
    limit?: number;
    status?: string;
    event_type?: string;
    search?: string;
  }) {
    return eventsRepository.list(options);
  }

  async getEventById(id: string): Promise<Event | null> {
    return eventsRepository.findById(id);
  }

  async getEventBySlug(slug: string): Promise<Event | null> {
    return eventsRepository.findBySlug(slug);
  }

  async createEvent(
    payload: {
      title: string;
      short_description?: string;
      description?: string;
      event_type: EventType;
      start_date: string;
      end_date: string;
      venue: string;
      location?: string;
      organizer?: string;
      expected_participants?: number;
      cover_image?: string;
    },
    userId: string
  ): Promise<Event> {
    if (new Date(payload.start_date) > new Date(payload.end_date)) {
      throw new Error('Event end date must be on or after the start date');
    }
    return eventsRepository.create(payload, userId);
  }

  async updateEvent(
    id: string,
    payload: any,
    userId: string
  ): Promise<Event> {
    if (payload.start_date && payload.end_date) {
      if (new Date(payload.start_date) > new Date(payload.end_date)) {
        throw new Error('Event end date must be on or after the start date');
      }
    }
    return eventsRepository.update(id, payload, userId);
  }

  async updateEventStatus(
    id: string,
    status: EventStatus,
    userId: string,
    reason?: string
  ): Promise<Event> {
    return eventsRepository.updateStatus(id, status, userId, reason);
  }

  async deleteEvent(id: string, userId: string): Promise<boolean> {
    return eventsRepository.delete(id, userId);
  }
}

export const eventsService = new EventsService();
