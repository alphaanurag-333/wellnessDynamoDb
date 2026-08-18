import { GUIDELINE_BLOCKS } from "../data/guidelinesConfigData.js";
import { LegalSectionsEditor } from "./LegalSectionsEditor.jsx";

export function CommunityGuidelinesSection({ blocks, setBlocks, onToast }) {
  return (
    <LegalSectionsEditor
      slug="community-guideline"
      defaultTitle="Community Guidelines"
      sitePath="irwellness.in/community-guideline"
      noun="guideline section"
      fallbackBlocks={GUIDELINE_BLOCKS}
      blocks={blocks}
      setBlocks={setBlocks}
      onToast={onToast}
    />
  );
}
