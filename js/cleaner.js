// ═══════════════════════════════════════════════
// CLEANER — React component
// ═══════════════════════════════════════════════
const { useState, useRef, useEffect, useCallback } = React;



const API_KEY = key;


const CLUTTER_CATEGORIES = [
  { id:"laundry",   label:"Laundry",        bg:"#B5D4F4", color:"#0C447C" },
  { id:"trash",     label:"Trash",           bg:"#F5C4B3", color:"#712B13" },
  { id:"surfaces",  label:"Dirty surfaces",  bg:"#FAC775", color:"#633806" },
  { id:"misplaced", label:"Misplaced items", bg:"#9FE1CB", color:"#085041" },
  { id:"bed",       label:"Unmade bed",      bg:"#CECBF6", color:"#3C3489" },
  { id:"dishes",    label:"Dishes",          bg:"#F4C0D1", color:"#72243E" },
];

const SYSTEM_PROMPT = `You are a room cleaning assistant. Analyze the image(s) and respond ONLY with a JSON object in this exact format, no other text:
{
  "categories": ["list of detected clutter types from: laundry, trash, surfaces, misplaced, bed, dishes"],
  "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ...", "Step 4: ...", "Step 5: ..."],
  "summary": "One sentence describing the overall state of the room"
}
Always return exactly 5 steps ordered from quickest wins to deeper cleaning.`;

function resizeImageToBase64(dataUrl, maxSize=768) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h*maxSize/w); w = maxSize; }
        else       { w = Math.round(w*maxSize/h); h = maxSize; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.src = dataUrl;
  });
}

function extractFramesFromVideo(file, numFrames=6) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url; video.muted = true; video.playsInline = true;
    video.onloadedmetadata = () => {
      const duration = video.duration;
      const times = [];
      for (let i = 0; i < numFrames; i++) times.push((duration/(numFrames+1))*(i+1));
      const frames = []; let idx = 0;
      const captureNext = () => {
        if (idx >= times.length) { URL.revokeObjectURL(url); resolve(frames); return; }
        video.currentTime = times[idx];
      };
      video.onseeked = () => {
        const c = document.createElement('canvas');
        c.width = video.videoWidth; c.height = video.videoHeight;
        c.getContext('2d').drawImage(video, 0, 0);
        frames.push(c.toDataURL('image/jpeg', 0.8)); idx++; captureNext();
      };
      video.onerror = () => reject(new Error('Could not load video'));
      captureNext();
    };
    video.onerror = () => reject(new Error('Could not load video file'));
    video.load();
  });
}

