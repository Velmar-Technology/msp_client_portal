export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: 'general' | 'tickets' | 'billing' | 'technical';
}

export const faqsEn: FAQ[] = [
  {
    id: 1,
    question: "What is the Velmar MSP Portal?",
    answer: "The Velmar MSP Portal is your central workspace for managed IT services. From here you can create and track support tickets, manage your service plan and device licenses, activate cloud backups, schedule maintenance, and review your billing — all in one place.",
    category: "general"
  },
  {
    id: 2,
    question: "How do I create a new support ticket?",
    answer: "Navigate to the 'Tickets' section in the sidebar and click the 'New Ticket' button. Fill in a title and description, choose a category (Repair, Warranty, or Service Outage), select a priority and an optional device, then submit. Your ticket is automatically assigned to an available technician, and you can track updates, add comments, and upload attachments from the ticket detail page.",
    category: "tickets"
  },
  {
    id: 3,
    question: "What is the 1-hour SLA and how does it work?",
    answer: "Warranty and Service Outage tickets receive priority handling: a technician must respond and start working on them within 1 hour of creation. Additionally, these tickets can only be cancelled within 60 minutes of being created. After that window, cancellation is no longer available and the ticket must be worked through the normal process.",
    category: "general"
  },
  {
    id: 4,
    question: "How do I view and pay my invoices?",
    answer: "Open the 'Billing' section in the sidebar to see your full invoice history, including amounts, taxes (ITBIS 18%), and payment status. You can pay any open invoice securely with PayPal by clicking 'Pay Now' on the invoice.",
    category: "billing"
  },
  {
    id: 5,
    question: "How do I change or manage my service plan?",
    answer: "Go to the 'Plans' page and use the 'Manage Subscription' tab. From there you can add or remove device licenses, switch to a different plan tier, or cancel your subscription. Plan changes and cancellations take effect at the end of your current billing cycle, and payments are processed via PayPal.",
    category: "billing"
  },
  {
    id: 6,
    question: "How do I cancel a ticket?",
    answer: "Open the ticket you want to cancel and use the 'Cancel Ticket' action on its detail page. Clients can only cancel their own tickets, and Warranty or Service Outage tickets can only be cancelled within the 1-hour SLA window from when they were created.",
    category: "tickets"
  },
  {
    id: 7,
    question: "How do I activate cloud backup on a device?",
    answer: "Open the 'Devices' section and generate an activation code for your device slot. Install the MSP Backup Agent on the device, choose 'Enter Activation Code', and enter the temporary 6-digit code. Once activated, your cloud storage is provisioned and you will see your Nextcloud credentials (user and password) to access and manage your backups.",
    category: "technical"
  },
  {
    id: 8,
    question: "How do I update my profile, notifications, or schedule maintenance?",
    answer: "Update your name, email, language, password, and avatar from the 'Profile' section. Choose which notification channels you receive (Portal, Email, and WhatsApp) under 'Notifications'. To plan routine checkups on your devices, use the 'Maintenance' section to schedule preventive maintenance with your assigned technician.",
    category: "technical"
  },
  {
    id: 9,
    question: "What are the rules regarding rates, NCF, taxes (ITBIS), and non-payment?",
    answer: "Prices are expressed in USD or DOP plus 18% ITBIS tax. Tax Credit Invoices (NCF) are issued if a valid RNC is provided before billing cutoff. For overdue accounts: Day 1 triggers an automated payment notice, Day 5 sets the account to read-only mode, Day 15 suspends access to the platform and support, and Day 30 permanently deletes data from servers for storage liberation.",
    category: "billing"
  }
];

