import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import {
  A,
  AppBar,
  Btn,
  Err,
  Load,
  Num,
  Pill,
  Seg,
  intOf,
  post,
  useAct,
  useGet,
  useTid,
  useTripPhase,
} from "../lib";
import { useLeave } from "../extras";
import { useConfirm, useToast } from "../ui-feedback";

// One data source: requirements + supplier order list. Packing is a view of the same list.
export default function Order() {
  const id = useTid();
  const nav = useNavigate();
  const confirm = useConfirm();
  const { success } = useToast();
  const { sl, phase } = useTripPhase(id);
  const rt = useGet(["req", id], `/trips/${id}/requirements-table`);
  const { act, err, busy } = useAct([["sl", id], ["pack", id], ["req", id]]);
  const [tab, setTab] = useState("order");

  const d = rt.data;
  const draft = sl.data?.find((s: A) => s.status === "DRAFT");
  const final = sl.data?.find((s: A) => s.status === "FINAL");
  const list = final ?? draft;
  const edit = phase === "preparing" && !!draft;

  // Controlled quantities state
  const [quantities, setQuantities] = useState<Record<number, string>>({});

  // Sync draft items into controlled state whenever draft updates
  useEffect(() => {
    if (draft?.items) {
      const init: Record<number, string> = {};
      draft.items.forEach((i: A) => {
        init[i.fish_type_id] = String(i.quantity_bags);
      });
      setQuantities(init);
    }
  }, [draft?.id]);

  const originalQuantities = useMemo(() => {
    const orig: Record<number, number> = {};
    if (draft?.items) {
      draft.items.forEach((i: A) => {
        orig[i.fish_type_id] = i.quantity_bags;
      });
    }
    return orig;
  }, [draft?.items]);

  const dirty = useMemo(() => {
    if (!edit || !draft?.items) return false;
    return draft.items.some((i: A) => {
      const currentVal = intOf(quantities[i.fish_type_id] ?? i.quantity_bags);
      return currentVal !== (originalQuantities[i.fish_type_id] ?? i.quantity_bags);
    });
  }, [edit, draft?.items, quantities, originalQuantities]);

  const leave = useLeave(dirty);

  if (!sl.data || !rt.data || !phase) {
    return (
      <>
        <AppBar title="Order list" onBack={() => nav(`/trips/${id}`)} />
        <Load q={sl.data ? rt : sl} />
      </>
    );
  }

  const qtyOf = (c: A, fid: number) =>
    c.quantities.find((q: A) => q.fish_type_id === fid)?.quantity_bags ?? 0;
  const demandOf = (fid: number) =>
    d.fish_totals.find((t: A) => t.fish_type_id === fid)?.quantity_bags ?? 0;

  async function build() {
    const ok = await act(async () => {
      // Parallelize planned-quantity PATCHes and fail fast
      const patches = d.fish_totals
        .filter((t: A) => t.planned_quantity_bags !== t.quantity_bags)
        .map((t: A) =>
          post(
            `/trips/${id}/fish-types/${t.fish_type_id}/planned-quantity`,
            { planned_quantity_bags: t.quantity_bags },
            "PATCH"
          )
        );
      await Promise.all(patches);
      await post(`/trips/${id}/supplier-lists/drafts`);
    });
    if (ok) {
      success("Order list created from requirements");
    }
  }

  // Persist any changed quantities to server
  async function persistQuantityChanges() {
    if (!draft?.items) return;
    const changed = draft.items.filter((i: A) => {
      const val = intOf(quantities[i.fish_type_id] ?? i.quantity_bags);
      return val !== i.quantity_bags;
    });

    if (changed.length > 0) {
      await Promise.all(
        changed.map((i: A) =>
          post(
            `/trips/${id}/supplier-lists/${draft.id}/items/${i.fish_type_id}`,
            { quantity_bags: intOf(quantities[i.fish_type_id]) },
            "PATCH"
          )
        )
      );
    }
  }

  // Save trip configuration = finalize order list + create packing list from same items.
  async function save() {
    const ok = await act(async () => {
      await persistQuantityChanges();
      await post(`/trips/${id}/supplier-lists/${draft.id}/finalize`);
      let hasPack = false;
      try {
        await api(`/trips/${id}/packing-list`);
        hasPack = true;
      } catch (e) {
        if ((e as ApiError).status !== 404) throw e;
      }
      if (!hasPack) {
        await post(`/trips/${id}/packing-list`, {
          items: draft.items.map((i: A) => ({
            fish_type_id: i.fish_type_id,
            quantity_bags: intOf(quantities[i.fish_type_id] ?? i.quantity_bags),
          })),
        });
      }
    });
    if (ok) {
      success("Trip configuration saved!");
      nav(`/trips/${id}`, { replace: true });
    }
  }

  const handleRebuild = async () => {
    const confirmed = await confirm({
      title: "Rebuild order list?",
      body: "This will reset all customized quantities to match current customer requirements.",
      confirmLabel: "Rebuild",
      danger: true,
    });
    if (confirmed) {
      await build();
    }
  };

  const handleSaveConfig = async () => {
    const confirmed = await confirm({
      title: "Save trip configuration?",
      body: "The order list and packing list will be finalized and locked. You can then begin the delivery session.",
      confirmLabel: "Finalize & Save",
    });
    if (confirmed) {
      await save();
    }
  };

  const currentTotalBags = list?.items.reduce(
    (acc: number, i: A) => acc + intOf(quantities[i.fish_type_id] ?? i.quantity_bags),
    0
  );

  return (
    <>
      <AppBar
        title="Order list"
        sub={final ? "Saved" : "Customize, then save"}
        onBack={() => leave(`/trips/${id}`)}
      />
      <div className="page">
        <Err m={err} />
        {!list && (
          <div className="card center">
            <div className="b">No order list yet</div>
            <div className="sub mt2 mb">
              Built from your customer requirements ({d.grand_total_bags} bags).
            </div>
            {phase === "preparing" && (
              <Btn block busy={busy} disabled={d.grand_total_bags === 0} onClick={build}>
                Create order list
              </Btn>
            )}
          </div>
        )}
        {list && (
          <>
            <Seg
              value={tab}
              onChange={setTab}
              items={[
                ["order", "Order list"],
                ["pack", "Packing view"],
              ]}
            />
            {final && (
              <div className="alert ok" role="status">
                Configuration saved. Order and packing are locked.
              </div>
            )}
            {tab === "pack" && (
              <div className="alert info">
                Same data as the order list. Nothing to enter here.
              </div>
            )}

            {list.items.map((i: A) => {
              const val = quantities[i.fish_type_id] ?? String(i.quantity_bags);
              return (
                <div className="card" key={i.id}>
                  <div className="between">
                    <div>
                      <div className="b">{i.fish_type_name}</div>
                      <div className="sub">Customers want {demandOf(i.fish_type_id)}</div>
                    </div>
                    {tab === "order" && edit ? (
                      <Num
                        className="input tiny"
                        value={val}
                        aria-label={`Order quantity for ${i.fish_type_name}`}
                        onChange={(e) =>
                          setQuantities({
                            ...quantities,
                            [i.fish_type_id]: e.target.value.replace(/\D/g, ""),
                          })
                        }
                      />
                    ) : (
                      <span className="b num" style={{ fontSize: "1.3rem" }}>
                        {i.quantity_bags}
                      </span>
                    )}
                  </div>
                  <div style={{ borderTop: "1px dashed var(--bd)", marginTop: 10, paddingTop: 8 }}>
                    {d.customers
                      .filter((c: A) => qtyOf(c, i.fish_type_id) > 0)
                      .map((c: A) => (
                        <div
                          className="between sub"
                          key={c.trip_customer_id}
                          style={{ padding: "2px 0" }}
                        >
                          <span>{c.name}</span>
                          <b className="num">{qtyOf(c, i.fish_type_id)}</b>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
            <div className="between card">
              <span className="b">Total bags</span>
              <span className="b num" style={{ fontSize: "1.3rem" }}>
                {edit ? currentTotalBags : list.total_bags}
              </span>
            </div>
            {list.total_bags !== d.grand_total_bags && phase === "preparing" && (
              <div className="alert warn">
                Order total {list.total_bags}, requirements total {d.grand_total_bags}.{" "}
                <button
                  type="button"
                  style={{ textDecoration: "underline", color: "inherit", font: "inherit" }}
                  onClick={handleRebuild}
                >
                  Rebuild from requirements
                </button>
              </div>
            )}
            {edit && (
              <div className="cta">
                <Btn block busy={busy} onClick={handleSaveConfig}>
                  Save trip configuration
                </Btn>
              </div>
            )}
          </>
        )}
        {phase !== "preparing" && !final && <Pill tone="warn">Locked</Pill>}
      </div>
    </>
  );
}
