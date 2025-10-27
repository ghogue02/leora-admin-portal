'use client';

import { useState, useEffect } from 'react';
import { useToast } from '../../_components/ToastProvider';

type SavedQuery = {
  id: string;
  name: string;
  description: string | null;
  queryText: string;
  category: string | null;
  tags: string[];
  usageCount: number;
  lastUsedAt: string | null;
  isTemplate: boolean;
  isShared: boolean;
  user: {
    fullName: string;
    email: string;
  };
};

type QueryTemplate = {
  name: string;
  description: string;
  queryText: string;
  category: string;
  tags: string[];
};

type QueryBuilderProps = {
  onQuerySelect: (query: string) => void;
};

export function QueryBuilder({ onQuerySelect }: QueryBuilderProps) {
  const { pushToast } = useToast();
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [templates, setTemplates] = useState<QueryTemplate[]>([]);
  const [history, setHistory] = useState<Array<{ id: string; queryText: string; executedAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveQueryText, setSaveQueryText] = useState('');
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveCategory, setSaveCategory] = useState('');
  const [activeTab, setActiveTab] = useState<'saved' | 'templates' | 'history'>('templates');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load saved queries
      const savedRes = await fetch('/api/sales/leora/queries');
      if (savedRes.ok) {
        const data = await savedRes.json();
        setSavedQueries(data.queries || []);
      }

      // Load templates
      const templatesRes = await fetch('/api/sales/leora/queries/templates');
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.predefined || []);
      }

      // Load history
      const historyRes = await fetch('/api/sales/leora/queries/history?limit=10');
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading query data:', error);
      pushToast({
        tone: 'error',
        title: 'Loading error',
        description: 'Failed to load queries',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCurrentQuery = (queryText: string) => {
    setSaveQueryText(queryText);
    setShowSaveDialog(true);
  };

  const handleSaveQuery = async () => {
    if (!saveName || !saveQueryText) {
      pushToast({
        tone: 'error',
        title: 'Validation error',
        description: 'Name and query text are required',
      });
      return;
    }

    try {
      const response = await fetch('/api/sales/leora/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName,
          description: saveDescription,
          queryText: saveQueryText,
          category: saveCategory || null,
          tags: [],
          isShared: false,
        }),
      });

      if (response.ok) {
        pushToast({
          tone: 'success',
          title: 'Query saved',
          description: `"${saveName}" has been saved`,
        });
        setShowSaveDialog(false);
        setSaveName('');
        setSaveDescription('');
        setSaveCategory('');
        setSaveQueryText('');
        loadData();
      } else {
        throw new Error('Failed to save query');
      }
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'Save failed',
        description: 'Could not save query',
      });
    }
  };

  const handleExecuteQuery = async (queryId: string) => {
    try {
      const response = await fetch(`/api/sales/leora/queries/${queryId}/execute`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        onQuerySelect(data.query);
        loadData(); // Refresh to update usage stats
      }
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'Execution error',
        description: 'Failed to execute query',
      });
    }
  };

  const handleDeleteQuery = async (queryId: string) => {
    if (!confirm('Are you sure you want to delete this query?')) {
      return;
    }

    try {
      const response = await fetch(`/api/sales/leora/queries/${queryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        pushToast({
          tone: 'success',
          title: 'Query deleted',
          description: 'Query has been removed',
        });
        loadData();
      }
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'Delete failed',
        description: 'Could not delete query',
      });
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">Loading saved queries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Query Builder</h2>
        <button
          onClick={() => setShowSaveDialog(true)}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          + Save New Query
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('templates')}
            className={`border-b-2 px-1 pb-3 text-sm font-medium ${
              activeTab === 'templates'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Templates ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`border-b-2 px-1 pb-3 text-sm font-medium ${
              activeTab === 'saved'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            My Queries ({savedQueries.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`border-b-2 px-1 pb-3 text-sm font-medium ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            History ({history.length})
          </button>
        </nav>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-2">
          {templates.map((template, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {template.category}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{template.description}</p>
                  <p className="mt-2 text-sm italic text-gray-500">"{template.queryText}"</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => onQuerySelect(template.queryText)}
                  className="ml-4 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Use
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Saved Queries Tab */}
      {activeTab === 'saved' && (
        <div className="space-y-2">
          {savedQueries.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm text-gray-600">No saved queries yet. Create one!</p>
            </div>
          ) : (
            savedQueries.map((query) => (
              <div
                key={query.id}
                className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{query.name}</h3>
                      {query.category && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {query.category}
                        </span>
                      )}
                      {query.isShared && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Shared
                        </span>
                      )}
                    </div>
                    {query.description && (
                      <p className="mt-1 text-sm text-gray-600">{query.description}</p>
                    )}
                    <p className="mt-2 text-sm italic text-gray-500">"{query.queryText}"</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span>Used {query.usageCount} times</span>
                      {query.lastUsedAt && (
                        <span>
                          Last: {new Date(query.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <button
                      onClick={() => handleExecuteQuery(query.id)}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
                    >
                      Run
                    </button>
                    <button
                      onClick={() => handleDeleteQuery(query.id)}
                      className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm text-gray-600">No query history yet</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">"{item.queryText}"</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(item.executedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => onQuerySelect(item.queryText)}
                    className="ml-4 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
                  >
                    Use
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Save Query Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Save Query</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="My awesome query"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="What does this query do?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Query Text *</label>
                <textarea
                  value={saveQueryText}
                  onChange={(e) => setSaveQueryText(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Who are my top customers this month?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={saveCategory}
                  onChange={(e) => setSaveCategory(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select category</option>
                  <option value="Customers">Customers</option>
                  <option value="Products">Products</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Samples">Samples</option>
                  <option value="Territory">Territory</option>
                  <option value="Performance">Performance</option>
                  <option value="Call Planning">Call Planning</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveName('');
                  setSaveDescription('');
                  setSaveCategory('');
                  setSaveQueryText('');
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuery}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Save Query
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
