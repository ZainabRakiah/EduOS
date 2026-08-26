import prisma from './config/database.config.js';
import notesRepository from './modules/notes/notes.repository.js';

async function test() {
  const users = await prisma.user.findMany({ take: 1 });
  if (users.length === 0) {
    console.error('No users found in database!');
    return;
  }
  const userId = users[0].id;
  console.log('Testing with User ID:', userId);

  const noteData = {
    title: 'Manual Test Note',
    summary: 'A summary for manual test',
    importantPoints: ['Point A', 'Point B (Custom manual)'],
    content: 'Point A\n\nPoint B (Custom manual)',
    sourceDocument: 'General Chat',
  };

  console.log('Saving note...');
  const created = await notesRepository.create(userId, noteData);
  console.log('Saved note details:', created);

  console.log('Querying notes list...');
  const result = await notesRepository.findAll(userId);
  console.log('Query output count:', result.data.length);
  const found = result.data.find((n) => n.id === created.id);
  if (found) {
    console.log('Found saved note in query list! Points:', found.importantPoints);
  } else {
    console.error('Saved note was NOT found in query list!');
  }

  // Cleanup
  await prisma.note.delete({ where: { id: created.id } });
  console.log('Cleanup completed.');
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
