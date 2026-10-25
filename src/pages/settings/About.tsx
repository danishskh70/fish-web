import { Btn, Icon } from "../../lib";
import { useInstall } from "../../extras";
import { InfoRow, SGroup, SubPage } from "../../settings-ui";

export default function About() {
  const { canInstall, install } = useInstall();
  return (
    <SubPage title="About" sub="Version and application information">
      <SGroup>
        <InfoRow icon="info" label="FishSeed Manager" value={__APP_VERSION__.split(" ")[0]} hint={`Built ${__APP_VERSION__.split(" ")[1]?.replace(/[()]/g, "") ?? ""}`} />
        <InfoRow icon="down" tone="b" label="Updates" hint="When a new version is ready, a bar appears on the main tabs. Tap Update." />
      </SGroup>
      <SGroup title="Install on this phone">
        {canInstall && (
          <div className="li">
            <Btn block onClick={install}><Icon n="down" size={18} />Install app</Btn>
          </div>
        )}
        <InfoRow icon="check" label="Android" hint="Open in Chrome, tap the menu, then Install app." />
        <InfoRow icon="check" tone="b" label="iPhone" hint="Open in Safari, tap Share, then Add to Home Screen. Log in once inside the app." />
      </SGroup>
    </SubPage>
  );
}
