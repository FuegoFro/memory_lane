import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockText = vi.fn();
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn();

// Mock @google/generative-ai before importing the module under test
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function () {
    return {
      getGenerativeModel: mockGetGenerativeModel,
    };
  }),
}));

import { transcribeAudio } from '../index';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MockGoogleGenerativeAI = vi.mocked(GoogleGenerativeAI);

describe('transcribeAudio', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };

    // Reset mock implementations
    mockText.mockReturnValue('  This is the transcript.  ');
    mockGenerateContent.mockResolvedValue({
      response: { text: mockText },
    });
    mockGetGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;

    const audioBuffer = Buffer.from('fake audio data');

    await expect(transcribeAudio(audioBuffer)).rejects.toThrow(
      'GEMINI_API_KEY not configured'
    );
  });

  it('returns transcript from Gemini', async () => {
    process.env.GEMINI_API_KEY = 'test-api-key';

    const audioBuffer = Buffer.from('fake audio data');
    const result = await transcribeAudio(audioBuffer);

    expect(result).toBe('This is the transcript.');

    // Verify GoogleGenerativeAI was constructed with the API key
    expect(MockGoogleGenerativeAI).toHaveBeenCalledWith('test-api-key');

    // Verify the correct model was requested
    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
    });

    // Verify generateContent was called with audio data and prompt
    expect(mockGenerateContent).toHaveBeenCalledWith([
      {
        inlineData: {
          mimeType: 'audio/webm',
          data: audioBuffer.toString('base64'),
        },
      },
      {
        text: 'Transcribe this audio. Return only the transcript text, with no timestamps, labels, or additional formatting.',
      },
    ]);
  });
});
