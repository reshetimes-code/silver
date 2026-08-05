import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ModerationResult {
  status: 'approved' | 'rejected' | 'pending_review';
  reason?: string;
}

export async function moderateImage(base64Image: string): Promise<ModerationResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn('GOOGLE_API_KEY not set — skipping moderation');
    return { status: 'pending_review', reason: 'moderation_error' };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageData,
            },
          },
          {
            text: `Analyze this photo booth image and respond with ONLY a JSON object (no markdown, no explanation):
{
  "hasFace": true/false,
  "isAdult": true/false,
  "isViolent": true/false,
  "isRacy": true/false
}

Rules:
- hasFace: true if there is at least one clearly visible human face
- isAdult: true only if there is explicit nudity or sexual content
- isViolent: true only if there is graphic violence or weapons
- isRacy: true if content is suggestive but not fully explicit`,
          },
        ],
      }],
    });

    const text = result.response.text().trim();
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Gemini returned unexpected format:', text);
      return { status: 'pending_review', reason: 'moderation_error' };
    }

    const analysis = JSON.parse(jsonMatch[0]);

    if (!analysis.hasFace) {
      return { status: 'rejected', reason: 'no_face' };
    }
    if (analysis.isAdult) {
      return { status: 'rejected', reason: 'adult_content' };
    }
    if (analysis.isViolent) {
      return { status: 'rejected', reason: 'violence' };
    }
    if (analysis.isRacy) {
      return { status: 'pending_review', reason: 'racy_content' };
    }

    return { status: 'approved' };
  } catch (error) {
    console.error('Moderation error:', error);
    return { status: 'pending_review', reason: 'moderation_error' };
  }
}
