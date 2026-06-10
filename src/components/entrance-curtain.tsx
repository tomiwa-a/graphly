"use client";

import { useEffect, useState } from "react";

export function EntranceCurtain() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGone(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-surface pointer-events-none"
      style={{
        opacity: gone ? 0 : 1,
        transition: "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    />
  );
}
