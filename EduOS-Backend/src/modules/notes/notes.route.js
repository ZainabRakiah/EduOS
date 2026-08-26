import { Router } from 'express';
import notesController from './notes.controller.js';

const router = Router();

router.get('/', notesController.findAll);
router.get('/sticky', notesController.findAllSticky);
router.post('/save-from-ai', notesController.saveFromAi);
router.post('/save-sticky-from-ai', notesController.saveStickyFromAi);
router.delete('/sticky/:id', notesController.deleteSticky);

router.get('/:id', notesController.findOne);
router.post('/', notesController.create);
router.put('/:id', notesController.update);
router.delete('/:id', notesController.delete);

export default router;
