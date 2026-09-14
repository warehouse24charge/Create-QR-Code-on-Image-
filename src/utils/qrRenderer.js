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
 * Calculate the exact scale factor to achieve 600 DPI on standard A4 paper (210mm x 297mm)
 * 1 inch = 25.4mm
 * Width at 600 DPI = (210 / 25.4) * 600 ≈ 4,960 px
 * Height at 600 DPI = (297 / 25.4) * 600 ≈ 7,016 px
 */
export function get600DpiScale(templateImage) {
  if (!templateImage) return 4;
  const baseW = templateImage.naturalWidth || templateImage.width || 723;
  const baseH = templateImage.naturalHeight || templateImage.height || 1024;
  const isLandscape = baseW > baseH;
  const targetW = isLandscape ? 7016 : 4960;
  const scale = targetW / baseW;
  return Math.max(1, Math.min(8, Number(scale.toFixed(2))));
}

/**
 * Automatically determine the optimal rendering scale to ensure quality is equal to the original or even better
 * (300 to 600 DPI print quality, crystal clear vector text and sharp QR modules)
 */
export function getOptimalScale(templateImage) {
  return get600DpiScale(templateImage);
}

/**
 * Render a single page with full original sharpness or high-definition scaling (Super-Sampling)
 * @param {HTMLCanvasElement} canvas Target canvas
 * @param {HTMLImageElement} templateImage Source template image
 * @param {Object} rowData { link, text }
 * @param {Object} qrConfig QR placement & style
 * @param {Object} textConfig Text style
 * @param {number} [scale] Optional resolution multiplier. If omitted, automatically uses optimal scale.
 */
export async function renderPageToCanvas(canvas, templateImage, rowData, qrConfig, textConfig, scale) {
  if (!templateImage || !canvas) return;

  // Ensure web fonts are ready for crisp text rendering
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      // ignore
    }
  }

  const actualScale = typeof scale === 'number' && scale > 0 ? scale : getOptimalScale(templateImage);

  const baseW = templateImage.naturalWidth || templateImage.width || 723;
  const baseH = templateImage.naturalHeight || templateImage.height || 1024;

  const width = Math.round(baseW * actualScale);
  const height = Math.round(baseH * actualScale);

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
  const qrX = Math.round(qrConfig.x * actualScale);
  const qrY = Math.round(qrConfig.y * actualScale);
  const qrSize = Math.round(qrConfig.size * actualScale);
  const padding = Math.round((qrConfig.cardPadding || 0) * actualScale);
  const borderRadius = Math.round((qrConfig.borderRadius || 0) * actualScale);

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
  const fSize = Math.max(1, textConfig.fontSize !== undefined ? textConfig.fontSize : 15) * actualScale;
  const spacing = (textConfig.spacing !== undefined ? textConfig.spacing : 4) * actualScale;
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
      ctx.shadowBlur = 10 * actualScale;
      ctx.shadowOffsetY = 4 * actualScale;
    }
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, borderRadius);
    ctx.fill();

    if (qrConfig.borderWidth > 0) {
      ctx.strokeStyle = qrConfig.borderColor || '#e2e8f0';
      ctx.lineWidth = qrConfig.borderWidth * actualScale;
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
 * Render only the dynamic QR card and text overlay to an offscreen canvas.
 * This is used for ultra-efficient, memory-safe PDF export where the template
 * background is embedded only once as a shared resource.
 */
export async function renderQROverlayToCanvas(canvas, rowData, qrConfig, textConfig, actualScale, baseW, baseH) {
  if (!rowData || !rowData.link || !canvas) return null;

  // Ensure web fonts are ready for crisp text rendering
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      // ignore
    }
  }

  // Scaled coordinates
  const qrX = Math.round(qrConfig.x * actualScale);
  const qrY = Math.round(qrConfig.y * actualScale);
  const qrSize = Math.round(qrConfig.size * actualScale);
  const padding = Math.round((qrConfig.cardPadding || 0) * actualScale);
  const borderRadius = Math.round((qrConfig.borderRadius || 0) * actualScale);
  const borderWidth = Math.round((qrConfig.borderWidth || 0) * actualScale);

  // Generate QR code image (cached)
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

  const showText = textConfig.enabled && rowData && rowData.text;
  const fSize = Math.max(1, textConfig.fontSize !== undefined ? textConfig.fontSize : 15) * actualScale;
  const spacing = (textConfig.spacing !== undefined ? textConfig.spacing : 4) * actualScale;
  const textY = qrY + qrSize + spacing;

  let textWidth = 0;
  const textHeight = fSize * 1.3;

  if (showText) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${textConfig.fontWeight || '600'} ${fSize}px ${textConfig.fontFamily || 'Prompt'}, sans-serif`;
    textWidth = tempCtx.measureText(rowData.text).width;

    if (qrConfig.envelopText) {
      const extraWidthNeeded = Math.max(0, textWidth + padding * 2 - cardW);
      if (extraWidthNeeded > 0) {
        cardX -= extraWidthNeeded / 2;
        cardW += extraWidthNeeded;
      }
      cardH = (qrSize + padding * 2) + spacing + textHeight;
    }
  }

  const centerX = qrX + qrSize / 2;

  // Determine bounding box in scaled pixels
  let minX = cardX;
  let maxX = cardX + cardW;
  let minY = cardY;
  let maxY = cardY + cardH;

  if (showText) {
    minX = Math.min(minX, centerX - textWidth / 2);
    maxX = Math.max(maxX, centerX + textWidth / 2);
    maxY = Math.max(maxY, textY + textHeight);
  }

  // Margin for shadows / borders / anti-aliasing
  const shadowMargin = (qrConfig.hasBg && qrConfig.boxShadow) ? Math.round(25 * actualScale) : Math.round(6 * actualScale);
  minX -= shadowMargin;
  minY -= shadowMargin;
  maxX += shadowMargin;
  maxY += shadowMargin;

  const fullW = Math.round(baseW * actualScale);
  const fullH = Math.round(baseH * actualScale);

  // Clamp bounding box to full canvas bounds
  minX = Math.max(0, Math.floor(minX));
  minY = Math.max(0, Math.floor(minY));
  maxX = Math.min(fullW, Math.ceil(maxX));
  maxY = Math.min(fullH, Math.ceil(maxY));

  const bboxW = Math.max(1, maxX - minX);
  const bboxH = Math.max(1, maxY - minY);

  canvas.width = bboxW;
  canvas.height = bboxH;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, bboxW, bboxH);

  ctx.save();
  ctx.translate(-minX, -minY);

  // 1. Draw Card Background if enabled
  if (qrConfig.hasBg) {
    ctx.save();
    ctx.fillStyle = qrConfig.bgColor || '#ffffff';
    if (qrConfig.boxShadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 10 * actualScale;
      ctx.shadowOffsetY = 4 * actualScale;
    }
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, borderRadius);
    ctx.fill();

    if (borderWidth > 0) {
      ctx.strokeStyle = qrConfig.borderColor || '#e2e8f0';
      ctx.lineWidth = borderWidth;
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2. Draw QR Code with crisp pixel-perfect edges
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  ctx.restore();

  // 3. Draw Text below QR Code
  if (showText) {
    ctx.save();
    ctx.font = `${textConfig.fontWeight || '600'} ${fSize}px ${textConfig.fontFamily || 'Prompt'}, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = textConfig.color || '#1e293b';
    ctx.fillText(rowData.text, centerX, textY);
    ctx.restore();
  }

  ctx.restore();

  return {
    bbox: {
      minX,
      minY,
      w: bboxW,
      h: bboxH
    }
  };
}

