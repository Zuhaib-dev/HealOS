"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

type AdminDataChangedEvent = {
  resources: string[];
  reason: string;
  timestamp: string;
};

export function useAdminRealtime(resources: string[], onChange: () => void) {
  const resourcesKey = resources.join("|");

  useEffect(() => {
    const socket = getSocket();
    const subscribedResources = resourcesKey.split("|");

    const handleChange = (event: AdminDataChangedEvent) => {
      if (event.resources.some((resource) => subscribedResources.includes(resource))) {
        onChange();
      }
    };

    socket.emit("join:role", "ADMIN");
    socket.on("admin:data_changed", handleChange);

    return () => {
      socket.off("admin:data_changed", handleChange);
    };
  }, [onChange, resourcesKey]);
}
