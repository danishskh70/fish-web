import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getActiveTripId, listTrips } from "../api/api";
import { useApi } from "../api/hooks";
import { EmptyArt } from "../ui/art";
import { Icon } from "../ui/icons";
import { Button, Chip, ErrorBox, ListCard, ListRow, Page, Skeleton } from "../ui/kit";
import { useGo } from "../ui/back";
import { dateOnly, inr } from "../ui/format";

export function ActiveTripRedirect() {
  const nav = useNavigate();
  useEffect(() => { getActiveTripId().then((id) => nav(id ? `/trips/${id}` : "/trips", { replace: true })); }, [nav]);
  return null;
}

export default function Trips() {
  const go = useGo();
  const { data, error, loading, reload } = useApi(listTrips);
  const hasActive = data?.some((t) => t.status === "IN_PROGRESS");
  return (
    <Page title="Trips" sub="Tap a trip to see its customers" right={!hasActive ? <Button sm onClick={() => go("/trips/new")}><Icon n="plus" size={16} /> New</Button> : undefined}>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton n={4} />}
      {data && data.length === 0 && <div className="empty"><EmptyArt kind="trips" /><h3>No trips yet</h3><p className="sub">Start your first distribution trip.</p><Button onClick={() => go("/trips/new")}>Start new trip</Button></div>}
      {data && data.length > 0 && (
        <ListCard>
          {data.map((t) => (
            <ListRow key={t.id} icon={t.status === "IN_PROGRESS" ? "trips" : "check"} title={t.code} onClick={() => go(`/trips/${t.id}`)}
              sub={`${dateOnly(t.date)} · ${t.supplierName} · ${t.bags} bags`}
              right={<span className="lr-right">{t.status === "IN_PROGRESS" ? <Chip tone="info">Active</Chip> : t.remaining > 0 ? <Chip tone="warn">{inr(t.remaining)} due</Chip> : <Chip tone="ok">Settled</Chip>}<Icon n="chev" size={18} className="lr-chev" /></span>} />
          ))}
        </ListCard>
      )}
    </Page>
  );
}
