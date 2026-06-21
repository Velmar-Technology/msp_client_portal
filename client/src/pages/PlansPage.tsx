import { useState } from 'react';
import { Check, X, Lock, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/components/Page';

export function PlansPage() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState('STANDARD');
  const [equipmentCount, setEquipmentCount] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');
  const [reference] = useState(() => `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`);

  const plans = [
    {
      id: 'BASIC',
      tier: t('plans.basic.tier'),
      name: t('plans.basic.name'),
      description: t('plans.basic.description'),
      price: 299,
      features: [
        { text: t('plans.features.remoteSupport'), included: true },
        { text: t('plans.features.basicMonitoring'), included: true },
        { text: t('plans.features.standardTicket'), included: true },
        { text: t('plans.features.preventiveMaintenance'), included: false },
      ],
    },
    {
      id: 'STANDARD',
      tier: t('plans.standard.tier'),
      name: t('plans.standard.name'),
      description: t('plans.standard.description'),
      price: 599,
      recommended: true,
      features: [
        { text: t('plans.features.basicEverything'), included: true },
        { text: t('plans.features.monthlyPreventive'), included: true },
        { text: t('plans.features.advancedPerformance'), included: true },
        { text: t('plans.features.osPatch'), included: true },
      ],
    },
    {
      id: 'PREMIUM',
      tier: t('plans.premium.tier'),
      name: t('plans.premium.name'),
      description: t('plans.premium.description'),
      price: 1299,
      features: [
        { text: t('plans.features.standardEverything'), included: true },
        { text: t('plans.features.managedBackup'), included: true },
        { text: t('plans.features.criticalSupport'), included: true },
        { text: t('plans.features.quarterlySecurity'), included: true },
      ],
    },
  ];

  const currentPlan = plans.find((p) => p.id === selectedPlan)!;
  const subtotal = currentPlan.price * equipmentCount;
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  return (
    <Page
      title={t('plans.title')}
      subtitle={t('plans.subtitle')}
    >

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-surface-container-lowest border rounded-xl p-6 pt-8 flex flex-col transition-all cursor-pointer text-on-surface ${
              selectedPlan === plan.id
                ? 'border-primary shadow-md ring-1 ring-primary'
                : 'border-outline-variant shadow-sm hover:shadow-md'
            }`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-on-primary px-3 py-1 rounded-full text-label-sm font-bold">
                  {t('plans.recommended')}
                </span>
              </div>
            )}

            <span className="inline-block mb-3 px-2 py-0.5 border border-outline-variant rounded text-mono w-fit text-on-surface-variant">
              {plan.tier}
            </span>

            <h3 className="text-h2 text-primary mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              {plan.name}
            </h3>
            <p className="text-body-md text-on-surface-variant mb-4">{plan.description}</p>

            <div className="mb-6">
              <span className="text-4xl font-bold text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                ${plan.price}
              </span>
              <span className="text-body-md text-on-surface-variant"> /mo</span>
            </div>

            <div className="space-y-3 flex-1">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-2">
                  {feature.included ? (
                    <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="h-5 w-5 text-on-surface-variant opacity-40 flex-shrink-0 mt-0.5" />
                  )}
                  <span className={`text-body-md ${feature.included ? 'text-on-surface' : 'text-on-surface-variant opacity-50'}`}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Equipment Count */}
            <div className="mt-6 flex items-center justify-between bg-surface-container-low rounded-lg p-3">
              <span className="text-label-md text-on-surface-variant">{t('plans.equipmentCount')}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setEquipmentCount(Math.max(1, equipmentCount - 1)); }}
                  className="w-8 h-8 border border-outline-variant rounded flex items-center justify-center hover:bg-surface-container transition-colors text-label-md cursor-pointer text-on-surface"
                >
                  −
                </button>
                <span className="w-8 text-center text-label-md font-medium">{equipmentCount}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setEquipmentCount(equipmentCount + 1); }}
                  className="w-8 h-8 border border-outline-variant rounded flex items-center justify-center hover:bg-surface-container transition-colors text-label-md cursor-pointer text-on-surface"
                >
                  +
                </button>
              </div>
            </div>

            <button
              className={`mt-4 w-full py-2.5 rounded-lg text-label-md transition-all cursor-pointer ${
                selectedPlan === plan.id
                  ? 'bg-primary text-on-primary hover:opacity-90'
                  : 'border border-outline-variant text-on-surface hover:bg-surface-container-low'
              }`}
            >
              {selectedPlan === plan.id ? `${t('plans.selected')}: ${plan.name}` : `${t('plans.select')} ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      {/* Payment Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-on-surface">
        {/* Payment Method */}
        <div>
          <h2 className="text-h2 text-primary mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            {t('plans.paymentMethod')}
          </h2>
          <div className="flex gap-0 mb-4 border-b border-outline-variant">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`px-4 py-2.5 text-label-md transition-colors cursor-pointer ${
                paymentMethod === 'card'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t('plans.creditCard')}
            </button>
            <button
              onClick={() => setPaymentMethod('transfer')}
              className={`px-4 py-2.5 text-label-md transition-colors cursor-pointer ${
                paymentMethod === 'transfer'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t('plans.bankTransfer')}
            </button>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-4">
            {paymentMethod === 'card' ? (
              <>
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">{t('plans.nameOnCard')}</label>
                  <input type="text" placeholder={t('plans.nameOnCardPlaceholder')} className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface" />
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">{t('plans.cardNumber')}</label>
                  <input type="text" placeholder={t('plans.cardNumberPlaceholder')} className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-md text-on-surface mb-1.5">{t('plans.expiration')}</label>
                    <input type="text" placeholder={t('plans.expirationPlaceholder')} className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface" />
                  </div>
                  <div>
                    <label className="block text-label-md text-on-surface mb-1.5">{t('plans.cvv')}</label>
                    <input type="text" placeholder={t('plans.cvvPlaceholder')} className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface" />
                  </div>
                </div>
                <button className="w-full bg-primary text-on-primary py-3 rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer">
                  <Lock className="h-4 w-4" />
                  {t('plans.processPayment')}
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-body-md text-on-surface-variant">
                <p className="mb-2">{t('plans.transferInstructions')}</p>
                <p className="text-mono font-medium text-on-surface">{t('plans.bankName')}</p>
                <p className="text-mono">{t('plans.bankAccount')}</p>
                <p className="text-mono">{t('plans.bankReference')}: {reference}</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <h2 className="text-h2 text-primary mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            {t('plans.orderSummary')}
          </h2>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-body-md font-medium">{currentPlan.name} {t('plans.planMonthly')}</p>
                  <p className="text-label-sm text-on-surface-variant">{equipmentCount}x {t('plans.equipmentCountSuffix')}</p>
                </div>
                <span className="text-body-md font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-body-md text-on-surface-variant">
                <span>{t('plans.taxes')}</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-outline-variant pt-3 flex justify-between">
                <span className="text-h3 font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{t('plans.total')}</span>
                <span className="text-h3 font-bold" style={{ fontFamily: 'var(--font-heading)' }}>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 bg-surface-container rounded-lg p-4 flex items-start gap-3">
              <Shield className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-label-md font-medium">{t('plans.encryptedTx')}</p>
                <p className="text-label-sm text-on-surface-variant">
                  {t('plans.militaryGradeSecurity')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
