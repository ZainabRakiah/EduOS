import BaseService from '../../../shared/services/base.service.js';
import aiRepository from '../repository/ai.repository.js';
import { generateResponse } from '../providers/openrouter.provider.js';
import prisma from '../../../config/database.config.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';
import logger from '../../../services/logger.service.js';
import mockTestService from '../../mock-test/mock-test.service.js';
import imageProvider from '../providers/image.provider.js';

class AiService extends BaseService {
  constructor(repository) {
    super(repository);
    this.repository = repository;
  }

  async getHealth() {
    return {
      success: true,
      message: 'AI module is connected successfully.',
    };
  }

  async chat(userId, prompt) {
    const intent = this.detectIntent(prompt);

    if (intent === 'MOCK_TEST') {
      const test = await mockTestService.generateMockTestFromPrompt(userId, prompt);
      return {
        success: true,
        intent: 'MOCK_TEST',
        mockTestId: test.id,
        message: 'Mock test created successfully!',
      };
    }

    if (['MAP', 'FLOWCHART', 'CHART', 'TIMELINE', 'TABLE', 'SCIENTIFIC_DIAGRAM', 'CONCEPT_DIAGRAM', 'IMAGE'].includes(intent)) {
      const visualPrompt = `Based on this request: "${prompt}"

Identify the correct visual representation format and return a structured JSON configuration in this exact format. Do NOT output SVG XML paths, raw SVG code, HTML tables, or geographical border coordinates. The frontend renderer will draw the actual graphics from your structured configuration.

Formats:

1. MAP:
Use for geographic boundaries or maps.
Format:
{
  "type": "MAP",
  "mapId": "india-states",
  "title": "States and Union Territories of India",
  "description": "Short description of what the map represents",
  "showLabels": true,
  "showBoundaries": true,
  "highlightStates": ["Bihar", "Jharkhand"],
  "explanation": "High-quality conceptual explanation of the geography/map for the student"
}

2. FLOWCHART:
Use for sequences, cycles, or flowcharts.
Format:
{
  "type": "FLOWCHART",
  "title": "Process Title",
  "nodes": [
    { "id": "1", "label": "Start Point" },
    { "id": "2", "label": "Next Step" }
  ],
  "edges": [
    ["1", "2"]
  ],
  "explanation": "Detailed explanation of the flowchart sequence"
}

3. CHART:
Use for quantitative comparisons or data.
Format:
{
  "type": "CHART",
  "chartType": "BAR", // or "LINE", "PIE"
  "title": "Chart Title",
  "xAxis": "Label for X axis",
  "yAxis": "Label for Y axis",
  "data": [
    { "label": "Category A", "value": 15 },
    { "label": "Category B", "value": 25 }
  ],
  "explanation": "Detailed explanation of what the data represents"
}

4. TIMELINE:
Use for historical sequences or chronological events.
Format:
{
  "type": "TIMELINE",
  "title": "Timeline Title",
  "events": [
    { "year": "1947", "title": "Independence", "description": "India gained independence." }
  ],
  "explanation": "Short summary explanation"
}

5. TABLE:
Use for tabular comparisons.
Format:
{
  "type": "TABLE",
  "title": "Comparison Title",
  "headers": ["Feature", "Mitosis", "Meiosis"],
  "rows": [
    ["Occurs in", "Somatic cells", "Germ cells"]
  ],
  "explanation": "Short summary of comparison"
}

6. SCIENTIFIC_DIAGRAM:
Use for factual labeled scientific diagrams (e.g. Heart, Plant Cell, Circuit).
Format:
{
  "type": "SCIENTIFIC_DIAGRAM",
  "diagramId": "human-heart", // or "plant-cell", "electric-circuit", "water-cycle"
  "title": "Predefined Labeled Human Heart",
  "highlightParts": ["Left Ventricle", "Aorta"],
  "explanation": "Factual anatomical explanation of the labeled parts"
}

7. CONCEPT_DIAGRAM:
Use for conceptual node relationships (e.g. Force = Mass x Acceleration).
Format:
{
  "type": "CONCEPT_DIAGRAM",
  "title": "Concept Relationship Title",
  "nodes": [
    { "id": "1", "label": "Force" },
    { "id": "2", "label": "Mass" },
    { "id": "3", "label": "Acceleration" }
  ],
  "edges": [
    ["1", "2"],
    ["2", "3"]
  ],
  "explanation": "Relationship explanation"
8. IMAGE:
Use for creative visuals, profile banners, YouTube thumbnails, wallpapers, posters, and educational illustrations.
Format:
{
  "type": "IMAGE",
  "prompt": "Detailed description of the visual style, theme, and text elements to render (e.g. A professional technology themed LinkedIn banner for 'Afzal Reyaz, Full Stack Developer'). Include styling, colors, and layout directives.",
  "aspectRatio": "16:9", // choose appropriate: "16:9", "1:1", "2:3", "3:2", "4:3" based on request
  "resolution": "1K", // "1K", "2K", "4K"
  "explanation": "Detailed explanation of the visual design details for the user"
}

Return ONLY the raw JSON object. Do not include markdown code block syntax (like \`\`\`json) or any other text.`;

      const messages = [
        {
          role: 'user',
          content: visualPrompt,
        },
      ];
      
      const aiResponse = await generateResponse(messages);
      const cleanJson = aiResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
      
      return {
        success: true,
        intent,
        response: cleanJson,
      };
    }

    let systemInstructions = "You are a helpful, direct, and intelligent AI assistant. Behave like ChatGPT or DeepSeek. Keep your answers concise, clear, and relevant. Tailor the length and detail of your response directly to the user's prompt (e.g., if they ask a brief or single-line question, give a brief, direct answer; if they ask for details, explain thoroughly). Do not output unnecessary headers, outlines, lists, or tables unless explicitly asked. At the very end of your response, ALWAYS append exactly three highly relevant follow-up questions/suggestions for the student in this exact format: ||Suggestions: Suggestion 1 | Suggestion 2 | Suggestion 3||. Do not include any other text after this block.";

    if (intent === 'FORMULA_BOOK') {
      systemInstructions += "\n\nCRITICAL: The user has requested a formula sheet or book. Output a beautiful, comprehensive formula sheet using Markdown tables, lists, definitions, key units, and tricks.";
    }

    const messages = [
      {
        role: 'system',
        content: systemInstructions,
      },
      {
        role: 'user',
        content: prompt,
      },
    ];
    return generateResponse(messages);
  }

