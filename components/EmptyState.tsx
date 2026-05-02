import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface p-10 text-center">
      {Icon && (
        <div className="flex size-10 items-center justify-center rounded-full bg-elevated text-text-muted">
          <Icon className="size-5" />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-subheading text-text">{title}</p>
        {description && <p className="text-caption text-text-muted">{description}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
