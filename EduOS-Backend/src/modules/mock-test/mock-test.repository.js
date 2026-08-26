import BaseRepository from '../../shared/repositories/base.repository.js';
import prisma from '../../config/database.config.js';

class MockTestRepository extends BaseRepository {
  constructor() {
    super('mockTest', prisma);
    this.prisma = prisma;
  }

  async create(userId, testData) {
    const {
      title,
      subject,
      description,
      difficulty,
      durationMinutes,
      totalQuestions,
      totalMarks,
      questions,
    } = testData;

    return this.prisma.mockTest.create({
      data: {
        userId,
        title,
        subject,
        description,
        difficulty,
        durationMinutes,
        totalQuestions,
        totalMarks,
        questions: {
          create: questions.map((q) => ({
            question: q.question,
            optionA: q.options[0] || '',
            optionB: q.options[1] || '',
            optionC: q.options[2] || '',
            optionD: q.options[3] || '',
            correctOption: q.correctAnswer,
            explanation: q.explanation,
            marks: q.marks || 1,
          })),
        },
      },
      include: {
        questions: true,
      },
    });
  }

  async findById(id, userId) {
    return this.prisma.mockTest.findFirst({
      where: { id, userId },
      include: {
        questions: {
          orderBy: { id: 'asc' },
        },
        attempts: {
          orderBy: { submittedAt: 'desc' },
        },
      },
    });
  }

  async findAll(userId, filters = {}) {
    const { search, subject } = filters;
    const where = { userId };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (subject) {
      where.subject = { contains: subject, mode: 'insensitive' };
    }

    return this.prisma.mockTest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        questions: {
          select: { id: true },
        },
        attempts: {
          select: { id: true, score: true, percentage: true },
        },
      },
    });
  }

  async delete(id, userId) {
    return this.prisma.mockTest.delete({
      where: { id, userId },
    });
  }

  async createAttempt(userId, mockTestId, attemptData) {
    const {
      score,
      percentage,
      totalCorrect,
      totalWrong,
      skipped,
      totalMarks,
      startedAt,
      submittedAt,
      timeTaken,
      answers,
    } = attemptData;

    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.mockAttempt.create({
        data: {
          mockTestId,
          userId,
          score,
          percentage,
          totalCorrect,
          totalWrong,
          skipped,
          totalMarks,
          startedAt: new Date(startedAt),
          submittedAt: new Date(submittedAt),
          timeTaken,
        },
      });

      if (answers && answers.length > 0) {
        await tx.mockAnswer.createMany({
          data: answers.map((ans) => ({
            attemptId: attempt.id,
            questionId: ans.questionId,
            selectedOption: ans.selectedOption || null,
            isCorrect: ans.isCorrect,
          })),
        });
      }

      return tx.mockAttempt.findUnique({
        where: { id: attempt.id },
        include: {
          answers: true,
          mockTest: {
            include: {
              questions: {
                orderBy: { id: 'asc' },
              },
            },
          },
        },
      });
    });
  }

  async findAttemptById(id, userId) {
    return this.prisma.mockAttempt.findFirst({
      where: { id, userId },
      include: {
        mockTest: {
          include: {
            questions: {
              orderBy: { id: 'asc' },
            },
          },
        },
        answers: true,
      },
    });
  }

  async findAttemptsByTestId(mockTestId, userId) {
    return this.prisma.mockAttempt.findMany({
      where: {
        mockTestId,
        userId,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findAttemptsByUserId(userId) {
    return this.prisma.mockAttempt.findMany({
      where: { userId },
      include: {
        mockTest: {
          select: {
            title: true,
            subject: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }
}

export default new MockTestRepository();
