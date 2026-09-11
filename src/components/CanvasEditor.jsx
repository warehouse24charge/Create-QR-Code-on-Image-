import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Move, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight, 
  AlignCenter, 
  AlignVerticalJustifyCenter, 
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Square
} from 'lucide-react';
import QRCode from 'qrcode';

export default function CanvasEditor({
  templateImg,
  batchData,
  currentIndex,
  onIndexChange,
  qrConfig,
  setQrConfig,
  textConfig
}) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const [resizeStart, setResizeStart] = useState({ mouseX: 0, initialSize: 0 });
  const [previewQrUrl, setPreviewQrUrl] = useState('');

  const currentRow = batchData[currentIndex] || { link: '', text: '' };
  const imgWidth = templateImg?.naturalWidth || 723;
  const imgHeight = templateImg?.naturalHeight || 1024;

  // Generate QR code data URL for preview
  useEffect(() => {
    if (!currentRow.link) return;
    let isMounted = true;
    QRCode.toDataURL(currentRow.link, {
      errorCorrectionLevel: qrConfig.errorCorrection || 'H',
      margin: qrConfig.qrMargin !== undefined ? qrConfig.qrMargin : 1,
      width: 400,
      color: {
        dark: qrConfig.qrColor || '#000000',
        light: '#ffffff'
      }
    }).then(url => {
      if (isMounted) setPreviewQrUrl(url);
    }).catch(err => console.error("QR preview error:", err));

    return () => { isMounted = false; };
  }, [currentRow.link, qrConfig.errorCorrection, qrConfig.qrMargin, qrConfig.qrColor]);

  // Adjust container scale on window resize or when image loads
  const updateScale = useCallback(() => {
    if (!containerRef.current || !templateImg) return;
    const container = containerRef.current;
    const availWidth = container.clientWidth - 48; // padding
    const availHeight = container.clientHeight - 80;
    if (availWidth <= 0 || availHeight <= 0) return;

    const scaleX = availWidth / imgWidth;
    const scaleY = availHeight / imgHeight;
    const bestScale = Math.min(scaleX, scaleY, 1.0); // don't upscale above 100% by default
    setScale(Math.max(bestScale, 0.25));
  }, [imgWidth, imgHeight, templateImg]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  // Mouse Dragging logic (mapped to natural image coordinates)
  const handleMouseDown = (e) => {
    if (e.target.closest('.resize-handle')) return; // ignore if clicking resize
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: qrConfig.x,
      initialY: qrConfig.y
    });
  };

  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialSize: qrConfig.size
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const deltaX = (e.clientX - dragStart.mouseX) / scale;
        const deltaY = (e.clientY - dragStart.mouseY) / scale;
        
        let newX = Math.round(dragStart.initialX + deltaX);
        let newY = Math.round(dragStart.initialY + deltaY);

        // Constrain within image boundaries
        newX = Math.max(0, Math.min(newX, imgWidth - qrConfig.size));
        newY = Math.max(0, Math.min(newY, imgHeight - qrConfig.size));

        setQrConfig(prev => ({ ...prev, x: newX, y: newY }));
      } else if (isResizing) {
        const deltaX = (e.clientX - resizeStart.mouseX) / scale;
        const deltaY = (e.clientY - resizeStart.mouseY) / scale;
        const delta = Math.max(deltaX, deltaY);

        // Allow shrinking down to 10px
        let newSize = Math.round(resizeStart.initialSize + delta);
        newSize = Math.max(10, Math.min(newSize, Math.min(imgWidth, imgHeight) - 10));

        setQrConfig(prev => ({ ...prev, size: newSize }));
      }
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
      if (isResizing) setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, scale, imgWidth, imgHeight, qrConfig.size, setQrConfig]);

  // Keyboard arrow keys for pixel-perfect nudging
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setQrConfig(prev => ({ ...prev, x: Math.max(0, prev.x - step) }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setQrConfig(prev => ({ ...prev, x: Math.min(imgWidth - prev.size, prev.x + step) }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setQrConfig(prev => ({ ...prev, y: Math.max(0, prev.y - step) }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setQrConfig(prev => ({ ...prev, y: Math.min(imgHeight - prev.size, prev.y + step) }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imgWidth, imgHeight, setQrConfig]);

  // Touch handlers for mobile / tablets
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        mouseX: touch.clientX,
        mouseY: touch.clientY,
        initialX: qrConfig.x,
        initialY: qrConfig.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = (touch.clientX - dragStart.mouseX) / scale;
      const deltaY = (touch.clientY - dragStart.mouseY) / scale;

      let newX = Math.round(dragStart.initialX + deltaX);
      let newY = Math.round(dragStart.initialY + deltaY);
      newX = Math.max(0, Math.min(newX, imgWidth - qrConfig.size));
      newY = Math.max(0, Math.min(newY, imgHeight - qrConfig.size));

      setQrConfig(prev => ({ ...prev, x: newX, y: newY }));
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Quick Alignments
  const centerHorizontally = () => {
    const newX = Math.round((imgWidth - qrConfig.size) / 2);
    setQrConfig(prev => ({ ...prev, x: newX }));
  };

  const centerVertically = () => {
    const newY = Math.round((imgHeight - qrConfig.size) / 2);
    setQrConfig(prev => ({ ...prev, y: newY }));
  };

  const setSamplePosition = () => {
    setQrConfig(prev => ({
      ...prev,
      x: 276,
      y: 78,
      size: 170,
      hasBg: true,
      cardPadding: 8,
      borderRadius: 12,
      envelopText: true
    }));
  };

  // Card box dimensions calculation
  const paddingVal = qrConfig.hasBg ? qrConfig.cardPadding : 0;
  const cardWidth = qrConfig.envelopText 
    ? 'fit-content'
    : `${(qrConfig.size + paddingVal * 2) * scale}px`;

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs sm:text-sm">
        {/* Alignment & Helpers */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={centerHorizontally}
            title="จัดกึ่งกลางแนวนอน"
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-lg transition text-xs"
          >
            <AlignCenter size={13} className="text-emerald-400" />
            <span className="hidden sm:inline">กึ่งกลาง X</span>
          </button>
          <button
            onClick={centerVertically}
            title="จัดกึ่งกลางแนวตั้ง"
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-lg transition text-xs"
          >
            <AlignVerticalJustifyCenter size={13} className="text-emerald-400" />
            <span className="hidden sm:inline">กึ่งกลาง Y</span>
          </button>
          <button
            onClick={setSamplePosition}
            title="ปรับตำแหน่งตรงกลางด้านบน (แบบ 24CHARGE)"
            className="flex items-center gap-1 px-2 py-1 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-300 rounded-lg transition font-medium text-xs"
          >
            <Sparkles size={13} className="text-emerald-400" />
            <span className="hidden md:inline">ตำแหน่งตัวอย่าง (24CHARGE)</span>
          </button>

          {/* Quick Toggle for Background */}
          <button
            onClick={() => setQrConfig(prev => ({ ...prev, hasBg: !prev.hasBg }))}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition font-medium ${
              qrConfig.hasBg 
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="คลิกเพื่อเปิด/ปิดพื้นหลังการ์ด QR"
          >
            <Square size={13} className={qrConfig.hasBg ? 'fill-emerald-400 text-emerald-400' : ''} />
            <span>{qrConfig.hasBg ? 'มีพื้นหลัง' : 'ไม่มีพื้นหลัง (ใส)'}</span>
          </button>
        </div>

        {/* Zoom & Coordinates (Editable inputs as requested) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Editable X, Y, Size Inputs */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-mono text-[11px] font-semibold">X:</span>
              <input
                type="number"
                value={qrConfig.x}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQrConfig(prev => ({ ...prev, x: isNaN(val) ? 0 : val }));
                }}
                className="w-14 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-1.5 py-0.5 text-slate-100 font-mono text-xs outline-none text-center"
                title="พิกัดแกน X (สามารถพิมพ์ตัวเลขเองได้)"
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-mono text-[11px] font-semibold">Y:</span>
              <input
                type="number"
                value={qrConfig.y}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQrConfig(prev => ({ ...prev, y: isNaN(val) ? 0 : val }));
                }}
                className="w-14 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-1.5 py-0.5 text-slate-100 font-mono text-xs outline-none text-center"
                title="พิกัดแกน Y (สามารถพิมพ์ตัวเลขเองได้)"
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-mono text-[11px] font-semibold">Size:</span>
              <input
                type="number"
                min="10"
                value={qrConfig.size}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQrConfig(prev => ({ ...prev, size: isNaN(val) ? 10 : Math.max(10, val) }));
                }}
                className="w-14 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-1.5 py-0.5 text-slate-100 font-mono text-xs outline-none text-center"
                title="ขนาด QR Code (px) (สามารถพิมพ์ตัวเลขเองได้)"
              />
              <span className="text-slate-500 text-[10px]">px</span>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 bg-slate-800 p-0.5 rounded-lg">
            <button 
              onClick={() => setScale(s => Math.max(s - 0.1, 0.2))} 
              className="p-1 hover:bg-slate-700 text-slate-300 rounded" 
              title="ย่อ"
            >
              <ZoomOut size={13} />
            </button>
            <span className="px-1 text-[11px] text-slate-300 min-w-[38px] text-center font-mono">
              {Math.round(scale * 100)}%
            </span>
            <button 
              onClick={() => setScale(s => Math.min(s + 0.1, 2.0))} 
              className="p-1 hover:bg-slate-700 text-slate-300 rounded" 
              title="ขยาย"
            >
              <ZoomIn size={13} />
            </button>
            <button 
              onClick={() => setScale(1.0)} 
              className="px-1.5 py-0.5 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded text-[11px] font-bold font-mono transition" 
              title="ดูขนาดจริง 100% (ความคมชัดเท่าต้นฉบับ)"
            >
              100%
            </button>
            <button 
              onClick={updateScale} 
              className="p-1 hover:bg-slate-700 text-slate-300 rounded" 
              title="ย่อพอดีจอ"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex items-center justify-center bg-radial from-slate-900 to-slate-950 relative select-none"
      >
        {templateImg ? (
          <div 
            className="relative shadow-2xl transition-transform origin-center"
            style={{
              width: `${imgWidth * scale}px`,
              height: `${imgHeight * scale}px`,
            }}
          >
            {/* Background Template Image */}
            <img
              src={templateImg.src}
              alt="Template"
              className="w-full h-full object-contain pointer-events-none rounded shadow-lg border border-slate-800/80 block"
              style={{
                imageRendering: '-webkit-optimize-contrast',
              }}
              draggable={false}
            />

            {/* Draggable & Resizable QR Code Box */}
            <div
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                position: 'absolute',
                left: `${(qrConfig.x - (qrConfig.hasBg ? qrConfig.cardPadding : 0)) * scale}px`,
                top: `${(qrConfig.y - (qrConfig.hasBg ? qrConfig.cardPadding : 0)) * scale}px`,
                width: cardWidth,
                padding: qrConfig.hasBg ? `${qrConfig.cardPadding * scale}px` : '0px',
                borderRadius: qrConfig.hasBg ? `${qrConfig.borderRadius * scale}px` : '0px',
                backgroundColor: qrConfig.hasBg ? (qrConfig.bgColor || '#ffffff') : 'transparent',
                boxShadow: qrConfig.hasBg && qrConfig.boxShadow ? '0 4px 15px rgba(0,0,0,0.18)' : 'none',
                cursor: isDragging ? 'grabbing' : 'grab',
                border: isDragging ? '2px dashed #10b981' : (qrConfig.hasBg ? '1px solid transparent' : '1px dashed rgba(16,185,129,0.3)'),
              }}
              className="group transition-shadow select-none flex flex-col items-center justify-center hover:border-emerald-500/70"
            >
              {/* QR Code Image Preview */}
              {previewQrUrl ? (
                <img
                  src={previewQrUrl}
                  alt="QR"
                  draggable={false}
                  style={{
                    width: `${qrConfig.size * scale}px`,
                    height: `${qrConfig.size * scale}px`,
                    minWidth: `${qrConfig.size * scale}px`,
                    minHeight: `${qrConfig.size * scale}px`,
                    imageRendering: 'pixelated',
                  }}
                  className="pointer-events-none block"
                />
              ) : (
                <div 
                  style={{
                    width: `${qrConfig.size * scale}px`,
                    height: `${qrConfig.size * scale}px`,
                  }}
                  className="bg-slate-200/50 flex items-center justify-center text-xs text-slate-500"
                >
                  ...
                </div>
              )}

              {/* Text Below QR Code */}
              {textConfig.enabled && currentRow.text && (
                <div
                  style={{
                    marginTop: `${(textConfig.spacing || 4) * scale}px`,
                    fontSize: `${Math.max(1, textConfig.fontSize || 15) * scale}px`,
                    fontFamily: textConfig.fontFamily || 'Prompt',
                    fontWeight: textConfig.fontWeight || '600',
                    color: textConfig.color || '#1e293b',
                    textAlign: 'center',
                    lineHeight: 1.15,
                    maxWidth: qrConfig.envelopText 
                      ? 'none' 
                      : `${Math.max(qrConfig.size * 2, 80) * scale}px`,
                    whiteSpace: 'nowrap',
                    overflow: 'visible'
                  }}
                  className="pointer-events-none select-none"
                >
                  {currentRow.text}
                </div>
              )}

              {/* Drag Handle Icon on Hover */}
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 bg-black/60 text-white rounded p-0.5 pointer-events-none transition-opacity">
                <Move size={11} />
              </div>

              {/* Resize Handle in Bottom-Right Corner */}
              <div
                onMouseDown={handleResizeMouseDown}
                className="resize-handle absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-300 rounded-full flex items-center justify-center cursor-nwse-resize shadow-md transition-transform transform hover:scale-125 z-10"
                title="คลิกลากเพื่อย่อ-ขยายขนาด (สามารถพิมพ์ในช่อง Size ด้านบนได้เช่นกัน)"
              >
                <Maximize2 size={10} className="text-slate-950 transform rotate-90" />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 flex flex-col items-center">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mb-2"></div>
            <span>กำลังโหลดภาพต้นแบบ...</span>
          </div>
        )}
      </div>

      {/* Bottom Page Navigation Bar */}
      <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 text-xs rounded-lg transition"
          >
            <ChevronLeft size={15} />
            <span className="hidden sm:inline">หน้าก่อนหน้า</span>
          </button>
          <div className="text-xs text-slate-300 font-medium px-2">
            หน้า <span className="text-emerald-400 font-bold">{currentIndex + 1}</span> จาก <span className="text-slate-200 font-bold">{batchData.length}</span>
          </div>
          <button
            onClick={() => onIndexChange(Math.min(batchData.length - 1, currentIndex + 1))}
            disabled={currentIndex >= batchData.length - 1}
            className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 text-xs rounded-lg transition"
          >
            <span className="hidden sm:inline">หน้าถัดไป</span>
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Current row snippet */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 max-w-md truncate">
          <span className="text-emerald-400 font-mono">#{currentIndex + 1}</span>
          <span className="truncate" title={currentRow.link}>Link: {currentRow.link}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-200 font-medium truncate" title={currentRow.text}>ข้อความ: {currentRow.text}</span>
        </div>
      </div>
    </div>
  );
}
