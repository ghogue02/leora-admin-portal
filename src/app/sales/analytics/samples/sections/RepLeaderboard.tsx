'use client';

import { Award, Medal, Trophy } from 'lucide-react';

type Rep = {
  id: string;
  name: string;
  samplesGiven: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
};

type RepLeaderboardProps = {
  reps: Rep[];
};

export default function RepLeaderboard({ reps }: RepLeaderboardProps) {
  const sortedReps = [...reps].sort((a, b) => b.revenue - a.revenue);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-700" />;
      default:
        return <Award className="h-5 w-5 text-gray-300" />;
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 2:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 3:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-white text-gray-600 border-gray-200';
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sales Rep Leaderboard</h2>
          <p className="text-xs text-gray-500">Top performers by revenue generated</p>
        </div>
        <div className="rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
          {reps.length} Reps
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {sortedReps.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm text-gray-500">No rep data available</p>
          </div>
        ) : (
          sortedReps.map((rep, index) => {
            const rank = index + 1;
            return (
              <div
                key={rep.id}
                className={`rounded-lg border p-4 transition ${
                  rank <= 3
                    ? 'border-slate-300 bg-gradient-to-r from-slate-50 to-white shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${getRankBadge(rank)}`}
                    >
                      {rank <= 3 ? (
                        getRankIcon(rank)
                      ) : (
                        <span className="text-sm font-bold">{rank}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{rep.name}</h3>
                      <span className="text-lg font-bold text-gray-900">
                        ${rep.revenue.toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-gray-500">Samples</p>
                        <p className="font-medium text-gray-900">{rep.samplesGiven}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Conversions</p>
                        <p className="font-medium text-gray-900">{rep.conversions}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Conv. Rate</p>
                        <p
                          className={`font-medium ${
                            rep.conversionRate >= 0.3
                              ? 'text-green-600'
                              : rep.conversionRate >= 0.15
                                ? 'text-yellow-600'
                                : 'text-gray-900'
                          }`}
                        >
                          {(rep.conversionRate * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {reps.length > 0 && (
        <div className="mt-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-4">
          <p className="text-xs font-semibold text-gray-700">
            💡 Tip: Top performers typically follow up within 48 hours and target high-value customers
          </p>
        </div>
      )}
    </section>
  );
}
