import { useNavigate } from "react-router-dom";
import { AppBar, Btn, Icon } from "../lib";

export default function NotFound() {
  const nav = useNavigate();
  return (
    <>
      <AppBar title="Page Not Found" onBack={() => nav("/dashboard")} />
      <div className="page center" style={{ paddingTop: 80, paddingLeft: 20, paddingRight: 20 }}>
        <div
          className="avatar warn"
          style={{ margin: "0 auto 16px", width: 64, height: 64 }}
        >
          <Icon n="alert" size={32} />
        </div>
        <h2 style={{ fontSize: "1.4rem", marginBottom: 8 }}>404 · Page Not Found</h2>
        <div className="sub mb" style={{ maxWidth: 320, margin: "0 auto 24px" }}>
          The page or trip link you visited doesn't exist or has moved.
        </div>
        <Btn onClick={() => nav("/dashboard")}>
          <Icon n="home" size={18} />
          Back to Dashboard
        </Btn>
      </div>
    </>
  );
}
