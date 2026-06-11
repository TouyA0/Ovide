import { useState, useEffect, useRef } from 'react';
import { ArrowRight, ChevronDown, Loader2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Modal } from './Modal';
import { today } from '../../utils/format';
import type { Account, Member, Category } from '../../api/client';

function CategoryIcon({ icone, size = 16 }: { icone: string; size?: number }) {
  const Comp = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[
    icone.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  ];
  return Comp ? <Comp size={size} /> : null;
}

interface Props {
  accounts: Account[];
  members: Member[];
  categories: Category[];
  defaultFromId: string;
  isPending?: boolean;
  onClose: () => void;
  onSave: (data: { fromId: string; toId: string; montant: number; date: string; libelle: string; note: string; categorieId?: string | null; categorieIdDest?: string | null }) => void;
}

export function TransferModal({ accounts, members, categories, defaultFromId, isPending, onClose, onSave }: Props) {
  const fromId = defaultFromId || accounts[0]?.id;
  const otherAccounts = accounts.filter(a => a.id !== fromId);
  const [toId, setToId] = useState(otherAccounts[0]?.id ?? '');
  const [picking, setPicking] = useState(false);
  const expenseCats = categories.filter(c => (c.type ?? 'expense') === 'expense');
  const incomeCats = categories.filter(c => (c.type ?? 'expense') === 'income');
  const [catId, setCatId] = useState<string | null>(expenseCats[0]?.id ?? null);
  const [catIdDest, setCatIdDest] = useState<string | null>('cat_remboursement');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [libelle, setLibelle] = useState('');
  const [note, setNote] = useState('');
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const t = setTimeout(() => amountRef.current?.focus(), 80); return () => clearTimeout(t); }, []);

  const nameOf = (id: string) => {
    const a = accounts.find(x => x.id === id);
    const m = members.find(mm => mm.id === a?.memberId);
    return { a, m };
  };
  const from = nameOf(fromId);
  const to = nameOf(toId);
  const parsed = parseFloat(amount.replace(',', '.'));
  const valid = parsed > 0 && !!toId && !!libelle.trim() && !!catId && !!catIdDest;

  return (
    <Modal title="Virement entre comptes" onClose={onClose}>
      <div className="modal-body">
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Déplace de l'argent sans fausser les statistiques : deux écritures liées, exclues des dépenses et entrées.
        </p>

        <div className="amount-field" style={{ paddingTop: 4 }}>
          <input ref={amountRef} className="amount-input" inputMode="decimal" placeholder="0,00"
            value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))} aria-label="Montant" />
          <span className="cur">€</span>
        </div>

        <div className="transfer-viz">
          <div className="tv-acct">
            <div className="tv-lbl">Depuis</div>
            <div className="tv-name">
              <i className="account-dot" style={{ background: `var(--m-${from.m?.couleur})` }} />
              {from.a?.nom}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>{from.m?.nom}</div>
            <div className="tv-cat-grid">
              {expenseCats.map(c => (
                <button key={c.id} type="button" className={`tv-cat-chip${catId === c.id ? ' on' : ''}`}
                  style={{ '--chip-hue': c.hue } as React.CSSProperties}
                  onClick={() => setCatId(c.id)} title={c.nom}>
                  <span className="tv-cat-ic"><CategoryIcon icone={c.icone} size={15} /></span>
                  <span className="tv-cat-name">{c.nom}</span>
                </button>
              ))}
            </div>
          </div>

          <ArrowRight size={22} style={{ color: 'var(--accent)', flexShrink: 0 }} />

          <div className="tv-acct">
            <button type="button" className="tv-acct-header" onClick={() => setPicking(p => !p)}>
              <div className="tv-lbl">Vers</div>
              <div className="tv-name">
                <i className="account-dot" style={{ background: `var(--m-${to.m?.couleur})` }} />
                {to.a?.nom ?? '—'}
                <ChevronDown size={14} className="tv-acct-chevron" style={{ marginLeft: 'auto', transition: 'transform .15s', transform: picking ? 'rotate(180deg)' : 'none' }} />
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{to.m?.nom}</div>
            </button>
            {picking && (
              <div className="tv-picker">
                {otherAccounts.map(a => {
                  const m = members.find(mm => mm.id === a.memberId);
                  return (
                    <button key={a.id} className={`tv-option${a.id === toId ? ' on' : ''}`}
                      onClick={() => { setToId(a.id); setPicking(false); }}>
                      <i className="account-dot" style={{ background: `var(--m-${m?.couleur})`, width: 8, height: 8, flexShrink: 0 }} />
                      <span className="tv-option-name">{a.nom}</span>
                      <span className="tv-option-member">{m?.nom}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="tv-cat-grid">
              {incomeCats.map(c => (
                <button key={c.id} type="button" className={`tv-cat-chip${catIdDest === c.id ? ' on' : ''}`}
                  style={{ '--chip-hue': c.hue } as React.CSSProperties}
                  onClick={() => setCatIdDest(c.id)} title={c.nom}>
                  <span className="tv-cat-ic"><CategoryIcon icone={c.icone} size={15} /></span>
                  <span className="tv-cat-name">{c.nom}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="field-label" style={{ marginTop: 14 }}>Détails</div>
        <div className="row2">
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Date" />
          <input className="input" placeholder="Libellé" value={libelle} onChange={e => setLibelle(e.target.value)} />
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <textarea className="input" placeholder="Commentaire (optionnel)" value={note} onChange={e => setNote(e.target.value)}
            rows={2} style={{ resize: 'none', lineHeight: 1.5 }} />
        </div>
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={!!isPending}>Annuler</button>
        <button className="btn primary" disabled={!valid || !!isPending}
          onClick={() => valid && onSave({ fromId, toId, montant: Math.abs(parsed), date, libelle: libelle.trim(), note: note.trim(), categorieId: catId, categorieIdDest: catIdDest })}>
          {isPending ? <Loader2 size={15} className="spin" /> : <>Transférer {valid ? parsed.toFixed(2).replace('.', ',') + ' €' : ''}</>}
        </button>
      </div>
    </Modal>
  );
}
