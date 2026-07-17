import { QueryClient } from "@tanstack/react-query";
import {
  createRouter,
  ErrorComponent,
  Link,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultRouteError({ error, reset }: ErrorComponentProps) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="mx-auto my-16 max-w-lg rounded-xl border border-white/10 bg-[#111] p-6 text-center">
      <h2 className="text-lg font-semibold text-white">This section failed to load</h2>
      <p className="mt-2 text-sm text-white/60">
        {msg.length > 240 ? msg.slice(0, 237) + "…" : msg || "Unexpected error."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-black transition hover:brightness-110"
        >
          Try again
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Go home
        </Link>
      </div>
      {/* Keep TanStack's own dev-friendly output around in dev builds */}
      {import.meta.env.DEV && (
        <div className="mt-6 text-left">
          <ErrorComponent error={error} />
        </div>
      )}
    </div>
  );
}

function DefaultRouteNotFound() {
  return (
    <div className="mx-auto my-16 max-w-lg rounded-xl border border-white/10 bg-[#111] p-6 text-center">
      <h2 className="text-lg font-semibold text-white">Not found</h2>
      <p className="mt-2 text-sm text-white/60">
        That resource doesn&rsquo;t exist or was removed.
      </p>
      <Link
        to="/"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-black transition hover:brightness-110"
      >
        Go home
      </Link>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultRouteError,
    defaultNotFoundComponent: DefaultRouteNotFound,
  });

  return router;
};
