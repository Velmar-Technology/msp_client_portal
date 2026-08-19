import { userRepository, UserRepository } from '@modules/auth/repositories/UserRepository';
import { planRepository, PlanRepository } from '@modules/subscriptions/repositories/PlanRepository';
import { SendQuoteInput } from '@shared/dtos/subscription.dto';
import { sendQuotationEmail } from '@shared/utils/emailService';
import { AppError } from '@shared/utils/AppError';
import { TAX_RATE } from '@shared/config/constants';

export class SubscriptionQuotationService {
  constructor(
    private userRepo: UserRepository = userRepository,
    private planRepo: PlanRepository = planRepository,
  ) {}

  async sendQuotation(data: SendQuoteInput, senderUserId: string, senderTenantId: string, role: string): Promise<void> {
    let recipientEmail = '';
    let recipientName = '';
    let recipientLanguage = 'en_US';

    if (data.unregisteredEmail) {
      recipientEmail = data.unregisteredEmail;
      recipientName = data.unregisteredName || 'Valued Customer';
      
      const senderUser = await this.userRepo.findById(senderUserId);
      if (senderUser) {
        recipientLanguage = senderUser.language || 'en_US';
      }
    } else {
      let targetClientId = senderUserId;
      if (role === 'ADMIN' && data.clientId) {
        targetClientId = data.clientId;
      }
      const clientUser = await this.userRepo.findById(targetClientId);
      if (!clientUser) {
        throw AppError.notFound('Client user not found');
      }
      if (clientUser.tenant_id !== senderTenantId && role !== 'ADMIN') {
        throw AppError.forbidden('Client does not belong to this tenant');
      }
      recipientEmail = clientUser.email;
      recipientName = clientUser.name;
      recipientLanguage = clientUser.language || 'en_US';
    }

    const planDetails = await this.planRepo.findById(data.plan);
    if (!planDetails) {
      throw AppError.notFound('Plan not found');
    }

    const billingCycle = data.billingCycle || 'monthly';
    const price = planDetails.price;
    const equipmentCount = data.equipmentCount;
    const priceMultiplier = billingCycle === 'annual' ? 12 * 0.8 : 1;
    const subtotal = Math.round(price * priceMultiplier * equipmentCount * 100) / 100;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    await sendQuotationEmail(
      recipientEmail,
      recipientName,
      planDetails,
      billingCycle,
      equipmentCount,
      subtotal,
      tax,
      total,
      recipientLanguage
    );
  }
}

export const subscriptionQuotationService = new SubscriptionQuotationService();
