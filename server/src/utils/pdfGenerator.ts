import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { Invoice } from '../types';
import { APP_METADATA } from '../config/constants';
import { logger } from './logger';

class SimplePdfDoc {
  private objects: Buffer[] = [];

  addObject(content: string | Buffer): number {
    const objId = this.objects.length + 1;
    const body = typeof content === 'string' ? Buffer.from(content, 'binary') : content;
    const fullObj = Buffer.concat([
      Buffer.from(`${objId} 0 obj\n`),
      body,
      Buffer.from(`\nendobj\n`)
    ]);
    this.objects.push(fullObj);
    return objId;
  }

  build(): Buffer {
    const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    const offsets: number[] = [];
    let currentOffset = header.length;

    const bodyParts: Buffer[] = [];
    for (let i = 0; i < this.objects.length; i++) {
      offsets.push(currentOffset);
      bodyParts.push(this.objects[i]);
      currentOffset += this.objects[i].length;
    }

    const xrefOffset = currentOffset;
    let xref = `xref\n0 ${this.objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 0; i < offsets.length; i++) {
      xref += offsets[i].toString().padStart(10, '0') + " 00000 n \n";
    }

    const trailer = `trailer\n<<\n  /Size ${this.objects.length + 1}\n  /Root 1 0 R\n>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.concat([
      header,
      ...bodyParts,
      Buffer.from(xref),
      Buffer.from(trailer)
    ]);
  }
}

function escapePdfText(text: string): string {
  return text.replace(/[\\()]/g, '\\$&');
}

interface LogoData {
  width: number;
  height: number;
  rgbBuffer: Buffer;
  alphaBuffer: Buffer;
}

function loadLogoPng(): LogoData | null {
  try {
    const pngPath = path.join(__dirname, '../../../client/src/assets/logo.png');
    if (!fs.existsSync(pngPath)) return null;

    const buf = fs.readFileSync(pngPath);
    if (buf.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;

    let offset = 8;
    const idatChunks: Buffer[] = [];
    let width = 0;
    let height = 0;

    while (offset < buf.length) {
      const length = buf.readUInt32BE(offset);
      const type = buf.slice(offset + 4, offset + 8).toString('ascii');
      const data = buf.slice(offset + 8, offset + 8 + length);
      
      if (type === 'IHDR') {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
      } else if (type === 'IDAT') {
        idatChunks.push(data);
      } else if (type === 'IEND') {
        break;
      }
      offset += 12 + length;
    }

    if (width === 0 || height === 0 || idatChunks.length === 0) return null;

    const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
    const scanlineLength = 1 + width * 4;
    const rawPixels = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y++) {
      const filterType = decompressed[y * scanlineLength];
      const scanlineStart = y * scanlineLength + 1;

      for (let x = 0; x < width * 4; x++) {
        const val = decompressed[scanlineStart + x];
        const left = x >= 4 ? rawPixels[y * width * 4 + x - 4] : 0;
        const up = y > 0 ? rawPixels[(y - 1) * width * 4 + x] : 0;
        const upLeft = (y > 0 && x >= 4) ? rawPixels[(y - 1) * width * 4 + x - 4] : 0;

        let recon = 0;
        if (filterType === 0) {
          recon = val;
        } else if (filterType === 1) {
          recon = val + left;
        } else if (filterType === 2) {
          recon = val + up;
        } else if (filterType === 3) {
          recon = val + Math.floor((left + up) / 2);
        } else if (filterType === 4) {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          if (pa <= pb && pa <= pc) {
            recon = val + left;
          } else if (pb <= pc) {
            recon = val + up;
          } else {
            recon = val + upLeft;
          }
        }
        rawPixels[y * width * 4 + x] = recon % 256;
      }
    }

    const rgbBuffer = Buffer.alloc(width * height * 3);
    const alphaBuffer = Buffer.alloc(width * height * 1);

    let rgbOffset = 0;
    let alphaOffset = 0;

    for (let i = 0; i < rawPixels.length; i += 4) {
      rgbBuffer[rgbOffset++] = rawPixels[i];
      rgbBuffer[rgbOffset++] = rawPixels[i + 1];
      rgbBuffer[rgbOffset++] = rawPixels[i + 2];
      alphaBuffer[alphaOffset++] = rawPixels[i + 3];
    }

    return {
      width,
      height,
      rgbBuffer: zlib.deflateSync(rgbBuffer),
      alphaBuffer: zlib.deflateSync(alphaBuffer),
    };
  } catch (err) {
    logger.error('Failed to parse PNG logo:', { err });
    return null;
  }
}

