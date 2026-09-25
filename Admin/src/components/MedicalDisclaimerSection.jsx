import { MEDICAL_DISCLAIMER_BLOCKS } from "../data/medicalDisclaimerConfigData.js";
import { LegalSectionsEditor } from "./LegalSectionsEditor.jsx";

export function MedicalDisclaimerSection({
  blocks,
  setBlocks,
  onToast,
  registerPublishHandler,
  onLocalChange,
}) {
  return (
    <LegalSectionsEditor
      slug="medical-disclaimer"
      defaultTitle="Medical Disclaimer"
      sitePath="irwellness.in/medical-disclaimer"
      noun="disclaimer section"
      fallbackBlocks={MEDICAL_DISCLAIMER_BLOCKS}
      blocks={blocks}
      setBlocks={setBlocks}
      onToast={onToast}
      registerPublishHandler={registerPublishHandler}
      onLocalChange={onLocalChange}
    />
  );
}
