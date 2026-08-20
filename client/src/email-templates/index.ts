/* Design tokens & shared primitives */
export { palette, font, space, radius, shadow, layout, getPriorityColor } from './tokens';
export type * from './types';

/* Shared sub-components */
export {
  Greeting,
  BodyText,
  InfoCard,
  DetailRow,
  Badge,
  Callout,
  Disclaimer,
  HighlightCode,
  FallbackLink,
} from './components';

/* Layout wrapper */
export { EmailWrapper } from './EmailWrapper';

/* Email templates */
export { PasswordResetTemplate } from './PasswordResetTemplate';
export { OTPTemplate } from './OTPTemplate';
export { TicketCreatedTemplate } from './TicketCreatedTemplate';
export { InvoiceReminderTemplate } from './InvoiceReminderTemplate';
