import logger from '../../../services/logger.service.js';

export function getDimensionsFromAspectRatio(aspectRatio) {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1024, height: 576 }; // YouTube Thumbnail / LinkedIn Banner
    case '3:2':
      return { width: 900, height: 600 };
    case '2:3':
      return { width: 600, height: 900 }; // Portrait Poster
    case '3:4':
      return { width: 600, height: 800 };
    case '4:3':
      return { width: 800, height: 600 };
    case '9:16':
      return { width: 576, height: 1024 };
    case '1:1':
    default:
      return { width: 800, height: 800 }; // Square
  }
}

/**
 * Generate a creative image based on prompt and aspect ratio settings.
 * Abstracted so the provider backend can be swapped out easily.
 */
export async function generateImage({ prompt, aspectRatio = '1:1' }) {
  logger.info(`Requesting creative image generation for prompt: "${prompt}", AspectRatio: "${aspectRatio}"`);
  
  const { width, height } = getDimensionsFromAspectRatio(aspectRatio);

  // Pollinations AI is used as a reliable, free, and keyless provider
  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 10000000);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}`;

  return {
    success: true,
    imageUrl,
    prompt,
    aspectRatio,
    width,
    height
  };
}

export default {
  generateImage,
  getDimensionsFromAspectRatio
};
