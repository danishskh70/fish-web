import { getOutstanding } from "../api/api";
import { useApi } from "../api/hooks";
import { EmptyArt } from "../ui/art";
import { Icon } from "../ui/icons";
import { Chip, ErrorBox, ListCard, ListRow, Page, Skeleton } from "../ui/kit";
import { useBack, useGo } from "../ui/back";
import { dateOnly, inr } from "../ui/format";

export default function Outstanding() {
  const back = useBack("/dashboard");
  const go = useGo();
  const { data, error, reload } = useApi(getOutstanding);
  return (
    <Page title="To collect" sub="Money still owed, trip by trip" onBack={back}>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {!data && !error && <Skeleton n={3} />}
      {data && (
        <>
          <div className="card paysum"><div className="trio one"><div><span className="sub">Total outstanding</span><b className="num big-n warn-t">{inr(data.total)}</b></div></div></div>
          {data.trips.length === 0 && <div className="empty"><EmptyArt kind="payments" /><h3>All settled</h3></div>}
          <ListCard>
            {data.trips.map((t) => <ListRow key={t.tripId} icon="trips" title={t.code} sub={`${dateOnly(t.date)} · ${t.customers} customer${t.customers > 1 ? "s" : ""}`} onClick={() => go(`/trips/${t.tripId}?due=1`)}
              right={<span className="lr-right"><Chip tone="warn">{inr(t.remaining)}</Chip><Icon n="chev" size={18} className="lr-chev" /></span>} />)}
          </ListCard>
        </>
      )}
    </Page>
  );
}
