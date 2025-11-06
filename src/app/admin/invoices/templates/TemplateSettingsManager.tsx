"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Palette, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type InvoiceFormat = "STANDARD" | "VA_ABC_INSTATE" | "VA_ABC_TAX_EXEMPT";
type BaseTemplate = "STANDARD" | "VA_ABC_INSTATE_FULL" | "VA_ABC_INSTATE_CONDENSED" | "VA_ABC_TAX_EXEMPT";
type SignatureStyle = "full" | "condensed";

interface TemplatePalette {
  tableHeaderBackground: string;
  sectionHeaderBackground: string;
  accentTextColor: string;
  borderColor: string;
}

interface TemplateOptions {
  showCustomerIdColumn?: boolean;
  signatureStyle?: SignatureStyle;
}

interface TemplateSettings {
  formatType: InvoiceFormat;
  baseTemplate: BaseTemplate;
  palette: TemplatePalette;
  options: TemplateOptions;
  updatedAt?: string | null;
}

type TemplateState = Record<InvoiceFormat, TemplateSettings>;

const FORMAT_LABELS: Record<InvoiceFormat, string> = {
  STANDARD: "Standard",
  VA_ABC_INSTATE: "Virginia ABC (In-State)",
  VA_ABC_TAX_EXEMPT: "Virginia ABC (Tax-Exempt)",
};

const BASE_TEMPLATE_OPTIONS: Record<InvoiceFormat, Array<{ value: BaseTemplate; label: string }>> = {
  STANDARD: [
    { value: "STANDARD", label: "Standard Layout" },
  ],
  VA_ABC_INSTATE: [
    { value: "VA_ABC_INSTATE_FULL", label: "Full VA ABC Layout" },
    { value: "VA_ABC_INSTATE_CONDENSED", label: "Condensed VA ABC Layout" },
  ],
  VA_ABC_TAX_EXEMPT: [
    { value: "VA_ABC_TAX_EXEMPT", label: "Tax-Exempt Layout" },
  ],
};

const DEFAULT_TENANT_SLUG = process.env.NEXT_PUBLIC_PORTAL_TENANT_SLUG ?? "well-crafted";

