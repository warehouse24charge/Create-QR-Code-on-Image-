import React from 'react';
import { 
  Sliders, 
  Type, 
  QrCode, 
  Palette, 
  Square,
  Sparkles
} from 'lucide-react';

export default function StyleControls({
  qrConfig,
  setQrConfig,
  textConfig,
  setTextConfig
}) {
  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 overflow-y-auto p-4 space-y-5 text-xs text-slate-300">
      {/* Section 1: QR Code Customization */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate-100 font-semibold border-b border-slate-800 pb-2">
          <QrCode size={16} className="text-emerald-400" />
          <span>ปรับแต่ง QR Code</span>
        </div>

        {/* Size Slider + Direct Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-slate-400">ขนาด QR Code (Size):</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="10"
                max="600"
                value={qrConfig.size}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQrConfig(prev => ({ ...prev, size: isNaN(val) ? 10 : Math.max(10, val) }));
                }}
                className="w-16 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded px-2 py-0.5 text-emerald-400 font-mono text-xs text-right outline-none font-bold"
              />
              <span className="text-slate-500 text-[11px]">px</span>
            </div>
          </div>
          <input
            type="range"
            min="10"
            max="400"
            step="1"
            value={qrConfig.size}
            onChange={(e) => setQrConfig({ ...qrConfig, size: parseInt(e.target.value, 10) || 10 })}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        {/* Background Card Selection */}
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="font-medium text-slate-200">พื้นหลัง QR Code:</span>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setQrConfig(prev => ({ ...prev, hasBg: true }))}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  qrConfig.hasBg 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                มีพื้นหลัง
              </button>
              <button
                type="button"
                onClick={() => setQrConfig(prev => ({ ...prev, hasBg: false }))}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  !qrConfig.hasBg 
                    ? 'bg-rose-600/80 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ไม่มีพื้นหลัง (โปร่งใส)
              </button>
            </div>
          </div>

          {qrConfig.hasBg && (
            <div className="space-y-3 pt-1">
              {/* Card Scope: Envelop text or only QR */}
              <div>
                <span className="text-slate-400 text-[11px] block mb-1.5">ขอบเขตของพื้นหลัง:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQrConfig(prev => ({ ...prev, envelopText: false }))}
                    className={`p-2 rounded-lg border text-left transition ${
                      !qrConfig.envelopText
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-[11px]">เฉพาะ QR Code</div>
                    <div className="text-[10px] text-slate-400">กรอบไม่ยืดตามข้อความ</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQrConfig(prev => ({ ...prev, envelopText: true }))}
                    className={`p-2 rounded-lg border text-left transition ${
                      qrConfig.envelopText
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-[11px]">QR + ข้อความ</div>
                    <div className="text-[10px] text-slate-400">กรอบคลุมข้อความด้วย</div>
                  </button>
                </div>
              </div>

              {/* Background Color */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">สีพื้นหลังการ์ด:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={qrConfig.bgColor || '#ffffff'}
                    onChange={(e) => setQrConfig({ ...qrConfig, bgColor: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-slate-300">{qrConfig.bgColor || '#ffffff'}</span>
                </div>
              </div>

              {/* Card Padding */}
              <div>
                <div className="flex justify-between mb-1 text-[11px]">
                  <span className="text-slate-400">ขอบใน (Padding):</span>
                  <span className="font-mono text-slate-200">{qrConfig.cardPadding} px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={qrConfig.cardPadding}
                  onChange={(e) => setQrConfig({ ...qrConfig, cardPadding: parseInt(e.target.value, 10) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Border Radius */}
              <div>
                <div className="flex justify-between mb-1 text-[11px]">
                  <span className="text-slate-400">ความโค้งมน (Radius):</span>
                  <span className="font-mono text-slate-200">{qrConfig.borderRadius} px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={qrConfig.borderRadius}
                  onChange={(e) => setQrConfig({ ...qrConfig, borderRadius: parseInt(e.target.value, 10) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* QR Color & Error Correction */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-slate-400 mb-1 text-[11px]">สีของ QR Code:</label>
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <input
                type="color"
                value={qrConfig.qrColor}
                onChange={(e) => setQrConfig({ ...qrConfig, qrColor: e.target.value })}
                className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-[11px] text-slate-300">{qrConfig.qrColor}</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 text-[11px]">ระดับความคมชัด (ECC):</label>
            <select
              value={qrConfig.errorCorrection}
              onChange={(e) => setQrConfig({ ...qrConfig, errorCorrection: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[11px] text-slate-200 outline-none"
            >
              <option value="L">L (7%)</option>
              <option value="M">M (15%)</option>
              <option value="Q">Q (25%)</option>
              <option value="H">H (30% สูงสุด)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Text Below QR */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-slate-100 font-semibold">
            <Type size={16} className="text-blue-400" />
            <span>ข้อความใต้ QR Code</span>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={textConfig.enabled}
              onChange={(e) => setTextConfig({ ...textConfig, enabled: e.target.checked })}
              className="w-3.5 h-3.5 accent-blue-500 rounded cursor-pointer"
            />
            <span className="text-[11px] text-slate-300">แสดงข้อความ</span>
          </label>
        </div>

        {textConfig.enabled ? (
          <div className="space-y-3">
            {/* Font Size (Min 1px, with direct input) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400">ขนาดฟอนต์ (Font Size):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={textConfig.fontSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setTextConfig(prev => ({ ...prev, fontSize: isNaN(val) ? 1 : Math.max(1, val) }));
                    }}
                    className="w-16 bg-slate-950 border border-slate-700 focus:border-blue-500 rounded px-2 py-0.5 text-blue-400 font-mono text-xs text-right outline-none font-bold"
                  />
                  <span className="text-slate-500 text-[11px]">px</span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={textConfig.fontSize}
                onChange={(e) => setTextConfig({ ...textConfig, fontSize: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">สามารถปรับขนาดเล็กลงได้ถึง 1 px ตามต้องการ</span>
            </div>

            {/* Spacing (Supports negative values) */}
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="text-slate-400">ระยะห่างจาก QR Code:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="-60"
                    max="60"
                    value={textConfig.spacing}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setTextConfig(prev => ({ ...prev, spacing: isNaN(val) ? 0 : val }));
                    }}
                    className="w-14 bg-slate-950 border border-slate-700 focus:border-blue-500 rounded px-1.5 py-0.5 text-blue-400 font-mono text-xs text-right outline-none font-bold"
                  />
                  <span className="text-slate-500 text-[10px]">px</span>
                </div>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="1"
                value={textConfig.spacing}
                onChange={(e) => setTextConfig({ ...textConfig, spacing: parseInt(e.target.value, 10) || 0 })}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">สามารถใส่ค่าติดลบได้ (เช่น -5 ถึง -20 เพื่อขยับข้อความขึ้นใกล้ QR Code)</span>
            </div>

            {/* Font Family & Weight */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">แบบอักษร (Font):</label>
                <select
                  value={textConfig.fontFamily}
                  onChange={(e) => setTextConfig({ ...textConfig, fontFamily: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[11px] text-slate-200 outline-none"
                >
                  <option value="Prompt">Prompt</option>
                  <option value="Kanit">Kanit</option>
                  <option value="Sarabun">Sarabun</option>
                  <option value="Inter">Inter</option>
                  <option value="monospace">Monospace</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">ความหนา (Weight):</label>
                <select
                  value={textConfig.fontWeight}
                  onChange={(e) => setTextConfig({ ...textConfig, fontWeight: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[11px] text-slate-200 outline-none"
                >
                  <option value="400">ปกติ (Regular)</option>
                  <option value="500">ปานกลาง (Medium)</option>
                  <option value="600">หนา (SemiBold)</option>
                  <option value="700">หนามาก (Bold)</option>
                  <option value="800">Extra Bold</option>
                </select>
              </div>
            </div>

            {/* Text Color */}
            <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px]">สีตัวอักษร:</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textConfig.color}
                  onChange={(e) => setTextConfig({ ...textConfig, color: e.target.value })}
                  className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-200">{textConfig.color}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-950/40 rounded-xl text-center text-slate-500 text-[11px]">
            ซ่อนข้อความใต้ QR Code อยู่
          </div>
        )}
      </div>
    </div>
  );
}
