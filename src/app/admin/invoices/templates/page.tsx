"use client";

import { TemplateSettingsManager } from "./TemplateSettingsManager";

export default function InvoiceTemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Invoice Templates
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure base layouts and colors for each invoice format. Changes apply to newly generated PDFs immediately.
        </p>
      </div>

      <TemplateSettingsManager />
    </div>
  );
}
