"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  useCallback,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";

const compactQuery = "(max-width: 960px)";

export function LibraryNavigation({
  open,
  onOpenChange,
  triggerRef,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
}) {
  const subscribe = useCallback(
    (callback: () => void) => {
      const query = window.matchMedia(compactQuery);
      const change = () => {
        if (!query.matches) onOpenChange(false);
        callback();
      };
      query.addEventListener("change", change);
      return () => query.removeEventListener("change", change);
    },
    [onOpenChange],
  );
  const compact = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(compactQuery).matches,
    () => false,
  );

  if (!compact) return <aside className="sidebar">{children}</aside>;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="mobile-backdrop" />
        <Dialog.Content
          className="sidebar sidebar-open"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <Dialog.Title className="sr-only">
            Your library navigation
          </Dialog.Title>
          <Dialog.Close
            className="button button-ghost button-icon navigation-close"
            aria-label="Close navigation"
          >
            <X size={20} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
