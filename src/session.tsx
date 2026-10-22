import React, { createContext, useContext, useState } from "react";

// Temporary "payment answered" marks. Memory only. Lost on refresh. Never saved.
const Ctx = createContext<{ done: Set<number>; mark: (tripCustomerId: number) => void }>({ done: new Set(), mark: () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const mark = (id: number) => setDone((p) => new Set(p).add(id));
  return <Ctx.Provider value={{ done, mark }}>{children}</Ctx.Provider>;
}
export const useSessionDone = () => useContext(Ctx);
