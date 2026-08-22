"use client";

import React from "react";
import { PanelHeader } from "@/components/admin/admin-shell";

export function DispensePanel() {
  return (
    <section>
      <PanelHeader
        index="02 / dispense"
        title="Dispense Medications"
        note="Scan barcode or enter prescription ID to dispense"
      />
      <div className="p-5">
        <p className="text-sm text-muted-foreground">Dispense functionality coming soon.</p>
      </div>
    </section>
  );
}
