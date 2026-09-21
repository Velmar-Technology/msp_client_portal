import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

/**
 * Supported LLM Providers for Bring Your Own Key architecture.
 */
export type ByokProvider = 'openai' | 'anthropic' | 'custom' | 'gemini';

/**
 * Options for instantiating or executing a LLM request.
 */
export interface ByokLlmConfig {
  provider?: ByokProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Options passed to each LLM generation call.
 */
export interface ByokGenerateOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  provider?: ByokProvider;
  baseUrl?: string;
}

/**
 * Standardized response envelope returned by ByokLlmClient.
 */
export interface ByokLlmResponse {
  content: string;
  provider: ByokProvider;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Domain error thrown when a user or tenant invokes an AI workflow without providing a API key.
 * Guarantees zero token liability for Velmar Technology / provider.
 */
export class ByokKeyMissingError extends Error {
  public readonly code = 'BYOK_KEY_MISSING';
  public readonly statusCode = 401;

  constructor(provider: ByokProvider = 'openai') {
    super(
      `[Zero-Liability Error]: No API key provided for LLM provider "${provider}". ` +
        `Under the BYOK policy, institutions must supply their own API key via request parameters, ` +
        `the "X-BYOK-Api-Key" header, or the "BYOK_DEFAULT_API_KEY" environment variable.`
    );
    this.name = 'ByokKeyMissingError';
  }
}

/**
 * Bring Your Own Key LLM Client.
 *
 * Connects directly to customer-funded external LLM accounts (OpenAI, Anthropic, DeepSeek/Custom).
 * Enforces zero token cost liability for the MSP infrastructure provider.
 */
export class ByokLlmClient {
  private readonly defaultProvider: ByokProvider;
  private readonly defaultApiKey?: string;
  private readonly defaultBaseUrl?: string;
  private readonly defaultModel?: string;

  constructor(config: ByokLlmConfig = {}) {
    this.defaultProvider = config.provider || 'openai';
    this.defaultApiKey =
      config.apiKey ||
      process.env.BYOK_DEFAULT_API_KEY ||
      (this.defaultProvider === 'openai'
        ? process.env.OPENAI_API_KEY
        : this.defaultProvider === 'gemini'
          ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
          : process.env.ANTHROPIC_API_KEY);
    this.defaultBaseUrl = config.baseUrl;
    this.defaultModel = config.model;
  }

  /**
   * Resolves the effective API key for a request.
   */
  private resolveApiKey(overrideKey?: string, provider: ByokProvider = this.defaultProvider): string {
    const key =
      overrideKey ||
      this.defaultApiKey ||
      (provider === 'openai'
        ? process.env.OPENAI_API_KEY
        : provider === 'gemini'
          ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
          : process.env.ANTHROPIC_API_KEY);

    if (!key || key.trim().length === 0) {
      throw new ByokKeyMissingError(provider);
    }
    return key.trim();
  }

  /**
   * Sends a completion request to the selected LLM provider using the caller's credentials.
   *
   * @param options - Prompt, system instructions, and provider overrides
   * @returns Standardized LLM response with token usage metadata
   */
  async generate(options: ByokGenerateOptions): Promise<ByokLlmResponse> {
    const provider = options.provider || this.defaultProvider;
    const apiKey = this.resolveApiKey(options.apiKey, provider);
    const temperature = options.temperature ?? 0.2;
    const maxTokens = options.maxTokens ?? 2048;

    if (provider === 'gemini') {
      return this.callGemini(apiKey, options, temperature, maxTokens);
    }

    if (provider === 'anthropic') {
      return this.callAnthropic(apiKey, options, temperature, maxTokens);
    }

    // Default to OpenAI / OpenAI-compatible endpoint (DeepSeek, OpenRouter, Local LLM)
    return this.callOpenAiCompatible(apiKey, options, temperature, maxTokens);
  }

