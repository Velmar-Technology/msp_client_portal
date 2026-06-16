import { useState } from 'react';
import { Check, X, Lock, Shield } from 'lucide-react';

const plans = [
  {
    id: 'BASIC',
    tier: 'Level 1',
    name: 'Basic',
    description: 'Reactive remote support for non-critical infrastructure.',
    price: 299,
    features: [
      { text: 'Remote Support 8×5', included: true },
      { text: 'Basic Monitoring (Ping/Port)', included: true },
      { text: 'Standard Ticket Management', included: true },
      { text: 'Preventive Maintenance', included: false },
    ],
  },
  {
    id: 'STANDARD',
    tier: 'Level 2',
    name: 'Standard',
    description: 'Proactive support and regular system maintenance.',
    price: 599,
    recommended: true,
    features: [
      { text: 'Everything in Basic', included: true },
      { text: 'Monthly Preventive Maintenance', included: true },
      { text: 'Advanced Performance Monitoring', included: true },
      { text: 'OS Patch Management', included: true },
    ],
  },
  {
    id: 'PREMIUM',
    tier: 'Level 3',
    name: 'Premium',
    description: 'Full coverage, risk mitigation, and business continuity.',
    price: 1299,
    features: [
      { text: 'Everything in Standard', included: true },
      { text: 'Managed Backups & Recovery', included: true },
      { text: '24/7 Critical Support', included: true },
      { text: 'Quarterly Security Audit', included: true },
    ],
  },
];

export function PlansPage() {
  const [selectedPlan, setSelectedPlan] = useState('STANDARD');
  const [equipmentCount, setEquipmentCount] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');
  const [reference] = useState(() => `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`);

  const currentPlan = plans.find((p) => p.id === selectedPlan)!;
  const subtotal = currentPlan.price * equipmentCount;
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-h1 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
          Plan Selection
        </h1>
        <p className="text-body-lg text-on-surface-variant mt-1">
          Choose the managed service level that best fits your infrastructure needs. Upgrade or change your plan at any time.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-surface-container-lowest border rounded-xl p-6 flex flex-col transition-all cursor-pointer ${
              selectedPlan === plan.id
                ? 'border-primary shadow-md ring-1 ring-primary'
                : 'border-outline-variant shadow-sm hover:shadow-md'
            }`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-on-primary px-3 py-1 rounded-full text-label-sm font-bold">
                  RECOMMENDED
                </span>
              </div>
            )}

            <span className="inline-block mb-3 px-2 py-0.5 border border-outline-variant rounded text-mono w-fit">
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
              <span className="text-label-md text-on-surface-variant">Equipment Count</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setEquipmentCount(Math.max(1, equipmentCount - 1)); }}
                  className="w-8 h-8 border border-outline-variant rounded flex items-center justify-center hover:bg-surface-container transition-colors text-label-md"
                >
                  −
                </button>
                <span className="w-8 text-center text-label-md font-medium">{equipmentCount}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setEquipmentCount(equipmentCount + 1); }}
                  className="w-8 h-8 border border-outline-variant rounded flex items-center justify-center hover:bg-surface-container transition-colors text-label-md"
                >
                  +
                </button>
              </div>
            </div>

            <button
              className={`mt-4 w-full py-2.5 rounded-lg text-label-md transition-all ${
                selectedPlan === plan.id
                  ? 'bg-primary text-on-primary hover:opacity-90'
                  : 'border border-outline-variant text-on-surface hover:bg-surface-container-low'
              }`}
            >
              {selectedPlan === plan.id ? `Selected: ${plan.name}` : `Select ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      {/* Payment Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Method */}
        <div>
          <h2 className="text-h2 text-primary mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Payment Method
          </h2>
          <div className="flex gap-0 mb-4 border-b border-outline-variant">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`px-4 py-2.5 text-label-md transition-colors ${
                paymentMethod === 'card'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Credit Card
            </button>
            <button
              onClick={() => setPaymentMethod('transfer')}
              className={`px-4 py-2.5 text-label-md transition-colors ${
                paymentMethod === 'transfer'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Bank Transfer
            </button>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-4">
            {paymentMethod === 'card' ? (
              <>
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">Name on Card</label>
                  <input type="text" placeholder="e.g. John Smith" className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20" />
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">Card Number</label>
                  <input type="text" placeholder="0000 0000 0000 0000" className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-md text-on-surface mb-1.5">Expiration</label>
                    <input type="text" placeholder="MM/YY" className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20" />
                  </div>
                  <div>
                    <label className="block text-label-md text-on-surface mb-1.5">CVV</label>
                    <input type="text" placeholder="123" className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20" />
                  </div>
                </div>
                <button className="w-full bg-primary text-on-primary py-3 rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <Lock className="h-4 w-4" />
                  Process Secure Payment
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-body-md text-on-surface-variant">
                <p className="mb-2">Transfer to the following account:</p>
                <p className="text-mono font-medium text-on-surface">Bank: MSP National Bank</p>
                <p className="text-mono">Account: 1234-5678-9012-3456</p>
                <p className="text-mono">Reference: {reference}</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <h2 className="text-h2 text-primary mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Order Summary
          </h2>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-body-md font-medium">{currentPlan.name} Plan (Monthly)</p>
                  <p className="text-label-sm text-on-surface-variant">{equipmentCount}x equipment</p>
                </div>
                <span className="text-body-md font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-body-md text-on-surface-variant">
                <span>Taxes (IVA 16%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-outline-variant pt-3 flex justify-between">
                <span className="text-h3 font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Total</span>
                <span className="text-h3 font-bold" style={{ fontFamily: 'var(--font-heading)' }}>${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 bg-surface-container rounded-lg p-4 flex items-start gap-3">
              <Shield className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-label-md font-medium">Encrypted Transaction</p>
                <p className="text-label-sm text-on-surface-variant">
                  Your data is protected with military-grade SSL security.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
