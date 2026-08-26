import BaseService from '../../shared/services/base.service.js';
import notesRepository from './notes.repository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import prisma from '../../config/database.config.js';
import { generateResponse } from '../ai/providers/openrouter.provider.js';
import logger from '../../services/logger.service.js';

class NotesService extends BaseService {
  constructor(repository) {
    super(repository);
    this.repository = repository;
  }

  async createNote(userId, data) {
    const note = await this.repository.create(userId, data);
    await prisma.learningActivity.create({
      data: {
        userId,
        type: 'CREATE',
        entityType: 'NOTE',
        entityId: note.id,
        title: note.title,
        noteId: note.id,
      },
    });
    return note;
  }

  async getNoteById(userId, id) {
    const note = await this.repository.findById(id, userId);
    if (!note) {
      throw new NotFoundError('Note not found.');
    }
    return note;
  }

  async getNotes(userId, filters, pagination) {
    return this.repository.findAll(userId, filters, pagination);
  }

  async updateNote(userId, id, data) {
    const existing = await this.repository.findById(id, userId);
    if (!existing) {
      throw new NotFoundError('Note not found.');
    }
    const note = await this.repository.update(id, userId, data);
    await prisma.learningActivity.create({
      data: {
        userId,
        type: 'EDIT',
        entityType: 'NOTE',
        entityId: note.id,
        title: note.title,
        noteId: note.id,
      },
    });
    return note;
  }

  async deleteNote(userId, id) {
    const existing = await this.repository.findById(id, userId);
    if (!existing) {
      throw new NotFoundError('Note not found.');
    }
    const note = await this.repository.delete(id, userId);
    await prisma.learningActivity.create({
      data: {
        userId,
        type: 'DELETE',
        entityType: 'NOTE',
        entityId: id,
        title: existing.title,
        noteId: id,
      },
    });
    return note;
  }

  // AI-Driven Smart Notes Extractor and Saver
  async saveNoteFromAi(userId, { aiContent, sourceDocument }) {
    logger.info(`Extracting smart learning points from AI response for user ${userId}`);

    const promptText = `You are a helpful learning assistant.
Analyze the following text and extract a concise study note in structured JSON format.
The JSON must have the following keys:
- title: A short title for the concept (max 6 words).
- summary: A one-sentence summary of the concept.
- importantPoints: An array of 3 to 6 key bullet points. Ensure you capture key facts, important dates, formulas, or numbers mentioned in the text. Ensure all bullet points are complete, grammatically correct sentences that look highly professional. Do not truncate sentences mid-way or leave them incomplete. Do not prefix the bullet points with characters like "•" or "-".

Input Text:
"""
${aiContent}
"""

Return ONLY the raw JSON output. Do not include markdown code block syntax (like \`\`\`json) or any other explanation.`;

    let title = 'Study Note';
    let summary = 'A concise summary of the learning material.';
    let importantPoints = ['Key point extracted from study chat.'];

    try {
      const messages = [{ role: 'user', content: promptText }];
      const aiResponse = await generateResponse(messages);

      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.title) title = parsed.title;
        if (parsed.summary) summary = parsed.summary;
        if (parsed.importantPoints && Array.isArray(parsed.importantPoints)) {
          importantPoints = parsed.importantPoints;
        }
      } else {
        throw new Error('No JSON matched in AI response');
      }
    } catch (err) {
      logger.error(
        'Failed to extract smart note details using AI, falling back to simple heuristics:',
        err,
      );
      // Fallback fallback parser in case model timed out or crashed
      title = sourceDocument !== 'General Chat' ? `Notes on ${sourceDocument}` : 'Study Note';
      summary = aiContent.split(/[.!?]/)[0] + '.';
      importantPoints = aiContent
        .split('\n')
        .map((line) => line.trim().replace(/^[•*\d.\s-]+/, ''))
        .filter((line) => line.length > 20)
        .slice(0, 4);
      if (importantPoints.length === 0) {
        importantPoints = [aiContent.substring(0, 150) + '...'];
      }
    }

    const note = await this.repository.create(userId, {
      title,
      content: aiContent,
      summary,
      importantPoints,
      sourceType: 'AI_EXPLANATION',
      sourceDocument: sourceDocument || 'General Chat',
    });

    await prisma.learningActivity.create({
      data: {
        userId,
        type: 'CREATE',
        entityType: 'NOTE',
        entityId: note.id,
        title: note.title,
        noteId: note.id,
      },
    });

    return note;
  }

  // AI-Driven Sticky Notes Extractor and Saver
  async saveStickyFromAi(userId, { aiContent, documentId }) {
    logger.info(`Extracting key takeaway for sticky note for user ${userId}`);

    const promptText = `You are a helpful learning assistant.
Analyze the following text and extract a single key takeaway (a short formula, fact, definition, or reminder) in structured JSON format.
The JSON must have the following keys:
- title: A very short label (e.g. "Remember", "Formula", "Rule", "Note").
- content: A short takeaway message (max 12 words / 2 lines).

Input Text:
"""
${aiContent}
"""

Return ONLY the raw JSON output. Do not include markdown code block syntax (like \`\`\`json) or any other explanation.`;

    let title = 'Remember';
    let content = 'Key takeaway from learning session.';

    try {
      const messages = [{ role: 'user', content: promptText }];
      const aiResponse = await generateResponse(messages);

      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.title) title = parsed.title;
        if (parsed.content) content = parsed.content;
      }
    } catch (err) {
      logger.error(
        'Failed to extract sticky note details using AI, falling back to simple heuristics:',
        err,
      );
      title = 'Quick Reminder';
      content = aiContent.length > 80 ? aiContent.substring(0, 77) + '...' : aiContent;
    }

    const colors = ['Yellow', 'Pink', 'Blue', 'Green', 'Purple', 'Orange'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const stickyNote = await this.repository.createSticky(userId, {
      title,
      content,
      color: randomColor,
      documentId: documentId || null,
    });

    return stickyNote;
  }

  async getStickyNotes(userId, filters) {
    return this.repository.findStickyAll(userId, filters);
  }

  async deleteStickyNote(userId, id) {
    const existing = await this.repository.findStickyById(id, userId);
    if (!existing) {
      throw new NotFoundError('Sticky Note not found.');
    }
    return this.repository.deleteSticky(id, userId);
  }
}

export default new NotesService(notesRepository);
