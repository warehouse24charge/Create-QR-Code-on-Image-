import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  FileDown, 
  Archive, 
  X, 
  CheckCircle, 
  Loader2, 
  Eye, 
  Layers
} from 'lucide-react';
import { renderAllPages, exportToPDF, exportToZIP } from '../utils/qrRenderer';

export default function PrintPreviewModal({
  isOpen,
  onClose,
  templateImg,
  batchData,
  qrConfig,
  textConfig,
  onTriggerPrint
}) {
  const [renderedPages, setRenderedPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [exportScale, setExportScale] = useState(2); // 1 = 100% ต้นฉบับ, 2 = HD 2x, 3 = 300 DPI

  useEffect(() => {
    if (!isOpen || !templateImg) return;

    let isMounted = true;
    setLoading(true);
    setProgress({ current: 0, total: batchData.length, status: 'กำลังประมวลผลรูปภาพทุกหน้า...' });

    renderAllPages(
      templateImg, 
      batchData, 
      qrConfig, 
      textConfig, 
      (curr, total) => {
        if (isMounted) {
          setProgress({ current: curr, total, status: `กำลังสร้างหน้า ${curr} / ${total}` });
        }
      },
      exportScale
    ).then((pages) => {
      if (isMounted) {
        setRenderedPages(pages);
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [isOpen, templateImg, batchData, qrConfig, textConfig, exportScale]);

  if (!isOpen) return null;

  const handleExportPDF = async () => {
    setLoading(true);
    setProgress({ current: 0, total: batchData.length, status: 'กำลังสร้างเอกสาร PDF คุณภาพสูง (Lossless)...' });
    try {
      await exportToPDF(templateImg, batchData, qrConfig, textConfig, (curr, total) => {
        setProgress({ current: curr, total, status: `กำลังเพิ่มหน้า ${curr} / ${total} ลงใน PDF` });
      }, exportScale);
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการสร้าง PDF: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportZIP = async () => {
    setLoading(true);
    setProgress({ current: 0, total: batchData.length, status: 'กำลังรวมไฟล์รูปภาพ PNG คุณภาพสูง...' });
    try {
      await exportToZIP(templateImg, batchData, qrConfig, textConfig, (curr, total) => {
        setProgress({ current: curr, total, status: `กำลังบันทึกรูปภาพหน้า ${curr} / ${total}` });
      }, exportScale);
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการรวม ZIP: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col p-3 sm:p-6 overflow-hidden">
      {/* Modal Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 px-5 py-3.5 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Layers size={22} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              พรีวิวและสั่งพิมพ์หลายหน้า
              <span className="text-xs bg-emerald-900/60 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-700/50">
                {batchData.length} หน้า
              </span>
            </h2>
            <p className="text-xs text-slate-400">ภาพคมชัดเท่าต้นฉบับ 100% พร้อมตัวเลือกส่งออก PDF และ ZIP คุณภาพสูง</p>
          </div>
        </div>

        {/* Action Buttons & Quality Selector */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quality Selector */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">ความละเอียด:</span>
            <select
              value={exportScale}
              onChange={(e) => setExportScale(Number(e.target.value))}
              className="bg-slate-900 text-emerald-400 font-semibold text-xs rounded-lg px-2 py-1 border border-slate-700 outline-none cursor-pointer hover:border-emerald-500 transition"
              title="เลือกระดับความละเอียดของภาพและเอกสารที่ส่งออก"
            >
              <option value={1}>1x เท่าต้นฉบับ 100% (Lossless)</option>
              <option value={2}>2x คมชัดสูง HD (แนะนำ)</option>
              <option value={3}>3x คมชัดสูงสุด (300 DPI สำหรับพิมพ์ A4)</option>
            </select>
          </div>

          <button
            onClick={() => onTriggerPrint(exportScale)}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-lg shadow-emerald-950 disabled:opacity-50"
            title="เปิดหน้าต่างสั่งพิมพ์ของเบราว์เซอร์สำหรับพิมพ์ทุกหน้า"
          >
            <Printer size={16} />
            <span>พิมพ์ออกกระดาษ</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-lg shadow-blue-950 disabled:opacity-50"
            title="บันทึกเป็นไฟล์ PDF รวมทุกหน้า (PNG Lossless ไม่แตก)"
          >
            <FileDown size={16} />
            <span className="hidden sm:inline">ดาวน์โหลด</span> PDF
          </button>

          <button
            onClick={handleExportZIP}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-lg shadow-purple-950 disabled:opacity-50"
            title="บันทึกเป็นไฟล์ ZIP รวมภาพทุกหน้า (PNG คมชัดสูงสุด)"
          >
            <Archive size={16} />
            <span className="hidden sm:inline">ดาวน์โหลด</span> ZIP
          </button>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition ml-1"
            title="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Progress Bar (when processing) */}
      {loading && (
        <div className="mt-3 bg-slate-900 border border-slate-800 px-5 py-3 rounded-xl shadow-lg space-y-2">
          <div className="flex justify-between text-xs text-slate-300">
            <span className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-emerald-400" />
              {progress.status}
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-200"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      <div className="flex-1 overflow-y-auto mt-4 pr-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 pb-8">
          {renderedPages.map((page) => (
            <div
              key={page.index}
              onClick={() => setSelectedPreview(page)}
              className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/80 rounded-xl p-2 flex flex-col transition cursor-pointer hover:shadow-xl hover:shadow-emerald-950/30"
            >
              <div className="relative aspect-[723/1024] bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src={page.dataUrl}
                  alt={`Page ${page.index}`}
                  className="w-full h-full object-contain pointer-events-none"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <div className="bg-slate-900/90 px-2 py-1 rounded-md text-[11px] flex items-center gap-1">
                    <Eye size={13} />
                    <span>คลิกดูภาพใหญ่</span>
                  </div>
                </div>
              </div>

              <div className="mt-2 text-center">
                <div className="text-xs font-bold text-emerald-400">หน้า {page.index}</div>
                <div className="text-[11px] text-slate-300 truncate" title={page.text}>
                  {page.text || '-'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full-size Single Page Modal on click */}
      {selectedPreview && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPreview(null)}
        >
          <div 
            className="max-w-xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-center pb-2 border-b border-slate-800 text-xs text-slate-300">
              <span className="font-bold text-emerald-400">หน้า {selectedPreview.index}: {selectedPreview.text}</span>
              <button 
                onClick={() => setSelectedPreview(null)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto mt-2 max-h-[75vh] flex justify-center">
              <img
                src={selectedPreview.dataUrl}
                alt={`Page ${selectedPreview.index}`}
                className="max-h-[72vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
