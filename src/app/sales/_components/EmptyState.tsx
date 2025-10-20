type EmptyStateProps = {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 px-6 text-center">
      <div className="mb-4 text-6xl">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-gray-600">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Pre-configured empty states
export function EmptyCustomers() {
  return (
    <EmptyState
      icon="👥"
      title="No customers found"
      description="No customers match your current filters. Try adjusting your search or filter criteria."
    />
  );
}

export function EmptyOrders() {
  return (
    <EmptyState
      icon="📦"
      title="No orders yet"
      description="Orders will appear here once customers start placing them."
    />
  );
}

export function EmptyActivities() {
  return (
    <EmptyState
      icon="📝"
      title="No activities recorded"
      description="Start tracking your customer interactions to see them here."
      actionLabel="Log Activity"
    />
  );
}

export function EmptyTasks() {
  return (
    <EmptyState
      icon="✅"
      title="All caught up!"
      description="You have no pending tasks. Great work!"
    />
  );
}

export function EmptyCart() {
  return (
    <EmptyState
      icon="🛒"
      title="Your cart is empty"
      description="Browse the catalog to add products to your cart."
      actionLabel="View Catalog"
    />
  );
}

export function EmptySamples() {
  return (
    <EmptyState
      icon="🎁"
      title="No samples logged"
      description="Track your sample usage to monitor conversion rates and optimize your sample strategy."
      actionLabel="Log Sample"
    />
  );
}

export function EmptyCustomersDue() {
  return (
    <EmptyState
      icon="📅"
      title="No customers due"
      description="All customers are on track with their ordering schedules."
    />
  );
}

export function EmptyEvents() {
  return (
    <EmptyState
      icon="🗓️"
      title="No upcoming events"
      description="Your calendar is clear for the next few weeks."
    />
  );
}

export function EmptySearch() {
  return (
    <EmptyState
      icon="🔍"
      title="No results found"
      description="We couldn't find anything matching your search. Try different keywords."
    />
  );
}