  async explainResource(userId, resourceId, question) {
    const intent = this.detectIntent(question);

    if (intent === 'MOCK_TEST') {
      const test = await mockTestService.generateMockTestFromPrompt(userId, question);
      return {
        success: true,
        intent: 'MOCK_TEST',
        mockTestId: test.id,
        message: 'Mock test created successfully!',
      };
    }

    const resource = await prisma.resource.findFirst({
      where: {
        id: resourceId,
        userId: userId,
      },
    });

    if (!resource) {
      throw new NotFoundError('Resource not found.');
    }

    const stopWords = new Set([
      'the',
      'and',
      'a',
      'of',
      'to',
      'in',
      'is',
      'that',
      'it',
      'for',
      'on',
      'with',
      'as',
      'at',
      'by',
      'an',
      'be',
      'this',
      'are',
      'from',
      'what',
      'how',
      'why',
      'who',
      'where',
      'when',
      'which',
      'explain',
    ]);

    const keywords = question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));

    let matchingChunks = [];

    if (keywords.length > 0) {
      const dbChunks = await prisma.resourceChunk.findMany({
        where: {
          resourceId,
          OR: keywords.map((kw) => ({
            chunkText: {
              contains: kw,
              mode: 'insensitive',
            },
          })),
        },
        take: 20,
      });

      const scored = dbChunks.map((chunk) => {
        const text = chunk.chunkText.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          const regex = new RegExp(kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
          const matches = text.match(regex);
          if (matches) {
            score += matches.length;
          }
        }
        return { chunk, score };
      });

      scored.sort((a, b) => b.score - a.score);
      // Filter out chunks that have 0 matches to make sure we only keep relevant hits
      matchingChunks = scored
        .filter((item) => item.score > 0)
        .slice(0, 4)
        .map((item) => item.chunk);
    }

    // Fallback: If no keyword matches were found or the query was empty, load the first 4 chunks as default context
    if (matchingChunks.length === 0) {
      logger.info(`No keyword matches found. Falling back to the first 4 chunks of the document.`);
      matchingChunks = await prisma.resourceChunk.findMany({
        where: { resourceId },
        orderBy: { chunkIndex: 'asc' },
        take: 4,
      });
    }

    const chunksUsed = matchingChunks.length;
    const combinedContext = matchingChunks
      .map((c) => `[Page ${c.pageNumber}] ${c.chunkText}`)
      .join('\n\n');

    if (['MAP', 'FLOWCHART', 'CHART', 'TIMELINE', 'TABLE', 'SCIENTIFIC_DIAGRAM', 'CONCEPT_DIAGRAM', 'IMAGE'].includes(intent)) {
      const visualPrompt = `Based on this document context and concept:
Document Context:
---------------------
${combinedContext || '(No matching document context found)'}
---------------------

Topic/Question: "${question}"

Identify the correct visual representation format and return a structured JSON configuration in this exact format. Do NOT output SVG XML paths, raw SVG code, HTML tables, or geographical border coordinates. The frontend renderer will draw the actual graphics from your structured configuration.

Formats:

1. MAP:
Use for geographic boundaries or maps.
Format:
{
  "type": "MAP",
  "mapId": "india-states",
  "title": "States and Union Territories of India",
  "description": "Short description of what the map represents",
  "showLabels": true,
  "showBoundaries": true,
  "highlightStates": ["Bihar", "Jharkhand"],
  "explanation": "High-quality conceptual explanation of the geography/map for the student"
}

2. FLOWCHART:
Use for sequences, cycles, or flowcharts.
Format:
{
  "type": "FLOWCHART",
  "title": "Process Title",
  "nodes": [
    { "id": "1", "label": "Start Point" },
    { "id": "2", "label": "Next Step" }
  ],
  "edges": [
    ["1", "2"]
  ],
  "explanation": "Detailed explanation of the flowchart sequence"
}

3. CHART:
Use for quantitative comparisons or data.
Format:
{
  "type": "CHART",
  "chartType": "BAR", // or "LINE", "PIE"
  "title": "Chart Title",
  "xAxis": "Label for X axis",
  "yAxis": "Label for Y axis",
  "data": [
    { "label": "Category A", "value": 15 },
    { "label": "Category B", "value": 25 }
  ],
  "explanation": "Detailed explanation of what the data represents"
}

4. TIMELINE:
Use for historical sequences or chronological events.
Format:
{
  "type": "TIMELINE",
  "title": "Timeline Title",
  "events": [
    { "year": "1947", "title": "Independence", "description": "India gained independence." }
  ],
  "explanation": "Short summary explanation"
}

5. TABLE:
Use for tabular comparisons.
Format:
{
  "type": "TABLE",
  "title": "Comparison Title",
  "headers": ["Feature", "Mitosis", "Meiosis"],
  "rows": [
    ["Occurs in", "Somatic cells", "Germ cells"]
  ],
  "explanation": "Short summary of comparison"
}

6. SCIENTIFIC_DIAGRAM:
Use for factual labeled scientific diagrams (e.g. Heart, Plant Cell, Circuit).
Format:
{
  "type": "SCIENTIFIC_DIAGRAM",
  "diagramId": "human-heart", // or "plant-cell", "electric-circuit", "water-cycle"
  "title": "Predefined Labeled Human Heart",
  "highlightParts": ["Left Ventricle", "Aorta"],
  "explanation": "Factual anatomical explanation of the labeled parts"
}

7. CONCEPT_DIAGRAM:
Use for conceptual node relationships (e.g. Force = Mass x Acceleration).
Format:
{
  "type": "CONCEPT_DIAGRAM",
  "title": "Concept Relationship Title",
  "nodes": [
    { "id": "1", "label": "Force" },
    { "id": "2", "label": "Mass" },
    { "id": "3", "label": "Acceleration" }
  ],
  "edges": [
    ["1", "2"],
    ["2", "3"]
  ],
  "explanation": "Relationship explanation"
}

8. IMAGE:
Use for creative visuals, profile banners, YouTube thumbnails, wallpapers, posters, and educational illustrations.
Format:
{
  "type": "IMAGE",
  "prompt": "Detailed description of the visual style, theme, and text elements to render (e.g. A professional technology themed LinkedIn banner for 'Afzal Reyaz, Full Stack Developer'). Include styling, colors, and layout directives.",
  "aspectRatio": "16:9", // choose appropriate: "16:9", "1:1", "2:3", "3:2", "4:3" based on request
  "resolution": "1K", // "1K", "2K", "4K"
  "explanation": "Detailed explanation of the visual design details for the user"
}

Return ONLY the raw JSON object. Do not include markdown code block syntax (like \`\`\`json) or any other text.`;

      const messages = [
        {
          role: 'user',
          content: visualPrompt,
        },
      ];
      
      const aiResponse = await generateResponse(messages);
      const cleanJson = aiResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
      
      return {
        success: true,
        intent,
        answer: cleanJson,
        resourceId,
        chunksUsed,
      };
    }

    const messages = [
      {
        role: 'system',
        content: `You are EduOS AI.
You are helping students understand their uploaded study material.
Only answer using the provided document context.
If the answer is not available inside the uploaded document, politely respond:
'I couldn't find this information in your uploaded document.'
Never invent information.
Keep explanations simple and suitable for Class 6–12 students.
Use bullet points where appropriate.
If possible explain with simple real-life examples.
At the very end of your response, ALWAYS append exactly three highly relevant follow-up questions/suggestions for the student based on the document and their query, in this exact format: ||Suggestions: Suggestion 1 | Suggestion 2 | Suggestion 3||. Do not include any other text after this block.`,
      },
      {
        role: 'user',
        content: `Document Context:
---------------------
${combinedContext || '(No matching document context found)'}
---------------------

Question: ${question}

Answer:`,
      },
    ];

    const answer = await generateResponse(messages);

    return {
      success: true,
      answer,
      resourceId,
      chunksUsed,
    };
  }

  async extractPoints(aiContent) {
    logger.info('Extracting smart points for client review without database write');

    const promptText = `You are a helpful learning assistant.
Analyze the following text and extract the most important learning points in structured JSON format.
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

    return {
      title,
      summary,
      importantPoints,
    };
  }

  detectIntent(prompt) {
    if (!prompt) return 'EXPLAIN';
    const normalized = prompt.toLowerCase();
    
    if (this.detectMockTestIntent(prompt)) {
      return 'MOCK_TEST';
    }
    
    if (normalized.includes('formula sheet') || normalized.includes('formula book') || normalized.includes('formulas list')) {
      return 'FORMULA_BOOK';
    }

    // Creative Images Intent Detection
    const imageKeywords = [
      'linkedin banner', 'profile banner', 'poster', 'social media', 'youtube thumbnail', 
      'educational illustration', 'promotional image', 'background image', 'infographic', 
      'developer banner'
    ];
    const isImage = imageKeywords.some(kw => normalized.includes(kw));
    if (isImage) {
      return 'IMAGE';
    }

    // 1. Geography / Maps
    const mapKeywords = ['map', 'naksha', 'states of', 'bordering', 'capitals of', 'india map', 'bharat naksha', 'geography', 'political map', 'district'];
    const isMap = mapKeywords.some(kw => normalized.includes(kw));

    // 2. Charts / Graphs / Ratios
    const chartKeywords = ['bar chart', 'pie chart', 'line chart', 'area chart', 'scatter plot', 'show chart', 'data chart', 'population of', 'statistics of', 'study hours chart', 'graph of', 'bar graph', 'pie graph', 'line graph'];
    const isChart = chartKeywords.some(kw => normalized.includes(kw));

    // 3. Flowcharts / Cycles / Processes
    const flowchartKeywords = ['flow chart', 'flowchart', 'photosynthesis flowchart', 'cycle of', 'water cycle', 'nitrogen cycle', 'carbon cycle', 'process of', 'steps to', 'sequence of', 'stages of', 'lifecycle of'];
    const isFlowchart = flowchartKeywords.some(kw => normalized.includes(kw));

    // 4. Timelines
    const timelineKeywords = ['timeline', 'chronology', 'history of', 'independence movement', 'independence timeline', 'events in history'];
    const isTimeline = timelineKeywords.some(kw => normalized.includes(kw));

    // 5. Tables
    const tableKeywords = ['compare', 'difference between', 'comparison table', 'mitosis vs meiosis', 'versus', 'tabular form'];
    const isTable = tableKeywords.some(kw => normalized.includes(kw));

    // 6. Scientific Diagrams
    const scientificKeywords = ['heart', 'cell', 'kidney', 'neuron', 'plant cell', 'animal cell', 'circuit', 'eye', 'brain', 'ear', 'digestive system', 'respiratory system', 'labelled diagram', 'labeled diagram', 'solar system'];
    const isScientific = scientificKeywords.some(kw => normalized.includes(kw));

    // General visual trigger check
    const visualTriggers = [
      'diagram', 'mindmap', 'mind map', 'concept map', 'block diagram', 'schematic', 'draw ', 'drawing', 
      'illustration', 'illustrate', 'visualize', 'visual representation', 'sketch', 'photo', 'image', 'picture', 'figure', 'fig '
    ];
    const hasVisualTrigger = visualTriggers.some(kw => normalized.includes(kw));
    
    const hinglishVerbs = ['banao', 'dikhao', 'dikhaye', 'show', 'create', 'make', 'generate', 'draw'];
    const educationalNouns = [
      'heart', 'cell', 'kidney', 'neuron', 'plant', 'flower', 'circuit', 'cycle',
      'photosynthesis', 'digestive', 'respiratory', 'brain', 'eye', 'ear', 'carbon',
      'nitrogen', 'water', 'force', 'atom', 'map', 'india', 'state', 'river'
    ];
    const hasVerb = hinglishVerbs.some(verb => normalized.includes(verb));
    const hasNoun = educationalNouns.some(noun => normalized.includes(noun));

    if (isMap || isChart || isFlowchart || isTimeline || isTable || isScientific || hasVisualTrigger || (hasVerb && hasNoun)) {
      if (isMap) return 'MAP';
      if (isChart) return 'CHART';
      if (isFlowchart) return 'FLOWCHART';
      if (isTimeline) return 'TIMELINE';
      if (isTable) return 'TABLE';
      if (isScientific) return 'SCIENTIFIC_DIAGRAM';
      
      // Fallback defaults
      if (normalized.includes('flow') || normalized.includes('step')) return 'FLOWCHART';
      return 'CONCEPT_DIAGRAM';
    }
    
    return 'EXPLAIN';
  }

  detectMockTestIntent(prompt) {
    if (!prompt) return false;
    const normalized = prompt.toLowerCase();

    if (
      normalized.includes('mock test') ||
      normalized.includes('practice test') ||
      normalized.includes('interview test') ||
      normalized.includes('generate a test') ||
      normalized.includes('create a test') ||
      normalized.includes('practice quiz') ||
      /generate.*quiz/i.test(normalized) ||
      /create.*quiz/i.test(normalized) ||
      /generate.*test/i.test(normalized) ||
      /create.*test/i.test(normalized)
    ) {
      return true;
    }

    if (/\b(quiz|test)\b/i.test(normalized)) {
      if (
        /\b(class\s+\d+|grade\s+\d+|chapter\s+\d+|js|javascript|react|html|css|python|java|physics|chemistry|biology|math|mathematics|science|history|geography)\b/i.test(
          normalized,
        )
      ) {
        return true;
      }
    }

    return false;
  }

  async generateImage(userId, { prompt, aspectRatio }) {
    const enhancedPrompt = `${prompt || ''}, professional clean graphics, premium design, solid background details, do not include text, no letters, no words, no logos, no typography, blank layout space for text`;
    const result = await imageProvider.generateImage({ prompt: enhancedPrompt, aspectRatio });
    return {
      success: true,
      type: 'IMAGE',
      title: 'Regenerated Image',
      prompt: prompt,
      aspectRatio: aspectRatio,
      imageUrl: result.imageUrl,
      explanation: 'Creative visual background regenerated based on customized prompt.'
    };
  }
}

export default new AiService(aiRepository);
