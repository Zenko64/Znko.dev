import { useCallback, useState } from "react";
import type { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import Cropper from "react-easy-crop";
import { Button } from "../ui/button";

async function getCroppedFile(
  imageSrc: string,
  pixelCrop: Area,
  fileName: string = "crop.jpg",
): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(new File([blob], fileName, { type: "image/jpeg" }))
          : reject(new Error("toBlob failed")),
      "image/jpeg",
      0.9,
    ),
  );
}

export function CropDialog({
  src,
  aspect = 1,
  fileName,
  onConfirm,
  onClose,
}: {
  src: string | null;
  aspect?: number;
  fileName?: string;
  onConfirm: (file: File) => void;
  onClose: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!src || !croppedAreaPixels) return;
    const file = await getCroppedFile(src, croppedAreaPixels, fileName);
    onConfirm(file);
    onClose();
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
    else {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }

  return (
    <Dialog open={!!src} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden gap-0 p-0 sm:max-w-md data-open:zoom-in-100 data-closed:zoom-out-100"
      >
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>

        <div className="relative h-72 w-full bg-black">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="flex flex-col gap-1 px-4">
          <label className="text-xs text-muted-foreground">Zoom</label>
          <input
            type="range"
            min={1}
            max={5}
            step={0.001}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-foreground"
          />
        </div>

        <DialogFooter className="p-4 pt-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
