"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, FileDown, GripVertical, LayoutDashboard, Loader2, Palette, Settings2, StickyNote, Table, Trash2, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import { DEFAULT_BRANDING_PROFILE, resolveBrandingProfile, type BrandingProfile } from "@/lib/invoices/branding";
import { DEFAULT_COMPLIANCE_FOOTER_NOTES, resolveFooterNotes } from "@/lib/invoices/footer-notes";

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
  logoUrl?: string | null;
  companyName?: string | null;
  companySecondary?: string | null;
  companyTagline?: string | null;
  companyAddressLines?: string[] | null;
  companyLicenseText?: string | null;
  companyContactLines?: string[] | null;
  companyWebsite?: string | null;
  footerNotes?: string[] | null;
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
const TEMPLATE_BODY_BLOCK_IDS: BodyBlockId[] = ["totals", "signature", "compliance"];
const DEFAULT_BODY_BLOCKS: BodyBlockConfig[] = TEMPLATE_BODY_BLOCK_IDS.map((id, index) => ({
  id,
  order: index,
}));

function parseMultilineValue(value: string): string[] | undefined {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length)
    .slice(0, 4);
  return lines.length ? lines : undefined;
}

const PREVIEW_TOTAL_LITERS = "16.50";
const PREVIEW_TOTAL_AMOUNT = "$374.50";

type EditorPanelKey = "layout" | "header" | "columns" | "notes" | "advanced";

