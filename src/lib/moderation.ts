import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient();

export interface ModerationResult {
  status: 'approved' | 'rejected' | 'pending_review';
  reason?: string;
}

export async function moderateImage(base64Image: string): Promise<ModerationResult> {
  try {
    // Strip data URL prefix if present
    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(imageData, 'base64');

    // Run face detection + SafeSearch in parallel
    const [faceResult, safeSearchResult] = await Promise.all([
      client.faceDetection({ image: { content: imageBuffer } }),
      client.safeSearchDetection({ image: { content: imageBuffer } }),
    ]);

    const faces = faceResult[0].faceAnnotations || [];
    const safeSearch = safeSearchResult[0].safeSearchAnnotation;

    // 1. Must have at least one face
    if (faces.length === 0) {
      return {
        status: 'rejected',
        reason: 'no_face',
      };
    }

    // 2. Check SafeSearch categories
    if (safeSearch) {
      const { adult, violence, racy, medical } = safeSearch;

      // VERY_LIKELY or LIKELY = auto reject
      const highRisk = ['VERY_LIKELY', 'LIKELY'];
      if (highRisk.includes(adult as string)) {
        return { status: 'rejected', reason: 'adult_content' };
      }
      if (highRisk.includes(violence as string)) {
        return { status: 'rejected', reason: 'violence' };
      }

      // POSSIBLE = flag for review
      const mediumRisk = ['POSSIBLE'];
      if (mediumRisk.includes(adult as string) || mediumRisk.includes(racy as string)) {
        return { status: 'pending_review', reason: 'suspicious_content' };
      }
      if (mediumRisk.includes(violence as string) || mediumRisk.includes(medical as string)) {
        return { status: 'pending_review', reason: 'suspicious_content' };
      }

      // LIKELY racy = flag for review
      if (highRisk.includes(racy as string)) {
        return { status: 'pending_review', reason: 'racy_content' };
      }
    }

    // 3. Check face confidence - very low confidence might mean a photo of a photo
    const avgConfidence = faces.reduce((sum, f) => sum + (f.detectionConfidence || 0), 0) / faces.length;
    if (avgConfidence < 0.5) {
      return { status: 'pending_review', reason: 'low_face_confidence' };
    }

    return { status: 'approved' };
  } catch (error) {
    console.error('Moderation error:', error);
    // On error, approve but flag for review so we don't block the user
    return { status: 'pending_review', reason: 'moderation_error' };
  }
}
