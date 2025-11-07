"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, FileDown, GripVertical, Loader2, Palette, Settings2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { COLUMN_PRESETS, type InvoiceColumnId } from "@/lib/invoices/column-presets";
import { getVisibleSectionBuckets, SECTION_VISIBILITY_FIELDS } from "@/lib/invoices/layout-utils";

type InvoiceFormat = "STANDARD" | "VA_ABC_INSTATE" | "VA_ABC_TAX_EXEMPT";
type BaseTemplate = "STANDARD" | "VA_ABC_INSTATE_FULL" | "VA_ABC_INSTATE_CONDENSED" | "VA_ABC_TAX_EXEMPT";
type SignatureStyle = "full" | "condensed";
type ColumnAlign = "left" | "center" | "right";
type SectionArea = "headerLeft" | "headerRight" | "fullWidth";
type TemplateSectionKey = "billTo" | "shipTo" | "customerInfo";
type BodyBlockId = "totals" | "signature" | "compliance";

interface TemplateSectionPlacement {
  section: TemplateSectionKey;
  area: SectionArea;
  order: number;
}

interface BodyBlockConfig {
  id: BodyBlockId;
  order: number;
}

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
  id: InvoiceColumnId;
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
  sectionPlacements: TemplateSectionPlacement[];
  bodyBlocks: BodyBlockConfig[];
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

const SECTION_METADATA: Record<TemplateSectionKey, { label: string; description: string }> = {
  billTo: {
    label: "Bill To",
    description: "Customer billing contact and address",
  },
  shipTo: {
    label: "Ship To",
    description: "Delivery destination block",
  },
  customerInfo: {
    label: "Order Details",
    description: "Invoice dates, PO, salesperson, and logistics",
  },
};

const BODY_BLOCK_METADATA: Record<BodyBlockId, { label: string; description: string }> = {
  totals: {
    label: "Totals",
    description: "Subtotal and grand total rows",
  },
  signature: {
    label: "Signature",
    description: "Retailer sign-off block",
  },
  compliance: {
    label: "Compliance notice",
    description: "Footer legal text",
  },
};

const BODY_BLOCK_VISIBILITY_FIELDS: Record<BodyBlockId, keyof TemplateSections> = {
  totals: "showTotals",
  signature: "showSignature",
  compliance: "showComplianceNotice",
};

const AREA_LABELS: Record<SectionArea, string> = {
  headerLeft: "Left Column",
  headerRight: "Right Column",
  fullWidth: "Full Width Row",
};

