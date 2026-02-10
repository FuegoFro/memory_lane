import { GoogleGenerativeAI } from '@google/generative-ai';

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const audioBase64 = audioBuffer.toString('base64');

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'audio/webm',
        data: audioBase64,
      },
    },
    {
      text: 'Transcribe this audio. Return only the transcript text, with no timestamps, labels, or additional formatting.',
    },
  ]);

  const response = await result.response;
  return response.text().trim();
}