export function TemplateSettingsManager() {
  const { toast } = useToast();

  const [templates, setTemplates] = useState<TemplateState | null>(null);
  const [initialTemplates, setInitialTemplates] = useState<TemplateState | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<InvoiceFormat>("VA_ABC_INSTATE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/invoices/templates", {
          headers: {
            "X-Tenant-Slug": DEFAULT_TENANT_SLUG,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }

        const data: { templates: TemplateSettings[] } = await response.json();

        const state = data.templates.reduce(
          (acc, template) => {
            acc[template.formatType] = template;
            return acc;
          },
          {} as TemplateState
        );

        setTemplates(state);
        setInitialTemplates(JSON.parse(JSON.stringify(state)) as TemplateState);

        if (!state[selectedFormat]) {
          const fallbackFormat = (Object.keys(state)[0] as InvoiceFormat) ?? "VA_ABC_INSTATE";
          setSelectedFormat(fallbackFormat);
        }
      } catch (err) {
        console.error("Failed to load invoice template settings", err);
        setError("Unable to load invoice template settings. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchTemplates();
  }, []);

  const currentSettings = useMemo(() => {
    if (!templates) return null;
    return templates[selectedFormat];
  }, [templates, selectedFormat]);

  const isDirty = useMemo(() => {
    if (!templates || !initialTemplates) return false;
    const current = templates[selectedFormat];
    const initial = initialTemplates[selectedFormat];
    if (!current || !initial) return false;
    return JSON.stringify(current) !== JSON.stringify(initial);
  }, [templates, initialTemplates, selectedFormat]);

  const handlePaletteChange = (field: keyof TemplatePalette, value: string) => {
    if (!templates) return;
    setTemplates((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      next[selectedFormat] = {
        ...prev[selectedFormat],
        palette: {
          ...prev[selectedFormat].palette,
          [field]: value,
        },
      };
      return next;
    });
  };

  const handleOptionChange = (field: keyof TemplateOptions, value: boolean | SignatureStyle) => {
    if (!templates) return;
    setTemplates((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      next[selectedFormat] = {
        ...prev[selectedFormat],
        options: {
          ...prev[selectedFormat].options,
          [field]: value,
        },
      };
      return next;
    });
  };

  const handleBaseTemplateChange = (value: BaseTemplate) => {
    if (!templates) return;
    setTemplates((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      next[selectedFormat] = {
        ...prev[selectedFormat],
        baseTemplate: value,
      };
      return next;
    });
  };

  const handleReset = () => {
    if (!templates || !initialTemplates) return;
    const initial = initialTemplates[selectedFormat];
    if (!initial) return;

    setTemplates((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [selectedFormat]: JSON.parse(JSON.stringify(initial)),
      };
    });
  };

  const handleSave = async () => {
    if (!templates) return;
    const current = templates[selectedFormat];
    if (!current) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/invoices/templates/${selectedFormat}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Slug": DEFAULT_TENANT_SLUG,
        },
        body: JSON.stringify({
          baseTemplate: current.baseTemplate,
          palette: current.palette,
          options: current.options,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const data: { settings: TemplateSettings } = await response.json();

      setTemplates((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [selectedFormat]: data.settings,
        };
      });
      setInitialTemplates((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [selectedFormat]: JSON.parse(JSON.stringify(data.settings)),
        };
      });

      toast({
        title: "Invoice template updated",
        description: "New settings will apply to freshly generated PDFs.",
      });
    } catch (err) {
      console.error("Failed to update invoice template settings", err);
      setError("Unable to save changes. Please try again.");
      toast({
        title: "Save failed",
        description: "We couldn't update the invoice template. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading invoice templates…</span>
        </CardContent>
      </Card>
    );
  }

  if (error && !currentSettings) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Invoice template settings unavailable</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!templates || !currentSettings) {
    return null;
  }

  const formatOptions = Object.entries(FORMAT_LABELS) as Array<[InvoiceFormat, string]>;
  const baseTemplateOptions = BASE_TEMPLATE_OPTIONS[selectedFormat];
  const lastUpdated = currentSettings.updatedAt
    ? new Date(currentSettings.updatedAt).toLocaleString()
    : "Not saved yet";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            Configure {FORMAT_LABELS[selectedFormat]}
          </CardTitle>
          <CardDescription>
            Adjust the layout and colors for the selected invoice format.
          </CardDescription>
        </div>

        <div className="min-w-[220px]">
          <Label className="text-xs uppercase text-muted-foreground">Invoice format</Label>
          <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as InvoiceFormat)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formatOptions.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="grid gap-8">
        <section className="grid gap-4 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-gray-900">Layout &amp; Colors</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Base template</Label>
              <Select
                value={currentSettings.baseTemplate}
                onValueChange={(value) => handleBaseTemplateChange(value as BaseTemplate)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {baseTemplateOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Table header color</Label>
              <Input
                type="color"
                value={currentSettings.palette.tableHeaderBackground}
                onChange={(event) => handlePaletteChange("tableHeaderBackground", event.target.value)}
                className="h-10 w-24 p-1"
                aria-label="Table header color"
              />
            </div>

            <div className="space-y-2">
              <Label>Section header color</Label>
              <Input
                type="color"
                value={currentSettings.palette.sectionHeaderBackground}
                onChange={(event) => handlePaletteChange("sectionHeaderBackground", event.target.value)}
                className="h-10 w-24 p-1"
                aria-label="Section header color"
              />
            </div>

            <div className="space-y-2">
              <Label>Border color</Label>
              <Input
                type="color"
                value={currentSettings.palette.borderColor}
                onChange={(event) => handlePaletteChange("borderColor", event.target.value)}
                className="h-10 w-24 p-1"
                aria-label="Border color"
              />
            </div>

            <div className="space-y-2">
              <Label>Accent text color</Label>
              <Input
                type="color"
                value={currentSettings.palette.accentTextColor}
                onChange={(event) => handlePaletteChange("accentTextColor", event.target.value)}
                className="h-10 w-24 p-1"
                aria-label="Accent text color"
              />
            </div>
          </div>
        </section>

        {selectedFormat === "VA_ABC_INSTATE" && (
          <section className="grid gap-4 rounded-lg border p-4">
            <h3 className="font-medium text-gray-900">In-state options</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">Show customer ID column</p>
                  <p className="text-xs text-muted-foreground">
                    Toggle the center column in the Bill To / Ship To header block.
                  </p>
                </div>
                <Switch
                  checked={currentSettings.options.showCustomerIdColumn ?? true}
                  onCheckedChange={(checked) => handleOptionChange("showCustomerIdColumn", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Signature section style</Label>
                <Select
                  value={currentSettings.options.signatureStyle ?? "full"}
                  onValueChange={(value) => handleOptionChange("signatureStyle", value as SignatureStyle)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Legacy signature block</SelectItem>
                    <SelectItem value="condensed">Condensed signature block</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-muted-foreground">
          Last updated: {lastUpdated}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!isDirty || saving}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </CardFooter>

      {error && (
        <div className="px-6 pb-6">
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        </div>
      )}
    </Card>
  );
}