const PANEL_CONFIG: Record<EditorPanelKey, { label: string; description: string; icon: LucideIcon }> = {
  layout: {
    label: "Layout & Colors",
    description: "Formats, base templates, and palette",
    icon: Palette,
  },
  header: {
    label: "Header Builder",
    description: "Visibility + section placements",
    icon: LayoutDashboard,
  },
  columns: {
    label: "Line Items",
    description: "Table columns and widths",
    icon: Table,
  },
  notes: {
    label: "Notes & Footer",
    description: "Header/footer text blocks",
    icon: StickyNote,
  },
  advanced: {
    label: "Advanced",
    description: "Format-specific options",
    icon: Wrench,
  },
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
  const [activePanel, setActivePanel] = useState<EditorPanelKey>("layout");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
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

        setSelectedFormat((prev) => {
          if (prev && state[prev as InvoiceFormat]) {
            return prev as InvoiceFormat;
          }
          const fallbackFormat = (Object.keys(state)[0] as InvoiceFormat) ?? "VA_ABC_INSTATE";
          return fallbackFormat;
        });
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
    if (!currentSettings) return DEFAULT_BODY_BLOCKS;
    const source =
      currentSettings.layout.bodyBlocks.length > 0
        ? currentSettings.layout.bodyBlocks
        : DEFAULT_BODY_BLOCKS;
    return [...source].sort((a, b) => a.order - b.order);
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

  const handleOptionChange = (field: keyof TemplateOptions, value: TemplateOptions[keyof TemplateOptions]) => {
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
        const blocks =
          layout.bodyBlocks && layout.bodyBlocks.length
            ? [...layout.bodyBlocks]
            : [...DEFAULT_BODY_BLOCKS];
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

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/invoices/logo", {
        method: "POST",
        headers: {
          "X-Tenant-Slug": DEFAULT_TENANT_SLUG,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const data: { url: string } = await response.json();
      handleOptionChange("logoUrl", data.url);
      toast({
        title: "Logo uploaded",
        description: "The live preview now shows your updated branding.",
      });
    } catch (err) {
      console.error("Failed to upload logo", err);
      toast({
        title: "Upload failed",
        description: "We couldn't upload that file. Please try again with a PNG or JPG under 5MB.",
        variant: "destructive",
      });
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  const handleLogoInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleLogoUpload(file);
    }
  };

  const handleLogoRemove = () => {
    handleOptionChange("logoUrl", null);
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
        method: "POST",
        headers: {
          "X-Tenant-Slug": DEFAULT_TENANT_SLUG,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseTemplate: currentSettings.baseTemplate,
          palette: currentSettings.palette,
          options: currentSettings.options,
          layout: currentSettings.layout,
        }),
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

  const brandingProfile = useMemo(() => {
    if (!currentSettings) {
      return DEFAULT_BRANDING_PROFILE;
    }
    return resolveBrandingProfile(currentSettings.options, DEFAULT_BRANDING_PROFILE);
  }, [currentSettings]);
  const footerNotes = useMemo(() => {
    if (!currentSettings) {
      return DEFAULT_COMPLIANCE_FOOTER_NOTES;
    }
    return resolveFooterNotes(currentSettings.options.footerNotes, DEFAULT_COMPLIANCE_FOOTER_NOTES);
  }, [currentSettings]);

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
  const currentLogoUrl = currentSettings.options.logoUrl ?? null;
  const layoutPanel = (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Palette className="h-4 w-4 text-muted-foreground" />
          Format
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Format</Label>
            <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as InvoiceFormat)}>
              <SelectTrigger className="w-full min-w-0">
                <SelectValue className="truncate" />
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
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Base</Label>
            <Select
              value={currentSettings.baseTemplate}
              onValueChange={(value) => handleBaseTemplateChange(value as BaseTemplate)}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue className="truncate" />
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
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        <h4 className="text-base font-semibold text-gray-900">Palette</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <ColorPickerCard
            label="Table header"
            value={currentSettings.palette.tableHeaderBackground}
            onChange={(value) => handlePaletteChange("tableHeaderBackground", value)}
          />
          <ColorPickerCard
            label="Section header"
            value={currentSettings.palette.sectionHeaderBackground}
            onChange={(value) => handlePaletteChange("sectionHeaderBackground", value)}
          />
          <ColorPickerCard
            label="Border"
            value={currentSettings.palette.borderColor}
            onChange={(value) => handlePaletteChange("borderColor", value)}
          />
          <ColorPickerCard
            label="Accent text"
            value={currentSettings.palette.accentTextColor}
            onChange={(value) => handlePaletteChange("accentTextColor", value)}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        <h4 className="text-base font-semibold text-gray-900">Header text</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={currentSettings.options.companyName ?? ""}
              onChange={(event) => handleOptionChange("companyName", event.target.value)}
              placeholder={DEFAULT_BRANDING_PROFILE.name}
            />
          </div>
          <div className="space-y-2">
            <Label>Secondary</Label>
            <Input
              value={currentSettings.options.companySecondary ?? ""}
              onChange={(event) => handleOptionChange("companySecondary", event.target.value)}
              placeholder={DEFAULT_BRANDING_PROFILE.secondary ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input
              value={currentSettings.options.companyTagline ?? ""}
              onChange={(event) => handleOptionChange("companyTagline", event.target.value)}
              placeholder={DEFAULT_BRANDING_PROFILE.tagline ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label>License text</Label>
            <Input
              value={currentSettings.options.companyLicenseText ?? ""}
              onChange={(event) => handleOptionChange("companyLicenseText", event.target.value)}
              placeholder={DEFAULT_BRANDING_PROFILE.licenseText ?? ""}
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Address lines</Label>
            <Textarea
              rows={3}
              value={(currentSettings.options.companyAddressLines ?? []).join("\n")}
              onChange={(event) => handleOptionChange("companyAddressLines", parseMultilineValue(event.target.value))}
              placeholder={DEFAULT_BRANDING_PROFILE.addressLines.join("\n")}
            />
          </div>
          <div className="space-y-2">
            <Label>Contact lines</Label>
            <Textarea
              rows={3}
              value={(currentSettings.options.companyContactLines ?? []).join("\n")}
              onChange={(event) => handleOptionChange("companyContactLines", parseMultilineValue(event.target.value))}
              placeholder={DEFAULT_BRANDING_PROFILE.contactLines.join("\n")}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Website</Label>
          <Input
            value={currentSettings.options.companyWebsite ?? ""}
            onChange={(event) => handleOptionChange("companyWebsite", event.target.value)}
            placeholder={DEFAULT_BRANDING_PROFILE.website ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label>Footer notes</Label>
          <Textarea
            rows={3}
            value={(currentSettings.options.footerNotes ?? []).join("\n")}
            onChange={(event) => handleOptionChange("footerNotes", parseMultilineValue(event.target.value))}
            placeholder={DEFAULT_COMPLIANCE_FOOTER_NOTES.join("\n")}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        <div className="text-sm font-semibold text-gray-900">Logo</div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleLogoInputChange}
        />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {currentLogoUrl ? (
              <div className="flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentLogoUrl}
                  alt="Invoice logo preview"
                  className="max-h-16 w-auto rounded-md border bg-white object-contain"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                —
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="icon" className="h-9 w-9" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
              {logoUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleLogoRemove} disabled={!currentLogoUrl || logoUploading}>
              ✕
            </Button>
          </div>
        </div>
      </section>
    </div>
  );

  const headerPanel = (
    <>
      <section className="grid gap-4 rounded-lg border p-4">
        <h3 className="font-medium text-gray-900">Visible Sections</h3>
        <p className="text-xs text-muted-foreground">
          Use the toggles to show or hide each block. Rows stack vertically to avoid cramped layouts inside the editor.
        </p>
        <div className="flex flex-col gap-2">
          {(Object.entries(SECTION_LABELS) as Array<[keyof TemplateSections, { label: string; description: string }]>).map(([key, meta]) => (
            <VisibilityToggleRow
              key={key}
              label={meta.label}
              description={meta.description}
              enabled={currentSettings.layout.sections[key]}
              onToggle={(next) => handleSectionToggle(key, next)}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-medium text-gray-900">Visual Layout (WYSIWYG)</h3>
            <p className="text-xs text-muted-foreground">
              Drag the section cards between columns or into the full-width row. The live preview on the right updates instantly.
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          <SectionDesigner
            placements={sectionPlacementBuckets}
            sections={currentSettings.layout.sections}
            onMove={handleSectionPlacementChange}
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
    </>
  );

  const columnsPanel = (
    <section className="grid gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-medium text-gray-900">Line Item Columns</h3>
          <p className="text-xs text-muted-foreground">
            Reorder, rename, or hide columns in the invoice table. Widths are percentages and should total roughly 100%.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddColumn}
            disabled={availableColumns.length === 0}
            className="w-full sm:w-auto"
          >
            Add Column
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {currentSettings.layout.columns.map((column, index) => {
          const columnTitle = column.label?.trim().length ? column.label : "Untitled column";
          return (
            <div key={`${column.id}-${index}`} className="rounded-xl border bg-white px-4 py-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <Switch
                    checked={column.enabled}
                    onCheckedChange={(checked) => handleColumnChange(index, { enabled: checked })}
                    aria-label={`Toggle ${columnTitle}`}
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{columnTitle}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{column.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 self-start lg:self-center">
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

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_140px_150px_minmax(0,1.2fr)]">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Header label</Label>
                  <Input
                    value={column.label}
                    onChange={(event) => handleColumnChange(index, { label: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Width (%)</Label>
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
                  <Label className="text-xs text-muted-foreground">Alignment</Label>
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
                  <Label className="text-xs text-muted-foreground">Field</Label>
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
          );
        })}
      </div>

      {!availableColumns.length && (
        <p className="text-xs text-muted-foreground">
          All supported columns are already included for this format.
        </p>
      )}
    </section>
  );

  const notesPanel = (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border bg-card p-5 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Header &amp; Footer Notes</h3>
          <p className="text-xs text-muted-foreground">Reuse compliance blurbs or reminders anywhere in the PDF.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleAddHeaderNote}>
          Add note
        </Button>
      </section>

      {currentSettings.layout.headerNotes.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
          No notes yet. Add one to highlight compliance text or promotional messaging.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {currentSettings.layout.headerNotes.map((note, index) => (
            <NoteEditorCard
              key={note.id}
              note={note}
              onChange={(changes) => handleHeaderNoteChange(index, changes)}
              onRemove={() => handleRemoveHeaderNote(index)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const advancedPanel = selectedFormat === "VA_ABC_INSTATE"
    ? (
        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Virginia in-state controls</h3>
              <p className="text-xs text-muted-foreground">Match the Commonwealth forms with these format-specific toggles.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Show customer ID column</p>
                    <p className="text-xs text-muted-foreground">Toggle the center column inside the Bill To / Ship To block.</p>
                  </div>
                  <Switch
                    checked={currentSettings.options.showCustomerIdColumn ?? true}
                    onCheckedChange={(checked) => handleOptionChange("showCustomerIdColumn", checked)}
                  />
                </div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
                <Label className="text-xs text-muted-foreground">Signature section style</Label>
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
        </div>
      )
    : (
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">No advanced options</h3>
          <p className="mt-2 text-sm text-muted-foreground">Additional toggles are only available on the Virginia in-state format.</p>
        </section>
      );

  const panelContent: Record<EditorPanelKey, ReactNode> = {
    layout: layoutPanel,
    header: headerPanel,
    columns: columnsPanel,
    notes: notesPanel,
    advanced: advancedPanel,
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Settings2 className="h-4 w-4" />
            Invoice Template Workspace
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-900">Configure {FORMAT_LABELS[selectedFormat]}</h2>
            <span className="rounded-full border px-3 py-0.5 text-xs font-medium text-muted-foreground">
              {templates ? Object.keys(templates).length : 0} formats available
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Use the navigation to focus on one part of the PDF at a time. Changes update the live preview instantly and apply to newly generated invoices once saved.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,760px)_minmax(600px,780px)] xl:grid-cols-[220px_minmax(0,880px)_minmax(640px,860px)] 2xl:grid-cols-[240px_minmax(0,960px)_minmax(680px,940px)]">
        <EditorNavigation activePanel={activePanel} onSelect={setActivePanel} />

        <div className="flex w-full flex-col gap-4 lg:max-w-[880px] xl:max-w-[950px]">
          {panelContent[activePanel]}
          <CommandBar
            isDirty={isDirty}
            saving={saving}
            lastUpdated={lastUpdated}
            onReset={handleReset}
            onSave={handleSave}
          />
        </div>

        <PreviewPanel
          settings={currentSettings}
          sectionBuckets={previewSectionBuckets}
          bodyBlocks={bodyBlocks}
          onGenerate={handleGenerateTestPdf}
          generating={testPdfLoading}
          selectedFormat={selectedFormat}
          branding={brandingProfile}
          footerNotes={footerNotes}
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

interface EditorNavigationProps {
  activePanel: EditorPanelKey;
  onSelect: (panel: EditorPanelKey) => void;
}

function EditorNavigation({ activePanel, onSelect }: EditorNavigationProps) {
  const entries = Object.entries(PANEL_CONFIG) as Array<[
    EditorPanelKey,
    { label: string; description: string; icon: LucideIcon }
  ]>;

  return (
    <nav className="rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">Editor panels</p>
        <p className="text-xs text-muted-foreground">Jump between areas</p>
      </div>
      <ul className="flex flex-col">
        {entries.map(([key, meta]) => {
          const Icon = meta.icon;
          const isActive = activePanel === key;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onSelect(key)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                  isActive ? "bg-muted" : "hover:bg-muted/60"
                }`}
              >
                <span
                  className={`rounded-md border p-2 ${
                    isActive ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface PreviewPanelProps {
  settings: TemplateSettings;
  sectionBuckets: Record<SectionArea, TemplateSectionKey[]>;
  bodyBlocks: BodyBlockConfig[];
  onGenerate: () => void;
  generating: boolean;
  selectedFormat: InvoiceFormat;
  branding: BrandingProfile;
  footerNotes: string[];
}

function PreviewPanel({ settings, sectionBuckets, bodyBlocks, onGenerate, generating, selectedFormat, branding, footerNotes }: PreviewPanelProps) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-80px)] xl:max-h-[calc(100vh-60px)] lg:overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Live Preview</p>
          <p className="text-xs text-muted-foreground">
            Sample data · {FORMAT_LABELS[selectedFormat]}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onGenerate} disabled={generating}>
          {generating ? (
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
      </div>

      <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm lg:max-h-[calc(100vh-220px)] lg:overflow-auto xl:max-h-[calc(100vh-200px)]">
        <div className="mx-auto w-full max-w-[640px] xl:max-w-[720px] 2xl:max-w-[760px]">
          <InvoicePreview
            settings={settings}
            sectionBuckets={sectionBuckets}
            bodyBlocks={bodyBlocks}
            branding={branding}
            footerNotes={footerNotes}
          />
        </div>
      </div>
    </div>
  );
}

interface CommandBarProps {
  lastUpdated: string;
  isDirty: boolean;
  saving: boolean;
  onReset: () => void;
  onSave: () => void;
}

function CommandBar({ lastUpdated, isDirty, saving, onReset, onSave }: CommandBarProps) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-muted-foreground">⏱</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={onReset}
            disabled={!isDirty || saving}
            className="w-full sm:w-auto"
          >
            Reset
          </Button>
          <Button onClick={onSave} disabled={!isDirty || saving} className="w-full sm:w-auto">
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
      </div>
    </div>
  );
}

interface VisibilityToggleRowProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
}

function VisibilityToggleRow({ label, description, enabled, onToggle }: VisibilityToggleRowProps) {
  return (
    <div className="rounded-lg border px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {enabled ? "Shown" : "Hidden"}
          </span>
          <Switch checked={enabled} onCheckedChange={onToggle} aria-label={`Toggle ${label}`} />
        </div>
      </div>
    </div>
  );
}

interface ColorPickerCardProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorPickerCard({ label, value, onChange }: ColorPickerCardProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <label className="relative flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition hover:border-primary">
        <div className="h-10 w-10 rounded-md border" style={{ backgroundColor: value }} />
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={`${label} color`}
        />
      </label>
    </div>
  );
}

interface NoteEditorCardProps {
  note: TemplateHeaderNote;
  onChange: (changes: Partial<Omit<TemplateHeaderNote, "id">>) => void;
  onRemove: () => void;
}

function NoteEditorCard({ note, onChange, onRemove }: NoteEditorCardProps) {
  const positionLabel = HEADER_NOTE_POSITIONS.find((option) => option.value === note.position)?.label ?? note.position;
  const visibilityClasses = note.enabled
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-border bg-muted text-muted-foreground";

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Switch
            checked={note.enabled}
            onCheckedChange={(checked) => onChange({ enabled: checked })}
            aria-label={`Toggle ${note.label || "note"}`}
          />
          <Input
            className="h-8 w-full md:w-64"
            value={note.label}
            onChange={(event) => onChange({ label: event.target.value })}
            placeholder="Internal label"
          />
        </div>
        <div className="flex items-center gap-2 self-start md:self-center">
          <span className="rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            {positionLabel}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={onRemove}
            aria-label="Remove note"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Position</Label>
          <Select value={note.position} onValueChange={(value) => onChange({ position: value as HeaderNotePosition })}>
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
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Visibility</Label>
          <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${visibilityClasses}`}>
            {note.enabled ? "Shown on new invoices" : "Hidden"}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Content</Label>
        <Textarea
          value={note.text}
          rows={4}
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder="Enter the text that will appear in this position on every invoice"
        />
      </div>
    </div>
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
  branding: BrandingProfile;
  footerNotes: string[];
}

function InvoicePreview({ settings, sectionBuckets, bodyBlocks, branding, footerNotes }: InvoicePreviewProps) {
  const columns = settings.layout.columns.filter((column) => column.enabled !== false);
  const logoUrl = settings.options.logoUrl ?? null;
  const {
    borderColor = '#d1d5db',
    sectionHeaderBackground = '#f8fafc',
    tableHeaderBackground = '#f3f4f6',
    accentTextColor = '#111827',
  } = settings.palette ?? {};
  const companyAddressLines = branding.addressLines.length
    ? branding.addressLines
    : DEFAULT_BRANDING_PROFILE.addressLines;
  const contactLines = branding.contactLines.length
    ? branding.contactLines
    : DEFAULT_BRANDING_PROFILE.contactLines;

  const renderBodyBlock = (block: BodyBlockConfig) => {
    const isVisible = settings.layout.sections[BODY_BLOCK_VISIBILITY_FIELDS[block.id]];
    const hiddenBadge = !isVisible ? (
      <span className="text-[10px] uppercase text-amber-600">Hidden</span>
    ) : null;

    switch (block.id) {
      case "totals":
        return (
          <div className="grid gap-2 border p-3 text-sm font-semibold text-gray-900" style={{ borderColor }}>
            <div className="flex items-center justify-between">
              <span>Total Liters:</span>
              <span>{PREVIEW_TOTAL_LITERS}</span>
            </div>
            <div className="flex items-center justify-between text-base">
              <span>Total:</span>
              <span>{PREVIEW_TOTAL_AMOUNT}</span>
            </div>
            {hiddenBadge}
          </div>
        );
      case "signature":
        return (
          <div className="space-y-3 border p-3 text-xs text-gray-700" style={{ borderColor }}>
            <p className="font-semibold uppercase tracking-wide">To be filled by retail licensee</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p>Date:</p>
                <div className="mt-1 h-5 border-b" style={{ borderColor }} />
              </div>
              <div>
                <p>Signed:</p>
                <div className="mt-1 h-5 border-b" style={{ borderColor }} />
              </div>
            </div>
            {hiddenBadge}
          </div>
        );
      case "compliance":
      default:
        return (
          <div className="space-y-1 border p-3 text-[10px] italic text-gray-600" style={{ borderColor }}>
            {[...new Set(footerNotes.map((note) => note.trim()))]
              .filter((note) => note.length)
              .map((note) => (
                <p key={note}>{note}</p>
              ))}
            {hiddenBadge}
          </div>
        );
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm" style={{ borderColor }}>
      <div className="space-y-3 border-b pb-4" style={{ borderColor }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-1 items-start gap-3">
            {logoUrl ? (
              <div className="flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Company logo"
                  className="max-h-14 w-auto rounded-md border bg-white object-contain"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                WC
              </div>
            )}
            <div className="text-xs text-gray-700">
              <p className="text-base font-semibold uppercase text-gray-900">{branding.name}</p>
              {branding.secondary && <p className="text-[11px] text-gray-600">{branding.secondary}</p>}
              {branding.tagline && <p className="text-[11px] text-gray-600">{branding.tagline}</p>}
              {companyAddressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {branding.licenseText && <p>{branding.licenseText}</p>}
            </div>
          </div>
          <div className="text-right text-[11px] text-gray-700">
            {contactLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {branding.website && <p>{branding.website}</p>}
          </div>
        </div>
        <div className="text-center text-lg font-bold tracking-[0.35em]" style={{ color: accentTextColor }}>
          INVOICE
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <PreviewColumn
          title="Left column"
          sections={sectionBuckets.headerLeft}
          borderColor={borderColor}
          sectionBackground={sectionHeaderBackground}
          accentColor={accentTextColor}
        />
        <PreviewColumn
          title="Right column"
          sections={sectionBuckets.headerRight}
          borderColor={borderColor}
          sectionBackground={sectionHeaderBackground}
          accentColor={accentTextColor}
        />
      </div>

      {sectionBuckets.fullWidth.length > 0 && (
        <div className="mt-4 space-y-2">
          {sectionBuckets.fullWidth.map((section) => (
            <PreviewSection
              key={`full-${section}`}
              section={section}
              borderColor={borderColor}
              sectionBackground={sectionHeaderBackground}
              accentColor={accentTextColor}
            />
          ))}
        </div>
      )}

      <div className="mt-6">
        <div className="overflow-hidden rounded border" style={{ borderColor }}>
          <div
            className="flex text-[11px] font-semibold uppercase"
            style={{ backgroundColor: tableHeaderBackground, color: accentTextColor, borderColor }}
          >
            {columns.map((column) => (
              <span
                key={column.id}
                className="border-r px-3 py-2"
                style={{ width: `${column.width}%` }}
              >
                {column.label}
              </span>
            ))}
          </div>
          <div className="flex border-t text-[11px] text-gray-700" style={{ borderColor }}>
            {columns.map((column) => (
              <span
                key={`${column.id}-preview`}
                className="border-r px-3 py-2"
                style={{ width: `${column.width}%` }}
              >
                {COLUMN_SAMPLE_VALUES[column.id] ?? "—"}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {bodyBlocks.map((block) => (
          <div key={`preview-${block.id}`}>{renderBodyBlock(block)}</div>
        ))}
      </div>
    </div>
  );
}

interface PreviewColumnProps {
  title: string;
  sections: TemplateSectionKey[];
  borderColor: string;
  sectionBackground: string;
  accentColor: string;
}

function PreviewColumn({ title, sections, borderColor, sectionBackground, accentColor }: PreviewColumnProps) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: accentColor }}>
        {title}
      </p>
      <div className="space-y-2">
        {sections.length ? (
          sections.map((section) => (
            <PreviewSection
              key={section}
              section={section}
              borderColor={borderColor}
              sectionBackground={sectionBackground}
              accentColor={accentColor}
            />
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No sections assigned</p>
        )}
      </div>
    </div>
  );
}

interface PreviewSectionProps {
  section: TemplateSectionKey;
  borderColor: string;
  sectionBackground: string;
  accentColor: string;
}

function PreviewSection({ section, borderColor, sectionBackground, accentColor }: PreviewSectionProps) {
  const sample = SECTION_SAMPLE_CONTENT[section];
  return (
    <div className="rounded border bg-white px-4 py-3 text-xs text-gray-700" style={{ borderColor }}>
      <p
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: accentColor, backgroundColor: sectionBackground }}
      >
        {SECTION_METADATA[section].label}
      </p>
      <ul className="mt-1 space-y-0.5 text-[11px]">
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
    "Invoice #: SAMPLE-INV-0001",
    "Invoice Date: Jan 15, 2025",
    "Due Date: Feb 14, 2025",
    "PO Number: PO-56789",
    "Salesperson: Travis Leonard",
    "Ship Method: Common carrier",
    "Terms: Net 30",
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
