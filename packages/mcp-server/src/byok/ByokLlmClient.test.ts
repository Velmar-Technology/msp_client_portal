import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ByokLlmClient, ByokKeyMissingError } from './ByokLlmClient.js';

const { GoogleGenAI } = vi.hoisted(() => ({
  GoogleGenAI: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI,
}));

const restoreEnv = (key: string, original: string | undefined) => {
  if (original === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = original;
  }
};

describe('ByokLlmClient — Google Gemini Provider', () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  const originalGoogleKey = process.env.GOOGLE_API_KEY;
  const originalDefaultKey = process.env.BYOK_DEFAULT_API_KEY;

  let mockGenerateContent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateContent = vi.fn();
    GoogleGenAI.mockReturnValue({
      models: { generateContent: mockGenerateContent },
    });
  });

  afterEach(() => {
    restoreEnv('GEMINI_API_KEY', originalGeminiKey);
    restoreEnv('GOOGLE_API_KEY', originalGoogleKey);
    restoreEnv('BYOK_DEFAULT_API_KEY', originalDefaultKey);
  });

  it('throws ByokKeyMissingError when no Gemini key is supplied or configured', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.BYOK_DEFAULT_API_KEY;

    const client = new ByokLlmClient({ provider: 'gemini' });
    await expect(
      client.generate({ prompt: 'Hello' })
    ).rejects.toThrow(ByokKeyMissingError);
  });

  it('generates content via the official SDK and maps response + usage', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Gemini reasoning output',
      usageMetadata: {
        promptTokenCount: 210,
        candidatesTokenCount: 84,
        totalTokenCount: 294,
      },
    });

    const client = new ByokLlmClient();
    const result = await client.generate({
      provider: 'gemini',
      apiKey: 'AIzaSy-gemini-test-key',
      prompt: 'Summarize this telemetry dump',
      systemPrompt: 'You are the MSP support copilot.',
      model: 'gemini-2.5-flash',
      temperature: 0.1,
      maxTokens: 512,
    });

    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'AIzaSy-gemini-test-key' });
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
      contents: 'Summarize this telemetry dump',
      config: {
        systemInstruction: 'You are the MSP support copilot.',
        temperature: 0.1,
        maxOutputTokens: 512,
        thinkingConfig: { thinkingBudget: 1024 },
        responseMimeType: 'text/plain',
      },
    });

    expect(result).toEqual({
      content: 'Gemini reasoning output',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      usage: {
        promptTokens: 210,
        completionTokens: 84,
        totalTokens: 294,
      },
    });
  });

  it('falls back to GEMINI_API_KEY environment variable', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'ok' });
    process.env.GEMINI_API_KEY = 'AIzaSy-env-gemini-key';

    const client = new ByokLlmClient({ provider: 'gemini' });
    await client.generate({ prompt: 'Hi' });

    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'AIzaSy-env-gemini-key' });
  });

  it('falls back to the default Gemini model when none is specified', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'ok' });
    const client = new ByokLlmClient({ provider: 'gemini', apiKey: 'AIzaSy-key' });
    await client.generate({ prompt: 'Hi' });

    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.model).toBe('gemini-3.8-flash');
  });

  it('returns empty content and no usage when the response is minimal', async () => {
    mockGenerateContent.mockResolvedValue({});
    const client = new ByokLlmClient({ provider: 'gemini', apiKey: 'AIzaSy-key' });
    const result = await client.generate({ prompt: 'Hi' });

    expect(result.content).toBe('');
    expect(result.usage).toBeUndefined();
  });
});