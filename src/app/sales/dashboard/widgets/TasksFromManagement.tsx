'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: string;
  priority: 'high' | 'medium' | 'low';
  assignedBy: string;
  customer?: {
    id: string;
    name: string;
  } | null;
}

interface TasksFromManagementProps {
  onRemove?: () => void;
  position?: 'top' | 'default';
}

export function TasksFromManagement({ onRemove, position = 'top' }: TasksFromManagementProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await fetch('/api/dashboard/widgets/tasks-from-management');
        if (response.ok) {
          const data = await response.json();
          setTasks(data.tasks || []);
        }
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadTasks();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <Card className={cn('h-full flex flex-col', position === 'top' && 'border-t-4 border-t-primary')}>
      <CardHeader className="drag-handle cursor-move">
        <div className="flex items-center gap-2">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Tasks from Management</CardTitle>
        </div>
        {onRemove && (
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onRemove}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading tasks...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">No tasks assigned</div>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  'p-3 border-l-4 rounded-lg bg-muted/50',
                  getPriorityColor(task.priority)
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(task.status)}
                      <h4 className="font-medium text-sm truncate">{task.title}</h4>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {task.assignedBy && (
                        <span>Assigned by {task.assignedBy}</span>
                      )}
                      {task.customer && (
                        <span className="truncate">Customer: {task.customer.name}</span>
                      )}
                      {task.dueAt && (
                        <span>Due: {new Date(task.dueAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    'px-2 py-1 rounded text-xs font-medium whitespace-nowrap',
                    task.priority === 'high' && 'bg-red-100 text-red-700',
                    task.priority === 'medium' && 'bg-yellow-100 text-yellow-700',
                    task.priority === 'low' && 'bg-blue-100 text-blue-700'
                  )}>
                    {task.priority}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
