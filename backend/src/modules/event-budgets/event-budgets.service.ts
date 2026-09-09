import { eventBudgetsRepository } from './event-budgets.repository';
import { EventBudget } from '../../types';

export class EventBudgetsService {
  async getBudgetByEventId(eventId: string): Promise<EventBudget | null> {
    return eventBudgetsRepository.getByEventId(eventId);
  }

  async getBudgetById(id: string): Promise<EventBudget | null> {
    return eventBudgetsRepository.getById(id);
  }

  async createBudget(payload: any, userId: string): Promise<EventBudget> {
    return eventBudgetsRepository.create(payload, userId);
  }

  async updateBudget(id: string, payload: any, userId: string): Promise<EventBudget> {
    return eventBudgetsRepository.update(id, payload, userId);
  }

  async submitBudget(id: string, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    return eventBudgetsRepository.submitForApproval(id, userId);
  }
}

export const eventBudgetsService = new EventBudgetsService();
