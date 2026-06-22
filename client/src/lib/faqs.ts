export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: 'general' | 'tickets' | 'billing' | 'technical';
}

export const faqsEn: FAQ[] = [
  {
    id: 1,
    question: "How do I create a new support ticket?",
    answer: "To create a support ticket, navigate to the 'Tickets' section in the sidebar menu and click on the 'New Ticket' button. Fill out the form with your issue details, select a category and priority, and submit. You can also track updates and add comments on that same ticket.",
    category: "tickets"
  },
  {
    id: 2,
    question: "What is the 1-hour SLA guarantee?",
    answer: "For critical infrastructure issues and specific hardware warranties under our premium plans, we guarantee a first-response resolution effort or assessment within 1 hour. If we do not respond within this timeframe, the ticket is auto-escalated to tier-2 engineers and service credits may apply.",
    category: "general"
  },
  {
    id: 3,
    question: "How do I view and pay my invoices?",
    answer: "You can view your billing history by clicking on the 'Billing' link in the sidebar or footer. There you will see a history of all invoices, tax breakdowns, and payment statuses. Payments are processed securely via standard institutional protocols configured on your account.",
    category: "billing"
  },
  {
    id: 4,
    question: "How is my server/system configuration monitored?",
    answer: "Our monitoring agents check server health, CPU load, disk space, and network latency every 60 seconds. If a metric crosses a critical threshold, our system automatically creates a high-priority ticket and alerts your dedicated network administrator.",
    category: "technical"
  },
  {
    id: 5,
    question: "Can I upgrade or downgrade my support plan?",
    answer: "Yes, you can browse available plans under the 'Plans' tab in the sidebar. To request a plan change, you can submit a ticket under the 'Billing / Plan Update' category, and our account managers will execute the transition at the end of the billing cycle.",
    category: "billing"
  },
  {
    id: 6,
    question: "What happens if a ticket is marked resolved but the issue persists?",
    answer: "If the issue returns, you can reopen the ticket within 72 hours by commenting on it directly. After 72 hours, tickets are permanently closed to maintain accurate logging; in that case, please create a new ticket and reference the old ticket number.",
    category: "tickets"
  },
  {
    id: 7,
    question: "Is multi-factor authentication (MFA) supported?",
    answer: "Absolutely. Security is our priority. You can configure multi-factor authentication (MFA) from your Profile page to add an extra layer of protection to your client portal account.",
    category: "technical"
  },
  {
    id: 8,
    question: "How do I update my profile details?",
    answer: "Go to the 'Profile' section via the sidebar or by clicking your avatar in the top-right menu. You can update your display name, email, and security settings there.",
    category: "general"
  }
];

export const faqsEs: FAQ[] = [
  {
    id: 1,
    question: "¿Cómo creo un nuevo ticket de soporte?",
    answer: "Para crear un ticket de soporte, navegue a la sección de 'Tickets' en el menú lateral y haga clic en el botón 'Nuevo Ticket'. Complete el formulario con los detalles del problema, seleccione una categoría y prioridad, y envíelo. También puede realizar el seguimiento de actualizaciones y añadir comentarios en ese mismo ticket.",
    category: "tickets"
  },
  {
    id: 2,
    question: "¿Qué es la garantía de SLA de 1 hora?",
    answer: "Para problemas críticos de infraestructura y garantías de hardware específicas bajo nuestros planes premium, garantizamos un primer esfuerzo de respuesta o evaluación dentro de 1 hora. Si no respondemos en este plazo, el ticket se escala automáticamente a ingenieros de nivel 2 y se pueden aplicar créditos de servicio.",
    category: "general"
  },
  {
    id: 3,
    question: "¿Cómo puedo ver y pagar mis facturas?",
    answer: "Puede ver su historial de facturación haciendo clic en el enlace 'Facturación' en la barra lateral o en el pie de página. Allí verá el historial de todas las facturas, desglose de impuestos y estados de pago. Los pagos se procesan de forma segura mediante protocolos institucionales estándar configurados en su cuenta.",
    category: "billing"
  },
  {
    id: 4,
    question: "¿Cómo se monitorea la configuración de mi servidor/sistema?",
    answer: "Nuestros agentes de monitoreo verifican la salud del servidor, la carga de la CPU, el espacio en disco y la latencia de la red cada 60 segundos. Si alguna métrica supera un umbral crítico, nuestro sistema genera automáticamente un ticket de alta prioridad y alerta a su administrador de red dedicado.",
    category: "technical"
  },
  {
    id: 5,
    question: "¿Puedo actualizar o bajar de categoría mi plan de soporte?",
    answer: "Sí, puede explorar los planes disponibles en la pestaña 'Planes' en la barra lateral. Para solicitar un cambio de plan, puede enviar un ticket en la categoría 'Facturación / Actualización de Plan', y nuestros gerentes de cuenta realizarán la transición al final del ciclo de facturación.",
    category: "billing"
  },
  {
    id: 6,
    question: "¿Qué sucede si un ticket se marca como resuelto pero el problema persiste?",
    answer: "Si el problema vuelve a ocurrir, puede reabrir el ticket dentro de las 72 horas comentando directamente en él. Después de 72 horas, los tickets se cierran permanentemente para mantener un registro preciso; en ese caso, cree un nuevo ticket y haga referencia al número del ticket anterior.",
    category: "tickets"
  },
  {
    id: 7,
    question: "¿Se admite la autenticación de múltiples factores (MFA)?",
    answer: "Absolutamente. La seguridad es nuestra prioridad. Puede configurar la autenticación de múltiples factores (MFA) desde su página de Perfil para agregar una capa adicional de protección a su cuenta de portal de cliente.",
    category: "technical"
  },
  {
    id: 8,
    question: "¿Cómo actualizo los detalles de mi perfil?",
    answer: "Vaya a la sección 'Perfil' a través de la barra lateral o haciendo clic en su avatar en el menú superior derecho. Puede actualizar su nombre para mostrar, correo electrónico y configuración de seguridad allí.",
    category: "general"
  }
];
