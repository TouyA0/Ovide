import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
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
  const [fromId, setFromId] = useState(defaultFromId || accounts[0]?.id);
  const [toId, setToId] = useState(accounts.find(a => a.id !== (defaultFromId || accounts[0]?.id))?.id ?? '');
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
  const from = nameOf(fromId), to = nameOf(toId);
  const parsed = parseFloat(amount.replace(',', '.'));
  const valid = parsed > 0 && fromId !== toId && !!toId;

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
          </div>
          <button className="icon-btn tv-arrow" onClick={() => { setFromId(toId); setToId(fromId); }} aria-label="Inverser">
            <ArrowRight size={22} />
          </button>
          <div className="tv-acct">
            <div className="tv-lbl">Vers</div>
            <div className="tv-name">
              <i className="account-dot" style={{ background: `var(--m-${to.m?.couleur})` }} />
              {to.a?.nom}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>{to.m?.nom}</div>
          </div>
        </div>

        <div className="row2" style={{ marginTop: 14 }}>
          <div>
            <div className="field-label" style={{ marginTop: 4 }}>Depuis</div>
            <select className="selectx" value={fromId} onChange={e => setFromId(e.target.value)}>
              {accounts.map(a => { const m = members.find(mm => mm.id === a.memberId); return <option key={a.id} value={a.id}>{m?.nom} · {a.nom}</option>; })}
            </select>
          </div>
          <div>
            <div className="field-label" style={{ marginTop: 4 }}>Vers</div>
            <select className="selectx" value={toId} onChange={e => setToId(e.target.value)}>
              {accounts.filter(a => a.id !== fromId).map(a => { const m = members.find(mm => mm.id === a.memberId); return <option key={a.id} value={a.id}>{m?.nom} · {a.nom}</option>; })}
            </select>
          </div>
        </div>
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
