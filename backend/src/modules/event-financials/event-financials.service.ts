import { eventFinancialsRepository } from './event-financials.repository';
import { EventFinancialSummary } from '../../types';

export class EventFinancialsService {
  async getFinancialSummary(eventId: string): Promise<EventFinancialSummary> {
    return eventFinancialsRepository.getFinancialSummary(eventId);
  }

  async getBudgetVsActual(eventId: string): Promise<any[]> {
    return eventFinancialsRepository.getBudgetVsActual(eventId);
  }

  async getEventLedger(eventId: string): Promise<any[]> {
    return eventFinancialsRepository.getEventLedger(eventId);
  }
}

export const eventFinancialsService = new EventFinancialsService();
