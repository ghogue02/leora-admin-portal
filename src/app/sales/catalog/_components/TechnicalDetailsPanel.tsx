'use client';

type TechnicalDetails = {
  abv?: number;
  vintage?: string;
  region?: string;
  producer?: string;
  awards?: string[];
  countryOfOrigin?: string;
  appellation?: string;
  closureType?: string;
  caseSize?: number;
  bottleSize?: string;
  grapeVariety?: string;
  style?: string;
  ageability?: string;
};

type TechnicalDetailsPanelProps = {
  details: TechnicalDetails;
  compact?: boolean;
};

export function TechnicalDetailsPanel({ details, compact = false }: TechnicalDetailsPanelProps) {
  const hasDetails = Object.values(details).some(value => value !== undefined && value !== null);

  if (!hasDetails) return null;

  const DetailItem = ({ label, value, icon }: { label: string; value?: string | number | null; icon: string }) => {
    if (!value) return null;

    return (
      <div className={compact ? "flex justify-between text-xs" : "rounded-lg border border-gray-200 bg-white p-3"}>
        <dt className={`flex items-center gap-1.5 ${compact ? 'text-gray-600' : 'text-xs font-medium text-gray-600'}`}>
          <span className="text-sm">{icon}</span>
          {label}
        </dt>
        <dd className={`${compact ? 'font-medium text-gray-900' : 'mt-1 text-sm font-semibold text-gray-900'}`}>
          {value}
        </dd>
      </div>
    );
  };

  if (compact) {
    return (
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-900">
          <span>📋</span>
          Technical Details
        </h4>
        <dl className="space-y-1.5">
          <DetailItem label="ABV" value={details.abv ? `${details.abv}%` : undefined} icon="🌡️" />
          <DetailItem label="Vintage" value={details.vintage} icon="📅" />
          <DetailItem label="Region" value={details.region} icon="🗺️" />
          <DetailItem label="Producer" value={details.producer} icon="🏭" />
          <DetailItem label="Country" value={details.countryOfOrigin} icon="🌍" />
          <DetailItem label="Appellation" value={details.appellation} icon="🏛️" />
          <DetailItem label="Grape" value={details.grapeVariety} icon="🍇" />
          <DetailItem label="Style" value={details.style} icon="🎨" />
          <DetailItem label="Closure" value={details.closureType} icon="🔒" />
          <DetailItem label="Case Size" value={details.caseSize} icon="📦" />
          <DetailItem label="Bottle Size" value={details.bottleSize} icon="🍾" />
        </dl>

        {details.awards && details.awards.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h5 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-900">
              <span>🏆</span>
              Awards & Recognition
            </h5>
            <ul className="space-y-1">
              {details.awards.map((award, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-700">
                  <span className="text-amber-600">•</span>
                  {award}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Full expanded view
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <DetailItem label="Alcohol by Volume" value={details.abv ? `${details.abv}%` : undefined} icon="🌡️" />
        <DetailItem label="Vintage Year" value={details.vintage} icon="📅" />
        <DetailItem label="Region" value={details.region} icon="🗺️" />
        <DetailItem label="Producer" value={details.producer} icon="🏭" />
        <DetailItem label="Country of Origin" value={details.countryOfOrigin} icon="🌍" />
        <DetailItem label="Appellation" value={details.appellation} icon="🏛️" />
        <DetailItem label="Grape Variety" value={details.grapeVariety} icon="🍇" />
        <DetailItem label="Wine Style" value={details.style} icon="🎨" />
        <DetailItem label="Closure Type" value={details.closureType} icon="🔒" />
        <DetailItem label="Case Size" value={details.caseSize} icon="📦" />
        <DetailItem label="Bottle Size" value={details.bottleSize} icon="🍾" />
        <DetailItem label="Ageability" value={details.ageability} icon="⏳" />
      </div>

      {details.awards && details.awards.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h4 className="mb-3 flex items-center gap-2 font-semibold text-amber-900">
            <span className="text-lg">🏆</span>
            Awards & Recognition
          </h4>
          <ul className="space-y-2">
            {details.awards.map((award, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-amber-900">
                <span className="mt-0.5 text-amber-600">•</span>
                <span>{award}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