const SECTION_KEYS: TemplateSectionKey[] = ["billTo", "shipTo", "customerInfo"];
const SECTION_AREAS: SectionArea[] = ["headerLeft", "headerRight", "fullWidth"];
const BODY_BLOCK_IDS: BodyBlockId[] = ["totals", "signature", "compliance"];

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
  showBillTo: { label: "Bill To", description: "Header address for billing." },
  showShipTo: { label: "Ship To", description: "Header address for shipping." },
  showCustomerInfo: { label: "Invoice details", description: "Salesperson, PO, dates." },
  showTotals: { label: "Totals block", description: "Total liters & amount rows." },
  showSignature: { label: "Signature block", description: "Retailer sign-off area." },
  showComplianceNotice: { label: "Compliance notice", description: "Legal text footer." },
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

  const sectionPlacementBuckets = useMemo(() => {
    if (!currentSettings) {
      return createEmptyPlacementBuckets();
    }
    return bucketPlacements(currentSettings.layout.sectionPlacements);
  }, [currentSettings]);

  const previewSectionBuckets = useMemo(() => {
    if (!currentSettings) {
      return createEmptyPreviewBuckets();
    }
    return getVisibleSectionBuckets(currentSettings.layout);
  }, [currentSettings]);

  const bodyBlocks = useMemo(() => {
    if (!currentSettings) return [];
    return [...currentSettings.layout.bodyBlocks].sort((a, b) => a.order - b.order);
  }, [currentSettings]);

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

  const handleSectionPlacementChange = useCallback(
    (section: TemplateSectionKey, targetArea: SectionArea, targetIndex?: number) => {
      updateLayout((layout) => {
        const placements = layout.sectionPlacements ?? [];
        const filtered = placements.filter((placement) => placement.section !== section);
        const buckets = bucketPlacements(filtered);
        const insertionIndex =
          typeof targetIndex === "number" && targetIndex >= 0
            ? Math.min(targetIndex, buckets[targetArea].length)
            : buckets[targetArea].length;

        buckets[targetArea].splice(insertionIndex, 0, {
          section,
          area: targetArea,
          order: insertionIndex,
        });

        const nextPlacements: TemplateSectionPlacement[] = [];
        SECTION_AREAS.forEach((area) => {
          buckets[area].forEach((placement, index) => {
            nextPlacements.push({
              section: placement.section,
              area,
              order: index,
            });
          });
        });

        SECTION_KEYS.forEach((key) => {
          if (!nextPlacements.some((placement) => placement.section === key)) {
            nextPlacements.push({
              section: key,
              area: "fullWidth",
              order: nextPlacements.length,
            });
          }
        });

        return {
          ...layout,
          sectionPlacements: nextPlacements,
        };
      });
    },
    [updateLayout]
  );

  const handleBodyBlockMove = useCallback(
    (blockId: BodyBlockId, direction: number) => {
      updateLayout((layout) => {
        const blocks = [...(layout.bodyBlocks ?? [])];
        blocks.sort((a, b) => a.order - b.order);
        const index = blocks.findIndex((block) => block.id === blockId);
        if (index === -1) return layout;
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= blocks.length) {
          return layout;
        }
        const updated = [...blocks];
        const [moved] = updated.splice(index, 1);
        updated.splice(targetIndex, 0, moved);
        const nextBlocks = updated.map((block, idx) => ({ ...block, order: idx }));
        return {
          ...layout,
          bodyBlocks: nextBlocks,
        };
      });
    },
    [updateLayout]
  );

  const handleColumnIdChange = (index: number, nextId: InvoiceColumnId) => {
    const preset = COLUMN_PRESETS.find(
      (candidate) =>
        candidate.id === nextId &&
        (!candidate.formats || candidate.formats.includes(selectedFormat))
    );
    if (!preset) {
      return;
    }
    updateLayout((layout) => {
      const columns = layout.columns.map((column, idx) =>
        idx === index
          ? {
              ...column,
              id: nextId,
              label: preset.label,
              width: preset.defaultWidth,
              align: preset.defaultAlign ?? "left",
              enabled: column.enabled,
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(Object.entries(SECTION_LABELS) as Array<[keyof TemplateSections, { label: string; description: string }]>).map(([key, meta]) => (
              <div key={key} className="flex items-start justify-between rounded-md border px-3 py-3">
                <div className="pr-4">
                  <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
                <Switch
                  checked={currentSettings.layout.sections[key]}
                  onCheckedChange={(checked) => handleSectionToggle(key, checked)}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-medium text-gray-900">Visual Layout (WYSIWYG)</h3>
              <p className="text-xs text-muted-foreground">
                Drag the section cards between columns or into the full-width row to control how the PDF header renders.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionDesigner
              placements={sectionPlacementBuckets}
              sections={currentSettings.layout.sections}
              onMove={handleSectionPlacementChange}
            />

            <InvoicePreview
              settings={currentSettings}
              sectionBuckets={previewSectionBuckets}
              bodyBlocks={bodyBlocks}
            />
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-medium text-gray-900">Post-table Blocks</h3>
              <p className="text-xs text-muted-foreground">
                Control the order of totals, signature, and compliance sections beneath the line items.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {bodyBlocks.map((block, index) => {
              const meta = BODY_BLOCK_METADATA[block.id];
              const isVisible = currentSettings.layout.sections[BODY_BLOCK_VISIBILITY_FIELDS[block.id]];
              return (
                <div
                  key={block.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-white px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                    {!isVisible && (
                      <span className="mt-1 inline-flex text-[10px] font-semibold uppercase text-amber-600">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleBodyBlockMove(block.id, -1)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleBodyBlockMove(block.id, 1)}
                      disabled={index === bodyBlocks.length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
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
                    <Select
                      value={column.id}
                      onValueChange={(value) => handleColumnIdChange(index, value as InvoiceColumnId)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLUMN_PRESETS.filter((preset) => !preset.formats || preset.formats.includes(selectedFormat)).map((preset) => (
                          <SelectItem key={preset.id} value={preset.id}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

interface SectionDesignerProps {
  placements: Record<SectionArea, TemplateSectionPlacement[]>;
  sections: TemplateSections;
  onMove: (section: TemplateSectionKey, area: SectionArea, index?: number) => void;
}

function SectionDesigner({ placements, sections, onMove }: SectionDesignerProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        {(["headerLeft", "headerRight"] as SectionArea[]).map((area) => (
          <SectionDropZone
            key={area}
            area={area}
            placements={placements[area]}
            sections={sections}
            onMove={onMove}
          />
        ))}
      </div>
      <SectionDropZone
        area="fullWidth"
        placements={placements.fullWidth}
        sections={sections}
        onMove={onMove}
        fullWidth
      />
    </div>
  );
}

interface SectionDropZoneProps {
  area: SectionArea;
  placements: TemplateSectionPlacement[];
  sections: TemplateSections;
  onMove: (section: TemplateSectionKey, area: SectionArea, index?: number) => void;
  fullWidth?: boolean;
}

function SectionDropZone({ area, placements, sections, onMove, fullWidth }: SectionDropZoneProps) {
  const handleDrop = (event: React.DragEvent, index?: number) => {
    event.preventDefault();
    event.stopPropagation();
    const sectionKey = readDraggedSection(event);
    if (!sectionKey) return;
    onMove(sectionKey, area, index);
  };

  return (
    <div
      className={`rounded-md border border-dashed bg-muted/20 p-3 ${fullWidth ? "" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => handleDrop(event)}
    >
      <p className="text-xs font-semibold uppercase text-muted-foreground">{AREA_LABELS[area]}</p>
      <div className="mt-2 flex flex-col gap-2">
        {placements.map((placement, index) => (
          <div key={placement.section} onDrop={(event) => handleDrop(event, index)}>
            <SectionCard placement={placement} sections={sections} />
          </div>
        ))}
      </div>
      {!placements.length && (
        <div className="mt-2 rounded-md border border-dashed bg-white/60 px-3 py-6 text-center text-xs text-muted-foreground">
          Drag a section here
        </div>
      )}
    </div>
  );
}

interface SectionCardProps {
  placement: TemplateSectionPlacement;
  sections: TemplateSections;
}

function SectionCard({ placement, sections }: SectionCardProps) {
  const isVisible = sections[SECTION_VISIBILITY_FIELDS[placement.section]];

  return (
    <div
      className={`flex cursor-grab items-start gap-2 rounded-md border bg-white p-3 shadow-sm transition hover:border-primary ${
        isVisible ? "" : "opacity-60"
      }`}
      draggable
      onDragStart={(event) => handleSectionDragStart(event, placement.section)}
    >
      <GripVertical className="mt-1 h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{SECTION_METADATA[placement.section].label}</p>
        <p className="text-xs text-muted-foreground">{SECTION_METADATA[placement.section].description}</p>
        {!isVisible && (
          <span className="mt-1 inline-flex text-[10px] font-semibold uppercase text-amber-600">Hidden</span>
        )}
      </div>
    </div>
  );
}

interface InvoicePreviewProps {
  settings: TemplateSettings;
  sectionBuckets: Record<SectionArea, TemplateSectionKey[]>;
  bodyBlocks: BodyBlockConfig[];
}

function InvoicePreview({ settings, sectionBuckets, bodyBlocks }: InvoicePreviewProps) {
  const columns = settings.layout.columns.filter((column) => column.enabled !== false);

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">Live Preview</p>
        <span className="text-[11px] text-muted-foreground">Sample data</span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <PreviewColumn title="Left column" sections={sectionBuckets.headerLeft} />
        <PreviewColumn title="Right column" sections={sectionBuckets.headerRight} />
      </div>

      {sectionBuckets.fullWidth.length > 0 && (
        <div className="mt-3 space-y-2">
          {sectionBuckets.fullWidth.map((section) => (
            <PreviewSection key={`full-${section}`} section={section} />
          ))}
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Line items</p>
        <div className="mt-2 overflow-hidden rounded border">
          <div className="flex bg-muted/40 text-[11px] font-medium text-muted-foreground">
            {columns.map((column) => (
              <span
                key={column.id}
                className="border-r px-2 py-1"
                style={{ width: `${column.width}%` }}
              >
                {column.label}
              </span>
            ))}
          </div>
          <div className="flex border-t text-[10px]">
            {columns.map((column) => (
              <span
                key={`${column.id}-preview`}
                className="border-r px-2 py-1 text-muted-foreground"
                style={{ width: `${column.width}%` }}
              >
                {COLUMN_SAMPLE_VALUES[column.id] ?? "—"}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Post-table blocks</p>
        <div className="mt-2 space-y-1">
          {bodyBlocks.map((block) => {
            const meta = BODY_BLOCK_METADATA[block.id];
            const isVisible = settings.layout.sections[BODY_BLOCK_VISIBILITY_FIELDS[block.id]];
            return (
              <div
                key={`preview-${block.id}`}
                className="flex items-center justify-between rounded border border-muted/50 bg-muted/10 px-2 py-1 text-[11px]"
              >
                <span>{meta.label}</span>
                {!isVisible && <span className="text-[10px] uppercase text-amber-600">Hidden</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PreviewColumn({ title, sections }: { title: string; sections: TemplateSectionKey[] }) {
  return (
    <div className="rounded-md border bg-muted/10 p-3">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{title}</p>
      <div className="mt-2 space-y-2">
        {sections.length ? (
          sections.map((section) => <PreviewSection key={section} section={section} />)
        ) : (
          <p className="text-xs text-muted-foreground">No sections assigned</p>
        )}
      </div>
    </div>
  );
}

function PreviewSection({ section }: { section: TemplateSectionKey }) {
  const sample = SECTION_SAMPLE_CONTENT[section];
  return (
    <div className="rounded border border-muted/50 bg-white px-3 py-2">
      <p className="text-[11px] font-medium text-gray-900">{SECTION_METADATA[section].label}</p>
      <ul className="mt-1 text-[10px] text-muted-foreground">
        {sample.map((line, index) => (
          <li key={`${section}-${index}`}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function bucketPlacements(placements?: TemplateSectionPlacement[]) {
  const buckets = createEmptyPlacementBuckets();
  const seen = new Set<TemplateSectionKey>();

  (placements ?? []).forEach((placement) => {
    const area = SECTION_AREAS.includes(placement.area) ? placement.area : "fullWidth";
    buckets[area].push({
      section: placement.section,
      area,
      order: placement.order,
    });
    seen.add(placement.section);
  });

  SECTION_KEYS.forEach((section) => {
    if (!seen.has(section)) {
      buckets.fullWidth.push({
        section,
        area: "fullWidth",
        order: buckets.fullWidth.length,
      });
    }
  });

  SECTION_AREAS.forEach((area) => {
    buckets[area].sort((a, b) => a.order - b.order);
  });

  return buckets;
}

function createEmptyPlacementBuckets(): Record<SectionArea, TemplateSectionPlacement[]> {
  return {
    headerLeft: [],
    headerRight: [],
    fullWidth: [],
  };
}

function createEmptyPreviewBuckets(): Record<SectionArea, TemplateSectionKey[]> {
  return {
    headerLeft: [],
    headerRight: [],
    fullWidth: [],
  };
}

const DRAG_DATA_KEY = "text/template-section";

function handleSectionDragStart(event: React.DragEvent, section: TemplateSectionKey) {
  event.dataTransfer.setData(DRAG_DATA_KEY, section);
  event.dataTransfer.setData("text/plain", section);
  event.dataTransfer.effectAllowed = "move";
}

function readDraggedSection(event: React.DragEvent): TemplateSectionKey | null {
  const value = event.dataTransfer.getData(DRAG_DATA_KEY) || event.dataTransfer.getData("text/plain");
  return isTemplateSectionKey(value) ? (value as TemplateSectionKey) : null;
}

function isTemplateSectionKey(value: string | null | undefined): value is TemplateSectionKey {
  if (!value) return false;
  return SECTION_KEYS.includes(value as TemplateSectionKey);
}

const SECTION_SAMPLE_CONTENT: Record<TemplateSectionKey, string[]> = {
  billTo: [
    "Cheesetique Old Town",
    "2411 Mount Vernon Ave",
    "Alexandria, VA 22301",
  ],
  shipTo: [
    "Cheesetique Old Town",
    "Suite 200",
    "Alexandria, VA 22301",
  ],
  customerInfo: [
    "Invoice #INV-1042",
    "Salesperson: Travis Leonard",
    "PO: PO-56789",
  ],
};

const COLUMN_SAMPLE_VALUES: Partial<Record<InvoiceColumnId, string>> = {
  quantity: "12",
  sku: "SKU-001",
  productName: "Rioja Crianza",
  unitPrice: "$14.50",
  lineTotal: "$174.00",
  abcCode: "289654",
  size: "750ml",
  liters: "9.00",
  cases: "1.0",
  totalBottles: "12",
  bottlePrice: "$14.50",
};
