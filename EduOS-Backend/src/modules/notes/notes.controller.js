import BaseController from '../../shared/controllers/base.controller.js';
import notesService from './notes.service.js';
import ResponseHandler from '../../services/response.service.js';
import asyncHandler from '../../utils/asyncHandler.util.js';

class NotesController extends BaseController {
  constructor(service) {
    super(service);
    this.service = service;
  }

  create = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const result = await this.service.createNote(userId, req.body);
    return ResponseHandler.created(res, result, 'Note created successfully.');
  });

  findAll = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { search, subject, isPinned, isArchived, page, limit, sortBy, sortOrder } = req.query;
    const filters = { search, subject, isPinned, isArchived };
    const pagination = { page, limit, sortBy, sortOrder };
    const result = await this.service.getNotes(userId, filters, pagination);
    return ResponseHandler.success(res, result, 'Notes retrieved successfully.');
  });

  findOne = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { id } = req.params;
    const result = await this.service.getNoteById(userId, id);
    return ResponseHandler.success(res, result, 'Note retrieved successfully.');
  });

  update = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { id } = req.params;
    const result = await this.service.updateNote(userId, id, req.body);
    return ResponseHandler.success(res, result, 'Note updated successfully.');
  });

  delete = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { id } = req.params;
    await this.service.deleteNote(userId, id);
    return ResponseHandler.noContent(res);
  });

  saveFromAi = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const result = await this.service.saveNoteFromAi(userId, req.body);
    return ResponseHandler.created(res, result, 'Revision Notes saved successfully.');
  });

  saveStickyFromAi = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const result = await this.service.saveStickyFromAi(userId, req.body);
    return ResponseHandler.created(res, result, 'Sticky Note saved.');
  });

  findAllSticky = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { search } = req.query;
    const result = await this.service.getStickyNotes(userId, { search });
    return ResponseHandler.success(res, result, 'Sticky Notes retrieved successfully.');
  });

  deleteSticky = asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { id } = req.params;
    await this.service.deleteStickyNote(userId, id);
    return ResponseHandler.noContent(res);
  });
}

export default new NotesController(notesService);
