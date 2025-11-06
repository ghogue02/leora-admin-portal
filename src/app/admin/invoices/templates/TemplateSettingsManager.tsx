"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, FileDown, Loader2, Palette, Settings2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { COLUMN_PRESETS } from "@/lib/invoices/column-presets";

type InvoiceFormat = "STANDARD" | "VA_ABC_INSTATE" | "VA_ABC_TAX_EXEMPT";
type BaseTemplate = "STANDARD" | "VA_ABC_INSTATE_FULL" | "VA_ABC_INSTATE_CONDENSED" | "VA_ABC_TAX_EXEMPT";
type SignatureStyle = "full" | "condensed";
type ColumnAlign = "left" | "center" | "right";

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

interface TemplateColumn {
  id: string;
  label: string;
  width: number;
  align: ColumnAlign;
  enabled: boolean;
}

interface TemplateSections {
  showBillTo: boolean;
  showShipTo: boolean;
  showCustomerInfo: boolean;
  showTotals: boolean;
  showSignature: boolean;
  showComplianceNotice: boolean;
}

type HeaderNotePosition = "beforeHeader" | "afterHeader" | "beforeTable" | "afterTable";

interface TemplateHeaderNote {
  id: string;
  label: string;
  text: string;
  enabled: boolean;
  position: HeaderNotePosition;
}

interface TemplateLayout {
  sections: TemplateSections;
  columns: TemplateColumn[];
  headerNotes: TemplateHeaderNote[];
}

interface TemplateSettings {
  formatType: InvoiceFormat;
  baseTemplate: BaseTemplate;
  palette: TemplatePalette;
  options: TemplateOptions;
  layout: TemplateLayout;
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

const SECTION_LABELS: Record<keyof TemplateSections, { label: string; description: string }> = {
  showBillTo: { label: "Bill To section", description: "Displays billing address in the header." },
  showShipTo: { label: "Ship To section", description: "Displays shipping address in the header." },
  showCustomerInfo: { label: "Invoice details", description: "Shows salesperson, PO, delivery info." },
  showTotals: { label: "Totals block", description: "Shows liters and total amount rows." },
  showSignature: { label: "Retailer signature", description: "Includes the signature block." },
  showComplianceNotice: { label: "Compliance notice", description: "Displays compliance/legal text." },
};

const HEADER_NOTE_POSITIONS: Array<{ value: HeaderNotePosition; label: string }> = [
  { value: "beforeHeader", label: "Above header" },
  { value: "afterHeader", label: "Below header" },
  { value: "beforeTable", label: "Above line items" },
  { value: "afterTable", label: "Below line items" },
];

const ALIGN_OPTIONS: Array<{ value: ColumnAlign; label: string }> = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const DEFAULT_TENANT_SLUG = process.env.NEXT_PUBLIC_PORTAL_TENANT_SLUG ?? "well-crafted";

function getAvailableColumns(
  format: InvoiceFormat,
  currentColumns: TemplateColumn[]
) {
  const activeIds = new Set(currentColumns.map((column) => column.id));
  return COLUMN_PRESETS.filter((preset) => {
    if (activeIds.has(preset.id)) return false;
    if (preset.formats && !preset.formats.includes(format)) return false;
    return true;
  });
}

export function TemplateSettingsManager() {
  const { toast } = useToast();

  const [templates, setTemplates] = useState<TemplateState | null>(null);
  const [initialTemplates, setInitialTemplates] = useState<TemplateState | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<InvoiceFormat>("VA_ABC_INSTATE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testPdfLoading, setTestPdfLoading] = useState(false);

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

  const availableColumns = useMemo(() => {
    if (!currentSettings) return [];
    return getAvailableColumns(selectedFormat, currentSettings.layout.columns);
  }, [currentSettings, selectedFormat]);

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

  const updateLayout = useCallback(
    (updater: (layout: TemplateLayout) => TemplateLayout) => {
      setTemplates((prev) => {
        if (!prev) return prev;
        const current = prev[selectedFormat];
        if (!current) return prev;
        const nextLayout = updater(current.layout);
        return {
          ...prev,
          [selectedFormat]: {
            ...current,
            layout: nextLayout,
          },
        };
      });
    },
    [selectedFormat]
  );

  const handleSectionToggle = (section: keyof TemplateSections, value: boolean) => {
    updateLayout((layout) => ({
      ...layout,
      sections: {
        ...layout.sections,
        [section]: value,
      },
    }));
  };

  const handleColumnChange = (index: number, changes: Partial<Omit<TemplateColumn, "id">>) => {
    updateLayout((layout) => {
      const columns = layout.columns.map((column, idx) =>
        idx === index
          ? {
              ...column,
              ...changes,
            }
          : column
      );
      return {
        ...layout,
        columns,
      };
    });
  };

  const handleMoveColumn = (index: number, direction: number) => {
    updateLayout((layout) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= layout.columns.length) {
        return layout;
      }
      const columns = [...layout.columns];
      const [moved] = columns.splice(index, 1);
      columns.splice(targetIndex, 0, moved);
      return {
        ...layout,
        columns,
      };
    });
  };

