import { useState } from 'react';
import { useStaff, useLocations } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Pencil, Plus, X, MapPin } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Staff } from '@/lib/types';

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AdminStaff() {
  const { data: staffList, isLoading } = useStaff();
  const { data: locations } = useLocations();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Staff | null>(null);
  const [creating, setCreating] = useState(false);

  async function save(s: Staff, isNew: boolean) {
    try {
      const id = isNew ? doc(collection(db, 'staff')).id : s.id;
      const data: Staff = { ...s, id };
      await setDoc(doc(db, 'staff', id), data);
      toast.success(isNew ? 'Staff added.' : 'Staff updated.');
      qc.invalidateQueries({ queryKey: ['staff'] });
      setEditing(null);
      setCreating(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="eyebrow mb-2">Team</p>
          <h1 className="font-display text-4xl sm:text-5xl">Staff &amp; availability</h1>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary"><Plus size={16} /> Add stylist</button>
      </div>

      {isLoading ? (
        <div className="text-ink-500 dark:text-ink-300">Loading…</div>
      ) : (
        <div className="grid gap-4">
          {(staffList ?? []).map((s) => {
            const loc = locations?.find((l) => l.id === s.locationId);
            const days = s.availability.map((a) => a.dow).sort((a, b) => a - b);
            const window = s.availability[0];
            return (
              <div key={s.id} className="card p-5 sm:p-6 flex items-center gap-5">
                {s.avatarUrl ? (
                  <img src={s.avatarUrl} alt="" className="h-14 w-14 rounded-2xl object-cover shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-blush-100 dark:bg-blush-800/40 grid place-items-center text-blush-700 dark:text-blush-300 font-medium shrink-0">
                    {s.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-display text-xl">{s.name}</p>
                  <p className="text-sm text-ink-600 dark:text-ink-200 mt-0.5">{s.title}</p>
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500 dark:text-ink-300">
                    <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {loc?.name ?? '—'}</span>
                    <span>{days.map((d) => DOW_LABELS[d]).join(', ')}</span>
                    {window ? <span className="num">{minToTime(window.startMin)}–{minToTime(window.endMin)}</span> : null}
                  </div>
                </div>
                <button onClick={() => setEditing(s)} className="h-10 w-10 grid place-items-center rounded-xl text-ink-500 hover:bg-ink-50 dark:hover:bg-ink-700/40" aria-label="Edit"><Pencil size={15} /></button>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {(editing || creating) && (
          <StaffModal
            initial={editing ?? undefined}
            locations={locations ?? []}
            onClose={() => { setEditing(null); setCreating(false); }}
            onSave={(s) => save(s, !!creating)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function minToTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? 'p' : 'a';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, '0')}${ampm}`;
}

function StaffModal({ initial, locations, onClose, onSave }: {
  initial?: Staff;
  locations: { id: string; name: string }[];
  onClose: () => void;
  onSave: (s: Staff) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [title, setTitle] = useState(initial?.title ?? 'Stylist');
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [locationId, setLocationId] = useState(initial?.locationId ?? locations[0]?.id ?? '');
  const [days, setDays] = useState<number[]>(initial?.availability.map((a) => a.dow) ?? [2, 3, 4, 5, 6]);
  const [startMin, setStartMin] = useState(initial?.availability[0]?.startMin ?? 9 * 60);
  const [endMin, setEndMin] = useState(initial?.availability[0]?.endMin ?? 18 * 60);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      id: initial?.id ?? '',
      name,
      title,
      bio,
      avatarUrl: initial?.avatarUrl,
      locationId,
      availability: days.map((dow) => ({ dow, startMin, endMin })),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] grid place-items-center px-4 py-8 bg-ink-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 8, scale: 0.98 }} animate={{ y: 0, scale: 1 }}
        className="card w-full max-w-lg p-6 sm:p-8 my-8" onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl">{initial ? 'Edit stylist' : 'Add stylist'}</h2>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-xl text-ink-500 hover:bg-ink-50 dark:hover:bg-ink-700/40"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Title</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea className="input min-h-[80px] resize-y" value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div>
            <label className="label">Location</label>
            <select className="input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Working days</label>
            <div className="flex flex-wrap gap-2">
              {DOW_LABELS.map((d, i) => {
                const on = days.includes(i);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i])}
                    className={`h-10 w-12 rounded-xl text-sm font-medium ${on ? 'bg-sage-600 text-white' : 'bg-ink-50 dark:bg-ink-700/40 text-ink-700 dark:text-ink-200'}`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start</label>
              <input type="time" className="input num" value={`${String(Math.floor(startMin/60)).padStart(2,'0')}:${String(startMin%60).padStart(2,'0')}`} onChange={(e) => { const [h,m] = e.target.value.split(':').map(Number); setStartMin(h*60+m); }} />
            </div>
            <div>
              <label className="label">End</label>
              <input type="time" className="input num" value={`${String(Math.floor(endMin/60)).padStart(2,'0')}:${String(endMin%60).padStart(2,'0')}`} onChange={(e) => { const [h,m] = e.target.value.split(':').map(Number); setEndMin(h*60+m); }} />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{initial ? 'Save changes' : 'Add stylist'}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
