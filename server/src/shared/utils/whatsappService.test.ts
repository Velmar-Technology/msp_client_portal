import { vi, describe, it, expect, beforeEach } from 'vitest';
import { logger } from './logger';

// Mock the logger
vi.mock('./logger', () => {
  return {
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    },
  };
});

import { sendWhatsApp, sendTicketStatusWhatsApp } from './whatsappService';

describe('whatsappService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call logger.info with payload in sendWhatsApp stub', async () => {
    const payload = {
      to: '+1234567890',
      subject: 'Test Subject',
      body: 'Hello, this is a test whatsapp message body.',
      ticketId: 't-100',
      type: 'WHATSAPP' as const,
    };

    await sendWhatsApp(payload);

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      '[STUB] WhatsApp message queued',
      expect.objectContaining({
        to: payload.to,
        subject: payload.subject,
        ticketId: payload.ticketId,
      })
    );
  });

  it('should format message with ticket status and notes in sendTicketStatusWhatsApp', async () => {
    await sendTicketStatusWhatsApp('+1234567890', 't-100', 'IN_PROGRESS', 'Your device is ready.');

    expect(logger.info).toHaveBeenCalledTimes(1);
    const logArgs = (logger.info as any).mock.calls[0][1];
    
    expect(logArgs.to).toBe('+1234567890');
    expect(logArgs.ticketId).toBe('t-100');
    expect(logArgs.body).toContain('Velmar Technology SRL');
    expect(logArgs.body).toContain('IN_PROGRESS');
    expect(logArgs.body).toContain('Notes: Your dev'); // Handles the 100-character truncation
  });

  it('should format message without notes when notes is empty in sendTicketStatusWhatsApp', async () => {
    await sendTicketStatusWhatsApp('+1234567890', 't-100', 'CLOSED');

    expect(logger.info).toHaveBeenCalledTimes(1);
    const logArgs = (logger.info as any).mock.calls[0][1];
    
    expect(logArgs.to).toBe('+1234567890');
    expect(logArgs.ticketId).toBe('t-100');
    expect(logArgs.body).toContain('CLOSED');
    expect(logArgs.body).not.toContain('Notes:');
  });
});
