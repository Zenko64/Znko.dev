import { Button } from "@/components/ui/button";
import { PublicToggle } from "@/components/elements/PublicToggle";

export function FormFooter({
  isPublic,
  onPublicChange,
  onCancel,
  onSubmit,
  isPending,
  canSubmit = true,
  submitLabel = "Save",
  pendingLabel,
}: {
  isPublic: boolean;
  onPublicChange: (v: boolean) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
  canSubmit?: boolean;
  submitLabel?: string;
  pendingLabel?: string;
}) {
  return (
    <>
      <PublicToggle checked={isPublic} onCheckedChange={onPublicChange} />
      <span className="flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isPending || !canSubmit}>
          {isPending ? (pendingLabel ?? `${submitLabel}...`) : submitLabel}
        </Button>
      </span>
    </>
  );
}
