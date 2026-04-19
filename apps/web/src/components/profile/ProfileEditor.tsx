import { UserIcon } from "raster-react";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { useRef, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { Controller, useWatch } from "react-hook-form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { CropDialog } from "../elements/CropDialog";
import { useProfileForm } from "@/hooks/forms/useProfileForm";
import { useFilePreview } from "@/hooks/useMediaManager";

function AvatarPicker({
  currentUrl,
  onFile,
}: {
  currentUrl: string | null;
  onFile: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const cropSrc = useFilePreview(rawFile);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRawFile(e.target.files?.[0] ?? null);
  }

  function handleClose() {
    setRawFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="relative size-16 shrink-0 overflow-hidden p-0 border border-border bg-muted"
        onClick={() => fileRef.current?.click()}
        title="Change Avatar"
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt="Avatar"
            className="size-full object-cover"
          />
        ) : (
          <UserIcon className="m-auto size-8 text-muted-foreground" />
        )}
        <span className="absolute p-0 m-0 inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
          <span className="text-[10px] font-medium text-white">Change</span>
        </span>
      </Button>

      {/* Hidden File Input For The File Popup */}
      <Input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <CropDialog
        src={cropSrc}
        aspect={1}
        fileName="avatar.jpg"
        onConfirm={(file) => {
          onFile(file);
          handleClose();
        }}
        onClose={handleClose}
      />
    </>
  );
}

export function ProfileForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { form, submit, isPending } = useProfileForm({
    displayName: user?.displayName ?? "",
    username: user?.username ?? "",
  });

  const avatarFile = useWatch({ control: form.control, name: "avatar" });
  const blobPreview = useFilePreview(avatarFile ?? null);
  const previewUrl = blobPreview ?? user?.avatarUrl ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center gap-4">
        <Controller
          control={form.control}
          name="avatar"
          render={({ field }) => (
            <AvatarPicker
              currentUrl={previewUrl}
              onFile={(file) => field.onChange(file)}
            />
          )}
        />
        <div className="text-xs text-muted-foreground">
          {user?.email && <p>{user.email}</p>}
        </div>
      </div>

      <Controller
        control={form.control}
        name="displayName"
        render={({ field, fieldState }) => (
          <Field data-invalid={!!fieldState.error}>
            <FieldLabel htmlFor="displayName">Display Name</FieldLabel>
            <Input
              id="displayName"
              placeholder="Your name"
              aria-invalid={!!fieldState.error}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={isPending}
          onClick={form.handleSubmit((values) => submit(values, { onSuccess }))}
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
