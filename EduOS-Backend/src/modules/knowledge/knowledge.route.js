import { Router } from 'express';
import knowledgeController from './knowledge.controller.js';

const router = Router();

router.get('/', knowledgeController.findAll);
router.get('/:id', knowledgeController.findOne);
router.post('/', knowledgeController.create);
router.put('/:id', knowledgeController.update);
router.delete('/:id', knowledgeController.delete);

export default router;
