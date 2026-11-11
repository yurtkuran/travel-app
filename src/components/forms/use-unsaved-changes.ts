"use client";

import { useCallback, useEffect, useRef } from "react";

const defaultMessage =
  "You have unsaved changes. Leave this page and discard them?";

export function useUnsavedChanges(message = defaultMessage) {
  const dirty = useRef(false);
  const markDirty = useCallback(() => {
    dirty.current = true;
  }, []);
  const markClean = useCallback(() => {
    dirty.current = false;
  }, []);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmNavigation = (event: MouseEvent) => {
      if (
        !dirty.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target;
      const link =
        target instanceof Element
          ? target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !link ||
        link.download ||
        link.target === "_blank" ||
        link.origin !== window.location.origin
      ) {
        return;
      }
      const current = `${window.location.pathname}${window.location.search}`;
      const destination = `${link.pathname}${link.search}`;
      if (destination === current) return;
      if (window.confirm(message)) {
        markClean();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", confirmNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", confirmNavigation, true);
    };
  }, [markClean, message]);

  return {
    markClean,
    markDirty,
    formProps: {
      onChangeCapture: markDirty,
      onSubmitCapture: markClean,
    },
  };
}
