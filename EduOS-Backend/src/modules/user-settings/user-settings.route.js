import { Router } from 'express';
import userSettingsController from './user-settings.controller.js';
import { validate } from '../../middlewares/validation.middleware.js';
import { updateProfileSchema, changePasswordSchema } from './user-settings.validation.js';

const router = Router();

router.get('/me', userSettingsController.getCurrent);
router.put('/profile', validate(updateProfileSchema), userSettingsController.updateProfile);
router.put('/password', validate(changePasswordSchema), userSettingsController.changePassword);

export default router;