  const handleRemoveColumn = (index: number) => {
    updateLayout((layout) => {
      if (layout.columns.length <= 1) {
        return layout;
      }
      const columns = layout.columns.filter((_, idx) => idx !== index);
      return {
        ...layout,
        columns,
      };
    });
  };

  const handleAddColumn = () => {
    updateLayout((layout) => {
      const available = getAvailableColumns(selectedFormat, layout.columns);
      const nextPreset = available[0];
      if (!nextPreset) {
        toast({
          title: "No additional columns available",
          description: "All supported fields are already included in this invoice format.",
        });
        return layout;
      }
      return {
        ...layout,
        columns: [
          ...layout.columns,
          {
            id: nextPreset.id,
            label: nextPreset.label,
            width: nextPreset.defaultWidth,
            align: nextPreset.defaultAlign ?? "left",
            enabled: true,
          },
        ],
      };
    });
  };

  const handleHeaderNoteChange = (
    index: number,
    changes: Partial<Omit<TemplateHeaderNote, "id">>
  ) => {
    updateLayout((layout) => {
      const headerNotes = layout.headerNotes.map((note, idx) =>
        idx === index
          ? {
              ...note,
              ...changes,
            }
          : note
      );
      return {
        ...layout,
        headerNotes,
      };
    });
  };

  const handleAddHeaderNote = () => {
    updateLayout((layout) => ({
      ...layout,
      headerNotes: [
        ...layout.headerNotes,
        {
          id: `custom-note-${Date.now()}`,
          label: `Custom note ${layout.headerNotes.length + 1}`,
          text: "",
          enabled: true,
          position: "beforeTable",
        },
      ],
    }));
  };

  const handleRemoveHeaderNote = (index: number) => {
    updateLayout((layout) => {
      const headerNotes = layout.headerNotes.filter((_, idx) => idx !== index);
      return {
        ...layout,
        headerNotes,
      };
    });
  };

