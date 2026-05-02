'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils/formatDate';
import { cn } from '@/lib/utils';

export interface NumericFieldConfig {
  key: string;
  label: string;
  type: 'money' | 'count';
}

type Values = Record<string, number>;
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface DailyEntryRowProps {
  date: string;
  initialValues: Values;
  fields: NumericFieldConfig[];
  onSave: (date: string, values: Values) => Promise<void>;
  onDateChange?: (date: string) => void;
  renderComputed?: (values: Values) => ReactNode;
  renderActions?: () => ReactNode;
  isNew?: boolean;
}

const DEBOUNCE_MS = 500;

function shallowEqual(a: Values, b: Values): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
}

export function DailyEntryRow({
  date,
  initialValues,
  fields,
  onSave,
  onDateChange,
  renderComputed,
  renderActions,
  isNew = false,
}: DailyEntryRowProps) {
  const [values, setValues] = useState<Values>(initialValues);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const lastSavedRef = useRef<Values>(initialValues);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
  }, []);

  const flushSave = async (toSave: Values) => {
    if (shallowEqual(toSave, lastSavedRef.current)) return;
    setStatus('saving');
    try {
      await onSave(date, toSave);
      lastSavedRef.current = toSave;
      setStatus('saved');
      if (fadeRef.current) clearTimeout(fadeRef.current);
      fadeRef.current = setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('error');
    }
  };

  const scheduleSave = (toSave: Values) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flushSave(toSave);
    }, DEBOUNCE_MS);
  };

  const handleChange = (key: string, raw: string) => {
    const n = raw === '' ? 0 : Number(raw);
    const safe = Number.isFinite(n) ? n : 0;
    const next = { ...values, [key]: safe };
    setValues(next);
    scheduleSave(next);
  };

  const handleBlur = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void flushSave(values);
  };

  return (
    <TableRow className={cn(isNew && 'bg-elevated/40')} data-status={status}>
      <TableCell className="text-mono text-text">
        {onDateChange ? (
          <Input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-8 w-36 px-2 text-mono"
          />
        ) : (
          formatDate(date)
        )}
      </TableCell>

      {fields.map((field) => (
        <TableCell key={field.key} className="text-right">
          <Input
            type="number"
            step={field.type === 'money' ? '0.01' : '1'}
            min={0}
            value={values[field.key] === 0 ? '' : values[field.key]}
            placeholder="0"
            onChange={(e) => handleChange(field.key, e.target.value)}
            onBlur={handleBlur}
            aria-label={`${field.label} on ${date}`}
            className="h-8 w-24 px-2 text-right text-mono"
          />
        </TableCell>
      ))}

      {renderComputed && renderComputed(values)}

      <TableCell className="w-8 text-center">
        <SaveIndicator status={status} />
      </TableCell>

      {renderActions ? (
        <TableCell className="w-10 text-right">{renderActions()}</TableCell>
      ) : null}
    </TableRow>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'saving') {
    return <Loader2 className="size-4 animate-spin text-text-muted" aria-label="Saving" />;
  }
  if (status === 'saved') {
    return <Check className="size-4 text-success-text transition-opacity" aria-label="Saved" />;
  }
  if (status === 'error') {
    return <AlertTriangle className="size-4 text-danger-text" aria-label="Save failed" />;
  }
  return <span className="block size-4" aria-hidden />;
}
