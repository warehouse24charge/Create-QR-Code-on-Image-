import React, { useState } from 'react';
import { 
  ClipboardPaste, 
  Plus, 
  Trash2, 
  Sparkles, 
  ListRestart, 
  HelpCircle,
  Wand2,
  FileSpreadsheet,
  Image as ImageIcon,
  Upload,
  RotateCcw
} from 'lucide-react';
import { DEFAULT_SAMPLE_DATA } from '../constants';


export default function DataTable({ 
  batchData, 
  setBatchData, 
  currentIndex, 
  setCurrentIndex,
  templateImg,
  onUploadImage,
  onResetImage
}) {
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showGenModal, setShowGenModal] = useState(false);

  // Sequence generator inputs
  const [genPrefixLink, setGenPrefixLink] = useState('https://api.24charge.com/redirect/station?qr=GT24CHARGE');
  const [genPrefixText, setGenPrefixText] = useState('24CHARGE');
  const [genStart, setGenStart] = useState(1);
  const [genEnd, setGenEnd] = useState(20);
  const [genPadding, setGenPadding] = useState(9);

  const handleRowChange = (index, field, value) => {
    const updated = [...batchData];
    updated[index] = { ...updated[index], [field]: value };
    setBatchData(updated);
  };

  const handleAddRow = () => {
    const newRow = { link: 'https://', text: '' };
    setBatchData([...batchData, newRow]);
    setCurrentIndex(batchData.length);
  };

  const handleDeleteRow = (index) => {
    if (batchData.length <= 1) {
      alert('ต้องมีข้อมูลอย่างน้อย 1 รายการครับ');
      return;
    }
    const updated = batchData.filter((_, i) => i !== index);
    setBatchData(updated);
    if (currentIndex >= updated.length) {
      setCurrentIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleClearAll = () => {
    if (confirm('คุณต้องการล้างข้อมูลทั้งหมดหรือไม่?')) {
      setBatchData([{ link: 'https://', text: '' }]);
      setCurrentIndex(0);
    }
  };

  const handleLoadSample = () => {
    setBatchData(DEFAULT_SAMPLE_DATA);
    setCurrentIndex(0);
  };

  // Parse pasted content from Excel / CSV / Tab-separated
  const handleApplyPaste = () => {
    if (!pasteText.trim()) return;

    const lines = pasteText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const parsed = [];

    lines.forEach(line => {
      // Split by tab or comma if tab isn't present
      let parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length === 1 && line.includes(' ')) {
        // Fallback: split by multiple spaces
        parts = line.split(/\s{2,}/);
      }

      const col1 = parts[0]?.trim() || '';
      const col2 = parts[1]?.trim() || '';

      // Skip header if line looks like "QR code Link, text below"
      if (col1.toLowerCase().includes('qr') && col2.toLowerCase().includes('text')) {
        return;
      }

      if (col1) {
        parsed.push({
          link: col1,
          text: col2 || col1.split('/').pop() || ''
        });
      }
    });

    if (parsed.length > 0) {
      setBatchData(parsed);
      setCurrentIndex(0);
      setShowPasteModal(false);
      setPasteText('');
    } else {
      alert('ไม่พบข้อมูลที่ถูกต้อง กรุณาตรวจสอบรูปแบบข้อมูลที่วางครับ');
    }
  };

  // Generate sequence of items
  const handleGenerateSequence = () => {
    const start = parseInt(genStart, 10);
    const end = parseInt(genEnd, 10);
    const pad = parseInt(genPadding, 10);

    if (isNaN(start) || isNaN(end) || start > end) {
      alert('กรุณากรอกตัวเลขเริ่มต้นและสิ้นสุดให้ถูกต้อง');
      return;
    }

    const generated = [];
    for (let i = start; i <= end; i++) {
      const numStr = String(i).padStart(pad, '0');
      generated.push({
        link: `${genPrefixLink}${numStr}`,
        text: `${genPrefixText}${numStr}`
      });
    }

    setBatchData(generated);
    setCurrentIndex(0);
    setShowGenModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      {/* 1. Template Image Section (First Tab) */}
      <div className="p-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-14 bg-slate-900 rounded border border-slate-700 overflow-hidden flex items-center justify-center relative shadow-sm flex-shrink-0">
            {templateImg ? (
              <img src={templateImg.src} alt="Template" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon size={16} className="text-slate-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs">
              <ImageIcon size={14} className="text-purple-400" />
              <span>ภาพต้นแบบ (Template Image)</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {templateImg ? `${templateImg.naturalWidth} × ${templateImg.naturalHeight} px` : 'กำลังโหลด...'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-950/70 hover:bg-purple-900 border border-purple-700/60 text-purple-300 rounded-lg text-xs font-medium cursor-pointer transition">
            <Upload size={13} />
            <span>เปลี่ยนภาพ</span>
            <input type="file" accept="image/*" onChange={onUploadImage} className="hidden" />
          </label>
          <button
            type="button"
            onClick={onResetImage}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition border border-slate-800"
            title="รีเซ็ตกลับเป็นภาพเริ่มต้น 24CHARGE"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* 2. Header Actions for Batch Table */}
      <div className="p-3 bg-slate-800/80 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="text-emerald-400" size={18} />
          <h2 className="font-semibold text-slate-100 text-sm sm:text-base">
            ตารางข้อมูล QR Code 
            <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-medium">
              {batchData.length} หน้า
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowPasteModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs rounded-lg transition"
            title="วางข้อมูลที่คัดลอกมาจาก Excel หรือ Google Sheets"
          >
            <ClipboardPaste size={14} className="text-blue-400" />
            <span>วางจาก Excel</span>
          </button>

          <button
            onClick={() => setShowGenModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs rounded-lg transition"
            title="สร้างชุดลำดับอัตโนมัติ"
          >
            <Wand2 size={14} className="text-amber-400" />
            <span>สร้างลำดับ</span>
          </button>

          <button
            onClick={handleLoadSample}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 text-xs rounded-lg transition"
            title="โหลดข้อมูลตัวอย่าง 24CHARGE ทั้ง 20 รายการ"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">โหลดตัวอย่าง</span>
          </button>

          <button
            onClick={handleClearAll}
            className="p-1.5 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 rounded-lg transition"
            title="ล้างทั้งหมด"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto max-h-[calc(100vh-370px)] sm:max-h-none">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-950/80 text-slate-400 sticky top-0 z-10 uppercase tracking-wider text-[11px] border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3 w-12 text-center">#</th>
              <th className="py-2.5 px-3">ลิงก์ QR Code (URL / Data)</th>
              <th className="py-2.5 px-3 w-44 sm:w-52">ข้อความใต้ QR (Text Below)</th>
              <th className="py-2.5 px-2 w-10 text-center">ลบ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {batchData.map((row, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <tr 
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`group transition cursor-pointer ${
                    isSelected 
                      ? 'bg-emerald-950/40 border-l-4 border-l-emerald-500' 
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-2 px-3 text-center text-slate-400 font-mono font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 px-3">
                    <input
                      type="text"
                      value={row.link}
                      onChange={(e) => handleRowChange(idx, 'link', e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-slate-950/60 focus:bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded px-2 py-1 text-slate-200 outline-none transition font-mono text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-3">
                    <input
                      type="text"
                      value={row.text}
                      onChange={(e) => handleRowChange(idx, 'text', e.target.value)}
                      placeholder="เช่น 24CHARGE000000001"
                      className="w-full bg-slate-950/60 focus:bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded px-2 py-1 text-slate-200 outline-none transition text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRow(idx);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 opacity-60 group-hover:opacity-100 rounded transition"
                      title="ลบแถวนี้"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Add Row */}
      <div className="p-2.5 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={handleAddRow}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition shadow-md shadow-emerald-950"
        >
          <Plus size={14} />
          <span>เพิ่มแถวใหม่</span>
        </button>
        <span className="text-[11px] text-slate-400">
          คลิกที่แถวเพื่อพรีวิวหน้านั้นบนรูปภาพ
        </span>
      </div>

      {/* Modal: Quick Paste from Excel */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <ClipboardPaste size={20} />
                <h3 className="font-semibold text-slate-100 text-base">วางข้อมูลจาก Excel / Google Sheets</h3>
              </div>
              <button 
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              คัดลอก (Copy) ข้อมูล 2 คอลัมน์จาก Excel แล้วกดวาง (Ctrl+V) ในช่องด้านล่างนี้ได้เลย:
              <br/>
              <span className="text-slate-300 font-mono">คอลัมน์ 1: ลิงก์ QR Code | คอลัมน์ 2: ข้อความใต้ QR</span>
            </p>

            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="QR code Link	text below&#10;https://api.24charge.com/redirect/station?qr=GT24CHARGE000000001	24CHARGE000000001&#10;https://api.24charge.com/redirect/station?qr=GT24CHARGE000000002	24CHARGE000000002"
              rows={8}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-slate-200 font-mono outline-none resize-none placeholder:text-slate-600"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleApplyPaste}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-emerald-950"
              >
                นำเข้าข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sequence Generator */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Wand2 size={20} />
                <h3 className="font-semibold text-slate-100 text-base">สร้างรหัสลำดับอัตโนมัติ (Sequence Generator)</h3>
              </div>
              <button 
                onClick={() => setShowGenModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div>
                <label className="block text-slate-400 mb-1">คำนำหน้าลิงก์ QR Code (URL Prefix):</label>
                <input
                  type="text"
                  value={genPrefixLink}
                  onChange={(e) => setGenPrefixLink(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">คำนำหน้าข้อความใต้ QR (Text Prefix):</label>
                <input
                  type="text"
                  value={genPrefixText}
                  onChange={(e) => setGenPrefixText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">เริ่มจาก:</label>
                  <input
                    type="number"
                    value={genStart}
                    onChange={(e) => setGenStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">ถึงลำดับที่:</label>
                  <input
                    type="number"
                    value={genEnd}
                    onChange={(e) => setGenEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">จำนวนหลัก (0 เติมหน้า):</label>
                  <input
                    type="number"
                    value={genPadding}
                    onChange={(e) => setGenPadding(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                ตัวอย่างผลลัพธ์: <br/>
                <span className="text-amber-300 font-mono font-medium">
                  {genPrefixLink}{String(genStart).padStart(genPadding, '0')}
                </span>
                <br/>
                <span className="text-slate-300 font-mono">
                  {genPrefixText}{String(genStart).padStart(genPadding, '0')}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowGenModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleGenerateSequence}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-amber-950"
              >
                สร้างชุดข้อมูล ({Math.max(0, parseInt(genEnd) - parseInt(genStart) + 1)} รายการ)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
