"use client";

import { useState, useTransition } from "react";

export function IncidentAckButton({ pingId }: { pingId: string }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, startTransition] = useTransition();
  const disabled = acknowledged || pending;

  async function handleClick() {
    startTransition(async () => {
      const response = await fetch("/api/devops/incidents/ack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pingId }),
      });
      if (response.ok) {
        setAcknowledged(true);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
    >
      {acknowledged ? "Acknowledged" : pending ? "Ack…" : "Acknowledge"}
    </button>
  );
}
