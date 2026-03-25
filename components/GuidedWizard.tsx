"use client";

/**
 * GuidedWizard is now consolidated into WizardOverlay.
 * This file re-exports WizardOverlay for backwards compatibility.
 *
 * Usage: <GuidedWizard onDismiss={...} onComplete={...} />
 * maps to: <WizardOverlay showWelcome={false} onDone={onDismiss} onComplete={onComplete} />
 */

import type { DataType } from "@/lib/types";
import WizardOverlay from "./WizardOverlay";

interface GuidedWizardProps {
  onComplete: (params: { text: string; dataType: DataType; projectContext: string }) => void;
  onDismiss: () => void;
}

export default function GuidedWizard({ onComplete, onDismiss }: GuidedWizardProps) {
  return (
    <WizardOverlay
      showWelcome={false}
      onDone={onDismiss}
      onComplete={onComplete}
    />
  );
}
