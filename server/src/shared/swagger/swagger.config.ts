import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Velmar Technology SRL MSP API',
      version: '1.0.0',
      description: 'REST API for the Velmar Technology SRL MSP System — a Managed Service Provider ticketing and subscription management platform.',
      contact: {
        name: 'Velmar Technology SRL Support Team',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['CLIENT', 'TECHNICIAN', 'ADMIN'] },
            specialty: { type: 'string', nullable: true },
            is_active: { type: 'boolean' },
            tenant_id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string', enum: ['REPAIR', 'WARRANTY', 'SERVICE_OUTAGE', 'PREVENTATIVE_MAINTENANCE', 'HELPDESK', 'AI'] },
            status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'RESOLVED', 'CLOSED', 'CANCELLED'] },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
            client_id: { type: 'string', format: 'uuid' },
            assigned_tech_id: { type: 'string', format: 'uuid', nullable: true },
            tenant_id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Subscription: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            client_id: { type: 'string', format: 'uuid' },
            service_name: { type: 'string' },
            plan: { type: 'string', enum: ['PL-001', 'PL-002', 'PL-003', 'PL-004', 'PL-005', 'PL-006', 'PL-007'] },
            status: { type: 'string', enum: ['ACTIVE', 'EXPIRING', 'EXPIRED', 'CANCELLED'] },
            renewal_date: { type: 'string', format: 'date-time' },
            equipment_count: { type: 'integer' },
            tenant_id: { type: 'string', format: 'uuid' },
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            invoice_number: { type: 'string' },
            amount: { type: 'number' },
            tax_amount: { type: 'number' },
            total: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'PAID', 'OVERDUE'] },
            invoice_date: { type: 'string', format: 'date' },
            due_date: { type: 'string', format: 'date' },
            tenant_id: { type: 'string', format: 'uuid' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            code: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Create a new account',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'name', 'tenantName', 'password', 'confirmPassword', 'clientType'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string', minLength: 2 },
                    tenantName: { type: 'string', minLength: 2 },
                    clientType: { type: 'string', enum: ['CLIENT', 'ENTERPRISE', 'STUDENT', 'OTHER'] },
                    password: { type: 'string', minLength: 8 },
                    confirmPassword: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Account created', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            '409': { description: 'Email already exists' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login and get JWT tokens',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Login successful' },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
      '/tickets': {
        get: {
          tags: ['Tickets'],
          summary: 'List tickets (filtered by role)',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: { '200': { description: 'Ticket list' } },
        },
        post: {
          tags: ['Tickets'],
          summary: 'Create a new ticket',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'description', 'category'],
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string', enum: ['REPAIR', 'WARRANTY', 'SERVICE_OUTAGE', 'PREVENTATIVE_MAINTENANCE', 'HELPDESK', 'AI'] },
                    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Ticket created' } },
        },
      },
      '/tickets/{id}/status': {
        patch: {
          tags: ['Tickets'],
          summary: 'Update ticket status (with SLA enforcement)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: { type: 'string' },
                    notes: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Status updated' },
            '403': { description: 'SLA violation or forbidden' },
          },
        },
      },
      '/subscriptions': {
        get: { tags: ['Subscriptions'], summary: 'List client subscriptions', responses: { '200': { description: 'Subscription list' } } },
        post: {
          tags: ['Subscriptions'],
          summary: 'Create a subscription',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { serviceName: { type: 'string' }, plan: { type: 'string' }, equipmentCount: { type: 'integer' } } } } },
          },
          responses: { '201': { description: 'Subscription created' } },
        },
      },
      '/invoices': {
        get: { tags: ['Invoices'], summary: 'List client invoices', responses: { '200': { description: 'Invoice list' } } },
      },
      '/users/me': {
        get: { tags: ['Users'], summary: 'Get current user profile', responses: { '200': { description: 'User profile' } } },
        patch: { tags: ['Users'], summary: 'Update profile', responses: { '200': { description: 'Updated profile' } } },
      },
      '/health': {
        get: { tags: ['System'], summary: 'Health check', security: [], responses: { '200': { description: 'API is running' } } },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
