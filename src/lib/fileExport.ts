import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

declare global {
  interface Window {
    AndroidNativeBridge?: {
      printHtml: (html: string, docName: string) => void;
      shareImage: (base64Data: string, fileName: string, title: string, text: string) => void;
      saveImageToGallery: (base64Data: string, fileName: string) => void;
    };
  }
}

/**
 * Converts a base64 Data URL into a binary Blob.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const byteString = atob(parts[1] || parts[0]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new Blob([uint8Array], { type: mime });
}

/**
 * Directly downloads and saves an image file across Web and Native Android/iOS.
 */
export async function downloadImageFile(
  dataUrl: string,
  fileName: string
): Promise<{ success: boolean; path?: string }> {
  // 1. Android Native Bridge: Save directly to Android Pictures/Gallery
  if (typeof window !== 'undefined' && window.AndroidNativeBridge?.saveImageToGallery) {
    try {
      window.AndroidNativeBridge.saveImageToGallery(dataUrl, fileName);
      return { success: true };
    } catch (bridgeErr) {
      console.warn('AndroidNativeBridge saveImageToGallery failed, falling back:', bridgeErr);
    }
  }

  // 2. Capacitor Native Filesystem
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

      const savedCacheFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      try {
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
      } catch (_) {}

      console.log('✅ Image saved to Android storage:', savedCacheFile.uri);
      return { success: true, path: savedCacheFile.uri };
    } catch (err) {
      console.warn('Native Android write failed, using browser blob fallback:', err);
    }
  }

  // 3. Web Browser Standard Download via Blob Object URL
  try {
    const blob = dataUrlToBlob(dataUrl);
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = blobUrl;
    link.target = '_self';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 1000);

    return { success: true };
  } catch (err) {
    console.error('Error downloading image:', err);
    throw err;
  }
}

/**
 * Shares an image file via native sharing sheet or Web Share API with multi-tier fallback.
 */
export async function shareImageFile(
  dataUrl: string,
  fileName: string,
  dialogTitle = 'Dishgaze QR / Receipt',
  textMessage?: string
): Promise<boolean> {
  // 1. Android Native Bridge (Guaranteed native ACTION_SEND with FileProvider)
  if (typeof window !== 'undefined' && window.AndroidNativeBridge?.shareImage) {
    try {
      window.AndroidNativeBridge.shareImage(
        dataUrl,
        fileName,
        dialogTitle,
        textMessage || `${dialogTitle} - ${fileName}`
      );
      return true;
    } catch (bridgeErr) {
      console.warn('AndroidNativeBridge shareImage failed, trying Capacitor Share:', bridgeErr);
    }
  }

  // 2. Capacitor Native Sharing (Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      try {
        await Share.share({
          title: dialogTitle,
          text: textMessage || `${dialogTitle} - ${fileName}`,
          files: [savedFile.uri],
          dialogTitle: `Share ${dialogTitle}`,
        });
        return true;
      } catch (filesErr) {
        console.warn('Share.files failed, trying Share.url:', filesErr);
        await Share.share({
          title: dialogTitle,
          text: textMessage || `${dialogTitle} - ${fileName}`,
          url: savedFile.uri,
          dialogTitle: `Share ${dialogTitle}`,
        });
        return true;
      }
    } catch (err) {
      console.warn('Native Android Share failed, fallback to Web Share:', err);
    }
  }

  // 3. Web Share API with File Support
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const blob = dataUrlToBlob(dataUrl);
      const file = new File([blob], fileName, { type: blob.type || 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: dialogTitle,
          text: textMessage || `${dialogTitle}`,
        });
        return true;
      }
    } catch (shareErr: any) {
      if (shareErr.name !== 'AbortError') {
        console.warn('Web Share files failed, trying URL/text share:', shareErr);
      } else {
        return true;
      }
    }

    // 4. Web Share API with text only (if files not supported)
    if (textMessage) {
      try {
        await navigator.share({
          title: dialogTitle,
          text: textMessage,
        });
        return true;
      } catch (textShareErr: any) {
        if (textShareErr.name !== 'AbortError') {
          console.warn('Web Share text failed:', textShareErr);
        } else {
          return true;
        }
      }
    }
  }

  // 5. Fallback: Download file automatically
  await downloadImageFile(dataUrl, fileName);
  return true;
}

/**
 * Robust clipboard copy helper working across Web and Mobile
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard failed, using fallback:', err);
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}

/**
 * 1-Tap WhatsApp Share Helper
 */
export function openWhatsAppShare(text: string, phone = ''): void {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(text);
  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * In-App Printing: Uses Android Native PrintManager on Mobile and Iframe Printing on Web
 */
export function printIframeHtml(htmlContent: string, title = 'Dishgaze Print'): void {
  // 1. Android Native Bridge: Opens Android System Print Dialog
  if (typeof window !== 'undefined' && window.AndroidNativeBridge?.printHtml) {
    try {
      window.AndroidNativeBridge.printHtml(htmlContent, title);
      return;
    } catch (bridgeErr) {
      console.warn('AndroidNativeBridge printHtml failed, trying iframe print:', bridgeErr);
    }
  }

  // 2. Web Browser Iframe Print
  const existingIframe = document.getElementById('resto-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'resto-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '100%';
  iframe.style.bottom = '100%';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print failed, calling window.print():', e);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          iframe.remove();
        }
      }, 3000);
    }
  }, 350);
}

/**
 * Downloads a CSV string file across Web and Native Android
 */
export async function downloadCsvFile(
  csvContent: string,
  fileName: string
): Promise<{ success: boolean; message?: string }> {
  if (Capacitor.isNativePlatform()) {
    try {
      const utf8Bytes = new TextEncoder().encode(csvContent);
      let binary = '';
      for (let i = 0; i < utf8Bytes.byteLength; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
      }
      const base64Csv = btoa(binary);

      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Csv,
        directory: Directory.Cache,
        recursive: true,
      });

      try {
        await Filesystem.writeFile({
          path: fileName,
          data: base64Csv,
          directory: Directory.Documents,
          recursive: true,
        });
      } catch (_) {}

      console.log('✅ CSV report saved to Android Cache:', savedFile.uri);
      return { success: true, message: `Report saved: ${fileName}` };
    } catch (err) {
      console.warn('Native Android CSV write failed, attempting browser fallback:', err);
    }
  }

  // Web Browser Standard Blob CSV Download
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (err) {
    console.error('Error downloading CSV file:', err);
    throw err;
  }
}
