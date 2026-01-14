"use client";

import {
  MutationCache,
  Query,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

interface IProps {
  children: React.ReactNode;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 60000 * 30, // 30분
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
  queryCache: new QueryCache({
    onError: (
      error: Error,
      query: Query<unknown, unknown, unknown, readonly unknown[]>
    ) => {
      console.log("common query error", error, query);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: Error, mutation) => {
      console.log("common mutation error", error);
    },
  }),
});

function TanstackQueryProvider({ children }: IProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export default TanstackQueryProvider;
