import { TOS_BLOCKS } from "../data/tosConfigData.js";
import { LegalSectionsEditor } from "./LegalSectionsEditor.jsx";

export function TermsAndConditionsSection({ blocks, setBlocks, onToast }) {
  return (
    <LegalSectionsEditor
      slug="terms-and-conditions"
      defaultTitle="Terms and Conditions"
      sitePath="irwellness.in/terms-and-conditions"
      noun="terms section"
      fallbackBlocks={TOS_BLOCKS}
      blocks={blocks}
      setBlocks={setBlocks}
      onToast={onToast}
    />
  );
}
