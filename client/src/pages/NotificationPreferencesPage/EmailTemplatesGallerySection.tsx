import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, KeyRound, ShieldCheck, Ticket, Receipt, Globe } from 'lucide-react';
import {
  PasswordResetTemplate,
  OTPTemplate,
  TicketCreatedTemplate,
  InvoiceReminderTemplate,
} from '@/email-templates';

type TemplateKey = 'password-reset' | 'otp' | 'ticket-created' | 'invoice-reminder';

export const EmailTemplatesGallerySection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('password-reset');
  const [previewLanguage, setPreviewLanguage] = useState<string>(i18n.language || 'en_US');

  const templatesList: { key: TemplateKey; label: string; icon: React.ElementType }[] = [
    {
      key: 'password-reset',
      label: t('notificationPreferences.templatePasswordReset', 'Password Reset'),
      icon: KeyRound,
    },
    {
      key: 'otp',
      label: t('notificationPreferences.templateOTP', 'Verification Code (OTP)'),
      icon: ShieldCheck,
    },
    {
      key: 'ticket-created',
      label: t('notificationPreferences.templateTicketCreated', 'Ticket Created'),
      icon: Ticket,
    },
    {
      key: 'invoice-reminder',
      label: t('notificationPreferences.templateInvoiceReminder', 'Invoice Payment Reminder'),
      icon: Receipt,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header controls card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  {t('notificationPreferences.templatesTitle', 'Email Templates Gallery')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t(
                    'notificationPreferences.templatesSubtitle',
                    'Live preview of system transactional email templates'
                  )}
                </CardDescription>
              </div>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Select value={previewLanguage} onValueChange={setPreviewLanguage}>
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue placeholder={t('notificationPreferences.previewLanguage', 'Language')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en_US">English (US)</SelectItem>
                  <SelectItem value="es_DO">Español (DO)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Template buttons switcher */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {templatesList.map((tpl) => {
              const Icon = tpl.icon;
              const isActive = selectedTemplate === tpl.key;
              return (
                <Button
                  key={tpl.key}
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTemplate(tpl.key)}
                  className="flex items-center gap-2 justify-start text-xs h-7"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{tpl.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rendered Email Preview Container */}
      <div className="overflow-hidden rounded-xl border border-border bg-muted/40 p-4 sm:p-6 shadow-sm">
        <div className="mx-auto max-w-2xl overflow-hidden rounded-xl shadow-md border border-border/80 bg-white dark:bg-slate-900">
          {selectedTemplate === 'password-reset' && (
            <PasswordResetTemplate
              recipientName="Estiven Polanco"
              recipientEmail="epolanco@velmartech.com.do"
              resetUrl="http://localhost:5173/login?openModal=reset-password&token=demo-token"
              expiresInMinutes={60}
              language={previewLanguage}
            />
          )}

          {selectedTemplate === 'otp' && (
            <OTPTemplate
              recipientName="Estiven Polanco"
              recipientEmail="epolanco@velmartech.com.do"
              otp="849201"
              expiresInMinutes={15}
              language={previewLanguage}
            />
          )}

          {selectedTemplate === 'ticket-created' && (
            <TicketCreatedTemplate
              recipientName="Estiven Polanco"
              recipientEmail="epolanco@velmartech.com.do"
              ticketId="TCK-94821"
              ticketTitle="Network latency and switch port degradation"
              category="INFRASTRUCTURE"
              priority="HIGH"
              description="Primary core switch is experiencing intermittent frame drops on VLAN 10. Several workstations are unable to connect to the internal gateway."
              ticketUrl="http://localhost:5173/tickets/TCK-94821"
              language={previewLanguage}
            />
          )}

          {selectedTemplate === 'invoice-reminder' && (
            <InvoiceReminderTemplate
              recipientName="Estiven Polanco"
              recipientEmail="epolanco@velmartech.com.do"
              invoiceNumber="INV-2026-0042"
              amount={450.0}
              dueDate="March 1, 2026"
              paymentUrl="http://localhost:5173/billing"
              language={previewLanguage}
            />
          )}
        </div>
      </div>
    </div>
  );
};
