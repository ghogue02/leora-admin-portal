"use client";

type Props = {
  territories: any[];
  onTerritoryClick: (territoryName: string) => void;
};

export default function TerritoryHealthOverview({ territories, onTerritoryClick }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Territory Health</h3>
      <p className="text-sm text-gray-600 mb-4">Click territory for detailed account breakdown</p>
      <div className="grid gap-4 md:grid-cols-3">
        {territories.map((territory: any) => (
          <button
            key={territory.name}
            onClick={() => onTerritoryClick(territory.name)}
            className="rounded-lg border border-gray-200 p-4 hover:border-blue-500 hover:shadow-md transition-all text-left"
          >
            <h4 className="font-semibold text-blue-600 hover:underline">{territory.name}</h4>
            <p className="text-xs text-gray-500 mt-1">Managed by {territory.repName}</p>
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
          </button>
        ))}
      </div>
    </div>
  );
}
