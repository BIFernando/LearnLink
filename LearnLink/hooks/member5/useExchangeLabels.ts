import { useEffect, useState } from "react";

import { getExchangeLabel } from "@/services/chatService";

/** exchangeRequestId → "Python ⇄ UI Design" (null when unavailable). */
export function useExchangeLabels(exchangeRequestIds: string[]): Record<string, string | null> {
  const [labels, setLabels] = useState<Record<string, string | null>>({});
  const key = [...new Set(exchangeRequestIds.filter(Boolean))].sort().join(",");

  useEffect(() => {
    let active = true;
    const ids = key ? key.split(",") : [];
    Promise.all(ids.map(async (id) => [id, await getExchangeLabel(id)] as const)).then((entries) => {
      if (active) setLabels(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [key]);

  return labels;
}
