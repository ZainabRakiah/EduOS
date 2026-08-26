import BaseController from '../../shared/controllers/base.controller.js';
import authService from './auth.service.js';
import ResponseHandler from '../../services/response.service.js';
import asyncHandler from '../../utils/asyncHandler.util.js';

class AuthController extends BaseController {
  constructor(service) {
    super(service);
    this.service = service;
  }

  register = asyncHandler(async (req, res) => {
    const result = await this.service.register(req.body);
    return ResponseHandler.created(res, result, 'Account created successfully.');
  });

  login = asyncHandler(async (req, res) => {
    const result = await this.service.login(req.body);
    return ResponseHandler.success(res, result, 'Signed in successfully.');
  });

  me = asyncHandler(async (req, res) => {
    const user = await this.service.me(req.user.sub);
    return ResponseHandler.success(res, user, 'User profile loaded.');
  });

  refresh = asyncHandler(async (req, res) => {
    const result = await this.service.refresh(req.body.refreshToken);
    return ResponseHandler.success(res, result, 'Token refreshed.');
  });

  logout = asyncHandler(async (req, res) => {
    await this.service.logout(req.user.sub);
    return ResponseHandler.success(res, null, 'Signed out successfully.');
  });
}

export default new AuthController(authService);
