import { useState, useEffect, useRef } from 'react';
import { ArrowRight, ChevronDown, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { today } from '../../utils/format';
import type { Account, Member } from '../../api/client';

interface Props {
  accounts: Account[];
  members: Member[];
  defaultFromId: string;
  isPending?: boolean;
  onClose: () => void;
  onSave: (data: { fromId: string; toId: string; montant: number; date: string; libelle: string }) => void;
}

export function TransferModal({ accounts, members, defaultFromId, isPending, onClose, onSave }: Props) {
  const fromId = defaultFromId || accounts[0]?.id;
  const otherAccounts = accounts.filter(a => a.id !== fromId);
  const [toId, setToId] = useState(otherAccounts[0]?.id ?? '');
  const [picking, setPicking] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [libelle, setLibelle] = useState('');
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
  const valid = parsed > 0 && !!toId;

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
          {/* DEPUIS — fixe */}
          <div className="tv-acct">
            <div className="tv-lbl">Depuis</div>
            <div className="tv-name">
              <i className="account-dot" style={{ background: `var(--m-${from.m?.couleur})` }} />
              {from.a?.nom}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>{from.m?.nom}</div>
          </div>

          <ArrowRight size={22} style={{ color: 'var(--accent)', flexShrink: 0 }} />

          {/* VERS — cliquable */}
          <button className={`tv-acct tv-acct-select${picking ? ' is-open' : ''}`} onClick={() => setPicking(p => !p)}>
            <div className="tv-lbl">Vers <ChevronDown size={11} style={{ marginLeft: 3, opacity: 0.6, transition: 'transform .15s', transform: picking ? 'rotate(180deg)' : 'none' }} /></div>
            <div className="tv-name">
              <i className="account-dot" style={{ background: `var(--m-${to.m?.couleur})` }} />
              {to.a?.nom ?? '—'}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>{to.m?.nom}</div>
          </button>
        </div>

        {/* Picker inline */}
        {picking && (
          <div className="tv-picker">
            {otherAccounts.map(a => {
              const m = members.find(mm => mm.id === a.memberId);
              return (
                <button
                  key={a.id}
                  className={`tv-option${a.id === toId ? ' on' : ''}`}
                  onClick={() => { setToId(a.id); setPicking(false); }}
                >
                  <i className="account-dot" style={{ background: `var(--m-${m?.couleur})`, width: 8, height: 8, flexShrink: 0 }} />
                  <span className="tv-option-name">{a.nom}</span>
                  <span className="tv-option-member">{m?.nom}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="row2" style={{ marginTop: 12 }}>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Date" />
          <input className="input" placeholder="Libellé (optionnel)" value={libelle} onChange={e => setLibelle(e.target.value)} />
        </div>
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={!!isPending}>Annuler</button>
        <button className="btn primary" disabled={!valid || !!isPending}
          onClick={() => valid && onSave({ fromId, toId, montant: Math.abs(parsed), date, libelle: libelle.trim() || 'Virement' })}>
          {isPending ? <Loader2 size={15} className="spin" /> : <>Transférer {valid ? parsed.toFixed(2).replace('.', ',') + ' €' : ''}</>}
        </button>
      </div>
    </Modal>
  );
}
