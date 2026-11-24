import { useState, useSyncExternalStore } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  experimental_THREAD_ACTION_GROUPS,
  experimental_useRpcMutation,
  ThreadTitle,
  type PluginThreadActionRegistration,
} from "@get-bb/plugin-sdk/app";
import { threadIconContract } from "./thread-icon-contract";
import { ThreadIconGlyph } from "./thread-icon-glyph";
import { threadIconColors, threadIconPickerOptions, threadIcons, type ThreadIcon, type ThreadIconColor, type ThreadIconStyle } from "./thread-icon-options";
import { useThreadIconStylesQuery } from "./thread-icons";

type PickerTarget = { threadId: string; returnFocus: Element | null };
let target: PickerTarget | null = null;
const listeners = new Set<() => void>();

function setTarget(value: PickerTarget | null) {
  target = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const getTarget = () => target;
const colorIds: (ThreadIconColor | null)[] = [null, ...Object.keys(threadIconColors) as ThreadIconColor[]];
const providerDefault = { icon: null, color: null };

export const changeIconAction: PluginThreadActionRegistration = {
  id: "change-icon",
  title: "Change icon",
  icon: "Palette",
  group: experimental_THREAD_ACTION_GROUPS.organize,
  order: 95,
  item: ({ thread }) => ({
    label: "Change icon",
    icon: "Palette",
    run() {
      // Let BB close its menu and return focus to the trigger first.
      requestAnimationFrame(() => setTarget({ threadId: thread.id, returnFocus: document.activeElement }));
    },
  }),
};

function IconPickerForm({ threadId, initial, onSave }: { threadId: string; initial?: ThreadIconStyle; onSave: () => void }) {
  const [draft, setDraft] = useState<{ icon: ThreadIcon | null; color: ThreadIconColor | null }>(initial ?? providerDefault);
  const { mutate, isPending, error, reset } = experimental_useRpcMutation({
    contract: threadIconContract,
    method: "setThreadIcon",
    optimistic({ threadId, icon, color }, cache) {
      cache.update("getThreadIconStyles", null, (current) => {
        const next = { ...current };
        if (icon === null) delete next[threadId];
        else next[threadId] = { icon, color: color === undefined ? current[threadId]?.color ?? null : color };
        return next;
      });
    },
  });
  const saved = initial ?? providerDefault;
  const changed = draft.icon !== saved.icon || (draft.icon !== null && draft.color !== saved.color);
  return (
    <form className="project-section-icon-picker__form" onSubmit={(event) => {
      event.preventDefault();
      if (isPending || !changed) return;
      void mutate({ threadId, icon: draft.icon, color: draft.color }).then(onSave, () => undefined);
    }}>
      {/* The thread is clear from where the picker was opened; screen readers still hear its title. */}
      <Dialog.Description className="project-section-icon-picker__sr-only"><ThreadTitle threadId={threadId} /></Dialog.Description>
      <fieldset className="project-section-icon-picker__grid" aria-label="Icon" disabled={isPending}>
        {threadIconPickerOptions.map((icon) => (
          <label key={icon} className="project-section-icon-picker__tile" title={threadIcons[icon]}>
            <input type="radio" name="thread-icon" value={icon} aria-label={threadIcons[icon]} checked={draft.icon === icon}
              onChange={() => { reset(); setDraft({ ...draft, icon }); }} />
            <ThreadIconGlyph icon={icon} color={draft.color} />
          </label>
        ))}
      </fieldset>
      <fieldset className="project-section-icon-picker__colors" disabled={isPending}>
        <legend>Color</legend>
        <div className="project-section-icon-picker__swatches">
          {colorIds.map((color) => {
            const label = color ? threadIconColors[color].label : "Default gray";
            // Without a colour the sidebar draws the icon in --muted-foreground, so the swatch shows exactly that.
            const css = color ? threadIconColors[color].css : "var(--muted-foreground)";
            return (
              <label key={color ?? "default"} className="project-section-icon-picker__tile" title={label} style={{ color: css }}>
                <input type="radio" name="thread-icon-color" value={color ?? "default"} aria-label={label} checked={draft.color === color}
                  onChange={() => { reset(); setDraft({ ...draft, color }); }} />
                <span className="project-section-icon-picker__swatch" style={{ backgroundColor: css }} />
              </label>
            );
          })}
        </div>
      </fieldset>
      {error && <p className="project-section-folder__error" role="alert">Couldn’t save the icon. Try again.</p>}
      <div className="project-section-icon-picker__footer">
        <button className="project-section-icon-picker__reset" type="button" disabled={isPending || draft.icon === null}
          onClick={() => { reset(); setDraft(providerDefault); }}>Provider default</button>
        <Dialog.Close asChild><button type="button">Cancel</button></Dialog.Close>
        <button className="project-section-icon-picker__save" type="submit" disabled={!changed || isPending}>{isPending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

function IconPicker({ current }: { current: PickerTarget }) {
  const { threadId, returnFocus } = current;
  const styles = useThreadIconStylesQuery();
  const close = () => { if (target === current) setTarget(null); };

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) close(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="project-section-icon-picker__overlay" />
        <Dialog.Content className="project-section-icon-picker" onCloseAutoFocus={(event) => {
          if (returnFocus instanceof HTMLElement && returnFocus.isConnected && returnFocus !== document.body) {
            event.preventDefault();
            returnFocus.focus({ preventScroll: true });
          }
        }}>
          <Dialog.Title>Change icon</Dialog.Title>
          {styles.data ? (
            <IconPickerForm threadId={threadId} initial={styles.data[threadId]} onSave={close} />
          ) : (
            <Dialog.Description>{styles.error ? "Couldn’t load the current icon. Reopen to try again." : "Loading…"}</Dialog.Description>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ThreadIconPickerOverlay() {
  const current = useSyncExternalStore(subscribe, getTarget);
  return current ? <IconPicker key={current.threadId} current={current} /> : null;
}
