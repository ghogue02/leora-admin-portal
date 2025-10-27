"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Phone,
  MapPin,
  Navigation,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileAccountCardProps {
  account: any;
  onContactUpdate: (customerId: string, outcome: string) => void;
  onRemoveAccount: (customerId: string) => void;
}

export function MobileAccountCard({
  account,
  onContactUpdate,
  onRemoveAccount,
}: MobileAccountCardProps) {
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [showActions, setShowActions] = useState(false);

  const customer = account.customer;
  const address = customer.addresses?.[0];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    const swipeDistance = touchStartX - touchEndX;

    // Swipe left (> 50px) = Mark as contacted
    if (swipeDistance > 50) {
      onContactUpdate(customer.id, "YES");
    }
    // Swipe right (> 50px) = Mark as not contacted
    else if (swipeDistance < -50) {
      onContactUpdate(customer.id, "NO");
    }

    setTouchStartX(0);
    setTouchEndX(0);
  };

  const handleGetDirections = () => {
    if (address) {
      const destination = encodeURIComponent(
        `${address.address1}, ${address.city}, ${address.state} ${address.zipCode}`
      );
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
        "_blank"
      );
    }
  };

  const handleCall = () => {
    if (customer.phone) {
      window.location.href = `tel:${customer.phone}`;
    }
  };

  const isContacted = account.contactOutcome === "YES";
  const isNotContacted = account.contactOutcome === "NO";

  return (
    <Card
      className={`mb-3 touch-none ${
        isContacted ? "border-green-500 bg-green-50" : ""
      } ${isNotContacted ? "border-red-500 bg-red-50" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <CardContent className="p-4">
        {/* Header with customer name and menu */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">
              {customer.customerName}
            </h3>
            {customer.accountNumber && (
              <p className="text-sm text-gray-500">#{customer.accountNumber}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleGetDirections}>
                <Navigation className="h-4 w-4 mr-2" />
                Get Directions
              </DropdownMenuItem>
              {customer.phone && (
                <DropdownMenuItem onClick={handleCall}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onRemoveAccount(customer.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove from Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Address */}
        {address && (
          <div className="flex items-start gap-2 mb-3 text-sm text-gray-600">
            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              {address.address1}, {address.city}, {address.state}{" "}
              {address.zipCode}
            </span>
          </div>
        )}

        {/* Objectives */}
        {account.objectives && (
          <div className="mb-3 p-2 bg-blue-50 rounded text-sm">
            <span className="font-medium text-blue-900">Objectives: </span>
            <span className="text-blue-700">{account.objectives}</span>
          </div>
        )}

        {/* Contact Status Badge */}
        {account.contactOutcome && (
          <Badge
            variant={isContacted ? "default" : "destructive"}
            className="mb-3"
          >
            {isContacted ? "Contacted" : "Not Contacted"}
          </Badge>
        )}

        {/* Action Buttons - Large Touch Targets */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => onContactUpdate(customer.id, "YES")}
            className="h-12 gap-2"
            variant={isContacted ? "default" : "outline"}
          >
            <CheckCircle className="h-5 w-5" />
            <span className="text-base">Contacted</span>
          </Button>
          <Button
            onClick={() => onContactUpdate(customer.id, "NO")}
            className="h-12 gap-2"
            variant={isNotContacted ? "destructive" : "outline"}
          >
            <XCircle className="h-5 w-5" />
            <span className="text-base">Not Reached</span>
          </Button>
        </div>

        {/* Swipe hint */}
        <p className="text-xs text-gray-400 text-center mt-2">
          Swipe left ✓ or right ✗ to mark
        </p>
      </CardContent>
    </Card>
  );
}

interface MobileOptimizedViewProps {
  accounts: any[];
  onContactUpdate: (customerId: string, outcome: string, notes?: string) => void;
  onRemoveAccount: (customerId: string) => void;
}

export default function MobileOptimizedView({
  accounts,
  onContactUpdate,
  onRemoveAccount,
}: MobileOptimizedViewProps) {
  const contactedCount = accounts.filter((a) => a.contactOutcome === "YES").length;
  const totalCount = accounts.length;
  const progressPercent = totalCount > 0 ? (contactedCount / totalCount) * 100 : 0;

  return (
    <div className="pb-20"> {/* Extra padding for mobile nav */}
      {/* Progress Bar */}
      <Card className="mb-4 sticky top-0 z-10 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-lg">
              {contactedCount} / {totalCount} Contacted
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Cards */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No accounts in your call plan</p>
            <p className="text-sm text-gray-400 mt-2">
              Tap "Select Accounts" to add accounts
            </p>
          </CardContent>
        </Card>
      ) : (
        accounts.map((account) => (
          <MobileAccountCard
            key={account.id}
            account={account}
            onContactUpdate={onContactUpdate}
            onRemoveAccount={onRemoveAccount}
          />
        ))
      )}
    </div>
  );
}
