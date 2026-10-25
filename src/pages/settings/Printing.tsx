import { useState } from "react";
import { Btn, Field } from "../../lib";
import { useLeave } from "../../extras";
import { usePrefs } from "../../prefs";
import { useToast } from "../../ui-feedback";
import { SGroup, InfoRow, SubPage } from "../../settings-ui";

export default function Printing() {
  const { p, set } = usePrefs();
  const { success } = useToast();
  const [f, setF] = useState({ biz: p.biz, bizAddr: p.bizAddr, bizPhone: p.bizPhone });
  const dirty = f.biz !== p.biz || f.bizAddr !== p.bizAddr || f.bizPhone !== p.bizPhone;
  const leave = useLeave(dirty);

  function save() {
    leave.skip();
    set({ biz: f.biz.trim() || "FishSeed Manager", bizAddr: f.bizAddr.trim(), bizPhone: f.bizPhone.trim() });
    success("Business details saved");
  }

  return (
    <SubPage title="Printing & sharing" sub="Bills, print layouts and exports">
      <h2 className="shead">Business details</h2>
      <div className="card">
        <Field label="Business name"><input className="input" value={f.biz} onChange={(e) => setF({ ...f, biz: e.target.value })} autoComplete="organization" /></Field>
        <Field label="Address (optional)"><input className="input" value={f.bizAddr} onChange={(e) => setF({ ...f, bizAddr: e.target.value })} autoComplete="street-address" /></Field>
        <Field label="Phone (optional)"><input className="input" inputMode="tel" value={f.bizPhone} onChange={(e) => setF({ ...f, bizPhone: e.target.value })} autoComplete="tel" /></Field>
        <div className="sub mb">Printed at the top of slips, order lists, packing lists and bills. Saved on this phone.</div>
        <div className="row">
          <Btn block disabled={!dirty} onClick={save}>Save</Btn>
          <Btn variant="outline" disabled={!dirty} onClick={() => setF({ biz: p.biz, bizAddr: p.bizAddr, bizPhone: p.bizPhone })}>Cancel</Btn>
        </div>
      </div>
      <SGroup title="How printing works" hint="Open a trip, tap Print and export, choose a document, then Print or Save PDF.">
        <InfoRow icon="print" tone="p" label="Documents" hint="Requirements, order list, packing list, summary, slips, bills" />
        <InfoRow icon="share" tone="b" label="Sharing" hint="Handover slips can be shared on WhatsApp. Bags only, never rates." />
      </SGroup>
    </SubPage>
  );
}
