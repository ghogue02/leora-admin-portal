"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileDown, Printer, Mail, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import type { CallPlanAccount } from "@/types/call-plan";

interface CallPlanSummaryProps {
  accounts: Array<CallPlanAccount & { objective: string; priority: "LOW" | "MEDIUM" | "HIGH" }>;
  weekNumber: number;
  year: number;
  onBack?: () => void;
}

export default function CallPlanSummary({
  accounts,
  weekNumber,
  year,
  onBack,
}: CallPlanSummaryProps) {
  // Calculate statistics
  const stats = {
    totalAccounts: accounts.length,
    byType: {
      ACTIVE: accounts.filter((a) => a.accountType === "ACTIVE").length,
      TARGET: accounts.filter((a) => a.accountType === "TARGET").length,
      PROSPECT: accounts.filter((a) => a.accountType === "PROSPECT").length,
    },
    byPriority: {
      HIGH: accounts.filter((a) => a.priority === "HIGH").length,
      MEDIUM: accounts.filter((a) => a.priority === "MEDIUM").length,
      LOW: accounts.filter((a) => a.priority === "LOW").length,
    },
    byTerritory: accounts.reduce((acc, account) => {
      const territory = account.location || "Unassigned";
      acc[territory] = (acc[territory] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  const handleExportPDF = async () => {
    try {
      // In a real implementation, this would call an API to generate a PDF
      toast.success("PDF export started (feature coming soon)");
      // TODO: Implement PDF generation
      console.log("Exporting to PDF:", { accounts, weekNumber, year });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportEmailList = () => {
    try {
      // Extract email addresses (assuming they exist in customer data)
      // For now, we'll create a CSV of account information
      const emailData = accounts
        .map((acc) => `${acc.customerName},${acc.accountNumber || ""},${acc.priority}`)
        .join("\n");

      const header = "Customer Name,Account Number,Priority\n";
      const csvContent = header + emailData;

      // Create a download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", `call-plan-week${weekNumber}-${year}.csv`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Email list exported successfully");
    } catch (error) {
      console.error("Error exporting email list:", error);
      toast.error("Failed to export email list");
    }
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <Card className="print:shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Call Plan Summary</CardTitle>
              <CardDescription>
                Week {weekNumber}, {year} - {accounts.length} accounts
              </CardDescription>
            </div>
            <div className="flex gap-2 print:hidden">
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Editor
                </Button>
              )}
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={handleExportEmailList}>
                <Mail className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleExportPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
        {/* By Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              By Account Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{type}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* By Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              By Priority
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.byPriority).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{priority}</span>
                <Badge
                  variant="outline"
                  className={
                    priority === "HIGH"
                      ? "border-red-200 text-red-600"
                      : priority === "MEDIUM"
                      ? "border-yellow-200 text-yellow-600"
                      : "border-green-200 text-green-600"
                  }
                >
                  {count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* By Territory */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              By Territory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.byTerritory)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([territory, count]) => (
                <div key={territory} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate">{territory}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            {Object.keys(stats.byTerritory).length > 5 && (
              <p className="text-xs text-gray-400 italic">
                +{Object.keys(stats.byTerritory).length - 5} more
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Account List */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Account #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Objective</TableHead>
                <TableHead>Territory</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts
                .sort((a, b) => {
                  // Sort by priority first (HIGH -> MEDIUM -> LOW)
                  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
                  return priorityOrder[a.priority] - priorityOrder[b.priority];
                })
                .map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.customerName}</TableCell>
                    <TableCell>{account.accountNumber || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={account.accountType === "ACTIVE" ? "default" : "outline"}>
                        {account.accountType || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          account.priority === "HIGH"
                            ? "border-red-200 text-red-600 bg-red-50"
                            : account.priority === "MEDIUM"
                            ? "border-yellow-200 text-yellow-600 bg-yellow-50"
                            : "border-green-200 text-green-600 bg-green-50"
                        }
                      >
                        {account.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {account.objective || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {account.location || "Unassigned"}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