const labels: Record<string, any> = {
  en_US: {
    invoice: 'INVOICE',
    number: 'Invoice Number:',
    date: 'Invoice Date:',
    dueDate: 'Due Date:',
    status: 'Status:',
    billTo: 'Bill To:',
    desc: 'Description',
    qty: 'Qty',
    unitPrice: 'Unit Price',
    amount: 'Amount',
    subtotal: 'Subtotal:',
    tax: 'Tax (18%):',
    total: 'Total:',
    paymentTerms: 'Payment Details & Terms',
    paymentDue: 'Payment is due within 14 days of invoice date.',
    paymentPortal: 'Please pay using the client portal / PayPal integration.',
    thankYou: 'Thank you for your business!',
    support: `Need help? Support: ${APP_METADATA.email}`,
    serviceDesc: 'Managed IT & Tech Support Subscription'
  },
  es_DO: {
    invoice: 'FACTURA',
    number: 'No. Factura:',
    date: 'Fecha Factura:',
    dueDate: 'Fecha Vencimiento:',
    status: 'Estado:',
    billTo: 'Facturar A:',
    desc: 'Descripcion',
    qty: 'Cant',
    unitPrice: 'Precio Unitario',
    amount: 'Monto',
    subtotal: 'Subtotal:',
    tax: 'Impuesto (18%):',
    total: 'Total:',
    paymentTerms: 'Terminos y Detalles de Pago',
    paymentDue: 'El pago vence dentro de los 14 dias posteriores a la fecha de la factura.',
    paymentPortal: 'Por favor, pague utilizando el portal de clientes / integracion de PayPal.',
    thankYou: '¡Gracias por su preferencia!',
    support: `¿Necesita ayuda? Soporte: ${APP_METADATA.email}`,
    serviceDesc: 'Suscripcion de Soporte Tecnico y TI Gestionado'
  }
};

