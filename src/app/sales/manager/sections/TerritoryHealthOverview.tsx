"use client";

export default function TerritoryHealthOverview({ territories }: { territories: any[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Territory Health</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {territories.map((territory: any) => (
          <div key={territory.name} className="rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900">{territory.name}</h4>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Customers:</span>
                <span className="font-medium">{territory.totalCustomers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600">Healthy:</span>
                <span className="font-medium">{territory.healthy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-600">At Risk:</span>
                <span className="font-medium">{territory.atRisk}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600">Dormant:</span>
                <span className="font-medium">{territory.dormant}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
