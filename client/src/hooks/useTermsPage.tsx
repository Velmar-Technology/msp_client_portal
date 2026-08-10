import React, { useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface TermSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const termsEn: TermSection[] = [
  {
    id: "acceptance",
    title: "1. Acceptance, Scope, and Electronic Contract Formation",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          [User Summary]: By registering, entering your verification code (OTP), or paying your invoice, you are
          digitally signing this contract with full legal validity.
        </p>
        <p className="mt-2">
          <strong>1.1. Scope:</strong> This contract governs the terms for the provision of managed technology services
          (MSP), cloud data hosting and synchronization based on Nextcloud, remote/on-site technical support, and
          related services (hereinafter, &quot;THE SERVICE&quot;).
        </p>
        <p className="mt-2">
          <strong>1.2. Electronic Legal Validity:</strong> Pursuant to Articles 6 et seq. of Law No. 126-02 on
          Electronic Commerce, Documents, and Digital Signatures of the Dominican Republic, the parties acknowledge that
          electronic acceptance of these Terms (via web registration, OTP code submission, checking verification boxes,
          or subscription payment) produces the same legal effects as a handwritten signed contract.
        </p>
        <p className="mt-2">
          <strong>1.3. Prevalence of Conditions:</strong> In case of discrepancy between promotional information on the
          website and this instrument, the provisions of this contract shall prevail.
        </p>
      </>
    ),
  },
  {
    id: "verification",
    title: "2. Registration, OTP Verification, and Account Custody",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          [User Summary]: To use the platform, you must verify your email with an OTP code. You are solely responsible
          for safeguarding your passwords.
        </p>
        <p className="mt-2">
          <strong>2.1. OTP Verification:</strong> To ensure access integrity, THE CLIENT must authenticate their account
          using a One-Time Password (OTP) sent to their email address. Unverified accounts will not have access to the
          infrastructure.
        </p>
        <p className="mt-2">
          <strong>2.2. Credential Responsibility:</strong> THE CLIENT is solely responsible for the security of their
          users, passwords, and master keys. THE COMPANY will never request passwords or OTP codes via telephone or
          unofficial channels.
        </p>
        <p className="mt-2">
          <strong>2.3. Account Recovery:</strong> In the event of lost access to the primary email address, THE COMPANY
          will require official corporate documentation (Legal representative's National ID or RNC Certificate) to
          process manual resets.
        </p>
      </>
    ),
  },
  {
    id: "sla",
    title: "3. Support Hours, Operational Capacity, and Service Level Agreement (SLA)",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          [User Summary]: We handle requests exclusively Monday to Friday from 9:00 AM to 4:00 PM. We do not offer 24/7
          support. "Response time" is the time we take to read and evaluate your ticket, not the final resolution time.
        </p>
        <p className="mt-2">
          <strong>3.1. Business Hours:</strong> Technical support is provided by human personnel exclusively Monday
          through Friday, from 9:00 AM to 4:00 PM (Atlantic Standard Time - AST / Dominican Republic), excluding
          official national holidays.
        </p>
        <p className="mt-2">
          <strong>3.2. SLA Calculation:</strong> Requests submitted outside of business hours (after 4:00 PM, weekends,
          or holidays) will be received by the platform, but the response time (SLA) calculation will begin at 9:00 AM
          on the following business day.
        </p>
        <p className="mt-2">
          <strong>3.3. Scope of Response Time (SLA):</strong> The SLA assigned to each plan (1h, 2h, or 4h business
          hours) applies solely to the Initial Response Time or Acknowledgment (ACK) by technical staff. It in no way
          guarantees final problem resolution within that period, which depends on technical complexity or external
          telecommunication/power providers.
        </p>
        <p className="mt-2">
          <strong>3.4. Operational Capacity Limitation:</strong> THE CLIENT acknowledges that THE COMPANY operates with
          defined personnel capacity and sequential ticket assignment based on arrival order and priority. THE COMPANY
          shall not be liable for delays resulting from extraordinary report accumulation or force majeure events.
        </p>
      </>
    ),
  },
  {
    id: "data-protection",
    title: "4. Personal Data Protection and Confidentiality (Law No. 172-13)",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          [User Summary]: Your data belongs to you. We act as technical custodians. We do not read, mine, or sell your
          files. If a major security breach occurs, we will notify you within 72 hours.
        </p>
        <p className="mt-2">
          <strong>4.1. Capacity of the Parties:</strong> In accordance with Law No. 172-13 on Personal Data Protection,
          THE CLIENT holds the status of Data Controller for hosted information, while THE COMPANY acts strictly as Data
          Processor.
        </p>
        <p className="mt-2">
          <strong>4.2. Confidentiality and Data Mining Prohibition:</strong> THE COMPANY prohibits its staff from
          reading, indexing, commercially using, or data mining files stored by THE CLIENT. Staff with incidental server
          access are bound by strict non-disclosure agreements.
        </p>
        <p className="mt-2">
          <strong>4.3. Security Breach Protocol:</strong> If a confirmed security breach compromises the confidentiality
          of THE CLIENT's data, THE COMPANY will notify the registered email address within seventy-two (72) business
          hours, detailing findings and corrective measures.
        </p>
        <p className="mt-2">
          <strong>4.4. ARCO Rights:</strong> THE CLIENT is directly responsible for managing Access, Rectification,
          Cancellation, or Opposition (ARCO) requests from their end users.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "5. Acceptable Use, RMM Monitoring, and Cybercrimes (Law No. 53-07)",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          [User Summary]: Uploading viruses, illegal content, or using the cloud for scams is strictly prohibited. You
          authorize remote monitoring to keep your computer secure. If we detect crimes, we will cooperate with DICAT.
        </p>
        <p className="mt-2">
          <strong>5.1. Criminal Compliance:</strong> THE CLIENT commits to complying with Law No. 53-07 on High-Tech
          Crimes and Offenses. Storing or distributing malware, ransomware, child abuse material, phishing, defamatory
          material, or copyright-infringing content is strictly prohibited.
        </p>
        <p className="mt-2">
          <strong>5.2. Express RMM Authorization:</strong> THE CLIENT formally authorizes THE COMPANY to deploy Remote
          Monitoring and Management (RMM) agents, patch scans, and security audits on their systems. This authorization
          constitutes express permission under Article 6 of Law No. 53-07.
        </p>
        <p className="mt-2">
          <strong>5.3. Judicial Cooperation (DICAT):</strong> Upon well-founded suspicion of illegal activities or in
          compliance with orders from the Public Prosecutor's Office or the High-Tech Crimes Investigation Department
          (DICAT) of the National Police, THE COMPANY may suspend the account and provide required information in
          accordance with law.
        </p>
        <p className="mt-2">
          <strong>5.4. Fair Network Use:</strong> Using cloud storage as a public Content Delivery Network (CDN) or
          running automated high-density scripts that degrade server read/write (I/O) speeds is prohibited.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "6. Intellectual Property and Licensing (Law No. 65-00)",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          [User Summary]: You must own or hold rights to the files you upload. The cloud software runs Nextcloud under
          open-source AGPLv3 licensing.
        </p>
        <p className="mt-2">
          <strong>6.1. Content Ownership:</strong> Pursuant to Copyright Law No. 65-00, THE CLIENT retains exclusive
          ownership of data and information uploaded to the platform and shall hold THE COMPANY harmless from
          third-party copyright infringement claims.
        </p>
        <p className="mt-2">
          <strong>6.2. Nextcloud Software:</strong> THE COMPANY provides the service using open-source Nextcloud under
          the GNU Affero General Public License v3 (AGPLv3). Contracting grants only a non-exclusive, non-transferable
          sub-license to use the access portal.
        </p>
      </>
    ),
  },
  {
    id: "equipment",
    title: "7. Equipment on Loan (Hardware Bailment / Comodato)",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          [User Summary]: If your plan includes loaned equipment (such as in the POS plan), equipment lending becomes available after one (1) month of active subscription. The hardware belongs to Velmar. If you cancel the service, you must return them within 5 days or pay for their replacement.
        </p>
        <p className="mt-2">
          <strong>7.1. Legal Nature & Availability:</strong> Equipment delivered on loan (POS or Premium Plans) becomes available to THE CLIENT after completing one (1) month of active subscription and is governed by bailment / Comodato rules (Articles 1875 et seq. of the Dominican Civil Code). Hardware remains the inalienable property of THE COMPANY.
        </p>
        <p className="mt-2">
          <strong>7.2. Custody and Return:</strong> THE CLIENT assumes legal custody of the equipment. Upon termination
          of the contractual relationship, hardware must be returned within five (5) business days. In case of damage
          from misuse, loss, or non-return, THE COMPANY will issue an invoice for replacement at new value.
        </p>
      </>
    ),
  },
  {
    id: "backup",
    title: "8. Backups and Limitation of Liability",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          [User Summary]: Always maintain local backups of your critical files. If an unrecoverable failure occurs on
          our end, our maximum financial liability is limited to 1 month of your subscription fee.
        </p>
        <p className="mt-2">
          <strong>8.1. Local Backup Responsibility:</strong> THE SERVICE is a collaboration and availability tool. THE
          CLIENT commits to maintaining local or secondary backups of their critical information.
        </p>
        <p className="mt-2">
          <strong>8.2. Financial Liability Cap:</strong> Under Articles 1146 and 1147 of the Dominican Civil Code, for
          any data loss or service disruption attributable to THE COMPANY's negligence, maximum compensation entitled to
          THE CLIENT is strictly limited to one (1) month of subscription fees paid for the plan.
        </p>
        <p className="mt-2">
          <strong>8.3. Exemption for Consequential Damages:</strong> THE COMPANY shall not be liable for indirect
          damages, lost profits, lost sales, commercial losses, or business interruptions of THE CLIENT.
        </p>
      </>
    ),
  },
  {
    id: "billing",
    title: "9. Rates, Invoicing (NCF), Taxes (ITBIS), and Non-Payment System",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          [User Summary]: Prices are in USD or DOP plus 18% ITBIS tax. If payment is late: on Day 5 your account becomes
          read-only, on Day 15 access is suspended, and on Day 30 data is permanently deleted.
        </p>
        <p className="mt-2">
          <strong>9.1. Taxes and Currency:</strong> Rates expressed in US Dollars (USD) or Dominican Pesos (DOP) do not
          include eighteen percent (18%) ITBIS tax, which will be applied to the final invoice per the Tax Code.
        </p>
        <p className="mt-2">
          <strong>9.2. NCF Issuance:</strong> THE COMPANY will issue Tax Credit Invoices (NCF) provided THE CLIENT
          supplies a valid RNC before the billing cycle cutoff.
        </p>
        <p className="mt-2">
          <strong>9.3. Non-Payment Suspension Scale:</strong>
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>
            <strong>Day 1 of Overdue:</strong> Automated electronic collection notification.
          </li>
          <li>
            <strong>Day 5 of Overdue:</strong> Account changed to &quot;Read-only mode&quot; (no new files can be
            uploaded or modified).
          </li>
          <li>
            <strong>Day 15 of Overdue:</strong> Full suspension of access to platform and support services.
          </li>
          <li>
            <strong>Day 30 of Overdue:</strong> Permanent technical purge and deletion of data from servers for storage
            liberation, with zero liability to THE COMPANY.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "10. Governing Law and Competent Jurisdiction",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          [User Summary]: Any legal dispute will be resolved under the laws of the Dominican Republic in the courts of
          San Pedro de Macorís.
        </p>
        <p className="mt-2">
          <strong>10.1. Legislation:</strong> This contract is governed in its entirety by the laws of the Dominican
          Republic.
        </p>
        <p className="mt-2">
          <strong>10.2. Jurisdiction:</strong> For any controversy, dispute, or legal claim arising from this agreement,
          the parties irrevocably agree to submit to the exclusive jurisdiction of the ordinary courts of the Judicial
          District of San Pedro de Macorís, Dominican Republic, expressly waiving any other jurisdiction that may
          correspond to them.
        </p>
      </>
    ),
  },
];

