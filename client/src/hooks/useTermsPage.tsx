import React, { useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface TermSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const termsEn: TermSection[] = [
    {
      id: "acceptance",
      title: "1. Acceptance and Scope of Services",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[User Summary]: By using this Nextcloud-based cloud storage application, you agree to these rules. If you do not agree, you cannot use the service.</p>
          <p className="mt-2">
            These Terms of Service constitute a legally binding agreement between Velmar Technology SRL (hereinafter, &quot;the Company&quot;), a commercial entity organized and existing under the laws of the Dominican Republic, with its registered tax ID (RNC), and the Client (hereinafter, &quot;the Client&quot;).
          </p>
          <p className="mt-2">
            By accessing, registering for, or using the Nextcloud-based cloud storage reseller service (hereinafter, &quot;the Service&quot;), the Client represents that they have the legal capacity to enter into agreements and agrees to be unconditionally bound by these Terms of Service.
          </p>
        </>
      )
    },
    {
      id: "verification",
      title: "2. Account Verification and OTP Security",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[User Summary]: You must verify your email address using a One-Time Password (OTP) before you can log in. Keep your OTP and account credentials secure.</p>
          <p className="mt-2">
            To ensure the security and integrity of the Service, the Company requires all new accounts to undergo an identity verification process:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>OTP Verification:</strong> Upon registration, the Client must verify their email address by entering a One-Time Password (OTP) sent to their registered email. Unverified accounts will be strictly restricted from accessing the portal or any stored data.</li>
            <li><strong>Credential Custody:</strong> The Client is solely responsible for maintaining the confidentiality of their login credentials and OTP codes. The Company will never ask for the Client's password or OTP via phone or external channels.</li>
            <li><strong>Account Recovery:</strong> If the Client loses access to their registered email, the Company reserves the right to require additional corporate documentation (such as a valid RNC certificate) to process manual account recovery requests.</li>
          </ul>
        </>
      )
    },
    {
      id: "data-protection",
      title: "3. Personal Data Protection (Ley No. 172-13)",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[User Summary]: We only store your files; we do not read them, mine them, or use them for advertising. You are responsible for your users' personal data and handling their access requests. Our technical staff is under strict confidentiality agreements.</p>
          <p className="mt-2">
            In compliance with Law No. 172-13 on the Protection of Personal Data in the Dominican Republic, the parties agree to the following parameters:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Roles of the Parties:</strong> The Company acts exclusively as the &quot;Data Processor&quot; (Encargado del Tratamiento) of the data stored within the Nextcloud servers, while the Client holds the status of &quot;Data Controller&quot; (Responsable del Tratamiento). The Client is solely responsible for determining the purposes, content, and use of the personal data it hosts.</li>
            <li><strong>Confidentiality and NDAs:</strong> All technical and support personnel of the Company who may have access to the Nextcloud technical infrastructure are bound by strict non-disclosure and confidentiality agreements (NDAs) that remain in effect during and after their employment.</li>
            <li><strong>Prohibition of Data Mining:</strong> The Company strictly and irrevocably prohibits its personnel and systems from performing any data mining (minería de datos), indexing content for advertising purposes, or conducting unauthorized scanning of the Client's files.</li>
            <li><strong>ARCO Rights:</strong> The Client is directly responsible for ensuring and processing requests from end users to exercise their rights of Access, Rectification, Cancellation, and Opposition (ARCO Rights). If the Company receives such a request, it will immediately forward it to the Client for resolution.</li>
          </ul>
        </>
      )
    },
    {
      id: "acceptable-use",
      title: "4. Acceptable Use and Cybercrimes (Ley No. 53-07)",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[User Summary]: You must not use the storage to upload malware, scams, child abuse material, or other illegal files. If you do, we will suspend your account immediately and cooperate with government authorities (DICAT and the Public Ministry) if required by a judge.</p>
          <p className="mt-2">
            The Client agrees to make lícito use of the Service, in strict compliance with Law No. 53-07 on Cybercrimes and High-Tech Delicts of the Dominican Republic:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Prohibited Actions:</strong> It is strictly forbidden to use the storage to host, distribute, or transmit malware, conduct phishing, commit computer-related fraud, or store illegal material, including but not limited to child sexual abuse material (CSAM) or intellectual property infringing files.</li>
            <li><strong>Disclaimer of Liability:</strong> The Company does not actively monitor or scan uploaded files. The Client assumes sole civil and criminal liability for all hosted content and holds the Company harmless from any claim arising from violations of Law No. 53-07.</li>
            <li><strong>Account Suspension &amp; Judicial Cooperation:</strong> Upon reasonable suspicion of illegal activity, the Company reserves the right to suspend the account automatically. The Company will fully cooperate with the High-Tech Crimes Investigation Department (DICAT) of the National Police and the Dominican Public Ministry upon receipt of a valid court order.</li>
            <li><strong>Account Sharing and Resale Restrictions:</strong> Sharing account credentials, sub-licensing, or reselling storage slots to third parties is strictly prohibited. Subscriptions are personal and limited to the Client's physical organization. Unauthorized resource sharing triggers immediate account suspension.</li>
            <li><strong>Fair Use I/O and CDN Prohibitions:</strong> The cloud storage is designed for standard collaborative workflows and synchronization. Using the storage to host public distribution sites (CDNs), high-frequency automatic backups from external databases, or repetitive automated script pooling that strains I/O capacity is prohibited. Violations will result in bandwidth throttling or account restrictions.</li>
          </ul>
        </>
      )
    },
    {
      id: "intellectual-property",
      title: "5. Intellectual Property and Nextcloud Licensing (Ley No. 65-00)",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[User Summary]: You must own the rights or licenses for all files you upload. The app runs on Nextcloud, which is free software licensed under AGPLv3. We do not claim ownership of your files, and you do not own our code.</p>
          <p className="mt-2">
            Pursuant to Law No. 65-00 on Copyright of the Dominican Republic, the parties establish:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Client Declaration:</strong> The Client represents and warrants that they possess all copyrights, licenses, and authorizations necessary for the files, documents, and content uploaded or distributed through the Service. The Client will indemnify and hold the Company harmless from any third-party intellectual property infringement claims.</li>
            <li><strong>Nextcloud License:</strong> The parties acknowledge that the base software used to provide the Service is Nextcloud, distributed under the GNU Affero General Public License version 3 (AGPLv3). The Company grants the Client a limited, non-exclusive, non-transferable sub-license to access the portal interface.</li>
            <li><strong>Content Ownership:</strong> The Client retains full ownership of all stored files. The Company does not acquire any intellectual property rights over the Client's data.</li>
          </ul>
        </>
      )
    },
    {
      id: "sla",
      title: "6. Service Level Agreement (SLA) & Maintenance",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[User Summary]: We guarantee 99.5% service availability each month. Scheduled maintenance in the early morning (1:00 AM - 6:00 AM AST) and general local internet provider failures (Claro, Altice, etc.) do not count as downtime. Our support helpdesk response times are active during Dominican business hours, exclude weekends/holidays, and require fair use to prevent abuse.</p>
          <p className="mt-2">
            The Company provides high-availability cloud infrastructure under the following terms:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Monthly Availability:</strong> The Company guarantees a Service Level Agreement (SLA) of 99.5% monthly availability.</li>
            <li><strong>Maintenance Windows:</strong> Scheduled system maintenance is excluded from downtime calculations. These windows will occur during low-traffic hours, specifically between 1:00 AM and 6:00 AM Atlantic Standard Time (AST / Dominican Republic Local Time), and will be notified 24 hours in advance.</li>
            <li><strong>Local Provider Outages:</strong> Interruptions caused by failures of local Dominican Republic telecommunication and internet service providers (including, but not limited to, Claro Dominicana, Altice Dominicana, Wind Telecom, etc.), or international fiber backbone cuts are excluded from downtime calculations and do not qualify for credits.</li>
            <li><strong>Helpdesk Support and Ticket Queue Limits:</strong> The Helpdesk and support ticketing system are operated by the designated technical support team. To ensure quality of service and optimal resource allocation, all ticket response SLAs are targets and will be processed sequentially based on queue priority. The Company reserves the right to handle tickets individually rather than concurrently for a single Client.</li>
            <li><strong>SLA Exclusions and Business Hours:</strong> Ticket response times (SLAs) apply exclusively during business hours (Monday through Friday, 8:00 AM to 5:00 PM AST / Dominican Republic local time), excluding national holidays in the Dominican Republic. Response times are suspended during weekends, holidays, and periods of technical staff rotations, scheduled leaves, or capacity adjustments.</li>
            <li><strong>Support Fair Use Policy:</strong> To prevent abuse of helpdesk support capacity, Clients are prohibited from sending repetitive or duplicate tickets, submitting spam, or using offensive language. The technical team reserves the right to throttle, deprioritize, or suspend ticketing access for Clients who violate this fair use policy. Support is strictly limited to infrastructure and Nextcloud configuration; training on third-party software, operating systems, or basic computer literacy is excluded.</li>
            <li><strong>Ticket Priority Classification Abuse:</strong> The Company reserves the sole right to categorize or downgrade ticket priority levels. Abuse of ticket urgency categories (such as classifying minor queries as Critical/P1) to circumvent queue rules will result in warnings, administrative fees, or temporary suspension of SLA guarantees.</li>
          </ul>
        </>
      )
    },
    {
      id: "backup",
      title: "7. Obligatory Backup and Limitation of Liability",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[User Summary]: While we make automated backups of our servers, you are required to keep local copies of your critical files. If a catastrophic data loss occurs, our maximum financial liability is limited to one month of your subscription fee.</p>
          <p className="mt-2">
            In terms of risk management and liability allocation, the parties agree:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Sync Nature of the Service:</strong> The Service is a synchronization and availability tool, not an archive system. The Client is obligated to maintain separate local backups of all critical files.</li>
            <li><strong>Server Backups:</strong> Although the Company performs daily automated backups of the physical server infrastructure for disaster recovery, it is not responsible for individual synchronization errors, file corruption, or user mistakes.</li>
            <li><strong>Financial Liability Cap:</strong> In the event of catastrophic data loss, technical failure of hardware, or any event attributable to the Company's negligence, the maximum liability of the Company shall be strictly limited to the amount equivalent to one (1) month of subscription fees paid by the Client.</li>
          </ul>
        </>
      )
    },
    {
      id: "billing",
      title: "8. Billing, ITBIS, Tax Invoices (NCF), and Grace Periods",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[User Summary]: We bill in Dominican Pesos (DOP) and include 18% ITBIS. We issue tax-valid invoices (NCF) for DGII-registered companies. If payment is late: Day 1: notification; Day 5: read-only access (no uploads); Day 15: full account suspension; Day 30: permanent and irreversible data deletion.</p>
          <p className="mt-2">
            Financial transactions and payment defaults are subject to the following rules:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Currency and Taxes:</strong> All subscription fees are billed in Dominican Pesos (DOP) and are subject to the eighteen percent (18%) Tax on Transfer of Industrialized Goods and Services (ITBIS), pursuant to the Dominican Tax Code.</li>
            <li><strong>NCF Invoices:</strong> The Company issues invoices with Comprobante de Valor Fiscal (NCF) for corporate clients registered with the Directorate General of Internal Taxes (DGII), provided the Client submits their RNC prior to invoicing.</li>
            <li><strong>Debt Evasion and Affiliate Accounts Restrictions:</strong> The Client is prohibited from registering new accounts under different names, email addresses, or corporate entities (affiliates) to evade outstanding balances, suspension periods, or deletion warnings. The Company reserves the right to link related accounts by RNC, Cédula, IP, or payment profiles, and transfer outstanding debt to the new account or suspend it immediately.</li>
            <li><strong>Grace Periods &amp; Suspension:</strong> In the event of non-payment, the following timeline applies:
              <ul className="list-circle pl-5 mt-1 space-y-1">
                <li><strong>Day 1 of Delay:</strong> Email and in-app notification of unpaid invoice.</li>
                <li><strong>Day 5 of Delay:</strong> Upload permission suspension. The account is set to "Read-Only" mode.</li>
                <li><strong>Day 15 of Delay:</strong> Full account suspension. The Client cannot log in or access stored files.</li>
                <li><strong>Day 30 of Delay:</strong> Irreversible deletion. All files stored on Nextcloud servers will be permanently purged to free disk space, with no liability to the Company.</li>
              </ul>
            </li>
          </ul>
        </>
      )
    },
    {
      id: "governing-law",
      title: "9. Governing Law and Jurisdiction",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[User Summary]: These terms are governed by the laws of the Dominican Republic. Any disputes will be settled exclusively in the courts of San Pedro de Macorís.</p>
          <p className="mt-2">
            Any dispute or claim arising from the interpretation or execution of these Terms of Service shall be governed by the laws of the Dominican Republic. Both parties agree to submit to the exclusive jurisdiction of the courts of San Pedro de Macorís, Dominican Republic.
          </p>
        </>
      )
    },
    {
      id: "subscription-plans",
      title: "10. Special Terms of Subscription Plans",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[User Summary]: Each plan has different prices, cloud storage quotas, and support levels. If your plan includes hardware loans, store discounts, or password managers, you must follow the corresponding rules. Password manager security is your responsibility.</p>
          <p className="mt-2 font-semibold text-secondary">
            Pricing and Terms Variation: All plan costs, storage quotas, and benefits are subject to change. Velmar Technology SRL reserves the right to modify these rates and parameters, and undertakes to notify active subscribers at least thirty (30) calendar days in advance via email or the support portal. Adjusted pricing will only apply to future billing cycles.
          </p>
          <p className="mt-2">
            The subscription tiers provided under the Service are subject to the following parameters:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Basic Plan:</strong> Provides reactive remote support and chat, 25 GB of cloud storage, included backups, an 8-hour response SLA, and reactive remote monitoring with security patching.</li>
            <li><strong>Student Starter Kit:</strong> Tailored for student use. Includes 50 GB of cloud storage, an 8-hour response SLA, monitoring with security patching, and a password manager service (subject to full client liability for master password custody).</li>
            <li><strong>Standard Plan:</strong> Provides proactive support and regular maintenance, 8x5 helpdesk ticketing support, 25 GB of cloud storage, included backups, an 8-hour response SLA, and remote monitoring with security patching.</li>
            <li><strong>Premium POS Plan:</strong> Tailored for point-of-sale systems. Includes technical support, an 8-hour response SLA, up to two (2) hours per week of On-Site support (restricted to Santo Domingo and Santiago metro areas), equipment loan under Comodato bailment rules (the Client is responsible for hardware return and custody), and automated backups.</li>
            <li><strong>Advanced Plan:</strong> Includes all benefits of the Standard Plan, upgraded to 50 GB of cloud storage, a 4-hour response SLA, up to two (2) hours per month of On-Site support, a password manager service, and a non-cumulative 5% discount at the Velmar online or physical store.</li>
            <li><strong>Custom / Corporate Plan (All-Inclusive):</strong> Available upon custom project quotes. Upgraded to 100 GB of cloud storage, a 1-hour response SLA for P1 tickets, up to two (2) hours per month of On-Site support, dedicated engineer remote support, continuous vulnerability scanning, comprehensive asset lifecycle tracking, executive technical escalation, and a 10% discount at the Velmar store.</li>
          </ul>
        </>
      )
    }
  ];

  const termsEs: TermSection[] = [
    {
      id: "acceptance",
      title: "1. Aceptación y Objeto de los Términos",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[Resumen para el Usuario]: Al usar esta aplicación de almacenamiento en la nube, aceptas nuestras reglas. Si no estás de acuerdo, no la uses.</p>
          <p className="mt-2">
            Este documento constituye un contrato legalmente vinculante entre Velmar Technology SRL (en adelante, &quot;la Empresa&quot;), una sociedad comercial organizada y existente bajo las leyes de la República Dominicana, provista de su Registro Nacional de Contribuyentes (RNC), y el Cliente (en adelante, &quot;el Cliente&quot;).
          </p>
          <p className="mt-2">
            Al acceder, registrarse o utilizar el servicio de reventa de almacenamiento en la nube basado en Nextcloud (en adelante, &quot;el Servicio&quot;), el Cliente declara que tiene capacidad legal para contratar y acepta someterse incondicionalmente a los presentes Términos de Servicio.
          </p>
        </>
      )
    },
    {
      id: "verification",
      title: "2. Verificación de Cuenta y Seguridad OTP",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[Resumen para el Usuario]: Debes verificar tu correo electrónico usando una Contraseña de un Solo Uso (OTP) antes de poder iniciar sesión. Mantén tu OTP y credenciales seguras.</p>
          <p className="mt-2">
            Para garantizar la seguridad e integridad del Servicio, la Empresa requiere que todas las cuentas nuevas se sometan a un proceso de verificación de identidad:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Verificación OTP:</strong> Al registrarse, el Cliente debe verificar su dirección de correo electrónico ingresando una Contraseña de un Solo Uso (OTP) enviada a su correo registrado. Las cuentas no verificadas tendrán el acceso estrictamente restringido al portal y a cualquier dato almacenado.</li>
            <li><strong>Custodia de Credenciales:</strong> El Cliente es el único responsable de mantener la confidencialidad de sus credenciales de acceso y códigos OTP. La Empresa nunca solicitará la contraseña ni el OTP del Cliente por teléfono o canales externos.</li>
            <li><strong>Recuperación de Cuenta:</strong> Si el Cliente pierde el acceso a su correo registrado, la Empresa se reserva el derecho de requerir documentación corporativa adicional (como un certificado de RNC válido) para procesar solicitudes de recuperación manual de la cuenta.</li>
          </ul>
        </>
      )
    },
    {
      id: "data-protection",
      title: "3. Marco de Protección de Datos Personales (Ley No. 172-13)",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[Resumen para el Usuario]: Nosotros solo guardamos tus archivos, no los leemos ni los usamos para publicidad. Tú eres responsable de los datos de tus usuarios y de atender sus solicitudes. Nuestro equipo técnico firma acuerdos de confidencialidad y tiene prohibido minar tus datos.</p>
          <p className="mt-2">
            En cumplimiento de la Ley No. 172-13 sobre Protección de Datos de Carácter Personal en la República Dominicana, las partes establecen lo siguiente:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Roles de las Partes:</strong> La Empresa actúa exclusivamente en calidad de &quot;Encargado del Tratamiento&quot; de los datos almacenados en los servidores de Nextcloud, mientras que el Cliente ostenta la calidad de &quot;Responsable del Tratamiento&quot;. El Cliente es el único que determina la finalidad, contenido y uso de los datos personales que aloja.</li>
            <li><strong>Confidencialidad del Personal Técnico:</strong> Todo el personal técnico y de soporte de la Empresa que tenga acceso incidental a la infraestructura técnica de Nextcloud está sujeto a rigurosos acuerdos de confidencialidad y no divulgación (NDAs) vigentes durante y después de su relación laboral.</li>
            <li><strong>Prohibición Absoluta de Minería de Datos:</strong> La Empresa prohíbe de forma absoluta e irrevocable a su personal y sistemas realizar cualquier actividad de minería de datos (data mining), indexación de contenidos con fines publicitarios o escaneo no autorizado de los archivos del Cliente.</li>
            <li><strong>Atención de Derechos ARCO:</strong> El Cliente es responsable directo de garantizar y atender el ejercicio de los derechos de Acceso, Rectificación, Cancelación y Oposición (Derechos ARCO) de sus usuarios finales. Si la Empresa recibe alguna solicitud de esta índole, la remitirá inmediatamente al Cliente para su resolución.</li>
          </ul>
        </>
      )
    },
    {
      id: "acceptable-use",
      title: "4. Uso Aceptable y Delitos Informáticos (Ley No. 53-07)",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[Resumen para el Usuario]: No puedes usar este espacio para subir virus, estafas, pornografía infantil o cosas ilegales. Si lo haces, suspenderemos tu cuenta de inmediato y entregaremos la información a la policía (DICAT) y a la fiscalía si un juez lo ordena.</p>
          <p className="mt-2">
            El Cliente se compromete a hacer un uso lícito del Servicio, en estricto cumplimiento de la Ley No. 53-07 sobre Crímenes y Delitos de Alta Tecnología de la República Dominicana:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Prohibiciones:</strong> Queda expresamente prohibido utilizar el almacenamiento para alojar, distribuir o transmitir software malicioso (malware), realizar actividades de suplantación de identidad (phishing), cometer fraudes informáticos, almacenar material ilícito, difamatorio o pornografía infantil.</li>
            <li><strong>Exención de Responsabilidad:</strong> La Empresa no controla ni supervisa de manera proactiva los archivos subidos al Servicio. Por tanto, el Cliente asume responsabilidad penal y civil exclusiva por cualquier contenido almacenado y exime a la Empresa de cualquier responsabilidad derivada de infracciones a la Ley No. 53-07.</li>
            <li><strong>Suspensión y Cooperación Judicial:</strong> Ante la sospecha fundada de actividades ilícitas o en respuesta a solicitudes e informes de vulnerabilidad, la Empresa se reserva el derecho de suspender de forma automática e inmediata el acceso al Servicio. Asimismo, cooperará plenamente con el Departamento de Investigación de Crímenes y Delitos de Alta Tecnología (DICAT) de la Policía Nacional y el Ministerio Público dominicano ante órdenes judiciales válidas.</li>
            <li><strong>Prohibición de Compartición de Cuentas y Reventa:</strong> Queda estrictamente prohibido compartir las credenciales de acceso, sublicenciar o revender cuotas de almacenamiento a terceros no autorizados. Las cuentas son de uso exclusivo para la organización y personal del Cliente. Cualquier violación o compartición no autorizada causará la suspensión del servicio.</li>
            <li><strong>Límites de Uso Justo de I/O y CDN:</strong> El almacenamiento en la nube está destinado para flujos de trabajo convencionales de colaboración y sincronización. Se prohíbe el uso de la infraestructura como red de distribución de contenidos públicos (CDN), la ejecución de copias de seguridad continuas y masivas de bases de datos externas mediante scripts de alta frecuencia, o actividades de extracción automatizada que afecten la capacidad de lectura/escritura (I/O) del servidor. Incurrir en estas conductas autoriza a la Empresa a limitar el ancho de banda o suspender la cuenta.</li>
          </ul>
        </>
      )
    },
    {
      id: "intellectual-property",
      title: "5. Propiedad Intelectual y Licencia AGPLv3 (Ley No. 65-00)",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[Resumen para el Usuario]: Asegúrate de tener los derechos de autor de todo lo que subes. La aplicación utiliza Nextcloud, que es software libre bajo licencia AGPLv3, y no reclamamos propiedad sobre tus archivos ni tú sobre nuestro código.</p>
          <p className="mt-2">
            En virtud de la Ley No. 65-00 sobre Derecho de Autor de la República Dominicana:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Declaración del Cliente:</strong> El Cliente declara y garantiza que posee todos los derechos de autor, licencias y autorizaciones necesarias para los archivos, documentos y contenidos que sube o distribuye a través del Servicio. El Cliente mantendrá indemne a la Empresa frente a cualquier demanda de terceros por violación de derechos de propiedad intelectual.</li>
            <li><strong>Licencia Nextcloud:</strong> Las partes reconocen que el software base utilizado para proporcionar el Servicio es Nextcloud, el cual se distribuye y opera bajo la licencia pública GNU Affero General Public License versión 3 (AGPLv3). La Empresa otorga al Cliente una sublicencia limitada, no exclusiva e intransferible para usar la interfaz del portal.</li>
            <li><strong>Propiedad del Contenido:</strong> El Cliente conserva la propiedad exclusiva de todos sus datos almacenados. La Empresa no adquiere derecho alguno sobre la propiedad intelectual del Cliente.</li>
          </ul>
        </>
      )
    },
    {
      id: "sla",
      title: "6. Acuerdo de Nivel de Servicio (SLA) y Mantenimiento",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[Resumen para el Usuario]: Te garantizamos que el servicio estará en línea el 99.5% del tiempo cada mes. No cuentan como caídas las ventanas de mantenimiento programadas en la madrugada (1:00 AM a 6:00 AM, hora dominicana) ni los problemas generales de internet con Claro o Altice. Nuestra mesa de ayuda ofrece respuestas en días laborables y horas de oficina dominicanas, suspendiéndose en fines de semana/feriados, y se prohíbe el uso abusivo o reiterado de tickets.</p>
          <p className="mt-2">
            La Empresa provee infraestructura en la nube con altos estándares bajo las siguientes condiciones:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Disponibilidad Mensual:</strong> La Empresa garantiza un Acuerdo de Nivel de Servicio (SLA) de disponibilidad del Servicio del 99.5% computado mensualmente.</li>
            <li><strong>Ventanas de Mantenimiento Excluidas:</strong> Se excluyen del cómputo de disponibilidad las ventanas de mantenimiento técnico programado, las cuales se realizarán preferiblemente en horarios de bajo tráfico, específicamente de 1:00 AM a 6:00 AM, Hora Estándar del Atlántico (AST / Hora de la República Dominicana). Estas ventanas se notificarán con al menos 24 horas de antelación.</li>
            <li><strong>Fallas Externas Excluidas:</strong> No se considerarán caídas del Servicio ni darán derecho a penalización alguna las interrupciones generales causadas por proveedores locales de telecomunicaciones e internet en la República Dominicana (incluyendo, de manera enunciativa pero no limitativa, Claro Dominicana, Altice Dominicana, Wind Telecom, etc.), o fallas en la red troncal de conectividad internacional.</li>
            <li><strong>Límites de la Mesa de Ayuda y Cola de Soporte:</strong> La mesa de ayuda y el soporte técnico son atendidos por el personal de soporte técnico designado. Para garantizar la calidad del servicio y la asignación óptima de recursos, los tiempos de respuesta (SLA) se gestionarán de forma secuencial según la prioridad de la cola de tickets. La Empresa se reserva el derecho de procesar los casos de manera individual y no simultánea para un mismo Cliente.</li>
            <li><strong>Cómputo de Horas y Horario Laboral de Soporte:</strong> Los SLAs de respuesta aplican exclusivamente durante días hábiles y en horario de oficina (lunes a viernes de 8:00 AM a 5:00 PM, hora de la República Dominicana), excluyendo los días feriados oficiales de la República Dominicana. El conteo de tiempo se suspende durante fines de semana, feriados y periodos de rotación de personal, licencias programadas, o ajustes de capacidad operativa.</li>
            <li><strong>Política de Uso Justo de Soporte:</strong> A fin de evitar la saturación de los canales de soporte, se prohíbe el envío de tickets duplicados, spam o mensajes ofensivos. El equipo técnico se reserva la facultad de limitar el flujo de respuestas, degradar la prioridad de los tickets o suspender temporalmente el acceso al portal de soporte de aquellos clientes que incurran en prácticas abusivas. El soporte se limita a la infraestructura y configuración del servicio Nextcloud, excluyendo la capacitación en sistemas operativos o software de terceros.</li>
            <li><strong>Abuso en la Priorización de Tickets:</strong> El equipo técnico se reserva la facultad exclusiva de reclasificar o degradar el nivel de prioridad de los reportes. El abuso sistemático de las categorías de urgencia (por ejemplo, catalogar incidentes de baja importancia como Críticos/P1) con el fin de eludir los tiempos de la cola ordinaria conllevará amonestaciones o la suspensión temporal del cómputo de SLA.</li>
          </ul>
        </>
      )
    },
    {
      id: "backup",
      title: "7. Cláusula de Respaldo Obligatorio (Backup) y Límite de Responsabilidad",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[Resumen para el Usuario]: Aunque hacemos copias de seguridad de los servidores, debes guardar copias locales de tus archivos importantes. Si ocurre una pérdida total de datos por algún fallo grave, lo máximo que te compensaremos será el valor de un mes de tu suscripción.</p>
          <p className="mt-2">
            En cuanto a la mitigación de riesgos y la responsabilidad operativa:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Naturaleza del Servicio:</strong> El Servicio es una herramienta de sincronización, colaboración y disponibilidad de archivos en la nube, y no debe considerarse un sistema de archivo en frío o de almacenamiento definitivo absoluto. El Cliente está obligado a mantener copias locales o respaldos externos de sus archivos críticos y sensibles.</li>
            <li><strong>Copias de Seguridad de la Empresa:</strong> Aunque la Empresa ejecuta respaldos automatizados diarios de la infraestructura física del servidor para recuperación de desastres, no se hace responsable por fallas de sincronización individuales, errores del usuario o archivos corruptos.</li>
            <li><strong>Límite de Responsabilidad Financiera:</strong> En caso de una pérdida catastrófica de datos, falla técnica insubsanable del hardware o cualquier evento imputable a la negligencia de la Empresa, la responsabilidad civil y financiera máxima de la Empresa frente al Cliente quedará estrictamente limitada al monto equivalente a un (1) mes de suscripción pagada por el Cliente en el plan correspondiente al momento del incidente.</li>
          </ul>
        </>
      )
    },
    {
      id: "billing",
      title: "8. Política de Pagos, Facturación (NCF) y Escala de Impagos",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[Resumen para el Usuario]: Cobramos en Pesos Dominicanos (DOP) e incluimos el 18% de ITBIS. Si necesitas factura con valor fiscal para la DGII, la emitimos. Si te retrasas en el pago, a partir del día 1 te avisaremos; al día 5 tu cuenta será de solo lectura; al día 15 se suspenderá por completo; y al día 30 borraremos tus datos definitivamente de los servidores.</p>
          <p className="mt-2">
            El régimen de pagos, impuestos y suspensión de cuentas se regirá por las siguientes condiciones:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Moneda e Impuestos:</strong> Las tarifas de suscripción se facturan en Pesos Dominicanos (DOP) y están sujetas a la aplicación del dieciocho por ciento (18%) del Impuesto sobre Transferencias de Bienes Industrializados y Servicios (ITBIS), conforme al Código Tributario de la República Dominicana.</li>
            <li><strong>Emisión de NCF:</strong> La Empresa emitirá facturas con Comprobante de Valor Fiscal (NCF) para las personas jurídicas o físicas debidamente registradas ante la Dirección General de Impuestos Internos (DGII), siempre y cuando el Cliente suministre su RNC correspondiente antes de la facturación.</li>
            <li><strong>Evasión de Deudas e Inhabilitación de Cuentas Vinculadas:</strong> Se prohíbe la creación de nuevas cuentas de usuario o de facturación bajo nombres alternativos, correos electrónicos distintos o identidades corporativas afiliadas con el fin de evadir balances pendientes, periodos de suspensión o alertas de borrado. La Empresa se reserva el derecho de vincular cuentas asociadas por RNC, Cédula de Identidad, dirección IP o métodos de pago, trasladando el cobro de la deuda a la nueva cuenta o suspendiéndola de inmediato.</li>
            <li><strong>Proceso de Impago y Escala de Suspensión:</strong> En caso de atraso en el pago, se aplicará el siguiente procedimiento adaptado al mercado dominicano:
              <ul className="list-circle pl-5 mt-1 space-y-1">
                <li><strong>Día 1 de atraso:</strong> Emisión de una notificación electrónica automática de cobro al correo registrado del Cliente y aviso directo en la aplicación.</li>
                <li><strong>Día 5 de atraso:</strong> Suspensión de los permisos de escritura y subida. La cuenta pasará a "Modo de solo lectura" (Read-only), impidiendo subir nuevos archivos o modificar los existentes.</li>
                <li><strong>Día 15 de atraso:</strong> Suspensión total del acceso. El Cliente y sus usuarios no podrán ingresar a la plataforma ni visualizar los archivos.</li>
                <li><strong>Día 30 de atraso:</strong> Eliminación definitiva e irreversible. Se procederá con la purga técnica completa de todos los datos alojados en los servidores y cuentas de Nextcloud para liberar espacio en disco, sin que la Empresa asuma responsabilidad alguna por dicha pérdida de información.</li>
              </ul>
            </li>
          </ul>
        </>
      )
    },
    {
      id: "governing-law",
      title: "9. Ley Aplicable y Jurisdicción Dominicana",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[Resumen para el Usuario]: Estos términos se rigen por las leyes de la República Dominicana. Cualquier disputa o desacuerdo se resolverá en los tribunales de San Pedro de Macorís.</p>
          <p className="mt-2">
            Cualquier controversia, disputa o reclamación derivada de la interpretación o ejecución de los presentes Términos de Servicio se regirá exclusivamente por las leyes de la República Dominicana.
          </p>
          <p className="mt-2">
            Ambas partes acuerdan someterse a la jurisdicción exclusiva de los tribunales de San Pedro de Macorís, República Dominicana, renunciando a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros.
          </p>
        </>
      )
    },
    {
      id: "subscription-plans",
      title: "10. Términos Especiales de los Planes de Suscripción",
      content: (
        <>
          <p className="font-bold text-primary mb-2">[Resumen para el Usuario]: Cada plan tiene un precio, cantidad de almacenamiento y nivel de soporte diferente. Si tu plan incluye préstamo de equipos, descuentos en la tienda o administrador de contraseñas, debes seguir las reglas de devolución y cuidado correspondientes. La seguridad de tu gestor de contraseñas es tu responsabilidad.</p>
          <p className="mt-2 font-semibold text-secondary">
            Variación de Costos y Condiciones: Los precios, cuotas de almacenamiento y beneficios asociados a cada plan de suscripción están sujetos a variaciones. Velmar Technology SRL se reserva el derecho de modificar las tarifas y especificaciones de los planes, comprometiéndose a notificar a los clientes activos con al menos treinta (30) días calendario de antelación por correo electrónico o a través del portal de soporte. Las tarifas modificadas se aplicarán únicamente en los períodos de facturación subsecuentes.
          </p>
          <p className="mt-2">
            Los diferentes niveles de planes y suscripciones ofrecidos bajo el Servicio están sujetos a los siguientes parámetros y condiciones específicas:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Plan Básico:</strong> Incluye soporte remoto reactivo y chat, 25 GB de almacenamiento en la nube, copia de seguridad incluida, SLA de respuesta de 8 horas, y monitoreo remoto con parches de seguridad estándar.</li>
            <li><strong>Kit de Inicio para Estudiantes:</strong> Diseñado para uso académico. Incluye 50 GB de almacenamiento en la nube, SLA de respuesta de 8 horas, monitoreo con parches de seguridad, y servicio de administrador de contraseñas (bajo absoluta responsabilidad del usuario por el resguardo de su clave maestra).</li>
            <li><strong>Plan Estándar:</strong> Incluye soporte proactivo y mantenimiento regular del sistema, soporte de mesa de ayuda en horario 8x5, 25 GB de almacenamiento en la nube, copia de seguridad incluida, SLA de respuesta de 8 horas, y monitoreo con parches de seguridad.</li>
            <li><strong>Plan Premium POS:</strong> Especializado para sistemas de puntos de venta. Incluye soporte técnico, SLA de respuesta de 8 horas, soporte On-Site presencial de hasta dos (2) horas semanales (restringido a Santo Domingo y Santiago), préstamo de equipos POS bajo la modalidad de Comodato (el Cliente se obliga a la custodia y devolución del hardware entregado), y copia de seguridad.</li>
            <li><strong>Plan Avanzado:</strong> Incluye todos los beneficios del Plan Estándar, incrementando la cuota a 50 GB de almacenamiento en la nube, SLA de respuesta de 4 horas, soporte On-Site de hasta dos (2) horas al mes, administrador de contraseñas, y un 5% de descuento no acumulable en compras en la tienda Velmar.</li>
            <li><strong>Plan Personalizado o Avanzado &quot;Todo Incluido&quot; (Custom / Corporativo):</strong> Sujeto a cotizaciones y contratos a medida. Ofrece 100 GB de almacenamiento en la nube, SLA de respuesta de 1 hora para casos críticos, soporte On-Site de hasta dos (2) horas al mes, soporte de ingeniero dedicado remoto, escaneo continuo de vulnerabilidades en red, seguimiento exhaustivo del ciclo de vida de los activos, escalación jerárquica ejecutiva y un 10% de descuento en la tienda Velmar.</li>
          </ul>
        </>
      )
    }
  ];

  

export function useTermsPage() {
  const { t, i18n } = useTranslation();
  const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = useCallback((id: string) => {
    sectionsRef.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const termSections = useMemo(() => {
    return i18n.language === 'es_DO' ? termsEs : termsEn;
  }, [i18n.language]);

  return {
    t,
    i18n,
    sectionsRef,
    scrollToSection,
    termSections,
  };
}
