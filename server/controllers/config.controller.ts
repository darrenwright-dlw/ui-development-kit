/**
 * Configuration controller for the UI Development Kit server
 */
import { Request, Response } from 'express';
import { ConfigResponse } from '../models/types';
import { SERVER_CONFIG } from '../config/server.config';

export const getConfig = (req: Request, res: Response): void => {
  const response: ConfigResponse = {
    version: '1.0.0',
    settings: {
      theme: 'light',
      autoRefresh: true
    }
  };
  res.json(response);
};

export const getTenantInfo = (req: Request, res: Response): void => {
  res.json({
    tenantUrl: SERVER_CONFIG.tenantUrl,
    apiUrl: SERVER_CONFIG.apiUrl
  });
};