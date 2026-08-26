import { generateResponse } from './modules/ai/providers/openrouter.provider.js';

const aiContent = `India celebrates Independence Day on August 15 each year, marking the end of British colonial rule in 1947. The day begins with the Prime Minister hoisting the national flag at the Red Fort in Delhi and delivering a speech to the nation. Across the country, flag-raising ceremonies, patriotic songs, and cultural programs are held in schools, offices, and public spaces. Citizens honor the sacrifices of freedom fighters by observing moments of silence and displaying the tricolor. The occasion reinforces unity, pride, and a renewed commitment to India's democratic values.`;

async function test() {
  const promptText = `You are a helpful learning assistant.
Analyze the following text and extract the most important learning points in structured JSON format.
The JSON must have the following keys:
- title: A short title for the concept (max 6 words).
- summary: A one-sentence summary of the concept.
- importantPoints: An array of 3 to 6 key bullet points. Ensure you capture key facts, important dates, formulas, or numbers mentioned in the text. Do not prefix the bullet points with characters like "•" or "-".

Input Text:
"""
${aiContent}
"""

Return ONLY the raw JSON output. Do not include markdown code block syntax (like \`\`\`json) or any other explanation.`;

  console.log('Sending request...');
  const res = await generateResponse([{ role: 'user', content: promptText }]);
  console.log('Raw AI Response:\n', res);

  const jsonMatch = res.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Parsed JSON successfully:\n', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.error('JSON parsing failed:', e.message);
    }
  } else {
    console.error('No JSON matched!');
  }
}

test().catch(console.error);
