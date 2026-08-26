import BaseController from '../../shared/controllers/base.controller.js';
import mockTestService from './mock-test.service.js';
import ResponseHandler from '../../services/response.service.js';
import asyncHandler from '../../utils/asyncHandler.util.js';

class MockTestController extends BaseController {
  constructor() {
    super(mockTestService);
    this.service = mockTestService;
  }

  generate = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    const result = await this.service.generateMockTestFromPrompt(userId, prompt);
    return ResponseHandler.created(res, result, 'Mock test generated successfully.');
  });

  findAll = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { search, subject } = req.query;
    const result = await this.service.getMockTests(userId, { search, subject });
    return ResponseHandler.success(res, result, 'Mock tests retrieved successfully.');
  });

  findOne = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { id } = req.params;
    const result = await this.service.getMockTestById(userId, id);
    return ResponseHandler.success(res, result, 'Mock test details retrieved successfully.');
  });

  delete = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { id } = req.params;
    await this.service.deleteMockTest(userId, id);
    return ResponseHandler.noContent(res);
  });

  submitAttempt = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { id } = req.params; // mockTestId
    const result = await this.service.submitTestAttempt(userId, id, req.body);
    return ResponseHandler.created(res, result, 'Test attempt submitted successfully.');
  });

  findAttempt = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { attemptId } = req.params;
    const result = await this.service.getAttemptDetails(userId, attemptId);
    return ResponseHandler.success(res, result, 'Attempt details retrieved successfully.');
  });

  findAllAttempts = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const result = await this.service.getUserAttempts(userId);
    return ResponseHandler.success(res, result, 'User test attempts retrieved successfully.');
  });
}

export default new MockTestController();
