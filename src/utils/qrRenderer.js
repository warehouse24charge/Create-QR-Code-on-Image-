import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Cache for generated QR Code Image objects to speed up batch processing
 */
const qrCache = new Map();

/**
 * Generate a QR Code as an Image element
 */
export async function generateQRImage(text, options = {}) {
  const cacheKey = `${text}_${options.errorCorrectionLevel || 'H'}_${options.color?.dark || '#000000'}_${options.color?.light || '#ffffff'}`;
  if (qrCache.has(cacheKey)) {
    return qrCache.get(cacheKey);
  }

  const qrDataUrl = await QRCode.toDataURL(text, {
    errorCorrectionLevel: options.errorCorrectionLevel || 'H',
    margin: options.margin !== undefined ? options.margin : 1,
    width: options.width || 400,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#ffffff'
    }
  });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      qrCache.set(cacheKey, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = qrDataUrl;
  });
}

/**
 * Helper to draw rounded rectangle on canvas context
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    // Fallback for older browsers
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/**
 * Render a single page with template image, QR code, and bottom text onto a canvas
 */
export async function renderPageToCanvas(canvas, templateImage, rowData, qrConfig, textConfig) {
  if (!templateImage || !canvas) return;

  // Ensure fonts are loaded for canvas text rendering
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      // ignore font loading error
    }
  }

  const width = templateImage.naturalWidth || templateImage.width || 723;
  const height = templateImage.naturalHeight || templateImage.height || 1024;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  // 1. Draw base template image
  ctx.drawImage(templateImage, 0, 0, width, height);

  if (!rowData || !rowData.link) return;

  // 2. Generate QR code image
  const qrImg = await generateQRImage(rowData.link, {
    errorCorrectionLevel: qrConfig.errorCorrection || 'H',
    margin: qrConfig.qrMargin !== undefined ? qrConfig.qrMargin : 1,
    color: {
      dark: qrConfig.qrColor || '#000000',
      light: '#ffffff'
    }
  });

  const qrX = qrConfig.x;
  const qrY = qrConfig.y;
  const qrSize = qrConfig.size;
  const padding = qrConfig.cardPadding || 0;
  const borderRadius = qrConfig.borderRadius || 0;

  // Calculate card bounds
  let cardX = qrX - padding;
  let cardY = qrY - padding;
  let cardW = qrSize + padding * 2;
  let cardH = qrSize + padding * 2;

  const showText = textConfig.enabled && rowData.text;
  let textY = qrY + qrSize + (textConfig.spacing || 8);

  // Set text font to measure text width
  const fSize = Math.max(1, textConfig.fontSize !== undefined ? textConfig.fontSize : 15);
  ctx.font = `${textConfig.fontWeight || '600'} ${fSize}px ${textConfig.fontFamily || 'Prompt'}, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  if (showText && qrConfig.envelopText) {
    const metrics = ctx.measureText(rowData.text);
    const textWidth = metrics.width;
    const extraWidthNeeded = Math.max(0, textWidth + padding * 2 - cardW);
    if (extraWidthNeeded > 0) {
      cardX -= extraWidthNeeded / 2;
      cardW += extraWidthNeeded;
    }
    const textHeight = fSize * 1.3;
    cardH = (qrSize + padding * 2) + (textConfig.spacing || 4) + textHeight;
  }

  // 3. Draw Card Background if enabled
  if (qrConfig.hasBg) {
    ctx.save();
    ctx.fillStyle = qrConfig.bgColor || '#ffffff';
    if (qrConfig.boxShadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
    }
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, borderRadius);
    ctx.fill();

    if (qrConfig.borderWidth > 0) {
      ctx.strokeStyle = qrConfig.borderColor || '#e2e8f0';
      ctx.lineWidth = qrConfig.borderWidth;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. Draw QR Code
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // 5. Draw Text below QR Code
  if (showText) {
    ctx.save();
    ctx.font = `${textConfig.fontWeight || '600'} ${fSize}px ${textConfig.fontFamily || 'Prompt'}, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = textConfig.color || '#1e293b';

    // Center text under the QR code
    const centerX = qrX + qrSize / 2;
    ctx.fillText(rowData.text, centerX, textY);
    ctx.restore();
  }
}

/**
 * Render all pages and return data URLs
 */
export async function renderAllPages(templateImage, batchData, qrConfig, textConfig, onProgress) {
  const results = [];
  const offscreenCanvas = document.createElement('canvas');

  for (let i = 0; i < batchData.length; i++) {
    const row = batchData[i];
    await renderPageToCanvas(offscreenCanvas, templateImage, row, qrConfig, textConfig);
    const dataUrl = offscreenCanvas.toDataURL('image/png', 1.0);
    results.push({
      index: i + 1,
      link: row.link,
      text: row.text,
      dataUrl
    });

    if (onProgress) {
      onProgress(i + 1, batchData.length);
    }
  }

  return results;
}

/**
 * Export all pages to a multi-page PDF
 */
export async function exportToPDF(templateImage, batchData, qrConfig, textConfig, onProgress) {
  const width = templateImage.naturalWidth || 723;
  const height = templateImage.naturalHeight || 1024;
  const isLandscape = width > height;

  // A4 dimensions in mm: 210 x 297
  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const offscreenCanvas = document.createElement('canvas');

  for (let i = 0; i < batchData.length; i++) {
    if (i > 0) {
      pdf.addPage();
    }

    const row = batchData[i];
    await renderPageToCanvas(offscreenCanvas, templateImage, row, qrConfig, textConfig);
    const imgData = offscreenCanvas.toDataURL('image/jpeg', 0.95);

    // Calculate aspect fit inside A4 page
    const imgAspect = width / height;
    const pageAspect = pdfWidth / pdfHeight;

    let renderW, renderH, renderX, renderY;
    if (imgAspect > pageAspect) {
      renderW = pdfWidth;
      renderH = pdfWidth / imgAspect;
      renderX = 0;
      renderY = (pdfHeight - renderH) / 2;
    } else {
      renderH = pdfHeight;
      renderW = pdfHeight * imgAspect;
      renderX = (pdfWidth - renderW) / 2;
      renderY = 0;
    }

    pdf.addImage(imgData, 'JPEG', renderX, renderY, renderW, renderH, undefined, 'FAST');

    if (onProgress) {
      onProgress(i + 1, batchData.length);
    }
  }

  pdf.save(`QR_Batch_Pages_${Date.now()}.pdf`);
}

/**
 * Export all pages as images inside a ZIP file
 */
export async function exportToZIP(templateImage, batchData, qrConfig, textConfig, onProgress) {
  const zip = new JSZip();
  const offscreenCanvas = document.createElement('canvas');

  for (let i = 0; i < batchData.length; i++) {
    const row = batchData[i];
    await renderPageToCanvas(offscreenCanvas, templateImage, row, qrConfig, textConfig);

    // Convert canvas to blob
    const blob = await new Promise((resolve) => offscreenCanvas.toBlob(resolve, 'image/png'));
    const safeText = (row.text || `item_${i+1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `page_${String(i + 1).padStart(3, '0')}_${safeText}.png`;

    zip.file(filename, blob);

    if (onProgress) {
      onProgress(i + 1, batchData.length);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `QR_Batch_Images_${Date.now()}.zip`);
}
