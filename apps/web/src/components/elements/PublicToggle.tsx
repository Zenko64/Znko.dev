import { EyeIcon, LockIcon } from "raster-react";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

export function PublicToggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Label className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      {checked ? (
        <><EyeIcon className="size-3.5" /> Public</>
      ) : (
        <><LockIcon className="size-3.5" /> Private</>
      )}
    </Label>
  );
}
