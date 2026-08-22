import { useState } from 'react';
import { X, GripVertical, ChevronUp, ChevronDown, Trash2, Plus, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Plan, PlanFeature } from "@/services/planService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FEATURE_CATALOG } from "@/constants/featureCatalog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

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
  onDeletePlan?: (planId: string) => void;
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
  onDeletePlan,
}: EditPlanModalProps) {
  const { t } = useTranslation();
  const [activeLang, setActiveLang] = useState<'en_US' | 'es_DO'>('en_US');
  const [featureLangTab, setFeatureLangTab] = useState<'en_US' | 'es_DO'>('en_US');

  const titleText = isCreateMode ? (t('plans.addNewPlan') || 'Add New Plan') : (t('plans.editPlanTitle', { id: editingPlan.id }) || `Edit Plan: ${editingPlan.id}`);

  return (
    <AlertDialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-w-lg w-full max-h-[90vh] bg-card border border-border rounded-lg p-0 flex flex-col shadow-2xl text-foreground overflow-hidden">
        {/* Header */}
        <AlertDialogHeader className="px-4 py-3 border-b border-border flex flex-row justify-between items-center bg-muted/40 space-y-0 text-left">
          <div className="flex items-center gap-2">
            <AlertDialogTitle className="text-xs font-bold uppercase tracking-wider text-foreground font-heading">
              {titleText}
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">{titleText}</AlertDialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogHeader>

        {/* Scrollable Body */}
        <div className="p-3.5 overflow-y-auto space-y-3 flex-1 text-xs">
          {/* Row 1: Plan ID, Client Type, Price, Flags */}
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-3">
              <label htmlFor="edit-id" className="block text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">
                {t('plans.planId') || 'Plan ID'}
              </label>
              <Input
                id="edit-id"
                type="text"
                value={editId}
                disabled={!isCreateMode}
                onChange={(e) => setEditId(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                placeholder="e.g. PL-008"
                className="font-mono disabled:opacity-60"
              />
            </div>

            <div className="col-span-4">
              <label htmlFor="edit-client-type" className="block text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">
                {t('plans.clientType') || 'Client Type'}
              </label>
              <Select
                value={editClientType}
                onValueChange={(val) => setEditClientType(val)}
              >
                <SelectTrigger id="edit-client-type" className="w-full">
                  <SelectValue placeholder={t('plans.clientType') || 'Client Type'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">{t('plans.clientTypes.standard') || 'Standard'}</SelectItem>
                  <SelectItem value="ENTERPRISE">{t('plans.clientTypes.enterprise') || 'Enterprise'}</SelectItem>
                  <SelectItem value="STUDENT">{t('plans.clientTypes.student') || 'Student'}</SelectItem>
                  <SelectItem value="OTHER">{t('plans.clientTypes.other') || 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <label htmlFor="edit-price" className="block text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">
                {t('plans.monthlyPriceLabel') || 'Price ($)'}
              </label>
              <Input
                id="edit-price"
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(parseInt(e.target.value) || 0)}
                className="font-mono"
              />
            </div>

            <div className="col-span-3 flex items-center gap-2 pb-1 justify-end">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] font-medium text-foreground">
                <Checkbox
                  checked={editRecommended}
                  onCheckedChange={(checked) => setEditRecommended(checked === true)}
                  className="size-3.5"
                />
                Rec.
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] font-medium text-foreground">
                <Checkbox
                  checked={editActive}
                  onCheckedChange={(checked) => setEditActive(checked === true)}
                  className="size-3.5"
                />
                Active
              </label>
            </div>
          </div>

          {/* i18n Language Tabs Section for Plan Information */}
          <div className="bg-muted/40 border border-border rounded-md p-2.5">
            <Tabs value={activeLang} onValueChange={(val) => setActiveLang(val as 'en_US' | 'es_DO')} className="w-full">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <span>{t('plans.i18nContent') || 'Localization (i18n)'}</span>
                </div>
                <TabsList className="h-6 p-0.5 bg-muted rounded">
                  <TabsTrigger value="en_US" className="px-2 py-0 text-[10px] h-5 font-bold data-[state=active]:bg-card data-[state=active]:text-foreground">
                    EN (English)
                  </TabsTrigger>
                  <TabsTrigger value="es_DO" className="px-2 py-0 text-[10px] h-5 font-bold data-[state=active]:bg-card data-[state=active]:text-foreground">
                    ES (Español)
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* English Tab */}
              <TabsContent value="en_US" forceMount className={activeLang === 'en_US' ? 'space-y-2 mt-0' : 'hidden'}>
                <div>
                  <label htmlFor="edit-name-en" className="block text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">
                    {t('plans.planNameEn') || 'Plan Name (English)'}
                  </label>
                  <Input
                    id="edit-name-en"
                    type="text"
                    value={editName.en_US || ''}
                    onChange={(e) => setEditName({ ...editName, en_US: e.target.value })}
                    placeholder="Plan name in English..."
                  />
                </div>
                <div>
                  <label htmlFor="edit-desc-en" className="block text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">
                    {t('plans.planDescEn') || 'Plan Description (English)'}
                  </label>
                  <textarea
                    id="edit-desc-en"
                    rows={2}
                    value={editDescription.en_US || ''}
                    onChange={(e) => setEditDescription({ ...editDescription, en_US: e.target.value })}
                    placeholder="Description in English..."
                    className="w-full p-1.5 rounded border border-input bg-background text-foreground text-[11px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </div>
              </TabsContent>

              {/* Spanish Tab */}
              <TabsContent value="es_DO" forceMount className={activeLang === 'es_DO' ? 'space-y-2 mt-0' : 'hidden'}>
                <div>
                  <label htmlFor="edit-name-es" className="block text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">
                    {t('plans.planNameEs') || 'Nombre del Plan (Español)'}
                  </label>
                  <Input
                    id="edit-name-es"
                    type="text"
                    value={editName.es_DO || ''}
                    onChange={(e) => setEditName({ ...editName, es_DO: e.target.value })}
                    placeholder="Nombre del plan en español..."
                  />
                </div>
                <div>
                  <label htmlFor="edit-desc-es" className="block text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">
                    {t('plans.planDescEs') || 'Descripción del Plan (Español)'}
                  </label>
                  <textarea
                    id="edit-desc-es"
                    rows={2}
                    value={editDescription.es_DO || ''}
                    onChange={(e) => setEditDescription({ ...editDescription, es_DO: e.target.value })}
                    placeholder="Descripción en Español..."
                    className="w-full p-1.5 rounded border border-input bg-background text-foreground text-[11px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Features Editor */}
          <div>
            <Tabs value={featureLangTab} onValueChange={(val) => setFeatureLangTab(val as 'en_US' | 'es_DO')} className="w-full">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                  {t('plans.planFeatures') || 'Plan Features'} ({editFeatures.length})
                </label>
                <div className="flex items-center gap-2">
                  <TabsList className="h-5 p-0.5 bg-muted rounded">
                    <TabsTrigger value="en_US" className="px-1.5 py-0 text-[9px] h-4 font-bold data-[state=active]:bg-card data-[state=active]:text-foreground">
                      EN
                    </TabsTrigger>
                    <TabsTrigger value="es_DO" className="px-1.5 py-0 text-[9px] h-4 font-bold data-[state=active]:bg-card data-[state=active]:text-foreground">
                      ES
                    </TabsTrigger>
                  </TabsList>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={onAddFeature}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    {t('plans.addFeature') || 'Add Feature'}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {editFeatures.map((feat, index) => {
                  const catalogItem = FEATURE_CATALOG.find((c) => c.code === feat.code);
                  const allParamKeys = Array.from(
                    new Set([
                      ...(catalogItem?.paramSchema?.map((p) => p.key) || []),
                      ...Object.keys(feat.params || {}),
                    ])
                  );
                  const schemaKeys = new Set(catalogItem?.paramSchema?.map((p) => p.key) || []);

                  return (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => onDragStart(e, index)}
                      onDragOver={(e) => onDragOver(e, index)}
                      onDrop={(e) => onDrop(e, index)}
                      onDragEnd={onDragEnd}
                      className={`group flex flex-col gap-1 border rounded p-1.5 transition-all duration-150 ${
                        draggedIndex === index
                          ? 'opacity-40 bg-muted'
                          : dragOverIndex === index
                            ? 'border-primary border-dashed bg-primary/5'
                            : 'border-border bg-card'
                      }`}
                    >
                      {/* Feature Main Control Bar */}
                      <div className="flex items-center gap-1.5">
                        <div
                          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5"
                          title={t('plans.dragToReorder') || 'Drag to reorder'}
                        >
                          <GripVertical className="h-3.5 w-3.5" />
                        </div>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={index === 0}
                            onClick={() => onMoveFeature(index, -1)}
                            className="h-5 w-5 text-muted-foreground disabled:opacity-30 cursor-pointer"
                            title={t('plans.moveUp') || 'Move up'}
                          >
                            <ChevronUp className="h-2.5 w-2.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={index === editFeatures.length - 1}
                            onClick={() => onMoveFeature(index, 1)}
                            className="h-5 w-5 text-muted-foreground disabled:opacity-30 cursor-pointer"
                            title={t('plans.moveDown') || 'Move down'}
                          >
                            <ChevronDown className="h-2.5 w-2.5" />
                          </Button>
                        </div>

                        <Checkbox
                          checked={feat.included}
                          onCheckedChange={(checked) => onToggleFeatureIncluded(index, checked === true)}
                          className="size-3.5"
                          title={feat.included ? 'Included in plan' : 'Excluded from plan'}
                        />

                        {/* Code Dropdown */}
                        <Select
                          value={feat.code || 'CUSTOM_FEATURE'}
                          onValueChange={(val) => onUpdateFeatureCode?.(index, val)}
                        >
                          <SelectTrigger size="sm" className="flex-1 h-6.5 text-[11px] truncate font-medium">
                            <SelectValue placeholder="-- Custom Text Feature --" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CUSTOM_FEATURE">-- Custom Text Feature --</SelectItem>
                            {FEATURE_CATALOG.filter((c) => c.code !== 'CUSTOM_FEATURE').map((cat) => {
                              const paramsToUse = feat.code === cat.code ? (feat.params || cat.defaultParams || {}) : (cat.defaultParams || {});
                              const label = t(cat.labelKey, paramsToUse) || cat.code;
                              return (
                                <SelectItem key={cat.code} value={cat.code}>
                                  {label} ({cat.code})
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => onDeleteFeature(index)}
                          className="h-6 w-6 text-destructive hover:bg-destructive/10 cursor-pointer"
                          title="Delete feature"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Parameter Controls (Inline compact pills) */}
                      {feat.code && feat.code !== 'CUSTOM_FEATURE' && (
                        <div className="ml-6 pl-1 pt-0.5 flex items-center gap-1.5 flex-wrap bg-muted/40 p-1 rounded border border-border">
                          {allParamKeys.map((paramKey) => {
                            const schemaItem = catalogItem?.paramSchema?.find((p) => p.key === paramKey);
                            const label = schemaItem ? schemaItem.label : paramKey;
                            const currentVal = feat.params?.[paramKey] ?? schemaItem?.defaultValue ?? '';

                            return (
                              <div key={paramKey} className="flex items-center gap-1 bg-card px-1.5 py-0.5 rounded border border-border">
                                <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">{label}:</span>
                                {schemaItem?.type === 'select' && schemaItem.options ? (
                                  <Select
                                    value={String(currentVal)}
                                    onValueChange={(val) => onUpdateFeatureParam?.(index, paramKey, val)}
                                  >
                                    <SelectTrigger size="xs" className="h-5 px-1 bg-transparent text-[10px] border-0 shadow-none">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {schemaItem.options.map((opt) => (
                                        <SelectItem key={opt} value={opt}>
                                          {opt}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    size="xs"
                                    type={schemaItem?.type === 'number' ? 'number' : 'text'}
                                    value={currentVal as string | number}
                                    onChange={(e) =>
                                      onUpdateFeatureParam?.(
                                        index,
                                        paramKey,
                                        schemaItem?.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                                      )
                                    }
                                    className="h-5 w-16 text-[10px] bg-transparent font-mono text-foreground focus:outline-none border-0 px-1"
                                  />
                                )}
                                {!schemaKeys.has(paramKey) && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => onDeleteFeatureParam?.(index, paramKey)}
                                    className="h-4 w-4 text-[9px] text-destructive hover:opacity-80 p-0"
                                    title="Remove parameter"
                                  >
                                    ✕
                                  </Button>
                                )}
                              </div>
                            );
                          })}

                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              const key = window.prompt("Enter parameter key name (e.g. limit, unit, hours):");
                              if (!key || !key.trim()) return;
                              const val = window.prompt(`Enter value for '${key.trim()}':`);
                              if (val === null) return;
                              onUpdateFeatureParam?.(index, key.trim(), val);
                            }}
                            className="text-[9px] h-5 px-1 text-muted-foreground hover:text-foreground font-medium"
                          >
                            + Param
                          </Button>
                        </div>
                      )}

                      {/* Custom Text Input for Active Feature Language Tab */}
                      {(!feat.code || feat.code === 'CUSTOM_FEATURE') && (
                        <div className="ml-6 pt-0.5">
                          <TabsContent value="en_US" forceMount className={featureLangTab === 'en_US' ? 'mt-0' : 'hidden'}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-bold text-muted-foreground uppercase w-4">EN</span>
                              <Input
                                size="sm"
                                type="text"
                                value={(typeof feat.text === 'string' ? feat.text : feat.text?.en_US) || ''}
                                onChange={(e) => onEditFeatureText(index, 'en_US', e.target.value)}
                                className="flex-1 h-6.5 text-[11px] bg-background py-0"
                                placeholder={t('plans.featureEnPlaceholder') || 'Feature in English...'}
                              />
                            </div>
                          </TabsContent>
                          <TabsContent value="es_DO" forceMount className={featureLangTab === 'es_DO' ? 'mt-0' : 'hidden'}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-bold text-muted-foreground uppercase w-4">ES</span>
                              <Input
                                size="sm"
                                type="text"
                                value={(typeof feat.text === 'string' ? feat.text : feat.text?.es_DO) || ''}
                                onChange={(e) => onEditFeatureText(index, 'es_DO', e.target.value)}
                                className="flex-1 h-6.5 text-[11px] bg-background py-0"
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
        <AlertDialogFooter className="px-4 py-2.5 border-t border-border flex justify-between items-center bg-muted/40">
          <div>
            {!isCreateMode && onDeletePlan && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  onClose();
                  onDeletePlan(editingPlan.id);
                }}
                className="gap-1 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                {t('plans.deletePlan') || 'Delete Plan'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <AlertDialogCancel
              onClick={onClose}
              className="h-7 text-xs font-semibold cursor-pointer text-foreground mt-0"
            >
              {t('plans.cancel') || 'Cancel'}
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={onSave}
              disabled={saveLoading}
              className="h-7 text-xs font-semibold gap-1 cursor-pointer shadow-xs"
            >
              {saveLoading ? (t('plans.saving') || 'Saving...') : isCreateMode ? (t('plans.createPlan') || 'Create Plan') : (t('plans.saveChanges') || 'Save Changes')}
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default EditPlanModal;
