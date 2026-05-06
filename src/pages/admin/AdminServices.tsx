import { useState } from 'react';
import { useServices, useStaff } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { doc, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Clock, X } from 'lucide-react';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useConfirm } from '@/components/ConfirmModal';
import type { Service } from '@/lib/types';

export function AdminServices() {
  const { data: services, isLoading } = useServices();
  const { data: staffList } = useStaff();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);

  async function save(s: Service, isNew: boolean) {
    try {
      const id = isNew ? doc(collection(db, 'services')).id : s.id;
      const data: Service = { ...s, id };
      await setDoc(doc(db, 'services', id), data);
      toast.success(isNew ? 'Service added.' : 'Service updated.');
      qc.invalidateQueries({ queryKey: ['services'] });
      setEditing(null);
      setCreating(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(s: Service) {
    const ok = await confirm({
      title: 'Delete service?',
      message: `${s.name} will be removed from the menu. Existing bookings keep their record.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'services', s.id));
      toast.success('Deleted.');
      qc.invalidateQueries({ queryKey: ['services'] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="eyebrow mb-2">Menu</p>
          <h1 className="font-display text-4xl sm:text-5xl">Services</h1>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary"><Plus size={16} /> Add service</button>
      </div>

      {isLoading ? (
        <div className="text-ink-500 dark:text-ink-300">Loading…</div>
      ) : (
        <div className="grid gap-4">
          {(services ?? []).map((s) => (
            <div key={s.id} className="card p-5 sm:p-6 flex items-start gap-5">
              <div className="flex-1 min-w-0">
                <p className="font-display text-xl">{s.name}</p>
                <p className="text-sm text-ink-600 dark:text-ink-200 mt-1.5 leading-relaxed">{s.description}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-500 dark:text-ink-300">
                  <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {formatDuration(s.durationMin)}</span>
                  <span className="num font-medium text-ink-800 dark:text-ink-100">{formatCurrency(s.priceCents)}</span>
                  <span>{s.staffIds.length} staff</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setEditing(s)} className="h-10 w-10 grid place-items-center rounded-xl text-ink-500 hover:bg-ink-50 dark:hover:bg-ink-700/40" aria-label="Edit"><Pencil size={15} /></button>
                <button onClick={() => remove(s)} className="h-10 w-10 grid place-items-center rounded-xl text-blush-600 hover:bg-blush-50 dark:hover:bg-blush-800/30" aria-label="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {(editing || creating) && (
          <ServiceModal
            initial={editing ?? undefined}
            staffList={staffList ?? []}
            onClose={() => { setEditing(null); setCreating(false); }}
            onSave={(s) => save(s, !!creating)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ServiceModal({ initial, staffList, onClose, onSave }: {
  initial?: Service;
  staffList: { id: string; name: string }[];
  onClose: () => void;
  onSave: (s: Service) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [durationMin, setDurationMin] = useState(initial?.durationMin ?? 60);
  const [priceCents, setPriceCents] = useState(initial?.priceCents ?? 6000);
  const [staffIds, setStaffIds] = useState<string[]>(initial?.staffIds ?? []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      id: initial?.id ?? '',
      name,
      description,
      durationMin,
      priceCents,
      color: initial?.color ?? 'sage',
      staffIds,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] grid place-items-center px-4 py-8 bg-ink-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 8, scale: 0.98 }} animate={{ y: 0, scale: 1 }}
        className="card w-full max-w-lg p-6 sm:p-8" onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl">{initial ? 'Edit service' : 'Add service'}</h2>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-xl text-ink-500 hover:bg-ink-50 dark:hover:bg-ink-700/40"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[88px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Duration (min)</label>
              <input type="number" min={15} step={15} className="input num" value={durationMin} onChange={(e) => setDurationMin(parseInt(e.target.value) || 0)} required />
            </div>
            <div>
              <label className="label">Price (USD)</label>
              <input type="number" min={0} step={1} className="input num" value={priceCents / 100} onChange={(e) => setPriceCents(Math.round((parseFloat(e.target.value) || 0) * 100))} required />
            </div>
          </div>
          <div>
            <label className="label">Available with</label>
            <div className="flex flex-wrap gap-2">
              {staffList.map((s) => {
                const on = staffIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStaffIds(on ? staffIds.filter((x) => x !== s.id) : [...staffIds, s.id])}
                    className={`pill border ${on ? 'bg-sage-600 text-white border-sage-600' : 'bg-white dark:bg-ink-800 border-ink-200 dark:border-ink-600 text-ink-700 dark:text-ink-200'}`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{initial ? 'Save changes' : 'Add service'}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
