'use client';

import { useId, useState } from 'react';
import { useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/hooks/useUser';
import { auth } from '@/lib/firebase/config';
import { cn } from '@/lib/utils';
import {
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABELS,
  FeedbackSubmitSchema,
  type FeedbackSubmitInput,
  type FeedbackType,
} from '@/types/feedback';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { data: user } = useUser();
  const [contextOpen, setContextOpen] = useState(false);
  const groupId = useId();

  const form = useForm<FeedbackSubmitInput>({
    resolver: zodResolver(FeedbackSubmitSchema),
    defaultValues: {
      type: 'bug',
      message: '',
      context: '',
      pageUrl: '',
    },
  });

  // Reset everything when the dialog closes — next open starts clean.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset({ type: 'bug', message: '', context: '', pageUrl: '' });
      setContextOpen(false);
    }
    onOpenChange(next);
  };

  const submit = async (values: FeedbackSubmitInput) => {
    const current = auth.currentUser;
    if (!current) {
      toast.error('Sign in to send feedback.');
      return;
    }

    let token: string;
    try {
      token = await current.getIdToken();
    } catch {
      toast.error('Could not refresh your session. Sign in again.');
      return;
    }

    let res: Response;
    try {
      res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...values,
          // Capture the URL at submit time — what the user was looking at
          // right when they hit send.
          pageUrl:
            typeof window !== 'undefined' ? window.location.href : values.pageUrl,
          context: values.context?.trim() ? values.context : undefined,
        }),
      });
    } catch {
      toast.error('Could not send. Try again.');
      return;
    }

    if (!res.ok) {
      toast.error('Could not send. Try again.');
      return;
    }

    toast.success('Feedback sent. Thanks!');
    handleOpenChange(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void form.handleSubmit(submit)();
    }
  };

  const isSubmitting = form.formState.isSubmitting;
  const messageError = form.formState.errors.message?.message;
  const selectedType = useWatch({ control: form.control, name: 'type' });
  const typeRegister = form.register('type');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-subheading text-text">
            Send feedback
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(submit)}
          onKeyDown={onKeyDown}
          className="flex flex-col gap-4"
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="text-caption text-text-muted">
              What kind of feedback?
            </legend>
            <div className="flex flex-col gap-1">
              {FEEDBACK_TYPES.map((type, index) => (
                <FeedbackTypeOption
                  key={type}
                  type={type}
                  groupId={groupId}
                  autoFocus={index === 0}
                  selected={selectedType === type}
                  register={typeRegister}
                />
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor="feedback-message">Your message</Label>
            <Textarea
              id="feedback-message"
              rows={5}
              placeholder="Describe what's on your mind…"
              aria-invalid={Boolean(messageError) || undefined}
              {...form.register('message')}
            />
            {messageError && (
              <p className="text-caption text-danger-text">{messageError}</p>
            )}
          </div>

          <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
            <CollapsibleTrigger
              type="button"
              className="flex items-center gap-2 text-caption text-text-muted hover:text-text"
            >
              <ChevronDown
                className={cn(
                  'size-4 transition-transform',
                  contextOpen && 'rotate-180',
                )}
              />
              Add context (optional)
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Textarea
                rows={3}
                placeholder="What were you doing when this came up?"
                {...form.register('context')}
              />
            </CollapsibleContent>
          </Collapsible>

          {user?.email && (
            <p className="text-caption text-text-muted">
              Your email ({user.email}) will be attached so we can follow up if
              needed.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Send feedback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface FeedbackTypeOptionProps {
  type: FeedbackType;
  groupId: string;
  autoFocus: boolean;
  selected: boolean;
  register: UseFormRegisterReturn;
}

function FeedbackTypeOption({
  type,
  groupId,
  autoFocus,
  selected,
  register,
}: FeedbackTypeOptionProps) {
  const labelId = `${groupId}-${type}`;
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors',
        selected
          ? 'border-primary bg-elevated'
          : 'border-border hover:bg-surface',
      )}
    >
      <input
        type="radio"
        value={type}
        autoFocus={autoFocus}
        className="size-4 accent-primary"
        aria-labelledby={labelId}
        {...register}
      />
      <span id={labelId} className="text-body text-text">
        {FEEDBACK_TYPE_LABELS[type]}
      </span>
    </label>
  );
}
