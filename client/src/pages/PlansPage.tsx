import { useState, useEffect, useCallback } from 'react';
import { Check, X, Lock, Shield, Edit, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/components/Page';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { usePlanStore } from '@/store/usePlanStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import type { Plan, PlanFeature } from '@/services/planService';
import { userService } from '@/services/userService';
import { subscriptionService } from '@/services/subscriptionService';
import type { Subscription } from '@/services/subscriptionService';
import type { AuthUser } from '@/store/useAuthStore';

export function PlansPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { plans, loading, fetchPlans, updatePlan, createPlan } = usePlanStore();
  const { addToast } = useNotificationStore();

  const [userSelectedPlan, setUserSelectedPlan] = useState<string | null>(null);
  const [equipmentCount, setEquipmentCount] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');
  const [reference] = useState(() => `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Admin Editor State
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState<Record<string, string>>({ en_US: '', es_DO: '' });
  const [editDescription, setEditDescription] = useState<Record<string, string>>({ en_US: '', es_DO: '' });
  const [editPrice, setEditPrice] = useState(0);
  const [editRecommended, setEditRecommended] = useState(false);
  const [editClientType, setEditClientType] = useState('CLIENT');
  const [editActive, setEditActive] = useState(true);
  const [editFeatures, setEditFeatures] = useState<PlanFeature[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Admin apply plan state
  const [clients, setClients] = useState<AuthUser[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [subscribeLoading, setSubscribeLoading] = useState(false);

  // Active plan management state
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const filteredPlans = plans.filter((plan) => {
    if (isAdmin || user?.role === 'TECHNICIAN') return true;
    const userClientType = user?.clientType || 'CLIENT';
    const planClientType = plan.client_type || 'CLIENT';
    return plan.active !== false && planClientType === userClientType;
  });

  const fetchActiveSubscription = useCallback(async () => {
    if (isAdmin || user?.role !== 'CLIENT') return;
    try {
      const subs = await subscriptionService.getAll();
      const active = subs.find((sub) => sub.status === 'ACTIVE');
      setActiveSubscription(active || null);
      if (active) {
        setUserSelectedPlan(active.plan);
        setEquipmentCount(active.equipment_count);
        if (active.service_name.includes('(Annual)')) {
          setBillingCycle('annual');
        } else {
          setBillingCycle('monthly');
        }
      }
    } catch (err) {
      console.error('Failed to fetch active subscription:', err);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    fetchPlans().catch((err) => console.error('Failed to fetch plans:', err));
  }, [fetchPlans]);

  useEffect(() => {
    if (isAdmin) {
      userService.getClients()
        .then((data) => {
          setClients(data || []);
          if (data && data.length > 0) {
            setSelectedClientId(data[0].id);
          }
        })
        .catch((err) => console.error('Failed to fetch clients:', err));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchActiveSubscription();
    }
  }, [isAdmin, user, fetchActiveSubscription]);

  const selectedPlan = userSelectedPlan || activeSubscription?.plan || (filteredPlans.find((p) => p.id === 'STANDARD') ? 'STANDARD' : (filteredPlans[0]?.id || ''));

  const currentPlan = filteredPlans.find((p) => p.id === selectedPlan) || filteredPlans.find((p) => p.id === 'STANDARD') || filteredPlans[0];

  const handleProcessSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlan) return;

    if (isAdmin && !selectedClientId) {
      addToast({
        title: 'Validation Error',
        message: 'Please select a customer to apply the plan to.',
        type: 'error',
      });
      return;
    }

    setSubscribeLoading(true);
    try {
      await subscriptionService.create({
        serviceName: getPlanName(currentPlan.name),
        plan: currentPlan.id,
        equipmentCount,
        clientId: isAdmin ? selectedClientId : undefined,
        billingCycle,
      });

      addToast({
        title: isAdmin ? 'Plan Applied' : 'Subscribed Successfully',
        message: isAdmin
          ? `Successfully applied the ${getPlanName(currentPlan.name)} plan to the customer.`
          : `Successfully subscribed to the ${getPlanName(currentPlan.name)} plan.`,
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to create subscription:', err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: 'Subscription Failed',
        message: error.response?.data?.message || error.message || 'Failed to create subscription.',
        type: 'error',
      });
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!activeSubscription || !currentPlan) return;
    setSubscribeLoading(true);
    try {
      await subscriptionService.update(activeSubscription.id, {
        plan: currentPlan.id,
        equipmentCount: equipmentCount,
      });
      addToast({
        title: 'Subscription Updated',
        message: `Successfully updated your subscription to ${getPlanName(currentPlan.name)}.`,
        type: 'success',
      });
      await fetchActiveSubscription();
    } catch (err) {
      console.error('Failed to update subscription:', err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: 'Update Failed',
        message: error.response?.data?.message || error.message || 'Failed to update subscription.',
        type: 'error',
      });
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!activeSubscription) return;
    
    const confirmCancel = window.confirm(
      'Are you sure you want to cancel your subscription? This action will take effect immediately.'
    );
    if (!confirmCancel) return;

    setSubscribeLoading(true);
    try {
      await subscriptionService.update(activeSubscription.id, {
        status: 'CANCELLED',
      });
      addToast({
        title: 'Subscription Cancelled',
        message: 'Your subscription has been successfully cancelled.',
        type: 'success',
      });
      setActiveSubscription(null);
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: 'Cancellation Failed',
        message: error.response?.data?.message || error.message || 'Failed to cancel subscription.',
        type: 'error',
      });
    } finally {
      setSubscribeLoading(false);
    }
  };

  const priceMultiplier = billingCycle === 'annual' ? 12 * 0.8 : 1;
  const subtotal = currentPlan ? Math.round(currentPlan.price * priceMultiplier * equipmentCount * 100) / 100 : 0;
  const tax = Math.round(subtotal * 0.18 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const getLocalizedValue = (val: string | Record<string, string> | null | undefined): string => {
    if (!val) return '';
    if (typeof val === 'string') {
      return val;
    }
    const lang = i18n.language || 'en_US';
    const resolvedLang = lang.startsWith('es') ? 'es_DO' : 'en_US';
    
    if (val[resolvedLang]) return val[resolvedLang];
    if (val['en_US']) return val['en_US'];
    const keys = Object.keys(val);
    if (keys.length > 0) return val[keys[0]];
    return '';
  };

  const getPlanName = (name: string | Record<string, string>) => getLocalizedValue(name);
  const getPlanDescription = (desc: string | Record<string, string> | null | undefined) => getLocalizedValue(desc);

  const getFeatureText = (text: string | Record<string, string>) => {
    if (typeof text !== 'string') {
      return getLocalizedValue(text);
    }
    // If the text looks like a translation key (no spaces), translate it
    if (/^[a-zA-Z0-9_]+$/.test(text)) {
      const translated = t(`plans.features.${text}`);
      if (translated !== `plans.features.${text}`) {
        return translated;
      }
    }
    return text;
  };

  const getTierLabel = (planId: string) => {
    if (planId === 'BASIC') return t('plans.basic.tier') || 'Level 1';
    if (planId === 'STANDARD') return t('plans.standard.tier') || 'Level 2';
    if (planId === 'PREMIUM') return t('plans.premium.tier') || 'Level 3';
    return 'Level';
  };

  // Open Edit Modal
  const handleEditClick = (plan: Plan) => {
    setIsCreateMode(false);
    setEditingPlan(plan);
    setEditId(plan.id);

    // Parse name
    if (typeof plan.name === 'string') {
      setEditName({ en_US: plan.name, es_DO: plan.name });
    } else {
      setEditName({
        en_US: plan.name?.en_US || '',
        es_DO: plan.name?.es_DO || '',
      });
    }

    // Parse description
    if (!plan.description) {
      setEditDescription({ en_US: '', es_DO: '' });
    } else if (typeof plan.description === 'string') {
      setEditDescription({ en_US: plan.description, es_DO: plan.description });
    } else {
      setEditDescription({
        en_US: plan.description?.en_US || '',
        es_DO: plan.description?.es_DO || '',
      });
    }

    setEditPrice(plan.price);
    setEditRecommended(plan.recommended);
    setEditClientType(plan.client_type || 'CLIENT');
    setEditActive(plan.active !== undefined ? plan.active : true);

    // Parse features
    const parsedFeatures = plan.features.map((f) => {
      let textObj: Record<string, string>;
      if (typeof f.text === 'string') {
        textObj = { en_US: f.text, es_DO: f.text };
      } else {
        textObj = {
          en_US: f.text?.en_US || '',
          es_DO: f.text?.es_DO || '',
        };
      }
      return {
        ...f,
        text: textObj,
      };
    });
    setEditFeatures(parsedFeatures);
  };

  // Open Create Modal
  const handleCreateClick = () => {
    setIsCreateMode(true);
    setEditingPlan({
      id: '',
      name: { en_US: '', es_DO: '' },
      description: { en_US: '', es_DO: '' },
      price: 0,
      features: [],
      recommended: false,
      client_type: 'CLIENT',
      active: true,
      created_at: '',
      updated_at: '',
    });
    setEditId('');
    setEditName({ en_US: '', es_DO: '' });
    setEditDescription({ en_US: '', es_DO: '' });
    setEditPrice(0);
    setEditRecommended(false);
    setEditClientType('CLIENT');
    setEditActive(true);
    setEditFeatures([]);
  };

  // Add Feature
  const handleAddFeature = () => {
    setEditFeatures([...editFeatures, { text: { en_US: '', es_DO: '' }, included: true }]);
  };

  // Delete Feature
  const handleDeleteFeature = (index: number) => {
    setEditFeatures(editFeatures.filter((_, i) => i !== index));
  };

  // Toggle Feature Included
  const handleToggleFeatureIncluded = (index: number, included: boolean) => {
    setEditFeatures(
      editFeatures.map((f, i) => (i === index ? { ...f, included } : f))
    );
  };

  // Edit Feature Text
  const handleEditFeatureText = (index: number, lang: 'en_US' | 'es_DO', textVal: string) => {
    setEditFeatures(
      editFeatures.map((f, i) => {
        if (i !== index) return f;
        let textObj: Record<string, string>;
        if (typeof f.text === 'string') {
          textObj = { en_US: f.text, es_DO: f.text };
        } else {
          textObj = { ...f.text };
        }
        textObj[lang] = textVal;
        return { ...f, text: textObj };
      })
    );
  };

  // Move Feature (Accessible keyboard controls)
  const handleMoveFeature = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= editFeatures.length) return;
    const updated = [...editFeatures];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setEditFeatures(updated);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const updated = [...editFeatures];
    const [removed] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, removed);
    setEditFeatures(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Helper to fallback languages if one is missing
  const cleanBilingualRecord = (rec: Record<string, string>): Record<string, string> => {
    const en = (rec.en_US || '').trim();
    const es = (rec.es_DO || '').trim();
    return {
      en_US: en || es,
      es_DO: es || en,
    };
  };

  // Save Plan
  const handleSavePlan = async () => {
    if (!editingPlan) return;
    if (isCreateMode && !editId.trim()) {
      addToast({
        title: 'Validation Error',
        message: 'Plan ID is required.',
        type: 'error',
      });
      return;
    }

    const finalName = cleanBilingualRecord(editName);
    if (!finalName.en_US) {
      addToast({
        title: 'Validation Error',
        message: 'Plan name is required.',
        type: 'error',
      });
      return;
    }

    const finalDescription = cleanBilingualRecord(editDescription);

    setSaveLoading(true);
    try {
      // Filter out empty features and apply billing clean record logic
      const filteredFeatures = editFeatures
        .map((f) => {
          let textObj: Record<string, string>;
          if (typeof f.text === 'string') {
            textObj = { en_US: f.text, es_DO: f.text };
          } else {
            textObj = f.text;
          }
          return {
            ...f,
            text: cleanBilingualRecord(textObj),
          };
        })
        .filter((f) => f.text.en_US !== '');

      const planNameStr = getPlanName(finalName);

      if (isCreateMode) {
        await createPlan({
          id: editId.trim(),
          name: finalName,
          description: finalDescription.en_US ? finalDescription : null,
          price: editPrice,
          recommended: editRecommended,
          client_type: editClientType,
          active: editActive,
          features: filteredFeatures,
        });

        addToast({
          title: 'Plan Created',
          message: `${planNameStr} plan has been created successfully.`,
          type: 'success',
        });
      } else {
        await updatePlan(editingPlan.id, {
          name: finalName,
          description: finalDescription.en_US ? finalDescription : null,
          price: editPrice,
          recommended: editRecommended,
          client_type: editClientType,
          active: editActive,
          features: filteredFeatures,
        });

        addToast({
          title: 'Plan Updated',
          message: `${planNameStr} plan has been updated successfully.`,
          type: 'success',
        });
      }
      setEditingPlan(null);
    } catch (err) {
      console.error('Failed to save plan:', err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: 'Save Failed',
        message: error.response?.data?.message || error.message || 'Failed to save plan.',
        type: 'error',
      });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <Page
      title={t('plans.title')}
      subtitle={t('plans.subtitle')}
      isLoading={loading && filteredPlans.length === 0}
    >
      {/* Billing Cycle Switcher & Admin Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div className="md:w-1/3" /> {/* Left Spacer */}
        <div className="bg-surface-container-low border border-outline-variant p-1 rounded-xl flex items-center gap-1">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-lg text-label-md font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              billingCycle === 'annual'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>Annually</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              billingCycle === 'annual'
                ? 'bg-on-primary text-primary'
                : 'bg-primary/10 text-primary'
            }`}>
              Save 20%
            </span>
          </button>
        </div>
        <div className="md:w-1/3 flex justify-end">
          {isAdmin && (
            <button
              type="button"
              onClick={handleCreateClick}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg text-label-md font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>+ Add Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 justify-center gap-6 mb-12">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-surface-container-lowest border rounded-xl p-6 pt-8 flex flex-col transition-all cursor-pointer text-on-surface ${
              selectedPlan === plan.id
                ? 'border-primary shadow-md ring-1 ring-primary'
                : 'border-outline-variant shadow-sm hover:shadow-md'
            } ${plan.active === false ? 'opacity-70 bg-surface-container-low/40 border-dashed' : ''}`}
            onClick={() => setUserSelectedPlan(plan.id)}
          >
            {/* Disabled Badge */}
            {plan.active === false && (
              <div className="absolute top-3 left-3">
                <span className="bg-error/15 text-error border border-error/30 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                  Disabled
                </span>
              </div>
            )}

            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-on-primary px-3 py-1 rounded-full text-label-sm font-bold">
                  {t('plans.recommended')}
                </span>
              </div>
            )}

            {/* Admin Edit Trigger */}
            {isAdmin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClick(plan);
                }}
                className="absolute top-3 right-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant p-1.5 rounded-lg transition-colors cursor-pointer text-on-surface-variant flex items-center gap-1 text-[11px] font-semibold z-10"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </button>
            )}

            {/* Active Status Badge */}
            {!isAdmin && activeSubscription && activeSubscription.plan === plan.id && (
              <span className="absolute top-3 right-3 bg-success/15 text-success border border-success/30 px-2.5 py-1 rounded-lg text-label-sm font-bold animate-pulse z-10">
                Active
              </span>
            )}

            <span className="inline-block mb-3 px-2 py-0.5 border border-outline-variant rounded text-mono w-fit text-on-surface-variant">
              {getTierLabel(plan.id)}
            </span>

            <h3 className="text-h2 text-primary mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              {getPlanName(plan.name)}
            </h3>
            <p className="text-body-md text-on-surface-variant mb-4">{getPlanDescription(plan.description)}</p>

            <div className="mb-6">
              {billingCycle === 'annual' ? (
                <>
                  <span className="text-4xl font-bold text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                    ${(plan.price * 0.8).toFixed(2)}
                  </span>
                  <span className="text-body-md text-on-surface-variant"> /mo</span>
                  <div className="text-label-sm text-on-surface-variant mt-1 font-medium">
                    Billed annually as ${(plan.price * 12 * 0.8).toFixed(2)}/yr
                  </div>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                    ${plan.price}
                  </span>
                  <span className="text-body-md text-on-surface-variant"> /mo</span>
                  <div className="text-label-sm text-on-surface-variant mt-1 opacity-0 select-none">
                    Placeholder
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3 flex-1">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-2">
                  {feature.included ? (
                    <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  ) : (
                    <X className="h-5 w-5 text-on-surface-variant opacity-40 shrink-0 mt-0.5" />
                  )}
                  <span className={`text-body-md ${feature.included ? 'text-on-surface' : 'text-on-surface-variant opacity-50'}`}>
                    {getFeatureText(feature.text)}
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
              {selectedPlan === plan.id ? `${t('plans.selected')}: ${getPlanName(plan.name)}` : `${t('plans.select')} ${getPlanName(plan.name)}`}
            </button>
          </div>
        ))}
      </div>

      {/* Payment Section */}
      {currentPlan && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-on-surface">
          {/* Payment Method or Admin Apply */}
          <div>
            {isAdmin ? (
              <div className="space-y-4">
                <h2 className="text-h2 text-primary mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                  Apply Plan to Customer
                </h2>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-4">
                  <div>
                    <label htmlFor="customer-select" className="block text-label-md text-on-surface mb-1.5 font-medium">
                      Select Customer
                    </label>
                    <select
                      id="customer-select"
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface"
                    >
                      {clients.length === 0 ? (
                        <option value="">No registered customers found</option>
                      ) : (
                        clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name} ({client.email})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <button
                    onClick={handleProcessSubscription}
                    disabled={subscribeLoading || clients.length === 0}
                    className="w-full bg-primary text-on-primary py-3 rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-semibold"
                  >
                    {subscribeLoading ? 'Applying...' : 'Apply Plan to Customer'}
                  </button>
                </div>
              </div>
            ) : activeSubscription ? (
              <div className="space-y-4">
                <h2 className="text-h2 text-primary mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                  Manage Active Subscription
                </h2>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-outline-variant pb-4">
                    <div>
                      <p className="text-label-sm text-on-surface-variant font-medium uppercase tracking-wider">Current Service</p>
                      <p className="text-h3 font-bold text-primary mt-0.5">{activeSubscription.service_name}</p>
                    </div>
                    <span className="bg-success/15 text-success border border-success/30 px-2.5 py-1 rounded-full text-label-sm font-bold">
                      ACTIVE
                    </span>
                  </div>

                  {(selectedPlan !== activeSubscription.plan || equipmentCount !== activeSubscription.equipment_count) ? (
                    <div className="space-y-4">
                      <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                        <p className="text-body-md font-semibold text-primary">Subscription Modification</p>
                        <p className="text-body-sm text-on-surface-variant mt-1">
                          You are modifying your subscription to the <strong className="text-on-surface">{getPlanName(currentPlan.name)}</strong> plan with <strong className="text-on-surface">{equipmentCount}x</strong> equipment.
                        </p>
                      </div>

                      <button
                        onClick={handleUpdateSubscription}
                        disabled={subscribeLoading}
                        className="w-full bg-primary text-on-primary py-3 rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-semibold"
                      >
                        {subscribeLoading ? 'Updating...' : 'Update Subscription'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-error/5 border border-error/10 rounded-lg p-4">
                        <p className="text-body-md font-semibold text-error">Cancellation Warning</p>
                        <p className="text-body-sm text-on-surface-variant mt-1">
                          Cancelling your subscription will take effect immediately. You will lose access to premium support services.
                        </p>
                      </div>

                      <button
                        onClick={handleCancelSubscription}
                        disabled={subscribeLoading}
                        className="w-full bg-error text-on-error py-3 rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-semibold"
                      >
                        {subscribeLoading ? 'Cancelling...' : 'Cancel Subscription'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
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
                        <label htmlFor="card-name" className="block text-label-md text-on-surface mb-1.5">{t('plans.nameOnCard')}</label>
                        <Input id="card-name" type="text" placeholder={t('plans.nameOnCardPlaceholder')} className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface" />
                      </div>
                      <div>
                        <label htmlFor="card-number" className="block text-label-md text-on-surface mb-1.5">{t('plans.cardNumber')}</label>
                        <Input id="card-number" type="text" placeholder={t('plans.cardNumberPlaceholder')} className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="card-expiration" className="block text-label-md text-on-surface mb-1.5">{t('plans.expiration')}</label>
                          <Input id="card-expiration" type="text" placeholder={t('plans.expirationPlaceholder')} className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface" />
                        </div>
                        <div>
                          <label htmlFor="card-cvv" className="block text-label-md text-on-surface mb-1.5">{t('plans.cvv')}</label>
                          <Input id="card-cvv" type="text" placeholder={t('plans.cvvPlaceholder')} className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface" />
                        </div>
                      </div>
                      <button
                        onClick={handleProcessSubscription}
                        disabled={subscribeLoading}
                        className="w-full bg-primary text-on-primary py-3 rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-semibold"
                      >
                        {subscribeLoading ? (
                          'Processing...'
                        ) : (
                          <>
                            <Lock className="h-4 w-4" />
                            {t('plans.processPayment')}
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-8 text-body-md text-on-surface-variant space-y-4">
                      <p className="mb-2">{t('plans.transferInstructions')}</p>
                      <p className="text-mono font-medium text-on-surface">{t('plans.bankName')}</p>
                      <p className="text-mono">{t('plans.bankAccount')}</p>
                      <p className="text-mono">{t('plans.bankReference')}: {reference}</p>
                      <button
                        onClick={handleProcessSubscription}
                        disabled={subscribeLoading}
                        className="mt-4 w-full bg-primary text-on-primary py-3 rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-semibold"
                      >
                        {subscribeLoading ? 'Processing...' : 'Confirm Bank Transfer Intent'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
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
                    <p className="text-body-md font-medium">{getPlanName(currentPlan.name)} {billingCycle === 'annual' ? 'Plan (Annually)' : t('plans.planMonthly')}</p>
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
                <Shield className="h-5 w-5 text-success shrink-0 mt-0.5" />
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
      )}

      {/* Plan Edit Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl text-on-surface">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-h3 font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                {isCreateMode ? 'Add New Plan' : `Edit Plan: ${editingPlan.id}`}
              </h3>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-1 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer text-on-surface-variant"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                {isCreateMode ? (
                  <div>
                    <label htmlFor="edit-id" className="block text-label-md text-on-surface mb-1.5">Plan ID</label>
                    <Input
                      id="edit-id"
                      type="text"
                      value={editId}
                      onChange={(e) => setEditId(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                      placeholder="e.g. PL-008"
                      className="w-full bg-surface-container-lowest text-on-surface border border-outline-variant"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="edit-id" className="block text-label-md text-on-surface mb-1.5">Plan ID</label>
                    <Input
                      id="edit-id"
                      type="text"
                      value={editId}
                      disabled
                      className="w-full bg-surface-container-low text-on-surface-variant border border-outline-variant opacity-70"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="edit-client-type" className="block text-label-md text-on-surface mb-1.5">Client Type</label>
                  <select
                    id="edit-client-type"
                    value={editClientType}
                    onChange={(e) => setEditClientType(e.target.value)}
                    className="w-full h-10 px-3 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary bg-surface-container-lowest text-on-surface"
                  >
                    <option value="CLIENT">Standard Client</option>
                    <option value="ENTERPRISE">Enterprise Client</option>
                    <option value="STUDENT">Student Starter</option>
                    <option value="OTHER">Other / Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-label-md text-on-surface mb-1.5 font-semibold">Plan Name</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-on-surface-variant w-6">EN</span>
                    <Input
                      type="text"
                      value={editName.en_US || ''}
                      onChange={(e) => setEditName({ ...editName, en_US: e.target.value })}
                      className="flex-1 bg-surface-container-lowest text-on-surface border border-outline-variant"
                      placeholder="Plan name in English"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-on-surface-variant w-6">ES</span>
                    <Input
                      type="text"
                      value={editName.es_DO || ''}
                      onChange={(e) => setEditName({ ...editName, es_DO: e.target.value })}
                      className="flex-1 bg-surface-container-lowest text-on-surface border border-outline-variant"
                      placeholder="Nombre del plan en Español"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="edit-price" className="block text-label-md text-on-surface mb-1.5 font-semibold">Monthly Price ($)</label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(parseInt(e.target.value) || 0)}
                  className="w-full bg-surface-container-lowest text-on-surface border border-outline-variant"
                />
              </div>

              <div>
                <label className="block text-label-md text-on-surface mb-1.5 font-semibold">Description</label>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-on-surface-variant w-6 mt-2">EN</span>
                    <textarea
                      value={editDescription.en_US || ''}
                      onChange={(e) => setEditDescription({ ...editDescription, en_US: e.target.value })}
                      className="flex-1 min-h-[60px] p-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20"
                      placeholder="Description in English"
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-on-surface-variant w-6 mt-2">ES</span>
                    <textarea
                      value={editDescription.es_DO || ''}
                      onChange={(e) => setEditDescription({ ...editDescription, es_DO: e.target.value })}
                      className="flex-1 min-h-[60px] p-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20"
                      placeholder="Descripción en Español"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    id="edit-recommended"
                    type="checkbox"
                    checked={editRecommended}
                    onChange={(e) => setEditRecommended(e.target.checked)}
                    className="h-4 w-4 rounded border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="edit-recommended" className="text-body-md text-on-surface cursor-pointer select-none">
                    Recommended Plan
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="edit-active"
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="h-4 w-4 rounded border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="edit-active" className="text-body-md text-on-surface cursor-pointer select-none">
                    Plan Active
                  </label>
                </div>
              </div>

              <div className="border-t border-outline-variant pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-label-lg font-bold text-primary">Features</h4>
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="text-label-sm text-primary hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    + Add Feature
                  </button>
                </div>

                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {editFeatures.map((feat, index) => (
                    <div
                      key={index}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`group flex items-start gap-2 border rounded-lg p-2 transition-all duration-200 ${
                        draggedIndex === index
                          ? 'opacity-40 bg-surface-container'
                          : dragOverIndex === index
                          ? 'border-primary border-dashed bg-primary/5 scale-[1.02]'
                          : 'border-outline-variant/30 bg-surface-container-low/40'
                      }`}
                    >
                      {/* Drag Handle & Accessible Controls */}
                      <div className="flex items-center gap-0.5 mt-2">
                        <div
                          className="cursor-grab active:cursor-grabbing text-on-surface-variant/40 hover:text-on-surface-variant/80 transition-colors p-1"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveFeature(index, -1)}
                            className="p-0.5 hover:bg-surface-container rounded text-on-surface-variant disabled:opacity-30 cursor-pointer"
                            title="Move up"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === editFeatures.length - 1}
                            onClick={() => handleMoveFeature(index, 1)}
                            className="p-0.5 hover:bg-surface-container rounded text-on-surface-variant disabled:opacity-30 cursor-pointer"
                            title="Move down"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={feat.included}
                        onChange={(e) => handleToggleFeatureIncluded(index, e.target.checked)}
                        className="h-4 w-4 rounded border-outline-variant bg-surface-container-lowest text-success focus:ring-success cursor-pointer mt-2.5"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-on-surface-variant w-6">EN</span>
                          <Input
                            type="text"
                            value={(typeof feat.text === 'string' ? feat.text : feat.text?.en_US) || ''}
                            onChange={(e) => handleEditFeatureText(index, 'en_US', e.target.value)}
                            className="flex-1 bg-surface-container-lowest text-on-surface border border-outline-variant py-1 h-8"
                            placeholder="Feature in English..."
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-on-surface-variant w-6">ES</span>
                          <Input
                            type="text"
                            value={(typeof feat.text === 'string' ? feat.text : feat.text?.es_DO) || ''}
                            onChange={(e) => handleEditFeatureText(index, 'es_DO', e.target.value)}
                            className="flex-1 bg-surface-container-lowest text-on-surface border border-outline-variant py-1 h-8"
                            placeholder="Característica en Español..."
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteFeature(index)}
                        className="p-1 hover:bg-error/15 text-error rounded-md transition-colors cursor-pointer mt-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-outline-variant flex justify-end gap-3 bg-surface-container-low/20">
              <button
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2 border border-outline-variant rounded-lg text-label-md hover:bg-surface-container-low transition-colors cursor-pointer text-on-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                disabled={saveLoading}
                className="px-5 py-2 bg-primary text-on-primary rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {saveLoading ? 'Saving...' : (isCreateMode ? 'Create Plan' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
