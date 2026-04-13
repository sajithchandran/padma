'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  FlaskConical,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import {
  createObservationItem,
  deactivateObservationItem,
  fetchObservationItems,
  updateObservationItem,
  type ApiObservationItem,
  type ObservationItemPayload,
} from '@/services/observation-items.service';

const CATEGORY_OPTIONS = [
  'vitals',
  'laboratory',
  'anthropometry',
  'risk',
  'adherence',
  'symptom',
  'device',
];

const DATA_TYPE_OPTIONS = [
  { value: 'numeric', label: 'Numeric' },
  { value: 'text', label: 'Text' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'coded', label: 'Coded' },
  { value: 'json', label: 'JSON' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date Time' },
];

const QUICK_ITEMS: Array<Pick<ObservationItemPayload, 'code' | 'name' | 'category' | 'dataType' | 'unit' | 'precisionScale'>> = [
  { code: 'HBA1C', name: 'HbA1c', category: 'laboratory', dataType: 'numeric', unit: '%', precisionScale: 2 },
  { code: 'FASTING_GLUCOSE', name: 'Fasting Glucose', category: 'laboratory', dataType: 'numeric', unit: 'mg/dL', precisionScale: 1 },
  { code: 'WEIGHT', name: 'Weight', category: 'anthropometry', dataType: 'numeric', unit: 'kg', precisionScale: 2 },
  { code: 'SYSTOLIC_BP', name: 'Systolic BP', category: 'vitals', dataType: 'numeric', unit: 'mmHg', precisionScale: 0 },
  { code: 'DIASTOLIC_BP', name: 'Diastolic BP', category: 'vitals', dataType: 'numeric', unit: 'mmHg', precisionScale: 0 },
];

interface ObservationItemFormState {
  code: string;
  name: string;
  category: string;
  dataType: string;
  unit: string;
  allowedValuesText: string;
  normalRangeMin: string;
  normalRangeMax: string;
  criticalLow: string;
  criticalHigh: string;
  precisionScale: string;
  isActive: boolean;
  isMandatory: boolean;
  displayOrder: string;
  description: string;
}

function emptyForm(): ObservationItemFormState {
  return {
    code: '',
    name: '',
    category: 'laboratory',
    dataType: 'numeric',
    unit: '',
    allowedValuesText: '',
    normalRangeMin: '',
    normalRangeMax: '',
    criticalLow: '',
    criticalHigh: '',
    precisionScale: '',
    isActive: true,
    isMandatory: false,
    displayOrder: '0',
    description: '',
  };
}

function formFromItem(item?: ApiObservationItem | null): ObservationItemFormState {
  if (!item) return emptyForm();
  return {
    code: item.code,
    name: item.name,
    category: item.category,
    dataType: item.dataType,
    unit: item.unit ?? '',
    allowedValuesText: item.allowedValues ? JSON.stringify(item.allowedValues, null, 2) : '',
    normalRangeMin: item.normalRangeMin ?? '',
    normalRangeMax: item.normalRangeMax ?? '',
    criticalLow: item.criticalLow ?? '',
    criticalHigh: item.criticalHigh ?? '',
    precisionScale: item.precisionScale?.toString() ?? '',
    isActive: item.isActive,
    isMandatory: item.isMandatory,
    displayOrder: item.displayOrder.toString(),
    description: item.description ?? '',
  };
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : undefined;
}

function buildPayload(form: ObservationItemFormState): ObservationItemPayload {
  let allowedValues: unknown;
  if (form.allowedValuesText.trim()) {
    allowedValues = JSON.parse(form.allowedValuesText);
  }

  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    category: form.category.trim(),
    dataType: form.dataType.trim(),
    unit: form.unit.trim() || undefined,
    allowedValues,
    normalRangeMin: optionalNumber(form.normalRangeMin),
    normalRangeMax: optionalNumber(form.normalRangeMax),
    criticalLow: optionalNumber(form.criticalLow),
    criticalHigh: optionalNumber(form.criticalHigh),
    precisionScale: optionalNumber(form.precisionScale),
    isActive: form.isActive,
    isMandatory: form.isMandatory,
    displayOrder: optionalNumber(form.displayOrder) ?? 0,
    description: form.description.trim() || undefined,
  };
}