  const handleGenerateTestPdf = useCallback(async () => {
    if (!currentSettings) return;
    setTestPdfLoading(true);

    try {
      const response = await fetch(`/api/admin/invoices/templates/${selectedFormat}/test-pdf`, {
        headers: {
          "X-Tenant-Slug": DEFAULT_TENANT_SLUG,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const pdfWindow = window.open(blobUrl, "_blank");

      if (!pdfWindow || pdfWindow.closed || typeof pdfWindow.closed === "undefined") {
        toast({
          title: "Pop-up blocked",
          description: "Allow pop-ups for this site to preview the PDF, or download it from the network tab.",
        });
      }

      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
      console.error("Failed to generate test invoice PDF", err);
      toast({
        title: "Unable to generate test PDF",
        description: "Please try again. If the problem persists, contact support.",
      });
    } finally {
      setTestPdfLoading(false);
    }
  }, [currentSettings, selectedFormat, toast]);

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
          layout: current.layout,
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

        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateTestPdf}
          disabled={testPdfLoading}
        >
          {testPdfLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparing…
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Test PDF
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="grid gap-8">
        <section className="grid gap-4 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-gray-900">Layout &amp; Colors</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Invoice format</Label>
              <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as InvoiceFormat)}>
                <SelectTrigger>
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
              <p className="text-xs text-muted-foreground">
                Choose the invoice format first, then adjust the base template and layout settings below.
              </p>
            </div>

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

        <section className="grid gap-4 rounded-lg border p-4">
          <h3 className="font-medium text-gray-900">Visible Sections</h3>
          <div className="grid gap-3">
            {(Object.entries(SECTION_LABELS) as Array<[keyof TemplateSections, { label: string; description: string }]>).map(([key, meta]) => (
              <div key={key} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
                <Switch
                  checked={currentSettings.layout.sections[key]}
                  onCheckedChange={(checked) => handleSectionToggle(key, checked)}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-medium text-gray-900">Line Item Columns</h3>
              <p className="text-xs text-muted-foreground">
                Reorder, rename, or hide columns in the invoice table. Widths are percentages and should total roughly 100%.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddColumn} disabled={availableColumns.length === 0}>
              Add Column
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {currentSettings.layout.columns.map((column, index) => (
              <div key={`${column.id}-${index}`} className="rounded-md border p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={column.enabled}
                      onCheckedChange={(checked) => handleColumnChange(index, { enabled: checked })}
                      aria-label={`Toggle ${column.label}`}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{column.label}</p>
                      <p className="text-xs text-muted-foreground">{column.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMoveColumn(index, -1)}
                      disabled={index === 0}
                      aria-label="Move column up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMoveColumn(index, 1)}
                      disabled={index === currentSettings.layout.columns.length - 1}
                      aria-label="Move column down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveColumn(index)}
                      disabled={currentSettings.layout.columns.length <= 1}
                      aria-label="Remove column"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Header label</Label>
                    <Input
                      value={column.label}
                      onChange={(event) => handleColumnChange(index, { label: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Width (%)</Label>
                    <Input
                      type="number"
                      min={4}
                      max={60}
                      step={1}
                      value={column.width}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (Number.isNaN(next)) return;
                        const width = Math.min(60, Math.max(4, Math.round(next)));
                        handleColumnChange(index, { width });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alignment</Label>
                    <Select
                      value={column.align}
                      onValueChange={(value) => handleColumnChange(index, { align: value as ColumnAlign })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALIGN_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Field</Label>
                    <Input value={column.id} readOnly className="bg-muted/40" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!availableColumns.length && (
            <p className="text-xs text-muted-foreground">
              All supported columns are already included for this format.
            </p>
          )}
        </section>

        <section className="grid gap-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-medium text-gray-900">Header &amp; Footer Notes</h3>
              <p className="text-xs text-muted-foreground">
                Optional free-form text blocks for compliance, reminders, or marketing messages.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddHeaderNote}>
              Add Note
            </Button>
          </div>

          {currentSettings.layout.headerNotes.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No additional notes configured. Click &quot;Add Note&quot; to include extra messaging.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {currentSettings.layout.headerNotes.map((note, index) => (
              <div key={note.id} className="rounded-md border p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={note.enabled}
                      onCheckedChange={(checked) => handleHeaderNoteChange(index, { enabled: checked })}
                    />
                    <Input
                      className="h-8 w-full md:w-56"
                      value={note.label}
                      onChange={(event) => handleHeaderNoteChange(index, { label: event.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleRemoveHeaderNote(index)}
                    aria-label="Remove note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Select
                      value={note.position}
                      onValueChange={(value) => handleHeaderNoteChange(index, { position: value as HeaderNotePosition })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HEADER_NOTE_POSITIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={note.text}
                    rows={3}
                    onChange={(event) => handleHeaderNoteChange(index, { text: event.target.value })}
                    placeholder="Enter the text to show on every invoice at this position"
                  />
                </div>
              </div>
            ))}
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
