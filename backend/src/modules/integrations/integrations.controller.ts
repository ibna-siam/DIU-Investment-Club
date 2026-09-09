import { Request, Response } from 'express';
import { integrationsService } from './integrations.service';
import { templatesService } from './templates.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class IntegrationsController {
  // Provider Configs
  async getConfigs(req: Request, res: Response) {
    try {
      const configs = await integrationsService.getConfigs();
      return res.status(200).json({ success: true, data: configs });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async updateConfig(req: Request, res: Response) {
    try {
      const { providerType } = req.params;
      const config = await integrationsService.updateConfig(providerType, req.body);
      if (!config) {
        return res.status(404).json({ success: false, error: { message: 'Provider config not found' } });
      }
      return res.status(200).json({ success: true, data: config });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async testIntegration(req: Request, res: Response) {
    try {
      const { providerType } = req.params;
      const result = await integrationsService.testIntegration(providerType);
      return res.status(200).json({ success: result.success, message: result.message });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async getLogs(req: Request, res: Response) {
    try {
      const { providerType, page, limit } = req.query;
      const result = await integrationsService.getLogs({
        providerType: providerType as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 25,
      });
      return res.status(200).json({ success: true, ...result });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  // Communication Templates
  async listTemplates(req: Request, res: Response) {
    try {
      const templates = await templatesService.listTemplates();
      return res.status(200).json({ success: true, data: templates });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async createTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const { code, name, channel, subject, body_template, variables } = req.body;
      if (!code || !name || !channel || !body_template) {
        return res.status(400).json({ success: false, error: { message: 'code, name, channel, and body_template are required' } });
      }

      const tpl = await templatesService.createTemplate({
        code,
        name,
        channel,
        subject,
        body_template,
        variables,
        created_by: req.user?.id,
      });

      return res.status(201).json({ success: true, data: tpl });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async updateTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tpl = await templatesService.updateTemplate(id, req.body);
      if (!tpl) {
        return res.status(404).json({ success: false, error: { message: 'Template not found' } });
      }
      return res.status(200).json({ success: true, data: tpl });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }

  async previewTemplate(req: Request, res: Response) {
    try {
      const { template, variables } = req.body;
      if (!template) {
        return res.status(400).json({ success: false, error: { message: 'template text is required' } });
      }
      const rendered = templatesService.renderTemplate(template, variables || {});
      return res.status(200).json({ success: true, data: { rendered } });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: { message: e.message } });
    }
  }
}

export const integrationsController = new IntegrationsController();