/**
 * Render all pages and return data URLs for screen preview
 */
export async function renderAllPages(templateImage, batchData, qrConfig, textConfig, onProgress, scale = 1.5) {
  const actualScale = typeof scale === 'number' && scale > 0 ? scale : 1.5;
  const results = [];
  const offscreenCanvas = document.createElement('canvas');

  for (let i = 0; i < batchData.length; i++) {
    const row = batchData[i];
    await renderPageToCanvas(offscreenCanvas, templateImage, row, qrConfig, textConfig, actualScale);
    const dataUrl = offscreenCanvas.toDataURL('image/png', 0.95);
    results.push({
      index: i + 1,
      link: row.link,
      text: row.text,
      dataUrl
    });

    if (onProgress) {
      onProgress(i + 1, batchData.length, `กำลังโหลดพรีวิวหน้า ${i + 1} / ${batchData.length}...`);
    }

    // Yield to the browser event loop so UI paints progress
    await new Promise((resolve) => setTimeout(resolve, 15));
  }

  offscreenCanvas.width = 1;
  offscreenCanvas.height = 1;
  return results;
}

/**
 * Export all pages to a multi-page PDF with 600 DPI ultra-high print quality.
 * Uses shared background template XObject to prevent memory exhaustion / "Invalid string length" errors,
 * while rendering QR code cards and text at full 600 DPI precision.
 */
