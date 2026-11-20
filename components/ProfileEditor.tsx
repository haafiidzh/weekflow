"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FaCamera, FaMinus, FaPlus, FaRegTrashAlt } from "react-icons/fa";
import type { LocalSession } from "@/lib/auth";
import {
  MAX_AVATAR_BYTES,
  deleteAvatar,
  updateProfileNames,
  uploadAvatar,
} from "@/lib/data";
import { ModalFrame, useModalClose } from "./Modal";

const VIEW = 280; // crop viewport, CSS px
const OUTPUT = 512; // exported square, px
const MAX_ZOOM = 4;
const ACCEPT = "image/png,image/jpeg,image/webp";

export function initialsOf(session: {
  firstName: string;
  lastName: string;
  email: string;
}) {
  const letters = `${session.firstName.slice(0, 1)}${session.lastName.slice(0, 1)}`;
  return (letters || session.email.slice(0, 1)).toUpperCase();
}

export function Avatar({
  session,
  className = "",
}: {
  session: LocalSession;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [session.avatarUrl]);
  return (
    <span className={`avatar ${className}`}>
      {session.avatarUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.avatarUrl}
          alt=""
          onError={() => setFailed(true)}
          draggable={false}
        />
      ) : (
        initialsOf(session)
      )}
    </span>
  );
}

function AvatarCropper({
  file,
  onCancel,
  onSave,
}: {
  file: File;
  onCancel: () => void;
  onSave: (blob: Blob) => Promise<void>;
}) {
  const { closing, close } = useModalClose(onCancel);
  const [src, setSrc] = useState("");
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close, busy]);

  const base = natural ? Math.max(VIEW / natural.w, VIEW / natural.h) : 1;
  const scale = base * zoom;

  const clamp = (x: number, y: number, s = scale) => {
    if (!natural) return { x, y };
    const half = VIEW / (2 * s);
    return {
      x: Math.min(Math.max(x, half), natural.w - half),
      y: Math.min(Math.max(y, half), natural.h - half),
    };
  };

  const setZoomKeepCenter = (next: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    setZoom(z);
    setCenter((c) => clamp(c.x, c.y, base * z));
  };

  const pan = (dx: number, dy: number) =>
    setCenter((c) => clamp(c.x - dx / scale, c.y - dy / scale));

  const save = async () => {
    const img = imgRef.current;
    if (!img || !natural || busy) return;
    setBusy(true);
    setError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      const size = VIEW / scale;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        center.x - size / 2,
        center.y - size / 2,
        size,
        size,
        0,
        0,
        OUTPUT,
        OUTPUT,
      );
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("encode");
      await onSave(blob);
      close();
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message !== "canvas" && cause.message !== "encode"
          ? cause.message
          : "Foto gagal diproses. Coba gambar lain.",
      );
      setBusy(false);
    }
  };

  return (
    <ModalFrame closing={closing} onBackdrop={() => !busy && close()}>
      <section
        className="task-dialog cropper-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
      >
        <div className="dialog-kicker">FOTO PROFIL</div>
        <h2 id="crop-title">Atur fotomu</h2>
        <p>Geser untuk memosisikan, lalu atur zoom.</p>
        <div
          className="cropper-view"
          style={{ width: VIEW, height: VIEW }}
          tabIndex={0}
          role="group"
          aria-label="Area potong foto. Gunakan tombol panah untuk menggeser."
          onPointerDown={(event) => {
            drag.current = { x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            pan(event.clientX - drag.current.x, event.clientY - drag.current.y);
            drag.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={(event) => setZoomKeepCenter(zoom - event.deltaY * 0.002)}
          onKeyDown={(event) => {
            const step = 12;
            const moves: Record<string, [number, number]> = {
              ArrowLeft: [step, 0],
              ArrowRight: [-step, 0],
              ArrowUp: [0, step],
              ArrowDown: [0, -step],
            };
            const move = moves[event.key];
            if (move) {
              event.preventDefault();
              pan(move[0], move[1]);
            }
          }}
        >
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={(event) => {
                const img = event.currentTarget;
                setNatural({ w: img.naturalWidth, h: img.naturalHeight });
                setCenter({ x: img.naturalWidth / 2, y: img.naturalHeight / 2 });
              }}
              onError={() => setError("File ini bukan gambar yang valid.")}
              style={
                natural
                  ? {
                      width: natural.w * scale,
                      height: natural.h * scale,
                      left: VIEW / 2 - center.x * scale,
                      top: VIEW / 2 - center.y * scale,
                    }
                  : { visibility: "hidden" }
              }
            />
          )}
          <span className="cropper-mask" aria-hidden="true" />
        </div>
        <div className="cropper-zoom">
          <button
            type="button"
            className="icon-button"
            aria-label="Perkecil"
            onClick={() => setZoomKeepCenter(zoom - 0.25)}
          >
            <FaMinus aria-hidden="true" />
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            aria-label="Zoom"
            onChange={(event) => setZoomKeepCenter(Number(event.target.value))}
          />
          <button
            type="button"
            className="icon-button"
            aria-label="Perbesar"
            onClick={() => setZoomKeepCenter(zoom + 0.25)}
          >
            <FaPlus aria-hidden="true" />
          </button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="button button-soft"
            onClick={close}
            disabled={busy}
          >
            Batal
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={save}
            disabled={busy || !natural}
          >
            {busy ? "Menyimpan…" : "Simpan foto"}
          </button>
        </div>
      </section>
    </ModalFrame>
  );
}

function RemovePhotoDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const { closing, close } = useModalClose(onCancel);
  const dialogRef = useRef<HTMLElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => trigger?.focus();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>("button:not([disabled])")];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, busy]);

  return (
    <ModalFrame closing={closing} onBackdrop={() => !busy && close()}>
      <section
        ref={dialogRef}
        className="task-dialog logout-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-photo-title"
        aria-describedby="remove-photo-desc"
      >
        <div className="dialog-kicker">HAPUS FOTO</div>
        <h2 id="remove-photo-title">Hapus foto profil?</h2>
        <p id="remove-photo-desc">
          Fotomu akan dihapus dan avatar kembali ke inisial. Kamu bisa
          mengunggah foto baru kapan saja.
        </p>
        <div className="dialog-actions">
          <button
            ref={cancelRef}
            type="button"
            className="button button-soft"
            onClick={close}
            disabled={busy}
          >
            Batal
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                close();
              }
            }}
          >
            {busy ? "Menghapus…" : "Ya, hapus"}
          </button>
        </div>
      </section>
    </ModalFrame>
  );
}

export function ProfileSection({
  session,
  onChanged,
  notify,
}: {
  session: LocalSession;
  onChanged: () => Promise<unknown> | void;
  notify: (message: string) => void;
}) {
  const [first, setFirst] = useState(session.firstName);
  const [last, setLast] = useState(session.lastName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<File | null>(null);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFirst(session.firstName);
    setLast(session.lastName);
  }, [session.firstName, session.lastName]);

  const dirty =
    first.trim() !== session.firstName || last.trim() !== session.lastName;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setError("");
    try {
      await updateProfileNames(first, last);
      await onChanged();
      notify("Profil disimpan.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profil gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const onFile = (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("Gunakan gambar PNG, JPG, atau WebP.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Ukuran foto maksimal 2 MB.");
      return;
    }
    setError("");
    setPicked(file);
  };

  const remove = async () => {
    if (removing) return;
    setRemoving(true);
    setError("");
    try {
      await deleteAvatar();
      await onChanged();
      notify("Foto dihapus.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Foto gagal dihapus.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="profile-block">
      <div className="profile-avatar-row">
        <Avatar session={session} className="avatar-xl" />
        <div className="profile-avatar-actions">
          <h2>Foto profil</h2>
          <p>PNG, JPG, atau WebP. Maksimal 2 MB.</p>
          <div className="profile-buttons">
            <button
              type="button"
              className="button button-soft"
              onClick={() => fileRef.current?.click()}
            >
              <FaCamera aria-hidden="true" />{" "}
              <span>{session.avatarUrl ? "Ganti foto" : "Unggah foto"}</span>
            </button>
            {session.avatarUrl && (
              <button
                type="button"
                className="button button-soft"
                onClick={() => setConfirmRemove(true)}
                disabled={removing}
              >
                <FaRegTrashAlt aria-hidden="true" /> <span>Hapus foto</span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(event) => onFile(event.target.files?.[0])}
          />
        </div>
      </div>
      <form className="profile-form" onSubmit={submit} noValidate>
        <label>
          <span>Nama depan</span>
          <input
            value={first}
            maxLength={64}
            autoComplete="given-name"
            onChange={(event) => setFirst(event.target.value)}
          />
        </label>
        <label>
          <span>Nama belakang</span>
          <input
            value={last}
            maxLength={64}
            autoComplete="family-name"
            onChange={(event) => setLast(event.target.value)}
          />
        </label>
        <button
          type="submit"
          className="button button-primary"
          disabled={!dirty || saving}
        >
          {saving ? "Menyimpan…" : "Simpan profil"}
        </button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {confirmRemove && (
        <RemovePhotoDialog
          onCancel={() => setConfirmRemove(false)}
          onConfirm={remove}
        />
      )}
      {picked && (
        <AvatarCropper
          file={picked}
          onCancel={() => setPicked(null)}
          onSave={async (blob) => {
            await uploadAvatar(blob);
            await onChanged();
            notify("Foto diperbarui.");
          }}
        />
      )}
    </div>
  );
}
