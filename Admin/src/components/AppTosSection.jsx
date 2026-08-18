import { APP_TOS_BLOCKS } from "../data/configDetailData.js";
import { LegalSectionsEditor } from "./LegalSectionsEditor.jsx";

export function AppTosSection({ blocks, setBlocks, onToast }) {
  return (
    <LegalSectionsEditor
      slug="app-tos"
      defaultTitle="Terms of Service"
      sitePath="the IRW app"
      noun="terms section"
      fallbackBlocks={APP_TOS_BLOCKS}
      blocks={blocks}
      setBlocks={setBlocks}
      onToast={onToast}
    />
  );
}
