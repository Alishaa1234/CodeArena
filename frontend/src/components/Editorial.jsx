import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";

export default function Editorial({ secureUrl, thumbnailUrl, duration }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef(null);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const toggle = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); } else { videoRef.current.play(); }
    setPlaying(!playing);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = setTimeout(() => setShowControls(false), 2500);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onEnd = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnd);
    return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("ended", onEnd); };
  }, []);

  return (
    <div style={{ width: "100%", fontFamily: "'Syne',sans-serif" }}>
      <style>{`
        .ed-wrap { position:relative; border-radius:12px; overflow:hidden; background:#000; cursor:pointer; }
        .ed-video { width:100%; aspect-ratio:16/9; display:block; }
        .ed-overlay { position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%); transition:opacity 0.3s; }
        .ed-overlay.hidden { opacity:0; pointer-events:none; }
        .ed-center-btn { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:56px; height:56px; background:rgba(255,161,22,0.9); border-radius:50%; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer; transition:transform 0.2s, background 0.2s; }
        .ed-center-btn:hover { transform:translate(-50%,-50%) scale(1.1); background:#ffa116; }
        .ed-controls { position:absolute; bottom:0; left:0; right:0; padding:12px 16px; }
        .ed-progress { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
        .ed-progress input[type=range] { flex:1; -webkit-appearance:none; height:3px; border-radius:2px; background:rgba(255,255,255,0.2); outline:none; cursor:pointer; }
        .ed-progress input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; background:#ffa116; cursor:pointer; }
        .ed-time { font-size:12px; color:rgba(255,255,255,0.7); font-family:'JetBrains Mono',monospace; white-space:nowrap; }
        .ed-btns { display:flex; align-items:center; gap:8px; }
        .ed-ctrl-btn { background:none; border:none; color:rgba(255,255,255,0.8); cursor:pointer; padding:4px; border-radius:5px; display:flex; transition:color 0.15s; }
        .ed-ctrl-btn:hover { color:#fff; }
      `}</style>

      <div className="ed-wrap" onMouseMove={handleMouseMove} onMouseLeave={() => playing && setShowControls(false)}>
        <video ref={videoRef} src={secureUrl} poster={thumbnailUrl} className="ed-video" onClick={toggle} />

        <div className={`ed-overlay${showControls ? "" : " hidden"}`}>
          <button className="ed-center-btn" onClick={toggle}>
            {playing ? <Pause size={22} color="#000" /> : <Play size={22} color="#000" style={{ marginLeft: 2 }} />}
          </button>
          <div className="ed-controls">
            <div className="ed-progress">
              <span className="ed-time">{fmt(currentTime)}</span>
              <input
                type="range" min={0} max={duration || 100} value={currentTime} step={0.1}
                onChange={(e) => { if (videoRef.current) videoRef.current.currentTime = +e.target.value; }}
              />
              <span className="ed-time">{fmt(duration || 0)}</span>
            </div>
            <div className="ed-btns">
              <button className="ed-ctrl-btn" onClick={toggle}>
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button className="ed-ctrl-btn" onClick={() => { if (videoRef.current) videoRef.current.muted = !muted; setMuted(!muted); }}>
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <div style={{ flex: 1 }} />
              <button className="ed-ctrl-btn" onClick={() => videoRef.current?.requestFullscreen()}>
                <Maximize2 size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