  /**
   * Calls OpenAI or an OpenAI-compatible endpoint (e.g. DeepSeek, OpenRouter, vLLM).
   */
  private async callOpenAiCompatible(
    apiKey: string,
    options: ByokGenerateOptions,
    temperature: number,
    maxTokens: number
  ): Promise<ByokLlmResponse> {
    const baseUrl =
      options.baseUrl ||
      this.defaultBaseUrl ||
      process.env.OPENAI_BASE_URL ||
      'https://api.openai.com/v1';

    const model =
      options.model ||
      this.defaultModel ||
      process.env.BYOK_DEFAULT_MODEL ||
      'gpt-4o-mini';

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: options.prompt });

    const response = await axios.post(
      `${baseUrl.replace(/\/+$/, '')}/chat/completions`,
      {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 60000,
      }
    );

    const choice = response.data?.choices?.[0];
    const content = choice?.message?.content ?? '';

    return {
      content,
      provider: 'openai',
      model: response.data?.model || model,
      usage: response.data?.usage
        ? {
            promptTokens: response.data.usage.prompt_tokens,
            completionTokens: response.data.usage.completion_tokens,
            totalTokens: response.data.usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * Calls the Anthropic Messages API.
   */
  private async callAnthropic(
    apiKey: string,
    options: ByokGenerateOptions,
    temperature: number,
    maxTokens: number
  ): Promise<ByokLlmResponse> {
    const baseUrl =
      options.baseUrl ||
      this.defaultBaseUrl ||
      process.env.ANTHROPIC_BASE_URL ||
      'https://api.anthropic.com/v1';

    const model =
      options.model ||
      this.defaultModel ||
      process.env.BYOK_ANTHROPIC_MODEL ||
      'claude-3-5-sonnet-20241022';

    const payload: any = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: options.prompt }],
    };

    if (options.systemPrompt) {
      payload.system = options.systemPrompt;
    }

    const response = await axios.post(
      `${baseUrl.replace(/\/+$/, '')}/messages`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        timeout: 60000,
      }
    );

    const textBlocks = (response.data?.content || [])
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    return {
      content: textBlocks,
      provider: 'anthropic',
      model: response.data?.model || model,
      usage: response.data?.usage
        ? {
            promptTokens: response.data.usage.input_tokens,
            completionTokens: response.data.usage.output_tokens,
            totalTokens:
              (response.data.usage.input_tokens || 0) + (response.data.usage.output_tokens || 0),
          }
        : undefined,
    };
  }

  /**
   * Calls the Google Gemini generateContent API via the official @google/genai SDK.
   *
   * Enables thinking (reasoning) via `thinkingConfig` and honors the system instruction.
   *
   * @param apiKey - Resolved tenant API key
   * @param options - Prompt, system instructions, and provider overrides
   * @param temperature - Sampling temperature
   * @param maxTokens - Maximum output tokens
   * @returns Standardized LLM response with token usage metadata
   */
  private async callGemini(
    apiKey: string,
    options: ByokGenerateOptions,
    temperature: number,
    maxTokens: number
  ): Promise<ByokLlmResponse> {
    const model =
      options.model ||
      this.defaultModel ||
      process.env.BYOK_DEFAULT_MODEL ||
      process.env.GEMINI_MODEL ||
      'gemini-3.8-flash';

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model,
      contents: options.prompt,
      config: {
        systemInstruction: options.systemPrompt,
        temperature,
        maxOutputTokens: maxTokens,
        thinkingConfig: { thinkingBudget: 1024 },
        responseMimeType: 'text/plain',
      },
    });

    const usage = response.usageMetadata;
    return {
      content: response.text || '',
      provider: 'gemini',
      model,
      usage: usage
        ? {
            promptTokens: usage.promptTokenCount ?? 0,
            completionTokens: usage.candidatesTokenCount ?? 0,
            totalTokens: usage.totalTokenCount ?? 0,
          }
        : undefined,
    };
  }
}
