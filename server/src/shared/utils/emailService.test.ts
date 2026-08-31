import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock nodemailer module
const { mockSendMail, mockVerify } = vi.hoisted(() => ({
  mockSendMail: vi.fn().mockResolvedValue({ messageId: 'mocked-email-id' }),
  mockVerify: vi.fn().mockResolvedValue(true),
}));

vi.mock('nodemailer', () => {
  return {
    default: {
      createTransport: vi.fn().mockImplementation(() => {
        return {
          sendMail: mockSendMail,
          verify: mockVerify,
        };
      }),
    },
  };
});

// Import the email service after the mock has been configured
import {
  isSMTPConfigured,
  sendEmail,
  sendTicketCreatedEmail,
  sendTicketStatusChangedEmail,
  sendTicketAssignedEmail,
  sendTicketStatusEmail,
  sendTicketResponseEmail,
  sendOTPEmail,
} from './emailService';
import { Ticket } from '@shared/types';

describe('emailService', () => {
  const mockTicket: Ticket = {
    id: 't-12345678-abcd-ef01-2345-6789abcdef01',
    tenant_id: 'tenant-123',
    title: 'Test Ticket Title',
    description: 'This is a test description for the ticket.',
    category: 'REPAIR',
    priority: 'HIGH',
    status: 'OPEN',
    client_id: 'client-123',
    assigned_tech_id: 'tech-123',
    created_at: new Date(),
    updated_at: new Date(),
    client_name: 'John Client',
    client_email: 'john.client@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully send a generic email via sendEmail', async () => {
    await sendEmail({
      to: 'recipient@example.com',
      subject: 'Test Subject',
      body: '<p>Test Body</p>',
      ticketId: 't-123',
      type: 'EMAIL',
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test Body</p>',
      })
    );
  });

  it('should send ticket creation email with correct parameters', async () => {
    await sendTicketCreatedEmail('client@example.com', 'Client Name', mockTicket);

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const callArgs = mockSendMail.mock.calls[0][0] as any;
    expect(callArgs.to).toBe('client@example.com');
    expect(callArgs.subject).toContain('Ticket Opened');
    expect(callArgs.subject).toContain(mockTicket.title);
    expect(callArgs.html).toContain('Client Name');
    expect(callArgs.html).toContain(mockTicket.id);
    expect(callArgs.html).toContain('REPAIR');
    expect(callArgs.html).toContain('High');
  });

  it('should send ticket status changed email with correct parameters', async () => {
    const updatedTicket: Ticket = {
      ...mockTicket,
      status: 'IN_PROGRESS',
    };

    await sendTicketStatusChangedEmail(
      'client@example.com',
      'Client Name',
      updatedTicket,
      'We are looking into this issue.'
    );

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const callArgs = mockSendMail.mock.calls[0][0] as any;
    expect(callArgs.to).toBe('client@example.com');
    expect(callArgs.subject).toContain('Ticket Status Update');
    expect(callArgs.subject).toContain('In Progress');
    expect(callArgs.html).toContain('Client Name');
    expect(callArgs.html).toContain('We are looking into this issue.');
  });

  it('should send ticket assigned email to technician with correct parameters', async () => {
    await sendTicketAssignedEmail('tech@example.com', 'Tech Name', mockTicket);

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const callArgs = mockSendMail.mock.calls[0][0] as any;
    expect(callArgs.to).toBe('tech@example.com');
    expect(callArgs.subject).toContain('[New Assignment]');
    expect(callArgs.subject).toContain(mockTicket.title);
    expect(callArgs.html).toContain('Tech Name');
    expect(callArgs.html).toContain('John Client');
    expect(callArgs.html).toContain('john.client@example.com');
  });

  it('should send ticket status email (legacy fallback) with correct parameters', async () => {
    await sendTicketStatusEmail('client@example.com', 't-123', 'RESOLVED', 'Issue fixed.');

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const callArgs = mockSendMail.mock.calls[0][0] as any;
    expect(callArgs.to).toBe('client@example.com');
    expect(callArgs.subject).toContain('Ticket Update');
    expect(callArgs.html).toContain('RESOLVED');
    expect(callArgs.html).toContain('Issue fixed.');
  });

  it('should send ticket response email with correct parameters', async () => {
    await sendTicketResponseEmail(
      'recipient@example.com',
      'Recipient Name',
      'Sender Name',
      mockTicket,
      'This is a new response comment.'
    );

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const callArgs = mockSendMail.mock.calls[0][0] as any;
    expect(callArgs.to).toBe('recipient@example.com');
    expect(callArgs.subject).toContain('[New Reply]');
    expect(callArgs.html).toContain('Recipient Name');
    expect(callArgs.html).toContain('Sender Name');
    expect(callArgs.html).toContain('This is a new response comment.');
  });

  it('should send OTP verification email with correct parameters', async () => {
    await sendOTPEmail('user@example.com', 'User Name', '654321');

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const callArgs = mockSendMail.mock.calls[0][0] as any;
    expect(callArgs.to).toBe('user@example.com');
    expect(callArgs.subject).toContain('Your Verification Code');
    expect(callArgs.subject).toContain('654321');
    expect(callArgs.html).toContain('User Name');
    expect(callArgs.html).toContain('654321');
  });

  it('should adapt email template to Spanish (es_DO) when recipient language is Spanish', async () => {
    await sendTicketCreatedEmail('cliente@example.com', 'Carlos Gómez', mockTicket, 'es_DO');

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const callArgs = mockSendMail.mock.calls[0][0] as any;
    expect(callArgs.to).toBe('cliente@example.com');
    expect(callArgs.subject).toContain('Ticket Abierto:');
    expect(callArgs.html).toContain('Hola Carlos Gómez');
    expect(callArgs.html).toContain('Ticket Abierto Exitosamente');
    expect(callArgs.html).toContain('Seguir Ticket en el Portal');
    expect(callArgs.html).toContain('Detalles del Ticket');
    expect(callArgs.html).toContain('ID del Ticket:');
    expect(callArgs.html).toContain('Descripción del Problema:');
  });

  it('should adapt ticket status email to Spanish (es_DO) with localized status badge', async () => {
    const updatedTicket: Ticket = {
      ...mockTicket,
      status: 'IN_PROGRESS',
    };

    await sendTicketStatusChangedEmail(
      'cliente@example.com',
      'Carlos Gómez',
      updatedTicket,
      'Revisando componentes.',
      'es_DO'
    );

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const callArgs = mockSendMail.mock.calls[0][0] as any;
    expect(callArgs.to).toBe('cliente@example.com');
    expect(callArgs.subject).toContain('Actualización de Ticket [En Progreso]');
    expect(callArgs.html).toContain('Hola Carlos Gómez');
    expect(callArgs.html).toContain('En Progreso');
    expect(callArgs.html).toContain('Observaciones del Técnico:');
    expect(callArgs.html).toContain('Revisar Ticket e Historial');
  });

  describe('isSMTPConfigured', () => {
    const validConfig = {
      host: 'smtp.mailgun.org',
      port: 587,
      user: 'admin@velmartech.com.do',
      password: 'super-secret-password-123',
    };

    it('should return true for fully configured SMTP credentials', () => {
      expect(isSMTPConfigured(validConfig)).toBe(true);
    });

    it('should return false if SMTP_HOST is blank, whitespace, or placeholder', () => {
      expect(isSMTPConfigured({ ...validConfig, host: '' })).toBe(false);
      expect(isSMTPConfigured({ ...validConfig, host: '   ' })).toBe(false);
      expect(isSMTPConfigured({ ...validConfig, host: 'smtp.example.com' })).toBe(false);
    });

    it('should return false if SMTP_PORT is blank, 0, or invalid', () => {
      expect(isSMTPConfigured({ ...validConfig, port: '' as any })).toBe(false);
      expect(isSMTPConfigured({ ...validConfig, port: 0 })).toBe(false);
      expect(isSMTPConfigured({ ...validConfig, port: -1 })).toBe(false);
      expect(isSMTPConfigured({ ...validConfig, port: NaN })).toBe(false);
    });

    it('should return false if SMTP_USER is blank, whitespace, or placeholder', () => {
      expect(isSMTPConfigured({ ...validConfig, user: '' })).toBe(false);
      expect(isSMTPConfigured({ ...validConfig, user: '   ' })).toBe(false);
      expect(isSMTPConfigured({ ...validConfig, user: 'your_email@gmail.com' })).toBe(false);
      expect(isSMTPConfigured({ ...validConfig, user: 'user@example.com' })).toBe(false);
    });

    it('should return false if SMTP_PASSWORD is blank, whitespace, or placeholder', () => {
      expect(isSMTPConfigured({ ...validConfig, password: '' })).toBe(false);
      expect(isSMTPConfigured({ ...validConfig, password: '   ' })).toBe(false);
      expect(isSMTPConfigured({ ...validConfig, password: 'your_app_password' })).toBe(false);
      expect(isSMTPConfigured({ ...validConfig, password: 'password' })).toBe(false);
    });
  });
});

