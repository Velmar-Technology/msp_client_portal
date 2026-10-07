import { pool } from '../index';

interface EducatorLead {
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  company_name: string;
  plan_id: string;
  stage: string;
  priority: string;
  expected_revenue: number;
  probability: number;
  notes: string;
}

const EDUCATORS: EducatorLead[] = [
  { contact_name: 'Huascar Jael Diaz Vicente', contact_phone: '829-743-4135', contact_email: 'huascarjdiaz@gmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Daneidy Acosta Frías', contact_phone: '829-727-0110', contact_email: 'daneidyacosta@gmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Xiomara Williams', contact_phone: '829-771-5160', contact_email: 'xiwr23@gmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Leonor Jacobo', contact_phone: '829-818-7115', contact_email: 'leonor1517@hotmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Yadiris Soriano', contact_phone: '809-983-9177', contact_email: 'yadirissoriano@gmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'César E. Santana P.', contact_phone: '809-391-0252', contact_email: 'baldor57425@gmail.com', company_name: 'Docente Matemáticas / Educación', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Mariely Avila', contact_phone: '809-696-5493', contact_email: 'marielyavila74@gmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Milagros De León', contact_phone: '809-484-6746', contact_email: 'milagros10mate@gmail.com', company_name: 'Docente Matemáticas / Educación', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Víctor Joel Luperón Beltrán', contact_phone: '849-212-6285', contact_email: 'licdolup@gmail.com', company_name: 'Docente / Licenciatura', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Israel Javalera', contact_phone: '829-914-4858', contact_email: 'ijpastor01@gmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Yanira Reyes Salas', contact_phone: '809-516-4772', contact_email: 'yanira.reyes@docente.edu.do', company_name: 'MINERD / Sector Educativo', plan_id: 'PL-005', stage: 'NEW', priority: 'HIGH', expected_revenue: 35.40, probability: 25, notes: 'Cuenta institucional MINERD docente.edu.do. Alta prioridad para Suite Educativa.' },
  { contact_name: 'Leysi Medina', contact_phone: '849-271-7280', contact_email: 'leysi.medina@docente.edu.do', company_name: 'MINERD / Sector Educativo', plan_id: 'PL-005', stage: 'NEW', priority: 'HIGH', expected_revenue: 35.40, probability: 25, notes: 'Cuenta institucional MINERD docente.edu.do. Alta prioridad para Suite Educativa.' },
  { contact_name: 'Yessica Chanel Santana', contact_phone: '849-882-1149', contact_email: 'drasantana06@hotmail.com', company_name: 'Docente / Academia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Gloria Arias', contact_phone: '829-301-6887', contact_email: 'gloriaariashernandez@gmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Helem Elizabeth Alemán León', contact_phone: '809-662-3499', contact_email: 'licda.helem@gmail.com', company_name: 'Docente / Licenciatura', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Sandra Olgalidis Sirett', contact_phone: '809-763-8573', contact_email: 'sandrasirett49@gmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Angélica de la Rosa', contact_phone: '809-403-1660', contact_email: 'angelux1422@gmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Ocsagna M. Mena S.', contact_phone: '829-909-4433', contact_email: 'dra.ocsagnamena@gmail.com', company_name: 'Docente / Área Académica', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Odalys Mota', contact_phone: '809-431-9019', contact_email: 'ciencianaturale15@gmail.com', company_name: 'Docente Ciencias Naturales', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Juana Rijo Nieves', contact_phone: '809-717-8091', contact_email: 'giselarijonieves@gmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Margarita de la Rosa', contact_phone: '809-322-1183', contact_email: 'margaritadelarosa186@gmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Juana Isabel Pacheco', contact_phone: '829-598-3205', contact_email: '18nievesP@gmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Cristian Jean', contact_phone: '809-769-0441', contact_email: 'alestilodedios@gmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Jhonny Linares Coronado', contact_phone: '829-604-4900', contact_email: 'jonlin7777@gmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' },
  { contact_name: 'Víctor Medina', contact_phone: '829-304-1600', contact_email: 'medinasbackup@gmail.com', company_name: 'Sector Educativo / Docencia', plan_id: 'PL-005', stage: 'NEW', priority: 'MEDIUM', expected_revenue: 35.40, probability: 20, notes: 'Prospecto docente cohorte 1.' }
];

/**
 * Seeds or upserts the 25 prospective educator leads into the CRM leads table for the primary tenant.
 */
async function importEducatorLeads() {
  const client = await pool.connect();
  try {
    const tenantRes = await client.query('SELECT id FROM tenants LIMIT 1');
    if (!tenantRes.rows.length) {
      throw new Error('No tenant found in the database to associate leads with.');
    }
    const tenantId = tenantRes.rows[0].id;
    console.log(`Associating educator leads with tenant ID: ${tenantId}`);

    let inserted = 0;
    let updated = 0;

    for (const lead of EDUCATORS) {
      const existing = await client.query(
        'SELECT id FROM leads WHERE tenant_id = $1 AND contact_email = $2',
        [tenantId, lead.contact_email]
      );

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE leads 
           SET contact_name = $1, contact_phone = $2, company_name = $3, 
               plan_id = $4, priority = $5, expected_revenue = $6, notes = $7, updated_at = NOW()
           WHERE id = $8`,
          [lead.contact_name, lead.contact_phone, lead.company_name, lead.plan_id, lead.priority, lead.expected_revenue, lead.notes, existing.rows[0].id]
        );
        updated++;
      } else {
        await client.query(
          `INSERT INTO leads (
             tenant_id, contact_name, contact_email, contact_phone, 
             company_name, stage, client_type, plan_id, priority, expected_revenue, probability, notes
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            tenantId, lead.contact_name, lead.contact_email, lead.contact_phone,
            lead.company_name, lead.stage, 'STUDENT', lead.plan_id, lead.priority,
            lead.expected_revenue, lead.probability, lead.notes
          ]
        );
        inserted++;
      }
    }

    console.log(`Educator leads import completed. Inserted: ${inserted}, Updated: ${updated}`);
    console.log(`Successfully processed ${EDUCATORS.length} leads (Inserted: ${inserted}, Updated: ${updated})`);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  importEducatorLeads().catch((err) => {
    console.error('Failed to import educator leads:', err);
    process.exit(1);
  });
}
