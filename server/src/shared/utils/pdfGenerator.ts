import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Invoice } from '@shared/types';
import { APP_METADATA } from '@shared/config/constants';
import { logger } from './logger';

/**
 * Customer billing contact and organization metadata for invoice PDF generation.
 */
export interface CustomerBillingInfo {
  name: string;
  email: string;
  tenantName: string;
  phoneNumber?: string | null;
  clientType?: string | null;
  clientId?: string | null;
  accountNumber?: string | null;
}

/**
 * Invoice line item entry for detailed scope/pricing breakdown.
 */
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount?: number;
}

/**
 * Extended invoice entity with optional line items array.
 */
export type InvoiceWithLineItems = Invoice & {
  line_items?: InvoiceLineItem[];
};

/**
 * Resolves the absolute path to the client portal logo asset.
 *
 * @returns Absolute filepath if found, otherwise null
 */
function resolveLogoPath(): string | null {
  const candidates = [
    path.resolve(__dirname, '../../../client/src/assets/logo.png'),
    path.resolve(__dirname, '../../../../client/src/assets/logo.png'),
    path.resolve(process.cwd(), 'client/src/assets/logo.png'),
    path.resolve(process.cwd(), '../client/src/assets/logo.png'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

const labels: Record<string, Record<string, string>> = {
  en_US: {
    invoice: 'INVOICE',
    invoiceDetails: 'INVOICE DETAILS',
    number: 'Invoice Number:',
    date: 'Invoice Date:',
    dueDate: 'Due Date:',
    paymentTermsLabel: 'Terms:',
    paymentTermsValue: 'Net 14 Days',
    status: 'Status:',
    billTo: 'BILL TO / CUSTOMER',
    clientName: 'Contact:',
    company: 'Company:',
    email: 'Email:',
    phone: 'Phone:',
    accountRef: 'Client Ref:',
    accountType: 'Type:',
    invoicerTitle: APP_METADATA.company.toUpperCase(),
    invoicerTagline: APP_METADATA.tagline,
    invoicerAddress: APP_METADATA.address,
    invoicerPhone: `Tel: ${APP_METADATA.phone}`,
    invoicerBillingEmail: `Billing: ${APP_METADATA.billingEmail}`,
    desc: 'Description & Scope',
    qty: 'Qty',
    unitPrice: 'Unit Price',
    amount: 'Amount',
    subtotal: 'Subtotal:',
    tax: 'Tax (18% ITBIS):',
    total: 'Total Amount Due:',
    paymentTerms: 'Payment Terms & Instructions',
    paymentDue: 'Payment is due within 14 days of invoice issue date.',
    paymentPortal: 'Please settle invoices via the Client Portal or PayPal gateway.',
    paymentMethods: 'Accepted methods: PayPal, Bank Wire Transfer, Credit/Debit Card.',
    thankYou: `Thank you for choosing ${APP_METADATA.company} for your IT operations!`,
    support: `Support: ${APP_METADATA.email} | ${APP_METADATA.phone}`,
    serviceDesc: APP_METADATA.tagline,
    paid: 'Paid',
    overdue: 'Overdue',
    pending: 'Pending',
    cancelled: 'Cancelled',
  },
  es_DO: {
    invoice: 'FACTURA',
    invoiceDetails: 'DETALLES DE FACTURA',
    number: 'No. Factura:',
    date: 'Fecha Factura:',
    dueDate: 'Fecha Vencimiento:',
    paymentTermsLabel: 'Condición:',
    paymentTermsValue: '14 Días Netos',
    status: 'Estado:',
    billTo: 'FACTURAR A / CLIENTE',
    clientName: 'Contacto:',
    company: 'Empresa:',
    email: 'Correo:',
    phone: 'Teléfono:',
    accountRef: 'Ref. Cliente:',
    accountType: 'Tipo:',
    invoicerTitle: APP_METADATA.company.toUpperCase(),
    invoicerTagline: 'Servicios de TI Gestionados y Soporte Empresarial',
    invoicerAddress: APP_METADATA.address,
    invoicerPhone: `Tel: ${APP_METADATA.phone}`,
    invoicerBillingEmail: `Facturación: ${APP_METADATA.billingEmail}`,
    desc: 'Descripción y Alcance',
    qty: 'Cant',
    unitPrice: 'Precio Unitario',
    amount: 'Monto',
    subtotal: 'Subtotal:',
    tax: 'Impuesto (18% ITBIS):',
    total: 'Total a Pagar:',
    paymentTerms: 'Términos y Datos de Pago',
    paymentDue: 'El pago vence dentro de los 14 días posteriores a la emisión de la factura.',
    paymentPortal: 'Favor realizar sus pagos a través del Portal de Clientes o PayPal.',
    paymentMethods: 'Métodos aceptados: PayPal, Transferencia Bancaria, Tarjeta de Crédito/Débito.',
    thankYou: `¡Gracias por confiar en ${APP_METADATA.company} para sus operaciones de TI!`,
    support: `Soporte: ${APP_METADATA.email} | ${APP_METADATA.phone}`,
    serviceDesc: 'Suscripción de Servicios de TI Gestionados y Soporte Técnico',
    paid: 'Pagada',
    overdue: 'Vencida',
    pending: 'Pendiente',
    cancelled: 'Cancelada',
  },
};

/**
 * Generates a compliant PDF binary buffer invoice document complete with embedded branding,
 * full customer billing details, provider contact info, and line item tables using PDFKit.
 *
 * @param invoice - Invoice entity with billing details and optional line items
 * @param customerOrName - Full customer metadata object or client name string (for backwards compatibility)
 * @param clientEmail - Client billing contact email (optional if object provided)
 * @param tenantName - Client organization name (optional if object provided)
 * @param language - Target localization code ('es_DO' | 'en_US')
 * @returns Promise resolving to the generated PDF binary Buffer
 */
export function generateInvoicePdf(
  invoice: InvoiceWithLineItems,
  customerOrName: string | CustomerBillingInfo,
  clientEmail = '',
  tenantName = '',
  language = 'en_US'
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const customer: CustomerBillingInfo =
        typeof customerOrName === 'string'
          ? {
              name: customerOrName,
              email: clientEmail,
              tenantName: tenantName,
            }
          : customerOrName;

      const t = labels[language] || labels['en_US'];
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${invoice.invoice_number}`,
          Author: 'Velmar Technology SRL',
          Subject: `Billing Invoice ${invoice.invoice_number} - ${customer.tenantName || customer.name}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => {
        logger.error('PDFKit generation stream error:', { err });
        reject(err);
      });

      // Date formatting
      const dateStr = new Date(invoice.invoice_date).toLocaleDateString(language === 'es_DO' ? 'es-DO' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const dueDateStr = new Date(invoice.due_date).toLocaleDateString(language === 'es_DO' ? 'es-DO' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const subtotalVal = '$' + Number(invoice.amount).toFixed(2);
      const taxVal = '$' + Number(invoice.tax_amount).toFixed(2);
      const totalVal = '$' + Number(invoice.total).toFixed(2);

      // Status configuration
      let statusText = t.pending;
      let statusBgColor = '#fef3c7'; // Light Amber
      let statusBorderColor = '#d97706'; // Amber
      let statusTextColor = '#92400e'; // Dark Amber

      if (invoice.status === 'PAID') {
        statusText = t.paid;
        statusBgColor = '#dcfce7'; // Light Green
        statusBorderColor = '#16a34a'; // Green
        statusTextColor = '#166534'; // Dark Green
      } else if (invoice.status === 'OVERDUE') {
        statusText = t.overdue;
        statusBgColor = '#fee2e2'; // Light Red
        statusBorderColor = '#dc2626'; // Red
        statusTextColor = '#991b1b'; // Dark Red
      } else if (invoice.status === 'CANCELLED') {
        statusText = t.cancelled;
        statusBgColor = '#f3f4f6'; // Light Gray
        statusBorderColor = '#9ca3af'; // Gray
        statusTextColor = '#4b5563'; // Dark Gray
      }

      // 1. Top Brand Accent Bar
      doc.rect(50, 36, 495, 5).fill('#174a7b');

      // 2. Header & Invoicer Information
      const logoPath = resolveLogoPath();
      let headerTextX = 100;

      if (logoPath) {
        try {
          doc.image(logoPath, 50, 48, { width: 42, height: 34, fit: [42, 34] });
          headerTextX = 100;
        } catch (imgErr) {
          logger.warn('Failed to load logo image into PDF, drawing fallback vector:', { imgErr });
          drawFallbackVectorLogo(doc, 50, 48);
          headerTextX = 85;
        }
      } else {
        drawFallbackVectorLogo(doc, 50, 48);
        headerTextX = 85;
      }

      // Invoicer Provider Info
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(t.invoicerTitle, headerTextX, 48);
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(t.invoicerTagline, headerTextX, 63);
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(`${t.invoicerAddress}  •  ${t.invoicerPhone}`, headerTextX, 74);
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(`${t.invoicerBillingEmail}  •  ${APP_METADATA.website}`, headerTextX, 85);

      // Document Title (Right side)
      doc.font('Helvetica-Bold').fontSize(22).fillColor('#174a7b').text(t.invoice, 370, 46, {
        width: 175,
        align: 'right',
      });

      // Status Badge Pill
      doc.roundedRect(445, 75, 100, 18, 3).fillAndStroke(statusBgColor, statusBorderColor);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(statusTextColor).text(statusText.toUpperCase(), 445, 80, {
        width: 100,
        align: 'center',
      });

      // 3. Section Divider Line
      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, 106).lineTo(545, 106).stroke();

      // 4. Two-Column Metadata & Customer Details Box
      const boxY = 114;
      const boxHeight = 88;
      const colWidth = 242;

      // Left Box: Invoice Details
      doc.roundedRect(50, boxY, colWidth, boxHeight, 4).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b').text(t.invoiceDetails, 60, boxY + 8);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text(t.number, 60, boxY + 23);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a').text(invoice.invoice_number, 140, boxY + 23);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text(t.date, 60, boxY + 37);
      doc.font('Helvetica').fontSize(8).fillColor('#334155').text(dateStr, 140, boxY + 37);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text(t.dueDate, 60, boxY + 51);
      doc.font('Helvetica').fontSize(8).fillColor('#334155').text(dueDateStr, 140, boxY + 51);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text(t.paymentTermsLabel, 60, boxY + 65);
      doc.font('Helvetica').fontSize(8).fillColor('#334155').text(t.paymentTermsValue, 140, boxY + 65);

      // Right Box: Customer & Bill To Details
      const rightBoxX = 303;
      doc.roundedRect(rightBoxX, boxY, colWidth, boxHeight, 4).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b').text(t.billTo, rightBoxX + 10, boxY + 8);

      const customerCompany = customer.tenantName || 'N/A';
      const customerContact = customer.name || 'N/A';
      const customerEmail = customer.email || 'N/A';
      const customerPhone = customer.phoneNumber || 'N/A';
      const customerType = customer.clientType ? `[${customer.clientType}]` : '';

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text(t.company, rightBoxX + 10, boxY + 23);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a').text(customerCompany, rightBoxX + 65, boxY + 23, { width: 170, ellipsis: true });

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text(t.clientName, rightBoxX + 10, boxY + 37);
      doc.font('Helvetica').fontSize(8).fillColor('#334155').text(customerContact, rightBoxX + 65, boxY + 37, { width: 170, ellipsis: true });

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text(t.email, rightBoxX + 10, boxY + 51);
      doc.font('Helvetica').fontSize(8).fillColor('#334155').text(customerEmail, rightBoxX + 65, boxY + 51, { width: 170, ellipsis: true });

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text(t.phone, rightBoxX + 10, boxY + 65);
      doc.font('Helvetica').fontSize(8).fillColor('#334155').text(customerPhone, rightBoxX + 65, boxY + 65, { width: 110, ellipsis: true });
      if (customerType) {
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748b').text(customerType, rightBoxX + 175, boxY + 65, { width: 60, align: 'right' });
      }

      // 5. Line Items Table Header
      const tableHeaderY = 212;
      const tableHeaderHeight = 22;
      doc.rect(50, tableHeaderY, 495, tableHeaderHeight).fill('#0f172a');

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
      doc.text(t.desc, 60, tableHeaderY + 6, { width: 250 });
      doc.text(t.qty, 320, tableHeaderY + 6, { width: 40, align: 'center' });
      doc.text(t.unitPrice, 370, tableHeaderY + 6, { width: 80, align: 'right' });
      doc.text(t.amount, 460, tableHeaderY + 6, { width: 75, align: 'right' });

      // 6. Dynamic Line Items List
      const lineItems: InvoiceLineItem[] =
        invoice.line_items && invoice.line_items.length > 0
          ? invoice.line_items
          : [
              {
                description: t.serviceDesc,
                quantity: 1,
                unit_price: Number(invoice.amount),
                amount: Number(invoice.amount),
              },
            ];

      let currentY = tableHeaderY + tableHeaderHeight;

      lineItems.forEach((item, index) => {
        const isEven = index % 2 === 0;
        const rowBg = isEven ? '#ffffff' : '#f8fafc';
        const rowHeight = 22;

        doc.rect(50, currentY, 495, rowHeight).fill(rowBg);

        const itemQty = item.quantity || 1;
        const itemUnitPrice = '$' + Number(item.unit_price).toFixed(2);
        const itemAmount = '$' + Number(item.amount ?? item.quantity * item.unit_price).toFixed(2);

        doc.font('Helvetica').fontSize(8.5).fillColor('#1e293b');
        doc.text(item.description, 60, currentY + 6, { width: 250, ellipsis: true });
        doc.text(String(itemQty), 320, currentY + 6, { width: 40, align: 'center' });
        doc.text(itemUnitPrice, 370, currentY + 6, { width: 80, align: 'right' });
        doc.text(itemAmount, 460, currentY + 6, { width: 75, align: 'right' });

        currentY += rowHeight;
      });

      // Table Bottom Border
      doc.strokeColor('#e2e8f0').lineWidth(0.75).moveTo(50, currentY).lineTo(545, currentY).stroke();

      // 7. Payment Terms & Totals Summary Section
      const summaryY = Math.max(currentY + 16, 290);

      // Left Side: Payment Details & Instructions Box
      doc.roundedRect(50, summaryY, 275, 78, 4).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b').text(t.paymentTerms, 60, summaryY + 8);
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(t.paymentDue, 60, summaryY + 22, { width: 255 });
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(t.paymentPortal, 60, summaryY + 36, { width: 255 });
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(t.paymentMethods, 60, summaryY + 50, { width: 255 });

      // Right Side: Calculations Breakdown Box
      const totalsX = 345;
      const totalsWidth = 200;
      doc.roundedRect(totalsX, summaryY, totalsWidth, 78, 4).fillAndStroke('#ffffff', '#e2e8f0');

      doc.font('Helvetica').fontSize(8.5).fillColor('#64748b').text(t.subtotal, totalsX + 12, summaryY + 10, { width: 95 });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text(subtotalVal, totalsX + 110, summaryY + 10, { width: 78, align: 'right' });

      doc.font('Helvetica').fontSize(8.5).fillColor('#64748b').text(t.tax, totalsX + 12, summaryY + 26, { width: 95 });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text(taxVal, totalsX + 110, summaryY + 26, { width: 78, align: 'right' });

      // Divider inside totals box
      doc.strokeColor('#cbd5e1').lineWidth(0.75).moveTo(totalsX + 10, summaryY + 42).lineTo(totalsX + totalsWidth - 10, summaryY + 42).stroke();

      // Total Line
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(t.total, totalsX + 12, summaryY + 52, { width: 95 });
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#174a7b').text(totalVal, totalsX + 105, summaryY + 50, { width: 83, align: 'right' });

      // 8. Footer (Fixed at bottom)
      const footerY = 765;
      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, footerY).lineTo(545, footerY).stroke();
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(t.thankYou, 50, footerY + 10);
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(t.support, 300, footerY + 10, {
        width: 245,
        align: 'right',
      });

      doc.end();
    } catch (error) {
      logger.error('Failed to generate PDF invoice document:', { error });
      reject(error);
    }
  });
}

/**
 * Draws a fallback isometric vector cube logo when an external image asset is unavailable.
 *
 * @param doc - Active PDFKit document instance
 * @param x - Start X coordinate
 * @param y - Start Y coordinate
 */
function drawFallbackVectorLogo(doc: InstanceType<typeof PDFDocument>, x: number, y: number): void {
  doc.save();
  // Left face (Medium Blue)
  doc.polygon([x, y + 10], [x, y + 25], [x + 12, y + 32], [x + 12, y + 17]).fill('#3f72af');

  // Right face (Dark Blue)
  doc.polygon([x + 12, y + 17], [x + 12, y + 32], [x + 24, y + 25], [x + 24, y + 10]).fill('#174a7b');

  // Top face (Teal/Light Blue)
  doc.polygon([x, y + 10], [x + 12, y + 17], [x + 24, y + 10], [x + 12, y + 3]).fill('#66b2e6');
  doc.restore();
}