export function generateInvoicePdf(
  invoice: Invoice,
  clientName: string,
  clientEmail: string,
  tenantName: string,
  language = 'en_US'
): Buffer {
  const t = labels[language] || labels['en_US'];

  const doc = new SimplePdfDoc();
  const logo = loadLogoPng();

  // Catalog
  doc.addObject(`<< /Type /Catalog /Pages 2 0 R >>`);
  // Pages
  doc.addObject(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  // Page
  if (logo) {
    doc.addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Logo 7 0 R >> >> /Contents 6 0 R >>`);
  } else {
    doc.addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`);
  }
  // Font F1 (Regular Helvetica)
  doc.addObject(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
  // Font F2 (Bold Helvetica)
  doc.addObject(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`);

  // Content generation
  const escapedClientName = escapePdfText(clientName);
  const escapedClientEmail = escapePdfText(clientEmail);
  const escapedTenantName = escapePdfText(tenantName);
  const escapedInvoiceNum = escapePdfText(invoice.invoice_number);

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

  const escapedDate = escapePdfText(dateStr);
  const escapedDueDate = escapePdfText(dueDateStr);

  const subtotalVal = '$' + Number(invoice.amount).toFixed(2);
  const taxVal = '$' + Number(invoice.tax_amount).toFixed(2);
  const totalVal = '$' + Number(invoice.total).toFixed(2);

  // Status-specific color and label
  let statusText = String(invoice.status);
  let statusColor = '0.95 0.6 0.1'; // Amber/Orange for pending
  if (invoice.status === 'PAID') {
    statusText = language === 'es_DO' ? 'PAGADA' : 'PAID';
    statusColor = '0.15 0.65 0.35'; // Cool green
  } else if (invoice.status === 'OVERDUE') {
    statusText = language === 'es_DO' ? 'VENCIDA' : 'OVERDUE';
    statusColor = '0.85 0.18 0.18'; // Red
  } else {
    statusText = language === 'es_DO' ? 'PENDIENTE' : 'PENDING';
  }

  const escapedStatus = escapePdfText(statusText);

  // Construct PDF stream commands
  const commands: string[] = [];

  // Top accent bar (Primary brand color: Dark blue slate)
  commands.push(`0.09 0.29 0.48 rg`);
  commands.push(`50 780 495 6 re f`);

  if (logo) {
    // Draw Logo (positioned at x=50, y=738, width=40, height=31)
    commands.push(`q`);
    commands.push(`40 0 0 31 50 738 cm`);
    commands.push(`/Logo Do`);
    commands.push(`Q`);

    // Company / Portal Title (Shifted right to x=98 to accommodate the logo)
    commands.push(`BT`);
    commands.push(`/F2 16 Tf`);
    commands.push(`0.1 0.1 0.1 rg`);
    commands.push(`98 750 Td`);
    commands.push(`(MSP CLIENT PORTAL) Tj`);
    commands.push(`ET`);

    commands.push(`BT`);
    commands.push(`/F1 10 Tf`);
    commands.push(`0.4 0.4 0.4 rg`);
    commands.push(`98 735 Td`);
    commands.push(`(Managed IT Services & Support) Tj`);
    commands.push(`ET`);

    commands.push(`BT`);
    commands.push(`/F1 9 Tf`);
    commands.push(`0.4 0.4 0.4 rg`);
    commands.push(`98 720 Td`);
    commands.push(`(Support Email: ${APP_METADATA.email}) Tj`);
    commands.push(`ET`);
  } else {
    // Fallback Vector Logo (Modern Isometric Cube)
    // Left face (Medium Blue)
    commands.push(`0.25 0.45 0.75 rg`);
    commands.push(`50 740 m 50 755 l 62 762 l 62 747 l f`);
    // Right face (Dark Blue)
    commands.push(`0.09 0.29 0.48 rg`);
    commands.push(`62 747 m 62 762 l 74 755 l 74 740 l f`);
    // Top face (Teal/Light Blue)
    commands.push(`0.4 0.7 0.9 rg`);
    commands.push(`50 755 m 62 762 l 74 755 l 62 748 l f`);

    // Company / Portal Title (Shifted right to x=85 to accommodate the vector logo)
    commands.push(`BT`);
    commands.push(`/F2 16 Tf`);
    commands.push(`0.1 0.1 0.1 rg`);
    commands.push(`85 750 Td`);
    commands.push(`(MSP CLIENT PORTAL) Tj`);
    commands.push(`ET`);

    commands.push(`BT`);
    commands.push(`/F1 10 Tf`);
    commands.push(`0.4 0.4 0.4 rg`);
    commands.push(`85 735 Td`);
    commands.push(`(Managed IT Services & Support) Tj`);
    commands.push(`ET`);

    commands.push(`BT`);
    commands.push(`/F1 9 Tf`);
    commands.push(`0.4 0.4 0.4 rg`);
    commands.push(`85 720 Td`);
    commands.push(`(Support Email: ${APP_METADATA.email}) Tj`);
    commands.push(`ET`);
  }

  // Document Title
  commands.push(`BT`);
  commands.push(`/F2 20 Tf`);
  commands.push(`0.09 0.29 0.48 rg`);
  commands.push(`400 750 Td`);
  commands.push(`(${t.invoice}) Tj`);
  commands.push(`ET`);

  // Invoice Metadata (Left Column, starting at y = 660)
  commands.push(`BT`);
  commands.push(`/F2 10 Tf`);
  commands.push(`0.1 0.1 0.1 rg`);
  commands.push(`50 660 Td`);
  commands.push(`(${t.number}) Tj`);
  commands.push(`/F1 10 Tf`);
  commands.push(`90 0 Td`);
  commands.push(`(${escapedInvoiceNum}) Tj`);
  commands.push(`ET`);

  commands.push(`BT`);
  commands.push(`/F2 10 Tf`);
  commands.push(`50 642 Td`);
  commands.push(`(${t.date}) Tj`);
  commands.push(`/F1 10 Tf`);
  commands.push(`90 0 Td`);
  commands.push(`(${escapedDate}) Tj`);
  commands.push(`ET`);

  commands.push(`BT`);
  commands.push(`/F2 10 Tf`);
  commands.push(`50 624 Td`);
  commands.push(`(${t.dueDate}) Tj`);
  commands.push(`/F1 10 Tf`);
  commands.push(`90 0 Td`);
  commands.push(`(${escapedDueDate}) Tj`);
  commands.push(`ET`);

  // Status
  commands.push(`BT`);
  commands.push(`/F2 10 Tf`);
  commands.push(`50 606 Td`);
  commands.push(`(${t.status}) Tj`);
  commands.push(`ET`);

  commands.push(`BT`);
  commands.push(`/F2 10 Tf`);
  commands.push(`${statusColor} rg`);
  commands.push(`140 606 Td`);
  commands.push(`(${escapedStatus}) Tj`);
  commands.push(`ET`);

  // Bill To Metadata (Right Column, starting at y = 660)
  commands.push(`BT`);
  commands.push(`/F2 10 Tf`);
  commands.push(`0.1 0.1 0.1 rg`);
  commands.push(`350 660 Td`);
  commands.push(`(${t.billTo}) Tj`);
  commands.push(`ET`);

  commands.push(`BT`);
  commands.push(`/F1 10 Tf`);
  commands.push(`0.2 0.2 0.2 rg`);
  commands.push(`350 642 Td`);
  commands.push(`(${escapedClientName}) Tj`);
  commands.push(`ET`);

  commands.push(`BT`);
  commands.push(`/F1 10 Tf`);
  commands.push(`350 624 Td`);
  commands.push(`(${escapedClientEmail}) Tj`);
  commands.push(`ET`);

  commands.push(`BT`);
  commands.push(`/F1 10 Tf`);
  commands.push(`350 606 Td`);
  commands.push(`(${escapedTenantName}) Tj`);
  commands.push(`ET`);

  // Divider line
  commands.push(`0.8 G`);
  commands.push(`1 w`);
  commands.push(`50 580 m`);
  commands.push(`545 580 l`);
  commands.push(`S`);

  // Table Header Background
  commands.push(`0.95 0.95 0.95 rg`);
  commands.push(`50 545 495 20 re`);
  commands.push(`f`);

  // Table Headers
  commands.push(`BT`);
  commands.push(`/F2 9 Tf`);
  commands.push(`0.1 0.1 0.1 rg`);
  commands.push(`60 551 Td`);
  commands.push(`(${escapePdfText(t.desc)}) Tj`);
  commands.push(`270 0 Td`);
  commands.push(`(${escapePdfText(t.qty)}) Tj`);
  commands.push(`50 0 Td`);
  commands.push(`(${escapePdfText(t.unitPrice)}) Tj`);
  commands.push(`70 0 Td`);
  commands.push(`(${escapePdfText(t.amount)}) Tj`);
  commands.push(`ET`);

  // Table Item Row (y = 515)
  commands.push(`BT`);
  commands.push(`/F1 9 Tf`);
  commands.push(`0.2 0.2 0.2 rg`);
  commands.push(`60 520 Td`);
  commands.push(`(${escapePdfText(t.serviceDesc)}) Tj`);
  commands.push(`270 0 Td`);
  commands.push(`(1) Tj`);
  commands.push(`50 0 Td`);
  commands.push(`(${escapePdfText(subtotalVal)}) Tj`);
  commands.push(`70 0 Td`);
  commands.push(`(${escapePdfText(subtotalVal)}) Tj`);
  commands.push(`ET`);

  // Table Divider Line
  commands.push(`0.9 G`);
  commands.push(`0.5 w`);
  commands.push(`50 505 m`);
  commands.push(`545 505 l`);
  commands.push(`S`);

  // Payment terms & Notes (Left Side, y = 460)
  commands.push(`BT`);
  commands.push(`/F2 9 Tf`);
  commands.push(`0.1 0.1 0.1 rg`);
  commands.push(`50 460 Td`);
  commands.push(`(${escapePdfText(t.paymentTerms)}) Tj`);
  commands.push(`ET`);

  commands.push(`BT`);
  commands.push(`/F1 8.5 Tf`);
  commands.push(`0.4 0.4 0.4 rg`);
  commands.push(`50 445 Td`);
  commands.push(`(${escapePdfText(t.paymentDue)}) Tj`);
  commands.push(`ET`);

  commands.push(`BT`);
  commands.push(`/F1 8.5 Tf`);
  commands.push(`50 432 Td`);
  commands.push(`(${escapePdfText(t.paymentPortal)}) Tj`);
  commands.push(`ET`);

  // Calculations Summary (Right Side, y = 460)
  commands.push(`BT`);
  commands.push(`/F1 9.5 Tf`);
  commands.push(`0.3 0.3 0.3 rg`);
  commands.push(`360 460 Td`);
  commands.push(`(${escapePdfText(t.subtotal)}) Tj`);
  commands.push(`110 0 Td`);
  commands.push(`(${escapePdfText(subtotalVal)}) Tj`);
  commands.push(`ET`);

  commands.push(`BT`);
  commands.push(`/F1 9.5 Tf`);
  commands.push(`360 442 Td`);
  commands.push(`(${escapePdfText(t.tax)}) Tj`);
  commands.push(`110 0 Td`);
  commands.push(`(${escapePdfText(taxVal)}) Tj`);
  commands.push(`ET`);

  // Summary Divider Line
  commands.push(`0.8 G`);
  commands.push(`1 w`);
  commands.push(`360 430 m`);
  commands.push(`545 430 l`);
  commands.push(`S`);

  // Total
  commands.push(`BT`);
  commands.push(`/F2 11 Tf`);
  commands.push(`0.1 0.1 0.1 rg`);
  commands.push(`360 412 Td`);
  commands.push(`(${escapePdfText(t.total)}) Tj`);
  commands.push(`110 0 Td`);
  commands.push(`(${escapePdfText(totalVal)}) Tj`);
  commands.push(`ET`);

  // Footer divider line
  commands.push(`0.8 G`);
  commands.push(`1 w`);
  commands.push(`50 100 m`);
  commands.push(`545 100 l`);
  commands.push(`S`);

  // Footer Text
  commands.push(`BT`);
  commands.push(`/F1 8.5 Tf`);
  commands.push(`0.4 0.4 0.4 rg`);
  commands.push(`50 80 Td`);
  commands.push(`(${escapePdfText(t.thankYou)}) Tj`);
  commands.push(`ET`);

  commands.push(`BT`);
  commands.push(`/F1 8.5 Tf`);
  commands.push(`380 80 Td`);
  commands.push(`(${escapePdfText(t.support)}) Tj`);
  commands.push(`ET`);

  const streamContent = commands.join('\n');
  const objContent = `<< /Length ${Buffer.from(streamContent, 'binary').length} >>\nstream\n${streamContent}\nendstream`;
  
  doc.addObject(objContent);

  // Logo objects (obj 7 & 8)
  if (logo) {
    // Logo RGB (obj 7)
    const rgbHeader = Buffer.from(`<<
  /Type /XObject
  /Subtype /Image
  /Width ${logo.width}
  /Height ${logo.height}
  /ColorSpace /DeviceRGB
  /BitsPerComponent 8
  /Filter /FlateDecode
  /SMask 8 0 R
  /Length ${logo.rgbBuffer.length}
>>
stream\n`, 'binary');
    const rgbTrailer = Buffer.from('\nendstream', 'binary');
    const rgbObjBuffer = Buffer.concat([rgbHeader, logo.rgbBuffer, rgbTrailer]);
    doc.addObject(rgbObjBuffer);

    // Logo Alpha Mask (obj 8)
    const alphaHeader = Buffer.from(`<<
  /Type /XObject
  /Subtype /Image
  /Width ${logo.width}
  /Height ${logo.height}
  /ColorSpace /DeviceGray
  /BitsPerComponent 8
  /Filter /FlateDecode
  /Length ${logo.alphaBuffer.length}
>>
stream\n`, 'binary');
    const alphaTrailer = Buffer.from('\nendstream', 'binary');
    const alphaObjBuffer = Buffer.concat([alphaHeader, logo.alphaBuffer, alphaTrailer]);
    doc.addObject(alphaObjBuffer);
  }

  return doc.build();
}
