import { useEffect } from 'preact/hooks';

interface UseControlsOptions {
  enabled: boolean;
  selectedSlotIndex: number;
  onSelectSlot: (slotIndex: number) => void;
  onActivateSlot: (slotIndex: number) => void;
  onCancel: () => void;
}

export const useControls = ({
  enabled,
  selectedSlotIndex,
  onSelectSlot,
  onActivateSlot,
  onCancel
}: UseControlsOptions) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      let nextIndex = selectedSlotIndex;

      if (event.key === 'ArrowRight') {
        nextIndex = Math.min(39, selectedSlotIndex + 1);
      }

      if (event.key === 'ArrowLeft') {
        nextIndex = Math.max(0, selectedSlotIndex - 1);
      }

      if (event.key === 'ArrowUp') {
        nextIndex = Math.max(0, selectedSlotIndex - 10);
      }

      if (event.key === 'ArrowDown') {
        nextIndex = Math.min(39, selectedSlotIndex + 10);
      }

      if (nextIndex !== selectedSlotIndex) {
        event.preventDefault();
        onSelectSlot(nextIndex);
        return;
      }

      if (event.key === 'Enter') {
        const active = document.activeElement as HTMLElement | null;
        if (!active || active.hasAttribute('data-slot-index')) {
          event.preventDefault();
          onActivateSlot(selectedSlotIndex);
        }
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onActivateSlot, onCancel, onSelectSlot, selectedSlotIndex]);
};
