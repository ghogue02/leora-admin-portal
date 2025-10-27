"use client";

import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Calendar, TrendingUp } from "lucide-react";
import type { Account, AccountType, Priority } from "../page";

interface AccountListProps {
  accounts: Account[];
  onAccountSelect: (accountId: string, selected: boolean) => void;
  onSelectAll: () => void;
}

const accountTypeConfig: Record<AccountType, { label: string; variant: "default" | "secondary" | "outline" }> = {
  PROSPECT: { label: "Prospect", variant: "outline" },
  TARGET: { label: "Target", variant: "secondary" },
  ACTIVE: { label: "Active", variant: "default" },
};

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  HIGH: { label: "High", color: "text-red-600 bg-red-50 border-red-200" },
  MEDIUM: { label: "Medium", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  LOW: { label: "Low", color: "text-green-600 bg-green-50 border-green-200" },
};

export default function AccountList({
  accounts,
  onAccountSelect,
  onSelectAll,
}: AccountListProps) {
  const allSelected = accounts.length > 0 && accounts.every((acc) => acc.selected);
  const someSelected = accounts.some((acc) => acc.selected) && !allSelected;

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-lg font-medium text-gray-900">No accounts found</p>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or search criteria
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Available Accounts ({accounts.length})</CardTitle>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
              className={someSelected ? "data-[state=checked]:bg-gray-400" : ""}
            />
            <label className="text-sm font-medium">
              {allSelected ? "Deselect All" : "Select All"}
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {accounts.map((account) => {
            const typeConfig = accountTypeConfig[account.accountType];
            const priorityConf = priorityConfig[account.priority];

            return (
              <div
                key={account.id}
                className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                  account.selected
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                {/* Checkbox */}
                <Checkbox
                  checked={account.selected || false}
                  onCheckedChange={(checked) =>
                    onAccountSelect(account.id, checked as boolean)
                  }
                />

                {/* Account Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{account.name}</h3>
                      {account.accountNumber && (
                        <p className="text-sm text-gray-500">#{account.accountNumber}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Badge variant={typeConfig.variant}>
                        {typeConfig.label}
                      </Badge>

                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${priorityConf.color}`}
                      >
                        {priorityConf.label} Priority
                      </span>
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                    {account.city && account.state && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>
                          {account.city}, {account.state}
                        </span>
                      </div>
                    )}

                    {account.territory && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>{account.territory}</span>
                      </div>
                    )}

                    {account.lastOrderDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          Last Order: {format(new Date(account.lastOrderDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
