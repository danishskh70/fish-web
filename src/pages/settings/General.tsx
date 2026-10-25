import { usePrefs, type ThemeMode } from "../../prefs";
import { SGroup, SelectRow, SubPage, SwitchRow, useSetPref } from "../../settings-ui";

export default function General() {
  const { p } = usePrefs();
  const save = useSetPref();
  return (
    <SubPage title="General" sub="Appearance and interface preferences">
      <SGroup title="Appearance">
        <SelectRow icon="sliders" label="Theme" hint="System follows your phone. Dark suits night work" value={p.theme}
          options={[["system", "System"], ["light", "Light"], ["dark", "Dark"]]}
          onChange={(v) => save({ theme: v as ThemeMode })} />
        <SelectRow icon="list" tone="b" label="Text size" value={p.text}
          options={[["normal", "Normal"], ["large", "Large"], ["xl", "Extra large"]]}
          onChange={(v) => save({ text: v as typeof p.text })} />
        <SwitchRow icon="flag" tone="o" label="Bright sun mode" hint="Stronger outlines for outdoor use" on={p.contrast} onChange={(v) => save({ contrast: v })} />
      </SGroup>
      <SGroup title="During distribution">
        <SwitchRow icon="check" label="Vibrate when saved" hint="A short buzz after each saved handover" on={p.vibrate} onChange={(v) => save({ vibrate: v })} />
        <SwitchRow icon="clock" tone="b" label="Keep screen awake" hint="The phone does not sleep during a session" on={p.awake} onChange={(v) => save({ awake: v })} />
        <SwitchRow icon="right" tone="p" label="Open next customer automatically" hint="After a handover, go straight to the next awaiting customer" on={p.autoNext} onChange={(v) => save({ autoNext: v })} />
      </SGroup>
    </SubPage>
  );
}