function ObservationItemModal({
  item,
  onClose,
}: {
  item?: ApiObservationItem | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => formFromItem(item));
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(item);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload(form);
      return isEditing && item
        ? updateObservationItem(item.id, payload)
        : createObservationItem(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['observation-items'] });
      setError(null);
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to save observation item.'));
    },
  });

  function update<K extends keyof ObservationItemFormState>(key: K, value: ObservationItemFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function useQuickItem(quick: (typeof QUICK_ITEMS)[number]) {
    setForm((current) => ({
      ...current,
      ...quick,
      precisionScale: quick.precisionScale?.toString() ?? '',
    }));
  }

  const isValid = form.code.trim() && form.name.trim() && form.category.trim() && form.dataType.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-5xl bg-card rounded-t-2xl sm:rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/20">
          <div>
            <h2 className="text-lg font-bold text-foreground font-display">
              {isEditing ? 'Edit Observation Item' : 'Create Observation Item'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define the tenant-level metadata used to record structured patient observations.
            </p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {!isEditing && (
            <div className="flex flex-wrap gap-2">
              {QUICK_ITEMS.map((quick) => (
                <button
                  key={quick.code}
                  type="button"
                  onClick={() => useQuickItem(quick)}
                  className="px-3 py-2 rounded-xl bg-muted/40 hover:bg-primary/10 border border-border text-xs font-bold text-muted-foreground hover:text-primary transition"
                >
                  {quick.name}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Input label="Code" value={form.code} onChange={(e) => update('code', e.target.value)} placeholder="HBA1C" disabled={mutation.isPending} />
            <Input label="Name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="HbA1c" disabled={mutation.isPending} />
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                disabled={mutation.isPending}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary"
              >
                {CATEGORY_OPTIONS.map((category) => <option key={category} value={category}>{titleCase(category)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Data Type</label>
              <select
                value={form.dataType}
                onChange={(e) => update('dataType', e.target.value)}
                disabled={mutation.isPending}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary"
              >
                {DATA_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <Input label="Unit" value={form.unit} onChange={(e) => update('unit', e.target.value)} placeholder="mg/dL, %, kg" disabled={mutation.isPending} />
            <Input label="Precision Scale" type="number" min={0} value={form.precisionScale} onChange={(e) => update('precisionScale', e.target.value)} placeholder="2" disabled={mutation.isPending} />
            <Input label="Display Order" type="number" min={0} value={form.displayOrder} onChange={(e) => update('displayOrder', e.target.value)} disabled={mutation.isPending} />
            <div className="flex items-end gap-3 pb-2">
              <label className="flex items-center gap-2 text-xs font-bold text-foreground">
                <input type="checkbox" checked={form.isActive} onChange={(e) => update('isActive', e.target.checked)} className="h-4 w-4 rounded border-border" />
                Active
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-foreground">
                <input type="checkbox" checked={form.isMandatory} onChange={(e) => update('isMandatory', e.target.checked)} className="h-4 w-4 rounded border-border" />
                Mandatory
              </label>
            </div>
          </div>

          <Card padding="sm" className="bg-muted/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Clinical Ranges</CardTitle>
              <CardSubtitle className="text-xs">Used later for abnormal/critical flags and pathway rule evaluation.</CardSubtitle>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input label="Normal Min" type="number" value={form.normalRangeMin} onChange={(e) => update('normalRangeMin', e.target.value)} />
              <Input label="Normal Max" type="number" value={form.normalRangeMax} onChange={(e) => update('normalRangeMax', e.target.value)} />
              <Input label="Critical Low" type="number" value={form.criticalLow} onChange={(e) => update('criticalLow', e.target.value)} />
              <Input label="Critical High" type="number" value={form.criticalHigh} onChange={(e) => update('criticalHigh', e.target.value)} />
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Allowed Values JSON</label>
              <textarea
                value={form.allowedValuesText}
                onChange={(e) => update('allowedValuesText', e.target.value)}
                rows={5}
                disabled={mutation.isPending}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary"
                placeholder='["yes", "no"] or {"LOW":"Low", "HIGH":"High"}'
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={5}
                disabled={mutation.isPending}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary"
                placeholder="Clinical meaning, capture guidance, source mapping notes..."
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!isValid || mutation.isPending}>
            {isEditing ? 'Save Changes' : 'Create Item'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function getRangeLabel(item: ApiObservationItem) {
  if (!item.normalRangeMin && !item.normalRangeMax) return 'Not defined';
  return `${item.normalRangeMin ?? '-'} to ${item.normalRangeMax ?? '-'}${item.unit ? ` ${item.unit}` : ''}`;
}

export default function ObservationItemsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [dataType, setDataType] = useState('ALL');
  const [activeOnly, setActiveOnly] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ApiObservationItem | null>(null);

  const { data: items = [], isLoading, isError, error } = useQuery({
    queryKey: ['observation-items', search, category, dataType, activeOnly],
    queryFn: () => fetchObservationItems({
      q: search.trim() || undefined,
      category: category === 'ALL' ? undefined : category,
      dataType: dataType === 'ALL' ? undefined : dataType,
      activeOnly,
    }),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateObservationItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['observation-items'] }),
  });

  const categories = useMemo(() => {
    const existing = Array.from(new Set(items.map((item) => item.category))).sort();
    return Array.from(new Set([...CATEGORY_OPTIONS, ...existing]));
  }, [items]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-end">
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditingItem(null); setShowModal(true); }}>
          New Observation Item
        </Button>
      </div>

      <Card padding="sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,180px,180px,160px] gap-3">
          <Input
            placeholder="Search by code, name, category or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground">
            <option value="ALL">All categories</option>
            {categories.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}
          </select>
          <select value={dataType} onChange={(e) => setDataType(e.target.value)} className="h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground">
            <option value="ALL">All data types</option>
            {DATA_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <Button variant={activeOnly ? 'secondary' : 'outline'} onClick={() => setActiveOnly((value) => !value)}>
            {activeOnly ? 'Active Only' : 'All Items'}
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-52 rounded-3xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <Card className="border-red-500/20 bg-red-500/5">
          <p className="text-sm font-semibold text-red-600">Unable to load observation items.</p>
          <p className="text-xs text-red-500/80 mt-1">{(error as any)?.response?.data?.message ?? (error as Error)?.message}</p>
        </Card>
      ) : items.length === 0 ? (
        <Card className="text-center py-14">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FlaskConical className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground font-display">No observation items found</h3>
          <p className="text-sm text-muted-foreground mt-2">Create items such as HbA1c, fasting glucose, weight, BP or adherence score.</p>
          <Button className="mt-5" icon={<Plus className="h-4 w-4" />} onClick={() => setShowModal(true)}>Create First Item</Button>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="hidden lg:grid grid-cols-[1.4fr,0.9fr,0.8fr,1fr,0.6fr,170px] gap-4 px-5 py-3 bg-muted/40 border-b border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <div>Item</div>
            <div>Category</div>
            <div>Data Type</div>
            <div>Normal Range</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className={cn('px-5 py-4 hover:bg-muted/30 transition-colors', !item.isActive && 'opacity-60')}>
                <div className="grid grid-cols-1 lg:grid-cols-[1.4fr,0.9fr,0.8fr,1fr,0.6fr,170px] gap-3 lg:gap-4 lg:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground truncate">{item.name}</p>
                      {item.isMandatory && <Badge variant="warning" size="sm">Mandatory</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{item.code}</p>
                    {item.description && (
                      <p className="lg:hidden text-xs text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
                    )}
                  </div>

                  <div>
                    <p className="lg:hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Category</p>
                    <p className="text-sm font-semibold text-foreground">{titleCase(item.category)}</p>
                  </div>

                  <div>
                    <p className="lg:hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Data Type</p>
                    <p className="text-sm font-semibold text-foreground">{titleCase(item.dataType)}</p>
                  </div>

                  <div>
                    <p className="lg:hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Normal Range</p>
                    <p className="text-sm text-foreground">{getRangeLabel(item)}</p>
                  </div>

                  <div>
                    <Badge variant={item.isActive ? 'success' : 'cancelled'} size="sm" dot>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="flex lg:justify-end gap-2">
                    <Button
                      variant="outline"
                      size="xs"
                      icon={<Pencil className="h-3.5 w-3.5" />}
                      onClick={() => { setEditingItem(item); setShowModal(true); }}
                    >
                      Edit
                    </Button>
                    {item.isActive && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => deactivateMutation.mutate(item.id)}
                        loading={deactivateMutation.isPending}
                        className="text-red-500 hover:text-red-600"
                      >
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showModal && (
        <ObservationItemModal
          item={editingItem}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}
