import { useRef } from 'react';
import { Shield, Lock, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PrivacySection {
  id: string;
  title: string;
  content: React.ReactNode;
}

export function PrivacyPage() {
  const { t, i18n } = useTranslation();
  const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = (id: string) => {
    sectionsRef.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const privacyEn: PrivacySection[] = [
    {
      id: "introduction",
      title: "1. Introduction",
      content: (
        <>
          <p>
            Velmar Technology SRL (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects your privacy and is committed to protecting the personal and operational data of our clients. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our MSP Client Portal.
          </p>
          <p className="mt-3">
            Please read this policy carefully. By accessing or using the portal, you consent to our practices regarding your information as described herein.
          </p>
        </>
      )
    },
    {
      id: "collection",
      title: "2. Information We Collect",
      content: (
        <>
          <p>
            To provide efficient IT management and support services, we collect information that falls into the following categories:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Account Details:</strong> Contact information, including names, business email addresses, phone numbers, and job roles.</li>
            <li><strong>System Telemetry:</strong> CPU usage, memory allocation, IP addresses, network topology, device names, and hardware specifications gathered via our local monitoring agents.</li>
            <li><strong>Support Logs:</strong> Ticket descriptions, chat transcripts, email attachments, and resolution histories containing problem assessments.</li>
            <li><strong>Billing Data:</strong> Transaction metadata, tax identifiers, billing addresses, and payment status details (we do not store raw credit card numbers directly on our servers).</li>
          </ul>
        </>
      )
    },
    {
      id: "usage",
      title: "3. How We Use Your Information",
      content: (
        <>
          <p>
            We process client data solely to fulfill our service agreements. Specifically, we use the collected information to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Diagnose, troubleshoot, and resolve infrastructure issues logged in tickets.</li>
            <li>Trigger automatic ticket creation when monitored devices breach set capacity or health limits.</li>
            <li>Process payments and calculate applicable taxes on invoices.</li>
            <li>Send critical service notifications, such as ticket status updates (e.g., via email or WhatsApp integrations) and SLA escalation warnings.</li>
            <li>Enforce our Terms of Service and protect the security of our services.</li>
          </ul>
        </>
      )
    },
    {
      id: "security",
      title: "4. Data Storage and Protection",
      content: (
        <>
          <p>
            We deploy strict physical, technical, and administrative measures to secure client information.
          </p>
          <p className="mt-3">
            Our protection framework includes:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Encryption:</strong> Data is encrypted both in transit (using HTTPS/TLS protocols) and at rest within our PostgreSQL databases.</li>
            <li><strong>Access Controls:</strong> System configurations and client portal details are partitioned. Technicians only gain access to the data of clients assigned to their open tickets.</li>
            <li><strong>Monitoring:</strong> 24/7 security auditing of portal logs to detect unauthorized access attempts or suspicious activity.</li>
          </ul>
        </>
      )
    },
    {
      id: "sharing",
      title: "5. Sharing of Information",
      content: (
        <>
          <p>
            We do not sell, trade, or rent client personal data or technical configurations to third parties. We may share information only in the following scenarios:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Service Providers:</strong> Third-party integrations (e.g., email notification senders, billing gateways, SMS/WhatsApp engines) that perform operations on our behalf under strict confidentiality agreements.</li>
            <li><strong>Legal Requirements:</strong> When compelled by law, subpoena, or regulation to protect our rights, client safety, or cooperate with public authorities.</li>
          </ul>
        </>
      )
    },
    {
      id: "cookies",
      title: "6. Cookies and Sessions",
      content: (
        <>
          <p>
            The MSP Portal utilizes essential cookies and session tokens to keep you authenticated as you browse pages.
          </p>
          <p className="mt-3">
            These cookies allow the system to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Maintain active login state (so you don&apos;t have to re-enter credentials on every action).</li>
            <li>Remember UI preferences such as sidebar expansion settings.</li>
          </ul>
          <p className="mt-3">
            You can disable cookies in your browser settings, but please note that the portal will not function correctly without session tracking enabled.
          </p>
        </>
      )
    },
    {
      id: "rights",
      title: "7. Client Rights (GDPR & CCPA)",
      content: (
        <>
          <p>
            Depending on your jurisdiction, you may have specific statutory rights regarding your personal information, including:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>The right to access the data we hold about your business.</li>
            <li>The right to request correction of inaccurate records.</li>
            <li>The right to request deletion of non-essential accounts and associated history (subject to regulatory holding requirements for billing documents).</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, please contact our privacy compliance officer.
          </p>
        </>
      )
    },
    {
      id: "contact",
      title: "8. Compliance Contact",
      content: (
        <>
          <p>
            If you have questions about this Privacy Policy or wish to request data correction/deletion, please reach out to us:
          </p>
          <div className="mt-3 p-4 bg-surface-container rounded-lg border border-outline-variant text-body-md space-y-1">
            <p className="font-semibold text-primary">Velmar Technology SRL</p>
            <p>Attn: Data Privacy Officer</p>
            <p>Email: privacy@velmartech.com</p>
            <p>Phone: +1 (800) 555-0199 ext. 4</p>
          </div>
        </>
      )
    }
  ];

  const privacyEs: PrivacySection[] = [
    {
      id: "introduction",
      title: "1. Introducción",
      content: (
        <>
          <p>
            Velmar Technology SRL (&quot;nosotros&quot;, &quot;nos&quot; o &quot;nuestro&quot;) respeta su privacidad y se compromete a proteger los datos personales y operativos de nuestros clientes. Esta Política de Privacidad explica cómo recopilamos, usamos, divulgamos y salvaguardamos su información cuando utiliza nuestro Portal del Cliente MSP.
          </p>
          <p className="mt-3">
            Lea esta política detenidamente. Al acceder o utilizar el portal, usted acepta nuestras prácticas con respecto a su información tal como se describe en el presente documento.
          </p>
        </>
      )
    },
    {
      id: "collection",
      title: "2. Información que Recopilamos",
      content: (
        <>
          <p>
            Para proporcionar servicios eficientes de administración y soporte de TI, recopilamos información que entra en las siguientes categorías:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Detalles de la Cuenta:</strong> Información de contacto, incluidos nombres, direcciones de correo electrónico comerciales, números de teléfono y roles laborales.</li>
            <li><strong>Telemetría del Sistema:</strong> Uso de CPU, asignación de memoria, direcciones IP, topología de red, nombres de dispositivos y especificaciones de hardware recopiladas a través de nuestros agentes de monitoreo local.</li>
            <li><strong>Registros de Soporte:</strong> Descripciones de tickets, transcripciones de chat, archivos adjuntos de correo electrónico e historiales de resolución de problemas.</li>
            <li><strong>Datos de Facturación:</strong> Metadatos de transacciones, identificadores de impuestos, direcciones de facturación y detalles del estado de pago (no almacenamos números de tarjetas de crédito sin procesar directamente en nuestros servidores).</li>
          </ul>
        </>
      )
    },
    {
      id: "usage",
      title: "3. Cómo Utilizamos su Información",
      content: (
        <>
          <p>
            Procesamos los datos de los clientes únicamente para cumplir con nuestros acuerdos de servicio. Específicamente, utilizamos la información recopilada para:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Diagnosticar, solucionar y resolver problemas de infraestructura registrados en los tickets.</li>
            <li>Activar la creación automática de tickets cuando los dispositivos monitoreados superen los límites de capacidad o salud establecidos.</li>
            <li>Procesar pagos y calcular los impuestos correspondientes en las facturas.</li>
            <li>Enviar notificaciones de servicio críticas, como actualizaciones del estado de los tickets (por ejemplo, a través de integraciones de correo electrónico o WhatsApp) y advertencias de escalación de SLA.</li>
            <li>Hacer cumplir nuestros Términos de Servicio y proteger la seguridad de nuestros servicios.</li>
          </ul>
        </>
      )
    },
    {
      id: "security",
      title: "4. Almacenamiento y Protección de Datos",
      content: (
        <>
          <p>
            Implementamos estrictas medidas físicas, técnicas y administrativas para proteger la información del cliente.
          </p>
          <p className="mt-3">
            Nuestro marco de protección incluye:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Encriptación:</strong> Los datos se encriptan tanto en tránsito (utilizando protocolos HTTPS/TLS) como en reposo dentro de nuestras bases de datos PostgreSQL.</li>
            <li><strong>Controles de Acceso:</strong> Las configuraciones del sistema y los detalles del portal del cliente están particionados. Los técnicos solo obtienen acceso a los datos de los clientes asignados a sus tickets abiertos.</li>
            <li><strong>Monitoreo:</strong> Auditoría de seguridad las 24 horas del día, los 7 días de la semana, de los registros del portal para detectar intentos de acceso no autorizados o actividades sospechosas.</li>
          </ul>
        </>
      )
    },
    {
      id: "sharing",
      title: "5. Intercambio de Información",
      content: (
        <>
          <p>
            No vendemos, comercializamos ni alquilamos datos personales o configuraciones técnicas de los clientes a terceros. Podremos compartir información únicamente en los siguientes casos:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Proveedores de Servicios:</strong> Integraciones de terceros (por ejemplo, remitentes de notificaciones por correo electrónico, pasarelas de facturación, motores de SMS/WhatsApp) que realizan operaciones en nuestro nombre bajo estrictos acuerdos de confidencialidad.</li>
            <li><strong>Requisitos Legales:</strong> Cuando sea requerido por ley, citación o regulación para proteger nuestros derechos, la seguridad del cliente o cooperar con las autoridades públicas.</li>
          </ul>
        </>
      )
    },
    {
      id: "cookies",
      title: "6. Cookies y Sesiones",
      content: (
        <>
          <p>
            El Portal MSP utiliza cookies esenciales y tokens de sesión para mantenerlo autenticado mientras navega por las páginas.
          </p>
          <p className="mt-3">
            Estas cookies permiten al sistema:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Mantener el estado de inicio de sesión activo (para que no tenga que volver a ingresar las credenciales en cada acción).</li>
            <li>Recordar las preferencias de la interfaz de usuario, como la configuración de expansión de la barra lateral.</li>
          </ul>
          <p className="mt-3">
            Puede desactivar las cookies en la configuración de su navegador, pero tenga en cuenta que el portal no funcionará correctamente sin el seguimiento de sesión habilitado.
          </p>
        </>
      )
    },
    {
      id: "rights",
      title: "7. Derechos del Cliente (GDPR y CCPA)",
      content: (
        <>
          <p>
            Según su jurisdicción, es posible que tenga derechos legales específicos con respecto a su información personal, que incluyen:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>El derecho a acceder a los datos que poseemos sobre su negocio.</li>
            <li>El derecho a solicitar la corrección de registros inexactos.</li>
            <li>El derecho a solicitar la eliminación de cuentas no esenciales e historiales asociados (sujeto a requisitos reglamentarios de retención para documentos de facturación).</li>
          </ul>
          <p className="mt-3">
            Para ejercer cualquiera de estos derechos, póngase en contacto con nuestro oficial de cumplimiento de privacidad.
          </p>
        </>
      )
    },
    {
      id: "contact",
      title: "8. Contacto de Cumplimiento",
      content: (
        <>
          <p>
            Si tiene preguntas sobre esta Política de Privacidad o desea solicitar la corrección/eliminación de datos, comuníquese con nosotros:
          </p>
          <div className="mt-3 p-4 bg-surface-container rounded-lg border border-outline-variant text-body-md space-y-1">
            <p className="font-semibold text-primary">Velmar Technology SRL</p>
            <p>Atn: Oficial de Privacidad de Datos</p>
            <p>Correo: privacy@velmartech.com</p>
            <p>Teléfono: +1 (800) 555-0199 ext. 4</p>
          </div>
        </>
      )
    }
  ];

  const privacySections = i18n.language === 'es_DO' ? privacyEs : privacyEn;

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-12 space-y-8 text-on-surface">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <h1 className="text-h1 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
            {t('legal.privacyTitle')}
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-1">
            {t('legal.lastUpdated')}: {i18n.language === 'es_DO' ? '18 de Junio, 2026' : 'June 18, 2026'}. {i18n.language === 'es_DO' ? 'Esta política describe cómo protegemos sus datos operativos y de cuenta.' : 'This policy describes how we protect your operational and account data.'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-lg border border-outline-variant text-label-sm text-on-surface-variant">
          <Shield className="h-4 w-4 text-secondary" />
          <span>{t('legal.compliantText')}</span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sticky Left Sidebar Navigation */}
        <div className="lg:col-span-1 lg:sticky lg:top-24 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm hidden lg:block">
          <h2 className="text-label-md font-bold text-on-surface uppercase tracking-wider px-3 mb-3">
            {t('legal.tableOfContents')}
          </h2>
          <nav className="space-y-1">
            {privacySections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all text-left cursor-pointer group"
              >
                <span className="truncate">{sec.title.split('. ')[1] || sec.title}</span>
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-secondary" />
              </button>
            ))}
          </nav>
        </div>

        {/* Scrolling Legal Text Content */}
        <div className="lg:col-span-3 space-y-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 shadow-sm">
          {/* Security Banner */}
          <div className="flex gap-3 bg-success/5 border border-success/20 rounded-xl p-4 text-body-md text-on-surface-variant">
            <Lock className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-primary">{t('legal.privacyAlertTitle')}</span> {t('legal.privacyAlertText')}
            </div>
          </div>

          <div className="space-y-8 divide-y divide-outline-variant/60">
            {privacySections.map((sec) => (
              <div
                key={sec.id}
                ref={(el) => {
                  sectionsRef.current[sec.id] = el;
                }}
                className="pt-6 first:pt-0 scroll-mt-24 space-y-3"
              >
                <h3 className="text-h3 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                  {sec.title}
                </h3>
                <div className="text-body-md text-on-surface-variant leading-relaxed space-y-2">
                  {sec.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
