import config from '../../../config/env.config.js';
import logger from '../../../services/logger.service.js';

export async function generateResponse(messages) {
  const { apiKey, baseUrl, model } = config.openRouter;

  if (!apiKey) {
    logger.error('OpenRouter API key is not configured.');
    throw new Error('AI configuration error.');
  }

  let cleanBaseUrl = baseUrl || 'https://openrouter.ai/api/v1';
  if (!cleanBaseUrl.startsWith('http://') && !cleanBaseUrl.startsWith('https://')) {
    logger.warn(
      `Invalid OPENROUTER_BASE_URL "${baseUrl}". Falling back to default: https://openrouter.ai/api/v1`,
    );
    cleanBaseUrl = 'https://openrouter.ai/api/v1';
  }

  const candidates = [
    model,
    'google/gemini-2.5-flash:free',
    'google/gemini-2.5-flash',
    'meta-llama/llama-3.1-8b-instruct:free',
    'meta-llama/llama-3.1-8b-instruct',
  ].filter(Boolean);

  const uniqueCandidates = [...new Set(candidates)];
  let lastError = null;

  for (const candidateModel of uniqueCandidates) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      logger.warn(`Model "${candidateModel}" request timed out after 15000ms. Aborting...`);
      controller.abort();
    }, 15000);

    try {
      logger.info(`Attempting response generation using model: ${candidateModel}`);
      const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://eduos.com',
          'X-Title': 'EduOS Learning Platform',
        },
        body: JSON.stringify({
          model: candidateModel,
          messages: messages,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        clearTimeout(timeoutId);
        logger.warn(
          `OpenRouter API error with model "${candidateModel}" (status ${response.status}): ${errorText}`,
        );
        lastError = new Error(`Request failed with status ${response.status}`);
        continue;
      }

      const data = await response.json();
      clearTimeout(timeoutId);
      const resultText = data.choices?.[0]?.message?.content;

      if (resultText === undefined || resultText === null) {
        logger.warn(
          `OpenRouter returned invalid response structure for model "${candidateModel}"`,
          data,
        );
        lastError = new Error('AI response content was empty.');
        continue;
      }

      // Detect and filter out leaked safety moderation filters
      const trimmedResult = resultText.trim().toLowerCase();
      if (
        trimmedResult === 'user safety: safe' ||
        trimmedResult === 'user safety: unsafe' ||
        trimmedResult === 'safe' ||
        trimmedResult === 'unsafe'
      ) {
        logger.warn(
          `Detected safety filter leak ("${resultText}") for model "${candidateModel}". Retrying with another model...`,
        );
        lastError = new Error(`Safety filter leak: "${resultText}"`);
        continue;
      }

      logger.info(`Response generated successfully using model: ${candidateModel}`);
      return resultText;
    } catch (error) {
      clearTimeout(timeoutId);
      logger.error(`Failed to communicate with model "${candidateModel}":`, error);
      lastError = error;
    }
  }

  throw lastError || new Error('Failed to generate AI response after trying all candidate models.');
}

export default {
  generateResponse,
};