const termsEs: TermSection[] = [
  {
    id: "acceptance",
    title: "1. Aceptación, Objeto y Formación del Contrato Electrónico",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          Al registrarte, ingresar tu código de verificación (OTP) o pagar tu factura, estás firmando digitalmente este
          contrato con plena validez legal.
        </p>
        <p className="mt-2">
          <strong>1.1. Objeto:</strong> El presente contrato regula los términos para la prestación de servicios
          gestionados de tecnología (MSP), alojamiento y sincronización de datos en la nube basados en Nextcloud,
          soporte técnico remoto/presencial y servicios conexos (en adelante, &quot;EL SERVICIO&quot;).
        </p>
        <p className="mt-2">
          <strong>1.2. Validez Legal Electrónica:</strong> Conforme a los artículos 6 y subsiguientes de la Ley No.
          126-02 sobre Comercio Electrónico, Documentos y Firmas Digitales de la República Dominicana, las partes
          reconocen que la aceptación electrónica de estos Términos (mediante registro web, envío de código OTP, marcado
          de casillas de verificación o pago de suscripción) produce los mismos efectos jurídicos que un contrato
          firmado de manera manuscrita.
        </p>
        <p className="mt-2">
          <strong>1.3. Prevalencia de las Condiciones:</strong> En caso de discrepancia entre la información
          publicitaria del sitio web y el presente instrumento, prevalecerán las disposiciones de este contrato.
        </p>
      </>
    ),
  },
  {
    id: "verification",
    title: "2. Registro, Verificación OTP y Custodia de Cuentas",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          Para usar la plataforma debes verificar tu correo con un código OTP. Eres el único responsable de cuidar tus
          contraseñas.
        </p>
        <p className="mt-2">
          <strong>2.1. Verificación OTP:</strong> Para garantizar la integridad del acceso, EL CLIENTE debe autenticar
          su cuenta mediante una Contraseña de un Solo Uso (OTP) enviada a su correo electrónico. Las cuentas no
          verificadas no tendrán acceso a la infraestructura.
        </p>
        <p className="mt-2">
          <strong>2.2. Responsabilidad de Credenciales:</strong> EL CLIENTE es el único responsable de la seguridad de
          sus usuarios, contraseñas y claves maestras. LA EMPRESA nunca solicitará contraseñas ni códigos OTP por vía
          telefónica o canales no oficiales.
        </p>
        <p className="mt-2">
          <strong>2.3. Recuperación de Cuenta:</strong> En caso de pérdida de acceso al correo principal, LA EMPRESA
          exigirá documentación corporativa oficial (Cédula del representante legal o Certificado de RNC) para procesar
          el restablecimiento manual.
        </p>
      </>
    ),
  },
  {
    id: "sla",
    title: "3. Horario de Atención, Capacidad Operativa y Niveles de Servicio (SLA)",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          Atendemos solicitudes únicamente de Lunes a Viernes de 9:00 AM a 4:00 PM. No ofrecemos soporte 24/7. El
          &quot;tiempo de respuesta&quot; es el tiempo en que leemos y evaluamos tu ticket, no el tiempo de solución
          final.
        </p>
        <p className="mt-2">
          <strong>3.1. Jornada Laboral de Atención:</strong> El servicio de soporte técnico es prestado por personal
          humano exclusivamente en el horario de Lunes a Viernes, de 9:00 AM a 4:00 PM (Hora Estándar del Atlántico -
          AST / República Dominicana), excluyendo los días feriados oficiales decretados en el país.
        </p>
        <p className="mt-2">
          <strong>3.2. Cómputo de SLAs:</strong> Las solicitudes enviadas fuera de la jornada laboral (después de las
          4:00 PM, fines de semana o feriados) serán recibidas por la plataforma, pero el cómputo del tiempo de
          respuesta (SLA) comenzará a correr a partir de las 9:00 AM del siguiente día hábil.
        </p>
        <p className="mt-2">
          <strong>3.3. Alcance del Tiempo de Respuesta (SLA):</strong> El SLA asignado a cada plan (1h, 2h o 4h hábiles)
          corresponde únicamente al Tiempo de Respuesta Inicial o Acuse de Recibo (ACK) por parte del personal técnico.
          En ningún caso garantiza la resolución definitiva del problema dentro de dicho lapso, la cual dependerá de la
          complejidad de la falla técnica o de proveedores externos de telecomunicaciones/energía.
        </p>
        <p className="mt-2">
          <strong>3.4. Limitación de Capacidad Operativa:</strong> EL CLIENTE reconoce que LA EMPRESA opera con
          capacidad de personal delimitada y asignación secuencial de tickets por orden de llegada y prioridad. LA
          EMPRESA no responderá por retrasos derivados de acumulaciones extraordinarias de reportes o eventos de fuerza
          mayor.
        </p>
      </>
    ),
  },
  {
    id: "data-protection",
    title: "4. Protección de Datos Personales y Confidencialidad (Ley No. 172-13)",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          Tus datos son tuyos. Nosotros actuamos como custodios técnicos. No leemos, minamos ni vendemos tus archivos.
          Si ocurre un fallo de seguridad grave, te notificaremos en 72 horas.
        </p>
        <p className="mt-2">
          <strong>4.1. Calidad de las Partes:</strong> De acuerdo con la Ley No. 172-13 sobre Protección de Datos de
          Carácter Personal, EL CLIENTE ostenta la calidad de Responsable del Tratamiento de la información que aloja, y
          LA EMPRESA actúa estrictamente como Encargado del Tratamiento.
        </p>
        <p className="mt-2">
          <strong>4.2. Confidencialidad y Prohibición de Minería de Datos:</strong> LA EMPRESA prohíbe a su personal la
          lectura, indexación, uso comercial o minería de datos (data mining) sobre los archivos almacenados por EL
          CLIENTE. El personal con acceso incidental a los servidores está sujeto a acuerdos de confidencialidad
          estrictos.
        </p>
        <p className="mt-2">
          <strong>4.3. Protocolo de Brechas de Seguridad:</strong> En caso de confirmarse una falla de seguridad que
          comprometa la confidencialidad de los datos de EL CLIENTE, LA EMPRESA notificará al correo registrado en un
          plazo no mayor a setenta y dos (72) horas hábiles, indicando los hallazgos y las medidas correctivas
          aplicadas.
        </p>
        <p className="mt-2">
          <strong>4.4. Derechos ARCO:</strong> EL CLIENTE es responsable directo de gestionar las solicitudes de Acceso,
          Rectificación, Cancelación u Oposición (ARCO) de sus usuarios finales.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "5. Uso Aceptable, Monitoreo RMM y Delitos Informáticos (Ley No. 53-07)",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          Está prohibido subir virus, contenido ilegal o usar la nube para estafas. Autorizas el monitoreo remoto para
          mantener tu equipo seguro. Si detectamos delitos, cooperaremos con la DICAT.
        </p>
        <p className="mt-2">
          <strong>5.1. Cumplimiento Penal:</strong> EL CLIENTE se obliga a cumplir con la Ley No. 53-07 sobre Crímenes y
          Delitos de Alta Tecnología. Queda prohibido el almacenamiento o distribución de malware, ransomware,
          pornografía infantil, phishing, material difamatorio o contenidos que infrinjan derechos de autor.
        </p>
        <p className="mt-2">
          <strong>5.2. Autorización Expresa de RMM:</strong> EL CLIENTE autoriza formalmente a LA EMPRESA a desplegar
          agentes de Monitoreo y Gestión Remota (RMM), escaneos de parches y auditorías de seguridad en sus equipos.
          Esta autorización constituye un permiso expreso en los términos del artículo 6 de la Ley No. 53-07.
        </p>
        <p className="mt-2">
          <strong>5.3. Cooperación Judicial (DICAT):</strong> Ante sospechas fundadas de actividades ilícitas o en
          cumplimiento de órdenes de la Fiscalía o el Departamento de Investigación de Crímenes y Delitos de Alta
          Tecnología (DICAT) de la Policía Nacional, LA EMPRESA podrá suspender la cuenta y entregar la información
          requerida conforme a derecho.
        </p>
        <p className="mt-2">
          <strong>5.4. Uso Justo de Red:</strong> Se prohíbe el uso del almacenamiento en la nube como red de
          distribución masiva de contenidos (CDN público) o la ejecución de scripts automatizados de alta densidad que
          degraden la velocidad de lectura/escritura (I/O) de los servidores.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "6. Propiedad Intelectual y Licenciamiento (Ley No. 65-00)",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          Debes ser dueño de los archivos que subes. El software de la nube utiliza Nextcloud bajo licencia libre
          AGPLv3.
        </p>
        <p className="mt-2">
          <strong>6.1. Titularidad del Contenido:</strong> Conforme a la Ley No. 65-00 sobre Derecho de Autor, EL
          CLIENTE conserva la propiedad exclusiva de los datos e información subidos a la plataforma y mantendrá libre
          de reclamos a LA EMPRESA por infracciones a derechos de autor de terceros.
        </p>
        <p className="mt-2">
          <strong>6.2. Software Nextcloud:</strong> LA EMPRESA provee el servicio utilizando el software libre Nextcloud
          bajo la licencia GNU Affero General Public License v3 (AGPLv3). La contratación otorga únicamente una
          sublicencia de uso no exclusiva e intransferible del portal de acceso.
        </p>
      </>
    ),
  },
  {
    id: "equipment",
    title: "7. Equipos en Comodato (Préstamo de Hardware)",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          Si tu plan incluye equipos prestados (como en el plan POS), el préstamo de equipos estará disponible después de un (1) mes de suscripción activa. Los equipos son de Velmar. Si cancelas el servicio, debes devolverlos en 5 días o pagar su costo.
        </p>
        <p className="mt-2">
          <strong>7.1. Naturaleza Jurídica y Disponibilidad:</strong> Los equipos entregados en calidad de préstamo (Planes POS o Premium) estarán disponibles para EL CLIENTE tras cumplir un (1) mes de suscripción activa y se rigen por la figura del Comodato (Artículos 1875 y siguientes del Código Civil Dominicano). El hardware es propiedad inalienable de LA EMPRESA.
        </p>
        <p className="mt-2">
          <strong>7.2. Custodia y Devolución:</strong> EL CLIENTE asume la guarda jurídica del equipo. Al finalizar la
          relación contractual, deberá devolver el hardware dentro de un plazo máximo de cinco (5) días hábiles. En caso
          de daño por mal uso, extravío o no restitución, LA EMPRESA emitirá una factura por el valor de reposición a
          nuevo del equipo.
        </p>
      </>
    ),
  },
  {
    id: "backup",
    title: "8. Copias de Seguridad y Limitación de Responsabilidad",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          Mantén siempre copias locales de tus archivos críticos. Si ocurre un fallo insubsanable de nuestro lado,
          nuestra responsabilidad financiera máxima estará limitada al monto de 1 mes de tu suscripción.
        </p>
        <p className="mt-2">
          <strong>8.1. Responsabilidad de Respaldo Local:</strong> EL SERVICIO es una herramienta de colaboración y
          disponibilidad. EL CLIENTE se compromete a mantener respaldos locales o secundarios de su información crítica.
        </p>
        <p className="mt-2">
          <strong>8.2. Límite Financiero de Responsabilidad:</strong> En virtud de los artículos 1146 y 1147 del Código
          Civil Dominicano, ante cualquier evento de pérdida de datos o interrupción imputable a negligencia de LA
          EMPRESA, la indemnización máxima a la que tendrá derecho EL CLIENTE estará estrictamente limitada a la suma
          equivalente a un (1) mes de la tarifa pagada en el plan contratado.
        </p>
        <p className="mt-2">
          <strong>8.3. Exoneración por Lucro Cesante:</strong> LA EMPRESA no responderá por daños indirectos, lucro
          cesante, ventas no realizadas, pérdidas comerciales o paralización de negocios de EL CLIENTE.
        </p>
      </>
    ),
  },
  {
    id: "billing",
    title: "9. Tarifas, Facturación (NCF), Impuestos (ITBIS) y Régimen de Impagos",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          Los precios están en USD o DOP más el 18% de ITBIS. Si no pagas a tiempo: al día 5 tu cuenta será de solo
          lectura, al día 15 se suspenderá el acceso y al día 30 se borrarán los datos definitivamente.
        </p>
        <p className="mt-2">
          <strong>9.1. Impuestos y Moneda:</strong> Las tarifas expresadas en dólares estadounidenses (USD) o pesos
          dominicanos (DOP) no incluyen el dieciocho por ciento (18%) del Impuesto sobre Transferencias de Bienes
          Industrializados y Servicios (ITBIS), el cual se aplicará en la factura final conforme al Código Tributario.
        </p>
        <p className="mt-2">
          <strong>9.2. Emisión de NCF:</strong> LA EMPRESA emitirá facturas con Comprobante de Crédito Fiscal (NCF)
          siempre que EL CLIENTE provea un RNC válido antes del cierre del ciclo de facturación.
        </p>
        <p className="mt-2">
          <strong>9.3. Escala de Suspensión por Impago:</strong>
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>
            <strong>Día 1 de Atraso:</strong> Notificación electrónica automática de cobro.
          </li>
          <li>
            <strong>Día 5 de Atraso:</strong> Cambio de cuenta a &quot;Modo de solo lectura&quot; (no se podrán subir ni
            modificar archivos).
          </li>
          <li>
            <strong>Día 15 de Atraso:</strong> Suspensión total del acceso a la plataforma y servicios de soporte.
          </li>
          <li>
            <strong>Día 30 de Atraso:</strong> Purga y eliminación técnica definitiva de los datos de los servidores
            para liberación de almacenamiento, sin responsabilidad alguna para LA EMPRESA.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "10. Ley Aplicable y Jurisdicción Competente",
    content: (
      <>
        <p className="font-bold text-primary mb-2">
          Cualquier disputa legal se resolverá bajo las leyes de la República Dominicana y en los tribunales de San
          Pedro de Macorís.
        </p>
        <p className="mt-2">
          <strong>10.1. Legislación:</strong> El presente contrato se rige en su totalidad por las leyes de la República
          Dominicana.
        </p>
        <p className="mt-2">
          <strong>10.2. Jurisdicción:</strong> Para cualquier controversia, conflicto o reclamación judicial derivada de
          este acuerdo, las partes acuerdan de manera irrevocable someterse a la competencia exclusiva de la
          jurisdicción ordinaria de los Tribunales del Distrito Judicial de San Pedro de Macorís, República Dominicana,
          renunciando expresamente a cualquier otro fuero que pudiera corresponderles.
        </p>
      </>
    ),
  },
];

export function useTermsPage() {
  const { t, i18n } = useTranslation();
  const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = useCallback((id: string) => {
    sectionsRef.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const termSections = useMemo(() => {
    return i18n.language === "es_DO" ? termsEs : termsEn;
  }, [i18n.language]);

  return {
    t,
    i18n,
    sectionsRef,
    scrollToSection,
    termSections,
  };
}
