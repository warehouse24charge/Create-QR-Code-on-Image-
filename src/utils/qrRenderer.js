import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Cache for generated QR Code Image objects to speed up batch processing
 */
const qrCache = new Map();

/**
 * Generate a high-resolution QR Code as an Image element
 */
export async function generateQRImage(text, options = {}) {
  const targetWidth = Math.max(options.width || 800, 800);
  const cacheKey = `${text}_${options.errorCorrectionLevel || 'H'}_${options.color?.dark || '#000000'}_${options.color?.light || '#ffffff'}_${targetWidth}`;
  if (qrCache.has(cacheKey)) {
    return qrCache.get(cacheKey);
  }

  const qrDataUrl = await QRCode.toDataURL(text, {
    errorCorrectionLevel: options.errorCorrectionLevel || 'H',
    margin: options.margin !== undefined ? options.margin : 1,
    width: targetWidth,
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
 * Render a single page with full original sharpness or high-definition scaling (Super-Sampling)
 * @param {HTMLCanvasElement} canvas Target canvas
 * @param {HTMLImageElement} templateImage Source template image
 * @param {Object} rowData { link, text }
 * @param {Object} qrConfig QR placement & style
 * @param {Object} textConfig Text style
 * @param {number} scale Resolution multiplier (1 = original size, 2 = 2x HD, 3 = 3x Ultra HD 300 DPI)
 */
export async function renderPageToCanvas(canvas, templateImage, rowData, qrConfig, textConfig, scale = 1) {
  if (!templateImage || !canvas) return;

  // Ensure web fonts are ready for crisp text rendering
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      // ignore
    }
  }

  const baseW = templateImage.naturalWidth || templateImage.width || 723;
  const baseH = templateImage.naturalHeight || templateImage.height || 1024;

  const width = Math.round(baseW * scale);
  const height = Math.round(baseH * scale);

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  // Use highest-quality image smoothing for the base poster image
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Draw base template image at full resolution
  ctx.drawImage(templateImage, 0, 0, width, height);

  if (!rowData || !rowData.link) return;

  // Scale all coordinates proportionally
  const qrX = Math.round(qrConfig.x * scale);
  const qrY = Math.round(qrConfig.y * scale);
  const qrSize = Math.round(qrConfig.size * scale);
  const padding = Math.round((qrConfig.cardPadding || 0) * scale);
  const borderRadius = Math.round((qrConfig.borderRadius || 0) * scale);

  // 2. Generate high-resolution QR code
  const qrImg = await generateQRImage(rowData.link, {
    errorCorrectionLevel: qrConfig.errorCorrection || 'H',
    margin: qrConfig.qrMargin !== undefined ? qrConfig.qrMargin : 1,
    width: Math.max(qrSize, 800),
    color: {
      dark: qrConfig.qrColor || '#000000',
      light: '#ffffff'
    }
  });

  // Calculate card bounds
  let cardX = qrX - padding;
  let cardY = qrY - padding;
  let cardW = qrSize + padding * 2;
  let cardH = qrSize + padding * 2;

  const showText = textConfig.enabled && rowData.text;
  const fSize = Math.max(1, textConfig.fontSize !== undefined ? textConfig.fontSize : 15) * scale;
  const spacing = (textConfig.spacing !== undefined ? textConfig.spacing : 4) * scale;
  let textY = qrY + qrSize + spacing;

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
    cardH = (qrSize + padding * 2) + spacing + textHeight;
  }

  // 3. Draw Card Background if enabled
  if (qrConfig.hasBg) {
    ctx.save();
    ctx.fillStyle = qrConfig.bgColor || '#ffffff';
    if (qrConfig.boxShadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 10 * scale;
      ctx.shadowOffsetY = 4 * scale;
    }
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, borderRadius);
    ctx.fill();

    if (qrConfig.borderWidth > 0) {
      ctx.strokeStyle = qrConfig.borderColor || '#e2e8f0';
      ctx.lineWidth = qrConfig.borderWidth * scale;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. Draw QR Code with crisp, pixel-perfect edges (no blurry smoothing on QR pixels)
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  ctx.restore();

  // 5. Draw Text below QR Code with crystal clear rendering
  if (showText) {
    ctx.save();
    ctx.font = `${textConfig.fontWeight || '600'} ${fSize}px ${textConfig.fontFamily || 'Prompt'}, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = textConfig.color || '#1e293b';

    const centerX = qrX + qrSize / 2;
    ctx.fillText(rowData.text, centerX, textY);
    ctx.restore();
  }
}

/**
 * Render all pages and return data URLs at high definition
 */
export async function renderAllPages(templateImage, batchData, qrConfig, textConfig, onProgress, scale = 2) {
  const results = [];
  const offscreenCanvas = document.createElement('canvas');

  for (let i = 0; i < batchData.length; i++) {
    const row = batchData[i];
    await renderPageToCanvas(offscreenCanvas, templateImage, row, qrConfig, textConfig, scale);
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
 * Export all pages to a multi-page PDF with 100% lossless PNG quality
 */
export async function exportToPDF(templateImage, batchData, qrConfig, textConfig, onProgress, scale = 2) {
  const baseW = templateImage.naturalWidth || 723;
  const baseH = templateImage.naturalHeight || 1024;
  const isLandscape = baseW > baseH;

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
    // Render at high resolution
    await renderPageToCanvas(offscreenCanvas, templateImage, row, qrConfig, textConfig, scale);

    // Use lossless PNG to preserve 100% original sharpness without JPEG compression artifacts
    const imgData = offscreenCanvas.toDataURL('image/png');

    // Calculate aspect fit inside A4 page
    const imgAspect = baseW / baseH;
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

    // Use SLOW for highest quality lossless image embedding in jsPDF
    pdf.addImage(imgData, 'PNG', renderX, renderY, renderW, renderH, undefined, 'SLOW');

    if (onProgress) {
      onProgress(i + 1, batchData.length);
    }
  }

  pdf.save(`QR_Batch_Pages_HQ_${Date.now()}.pdf`);
}

/**
 * Export all pages as high-resolution PNG images inside a ZIP file
 */
export async function exportToZIP(templateImage, batchData, qrConfig, textConfig, onProgress, scale = 2) {
  const zip = new JSZip();
  const offscreenCanvas = document.createElement('canvas');

  for (let i = 0; i < batchData.length; i++) {
    const row = batchData[i];
    await renderPageToCanvas(offscreenCanvas, templateImage, row, qrConfig, textConfig, scale);

    // Convert canvas to lossless PNG blob
    const blob = await new Promise((resolve) => offscreenCanvas.toBlob(resolve, 'image/png', 1.0));
    const safeText = (row.text || `item_${i+1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `page_${String(i + 1).padStart(3, '0')}_${safeText}.png`;

    zip.file(filename, blob);

    if (onProgress) {
      onProgress(i + 1, batchData.length);
    }
  }

  const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  saveAs(content, `QR_Batch_Images_HQ_${Date.now()}.zip`);
}
