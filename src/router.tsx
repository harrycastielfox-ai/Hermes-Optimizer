import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import type { RouterHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = (history?: RouterHistory) => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    history,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
