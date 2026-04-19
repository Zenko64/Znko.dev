import { urlCalc, type Canonical } from "@/lib/utils";
import { useEffect, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "react-router";

/**
 * @name useUrlState
 * @description Resolves the initially selected item from the URL (`/:slug?id=nanoid`),
 */
export function useUrlState<T extends Canonical>(
  objs: T[] | undefined,
  onObj: (item: T) => void,
  urlFormat: (item: T | null) => string,
) {
  const initialized = useRef(false);

  // Capture the onObj once, because we only want it to run once (page load)
  const onObjRef = useRef(onObj);

  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const nanoid = searchParams.get("id");

  const urlItem = useMemo(() => {
    if (!objs?.length || (!slug && !nanoid)) return null;
    return (
      urlCalc(objs, { nanoid: nanoid ?? undefined, slug: slug ?? undefined }) ??
      null
    );
  }, [objs, slug, nanoid]);

  useEffect(() => {
    if (initialized.current || !urlItem) return;
    initialized.current = true;
    onObjRef.current(urlItem);
    window.history.replaceState(null, "", urlFormat(urlItem));
  }, [urlItem, urlFormat]);

  const setUrlItem = (item: T | null) => {
    window.history.replaceState(null, "", urlFormat(item));
  };

  return { setUrlItem };
}
