import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  QrCode, 
  Layers, 
  FileSpreadsheet, 
  Sliders, 
  Download, 
  Eye, 
  HelpCircle,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import CanvasEditor from './components/CanvasEditor';
import DataTable from './components/DataTable';
import { DEFAULT_SAMPLE_DATA } from './constants';
import StyleControls from './components/StyleControls';
import PrintPreviewModal from './components/PrintPreviewModal';
import { renderPageToCanvas, renderAllPages } from './utils/qrRenderer';
import { 
  saveSettings, 
  loadSettings, 
  saveBatchData, 
  loadBatchData, 
  saveTemplateImage, 
  loadTemplateImage,
  clearAllSavedData
} from './utils/storage';

export default function App() {
  // 1. Template Image State
  const [templateImg, setTemplateImg] = useState(null);
  const [templateSrc, setTemplateSrc] = useState('/template.png');

  // 2. Batch Data State
  const [batchData, setBatchData] = useState(DEFAULT_SAMPLE_DATA);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 3. QR Code Configuration
  const [qrConfig, setQrConfig] = useState({
    x: 276,
    y: 78,
    size: 170,
    hasBg: true,
    bgColor: '#ffffff',
    cardPadding: 8,
    borderRadius: 12,
    borderWidth: 0,
    borderColor: '#e2e8f0',
    boxShadow: false,
    envelopText: true,
    qrColor: '#000000',
    errorCorrection: 'H',
    qrMargin: 1
  });

  // 4. Text Below QR Configuration
  const [textConfig, setTextConfig] = useState({
    enabled: true,
    fontSize: 15,
    fontFamily: 'Prompt',
    fontWeight: '600',
    color: '#1e293b',
    spacing: 8
  });

  // 5. Navigation & Modal State
  const [activeTab, setActiveTab] = useState('data'); // 'data' | 'style'
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [printPages, setPrintPages] = useState([]);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const isInitialLoad = useRef(true);

  // Load saved configurations, batch data, and template image from LocalStorage/IndexedDB on startup
  useEffect(() => {
    const savedSettings = loadSettings();
    if (savedSettings) {
      if (savedSettings.qrConfig) setQrConfig(prev => ({ ...prev, ...savedSettings.qrConfig }));
      if (savedSettings.textConfig) setTextConfig(prev => ({ ...prev, ...savedSettings.textConfig }));
    }

    const savedBatch = loadBatchData();
    if (savedBatch && Array.isArray(savedBatch) && savedBatch.length > 0) {
      setBatchData(savedBatch);
    }

    loadTemplateImage().then(savedImg => {
      if (savedImg) {
        setTemplateSrc(savedImg);
      }
      isInitialLoad.current = false;
    }).catch(() => {
      isInitialLoad.current = false;
    });
  }, []);

  // Auto-save settings when qrConfig or textConfig change
  useEffect(() => {
    if (isInitialLoad.current) return;
    const timeout = setTimeout(() => {
      saveSettings(qrConfig, textConfig);
    }, 500);
    return () => clearTimeout(timeout);
  }, [qrConfig, textConfig]);

  // Auto-save batch data when batchData changes
  useEffect(() => {
    if (isInitialLoad.current) return;
    const timeout = setTimeout(() => {
      saveBatchData(batchData);
    }, 500);
    return () => clearTimeout(timeout);
  }, [batchData]);

  // Load Template Image Element whenever templateSrc changes
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setTemplateImg(img);
    img.onerror = () => {
      console.warn("Could not load template from:", templateSrc);
    };
    img.src = templateSrc;
  }, [templateSrc]);

  // Handle custom image upload and save to storage
  const handleUploadImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (result) {
        setTemplateSrc(result);
        saveTemplateImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset image to default template
  const handleResetImage = () => {
    setTemplateSrc('/template.png');
    saveTemplateImage('/template.png');
  };

  // Download single active page as PNG
  const handleDownloadCurrent = async () => {
    if (!templateImg) return;
    const canvas = document.createElement('canvas');
    const currentRow = batchData[currentIndex] || { link: '', text: '' };
    await renderPageToCanvas(canvas, templateImg, currentRow, qrConfig, textConfig);
    const link = document.createElement('a');
    const safeName = (currentRow.text || `page_${currentIndex + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `QR_${safeName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Prepare and trigger browser print for all pages
  const handleTriggerPrint = async () => {
    if (!templateImg || batchData.length === 0) return;
    setIsPreparingPrint(true);
    try {
      const pages = await renderAllPages(templateImg, batchData, qrConfig, textConfig);
      setPrintPages(pages);

      // Allow DOM to update before opening print dialog
      setTimeout(() => {
        setIsPreparingPrint(false);
        window.print();
      }, 500);
    } catch (err) {
      console.error(err);
      setIsPreparingPrint(false);
      alert('เกิดข้อผิดพลาดในการเตรียมพิมพ์: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* 1. Header (Screen only) */}
      <header className="no-print bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-xl flex items-center justify-center shadow-md shadow-emerald-950 text-slate-950 font-bold flex-shrink-0">
            <QrCode size={22} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 flex-wrap">
              <span>ระบบสร้างภาพพร้อม QR Code หลายหน้า</span>
              {/* Creator Credit with clickable link to GitHub */}
              <a 
                href="https://github.com/warehouse24charge/Create-QR-Code-on-Image-"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 px-2.5 py-0.5 rounded-full font-medium border border-emerald-500/30 hover:border-emerald-500/50 flex items-center gap-1 shadow-sm transition group cursor-pointer"
                title="คลิกเพื่อไปยัง GitHub ของโปรเจกต์"
              >
                <Sparkles size={12} className="text-emerald-400 group-hover:rotate-12 transition-transform" />
                <span>สร้างโดย นาย เกรียงไกร เกตุรักษา</span>
                <ExternalLink size={10} className="text-emerald-400/70 ml-0.5" />
              </a>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              คลิกลากจัดตำแหน่ง QR Code ได้อิสระ พร้อมข้อความใต้ภาพ และสั่งพิมพ์หลายหน้าได้ทันที (บันทึกข้อมูลอัตโนมัติ)
            </p>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadCurrent}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl transition border border-slate-700"
            title="ดาวน์โหลดเฉพาะหน้าที่กำลังดูอยู่เป็นรูปภาพ PNG"
          >
            <Download size={14} className="text-emerald-400" />
            <span className="hidden md:inline">ดาวน์โหลดหน้านี้</span>
          </button>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs sm:text-sm font-medium rounded-xl transition shadow-sm"
            title="เปิดแกลเลอรีดูทุกหน้าและส่งออก PDF/ZIP"
          >
            <Eye size={15} className="text-blue-400" />
            <span>พรีวิวทุกหน้า</span>
          </button>

          <button
            onClick={handleTriggerPrint}
            disabled={isPreparingPrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-lg shadow-emerald-950 disabled:opacity-50"
            title="สั่งพิมพ์ทุกหน้าออกเครื่องพิมพ์ หรือบันทึกเป็น PDF"
          >
            <Printer size={16} />
            <span>{isPreparingPrint ? 'กำลังเตรียมพิมพ์...' : `พิมพ์ทั้งหมด (${batchData.length} หน้า)`}</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Layout (Screen only) */}
      <main className="no-print flex-1 p-2.5 sm:p-3 gap-3 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-95px)]">
        {/* Left Column: Sidebar with Tabs (Data & Styling) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full overflow-hidden bg-slate-900/50 rounded-2xl border border-slate-800 shadow-xl">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-900/90 p-1.5 gap-1.5">
            <button
              onClick={() => setActiveTab('data')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition ${
                activeTab === 'data'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileSpreadsheet size={15} />
              <span>รายการข้อมูล ({batchData.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('style')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition ${
                activeTab === 'style'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sliders size={15} />
              <span>ปรับแต่ง QR & ข้อความ</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden p-2">
            {activeTab === 'data' ? (
              <DataTable
                batchData={batchData}
                setBatchData={setBatchData}
                currentIndex={currentIndex}
                setCurrentIndex={setCurrentIndex}
                templateImg={templateImg}
                onUploadImage={handleUploadImage}
                onResetImage={handleResetImage}
              />
            ) : (
              <StyleControls
                qrConfig={qrConfig}
                setQrConfig={setQrConfig}
                textConfig={textConfig}
                setTextConfig={setTextConfig}
              />
            )}
          </div>
        </div>

        {/* Right Column: Visual Canvas Editor */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full overflow-hidden">
          <CanvasEditor
            templateImg={templateImg}
            batchData={batchData}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
            qrConfig={qrConfig}
            setQrConfig={setQrConfig}
            textConfig={textConfig}
          />
        </div>
      </main>

      {/* Footer with Creator Credit */}
      <footer className="no-print bg-slate-900 border-t border-slate-800 px-4 py-1.5 text-center text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px]">ระบบสร้างภาพพร้อม QR Code หลายหน้า • ข้อมูลและรูปภาพบันทึกในเครื่องอัตโนมัติ (Local Storage)</span>
        <a
          href="https://github.com/warehouse24charge/Create-QR-Code-on-Image-"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium text-xs transition cursor-pointer"
          title="คลิกเพื่อไปยัง GitHub ของโปรเจกต์"
        >
          <Sparkles size={12} />
          <span>สร้างโดย นาย เกรียงไกร เกตุรักษา</span>
          <ExternalLink size={11} className="text-emerald-400/80" />
        </a>
      </footer>

      {/* 3. Multi-page Print & Export Modal */}
      <PrintPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        templateImg={templateImg}
        batchData={batchData}
        qrConfig={qrConfig}
        textConfig={textConfig}
        onTriggerPrint={handleTriggerPrint}
      />

      {/* 4. Dedicated Print Container (@media print) */}
      <div className="print-only">
        {printPages.map((page) => (
          <div key={page.index} className="print-page">
            <img 
              src={page.dataUrl} 
              alt={`Page ${page.index}`} 
              className="print-image" 
            />
          </div>
        ))}
      </div>
    </div>
  );
}
