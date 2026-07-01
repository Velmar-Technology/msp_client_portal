import dotenv from 'dotenv';
import path from 'path';
import { sendTicketCreatedEmail } from '../utils/emailService';
import { Ticket, TicketCategory, TicketPriority, TicketStatus } from '../types';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // root env
dotenv.config(); // local env

async function run() {
  const recipient = process.argv[2] || 'mike.tech@msp-helpdesk.com';
  
  console.log('--------------------------------------------------');
  console.log('📧 MSP Help Desk — Email Connection Diagnostic');
  console.log('--------------------------------------------------');
  
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  
  console.log(`Host:     ${host}`);
  console.log(`Port:     ${port}`);
  console.log(`User:     ${user ? user : '(not set)'}`);
  console.log(`Password: ${pass ? '******** (configured)' : '(not set)'}`);
  console.log('--------------------------------------------------');

  if (!user || !pass) {
    console.error('❌ Error: SMTP_USER and SMTP_PASSWORD must be configured.');
    process.exit(1);
  }

  const mockTicket: Ticket = {
    id: '739167aa-ff37-4b98-b6a3-7e2642c5c727',
    title: 'Test Laptop Screen Replacement',
    description: 'The laptop display has multiple vertical lines and flashes intermittently. Needs panel diagnosis and hardware replacement.',
    category: TicketCategory.REPAIR,
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    client_id: 'mock-client-id',
    assigned_tech_id: null,
    equipment_id: null,
    tenant_id: 'mock-tenant-id',
    created_at: new Date(),
    updated_at: new Date(),
  };

  try {
    console.log(`Sending styled test email to: ${recipient}...`);
    await sendTicketCreatedEmail(recipient, 'John Doe', mockTicket);
    console.log('✅ Styled test email sent successfully!');
  } catch (error: any) {
    console.error('\n❌ Connection or Send failed!');
    console.error('Error Details:', error);
    
    if (error.code === 'EDNS' || error.syscall === 'queryA') {
      console.error('\n💡 Troubleshooting Tip:');
      console.error('This is a DNS lookup timeout/error. It means the application cannot resolve');
      console.error('the hostname (e.g. smtp.gmail.com). Check your internet connection or network DNS config.');
    } else if (error.code === 'EAUTH') {
      console.error('\n💡 Troubleshooting Tip:');
      console.error('This is an authentication error. For Gmail, make sure you are using an');
      console.error('"App Password" rather than your normal Google password.');
    }
  }
}

run();
