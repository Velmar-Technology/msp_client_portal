import { useRef } from 'react';
import { FileText, ShieldAlert, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TermSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

export function TermsPage() {
  const { t, i18n } = useTranslation();
  const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToSection = (id: string) => {
    sectionsRef.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const termsEn: TermSection[] = [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms",
      content: (
        <>
          <p>
            By accessing or using the Velmar Technology SRL Managed Services Portal (&quot;MSP Portal&quot;, &quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). These Terms apply to all clients, administrators, technicians, and visitors who access or use the Service.
          </p>
          <p className="mt-3">
            If you disagree with any part of the terms, you must not access the Service. Your continued use of the portal constitutes acceptance of any changes or updates we publish.
          </p>
        </>
      )
    },
    {
      id: "services",
      title: "2. Description of Services",
      content: (
        <>
          <p>
            Velmar Technology SRL provides cloud-based IT managed services, help desk ticketing systems, hardware maintenance coordination, billing configuration, and system performance monitoring.
          </p>
          <p className="mt-3">
            The scope of services, specifications, and hardware allowances are dictated by the specific Plan purchased by the Client. We reserve the right to modify or discontinue features of the portal with appropriate notice.
          </p>
        </>
      )
    },
    {
      id: "sla",
      title: "3. Service Level Agreements (SLA)",
      content: (
        <>
          <p>
            We strive to provide premium response times and system availability. Standard ticket response times are based on priority levels:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Critical (Priority 1):</strong> First response within 1 hour. Immediate escalation to Tier-2 engineers.</li>
            <li><strong>High (Priority 2):</strong> First response within 4 hours.</li>
            <li><strong>Medium (Priority 3):</strong> First response within 12 hours.</li>
            <li><strong>Low (Priority 4):</strong> First response within 24 business hours.</li>
          </ul>
          <p className="mt-3">
            SLA metrics are tracked automatically within the ticket details. Failures to meet SLA response times due to factors within our control may qualify the Client for billing credits, subject to our master service agreement.
          </p>
        </>
      )
    },
    {
      id: "responsibilities",
      title: "4. Client Responsibilities",
      content: (
        <>
          <p>
            Clients are responsible for maintaining the confidentiality of their credentials and all activities occurring under their accounts.
          </p>
          <p className="mt-3">
            You agree to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Provide accurate, current, and complete registration information.</li>
            <li>Promptly notify Velmar Technology SRL of any security breaches or unauthorized use of accounts.</li>
            <li>Ensure that your local network devices conform to minimum hardware requirements to enable monitoring capabilities.</li>
          </ul>
        </>
      )
    },
    {
      id: "billing",
      title: "5. Billing and Payments",
      content: (
        <>
          <p>
            Clients agree to pay all fees associated with their selected plan in accordance with the billing terms in effect at the time the fee becomes payable.
          </p>
          <p className="mt-3">
            Invoices are generated on a monthly basis, specifying detailed tax summaries and plan breakdowns. Payments are due within 15 calendar days from the invoice date. Late payments may result in system monitoring suspension and account restriction.
          </p>
        </>
      )
    },
    {
      id: "intellectual-property",
      title: "6. Intellectual Property",
      content: (
        <>
          <p>
            The MSP Portal, including its source code, design layouts, graphics, database designs, and APIs, is the proprietary property of Velmar Technology SRL and is protected by copyright and intellectual property laws.
          </p>
          <p className="mt-3">
            Clients are granted a limited, non-exclusive, non-transferable license to access the portal for the sole purpose of managing their contracted IT infrastructure services.
          </p>
        </>
      )
    },
    {
      id: "liability",
      title: "7. Limitation of Liability",
      content: (
        <>
          <p>
            To the maximum extent permitted by applicable law, Velmar Technology SRL shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
          </p>
          <p className="mt-3">
            Our total liability for any claims under these terms shall not exceed the amount paid by the client in the three (3) months preceding the event giving rise to the claim.
          </p>
        </>
      )
    },
    {
      id: "contact",
      title: "8. Contact Information",
      content: (
        <>
          <p>
            If you have any questions or require clarification regarding these Terms of Service, please contact our legal team:
          </p>
          <div className="mt-3 p-4 bg-surface-container rounded-lg border border-outline-variant text-body-md space-y-1">
            <p className="font-semibold text-primary">Velmar Technology SRL</p>
            <p>Attn: Legal & Compliance Department</p>
            <p>Email: legal@velmartech.com</p>
            <p>Address: Av. Winston Churchill, Santo Domingo, Dominican Republic</p>
          </div>
        </>
      )
    }
  ];

  const termsEs: TermSection[] = [
    {
      id: "acceptance",
      title: "1. Aceptación de los Términos",
      content: (
        <>
          <p>
            Al acceder o utilizar el Portal de Servicios Gestionados de Velmar Technology SRL (&quot;Portal MSP&quot;, &quot;el Servicio&quot;), usted acepta estar sujeto a estos Términos de Servicio (&quot;Términos&quot;). Estos Términos se aplican a todos los clientes, administradores, técnicos y visitantes que acceden o utilizan el Servicio.
          </p>
          <p className="mt-3">
            Si no está de acuerdo con alguna parte de los términos, no debe acceder al Servicio. El uso continuado del portal constituye la aceptación de cualquier cambio o actualización que publiquemos.
          </p>
        </>
      )
    },
    {
      id: "services",
      title: "2. Descripción de los Servicios",
      content: (
        <>
          <p>
            Velmar Technology SRL proporciona servicios de TI gestionados basados en la nube, sistemas de tickets de mesa de ayuda, coordinación de mantenimiento de hardware, configuración de facturación y monitoreo del rendimiento del sistema.
          </p>
          <p className="mt-3">
            El alcance de los servicios, las especificaciones y los límites de hardware están dictados por el Plan específico adquirido por el Cliente. Nos reservamos el derecho de modificar o discontinuar funciones del portal con el aviso adecuado.
          </p>
        </>
      )
    },
    {
      id: "sla",
      title: "3. Acuerdos de Nivel de Servicio (SLA)",
      content: (
        <>
          <p>
            Nos esforzamos por ofrecer tiempos de respuesta y disponibilidad del sistema de primera calidad. Los tiempos de respuesta estándar para los tickets se basan en los niveles de prioridad:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Crítica (Prioridad 1):</strong> Primera respuesta dentro de 1 hora. Escalación inmediata a ingenieros de Nivel 2.</li>
            <li><strong>Alta (Prioridad 2):</strong> Primera respuesta dentro de 4 horas.</li>
            <li><strong>Media (Prioridad 3):</strong> Primera respuesta dentro de 12 horas.</li>
            <li><strong>Baja (Prioridad 4):</strong> Primera respuesta dentro de las 24 horas hábiles.</li>
          </ul>
          <p className="mt-3">
            Las métricas de SLA se registran automáticamente dentro de los detalles del ticket. Los incumplimientos de los tiempos de respuesta del SLA debido a factores bajo nuestro control pueden calificar al Cliente para obtener créditos de facturación, sujeto a nuestro acuerdo de servicio maestro.
          </p>
        </>
      )
    },
    {
      id: "responsibilities",
      title: "4. Responsabilidades del Cliente",
      content: (
        <>
          <p>
            Los clientes son responsables de mantener la confidencialidad de sus credenciales y de todas las actividades que ocurran bajo sus cuentas.
          </p>
          <p className="mt-3">
            Usted acepta:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Proporcionar información de registro precisa, actualizada y completa.</li>
            <li>Notificar de inmediato a Velmar Technology SRL sobre cualquier violación de seguridad o uso no autorizado de las cuentas.</li>
            <li>Asegurarse de que sus dispositivos de red local cumplan con los requisitos mínimos de hardware para habilitar las capacidades de monitoreo.</li>
          </ul>
        </>
      )
    },
    {
      id: "billing",
      title: "5. Facturación y Pagos",
      content: (
        <>
          <p>
            Los clientes aceptan pagar todas las tarifas asociadas con su plan seleccionado de acuerdo con los términos de facturación vigentes en el momento en que la tarifa sea exigible.
          </p>
          <p className="mt-3">
            Las facturas se generan mensualmente, especificando desgloses detallados de impuestos y planes. Los pagos vencen dentro de los 15 días calendario a partir de la fecha de la factura. Los pagos atrasados pueden resultar en la suspensión del monitoreo del sistema y la restricción de la cuenta.
          </p>
        </>
      )
    },
    {
      id: "intellectual-property",
      title: "6. Propiedad Intelectual",
      content: (
        <>
          <p>
            El Portal MSP, incluido su código fuente, diseños de pantalla, gráficos, diseños de bases de datos y API, es propiedad exclusiva de Velmar Technology SRL y está protegido por las leyes de derechos de autor y propiedad intelectual.
          </p>
          <p className="mt-3">
            Se concede a los Clientes una licencia limitada, no exclusiva e intransferible para acceder al portal con el único propósito de gestionar sus servicios de infraestructura de TI contratados.
          </p>
        </>
      )
    },
    {
      id: "liability",
      title: "7. Limitación de Responsabilidad",
      content: (
        <>
          <p>
            En la medida máxima permitida por la ley aplicable, Velmar Technology SRL no será responsable de ningún daño indirecto, incidental, especial, consecuente o punitivo, ni de ninguna pérdida de ganancias o ingresos, ya sea en que se incurra directa o indirectamente, o cualquier pérdida de datos, uso, buena voluntad u otras pérdidas intangibles.
          </p>
          <p className="mt-3">
            Nuestra responsabilidad total por cualquier reclamo bajo estos términos no excederá el monto pagado por el cliente en los tres (3) meses anteriores al evento que dio origen al reclamo.
          </p>
        </>
      )
    },
    {
      id: "contact",
      title: "8. Información de Contacto",
      content: (
        <>
          <p>
            Si tiene alguna pregunta o requiere aclaraciones sobre estos Términos de Servicio, comuníquese con nuestro equipo legal:
          </p>
          <div className="mt-3 p-4 bg-surface-container rounded-lg border border-outline-variant text-body-md space-y-1">
            <p className="font-semibold text-primary">Velmar Technology SRL</p>
            <p>Atn: Departamento de Cumplimiento y Asuntos Legales</p>
            <p>Correo: legal@velmartech.com</p>
            <p>Dirección: Av. Winston Churchill, Santo Domingo, República Dominicana</p>
          </div>
        </>
      )
    }
  ];

  const termSections = i18n.language === 'es_DO' ? termsEs : termsEn;

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-12 space-y-8 text-on-surface">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <h1 className="text-h1 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
            {t('legal.termsTitle')}
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-1">
            {t('legal.lastUpdated')}: {i18n.language === 'es_DO' ? '18 de Junio, 2026' : 'June 18, 2026'}. {i18n.language === 'es_DO' ? 'Lea estos términos atentamente antes de usar el portal.' : 'Please read these terms carefully before using the portal.'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-lg border border-outline-variant text-label-sm text-on-surface-variant">
          <FileText className="h-4 w-4 text-secondary" />
          <span>v2.4 {t('legal.effectiveText')}</span>
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
            {termSections.map((sec) => (
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
          {/* Important alert */}
          <div className="flex gap-3 bg-secondary/5 border border-secondary/20 rounded-xl p-4 text-body-md text-on-surface-variant">
            <ShieldAlert className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-primary">{t('legal.pleaseNote')}:</span> {t('legal.termsAlertText')}
            </div>
          </div>

          <div className="space-y-8 divide-y divide-outline-variant/60">
            {termSections.map((sec) => (
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