function RoomCleaner() {
  const videoRef = useRef(null), canvasRef = useRef(null);
  const streamRef = useRef(null), fileInputRef = useRef(null);
  const [screen, setScreen] = useState('home');
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [streak, setStreak] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState(null);
  const [scanningMsg, setScanningMsg] = useState('Analyzing your room...');
  const [videoFrames, setVideoFrames] = useState([]);
  const [currentFrame, setCurrentFrame] = useState(0);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.onloadedmetadata = () => setCameraReady(true); }
    } catch(err) { setError('Camera access denied. Use file upload instead.'); }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; setCameraReady(false); }
  }, []);

  useEffect(() => { if (mode==='camera') startCamera(); return ()=>stopCamera(); }, [mode]);

  const analyzeImages = async (frames, previewUrl) => {
    setCapturedImage(previewUrl); stopCamera(); setScreen('scanning'); setError(null);
    try {
      setScanningMsg('Resizing frames...');
      const resized = await Promise.all(frames.map(f=>resizeImageToBase64(f)));
      setScanningMsg('Analyzing your room...');
      const imageContent = resized.map(b64 => ({type:'image',source:{type:'base64',media_type:'image/jpeg',data:b64}}));
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':API_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body: JSON.stringify({
          model:'claude-haiku-4-5-20251001', max_tokens:500, system:SYSTEM_PROMPT,
          messages:[{role:'user',content:[...imageContent,{type:'text',text:frames.length>1?`These are ${frames.length} frames from a room video.`:'Analyze this room photo.'}]}]
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content?.map(b=>b.text||'').join('') || '';
      const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
      setAnalysis(parsed); setCompletedSteps(new Set()); setScreen('results');
    } catch(err) {
      setError('Could not analyze: ' + err.message);
      setScreen(mode==='camera'?'camera':'upload');
      if (mode==='camera') startCamera();
    }
  };

  const captureFromCamera = () => {
    if (!videoRef.current||!canvasRef.current) return;
    const v=videoRef.current, c=canvasRef.current;
    c.width=v.videoWidth; c.height=v.videoHeight;
    c.getContext('2d').drawImage(v,0,0);
    const url=c.toDataURL('image/jpeg',0.85);
    analyzeImages([url],url);
  };

  const handleFile = async (file) => {
    setError(null);
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo&&!isImage) { setError('Please select an image or video file.'); return; }
    if (isVideo) {
      setScreen('scanning'); setScanningMsg('Extracting frames from video...');
      try {
        const frames = await extractFramesFromVideo(file, 6);
        setVideoFrames(frames); setCurrentFrame(0);
        await analyzeImages(frames, frames[0]);
      } catch(err) { setError('Could not process video: '+err.message); setScreen('upload'); }
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.onload = async () => {
        const c=document.createElement('canvas'), MAX=1280;
        let w=img.width, h=img.height;
        if (w>MAX||h>MAX) { if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;} }
        c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h);
        await analyzeImages([c.toDataURL('image/jpeg',0.85)], c.toDataURL('image/jpeg',0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const toggleStep = (index) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) { next.delete(index); SharedBells.set(Math.max(0,SharedBells.get()-50)); }
      else { next.add(index); SharedBells.add(50); if(next.size===5) setStreak(s=>s+1); }
      return next;
    });
  };

  const goHome = () => {
    stopCamera(); setCapturedImage(null); setAnalysis(null);
    setCompletedSteps(new Set()); setError(null); setMode(null);
    setVideoFrames([]); setCurrentFrame(0); setScreen('home');
  };

  const progress = analysis ? Math.round((completedSteps.size/5)*100) : 0;
  const detectedCats = analysis ? CLUTTER_CATEGORIES.filter(c=>analysis.categories.includes(c.id)) : [];

  const iconCamera = React.createElement('svg',{width:22,height:22,viewBox:'0 0 24 24',fill:'none',stroke:'white',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'},
    React.createElement('path',{d:'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'}),
    React.createElement('circle',{cx:12,cy:13,r:4})
  );

  if (screen==='home') return React.createElement('div',{style:{paddingTop:8}},
    React.createElement('div',{style:{marginBottom:24}},
      React.createElement('h2',{style:{fontSize:20,fontWeight:600,color:'#1a1a1a'}},'Room Cleaner'),
      React.createElement('p',{style:{fontSize:13,color:'#888',marginTop:4}},'Scan your room — every cleaning step earns 🪙 bells to spend in Decorate!')
    ),
    React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:12}},
      React.createElement('button',{onClick:()=>{setMode('camera');setScreen('camera');},className:'btn-primary',style:{display:'flex',alignItems:'center',gap:12,justifyContent:'center'}},iconCamera,'Use camera'),
      React.createElement('button',{onClick:()=>{setMode('upload');setScreen('upload');},style:{width:'100%',padding:'18px 20px',fontSize:15,fontWeight:600,borderRadius:12,background:'#fff',color:'#1a1a1a',border:'0.5px solid rgba(0,0,0,0.15)',cursor:'pointer',display:'flex',alignItems:'center',gap:12,justifyContent:'center'}},'📁 Upload photo or video')
    ),
    React.createElement('div',{style:{marginTop:20,padding:'14px 16px',background:'#fff8e6',border:'1px solid #c28b00',borderRadius:12,fontSize:13,color:'#7a5a00'}},
      '💡 ',React.createElement('strong',null,'How it works:'),' Scan your room, clean up, tick each step. Each step = ',React.createElement('strong',null,'+50 🪙 bells'),' to spend in 🪑 Decorate!'
    )
  );

  if (screen==='upload') return React.createElement('div',null,
    React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10,marginBottom:20}},
      React.createElement('button',{onClick:goHome,className:'back-btn'},'←'),
      React.createElement('h2',{style:{fontSize:18,fontWeight:600,color:'#1a1a1a'}},'Upload file')
    ),
    React.createElement('div',{
      className:'drop-zone'+(dragging?' dragover':''),
      onClick:()=>fileInputRef.current&&fileInputRef.current.click(),
      onDragOver:e=>{e.preventDefault();setDragging(true);},
      onDragLeave:()=>setDragging(false),
      onDrop:e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}
    },
      React.createElement('input',{ref:fileInputRef,type:'file',accept:'image/*,video/*',onChange:e=>{if(e.target.files[0])handleFile(e.target.files[0])}}),
      React.createElement('p',{style:{fontSize:15,fontWeight:500,color:dragging?'#3b8c56':'#555',marginBottom:4}},dragging?'Drop it here!':'Click to browse or drag here'),
      React.createElement('p',{style:{fontSize:12,color:'#aaa'}},'Photos & videos accepted')
    ),
    error&&React.createElement('div',{className:'error-box'},error)
  );

  if (screen==='camera') return React.createElement('div',null,
    React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10,marginBottom:16}},
      React.createElement('button',{onClick:goHome,className:'back-btn'},'←'),
      React.createElement('h2',{style:{fontSize:18,fontWeight:600,color:'#1a1a1a'}},'Camera')
    ),
    React.createElement('div',{style:{position:'relative',borderRadius:12,overflow:'hidden',background:'#e8e8e6',aspectRatio:'4/3',marginBottom:16}},
      React.createElement('video',{ref:videoRef,autoPlay:true,playsInline:true,muted:true,style:{width:'100%',height:'100%',objectFit:'cover',display:'block'}}),
      !cameraReady&&React.createElement('div',{style:{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}},
        React.createElement('p',{style:{color:'#888',fontSize:14}},'Starting camera...'))
    ),
    React.createElement('canvas',{ref:canvasRef,style:{display:'none'}}),
    error&&React.createElement('div',{className:'error-box'},error),
    React.createElement('button',{onClick:captureFromCamera,disabled:!cameraReady,className:'btn-primary',style:{background:cameraReady?'#3b8c56':'#ccc',cursor:cameraReady?'pointer':'not-allowed'}},'Scan room')
  );

  if (screen==='scanning') return React.createElement('div',{style:{textAlign:'center',padding:'40px 0'}},
    capturedImage&&React.createElement('div',{style:{marginBottom:24,borderRadius:12,overflow:'hidden'}},
      React.createElement('img',{src:capturedImage,alt:'Preview',style:{width:'100%',display:'block'}})),
    React.createElement('div',{style:{display:'inline-block',width:32,height:32,border:'2px solid #e0e0e0',borderTop:'2px solid #3b8c56',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}),
    React.createElement('p',{style:{marginTop:16,fontSize:15,color:'#888',animation:'pulse 1.5s ease-in-out infinite'}},scanningMsg)
  );

  if (screen==='results'&&analysis) return React.createElement('div',null,
    React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}},
      React.createElement('div',null,
        React.createElement('h2',{style:{fontSize:18,fontWeight:600,color:'#1a1a1a'}},'Cleaning plan'),
        React.createElement('p',{style:{fontSize:13,color:'#888',marginTop:2,lineHeight:1.4}},analysis.summary)
      )
    ),
    capturedImage&&React.createElement('div',{style:{marginBottom:16,borderRadius:12,overflow:'hidden',border:'0.5px solid rgba(0,0,0,0.1)'}},
      React.createElement('img',{src:capturedImage,style:{width:'100%',display:'block'}})),
    detectedCats.length>0&&React.createElement('div',{style:{marginBottom:16}},
      React.createElement('p',{style:{fontSize:12,color:'#aaa',fontWeight:600,marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}},'Detected'),
      React.createElement('div',{style:{display:'flex',flexWrap:'wrap',gap:6}},
        detectedCats.map(cat=>React.createElement('span',{key:cat.id,style:{padding:'4px 10px',borderRadius:20,fontSize:12,fontWeight:600,background:cat.bg,color:cat.color}},cat.label))
      )
    ),
    React.createElement('div',{style:{marginBottom:16}},
      React.createElement('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:6}},
        React.createElement('p',{style:{fontSize:12,color:'#aaa',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}},'Progress'),
        React.createElement('span',{style:{fontSize:12,fontWeight:600,color:progress===100?'#3B6D11':'#3b8c56'}},progress+'%')
      ),
      React.createElement('div',{style:{height:6,background:'#e8e8e6',borderRadius:3,overflow:'hidden'}},
        React.createElement('div',{style:{height:'100%',width:progress+'%',background:progress===100?'#639922':'#3b8c56',borderRadius:3,transition:'width 0.3s ease'}}))
    ),
    progress===100&&React.createElement('div',{style:{marginBottom:16,padding:'12px 16px',background:'#EAF3DE',border:'0.5px solid #97C459',borderRadius:8,fontSize:14,color:'#27500A',fontWeight:600}},'Room complete! 🎉 Head over to Decorate to see your rewards!'),
    React.createElement('div',{style:{display:'flex',flexDirection:'column',gap:8,marginBottom:20}},
      analysis.steps.map((step,i)=>{
        const done=completedSteps.has(i);
        return React.createElement('div',{key:i,onClick:()=>toggleStep(i),style:{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',background:done?'#EAF3DE':'#ffffff',border:'0.5px solid '+(done?'#97C459':'rgba(0,0,0,0.1)'),borderRadius:10,cursor:'pointer'}},
          React.createElement('div',{style:{flexShrink:0,width:22,height:22,borderRadius:'50%',border:'1.5px solid '+(done?'#639922':'#ccc'),background:done?'#639922':'transparent',display:'flex',alignItems:'center',justifyContent:'center',marginTop:1}},
            done&&React.createElement('svg',{width:12,height:12,viewBox:'0 0 12 12',fill:'none'},React.createElement('path',{d:'M2 6l3 3 5-5',stroke:'white',strokeWidth:1.5,strokeLinecap:'round',strokeLinejoin:'round'}))
          ),
          React.createElement('div',{style:{flex:1}},
            React.createElement('span',{style:{fontSize:11,fontWeight:600,color:done?'#3B6D11':'#aaa',display:'block',marginBottom:2}},'Step '+(i+1)),
            React.createElement('span',{style:{fontSize:14,color:done?'#27500A':'#1a1a1a',textDecoration:done?'line-through':'none',lineHeight:1.4,display:'block'}},step.replace(/^Step \d+:\s*/i,''))
          ),
          React.createElement('div',{style:{flexShrink:0,fontSize:11,color:done?'#639922':'#aaa',fontWeight:600}},done?'✓ Done':'Mark Done')
        );
      })
    ),
    React.createElement('div',{style:{display:'flex',gap:8}},
      React.createElement('button',{onClick:goHome,className:'btn-secondary',style:{flex:1}},'Home'),
      React.createElement('button',{onClick:()=>{setAnalysis(null);setCompletedSteps(new Set());setCapturedImage(null);setVideoFrames([]);setCurrentFrame(0);setScreen(mode==='camera'?'camera':'upload');if(mode==='camera')startCamera();},style:{flex:1,padding:12,fontSize:14,fontWeight:600,borderRadius:12,background:'#3b8c56',color:'#fff',border:'none',cursor:'pointer'}},'Scan again')
    )
  );
  return null;
}

const cleanerRoot = ReactDOM.createRoot(document.getElementById('cleaner-root'));
cleanerRoot.render(React.createElement(RoomCleaner));