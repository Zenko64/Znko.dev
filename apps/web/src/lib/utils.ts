import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Canonical = { nanoid: string; slug?: string };

/**
 * @name urlCalc
 * @description This calculates the object associated with the given URL data, slug and nanoid. Nanoid is the main source of truth, and slug is vanity.
 * If both are wrong, it returns undefined.
 * Correct the URL with the returned data.
 * @returns {Canonical | undefined} The canonical object matching the URL data, or undefined if no match is found.
 */
export function urlCalc<T extends Canonical>(
  objs: T[],
  data: Partial<Canonical>,
): T | undefined {
  const { nanoid, slug } = data;
  const objBySlug = objs.find((o) => o.slug === slug);
  const objByNanoid = objs.find((o) => o.nanoid === nanoid);

  if (objByNanoid) {
    return objByNanoid;
  }
  if (objBySlug) {
    return objBySlug;
  }

  // If nothing matches return undefined. The caller should just not select anything
  return undefined;
}

/**
 * @name openFilePicker
 * @description Programmatically opens a native file picker dialog. Works by
 * creating a temporary, detached input element — no DOM insertion needed.
 * @param accept MIME type string passed to the input's accept attribute (e.g. "image/*")
 * @param onFile Called with the selected File once the user confirms
 */
export function openFilePicker(accept: string, onFile: (file: File) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) onFile(file);
  };
  input.click();
}
