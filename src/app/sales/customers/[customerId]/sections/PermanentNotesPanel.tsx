'use client';

import { format } from "date-fns";

type PermanentNote = {
  id: string;
  subject: string;
  notes: string | null;
  occurredAt: string;
  userName: string;
  activityType: {
    code: string;
  };
};

type PermanentNotesPanelProps = {
  notes: PermanentNote[];
};

export default function PermanentNotesPanel({ notes }: PermanentNotesPanelProps) {
  // Filter and sort permanent notes
  const permanentNotes = notes
    .filter(note => note.activityType?.code === "MAJOR_CHANGE")
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const scrollToTimeline = (noteId: string) => {
    const timelineElement = document.getElementById(`activity-${noteId}`);
    if (timelineElement) {
      timelineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a brief highlight effect
      timelineElement.classList.add('ring-2', 'ring-amber-400', 'ring-offset-2');
      setTimeout(() => {
        timelineElement.classList.remove('ring-2', 'ring-amber-400', 'ring-offset-2');
      }, 2000);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Permanent Notes
          </h2>
          <p className="text-xs text-gray-500">
            Major account changes and important milestones
          </p>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
          {permanentNotes.length} {permanentNotes.length === 1 ? 'Note' : 'Notes'}
        </div>
      </div>

      {permanentNotes.length === 0 ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-gray-500">No permanent notes recorded</p>
          <p className="mt-1 text-xs text-gray-400">
            Major account changes will appear here when logged
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {permanentNotes.map((note) => (
            <div
              key={note.id}
              id={`permanent-note-${note.id}`}
              className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 transition-all duration-200"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📌</span>
                    <h4 className="font-semibold text-amber-900">
                      {note.subject}
                    </h4>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-amber-700">
                    <span className="font-medium">{note.userName}</span>
                    <span className="text-amber-400">•</span>
                    <span>{format(new Date(note.occurredAt), "MMM d, yyyy")}</span>
                    <span className="text-amber-400">•</span>
                    <span>{format(new Date(note.occurredAt), "h:mm a")}</span>
                  </div>

                  {note.notes && (
                    <div className="mt-3 rounded-md border border-amber-300 bg-white p-3">
                      <p className="whitespace-pre-wrap text-sm text-gray-900">
                        {note.notes}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => scrollToTimeline(note.id)}
                    aria-label={`View ${note.subject} in timeline`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 transition-colors hover:text-amber-900 hover:underline focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 rounded"
                  >
                    <span>View in Timeline</span>
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
