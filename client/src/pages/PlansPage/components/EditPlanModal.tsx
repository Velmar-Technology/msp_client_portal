import { X, GripVertical, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Plan, PlanFeature } from "@/services/planService";
import { Input } from "@/components/ui/input";

import { FEATURE_CATALOG } from "@/constants/featureCatalog";

interface EditPlanModalProps {
  editingPlan: Plan;
  isCreateMode: boolean;
  editId: string;
  setEditId: (val: string) => void;
  editClientType: string;
  setEditClientType: (val: string) => void;
  editName: Record<string, string>;
  setEditName: (val: Record<string, string>) => void;
  editDescription: Record<string, string>;
  setEditDescription: (val: Record<string, string>) => void;
  editPrice: number;
  setEditPrice: (val: number) => void;
  editRecommended: boolean;
  setEditRecommended: (val: boolean) => void;
  editActive: boolean;
  setEditActive: (val: boolean) => void;
  editFeatures: PlanFeature[];
  saveLoading: boolean;
  draggedIndex: number | null;
  dragOverIndex: number | null;
  onClose: () => void;
  onSave: () => Promise<void>;
  onAddFeature: () => void;
  onDeleteFeature: (index: number) => void;
  onToggleFeatureIncluded: (index: number, included: boolean) => void;
  onEditFeatureText: (index: number, lang: 'en_US' | 'es_DO', textVal: string) => void;
  onUpdateFeatureCode?: (index: number, code: string) => void;
  onUpdateFeatureParam?: (index: number, paramKey: string, value: string | number | boolean) => void;
  onDeleteFeatureParam?: (index: number, paramKey: string) => void;
  onMoveFeature: (index: number, direction: -1 | 1) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

export function EditPlanModal({
  editingPlan,
  isCreateMode,
  editId,
  setEditId,
  editClientType,
  setEditClientType,
  editName,
  setEditName,
  editDescription,
  setEditDescription,
  editPrice,
  setEditPrice,
  editRecommended,
  setEditRecommended,
  editActive,
  setEditActive,
  editFeatures,
  saveLoading,
  draggedIndex,
  dragOverIndex,
  onClose,
  onSave,
  onAddFeature,
  onDeleteFeature,
  onToggleFeatureIncluded,
  onEditFeatureText,
  onUpdateFeatureCode,
  onUpdateFeatureParam,
  onDeleteFeatureParam,
  onMoveFeature,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: EditPlanModalProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg max-w-md w-full max-h-[85vh] flex flex-col shadow-xl text-zinc-900 dark:text-zinc-50">
        <div className="p-4.5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-100/50 dark:bg-zinc-900/60 rounded-t-lg">
          <h3 className="text-sm font-bold tracking-tight">
            {isCreateMode ? (t('plans.addNewPlan') || 'Add New Plan') : (t('plans.editPlanTitle', { id: editingPlan.id }) || `Edit Plan: ${editingPlan.id}`)}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer text-zinc-500 dark:text-zinc-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4.5 overflow-y-auto space-y-3.5 flex-1">
          <div className="grid grid-cols-2 gap-3">
            {isCreateMode ? (
              <div>
                <label htmlFor="edit-id" className="block text-[10px] text-zinc-500 dark:text-zinc-450 font-bold uppercase tracking-wider mb-1">
                  {t('plans.planId') || 'Plan ID'}
                </label>
                <Input
                  id="edit-id"
                  type="text"
                  value={editId}
                  onChange={(e) => setEditId(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                  placeholder="e.g. PL-008"
                  className="h-8.5 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-855"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="edit-id" className="block text-[10px] text-zinc-500 dark:text-zinc-450 font-bold uppercase tracking-wider mb-1">
                  {t('plans.planId') || 'Plan ID'}
                </label>
                <Input
                  id="edit-id"
                  type="text"
                  value={editId}
                  disabled
                  className="h-8.5 text-xs bg-zinc-100/80 dark:bg-zinc-850/80 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-850 opacity-70 cursor-not-allowed"
                />
              </div>
            )}
            <div>
              <label htmlFor="edit-client-type" className="block text-[10px] text-zinc-500 dark:text-zinc-450 font-bold uppercase tracking-wider mb-1">
                {t('plans.clientType') || 'Client Type'}
              </label>
              <select
                id="edit-client-type"
                value={editClientType}
                onChange={(e) => setEditClientType(e.target.value)}
                className="w-full h-8.5 px-2.5 border rounded text-xs focus:outline-none focus:border-zinc-900 bg-card text-zinc-900 dark:text-zinc-100"
              >
                <option value="CLIENT">{t('plans.clientTypes.standard') || 'Standard Client'}</option>
                <option value="ENTERPRISE">{t('plans.clientTypes.enterprise') || 'Enterprise Client'}</option>
                <option value="STUDENT">{t('plans.clientTypes.student') || 'Student Starter'}</option>
                <option value="OTHER">{t('plans.clientTypes.other') || 'Other / Custom'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 dark:text-zinc-450 font-bold uppercase tracking-wider mb-1">
              {t('plans.planNameLabel') || 'Plan Name'}
            </label>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 w-5">EN</span>
                <Input
                  type="text"
                  value={editName.en_US || ''}
                  onChange={(e) => setEditName({ ...editName, en_US: e.target.value })}
                  className="flex-1 h-8 text-xs bg-card border"
                  placeholder="Plan name in English"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 w-5">ES</span>
                <Input
                  type="text"
                  value={editName.es_DO || ''}
                  onChange={(e) => setEditName({ ...editName, es_DO: e.target.value })}
                  className="flex-1 h-8 text-xs bg-card border"
                  placeholder="Nombre del plan en Español"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="edit-price" className="block text-[10px] text-zinc-500 dark:text-zinc-450 font-bold uppercase tracking-wider mb-1">
              {t('plans.monthlyPriceLabel') || 'Monthly Price ($)'}
            </label>
            <Input
              id="edit-price"
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(parseInt(e.target.value) || 0)}
              className="h-8.5 text-xs bg-card border font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 dark:text-zinc-450 font-bold uppercase tracking-wider mb-1">
              {t('plans.descriptionLabel') || 'Description'}
            </label>
            <div className="space-y-1.5">
              <div className="flex items-start gap-1.5">
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 w-5 mt-2">EN</span>
                <textarea
                  value={editDescription.en_US || ''}
                  onChange={(e) => setEditDescription({ ...editDescription, en_US: e.target.value })}
                  className="flex-1 min-h-[50px] p-2 rounded border bg-card text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-zinc-900"
                  placeholder="Description in English"
                />
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 w-5 mt-2">ES</span>
                <textarea
                  value={editDescription.es_DO || ''}
                  onChange={(e) => setEditDescription({ ...editDescription, es_DO: e.target.value })}
                  className="flex-1 min-h-[50px] p-2 rounded border bg-card text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-zinc-900"
                  placeholder="Descripción en Español"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 py-1">
            <div className="flex items-center gap-1.5">
              <input
                id="edit-recommended"
                type="checkbox"
                checked={editRecommended}
                onChange={(e) => setEditRecommended(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
              />
              <label htmlFor="edit-recommended" className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none font-medium">
                {t('plans.recommendedPlan') || 'Recommended Plan'}
              </label>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                id="edit-active"
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
              />
              <label htmlFor="edit-active" className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none font-medium">
                {t('plans.active') || 'Active'}
              </label>
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
            <div className="flex justify-between items-center mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t('plans.featuresTitle') || 'Features'}</h4>
              <button
                type="button"
                onClick={onAddFeature}
                className="text-[10px] text-zinc-900 dark:text-zinc-200 hover:underline flex items-center gap-0.5 cursor-pointer font-bold uppercase tracking-wider"
              >
                + {t('plans.addFeature') || 'Add Feature'}
              </button>
            </div>

            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {editFeatures.map((feat, index) => (
                <div
                  key={index}
                  draggable={true}
                  onDragStart={(e) => onDragStart(e, index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDrop={(e) => onDrop(e, index)}
                  onDragEnd={onDragEnd}
                  className={`group flex items-start gap-1.5 border rounded p-1.5 transition-all duration-200 ${
                    draggedIndex === index
                      ? 'opacity-40 bg-zinc-100 dark:bg-zinc-800'
                      : dragOverIndex === index
                        ? 'border-zinc-900 border-dashed bg-zinc-100/50 dark:bg-zinc-800/40'
                        : 'border-zinc-200/50 bg-zinc-50/10 dark:border-zinc-800/30'
                  }`}
                >
                  <div className="flex items-center gap-0.5 mt-1">
                    <div
                      className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-650 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors p-0.5"
                      title={t('plans.dragToReorder') || 'Drag to reorder'}
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => onMoveFeature(index, -1)}
                        className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-500 disabled:opacity-30 cursor-pointer"
                        title={t('plans.moveUp') || 'Move up'}
                      >
                        <ChevronUp className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === editFeatures.length - 1}
                        onClick={() => onMoveFeature(index, 1)}
                        className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-500 disabled:opacity-30 cursor-pointer"
                        title={t('plans.moveDown') || 'Move down'}
                      >
                        <ChevronDown className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={feat.included}
                    onChange={(e) => onToggleFeatureIncluded(index, e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 focus:ring-zinc-900 cursor-pointer mt-1.5"
                  />
                  <div className="flex-1 space-y-1 mt-0.5">
                    {/* Feature Code Selector */}
                    <div className="flex items-center gap-1">
                      <select
                        value={feat.code || 'CUSTOM_FEATURE'}
                        onChange={(e) => onUpdateFeatureCode?.(index, e.target.value)}
                        className="w-full h-7 px-1.5 border rounded text-[11px] bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none border-zinc-200 dark:border-zinc-850"
                      >
                        <option value="CUSTOM_FEATURE">-- Custom Text Feature --</option>
                        {FEATURE_CATALOG.filter((c) => c.code !== 'CUSTOM_FEATURE').map((cat) => (
                          <option key={cat.code} value={cat.code}>
                            {t(cat.labelKey) || cat.code} ({cat.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Parameter Controls for Feature */}
                    {feat.code && feat.code !== 'CUSTOM_FEATURE' && (
                      <div className="bg-zinc-100/60 dark:bg-zinc-800/40 p-2 rounded border border-zinc-200/50 dark:border-zinc-700/50 my-1 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Feature Parameters</span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          {(() => {
                            const catalogItem = FEATURE_CATALOG.find((c) => c.code === feat.code);
                            const schemaKeys = new Set(catalogItem?.paramSchema?.map((p) => p.key) || []);
                            const allParamKeys = Array.from(new Set([...Array.from(schemaKeys), ...Object.keys(feat.params || {})]));

                            if (allParamKeys.length === 0) {
                              return <p className="col-span-2 text-[9px] text-zinc-400 italic">No parameters configured.</p>;
                            }

                            return allParamKeys.map((paramKey) => {
                              const schemaItem = catalogItem?.paramSchema?.find((p) => p.key === paramKey);
                              const label = schemaItem ? schemaItem.label : paramKey;
                              const currentVal = feat.params?.[paramKey] ?? schemaItem?.defaultValue ?? '';

                              return (
                                <div key={paramKey} className="space-y-0.5 relative">
                                  <div className="flex justify-between items-center">
                                    <label className="block text-[8px] font-bold uppercase tracking-wider text-zinc-500 truncate">
                                      {label}
                                    </label>
                                    {!schemaKeys.has(paramKey) && (
                                      <button
                                        type="button"
                                        onClick={() => onDeleteFeatureParam?.(index, paramKey)}
                                        className="text-[9px] text-red-500 hover:underline px-0.5"
                                        title="Remove custom parameter"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                  {schemaItem?.type === 'select' && schemaItem.options ? (
                                    <select
                                      value={String(currentVal)}
                                      onChange={(e) => onUpdateFeatureParam?.(index, paramKey, e.target.value)}
                                      className="w-full h-6 px-1 border rounded text-[10px] bg-card text-zinc-900 dark:text-zinc-100 focus:outline-none border-zinc-200 dark:border-zinc-800"
                                    >
                                      {schemaItem.options.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <Input
                                      type={schemaItem?.type === 'number' ? 'number' : 'text'}
                                      value={currentVal as string | number}
                                      onChange={(e) =>
                                        onUpdateFeatureParam?.(
                                          index,
                                          paramKey,
                                          schemaItem?.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                                        )
                                      }
                                      className="h-6 text-[10px] py-0 px-1.5 bg-white dark:bg-zinc-950 border"
                                    />
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>

                        {/* Inline Custom Parameter Adder */}
                        <div className="pt-1 border-t border-zinc-200/40 dark:border-zinc-700/40">
                          <button
                            type="button"
                            onClick={() => {
                              const key = window.prompt("Enter parameter key name (e.g. limit, unit, hours, frequency):");
                              if (!key || !key.trim()) return;
                              const val = window.prompt(`Enter value for '${key.trim()}':`);
                              if (val === null) return;
                              onUpdateFeatureParam?.(index, key.trim(), val);
                            }}
                            className="text-[9px] font-bold text-zinc-700 dark:text-zinc-300 hover:underline flex items-center gap-0.5 cursor-pointer uppercase tracking-wider"
                          >
                            + Add Custom Parameter
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Freeform text fields fallback if Custom Feature */}
                    {(!feat.code || feat.code === 'CUSTOM_FEATURE') && (
                      <>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 w-4">EN</span>
                          <Input
                            type="text"
                            value={(typeof feat.text === 'string' ? feat.text : feat.text?.en_US) || ''}
                            onChange={(e) => onEditFeatureText(index, 'en_US', e.target.value)}
                            className="flex-1 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 py-0.5 h-7 text-xs"
                            placeholder={t('plans.featureEnPlaceholder') || 'Feature in English...'}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 w-4">ES</span>
                          <Input
                            type="text"
                            value={(typeof feat.text === 'string' ? feat.text : feat.text?.es_DO) || ''}
                            onChange={(e) => onEditFeatureText(index, 'es_DO', e.target.value)}
                            className="flex-1 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 py-0.5 h-7 text-xs"
                            placeholder={t('plans.featureEsPlaceholder') || 'Característica en Español...'}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteFeature(index)}
                    className="p-1 hover:bg-red-500/10 text-red-650 dark:text-red-400 rounded transition-colors cursor-pointer mt-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2 bg-zinc-100/10 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 border border-zinc-200 hover:bg-zinc-100/50 dark:border-zinc-800 rounded text-xs font-semibold cursor-pointer text-zinc-700 dark:text-zinc-300"
          >
            {t('plans.cancel') || 'Cancel'}
          </button>
          <button
            onClick={onSave}
            disabled={saveLoading}
            className="px-4 py-1.5 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 rounded text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            {saveLoading ? (t('plans.saving') || 'Saving...') : isCreateMode ? (t('plans.createPlan') || 'Create Plan') : (t('plans.saveChanges') || 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
}
