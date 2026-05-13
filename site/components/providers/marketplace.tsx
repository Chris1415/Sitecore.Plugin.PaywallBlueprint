"use client";

/**
 * marketplace.tsx — MarketplaceProvider + hooks
 *
 * Expanded in T023 (Tranche B) to query BOTH application.context AND host.user.
 * Provider renders children only when BOTH resolve (ADR-0008 null-guard pattern).
 *
 * Exported hooks:
 *   useMarketplaceClient() — returns the initialized ClientSDK instance
 *   useAppContext()        — returns the resolved ApplicationContext
 *   useHostUser()          — returns the resolved HostUser (Auth0 claims)
 *
 * sitecore:marketplace-sdk-client § 3a, § 4:
 *   client.query('application.context') → result.data (single unwrap, base-map key)
 *   client.query('host.user')           → result.data (single unwrap, base-map key)
 *
 * host.user runtime shape: project-planning/architecture/sdk-fixtures/host-user.json
 * The .d.ts declares { id, name, email } but the real Auth0 shape includes
 * given_name, family_name, sub, and namespaced claims. We use HostUser with
 * an index signature to accept the full runtime object without `any`.
 */

import {
  type ApplicationContext,
  ClientSDK,
} from "@sitecore-marketplace-sdk/client";
import { XMC } from "@sitecore-marketplace-sdk/xmc";
import type React from "react";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// HostUser type — keys we actually consume in the display chain.
// Index signature accepts the full Auth0 claims object without casting to any.
// shape: project-planning/architecture/sdk-fixtures/host-user.json
// ---------------------------------------------------------------------------
export interface HostUser {
  sub?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  [key: string]: unknown;
}

interface ClientSDKProviderProps {
  children: ReactNode;
}

const ClientSDKContext = createContext<ClientSDK | null>(null);
const AppContextContext = createContext<ApplicationContext | null>(null);
const HostUserContext = createContext<HostUser | null>(null);

export const MarketplaceProvider: React.FC<ClientSDKProviderProps> = ({
  children,
}) => {
  const [client, setClient] = useState<ClientSDK | null>(null);
  const [appContext, setAppContext] = useState<ApplicationContext | null>(null);
  const [hostUser, setHostUser] = useState<HostUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Query application.context once the client is ready
  useEffect(() => {
    if (client) {
      client.query("application.context").then((res) => {
        if (res?.data) {
          setAppContext(res.data);
        }
      });
    }
  }, [client]);

  // Query host.user once the client is ready (separate effect so failures are isolated)
  // sitecore:marketplace-sdk-client § 4: 'host.user' is a base-map key → result.data (single unwrap)
  useEffect(() => {
    if (client) {
      client.query("host.user").then((res) => {
        if (res?.data) {
          // Cast through unknown: runtime shape is the full Auth0 claims object
          // which exceeds the SDK's declared UserInfo { id, name, email }.
          // The index signature on HostUser accepts the full runtime payload.
          setHostUser(res.data as unknown as HostUser);
        }
      });
    }
  }, [client]);

  useEffect(() => {
    const init = async () => {
      const config = {
        target: window.parent,
        modules: [XMC],
      };
      try {
        setLoading(true);
        const sdkClient = await ClientSDK.init(config);
        setClient(sdkClient);
      } catch (err) {
        console.error("Error initializing client SDK", err);
        setError("Error initializing client SDK");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  if (loading) {
    return <div>Attempting to connect to Sitecore Marketplace...</div>;
  }

  if (error) {
    return (
      <div>
        <h1>Error initializing Marketplace SDK</h1>
        <div>{error}</div>
        <div>
          Please check if the client SDK is loaded inside Sitecore Marketplace
          parent window and you have properly set your app&apos;s extension points.
        </div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  // ADR-0008: render children only when BOTH appContext AND hostUser are non-null.
  // This extends the original null-guard pattern to the new HostUserContext.
  if (!appContext || !hostUser) {
    return null;
  }

  return (
    <ClientSDKContext.Provider value={client}>
      <AppContextContext.Provider value={appContext}>
        <HostUserContext.Provider value={hostUser}>
          {children}
        </HostUserContext.Provider>
      </AppContextContext.Provider>
    </ClientSDKContext.Provider>
  );
};

export const useMarketplaceClient = () => {
  const context = useContext(ClientSDKContext);
  if (!context) {
    throw new Error(
      "useMarketplaceClient must be used within a MarketplaceProvider",
    );
  }
  return context;
};

export const useAppContext = () => {
  const context = useContext(AppContextContext);
  if (!context) {
    throw new Error("useAppContext must be used within a MarketplaceProvider");
  }
  return context;
};

/**
 * useHostUser — returns the resolved host.user Auth0 claims object.
 * Throws if used outside MarketplaceProvider.
 *
 * The HostUser type covers the keys the display chain consumes.
 * The index signature accepts the full runtime Auth0 payload.
 *
 * shape: project-planning/architecture/sdk-fixtures/host-user.json
 */
export const useHostUser = (): HostUser => {
  const context = useContext(HostUserContext);
  if (!context) {
    throw new Error("useHostUser must be used within a MarketplaceProvider");
  }
  return context;
};
