"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const MODAL_EXIT_MS = 180;

export function useModalClose(onClose: () => void) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const close = useCallback(() => {
    if (timer.current !== undefined) return;
    setClosing(true);
    timer.current = window.setTimeout(() => onCloseRef.current(), MODAL_EXIT_MS);
  }, []);
  return { closing, close };
}

export function ModalFrame({
  closing,
  onBackdrop,
  children,
}: {
  closing: boolean;
  onBackdrop: () => void;
  children: ReactNode;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className={`modal-backdrop${closing ? " is-closing" : ""}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onBackdrop();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
