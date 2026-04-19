import { useEffect, useRef, useState } from "react";

export function useFilePreview(file: File | null | undefined): string | null {
  const urlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setPreviewUrl(url);
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [file]);

  return previewUrl;
}

export function useMediaManager<T extends { url: string }>(initial: T[] = []) {
  const [existing, setExisting] = useState<T[]>(initial);
  const [pending, setPending] = useState<{ file: File; blobUrl: string }[]>([]);

  // Track blob URLs in a ref so we can revoke them all on unmount
  // without re-running the effect every time `pending` changes.
  const blobUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Capture the ref's current value now so the cleanup closure holds a stable reference.
    const blobUrls = blobUrlsRef.current;
    return () => blobUrls.forEach((url) => URL.revokeObjectURL(url));
  }, []); // only runs cleanup on unmount

  const addFile = (file: File) => {
    const blobUrl = URL.createObjectURL(file);
    blobUrlsRef.current.add(blobUrl);
    setPending((prev) => [...prev, { file, blobUrl }]);
  };

  const removeExisting = (index: number) =>
    setExisting((prev) => prev.filter((_, i) => i !== index));

  const removePending = (index: number) =>
    setPending((prev) => {
      URL.revokeObjectURL(prev[index].blobUrl);
      blobUrlsRef.current.delete(prev[index].blobUrl);
      return prev.filter((_, i) => i !== index);
    });

  const hasChanges = (original: T[]) =>
    pending.length > 0 || existing.length < original.length;

  return {
    existing,
    pending,
    addFile,
    removeExisting,
    removePending,
    hasChanges,
  };
}
