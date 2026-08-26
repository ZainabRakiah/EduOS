import BaseService from '../../shared/services/base.service.js';
import mockTestRepository from './mock-test.repository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import prisma from '../../config/database.config.js';
import { generateResponse } from '../ai/providers/openrouter.provider.js';
import logger from '../../services/logger.service.js';

class MockTestService extends BaseService {
  constructor() {
    super(mockTestRepository);
    this.repository = mockTestRepository;
  }

  async generateMockTestFromPrompt(userId, prompt) {
    logger.info(`AI Generating Mock Test for user ${userId} with prompt: "${prompt}"`);

    const promptText = `You are an expert examiner. Generate a professional mock test containing exactly 5 high-quality multiple-choice questions based on the student's request:
"${prompt}"

You MUST return ONLY a valid JSON object matching the example structure below.
Do NOT include any markdown code blocks, backticks, comments, or extra text. Return only the raw JSON.

Example Valid JSON Response:
{
  "title": "Class 6 Math Practice",
  "subject": "Mathematics",
  "difficulty": "Easy",
  "durationMinutes": 15,
  "questions": [
    {
      "question": "What is the value of 5 + 3 * 2?",
      "options": [
        "16",
        "11",
        "13",
        "10"
      ],
      "correctAnswer": "B",
      "explanation": "According to BODMAS, multiplication is done first: 3 * 2 = 6, and then addition: 5 + 6 = 11.",
      "marks": 1
    }
  ]
}`;

    let parsedTest = null;

    try {
      const messages = [{ role: 'user', content: promptText }];
      const response = await generateResponse(messages);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON brackets found in AI response');
      }

      parsedTest = JSON.parse(jsonMatch[0]);
    } catch (err) {
      logger.error('Failed to generate mock test using AI, throwing error:', err);
      throw new Error(
        'Failed to generate a valid mock test structure. Please try a more specific topic.',
      );
    }

    // Validation & defaults
    if (!parsedTest.title) parsedTest.title = 'Practice Quiz';
    if (!parsedTest.subject) parsedTest.subject = 'General Study';
    if (!parsedTest.difficulty) parsedTest.difficulty = 'Medium';
    if (!parsedTest.durationMinutes) parsedTest.durationMinutes = 20;
    if (
      !parsedTest.questions ||
      !Array.isArray(parsedTest.questions) ||
      parsedTest.questions.length === 0
    ) {
      throw new Error('AI failed to generate mock test questions.');
    }

    parsedTest.totalQuestions = parsedTest.questions.length;
    parsedTest.totalMarks = parsedTest.questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    const test = await this.repository.create(userId, parsedTest);

    // Create a learning activity for test generation
    await prisma.learningActivity.create({
      data: {
        userId,
        type: 'CREATE',
        entityType: 'MOCK_TEST',
        entityId: test.id,
        title: `Generated: ${test.title}`,
      },
    });

    return test;
  }

  async getMockTests(userId, filters) {
    return this.repository.findAll(userId, filters);
  }

  async getMockTestById(userId, id) {
    const test = await this.repository.findById(id, userId);
    if (!test) {
      throw new NotFoundError('Mock test not found.');
    }
    return test;
  }

  async deleteMockTest(userId, id) {
    const existing = await this.repository.findById(id, userId);
    if (!existing) {
      throw new NotFoundError('Mock test not found.');
    }
    const test = await this.repository.delete(id, userId);

    await prisma.learningActivity.create({
      data: {
        userId,
        type: 'DELETE',
        entityType: 'MOCK_TEST',
        entityId: id,
        title: `Deleted: ${existing.title}`,
      },
    });

    return test;
  }

  async submitTestAttempt(userId, mockTestId, attemptData) {
    const test = await this.repository.findById(mockTestId, userId);
    if (!test) {
      throw new NotFoundError('Mock test not found.');
    }

    const { startedAt, answers: submittedAnswers } = attemptData;
    const questions = test.questions;

    let totalCorrect = 0;
    let totalWrong = 0;
    let skipped = 0;
    let score = 0;
    const totalMarks = test.totalMarks;

    const formattedAnswers = [];

    for (const q of questions) {
      const submitted = submittedAnswers.find((sa) => sa.questionId === q.id);
      const selectedOption = submitted?.selectedOption
        ? submitted.selectedOption.trim().toUpperCase()
        : null;

      if (!selectedOption) {
        skipped++;
        formattedAnswers.push({
          questionId: q.id,
          selectedOption: null,
          isCorrect: false,
        });
      } else {
        const isCorrect = selectedOption === q.correctOption.toUpperCase();
        if (isCorrect) {
          totalCorrect++;
          score += q.marks || 1;
        } else {
          totalWrong++;
        }
        formattedAnswers.push({
          questionId: q.id,
          selectedOption,
          isCorrect,
        });
      }
    }

    const percentage = totalMarks > 0 ? parseFloat(((score / totalMarks) * 100).toFixed(2)) : 0.0;
    const submittedAt = new Date();
    const startedTime = new Date(startedAt);
    const timeTaken = Math.max(1, Math.round((submittedAt - startedTime) / 1000)); // in seconds

    const finalAttemptData = {
      score,
      percentage,
      totalCorrect,
      totalWrong,
      skipped,
      totalMarks,
      startedAt: startedTime,
      submittedAt,
      timeTaken,
      answers: formattedAnswers,
    };

    const attempt = await this.repository.createAttempt(userId, mockTestId, finalAttemptData);

    // Create a learning activity for test attempt
    await prisma.learningActivity.create({
      data: {
        userId,
        type: 'CREATE',
        entityType: 'MOCK_TEST',
        entityId: mockTestId,
        title: `Attempted: ${test.title} (Score: ${score}/${totalMarks})`,
      },
    });

    return attempt;
  }

  async getAttemptDetails(userId, attemptId) {
    const attempt = await this.repository.findAttemptById(attemptId, userId);
    if (!attempt) {
      throw new NotFoundError('Test attempt not found.');
    }
    return attempt;
  }

  async getUserAttempts(userId) {
    return this.repository.findAttemptsByUserId(userId);
  }
}

export default new MockTestService();
