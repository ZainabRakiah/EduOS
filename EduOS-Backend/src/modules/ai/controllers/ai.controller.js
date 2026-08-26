import BaseController from '../../../shared/controllers/base.controller.js';
import aiService from '../services/ai.service.js';
import ResponseHandler from '../../../services/response.service.js';
import asyncHandler from '../../../utils/asyncHandler.util.js';

class AiController extends BaseController {
  constructor(service) {
    super(service);
    this.service = service;
  }

  healthCheck = asyncHandler(async (req, res) => {
    const result = await this.service.getHealth();
    return ResponseHandler.success(res, result, 'AI module is connected successfully.');
  });

  chat = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { prompt } = req.body;
    const response = await this.service.chat(userId, prompt);

    if (response && response.intent) {
      return res.status(200).json(response);
    }

    return res.status(200).json({
      success: true,
      response: response,
    });
  });

  explain = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { resourceId, question } = req.body;
    const result = await this.service.explainResource(userId, resourceId, question);
    return res.status(200).json(result);
  });

  extractPoints = asyncHandler(async (req, res) => {
    const { aiContent } = req.body;
    const result = await this.service.extractPoints(aiContent);
    return res.status(200).json({
      success: true,
      data: result,
    });
  });

  generateImage = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { prompt, aspectRatio } = req.body;
    const result = await this.service.generateImage(userId, { prompt, aspectRatio });
    return res.status(200).json(result);
  });
}

export default new AiController(aiService);