export async function exportToPDF(templateImage, batchData, qrConfig, textConfig, onProgress, scale) {
  const actualScale = typeof scale === 'number' && scale > 0 ? scale : get600DpiScale(templateImage);
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

  // Aspect fit inside A4 page
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

  if (onProgress) {
    onProgress(0, batchData.length, 'กำลังเตรียมภาพพื้นหลังความละเอียดสูง 600 DPI...');
  }

  // 1. Prepare high-resolution 600 DPI background template once
  const fullW = Math.round(baseW * actualScale);
  const fullH = Math.round(baseH * actualScale);
  const templateCanvas = document.createElement('canvas');
  templateCanvas.width = fullW;
  templateCanvas.height = fullH;
  const tCtx = templateCanvas.getContext('2d');
  tCtx.imageSmoothingEnabled = true;
  tCtx.imageSmoothingQuality = 'high';
  // Fill white in case template has any transparent areas
  tCtx.fillStyle = '#ffffff';
  tCtx.fillRect(0, 0, fullW, fullH);
  tCtx.drawImage(templateImage, 0, 0, fullW, fullH);

  // Convert to high-quality JPEG (quality 0.95 produces crisp visuals with fast encoding)
  const templateDataUrl = templateCanvas.toDataURL('image/jpeg', 0.95);
  templateCanvas.width = 1;
  templateCanvas.height = 1;

  const overlayCanvas = document.createElement('canvas');

  for (let i = 0; i < batchData.length; i++) {
    if (i > 0) {
      pdf.addPage();
    }

    if (onProgress) {
      onProgress(i + 1, batchData.length, `กำลังสร้างหน้า ${i + 1} / ${batchData.length} (ความละเอียด 600 DPI)...`);
    }

    // Critical: yield to event loop so the progress bar updates and browser stays responsive
    await new Promise((resolve) => setTimeout(resolve, 20));

    // 2. Add shared background template image (first page embeds XObject, subsequent pages reuse with ~0 memory)
    pdf.addImage(templateDataUrl, 'JPEG', renderX, renderY, renderW, renderH, 'TEMPLATE_BG', 'FAST');

    const row = batchData[i];
    // 3. Render only the QR Card & text overlay at 600 DPI
    const overlay = await renderQROverlayToCanvas(overlayCanvas, row, qrConfig, textConfig, actualScale, baseW, baseH);
    if (overlay && overlay.bbox && overlay.bbox.w > 0 && overlay.bbox.h > 0) {
      const overlayDataUrl = overlayCanvas.toDataURL('image/png');
      const pdfOverlayX = renderX + (overlay.bbox.minX / fullW) * renderW;
      const pdfOverlayY = renderY + (overlay.bbox.minY / fullH) * renderH;
      const pdfOverlayW = (overlay.bbox.w / fullW) * renderW;
      const pdfOverlayH = (overlay.bbox.h / fullH) * renderH;

      pdf.addImage(overlayDataUrl, 'PNG', pdfOverlayX, pdfOverlayY, pdfOverlayW, pdfOverlayH, undefined, 'FAST');
    }
  }

  overlayCanvas.width = 1;
  overlayCanvas.height = 1;

  if (onProgress) {
    onProgress(batchData.length, batchData.length, 'กำลังบันทึกไฟล์ PDF 600 DPI...');
  }
  await new Promise((resolve) => setTimeout(resolve, 50));

  pdf.save(`QR_Batch_Pages_600DPI_${Date.now()}.pdf`);
}

/**
 * Export all pages as 600 DPI PNG images inside a ZIP file
 */
export async function exportToZIP(templateImage, batchData, qrConfig, textConfig, onProgress, scale) {
  const actualScale = typeof scale === 'number' && scale > 0 ? scale : get600DpiScale(templateImage);
  const zip = new JSZip();
  const offscreenCanvas = document.createElement('canvas');

  for (let i = 0; i < batchData.length; i++) {
    if (onProgress) {
      onProgress(i + 1, batchData.length, `กำลังเรนเดอร์ภาพหน้า ${i + 1} / ${batchData.length} (600 DPI)...`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));

    const row = batchData[i];
    await renderPageToCanvas(offscreenCanvas, templateImage, row, qrConfig, textConfig, actualScale);

    // Convert canvas to lossless PNG blob
    const blob = await new Promise((resolve) => offscreenCanvas.toBlob(resolve, 'image/png', 1.0));
    const safeText = (row.text || `item_${i+1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `page_${String(i + 1).padStart(3, '0')}_${safeText}_600DPI.png`;

    zip.file(filename, blob);
  }

  offscreenCanvas.width = 1;
  offscreenCanvas.height = 1;

  if (onProgress) {
    onProgress(batchData.length, batchData.length, 'กำลังบีบอัดไฟล์ ZIP (600 DPI)...');
  }
  await new Promise((resolve) => setTimeout(resolve, 50));

  const content = await zip.generateAsync({ 
    type: 'blob', 
    compression: 'DEFLATE', 
    compressionOptions: { level: 1 } 
  });
  saveAs(content, `QR_Batch_Images_600DPI_${Date.now()}.zip`);
}
