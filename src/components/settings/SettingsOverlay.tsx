'use client';

import { useSettingsUI } from '@/client/settingsUI';
import { Modal } from '@/components/ui/Modal';
import { SettingsPanel } from './SettingsPanel';

export function SettingsOverlay() {
  const open = useSettingsUI((s) => s.open);
  const hide = useSettingsUI((s) => s.hide);
  return (
    <Modal open={open} onClose={hide} title="Settings" expansive>
      <div className="settings-body"><SettingsPanel /></div>
    </Modal>
  );
}
