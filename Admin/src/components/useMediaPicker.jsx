import { useCallback, useRef, useState } from "react";
import { attachMediaAsset } from "../api/mediaAssetApi.js";
import { MediaPickerModal } from "./MediaPickerModal.jsx";

/**
 * Shared media-picker flow for config sections.
 * openPicker(context?) opens the modal; onFiles(filesOrFile, context, assets) continues the existing upload/crop path.
 */
export function useMediaPicker({
  accept = "image",
  multiple = false,
  title = "Choose media",
  cropImages = true,
  cropWidth,
  cropHeight,
  showFrameworks = false,
  onFiles,
  onError,
}) {
  const [open, setOpen] = useState(false);
  const contextRef = useRef(null);

  const openPicker = useCallback((context = null) => {
    contextRef.current = context;
    setOpen(true);
  }, []);

  const closePicker = useCallback(() => {
    setOpen(false);
    contextRef.current = null;
  }, []);

  const handleConfirm = useCallback(
    async (assets) => {
      const context = contextRef.current;
      try {
        const files = await Promise.all(assets.map((asset) => attachMediaAsset(asset)));
        await onFiles?.(multiple ? files : files[0], context, assets);
      } catch (error) {
        onError?.(error);
        throw error;
      }
    },
    [multiple, onFiles, onError]
  );

  const modal = (
    <MediaPickerModal
      open={open}
      onClose={closePicker}
      onConfirm={handleConfirm}
      accept={accept}
      multiple={multiple}
      title={title}
      cropImages={cropImages}
      cropWidth={cropWidth}
      cropHeight={cropHeight}
      showFrameworks={showFrameworks}
    />
  );

  return { openPicker, closePicker, pickerOpen: open, mediaPickerModal: modal };
}