export const faqsEs: FAQ[] = [
  {
    id: 1,
    question: "¿Qué es el Portal MSP de Velmar?",
    answer: "El Portal MSP de Velmar es su espacio de trabajo central para servicios de TI gestionados. Desde aquí puede crear y dar seguimiento a tickets de soporte, gestionar su plan de servicio y licencias de dispositivos, activar respaldos en la nube, programar mantenimientos y revisar su facturación — todo en un solo lugar.",
    category: "general"
  },
  {
    id: 2,
    question: "¿Cómo creo un nuevo ticket de soporte?",
    answer: "Navegue a la sección de 'Tickets' en la barra lateral y haga clic en el botón 'Nuevo Ticket'. Complete un título y descripción, elija una categoría (Reparación, Garantía o Caída de Servicio), seleccione una prioridad y un dispositivo opcional, y envíelo. Su ticket se asigna automáticamente a un técnico disponible, y puede dar seguimiento, añadir comentarios y subir archivos adjuntos desde la página de detalle del ticket.",
    category: "tickets"
  },
  {
    id: 3,
    question: "¿Qué es el SLA de 1 hora y cómo funciona?",
    answer: "Los tickets de Garantía y Caída de Servicio reciben manejo prioritario: un técnico debe responder y comenzar a trabajar en ellos dentro de 1 hora desde su creación. Además, estos tickets solo pueden cancelarse dentro de los 60 minutos posteriores a su creación. Pasada esa ventana, la cancelación ya no está disponible y el ticket debe resolverse mediante el proceso normal.",
    category: "general"
  },
  {
    id: 4,
    question: "¿Cómo puedo ver y pagar mis facturas?",
    answer: "Abra la sección de 'Facturación' en la barra lateral para ver el historial completo de sus facturas, incluyendo montos, impuestos (ITBIS 18%) y estado de pago. Puede pagar cualquier factura pendiente de forma segura con PayPal haciendo clic en 'Pagar Ahora' en la factura.",
    category: "billing"
  },
  {
    id: 5,
    question: "¿Cómo cambio o gestiono mi plan de servicio?",
    answer: "Vaya a la página de 'Planes' y use la pestaña 'Gestionar Suscripción'. Desde allí puede agregar o eliminar licencias de dispositivos, cambiar a un nivel de plan diferente o cancelar su suscripción. Los cambios de plan y cancelaciones tienen efecto al final de su ciclo de facturación actual, y los pagos se procesan mediante PayPal.",
    category: "billing"
  },
  {
    id: 6,
    question: "¿Cómo cancelo un ticket?",
    answer: "Abra el ticket que desea cancelar y use la acción 'Cancelar Ticket' en su página de detalle. Los clientes solo pueden cancelar sus propios tickets, y los tickets de Garantía o Caída de Servicio solo pueden cancelarse dentro de la ventana de SLA de 1 hora desde su creación.",
    category: "tickets"
  },
  {
    id: 7,
    question: "¿Cómo activo el respaldo en la nube en un dispositivo?",
    answer: "Abra la sección de 'Dispositivos' y genere un código de activación para la ranura de su dispositivo. Instale el Agente de Respaldo MSP en el equipo, elija 'Ingresar Código de Activación' e introduzca el código temporal de 6 dígitos. Una vez activado, su almacenamiento en la nube es aprovisionado y verá sus credenciales de Nextcloud (usuario y clave) para acceder y gestionar sus respaldos.",
    category: "technical"
  },
  {
    id: 8,
    question: "¿Cómo actualizo mi perfil, notificaciones o programo mantenimientos?",
    answer: "Actualice su nombre, correo electrónico, idioma, contraseña y avatar desde la sección de 'Perfil'. Elija qué canales de notificación desea recibir (Portal, Email y WhatsApp) en 'Notificaciones'. Para planificar revisiones rutinarias de sus equipos, use la sección de 'Mantenimiento' y programe mantenimiento preventivo con su técnico asignado.",
    category: "technical"
  },
  {
    id: 9,
    question: "¿Cuáles son las normas sobre tarifas, NCF, impuestos (ITBIS) y mora?",
    answer: "Los precios se expresan en USD o DOP más el 18% de ITBIS. Se emiten Comprobantes de Crédito Fiscal (NCF) si se provee un RNC válido antes del cierre del ciclo. Ante impagos: el Día 1 se emite aviso de cobro automático, el Día 5 la cuenta pasa a modo solo lectura, el Día 15 se suspende el acceso a plataforma y soporte, y al Día 30 se purgan y eliminan definitivamente los datos de los servidores.",
    category: "billing"
  }
];
