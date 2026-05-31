export type ScreenshotPayloadItem = {
    fileName: string;
    mimeType: string;
    base64: string;
  };
  
  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
  
      reader.onload = () => {
        resolve(String(reader.result || ""));
      };
  
      reader.onerror = () => {
        reject(new Error("圖片讀取失敗"));
      };
  
      reader.readAsDataURL(file);
    });
  }
  
  function extractBase64(dataUrl: string) {
    const parts = dataUrl.split(",");
  
    if (parts.length < 2) {
      return "";
    }
  
    return parts[1];
  }
  
  export async function buildScreenshotPayload(
    files: File[]
  ): Promise<ScreenshotPayloadItem[]> {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  
    const payload = await Promise.all(
      imageFiles.map(async (file) => {
        const dataUrl = await readFileAsDataUrl(file);
  
        return {
          fileName: file.name,
          mimeType: file.type,
          base64: extractBase64(dataUrl),
        };
      })
    );
  
    return payload.filter((item) => item.base64 !== "");
  }