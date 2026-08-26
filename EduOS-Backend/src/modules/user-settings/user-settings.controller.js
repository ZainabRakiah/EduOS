import BaseController from '../../shared/controllers/base.controller.js';
import userSettingsService from './user-settings.service.js';
import ResponseHandler from '../../services/response.service.js';
import asyncHandler from '../../utils/asyncHandler.util.js';

class UserSettingsController extends BaseController {
  constructor(service) {
    super(service);
    this.service = service;
  }

  getCurrent = asyncHandler(async (req, res) => {
    const user = await this.service.getCurrent(req.user.sub);
    return ResponseHandler.success(res, user, 'User profile loaded.');
  });

  updateProfile = asyncHandler(async (req, res) => {
    const user = await this.service.updateProfile(req.user.sub, req.body);
    return ResponseHandler.success(res, user, 'Profile updated successfully.');
  });

  changePassword = asyncHandler(async (req, res) => {
    await this.service.changePassword(req.user.sub, req.body);
    return ResponseHandler.success(res, null, 'Password changed successfully.');
  });
}

export default new UserSettingsController(userSettingsService);
