import { describe, it, expect } from 'vitest';
import type { LeadActivity } from '../api/crmService';
import { resolveActivityTitle, getActivityTypeLabel } from './activityTitles';

const t = (key: string, options?: Record<string, string>) =>
  options ? `${key}?${Object.entries(options).map(([k, v]) => `${k}=${v}`).join('&')}` : key;

describe('resolveActivityTitle', () => {
  it('translates lead creation events', () => {
    expect(resolveActivityTitle('Lead Created', 'STAGE_CHANGE', t)).toBe('crm.systemActivity.leadCreated');
  });

  it('translates stage changes using translated stage labels', () => {
    expect(resolveActivityTitle('Stage Changed: NEW → QUALIFIED', 'STAGE_CHANGE', t)).toBe(
      'crm.systemActivity.stageChanged?from=crm.stages.new&to=crm.stages.qualified'
    );
  });

  it('falls back to raw title when stage change does not match the system template', () => {
    expect(resolveActivityTitle('Custom stage note', 'STAGE_CHANGE', t)).toBe('Custom stage note');
  });

  it('translates sent quotations keeping the quotation number', () => {
    expect(resolveActivityTitle('Quotation Sent: Q-2026-001', 'QUOTE_SENT', t)).toBe(
      'crm.systemActivity.quotationSent?number=Q-2026-001'
    );
  });

  it('translates follow-up reminders and reminder sends', () => {
    expect(resolveActivityTitle('Follow-up reminder due: Q-9', 'QUOTE_REMINDER', t)).toBe(
      'crm.systemActivity.followUpDue?number=Q-9'
    );
    expect(resolveActivityTitle('Quotation Reminder Sent: Q-9', 'QUOTE_REMINDER', t)).toBe(
      'crm.systemActivity.quoteReminderSent?number=Q-9'
    );
  });

  it('translates quotation status changes reusing quotation status keys', () => {
    expect(resolveActivityTitle('Quotation Accepted: Q-5', 'QUOTE_STATUS_CHANGE', t)).toBe(
      'crm.systemActivity.quotationStatus?status=crm.quotationStatus.accepted&number=Q-5'
    );
    expect(resolveActivityTitle('Quotation Drafted: Q-6', 'QUOTE_STATUS_CHANGE', t)).toBe(
      'crm.systemActivity.quotationStatus?status=crm.quotationStatus.draft&number=Q-6'
    );
  });

  it('transcribes lead conversion with the assigned plan', () => {
    expect(resolveActivityTitle('Lead Converted: Active Subscription Created (PREMIUM)', 'PLAN_ASSIGNED', t)).toBe(
      'crm.systemActivity.leadConverted?plan=PREMIUM'
    );
  });

  it('translates subscription modifications and cancellations', () => {
    expect(resolveActivityTitle('Subscription Modified (STANDARD)', 'SUB_MODIFIED', t)).toBe(
      'crm.systemActivity.subscriptionModified?plan=STANDARD'
    );
    expect(resolveActivityTitle('Subscription Cancelled', 'SUB_MODIFIED', t)).toBe(
      'crm.systemActivity.subscriptionCancelled'
    );
  });

  it('passes through user-entered titles untouched', () => {
    expect(resolveActivityTitle('Called client about renewal', 'CALL', t)).toBe('Called client about renewal');
    expect(resolveActivityTitle('Quarterly review', 'MEETING', t)).toBe('Quarterly review');
    expect(resolveActivityTitle('Internal notes', 'NOTE', t)).toBe('Internal notes');
  });
});

describe('getActivityTypeLabel', () => {
  it('maps every known activity type to its translation key', () => {
    expect(getActivityTypeLabel('STAGE_CHANGE', t)).toBe('crm.activities.stageChange');
    expect(getActivityTypeLabel('QUOTE_SENT', t)).toBe('crm.activities.quoteSent');
    expect(getActivityTypeLabel('QUOTE_STATUS_CHANGE', t)).toBe('crm.activities.quoteStatusChange');
    expect(getActivityTypeLabel('PLAN_ASSIGNED', t)).toBe('crm.activities.planAssigned');
    expect(getActivityTypeLabel('SUB_MODIFIED', t)).toBe('crm.activities.subModified');
    expect(getActivityTypeLabel('EMAIL_SENT', t)).toBe('crm.activities.email');
    expect(getActivityTypeLabel('CALL', t)).toBe('crm.activities.call');
    expect(getActivityTypeLabel('MEETING', t)).toBe('crm.activities.meeting');
    expect(getActivityTypeLabel('NOTE', t)).toBe('crm.activities.note');
  });

  it('returns the raw type for unknown values', () => {
    expect(getActivityTypeLabel('FUTURE_TYPE' as LeadActivity['activity_type'], t)).toBe('FUTURE_TYPE');
  });
});
