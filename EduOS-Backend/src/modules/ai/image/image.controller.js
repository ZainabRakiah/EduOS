import BaseController from '../../../shared/controllers/base.controller.js';
import imageService from './image.service.js';
import ResponseHandler from '../../../services/response.service.js';
import asyncHandler from '../../../utils/asyncHandler.util.js';

class ImageController extends BaseController {
  constructor(service) {
    super(service);
    this.service = service;
  }

  generate = asyncHandler(async (req, res) => {
    const { prompt, aspectRatio, resolution } = req.body;
    const result = await this.service.generateImage({ prompt, aspectRatio, resolution });
    return ResponseHandler.success(res, result.data, 'Image generated successfully.');
  });
}

export default new ImageController(imageService);
