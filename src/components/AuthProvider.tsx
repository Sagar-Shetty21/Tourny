"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        dedupingInterval: 2000,
        errorRetryCount: 3,
      }}
    >
      <SessionProvider>{children}</SessionProvider>
    </SWRConfig>
  );
}
