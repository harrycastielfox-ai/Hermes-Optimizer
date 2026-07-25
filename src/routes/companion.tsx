import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { NexCompanion } from "@/components/nex-companion/NexCompanion";

export const Route = createFileRoute("/companion")({
  component: NexCompanionRoute,
});

function NexCompanionRoute() {
  useEffect(() => {
    document.documentElement.classList.add("nex-companion-host");
    document.body.classList.add("nex-companion-host");

    return () => {
      document.documentElement.classList.remove("nex-companion-host");
      document.body.classList.remove("nex-companion-host");
    };
  }, []);

  return <NexCompanion />;
}
