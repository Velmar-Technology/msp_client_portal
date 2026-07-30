import { useState } from 'react';
import { X, GripVertical, ChevronUp, ChevronDown, Trash2, Plus, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Plan, PlanFeature } from "@/services/planService";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  const [activeLang, setActiveLang] = useState<'en_US' | 'es_DO'>('en_US');
  const [featureLangTab, setFeatureLangTab] = useState<'en_US' | 'es_DO'>('en_US');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3">
      <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl text-zinc-900 dark:text-zinc-50 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-100/60 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              {isCreateMode ? (t('plans.addNewPlan') || 'Add New Plan') : (t('plans.editPlanTitle', { id: editingPlan.id }) || `Edit Plan: ${editingPlan.id}`)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer text-zinc-500 dark:text-zinc-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-3.5 overflow-y-auto space-y-3 flex-1 text-xs">
          {/* Row 1: Plan ID, Client Type, Price, Flags */}
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3">
              <label htmlFor="edit-id" className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">
                {t('plans.planId') || 'Plan ID'}
              </label>
              <Input
                id="edit-id"
                type="text"
                value={editId}
                disabled={!isCreateMode}
                onChange={(e) => setEditId(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                placeholder="e.g. PL-008"
                className="h-7 text-xs bg-white dark:bg-zinc-950 font-mono disabled:opacity-60"
              />
            </div>

            <div className="col-span-4">
              <label htmlFor="edit-client-type" className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">
                {t('plans.clientType') || 'Client Type'}
              </label>
              <select
                id="edit-client-type"
                value={editClientType}
                onChange={(e) => setEditClientType(e.target.value)}
                className="w-full h-7 px-2 border rounded text-xs focus:outline-none bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800"
              >
                <option value="CLIENT">{t('plans.clientTypes.standard') || 'Standard'}</option>
                <option value="ENTERPRISE">{t('plans.clientTypes.enterprise') || 'Enterprise'}</option>
                <option value="STUDENT">{t('plans.clientTypes.student') || 'Student'}</option>
                <option value="OTHER">{t('plans.clientTypes.other') || 'Other'}</option>
              </select>
            </div>

            <div className="col-span-2">
              <label htmlFor="edit-price" className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">
                {t('plans.monthlyPriceLabel') || 'Price ($)'}
              </label>
              <Input
                id="edit-price"
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(parseInt(e.target.value) || 0)}
                className="h-7 text-xs bg-white dark:bg-zinc-950 font-mono"
              />
            </div>

            <div className="col-span-3 flex items-center gap-2 pb-1 justify-end">
              <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] font-medium">
                <input
                  type="checkbox"
                  checked={editRecommended}
                  onChange={(e) => setEditRecommended(e.target.checked)}
                  className="h-3 w-3 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900"
                />
                Rec.
              </label>
              <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] font-medium">
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="h-3 w-3 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900"
                />
                Active
              </label>
            </div>
          </div>

          {/* i18n Language Tabs Section for Plan Information */}
          <div className="bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-md p-2.5">
            <Tabs value={activeLang} onValueChange={(val) => setActiveLang(val as 'en_US' | 'es_DO')} className="w-full">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  <Globe className="h-3 w-3 text-zinc-400" />
                  <span>{t('plans.i18nContent') || 'Localization (i18n)'}</span>
                </div>
                <TabsList className="h-6 p-0.5 bg-zinc-200/80 dark:bg-zinc-800 rounded">
                  <TabsTrigger value="en_US" className="px-2 py-0 text-[10px] h-5 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950">
                    EN (English)
                  </TabsTrigger>
                  <TabsTrigger value="es_DO" className="px-2 py-0 text-[10px] h-5 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950">
                    ES (Español)
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="en_US" className="space-y-2 mt-0">
                <div>
                  <label className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">
                    {t('plans.planNameLabel') || 'Plan Name'} (English)
                  </label>
                  <Input
                    type="text"
                    value={editName.en_US || ''}
                    onChange={(e) => setEditName({ ...editName, en_US: e.target.value })}
                    className="h-7 text-xs bg-white dark:bg-zinc-950"
                    placeholder="Plan name in English..."
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">
                    {t('plans.descriptionLabel') || 'Description'} (English)
                  </label>
                  <textarea
                    value={editDescription.en_US || ''}
                    onChange={(e) => setEditDescription({ ...editDescription, en_US: e.target.value })}
                    className="w-full h-11 p-1.5 rounded border bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-[11px] focus:outline-none border-zinc-200 dark:border-zinc-800 resize-none"
                    placeholder="English description..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="es_DO" className="space-y-2 mt-0">
                <div>
                  <label className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">
                    {t('plans.planNameLabel') || 'Plan Name'} (Español)
                  </label>
                  <Input
                    type="text"
                    value={editName.es_DO || ''}
                    onChange={(e) => setEditName({ ...editName, es_DO: e.target.value })}
                    className="h-7 text-xs bg-white dark:bg-zinc-950"
                    placeholder="Nombre del plan en español..."
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">
                    {t('plans.descriptionLabel') || 'Description'} (Español)
                  </label>
                  <textarea
                    value={editDescription.es_DO || ''}
                    onChange={(e) => setEditDescription({ ...editDescription, es_DO: e.target.value })}
                    className="w-full h-11 p-1.5 rounded border bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-[11px] focus:outline-none border-zinc-200 dark:border-zinc-800 resize-none"
                    placeholder="Descripción en español..."
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Features Section with i18n Tabs */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2.5">
            <Tabs value={featureLangTab} onValueChange={(val) => setFeatureLangTab(val as 'en_US' | 'es_DO')} className="w-full">
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {t('plans.featuresTitle') || 'Features'} ({editFeatures.length})
                  </h4>
                  <TabsList className="h-5 p-0.5 bg-zinc-200/60 dark:bg-zinc-800 rounded">
                    <TabsTrigger value="en_US" className="px-1.5 py-0 text-[9px] h-4 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950">
                      EN Text
                    </TabsTrigger>
                    <TabsTrigger value="es_DO" className="px-1.5 py-0 text-[9px] h-4 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950">
                      ES Text
                    </TabsTrigger>
                  </TabsList>
                </div>

                <button
                  type="button"
                  onClick={onAddFeature}
                  className="text-[10px] text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-0.5 cursor-pointer font-bold uppercase tracking-wider bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded"
                >
                  <Plus className="h-3 w-3" /> {t('plans.addFeature') || 'Add Feature'}
                </button>
              </div>

              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {editFeatures.map((feat, index) => {
                  const catalogItem = FEATURE_CATALOG.find((c) => c.code === feat.code);
                  const schemaKeys = new Set(catalogItem?.paramSchema?.map((p) => p.key) || []);
                  const allParamKeys = Array.from(new Set([...Array.from(schemaKeys), ...Object.keys(feat.params || {})]));

                  return (
                    <div
                      key={index}
                      draggable={true}
                      onDragStart={(e) => onDragStart(e, index)}
                      onDragOver={(e) => onDragOver(e, index)}
                      onDrop={(e) => onDrop(e, index)}
                      onDragEnd={onDragEnd}
                      className={`group flex flex-col gap-1 border rounded p-1.5 transition-all duration-150 ${
                        draggedIndex === index
                          ? 'opacity-40 bg-zinc-100 dark:bg-zinc-800'
                          : dragOverIndex === index
                            ? 'border-zinc-900 border-dashed bg-zinc-100/50 dark:bg-zinc-800/40'
                            : 'border-zinc-200/80 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/40'
                      }`}
                    >
                      {/* Feature Main Control Bar */}
                      <div className="flex items-center gap-1.5">
                        <div className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 p-0.5">
                          <GripVertical className="h-3.5 w-3.5" />
                        </div>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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

                        <input
                          type="checkbox"
                          checked={feat.included}
                          onChange={(e) => onToggleFeatureIncluded(index, e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 cursor-pointer"
                          title={feat.included ? 'Included in plan' : 'Excluded from plan'}
                        />

                        {/* Code Dropdown */}
                        <select
                          value={feat.code || 'CUSTOM_FEATURE'}
                          onChange={(e) => onUpdateFeatureCode?.(index, e.target.value)}
                          className="flex-1 h-6.5 px-1.5 border rounded text-[11px] bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none border-zinc-200 dark:border-zinc-800 truncate font-medium"
                        >
                          <option value="CUSTOM_FEATURE">-- Custom Text Feature --</option>
                          {FEATURE_CATALOG.filter((c) => c.code !== 'CUSTOM_FEATURE').map((cat) => {
                            const paramsToUse = feat.code === cat.code ? (feat.params || cat.defaultParams || {}) : (cat.defaultParams || {});
                            const label = t(cat.labelKey, paramsToUse) || cat.code;
                            return (
                              <option key={cat.code} value={cat.code}>
                                {label} ({cat.code})
                              </option>
                            );
                          })}
                        </select>

                        <button
                          type="button"
                          onClick={() => onDeleteFeature(index)}
                          className="p-1 hover:bg-red-500/10 text-red-500 rounded transition-colors cursor-pointer"
                          title="Delete feature"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Parameter Controls (Inline compact pills) */}
                      {feat.code && feat.code !== 'CUSTOM_FEATURE' && (
                        <div className="ml-6 pl-1 pt-0.5 flex items-center gap-1.5 flex-wrap bg-zinc-100/50 dark:bg-zinc-800/30 p-1 rounded border border-zinc-200/40 dark:border-zinc-800/40">
                          {allParamKeys.map((paramKey) => {
                            const schemaItem = catalogItem?.paramSchema?.find((p) => p.key === paramKey);
                            const label = schemaItem ? schemaItem.label : paramKey;
                            const currentVal = feat.params?.[paramKey] ?? schemaItem?.defaultValue ?? '';

                            return (
                              <div key={paramKey} className="flex items-center gap-1 bg-white dark:bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                                <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">{label}:</span>
                                {schemaItem?.type === 'select' && schemaItem.options ? (
                                  <select
                                    value={String(currentVal)}
                                    onChange={(e) => onUpdateFeatureParam?.(index, paramKey, e.target.value)}
                                    className="h-5 px-0.5 bg-transparent text-[10px] text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none"
                                  >
                                    {schemaItem.options.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type={schemaItem?.type === 'number' ? 'number' : 'text'}
                                    value={currentVal as string | number}
                                    onChange={(e) =>
                                      onUpdateFeatureParam?.(
                                        index,
                                        paramKey,
                                        schemaItem?.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                                      )
                                    }
                                    className="h-5 w-16 text-[10px] bg-transparent font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none"
                                  />
                                )}
                                {!schemaKeys.has(paramKey) && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteFeatureParam?.(index, paramKey)}
                                    className="text-[9px] text-red-400 hover:text-red-600 ml-0.5"
                                    title="Remove parameter"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => {
                              const key = window.prompt("Enter parameter key name (e.g. limit, unit, hours):");
                              if (!key || !key.trim()) return;
                              const val = window.prompt(`Enter value for '${key.trim()}':`);
                              if (val === null) return;
                              onUpdateFeatureParam?.(index, key.trim(), val);
                            }}
                            className="text-[9px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:underline px-1 cursor-pointer font-medium"
                          >
                            + Param
                          </button>
                        </div>
                      )}

                      {/* Custom Text Input for Active Feature Language Tab */}
                      {(!feat.code || feat.code === 'CUSTOM_FEATURE') && (
                        <div className="ml-6 pt-0.5">
                          <TabsContent value="en_US" className="mt-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-bold text-zinc-400 uppercase w-4">EN</span>
                              <Input
                                type="text"
                                value={(typeof feat.text === 'string' ? feat.text : feat.text?.en_US) || ''}
                                onChange={(e) => onEditFeatureText(index, 'en_US', e.target.value)}
                                className="flex-1 h-6.5 text-[11px] bg-white dark:bg-zinc-950 py-0"
                                placeholder={t('plans.featureEnPlaceholder') || 'Feature in English...'}
                              />
                            </div>
                          </TabsContent>
                          <TabsContent value="es_DO" className="mt-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-bold text-zinc-400 uppercase w-4">ES</span>
                              <Input
                                type="text"
                                value={(typeof feat.text === 'string' ? feat.text : feat.text?.es_DO) || ''}
                                onChange={(e) => onEditFeatureText(index, 'es_DO', e.target.value)}
                                className="flex-1 h-6.5 text-[11px] bg-white dark:bg-zinc-950 py-0"
                                placeholder={t('plans.featureEsPlaceholder') || 'Característica en Español...'}
                              />
                            </div>
                          </TabsContent>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2 bg-zinc-100/50 dark:bg-zinc-900/60">
          <button
            onClick={onClose}
            className="px-3 py-1 border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 rounded text-xs font-semibold cursor-pointer text-zinc-700 dark:text-zinc-300"
          >
            {t('plans.cancel') || 'Cancel'}
          </button>
          <button
            onClick={onSave}
            disabled={saveLoading}
            className="px-3.5 py-1 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 rounded text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {saveLoading ? (t('plans.saving') || 'Saving...') : isCreateMode ? (t('plans.createPlan') || 'Create Plan') : (t('plans.saveChanges') || 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
}
