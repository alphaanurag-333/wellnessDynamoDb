import { PRIVACY_BLOCKS } from "../data/privacyConfigData.js";
import { LegalSectionsEditor } from "./LegalSectionsEditor.jsx";

export function PrivacyPolicySection({ blocks, setBlocks, onToast }) {
  return (
    <LegalSectionsEditor
      slug="privacy-policy"
      defaultTitle="Privacy Policy"
      sitePath="irwellness.in/privacy-policy"
      noun="privacy section"
      fallbackBlocks={PRIVACY_BLOCKS}
      blocks={blocks}
      setBlocks={setBlocks}
      onToast={onToast}
    />
  );
}
