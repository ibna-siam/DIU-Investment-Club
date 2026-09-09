import { eventTeamRepository } from './event-team.repository';
import { EventMember, EventRole } from '../../types';

export class EventTeamService {
  async listMembers(eventId: string, includeRemoved: boolean = false): Promise<EventMember[]> {
    return eventTeamRepository.list(eventId, includeRemoved);
  }

  async addMember(payload: {
    event_id: string;
    user_id: string;
    event_role: EventRole;
    responsibility?: string;
    assigned_by: string;
  }): Promise<EventMember> {
    return eventTeamRepository.addMember(payload);
  }

  async updateMember(
    id: string,
    payload: { event_role?: EventRole; responsibility?: string },
    userId: string
  ): Promise<EventMember> {
    return eventTeamRepository.updateMember(id, payload, userId);
  }

  async removeMember(id: string, userId: string): Promise<boolean> {
    return eventTeamRepository.removeMember(id, userId);
  }
}

export const eventTeamService = new EventTeamService();
