import config from '../../../config/env.config.js';
import logger from '../../../services/logger.service.js';

class ImageService {
  async generateImage({ prompt, aspectRatio = '16:9', resolution = '1K' }) {
    const apiKey = config.openRouter.apiKey;
    const baseUrl = config.openRouter.baseUrl || 'https://openrouter.ai/api/v1';
    const model = config.openRouter.imageModel || 'stabilityai/stable-diffusion-xl';

    if (!apiKey) {
      logger.error('OpenRouter API key is not configured for image generation.');
      throw new Error('AI configuration error: API key missing.');
    }

    logger.info(`OpenRouter Image Gen - model: ${model}, aspect_ratio: ${aspectRatio}, resolution: ${resolution}`);

    // Standardize URL to OpenRouter's images endpoint
    let imagesUrl = baseUrl;
    if (imagesUrl.endsWith('/chat/completions')) {
      imagesUrl = imagesUrl.replace(/\/chat\/completions$/, '/images');
    } else if (!imagesUrl.endsWith('/images')) {
      imagesUrl = `${imagesUrl.replace(/\/$/, '')}/images`;
    }

    try {
      const response = await fetch(imagesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://eduos.com',
          'X-Title': 'EduOS Learning Platform',
        },
        body: JSON.stringify({
          model,
          prompt,
          aspect_ratio: aspectRatio,
          resolution,
          response_format: 'b64_json',
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 402) {
          logger.error(`OpenRouter Image API failed due to Insufficient Credits (402). Add credits at https://openrouter.ai/settings/credits: ${errText}`);
        } else {
          logger.error(`OpenRouter Image API failed with status ${response.status}: ${errText}`);
        }
        throw new Error(`OpenRouter Image generation failed: ${errText}`);
      }

      const resData = await response.json();
      const firstChoice = resData.data?.[0];

      if (!firstChoice) {
        logger.error('OpenRouter returned invalid empty data schema.', resData);
        throw new Error('AI returned no image output.');
      }

      let base64Image = '';
      if (firstChoice.b64_json) {
        base64Image = firstChoice.b64_json.startsWith('data:') 
          ? firstChoice.b64_json 
          : `data:image/png;base64,${firstChoice.b64_json}`;
      } else if (firstChoice.url) {
        logger.info(`Fetching remote temporary image URL from OpenRouter: ${firstChoice.url}`);
        const imageRes = await fetch(firstChoice.url);
        if (!imageRes.ok) {
          throw new Error('Failed to fetch generated image from returned URL.');
        }
        const buffer = await imageRes.arrayBuffer();
        const base64Str = Buffer.from(buffer).toString('base64');
        base64Image = `data:image/png;base64,${base64Str}`;
      } else {
        throw new Error('Response format is unsupported or missing image reference.');
      }

      return {
        success: true,
        data: {
          image: base64Image,
          mimeType: 'image/png',
        },
      };

    } catch (error) {
      logger.error('Error in ImageService.generateImage:', error);
      throw error;
    }
  }
}

export default new ImageService();
