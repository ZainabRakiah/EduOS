import { generateResponse } from './modules/ai/providers/openrouter.provider.js';

const aiContent = `Here is information about Afzal Reyaz:
- **Profession:** Full Stack Developer
- **Experience:** 3+ years of experience in building production-ready SaaS, CRM, and AI-powered business applications
- **Skills:** Front-end (JavaScript, React.js, Redux Toolkit, Tailwind CSS, Material UI) + Back-end (Node.js, Express.js, REST APIs, JWT Authentication) + Database (MongoDB, PostgreSQL) + Cloud & DevOps (AWS EC2, S3, CloudFront, Git, GitHub, CI/CD) + AI & GenAI (RAG, LLM Tool Calling, Embeddings, Vector Search)
- **Current Project:** Developing EasyGlassBill, a cloud-based business management platform with an AI assistant
- **Education:** B-Tech degree from Madhyanchal Professional University, Bhopal, and Senior Secondary School Certificate from Urdu College, Gopalganj
- **Why it matters:** He combines coding with modern tech like AI to solve real-world business problems. Think of him as a tech wizard who builds tools to help companies work smarter!`;

async function test() {
  const promptText = `You are a helpful learning assistant.
Analyze the following text and extract the most important learning points in structured JSON format.
The JSON must have the following keys:
- title: A short title for the concept (max 6 words).
- summary: A one-sentence summary of the concept.
- importantPoints: An array of 3 to 6 key bullet points. Do not prefix the bullet points with characters like "•" or "-".

Input Text:
"""
${aiContent}
"""

Return ONLY the raw JSON output. Do not include markdown code block syntax (like \`\`\`json) or any other explanation.`;

  console.log('Sending request to OpenRouter...');
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
    console.error('No JSON match found in response!');
  }
}

test().catch(console.error);
