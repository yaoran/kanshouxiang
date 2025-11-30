'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Hand, Loader2, RefreshCcw, Sparkles, Compass, Activity, Zap, BookOpen, RotateCcw, Download } from 'lucide-react';
import { generatePDF } from '@/lib/pdf';
import LoginModal from '@/components/LoginModal';
import PaymentModal from '@/components/PaymentModal';
import UserStatus from '@/components/UserStatus';
import { createClient } from '@/lib/supabase/client';

// ---------------------
// 解析工具函数
// ---------------------
const extractTagContent = (text: string, tagName: string): string | null => {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
};

const extractStep = (text: string, stepTag: string) => {
  const content = extractTagContent(text, stepTag);
  if (!content) return null;
  return {
    title: extractTagContent(content, 'title'),
    enTitle: extractTagContent(content, 'en_title'),
    content: content
  };
};

// 简单的格式化显示组件 (处理换行和加粗)
const FormattedText = ({ text }: { text: string }) => {
  if (!text) return null;
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        // 处理 **加粗**
        const parts = line.split(/(\*\*.*?\*\*)/);
        return (
          <p key={i} className="text-[#ccc] leading-relaxed text-sm font-sans">
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="text-[#D4B483] font-medium mx-1">{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
};

// ---------------------
// 子组件
// ---------------------

const CardHeader = ({ icon, title, enTitle }: { icon: React.ReactNode, title: string, enTitle: string }) => (
  <div className="flex items-center gap-4 mb-6 border-b border-[#333] pb-4">
    <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#333] text-[#D4B483] shadow-[0_0_10px_rgba(212,180,131,0.1)]">
      {icon}
    </div>
    <div>
      <h3 className="text-[#D4B483] font-bold text-xl tracking-wide">{title}</h3>
      <p className="text-[#666] text-[10px] uppercase tracking-[0.2em] font-sans mt-1">{enTitle}</p>
    </div>
  </div>
);

// 第一步：观其气象
const Step1Card = ({ data }: { data: any }) => {
  const content = extractTagContent(data.content, 'content');
  if (!content) return null;

  return (
    <div className="bg-[#121212] border border-[#333] rounded-2xl p-6 md:p-8 shadow-2xl">
      <CardHeader icon={<BookOpen />} title={data.title} enTitle={data.enTitle} />
      <p className="text-[#ccc] leading-loose font-sans text-justify text-lg tracking-wide">
        {content}
      </p>
    </div>
  );
};

// 第二步：定其根基
const Step2Card = ({ data }: { data: any }) => {
  const handShape = extractTagContent(data.content, 'hand_shape');
  const coreNature = extractTagContent(data.content, 'core_nature');

  return (
    <div className="bg-[#121212] border border-[#333] rounded-2xl p-6 md:p-8 shadow-2xl">
      <CardHeader icon={<Compass />} title={data.title} enTitle={data.enTitle} />
      
      <div className="grid md:grid-cols-2 gap-8 mt-6">
        <div className="relative pl-6 border-l-2 border-[rgba(212,180,131,0.5)]">
          <h4 className="text-[#888] text-xs font-bold tracking-widest uppercase mb-3 font-sans">HAND SHAPE</h4>
          <p className="text-[#E0E0E0] leading-relaxed font-serif text-lg">
            {handShape}
          </p>
        </div>
        
        <div className="relative pl-6 border-l-2 border-[rgba(157,107,224,0.5)]">
          <h4 className="text-[#888] text-xs font-bold tracking-widest uppercase mb-3 font-sans">CORE NATURE</h4>
          <p className="text-[#E0E0E0] leading-relaxed font-serif text-lg">
            {coreNature}
          </p>
        </div>
      </div>
    </div>
  );
};

// 第三步：察其流动
const Step3Card = ({ data }: { data: any }) => {
  const lines = [
    { tag: 'life_line', name: '生命线' },
    { tag: 'head_line', name: '智慧线' },
    { tag: 'heart_line', name: '感情线' },
    { tag: 'career_line', name: '事业线' },
  ];

  return (
    <div className="bg-[#121212] border border-[#333] rounded-2xl p-6 md:p-8 shadow-2xl">
      <CardHeader icon={<Activity />} title={data.title} enTitle={data.enTitle} />
      
      <div className="space-y-10 mt-6">
        {lines.map((line) => {
          const lineContent = extractTagContent(data.content, line.tag);
          if (!lineContent) return null;
          const form = extractTagContent(lineContent, 'form');
          const flow = extractTagContent(lineContent, 'flow');

          return (
            <div key={line.tag} className="relative pl-4 border-l border-[#333] hover:border-[#D4B483] transition-colors duration-300 group">
               <div className="absolute -left-[5px] top-0 w-[9px] h-[9px] rounded-full bg-[#333] group-hover:bg-[#D4B483] transition-colors" />
               
               <h4 className="text-xl font-serif text-[#E0E0E0] mb-4 pl-2">{line.name}</h4>
               
               <div className="space-y-3 pl-2">
                 <div className="flex gap-3 items-start">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#1a1a1a] border border-[#333] text-[#666] font-sans uppercase tracking-wider mt-1 shrink-0 min-w-[45px] text-center">FORM</span>
                    <p className="text-[#ccc] leading-relaxed flex-1">{form}</p>
                 </div>
                 <div className="flex gap-3 items-start">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#1a1a1a] border border-[rgba(212,180,131,0.3)] text-[#D4B483] font-sans uppercase tracking-wider mt-1 shrink-0 min-w-[45px] text-center">FLOW</span>
                    <p className="text-[#ccc] leading-relaxed flex-1">{flow}</p>
                 </div>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 第四步：探其源泉 (Grid)
const Step4Card = ({ data }: { data: any }) => {
  const mountsContent = extractTagContent(data.content, 'mounts');
  const mounts: any[] = [];
  
  if (mountsContent) {
    const mountRegex = /<mount>([\s\S]*?)<\/mount>/g;
    let match;
    while ((match = mountRegex.exec(mountsContent)) !== null) {
        const mContent = match[1];
        mounts.push({
            name: extractTagContent(mContent, 'name'),
            status: extractTagContent(mContent, 'status'),
            desc: extractTagContent(mContent, 'desc'),
        });
    }
  }

  return (
    <div className="bg-[#121212] border border-[#333] rounded-2xl p-6 md:p-8 shadow-2xl">
      <CardHeader icon={<Zap />} title={data.title} enTitle={data.enTitle} />
      
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        {mounts.map((mount, i) => (
          <div key={i} className="bg-[#0f0f0f] border border-[#2a2a2a] p-5 rounded-xl hover:border-[rgba(212,180,131,0.3)] transition-colors">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-serif text-lg text-[#E0E0E0]">{mount.name}</h4>
              <span className={`text-xs px-2 py-1 rounded-full border ${
                  mount.status?.includes('饱满') 
                  ? 'border-[rgba(16,185,129,0.3)] text-[#34d399] bg-[rgba(16,185,129,0.05)]' 
                  : 'border-[#444] text-[#888]'
              }`}>
                {mount.status}
              </span>
            </div>
            <p className="text-[#888] text-sm leading-relaxed font-sans">
              {mount.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// 第五步：归其大道
const Step5Card = ({ data }: { data: any }) => {
  const story = extractTagContent(data.content, 'story');
  const potential = extractTagContent(data.content, 'potential');
  const advice = extractTagContent(data.content, 'advice');

  return (
    <div className="bg-[#121212] border border-[rgba(212,180,131,0.2)] rounded-2xl p-6 md:p-8 shadow-[0_0_30px_rgba(212,180,131,0.05)]">
      <CardHeader icon={<Sparkles />} title={data.title} enTitle={data.enTitle} />
      
      <div className="space-y-8 mt-6">
        <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D4B483]" />
            <div className="pl-6">
                 <h4 className="text-[#D4B483] text-lg font-serif mb-3">核心故事</h4>
                 <p className="text-xl italic font-serif text-[#E0E0E0] leading-loose opacity-90">"{story}"</p>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[#333]">
                 <h4 className="flex items-center gap-2 text-[#9d6be0] font-bold mb-3">
                    <Activity className="w-4 h-4" /> 最大潜能
                 </h4>
                 <FormattedText text={potential || ''} />
            </div>
            <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[#333]">
                 <h4 className="flex items-center gap-2 text-[#10b981] font-bold mb-3">
                    <Compass className="w-4 h-4" /> 修行建议
                 </h4>
                 <FormattedText text={advice || ''} />
            </div>
        </div>
      </div>
    </div>
  );
};

// 加载状态组件
const LoadingState = () => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('玄师正在沟通天地能量...');

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + (prev < 50 ? 2 : 0.5); // 前快后慢
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  // 根据进度更新文案
  useEffect(() => {
      if (progress > 20 && progress < 40) setMessage('正在扫描掌纹细节...');
      if (progress > 40 && progress < 60) setMessage('正在推演生命剧本...');
      if (progress > 60 && progress < 80) setMessage('正在感应能量流动...');
      if (progress > 80) setMessage('正在生成命理报告...');
  }, [progress]);

  return (
    <div className="text-center py-20 space-y-6 animate-fade-in">
      <div className="relative w-24 h-24 mx-auto">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#333" strokeWidth="2" />
          <circle 
            cx="50" cy="50" r="45" fill="none" stroke="#D4B483" strokeWidth="2" 
            strokeDasharray="283"
            strokeDashoffset={283 - (283 * progress) / 100}
            className="transition-all duration-200 ease-linear rotate-[-90deg] origin-center"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
           <span className="text-[#D4B483] font-sans text-sm">{Math.round(progress)}%</span>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-[#D4B483] text-lg font-serif">{message}</h3>
        <p className="text-[#666] text-xs font-sans">分析约需 30-60 秒，请耐心等待，切勿刷新...</p>
      </div>
    </div>
  );
};

// 拍摄要求提示组件
const UploadRequirements = () => (
  <div className="bg-[#1a1a1a]/50 border border-[#D4B483]/20 rounded-xl p-5 mb-6 backdrop-blur-sm">
    <h3 className="text-[#D4B483] font-medium mb-4 flex items-center gap-2 text-sm tracking-wide">
      <Sparkles className="w-4 h-4" /> 
      为确保测算准确，请遵循以下拍摄要求：
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#000] border border-[#333] flex items-center justify-center shrink-0 text-[#666]">
            1
        </div>
        <div className="space-y-1">
            <p className="text-[#E0E0E0] text-xs font-bold">光线充足</p>
            <p className="text-[#666] text-[10px] leading-relaxed">请在自然光或明亮灯光下拍摄，避免手掌投下阴影，确保掌纹清晰可见。</p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#000] border border-[#333] flex items-center justify-center shrink-0 text-[#666]">
            2
        </div>
        <div className="space-y-1">
            <p className="text-[#E0E0E0] text-xs font-bold">手掌完整</p>
            <p className="text-[#666] text-[10px] leading-relaxed">请伸直手指，拍摄完整的手掌正面，包含手指指尖和手腕纹路。</p>
        </div>
      </div>
      
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#000] border border-[#333] flex items-center justify-center shrink-0 text-[#666]">
            3
        </div>
        <div className="space-y-1">
            <p className="text-[#E0E0E0] text-xs font-bold">背景干净</p>
            <p className="text-[#666] text-[10px] leading-relaxed">建议使用纯色背景（如桌面或墙面），避免杂乱背景干扰识别。</p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#000] border border-[#333] flex items-center justify-center shrink-0 text-[#666]">
            4
        </div>
        <div className="space-y-1">
            <p className="text-[#E0E0E0] text-xs font-bold">拍摄惯用手</p>
            <p className="text-[#666] text-[10px] leading-relaxed">男左女右为先天，男右女左为后天。建议拍摄您常用的那只手（通常为右手）。</p>
        </div>
      </div>
    </div>
  </div>
);

// ---------------------
// 主组件
// ---------------------

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null); // 保存原始文件用于直传
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>(''); // 上传进度提示
  const [isDragging, setIsDragging] = useState(false);
  const [validating, setValidating] = useState(false); // 验证中状态
  const [validationError, setValidationError] = useState<string | null>(null); // 验证错误信息
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auth & Payment State
  const [showLogin, setShowLogin] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [refreshCredits, setRefreshCredits] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, [refreshCredits]);

  // 验证手掌图片
  const validatePalm = async (imageData: string): Promise<{ valid: boolean; reason: string }> => {
    try {
      const res = await fetch('/api/validate-palm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });
      return await res.json();
    } catch {
      // 验证失败不阻塞，默认通过
      return { valid: true, reason: '' };
    }
  };

  // 文件处理逻辑
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    setValidationError(null);
    setImageFile(file);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageData = reader.result as string;
      setImage(imageData);
      setResult('');
      
      // 选图后立即验证
      setValidating(true);
      const { valid, reason } = await validatePalm(imageData);
      setValidating(false);
      
      if (!valid) {
        setValidationError(reason || '请上传手掌照片');
      }
    };
    reader.readAsDataURL(file);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };
  
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleReset = () => {
    setImage(null);
    setImageFile(null);
    setResult('');
    setUploadProgress('');
    setValidating(false);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 尝试直传到 TOS（如果配置了的话）
  const uploadToTOS = async (): Promise<string | null> => {
    if (!imageFile) return null;
    
    try {
      setUploadProgress('正在获取上传凭证...');
      
      // 1. 获取预签名 URL
      const presignRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: imageFile.type }),
      });
      
      if (!presignRes.ok) {
        console.log('[TOS] Presign failed, fallback to base64');
        return null; // TOS 未配置，回退到 Base64
      }
      
      const { uploadUrl, accessUrl } = await presignRes.json();
      
      setUploadProgress('正在上传图片到云端...');
      
      // 2. 直接上传到 TOS
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: imageFile,
      });
      
      if (!uploadRes.ok) {
        console.error('[TOS] Upload failed:', uploadRes.status);
        return null;
      }
      
      console.log('[TOS] Upload success:', accessUrl);
      setUploadProgress('');
      return accessUrl;
    } catch (error) {
      console.error('[TOS] Upload error:', error);
      setUploadProgress('');
      return null;
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;

    // 1. Check Auth
    if (!user) {
      setShowLogin(true);
      return;
    }

    setLoading(true);
    setResult('');
    
    try {
      // 尝试先上传到 TOS
      const tosUrl = await uploadToTOS();
      
      // 调用分析接口
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image, // Base64 图片（用于 AI 分析）
          imageUrl: tosUrl, // TOS URL（用于存储记录，可选）
        }),
      });
      
      if (response.status === 402) {
        setShowPayment(true);
        setLoading(false);
        return;
      }

      if (!response.ok) throw new Error('分析请求失败');
      
      // Success: Reading started, deduct logic handled in backend
      setRefreshCredits(prev => prev + 1); // Refresh credits display

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setResult((prev) => prev + text);
      }
    } catch (error) {
      console.error(error);
      alert('玄师正在冥想，请稍后再试。');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      const elementIds = [
        'report-step-1',
        'report-step-2',
        'report-step-3',
        'report-step-4',
        'report-step-5'
      ];
      await generatePDF(elementIds, `手相分析报告-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF generation failed', error);
      alert('PDF 生成失败，请重试');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 解析 XML 步骤
  const step1 = extractStep(result, 'step1');
  const step2 = extractStep(result, 'step2');
  const step3 = extractStep(result, 'step3');
  const step4 = extractStep(result, 'step4');
  const step5 = extractStep(result, 'step5');

  const isFinished = step5 && extractTagContent(step5.content, 'advice');

  return (
    <main className="min-h-screen bg-[#050505] text-[#E0E0E0] font-serif selection:bg-[#D4B483] selection:text-[#121212] pb-20">
      
      <UserStatus 
        onLoginClick={() => setShowLogin(true)}
        onRechargeClick={() => setShowPayment(true)}
        refreshTrigger={refreshCredits}
      />

      <LoginModal 
        isOpen={showLogin} 
        onClose={() => setShowLogin(false)} 
      />

      <PaymentModal 
        isOpen={showPayment} 
        onClose={() => setShowPayment(false)}
        onSuccess={() => setRefreshCredits(prev => prev + 1)}
      />

      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center min-h-screen">
        
        {/* Header */}
        <div className="mb-12 text-center space-y-4 animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-full border-2 border-[#D4B483] flex items-center justify-center shadow-[0_0_20px_rgba(212,180,131,0.2)] mb-6 bg-[#121212]">
            <div className="w-16 h-16 rounded-full border border-[#D4B483]/50 flex items-center justify-center">
              <span className="text-3xl text-[#D4B483] font-bold">玄</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#D4B483] tracking-wide">手相宗师</h1>
          <p className="text-[10px] md:text-xs tracking-[0.3em] text-[#666] uppercase font-sans">Master Xuan Shi Palmistry</p>
        </div>

        {/* Intro Quote */}
        {!image && (
          <div className="text-center mb-12 max-w-xl space-y-6 animate-fade-in-up">
            <p className="text-xl md:text-2xl italic text-[#E0E0E0]/90 font-light">" 凡人看掌纹，我看生命剧本。"</p>
            <p className="text-sm text-[#888] leading-relaxed font-sans max-w-md mx-auto">
              上传您的手相照片，玄师将运用独家五步分析法，<br className="hidden md:block" />
              为您解读掌纹背后的能量流动与心理图谱。
            </p>
          </div>
        )}

        {/* Upload Area */}
        <div className="w-full max-w-xl space-y-8 mb-12">
          {!image ? (
            <div className="space-y-6 animate-fade-in">
              <UploadRequirements />
              
              <div
                onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              className={`relative group cursor-pointer transition-all duration-300 border-2 border-dashed rounded-xl h-80 flex flex-col items-center justify-center gap-4 ${isDragging ? 'border-[#D4B483] bg-[#D4B483]/5' : 'border-[#333] hover:border-[#D4B483]/50 hover:bg-[#121212]'}`}
            >
              <div className="absolute top-[-2px] left-[-2px] w-4 h-4 border-t-2 border-l-2 border-[#D4B483] opacity-60" />
              <div className="absolute top-[-2px] right-[-2px] w-4 h-4 border-t-2 border-r-2 border-[#D4B483] opacity-60" />
              <div className="absolute bottom-[-2px] left-[-2px] w-4 h-4 border-b-2 border-l-2 border-[#D4B483] opacity-60" />
              <div className="absolute bottom-[-2px] right-[-2px] w-4 h-4 border-b-2 border-r-2 border-[#D4B483] opacity-60" />
              <Hand className="w-10 h-10 text-[#D4B483] group-hover:scale-110 transition-transform" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium text-[#E0E0E0]">上传手相</h3>
                <p className="text-sm text-[#666] font-sans">拖拽图片至此，或点击上传</p>
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 animate-fade-in">
               {/* Small Preview */}
               {!result && !loading ? (
                 <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-[#333]">
                    <img src={image} alt="Hand" className="w-full h-full object-contain bg-black" />
                    <button onClick={handleReset} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/80"><RefreshCcw className="w-4 h-4" /></button>
                    {/* 验证中遮罩 */}
                    {validating && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="flex items-center gap-3 text-[#D4B483]">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm font-sans">正在识别图片内容...</span>
                        </div>
                      </div>
                    )}
                 </div>
               ) : (
                 <div className="flex items-center gap-4 p-4 bg-[#121212] rounded-full border border-[#333]">
                    <img src={image} alt="Hand" className="w-12 h-12 rounded-full object-cover border border-[#444]" />
                    <span className="text-[#888] text-sm font-sans">正在解读...</span>
                 </div>
               )}

               {/* 验证错误提示 */}
               {validationError && !validating && (
                 <div className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                   <div className="p-1 rounded-full bg-red-500/20 text-red-400 shrink-0 mt-0.5">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                     </svg>
                   </div>
                   <div className="space-y-1">
                     <p className="text-red-400 text-sm font-medium">{validationError}</p>
                     <p className="text-red-400/60 text-xs font-sans">请上传清晰的手掌内侧照片（能看到掌纹的那一面）</p>
                   </div>
                 </div>
               )}

               {!result && !loading && (
                  <button 
                    onClick={handleAnalyze} 
                    disabled={validating || !!validationError}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                      validating || validationError 
                        ? 'bg-[#333] text-[#666] cursor-not-allowed' 
                        : 'bg-[#D4B483] hover:bg-[#c4a473] text-[#121212] shadow-[0_0_20px_rgba(212,180,131,0.2)]'
                    }`}
                  >
                    {validating ? '识别中...' : validationError ? '请重新上传' : '开始解读'}
                  </button>
               )}
            </div>
          )}
        </div>

        {/* Results Stream */}
        <div className="w-full space-y-8">
           {loading && !result && <LoadingState />}

           {step1 && <div id="report-step-1" className="animate-slide-up"><Step1Card data={step1} /></div>}
           {step2 && <div id="report-step-2" className="animate-slide-up delay-100"><Step2Card data={step2} /></div>}
           {step3 && <div id="report-step-3" className="animate-slide-up delay-200"><Step3Card data={step3} /></div>}
           {step4 && <div id="report-step-4" className="animate-slide-up delay-300"><Step4Card data={step4} /></div>}
           {step5 && <div id="report-step-5" className="animate-slide-up delay-400"><Step5Card data={step5} /></div>}

           {/* Final Action */}
           {isFinished && (
             <div className="mt-16 text-center animate-fade-in space-y-4 flex flex-col items-center">
                <div className="flex flex-wrap justify-center gap-4">
                  <button 
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-full border border-[#D4B483] text-[#D4B483] hover:bg-[#D4B483] hover:text-[#121212] transition-all duration-300 font-medium tracking-wide group"
                  >
                    <RotateCcw className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500" />
                    解读另一只手
                  </button>

                  <button 
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPdf}
                    className={`inline-flex items-center gap-2 px-8 py-3 rounded-full border border-[#D4B483] text-[#121212] bg-[#D4B483] hover:bg-[#c4a473] transition-all duration-300 font-medium tracking-wide ${isGeneratingPdf ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    {isGeneratingPdf ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        正在生成 PDF...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        导出 PDF 报告
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[#444] text-xs mt-2">© 手相宗师</p>
             </div>
           )}
        </div>

        </div>
      </main>
  );
}
